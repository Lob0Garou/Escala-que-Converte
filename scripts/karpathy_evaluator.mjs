/**
 * Karpathy Evaluator - Pipeline de Otimização Autônoma
 * 
 * 1. Acessa Vercel via Playwright para pegar o Baseline.
 * 2. Roda a escala localmente no Motor V5.
 * 3. Compara resultados e gera o output para o LLM refatorar.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as XLSX from 'xlsx';

// Importa o motor local atual (usamos importação dinâmica para pegar sempre a versão mais recente após refatorações)
const loadEngine = async () => {
    return await import('../src/lib/thermalBalance_v5.js');
};

// Helpers de Parsing Excel (Idênticos ao frontend)
function excelTimeToString(serial) {
    if (!serial) return "";
    if (typeof serial === 'string') return serial;
    const totalSeconds = Math.round(serial * 24 * 60 * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function calculateActiveStaffByHour(optimizedRows, targetDay) {
    const activeStaffByHour = new Array(24).fill(0);
    optimizedRows.forEach(emp => {
        if (emp.dia !== targetDay || !emp.entrada || emp.entrada.toUpperCase() === 'FOLGA') return;
        const eH = parseInt(emp.entrada.split(':')[0], 10);
        let sH = parseInt(emp.saida.split(':')[0], 10);
        if (sH < eH) sH += 24; // Cross-midnight
        const bH = emp.intervalo ? parseInt(emp.intervalo.split(':')[0], 10) : null;

        for (let h = eH; h < sH; h++) {
            const normH = h >= 24 ? h - 24 : h;
            if (normH !== bH) activeStaffByHour[normH]++;
        }
    });
    return activeStaffByHour;
}

const VERCEL_URL = 'https://escala-que-converte.vercel.app/';
const RESULTS_FILE = path.join(process.cwd(), 'ralph-loop-results.md');

export async function evaluateScale(storeName, day, fluxoPath, escalaPath) {
    console.log(`\n[🔍 Avaliando] Loja: ${storeName} | Dia: ${day}`);

    let vercelScore = 0;
    let localScore = 0;

    // ==========================================
    // PASSO 1: Extrair Baseline da Vercel (Playwright)
    // ==========================================
    console.log(`⏳ Iniciando Playwright para extrair Baseline...`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(VERCEL_URL);

        // Localizar inputs de arquivo (assumindo a ordem: 1º Fluxo, 2º Escala)
        await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 10000 });
        const fileInputs = await page.locator('input[type="file"]').all();

        if (fileInputs.length >= 2) {
            // Preencher os inputs (caminho absoluto)
            await fileInputs[0].setInputFiles(fluxoPath);
            await fileInputs[1].setInputFiles(escalaPath);

            // Aguardar o processamento e a interface do dashboard carregar
            await page.waitForSelector('text=Relatório de Capacidade', { timeout: 15000 });

            // Tentar extrair o Score do componente de Header/Dashboard
            // Procura por um texto que contenha "Score:" ou tenta avaliar o DOM
            const scoreElement = await page.evaluate(() => {
                // Lógica de raspagem heurística (procura a badge de score térmico)
                const textNodes = Array.from(document.querySelectorAll('*'))
                    .filter(el => el.textContent.includes('Score') || el.textContent.includes('Aderência'))
                    .map(el => el.textContent);

                for (const text of textNodes) {
                    const match = text.match(/(\d+)(?:\s*%)/); // Pega algo como "85%" ou "Score 85"
                    if (match) return parseFloat(match[1]);
                }
                return null;
            });

            if (scoreElement) {
                vercelScore = scoreElement;
            } else {
                vercelScore = "N/A (Extração DOM pendente)";
            }
        }
    } catch (error) {
        console.error(`❌ Erro no Playwright:`, error.message);
        vercelScore = 'ERRO';
    } finally {
        await browser.close();
    }

    // ==========================================
    // PASSO 2: Rodar Motor Local V5
    // ==========================================
    console.log(`⚙️ Executando Motor Matemático Local (V5)...`);
    try {
        const { optimizeAllDays, computeThermalMetrics } = await loadEngine();
        const xlsxLib = XLSX.default || XLSX;

        // Leitura local usando fs + XLSX
        const fluxoWb = xlsxLib.read(fs.readFileSync(fluxoPath), { type: 'buffer' });
        const fluxoJson = xlsxLib.utils.sheet_to_json(fluxoWb.Sheets[fluxoWb.SheetNames[0]]);

        const escalaWb = xlsxLib.read(fs.readFileSync(escalaPath), { type: 'buffer' });
        const escalaJson = xlsxLib.utils.sheet_to_json(escalaWb.Sheets[escalaWb.SheetNames[0]]);

        // Parsing da Escala
        const staffRows = escalaJson.map((row, index) => ({
            id: `local-${index}`,
            dia: row.DIA ? row.DIA.toUpperCase().trim() : 'SEGUNDA', // Default fallback
            nome: row.ATLETA || row.NOME || 'Colaborador',
            entrada: excelTimeToString(row.ENTRADA) || '',
            intervalo: excelTimeToString(row.INTER) || '',
            saida: excelTimeToString(row.SAIDA) || '',
        }));
        const targetDay = staffRows.length > 0 ? staffRows[0].dia : 'SEGUNDA';

        // Parsing do Fluxo
        const flowByHour = fluxoJson.map(row => {
            const hourStr = row['cod_hora_entrada'];
            if (!hourStr || hourStr === 'Total' || isNaN(parseInt(hourStr, 10))) return null;
            let conv = parseFloat(row['% Conversão']) || 0;
            if (conv < 1) conv *= 100;
            return {
                hour: parseInt(hourStr, 10),
                flow: parseFloat(String(row['qtd_entrante'] || '0').replace('.0%', '')) || 0,
                conversion: conv,
                cupons: parseFloat(row['qtd_cupom']) || 0
            };
        }).filter(Boolean);

        const flowMap = { [targetDay]: flowByHour };

        // OTIMIZAÇÃO (O Motor real)
        const optimizedRows = optimizeAllDays(staffRows, flowMap, { enableShiftSuggestion: true });

        // Cálculo de Score
        const activeStaffByHour = calculateActiveStaffByHour(optimizedRows, targetDay);
        const hourlyData = flowByHour.map(f => ({
            ...f,
            activeStaff: activeStaffByHour[f.hour] || 0
        }));

        const metrics = computeThermalMetrics(hourlyData);
        localScore = metrics.score;

    } catch (error) {
        console.error(`❌ Erro no Motor Local:`, error.message);
        localScore = 'ERRO';
    }

    // ==========================================
    // PASSO 3: Avaliação e Registro
    // ==========================================
    const isBetter = localScore > vercelScore || localScore >= 90;
    const status = localScore >= 90 ? '✅ ÓTIMO' : (isBetter ? '🔼 MELHORIA' : '❌ REFATORAR');

    const logLine = `| ${storeName} | ${day} | \`fluxo, escala\` | ${vercelScore} | ${localScore} | ${status} | Pendente |\n`;

    fs.appendFileSync(RESULTS_FILE, logLine);
    console.log(`📝 Resultado registrado em ralph-loop-results.md`);
    console.log(`--- [ Vercel: ${vercelScore} | Local: ${localScore} | Status: ${status} ] ---\n`);

    return { vercelScore, localScore, isBetter, status };
}

// Orquestrador do Loop
export async function runLoop(testDir) {
    console.log(`\n🚀 Iniciando Loop Karpathy no Dataset: ${testDir}`);

    if (!fs.existsSync(testDir)) {
        console.error(`❌ Diretório não encontrado: ${testDir}`);
        return;
    }

    const files = fs.readdirSync(testDir);
    const pairs = {};

    // Heurística para parear os arquivos da mesma loja/dia
    for (const f of files) {
        if (!f.endsWith('.xlsx') && !f.endsWith('.xls')) continue;

        const isFluxo = f.toLowerCase().includes('fluxo') || f.toLowerCase().includes('cupons');
        const isEscala = f.toLowerCase().includes('escala') || f.toLowerCase().includes('esacal');

        // Extrai o número da loja do nome do arquivo para usar como chave de pareamento
        const numberMatch = f.match(/\d+/);
        let storeKey = numberMatch ? numberMatch[0] : null;

        if (!storeKey) {
            // Fallback caso não tenha número no nome do arquivo
            storeKey = f.toLowerCase()
                .replace(/\.xlsx?$/i, '')
                .replace(/escala|esacal|fluxo|cupons/gi, '')
                .replace(/^[_\-\s]+|[_\-\s]+$/g, '')
                .trim();
            if (!storeKey) storeKey = 'loja_unica';
        }

        if (!pairs[storeKey]) pairs[storeKey] = {};
        if (isFluxo) pairs[storeKey].fluxo = path.join(testDir, f);
        if (isEscala) pairs[storeKey].escala = path.join(testDir, f);
    }

    for (const [store, pair] of Object.entries(pairs)) {
        if (pair.fluxo && pair.escala) {
            await evaluateScale(store, 'Auto-Detect', pair.fluxo, pair.escala);
        } else {
            console.log(`⚠️ Par incompleto ignorado para chave: ${store}`);
        }
    }

    console.log(`\n🏁 Loop concluído. Verifique o arquivo ralph-loop-results.md para a baseline de refatoração.`);
}

// CLI Entrypoint
const args = process.argv.slice(2);
if (args[0] === 'loop') {
    let testDir = args[1] || 'C:\\Users\\yuriq\\Downloads\\ESCALAS CORREÇÃO';

    // Converte automaticamente o caminho do Windows para o formato WSL se rodar no Linux
    if (os.platform() === 'linux' && testDir.match(/^C:/i)) {
        testDir = testDir.replace(/^C:\\?/i, '/mnt/c/').replace(/\\/g, '/');
    }

    runLoop(testDir);
}