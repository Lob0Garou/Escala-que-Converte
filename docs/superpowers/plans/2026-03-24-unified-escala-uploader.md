# Upload Unificado de Escala Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar o upload de escala em um único componente que aceita tanto `.xlsx` quanto imagens, corrigindo o `visionParser.js` que está quebrado.

**Architecture:** `visionParser.js` é reescrito para extrair funcionário × dia de qualquer layout visual e retornar `{ linhas: [...] }` no formato interno. `UnifiedEscalaUploader.jsx` substitui o box inline de Escala e o `ImageUploader.jsx`, roteando Excel para `processFile` e imagem para `processScheduleImage`. `UploadSection.jsx` e `Dashboard.jsx` recebem as novas props necessárias.

**Tech Stack:** React 19, Vite, Node test runner (`node --test`), Anthropic API (`claude-3-5-sonnet-20241022`)

---

## Mapa de Arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/visionParser.js` | Reescrita completa |
| `src/__tests__/visionParser.test.js` | Reescrita completa (API muda de `funcionarios` para `linhas`) |
| `src/components/upload/UnifiedEscalaUploader.jsx` | Criado |
| `src/components/upload/UploadSection.jsx` | Adiciona props `selectedDay`, `processFile`; remove inline Escala box e `ImageUploader` |
| `src/components/upload/ImageUploader.jsx` | Deletado |
| `src/features/dashboard/Dashboard.jsx` | Adiciona `selectedDay` e `processFile` nas duas chamadas de `<UploadSection>` |

---

## Task 1: Reescrever `visionParser.js` com TDD

**Files:**
- Modify: `src/__tests__/visionParser.test.js`
- Modify: `src/lib/visionParser.js`

> O teste atual usa `funcionarios` — precisa ser completamente substituído para a nova API `linhas`.

- [ ] **Step 1.1: Substituir o arquivo de testes pelo novo**

Substitua o conteúdo de `src/__tests__/visionParser.test.js` por:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildVisionPrompt, parseVisionResponse } from '../lib/visionParser.js';

describe('buildVisionPrompt', () => {
  it('retorna string com instruções de extração de dia', () => {
    const prompt = buildVisionPrompt();
    assert.ok(typeof prompt === 'string');
    assert.ok(prompt.includes('SEGUNDA'));
    assert.ok(prompt.includes('SABADO'));
    assert.ok(prompt.includes('linhas'));
    assert.ok(prompt.includes('intervalo'));
    assert.ok(prompt.length > 200, 'prompt deve ser substancial');
  });
});

describe('parseVisionResponse', () => {
  it('parseia JSON limpo com campo linhas', () => {
    const raw = JSON.stringify({
      linhas: [
        { nome: 'Ana', dia: 'SEGUNDA', entrada: '09:00', saida: '18:00', intervalo: '12:00' },
      ],
    });
    const result = parseVisionResponse(raw);
    assert.strictEqual(result.linhas.length, 1);
    assert.strictEqual(result.linhas[0].nome, 'Ana');
    assert.strictEqual(result.linhas[0].dia, 'SEGUNDA');
    assert.strictEqual(result.linhas[0].intervalo, '12:00');
  });

  it('remove bloco markdown antes de parsear', () => {
    const raw = '```json\n{"linhas":[{"nome":"João","dia":"TERCA","entrada":"08:00","saida":"17:00","intervalo":null}]}\n```';
    const result = parseVisionResponse(raw);
    assert.strictEqual(result.linhas[0].nome, 'João');
  });

  it('normaliza intervalo null para string vazia', () => {
    const raw = JSON.stringify({
      linhas: [{ nome: 'Maria', dia: 'QUARTA', entrada: '10:00', saida: '19:00', intervalo: null }],
    });
    const result = parseVisionResponse(raw);
    assert.strictEqual(result.linhas[0].intervalo, '');
  });

  it('adiciona id e saidaDiaSeguinte a cada linha', () => {
    const raw = JSON.stringify({
      linhas: [{ nome: 'Pedro', dia: 'QUINTA', entrada: '08:00', saida: '17:00', intervalo: null }],
    });
    const result = parseVisionResponse(raw);
    assert.ok(result.linhas[0].id.startsWith('img_'));
    assert.strictEqual(result.linhas[0].saidaDiaSeguinte, false);
  });

  it('detecta saidaDiaSeguinte quando saida < entrada', () => {
    const raw = JSON.stringify({
      linhas: [{ nome: 'Carlos', dia: 'SEXTA', entrada: '22:00', saida: '06:00', intervalo: null }],
    });
    const result = parseVisionResponse(raw);
    assert.strictEqual(result.linhas[0].saidaDiaSeguinte, true);
  });

  it('usa fallback de busca de chaves quando JSON tem texto ao redor', () => {
    const raw = 'Aqui está o resultado: {"linhas":[{"nome":"Luisa","dia":"SABADO","entrada":"09:00","saida":"18:00","intervalo":null}]}';
    const result = parseVisionResponse(raw);
    assert.strictEqual(result.linhas[0].nome, 'Luisa');
  });

  it('retorna linhas vazias se campo linhas ausente', () => {
    const raw = JSON.stringify({ outros: [] });
    const result = parseVisionResponse(raw);
    assert.deepStrictEqual(result.linhas, []);
  });

  it('lança erro para JSON completamente inválido', () => {
    assert.throws(() => {
      parseVisionResponse('isso não é json');
    }, /JSON inválido/);
  });

  it('normaliza saida e entrada ausentes para string vazia', () => {
    const raw = JSON.stringify({
      linhas: [{ nome: 'Ana', dia: 'DOMINGO', entrada: null, saida: null, intervalo: null }],
    });
    const result = parseVisionResponse(raw);
    assert.strictEqual(result.linhas[0].entrada, '');
    assert.strictEqual(result.linhas[0].saida, '');
  });
});
```

- [ ] **Step 1.2: Rodar os testes e confirmar que falham**

```bash
node --test src/__tests__/visionParser.test.js
```

Esperado: falhas em vários testes (API ainda usa `funcionarios`).

- [ ] **Step 1.3: Reescrever `src/lib/visionParser.js`**

Substitua o conteúdo completo por:

```js
/**
 * visionParser.js
 * Parser de imagem de escala via Claude Vision API.
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
 * Processa imagem de escala via Claude Vision API.
 * @param {File} imageFile
 * @param {string} apiKey
 * @returns {Promise<{ linhas: Array }>}
 */
export async function processScheduleImage(imageFile, apiKey) {
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
      max_tokens: 4096,
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
              text: buildVisionPrompt(),
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
```

- [ ] **Step 1.4: Rodar testes e confirmar que passam**

```bash
node --test src/__tests__/visionParser.test.js
```

Esperado: todos os testes passando (`✓`).

- [ ] **Step 1.5: Rodar suite completa para garantir sem regressões**

```bash
node --test src/__tests__/parsers.test.js src/__tests__/staffUtils.test.js src/__tests__/thermalBalance_v5.test.js src/__tests__/staffPerformance.test.js src/__tests__/visionParser.test.js
```

Esperado: todos passando.

- [ ] **Step 1.6: Commit**

```bash
git add src/lib/visionParser.js src/__tests__/visionParser.test.js
git commit -m "feat(vision): reescrever visionParser para extrair funcionário×dia com formato linhas"
```

---

## Task 2: Criar `UnifiedEscalaUploader.jsx`

**Files:**
- Create: `src/components/upload/UnifiedEscalaUploader.jsx`

> Nenhum teste unitário para o componente React — comportamento é verificado manualmente via app. A lógica de normalização já está coberta pelos testes do `visionParser`.

- [ ] **Step 2.1: Criar o componente**

Crie `src/components/upload/UnifiedEscalaUploader.jsx` com o conteúdo:

```jsx
import React, { useRef, useState } from 'react';
import { Upload, Camera, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * UnifiedEscalaUploader
 * Área de upload única para escala: aceita .xlsx/.xls e imagens.
 * - Excel  → processFile(file, 'escala')  [pipeline existente do hook]
 * - Imagem → processScheduleImage(file, apiKey) → onEscalaProcessed(linhas, selectedDay)
 */
const UnifiedEscalaUploader = ({
  processFile,
  onEscalaProcessed,
  selectedDay,
  dragActive,
  setDragActive,
  error,
}) => {
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [fileType, setFileType] = useState(null); // 'excel' | 'image' | null
  const fileInputRef = useRef(null);

  const detectType = (file) => {
    if (!file) return null;
    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel';
    if (file.type.startsWith('image/')) return 'image';
    return null;
  };

  const handleFile = async (file) => {
    if (!file) return;
    const type = detectType(file);
    if (!type) {
      setErrorMessage('Formato não suportado. Use .xlsx, .xls ou uma imagem.');
      setStatus('error');
      return;
    }

    setFileType(type);
    setStatus('loading');
    setErrorMessage('');

    try {
      if (type === 'excel') {
        // processFile já chama onEscalaProcessed internamente via o hook
        await processFile(file, 'escala');
        setStatus('success');
      } else {
        const key = localStorage.getItem('anthropic_api_key') || apiKey;
        if (!key) {
          throw new Error('API Key da Anthropic não encontrada. Configure no campo abaixo.');
        }
        const { processScheduleImage } = await import('../../lib/visionParser');
        const result = await processScheduleImage(file, key);
        onEscalaProcessed(result.linhas, selectedDay);
        setStatus('success');
      }
    } catch (err) {
      console.error('Erro ao processar escala:', err);
      setErrorMessage(err.message || 'Erro ao processar arquivo');
      setStatus('error');
    }
  };

  const handleApiKeySave = (value) => {
    setApiKey(value);
    localStorage.setItem('anthropic_api_key', value);
  };

  const isLoading = status === 'loading';
  const icon = fileType === 'image'
    ? <Camera className="w-6 h-6 text-gray-500 mb-3 transition-colors group-hover:text-[#E30613]" />
    : <Upload className="w-6 h-6 text-gray-500 mb-3 transition-colors group-hover:text-[#E30613]" />;

  return (
    <div className="flex flex-col h-[300px] bg-[#121620]/60 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-xl overflow-hidden hover:border-white/10 transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 mb-2">
        <h3 className="text-sm font-bold text-white tracking-widest uppercase">Escala</h3>
        <div className="flex items-center gap-2">
          {fileType === 'excel' && (
            <span className="text-[10px] font-bold text-[#E30613] bg-[#E30613]/10 border border-[#E30613]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">XLSX</span>
          )}
          {fileType === 'image' && (
            <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">IMG</span>
          )}
          {!fileType && (
            <span className="text-[10px] font-bold text-[#E30613] bg-[#E30613]/10 border border-[#E30613]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Atual</span>
          )}
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 flex flex-col gap-2">
        {/* Área de drop */}
        <div
          className={`flex-1 border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
            dragActive
              ? 'bg-[#E30613]/5 border-[#E30613]'
              : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
          }`}
          onDragEnter={() => setDragActive((prev) => ({ ...prev, escala: true }))}
          onDragLeave={() => setDragActive((prev) => ({ ...prev, escala: false }))}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive((prev) => ({ ...prev, escala: false }));
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin mb-2" />
          ) : status === 'success' ? (
            <CheckCircle className="w-6 h-6 text-green-400 mb-2" />
          ) : status === 'error' ? (
            <AlertCircle className="w-6 h-6 text-red-400 mb-2" />
          ) : (
            icon
          )}
          <p className="text-xs text-gray-400 font-medium">
            {isLoading ? 'Processando...' : 'Arraste ou clique'}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">.xlsx, .xls ou imagem</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,image/*"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
        />

        {/* API Key (colapsada por padrão, só relevante para imagens) */}
        <button
          type="button"
          onClick={() => setShowApiKey((v) => !v)}
          className="text-[10px] text-gray-500 hover:text-gray-300 text-left transition-colors"
        >
          {showApiKey ? '▲ Ocultar chave API' : '▼ Configurar chave API'}
        </button>
        {showApiKey && (
          <input
            type="password"
            value={apiKey}
            onChange={(e) => handleApiKeySave(e.target.value)}
            placeholder="API Key Anthropic"
            className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#E30613]/50"
          />
        )}

        {/* Erro */}
        {(status === 'error') && (errorMessage || error) && (
          <p className="text-[10px] text-red-400 text-center">
            {errorMessage || error}
          </p>
        )}
      </div>
    </div>
  );
};

export default UnifiedEscalaUploader;
```

- [ ] **Step 2.2: Commit**

```bash
git add src/components/upload/UnifiedEscalaUploader.jsx
git commit -m "feat(upload): criar UnifiedEscalaUploader com suporte a Excel e imagem"
```

---

## Task 3: Atualizar `UploadSection.jsx`

**Files:**
- Modify: `src/components/upload/UploadSection.jsx`

- [ ] **Step 3.1: Substituir o conteúdo de `UploadSection.jsx`**

Substitua o conteúdo completo de `src/components/upload/UploadSection.jsx` por:

```jsx
import React from 'react';
import UploadBox from './UploadBox';
import UnifiedEscalaUploader from './UnifiedEscalaUploader';

export const UploadSection = ({
  handleFileUpload,
  handleDrag,
  handleDrop,
  dragActive,
  setDragActive,
  cuponsData,
  salesData,
  error,
  onEscalaProcessed,
  processFile,
  selectedDay,
}) => (
  <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 h-full items-center max-w-7xl mx-auto w-full">
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

    <UnifiedEscalaUploader
      processFile={processFile}
      onEscalaProcessed={onEscalaProcessed}
      selectedDay={selectedDay}
      dragActive={dragActive.escala}
      setDragActive={setDragActive}
      error={error.escala}
    />

    <UploadBox
      type="vendas"
      title="Venda/Hora (Opcional)"
      onUpload={handleFileUpload}
      onDrag={handleDrag}
      onDrop={handleDrop}
      dragActiveState={dragActive.vendas}
      data={salesData || []}
      errorState={error.vendas}
    />

    {/* 4ª coluna vazia — reservada para futura expansão */}
    <div />
  </section>
);

export default UploadSection;
```

- [ ] **Step 3.2: Commit**

```bash
git add src/components/upload/UploadSection.jsx
git commit -m "refactor(upload): substituir inline Escala box + ImageUploader por UnifiedEscalaUploader"
```

---

## Task 4: Atualizar `Dashboard.jsx` para passar as novas props

**Files:**
- Modify: `src/features/dashboard/Dashboard.jsx`

> `Dashboard.jsx` tem **duas** chamadas de `<UploadSection>` — ambas precisam de `processFile` e `selectedDay`.

- [ ] **Step 4.1: Adicionar `processFile` à desestruturação do hook em `Dashboard.jsx`**

Localize a desestruturação de `useFileProcessing` (em torno da linha 98) e adicione `processFile`:

```js
// De:
const {
  dragActive, setDragActive, cuponsData, salesData,
  loading, error, handleFileUpload, handleDrag, handleDrop,
} = useFileProcessing(selectedDay, handleEscalaProcessed);

// Para:
const {
  dragActive, setDragActive, cuponsData, salesData,
  loading, error, processFile, handleFileUpload, handleDrag, handleDrop,
} = useFileProcessing(selectedDay, handleEscalaProcessed);
```

> `processFile` já está no retorno do hook (`src/hooks/useFileProcessing.js`, linha 103) — apenas não estava sendo desestruturado.

- [ ] **Step 4.2: Adicionar `processFile` e `selectedDay` nas duas chamadas de `<UploadSection>`**

No `Dashboard.jsx`, localize a primeira chamada (em torno da linha 179):

```jsx
<UploadSection
  handleFileUpload={handleFileUpload}
  handleDrag={handleDrag}
  handleDrop={handleDrop}
  dragActive={dragActive}
  setDragActive={setDragActive}
  cuponsData={cuponsData}
  salesData={salesData}
  error={error}
  onEscalaProcessed={handleEscalaProcessed}
/>
```

Adicione `processFile` e `selectedDay`:

```jsx
<UploadSection
  handleFileUpload={handleFileUpload}
  handleDrag={handleDrag}
  handleDrop={handleDrop}
  dragActive={dragActive}
  setDragActive={setDragActive}
  cuponsData={cuponsData}
  salesData={salesData}
  error={error}
  onEscalaProcessed={handleEscalaProcessed}
  processFile={processFile}
  selectedDay={selectedDay}
/>
```

Repita o mesmo para a segunda chamada (em torno da linha 229):

```jsx
<UploadSection
  handleFileUpload={handleFileUpload}
  handleDrag={handleDrag}
  handleDrop={handleDrop}
  dragActive={dragActive}
  setDragActive={setDragActive}
  cuponsData={cuponsData}
  salesData={salesData}
  error={error}
  onEscalaProcessed={handleEscalaProcessed}
  processFile={processFile}
  selectedDay={selectedDay}
/>
```

> `processFile` já está no retorno de `useFileProcessing` (linha 98 do Dashboard). `selectedDay` já existe como state (linha 25).

- [ ] **Step 4.3: Confirmar que o app compila sem erros**

```bash
npm run build
```

Esperado: build sem erros.

- [ ] **Step 4.4: Commit**

```bash
git add src/features/dashboard/Dashboard.jsx
git commit -m "fix(dashboard): passar processFile e selectedDay para UploadSection"
```

---

## Task 5: Deletar `ImageUploader.jsx`

**Files:**
- Delete: `src/components/upload/ImageUploader.jsx`

- [ ] **Step 5.1: Confirmar que não há referências ao arquivo**

```bash
grep -r "ImageUploader" src/
```

Esperado: zero resultados (a Task 3 já removeu o import de `UploadSection.jsx`).

- [ ] **Step 5.2: Deletar o arquivo**

```bash
git rm src/components/upload/ImageUploader.jsx
```

- [ ] **Step 5.3: Rodar testes para confirmar sem regressões**

```bash
node --test src/__tests__/parsers.test.js src/__tests__/staffUtils.test.js src/__tests__/thermalBalance_v5.test.js src/__tests__/staffPerformance.test.js src/__tests__/visionParser.test.js
```

Esperado: todos passando.

- [ ] **Step 5.4: Commit**

```bash
git commit -m "chore: remover ImageUploader.jsx substituído por UnifiedEscalaUploader"
```

---

## Verificação Final

- [ ] `npm run dev` sobe sem erros no console
- [ ] Upload de `.xlsx` de escala funciona como antes (linhas aparecem na tabela de staff)
- [ ] Upload de imagem com API key válida extrai funcionários com `dia` preenchido
- [ ] Campo de API key persiste após recarregar a página (localStorage)
- [ ] `grep -r "ImageUploader" src/` retorna zero resultados
