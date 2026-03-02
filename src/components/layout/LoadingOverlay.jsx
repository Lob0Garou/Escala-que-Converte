import React from 'react';

export const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-[#0B0F1A]/90 flex items-center justify-center z-50 backdrop-blur-sm">
    <div className="bg-[#121620] border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#E30613] mx-auto mb-4"></div>
      <p className="text-gray-300 font-medium tabular-nums text-sm">Processando...</p>
    </div>
  </div>
);

export default LoadingOverlay;
