/**
 * thermalBalance.js
 * ENGINE: ANTIGRAVITY MOTOR V3.0 (Beam Search + Exponential Penalty + Tiger Roar)
 * 
 * FEATURES V3.0:
 * 1. Beam Search (k=5): Explora múltiplas soluções paralelas.
 * 2. Tiger Roar Phase: Fase de exploração agressiva para escapar de mínimos locais.
 * 3. Penalidade Exponencial: Alpha adaptativo (2.0 a 4.0) para eliminar HotSpots.
 * 4. Determinismo: Ordenação estável com Tie-Breaker por Hash.
 * 5. Configuração Dinâmica: Perfil PEQUENA, MEDIA, GRANDE.
 */

// ==================== CONFIGURAÇÃO V3.0 ====================

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

const V3_CONFIG = {
    PEQUENA: {    // ≤ 10 funcionários
        beamWidth: 3,
        maxDepth: 8,
        explorationRounds: 5,
        alphaHotspot: 3.0,
        timeoutMs: 100
    },
    MEDIA: {      // 11-20 funcionários
        beamWidth: 5,
        maxDepth: 10,
        explorationRounds: 15,
        alphaHotspot: 3.5,
        timeoutMs: 200
    },
    GRANDE: {     // > 20 funcionários, Score < 75
        beamWidth: 50,
        maxDepth: 30,
        explorationRounds: 100,
        alphaHotspot: 5.0,
        timeoutMs: 1000
    }
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

/**
 * Cria um hash único da solução para desempate determinístico.
 * Formato: "minEntrada-minBreak-minSaida|...|..." ordenado
 */
function getSolutionHash(staffState) {
    return staffState
        .map(s => `${s.slotEntrada}-${s.slotIntervalo}-${s.slotSaida}`)
        .sort() // Ordena strings para garantir independência da ordem do array
        .join('|');
}

// ==================== MOTOR MATEMÁTICO V3.0 (CORE) ====================

function detectProfile(staffCount, currentScore = 80) {
    if (staffCount <= 10 && currentScore > 80) return 'PEQUENA';
    if (staffCount > 20 || currentScore < 75) return 'GRANDE';
    return 'MEDIA';
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

function buildWeightVector(hourlyData) {
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
 * CUSTO EXPONENCIAL V3.0
 */
function calculateExponentialCost(coverageVector, flowVector, weightVector, config, returnMetrics = false) {
    let totalCost = 0;
    const alphaNormal = 2.0;
    const alphaHotspot = config.alphaHotspot || 3.5;

    let totalFlow = 0;
    let totalCov = 0;
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        if (flowVector[i] > 0) {
            totalFlow += flowVector[i];
            totalCov += coverageVector[i];
        }
    }
    const avgPressure = totalCov > 0 ? totalFlow / totalCov : 0;
    const threshold = avgPressure * 1.3;

    let hotspotsCount = 0;

    for (let i = 0; i < TOTAL_SLOTS; i++) {
        const flow = flowVector[i];
        if (flow === 0) continue;

        const cov = coverageVector[i];
        const weight = weightVector[i];

        let pressure = cov > 0 ? flow / cov : flow * 10;

        const isHot = (pressure >= threshold);
        if (isHot) hotspotsCount++;

        const alpha = isHot ? alphaHotspot : alphaNormal;
        totalCost += Math.pow(pressure, alpha) * flow * weight;
    }

    if (returnMetrics) {
        return { totalCost, avgPressure, hotspotsCount };
    }
    return totalCost;
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

// ==================== TIGER ROAR PHASE (EXPLORATION) ====================

function findHotspots(coverage, flowVector, avgPressure) {
    const hotspots = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        if (flowVector[i] === 0) continue;
        const p = coverage[i] > 0 ? flowVector[i] / coverage[i] : 9999;
        if (p > avgPressure * 1.2) {
            hotspots.push({ slot: i, pressure: p });
        }
    }
    // Sort desc by pressure
    return hotspots.sort((a, b) => b.pressure - a.pressure);
}

function tigerRoarPhase(initialNode, flowVector, weightVector, config, avgPressure) {
    let currentState = JSON.parse(JSON.stringify(initialNode.staffState));
    let currentCoverage = [...initialNode.coverage];
    let currentCost = initialNode.cost;

    const rounds = config.explorationRounds || 10;

    for (let r = 0; r < rounds; r++) {
        const hotspots = findHotspots(currentCoverage, flowVector, avgPressure);
        if (hotspots.length === 0) break;

        let moveMade = false;

        // Tenta resolver os hotspots, do pior para o "kevlar"
        // Para evitar ficar preso no mesmo hotspot impossível, tentamos os top 5
        const candidateHotspots = hotspots.slice(0, 5);

        for (const hp of candidateHotspots) {
            const hotspotSlot = hp.slot;

            let bestMove = null;
            // Relaxamos a condição de "apenas melhorar". Aceitamos piora leve se resolver o hotspot?
            // "HotSpots ficam radioativos". Então TUDO vale pra resolver.
            let bestDelta = Infinity; // start high

            for (let i = 0; i < currentState.length; i++) {
                const emp = currentState[i];
                const brk = emp.slotIntervalo;

                const isOnBreakAtHotspot = (brk !== null && hotspotSlot >= brk && hotspotSlot < brk + INTERVAL_DURATION_SLOTS);
                if (!isOnBreakAtHotspot) continue;

                const minStart = emp.slotEntrada + MIN_WORK_BEFORE_BREAK_SLOTS;
                const maxStart = emp.slotSaida - MIN_WORK_AFTER_BREAK_SLOTS - INTERVAL_DURATION_SLOTS;

                for (let cand = minStart; cand <= maxStart; cand++) {
                    if (cand === brk) continue;

                    // Verifica se o novo lugar TAMBÉM é um hotspot crítico?
                    // Deixa o custo decidir.
                    const delta = calculateIncrementalCostDelta(
                        currentCoverage, flowVector, weightVector,
                        brk, cand, config, avgPressure
                    );

                    if (delta < bestDelta) {
                        bestDelta = delta;
                        bestMove = { empIdx: i, newSlot: cand };
                    }
                }
            }

            if (bestMove && bestDelta < 0) { // Só aceita se melhorar o custo GLOBAL (Radioativo já está no custo)
                // Aplica Movimento
                const emp = currentState[bestMove.empIdx];
                const oldBreak = emp.slotIntervalo;
                const newBreak = bestMove.newSlot;

                if (oldBreak !== null) {
                    for (let k = 0; k < INTERVAL_DURATION_SLOTS; k++)
                        if (oldBreak + k < TOTAL_SLOTS) currentCoverage[oldBreak + k]++;
                }
                for (let k = 0; k < INTERVAL_DURATION_SLOTS; k++)
                    if (newBreak + k < TOTAL_SLOTS) currentCoverage[newBreak + k]--;

                emp.slotIntervalo = newBreak;
                currentCost += bestDelta;
                moveMade = true;
                break; // Sai do loop de hotspots e vai pro proximo round (recalcula hotspots)
            }
        }

        if (!moveMade) {
            // Se nenhum dos top 5 hotspots permitiu movimento que melhore custo...
            // Talvez estejamos em minimo local.
            break;
        }
    }

    return {
        cost: currentCost,
        staffState: currentState,
        coverage: currentCoverage,
        solutionHash: getSolutionHash(currentState)
    };
}

// ==================== BEAM SEARCH ====================

/**
 * Seleção Determinística Top-K
 */
function selectTopK(candidates, k) {
    return candidates
        .sort((a, b) => {
            // 1. Menor custo
            if (Math.abs(a.cost - b.cost) > 0.0001) return a.cost - b.cost;
            // 2. Hash determinístico (Tie-breaker)
            // Precisamos do hash da solução RESULTANTE.
            // O candidato tem 'parent' e 'move'. 
            // Para não calcular hash de todos, calculamos só em caso de empate? 
            // Para garantir estabilidade total, calculamos sempre ou usamos ID do movimento.

            // Simplificação: Comparar ID do funcionário movido + slot destino
            const moveHashA = a.move ? (a.move.empIdx * 1000 + a.move.newSlot) : 0;
            const moveHashB = b.move ? (b.move.empIdx * 1000 + b.move.newSlot) : 0;
            return moveHashA - moveHashB;
        })
        .slice(0, k);
}

function beamSearchOptimized(staffRows, flowVector, weightVector, config) {
    const startTime = Date.now();
    const { beamWidth, maxDepth, timeoutMs } = config;

    // --- SETUP INICIAL ---
    const initialStaffState = staffRows.map((s, idx) => ({
        id: idx,
        originalId: s.id,
        slotEntrada: s.slotEntrada,
        slotSaida: s.slotSaida,
        slotIntervalo: s.slotIntervalo,
    }));
    const initialCoverage = buildCoverageVector(initialStaffState);

    // Cache de Pressão Média
    let totalFlow = 0, totalCov = 0;
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        if (flowVector[i] > 0) {
            totalFlow += flowVector[i];
            totalCov += initialCoverage[i];
        }
    }
    const avgPressure = totalCov > 0 ? totalFlow / totalCov : 0;

    const initialCost = calculateExponentialCost(initialCoverage, flowVector, weightVector, config);

    let rootNode = {
        cost: initialCost,
        staffState: initialStaffState,
        coverage: initialCoverage,
        solutionHash: getSolutionHash(initialStaffState)
    };

    // --- FASE 1: TIGER ROAR (Exploração) ---
    // Executa uma corrida gulosa focada em hotspots antes do Beam Search
    const roaredNode = tigerRoarPhase(rootNode, flowVector, weightVector, config, avgPressure);

    // Se o Tiger Roar melhorou, começamos dele. Se piorou (raro, mas possivel se heuristica falhar), mantemos original?
    // Tiger Roar é hill climbing, só aceita melhoras (no nosso impl).
    if (roaredNode.cost < rootNode.cost) {
        rootNode = roaredNode;
        // console.log(`[V3.0] Tiger Roar improved cost: ${initialCost.toFixed(0)} -> ${roaredNode.cost.toFixed(0)}`);
    }

    let beam = [rootNode];
    let bestSolution = rootNode;
    let noImprovementCount = 0;

    // --- FASE 2: BEAM SEARCH ---
    for (let depth = 0; depth < maxDepth; depth++) {
        if (Date.now() - startTime > timeoutMs) break;
        if (noImprovementCount >= 3) break; // Early termination

        const candidates = [];

        // Expandir
        for (const node of beam) {
            for (let i = 0; i < node.staffState.length; i++) {
                const emp = node.staffState[i];
                const minStart = emp.slotEntrada + MIN_WORK_BEFORE_BREAK_SLOTS;
                const maxStart = emp.slotSaida - MIN_WORK_AFTER_BREAK_SLOTS - INTERVAL_DURATION_SLOTS;
                if (minStart >= maxStart) continue;

                const currentBreak = emp.slotIntervalo;

                for (let cand = minStart; cand <= maxStart; cand++) {
                    if (cand === currentBreak) continue;

                    const delta = calculateIncrementalCostDelta(
                        node.coverage, flowVector, weightVector,
                        currentBreak, cand, config, avgPressure
                    );

                    // Só adiciona se o custo novo for menor que o custo do pai?
                    // Beam search pode explorar caminhos laterais, mas aqui queremos otimização.
                    // Adicionamos todos para o rank.


                    // Optimization: Ignorar movimentos que pioram muito?
                    // if (delta > 0) continue; // REMOVIDO PARA PERMITIR EXPLORAÇÃO NO BEAM SEARCH


                    candidates.push({
                        cost: node.cost + delta,
                        parent: node,
                        move: { empIdx: i, newSlot: cand }
                    });
                }
            }
        }

        if (candidates.length === 0) {
            noImprovementCount++;
            continue;
        }

        // Seleção Determinística
        const nextBeamCandidates = selectTopK(candidates, beamWidth);

        // Materializar
        const nextBeam = nextBeamCandidates.map(cand => {
            const newStaffState = JSON.parse(JSON.stringify(cand.parent.staffState));
            const newCoverage = [...cand.parent.coverage];
            const { empIdx, newSlot } = cand.move;
            const emp = newStaffState[empIdx];
            const oldBreak = emp.slotIntervalo;

            emp.slotIntervalo = newSlot;

            if (oldBreak !== null) {
                for (let k = 0; k < INTERVAL_DURATION_SLOTS; k++)
                    if (oldBreak + k < TOTAL_SLOTS) newCoverage[oldBreak + k]++;
            }
            for (let k = 0; k < INTERVAL_DURATION_SLOTS; k++)
                if (newSlot + k < TOTAL_SLOTS) newCoverage[newSlot + k]--;

            return {
                cost: cand.cost,
                staffState: newStaffState,
                coverage: newCoverage,
                solutionHash: null // Hash on demand if needed, mas usamos moveHash no sort
            };
        });

        // Check Best
        if (nextBeam[0].cost < bestSolution.cost - 0.1) {
            bestSolution = nextBeam[0];
            noImprovementCount = 0;
        } else {
            noImprovementCount++;
        }

        beam = nextBeam;
    }

    return bestSolution.staffState;
}


// ==================== INTERFACE PÚBLICA ====================

export function optimizeScheduleRows(staffRows, selectedDay, thermalRowsByHour, configInput = {}) {
    const staffCount = staffRows.length;
    const currentScore = configInput.currentScore || 80;
    const profile = detectProfile(staffCount, currentScore);
    const v3Config = V3_CONFIG[profile];

    // console.log(`[ANTIGRAVITY V3.0] Perfil: ${profile}`);

    const flowVector = buildFlowVector(thermalRowsByHour);
    const weightVector = buildWeightVector(thermalRowsByHour);

    const dayStaff = staffRows.filter(r =>
        r.dia === selectedDay &&
        r.entrada && r.entrada.toUpperCase() !== 'FOLGA' &&
        r.saida
    );

    if (dayStaff.length === 0) return staffRows;

    const optimizableStaff = dayStaff.map(s => ({
        ...s,
        slotEntrada: toSlot(s.entrada),
        slotSaida: toSlot(s.saida),
        slotIntervalo: s.intervalo ? toSlot(s.intervalo) : null
    }));

    const finalState = beamSearchOptimized(optimizableStaff, flowVector, weightVector, v3Config);

    const resultRows = staffRows.map(row => {
        const opt = finalState.find(o => o.originalId === row.id); // Usar originalId
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

export function generateSuggestedCoverage(rowsByHour, config) { return { suggestedStaffByHour: [] }; }
export function formatThermalIndex(n) { return n?.toFixed(2) || '-'; }
export function formatPressure(n) { return n?.toFixed(1) || '-'; }
export function computeBreaksPerHour(staffRows, day) { return {}; }
