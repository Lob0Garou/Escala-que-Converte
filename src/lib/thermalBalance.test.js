
import assert from 'assert';
import { optimizeScheduleRows, computeThermalMetrics } from './thermalBalance.js';
import fs from 'fs';
import path from 'path';

const DATA_PATH = 'C:/Users/yuriq/Downloads/dados_3_perfis.json';

function loadData() {
    try {
        const raw = fs.readFileSync(DATA_PATH, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        console.error('Erro ao ler arquivo de dados:', e.message);
        process.exit(1);
    }
}

// Convert JSON format to internal format
function normalizeFlow(flowData, day) {
    // Caso 1: Objeto com chaves por dia (Loja 48, 56)
    if (!Array.isArray(flowData)) {
        const dayData = flowData[day] || flowData['SEGUNDA']; // Fallback
        return dayData.map(item => ({ hour: item[0], flow: item[1] }));
    }
    // Caso 2: Array direto (Loja Grande)
    return flowData.map(item => ({ hour: item[0], flow: item[1] }));
}

function normalizeStaff(staffList, day) {
    return staffList.map((s, idx) => ({
        id: idx + 1,
        dia: day,
        entrada: s.entrada,
        saida: s.saida,
        intervalo: s.intervalo
    }));
}

function calculateActiveStaff(staffRows, flowData) {
    const activeByHour = {};
    flowData.forEach(h => activeByHour[h.hour] = 0);

    staffRows.forEach(s => {
        const hIn = parseInt(s.entrada.split(':')[0]);
        const hOut = parseInt(s.saida.split(':')[0]);
        const hBreak = parseInt(s.intervalo.split(':')[0]);

        for (let h = hIn; h < hOut; h++) {
            if (activeByHour[h] !== undefined) {
                if (h !== hBreak) activeByHour[h]++;
            }
        }
    });

    return flowData.map(h => ({
        ...h,
        activeStaff: activeByHour[h.hour]
    }));
}

async function runTests() {
    console.log('🚀 INICIANDO TESTES ANTIGRAVITY V3.0 (Real Data)\n');
    const fullData = loadData();

    // === TESTE 1: LOJA 48 (PEQUENA / Start Score 85) ===
    // Config: <= 10 funcionários. Target 90+
    {
        console.log('🔸 TESTE 1: Loja 48 (Perfil PEQUENA)');
        const storeKey = 'loja_48';
        const day = 'SEGUNDA';

        const rawStore = fullData[storeKey];
        const flow = normalizeFlow(rawStore.fluxo, day);
        const staff = normalizeStaff(rawStore.escala_seg, day);

        // Initial Score check
        const initMetrics = computeThermalMetrics(calculateActiveStaff(staff, flow));
        console.log(`   Staff: ${staff.length}, Score Inicial: ${initMetrics.score}`);

        const startTime = Date.now();
        const optimized = optimizeScheduleRows(staff, day, flow, { currentScore: initMetrics.score });
        const duration = Date.now() - startTime;

        const finalMetrics = computeThermalMetrics(calculateActiveStaff(optimized, flow));
        console.log(`   Score V3.0: ${finalMetrics.score} (Tempo: ${duration}ms)`);

        assert.ok(finalMetrics.score >= 90, `Falha: Score ${finalMetrics.score} < 90`);
        assert.ok(duration < 200, `Falha: Tempo ${duration}ms > 200ms`);
        console.log('   ✅ PASSOU');
    }

    console.log('\n------------------------------------------------\n');

    // === TESTE 2: LOJA 56 (MEDIA / Start Score 87) ===
    // Config: 16 funcionários. Target 90+
    {
        console.log('🔸 TESTE 2: Loja 56 (Perfil MEDIA)');
        const storeKey = 'loja_56';
        const day = 'SEGUNDA';

        const rawStore = fullData[storeKey];
        const flow = normalizeFlow(rawStore.fluxo, day);
        const staff = normalizeStaff(rawStore.escala_seg, day);

        const initMetrics = computeThermalMetrics(calculateActiveStaff(staff, flow));
        console.log(`   Staff: ${staff.length}, Score Inicial: ${initMetrics.score}`);

        const startTime = Date.now();
        const optimized = optimizeScheduleRows(staff, day, flow, { currentScore: initMetrics.score });
        const duration = Date.now() - startTime;

        const finalMetrics = computeThermalMetrics(calculateActiveStaff(optimized, flow));
        console.log(`   Score V3.0: ${finalMetrics.score} (Tempo: ${duration}ms)`);

        assert.ok(finalMetrics.score >= 90, `Falha: Score ${finalMetrics.score} < 90`);
        assert.ok(duration < 300, `Falha: Tempo ${duration}ms > 300ms`);
        console.log('   ✅ PASSOU');
    }

    console.log('\n------------------------------------------------\n');

    // === TESTE 3: LOJA GRANDE (GRANDE / Start Score 65) ===
    // Config: 25 funcionários. Target 77+
    {
        console.log('🔸 TESTE 3: Loja Grande (Perfil GRANDE)');
        const storeKey = 'loja_grande';
        const day = 'SEGUNDA';

        const rawStore = fullData[storeKey];
        const flow = normalizeFlow(rawStore.fluxo, day);
        const staff = normalizeStaff(rawStore.escala_seg, day);

        const initMetrics = computeThermalMetrics(calculateActiveStaff(staff, flow));
        console.log(`   Staff: ${staff.length}, Score Inicial: ${initMetrics.score}`);

        const startTime = Date.now();
        const optimized = optimizeScheduleRows(staff, day, flow, { currentScore: initMetrics.score });
        const duration = Date.now() - startTime;

        const finalMetrics = computeThermalMetrics(calculateActiveStaff(optimized, flow));
        console.log(`   Score V3.0: ${finalMetrics.score} (Tempo: ${duration}ms)`);

        assert.ok(finalMetrics.score >= 77, `Falha: Score ${finalMetrics.score} < 77`);
        // Loja Grande allow more time
        assert.ok(duration < 500, `Falha: Tempo ${duration}ms > 500ms`);
        console.log('   ✅ PASSOU');
    }

    console.log('\n✨ TODOS OS TESTES APROVADOS! ✨');
}

runTests().catch(err => {
    console.error('\n❌ ERRO FATAL:', err.message);
    process.exit(1);
});
