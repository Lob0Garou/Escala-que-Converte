# Spec: Upload Unificado de Escala (Excel + Imagem)

**Data:** 2026-03-24
**Status:** Aprovado

## Problema

O dashboard possui dois componentes separados para upload de escala:
- Um box inline em `UploadSection.jsx` que aceita apenas `.xlsx`
- Um `ImageUploader.jsx` separado que usa Claude Vision API

O `visionParser.js` está quebrado: prompt com caracteres inválidos, sem extração de `dia`, saída incompatível com o formato interno da ferramenta (`{id, dia, nome, entrada, intervalo, saida, saidaDiaSeguinte}`).

## Objetivo

Uma única área de upload de escala que aceite tanto arquivos Excel quanto imagens, produzindo o mesmo formato de saída em ambos os casos.

## Formato interno esperado (contrato)

Cada linha de escala processada deve ter:
```js
{
  id: string,           // identificador único
  dia: string,          // "SEGUNDA" | "TERCA" | "QUARTA" | "QUINTA" | "SEXTA" | "SABADO" | "DOMINGO"
  nome: string,         // nome do funcionário
  entrada: string,      // "HH:MM"
  saida: string,        // "HH:MM"
  intervalo: string,    // "HH:MM" ou ""
  saidaDiaSeguinte: boolean
}
```

## Arquivos e Ações

| Arquivo | Ação |
|---|---|
| `src/lib/visionParser.js` | Reescrita completa |
| `src/components/upload/UnifiedEscalaUploader.jsx` | Criado |
| `src/components/upload/UploadSection.jsx` | Remove box inline e ImageUploader, usa UnifiedEscalaUploader |
| `src/components/upload/ImageUploader.jsx` | Deletado |

## 1. `visionParser.js` — Reescrita

### `buildVisionPrompt()`

Retorna prompt com instruções:
- Extrair uma entrada por combinação funcionário × dia
- Mapear variações de nome de dia para: `SEGUNDA`, `TERCA`, `QUARTA`, `QUINTA`, `SEXTA`, `SABADO`, `DOMINGO`
- Ignorar dias marcados como FOLGA ou sem horário
- Não confundir horário de almoço/intervalo com saída — horário de intervalo vai no campo `intervalo`
- Funcionar para qualquer layout visual (tabela, lista, foto de quadro, planilha impressa)
- Responder APENAS com JSON válido, sem markdown

Formato de saída esperado da API:
```json
{
  "linhas": [
    { "nome": "João", "dia": "SEGUNDA", "entrada": "09:00", "saida": "18:00", "intervalo": "12:00" },
    { "nome": "Maria", "dia": "SEGUNDA", "entrada": "13:00", "saida": "22:00", "intervalo": null }
  ]
}
```

### `parseVisionResponse(text)`

Responsável pela normalização completa. O componente `UnifiedEscalaUploader` não normaliza — apenas repassa o resultado.

1. Remove bloco markdown se presente
2. Faz `JSON.parse`; fallback com busca de `{...}`
3. Valida presença de `linhas` (array)
4. Para cada linha, retorna objeto normalizado:
   - `id: img_${Date.now()}_${index}` — prefixo `img_` diferencia de linhas Excel (`upload-`), evitando colisões práticas; `crypto.randomUUID()` é alternativa mais robusta mas `Date.now()_index` é suficiente para o uso atual
   - `dia`: string uppercase da linha
   - `nome`: string da linha
   - `entrada`: string ou `""`
   - `saida`: string ou `""`
   - `intervalo`: string ou `""` (null → `""`)
   - `saidaDiaSeguinte`: detectado comparando hora de entrada e saída (saída < entrada → true)
5. Retorna `{ linhas: [...] }` onde cada linha já está no formato interno completo

### `processScheduleImage(imageFile, apiKey)`

Mantém chamada à API Anthropic com modelo `claude-3-5-sonnet-20241022`.
**Alteração:** `max_tokens` aumentado de `1024` para `4096` para suportar escalas com muitos funcionários (15+ funcionários × 7 dias facilmente excede 1024 tokens).
**Retorno:** `{ linhas: [...] }` — chave `linhas` (não `funcionarios` como no código atual), onde cada elemento já está normalizado no formato interno completo. O componente acessa `result.linhas` diretamente.

## 2. `UnifiedEscalaUploader.jsx` — Componente novo

### Props
```ts
{
  processFile: (file, type) => Promise<void>,          // do useFileProcessing, para Excel
  onEscalaProcessed: (rows, selectedDay?) => void,     // callback final
  selectedDay: string,                                  // dia selecionado, repassado no caminho imagem
  dragActive: boolean,
  setDragActive: (updater: (prev: object) => object) => void,  // setState do hook; chamar como setDragActive(prev => ({ ...prev, escala: true/false })) para não destruir estados dos outros boxes
  error: string | null
}
```

### Estado interno
- `status`: `'idle' | 'loading' | 'success' | 'error'`
- `errorMessage`: string
- `apiKey`: string (lido/salvo em localStorage `anthropic_api_key`)
- `showApiKey`: boolean (campo colapsado por padrão)
- `fileType`: `'excel' | 'image' | null` (detectado ao selecionar arquivo)

### Comportamento

**Detecção de tipo:**
- `.xlsx`, `.xls` → `'excel'`
- `image/*` → `'image'`

**Caminho Excel:**
```
file → processFile(file, 'escala')
```
`processFile` já chama `onEscalaProcessed(rows, selectedDay)` internamente via o hook.
O componente **não** chama `onEscalaProcessed` diretamente neste caminho — apenas gerencia estado de loading/success/error local.

**Caminho Imagem:**

```text
file → processScheduleImage(file, apiKey)
     → result.linhas  (já normalizadas por parseVisionResponse)
     → onEscalaProcessed(result.linhas, selectedDay)
```

**UI:**

- Área de drop com ícone `Upload` (padrão) ou `Camera` (quando imagem detectada)
- Badge dinâmico: "XLSX" (vermelho) ou "IMG" (azul) após seleção
- Link "Configurar chave API" que expande campo `type="password"`
- Estados visuais: spinner em loading, check verde em success, alerta vermelho em error
- Texto de erro abaixo da área
- Aceita: `accept=".xlsx,.xls,image/*"`

## 3. `UploadSection.jsx` — Atualização

Remove:
- Box inline de Escala (div com drag-and-drop + label + input)
- `import ImageUploader` e `<ImageUploader>`

Adiciona:
- `import UnifiedEscalaUploader`
- Passa `selectedDay` como prop (precisa ser adicionado à assinatura de `UploadSection`)

```jsx
<UnifiedEscalaUploader
  processFile={processFile}
  onEscalaProcessed={onEscalaProcessed}
  selectedDay={selectedDay}
  dragActive={dragActive.escala}
  setDragActive={setDragActive}
  error={error.escala}
/>
```

`processFile` já está exposto no retorno de `useFileProcessing`.
`selectedDay` é novo na interface de `UploadSection` — precisa ser passado pelo componente pai (Dashboard).

## 4. `ImageUploader.jsx` — Deletado

Componente substituído integralmente por `UnifiedEscalaUploader.jsx`.

## Fora do Escopo

- Gerenciamento global de API key
- Upload de múltiplas imagens simultaneamente
- Validação semântica do conteúdo extraído
- Preview da imagem após upload

## Critérios de Sucesso

1. Upload de `.xlsx` funciona exatamente como antes
2. Upload de imagem extrai todas as combinações funcionário × dia da semana
3. Ambos os caminhos produzem linhas no formato interno esperado e chamam `onEscalaProcessed(rows, selectedDay)`
4. Campo de API key persiste via localStorage
5. `ImageUploader.jsx` removido sem referências órfãs
6. `max_tokens` em `processScheduleImage` é `4096`
