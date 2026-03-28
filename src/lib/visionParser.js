/**
 * visionParser.js
 * Parser de imagem de escala via Google AI (Gemini 2.5 Flash).
 * Usa responseSchema para forçar saída estruturada — sem parsing frágil.
 * Retorna { linhas: [...] } no formato interno da ferramenta.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Resolução máxima antes de enviar para a API (reduz tokens visuais e custo)
const MAX_IMAGE_PX = 1600;
const JPEG_QUALITY = 0.88;

/**
 * Redimensiona e comprime a imagem para reduzir tokens visuais.
 * @param {File} file
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, MAX_IMAGE_PX / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          const reader = new FileReader();
          reader.onload = () => resolve({
            base64: reader.result.split(',')[1],
            mimeType: 'image/jpeg',
          });
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Prompt de extração com 8 regras.
 * @returns {string}
 */
export function buildVisionPrompt() {
  return `Siga exatamente o layout de saída solicitado. A prioridade máxima é extrair os dados da escala na imagem.

REGRAS DE EXTRAÇÃO:
1. Identificar: dia da semana, nome do colaborador, horário de entrada, horário de intervalo, horário de saída, folgas.
2. O campo DIA deve ficar em MAIÚSCULO: SEGUNDA, TERCA/TERÇA, QUARTA, QUINTA, SEXTA, SABADO/SÁBADO, DOMINGO.
3. O campo ATLETA deve conter apenas o nome do colaborador.
4. Os horários devem estar no formato HH:MM (ex: 09:30, 14:20).
5. Se for dia de folga: ENTRADA="FOLGA", INTER="", SAIDA="".
6. Corrija automaticamente erros de OCR (O e 0, I e 1, S e 5) e preserve nomes próprios.
7. Se estiver totalmente ilegível, use "REVISAR" para o nome ou horário.
8. Mantenha a ordem dos dias da semana e, dentro de cada dia, a ordem visual de cima para baixo.`;
}

/**
 * Normaliza o array retornado pelo Gemini para o formato interno.
 * @param {string} text
 * @returns {{ linhas: Array }}
 */
export function parseVisionResponse(text) {
  let arr;
  try {
    arr = JSON.parse(text.trim());
  } catch {
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
 * Comprime a imagem antes de enviar para reduzir custo.
 * @param {File} imageFile
 * @param {string} apiKey
 * @returns {Promise<{ linhas: Array }>}
 */
export async function processScheduleImage(imageFile, apiKey) {
  const { base64, mimeType } = await compressImage(imageFile);

  const requestBody = {
    contents: [{
      parts: [
        { text: buildVisionPrompt() },
        { inlineData: { mimeType, data: base64 } },
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
