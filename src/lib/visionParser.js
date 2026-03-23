/**
 * visionParser.js
 * Parser de imagem de escala via Claude Vision API
 */

/**
 * Constrói o prompt de visão para extração de escala.
 * @returns {string} Prompt formatado com tags XML
 */
export function buildVisionPrompt() {
  return `Analise a imagem de escala de trabalho e extraia as informações.

<image>
{{IMAGEM}}
</image>

REGRAS_PARA_EXTRAO:
- Identifique cada funcionário pelo nome
- Para cada funcionário, extraia: nome, entrada e saída
- Lembre-se: "almoco" ou similar não é hora de saida, é apenas indicao de intervalo
-まま

FORMATO_SAIDA:
Responda APENAS com um objeto JSON, sem markdown ou texto adicional:
{
  "funcionarios": [
    {
      "nome": "Nome do Funcionário",
      "entrada": "HH:MM",
      "saida": "HH:MM"
    }
  ]
}`;
}

/**
 * Extrai e normaliza o JSON da resposta da API de visão.
 * @param {string} text - Texto bruto da resposta
 * @returns {object} Objeto com array de funcionários
 */
export function parseVisionResponse(text) {
  let jsonStr = text.trim();

  // Remove bloco de código markdown
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Tenta parsear diretamente (caso mais comum)
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    // Fallback: extrai JSON usando busca progressiva
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('JSON inválido: nenhum objeto encontrado');
    }

    const candidate = jsonStr.slice(firstBrace, lastBrace + 1);
    try {
      data = JSON.parse(candidate);
    } catch {
      throw new Error('JSON inválido: falha no parsing');
    }
  }

  // Normaliza campos
  if (!data.funcionarios || !Array.isArray(data.funcionarios)) {
    data.funcionarios = [];
  }

  data.funcionarios = data.funcionarios.map((func, index) => {
    const entrada = func.entrada;
    const saida = func.saida;

    // Detecta saída no dia seguinte (ex: entrada 22:00, saída 06:00)
    let saidaDiaSeguinte = false;
    if (entrada && saida) {
      const [hEnt] = entrada.split(':').map(Number);
      const [hSaid] = saida.split(':').map(Number);
      if (!isNaN(hEnt) && !isNaN(hSaid) && hSaid < hEnt) {
        saidaDiaSeguinte = true;
      }
    }

    return {
      ...(entrada !== undefined && { entrada }),
      ...(saida !== undefined && { saida }),
      id: func.id || `func_${Date.now()}_${index}`,
      nome: func.nome || '',
      saidaDiaSeguinte,
    };
  });

  return data;
}

/**
 * Processa imagem de escala via Claude Vision API.
 * @param {File} imageFile - Arquivo de imagem
 * @param {string} apiKey - Chave da API Anthropic
 * @returns {Promise<object>} Dados extraídos
 */
export async function processScheduleImage(imageFile, apiKey) {
  const prompt = buildVisionPrompt();

  const base64 = await fileToBase64(imageFile);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageFile.type,
                data: base64,
              },
            },
            {
              type: 'text',
              text: prompt,
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
  const text = result.content?.[0]?.text || '';

  return parseVisionResponse(text);
}

/**
 * Converte File para base64.
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
