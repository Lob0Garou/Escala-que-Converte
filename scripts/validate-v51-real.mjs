// scripts/validate-v51-real.mjs
/**
 * Validação do Motor V5.1 PATCHED com TODAS as lojas de ESCALAS CORREÇÃO
 *
 * Para cada loja (ESCALA + FLUXO pareados):
 *  1. Baseline: score térmico original (intervalos da escala carregada)
 *  2. PATCHED: score após motor V5.1 patched (B.1 + A + B.2)
 *  3. Reporta delta, gaps, opener/closer preservados
 *
 * Uso: node scripts/validate-v51-real.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ESCALA_DIR = 'C:/Users/yuriq/Downloads/ESCALAS CORREÇÃO';

// ─── DAY MAPPING ─────────────────────────────────────────────────────────────
const DIAS_SEMANA = {
  SEGUNDA: '1. Seg',
  TERÇA:   '2. Ter',
  QUARTA:  '3. Qua',
  QUINTA:  '4. Qui',
  SEXTA:   '5. Sex',
  SÁBADO:  '6. Sab',
  DOMINGO: '7. Dom',
};
const DIAS_INTERNAL = Object.keys(DIAS_SEMANA);

// ─── XLSX LOADER ─────────────────────────────────────────────────────────────
const xlsxMod = await import('xlsx');
const XLSX = xlsxMod.default;

function loadXlsx(filepath) {
  const wb = XLSX.readFile(filepath, { cellDates: true });
  const firstSheet = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
}

// ─── PARSERS ─────────────────────────────────────────────────────────────────
function excelTimeToString(val) {
  if (!val || (typeof val === 'string' && val.toUpperCase() === 'FOLGA')) return null;
  if (typeof val === 'string' && /^\d{1,2}:\d{2}/.test(val)) return val;
  if (val instanceof Date) {
    return `${String(val.getHours()).padStart(2,'0')}:${String(val.getMinutes()).padStart(2,'0')}`;
  }
  if (typeof val === 'number' && val > 0 && val < 1) {
    const totalMinutes = Math.round(val * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
  return null;
}

function parseNumber(val) {
  if (typeof val === 'string') {
    return parseFloat(val.replace(/\./g,'').replace(',','.')) || 0;
  }
  return parseFloat(val) || 0;
}

function parseFluxoValor(val) {
  if (typeof val === 'string') {
    const clean = val.replace(/[.\s]/g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }
  if (typeof val === 'number') return val || 0;
  return 0;
}

// ─── LOAD STORE ───────────────────────────────────────────────────────────────
function loadStore(escalaPath, fluxoPath) {
  const escalaRows = loadXlsx(escalaPath);
  const fluxoRows = loadXlsx(fluxoPath);

  // Parse ESCALA
  // Headers: DIA, ATLETA, ENTRADA, INTER, SAIDA
  const staffRows = escalaRows.slice(1).map((r, i) => {
    const raw = r['DIA'] || r['dia'] || '';
    const dia = typeof raw === 'string' ? raw.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'') : '';
    // Normalize day names
    let diaNorm = dia;
    if (dia.includes('SEG')) diaNorm = 'SEGUNDA';
    else if (dia.includes('TER')) diaNorm = 'TERÇA';
    else if (dia.includes('QUA')) diaNorm = 'QUARTA';
    else if (dia.includes('QUI')) diaNorm = 'QUINTA';
    else if (dia.includes('SEX') && !dia.includes('SEXT')) diaNorm = 'SEXTA';
    else if (dia.includes('SAB') || dia.includes('SÁB')) diaNorm = 'SÁBADO';
    else if (dia.includes('DOM')) diaNorm = 'DOMINGO';

    return {
      id: `e${i}`,
      dia: diaNorm,
      nome: r['ATLETA'] || r['atleta'] || r['NOME'] || r['nome'] || '',
      entrada: excelTimeToString(r['ENTRADA'] || r['entrada'] || r['ENT'] || r['ent'] || ''),
      intervalo: excelTimeToString(r['INTER'] || r['inter'] || r['INTERVALO'] || r['intervalo'] || ''),
      saida: excelTimeToString(r['SAIDA'] || r['saida'] || r['SAI'] || r['sai'] || ''),
    };
  }).filter(r => r.dia && r.nome);

  // Parse FLUXO
  // Headers: Dia da Semana, cod_hora_entrada, qtd_entrante, % Conversão, qtd_cupom
  const fluxoByDay = {};
  fluxoRows.slice(1).forEach(r => {
    const rawDia = String(r['Dia da Semana'] || '');
    // Direct match: "1. Seg" → SEGUNDA, etc.
    let diaKey = null;
    const diaMap = {
      '1. Seg': 'SEGUNDA', '2. Ter': 'TERÇA', '3. Qua': 'QUARTA',
      '4. Qui': 'QUINTA', '5. Sex': 'SEXTA', '6. Sab': 'SÁBADO', '7. Dom': 'DOMINGO',
    };
    for (const [pattern, key] of Object.entries(diaMap)) {
      if (rawDia.includes(pattern)) { diaKey = key; break; }
    }
    if (!diaKey) return;

    const hour = parseInt(r['cod_hora_entrada'], 10);
    // Skip "Total" rows and invalid hours
    if (isNaN(hour) || hour < 0 || hour > 23) return;

    if (!fluxoByDay[diaKey]) fluxoByDay[diaKey] = [];

    const convRaw = r['% Conversão'];
    let conversion = 0;
    if (convRaw !== '' && convRaw != null && convRaw !== undefined) {
      const n = typeof convRaw === 'string' ? parseFloat(convRaw.replace(',','.')) : parseFloat(convRaw);
      if (!isNaN(n)) conversion = n < 1 ? n * 100 : n;
    }

    fluxoByDay[diaKey].push({
      hour,
      flow: parseFluxoValor(r['qtd_entrante']),
      conversion,
    });
  });

  // Sort fluxo by hour
  Object.values(fluxoByDay).forEach(arr => arr.sort((a, b) => a.hour - b.hour));

  return { staffRows, fluxoByDay };
}

// ─── SCORE COMPUTATION ───────────────────────────────────────────────────────
function scoreToHour(ts) {
  if (!ts || typeof ts !== 'string') return null;
  return parseInt(ts.split(':')[0], 10);
}

function calcStaffByHour(rows) {
  const byHour = {};
  for (let h = 0; h < 24; h++) byHour[h] = 0;
  rows.forEach(r => {
    if (!r.entrada || r.entrada.toUpperCase() === 'FOLGA' || !r.saida) return;
    const entH = scoreToHour(r.entrada);
    let saiH = scoreToHour(r.saida);
    if (saiH < entH) saiH += 24;
    const intH = r.intervalo ? scoreToHour(r.intervalo) : null;
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
  let weightedDev = 0;
  flowByHour.forEach(h => {
    const activeStaff = byHour[h.hour] || 0;
    totalStaff += activeStaff;
    if (h.flow === 0 || activeStaff === 0) return;
    const pressure = h.flow / activeStaff;
    const mu = totalStaff > 0 ? totalFlow / totalStaff : 0;
    if (mu > 0) {
      const ti = pressure / mu;
      weightedDev += Math.abs(ti - 1) * h.flow;
    }
  });
  const loss = totalFlow > 0 ? weightedDev / totalFlow : 0;
  return Math.max(0, Math.round(100 * (1 - loss)));
}

function detectGaps(rows, flowByHour) {
  const byHour = calcStaffByHour(rows);
  const gaps = [];
  flowByHour.forEach(h => {
    if (h.flow > 0 && (byHour[h.hour] || 0) === 0) {
      gaps.push(h.hour);
    }
  });
  return gaps;
}

function detectOpenerCloserPreserved(originalRows, optimizedRows) {
  // Check that openers/closers weren't shifted
  let preserved = 0;
  let total = 0;
  originalRows.forEach((orig, i) => {
    const opt = optimizedRows[i];
    if (!orig || !opt) return;
    if (!orig.entrada || orig.entrada.toUpperCase() === 'FOLGA') return;
    total++;
    // If entrada and saida are the same, opener/closer preserved
    if (orig.entrada === opt.entrada && orig.saida === opt.saida) {
      preserved++;
    }
  });
  return { preserved, total };
}

// ─── FIND STORE PAIRS ─────────────────────────────────────────────────────────
function findStorePairs() {
  const files = readdirSync(ESCALA_DIR).filter(f => f.endsWith('.xlsx'));
  const escalaFiles = files.filter(f => f.match(/ESCALA/i));
  const fluxoFiles = files.filter(f => f.match(/FLUXO/i));

  // Extract store numbers from filenames
  function extractNumber(filename) {
    const m = filename.match(/(\d+)/);
    return m ? m[1] : null;
  }

  const pairs = [];
  const usedFluxo = new Set();

  for (const ef of escalaFiles) {
    const num = extractNumber(ef);
    if (!num) continue;
    // Find matching fluxo file
    const matchingFluxo = fluxoFiles.find(f => f.includes(num));
    if (matchingFluxo && !usedFluxo.has(matchingFluxo)) {
      usedFluxo.add(matchingFluxo);
      pairs.push({
        storeId: num,
        escalaFile: ef,
        fluxoFile: matchingFluxo,
      });
    }
  }

  // Also try reverse: fluxo without escala match
  for (const ff of fluxoFiles) {
    if (usedFluxo.has(ff)) continue;
    const num = extractNumber(ff);
    if (!num) continue;
    // Check if there's a matching escala
    const matchingEscala = escalaFiles.find(f => f.includes(num));
    if (matchingEscala) {
      pairs.push({
        storeId: num,
        escalaFile: matchingEscala,
        fluxoFile: ff,
      });
    }
  }

  return pairs.sort((a, b) => a.storeId.localeCompare(b.storeId));
}

// ─── V5.1 PATCHED ENGINE (inline) ───────────────────────────────────────────
const SLOTS_PER_HOUR = 4;
const TOTAL_HOURS = 24;

function toSlot(ti) {
  if (!ti || (typeof ti === 'string' && ti.toUpperCase() === 'FOLGA')) return null;
  let totalMinutes = 0;
  if (typeof ti === 'string') {
    const [h, m] = ti.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    totalMinutes = h * 60 + m;
  } else if (typeof ti === 'number') {
    totalMinutes = Math.round(ti * 60);
  }
  return Math.floor(totalMinutes / 15);
}

function fromSlot(slotIdx) {
  if (slotIdx == null || slotIdx < 0) return '';
  const totalMinutes = slotIdx * 15;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function toHour(ts) {
  if (!ts || typeof ts !== 'string') return null;
  return parseInt(ts.split(':')[0], 10);
}

function getStoreHours(hourlyFlowData) {
  if (!hourlyFlowData || hourlyFlowData.length === 0) return { min: 6, max: 22 };
  let min = 24, max = 0;
  hourlyFlowData.forEach(h => {
    if ((h.flow || 0) > 0) {
      if (h.hour < min) min = h.hour;
      if (h.hour + 1 > max) max = h.hour + 1;
    }
  });
  if (min >= max) return { min: 6, max: 22 };
  return { min, max };
}

function classifyStaff(staffRows, storeHours) {
  return staffRows.map(row => {
    if (!row.entrada || row.entrada.toUpperCase() === 'FOLGA' || !row.saida) {
      return { ...row, role: 'folga' };
    }
    const entH = toHour(row.entrada);
    const saiMin = toSlot(row.saida);
    const saidaDecimal = saiMin != null ? (saiMin * 15) / 60 : toHour(row.saida);
    const isOpener = entH != null && entH < storeHours.min;
    const isCloser = saidaDecimal != null && saidaDecimal > storeHours.max;
    let role = 'flex';
    if (isOpener && isCloser) role = 'opener+closer';
    else if (isOpener) role = 'opener';
    else if (isCloser) role = 'closer';
    return { ...row, role };
  });
}

function buildHourlyFlow(hourlyData) {
  const v = new Array(96).fill(0);
  if (!hourlyData) return v;
  hourlyData.forEach(h => {
    if (h.hour >= 0 && h.hour < 24) {
      const start = h.hour * SLOTS_PER_HOUR;
      const val = (h.flow || 0) / SLOTS_PER_HOUR;
      for (let i = 0; i < SLOTS_PER_HOUR; i++) v[start + i] = val;
    }
  });
  return v;
}

function buildWeightedFlowVector(hourlyFlowData) {
  const base = buildHourlyFlow(hourlyFlowData);
  if (!hourlyFlowData || hourlyFlowData.length === 0) return base;
  const withConv = hourlyFlowData.filter(h => h.conversion > 0 && h.flow > 0);
  if (withConv.length === 0) return base;
  const avgConv = withConv.reduce((s, h) => s + h.conversion, 0) / withConv.length;
  if (avgConv <= 0) return base;
  const weightByHour = {};
  hourlyFlowData.forEach(h => {
    if (h.conversion > 0 && h.flow > 0) {
      const ratio = h.conversion / avgConv;
      weightByHour[h.hour] = Math.max(0.8, Math.min(1.5, ratio));
    }
  });
  const weighted = new Array(96).fill(0);
  for (let h = 0; h < TOTAL_HOURS; h++) {
    const w = weightByHour[h] ?? 1.0;
    for (let s = 0; s < SLOTS_PER_HOUR; s++) {
      weighted[h * SLOTS_PER_HOUR + s] = base[h * SLOTS_PER_HOUR + s] * w;
    }
  }
  return weighted;
}

function buildHourlyFlowArray(flowVector) {
  const hourly = new Array(TOTAL_HOURS).fill(0);
  for (let h = 0; h < TOTAL_HOURS; h++) {
    for (let s = 0; s < SLOTS_PER_HOUR; s++) {
      hourly[h] += flowVector[h * SLOTS_PER_HOUR + s];
    }
  }
  return hourly;
}

function buildHourlyCoverage(staffState) {
  const cov = new Array(TOTAL_HOURS).fill(0);
  staffState.forEach(emp => {
    if (emp.slotEntrada == null || emp.slotSaida == null) return;
    const eH = Math.floor(emp.slotEntrada / SLOTS_PER_HOUR);
    const oH = Math.floor(emp.slotSaida / SLOTS_PER_HOUR);
    const bH = emp.slotIntervalo != null ? Math.floor(emp.slotIntervalo / SLOTS_PER_HOUR) : null;
    for (let h = eH; h < oH && h < TOTAL_HOURS; h++) {
      if (bH != null && h === bH) continue;
      cov[h]++;
    }
  });
  return cov;
}

function computeMu(hourlyFlow, hourCov) {
  let totalFlow = 0, totalCov = 0;
  for (let h = 0; h < TOTAL_HOURS; h++) {
    if (hourlyFlow[h] > 0) {
      totalFlow += hourlyFlow[h];
      totalCov += hourCov[h];
    }
  }
  return totalCov > 0 ? totalFlow / totalCov : 0;
}

const V5_CONFIG = {
  PEQUENA: { maxRounds: 40, timeoutMs: 800 },
  MEDIA:   { maxRounds: 60, timeoutMs: 1500 },
  GRANDE:  { maxRounds: 100, timeoutMs: 4000 },
};

function detectProfile(staffCount) {
  if (staffCount <= 10) return 'PEQUENA';
  if (staffCount <= 50) return 'MEDIA';
  return 'GRANDE';
}

function coordinateDescentV5(staffState, flowVector, weightVector, config) {
  const startTime = Date.now();
  const { maxRounds, timeoutMs } = config;
  const effectiveFlow = weightVector || flowVector;
  const hourlyFlow = buildHourlyFlowArray(effectiveFlow);
  const state = staffState.map((s, idx) => ({
    id: idx, originalId: s.originalId ?? s.id,
    slotEntrada: s.slotEntrada, slotSaida: s.slotSaida, slotIntervalo: s.slotIntervalo,
  }));
  const hourCov = buildHourlyCoverage(state);

  for (let round = 0; round < maxRounds; round++) {
    if (Date.now() - startTime > timeoutMs) break;
    const mu = computeMu(hourlyFlow, hourCov);
    if (mu === 0) break;

    const empOrder = state.map((emp, idx) => {
      let priority = 0;
      const brkH = emp.slotIntervalo != null ? Math.floor(emp.slotIntervalo / SLOTS_PER_HOUR) : null;
      if (brkH != null && hourlyFlow[brkH] > 0 && hourCov[brkH] > 0) {
        priority = Math.abs(hourlyFlow[brkH] / hourCov[brkH] - mu) * hourlyFlow[brkH];
      }
      return { idx, priority };
    });
    empOrder.sort((a, b) => b.priority - a.priority);
    let anyImprovement = false;

    for (const { idx } of empOrder) {
      const emp = state[idx];
      if (emp.slotIntervalo == null) continue;
      const minBrkSlot = emp.slotEntrada + 8;
      const maxBrkSlot = emp.slotSaida - 8 - 4;
      if (minBrkSlot > maxBrkSlot) continue;
      const curBrkSlot = emp.slotIntervalo;
      const curH = Math.floor(curBrkSlot / SLOTS_PER_HOUR);
      let bestDelta = -1e-9;
      let bestBrkSlot = null;

      for (let candSlot = minBrkSlot; candSlot <= maxBrkSlot; candSlot++) {
        if (candSlot === curBrkSlot) continue;
        const candH = Math.floor(candSlot / SLOTS_PER_HOUR);
        if (candH === curH) continue;
        let delta = 0;
        if (hourlyFlow[candH] > 0) {
          const c0 = hourCov[candH];
          const p0 = c0 > 0 ? hourlyFlow[candH] / c0 : hourlyFlow[candH] * 10;
          const p1 = c0 > 1 ? hourlyFlow[candH] / (c0 - 1) : hourlyFlow[candH] * 10;
          if (c0 <= 1 && hourlyFlow[candH] > 0) continue;
          delta += (Math.abs(p1 - mu) - Math.abs(p0 - mu)) * hourlyFlow[candH];
        }
        if (hourlyFlow[curH] > 0) {
          const c0 = hourCov[curH];
          const p0 = c0 > 0 ? hourlyFlow[curH] / c0 : hourlyFlow[curH] * 10;
          const p1 = hourlyFlow[curH] / (c0 + 1);
          delta += (Math.abs(p1 - mu) - Math.abs(p0 - mu)) * hourlyFlow[curH];
        }
        if (delta < bestDelta) {
          bestDelta = delta;
          bestBrkSlot = candSlot;
        }
      }
      if (bestBrkSlot != null) {
        const newH = Math.floor(bestBrkSlot / SLOTS_PER_HOUR);
        if (curH !== newH) { hourCov[curH]++; hourCov[newH]--; }
        emp.slotIntervalo = bestBrkSlot;
        anyImprovement = true;
      }
    }
    if (!anyImprovement) break;
  }
  return state;
}

// ── suggestShifts PATCHED (H1 fix: µ recalculado por candidato) ──
function suggestShifts(staffRows, hourlyFlowData, opts = {}) {
  const maxShiftHours = opts.maxShiftHours ?? 1;
  const maxShiftSlots = maxShiftHours * SLOTS_PER_HOUR;
  if (!hourlyFlowData || hourlyFlowData.length === 0) {
    return staffRows.map(r => ({ ...r }));
  }
  const storeHours = getStoreHours(hourlyFlowData);
  const flowSlots = buildHourlyFlow(hourlyFlowData);
  const hourlyFlow = buildHourlyFlowArray(flowSlots);
  const classified = classifyStaff(staffRows, storeHours);
  const globalCov = new Array(TOTAL_HOURS).fill(0);
  classified.forEach(r => {
    if (r.role === 'folga') return;
    const sE = toSlot(r.entrada); const sS = toSlot(r.saida); const sI = r.intervalo ? toSlot(r.intervalo) : null;
    if (!sE || !sS) return;
    const eH = Math.floor(sE / SLOTS_PER_HOUR); const oH = Math.floor(sS / SLOTS_PER_HOUR);
    const bH = sI != null ? Math.floor(sI / SLOTS_PER_HOUR) : null;
    for (let h = eH; h < oH && h < TOTAL_HOURS; h++) { if (bH != null && h === bH) continue; globalCov[h]++; }
  });

  const results = classified.map(r => ({ ...r }));

  for (let idx = 0; idx < results.length; idx++) {
    const row = results[idx];
    if (row.role !== 'flex') continue;
    const slotE = toSlot(row.entrada); const slotS = toSlot(row.saida); const slotI = row.intervalo ? toSlot(row.intervalo) : null;
    if (slotE == null || slotS == null || slotI == null) continue;
    const entH = Math.floor(slotE / SLOTS_PER_HOUR);
    const outH = Math.floor(slotS / SLOTS_PER_HOUR);
    const brkH = Math.floor(slotI / SLOTS_PER_HOUR);

    let bestShiftSlots = 0;
    let bestCostDelta = 0;

    for (let shift = -maxShiftSlots; shift <= maxShiftSlots; shift += SLOTS_PER_HOUR) {
      if (shift === 0) continue;
      const delta = Math.floor(shift / SLOTS_PER_HOUR);
      const newEntH = entH + delta;
      const newOutH = outH + delta;
      const newBrkH = brkH + delta;
      if (newEntH < storeHours.min || newOutH > storeHours.max) continue;
      const minBrkH = newEntH + 2;
      const maxBrkH = newOutH - 2 - 1;
      if (newBrkH < minBrkH || newBrkH > maxBrkH) continue;

      let createsGap = false;
      for (let h = entH; h < outH && h < TOTAL_HOURS; h++) {
        if (h === brkH) continue;
        if (globalCov[h] - 1 <= 0 && hourlyFlow[h] > 0) {
          if (h < newEntH || h >= newOutH || h === newBrkH) { createsGap = true; break; }
        }
      }
      if (createsGap) continue;

      // FIX H1: µ recalculado para cada candidato de shift
      const mu = computeMu(hourlyFlow, globalCov);

      let costDelta = 0;
      // Horas que perdem coverage
      for (let h = entH; h < outH && h < TOTAL_HOURS; h++) {
        if (h === brkH) continue;
        if (h >= newEntH && h < newOutH && h !== newBrkH) continue;
        if (hourlyFlow[h] <= 0 || globalCov[h] <= 0) continue;
        const pBefore = hourlyFlow[h] / globalCov[h];
        const devBefore = Math.abs(pBefore / mu - 1) * hourlyFlow[h];
        if (globalCov[h] === 1) {
          costDelta -= devBefore;
        } else {
          const pAfter = hourlyFlow[h] / (globalCov[h] - 1);
          costDelta += (Math.abs(pAfter / mu - 1) - Math.abs(pBefore / mu - 1)) * hourlyFlow[h];
        }
      }
      // Horas que ganham coverage
      for (let h = newEntH; h < newOutH && h < TOTAL_HOURS; h++) {
        if (h === newBrkH) continue;
        if (h >= entH && h < outH && h !== brkH) continue;
        if (hourlyFlow[h] <= 0) continue;
        const pAfter = hourlyFlow[h] / (globalCov[h] + 1);
        const devAfter = Math.abs(pAfter / mu - 1) * hourlyFlow[h];
        if (globalCov[h] === 0) {
          costDelta += devAfter;
        } else {
          const pBefore = hourlyFlow[h] / globalCov[h];
          costDelta += (Math.abs(pAfter / mu - 1) - Math.abs(pBefore / mu - 1)) * hourlyFlow[h];
        }
      }

      if (costDelta < bestCostDelta) {
        bestCostDelta = costDelta;
        bestShiftSlots = shift;
      }
    }

    if (bestShiftSlots === 0) continue;

    for (let h = entH; h < outH && h < TOTAL_HOURS; h++) { if (h === brkH) continue; globalCov[h]--; }
    const newSlotE = slotE + bestShiftSlots;
    const newSlotS = slotS + bestShiftSlots;
    const newSlotI = slotI + bestShiftSlots;
    const newEH = Math.floor(newSlotE / SLOTS_PER_HOUR);
    const newOH = Math.floor(newSlotS / SLOTS_PER_HOUR);
    const newBH = Math.floor(newSlotI / SLOTS_PER_HOUR);
    for (let h = newEH; h < newOH && h < TOTAL_HOURS; h++) { if (h === newBH) continue; globalCov[h]++; }

    results[idx] = { ...row, entrada: fromSlot(newSlotE), saida: fromSlot(newSlotS), intervalo: fromSlot(newSlotI) };
  }

  return results.map(({ role, ...rest }) => rest);
}

// ─── FULL V5.1 PATCHED (with phase instrumentation) ─────────────────────────
function optimizeV51Patched(staffRows, selectedDay, thermalRowsByHour, opts = {}) {
  const dayStaff = staffRows.filter(r =>
    r.dia === selectedDay && r.entrada && r.entrada.toUpperCase() !== 'FOLGA' && r.saida
  );
  if (dayStaff.length === 0) return { rows: staffRows, phaseScores: null };
  const profile = detectProfile(dayStaff.length);
  const v5Config = V5_CONFIG[profile];

  const flowVector = buildHourlyFlow(thermalRowsByHour);
  const weightedFlow = buildWeightedFlowVector(thermalRowsByHour);

  // B.1
  const optimizable = dayStaff.map(s => ({
    ...s, originalId: s.id,
    slotEntrada: toSlot(s.entrada), slotSaida: toSlot(s.saida),
    slotIntervalo: s.intervalo ? toSlot(s.intervalo) : null,
  }));

  // GUARDRAIL: skip B.1 em cenários de subcobertura severa
  const hourCov = buildHourlyCoverage(optimizable);
  const hourlyFlowGuard = buildHourlyFlowArray(flowVector);
  const totalFlowGuard = hourlyFlowGuard.reduce((s, f) => s + f, 0);
  const gapFlow = hourlyFlowGuard.reduce((s, f, h) => totalFlowGuard > 0 && hourCov[h] === 0 ? s + f : s, 0);
  const gapPct = totalFlowGuard > 0 ? gapFlow / totalFlowGuard * 100 : 0;
  const totalCov = hourCov.reduce((s, c) => s + c, 0);
  const muGuard = totalCov > 0 ? totalFlowGuard / totalCov : 0;
  // Baseline score guardrail (espelha src/lib/thermalBalance_v5.js)
  const totalCovB0 = totalCov;
  const muBaseline = totalCovB0 > 0 ? totalFlowGuard / totalCovB0 : 0;
  let weightedDevBaseline = 0;
  hourlyFlowGuard.forEach((f, h) => {
    if (f > 0 && hourCov[h] > 0) {
      const ti = f / hourCov[h] / muBaseline;
      weightedDevBaseline += Math.abs(ti - 1) * f;
    }
  });
  const lossBaseline = totalFlowGuard > 0 ? weightedDevBaseline / totalFlowGuard : 0;
  const baselineScore = Math.max(0, Math.round(100 * (1 - lossBaseline)));
  const skipByScore = baselineScore >= 55;
  const skipB1 = gapPct > 15 || muGuard > 40 || skipByScore;

  const afterB1 = skipB1 ? optimizable : coordinateDescentV5(optimizable, flowVector, weightedFlow, v5Config);
  let rowsB1 = staffRows.map(row => {
    const opt = afterB1.find(o => o.originalId === row.id);
    if (opt && opt.slotIntervalo != null) return { ...row, intervalo: fromSlot(opt.slotIntervalo) };
    return row;
  });

  // A (patched: µ dinâmico)
  const dayRows = rowsB1.filter(r => r.dia === selectedDay);
  const otherRows = rowsB1.filter(r => r.dia !== selectedDay);
  const shifted = suggestShifts(dayRows, thermalRowsByHour, opts);
  const rowsAfterA = [...otherRows, ...shifted];

  // B.2
  const dayStaff2 = rowsAfterA.filter(r =>
    r.dia === selectedDay && r.entrada && r.entrada.toUpperCase() !== 'FOLGA' && r.saida
  );
  if (dayStaff2.length === 0) {
    return {
      rows: rowsAfterA.map(({ role, ...r }) => r),
      phaseScores: { baseline: 0, afterB1: 0, afterA: 0, afterB2: 0 },
    };
  }
  const optimizable2 = dayStaff2.map(s => ({
    ...s, originalId: s.id,
    slotEntrada: toSlot(s.entrada), slotSaida: toSlot(s.saida),
    slotIntervalo: s.intervalo ? toSlot(s.intervalo) : null,
  }));
  // GUARDRAIL B.2: skip se subcobertura severa
  const hourCovB2 = buildHourlyCoverage(optimizable2);
  const hourlyFlowB2 = buildHourlyFlowArray(flowVector);
  const totalFlowB2 = hourlyFlowB2.reduce((s, f) => s + f, 0);
  const gapFlowB2 = hourlyFlowB2.reduce((s, f, h) => totalFlowB2 > 0 && hourCovB2[h] === 0 ? s + f : s, 0);
  const gapPctB2 = totalFlowB2 > 0 ? gapFlowB2 / totalFlowB2 * 100 : 0;
  const totalCovB2 = hourCovB2.reduce((s, c) => s + c, 0);
  const muB2 = totalCovB2 > 0 ? totalFlowB2 / totalCovB2 : 0;
  // Baseline score guardrail B.2 (espelha src/lib/thermalBalance_v5.js)
  let weightedDevBaselineB2 = 0;
  hourlyFlowB2.forEach((f, h) => {
    if (f > 0 && hourCovB2[h] > 0) {
      const ti = f / hourCovB2[h] / muB2;
      weightedDevBaselineB2 += Math.abs(ti - 1) * f;
    }
  });
  const lossBaselineB2 = totalFlowB2 > 0 ? weightedDevBaselineB2 / totalFlowB2 : 0;
  const baselineScoreB2 = Math.max(0, Math.round(100 * (1 - lossBaselineB2)));
  const skipByScoreB2 = baselineScoreB2 >= 55;
  const skipB2 = gapPctB2 > 15 || muB2 > 40 || skipByScoreB2;
  const refinedConfig = { ...v5Config, maxRounds: Math.ceil(v5Config.maxRounds / 2) };
  const afterB2 = skipB2 ? optimizable2 : coordinateDescentV5(optimizable2, flowVector, weightedFlow, refinedConfig);
  const rowsFinal = rowsAfterA.map(row => {
    const opt = afterB2.find(o => o.originalId === row.id);
    if (opt && opt.slotIntervalo != null) return { ...row, intervalo: fromSlot(opt.slotIntervalo) };
    return row;
  });

  // phaseScores
  const scoreB1 = computeScore(dayStaff, thermalRowsByHour);
  const rowsAfterB1Computed = dayStaff.map(r => {
    const opt = afterB1.find(o => o.originalId === r.id);
    return opt ? { ...r, intervalo: fromSlot(opt.slotIntervalo) } : r;
  });
  const scoreAfterA = computeScore(dayRows, thermalRowsByHour);
  const scoreAfterB2 = computeScore(rowsFinal.filter(r => r.dia === selectedDay), thermalRowsByHour);

  return {
    rows: rowsFinal.map(({ role, ...r }) => r),
    phaseScores: {
      baseline: scoreB1,
      afterB1: computeScore(rowsAfterB1Computed, thermalRowsByHour),
      afterA: scoreAfterA,
      afterB2: scoreAfterB2,
    },
    guardrail: {
      skipB1, skipB2,
      gapPct: gapPct.toFixed(1),
      gapPctB2: gapPctB2.toFixed(1),
      mu: Math.round(muGuard * 10) / 10,
      muB2: Math.round(muB2 * 100) / 100,
      baselineScore, baselineScoreB2,
      skipByScore, skipByScoreB2,
    }
  };
}

// ─── MAIN VALIDATION ─────────────────────────────────────────────────────────
function main() {
  const pairs = findStorePairs();
  console.log(`\n╔══════════════════════════════════════════════════════════════════════╗`);
  console.log(`║         VALIDAÇÃO V5.1 PATCHED — TODAS AS LOJAS REAIS              ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════╝`);
  console.log(`\nLojas encontradas: ${pairs.length}\n`);

  const allResults = [];
  let totalDays = 0;
  let totalImprove = 0;
  let totalRegression = 0;
  let totalNeutral = 0;
  let totalGaps = 0;
  let totalPatchScore = 0;

  for (const pair of pairs) {
    const escalaPath = join(ESCALA_DIR, pair.escalaFile);
    const fluxoPath = join(ESCALA_DIR, pair.fluxoFile);

    let store;
    try {
      store = loadStore(escalaPath, fluxoPath);
    } catch (e) {
      console.log(`[${pair.storeId}] ERRO carregando: ${e.message}`);
      continue;
    }

    if (!store.staffRows.length || !Object.keys(store.fluxoByDay).length) {
      console.log(`[${pair.storeId}] AVISO: dados insuficientes (staff=${store.staffRows.length}, flow=${Object.keys(store.fluxoByDay).length})`);
      continue;
    }

    const diasComDados = DIAS_INTERNAL.filter(d => store.fluxoByDay[d] && store.fluxoByDay[d].length > 0);
    const storeResult = {
      storeId: pair.storeId,
      file: pair.escalaFile,
      dias: [],
      staffCount: store.staffRows.filter(r => r.dia === 'SEGUNDA').length,
    };

    for (const dia of diasComDados) {
      const flow = store.fluxoByDay[dia];
      const staffDia = store.staffRows.filter(r => r.dia === dia);

      if (staffDia.length === 0) continue;

      // Patched
      const result = optimizeV51Patched(staffDia, dia, flow);
      if (!result.phaseScores) continue;
      const { rows: optimizedDia, phaseScores, guardrail } = result;
      const baselineScore = phaseScores.baseline;
      const patchedScore = phaseScores.afterB2;

      // Gaps
      const origGaps = detectGaps(staffDia, flow);
      const patchedGaps = detectGaps(optimizedDia, flow);
      const gapsCreated = patchedGaps.length - origGaps.length;

      const delta = patchedScore - baselineScore;
      const status = delta > 1 ? 'IMPROVE' : delta < -1 ? 'REGRESSION' : 'NEUTRAL';

      const dayResult = {
        storeId: pair.storeId,
        dia,
        staffCount: staffDia.length,
        baselineScore,
        patchedScore,
        delta,
        status,
        gapsCreated,
        phaseScores,
        guardrail,
      };

      storeResult.dias.push(dayResult);
      allResults.push(dayResult);
      totalDays++;
      totalPatchScore += patchedScore;
      if (status === 'IMPROVE') totalImprove++;
      else if (status === 'REGRESSION') totalRegression++;
      else totalNeutral++;
      if (gapsCreated > 0) totalGaps++;
    }

    // Summary per store
    const improvedDays = storeResult.dias.filter(d => d.status === 'IMPROVE').length;
    const regressedDays = storeResult.dias.filter(d => d.status === 'REGRESSION').length;
    const avgDelta = storeResult.dias.length > 0
      ? storeResult.dias.reduce((s, d) => s + d.delta, 0) / storeResult.dias.length
      : 0;
    const avgScore = storeResult.dias.length > 0
      ? storeResult.dias.reduce((s, d) => s + d.patchedScore, 0) / storeResult.dias.length
      : 0;
    const regFlag = regressedDays > 0 ? ' ⚠️' : '';
    const gapFlag = storeResult.dias.some(d => d.gapsCreated > 0) ? ' 🔴' : '';

    console.log(
      `[${pair.storeId}] ${pair.escalaFile.replace(/\.xlsx$/i,'').padEnd(35)} | ` +
      `${storeResult.dias.length}d | staff≈${storeResult.staffCount} | ` +
      `↑${improvedDays} ↓${regressedDays} =${storeResult.dias.length - improvedDays - regressedDays} ` +
      `| Δ${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)} | score=${avgScore.toFixed(0)}${regFlag}${gapFlag}`
    );
  }

  // ─── FINAL SUMMARY ─────────────────────────────────────────────────────────
  const avgDelta = allResults.length > 0
    ? allResults.reduce((s, d) => s + d.delta, 0) / allResults.length
    : 0;
  const avgScore = totalDays > 0 ? totalPatchScore / totalDays : 0;
  const regressionDays = allResults.filter(d => d.status === 'REGRESSION');
  const gapDays = allResults.filter(d => d.gapsCreated > 0);

  console.log(`\n${'─'.repeat(90)}`);
  console.log(`\n📊 RESULTADO CONSOLIDADO — V5.1 PATCHED (H1: µ dinâmico por candidato de shift)`);
  console.log(`\n   Lojas testadas:    ${pairs.length}`);
  console.log(`   Dias testados:     ${totalDays}`);
  console.log(`   Melhoram (↑):      ${totalImprove} (${totalDays > 0 ? (totalImprove/totalDays*100).toFixed(1) : 0}%)`);
  console.log(`   Neutros (=):       ${totalNeutral} (${totalDays > 0 ? (totalNeutral/totalDays*100).toFixed(1) : 0}%)`);
  console.log(`   Regredem (↓):      ${totalRegression} (${totalDays > 0 ? (totalRegression/totalDays*100).toFixed(1) : 0}%)`);
  console.log(`   Score médio:       ${avgScore.toFixed(1)}`);
  console.log(`   Delta médio/dia:   ${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(2)} pts`);
  console.log(`   Gaps criados:      ${totalGaps} dias${gapDays.length > 0 ? ' ⚠️' : ' ✅'}`);

  if (regressionDays.length > 0) {
    console.log(`\n⚠️  REGRESSÕES (${regressionDays.length} dias):`);
    regressionDays.forEach(d => {
      console.log(`   Loja ${d.storeId} ${d.dia}: ${d.baselineScore} → ${d.patchedScore} (${d.delta >= 0 ? '+' : ''}${d.delta})`);
    });
  } else {
    console.log(`\n✅ ZERO regressões — nenhum dia com score abaixo do baseline`);
  }

  if (gapDays.length > 0) {
    console.log(`\n🔴 DIAS COM GAPS CRIADOS (${gapDays.length}):`);
    gapDays.forEach(d => {
      console.log(`   Loja ${d.storeId} ${d.dia}: orig=${d.origGaps} patched=${d.patchedGaps}`);
    });
  } else {
    console.log(`\n✅ ZERO gaps criados pelo motor`);
  }

  // Per-store breakdown
  console.log(`\n${'─'.repeat(90)}`);
  console.log(`\n📋 DETALHE POR LOJA:`);
  allResults
    .filter(d => d.status === 'REGRESSION')
    .forEach(d => {
      const ps = d.phaseScores;
      const g = d.guardrail;
      // Identify which phase caused the regression
      const b1Delta = ps.afterB1 - ps.baseline;
      const aDelta = ps.afterA - ps.afterB1;
      const b2Delta = ps.afterB2 - ps.afterA;
      const worstPhase = b1Delta <= aDelta && b1Delta <= b2Delta ? 'B.1' :
                         aDelta <= b1Delta && aDelta <= b2Delta ? 'A' : 'B.2';
      console.log(
        `   🔻 Loja ${d.storeId} | ${String(d.dia).padEnd(8)} | n=${d.staffCount} | ` +
        `skipB1=${g.skipB1} | mu=${g.mu} gap=${g.gapPct}% | scoreBase=${g.baselineScore} | ` +
        `muB2=${g.muB2} scoreB2=${g.baselineScoreB2} skipByScoreB2=${g.skipByScoreB2} | ` +
        `${ps.baseline} → B1=${ps.afterB1}(${b1Delta>=0?'+':''}${b1Delta}) → ` +
        `A=${ps.afterA}(${aDelta>=0?'+':''}${aDelta}) → ` +
        `B2=${ps.afterB2}(${b2Delta>=0?'+':''}${b2Delta}) | ` +
        `Δ=${d.delta>=0?'+':''}${d.delta} (${worstPhase})`
      );
    });
  if (regressionDays.length === 0) {
    console.log(`   (nenhuma regressão)`);
  }

  // ─── SHOW PHASE CONTRIBUTIONS FOR ALL ───────────────────────────────────────
  console.log(`\n📊 FASE ANALYSIS (regressões):`);
  console.log(`   Phase | Count | Avg delta`);
  const phaseDeltas = { B1: [], A: [], B2: [] };
  allResults.forEach(d => {
    const ps = d.phaseScores;
    phaseDeltas.B1.push(ps.afterB1 - ps.baseline);
    phaseDeltas.A.push(ps.afterA - ps.afterB1);
    phaseDeltas.B2.push(ps.afterB2 - ps.afterA);
  });
  for (const [phase, deltas] of Object.entries(phaseDeltas)) {
    const improve = deltas.filter(x => x > 1).length;
    const regress = deltas.filter(x => x < -1).length;
    const avg = deltas.reduce((s, x) => s + x, 0) / deltas.length;
    console.log(`   ${phase.padEnd(5)} | +${improve}/${deltas.length-improve-regress} | -${regress} | avg=${avg >= 0 ? '+' : ''}${avg.toFixed(2)}`);
  }

  return allResults;
}

main();
