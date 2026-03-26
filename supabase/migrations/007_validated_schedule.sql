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
