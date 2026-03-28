-- ============================================================
-- 009_frontend_admin_console.sql
-- Ajustes minimos para a sessao admin 100% apoiada em Supabase.
-- Reaproveita o dominio ja existente sem duplicar tabelas operacionais.
-- ============================================================

-- ============================================================
-- STORES: campos executivos opcionais para o painel admin
-- ============================================================
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS store_code TEXT,
  ADD COLUMN IF NOT EXISTS city       TEXT,
  ADD COLUMN IF NOT EXISTS state      TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_store_code_unique
  ON public.stores (LOWER(store_code))
  WHERE store_code IS NOT NULL;

-- ============================================================
-- UPLOADED_FILES: metadados minimos para rastreio de upload
-- ============================================================
ALTER TABLE public.uploaded_files
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- ============================================================
-- PERFIS / PRESENCA: evita sobrescrever last_login_at quando
-- o app apenas faz um ping de atividade.
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_user_access(
  p_email TEXT DEFAULT NULL,
  p_last_login_at TIMESTAMPTZ DEFAULT NULL
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
    RAISE EXCEPTION 'Nao autorizado.';
  END IF;

  UPDATE public.profiles
  SET
    email = COALESCE(p_email, email),
    first_login_at = CASE
      WHEN p_last_login_at IS NULL THEN first_login_at
      ELSE COALESCE(first_login_at, p_last_login_at)
    END,
    last_login_at = CASE
      WHEN p_last_login_at IS NULL THEN last_login_at
      ELSE COALESCE(GREATEST(last_login_at, p_last_login_at), p_last_login_at)
    END,
    last_seen_at = NOW()
  WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_user_access(TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_user_access(TEXT, TIMESTAMPTZ) TO authenticated;

-- ============================================================
-- INDEXES de leitura para a sessao admin
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at       ON public.profiles(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at        ON public.profiles(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_weeks_updated_at    ON public.schedule_weeks(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_at    ON public.uploaded_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_by   ON public.uploaded_files(uploaded_by);
