import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import CENTAURO_BRAND from '../../lib/centauro_brand_assets';

import Header from '../../components/layout/Header';
import LoadingOverlay from '../../components/layout/LoadingOverlay';
import Controls from '../../components/layout/Controls';
import UploadSection from '../../components/upload/UploadSection';
import TimePickerModal from '../../components/ui/TimePickerModal';
import MainContent from '../../components/dashboard/MainContent';
import WeeklyScaleView from '../../components/weekly/WeeklyScaleView';
import WeeklyScalePrint from '../../components/weekly/WeeklyScalePrint';

import { useFileProcessing } from '../../hooks/useFileProcessing';
import { useStaffData } from '../../hooks/useStaffData';
import { useChartData } from '../../hooks/useChartData';
import { useThermalMetrics } from '../../hooks/useThermalMetrics';
import { useRevenueCalculation } from '../../hooks/useRevenueCalculation';

const Dashboard = () => {
  const dashboardRef = useRef(null);
  const printRef = useRef(null);

  const [printTheme, setPrintTheme] = useState('dark');
  const [selectedDay, setSelectedDay] = useState('SEGUNDA');
  const [chartType] = useState('composed');
  const [theme, setTheme] = useState('dark');
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [activeTab] = useState('cobertura');
  const [pickerState, setPickerState] = useState({ isOpen: false, rowId: null, field: null, value: '' });
  const [pendingEscalaRows, setPendingEscalaRows] = useState(null);

  const handleDownloadImage = useCallback(async () => {
    if (!printRef.current) return;

    try {
      const scrollHeight = printRef.current.scrollHeight;
      const windowWidth = 1280;

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
    handleFileUpload,
    handleDrag,
    handleDrop,
  } = useFileProcessing(selectedDay, handleEscalaProcessed);

  useEffect(() => {
    setTheme('dark');
    document.documentElement.classList.add('dark');
  }, []);

  const diasSemana = useMemo(() => ({
    SEGUNDA: '1. Seg',
    ['TER\u00C7A']: '2. Ter',
    QUARTA: '3. Qua',
    QUINTA: '4. Qui',
    SEXTA: '5. Sex',
    ['S\u00C1BADO']: '6. Sab',
    DOMINGO: '7. Dom',
  }), []);

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

  const handleTimePickerSelect = useCallback((newValue) => {
    if (pickerState.rowId && pickerState.field) {
      updateStaffRow(pickerState.rowId, pickerState.field, newValue);
    }
  }, [pickerState, updateStaffRow]);

  return (
    <div className="min-h-screen w-full bg-[#0B0F1A] flex flex-col">
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <img
          src={CENTAURO_BRAND.bgLogo}
          alt=""
          className={`w-[85%] h-[85%] object-contain grayscale brightness-150 contrast-125 select-none transition-opacity duration-700 ease-in-out ${cuponsData.length > 0 ? 'opacity-0' : 'opacity-[0.04]'}`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.02]" />
      </div>

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.01); }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.5); cursor: pointer; }
      `}</style>

      <div ref={dashboardRef} className="w-full flex-1 flex flex-col">
        <Header />

        {loading && <LoadingOverlay />}

        {!cuponsData.length ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <UploadSection
              handleFileUpload={handleFileUpload}
              handleDrag={handleDrag}
              handleDrop={handleDrop}
              dragActive={dragActive}
              setDragActive={setDragActive}
              cuponsData={cuponsData}
              salesData={salesData}
              error={error}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <Controls
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              setShowUploadSection={setShowUploadSection}
            />

            <main className="flex-1 w-full overflow-y-auto custom-scroll">
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
                chartType={chartType}
                activeTab={activeTab}
                theme={theme}
              />
              <div className="px-6 pb-10">
                <WeeklyScaleView staffRows={staffRows} onTimeClick={openTimePicker} />
              </div>
            </main>
          </div>
        )}

        {showUploadSection && (
          <div className="absolute inset-0 z-50 bg-[#050608]/90 backdrop-blur-sm flex items-center justify-center p-12 rounded-3xl">
            <div className="relative w-full max-w-5xl mx-auto">
              <button onClick={() => setShowUploadSection(false)} className="absolute -top-10 right-0 text-white hover:text-[#E30613]">Fechar</button>
              <UploadSection
                handleFileUpload={handleFileUpload}
                handleDrag={handleDrag}
                handleDrop={handleDrop}
                dragActive={dragActive}
                setDragActive={setDragActive}
                cuponsData={cuponsData}
                salesData={salesData}
                error={error}
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
