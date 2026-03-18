import React from 'react';
import { Thermometer } from 'lucide-react';

export const ThermalPanel = ({ thermalMetrics }) => {
  if (!thermalMetrics) return null;

  return (
    <div className="w-full bg-[#11141a] border border-white/5 rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
          <Thermometer className="w-4 h-4 text-emerald-400" /> Equilíbrio Térmico
        </h3>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider block mb-0.5">Score Global</span>
            <span className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent count-up">
              {thermalMetrics.score}
            </span>
          </div>
          <div className="text-right pl-6 border-l border-white/5">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider block mb-0.5">Média (µ)</span>
            <span className="text-xl font-mono text-[#E30613]">{thermalMetrics.mu.toFixed(1)}</span>
            <span className="text-slate-600 text-xs ml-1">cl/p</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1a1e27] border border-white/5 border-l-4 border-l-[#f43f5e] rounded-xl p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[#f43f5e]/5 pointer-events-none" />
          <h4 className="text-xs font-bold text-[#f43f5e] uppercase tracking-wider mb-3 flex items-center gap-2 relative z-10">
            🔥 Hotspots (Alta Pressão)
          </h4>
          {thermalMetrics.hotspots.length > 0 ? (
            <div className="space-y-0 relative z-10">
              {thermalMetrics.hotspots.map((spot, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-slate-300 font-mono text-sm">{spot.hour}h</span>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-400">Idx: <strong className="text-[#f43f5e]">{spot.index.toFixed(2)}</strong></span>
                    </div>
                    <div className="px-2 py-1 rounded bg-black/20 text-xs font-mono text-slate-300">
                      {spot.pressure.toFixed(1)} <span className="text-slate-600">cl/p</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-2">Nenhum hotspot detectado</p>
          )}
        </div>

        <div className="bg-[#1a1e27] border border-white/5 border-l-4 border-l-[#6366f1] rounded-xl p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[#6366f1]/5 pointer-events-none" />
          <h4 className="text-xs font-bold text-[#6366f1] uppercase tracking-wider mb-3 flex items-center gap-2 relative z-10">
            🧊 Coldspots (Baixa Pressão)
          </h4>
          {thermalMetrics.coldspots.length > 0 ? (
            <div className="space-y-0 relative z-10">
              {thermalMetrics.coldspots.map((spot, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-slate-300 font-mono text-sm">{spot.hour}h</span>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-400">Idx: <strong className="text-[#6366f1]">{spot.index.toFixed(2)}</strong></span>
                    </div>
                    <div className="px-2 py-1 rounded bg-black/20 text-xs font-mono text-slate-300">
                      {spot.pressure.toFixed(1)} <span className="text-slate-600">cl/p</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-2">Nenhum coldspot detectado</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
        <div className="flex flex-col pl-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Aderência à Demanda</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${thermalMetrics.adherence >= 85 ? 'text-emerald-400' : 'text-[#E30613]'}`}>
              {thermalMetrics.adherence}%
            </span>
            <span className="text-xs text-slate-600">Target: &gt;85%</span>
          </div>
        </div>

        <div className="flex flex-col pl-2 border-l border-white/5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Oportunidade (Perda)</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${thermalMetrics.lostOpportunity === 0 ? 'text-emerald-400' : 'text-[#f43f5e]'}`}>
              {thermalMetrics.lostOpportunity}
            </span>
            <span className="text-xs text-slate-600">clientes est.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThermalPanel;
