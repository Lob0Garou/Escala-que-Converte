import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildVisionPrompt, parseVisionResponse } from '../lib/visionParser.js';

describe('buildVisionPrompt', () => {
  it('retorna string com regras de extração', () => {
    const prompt = buildVisionPrompt();
    assert.ok(typeof prompt === 'string');
    assert.ok(prompt.includes('SEGUNDA'));
    assert.ok(prompt.includes('SABADO'));
    assert.ok(prompt.includes('FOLGA'));
    assert.ok(prompt.includes('HH:MM'));
    assert.ok(prompt.length > 200);
  });
});

describe('parseVisionResponse', () => {
  it('parseia array JSON com campos DIA/ATLETA/ENTRADA/INTER/SAIDA', () => {
    const raw = JSON.stringify([
      { DIA: 'SEGUNDA', ATLETA: 'Ana', ENTRADA: '09:00', INTER: '12:00', SAIDA: '18:00' },
    ]);
    const result = parseVisionResponse(raw);
    assert.strictEqual(result.linhas.length, 1);
    assert.strictEqual(result.linhas[0].dia, 'SEGUNDA');
    assert.strictEqual(result.linhas[0].nome, 'Ana');
    assert.strictEqual(result.linhas[0].entrada, '09:00');
    assert.strictEqual(result.linhas[0].intervalo, '12:00');
    assert.strictEqual(result.linhas[0].saida, '18:00');
  });

  it('converte FOLGA para campos de horário vazios', () => {
    const raw = JSON.stringify([
      { DIA: 'SABADO', ATLETA: 'João', ENTRADA: 'FOLGA', INTER: '', SAIDA: '' },
    ]);
    const result = parseVisionResponse(raw);
    assert.strictEqual(result.linhas[0].entrada, '');
    assert.strictEqual(result.linhas[0].saida, '');
  });

  it('adiciona id com prefixo img_ e saidaDiaSeguinte a cada linha', () => {
    const raw = JSON.stringify([
      { DIA: 'TERCA', ATLETA: 'Pedro', ENTRADA: '08:00', INTER: '', SAIDA: '17:00' },
    ]);
    const result = parseVisionResponse(raw);
    assert.ok(result.linhas[0].id.startsWith('img_'));
    assert.strictEqual(result.linhas[0].saidaDiaSeguinte, false);
  });

  it('detecta saidaDiaSeguinte quando saida < entrada', () => {
    const raw = JSON.stringify([
      { DIA: 'SEXTA', ATLETA: 'Carlos', ENTRADA: '22:00', INTER: '', SAIDA: '06:00' },
    ]);
    const result = parseVisionResponse(raw);
    assert.strictEqual(result.linhas[0].saidaDiaSeguinte, true);
  });

  it('normaliza DIA para maiúsculo', () => {
    const raw = JSON.stringify([
      { DIA: 'segunda', ATLETA: 'Maria', ENTRADA: '10:00', INTER: '', SAIDA: '19:00' },
    ]);
    const result = parseVisionResponse(raw);
    assert.strictEqual(result.linhas[0].dia, 'SEGUNDA');
  });

  it('usa fallback de busca de colchetes quando há texto ao redor', () => {
    const raw = 'Resultado: [{"DIA":"QUARTA","ATLETA":"Luisa","ENTRADA":"09:00","INTER":"","SAIDA":"18:00"}]';
    const result = parseVisionResponse(raw);
    assert.strictEqual(result.linhas[0].nome, 'Luisa');
  });

  it('retorna linhas vazias para array vazio', () => {
    const result = parseVisionResponse('[]');
    assert.deepStrictEqual(result.linhas, []);
  });

  it('lança erro para JSON completamente inválido', () => {
    assert.throws(() => {
      parseVisionResponse('isso não é json');
    }, /JSON inválido/);
  });
});
