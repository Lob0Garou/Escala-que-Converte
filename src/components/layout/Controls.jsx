import React from 'react';
import { Upload } from 'lucide-react';

export const Controls = ({ selectedDay, setSelectedDay, setShowUploadSection }) => (
  <div className="z-30 border-b border-border/70 bg-bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-bg-surface/80">
    <div className="page-shell flex w-full flex-col gap-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">
          Leitura por dia
        </span>

        <div className="custom-scroll flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border/70 bg-bg-elevated/80 p-1">
          {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].map((day) => {
            const fullDay = {
              SEG: 'SEGUNDA',
              TER: 'TERÇA',
              QUA: 'QUARTA',
              QUI: 'QUINTA',
              SEX: 'SEXTA',
              SAB: 'SÁBADO',
              DOM: 'DOMINGO',
            }[day];
            const isActive = selectedDay === fullDay;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(fullDay)}
                className={`min-w-[48px] rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-200 ${
                  isActive
                    ? 'bg-text-primary text-bg-surface shadow-sm'
                    : 'text-text-secondary hover:bg-bg-overlay/40 hover:text-text-primary'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 lg:ml-auto">
        <button
          onClick={() => setShowUploadSection((prev) => !prev)}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border/70 bg-bg-surface px-4 text-xs font-semibold uppercase tracking-wide text-text-primary shadow-sm transition-all hover:border-accent-border hover:bg-bg-elevated"
        >
          <Upload className="h-3.5 w-3.5 text-text-secondary" />
          <span>Importar dados</span>
        </button>
      </div>
    </div>
  </div>
);

export default Controls;
