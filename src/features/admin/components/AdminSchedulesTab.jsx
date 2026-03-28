import React from 'react';
import { Download } from 'lucide-react';
import { formatAdminStoreLabel } from '../../../lib/adminConsole';
import {
  ActionButton,
  Box,
  DataTable,
  PaginationBar,
  Panel,
  Pill,
  Select,
  statusTone,
} from './AdminPrimitives';
import { fmtDate, fmtDateTime, fmtMoney, fmtScore } from './adminFormatters';

const resolveScoreStatus = (row) => {
  if (row.scoreCurrent === null || row.scoreIdeal === null) return 'sem_score';
  if (Number(row.scoreCurrent) < Number(row.scoreIdeal)) return 'warning';
  return 'score_ok';
};

export const AdminSchedulesTab = ({
  data,
  loading,
  error,
  storeId,
  onStoreIdChange,
  scoreStatus,
  onScoreStatusChange,
  storeOptions,
  onPageChange,
  onOpenStore,
  onExport,
}) => (
  <Panel
    title="Escalas"
    subtitle="Lista enxuta com score semanal, score alvo, gap, ganho potencial e responsavel."
    actions={
      <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row">
        <div className="w-full xl:w-[260px]">
          <Select
            value={storeId}
            onChange={onStoreIdChange}
            options={[{ value: 'all', label: 'Todas as lojas' }, ...storeOptions]}
          />
        </div>
        <div className="w-full xl:w-[220px]">
          <Select
            value={scoreStatus}
            onChange={onScoreStatusChange}
            options={[
              { value: 'all', label: 'Todos os scores' },
              { value: 'below_target', label: 'Abaixo da meta' },
              { value: 'without_score', label: 'Sem score' },
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
      <Box message="Carregando escalas..." />
    ) : (
      <>
        <DataTable
          columns={[
            'Loja',
            'Periodo',
            'Score atual',
            'Score alvo',
            'Gap',
            'Ganho',
            'Responsavel',
            'Status',
            'Atualizado em',
          ]}
          rows={data.items}
          emptyMessage="Nenhuma escala encontrada para este recorte."
          renderRow={(row) => {
            const scoreStatusLabel = resolveScoreStatus(row);
            const delta =
              row.scoreIdeal !== null && row.scoreCurrent !== null
                ? Number((row.scoreIdeal - row.scoreCurrent).toFixed(1))
                : null;

            return (
              <tr key={row.id}>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  <button
                    onClick={() => onOpenStore(row.storeId)}
                    className="text-left transition-opacity hover:opacity-80"
                  >
                    <p className="font-medium text-text-primary">
                      {formatAdminStoreLabel(row.storeCode, row.storeName)}
                    </p>
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {fmtDate(row.periodStart)} - {fmtDate(row.periodEnd)}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{fmtScore(row.scoreCurrent)}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{fmtScore(row.scoreIdeal)}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{fmtScore(delta)}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{fmtMoney(row.potentialGain)}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{row.responsibleUser}</td>
                <td className="px-4 py-3 text-sm">
                  <Pill value={scoreStatusLabel} toneMap={statusTone} />
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{fmtDateTime(row.updatedAt)}</td>
              </tr>
            );
          }}
        />
        <PaginationBar pageData={data} onPageChange={onPageChange} />
      </>
    )}
  </Panel>
);

export default AdminSchedulesTab;
