import React from 'react';
import ChartPanel from '../chart/ChartPanel';
import KPICards from '../insights/KPICards';
import ThermalPanel from '../insights/ThermalPanel';
import RevenueImpactSection from '../insights/RevenueImpactSection';
import DailyStaffList from '../staff/DailyStaffList';
import StaffRanking from '../staff/StaffRanking';
import WeeklyScaleView from '../weekly/WeeklyScaleView';

export const MainContent = ({
  chartData,
  dailyMetrics,
  thermalMetrics,
  staffRows,
  selectedDay,
  onTimeClick,
  isOptimized,
  onOptimize,
  onToggleOptimized,
  revenueMetrics,
  revenueConfig,
  cuponsData,
  diasSemana,
  onValidate,
  isValidating,
  theme,
  validatedAt,
}) => {
  return (
    <div className="w-full space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)] 2xl:grid-cols-[minmax(0,1.72fr)_minmax(340px,0.94fr)]">
        <section className="min-w-0 space-y-6">
          <ChartPanel
            chartData={chartData}
            dailyMetrics={dailyMetrics}
            isOptimized={isOptimized}
            onOptimize={onOptimize}
            onToggleOptimized={onToggleOptimized}
            onValidate={onValidate}
            isValidating={isValidating}
            theme={theme}
            validatedAt={validatedAt}
          />

          {revenueMetrics && <RevenueImpactSection metrics={revenueMetrics} config={revenueConfig} />}

          <KPICards dailyMetrics={dailyMetrics} revenueMetrics={revenueMetrics} />

          <ThermalPanel thermalMetrics={thermalMetrics} />
        </section>

        <aside className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:self-start">
          <DailyStaffList staffRows={staffRows} selectedDay={selectedDay} onTimeClick={onTimeClick} />
          <StaffRanking
            staffRows={staffRows}
            cuponsData={cuponsData}
            selectedDay={selectedDay}
            diasSemana={diasSemana}
          />
        </aside>
      </div>

      <WeeklyScaleView staffRows={staffRows} onTimeClick={onTimeClick} theme={theme} />
    </div>
  );
};

export default MainContent;
