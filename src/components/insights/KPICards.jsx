import React from 'react';

export const KPICards = ({ dailyMetrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2 mb-6">
      <div className={`kpi-card ${dailyMetrics?.criticalDrops > 0 ? 'kpi-card-critical' : ''}`}>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Alerta de Quedas</span>
        <div className="flex flex-col mt-2">
          <span className="text-2xl font-bold text-white">{dailyMetrics?.criticalDrops || 0}</span>
          <div className="text-sm text-slate-500 mt-1">
            {dailyMetrics?.horasCriticas?.length > 0 ? dailyMetrics.horasCriticas.join(', ') : 'Nenhum detectado'}
          </div>
        </div>
      </div>

      <div className="kpi-card">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Menor Convers�o</span>
        <div className="mt-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            {dailyMetrics?.minConversion ? dailyMetrics.minConversion.toFixed(1) : 0}%
          </span>
          <p className="text-sm text-slate-500 mt-1">M�nimo do dia</p>
        </div>
      </div>

      <div className="kpi-card group">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pico de Fluxo</span>
        <div className="flex flex-col mt-2">
          <span className="text-2xl font-bold text-white group-hover:text-[#06b6d4] transition-colors">{dailyMetrics?.maxFlow || 0}</span>
          <span className="text-sm text-slate-500 mt-1">
            {dailyMetrics?.maxFlowHour} <span className="text-slate-600">({dailyMetrics?.maxFlowPct}%)</span>
          </span>
        </div>
      </div>

      <div className="kpi-card group">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Menor Cobertura</span>
        <div className="flex flex-col mt-2">
          <span className="text-2xl font-bold text-white group-hover:text-[#E30613] transition-colors">{dailyMetrics?.minStaff || 0}</span>
          <span className="text-sm text-slate-500 mt-1">
            M�nimo �s {dailyMetrics?.minStaffHour || 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default KPICards;
