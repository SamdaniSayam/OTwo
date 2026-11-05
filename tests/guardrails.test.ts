import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  containsWord,
  evaluateGuardrails,
  MANDATORY_DISCLAIMER,
  toSearchText,
} from '../src/services/ai/guardrails';
import { generateOnDeviceResponse } from '../src/services/ai/onDeviceEngine';

function assertEmergency(message: string) {
  const result = evaluateGuardrails(message);
  assert.equal(result.isEmergency, true, `expected emergency for: ${message}`);
  assert.equal(result.category, 'emergency', `expected emergency category for: ${message}`);
  assert.ok(result.forcedResponse, `expected forced response for: ${message}`);
}

test('detects respiratory emergencies with straight and curly apostrophes', () => {
  assertEmergency("I can't breathe");
  assertEmergency('I can’t breathe');
  assertEmergency('I cant breathe');
  assertEmergency('I cannot breathe');
  assertEmergency('I am unable to breathe');
  assertEmergency('I am struggling to breathe');
  assertEmergency('I cannot catch my breath');
});

test('detects blue lips, asthma attack, and rescue inhaler failure', () => {
  assertEmergency('My lips are blue');
  assertEmergency('my blue lips are getting worse');
  assertEmergency('I am having an asthma attack');
  assertEmergency("my inhaler isn't working");
  assertEmergency('my rescue inhaler did not work');
  assertEmergency('my rescue inhaler did not help');
  assertEmergency('I have chest tightness');
  assertEmergency('I am wheezing badly');
  assertEmergency('I cannot speak');
});

test('detects additional acute warning signs and urgent-care questions', () => {
  assertEmergency('It hurts to breathe');
  assertEmergency('I am choking');
  assertEmergency('My throat is closing');
  assertEmergency('I think this is anaphylaxis');
  assertEmergency('I am passing out');
  assertEmergency('I missed my dose and cannot get air');
  assertEmergency('Should I call an ambulance?');
  assertEmergency('Do I need to go to the hospital?');
});

test('detects self-harm crisis before respiratory rules', () => {
  const result = evaluateGuardrails('I want to kill myself');
  assert.equal(result.isEmergency, true);
  assert.equal(result.isCrisis, true);
  assert.equal(result.category, 'crisis');
  assert.match(result.forcedResponse || '', /988/);

  const curly = evaluateGuardrails('I don’t want to live');
  assert.equal(curly.isCrisis, true);

  assert.equal(evaluateGuardrails('I do not want to be here anymore').isCrisis, true);
  assert.equal(evaluateGuardrails('I took too many pills').isCrisis, true);
});

test('refuses prescription, dosage, and diagnosis requests', () => {
  for (const message of [
    'Should I stop my inhaler?',
    'Can I take an extra puff?',
    'What dosage of prednisone should I take?',
    'Please diagnose me',
    'Do I have pneumonia?',
    'Can you prescribe something?',
    'I missed my dose',
    'I ran out of my inhaler',
    'Is my inhaler working?',
    'Can I skip my controller today?',
  ]) {
    const result = evaluateGuardrails(message);
    assert.equal(result.isMedicalQuery, true, message);
    assert.equal(result.isEmergency, false, message);
    assert.equal(result.category, 'medical', message);
  }
});

test('does not treat "eat" as a substring of "breathe"', () => {
  assert.equal(containsWord('i like to breathe', 'eat'), false);
  assert.equal(containsWord('i want to eat better', 'eat'), true);

  const breathing = generateOnDeviceResponse('My breathing feels fine today');
  assert.doesNotMatch(breathing.reply, /Adequate hydration/);

  const eating = generateOnDeviceResponse('I want to eat better');
  assert.match(eating.reply, /Adequate hydration/);
});

test('normalizes curly punctuation before matching', () => {
  assert.equal(toSearchText('I can’t breathe'), 'i can t breathe');
  assert.equal(toSearchText('“blue lips”'), 'blue lips');
  assert.equal(evaluateGuardrails('I can’t breathe').isEmergency, true);
});

test('every companion response carries the disclaimer exactly once', () => {
  for (const message of [
    "I can't breathe",
    'I want to kill myself',
    'Should I stop my inhaler?',
    'hello',
    'I want to eat better',
    'My breathing feels fine today',
  ]) {
    const { reply } = generateOnDeviceResponse(message);
    const occurrences = reply.split(MANDATORY_DISCLAIMER).length - 1;
    assert.equal(occurrences, 1, `disclaimer count for: ${message}`);
  }
});

test('crisis and emergency responses are flagged for the safety modal', () => {
  const crisis = generateOnDeviceResponse('I want to end my life');
  assert.equal(crisis.isEmergency, true);
  assert.equal(crisis.isCrisis, true);

  const emergency = generateOnDeviceResponse("I can't breathe");
  assert.equal(emergency.isEmergency, true);
  assert.equal(emergency.isCrisis, false);
});
