import React from 'react';
import { isSameDayName } from '../../lib/dayUtils';

export const SimpleDayCard = ({ dia, staffRows, onTimeClick }) => {
  const colabsDoDia = staffRows.filter((row) => isSameDayName(row.dia, dia) && row.nome !== '' && row.entrada);

  colabsDoDia.sort((a, b) => {
    const normalizeTime = (time) => {
      if (!time) return '23:59';
      return time.length === 4 ? `0${time}` : time;
    };

    const timeA = normalizeTime(a.entrada);
    const timeB = normalizeTime(b.entrada);

    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return a.nome.localeCompare(b.nome);
  });

  return (
    <div className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-[24px] border border-border/70 bg-bg-surface shadow-sm transition-colors hover:border-accent-border">
      <div className="flex items-center justify-between border-b border-border/70 bg-bg-elevated/80 px-4 py-3">
        <span className="text-sm font-semibold tracking-wide text-text-primary">{dia}</span>
        <span className="rounded-full border border-border/70 bg-bg-surface px-2.5 py-1 text-[10px] font-bold tabular-nums text-text-secondary">
          {colabsDoDia.length}
        </span>
      </div>

      <div className="flex-1 divide-y divide-border/70">
        {colabsDoDia.length > 0 ? (
          colabsDoDia.map((colab) => {
            const nameParts = colab.nome.split(' ');
            const firstName = nameParts[0];
            const surname = nameParts.slice(1).join(' ');

            return (
              <div key={colab.id} className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-bg-elevated/60">
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="truncate text-xs font-semibold leading-none text-text-primary sm:text-sm">
                    {firstName}
                  </span>
                  {surname && (
                    <span className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      {surname}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <div
                    className="group/time flex cursor-pointer flex-col items-center px-1.5"
                    onClick={() => onTimeClick(colab.id, 'entrada', colab.entrada)}
                  >
                    <span className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-text-muted transition-colors group-hover/time:text-accent-main">
                      Ent
                    </span>
                    <span className={`text-[11px] font-bold tabular-nums tracking-tight ${colab.entrada ? 'text-text-primary' : 'text-text-muted/50'}`}>
                      {colab.entrada || '--'}
                    </span>
                  </div>

                  <span className="text-[8px] font-bold text-text-muted">›</span>

                  <div
                    className="group/time flex cursor-pointer flex-col items-center px-1.5"
                    onClick={() => onTimeClick(colab.id, 'intervalo', colab.intervalo)}
                  >
                    <span className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-text-muted transition-colors group-hover/time:text-accent-main">
                      Int
                    </span>
                    <span className={`text-[11px] font-bold tabular-nums tracking-tight ${colab.intervalo ? 'text-text-secondary' : 'text-text-muted/50'}`}>
                      {colab.intervalo || '--'}
                    </span>
                  </div>

                  <span className="text-[8px] font-bold text-text-muted">›</span>

                  <div
                    className="group/time flex cursor-pointer flex-col items-center px-1.5"
                    onClick={() => onTimeClick(colab.id, 'saida', colab.saida)}
                  >
                    <span className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-text-muted transition-colors group-hover/time:text-accent-main">
                      Sai
                    </span>
                    <span className={`text-[11px] font-bold tabular-nums tracking-tight ${colab.saida ? 'text-text-primary' : 'text-text-muted/50'}`}>
                      {colab.saida || '--'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
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
