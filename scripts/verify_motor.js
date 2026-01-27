
import { optimizeScheduleRows } from '../src/lib/thermalBalance.js';

// Mock Data
console.log('--- STARTING ANTIGRAVITY MOTOR V2 VERIFICATION ---');

const mockFlow = [
    { hour: 10, flow: 50 },
    { hour: 11, flow: 80 },
    { hour: 12, flow: 150 }, // PEAK
    { hour: 13, flow: 80 },
    { hour: 14, flow: 60 },
    { hour: 15, flow: 60 },
    { hour: 16, flow: 70 },
    { hour: 17, flow: 100 }, // PEAK
    { hour: 18, flow: 120 }, // SUPER PEAK
    { hour: 19, flow: 80 },
    { hour: 20, flow: 40 },
    { hour: 21, flow: 20 }
];

// 5 Employees working 10:00 - 19:00 (9h total, 8h work + 1h break)
// Bad Schedule: Everyone breaks at 12:00 (Peak Time!)
// Expected: Optimizer should move breaks away from 12:00 and 18:00
const mockStaff = Array.from({ length: 5 }, (_, i) => ({
    id: `emp-${i}`,
    dia: 'SEGUNDA',
    nome: `Employee ${i}`,
    entrada: '10:00',
    saida: '19:00',
    intervalo: '12:00' // BAD BREAK
}));

console.log('Running Optimization...');
const startTime = Date.now();
const result = optimizeScheduleRows([...mockStaff], 'SEGUNDA', mockFlow);
const endTime = Date.now();

console.log(`Optimization took ${endTime - startTime}ms`);

console.log('\n--- RESULTS ---');
result.forEach(r => {
    console.log(`${r.nome}: Break moved from 12:00 to ${r.intervalo}`);
});

// Validation
const breaksAt12 = result.filter(r => r.intervalo === '12:00').length;
console.log(`\nBreaks remaining at 12:00 (Peak): ${breaksAt12} (Should be 0 or low)`);

if (breaksAt12 < 5) {
    console.log('SUCCESS: Breaks were moved away from peak!');
} else {
    console.error('FAILURE: Breaks did not move.');
}
