import React from 'react';
import { Zap } from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line as RechartsLine,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import CorporateTooltip from './CorporateTooltip';

export const ChartPanel = ({
  chartData,
  dailyMetrics,
  isOptimized,
  onOptimize,
  onToggleOptimized,
  theme,
}) => {
  const isDark = theme ? theme === 'dark' : typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const gridColor = isDark ? '#3F3F46' : '#E4E4E7';
  const tickColor = isDark ? '#A1A1AA' : '#71717A';
  const cursorColor = isDark ? 'rgba(255,255,255,0.04)' : '#F4F4F5';
  const legendColor = isDark ? '#A1A1AA' : '#52525B';
  const gapFill = isDark ? 'rgba(239,68,68,0.12)' : '#FEE2E2';
  const dotStroke = isDark ? '#18181B' : '#FFFFFF';

  return (
    <section className="panel-surface-strong w-full p-5 transition-all duration-200 sm:p-6 lg:p-7">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full border border-border/70 bg-bg-elevated/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
            Cockpit de cobertura
          </span>
          <h3 className="text-lg font-semibold tracking-tight text-text-primary sm:text-xl">
            Capacidade x Demanda por hora
          </h3>
          <p className="text-sm text-text-secondary">
            Priorize janelas com desencaixe entre fluxo e equipe para reduzir perda operacional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              if (!isOptimized) {
                onOptimize();
              } else {
                onToggleOptimized();
              }
            }}
            className={`inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-xs font-semibold uppercase tracking-[0.12em] shadow-sm transition-all ${
              isOptimized
                ? 'border-accent-main bg-accent-main text-white hover:bg-accent-main/90'
                : 'border-border/70 bg-bg-surface text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            {isOptimized ? 'Escala Otimizada' : 'Escala Original'}
          </button>

        </div>
      </div>

      <div className="h-[340px] w-full min-h-0 sm:h-[430px] xl:h-[500px] 2xl:h-[560px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="fluxGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94A3B8" stopOpacity={isDark ? 0.25 : 0.15} />
                <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="hora"
              tick={{ fill: tickColor, fontSize: 11, fontWeight: 500 }}
              axisLine={{ stroke: gridColor }}
              dy={10}
              tickFormatter={(value) => `${value}h`}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              unit="%"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={{ stroke: gridColor }}
              domain={[0, (dataMax) => Math.ceil(dataMax * 1.3)]}
            />
            <Tooltip content={<CorporateTooltip />} cursor={{ fill: cursorColor }} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '12px', color: legendColor, fontWeight: 500 }}
            />

            {chartData.map((entry, index) => {
              if (entry.percentualFluxo > entry.funcionarios_visual) {
                return (
                  <ReferenceArea
                    key={`gap-${index}`}
                    yAxisId="left"
                    x1={entry.hora}
                    x2={entry.hora}
                    y1={entry.funcionarios_visual}
                    y2={entry.percentualFluxo}
                    fill={gapFill}
                    stroke="none"
                    ifOverflow="extendDomain"
                  />
                );
              }
              return null;
            })}

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="percentualFluxo"
              name="Fluxo Clientes"
              fill="url(#fluxGradient)"
              stroke="#94A3B8"
              strokeWidth={2}
              strokeOpacity={0.8}
              fillOpacity={1}
              activeDot={false}
            />

            <Bar
              yAxisId="right"
              dataKey="conversao"
              name="Conversao %"
              barSize={24}
              fill="#16A34A"
              fillOpacity={isDark ? 0.9 : 0.8}
              radius={[4, 4, 0, 0]}
            >
              <LabelList
                dataKey="conversao"
                position="top"
                fill={isDark ? '#4ADE80' : '#15803D'}
                fontSize={10}
                fontWeight="semibold"
                formatter={(value) => `${value.toFixed(1)}%`}
              />
            </Bar>

            <RechartsLine
              yAxisId="right"
              dataKey="conversao"
              name="Alerta Quedas"
              stroke="none"
              dot={(props) => {
                const { cx, cy, payload } = props;
                const isCritical = dailyMetrics?.horasCriticas?.includes(`${payload.hora}h`);
                if (isCritical) {
                  return <circle cx={cx} cy={cy} r={5} fill="#DC2626" stroke={dotStroke} strokeWidth={2} />;
                }
                return null;
              }}
              activeDot={{ r: 6, fill: '#16A34A' }}
              legendType="none"
              isAnimationActive={false}
            />

            <RechartsLine
              yAxisId="left"
              type="monotone"
              dataKey="funcionarios_visual"
              name="Equipe (Capacidade)"
              stroke="#7C3AED"
              strokeWidth={3}
              dot={(props) => <circle cx={props.cx} cy={props.cy} r={0} />}
              activeDot={{ r: 6, fill: dotStroke, stroke: '#7C3AED', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default ChartPanel;
