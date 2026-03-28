import { Router } from 'express';
import { z } from 'zod';
import { logActivity } from '../lib/activity.js';
import { asyncHandler, sendSuccess, ApiError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';

const router = Router();

const uuidSchema = z.string().uuid();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  userId: uuidSchema.optional(),
  storeId: uuidSchema.optional(),
  organizationId: uuidSchema.optional(),
  regionalId: uuidSchema.optional(),
  updatedFrom: isoDateSchema.optional(),
  updatedTo: isoDateSchema.optional(),
  periodStart: isoDateSchema.optional(),
  periodEnd: isoDateSchema.optional(),
  q: z.string().trim().min(1).optional(),
  role: z.string().trim().min(1).optional(),
  fileType: z.string().trim().min(1).optional(),
  processingStatus: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  entityType: z.string().trim().min(1).optional(),
});

const buildPagination = (page: number, pageSize: number) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
};

const applyRange = <
  T extends { gte: (column: string, value: string) => T; lte: (column: string, value: string) => T },
>(
  query: T,
  column: string,
  from?: string,
  to?: string,
) => {
  if (from) query.gte(column, `${from}T00:00:00.000Z`);
  if (to) query.lte(column, `${to}T23:59:59.999Z`);
  return query;
};

const emptyResult = <T>() => ({ data: [] as T[], error: null as { message: string } | null });

const byId = <T extends { id: string }>(rows?: ReadonlyArray<T> | null) =>
  new Map((rows || []).map((row) => [row.id, row]));

router.use(requireAuth);
router.use(requireAdmin);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const { from, to } = buildPagination(query.page, query.pageSize);

    let scopedUserIds: string[] | null = null;
    if (query.storeId || query.organizationId || query.regionalId) {
      let membershipsQuery = req.supabase
        .from('store_members')
        .select('user_id, store_id, stores!inner(id, organization_id, regional_id)');

      if (query.storeId) membershipsQuery = membershipsQuery.eq('store_id', query.storeId);
      if (query.organizationId) membershipsQuery = membershipsQuery.eq('stores.organization_id', query.organizationId);
      if (query.regionalId) membershipsQuery = membershipsQuery.eq('stores.regional_id', query.regionalId);

      const { data: memberships, error: membershipsError } = await membershipsQuery;
      if (membershipsError) {
        throw new ApiError(500, 'Falha ao filtrar usuarios por escopo.', membershipsError.message, 'admin_users_scope_failed');
      }

      scopedUserIds = [...new Set((memberships || []).map((row) => row.user_id).filter(Boolean))];
      if (scopedUserIds.length === 0) {
        await logActivity(req, { action: 'admin_users_list', entityType: 'admin_query', metadata: query });
        return sendSuccess(req, res, [], { page: query.page, pageSize: query.pageSize, total: 0 });
      }
    }

    let profilesQuery = req.supabase
      .from('profiles')
      .select('id, email, full_name, platform_role, first_login_at, last_login_at, last_seen_at, created_at, updated_at', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (query.userId) profilesQuery = profilesQuery.eq('id', query.userId);
    if (query.role) profilesQuery = profilesQuery.eq('platform_role', query.role);
    if (query.q) profilesQuery = profilesQuery.or(`email.ilike.%${query.q}%,full_name.ilike.%${query.q}%`);
    if (scopedUserIds) profilesQuery = profilesQuery.in('id', scopedUserIds);
    profilesQuery = applyRange(profilesQuery, 'updated_at', query.updatedFrom, query.updatedTo);

    const { data: profiles, error, count } = await profilesQuery;
    if (error) {
      throw new ApiError(500, 'Falha ao carregar usuarios.', error.message, 'admin_users_failed');
    }

    const userIds = (profiles || []).map((profile) => profile.id);
    const { data: memberships, error: membershipsError } = userIds.length
      ? await req.supabase
          .from('store_members')
          .select('user_id, role, store_id, stores(id, name, organization_id, regional_id)')
          .in('user_id', userIds)
      : emptyResult<{
          user_id: string;
          role: string;
          store_id: string;
          stores: { id: string; name: string | null; organization_id: string | null; regional_id: string | null } | null;
        }>();

    if (membershipsError) {
      throw new ApiError(500, 'Falha ao carregar memberships.', membershipsError.message, 'admin_users_memberships_failed');
    }

    const membershipsByUser = new Map<string, any[]>();
    for (const membership of memberships || []) {
      const current = membershipsByUser.get(membership.user_id) || [];
      current.push(membership);
      membershipsByUser.set(membership.user_id, current);
    }

    const items = (profiles || []).map((profile) => ({
      ...profile,
      stores: (membershipsByUser.get(profile.id) || []).map((membership) => ({
        id: membership.store_id,
        role: membership.role,
        name: membership.stores?.name || null,
        organizationId: membership.stores?.organization_id || null,
        regionalId: membership.stores?.regional_id || null,
      })),
      storeCount: (membershipsByUser.get(profile.id) || []).length,
    }));

    await logActivity(req, { action: 'admin_users_list', entityType: 'admin_query', metadata: query });
    return sendSuccess(req, res, items, {
      page: query.page,
      pageSize: query.pageSize,
      total: count || items.length,
    });
  }),
);

router.get(
  '/stores',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const { from, to } = buildPagination(query.page, query.pageSize);

    let storesQuery = req.supabase
      .from('stores')
      .select('id, name, brand, timezone, open_hour, close_hour, owner_id, organization_id, regional_id, created_at, updated_at', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (query.storeId) storesQuery = storesQuery.eq('id', query.storeId);
    if (query.organizationId) storesQuery = storesQuery.eq('organization_id', query.organizationId);
    if (query.regionalId) storesQuery = storesQuery.eq('regional_id', query.regionalId);
    if (query.q) storesQuery = storesQuery.or(`name.ilike.%${query.q}%,brand.ilike.%${query.q}%`);
    storesQuery = applyRange(storesQuery, 'updated_at', query.updatedFrom, query.updatedTo);

    const { data: stores, error, count } = await storesQuery;
    if (error) {
      throw new ApiError(500, 'Falha ao carregar lojas.', error.message, 'admin_stores_failed');
    }

    const storeIds = (stores || []).map((store) => store.id);

    const [membershipsResult, schedulesResult, uploadsResult, activityResult] = await Promise.all([
      storeIds.length
        ? req.supabase.from('store_members').select('store_id, user_id').in('store_id', storeIds)
        : emptyResult<{ store_id: string; user_id: string }>(),
      storeIds.length
        ? req.supabase.from('schedule_weeks').select('store_id, updated_at').in('store_id', storeIds)
        : emptyResult<{ store_id: string; updated_at: string }>(),
      storeIds.length
        ? req.supabase.from('uploaded_files').select('store_id, updated_at').in('store_id', storeIds)
        : emptyResult<{ store_id: string; updated_at: string }>(),
      storeIds.length
        ? req.supabase.from('activity_logs').select('store_id, created_at').in('store_id', storeIds).order('created_at', { ascending: false })
        : emptyResult<{ store_id: string; created_at: string }>(),
    ]);

    for (const result of [membershipsResult, schedulesResult, uploadsResult, activityResult]) {
      if (result.error) {
        throw new ApiError(500, 'Falha ao agregar dados das lojas.', result.error.message, 'admin_stores_aggregate_failed');
      }
    }

    const memberCountByStore = new Map<string, number>();
    for (const row of membershipsResult.data || []) {
      memberCountByStore.set(row.store_id, (memberCountByStore.get(row.store_id) || 0) + 1);
    }

    const scheduleCountByStore = new Map<string, number>();
    const lastScheduleAtByStore = new Map<string, string>();
    for (const row of schedulesResult.data || []) {
      scheduleCountByStore.set(row.store_id, (scheduleCountByStore.get(row.store_id) || 0) + 1);
      if (!lastScheduleAtByStore.get(row.store_id) || row.updated_at > lastScheduleAtByStore.get(row.store_id)!) {
        lastScheduleAtByStore.set(row.store_id, row.updated_at);
      }
    }

    const uploadCountByStore = new Map<string, number>();
    for (const row of uploadsResult.data || []) {
      uploadCountByStore.set(row.store_id, (uploadCountByStore.get(row.store_id) || 0) + 1);
    }

    const lastActivityByStore = new Map<string, string>();
    for (const row of activityResult.data || []) {
      if (!lastActivityByStore.get(row.store_id)) {
        lastActivityByStore.set(row.store_id, row.created_at);
      }
    }

    const items = (stores || []).map((store) => ({
      ...store,
      memberCount: memberCountByStore.get(store.id) || 0,
      scheduleCount: scheduleCountByStore.get(store.id) || 0,
      uploadCount: uploadCountByStore.get(store.id) || 0,
      lastScheduleAt: lastScheduleAtByStore.get(store.id) || null,
      lastActivityAt: lastActivityByStore.get(store.id) || null,
    }));

    await logActivity(req, { action: 'admin_stores_list', entityType: 'admin_query', metadata: query });
    return sendSuccess(req, res, items, {
      page: query.page,
      pageSize: query.pageSize,
      total: count || items.length,
    });
  }),
);

router.get(
  '/schedules',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const { from, to } = buildPagination(query.page, query.pageSize);

    let schedulesQuery = req.supabase
      .from('schedule_weeks')
      .select('id, store_id, week_start, status, source, validated_at, current_schedule_version, current_snapshot_version, created_by, updated_by, created_at, updated_at', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (query.storeId) schedulesQuery = schedulesQuery.eq('store_id', query.storeId);
    if (query.userId) schedulesQuery = schedulesQuery.or(`created_by.eq.${query.userId},updated_by.eq.${query.userId}`);
    if (query.periodStart) schedulesQuery = schedulesQuery.gte('week_start', query.periodStart);
    if (query.periodEnd) schedulesQuery = schedulesQuery.lte('week_start', query.periodEnd);
    schedulesQuery = applyRange(schedulesQuery, 'updated_at', query.updatedFrom, query.updatedTo);

    const { data: schedules, error, count } = await schedulesQuery;
    if (error) {
      throw new ApiError(500, 'Falha ao carregar schedules.', error.message, 'admin_schedules_failed');
    }

    const storeIds = [...new Set((schedules || []).map((row) => row.store_id))];
    const userIds = [...new Set((schedules || []).flatMap((row) => [row.created_by, row.updated_by]).filter(Boolean))];
    const weekIds = (schedules || []).map((row) => row.id);

    const [storesResult, profilesResult, scheduleVersionsResult, snapshotVersionsResult] = await Promise.all([
      storeIds.length
        ? req.supabase.from('stores').select('id, name, brand, organization_id, regional_id').in('id', storeIds)
        : emptyResult<{ id: string; name: string | null; brand: string | null; organization_id: string | null; regional_id: string | null }>(),
      userIds.length
        ? req.supabase.from('profiles').select('id, email, full_name').in('id', userIds)
        : emptyResult<{ id: string; email: string | null; full_name: string | null }>(),
      weekIds.length
        ? req.supabase.from('schedule_versions').select('schedule_week_id, version_number').in('schedule_week_id', weekIds)
        : emptyResult<{ schedule_week_id: string; version_number: number }>(),
      weekIds.length
        ? req.supabase.from('week_snapshot_versions').select('schedule_week_id, version_number').in('schedule_week_id', weekIds)
        : emptyResult<{ schedule_week_id: string; version_number: number }>(),
    ]);

    for (const result of [storesResult, profilesResult, scheduleVersionsResult, snapshotVersionsResult]) {
      if (result.error) {
        throw new ApiError(500, 'Falha ao agregar dados das schedules.', result.error.message, 'admin_schedules_aggregate_failed');
      }
    }

    const storesById = byId(
      (storesResult.data || []) as Array<{
        id: string;
        name: string | null;
        brand: string | null;
        organization_id: string | null;
        regional_id: string | null;
      }>,
    );
    const profilesById = byId(
      (profilesResult.data || []) as Array<{ id: string; email: string | null; full_name: string | null }>,
    );
    const scheduleVersionCount = new Map<string, number>();
    const snapshotVersionCount = new Map<string, number>();

    for (const row of scheduleVersionsResult.data || []) {
      scheduleVersionCount.set(row.schedule_week_id, (scheduleVersionCount.get(row.schedule_week_id) || 0) + 1);
    }
    for (const row of snapshotVersionsResult.data || []) {
      snapshotVersionCount.set(row.schedule_week_id, (snapshotVersionCount.get(row.schedule_week_id) || 0) + 1);
    }

    const items = (schedules || []).map((row) => ({
      ...row,
      store: storesById.get(row.store_id) || null,
      createdByProfile: row.created_by ? profilesById.get(row.created_by) || null : null,
      updatedByProfile: row.updated_by ? profilesById.get(row.updated_by) || null : null,
      scheduleVersionCount: scheduleVersionCount.get(row.id) || 0,
      snapshotVersionCount: snapshotVersionCount.get(row.id) || 0,
    }));

    await logActivity(req, { action: 'admin_schedules_list', entityType: 'admin_query', metadata: query });
    return sendSuccess(req, res, items, {
      page: query.page,
      pageSize: query.pageSize,
      total: count || items.length,
    });
  }),
);

router.get(
  '/flows',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const { from, to } = buildPagination(query.page, query.pageSize);

    let flowsQuery = req.supabase
      .from('schedule_weeks')
      .select('id, store_id, week_start, cupons_snapshot, sales_snapshot, validated_shifts, updated_by, updated_at, current_snapshot_version')
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (query.storeId) flowsQuery = flowsQuery.eq('store_id', query.storeId);
    if (query.userId) flowsQuery = flowsQuery.eq('updated_by', query.userId);
    if (query.periodStart) flowsQuery = flowsQuery.gte('week_start', query.periodStart);
    if (query.periodEnd) flowsQuery = flowsQuery.lte('week_start', query.periodEnd);
    flowsQuery = applyRange(flowsQuery, 'updated_at', query.updatedFrom, query.updatedTo);

    const { data: weeks, error } = await flowsQuery;
    if (error) {
      throw new ApiError(500, 'Falha ao carregar flows.', error.message, 'admin_flows_failed');
    }

    const filteredWeeks = (weeks || []).filter((row) => row.cupons_snapshot || row.sales_snapshot || row.validated_shifts);
    const storeIds = [...new Set(filteredWeeks.map((row) => row.store_id))];
    const userIds = [...new Set(filteredWeeks.map((row) => row.updated_by).filter(Boolean))];

    const [storesResult, profilesResult] = await Promise.all([
      storeIds.length
        ? req.supabase.from('stores').select('id, name, brand, organization_id, regional_id').in('id', storeIds)
        : emptyResult<{ id: string; name: string | null; brand: string | null; organization_id: string | null; regional_id: string | null }>(),
      userIds.length
        ? req.supabase.from('profiles').select('id, email, full_name').in('id', userIds)
        : emptyResult<{ id: string; email: string | null; full_name: string | null }>(),
    ]);

    if (storesResult.error || profilesResult.error) {
      throw new ApiError(
        500,
        'Falha ao agregar flows.',
        storesResult.error?.message || profilesResult.error?.message,
        'admin_flows_aggregate_failed',
      );
    }

    const storesById = byId(
      (storesResult.data || []) as Array<{
        id: string;
        name: string | null;
        brand: string | null;
        organization_id: string | null;
        regional_id: string | null;
      }>,
    );
    const profilesById = byId(
      (profilesResult.data || []) as Array<{ id: string; email: string | null; full_name: string | null }>,
    );

    const items = filteredWeeks.map((row) => ({
      scheduleWeekId: row.id,
      storeId: row.store_id,
      store: storesById.get(row.store_id) || null,
      weekStart: row.week_start,
      cuponsRows: Array.isArray(row.cupons_snapshot) ? row.cupons_snapshot.length : 0,
      salesRows: Array.isArray(row.sales_snapshot) ? row.sales_snapshot.length : 0,
      hasValidatedShifts: Boolean(row.validated_shifts),
      snapshotVersion: row.current_snapshot_version,
      updatedAt: row.updated_at,
      updatedByProfile: row.updated_by ? profilesById.get(row.updated_by) || null : null,
    }));

    await logActivity(req, { action: 'admin_flows_list', entityType: 'admin_query', metadata: query });
    return sendSuccess(req, res, items, {
      page: query.page,
      pageSize: query.pageSize,
      total: items.length,
    });
  }),
);

router.get(
  '/uploads',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const { from, to } = buildPagination(query.page, query.pageSize);

    let uploadsQuery = req.supabase
      .from('uploaded_files')
      .select('id, store_id, file_type, file_name, storage_path, processing_status, uploaded_by, created_by, updated_by, created_at, updated_at', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (query.storeId) uploadsQuery = uploadsQuery.eq('store_id', query.storeId);
    if (query.userId) uploadsQuery = uploadsQuery.or(`uploaded_by.eq.${query.userId},created_by.eq.${query.userId},updated_by.eq.${query.userId}`);
    if (query.fileType) uploadsQuery = uploadsQuery.eq('file_type', query.fileType);
    if (query.processingStatus) uploadsQuery = uploadsQuery.eq('processing_status', query.processingStatus);
    uploadsQuery = applyRange(uploadsQuery, 'updated_at', query.updatedFrom, query.updatedTo);

    const { data: uploads, error, count } = await uploadsQuery;
    if (error) {
      throw new ApiError(500, 'Falha ao carregar uploads.', error.message, 'admin_uploads_failed');
    }

    const storeIds = [...new Set((uploads || []).map((row) => row.store_id))];
    const userIds = [...new Set((uploads || []).flatMap((row) => [row.uploaded_by, row.created_by, row.updated_by]).filter(Boolean))];

    const [storesResult, profilesResult] = await Promise.all([
      storeIds.length
        ? req.supabase.from('stores').select('id, name, brand, organization_id, regional_id').in('id', storeIds)
        : emptyResult<{ id: string; name: string | null; brand: string | null; organization_id: string | null; regional_id: string | null }>(),
      userIds.length
        ? req.supabase.from('profiles').select('id, email, full_name').in('id', userIds)
        : emptyResult<{ id: string; email: string | null; full_name: string | null }>(),
    ]);

    if (storesResult.error || profilesResult.error) {
      throw new ApiError(
        500,
        'Falha ao agregar uploads.',
        storesResult.error?.message || profilesResult.error?.message,
        'admin_uploads_aggregate_failed',
      );
    }

    const storesById = byId(
      (storesResult.data || []) as Array<{
        id: string;
        name: string | null;
        brand: string | null;
        organization_id: string | null;
        regional_id: string | null;
      }>,
    );
    const profilesById = byId(
      (profilesResult.data || []) as Array<{ id: string; email: string | null; full_name: string | null }>,
    );

    const items = (uploads || []).map((row) => ({
      ...row,
      store: storesById.get(row.store_id) || null,
      uploadedByProfile: row.uploaded_by ? profilesById.get(row.uploaded_by) || null : null,
      createdByProfile: row.created_by ? profilesById.get(row.created_by) || null : null,
      updatedByProfile: row.updated_by ? profilesById.get(row.updated_by) || null : null,
    }));

    await logActivity(req, { action: 'admin_uploads_list', entityType: 'admin_query', metadata: query });
    return sendSuccess(req, res, items, {
      page: query.page,
      pageSize: query.pageSize,
      total: count || items.length,
    });
  }),
);

router.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const { from, to } = buildPagination(query.page, query.pageSize);

    let activityQuery = req.supabase
      .from('activity_logs')
      .select('id, user_id, role, action, entity_type, entity_id, store_id, metadata_json, request_id, error_code, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (query.userId) activityQuery = activityQuery.eq('user_id', query.userId);
    if (query.storeId) activityQuery = activityQuery.eq('store_id', query.storeId);
    if (query.action) activityQuery = activityQuery.eq('action', query.action);
    if (query.entityType) activityQuery = activityQuery.eq('entity_type', query.entityType);
    activityQuery = applyRange(activityQuery, 'created_at', query.updatedFrom, query.updatedTo);

    const { data: logs, error, count } = await activityQuery;
    if (error) {
      throw new ApiError(500, 'Falha ao carregar activity logs.', error.message, 'admin_activity_failed');
    }

    const storeIds = [...new Set((logs || []).map((row) => row.store_id).filter(Boolean))];
    const userIds = [...new Set((logs || []).map((row) => row.user_id).filter(Boolean))];

    const [storesResult, profilesResult] = await Promise.all([
      storeIds.length
        ? req.supabase.from('stores').select('id, name, brand').in('id', storeIds)
        : emptyResult<{ id: string; name: string | null; brand: string | null }>(),
      userIds.length
        ? req.supabase.from('profiles').select('id, email, full_name').in('id', userIds)
        : emptyResult<{ id: string; email: string | null; full_name: string | null }>(),
    ]);

    if (storesResult.error || profilesResult.error) {
      throw new ApiError(
        500,
        'Falha ao agregar activity logs.',
        storesResult.error?.message || profilesResult.error?.message,
        'admin_activity_aggregate_failed',
      );
    }

    const storesById = byId(
      (storesResult.data || []) as Array<{ id: string; name: string | null; brand: string | null }>,
    );
    const profilesById = byId(
      (profilesResult.data || []) as Array<{ id: string; email: string | null; full_name: string | null }>,
    );

    const items = (logs || []).map((row) => ({
      ...row,
      store: row.store_id ? storesById.get(row.store_id) || null : null,
      user: row.user_id ? profilesById.get(row.user_id) || null : null,
    }));

    await logActivity(req, { action: 'admin_activity_list', entityType: 'admin_query', metadata: query });
    return sendSuccess(req, res, items, {
      page: query.page,
      pageSize: query.pageSize,
      total: count || items.length,
    });
  }),
);

router.get(
  '/stores/:storeId/details',
  asyncHandler(async (req, res) => {
    const { storeId } = z.object({ storeId: uuidSchema }).parse(req.params);

    const [
      storeResult,
      membershipsResult,
      schedulesResult,
      scheduleVersionsResult,
      snapshotVersionsResult,
      uploadsResult,
      activityResult,
    ] = await Promise.all([
      req.supabase
        .from('stores')
        .select('id, name, brand, timezone, open_hour, close_hour, owner_id, organization_id, regional_id, created_at, updated_at')
        .eq('id', storeId)
        .single(),
      req.supabase
        .from('store_members')
        .select('user_id, role, created_at, updated_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false }),
      req.supabase
        .from('schedule_weeks')
        .select('id, store_id, week_start, status, source, validated_at, current_schedule_version, current_snapshot_version, created_by, updated_by, created_at, updated_at, cupons_snapshot, sales_snapshot')
        .eq('store_id', storeId)
        .order('week_start', { ascending: false })
        .limit(10),
      req.supabase
        .from('schedule_versions')
        .select('id, schedule_week_id, version_number, action, created_by, created_at, metadata_json')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(20),
      req.supabase
        .from('week_snapshot_versions')
        .select('id, schedule_week_id, version_number, action, created_by, created_at, metadata_json')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(20),
      req.supabase
        .from('uploaded_files')
        .select('id, file_type, file_name, storage_path, processing_status, uploaded_by, created_at, updated_at')
        .eq('store_id', storeId)
        .order('updated_at', { ascending: false })
        .limit(20),
      req.supabase
        .from('activity_logs')
        .select('id, user_id, role, action, entity_type, entity_id, metadata_json, request_id, error_code, created_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    for (const result of [
      storeResult,
      membershipsResult,
      schedulesResult,
      scheduleVersionsResult,
      snapshotVersionsResult,
      uploadsResult,
      activityResult,
    ]) {
      if (result.error) {
        throw new ApiError(500, 'Falha ao carregar o detalhe da loja.', result.error.message, 'admin_store_details_failed');
      }
    }

    if (!storeResult.data) {
      throw new ApiError(404, 'Loja nao encontrada.', undefined, 'store_not_found');
    }

    const profileIds = [
      ...(membershipsResult.data || []).map((row) => row.user_id),
      ...(schedulesResult.data || []).flatMap((row) => [row.created_by, row.updated_by]),
      ...(scheduleVersionsResult.data || []).map((row) => row.created_by),
      ...(snapshotVersionsResult.data || []).map((row) => row.created_by),
      ...(uploadsResult.data || []).map((row) => row.uploaded_by),
      ...(activityResult.data || []).map((row) => row.user_id),
    ].filter(Boolean);

    const { data: profiles, error: profilesError } = profileIds.length
      ? await req.supabase.from('profiles').select('id, email, full_name, platform_role, last_seen_at').in('id', [...new Set(profileIds)])
      : emptyResult<{
          id: string;
          email: string | null;
          full_name: string | null;
          platform_role: string;
          last_seen_at: string | null;
        }>();

    if (profilesError) {
      throw new ApiError(500, 'Falha ao carregar perfis do detalhe da loja.', profilesError.message, 'admin_store_profiles_failed');
    }

    const profilesById = byId(
      (profiles || []) as Array<{
        id: string;
        email: string | null;
        full_name: string | null;
        platform_role: string;
        last_seen_at: string | null;
      }>,
    );
    const schedules = schedulesResult.data || [];
    const currentSchedule = schedules[0] || null;

    const detail = {
      store: storeResult.data,
      users: (membershipsResult.data || []).map((row) => ({
        ...row,
        profile: profilesById.get(row.user_id) || null,
      })),
      currentSchedule: currentSchedule
        ? {
            ...currentSchedule,
            cuponsRows: Array.isArray(currentSchedule.cupons_snapshot) ? currentSchedule.cupons_snapshot.length : 0,
            salesRows: Array.isArray(currentSchedule.sales_snapshot) ? currentSchedule.sales_snapshot.length : 0,
            createdByProfile: currentSchedule.created_by ? profilesById.get(currentSchedule.created_by) || null : null,
            updatedByProfile: currentSchedule.updated_by ? profilesById.get(currentSchedule.updated_by) || null : null,
          }
        : null,
      schedules: schedules.map((row) => ({
        ...row,
        cuponsRows: Array.isArray(row.cupons_snapshot) ? row.cupons_snapshot.length : 0,
        salesRows: Array.isArray(row.sales_snapshot) ? row.sales_snapshot.length : 0,
        createdByProfile: row.created_by ? profilesById.get(row.created_by) || null : null,
        updatedByProfile: row.updated_by ? profilesById.get(row.updated_by) || null : null,
      })),
      scheduleVersions: (scheduleVersionsResult.data || []).map((row) => ({
        ...row,
        createdByProfile: row.created_by ? profilesById.get(row.created_by) || null : null,
      })),
      snapshotVersions: (snapshotVersionsResult.data || []).map((row) => ({
        ...row,
        createdByProfile: row.created_by ? profilesById.get(row.created_by) || null : null,
      })),
      uploads: (uploadsResult.data || []).map((row) => ({
        ...row,
        uploadedByProfile: row.uploaded_by ? profilesById.get(row.uploaded_by) || null : null,
      })),
      recentActivity: (activityResult.data || []).map((row) => ({
        ...row,
        user: row.user_id ? profilesById.get(row.user_id) || null : null,
      })),
      summary: {
        totalUsers: (membershipsResult.data || []).length,
        totalSchedules: schedules.length,
        totalUploads: (uploadsResult.data || []).length,
        totalActivities: (activityResult.data || []).length,
        lastActivityAt: activityResult.data?.[0]?.created_at || null,
      },
    };

    await logActivity(req, {
      action: 'admin_store_details',
      entityType: 'store',
      entityId: storeId,
      storeId,
    });

    return sendSuccess(req, res, detail);
  }),
);

export default router;
