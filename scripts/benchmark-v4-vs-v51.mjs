// scripts/benchmark-v4-vs-v51.mjs
/**
 * Benchmark: Motor V4 (site original) vs Motor V5.1 (nosso)
 * Roda AMBOS nos mesmos dados e compara dia a dia.
 *
 * Uso: node scripts/benchmark-v4-vs-v51.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Importar AMBOS os motores
import { optimizeScheduleRows as optimizeV4 } from '../src/lib/thermalBalance.js';
import { optimizeScheduleRows as optimizeV5 } from '../src/lib/thermalBalance_v5.js';

const ESCALA_DIR = 'C:/Users/yuriq/Downloads/ESCALAS CORREÇÃO';
const DIAS = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];

// ─── XLSX ────────────────────────────────────────────────────────
const XLSX = (await import('xlsx')).default;

function loadXlsx(filepath) {
  const wb = XLSX.readFile(filepath, { cellDates: true });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true });
}

// ─── PARSERS ─────────────────────────────────────────────────────
function excelTimeToStr(val) {
  if (!val || (typeof val === 'string' && val.toUpperCase() === 'FOLGA')) return null;
  if (typeof val === 'string' && /^\d{1,2}:\d{2}/.test(val)) return val;
  if (val instanceof Date) {
    return `${String(val.getHours()).padStart(2,'0')}:${String(val.getMinutes()).padStart(2,'0')}`;
  }
  if (typeof val === 'number' && val > 0 && val < 1) {
    const m = Math.round(val * 24 * 60);
    return `${String(Math.floor(m / 60) % 24).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`;
  }
  return null;
}

function parseFluxo(val) {
  if (typeof val === 'string') return parseFloat(val.replace(/[.\s]/g, '').replace(',', '.')) || 0;
  return parseFloat(val) || 0;
}

// ─── LOAD STORE ──────────────────────────────────────────────────
function loadStore(escalaPath, fluxoPath) {
  const escalaRows = loadXlsx(escalaPath);
  const fluxoRows = loadXlsx(fluxoPath);

  const staffRows = escalaRows.slice(1).map((r, i) => {
    const raw = String(r['DIA'] || r['dia'] || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let dia = raw;
    if (raw.includes('SEG')) dia = 'SEGUNDA';
    else if (raw.includes('TER')) dia = 'TERÇA';
    else if (raw.includes('QUA')) dia = 'QUARTA';
    else if (raw.includes('QUI')) dia = 'QUINTA';
    else if (raw.includes('SEX') && !raw.includes('SEXT')) dia = 'SEXTA';
    else if (raw.includes('SAB')) dia = 'SÁBADO';
    else if (raw.includes('DOM')) dia = 'DOMINGO';
    return {
      id: `e${i}`, dia,
      nome: r['ATLETA'] || r['atleta'] || r['NOME'] || r['nome'] || '',
      entrada: excelTimeToStr(r['ENTRADA'] || r['entrada'] || r['ENT'] || ''),
      intervalo: excelTimeToStr(r['INTER'] || r['inter'] || r['INTERVALO'] || r['intervalo'] || ''),
      saida: excelTimeToStr(r['SAIDA'] || r['saida'] || r['SAI'] || ''),
    };
  }).filter(r => r.dia && r.nome);

  const fluxoByDay = {};
  fluxoRows.slice(1).forEach(r => {
    const rawDia = String(r['Dia da Semana'] || '');
    const diaMap = {
      '1. Seg': 'SEGUNDA', '2. Ter': 'TERÇA', '3. Qua': 'QUARTA',
      '4. Qui': 'QUINTA', '5. Sex': 'SEXTA', '6. Sab': 'SÁBADO', '7. Dom': 'DOMINGO',
    };
    let diaKey = null;
    for (const [p, k] of Object.entries(diaMap)) { if (rawDia.includes(p)) { diaKey = k; break; } }
    if (!diaKey) return;
    const hour = parseInt(r['cod_hora_entrada'], 10);
    if (isNaN(hour) || hour < 0 || hour > 23) return;
    if (!fluxoByDay[diaKey]) fluxoByDay[diaKey] = [];
    const convRaw = r['% Conversão'];
    let conversion = 0;
    if (convRaw != null && convRaw !== '') {
      const n = typeof convRaw === 'string' ? parseFloat(convRaw.replace(',', '.')) : parseFloat(convRaw);
      if (!isNaN(n)) conversion = n < 1 ? n * 100 : n;
    }
    fluxoByDay[diaKey].push({ hour, flow: parseFluxo(r['qtd_entrante']), conversion });
  });
  Object.values(fluxoByDay).forEach(arr => arr.sort((a, b) => a.hour - b.hour));
  return { staffRows, fluxoByDay };
}

// ─── SCORE (µ global correto) ────────────────────────────────────
function getHour(ts) {
  if (!ts || typeof ts !== 'string') return null;
  return parseInt(ts.split(':')[0], 10);
}

function calcStaffByHour(rows) {
  const byHour = {};
  for (let h = 0; h < 24; h++) byHour[h] = 0;
  rows.forEach(r => {
    if (!r.entrada || r.entrada.toUpperCase() === 'FOLGA' || !r.saida) return;
    const entH = getHour(r.entrada);
    let saiH = getHour(r.saida);
    if (entH === null || saiH === null) return;
    if (saiH < entH) saiH += 24;
    const intH = r.intervalo ? getHour(r.intervalo) : null;
    for (let h = entH; h < saiH; h++) {
      const nh = h >= 24 ? h - 24 : h;
      if (intH !== null && nh === intH) continue;
      byHour[nh] = (byHour[nh] || 0) + 1;
    }
  });
  return byHour;
}

function computeScore(rows, flowByHour) {
  const byHour = calcStaffByHour(rows);
  const totalFlow = flowByHour.reduce((s, h) => s + h.flow, 0);
  let totalStaff = 0;
  flowByHour.forEach(h => { totalStaff += byHour[h.hour] || 0; });
  const mu = totalStaff > 0 ? totalFlow / totalStaff : 0;
  if (mu === 0 || totalFlow === 0) return 0;
  let weightedDev = 0;
  flowByHour.forEach(h => {
    const staff = byHour[h.hour] || 0;
    if (h.flow === 0 || staff === 0) return;
    const ti = (h.flow / staff) / mu;
    weightedDev += Math.abs(ti - 1) * h.flow;
  });
  return Math.max(0, Math.round(100 * (1 - weightedDev / totalFlow)));
}

function detectGaps(rows, flowByHour) {
  const byHour = calcStaffByHour(rows);
  return flowByHour.filter(h => h.flow > 0 && (byHour[h.hour] || 0) === 0).map(h => h.hour);
}

// ─── FIND STORE PAIRS ────────────────────────────────────────────
function findStorePairs() {
  const files = readdirSync(ESCALA_DIR).filter(f => f.endsWith('.xlsx'));
  const escalaFiles = files.filter(f => /escala/i.test(f) && !/fluxo/i.test(f));
  const fluxoFiles = files.filter(f => /fluxo/i.test(f));
  const pairs = [];
  const used = new Set();
  for (const ef of escalaFiles) {
    const m = ef.match(/(\d+)/);
    if (!m) continue;
    const num = m[1];
    const ff = fluxoFiles.find(f => f.includes(num));
    if (ff && !used.has(num)) {
      used.add(num);
      pairs.push({ storeId: num, escalaFile: ef, fluxoFile: ff });
    }
  }
  return pairs.sort((a, b) => a.storeId.localeCompare(b.storeId));
}

// ─── MAIN ────────────────────────────────────────────────────────
const pairs = findStorePairs();
console.log(`\n╔══════════════════════════════════════════════════════════════════════════╗`);
console.log(`║          BENCHMARK: V4 (site original) vs V5.1 (nosso motor)          ║`);
console.log(`╚══════════════════════════════════════════════════════════════════════════╝\n`);
console.log(`Lojas pareadas: ${pairs.length}\n`);

const allDays = [];
let v4Wins = 0, v5Wins = 0, ties = 0;

for (const pair of pairs) {
  let store;
  try {
    store = loadStore(join(ESCALA_DIR, pair.escalaFile), join(ESCALA_DIR, pair.fluxoFile));
  } catch (e) {
    console.log(`[${pair.storeId}] ERRO: ${e.message}`);
    continue;
  }

  const diasComDados = DIAS.filter(d => store.fluxoByDay[d]?.length > 0);

  for (const dia of diasComDados) {
    const flow = store.fluxoByDay[dia];
    const staffDia = store.staffRows.filter(r => r.dia === dia);
    if (staffDia.length === 0) continue;

    const baseline = computeScore(staffDia, flow);
    if (baseline === 0) continue; // Sem dados válidos

    const origGaps = detectGaps(staffDia, flow);

    // V4 (só breaks)
    const v4Result = optimizeV4(staffDia, dia, flow, {});
    const v4Dia = v4Result.filter(r => r.dia === dia);
    const scoreV4 = computeScore(v4Dia, flow);
    const v4Gaps = detectGaps(v4Dia, flow).filter(g => !origGaps.includes(g));

    // V5.1 (breaks + shifts + guardrails)
    const v5Result = optimizeV5(staffDia, dia, flow, {});
    const v5Dia = v5Result.filter(r => r.dia === dia);
    const scoreV5 = computeScore(v5Dia, flow);
    const v5Gaps = detectGaps(v5Dia, flow).filter(g => !origGaps.includes(g));

    const deltaV4 = scoreV4 - baseline;
    const deltaV5 = scoreV5 - baseline;
    let winner = 'TIE';
    if (scoreV4 > scoreV5 + 1) { winner = 'V4'; v4Wins++; }
    else if (scoreV5 > scoreV4 + 1) { winner = 'V5'; v5Wins++; }
    else { ties++; }

    allDays.push({
      store: pair.storeId, dia, n: staffDia.length,
      baseline, scoreV4, scoreV5, deltaV4, deltaV5,
      winner, v4Gaps: v4Gaps.length, v5Gaps: v5Gaps.length,
    });
  }
}

// ─── TABELA DETALHADA ────────────────────────────────────────────
console.log(`${'Loja'.padEnd(6)} ${'Dia'.padEnd(10)} ${'n'.padStart(3)} ${'Base'.padStart(5)} ${'V4'.padStart(5)} ${'V5.1'.padStart(5)} ${'ΔV4'.padStart(5)} ${'ΔV5'.padStart(5)} ${'Venc'.padStart(5)} ${'GapsV4'.padStart(7)} ${'GapsV5'.padStart(7)}`);
console.log('─'.repeat(72));

for (const d of allDays) {
  const mark = d.winner === 'V4' ? ' 🔴' : d.winner === 'V5' ? ' 🟢' : '';
  console.log(
    `${d.store.padEnd(6)} ${d.dia.padEnd(10)} ${String(d.n).padStart(3)} ` +
    `${String(d.baseline).padStart(5)} ${String(d.scoreV4).padStart(5)} ${String(d.scoreV5).padStart(5)} ` +
    `${(d.deltaV4 >= 0 ? '+' : '') + d.deltaV4}`.padStart(5) + ` ` +
    `${(d.deltaV5 >= 0 ? '+' : '') + d.deltaV5}`.padStart(5) + ` ` +
    `${d.winner.padStart(5)}${mark} ` +
    `${String(d.v4Gaps).padStart(7)} ${String(d.v5Gaps).padStart(7)}`
  );
}

// ─── RESUMO ──────────────────────────────────────────────────────
const total = allDays.length;
const avgBase = (allDays.reduce((s, d) => s + d.baseline, 0) / total).toFixed(1);
const avgV4 = (allDays.reduce((s, d) => s + d.scoreV4, 0) / total).toFixed(1);
const avgV5 = (allDays.reduce((s, d) => s + d.scoreV5, 0) / total).toFixed(1);
const avgDV4 = (allDays.reduce((s, d) => s + d.deltaV4, 0) / total).toFixed(1);
const avgDV5 = (allDays.reduce((s, d) => s + d.deltaV5, 0) / total).toFixed(1);
const totalV4Gaps = allDays.reduce((s, d) => s + d.v4Gaps, 0);
const totalV5Gaps = allDays.reduce((s, d) => s + d.v5Gaps, 0);

console.log(`\n${'═'.repeat(72)}`);
console.log(`\n📊 RESULTADO CONSOLIDADO (${total} dias com dados válidos)\n`);
console.log(`   Score médio BASELINE: ${avgBase}`);
console.log(`   Score médio V4:       ${avgV4} (Δ${avgDV4})`);
console.log(`   Score médio V5.1:     ${avgV5} (Δ${avgDV5})`);
console.log(`   Vencedor global:      ${parseFloat(avgV4) > parseFloat(avgV5) ? 'V4 🔴' : parseFloat(avgV5) > parseFloat(avgV4) ? 'V5.1 🟢' : 'EMPATE'}`);
console.log(`\n   V4 vence:  ${v4Wins} dias (${(v4Wins/total*100).toFixed(1)}%)`);
console.log(`   V5 vence:  ${v5Wins} dias (${(v5Wins/total*100).toFixed(1)}%)`);
console.log(`   Empate:    ${ties} dias (${(ties/total*100).toFixed(1)}%)`);
console.log(`\n   Gaps criados V4:  ${totalV4Gaps}`);
console.log(`   Gaps criados V5:  ${totalV5Gaps}`);

// ─── DIAS ONDE V4 VENCE ──────────────────────────────────────────
const v4WinDays = allDays.filter(d => d.winner === 'V4').sort((a, b) => (b.scoreV4 - b.scoreV5) - (a.scoreV4 - a.scoreV5));
if (v4WinDays.length > 0) {
  console.log(`\n⚠️  DIAS ONDE V4 SUPERA V5.1 (${v4WinDays.length} dias):`);
  v4WinDays.forEach(d => {
    console.log(`   Loja ${d.store} ${d.dia}: n=${d.n} | base=${d.baseline} | V4=${d.scoreV4}(+${d.deltaV4}) vs V5=${d.scoreV5}(+${d.deltaV5}) | diff=${d.scoreV4-d.scoreV5}`);
  });
}

// ─── DIAS ONDE V5.1 VENCE ────────────────────────────────────────
const v5WinDays = allDays.filter(d => d.winner === 'V5').sort((a, b) => (b.scoreV5 - b.scoreV4) - (a.scoreV5 - a.scoreV4));
if (v5WinDays.length > 0) {
  console.log(`\n✅ DIAS ONDE V5.1 SUPERA V4 (${v5WinDays.length} dias):`);
  v5WinDays.forEach(d => {
    console.log(`   Loja ${d.store} ${d.dia}: n=${d.n} | base=${d.baseline} | V5=${d.scoreV5}(+${d.deltaV5}) vs V4=${d.scoreV4}(+${d.deltaV4}) | diff=${d.scoreV5-d.scoreV4}`);
  });
}

// ─── DISTRIBUIÇÃO SCORE V4 vs V5 ────────────────────────────────
console.log(`\n📊 DISTRIBUIÇÃO DE SCORES:`);
const bins = ['≥90', '80-89', '70-79', '60-69', '<60'];
const ranges = [[90,101],[80,90],[70,80],[60,70],[0,60]];
console.log(`   Faixa   |  V4  |  V5.1`);
console.log(`   --------|------|------`);
for (let i = 0; i < bins.length; i++) {
  const [lo, hi] = ranges[i];
  const cntV4 = allDays.filter(d => d.scoreV4 >= lo && d.scoreV4 < hi).length;
  const cntV5 = allDays.filter(d => d.scoreV5 >= lo && d.scoreV5 < hi).length;
  console.log(`   ${bins[i].padEnd(7)} | ${String(cntV4).padStart(4)} | ${String(cntV5).padStart(4)}`);
}
