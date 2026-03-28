import { Router } from 'express';
import { z } from 'zod';
import { logActivity } from '../lib/activity.js';
import { asyncHandler, ApiError, sendSuccess } from '../lib/errors.js';
import { dbRowToStaffRow, staffRowToDbJson } from '../lib/staffRows.js';
import { resolveWeekStart } from '../lib/week.js';
import { requireAuth } from '../middleware/auth.js';
import { requireStoreWriteAccess } from '../middleware/roles.js';
import { requireStoreAccess } from '../middleware/storeAccess.js';

const router = Router();

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const storeParamsSchema = z.object({
  storeId: uuidSchema,
});
const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .optional()
  .nullable();

const staffRowSchema = z.object({
  id: uuidSchema.optional(),
  dia: z.string().min(1),
  nome: z.string().optional().default(''),
  entrada: timeSchema,
  intervalo: timeSchema,
  saida: timeSchema,
  saidaDiaSeguinte: z.boolean().optional().default(false),
});

const scheduleBodySchema = z
  .object({
    scheduleWeekId: uuidSchema.optional(),
    weekStart: dateSchema.optional(),
    staffRows: z.array(staffRowSchema).min(1),
    validate: z.boolean().optional().default(false),
  })
  .refine((value) => value.scheduleWeekId || value.weekStart, {
    message: 'Envie scheduleWeekId ou weekStart.',
    path: ['scheduleWeekId'],
  });

const snapshotBodySchema = z
  .object({
    scheduleWeekId: uuidSchema.optional(),
    weekStart: dateSchema.optional(),
    cuponsData: z.array(z.unknown()).optional(),
    salesData: z.array(z.unknown()).optional(),
  })
  .refine((value) => value.scheduleWeekId || value.weekStart, {
    message: 'Envie scheduleWeekId ou weekStart.',
    path: ['scheduleWeekId'],
  })
  .refine((value) => value.cuponsData !== undefined || value.salesData !== undefined, {
    message: 'Envie cuponsData e/ou salesData.',
    path: ['cuponsData'],
  });

const getOrCreateScheduleWeek = async (
  supabase: Express.Request['supabase'],
  storeId: string,
  weekStart?: string,
) => {
  const resolvedWeekStart = resolveWeekStart(weekStart);
  const { data, error } = await supabase.rpc('get_or_create_schedule_week', {
    p_store_id: storeId,
    p_week_start: resolvedWeekStart,
  });

  if (error) {
    throw new ApiError(500, 'Falha ao resolver a semana ativa.', error.message, 'schedule_week_resolve_failed');
  }

  if (!data?.id) {
    throw new ApiError(
      500,
      'A RPC get_or_create_schedule_week nao retornou um id valido.',
      undefined,
      'schedule_week_invalid',
    );
  }

  return {
    weekId: data.id as string,
    weekStart: (data.week_start as string | undefined) || resolvedWeekStart,
  };
};

const loadWeekContext = async (supabase: Express.Request['supabase'], scheduleWeekId: string) => {
  const [{ data: shifts, error: shiftsError }, { data: week, error: weekError }] = await Promise.all([
    supabase
      .from('schedule_shifts')
      .select('id, employee_name, day_of_week, entrada, intervalo, saida, saida_dia_seguinte')
      .eq('schedule_week_id', scheduleWeekId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('schedule_weeks')
      .select(
        'id, store_id, week_start, status, source, cupons_snapshot, sales_snapshot, validated_at, validated_shifts',
      )
      .eq('id', scheduleWeekId)
      .single(),
  ]);

  if (shiftsError) {
    throw new ApiError(500, 'Falha ao carregar shifts.', shiftsError.message, 'schedule_shifts_load_failed');
  }

  if (weekError || !week) {
    throw new ApiError(500, 'Falha ao carregar a semana.', weekError?.message, 'schedule_week_load_failed');
  }

  return {
    shifts: (shifts || []).map(dbRowToStaffRow),
    week,
  };
};

router.use(requireAuth);

router.get(
  '/:storeId/analysis-data',
  requireStoreAccess,
  asyncHandler(async (req, res) => {
    const { storeId } = storeParamsSchema.parse(req.params);
    const query = z
      .object({
        weekStart: z.union([dateSchema, z.array(dateSchema)]).optional(),
      })
      .parse(req.query);
    const requestedWeekStart =
      typeof query.weekStart === 'string' ? query.weekStart : query.weekStart?.[0];

    const { weekId, weekStart } = await getOrCreateScheduleWeek(
      req.supabase,
      storeId,
      requestedWeekStart,
    );
    const [{ shifts, week }, { data: store, error: storeError }] = await Promise.all([
      loadWeekContext(req.supabase, weekId),
      req.supabase
        .from('stores')
        .select('id, name, brand, timezone, open_hour, close_hour')
        .eq('id', storeId)
        .single(),
    ]);

    if (storeError || !store) {
      throw new ApiError(500, 'Falha ao carregar os dados da loja.', storeError?.message, 'store_load_failed');
    }

    await logActivity(req, {
      action: 'analysis_data_read',
      entityType: 'schedule_week',
      entityId: week.id,
      storeId,
      metadata: {
        weekStart: week.week_start || weekStart,
        staffRows: shifts.length,
        cuponsRows: Array.isArray(week.cupons_snapshot) ? week.cupons_snapshot.length : 0,
        salesRows: Array.isArray(week.sales_snapshot) ? week.sales_snapshot.length : 0,
      },
    });

    return sendSuccess(req, res, {
      store,
      scheduleWeek: {
        id: week.id,
        storeId: week.store_id,
        weekStart: week.week_start || weekStart,
        status: week.status,
        source: week.source,
        validatedAt: week.validated_at,
      },
      staffRows: shifts,
      cuponsData: week.cupons_snapshot || [],
      salesData: week.sales_snapshot || [],
      validatedAt: week.validated_at,
      validatedShifts: week.validated_shifts || [],
    });
  }),
);

router.put(
  '/:storeId/schedules',
  requireStoreAccess,
  requireStoreWriteAccess,
  asyncHandler(async (req, res) => {
    const { storeId } = storeParamsSchema.parse(req.params);
    const body = scheduleBodySchema.parse(req.body);

    const { weekId, weekStart } = body.scheduleWeekId
      ? { weekId: body.scheduleWeekId, weekStart: body.weekStart ?? null }
      : await getOrCreateScheduleWeek(req.supabase, storeId, body.weekStart);

    const shiftsPayload = body.staffRows.map(staffRowToDbJson);

    const { error: saveError } = await req.supabase.rpc('save_shifts_batch', {
      p_schedule_week_id: weekId,
      p_store_id: storeId,
      p_shifts: shiftsPayload,
      p_request_id: req.requestContext.requestId,
    });

    if (saveError) {
      throw new ApiError(500, 'Falha ao salvar a escala.', saveError.message, 'schedule_save_failed');
    }

    let validatedAt: string | null = null;

    if (body.validate) {
      const { error: validateError } = await req.supabase.rpc('validate_schedule_week', {
        p_schedule_week_id: weekId,
        p_store_id: storeId,
        p_validated_shifts: shiftsPayload,
        p_request_id: req.requestContext.requestId,
      });

      if (validateError) {
        throw new ApiError(
          500,
          'Falha ao validar a semana.',
          validateError.message,
          'schedule_validate_failed',
        );
      }

      const { data: week, error: weekError } = await req.supabase
        .from('schedule_weeks')
        .select('validated_at')
        .eq('id', weekId)
        .single();

      if (weekError) {
        throw new ApiError(
          500,
          'Falha ao ler o carimbo de validacao.',
          weekError.message,
          'schedule_validation_read_failed',
        );
      }

      validatedAt = week.validated_at;
    }

    return sendSuccess(req, res, {
      scheduleWeekId: weekId,
      weekStart,
      savedCount: shiftsPayload.length,
      validatedAt,
    });
  }),
);

router.put(
  '/:storeId/week-snapshot',
  requireStoreAccess,
  requireStoreWriteAccess,
  asyncHandler(async (req, res) => {
    const { storeId } = storeParamsSchema.parse(req.params);
    const body = snapshotBodySchema.parse(req.body);

    const { weekId, weekStart } = body.scheduleWeekId
      ? { weekId: body.scheduleWeekId, weekStart: body.weekStart ?? null }
      : await getOrCreateScheduleWeek(req.supabase, storeId, body.weekStart);

    const { error } = await req.supabase.rpc('update_week_snapshot', {
      p_schedule_week_id: weekId,
      p_store_id: storeId,
      p_cupons_snapshot: body.cuponsData ?? null,
      p_sales_snapshot: body.salesData ?? null,
      p_request_id: req.requestContext.requestId,
    });

    if (error) {
      throw new ApiError(
        500,
        'Falha ao atualizar snapshots da semana.',
        error.message,
        'week_snapshot_save_failed',
      );
    }

    return sendSuccess(req, res, {
      scheduleWeekId: weekId,
      weekStart,
      cuponsCount: body.cuponsData?.length ?? null,
      salesCount: body.salesData?.length ?? null,
    });
  }),
);

export default router;
