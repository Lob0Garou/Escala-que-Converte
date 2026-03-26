import React, { forwardRef } from 'react';
import RemoveBgImage from '../RemoveBgImage';
import CENTAURO_BRAND from '../../lib/centauro_brand_assets';
import PrintDayCard from './PrintDayCard';
import { ORDERED_WEEK_DAYS } from '../../lib/dayUtils';

export const WeeklyScalePrint = forwardRef(({ staffRows, theme }, ref) => {
  const isDark = theme === 'dark';

  const containerStyle = isDark ? 'bg-[#0a0c10] text-white' : 'bg-white text-slate-900';
  const bgImage = isDark
    ? 'radial-gradient(circle at 50% 0%, rgba(227, 6, 19, 0.08), transparent 70%)'
    : 'radial-gradient(circle at 50% 0%, rgba(0, 0, 0, 0.03), transparent 70%)';
  const badgeStyle = isDark
    ? 'text-[#E30613] border-[#E30613]/20 bg-[#E30613]/5'
    : 'text-slate-800 border-slate-300 bg-slate-100';

  return (
    <div
      ref={ref}
      data-print-root
      className={`flex min-h-screen w-[1600px] max-w-none flex-col gap-6 p-10 ${containerStyle}`}
      style={{
        backgroundImage: bgImage,
        height: 'max-content',
        minHeight: '720px',
      }}
    >
      <div className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center px-4">
        <h3 className={`text-2xl font-black uppercase tracking-[0.3em] ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Escala semanal
        </h3>

        <div className="flex justify-center">
          <RemoveBgImage src={CENTAURO_BRAND.headerLogo} className="h-12 object-contain" alt="Centauro" />
        </div>

        <div className="flex justify-end">
          <div className={`rounded-lg border px-3 py-1 text-sm font-bold uppercase tracking-widest ${badgeStyle}`}>
            DataVerse Pro
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 items-start gap-4">
        {ORDERED_WEEK_DAYS.map((dia) => (
          <PrintDayCard key={dia} dia={dia} staffRows={staffRows} theme={theme} />
        ))}
      </div>
    </div>
  );
});

WeeklyScalePrint.displayName = 'WeeklyScalePrint';

export default WeeklyScalePrint;
