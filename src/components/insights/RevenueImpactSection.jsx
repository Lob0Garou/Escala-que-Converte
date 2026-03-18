import React from 'react';
import { TrendingUp, Banknote, Percent, ShoppingBag, Coins } from 'lucide-react';

const RevenueCard = ({ title, value, subtext, icon, trend, trendValue, color }) => {
  const Icon = icon;
  return (
    <div className="bg-[#1a1e27] border border-white/5 rounded-xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-lg bg-${color}-500/10`}>
          <Icon className={`w-5 h-5 text-${color}-400 group-hover:text-${color}-300 transition-colors`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</span>
        <div className="text-2xl font-black text-white mt-1 tracking-tight">{value}</div>
        <p className="text-xs text-slate-500 mt-1 font-medium">{subtext}</p>
      </div>
    </div>
  );
};

export const RevenueImpactSection = ({ metrics, config }) => {
  if (!metrics) return null;

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide border-l-4 border-emerald-500 pl-3 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-emerald-400" />
          Impacto Financeiro da Escala
        </h3>
        {config.mode === 'CONSERVATIVE' && (
          <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Modo Conservador
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RevenueCard
          title="Receita Recuperada"
          value={metrics.totalRevenueRecovered.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          subtext="Ganho estimado em horas críticas"
          icon={Banknote}
          color="emerald"
          trend={metrics.totalRevenueRecovered >= 0 ? 'up' : 'down'}
          trendValue="Projetado"
        />

        <RevenueCard
          title="Cupons Adicionais"
          value={`+${metrics.totalAdditionalCoupons.toFixed(1)}`}
          subtext="Clientes a mais atendidos"
          icon={ShoppingBag}
          color="blue"
          trend="up"
          trendValue="Volume"
        />

        <RevenueCard
          title="Ganho do Dia"
          value={`+${metrics.totalRevenueRecovered.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
          subtext="Neste cenário de escala"
          icon={Coins}
          color="red"
        />

        <RevenueCard
          title="Var. Conversão"
          value={`${metrics.avgWeightedConversionDelta > 0 ? '+' : ''}${metrics.avgWeightedConversionDelta.toFixed(2)} pp`}
          subtext="Impacto na conversão (ponderado)"
          icon={Percent}
          color="purple"
          trend={metrics.avgWeightedConversionDelta >= 0 ? 'up' : 'down'}
          trendValue="Eficiência"
        />
      </div>
    </div>
  );
};

export default RevenueImpactSection;
