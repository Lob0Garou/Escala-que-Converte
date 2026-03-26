# Spec: Persistência de Escala com Auto-save e Validação

**Data**: 2026-03-26
**Status**: Aprovado
**Escopo**: `useSupabaseSync.js`, `Dashboard.jsx`, migration Supabase

---

## Problema

Ao recarregar a página (F5), a escala carregada via upload some porque `staffRows` não é salvo automaticamente no Supabase. `cuponsData` e `salesData` já têm auto-save via `useEffect`, mas `staffRows` só é persistido quando o usuário clica em "Validar" manualmente.

---

## Solução: Opção A — Auto-save com debounce + Validar como carimbo

### Fluxo esperado após a mudança

```
Upload escala
    → staffRows mudam no estado React
    → useEffect detecta mudança
    → debounce 1.5s
    → saveShiftsBatch() → Supabase (draft)

Edição manual / otimização
    → mesmo fluxo (debounce reseta a cada mudança)

Clicar "Validar"
    → saveShiftsBatch() imediato (sem debounce)
    → validateScheduleWeek() → grava validated_at + validated_shifts

F5 / reload
    → loadShifts() restaura último draft salvo
    → loadWeekSnapshot() carrega validated_at se existir
    → UI exibe "Validado em [data]" se carimbo presente

Análise de desempenho futura
    → lê validated_shifts (snapshot imutável)
    → compara com cupons/vendas reais
```

---

## Schema Supabase

### Migration — 2 colunas em `schedule_weeks`

```sql
ALTER TABLE schedule_weeks
  ADD COLUMN validated_at     TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN validated_shifts JSONB       DEFAULT NULL;
```

- `validated_at`: timestamp do momento da validação
- `validated_shifts`: snapshot JSONB imutável dos shifts aprovados

### Nova RPC — `validate_schedule_week`

```sql
CREATE OR REPLACE FUNCTION validate_schedule_week(
  p_schedule_week_id UUID,
  p_store_id         UUID,
  p_validated_shifts JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE schedule_weeks
  SET
    validated_at     = NOW(),
    validated_shifts = p_validated_shifts
  WHERE id       = p_schedule_week_id
    AND store_id = p_store_id;
END;
$$;
```

---

## Mudanças no código

### 1. `src/hooks/useSupabaseSync.js`

**Nova função `validateScheduleWeek`:**

```js
export const validateScheduleWeek = async (scheduleWeekId, storeId, staffRows) => {
  if (!supabase || !scheduleWeekId || !storeId) return;
  if (!FLAGS.PERSIST_TO_SUPABASE) return;

  // Garante que o draft está atualizado antes de carimbar
  await saveShiftsBatch(scheduleWeekId, storeId, staffRows);

  const shiftsJson = staffRows.filter(r => r.dia).map(staffRowToDbJson);

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

**`loadWeekSnapshot` — adicionar `validated_at` ao SELECT:**

```js
// Antes
.select('cupons_snapshot, sales_snapshot')

// Depois
.select('cupons_snapshot, sales_snapshot, validated_at')
```

Retorno:
```js
return {
  cuponsData: data?.cupons_snapshot || [],
  salesData:  data?.sales_snapshot  || [],
  validatedAt: data?.validated_at   || null,
};
```

---

### 2. `src/features/dashboard/Dashboard.jsx`

**Novo state para `validatedAt`:**
```js
const [validatedAt, setValidatedAt] = useState(null);
```

**No `useEffect` de carregamento do DB — capturar `validatedAt`:**
```js
const { cuponsData: loadedCupons, salesData: loadedSales, validatedAt: loadedValidatedAt } =
  await loadWeekSnapshot(week.id);
if (loadedValidatedAt) setValidatedAt(loadedValidatedAt);
```

**Novo `useEffect` de auto-save para `staffRows`:**
```js
const autoSaveTimerRef = useRef(null);

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

**`handleValidateSchedule` — substituir `saveShiftsBatch` por `validateScheduleWeek`:**
```js
// Importar validateScheduleWeek de useSupabaseSync
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

**Passar `validatedAt` para `MainContent`:**
```jsx
<MainContent
  // ... props existentes
  validatedAt={validatedAt}
/>
```

---

### 3. UI — Feedback visual

**Indicador de validação** (próximo ao botão Validar em `MainContent` ou `Controls`):
```jsx
{validatedAt && (
  <span className="text-xs text-text-secondary">
    Validado em {new Date(validatedAt).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })}
  </span>
)}
```

**Indicador de auto-save** (opcional, discreto):
- Estado `lastSaved` atualizado após cada `saveShiftsBatch` no auto-save
- Exibe `"Salvo"` por 2s após cada save silencioso

---

## O que NÃO muda

- `saveShiftsBatch` continua igual — é chamada tanto pelo auto-save quanto internamente pelo `validateScheduleWeek`
- Fluxo de `cuponsData` e `salesData` continua igual
- Modo local (sem Supabase) continua funcionando — os `FLAGS` guardam a lógica
- `loadShifts` continua igual — carrega o draft (shifts da tabela `schedule_shifts`)

---

## Ordem de implementação

1. Migration Supabase (colunas + RPC)
2. `useSupabaseSync.js` — `validateScheduleWeek` + atualizar `loadWeekSnapshot`
3. `Dashboard.jsx` — auto-save useEffect + novo state `validatedAt` + atualizar `handleValidateSchedule`
4. UI — indicador de validação em `MainContent`

---

## Critérios de aceite

- [ ] Upload de escala + F5 → escala restaurada sem pedir upload novamente
- [ ] Edição manual de horário → salvo automaticamente em ~1.5s
- [ ] Botão "Validar" → grava `validated_at` e `validated_shifts` no banco
- [ ] Reload após validar → exibe "Validado em [data]" na UI
- [ ] Modo local (sem Supabase) → comportamento sem mudança (sem erros)
