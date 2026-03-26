-- ============================================================
-- 006_fix_ambiguous_column.sql
-- Recria get_or_create_schedule_week retornando JSONB
-- em vez de TABLE, eliminando o erro "column reference is ambiguous".
-- ============================================================

-- Dropa a versão antiga (que retornava TABLE)
DROP FUNCTION IF EXISTS public.get_or_create_schedule_week(UUID, DATE);

-- Recria retornando JSONB — sem conflito de nomes de coluna
CREATE OR REPLACE FUNCTION public.get_or_create_schedule_week(
  p_store_id   UUID,
  p_week_start DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_week_id UUID;
  v_result  JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: sessão inativa.';
  END IF;

  IF NOT public.user_has_store_access(p_store_id) THEN
    RAISE EXCEPTION 'Acesso negado à loja.';
  END IF;

  -- 1. Tenta encontrar semana já existente
  SELECT sw.id INTO v_week_id
  FROM public.schedule_weeks sw
  WHERE sw.store_id  = p_store_id
    AND sw.week_start = p_week_start;

  -- 2. Se não existe, cria (race-condition safe)
  IF v_week_id IS NULL THEN
    BEGIN
      INSERT INTO public.schedule_weeks (store_id, week_start, source)
      VALUES (p_store_id, p_week_start, 'upload')
      RETURNING id INTO v_week_id;
    EXCEPTION WHEN unique_violation THEN
      -- Outro processo criou primeiro — busca o existente
      SELECT sw.id INTO v_week_id
      FROM public.schedule_weeks sw
      WHERE sw.store_id  = p_store_id
        AND sw.week_start = p_week_start;
    END;
  END IF;

  -- 3. Retorna como JSONB com nomes explícitos de colunas
  SELECT to_jsonb(t) INTO v_result
  FROM (
    SELECT
      sw.id,
      sw.store_id,
      sw.week_start,
      sw.status,
      sw.source,
      sw.cupons_snapshot,
      sw.sales_snapshot,
      sw.created_at
    FROM public.schedule_weeks sw
    WHERE sw.id = v_week_id
  ) AS t;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_schedule_week FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_schedule_week TO authenticated;
