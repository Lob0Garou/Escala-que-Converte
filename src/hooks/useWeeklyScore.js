import { useMemo } from 'react';
import { computeWeeklyScheduleScoreSummary } from '../lib/weeklyScore';

export const useWeeklyScore = ({
  cuponsData = [],
  salesData = [],
  staffRows = [],
  baselineStaffRows = null,
  diasSemana,
  referenceDate = null,
  mirrorCurrentAsBaseline = false,
} = {}) =>
  useMemo(
    () =>
      computeWeeklyScheduleScoreSummary({
        cuponsData,
        salesData,
        staffRows,
        baselineStaffRows,
        diasSemana,
        referenceDate,
        mirrorCurrentAsBaseline,
      }),
    [baselineStaffRows, cuponsData, diasSemana, mirrorCurrentAsBaseline, referenceDate, salesData, staffRows],
  );

export default useWeeklyScore;
