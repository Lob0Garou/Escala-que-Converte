import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, supabaseConfigError } from '../lib/supabase';
import { FLAGS } from '../lib/featureFlags';
import { logActivity, syncUserAccess } from '../services/activityService';

/**
 * useAuth - Wrapper de auth sobre o Supabase client.
 *
 * Se REQUIRE_AUTH=false ou supabase=null, retorna user=null e isLoading=false
 * sem fazer nenhuma requisicao. O app se comporta exatamente como antes.
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const pendingLoginRef = useRef(false);

  useEffect(() => {
    // Modo offline / sem autenticacao
    if (!FLAGS.REQUIRE_AUTH || !supabase) {
      if (FLAGS.REQUIRE_AUTH && !supabase && supabaseConfigError) {
        setAuthError(supabaseConfigError);
      }
      setProfile(null);
      setIsProfileLoading(false);
      setIsLoading(false);
      return;
    }

    // Carrega sessao existente
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          setAuthError(error.message);
          setIsLoading(false);
          return;
        }
        setAuthError(null);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      })
      .catch((error) => {
        setAuthError(error?.message || 'Falha ao verificar sessao.');
        setIsLoading(false);
      });

    // Listener para mudancas de estado (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          pendingLoginRef.current = true;
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }

        setAuthError(null);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let ignore = false;

    const hydrateProfile = async () => {
      if (!FLAGS.REQUIRE_AUTH || !supabase || !user) {
        setProfile(null);
        setIsProfileLoading(false);
        return;
      }

      try {
        setIsProfileLoading(true);
        await syncUserAccess(user);

        const { data, error } = await supabase
          .from('profiles')
          .select(
            'id, full_name, email, platform_role, is_active, primary_store_id, created_at, first_login_at, last_login_at, last_seen_at',
          )
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!ignore) {
          setProfile(data || null);
        }

        if (pendingLoginRef.current) {
          pendingLoginRef.current = false;
          await logActivity({
            action: 'login',
            entityType: 'user',
            entityId: user.id,
            metadata: {
              email: user.email || null,
              lastSignInAt: user.last_sign_in_at || null,
            },
          });
        }
      } catch (error) {
        if (!ignore) {
          setAuthError(error?.message || 'Falha ao carregar o perfil autenticado.');
        }
      } finally {
        if (!ignore) {
          setIsProfileLoading(false);
        }
      }
    };

    hydrateProfile();

    return () => {
      ignore = true;
    };
  }, [user]);

  useEffect(() => {
    if (!FLAGS.REQUIRE_AUTH || !supabase || !user) return undefined;

    const syncPresence = () => {
      void syncUserAccess(user);
    };

    const intervalId = window.setInterval(syncPresence, 5 * 60 * 1000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncPresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) {
      const message = supabaseConfigError || 'Supabase nao configurado.';
      setAuthError(message);
      return { error: { message } };
    }

    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
      return { data, error };
    } catch (error) {
      const message = error?.message || 'Falha ao fazer login.';
      setAuthError(message);
      return { error: { message } };
    }
  }, []);

  const signUp = useCallback(async (email, password, fullName) => {
    if (!supabase) {
      const message = supabaseConfigError || 'Supabase nao configurado.';
      setAuthError(message);
      return { error: { message } };
    }

    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) setAuthError(error.message);
      return { data, error };
    } catch (error) {
      const message = error?.message || 'Falha ao criar conta.';
      setAuthError(message);
      return { error: { message } };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;

    try {
      await supabase.auth.signOut();
      setAuthError(null);
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error) {
      setAuthError(error?.message || 'Falha ao encerrar sessao.');
    }
  }, []);

  return {
    user,
    session,
    profile,
    isAdmin: profile?.platform_role === 'admin' && profile?.is_active !== false,
    isLoading,
    isProfileLoading,
    authError,
    setAuthError,
    signIn,
    signUp,
    signOut,
  };
};

export default useAuth;
