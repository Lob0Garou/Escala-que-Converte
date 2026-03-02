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

export const ChartPanel = ({ chartData, dailyMetrics, isOptimized, onOptimize, onToggleOptimized }) => {
  return (
    <div className="w-full bg-[#1a1e27] border border-white/5 rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide border-l-4 border-[#E30613] pl-3">
          Relat�rio de Capacidade vs. Demanda
        </h3>
        <button
          onClick={() => {
            if (!isOptimized) {
              onOptimize();
            } else {
              onToggleOptimized();
            }
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-bold uppercase tracking-wide ${isOptimized
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
        >
          <Zap className="w-3.5 h-3.5" />
          {isOptimized ? 'Escala Otimizada' : 'Escala Original'}
        </button>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="fluxGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="capacityGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="50%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </linearGradient>
              <linearGradient id="conversionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="hora"
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              dy={10}
              tickFormatter={(value) => `${value}h`}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              unit="%"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              domain={[0, (dataMax) => (dataMax > 25 ? dataMax : 25)]}
            />
            <Tooltip content={<CorporateTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />

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
                    fill="rgba(244,63,94,0.15)"
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
              stroke="#06b6d4"
              strokeWidth={1}
              strokeOpacity={0.4}
              fillOpacity={1}
              activeDot={false}
            />

            <Bar
              yAxisId="right"
              dataKey="conversao"
              name="Convers�o %"
              barSize={24}
              fill="url(#conversionGradient)"
              fillOpacity={0.8}
              radius={[4, 4, 0, 0]}
              style={{ filter: 'drop-shadow(0 4px 6px rgba(16,185,129,0.1))' }}
            >
              <LabelList
                dataKey="conversao"
                position="top"
                fill="#34d399"
                fontSize={10}
                fontWeight="bold"
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
                  return <circle cx={cx} cy={cy} r={5} fill="#f43f5e" stroke="#1a1e27" strokeWidth={2} />;
                }
                return null;
              }}
              activeDot={{ r: 6, fill: '#059669' }}
              legendType="none"
              isAnimationActive={false}
            />

            <RechartsLine
              yAxisId="left"
              type="monotone"
              dataKey="funcionarios_visual"
              name="Equipe (Capacidade)"
              stroke="url(#capacityGradient)"
              strokeWidth={4}
              dot={(props) => <circle cx={props.cx} cy={props.cy} r={0} />}
              activeDot={{ r: 6, fill: '#f8fafc', stroke: '#0f172a', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartPanel;
