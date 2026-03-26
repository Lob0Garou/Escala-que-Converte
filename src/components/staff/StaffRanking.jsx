import { useMemo } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { calculateStaffPerformance } from '../../lib/staffPerformance.js';

export default function StaffRanking({ staffRows, cuponsData, selectedDay, diasSemana }) {
  const ranking = useMemo(() => {
    return calculateStaffPerformance(staffRows, cuponsData, selectedDay, diasSemana);
  }, [staffRows, cuponsData, selectedDay, diasSemana]);

  const stats = useMemo(() => {
    if (!ranking.length) return { best: null, avg: 0, worst: null };
    const avg = ranking.reduce((a, r) => a + r.conversion, 0) / ranking.length;
    return { best: ranking[0], avg, worst: ranking[ranking.length - 1] };
  }, [ranking]);

  const medalColors = ['text-amber-500', 'text-zinc-400', 'text-orange-500'];
  const medalBg = ['bg-amber-500/15', 'bg-zinc-400/15', 'bg-orange-500/15'];

  if (!ranking.length) {
    return (
      <section className="panel-surface p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-primary">
            Ranking de vendedores
          </h3>
        </div>
        <p className="text-sm font-medium italic text-text-muted">Sem dados para o dia selecionado.</p>
      </section>
    );
  }

  return (
    <section className="panel-surface p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/10">
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-text-primary">Ranking diário</h3>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">{selectedDay}</p>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-center">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-500">Melhor</p>
          {stats.best && (
            <>
              <p className="truncate text-sm font-semibold leading-tight text-text-primary">{stats.best.name}</p>
              <p className="text-xs font-semibold tabular-nums text-amber-500">{stats.best.conversion.toFixed(1)}%</p>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-bg-elevated/70 p-3 text-center">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">Média</p>
          <p className="text-sm font-semibold tabular-nums text-text-primary">{stats.avg.toFixed(1)}%</p>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-500">Pior</p>
          {stats.worst && (
            <>
              <p className="truncate text-sm font-semibold leading-tight text-text-primary">{stats.worst.name}</p>
              <p className="text-xs font-semibold tabular-nums text-red-500">{stats.worst.conversion.toFixed(1)}%</p>
            </>
          )}
        </div>
      </div>

      <div className="custom-scroll max-h-[320px] space-y-2 overflow-y-auto pr-1">
        {ranking.map((seller, idx) => {
          const pos = idx + 1;
          const delta = seller.delta;

          let deltaColor = 'text-text-muted bg-bg-elevated';
          let DeltaIcon = Minus;
          if (delta > 0.5) {
            deltaColor = 'text-green-brand bg-green-bg';
            DeltaIcon = TrendingUp;
          } else if (delta < -0.5) {
            deltaColor = 'text-red-brand bg-red-bg';
            DeltaIcon = TrendingDown;
          }

          return (
            <div
              key={seller.id ?? seller.name}
              className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition-all hover:border-border/70 hover:bg-bg-elevated/60"
            >
              {pos <= 3 ? (
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${medalBg[pos - 1]}`}>
                  <span className={`text-xs font-semibold ${medalColors[pos - 1]}`}>{pos}</span>
                </div>
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-bg-elevated">
                  <span className="text-xs font-semibold text-text-muted">{pos}</span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">{seller.name}</p>
                <p className="mt-0.5 text-[10px] font-medium text-text-secondary">
                  {seller.hoursWorked}h · <span className="font-semibold tabular-nums">{seller.totalFlow}</span> fluxo
                </p>
              </div>

              <div className="mr-2 text-right">
                <p className="text-sm font-semibold tracking-tight tabular-nums text-text-primary">{seller.conversion.toFixed(1)}%</p>
              </div>

              <div className={`flex min-w-[64px] items-center justify-center gap-0.5 rounded-xl px-2 py-1 ${deltaColor}`}>
                <DeltaIcon className="h-3 w-3" />
                <span className="text-[10px] font-semibold tabular-nums">
                  {delta > 0 ? '+' : ''}
                  {delta.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
