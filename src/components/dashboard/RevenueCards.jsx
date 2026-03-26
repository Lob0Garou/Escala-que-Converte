import React from 'react';
import { ChevronLeft } from 'lucide-react';

export const RevenueCards = ({ impact, mode }) => {
    if (!impact) return null;
    const { deltaRevenue, deltaCoupons, criticalHoursBefore, criticalHoursAfter, maxRhoBefore, maxRhoAfter, deltaConversionPP } = impact;

    // Format currency
    const formatCurrency = (val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2 mb-6">
            {/* 1. Receita Recuperada */}
            <div className="bg-bg-surface border border-border shadow-sm rounded-xl p-5 transition-transform duration-200 hover:-translate-y-0.5 relative overflow-hidden">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.05em] block mb-2">
                    Receita Recuperada
                </span>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight text-text-primary tabular-nums">
                        {formatCurrency(deltaRevenue)}
                    </span>
                    <span className="text-xs font-medium text-text-secondary">/dia</span>
                </div>
                {deltaRevenue > 0 && (
                    <p className="text-xs text-green-700 font-medium mt-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-brand" />
                        {mode === 'average' ? 'Impacto na média' : 'Impacto total acumulado'}
                    </p>
                )}
            </div>

            {/* 2. Cupons Adicionais */}
            <div className="bg-bg-surface border border-border shadow-sm rounded-xl p-5 transition-transform duration-200 hover:-translate-y-0.5">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.05em] block mb-2">
                    Cupons Adicionais
                </span>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight text-text-primary tabular-nums">
                        {deltaCoupons > 0 ? '+' : ''}{deltaCoupons.toFixed(1)}
                    </span>
                    <span className="text-xs font-medium text-text-secondary">unid.</span>
                </div>
                <p className="text-xs text-text-secondary mt-2 font-medium">
                    <span className="text-green-700">+{deltaConversionPP.toFixed(2)} p.p.</span> na conversão
                </p>
            </div>

            {/* 3. Horas Críticas */}
            <div className="bg-bg-surface border border-border shadow-sm rounded-xl p-5 transition-transform duration-200 hover:-translate-y-0.5">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.05em] block mb-2">
                    Horas Críticas ( &gt; 1.05 )
                </span>
                <div className="flex items-center gap-4 mt-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-text-muted font-semibold uppercase">Antes</span>
                        <span className="text-2xl font-semibold tabular-nums text-text-secondary">{criticalHoursBefore}h</span>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-text-muted font-semibold uppercase">Depois</span>
                        <span className={`text-2xl font-semibold tabular-nums ${criticalHoursAfter < criticalHoursBefore ? 'text-green-700' : 'text-text-primary'}`}>
                            {criticalHoursAfter}h
                        </span>
                    </div>
                </div>
            </div>

            {/* 4. Pressão Máxima */}
            <div className="bg-bg-surface border border-border shadow-sm rounded-xl p-5 transition-transform duration-200 hover:-translate-y-0.5">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.05em] block mb-2">
                    Pressão Máxima
                </span>
                <div className="flex items-center gap-4 mt-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-text-muted font-semibold uppercase">Antes</span>
                        <span className="text-2xl font-semibold tabular-nums text-text-secondary">{maxRhoBefore.toFixed(2)}</span>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-text-muted font-semibold uppercase">Depois</span>
                        <span className={`text-2xl font-semibold tabular-nums ${maxRhoAfter < maxRhoBefore ? 'text-green-700' : 'text-text-primary'}`}>
                            {maxRhoAfter.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RevenueCards;
