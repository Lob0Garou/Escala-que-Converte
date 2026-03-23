import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildVisionPrompt, parseVisionResponse } from '../lib/visionParser.js';

describe('visionParser', () => {

  describe('buildVisionPrompt', () => {
    it('returns a prompt string with XML tags', () => {
      const prompt = buildVisionPrompt();
      assert.ok(typeof prompt === 'string');
      assert.ok(prompt.includes('<image>'));
      assert.ok(prompt.includes('</image>'));
      assert.ok(prompt.includes('REGRAS_PARA_EXTRAO'));
      assert.ok(prompt.includes('FORMATO_SAIDA'));
    });
  });

  describe('parseVisionResponse', () => {
    it('extracts JSON from markdown code block', () => {
      const raw = '```json\n{"funcionarios": []}\n```';
      const result = parseVisionResponse(raw);
      assert.deepStrictEqual(result, { funcionarios: [] });
    });

    it('extracts JSON from response without code block', () => {
      const raw = '{"funcionarios": [{"nome": "Ana"}]}';
      const result = parseVisionResponse(raw);
      assert.strictEqual(result.funcionarios[0].nome, 'Ana');
      assert.ok(result.funcionarios[0].id);
      assert.strictEqual(result.funcionarios[0].saidaDiaSeguinte, false);
    });

    it('adds id and saidaDiaSeguinte to each entry', () => {
      const raw = '{"funcionarios": [{"nome": "Ana", "entrada": "08:00", "saida": "18:00"}]}';
      const result = parseVisionResponse(raw);
      assert.ok(result.funcionarios[0].id);
      assert.ok('saidaDiaSeguinte' in result.funcionarios[0]);
    });

    it('detects saída no dia seguinte when saida < entrada', () => {
      const raw = '{"funcionarios": [{"nome": "Ana", "entrada": "22:00", "saida": "06:00"}]}';
      const result = parseVisionResponse(raw);
      assert.strictEqual(result.funcionarios[0].saidaDiaSeguinte, true);
    });

    it('throws error for invalid JSON', () => {
      assert.throws(() => {
        parseVisionResponse('não é json válido');
      }, /JSON inválido/);
    });
  });

});
