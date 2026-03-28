import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeWeeklyScheduleScoreSummary } from '../lib/weeklyScore.js';

const diasSemana = {
  SEGUNDA: '1. Seg',
  'TERÇA': '2. Ter',
  QUARTA: '3. Qua',
  QUINTA: '4. Qui',
  SEXTA: '5. Sex',
  'SÁBADO': '6. Sab',
  DOMINGO: '7. Dom',
};

const cuponsData = [
  { 'Dia da Semana': '1. Seg', cod_hora_entrada: '10', qtd_entrante: 240, qtd_cupom: 24 },
  { 'Dia da Semana': '1. Seg', cod_hora_entrada: '11', qtd_entrante: 240, qtd_cupom: 24 },
  { 'Dia da Semana': '2. Ter', cod_hora_entrada: '10', qtd_entrante: 240, qtd_cupom: 24 },
  { 'Dia da Semana': '2. Ter', cod_hora_entrada: '11', qtd_entrante: 240, qtd_cupom: 24 },
  { 'Dia da Semana': '7. Dom', cod_hora_entrada: '10', qtd_entrante: 300, qtd_cupom: 30 },
  { 'Dia da Semana': '7. Dom', cod_hora_entrada: '11', qtd_entrante: 300, qtd_cupom: 30 },
];

const baselineStaffRows = [
  { id: 'seg-a', dia: 'SEGUNDA', nome: 'Ana', entrada: '10:00', intervalo: '', saida: '11:00', saidaDiaSeguinte: false },
  { id: 'ter-a', dia: 'TERÇA', nome: 'Ana', entrada: '10:00', intervalo: '', saida: '11:00', saidaDiaSeguinte: false },
];

const optimizedStaffRows = [
  { id: 'seg-a', dia: 'SEGUNDA', nome: 'Ana', entrada: '10:00', intervalo: '', saida: '12:00', saidaDiaSeguinte: false },
  { id: 'ter-a', dia: 'TERÇA', nome: 'Ana', entrada: '10:00', intervalo: '', saida: '12:00', saidaDiaSeguinte: false },
];

const optimizedStaffRowsWithUnnamedSunday = [
  ...optimizedStaffRows,
  { id: 'dom-ghost', dia: 'DOMINGO', nome: '', entrada: '10:00', intervalo: '', saida: '18:00', saidaDiaSeguinte: false },
];

describe('weeklyScore', () => {
  it('calcula media semanal e evolucao antes/depois', () => {
    const summary = computeWeeklyScheduleScoreSummary({
      cuponsData,
      salesData: [],
      staffRows: optimizedStaffRows,
      baselineStaffRows,
      diasSemana,
      referenceDate: '2026-03-02',
    });

    assert.equal(summary.currentWeeklyScoreAvg, 25);
    assert.equal(summary.targetWeeklyScoreAvg, 100);
    assert.equal(summary.weeklyScoreGap, 75);
    assert.equal(summary.baselineWeeklyScoreAvg, 25);
    assert.equal(summary.visibleWeeklyScoreAvg, 100);
    assert.equal(summary.visibleVsBaselineGap, 75);
    assert.equal(summary.daysCountConsidered, 2);
    assert.equal(summary.baselineAverageScore, 25);
    assert.equal(summary.currentAverageScore, 100);
    assert.equal(summary.deltaScore, 75);
    assert.ok(summary.weeklyPotentialGainTotal >= 0);
    assert.equal(summary.days.find((day) => day.day === 'SEGUNDA')?.currentScore, 100);
    assert.equal(summary.days.find((day) => day.day === 'DOMINGO')?.shouldCountInAverage, false);
  });

  it('espelha score atual como baseline quando solicitado', () => {
    const summary = computeWeeklyScheduleScoreSummary({
      cuponsData,
      salesData: [],
      staffRows: optimizedStaffRows,
      baselineStaffRows: null,
      diasSemana,
      referenceDate: '2026-03-02',
      mirrorCurrentAsBaseline: true,
    });

    assert.equal(summary.baselineAverageScore, summary.currentAverageScore);
    assert.equal(summary.baselineWeeklyScoreAvg, summary.visibleWeeklyScoreAvg);
    assert.equal(summary.visibleVsBaselineGap, 0);
    assert.equal(summary.deltaScore, 0);
    assert.equal(summary.currentWeeklyScoreAvg, summary.targetWeeklyScoreAvg);
    assert.equal(summary.weeklyScoreGap, 0);
  });

  it('ignora dias com horario sem colaborador identificado na media semanal', () => {
    const summary = computeWeeklyScheduleScoreSummary({
      cuponsData,
      salesData: [],
      staffRows: optimizedStaffRowsWithUnnamedSunday,
      baselineStaffRows: null,
      diasSemana,
      referenceDate: '2026-03-02',
      mirrorCurrentAsBaseline: true,
    });

    assert.equal(summary.days.find((day) => day.day === 'DOMINGO')?.hasCurrentSchedule, false);
    assert.equal(summary.days.find((day) => day.day === 'DOMINGO')?.shouldCountInAverage, false);
    assert.equal(summary.daysCountConsidered, 2);
  });
});
