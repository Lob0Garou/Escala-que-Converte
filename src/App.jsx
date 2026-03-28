import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { usePathname } from './hooks/usePathname';
import { useStore } from './hooks/useStore';
import { FLAGS } from './lib/featureFlags';
import VortexBackdrop from './components/layout/VortexBackdrop';
import './App.css';

const AdminPage = lazy(() => import('./features/admin/AdminPage'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const StoreSetup = lazy(() => import('./features/store/StoreSetup'));

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

const AccessDisabled = ({ onSignOut }) => (
  <div className="relative isolate min-h-screen w-full overflow-hidden bg-bg-base">
    <VortexBackdrop
      className="z-0"
      imageClassName="opacity-[0.18] brightness-[1.08] contrast-[1.1]"
      overlayClassName="bg-bg-base/76 sm:bg-bg-base/70"
      accentClassName="bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.08),transparent_28%)]"
    />
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-[30px] border border-border/60 bg-bg-surface/70 p-8 text-center shadow-[0_24px_80px_rgba(9,9,11,0.12)] backdrop-blur-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">
          Acesso bloqueado
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">
          Este perfil esta desativado
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          O acesso logico desta conta foi desativado por um administrador. Se isso
          estiver incorreto, reative o perfil pela console administrativa.
        </p>
        <div className="mt-6 flex justify-center">
          <button
            onClick={onSignOut}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border/70 bg-bg-elevated/85 px-5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-overlay/40"
          >
            Encerrar sessao
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ScreenSuspense = ({ message, children }) => (
  <Suspense fallback={<ScreenLoader message={message} />}>{children}</Suspense>
);

const App = () => {
  const [authView, setAuthView] = useState('login');
  const [showStoreSetup, setShowStoreSetup] = useState(false);
  const { pathname, navigate, isAdminRoute } = usePathname();

  const {
    user,
    profile,
    isAdmin,
    isLoading: authLoading,
    isProfileLoading,
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
  } = useStore(user, profile?.primary_store_id || null);

  useEffect(() => {
    if (!FLAGS.REQUIRE_AUTH || !user) return;
    if (showStoreSetup) return;
    if (isAdmin && !activeStore && pathname !== '/admin') {
      navigate('/admin', { replace: true });
    }
  }, [activeStore, isAdmin, navigate, pathname, showStoreSetup, user]);

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

  const handleNavigateFromAdminToDashboard = () => {
    if (!activeStore) {
      setShowStoreSetup(true);
      navigate('/');
      return;
    }

    setShowStoreSetup(false);
    navigate('/');
  };

  if (!FLAGS.REQUIRE_AUTH) {
    return (
      <ScreenSuspense message="Carregando dashboard...">
        <Dashboard />
      </ScreenSuspense>
    );
  }

  if (authLoading) {
    return <ScreenLoader message="Verificando sessao..." />;
  }

  if (!user) {
    if (authView === 'register') {
      return (
        <ScreenSuspense message="Carregando cadastro...">
          <RegisterPage
            onRegister={handleRegister}
            onGoToLogin={() => {
              setAuthError(null);
              setAuthView('login');
            }}
            authError={authError}
            isLoading={authLoading}
          />
        </ScreenSuspense>
      );
    }

    return (
      <ScreenSuspense message="Carregando login...">
        <LoginPage
          onLogin={handleLogin}
          onGoToRegister={() => {
            setAuthError(null);
            setAuthView('register');
          }}
          authError={authError}
          isLoading={authLoading}
        />
      </ScreenSuspense>
    );
  }

  if (isProfileLoading) {
    return <ScreenLoader message="Carregando perfil..." />;
  }

  if (profile?.is_active === false) {
    return <AccessDisabled onSignOut={signOut} />;
  }

  if (showStoreSetup || (!activeStore && !isAdmin)) {
    return (
      <ScreenSuspense message="Carregando configuracao da loja...">
        <StoreSetup
          onCreateStore={handleCreateStore}
          isLoading={storeLoading}
          storeError={storeError}
        />
      </ScreenSuspense>
    );
  }

  if (isAdminRoute || (isAdmin && !activeStore)) {
    return (
      <ScreenSuspense message="Carregando console administrativa...">
        <AdminPage
          user={user}
          profile={profile}
          onNavigateDashboard={handleNavigateFromAdminToDashboard}
          onSignOut={signOut}
        />
      </ScreenSuspense>
    );
  }

  if (storeLoading) {
    return <ScreenLoader message="Carregando suas lojas..." />;
  }

  if (!activeStore || showStoreSetup) {
    return (
      <ScreenSuspense message="Carregando configuracao da loja...">
        <StoreSetup
          onCreateStore={handleCreateStore}
          isLoading={storeLoading}
          storeError={storeError}
        />
      </ScreenSuspense>
    );
  }

  return (
    <ScreenSuspense message="Carregando dashboard...">
      <Dashboard
        user={user}
        profile={profile}
        activeStore={activeStore}
        stores={stores}
        onSelectStore={selectStore}
        onCreateStore={() => setShowStoreSetup(true)}
        onDeleteStore={deleteStore}
        onSignOut={signOut}
        onOpenAdmin={isAdmin ? () => navigate('/admin') : undefined}
      />
    </ScreenSuspense>
  );
};

export default App;
