import React, { forwardRef } from 'react';
import RemoveBgImage from '../RemoveBgImage';
import CENTAURO_BRAND from '../../lib/centauro_brand_assets';
import PrintDayCard from './PrintDayCard';

export const WeeklyScalePrint = forwardRef(({ staffRows, theme }, ref) => {
  const diasTop = ['SEGUNDA', 'TER�A', 'QUARTA', 'QUINTA'];
  const diasBottom = ['SEXTA', 'S�BADO', 'DOMINGO'];

  const isDark = theme === 'dark';

  const containerStyle = isDark ? 'bg-[#0a0c10] text-white' : 'bg-white text-slate-900';
  const bgImage = isDark
    ? 'radial-gradient(circle at 50% 0%, rgba(227, 6, 19, 0.08), transparent 70%)'
    : 'radial-gradient(circle at 50% 0%, rgba(0, 0, 0, 0.03), transparent 70%)';
  const logoStyle = isDark
    ? 'text-[#E30613] border-[#E30613]/20 bg-[#E30613]/5'
    : 'text-slate-800 border-slate-300 bg-slate-100';

  return (
    <div
      ref={ref}
      className={`w-[1280px] p-8 flex flex-col gap-6 ${containerStyle} min-h-screen`}
      style={{
        backgroundImage: bgImage,
        height: 'max-content',
        minHeight: '720px',
      }}
    >
      <div className="relative flex items-center justify-between mb-8 px-4">
        <h3 className={`text-2xl font-black uppercase tracking-[0.3em] ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Escala Semanal
        </h3>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <RemoveBgImage src={CENTAURO_BRAND.headerLogo} className="h-12 object-contain" alt="Centauro" />
        </div>

        <div className={`text-sm font-bold uppercase tracking-widest border px-3 py-1 rounded-lg ${logoStyle}`}>
          DataVerse Pro
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 items-start">
        {diasTop.map((dia) => <PrintDayCard key={dia} dia={dia} staffRows={staffRows} theme={theme} />)}
      </div>
      <div className="flex justify-center gap-6 w-full items-start">
        <div className="grid grid-cols-3 gap-6 w-3/4">
          {diasBottom.map((dia) => <PrintDayCard key={dia} dia={dia} staffRows={staffRows} theme={theme} />)}
        </div>
      </div>
    </div>
  );
});

WeeklyScalePrint.displayName = 'WeeklyScalePrint';

export default WeeklyScalePrint;
