import React from 'react';
import { isSameDayName } from '../../lib/dayUtils';

const formatScore = (value) => (Number.isFinite(value) ? Number(value).toFixed(1) : '--');

export const SimpleDayCard = ({ dia, staffRows, onTimeClick, dayScoreSummary = null }) => {
  const colabsDoDia = staffRows
    .filter((row) => isSameDayName(row.dia, dia) && String(row.nome || '').trim() && row.entrada)
    .sort((left, right) => {
      const normalizeTime = (time) => {
        if (!time) return '23:59';
        return time.length === 4 ? `0${time}` : time;
      };

      const timeLeft = normalizeTime(left.entrada);
      const timeRight = normalizeTime(right.entrada);

      if (timeLeft !== timeRight) return timeLeft.localeCompare(timeRight);
      return left.nome.localeCompare(right.nome);
    });

  return (
    <div className="flex h-full min-h-[260px] flex-col overflow-hidden rounded-[24px] border border-border/70 bg-bg-surface shadow-sm transition-colors hover:border-accent-border">
      <div className="border-b border-border/70 bg-bg-elevated/80 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-sm font-semibold tracking-wide text-text-primary">{dia}</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-border/70 bg-bg-surface px-2 py-0.5 text-[9px] font-bold tabular-nums text-text-secondary">
                Score {formatScore(dayScoreSummary?.currentScore)}
              </span>
              {Number.isFinite(dayScoreSummary?.baselineScore) && (
                <span className="rounded-full border border-border/70 bg-bg-surface px-2 py-0.5 text-[9px] font-bold tabular-nums text-text-muted">
                  Base {formatScore(dayScoreSummary?.baselineScore)}
                </span>
              )}
            </div>
          </div>

          <span className="rounded-full border border-border/70 bg-bg-surface px-2.5 py-1 text-[10px] font-bold tabular-nums text-text-secondary">
            {colabsDoDia.length}
          </span>
        </div>
      </div>

      <div className="flex-1 divide-y divide-border/70">
        {colabsDoDia.length > 0 ? (
          colabsDoDia.map((colab) => (
            <div key={colab.id} className="group px-4 py-3 transition-colors hover:bg-bg-elevated/60">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold leading-tight text-text-primary">
                  {colab.nome}
                </p>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { label: 'Ent', field: 'entrada', value: colab.entrada },
                  { label: 'Int', field: 'intervalo', value: colab.intervalo },
                  { label: 'Sai', field: 'saida', value: colab.saida },
                ].map((item) => (
                  <button
                    key={`${colab.id}-${item.field}`}
                    type="button"
                    onClick={() => onTimeClick(colab.id, item.field, item.value)}
                    className="rounded-2xl border border-border/70 bg-bg-surface/70 px-3 py-2 text-left transition-colors hover:border-accent-border hover:bg-bg-elevated"
                  >
                    <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-text-muted">
                      {item.label}
                    </span>
                    <span className={`mt-1 block text-sm font-semibold tabular-nums ${item.value ? 'text-text-primary' : 'text-text-muted/50'}`}>
                      {item.value || '--'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
              Sem escala
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleDayCard;
