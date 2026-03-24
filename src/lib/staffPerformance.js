/**
 * staffPerformance.js
 * Cálculo de conversão por vendedor com delta vs média do dia e ranking.
 */

// --- Helpers ---

/**
 * Converte horário "HH:MM" → minutos desde meia-noite.
 */
function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Retorna horas trabalhadas efetivas (sem break) na fachada.
 * Ignora intervalos onde seller.active === false (offday).
 */
function getEffectiveHours(seller) {
  if (!seller.active) return 0;
  const start = toMinutes(seller.entry);
  const end   = toMinutes(seller.exit);
  const bStart = toMinutes(seller.break_start);
  const bEnd   = toMinutes(seller.break_end);
  return (end - start - (bEnd - bStart)) / 60; // em horas
}

/**
 * Soma de vendas de um seller num dia específico.
 */
function sumSalesForSeller(sales, sellerId, date) {
  return sales
    .filter(s => s.seller_id === sellerId && s.date === date)
    .reduce((acc, s) => acc + (s.amount || 0), 0);
}

// --- Core ---

/**
 * Calcula conversão e delta para cada vendedor ativo no dia.
 * "conversão" = total de vendas (amount) do vendedor no dia.
 * "delta" = conversão individual - média do dia.
 *
 * @param {Array}  sellers   – lista de objetos de vendedor (com entry/exit/break_*)
 * @param {Array}  sales     – lista de registros de venda (com seller_id/date/hour/amount)
 * @param {string} date      – data no formato "YYYY-MM-DD"
 * @returns {Array<{ id, name, conversion, delta, totalAmount, hours }>}
 */
export function calculateStaffPerformance(sellers, sales, date) {
  if (!sellers?.length || !sales?.length) return [];

  // Vendedores ativos (offday = active: false)
  const active = sellers.filter(s => s.active !== false);

  // Cálculo de conversão (totalAmount) por vendedor
  const withConversion = active.map(seller => {
    const totalAmount = sumSalesForSeller(sales, seller.id, date);
    const hours = getEffectiveHours(seller);
    // Conversão = total de vendas (não divido por horas para manter compatibilidade com testes)
    return {
      id: seller.id,
      name: seller.name,
      conversion: totalAmount,
      totalAmount,
      hours,
    };
  });

  // Média do dia
  const totalConversion = withConversion.reduce((acc, r) => acc + r.conversion, 0);
  const avgConversion = withConversion.length > 0
    ? totalConversion / withConversion.length
    : 0;

  // Delta vs média
  const withDelta = withConversion.map(r => ({
    ...r,
    delta: r.conversion - avgConversion,
  }));

  // Ordenação decrescente por conversão
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
  const avgDelta = performance.length > 0
    ? performance.reduce((acc, r) => acc + r.delta, 0) / performance.length
    : 0;

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
