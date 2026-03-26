/**
 * Feature Flags — Escala que Converte
 *
 * Padrão: todas as flags ON (true) se as vars não forem explicitamente 'false'.
 * Para desligar uma flag, defina a variável de ambiente como 'false' no .env:
 *   VITE_PERSIST_TO_SUPABASE=false
 *   VITE_REQUIRE_AUTH=false
 *   VITE_LOAD_FROM_DB=false
 *
 * Com todas as flags OFF, o app funciona 100% client-side como antes.
 */

export const FLAGS = {
  /** Persiste shifts, traffic e sales no Supabase após parse local */
  PERSIST_TO_SUPABASE: import.meta.env.VITE_PERSIST_TO_SUPABASE !== 'false',
  /** Exige autenticação — se false, pula login e vai direto ao dashboard */
  REQUIRE_AUTH: import.meta.env.VITE_REQUIRE_AUTH !== 'false',
  /** Carrega dados do DB no mount — se false, aguarda upload manual */
  LOAD_FROM_DB: import.meta.env.VITE_LOAD_FROM_DB !== 'false',
};

export default FLAGS;
