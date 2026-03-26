-- ============================================================
-- 002_rls_policies.sql
-- Escala que Converte — Row Level Security
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_weeks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_shifts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_data       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_data         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper functions
-- ============================================================

/**
 * Retorna TRUE se o usuário autenticado tem acesso à loja (qualquer role).
 * Usar em políticas SELECT das tabelas de dados.
 */
CREATE OR REPLACE FUNCTION public.user_has_store_access(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = p_store_id
      AND user_id  = auth.uid()
  );
$$;

/**
 * Retorna o role do usuário autenticado para a loja.
 * Retorna NULL se não tem acesso.
 */
CREATE OR REPLACE FUNCTION public.user_store_role(p_store_id UUID)
RETURNS store_member_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.store_members
  WHERE store_id = p_store_id
    AND user_id  = auth.uid()
  LIMIT 1;
$$;

/**
 * Retorna TRUE se o usuário tem role manager OU owner para a loja.
 */
CREATE OR REPLACE FUNCTION public.user_can_write_store(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = p_store_id
      AND user_id  = auth.uid()
      AND role IN ('manager', 'owner')
  );
$$;

-- ============================================================
-- POLÍTICAS: profiles
-- ============================================================
-- Usuário pode ver e editar apenas o próprio perfil
CREATE POLICY "profiles: ver proprio perfil"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: editar proprio perfil"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- POLÍTICAS: stores
-- ============================================================
-- Qualquer membro pode ver a loja
CREATE POLICY "stores: ver lojas com acesso"
  ON public.stores FOR SELECT
  USING (user_has_store_access(id));

-- Apenas owner pode criar via INSERT (trigger cria o membro)
CREATE POLICY "stores: owner cria loja"
  ON public.stores FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Apenas manager/owner podem atualizar
CREATE POLICY "stores: manager ou owner atualiza"
  ON public.stores FOR UPDATE
  USING (user_can_write_store(id))
  WITH CHECK (user_can_write_store(id));

-- Apenas o owner pode deletar
CREATE POLICY "stores: owner deleta"
  ON public.stores FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================
-- POLÍTICAS: store_members
-- ============================================================
-- Qualquer membro pode ver os outros membros da loja
CREATE POLICY "store_members: ver membros da loja"
  ON public.store_members FOR SELECT
  USING (user_has_store_access(store_id));

-- Apenas owner pode adicionar membros
CREATE POLICY "store_members: owner adiciona membros"
  ON public.store_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = store_id
        AND sm.user_id  = auth.uid()
        AND sm.role     = 'owner'
    )
  );

-- Apenas owner pode alterar roles
CREATE POLICY "store_members: owner altera role"
  ON public.store_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = store_members.store_id
        AND sm.user_id  = auth.uid()
        AND sm.role     = 'owner'
    )
  );

-- Apenas owner pode remover membros (ou o próprio usuário saindo)
CREATE POLICY "store_members: owner remove membro ou auto-saida"
  ON public.store_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = store_members.store_id
        AND sm.user_id  = auth.uid()
        AND sm.role     = 'owner'
    )
  );

-- ============================================================
-- POLÍTICAS: employees
-- ============================================================
CREATE POLICY "employees: ver com acesso"
  ON public.employees FOR SELECT
  USING (user_has_store_access(store_id));

CREATE POLICY "employees: manager/owner insere"
  ON public.employees FOR INSERT
  WITH CHECK (user_can_write_store(store_id));

CREATE POLICY "employees: manager/owner atualiza"
  ON public.employees FOR UPDATE
  USING (user_can_write_store(store_id))
  WITH CHECK (user_can_write_store(store_id));

CREATE POLICY "employees: manager/owner deleta"
  ON public.employees FOR DELETE
  USING (user_can_write_store(store_id));

-- ============================================================
-- POLÍTICAS: schedule_weeks
-- ============================================================
CREATE POLICY "schedule_weeks: ver com acesso"
  ON public.schedule_weeks FOR SELECT
  USING (user_has_store_access(store_id));

CREATE POLICY "schedule_weeks: manager/owner insere"
  ON public.schedule_weeks FOR INSERT
  WITH CHECK (user_can_write_store(store_id));

CREATE POLICY "schedule_weeks: manager/owner atualiza"
  ON public.schedule_weeks FOR UPDATE
  USING (user_can_write_store(store_id))
  WITH CHECK (user_can_write_store(store_id));

CREATE POLICY "schedule_weeks: owner deleta"
  ON public.schedule_weeks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = store_id
        AND sm.user_id  = auth.uid()
        AND sm.role     = 'owner'
    )
  );

-- ============================================================
-- POLÍTICAS: schedule_shifts
-- ============================================================
CREATE POLICY "schedule_shifts: ver com acesso"
  ON public.schedule_shifts FOR SELECT
  USING (user_has_store_access(store_id));

CREATE POLICY "schedule_shifts: manager/owner insere"
  ON public.schedule_shifts FOR INSERT
  WITH CHECK (user_can_write_store(store_id));

CREATE POLICY "schedule_shifts: manager/owner atualiza"
  ON public.schedule_shifts FOR UPDATE
  USING (user_can_write_store(store_id))
  WITH CHECK (user_can_write_store(store_id));

CREATE POLICY "schedule_shifts: manager/owner deleta"
  ON public.schedule_shifts FOR DELETE
  USING (user_can_write_store(store_id));

-- ============================================================
-- POLÍTICAS: traffic_data
-- ============================================================
CREATE POLICY "traffic_data: ver com acesso"
  ON public.traffic_data FOR SELECT
  USING (user_has_store_access(store_id));

CREATE POLICY "traffic_data: manager/owner insere"
  ON public.traffic_data FOR INSERT
  WITH CHECK (user_can_write_store(store_id));

CREATE POLICY "traffic_data: manager/owner atualiza"
  ON public.traffic_data FOR UPDATE
  USING (user_can_write_store(store_id))
  WITH CHECK (user_can_write_store(store_id));

CREATE POLICY "traffic_data: manager/owner deleta"
  ON public.traffic_data FOR DELETE
  USING (user_can_write_store(store_id));

-- ============================================================
-- POLÍTICAS: sales_data
-- ============================================================
CREATE POLICY "sales_data: ver com acesso"
  ON public.sales_data FOR SELECT
  USING (user_has_store_access(store_id));

CREATE POLICY "sales_data: manager/owner insere"
  ON public.sales_data FOR INSERT
  WITH CHECK (user_can_write_store(store_id));

CREATE POLICY "sales_data: manager/owner atualiza"
  ON public.sales_data FOR UPDATE
  USING (user_can_write_store(store_id))
  WITH CHECK (user_can_write_store(store_id));

CREATE POLICY "sales_data: manager/owner deleta"
  ON public.sales_data FOR DELETE
  USING (user_can_write_store(store_id));

-- ============================================================
-- POLÍTICAS: optimization_results
-- ============================================================
CREATE POLICY "optimization_results: ver com acesso"
  ON public.optimization_results FOR SELECT
  USING (user_has_store_access(store_id));

CREATE POLICY "optimization_results: manager/owner insere"
  ON public.optimization_results FOR INSERT
  WITH CHECK (user_can_write_store(store_id));

CREATE POLICY "optimization_results: manager/owner atualiza"
  ON public.optimization_results FOR UPDATE
  USING (user_can_write_store(store_id))
  WITH CHECK (user_can_write_store(store_id));

-- ============================================================
-- POLÍTICAS: uploaded_files
-- ============================================================
CREATE POLICY "uploaded_files: ver com acesso"
  ON public.uploaded_files FOR SELECT
  USING (user_has_store_access(store_id));

CREATE POLICY "uploaded_files: manager/owner insere"
  ON public.uploaded_files FOR INSERT
  WITH CHECK (user_can_write_store(store_id));

CREATE POLICY "uploaded_files: manager/owner atualiza"
  ON public.uploaded_files FOR UPDATE
  USING (user_can_write_store(store_id))
  WITH CHECK (user_can_write_store(store_id));
