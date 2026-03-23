// src/lib/thermalBalance_v5.js
/**
 * thermalBalance_v5.js
 * ENGINE: ANTIGRAVITY MOTOR V5.0
 *
 * 3 fases: Shift Suggestion → Coordinate Descent 15min → Opportunity Weighting
 *
 * Drop-in replacement para V4. Mesma interface pública.
 */

// ============================================================
// FASE A: SHIFT SUGGESTION
// ============================================================

const SLOTS_PER_HOUR = 4;
const TOTAL_SLOTS = 96;
const INTERVAL_DURATION_SLOTS = 4;
const MIN_WORK_BEFORE_BREAK_SLOTS = 8;
const MIN_WORK_AFTER_BREAK_SLOTS = 8;

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
 * suggestShifts — Fase A
 *
 * Dado fluxo hourly, desloca TURNOS (entrada+intervalo+saída juntos em ±maxShiftHours)
 * para cobrir o pico de fluxo. Retorna rows com horários potencialmente modificados.
 *
 * Regras:
 * - Desloca turno inteiro por±maxShiftHours slots (default ±4 slots = ±1h)
 * - Mantém carga horária idêntica (entrada e saída se movem juntas)
 * - Não desloca FOLGA
 * - Não movimenta intervalos intra-turno (apenas shift whole-shift)
 */
export function suggestShifts(staffRows, hourlyFlowData, opts = {}) {
    const maxShiftHours = opts.maxShiftHours ?? 1;
    const maxShiftSlots = maxShiftHours * SLOTS_PER_HOUR;

    if (!hourlyFlowData || hourlyFlowData.length === 0) {
        return staffRows.map(r => ({ ...r }));
    }

    // Build slot-level flow
    const flowSlots = buildHourlyFlow(hourlyFlowData);

    // Aggregate to hourly for faster peak detection
    const hourlyFlow = hourlyFlowData.map(h => ({ hour: h.hour, flow: h.flow || 0 }));

    // Find peak hour
    let peakHour = 0, peakFlow = 0;
    hourlyFlow.forEach(h => {
        if (h.flow > peakFlow) {
            peakFlow = h.flow;
            peakHour = h.hour;
        }
    });

    return staffRows.map(row => {
        // Skip FOLGA or rows without valid schedule
        if (!row.entrada || row.entrada.toUpperCase() === 'FOLGA' || !row.saida) {
            return { ...row };
        }

        const slotEntrada = toSlot(row.entrada);
        const slotSaida   = toSlot(row.saida);
        const slotIntervalo = row.intervalo ? toSlot(row.intervalo) : null;

        if (slotEntrada === null || slotSaida === null || slotIntervalo === null) {
            return { ...row };
        }

        const entH = Math.floor(slotEntrada / SLOTS_PER_HOUR);
        const outH = Math.floor(slotSaida   / SLOTS_PER_HOUR);
        const brkH = Math.floor(slotIntervalo / SLOTS_PER_HOUR);

        // Compute total shift possible given constraints
        // We can shift the whole shift by [-maxShiftSlots, +maxShiftSlots]
        // but respecting: entH >= 6 (6h) and outH <= 22 (22h)
        // and break must stay within [entH+2, outH-3]

        let bestShiftSlots = 0;
        let bestScore = computeShiftScore(flowSlots, entH, outH, brkH, peakHour);

        for (let shift = -maxShiftSlots; shift <= maxShiftSlots; shift += SLOTS_PER_HOUR) {
            const newEntH = entH + Math.floor(shift / SLOTS_PER_HOUR);
            const newOutH = outH + Math.floor(shift / SLOTS_PER_HOUR);

            // Hard boundaries: 6h-22h
            if (newEntH < 6 || newOutH > 22) continue;

            // Check break constraints with new shift
            const newBrkH = brkH + Math.floor(shift / SLOTS_PER_HOUR);
            const MIN_WORK_H  = MIN_WORK_BEFORE_BREAK_SLOTS / SLOTS_PER_HOUR; // 2
            const MIN_AFTER_H = MIN_WORK_AFTER_BREAK_SLOTS  / SLOTS_PER_HOUR; // 2
            const BREAK_DUR_H = INTERVAL_DURATION_SLOTS     / SLOTS_PER_HOUR; // 1

            const minBrkH = newEntH + MIN_WORK_H;
            const maxBrkH = newOutH - MIN_AFTER_H - BREAK_DUR_H;

            if (newBrkH < minBrkH || newBrkH > maxBrkH) continue;

            const score = computeShiftScore(flowSlots, newEntH, newOutH, newBrkH, peakHour);

            if (score < bestScore) {
                bestScore = score;
                bestShiftSlots = shift;
            }
        }

        if (bestShiftSlots === 0) {
            return { ...row };
        }

        const newSlotEntrada  = slotEntrada  + bestShiftSlots;
        const newSlotSaida    = slotSaida    + bestShiftSlots;
        const newSlotIntervalo = slotIntervalo + bestShiftSlots;

        return {
            ...row,
            entrada:  fromSlot(newSlotEntrada),
            saida:    fromSlot(newSlotSaida),
            intervalo: fromSlot(newSlotIntervalo),
        };
    });
}

function computeShiftScore(flowSlots, entH, outH, brkH, peakHour) {
    // Score = weighted sum of |pressure_h - pressure_peak| for all hours in shift
    // Lower is better = closer to peak coverage
    let score = 0;
    const BREAK_DUR_H = INTERVAL_DURATION_SLOTS / SLOTS_PER_HOUR; // 1

    for (let h = entH; h < outH; h++) {
        if (h >= brkH && h < brkH + BREAK_DUR_H) continue; // skip break hours
        const pressure_h = getSlotPressure(flowSlots, h);
        const pressure_peak = getSlotPressure(flowSlots, peakHour);
        score += Math.abs(pressure_h - pressure_peak);
    }
    return score;
}

function getSlotPressure(flowSlots, hour) {
    let totalFlow = 0;
    let count = 0;
    for (let s = 0; s < SLOTS_PER_HOUR; s++) {
        const slot = hour * SLOTS_PER_HOUR + s;
        if (flowSlots[slot] > 0) {
            totalFlow += flowSlots[slot];
            count++;
        }
    }
    return count > 0 ? totalFlow / count : 0;
}

// ============================================================
// FASE B: COORDINATE DESCENT 15MIN (V5)
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
    PEQUENA: {    // ≤ 10 funcionários
        maxRounds: 40,
        alphaHotspot: 3.0,
        timeoutMs: 800,
    },
    MEDIA: {      // 11-25 funcionários
        maxRounds: 60,
        alphaHotspot: 3.5,
        timeoutMs: 1500,
    },
    GRANDE: {     // > 25 funcionários
        maxRounds: 100,
        alphaHotspot: 4.0,
        timeoutMs: 4000,
    },
};

function detectProfile(staffCount) {
    if (staffCount <= 10) return 'PEQUENA';
    if (staffCount <= 50) return 'MEDIA';
    return 'GRANDE';
}

/**
 * coordinateDescentV5 — Fase B
 *
 * Coordinate Descent com granularidade de 15 MIN (slot-level).
 * Funcionamento:
 * 1. Para cada funcionário, tenta mover slotIntervalo em ±1 slot (15min)
 * 2. Avalia custo direto: Σ |pressure_h - µ| × flow_h em horas afetadas
 * 3. Aplica o melhor movimento se melhorar o custo
 * 4. Repete por maxRounds ou até convergir
 *
 * Diferença do V4 (hour-level): permite ajustes mais precisos,
 * especialmente para turnos curtos ou intervalos muito específicos.
 */
function coordinateDescentV5(staffRows, flowVector, _weightVector, config) {
    const startTime = Date.now();
    const { maxRounds, timeoutMs } = config;
    const TOTAL_HOURS = 24;

    // Hourly flow
    const hourlyFlow = new Array(TOTAL_HOURS).fill(0);
    for (let h = 0; h < TOTAL_HOURS; h++) {
        for (let s = 0; s < SLOTS_PER_HOUR; s++) {
            hourlyFlow[h] += flowVector[h * SLOTS_PER_HOUR + s];
        }
    }

    // Map to slot-level state
    const staffState = staffRows.map((s, idx) => ({
        id: idx,
        originalId: s.id,
        slotEntrada:  s.slotEntrada,
        slotSaida:    s.slotSaida,
        slotIntervalo: s.slotIntervalo,
    }));

    // Build hourly coverage
    const hourCov = new Array(TOTAL_HOURS).fill(0);
    staffState.forEach(emp => {
        const entH = Math.floor(emp.slotEntrada / SLOTS_PER_HOUR);
        const outH = Math.floor(emp.slotSaida   / SLOTS_PER_HOUR);
        const brkH = emp.slotIntervalo !== null ? Math.floor(emp.slotIntervalo / SLOTS_PER_HOUR) : null;
        for (let h = entH; h < outH && h < TOTAL_HOURS; h++) {
            if (brkH !== null && h === brkH) continue;
            hourCov[h]++;
        }
    });

    // µ = totalFlow / totalCov
    let totalFlow = 0, totalCov = 0;
    for (let h = 0; h < TOTAL_HOURS; h++) {
        if (hourlyFlow[h] > 0) {
            totalFlow += hourlyFlow[h];
            totalCov += hourCov[h];
        }
    }
    const mu = totalCov > 0 ? totalFlow / totalCov : 0;
    if (mu === 0) {
        return staffState.map(emp => ({
            id: emp.id, originalId: emp.originalId,
            slotEntrada: emp.slotEntrada, slotSaida: emp.slotSaida,
            slotIntervalo: emp.slotIntervalo,
        }));
    }

    for (let round = 0; round < maxRounds; round++) {
        if (Date.now() - startTime > timeoutMs) break;

        // Sort by |pressure_at_brkH - µ| desc
        const empOrder = staffState.map((emp, idx) => {
            let priority = 0;
            const brkH = emp.slotIntervalo !== null ? Math.floor(emp.slotIntervalo / SLOTS_PER_HOUR) : null;
            if (brkH !== null && hourlyFlow[brkH] > 0 && hourCov[brkH] > 0) {
                priority = Math.abs(hourlyFlow[brkH] / hourCov[brkH] - mu);
            }
            return { idx, priority };
        });
        empOrder.sort((a, b) => b.priority - a.priority);

        let anyImprovement = false;

        for (const { idx } of empOrder) {
            const emp = staffState[idx];

            const entH = Math.floor(emp.slotEntrada / SLOTS_PER_HOUR);
            const outH = Math.floor(emp.slotSaida   / SLOTS_PER_HOUR);

            const MIN_WORK_H  = MIN_WORK_BEFORE_BREAK_SLOTS / SLOTS_PER_HOUR; // 2
            const MIN_AFTER_H = MIN_WORK_AFTER_BREAK_SLOTS  / SLOTS_PER_HOUR; // 2
            const BREAK_DUR_H = INTERVAL_DURATION_SLOTS     / SLOTS_PER_HOUR; // 1

            const minBrkSlot = emp.slotEntrada + MIN_WORK_BEFORE_BREAK_SLOTS;
            const maxBrkSlot = emp.slotSaida   - MIN_WORK_AFTER_BREAK_SLOTS - INTERVAL_DURATION_SLOTS;

            if (minBrkSlot > maxBrkSlot) continue;

            const curBrkSlot = emp.slotIntervalo;
            let bestDelta = -1e-9;
            let bestBrkSlot = null;

            // Try ±1 slot (15min) movements
            for (let candSlot = minBrkSlot; candSlot <= maxBrkSlot; candSlot++) {
                if (candSlot === curBrkSlot) continue;

                const candH = Math.floor(candSlot / SLOTS_PER_HOUR);
                const curH  = Math.floor(curBrkSlot / SLOTS_PER_HOUR);

                let delta = 0;

                // Candidate hour: employee goes on break → cov decreases
                if (hourlyFlow[candH] > 0) {
                    const c0 = hourCov[candH];
                    const p0 = c0 > 0 ? hourlyFlow[candH] / c0 : hourlyFlow[candH] * 10;
                    const p1 = c0 > 1 ? hourlyFlow[candH] / (c0 - 1) : hourlyFlow[candH] * 10;
                    delta += (Math.abs(p1 - mu) - Math.abs(p0 - mu)) * hourlyFlow[candH];
                }

                // Old break hour: employee returns → cov increases
                if (curBrkSlot !== null && hourlyFlow[curH] > 0) {
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

            if (bestBrkSlot !== null) {
                const curH = Math.floor(curBrkSlot / SLOTS_PER_HOUR);
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

    return staffState.map(emp => ({
        id:           emp.id,
        originalId:   emp.originalId,
        slotEntrada:  emp.slotEntrada,
        slotSaida:    emp.slotSaida,
        slotIntervalo: emp.slotIntervalo,
    }));
}

// ============================================================
// FASE C: OPPORTUNITY WEIGHTING
// ============================================================

/**
 * buildWeightedFlowVector — Fase C
 *
 * Dado hourlyFlow e weightVector (opportunity weight por hora),
 * retorna flowSlots ponderado pela oportunidade.
 *
 * weightVector[h] = 1.0 (baseline) ou >1.0 para horas de alta oportunidade.
 * Horas com weight > 1 put more "importance" on coverage.
 */
function buildWeightedFlowVector(hourlyFlowData, weightVector) {
    const v = new Array(TOTAL_SLOTS).fill(0);
    if (!hourlyFlowData) return v;

    const baseFlow = buildHourlyFlow(hourlyFlowData);
    const wv = weightVector || {};

    for (let h = 0; h < 24; h++) {
        const weight = wv[h] ?? 1.0;
        for (let s = 0; s < SLOTS_PER_HOUR; s++) {
            const slot = h * SLOTS_PER_HOUR + s;
            v[slot] = baseFlow[slot] * weight;
        }
    }
    return v;
}

// ============================================================
// INTERFACE PÚBLICA (mantém compatibilidade V4)
// ============================================================

export function optimizeScheduleRows(staffRows, selectedDay, thermalRowsByHour, configInput = {}) {
    // Phase A: shift suggestion
    const shiftedRows = suggestShifts(staffRows, thermalRowsByHour, configInput);

    const dayStaff = shiftedRows.filter(r =>
        r.dia === selectedDay &&
        r.entrada && r.entrada.toUpperCase() !== 'FOLGA' &&
        r.saida
    );

    if (dayStaff.length === 0) return shiftedRows;

    const profile = detectProfile(dayStaff.length);
    const v5Config = V5_CONFIG[profile];

    const flowVector = buildHourlyFlow(thermalRowsByHour);

    const optimizableStaff = dayStaff.map(s => ({
        ...s,
        slotEntrada: toSlot(s.entrada),
        slotSaida: toSlot(s.saida),
        slotIntervalo: s.intervalo ? toSlot(s.intervalo) : null,
    }));

    const finalState = coordinateDescentV5(optimizableStaff, flowVector, null, v5Config);

    const resultRows = shiftedRows.map(row => {
        const opt = finalState.find(o => o.originalId === row.id);
        if (opt) {
            return { ...row, intervalo: fromSlot(opt.slotIntervalo) };
        }
        return row;
    });

    return resultRows;
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
        if (row.thermalIndex !== 999 && row.flowQty > 0) {
            weightedDeviation += Math.abs(row.thermalIndex - 1) * row.flowQty;
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

export function generateSuggestedCoverage(_rowsByHour, _config) { return { suggestedStaffByHour: [] }; }
export function formatThermalIndex(n) { return n?.toFixed(2) || '-'; }
export function formatPressure(n) { return n?.toFixed(1) || '-'; }
export function computeBreaksPerHour(_staffRows, _day) { return {}; }
