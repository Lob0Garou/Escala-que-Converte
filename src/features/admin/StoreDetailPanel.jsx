import React, { useEffect, useMemo } from 'react';
import { Activity, CalendarRange, Download, MapPin, Store, Upload, Users, X } from 'lucide-react';
import { buildStoreDrilldownExportRows, isDateInRange } from '../../lib/adminConsole';
import { useAdminStoreDetails } from '../../hooks/useAdminData';
import { logActivity } from '../../services/activityService';

const fmtDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(value),
      )
    : 'Sem registro';

const fmtDate = (value) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
        new Date(`${value}T00:00:00`),
      )
    : 'Sem periodo';

const fmtMoney = (value) =>
  value === null || value === undefined
    ? 'N/A'
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      }).format(Number(value));

const fmtScore = (value) => (value === null || value === undefined ? 'N/A' : Number(value).toFixed(2));
const NATIVE_OPTION_STYLE = { color: '#111827', backgroundColor: '#ffffff' };

const toneMap = {
  admin: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200',
  manager: 'border-sky-400/35 bg-sky-500/10 text-sky-100',
  viewer: 'border-zinc-400/35 bg-zinc-500/10 text-zinc-100',
  owner: 'border-amber-400/35 bg-amber-500/10 text-amber-100',
  principal: 'border-violet-400/35 bg-violet-500/10 text-violet-100',
  done: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200',
  pending: 'border-amber-400/35 bg-amber-500/10 text-amber-100',
  processing: 'border-sky-400/35 bg-sky-500/10 text-sky-100',
  error: 'border-rose-400/35 bg-rose-500/10 text-rose-100',
};

const Pill = ({ value }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
      toneMap[value] || 'border-border/70 bg-bg-elevated/80 text-text-secondary'
    }`}
  >
    {value}
  </span>
);

const Box = ({ message, tone = 'neutral' }) => {
  const tones = {
    neutral: 'border-dashed border-border/70 bg-bg-elevated/60 text-text-secondary',
    error: 'border-rose-400/25 bg-rose-500/8 text-rose-100',
  };

  return <div className={`rounded-3xl border px-4 py-3 text-sm ${tones[tone]}`}>{message}</div>;
};

const MetricCard = ({ icon, label, value, hint }) => {
  const Icon = icon;

  return (
    <div className="rounded-[24px] border border-border/60 bg-bg-elevated/68 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">{value}</p>
          <p className="mt-1 text-xs text-text-secondary">{hint}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-bg-surface/80 text-text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="rounded-[24px] border border-border/60 bg-bg-elevated/58 p-4 shadow-sm">
    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text-primary">{title}</h3>
    <div className="mt-4">{children}</div>
  </div>
);

const StoreDetailPanel = ({
  enabled,
  storeId,
  storeOptions,
  dateRange,
  onExportRows,
  onStoreChange,
  onClose,
}) => {
  const details = useAdminStoreDetails(enabled, storeId);
  const filteredSchedules = useMemo(() => details.data.schedules.filter((item) => isDateInRange(item.updatedAt, dateRange)), [dateRange, details.data.schedules]);
  const filteredFlows = useMemo(() => details.data.flows.filter((item) => isDateInRange(item.updatedAt, dateRange)), [dateRange, details.data.flows]);
  const filteredUploads = useMemo(() => details.data.uploads.filter((item) => isDateInRange(item.createdAt, dateRange)), [dateRange, details.data.uploads]);
  const filteredActivity = useMemo(() => details.data.activity.filter((item) => isDateInRange(item.createdAt, dateRange)), [dateRange, details.data.activity]);
  const activeUsersInRange = useMemo(() => details.data.users.filter((item) => isDateInRange(item.lastSeenAt || item.lastLoginAt || item.createdAt, dateRange)).length, [dateRange, details.data.users]);

  useEffect(() => {
    if (!enabled || !storeId) return;

    void logActivity({
      action: 'admin_store_detail_opened',
      entityType: 'store',
      entityId: storeId,
      storeId,
      metadata: { path: '/admin' },
    });
  }, [enabled, storeId]);

  const handleExport = async () => {
    if (!details.data.store || !onExportRows) return;
    await onExportRows(
      'drilldown_loja_admin',
      buildStoreDrilldownExportRows({
        ...details.data,
        schedules: filteredSchedules,
        flows: filteredFlows,
        uploads: filteredUploads,
        activity: filteredActivity,
      }),
    );
  };

  if (!enabled || !storeId) return null;

  return (
    <section className="rounded-[30px] border border-border/60 bg-bg-surface/70 p-5 shadow-[0_18px_70px_rgba(6,10,25,0.16)] backdrop-blur-[28px] sm:p-6">
      <div className="flex flex-col gap-4 border-b border-border/55 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">
            Drill-down da loja
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
            {details.data.store
              ? details.data.store.storeCode
                ? `${details.data.store.storeCode} - ${details.data.store.storeName}`
                : details.data.store.storeName
              : 'Carregando detalhe'}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Usuarios vinculados, escalas, fluxos, uploads e atividade recente desta operacao.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleExport}
            disabled={details.loading || !details.data.store}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border/70 px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-overlay/30 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Exportar detalhe
          </button>
          <select
            value={storeId}
            onChange={(event) => onStoreChange(event.target.value)}
            className="h-11 appearance-none rounded-2xl border border-border/70 bg-bg-surface px-4 pr-10 text-sm text-text-primary outline-none transition-colors [color-scheme:dark] focus:border-accent-main/60"
          >
            {storeOptions.map((option) => (
              <option key={option.value} value={option.value} style={NATIVE_OPTION_STYLE}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border/70 px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-overlay/30 hover:text-text-primary"
          >
            <X className="h-4 w-4" />
            Fechar
          </button>
        </div>
      </div>

      {details.error ? (
        <div className="mt-5">
          <Box tone="error" message={details.error} />
        </div>
      ) : details.loading ? (
        <div className="mt-5">
          <Box message="Carregando detalhe da loja..." />
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              icon={Users}
              label="Usuarios"
              value={details.data.metrics.totalUsers}
              hint={`${activeUsersInRange} ativos no recorte`}
            />
            <MetricCard
              icon={CalendarRange}
              label="Escalas"
              value={filteredSchedules.length}
              hint="Escalas no recorte"
            />
            <MetricCard
              icon={Activity}
              label="Fluxos"
              value={filteredFlows.length}
              hint="Fluxos no recorte"
            />
            <MetricCard
              icon={Upload}
              label="Uploads"
              value={filteredUploads.length}
              hint="Uploads no recorte"
            />
            <MetricCard
              icon={Store}
              label="Ultima atividade"
              value={details.data.store?.lastActivityAt ? 'Ativa' : 'Sem eventos'}
              hint={fmtDateTime(details.data.store?.lastActivityAt)}
            />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Section title="Contexto da loja">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Regional</p>
                  <p className="mt-2 text-sm text-text-primary">{details.data.store?.regionalId || 'Nao informada'}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Criada em</p>
                  <p className="mt-2 text-sm text-text-primary">{fmtDateTime(details.data.store?.createdAt)}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3 sm:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Localidade</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-text-primary">
                    <MapPin className="h-4 w-4 text-text-muted" />
                    {[details.data.store?.city, details.data.store?.state].filter(Boolean).join(' - ') ||
                      'Localidade nao informada'}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Atividade recente">
              {!filteredActivity.length ? (
                <Box message="Nenhum evento recente para esta loja." />
              ) : (
                <div className="space-y-3">
                  {filteredActivity.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-text-primary">{item.action}</p>
                        <p className="text-xs text-text-muted">{fmtDateTime(item.createdAt)}</p>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {item.userName} - {item.entityType}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Section title="Usuarios vinculados">
              {!details.data.users.length ? (
                <Box message="Nenhum usuario vinculado a esta loja." />
              ) : (
                <div className="space-y-3">
                  {details.data.users.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{item.name}</p>
                          <p className="mt-1 text-sm text-text-secondary">{item.email}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Pill value={item.platformRole} />
                          <Pill value={item.membershipRole} />
                          {item.isPrimary && <Pill value="principal" />}
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-text-muted">
                        Ultimo login: {fmtDateTime(item.lastLoginAt)} - Ultima atividade: {fmtDateTime(item.lastSeenAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Uploads recentes">
              {!filteredUploads.length ? (
                <Box message="Nenhum upload encontrado para esta loja." />
              ) : (
                <div className="space-y-3">
                  {filteredUploads.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{item.fileName}</p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {item.userName} - {item.type}
                          </p>
                        </div>
                        <Pill value={item.status} />
                      </div>
                      <p className="mt-3 text-xs text-text-muted">{fmtDateTime(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Section title="Escalas recentes">
              {!filteredSchedules.length ? (
                <Box message="Nenhuma escala salva para esta loja." />
              ) : (
                <div className="space-y-3">
                  {filteredSchedules.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {fmtDate(item.periodStart)} - {fmtDate(item.periodEnd)}
                          </p>
                          <p className="mt-1 text-sm text-text-secondary">{item.responsibleUser}</p>
                        </div>
                        <p className="text-xs text-text-muted">{fmtDateTime(item.updatedAt)}</p>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <p className="text-xs text-text-secondary">Score atual: {fmtScore(item.scoreCurrent)}</p>
                        <p className="text-xs text-text-secondary">Score alvo: {fmtScore(item.scoreIdeal)}</p>
                        <p className="text-xs text-text-secondary">Ganho potencial: {fmtMoney(item.potentialGain)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Fluxos recentes">
              {!filteredFlows.length ? (
                <Box message="Nenhum fluxo persistido para esta loja." />
              ) : (
                <div className="space-y-3">
                  {filteredFlows.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {fmtDate(item.periodStart)} - {fmtDate(item.periodEnd)}
                          </p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {item.sourceType} - {item.responsibleUser}
                          </p>
                        </div>
                        <p className="text-xs text-text-muted">{fmtDateTime(item.updatedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </>
      )}
    </section>
  );
};

export default StoreDetailPanel;
