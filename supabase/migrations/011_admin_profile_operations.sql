-- ============================================================
-- 011_admin_profile_operations.sql
-- Operacoes administrativas de perfil e acesso logico.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS primary_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_primary_store_id ON public.profiles(primary_store_id);

CREATE OR REPLACE FUNCTION public.is_profile_active(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_active FROM public.profiles p WHERE p.id = p_user_id LIMIT 1),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_profile_active(p_user_id)
    AND public.platform_role_of(p_user_id) = 'admin'::public.platform_role;
$$;

CREATE OR REPLACE FUNCTION public.user_has_store_access(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_profile_active(auth.uid())
    AND (
      public.is_platform_admin(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.store_members
        WHERE store_id = p_store_id
          AND user_id = auth.uid()
      )
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
    public.is_profile_active(auth.uid())
    AND (
      public.is_platform_admin(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.store_members
        WHERE store_id = p_store_id
          AND user_id = auth.uid()
          AND role IN ('manager', 'owner')
      )
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nao autorizado.';
  END IF;

  UPDATE public.profiles
  SET
    email = CASE
      WHEN email IS NULL THEN COALESCE(p_email, email)
      ELSE email
    END,
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

CREATE OR REPLACE FUNCTION public.admin_update_profile_basics(
  p_target_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_primary_store_id UUID DEFAULT NULL,
  p_set_primary_store BOOLEAN DEFAULT FALSE,
  p_request_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_target_role public.platform_role;
  v_target_is_active BOOLEAN;
  v_active_admin_count INTEGER;
  v_next_full_name TEXT;
  v_next_email TEXT;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Nao autorizado.';
  END IF;

  IF NOT public.is_platform_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;

  SELECT platform_role, is_active
    INTO v_target_role, v_target_is_active
  FROM public.profiles
  WHERE id = p_target_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Perfil alvo nao encontrado.';
  END IF;

  v_next_full_name := NULLIF(BTRIM(p_full_name), '');
  v_next_email := NULLIF(BTRIM(p_email), '');

  IF p_set_primary_store THEN
    IF p_primary_store_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.stores WHERE id = p_primary_store_id
      ) THEN
        RAISE EXCEPTION 'Loja principal nao encontrada.';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM public.store_members
        WHERE store_id = p_primary_store_id
          AND user_id = p_target_user_id
      ) THEN
        RAISE EXCEPTION 'A loja principal precisa estar vinculada ao usuario.';
      END IF;
    END IF;
  END IF;

  IF p_is_active = FALSE
     AND v_target_role = 'admin'::public.platform_role
     AND COALESCE(v_target_is_active, TRUE) = TRUE THEN
    SELECT COUNT(*)
      INTO v_active_admin_count
    FROM public.profiles
    WHERE platform_role = 'admin'::public.platform_role
      AND COALESCE(is_active, TRUE) = TRUE;

    IF v_active_admin_count <= 1 THEN
      RAISE EXCEPTION 'Nao e permitido desativar o ultimo admin ativo da plataforma.';
    END IF;
  END IF;

  UPDATE public.profiles
  SET
    full_name = COALESCE(v_next_full_name, full_name),
    email = COALESCE(v_next_email, email),
    is_active = COALESCE(p_is_active, is_active),
    primary_store_id = CASE
      WHEN p_set_primary_store THEN p_primary_store_id
      ELSE primary_store_id
    END
  WHERE id = p_target_user_id;

  PERFORM public.log_activity(
    'admin_profile_updated',
    'profile',
    p_target_user_id::TEXT,
    p_primary_store_id,
    jsonb_build_object(
      'targetUserId', p_target_user_id,
      'fullName', COALESCE(v_next_full_name, NULL),
      'email', COALESCE(v_next_email, NULL),
      'isActive', p_is_active,
      'primaryStoreId', CASE WHEN p_set_primary_store THEN p_primary_store_id ELSE NULL END
    ),
    p_request_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_platform_role(
  p_target_user_id UUID,
  p_role public.platform_role,
  p_request_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_current_role public.platform_role;
  v_target_is_active BOOLEAN;
  v_active_admin_count INTEGER;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Nao autorizado.';
  END IF;

  IF NOT public.is_platform_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;

  SELECT platform_role, COALESCE(is_active, TRUE)
    INTO v_current_role, v_target_is_active
  FROM public.profiles
  WHERE id = p_target_user_id;

  IF v_current_role IS NULL THEN
    RAISE EXCEPTION 'Perfil alvo nao encontrado.';
  END IF;

  IF v_current_role = 'admin'::public.platform_role
     AND p_role <> 'admin'::public.platform_role
     AND v_target_is_active = TRUE THEN
    SELECT COUNT(*)
      INTO v_active_admin_count
    FROM public.profiles
    WHERE platform_role = 'admin'::public.platform_role
      AND COALESCE(is_active, TRUE) = TRUE;

    IF v_active_admin_count <= 1 THEN
      RAISE EXCEPTION 'Nao e permitido remover o ultimo admin ativo da plataforma.';
    END IF;
  END IF;

  UPDATE public.profiles
  SET platform_role = p_role
  WHERE id = p_target_user_id;

  PERFORM public.log_activity(
    'admin_role_updated',
    'profile',
    p_target_user_id::TEXT,
    NULL,
    jsonb_build_object(
      'targetUserId', p_target_user_id,
      'newRole', p_role
    ),
    p_request_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_store_member(
  p_store_id UUID,
  p_target_user_id UUID,
  p_role public.store_member_role,
  p_request_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Nao autorizado.';
  END IF;

  IF NOT public.is_platform_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;

  IF p_role = 'owner'::public.store_member_role THEN
    RAISE EXCEPTION 'Use apenas manager ou viewer nesta etapa.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = p_store_id) THEN
    RAISE EXCEPTION 'Loja nao encontrada.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id) THEN
    RAISE EXCEPTION 'Perfil alvo nao encontrado.';
  END IF;

  INSERT INTO public.store_members (
    store_id,
    user_id,
    role,
    invited_by,
    created_by,
    updated_by
  )
  VALUES (
    p_store_id,
    p_target_user_id,
    p_role,
    v_actor_id,
    v_actor_id,
    v_actor_id
  )
  ON CONFLICT (store_id, user_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    invited_by = EXCLUDED.invited_by,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW();

  UPDATE public.profiles
  SET primary_store_id = COALESCE(primary_store_id, p_store_id)
  WHERE id = p_target_user_id;

  PERFORM public.log_activity(
    'admin_store_member_upserted',
    'store_member',
    p_target_user_id::TEXT,
    p_store_id,
    jsonb_build_object(
      'targetUserId', p_target_user_id,
      'memberRole', p_role,
      'primaryStoreId', (
        SELECT primary_store_id
        FROM public.profiles
        WHERE id = p_target_user_id
      )
    ),
    p_request_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_store_member(
  p_store_id UUID,
  p_target_user_id UUID,
  p_request_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_owner_id UUID;
  v_current_primary_store_id UUID;
  v_next_primary_store_id UUID;
  v_deleted_count INTEGER;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Nao autorizado.';
  END IF;

  IF NOT public.is_platform_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;

  SELECT owner_id
    INTO v_owner_id
  FROM public.stores
  WHERE id = p_store_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Loja nao encontrada.';
  END IF;

  IF v_owner_id = p_target_user_id THEN
    RAISE EXCEPTION 'Nao e permitido remover o owner da loja por esta acao.';
  END IF;

  SELECT primary_store_id
    INTO v_current_primary_store_id
  FROM public.profiles
  WHERE id = p_target_user_id;

  DELETE FROM public.store_members
  WHERE store_id = p_store_id
    AND user_id = p_target_user_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'Vinculo nao encontrado.';
  END IF;

  IF v_current_primary_store_id = p_store_id THEN
    SELECT sm.store_id
      INTO v_next_primary_store_id
    FROM public.store_members sm
    WHERE sm.user_id = p_target_user_id
    ORDER BY sm.created_at DESC
    LIMIT 1;

    UPDATE public.profiles
    SET primary_store_id = v_next_primary_store_id
    WHERE id = p_target_user_id;
  END IF;

  PERFORM public.log_activity(
    'admin_store_member_removed',
    'store_member',
    p_target_user_id::TEXT,
    p_store_id,
    jsonb_build_object(
      'targetUserId', p_target_user_id,
      'nextPrimaryStoreId', (
        SELECT primary_store_id
        FROM public.profiles
        WHERE id = p_target_user_id
      )
    ),
    p_request_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_profile_basics(UUID, TEXT, TEXT, BOOLEAN, UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_profile_basics(UUID, TEXT, TEXT, BOOLEAN, UUID, BOOLEAN, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.set_platform_role(UUID, public.platform_role, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_platform_role(UUID, public.platform_role, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_upsert_store_member(UUID, UUID, public.store_member_role, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_store_member(UUID, UUID, public.store_member_role, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_remove_store_member(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_remove_store_member(UUID, UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.sync_user_access(TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_user_access(TEXT, TIMESTAMPTZ) TO authenticated;
