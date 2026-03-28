import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ArrowLeft, LogOut, RefreshCw } from 'lucide-react';
import VortexBackdrop from '../../components/layout/VortexBackdrop';
import {
  ADMIN_PERIOD_OPTIONS,
  buildAdminExportName,
  downloadCsv,
  formatAdminStoreLabel,
  getDefaultCustomPeriod,
  resolveAdminDateRange,
} from '../../lib/adminConsole';
import {
  useAdminActivityList,
  useAdminDirectoryOptions,
  useAdminExecutiveOverview,
  useAdminFlowsList,
  useAdminMembershipsList,
  useAdminSchedulesList,
  useAdminStoresList,
  useAdminUploadsList,
  useAdminUserDetails,
  useAdminUsersList,
} from '../../hooks/useAdminData';
import adminService from '../../services/adminService';
import { logActivity } from '../../services/activityService';
import StoreDetailPanel from './StoreDetailPanel';
import UserDetailPanel from './UserDetailPanel';
import { ActionButton, Box, Drawer, Panel, TabButton } from './components/AdminPrimitives';
import { AdminSummaryTab } from './components/AdminSummaryTab';
import { AdminStoresTab } from './components/AdminStoresTab';
import { AdminUsersTab } from './components/AdminUsersTab';
import { AdminSchedulesTab } from './components/AdminSchedulesTab';
import { AdminAuditTab } from './components/AdminAuditTab';

const TABS = [
  { key: 'summary', label: 'Resumo' },
  { key: 'stores', label: 'Lojas' },
  { key: 'users', label: 'Usuarios' },
  { key: 'schedules', label: 'Escalas' },
  { key: 'audit', label: 'Auditoria' },
];

const buildSummaryExportRows = (overviewData) => {
  if (!overviewData) return [];

  const { kpis, topStores, bottomStores, criticalQueues, recentActivity } = overviewData;

  return [
    {
      secao: 'kpis',
      score_medio_semanal: kpis.weeklyScoreAvg,
      score_alvo_medio: kpis.weeklyScoreTargetAvg,
      gap_medio: kpis.weeklyScoreGap,
      ganho_potencial_total: kpis.weeklyPotentialGainTotal,
      lojas_abaixo_da_meta: kpis.storesBelowTargetCount,
      usuarios_ativos_7d: kpis.activeUsers7dCount,
      lojas_sem_uso_recente: kpis.storesWithoutRecentUseCount,
    },
    ...topStores.map((store) => ({
      secao: 'top_stores',
      loja: formatAdminStoreLabel(store.storeCode, store.storeName),
      score_atual: store.weeklyScoreAvg,
      score_alvo: store.weeklyScoreTargetAvg,
      gap: store.weeklyScoreGap,
      ganho: store.potentialGainTotal,
      ultima_atividade: store.lastActivityAt,
    })),
    ...bottomStores.map((store) => ({
      secao: 'bottom_stores',
      loja: formatAdminStoreLabel(store.storeCode, store.storeName),
      score_atual: store.weeklyScoreAvg,
      score_alvo: store.weeklyScoreTargetAvg,
      gap: store.weeklyScoreGap,
      ganho: store.potentialGainTotal,
      ultima_atividade: store.lastActivityAt,
    })),
    ...criticalQueues.storesBelowTarget.map((store) => ({
      secao: 'fila_lojas_abaixo_meta',
      loja: formatAdminStoreLabel(store.storeCode, store.storeName),
      score_atual: store.weeklyScoreAvg,
      score_alvo: store.weeklyScoreTargetAvg,
    })),
    ...criticalQueues.schedulesWithoutScore.map((schedule) => ({
      secao: 'fila_escalas_sem_score',
      loja: formatAdminStoreLabel(schedule.storeCode, schedule.storeName),
      periodo_inicio: schedule.periodStart,
      periodo_fim: schedule.periodEnd,
      responsavel: schedule.responsibleUser,
    })),
    ...criticalQueues.storesWithoutRecentFlow.map((store) => ({
      secao: 'fila_lojas_sem_fluxo',
      loja: formatAdminStoreLabel(store.storeCode, store.storeName),
      ultima_atividade: store.lastActivityAt,
    })),
    ...criticalQueues.inactiveUsers.map((user) => ({
      secao: 'fila_usuarios_inativos',
      usuario: user.name,
      email: user.email,
      ultimo_login: user.lastLoginAt,
      ultima_atividade: user.lastSeenAt,
    })),
    ...criticalQueues.usersWithoutPrimaryStore.map((user) => ({
      secao: 'fila_sem_loja_principal',
      usuario: user.name,
      email: user.email,
      role: user.role,
    })),
    ...recentActivity.map((entry) => ({
      secao: 'atividade_recente',
      usuario: entry.userName,
      acao: entry.action,
      entidade: entry.entityType,
      loja: entry.storeName
        ? formatAdminStoreLabel(entry.storeCode, entry.storeName, entry.storeName)
        : 'Global',
      criado_em: entry.createdAt,
    })),
  ];
};

const AdminPage = ({ user, profile, onNavigateDashboard, onSignOut }) => {
  const isAdmin = profile?.platform_role === 'admin';

  const [activeTab, setActiveTab] = useState('summary');
  const [auditMode, setAuditMode] = useState('activity');
  const [periodPreset, setPeriodPreset] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState(() => getDefaultCustomPeriod().startDate);
  const [customEndDate, setCustomEndDate] = useState(() => getDefaultCustomPeriod().endDate);

  const [storeQuery, setStoreQuery] = useState('');
  const [storeUsageStatus, setStoreUsageStatus] = useState('all');
  const [storesPage, setStoresPage] = useState(1);

  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userAccessState, setUserAccessState] = useState('all');
  const [userPrimaryStoreId, setUserPrimaryStoreId] = useState('all');
  const [userLinkedStoreId, setUserLinkedStoreId] = useState('all');
  const [usersPage, setUsersPage] = useState(1);

  const [scheduleStoreId, setScheduleStoreId] = useState('all');
  const [scheduleScoreStatus, setScheduleScoreStatus] = useState('all');
  const [schedulesPage, setSchedulesPage] = useState(1);

  const [activityQuery, setActivityQuery] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [flowsStoreId, setFlowsStoreId] = useState('all');
  const [flowsPage, setFlowsPage] = useState(1);
  const [uploadsQuery, setUploadsQuery] = useState('');
  const [uploadsPage, setUploadsPage] = useState(1);
  const [membershipsQuery, setMembershipsQuery] = useState('');
  const [membershipsPage, setMembershipsPage] = useState(1);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPlatformRole, setSelectedPlatformRole] = useState('viewer');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedMemberRole, setSelectedMemberRole] = useState('manager');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const [detailStoreId, setDetailStoreId] = useState('');
  const [detailUserId, setDetailUserId] = useState('');

  const deferredStoreQuery = useDeferredValue(storeQuery);
  const deferredUserQuery = useDeferredValue(userQuery);
  const deferredActivityQuery = useDeferredValue(activityQuery);
  const deferredUploadsQuery = useDeferredValue(uploadsQuery);
  const deferredMembershipsQuery = useDeferredValue(membershipsQuery);

  const dateRange = useMemo(
    () => resolveAdminDateRange(periodPreset, customStartDate, customEndDate),
    [customEndDate, customStartDate, periodPreset],
  );

  const overviewParams = useMemo(() => ({ dateRange }), [dateRange]);
  const storesParams = useMemo(
    () => ({ dateRange, query: deferredStoreQuery, page: storesPage, usageStatus: storeUsageStatus }),
    [dateRange, deferredStoreQuery, storesPage, storeUsageStatus],
  );
  const usersParams = useMemo(
    () => ({
      dateRange,
      query: deferredUserQuery,
      page: usersPage,
      role: userRoleFilter,
      status: userStatusFilter,
      accessState: userAccessState,
      primaryStoreId: userPrimaryStoreId,
      linkedStoreId: userLinkedStoreId,
    }),
    [
      dateRange,
      deferredUserQuery,
      userAccessState,
      userLinkedStoreId,
      userPrimaryStoreId,
      userRoleFilter,
      userStatusFilter,
      usersPage,
    ],
  );
  const schedulesParams = useMemo(
    () => ({
      dateRange,
      page: schedulesPage,
      storeId: scheduleStoreId,
      scoreStatus: scheduleScoreStatus,
    }),
    [dateRange, scheduleScoreStatus, scheduleStoreId, schedulesPage],
  );
  const activityParams = useMemo(
    () => ({ dateRange, query: deferredActivityQuery, page: activityPage }),
    [activityPage, dateRange, deferredActivityQuery],
  );
  const flowsParams = useMemo(
    () => ({ dateRange, page: flowsPage, storeId: flowsStoreId }),
    [dateRange, flowsPage, flowsStoreId],
  );
  const uploadsParams = useMemo(
    () => ({ dateRange, query: deferredUploadsQuery, page: uploadsPage }),
    [dateRange, deferredUploadsQuery, uploadsPage],
  );
  const membershipsParams = useMemo(
    () => ({ query: deferredMembershipsQuery, page: membershipsPage }),
    [deferredMembershipsQuery, membershipsPage],
  );

  const directory = useAdminDirectoryOptions(isAdmin);
  const overview = useAdminExecutiveOverview(isAdmin && activeTab === 'summary', overviewParams);
  const storesList = useAdminStoresList(isAdmin && activeTab === 'stores', storesParams);
  const usersList = useAdminUsersList(isAdmin && activeTab === 'users', usersParams);
  const schedulesList = useAdminSchedulesList(isAdmin && activeTab === 'schedules', schedulesParams);
  const activityList = useAdminActivityList(
    isAdmin && activeTab === 'audit' && auditMode === 'activity',
    activityParams,
  );
  const flowsList = useAdminFlowsList(
    isAdmin && activeTab === 'audit' && auditMode === 'flows',
    flowsParams,
  );
  const uploadsList = useAdminUploadsList(
    isAdmin && activeTab === 'audit' && auditMode === 'uploads',
    uploadsParams,
  );
  const membershipsList = useAdminMembershipsList(
    isAdmin && activeTab === 'audit' && auditMode === 'access',
    membershipsParams,
  );
  const accessUserDetails = useAdminUserDetails(
    isAdmin && activeTab === 'audit' && auditMode === 'access' && Boolean(selectedUserId),
    selectedUserId,
  );

  const storeOptions = useMemo(() => directory.data.stores || [], [directory.data.stores]);
  const userOptions = useMemo(() => directory.data.users || [], [directory.data.users]);

  const selectedAccessMembership = useMemo(
    () =>
      accessUserDetails.data.stores.find((membership) => membership.id === selectedStoreId) || null,
    [accessUserDetails.data.stores, selectedStoreId],
  );

  // EFFECTS
  useEffect(() => {
    if (!isAdmin) return;

    void logActivity({
      action: 'admin_console_opened',
      entityType: 'admin_console',
      metadata: { path: '/admin' },
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!userOptions.length) return;
    if (selectedUserId && userOptions.some((option) => option.value === selectedUserId)) return;
    setSelectedUserId(userOptions[0].value);
  }, [selectedUserId, userOptions]);

  useEffect(() => {
    if (!accessUserDetails.data.user) return;

    setSelectedPlatformRole(accessUserDetails.data.user.platformRole || 'viewer');

    const nextPrimaryStoreId =
      accessUserDetails.data.user.primaryStoreId ||
      accessUserDetails.data.stores[0]?.id ||
      '';

    if (nextPrimaryStoreId) {
      setSelectedStoreId((currentValue) => {
        if (
          currentValue &&
          accessUserDetails.data.stores.some((membership) => membership.id === currentValue)
        ) {
          return currentValue;
        }

        return nextPrimaryStoreId;
      });
      return;
    }

    setSelectedStoreId('');
  }, [accessUserDetails.data.stores, accessUserDetails.data.user]);

  useEffect(() => {
    if (!selectedAccessMembership?.role || selectedAccessMembership.role === 'owner') return;
    setSelectedMemberRole(selectedAccessMembership.role);
  }, [selectedAccessMembership]);

  useEffect(() => {
    setStoresPage(1);
  }, [deferredStoreQuery, storeUsageStatus, dateRange]);

  useEffect(() => {
    setUsersPage(1);
  }, [
    dateRange,
    deferredUserQuery,
    userAccessState,
    userLinkedStoreId,
    userPrimaryStoreId,
    userRoleFilter,
    userStatusFilter,
  ]);

  useEffect(() => {
    setSchedulesPage(1);
  }, [dateRange, scheduleScoreStatus, scheduleStoreId]);

  useEffect(() => {
    setActivityPage(1);
  }, [dateRange, deferredActivityQuery]);

  useEffect(() => {
    setFlowsPage(1);
  }, [dateRange, flowsStoreId]);

  useEffect(() => {
    setUploadsPage(1);
  }, [dateRange, deferredUploadsQuery]);

  useEffect(() => {
    setMembershipsPage(1);
  }, [deferredMembershipsQuery]);

  // ACTIONS
  const exportRows = useCallback(
    async (prefix, rows) => {
      if (!rows?.length) return false;

      const success = downloadCsv(buildAdminExportName(prefix, dateRange), rows);

      if (success) {
        await logActivity({
          action: 'admin_export_generated',
          entityType: 'admin_export',
          metadata: {
            prefix,
            rowCount: rows.length,
            period: dateRange,
          },
        });
      }

      return success;
    },
    [dateRange],
  );

  const refreshAdminData = useCallback(async () => {
    await Promise.all([
      directory.refresh(),
      overview.refresh(),
      storesList.refresh(),
      usersList.refresh(),
      schedulesList.refresh(),
      activityList.refresh(),
      flowsList.refresh(),
      uploadsList.refresh(),
      membershipsList.refresh(),
      accessUserDetails.refresh(),
    ]);
  }, [
    accessUserDetails,
    activityList,
    directory,
    flowsList,
    membershipsList,
    overview,
    schedulesList,
    storesList,
    uploadsList,
    usersList,
  ]);

  const runAdminAction = useCallback(
    async (task, successMessage) => {
      setActionBusy(true);
      setActionError('');
      setActionMessage('');

      try {
        await task();
        await refreshAdminData();
        setActionMessage(successMessage);
      } catch (error) {
        setActionError(error?.message || 'Falha ao executar acao administrativa.');
      } finally {
        setActionBusy(false);
      }
    },
    [refreshAdminData],
  );

  const handleRefresh = async () => {
    setActionError('');
    setActionMessage('');

    try {
      await refreshAdminData();
    } catch (error) {
      setActionError(error?.message || 'Falha ao atualizar a console administrativa.');
    }
  };

  const handleUpdatePlatformRole = async () => {
    if (!selectedUserId || !selectedPlatformRole) return;

    await runAdminAction(
      () => adminService.updateAdminPlatformRole(selectedUserId, selectedPlatformRole),
      'Role global atualizada com sucesso.',
    );
  };

  const handleUpsertMembership = async () => {
    if (!selectedUserId || !selectedStoreId || !selectedMemberRole) return;

    await runAdminAction(
      () =>
        adminService.upsertAdminStoreMembership(
          selectedUserId,
          selectedStoreId,
          selectedMemberRole,
        ),
      'Vinculo salvo com sucesso.',
    );
  };

  const handleRemoveMembership = async (storeId) => {
    if (!selectedUserId || !storeId) return;

    await runAdminAction(
      () => adminService.removeAdminStoreMembership(selectedUserId, storeId),
      'Vinculo removido com sucesso.',
    );
  };

  const handleNavigateTab = useCallback((tab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  }, []);

  const handleExportSummary = useCallback(
    async () => exportRows('resumo_admin', buildSummaryExportRows(overview.data)),
    [exportRows, overview.data],
  );

  const handleExportStores = useCallback(async () => {
    const result = await adminService.getAdminStoresList({
      ...storesParams,
      page: 1,
      pageSize: 5000,
    });

    return exportRows(
      'lojas_admin',
      result.items.map((row) => ({
        codigo_loja: row.storeCode,
        loja: row.storeName,
        regional: row.regionalId,
        cidade: row.city,
        estado: row.state,
        score_atual: row.weeklyScoreAvg,
        score_alvo: row.weeklyScoreTargetAvg,
        gap: row.weeklyScoreGap,
        ganho_potencial: row.potentialGainTotal,
        usuarios: row.userCount,
        escalas: row.scheduleCount,
        fluxos: row.flowCount,
        status_uso: row.usageStatus,
        ultima_atividade: row.lastActivityAt,
      })),
    );
  }, [exportRows, storesParams]);

  const handleExportUsers = useCallback(async () => {
    const result = await adminService.getAdminUsersList({
      ...usersParams,
      page: 1,
      pageSize: 5000,
    });

    return exportRows(
      'usuarios_admin',
      result.items.map((row) => ({
        nome: row.name,
        email_espelhado: row.email,
        role: row.role,
        status: row.isActive ? 'ativo' : 'inativo',
        loja_principal: row.primaryStoreLabel,
        quantidade_lojas: row.storeCount,
        escalas_alteradas: row.scheduleCountTouched,
        criado_em: row.createdAt,
        ultimo_login: row.lastLoginAt,
        ultima_atividade: row.lastSeenAt,
      })),
    );
  }, [exportRows, usersParams]);

  const handleExportSchedules = useCallback(async () => {
    const result = await adminService.getAdminSchedulesList({
      ...schedulesParams,
      page: 1,
      pageSize: 5000,
    });

    return exportRows(
      'escalas_admin',
      result.items.map((row) => ({
        loja: formatAdminStoreLabel(row.storeCode, row.storeName),
        periodo_inicio: row.periodStart,
        periodo_fim: row.periodEnd,
        responsavel: row.responsibleUser,
        score_atual: row.scoreCurrent,
        score_alvo: row.scoreIdeal,
        gap:
          row.scoreIdeal !== null && row.scoreCurrent !== null
            ? Number((row.scoreIdeal - row.scoreCurrent).toFixed(1))
            : null,
        ganho_potencial: row.potentialGain,
        status_score:
          row.scoreCurrent === null || row.scoreIdeal === null
            ? 'sem_score'
            : Number(row.scoreCurrent) < Number(row.scoreIdeal)
              ? 'abaixo_da_meta'
              : 'score_ok',
        atualizado_em: row.updatedAt,
      })),
    );
  }, [exportRows, schedulesParams]);

  const handleExportActivity = useCallback(async () => {
    const result = await adminService.getAdminActivityList({
      ...activityParams,
      page: 1,
      pageSize: 5000,
    });

    return exportRows(
      'activity_logs_admin',
      result.items.map((row) => ({
        usuario: row.userName,
        acao: row.action,
        entidade: row.entityType,
        loja: row.storeCode ? `${row.storeCode} - ${row.storeName}` : row.storeName || 'Global',
        data_hora: row.createdAt,
      })),
    );
  }, [activityParams, exportRows]);

  const handleExportFlows = useCallback(async () => {
    const result = await adminService.getAdminFlowsList({
      ...flowsParams,
      page: 1,
      pageSize: 5000,
    });

    return exportRows(
      'fluxos_admin',
      result.items.map((row) => ({
        loja: formatAdminStoreLabel(row.storeCode, row.storeName),
        periodo_inicio: row.periodStart,
        periodo_fim: row.periodEnd,
        origem: row.sourceType,
        responsavel: row.responsibleUser,
        atualizado_em: row.updatedAt,
      })),
    );
  }, [exportRows, flowsParams]);

  const handleExportUploads = useCallback(async () => {
    const result = await adminService.getAdminUploadsList({
      ...uploadsParams,
      page: 1,
      pageSize: 5000,
    });

    return exportRows(
      'uploads_admin',
      result.items.map((row) => ({
        usuario: row.userName,
        loja: formatAdminStoreLabel(row.storeCode, row.storeName),
        tipo: row.type,
        arquivo: row.fileName,
        status: row.status,
        mime_type: row.mimeType,
        file_size: row.fileSize,
        enviado_em: row.createdAt,
      })),
    );
  }, [exportRows, uploadsParams]);

  const handleExportMemberships = useCallback(async () => {
    const result = await adminService.getAdminMembershipsList({
      query: deferredMembershipsQuery,
      page: 1,
      pageSize: 5000,
    });

    return exportRows(
      'memberships_admin',
      result.items.map((row) => ({
        usuario: row.userName,
        email_espelhado: row.userEmail,
        role_global: row.userRole,
        status_usuario: row.userActive ? 'ativo' : 'inativo',
        loja: formatAdminStoreLabel(row.storeCode, row.storeName),
        role_loja: row.membershipRole,
        loja_principal: row.isPrimary ? 'sim' : 'nao',
        ultimo_login: row.lastLoginAt,
        ultima_atividade: row.lastSeenAt,
      })),
    );
  }, [deferredMembershipsQuery, exportRows]);

  // RENDER
  if (!isAdmin) {
    return (
      <div className="relative isolate min-h-screen overflow-hidden bg-bg-base">
        <VortexBackdrop
          className="z-0"
          imageClassName="opacity-[0.2] brightness-[1.08] contrast-[1.08]"
          overlayClassName="bg-bg-base/78"
        />
        <div className="relative mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
          <Panel
            title="Acesso restrito"
            subtitle="A console administrativa exige role admin."
            actions={
              <div className="flex flex-wrap gap-2">
                <ActionButton icon={ArrowLeft} label="Voltar" onClick={onNavigateDashboard} />
                <ActionButton icon={LogOut} label="Sair" onClick={onSignOut} />
              </div>
            }
          >
            <Box
              tone="error"
              message="Este perfil nao possui permissao para acessar a console administrativa."
            />
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-bg-base">
      <VortexBackdrop
        className="z-0"
        imageClassName="opacity-[0.16] brightness-[1.08] contrast-[1.06] saturate-[1.02] sm:opacity-[0.2] lg:opacity-[0.24]"
        overlayClassName="bg-bg-base/78 sm:bg-bg-base/72"
        accentClassName="bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(239,68,68,0.10),transparent_32%)]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Panel
          title="Console executiva"
          subtitle="Resumo estrategico, listas acionaveis e exploracao por dominio sem transformar a home em backoffice tecnico."
          actions={
            <div className="flex flex-wrap gap-2">
              <ActionButton icon={ArrowLeft} label="Dashboard" onClick={onNavigateDashboard} />
              <ActionButton icon={RefreshCw} label="Atualizar" onClick={handleRefresh} />
              <ActionButton icon={LogOut} label="Sair" onClick={onSignOut} />
            </div>
          }
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm text-text-secondary">
                  {profile?.full_name || user?.email || 'Administrador'}
                </p>
                <p className="mt-2 max-w-3xl text-sm text-text-muted">
                  A home foi reduzida para score semanal, risco e filas curtas. Auditoria,
                  uploads, fluxos e gestao de acesso entram sob demanda por aba.
                </p>
              </div>

              <div className="rounded-[24px] border border-border/60 bg-bg-elevated/60 px-4 py-3 text-sm text-text-secondary">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Recorte ativo
                </p>
                <p className="mt-2 font-medium text-text-primary">{dateRange.label}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {ADMIN_PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeriodPreset(option.value)}
                  className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition-colors ${
                    periodPreset === option.value
                      ? 'border-accent-main/60 bg-accent-main/10 text-text-primary'
                      : 'border-border/70 bg-bg-elevated/80 text-text-secondary hover:bg-bg-overlay/30 hover:text-text-primary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {periodPreset === 'custom' && (
              <div className="grid gap-3 md:grid-cols-2 xl:max-w-[560px]">
                <label className="text-sm text-text-secondary">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Inicio
                  </span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-border/70 bg-bg-elevated/80 px-4 text-sm text-text-primary outline-none transition-colors focus:border-accent-main/60"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Fim
                  </span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-border/70 bg-bg-elevated/80 px-4 text-sm text-text-primary outline-none transition-colors focus:border-accent-main/60"
                  />
                </label>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {TABS.map((tab) => (
                <TabButton
                  key={tab.key}
                  active={activeTab === tab.key}
                  label={tab.label}
                  onClick={() => handleNavigateTab(tab.key)}
                />
              ))}
            </div>

            {(actionError || actionMessage) && (
              <div className="space-y-3">
                {actionError && <Box tone="error" message={actionError} />}
                {actionMessage && <Box tone="success" message={actionMessage} />}
              </div>
            )}
          </div>
        </Panel>

        {directory.error && <Box tone="error" message={directory.error} />}

        {activeTab === 'summary' && (
          <AdminSummaryTab
            overview={overview}
            onNavigateTab={handleNavigateTab}
            onOpenStore={setDetailStoreId}
            onOpenUser={setDetailUserId}
            onExportSummary={handleExportSummary}
          />
        )}

        {activeTab === 'stores' && (
          <AdminStoresTab
            data={storesList.data}
            loading={storesList.loading}
            error={storesList.error}
            query={storeQuery}
            onQueryChange={setStoreQuery}
            usageStatus={storeUsageStatus}
            onUsageStatusChange={setStoreUsageStatus}
            onPageChange={setStoresPage}
            onOpenStore={setDetailStoreId}
            onExport={handleExportStores}
          />
        )}

        {activeTab === 'users' && (
          <AdminUsersTab
            data={usersList.data}
            loading={usersList.loading}
            error={usersList.error}
            query={userQuery}
            onQueryChange={setUserQuery}
            role={userRoleFilter}
            onRoleChange={setUserRoleFilter}
            status={userStatusFilter}
            onStatusChange={setUserStatusFilter}
            accessState={userAccessState}
            onAccessStateChange={setUserAccessState}
            primaryStoreId={userPrimaryStoreId}
            onPrimaryStoreIdChange={setUserPrimaryStoreId}
            linkedStoreId={userLinkedStoreId}
            onLinkedStoreIdChange={setUserLinkedStoreId}
            storeOptions={storeOptions}
            onPageChange={setUsersPage}
            onOpenUser={setDetailUserId}
            onExport={handleExportUsers}
          />
        )}

        {activeTab === 'schedules' && (
          <AdminSchedulesTab
            data={schedulesList.data}
            loading={schedulesList.loading}
            error={schedulesList.error}
            storeId={scheduleStoreId}
            onStoreIdChange={setScheduleStoreId}
            scoreStatus={scheduleScoreStatus}
            onScoreStatusChange={setScheduleScoreStatus}
            storeOptions={storeOptions}
            onPageChange={setSchedulesPage}
            onOpenStore={setDetailStoreId}
            onExport={handleExportSchedules}
          />
        )}

        {activeTab === 'audit' && (
          <AdminAuditTab
            auditMode={auditMode}
            onAuditModeChange={setAuditMode}
            activity={activityList}
            flows={flowsList}
            uploads={uploadsList}
            memberships={membershipsList}
            activityQuery={activityQuery}
            onActivityQueryChange={setActivityQuery}
            flowsStoreId={flowsStoreId}
            onFlowsStoreIdChange={setFlowsStoreId}
            uploadsQuery={uploadsQuery}
            onUploadsQueryChange={setUploadsQuery}
            membershipsQuery={membershipsQuery}
            onMembershipsQueryChange={setMembershipsQuery}
            onActivityPageChange={setActivityPage}
            onFlowsPageChange={setFlowsPage}
            onUploadsPageChange={setUploadsPage}
            onMembershipsPageChange={setMembershipsPage}
            onExportActivity={handleExportActivity}
            onExportFlows={handleExportFlows}
            onExportUploads={handleExportUploads}
            onExportMemberships={handleExportMemberships}
            storeOptions={storeOptions}
            accessManagementProps={{
              userOptions,
              storeOptions,
              selectedUserId,
              onSelectedUserIdChange: setSelectedUserId,
              selectedPlatformRole,
              onSelectedPlatformRoleChange: setSelectedPlatformRole,
              selectedStoreId,
              onSelectedStoreIdChange: setSelectedStoreId,
              selectedMemberRole,
              onSelectedMemberRoleChange: setSelectedMemberRole,
              selectedUserDetails: accessUserDetails.data,
              onUpdatePlatformRole: handleUpdatePlatformRole,
              onUpsertMembership: handleUpsertMembership,
              onRemoveMembership: handleRemoveMembership,
              actionBusy,
              actionError,
              actionMessage,
            }}
          />
        )}
      </div>

      {detailStoreId && (
        <Drawer onClose={() => setDetailStoreId('')}>
          <StoreDetailPanel
            enabled={isAdmin}
            storeId={detailStoreId}
            storeOptions={storeOptions}
            dateRange={dateRange}
            onExportRows={exportRows}
            onStoreChange={setDetailStoreId}
            onClose={() => setDetailStoreId('')}
          />
        </Drawer>
      )}

      {detailUserId && (
        <Drawer onClose={() => setDetailUserId('')}>
          <UserDetailPanel
            enabled={isAdmin}
            userId={detailUserId}
            userOptions={userOptions}
            dateRange={dateRange}
            onExportRows={exportRows}
            onProfileUpdated={refreshAdminData}
            onUserChange={setDetailUserId}
            onClose={() => setDetailUserId('')}
          />
        </Drawer>
      )}
    </div>
  );
};

export default AdminPage;
