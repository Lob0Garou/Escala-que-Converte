// src/__tests__/thermalBalance_v5.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    optimizeScheduleRows,
    optimizeAllDays,
    computeThermalMetrics,
    THERMAL_THRESHOLDS
} from '../lib/thermalBalance_v5.js';

describe('thermalBalance_v5 — contrato de interface', () => {
    it('exporta as mesmas funções que V4', () => {
        assert.equal(typeof optimizeScheduleRows, 'function');
        assert.equal(typeof optimizeAllDays, 'function');
        assert.equal(typeof computeThermalMetrics, 'function');
        assert.ok(THERMAL_THRESHOLDS);
        assert.equal(typeof THERMAL_THRESHOLDS.HOT, 'number');
    });

    it('retorna staffRows inalterado quando não há dados de fluxo', () => {
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '09:00', intervalo: '12:00', saida: '18:00' }
        ];
        const result = optimizeScheduleRows(rows, 'SEGUNDA', [], {});
        assert.equal(result.length, 1);
        assert.equal(result[0].nome, 'Ana');
    });

    it('não altera carga horária total do funcionário', () => {
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '09:00', intervalo: '12:00', saida: '18:00' },
            { id: '2', dia: 'SEGUNDA', nome: 'Bob', entrada: '10:00', intervalo: '13:00', saida: '19:00' },
        ];
        const flow = [];
        for (let h = 9; h <= 21; h++) {
            flow.push({ hour: h, flow: h >= 14 && h <= 17 ? 100 : 20 });
        }
        const result = optimizeScheduleRows(rows, 'SEGUNDA', flow, {});

        result.forEach((r, i) => {
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
