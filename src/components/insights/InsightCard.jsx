import React from 'react';

export const InsightCard = ({ category, title, text, isHighlighted, onClick }) => {
  const styleMap = {
    alerta: 'border-l-red-500',
    destaque: 'border-l-[#E30613]',
    neutro: 'border-l-blue-500',
  };

  return (
    <div
      className={`bg-bg-surface backdrop-blur-md rounded-lg p-3 cursor-pointer border-l-2 border border-border ${styleMap[category] || 'border-l-border'} hover:bg-bg-elevated transition-all duration-300 group ${isHighlighted ? 'ring-1 ring-accent-border' : ''}`}
      onClick={onClick}
    >
      <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted mb-0.5 group-hover:text-text-secondary transition-colors">{title}</p>
      <p className="text-sm font-bold text-text-primary group-hover:text-text-primary transition-colors tabular-nums">{text}</p>
    </div>
  );
};

export default InsightCard;
