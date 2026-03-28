import { useCallback, useRef, useState } from 'react';
import { optimizeAllDays } from '../lib/thermalBalance_v5';
import { parseFluxValue } from '../lib/parsers';
import { normalizeDayName } from '../lib/dayUtils';

const cloneRows = (rows = []) => rows.map((row) => ({ ...row }));

export const useStaffData = (selectedDay, cuponsData, diasSemana) => {
    const [staffRows, setStaffRows] = useState([]);
    const [isOptimized, setIsOptimized] = useState(false);
    const originalStaffRowsRef = useRef(null);
    const editableStaffRowsRef = useRef(null);
    const optimizedStaffRowsRef = useRef(null);

    const applyProcessedRows = useCallback((processedRows, currentSelectedDay) => {
        const uniqueDays = [...new Set(processedRows.map((row) => normalizeDayName(row.dia)).filter(Boolean))];
        setStaffRows((prev) => {
            let nextRows;
            if (uniqueDays.length > 1) {
                nextRows = processedRows
                    .filter((row) => row.dia)
                    .map((row) => ({ ...row, dia: normalizeDayName(row.dia) }));
            } else {
                const targetDay = uniqueDays.length === 1 ? uniqueDays[0] : normalizeDayName(currentSelectedDay);
                const otherDays = prev.filter((row) => normalizeDayName(row.dia) !== targetDay);
                const newRows = processedRows.map((row) => ({ ...row, dia: targetDay }));
                nextRows = [...otherDays, ...newRows];
            }

            originalStaffRowsRef.current = cloneRows(nextRows);
            editableStaffRowsRef.current = cloneRows(nextRows);
            optimizedStaffRowsRef.current = null;
            return nextRows;
        });
        setIsOptimized(false);
    }, []);

    const addStaffRow = useCallback(() => {
        setStaffRows((prev) => {
            const id = `manual-${Date.now()}`;
            const nextRows = [
                ...prev,
                {
                    id,
                    dia: normalizeDayName(selectedDay),
                    nome: '',
                    entrada: '',
                    intervalo: '',
                    saida: '',
                    saidaDiaSeguinte: false,
                },
            ];
            editableStaffRowsRef.current = cloneRows(nextRows);
            optimizedStaffRowsRef.current = null;
            return nextRows;
        });
        setIsOptimized(false);
    }, [selectedDay]);

    const updateStaffRow = useCallback((id, field, value) => {
        setStaffRows((prev) => {
            const nextRows = prev.map((row) => (row.id === id ? { ...row, [field]: value } : row));
            editableStaffRowsRef.current = cloneRows(nextRows);
            optimizedStaffRowsRef.current = null;
            return nextRows;
        });
        setIsOptimized(false);
    }, []);

    const removeStaffRow = useCallback((id) => {
        setStaffRows((prev) => {
            const nextRows = prev.filter((row) => row.id !== id);
            editableStaffRowsRef.current = cloneRows(nextRows);
            optimizedStaffRowsRef.current = null;
            return nextRows;
        });
        setIsOptimized(false);
    }, []);

    const optimizeSchedule = useCallback(() => {
        if (optimizedStaffRowsRef.current?.length) {
            setStaffRows(cloneRows(optimizedStaffRowsRef.current));
            setIsOptimized(true);
            return;
        }

        const sourceRows = cloneRows(
            Array.isArray(editableStaffRowsRef.current) && editableStaffRowsRef.current.length > 0
                ? editableStaffRowsRef.current
                : staffRows,
        );
        if (!sourceRows.length) return;

        const flowMap = {};
        if (cuponsData && cuponsData.length > 0) {
            Object.entries(diasSemana).forEach(([dayName, excelName]) => {
                const dayRows = cuponsData.filter((row) => row['Dia da Semana'] === excelName);
                const hourlyFlow = dayRows
                    .map((row) => {
                        const conversaoRaw = row['% Conversão'];
                        let conversion = 0;
                        if (conversaoRaw != null && conversaoRaw !== '') {
                            const num = parseFloat(conversaoRaw);
                            conversion = num < 1 ? num * 100 : num;
                        }

                        return {
                            hour: parseInt(row['cod_hora_entrada'], 10),
                            flow: parseFluxValue(row['qtd_entrante']),
                            conversion,
                        };
                    })
                    .filter((hourlyPoint) => !isNaN(hourlyPoint.hour));

                if (hourlyFlow.length > 0) {
                    flowMap[dayName] = hourlyFlow;
                }
            });
        }

        const optimized = optimizeAllDays(sourceRows, flowMap, { enableShiftSuggestion: true });
        optimizedStaffRowsRef.current = cloneRows(optimized);
        setStaffRows(cloneRows(optimized));
        setIsOptimized(true);
    }, [cuponsData, diasSemana, staffRows]);

    const toggleOptimized = useCallback(() => {
        if (editableStaffRowsRef.current) {
            setStaffRows(cloneRows(editableStaffRowsRef.current));
            setIsOptimized(false);
        }
    }, []);

    return {
        staffRows,
        setStaffRows,
        isOptimized,
        setIsOptimized,
        originalStaffRowsRef,
        optimizedStaffRowsRef,
        applyProcessedRows,
        addStaffRow,
        updateStaffRow,
        removeStaffRow,
        optimizeSchedule,
        toggleOptimized,
    };
};

export default useStaffData;
