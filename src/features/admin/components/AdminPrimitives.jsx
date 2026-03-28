/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { ChevronDown } from 'lucide-react';

export const NATIVE_OPTION_STYLE = { color: '#111827', backgroundColor: '#ffffff' };

export const roleTone = {
  admin: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200',
  manager: 'border-sky-400/35 bg-sky-500/10 text-sky-100',
  viewer: 'border-zinc-400/35 bg-zinc-500/10 text-zinc-100',
  owner: 'border-amber-400/35 bg-amber-500/10 text-amber-100',
};

export const statusTone = {
  ativa: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200',
  ativo: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200',
  done: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200',
  processing: 'border-sky-400/35 bg-sky-500/10 text-sky-100',
  pending: 'border-amber-400/35 bg-amber-500/10 text-amber-100',
  warning: 'border-amber-400/35 bg-amber-500/10 text-amber-100',
  error: 'border-rose-400/35 bg-rose-500/10 text-rose-100',
  inativo: 'border-rose-400/35 bg-rose-500/10 text-rose-100',
  sem_eventos: 'border-zinc-400/35 bg-zinc-500/10 text-zinc-100',
  sem_uso_recente: 'border-amber-400/35 bg-amber-500/10 text-amber-100',
  principal: 'border-violet-400/35 bg-violet-500/10 text-violet-100',
  score_ok: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200',
  score_fallback: 'border-sky-400/35 bg-sky-500/10 text-sky-100',
  sem_score: 'border-rose-400/35 bg-rose-500/10 text-rose-100',
};

export const Panel = ({ title, subtitle, actions, children }) => (
  <section className="rounded-[30px] border border-border/60 bg-bg-surface/68 p-5 shadow-[0_18px_70px_rgba(6,10,25,0.16)] backdrop-blur-[28px] sm:p-6 lg:p-7">
    <div className="mb-5 flex flex-col gap-3 border-b border-border/55 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">
          Sessao admin
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">{title}</h2>
        <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
      </div>
      {actions || null}
    </div>
    {children}
  </section>
);

export const Box = ({ message, tone = 'neutral' }) => {
  const tones = {
    neutral: 'border-dashed border-border/70 bg-bg-elevated/60 text-text-secondary',
    error: 'border-rose-400/25 bg-rose-500/8 text-rose-100',
    success: 'border-emerald-400/25 bg-emerald-500/8 text-emerald-100',
  };

  return <div className={`rounded-3xl border px-4 py-3 text-sm ${tones[tone]}`}>{message}</div>;
};

export const Pill = ({ value, toneMap = statusTone }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
      toneMap[value] || 'border-border/70 bg-bg-elevated/80 text-text-secondary'
    }`}
  >
    {String(value || 'indefinido').replaceAll('_', ' ')}
  </span>
);

export const Input = (props) => (
  <input
    {...props}
    className="h-11 w-full rounded-2xl border border-border/70 bg-bg-elevated/80 px-4 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-main/60"
  />
);

export const Select = ({ value, onChange, options, placeholder = null }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full appearance-none rounded-2xl border border-border/70 bg-bg-surface px-4 pr-11 text-sm text-text-primary outline-none transition-colors [color-scheme:dark] focus:border-accent-main/60"
    >
      {placeholder && (
        <option value="" style={NATIVE_OPTION_STYLE}>
          {placeholder}
        </option>
      )}
      {options.map((option) => {
        const normalized = typeof option === 'string' ? { value: option, label: option } : option;

        return (
          <option key={normalized.value} value={normalized.value} style={NATIVE_OPTION_STYLE}>
            {normalized.label}
          </option>
        );
      })}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-text-muted">
      <ChevronDown className="h-4 w-4" />
    </div>
  </div>
);

export const ActionButton = ({ icon, label, onClick, disabled = false, tone = 'default' }) => {
  const Icon = icon;
  const toneClass =
    tone === 'primary'
      ? 'border-accent-main/50 bg-accent-main/12 text-text-primary hover:bg-accent-main/18'
      : 'border-border/70 bg-bg-elevated/85 text-text-primary hover:bg-bg-overlay/30';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
};

export const StatCard = ({ icon, label, value, hint, highlight = false }) => {
  const Icon = icon;

  return (
    <article
      className={`rounded-[28px] border p-5 shadow-[0_18px_60px_rgba(3,7,18,0.16)] backdrop-blur-2xl ${
        highlight
          ? 'border-accent-main/30 bg-[linear-gradient(135deg,rgba(227,6,19,0.12),rgba(255,255,255,0.03))]'
          : 'border-border/60 bg-bg-surface/72'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">{value}</p>
          <p className="mt-2 text-sm text-text-secondary">{hint}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-bg-elevated/90 text-text-primary shadow-sm">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
    </article>
  );
};

export const TabButton = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition-colors ${
      active
        ? 'border-accent-main/60 bg-accent-main/10 text-text-primary'
        : 'border-border/70 bg-bg-elevated/80 text-text-secondary hover:bg-bg-overlay/30 hover:text-text-primary'
    }`}
  >
    {label}
  </button>
);

export const DataTable = ({ columns, rows, emptyMessage, renderRow }) =>
  !rows.length ? (
    <Box message={emptyMessage} />
  ) : (
    <div className="overflow-hidden rounded-[26px] border border-border/60">
      <div className="custom-scroll overflow-x-auto">
        <table className="min-w-full divide-y divide-border/60">
          <thead className="bg-bg-elevated/88">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 bg-bg-surface/70">{rows.map(renderRow)}</tbody>
        </table>
      </div>
    </div>
  );

export const PaginationBar = ({ pageData, onPageChange }) => (
  <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border/60 bg-bg-elevated/60 px-4 py-3 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
    <p>
      {pageData.total} registro(s) · pagina {pageData.page} de {pageData.totalPages}
    </p>
    <div className="flex items-center gap-2">
      <button
        onClick={() => onPageChange(pageData.page - 1)}
        disabled={!pageData.hasPreviousPage}
        className="inline-flex h-9 items-center justify-center rounded-2xl border border-border/70 px-3 text-sm font-medium text-text-primary transition-colors hover:bg-bg-overlay/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Anterior
      </button>
      <button
        onClick={() => onPageChange(pageData.page + 1)}
        disabled={!pageData.hasNextPage}
        className="inline-flex h-9 items-center justify-center rounded-2xl border border-border/70 px-3 text-sm font-medium text-text-primary transition-colors hover:bg-bg-overlay/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Proxima
      </button>
    </div>
  </div>
);

export const Drawer = ({ children, onClose }) => (
  <div className="fixed inset-0 z-50 bg-bg-base/70 backdrop-blur-sm">
    <div className="flex h-full justify-end">
      <button className="flex-1" aria-label="Fechar painel" onClick={onClose} />
      <div className="custom-scroll h-full w-full max-w-[980px] overflow-y-auto border-l border-border/60 bg-bg-base/94 p-4 shadow-[0_0_80px_rgba(4,8,20,0.45)] sm:p-6">
        {children}
      </div>
    </div>
  </div>
);

export default {
  ActionButton,
  Box,
  DataTable,
  Drawer,
  Input,
  NATIVE_OPTION_STYLE,
  PageBar: PaginationBar,
  Panel,
  Pill,
  Select,
  StatCard,
  TabButton,
  roleTone,
  statusTone,
};
