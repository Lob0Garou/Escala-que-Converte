import React, { useRef, useState } from 'react';
import { ChevronDown, LogOut, Plus, Store, Trash2 } from 'lucide-react';

const StoreSelector = ({ stores = [], activeStore, onSelect, onCreateNew, onDeleteStore, onSignOut, user }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const handleSelect = (store) => {
    onSelect(store);
    setOpen(false);
  };

  const displayName = activeStore?.name ?? 'Selecionar loja';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        id="btn-store-selector"
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-full min-w-0 items-center gap-2 rounded-2xl border border-border/70 bg-bg-elevated/80 px-3 text-left text-sm font-medium text-text-primary shadow-sm transition-all duration-150 hover:bg-bg-overlay/40"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-bg-surface text-[10px] font-bold text-text-secondary">
          {initials}
        </span>
        <span className="min-w-0 flex-1 truncate text-text-primary">{displayName}</span>
        <ChevronDown size={12} className={`shrink-0 text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-[24px] border border-border/70 bg-bg-surface/95 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur">
            {user?.email && (
              <div className="border-b border-border/70 px-4 py-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Conta
                </p>
                <p className="truncate text-sm text-text-secondary">{user.email}</p>
              </div>
            )}

            <div className="custom-scroll max-h-52 overflow-y-auto py-1">
              {stores.length === 0 ? (
                <p className="px-4 py-3 text-sm italic text-text-muted">Nenhuma loja cadastrada</p>
              ) : (
                stores.map((store) => (
                  <div key={store.id} className="group/store relative">
                    <button
                      type="button"
                      onClick={() => handleSelect(store)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                        activeStore?.id === store.id
                          ? 'bg-accent-light text-text-primary'
                          : 'text-text-secondary hover:bg-bg-elevated/80 hover:text-text-primary'
                      }`}
                    >
                      <Store size={14} className="shrink-0 text-text-muted" />
                      <div className="min-w-0 pr-8">
                        <p className="truncate font-medium">{store.name}</p>
                        {store.brand && <p className="truncate text-[11px] text-text-muted">{store.brand}</p>}
                      </div>
                      {activeStore?.id === store.id && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent-main" />}
                    </button>

                    {onDeleteStore && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (window.confirm(`Deseja realmente excluir a loja ${store.name}? Essa acao nao pode ser desfeita.`)) {
                            onDeleteStore(store.id);
                          }
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-text-muted opacity-0 transition-all hover:bg-bg-elevated/80 hover:text-red-brand group-hover/store:opacity-100 focus:opacity-100"
                        title="Excluir loja"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border/70 py-1">
              {onCreateNew && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onCreateNew();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-secondary transition-colors hover:bg-bg-elevated/80 hover:text-text-primary"
                >
                  <Plus size={14} className="shrink-0" />
                  Nova loja
                </button>
              )}
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSignOut();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-brand/85 transition-colors hover:bg-red-bg hover:text-red-brand"
                >
                  <LogOut size={14} className="shrink-0" />
                  Sair
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StoreSelector;
