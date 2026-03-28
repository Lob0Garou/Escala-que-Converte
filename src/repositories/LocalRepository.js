import {
  getOrCreateScheduleWeek,
  loadShifts,
  loadWeekSnapshot,
  saveShiftsBatch,
  updateWeekSnapshot,
  validateScheduleWeek,
} from '../hooks/useSupabaseSync';

const EMPTY_ANALYSIS = {
  scheduleWeekId: null,
  weekStart: null,
  staffRows: [],
  cuponsData: [],
  salesData: [],
  validatedAt: null,
};

export const LocalRepository = {
  async getAnalysisData(storeId) {
    if (!storeId) return { ...EMPTY_ANALYSIS };

    const week = await getOrCreateScheduleWeek(storeId);
    if (!week?.id) {
      return { ...EMPTY_ANALYSIS };
    }

    const [staffRows, snapshot] = await Promise.all([
      loadShifts(week.id),
      loadWeekSnapshot(week.id),
    ]);

    return {
      scheduleWeekId: week.id,
      weekStart: week.week_start || null,
      staffRows,
      cuponsData: snapshot.cuponsData || [],
      salesData: snapshot.salesData || [],
      validatedAt: snapshot.validatedAt || null,
    };
  },

  async saveSchedule(storeId, scheduleWeekId, staffRows) {
    await saveShiftsBatch(scheduleWeekId, storeId, staffRows);

    return {
      scheduleWeekId,
      validatedAt: null,
    };
  },

  async validateSchedule(storeId, scheduleWeekId, staffRows) {
    await validateScheduleWeek(scheduleWeekId, storeId, staffRows);

    return {
      scheduleWeekId,
      validatedAt: new Date().toISOString(),
    };
  },

  async saveWeekSnapshot(storeId, scheduleWeekId, snapshot) {
    await updateWeekSnapshot(scheduleWeekId, storeId, snapshot);

    return {
      scheduleWeekId,
    };
  },
};

export default LocalRepository;
