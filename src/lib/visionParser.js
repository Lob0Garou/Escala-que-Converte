/**
 * visionParser.js
 * Parser de imagem de escala via Google AI (Gemini 2.5 Flash).
 * Usa responseSchema para forçar saída estruturada — sem parsing frágil.
 * Retorna { linhas: [...] } no formato interno da ferramenta.
 */

const GEMINI_MODEL = 'gemini-2.5-flash-preview-05-20';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Prompt de extração com 8 regras — replicado do conversor HTML de referência.
 * @returns {string}
 */
export function buildVisionPrompt() {
  return `Siga exatamente o layout de saída solicitado. A prioridade máxima é extrair os dados da escala na imagem.

REGRAS DE EXTRAÇÃO:
1. Identificar: dia da semana, nome do colaborador, horário de entrada, horário de intervalo, horário de saída, folgas.
2. O campo DIA deve ficar em MAIÚSCULO: SEGUNDA, TERCA, QUARTA, QUINTA, SEXTA, SABADO, DOMINGO.
3. O campo ATLETA deve conter apenas o nome do colaborador.
4. Os horários devem estar no formato HH:MM (ex: 09:30, 14:20).
5. Se for dia de folga: ENTRADA="FOLGA", INTER="", SAIDA="".
6. Corrija automaticamente erros de OCR (O e 0, I e 1, S e 5) e preserve nomes próprios.
7. Se estiver totalmente ilegível, use "REVISAR" para o nome ou horário.
8. Mantenha a ordem dos dias da semana e, dentro de cada dia, a ordem visual de cima para baixo.`;
}

/**
 * Normaliza o array retornado pelo Gemini para o formato interno.
 * Input: JSON string de array [{DIA, ATLETA, ENTRADA, INTER, SAIDA}, ...]
 * @param {string} text
 * @returns {{ linhas: Array }}
 */
export function parseVisionResponse(text) {
  let arr;
  try {
    arr = JSON.parse(text.trim());
  } catch {
    // Fallback: busca o array no texto
    const first = text.indexOf('[');
    const last = text.lastIndexOf(']');
    if (first === -1 || last === -1 || last <= first) {
      throw new Error('JSON inválido: nenhum array encontrado');
    }
    try {
      arr = JSON.parse(text.slice(first, last + 1));
    } catch {
      throw new Error('JSON inválido: falha no parsing');
    }
  }

  if (!Array.isArray(arr)) arr = [];

  const now = Date.now();
  const linhas = arr.map((item, index) => {
    // FOLGA → campos de horário vazios
    const isFolga = (item.ENTRADA || '').toUpperCase() === 'FOLGA';
    const entrada = isFolga ? '' : (item.ENTRADA || '');
    const saida = isFolga ? '' : (item.SAIDA || '');
    const intervalo = item.INTER || '';

    let saidaDiaSeguinte = false;
    if (entrada && saida) {
      const [hEnt] = entrada.split(':').map(Number);
      const [hSaid] = saida.split(':').map(Number);
      if (!isNaN(hEnt) && !isNaN(hSaid) && hSaid < hEnt) {
        saidaDiaSeguinte = true;
      }
    }

    return {
      id: `img_${now}_${index}`,
      dia: (item.DIA || '').toUpperCase().trim(),
      nome: item.ATLETA || '',
      entrada,
      saida,
      intervalo,
      saidaDiaSeguinte,
    };
  });

  return { linhas };
}

/**
 * Processa imagem de escala via Google AI Gemini 2.5 Flash.
 * Usa responseSchema para garantir saída 100% estruturada.
 * @param {File} imageFile
 * @param {string} apiKey - Chave do Google AI Studio (aistudio.google.com)
 * @returns {Promise<{ linhas: Array }>}
 */
export async function processScheduleImage(imageFile, apiKey) {
  const base64 = await fileToBase64(imageFile);

  const requestBody = {
    contents: [{
      parts: [
        { text: buildVisionPrompt() },
        { inlineData: { mimeType: imageFile.type, data: base64 } },
      ],
    }],
    systemInstruction: {
      parts: [{ text: 'Você é um extrator de dados altamente preciso especializado em converter imagens de escalas de trabalho em dados estruturados.' }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            DIA:     { type: 'STRING' },
            ATLETA:  { type: 'STRING' },
            ENTRADA: { type: 'STRING' },
            INTER:   { type: 'STRING' },
            SAIDA:   { type: 'STRING' },
          },
          required: ['DIA', 'ATLETA', 'ENTRADA', 'INTER', 'SAIDA'],
        },
      },
    },
  };

  // Retry com backoff exponencial (até 5 tentativas)
  const delays = [1000, 2000, 4000, 8000, 16000];
  let response;

  for (let i = 0; i <= delays.length; i++) {
    try {
      const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Erro na API: ${res.status} - ${err}`);
      }

      response = await res.json();
      break;
    } catch (err) {
      if (i === delays.length) throw err;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }

  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseVisionResponse(text);
}

/**
 * Converte File para base64 puro (sem prefixo data:...).
 * @param {File} file
 * @returns {Promise<string>}
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
