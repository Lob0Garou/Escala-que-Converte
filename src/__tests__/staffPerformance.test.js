import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStaffPerformance,
  getTopPerformers,
  getUnderperformers,
  formatPerformanceRank
} from '../lib/staffPerformance.js';

// --- Fixtures ---

const DIAS_SEMANA = {
  SEGUNDA: '1. Seg',
  'TERÇA': '2. Ter',
  QUARTA: '3. Qua',
  QUINTA: '4. Qui',
  SEXTA: '5. Sex',
  'SÁBADO': '6. Sab',
  DOMINGO: '7. Dom',
};

const STAFF_ROWS = [
  {
    id: 'manual-001',
    dia: 'SEGUNDA',
    nome: 'Ana Silva',
    entrada: '10:00',
    intervalo: '13:00',
    saida: '18:00',
    saidaDiaSeguinte: false,
  },
  {
    id: 'manual-002',
    dia: 'SEGUNDA',
    nome: 'Bruno Costa',
    entrada: '09:00',
    intervalo: '12:00',
    saida: '17:00',
    saidaDiaSeguinte: false,
  },
  {
    id: 'manual-003',
    dia: 'SEGUNDA',
    nome: 'Clara Dias',
    entrada: '11:00',
    intervalo: '14:00',
    saida: '19:00',
    saidaDiaSeguinte: false,
  },
  {
    id: 'manual-004',
    dia: 'SEGUNDA',
    nome: 'Diego Lima',
    entrada: 'FOLGA',
    intervalo: '',
    saida: '',
    saidaDiaSeguinte: false,
  },
];

// cuponsData para segunda-feira com qtd_cupom direto
// Ana: horas 10,11,12,14,15,16,17 (exclui 13 - intervalo)
// Bruno: horas 9,10,11,13,14,15,16 (exclui 12 - intervalo)
// Clara: horas 11,12,13,15,16,17,18 (exclui 14 - intervalo)
const CUPONS_DATA = [
  { 'Dia da Semana': '1. Seg', cod_hora_entrada: 9,  qtd_entrante: 100, qtd_cupom: 30 },
  { 'Dia da Semana': '1. Seg', cod_hora_entrada: 10, qtd_entrante: 150, qtd_cupom: 60 },
  { 'Dia da Semana': '1. Seg', cod_hora_entrada: 11, qtd_entrante: 200, qtd_cupom: 80 },
  { 'Dia da Semana': '1. Seg', cod_hora_entrada: 12, qtd_entrante: 180, qtd_cupom: 54 },
  { 'Dia da Semana': '1. Seg', cod_hora_entrada: 13, qtd_entrante: 120, qtd_cupom: 36 },
  { 'Dia da Semana': '1. Seg', cod_hora_entrada: 14, qtd_entrante: 160, qtd_cupom: 48 },
  { 'Dia da Semana': '1. Seg', cod_hora_entrada: 15, qtd_entrante: 140, qtd_cupom: 42 },
  { 'Dia da Semana': '1. Seg', cod_hora_entrada: 16, qtd_entrante: 130, qtd_cupom: 39 },
  { 'Dia da Semana': '1. Seg', cod_hora_entrada: 17, qtd_entrante: 110, qtd_cupom: 33 },
  { 'Dia da Semana': '1. Seg', cod_hora_entrada: 18, qtd_entrante: 90,  qtd_cupom: 18 },
];

// Ana horas: 10,11,12,14,15,16,17
// Fluxo Ana: 150+200+180+160+140+130+110 = 1070
// Cupons Ana: 60+80+54+48+42+39+33 = 356
// Conversão Ana: (356/1070)*100 = 33.27%

// Bruno horas: 9,10,11,13,14,15,16
// Fluxo Bruno: 100+150+200+120+160+140+130 = 1000
// Cupons Bruno: 30+60+80+36+48+42+39 = 335
// Conversão Bruno: (335/1000)*100 = 33.5%

// Clara horas: 11,12,13,15,16,17,18
// Fluxo Clara: 200+180+120+140+130+110+90 = 970
// Cupons Clara: 80+54+36+42+39+33+18 = 302
// Conversão Clara: (302/970)*100 = 31.13%

// Média: (33.27 + 33.5 + 31.13) / 3 = 32.63%

describe('calculateStaffPerformance', () => {
  it('calcula conversão correta de cada vendedor no dia', () => {
    const result = calculateStaffPerformance(STAFF_ROWS, CUPONS_DATA, 'SEGUNDA', DIAS_SEMANA);

    const ana = result.find(r => r.name === 'Ana Silva');
    assert.ok(ana, 'Ana deve estar no resultado');
    assert.strictEqual(ana.conversion, 33.27);
    assert.strictEqual(ana.totalFlow, 1070);
    assert.strictEqual(ana.totalCupons, 356);
    assert.strictEqual(ana.hoursWorked, 7);

    const bruno = result.find(r => r.name === 'Bruno Costa');
    assert.ok(bruno, 'Bruno deve estar no resultado');
    assert.strictEqual(bruno.conversion, 33.5);
    assert.strictEqual(bruno.totalFlow, 1000);
    assert.strictEqual(bruno.totalCupons, 335);
    assert.strictEqual(bruno.hoursWorked, 7);

    const clara = result.find(r => r.name === 'Clara Dias');
    assert.ok(clara, 'Clara deve estar no resultado');
    assert.strictEqual(clara.conversion, 31.13);
    assert.strictEqual(clara.totalFlow, 970);
    assert.strictEqual(clara.totalCupons, 302);
    assert.strictEqual(clara.hoursWorked, 7);
  });

  it('ordena por conversão decrescente', () => {
    const result = calculateStaffPerformance(STAFF_ROWS, CUPONS_DATA, 'SEGUNDA', DIAS_SEMANA);
    const names = result.map(r => r.name);

    assert.deepStrictEqual(names, ['Bruno Costa', 'Ana Silva', 'Clara Dias'],
      'Ordem: Bruno(33.5) > Ana(33.27) > Clara(31.13)');
  });

  it('calcula delta vs média do dia', () => {
    const result = calculateStaffPerformance(STAFF_ROWS, CUPONS_DATA, 'SEGUNDA', DIAS_SEMANA);

    // Média = (33.27 + 33.5 + 31.13) / 3 = 32.6333...
    const bruno = result.find(r => r.name === 'Bruno Costa');
    const ana = result.find(r => r.name === 'Ana Silva');
    const clara = result.find(r => r.name === 'Clara Dias');

    // Deltas devem somar ~0
    const sumDelta = bruno.delta + ana.delta + clara.delta;
    assert.ok(Math.abs(sumDelta) < 0.1, `Soma dos deltas deve ser ~0, obteve ${sumDelta}`);

    // Bruno deve ter delta positivo (acima da média)
    assert.ok(bruno.delta > 0, `Bruno delta deve ser positivo: ${bruno.delta}`);
    // Clara deve ter delta negativo (abaixo da média)
    assert.ok(clara.delta < 0, `Clara delta deve ser negativo: ${clara.delta}`);
  });

  it('ignora vendedores de folga', () => {
    const result = calculateStaffPerformance(STAFF_ROWS, CUPONS_DATA, 'SEGUNDA', DIAS_SEMANA);
    const names = result.map(r => r.name);

    assert.ok(!names.includes('Diego Lima'), 'Diego (FOLGA) não deve aparecer');
    assert.strictEqual(result.length, 3, 'Apenas 3 vendedores ativos');
  });

  it('retorna array vazio se não há dados', () => {
    assert.deepStrictEqual(
      calculateStaffPerformance([], [], 'SEGUNDA', DIAS_SEMANA), []);
    assert.deepStrictEqual(
      calculateStaffPerformance(null, null, 'SEGUNDA', DIAS_SEMANA), []);
  });

  it('retorna array vazio para dia sem vendedores', () => {
    const result = calculateStaffPerformance(STAFF_ROWS, CUPONS_DATA, 'QUARTA', DIAS_SEMANA);
    assert.deepStrictEqual(result, [], 'Nenhum vendedor escalado na quarta');
  });

  it('funciona com dados de conversão percentual (sem qtd_cupom)', () => {
    // Cupons sem qtd_cupom, usando % Conversão como fallback
    const cuponsComPercentual = [
      { 'Dia da Semana': '1. Seg', cod_hora_entrada: 10, qtd_entrante: 100, '% Conversão': '40%' },
      { 'Dia da Semana': '1. Seg', cod_hora_entrada: 11, qtd_entrante: 200, '% Conversão': '30%' },
      { 'Dia da Semana': '1. Seg', cod_hora_entrada: 12, qtd_entrante: 150, '% Conversão': '20%' },
      { 'Dia da Semana': '1. Seg', cod_hora_entrada: 13, qtd_entrante: 120, '% Conversão': '25%' },
      { 'Dia da Semana': '1. Seg', cod_hora_entrada: 14, qtd_entrante: 180, '% Conversão': '35%' },
      { 'Dia da Semana': '1. Seg', cod_hora_entrada: 15, qtd_entrante: 160, '% Conversão': '30%' },
      { 'Dia da Semana': '1. Seg', cod_hora_entrada: 16, qtd_entrante: 140, '% Conversão': '25%' },
      { 'Dia da Semana': '1. Seg', cod_hora_entrada: 17, qtd_entrante: 100, '% Conversão': '20%' },
      { 'Dia da Semana': '1. Seg', cod_hora_entrada: 18, qtd_entrante: 80,  '% Conversão': '15%' },
    ];

    const singleStaff = [{
      id: 'manual-010',
      dia: 'SEGUNDA',
      nome: 'Eva Souza',
      entrada: '10:00',
      intervalo: '13:00',
      saida: '15:00',
      saidaDiaSeguinte: false,
    }];
    // Eva horas: 10,11,12,14 (exclui 13)
    // Fluxo: 100+200+150+180 = 630
    // Cupons derivados: 40+60+30+63 = 193
    // Conversão: (193/630)*100 = 30.63%

    const result = calculateStaffPerformance(singleStaff, cuponsComPercentual, 'SEGUNDA', DIAS_SEMANA);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Eva Souza');
    assert.strictEqual(result[0].totalFlow, 630);
    assert.strictEqual(result[0].totalCupons, 193);
    assert.strictEqual(result[0].conversion, 30.63);
  });
});

describe('getTopPerformers', () => {
  it('retorna vendedores acima do threshold', () => {
    const perf = calculateStaffPerformance(STAFF_ROWS, CUPONS_DATA, 'SEGUNDA', DIAS_SEMANA);
    const top = getTopPerformers(perf, { minConversion: 33 });

    assert.strictEqual(top.length, 2, 'Bruno(33.5) e Ana(33.27) acima de 33');
    const names = top.map(r => r.name);
    assert.ok(names.includes('Bruno Costa'));
    assert.ok(names.includes('Ana Silva'));
  });

  it('retorna array vazio se nenhum supera o threshold', () => {
    const perf = calculateStaffPerformance(STAFF_ROWS, CUPONS_DATA, 'SEGUNDA', DIAS_SEMANA);
    const top = getTopPerformers(perf, { minConversion: 50 });
    assert.deepStrictEqual(top, []);
  });
});

describe('getUnderperformers', () => {
  it('retorna vendedores abaixo do threshold', () => {
    const perf = calculateStaffPerformance(STAFF_ROWS, CUPONS_DATA, 'SEGUNDA', DIAS_SEMANA);
    const under = getUnderperformers(perf, { maxConversion: 32 });

    assert.strictEqual(under.length, 1, 'Apenas Clara(31.13)');
    assert.strictEqual(under[0].name, 'Clara Dias');
  });
});

describe('formatPerformanceRank', () => {
  it('formata ranking com posição e status correto', () => {
    const perf = calculateStaffPerformance(STAFF_ROWS, CUPONS_DATA, 'SEGUNDA', DIAS_SEMANA);
    const formatted = formatPerformanceRank(perf);

    assert.strictEqual(formatted.length, 3);

    // Ordem: Bruno(1o), Ana(2o), Clara(3o)
    assert.strictEqual(formatted[0].position, 1);
    assert.strictEqual(formatted[0].name, 'Bruno Costa');
    assert.strictEqual(formatted[0].status, 'over-performer');

    assert.strictEqual(formatted[1].position, 2);
    assert.strictEqual(formatted[1].name, 'Ana Silva');

    assert.strictEqual(formatted[2].position, 3);
    assert.strictEqual(formatted[2].name, 'Clara Dias');
    assert.strictEqual(formatted[2].status, 'under-performer');
  });
});
