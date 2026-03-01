import React from 'react';
import { ChevronLeft } from 'lucide-react';

const RevenueCards = ({ impact, mode }) => {
    if (!impact) return null;
    const { deltaRevenue, deltaCoupons, criticalHoursBefore, criticalHoursAfter, maxRhoBefore, maxRhoAfter, deltaConversionPP } = impact;


    // If deltaRevenue is 0, check if we recovered any coupons or reduced risk? 
    // "Receita Recuperada" is strictly positive gain.
    // Risk isn't explicitly calculated as a negative number in the new engine spec, 
    // but "pressure reduction" is implicit.
    // Let's stick to displaying positive gains.

    // Format currency
    const formatCurrency = (val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. Receita Recuperada */}
            <div className="p-5 rounded-2xl border bg-[var(--bg-card)] backdrop-blur-xl border-[var(--glass-border)] relative overflow-hidden group transition-all duration-300 hover:shadow-[var(--shadow-red-glow)] hover:-translate-y-1">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full blur-2xl" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] block mb-2 text-emerald-400/80">
                    Receita Recuperada
                </span>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tight text-white">
                        {formatCurrency(deltaRevenue)}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-muted)]">/dia</span>
                </div>
                {deltaRevenue > 0 && (
                    <p className="text-[10px] text-emerald-400 font-medium mt-2 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        {mode === 'average' ? 'Impacto na média' : 'Impacto total acumulado'}
                    </p>
                )}
            </div>

            {/* 2. Cupons Adicionais */}
            <div className="p-5 rounded-2xl border bg-[var(--bg-card)] backdrop-blur-xl border-[var(--glass-border)] group hover:border-[var(--c-red)]/30 transition-all duration-300 hover:-translate-y-1">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] block mb-2">Cupons Adicionais</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white tracking-tight group-hover:text-[var(--c-red)] transition-colors">
                        {deltaCoupons > 0 ? '+' : ''}{deltaCoupons.toFixed(1)}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-muted)]">unid.</span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-medium">
                    <span className="text-emerald-400">+{deltaConversionPP.toFixed(2)} p.p.</span> na conversão
                </p>
            </div>

            {/* 3. Horas Críticas */}
            <div className="p-5 rounded-2xl border bg-[var(--bg-card)] backdrop-blur-xl border-[var(--glass-border)] group hover:border-[var(--accent-rose)]/30 transition-all duration-300 hover:-translate-y-1">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] block mb-2">Horas Críticas ( &gt; 1.05p )</span>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Antes</span>
                        <span className="text-2xl font-black text-[var(--text-secondary)]">{criticalHoursBefore}h</span>
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Depois</span>
                        <span className={`text-2xl font-black ${criticalHoursAfter < criticalHoursBefore ? 'text-emerald-400' : 'text-[var(--accent-rose)]'}`}>
                            {criticalHoursAfter}h
                        </span>
                    </div>
                </div>
            </div>

            {/* 4. Pressão Máxima */}
            <div className="p-5 rounded-2xl border bg-[var(--bg-card)] backdrop-blur-xl border-[var(--glass-border)] group hover:border-[var(--accent-cyan)]/30 transition-all duration-300 hover:-translate-y-1">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-2">Pressão Máxima</span>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Antes</span>
                        <span className="text-2xl font-black text-[var(--text-secondary)]">{maxRhoBefore.toFixed(2)}</span>
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Depois</span>
                        <span className={`text-2xl font-black ${maxRhoAfter < maxRhoBefore ? 'text-emerald-400' : 'text-white'}`}>
                            {maxRhoAfter.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default RevenueCards;
