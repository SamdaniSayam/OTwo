import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  emergencyDialUrl,
  getDefaultEmergencyNumber,
  isEmergencyNumberValid,
  normalizeEmergencyNumber,
} from '../src/utils/emergencyNumbers';

test('validates emergency phone numbers', () => {
  assert.equal(isEmergencyNumberValid('911'), true);
  assert.equal(isEmergencyNumberValid('112'), true);
  assert.equal(isEmergencyNumberValid('+1 911-555-0100'), true);
  assert.equal(isEmergencyNumberValid(''), false);
  assert.equal(isEmergencyNumberValid('abc'), false);
  assert.equal(isEmergencyNumberValid('+'), false);
});

test('normalizes numbers for the dialer', () => {
  assert.equal(normalizeEmergencyNumber('+1 (911) 555-0100'), '+19115550100');
  assert.equal(normalizeEmergencyNumber(' 999 '), '999');
  assert.equal(emergencyDialUrl('911'), 'tel:911');
});

test('provides a numeric locale-aware default', () => {
  assert.match(getDefaultEmergencyNumber(), /^\d{2,6}$/);
});
