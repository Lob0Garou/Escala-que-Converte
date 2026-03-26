# Plano Corretivo: Motor V5 + Staff Ranking

> **Para agentes:** Use superpowers:executing-plans para implementar task-by-task.

**Goal:** Corrigir 3 módulos que não foram entregues conforme especificação — Motor V5 (horários de loja, Fase C, µ dinâmico), staffPerformance.js (modelo de dados errado), StaffRanking.jsx (props e tema errados).

**Arquitetura:** Correções cirúrgicas nos 3 módulos, mantendo interfaces públicas compatíveis. staffPerformance recebe dados reais do projeto (staffRows + cuponsData), não modelo inventado.

**Tech Stack:** React 19, Vite 7, Node.js Test Runner, Tailwind CSS 3

---

## Diagnóstico

### Bug 1: Motor V5 (`thermalBalance_v5.js`)
- `suggestShifts` hardcoda `6h-22h` em vez de derivar horários de loja do flowData
- `coordinateDescentV5` usa covertura hourly (não 15min real), µ calculado 1x (não por round)
- Fase C (`buildWeightedFlowVector`) existe mas NUNCA é chamada em `optimizeScheduleRows`
- `suggestShifts` avalia cada funcionário independentemente → cria gaps de cobertura

### Bug 2: staffPerformance.js
- Modelo de dados completamente errado: espera `{sellers, sales}` com `seller_id/date/amount`
- Projeto usa `staffRows` com `{id, dia, nome, entrada, intervalo, saida}` e `cuponsData` com `{cod_hora_entrada, qtd_entrante, qtd_cupom, 'Dia da Semana'}`
- Calcula "total de vendas" em vez de "conversão = cupons/fluxo × 100 nas horas ativas"

### Bug 3: StaffRanking.jsx + MainContent
- Props: espera `{sellers, sales, selectedDate}`, recebe `{staffRows, cuponsData, selectedDay, diasSemana}`
- Tema claro (`bg-white`) em vez de tema escuro do projeto (`bg-[#11141a]`)

---

## Task 1: Corrigir Motor V5 — Store Hours Dinâmicos + Fase C + µ Dinâmico

**Files:**
- Modify: `src/lib/thermalBalance_v5.js`
- Modify: `src/__tests__/thermalBalance_v5.test.js`

### Correções necessárias:

#### 1a. `suggestShifts` — derivar limites da loja do flowData
- [ ] Remover hardcode `if (newEntH < 6 || newOutH > 22)`
- [ ] Derivar `minStoreHour` e `maxStoreHour` do array `hourlyFlowData` (primeiro e último hour com flow > 0)
- [ ] Usar esses limites dinâmicos na validação

```javascript
// ANTES (linha 123):
if (newEntH < 6 || newOutH > 22) continue;

// DEPOIS:
const storeHours = getStoreHours(hourlyFlowData);
// ... no loop:
if (newEntH < storeHours.min || newOutH > storeHours.max) continue;
```

#### 1b. `coordinateDescentV5` — recalcular µ a cada round
- [ ] Mover cálculo de µ para dentro do loop de rounds
- [ ] Após cada round que tem melhoria, recalcular `hourCov` e `mu`

```javascript
// ANTES (linha 281, fora do loop):
const mu = totalCov > 0 ? totalFlow / totalCov : 0;

// DEPOIS (dentro do loop, após anyImprovement):
// Recalcular mu baseado em hourCov atualizado
```

#### 1c. Ativar Fase C — opportunity weighting
- [ ] Em `optimizeScheduleRows`, após Fase A, calcular weightVector baseado em conversão por hora
- [ ] Chamar `buildWeightedFlowVector` para gerar flowVector ponderado
- [ ] Passar o flowVector ponderado para `coordinateDescentV5`

```javascript
// Em optimizeScheduleRows, após suggestShifts:
let weightVector = null;
if (configInput.conversionByHour) {
    weightVector = {};
    const avgConv = ...; // média de conversão
    configInput.conversionByHour.forEach(({hour, conversion}) => {
        weightVector[hour] = conversion / avgConv; // horas com alta conversão pesam mais
    });
}
const flowVector = weightVector
    ? buildWeightedFlowVector(thermalRowsByHour, weightVector)
    : buildHourlyFlow(thermalRowsByHour);
```

#### 1d. Teste de score com store hours dinâmicos
- [ ] Adicionar teste que verifica que loja 10h-21h não gera shifts fora desse range
- [ ] Adicionar teste que verifica que µ melhora a cada round

---

## Task 2: Reescrever staffPerformance.js com Modelo de Dados Correto

**Files:**
- Rewrite: `src/lib/staffPerformance.js`
- Rewrite: `src/__tests__/staffPerformance.test.js`

### Interface correta:

```javascript
/**
 * @param {Array} staffRows - [{id, dia, nome, entrada, intervalo, saida}]
 * @param {Array} cuponsData - [{cod_hora_entrada, qtd_entrante, qtd_cupom, 'Dia da Semana'}]
 * @param {string} selectedDay - "SEGUNDA", "TERÇA", etc.
 * @param {Object} diasSemana - {SEGUNDA: '1. Seg', ...}
 * @returns {Array<{id, name, conversion, delta, hoursWorked, totalFlow, totalCupons}>}
 */
export function calculateStaffPerformance(staffRows, cuponsData, selectedDay, diasSemana)
```

### Lógica correta:
1. Filtrar staffRows do dia selecionado (excluir FOLGA)
2. Para cada vendedor, extrair horas ativas (entrada até saída, excluindo intervalo)
3. Para cada hora ativa, somar `qtd_entrante` (fluxo) e `qtd_cupom` (cupons) do cuponsData filtrado pelo dia
4. Calcular conversão: `(totalCupons / totalFluxo) × 100`
5. Calcular média do dia e delta por vendedor
6. Ordenar por conversão decrescente

### Mapeamento de dados:
- `staffRows[].entrada` → hora de entrada (string "HH:MM")
- `staffRows[].saida` → hora de saída (string "HH:MM")
- `staffRows[].intervalo` → hora do intervalo (string "HH:MM", duração 1h)
- `cuponsData[].cod_hora_entrada` → hora (number)
- `cuponsData[].'Dia da Semana'` → dia no formato Excel ("1. Seg", "2. Ter", etc.)
- `cuponsData[].qtd_entrante` → fluxo de pessoas
- `cuponsData[].qtd_cupom` → cupons emitidos (pode não existir, usar chave alternativa)

---

## Task 3: Reescrever StaffRanking.jsx + Corrigir MainContent Props

**Files:**
- Rewrite: `src/components/staff/StaffRanking.jsx`
- Modify: `src/components/dashboard/MainContent.jsx`

### Props corretas (vindo de MainContent/Dashboard):
```jsx
<StaffRanking
  staffRows={staffRows}
  cuponsData={cuponsData}
  selectedDay={selectedDay}
  diasSemana={diasSemana}
/>
```

### Tema escuro (padrão do projeto):
- Container: `bg-[#11141a]/60 backdrop-blur-2xl border border-white/5 rounded-2xl`
- Texto principal: `text-slate-200`
- Texto secundário: `text-slate-400`
- Cards de stats: `bg-white/5 border border-white/10`
- Hover: `hover:bg-white/5`

### StaffRanking deve:
1. Importar e chamar `calculateStaffPerformance(staffRows, cuponsData, selectedDay, diasSemana)`
2. Mostrar ranking com medalhas (1º ouro, 2º prata, 3º bronze)
3. Mostrar melhor/média/pior em cards
4. Delta com ícones (TrendingUp verde, TrendingDown vermelho, Minus cinza)
5. Conversão formatada como percentual (XX.X%)

---
