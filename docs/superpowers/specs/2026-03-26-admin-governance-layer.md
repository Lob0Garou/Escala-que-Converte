# Spec: Admin Governance Layer

**Data**: 2026-03-26  
**Status**: Implementado  
**Escopo**: `server/`, `supabase/migrations/008_admin_governance.sql`, `supabase/seed.sql`

---

## Objetivo

Expandir o backend SaaS inicial para uma camada administrativa global com:

- visao consolidada de usuarios, lojas e dados operacionais;
- papeis `admin`, `manager` e `viewer`;
- rastreabilidade por `created_by`, `updated_by`, `created_at` e `updated_at`;
- auditoria de uso, leitura, escrita e falhas relevantes;
- base pronta para `organization_id`, `regional_id` e `store_id`.

---

## Novas entidades e extensoes

- `organizations`
- `regionals`
- `activity_logs`
- `schedule_versions`
- `week_snapshot_versions`

Extensoes em tabelas existentes:

- `profiles`: `email`, `platform_role`, `first_login_at`, `last_login_at`, `last_seen_at`
- `stores`: `organization_id`, `regional_id`, `created_by`, `updated_by`
- tabelas operacionais: `created_by`, `updated_by`
- `schedule_weeks`: `current_schedule_version`, `current_snapshot_version`, `updated_by`

---

## Endpoints administrativos

- `GET /api/admin/users`
- `GET /api/admin/stores`
- `GET /api/admin/schedules`
- `GET /api/admin/flows`
- `GET /api/admin/uploads`
- `GET /api/admin/activity`
- `GET /api/admin/stores/:storeId/details`

Todos exigem:

- Bearer token valido do Supabase
- papel global `admin`

---

## Observabilidade

Cada request passa por contexto estruturado com:

- `requestId`
- `route`
- `method`
- `userId`
- `platformRole`
- `storeId`
- `statusCode`
- `durationMs`
- `errorCode`

As respostas da API seguem contrato padrao:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

```json
{
  "ok": false,
  "error": {
    "message": "...",
    "code": "..."
  },
  "meta": {
    "requestId": "..."
  }
}
```

---

## Bootstrap

`supabase/seed.sql` cria:

- organizacao padrao
- regional padrao
- backfill de lojas sem escopo
- promocao opcional do email `admin@escala.local` para `admin`

Troque o email do seed antes de usar em ambiente real.
