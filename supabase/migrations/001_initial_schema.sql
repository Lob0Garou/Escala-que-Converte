-- ============================================================
-- 001_initial_schema.sql
-- Escala que Converte — Schema inicial
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM types
-- ============================================================
CREATE TYPE store_member_role AS ENUM ('owner', 'manager', 'viewer');
CREATE TYPE day_of_week_enum AS ENUM ('SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO');
CREATE TYPE schedule_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE schedule_source AS ENUM ('upload', 'manual', 'edge_function');
CREATE TYPE file_processing_status AS ENUM ('pending', 'processing', 'done', 'error');
CREATE TYPE optimization_status AS ENUM ('pending', 'running', 'done', 'error');

-- ============================================================
-- TABELA: profiles
-- Estende auth.users via trigger (ver 003_triggers.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: stores
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  brand       TEXT,
  timezone    TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  open_hour   SMALLINT NOT NULL DEFAULT 8  CHECK (open_hour BETWEEN 0 AND 23),
  close_hour  SMALLINT NOT NULL DEFAULT 22 CHECK (close_hour BETWEEN 1 AND 24),
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: store_members
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        store_member_role NOT NULL DEFAULT 'viewer',
  invited_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, user_id)
);

-- ============================================================
-- TABELA: employees
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: schedule_weeks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schedule_weeks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  week_start  DATE NOT NULL,
  status      schedule_status NOT NULL DEFAULT 'draft',
  source      schedule_source NOT NULL DEFAULT 'upload',
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, week_start)
);

-- ============================================================
-- TABELA: schedule_shifts
-- Mapeia diretamente para o staffRow client-side
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schedule_shifts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_week_id    UUID NOT NULL REFERENCES public.schedule_weeks(id) ON DELETE CASCADE,
  store_id            UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  employee_id         UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name       TEXT NOT NULL DEFAULT '',
  day_of_week         day_of_week_enum NOT NULL,
  entrada             TIME,
  intervalo           TIME,
  saida               TIME,
  saida_dia_seguinte  BOOLEAN NOT NULL DEFAULT FALSE,
  is_optimized        BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order          SMALLINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: traffic_data
-- Dados de fluxo/cupons por hora (arquivo "Cupons" / "Fluxo")
-- ============================================================
CREATE TABLE IF NOT EXISTS public.traffic_data (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  day_of_week     day_of_week_enum NOT NULL,
  hour            SMALLINT NOT NULL CHECK (hour BETWEEN 0 AND 23),
  flow_count      INTEGER NOT NULL DEFAULT 0,
  coupon_count    INTEGER NOT NULL DEFAULT 0,
  conversion_pct  NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, period_start, period_end, day_of_week, hour)
);

-- ============================================================
-- TABELA: sales_data
-- Dados de vendas por hora
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales_data (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  day_of_week     day_of_week_enum NOT NULL,
  hour            SMALLINT NOT NULL CHECK (hour BETWEEN 0 AND 23),
  sales_value     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, period_start, period_end, day_of_week, hour)
);

-- ============================================================
-- TABELA: optimization_results
-- Snapshot dos resultados do motor thermalBalance_v5 (client-side)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.optimization_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  schedule_week_id    UUID NOT NULL REFERENCES public.schedule_weeks(id) ON DELETE CASCADE,
  engine_version      TEXT NOT NULL DEFAULT 'v5',
  score_before        NUMERIC(8, 4),
  score_after         NUMERIC(8, 4),
  delta_revenue       NUMERIC(12, 2),
  shifts_snapshot     JSONB,
  status              optimization_status NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: uploaded_files
-- Registro de arquivos enviados (storage path para download)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  file_type           TEXT NOT NULL, -- 'schedule' | 'traffic' | 'sales' | 'image'
  file_name           TEXT NOT NULL,
  storage_path        TEXT,
  processing_status   file_processing_status NOT NULL DEFAULT 'pending',
  uploaded_by         UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_store_members_user_id     ON public.store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store_id    ON public.store_members(store_id);
CREATE INDEX IF NOT EXISTS idx_schedule_weeks_store_id   ON public.schedule_weeks(store_id);
CREATE INDEX IF NOT EXISTS idx_schedule_shifts_week_id   ON public.schedule_shifts(schedule_week_id);
CREATE INDEX IF NOT EXISTS idx_schedule_shifts_store_id  ON public.schedule_shifts(store_id);
CREATE INDEX IF NOT EXISTS idx_traffic_data_store_id     ON public.traffic_data(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_store_id       ON public.sales_data(store_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_store_id   ON public.uploaded_files(store_id);
CREATE INDEX IF NOT EXISTS idx_employees_store_id        ON public.employees(store_id);
CREATE INDEX IF NOT EXISTS idx_opt_results_store_id      ON public.optimization_results(store_id);
