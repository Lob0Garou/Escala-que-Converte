import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import VortexBackdrop from './VortexBackdrop';

export const AuthBrandMark = () => (
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-bg-surface shadow-sm">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-text-primary">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    </div>
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">Escala que Converte</p>
      <p className="text-sm font-semibold tracking-tight text-text-primary">Plataforma executiva</p>
    </div>
  </div>
);

const AuthShell = ({ eyebrow, title, description, metrics = [], children }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-bg-base text-text-primary">
      <VortexBackdrop
        className="z-0"
        imageClassName="opacity-[0.22] brightness-[1.08] contrast-[1.12] saturate-[1.15] sm:opacity-[0.28] lg:opacity-[0.34]"
        overlayClassName="bg-bg-base/72 sm:bg-bg-base/64 lg:bg-bg-base/56"
        accentClassName="bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.08),transparent_34%),radial-gradient(circle_at_top_right,rgba(22,163,74,0.05),transparent_32%),linear-gradient(180deg,rgba(17,17,19,0.08),transparent_22%)]"
      />
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-60" />
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Alternar tema"
        className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-bg-surface text-text-muted shadow-sm transition-colors hover:bg-bg-elevated hover:text-text-primary sm:right-6 sm:top-6"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="page-shell relative z-10 flex min-h-screen items-center justify-center py-8 sm:py-10 lg:py-12">
        <div className="grid w-full max-w-[1180px] items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:gap-10 xl:gap-14">
          <section className="rounded-[34px] border border-border/60 bg-bg-surface/60 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.10)] backdrop-blur-2xl sm:bg-bg-surface/56 sm:p-8 lg:bg-bg-surface/52 lg:p-10 xl:p-12">
            <AuthBrandMark />

            <div className="mt-8 max-w-[640px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-text-muted">{eyebrow}</p>
              <h1 className="mt-4 text-4xl font-semibold leading-[0.96] tracking-tight text-text-primary sm:text-5xl xl:text-[3.6rem]">
                {title}
              </h1>
              <p className="mt-5 max-w-[560px] text-base leading-relaxed text-text-secondary sm:text-lg">
                {description}
              </p>
            </div>

            {metrics.length > 0 && (
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {metrics.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/60 bg-bg-base/56 px-4 py-3 backdrop-blur-xl sm:bg-bg-base/52 lg:bg-bg-base/48">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold tracking-tight text-text-primary">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
