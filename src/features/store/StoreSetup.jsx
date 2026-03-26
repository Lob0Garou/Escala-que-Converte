import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Clock, Loader2 } from 'lucide-react';
import AuthShell from '../../components/layout/AuthShell';

const HOURS = Array.from({ length: 24 }, (_, index) => index);

const StoreSetup = ({ onCreateStore, isLoading, storeError }) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Centauro');
  const [openHour, setOpenHour] = useState(8);
  const [closeHour, setCloseHour] = useState(22);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (!name.trim()) {
      setLocalError('Informe o nome da loja.');
      return;
    }
    if (closeHour <= openHour) {
      setLocalError('O horario de fechamento deve ser maior que o de abertura.');
      return;
    }

    await onCreateStore({ name: name.trim(), brand, openHour, closeHour });
  };

  const displayError = localError || storeError;

  return (
    <AuthShell
      eyebrow="Primeiro setup"
      title="Configure sua loja. Defina o ritmo. Comece a leitura."
      description="De contexto ao workspace com nome, marca e horario de operacao para manter a analise coerente desde o primeiro acesso."
      metrics={[
        { label: 'Loja', value: 'Identificada' },
        { label: 'Horario', value: 'Definido' },
        { label: 'Equipe', value: 'Pronta' },
      ]}
    >
      <div className="rounded-[32px] border border-border/60 bg-bg-surface/72 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-2xl sm:bg-bg-surface/68 sm:p-8 lg:bg-bg-surface/64 lg:p-10">
        <div className="mb-8 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">Configuracao</p>
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Criar loja</h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            Configure os dados essenciais para iniciar sua analise operacional com consistencia.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="store-name" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Nome da loja *
            </label>
            <input
              id="store-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Centauro Shopping Iguatemi"
              className="w-full rounded-2xl border border-border/70 bg-bg-base px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-main focus:outline-none focus:ring-4 focus:ring-accent-main/10"
            />
          </div>

          <div>
            <label htmlFor="store-brand" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Marca / bandeira
            </label>
            <input
              id="store-brand"
              type="text"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="Centauro"
              className="w-full rounded-2xl border border-border/70 bg-bg-base px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-main focus:outline-none focus:ring-4 focus:ring-accent-main/10"
            />
          </div>

          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              <Clock size={12} className="mr-1 inline-block" />
              Horario de funcionamento
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="store-open-hour" className="mb-1 block text-[11px] font-semibold text-text-muted">
                  Abertura
                </label>
                <select
                  id="store-open-hour"
                  value={openHour}
                  onChange={(event) => setOpenHour(Number(event.target.value))}
                  className="w-full cursor-pointer rounded-2xl border border-border/70 bg-bg-base px-4 py-3 text-sm text-text-primary focus:border-accent-main focus:outline-none focus:ring-4 focus:ring-accent-main/10"
                >
                  {HOURS.map((hour) => (
                    <option key={hour} value={hour} className="bg-bg-surface text-text-primary">
                      {String(hour).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="store-close-hour" className="mb-1 block text-[11px] font-semibold text-text-muted">
                  Fechamento
                </label>
                <select
                  id="store-close-hour"
                  value={closeHour}
                  onChange={(event) => setCloseHour(Number(event.target.value))}
                  className="w-full cursor-pointer rounded-2xl border border-border/70 bg-bg-base px-4 py-3 text-sm text-text-primary focus:border-accent-main focus:outline-none focus:ring-4 focus:ring-accent-main/10"
                >
                  {HOURS.map((hour) => (
                    <option key={hour} value={hour} className="bg-bg-surface text-text-primary">
                      {String(hour).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {displayError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-bg px-4 py-3">
              <AlertCircle size={14} className="shrink-0 text-red-brand" />
              <p className="text-xs font-medium text-red-brand">{displayError}</p>
            </div>
          )}

          <button
            id="btn-create-store"
            type="submit"
            disabled={isLoading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-text-primary px-6 text-sm font-semibold text-bg-surface shadow-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {isLoading ? 'Criando loja...' : 'Criar loja e ir para o dashboard'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
};

export default StoreSetup;
