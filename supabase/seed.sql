-- ============================================================
-- seed.sql
-- Bootstrap local para camada administrativa e escopo padrao.
-- Ajuste o email abaixo para promover o admin principal.
-- ============================================================

DO $$
DECLARE
  v_org_id UUID;
  v_regional_id UUID;
BEGIN
  SELECT id
    INTO v_org_id
  FROM public.organizations
  WHERE code = 'default-org'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, code)
    VALUES ('Escala que Converte', 'default-org')
    RETURNING id INTO v_org_id;
  END IF;

  SELECT id
    INTO v_regional_id
  FROM public.regionals
  WHERE organization_id = v_org_id
    AND code = 'default-regional'
  LIMIT 1;

  IF v_regional_id IS NULL THEN
    INSERT INTO public.regionals (organization_id, name, code)
    VALUES (v_org_id, 'Regional Padrao', 'default-regional')
    RETURNING id INTO v_regional_id;
  END IF;

  UPDATE public.stores
  SET
    organization_id = COALESCE(organization_id, v_org_id),
    regional_id = COALESCE(regional_id, v_regional_id)
  WHERE organization_id IS NULL
     OR regional_id IS NULL;

  UPDATE public.profiles
  SET platform_role = 'admin'::public.platform_role
  WHERE LOWER(email) = LOWER('admin@escala.local');
END $$;
