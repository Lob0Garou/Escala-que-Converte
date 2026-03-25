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
