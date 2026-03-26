import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
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
import { useRevenueCalculation } from '../../hooks/useRevenueCalculation';
import { useTheme } from '../../hooks/useTheme';
import { FLAGS } from '../../lib/featureFlags';
import {
  getOrCreateScheduleWeek,
  loadShifts,
  loadWeekSnapshot,
  saveShiftsBatch,
  updateWeekSnapshot,
  validateScheduleWeek,
} from '../../hooks/useSupabaseSync';

const Dashboard = ({
  user = null,
  activeStore = null,
  stores = [],
  onSelectStore,
  onCreateStore,
  onDeleteStore,
  onSignOut,
}) => {
  const dashboardRef = useRef(null);
  const printRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

  const [activeWeekId, setActiveWeekId] = useState(null);
  const isLoadingFromDbRef = useRef(false);
  const autoSaveTimerRef = useRef(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [validatedAt, setValidatedAt] = useState(null);
  const [loadedFromDb, setLoadedFromDb] = useState(false);

  const [printTheme, setPrintTheme] = useState('dark');
  const [selectedDay, setSelectedDay] = useState('SEGUNDA');
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [pickerState, setPickerState] = useState({ isOpen: false, rowId: null, field: null, value: '' });
  const [pendingEscalaRows, setPendingEscalaRows] = useState(null);

  const handleDownloadImage = useCallback(async () => {
    if (!printRef.current) return;

    try {
      const scrollHeight = printRef.current.scrollHeight;
      const windowWidth = 1600;

      const canvas = await html2canvas(printRef.current, {
        backgroundColor: printTheme === 'dark' ? '#0a0c10' : '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: windowWidth,
        height: scrollHeight + 100,
        windowWidth,
        windowHeight: scrollHeight + 100,
        onclone: (clonedDoc) => {
          const element = clonedDoc.querySelector('[data-print-target]');
          if (element) {
            element.style.display = 'flex';
            element.style.visibility = 'visible';
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
  } = useFileProcessing(selectedDay, handleEscalaProcessed);

  const diasSemana = useMemo(
    () => ({
      SEGUNDA: '1. Seg',
      ['TERÇA']: '2. Ter',
      QUARTA: '3. Qua',
      QUINTA: '4. Qui',
      SEXTA: '5. Sex',
      ['SÁBADO']: '6. Sab',
      DOMINGO: '7. Dom',
    }),
    [],
  );

  const staffData = useStaffData(selectedDay, cuponsData, diasSemana);
  const {
    staffRows,
    isOptimized,
    originalStaffRowsRef,
    updateStaffRow,
    optimizeSchedule,
    toggleOptimized,
  } = staffData;

  useEffect(() => {
    if (!FLAGS.LOAD_FROM_DB || !activeStore?.id) return;

    const init = async () => {
      isLoadingFromDbRef.current = true;
      setSyncLoading(true);
      let resolvedWeekId = null;

      try {
        const week = await getOrCreateScheduleWeek(activeStore.id);
        if (!week) {
          console.warn('[dashboard] Nenhuma semana retornada');
          return;
        }
        resolvedWeekId = week.id;

        const shifts = await loadShifts(week.id);
        if (shifts.length > 0) {
          staffData.applyProcessedRows(shifts, selectedDay);
          setLoadedFromDb(true);
        }

        const { cuponsData: loadedCupons, salesData: loadedSales, validatedAt: loadedValidatedAt } =
          await loadWeekSnapshot(week.id);
        if (loadedCupons.length > 0) setCuponsData(loadedCupons);
        if (loadedSales.length > 0) setSalesData(loadedSales);
        if (loadedValidatedAt) setValidatedAt(loadedValidatedAt);
      } finally {
        isLoadingFromDbRef.current = false;
        setSyncLoading(false);
        if (resolvedWeekId) setActiveWeekId(resolvedWeekId);
      }
    };

    setLoadedFromDb(false);
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id]);

  const [isValidating, setIsValidating] = useState(false);

  const handleValidateSchedule = async () => {
    if (!FLAGS.PERSIST_TO_SUPABASE || !activeWeekId || !activeStore?.id) return;
    if (staffRows.length === 0) return;

    setIsValidating(true);
    try {
      await validateScheduleWeek(activeWeekId, activeStore.id, staffRows);
      setValidatedAt(new Date().toISOString());
    } finally {
      setTimeout(() => setIsValidating(false), 500);
    }
  };

  useEffect(() => {
    if (!FLAGS.PERSIST_TO_SUPABASE || !activeWeekId || !activeStore?.id) return;
    if (isLoadingFromDbRef.current) return;
    if (!cuponsData?.length) return;
    updateWeekSnapshot(activeWeekId, activeStore.id, { cuponsData });
  }, [cuponsData, activeWeekId, activeStore?.id]);

  useEffect(() => {
    if (!FLAGS.PERSIST_TO_SUPABASE || !activeWeekId || !activeStore?.id) return;
    if (isLoadingFromDbRef.current) return;
    if (!salesData?.length) return;
    updateWeekSnapshot(activeWeekId, activeStore.id, { salesData });
  }, [salesData, activeWeekId, activeStore?.id]);

  // ─── Auto-save staffRows quando mudam (debounce 1.5s) ────────────────────
  useEffect(() => {
    if (!FLAGS.PERSIST_TO_SUPABASE || !activeWeekId || !activeStore?.id) return;
    if (isLoadingFromDbRef.current) return;
    if (!staffRows?.length) return;

    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveShiftsBatch(activeWeekId, activeStore.id, staffRows);
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
          className="w-[92%] h-[92%] object-contain select-none transition-opacity duration-700 ease-in-out grayscale opacity-[0.02]"
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
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1) opacity(0.5);
          cursor: pointer;
        }
      `}</style>

      <div ref={dashboardRef} className="relative z-10 flex min-h-screen w-full flex-col">
        <Header
          user={user}
          stores={stores}
          activeStore={activeStore}
          onSelectStore={onSelectStore}
          onCreateStore={onCreateStore}
          onDeleteStore={onDeleteStore}
          onSignOut={onSignOut}
          theme={theme}
          onToggleTheme={toggleTheme}
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
              salesData={salesData}
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

            <main className="flex-1 min-h-0 w-full overflow-y-auto custom-scroll">
              <div className="page-shell py-6 lg:py-8 2xl:py-10">
                <MainContent
                  chartData={chartData}
                  dailyMetrics={dailyMetrics}
                  thermalMetrics={thermalMetrics}
                  staffRows={staffRows}
                  selectedDay={selectedDay}
                  onTimeClick={openTimePicker}
                  isOptimized={isOptimized}
                  onOptimize={optimizeSchedule}
                  onToggleOptimized={toggleOptimized}
                  revenueMetrics={revenueMetrics}
                  revenueConfig={revenueConfig}
                  cuponsData={cuponsData}
                  diasSemana={diasSemana}
                  onValidate={handleValidateSchedule}
                  isValidating={isValidating}
                  validatedAt={validatedAt}
                  theme={theme}
                />
              </div>
            </main>
          </div>
        )}

        {showUploadSection && (
          <div className="absolute inset-0 z-50 bg-bg-base/85 backdrop-blur-md">
            <div className="relative mx-auto flex h-full w-full max-w-[1600px] items-start justify-center py-6 sm:py-8">
              <button
                onClick={() => setShowUploadSection(false)}
                className="absolute right-4 top-4 rounded-full border border-border/70 bg-bg-surface/90 px-4 py-2 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-bg-elevated sm:right-6 sm:top-6"
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

        <div className="fixed -left-[99999px] top-0" data-print-target>
          <WeeklyScalePrint ref={printRef} staffRows={staffRows} theme={printTheme} />
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
