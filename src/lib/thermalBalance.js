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

function buildWeightVector(_hourlyData) {
    const v = new Array(TOTAL_SLOTS).fill(1.0);
    // Placeholder para lógica avançada de conversão futura
    return v;
}

function buildCoverageVector(staffRows) {
    const cov = new Array(TOTAL_SLOTS).fill(0);
    staffRows.forEach(emp => {
        const start = emp.slotEntrada;
        const end = emp.slotSaida;
        const brk = emp.slotIntervalo;
        if (start === null || end === null) return;

        const effEnd = Math.min(end, TOTAL_SLOTS);
        for (let i = start; i < effEnd; i++) {
            let isBreak = false;
            if (brk !== null && i >= brk && i < brk + INTERVAL_DURATION_SLOTS) isBreak = true;
            if (!isBreak) cov[i]++;
        }
    });
    return cov;
}

/**
 * Custo Incremental O(8)
 */
function calculateIncrementalCostDelta(currentCoverage, flowVector, weightVector, oldBreak, newBreak, config, avgPressureCache) {
    let delta = 0;
    const alphaNormal = 2.0;
    const alphaHotspot = config.alphaHotspot || 3.5;
    const threshold = avgPressureCache * 1.3;

    const affectedSlots = new Set();
    if (oldBreak !== null) {
        for (let k = 0; k < INTERVAL_DURATION_SLOTS; k++) {
            if (oldBreak + k < TOTAL_SLOTS) affectedSlots.add(oldBreak + k);
        }
    }
    for (let k = 0; k < INTERVAL_DURATION_SLOTS; k++) {
        if (newBreak + k < TOTAL_SLOTS) affectedSlots.add(newBreak + k);
    }

    for (const slot of affectedSlots) {
        const flow = flowVector[slot];
        if (flow === 0) continue;

        const weight = weightVector[slot];
        const covBefore = currentCoverage[slot];
        const pBefore = covBefore > 0 ? flow / covBefore : flow * 10;
        const alphaBefore = pBefore >= threshold ? alphaHotspot : alphaNormal;
        const costBefore = Math.pow(pBefore, alphaBefore) * flow * weight;

        let covAfter = covBefore;
        if (oldBreak !== null && slot >= oldBreak && slot < oldBreak + INTERVAL_DURATION_SLOTS) covAfter++;
        if (slot >= newBreak && slot < newBreak + INTERVAL_DURATION_SLOTS) covAfter--;

        const pAfter = covAfter > 0 ? flow / covAfter : flow * 10;
        const alphaAfter = pAfter >= threshold ? alphaHotspot : alphaNormal;
        const costAfter = Math.pow(pAfter, alphaAfter) * flow * weight;

        delta += (costAfter - costBefore);
    }
    return delta;
}

// ==================== COORDINATE DESCENT V4.0 ====================

/**
 * coordinateDescentOptimize
 *
 * Otimiza TODOS os funcionários por rodada (coordinate descent puro).
 * - avgPressure e threshold são recalculados a cada rodada.
 * - Funcionários são ordenados por pressão no intervalo (pior hotspot primeiro).
 * - Cada melhora é aplicada imediatamente, atualizando coverage para o próximo.
 * - Converge quando nenhuma melhora é possível ou timeout/maxRounds atingido.
 */
function coordinateDescentOptimize(staffRows, flowVector, weightVector, config) {
    const startTime = Date.now();
    const { maxRounds, timeoutMs } = config;

    // Build internal staff state (index-based)
    const staffState = staffRows.map((s, idx) => ({
        id: idx,
        originalId: s.id,
        slotEntrada: s.slotEntrada,
        slotSaida: s.slotSaida,
        slotIntervalo: s.slotIntervalo,
    }));

    let coverage = buildCoverageVector(staffState);

    for (let round = 0; round < maxRounds; round++) {
        if (Date.now() - startTime > timeoutMs) break;

        // Recalculate avgPressure dynamically each round
        let totalFlow = 0;
        let totalCov = 0;
        for (let i = 0; i < TOTAL_SLOTS; i++) {
            if (flowVector[i] > 0) {
                totalFlow += flowVector[i];
                totalCov += coverage[i];
            }
        }
        const avgPressure = totalCov > 0 ? totalFlow / totalCov : 0;

        // Sort employees by max pressure at their current break slot (worst hotspot first)
        const empOrder = staffState.map((emp, idx) => {
            let maxP = 0;
            if (emp.slotIntervalo !== null) {
                for (let k = 0; k < INTERVAL_DURATION_SLOTS; k++) {
                    const slot = emp.slotIntervalo + k;
                    if (slot < TOTAL_SLOTS && flowVector[slot] > 0) {
                        const p = coverage[slot] > 0
                            ? flowVector[slot] / coverage[slot]
                            : flowVector[slot] * 10;
                        if (p > maxP) maxP = p;
                    }
                }
            }
            return { idx, maxP };
        });
        empOrder.sort((a, b) => b.maxP - a.maxP);

        let anyImprovement = false;

        for (const { idx } of empOrder) {
            const emp = staffState[idx];
            const minStart = emp.slotEntrada + MIN_WORK_BEFORE_BREAK_SLOTS;
            const maxStart = emp.slotSaida - MIN_WORK_AFTER_BREAK_SLOTS - INTERVAL_DURATION_SLOTS;
            if (minStart > maxStart) continue;

            const currentBreak = emp.slotIntervalo;
            let bestDelta = -1e-6; // Must improve by a meaningful amount
            let bestSlot = null;

            for (let cand = minStart; cand <= maxStart; cand++) {
                if (cand === currentBreak) continue;
                const delta = calculateIncrementalCostDelta(
                    coverage, flowVector, weightVector,
                    currentBreak, cand, config, avgPressure
                );
                if (delta < bestDelta) {
                    bestDelta = delta;
                    bestSlot = cand;
                }
            }

            if (bestSlot !== null) {
                // Apply move immediately — coverage updated for subsequent employees
                if (currentBreak !== null) {
                    for (let k = 0; k < INTERVAL_DURATION_SLOTS; k++) {
                        if (currentBreak + k < TOTAL_SLOTS) coverage[currentBreak + k]++;
                    }
                }
                for (let k = 0; k < INTERVAL_DURATION_SLOTS; k++) {
                    if (bestSlot + k < TOTAL_SLOTS) coverage[bestSlot + k]--;
                }
                emp.slotIntervalo = bestSlot;
                anyImprovement = true;
            }
        }

        if (!anyImprovement) break; // Converged — local minimum reached
    }

    return staffState;
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
    const weightVector = buildWeightVector(thermalRowsByHour);

    const optimizableStaff = dayStaff.map(s => ({
        ...s,
        slotEntrada: toSlot(s.entrada),
        slotSaida: toSlot(s.saida),
        slotIntervalo: s.intervalo ? toSlot(s.intervalo) : null
    }));

    const finalState = coordinateDescentOptimize(optimizableStaff, flowVector, weightVector, v4Config);

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
