// src/lib/thermalBalance_v5.js
/**
 * thermalBalance_v5.js
 * ENGINE: ANTIGRAVITY MOTOR V5.1
 *
 * 3 fases (nova ordem): Intervalos → Shift (somente FLEX) → Intervalos refinamento
 * + Classificação opener/closer/flex
 * + µ dinâmico (recalculado a cada round)
 * + Ponderação por conversão (Fase C)
 *
 * Drop-in replacement para V4. Mesma interface pública.
 */

// ============================================================
// CONSTANTES
// ============================================================

const SLOTS_PER_HOUR = 4;
const TOTAL_SLOTS = 96;
const TOTAL_HOURS = 24;
const INTERVAL_DURATION_SLOTS = 4;          // 1h de intervalo
const MIN_WORK_BEFORE_BREAK_SLOTS = 8;      // 2h antes do intervalo
const MIN_WORK_AFTER_BREAK_SLOTS = 8;       // 2h depois do intervalo

// ============================================================
// HELPERS DE SLOT
// ============================================================

function toSlot(timeInput) {
    if (timeInput === null || timeInput === undefined || timeInput === '') return null;
    let totalMinutes = 0;
    if (typeof timeInput === 'string') {
        const [h, m] = timeInput.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return null;
        totalMinutes = h * 60 + m;
    } else if (typeof timeInput === 'number') {
        totalMinutes = Math.round(timeInput * 60);
    } else {
        return null;
    }
    return Math.floor(totalMinutes / 15);
}

function fromSlot(slotIndex) {
    if (slotIndex === null || slotIndex < 0) return '';
    const totalMinutes = slotIndex * 15;
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toHour(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10);
}

function relaxRedundantAnchors(classifiedRows) {
    const openers = classifiedRows.filter(row => row.role === 'opener' || row.role === 'opener+closer');
    const closers = classifiedRows.filter(row => row.role === 'closer' || row.role === 'opener+closer');

    const pickEarliestByEntry = (rows) => rows.reduce((best, row) => {
        if (!best) return row;
        const bestSlot = toSlot(best.entrada);
        const rowSlot = toSlot(row.entrada);
        if (rowSlot === null) return best;
        if (bestSlot === null || rowSlot < bestSlot) return row;
        return best;
    }, null);

    const pickLatestByExit = (rows) => rows.reduce((best, row) => {
        if (!best) return row;
        const bestSlot = toSlot(best.saida);
        const rowSlot = toSlot(row.saida);
        if (rowSlot === null) return best;
        if (bestSlot === null || rowSlot > bestSlot) return row;
        return best;
    }, null);

    const openerKeeperId = openers.length > 0 ? pickEarliestByEntry(openers)?.id ?? null : null;
    const closerKeeperId = closers.length > 0 ? pickLatestByExit(closers)?.id ?? null : null;

    return classifiedRows.map(row => {
        if (row.role === 'folga') return row;

        if (row.role === 'opener') {
            if (openers.length > 1 && row.id !== openerKeeperId) {
                return { ...row, role: 'flex' };
            }
            return row;
        }

        if (row.role === 'closer') {
            if (closers.length > 1 && row.id !== closerKeeperId) {
                return { ...row, role: 'flex' };
            }
            return row;
        }

        if (row.role === 'opener+closer') {
            if (openers.length > 1 && closers.length > 1) {
                return { ...row, role: 'flex' };
            }
            return row;
        }

        return row;
    });
}

// ============================================================
// STORE HOURS & CLASSIFICAÇÃO
// ============================================================

/**
 * getStoreHours — Deriva horário de operação da loja a partir do flowData.
 * Retorna {min, max} baseado nas horas com flow > 0.
 * Fallback para {min: 6, max: 22} se não houver dados.
 */
export function getStoreHours(hourlyFlowData) {
    if (!hourlyFlowData || hourlyFlowData.length === 0) {
        return { min: 6, max: 22 };
    }
    let min = 24, max = 0;
    hourlyFlowData.forEach(h => {
        if ((h.flow || 0) > 0) {
            if (h.hour < min) min = h.hour;
            if (h.hour + 1 > max) max = h.hour + 1;
        }
    });
    if (min >= max) {
        return { min: 6, max: 22 };
    }
    return { min, max };
}

/**
 * classifyStaff — Classifica cada funcionário como opener, closer ou flex.
 *
 * opener: entrada antes do início do fluxo (prepara loja)
 * closer: saída depois do fim do fluxo (fecha loja)
 * flex:   todos os demais (podem ter turno ajustado)
 *
 * Um funcionário pode ser opener E closer ao mesmo tempo.
 */
export function classifyStaff(staffRows, storeHours) {
    const classified = staffRows.map(row => {
        if (!row.entrada || row.entrada.toUpperCase() === 'FOLGA' || !row.saida) {
            return { ...row, role: 'folga' };
        }
        const entH = toHour(row.entrada);
        const saiH = toHour(row.saida);
        const saiMin = toSlot(row.saida);
        // saída real em horas (com minutos, ex: 22:30 → 22.5)
        const saidaDecimal = saiMin !== null ? (saiMin * 15) / 60 : saiH;

        const isOpener = entH !== null && entH < storeHours.min;
        const isCloser = saidaDecimal !== null && saidaDecimal > storeHours.max;

        let role = 'flex';
        if (isOpener && isCloser) role = 'opener+closer';
        else if (isOpener) role = 'opener';
        else if (isCloser) role = 'closer';

        return { ...row, role };
    });

    return relaxRedundantAnchors(classified);
}

// ============================================================
// FLOW VECTORS
// ============================================================

function buildHourlyFlow(hourlyData) {
    const v = new Array(TOTAL_SLOTS).fill(0);
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

/**
 * buildWeightedFlowVector — Fase C
 * Pondera o flow por conversão: horas com conversão acima da média ganham peso extra.
 */
function buildWeightedFlowVector(hourlyFlowData) {
    const base = buildHourlyFlow(hourlyFlowData);
    if (!hourlyFlowData || hourlyFlowData.length === 0) return base;

    // Calcular conversão média
    const withConv = hourlyFlowData.filter(h => h.conversion > 0 && h.flow > 0);
    if (withConv.length === 0) return base;

    const avgConv = withConv.reduce((s, h) => s + h.conversion, 0) / withConv.length;
    if (avgConv <= 0) return base;
    const maxFlow = Math.max(...withConv.map(h => h.flow || 0), 1);

    // Criar mapa de peso por hora
    const weightByHour = {};
    hourlyFlowData.forEach(h => {
        if (h.conversion > 0 && h.flow > 0) {
            // Peso entre 0.8 e 1.5 baseado na conversão relativa
            const opportunity = Math.max(0.8, Math.min(1.5, avgConv / h.conversion));
            const flowFactor = Math.max(0.25, Math.min(1, (h.flow || 0) / maxFlow));
            const ratio = 1 + ((opportunity - 1) * flowFactor);
            weightByHour[h.hour] = Math.max(0.8, Math.min(1.5, ratio));
        }
    });

    // Aplicar peso
    const weighted = new Array(TOTAL_SLOTS).fill(0);
    for (let h = 0; h < TOTAL_HOURS; h++) {
        const w = weightByHour[h] ?? 1.0;
        for (let s = 0; s < SLOTS_PER_HOUR; s++) {
            weighted[h * SLOTS_PER_HOUR + s] = base[h * SLOTS_PER_HOUR + s] * w;
        }
    }
    return weighted;
}

// ============================================================
// COBERTURA HOURLY
// ============================================================

function buildHourlyCoverage(staffState) {
    const cov = new Array(TOTAL_HOURS).fill(0);
    staffState.forEach(emp => {
        if (emp.slotEntrada === null || emp.slotSaida === null) return;
        const eH = Math.floor(emp.slotEntrada / SLOTS_PER_HOUR);
        const oH = Math.floor(emp.slotSaida / SLOTS_PER_HOUR);
        const bH = emp.slotIntervalo !== null ? Math.floor(emp.slotIntervalo / SLOTS_PER_HOUR) : null;
        for (let h = eH; h < oH && h < TOTAL_HOURS; h++) {
            if (bH !== null && h === bH) continue;
            cov[h]++;
        }
    });
    return cov;
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

function evaluateCoverageProfile(hourlyFlow, hourCov) {
    let totalFlow = 0;
    let totalCov = 0;

    for (let h = 0; h < TOTAL_HOURS; h++) {
        if (hourlyFlow[h] > 0) {
            totalFlow += hourlyFlow[h];
            totalCov += hourCov[h];
        }
    }

    if (totalFlow <= 0 || totalCov <= 0) {
        return { mu: 0, score: 0, adherence: 0, utility: 0 };
    }

    const mu = totalFlow / totalCov;
    let weightedDeviation = 0;
    let sumDiff = 0;

    for (let h = 0; h < TOTAL_HOURS; h++) {
        if (hourlyFlow[h] > 0) {
            if (hourCov[h] === 0) {
                weightedDeviation += hourlyFlow[h];
            } else {
                weightedDeviation += Math.abs((hourlyFlow[h] / hourCov[h]) / mu - 1) * hourlyFlow[h];
            }
        }

        const flowPct = totalFlow > 0 ? hourlyFlow[h] / totalFlow : 0;
        const staffPct = totalCov > 0 ? hourCov[h] / totalCov : 0;
        sumDiff += Math.abs(flowPct - staffPct);
    }

    const score = Math.max(0, Math.round(100 * (1 - (weightedDeviation / totalFlow))));
    const adherence = Math.max(0, Math.round(100 * (1 - (sumDiff / 2))));
    const utility = score + (adherence / 100);

    return { mu, score, adherence, utility };
}

// ============================================================
// FASE A: SHIFT SUGGESTION (somente FLEX)
// ============================================================

/**
 * suggestShifts — Fase A
 *
 * Desloca TURNOS inteiros (entrada+intervalo+saída) por ±maxShiftHours.
 * Somente funcionários FLEX são movidos.
 * Opener/closer mantêm entrada e saída inalteradas.
 * Garante que nenhuma hora com flow>0 fique com 0 staff após shift.
 */
export function suggestShifts(staffRows, hourlyFlowData, opts = {}) {
    const maxShiftHours = opts.maxShiftHours ?? 1;
    const maxShiftSlots = maxShiftHours * SLOTS_PER_HOUR;

    if (!hourlyFlowData || hourlyFlowData.length === 0) {
        return staffRows.map(r => ({ ...r }));
    }

    const storeHours = getStoreHours(hourlyFlowData);
    const flowSlots = buildHourlyFlow(hourlyFlowData);
    const hourlyFlow = buildHourlyFlowArray(flowSlots);
    const tieHourlyFlow = buildHourlyFlowArray(buildWeightedFlowVector(hourlyFlowData));

    const classified = classifyStaff(staffRows, storeHours);
    let results = classified.map(r => ({ ...r }));

    const globalCov = new Array(TOTAL_HOURS).fill(0);
    const buildCovFromResults = () => {
        globalCov.fill(0);
        results.forEach(r => {
            if (r.role === 'folga') return;
            const sE = toSlot(r.entrada);
            const sS = toSlot(r.saida);
            const sI = r.intervalo ? toSlot(r.intervalo) : null;
            if (sE === null || sS === null) return;
            const eH = Math.floor(sE / SLOTS_PER_HOUR);
            const oH = Math.floor(sS / SLOTS_PER_HOUR);
            const bH = sI !== null ? Math.floor(sI / SLOTS_PER_HOUR) : null;
            for (let h = eH; h < oH && h < TOTAL_HOURS; h++) {
                if (bH !== null && h === bH) continue;
                globalCov[h]++;
            }
        });
    };

    const computeCoverageScore = () => {
        buildCovFromResults();
        const profile = evaluateCoverageProfile(hourlyFlow, globalCov);
        return (profile.score * 1000) + profile.adherence;
    };

    let peakHour = 0, peakFlow = 0;
    for (let h = 0; h < TOTAL_HOURS; h++) {
        if (hourlyFlow[h] > peakFlow) {
            peakFlow = hourlyFlow[h];
            peakHour = h;
        }
    }

    const buildPassOrder = (mode) => {
        const ordered = results.map((row, idx) => {
            if (row.role !== 'flex') return { idx, score: -1 };

            const slotEntrada = toSlot(row.entrada);
            const slotSaida = toSlot(row.saida);
            const slotIntervalo = row.intervalo ? toSlot(row.intervalo) : null;
            if (slotEntrada === null || slotSaida === null || slotIntervalo === null) {
                return { idx, score: -1 };
            }

            const entH = Math.floor(slotEntrada / SLOTS_PER_HOUR);
            const outH = Math.floor(slotSaida / SLOTS_PER_HOUR);
            const brkH = Math.floor(slotIntervalo / SLOTS_PER_HOUR);
            return { idx, score: computeShiftScore(hourlyFlow, entH, outH, brkH, peakHour) };
        });

        if (mode === 0) {
            return ordered.map(x => x.idx);
        }

        return ordered
            .sort((a, b) => {
                if (mode === 1) return b.score - a.score || a.idx - b.idx;
                return b.score - a.score || b.idx - a.idx;
            })
            .map(x => x.idx);
    };

    const runPass = (orderedIndices) => {
        buildCovFromResults();
        let anyImprovement = false;

        for (const idx of orderedIndices) {
            const row = results[idx];
            if (row.role !== 'flex') continue;

            const slotEntrada = toSlot(row.entrada);
            const slotSaida = toSlot(row.saida);
            const slotIntervalo = row.intervalo ? toSlot(row.intervalo) : null;

            if (slotEntrada === null || slotSaida === null || slotIntervalo === null) continue;

            const entH = Math.floor(slotEntrada / SLOTS_PER_HOUR);
            const outH = Math.floor(slotSaida / SLOTS_PER_HOUR);
            const brkH = Math.floor(slotIntervalo / SLOTS_PER_HOUR);

            const currentProfile = evaluateCoverageProfile(hourlyFlow, globalCov);
            const currentTieProfile = evaluateCoverageProfile(tieHourlyFlow, globalCov);
            let bestShiftSlots = 0;
            let bestScore = currentProfile.score;
            let bestAdherence = currentProfile.adherence;
            let bestTieScore = currentTieProfile.score;

            for (let shift = -maxShiftSlots; shift <= maxShiftSlots; shift += SLOTS_PER_HOUR) {
                if (shift === 0) continue;

                const delta = Math.floor(shift / SLOTS_PER_HOUR);
                const newEntH = entH + delta;
                const newOutH = outH + delta;
                const newBrkH = brkH + delta;

                if (newEntH < storeHours.min || newOutH > storeHours.max) continue;

                const minBrkH = newEntH + MIN_WORK_BEFORE_BREAK_SLOTS / SLOTS_PER_HOUR;
                const maxBrkH = newOutH - MIN_WORK_AFTER_BREAK_SLOTS / SLOTS_PER_HOUR - 1;
                if (newBrkH < minBrkH || newBrkH > maxBrkH) continue;

                const candidateCov = globalCov.slice();
                for (let h = entH; h < outH && h < TOTAL_HOURS; h++) {
                    if (h === brkH) continue;
                    if (h >= newEntH && h < newOutH && h !== newBrkH) continue;
                    if (candidateCov[h] > 0) candidateCov[h]--;
                }

                for (let h = newEntH; h < newOutH && h < TOTAL_HOURS; h++) {
                    if (h === newBrkH) continue;
                    if (h >= entH && h < outH && h !== brkH) continue;
                    candidateCov[h]++;
                }

                let createsGap = false;
                for (let h = 0; h < TOTAL_HOURS; h++) {
                    if (hourlyFlow[h] > 0 && candidateCov[h] <= 0) {
                        createsGap = true;
                        break;
                    }
                }
                if (createsGap) continue;

                const candidateProfile = evaluateCoverageProfile(hourlyFlow, candidateCov);
                const candidateTieProfile = evaluateCoverageProfile(tieHourlyFlow, candidateCov);

                if (
                    candidateProfile.score > bestScore ||
                    (candidateProfile.score === bestScore && candidateProfile.adherence > bestAdherence) ||
                    (candidateProfile.score === bestScore && candidateProfile.adherence === bestAdherence && candidateTieProfile.score > bestTieScore)
                ) {
                    bestScore = candidateProfile.score;
                    bestAdherence = candidateProfile.adherence;
                    bestTieScore = candidateTieProfile.score;
                    bestShiftSlots = shift;
                }
            }

            if (bestShiftSlots === 0) continue;

            const newSlotE = slotEntrada + bestShiftSlots;
            const newSlotS = slotSaida + bestShiftSlots;
            const newSlotI = slotIntervalo + bestShiftSlots;

            results[idx] = {
                ...row,
                entrada: fromSlot(newSlotE),
                saida: fromSlot(newSlotS),
                intervalo: fromSlot(newSlotI),
            };

            buildCovFromResults();
            anyImprovement = true;
        }

        return anyImprovement;
    };

    let bestScore = computeCoverageScore();
    const passModes = [0, 1, 2];

    for (const mode of passModes) {
        const snapshot = results.map(r => ({ ...r }));
        const changed = runPass(buildPassOrder(mode));
        const passScore = computeCoverageScore();
        if (!changed || passScore <= bestScore) {
            results = snapshot;
            buildCovFromResults();
            break;
        }
        bestScore = passScore;
    }

    return results;
}

function computeShiftScore(hourlyFlow, entH, outH, brkH, peakHour) {
    let score = 0;
    const peakPressure = hourlyFlow[peakHour] || 0;
    for (let h = entH; h < outH; h++) {
        if (h === brkH) continue;
        score += Math.abs((hourlyFlow[h] || 0) - peakPressure);
    }
    return score;
}

// ============================================================
// FASE B: COORDINATE DESCENT 15MIN (V5.1 — µ dinâmico)
// ============================================================

export const THERMAL_THRESHOLDS = {
    HOT: 1.20,
    ATTENTION: 1.05,
    BALANCED_HIGH: 1.05,
    BALANCED_LOW: 0.95,
    SLACK: 0.80,
    COLD: 0.80,
};

const V5_CONFIG = {
    PEQUENA: { maxRounds: 40, alphaHotspot: 3.0, timeoutMs: 800 },
    MEDIA:   { maxRounds: 60, alphaHotspot: 3.5, timeoutMs: 1500 },
    GRANDE:  { maxRounds: 100, alphaHotspot: 4.0, timeoutMs: 4000 },
};

function detectProfile(staffCount) {
    if (staffCount <= 10) return 'PEQUENA';
    if (staffCount <= 50) return 'MEDIA';
    return 'GRANDE';
}

/**
 * coordinateDescentV5 — Fase B
 *
 * Coordinate Descent com µ DINÂMICO (recalculado a cada round).
 * Move intervalos para minimizar desvio térmico ponderado.
 */
function coordinateDescentV5(staffState, flowVector, weightVector, config) {
    const startTime = Date.now();
    const { maxRounds, timeoutMs } = config;

    // Usar flow ponderado (Fase C) se disponível
    const hourlyFlow = buildHourlyFlowArray(flowVector);
    const tieHourlyFlow = buildHourlyFlowArray(weightVector || flowVector);

    // Map to slot-level state
    const state = staffState.map((s, idx) => ({
        id: idx,
        originalId: s.originalId ?? s.id,
        slotEntrada: s.slotEntrada,
        slotSaida: s.slotSaida,
        slotIntervalo: s.slotIntervalo,
    }));

    // Build hourly coverage
    const hourCov = buildHourlyCoverage(state);

    for (let round = 0; round < maxRounds; round++) {
        if (Date.now() - startTime > timeoutMs) break;

        // µ DINÂMICO — recalculado a cada round
        const mu = computeMu(hourlyFlow, hourCov);
        if (mu === 0) break;

        // Ordenar por prioridade: quem está na hora com maior desvio térmico
        const empOrder = state.map((emp, idx) => {
            let priority = 0;
            const brkH = emp.slotIntervalo !== null ? Math.floor(emp.slotIntervalo / SLOTS_PER_HOUR) : null;
            if (brkH !== null && hourlyFlow[brkH] > 0 && hourCov[brkH] > 0) {
                priority = Math.abs(hourlyFlow[brkH] / hourCov[brkH] - mu) * hourlyFlow[brkH];
            }
            return { idx, priority };
        });
        empOrder.sort((a, b) => b.priority - a.priority);

        let anyImprovement = false;

        for (const { idx } of empOrder) {
            const emp = state[idx];
            if (emp.slotIntervalo === null) continue;

            const minBrkSlot = emp.slotEntrada + MIN_WORK_BEFORE_BREAK_SLOTS;
            const maxBrkSlot = emp.slotSaida - MIN_WORK_AFTER_BREAK_SLOTS - INTERVAL_DURATION_SLOTS;
            if (minBrkSlot > maxBrkSlot) continue;

            const curBrkSlot = emp.slotIntervalo;
            const curH = Math.floor(curBrkSlot / SLOTS_PER_HOUR);
            const currentProfile = evaluateCoverageProfile(hourlyFlow, hourCov);
            const currentTieProfile = evaluateCoverageProfile(tieHourlyFlow, hourCov);
            let bestScore = currentProfile.score;
            let bestAdherence = currentProfile.adherence;
            let bestTieScore = currentTieProfile.score;
            let bestBrkSlot = null;

            for (let candSlot = minBrkSlot; candSlot <= maxBrkSlot; candSlot++) {
                if (candSlot === curBrkSlot) continue;

                const candH = Math.floor(candSlot / SLOTS_PER_HOUR);
                if (candH === curH) continue; // Só avaliar quando muda de hora

                const candidateCov = hourCov.slice();
                candidateCov[curH]++;
                candidateCov[candH]--;

                let createsGap = false;
                for (let h = 0; h < TOTAL_HOURS; h++) {
                    if (hourlyFlow[h] > 0 && candidateCov[h] <= 0) {
                        createsGap = true;
                        break;
                    }
                }
                if (createsGap) continue;

                const candidateProfile = evaluateCoverageProfile(hourlyFlow, candidateCov);
                const candidateTieProfile = evaluateCoverageProfile(tieHourlyFlow, candidateCov);

                if (
                    candidateProfile.score > bestScore ||
                    (candidateProfile.score === bestScore && candidateProfile.adherence > bestAdherence) ||
                    (candidateProfile.score === bestScore && candidateProfile.adherence === bestAdherence && candidateTieProfile.score > bestTieScore)
                ) {
                    bestScore = candidateProfile.score;
                    bestAdherence = candidateProfile.adherence;
                    bestTieScore = candidateTieProfile.score;
                    bestBrkSlot = candSlot;
                }
            }

            if (bestBrkSlot !== null) {
                const newH = Math.floor(bestBrkSlot / SLOTS_PER_HOUR);
                if (curH !== newH) {
                    hourCov[curH]++;
                    hourCov[newH]--;
                }
                emp.slotIntervalo = bestBrkSlot;
                anyImprovement = true;
            }
        }

        if (!anyImprovement) break;
    }

    return state;
}

// ============================================================
// INTERFACE PÚBLICA (mantém compatibilidade V4)
// ============================================================

/**
 * optimizeScheduleRows — Orquestra as 3 fases na nova ordem:
 *
 * 1. Classificar staff (opener/closer/flex)
 * 2. Fase C: Ponderar flow por conversão
 * 3. Fase B: Coordinate Descent nos intervalos (TODOS os staff ativos)
 * 4. Fase A: Shift suggestion (somente FLEX)
 * 5. Fase B.2: Segundo pass de intervalos (refinamento)
 */
export function optimizeScheduleRows(staffRows, selectedDay, thermalRowsByHour, configInput = {}) {
    // Filtrar staff do dia
    const dayStaff = staffRows.filter(r =>
        r.dia === selectedDay &&
        r.entrada && r.entrada.toUpperCase() !== 'FOLGA' &&
        r.saida
    );

    if (dayStaff.length === 0) return staffRows;

    const storeHours = getStoreHours(thermalRowsByHour);
    const profile = detectProfile(dayStaff.length);
    const v5Config = V5_CONFIG[profile];

    // Fase C: Flow ponderado por conversão
    const flowVector = buildHourlyFlow(thermalRowsByHour);
    const weightedFlow = buildWeightedFlowVector(thermalRowsByHour);

    // Preparar state para Coordinate Descent
    const optimizable = dayStaff.map(s => ({
        ...s,
        originalId: s.id,
        slotEntrada: toSlot(s.entrada),
        slotSaida: toSlot(s.saida),
        slotIntervalo: s.intervalo ? toSlot(s.intervalo) : null,
    }));

    // ── GUARDRAIL: Subcobertura severa — não rodar B.1 ──
    // Quando a loja é severamente subcoberta (mu > 100 ou gap de cobertura > 15%
    // do flow total), o score é inflacionado porque horas sem staff são excluídas.
    // B.1 assume que redistribuir intervalos melhora o balanceamento, mas com
    // staff insuficiente redistribuir intervalos piores (worsens pressure imbalance).
    // Nestes casos, mantemos os intervalos originais.
    const hourCov = buildHourlyCoverage(optimizable);
    const hourlyFlowForGuard = buildHourlyFlowArray(flowVector);
    const totalFlowGuard = hourlyFlowForGuard.reduce((s, f) => s + f, 0);
    const gapFlow = hourlyFlowForGuard.reduce((s, f, h) =>
        totalFlowGuard > 0 && hourCov[h] === 0 ? s + f : s, 0);
    const gapPct = totalFlowGuard > 0 ? gapFlow / totalFlowGuard * 100 : 0;
    const totalCov = hourCov.reduce((s, c) => s + c, 0);
    const muGuard = totalCov > 0 ? totalFlowGuard / totalCov : 0;
    // Baseline score guardrail: se a loja já está razoavelmente balanceada
    // (score ≥ 55), redistribuir intervalos tende a piorar em vez de melhorar.
    // As 6 regressões tinham baseline 50-61 — evitar rodar B.1 nestes casos.
    const hourlyFlowBaseline = buildHourlyFlowArray(flowVector);
    const totalFlowBaseline = hourlyFlowBaseline.reduce((s, f) => s + f, 0);
    const totalCovBaseline = hourCov.reduce((s, c) => s + c, 0);
    const muBaseline = totalCovBaseline > 0 ? totalFlowBaseline / totalCovBaseline : 0;
    let weightedDevBaseline = 0;
    hourlyFlowBaseline.forEach((f, h) => {
        if (f > 0 && hourCov[h] > 0) {
            const ti = f / hourCov[h] / muBaseline;
            weightedDevBaseline += Math.abs(ti - 1) * f;
        }
    });
    const lossBaseline = totalFlowBaseline > 0 ? weightedDevBaseline / totalFlowBaseline : 0;
    const baselineScore = Math.max(0, Math.round(100 * (1 - lossBaseline)));
    const skipByScore = baselineScore >= 55;
    const skipB1 = gapPct > 15 || muGuard > 40 || skipByScore;

    // ── Fase B (pass 1): Otimizar intervalos de TODOS ──
    const afterBreaks = skipB1 ? optimizable :
        coordinateDescentV5(optimizable, flowVector, weightedFlow, v5Config);

    // Aplicar resultado dos intervalos de volta
    const rowsAfterB1 = staffRows.map(row => {
        const opt = afterBreaks.find(o => o.originalId === row.id);
        if (opt && opt.slotIntervalo !== null) {
            return { ...row, intervalo: fromSlot(opt.slotIntervalo) };
        }
        return row;
    });

    // ── Fase A: Shift de turnos (somente FLEX, somente dia selecionado) ──
    const dayRowsB1 = rowsAfterB1.filter(r => r.dia === selectedDay);
    const otherRows = rowsAfterB1.filter(r => r.dia !== selectedDay);
    const shiftedDay = suggestShifts(dayRowsB1, thermalRowsByHour, {
        maxShiftHours: configInput.maxShiftHours ?? 1,
    });
    const rowsAfterA = [...otherRows, ...shiftedDay];

    // ── Fase B.2: Refinamento de intervalos pós-shift ──
    const dayStaff2 = rowsAfterA.filter(r =>
        r.dia === selectedDay &&
        r.entrada && r.entrada.toUpperCase() !== 'FOLGA' &&
        r.saida
    );

    if (dayStaff2.length === 0) return rowsAfterA;

    const optimizable2 = dayStaff2.map(s => ({
        ...s,
        originalId: s.id,
        slotEntrada: toSlot(s.entrada),
        slotSaida: toSlot(s.saida),
        slotIntervalo: s.intervalo ? toSlot(s.intervalo) : null,
    }));

    // GUARDRAIL B.2: mesmo critério de subcobertura — se a loja é severamente
    // subcoberta (gap > 15% ou mu > 100), pular refinamento. A Fase B.2
    // assume que redistribuir intervalos melhora o balanceamento, mas com
    // staff insuficiente redistribuir intervalos piora o desvio (pressure spikes).
    const hourCovB2 = buildHourlyCoverage(optimizable2);
    const hourlyFlowB2 = buildHourlyFlowArray(flowVector);
    const totalFlowB2 = hourlyFlowB2.reduce((s, f) => s + f, 0);
    const gapFlowB2 = hourlyFlowB2.reduce((s, f, h) =>
        totalFlowB2 > 0 && hourCovB2[h] === 0 ? s + f : s, 0);
    const gapPctB2 = totalFlowB2 > 0 ? gapFlowB2 / totalFlowB2 * 100 : 0;
    const totalCovB2 = hourCovB2.reduce((s, c) => s + c, 0);
    const muB2 = totalCovB2 > 0 ? totalFlowB2 / totalCovB2 : 0;
    // Baseline score guardrail para B.2: evitar refinamento em lojas já balanceadas
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
    const afterBreaks2 = skipB2 ? optimizable2 :
        coordinateDescentV5(optimizable2, flowVector, weightedFlow, refinedConfig);

    // Resultado final
    const result = rowsAfterA.map(row => {
        const opt = afterBreaks2.find(o => o.originalId === row.id);
        if (opt && opt.slotIntervalo !== null) {
            return { ...row, intervalo: fromSlot(opt.slotIntervalo) };
        }
        return row;
    });

    // Limpar campo 'role' temporário
    return result.map(({ role, ...rest }) => rest);
}

export function optimizeAllDays(staffRows, flowMap, config = {}) {
    const DIAS = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];
    let currentRows = [...staffRows];
    DIAS.forEach(dia => {
        if (flowMap && flowMap[dia]) {
            currentRows = optimizeScheduleRows(currentRows, dia, flowMap[dia], config);
        }
    });
    return currentRows;
}

// ============================================================
// THERMAL METRICS (inalterado)
// ============================================================

export function computeThermalMetrics(hourlyData) {
    if (!hourlyData || hourlyData.length === 0) {
        return { mu: 0, score: 0, rowsByHour: [], hotspots: [], coldspots: [] };
    }

    const totalFlow = hourlyData.reduce((sum, h) => sum + (h.flow || 0), 0);
    const totalActiveStaff = hourlyData.reduce((sum, h) => sum + (h.activeStaff || 0), 0);
    const mu = totalActiveStaff > 0 ? totalFlow / totalActiveStaff : 0;

    const rowsByHour = hourlyData.map(h => {
        const flowQty = h.flow || 0;
        const activeStaff = h.activeStaff || 0;
        const convQty = h.cupons || 0;
        const flowSharePct = totalFlow > 0 ? (flowQty / totalFlow) * 100 : 0;
        const pressure = activeStaff > 0 ? flowQty / activeStaff : (flowQty > 0 ? Infinity : 0);
        const thermalIndex = mu > 0 ? pressure / mu : 0;

        let badge = { emoji: '❄️', label: 'Frio', color: '#06B6D4' };
        if (activeStaff === 0 && flowQty > 0) {
            badge = { emoji: '🚨', label: 'Sem cobertura', color: '#DC2626' };
        } else if (flowQty === 0) {
            badge = { emoji: '⚪', label: 'Sem fluxo', color: '#6B7280' };
        } else if (thermalIndex >= THERMAL_THRESHOLDS.HOT) {
            badge = { emoji: '🔥', label: 'Quente', color: '#EF4444' };
        } else if (thermalIndex >= THERMAL_THRESHOLDS.ATTENTION) {
            badge = { emoji: '🟠', label: 'Atenção', color: '#F59E0B' };
        } else if (thermalIndex >= THERMAL_THRESHOLDS.BALANCED_LOW) {
            badge = { emoji: '✅', label: 'Equilíbrio', color: '#10B981' };
        } else if (thermalIndex >= THERMAL_THRESHOLDS.SLACK) {
            badge = { emoji: '🟦', label: 'Folga', color: '#3B82F6' };
        }

        return {
            hour: h.hour,
            flowQty,
            convQty,
            activeStaff,
            pressure: pressure === Infinity ? 999 : parseFloat(pressure.toFixed(2)),
            thermalIndex: thermalIndex === Infinity ? 999 : parseFloat(thermalIndex.toFixed(2)),
            flowSharePct: parseFloat(flowSharePct.toFixed(2)),
            badge,
        };
    });

    let weightedDeviation = 0;
    rowsByHour.forEach(row => {
        if (row.flowQty > 0) {
            if (row.activeStaff === 0) {
                weightedDeviation += row.flowQty;
            } else {
                weightedDeviation += Math.abs(row.thermalIndex - 1) * row.flowQty;
            }
        }
    });
    const loss = totalFlow > 0 ? weightedDeviation / totalFlow : 0;
    const score = Math.max(0, Math.round(100 * (1 - loss)));

    const validRows = rowsByHour.filter(r => r.flowQty > 0 && r.thermalIndex !== 999);
    const hotspots = [...validRows]
        .sort((a, b) => b.thermalIndex - a.thermalIndex)
        .slice(0, 3)
        .filter(r => r.thermalIndex >= 1.0);
    const coldspots = [...validRows]
        .sort((a, b) => a.thermalIndex - b.thermalIndex)
        .slice(0, 3)
        .filter(r => r.thermalIndex < 1.0 && r.thermalIndex > 0);

    // Aderência
    let sumDiff = 0;
    rowsByHour.forEach(r => {
        if (totalFlow > 0 && totalActiveStaff > 0) {
            const flowPct = r.flowQty / totalFlow;
            const staffPct = r.activeStaff / totalActiveStaff;
            sumDiff += Math.abs(flowPct - staffPct);
        }
    });
    const adherence = totalFlow > 0 && totalActiveStaff > 0
        ? Math.max(0, Math.round(100 * (1 - sumDiff / 2)))
        : 0;

    // Oportunidade
    const CRITICAL_PRESSURE = 1.3 * mu;
    let lostOpportunity = 0;
    rowsByHour.forEach(r => {
        if (r.pressure > CRITICAL_PRESSURE && r.activeStaff > 0) {
            const servingCapacity = r.activeStaff * CRITICAL_PRESSURE;
            const excessFlow = Math.max(0, r.flowQty - servingCapacity);
            lostOpportunity += excessFlow;
        } else if (r.activeStaff === 0 && r.flowQty > 0) {
            lostOpportunity += r.flowQty;
        }
    });

    return {
        mu: parseFloat(mu.toFixed(1)),
        score,
        adherence,
        lostOpportunity: Math.round(lostOpportunity),
        rowsByHour,
        hotspots,
        coldspots
    };
}

export function quickScore(hourlyData) {
    return computeThermalMetrics(hourlyData).score;
}

export function generateSuggestedCoverage(_rowsByHour, _config) { return { suggestedStaffByHour: [] }; }
export function formatThermalIndex(n) { return n?.toFixed(2) || '-'; }
export function formatPressure(n) { return n?.toFixed(1) || '-'; }
export function computeBreaksPerHour(_staffRows, _day) { return {}; }
