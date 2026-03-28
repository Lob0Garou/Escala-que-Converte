import type { Request } from 'express';
import type { User } from '@supabase/supabase-js';

export const syncUserAccess = async (req: Request, user: User) => {
  if (!req.supabase) return;

  const { error } = await req.supabase.rpc('sync_user_access', {
    p_email: user.email ?? null,
    p_last_login_at: user.last_sign_in_at ?? null,
  });

  if (error) {
    console.error('[api] sync_user_access failed:', error.message);
  }
};

export const logActivity = async (
  req: Request,
  {
    action,
    entityType = null,
    entityId = null,
    storeId = null,
    metadata = {},
    errorCode = null,
  }: {
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    storeId?: string | null;
    metadata?: Record<string, unknown>;
    errorCode?: string | null;
  },
) => {
  if (!req.supabase || !req.auth?.user?.id) return;

  const { error } = await req.supabase.rpc('log_activity', {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_store_id: storeId,
    p_metadata_json: metadata,
    p_request_id: req.requestContext?.requestId ?? null,
    p_error_code: errorCode,
  });

  if (error) {
    console.error('[api] log_activity failed:', error.message);
  }
};
