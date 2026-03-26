import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FLAGS } from '../lib/featureFlags';

/**
 * useAuth — Wrapper de auth sobre o Supabase client.
 *
 * Se REQUIRE_AUTH=false ou supabase=null, retorna user=null e isLoading=false
 * sem fazer nenhuma requisição. O app se comporta exatamente como antes.
 */
export const useAuth = () => {
  const [user, setUser]         = useState(null);
  const [session, setSession]   = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Modo offline / sem autenticação
    if (!FLAGS.REQUIRE_AUTH || !supabase) {
      setIsLoading(false);
      return;
    }

    // Carrega sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listener para mudanças de estado (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: 'Supabase não configurado.' } };
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    return { data, error };
  }, []);

  const signUp = useCallback(async (email, password, fullName) => {
    if (!supabase) return { error: { message: 'Supabase não configurado.' } };
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) setAuthError(error.message);
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
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
