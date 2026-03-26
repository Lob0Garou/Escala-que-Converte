import { useMemo } from 'react';
import { computeThermalMetrics } from '../lib/thermalBalance_v5';
import { parseNumber, findAndParseConversion, parseFluxValue } from '../lib/parsers';
import { calculateStaffByHour } from '../lib/staffUtils';
import { computeCriticalDrops } from '../lib/insightEngine';
import { countWeekdaysInMonth } from '../lib/dateUtils';
import { isSameDayName, normalizeDayName } from '../lib/dayUtils';

export const useChartData = (cuponsData, staffRows, selectedDay, diasSemana) => {
    const today = useMemo(() => new Date(), []);
    const normalizedSelectedDay = useMemo(() => normalizeDayName(selectedDay), [selectedDay]);

    const weekdayCount = useMemo(
        () => countWeekdaysInMonth(today.getFullYear(), today.getMonth(), normalizedSelectedDay),
        [normalizedSelectedDay, today],
    );

    const dailyData = useMemo(() => {
        if (!cuponsData.length) return null;

        const dayMapping = diasSemana[normalizedSelectedDay] || diasSemana[selectedDay];
        const totalRow = cuponsData.find(
            (row) => row['Dia da Semana'] === dayMapping && row['cod_hora_entrada'] === 'Total',
        );

        const totalCuponsRaw = totalRow ? parseNumber(totalRow['qtd_cupom']) : 0;
        const totalFluxoRaw = totalRow ? parseFluxValue(totalRow['qtd_entrante']) : 0;

        const totalCupons = Math.round(totalCuponsRaw / weekdayCount);
        const totalFluxo = Math.round(totalFluxoRaw / weekdayCount);

        const dayCupons = cuponsData.filter(
            (row) =>
                row['Dia da Semana'] === dayMapping &&
                row['cod_hora_entrada'] !== 'Total' &&
                !isNaN(parseInt(row['cod_hora_entrada'], 10)),
        );

        const effectiveEscalaData = staffRows
            .filter((row) => isSameDayName(row.dia, normalizedSelectedDay))
            .map((row) => ({
                id: row.id,
                raw: row,
                DIA: normalizedSelectedDay,
                ATLETA: row.nome,
                nome: row.nome,
                entrada: row.entrada,
                intervalo: row.intervalo,
                saida: row.saida,
                saidaDiaSeguinte: row.saidaDiaSeguinte,
                ENTRADA: row.entrada,
                INTER: row.intervalo,
                SAIDA: row.saidaDiaSeguinte ? (row.saida ? `${row.saida} (+1)` : '') : row.saida,
            }));

        const dailySchedule =
            effectiveEscalaData.length > 0
                ? effectiveEscalaData
                      .filter((entry) => entry.ENTRADA)
                      .sort((a, b) => {
                          const timeA = a.ENTRADA ? parseInt(a.ENTRADA.split(':')[0], 10) : 99;
                          const timeB = b.ENTRADA ? parseInt(b.ENTRADA.split(':')[0], 10) : 99;
                          return timeA - timeB;
                      })
                : [];

        const operatingHours = dayCupons
            .map((row) => parseInt(row['cod_hora_entrada'], 10))
            .sort((a, b) => a - b);
        const minHour = operatingHours.length > 0 ? operatingHours[0] : 10;
        const maxHour = operatingHours.length > 0 ? operatingHours[operatingHours.length - 1] : 23;

        return {
            dayCupons,
            totalCupons,
            totalFluxo,
            dailySchedule,
            minHour,
            maxHour,
            operatingHourCount: operatingHours.length || 1,
        };
    }, [cuponsData, staffRows, selectedDay, normalizedSelectedDay, diasSemana, weekdayCount]);

    const chartData = useMemo(() => {
        if (!dailyData || dailyData.length === 0) return [];

        const filteredDayCupons = dailyData.dayCupons.filter(
            (row) => parseInt(row['cod_hora_entrada'], 10) !== 22,
        );

        const staffPerHour = calculateStaffByHour(dailyData.dailySchedule, dailyData.minHour, dailyData.maxHour);
        const totalCuponsForPercent = dailyData.totalCupons || 1;
        const totalFluxoForPercent = dailyData.totalFluxo || 1;

        const basicData = filteredDayCupons.map((cupom) => {
            const hour = parseInt(cupom['cod_hora_entrada'], 10);
            const qtdCuponsRaw = parseNumber(cupom['qtd_cupom']);
            const qtdFluxoRaw = parseFluxValue(cupom['qtd_entrante']);

            const qtdCupons = Math.round(qtdCuponsRaw / weekdayCount);
            const qtdFluxo = Math.round(qtdFluxoRaw / weekdayCount);

            const percentualConversao = findAndParseConversion(cupom);

            return {
                hora: `${hour}`,
                funcionarios: staffPerHour[hour] || 0,
                percentualCupons: parseFloat(((qtdCupons / totalCuponsForPercent) * 100).toFixed(1)),
                cupons: qtdCupons,
                percentualFluxo: parseFloat(((qtdFluxo / totalFluxoForPercent) * 100).toFixed(1)),
                fluxo: qtdFluxo,
                percentualConversao,
                conversao: percentualConversao,
            };
        });

        if (basicData.length === 0) return [];

        // Staff como % do total de staff-horas (análogo a percentualFluxo = % do total de fluxo).
        // Isso garante escala estável: redistribuir intervalos/shifts não altera a escala visual.
        const totalStaffHours = basicData.reduce((sum, point) => sum + (Number(point.funcionarios) || 0), 0) || 1;

        const hourlyDataForThermal = basicData.map((item) => ({
            hour: parseInt(item.hora, 10),
            flow: Number(item.fluxo),
            cupons: Number(item.cupons),
            activeStaff: Number(item.funcionarios),
        }));

        const thermalMetrics = computeThermalMetrics(hourlyDataForThermal);

        return basicData.map((item, index) => {
            const thermalRow = thermalMetrics.rowsByHour[index] || {};
            return {
                ...item,
                fluxo: Number(item.fluxo),
                conversao: Number(item.conversao),
                funcionarios_real: Number(item.funcionarios),
                funcionarios_visual: parseFloat(((Number(item.funcionarios) / totalStaffHours) * 100).toFixed(1)),
                pontoCritico:
                    Number(item.fluxo) > 50 && Number(item.conversao) < 10
                        ? Number(item.percentualFluxo)
                        : null,
                pressure: thermalRow.pressure || 0,
                thermalIndex: thermalRow.thermalIndex || 0,
                thermalBadge: thermalRow.badge || { emoji: '\u26AA', label: 'N/A', color: '#6B7280' },
                flowSharePct: thermalRow.flowSharePct || 0,
                __thermalMu: thermalMetrics.mu,
                __thermalScore: thermalMetrics.score,
                __thermalAdherence: thermalMetrics.adherence,
                __thermalLostOpportunity: thermalMetrics.lostOpportunity,
            };
        });
    }, [dailyData, weekdayCount]);

    const insights = useMemo(() => {
        if (!chartData.length) return null;

        const validConversionHours = chartData.filter((row) => row.percentualConversao > 0);
        const lowestConversionHour =
            validConversionHours.length > 0
                ? validConversionHours.reduce((min, curr) =>
                      curr.percentualConversao < min.percentualConversao ? curr : min,
                  )
                : null;

        const peakFluxoHour =
            chartData.length > 0
                ? chartData.reduce((max, curr) =>
                      curr.percentualFluxo > max.percentualFluxo ? curr : max,
                  )
                : null;

        const relevantHoursForStaffing = chartData.filter((row) => parseInt(row.hora.replace('h', ''), 10) < 22);
        const understaffedHour =
            relevantHoursForStaffing.length > 0
                ? relevantHoursForStaffing.reduce(
                      (min, curr) => (curr.funcionarios < min.funcionarios ? curr : min),
                      relevantHoursForStaffing[0],
                  )
                : null;

        return { lowestConversionHour, peakFluxoHour, understaffedHour };
    }, [chartData]);

    const conversionInsights = useMemo(() => {
        const MIN_FLUXO = 10;
        const STABLE_FLUXO_PCT = 0.15;
        const ALERT_DROP_PP = 2.0;
        const OPP_RISE_PP = 1.5;

        const alerts = [];
        const opportunities = [];
        if (!chartData || chartData.length < 2) return { alerts, opportunities };

        for (let i = 1; i < chartData.length; i++) {
            const current = chartData[i];
            const previous = chartData[i - 1];
            const fluxoAtual = current.fluxo || 0;
            const fluxoPrev = previous.fluxo || 0;
            if (fluxoAtual < MIN_FLUXO || fluxoPrev < 1) continue;

            const convAtual = current.percentualConversao || 0;
            const convPrev = previous.percentualConversao || 0;
            const deltaFlow = (fluxoAtual - fluxoPrev) / Math.max(1, fluxoPrev);
            const deltaConvPP = convAtual - convPrev;

            if (deltaFlow >= -STABLE_FLUXO_PCT && deltaConvPP <= -ALERT_DROP_PP) {
                alerts.push({ hora: current.hora, fluxo: fluxoAtual, conv: convAtual, deltaConvPP, deltaFlow });
            }

            if (deltaFlow <= STABLE_FLUXO_PCT && deltaConvPP >= OPP_RISE_PP) {
                opportunities.push({
                    hora: current.hora,
                    fluxo: fluxoAtual,
                    conv: convAtual,
                    deltaConvPP,
                    deltaFlow,
                });
            }
        }

        return { alerts, opportunities };
    }, [chartData]);

    const dailyMetrics = useMemo(() => {
        if (!chartData || chartData.length === 0) return null;

        const { criticalDrops, horasCriticas } = computeCriticalDrops(chartData);

        const totalFlow = chartData.reduce((acc, curr) => acc + (Number(curr.fluxo) || 0), 0);
        const maxFlowObj = chartData.reduce(
            (max, curr) => ((Number(max.fluxo) || 0) > (Number(curr.fluxo) || 0) ? max : curr),
            chartData[0],
        );

        const maxFlow = Number(maxFlowObj.fluxo) || 0;
        const maxFlowHour = `${maxFlowObj.hora}h`;
        const maxFlowPct = totalFlow > 0 ? ((maxFlow / totalFlow) * 100).toFixed(1) : 0;

        const validStaffData = chartData.filter((row) => row.funcionarios_real > 0);
        let minStaff = 0;
        let minStaffHour = 'Nenhum';

        if (validStaffData.length > 0) {
            const minStaffObj = validStaffData.reduce(
                (min, curr) => (curr.funcionarios_real < min.funcionarios_real ? curr : min),
                validStaffData[0],
            );
            minStaff = minStaffObj.funcionarios_real;
            minStaffHour = `${minStaffObj.hora}h`;
        }

        const validConversions = chartData.filter((row) => row.conversao > 0).map((row) => row.conversao);
        const minConversion = validConversions.length ? Math.min(...validConversions) : 0;

        return {
            criticalDrops,
            horasCriticas,
            minConversion,
            maxFlow,
            maxFlowHour,
            maxFlowPct,
            minStaff,
            minStaffHour,
        };
    }, [chartData]);

    return { dailyData, chartData, insights, dailyMetrics, conversionInsights };
};

export default useChartData;

