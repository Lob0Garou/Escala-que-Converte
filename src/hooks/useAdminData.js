import { useCallback, useEffect, useState } from 'react';
import adminService from '../services/adminService';

const EMPTY_OVERVIEW = Object.freeze({
  totalUsers: 0,
  totalStores: 0,
  totalSchedules: 0,
  totalFlows: 0,
  totalUploads: 0,
  activeUsersRecently: 0,
});
const EMPTY_EXECUTIVE_OVERVIEW = Object.freeze({
  kpis: {
    weeklyScoreAvg: null,
    weeklyScoreTargetAvg: null,
    weeklyScoreGap: null,
    weeklyPotentialGainTotal: 0,
    storesBelowTargetCount: 0,
    activeUsers7dCount: 0,
    storesWithoutRecentUseCount: 0,
  },
  topStores: [],
  bottomStores: [],
  criticalQueues: {
    storesBelowTarget: [],
    schedulesWithoutScore: [],
    storesWithoutRecentFlow: [],
    inactiveUsers: [],
    usersWithoutPrimaryStore: [],
  },
  recentActivity: [],
});

const EMPTY_LIST = Object.freeze([]);
const EMPTY_OPTIONS = Object.freeze({ users: [], stores: [] });
const EMPTY_PAGED = Object.freeze({
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
});
const EMPTY_STORE_DETAILS = Object.freeze({
  store: null,
  metrics: {
    totalUsers: 0,
    totalSchedules: 0,
    totalFlows: 0,
    totalUploads: 0,
    activeUsersRecently: 0,
  },
  users: [],
  schedules: [],
  flows: [],
  uploads: [],
  activity: [],
});
const EMPTY_USER_DETAILS = Object.freeze({
  user: null,
  metrics: {
    totalStores: 0,
    totalSchedules: 0,
    totalFlows: 0,
    totalUploads: 0,
    totalActivity: 0,
  },
  stores: [],
  schedules: [],
  flows: [],
  uploads: [],
  activity: [],
});

const useAsyncAdminData = (enabled, loader, initialValue) => {
  const [data, setData] = useState(initialValue);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return initialValue;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loader();
      setData(result);
      return result;
    } catch (loadError) {
      const message = loadError?.message || 'Falha ao carregar dados administrativos.';
      setError(message);
      setData(initialValue);
      return initialValue;
    } finally {
      setLoading(false);
    }
  }, [enabled, initialValue, loader]);

  useEffect(() => {
    let ignore = false;

    const run = async () => {
      if (!enabled) {
        setLoading(false);
        setError(null);
        setData(initialValue);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await loader();
        if (!ignore) {
          setData(result);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError?.message || 'Falha ao carregar dados administrativos.');
          setData(initialValue);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      ignore = true;
    };
  }, [enabled, initialValue, loader]);

  return { data, loading, error, refresh };
};

export const useAdminOverview = (enabled) =>
  useAsyncAdminData(enabled, adminService.getAdminOverview, EMPTY_OVERVIEW);

export const useAdminExecutiveOverview = (enabled, params) => {
  const loader = useCallback(
    () => adminService.getAdminExecutiveOverview(params),
    [params],
  );
  return useAsyncAdminData(enabled, loader, EMPTY_EXECUTIVE_OVERVIEW);
};

export const useAdminUsers = (enabled) =>
  useAsyncAdminData(enabled, adminService.getAdminUsers, EMPTY_LIST);

export const useAdminUsersList = (enabled, params) => {
  const loader = useCallback(() => adminService.getAdminUsersList(params), [params]);
  return useAsyncAdminData(enabled, loader, EMPTY_PAGED);
};

export const useAdminStores = (enabled) =>
  useAsyncAdminData(enabled, adminService.getAdminStores, EMPTY_LIST);

export const useAdminStoresList = (enabled, params) => {
  const loader = useCallback(() => adminService.getAdminStoresList(params), [params]);
  return useAsyncAdminData(enabled, loader, EMPTY_PAGED);
};

export const useAdminSchedules = (enabled) =>
  useAsyncAdminData(enabled, adminService.getAdminSchedules, EMPTY_LIST);

export const useAdminSchedulesList = (enabled, params) => {
  const loader = useCallback(() => adminService.getAdminSchedulesList(params), [params]);
  return useAsyncAdminData(enabled, loader, EMPTY_PAGED);
};

export const useAdminFlows = (enabled) =>
  useAsyncAdminData(enabled, adminService.getAdminFlows, EMPTY_LIST);

export const useAdminFlowsList = (enabled, params) => {
  const loader = useCallback(() => adminService.getAdminFlowsList(params), [params]);
  return useAsyncAdminData(enabled, loader, EMPTY_PAGED);
};

export const useAdminUploads = (enabled) =>
  useAsyncAdminData(enabled, adminService.getAdminUploads, EMPTY_LIST);

export const useAdminUploadsList = (enabled, params) => {
  const loader = useCallback(() => adminService.getAdminUploadsList(params), [params]);
  return useAsyncAdminData(enabled, loader, EMPTY_PAGED);
};

export const useAdminActivity = (enabled) =>
  useAsyncAdminData(enabled, adminService.getAdminActivity, EMPTY_LIST);

export const useAdminActivityList = (enabled, params) => {
  const loader = useCallback(() => adminService.getAdminActivityList(params), [params]);
  return useAsyncAdminData(enabled, loader, EMPTY_PAGED);
};

export const useAdminMembershipsList = (enabled, params) => {
  const loader = useCallback(() => adminService.getAdminMembershipsList(params), [params]);
  return useAsyncAdminData(enabled, loader, EMPTY_PAGED);
};

export const useAdminDirectoryOptions = (enabled) =>
  useAsyncAdminData(enabled, adminService.getAdminDirectoryOptions, EMPTY_OPTIONS);

export const useAdminStoreDetails = (enabled, storeId) => {
  const loader = useCallback(() => adminService.getAdminStoreDetails(storeId), [storeId]);
  return useAsyncAdminData(Boolean(enabled && storeId), loader, EMPTY_STORE_DETAILS);
};

export const useAdminUserDetails = (enabled, userId) => {
  const loader = useCallback(() => adminService.getAdminUserDetails(userId), [userId]);
  return useAsyncAdminData(Boolean(enabled && userId), loader, EMPTY_USER_DETAILS);
};

export default {
  useAdminOverview,
  useAdminExecutiveOverview,
  useAdminUsers,
  useAdminUsersList,
  useAdminStores,
  useAdminStoresList,
  useAdminSchedules,
  useAdminSchedulesList,
  useAdminFlows,
  useAdminFlowsList,
  useAdminUploads,
  useAdminUploadsList,
  useAdminActivity,
  useAdminActivityList,
  useAdminMembershipsList,
  useAdminDirectoryOptions,
  useAdminStoreDetails,
  useAdminUserDetails,
};
