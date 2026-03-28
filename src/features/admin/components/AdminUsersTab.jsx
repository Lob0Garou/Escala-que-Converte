import React from 'react';
import { Download } from 'lucide-react';
import {
  ActionButton,
  Box,
  DataTable,
  Input,
  PaginationBar,
  Panel,
  Pill,
  Select,
  roleTone,
  statusTone,
} from './AdminPrimitives';
import { fmtDateTime } from './adminFormatters';

export const AdminUsersTab = ({
  data,
  loading,
  error,
  query,
  onQueryChange,
  role,
  onRoleChange,
  status,
  onStatusChange,
  accessState,
  onAccessStateChange,
  primaryStoreId,
  onPrimaryStoreIdChange,
  linkedStoreId,
  onLinkedStoreIdChange,
  storeOptions,
  onPageChange,
  onOpenUser,
  onExport,
}) => (
  <Panel
    title="Usuarios"
    subtitle="Perfis, acesso recente, loja principal e volume de escalas alteradas."
    actions={
      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full flex-col gap-3 2xl:flex-row">
          <div className="w-full 2xl:w-[280px]">
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar por nome, email ou loja"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              value={role}
              onChange={onRoleChange}
              options={[
                { value: 'all', label: 'Todas as roles' },
                { value: 'admin', label: 'admin' },
                { value: 'manager', label: 'manager' },
                { value: 'viewer', label: 'viewer' },
              ]}
            />
            <Select
              value={status}
              onChange={onStatusChange}
              options={[
                { value: 'all', label: 'Todos os status' },
                { value: 'ativo', label: 'Ativos' },
                { value: 'inativo', label: 'Inativos' },
              ]}
            />
            <Select
              value={accessState}
              onChange={onAccessStateChange}
              options={[
                { value: 'all', label: 'Todos os acessos' },
                { value: 'without_recent_access', label: 'Sem acesso recente' },
                { value: 'without_primary_store', label: 'Sem loja principal' },
                { value: 'never_accessed', label: 'Nunca acessaram' },
              ]}
            />
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <Select
            value={primaryStoreId}
            onChange={onPrimaryStoreIdChange}
            options={[{ value: 'all', label: 'Todas as lojas principais' }, ...storeOptions]}
          />
          <Select
            value={linkedStoreId}
            onChange={onLinkedStoreIdChange}
            options={[{ value: 'all', label: 'Todas as lojas vinculadas' }, ...storeOptions]}
          />
          <ActionButton
            icon={Download}
            label="Exportar"
            disabled={!data.items.length}
            onClick={onExport}
          />
        </div>
      </div>
    }
  >
    {error ? (
      <Box tone="error" message={error} />
    ) : loading ? (
      <Box message="Carregando usuarios..." />
    ) : (
      <>
        <DataTable
          columns={[
            'Nome',
            'Email',
            'Role',
            'Status',
            'Loja principal',
            'Ultimo login',
            'Ultima atividade',
            'Escalas alteradas',
            'Detalhe',
          ]}
          rows={data.items}
          emptyMessage="Nenhum usuario encontrado para este recorte."
          renderRow={(row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 text-sm font-medium text-text-primary">{row.name}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">{row.email}</td>
              <td className="px-4 py-3 text-sm">
                <Pill value={row.role} toneMap={roleTone} />
              </td>
              <td className="px-4 py-3 text-sm">
                <Pill value={row.isActive ? 'ativo' : 'inativo'} toneMap={statusTone} />
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">{row.primaryStoreLabel}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">{fmtDateTime(row.lastLoginAt)}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">{fmtDateTime(row.lastSeenAt)}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">{row.scheduleCountTouched}</td>
              <td className="px-4 py-3 text-sm">
                <button
                  onClick={() => onOpenUser(row.id)}
                  className="inline-flex h-9 items-center justify-center rounded-2xl border border-border/70 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-primary transition-colors hover:bg-bg-overlay/30"
                >
                  Abrir
                </button>
              </td>
            </tr>
          )}
        />
        <PaginationBar pageData={data} onPageChange={onPageChange} />
      </>
    )}
  </Panel>
);

export default AdminUsersTab;
