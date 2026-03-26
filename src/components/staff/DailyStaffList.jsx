import React from 'react';
import { isSameDayName } from '../../lib/dayUtils';

export const DailyStaffList = ({ staffRows, selectedDay, onTimeClick }) => {
  const colabsDoDia = staffRows.filter((row) => isSameDayName(row.dia, selectedDay) && row.nome !== '' && row.entrada);

  colabsDoDia.sort((a, b) => {
    const normalizeTime = (time) => {
      if (!time) return '23:59';
      return time.length === 4 ? `0${time}` : time;
    };

    const timeA = normalizeTime(a.entrada);
    const timeB = normalizeTime(b.entrada);

    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }
    return a.nome.localeCompare(b.nome);
  });

  return (
    <section className="flex h-fit flex-col overflow-hidden rounded-[28px] border border-border/70 bg-bg-surface/90 shadow-sm xl:max-h-[calc(100vh-9.5rem)]">
      <div className="border-b border-border/70 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Escala do dia
          </h3>
          <span className="rounded-full border border-border/70 bg-bg-elevated/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary tabular-nums">
            {colabsDoDia.length} total
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tracking-tight text-text-primary">{selectedDay}</span>
          <span className="text-xs font-medium text-text-muted">ocupação diária</span>
        </div>
      </div>

      <div className="custom-scroll flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-1.5">
          {colabsDoDia.length === 0 && (
            <div className="rounded-xl border border-border/70 bg-bg-elevated/50 px-3 py-5 text-center">
              <span className="text-xs font-medium text-text-muted">Sem colaboradores para este dia.</span>
            </div>
          )}

          {colabsDoDia.map((colab) => {
            const nameParts = colab.nome.split(' ');
            const firstName = nameParts[0];
            const surname = nameParts.slice(1).join(' ');

            return (
              <div
                key={colab.id}
                className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition-all hover:border-border/70 hover:bg-bg-elevated/60"
              >
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="truncate text-sm font-semibold leading-none text-text-primary">
                    {firstName}
                  </span>
                  {surname && (
                    <span className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      {surname}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="flex flex-col items-center px-1.5"
                    onClick={() => onTimeClick(colab.id, 'entrada', colab.entrada)}
                  >
                    <span className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-text-muted transition-colors group-hover:text-accent-main">
                      Ent
                    </span>
                    <span className={`text-[11px] font-bold tabular-nums tracking-tight ${colab.entrada ? 'text-text-primary' : 'text-text-muted/50'}`}>
                      {colab.entrada || '--:--'}
                    </span>
                  </div>

                  <div
                    className="flex flex-col items-center px-1.5"
                    onClick={() => onTimeClick(colab.id, 'intervalo', colab.intervalo)}
                  >
                    <span className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-text-muted transition-colors group-hover:text-accent-main">
                      Int
                    </span>
                    <span className={`text-[11px] font-bold tabular-nums tracking-tight ${colab.intervalo ? 'text-text-secondary' : 'text-text-muted/50'}`}>
                      {colab.intervalo || '--:--'}
                    </span>
                  </div>

                  <div
                    className="flex flex-col items-center px-1.5"
                    onClick={() => onTimeClick(colab.id, 'saida', colab.saida)}
                  >
                    <span className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-text-muted transition-colors group-hover:text-accent-main">
                      Sai
                    </span>
                    <span className={`text-[11px] font-bold tabular-nums tracking-tight ${colab.saida ? 'text-text-primary' : 'text-text-muted/50'}`}>
                      {colab.saida || '--:--'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DailyStaffList;
