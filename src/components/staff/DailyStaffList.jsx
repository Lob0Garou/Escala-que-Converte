import React from 'react';

export const DailyStaffList = ({ staffRows, selectedDay, onTimeClick }) => {
  const colabsDoDia = staffRows.filter((row) => row.dia === selectedDay && row.nome !== '' && row.entrada);

  colabsDoDia.sort((a, b) => {
    const normalizeTime = (time) => {
      if (!time) return '23:59';
      return time.length === 4 ? `0${time}` : time;
    };

    const timeA = normalizeTime(a.entrada);
    const timeB = normalizeTime(b.entrada);

    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }
    return a.nome.localeCompare(b.nome);
  });

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex justify-between items-center px-2">
        <h3 className="text-sm font-black text-slate-200 uppercase tracking-wide">
          Escala: <span className="text-[#E30613]">{selectedDay}</span>
        </h3>
        <span className="text-[10px] font-bold bg-[#1a1e27] border border-white/5 px-2 py-1 rounded text-slate-400">
          {colabsDoDia.length} TOTAL
        </span>
      </div>

      <div className="escala-lista flex-1 h-0 overflow-y-auto">
        {colabsDoDia.map((colab) => {
          const nameParts = colab.nome.split(' ');
          const firstName = nameParts[0];
          const surname = nameParts.slice(1).join(' ');

          return (
            <div key={colab.id} className="escala-item group cursor-pointer hover:bg-white/[0.03]">
              <div className="flex flex-col min-w-0 justify-center">
                <span className="text-sm font-black text-slate-200 leading-none truncate group-hover:text-white transition-colors">
                  {firstName}
                </span>
                {surname && (
                  <span className="text-[10px] font-bold text-slate-500 leading-none truncate group-hover:text-slate-400 transition-colors uppercase mt-0.5">
                    {surname}
                  </span>
                )}
              </div>

              <div
                className="flex flex-col items-center cursor-pointer group/time"
                onClick={() => onTimeClick(colab.id, 'entrada', colab.entrada)}
              >
                <span className="text-[9px] text-slate-500 uppercase mb-0.5 group-hover/time:text-[#E30613] transition-colors font-bold">Ent</span>
                <span className={`horario horario-entrada text-[11px] font-bold ${colab.entrada ? '' : 'opacity-50'}`}>
                  {colab.entrada || '--:--'}
                </span>
              </div>

              <div
                className="flex flex-col items-center cursor-pointer group/time"
                onClick={() => onTimeClick(colab.id, 'intervalo', colab.intervalo)}
              >
                <span className="text-[9px] text-slate-500 uppercase mb-0.5 group-hover/time:text-[#E30613] transition-colors font-bold">Int</span>
                <span className={`horario text-slate-500 text-[11px] font-bold ${colab.intervalo ? '' : 'opacity-50'}`}>
                  {colab.intervalo || '--:--'}
                </span>
              </div>

              <div
                className="flex flex-col items-center cursor-pointer group/time"
                onClick={() => onTimeClick(colab.id, 'saida', colab.saida)}
              >
                <span className="text-[9px] text-slate-500 uppercase mb-0.5 group-hover/time:text-white transition-colors font-bold">Sai</span>
                <span className={`horario horario-saida text-[11px] font-bold ${colab.saida ? '' : 'opacity-50'}`}>
                  {colab.saida || '--:--'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyStaffList;
