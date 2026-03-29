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
  weeklyScoreSummary,
  selectedDay,
  onTimeClick,
  isOptimized,
  onOptimize,
  onToggleOptimized,
  revenueMetrics,
  revenueConfig,
  cuponsData,
  diasSemana,
  theme,
  onAddStaffRow,
  onRemoveStaffRow,
  onUpdateStaffRow,
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
            theme={theme}
          />

          {revenueMetrics && <RevenueImpactSection metrics={revenueMetrics} config={revenueConfig} />}

          <KPICards dailyMetrics={dailyMetrics} revenueMetrics={revenueMetrics} />

          <ThermalPanel thermalMetrics={thermalMetrics} />
        </section>

        <aside className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:self-start">
          <DailyStaffList
            staffRows={staffRows}
            selectedDay={selectedDay}
            onTimeClick={onTimeClick}
            onAddStaffRow={onAddStaffRow}
            onRemoveStaffRow={onRemoveStaffRow}
            onUpdateStaffRow={onUpdateStaffRow}
          />
          <StaffRanking
            staffRows={staffRows}
            cuponsData={cuponsData}
            selectedDay={selectedDay}
            diasSemana={diasSemana}
          />
        </aside>
      </div>

      <WeeklyScaleView
        staffRows={staffRows}
        onTimeClick={onTimeClick}
        theme={theme}
        weeklyScoreSummary={weeklyScoreSummary}
      />
    </div>
  );
};

export default MainContent;
