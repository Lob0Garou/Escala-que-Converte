import { createClient } from '@supabase/supabase-js';
import env from '../config/env.js';

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};

const authClient = createClient(env.supabaseUrl, env.supabaseAnonKey, clientOptions);

export const getUserFromToken = async (accessToken: string) => {
  return authClient.auth.getUser(accessToken);
};

export const createRequestSupabaseClient = (accessToken: string) =>
  createClient(env.supabaseUrl, env.supabaseAnonKey, {
    ...clientOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
