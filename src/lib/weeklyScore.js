import { countWeekdaysInMonth } from './dateUtils.js';
import { ORDERED_WEEK_DAYS, WEEK_DAY_TO_EXCEL, isSameDayName, normalizeDayName } from './dayUtils.js';
import { parseFluxValue, parseNumber } from './parsers.js';
import { calculateRevenueImpact } from './revenueEngine.js';
import { calculateStaffByHour } from './staffUtils.js';
import { computeThermalMetrics } from './thermalBalance_v5.js';

const EXCLUDED_SCORE_HOURS = new Set([22]);

const averageNumbers = (values) => {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) return null;

  const total = validValues.reduce((sum, value) => sum + value, 0);
  return Number((total / validValues.length).toFixed(1));
};

const hasVisibleScheduleRow = (row) =>
  Boolean(row?.entrada) && Boolean(String(row?.nome || '').trim());

const toReferenceDate = (referenceDate) => {
  if (!referenceDate) return new Date();
  if (referenceDate instanceof Date) return new Date(referenceDate);

  const parsedDate = String(referenceDate).includes('T')
    ? new Date(referenceDate)
    : new Date(`${referenceDate}T00:00:00`);

  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
};

const trimTime = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.slice(0, 5);
};

const buildWeekdayCounts = (referenceDate) => {
  const reference = toReferenceDate(referenceDate);
  const counts = ORDERED_WEEK_DAYS.map((dayName) =>
    Math.max(1, countWeekdaysInMonth(reference.getFullYear(), reference.getMonth(), dayName)),
  );

  return {
    counts,
    daysMap: ORDERED_WEEK_DAYS.reduce((accumulator, dayName, index) => {
      accumulator[dayName] = index;
      return accumulator;
    }, {}),
  };
};

export const mapScheduleShiftToStaffRow = (shiftRow, index = 0) => ({
  id:
    shiftRow.id ||
    `${shiftRow.schedule_week_id || 'week'}-${shiftRow.employee_name || 'func'}-${shiftRow.day_of_week || 'day'}-${index}`,
  dia: normalizeDayName(shiftRow.day_of_week),
  nome: shiftRow.employee_name || '',
  entrada: trimTime(shiftRow.entrada),
  intervalo: trimTime(shiftRow.intervalo),
  saida: trimTime(shiftRow.saida),
  saidaDiaSeguinte: Boolean(shiftRow.saida_dia_seguinte),
});

export const buildDailyScoreInput = ({
  cuponsData = [],
  staffRows = [],
  dayName,
  diasSemana = WEEK_DAY_TO_EXCEL,
  referenceDate = null,
} = {}) => {
  const normalizedDay = normalizeDayName(dayName);
  const excelDayName = diasSemana?.[normalizedDay] || diasSemana?.[dayName];

  if (!excelDayName) {
    return {
      day: normalizedDay,
      hourlyData: [],
      flowHours: 0,
      weekdayCount: 1,
    };
  }

  const reference = toReferenceDate(referenceDate);
  const weekdayCount = Math.max(
    1,
    countWeekdaysInMonth(reference.getFullYear(), reference.getMonth(), normalizedDay),
  );

  const rawDayRows = cuponsData.filter(
    (row) =>
      row['Dia da Semana'] === excelDayName &&
      row['cod_hora_entrada'] !== 'Total' &&
      !Number.isNaN(parseInt(row['cod_hora_entrada'], 10)),
  );

  if (!rawDayRows.length) {
    return {
      day: normalizedDay,
      hourlyData: [],
      flowHours: 0,
      weekdayCount,
    };
  }

  const operatingHours = rawDayRows
    .map((row) => parseInt(row['cod_hora_entrada'], 10))
    .filter((hour) => Number.isFinite(hour))
    .sort((left, right) => left - right);

  if (!operatingHours.length) {
    return {
      day: normalizedDay,
      hourlyData: [],
      flowHours: 0,
      weekdayCount,
    };
  }

  const daySchedule = staffRows.filter(
    (row) => isSameDayName(row.dia, normalizedDay) && hasVisibleScheduleRow(row),
  );
  const minHour = operatingHours[0];
  const maxHour = operatingHours[operatingHours.length - 1];
  const staffPerHour = calculateStaffByHour(daySchedule, minHour, maxHour);

  const hourlyData = rawDayRows
    .map((row) => {
      const hour = parseInt(row['cod_hora_entrada'], 10);
      if (!Number.isFinite(hour) || EXCLUDED_SCORE_HOURS.has(hour)) return null;

      return {
        hour,
        flow: Math.round(parseFluxValue(row['qtd_entrante']) / weekdayCount),
        cupons: Math.round(parseNumber(row['qtd_cupom']) / weekdayCount),
        activeStaff: staffPerHour[hour] || 0,
      };
    })
    .filter(Boolean);

  return {
    day: normalizedDay,
    normalizedDay,
    excelDayName,
    rawDayRows,
    hourlyData,
    flowHours: hourlyData.length,
    weekdayCount,
    minHour,
    maxHour,
  };
};

export const computeDailyScheduleScore = ({
  cuponsData = [],
  staffRows = [],
  dayName,
  diasSemana = WEEK_DAY_TO_EXCEL,
  referenceDate = null,
} = {}) => {
  const dailyInput = buildDailyScoreInput({
    cuponsData,
    staffRows,
    dayName,
    diasSemana,
    referenceDate,
  });

  if (!dailyInput.hourlyData.length) {
    return {
      day: dailyInput.day,
      score: null,
      adherence: null,
      lostOpportunity: null,
      flowHours: 0,
    };
  }

  const metrics = computeThermalMetrics(dailyInput.hourlyData);

  return {
    day: dailyInput.day,
    score: metrics.score,
    adherence: metrics.adherence,
    lostOpportunity: metrics.lostOpportunity,
    flowHours: dailyInput.flowHours,
  };
};

export const computeDailyPotentialGain = ({
  cuponsData = [],
  salesData = [],
  staffRows = [],
  baselineStaffRows = null,
  dayName,
  diasSemana = WEEK_DAY_TO_EXCEL,
  referenceDate = null,
  mirrorCurrentAsBaseline = false,
} = {}) => {
  const dailyInput = buildDailyScoreInput({
    cuponsData,
    staffRows,
    dayName,
    diasSemana,
    referenceDate,
  });

  if (!dailyInput.rawDayRows?.length) {
    return {
      day: dailyInput.day,
      potentialGain: 0,
    };
  }

  const currentDayRows = staffRows.filter(
    (row) => isSameDayName(row.dia, dailyInput.normalizedDay) && hasVisibleScheduleRow(row),
  );
  const baselineSource =
    Array.isArray(baselineStaffRows) && baselineStaffRows.length > 0
      ? baselineStaffRows
      : mirrorCurrentAsBaseline
        ? staffRows
        : [];
  const baselineDayRows = baselineSource.filter(
    (row) => isSameDayName(row.dia, dailyInput.normalizedDay) && hasVisibleScheduleRow(row),
  );

  const flowData = dailyInput.rawDayRows.reduce((accumulator, row) => {
    const hour = parseInt(row['cod_hora_entrada'], 10);
    if (!Number.isFinite(hour)) return accumulator;

    accumulator[hour] = {
      entrantes: parseFluxValue(row['qtd_entrante']),
      cupons: parseNumber(row['qtd_cupom']),
    };
    return accumulator;
  }, {});

  const salesByHour = (salesData || []).reduce((accumulator, row) => {
    const matchesDay =
      !row.Dia_Semana ||
      normalizeDayName(row.Dia_Semana) === dailyInput.normalizedDay ||
      row.Dia_Semana === dailyInput.excelDayName;

    if (!matchesDay) return accumulator;

    const hour = parseInt(row.Hora, 10);
    if (!Number.isFinite(hour)) return accumulator;

    accumulator[hour] = (accumulator[hour] || 0) + (parseFloat(row.Valor_Venda) || 0);
    return accumulator;
  }, {});

  const baseCoverage = calculateStaffByHour(
    baselineDayRows,
    dailyInput.minHour,
    dailyInput.maxHour,
  );
  const currentCoverage = calculateStaffByHour(
    currentDayRows,
    dailyInput.minHour,
    dailyInput.maxHour,
  );

  const revenue = calculateRevenueImpact({
    baseCoverage,
    currentCoverage,
    flowData,
    salesData: salesByHour,
    dayKey: dailyInput.normalizedDay,
    mode: 'average',
    weekdayCounts: buildWeekdayCounts(referenceDate),
  });

  return {
    day: dailyInput.day,
    potentialGain: Number((revenue?.deltaRevenue || 0).toFixed(2)),
  };
};

export const computeWeeklyScheduleScoreSummary = ({
  cuponsData = [],
  salesData = [],
  staffRows = [],
  baselineStaffRows = null,
  diasSemana = WEEK_DAY_TO_EXCEL,
  referenceDate = null,
  mirrorCurrentAsBaseline = false,
} = {}) => {
  const reference = toReferenceDate(referenceDate);
  const hasBaseline = Array.isArray(baselineStaffRows) && baselineStaffRows.length > 0;

  const days = ORDERED_WEEK_DAYS.map((dayName) => {
    const currentDayRows = staffRows.filter(
      (row) => isSameDayName(row.dia, dayName) && hasVisibleScheduleRow(row),
    );
    const baselineDayRows = hasBaseline
      ? baselineStaffRows.filter(
          (row) => isSameDayName(row.dia, dayName) && hasVisibleScheduleRow(row),
        )
      : [];
    const hasCurrentSchedule = currentDayRows.length > 0;
    const hasBaselineSchedule = baselineDayRows.length > 0;
    const hasSchedule = hasCurrentSchedule || hasBaselineSchedule;

    const current = computeDailyScheduleScore({
      cuponsData,
      staffRows,
      dayName,
      diasSemana,
      referenceDate: reference,
    });

    const baseline = hasBaseline
      ? computeDailyScheduleScore({
          cuponsData,
          staffRows: baselineStaffRows,
          dayName,
          diasSemana,
          referenceDate: reference,
        })
      : null;

    const baselineScore = hasCurrentSchedule
      ? baseline?.score ?? (mirrorCurrentAsBaseline ? current.score ?? null : null)
      : null;
    const currentScore = hasCurrentSchedule ? current.score ?? null : null;
    const revenue = computeDailyPotentialGain({
      cuponsData,
      salesData,
      staffRows,
      baselineStaffRows,
      dayName,
      diasSemana,
      referenceDate: reference,
      mirrorCurrentAsBaseline,
    });

    return {
      day: dayName,
      baselineScore,
      currentScore,
      deltaScore:
        Number.isFinite(currentScore) && Number.isFinite(baselineScore)
          ? Number((currentScore - baselineScore).toFixed(1))
          : null,
      potentialGain: revenue.potentialGain,
      flowHours: Math.max(current.flowHours || 0, baseline?.flowHours || 0),
      hasData: Boolean((current.flowHours || 0) > 0 || (baseline?.flowHours || 0) > 0),
      hasCurrentSchedule,
      hasBaselineSchedule,
      hasSchedule,
      shouldCountInAverage:
        hasCurrentSchedule && Boolean((current.flowHours || 0) > 0 || (baseline?.flowHours || 0) > 0),
    };
  });

  const comparableDays = days.filter((day) => day.shouldCountInAverage);
  const baselineWeeklyScoreAvg = averageNumbers(comparableDays.map((day) => day.baselineScore));
  const visibleWeeklyScoreAvg = averageNumbers(comparableDays.map((day) => day.currentScore));
  const currentWeeklyScoreAvg = baselineWeeklyScoreAvg;
  const targetWeeklyScoreAvg = visibleWeeklyScoreAvg;
  const weeklyScoreGap =
    Number.isFinite(targetWeeklyScoreAvg) && Number.isFinite(currentWeeklyScoreAvg)
      ? Number((targetWeeklyScoreAvg - currentWeeklyScoreAvg).toFixed(1))
      : null;
  const visibleVsBaselineGap =
    Number.isFinite(visibleWeeklyScoreAvg) && Number.isFinite(baselineWeeklyScoreAvg)
      ? Number((visibleWeeklyScoreAvg - baselineWeeklyScoreAvg).toFixed(1))
      : null;
  const weeklyPotentialGainTotal = Number(
    comparableDays
      .reduce((sum, day) => sum + (Number.isFinite(day.potentialGain) ? day.potentialGain : 0), 0)
      .toFixed(2),
  );
  const daysCountConsidered = comparableDays.length;

  return {
    baselineWeeklyScoreAvg,
    visibleWeeklyScoreAvg,
    visibleVsBaselineGap,
    currentWeeklyScoreAvg,
    targetWeeklyScoreAvg,
    weeklyScoreGap,
    weeklyPotentialGainTotal,
    daysCountConsidered,
    baselineAverageScore: baselineWeeklyScoreAvg,
    currentAverageScore: visibleWeeklyScoreAvg,
    deltaScore: weeklyScoreGap,
    potentialGainTotal: weeklyPotentialGainTotal,
    evaluatedDays: daysCountConsidered,
    totalDays: ORDERED_WEEK_DAYS.length,
    baselineAvailable: hasBaseline,
    days,
    referenceMonth: reference.toISOString().slice(0, 7),
  };
};

export const buildWeeklyDisplaySummary = ({
  weeklyScoreSummary = null,
  staffRows = [],
} = {}) => {
  const sourceDays = Array.isArray(weeklyScoreSummary?.days) ? weeklyScoreSummary.days : [];

  const days = ORDERED_WEEK_DAYS.map((dayName) => {
    const sourceDay = sourceDays.find((day) => day.day === dayName) || { day: dayName };
    const hasCurrentSchedule = staffRows.some(
      (row) => isSameDayName(row.dia, dayName) && hasVisibleScheduleRow(row),
    );

    return {
      ...sourceDay,
      day: dayName,
      hasCurrentSchedule,
      hasSchedule: hasCurrentSchedule || Boolean(sourceDay.hasBaselineSchedule),
      currentScore: hasCurrentSchedule ? sourceDay.currentScore ?? null : null,
      baselineScore: hasCurrentSchedule ? sourceDay.baselineScore ?? null : null,
      potentialGain: hasCurrentSchedule ? sourceDay.potentialGain ?? 0 : 0,
      shouldCountInAverage: hasCurrentSchedule && Boolean(sourceDay.hasData),
    };
  });

  const comparableDays = days.filter((day) => day.shouldCountInAverage);
  const baselineWeeklyScoreAvg = averageNumbers(comparableDays.map((day) => day.baselineScore));
  const visibleWeeklyScoreAvg = averageNumbers(comparableDays.map((day) => day.currentScore));
  const visibleVsBaselineGap =
    Number.isFinite(visibleWeeklyScoreAvg) && Number.isFinite(baselineWeeklyScoreAvg)
      ? Number((visibleWeeklyScoreAvg - baselineWeeklyScoreAvg).toFixed(1))
      : null;
  const weeklyPotentialGainTotal = Number(
    comparableDays
      .reduce((sum, day) => sum + (Number.isFinite(day.potentialGain) ? day.potentialGain : 0), 0)
      .toFixed(2),
  );

  return {
    ...weeklyScoreSummary,
    baselineWeeklyScoreAvg,
    visibleWeeklyScoreAvg,
    visibleVsBaselineGap,
    currentWeeklyScoreAvg: baselineWeeklyScoreAvg,
    targetWeeklyScoreAvg: visibleWeeklyScoreAvg,
    weeklyScoreGap: visibleVsBaselineGap,
    weeklyPotentialGainTotal,
    daysCountConsidered: comparableDays.length,
    baselineAverageScore: baselineWeeklyScoreAvg,
    currentAverageScore: visibleWeeklyScoreAvg,
    deltaScore: visibleVsBaselineGap,
    potentialGainTotal: weeklyPotentialGainTotal,
    evaluatedDays: comparableDays.length,
    totalDays: ORDERED_WEEK_DAYS.length,
    days,
  };
};

export const applyWeeklyBaselineOverride = (
  weeklyScoreSummary = null,
  baselineScoreOverride = null,
) => {
  const normalizedBaseline = Number.isFinite(Number(baselineScoreOverride))
    ? Number(Number(baselineScoreOverride).toFixed(1))
    : null;

  if (!weeklyScoreSummary || normalizedBaseline === null) {
    return weeklyScoreSummary;
  }

  const visibleScore = weeklyScoreSummary.visibleWeeklyScoreAvg;
  const visibleVsBaselineGap =
    Number.isFinite(visibleScore)
      ? Number((visibleScore - normalizedBaseline).toFixed(1))
      : null;

  return {
    ...weeklyScoreSummary,
    baselineWeeklyScoreAvg: normalizedBaseline,
    currentWeeklyScoreAvg: normalizedBaseline,
    baselineAverageScore: normalizedBaseline,
    visibleVsBaselineGap,
    weeklyScoreGap: visibleVsBaselineGap,
    deltaScore: visibleVsBaselineGap,
  };
};

export default {
  mapScheduleShiftToStaffRow,
  buildDailyScoreInput,
  computeDailyScheduleScore,
  computeDailyPotentialGain,
  computeWeeklyScheduleScoreSummary,
  buildWeeklyDisplaySummary,
  applyWeeklyBaselineOverride,
};
