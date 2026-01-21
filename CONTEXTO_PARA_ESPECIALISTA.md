# Contexto do Projeto: Dashboard Escala que Converte

Este documento reúne o histórico de desenvolvimento, as decisões lógicas tomadas e o código atual do dashboard para facilitar a revisão por um especialista.

## 1. Visão Geral
O projeto é um dashboard analítico para gestão de escalas de equipe em lojas de varejo. Ele cruza dados de **Fluxo de Clientes** (entrantes), **Conversão de Vendas** e **Escala de Equipe** (headcount por hora) para identificar ineficiências como:
- Horários com alto fluxo e baixa conversão (potencial perda de vendas).
- Horários com falta de equipe (subdimensionamento).
- Oportunidades de ajuste de escala.

## 2. Histórico de Desenvolvimento (Resumo)
Desde o início, trabalhamos nas seguintes frentes:

### Estabilização e Lógica (Backend/Frontend Logic)
1.  **Parsing de Dados (Robustez)**:
    - Implementamos `parseNumber` e `parseFluxValue` em `utils.js` para lidar com formatos numéricos brasileiros (ex: "1.000,00", "500.0%") e valores nulos vindos de planilhas Excel.
    - Criamos proteção contra arquivos corrompidos ou vazios no upload.
2.  **Cálculo de Headcount (HC)**:
    - O cálculo de funcionários por hora (`calculateStaffPerHour`) foi ajustado para considerar entradas, saídas e intervalos.
    - **Intervalos**: Funcionários em horário de almoço não contam para a "cobertura" daquela hora.
    - **Turnos**: Suporte para turnos que cruzam a meia-noite (embora raro no escopo atual, a lógica existe).
3.  **Detecção de Anomalias (Insights)**:
    - **Quedas Críticas**: Identificamos horas onde a conversão cai abruptamente em relação à hora anterior (`computeCriticalDrops`).
    - **Pico de Fluxo/Menor Conversão**: Métricas calculadas dinamicamente com base nos dados visíveis (ignorando horas sem operação, ex: 22h).

### Interface e UX (Refatoração Visual)
4.  **Visualização Gráfica (Recharts)**:
    - Implementamos um gráfico combinando (ComposedChart):
        - **Área**: Fluxo de Clientes (background).
        - **Linha**: Capacidade de Equipe (no eixo esquerdo).
        - **Barras**: Taxa de Conversão (no eixo direito).
    - **Normalização Visual**: Criamos um `scaleFactor` para que a linha de equipe ("Funcionarios Visual") seja plotada na mesma escala do fluxo, permitindo comparação visual imediata ("A linha da equipe deve cobrir a mancha do fluxo").
5.  **Layout SaaS**:
    - Refatoramos para um layout de  "App Viewport Fixo", ocupando 100% da altura da tela, sem rolagem global.
    - Sidebar fixa para a lista de funcionários.
    - Grid responsivo para KPIs e Gráficos.

## 3. Lógica de Negócio Crítica (Para Revisão)

### A. Normalização do Gráfico
Para facilitar a leitura visual, "inflamos" o número de funcionários no gráfico para parear com o volume de fluxo.
```javascript
// Fator de Escala: Quanto vale 1 funcionário na escala visual do Fluxo
const scaleFactor = maxFluxo / maxStaff;
// O dado "funcionarios_visual" é usado apenas para a linha no gráfico.
// O dado "funcionarios_real" é mostrado no tooltip.
```

### B. Tratamento de Arquivos
Processamos dois arquivos Excel separados:
1.  **Fluxo de Loja (`cupons`)**: Contém dados de fluxo por hora e vendas.
2.  **Escala (`escala`)**: Contém nomes e horários (Entrada, Saída, Intervalo) da equipe.
*A chave de ligação é o dia da semana.*

---

## 4. Código Atual

### `src/lib/utils.js` (Utilitários de Parsing)
```javascript
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// FORMATADORES DE DADOS
export const excelTimeToString = (serial) => {
  if (!serial) return "";
  if (typeof serial === 'string') return serial;
  // Excel time is fraction of day (e.g. 0.5 = 12:00)
  const totalSeconds = Math.round(serial * 24 * 60 * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const parseNumber = (value) => {
  if (typeof value === 'string') {
    return parseFloat(value.replace(/,/g, '')) || 0;
  }
  return parseFloat(value) || 0;
};

export const findAndParseConversion = (cupom) => {
  const conversaoValue = cupom['% Conversão'];
  if (conversaoValue == null || conversaoValue === '') return 0;
  const numericValue = parseFloat(conversaoValue);
  if (isNaN(numericValue)) return 0;
  return numericValue < 1 ? numericValue * 100 : numericValue;
};

export const parseFluxValue = (value) => {
  if (typeof value === 'string') {
    return parseFloat(value.replace('.0%', '')) || 0;
  }
  return parseFloat(value) || 0;
};
```

### `src/features/dashboard/Dashboard.jsx` (Componente Principal)
```javascript
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Upload, TrendingUp, Users, AlertCircle, BarChart3, LineChart as LineChartIcon, Plus, Trash2, Activity, Clock, X, ChevronLeft } from 'lucide-react';
import { LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line as RechartsLine, ComposedChart, ReferenceDot, Area, LabelList } from 'recharts';

import { excelTimeToString, parseNumber, findAndParseConversion, parseFluxValue } from '../../lib/utils';
import TimePickerModal from '../../components/ui/TimePickerModal';
import Header from './components/Header';
import Controls from './components/Controls';
import DailyStaffList from './components/DailyStaffList';
import WeeklyScaleView from './components/WeeklyScaleView';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const CorporateTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover/95 backdrop-blur-md border p-3 shadow-xl text-xs font-sans rounded-lg">
                <p className="font-bold text-foreground border-b mb-2 pb-1">{label}h</p>
                {payload.map((entry, index) => {
                    if (entry.dataKey === 'funcionarios_visual') {
                        return (
                            <p key={index} className="text-gray-200 font-semibold">
                                <span style={{ color: entry.color }}>■ </span>
                                Equipe: {entry.payload.funcionarios_real} pessoas
                            </p>
                        );
                    }
                    if (entry.dataKey === 'pontoAlerta') return null; // Não mostrar alerta no tooltip pois é visual
                    const prefix = entry.name === 'Conversão %' ? '' : '';
                    const suffix = entry.name === 'Conversão %' ? '%' : '';
                    return (
                        <p key={index} className="text-gray-300">
                            <span style={{ color: entry.color }}>■ </span>
                            {entry.name}: {prefix}{entry.value}{suffix}
                        </p>
                    );
                })}
            </div>
        );
    }
    return null;
};

const UploadBox = ({ type, title, onUpload, onDrag, onDrop, dragActiveState, data, errorState }) => (
    <Card
        className={`transition-all duration-300 h-[300px] flex flex-col items-center justify-center cursor-pointer border-dashed ${dragActiveState ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
        onDragEnter={(e) => onDrag(e, type)}
        onDragLeave={(e) => onDrag(e, type)}
        onDragOver={(e) => onDrag(e, type)}
        onDrop={(e) => onDrop(e, type)}
    >
        <label className="block cursor-pointer text-center w-full h-full flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-4 flex items-center justify-center">
                <Upload className={`w-6 h-6 ${dragActiveState ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-1">{title}</h3>
            {data.length > 0 && !errorState ? (
                <div className="mt-2 bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center tabular-nums">
                    ✓ {data.length} Regs
                </div>
            ) : errorState ? (
                <div className="mt-2 bg-destructive/10 text-destructive px-3 py-1 rounded-full text-xs font-bold">
                    {errorState}
                </div>
            ) : (
                <p className="text-muted-foreground text-xs">Arraste ou clique (.xlsx)</p>
            )}
            <input type="file" accept=".xlsx,.xls" onChange={(e) => onUpload(e, type)} className="hidden" />
        </label>
    </Card>
);

const UploadSection = ({ processFile, dragActive, setDragActive, cuponsData, error }) => (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 h-full items-center max-w-5xl mx-auto w-full">
        <UploadBox
            type="cupons"
            title="Fluxo de Loja"
            onUpload={(e) => processFile(e.target.files?.[0], 'cupons')}
            onDrag={(e, type) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.type === "dragenter" || e.type === "dragover") {
                    setDragActive(prev => ({ ...prev, [type]: true }));
                } else if (e.type === "dragleave") {
                    setDragActive(prev => ({ ...prev, [type]: false }));
                }
            }}
            onDrop={async (e, type) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(prev => ({ ...prev, [type]: false }));
                if (e.dataTransfer.files?.[0]) {
                    await processFile(e.dataTransfer.files[0], type);
                }
            }}
            dragActiveState={dragActive.cupons}
            data={cuponsData}
            errorState={error.cupons}
        />
        <Card className="h-[300px] flex flex-col overflow-hidden group">
            <CardHeader className="bg-muted/30 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold tracking-widest uppercase">Escala</CardTitle>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Atual
                    </span>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-6">
                <div
                    className={`h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${dragActive.escala ? 'bg-primary/5 border-primary' : 'bg-muted/20 hover:bg-muted/40 border-muted-foreground/20'}`}
                    onDragEnter={(e) => setDragActive(prev => ({ ...prev, escala: true }))}
                    onDragLeave={(e) => setDragActive(prev => ({ ...prev, escala: false }))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragActive(prev => ({ ...prev, escala: false }));
                        if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0], 'escala');
                    }}
                >
                    <label className="block cursor-pointer w-full h-full flex flex-col items-center justify-center">
                        <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary mb-3 transition-colors" />
                        <p className="text-xs text-muted-foreground font-medium">Arraste ou clique (.xlsx)</p>
                        <input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'escala')} className="hidden" />
                    </label>
                </div>
            </CardContent>
        </Card>
    </section>
);

const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 backdrop-blur-sm">
        <Card className="p-8 shadow-2xl text-center min-w-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground font-medium tabular-nums text-sm">Processando...</p>
        </Card>
    </div>
);

const Dashboard = () => {
    const dashboardRef = useRef(null);
    // --- STATE MANAGEMENT ---
    const [dragActive, setDragActive] = useState({ cupons: false, escala: false });
    const [cuponsData, setCuponsData] = useState([]);
    const [selectedDay, setSelectedDay] = useState('SEGUNDA');
    const [chartType, setChartType] = useState('composed');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState({ cupons: null, escala: null });
    const [theme, setTheme] = useState('dark');
    const [showUploadSection, setShowUploadSection] = useState(false);
    const [activeTab, setActiveTab] = useState('cobertura');

    // TESTE: Simular upload
    useEffect(() => {
        if (cuponsData.length === 0) {
            console.log("INJECTING DUMMY DATA");
            const dummy = Array.from({ length: 10 }, (_, i) => ({
                'Dia da Semana': '1. Seg',
                'cod_hora_entrada': (10 + i).toString(),
                'qtd_cupom': 100,
                'qtd_entrante': "500.0%",
                '% Conversão': "0.2"
            }));
            // Need a Total row for dailyData calculation
            dummy.push({
                'Dia da Semana': '1. Seg',
                'cod_hora_entrada': 'Total',
                'qtd_cupom': 1000,
                'qtd_entrante': "5000.0%"
            });
            setCuponsData(dummy);
        }
    }, []);

    // Estado do Picker de Hora
    const [pickerState, setPickerState] = useState({ isOpen: false, rowId: null, field: null, value: '' });

    // --- SEED DATA GENERATOR ---
    const generateSeedData = useCallback(() => {
        const days = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];
        let rows = [];
        let idCounter = 1;
        days.forEach(day => {
            for (let i = 0; i < 10; i++) {
                rows.push({
                    id: `seed-${day}-${idCounter++}`,
                    dia: day,
                    nome: `COLAB ${String(i + 1).padStart(2, '0')}`,
                    entrada: '10:00',
                    intervalo: '14:00',
                    saida: '18:00',
                    saidaDiaSeguinte: false
                });
            }
        });
        return rows;
    }, []);

    const [staffRows, setStaffRows] = useState(generateSeedData());

    // --- THEME SWITCHER ---
    useEffect(() => {
        setTheme('dark');
        document.documentElement.classList.add('dark');
    }, []);

    // --- CONSTANTS & MAPPINGS ---
    const diasSemana = useMemo(() => ({
        'SEGUNDA': '1. Seg',
        'TERÇA': '2. Ter',
        'QUARTA': '3. Qua',
        'QUINTA': '4. Qui',
        'SEXTA': '5. Sex',
        'SÁBADO': '6. Sab',
        'DOMINGO': '7. Dom'
    }), []);


    // --- FILE PROCESSING ---
    const processFile = useCallback(async (file, type) => {
        setLoading(true);
        setError(prev => ({ ...prev, [type]: null }));
        try {
            const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs');
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
            if (type === 'cupons') {
                setCuponsData(jsonData);
            } else {
                const processedRows = jsonData.map((row, index) => ({
                    id: `upload-${Date.now()}-${index}`,
                    dia: row.DIA ? row.DIA.toUpperCase().trim() : null,
                    nome: row.ATLETA || row.NOME || 'Sem Nome',
                    entrada: excelTimeToString(row.ENTRADA) || '',
                    intervalo: excelTimeToString(row.INTER) || '',
                    saida: excelTimeToString(row.SAIDA) || '',
                    saidaDiaSeguinte: false
                })).map(row => {
                    if (row.entrada && row.saida) {
                        const [hE] = row.entrada.split(':').map(Number);
                        const [hS] = row.saida.split(':').map(Number);
                        if (hS < hE) row.saidaDiaSeguinte = true;
                    }
                    return row;
                });

                const uniqueDays = [...new Set(processedRows.map(r => r.dia).filter(Boolean))];

                setStaffRows(prev => {
                    if (uniqueDays.length > 1) {
                        return processedRows.filter(r => r.dia);
                    }
                    else {
                        const targetDay = uniqueDays.length === 1 ? uniqueDays[0] : selectedDay;
                        const otherDays = prev.filter(r => r.dia !== targetDay);
                        const newRows = processedRows.map(r => ({ ...r, dia: targetDay }));
                        return [...otherDays, ...newRows];
                    }
                });
            }
        } catch (err) {
            console.error(`Error processing ${type} file:`, err);
            setError(prev => ({ ...prev, [type]: 'Erro ao processar. Verifique o formato do arquivo.' }));
        }
        setLoading(false);
    }, [selectedDay]);

    const updateStaffRow = useCallback((id, field, value) => {
        setStaffRows(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    }, []);

    // --- LOGICA DO TIME PICKER ---
    const openTimePicker = (id, field, currentValue) => {
        setPickerState({
            isOpen: true,
            rowId: id,
            field: field,
            value: currentValue
        });
    };

    const handleTimePickerSelect = (newValue) => {
        if (pickerState.rowId && pickerState.field) {
            updateStaffRow(pickerState.rowId, pickerState.field, newValue);
        }
    };

    // --- DATA COMPUTATION ---
    const dailyData = useMemo(() => {
        if (!cuponsData.length) return null;

        const dayMapping = diasSemana[selectedDay];
        const totalRow = cuponsData.find(c => c['Dia da Semana'] === dayMapping && c['cod_hora_entrada'] === 'Total');

        const totalCupons = totalRow ? parseNumber(totalRow['qtd_cupom']) : 0;
        const totalFluxo = totalRow ? parseFluxValue(totalRow['qtd_entrante']) : 0;

        const dayCupons = cuponsData.filter(c =>
            c['Dia da Semana'] === dayMapping &&
            c['cod_hora_entrada'] !== 'Total' &&
            !isNaN(parseInt(c['cod_hora_entrada'], 10))
        );

        const effectiveEscalaData = staffRows
            .filter(r => r.dia === selectedDay)
            .map(row => ({
                id: row.id,
                raw: row,
                DIA: row.dia,
                ATLETA: row.nome,
                nome: row.nome,
                entrada: row.entrada,
                intervalo: row.intervalo,
                saida: row.saida,
                saidaDiaSeguinte: row.saidaDiaSeguinte,
                ENTRADA: row.entrada,
                INTER: row.intervalo,
                SAIDA: row.saidaDiaSeguinte ? (row.saida ? `${row.saida} (+1)` : '') : row.saida
            }));

        const dailySchedule = effectiveEscalaData.length > 0
            ? effectiveEscalaData
                .filter(e => e.ENTRADA)
                .sort((a, b) => {
                    const timeA = a.ENTRADA ? parseInt(a.ENTRADA.split(':')[0], 10) : 99;
                    const timeB = b.ENTRADA ? parseInt(b.ENTRADA.split(':')[0], 10) : 99;
                    return timeA - timeB;
                })
            : [];

        const operatingHours = dayCupons.map(c => parseInt(c['cod_hora_entrada'], 10)).sort((a, b) => a - b);
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
    }, [cuponsData, staffRows, selectedDay, diasSemana]);

    const calculateStaffPerHour = useCallback((dayData, minHour, maxHour) => {
        const staffCount = {};
        if (!dayData) return staffCount;

        for (let hour = minHour; hour <= maxHour; hour++) {
            staffCount[hour] = 0;
            dayData.forEach(person => {
                if (!person.ENTRADA || !person.SAIDA) return;
                const entradaHour = parseInt(person.ENTRADA.split(':')[0], 10);
                let saidaHour = parseInt(person.SAIDA.split(':')[0], 10);
                if (saidaHour < entradaHour) saidaHour += 24;
                const interHour = person.INTER ? parseInt(person.INTER.split(':')[0], 10) : -1;
                if (hour >= entradaHour && hour < saidaHour && hour !== interHour) {
                    staffCount[hour]++;
                }
            });
        }
        return staffCount;
    }, []);

    // --- LÓGICA DE NORMALIZAÇÃO (Matemática para o Gráfico) ---
    const chartData = useMemo(() => {
        if (!dailyData || dailyData.length === 0) return [];

        // FILTRO: Ignorar 22h para gráficos e métricas (mantém apenas na escala)
        const filteredDayCupons = dailyData.dayCupons.filter(c => parseInt(c['cod_hora_entrada'], 10) !== 22);

        const staffPerHour = calculateStaffPerHour(dailyData.dailySchedule, dailyData.minHour, dailyData.maxHour);
        const totalCuponsForPercent = dailyData.totalCupons || 1;
        const totalFluxoForPercent = dailyData.totalFluxo || 1;

        // 2. Mapeamento Inicial
        const basicData = filteredDayCupons.map(cupom => {
            const hour = parseInt(cupom['cod_hora_entrada'], 10);
            const qtdCupons = parseNumber(cupom['qtd_cupom']);
            const qtdFluxo = parseFluxValue(cupom['qtd_entrante']);
            const percentualConversao = findAndParseConversion(cupom);

            return {
                hora: `${hour}`, // Mantendo string simples para o eixo X
                funcionarios: staffPerHour[hour] || 0,
                percentualCupons: parseFloat(((qtdCupons / totalCuponsForPercent) * 100).toFixed(1)),
                cupons: qtdCupons,
                percentualFluxo: parseFloat(((qtdFluxo / totalFluxoForPercent) * 100).toFixed(1)),
                fluxo: qtdFluxo,
                percentualConversao: percentualConversao,
                conversao: percentualConversao
            };
        });

        if (basicData.length === 0) return [];

        const maxFluxo = Math.max(...basicData.map(d => Number(d.fluxo) || 0));
        const maxStaff = Math.max(...basicData.map(d => Number(d.funcionarios) || 0)) || 1;

        // Fator de Escala: Quanto vale 1 funcionário na escala visual do Fluxo
        const scaleFactor = maxFluxo / maxStaff;

        return basicData.map(item => ({
            ...item,
            // Dados Reais
            fluxo: Number(item.fluxo),
            conversao: Number(item.conversao),
            funcionarios_real: Number(item.funcionarios),

            // Dado Visual (Inflado)
            funcionarios_visual: Number(item.funcionarios) * scaleFactor,

            // --- PONTO CRÍTICO (VISUAL ALERT) ---
            // Se fluxo > 50 e conversão < 10, marca o ponto exatamente no pico do fluxo
            pontoCritico: (Number(item.fluxo) > 50 && Number(item.conversao) < 10) ? Number(item.fluxo) : null
        }));
    }, [dailyData, calculateStaffPerHour]);

    const insights = useMemo(() => {
        if (!chartData.length) return null;
        const validConversionHours = chartData.filter(d => d.percentualConversao > 0);
        const lowestConversionHour = validConversionHours.length > 0
            ? validConversionHours.reduce((min, curr) => curr.percentualConversao < min.percentualConversao ? curr : min)
            : null;
        const peakFluxoHour = chartData.length > 0 ? chartData.reduce((max, curr) => curr.percentualFluxo > max.percentualFluxo ? curr : max) : null;
        const relevantHoursForStaffing = chartData.filter(d => parseInt(d.hora.replace('h', '')) < 22);
        const understaffedHour = relevantHoursForStaffing.length > 0
            ? relevantHoursForStaffing.reduce((min, curr) => curr.funcionarios < min.funcionarios ? curr : min, relevantHoursForStaffing[0])
            : null;
        return { lowestConversionHour, peakFluxoHour, understaffedHour };
    }, [chartData]);


    // --- EXPORT FUNCTION ---
    const exportData = async () => {
        if (!chartData.length || !insights) return;
        try {
            const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs');
            const exportableChartData = chartData.map(item => ({
                'Hora': item.hora,
                'Funcionários': item.funcionarios,
                'Percentual Cupons (%)': item.percentualCupons,
                'Quantidade Cupons': item.cupons,
                'Percentual Fluxo (%)': item.percentualFluxo,
                'Quantidade Fluxo': item.fluxo
            }));
            const insightsData = [
                {},
                { 'Hora': '--- INSIGHTS ---' },
                { 'Hora': 'Menor Conversão', 'Funcionários': insights.lowestConversionHour ? insights.lowestConversionHour.hora : 'N/A', 'Percentual Cupons (%)': insights.lowestConversionHour ? `${insights.lowestConversionHour.percentualConversao}%` : 'N/A' },
                { 'Hora': 'Menor Cobertura', 'Funcionários': insights.understaffedHour ? `${insights.understaffedHour.funcionarios} funcionários` : 'N/A', 'Percentual Cupons (%)': insights.understaffedHour ? insights.understaffedHour.hora : 'N/A' }
            ];
            const ws = XLSX.utils.json_to_sheet(exportableChartData.concat(insightsData));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, `Análise ${selectedDay}`);
            XLSX.writeFile(wb, `analise-${selectedDay.toLowerCase()}.xlsx`);
        } catch (err) {
            console.error("Failed to export data:", err);
            setError(prev => ({ ...prev, export: 'Falha ao exportar dados.' }));
        }
    };

    // Helper function for anomaly detection
    const computeCriticalDrops = (data) => {
        if (!data || data.length < 2) return { criticalDrops: 0, horasCriticas: [] };
        const drops = [];

        for (let i = 1; i < data.length; i++) {
            const current = data[i];
            const prev = data[i - 1];
            const delta = (Number(current.conversao) || 0) - (Number(prev.conversao) || 0);
            if (delta < 0) drops.push({ hora: `${current.hora}h`, delta });
        }

        // Ordena pelas 2 piores quedas
        const topDrops = drops.sort((a, b) => a.delta - b.delta).slice(0, 2);
        return {
            criticalDrops: topDrops.length,
            horasCriticas: topDrops.map(d => d.hora)
        };
    };

    const MainContent = ({ dailyData, insights, chartData, chartType, theme, activeTab, setActiveTab, staffRows, selectedDay, openTimePicker, pickerState, handleTimePickerSelect }) => {
        // --- ANOMALY DETECTION LOGIC (UNCHANGED) ---
        const MIN_FLUXO = 10;
        const STABLE_FLUXO_PCT = 0.15;
        const ALERT_DROP_PP = 2.0;
        const OPP_RISE_PP = 1.5;

        const dailyMetrics = useMemo(() => {
            if (!chartData || chartData.length === 0) return null;

            // Quedas Críticas Dinâmicas
            const { criticalDrops, horasCriticas } = computeCriticalDrops(chartData);

            // Cálculo de Fluxo
            const totalFlow = chartData.reduce((acc, curr) => acc + (Number(curr.fluxo) || 0), 0);
            const maxFlowObj = chartData.reduce((max, curr) => (Number(curr.fluxo) || 0) > (Number(max.fluxo) || 0) ? curr : max, chartData[0]);
            const maxFlow = Number(maxFlowObj.fluxo) || 0;
            const maxFlowHour = `${maxFlowObj.hora}h`;
            const maxFlowPct = totalFlow > 0 ? ((maxFlow / totalFlow) * 100).toFixed(1) : 0;

            // Menor Cobertura
            const validStaffData = chartData.filter(d => d.funcionarios_real > 0);
            let minStaff = 0;
            let minStaffHour = "Nenhum";

            if (validStaffData.length > 0) {
                const minStaffObj = validStaffData.reduce((min, curr) =>
                    curr.funcionarios_real < min.funcionarios_real ? curr : min
                    , validStaffData[0]);
                minStaff = minStaffObj.funcionarios_real;
                minStaffHour = `${minStaffObj.hora}h`;
            }

            const validConversions = chartData.filter(d => d.conversao > 0).map(d => d.conversao);
            const minConversion = validConversions.length ? Math.min(...validConversions) : 0;

            return { criticalDrops, horasCriticas, minConversion, maxFlow, maxFlowHour, maxFlowPct, minStaff, minStaffHour };
        }, [chartData]);

        return (
            // VIEWPORT FULL HEIGHT GRID - FIXED
            <main className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-4 md:p-6 w-full h-auto xl:h-[calc(100vh-100px)] overflow-y-auto xl:overflow-hidden">

                {/* ESQUERDA: ESCALA (Mobile: Topo / Desktop: Sidebar Fixa) */}
                <aside className="xl:col-span-3 flex flex-col h-auto xl:h-full xl:overflow-hidden order-2 xl:order-1">
                    <Card className="h-[500px] xl:h-full flex flex-col shadow-lg overflow-hidden border-muted">
                        <CardContent className="p-0 h-full">
                            <DailyStaffList staffRows={staffRows} selectedDay={selectedDay} onTimeEdit={openTimePicker} />
                        </CardContent>
                    </Card>
                </aside>

                {/* DIREITA: CHARTS (Mobile: Bottom / Desktop: Main Content) */}
                <section className="xl:col-span-9 flex flex-col gap-6 h-auto xl:h-full min-h-0 min-w-0 xl:overflow-y-auto custom-scroll pr-0 xl:pr-2 order-1 xl:order-2">

                    {/* Main Chart (Always Visible) */}
                    <Card className="w-full shadow-lg">
                        <CardHeader className="border-b bg-muted/30 py-4">
                            <CardTitle className="text-sm font-bold uppercase tracking-wide border-l-4 border-primary pl-2">
                                Relatório de Capacidade vs. Demanda
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-6">
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                                        <XAxis
                                            dataKey="hora"
                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                                            axisLine={false}
                                            tickLine={false}
                                            dy={10}
                                            tickFormatter={(v) => `${v}h`}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            unit="%"
                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                                            axisLine={false}
                                            tickLine={false}
                                            domain={[0, dataMax => (dataMax > 25 ? dataMax : 25)]}
                                        />
                                        <Tooltip
                                            content={<CorporateTooltip />}
                                            cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                                        />
                                        <Legend
                                            verticalAlign="top"
                                            height={36}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--foreground))', fontWeight: 500 }}
                                        />

                                        {/* 1. FLUXO: Área Cinza Sólida */}
                                        <Area
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="fluxo"
                                            name="Fluxo Clientes"
                                            fill="hsl(var(--muted))"
                                            stroke="hsl(var(--muted-foreground))"
                                            fillOpacity={0.2}
                                            activeDot={false}
                                        />

                                        {/* 2. CONVERSÃO: Barras Verdes */}
                                        <Bar
                                            yAxisId="right"
                                            dataKey="conversao"
                                            name="Conversão %"
                                            barSize={16}
                                            fill="#10b981"
                                            radius={[4, 4, 0, 0]}
                                        >
                                            <LabelList
                                                dataKey="conversao"
                                                position="top"
                                                fill="#10b981"
                                                fontSize={9}
                                                fontWeight="bold"
                                                formatter={(val) => `${val.toFixed(1)}%`}
                                            />
                                        </Bar>

                                        {/* 2.1 ALERTA DE QUEDAS: Dots Vermelhos */}
                                        <RechartsLine
                                            yAxisId="right"
                                            dataKey="conversao"
                                            name="Conversão %"
                                            stroke="none"
                                            dot={(props) => {
                                                const { cx, cy, payload } = props;
                                                const isCritical = dailyMetrics?.horasCriticas?.includes(`${payload.hora}h`);
                                                if (isCritical) {
                                                    return <circle cx={cx} cy={cy} r={5} fill="#EF4444" stroke="hsl(var(--background))" strokeWidth={2} />;
                                                }
                                                return null;
                                            }}
                                            activeDot={{ r: 6, fill: '#059669', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                                            legendType="none"
                                            isAnimationActive={false}
                                        />

                                        {/* 3. EQUIPE: Linha Curva */}
                                        <RechartsLine
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="funcionarios_visual"
                                            name="Equipe (Capacidade)"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                                        />

                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* New KPI Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2 mb-8">

                        {/* Card 1: Alerta de Quedas */}
                        <Card className="border-l-4 border-l-red-500 shadow-md">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Alerta de Quedas</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold text-red-500">{dailyMetrics?.criticalDrops || 0}</span>
                                    <div className="text-xs text-red-400 mt-1 font-mono">
                                        Horários: {dailyMetrics?.horasCriticas?.length > 0 ? dailyMetrics.horasCriticas.join(', ') : "Nenhum"}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 2: Menor Conversão */}
                        <Card className="shadow-md">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Menor Conversão</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <span className="text-2xl font-bold text-foreground">
                                    {dailyMetrics?.minConversion ? dailyMetrics.minConversion.toFixed(1) : 0}%
                                </span>
                            </CardContent>
                        </Card>

                        {/* Card 3: Pico de Fluxo */}
                        <Card className="shadow-md">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pico de Fluxo</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold text-blue-500">{dailyMetrics?.maxFlow || 0}</span>
                                    <span className="text-xs text-blue-400 mt-1 font-mono">
                                        Pico: {dailyMetrics?.maxFlowHour} ({dailyMetrics?.maxFlowPct}% do total)
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 4: Menor Cobertura */}
                        <Card className="border-l-4 border-l-primary shadow-md">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Menor Cobertura</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold text-primary">{dailyMetrics?.minStaff || 0}</span>
                                    <span className="text-xs text-primary/70 mt-1 font-mono">
                                        Horário: {dailyMetrics?.minStaffHour || "Nenhum"}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                </section>

                {/* Renderiza o Modal de Hora fora do fluxo do aside para não cortar com overflow */}
                <TimePickerModal
                    isOpen={pickerState.isOpen}
                    onClose={() => setPickerState({ ...pickerState, isOpen: false })}
                    onSelect={handleTimePickerSelect}
                    initialValue={pickerState.value}
                />

            </main>
        );
    };

    return (
        <div className="min-h-screen w-full bg-background flex flex-col">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.02] z-0" />
            <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.01); }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.5); cursor: pointer; }
      `}</style>

            {/* O dashboardRef agora deve ocupar 100% sem margens laterais */}
            <div ref={dashboardRef} className="w-full flex-1 flex flex-col">
                <Header />

                {loading && <LoadingOverlay />}

                {!cuponsData.length ? (
                    <div className="flex-1 flex items-center justify-center p-12">
                        <UploadSection
                            processFile={processFile}
                            dragActive={dragActive}
                            setDragActive={setDragActive}
                            cuponsData={cuponsData}
                            error={error}
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        <Controls
                            diasAbreviados={['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']}
                            fullDayNames={{ 'SEG': 'SEGUNDA', 'TER': 'TERÇA', 'QUA': 'QUARTA', 'QUI': 'QUINTA', 'SEX': 'SEXTA', 'SAB': 'SÁBADO', 'DOM': 'DOMINGO' }}
                            selectedDay={selectedDay}
                            setSelectedDay={setSelectedDay}
                            chartType={chartType}
                            setChartType={setChartType}
                            toggleTheme={() => { }}
                            theme={theme}
                            setShowUploadSection={setShowUploadSection}
                            exportData={exportData}
                        />

                        {/* Conteúdo principal colado nas bordas ou com padding controlado */}
                        <div className="flex-1 w-full overflow-y-auto custom-scroll">
                            <MainContent
                                onTimeEdit={openTimePicker}
                                dailyData={dailyData}
                                insights={insights}
                                chartData={chartData}
                                chartType={chartType}
                                theme={theme}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                staffRows={staffRows}
                                selectedDay={selectedDay}
                            />
                            {/* Renderiza o Modal de Hora fora do fluxo do aside para não cortar com overflow */}
                            <TimePickerModal
                                isOpen={pickerState.isOpen}
                                onClose={() => setPickerState({ ...pickerState, isOpen: false })}
                                onSelect={handleTimePickerSelect}
                                initialValue={pickerState.value}
                            />
                            <div className="px-6 pb-10">
                                <WeeklyScaleView staffRows={staffRows} />
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL (Renderizado via Portal ou Fixed - aqui dentro do container relativo também funciona se for fixed screen) */}
                {showUploadSection && (
                    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-12 rounded-3xl">
                        <div className="relative w-full max-w-5xl mx-auto">
                            <button onClick={() => setShowUploadSection(false)} className="absolute -top-10 right-0 text-white hover:text-[#D6B46A]">Fechar</button>
                            <UploadSection
                                processFile={processFile}
                                dragActive={dragActive}
                                setDragActive={setDragActive}
                                cuponsData={cuponsData}
                                error={error}
                            />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Dashboard;
```
