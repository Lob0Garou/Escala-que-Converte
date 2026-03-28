-- ============================================================
-- 008_admin_governance.sql
-- Camada de governanca, auditoria e administracao global.
-- ============================================================

-- ============================================================
-- ENUM: platform_role
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'platform_role'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.platform_role AS ENUM ('admin', 'manager', 'viewer');
  END IF;
END $$;

-- ============================================================
-- TABELAS: organizations / regionals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT,
  created_by  UUID REFERENCES auth.users(id),
  updated_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.regionals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  code             TEXT,
  created_by       UUID REFERENCES auth.users(id),
  updated_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ALTERS: profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email          TEXT,
  ADD COLUMN IF NOT EXISTS platform_role  public.platform_role NOT NULL DEFAULT 'viewer',
  ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at   TIMESTAMPTZ;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email <> u.email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
  ON public.profiles (LOWER(email))
  WHERE email IS NOT NULL;

-- ============================================================
-- ALTERS: stores / store_members / operational tables
-- ============================================================
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS regional_id     UUID REFERENCES public.regionals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by      UUID REFERENCES auth.users(id);

UPDATE public.stores
SET created_by = COALESCE(created_by, owner_id),
    updated_by = COALESCE(updated_by, owner_id)
WHERE created_by IS NULL
   OR updated_by IS NULL;

ALTER TABLE public.store_members
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.store_members
SET created_by = COALESCE(created_by, invited_by, user_id),
    updated_by = COALESCE(updated_by, invited_by, user_id)
WHERE created_by IS NULL
   OR updated_by IS NULL;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

UPDATE public.employees e
SET created_by = COALESCE(e.created_by, s.owner_id),
    updated_by = COALESCE(e.updated_by, s.owner_id)
FROM public.stores s
WHERE e.store_id = s.id
  AND (e.created_by IS NULL OR e.updated_by IS NULL);

ALTER TABLE public.schedule_weeks
  ADD COLUMN IF NOT EXISTS updated_by               UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS current_schedule_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_snapshot_version INTEGER NOT NULL DEFAULT 0;

UPDATE public.schedule_weeks sw
SET created_by = COALESCE(sw.created_by, s.owner_id),
    updated_by = COALESCE(sw.updated_by, sw.created_by, s.owner_id)
FROM public.stores s
WHERE sw.store_id = s.id
  AND (sw.created_by IS NULL OR sw.updated_by IS NULL);

ALTER TABLE public.schedule_shifts
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

UPDATE public.schedule_shifts ss
SET created_by = COALESCE(ss.created_by, sw.created_by),
    updated_by = COALESCE(ss.updated_by, sw.updated_by, sw.created_by)
FROM public.schedule_weeks sw
WHERE ss.schedule_week_id = sw.id
  AND (ss.created_by IS NULL OR ss.updated_by IS NULL);

ALTER TABLE public.traffic_data
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

UPDATE public.traffic_data td
SET created_by = COALESCE(td.created_by, s.owner_id),
    updated_by = COALESCE(td.updated_by, s.owner_id)
FROM public.stores s
WHERE td.store_id = s.id
  AND (td.created_by IS NULL OR td.updated_by IS NULL);

ALTER TABLE public.sales_data
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

UPDATE public.sales_data sd
SET created_by = COALESCE(sd.created_by, s.owner_id),
    updated_by = COALESCE(sd.updated_by, s.owner_id)
FROM public.stores s
WHERE sd.store_id = s.id
  AND (sd.created_by IS NULL OR sd.updated_by IS NULL);

ALTER TABLE public.optimization_results
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

UPDATE public.optimization_results o
SET created_by = COALESCE(o.created_by, s.owner_id),
    updated_by = COALESCE(o.updated_by, s.owner_id)
FROM public.stores s
WHERE o.store_id = s.id
  AND (o.created_by IS NULL OR o.updated_by IS NULL);

ALTER TABLE public.uploaded_files
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

UPDATE public.uploaded_files uf
SET created_by = COALESCE(uf.created_by, uf.uploaded_by, s.owner_id),
    updated_by = COALESCE(uf.updated_by, uf.uploaded_by, s.owner_id)
FROM public.stores s
WHERE uf.store_id = s.id
  AND (uf.created_by IS NULL OR uf.updated_by IS NULL);

-- ============================================================
-- TABELAS: versionamento
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schedule_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_week_id UUID NOT NULL REFERENCES public.schedule_weeks(id) ON DELETE CASCADE,
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL,
  action          TEXT NOT NULL,
  staff_rows_json JSONB NOT NULL,
  metadata_json   JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_week_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.week_snapshot_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_week_id  UUID NOT NULL REFERENCES public.schedule_weeks(id) ON DELETE CASCADE,
  store_id          UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  version_number    INTEGER NOT NULL,
  action            TEXT NOT NULL,
  cupons_snapshot   JSONB,
  sales_snapshot    JSONB,
  validated_shifts  JSONB,
  metadata_json     JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_week_id, version_number)
);

-- ============================================================
-- TABELA: activity_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role          TEXT,
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  store_id      UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  request_id    TEXT,
  error_code    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_platform_role      ON public.profiles(platform_role);
CREATE INDEX IF NOT EXISTS idx_stores_organization_id      ON public.stores(organization_id);
CREATE INDEX IF NOT EXISTS idx_stores_regional_id          ON public.stores(regional_id);
CREATE INDEX IF NOT EXISTS idx_store_members_updated_at    ON public.store_members(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_weeks_updated_by   ON public.schedule_weeks(updated_by);
CREATE INDEX IF NOT EXISTS idx_schedule_versions_week_id   ON public.schedule_versions(schedule_week_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_snapshot_versions_week_id   ON public.week_snapshot_versions(schedule_week_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id       ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_store_id      ON public.activity_logs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action        ON public.activity_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity        ON public.activity_logs(entity_type, entity_id);

-- ============================================================
-- RLS: enable on new tables
-- ============================================================
ALTER TABLE public.organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regionals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_versions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.week_snapshot_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper functions: platform role and global access
-- ============================================================
CREATE OR REPLACE FUNCTION public.platform_role_of(p_user_id UUID DEFAULT auth.uid())
RETURNS public.platform_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.platform_role FROM public.profiles p WHERE p.id = p_user_id LIMIT 1),
    'viewer'::public.platform_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.platform_role_of(p_user_id) = 'admin'::public.platform_role;
$$;

CREATE OR REPLACE FUNCTION public.user_has_store_access(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.store_members
      WHERE store_id = p_store_id
        AND user_id  = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_write_store(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.store_members
      WHERE store_id = p_store_id
        AND user_id  = auth.uid()
        AND role IN ('manager', 'owner')
    );
$$;

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
  v_login_at TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nao autorizado.';
  END IF;

  v_login_at := COALESCE(p_last_login_at, NOW());

  UPDATE public.profiles
  SET
    email          = COALESCE(p_email, email),
    first_login_at = COALESCE(first_login_at, v_login_at),
    last_login_at  = COALESCE(GREATEST(last_login_at, v_login_at), v_login_at),
    last_seen_at   = NOW()
  WHERE id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_activity(
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_store_id UUID DEFAULT NULL,
  p_metadata_json JSONB DEFAULT '{}'::JSONB,
  p_request_id TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_log_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nao autorizado.';
  END IF;

  v_role := CASE
    WHEN public.is_platform_admin(v_user_id) THEN 'admin'
    WHEN p_store_id IS NOT NULL THEN COALESCE(public.user_store_role(p_store_id)::TEXT, public.platform_role_of(v_user_id)::TEXT)
    ELSE public.platform_role_of(v_user_id)::TEXT
  END;

  INSERT INTO public.activity_logs (
    user_id,
    role,
    action,
    entity_type,
    entity_id,
    store_id,
    metadata_json,
    request_id,
    error_code
  )
  VALUES (
    v_user_id,
    v_role,
    p_action,
    p_entity_type,
    p_entity_id,
    p_store_id,
    COALESCE(p_metadata_json, '{}'::JSONB),
    p_request_id,
    p_error_code
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ============================================================
-- Trigger helpers
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_actor_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by = auth.uid();
    END IF;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    NEW.updated_by = auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

-- Atualiza a trigger de criacao de perfil para popular email.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, platform_role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    'viewer'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- updated_at para novas tabelas / store_members
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'organizations', 'regionals', 'store_members'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    ', tbl, tbl);
  END LOOP;
END;
$$;

-- actor fields nas tabelas rastreaveis
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'organizations', 'regionals', 'stores', 'store_members', 'employees',
    'schedule_weeks', 'schedule_shifts', 'traffic_data', 'sales_data',
    'optimization_results', 'uploaded_files'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_actor_fields ON public.%I;
      CREATE TRIGGER set_actor_fields
        BEFORE INSERT OR UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.handle_actor_fields();
    ', tbl, tbl);
  END LOOP;
END;
$$;

-- ============================================================
-- POLICIES: profiles
-- ============================================================
DROP POLICY IF EXISTS "profiles: admin ver todos" ON public.profiles;
CREATE POLICY "profiles: admin ver todos"
  ON public.profiles FOR SELECT
  USING (public.is_platform_admin());

-- ============================================================
-- POLICIES: organizations / regionals
-- ============================================================
DROP POLICY IF EXISTS "organizations: admin ve tudo" ON public.organizations;
CREATE POLICY "organizations: admin ve tudo"
  ON public.organizations FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "regionals: admin ve tudo" ON public.regionals;
CREATE POLICY "regionals: admin ve tudo"
  ON public.regionals FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ============================================================
-- POLICIES: schedule_versions / week_snapshot_versions
-- ============================================================
DROP POLICY IF EXISTS "schedule_versions: ver com acesso" ON public.schedule_versions;
CREATE POLICY "schedule_versions: ver com acesso"
  ON public.schedule_versions FOR SELECT
  USING (public.user_has_store_access(store_id));

DROP POLICY IF EXISTS "week_snapshot_versions: ver com acesso" ON public.week_snapshot_versions;
CREATE POLICY "week_snapshot_versions: ver com acesso"
  ON public.week_snapshot_versions FOR SELECT
  USING (public.user_has_store_access(store_id));

-- ============================================================
-- POLICIES: activity_logs
-- ============================================================
DROP POLICY IF EXISTS "activity_logs: ver proprio ou admin" ON public.activity_logs;
CREATE POLICY "activity_logs: ver proprio ou admin"
  ON public.activity_logs FOR SELECT
  USING (
    public.is_platform_admin()
    OR user_id = auth.uid()
    OR (store_id IS NOT NULL AND public.user_has_store_access(store_id))
  );

-- ============================================================
-- RPC overrides: get_or_create / save / snapshot / validate
-- ============================================================
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
    RAISE EXCEPTION 'Nao autorizado: sessao inativa.';
  END IF;

  IF NOT public.user_has_store_access(p_store_id) THEN
    RAISE EXCEPTION 'Acesso negado a loja.';
  END IF;

  SELECT sw.id INTO v_week_id
  FROM public.schedule_weeks sw
  WHERE sw.store_id = p_store_id
    AND sw.week_start = p_week_start;

  IF v_week_id IS NULL THEN
    BEGIN
      INSERT INTO public.schedule_weeks (store_id, week_start, source, created_by, updated_by)
      VALUES (p_store_id, p_week_start, 'upload', v_user_id, v_user_id)
      RETURNING id INTO v_week_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT sw.id INTO v_week_id
      FROM public.schedule_weeks sw
      WHERE sw.store_id = p_store_id
        AND sw.week_start = p_week_start;
    END;
  END IF;

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
      sw.validated_at,
      sw.current_schedule_version,
      sw.current_snapshot_version,
      sw.created_at,
      sw.updated_at
    FROM public.schedule_weeks sw
    WHERE sw.id = v_week_id
  ) AS t;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_shifts_batch(
  p_schedule_week_id UUID,
  p_store_id         UUID,
  p_shifts           JSONB,
  p_request_id       TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_next_version INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nao autorizado.';
  END IF;

  IF NOT public.user_can_write_store(p_store_id) THEN
    RAISE EXCEPTION 'Acesso negado a loja.';
  END IF;

  DELETE FROM public.schedule_shifts
  WHERE schedule_week_id = p_schedule_week_id;

  INSERT INTO public.schedule_shifts (
    schedule_week_id, store_id, employee_name, day_of_week,
    entrada, intervalo, saida, saida_dia_seguinte, is_optimized, sort_order,
    created_by, updated_by
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
    (elem->>'sort_order')::SMALLINT,
    v_user_id,
    v_user_id
  FROM jsonb_array_elements(p_shifts) WITH ORDINALITY AS t(elem, ord)
  WHERE elem->>'day_of_week' IS NOT NULL;

  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
  FROM public.schedule_versions
  WHERE schedule_week_id = p_schedule_week_id;

  INSERT INTO public.schedule_versions (
    schedule_week_id,
    store_id,
    version_number,
    action,
    staff_rows_json,
    metadata_json,
    created_by
  )
  VALUES (
    p_schedule_week_id,
    p_store_id,
    v_next_version,
    'save',
    COALESCE(p_shifts, '[]'::JSONB),
    jsonb_build_object('source', 'save_shifts_batch'),
    v_user_id
  );

  UPDATE public.schedule_weeks
  SET
    updated_by = v_user_id,
    current_schedule_version = v_next_version
  WHERE id = p_schedule_week_id
    AND store_id = p_store_id;

  PERFORM public.log_activity(
    'schedule_saved',
    'schedule_week',
    p_schedule_week_id::TEXT,
    p_store_id,
    jsonb_build_object(
      'scheduleVersion', v_next_version,
      'shiftCount', COALESCE(jsonb_array_length(p_shifts), 0)
    ),
    p_request_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_week_snapshot(
  p_schedule_week_id UUID,
  p_store_id         UUID,
  p_cupons_snapshot  JSONB DEFAULT NULL,
  p_sales_snapshot   JSONB DEFAULT NULL,
  p_request_id       TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_next_version INTEGER;
  v_validated_shifts JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nao autorizado.';
  END IF;

  IF NOT public.user_can_write_store(p_store_id) THEN
    RAISE EXCEPTION 'Acesso negado a loja.';
  END IF;

  UPDATE public.schedule_weeks
  SET
    cupons_snapshot = COALESCE(p_cupons_snapshot, cupons_snapshot),
    sales_snapshot  = COALESCE(p_sales_snapshot, sales_snapshot),
    updated_by      = v_user_id
  WHERE id = p_schedule_week_id
    AND store_id = p_store_id;

  SELECT validated_shifts
    INTO v_validated_shifts
  FROM public.schedule_weeks
  WHERE id = p_schedule_week_id;

  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
  FROM public.week_snapshot_versions
  WHERE schedule_week_id = p_schedule_week_id;

  INSERT INTO public.week_snapshot_versions (
    schedule_week_id,
    store_id,
    version_number,
    action,
    cupons_snapshot,
    sales_snapshot,
    validated_shifts,
    metadata_json,
    created_by
  )
  VALUES (
    p_schedule_week_id,
    p_store_id,
    v_next_version,
    'snapshot_save',
    p_cupons_snapshot,
    p_sales_snapshot,
    v_validated_shifts,
    jsonb_build_object(
      'cuponsCount', COALESCE(jsonb_array_length(p_cupons_snapshot), 0),
      'salesCount', COALESCE(jsonb_array_length(p_sales_snapshot), 0)
    ),
    v_user_id
  );

  UPDATE public.schedule_weeks
  SET current_snapshot_version = v_next_version
  WHERE id = p_schedule_week_id
    AND store_id = p_store_id;

  PERFORM public.log_activity(
    'week_snapshot_saved',
    'schedule_week',
    p_schedule_week_id::TEXT,
    p_store_id,
    jsonb_build_object(
      'snapshotVersion', v_next_version,
      'cuponsCount', COALESCE(jsonb_array_length(p_cupons_snapshot), 0),
      'salesCount', COALESCE(jsonb_array_length(p_sales_snapshot), 0)
    ),
    p_request_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_schedule_week(
  p_schedule_week_id UUID,
  p_store_id         UUID,
  p_validated_shifts JSONB,
  p_request_id       TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_schedule_version INTEGER;
  v_snapshot_version INTEGER;
  v_cupons_snapshot JSONB;
  v_sales_snapshot JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nao autorizado.';
  END IF;

  IF NOT public.user_can_write_store(p_store_id) THEN
    RAISE EXCEPTION 'Acesso negado a loja.';
  END IF;

  UPDATE public.schedule_weeks
  SET
    validated_at     = NOW(),
    validated_shifts = p_validated_shifts,
    updated_by       = v_user_id
  WHERE id = p_schedule_week_id
    AND store_id = p_store_id;

  SELECT cupons_snapshot, sales_snapshot
    INTO v_cupons_snapshot, v_sales_snapshot
  FROM public.schedule_weeks
  WHERE id = p_schedule_week_id;

  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_schedule_version
  FROM public.schedule_versions
  WHERE schedule_week_id = p_schedule_week_id;

  INSERT INTO public.schedule_versions (
    schedule_week_id,
    store_id,
    version_number,
    action,
    staff_rows_json,
    metadata_json,
    created_by
  )
  VALUES (
    p_schedule_week_id,
    p_store_id,
    v_schedule_version,
    'validate',
    COALESCE(p_validated_shifts, '[]'::JSONB),
    jsonb_build_object('validated', TRUE),
    v_user_id
  );

  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_snapshot_version
  FROM public.week_snapshot_versions
  WHERE schedule_week_id = p_schedule_week_id;

  INSERT INTO public.week_snapshot_versions (
    schedule_week_id,
    store_id,
    version_number,
    action,
    cupons_snapshot,
    sales_snapshot,
    validated_shifts,
    metadata_json,
    created_by
  )
  VALUES (
    p_schedule_week_id,
    p_store_id,
    v_snapshot_version,
    'validate',
    v_cupons_snapshot,
    v_sales_snapshot,
    p_validated_shifts,
    jsonb_build_object('validated', TRUE),
    v_user_id
  );

  UPDATE public.schedule_weeks
  SET
    current_schedule_version = v_schedule_version,
    current_snapshot_version = v_snapshot_version
  WHERE id = p_schedule_week_id
    AND store_id = p_store_id;

  PERFORM public.log_activity(
    'schedule_validated',
    'schedule_week',
    p_schedule_week_id::TEXT,
    p_store_id,
    jsonb_build_object(
      'scheduleVersion', v_schedule_version,
      'snapshotVersion', v_snapshot_version
    ),
    p_request_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_user_access(TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_user_access(TEXT, TIMESTAMPTZ) TO authenticated;

REVOKE ALL ON FUNCTION public.log_activity(TEXT, TEXT, TEXT, UUID, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_activity(TEXT, TEXT, TEXT, UUID, JSONB, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.save_shifts_batch(UUID, UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_shifts_batch(UUID, UUID, JSONB, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.update_week_snapshot(UUID, UUID, JSONB, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_week_snapshot(UUID, UUID, JSONB, JSONB, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.validate_schedule_week(UUID, UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_schedule_week(UUID, UUID, JSONB, TEXT) TO authenticated;
