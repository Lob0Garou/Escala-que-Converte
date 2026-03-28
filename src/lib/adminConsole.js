export const ADMIN_PERIOD_OPTIONS = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'custom', label: 'Customizado' },
  { value: 'all', label: 'Tudo' },
];

const toDateInput = (date) => {
  const safeDate = new Date(date);
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, '0');
  const day = String(safeDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return new Date(value);
  if (typeof value === 'string' && !value.includes('T')) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
};

export const getDefaultCustomPeriod = () => {
  const today = new Date();
  return {
    startDate: toDateInput(shiftDays(today, -29)),
    endDate: toDateInput(today),
  };
};

export const resolveAdminDateRange = (periodKey, customStartDate, customEndDate) => {
  if (periodKey === 'all') {
    return {
      key: 'all',
      startDate: null,
      endDate: null,
      label: 'Historico completo',
    };
  }

  const today = new Date();

  if (periodKey === 'custom') {
    return {
      key: 'custom',
      startDate: customStartDate || null,
      endDate: customEndDate || null,
      label:
        customStartDate && customEndDate
          ? `${customStartDate} ate ${customEndDate}`
          : 'Periodo customizado',
    };
  }

  const daysMap = {
    '7d': 6,
    '30d': 29,
    '90d': 89,
  };

  const shift = daysMap[periodKey] ?? 29;
  const startDate = toDateInput(shiftDays(today, -shift));
  const endDate = toDateInput(today);

  return {
    key: periodKey,
    startDate,
    endDate,
    label: `${startDate} ate ${endDate}`,
  };
};

export const isDateInRange = (value, range) => {
  if (!range || range.key === 'all') return true;
  if (!value) return false;

  const parsed = parseDateValue(value);
  if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) return false;

  if (range.startDate) {
    const start = startOfDay(`${range.startDate}T00:00:00`);
    if (parsed < start) return false;
  }

  if (range.endDate) {
    const end = endOfDay(`${range.endDate}T00:00:00`);
    if (parsed > end) return false;
  }

  return true;
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const normalized =
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  const escaped = normalized.replace(/"/g, '""');
  return /[;"\n]/.test(escaped) ? `"${escaped}"` : escaped;
};

export const downloadCsv = (filename, rows) => {
  if (!Array.isArray(rows) || !rows.length || typeof document === 'undefined') {
    return false;
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set()),
  );

  const content = [
    headers.join(';'),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row?.[header])).join(';')),
  ].join('\n');

  const blob = new Blob([`\uFEFF${content}`], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
};

export const buildAdminExportName = (prefix, range) => {
  const suffix =
    range?.key === 'all'
      ? 'historico-completo'
      : `${range?.startDate || 'inicio'}_${range?.endDate || 'fim'}`;
  return `${prefix}_${suffix}.csv`;
};

export const formatAdminStoreLabel = (storeCode, storeName, fallback = 'Sem loja vinculada') => {
  if (!storeCode && !storeName) return fallback;
  return storeCode ? `${storeCode} - ${storeName}` : storeName;
};

export const resolveUserAccessTimestamp = (user) =>
  user?.lastSeenAt || user?.lastLoginAt || null;

export const buildMembershipExportRows = (users = []) =>
  users.flatMap((user) =>
    (user.linkedStores || []).map((membership) => ({
      usuario: user.name,
      email_espelhado: user.email,
      role_global: user.role,
      status_usuario: user.isActive ? 'ativo' : 'inativo',
      loja: formatAdminStoreLabel(membership.storeCode, membership.name),
      role_loja: membership.role,
      loja_principal: membership.isPrimary ? 'sim' : 'nao',
      ultimo_login: user.lastLoginAt,
      ultima_atividade: user.lastSeenAt,
    })),
  );

export const buildStoreDrilldownExportRows = (details) => {
  if (!details?.store) return [];

  const storeLabel = formatAdminStoreLabel(details.store.storeCode, details.store.storeName);
  const headerRows = [
    {
      secao: 'resumo_loja',
      loja: storeLabel,
      regional: details.store.regionalId || null,
      cidade: details.store.city || null,
      estado: details.store.state || null,
      criada_em: details.store.createdAt || null,
      ultima_atividade: details.store.lastActivityAt || null,
      total_usuarios: details.metrics?.totalUsers ?? 0,
      total_escalas: details.metrics?.totalSchedules ?? 0,
      total_fluxos: details.metrics?.totalFlows ?? 0,
      total_uploads: details.metrics?.totalUploads ?? 0,
    },
  ];

  const userRows = (details.users || []).map((user) => ({
    secao: 'usuarios_vinculados',
    loja: storeLabel,
    usuario: user.name,
    email_espelhado: user.email,
    role_global: user.platformRole,
    role_loja: user.membershipRole,
    status_usuario: user.isActive ? 'ativo' : 'inativo',
    loja_principal: user.isPrimary ? 'sim' : 'nao',
    ultimo_login: user.lastLoginAt,
    ultima_atividade: user.lastSeenAt,
  }));

  const scheduleRows = (details.schedules || []).map((schedule) => ({
    secao: 'escalas',
    loja: storeLabel,
    periodo_inicio: schedule.periodStart,
    periodo_fim: schedule.periodEnd,
    responsavel: schedule.responsibleUser,
    status: schedule.status,
    versao: schedule.version,
    score_atual: schedule.scoreCurrent,
    score_ideal: schedule.scoreIdeal,
    ganho_potencial: schedule.potentialGain,
    atualizado_em: schedule.updatedAt,
  }));

  const flowRows = (details.flows || []).map((flow) => ({
    secao: 'fluxos',
    loja: storeLabel,
    periodo_inicio: flow.periodStart,
    periodo_fim: flow.periodEnd,
    origem: flow.sourceType,
    responsavel: flow.responsibleUser,
    atualizado_em: flow.updatedAt,
  }));

  const uploadRows = (details.uploads || []).map((upload) => ({
    secao: 'uploads',
    loja: storeLabel,
    usuario: upload.userName,
    tipo: upload.type,
    arquivo: upload.fileName,
    status: upload.status,
    mime_type: upload.mimeType,
    file_size: upload.fileSize,
    criado_em: upload.createdAt,
  }));

  const activityRows = (details.activity || []).map((activity) => ({
    secao: 'atividade',
    loja: storeLabel,
    usuario: activity.userName,
    acao: activity.action,
    entidade: activity.entityType,
    entidade_id: activity.entityId,
    metadata_json: activity.metadata,
    criado_em: activity.createdAt,
  }));

  return [...headerRows, ...userRows, ...scheduleRows, ...flowRows, ...uploadRows, ...activityRows];
};

export const buildUserDrilldownExportRows = (details) => {
  if (!details?.user) return [];

  const headerRows = [
    {
      secao: 'resumo_usuario',
      usuario: details.user.name,
      email_espelhado: details.user.email,
      role_global: details.user.platformRole,
      status_usuario: details.user.isActive ? 'ativo' : 'inativo',
      loja_principal_id: details.user.primaryStoreId || null,
      criado_em: details.user.createdAt || null,
      ultimo_login: details.user.lastLoginAt || null,
      ultima_atividade: details.user.lastSeenAt || null,
      ultima_acao: details.user.lastActivityAt || null,
      total_lojas: details.metrics?.totalStores ?? 0,
      total_escalas: details.metrics?.totalSchedules ?? 0,
      total_fluxos: details.metrics?.totalFlows ?? 0,
      total_uploads: details.metrics?.totalUploads ?? 0,
      total_eventos: details.metrics?.totalActivity ?? 0,
    },
  ];

  const storeRows = (details.stores || []).map((store) => ({
    secao: 'lojas_vinculadas',
    usuario: details.user.name,
    loja: formatAdminStoreLabel(store.storeCode, store.storeName),
    regional: store.regionalId || null,
    cidade: store.city || null,
    estado: store.state || null,
    role_loja: store.role,
    loja_principal: store.isPrimary ? 'sim' : 'nao',
    vinculado_em: store.joinedAt,
  }));

  const scheduleRows = (details.schedules || []).map((schedule) => ({
    secao: 'escalas',
    usuario: details.user.name,
    loja: formatAdminStoreLabel(schedule.storeCode, schedule.storeName),
    periodo_inicio: schedule.periodStart,
    periodo_fim: schedule.periodEnd,
    status: schedule.status,
    versao: schedule.version,
    score_atual: schedule.scoreCurrent,
    score_ideal: schedule.scoreIdeal,
    ganho_potencial: schedule.potentialGain,
    atualizado_em: schedule.updatedAt,
  }));

  const flowRows = (details.flows || []).map((flow) => ({
    secao: 'fluxos',
    usuario: details.user.name,
    loja: formatAdminStoreLabel(flow.storeCode, flow.storeName),
    periodo_inicio: flow.periodStart,
    periodo_fim: flow.periodEnd,
    origem: flow.sourceType,
    atualizado_em: flow.updatedAt,
  }));

  const uploadRows = (details.uploads || []).map((upload) => ({
    secao: 'uploads',
    usuario: details.user.name,
    loja: formatAdminStoreLabel(upload.storeCode, upload.storeName),
    tipo: upload.type,
    arquivo: upload.fileName,
    status: upload.status,
    mime_type: upload.mimeType,
    file_size: upload.fileSize,
    criado_em: upload.createdAt,
  }));

  const activityRows = (details.activity || []).map((activity) => ({
    secao: 'atividade',
    usuario: details.user.name,
    loja: activity.storeName
      ? formatAdminStoreLabel(activity.storeCode, activity.storeName, 'Global')
      : 'Global',
    acao: activity.action,
    entidade: activity.entityType,
    entidade_id: activity.entityId,
    metadata_json: activity.metadata,
    criado_em: activity.createdAt,
  }));

  return [...headerRows, ...storeRows, ...scheduleRows, ...flowRows, ...uploadRows, ...activityRows];
};
