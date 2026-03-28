import type { RequestHandler } from 'express';
import { logActivity, syncUserAccess } from '../lib/activity.js';
import { ApiError } from '../lib/errors.js';
import { createRequestSupabaseClient, getUserFromToken } from '../lib/supabase.js';

const extractBearerToken = (headerValue?: string) => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
};

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const accessToken = extractBearerToken(req.headers.authorization);
    if (!accessToken) {
      throw new ApiError(401, 'Token Bearer ausente.', undefined, 'unauthorized');
    }

    const { data, error } = await getUserFromToken(accessToken);
    if (error || !data.user) {
      throw new ApiError(401, 'Token invalido ou expirado.', error?.message, 'unauthorized');
    }

    const requestSupabase = createRequestSupabaseClient(accessToken);

    req.auth = {
      token: accessToken,
      user: data.user,
      platformRole: 'viewer',
      profile: null,
    };
    req.supabase = requestSupabase;

    await syncUserAccess(req, data.user);

    const { data: profile, error: profileError } = await requestSupabase
      .from('profiles')
      .select('id, email, full_name, platform_role, first_login_at, last_login_at, last_seen_at')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      throw new ApiError(500, 'Falha ao carregar o perfil autenticado.', profileError.message, 'profile_load_failed');
    }

    const previousLoginAt = profile?.last_login_at || null;
    req.auth.platformRole = profile?.platform_role || 'viewer';
    req.auth.profile = profile || null;

    if (data.user.last_sign_in_at && data.user.last_sign_in_at !== previousLoginAt) {
      await logActivity(req, {
        action: 'login',
        entityType: 'user',
        entityId: data.user.id,
        metadata: {
          email: data.user.email || null,
          lastSignInAt: data.user.last_sign_in_at,
        },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
