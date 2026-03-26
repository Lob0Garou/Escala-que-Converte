import React from 'react';
import { Moon, Sun } from 'lucide-react';
import RemoveBgImage from '../RemoveBgImage';
import CENTAURO_BRAND from '../../lib/centauro_brand_assets';
import StoreSelector from '../../features/store/StoreSelector';
import { useTheme } from '../../hooks/useTheme';

export const Header = ({
  user,
  stores,
  activeStore,
  onSelectStore,
  onCreateStore,
  onDeleteStore,
  onSignOut,
  theme: themeProp,
  onToggleTheme,
}) => {
  const hasAuth = Boolean(user);
  const themeState = useTheme();
  const theme = themeProp ?? themeState.theme;
  const toggleTheme = onToggleTheme ?? themeState.toggleTheme;
  const todayLabel = new Date()
    .toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })
    .replace('.', '');

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-border/70 bg-bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-bg-surface/80 transition-colors duration-300">
      <div className="page-shell grid min-h-[68px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-bg-elevated shadow-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-text-primary"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">
              Painel executivo
            </p>
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-sm font-semibold tracking-tight text-text-primary sm:text-base">
                ESCALA QUE CONVERTE
              </h1>
              <span className="hidden rounded-full border border-border bg-bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary sm:inline-flex">
                Pro v2
              </span>
            </div>
          </div>
        </div>

        <div className="hidden justify-center xl:flex">
          <RemoveBgImage
            src={CENTAURO_BRAND.headerLogo}
            alt="Centauro"
            className={`h-7 w-auto object-contain transition-all duration-300 ${
              theme === 'dark' ? 'brightness-0 invert opacity-70' : 'brightness-0 opacity-30'
            }`}
          />
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          <div className="hidden 2xl:flex items-center gap-2 rounded-full border border-border/70 bg-bg-elevated/80 px-3 py-1.5 text-xs font-medium text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="tabular-nums">{todayLabel}</span>
          </div>

          {hasAuth && (
            <div className="min-w-0 w-[168px] sm:w-[208px] xl:w-[232px]">
              <StoreSelector
                stores={stores}
                activeStore={activeStore}
                onSelect={onSelectStore}
                onCreateNew={onCreateStore}
                onDeleteStore={onDeleteStore}
                onSignOut={onSignOut}
                user={user}
              />
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-bg-elevated text-text-muted transition-colors hover:bg-bg-overlay/40 hover:text-text-primary"
            title={theme === 'dark' ? 'Mudar para Light Mode' : 'Mudar para Dark Mode'}
            aria-label="Alternar Tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
