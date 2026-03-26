import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigError = hasSupabaseConfig
  ? null
  : 'Autenticacao indisponivel neste deploy. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.';

// Cliente inicializado apenas se as variaveis estiverem configuradas.
// Isso permite que o app funcione sem Supabase quando as flags estiverem desligadas.
export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export default supabase;
