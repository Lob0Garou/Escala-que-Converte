/**
 * staffPerformance.js
 * Cálculo de conversão por vendedor com delta vs média do dia e ranking.
 * Usa modelo de dados real: staffRows (escalas) + cuponsData (fluxo/cupons por hora).
 */

import { parseFluxValue, parseNumber, findAndParseConversion } from './parsers.js';
import { getHour as toHour } from './staffUtils.js';
import { normalizeDayName } from './dayUtils.js';

/**
 * Gera array de horas ativas para um staffRow.
 * De entrada até saída (exclusive), excluindo a hora do intervalo.
 */
function getActiveHours(row) {
  if (!row.entrada || row.entrada.toUpperCase() === 'FOLGA') return [];

  const entradaH = toHour(row.entrada);
  const saidaH = toHour(row.saida);
  const intervaloH = toHour(row.intervalo);

  if (entradaH == null || saidaH == null) return [];

  const hours = [];
  const end = row.saidaDiaSeguinte ? saidaH + 24 : saidaH;

  for (let h = entradaH; h < end; h++) {
    const normalizedH = h % 24;
    if (normalizedH === intervaloH) continue;
    hours.push(normalizedH);
  }

  return hours;
}

/**
 * Encontra o valor de cupons em um registro de cuponsData.
 * Tenta qtd_cupom, Cupons, ou calcula via conversão × fluxo.
 */
function getCupons(row) {
  // Tentar chaves diretas de cupons
  const cupomKeys = ['qtd_cupom', 'Cupons', 'cupons', 'qtd_cupons'];
  for (const key of cupomKeys) {
    if (row[key] != null && row[key] !== '') {
      return parseFluxValue(row[key]);
    }
  }

  // Fallback: calcular via conversão × fluxo
  const fluxo = parseFluxValue(row['qtd_entrante'] ?? 0);
  const conversao = findAndParseConversion(row);
  if (conversao > 0 && fluxo > 0) {
    return (conversao / 100) * fluxo;
  }

  return 0;
}

// --- Core ---

/**
 * Calcula conversão e delta para cada vendedor ativo no dia selecionado.
 *
 * @param {Array}  staffRows    – escalas de funcionários
 * @param {Array}  cuponsData   – dados de fluxo/cupons por hora
 * @param {string} selectedDay  – "SEGUNDA", "TERÇA", etc.
 * @param {Object} diasSemana   – mapeamento ex: { SEGUNDA: '1. Seg', ... }
 * @returns {Array<{id, name, conversion, delta, hoursWorked, totalFlow, totalCupons}>}
 */
export function calculateStaffPerformance(staffRows, cuponsData, selectedDay, diasSemana) {
  if (!staffRows?.length || !cuponsData?.length || !selectedDay || !diasSemana) return [];

  const diaExcel = diasSemana[normalizeDayName(selectedDay)] || diasSemana[selectedDay];
  if (!diaExcel) return [];

  // Filtrar cuponsData para o dia selecionado
  const cuponsHoje = cuponsData.filter(r => {
    const dia = r['Dia da Semana'] ?? r['dia_semana'] ?? '';
    return String(dia).trim() === String(diaExcel).trim();
  });

  // Indexar cuponsData por hora para busca rápida
  const cuponsPorHora = {};
  for (const row of cuponsHoje) {
    const hora = parseNumber(row['cod_hora_entrada'] ?? row['hora'] ?? '');
    if (!isNaN(hora)) {
      cuponsPorHora[hora] = row;
    }
  }

  // Filtrar staffRows para o dia selecionado (vendedores ativos, não FOLGA)
  const staffHoje = staffRows.filter(r => {
    if (!r.dia || !r.entrada) return false;
    return normalizeDayName(r.dia) === normalizeDayName(selectedDay) && r.entrada.toUpperCase() !== 'FOLGA';
  });

  if (staffHoje.length === 0) return [];

  // Calcular métricas por vendedor
  const results = staffHoje.map(row => {
    const activeHours = getActiveHours(row);
    let totalFlow = 0;
    let totalCupons = 0;

    for (const h of activeHours) {
      const cupomRow = cuponsPorHora[h];
      if (cupomRow) {
        totalFlow += parseFluxValue(cupomRow['qtd_entrante'] ?? 0);
        totalCupons += getCupons(cupomRow);
      }
    }

    const conversion = totalFlow > 0 ? (totalCupons / totalFlow) * 100 : 0;

    return {
      id: row.id,
      name: row.nome,
      conversion: Math.round(conversion * 100) / 100,
      hoursWorked: activeHours.length,
      totalFlow,
      totalCupons: Math.round(totalCupons * 100) / 100,
    };
  });

  // Média do dia
  const totalConversion = results.reduce((acc, r) => acc + r.conversion, 0);
  const avgConversion = results.length > 0 ? totalConversion / results.length : 0;

  // Delta vs média
  const withDelta = results.map(r => ({
    ...r,
    delta: Math.round((r.conversion - avgConversion) * 100) / 100,
  }));

  // Ordenar por conversão decrescente
  withDelta.sort((a, b) => b.conversion - a.conversion);

  return withDelta;
}

/**
 * Retorna vendedores com conversão acima de minConversion.
 */
export function getTopPerformers(performance, { minConversion = 0 } = {}) {
  return performance.filter(r => r.conversion > minConversion);
}

/**
 * Retorna vendedores com conversão abaixo de maxConversion.
 */
export function getUnderperformers(performance, { maxConversion = Infinity } = {}) {
  return performance.filter(r => r.conversion < maxConversion);
}

/**
 * Formata ranking com posição, status e delta.
 *
 * @param {Array} performance – resultado de calculateStaffPerformance
 * @returns {Array<{ position, name, conversion, delta, status }>}
 *   status ∈ { 'over-performer', 'under-performer', 'baseline' }
 */
export function formatPerformanceRank(performance) {
  return performance.map((r, idx) => {
    let status;
    if (r.delta > 0)       status = 'over-performer';
    else if (r.delta < 0)  status = 'under-performer';
    else                   status = 'baseline';

    return {
      position: idx + 1,
      name: r.name,
      conversion: r.conversion,
      delta: r.delta,
      status,
    };
  });
}
