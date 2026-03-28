-- ============================================================
-- 010_admin_access_management.sql
-- Acoes administrativas seguras para gerenciar roles globais
-- e memberships de loja sem relaxar o RLS inteiro.
-- ============================================================

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
  v_admin_count INTEGER;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Nao autorizado.';
  END IF;

  IF NOT public.is_platform_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;

  SELECT platform_role
    INTO v_current_role
  FROM public.profiles
  WHERE id = p_target_user_id;

  IF v_current_role IS NULL THEN
    RAISE EXCEPTION 'Perfil alvo nao encontrado.';
  END IF;

  IF v_current_role = 'admin'::public.platform_role AND p_role <> 'admin'::public.platform_role THEN
    SELECT COUNT(*)
      INTO v_admin_count
    FROM public.profiles
    WHERE platform_role = 'admin'::public.platform_role;

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Nao e permitido remover o ultimo admin da plataforma.';
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

  PERFORM public.log_activity(
    'admin_store_member_upserted',
    'store_member',
    p_target_user_id::TEXT,
    p_store_id,
    jsonb_build_object(
      'targetUserId', p_target_user_id,
      'memberRole', p_role
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

  DELETE FROM public.store_members
  WHERE store_id = p_store_id
    AND user_id = p_target_user_id;

  PERFORM public.log_activity(
    'admin_store_member_removed',
    'store_member',
    p_target_user_id::TEXT,
    p_store_id,
    jsonb_build_object(
      'targetUserId', p_target_user_id
    ),
    p_request_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_platform_role(UUID, public.platform_role, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_platform_role(UUID, public.platform_role, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_upsert_store_member(UUID, UUID, public.store_member_role, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_store_member(UUID, UUID, public.store_member_role, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_remove_store_member(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_remove_store_member(UUID, UUID, TEXT) TO authenticated;
