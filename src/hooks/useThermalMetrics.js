import { useMemo } from 'react';
import { generateSuggestedCoverage } from '../lib/thermalBalance';

export const useThermalMetrics = (chartData) => {
    const thermalMetrics = useMemo(() => {
        if (!chartData || chartData.length === 0) return null;

        const firstPoint = chartData[0];
        if (!firstPoint) return null;

        const mu = firstPoint.__thermalMu || 0;
        const score = firstPoint.__thermalScore || 0;
        const adherence = firstPoint.__thermalAdherence || 0;
        const lostOpportunity = firstPoint.__thermalLostOpportunity || 0;

        const validPoints = chartData.filter((point) => point.flowSharePct > 0 && point.thermalIndex !== 999);

        const hotspots = [...validPoints]
            .filter((point) => point.thermalIndex >= 1.0)
            .sort((a, b) => b.thermalIndex - a.thermalIndex)
            .slice(0, 3)
            .map((point) => ({
                hour: point.hora,
                index: point.thermalIndex,
                pressure: point.pressure,
                staff: point.funcionarios_real,
                badge: point.thermalBadge,
            }));

        const coldspots = [...validPoints]
            .filter((point) => point.thermalIndex < 1.0 && point.thermalIndex > 0)
            .sort((a, b) => a.thermalIndex - b.thermalIndex)
            .slice(0, 3)
            .map((point) => ({
                hour: point.hora,
                index: point.thermalIndex,
                pressure: point.pressure,
                staff: point.funcionarios_real,
                badge: point.thermalBadge,
            }));

        return { mu, score, adherence, lostOpportunity, hotspots, coldspots };
    }, [chartData]);

    const suggestedCoverage = useMemo(() => {
        if (!chartData || chartData.length === 0) return null;

        const rowsByHour = chartData.map((point) => ({
            hour: parseInt(point.hora, 10),
            flowQty: point.fluxo,
            activeStaff: point.funcionarios_real,
            thermalIndex: point.thermalIndex,
            pressure: point.pressure,
            badge: point.thermalBadge,
        }));

        return generateSuggestedCoverage(rowsByHour, {
            minCoveragePerHour: 1,
            maxIterations: 20,
            targetMaxIndex: 1.15,
        });
    }, [chartData]);

    return { thermalMetrics, suggestedCoverage };
};

export default useThermalMetrics;
