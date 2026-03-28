/**
 * Feature Flags - Escala que Converte
 *
 * Padrão:
 * - `VITE_USE_CLOUD_API` é opt-in e só liga quando for exatamente 'true'
 * - as flags legadas permanecem ON por padrão, a menos que sejam 'false'
 */

export const FLAGS = {
  /** Usa a API Node/TypeScript autenticada para ler/salvar dados da loja */
  USE_CLOUD_API: import.meta.env.VITE_USE_CLOUD_API === 'true',
  /** Persiste shifts, traffic e sales no Supabase após parse local */
  PERSIST_TO_SUPABASE: import.meta.env.VITE_PERSIST_TO_SUPABASE !== 'false',
  /** Exige autenticação - se false, pula login e vai direto ao dashboard */
  REQUIRE_AUTH: import.meta.env.VITE_REQUIRE_AUTH !== 'false',
  /** Carrega dados do DB no mount - se false, aguarda upload manual */
  LOAD_FROM_DB: import.meta.env.VITE_LOAD_FROM_DB !== 'false',
};

export default FLAGS;
