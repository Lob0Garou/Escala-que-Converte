import React, { useState, useCallback, useMemo, useEffect, useRef, forwardRef } from 'react';
import RemoveBgImage from './components/RemoveBgImage';
import CENTAURO_BRAND from './lib/centauro_brand_assets';
import html2canvas from 'html2canvas';
import { Upload, TrendingUp, Users, AlertCircle, Plus, Trash2, Clock, X, ChevronLeft, Download, Thermometer, Zap, Banknote, Percent, ShoppingBag, Coins, Activity, BarChart3 } from 'lucide-react';
import { LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line as RechartsLine, ComposedChart, ReferenceDot, Area, LabelList, ReferenceArea } from 'recharts';
import { computeThermalMetrics, generateSuggestedCoverage, formatThermalIndex, formatPressure, optimizeScheduleRows, optimizeAllDays } from './lib/thermalBalance';
import { calculateRevenueImpact } from './lib/revenueEngine';
import { excelTimeToString, parseNumber, findAndParseConversion, parseFluxValue } from './lib/parsers';
import { calculateStaffByHour } from './lib/staffUtils';
import { computeCriticalDrops } from './lib/insightEngine';
import { countWeekdaysInMonth } from './lib/dateUtils';
import * as XLSX from 'xlsx';

// --- COMPONENTE NOVO: SELETOR DE HORA (3 CLIQUES) ---
const TimePickerModal = ({ isOpen, onClose, onSelect, initialValue, title }) => {
  const [step, setStep] = useState('hour'); // 'hour' ou 'minute'
  const [selectedHour, setSelectedHour] = useState(null);

  // Reseta o estado ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep('hour');
      if (initialValue) {
        const [h] = initialValue.split(':');
        setSelectedHour(h);
      }
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const handleHourClick = (h) => {
    setSelectedHour(h);
    setStep('minute');
  };

  const handleMinuteClick = (m) => {
    onSelect(`${selectedHour}:${m}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1a1e27] border border-white/10 rounded-2xl shadow-2xl w-[320px] overflow-hidden transform transition-all scale-100">
        {/* Header do Modal */}
        <div className="bg-[#11141a] p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 'minute' && (
              <button onClick={() => setStep('hour')} className="text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
              {step === 'hour' ? 'Escolha a Hora' : `Hora: ${selectedHour}h`}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-4">
          {step === 'hour' && (
            <div className="grid grid-cols-6 gap-2">
              {hours.map((h) => (
                <button
                  key={h}
                  onClick={() => handleHourClick(h)}
                  className={`
                    h-10 rounded-lg text-sm font-bold tabular-nums transition-all border
                    ${selectedHour === h
                      ? 'bg-[#E30613] text-black border-[#E30613] shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                      : 'bg-[#11141a] border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/10'
                    }
                  `}
                >
                  {h}
                </button>
              ))}
            </div>
          )}

          {step === 'minute' && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-center text-slate-500 uppercase tracking-widest">Selecione os minutos</p>
              <div className="grid grid-cols-2 gap-3">
                {minutes.map((m) => (
                  <button
                    key={m}
                    onClick={() => handleMinuteClick(m)}
                    className="h-14 rounded-xl bg-[#11141a] border border-white/5 text-xl font-bold text-white hover:bg-[#E30613]/20 hover:border-[#E30613] hover:text-[#E30613] transition-all tabular-nums"
                  >
                    :{m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  return <Dashboard />;
};

// The main Dashboard component
const Dashboard = () => {
  const dashboardRef = useRef(null);
  const printRef = useRef(null);

  const [printTheme, setPrintTheme] = useState('dark');

  const handleDownloadImage = useCallback(async () => {
    if (!printRef.current) return;

    try {
      // Temporarily ensure the element is visible and fully expanded
      const originalPosition = printRef.current.style.position;
      const originalLeft = printRef.current.style.left;

      // Force layout recalculation
      const scrollHeight = printRef.current.scrollHeight;
      const windowWidth = 1280;

      const canvas = await html2canvas(printRef.current, {
        backgroundColor: printTheme === 'dark' ? '#0a0c10' : '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: windowWidth,
        height: scrollHeight + 100, // Add buffer
        windowWidth: windowWidth,
        windowHeight: scrollHeight + 100,
        onclone: (clonedDoc) => {
          const element = clonedDoc.querySelector('[data-print-target]');
          if (element) {
            element.style.display = 'flex';
            element.style.visibility = 'visible';
            // Ensure background is correct in clone
            if (printTheme === 'light') {
              element.style.background = '#ffffff';
            }
          }
        }
      });

      const link = document.createElement('a');
      link.download = `escala-semanal-${printTheme}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
    }
  }, [printTheme]);

  useEffect(() => {
    const handleEvent = () => handleDownloadImage();
    const handleThemeUpdate = (e) => setPrintTheme(e.detail);

    window.addEventListener('generate-weekly-image', handleEvent);
    window.addEventListener('update-print-theme', handleThemeUpdate);

    return () => {
      window.removeEventListener('generate-weekly-image', handleEvent);
      window.removeEventListener('update-print-theme', handleThemeUpdate);
    };
  }, [handleDownloadImage]);

  // --- STATE MANAGEMENT ---
  const [dragActive, setDragActive] = useState({ cupons: false, escala: false });
  const [cuponsData, setCuponsData] = useState([]);
  const [selectedDay, setSelectedDay] = useState('SEGUNDA');
  const [chartType, setChartType] = useState('composed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ cupons: null, escala: null });
  const [theme, setTheme] = useState('dark');
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState(null);
  const [activeTab, setActiveTab] = useState('cobertura');

  // Estado do Picker de Hora
  const [pickerState, setPickerState] = useState({ isOpen: false, rowId: null, field: null, value: '' });

  // --- REVENUE VISION STATE ---
  const [salesData, setSalesData] = useState([]);
  const [revenueMetrics, setRevenueMetrics] = useState(null);
  const [revenueConfig, setRevenueConfig] = useState({ mode: 'INTERNAL' }); // 'INTERNAL' or 'CONSERVATIVE'

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

  // --- TOGGLE ESCALA OTIMIZADA ---
  const [isOptimized, setIsOptimized] = useState(false);
  const originalStaffRowsRef = useRef(null);
  const optimizedStaffRowsRef = useRef(null);

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

  // --- REVENUE CALCULATION EFFECT ---
  useEffect(() => {
    // Só calcula se tiver dados de Vendas carregados
    if (!salesData.length || !cuponsData.length || !originalStaffRowsRef.current) {
      setRevenueMetrics(null);
      return;
    }

    const dayName = selectedDay;
    const excelDayName = diasSemana[dayName];

    // 1. Preparar Current Schedule (Map: Hour -> Count)
    const currentScheduleByHourMap = calculateStaffByHour(staffRows.filter(r => r.dia === selectedDay));
    const baseScheduleByHourMap = calculateStaffByHour(originalStaffRowsRef.current.filter(r => r.dia === selectedDay));

    const currentScheduleByHour = Object.entries(currentScheduleByHourMap).map(([hour, quantity]) => ({
      hour: parseInt(hour, 10),
      quantity
    }));
    const baseScheduleByHour = Object.entries(baseScheduleByHourMap).map(([hour, quantity]) => ({
      hour: parseInt(hour, 10),
      quantity
    }));

    // 2. Preparar Flow Data (Map: Hour -> Flow, Coupons)
    const dayFlowRows = cuponsData.filter(c => c['Dia da Semana'] === excelDayName && !isNaN(parseInt(c['cod_hora_entrada'])));
    const flowByHour = dayFlowRows.map(r => ({
      hour: parseInt(r['cod_hora_entrada']),
      flow: parseFluxValue(r['qtd_entrante']),
      coupons: parseNumber(r['qtd_cupom'])
    }));

    // 3. Preparar Sales Data
    // O arquivo de vendas tem 'Hora' e 'Valor_Venda' (e talvez 'Dia_Semana' opcional, mas vamos assumir diario ou total se nao tiver)
    // Se tiver dia, filtra. Se nao, usa o que tem (assumindo arquivo de 1 dia ou media)
    const salesByHour = salesData
      .filter(s => !s.Dia_Semana || s.Dia_Semana.toUpperCase() === dayName || s.Dia_Semana === excelDayName)
      .map(s => ({
        hour: parseInt(s.Hora),
        sales: parseFloat(s.Valor_Venda) || 0
      }));

    const metrics = calculateRevenueImpact(baseScheduleByHour, currentScheduleByHour, flowByHour, salesByHour, revenueConfig);
    setRevenueMetrics(metrics);

  }, [staffRows, salesData, cuponsData, selectedDay, revenueConfig, diasSemana]);
  // --- FILE PROCESSING ---


  // VOU REESCREVER O PROCESSFILE ORIGINAL PARA INCLUIR VENDAS E REF LOGIC
  // --- FILE PROCESSING ---
  const processFile = useCallback(async (file, type) => {
    setLoading(true);
    setError(prev => ({ ...prev, [type]: null }));

    try {
      // const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs'); // REMOVED CDN
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true }); // Using RAW values to avoid locale formatting issues

      console.log(`[DEBUG] Processed ${type} (RAW):`, jsonData.slice(0, 3));
      if (jsonData.length > 0) {
        console.log(`[DEBUG] Headers for ${type}:`, Object.keys(jsonData[0]));
      }

      if (type === 'vendas') {
        // Validação simples
        const hasHora = jsonData[0] && keysMatch(jsonData[0], ['Hora', 'hora', 'HORA']);
        const hasValor = jsonData[0] && keysMatch(jsonData[0], ['Valor_Venda', 'valor_venda', 'Venda', 'Valor']);

        // Aceitar se tiver campos parecidos
        setSalesData(jsonData);
      } else if (type === 'cupons') {
        setCuponsData(jsonData);
      } else {
        // ESCALA
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

        // SALVAR REF ORIGINAL (Base Scenario)
        // Se estamos carregando um arquivo novo, esse é o novo "Zero".
        originalStaffRowsRef.current = JSON.parse(JSON.stringify(processedRows));

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
      // Detailed error message
      setError(prev => ({ ...prev, [type]: `Erro: ${err.message || 'Falha desconhecida'}. Verifique o console (F12).` }));
    }
    setLoading(false);
  }, [selectedDay]);

  // Helper para keys case insensitive
  const keysMatch = (obj, possibilities) => {
    const keys = Object.keys(obj).map(k => k.toLowerCase());
    return possibilities.some(p => keys.includes(p.toLowerCase()));
  };

  const handleFileUpload = useCallback(async (event, type) => {
    const file = event.target.files?.[0];
    if (file) await processFile(file, type);
  }, [processFile]);

  const handleDrag = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(prev => ({ ...prev, [type]: true }));
    } else if (e.type === "dragleave") {
      setDragActive(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleDrop = useCallback(async (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: false }));
    if (e.dataTransfer.files?.[0]) {
      await processFile(e.dataTransfer.files[0], type);
    }
  }, [processFile]);

  const addStaffRow = useCallback(() => {
    setStaffRows(prev => {
      const id = `manual-${Date.now()}`;
      const newRow = {
        id,
        dia: selectedDay,
        nome: '',
        entrada: '',
        intervalo: '',
        saida: '',
        saidaDiaSeguinte: false
      };
      return [...prev, newRow];
    });
  }, [selectedDay]);

  const updateStaffRow = useCallback((id, field, value) => {
    setStaffRows(prev => prev.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  }, []);

  const removeStaffRow = useCallback((id) => {
    setStaffRows(prev => prev.filter(row => row.id !== id));
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

  // --- CÁLCULO DE MÉDIA MENSAL (Recurso Solicitado) ---

  const now = new Date();
  const weekdayCount = useMemo(() => countWeekdaysInMonth(now.getFullYear(), now.getMonth(), selectedDay), [selectedDay]);

  const dailyData = useMemo(() => {
    if (!cuponsData.length) return null;

    const dayMapping = diasSemana[selectedDay];
    const totalRow = cuponsData.find(c => c['Dia da Semana'] === dayMapping && c['cod_hora_entrada'] === 'Total');

    // Usando weekdayCount calculado externamente

    const totalCuponsRaw = totalRow ? parseNumber(totalRow['qtd_cupom']) : 0;
    const totalFluxoRaw = totalRow ? parseFluxValue(totalRow['qtd_entrante']) : 0;

    // Aplicar média (dividir pelo n° de ocorrências do dia no mês)
    const totalCupons = Math.round(totalCuponsRaw / weekdayCount);
    const totalFluxo = Math.round(totalFluxoRaw / weekdayCount);

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
  // --- LÓGICA DE NORMALIZAÇÃO (Matemática para o Gráfico) ---
  const chartData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return [];

    // FILTRO: Ignorar 22h para gráficos e métricas (mantém apenas na escala)
    const filteredDayCupons = dailyData.dayCupons.filter(c => parseInt(c['cod_hora_entrada'], 10) !== 22);

    const staffPerHour = calculateStaffByHour(dailyData.dailySchedule, dailyData.minHour, dailyData.maxHour);
    const totalCuponsForPercent = dailyData.totalCupons || 1;
    const totalFluxoForPercent = dailyData.totalFluxo || 1;

    // 2. Mapeamento Inicial
    const basicData = filteredDayCupons.map(cupom => {
      const hour = parseInt(cupom['cod_hora_entrada'], 10);
      const qtdCuponsRaw = parseNumber(cupom['qtd_cupom']); // Valor Mensal (Agregado)
      const qtdFluxoRaw = parseFluxValue(cupom['qtd_entrante']); // Valor Mensal (Agregado)

      // Aplicar Média Diária
      const qtdCupons = Math.round(qtdCuponsRaw / weekdayCount);
      const qtdFluxo = Math.round(qtdFluxoRaw / weekdayCount);

      if (hour === 18) {
        console.log(`[DEBUG 18h] RawFlux: ${qtdFluxoRaw} (Type: ${typeof qtdFluxoRaw}), RawInput: ${cupom['qtd_entrante']} (Type: ${typeof cupom['qtd_entrante']}), Weekdays: ${weekdayCount}, Final: ${qtdFluxo}`);
      }

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

    // Fator de Escala: Quanto vale 1 funcionário na escala visual do Fluxo (Agora baseada em Percentual, ex: 0-25%)
    // Se o pico de fluxo é 15% e tenho 5 funcionários, scaleFactor = 3. 
    // Funcionario visual = 5 * 3 = 15 (que bate com o pico do fluxo no gráfico)
    const maxPercentualFluxo = Math.max(...basicData.map(d => Number(d.percentualFluxo) || 0));
    // Garantir que não seja 0 para evitar divisão por zero
    const safeMaxPct = maxPercentualFluxo === 0 ? 1 : maxPercentualFluxo;

    // Fator de Escala para alinhar a curva de equipe com a curva de fluxo percentual
    const scaleFactor = safeMaxPct / maxStaff;

    // 3. Preparar dados para cálculo térmico
    const hourlyDataForThermal = basicData.map(item => ({
      hour: parseInt(item.hora, 10),
      flow: Number(item.fluxo),
      cupons: Number(item.cupons),
      activeStaff: Number(item.funcionarios),
    }));

    // 4. Calcular métricas térmicas
    const thermalMetrics = computeThermalMetrics(hourlyDataForThermal);

    // 5. Mapear dados finais com métricas térmicas
    return basicData.map((item, idx) => {
      const thermalRow = thermalMetrics.rowsByHour[idx] || {};
      return {
        ...item,
        // Dados Reais
        fluxo: Number(item.fluxo),
        conversao: Number(item.conversao),
        funcionarios_real: Number(item.funcionarios),

        // Dado Visual (Inflado para corresponder à escala de %)
        funcionarios_visual: Number(item.funcionarios) * scaleFactor,

        // --- PONTO CRÍTICO (VISUAL ALERT) ---
        pontoCritico: (Number(item.fluxo) > 50 && Number(item.conversao) < 10) ? Number(item.percentualFluxo) : null,

        // --- MÉTRICAS TÉRMICAS ---
        pressure: thermalRow.pressure || 0,
        thermalIndex: thermalRow.thermalIndex || 0,
        thermalBadge: thermalRow.badge || { emoji: '⚪', label: 'N/A', color: '#6B7280' },
        flowSharePct: thermalRow.flowSharePct || 0,

        // Métricas globais do dia (acessíveis em cada ponto para o tooltip)
        __thermalMu: thermalMetrics.mu,
        __thermalScore: thermalMetrics.score,
        __thermalAdherence: thermalMetrics.adherence,
        __thermalLostOpportunity: thermalMetrics.lostOpportunity,
      };
    });
  }, [dailyData, weekdayCount]);

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

  // dailyMetrics moved to MainContent

  // --- EXPORT FUNCTION ---
  const exportData = async () => {
    if (!chartData.length || !insights) return;
    try {
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

  const Header = () => (
    <header className="relative h-20 flex-none flex items-center justify-between px-8 z-20 shadow-lg overflow-hidden" style={{ background: CENTAURO_BRAND.gradients.header }}>

      {/* LEFT: Title + Badge */}
      <div className="flex items-center gap-3 z-10 w-1/3">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3" style={{ fontFamily: CENTAURO_BRAND.fonts.heading, letterSpacing: '.04em' }}>
          ESCALA QUE CONVERTE
        </h1>
        <div className="h-5 w-px bg-white/30 mx-2"></div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/90 border border-white/30 bg-white/10 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.15)]">Pro v2</span>
      </div>

      {/* CENTER: Logo + Name (Absolute Centered) */}
      {/* Logo Central (Absoluto) - VERSÃO TRANSPARENTE VIA CANVAS */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <RemoveBgImage
          src={CENTAURO_BRAND.headerLogo}
          alt="Centauro"
          className="h-10 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
        />
      </div>

      {/* RIGHT: Date */}
      <div className="flex items-center justify-end gap-4 w-1/3 z-10">
        <div className="text-xs text-white/80 font-bold uppercase tracking-widest tabular-nums bg-black/10 px-3 py-1.5 rounded-lg border border-white/5">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', '')}
        </div>
      </div>
    </header>
  );

  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-[#0B0F1A]/90 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#121620] border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#E30613] mx-auto mb-4"></div>
        <p className="text-gray-300 font-medium tabular-nums text-sm">Processando...</p>
      </div>
    </div>
  );

  const UploadSection = ({ handleFileUpload, dragActive, setDragActive, cuponsData, salesData, error }) => (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 h-full items-center max-w-7xl mx-auto w-full">
      <UploadBox
        type="cupons"
        title="Fluxo de Loja"
        onUpload={handleFileUpload}
        onDrag={handleDrag}
        onDrop={handleDrop}
        dragActiveState={dragActive.cupons}
        data={cuponsData}
        errorState={error.cupons}
      />
      <div className="flex flex-col h-[300px] bg-[#121620]/60 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-xl overflow-hidden hover:border-white/10 transition-all duration-300 group">
        <div className="flex items-center justify-between px-6 pt-6 mb-2">
          <h3 className="text-sm font-bold text-white tracking-widest uppercase">Escala</h3>
          <span className="text-[10px] font-bold text-[#E30613] bg-[#E30613]/10 border border-[#E30613]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Atual
          </span>
        </div>
        <div className="flex-1 px-6 pb-6">
          <div
            className={`h-full border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${dragActive.escala ? 'bg-[#E30613]/5 border-[#E30613]' : 'bg-white/[0.02] hover:bg-white/[0.04]'}`}
            onDragEnter={(e) => setDragActive(prev => ({ ...prev, escala: true }))}
            onDragLeave={(e) => setDragActive(prev => ({ ...prev, escala: false }))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(prev => ({ ...prev, escala: false }));
              if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0], 'escala');
            }}
          >
            <label className="block cursor-pointer w-full h-full flex flex-col items-center justify-center">
              <Upload className="w-6 h-6 text-gray-500 group-hover:text-[#E30613] mb-3 transition-colors" />
              <p className="text-xs text-gray-400 font-medium">Arraste ou clique (.xlsx)</p>
              <input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'escala')} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* 3. VENDA POR HORA (OPCIONAL) */}
      <UploadBox
        type="vendas"
        title="Venda/Hora (Opcional)"
        onUpload={handleFileUpload}
        onDrag={handleDrag}
        onDrop={handleDrop}
        dragActiveState={dragActive.vendas}
        data={salesData || []} // Assuming salesData is available here (need to pass prop)
        errorState={error.vendas}
      />
    </section>
  );

  const Controls = ({ diasAbreviados, fullDayNames, selectedDay, setSelectedDay, chartType, setChartType, toggleTheme, theme, setShowUploadSection }) => (
    <div className="flex-none px-8 py-3 border-b border-white/5 bg-[#0a0c10]/95 backdrop-blur-sm z-10 flex flex-wrap items-center justify-between gap-4">
      {/* New Wrapper Layout for Tabs */}
      <div className="flex items-center gap-2 p-1 bg-[#11141a] rounded-xl border border-white/5">
        {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].map((day) => {
          const fullDay = {
            'SEG': 'SEGUNDA', 'TER': 'TERÇA', 'QUA': 'QUARTA', 'QUI': 'QUINTA',
            'SEX': 'SEXTA', 'SAB': 'SÁBADO', 'DOM': 'DOMINGO'
          }[day];
          const isActive = selectedDay === fullDay;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(fullDay)}
              className={`
                relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-[#E30613] text-white shadow-[0_0_20px_rgba(227,6,19,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button onClick={() => setShowUploadSection(prev => !prev)} className="h-9 px-4 bg-[#11141a] hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg transition-all flex items-center gap-2 text-xs font-semibold hover:border-white/20">
          <Upload className="w-3.5 h-3.5" />
          <span className="uppercase tracking-wide">Importar</span>
        </button>
      </div>
    </div>
  );




  const MainContent = ({ dailyData, insights, chartData, chartType, theme, activeTab, setActiveTab, staffRows, selectedDay, onOptimize, isOptimized, onToggleOptimized, revenueMetrics, revenueConfig }) => {
    // --- ANOMALY DETECTION LOGIC (UNCHANGED) ---
    const MIN_FLUXO = 10;
    const STABLE_FLUXO_PCT = 0.15;
    const ALERT_DROP_PP = 2.0;
    const OPP_RISE_PP = 1.5;

    const conversionInsights = useMemo(() => {
      const alerts = [];
      const opportunities = [];
      if (!chartData || chartData.length < 2) return { alerts, opportunities };
      for (let i = 1; i < chartData.length; i++) {
        const current = chartData[i];
        const prev = chartData[i - 1];
        const fluxoAtual = current.fluxo || 0;
        const fluxoPrev = prev.fluxo || 0;
        if (fluxoAtual < MIN_FLUXO || fluxoPrev < 1) continue;
        const convAtual = current.percentualConversao || 0;
        const convPrev = prev.percentualConversao || 0;
        const deltaFlow = (fluxoAtual - fluxoPrev) / Math.max(1, fluxoPrev);
        const deltaConvPP = convAtual - convPrev;
        if (deltaFlow >= -STABLE_FLUXO_PCT && deltaConvPP <= -ALERT_DROP_PP) {
          alerts.push({ hora: current.hora, fluxo: fluxoAtual, conv: convAtual, deltaConvPP, deltaFlow });
        }
        if (deltaFlow <= STABLE_FLUXO_PCT && deltaConvPP >= OPP_RISE_PP) {
          opportunities.push({ hora: current.hora, fluxo: fluxoAtual, conv: convAtual, deltaConvPP, deltaFlow });
        }
      }
      return { alerts, opportunities };
    }, [chartData]);

    const dailyMetrics = useMemo(() => {
      if (!chartData || chartData.length === 0) return null;

      // Quedas Críticas Dinâmicas
      const { criticalDrops, horasCriticas } = computeCriticalDrops(chartData);

      // Cálculo de Fluxo
      const totalFlow = chartData.reduce((acc, curr) => acc + (Number(curr.fluxo) || 0), 0);
      const maxFlowObj = chartData.reduce((max, curr) => (Number(max.fluxo) || 0) > (Number(curr.fluxo) || 0) ? max : curr, chartData[0]);
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

    // --- MÉTRICAS TÉRMICAS GLOBAIS DO DIA ---
    const thermalMetrics = useMemo(() => {
      if (!chartData || chartData.length === 0) return null;

      // Extrair do primeiro ponto (todos têm os mesmos valores globais)
      const firstPoint = chartData[0];
      if (!firstPoint) return null;

      const mu = firstPoint.__thermalMu || 0;
      const score = firstPoint.__thermalScore || 0;
      const adherence = firstPoint.__thermalAdherence || 0;
      const lostOpportunity = firstPoint.__thermalLostOpportunity || 0;

      // Coletar hotspots e coldspots dos dados
      const validPoints = chartData.filter(d => d.flowSharePct > 0 && d.thermalIndex !== 999);

      const hotspots = [...validPoints]
        .filter(d => d.thermalIndex >= 1.0)
        .sort((a, b) => b.thermalIndex - a.thermalIndex)
        .slice(0, 3)
        .map(d => ({
          hour: d.hora,
          index: d.thermalIndex,
          pressure: d.pressure,
          staff: d.funcionarios_real,
          badge: d.thermalBadge,
        }));

      const coldspots = [...validPoints]
        .filter(d => d.thermalIndex < 1.0 && d.thermalIndex > 0)
        .sort((a, b) => a.thermalIndex - b.thermalIndex)
        .slice(0, 3)
        .map(d => ({
          hour: d.hora,
          index: d.thermalIndex,
          pressure: d.pressure,
          staff: d.funcionarios_real,
          badge: d.thermalBadge,
        }));

      return { mu, score, adherence, lostOpportunity, hotspots, coldspots };
    }, [chartData]);

    // --- COBERTURA SUGERIDA ---
    const suggestedCoverage = useMemo(() => {
      if (!chartData || chartData.length === 0) return null;

      const rowsByHour = chartData.map(d => ({
        hour: parseInt(d.hora, 10),
        flowQty: d.fluxo,
        activeStaff: d.funcionarios_real,
        thermalIndex: d.thermalIndex,
        pressure: d.pressure,
        badge: d.thermalBadge,
      }));

      return generateSuggestedCoverage(rowsByHour, {
        minCoveragePerHour: 1,
        maxIterations: 20,
        targetMaxIndex: 1.15,
      });
    }, [chartData]);

    // Handler para otimizar escala
    const handleOptimizeClick = () => {
      if (!thermalMetrics || !chartData.length) return;

      const thermalRowsByHour = chartData.map(d => ({
        hour: parseInt(d.hora, 10),
        flowQty: d.fluxo,
        thermalIndex: d.thermalIndex,
        badge: d.thermalBadge,
      }));

      onOptimize(thermalRowsByHour);
    };

    return (
      // VIEWPORT FULL HEIGHT GRID - FIXED
      <main className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 w-full">

        {/* ESQUERDA: ESCALA (Visual Refinado) */}
        <aside className="xl:col-span-3 flex flex-col bg-[#11141a]/60 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-xl overflow-hidden h-full min-w-0 transition-all duration-300 hover:border-white/10 p-4">
          <DailyStaffList staffRows={staffRows} selectedDay={selectedDay} onTimeClick={openTimePicker} />
        </aside>

        {/* DIREITA: CHARTS (75% Width / 9 cols out of 12) */}
        <section className="xl:col-span-9 flex flex-col gap-4 h-full min-h-0 min-w-0 overflow-y-auto custom-scroll pr-2">

          {/* Main Chart (Always Visible) - Enterprise Style */}
          <div className="w-full bg-[#1a1e27] border border-white/5 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide border-l-4 border-[#E30613] pl-3">
                Relatório de Capacidade vs. Demanda
              </h3>
              {/* Botão Toggle Escala Otimizada */}
              <button
                onClick={() => {
                  if (!isOptimized) {
                    onOptimize();
                  } else {
                    onToggleOptimized();
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-bold uppercase tracking-wide ${isOptimized
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
              >
                <Zap className="w-3.5 h-3.5" />
                {isOptimized ? 'Escala Otimizada' : 'Escala Original'}
              </button>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="fluxGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="capacityGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#e2e8f0" />
                      <stop offset="50%" stopColor="#f8fafc" />
                      <stop offset="100%" stopColor="#e2e8f0" />
                    </linearGradient>
                    <linearGradient id="conversionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="hora"
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    dy={10}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    unit="%"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    domain={[0, dataMax => (dataMax > 25 ? dataMax : 25)]}
                  />
                  <Tooltip content={<CorporateTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />

                  {/* GAP VISUALIZATION (Background Areas for Tension) */}
                  {chartData.map((entry, index) => {
                    if (entry.percentualFluxo > entry.funcionarios_visual) {
                      return (
                        <ReferenceArea
                          key={`gap-${index}`}
                          yAxisId="left"
                          x1={entry.hora}
                          x2={entry.hora}
                          y1={entry.funcionarios_visual}
                          y2={entry.percentualFluxo}
                          fill="rgba(244,63,94,0.15)"
                          stroke="none"
                          ifOverflow="extendDomain"
                        />
                      );
                    }
                    return null;
                  })}

                  {/* 1. FLUXO: Área Gradient (Background) */}
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="percentualFluxo"
                    name="Fluxo Clientes"
                    fill="url(#fluxGradient)"
                    stroke="#06b6d4"
                    strokeWidth={1}
                    strokeOpacity={0.4}
                    fillOpacity={1}
                    activeDot={false}
                  />

                  {/* 2. CONVERSÃO: Barras Contextuais Gradient */}
                  <Bar
                    yAxisId="right"
                    dataKey="conversao"
                    name="Conversão %"
                    barSize={24}
                    fill="url(#conversionGradient)"
                    fillOpacity={0.8}
                    radius={[4, 4, 0, 0]}
                    style={{ filter: 'drop-shadow(0 4px 6px rgba(16,185,129,0.1))' }}
                  >
                    <LabelList
                      dataKey="conversao"
                      position="top"
                      fill="#34d399"
                      fontSize={10}
                      fontWeight="bold"
                      formatter={(val) => `${val.toFixed(1)}%`}
                    />
                  </Bar>

                  {/* 2.1 ALERTA DE QUEDAS (Dots) */}
                  <RechartsLine
                    yAxisId="right"
                    dataKey="conversao"
                    name="Alerta Quedas"
                    stroke="none"
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      const isCritical = dailyMetrics?.horasCriticas?.includes(`${payload.hora}h`);
                      if (isCritical) {
                        return <circle cx={cx} cy={cy} r={5} fill="#f43f5e" stroke="#1a1e27" strokeWidth={2} />;
                      }
                      return null;
                    }}
                    activeDot={{ r: 6, fill: '#059669' }}
                    legendType="none"
                    isAnimationActive={false}
                  />

                  {/* 3. EQUIPE: Gradient Line (Protagonist) */}
                  <RechartsLine
                    yAxisId="left"
                    type="monotone"
                    dataKey="funcionarios_visual"
                    name="Equipe (Capacidade)"
                    stroke="url(#capacityGradient)"
                    strokeWidth={4}
                    dot={(props) => {
                      return <circle cx={props.cx} cy={props.cy} r={0} />
                    }}
                    activeDot={{ r: 6, fill: '#f8fafc', stroke: '#0f172a', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* REVENUE IMPACT SECTION */}
          {revenueMetrics && (
            <RevenueImpactSection metrics={revenueMetrics} config={revenueConfig} />
          )}

          {/* KPI Section - Refactored Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2 mb-6">

            {/* Card 1: Alerta de Quedas */}
            <div className={`kpi-card ${dailyMetrics?.criticalDrops > 0 ? 'kpi-card-critical' : ''}`}>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Alerta de Quedas</span>
              <div className="flex flex-col mt-2">
                <span className="text-2xl font-bold text-white">{dailyMetrics?.criticalDrops || 0}</span>
                <div className="text-sm text-slate-500 mt-1">
                  {dailyMetrics?.horasCriticas?.length > 0 ? dailyMetrics.horasCriticas.join(', ') : "Nenhum detectado"}
                </div>
              </div>
            </div>

            {/* Card 2: Menor Conversão */}
            <div className="kpi-card">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Menor Conversão</span>
              <div className="mt-2">
                <span className="text-2xl font-bold text-white tracking-tight">
                  {dailyMetrics?.minConversion ? dailyMetrics.minConversion.toFixed(1) : 0}%
                </span>
                <p className="text-sm text-slate-500 mt-1">Mínimo do dia</p>
              </div>
            </div>

            {/* Card 3: Pico de Fluxo */}
            <div className="kpi-card group">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pico de Fluxo</span>
              <div className="flex flex-col mt-2">
                <span className="text-2xl font-bold text-white group-hover:text-[#06b6d4] transition-colors">{dailyMetrics?.maxFlow || 0}</span>
                <span className="text-sm text-slate-500 mt-1">
                  {dailyMetrics?.maxFlowHour} <span className="text-slate-600">({dailyMetrics?.maxFlowPct}%)</span>
                </span>
              </div>
            </div>

            {/* Card 4: Menor Cobertura */}
            <div className="kpi-card group">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Menor Cobertura</span>
              <div className="flex flex-col mt-2">
                <span className="text-2xl font-bold text-white group-hover:text-[#E30613] transition-colors">{dailyMetrics?.minStaff || 0}</span>
                <span className="text-sm text-slate-500 mt-1">
                  Mínimo às {dailyMetrics?.minStaffHour || "N/A"}
                </span>
              </div>
            </div>

          </div>

          {/* Card 5: Equilíbrio Térmico (Refactored Layout) */}
          {thermalMetrics && (
            <div className="w-full bg-[#11141a] border border-white/5 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
                  <Thermometer className="w-4 h-4 text-emerald-400" /> Equilíbrio Térmico
                </h3>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider block mb-0.5">Score Global</span>
                    <span className={`text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent count-up`}>
                      {thermalMetrics.score}
                    </span>
                  </div>
                  <div className="text-right pl-6 border-l border-white/5">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider block mb-0.5">Média (μ)</span>
                    <span className="text-xl font-mono text-[#E30613]">{thermalMetrics.mu.toFixed(1)}</span>
                    <span className="text-slate-600 text-xs ml-1">cl/p</span>
                  </div>
                </div>
              </div>

              {/* Grid 2 Columns for Hotspots/Coldspots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hotspots */}
                <div className="bg-[#1a1e27] border border-white/5 border-l-4 border-l-[#f43f5e] rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#f43f5e]/5 pointer-events-none" />
                  <h4 className="text-xs font-bold text-[#f43f5e] uppercase tracking-wider mb-3 flex items-center gap-2 relative z-10">
                    🔥 Hotspots (Alta Pressão)
                  </h4>
                  {thermalMetrics.hotspots.length > 0 ? (
                    <div className="space-y-0 relative z-10">
                      {thermalMetrics.hotspots.map((h, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                          <span className="text-slate-300 font-mono text-sm">{h.hour}h</span>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-slate-400">Idx: <strong className="text-[#f43f5e]">{h.index.toFixed(2)}</strong></span>
                            </div>
                            <div className="px-2 py-1 rounded bg-black/20 text-xs font-mono text-slate-300">
                              {h.pressure.toFixed(1)} <span className="text-slate-600">cl/p</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-2">Nenhum hotspot detectado</p>
                  )}
                </div>

                {/* Coldspots */}
                <div className="bg-[#1a1e27] border border-white/5 border-l-4 border-l-[#6366f1] rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#6366f1]/5 pointer-events-none" />
                  <h4 className="text-xs font-bold text-[#6366f1] uppercase tracking-wider mb-3 flex items-center gap-2 relative z-10">
                    ❄️ Coldspots (Baixa Pressão)
                  </h4>
                  {thermalMetrics.coldspots.length > 0 ? (
                    <div className="space-y-0 relative z-10">
                      {thermalMetrics.coldspots.map((c, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                          <span className="text-slate-300 font-mono text-sm">{c.hour}h</span>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-slate-400">Idx: <strong className="text-[#6366f1]">{c.index.toFixed(2)}</strong></span>
                            </div>
                            <div className="px-2 py-1 rounded bg-black/20 text-xs font-mono text-slate-300">
                              {c.pressure.toFixed(1)} <span className="text-slate-600">cl/p</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-2">Nenhum coldspot detectado</p>
                  )}
                </div>
              </div>

              {/* --- ROW 3: ADERÊNCIA E OPORTUNIDADE (Estilizado) --- */}
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                {/* Aderência */}
                <div className="flex flex-col pl-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Aderência à Demanda</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${thermalMetrics.adherence >= 85 ? 'text-emerald-400' : 'text-[#E30613]'}`}>
                      {thermalMetrics.adherence}%
                    </span>
                    <span className="text-xs text-slate-600">Target: &gt;85%</span>
                  </div>
                </div>

                {/* Oportunidade Perdida */}
                <div className="flex flex-col pl-2 border-l border-white/5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Oportunidade (Perda)</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${thermalMetrics.lostOpportunity === 0 ? 'text-emerald-400' : 'text-[#f43f5e]'}`}>
                      {thermalMetrics.lostOpportunity}
                    </span>
                    <span className="text-xs text-slate-600">clientes est.</span>
                  </div>
                </div>
              </div>
            </div>
          )}


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

  const ChartToggleButton = ({ type, current, setType }) => {
    const isActive = type === current;
    const Icon = type === 'line' ? Activity : BarChart3;
    return (
      <button
        onClick={() => setType(type)}
        className={`p-1.5 rounded transition-all ${isActive ? 'bg-[#E30613] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  };

  const InsightCard = ({ category, title, text, isHighlighted, onClick }) => {
    // kpi-card class is defined in global css now
    let specialClass = '';
    if (category === 'alerta') specialClass = 'kpi-card-critical';

    return (
      <div
        className={`kpi-card flex flex-col justify-between cursor-pointer ${specialClass} ${isHighlighted ? 'ring-1 ring-white/20' : ''}`}
        onClick={onClick}
      >
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{title}</p>
        <p className="text-2xl font-bold text-white tracking-tight tabular-nums">{text}</p>
      </div>
    );
  };;

  const CorporateTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload || {};
    const thermalBadge = data.thermalBadge || { emoji: '⚪', label: 'Estável', color: '#6B7280' };

    // Helper to find specific metric from payload
    const findMetric = (key) => payload.find(p => p.dataKey === key);
    const flow = findMetric('percentualFluxo');
    const conversion = findMetric('conversao');

    // Gap calculation for visual bar
    const gap = data.percentualFluxo > data.funcionarios_visual;

    return (
      <div className="bg-[#1e293b]/95 backdrop-blur-md border border-white/10 p-0 shadow-2xl rounded-xl min-w-[280px] overflow-hidden text-left">
        {/* Header Grid */}
        <div className="grid grid-cols-2 bg-white/5 border-b border-white/10">
          <div className="p-3 border-r border-white/10 flex items-center">
            <span className="text-xl font-black text-white tracking-tight">{label}h</span>
          </div>
          <div className="p-3 flex items-center gap-2">
            <span className="text-lg">{thermalBadge.emoji}</span>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-slate-500 font-bold leading-none mb-0.5">Status</span>
              <span className="text-xs font-bold leading-none" style={{ color: thermalBadge.color }}>{thermalBadge.label}</span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-2 p-4 gap-y-4 gap-x-6">

          {/* Col 1: Metrics */}
          <div className="col-span-1 space-y-3">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Fluxo</span>
              <span className="text-sm font-bold text-[#06b6d4] tabular-nums">
                {data.fluxo} <span className="text-[10px] text-slate-500 opacity-70">({flow?.value}%)</span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Capacidade</span>
              <span className="text-sm font-bold text-slate-200 tabular-nums">
                {data.funcionarios_real} <span className="text-[10px] text-slate-500 opacity-70">pessoas</span>
              </span>
            </div>
          </div>

          {/* Col 2: Thermal & Conversion */}
          <div className="col-span-1 space-y-3">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Índice Térmico</span>
              <span className="text-sm font-bold text-white font-mono tabular-nums">{formatThermalIndex(data.thermalIndex)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Conversão</span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">{conversion?.value != null ? Number(conversion.value).toFixed(2) : '0.00'}%</span>
            </div>
          </div>
        </div>

        {/* Footer: Pressure / Gap Indicator */}
        <div className="bg-black/20 p-2.5 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] text-slate-400 tabular-nums font-mono">{formatPressure(data.pressure)} cl/p</span>
          </div>

          {/* Visual Gap Warning */}
          {gap && (
            <div className="flex items-center gap-1.5 bg-[#f43f5e]/10 px-2 py-0.5 rounded border border-[#f43f5e]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] animate-pulse" />
              <span className="text-[9px] font-bold text-[#f43f5e] uppercase tracking-wide">Gap Detectado</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const UploadBox = ({ type, title, onUpload, onDrag, onDrop, dragActiveState, data, errorState }) => (
    <div
      className={`bg-[#121620]/60 backdrop-blur-2xl border rounded-2xl shadow-xl p-6 transition-all duration-300 flex flex-col items-center justify-center h-[300px] ${dragActiveState ? 'border-[#E30613] bg-[#E30613]/5' : 'border-white/5 hover:border-white/10'}`}
      onDragEnter={(e) => onDrag(e, type)}
      onDragLeave={(e) => onDrag(e, type)}
      onDragOver={(e) => onDrag(e, type)}
      onDrop={(e) => onDrop(e, type)}
    >
      <label className="block cursor-pointer text-center w-full">
        <div className="w-12 h-12 rounded-xl bg-white/5 mx-auto mb-4 flex items-center justify-center">
          <Upload className={`w-6 h-6 ${dragActiveState ? 'text-[#E30613]' : 'text-gray-500'}`} />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight mb-1">{title}</h3>
        {data.length > 0 && !errorState ? (
          <div className="mt-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center tabular-nums">
            ✓ {data.length} Regs
          </div>
        ) : errorState ? (
          <div className="mt-2 bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-bold">
            {errorState}
          </div>
        ) : (
          <p className="text-gray-500 text-xs">Arraste ou clique (.xlsx)</p>
        )}
        <input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], type)} className="hidden" />
      </label>
    </div>
  );


  return (
    <div className="min-h-screen w-full bg-[#0B0F1A] flex flex-col">
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        {/* Marca d'água Central */}
        <img
          src={CENTAURO_BRAND.bgLogo}
          alt=""
          className={`w-[85%] h-[85%] object-contain grayscale brightness-150 contrast-125 select-none transition-opacity duration-700 ease-in-out ${cuponsData.length > 0 ? 'opacity-0' : 'opacity-[0.04]'}`}
        />
        {/* Grid Overlay sutil */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.02]" />
      </div>
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
              handleFileUpload={processFile}
              dragActive={dragActive}
              setDragActive={setDragActive}
              cuponsData={cuponsData}
              salesData={salesData}
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
            />

            {/* Conteúdo principal colado nas bordas ou com padding controlado */}
            <main className="flex-1 w-full overflow-y-auto custom-scroll">
              <MainContent
                dailyData={dailyData}
                insights={insights}
                chartData={chartData}
                chartType={chartType}
                theme={theme}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                staffRows={staffRows}
                selectedDay={selectedDay}
                isOptimized={isOptimized}
                onOptimize={() => {
                  // Salvar original antes de otimizar
                  if (!originalStaffRowsRef.current) {
                    originalStaffRowsRef.current = [...staffRows];
                  }

                  // Construir mapa de fluxo real
                  const flowMap = {};
                  if (cuponsData && cuponsData.length > 0) {
                    Object.entries(diasSemana).forEach(([dayName, excelName]) => {
                      const dayRows = cuponsData.filter(c => c['Dia da Semana'] === excelName);
                      const hourlyFlow = dayRows.map(c => {
                        const conversaoRaw = c['% Conversão'];
                        let conversion = 0;
                        if (conversaoRaw != null && conversaoRaw !== '') {
                          const num = parseFloat(conversaoRaw);
                          // Se vier decimal (0.15) converte pra 15, se vier string "15%" trata tb
                          conversion = num < 1 ? num * 100 : num;
                        }

                        return {
                          hour: parseInt(c['cod_hora_entrada'], 10),
                          flow: parseFluxValue(c['qtd_entrante']),
                          conversion: conversion
                        };
                      }).filter(h => !isNaN(h.hour));

                      if (hourlyFlow.length > 0) {
                        flowMap[dayName] = hourlyFlow;
                      }
                    });
                  }

                  // Otimizar TODOS os dias da semana com dados reais
                  const optimized = optimizeAllDays(staffRows, flowMap);
                  optimizedStaffRowsRef.current = optimized;
                  setStaffRows(optimized);
                  setIsOptimized(true);
                }}
                onToggleOptimized={() => {
                  // Voltar para original
                  if (originalStaffRowsRef.current) {
                    setStaffRows([...originalStaffRowsRef.current]);
                    setIsOptimized(false);
                  }
                }}
                revenueMetrics={revenueMetrics}
                revenueConfig={revenueMetrics?.revenueConfig}
              />
              <div className="px-6 pb-10">
                <WeeklyScaleView staffRows={staffRows} onTimeClick={openTimePicker} />
              </div>
            </main>
          </div>
        )}

        {/* MODAL (Renderizado via Portal ou Fixed - aqui dentro do container relativo também funciona se for fixed screen) */}
        {showUploadSection && (
          <div className="absolute inset-0 z-50 bg-[#050608]/90 backdrop-blur-sm flex items-center justify-center p-12 rounded-3xl">
            <div className="relative w-full max-w-5xl mx-auto">
              <button onClick={() => setShowUploadSection(false)} className="absolute -top-10 right-0 text-white hover:text-[#E30613]">Fechar</button>
              <UploadSection
                processFile={processFile}
                dragActive={dragActive}
                setDragActive={setDragActive}
                cuponsData={cuponsData}
                salesData={salesData}
                error={error}
              />
            </div>
          </div>
        )}

        {/* PRINT TARGET (OFF-SCREEN) */}
        <div className="fixed -left-[99999px] top-0" data-print-target>
          <WeeklyScalePrint ref={printRef} staffRows={staffRows} theme={printTheme} />
        </div>

      </div>
    </div>
  );
};

// --- HELPER COMPONENTS ---



const InsightCard = ({ category, title, text, isHighlighted, onClick }) => {
  const styleMap = {
    alerta: "border-l-red-500",
    destaque: "border-l-[#E30613]",
    neutro: "border-l-blue-500"
  }

  return (
    <div
      className={`bg-[#121620]/40 backdrop-blur-md rounded-lg p-3 cursor-pointer border-l-2 border-t border-r border-b border-t-white/5 border-r-white/5 border-b-white/5 ${styleMap[category] || 'border-l-gray-500'} hover:bg-white/5 transition-all duration-300 group ${isHighlighted ? 'ring-1 ring-white/20' : ''}`}
      onClick={onClick}
    >
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5 group-hover:text-gray-300 transition-colors">{title}</p>
      <p className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors tabular-nums">{text}</p>
    </div>
  );
}


// --- DAILY STAFF LIST (Fixed Height Scrollable Sidebar) ---
const DailyStaffList = ({ staffRows, selectedDay, onTimeClick }) => {
  const colabsDoDia = staffRows.filter(r => r.dia === selectedDay && r.nome !== '' && r.entrada);
  // Sort by entry time (ascending) and then by name
  colabsDoDia.sort((a, b) => {
    // Treat empty/null times as late so they go to bottom
    // Normalize times to HH:MM format (pad with 0 if needed) for correct string comparison
    // e.g. '9:30' -> '09:30' which comes before '10:30'
    const normalizeTime = (t) => {
      if (!t) return '23:59';
      return t.length === 4 ? `0${t}` : t; // '9:30' is 4 chars -> '09:30'
    };

    const timeA = normalizeTime(a.entrada);
    const timeB = normalizeTime(b.entrada);

    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }
    return a.nome.localeCompare(b.nome);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho Fixo */}
      <div className="mb-4 flex justify-between items-center px-2">
        <h3 className="text-sm font-black text-slate-200 uppercase tracking-wide">
          Escala: <span className="text-[#E30613]">{selectedDay}</span>
        </h3>
        <span className="text-[10px] font-bold bg-[#1a1e27] border border-white/5 px-2 py-1 rounded text-slate-400">
          {colabsDoDia.length} TOTAL
        </span>
      </div>

      {/* Área de Lista com Scroll - Flex grow to fill space */}
      <div className="escala-lista flex-1 h-0 overflow-y-auto">
        {colabsDoDia.map((colab) => {
          const nameParts = colab.nome.split(' ');
          const firstName = nameParts[0];
          const surname = nameParts.slice(1).join(' ');

          return (
            <div key={colab.id} className="escala-item group cursor-pointer hover:bg-white/[0.03]">

              {/* 1. Nome (Empilhado: Nome / Sobrenome) */}
              <div className="flex flex-col min-w-0 justify-center">
                <span className="text-sm font-black text-slate-200 leading-none truncate group-hover:text-white transition-colors">
                  {firstName}
                </span>
                {surname && (
                  <span className="text-[10px] font-bold text-slate-500 leading-none truncate group-hover:text-slate-400 transition-colors uppercase mt-0.5">
                    {surname}
                  </span>
                )}
              </div>

              {/* 2. Entrada */}
              <div
                className="flex flex-col items-center cursor-pointer group/time"
                onClick={() => onTimeClick(colab.id, 'entrada', colab.entrada)}
              >
                <span className="text-[9px] text-slate-500 uppercase mb-0.5 group-hover/time:text-[#E30613] transition-colors font-bold">Ent</span>
                <span className={`horario horario-entrada text-[11px] font-bold ${colab.entrada ? '' : 'opacity-50'}`}>
                  {colab.entrada || '--:--'}
                </span>
              </div>

              {/* 3. Intervalo */}
              <div
                className="flex flex-col items-center cursor-pointer group/time"
                onClick={() => onTimeClick(colab.id, 'intervalo', colab.intervalo)}
              >
                <span className="text-[9px] text-slate-500 uppercase mb-0.5 group-hover/time:text-[#E30613] transition-colors font-bold">Int</span>
                <span className={`horario text-slate-500 text-[11px] font-bold ${colab.intervalo ? '' : 'opacity-50'}`}>
                  {colab.intervalo || '--:--'}
                </span>
              </div>

              {/* 4. Saída */}
              <div
                className="flex flex-col items-center cursor-pointer group/time"
                onClick={() => onTimeClick(colab.id, 'saida', colab.saida)}
              >
                <span className="text-[9px] text-slate-500 uppercase mb-0.5 group-hover/time:text-white transition-colors font-bold">Sai</span>
                <span className={`horario horario-saida text-[11px] font-bold ${colab.saida ? '' : 'opacity-50'}`}>
                  {colab.saida || '--:--'}
                </span>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};


// --- WEEKLY SCALE VIEW (Grid: Seg-Qui / Sex-Dom) ---
const WeeklyScaleView = ({ staffRows, onTimeClick }) => {
  const [localTheme, setLocalTheme] = useState('dark');
  const dias = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];

  const handleGenerate = (selectedTheme) => {
    window.dispatchEvent(new CustomEvent('update-print-theme', { detail: selectedTheme }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('generate-weekly-image'));
    }, 100);
  };

  return (
    <div className="p-8 bg-[#0a0c10] border border-white/5 rounded-2xl relative group/weekly mt-10">
      {/* Botões de Ação (Absolute Top-Right) */}
      <div className="absolute top-6 right-6 flex items-center gap-2 opacity-100 transition-all">
        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setLocalTheme('light')}
            className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all ${localTheme === 'light' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-white'}`}
          >
            Light
          </button>
          <button
            onClick={() => setLocalTheme('dark')}
            className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all ${localTheme === 'dark' ? 'bg-[#E30613] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
          >
            Dark
          </button>
        </div>
        <button
          id="btn-gen-img"
          onClick={() => handleGenerate(localTheme)}
          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-bold hover:bg-white/10 hover:text-white transition text-xs uppercase tracking-wide flex items-center gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar PNG
        </button>
      </div>

      <h3 className="text-xl font-bold text-slate-200 uppercase tracking-widest text-left mb-8 pl-1 border-l-4 border-[#E30613]">
        Escala Semanal
      </h3>

      <div className="flex flex-col gap-4">
        {/* ROW 1: SEGUNDA A QUINTA (4 Cols) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dias.slice(0, 4).map(dia => <SimpleDayCard key={dia} dia={dia} staffRows={staffRows} onTimeClick={onTimeClick} />)}
        </div>

        {/* ROW 2: SEXTA A DOMINGO (3 Cols Centered) */}
        {/* Usando w-3/4 para que as 3 colunas tenham o mesmo tamanho das 4 de cima (aprox) */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 lg:w-3/4 lg:mx-auto">
          {dias.slice(4).map(dia => <SimpleDayCard key={dia} dia={dia} staffRows={staffRows} onTimeClick={onTimeClick} />)}
        </div>
      </div>
    </div>
  );
};

// Sub-componente Card de Dia (Refinado)
const SimpleDayCard = ({ dia, staffRows, onTimeClick }) => {
  const colabsDoDia = staffRows.filter(r => r.dia === dia && r.nome !== '' && r.entrada);

  // Sort by entry time (ascending) and then by name
  colabsDoDia.sort((a, b) => {
    const normalizeTime = (t) => {
      if (!t) return '23:59';
      return t.length === 4 ? `0${t}` : t;
    };
    const timeA = normalizeTime(a.entrada);
    const timeB = normalizeTime(b.entrada);

    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return a.nome.localeCompare(b.nome);
  });

  return (
    <div className="bg-[#1a1e27] rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors flex flex-col h-full">
      {/* Header do Dia */}
      <div className="px-4 py-3 bg-[#222835] border-b border-white/5 flex justify-between items-center">
        <span className="font-semibold text-slate-200 text-sm tracking-wide">{dia}</span>
        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400 font-bold tabular-nums">
          {colabsDoDia.length}
        </span>
      </div>

      {/* Lista */}
      <div className="divide-y divide-white/5 flex-1">
        {colabsDoDia.length > 0 ? colabsDoDia.map((colab) => {
          const nameParts = colab.nome.split(' ');
          const firstName = nameParts[0];
          const surname = nameParts.slice(1).join(' ');

          return (
            <div key={colab.id} className="px-3 py-2 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">

              {/* Nome Stacked */}
              <div className="flex flex-col min-w-0 mr-2 justify-center">
                <span className="text-xs font-black text-slate-300 truncate leading-none">{firstName}</span>
                {surname && (
                  <span className="text-[9px] font-bold text-slate-500 truncate leading-none uppercase mt-0.5">
                    {surname}
                  </span>
                )}
              </div>

              {/* Horários Refinados (Ent - Int - Sai) */}
              <div className="flex items-center gap-1.5 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                {/* Ent */}
                <div className="flex flex-col items-center relative group/time">
                  <span className="text-[7px] text-slate-600 uppercase font-black mb-px opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2.5">Ent</span>
                  <span
                    className="text-[11px] text-slate-400 font-mono cursor-pointer hover:text-white tabular-nums tracking-tight font-bold"
                    onClick={onTimeClick ? () => onTimeClick(colab.id, 'entrada', colab.entrada) : undefined}
                  >
                    {colab.entrada || '--'}
                  </span>
                </div>

                <span className="text-[8px] text-slate-700 font-black">·</span>

                {/* Int */}
                <div className="flex flex-col items-center relative group/time">
                  <span className="text-[7px] text-slate-600 uppercase font-black mb-px opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2.5">Int</span>
                  <span
                    className="text-[11px] text-slate-500 font-mono cursor-pointer hover:text-white tabular-nums tracking-tight font-bold"
                    onClick={onTimeClick ? () => onTimeClick(colab.id, 'intervalo', colab.intervalo) : undefined}
                  >
                    {colab.intervalo || '-'}
                  </span>
                </div>

                <span className="text-[8px] text-slate-700 font-black">·</span>

                {/* Sai */}
                <div className="flex flex-col items-center relative group/time">
                  <span className="text-[7px] text-slate-600 uppercase font-black mb-px opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2.5">Sai</span>
                  <span
                    className="text-[11px] text-slate-400 font-mono cursor-pointer hover:text-white font-bold tabular-nums tracking-tight"
                    onClick={onTimeClick ? () => onTimeClick(colab.id, 'saida', colab.saida) : undefined}
                  >
                    {colab.saida}{colab.saidaDiaSeguinte ? '⁺¹' : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="px-4 py-8 text-center">
            <span className="text-xs text-slate-700 font-medium uppercase tracking-widest">Sem Escala</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

// --- EXPORTAR ESCALA SEMANAL (PRINT) ---
const WeeklyScalePrint = forwardRef(({ staffRows, theme }, ref) => {
  const diasTop = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA'];
  const diasBottom = ['SEXTA', 'SÁBADO', 'DOMINGO'];

  const isDark = theme === 'dark';

  const containerStyle = isDark
    ? "bg-[#0a0c10] text-white"
    : "bg-white text-slate-900";

  const bgImage = isDark
    ? 'radial-gradient(circle at 50% 0%, rgba(227, 6, 19, 0.08), transparent 70%)'
    : 'radial-gradient(circle at 50% 0%, rgba(0, 0, 0, 0.03), transparent 70%)';

  const logoStyle = isDark
    ? "text-[#E30613] border-[#E30613]/20 bg-[#E30613]/5"
    : "text-slate-800 border-slate-300 bg-slate-100";

  return (
    <div
      ref={ref}
      className={`w-[1280px] p-8 flex flex-col gap-6 ${containerStyle} min-h-screen`}
      style={{
        backgroundImage: bgImage,
        height: 'max-content', // Allow growth
        minHeight: '720px'
      }}
    >
      <div className="relative flex items-center justify-between mb-8 px-4">
        <h3 className={`text-2xl font-black uppercase tracking-[0.3em] ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Escala Semanal
        </h3>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <RemoveBgImage
            src={CENTAURO_BRAND.headerLogo}
            className="h-12 object-contain"
            alt="Centauro"
          />
        </div>

        <div className={`text-sm font-bold uppercase tracking-widest border px-3 py-1 rounded-lg ${logoStyle}`}>
          DataVerse Pro
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 items-start">
        {diasTop.map(dia => <PrintDayCard key={dia} dia={dia} staffRows={staffRows} theme={theme} />)}
      </div>
      <div className="flex justify-center gap-6 w-full items-start">
        <div className="grid grid-cols-3 gap-6 w-3/4">
          {diasBottom.map(dia => <PrintDayCard key={dia} dia={dia} staffRows={staffRows} theme={theme} />)}
        </div>
      </div>
    </div>
  );
});

const toMinutes = (t) => {
  if (!t || typeof t !== 'string' || !t.includes(':')) return 0;
  const [h, m] = t.split(':');
  const hh = Number(h);
  const mm = Number(m);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
};

const PrintDayCard = ({ dia, staffRows, theme }) => {
  const isDark = theme === 'dark';

  const colabsDoDia = useMemo(() => {
    return staffRows
      .filter(r => r.dia === dia && r.nome && r.entrada)
      .sort((a, b) => toMinutes(a.entrada) - toMinutes(b.entrada));
  }, [staffRows, dia]);

  const colabsFolga = useMemo(() => {
    return staffRows
      .filter(r => r.dia === dia && r.nome && !r.entrada)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [staffRows, dia]);

  const cardBg = isDark ? "bg-[#11141a] border-white/10" : "bg-white border-slate-200 shadow-sm";
  const headerBg = isDark ? "bg-white/[0.03] border-white/5" : "bg-slate-50 border-slate-100";
  const titleColor = isDark ? "text-[#E30613]" : "text-slate-900";
  const countBadge = isDark ? "bg-white/5 text-slate-400" : "bg-slate-200 text-slate-600";

  // Table Styles
  const thStyle = `pb-2 text-[9px] font-black uppercase tracking-tighter ${isDark ? 'text-slate-500' : 'text-slate-400'}`;
  const tdBase = "py-1.5 text-[10px] font-bold tabular-nums align-middle";
  const nameStyle = `font-bold uppercase truncate max-w-[90px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`;
  const timeStyle = isDark ? "text-slate-500" : "text-slate-500";
  const saidaStyle = isDark ? "text-slate-100" : "text-slate-900";
  const emptyText = isDark ? "text-slate-600" : "text-slate-400";

  // Footer Styles
  const footerBg = isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-100";
  const footerTitle = isDark ? "text-slate-500" : "text-slate-400";
  const footerName = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className={`${cardBg} border rounded-xl overflow-hidden shadow-xl flex flex-col h-full`}>
      <div className={`${headerBg} border-b py-2 px-4 flex justify-between items-center bg-opacity-50`}>
        <span className={`${titleColor} font-black tracking-widest uppercase text-xs`}>{dia}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${countBadge}`}>
          {colabsDoDia.length}
        </span>
      </div>

      <div className="p-3 flex-1 min-h-[100px]">
        <table className="w-full text-left table-fixed">
          <thead>
            <tr className={isDark ? "border-b border-white/5" : "border-b border-slate-100"}>
              <th className={`${thStyle} w-[35%]`}>Atleta</th>
              <th className={`${thStyle} text-center w-[20%]`}>E</th>
              <th className={`${thStyle} text-center w-[20%]`}>I</th>
              <th className={`${thStyle} text-center w-[25%]`}>S</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-white/[0.02]' : 'divide-slate-5'}`}>
            {colabsDoDia.length > 0 ? colabsDoDia.map((colab) => (
              <tr key={colab.id} className="group">
                <td className={`${tdBase} ${nameStyle} py-2`}>
                  {colab.nome}
                </td>
                <td className={`${tdBase} text-center ${timeStyle}`}>
                  {colab.entrada || '--'}
                </td>
                <td className={`${tdBase} text-center ${timeStyle}`}>
                  {colab.intervalo || '-'}
                </td>
                <td className={`${tdBase} text-center ${saidaStyle}`}>
                  {colab.saida}{colab.saidaDiaSeguinte ? '⁺¹' : ''}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className={`py-8 text-center text-[10px] font-bold uppercase tracking-widest ${emptyText}`}>
                  Sem Escala
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {colabsFolga.length > 0 && (
        <div className={`mt-auto border-t px-4 py-3 ${footerBg}`}>
          <h4 className={`text-[9px] font-black uppercase tracking-widest mb-2 opacity-70 ${footerTitle}`}>Folgando</h4>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {colabsFolga.map(c => (
              <span key={c.id} className={`text-[9px] font-bold uppercase opacity-80 ${footerName}`}>{c.nome}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- REVENUE COMPONENTS ---
const RevenueCard = ({ title, value, subtext, icon: Icon, trend, trendValue, color }) => {
  return (
    <div className="bg-[#1a1e27] border border-white/5 rounded-xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-lg bg-${color}-500/10`}>
          <Icon className={`w-5 h-5 text-${color}-400 group-hover:text-${color}-300 transition-colors`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</span>
        <div className="text-2xl font-black text-white mt-1 tracking-tight">{value}</div>
        <p className="text-xs text-slate-500 mt-1 font-medium">{subtext}</p>
      </div>
    </div>
  );
};

const RevenueImpactSection = ({ metrics, config }) => {
  if (!metrics) return null;

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide border-l-4 border-emerald-500 pl-3 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-emerald-400" />
          Impacto Financeiro da Escala
        </h3>
        {config.mode === 'CONSERVATIVE' && (
          <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Modo Conservador
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: RECEITA RECUPERADA */}
        <RevenueCard
          title="Receita Recuperada"
          value={metrics.totalRevenueRecovered.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          subtext="Ganho estimado em horas críticas"
          icon={Banknote}
          color="emerald"
          trend={metrics.totalRevenueRecovered >= 0 ? 'up' : 'down'}
          trendValue="Projetado"
        />

        {/* CARD 2: CUPONS ADICIONAIS */}
        <RevenueCard
          title="Cupons Adicionais"
          value={`+${metrics.totalAdditionalCoupons.toFixed(1)}`}
          subtext="Clientes a mais atendidos"
          icon={ShoppingBag}
          color="blue"
          trend="up"
          trendValue="Volume"
        />

        {/* CARD 3: GANHO POR DIA (MÉDIA) - Actually using total for the day */}
        <RevenueCard
          title="Ganho do Dia"
          value={`+${(metrics.totalRevenueRecovered).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
          subtext="Neste cenário de escala"
          icon={Coins}
          color="red"
        />

        {/* CARD 4: EFICIÊNCIA (CONVERSÃO PONDERADA) */}
        <RevenueCard
          title="Var. Conversão"
          value={`${metrics.avgWeightedConversionDelta > 0 ? '+' : ''}${metrics.avgWeightedConversionDelta.toFixed(2)} pp`}
          subtext="Impacto na conversão (ponderado)"
          icon={Percent}
          color="purple"
          trend={metrics.avgWeightedConversionDelta >= 0 ? 'up' : 'down'}
          trendValue="Eficiência"
        />
      </div>
    </div>
  );
};




