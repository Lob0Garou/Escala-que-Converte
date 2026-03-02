import React, { useState } from 'react';
import { Download } from 'lucide-react';
import SimpleDayCard from './SimpleDayCard';

export const WeeklyScaleView = ({ staffRows, onTimeClick }) => {
  const [localTheme, setLocalTheme] = useState('dark');
  const dias = ['SEGUNDA', 'TER�A', 'QUARTA', 'QUINTA', 'SEXTA', 'S�BADO', 'DOMINGO'];

  const handleGenerate = (selectedTheme) => {
    window.dispatchEvent(new CustomEvent('update-print-theme', { detail: selectedTheme }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('generate-weekly-image'));
    }, 100);
  };

  return (
    <div className="p-8 bg-[#0a0c10] border border-white/5 rounded-2xl relative group/weekly mt-10">
      <div className="absolute top-6 right-6 flex items-center gap-2 opacity-100 transition-all">
        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setLocalTheme('light')}
            className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all ${localTheme === 'light' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-white'}`}
          >
            Light
          </button>
          <button
            onClick={() => setLocalTheme('dark')}
            className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all ${localTheme === 'dark' ? 'bg-[#E30613] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
          >
            Dark
          </button>
        </div>
        <button
          id="btn-gen-img"
          onClick={() => handleGenerate(localTheme)}
          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-bold hover:bg-white/10 hover:text-white transition text-xs uppercase tracking-wide flex items-center gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar PNG
        </button>
      </div>

      <h3 className="text-xl font-bold text-slate-200 uppercase tracking-widest text-left mb-8 pl-1 border-l-4 border-[#E30613]">
        Escala Semanal
      </h3>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dias.slice(0, 4).map((dia) => <SimpleDayCard key={dia} dia={dia} staffRows={staffRows} onTimeClick={onTimeClick} />)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 lg:w-3/4 lg:mx-auto">
          {dias.slice(4).map((dia) => <SimpleDayCard key={dia} dia={dia} staffRows={staffRows} onTimeClick={onTimeClick} />)}
        </div>
      </div>
    </div>
  );
};

export default WeeklyScaleView;
