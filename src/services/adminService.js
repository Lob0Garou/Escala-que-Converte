import { supabase } from '../lib/supabase';
import { WEEK_DAY_TO_EXCEL } from '../lib/dayUtils';
import { computeWeeklyScheduleScoreSummary, mapScheduleShiftToStaffRow } from '../lib/weeklyScore';
import { formatAdminStoreLabel, isDateInRange, resolveUserAccessTimestamp } from '../lib/adminConsole';

const ACTIVE_USAGE_WINDOW_DAYS = 7;
const INACTIVE_USER_WINDOW_DAYS = 21;
const STALE_STORE_WINDOW_DAYS = 14;
const DEFAULT_PAGE_SIZE = 10;

const ensureSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase nao configurado para a sessao administrativa.');
  }
};

const addDays = (dateString, days) => {
  if (!dateString) return null;
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const sortByDateDesc = (rows, selector) =>
  [...rows].sort((left, right) => {
    const leftDate = selector(left) ? new Date(selector(left)).getTime() : 0;
    const rightDate = selector(right) ? new Date(selector(right)).getTime() : 0;
    return rightDate - leftDate;
  });

const makeMap = (rows = []) => new Map(rows.map((row) => [row.id, row]));
const averageMetric = (values = []) => {
  const validValues = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!validValues.length) return null;
  const total = validValues.reduce((sum, value) => sum + value, 0);
  return Number((total / validValues.length).toFixed(1));
};
const sumMetric = (values = []) =>
  Number(
    values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .reduce((sum, value) => sum + value, 0)
      .toFixed(2),
  );
const buildPagedResult = (rows = [], page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
  const safePageSize = Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * safePageSize;
  const items = rows.slice(start, start + safePageSize);

  return {
    items,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };
};
const getThresholdDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};
const isRecent = (value, days) => {
  if (!value) return false;
  return new Date(value).getTime() >= getThresholdDate(days).getTime();
};
const getStoreUsageStatus = (lastActivityAt) => {
  if (!lastActivityAt) return 'sem_eventos';
  return isRecent(lastActivityAt, STALE_STORE_WINDOW_DAYS) ? 'ativa' : 'sem_uso_recente';
};

const fetchProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, email, platform_role, is_active, primary_store_id, created_at, last_login_at, last_seen_at',
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

const fetchStores = async () => {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, store_code, regional_id, city, state, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

const fetchMemberships = async () => {
  const { data, error } = await supabase
    .from('store_members')
    .select('user_id, role, store_id, created_at');

  if (error) throw new Error(error.message);
  return data || [];
};

const fetchScheduleWeeks = async () => {
  const { data, error } = await supabase
    .from('schedule_weeks')
    .select(
      'id, store_id, week_start, status, source, created_by, updated_by, created_at, updated_at, cupons_snapshot, sales_snapshot, current_schedule_version',
    )
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

const fetchScheduleShifts = async () => {
  const { data, error } = await supabase
    .from('schedule_shifts')
    .select(
      'id, schedule_week_id, employee_name, day_of_week, entrada, intervalo, saida, saida_dia_seguinte, sort_order',
    )
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

const fetchOptimizationResults = async () => {
  const { data, error } = await supabase
    .from('optimization_results')
    .select('id, schedule_week_id, score_before, score_after, delta_revenue, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

const fetchUploads = async () => {
  const { data, error } = await supabase
    .from('uploaded_files')
    .select(
      'id, store_id, file_type, file_name, storage_path, file_size, mime_type, processing_status, uploaded_by, created_at',
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

const fetchActivity = async (limit = 80) => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, user_id, store_id, action, entity_type, entity_id, metadata_json, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
};

const buildStaffRowsByWeek = (scheduleShifts = []) =>
  scheduleShifts.reduce((accumulator, shiftRow, index) => {
    const currentRows = accumulator.get(shiftRow.schedule_week_id) || [];
    currentRows.push(mapScheduleShiftToStaffRow(shiftRow, index));
    accumulator.set(shiftRow.schedule_week_id, currentRows);
    return accumulator;
  }, new Map());

const buildWeekScoreResolver = (scheduleWeeks, scheduleShifts, optimizationResults) => {
  const weeksById = makeMap(scheduleWeeks);
  const staffRowsByWeek = buildStaffRowsByWeek(scheduleShifts);
  const optimizationByWeek = optimizationResults.reduce((accumulator, result) => {
    if (!accumulator.has(result.schedule_week_id)) {
      accumulator.set(result.schedule_week_id, result);
    }
    return accumulator;
  }, new Map());
  const cache = new Map();

  return (scheduleWeekId) => {
    if (cache.has(scheduleWeekId)) {
      return cache.get(scheduleWeekId);
    }

    const week = weeksById.get(scheduleWeekId);
    const optimization = optimizationByWeek.get(scheduleWeekId) || null;
    const fallbackSummary = week
      ? computeWeeklyScheduleScoreSummary({
          cuponsData: week.cupons_snapshot || [],
          staffRows: staffRowsByWeek.get(scheduleWeekId) || [],
          baselineStaffRows: null,
          diasSemana: WEEK_DAY_TO_EXCEL,
          referenceDate: week.week_start,
          mirrorCurrentAsBaseline: true,
        })
      : null;

    const resolved = {
      scoreCurrent:
        optimization?.score_before ??
        fallbackSummary?.baselineAverageScore ??
        fallbackSummary?.currentAverageScore ??
        null,
      scoreIdeal:
        optimization?.score_after ??
        fallbackSummary?.currentAverageScore ??
        fallbackSummary?.baselineAverageScore ??
        null,
      potentialGain: optimization?.delta_revenue ?? null,
    };

    cache.set(scheduleWeekId, resolved);
    return resolved;
  };
};

export const getAdminOverview = async () => {
  ensureSupabase();

  const [profiles, stores, scheduleWeeks, uploads] = await Promise.all([
    fetchProfiles(),
    fetchStores(),
    fetchScheduleWeeks(),
    fetchUploads(),
  ]);

  const activeThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentUsers = profiles.filter((profile) => {
    if (!profile.last_seen_at) return false;
    return new Date(profile.last_seen_at).getTime() >= activeThreshold;
  });

  const flowCount = scheduleWeeks.filter(
    (row) =>
      (Array.isArray(row.cupons_snapshot) && row.cupons_snapshot.length > 0) ||
      (Array.isArray(row.sales_snapshot) && row.sales_snapshot.length > 0),
  ).length;

  return {
    totalUsers: profiles.length,
    totalStores: stores.length,
    totalSchedules: scheduleWeeks.length,
    totalFlows: flowCount,
    totalUploads: uploads.length,
    activeUsersRecently: recentUsers.length,
  };
};

export const getAdminUsers = async () => {
  ensureSupabase();

  const [profiles, memberships, stores, scheduleWeeks] = await Promise.all([
    fetchProfiles(),
    fetchMemberships(),
    fetchStores(),
    fetchScheduleWeeks(),
  ]);

  const storesById = makeMap(stores);
  const membershipsByUser = memberships.reduce((accumulator, membership) => {
    const current = accumulator.get(membership.user_id) || [];
    current.push(membership);
    accumulator.set(membership.user_id, current);
    return accumulator;
  }, new Map());

  return profiles.map((profile) => {
    const linkedMemberships = membershipsByUser.get(profile.id) || [];
    const linkedStores = linkedMemberships.map((membership) => {
      const store = storesById.get(membership.store_id);
      return {
        id: membership.store_id,
        role: membership.role,
        name: store?.name || 'Loja sem nome',
        storeCode: store?.store_code || null,
        isPrimary: profile.primary_store_id === membership.store_id,
      };
    });

    const primaryStore =
      linkedStores.find((store) => store.id === profile.primary_store_id) || linkedStores[0] || null;

    return {
      id: profile.id,
      name: profile.full_name || 'Sem nome',
      email: profile.email || 'Sem email',
      role: profile.platform_role || 'viewer',
      isActive: profile.is_active ?? true,
      primaryStoreId: profile.primary_store_id || null,
      createdAt: profile.created_at,
      lastLoginAt: profile.last_login_at,
      lastSeenAt: profile.last_seen_at,
      linkedStores,
      storeCount: linkedStores.length,
      scheduleCountTouched: scheduleWeeks.filter(
        (week) => week.created_by === profile.id || week.updated_by === profile.id,
      ).length,
      primaryStoreLabel: primaryStore
        ? primaryStore.storeCode
          ? `${primaryStore.storeCode} - ${primaryStore.name}`
          : primaryStore.name
        : 'Sem loja vinculada',
    };
  });
};

export const getAdminStores = async () => {
  ensureSupabase();

  const [stores, memberships, scheduleWeeks, scheduleShifts, optimizationResults, activity] = await Promise.all([
    fetchStores(),
    fetchMemberships(),
    fetchScheduleWeeks(),
    fetchScheduleShifts(),
    fetchOptimizationResults(),
    fetchActivity(200),
  ]);

  const resolveWeekScores = buildWeekScoreResolver(scheduleWeeks, scheduleShifts, optimizationResults);

  return stores.map((store) => {
    const relatedMemberships = memberships.filter((membership) => membership.store_id === store.id);
    const relatedWeeks = scheduleWeeks.filter((week) => week.store_id === store.id);
    const lastActivity = activity.find((entry) => entry.store_id === store.id);
    const flowWeeks = relatedWeeks.filter(
      (week) =>
        (Array.isArray(week.cupons_snapshot) && week.cupons_snapshot.length > 0) ||
        (Array.isArray(week.sales_snapshot) && week.sales_snapshot.length > 0),
    );
    const scoredWeeks = relatedWeeks
      .map((week) => ({
        id: week.id,
        ...resolveWeekScores(week.id),
      }))
      .filter((week) => week.scoreCurrent !== null || week.scoreIdeal !== null);
    const weeklyScoreAvg = averageMetric(scoredWeeks.map((week) => week.scoreCurrent));
    const weeklyScoreTargetAvg = averageMetric(scoredWeeks.map((week) => week.scoreIdeal));
    const weeklyScoreGap =
      weeklyScoreAvg !== null && weeklyScoreTargetAvg !== null
        ? Number((weeklyScoreTargetAvg - weeklyScoreAvg).toFixed(1))
        : null;
    const potentialGainTotal = sumMetric(scoredWeeks.map((week) => week.potentialGain));

    return {
      id: store.id,
      storeCode: store.store_code || null,
      storeName: store.name,
      regionalId: store.regional_id || null,
      city: store.city || null,
      state: store.state || null,
      createdAt: store.created_at,
      updatedAt: store.updated_at,
      userCount: relatedMemberships.length,
      scheduleCount: relatedWeeks.length,
      flowCount: flowWeeks.length,
      lastActivityAt: lastActivity?.created_at || null,
      weeklyScoreAvg,
      weeklyScoreTargetAvg,
      weeklyScoreGap,
      potentialGainTotal,
      usageStatus: getStoreUsageStatus(lastActivity?.created_at || null),
    };
  });
};

export const getAdminSchedules = async () => {
  ensureSupabase();

  const [scheduleWeeks, scheduleShifts, stores, profiles, optimizationResults] = await Promise.all([
    fetchScheduleWeeks(),
    fetchScheduleShifts(),
    fetchStores(),
    fetchProfiles(),
    fetchOptimizationResults(),
  ]);

  const storesById = makeMap(stores);
  const profilesById = makeMap(profiles);
  const resolveWeekScores = buildWeekScoreResolver(scheduleWeeks, scheduleShifts, optimizationResults);

  return sortByDateDesc(
    scheduleWeeks.map((week) => {
      const store = storesById.get(week.store_id);
      const responsibleId = week.updated_by || week.created_by;
      const responsibleProfile = responsibleId ? profilesById.get(responsibleId) : null;
      const scores = resolveWeekScores(week.id);

      return {
        id: week.id,
        storeId: week.store_id,
        storeName: store?.name || 'Loja sem nome',
        storeCode: store?.store_code || null,
        periodStart: week.week_start,
        periodEnd: addDays(week.week_start, 6),
        responsibleUser: responsibleProfile?.full_name || responsibleProfile?.email || 'Sem responsavel',
        scoreCurrent: scores.scoreCurrent,
        scoreIdeal: scores.scoreIdeal,
        potentialGain: scores.potentialGain,
        version: week.current_schedule_version ?? 0,
        updatedAt: week.updated_at,
        status: week.status,
      };
    }),
    (row) => row.updatedAt,
  );
};

export const getAdminFlows = async () => {
  ensureSupabase();

  const [scheduleWeeks, stores, profiles] = await Promise.all([
    fetchScheduleWeeks(),
    fetchStores(),
    fetchProfiles(),
  ]);

  const storesById = makeMap(stores);
  const profilesById = makeMap(profiles);

  return sortByDateDesc(
    scheduleWeeks
      .filter(
        (week) =>
          (Array.isArray(week.cupons_snapshot) && week.cupons_snapshot.length > 0) ||
          (Array.isArray(week.sales_snapshot) && week.sales_snapshot.length > 0),
      )
      .map((week) => {
        const store = storesById.get(week.store_id);
        const responsibleProfile = week.updated_by ? profilesById.get(week.updated_by) : null;
        const hasCupons = Array.isArray(week.cupons_snapshot) && week.cupons_snapshot.length > 0;
        const hasSales = Array.isArray(week.sales_snapshot) && week.sales_snapshot.length > 0;

        return {
          id: week.id,
          storeId: week.store_id,
          storeName: store?.name || 'Loja sem nome',
          storeCode: store?.store_code || null,
          periodStart: week.week_start,
          periodEnd: addDays(week.week_start, 6),
          sourceType: hasCupons && hasSales ? 'cupons + vendas' : hasSales ? 'vendas' : 'fluxo',
          responsibleUser: responsibleProfile?.full_name || responsibleProfile?.email || 'Sem responsavel',
          updatedAt: week.updated_at,
          source: week.source,
        };
      }),
    (row) => row.updatedAt,
  );
};

export const getAdminUploads = async () => {
  ensureSupabase();

  const [uploads, stores, profiles] = await Promise.all([
    fetchUploads(),
    fetchStores(),
    fetchProfiles(),
  ]);

  const storesById = makeMap(stores);
  const profilesById = makeMap(profiles);

  return uploads.map((upload) => {
    const store = storesById.get(upload.store_id);
    const user = upload.uploaded_by ? profilesById.get(upload.uploaded_by) : null;

    return {
      id: upload.id,
      storeId: upload.store_id,
      userName: user?.full_name || user?.email || 'Sem usuario',
      storeName: store?.name || 'Loja sem nome',
      storeCode: store?.store_code || null,
      type: upload.file_type,
      fileName: upload.file_name,
      status: upload.processing_status,
      createdAt: upload.created_at,
      mimeType: upload.mime_type || null,
      fileSize: upload.file_size || null,
    };
  });
};

export const getAdminActivity = async () => {
  ensureSupabase();

  const [activity, stores, profiles] = await Promise.all([
    fetchActivity(120),
    fetchStores(),
    fetchProfiles(),
  ]);

  const storesById = makeMap(stores);
  const profilesById = makeMap(profiles);

  return activity.map((entry) => {
    const user = entry.user_id ? profilesById.get(entry.user_id) : null;
    const store = entry.store_id ? storesById.get(entry.store_id) : null;

    return {
      id: entry.id,
      storeId: entry.store_id || null,
      userName: user?.full_name || user?.email || 'Sistema',
      action: entry.action,
      entityType: entry.entity_type || 'indefinido',
      entityId: entry.entity_id || null,
      storeName: store?.name || null,
      storeCode: store?.store_code || null,
      createdAt: entry.created_at,
      metadata: entry.metadata_json || {},
    };
  });
};

export const getAdminStoreDetails = async (storeId) => {
  ensureSupabase();

  if (!storeId) {
    throw new Error('Loja nao informada.');
  }

  const [stores, memberships, profiles, scheduleWeeks, scheduleShifts, optimizationResults, uploads, activity] =
    await Promise.all([
      fetchStores(),
      fetchMemberships(),
      fetchProfiles(),
      fetchScheduleWeeks(),
      fetchScheduleShifts(),
      fetchOptimizationResults(),
      fetchUploads(),
      fetchActivity(200),
    ]);

  const store = stores.find((item) => item.id === storeId);

  if (!store) {
    throw new Error('Loja nao encontrada.');
  }

  const profilesById = makeMap(profiles);
  const resolveWeekScores = buildWeekScoreResolver(scheduleWeeks, scheduleShifts, optimizationResults);

  const storeMemberships = memberships.filter((membership) => membership.store_id === storeId);
  const storeSchedules = scheduleWeeks.filter((week) => week.store_id === storeId);
  const storeFlows = storeSchedules.filter(
    (week) =>
      (Array.isArray(week.cupons_snapshot) && week.cupons_snapshot.length > 0) ||
      (Array.isArray(week.sales_snapshot) && week.sales_snapshot.length > 0),
  );
  const storeUploads = uploads.filter((upload) => upload.store_id === storeId);
  const storeActivity = activity.filter((entry) => entry.store_id === storeId);

  const linkedUsers = sortByDateDesc(
    storeMemberships.map((membership) => {
      const user = profilesById.get(membership.user_id);

      return {
        id: membership.user_id,
        name: user?.full_name || 'Sem nome',
        email: user?.email || 'Sem email',
        platformRole: user?.platform_role || 'viewer',
        isActive: user?.is_active ?? true,
        membershipRole: membership.role,
        isPrimary: user?.primary_store_id === membership.store_id,
        createdAt: user?.created_at || membership.created_at,
        lastLoginAt: user?.last_login_at || null,
        lastSeenAt: user?.last_seen_at || null,
      };
    }),
    (row) => row.lastSeenAt || row.lastLoginAt || row.createdAt,
  );

  const scheduleRows = sortByDateDesc(
    storeSchedules.map((week) => {
      const responsibleId = week.updated_by || week.created_by;
      const responsibleProfile = responsibleId ? profilesById.get(responsibleId) : null;
      const scores = resolveWeekScores(week.id);

      return {
        id: week.id,
        periodStart: week.week_start,
        periodEnd: addDays(week.week_start, 6),
        responsibleUser:
          responsibleProfile?.full_name || responsibleProfile?.email || 'Sem responsavel',
        scoreCurrent: scores.scoreCurrent,
        scoreIdeal: scores.scoreIdeal,
        potentialGain: scores.potentialGain,
        version: week.current_schedule_version ?? 0,
        updatedAt: week.updated_at,
        status: week.status,
      };
    }),
    (row) => row.updatedAt,
  );

  const flowRows = sortByDateDesc(
    storeFlows.map((week) => {
      const responsibleProfile = week.updated_by ? profilesById.get(week.updated_by) : null;
      const hasCupons = Array.isArray(week.cupons_snapshot) && week.cupons_snapshot.length > 0;
      const hasSales = Array.isArray(week.sales_snapshot) && week.sales_snapshot.length > 0;

      return {
        id: week.id,
        periodStart: week.week_start,
        periodEnd: addDays(week.week_start, 6),
        sourceType: hasCupons && hasSales ? 'cupons + vendas' : hasSales ? 'vendas' : 'fluxo',
        responsibleUser:
          responsibleProfile?.full_name || responsibleProfile?.email || 'Sem responsavel',
        updatedAt: week.updated_at,
      };
    }),
    (row) => row.updatedAt,
  );

  const uploadRows = sortByDateDesc(
    storeUploads.map((upload) => {
      const user = upload.uploaded_by ? profilesById.get(upload.uploaded_by) : null;

      return {
        id: upload.id,
        userName: user?.full_name || user?.email || 'Sem usuario',
        type: upload.file_type,
        fileName: upload.file_name,
        status: upload.processing_status,
        createdAt: upload.created_at,
        mimeType: upload.mime_type || null,
        fileSize: upload.file_size || null,
      };
    }),
    (row) => row.createdAt,
  );

  const activityRows = sortByDateDesc(
    storeActivity.map((entry) => {
      const user = entry.user_id ? profilesById.get(entry.user_id) : null;

      return {
        id: entry.id,
        userName: user?.full_name || user?.email || 'Sistema',
        action: entry.action,
        entityType: entry.entity_type || 'indefinido',
        entityId: entry.entity_id || null,
        createdAt: entry.created_at,
        metadata: entry.metadata_json || {},
      };
    }),
    (row) => row.createdAt,
  );

  return {
    store: {
      id: store.id,
      storeCode: store.store_code || null,
      storeName: store.name,
      regionalId: store.regional_id || null,
      city: store.city || null,
      state: store.state || null,
      createdAt: store.created_at,
      updatedAt: store.updated_at,
      lastActivityAt: activityRows[0]?.createdAt || null,
    },
    metrics: {
      totalUsers: linkedUsers.length,
      totalSchedules: scheduleRows.length,
      totalFlows: flowRows.length,
      totalUploads: uploadRows.length,
      activeUsersRecently: linkedUsers.filter((row) => {
        if (!row.lastSeenAt) return false;
        return new Date(row.lastSeenAt).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000;
      }).length,
    },
    users: linkedUsers,
    schedules: scheduleRows,
    flows: flowRows,
    uploads: uploadRows,
    activity: activityRows,
  };
};

export const getAdminUserDetails = async (userId) => {
  ensureSupabase();

  if (!userId) {
    throw new Error('Usuario nao informado.');
  }

  const [profiles, stores, memberships, scheduleWeeks, scheduleShifts, optimizationResults, uploads, activity] =
    await Promise.all([
      fetchProfiles(),
      fetchStores(),
      fetchMemberships(),
      fetchScheduleWeeks(),
      fetchScheduleShifts(),
      fetchOptimizationResults(),
      fetchUploads(),
      fetchActivity(250),
    ]);

  const user = profiles.find((item) => item.id === userId);

  if (!user) {
    throw new Error('Usuario nao encontrado.');
  }

  const storesById = makeMap(stores);
  const resolveWeekScores = buildWeekScoreResolver(scheduleWeeks, scheduleShifts, optimizationResults);

  const userMemberships = memberships.filter((membership) => membership.user_id === userId);
  const userSchedules = scheduleWeeks.filter(
    (week) => week.created_by === userId || week.updated_by === userId,
  );
  const userFlows = userSchedules.filter(
    (week) =>
      (Array.isArray(week.cupons_snapshot) && week.cupons_snapshot.length > 0) ||
      (Array.isArray(week.sales_snapshot) && week.sales_snapshot.length > 0),
  );
  const userUploads = uploads.filter((upload) => upload.uploaded_by === userId);
  const userActivity = activity.filter((entry) => entry.user_id === userId);

  const linkedStores = sortByDateDesc(
    userMemberships.map((membership) => {
      const store = storesById.get(membership.store_id);

      return {
        id: membership.store_id,
        role: membership.role,
        storeName: store?.name || 'Loja sem nome',
        storeCode: store?.store_code || null,
        regionalId: store?.regional_id || null,
        city: store?.city || null,
        state: store?.state || null,
        isPrimary: user.primary_store_id === membership.store_id,
        joinedAt: membership.created_at,
      };
    }),
    (row) => row.joinedAt,
  );

  const scheduleRows = sortByDateDesc(
    userSchedules.map((week) => {
      const store = storesById.get(week.store_id);
      const scores = resolveWeekScores(week.id);

      return {
        id: week.id,
        storeId: week.store_id,
        storeName: store?.name || 'Loja sem nome',
        storeCode: store?.store_code || null,
        periodStart: week.week_start,
        periodEnd: addDays(week.week_start, 6),
        scoreCurrent: scores.scoreCurrent,
        scoreIdeal: scores.scoreIdeal,
        potentialGain: scores.potentialGain,
        version: week.current_schedule_version ?? 0,
        status: week.status,
        updatedAt: week.updated_at,
      };
    }),
    (row) => row.updatedAt,
  );

  const flowRows = sortByDateDesc(
    userFlows.map((week) => {
      const store = storesById.get(week.store_id);
      const hasCupons = Array.isArray(week.cupons_snapshot) && week.cupons_snapshot.length > 0;
      const hasSales = Array.isArray(week.sales_snapshot) && week.sales_snapshot.length > 0;

      return {
        id: week.id,
        storeId: week.store_id,
        storeName: store?.name || 'Loja sem nome',
        storeCode: store?.store_code || null,
        periodStart: week.week_start,
        periodEnd: addDays(week.week_start, 6),
        sourceType: hasCupons && hasSales ? 'cupons + vendas' : hasSales ? 'vendas' : 'fluxo',
        updatedAt: week.updated_at,
      };
    }),
    (row) => row.updatedAt,
  );

  const uploadRows = sortByDateDesc(
    userUploads.map((upload) => {
      const store = storesById.get(upload.store_id);

      return {
        id: upload.id,
        storeId: upload.store_id,
        storeName: store?.name || 'Loja sem nome',
        storeCode: store?.store_code || null,
        type: upload.file_type,
        fileName: upload.file_name,
        status: upload.processing_status,
        mimeType: upload.mime_type || null,
        fileSize: upload.file_size || null,
        createdAt: upload.created_at,
      };
    }),
    (row) => row.createdAt,
  );

  const activityRows = sortByDateDesc(
    userActivity.map((entry) => {
      const store = entry.store_id ? storesById.get(entry.store_id) : null;

      return {
        id: entry.id,
        action: entry.action,
        entityType: entry.entity_type || 'indefinido',
        entityId: entry.entity_id || null,
        storeName: store?.name || null,
        storeCode: store?.store_code || null,
        metadata: entry.metadata_json || {},
        createdAt: entry.created_at,
      };
    }),
    (row) => row.createdAt,
  );

  return {
    user: {
      id: user.id,
      name: user.full_name || 'Sem nome',
      email: user.email || 'Sem email',
      platformRole: user.platform_role || 'viewer',
      isActive: user.is_active ?? true,
      primaryStoreId: user.primary_store_id || null,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at || null,
      lastSeenAt: user.last_seen_at || null,
      lastActivityAt: activityRows[0]?.createdAt || null,
    },
    metrics: {
      totalStores: linkedStores.length,
      totalSchedules: scheduleRows.length,
      totalFlows: flowRows.length,
      totalUploads: uploadRows.length,
      totalActivity: activityRows.length,
    },
    stores: linkedStores,
    schedules: scheduleRows,
    flows: flowRows,
    uploads: uploadRows,
    activity: activityRows,
  };
};

export const getAdminDirectoryOptions = async () => {
  ensureSupabase();

  const [profiles, stores] = await Promise.all([fetchProfiles(), fetchStores()]);

  return {
    users: profiles.map((profile) => ({
      value: profile.id,
      label: `${profile.full_name || 'Sem nome'} - ${profile.email || 'Sem email'}`,
    })),
    stores: stores.map((store) => ({
      value: store.id,
      label: formatAdminStoreLabel(store.store_code, store.name),
    })),
  };
};

export const getAdminExecutiveOverview = async ({
  dateRange = { key: 'all', startDate: null, endDate: null },
} = {}) => {
  ensureSupabase();

  const [stores, users, schedules, flows, activity] = await Promise.all([
    getAdminStores(),
    getAdminUsers(),
    getAdminSchedules(),
    getAdminFlows(),
    getAdminActivity(),
  ]);

  const filteredStores = stores.filter((store) =>
    isDateInRange(store.lastActivityAt || store.updatedAt || store.createdAt, dateRange),
  );
  const filteredUsers = users.filter((user) =>
    dateRange?.key === 'all'
      ? true
      : isDateInRange(resolveUserAccessTimestamp(user) || user.createdAt, dateRange),
  );
  const filteredSchedules = schedules.filter((schedule) =>
    isDateInRange(schedule.updatedAt, dateRange),
  );
  const filteredFlows = flows.filter((flow) => isDateInRange(flow.updatedAt, dateRange));
  const filteredActivity = activity.filter((entry) => isDateInRange(entry.createdAt, dateRange));

  const weeklyScoreAvg = averageMetric(filteredSchedules.map((row) => row.scoreCurrent));
  const weeklyScoreTargetAvg = averageMetric(filteredSchedules.map((row) => row.scoreIdeal));
  const weeklyScoreGap =
    weeklyScoreAvg !== null && weeklyScoreTargetAvg !== null
      ? Number((weeklyScoreTargetAvg - weeklyScoreAvg).toFixed(1))
      : null;
  const weeklyPotentialGainTotal = sumMetric(filteredSchedules.map((row) => row.potentialGain));
  const storesBelowTarget = filteredStores.filter(
    (store) =>
      store.weeklyScoreAvg !== null &&
      store.weeklyScoreTargetAvg !== null &&
      Number(store.weeklyScoreAvg) < Number(store.weeklyScoreTargetAvg),
  );
  const storesWithoutRecentUse = filteredStores.filter((store) => store.usageStatus !== 'ativa');
  const inactiveUsers = filteredUsers.filter(
    (user) => !isRecent(resolveUserAccessTimestamp(user), INACTIVE_USER_WINDOW_DAYS),
  );
  const usersWithoutPrimaryStore = filteredUsers.filter((user) => !user.primaryStoreId);
  const schedulesWithoutScore = filteredSchedules.filter(
    (schedule) => schedule.scoreCurrent === null || schedule.scoreIdeal === null,
  );
  const storesWithFlowInRange = new Set(filteredFlows.map((flow) => flow.storeId));
  const storesWithoutRecentFlow = filteredStores.filter((store) => !storesWithFlowInRange.has(store.id));

  const topStores = [...filteredStores]
    .filter((store) => store.weeklyScoreAvg !== null)
    .sort((left, right) => (right.weeklyScoreAvg || 0) - (left.weeklyScoreAvg || 0))
    .slice(0, 5);
  const bottomStores = [...filteredStores]
    .filter((store) => store.weeklyScoreAvg !== null)
    .sort((left, right) => (left.weeklyScoreAvg || 0) - (right.weeklyScoreAvg || 0))
    .slice(0, 5);

  return {
    kpis: {
      weeklyScoreAvg,
      weeklyScoreTargetAvg,
      weeklyScoreGap,
      weeklyPotentialGainTotal,
      storesBelowTargetCount: storesBelowTarget.length,
      activeUsers7dCount: filteredUsers.filter((user) => isRecent(resolveUserAccessTimestamp(user), ACTIVE_USAGE_WINDOW_DAYS)).length,
      storesWithoutRecentUseCount: storesWithoutRecentUse.length,
    },
    topStores,
    bottomStores,
    criticalQueues: {
      storesBelowTarget: storesBelowTarget.slice(0, 5),
      schedulesWithoutScore: schedulesWithoutScore.slice(0, 5),
      storesWithoutRecentFlow: storesWithoutRecentFlow.slice(0, 5),
      inactiveUsers: inactiveUsers.slice(0, 5),
      usersWithoutPrimaryStore: usersWithoutPrimaryStore.slice(0, 5),
    },
    recentActivity: filteredActivity.slice(0, 8),
  };
};

export const getAdminStoresList = async ({
  dateRange = { key: 'all', startDate: null, endDate: null },
  query = '',
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  usageStatus = 'all',
} = {}) => {
  ensureSupabase();

  const stores = await getAdminStores();
  const normalizedQuery = query.trim().toLowerCase();

  const rows = stores.filter((store) => {
    const matchesQuery =
      !normalizedQuery ||
      `${store.storeCode || ''} ${store.storeName} ${store.city || ''} ${store.state || ''} ${store.regionalId || ''}`
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesDate = isDateInRange(store.lastActivityAt || store.updatedAt || store.createdAt, dateRange);
    const matchesStatus = usageStatus === 'all' || store.usageStatus === usageStatus;
    return matchesQuery && matchesDate && matchesStatus;
  });

  const sortedRows = sortByDateDesc(rows, (row) => row.lastActivityAt || row.updatedAt || row.createdAt);
  return buildPagedResult(sortedRows, page, pageSize);
};

export const getAdminUsersList = async ({
  dateRange = { key: 'all', startDate: null, endDate: null },
  query = '',
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  role = 'all',
  status = 'all',
  accessState = 'all',
  primaryStoreId = 'all',
  linkedStoreId = 'all',
} = {}) => {
  ensureSupabase();

  const users = await getAdminUsers();
  const normalizedQuery = query.trim().toLowerCase();

  const rows = users.filter((user) => {
    const storeText = user.linkedStores
      .map((store) => `${store.storeCode || ''} ${store.name}`)
      .join(' ');
    const matchesQuery =
      !normalizedQuery ||
      `${user.name} ${user.email} ${user.role} ${user.primaryStoreLabel} ${storeText}`
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesDate =
      dateRange?.key === 'all'
        ? true
        : isDateInRange(resolveUserAccessTimestamp(user) || user.createdAt, dateRange);
    const matchesRole = role === 'all' || user.role === role;
    const matchesStatus = status === 'all' || (status === 'ativo' ? user.isActive : !user.isActive);
    const matchesPrimaryStore = primaryStoreId === 'all' || user.primaryStoreId === primaryStoreId;
    const matchesLinkedStore =
      linkedStoreId === 'all' || user.linkedStores.some((store) => store.id === linkedStoreId);

    const accessTimestamp = resolveUserAccessTimestamp(user);
    const matchesAccessState =
      accessState === 'all'
        ? true
        : accessState === 'without_recent_access'
          ? !isRecent(accessTimestamp, INACTIVE_USER_WINDOW_DAYS)
          : accessState === 'without_primary_store'
            ? !user.primaryStoreId
            : accessState === 'never_accessed'
              ? !accessTimestamp
              : true;

    return (
      matchesQuery &&
      matchesDate &&
      matchesRole &&
      matchesStatus &&
      matchesPrimaryStore &&
      matchesLinkedStore &&
      matchesAccessState
    );
  });

  const sortedRows = sortByDateDesc(rows, (row) => resolveUserAccessTimestamp(row) || row.createdAt);
  return buildPagedResult(sortedRows, page, pageSize);
};

export const getAdminSchedulesList = async ({
  dateRange = { key: 'all', startDate: null, endDate: null },
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  storeId = 'all',
  scoreStatus = 'all',
} = {}) => {
  ensureSupabase();

  const schedules = await getAdminSchedules();
  const rows = schedules.filter((schedule) => {
    const matchesDate = isDateInRange(schedule.updatedAt, dateRange);
    const matchesStore = storeId === 'all' || schedule.storeId === storeId;
    const matchesScore =
      scoreStatus === 'all'
        ? true
        : scoreStatus === 'without_score'
          ? schedule.scoreCurrent === null || schedule.scoreIdeal === null
          : scoreStatus === 'below_target'
            ? schedule.scoreCurrent !== null &&
              schedule.scoreIdeal !== null &&
              Number(schedule.scoreCurrent) < Number(schedule.scoreIdeal)
            : true;
    return matchesDate && matchesStore && matchesScore;
  });

  return buildPagedResult(sortByDateDesc(rows, (row) => row.updatedAt), page, pageSize);
};

export const getAdminFlowsList = async ({
  dateRange = { key: 'all', startDate: null, endDate: null },
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  storeId = 'all',
} = {}) => {
  ensureSupabase();

  const flows = await getAdminFlows();
  const rows = flows.filter((flow) => {
    const matchesDate = isDateInRange(flow.updatedAt, dateRange);
    const matchesStore = storeId === 'all' || flow.storeId === storeId;
    return matchesDate && matchesStore;
  });

  return buildPagedResult(sortByDateDesc(rows, (row) => row.updatedAt), page, pageSize);
};

export const getAdminActivityList = async ({
  dateRange = { key: 'all', startDate: null, endDate: null },
  query = '',
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => {
  ensureSupabase();

  const activity = await getAdminActivity();
  const normalizedQuery = query.trim().toLowerCase();
  const rows = activity.filter((entry) => {
    const matchesDate = isDateInRange(entry.createdAt, dateRange);
    const matchesQuery =
      !normalizedQuery ||
      `${entry.userName} ${entry.action} ${entry.entityType} ${entry.storeName || ''}`
        .toLowerCase()
        .includes(normalizedQuery);
    return matchesDate && matchesQuery;
  });

  return buildPagedResult(sortByDateDesc(rows, (row) => row.createdAt), page, pageSize);
};

export const getAdminUploadsList = async ({
  dateRange = { key: 'all', startDate: null, endDate: null },
  query = '',
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => {
  ensureSupabase();

  const uploads = await getAdminUploads();
  const normalizedQuery = query.trim().toLowerCase();
  const rows = uploads.filter((upload) => {
    const matchesDate = isDateInRange(upload.createdAt, dateRange);
    const matchesQuery =
      !normalizedQuery ||
      `${upload.userName} ${upload.storeName} ${upload.storeCode || ''} ${upload.type} ${upload.fileName}`
        .toLowerCase()
        .includes(normalizedQuery);
    return matchesDate && matchesQuery;
  });

  return buildPagedResult(sortByDateDesc(rows, (row) => row.createdAt), page, pageSize);
};

export const getAdminMembershipsList = async ({
  query = '',
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => {
  ensureSupabase();

  const users = await getAdminUsers();
  const normalizedQuery = query.trim().toLowerCase();
  const rows = users.flatMap((user) =>
    (user.linkedStores || []).map((membership) => ({
      id: `${user.id}-${membership.id}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      userActive: user.isActive,
      storeId: membership.id,
      storeCode: membership.storeCode || null,
      storeName: membership.name,
      membershipRole: membership.role,
      isPrimary: membership.isPrimary,
      lastLoginAt: user.lastLoginAt,
      lastSeenAt: user.lastSeenAt,
    })),
  );

  const filteredRows = rows.filter((row) => {
    const matchesQuery =
      !normalizedQuery ||
      `${row.userName} ${row.userEmail} ${row.storeCode || ''} ${row.storeName} ${row.membershipRole}`
        .toLowerCase()
        .includes(normalizedQuery);
    return matchesQuery;
  });

  return buildPagedResult(
    sortByDateDesc(filteredRows, (row) => row.lastSeenAt || row.lastLoginAt),
    page,
    pageSize,
  );
};

export const updateAdminPlatformRole = async (userId, role) => {
  ensureSupabase();

  const { error } = await supabase.rpc('set_platform_role', {
    p_target_user_id: userId,
    p_role: role,
  });

  if (error) throw new Error(error.message);
  return true;
};

export const updateAdminUserProfile = async (
  userId,
  { fullName = null, email = null, isActive = null, primaryStoreId = null, setPrimaryStore = false } = {},
) => {
  ensureSupabase();

  const { error } = await supabase.rpc('admin_update_profile_basics', {
    p_target_user_id: userId,
    p_full_name: fullName,
    p_email: email,
    p_is_active: isActive,
    p_primary_store_id: primaryStoreId,
    p_set_primary_store: setPrimaryStore,
  });

  if (error) throw new Error(error.message);
  return true;
};

export const upsertAdminStoreMembership = async (userId, storeId, role) => {
  ensureSupabase();

  const { error } = await supabase.rpc('admin_upsert_store_member', {
    p_store_id: storeId,
    p_target_user_id: userId,
    p_role: role,
  });

  if (error) throw new Error(error.message);
  return true;
};

export const removeAdminStoreMembership = async (userId, storeId) => {
  ensureSupabase();

  const { error } = await supabase.rpc('admin_remove_store_member', {
    p_store_id: storeId,
    p_target_user_id: userId,
  });

  if (error) throw new Error(error.message);
  return true;
};

export default {
  getAdminDirectoryOptions,
  getAdminExecutiveOverview,
  getAdminOverview,
  getAdminUsers,
  getAdminUsersList,
  getAdminStores,
  getAdminStoresList,
  getAdminSchedules,
  getAdminSchedulesList,
  getAdminFlows,
  getAdminFlowsList,
  getAdminUploads,
  getAdminUploadsList,
  getAdminActivity,
  getAdminActivityList,
  getAdminMembershipsList,
  getAdminStoreDetails,
  getAdminUserDetails,
  updateAdminUserProfile,
  updateAdminPlatformRole,
  upsertAdminStoreMembership,
  removeAdminStoreMembership,
};
