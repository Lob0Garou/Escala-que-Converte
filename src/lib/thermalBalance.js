/**
 * thermalBalance.js
 * ENGINE: ANTIGRAVITY MOTOR V2.1 (Opportunity-Weighted Optimizer)
 * 
 * NOVA FEATURE: Pesos por Oportunidade de Receita
 * - Prioriza horários com ALTO FLUXO + BAIXA CONVERSÃO
 * - Função de Custo: Σ (Pressão² × Fluxo × Peso_Oportunidade)
 */

// ==================== CONFIGURAÇÃO E CONSTANTES ====================

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

export const SUGGESTION_CONFIG = {
    MAX_ITERATIONS: 50,
    TARGET_MAX_INDEX: 1.0,
    MIN_COVERAGE_DEFAULT: 1,
};

// ==================== UTILS DE TEMPO ====================

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

// ==================== MOTOR MATEMÁTICO (CORE) ====================

/**
 * NOVA FUNÇÃO: Calcula peso de oportunidade baseado em fluxo e conversão.
 * Quanto maior o fluxo e menor a conversão, maior o peso (maior prioridade).
 */
function calculateOpportunityWeight(flow, conversion) {
    if (flow === 0) return 1.0; // Sem fluxo, peso neutro

    // Normaliza fluxo (assume fluxo médio de 100)
    const baseWeight = flow / 100;

    // Penalidade de conversão: quanto menor a conversão, maior a penalidade
    // Assume conversão ideal de 15% (ajuste conforme seu negócio)
    const IDEAL_CONVERSION = 15;
    const conversionPenalty = Math.max(0, (IDEAL_CONVERSION - conversion) / IDEAL_CONVERSION);

    // Peso final: 1.0 (neutro) + (impacto do fluxo × oportunidade perdida)
    return 1.0 + (baseWeight * conversionPenalty);
}

/**
 * Constrói vetor de fluxo de 96 slots.
 */
function buildFlowVector(hourlyFlowData) {
    const flowVector = new Array(TOTAL_SLOTS).fill(0);
    if (!hourlyFlowData) return flowVector;

    hourlyFlowData.forEach(h => {
        const hour = h.hour;
        const flow = h.flow || 0;
        if (hour >= 0 && hour < 24) {
            const startSlot = hour * SLOTS_PER_HOUR;
            const flowPerSlot = flow / SLOTS_PER_HOUR;
            for (let i = 0; i < SLOTS_PER_HOUR; i++) {
                flowVector[startSlot + i] = flowPerSlot;
            }
        }
    });
    return flowVector;
}

/**
 * NOVA FUNÇÃO: Constrói vetor de pesos de oportunidade de 96 slots.
 */
function buildOpportunityWeightVector(hourlyFlowData) {
    const weightVector = new Array(TOTAL_SLOTS).fill(1.0);
    if (!hourlyFlowData) return weightVector;

    hourlyFlowData.forEach(h => {
        const hour = h.hour;
        const flow = h.flow || 0;
        const conversion = h.conversion || h.conversionRate || 10; // Fallback: 10%

        if (hour >= 0 && hour < 24) {
            const weight = calculateOpportunityWeight(flow, conversion);
            const startSlot = hour * SLOTS_PER_HOUR;
            for (let i = 0; i < SLOTS_PER_HOUR; i++) {
                weightVector[startSlot + i] = weight;
            }
        }
    });
    return weightVector;
}

/**
 * Constrói vetor de cobertura de 96 slots.
 */
function buildCoverageVector(staffRows) {
    const coverage = new Array(TOTAL_SLOTS).fill(0);
    staffRows.forEach(emp => {
        const start = emp.slotEntrada;
        const end = emp.slotSaida;
        const breakStart = emp.slotIntervalo;
        if (start === null || end === null) return;
        const effectiveEnd = Math.min(end, 96);
        for (let i = start; i < effectiveEnd; i++) {
            let isBreak = false;
            if (breakStart !== null && i >= breakStart && i < breakStart + INTERVAL_DURATION_SLOTS) {
                isBreak = true;
            }
            if (!isBreak) coverage[i]++;
        }
    });
    return coverage;
}

/**
 * FUNÇÃO DE CUSTO ATUALIZADA (V2.1)
 * J = Σ (Pressão² × Fluxo × Peso_Oportunidade)
 */
function calculateTotalCost(flowVector, coverageVector, weightVector = null) {
    let totalCost = 0;
    const weights = weightVector || new Array(TOTAL_SLOTS).fill(1.0);

    for (let i = 0; i < TOTAL_SLOTS; i++) {
        const flow = flowVector[i];
        if (flow === 0) continue;
        const cov = coverageVector[i];
        const weight = weights[i];

        let pressure = cov > 0 ? flow / cov : 1000;
        const stepCost = (pressure * pressure) * flow * weight;
        totalCost += stepCost;
    }
    return totalCost;
}

// ==================== OTIMIZADOR ====================

export function optimizeScheduleRows(staffRows, selectedDay, thermalRowsByHour) {
    console.log(`[ANTIGRAVITY V2.1] Iniciando otimização para ${selectedDay}`);

    // 1. Preparar Vetores
    const flowVector = buildFlowVector(thermalRowsByHour);
    const weightVector = buildOpportunityWeightVector(thermalRowsByHour);

    // Log de diagnóstico dos pesos
    const avgWeight = weightVector.reduce((a, b) => a + b, 0) / TOTAL_SLOTS;
    const maxWeight = Math.max(...weightVector);
    console.log(`[ANTIGRAVITY V2.1] Peso Médio: ${avgWeight.toFixed(2)}, Peso Máximo: ${maxWeight.toFixed(2)}`);

    const dayStaff = staffRows.filter(r =>
        r.dia === selectedDay &&
        r.entrada &&
        r.entrada.toUpperCase() !== 'FOLGA' &&
        r.saida
    );

    if (dayStaff.length === 0) return staffRows;

    const optimizedStaff = dayStaff.map(s => ({
        ...s,
        slotEntrada: toSlot(s.entrada),
        slotSaida: toSlot(s.saida),
        slotIntervalo: s.intervalo ? toSlot(s.intervalo) : null
    }));

    optimizedStaff.forEach(s => {
        if (s.slotSaida < s.slotEntrada) s.slotSaida = 96;
    });

    // 2. Estado Inicial
    let currentCoverage = buildCoverageVector(optimizedStaff);
    let currentCost = calculateTotalCost(flowVector, currentCoverage, weightVector);
    const initialCost = currentCost;

    let iteration = 0;
    const MAX_ITERATIONS = 100;
    let hasImprovement = true;

    // 3. Loop Greedy
    while (iteration < MAX_ITERATIONS && hasImprovement) {
        hasImprovement = false;
        let bestGlobalGain = 0;
        let bestGlobalMove = null;

        for (let i = 0; i < optimizedStaff.length; i++) {
            const emp = optimizedStaff[i];
            const minStart = emp.slotEntrada + MIN_WORK_BEFORE_BREAK_SLOTS;
            const maxStart = emp.slotSaida - MIN_WORK_AFTER_BREAK_SLOTS - INTERVAL_DURATION_SLOTS;
            if (minStart >= maxStart) continue;

            const currentBreak = emp.slotIntervalo;

            for (let candidate = minStart; candidate <= maxStart; candidate++) {
                if (candidate === currentBreak) continue;
                const gain = calculateMsgGainIncremental(
                    flowVector,
                    currentCoverage,
                    currentBreak,
                    candidate,
                    weightVector
                );
                if (gain > bestGlobalGain) {
                    bestGlobalGain = gain;
                    bestGlobalMove = { staffIndex: i, newBreakSlot: candidate };
                }
            }
        }

        if (bestGlobalGain > 0 && bestGlobalMove) {
            const { staffIndex, newBreakSlot } = bestGlobalMove;
            const emp = optimizedStaff[staffIndex];
            const oldBreakSlot = emp.slotIntervalo;

            updateCoverageVector(currentCoverage, oldBreakSlot, newBreakSlot);
            emp.slotIntervalo = newBreakSlot;
            currentCost = currentCost - bestGlobalGain;
            hasImprovement = true;
            iteration++;
        }
    }

    const improvement = ((initialCost - currentCost) / initialCost * 100).toFixed(1);
    console.log(`[ANTIGRAVITY V2.1] Otimização concluída em ${iteration} iterações.`);
    console.log(`[ANTIGRAVITY V2.1] Custo: ${initialCost.toFixed(0)} -> ${currentCost.toFixed(0)} (${improvement}% melhoria)`);

    // 4. Mapear Retorno
    const resultRows = staffRows.map(row => {
        const opt = optimizedStaff.find(o => o.id === row.id);
        return opt ? { ...row, intervalo: fromSlot(opt.slotIntervalo) } : row;
    });

    return resultRows;
}

/**
 * Calcula Ganho Marginal Incremental (ATUALIZADO COM PESOS)
 */
function calculateMsgGainIncremental(flowVector, currentCoverage, oldBreakStart, newBreakStart, weightVector) {
    if (oldBreakStart === newBreakStart) return 0;

    const weights = weightVector || new Array(TOTAL_SLOTS).fill(1.0);
    const affectedIndices = new Set();

    if (oldBreakStart !== null) {
        for (let k = 0; k < INTERVAL_DURATION_SLOTS; k++) {
            if (oldBreakStart + k < TOTAL_SLOTS) affectedIndices.add(oldBreakStart + k);
        }
    }
    for (let k = 0; k < INTERVAL_DURATION_SLOTS; k++) {
        if (newBreakStart + k < TOTAL_SLOTS) affectedIndices.add(newBreakStart + k);
    }

    let localCostBefore = 0;
    let localCostAfter = 0;

    affectedIndices.forEach(idx => {
        const flow = flowVector[idx];
        if (flow === 0) return;
        const weight = weights[idx];

        const covBefore = currentCoverage[idx];
        let covAfter = covBefore;

        if (oldBreakStart !== null && idx >= oldBreakStart && idx < oldBreakStart + INTERVAL_DURATION_SLOTS) {
            covAfter++;
        }
        if (idx >= newBreakStart && idx < newBreakStart + INTERVAL_DURATION_SLOTS) {
            covAfter--;
        }

        let pBefore = covBefore > 0 ? flow / covBefore : 1000;
        localCostBefore += (pBefore * pBefore) * flow * weight;

        let pAfter = covAfter > 0 ? flow / covAfter : 1000;
        localCostAfter += (pAfter * pAfter) * flow * weight;
    });

    return localCostBefore - localCostAfter;
}

function updateCoverageVector(coverageVector, oldBreakStart, newBreakStart) {
    if (oldBreakStart !== null) {
        for (let k = 0; k < INTERVAL_DURATION_SLOTS; k++) {
            if (oldBreakStart + k < 96) coverageVector[oldBreakStart + k]++;
        }
    }
    for (let k = 0; k < INTERVAL_DURATION_SLOTS; k++) {
        if (newBreakStart + k < 96) coverageVector[newBreakStart + k]--;
    }
}

// ==================== WRAPPER E LEGADO ====================

export function optimizeAllDays(staffRows, flowMap = null) {
    const DIAS = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];
    let currentRows = [...staffRows];

    DIAS.forEach(dia => {
        let hourlyFlowData = [];
        if (flowMap && flowMap[dia]) {
            hourlyFlowData = flowMap[dia];
        } else {
            const hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
            const typicalFlow = {
                10: 50, 11: 70, 12: 100, 13: 80,
                14: 90, 15: 85, 16: 95, 17: 110,
                18: 120, 19: 100, 20: 80, 21: 50
            };
            hourlyFlowData = hours.map(h => ({
                hour: h,
                flow: typicalFlow[h]
            }));
        }
        currentRows = optimizeScheduleRows(currentRows, dia, hourlyFlowData);
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
            flowSharePct: parseFloat(flowSharePct.toFixed(1)),
            convQty,
            activeStaff,
            pressure: pressure === Infinity ? 999 : parseFloat(pressure.toFixed(2)),
            thermalIndex: thermalIndex === Infinity ? 999 : parseFloat(thermalIndex.toFixed(2)),
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

    return { mu: parseFloat(mu.toFixed(2)), score, rowsByHour, hotspots, coldspots };
}

export function generateSuggestedCoverage(rowsByHour, config) {
    return { suggestedStaffByHour: [] };
}

export function formatThermalIndex(n) { return n?.toFixed(2) || '-'; }
export function formatPressure(n) { return n?.toFixed(1) || '-'; }
export function computeBreaksPerHour(staffRows, day) { return {}; }
