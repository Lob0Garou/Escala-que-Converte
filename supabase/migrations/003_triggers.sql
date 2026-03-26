-- ============================================================
-- 003_triggers.sql
-- Escala que Converte — Triggers automáticos
-- ============================================================

-- ============================================================
-- TRIGGER 1: Criar profile ao registrar novo usuário
-- Disparado em INSERT em auth.users
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Remove trigger existente para permitir re-apply limpo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER 2: Criar membro owner ao criar loja
-- Disparado em INSERT em public.stores
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_store()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (store_id, user_id) DO UPDATE
    SET role = 'owner';
  RETURN NEW;
END;
$$;

-- Remove trigger existente para permitir re-apply limpo
DROP TRIGGER IF EXISTS on_store_created ON public.stores;

CREATE TRIGGER on_store_created
  AFTER INSERT ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_store();

-- ============================================================
-- TRIGGER 3: Atualizar updated_at automaticamente
-- Aplicado em todas as tabelas que têm a coluna
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Aplica o trigger de updated_at em cada tabela relevante
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles', 'stores', 'employees', 'schedule_weeks',
    'schedule_shifts', 'traffic_data', 'sales_data',
    'optimization_results', 'uploaded_files'
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
