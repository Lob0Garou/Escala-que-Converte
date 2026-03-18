import React, { useMemo } from 'react';

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
      .filter((row) => row.dia === dia && row.nome && row.entrada)
      .sort((a, b) => toMinutes(a.entrada) - toMinutes(b.entrada));
  }, [staffRows, dia]);

  const colabsFolga = useMemo(() => {
    return staffRows
      .filter((row) => row.dia === dia && row.nome && !row.entrada)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [staffRows, dia]);

  const cardBg = isDark ? 'bg-[#11141a] border-white/10' : 'bg-white border-slate-200 shadow-sm';
  const headerBg = isDark ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100';
  const titleColor = isDark ? 'text-[#E30613]' : 'text-slate-900';
  const countBadge = isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-200 text-slate-600';

  const thStyle = `pb-2 text-[9px] font-black uppercase tracking-tighter ${isDark ? 'text-slate-500' : 'text-slate-400'}`;
  const tdBase = 'py-1.5 text-[10px] font-bold tabular-nums align-middle';
  const nameStyle = `font-bold uppercase truncate max-w-[90px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`;
  const timeStyle = isDark ? 'text-slate-500' : 'text-slate-500';
  const saidaStyle = isDark ? 'text-slate-100' : 'text-slate-900';
  const emptyText = isDark ? 'text-slate-600' : 'text-slate-400';

  const footerBg = isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100';
  const footerTitle = isDark ? 'text-slate-500' : 'text-slate-400';
  const footerName = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`${cardBg} border rounded-xl overflow-hidden shadow-xl flex flex-col h-full`}>
      <div className={`${headerBg} border-b py-2 px-4 flex justify-between items-center bg-opacity-50`}>
        <span className={`${titleColor} font-black tracking-widest uppercase text-xs`}>{dia}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${countBadge}`}>
          {colabsDoDia.length}
        </span>
      </div>

      <div className="p-3 flex-1 min-h-[100px]">
        <table className="w-full text-left table-fixed">
          <thead>
            <tr className={isDark ? 'border-b border-white/5' : 'border-b border-slate-100'}>
              <th className={`${thStyle} w-[35%]`}>Atleta</th>
              <th className={`${thStyle} text-center w-[20%]`}>E</th>
              <th className={`${thStyle} text-center w-[20%]`}>I</th>
              <th className={`${thStyle} text-center w-[25%]`}>S</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-white/[0.02]' : 'divide-slate-5'}`}>
            {colabsDoDia.length > 0 ? colabsDoDia.map((colab) => (
              <tr key={colab.id} className="group">
                <td className={`${tdBase} ${nameStyle} py-2`}>{colab.nome}</td>
                <td className={`${tdBase} text-center ${timeStyle}`}>{colab.entrada || '--'}</td>
                <td className={`${tdBase} text-center ${timeStyle}`}>{colab.intervalo || '-'}</td>
                <td className={`${tdBase} text-center ${saidaStyle}`}>{colab.saida}{colab.saidaDiaSeguinte ? '+1' : ''}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className={`py-8 text-center text-[10px] font-bold uppercase tracking-widest ${emptyText}`}>
                  Sem Escala
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {colabsFolga.length > 0 && (
        <div className={`mt-auto border-t px-4 py-3 ${footerBg}`}>
          <h4 className={`text-[9px] font-black uppercase tracking-widest mb-2 opacity-70 ${footerTitle}`}>Folgando</h4>
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
