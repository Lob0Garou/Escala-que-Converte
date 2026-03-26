# Persistência de Escala com Auto-save e Validação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir `staffRows` automaticamente no Supabase após upload/edição, e registrar um carimbo `validated_at` + snapshot imutável `validated_shifts` ao clicar em "Validar Escala".

**Architecture:** Auto-save via `useEffect` com debounce de 1.5s em `Dashboard.jsx` (mesmo padrão de `cuponsData`/`salesData`). "Validar" chama nova função `validateScheduleWeek` que salva shifts e grava `validated_at`/`validated_shifts` via RPC. O timestamp de validação desce via props até `ChartPanel` onde o botão reside.

**Tech Stack:** React 19, Supabase (PostgreSQL + RPC SECURITY DEFINER), Vite

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/007_validated_schedule.sql` | Criar | Colunas + RPC `validate_schedule_week` |
| `src/hooks/useSupabaseSync.js` | Modificar | Adicionar `validateScheduleWeek`, atualizar `loadWeekSnapshot` |
| `src/features/dashboard/Dashboard.jsx` | Modificar | Estado `validatedAt`, auto-save useEffect, atualizar `handleValidateSchedule` |
| `src/components/dashboard/MainContent.jsx` | Modificar | Passar `validatedAt` para `ChartPanel` |
| `src/components/chart/ChartPanel.jsx` | Modificar | Receber `validatedAt` e exibir timestamp |

---

## Task 1: Migration Supabase — colunas + RPC

**Files:**
- Create: `supabase/migrations/007_validated_schedule.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- ============================================================
-- 007_validated_schedule.sql
-- Adiciona validated_at e validated_shifts à schedule_weeks.
-- Cria RPC validate_schedule_week (SECURITY DEFINER).
-- ============================================================

ALTER TABLE public.schedule_weeks
  ADD COLUMN IF NOT EXISTS validated_at     TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS validated_shifts JSONB       DEFAULT NULL;

-- ============================================================
-- RPC: validate_schedule_week
-- Grava o carimbo de validação e o snapshot imutável dos shifts.
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_schedule_week(
  p_schedule_week_id UUID,
  p_store_id         UUID,
  p_validated_shifts JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado.';
  END IF;

  IF NOT public.user_can_write_store(p_store_id) THEN
    RAISE EXCEPTION 'Acesso negado à loja.';
  END IF;

  UPDATE public.schedule_weeks
  SET
    validated_at     = NOW(),
    validated_shifts = p_validated_shifts
  WHERE id       = p_schedule_week_id
    AND store_id = p_store_id;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_schedule_week FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_schedule_week TO authenticated;
```

- [ ] **Step 2: Aplicar migration no Supabase**

Acesse o SQL Editor do Supabase Dashboard (supabase.com → seu projeto → SQL Editor) e execute o conteúdo do arquivo acima.

Verificação — rode no SQL Editor:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'schedule_weeks'
  AND column_name IN ('validated_at', 'validated_shifts');
```
Esperado: 2 linhas retornadas.

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'validate_schedule_week';
```
Esperado: 1 linha retornada.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_validated_schedule.sql
git commit -m "feat(db): migration 007 — validated_at, validated_shifts e RPC validate_schedule_week"
```

---

## Task 2: Atualizar `useSupabaseSync.js`

**Files:**
- Modify: `src/hooks/useSupabaseSync.js`

- [ ] **Step 1: Adicionar `validateScheduleWeek` ao final do arquivo**

Adicionar antes do último `export` (ou no final do arquivo):

```js
/**
 * validateScheduleWeek — Carimbam a semana como validada.
 * Salva os shifts como draft e registra validated_at + validated_shifts.
 */
export const validateScheduleWeek = async (scheduleWeekId, storeId, staffRows) => {
  if (!supabase || !scheduleWeekId || !storeId) {
    console.warn('[sync] validateScheduleWeek ignorado: sem weekId/storeId');
    return;
  }
  if (!FLAGS.PERSIST_TO_SUPABASE) { console.warn('[sync] PERSIST_TO_SUPABASE=false'); return; }

  // Garante que o draft está atualizado antes de carimbar
  await saveShiftsBatch(scheduleWeekId, storeId, staffRows);

  const validRows  = staffRows.filter((r) => r.dia);
  const shiftsJson = validRows.map(staffRowToDbJson);

  console.log('[sync] validateScheduleWeek →', shiftsJson.length, 'shifts');

  const { error } = await supabase.rpc('validate_schedule_week', {
    p_schedule_week_id: scheduleWeekId,
    p_store_id:         storeId,
    p_validated_shifts: shiftsJson,
  });

  if (error) {
    console.error('[sync] validateScheduleWeek ERRO:', error.message);
  } else {
    console.log('[sync] ✅ validateScheduleWeek OK');
  }
};
```

- [ ] **Step 2: Atualizar `loadWeekSnapshot` para retornar `validated_at`**

Localizar a função `loadWeekSnapshot` e substituir:

```js
// ANTES — linha com .select(...)
.select('cupons_snapshot, sales_snapshot')

// DEPOIS
.select('cupons_snapshot, sales_snapshot, validated_at')
```

E atualizar os blocos de erro e retorno:

```js
// ANTES — erro
if (error) {
  console.error('[sync] loadWeekSnapshot ERRO:', error.message);
  return { cuponsData: [], salesData: [] };
}

const cuponsData = data?.cupons_snapshot || [];
const salesData  = data?.sales_snapshot  || [];
console.log('[sync] loadWeekSnapshot → cupons:', cuponsData.length, '| sales:', salesData.length);
return { cuponsData, salesData };

// DEPOIS — erro
if (error) {
  console.error('[sync] loadWeekSnapshot ERRO:', error.message);
  return { cuponsData: [], salesData: [], validatedAt: null };
}

const cuponsData  = data?.cupons_snapshot || [];
const salesData   = data?.sales_snapshot  || [];
const validatedAt = data?.validated_at    || null;
console.log('[sync] loadWeekSnapshot → cupons:', cuponsData.length, '| sales:', salesData.length, '| validated:', validatedAt);
return { cuponsData, salesData, validatedAt };
```

E o retorno antecipado quando sem `scheduleWeekId`:

```js
// ANTES
if (!supabase || !scheduleWeekId) return { cuponsData: [], salesData: [] };

// DEPOIS
if (!supabase || !scheduleWeekId) return { cuponsData: [], salesData: [], validatedAt: null };
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```
Esperado: `✓ built in ...s` sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useSupabaseSync.js
git commit -m "feat(sync): validateScheduleWeek + validatedAt em loadWeekSnapshot"
```

---

## Task 3: Atualizar `Dashboard.jsx`

**Files:**
- Modify: `src/features/dashboard/Dashboard.jsx`

- [ ] **Step 1: Adicionar `validateScheduleWeek` ao import de `useSupabaseSync`**

Localizar o bloco de import (linha ~21) e adicionar `validateScheduleWeek`:

```js
import {
  getOrCreateScheduleWeek,
  loadShifts,
  loadWeekSnapshot,
  saveShiftsBatch,
  updateWeekSnapshot,
  validateScheduleWeek,
} from '../../hooks/useSupabaseSync';
```

- [ ] **Step 2: Adicionar estado `validatedAt` junto aos outros estados**

Logo após `const [syncLoading, setSyncLoading] = useState(false);` (linha ~48), adicionar:

```js
const [validatedAt, setValidatedAt] = useState(null);
```

- [ ] **Step 3: Adicionar `autoSaveTimerRef` junto aos outros refs**

Logo após `const isLoadingFromDbRef = useRef(false);` (linha ~46), adicionar:

```js
const autoSaveTimerRef = useRef(null);
```

- [ ] **Step 4: Capturar `validatedAt` no `useEffect` de carregamento do DB**

Localizar dentro do `useEffect` de `activeStore?.id` o bloco de `loadWeekSnapshot` (em torno da linha 176):

```js
// ANTES
const { cuponsData: loadedCupons, salesData: loadedSales } =
  await loadWeekSnapshot(week.id);
if (loadedCupons.length > 0) setCuponsData(loadedCupons);
if (loadedSales.length > 0)  setSalesData(loadedSales);

// DEPOIS
const { cuponsData: loadedCupons, salesData: loadedSales, validatedAt: loadedValidatedAt } =
  await loadWeekSnapshot(week.id);
if (loadedCupons.length > 0)  setCuponsData(loadedCupons);
if (loadedSales.length > 0)   setSalesData(loadedSales);
if (loadedValidatedAt)        setValidatedAt(loadedValidatedAt);
```

- [ ] **Step 5: Adicionar `useEffect` de auto-save para `staffRows`**

Adicionar após o `useEffect` de salesData (linha ~228), antes do comentário `// diasSemana e staffData já foram declarados`:

```js
// ─── Auto-save staffRows quando mudam (debounce 1.5s) ────────────────────
useEffect(() => {
  if (!FLAGS.PERSIST_TO_SUPABASE || !activeWeekId || !activeStore?.id) return;
  if (isLoadingFromDbRef.current) return;
  if (!staffRows?.length) return;

  clearTimeout(autoSaveTimerRef.current);
  autoSaveTimerRef.current = setTimeout(() => {
    saveShiftsBatch(activeWeekId, activeStore.id, staffRows);
  }, 1500);

  return () => clearTimeout(autoSaveTimerRef.current);
}, [staffRows, activeWeekId, activeStore?.id]);
```

- [ ] **Step 6: Substituir `handleValidateSchedule`**

Localizar a função `handleValidateSchedule` (linha ~199) e substituir inteiramente:

```js
const handleValidateSchedule = async () => {
  if (!FLAGS.PERSIST_TO_SUPABASE || !activeWeekId || !activeStore?.id) return;
  if (staffRows.length === 0) return;

  setIsValidating(true);
  try {
    await validateScheduleWeek(activeWeekId, activeStore.id, staffRows);
    setValidatedAt(new Date().toISOString());
  } finally {
    setTimeout(() => setIsValidating(false), 500);
  }
};
```

- [ ] **Step 7: Passar `validatedAt` para `MainContent`**

Localizar o componente `<MainContent ...>` no JSX (linha ~326) e adicionar a prop:

```jsx
<MainContent
  chartData={chartData}
  dailyMetrics={dailyMetrics}
  thermalMetrics={thermalMetrics}
  staffRows={staffRows}
  selectedDay={selectedDay}
  onTimeClick={openTimePicker}
  isOptimized={isOptimized}
  onOptimize={optimizeSchedule}
  onToggleOptimized={toggleOptimized}
  revenueMetrics={revenueMetrics}
  revenueConfig={revenueConfig}
  chartType={chartType}
  activeTab={activeTab}
  theme={theme}
  cuponsData={cuponsData}
  diasSemana={diasSemana}
  onValidate={handleValidateSchedule}
  isValidating={isValidating}
  validatedAt={validatedAt}
/>
```

- [ ] **Step 8: Verificar build**

```bash
npm run build
```
Esperado: `✓ built in ...s` sem erros.

- [ ] **Step 9: Commit**

```bash
git add src/features/dashboard/Dashboard.jsx
git commit -m "feat(dashboard): auto-save staffRows com debounce + validateScheduleWeek no Validar"
```

---

## Task 4: Atualizar `MainContent.jsx` e `ChartPanel.jsx`

**Files:**
- Modify: `src/components/dashboard/MainContent.jsx`
- Modify: `src/components/chart/ChartPanel.jsx`

- [ ] **Step 1: Adicionar `validatedAt` às props de `MainContent` e passar para `ChartPanel`**

Em `src/components/dashboard/MainContent.jsx`, substituir a linha de destructuring de props (linha 9):

```js
// ANTES
export const MainContent = ({ chartData, dailyMetrics, thermalMetrics, staffRows, selectedDay, onTimeClick, isOptimized, onOptimize, onToggleOptimized, revenueMetrics, revenueConfig, cuponsData, diasSemana, onValidate, isValidating }) => {

// DEPOIS
export const MainContent = ({ chartData, dailyMetrics, thermalMetrics, staffRows, selectedDay, onTimeClick, isOptimized, onOptimize, onToggleOptimized, revenueMetrics, revenueConfig, cuponsData, diasSemana, onValidate, isValidating, validatedAt }) => {
```

E passar `validatedAt` para `ChartPanel` (linha ~17):

```jsx
// ANTES
<ChartPanel
  chartData={chartData}
  dailyMetrics={dailyMetrics}
  isOptimized={isOptimized}
  onOptimize={onOptimize}
  onToggleOptimized={onToggleOptimized}
  onValidate={onValidate}
  isValidating={isValidating}
/>

// DEPOIS
<ChartPanel
  chartData={chartData}
  dailyMetrics={dailyMetrics}
  isOptimized={isOptimized}
  onOptimize={onOptimize}
  onToggleOptimized={onToggleOptimized}
  onValidate={onValidate}
  isValidating={isValidating}
  validatedAt={validatedAt}
/>
```

- [ ] **Step 2: Adicionar `validatedAt` e timestamp no `ChartPanel`**

Em `src/components/chart/ChartPanel.jsx`, atualizar o destructuring de props (linha 19):

```js
// ANTES
export const ChartPanel = ({ chartData, dailyMetrics, isOptimized, onOptimize, onToggleOptimized, onValidate, isValidating }) => {

// DEPOIS
export const ChartPanel = ({ chartData, dailyMetrics, isOptimized, onOptimize, onToggleOptimized, onValidate, isValidating, validatedAt }) => {
```

Localizar o bloco do botão "Validar Escala" (linha ~53) e adicionar o timestamp logo após o botão, dentro do mesmo `<div className="flex items-center gap-3">`:

```jsx
{onValidate && (
  <button
    onClick={onValidate}
    disabled={isValidating}
    className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-semibold uppercase tracking-wide shadow-sm bg-green-600 text-white hover:bg-green-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Save className={`w-3.5 h-3.5 ${isValidating ? 'animate-pulse' : ''}`} />
    {isValidating ? 'Validando...' : 'Validar Escala'}
  </button>
)}
{validatedAt && (
  <span className="text-xs text-text-secondary whitespace-nowrap">
    Validado {new Date(validatedAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })}
  </span>
)}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```
Esperado: `✓ built in ...s` sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/MainContent.jsx src/components/chart/ChartPanel.jsx
git commit -m "feat(ui): exibir timestamp de validação no ChartPanel"
```

---

## Task 5: Verificação manual (critérios de aceite)

- [ ] **Step 1: Iniciar o servidor de desenvolvimento**

```bash
npm run dev
```

- [ ] **Step 2: Testar persistência no upload**

1. Fazer upload dos 3 arquivos (cupons, escala, vendas)
2. Confirmar que o dashboard carrega normalmente
3. Aguardar ~2 segundos (debounce)
4. Pressionar F5
5. **Esperado**: dashboard carrega sem pedir upload novamente

- [ ] **Step 3: Testar auto-save em edição**

1. Editar um horário manualmente (ex: mudar entrada de 09:00 para 10:00)
2. Aguardar ~2 segundos
3. Pressionar F5
4. **Esperado**: o horário editado persiste após o reload

- [ ] **Step 4: Testar Validar**

1. Clicar em "Validar Escala"
2. **Esperado**: botão mostra "Validando..." por ~500ms
3. **Esperado**: aparece texto "Validado DD/MM às HH:MM" ao lado do botão
4. Pressionar F5
5. **Esperado**: o texto "Validado em..." continua visível com a data correta

- [ ] **Step 5: Verificar no Supabase**

No SQL Editor do Supabase:
```sql
SELECT id, validated_at, validated_shifts IS NOT NULL AS has_snapshot
FROM schedule_weeks
ORDER BY created_at DESC
LIMIT 1;
```
**Esperado**: `validated_at` preenchido, `has_snapshot = true`

- [ ] **Step 6: Testar modo local (sem Supabase)**

Adicionar temporariamente ao `.env`:
```
VITE_PERSIST_TO_SUPABASE=false
```
Reiniciar dev, fazer upload e editar horário.
**Esperado**: app funciona normalmente, sem erros no console.
Remover a linha do `.env` após o teste.

---

## Resumo de commits esperados

```
feat(db): migration 007 — validated_at, validated_shifts e RPC validate_schedule_week
feat(sync): validateScheduleWeek + validatedAt em loadWeekSnapshot
feat(dashboard): auto-save staffRows com debounce + validateScheduleWeek no Validar
feat(ui): exibir timestamp de validação no ChartPanel
```
