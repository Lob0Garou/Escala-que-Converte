import { useMemo, useState } from 'react';
import { calculateRevenueImpact } from '../lib/revenueEngine';
import { calculateStaffByHour } from '../lib/staffUtils';
import { parseFluxValue, parseNumber } from '../lib/parsers';
import { isSameDayName, normalizeDayName } from '../lib/dayUtils';

export const useRevenueCalculation = (
    staffRows,
    salesData,
    cuponsData,
    selectedDay,
    diasSemana,
    originalStaffRowsRef,
) => {
    const [revenueConfig, setRevenueConfig] = useState({ mode: 'INTERNAL' });

    const revenueMetrics = useMemo(() => {
        if (!salesData?.length || !cuponsData?.length) return null;

        const baselineRows = originalStaffRowsRef?.current || staffRows;
        if (!baselineRows?.length) return null;

        const normalizedSelectedDay = normalizeDayName(selectedDay);
        const excelDayName = diasSemana?.[normalizedSelectedDay] || diasSemana?.[selectedDay];
        if (!excelDayName) return null;

        const currentScheduleByHourMap = calculateStaffByHour(
            staffRows.filter((row) => isSameDayName(row.dia, normalizedSelectedDay)),
        );
        const baseScheduleByHourMap = calculateStaffByHour(
            baselineRows.filter((row) => isSameDayName(row.dia, normalizedSelectedDay)),
        );

        const currentScheduleByHour = Object.entries(currentScheduleByHourMap).map(([hour, quantity]) => ({
            hour: parseInt(hour, 10),
            quantity,
        }));

        const baseScheduleByHour = Object.entries(baseScheduleByHourMap).map(([hour, quantity]) => ({
            hour: parseInt(hour, 10),
            quantity,
        }));

        const dayFlowRows = cuponsData.filter(
            (row) => row['Dia da Semana'] === excelDayName && !isNaN(parseInt(row['cod_hora_entrada'], 10)),
        );

        const flowByHour = dayFlowRows.map((row) => ({
            hour: parseInt(row['cod_hora_entrada'], 10),
            flow: parseFluxValue(row['qtd_entrante']),
            coupons: parseNumber(row['qtd_cupom']),
        }));

        const salesByHour = salesData
            .filter(
                (row) =>
                    !row.Dia_Semana ||
                    normalizeDayName(row.Dia_Semana) === normalizedSelectedDay ||
                    row.Dia_Semana === excelDayName,
            )
            .map((row) => ({
                hour: parseInt(row.Hora, 10),
                sales: parseFloat(row.Valor_Venda) || 0,
            }));

        return calculateRevenueImpact(
            baseScheduleByHour,
            currentScheduleByHour,
            flowByHour,
            salesByHour,
            revenueConfig,
        );
    }, [staffRows, salesData, cuponsData, selectedDay, diasSemana, revenueConfig, originalStaffRowsRef]);

    return { revenueMetrics, revenueConfig, setRevenueConfig };
};

export default useRevenueCalculation;
