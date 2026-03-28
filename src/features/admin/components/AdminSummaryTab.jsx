import React from 'react';
import {
  Activity,
  AlertTriangle,
  Download,
  Store,
  TrendingDown,
  TrendingUp,
  UserMinus,
  Users,
} from 'lucide-react';
import { formatAdminStoreLabel } from '../../../lib/adminConsole';
import { ActionButton, Box, Panel, Pill, StatCard, statusTone } from './AdminPrimitives';
import { fmtDateTime, fmtMoney, fmtScore } from './adminFormatters';

const CompactList = ({ items, emptyMessage, renderItem }) =>
  !items.length ? (
    <Box message={emptyMessage} />
  ) : (
    <div className="space-y-3">{items.map(renderItem)}</div>
  );

const QueueSection = ({ title, items, emptyMessage, renderItem }) => (
  <div className="rounded-[24px] border border-border/60 bg-bg-elevated/58 p-4 shadow-sm">
    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text-primary">{title}</h3>
    <div className="mt-4">
      <CompactList items={items} emptyMessage={emptyMessage} renderItem={renderItem} />
    </div>
  </div>
);

export const AdminSummaryTab = ({
  overview,
  onNavigateTab,
  onOpenStore,
  onOpenUser,
  onExportSummary,
}) => {
  if (overview.error) {
    return <Box tone="error" message={overview.error} />;
  }

  if (overview.loading) {
    return <Box message="Carregando resumo executivo..." />;
  }

  const { kpis, topStores, bottomStores, criticalQueues, recentActivity } = overview.data;

  return (
    <div className="space-y-6">
      <Panel
        title="Resumo executivo"
        subtitle="A primeira dobra mostra score semanal, risco operacional e acesso rapido aos dominios principais."
        actions={
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Store} label="Lojas" onClick={() => onNavigateTab('stores')} />
            <ActionButton icon={Users} label="Usuarios" onClick={() => onNavigateTab('users')} />
            <ActionButton
              icon={TrendingUp}
              label="Escalas"
              onClick={() => onNavigateTab('schedules')}
            />
            <ActionButton
              icon={Activity}
              label="Auditoria"
              onClick={() => onNavigateTab('audit')}
            />
            <ActionButton
              icon={Download}
              label="Exportar resumo"
              onClick={onExportSummary}
              tone="primary"
            />
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={TrendingUp}
            label="Score medio semanal"
            value={fmtScore(kpis.weeklyScoreAvg)}
            hint="Indicador central do produto"
            highlight
          />
          <StatCard
            icon={TrendingUp}
            label="Score alvo medio"
            value={fmtScore(kpis.weeklyScoreTargetAvg)}
            hint="Meta agregada do recorte"
          />
          <StatCard
            icon={Store}
            label="Ganho potencial"
            value={fmtMoney(kpis.weeklyPotentialGainTotal)}
            hint="Potencial total das escalas"
          />
          <StatCard
            icon={AlertTriangle}
            label="Lojas abaixo da meta"
            value={kpis.storesBelowTargetCount}
            hint={`Gap medio ${fmtScore(kpis.weeklyScoreGap)}`}
          />
          <StatCard
            icon={Users}
            label="Usuarios ativos em 7 dias"
            value={kpis.activeUsers7dCount}
            hint="Contas com uso recente"
          />
          <StatCard
            icon={TrendingDown}
            label="Lojas sem uso recente"
            value={kpis.storesWithoutRecentUseCount}
            hint="Sem sinais recentes de operacao"
          />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Panel
          title="Rankings curtos"
          subtitle="Melhores e piores scores para orientar a investigacao sem percorrer tabelas longas."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <QueueSection
              title="Top 5 score"
              items={topStores}
              emptyMessage="Nenhuma loja com score disponivel."
              renderItem={(store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {formatAdminStoreLabel(store.storeCode, store.storeName)}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      Gap {fmtScore(store.weeklyScoreGap)} - ganho{' '}
                      {fmtMoney(store.potentialGainTotal)}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenStore(store.id)}
                    className="rounded-2xl border border-border/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-primary transition-colors hover:bg-bg-overlay/30"
                  >
                    {fmtScore(store.weeklyScoreAvg)}
                  </button>
                </div>
              )}
            />

            <QueueSection
              title="Bottom 5 score"
              items={bottomStores}
              emptyMessage="Nenhuma loja abaixo da meta no recorte."
              renderItem={(store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {formatAdminStoreLabel(store.storeCode, store.storeName)}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      Ultima atividade {fmtDateTime(store.lastActivityAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenStore(store.id)}
                    className="rounded-2xl border border-border/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-primary transition-colors hover:bg-bg-overlay/30"
                  >
                    {fmtScore(store.weeklyScoreAvg)}
                  </button>
                </div>
              )}
            />
          </div>
        </Panel>

        <Panel
          title="Filas criticas"
          subtitle="Itens que exigem acao antes da exploracao completa por dominio."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <QueueSection
              title="Lojas abaixo da meta"
              items={criticalQueues.storesBelowTarget}
              emptyMessage="Nenhuma loja abaixo da meta."
              renderItem={(store) => (
                <button
                  key={store.id}
                  onClick={() => onOpenStore(store.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3 text-left transition-colors hover:bg-bg-overlay/25"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {formatAdminStoreLabel(store.storeCode, store.storeName)}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      Score {fmtScore(store.weeklyScoreAvg)} de{' '}
                      {fmtScore(store.weeklyScoreTargetAvg)}
                    </p>
                  </div>
                  <Pill value="warning" toneMap={statusTone} />
                </button>
              )}
            />

            <QueueSection
              title="Escalas sem score"
              items={criticalQueues.schedulesWithoutScore}
              emptyMessage="Nenhuma escala sem score."
              renderItem={(schedule) => (
                <button
                  key={schedule.id}
                  onClick={() => onNavigateTab('schedules')}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3 text-left transition-colors hover:bg-bg-overlay/25"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {formatAdminStoreLabel(schedule.storeCode, schedule.storeName)}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {schedule.periodStart} a {schedule.periodEnd}
                    </p>
                  </div>
                  <Pill value="sem_score" toneMap={statusTone} />
                </button>
              )}
            />

            <QueueSection
              title="Lojas sem fluxo recente"
              items={criticalQueues.storesWithoutRecentFlow}
              emptyMessage="Nenhuma loja sem fluxo recente."
              renderItem={(store) => (
                <button
                  key={store.id}
                  onClick={() => onOpenStore(store.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3 text-left transition-colors hover:bg-bg-overlay/25"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {formatAdminStoreLabel(store.storeCode, store.storeName)}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">Sem fluxo recente no recorte</p>
                  </div>
                  <Pill value="sem_uso_recente" toneMap={statusTone} />
                </button>
              )}
            />

            <QueueSection
              title="Usuarios inativos"
              items={criticalQueues.inactiveUsers}
              emptyMessage="Nenhum usuario inativo no recorte."
              renderItem={(user) => (
                <button
                  key={user.id}
                  onClick={() => onOpenUser(user.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3 text-left transition-colors hover:bg-bg-overlay/25"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{user.name}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      Ultimo acesso {fmtDateTime(user.lastSeenAt || user.lastLoginAt)}
                    </p>
                  </div>
                  <UserMinus className="h-4 w-4 text-text-muted" />
                </button>
              )}
            />

            <QueueSection
              title="Contas sem loja principal"
              items={criticalQueues.usersWithoutPrimaryStore}
              emptyMessage="Nenhuma conta sem loja principal."
              renderItem={(user) => (
                <button
                  key={user.id}
                  onClick={() => onOpenUser(user.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-bg-surface/75 px-4 py-3 text-left transition-colors hover:bg-bg-overlay/25"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{user.name}</p>
                    <p className="mt-1 text-xs text-text-secondary">{user.email}</p>
                  </div>
                  <Pill value="warning" toneMap={statusTone} />
                </button>
              )}
            />
          </div>
        </Panel>
      </div>

      <Panel
        title="Atividade recente"
        subtitle="Linha do tempo curta, suficiente para leitura executiva sem virar auditoria completa."
      >
        <CompactList
          items={recentActivity}
          emptyMessage="Nenhuma atividade recente no recorte."
          renderItem={(item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-border/60 bg-bg-elevated/58 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{item.action}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {item.userName}
                    {item.storeName
                      ? ` - ${formatAdminStoreLabel(item.storeCode, item.storeName, item.storeName)}`
                      : ''}
                  </p>
                </div>
                <p className="text-xs text-text-muted">{fmtDateTime(item.createdAt)}</p>
              </div>
            </div>
          )}
        />
      </Panel>
    </div>
  );
};

export default AdminSummaryTab;
