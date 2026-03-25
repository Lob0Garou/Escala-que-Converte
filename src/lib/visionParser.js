/**
 * visionParser.js
 * Parser de imagem de escala via OpenRouter (google/gemini-1.5-flash).
 * Retorna { linhas: [...] } onde cada linha é { id, dia, nome, entrada, saida, intervalo, saidaDiaSeguinte }
 */

/**
 * Constrói o prompt de visão para extração de escala semanal.
 * @returns {string}
 */
export function buildVisionPrompt() {
  return `Você é um extrator de dados de escalas de trabalho. Analise a imagem e extraia os horários de todos os funcionários para cada dia da semana.

REGRAS:
- Extraia UMA entrada por combinação funcionário × dia
- Mapeie qualquer variação de nome de dia para exatamente um destes valores: SEGUNDA, TERCA, QUARTA, QUINTA, SEXTA, SABADO, DOMINGO
- Ignore dias marcados como FOLGA, OFF, DESCANSO ou sem horário preenchido
- "Almoço", "Intervalo", "Int" e similares são o campo "intervalo", NÃO são a hora de saída
- A hora de saída é quando o funcionário encerra o turno
- Funcione para qualquer layout: tabela com dias nas colunas, lista por funcionário, foto de quadro, planilha impressa
- Se um campo não estiver visível, use null

FORMATO DE SAÍDA — responda APENAS com JSON válido, sem markdown, sem texto adicional:
{
  "linhas": [
    { "nome": "Nome Completo", "dia": "SEGUNDA", "entrada": "09:00", "saida": "18:00", "intervalo": "12:00" },
    { "nome": "Nome Completo", "dia": "TERCA",   "entrada": "09:00", "saida": "18:00", "intervalo": null   }
  ]
}`;
}

/**
 * Normaliza a resposta da API para o formato interno da ferramenta.
 * @param {string} text - Texto bruto da resposta
 * @returns {{ linhas: Array<{id, dia, nome, entrada, saida, intervalo, saidaDiaSeguinte}> }}
 */
export function parseVisionResponse(text) {
  let jsonStr = text.trim();

  // Remove bloco de código markdown se presente
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    // Fallback: busca progressiva pelo primeiro objeto JSON
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('JSON inválido: nenhum objeto encontrado');
    }
    try {
      data = JSON.parse(jsonStr.slice(firstBrace, lastBrace + 1));
    } catch {
      throw new Error('JSON inválido: falha no parsing');
    }
  }

  // Garante que linhas é um array
  if (!data.linhas || !Array.isArray(data.linhas)) {
    data.linhas = [];
  }

  const now = Date.now();
  data.linhas = data.linhas.map((linha, index) => {
    const entrada = linha.entrada || '';
    const saida = linha.saida || '';
    const intervalo = linha.intervalo || '';

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
      dia: linha.dia || '',
      nome: linha.nome || '',
      entrada,
      saida,
      intervalo,
      saidaDiaSeguinte,
    };
  });

  return data;
}

/**
 * Processa imagem de escala via OpenRouter (google/gemini-1.5-flash).
 * @param {File} imageFile
 * @param {string} apiKey - Chave OpenRouter
 * @returns {Promise<{ linhas: Array }>}
 */
export async function processScheduleImage(imageFile, apiKey) {
  const dataUrl = await fileToDataUrl(imageFile);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-1.5-flash',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildVisionPrompt(),
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erro na API: ${response.status} - ${err}`);
  }

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content || '';

  return parseVisionResponse(text);
}

/**
 * Converte File para data URL completa (inclui prefixo data:image/...;base64,...).
 * @param {File} file
 * @returns {Promise<string>}
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
