import { useMemo } from 'react';

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

    return { thermalMetrics };
};

export default useThermalMetrics;
