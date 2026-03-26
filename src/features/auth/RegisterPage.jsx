import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import AuthShell from '../../components/layout/AuthShell';

const RegisterPage = ({ onRegister, onGoToLogin, authError, isLoading }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');
    setSuccessMsg('');

    if (!fullName || !email || !password) {
      setLocalError('Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setLocalError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setLocalError('As senhas nao coincidem.');
      return;
    }

    const { error } = await onRegister(email, password, fullName);
    if (!error) {
      setSuccessMsg('Conta criada. Verifique seu e-mail, se necessario, e faca login.');
    }
  };

  const displayError = localError || authError;

  return (
    <AuthShell
      eyebrow="Novo workspace"
      title="Novo espaco. Analises reais. Resultados fortes."
      description="Crie sua conta para estruturar um painel de decisao com a mesma linguagem visual do workspace operacional."
      metrics={[
        { label: 'Setup', value: 'Rapido' },
        { label: 'Leitura', value: 'Executiva' },
        { label: 'Escala', value: 'Inteligente' },
      ]}
    >
      <div className="rounded-[32px] border border-border/60 bg-bg-surface/72 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-2xl sm:bg-bg-surface/68 sm:p-8 lg:bg-bg-surface/64 lg:p-10">
        <div className="mb-8 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">Criar conta</p>
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Comece agora</h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            Estruture seu primeiro workspace em uma experiencia mais compacta e mais clara.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="register-name" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Nome
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ex. Lider"
              className="w-full rounded-2xl border border-border/70 bg-bg-base px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-main focus:outline-none focus:ring-4 focus:ring-accent-main/10"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              E-mail
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-2xl border border-border/70 bg-bg-base px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-main focus:outline-none focus:ring-4 focus:ring-accent-main/10"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Senha
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimo 6 caracteres"
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

          <div>
            <label htmlFor="register-confirm" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Confirmar senha
            </label>
            <input
              id="register-confirm"
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Repita a senha"
              className="w-full rounded-2xl border border-border/70 bg-bg-base px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-main focus:outline-none focus:ring-4 focus:ring-accent-main/10"
            />
          </div>

          {displayError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-bg px-4 py-3">
              <AlertCircle size={14} className="shrink-0 text-red-brand" />
              <p className="text-xs font-medium text-red-brand">{displayError}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-green-500/20 bg-green-bg px-4 py-3">
              <CheckCircle2 size={14} className="shrink-0 text-green-brand" />
              <p className="text-xs font-medium text-green-brand">{successMsg}</p>
            </div>
          )}

          <button
            id="btn-register-submit"
            type="submit"
            disabled={isLoading}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-text-primary px-6 text-sm font-semibold text-bg-surface shadow-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {isLoading ? 'Configurando...' : 'Comecar agora'}
          </button>

          <p className="pt-2 text-center text-sm text-text-secondary">
            Ja tem conta?{' '}
            <button
              id="btn-go-to-login"
              type="button"
              onClick={onGoToLogin}
              className="font-semibold text-text-primary transition-colors hover:text-accent-main"
            >
              Fazer login
            </button>
          </p>
        </form>
      </div>
    </AuthShell>
  );
};

export default RegisterPage;
