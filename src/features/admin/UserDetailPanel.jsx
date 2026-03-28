import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarRange, Download, ShieldCheck, Store, Upload, X } from 'lucide-react';
import { buildUserDrilldownExportRows, isDateInRange } from '../../lib/adminConsole';
import { useAdminUserDetails } from '../../hooks/useAdminData';
import adminService from '../../services/adminService';
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
  ativo: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200',
  inativo: 'border-rose-400/35 bg-rose-500/10 text-rose-100',
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

const UserDetailPanel = ({
  enabled,
  userId,
  userOptions,
  dateRange,
  onExportRows,
  onProfileUpdated,
  onUserChange,
  onClose,
}) => {
  const details = useAdminUserDetails(enabled, userId);
  const [fullName, setFullName] = useState('');
  const [mirroredEmail, setMirroredEmail] = useState('');
  const [profileActive, setProfileActive] = useState(true);
  const [primaryStoreId, setPrimaryStoreId] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const filteredSchedules = useMemo(() => details.data.schedules.filter((item) => isDateInRange(item.updatedAt, dateRange)), [dateRange, details.data.schedules]);
  const filteredFlows = useMemo(() => details.data.flows.filter((item) => isDateInRange(item.updatedAt, dateRange)), [dateRange, details.data.flows]);
  const filteredUploads = useMemo(() => details.data.uploads.filter((item) => isDateInRange(item.createdAt, dateRange)), [dateRange, details.data.uploads]);
  const filteredActivity = useMemo(() => details.data.activity.filter((item) => isDateInRange(item.createdAt, dateRange)), [dateRange, details.data.activity]);
  const primaryStoreOptions = useMemo(() => details.data.stores.map((item) => ({ value: item.id, label: item.storeCode ? `${item.storeCode} - ${item.storeName}` : item.storeName })), [details.data.stores]);

  useEffect(() => {
    if (!enabled || !userId) return;

    void logActivity({
      action: 'admin_user_detail_opened',
      entityType: 'profile',
      entityId: userId,
      metadata: { path: '/admin' },
    });
  }, [enabled, userId]);

  useEffect(() => {
    if (!details.data.user) return;

    setFullName(details.data.user.name || '');
    setMirroredEmail(details.data.user.email || '');
    setProfileActive(details.data.user.isActive ?? true);
    setPrimaryStoreId(details.data.user.primaryStoreId || '');
    setSaveError('');
    setSaveMessage('');
  }, [details.data.user]);

  const handleSaveProfile = async () => {
    setSaveBusy(true);
    setSaveError('');
    setSaveMessage('');

    try {
      await adminService.updateAdminUserProfile(userId, {
        fullName,
        email: mirroredEmail,
        isActive: profileActive,
        primaryStoreId: primaryStoreId || null,
        setPrimaryStore: true,
      });

      await Promise.all([
        details.refresh(),
        onProfileUpdated ? onProfileUpdated() : Promise.resolve(),
      ]);

      setSaveMessage('Perfil atualizado com sucesso.');
    } catch (error) {
      setSaveError(error?.message || 'Falha ao atualizar o perfil.');
    } finally {
      setSaveBusy(false);
    }
  };

  const handleExport = async () => {
    if (!details.data.user || !onExportRows) return;
    await onExportRows(
      'drilldown_usuario_admin',
      buildUserDrilldownExportRows({
        ...details.data,
        schedules: filteredSchedules,
        flows: filteredFlows,
        uploads: filteredUploads,
        activity: filteredActivity,
      }),
    );
  };

  if (!enabled || !userId) return null;

  return (
    <section className="rounded-[30px] border border-border/60 bg-bg-surface/70 p-5 shadow-[0_18px_70px_rgba(6,10,25,0.16)] backdrop-blur-[28px] sm:p-6">
      <div className="flex flex-col gap-4 border-b border-border/55 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">
            Drill-down do usuario
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
            {details.data.user?.name || 'Carregando usuario'}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Perfil, lojas vinculadas, alteracoes, uploads e historico operacional desta conta.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleExport}
            disabled={details.loading || !details.data.user}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border/70 px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-overlay/30 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Exportar detalhe
          </button>
          <select
            value={userId}
            onChange={(event) => onUserChange(event.target.value)}
            className="h-11 appearance-none rounded-2xl border border-border/70 bg-bg-surface px-4 pr-10 text-sm text-text-primary outline-none transition-colors [color-scheme:dark] focus:border-accent-main/60"
          >
            {userOptions.map((option) => (
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
          <Box message="Carregando detalhe do usuario..." />
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              icon={Store}
              label="Lojas"
              value={details.data.metrics.totalStores}
              hint="Escopos vinculados"
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
              icon={ShieldCheck}
              label="Eventos"
              value={filteredActivity.length}
              hint="Atividade no recorte"
            />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Section title="Perfil e acesso">
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{details.data.user?.name}</p>
                  <p className="mt-1 text-sm text-text-secondary">{details.data.user?.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill value={details.data.user?.platformRole} />
                    <Pill value={details.data.user?.isActive ? 'ativo' : 'inativo'} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Criado em</p>
                    <p className="mt-2 text-sm text-text-primary">{fmtDateTime(details.data.user?.createdAt)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Ultimo login</p>
                    <p className="mt-2 text-sm text-text-primary">{fmtDateTime(details.data.user?.lastLoginAt)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Ultimo uso</p>
                    <p className="mt-2 text-sm text-text-primary">{fmtDateTime(details.data.user?.lastSeenAt)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Ultima atividade</p>
                    <p className="mt-2 text-sm text-text-primary">{fmtDateTime(details.data.user?.lastActivityAt)}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Acoes operacionais</p>
                  <div className="mt-4 grid gap-3">
                    <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nome completo" className="h-11 w-full rounded-2xl border border-border/70 bg-bg-elevated/80 px-4 text-sm text-text-primary outline-none transition-colors focus:border-accent-main/60" />
                    <input value={mirroredEmail} onChange={(event) => setMirroredEmail(event.target.value)} placeholder="Email espelhado do perfil" className="h-11 w-full rounded-2xl border border-border/70 bg-bg-elevated/80 px-4 text-sm text-text-primary outline-none transition-colors focus:border-accent-main/60" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select value={profileActive ? 'ativo' : 'inativo'} onChange={(event) => setProfileActive(event.target.value === 'ativo')} className="h-11 appearance-none rounded-2xl border border-border/70 bg-bg-surface px-4 pr-10 text-sm text-text-primary outline-none transition-colors [color-scheme:dark] focus:border-accent-main/60">
                        <option value="ativo" style={NATIVE_OPTION_STYLE}>Acesso ativo</option>
                        <option value="inativo" style={NATIVE_OPTION_STYLE}>Acesso inativo</option>
                      </select>
                      <select value={primaryStoreId} onChange={(event) => setPrimaryStoreId(event.target.value)} className="h-11 appearance-none rounded-2xl border border-border/70 bg-bg-surface px-4 pr-10 text-sm text-text-primary outline-none transition-colors [color-scheme:dark] focus:border-accent-main/60">
                        <option value="" style={NATIVE_OPTION_STYLE}>Sem loja principal</option>
                        {primaryStoreOptions.map((option) => (
                          <option key={option.value} value={option.value} style={NATIVE_OPTION_STYLE}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-text-muted">
                      O email acima ajusta o espelho de governanca no perfil. Nao altera o login do Supabase Auth.
                    </p>
                    {saveError && <Box tone="error" message={saveError} />}
                    {saveMessage && <Box message={saveMessage} />}
                    <button onClick={handleSaveProfile} disabled={saveBusy || !details.data.user} className="inline-flex h-11 items-center justify-center rounded-2xl border border-border/70 bg-bg-elevated/85 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-bg-overlay/30 disabled:cursor-not-allowed disabled:opacity-40">
                      {saveBusy ? 'Salvando...' : 'Salvar ajustes do perfil'}
                    </button>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Atividade recente">
              {!filteredActivity.length ? (
                <Box message="Nenhum evento recente para este usuario." />
              ) : (
                <div className="space-y-3">
                  {filteredActivity.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-text-primary">{item.action}</p>
                        <p className="text-xs text-text-muted">{fmtDateTime(item.createdAt)}</p>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {item.entityType}
                        {item.storeName
                          ? ` - ${item.storeCode ? `${item.storeCode} - ` : ''}${item.storeName}`
                          : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Section title="Lojas vinculadas">
              {!details.data.stores.length ? (
                <Box message="Nenhuma loja vinculada a este usuario." />
              ) : (
                <div className="space-y-3">
                  {details.data.stores.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {item.storeCode ? `${item.storeCode} - ${item.storeName}` : item.storeName}
                          </p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {[item.city, item.state].filter(Boolean).join(' - ') || 'Localidade nao informada'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Pill value={item.role} />
                          {item.isPrimary && <Pill value="principal" />}
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-text-muted">Vinculado em {fmtDateTime(item.joinedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Uploads recentes">
              {!filteredUploads.length ? (
                <Box message="Nenhum upload encontrado para este usuario." />
              ) : (
                <div className="space-y-3">
                  {filteredUploads.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{item.fileName}</p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {item.storeCode ? `${item.storeCode} - ${item.storeName}` : item.storeName} - {item.type}
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
                <Box message="Nenhuma escala associada a este usuario." />
              ) : (
                <div className="space-y-3">
                  {filteredSchedules.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {item.storeCode ? `${item.storeCode} - ${item.storeName}` : item.storeName}
                          </p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {fmtDate(item.periodStart)} - {fmtDate(item.periodEnd)}
                          </p>
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
                <Box message="Nenhum fluxo associado a este usuario." />
              ) : (
                <div className="space-y-3">
                  {filteredFlows.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {item.storeCode ? `${item.storeCode} - ${item.storeName}` : item.storeName}
                          </p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {fmtDate(item.periodStart)} - {fmtDate(item.periodEnd)} - {item.sourceType}
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

export default UserDetailPanel;
