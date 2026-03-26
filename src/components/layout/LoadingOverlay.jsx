import React from 'react';

export const LoadingOverlay = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/85 backdrop-blur-sm">
    <div className="rounded-[28px] border border-border/70 bg-bg-surface/90 px-8 py-7 text-center shadow-2xl">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent-main" />
      <p className="text-sm font-medium tabular-nums text-text-secondary">Processando...</p>
    </div>
  </div>
);

export default LoadingOverlay;
