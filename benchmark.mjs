import { optimizeScheduleRows as optimizeV4, computeThermalMetrics as computeV4Metrics } from './src/lib/thermalBalance.js';
import { optimizeScheduleRows as optimizeV5, computeThermalMetrics as computeV5Metrics, getStoreHours } from './src/lib/thermalBalance_v5.js';

// Setup Mock Data
const MOCK_DAY = 'SEGUNDA';

// Flow das 8h às 22h, com pico em 14h-16h e 18h-20h
const mockFlow = [
  { hour: 8, flow: 10, cupons: 5 },
  { hour: 9, flow: 20, cupons: 10 },
  { hour: 10, flow: 35, cupons: 15 },
  { hour: 11, flow: 50, cupons: 25 },
  { hour: 12, flow: 80, cupons: 40 },
  { hour: 13, flow: 90, cupons: 45 },
  { hour: 14, flow: 120, cupons: 60 },
  { hour: 15, flow: 130, cupons: 65 },
  { hour: 16, flow: 110, cupons: 55 },
  { hour: 17, flow: 90, cupons: 45 },
  { hour: 18, flow: 140, cupons: 70 },
  { hour: 19, flow: 150, cupons: 75 },
  { hour: 20, flow: 100, cupons: 50 },
  { hour: 21, flow: 60, cupons: 30 },
  { hour: 22, flow: 20, cupons: 10 },
];

const mockStaff = [
  { id: 1, dia: 'SEGUNDA', entrada: '08:00', saida: '16:20', intervalo: '12:00', role: 'opener' },
  { id: 2, dia: 'SEGUNDA', entrada: '08:00', saida: '16:20', intervalo: '12:00', role: 'opener' },
  { id: 3, dia: 'SEGUNDA', entrada: '09:00', saida: '17:20', intervalo: '13:00', role: 'flex' },
  { id: 4, dia: 'SEGUNDA', entrada: '10:00', saida: '18:20', intervalo: '14:00', role: 'flex' },
  { id: 5, dia: 'SEGUNDA', entrada: '10:00', saida: '18:20', intervalo: '14:00', role: 'flex' },
  { id: 6, dia: 'SEGUNDA', entrada: '12:00', saida: '20:20', intervalo: '16:00', role: 'flex' },
  { id: 7, dia: 'SEGUNDA', entrada: '13:00', saida: '21:20', intervalo: '17:00', role: 'flex' },
  { id: 8, dia: 'SEGUNDA', entrada: '14:00', saida: '22:20', intervalo: '18:00', role: 'closer' },
  { id: 9, dia: 'SEGUNDA', entrada: '14:00', saida: '22:20', intervalo: '18:00', role: 'closer' },
  { id: 10, dia: 'SEGUNDA', entrada: '14:00', saida: '22:20', intervalo: '18:00', role: 'closer' },
];

function buildFlowWithActiveStaff(staff, flowBase) {
  // calculate active coverage based on slots
  const cov = new Array(24).fill(0);
  staff.forEach(s => {
    if(!s.entrada || !s.saida) return;
    const entH = Math.floor(toSlot(s.entrada) / 4);
    const outH = Math.floor(toSlot(s.saida) / 4);
    const brkH = s.intervalo ? Math.floor(toSlot(s.intervalo) / 4) : null;
    for(let h = entH; h < outH && h < 24; h++) {
       if(brkH !== null && h === brkH) continue;
       cov[h]++;
    }
  });
  return flowBase.map(h => ({
     ...h,
     activeStaff: cov[h.hour],
     conversion: h.cupons / h.flow
  }));
}

function toSlot(timeInput) {
    if (!timeInput) return null;
    const [h, m] = timeInput.split(':').map(Number);
    return Math.floor((h * 60 + m) / 15);
}

const initialData = buildFlowWithActiveStaff(mockStaff, mockFlow);
const initialMetrics = computeV4Metrics(initialData);
console.log(`INITIAL SCORE: ${initialMetrics.score}`);

const v4Staff = optimizeV4([...mockStaff], MOCK_DAY, initialData);
const v4Data = buildFlowWithActiveStaff(v4Staff, mockFlow);
const v4Metrics = computeV4Metrics(v4Data);
console.log(`V4 SCORE: ${v4Metrics.score}`);

const v5Staff = optimizeV5([...mockStaff], MOCK_DAY, initialData);
const v5Data = buildFlowWithActiveStaff(v5Staff, mockFlow);
const v5Metrics = computeV5Metrics(v5Data);
console.log(`V5.1 SCORE (WITH SHIFTS): ${v5Metrics.score}`);

const v5StaffNoShifts = optimizeV5([...mockStaff], MOCK_DAY, initialData, { maxShiftHours: 0 });
const v5DataNoShifts = buildFlowWithActiveStaff(v5StaffNoShifts, mockFlow);
const v5MetricsNoShifts = computeV5Metrics(v5DataNoShifts);
console.log(`V5.1 SCORE (NO SHIFTS): ${v5MetricsNoShifts.score}`);

console.log("\nComparação de Intervalos:");
v4Staff.forEach((s, i) => {
  const v5s = v5Staff[i];
  const v5sns = v5StaffNoShifts[i];
  console.log(`Emp ${s.id}: V4 = ${s.intervalo} | V5(Shifts) = ${v5s.intervalo} | V5(NoShifts) = ${v5sns.intervalo} | INI = ${mockStaff[i].intervalo}`);
});
