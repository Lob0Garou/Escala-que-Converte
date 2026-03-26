import React from 'react';

const Card = ({ label, value, caption, accentClass = 'text-text-primary', shellClass = 'border-border/70' }) => (
  <article className={`group flex min-h-[150px] flex-col justify-between rounded-[24px] border bg-bg-surface/95 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-border ${shellClass}`}>
    <div className="space-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</span>
      <div className={`text-3xl font-semibold tracking-tight tabular-nums ${accentClass}`}>{value}</div>
    </div>
    <p className="text-sm leading-relaxed text-text-secondary">{caption}</p>
  </article>
);

export const KPICards = ({ dailyMetrics, revenueMetrics }) => {
  return (
    <section className="w-full">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-4 w-1 rounded-full bg-accent-main" />
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-primary">
          Indicadores-chave
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <Card
          label="Alerta de quedas"
          value={dailyMetrics?.criticalDrops || 0}
          caption={dailyMetrics?.horasCriticas?.length > 0 ? dailyMetrics.horasCriticas.join(', ') : 'Nenhum detectado'}
          shellClass={dailyMetrics?.criticalDrops > 0 ? 'border-red-brand/20' : 'border-border/70'}
        />

        <Card
          label="Menor conversão"
          value={`${dailyMetrics?.minConversion ? dailyMetrics.minConversion.toFixed(1) : 0}%`}
          caption="Mínimo do dia"
        />

        <Card
          label="Pico de fluxo"
          value={dailyMetrics?.maxFlow || 0}
          caption={`${dailyMetrics?.maxFlowHour || 'N/A'} (${dailyMetrics?.maxFlowPct || 0}%)`}
          accentClass="text-blue-brand group-hover:text-blue-600"
          shellClass="border-border/70"
        />

        <Card
          label="Menor cobertura"
          value={dailyMetrics?.minStaff || 0}
          caption={`Mínimo às ${dailyMetrics?.minStaffHour || 'N/A'}`}
          accentClass="text-red-brand group-hover:text-red-600"
          shellClass="border-border/70"
        />

        <Card
          label="Impacto estimado"
          value={
            revenueMetrics?.deltaRevenue != null
              ? revenueMetrics.deltaRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : '—'
          }
          caption={revenueMetrics ? 'Recuperado nas horas críticas' : 'Carregue dados de vendas'}
          accentClass="text-green-brand group-hover:text-green-600"
          shellClass="border-border/70"
        />
      </div>
    </section>
  );
};

export default KPICards;
