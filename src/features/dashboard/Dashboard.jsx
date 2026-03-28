import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CENTAURO_BRAND from '../../lib/centauro_brand_assets';

import Header from '../../components/layout/Header';
import LoadingOverlay from '../../components/layout/LoadingOverlay';
import Controls from '../../components/layout/Controls';
import UploadSection from '../../components/upload/UploadSection';
import TimePickerModal from '../../components/ui/TimePickerModal';
import MainContent from '../../components/dashboard/MainContent';
import WeeklyScalePrint from '../../components/weekly/WeeklyScalePrint';

import { useFileProcessing } from '../../hooks/useFileProcessing';
import { useStaffData } from '../../hooks/useStaffData';
import { useChartData } from '../../hooks/useChartData';
import { useThermalMetrics } from '../../hooks/useThermalMetrics';
import { useWeeklyScore } from '../../hooks/useWeeklyScore';
import { useRevenueCalculation } from '../../hooks/useRevenueCalculation';
import { useTheme } from '../../hooks/useTheme';
import { loadDashboardDraft, saveDashboardDraft } from '../../lib/dashboardDraft';
import { WEEK_DAY_TO_EXCEL } from '../../lib/dayUtils';
import { FLAGS } from '../../lib/featureFlags';
import dataRepository from '../../repositories';
import optimizationService from '../../services/optimizationService';
import { logActivity } from '../../services/activityService';

const buildValidationSignature = ({ staffRows = [], cuponsData = [], salesData = [] } = {}) =>
  JSON.stringify({
    staffRows: Array.isArray(staffRows)
      ? staffRows.map((row) => ({
          id: row.id || null,
          dia: row.dia || null,
          nome: row.nome || null,
          entrada: row.entrada || null,
          intervalo: row.intervalo || null,
          saida: row.saida || null,
          saidaDiaSeguinte: Boolean(row.saidaDiaSeguinte),
        }))
      : [],
    cuponsData: Array.isArray(cuponsData) ? cuponsData : [],
    salesData: Array.isArray(salesData) ? salesData : [],
  });

const Dashboard = ({
  user = null,
  profile = null,
  activeStore = null,
  stores = [],
  onSelectStore,
  onCreateStore,
  onDeleteStore,
  onSignOut,
  onOpenAdmin,
}) => {
  const dashboardRef = useRef(null);
  const printRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

  const [activeWeekId, setActiveWeekId] = useState(null);
  const [activeWeekStart, setActiveWeekStart] = useState(null);
  const isLoadingFromDbRef = useRef(false);
  const autoSaveTimerRef = useRef(null);
  const optimizationSyncTimerRef = useRef(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [validatedAt, setValidatedAt] = useState(null);
  const [isValidationStale, setIsValidationStale] = useState(false);
  const [loadedFromDb, setLoadedFromDb] = useState(false);

  const [printTheme, setPrintTheme] = useState('dark');
  const [selectedDay, setSelectedDay] = useState('SEGUNDA');
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [pickerState, setPickerState] = useState({ isOpen: false, rowId: null, field: null, value: '' });
  const [pendingEscalaRows, setPendingEscalaRows] = useState(null);
  const dashboardVisitRef = useRef(null);
  const draftSyncTimerRef = useRef(null);
  const validationSignatureRef = useRef(null);

  const diasSemana = useMemo(() => WEEK_DAY_TO_EXCEL, []);

  const handleDownloadImage = useCallback(async () => {
    if (!printRef.current) return;

    try {
      const { default: html2canvas } = await import('html2canvas');
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const printNode = printRef.current;
      const captureWidth = printNode.scrollWidth || 1600;
      const captureHeight = printNode.scrollHeight || printNode.offsetHeight || 900;

      const canvas = await html2canvas(printNode, {
        backgroundColor: printTheme === 'dark' ? '#0a0c10' : '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        onclone: (clonedDoc) => {
          const element = clonedDoc.querySelector('[data-print-root]');
          if (element) {
            element.style.display = 'flex';
            element.style.visibility = 'visible';
            element.style.opacity = '1';
            if (printTheme === 'light') {
              element.style.background = '#ffffff';
            }
          }
        },
      });

      const link = document.createElement('a');
      link.download = `escala-semanal-${printTheme}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
    }
  }, [printTheme]);

  useEffect(() => {
    const handleEvent = () => handleDownloadImage();
    const handleThemeUpdate = (event) => setPrintTheme(event.detail);

    window.addEventListener('generate-weekly-image', handleEvent);
    window.addEventListener('update-print-theme', handleThemeUpdate);

    return () => {
      window.removeEventListener('generate-weekly-image', handleEvent);
      window.removeEventListener('update-print-theme', handleThemeUpdate);
    };
  }, [handleDownloadImage]);

  const handleEscalaProcessed = useCallback((processedRows, currentSelectedDay) => {
    setPendingEscalaRows({ processedRows, currentSelectedDay });
  }, []);

  const {
    dragActive,
    setDragActive,
    cuponsData,
    salesData,
    loading,
    error,
    processFile,
    handleFileUpload,
    handleDrag,
    handleDrop,
    setCuponsData,
    setSalesData,
  } = useFileProcessing(selectedDay, handleEscalaProcessed, {
    userId: user?.id || null,
    storeId: activeStore?.id || null,
  });

  const staffData = useStaffData(selectedDay, cuponsData, diasSemana);
  const {
    staffRows,
    isOptimized,
    originalStaffRowsRef,
    updateStaffRow,
    optimizeSchedule,
    toggleOptimized,
  } = staffData;
  const currentValidationSignature = useMemo(
    () => buildValidationSignature({ staffRows, cuponsData, salesData }),
    [cuponsData, salesData, staffRows],
  );

  useEffect(() => {
    if (!FLAGS.LOAD_FROM_DB || !activeStore?.id) return;

    const init = async () => {
      isLoadingFromDbRef.current = true;
      setSyncLoading(true);
      let resolvedWeekId = null;

      try {
        const analysisData = await dataRepository.getAnalysisData(activeStore.id);
        const draftData = loadDashboardDraft(activeStore.id);
        if (!analysisData?.scheduleWeekId) {
          console.warn('[dashboard] Nenhuma semana retornada pelo repositorio');
          return;
        }
        resolvedWeekId = analysisData.scheduleWeekId;
        setActiveWeekStart(analysisData.weekStart || draftData?.weekStart || null);

        const resolvedStaffRows =
          analysisData.staffRows.length > 0 ? analysisData.staffRows : draftData?.staffRows || [];
        const resolvedBaselineStaffRows =
          Array.isArray(draftData?.baselineStaffRows) && draftData.baselineStaffRows.length > 0
            ? draftData.baselineStaffRows
            : resolvedStaffRows;
        const resolvedCuponsData =
          analysisData.cuponsData.length > 0 ? analysisData.cuponsData : draftData?.cuponsData || [];
        const resolvedSalesData =
          analysisData.salesData.length > 0 ? analysisData.salesData : draftData?.salesData || [];
        const resolvedValidatedAt = analysisData.validatedAt || draftData?.validatedAt || null;
        const resolvedValidationSignature =
          draftData?.validatedSignature ||
          buildValidationSignature({
            staffRows: resolvedStaffRows,
            cuponsData: resolvedCuponsData,
            salesData: resolvedSalesData,
          });

        if (resolvedStaffRows.length > 0) {
          staffData.applyProcessedRows(resolvedStaffRows, selectedDay);
          originalStaffRowsRef.current = resolvedBaselineStaffRows;
          setLoadedFromDb(true);
        }

        if (resolvedCuponsData.length > 0) setCuponsData(resolvedCuponsData);
        if (resolvedSalesData.length > 0) setSalesData(resolvedSalesData);
        validationSignatureRef.current = resolvedValidatedAt ? resolvedValidationSignature : null;
        if (resolvedValidatedAt) {
          setValidatedAt(resolvedValidatedAt);
          setIsValidationStale(Boolean(draftData?.validationStale));
        } else {
          setValidatedAt(null);
          setIsValidationStale(false);
        }
      } catch (error) {
        console.error('[dashboard] Falha ao carregar dados persistidos:', error);
      } finally {
        isLoadingFromDbRef.current = false;
        setSyncLoading(false);
        if (resolvedWeekId) setActiveWeekId(resolvedWeekId);
      }
    };

    setLoadedFromDb(false);
    setValidatedAt(null);
    setIsValidationStale(false);
    validationSignatureRef.current = null;
    originalStaffRowsRef.current = null;
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id]);

  useEffect(() => {
    if (!user?.id || !activeStore?.id) return;

    const visitKey = `${user.id}:${activeStore.id}`;
    if (dashboardVisitRef.current === visitKey) return;
    dashboardVisitRef.current = visitKey;

    void logActivity({
      action: 'dashboard_opened',
      entityType: 'dashboard',
      storeId: activeStore.id,
      metadata: {
        storeName: activeStore.name || null,
      },
    });
  }, [activeStore?.id, activeStore?.name, user?.id]);

  useEffect(() => {
    if (!activeWeekId || !activeStore?.id) return;
    if (isLoadingFromDbRef.current) return;
    if (!cuponsData?.length) return;
    dataRepository
      .saveWeekSnapshot(activeStore.id, activeWeekId, { cuponsData })
      .catch((error) => console.error('[dashboard] sync de cupons falhou:', error));
  }, [cuponsData, activeWeekId, activeStore?.id]);

  useEffect(() => {
    if (!activeWeekId || !activeStore?.id) return;
    if (isLoadingFromDbRef.current) return;
    if (!salesData?.length) return;
    dataRepository
      .saveWeekSnapshot(activeStore.id, activeWeekId, { salesData })
      .catch((error) => console.error('[dashboard] sync de vendas falhou:', error));
  }, [salesData, activeWeekId, activeStore?.id]);

  useEffect(() => {
    if (!activeWeekId || !activeStore?.id) return;
    if (isLoadingFromDbRef.current) return;
    if (!staffRows?.length) return;

    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      dataRepository.saveSchedule(activeStore.id, activeWeekId, staffRows).catch((error) =>
        console.error('[dashboard] auto-save staffRows falhou:', error),
      );
    }, 1500);

    return () => clearTimeout(autoSaveTimerRef.current);
  }, [staffRows, activeWeekId, activeStore?.id]);

  useEffect(() => {
    if (!pendingEscalaRows) return;
    staffData.applyProcessedRows(pendingEscalaRows.processedRows, pendingEscalaRows.currentSelectedDay);
    setPendingEscalaRows(null);
  }, [pendingEscalaRows, staffData]);

  const { revenueMetrics, revenueConfig } = useRevenueCalculation(
    staffRows,
    salesData,
    cuponsData,
    selectedDay,
    diasSemana,
    originalStaffRowsRef,
  );

  const { chartData, dailyMetrics } = useChartData(cuponsData, staffRows, selectedDay, diasSemana);
  const { thermalMetrics } = useThermalMetrics(chartData);
  const weeklyScoreSummary = useWeeklyScore({
    cuponsData,
    salesData,
    staffRows,
    baselineStaffRows: originalStaffRowsRef.current,
    diasSemana,
    referenceDate: activeWeekStart,
    mirrorCurrentAsBaseline: true,
  });

  useEffect(() => {
    if (!activeWeekId || !activeStore?.id) return;
    if (isLoadingFromDbRef.current) return;
    if (!cuponsData?.length || !staffRows?.length) return;
    if (
      weeklyScoreSummary.targetWeeklyScoreAvg === null &&
      weeklyScoreSummary.currentWeeklyScoreAvg === null
    ) {
      return;
    }

    clearTimeout(optimizationSyncTimerRef.current);
    optimizationSyncTimerRef.current = setTimeout(() => {
      optimizationService
        .upsertOptimizationSnapshot({
          storeId: activeStore.id,
          scheduleWeekId: activeWeekId,
          currentScore: weeklyScoreSummary.currentWeeklyScoreAvg,
          targetScore: weeklyScoreSummary.targetWeeklyScoreAvg,
          weeklyPotentialGainTotal: weeklyScoreSummary.weeklyPotentialGainTotal,
          revenueMetrics,
          staffRows,
        })
        .catch((syncError) =>
          console.error('[dashboard] sync de optimization_results falhou:', syncError),
        );
    }, 1500);

    return () => clearTimeout(optimizationSyncTimerRef.current);
  }, [
    activeStore?.id,
    activeWeekId,
    cuponsData,
    revenueMetrics,
    salesData,
    staffRows,
    weeklyScoreSummary.currentWeeklyScoreAvg,
    weeklyScoreSummary.targetWeeklyScoreAvg,
    weeklyScoreSummary.weeklyPotentialGainTotal,
  ]);

  useEffect(() => {
    if (syncLoading || isLoadingFromDbRef.current) return;
    if (!validatedAt) {
      setIsValidationStale(false);
      return;
    }
    if (!validationSignatureRef.current) {
      validationSignatureRef.current = currentValidationSignature;
      setIsValidationStale(false);
      return;
    }

    const nextStale = validationSignatureRef.current !== currentValidationSignature;
    setIsValidationStale((current) => (current === nextStale ? current : nextStale));
  }, [currentValidationSignature, syncLoading, validatedAt]);

  useEffect(() => {
    if (!activeStore?.id) return;
    const hasDraftContent =
      staffRows.length > 0 ||
      cuponsData.length > 0 ||
      salesData.length > 0 ||
      Boolean(validatedAt) ||
      isValidationStale;

    if (!hasDraftContent) return;

    clearTimeout(draftSyncTimerRef.current);
    draftSyncTimerRef.current = setTimeout(() => {
      saveDashboardDraft(activeStore.id, {
        scheduleWeekId: activeWeekId,
        weekStart: activeWeekStart,
        staffRows,
        baselineStaffRows: originalStaffRowsRef.current || [],
        cuponsData,
        salesData,
        validatedAt,
        validationStale: isValidationStale,
        validatedSignature: validationSignatureRef.current,
      });
    }, 300);

    return () => clearTimeout(draftSyncTimerRef.current);
  }, [
    activeStore?.id,
    activeWeekId,
    activeWeekStart,
    cuponsData,
    originalStaffRowsRef,
    salesData,
    staffRows,
    validatedAt,
    isValidationStale,
  ]);

  const openTimePicker = useCallback((id, field, currentValue) => {
    setPickerState({ isOpen: true, rowId: id, field, value: currentValue });
  }, []);

  const handleTimePickerSelect = useCallback(
    (newValue) => {
      if (pickerState.rowId && pickerState.field) {
        updateStaffRow(pickerState.rowId, pickerState.field, newValue);
      }
    },
    [pickerState, updateStaffRow],
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg-base">
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <img
          src={CENTAURO_BRAND.bgLogo}
          alt=""
          className="h-[92%] w-[92%] object-contain select-none opacity-[0.02] grayscale transition-opacity duration-700 ease-in-out"
        />
        <div className="absolute inset-0 bg-[radial-gradient(var(--text-primary)_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.025]" />
      </div>

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.01);
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        input[type='time']::-webkit-calendar-picker-indicator {
          filter: invert(1) opacity(0.5);
          cursor: pointer;
        }
      `}</style>

      <div ref={dashboardRef} className="relative z-10 flex min-h-screen w-full flex-col">
        <Header
          user={user}
          profile={profile}
          stores={stores}
          activeStore={activeStore}
          onSelectStore={onSelectStore}
          onCreateStore={onCreateStore}
          onDeleteStore={onDeleteStore}
          onSignOut={onSignOut}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenAdmin={onOpenAdmin}
        />

        {loading && <LoadingOverlay />}

        {syncLoading ? (
          <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-4 rounded-[28px] border border-border/70 bg-bg-surface/90 px-8 py-10 shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent-main" />
              <p className="text-sm font-medium tracking-wide text-text-secondary">Carregando dados da loja...</p>
            </div>
          </div>
        ) : !(cuponsData?.length > 0 && staffRows?.length > 0) && !loadedFromDb ? (
          <div className="flex flex-1 items-start justify-center overflow-y-auto py-6 sm:py-8">
            <UploadSection
              handleFileUpload={handleFileUpload}
              handleDrag={handleDrag}
              handleDrop={handleDrop}
              dragActive={dragActive}
              setDragActive={setDragActive}
              cuponsData={cuponsData}
              error={error}
              onEscalaProcessed={handleEscalaProcessed}
              processFile={processFile}
              selectedDay={selectedDay}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <Controls
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              setShowUploadSection={setShowUploadSection}
            />

            <main className="custom-scroll flex-1 min-h-0 w-full overflow-y-auto">
              <div className="page-shell py-6 lg:py-8 2xl:py-10">
                <MainContent
                  chartData={chartData}
                  dailyMetrics={dailyMetrics}
                  thermalMetrics={thermalMetrics}
                  staffRows={staffRows}
                  weeklyScoreSummary={weeklyScoreSummary}
                  selectedDay={selectedDay}
                  onTimeClick={openTimePicker}
                  isOptimized={isOptimized}
                  onOptimize={optimizeSchedule}
                  onToggleOptimized={toggleOptimized}
                  revenueMetrics={revenueMetrics}
                  revenueConfig={revenueConfig}
                  cuponsData={cuponsData}
                  diasSemana={diasSemana}
                  theme={theme}
                />
              </div>
            </main>
          </div>
        )}

        {showUploadSection && (
          <div className="absolute inset-0 z-50 bg-bg-base/56 backdrop-blur-[2px]">
            <div className="relative mx-auto flex h-full w-full max-w-[1600px] items-start justify-center py-6 sm:py-8">
              <button
                onClick={() => setShowUploadSection(false)}
                className="absolute right-4 top-4 rounded-full border border-border/60 bg-bg-surface/62 px-4 py-2 text-sm font-medium text-text-primary shadow-sm backdrop-blur-xl transition-colors hover:bg-bg-elevated/72 sm:right-6 sm:top-6"
              >
                Fechar
              </button>
              <UploadSection
                handleFileUpload={handleFileUpload}
                handleDrag={handleDrag}
                handleDrop={handleDrop}
                dragActive={dragActive}
                setDragActive={setDragActive}
                cuponsData={cuponsData}
                error={error}
                onEscalaProcessed={handleEscalaProcessed}
                processFile={processFile}
                selectedDay={selectedDay}
              />
            </div>
          </div>
        )}

        <div className="pointer-events-none fixed left-0 top-0 -z-10 opacity-0" aria-hidden="true">
          <WeeklyScalePrint
            ref={printRef}
            staffRows={staffRows}
            theme={printTheme}
            weeklyScoreSummary={weeklyScoreSummary}
          />
        </div>

        <TimePickerModal
          isOpen={pickerState.isOpen}
          onClose={() => setPickerState((prev) => ({ ...prev, isOpen: false }))}
          onSelect={handleTimePickerSelect}
          initialValue={pickerState.value}
        />
      </div>
    </div>
  );
};

export default Dashboard;
