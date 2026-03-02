import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateStaffByHour } from '../lib/staffUtils.js';

test('calculateStaffByHour counts normal shift and excludes interval hour', () => {
  const result = calculateStaffByHour(
    [{ entrada: '10:00', saida: '18:00', intervalo: '14:00' }],
    10,
    18,
  );

  assert.equal(result[10], 1);
  assert.equal(result[13], 1);
  assert.equal(result[14], 0);
  assert.equal(result[17], 1);
  assert.equal(result[18], 0);
});

test('calculateStaffByHour handles overnight shift', () => {
  const result = calculateStaffByHour(
    [{ entrada: '22:00', saida: '06:00', intervalo: '02:00' }],
    0,
    23,
  );

  assert.equal(result[22], 1);
  assert.equal(result[23], 1);
  assert.equal(result[0], 1);
  assert.equal(result[1], 1);
  assert.equal(result[2], 0);
  assert.equal(result[3], 1);
  assert.equal(result[5], 1);
});

test('calculateStaffByHour handles shift without interval', () => {
  const result = calculateStaffByHour(
    [{ ENTRADA: '09:00', SAIDA: '12:00', INTER: '' }],
    9,
    12,
  );

  assert.equal(result[9], 1);
  assert.equal(result[10], 1);
  assert.equal(result[11], 1);
  assert.equal(result[12], 0);
});

test('calculateStaffByHour handles empty array', () => {
  const result = calculateStaffByHour([], 10, 18);
  assert.deepEqual(result, {});
});
