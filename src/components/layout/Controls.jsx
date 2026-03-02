import React from 'react';
import { Upload } from 'lucide-react';

export const Controls = ({ selectedDay, setSelectedDay, setShowUploadSection }) => (
  <div className="flex-none px-8 py-3 border-b border-white/5 bg-[#0a0c10]/95 backdrop-blur-sm z-10 flex flex-wrap items-center justify-between gap-4">
    <div className="flex items-center gap-2 p-1 bg-[#11141a] rounded-xl border border-white/5">
      {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].map((day) => {
        const fullDay = {
          SEG: 'SEGUNDA',
          TER: 'TER�A',
          QUA: 'QUARTA',
          QUI: 'QUINTA',
          SEX: 'SEXTA',
          SAB: 'S�BADO',
          DOM: 'DOMINGO',
        }[day];
        const isActive = selectedDay === fullDay;

        return (
          <button
            key={day}
            onClick={() => setSelectedDay(fullDay)}
            className={`
              relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${isActive
                ? 'bg-[#E30613] text-white shadow-[0_0_20px_rgba(227,6,19,0.3)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }
            `}
          >
            {day}
          </button>
        );
      })}
    </div>

    <div className="flex items-center gap-3 ml-auto">
      <button onClick={() => setShowUploadSection((prev) => !prev)} className="h-9 px-4 bg-[#11141a] hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg transition-all flex items-center gap-2 text-xs font-semibold hover:border-white/20">
        <Upload className="w-3.5 h-3.5" />
        <span className="uppercase tracking-wide">Importar</span>
      </button>
    </div>
  </div>
);

export default Controls;
