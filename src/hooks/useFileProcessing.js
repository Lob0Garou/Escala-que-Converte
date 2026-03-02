import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { excelTimeToString } from '../lib/parsers';

export const useFileProcessing = (selectedDay, onEscalaProcessed) => {
    const [dragActive, setDragActive] = useState({ cupons: false, escala: false, vendas: false });
    const [cuponsData, setCuponsData] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState({ cupons: null, escala: null, vendas: null });

    const keysMatch = useCallback((obj, possibilities) => {
        const keys = Object.keys(obj).map((key) => key.toLowerCase());
        return possibilities.some((possibility) => keys.includes(possibility.toLowerCase()));
    }, []);

    const processFile = useCallback(async (file, type) => {
        setLoading(true);
        setError((prev) => ({ ...prev, [type]: null }));

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true });

            if (type === 'vendas') {
                const hasHora = jsonData[0] && keysMatch(jsonData[0], ['Hora', 'hora', 'HORA']);
                const hasValor = jsonData[0] && keysMatch(jsonData[0], ['Valor_Venda', 'valor_venda', 'Venda', 'Valor']);
                if (!hasHora || !hasValor) {
                    // Mantem comportamento permissivo do projeto atual.
                }
                setSalesData(jsonData);
            } else if (type === 'cupons') {
                setCuponsData(jsonData);
            } else {
                const processedRows = jsonData
                    .map((row, index) => ({
                        id: `upload-${Date.now()}-${index}`,
                        dia: row.DIA ? row.DIA.toUpperCase().trim() : null,
                        nome: row.ATLETA || row.NOME || 'Sem Nome',
                        entrada: excelTimeToString(row.ENTRADA) || '',
                        intervalo: excelTimeToString(row.INTER) || '',
                        saida: excelTimeToString(row.SAIDA) || '',
                        saidaDiaSeguinte: false,
                    }))
                    .map((row) => {
                        if (row.entrada && row.saida) {
                            const [hEntrada] = row.entrada.split(':').map(Number);
                            const [hSaida] = row.saida.split(':').map(Number);
                            if (hSaida < hEntrada) row.saidaDiaSeguinte = true;
                        }
                        return row;
                    });

                if (typeof onEscalaProcessed === 'function') {
                    onEscalaProcessed(processedRows, selectedDay);
                }
            }
        } catch (err) {
            setError((prev) => ({
                ...prev,
                [type]: `Erro: ${err.message || 'Falha desconhecida'}. Verifique o console (F12).`,
            }));
        } finally {
            setLoading(false);
        }
    }, [keysMatch, onEscalaProcessed, selectedDay]);

    const handleFileUpload = useCallback(async (eventOrFile, type) => {
        const file = eventOrFile?.target?.files?.[0] || eventOrFile;
        if (file) await processFile(file, type);
    }, [processFile]);

    const handleDrag = useCallback((event, type) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.type === 'dragenter' || event.type === 'dragover') {
            setDragActive((prev) => ({ ...prev, [type]: true }));
        } else if (event.type === 'dragleave') {
            setDragActive((prev) => ({ ...prev, [type]: false }));
        }
    }, []);

    const handleDrop = useCallback(async (event, type) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive((prev) => ({ ...prev, [type]: false }));
        if (event.dataTransfer.files?.[0]) {
            await processFile(event.dataTransfer.files[0], type);
        }
    }, [processFile]);

    return {
        dragActive,
        setDragActive,
        cuponsData,
        setCuponsData,
        salesData,
        setSalesData,
        loading,
        error,
        processFile,
        handleFileUpload,
        handleDrag,
        handleDrop,
        keysMatch,
        setError,
        setLoading,
    };
};

export default useFileProcessing;
