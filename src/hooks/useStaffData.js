import { useCallback, useRef, useState } from 'react';
import { optimizeAllDays } from '../lib/thermalBalance';
import { parseFluxValue } from '../lib/parsers';

const generateSeedData = () => {
    const days = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];
    let rows = [];
    let idCounter = 1;

    days.forEach((day) => {
        for (let i = 0; i < 10; i++) {
            rows.push({
                id: `seed-${day}-${idCounter++}`,
                dia: day,
                nome: `COLAB ${String(i + 1).padStart(2, '0')}`,
                entrada: '10:00',
                intervalo: '14:00',
                saida: '18:00',
                saidaDiaSeguinte: false,
            });
        }
    });

    return rows;
};

export const useStaffData = (selectedDay, cuponsData, diasSemana) => {
    const [staffRows, setStaffRows] = useState(generateSeedData);
    const [isOptimized, setIsOptimized] = useState(false);
    const originalStaffRowsRef = useRef(null);
    const optimizedStaffRowsRef = useRef(null);

    const applyProcessedRows = useCallback((processedRows, currentSelectedDay) => {
        originalStaffRowsRef.current = JSON.parse(JSON.stringify(processedRows));

        const uniqueDays = [...new Set(processedRows.map((row) => row.dia).filter(Boolean))];
        setStaffRows((prev) => {
            if (uniqueDays.length > 1) {
                return processedRows.filter((row) => row.dia);
            }

            const targetDay = uniqueDays.length === 1 ? uniqueDays[0] : currentSelectedDay;
            const otherDays = prev.filter((row) => row.dia !== targetDay);
            const newRows = processedRows.map((row) => ({ ...row, dia: targetDay }));
            return [...otherDays, ...newRows];
        });
        setIsOptimized(false);
    }, []);

    const addStaffRow = useCallback(() => {
        setStaffRows((prev) => {
            const id = `manual-${Date.now()}`;
            return [
                ...prev,
                {
                    id,
                    dia: selectedDay,
                    nome: '',
                    entrada: '',
                    intervalo: '',
                    saida: '',
                    saidaDiaSeguinte: false,
                },
            ];
        });
    }, [selectedDay]);

    const updateStaffRow = useCallback((id, field, value) => {
        setStaffRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
    }, []);

    const removeStaffRow = useCallback((id) => {
        setStaffRows((prev) => prev.filter((row) => row.id !== id));
    }, []);

    const optimizeSchedule = useCallback(() => {
        if (!originalStaffRowsRef.current) {
            originalStaffRowsRef.current = [...staffRows];
        }

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

        const optimized = optimizeAllDays(staffRows, flowMap);
        optimizedStaffRowsRef.current = optimized;
        setStaffRows(optimized);
        setIsOptimized(true);
    }, [cuponsData, diasSemana, staffRows]);

    const toggleOptimized = useCallback(() => {
        if (originalStaffRowsRef.current) {
            setStaffRows([...originalStaffRowsRef.current]);
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
