import { useCallback, useEffect, useState } from 'react';
import { supabase, supabaseConfigError } from '../lib/supabase';
import { FLAGS } from '../lib/featureFlags';

/**
 * useAuth - Wrapper de auth sobre o Supabase client.
 *
 * Se REQUIRE_AUTH=false ou supabase=null, retorna user=null e isLoading=false
 * sem fazer nenhuma requisicao. O app se comporta exatamente como antes.
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Modo offline / sem autenticacao
    if (!FLAGS.REQUIRE_AUTH || !supabase) {
      if (FLAGS.REQUIRE_AUTH && !supabase && supabaseConfigError) {
        setAuthError(supabaseConfigError);
      }
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
      (_event, session) => {
        setAuthError(null);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

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
    } catch (error) {
      setAuthError(error?.message || 'Falha ao encerrar sessao.');
    }
  }, []);

  return {
    user,
    session,
    isLoading,
    authError,
    setAuthError,
    signIn,
    signUp,
    signOut,
  };
};

export default useAuth;
