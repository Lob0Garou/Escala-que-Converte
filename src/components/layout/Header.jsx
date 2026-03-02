import React from 'react';
import RemoveBgImage from '../RemoveBgImage';
import CENTAURO_BRAND from '../../lib/centauro_brand_assets';

export const Header = () => (
  <header className="relative h-20 flex-none flex items-center justify-between px-8 z-20 shadow-lg overflow-hidden" style={{ background: CENTAURO_BRAND.gradients.header }}>
    <div className="flex items-center gap-3 z-10 w-1/3">
      <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3" style={{ fontFamily: CENTAURO_BRAND.fonts.heading, letterSpacing: '.04em' }}>
        ESCALA QUE CONVERTE
      </h1>
      <div className="h-5 w-px bg-white/30 mx-2"></div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/90 border border-white/30 bg-white/10 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.15)]">Pro v2</span>
    </div>

    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <RemoveBgImage
        src={CENTAURO_BRAND.headerLogo}
        alt="Centauro"
        className="h-10 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
      />
    </div>

    <div className="flex items-center justify-end gap-4 w-1/3 z-10">
      <div className="text-xs text-white/80 font-bold uppercase tracking-widest tabular-nums bg-black/10 px-3 py-1.5 rounded-lg border border-white/5">
        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', '')}
      </div>
    </div>
  </header>
);

export default Header;
