import React from 'react';

export const InsightCard = ({ category, title, text, isHighlighted, onClick }) => {
  const styleMap = {
    alerta: 'border-l-red-500',
    destaque: 'border-l-[#E30613]',
    neutro: 'border-l-blue-500',
  };

  return (
    <div
      className={`bg-[#121620]/40 backdrop-blur-md rounded-lg p-3 cursor-pointer border-l-2 border-t border-r border-b border-t-white/5 border-r-white/5 border-b-white/5 ${styleMap[category] || 'border-l-gray-500'} hover:bg-white/5 transition-all duration-300 group ${isHighlighted ? 'ring-1 ring-white/20' : ''}`}
      onClick={onClick}
    >
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5 group-hover:text-gray-300 transition-colors">{title}</p>
      <p className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors tabular-nums">{text}</p>
    </div>
  );
};

export default InsightCard;
