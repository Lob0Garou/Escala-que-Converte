import React, { useState, useCallback, useMemo, useEffect, useRef, forwardRef } from 'react';
import html2canvas from 'html2canvas';
import { Upload, TrendingUp, Users, AlertCircle, Plus, Trash2, Clock, X, ChevronLeft, Download } from 'lucide-react';
import { LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line as RechartsLine, ComposedChart, ReferenceDot, Area, LabelList } from 'recharts';

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121620] border border-white/10 rounded-2xl shadow-2xl w-[320px] overflow-hidden transform transition-all scale-100">
        {/* Header do Modal */}
        <div className="bg-[#0B0F1A] p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 'minute' && (
              <button onClick={() => setStep('hour')} className="text-gray-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="text-sm font-bold text-white uppercase tracking-widest text-[#D6B46A]">
              {step === 'hour' ? 'Escolha a Hora' : `Hora: ${selectedHour}h`}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
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
                      ? 'bg-[#D6B46A] text-black border-[#D6B46A] shadow-[0_0_10px_rgba(214,180,106,0.4)]'
                      : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20'
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
              <p className="text-xs text-center text-gray-400 uppercase tracking-widest">Selecione os minutos</p>
              <div className="grid grid-cols-2 gap-3">
                {minutes.map((m) => (
                  <button
                    key={m}
                    onClick={() => handleMinuteClick(m)}
                    className="h-14 rounded-xl bg-white/5 border border-white/5 text-xl font-bold text-white hover:bg-[#D6B46A]/20 hover:border-[#D6B46A] hover:text-[#D6B46A] transition-all tabular-nums"
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
        backgroundColor: printTheme === 'dark' ? '#070A10' : '#ffffff',
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

  // --- UTILITY FUNCTIONS ---
  const excelTimeToString = (excelTime) => {
    if (!excelTime || typeof excelTime === 'string' && excelTime.toUpperCase() === 'FOLGA') {
      return null;
    }
    if (typeof excelTime === 'string') {
      if (/^\d{1,2}:\d{2}/.test(excelTime)) return excelTime;
    }
    if (excelTime instanceof Date) {
      const hours = excelTime.getHours();
      const minutes = excelTime.getMinutes();
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    if (typeof excelTime === 'number') {
      const totalMinutes = Math.round(excelTime * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return null;
  };

  const parseNumber = (value) => {
    if (typeof value === 'string') {
      return parseFloat(value.replace(/,/g, '')) || 0;
    }
    return parseFloat(value) || 0;
  };

  const findAndParseConversion = (cupom) => {
    const conversaoValue = cupom['% Conversão'];
    if (conversaoValue == null || conversaoValue === '') return 0;
    const numericValue = parseFloat(conversaoValue);
    if (isNaN(numericValue)) return 0;
    return numericValue < 1 ? numericValue * 100 : numericValue;
  };

  const parseFluxValue = (value) => {
    if (typeof value === 'string') {
      return parseFloat(value.replace('.0%', '')) || 0;
    }
    return parseFloat(value) || 0;
  };

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

    // Fator de Escala: Quanto vale 1 funcionário na escala visual do Fluxo (Agora baseada em Percentual, ex: 0-25%)
    // Se o pico de fluxo é 15% e tenho 5 funcionários, scaleFactor = 3. 
    // Funcionario visual = 5 * 3 = 15 (que bate com o pico do fluxo no gráfico)
    const maxPercentualFluxo = Math.max(...basicData.map(d => Number(d.percentualFluxo) || 0));
    // Garantir que não seja 0 para evitar divisão por zero
    const safeMaxPct = maxPercentualFluxo === 0 ? 1 : maxPercentualFluxo;

    // Fator de Escala para alinhar a curva de equipe com a curva de fluxo percentual
    const scaleFactor = safeMaxPct / maxStaff;

    return basicData.map(item => ({
      ...item,
      // Dados Reais
      fluxo: Number(item.fluxo),
      conversao: Number(item.conversao),
      funcionarios_real: Number(item.funcionarios),

      // Dado Visual (Inflado para corresponder à escala de %)
      funcionarios_visual: Number(item.funcionarios) * scaleFactor,

      // --- PONTO CRÍTICO (VISUAL ALERT) ---
      // Se fluxo > 50 (absoluto) e conversão < 10, marca o ponto exatamente no pico do fluxo (PERCENTUAL)
      pontoCritico: (Number(item.fluxo) > 50 && Number(item.conversao) < 10) ? Number(item.percentualFluxo) : null
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

  // dailyMetrics moved to MainContent

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

  const Header = () => (
    <header className="bg-[#121620]/60 backdrop-blur-2xl border-b border-white/5 h-14 flex-none flex items-center justify-between px-6 z-20 shadow-md">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
          Escala de Alta Performance
          <div className="h-4 w-px bg-white/10 mx-2"></div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#D6B46A] border border-[#D6B46A]/20 bg-[#D6B46A]/5 px-2 py-0.5 rounded-full">Pro v2</span>
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest tabular-nums opacity-60">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
        </div>
      </div>
    </header>
  );

  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-[#0B0F1A]/90 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#121620] border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#D6B46A] mx-auto mb-4"></div>
        <p className="text-gray-300 font-medium tabular-nums text-sm">Processando...</p>
      </div>
    </div>
  );

  const UploadSection = ({ processFile, dragActive, setDragActive, cuponsData, error }) => (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 h-full items-center max-w-5xl mx-auto w-full">
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
          <span className="text-[10px] font-bold text-[#D6B46A] bg-[#D6B46A]/10 border border-[#D6B46A]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Atual
          </span>
        </div>
        <div className="flex-1 px-6 pb-6">
          <div
            className={`h-full border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${dragActive.escala ? 'bg-[#D6B46A]/5 border-[#D6B46A]' : 'bg-white/[0.02] hover:bg-white/[0.04]'}`}
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
              <Upload className="w-6 h-6 text-gray-500 group-hover:text-[#D6B46A] mb-3 transition-colors" />
              <p className="text-xs text-gray-400 font-medium">Arraste ou clique (.xlsx)</p>
              <input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'escala')} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </section>
  );

  const Controls = ({ diasAbreviados, fullDayNames, selectedDay, setSelectedDay, chartType, setChartType, toggleTheme, theme, setShowUploadSection }) => (
    <div className="flex-none px-6 py-2 border-b border-white/5 bg-[#0B0F1A]/95 backdrop-blur-sm z-10 flex flex-wrap items-center justify-between gap-4 h-14">
      <div className="flex bg-[#121620] rounded-lg p-1 border border-white/10 overflow-x-auto scrollbar-hide max-w-full">
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
                px-3 py-1 rounded-md text-[10px] font-bold transition-all duration-200 whitespace-nowrap tabular-nums tracking-wide
                ${isActive ? 'bg-[#D6B46A] text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button onClick={() => setShowUploadSection(prev => !prev)} className="h-7 px-3 bg-[#121620] hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg transition-all flex items-center gap-2 text-[10px] font-semibold">
          <Upload className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  // --- HELPER: CÁLCULO DE QUEDAS CRÍTICAS (DINÂMICO) ---
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



  const MainContent = ({ dailyData, insights, chartData, chartType, theme, activeTab, setActiveTab, staffRows, selectedDay }) => {
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
      <main className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 w-full">

        {/* ESQUERDA: ESCALA (Visual Refinado) */}
        <aside className="xl:col-span-3 flex flex-col bg-[#121620]/60 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-xl overflow-hidden h-full min-w-0 transition-all duration-300 hover:border-white/10 p-4">
          <DailyStaffList staffRows={staffRows} selectedDay={selectedDay} onTimeClick={openTimePicker} />
        </aside>

        {/* DIREITA: CHARTS (75% Width / 9 cols out of 12) */}
        <section className="xl:col-span-9 flex flex-col gap-4 h-full min-h-0 min-w-0 overflow-y-auto custom-scroll pr-2">

          {/* Main Chart (Always Visible) - DARK MODE HYBRID */}
          <div className="w-full bg-[#1E293B]/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-4">
            <h3 className="text-sm font-bold text-gray-100 uppercase tracking-wide mb-4 border-l-4 border-[#D6B46A] pl-2">
              Relatório de Capacidade vs. Demanda
            </h3>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hora" tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#4b5563' }} dy={10} tickFormatter={(v) => `${v}h`} />
                  <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#4b5563' }} tickFormatter={(val) => `${val}%`} />
                  <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#4b5563' }} domain={[0, dataMax => (dataMax > 25 ? dataMax : 25)]} />
                  <Tooltip content={<CorporateTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#e5e7eb' }} />

                  {/* 1. FLUXO: Área Cinza Sólida (AGORA PERCENTUAL) */}
                  <Area yAxisId="left" type="monotone" dataKey="percentualFluxo" name="Fluxo Clientes" fill="#cbd5e1" stroke="#94a3b8" fillOpacity={0.2} activeDot={false} />

                  {/* 2. CONVERSÃO: Barras Verdes */}
                  <Bar yAxisId="right" dataKey="conversao" name="Conversão %" barSize={24} fill="#10b981" radius={[2, 2, 0, 0]}>
                    <LabelList dataKey="conversao" position="top" fill="#34d399" fontSize={10} fontWeight="bold" formatter={(val) => `${val.toFixed(1)}%`} />
                  </Bar>

                  {/* 2.1 ALERTA DE QUEDAS: Dots Vermelhos sobre a conversão (LINHA TRANSPARENTE) */}

                  <RechartsLine
                    yAxisId="right"
                    dataKey="conversao"
                    name="Conversão %"
                    stroke="none"
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      const isCritical = dailyMetrics?.horasCriticas?.includes(`${payload.hora}h`);
                      if (isCritical) {
                        return <circle cx={cx} cy={cy} r={6} fill="#EF4444" stroke="white" strokeWidth={2} />;
                      }
                      return <circle cx={cx} cy={cy} r={3} fill="#10b981" />;
                    }}
                    activeDot={{ r: 6, fill: '#059669' }}
                    legendType="none"
                    isAnimationActive={false}
                  />

                  {/* 3. EQUIPE: Linha Curva */}
                  <RechartsLine yAxisId="left" type="monotone" dataKey="funcionarios_visual" name="Equipe (Capacidade)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#f59e0b' }} />

                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New KPI Section (Below Chart) - DARK MODE */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 mb-8">

            {/* Card 1: Alerta de Quedas (Red Border + Hours List) */}
            <div className="bg-[#1E293B]/60 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col border-l-4 border-red-500 shadow-lg">
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Alerta de Quedas</span>
              <div className="flex flex-col mt-2">
                <span className="text-2xl font-bold text-red-500">{dailyMetrics?.criticalDrops || 0}</span>
                <div className="text-xs text-red-300 mt-1 font-mono">
                  Horários: {dailyMetrics?.horasCriticas?.length > 0 ? dailyMetrics.horasCriticas.join(', ') : "Nenhum"}
                </div>
              </div>
            </div>

            {/* Card 2: Menor Conversão */}
            <div className="bg-[#1E293B]/60 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg flex flex-col">
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Menor Conversão</span>
              <div className="mt-2">
                <span className="text-2xl font-bold text-gray-200">
                  {dailyMetrics?.minConversion ? dailyMetrics.minConversion.toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* Card 3: Pico de Fluxo */}
            <div className="bg-[#1E293B]/60 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg flex flex-col">
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Pico de Fluxo</span>
              <div className="flex flex-col mt-2">
                <span className="text-2xl font-bold text-[#3B82F6]">{dailyMetrics?.maxFlow || 0}</span>
                <span className="text-xs text-[#3B82F6]/70 mt-1 font-mono">
                  Pico: {dailyMetrics?.maxFlowHour} ({dailyMetrics?.maxFlowPct}% do total)
                </span>
              </div>
            </div>

            {/* Card 4: Menor Cobertura (Pessoas) - Gold Border */}
            <div className="bg-[#1E293B]/60 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col border-l-4 border-[#D6B46A] shadow-lg">
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Menor Cobertura (Pessoas)</span>
              <div className="flex flex-col mt-2">
                <span className="text-2xl font-bold text-[#D6B46A]">{dailyMetrics?.minStaff || 0}</span>
                <span className="text-xs text-[#D6B46A]/70 mt-1 font-mono">
                  Horário: {dailyMetrics?.minStaffHour || "Nenhum"}
                </span>
              </div>
            </div>

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

  const ChartToggleButton = ({ type, current, setType }) => {
    const isActive = type === current;
    const Icon = type === 'line' ? Activity : BarChart3;
    return (
      <button
        onClick={() => setType(type)}
        className={`p-1.5 rounded transition-all ${isActive ? 'bg-[#D6B46A] text-black shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  };

  const InsightCard = ({ category, title, text, isHighlighted, onClick }) => {
    const styleMap = {
      alerta: "border-l-red-500",
      destaque: "border-l-[#D6B46A]",
      neutro: "border-l-blue-500"
    };

    return (
      <div
        className={`bg-[#121620]/40 backdrop-blur-md rounded-lg p-3 cursor-pointer border-l-2 border-t border-r border-b border-t-white/5 border-r-white/5 border-b-white/5 ${styleMap[category] || 'border-l-gray-500'} hover:bg-white/5 transition-all duration-300 group ${isHighlighted ? 'ring-1 ring-white/20' : ''}`}
        onClick={onClick}
      >
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5 group-hover:text-gray-300 transition-colors">{title}</p>
        <p className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors tabular-nums">{text}</p>
      </div>
    );
  };

  const CorporateTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1E293B]/90 backdrop-blur-md border border-white/10 p-2 shadow-xl text-xs font-sans rounded-lg">
          <p className="font-bold text-gray-100 border-b border-white/10 mb-1 pb-1">{label}h</p>
          {payload.map((entry, index) => {
            if (entry.dataKey === 'funcionarios_visual') {
              return (
                <p key={index} className="text-gray-200 font-semibold">
                  <span style={{ color: entry.color }}>■ </span>
                  Equipe: {entry.payload.funcionarios_real} pessoas
                </p>
              );
            }
            if (entry.dataKey === 'percentualFluxo') {
              return (
                <p key={index} className="text-gray-300">
                  <span style={{ color: entry.color }}>■ </span>
                  Fluxo: {entry.value}% <span className="text-gray-500 text-[10px] ml-1">({entry.payload.fluxo})</span>
                </p>
              );
            }
            if (entry.dataKey === 'pontoCritico') return null; // Não mostrar alerta no tooltip pois é visual
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
    <div
      className={`bg-[#121620]/60 backdrop-blur-2xl border rounded-2xl shadow-xl p-6 transition-all duration-300 flex flex-col items-center justify-center h-[300px] ${dragActiveState ? 'border-[#D6B46A] bg-[#D6B46A]/5' : 'border-white/5 hover:border-white/10'}`}
      onDragEnter={(e) => onDrag(e, type)}
      onDragLeave={(e) => onDrag(e, type)}
      onDragOver={(e) => onDrag(e, type)}
      onDrop={(e) => onDrop(e, type)}
    >
      <label className="block cursor-pointer text-center w-full">
        <div className="w-12 h-12 rounded-xl bg-white/5 mx-auto mb-4 flex items-center justify-center">
          <Upload className={`w-6 h-6 ${dragActiveState ? 'text-[#D6B46A]' : 'text-gray-500'}`} />
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
        <input type="file" accept=".xlsx,.xls" onChange={(e) => onUpload(e, type)} className="hidden" />
      </label>
    </div>
  );


  return (
    <div className="min-h-screen w-full bg-[#0B0F1A] flex flex-col">
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
    destaque: "border-l-[#D6B46A]",
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

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho Fixo */}
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-black text-white uppercase tracking-tighter">
          Escala: <span className="text-[#D6B46A]">{selectedDay}</span>
        </h3>
        <span className="text-[10px] font-bold bg-white/5 px-2 py-1 rounded text-gray-400">
          {colabsDoDia.length} TOTAL
        </span>
      </div>

      {/* Área de Lista com Scroll - Altura limitada para alinhar com o gráfico */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '450px' }}>
        <div className="grid grid-cols-1 gap-2">
          {colabsDoDia.map((colab) => (
            <div key={colab.id} className="bg-white/[0.03] border border-white/5 p-3 rounded-xl flex justify-between items-center hover:border-white/10 transition-all">
              <div className="flex flex-col min-w-0 flex-1 mr-2">
                <input
                  type="text"
                  value={colab.nome}
                  readOnly
                  className="bg-transparent text-xs font-black text-gray-200 uppercase focus:outline-none w-full truncate"
                />
                <span className="text-[10px] text-gray-500 font-bold">{colab.cargo || 'COLABORADOR'}</span>
              </div>

              <div className="flex gap-3 text-xs font-black tabular-nums shrink-0">
                {/* ENTRADA */}
                <div
                  className="flex flex-col items-end cursor-pointer group"
                  onClick={() => onTimeClick(colab.id, 'entrada', colab.entrada)}
                >
                  <span className="text-[9px] text-gray-600 uppercase group-hover:text-[#D6B46A] transition-colors">Entrada</span>
                  <span className={`transition-colors ${colab.entrada ? 'text-gray-300 group-hover:text-white' : 'text-gray-700'}`}>
                    {colab.entrada || '--:--'}
                  </span>
                </div>

                {/* INTERVALO */}
                <div
                  className="flex flex-col items-end cursor-pointer group"
                  onClick={() => onTimeClick(colab.id, 'intervalo', colab.intervalo)}
                >
                  <span className="text-[9px] text-gray-600 uppercase group-hover:text-[#D6B46A] transition-colors">Inter</span>
                  <span className={`transition-colors ${colab.intervalo ? 'text-gray-400 group-hover:text-white' : 'text-gray-700'}`}>
                    {colab.intervalo || '--:--'}
                  </span>
                </div>

                {/* SAÍDA */}
                <div
                  className="flex flex-col items-end cursor-pointer group"
                  onClick={() => onTimeClick(colab.id, 'saida', colab.saida)}
                >
                  <span className="text-[9px] text-[#D6B46A]/50 uppercase group-hover:text-[#D6B46A] transition-colors">Saída</span>
                  <span className={`transition-colors ${colab.saida ? 'text-[#D6B46A] group-hover:text-[#fae8b6]' : 'text-gray-700'}`}>
                    {colab.saida || '--:--'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// --- WEEKLY SCALE VIEW (Simple Funil 4+3) ---
const WeeklyScaleView = ({ staffRows, onTimeClick }) => {
  const [localTheme, setLocalTheme] = useState('dark');
  const dias = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];

  // Sync local theme with global print theme via event or callback (simplified here by just emitting event)
  const handleGenerate = (selectedTheme) => {
    // We need to update the parent state first, wait for render, then capture.
    // For simplicity, we'll dispatch an event with the theme payload.
    window.dispatchEvent(new CustomEvent('update-print-theme', { detail: selectedTheme }));
    // Small delay to allow state update before capture
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('generate-weekly-image'));
    }, 100);
  };

  return (
    <div className="p-8 bg-[#121620]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] relative group/weekly">
      <div className="absolute top-8 right-8 opacity-0 group-hover/weekly:opacity-100 transition-all flex items-center gap-2 bg-[#0B0F1A] p-1.5 rounded-xl border border-white/10 shadow-xl transform translate-y-2 group-hover/weekly:translate-y-0">
        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
          <button
            onClick={() => setLocalTheme('light')}
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${localTheme === 'light' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-white'}`}
          >
            Light
          </button>
          <button
            onClick={() => setLocalTheme('dark')}
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${localTheme === 'dark' ? 'bg-[#D6B46A] text-black shadow-sm' : 'text-gray-500 hover:text-white'}`}
          >
            Dark
          </button>
        </div>
        <div className="w-px h-4 bg-white/10 mx-1"></div>
        <button
          id="btn-gen-img"
          onClick={() => handleGenerate(localTheme)}
          className="px-3 py-1.5 rounded-lg bg-[#D6B46A] text-black font-black hover:bg-[#c4a055] transition text-[10px] uppercase tracking-wider flex items-center gap-1.5"
        >
          <Download className="w-3 h-3" />
          Baixar Imagem
        </button>
      </div>
      <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] text-center mb-10">Escala Semanal</h3>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dias.slice(0, 4).map(dia => <SimpleDayCard key={dia} dia={dia} staffRows={staffRows} onTimeClick={onTimeClick} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mx-auto w-full">
          {dias.slice(4).map(dia => <SimpleDayCard key={dia} dia={dia} staffRows={staffRows} onTimeClick={onTimeClick} />)}
        </div>
      </div>
    </div>
  );
};

// Sub-componente Simples para o Funil Semanal
const SimpleDayCard = ({ dia, staffRows, onTimeClick }) => {
  const colabsDoDia = staffRows.filter(r => r.dia === dia && r.nome !== '' && r.entrada);

  return (
    <div className="bg-[#0B0F1A]/80 border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-lg hover:border-[#D6B46A]/40 transition-all duration-500 group">
      <div className="bg-gradient-to-r from-[#D6B46A]/20 to-transparent px-5 py-3 border-b border-white/10">
        <span className="text-sm font-black text-[#D6B46A] tracking-widest uppercase">{dia}</span>
      </div>

      <div className="p-4 flex-1">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] text-gray-500 font-black uppercase tracking-tighter border-b border-white/5">
              <th className="pb-2">Atleta</th>
              <th className="pb-2 text-center">E</th>
              <th className="pb-2 text-center">I</th>
              <th className="pb-2 text-center">S</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {colabsDoDia.length > 0 ? colabsDoDia.map((colab) => (
              <tr key={colab.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 font-bold text-gray-200 text-xs truncate max-w-[80px] uppercase">{colab.nome}</td>
                <td
                  className="py-2.5 text-center text-gray-400 text-xs font-bold tabular-nums cursor-pointer hover:text-white transition-colors"
                  onClick={onTimeClick ? () => onTimeClick(colab.id, 'entrada', colab.entrada) : undefined}
                >
                  {colab.entrada || '--'}
                </td>
                <td
                  className="py-2.5 text-center text-gray-500 text-xs font-bold tabular-nums cursor-pointer hover:text-white transition-colors"
                  onClick={onTimeClick ? () => onTimeClick(colab.id, 'intervalo', colab.intervalo) : undefined}
                >
                  {colab.intervalo || '-'}
                </td>
                <td
                  className="py-2.5 text-center text-[#D6B46A] text-xs font-black tabular-nums cursor-pointer hover:text-[#fae8b6] transition-colors"
                  onClick={onTimeClick ? () => onTimeClick(colab.id, 'saida', colab.saida) : undefined}
                >
                  {colab.saida}{colab.saidaDiaSeguinte ? '⁺¹' : ''}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="py-8 text-center text-gray-700 text-[10px] font-bold uppercase tracking-widest">Folga Geral</td>
              </tr>
            )}
          </tbody>
        </table>
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
    ? "bg-[#070A10] text-white"
    : "bg-white text-slate-900";

  const bgImage = isDark
    ? 'radial-gradient(circle at 50% 0%, rgba(214, 180, 106, 0.08), transparent 70%)'
    : 'radial-gradient(circle at 50% 0%, rgba(0, 0, 0, 0.03), transparent 70%)';

  const logoStyle = isDark
    ? "text-[#D6B46A] border-[#D6B46A]/20 bg-[#D6B46A]/5"
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
      <div className="flex items-center justify-between mb-4 px-4">
        <h3 className={`text-2xl font-black uppercase tracking-[0.3em] ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Escala Semanal
        </h3>
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

  const cardBg = isDark ? "bg-[#0B0F1A] border-white/10" : "bg-white border-slate-200 shadow-sm";
  const headerBg = isDark ? "bg-white/[0.03] border-white/5" : "bg-slate-50 border-slate-100";
  const titleColor = isDark ? "text-[#D6B46A]" : "text-slate-900";
  const countBadge = isDark ? "bg-white/5 text-gray-500" : "bg-slate-200 text-slate-600";

  // Table Styles
  const thStyle = `pb-2 text-[9px] font-black uppercase tracking-tighter ${isDark ? 'text-gray-600' : 'text-slate-400'}`;
  const tdBase = "py-1.5 text-[10px] font-bold tabular-nums align-middle";
  const nameStyle = `font-bold uppercase truncate max-w-[90px] ${isDark ? 'text-gray-200' : 'text-slate-700'}`;
  const timeStyle = isDark ? "text-gray-400" : "text-slate-500";
  const saidaStyle = isDark ? "text-[#D6B46A]" : "text-slate-900";
  const borderBottom = isDark ? "border-white/[0.04]" : "border-slate-100";
  const emptyText = isDark ? "text-gray-700" : "text-slate-400";

  // Footer Styles
  const footerBg = isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-100";
  const footerTitle = isDark ? "text-gray-600" : "text-slate-400";
  const footerName = isDark ? "text-gray-500" : "text-slate-500";

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
          <tbody className={`divide-y ${isDark ? 'divide-white/[0.02]' : 'divide-slate-50'}`}>
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