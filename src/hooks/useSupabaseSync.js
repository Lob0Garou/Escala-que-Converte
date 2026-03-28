import { supabase } from '../lib/supabase';
import { normalizeDayName } from '../lib/dayUtils';

const DAY_TO_DB = {
  SEGUNDA: 'SEGUNDA',
  ['TER\u00c7A']: 'TERCA',
  QUARTA: 'QUARTA',
  QUINTA: 'QUINTA',
  SEXTA: 'SEXTA',
  ['S\u00c1BADO']: 'SABADO',
  DOMINGO: 'DOMINGO',
};

const DAY_FROM_DB = {
  SEGUNDA: 'SEGUNDA',
  TERCA: 'TER\u00c7A',
  QUARTA: 'QUARTA',
  QUINTA: 'QUINTA',
  SEXTA: 'SEXTA',
  SABADO: 'S\u00c1BADO',
  DOMINGO: 'DOMINGO',
};

export const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
};

export const dbRowToStaffRow = (row) => ({
  id: row.id,
  dia: normalizeDayName(DAY_FROM_DB[row.day_of_week] || row.day_of_week),
  nome: row.employee_name || '',
  entrada: row.entrada ? row.entrada.slice(0, 5) : '',
  intervalo: row.intervalo ? row.intervalo.slice(0, 5) : '',
  saida: row.saida ? row.saida.slice(0, 5) : '',
  saidaDiaSeguinte: row.saida_dia_seguinte || false,
});

const staffRowToDbJson = (row, index) => ({
  employee_name: row.nome || '',
  day_of_week: DAY_TO_DB[normalizeDayName(row.dia)] || normalizeDayName(row.dia),
  entrada: row.entrada || null,
  intervalo: row.intervalo || null,
  saida: row.saida || null,
  saida_dia_seguinte: row.saidaDiaSeguinte || false,
  is_optimized: false,
  sort_order: index,
});

export const getOrCreateScheduleWeek = async (storeId) => {
  if (!supabase || !storeId) return null;
  const weekStart = getWeekStart();

  console.log('[sync] getOrCreateScheduleWeek ->', storeId, weekStart);

  const { data, error } = await supabase.rpc('get_or_create_schedule_week', {
    p_store_id: storeId,
    p_week_start: weekStart,
  });

  if (error) {
    console.error('[sync] get_or_create_schedule_week ERRO:', error.message);
    return null;
  }

  console.log('[sync] semana ativa:', data?.id);
  return data;
};

export const loadShifts = async (scheduleWeekId) => {
  if (!supabase || !scheduleWeekId) return [];

  const { data, error } = await supabase
    .from('schedule_shifts')
    .select('*')
    .eq('schedule_week_id', scheduleWeekId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[sync] loadShifts ERRO:', error.message);
    return [];
  }

  const rows = (data || []).map(dbRowToStaffRow);
  console.log('[sync] loadShifts ->', rows.length, 'shifts carregados');
  return rows;
};

export const saveShiftsBatch = async (scheduleWeekId, storeId, staffRows) => {
  if (!supabase || !scheduleWeekId || !storeId) {
    console.warn('[sync] saveShiftsBatch ignorado: sem weekId/storeId', { scheduleWeekId, storeId });
    return;
  }

  const validRows = staffRows.filter((row) => row.dia);
  if (validRows.length === 0) {
    console.warn('[sync] saveShiftsBatch: nenhuma row valida');
    return;
  }

  const shiftsJson = validRows.map(staffRowToDbJson);
  console.log('[sync] saveShiftsBatch ->', shiftsJson.length, 'shifts | dias:', [...new Set(shiftsJson.map((row) => row.day_of_week))]);

  const { error } = await supabase.rpc('save_shifts_batch', {
    p_schedule_week_id: scheduleWeekId,
    p_store_id: storeId,
    p_shifts: shiftsJson,
  });

  if (error) {
    console.error('[sync] saveShiftsBatch ERRO:', error.message);
  } else {
    console.log('[sync] saveShiftsBatch OK');
  }
};

export const updateWeekSnapshot = async (scheduleWeekId, storeId, { cuponsData, salesData } = {}) => {
  if (!supabase || !scheduleWeekId || !storeId) {
    console.warn('[sync] updateWeekSnapshot ignorado: sem weekId/storeId');
    return;
  }

  const label = cuponsData ? `cupons(${cuponsData.length})` : `sales(${salesData?.length})`;
  console.log('[sync] updateWeekSnapshot ->', label);

  const { error } = await supabase.rpc('update_week_snapshot', {
    p_schedule_week_id: scheduleWeekId,
    p_store_id: storeId,
    p_cupons_snapshot: cuponsData !== undefined ? cuponsData : null,
    p_sales_snapshot: salesData !== undefined ? salesData : null,
  });

  if (error) {
    console.error('[sync] updateWeekSnapshot ERRO:', error.message);
  } else {
    console.log('[sync] updateWeekSnapshot OK');
  }
};

export const loadWeekSnapshot = async (scheduleWeekId) => {
  if (!supabase || !scheduleWeekId) return { cuponsData: [], salesData: [], validatedAt: null };

  const { data, error } = await supabase
    .from('schedule_weeks')
    .select('cupons_snapshot, sales_snapshot, validated_at')
    .eq('id', scheduleWeekId)
    .single();

  if (error) {
    console.error('[sync] loadWeekSnapshot ERRO:', error.message);
    return { cuponsData: [], salesData: [], validatedAt: null };
  }

  const cuponsData = data?.cupons_snapshot || [];
  const salesData = data?.sales_snapshot || [];
  const validatedAt = data?.validated_at || null;
  console.log('[sync] loadWeekSnapshot -> cupons:', cuponsData.length, '| sales:', salesData.length, '| validated:', validatedAt);
  return { cuponsData, salesData, validatedAt };
};

export const validateScheduleWeek = async (scheduleWeekId, storeId, staffRows) => {
  if (!supabase || !scheduleWeekId || !storeId) {
    console.warn('[sync] validateScheduleWeek ignorado: sem weekId/storeId');
    return;
  }

  await saveShiftsBatch(scheduleWeekId, storeId, staffRows);

  const validRows = staffRows.filter((row) => row.dia);
  const shiftsJson = validRows.map(staffRowToDbJson);

  console.log('[sync] validateScheduleWeek ->', shiftsJson.length, 'shifts');

  const { error } = await supabase.rpc('validate_schedule_week', {
    p_schedule_week_id: scheduleWeekId,
    p_store_id: storeId,
    p_validated_shifts: shiftsJson,
  });

  if (error) {
    console.error('[sync] validateScheduleWeek ERRO:', error.message);
  } else {
    console.log('[sync] validateScheduleWeek OK');
  }
};
