-- ============================================================
-- 005_week_snapshots.sql
-- Adiciona colunas JSONB à schedule_weeks para armazenar
-- cuponsData e salesData como snapshots (mais simples que
-- normalizar em traffic_data/sales_data por enquanto).
-- ============================================================

ALTER TABLE public.schedule_weeks
  ADD COLUMN IF NOT EXISTS cupons_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS sales_snapshot  JSONB;

-- ============================================================
-- RPC: get_or_create_schedule_week
-- Busca ou cria a semana ativa de forma atômica (SECURITY DEFINER)
-- para evitar race conditions e problemas de RLS.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_schedule_week(
  p_store_id   UUID,
  p_week_start DATE
)
RETURNS TABLE (
  id            UUID,
  store_id      UUID,
  week_start    DATE,
  status        schedule_status,
  source        schedule_source,
  cupons_snapshot JSONB,
  sales_snapshot  JSONB,
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_week_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: sessão inativa.';
  END IF;

  -- Verifica acesso à loja
  IF NOT public.user_has_store_access(p_store_id) THEN
    RAISE EXCEPTION 'Acesso negado à loja.';
  END IF;

  -- Tenta inserir; se já existir (UNIQUE), apenas retorna o existente
  INSERT INTO public.schedule_weeks (store_id, week_start, source)
  VALUES (p_store_id, p_week_start, 'upload')
  ON CONFLICT (store_id, week_start) DO NOTHING
  RETURNING schedule_weeks.id INTO v_week_id;

  -- Se não inseriu (já existia), busca o existente
  IF v_week_id IS NULL THEN
    SELECT schedule_weeks.id INTO v_week_id
    FROM public.schedule_weeks
    WHERE schedule_weeks.store_id  = p_store_id
      AND schedule_weeks.week_start = p_week_start;
  END IF;

  RETURN QUERY
    SELECT
      w.id, w.store_id, w.week_start, w.status, w.source,
      w.cupons_snapshot, w.sales_snapshot, w.created_at
    FROM public.schedule_weeks w
    WHERE w.id = v_week_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_schedule_week FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_schedule_week TO authenticated;

-- ============================================================
-- RPC: save_shifts_batch
-- Deleta e reininsere todos os shifts de uma semana atomicamente.
-- ============================================================
CREATE OR REPLACE FUNCTION public.save_shifts_batch(
  p_schedule_week_id UUID,
  p_store_id         UUID,
  p_shifts           JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado.';
  END IF;

  IF NOT public.user_can_write_store(p_store_id) THEN
    RAISE EXCEPTION 'Acesso negado à loja.';
  END IF;

  -- Deleta shifts existentes da semana
  DELETE FROM public.schedule_shifts
  WHERE schedule_week_id = p_schedule_week_id;

  -- Insere novos shifts do array JSONB
  INSERT INTO public.schedule_shifts (
    schedule_week_id, store_id, employee_name, day_of_week,
    entrada, intervalo, saida, saida_dia_seguinte, is_optimized, sort_order
  )
  SELECT
    p_schedule_week_id,
    p_store_id,
    (elem->>'employee_name')::TEXT,
    (elem->>'day_of_week')::day_of_week_enum,
    NULLIF(elem->>'entrada', '')::TIME,
    NULLIF(elem->>'intervalo', '')::TIME,
    NULLIF(elem->>'saida', '')::TIME,
    COALESCE((elem->>'saida_dia_seguinte')::BOOLEAN, FALSE),
    COALESCE((elem->>'is_optimized')::BOOLEAN, FALSE),
    (elem->>'sort_order')::SMALLINT
  FROM jsonb_array_elements(p_shifts) WITH ORDINALITY AS t(elem, ord)
  WHERE elem->>'day_of_week' IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.save_shifts_batch FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_shifts_batch TO authenticated;

-- ============================================================
-- RPC: update_week_snapshot
-- Atualiza cupons_snapshot e/ou sales_snapshot da semana.
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_week_snapshot(
  p_schedule_week_id UUID,
  p_store_id         UUID,
  p_cupons_snapshot  JSONB DEFAULT NULL,
  p_sales_snapshot   JSONB DEFAULT NULL
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
    cupons_snapshot = COALESCE(p_cupons_snapshot, cupons_snapshot),
    sales_snapshot  = COALESCE(p_sales_snapshot,  sales_snapshot)
  WHERE id = p_schedule_week_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_week_snapshot FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_week_snapshot TO authenticated;
