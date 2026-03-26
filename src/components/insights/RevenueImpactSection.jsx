import React from 'react';
import { TrendingUp, Banknote, Percent, ShoppingBag, Coins } from 'lucide-react';

const COLOR_MAP = {
  emerald: {
    iconWrap: 'bg-emerald-500/10',
    icon: 'text-emerald-600',
    iconHover: 'group-hover:text-emerald-500',
  },
  blue: {
    iconWrap: 'bg-blue-500/10',
    icon: 'text-blue-600',
    iconHover: 'group-hover:text-blue-500',
  },
  red: {
    iconWrap: 'bg-red-500/10',
    icon: 'text-red-600',
    iconHover: 'group-hover:text-red-500',
  },
  violet: {
    iconWrap: 'bg-violet-500/10',
    icon: 'text-violet-600',
    iconHover: 'group-hover:text-violet-500',
  },
};

const TREND_MAP = {
  up: 'bg-emerald-500/10 text-emerald-600',
  down: 'bg-rose-500/10 text-rose-600',
};

const RevenueCard = ({ title, value, subtext, icon, trend, trendValue, tone }) => {
  const Icon = icon;
  const toneClass = COLOR_MAP[tone] ?? COLOR_MAP.emerald;

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-border/70 bg-bg-surface/85 p-4 transition-all hover:border-accent-border sm:p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-xl p-2.5 ${toneClass.iconWrap}`}>
          <Icon className={`h-5 w-5 transition-colors ${toneClass.icon} ${toneClass.iconHover}`} />
        </div>
        {trend && (
          <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${TREND_MAP[trend] ?? TREND_MAP.up}`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
            {trendValue}
          </div>
        )}
      </div>

      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">{title}</span>
        <div className="mt-1 text-2xl font-black tracking-tight text-text-primary">{value}</div>
        <p className="mt-1 text-xs font-medium text-text-muted">{subtext}</p>
      </div>
    </article>
  );
};

export const RevenueImpactSection = ({ metrics, config }) => {
  if (!metrics) return null;

  return (
    <section className="panel-surface w-full p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="flex items-center gap-2 border-l-4 border-green-brand pl-3 text-sm font-semibold uppercase tracking-wide text-text-primary">
          <Banknote className="h-4 w-4 text-green-brand" />
          Impacto Financeiro da Escala
        </h3>
        {config.mode === 'CONSERVATIVE' && (
          <span className="rounded-full border border-border/70 bg-bg-elevated px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
            Modo Conservador
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <RevenueCard
          title="Receita Recuperada"
          value={metrics.totalRevenueRecovered.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          subtext="Ganho estimado em horas criticas"
          icon={Banknote}
          tone="emerald"
          trend={metrics.totalRevenueRecovered >= 0 ? 'up' : 'down'}
          trendValue="Projetado"
        />

        <RevenueCard
          title="Cupons Adicionais"
          value={`+${metrics.totalAdditionalCoupons.toFixed(1)}`}
          subtext="Clientes adicionais atendidos"
          icon={ShoppingBag}
          tone="blue"
          trend="up"
          trendValue="Volume"
        />

        <RevenueCard
          title="Ganho do Dia"
          value={`+${metrics.totalRevenueRecovered.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
          subtext="Neste cenario de escala"
          icon={Coins}
          tone="red"
        />

        <RevenueCard
          title="Var. Conversao"
          value={`${metrics.avgWeightedConversionDelta > 0 ? '+' : ''}${metrics.avgWeightedConversionDelta.toFixed(2)} pp`}
          subtext="Impacto na conversao ponderada"
          icon={Percent}
          tone="violet"
          trend={metrics.avgWeightedConversionDelta >= 0 ? 'up' : 'down'}
          trendValue="Eficiencia"
        />
      </div>
    </section>
  );
};

export default RevenueImpactSection;
