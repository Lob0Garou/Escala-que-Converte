import test from 'node:test';
import assert from 'node:assert/strict';

import {
  excelTimeToString,
  parseNumber,
  findAndParseConversion,
  parseFluxValue,
} from '../lib/parsers.js';

test('excelTimeToString handles excel serial number', () => {
  assert.equal(excelTimeToString(0.5), '12:00');
});

test('excelTimeToString handles HH:MM string', () => {
  assert.equal(excelTimeToString('09:30'), '09:30');
});

test('excelTimeToString handles Date object', () => {
  const value = new Date(2026, 0, 1, 9, 30, 0, 0);
  assert.equal(excelTimeToString(value), '09:30');
});

test('excelTimeToString handles FOLGA and null', () => {
  assert.equal(excelTimeToString('FOLGA'), null);
  assert.equal(excelTimeToString(null), null);
});

test('parseNumber parses brazilian decimal format and fallbacks', () => {
  assert.equal(parseNumber('1.000,50'), 1000.5);
  assert.equal(parseNumber('500'), 500);
  assert.equal(parseNumber(0), 0);
  assert.equal(parseNumber(null), 0);
  assert.equal(parseNumber('abc'), 0);
});

test('findAndParseConversion parses string percentage and decimals', () => {
  assert.equal(findAndParseConversion({ '% Conversão': '13,4%' }), 13.4);
  assert.equal(findAndParseConversion({ '% Conversão': 0.134 }), 13.4);
  assert.equal(findAndParseConversion({ '% Conversão': 13.4 }), 13.4);
  assert.equal(findAndParseConversion({ '% Conversão': null }), 0);
  assert.equal(findAndParseConversion({ '% Conversão': '' }), 0);
});

test('parseFluxValue parses percent-like and grouped numbers', () => {
  assert.equal(parseFluxValue('500.0%'), 500);
  assert.equal(parseFluxValue('1.200'), 1200);
  assert.equal(parseFluxValue(0), 0);
});
