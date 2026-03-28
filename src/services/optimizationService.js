import { supabase } from '../lib/supabase';

const isReady = () => Boolean(supabase);

const normalizeNumeric = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveRevenueDelta = (revenueMetrics) =>
  normalizeNumeric(
    revenueMetrics?.totalRevenueRecovered ?? revenueMetrics?.deltaRevenue ?? revenueMetrics ?? null,
  );

export const upsertOptimizationSnapshot = async ({
  storeId,
  scheduleWeekId,
  currentScore = null,
  targetScore = null,
  weeklyPotentialGainTotal = null,
  baselineScore = null,
  revenueMetrics = null,
  staffRows = [],
} = {}) => {
  if (!isReady() || !storeId || !scheduleWeekId) return null;

  const normalizedCurrentScore =
    normalizeNumeric(currentScore) ?? normalizeNumeric(baselineScore) ?? null;
  const normalizedTargetScore =
    normalizeNumeric(targetScore) ?? normalizeNumeric(currentScore) ?? normalizeNumeric(baselineScore) ?? null;

  if (normalizedCurrentScore === null && normalizedTargetScore === null) {
    return null;
  }

  const { data: existing, error: selectError } = await supabase
    .from('optimization_results')
    .select('id, score_before')
    .eq('schedule_week_id', scheduleWeekId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  const payload = {
    store_id: storeId,
    schedule_week_id: scheduleWeekId,
    engine_version: 'v5',
    score_before: normalizeNumeric(existing?.score_before) ?? normalizedCurrentScore ?? normalizedTargetScore,
    score_after: normalizedTargetScore ?? normalizedCurrentScore,
    delta_revenue:
      normalizeNumeric(weeklyPotentialGainTotal) ?? resolveRevenueDelta(revenueMetrics),
    shifts_snapshot: Array.isArray(staffRows) ? staffRows : [],
    status: 'done',
  };

  if (existing?.id) {
    const { error } = await supabase.from('optimization_results').update(payload).eq('id', existing.id);
    if (error) throw new Error(error.message);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('optimization_results')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data?.id || null;
};

export default {
  upsertOptimizationSnapshot,
};
