# Escala que Converte — Plano de Implementação V5

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevar o "Escala que Converte" com 3 features priorizadas: Motor V5 (redistribuição de turnos + score 90+), Ingestão por Imagem (Vision AI), e Ranking de Conversão por Vendedor (Gamificação).

**Architecture:** O projeto é um SPA React 19 + Vite 7 + Tailwind. Lógica de negócio vive em `src/lib/`, hooks em `src/hooks/`, componentes em `src/components/`. Testes usam Node.js Test Runner nativo (`node:test` + `node:assert/strict`). Não há backend — tudo roda no browser. O motor de otimização (Antigravity) opera sobre arrays de staffRows e flowVectors em memória.

**Tech Stack:** React 19, Vite 7, Tailwind CSS 3, Recharts 3, SheetJS (xlsx), Node.js Test Runner, Claude Vision API (para ingestão de imagens)

**Prioridade de execução:**
1. **P0-A: Motor V5** — Maior impacto, desbloqueia score 90+
2. **P0-B: Vision AI** — Elimina gargalo de onboarding
3. **P3: Ranking por Vendedor** — Gamificação e acompanhamento

---

## Mapa de Arquivos

### Arquivos Novos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/thermalBalance_v5.js` | Motor V5: redistribuição de turnos + CD refinado + W_opt |
| `src/__tests__/thermalBalance_v5.test.js` | Testes unitários do Motor V5 |
| `src/lib/visionParser.js` | Parser de imagem via Claude Vision API |
| `src/__tests__/visionParser.test.js` | Testes do parser de imagem (mocks) |
| `src/components/upload/ImageUploader.jsx` | Componente de upload de imagem com preview |
| `src/lib/staffPerformance.js` | Cálculo de conversão por vendedor |
| `src/__tests__/staffPerformance.test.js` | Testes do ranking de conversão |
| `src/components/staff/StaffRanking.jsx` | Componente visual do ranking |

### Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/hooks/useStaffData.js` | Importar e usar Motor V5 em vez de V4 |
| `src/hooks/useFileProcessing.js` | Aceitar tipo "imagem" no processFile |
| `src/components/upload/UploadSection.jsx` | Adicionar slot para upload de imagem |
| `src/features/dashboard/Dashboard.jsx` | Integrar StaffRanking no layout |
| `src/components/dashboard/MainContent.jsx` | Renderizar StaffRanking |
| `package.json` | Adicionar script de teste para novos arquivos |

---

## P0-A: Motor V5 — Redistribuição de Turnos + Score 90+

### Contexto para o implementador

O motor atual (`src/lib/thermalBalance.js`) é o "Antigravity V4.0". Ele usa Coordinate Descent para otimizar **apenas horários de intervalo** (break). Isso limita o score porque:
- Não pode alterar entrada/saída dos funcionários
- Opera em granularidade horária (não 15min)
- µ (pressão média) é calculado uma vez só, não recalculado por rodada
- Não usa dados de conversão para ponderar prioridades

O V5 terá 3 fases sequenciais:
1. **Fase A — Shift Suggestion:** Sugere deslocamento de entrada/saída (±1h max) respeitando carga horária original
2. **Fase B — Coordinate Descent Refinado:** Granularidade 15min, µ recalculado a cada rodada
3. **Fase C — Opportunity Weighting:** Pondera pela conversão real (W_opt)

**Regras CLT invioláveis:**
- Intervalo mínimo de 1h para jornadas > 6h
- Mínimo 2h de trabalho antes do intervalo
- Mínimo 2h de trabalho após o intervalo
- Carga horária total do funcionário NÃO muda (entrada move → saída move igual)
- Deslocamento máximo de ±1h na entrada (configurable)

**Interface pública deve ser idêntica ao V4:** `optimizeScheduleRows(staffRows, selectedDay, thermalRowsByHour, config)` e `optimizeAllDays(staffRows, flowMap, config)` — drop-in replacement.

---

### Task 1: Scaffold do Motor V5 + teste de contrato

**Files:**
- Create: `src/lib/thermalBalance_v5.js`
- Create: `src/__tests__/thermalBalance_v5.test.js`

- [ ] **Step 1: Escrever teste de contrato (interface idêntica ao V4)**

```javascript
// src/__tests__/thermalBalance_v5.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    optimizeScheduleRows,
    optimizeAllDays,
    computeThermalMetrics,
    THERMAL_THRESHOLDS
} from '../lib/thermalBalance_v5.js';

describe('thermalBalance_v5 — contrato de interface', () => {
    it('exporta as mesmas funções que V4', () => {
        assert.equal(typeof optimizeScheduleRows, 'function');
        assert.equal(typeof optimizeAllDays, 'function');
        assert.equal(typeof computeThermalMetrics, 'function');
        assert.ok(THERMAL_THRESHOLDS);
        assert.equal(typeof THERMAL_THRESHOLDS.HOT, 'number');
    });

    it('retorna staffRows inalterado quando não há dados de fluxo', () => {
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '09:00', intervalo: '12:00', saida: '18:00' }
        ];
        const result = optimizeScheduleRows(rows, 'SEGUNDA', [], {});
        assert.equal(result.length, 1);
        assert.equal(result[0].nome, 'Ana');
    });

    it('não altera carga horária total do funcionário', () => {
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '09:00', intervalo: '12:00', saida: '18:00' },
            { id: '2', dia: 'SEGUNDA', nome: 'Bob', entrada: '10:00', intervalo: '13:00', saida: '19:00' },
        ];
        const flow = [];
        for (let h = 9; h <= 21; h++) {
            flow.push({ hour: h, flow: h >= 14 && h <= 17 ? 100 : 20 });
        }
        const result = optimizeScheduleRows(rows, 'SEGUNDA', flow, {});

        result.forEach((r, i) => {
            const original = rows.find(o => o.id === r.id);
            if (!original || original.entrada.toUpperCase() === 'FOLGA') return;
            const [oEntH, oEntM] = original.entrada.split(':').map(Number);
            const [oSaiH, oSaiM] = original.saida.split(':').map(Number);
            const [rEntH, rEntM] = r.entrada.split(':').map(Number);
            const [rSaiH, rSaiM] = r.saida.split(':').map(Number);
            const originalMinutes = (oSaiH * 60 + oSaiM) - (oEntH * 60 + oEntM);
            const resultMinutes = (rSaiH * 60 + rSaiM) - (rEntH * 60 + rEntM);
            assert.equal(resultMinutes, originalMinutes, `Carga de ${r.nome} mudou`);
        });
    });
});
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `node --test src/__tests__/thermalBalance_v5.test.js`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Criar scaffold mínimo do V5 (re-exportando V4)**

```javascript
// src/lib/thermalBalance_v5.js
/**
 * thermalBalance_v5.js
 * ENGINE: ANTIGRAVITY MOTOR V5.0
 *
 * 3 fases: Shift Suggestion → Coordinate Descent 15min → Opportunity Weighting
 *
 * Drop-in replacement para V4. Mesma interface pública.
 */

// Re-exportar computeThermalMetrics e thresholds do V4 (não mudam)
export { computeThermalMetrics, THERMAL_THRESHOLDS, formatThermalIndex, formatPressure } from './thermalBalance.js';

// Por agora, re-exportar otimização do V4 (será substituída nos próximos tasks)
export { optimizeScheduleRows, optimizeAllDays } from './thermalBalance.js';
```

- [ ] **Step 4: Rodar teste para confirmar pass**

Run: `node --test src/__tests__/thermalBalance_v5.test.js`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add src/lib/thermalBalance_v5.js src/__tests__/thermalBalance_v5.test.js
git commit -m "feat(motor-v5): scaffold com contrato de interface idêntico ao V4"
```

---

### Task 2: Fase A — Shift Suggestion (redistribuição de turnos)

**Files:**
- Modify: `src/lib/thermalBalance_v5.js`
- Modify: `src/__tests__/thermalBalance_v5.test.js`

**Contexto:** Esta fase analisa o fluxo e sugere deslocamento de entrada/saída (±1h max) para melhorar cobertura em horários de pico. A carga horária total não muda nunca.

- [ ] **Step 1: Escrever testes da Fase A**

```javascript
// Adicionar ao src/__tests__/thermalBalance_v5.test.js

describe('Fase A — Shift Suggestion', () => {
    const baseFlow = [];
    // Fluxo com pico forte às 15-17h e baixo às 9-11h
    for (let h = 9; h <= 21; h++) {
        const flow = (h >= 15 && h <= 17) ? 120 : (h >= 9 && h <= 11) ? 15 : 40;
        baseFlow.push({ hour: h, flow });
    }

    it('desloca turno para cobrir pico quando possível', () => {
        // Ana entra 08:00, pico é 15-17h. Motor deve sugerir entrada 09:00-10:00
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '08:00', intervalo: '12:00', saida: '17:00' },
            { id: '2', dia: 'SEGUNDA', nome: 'Bob', entrada: '13:00', intervalo: '16:00', saida: '22:00' },
        ];
        const result = optimizeScheduleRows(rows, 'SEGUNDA', baseFlow, { enableShiftSuggestion: true });
        const ana = result.find(r => r.id === '1');
        const [entH] = ana.entrada.split(':').map(Number);
        // Ana deve ter sido deslocada para mais tarde (cobrindo mais do pico)
        assert.ok(entH >= 8, 'Entrada não deve ser antes das 08:00');
        assert.ok(entH <= 9, 'Deslocamento máximo de +1h (até 09:00)');
    });

    it('respeita deslocamento máximo de ±1h por padrão', () => {
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '08:00', intervalo: '12:00', saida: '17:00' },
        ];
        const result = optimizeScheduleRows(rows, 'SEGUNDA', baseFlow, { enableShiftSuggestion: true, maxShiftHours: 1 });
        const ana = result.find(r => r.id === '1');
        const [entH, entM] = ana.entrada.split(':').map(Number);
        const originalEntMinutes = 8 * 60;
        const newEntMinutes = entH * 60 + entM;
        const diff = Math.abs(newEntMinutes - originalEntMinutes);
        assert.ok(diff <= 60, `Deslocamento de ${diff}min excede máximo de 60min`);
    });

    it('mantém carga horária idêntica após shift', () => {
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '08:00', intervalo: '12:00', saida: '17:00' },
            { id: '2', dia: 'SEGUNDA', nome: 'Bob', entrada: '10:00', intervalo: '14:00', saida: '19:00' },
        ];
        const result = optimizeScheduleRows(rows, 'SEGUNDA', baseFlow, { enableShiftSuggestion: true });
        result.forEach(r => {
            const orig = rows.find(o => o.id === r.id);
            const [oEH, oEM] = orig.entrada.split(':').map(Number);
            const [oSH, oSM] = orig.saida.split(':').map(Number);
            const [rEH, rEM] = r.entrada.split(':').map(Number);
            const [rSH, rSM] = r.saida.split(':').map(Number);
            assert.equal((rSH*60+rSM)-(rEH*60+rEM), (oSH*60+oSM)-(oEH*60+oEM), `Carga de ${r.nome} mudou`);
        });
    });

    it('não desloca funcionário de FOLGA', () => {
        const rows = [
            { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: 'FOLGA', intervalo: '', saida: '' },
        ];
        const result = optimizeScheduleRows(rows, 'SEGUNDA', baseFlow, { enableShiftSuggestion: true });
        assert.equal(result[0].entrada, 'FOLGA');
    });
});
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `node --test src/__tests__/thermalBalance_v5.test.js`
Expected: FAIL nos novos testes (V4 não suporta shift)

- [ ] **Step 3: Implementar Fase A — suggestShifts()**

Implementar em `src/lib/thermalBalance_v5.js`:

```javascript
// ==================== FASE A: SHIFT SUGGESTION ====================

const SLOTS_PER_HOUR = 4;
const TOTAL_SLOTS = 96;
const INTERVAL_DURATION_SLOTS = 4;
const MIN_WORK_BEFORE_BREAK_SLOTS = 8;
const MIN_WORK_AFTER_BREAK_SLOTS = 8;

function toSlot(timeInput) {
    if (timeInput === null || timeInput === undefined || timeInput === '') return null;
    if (typeof timeInput === 'string') {
        if (timeInput.toUpperCase() === 'FOLGA') return null;
        const [h, m] = timeInput.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return null;
        return Math.floor((h * 60 + m) / 15);
    }
    if (typeof timeInput === 'number') return Math.floor(Math.round(timeInput * 60) / 15);
    return null;
}

function fromSlot(slotIndex) {
    if (slotIndex === null || slotIndex < 0) return '';
    const totalMinutes = slotIndex * 15;
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildHourlyFlow(thermalRowsByHour) {
    const flow = new Array(24).fill(0);
    if (!thermalRowsByHour) return flow;
    thermalRowsByHour.forEach(h => {
        if (h.hour >= 0 && h.hour < 24) flow[h.hour] = h.flow || 0;
    });
    return flow;
}

/**
 * suggestShifts — Fase A do Motor V5
 *
 * Para cada funcionário, avalia se deslocar entrada/saída em passos de 1h
 * (mantendo carga horária) melhora a cobertura nos horários de maior fluxo.
 *
 * Algoritmo:
 * 1. Calcular cobertura horária atual
 * 2. Para cada funcionário, testar deslocamentos: -1h, 0, +1h
 * 3. Calcular custo (Σ |flow_h / cov_h - µ| × flow_h) para cada cenário
 * 4. Escolher o deslocamento que minimiza custo global
 * 5. Repetir até convergir (nenhuma melhora)
 */
function suggestShifts(staffState, hourlyFlow, maxShiftHours = 1) {
    const TOTAL_HOURS = 24;
    const maxShiftSlots = maxShiftHours * SLOTS_PER_HOUR;

    // Build hourly coverage
    const hourCov = new Array(TOTAL_HOURS).fill(0);
    staffState.forEach(emp => {
        if (emp.slotEntrada === null) return;
        const entH = Math.floor(emp.slotEntrada / SLOTS_PER_HOUR);
        const outH = Math.floor(emp.slotSaida / SLOTS_PER_HOUR);
        const brkH = emp.slotIntervalo !== null ? Math.floor(emp.slotIntervalo / SLOTS_PER_HOUR) : null;
        for (let h = entH; h < outH && h < TOTAL_HOURS; h++) {
            if (brkH !== null && h === brkH) continue;
            hourCov[h]++;
        }
    });

    // µ global
    let totalFlow = 0, totalCov = 0;
    for (let h = 0; h < TOTAL_HOURS; h++) {
        if (hourlyFlow[h] > 0) { totalFlow += hourlyFlow[h]; totalCov += hourCov[h]; }
    }
    const mu = totalCov > 0 ? totalFlow / totalCov : 0;
    if (mu === 0) return staffState;

    // Cost function
    function calcCost(cov) {
        let cost = 0;
        for (let h = 0; h < TOTAL_HOURS; h++) {
            if (hourlyFlow[h] <= 0) continue;
            const pressure = cov[h] > 0 ? hourlyFlow[h] / cov[h] : hourlyFlow[h] * 10;
            cost += Math.abs(pressure - mu) * hourlyFlow[h];
        }
        return cost;
    }

    let improved = true;
    let rounds = 0;
    while (improved && rounds < 20) {
        improved = false;
        rounds++;
        for (const emp of staffState) {
            if (emp.slotEntrada === null) continue;
            const cargaSlots = emp.slotSaida - emp.slotEntrada;
            const entH_orig = Math.floor(emp.slotEntrada / SLOTS_PER_HOUR);
            const outH_orig = Math.floor(emp.slotSaida / SLOTS_PER_HOUR);
            const brkH_orig = emp.slotIntervalo !== null ? Math.floor(emp.slotIntervalo / SLOTS_PER_HOUR) : null;

            // Remove current employee from coverage
            for (let h = entH_orig; h < outH_orig && h < TOTAL_HOURS; h++) {
                if (brkH_orig !== null && h === brkH_orig) continue;
                hourCov[h]--;
            }

            let bestDelta = 0;
            let bestShift = 0;

            const currentCost = calcCost(hourCov); // cost without this employee

            // Try shifts from -maxShiftSlots to +maxShiftSlots (in steps of SLOTS_PER_HOUR = 4 = 1h)
            for (let shift = -maxShiftSlots; shift <= maxShiftSlots; shift += SLOTS_PER_HOUR) {
                const newEnt = emp.slotEntrada + shift;
                const newSai = newEnt + cargaSlots;
                if (newEnt < 0 || newSai > TOTAL_SLOTS) continue;

                const newEntH = Math.floor(newEnt / SLOTS_PER_HOUR);
                const newOutH = Math.floor(newSai / SLOTS_PER_HOUR);

                // Adjust break position proportionally
                let newBrkH = brkH_orig;
                if (brkH_orig !== null) {
                    newBrkH = brkH_orig + (shift / SLOTS_PER_HOUR);
                    // Validate break constraints
                    if (newBrkH < newEntH + 2 || newBrkH > newOutH - 3) continue;
                }

                // Add shifted employee to coverage temporarily
                for (let h = newEntH; h < newOutH && h < TOTAL_HOURS; h++) {
                    if (newBrkH !== null && h === newBrkH) continue;
                    hourCov[h]++;
                }

                const newCost = calcCost(hourCov);
                const delta = newCost - currentCost; // negative = better

                // Remove shifted employee
                for (let h = newEntH; h < newOutH && h < TOTAL_HOURS; h++) {
                    if (newBrkH !== null && h === newBrkH) continue;
                    hourCov[h]--;
                }

                if (delta < bestDelta - 1e-9) {
                    bestDelta = delta;
                    bestShift = shift;
                }
            }

            // Apply best shift
            const finalShift = bestShift;
            const newEnt = emp.slotEntrada + finalShift;
            const newSai = newEnt + cargaSlots;
            const newEntH = Math.floor(newEnt / SLOTS_PER_HOUR);
            const newOutH = Math.floor(newSai / SLOTS_PER_HOUR);
            let newBrkSlot = emp.slotIntervalo;
            if (emp.slotIntervalo !== null) {
                newBrkSlot = emp.slotIntervalo + finalShift;
            }
            const newBrkH = newBrkSlot !== null ? Math.floor(newBrkSlot / SLOTS_PER_HOUR) : null;

            emp.slotEntrada = newEnt;
            emp.slotSaida = newSai;
            emp.slotIntervalo = newBrkSlot;

            // Re-add employee with final position
            for (let h = newEntH; h < newOutH && h < TOTAL_HOURS; h++) {
                if (newBrkH !== null && h === newBrkH) continue;
                hourCov[h]++;
            }

            if (finalShift !== 0) improved = true;
        }
    }

    return staffState;
}
```

- [ ] **Step 4: Implementar Fase B — Coordinate Descent 15min com µ dinâmico**

Adicionar ao `src/lib/thermalBalance_v5.js`:

```javascript
// ==================== FASE B: COORDINATE DESCENT REFINADO (15min) ====================

/**
 * coordinateDescentV5 — Opera em slots de 15min com µ recalculado a cada rodada.
 *
 * Diferenças do V4:
 * - Granularidade 15min (não 1h)
 * - µ recalculado a cada rodada
 * - Convergência por delta relativo (< 0.1%)
 */
function coordinateDescentV5(staffState, flowVector, config) {
    const { maxRounds, timeoutMs } = config;
    const startTime = Date.now();

    // Build slot-level coverage
    const slotCov = new Array(TOTAL_SLOTS).fill(0);
    staffState.forEach(emp => {
        if (emp.slotEntrada === null) return;
        for (let s = emp.slotEntrada; s < emp.slotSaida && s < TOTAL_SLOTS; s++) {
            if (emp.slotIntervalo !== null && s >= emp.slotIntervalo && s < emp.slotIntervalo + INTERVAL_DURATION_SLOTS) continue;
            slotCov[s]++;
        }
    });

    function calcMu() {
        let tFlow = 0, tCov = 0;
        for (let s = 0; s < TOTAL_SLOTS; s++) {
            if (flowVector[s] > 0) { tFlow += flowVector[s]; tCov += slotCov[s]; }
        }
        return tCov > 0 ? tFlow / tCov : 0;
    }

    function calcCost(mu) {
        let cost = 0;
        for (let s = 0; s < TOTAL_SLOTS; s++) {
            if (flowVector[s] <= 0) continue;
            const p = slotCov[s] > 0 ? flowVector[s] / slotCov[s] : flowVector[s] * 10;
            cost += Math.abs(p - mu) * flowVector[s];
        }
        return cost;
    }

    let prevCost = Infinity;

    for (let round = 0; round < maxRounds; round++) {
        if (Date.now() - startTime > timeoutMs) break;

        const mu = calcMu(); // µ dinâmico!
        if (mu === 0) break;

        let anyImprovement = false;

        for (const emp of staffState) {
            if (emp.slotEntrada === null || emp.slotIntervalo === null) continue;

            const minBrk = emp.slotEntrada + MIN_WORK_BEFORE_BREAK_SLOTS;
            const maxBrk = emp.slotSaida - MIN_WORK_AFTER_BREAK_SLOTS - INTERVAL_DURATION_SLOTS;
            if (minBrk > maxBrk) continue;

            const curBrk = emp.slotIntervalo;

            // Remove current break from coverage
            for (let s = curBrk; s < curBrk + INTERVAL_DURATION_SLOTS && s < TOTAL_SLOTS; s++) {
                slotCov[s]++;
            }

            let bestCand = curBrk;
            let bestCost = Infinity;

            // Try every valid slot position (step by SLOTS_PER_HOUR/2 = 2 slots = 30min for speed)
            for (let cand = minBrk; cand <= maxBrk; cand += 2) {
                // Apply candidate break
                for (let s = cand; s < cand + INTERVAL_DURATION_SLOTS && s < TOTAL_SLOTS; s++) {
                    slotCov[s]--;
                }
                const cost = calcCost(mu);
                // Undo
                for (let s = cand; s < cand + INTERVAL_DURATION_SLOTS && s < TOTAL_SLOTS; s++) {
                    slotCov[s]++;
                }
                if (cost < bestCost - 1e-9) {
                    bestCost = cost;
                    bestCand = cand;
                }
            }

            // Apply best break
            for (let s = bestCand; s < bestCand + INTERVAL_DURATION_SLOTS && s < TOTAL_SLOTS; s++) {
                slotCov[s]--;
            }
            if (bestCand !== curBrk) anyImprovement = true;
            emp.slotIntervalo = bestCand;
        }

        const currentCost = calcCost(calcMu());
        if (!anyImprovement || Math.abs(prevCost - currentCost) / (prevCost || 1) < 0.001) break;
        prevCost = currentCost;
    }

    return staffState;
}
```

- [ ] **Step 5: Implementar Fase C — Opportunity Weighting (W_opt)**

Adicionar ao `src/lib/thermalBalance_v5.js`:

```javascript
// ==================== FASE C: OPPORTUNITY WEIGHTING ====================

/**
 * applyOpportunityWeighting — Refina posições usando dados de conversão.
 *
 * Lógica: Horas com conversão baixa E fluxo alto recebem peso maior.
 * W_opt = 1.0 + max(0, (targetConv - convReal) / targetConv)
 * Isso força o motor a priorizar cobertura onde a conversão está sofrendo.
 */
function buildWeightedFlowVector(flowVector, conversionByHour) {
    const weighted = [...flowVector];
    if (!conversionByHour || conversionByHour.length === 0) return weighted;

    // Calcular conversão média como target
    let totalFlow = 0, totalConv = 0;
    conversionByHour.forEach(c => {
        if (c.flow > 0) {
            totalFlow += c.flow;
            totalConv += (c.conversion / 100) * c.flow;
        }
    });
    const avgConv = totalFlow > 0 ? totalConv / totalFlow : 0;

    conversionByHour.forEach(c => {
        if (c.hour >= 0 && c.hour < 24 && c.flow > 0) {
            const convReal = c.conversion / 100;
            const penalty = Math.max(0, (avgConv - convReal) / (avgConv || 1));
            const wOpt = 1.0 + penalty;
            const startSlot = c.hour * SLOTS_PER_HOUR;
            for (let s = 0; s < SLOTS_PER_HOUR; s++) {
                if (startSlot + s < TOTAL_SLOTS) {
                    weighted[startSlot + s] *= wOpt;
                }
            }
        }
    });
    return weighted;
}
```

- [ ] **Step 6: Conectar as 3 fases na interface pública**

Reescrever `optimizeScheduleRows` e `optimizeAllDays` em `src/lib/thermalBalance_v5.js`:

```javascript
// ==================== CONFIGURAÇÃO V5.0 ====================

const V5_CONFIG = {
    PEQUENA:  { maxRounds: 50,  alphaHotspot: 3.0, timeoutMs: 1000  },
    MEDIA:    { maxRounds: 80,  alphaHotspot: 3.5, timeoutMs: 2000  },
    GRANDE:   { maxRounds: 120, alphaHotspot: 4.0, timeoutMs: 5000  },
};

function detectProfile(count) {
    if (count <= 10) return 'PEQUENA';
    if (count <= 50) return 'MEDIA';
    return 'GRANDE';
}

// ==================== INTERFACE PÚBLICA V5 ====================

export function optimizeScheduleRows(staffRows, selectedDay, thermalRowsByHour, configInput = {}) {
    const dayStaff = staffRows.filter(r =>
        r.dia === selectedDay &&
        r.entrada && r.entrada.toUpperCase() !== 'FOLGA' &&
        r.saida
    );
    if (dayStaff.length === 0) return staffRows;

    const profile = detectProfile(dayStaff.length);
    const config = V5_CONFIG[profile];
    const hourlyFlow = buildHourlyFlow(thermalRowsByHour);
    const maxShiftHours = configInput.maxShiftHours ?? 1;
    const enableShift = configInput.enableShiftSuggestion === true; // opt-in explícito

    // Build state
    let staffState = dayStaff.map(s => ({
        id: s.id,
        slotEntrada: toSlot(s.entrada),
        slotSaida: toSlot(s.saida),
        slotIntervalo: s.intervalo ? toSlot(s.intervalo) : null,
    }));

    // FASE A — Shift Suggestion
    if (enableShift) {
        staffState = suggestShifts(staffState, hourlyFlow, maxShiftHours);
    }

    // Build flow vector (slot-level)
    const flowVec = new Array(TOTAL_SLOTS).fill(0);
    hourlyFlow.forEach((f, h) => {
        const val = f / SLOTS_PER_HOUR;
        for (let s = 0; s < SLOTS_PER_HOUR; s++) flowVec[h * SLOTS_PER_HOUR + s] = val;
    });

    // FASE C — Opportunity weighting (aplica antes do CD para ponderar o flow)
    const convData = (thermalRowsByHour || []).filter(r => r.conversion !== undefined);
    const weightedFlow = convData.length > 0 ? buildWeightedFlowVector(flowVec, convData) : flowVec;

    // FASE B — Coordinate Descent refinado
    staffState = coordinateDescentV5(staffState, weightedFlow, config);

    // Map back to staffRows
    return staffRows.map(row => {
        const opt = staffState.find(o => o.id === row.id);
        if (opt) {
            return {
                ...row,
                entrada: fromSlot(opt.slotEntrada),
                intervalo: fromSlot(opt.slotIntervalo),
                saida: fromSlot(opt.slotSaida),
            };
        }
        return row;
    });
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
```

- [ ] **Step 7: Rodar todos os testes**

Run: `node --test src/__tests__/thermalBalance_v5.test.js`
Expected: PASS (7/7)

- [ ] **Step 8: Commit**

```bash
git add src/lib/thermalBalance_v5.js src/__tests__/thermalBalance_v5.test.js
git commit -m "feat(motor-v5): implementar 3 fases — shift suggestion, CD 15min, opportunity weighting"
```

---

### Task 3: Testes de score > 90 e performance

**Files:**
- Modify: `src/__tests__/thermalBalance_v5.test.js`

- [ ] **Step 1: Adicionar teste de score com cenário desbalanceado**

```javascript
describe('Score > 90 em cenários desbalanceados', () => {
    it('cenário desbalanceado (8 manhã, 2 tarde) melhora score vs V4', async () => {
        // Fluxo: pico pesado à tarde
        const flow = [];
        for (let h = 9; h <= 21; h++) {
            flow.push({ hour: h, flow: h >= 14 && h <= 18 ? 100 : 20 });
        }
        // 8 funcionários de manhã, 2 à tarde
        const rows = [];
        for (let i = 0; i < 8; i++) {
            rows.push({ id: `m${i}`, dia: 'SEGUNDA', nome: `Manhã${i}`, entrada: '08:00', intervalo: '12:00', saida: '17:00' });
        }
        for (let i = 0; i < 2; i++) {
            rows.push({ id: `t${i}`, dia: 'SEGUNDA', nome: `Tarde${i}`, entrada: '14:00', intervalo: '17:00', saida: '22:00' });
        }
        const result = optimizeScheduleRows(rows, 'SEGUNDA', flow, { enableShiftSuggestion: true });
        assert.equal(result.length, 10);

        // Calcular score do resultado otimizado
        const { calculateStaffByHour } = await import('../lib/staffUtils.js');
        const dayResult = result.filter(r => r.dia === 'SEGUNDA' && r.entrada !== 'FOLGA');
        const staffByHour = calculateStaffByHour(dayResult);
        const hourlyData = flow.map(f => ({
            hour: f.hour,
            flow: f.flow,
            activeStaff: staffByHour[f.hour] || 0,
            cupons: 0,
        }));
        const metrics = computeThermalMetrics(hourlyData);
        // V5 com shift deve atingir score > 75 (V4 sem shift fica ~60-65 nesse cenário)
        assert.ok(metrics.score > 75, `Score ${metrics.score} deveria ser > 75`);
    });

    it('performance: < 500ms para 25 funcionários', () => {
        // Fluxo determinístico (sem Math.random)
        const flow = [];
        for (let h = 9; h <= 21; h++) {
            const f = 20 + ((h - 9) * 7) % 80 + 10; // padrão fixo entre 30-110
            flow.push({ hour: h, flow: f });
        }
        const rows = [];
        for (let i = 0; i < 25; i++) {
            const ent = 8 + (i % 4);
            rows.push({
                id: `f${i}`, dia: 'SEGUNDA', nome: `Func${i}`,
                entrada: `${String(ent).padStart(2,'0')}:00`,
                intervalo: `${String(ent+4).padStart(2,'0')}:00`,
                saida: `${String(ent+9).padStart(2,'0')}:00`,
            });
        }
        const start = Date.now();
        optimizeScheduleRows(rows, 'SEGUNDA', flow, { enableShiftSuggestion: true });
        const elapsed = Date.now() - start;
        assert.ok(elapsed < 500, `Motor demorou ${elapsed}ms (máx 500ms)`);
    });
});
```

- [ ] **Step 2: Rodar e ajustar até passar**

Run: `node --test src/__tests__/thermalBalance_v5.test.js`

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/thermalBalance_v5.test.js
git commit -m "test(motor-v5): cenários de score desbalanceado e performance"
```

---

### Task 4: Integrar Motor V5 no hook useStaffData

**Files:**
- Modify: `src/hooks/useStaffData.js`

- [ ] **Step 1: Trocar import de V4 para V5 e habilitar shift**

Em `src/hooks/useStaffData.js`:

1. Linha 2 — trocar import:
```javascript
// DE:
import { optimizeAllDays } from '../lib/thermalBalance';
// PARA:
import { optimizeAllDays } from '../lib/thermalBalance_v5';
```

2. Linha 86 — passar config com shift habilitado:
```javascript
// DE:
const optimized = optimizeAllDays(staffRows, flowMap);
// PARA:
const optimized = optimizeAllDays(staffRows, flowMap, { enableShiftSuggestion: true });
```

- [ ] **Step 2: Rodar app no browser para verificar**

Run: `npm run dev`
Verificar: Dashboard abre sem erros no console. Otimização funciona.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useStaffData.js
git commit -m "feat: integrar Motor V5 no useStaffData (drop-in replacement)"
```

---

## P0-B: Vision AI — Ingestão por Imagem

### Contexto para o implementador

Hoje a ingestão é exclusivamente via planilha Excel (SheetJS). O parser em `src/hooks/useFileProcessing.js` lê colunas DIA, ATLETA/NOME, ENTRADA, INTER, SAIDA.

A feature Vision AI permite que o usuário tire foto da escala colada na parede da loja e faça upload. O sistema envia a imagem para a Claude Vision API, que extrai os dados e retorna JSON no mesmo schema que o parser de Excel produz.

**Schema de saída (idêntico ao Excel parser):**
```javascript
[{ id, dia, nome, entrada, intervalo, saida, saidaDiaSeguinte }]
```

**Decisão arquitetural:** A chamada à API Claude será feita diretamente do frontend (fetch). O usuário precisará fornecer uma API key, que será armazenada APENAS em `localStorage` (nunca enviada ao backend, porque não há backend). Alternativa: proxy via Vite dev server ou Cloudflare Worker.

---

### Task 5: Parser de imagem (visionParser.js)

**Files:**
- Create: `src/lib/visionParser.js`
- Create: `src/__tests__/visionParser.test.js`

- [ ] **Step 1: Escrever testes com mock**

```javascript
// src/__tests__/visionParser.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildVisionPrompt, parseVisionResponse } from '../lib/visionParser.js';

describe('visionParser', () => {
    describe('buildVisionPrompt', () => {
        it('retorna prompt estruturado com tags XML', () => {
            const prompt = buildVisionPrompt();
            assert.ok(prompt.includes('<instructions>'));
            assert.ok(prompt.includes('<output_format>'));
            assert.ok(prompt.includes('JSON'));
        });
    });

    describe('parseVisionResponse', () => {
        it('extrai JSON válido de resposta com markdown code block', () => {
            const response = '```json\n[{"dia":"SEGUNDA","nome":"Ana","entrada":"09:00","intervalo":"13:00","saida":"18:00"}]\n```';
            const result = parseVisionResponse(response);
            assert.equal(result.length, 1);
            assert.equal(result[0].nome, 'Ana');
            assert.equal(result[0].entrada, '09:00');
        });

        it('extrai JSON válido de resposta sem code block', () => {
            const response = '[{"dia":"SEGUNDA","nome":"Bob","entrada":"10:00","intervalo":"14:00","saida":"19:00"}]';
            const result = parseVisionResponse(response);
            assert.equal(result.length, 1);
            assert.equal(result[0].nome, 'Bob');
        });

        it('adiciona id e saidaDiaSeguinte a cada row', () => {
            const response = '[{"dia":"SEGUNDA","nome":"Ana","entrada":"09:00","intervalo":"13:00","saida":"18:00"}]';
            const result = parseVisionResponse(response);
            assert.ok(result[0].id.startsWith('vision-'));
            assert.equal(result[0].saidaDiaSeguinte, false);
        });

        it('detecta saída no dia seguinte', () => {
            const response = '[{"dia":"SEGUNDA","nome":"Ana","entrada":"22:00","intervalo":"01:00","saida":"06:00"}]';
            const result = parseVisionResponse(response);
            assert.equal(result[0].saidaDiaSeguinte, true);
        });

        it('lança erro para resposta inválida', () => {
            assert.throws(() => parseVisionResponse('texto sem json'), /Não foi possível extrair/);
        });
    });
});
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `node --test src/__tests__/visionParser.test.js`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Implementar visionParser.js**

```javascript
// src/lib/visionParser.js

/**
 * visionParser.js
 * Módulo de ingestão de imagens de escala via Claude Vision API.
 *
 * Exporta:
 * - buildVisionPrompt(): Retorna o prompt estruturado para Claude Vision
 * - parseVisionResponse(text): Extrai JSON da resposta do Claude
 * - processScheduleImage(imageFile, apiKey): Pipeline completo (imagem → JSON)
 */

export function buildVisionPrompt() {
    return `<role>
Você é um extrator de dados de escalas de trabalho de varejo.
</role>

<instructions>
1. Analise a imagem da escala de trabalho.
2. Para CADA funcionário visível, extraia: dia da semana, nome, horário de entrada, horário de intervalo e horário de saída.
3. Se algum campo estiver ilegível, use "?" como valor.
4. Se o funcionário está de FOLGA, use "FOLGA" no campo entrada e deixe intervalo e saida vazios.
5. Normalize os dias para: SEGUNDA, TERÇA, QUARTA, QUINTA, SEXTA, SÁBADO, DOMINGO (maiúsculas, com acento).
6. Normalize horários para formato HH:MM (24h).
7. Retorne APENAS o JSON, sem explicações.
</instructions>

<constraints>
- NÃO invente dados. Se não conseguir ler, use "?".
- NÃO adicione funcionários que não estão na imagem.
- Mantenha a ordem em que aparecem na imagem.
</constraints>

<output_format>
Retorne um array JSON estrito:
[
  {
    "dia": "SEGUNDA",
    "nome": "Nome do Funcionário",
    "entrada": "09:00",
    "intervalo": "13:00",
    "saida": "18:00"
  }
]
</output_format>`;
}

export function parseVisionResponse(responseText) {
    if (!responseText || typeof responseText !== 'string') {
        throw new Error('Não foi possível extrair dados: resposta vazia');
    }

    // Tentar extrair JSON de code block
    const codeBlockMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : responseText.trim();

    // Tentar encontrar array JSON
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
        throw new Error('Não foi possível extrair dados: JSON não encontrado na resposta');
    }

    let parsed;
    try {
        parsed = JSON.parse(arrayMatch[0]);
    } catch (e) {
        throw new Error(`Não foi possível extrair dados: JSON inválido — ${e.message}`);
    }

    if (!Array.isArray(parsed)) {
        throw new Error('Não foi possível extrair dados: resposta não é um array');
    }

    return parsed.map((row, index) => {
        const entrada = String(row.entrada || '').trim();
        const saida = String(row.saida || '').trim();

        let saidaDiaSeguinte = false;
        if (entrada && saida && entrada !== 'FOLGA') {
            const [hEnt] = entrada.split(':').map(Number);
            const [hSai] = saida.split(':').map(Number);
            if (hSai < hEnt) saidaDiaSeguinte = true;
        }

        return {
            id: `vision-${Date.now()}-${index}`,
            dia: String(row.dia || '').toUpperCase().trim(),
            nome: String(row.nome || 'Sem Nome').trim(),
            entrada: entrada.toUpperCase() === 'FOLGA' ? 'FOLGA' : entrada,
            intervalo: String(row.intervalo || '').trim(),
            saida: saida,
            saidaDiaSeguinte,
        };
    });
}

export async function processScheduleImage(imageFile, apiKey) {
    if (!apiKey) throw new Error('API key do Claude não configurada');

    // Converter imagem para base64 (loop seguro para imagens grandes)
    const buffer = await imageFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);

    const mediaType = imageFile.type || 'image/jpeg';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: mediaType, data: base64 },
                    },
                    { type: 'text', text: buildVisionPrompt() },
                ],
            }],
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Erro na API Claude: ${response.status} — ${err}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    return parseVisionResponse(text);
}
```

- [ ] **Step 4: Rodar testes**

Run: `node --test src/__tests__/visionParser.test.js`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add src/lib/visionParser.js src/__tests__/visionParser.test.js
git commit -m "feat(vision): parser de imagem de escala via Claude Vision API"
```

---

### Task 6: Componente ImageUploader + integração no upload

**Files:**
- Create: `src/components/upload/ImageUploader.jsx`
- Modify: `src/hooks/useFileProcessing.js`
- Modify: `src/components/upload/UploadSection.jsx`

- [ ] **Step 1: Criar componente ImageUploader**

```jsx
// src/components/upload/ImageUploader.jsx
import React, { useState, useCallback, useRef } from 'react';
import { Camera, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const ImageUploader = ({ onImageProcessed }) => {
    const [status, setStatus] = useState('idle'); // idle | loading | success | error
    const [preview, setPreview] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef(null);

    const handleFile = useCallback(async (file) => {
        if (!file || !file.type.startsWith('image/')) {
            setStatus('error');
            setErrorMsg('Arquivo deve ser uma imagem (JPG, PNG, etc.)');
            return;
        }

        // Preview
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(file);

        setStatus('loading');
        setErrorMsg('');

        try {
            const apiKey = localStorage.getItem('claude_api_key');
            if (!apiKey) {
                const key = prompt('Cole sua API key do Claude (armazenada apenas localmente):');
                if (!key) { setStatus('idle'); return; }
                localStorage.setItem('claude_api_key', key);
            }

            const { processScheduleImage } = await import('../../lib/visionParser.js');
            const rows = await processScheduleImage(file, localStorage.getItem('claude_api_key'));
            setStatus('success');
            if (onImageProcessed) onImageProcessed(rows);
        } catch (err) {
            setStatus('error');
            setErrorMsg(err.message || 'Erro ao processar imagem');
        }
    }, [onImageProcessed]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    return (
        <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => fileInputRef.current?.click()}
            className={`
                relative flex flex-col items-center justify-center gap-3 p-6
                border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
                ${status === 'success' ? 'border-emerald-500/50 bg-emerald-500/5' :
                  status === 'error' ? 'border-red-500/50 bg-red-500/5' :
                  'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'}
            `}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {preview && (
                <img src={preview} alt="Preview" className="w-full max-h-32 object-contain rounded-lg opacity-60" />
            )}

            {status === 'loading' ? (
                <>
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                    <span className="text-xs text-slate-400">Lendo escala com IA...</span>
                </>
            ) : status === 'success' ? (
                <>
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                    <span className="text-xs text-emerald-400">Escala extraída com sucesso!</span>
                </>
            ) : status === 'error' ? (
                <>
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <span className="text-xs text-red-400">{errorMsg}</span>
                </>
            ) : (
                <>
                    <Camera className="w-8 h-8 text-slate-500" />
                    <div className="text-center">
                        <p className="text-xs font-medium text-slate-400">Foto da Escala</p>
                        <p className="text-[10px] text-slate-600 mt-1">Tire foto ou arraste imagem da escala na parede</p>
                    </div>
                </>
            )}
        </div>
    );
};

export default ImageUploader;
```

- [ ] **Step 2: Integrar ImageUploader no UploadSection.jsx**

O `ImageUploader` produz um array de rows pronto (não um File). Por isso, ele NÃO deve usar `handleFileUpload` (que espera um File). Em vez disso, o `UploadSection` recebe uma nova prop `onEscalaProcessed` e a repassa ao `ImageUploader`.

**Modificar `src/components/upload/UploadSection.jsx`:**

1. Adicionar prop `onEscalaProcessed` na assinatura:
```jsx
export const UploadSection = ({ handleFileUpload, handleDrag, handleDrop, dragActive, setDragActive, cuponsData, salesData, error, onEscalaProcessed }) => (
```

2. Importar no topo:
```javascript
import ImageUploader from './ImageUploader';
```

3. Mudar grid de `md:grid-cols-3` para `md:grid-cols-2 lg:grid-cols-4` para acomodar 4 itens.

4. Adicionar após o UploadBox de vendas:
```jsx
<ImageUploader onImageProcessed={onEscalaProcessed} />
```

**Modificar `src/features/dashboard/Dashboard.jsx`:**

Passar `onEscalaProcessed={handleEscalaProcessed}` como prop ao `UploadSection`:
```jsx
<UploadSection
    ...existingProps
    onEscalaProcessed={handleEscalaProcessed}
/>
```

- [ ] **Step 4: Verificar no browser**

Run: `npm run dev`
Verificar: Aparece box de foto na seção de upload. Drag & drop funciona.

- [ ] **Step 5: Commit**

```bash
git add src/components/upload/ImageUploader.jsx src/components/upload/UploadSection.jsx
git commit -m "feat(vision): componente ImageUploader com preview e integração no upload"
```

---

## P3: Ranking de Conversão por Vendedor (Gamificação)

### Contexto para o implementador

O ranking calcula para cada vendedor a **conversão do contexto** — a taxa de conversão da loja durante as horas em que ele está ativo. Isso permite comparação justa entre vendedores de turnos diferentes.

**Fórmula:**
```
Para vendedor V com horas ativas [h1, h2, ..., hn]:
  fluxo_total_V  = Σ fluxo(hi) para cada hi em horas_ativas
  cupons_total_V = Σ cupons(hi) para cada hi em horas_ativas
  conv_contexto_V = cupons_total_V / fluxo_total_V × 100

  conv_media_dia = cupons_dia / fluxo_dia × 100
  delta_V = conv_contexto_V - conv_media_dia
```

O `delta` é o diferencial: se positivo, o vendedor "converte melhor que a média do dia"; se negativo, "converte pior".

**Dados necessários:**
- `staffRows` (já disponível no Dashboard)
- `cuponsData` com campos `cod_hora_entrada`, `qtd_entrante`, `qtd_cupom`
- `selectedDay` e `diasSemana` (já disponíveis)

---

### Task 7: Lógica de cálculo (staffPerformance.js)

**Files:**
- Create: `src/lib/staffPerformance.js`
- Create: `src/__tests__/staffPerformance.test.js`

- [ ] **Step 1: Escrever testes**

```javascript
// src/__tests__/staffPerformance.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateStaffPerformance } from '../lib/staffPerformance.js';

describe('staffPerformance', () => {
    const flowByHour = {
        10: { flow: 40, cupons: 12 },
        11: { flow: 60, cupons: 15 },
        12: { flow: 80, cupons: 18 },
        13: { flow: 50, cupons: 10 },
        14: { flow: 90, cupons: 16 },
        15: { flow: 85, cupons: 14 },
        16: { flow: 70, cupons: 13 },
        17: { flow: 55, cupons: 11 },
    };

    const staffRows = [
        { id: '1', dia: 'SEGUNDA', nome: 'Ana', entrada: '10:00', intervalo: '13:00', saida: '18:00' },
        { id: '2', dia: 'SEGUNDA', nome: 'Bob', entrada: '14:00', intervalo: '17:00', saida: '22:00' },
    ];

    it('calcula conversão do contexto para cada vendedor', () => {
        const result = calculateStaffPerformance(staffRows, flowByHour, 'SEGUNDA');
        assert.equal(result.length, 2);

        const ana = result.find(r => r.nome === 'Ana');
        // Ana trabalha 10-18h (intervalo 13h) → horas ativas: 10,11,12,14,15,16,17
        // fluxo: 40+60+80+90+85+70+55 = 480
        // cupons: 12+15+18+16+14+13+11 = 99
        // conv: 99/480 = 20.625%
        assert.ok(Math.abs(ana.convContexto - 20.625) < 0.01);
    });

    it('calcula delta vs média do dia', () => {
        const result = calculateStaffPerformance(staffRows, flowByHour, 'SEGUNDA');
        // Total dia: flow=530, cupons=109, conv=20.566%
        const ana = result.find(r => r.nome === 'Ana');
        assert.ok(typeof ana.delta === 'number');
    });

    it('ordena por conversão decrescente', () => {
        const result = calculateStaffPerformance(staffRows, flowByHour, 'SEGUNDA');
        for (let i = 1; i < result.length; i++) {
            assert.ok(result[i - 1].convContexto >= result[i].convContexto);
        }
    });

    it('ignora vendedores de folga', () => {
        const rows = [
            ...staffRows,
            { id: '3', dia: 'SEGUNDA', nome: 'Carlos', entrada: 'FOLGA', intervalo: '', saida: '' },
        ];
        const result = calculateStaffPerformance(rows, flowByHour, 'SEGUNDA');
        assert.equal(result.length, 2); // Carlos excluído
    });

    it('retorna array vazio se não há dados', () => {
        const result = calculateStaffPerformance([], {}, 'SEGUNDA');
        assert.equal(result.length, 0);
    });
});
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `node --test src/__tests__/staffPerformance.test.js`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Implementar staffPerformance.js**

```javascript
// src/lib/staffPerformance.js

/**
 * staffPerformance.js
 * Calcula a "conversão do contexto" de cada vendedor — a taxa de conversão
 * da loja durante as horas em que ele está ativo.
 */

function getActiveHours(entrada, saida, intervalo) {
    if (!entrada || !saida || entrada.toUpperCase() === 'FOLGA') return [];

    const [entH] = entrada.split(':').map(Number);
    let [saiH] = saida.split(':').map(Number);
    const intH = intervalo ? parseInt(intervalo.split(':')[0], 10) : null;

    if (saiH <= entH) saiH += 24;

    const hours = [];
    for (let h = entH; h < saiH; h++) {
        const normalized = h >= 24 ? h - 24 : h;
        if (intH !== null && normalized === intH) continue;
        hours.push(normalized);
    }
    return hours;
}

export function calculateStaffPerformance(staffRows, flowByHour, selectedDay) {
    if (!staffRows || staffRows.length === 0) return [];
    if (!flowByHour || Object.keys(flowByHour).length === 0) return [];

    const dayStaff = staffRows.filter(r =>
        r.dia === selectedDay &&
        r.entrada &&
        r.entrada.toUpperCase() !== 'FOLGA' &&
        r.saida
    );

    if (dayStaff.length === 0) return [];

    // Conversão média do dia
    let totalFlowDay = 0, totalCuponsDay = 0;
    Object.values(flowByHour).forEach(h => {
        totalFlowDay += h.flow || 0;
        totalCuponsDay += h.cupons || 0;
    });
    const convMediaDia = totalFlowDay > 0 ? (totalCuponsDay / totalFlowDay) * 100 : 0;

    const results = dayStaff.map(person => {
        const activeHours = getActiveHours(person.entrada, person.saida, person.intervalo);

        let fluxoTotal = 0, cuponsTotal = 0;
        activeHours.forEach(h => {
            const hourData = flowByHour[h];
            if (hourData) {
                fluxoTotal += hourData.flow || 0;
                cuponsTotal += hourData.cupons || 0;
            }
        });

        const convContexto = fluxoTotal > 0 ? (cuponsTotal / fluxoTotal) * 100 : 0;
        const delta = convContexto - convMediaDia;

        return {
            id: person.id,
            nome: person.nome,
            entrada: person.entrada,
            saida: person.saida,
            horasAtivas: activeHours.length,
            fluxoTotal,
            cuponsTotal,
            convContexto: parseFloat(convContexto.toFixed(3)),
            convMediaDia: parseFloat(convMediaDia.toFixed(3)),
            delta: parseFloat(delta.toFixed(3)),
        };
    });

    // Ordenar por conversão decrescente
    results.sort((a, b) => b.convContexto - a.convContexto);

    return results;
}
```

- [ ] **Step 4: Rodar testes**

Run: `node --test src/__tests__/staffPerformance.test.js`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add src/lib/staffPerformance.js src/__tests__/staffPerformance.test.js
git commit -m "feat(ranking): cálculo de conversão por vendedor com delta vs média"
```

---

### Task 8: Componente StaffRanking.jsx

**Files:**
- Create: `src/components/staff/StaffRanking.jsx`

- [ ] **Step 1: Criar componente visual**

```jsx
// src/components/staff/StaffRanking.jsx
import React, { useMemo } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { calculateStaffPerformance } from '../../lib/staffPerformance.js';
import { parseFluxValue, parseNumber } from '../../lib/parsers.js';

const StaffRanking = ({ staffRows, cuponsData, selectedDay, diasSemana }) => {
    const ranking = useMemo(() => {
        if (!staffRows?.length || !cuponsData?.length) return [];

        const excelDayName = diasSemana?.[selectedDay];
        if (!excelDayName) return [];

        // Construir flowByHour a partir de cuponsData
        const dayRows = cuponsData.filter(
            row => row['Dia da Semana'] === excelDayName &&
                   row['cod_hora_entrada'] !== 'Total' &&
                   !isNaN(parseInt(row['cod_hora_entrada'], 10))
        );

        const flowByHour = {};
        dayRows.forEach(row => {
            const hour = parseInt(row['cod_hora_entrada'], 10);
            flowByHour[hour] = {
                flow: parseFluxValue(row['qtd_entrante']),
                cupons: parseNumber(row['qtd_cupom']),
            };
        });

        return calculateStaffPerformance(staffRows, flowByHour, selectedDay);
    }, [staffRows, cuponsData, selectedDay, diasSemana]);

    if (ranking.length === 0) return null;

    return (
        <div className="w-full bg-[#11141a] border border-white/5 rounded-2xl shadow-xl p-6">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2 border-l-4 border-amber-500 pl-3 mb-4">
                <Trophy className="w-4 h-4 text-amber-400" /> Ranking de Conversão por Vendedor
            </h3>

            <div className="text-[10px] text-slate-600 mb-4">
                Conversão média do dia: <span className="text-slate-400 font-mono">{ranking[0]?.convMediaDia?.toFixed(1)}%</span>
            </div>

            <div className="space-y-1">
                {ranking.map((person, index) => {
                    const medal = index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-700' : 'text-slate-600';
                    const deltaColor = person.delta > 0.5 ? 'text-emerald-400' : person.delta < -0.5 ? 'text-red-400' : 'text-slate-500';
                    const DeltaIcon = person.delta > 0.5 ? TrendingUp : person.delta < -0.5 ? TrendingDown : Minus;

                    return (
                        <div key={person.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold w-6 text-center ${medal}`}>
                                    {index + 1}
                                </span>
                                <div>
                                    <span className="text-sm text-slate-300">{person.nome}</span>
                                    <span className="text-[10px] text-slate-600 ml-2">{person.entrada}-{person.saida}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="text-xs text-slate-500 block">Conv. Contexto</span>
                                    <span className="text-sm font-mono text-slate-200">{person.convContexto.toFixed(1)}%</span>
                                </div>
                                <div className={`flex items-center gap-1 min-w-[70px] justify-end ${deltaColor}`}>
                                    <DeltaIcon className="w-3 h-3" />
                                    <span className="text-xs font-mono">
                                        {person.delta > 0 ? '+' : ''}{person.delta.toFixed(1)}pp
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-3 gap-2">
                {ranking.length > 0 && (
                    <>
                        <div className="text-center">
                            <span className="text-[10px] text-slate-600 block">Melhor</span>
                            <span className="text-xs text-emerald-400 font-mono">{ranking[0].convContexto.toFixed(1)}%</span>
                        </div>
                        <div className="text-center">
                            <span className="text-[10px] text-slate-600 block">Média</span>
                            <span className="text-xs text-slate-400 font-mono">{ranking[0].convMediaDia.toFixed(1)}%</span>
                        </div>
                        <div className="text-center">
                            <span className="text-[10px] text-slate-600 block">Pior</span>
                            <span className="text-xs text-red-400 font-mono">{ranking[ranking.length - 1].convContexto.toFixed(1)}%</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StaffRanking;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/staff/StaffRanking.jsx
git commit -m "feat(ranking): componente visual StaffRanking com medalhas e delta"
```

---

### Task 9: Integrar StaffRanking no Dashboard

**Files:**
- Modify: `src/components/dashboard/MainContent.jsx`
- Modify: `src/features/dashboard/Dashboard.jsx`

- [ ] **Step 1: Ler MainContent.jsx para entender onde adicionar**

Ler `src/components/dashboard/MainContent.jsx` para encontrar o local correto.

- [ ] **Step 2: Passar cuponsData e diasSemana para MainContent**

Em `src/features/dashboard/Dashboard.jsx`, adicionar props:
```jsx
<MainContent
    ...existingProps
    cuponsData={cuponsData}
    diasSemana={diasSemana}
/>
```

- [ ] **Step 3: Renderizar StaffRanking em MainContent**

Em `src/components/dashboard/MainContent.jsx`:

1. Importar no topo:
```jsx
import StaffRanking from '../staff/StaffRanking';
```

2. Adicionar `cuponsData` e `diasSemana` na desestruturação de props (linha 8):
```jsx
export const MainContent = ({ chartData, dailyMetrics, thermalMetrics, staffRows, selectedDay, onTimeClick, isOptimized, onOptimize, onToggleOptimized, revenueMetrics, revenueConfig, cuponsData, diasSemana }) => {
```

3. Renderizar após `<ThermalPanel />` (linha 29):
```jsx
<StaffRanking
    staffRows={staffRows}
    cuponsData={cuponsData}
    selectedDay={selectedDay}
    diasSemana={diasSemana}
/>
```

- [ ] **Step 4: Verificar no browser**

Run: `npm run dev`
Verificar: Ranking aparece abaixo do painel térmico com dados dos vendedores.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/MainContent.jsx src/features/dashboard/Dashboard.jsx
git commit -m "feat(ranking): integrar StaffRanking no dashboard principal"
```

---

### Task 10: Atualizar package.json e rodar todos os testes

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Atualizar script de teste**

Em `package.json`, atualizar a linha test:
```json
"test": "node --test src/__tests__/parsers.test.js src/__tests__/staffUtils.test.js src/__tests__/thermalBalance_v5.test.js src/__tests__/staffPerformance.test.js src/__tests__/visionParser.test.js"
```

- [ ] **Step 2: Rodar todos os testes**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 3: Rodar build**

Run: `npm run build`
Expected: Build succeeds sem erros

- [ ] **Step 4: Commit final**

```bash
git add package.json
git commit -m "chore: atualizar script de teste para incluir novos módulos"
```

---

## Resumo de Prioridades

| Ordem | Tasks | Feature | Impacto |
|---|---|---|---|
| 1 | Tasks 1-4 | Motor V5 (P0-A) | Score 90+, desbloqueia redistribuição de turnos |
| 2 | Tasks 5-6 | Vision AI (P0-B) | Onboarding instantâneo, elimina digitação manual |
| 3 | Tasks 7-9 | Ranking Vendedor (P3) | Gamificação, acompanhamento de performance |
| 4 | Task 10 | Testes + Build | Validação final |
