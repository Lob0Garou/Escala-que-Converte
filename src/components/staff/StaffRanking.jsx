/**
 * StaffRanking.jsx
 * Componente de ranking visual de vendedores com medalhas e delta.
 */

import { useMemo } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { calculateStaffPerformance } from '../../lib/staffPerformance.js';
import { parseFluxValue, parseNumber } from '../../lib/parsers.js';

/**
 * @param {Object} props
 * @param {Array}  props.sellers      – lista de vendedores (de staffData)
 * @param {Array}  props.sales        – registros de venda (de salesData)
 * @param {Array}  props.cuponsData   – dados de cupons para flowByHour
 * @param {string} props.selectedDate – data selecionada "YYYY-MM-DD"
 */
export default function StaffRanking({ sellers, sales, cuponsData, selectedDate }) {
  // flowByHour a partir de cuponsData
  const flowByHour = useMemo(() => {
    if (!cuponsData?.length) return {};
    const result = {};
    cuponsData.forEach(row => {
      const hour = parseNumber(row.hora);
      const flow = parseFluxValue(row.fluxo || row.flow || row.conversao);
      if (hour && flow) result[hour] = (result[hour] || 0) + flow;
    });
    return result;
  }, [cuponsData]);

  // Ranking via calculateStaffPerformance
  const ranking = useMemo(() => {
    return calculateStaffPerformance(sellers, sales, selectedDate);
  }, [sellers, sales, selectedDate]);

  // Estatísticas
  const stats = useMemo(() => {
    if (!ranking.length) return { best: null, avg: 0, worst: null };
    const conversions = ranking.map(r => r.conversion);
    const avg = conversions.reduce((a, b) => a + b, 0) / conversions.length;
    return {
      best: ranking[0],
      avg,
      worst: ranking[ranking.length - 1],
    };
  }, [ranking]);

  // Medalhas
  const medalColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];
  const medalBg = ['bg-amber-50', 'bg-slate-50', 'bg-amber-50'];

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-gray-800">Ranking de Vendedores</h3>
      </div>

      {/* Grid com melhor/média/pior */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Melhor</p>
          {stats.best && (
            <>
              <p className="font-bold text-amber-600 truncate">{stats.best.name}</p>
              <p className="text-sm text-amber-700">{stats.best.conversion.toFixed(2)}</p>
            </>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Média</p>
          <p className="font-bold text-gray-700">{stats.avg.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Pior</p>
          {stats.worst && (
            <>
              <p className="font-bold text-red-600 truncate">{stats.worst.name}</p>
              <p className="text-sm text-red-700">{stats.worst.conversion.toFixed(2)}</p>
            </>
          )}
        </div>
      </div>

      {/* Lista de vendedores */}
      <div className="space-y-2">
        {ranking.map((seller, idx) => {
          const pos = idx + 1;
          const delta = seller.delta;
          const deltaAbs = Math.abs(delta);

          // Cor do delta
          let deltaColor = 'text-gray-400';
          let DeltaIcon = Minus;
          if (delta > 0.5) {
            deltaColor = 'text-green-600';
            DeltaIcon = TrendingUp;
          } else if (delta < -0.5) {
            deltaColor = 'text-red-600';
            DeltaIcon = TrendingDown;
          }

          return (
            <div
              key={seller.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Medalha */}
              {pos <= 3 ? (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${medalBg[pos - 1]}`}>
                  <span className={`text-sm font-bold ${medalColors[pos - 1]}`}>
                    {pos}
                  </span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-500">{pos}</span>
                </div>
              )}

              {/* Nome */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{seller.name}</p>
                <p className="text-xs text-gray-400">{seller.hours.toFixed(1)}h</p>
              </div>

              {/* Conversão */}
              <div className="text-right mr-2">
                <p className="font-semibold text-gray-800">{seller.conversion.toFixed(2)}</p>
              </div>

              {/* Delta com ícone */}
              <div className={`flex items-center gap-1 ${deltaColor}`}>
                <DeltaIcon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
