-- ============================================================
-- 004_create_store_rpc.sql
-- Função SECURITY DEFINER para criar loja + membro owner atomicamente.
-- Resolve o problema de RLS ao criar a primeira loja.
-- ============================================================

/**
 * create_store(p_name, p_brand, p_open_hour, p_close_hour)
 *
 * Cria a loja e o registro store_member(owner) em uma transação atômica.
 * Usa SECURITY DEFINER para executar com privilégios do criador da função,
 * garantindo que a RLS não bloqueie o processo antes do membership existir.
 *
 * Segurança mantida porque:
 *   1. Checa auth.uid() IS NOT NULL → requer sessão ativa
 *   2. Força owner_id = auth.uid() → não pode criar loja como outro usuário
 *   3. Cria o store_member(owner) atomicamente → sem janela de inconsistência
 */
CREATE OR REPLACE FUNCTION public.create_store(
  p_name       TEXT,
  p_brand      TEXT    DEFAULT NULL,
  p_open_hour  SMALLINT DEFAULT 8,
  p_close_hour SMALLINT DEFAULT 22,
  p_timezone   TEXT    DEFAULT 'America/Sao_Paulo'
)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  brand       TEXT,
  timezone    TEXT,
  open_hour   SMALLINT,
  close_hour  SMALLINT,
  owner_id    UUID,
  created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID;
  v_store_id UUID;
BEGIN
  -- Garante que o chamador está autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: sessão inativa.';
  END IF;

  -- Validações básicas
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Nome da loja não pode ser vazio.';
  END IF;
  IF p_close_hour <= p_open_hour THEN
    RAISE EXCEPTION 'Horário de fechamento deve ser maior que o de abertura.';
  END IF;

  -- Insere a loja
  INSERT INTO public.stores (name, brand, timezone, open_hour, close_hour, owner_id)
  VALUES (trim(p_name), p_brand, p_timezone, p_open_hour, p_close_hour, v_user_id)
  RETURNING stores.id INTO v_store_id;

  -- Insere o membro owner (idempotente com ON CONFLICT)
  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (v_store_id, v_user_id, 'owner')
  ON CONFLICT (store_id, user_id) DO UPDATE SET role = 'owner';

  -- Retorna a loja criada
  RETURN QUERY
    SELECT
      s.id, s.name, s.brand, s.timezone,
      s.open_hour, s.close_hour, s.owner_id, s.created_at
    FROM public.stores s
    WHERE s.id = v_store_id;
END;
$$;

-- Garante que apenas usuários autenticados podem chamar a função
REVOKE ALL ON FUNCTION public.create_store FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_store TO authenticated;
