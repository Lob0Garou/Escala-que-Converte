// scripts/run-validation.mjs
/**
 * Validação do Motor V5.1 CORRIGIDO com TODAS as lojas reais.
 * Importa diretamente do motor (sem cópia inline).
 * Uso: node scripts/run-validation.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ESCALA_DIR = 'C:/Users/yuriq/Downloads/ESCALAS CORREÇÃO';
const DIAS_SEMANA = {
  SEGUNDA: '1. Seg', TERÇA: '2. Ter', QUARTA: '3. Qua',
  QUINTA: '4. Qui', SEXTA: '5. Sex', SÁBADO: '6. Sab', DOMINGO: '7. Dom',
};
const DIAS = Object.keys(DIAS_SEMANA);

// ─── XLSX ────────────────────────────────────────────────────────
const xlsxMod = await import('xlsx');
const XLSX = xlsxMod.default;

function loadXlsx(filepath) {
  return XLSX.utils.sheet_to_json(
    XLSX.readFile(filepath, { cellDates: true }).Sheets[
      XLSX.readFile(filepath, { cellDates: true }).SheetNames[0]
    ], { defval: '', raw: true }
  );
}

// ─── PARSERS ─────────────────────────────────────────────────────
function excelTimeToStr(val) {
  if (!val || (typeof val === 'string' && val.toUpperCase() === 'FOLGA')) return null;
  if (typeof val === 'string' && /^\d{1,2}:\d{2}/.test(val)) return val;
  if (val instanceof Date) {
    return `${String(val.getHours()).padStart(2,'0')}:${String(val.getMinutes()).padStart(2,'0')}`;
  }
  if (typeof val === 'number' && val > 0 && val < 1) {
    const totalMin = Math.round(val * 24 * 60);
    return `${String(Math.floor(totalMin / 60) % 24).padStart(2,'0')}:${String(totalMin % 60).padStart(2,'0')}`;
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

// ─── SCORE (correto — µ global) ──────────────────────────────────
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
  // µ GLOBAL (calculado uma vez, correto)
  let totalStaff = 0;
  flowByHour.forEach(h => { totalStaff += byHour[h.hour] || 0; });
  const mu = totalStaff > 0 ? totalFlow / totalStaff : 0;
  if (mu === 0) return 0;

  let weightedDev = 0;
  flowByHour.forEach(h => {
    const activeStaff = byHour[h.hour] || 0;
    if (h.flow === 0 || activeStaff === 0) return;
    const pressure = h.flow / activeStaff;
    const ti = pressure / mu;
    weightedDev += Math.abs(ti - 1) * h.flow;
  });
  return totalFlow > 0 ? Math.max(0, Math.round(100 * (1 - weightedDev / totalFlow))) : 0;
}

function detectGaps(rows, flowByHour) {
  const byHour = calcStaffByHour(rows);
  return flowByHour.filter(h => h.flow > 0 && (byHour[h.hour] || 0) === 0).map(h => h.hour);
}

// ─── MOTOR V5.1 (importado) ─────────────────────────────────────
import { optimizeScheduleRows } from '../src/lib/thermalBalance_v5.js';

// ─── FIND STORE PAIRS ────────────────────────────────────────────
function findStorePairs() {
  const files = readdirSync(ESCALA_DIR).filter(f => f.endsWith('.xlsx'));
  const escalaFiles = files.filter(f => /ESCALA|Escala|escala/.test(f) && !/FLUXO|Fluxo|fluxo/.test(f));
  const fluxoFiles = files.filter(f => /FLUXO|Fluxo|fluxo/.test(f));
  const pairs = [];
  const used = new Set();
  for (const ef of escalaFiles) {
    const m = ef.match(/(\d+)/);
    if (!m) continue;
    const num = m[1];
    // Prefer "VENDEDORES" escala
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
console.log(`\n╔══════════════════════════════════════════════════════════════════════╗`);
console.log(`║    VALIDAÇÃO V5.1 CORRIGIDO — GUARDRAILS PÓS-FASE + SCORE >90     ║`);
console.log(`╚══════════════════════════════════════════════════════════════════════╝`);
console.log(`\nLojas: ${pairs.length}\n`);

let totalDays = 0, totalImprove = 0, totalRegress = 0, totalNeutral = 0;
let sumBaseline = 0, sumOptimized = 0, newGapsTotal = 0;
const regressions = [];
const allDays = [];

for (const pair of pairs) {
  let store;
  try {
    store = loadStore(join(ESCALA_DIR, pair.escalaFile), join(ESCALA_DIR, pair.fluxoFile));
  } catch (e) {
    console.log(`[${pair.storeId}] ERRO: ${e.message}`);
    continue;
  }

  const diasComDados = DIAS.filter(d => store.fluxoByDay[d]?.length > 0);
  let storeImprove = 0, storeRegress = 0, storeNeutral = 0;

  for (const dia of diasComDados) {
    const flow = store.fluxoByDay[dia];
    const staffDia = store.staffRows.filter(r => r.dia === dia);
    if (staffDia.length === 0) continue;

    const baselineScore = computeScore(staffDia, flow);
    const origGaps = detectGaps(staffDia, flow);

    // Otimizar usando motor V5.1 corrigido
    const optimized = optimizeScheduleRows(staffDia, dia, flow, {});
    const optDia = optimized.filter(r => r.dia === dia);
    const optScore = computeScore(optDia, flow);
    const optGaps = detectGaps(optDia, flow);
    const newGaps = optGaps.filter(g => !origGaps.includes(g));

    const delta = optScore - baselineScore;
    totalDays++;
    sumBaseline += baselineScore;
    sumOptimized += optScore;
    newGapsTotal += newGaps.length;

    if (delta > 1) { totalImprove++; storeImprove++; }
    else if (delta < -1) { totalRegress++; storeRegress++; regressions.push({ store: pair.storeId, dia, n: staffDia.length, baselineScore, optScore, delta, newGaps }); }
    else { totalNeutral++; storeNeutral++; }

    allDays.push({ store: pair.storeId, dia, n: staffDia.length, baselineScore, optScore, delta, newGaps: newGaps.length });
  }

  const avgBase = diasComDados.length > 0 ? Math.round(allDays.filter(d => d.store === pair.storeId).reduce((s, d) => s + d.baselineScore, 0) / diasComDados.length) : 0;
  const avgOpt = diasComDados.length > 0 ? Math.round(allDays.filter(d => d.store === pair.storeId).reduce((s, d) => s + d.optScore, 0) / diasComDados.length) : 0;
  console.log(`[${pair.storeId}] ${pair.escalaFile.padEnd(35)} | ${diasComDados.length}d | n≈${staffDia(store, 'SEGUNDA')} | ↑${storeImprove} ↓${storeRegress} =${storeNeutral} | base=${avgBase} → opt=${avgOpt} (Δ${avgOpt-avgBase>=0?'+':''}${avgOpt-avgBase})`);
}

function staffDia(store, dia) {
  return store.staffRows.filter(r => r.dia === dia && r.entrada && r.entrada.toUpperCase() !== 'FOLGA').length;
}

console.log(`\n${'─'.repeat(80)}`);
console.log(`\n📊 RESULTADO CONSOLIDADO\n`);
console.log(`   Dias testados:     ${totalDays}`);
console.log(`   Melhoram (↑):      ${totalImprove} (${(totalImprove/totalDays*100).toFixed(1)}%)`);
console.log(`   Neutros (=):       ${totalNeutral} (${(totalNeutral/totalDays*100).toFixed(1)}%)`);
console.log(`   Regredem (↓):      ${totalRegress} (${(totalRegress/totalDays*100).toFixed(1)}%)`);
console.log(`   Score médio BASE:  ${(sumBaseline/totalDays).toFixed(1)}`);
console.log(`   Score médio OPT:   ${(sumOptimized/totalDays).toFixed(1)}`);
console.log(`   Delta médio:       +${((sumOptimized-sumBaseline)/totalDays).toFixed(1)} pts`);
console.log(`   Gaps criados:      ${newGapsTotal}`);

if (regressions.length > 0) {
  console.log(`\n⚠️  REGRESSÕES:`);
  regressions.forEach(r => console.log(`   Loja ${r.store} ${r.dia}: ${r.baselineScore} → ${r.optScore} (${r.delta}) gaps=[${r.newGaps.join(',')}]`));
}

// Score distribution
console.log(`\n📊 DISTRIBUIÇÃO DE SCORES OPT:`);
const bins = { '≥90': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 };
allDays.forEach(d => {
  if (d.optScore >= 90) bins['≥90']++;
  else if (d.optScore >= 80) bins['80-89']++;
  else if (d.optScore >= 70) bins['70-79']++;
  else if (d.optScore >= 60) bins['60-69']++;
  else bins['<60']++;
});
Object.entries(bins).forEach(([k, v]) => console.log(`   ${k}: ${v} dias (${(v/totalDays*100).toFixed(1)}%)`));

// Worst days
console.log(`\n📊 PIORES DIAS (OPT < 70):`);
allDays.filter(d => d.optScore < 70).sort((a, b) => a.optScore - b.optScore)
  .forEach(d => console.log(`   Loja ${d.store} ${d.dia}: n=${d.n} | base=${d.baselineScore} → opt=${d.optScore} (Δ${d.delta>=0?'+':''}${d.delta})`));

// Best days
console.log(`\n📊 MELHORES DIAS (OPT ≥ 90):`);
allDays.filter(d => d.optScore >= 90).sort((a, b) => b.optScore - a.optScore)
  .forEach(d => console.log(`   Loja ${d.store} ${d.dia}: n=${d.n} | base=${d.baselineScore} → opt=${d.optScore} (Δ${d.delta>=0?'+':''}${d.delta})`));
