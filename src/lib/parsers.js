
export const parseSalesData = async (file) => {
    const buffer = await file.arrayBuffer();
    // Dynamic import for browser environment
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs');

    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Encontrar linha dos filtros (última linha ou contém "Filtros aplicados")
    const filterRow = jsonData.find(row =>
        row && row.some(cell => String(cell).includes('Filtros aplicados'))
    );
    // Default parsing if not found? 
    // Let's grab specific regex from text
    const periodText = filterRow ? filterRow.join(' ') : '';

    // Extrair datas
    const dateMatches = periodText.match(/(\d{2}\/\d{2}\/\d{4})/g);
    if (!dateMatches || dateMatches.length < 2) {
        // If we can't find the period in "Filtros aplicados", try seeing if it's in a header or metadata.
        // But for now, throw error as per spec or handle gracefully?
        // Spec says: "throw new Error('Período não encontrado no arquivo de vendas')"
        throw new Error('Período não encontrado no arquivo de vendas. Verifique se a linha "Filtros aplicados" está presente.');
    }

    const parseBRDate = (str) => {
        const [day, month, year] = str.split('/');
        return new Date(year, month - 1, day);
    };

    const startDate = parseBRDate(dateMatches[0]);
    const endDate = parseBRDate(dateMatches[1]);

    // Encontrar índice das colunas (linha 2 normalmente tem os headers)
    // Check index of row starting with "Dia da Semana" or "Hora"
    let headerRowIndex = jsonData.findIndex(r => r && r.some(c => String(c).includes('Dia da Semana')));
    if (headerRowIndex === -1) headerRowIndex = 1; // Fallback to 1

    const headerRow = jsonData[headerRowIndex]; // ["Dia da Semana", "1. Seg", "2. Ter", ...]
    const dayIndices = {};

    if (headerRow) {
        headerRow.forEach((cell, idx) => {
            if (cell && String(cell).includes('.')) {
                dayIndices[cell] = idx;
            }
        });
    }

    // Processar dados (linhas 2 em diante, até "Total")
    const salesByDayHour = {};
    const daysMap = {
        '1. Seg': 'SEGUNDA',
        '2. Ter': 'TERCA',
        '3. Qua': 'QUARTA',
        '4. Qui': 'QUINTA',
        '5. Sex': 'SEXTA',
        '6. Sab': 'SABADO',
        '7. Dom': 'DOMINGO'
    };

    // Inicializar estrutura
    Object.values(daysMap).forEach(day => {
        salesByDayHour[day] = {};
        for (let h = 10; h <= 22; h++) salesByDayHour[day][h] = 0;
    });

    // Preencher dados
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        // Check for Total row to break
        if (row[0] && String(row[0]).toLowerCase().includes('total')) break;

        const hour = parseInt(row[0]);
        if (isNaN(hour) || hour < 10 || hour > 22) continue;

        Object.entries(dayIndices).forEach(([dayKey, colIdx]) => {
            const value = parseFloat(row[colIdx]) || 0;
            if (daysMap[dayKey]) {
                salesByDayHour[daysMap[dayKey]][hour] = value;
            }
        });
    }

    return {
        salesByDayHour,
        periodText,
        startDate,
        endDate
    };
};
