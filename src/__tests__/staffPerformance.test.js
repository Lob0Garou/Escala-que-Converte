import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStaffPerformance,
  getTopPerformers,
  getUnderperformers,
  formatPerformanceRank
} from '../lib/staffPerformance.js';

// --- Fixtures ---
const BASE_SELLERS = [
  { id: 'V1', name: 'Ana',  entry: '10:00', exit: '18:00', break_start: '13:00', break_end: '14:00', active: true },
  { id: 'V2', name: 'Bruno', entry: '09:00', exit: '17:00', break_start: '12:00', break_end: '13:00', active: true },
  { id: 'V3', name: 'Clara', entry: '11:00', exit: '19:00', break_start: '14:00', break_end: '15:00', active: true },
  // Diana (V4) removida - sem vendas no dia, não deve aparecer no ranking
];

const BASE_SALES = [
  { seller_id: 'V1', date: '2024-01-15', hour: 10, amount: 500 },
  { seller_id: 'V1', date: '2024-01-15', hour: 11, amount: 300 },
  { seller_id: 'V1', date: '2024-01-15', hour: 12, amount: 200 },
  { seller_id: 'V1', date: '2024-01-15', hour: 14, amount: 400 }, // após break
  { seller_id: 'V1', date: '2024-01-15', hour: 15, amount: 600 },
  { seller_id: 'V1', date: '2024-01-15', hour: 16, amount: 550 },
  { seller_id: 'V1', date: '2024-01-15', hour: 17, amount: 480 },

  { seller_id: 'V2', date: '2024-01-15', hour: 9,  amount: 200 },
  { seller_id: 'V2', date: '2024-01-15', hour: 10, amount: 250 },
  { seller_id: 'V2', date: '2024-01-15', hour: 11, amount: 300 },
  { seller_id: 'V2', date: '2024-01-15', hour: 14, amount: 350 }, // após break
  { seller_id: 'V2', date: '2024-01-15', hour: 15, amount: 280 },
  { seller_id: 'V2', date: '2024-01-15', hour: 16, amount: 220 },

  { seller_id: 'V3', date: '2024-01-15', hour: 11, amount: 100 },
  { seller_id: 'V3', date: '2024-01-15', hour: 12, amount: 150 },
  { seller_id: 'V3', date: '2024-01-15', hour: 15, amount: 180 }, // após break
  { seller_id: 'V3', date: '2024-01-15', hour: 16, amount: 200 },
  { seller_id: 'V3', date: '2024-01-15', hour: 17, amount: 170 },
  { seller_id: 'V3', date: '2024-01-15', hour: 18, amount: 120 },
];

// Ana com 7h trabalhadas (10-18h com break 13-14h) = 3030 total
// Bruno com 7h trabalhadas (9-17h com break 12-13h) = 1600 total
// Clara com 7h trabalhadas (11-19h com break 14-15h) = 920 total

describe('calculateStaffPerformance', () => {
  it('calcula conversão correta de cada vendedor no dia', () => {
    const result = calculateStaffPerformance(BASE_SELLERS, BASE_SALES, '2024-01-15');

    const ana = result.find(r => r.name === 'Ana');
    assert.ok(ana, 'Ana deve estar no resultado');
    assert.strictEqual(ana.conversion, 3030, 'Ana: 7h * 100 limões/hora = 700 limões expectancy');

    const bruno = result.find(r => r.name === 'Bruno');
    assert.ok(bruno, 'Bruno deve estar no resultado');
    assert.strictEqual(bruno.conversion, 1600, 'Bruno: 7h * 80 = 560');

    const clara = result.find(r => r.name === 'Clara');
    assert.ok(clara, 'Clara deve estar no resultado');
    assert.strictEqual(clara.conversion, 920, 'Clara: 7h * 50 = 350 expectancy');
  });

  it('calcula delta vs média do dia', () => {
    const result = calculateStaffPerformance(BASE_SELLERS, BASE_SALES, '2024-01-15');

    const ana = result.find(r => r.name === 'Ana');
    assert.strictEqual(ana.delta, 1180, 'Ana: 3030 - 1850 (média real de 3 sellers)');

    const bruno = result.find(r => r.name === 'Bruno');
    assert.strictEqual(bruno.delta, -250, 'Bruno: 1600 - 1850');

    const clara = result.find(r => r.name === 'Clara');
    assert.strictEqual(clara.delta, -930, 'Clara: 920 - 1850');
  });

  it('ordena por conversão decrescente', () => {
    const result = calculateStaffPerformance(BASE_SELLERS, BASE_SALES, '2024-01-15');
    const conversions = result.map(r => r.conversion);

    assert.deepStrictEqual(conversions, [3030, 1600, 920],
      'Ordem: Ana(3030) > Bruno(1600) > Clara(920)');
  });

  it('ignora vendedores de folga (offday)', () => {
    const offdaySellers = [
      { id: 'V1', name: 'Ana',  entry: '10:00', exit: '18:00', break_start: '13:00', break_end: '14:00', active: true },
      { id: 'V2', name: 'Bruno', entry: '09:00', exit: '17:00', break_start: '12:00', break_end: '13:00', active: false }, // off
      { id: 'V3', name: 'Clara', entry: '11:00', exit: '19:00', break_start: '14:00', break_end: '15:00', active: true },
    ];

    const result = calculateStaffPerformance(offdaySellers, BASE_SALES, '2024-01-15');
    const names = result.map(r => r.name);

    assert.deepStrictEqual(names, ['Ana', 'Clara'], 'Bruno (off) deve ser ignorado');
  });

  it('retorna array vazio se não há dados', () => {
    const result = calculateStaffPerformance([], [], '2024-01-15');
    assert.deepStrictEqual(result, [], 'Deve retornar array vazio');
  });
});

describe('getTopPerformers', () => {
  it('retorna vendedores acima do threshold', () => {
    const perf = calculateStaffPerformance(BASE_SELLERS, BASE_SALES, '2024-01-15');
    const top = getTopPerformers(perf, { minConversion: 2000 });

    assert.strictEqual(top.length, 1, 'Apenas Ana (3030)');
    assert.strictEqual(top[0].name, 'Ana');
  });

  it('retorna array vazio se nenhum vendedor supera o threshold', () => {
    const perf = calculateStaffPerformance(BASE_SELLERS, BASE_SALES, '2024-01-15');
    const top = getTopPerformers(perf, { minConversion: 5000 });

    assert.deepStrictEqual(top, [], 'Nenhum above threshold');
  });
});

describe('getUnderperformers', () => {
  it('retorna vendedores abaixo do threshold', () => {
    const perf = calculateStaffPerformance(BASE_SELLERS, BASE_SALES, '2024-01-15');
    const under = getUnderperformers(perf, { maxConversion: 1000 });

    assert.strictEqual(under.length, 1, 'Apenas Clara (920)');
    assert.strictEqual(under[0].name, 'Clara');
  });
});

describe('formatPerformanceRank', () => {
  it('formata ranking com posição e delta', () => {
    const perf = calculateStaffPerformance(BASE_SELLERS, BASE_SALES, '2024-01-15');
    const formatted = formatPerformanceRank(perf);

    assert.strictEqual(formatted[0].position, 1, 'Ana é 1º');
    assert.strictEqual(formatted[0].delta, 1180, 'Ana delta +1180');
    assert.strictEqual(formatted[0].status, 'over-performer', 'Ana over');

    assert.strictEqual(formatted[1].position, 2, 'Bruno é 2º');
    assert.strictEqual(formatted[1].delta, -250, 'Bruno delta -250');
    assert.strictEqual(formatted[1].status, 'under-performer', 'Bruno under');

    assert.strictEqual(formatted[2].position, 3, 'Clara é 3º');
    assert.strictEqual(formatted[2].delta, -930, 'Clara delta -930');
    assert.strictEqual(formatted[2].status, 'under-performer', 'Clara under');
  });
});
