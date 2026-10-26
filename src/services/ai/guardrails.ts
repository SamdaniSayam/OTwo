/**
 * Hard Guardrails for On-Device AI Assistant
 * Compulsory safety filters: Emergency triggers & medical advice blocking.
 */

export const EMERGENCY_KEYWORDS = [
  "can't breathe",
  'cant breathe',
  'struggling to breathe',
  'gasping',
  'lips blue',
  'blue lips',
  'blue fingernails',
  'chest crushing',
  'crushing chest pain',
  'cannot speak',
  'inhaler not working',
  'rescue inhaler failed',
  'emergency',
  'suffocating',
  'strangling',
];

export const FORBIDDEN_MEDICAL_KEYWORDS = [
  'diagnose me',
  'do i have pneumonia',
  'do i have bronchitis',
  'should i stop my medicine',
  'should i stop taking',
  'increase my dose',
  'double my dose',
  'skip my inhaler',
  'is this an attack',
  'prescribe',
  'cure asthma',
  'prednisone dose',
  'steroid dose',
];

export interface GuardrailCheckResult {
  isEmergency: boolean;
  isMedicalQuery: boolean;
  forcedResponse?: string;
}

export function evaluateGuardrails(userMessage: string): GuardrailCheckResult {
  const normalized = userMessage.toLowerCase().trim();

  // 1. Critical Emergency Check
  const hasEmergency = EMERGENCY_KEYWORDS.some((kw) => normalized.includes(kw));
  if (hasEmergency) {
    return {
      isEmergency: true,
      isMedicalQuery: true,
      forcedResponse:
        '🚨 EMERGENCY ALERT: You may be experiencing severe respiratory distress. Please call 911 (or your local emergency services) or go to the nearest emergency room immediately. Do not rely on this app.',
    };
  }

  // 2. Prescription / Medical Advice Check
  const hasMedical = FORBIDDEN_MEDICAL_KEYWORDS.some((kw) => normalized.includes(kw));
  if (hasMedical) {
    return {
      isEmergency: false,
      isMedicalQuery: true,
      forcedResponse:
        'This is not medical advice. I am your lifestyle companion and cannot interpret prescriptions, alter dosages, or diagnose symptoms. Please follow your doctor’s guidance and contact your physician for any medical questions.',
    };
  }

  return {
    isEmergency: false,
    isMedicalQuery: false,
  };
}
