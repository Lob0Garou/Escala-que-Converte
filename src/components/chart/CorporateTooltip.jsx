import React from 'react';
import { Thermometer } from 'lucide-react';
import { formatThermalIndex, formatPressure } from '../../lib/thermalBalance_v5';

export const CorporateTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload || {};
  const thermalBadge = data.thermalBadge || { emoji: '\u26AA', label: 'Estável', color: '#9CA3AF' };

  const findMetric = (key) => payload.find((point) => point.dataKey === key);
  const flow = findMetric('percentualFluxo');
  const conversion = findMetric('conversao');
  const gap = data.percentualFluxo > data.funcionarios_visual;

  return (
    <div className="bg-bg-surface border border-border p-0 shadow-lg rounded-xl min-w-[280px] overflow-hidden text-left">
      <div className="grid grid-cols-2 bg-bg-elevated border-b border-border">
        <div className="p-3 border-r border-border flex items-center">
          <span className="text-xl font-bold text-text-primary tracking-tight tabular-nums">{label}h</span>
        </div>
        <div className="p-3 flex items-center gap-2">
          <span className="text-lg">{thermalBadge.emoji}</span>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-text-muted font-semibold tracking-wide leading-none mb-0.5">Status</span>
            <span className="text-xs font-semibold leading-none" style={{ color: thermalBadge.color }}>{thermalBadge.label}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 p-4 gap-y-4 gap-x-6">
        <div className="col-span-1 space-y-3">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-text-muted font-semibold tracking-wide mb-0.5">Fluxo</span>
            <span className="text-sm font-semibold text-text-secondary tabular-nums">
              {data.fluxo} <span className="text-[10px] text-text-muted font-medium">({flow?.value}%)</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-text-muted font-semibold tracking-wide mb-0.5">Capacidade</span>
            <span className="text-sm font-semibold text-accent-main tabular-nums">
              {data.funcionarios_real} <span className="text-[10px] text-accent-main/60 font-medium">pess.</span>
            </span>
          </div>
        </div>

        <div className="col-span-1 space-y-3">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-text-muted font-semibold tracking-wide mb-0.5">Índice Térmico</span>
            <span className="text-sm font-semibold text-text-primary tabular-nums">{formatThermalIndex(data.thermalIndex)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-text-muted font-semibold tracking-wide mb-0.5">Conversão</span>
            <span className="text-sm font-semibold text-green-brand tabular-nums">{conversion?.value != null ? Number(conversion.value).toFixed(2) : '0.00'}%</span>
          </div>
        </div>
      </div>

      <div className="bg-bg-elevated p-2.5 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Thermometer className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-[10px] text-text-secondary tabular-nums font-semibold">{formatPressure(data.pressure)} cl/p</span>
        </div>

        {gap && (
          <div className="flex items-center gap-1.5 bg-red-bg px-2 py-0.5 rounded border border-red-brand/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-brand animate-pulse" />
            <span className="text-[9px] font-bold text-red-brand uppercase tracking-wide">Gap Detectado</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CorporateTooltip;
