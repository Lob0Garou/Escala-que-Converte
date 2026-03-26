/**
 * useSupabaseSync.js
 * Utilitários de sincronização entre estado client-side e Supabase.
 * Todas as operações são "fire-and-forget" com logging visível —
 * falhas no DB nunca bloqueiam a UI.
 */

import { supabase } from '../lib/supabase';
import { FLAGS } from '../lib/featureFlags';

// ─── Normalização de nomes de dias ───────────────────────────────────────────
// O app usa 'TERÇA' e 'SÁBADO' (com acento/cedilha).
// O ENUM do banco usa 'TERCA' e 'SABADO' (sem acento).
// Convertemos nos dois sentidos.

const DAY_TO_DB = {
  'TERÇA':   'TERCA',
  'SÁBADO':  'SABADO',
  'SEGUNDA': 'SEGUNDA',
  'QUARTA':  'QUARTA',
  'QUINTA':  'QUINTA',
  'SEXTA':   'SEXTA',
  'DOMINGO': 'DOMINGO',
  // Aliases já normalizados (proteção dupla)
  'TERCA':   'TERCA',
  'SABADO':  'SABADO',
};

const DAY_FROM_DB = {
  'TERCA':   'TERÇA',
  'SABADO':  'SÁBADO',
  'SEGUNDA': 'SEGUNDA',
  'QUARTA':  'QUARTA',
  'QUINTA':  'QUINTA',
  'SEXTA':   'SEXTA',
  'DOMINGO': 'DOMINGO',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Retorna a segunda-feira da semana atual no formato YYYY-MM-DD.
 */
export const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay(); // 0 = Dom, 1 = Seg …
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
};

/**
 * dbRowToStaffRow — Converte linha do banco para o formato client staffRow.
 * - Postgres TIME retorna 'HH:MM:SS' → truncamos para 'HH:MM'
 * - day_of_week ENUM → dia com acento/cedilha (padrão do app)
 */
export const dbRowToStaffRow = (row) => ({
  id:              row.id,
  dia:             DAY_FROM_DB[row.day_of_week] || row.day_of_week,
  nome:            row.employee_name || '',
  entrada:         row.entrada   ? row.entrada.slice(0, 5)   : '',
  intervalo:       row.intervalo ? row.intervalo.slice(0, 5) : '',
  saida:           row.saida     ? row.saida.slice(0, 5)     : '',
  saidaDiaSeguinte: row.saida_dia_seguinte || false,
});

/**
 * staffRowToDbJson — Converte staffRow para o JSONB que o RPC save_shifts_batch espera.
 * - dia com acento → enum sem acento
 */
const staffRowToDbJson = (row, index) => ({
  employee_name:      row.nome || '',
  day_of_week:        DAY_TO_DB[row.dia] || row.dia,
  entrada:            row.entrada   || null,
  intervalo:          row.intervalo || null,
  saida:              row.saida     || null,
  saida_dia_seguinte: row.saidaDiaSeguinte || false,
  is_optimized:       false,
  sort_order:         index,
});

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * getOrCreateScheduleWeek
 * Busca ou cria a semana ativa via RPC SECURITY DEFINER.
 * Retorna o objeto da semana ou null em caso de erro.
 */
export const getOrCreateScheduleWeek = async (storeId) => {
  if (!supabase || !storeId) return null;
  const weekStart = getWeekStart();

  console.log('[sync] getOrCreateScheduleWeek →', storeId, weekStart);

  const { data, error } = await supabase.rpc('get_or_create_schedule_week', {
    p_store_id:   storeId,
    p_week_start: weekStart,
  });

  if (error) {
    console.error('[sync] get_or_create_schedule_week ERRO:', error.message);
    return null;
  }

  // A RPC agora retorna JSONB diretamente (não array)
  console.log('[sync] semana ativa:', data?.id);
  return data;
};

/**
 * loadShifts — Busca os schedule_shifts da semana e retorna como staffRows.
 */
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
  console.log('[sync] loadShifts →', rows.length, 'shifts carregados');
  return rows;
};

/**
 * saveShiftsBatch — Substitui todos os shifts da semana via RPC atômica.
 */
export const saveShiftsBatch = async (scheduleWeekId, storeId, staffRows) => {
  if (!supabase || !scheduleWeekId || !storeId) {
    console.warn('[sync] saveShiftsBatch ignorado: sem weekId/storeId', { scheduleWeekId, storeId });
    return;
  }
  if (!FLAGS.PERSIST_TO_SUPABASE) { console.warn('[sync] PERSIST_TO_SUPABASE=false'); return; }

  const validRows = staffRows.filter((r) => r.dia);
  if (validRows.length === 0) { console.warn('[sync] saveShiftsBatch: nenhuma row válida'); return; }

  const shiftsJson = validRows.map(staffRowToDbJson);
  console.log('[sync] saveShiftsBatch →', shiftsJson.length, 'shifts | dias:', [...new Set(shiftsJson.map(r => r.day_of_week))]);

  const { error } = await supabase.rpc('save_shifts_batch', {
    p_schedule_week_id: scheduleWeekId,
    p_store_id:         storeId,
    p_shifts:           shiftsJson,
  });

  if (error) {
    console.error('[sync] saveShiftsBatch ERRO:', error.message);
  } else {
    console.log('[sync] ✅ saveShiftsBatch OK');
  }
};

/**
 * updateWeekSnapshot — Persiste cuponsData e/ou salesData como JSONB.
 */
export const updateWeekSnapshot = async (scheduleWeekId, storeId, { cuponsData, salesData } = {}) => {
  if (!supabase || !scheduleWeekId || !storeId) {
    console.warn('[sync] updateWeekSnapshot ignorado: sem weekId/storeId');
    return;
  }
  if (!FLAGS.PERSIST_TO_SUPABASE) return;

  const label = cuponsData ? `cupons(${cuponsData.length})` : `sales(${salesData?.length})`;
  console.log('[sync] updateWeekSnapshot →', label);

  const { error } = await supabase.rpc('update_week_snapshot', {
    p_schedule_week_id: scheduleWeekId,
    p_store_id:         storeId,
    p_cupons_snapshot:  cuponsData !== undefined ? cuponsData : null,
    p_sales_snapshot:   salesData  !== undefined ? salesData  : null,
  });

  if (error) {
    console.error('[sync] updateWeekSnapshot ERRO:', error.message);
  } else {
    console.log('[sync] ✅ updateWeekSnapshot OK');
  }
};

/**
 * loadWeekSnapshot — Busca cuponsData e salesData da semana.
 */
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

  const cuponsData  = data?.cupons_snapshot || [];
  const salesData   = data?.sales_snapshot  || [];
  const validatedAt = data?.validated_at    || null;
  console.log('[sync] loadWeekSnapshot → cupons:', cuponsData.length, '| sales:', salesData.length, '| validated:', validatedAt);
  return { cuponsData, salesData, validatedAt };
};

/**
 * validateScheduleWeek — Carimbam a semana como validada.
 * Salva os shifts como draft e registra validated_at + validated_shifts.
 */
export const validateScheduleWeek = async (scheduleWeekId, storeId, staffRows) => {
  if (!supabase || !scheduleWeekId || !storeId) {
    console.warn('[sync] validateScheduleWeek ignorado: sem weekId/storeId');
    return;
  }
  if (!FLAGS.PERSIST_TO_SUPABASE) { console.warn('[sync] PERSIST_TO_SUPABASE=false'); return; }

  // Garante que o draft está atualizado antes de carimbar
  await saveShiftsBatch(scheduleWeekId, storeId, staffRows);

  const validRows  = staffRows.filter((r) => r.dia);
  const shiftsJson = validRows.map(staffRowToDbJson);

  console.log('[sync] validateScheduleWeek →', shiftsJson.length, 'shifts');

  const { error } = await supabase.rpc('validate_schedule_week', {
    p_schedule_week_id: scheduleWeekId,
    p_store_id:         storeId,
    p_validated_shifts: shiftsJson,
  });

  if (error) {
    console.error('[sync] validateScheduleWeek ERRO:', error.message);
  } else {
    console.log('[sync] ✅ validateScheduleWeek OK');
  }
};
