import React from 'react';
import ChartPanel from '../chart/ChartPanel';
import KPICards from '../insights/KPICards';
import ThermalPanel from '../insights/ThermalPanel';
import RevenueImpactSection from '../insights/RevenueImpactSection';
import DailyStaffList from '../staff/DailyStaffList';

export const MainContent = ({ chartData, dailyMetrics, thermalMetrics, staffRows, selectedDay, onTimeClick, isOptimized, onOptimize, onToggleOptimized, revenueMetrics, revenueConfig }) => {
  return (
    <main className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 w-full">
      <aside className="xl:col-span-3 flex flex-col bg-[#11141a]/60 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-xl overflow-hidden h-full min-w-0 transition-all duration-300 hover:border-white/10 p-4">
        <DailyStaffList staffRows={staffRows} selectedDay={selectedDay} onTimeClick={onTimeClick} />
      </aside>

      <section className="xl:col-span-9 flex flex-col gap-4 h-full min-h-0 min-w-0 overflow-y-auto custom-scroll pr-2">
        <ChartPanel
          chartData={chartData}
          dailyMetrics={dailyMetrics}
          isOptimized={isOptimized}
          onOptimize={onOptimize}
          onToggleOptimized={onToggleOptimized}
        />

        {revenueMetrics && (
          <RevenueImpactSection metrics={revenueMetrics} config={revenueConfig} />
        )}

        <KPICards dailyMetrics={dailyMetrics} revenueMetrics={revenueMetrics} />
        <ThermalPanel thermalMetrics={thermalMetrics} />
      </section>
    </main>
  );
};

export default MainContent;
