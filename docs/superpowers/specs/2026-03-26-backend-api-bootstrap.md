# Spec: Backend API Bootstrap

**Data**: 2026-03-26  
**Status**: Implementado  
**Escopo**: `server/`, `package.json`, `.env.example`

---

## Objetivo

Adicionar a primeira camada de backend Node.js + TypeScript sem quebrar o frontend atual que ainda conversa direto com o Supabase.

O backend nasce como um mediador autenticado:

- valida o Bearer token do Supabase;
- verifica acesso do usuário à `storeId`;
- expõe rotas REST para leitura consolidada e persistência da semana.

---

## Endpoints iniciais

- `GET /api/health`
- `GET /api/stores/:storeId/analysis-data?weekStart=YYYY-MM-DD`
- `PUT /api/stores/:storeId/schedules`
- `PUT /api/stores/:storeId/week-snapshot`

---

## Decisão de implementação

Nesta primeira fatia, o backend usa `@supabase/supabase-js` com um cliente request-scoped carregando o JWT do usuário no header `Authorization`.

Isso mantém o RLS atual como fonte de verdade e evita reescrever toda a camada de dados antes de estabilizar a fronteira `/api`.

Prisma/Drizzle continuam possíveis para a próxima etapa, quando o parsing server-side e a ingestão por upload entrarem no backend.

---

## Scripts

- `npm run dev:api`
- `npm run build:api`
- `npm run start:api`
- `npm run build:all`

---

## Variáveis de ambiente

- `API_PORT`
- `FRONTEND_ORIGIN`
- `SUPABASE_URL` ou `VITE_SUPABASE_URL`
- `SUPABASE_ANON_KEY` ou `VITE_SUPABASE_ANON_KEY`

---

## Próximo corte recomendado

1. Mover o frontend para consumir `GET /analysis-data`, `PUT /schedules` e `PUT /week-snapshot` por feature flag.
2. Criar `POST /api/stores/:storeId/upload` para tirar parsing e chaves sensíveis do navegador.
3. Só depois decidir se a camada de queries merece Prisma/Drizzle ou se o SQL/RPC atual continua suficiente.
