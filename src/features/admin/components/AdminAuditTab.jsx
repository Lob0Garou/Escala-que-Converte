import React from 'react';
import { Activity, Download, ShieldCheck, Upload, Waves } from 'lucide-react';
import { formatAdminStoreLabel } from '../../../lib/adminConsole';
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
import { fmtDate, fmtDateTime } from './adminFormatters';

const AccessManagementPanel = ({
  userOptions,
  storeOptions,
  selectedUserId,
  onSelectedUserIdChange,
  selectedPlatformRole,
  onSelectedPlatformRoleChange,
  selectedStoreId,
  onSelectedStoreIdChange,
  selectedMemberRole,
  onSelectedMemberRoleChange,
  selectedUserDetails,
  onUpdatePlatformRole,
  onUpsertMembership,
  onRemoveMembership,
  actionBusy,
  actionError,
  actionMessage,
}) => (
  <div className="grid gap-5 xl:grid-cols-2">
    <div className="rounded-[26px] border border-border/60 bg-bg-elevated/65 p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text-primary">
        Role global
      </h3>
      <p className="mt-2 text-sm text-text-secondary">
        Atualize a role da conta sem sair do contexto de auditoria.
      </p>
      <div className="mt-5 space-y-3">
        <Select
          value={selectedUserId}
          onChange={onSelectedUserIdChange}
          options={userOptions}
          placeholder="Selecione um usuario"
        />
        <Select
          value={selectedPlatformRole}
          onChange={onSelectedPlatformRoleChange}
          options={[
            { value: 'admin', label: 'admin' },
            { value: 'manager', label: 'manager' },
            { value: 'viewer', label: 'viewer' },
          ]}
        />
        <button
          onClick={onUpdatePlatformRole}
          disabled={!selectedUserId || actionBusy}
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-border/70 bg-bg-surface px-4 text-sm font-medium text-text-primary transition-colors hover:bg-bg-overlay/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {actionBusy ? 'Salvando...' : 'Atualizar role global'}
        </button>
        {selectedUserDetails?.user && (
          <div className="rounded-2xl border border-border/60 bg-bg-surface/70 px-4 py-3 text-sm">
            <p className="font-medium text-text-primary">{selectedUserDetails.user.name}</p>
            <p className="mt-1 text-text-secondary">{selectedUserDetails.user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill value={selectedUserDetails.user.platformRole} toneMap={roleTone} />
              <Pill
                value={selectedUserDetails.user.isActive ? 'ativo' : 'inativo'}
                toneMap={statusTone}
              />
            </div>
          </div>
        )}
      </div>
    </div>

    <div className="rounded-[26px] border border-border/60 bg-bg-elevated/65 p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text-primary">
        Vinculo de loja
      </h3>
      <p className="mt-2 text-sm text-text-secondary">
        Conceda ou remova memberships sem ocupar a home executiva.
      </p>
      <div className="mt-5 space-y-3">
        <Select
          value={selectedStoreId}
          onChange={onSelectedStoreIdChange}
          options={storeOptions}
          placeholder="Selecione uma loja"
        />
        <Select
          value={selectedMemberRole}
          onChange={onSelectedMemberRoleChange}
          options={[
            { value: 'manager', label: 'manager' },
            { value: 'viewer', label: 'viewer' },
          ]}
        />
        <button
          onClick={onUpsertMembership}
          disabled={!selectedUserId || !selectedStoreId || actionBusy}
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-border/70 bg-bg-surface px-4 text-sm font-medium text-text-primary transition-colors hover:bg-bg-overlay/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {actionBusy ? 'Salvando...' : 'Salvar vinculo'}
        </button>
        <div className="rounded-2xl border border-border/60 bg-bg-surface/70 px-4 py-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text-primary">
            <ShieldCheck className="h-4 w-4" />
            Memberships atuais
          </div>
          {!selectedUserDetails?.stores?.length ? (
            <Box message="Este usuario ainda nao possui lojas vinculadas." />
          ) : (
            <div className="space-y-3">
              {selectedUserDetails.stores.map((membership) => (
                <div
                  key={`${selectedUserId}-${membership.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-bg-elevated/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {formatAdminStoreLabel(membership.storeCode, membership.storeName)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Pill value={membership.role} toneMap={roleTone} />
                      {membership.isPrimary && <Pill value="principal" toneMap={statusTone} />}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveMembership(membership.id)}
                    disabled={membership.role === 'owner' || actionBusy}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-border/70 px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-overlay/30 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3">
          {actionError && <Box tone="error" message={actionError} />}
          {actionMessage && <Box tone="success" message={actionMessage} />}
        </div>
      </div>
    </div>
  </div>
);

// eslint-disable-next-line no-unused-vars
const AuditModeButton = ({ active, icon: IconComponent, label, onClick }) => (
  <button
    onClick={onClick}
    className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition-colors ${
      active
        ? 'border-accent-main/60 bg-accent-main/10 text-text-primary'
        : 'border-border/70 bg-bg-elevated/80 text-text-secondary hover:bg-bg-overlay/30 hover:text-text-primary'
    }`}
  >
    <IconComponent className="h-4 w-4" />
    {label}
  </button>
);

export const AdminAuditTab = ({
  auditMode,
  onAuditModeChange,
  activity,
  flows,
  uploads,
  memberships,
  activityQuery,
  onActivityQueryChange,
  flowsStoreId,
  onFlowsStoreIdChange,
  uploadsQuery,
  onUploadsQueryChange,
  membershipsQuery,
  onMembershipsQueryChange,
  onActivityPageChange,
  onFlowsPageChange,
  onUploadsPageChange,
  onMembershipsPageChange,
  onExportActivity,
  onExportFlows,
  onExportUploads,
  onExportMemberships,
  storeOptions,
  accessManagementProps,
}) => (
  <div className="space-y-6">
    <Panel
      title="Auditoria"
      subtitle="Concentre rastreabilidade, fluxos, uploads e gestao de acesso sem colocar tudo na home."
      actions={
        <div className="flex flex-wrap gap-2">
          <AuditModeButton
            active={auditMode === 'activity'}
            icon={Activity}
            label="Atividade"
            onClick={() => onAuditModeChange('activity')}
          />
          <AuditModeButton
            active={auditMode === 'flows'}
            icon={Waves}
            label="Fluxos"
            onClick={() => onAuditModeChange('flows')}
          />
          <AuditModeButton
            active={auditMode === 'uploads'}
            icon={Upload}
            label="Uploads"
            onClick={() => onAuditModeChange('uploads')}
          />
          <AuditModeButton
            active={auditMode === 'access'}
            icon={ShieldCheck}
            label="Acessos"
            onClick={() => onAuditModeChange('access')}
          />
        </div>
      }
    >
      {auditMode === 'activity' && (
        <>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <div className="w-full sm:w-[320px]">
              <Input
                value={activityQuery}
                onChange={(event) => onActivityQueryChange(event.target.value)}
                placeholder="Filtrar por usuario, acao, entidade ou loja"
              />
            </div>
            <ActionButton
              icon={Download}
              label="Exportar"
              disabled={!activity.data.items.length}
              onClick={onExportActivity}
            />
          </div>
          <div className="mt-5">
            {activity.error ? (
              <Box tone="error" message={activity.error} />
            ) : activity.loading ? (
              <Box message="Carregando atividade..." />
            ) : (
              <>
                <DataTable
                  columns={['Usuario', 'Acao', 'Entidade', 'Loja', 'Data/hora']}
                  rows={activity.data.items}
                  emptyMessage="Nenhum evento recente foi encontrado."
                  renderRow={(row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm text-text-secondary">{row.userName}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">{row.action}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{row.entityType}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {row.storeCode ? `${row.storeCode} - ${row.storeName}` : row.storeName || 'Global'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {fmtDateTime(row.createdAt)}
                      </td>
                    </tr>
                  )}
                />
                <PaginationBar pageData={activity.data} onPageChange={onActivityPageChange} />
              </>
            )}
          </div>
        </>
      )}

      {auditMode === 'flows' && (
        <>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <div className="w-full sm:w-[280px]">
              <Select
                value={flowsStoreId}
                onChange={onFlowsStoreIdChange}
                options={[{ value: 'all', label: 'Todas as lojas' }, ...storeOptions]}
              />
            </div>
            <ActionButton
              icon={Download}
              label="Exportar"
              disabled={!flows.data.items.length}
              onClick={onExportFlows}
            />
          </div>
          <div className="mt-5">
            {flows.error ? (
              <Box tone="error" message={flows.error} />
            ) : flows.loading ? (
              <Box message="Carregando fluxos..." />
            ) : (
              <>
                <DataTable
                  columns={['Loja', 'Periodo', 'Origem', 'Responsavel', 'Atualizado em']}
                  rows={flows.data.items}
                  emptyMessage="Nenhum fluxo encontrado para este recorte."
                  renderRow={(row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatAdminStoreLabel(row.storeCode, row.storeName)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {fmtDate(row.periodStart)} - {fmtDate(row.periodEnd)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{row.sourceType}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{row.responsibleUser}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {fmtDateTime(row.updatedAt)}
                      </td>
                    </tr>
                  )}
                />
                <PaginationBar pageData={flows.data} onPageChange={onFlowsPageChange} />
              </>
            )}
          </div>
        </>
      )}

      {auditMode === 'uploads' && (
        <>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <div className="w-full sm:w-[320px]">
              <Input
                value={uploadsQuery}
                onChange={(event) => onUploadsQueryChange(event.target.value)}
                placeholder="Filtrar por usuario, loja, tipo ou arquivo"
              />
            </div>
            <ActionButton
              icon={Download}
              label="Exportar"
              disabled={!uploads.data.items.length}
              onClick={onExportUploads}
            />
          </div>
          <div className="mt-5">
            {uploads.error ? (
              <Box tone="error" message={uploads.error} />
            ) : uploads.loading ? (
              <Box message="Carregando uploads..." />
            ) : (
              <>
                <DataTable
                  columns={['Usuario', 'Loja', 'Tipo', 'Arquivo', 'Status', 'Data de envio']}
                  rows={uploads.data.items}
                  emptyMessage="Nenhum upload rastreado foi encontrado."
                  renderRow={(row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm text-text-secondary">{row.userName}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatAdminStoreLabel(row.storeCode, row.storeName)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{row.type}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{row.fileName}</td>
                      <td className="px-4 py-3 text-sm">
                        <Pill value={row.status} toneMap={statusTone} />
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {fmtDateTime(row.createdAt)}
                      </td>
                    </tr>
                  )}
                />
                <PaginationBar pageData={uploads.data} onPageChange={onUploadsPageChange} />
              </>
            )}
          </div>
        </>
      )}

      {auditMode === 'access' && (
        <div className="space-y-6">
          <AccessManagementPanel {...accessManagementProps} />

          <div>
            <div className="mb-4 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <div className="w-full sm:w-[320px]">
                <Input
                  value={membershipsQuery}
                  onChange={(event) => onMembershipsQueryChange(event.target.value)}
                  placeholder="Filtrar por usuario, email ou loja"
                />
              </div>
              <ActionButton
                icon={Download}
                label="Exportar"
                disabled={!memberships.data.items.length}
                onClick={onExportMemberships}
              />
            </div>

            {memberships.error ? (
              <Box tone="error" message={memberships.error} />
            ) : memberships.loading ? (
              <Box message="Carregando vinculos..." />
            ) : (
              <>
                <DataTable
                  columns={[
                    'Usuario',
                    'Role global',
                    'Status',
                    'Loja',
                    'Role loja',
                    'Loja principal',
                    'Ultimo acesso',
                  ]}
                  rows={memberships.data.items}
                  emptyMessage="Nenhum vinculo encontrado para este filtro."
                  renderRow={(row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        <div>
                          <p className="font-medium text-text-primary">{row.userName}</p>
                          <p className="mt-1 text-xs text-text-muted">{row.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Pill value={row.userRole} toneMap={roleTone} />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Pill value={row.userActive ? 'ativo' : 'inativo'} toneMap={statusTone} />
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatAdminStoreLabel(row.storeCode, row.storeName)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Pill value={row.membershipRole} toneMap={roleTone} />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.isPrimary ? <Pill value="principal" toneMap={statusTone} /> : 'Nao'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {fmtDateTime(row.lastSeenAt || row.lastLoginAt)}
                      </td>
                    </tr>
                  )}
                />
                <PaginationBar pageData={memberships.data} onPageChange={onMembershipsPageChange} />
              </>
            )}
          </div>
        </div>
      )}
    </Panel>
  </div>
);

export default AdminAuditTab;
