import React from 'react';
import { Thermometer } from 'lucide-react';
import { formatThermalIndex, formatPressure } from '../../lib/thermalBalance';

export const CorporateTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload || {};
  const thermalBadge = data.thermalBadge || { emoji: '\u26AA', label: 'Est�vel', color: '#6B7280' };

  const findMetric = (key) => payload.find((point) => point.dataKey === key);
  const flow = findMetric('percentualFluxo');
  const conversion = findMetric('conversao');
  const gap = data.percentualFluxo > data.funcionarios_visual;

  return (
    <div className="bg-[#1e293b]/95 backdrop-blur-md border border-white/10 p-0 shadow-2xl rounded-xl min-w-[280px] overflow-hidden text-left">
      <div className="grid grid-cols-2 bg-white/5 border-b border-white/10">
        <div className="p-3 border-r border-white/10 flex items-center">
          <span className="text-xl font-black text-white tracking-tight">{label}h</span>
        </div>
        <div className="p-3 flex items-center gap-2">
          <span className="text-lg">{thermalBadge.emoji}</span>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-slate-500 font-bold leading-none mb-0.5">Status</span>
            <span className="text-xs font-bold leading-none" style={{ color: thermalBadge.color }}>{thermalBadge.label}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 p-4 gap-y-4 gap-x-6">
        <div className="col-span-1 space-y-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Fluxo</span>
            <span className="text-sm font-bold text-[#06b6d4] tabular-nums">
              {data.fluxo} <span className="text-[10px] text-slate-500 opacity-70">({flow?.value}%)</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Capacidade</span>
            <span className="text-sm font-bold text-slate-200 tabular-nums">
              {data.funcionarios_real} <span className="text-[10px] text-slate-500 opacity-70">pessoas</span>
            </span>
          </div>
        </div>

        <div className="col-span-1 space-y-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">�ndice T�rmico</span>
            <span className="text-sm font-bold text-white font-mono tabular-nums">{formatThermalIndex(data.thermalIndex)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Convers�o</span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums">{conversion?.value != null ? Number(conversion.value).toFixed(2) : '0.00'}%</span>
          </div>
        </div>
      </div>

      <div className="bg-black/20 p-2.5 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Thermometer className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] text-slate-400 tabular-nums font-mono">{formatPressure(data.pressure)} cl/p</span>
        </div>

        {gap && (
          <div className="flex items-center gap-1.5 bg-[#f43f5e]/10 px-2 py-0.5 rounded border border-[#f43f5e]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] animate-pulse" />
            <span className="text-[9px] font-bold text-[#f43f5e] uppercase tracking-wide">Gap Detectado</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CorporateTooltip;
