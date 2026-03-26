import React, { useMemo } from 'react';
import { isSameDayName } from '../../lib/dayUtils';

const toMinutes = (time) => {
  if (!time || typeof time !== 'string' || !time.includes(':')) return 0;
  const [hour, minute] = time.split(':');
  const hh = Number(hour);
  const mm = Number(minute);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
};

export const PrintDayCard = ({ dia, staffRows, theme }) => {
  const isDark = theme === 'dark';

  const colabsDoDia = useMemo(() => {
    return staffRows
      .filter((row) => isSameDayName(row.dia, dia) && row.nome && row.entrada)
      .sort((a, b) => toMinutes(a.entrada) - toMinutes(b.entrada));
  }, [staffRows, dia]);

  const colabsFolga = useMemo(() => {
    return staffRows
      .filter((row) => isSameDayName(row.dia, dia) && row.nome && !row.entrada)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [staffRows, dia]);

  const cardBg = isDark ? 'border-white/10 bg-[#11141a]' : 'border-slate-200 bg-white shadow-sm';
  const headerBg = isDark ? 'border-white/5 bg-white/[0.03]' : 'border-slate-100 bg-slate-50';
  const titleColor = isDark ? 'text-[#E30613]' : 'text-slate-900';
  const countBadge = isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-200 text-slate-600';

  const thStyle = `pb-2 text-[9px] font-black uppercase tracking-tighter ${isDark ? 'text-slate-500' : 'text-slate-400'}`;
  const tdBase = 'py-1.5 text-[10px] font-bold tabular-nums align-middle';
  const nameStyle = `max-w-[90px] truncate font-bold uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`;
  const timeStyle = 'text-slate-500';
  const saidaStyle = isDark ? 'text-slate-100' : 'text-slate-900';
  const emptyText = isDark ? 'text-slate-600' : 'text-slate-400';

  const footerBg = isDark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50';
  const footerTitle = isDark ? 'text-slate-500' : 'text-slate-400';
  const footerName = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`${cardBg} flex h-full flex-col overflow-hidden rounded-xl border shadow-xl`}>
      <div className={`${headerBg} flex items-center justify-between border-b px-4 py-2 bg-opacity-50`}>
        <span className={`${titleColor} text-xs font-black uppercase tracking-widest`}>{dia}</span>
        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${countBadge}`}>
          {colabsDoDia.length}
        </span>
      </div>

      <div className="min-h-[100px] flex-1 p-3">
        <table className="table-fixed w-full text-left">
          <thead>
            <tr className={isDark ? 'border-b border-white/5' : 'border-b border-slate-100'}>
              <th className={`${thStyle} w-[35%]`}>Atleta</th>
              <th className={`${thStyle} w-[20%] text-center`}>E</th>
              <th className={`${thStyle} w-[20%] text-center`}>I</th>
              <th className={`${thStyle} w-[25%] text-center`}>S</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-white/[0.02]' : 'divide-slate-50'}`}>
            {colabsDoDia.length > 0 ? colabsDoDia.map((colab) => (
              <tr key={colab.id} className="group">
                <td className={`${tdBase} ${nameStyle} py-2`}>{colab.nome}</td>
                <td className={`${tdBase} ${timeStyle} text-center`}>{colab.entrada || '--'}</td>
                <td className={`${tdBase} ${timeStyle} text-center`}>{colab.intervalo || '-'}</td>
                <td className={`${tdBase} ${saidaStyle} text-center`}>{colab.saida}{colab.saidaDiaSeguinte ? '+1' : ''}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className={`py-8 text-center text-[10px] font-bold uppercase tracking-widest ${emptyText}`}>
                  Sem escala
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {colabsFolga.length > 0 && (
        <div className={`mt-auto border-t px-4 py-3 ${footerBg}`}>
          <h4 className={`mb-2 text-[9px] font-black uppercase tracking-widest opacity-70 ${footerTitle}`}>Folgando</h4>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {colabsFolga.map((colab) => (
              <span key={colab.id} className={`text-[9px] font-bold uppercase opacity-80 ${footerName}`}>{colab.nome}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintDayCard;
