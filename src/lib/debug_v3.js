
import { optimizeScheduleRows, computeThermalMetrics, THERMAL_THRESHOLDS } from './thermalBalance.js';

const MOCK_DATA = {
    staff: [
        { id: 1, dia: 'SEGUNDA', entrada: '10:00', saida: '18:00', intervalo: '14:00' },
        { id: 2, dia: 'SEGUNDA', entrada: '10:00', saida: '18:00', intervalo: '13:00' },
        { id: 3, dia: 'SEGUNDA', entrada: '12:00', saida: '20:00', intervalo: '16:00' },
        { id: 4, dia: 'SEGUNDA', entrada: '12:00', saida: '20:00', intervalo: '16:00' },
        { id: 5, dia: 'SEGUNDA', entrada: '14:00', saida: '22:00', intervalo: '18:00' },
        { id: 6, dia: 'SEGUNDA', entrada: '14:00', saida: '22:00', intervalo: '18:00' }
    ],
    flow: [
        { hour: 10, flow: 50 }, { hour: 11, flow: 80 },
        { hour: 12, flow: 150 }, { hour: 13, flow: 100 },
        { hour: 14, flow: 90 }, { hour: 15, flow: 80 },
        { hour: 16, flow: 100 }, { hour: 17, flow: 120 },
        { hour: 18, flow: 180 }, { hour: 19, flow: 200 },
        { hour: 20, flow: 150 }, { hour: 21, flow: 60 }
    ]
};

function calculateActiveStaff(staffRows, flowData) {
    const activeByHour = {};
    flowData.forEach(h => activeByHour[h.hour] = 0);
    staffRows.forEach(s => {
        const hIn = parseInt(s.entrada.split(':')[0]);
        const hOut = parseInt(s.saida.split(':')[0]);
        const hBreak = parseInt(s.intervalo.split(':')[0]);
        for (let h = hIn; h < hOut; h++) if (h !== hBreak) activeByHour[h]++;
    });
    return flowData.map(h => ({ ...h, activeStaff: activeByHour[h.hour] }));
}

console.log('--- DEBUG V3.0 ---');

// 1. Initial State
const initialHourly = calculateActiveStaff(MOCK_DATA.staff, MOCK_DATA.flow);
const initialMetrics = computeThermalMetrics(initialHourly);
console.log('Initial Score:', initialMetrics.score);
console.log('Initial Hotspots:', initialMetrics.hotspots.length);
console.log('Initial Breask:', MOCK_DATA.staff.map(s => s.intervalo).join(', '));

// 2. Run V3
const optimizedStaff = optimizeScheduleRows(MOCK_DATA.staff, 'SEGUNDA', MOCK_DATA.flow, { currentScore: initialMetrics.score });

// 3. Final State
console.log('--- OPTIMIZED ---');
const finalHourly = calculateActiveStaff(optimizedStaff, MOCK_DATA.flow);
const finalMetrics = computeThermalMetrics(finalHourly);
console.log('Final Score:', finalMetrics.score);
console.log('First Row FlowSharePct:', finalMetrics.rowsByHour[0]?.flowSharePct); // Check if defined
console.log('Final Adherence:', finalMetrics.adherence + '%');
console.log('Final Opportunity Lost:', finalMetrics.lostOpportunity);
console.log('Final Hotspots:', finalMetrics.hotspots.length);
console.log('Final Breaks:', optimizedStaff.map(s => s.intervalo).join(', '));

// Check detail
console.log('Rows by Hour (Initial vs Final):');
initialHourly.forEach((h, i) => {
    const f = finalHourly[i];
    console.log(`Hour ${h.hour}: Flow=${h.flow} Staff=${h.activeStaff}->${f.activeStaff}`);
});
