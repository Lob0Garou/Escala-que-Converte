import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import AuthShell from '../../components/layout/AuthShell';

const LoginPage = ({ onLogin, onGoToRegister, authError, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Preencha e-mail e senha.');
      return;
    }

    await onLogin(email, password);
  };

  const displayError = localError || authError;

  return (
    <AuthShell
      eyebrow="Acesso seguro"
      title="Leia o fluxo. Ajuste a cobertura. Converta mais."
      description="Entre no workspace para acompanhar fluxo, cobertura e impacto financeiro em um ambiente mais enxuto, consistente e pronto para decisao."
      metrics={[
        { label: 'Fluxo', value: 'Tempo real' },
        { label: 'Cobertura', value: 'Por hora' },
        { label: 'Impacto', value: 'Receita' },
      ]}
    >
      <div className="rounded-[32px] border border-border/60 bg-bg-surface/72 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-2xl sm:bg-bg-surface/68 sm:p-8 lg:bg-bg-surface/64 lg:p-10">
        <div className="mb-8 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">Entrar</p>
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Acesse o workspace</h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            Continue sua leitura operacional em uma interface mais direta e mais equilibrada.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-2xl border border-border/70 bg-bg-base px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-main focus:outline-none focus:ring-4 focus:ring-accent-main/10"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Senha
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-border/70 bg-bg-base px-4 py-3 pr-11 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-main focus:outline-none focus:ring-4 focus:ring-accent-main/10"
              />
              <button
                type="button"
                onClick={() => setShowPwd((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-primary"
                tabIndex={-1}
                aria-label="Mostrar ou ocultar senha"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {displayError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-bg px-4 py-3">
              <AlertCircle size={14} className="shrink-0 text-red-brand" />
              <p className="text-xs font-medium text-red-brand">{displayError}</p>
            </div>
          )}

          <button
            id="btn-login-submit"
            type="submit"
            disabled={isLoading}
            className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-text-primary px-6 text-sm font-semibold text-bg-surface shadow-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {isLoading ? 'Acessando...' : 'Acessar workspace'}
          </button>

          <p className="pt-2 text-center text-sm text-text-secondary">
            Ainda nao tem acesso?{' '}
            <button
              id="btn-go-to-register"
              type="button"
              onClick={onGoToRegister}
              className="font-semibold text-text-primary transition-colors hover:text-accent-main"
            >
              Criar uma conta
            </button>
          </p>
        </form>
      </div>
    </AuthShell>
  );
};

export default LoginPage;
