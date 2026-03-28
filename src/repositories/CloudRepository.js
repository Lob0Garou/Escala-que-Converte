import apiClient from '../lib/apiClient';

const EMPTY_ANALYSIS = {
  scheduleWeekId: null,
  weekStart: null,
  staffRows: [],
  cuponsData: [],
  salesData: [],
  validatedAt: null,
};

export const CloudRepository = {
  async getAnalysisData(storeId) {
    if (!storeId) return { ...EMPTY_ANALYSIS };

    const response = await apiClient.get(`/api/stores/${storeId}/analysis-data`);
    const payload = response?.data || response;

    return {
      scheduleWeekId: payload?.scheduleWeek?.id || null,
      weekStart: payload?.scheduleWeek?.weekStart || null,
      staffRows: payload?.staffRows || [],
      cuponsData: payload?.cuponsData || [],
      salesData: payload?.salesData || [],
      validatedAt: payload?.validatedAt || payload?.scheduleWeek?.validatedAt || null,
    };
  },

  async saveSchedule(storeId, scheduleWeekId, staffRows) {
    if (!storeId || !scheduleWeekId) {
      return {
        scheduleWeekId: scheduleWeekId || null,
        validatedAt: null,
      };
    }

    const response = await apiClient.put(`/api/stores/${storeId}/schedules`, {
      scheduleWeekId,
      staffRows,
      validate: false,
    });
    const payload = response?.data || response;

    return {
      scheduleWeekId: payload?.scheduleWeekId || scheduleWeekId,
      validatedAt: payload?.validatedAt || null,
    };
  },

  async validateSchedule(storeId, scheduleWeekId, staffRows) {
    if (!storeId || !scheduleWeekId) {
      return {
        scheduleWeekId: scheduleWeekId || null,
        validatedAt: null,
      };
    }

    const response = await apiClient.put(`/api/stores/${storeId}/schedules`, {
      scheduleWeekId,
      staffRows,
      validate: true,
    });
    const payload = response?.data || response;

    return {
      scheduleWeekId: payload?.scheduleWeekId || scheduleWeekId,
      validatedAt: payload?.validatedAt || null,
    };
  },

  async saveWeekSnapshot(storeId, scheduleWeekId, snapshot) {
    if (!storeId || !scheduleWeekId) {
      return {
        scheduleWeekId: scheduleWeekId || null,
      };
    }

    const response = await apiClient.put(`/api/stores/${storeId}/week-snapshot`, {
      scheduleWeekId,
      ...snapshot,
    });
    const payload = response?.data || response;

    return {
      scheduleWeekId: payload?.scheduleWeekId || scheduleWeekId,
    };
  },
};

export default CloudRepository;
