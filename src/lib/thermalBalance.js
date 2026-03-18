/**
 * thermalBalance.js
 * ENGINE: ANTIGRAVITY MOTOR V4.0 (Coordinate Descent + Penalty Adaptativa)
 *
 * FEATURES V4.0:
 * 1. Coordinate Descent: Otimiza TODOS os funcionários por rodada (vs. beam-width no V3).
 * 2. Ordenação por Pressão: Prioriza funcionários cujo intervalo está em hotspot.
 * 3. avgPressure dinâmico: Recalculado a cada rodada (threshold adaptativo).
 * 4. Penalidade Exponencial: Alpha adaptativo mantido do V3.
 * 5. Convergência garantida: Para quando nenhuma melhora é possível.
 *
 * REGRAS RESPEITADAS (inalteradas):
 * - Intervalo mínimo 2h após entrada  (MIN_WORK_BEFORE_BREAK_SLOTS = 8 slots)
 * - Intervalo mínimo 2h antes saída   (MIN_WORK_AFTER_BREAK_SLOTS  = 8 slots)
 * - Duração do intervalo: 1h exata    (INTERVAL_DURATION_SLOTS     = 4 slots)
 * - Apenas horário de intervalo é movido; entrada/saída são imutáveis.
 */

// ==================== CONFIGURAÇÃO V4.0 ====================

const SLOTS_PER_HOUR = 4;
const TOTAL_SLOTS = 96;
const INTERVAL_DURATION_SLOTS = 4;
const MIN_WORK_BEFORE_BREAK_SLOTS = 8;
const MIN_WORK_AFTER_BREAK_SLOTS = 8;

export const THERMAL_THRESHOLDS = {
    HOT: 1.20,
    ATTENTION: 1.05,
    BALANCED_HIGH: 1.05,
    BALANCED_LOW: 0.95,
    SLACK: 0.80,
    COLD: 0.80,
};

const V4_CONFIG = {
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

// ==================== UTILS DE TEMPO & DETERMINISMO ====================

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

// ==================== MOTOR MATEMÁTICO V4.0 (CORE) ====================

function detectProfile(staffCount) {
    if (staffCount <= 10) return 'PEQUENA';
    if (staffCount <= 50) return 'MEDIA';
    return 'GRANDE';
}

function buildFlowVector(hourlyData) {
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

// ==================== COORDINATE DESCENT V4.1 (HOUR-LEVEL) ====================

/**
 * coordinateDescentOptimize
 *
 * Otimiza TODOS os funcionários por rodada com granularidade HORÁRIA.
 *
 * Por que hora e não slot (15min)?
 * calculateStaffByHour() — usado no score — exclui o funcionário apenas
 * na hora inteira do intervalo (Math.floor(slotIntervalo/4)).
 * Otimizar em slots de 15min geraria movimentos invisíveis para o score
 * (e.g., 13:30 → 13:15 continua sendo "hora 13") ou pioras inadvertidas
 * (e.g., 14:00 → 13:45 muda hora 14 → 13, podendo piorar a hora 13).
 *
 * Custo direto = Σ |pressure_h - µ| × flow_h
 * Isso é exatamente o que o score mede (loss = cost / (µ × totalFlow)).
 * µ é constante: mover intervalo não altera a cobertura total.
 *
 * Regras respeitadas:
 * - MIN 2h de trabalho antes do intervalo  (MIN_WORK_BEFORE_BREAK_SLOTS / 4)
 * - MIN 2h de trabalho após o intervalo    (MIN_WORK_AFTER_BREAK_SLOTS / 4)
 * - Duração do intervalo: 1h               (INTERVAL_DURATION_SLOTS / 4)
 */
function coordinateDescentOptimize(staffRows, flowVector, _weightVector, config) {
    const startTime = Date.now();
    const { maxRounds, timeoutMs } = config;
    const TOTAL_HOURS = 24;
    const MIN_WORK_H  = MIN_WORK_BEFORE_BREAK_SLOTS / SLOTS_PER_HOUR; // 2
    const MIN_AFTER_H = MIN_WORK_AFTER_BREAK_SLOTS  / SLOTS_PER_HOUR; // 2
    const BREAK_DUR_H = INTERVAL_DURATION_SLOTS     / SLOTS_PER_HOUR; // 1

    // Hourly flow: sum 4 slots per hour
    const hourlyFlow = new Array(TOTAL_HOURS).fill(0);
    for (let h = 0; h < TOTAL_HOURS; h++) {
        for (let s = 0; s < SLOTS_PER_HOUR; s++) {
            hourlyFlow[h] += flowVector[h * SLOTS_PER_HOUR + s];
        }
    }

    // Map to hour-level state (mirrors calculateStaffByHour semantics)
    const staffState = staffRows.map((s, idx) => ({
        id: idx,
        originalId: s.id,
        slotEntrada: s.slotEntrada,
        slotSaida:   s.slotSaida,
        entH: Math.floor(s.slotEntrada / SLOTS_PER_HOUR),
        outH: Math.floor(s.slotSaida   / SLOTS_PER_HOUR),
        brkH: s.slotIntervalo !== null ? Math.floor(s.slotIntervalo / SLOTS_PER_HOUR) : null,
    }));

    // Build hourly coverage (identical logic to calculateStaffByHour)
    const hourCov = new Array(TOTAL_HOURS).fill(0);
    staffState.forEach(emp => {
        for (let h = emp.entH; h < emp.outH && h < TOTAL_HOURS; h++) {
            if (emp.brkH !== null && h === emp.brkH) continue;
            hourCov[h]++;
        }
    });

    // µ = totalFlow / totalCov  — constant throughout (break moves conserve coverage)
    let totalFlow = 0, totalCov = 0;
    for (let h = 0; h < TOTAL_HOURS; h++) {
        if (hourlyFlow[h] > 0) {
            totalFlow += hourlyFlow[h];
            totalCov += hourCov[h];
        }
    }
    const mu = totalCov > 0 ? totalFlow / totalCov : 0;
    if (mu === 0) {
        // No flow data — return unchanged
        return staffState.map(emp => ({
            id: emp.id, originalId: emp.originalId,
            slotEntrada: emp.slotEntrada, slotSaida: emp.slotSaida,
            slotIntervalo: emp.brkH !== null ? emp.brkH * SLOTS_PER_HOUR : null,
        }));
    }

    for (let round = 0; round < maxRounds; round++) {
        if (Date.now() - startTime > timeoutMs) break;

        // Sort by |pressure_at_brkH - µ| desc — worst-placed break first
        const empOrder = staffState.map((emp, idx) => {
            let priority = 0;
            if (emp.brkH !== null && hourlyFlow[emp.brkH] > 0 && hourCov[emp.brkH] > 0) {
                priority = Math.abs(hourlyFlow[emp.brkH] / hourCov[emp.brkH] - mu);
            }
            return { idx, priority };
        });
        empOrder.sort((a, b) => b.priority - a.priority);

        let anyImprovement = false;

        for (const { idx } of empOrder) {
            const emp = staffState[idx];
            const minBrkH = emp.entH + MIN_WORK_H;
            const maxBrkH = emp.outH - MIN_AFTER_H - BREAK_DUR_H;
            if (minBrkH > maxBrkH) continue;

            const curBrkH = emp.brkH;
            let bestDelta = -1e-9;
            let bestBrkH  = null;

            for (let cand = minBrkH; cand <= maxBrkH; cand++) {
                if (cand === curBrkH) continue;
                let delta = 0;

                // Candidate hour: employee goes on break → cov decreases
                if (hourlyFlow[cand] > 0) {
                    const c0 = hourCov[cand];
                    const p0 = c0 > 0 ? hourlyFlow[cand] / c0 : hourlyFlow[cand] * 10;
                    const p1 = c0 > 1 ? hourlyFlow[cand] / (c0 - 1) : hourlyFlow[cand] * 10;
                    delta += (Math.abs(p1 - mu) - Math.abs(p0 - mu)) * hourlyFlow[cand];
                }

                // Old break hour: employee returns → cov increases
                if (curBrkH !== null && hourlyFlow[curBrkH] > 0) {
                    const c0 = hourCov[curBrkH];
                    const p0 = c0 > 0 ? hourlyFlow[curBrkH] / c0 : hourlyFlow[curBrkH] * 10;
                    const p1 = hourlyFlow[curBrkH] / (c0 + 1);
                    delta += (Math.abs(p1 - mu) - Math.abs(p0 - mu)) * hourlyFlow[curBrkH];
                }

                if (delta < bestDelta) {
                    bestDelta = delta;
                    bestBrkH  = cand;
                }
            }

            if (bestBrkH !== null) {
                if (curBrkH !== null) hourCov[curBrkH]++;
                hourCov[bestBrkH]--;
                emp.brkH = bestBrkH;
                anyImprovement = true;
            }
        }

        if (!anyImprovement) break;
    }

    // Map hour-level break back to slot (H:00 — clean full-hour break times)
    return staffState.map(emp => ({
        id:           emp.id,
        originalId:   emp.originalId,
        slotEntrada:  emp.slotEntrada,
        slotSaida:    emp.slotSaida,
        slotIntervalo: emp.brkH !== null ? emp.brkH * SLOTS_PER_HOUR : null,
    }));
}


// ==================== INTERFACE PÚBLICA ====================

export function optimizeScheduleRows(staffRows, selectedDay, thermalRowsByHour, configInput = {}) {
    const dayStaff = staffRows.filter(r =>
        r.dia === selectedDay &&
        r.entrada && r.entrada.toUpperCase() !== 'FOLGA' &&
        r.saida
    );

    if (dayStaff.length === 0) return staffRows;

    const profile = detectProfile(dayStaff.length);
    const v4Config = V4_CONFIG[profile];

    const flowVector = buildFlowVector(thermalRowsByHour);

    const optimizableStaff = dayStaff.map(s => ({
        ...s,
        slotEntrada: toSlot(s.entrada),
        slotSaida: toSlot(s.saida),
        slotIntervalo: s.intervalo ? toSlot(s.intervalo) : null
    }));

    const finalState = coordinateDescentOptimize(optimizableStaff, flowVector, null, v4Config);

    const resultRows = staffRows.map(row => {
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

    // --- NOVAS MÉTRICAS V3.1 (Aderência e Oportunidade) ---

    // 1. Aderência (Adherence): 1 - Metade da Soma das Diferenças Absolutas das Distribuições (0 a 100%)
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

    // 2. Oportunidade (Lost Opportunity)
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
