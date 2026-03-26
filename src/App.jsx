import React, { useState } from 'react';
import Dashboard from './features/dashboard/Dashboard';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import StoreSetup from './features/store/StoreSetup';
import { useAuth } from './hooks/useAuth';
import { useStore } from './hooks/useStore';
import { FLAGS } from './lib/featureFlags';
import VortexBackdrop from './components/layout/VortexBackdrop';
import './App.css';

const ScreenLoader = ({ message }) => (
  <div className="relative isolate min-h-screen w-full overflow-hidden bg-bg-base">
    <VortexBackdrop
      className="z-0"
      imageClassName="opacity-[0.18] brightness-[1.08] contrast-[1.1] saturate-[1.1] sm:opacity-[0.22] lg:opacity-[0.26]"
      overlayClassName="bg-bg-base/76 sm:bg-bg-base/70"
      accentClassName="bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.08),transparent_32%),radial-gradient(circle_at_top_right,rgba(22,163,74,0.05),transparent_26%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(74,222,128,0.06),transparent_26%)]"
    />
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[28px] border border-border/60 bg-bg-surface/62 px-8 py-7 text-center shadow-[0_24px_80px_rgba(9,9,11,0.08)] backdrop-blur-2xl">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent-main" />
        <p className="text-sm font-medium text-text-secondary">{message}</p>
      </div>
    </div>
  </div>
);

/**
 * App — Orquestrador de roteamento de auth.
 *
 * Fluxo com REQUIRE_AUTH=true:
 *   1. Carregando sessão → tela de loading
 *   2. Não autenticado → LoginPage ou RegisterPage
 *   3. Autenticado sem loja → StoreSetup
 *   4. Autenticado com loja → Dashboard
 *
 * Fluxo com REQUIRE_AUTH=false (ou sem Supabase):
 *   → Dashboard direto (comportamento original)
 */
const App = () => {
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [showStoreSetup, setShowStoreSetup] = useState(false);

  const {
    user,
    isLoading: authLoading,
    authError,
    setAuthError,
    signIn,
    signUp,
    signOut,
  } = useAuth();

  const {
    stores,
    activeStore,
    isLoading: storeLoading,
    storeError,
    selectStore,
    createStore,
    deleteStore,
  } = useStore(user);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleLogin = async (email, password) => {
    const { error } = await signIn(email, password);
    return { error };
  };

  const handleRegister = async (email, password, fullName) => {
    const { error } = await signUp(email, password, fullName);
    return { error };
  };

  const handleCreateStore = async (storeData) => {
    const { error } = await createStore(storeData);
    if (!error) setShowStoreSetup(false);
  };

  // ─── Sem autenticação obrigatória → Dashboard direto ─────────────────────
  if (!FLAGS.REQUIRE_AUTH) {
    return <Dashboard />;
  }

  // ─── Carregando sessão ────────────────────────────────────────────────────
  if (authLoading) {
    return <ScreenLoader message="Verificando sessão…" />;
  }

  // ─── Não autenticado ──────────────────────────────────────────────────────
  if (!user) {
    if (authView === 'register') {
      return (
        <RegisterPage
          onRegister={handleRegister}
          onGoToLogin={() => { setAuthError(null); setAuthView('login'); }}
          authError={authError}
          isLoading={authLoading}
        />
      );
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        onGoToRegister={() => { setAuthError(null); setAuthView('register'); }}
        authError={authError}
        isLoading={authLoading}
      />
    );
  }

  // ─── Autenticado — carregando lojas ──────────────────────────────────────
  if (storeLoading) {
    return <ScreenLoader message="Carregando suas lojas…" />;
  }

  // ─── Autenticado sem loja, ou criação explícita ───────────────────────────
  if (!activeStore || showStoreSetup) {
    return (
      <StoreSetup
        onCreateStore={handleCreateStore}
        isLoading={storeLoading}
        storeError={storeError}
      />
    );
  }

  // ─── Autenticado com loja → Dashboard completo ───────────────────────────
  return (
    <Dashboard
      user={user}
      activeStore={activeStore}
      stores={stores}
      onSelectStore={selectStore}
      onCreateStore={() => setShowStoreSetup(true)}
      onDeleteStore={deleteStore}
      onSignOut={signOut}
    />
  );
};

export default App;
