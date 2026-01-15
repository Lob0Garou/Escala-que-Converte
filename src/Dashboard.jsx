import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Upload, Calendar, TrendingUp, Users, AlertCircle, Download, BarChart3, LineChart as LineChartIcon, Moon, Sun, LogIn, Coffee, LogOut } from 'lucide-react';
import { LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line as RechartsLine } from 'recharts';

// Main App Component
const App = () => {
  return <Dashboard />;
};

// The main Dashboard component
const Dashboard = () => {
  // --- STATE MANAGEMENT ---
  const [dragActive, setDragActive] = useState({ cupons: false, escala: false });
  const [cuponsData, setCuponsData] = useState([]);
  const [escalaData, setEscalaData] = useState([]);
  const [selectedDay, setSelectedDay] = useState('SEGUNDA');
  const [chartType, setChartType] = useState('line');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ cupons: null, escala: null });
  const [theme, setTheme] = useState('dark'); // Default theme is now dark
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState(null);
  const [escalaManualMode, setEscalaManualMode] = useState(false);

  // --- THEME SWITCHER ---
  useEffect(() => {
    // On initial load, check for saved theme in localStorage, default to dark
    const savedTheme = localStorage.getItem('dashboard-theme') || 'dark';
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    // Apply theme to the root element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save theme choice to localStorage
    localStorage.setItem('dashboard-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };


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

  /**
   * Converts various Excel time formats into a consistent "HH:mm" string.
   * @param {any} excelTime - The value from the Excel cell.
   * @returns {string|null} - The formatted time string or null for invalid/empty values.
   */
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

  /**
   * Parse numbers from Excel, handling strings with commas and other formats.
   * @param {any} value - The value from Excel cell.
   * @returns {number} - Parsed number or 0 if invalid.
   */
  const parseNumber = (value) => {
    if (typeof value === 'string') {
      return parseFloat(value.replace(/,/g, '')) || 0;
    }
    return parseFloat(value) || 0;
  };

  /**
   * Find and parse conversion value from Excel data.
   * Searches for "% Conversão" column and converts decimal to percentage.
   * @param {Object} cupom - The data row from Excel.
   * @returns {number} - Conversion percentage or 0 if not found.
   */
  const findAndParseConversion = (cupom) => {
    const conversaoValue = cupom['% Conversão'];
    if (conversaoValue == null || conversaoValue === '') return 0;

    const numericValue = parseFloat(conversaoValue);
    if (isNaN(numericValue)) return 0;

    // Se o valor é decimal (< 1), multiplica por 100 para converter para porcentagem
    return numericValue < 1 ? numericValue * 100 : numericValue;
  };

  /**
   * Parse flux value from Excel, removing ".0%" suffix.
   * @param {any} value - The flux value from Excel (e.g., "51800.0%").
   * @returns {number} - Clean numeric value.
   */
  const parseFluxValue = (value) => {
    if (typeof value === 'string') {
      // Remove ".0%" suffix and parse as number
      return parseFloat(value.replace('.0%', '')) || 0;
    }
    return parseFloat(value) || 0;
  };

  // --- FILE PROCESSING ---

  /**
   * Processes an uploaded Excel file.
   * @param {File} file - The file to process.
   * @param {'cupons' | 'escala'} type - The type of data being uploaded.
   */
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
        console.log('DADOS BRUTOS DO ARQUIVO:', jsonData);
        setCuponsData(jsonData);
      } else {
        const processedData = jsonData.map(row => ({
          ...row,
          ENTRADA: excelTimeToString(row.ENTRADA),
          INTER: excelTimeToString(row.INTER),
          SAIDA: excelTimeToString(row.SAIDA)
        }));
        setEscalaData(processedData);
      }
    } catch (err) {
      console.error(`Error processing ${type} file:`, err);
      setError(prev => ({ ...prev, [type]: 'Erro ao processar. Verifique o formato do arquivo.' }));
    }
    setLoading(false);
  }, []);

  // --- EVENT HANDLERS ---
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


  // --- DATA COMPUTATION (MEMOIZED) ---

  const dailyData = useMemo(() => {
    if (!cuponsData.length) return null;

    const dayMapping = diasSemana[selectedDay];

    // Encontrar a linha de "Total" para o dia selecionado
    const totalRow = cuponsData.find(c => c['Dia da Semana'] === dayMapping && c['cod_hora_entrada'] === 'Total');
    console.log('LINHA DE TOTAL ENCONTRADA:', totalRow);

    // Extrair totais diretamente da linha "Total"
    const totalCupons = totalRow ? parseNumber(totalRow['qtd_cupom']) : 0;
    const totalFluxo = totalRow ? parseFluxValue(totalRow['qtd_entrante']) : 0;
    // Filtrar dados para obter apenas as linhas com horas (excluindo "Total" e strings não numéricas)
    const dayCupons = cuponsData.filter(c =>
      c['Dia da Semana'] === dayMapping &&
      c['cod_hora_entrada'] !== 'Total' &&
      !isNaN(parseInt(c['cod_hora_entrada'], 10))
    );
    console.log('DADOS POR HORA FILTRADOS:', dayCupons);

    const dailySchedule = escalaData.length > 0
      ? escalaData
        .filter(e => e.DIA === selectedDay && e.ENTRADA)
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
  }, [cuponsData, escalaData, selectedDay, diasSemana]);

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

  const chartData = useMemo(() => {
    if (!dailyData) return [];

    const staffPerHour = calculateStaffPerHour(dailyData.dailySchedule, dailyData.minHour, dailyData.maxHour);
    const totalCuponsForPercent = dailyData.totalCupons || 1;
    const totalFluxoForPercent = dailyData.totalFluxo || 1;

    return dailyData.dayCupons.map(cupom => {
      const hour = parseInt(cupom['cod_hora_entrada'], 10);
      const qtdCupons = parseNumber(cupom['qtd_cupom']);
      const qtdFluxo = parseFluxValue(cupom['qtd_entrante']);

      // Usar função específica para parsing de conversão
      const percentualConversao = findAndParseConversion(cupom);

      return {
        hora: `${hour}h`,
        funcionarios: staffPerHour[hour] || 0,
        percentualCupons: parseFloat(((qtdCupons / totalCuponsForPercent) * 100).toFixed(1)),
        cupons: qtdCupons,
        percentualFluxo: parseFloat(((qtdFluxo / totalFluxoForPercent) * 100).toFixed(1)),
        fluxo: qtdFluxo,
        percentualConversao: percentualConversao
      };
    });
  }, [dailyData, calculateStaffPerHour]);

  const insights = useMemo(() => {
    if (!chartData.length) return null;

    // Encontrar hora com menor conversão (excluindo valores zero)
    const validConversionHours = chartData.filter(d => d.percentualConversao > 0);
    const lowestConversionHour = validConversionHours.length > 0
      ? validConversionHours.reduce((min, curr) =>
        curr.percentualConversao < min.percentualConversao ? curr : min
      )
      : null;

    const peakFluxoHour = chartData.length > 0 ? chartData.reduce((max, curr) =>
      curr.percentualFluxo > max.percentualFluxo ? curr : max
    ) : null;

    // Filter out the 22:00 hour for understaffed calculation
    const relevantHoursForStaffing = chartData.filter(d => parseInt(d.hora.replace('h', '')) < 22);

    const understaffedHour = relevantHoursForStaffing.length > 0
      ? relevantHoursForStaffing.reduce((min, curr) =>
        curr.funcionarios < min.funcionarios ? curr : min, relevantHoursForStaffing[0]
      )
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

  // --- RENDER COMPONENTS ---

  const Header = () => (
    <header className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
        Escala de Alta Performance
      </h1>
      <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
        Garanta a cobertura ideal para cada pico de vendas e evite ociosidade.
      </p>
    </header>
  );

  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-xl text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-700">Processando arquivo...</p>
      </div>
    </div>
  );

  const UploadSection = ({ processFile, dragActive, setDragActive, cuponsData, escalaData, error, escalaManualMode, setEscalaManualMode }) => (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <UploadBox
        type="cupons"
        title="FLUXO"
        onUpload={handleFileUpload}
        onDrag={handleDrag}
        onDrop={handleDrop}
        dragActiveState={dragActive.cupons}
        data={cuponsData}
        errorState={error.cupons}
      />
      <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="flex items-center justify-between px-6 pt-6 mb-2">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">ESCALA</h3>
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg">
            <button
              onClick={() => setEscalaManualMode(false)}
              className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${!escalaManualMode ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              Arquivo
            </button>
            <button
              onClick={() => setEscalaManualMode(true)}
              className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${escalaManualMode ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              Manual
            </button>
          </div>
        </div>

        <div className="flex-1 px-6 pb-6">
          {!escalaManualMode ? (
            <div
              className={`border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer ${dragActive.escala ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-gray-700' : ''}`}
              onDragEnter={(e) => setDragActive(prev => ({ ...prev, escala: true }))}
              onDragLeave={(e) => setDragActive(prev => ({ ...prev, escala: false }))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(prev => ({ ...prev, escala: false }));
                if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0], 'escala');
              }}
            >
              <label className="block cursor-pointer">
                <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Arraste aqui ou clique para selecionar</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Arquivo .xlsx ou .xls</p>
                <input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'escala')} className="hidden" />
              </label>
              {escalaData.length > 0 && !error.escala && (
                <p className="mt-3 text-sm text-green-600 font-medium">✓ {escalaData.length} registros carregados</p>
              )}
              {error.escala && (
                <p className="mt-3 text-sm text-red-600 font-medium">✗ {error.escala}</p>
              )}
            </div>
          ) : (
            <div className="flex-1 h-full min-h-[140px] bg-gray-50 dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center p-4">
              <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">Entrada Manual (Em breve)</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const Controls = ({ diasAbreviados, fullDayNames, selectedDay, setSelectedDay, chartType, setChartType, toggleTheme, theme, setShowUploadSection }) => (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center">
          <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1 overflow-x-auto scrollbar-hide">
            {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].map((day) => {
              const fullDay = {
                'SEG': 'SEGUNDA',
                'TER': 'TERÇA',
                'QUA': 'QUARTA',
                'QUI': 'QUINTA',
                'SEX': 'SEXTA',
                'SAB': 'SÁBADO',
                'DOM': 'DOMINGO'
              }[day];

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(fullDay)}
                  className={`
                    py-1.5 px-3 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap
                    ${selectedDay === fullDay
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ChartToggleButton type="line" current={chartType} setType={setChartType} />
          <ChartToggleButton type="bar" current={chartType} setType={setChartType} />
          <button onClick={exportData} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button
            onClick={() => setShowUploadSection(prev => !prev)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Alterar Ficheiros</span>
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </section>
  );

  const MainContent = ({ dailyData, insights, chartData, chartType, theme }) => (
    <main className="flex flex-col lg:flex-row gap-6">
      {/* Coluna da Esquerda: Schedule */}
      <aside className="lg:w-[400px] lg:flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" /> Escala - {selectedDay}
        </h3>
        <div className="max-h-[400px] lg:max-h-[600px] overflow-y-auto schedule-scroll-container">
          {dailyData.dailySchedule.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhum funcionário escalado.</p>
          ) : (
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                <tr>
                  <th scope="col" className="px-2 py-4 font-semibold w-2/5 lg:w-1/2">Atleta</th>
                  <th scope="col" className="px-2 py-4 font-semibold text-center w-1/5 lg:w-1/6">Entrada</th>
                  <th scope="col" className="px-2 py-4 font-semibold text-center w-1/5 lg:w-1/6">Intervalo</th>
                  <th scope="col" className="px-2 py-4 font-semibold text-center w-1/5 lg:w-1/6">Saída</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.dailySchedule.map((person, idx) => (
                  <tr key={idx} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 odd:bg-white/50 dark:odd:bg-gray-800/30 even:bg-black/5 dark:even:bg-black/20">
                    <td className="px-2 py-4 font-bold text-base text-gray-900 dark:text-white whitespace-nowrap">
                      {person.ATLETA}
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <LogIn className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{person.ENTRADA}</span>
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Coffee className="w-4 h-4 text-orange-400" />
                        <span className="text-orange-600 dark:text-orange-400 font-medium">{person.INTER || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <LogOut className="w-4 h-4 text-green-400" />
                        <span className="text-green-600 dark:text-green-400 font-medium">{person.SAIDA}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </aside>

      {/* Coluna da Direita: Insights + Chart */}
      <section className="flex-1 flex flex-col gap-6">
        {/* Insights lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights && (
            <>
              {insights.lowestConversionHour &&
                <InsightCard
                  category="funcionarios"
                  title="Menor Conversão"
                  text={`${insights.lowestConversionHour.hora} com ${insights.lowestConversionHour.percentualConversao}% de conversão`}
                  isHighlighted={highlightedLine === 'percentualConversao'}
                  onClick={() => setHighlightedLine(prev => prev === 'percentualConversao' ? null : 'percentualConversao')}
                />
              }
              {insights.peakFluxoHour &&
                <InsightCard
                  category="fluxo"
                  title="Maior Fluxo"
                  text={`${insights.peakFluxoHour.hora} com ${insights.peakFluxoHour.percentualFluxo}% do total`}
                  isHighlighted={highlightedLine === 'percentualFluxo'}
                  onClick={() => setHighlightedLine(prev => prev === 'percentualFluxo' ? null : 'percentualFluxo')}
                />
              }
              {insights.understaffedHour &&
                <InsightCard
                  category="funcionarios"
                  title="Menor Cobertura"
                  text={`${insights.understaffedHour.hora} com apenas ${insights.understaffedHour.funcionarios} funcionário(s)`}
                  isHighlighted={highlightedLine === 'funcionarios'}
                  onClick={() => setHighlightedLine(prev => prev === 'funcionarios' ? null : 'funcionarios')}
                />
              }
            </>
          )}
        </div>

        {/* Gráfico como destaque principal */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 flex flex-col">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" /> Análise por Hora - {selectedDay}
          </h3>

          <div id="chart-container" className="w-full h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2D3748' : '#E2E8F0'} />
                  <XAxis dataKey="hora" tick={{ fill: theme === 'dark' ? '#A0AEC0' : '#4A5568' }} />
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" tick={{ fill: theme === 'dark' ? '#A0AEC0' : '#4A5568' }} domain={['dataMin - 1', 'dataMax + 1']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ffc658" tick={{ fill: theme === 'dark' ? '#A0AEC0' : '#4A5568' }} domain={['dataMin - 2', 'dataMax + 2']} />
                  <YAxis yAxisId="conversao" orientation="right" stroke="#8884d8" hide={true} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: theme === 'dark' ? '#E2E8F0' : '#1A202C' }} />
                  <RechartsLine
                    yAxisId="left"
                    type="monotone"
                    dataKey="funcionarios"
                    name="Funcionários"
                    stroke="#3b82f6"
                    strokeWidth={highlightedLine === 'funcionarios' ? 4 : 2}
                    strokeOpacity={highlightedLine && highlightedLine !== 'funcionarios' ? 0.25 : 1}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <RechartsLine
                    yAxisId="conversao"
                    type="monotone"
                    dataKey="percentualConversao"
                    name="% Conversão"
                    stroke="#8884d8"
                    strokeWidth={highlightedLine === 'percentualConversao' ? 4 : 2}
                    strokeOpacity={highlightedLine && highlightedLine !== 'percentualConversao' ? 0.25 : 1}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <RechartsLine
                    yAxisId="right"
                    type="monotone"
                    dataKey="percentualFluxo"
                    name="Fluxo (%)"
                    stroke="#ffc658"
                    strokeWidth={highlightedLine === 'percentualFluxo' ? 4 : 2}
                    strokeOpacity={highlightedLine && highlightedLine !== 'percentualFluxo' ? 0.25 : 1}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2D3748' : '#E2E8F0'} />
                  <XAxis dataKey="hora" tick={{ fill: theme === 'dark' ? '#A0AEC0' : '#4A5568' }} />
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" tick={{ fill: theme === 'dark' ? '#A0AEC0' : '#4A5568' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fill: theme === 'dark' ? '#A0AEC0' : '#4A5568' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: theme === 'dark' ? '#E2E8F0' : '#1A202C' }} />
                  <Bar yAxisId="left" dataKey="funcionarios" name="Funcionários" fill="#3b82f6" />
                  <Bar yAxisId="right" dataKey="percentualCupons" name="% Cupons" fill="#10b981" />
                  <Bar yAxisId="right" dataKey="percentualFluxo" name="Fluxo (%)" fill="#ffc658" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </main>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
          <p className="font-semibold text-gray-800 dark:text-gray-100">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2).replace('.', ',') : entry.value}
              {entry.name.includes('%') ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const UploadBox = ({ type, title, onUpload, onDrag, onDrop, dragActiveState, data, errorState }) => (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-all ${dragActiveState ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-gray-700' : ''}`}
      onDragEnter={(e) => onDrag(e, type)}
      onDragLeave={(e) => onDrag(e, type)}
      onDragOver={(e) => onDrag(e, type)}
      onDrop={(e) => onDrop(e, type)}
    >
      <label className="block cursor-pointer">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
          <Upload className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
          <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Arraste aqui ou clique para selecionar</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">Arquivo .xlsx ou .xls</p>
        </div>
        <input type="file" accept=".xlsx,.xls" onChange={(e) => onUpload(e, type)} className="hidden" />
        {data.length > 0 && !errorState && (
          <p className="mt-3 text-sm text-green-600 font-medium">✓ {data.length} registros carregados</p>
        )}
        {errorState && (
          <p className="mt-3 text-sm text-red-600 font-medium">✗ {errorState}</p>
        )}
      </label>
    </div>
  );

  // --- MAIN JSX ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 font-sans transition-colors">
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Estilização da barra de rolagem para o container da escala */
        .schedule-scroll-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .schedule-scroll-container::-webkit-scrollbar-track {
          background: #2d3748;
          border-radius: 10px;
        }

        .schedule-scroll-container::-webkit-scrollbar-thumb {
          background-color: #4a5568;
          border-radius: 10px;
          border: 2px solid #2d3748;
        }

        .schedule-scroll-container::-webkit-scrollbar-thumb:hover {
          background-color: #718096;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <Header />

        {loading && <LoadingOverlay />}

        {/* --- LÓGICA DE RENDERIZAÇÃO UNIFICADA E CORRETA --- */}

        {/* Se NÃO houver dados de cupons, mostra apenas a seção de upload */}
        {!cuponsData.length && (
          <UploadSection
            processFile={processFile}
            dragActive={dragActive}
            setDragActive={setDragActive}
            cuponsData={cuponsData}
            escalaData={escalaData}
            error={error}
            escalaManualMode={escalaManualMode}
            setEscalaManualMode={setEscalaManualMode}
          />
        )}

        {/* Se HOUVER dados de cupons, mostra os controles e o conteúdo principal */}
        {cuponsData.length > 0 && (
          <>
            <Controls
              diasAbreviados={['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']}
              fullDayNames={{
                'SEG': 'SEGUNDA',
                'TER': 'TERÇA',
                'QUA': 'QUARTA',
                'QUI': 'QUINTA',
                'SEX': 'SEXTA',
                'SAB': 'SÁBADO',
                'DOM': 'DOMINGO'
              }}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              chartType={chartType}
              setChartType={setChartType}
              toggleTheme={toggleTheme}
              theme={theme}
              setShowUploadSection={setShowUploadSection}
            />

            {/* A seção de upload retrátil SÓ aparece se o estado for true */}
            {showUploadSection && (
              <UploadSection
                processFile={processFile}
                dragActive={dragActive}
                setDragActive={setDragActive}
                cuponsData={cuponsData}
                escalaData={escalaData}
                error={error}
                escalaManualMode={escalaManualMode}
                setEscalaManualMode={setEscalaManualMode}
              />
            )}

            <MainContent
              dailyData={dailyData}
              insights={insights}
              chartData={chartData}
              chartType={chartType}
              theme={theme}
            />
          </>
        )}

        {/* Empty State - apenas quando não há dados de cupons E não está carregando */}
        {!cuponsData.length && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <Upload className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Carregue os arquivos para começar</h3>
            <p className="text-gray-500 dark:text-gray-400">Faça upload do arquivo FLUXO para visualizar os dados. O arquivo ESCALA é opcional.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- HELPER COMPONENTS ---

const ChartToggleButton = ({ type, current, setType }) => {
  const isActive = type === current;
  const Icon = type === 'line' ? LineChartIcon : BarChart3;
  return (
    <button
      onClick={() => setType(type)}
      className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};

const InsightCard = ({ category, title, text, isHighlighted, onClick }) => {
  const colorMap = {
    cupons: {
      wrapper: "bg-green-50 dark:bg-green-900/40 text-green-900 dark:text-green-200",
      icon: "text-green-600 dark:text-green-400"
    },
    fluxo: {
      wrapper: "bg-yellow-50 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200",
      icon: "text-yellow-600 dark:text-yellow-400"
    },
    funcionarios: {
      wrapper: "bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200",
      icon: "text-blue-600 dark:text-blue-400"
    }
  };

  const styles = colorMap[category] || colorMap.cupons;

  return (
    <div
      className={`rounded-lg p-4 cursor-pointer transition-all duration-200 hover:scale-105 ${styles.wrapper} ${isHighlighted ? 'ring-2 ring-white/80 shadow-lg' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 ${styles.icon} mt-0.5 flex-shrink-0`} />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm">{text}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;