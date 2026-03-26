// src/__tests__/thermalBalance_v5.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    optimizeScheduleRows,
    optimizeAllDays,
    computeThermalMetrics,
    quickScore,
    THERMAL_THRESHOLDS,
    suggestShifts,
    classifyStaff,
    getStoreHours,
} from '../lib/thermalBalance_v5.js';
import { calculateStaffByHour } from '../lib/staffUtils.js';

const toSlot = (timeInput) => {
    if (!timeInput || typeof timeInput !== 'string') return null;
    const [hours, minutes] = timeInput.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return Math.floor((hours * 60 + minutes) / 15);
};

const buildBaselineScenario = () => {
    const flow = [];
    for (let h = 9; h <= 21; h++) {
        flow.push({ hour: h, flow: h >= 14 && h <= 18 ? 100 : 20 });
    }

    const rows = [];
    for (let i = 0; i < 8; i++) {
        rows.push({ id: `m${i}`, dia: 'SEGUNDA', nome: `Manha${i}`, entrada: '09:00', intervalo: '12:00', saida: '18:00' });
    }
    for (let i = 0; i < 2; i++) {
        rows.push({ id: `t${i}`, dia: 'SEGUNDA', nome: `Tarde${i}`, entrada: '14:00', intervalo: '17:00', saida: '22:00' });
    }

    return { rows, flow };
};

const buildOpenerCloserScenario = () => {
    const flow = [];
    for (let h = 10; h <= 21; h++) {
        flow.push({ hour: h, flow: h >= 15 && h <= 19 ? 120 : 20 });
    }

    const rows = [
        { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '08:00', intervalo: '12:00', saida: '22:30' },
        { id: '2', dia: 'SEGUNDA', nome: 'Bia', entrada: '09:00', intervalo: '13:00', saida: '18:00' },
        { id: '3', dia: 'SEGUNDA', nome: 'Caio', entrada: '14:00', intervalo: '18:00', saida: '22:30' },
        { id: '4', dia: 'SEGUNDA', nome: 'Duda', entrada: '11:00', intervalo: '16:00', saida: '19:00' },
    ];

    return { rows, flow };
};

describe('thermalBalance_v5 - contrato de interface', () => {
    it('exporta as mesmas funcoes que V4', () => {
        assert.equal(typeof optimizeScheduleRows, 'function');
        assert.equal(typeof optimizeAllDays, 'function');
        assert.equal(typeof computeThermalMetrics, 'function');
        assert.ok(THERMAL_THRESHOLDS);
        assert.equal(typeof THERMAL_THRESHOLDS.HOT, 'number');
    });

    it('retorna staffRows inalterado quando nao ha dados de fluxo', () => {
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '09:00', intervalo: '12:00', saida: '18:00' },
        ];
        const result = optimizeScheduleRows(rows, 'SEGUNDA', [], {});
        assert.equal(result.length, 1);
        assert.equal(result[0].nome, 'Ana');
    });

    it('nao altera carga horaria total do funcionario', () => {
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '09:00', intervalo: '12:00', saida: '18:00' },
            { id: '2', dia: 'SEGUNDA', nome: 'Bob', entrada: '10:00', intervalo: '13:00', saida: '19:00' },
        ];
        const flow = [];
        for (let h = 9; h <= 21; h++) {
            flow.push({ hour: h, flow: h >= 14 && h <= 17 ? 100 : 20 });
        }
        const result = optimizeScheduleRows(rows, 'SEGUNDA', flow, {});

        result.forEach((r) => {
            const original = rows.find(o => o.id === r.id);
            if (!original || original.entrada.toUpperCase() === 'FOLGA') return;
            const [oEntH, oEntM] = original.entrada.split(':').map(Number);
            const [oSaiH, oSaiM] = original.saida.split(':').map(Number);
            const [rEntH, rEntM] = r.entrada.split(':').map(Number);
            const [rSaiH, rSaiM] = r.saida.split(':').map(Number);
            const originalMinutes = (oSaiH * 60 + oSaiM) - (oEntH * 60 + oEntM);
            const resultMinutes = (rSaiH * 60 + rSaiM) - (rEntH * 60 + rEntM);
            assert.equal(resultMinutes, originalMinutes, `Carga de ${r.nome} mudou`);
        });
    });
});

describe('Fase A - suggestShifts', () => {
    it('desloca turno para cobrir pico quando possivel', () => {
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '09:00', intervalo: '11:00', saida: '18:00' },
        ];
        const flow = [
            { hour: 9, flow: 10 },
            { hour: 10, flow: 10 },
            { hour: 11, flow: 10 },
            { hour: 12, flow: 10 },
            { hour: 13, flow: 100 },
            { hour: 14, flow: 10 },
        ];
        const result = suggestShifts(rows, flow, { maxShiftHours: 1 });
        assert.ok(result, 'Deve retornar resultado');
        assert.equal(result.length, 1);
        assert.ok(['10:00', '11:00', '12:00'].includes(result[0].intervalo), 'Intervalo deve ser valido');
    });

    it('respeita deslocamento maximo de +/-1h por padrao', () => {
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '09:00', intervalo: '12:00', saida: '18:00' },
        ];
        const flow = [];
        for (let h = 9; h <= 18; h++) {
            flow.push({ hour: h, flow: h === 15 ? 100 : 10 });
        }
        const result = suggestShifts(rows, flow, {});
        assert.equal(result[0].entrada, '09:00', 'Entrada nao deve mudar');
        assert.equal(result[0].saida, '18:00', 'Saida nao deve mudar');
    });

    it('mantem carga horaria identica apos shift', () => {
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '09:00', intervalo: '12:00', saida: '18:00' },
        ];
        const flow = [
            { hour: 9, flow: 10 },
            { hour: 10, flow: 10 },
            { hour: 11, flow: 10 },
            { hour: 12, flow: 10 },
            { hour: 13, flow: 100 },
            { hour: 14, flow: 10 },
            { hour: 15, flow: 10 },
            { hour: 16, flow: 10 },
            { hour: 17, flow: 10 },
        ];
        const result = suggestShifts(rows, flow, { maxShiftHours: 1 });

        const origMin = (18 * 60) - (9 * 60);
        const resMin = (parseInt(result[0].saida.split(':')[0], 10) * 60) - (parseInt(result[0].entrada.split(':')[0], 10) * 60);
        assert.equal(resMin, origMin, 'Carga horaria deve ser mantida');
    });

    it('nao desloca funcionario de FOLGA', () => {
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '09:00', intervalo: '12:00', saida: '18:00' },
            { id: '2', dia: 'SEGUNDA', nome: 'Bob', entrada: 'FOLGA', intervalo: null, saida: null },
        ];
        const flow = [];
        for (let h = 9; h <= 18; h++) {
            flow.push({ hour: h, flow: h === 14 ? 100 : 10 });
        }
        const result = suggestShifts(rows, flow, {});

        const bobResult = result.find(r => r.nome === 'Bob');
        assert.equal(bobResult.entrada, 'FOLGA', 'FOLGA nao deve ser alterada');
        assert.equal(bobResult.intervalo, null, 'FOLGA nao deve ter intervalo');
    });
});

describe('Protecoes matematicas', () => {
    it('snapshot de score nao cai abaixo do baseline restaurado', () => {
        const { rows, flow } = buildBaselineScenario();
        const baseStaffByHour = calculateStaffByHour(rows, 9, 22);
        const baseHourlyData = flow.map(f => ({
            hour: f.hour,
            flow: f.flow,
            activeStaff: baseStaffByHour[f.hour] || 0,
            cupons: 0,
        }));
        const baseMetrics = computeThermalMetrics(baseHourlyData);

        const result = optimizeScheduleRows(rows, 'SEGUNDA', flow, { enableShiftSuggestion: true });
        const dayResult = result.filter(r => r.dia === 'SEGUNDA' && r.entrada !== 'FOLGA');
        const staffByHour = calculateStaffByHour(dayResult, 9, 22);
        const hourlyData = flow.map(f => ({
            hour: f.hour,
            flow: f.flow,
            activeStaff: staffByHour[f.hour] || 0,
            cupons: 0,
        }));
        const metrics = computeThermalMetrics(hourlyData);
        assert.ok(metrics.score >= 68, `Score ${metrics.score} caiu abaixo do baseline 68`);
        assert.ok(metrics.adherence >= baseMetrics.adherence, `Aderencia ${metrics.adherence} piorou vs baseline ${baseMetrics.adherence}`);
        assert.ok(metrics.lostOpportunity <= baseMetrics.lostOpportunity, `Oportunidade perdida ${metrics.lostOpportunity} piorou vs baseline ${baseMetrics.lostOpportunity}`);

        const peakHours = [14, 15, 16, 17, 18];
        const basePeakCoverage = peakHours.reduce((sum, hour) => sum + (baseStaffByHour[hour] || 0), 0);
        const optPeakCoverage = peakHours.reduce((sum, hour) => sum + (staffByHour[hour] || 0), 0);
        assert.ok(optPeakCoverage >= basePeakCoverage, `Cobertura de pico ${optPeakCoverage} piorou vs baseline ${basePeakCoverage}`);
    });

    it('nao cria gap em hora com fluxo', () => {
        const { rows, flow } = buildBaselineScenario();
        const result = optimizeScheduleRows(rows, 'SEGUNDA', flow, { enableShiftSuggestion: true });
        const dayResult = result.filter(r => r.dia === 'SEGUNDA' && r.entrada !== 'FOLGA');
        const staffByHour = calculateStaffByHour(dayResult, 9, 22);

        flow.forEach(({ hour, flow: hourlyFlow }) => {
            if (hourlyFlow > 0) {
                assert.ok((staffByHour[hour] || 0) > 0, `Hora ${hour} ficou sem staff`);
            }
        });
    });

    it('reclassifica anchors redundantes como flex', () => {
        const flow = [];
        for (let h = 10; h <= 21; h++) {
            flow.push({ hour: h, flow: h >= 15 && h <= 19 ? 120 : 20 });
        }
        const storeHours = getStoreHours(flow);
        const rows = [
            { id: 'o1', dia: 'SEGUNDA', nome: 'Opener1', entrada: '08:00', intervalo: '12:00', saida: '18:00' },
            { id: 'o2', dia: 'SEGUNDA', nome: 'Opener2', entrada: '08:00', intervalo: '12:00', saida: '18:00' },
            { id: 'o3', dia: 'SEGUNDA', nome: 'Opener3', entrada: '08:00', intervalo: '12:00', saida: '18:00' },
            { id: 'c1', dia: 'SEGUNDA', nome: 'Closer1', entrada: '14:00', intervalo: '18:00', saida: '22:30' },
            { id: 'c2', dia: 'SEGUNDA', nome: 'Closer2', entrada: '14:00', intervalo: '18:00', saida: '22:30' },
            { id: 'c3', dia: 'SEGUNDA', nome: 'Closer3', entrada: '14:00', intervalo: '18:00', saida: '22:30' },
        ];
        const classified = classifyStaff(rows, storeHours);

        assert.equal(classified.filter(r => r.role === 'opener').length, 1);
        assert.equal(classified.filter(r => r.role === 'closer').length, 1);
        assert.equal(classified.filter(r => r.role === 'flex').length, 4);
    });

    it('quickScore fica alinhado com computeThermalMetrics', () => {
        const { rows, flow } = buildBaselineScenario();
        const result = optimizeScheduleRows(rows, 'SEGUNDA', flow, { enableShiftSuggestion: true });
        const dayResult = result.filter(r => r.dia === 'SEGUNDA' && r.entrada !== 'FOLGA');
        const staffByHour = calculateStaffByHour(dayResult, 9, 22);
        const hourlyData = flow.map(f => ({
            hour: f.hour,
            flow: f.flow,
            activeStaff: staffByHour[f.hour] || 0,
            cupons: 0,
        }));
        const scoreQuick = quickScore(hourlyData);
        const metrics = computeThermalMetrics(hourlyData);
        assert.ok(Math.abs(scoreQuick - metrics.score) <= 1, `quickScore=${scoreQuick} e computeThermalMetrics=${metrics.score}`);
    });

    it('opener+closer dual nao fica bloqueado e tem intervalo movido', () => {
        const { rows, flow } = buildOpenerCloserScenario();
        const storeHours = getStoreHours(flow);
        const classified = classifyStaff(rows, storeHours);
        const anaClass = classified.find(r => r.nome === 'Ana');
        assert.equal(anaClass.role, 'flex');

        const result = optimizeScheduleRows(rows, 'SEGUNDA', flow, { enableShiftSuggestion: true });
        const ana = result.find(r => r.nome === 'Ana');
        assert.ok(ana.intervalo, 'Ana deve manter intervalo valido');
        assert.notEqual(ana.intervalo, '12:00', 'Ana nao pode ficar presa no intervalo original');
        assert.equal(ana.entrada, '08:00');
        assert.equal(ana.saida, '22:30');
    });

    it('performance: < 500ms para 25 funcionarios', () => {
        const flow = [];
        for (let h = 9; h <= 21; h++) {
            const f = 20 + ((h - 9) * 7) % 80 + 10;
            flow.push({ hour: h, flow: f });
        }
        const rows = [];
        for (let i = 0; i < 25; i++) {
            const ent = 8 + (i % 4);
            rows.push({
                id: `f${i}`,
                dia: 'SEGUNDA',
                nome: `Func${i}`,
                entrada: `${String(ent).padStart(2, '0')}:00`,
                intervalo: `${String(ent + 4).padStart(2, '0')}:00`,
                saida: `${String(ent + 9).padStart(2, '0')}:00`,
            });
        }
        const start = Date.now();
        optimizeScheduleRows(rows, 'SEGUNDA', flow, { enableShiftSuggestion: true });
        const elapsed = Date.now() - start;
        assert.ok(elapsed < 500, `Motor demorou ${elapsed}ms (max 500ms)`);
    });
});
