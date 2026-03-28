import React, { forwardRef, useMemo } from 'react';
import RemoveBgImage from '../RemoveBgImage';
import CENTAURO_BRAND from '../../lib/centauro_brand_assets';
import PrintDayCard from './PrintDayCard';
import { ORDERED_WEEK_DAYS } from '../../lib/dayUtils';
import { buildWeeklyDisplaySummary } from '../../lib/weeklyScore';

const fmtScore = (value) => (value === null || value === undefined ? 'N/A' : Number(value).toFixed(1));
const ScoreChip = ({ label, value, tone, formatter = fmtScore }) => (
  <div className={`rounded-2xl border px-4 py-3 ${tone}`}>
    <p className="text-[9px] font-black uppercase tracking-[0.22em] opacity-70">{label}</p>
    <p className="mt-2 text-2xl font-black tracking-tight">{formatter(value)}</p>
  </div>
);

export const WeeklyScalePrint = forwardRef(({ staffRows, theme, weeklyScoreSummary }, ref) => {
  const isDark = theme === 'dark';
  const displaySummary = useMemo(
    () => buildWeeklyDisplaySummary({ weeklyScoreSummary, staffRows }),
    [staffRows, weeklyScoreSummary],
  );

  const containerStyle = isDark ? 'bg-[#0a0c10] text-white' : 'bg-white text-slate-900';
  const bgImage = isDark
    ? 'radial-gradient(circle at 50% 0%, rgba(227, 6, 19, 0.08), transparent 70%)'
    : 'radial-gradient(circle at 50% 0%, rgba(0, 0, 0, 0.03), transparent 70%)';
  const badgeStyle = isDark
    ? 'text-[#E30613] border-[#E30613]/20 bg-[#E30613]/5'
    : 'text-slate-800 border-slate-300 bg-slate-100';
  const scoreToneBefore = isDark
    ? 'border-white/10 bg-white/[0.035] text-slate-100'
    : 'border-slate-200 bg-slate-50 text-slate-900';
  const scoreToneAfter = isDark
    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
    : 'border-emerald-200 bg-emerald-50 text-emerald-900';
  const scoreToneDelta = isDark
    ? 'border-[#E30613]/20 bg-[#E30613]/8 text-[#ffd7da]'
    : 'border-rose-200 bg-rose-50 text-rose-900';
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

      <div className="grid grid-cols-[1fr_1fr_0.8fr_auto] gap-4 px-4">
        <ScoreChip label="Score atual" value={displaySummary?.visibleWeeklyScoreAvg} tone={scoreToneBefore} />
        <ScoreChip label="Score base" value={displaySummary?.baselineWeeklyScoreAvg} tone={scoreToneAfter} />
        <ScoreChip label="Evolucao" value={displaySummary?.visibleVsBaselineGap} tone={scoreToneDelta} />
        <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] opacity-70">Dias considerados</p>
          <p className="mt-2 text-2xl font-black tracking-tight">
            {displaySummary?.daysCountConsidered || 0}/{displaySummary?.totalDays || ORDERED_WEEK_DAYS.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 items-start gap-4">
        {ORDERED_WEEK_DAYS.map((dia) => (
          <PrintDayCard
            key={dia}
            dia={dia}
            staffRows={staffRows}
            theme={theme}
            dayScoreSummary={displaySummary?.days?.find((day) => day.day === dia) || null}
          />
        ))}
      </div>
    </div>
  );
});

WeeklyScalePrint.displayName = 'WeeklyScalePrint';

export default WeeklyScalePrint;
