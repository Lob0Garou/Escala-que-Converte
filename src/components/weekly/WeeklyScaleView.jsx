import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import SimpleDayCard from './SimpleDayCard';
import { ORDERED_WEEK_DAYS } from '../../lib/dayUtils';

export const WeeklyScaleView = ({ staffRows, onTimeClick, theme }) => {
  const [localTheme, setLocalTheme] = useState(() => (
    theme
      ? theme
      : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  ));

  useEffect(() => {
    if (theme === 'dark' || theme === 'light') {
      setLocalTheme(theme);
    }
  }, [theme]);

  const handleGenerate = (selectedTheme) => {
    window.dispatchEvent(new CustomEvent('update-print-theme', { detail: selectedTheme }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('generate-weekly-image'));
    }, 100);
  };

  return (
    <section className="rounded-[28px] border border-border/70 bg-bg-surface/90 p-5 shadow-sm sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-bg-elevated/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            Escala semanal
          </div>
          <h3 className="text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">
            Distribuicao da semana
          </h3>
          <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
            A visualizacao lateral reforca a leitura diaria sem comprimir a area analitica principal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-border/70 bg-bg-elevated/80 p-1">
            <button
              onClick={() => setLocalTheme('light')}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all ${
                localTheme === 'light'
                  ? 'bg-bg-surface text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setLocalTheme('dark')}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all ${
                localTheme === 'dark'
                  ? 'bg-text-primary text-bg-surface shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Dark
            </button>
          </div>

          <button
            id="btn-gen-img"
            onClick={() => handleGenerate(localTheme)}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border/70 bg-bg-surface px-4 text-xs font-semibold uppercase tracking-wide text-text-primary shadow-sm transition-colors hover:border-accent-border hover:bg-bg-elevated"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar PNG
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 2xl:gap-5">
        {ORDERED_WEEK_DAYS.map((dia) => (
          <SimpleDayCard key={dia} dia={dia} staffRows={staffRows} onTimeClick={onTimeClick} />
        ))}
      </div>
    </section>
  );
};

export default WeeklyScaleView;
