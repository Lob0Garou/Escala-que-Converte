import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const rootEnvPath = fileURLToPath(new URL('../../../.env', import.meta.url));
const serverEnvPath = fileURLToPath(new URL('../../.env', import.meta.url));

const loadEnvFile = (filePath: string) => {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
};

loadEnvFile(rootEnvPath);
loadEnvFile(serverEnvPath);

const rawEnvSchema = z.object({
  API_HOST: z.string().trim().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(8787),
  FRONTEND_ORIGIN: z.string().trim().optional(),
  SUPABASE_URL: z.string().trim().optional(),
  SUPABASE_ANON_KEY: z.string().trim().optional(),
  VITE_SUPABASE_URL: z.string().trim().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().trim().optional(),
});

const parsedEnv = rawEnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Configuracao invalida do backend: ${parsedEnv.error.message}`);
}

const supabaseUrl = parsedEnv.data.SUPABASE_URL || parsedEnv.data.VITE_SUPABASE_URL;
const supabaseAnonKey = parsedEnv.data.SUPABASE_ANON_KEY || parsedEnv.data.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase nao configurado para o backend. Defina SUPABASE_URL/SUPABASE_ANON_KEY ou reutilize VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.',
  );
}

const frontendOrigins = parsedEnv.data.FRONTEND_ORIGIN
  ? parsedEnv.data.FRONTEND_ORIGIN
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

export const env = {
  apiHost: parsedEnv.data.API_HOST,
  apiPort: parsedEnv.data.API_PORT,
  frontendOrigins,
  supabaseUrl,
  supabaseAnonKey,
};

export default env;
