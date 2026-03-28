import type { SupabaseClient, User } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      auth: {
        token: string;
        user: User;
        platformRole: string;
        profile: {
          id: string;
          email: string | null;
          full_name: string | null;
          platform_role: string;
          first_login_at?: string | null;
          last_login_at?: string | null;
          last_seen_at?: string | null;
        } | null;
      };
      supabase: SupabaseClient;
      storeMembership: {
        storeId: string;
        role: string;
      };
      requestContext: {
        requestId: string;
        startedAt: number;
        errorCode: string | null;
      };
    }
  }
}

export {};
