const buildDraftKey = (storeId) => `eqc_dashboard_draft:${storeId || 'unknown'}`;

const isStorageReady = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const loadDashboardDraft = (storeId) => {
  if (!isStorageReady() || !storeId) return null;

  try {
    const raw = window.localStorage.getItem(buildDraftKey(storeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    return {
      scheduleWeekId: parsed?.scheduleWeekId || null,
      weekStart: parsed?.weekStart || null,
      staffRows: Array.isArray(parsed?.staffRows) ? parsed.staffRows : [],
      baselineStaffRows: Array.isArray(parsed?.baselineStaffRows) ? parsed.baselineStaffRows : [],
      cuponsData: Array.isArray(parsed?.cuponsData) ? parsed.cuponsData : [],
      salesData: Array.isArray(parsed?.salesData) ? parsed.salesData : [],
      validatedAt: parsed?.validatedAt || null,
      validationStale: Boolean(parsed?.validationStale),
      validatedSignature: parsed?.validatedSignature || null,
      updatedAt: parsed?.updatedAt || null,
    };
  } catch (error) {
    console.warn('[dashboardDraft] Falha ao ler draft local:', error);
    return null;
  }
};

export const saveDashboardDraft = (storeId, draft) => {
  if (!isStorageReady() || !storeId) return;

  try {
    window.localStorage.setItem(
      buildDraftKey(storeId),
      JSON.stringify({
        scheduleWeekId: draft?.scheduleWeekId || null,
        weekStart: draft?.weekStart || null,
        staffRows: Array.isArray(draft?.staffRows) ? draft.staffRows : [],
        baselineStaffRows: Array.isArray(draft?.baselineStaffRows) ? draft.baselineStaffRows : [],
        cuponsData: Array.isArray(draft?.cuponsData) ? draft.cuponsData : [],
        salesData: Array.isArray(draft?.salesData) ? draft.salesData : [],
        validatedAt: draft?.validatedAt || null,
        validationStale: Boolean(draft?.validationStale),
        validatedSignature: draft?.validatedSignature || null,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.warn('[dashboardDraft] Falha ao salvar draft local:', error);
  }
};

export default {
  loadDashboardDraft,
  saveDashboardDraft,
};
