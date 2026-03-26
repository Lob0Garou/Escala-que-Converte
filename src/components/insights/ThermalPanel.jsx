import React from 'react';
import { Thermometer } from 'lucide-react';

export const ThermalPanel = ({ thermalMetrics }) => {
  if (!thermalMetrics) return null;

  return (
    <section className="panel-surface w-full p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <h3 className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3 text-sm font-semibold uppercase tracking-[0.18em] text-text-primary">
          <Thermometer className="h-4 w-4 text-emerald-500" />
          Equilíbrio térmico
        </h3>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
              Score global
            </span>
            <span className="count-up text-4xl font-semibold tracking-tight text-emerald-600 tabular-nums">
              {thermalMetrics.score}
            </span>
          </div>

          <div className="border-l border-border/70 pl-6 text-right">
            <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
              Média (µ)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold font-mono text-red-600">
                {thermalMetrics.mu.toFixed(1)}
              </span>
              <span className="text-xs font-medium text-text-secondary">cl/p</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-red-500/20 border-l-4 border-l-red-500 bg-red-500/5 p-4 transition-colors hover:bg-red-500/10">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-500">
            Hotspots <span className="text-[10px] font-semibold opacity-75">(Alta pressão)</span>
          </h4>
          {thermalMetrics.hotspots.length > 0 ? (
            <div className="space-y-0">
              {thermalMetrics.hotspots.map((spot, index) => (
                <div key={index} className="flex items-center justify-between border-b border-red-500/10 py-2.5 last:border-0">
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-sm font-semibold tabular-nums text-red-500">
                    {spot.hour}h
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-400">
                        Idx: <strong className="ml-0.5 text-xs text-red-500">{spot.index.toFixed(2)}</strong>
                      </span>
                    </div>
                    <div className="min-w-[74px] rounded-xl border border-red-500/20 bg-bg-elevated px-2.5 py-1 text-right text-xs font-semibold tabular-nums text-text-primary shadow-sm">
                      {spot.pressure.toFixed(1)} <span className="text-[10px] font-semibold text-red-500">cl/p</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-2 text-xs font-medium italic text-red-400/70">Nenhum hotspot detectado</p>
          )}
        </div>

        <div className="rounded-[24px] border border-blue-500/20 border-l-4 border-l-blue-500 bg-blue-500/5 p-4 transition-colors hover:bg-blue-500/10">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">
            Coldspots <span className="text-[10px] font-semibold opacity-75">(Baixa pressão)</span>
          </h4>
          {thermalMetrics.coldspots.length > 0 ? (
            <div className="space-y-0">
              {thermalMetrics.coldspots.map((spot, index) => (
                <div key={index} className="flex items-center justify-between border-b border-blue-500/10 py-2.5 last:border-0">
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-sm font-semibold tabular-nums text-blue-500">
                    {spot.hour}h
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">
                        Idx: <strong className="ml-0.5 text-xs text-blue-500">{spot.index.toFixed(2)}</strong>
                      </span>
                    </div>
                    <div className="min-w-[74px] rounded-xl border border-blue-500/20 bg-bg-elevated px-2.5 py-1 text-right text-xs font-semibold tabular-nums text-text-primary shadow-sm">
                      {spot.pressure.toFixed(1)} <span className="text-[10px] font-semibold text-blue-500">cl/p</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-2 text-xs font-medium italic text-blue-400/70">Nenhum coldspot detectado</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/70 pt-5">
        <div className="flex flex-col pl-2">
          <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
            Aderência à demanda
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-semibold tracking-tight tabular-nums ${thermalMetrics.adherence >= 85 ? 'text-emerald-600' : 'text-red-600'}`}>
              {thermalMetrics.adherence}%
            </span>
            <span className="text-xs font-medium text-text-secondary">Target: &gt;85%</span>
          </div>
        </div>

        <div className="flex flex-col border-l border-border/70 pl-6">
          <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
            Oportunidade (perda)
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-semibold tracking-tight tabular-nums ${thermalMetrics.lostOpportunity === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {thermalMetrics.lostOpportunity}
            </span>
            <span className="text-xs font-medium text-text-secondary">clientes est.</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ThermalPanel;
