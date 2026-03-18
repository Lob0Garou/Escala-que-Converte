import React from 'react';

export const SimpleDayCard = ({ dia, staffRows, onTimeClick }) => {
  const colabsDoDia = staffRows.filter((row) => row.dia === dia && row.nome !== '' && row.entrada);

  colabsDoDia.sort((a, b) => {
    const normalizeTime = (time) => {
      if (!time) return '23:59';
      return time.length === 4 ? `0${time}` : time;
    };

    const timeA = normalizeTime(a.entrada);
    const timeB = normalizeTime(b.entrada);

    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return a.nome.localeCompare(b.nome);
  });

  return (
    <div className="bg-[#1a1e27] rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors flex flex-col h-full">
      <div className="px-4 py-3 bg-[#222835] border-b border-white/5 flex justify-between items-center">
        <span className="font-semibold text-slate-200 text-sm tracking-wide">{dia}</span>
        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400 font-bold tabular-nums">
          {colabsDoDia.length}
        </span>
      </div>

      <div className="divide-y divide-white/5 flex-1">
        {colabsDoDia.length > 0 ? colabsDoDia.map((colab) => {
          const nameParts = colab.nome.split(' ');
          const firstName = nameParts[0];
          const surname = nameParts.slice(1).join(' ');

          return (
            <div key={colab.id} className="px-3 py-2 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
              <div className="flex flex-col min-w-0 mr-2 justify-center">
                <span className="text-xs font-black text-slate-300 truncate leading-none">{firstName}</span>
                {surname && (
                  <span className="text-[9px] font-bold text-slate-500 truncate leading-none uppercase mt-0.5">
                    {surname}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col items-center relative group/time">
                  <span className="text-[7px] text-slate-600 uppercase font-black mb-px opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2.5">Ent</span>
                  <span
                    className="text-[11px] text-slate-400 font-mono cursor-pointer hover:text-white tabular-nums tracking-tight font-bold"
                    onClick={onTimeClick ? () => onTimeClick(colab.id, 'entrada', colab.entrada) : undefined}
                  >
                    {colab.entrada || '--'}
                  </span>
                </div>

                <span className="text-[8px] text-slate-700 font-black">›</span>

                <div className="flex flex-col items-center relative group/time">
                  <span className="text-[7px] text-slate-600 uppercase font-black mb-px opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2.5">Int</span>
                  <span
                    className="text-[11px] text-slate-500 font-mono cursor-pointer hover:text-white tabular-nums tracking-tight font-bold"
                    onClick={onTimeClick ? () => onTimeClick(colab.id, 'intervalo', colab.intervalo) : undefined}
                  >
                    {colab.intervalo || '-'}
                  </span>
                </div>

                <span className="text-[8px] text-slate-700 font-black">›</span>

                <div className="flex flex-col items-center relative group/time">
                  <span className="text-[7px] text-slate-600 uppercase font-black mb-px opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2.5">Sai</span>
                  <span
                    className="text-[11px] text-slate-400 font-mono cursor-pointer hover:text-white font-bold tabular-nums tracking-tight"
                    onClick={onTimeClick ? () => onTimeClick(colab.id, 'saida', colab.saida) : undefined}
                  >
                    {colab.saida}{colab.saidaDiaSeguinte ? '+1' : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="px-4 py-8 text-center">
            <span className="text-xs text-slate-700 font-medium uppercase tracking-widest">Sem Escala</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleDayCard;
