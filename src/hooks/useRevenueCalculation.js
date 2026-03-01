import { useMemo } from 'react';
import { calculateRevenueImpact } from '../lib/revenueEngine';

export const useRevenueCalculation = ({
    baseCoverage,
    currentCoverage,
    flowData,
    salesData,
    selectedDay,
    viewMode,
    weekdayCounts
}) => {
    return useMemo(() => {
        // Note: flowData here should be the map of { hour: { entrantes, cupons, convReal } }
        // If not, we might need to transform inputs.
        if (!baseCoverage || !currentCoverage || !flowData) return null;

        // Normalizar dayKey
        const dayKeyMap = {
            'Seg': 'SEGUNDA', 'Ter': 'TERCA', 'Qua': 'QUARTA',
            'Qui': 'QUINTA', 'Sex': 'SEXTA', 'Sab': 'SABADO', 'Dom': 'DOMINGO',
            'SEGUNDA': 'SEGUNDA', 'TERÇA': 'TERCA', 'TERCA': 'TERCA', 'QUARTA': 'QUARTA',
            'QUINTA': 'QUINTA', 'SEXTA': 'SEXTA', 'SÁBADO': 'SABADO', 'SABADO': 'SABADO', 'DOMINGO': 'DOMINGO'
        };

        // Extrair dia do formato "6. Sab" ou "SABADO" ou "SÁBADO"
        let dayKey = selectedDay;
        if (selectedDay.includes('.')) {
            dayKey = selectedDay.split('.')[1].trim();
            // e.g. "Sab" -> "SABADO"
        }
        // Remove accents and uppercase
        dayKey = dayKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

        const normalizedKey = dayKeyMap[Object.keys(dayKeyMap).find(k => k.toUpperCase() === dayKey)] || dayKey;

        const salesForDay = salesData ? salesData[normalizedKey] : null;

        return calculateRevenueImpact({
            baseCoverage,
            currentCoverage,
            flowData,
            salesData: salesForDay,
            dayKey: normalizedKey,
            mode: viewMode,
            weekdayCounts
        });
    }, [baseCoverage, currentCoverage, flowData, salesData, selectedDay, viewMode, weekdayCounts]);
};
