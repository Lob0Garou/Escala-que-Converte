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
  statusTone,
} from './AdminPrimitives';
import { fmtDateTime, fmtMoney, fmtScore } from './adminFormatters';

export const AdminStoresTab = ({
  data,
  loading,
  error,
  query,
  onQueryChange,
  usageStatus,
  onUsageStatusChange,
  onPageChange,
  onOpenStore,
  onExport,
}) => (
  <Panel
    title="Lojas"
    subtitle="Base de clientes com score agregado, ganho potencial e status de uso."
    actions={
      <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
        <div className="w-full lg:w-[320px]">
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar por codigo, nome ou localidade"
          />
        </div>
        <div className="w-full lg:w-[220px]">
          <Select
            value={usageStatus}
            onChange={onUsageStatusChange}
            options={[
              { value: 'all', label: 'Todos os status' },
              { value: 'ativa', label: 'Uso ativo' },
              { value: 'sem_uso_recente', label: 'Sem uso recente' },
              { value: 'sem_eventos', label: 'Sem eventos' },
            ]}
          />
        </div>
        <ActionButton
          icon={Download}
          label="Exportar"
          disabled={!data.items.length}
          onClick={onExport}
        />
      </div>
    }
  >
    {error ? (
      <Box tone="error" message={error} />
    ) : loading ? (
      <Box message="Carregando lojas..." />
    ) : (
      <>
        <DataTable
          columns={[
            'Codigo',
            'Loja',
            'Regional',
            'Score atual',
            'Score alvo',
            'Gap',
            'Ganho',
            'Uso',
            'Ultima atividade',
            'Detalhe',
          ]}
          rows={data.items}
          emptyMessage="Nenhuma loja encontrada para este recorte."
          renderRow={(row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 text-sm font-medium text-text-primary">{row.storeCode || 'N/A'}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                <div>
                  <p className="font-medium text-text-primary">{row.storeName}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {[row.city, row.state].filter(Boolean).join(' - ') || 'Localidade nao informada'}
                  </p>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">{row.regionalId || 'N/A'}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">{fmtScore(row.weeklyScoreAvg)}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">{fmtScore(row.weeklyScoreTargetAvg)}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">{fmtScore(row.weeklyScoreGap)}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">{fmtMoney(row.potentialGainTotal)}</td>
              <td className="px-4 py-3 text-sm">
                <Pill value={row.usageStatus} toneMap={statusTone} />
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">{fmtDateTime(row.lastActivityAt)}</td>
              <td className="px-4 py-3 text-sm">
                <button
                  onClick={() => onOpenStore(row.id)}
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

export default AdminStoresTab;
