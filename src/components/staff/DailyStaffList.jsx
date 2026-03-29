import React, { useEffect, useMemo, useState } from 'react';
import { Check, Minus, PencilLine, Plus } from 'lucide-react';
import { isSameDayName } from '../../lib/dayUtils';

export const DailyStaffList = ({
  staffRows,
  selectedDay,
  onTimeClick,
  onAddStaffRow,
  onRemoveStaffRow,
  onUpdateStaffRow,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setIsEditing(false);
  }, [selectedDay]);

  const colabsDoDia = useMemo(() => {
    const rowsDoDia = staffRows.filter((row) => isSameDayName(row.dia, selectedDay));
    const visibleRows = isEditing
      ? rowsDoDia
      : rowsDoDia.filter((row) => row.nome !== '' && row.entrada);

    return [...visibleRows].sort((a, b) => {
      const normalizeTime = (time) => {
        if (!time) return '23:59';
        return time.length === 4 ? `0${time}` : time;
      };

      const timeA = normalizeTime(a.entrada);
      const timeB = normalizeTime(b.entrada);

      if (timeA !== timeB) {
        return timeA.localeCompare(timeB);
      }
      return (a.nome || '').localeCompare(b.nome || '');
    });
  }, [isEditing, selectedDay, staffRows]);

  return (
    <section className="flex h-fit flex-col overflow-hidden rounded-[28px] border border-border/70 bg-bg-surface/90 shadow-sm xl:max-h-[calc(100vh-9.5rem)]">
      <div className="border-b border-border/70 px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Escala do dia
          </h3>

          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={onAddStaffRow}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-bg-elevated/80 text-text-primary transition-colors hover:border-accent-border hover:bg-bg-elevated"
                aria-label="Adicionar colaborador"
                title="Adicionar colaborador"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsEditing((value) => !value)}
              className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                isEditing
                  ? 'border-accent-border bg-accent-light/70 text-text-primary'
                  : 'border-border/70 bg-bg-elevated/80 text-text-secondary hover:text-text-primary'
              }`}
            >
              {isEditing ? <Check className="h-3.5 w-3.5" /> : <PencilLine className="h-3.5 w-3.5" />}
              {isEditing ? 'Concluir' : 'Editar'}
            </button>

            <span className="rounded-full border border-border/70 bg-bg-elevated/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary tabular-nums">
              {colabsDoDia.filter((row) => row.nome !== '' && row.entrada).length} total
            </span>
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tracking-tight text-text-primary">{selectedDay}</span>
          <span className="text-xs font-medium text-text-muted">ocupacao diaria</span>
        </div>
      </div>

      <div className="custom-scroll flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-1.5">
          {colabsDoDia.length === 0 && (
            <div className="rounded-xl border border-border/70 bg-bg-elevated/50 px-3 py-5 text-center">
              <span className="text-xs font-medium text-text-muted">
                {isEditing ? 'Clique em + para adicionar colaboradores a este dia.' : 'Sem colaboradores para este dia.'}
              </span>
            </div>
          )}

          {colabsDoDia.map((colab) => {
            const nameParts = (colab.nome || '').trim().split(' ').filter(Boolean);
            const firstName = nameParts[0] || '';
            const surname = nameParts.slice(1).join(' ');

            return (
              <div
                key={colab.id}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition-all hover:border-border/70 hover:bg-bg-elevated/60"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => onRemoveStaffRow(colab.id)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-bg-elevated/80 text-text-secondary transition-colors hover:border-red-500/30 hover:bg-red-bg hover:text-red-brand"
                      aria-label={`Remover ${colab.nome || 'colaborador'}`}
                      title="Remover colaborador"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}

                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    {isEditing ? (
                      <input
                        type="text"
                        value={colab.nome || ''}
                        onChange={(event) => onUpdateStaffRow(colab.id, 'nome', event.target.value)}
                        placeholder="Nome do colaborador"
                        className="h-9 w-full rounded-xl border border-border/70 bg-bg-base px-3 text-sm font-semibold text-text-primary placeholder:text-text-muted focus:border-accent-main focus:outline-none focus:ring-4 focus:ring-accent-main/10"
                      />
                    ) : (
                      <>
                        <span className="truncate text-sm font-semibold leading-none text-text-primary">
                          {firstName || 'Sem nome'}
                        </span>
                        {surname && (
                          <span className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                            {surname}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="flex cursor-pointer flex-col items-center px-1.5"
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
                    className="flex cursor-pointer flex-col items-center px-1.5"
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
                    className="flex cursor-pointer flex-col items-center px-1.5"
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
