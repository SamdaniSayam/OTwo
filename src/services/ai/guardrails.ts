/**
 * Hard guardrails for the on-device lifestyle companion.
 *
 * The rules are intentionally deterministic and safety-first. All matching is
 * done against a Unicode-normalized, punctuation-free form of the message so
 * curly quotes, accents, hyphenation, and extra whitespace cannot bypass a
 * pattern. Matching uses token boundaries, never raw substring checks.
 */
import { getDefaultEmergencyNumber } from '../../utils/emergencyNumbers';

export type GuardrailCategory = 'none' | 'emergency' | 'crisis' | 'medical';

export interface GuardrailCheckResult {
  isEmergency: boolean;
  isCrisis: boolean;
  isMedicalQuery: boolean;
  category: GuardrailCategory;
  forcedResponse?: string;
}

/**
 * Appended to every companion response, including forced safety responses.
 * Keep this text in sync with Disclaimers.aiCompanionNotice.
 */
export const MANDATORY_DISCLAIMER =
  '🌿 Note: This is not medical advice. Please follow your doctor’s guidance.';

/** Canonicalized phrases used by the emergency detector. */
export const EMERGENCY_KEYWORDS = [
  'can t breathe',
  'cant breathe',
  'cannot breathe',
  'can not breathe',
  'unable to breathe',
  'can t breath',
  'cant breath',
  'cannot breath',
  'unable to breath',
  'struggling to breathe',
  'struggle to breathe',
  'trouble breathing',
  'difficulty breathing',
  'breathing difficulty',
  'breathless',
  'severe breathlessness',
  'hard to breathe',
  'breathing is hard',
  'hurts to breathe',
  'hurts to breath',
  'painful to breathe',
  'pain when breathing',
  'breathing hurts',
  'labored breathing',
  'laboured breathing',
  'shortness of breath',
  'short of breath',
  'gasping for air',
  'gasping for breath',
  'gasping',
  'suffocating',
  'cannot catch my breath',
  'can t catch my breath',
  'can t get air',
  'cant get air',
  'cannot get air',
  'can t get enough air',
  'cant get enough air',
  'not getting enough air',
  'lips are blue',
  'lips blue',
  'blue lips',
  'blue fingernails',
  'fingernails are blue',
  'grey lips',
  'gray lips',
  'turning blue',
  'turning grey',
  'turning gray',
  'asthma attack',
  'having an asthma attack',
  'severe asthma attack',
  'inhaler didn t work',
  'inhaler did not work',
  'inhaler didn t help',
  'inhaler did not help',
  'inhaler not working',
  'inhaler isn t working',
  'inhaler isn t helping',
  'inhaler not helping',
  'rescue inhaler failed',
  'rescue inhaler didn t work',
  'rescue inhaler isn t working',
  'nebulizer not working',
  'nebulizer isn t working',
  'chest tightness',
  'tight chest',
  'chest is tight',
  'chest feels tight',
  'chest crushing',
  'crushing chest pain',
  'chest pain',
  'wheezing',
  'wheezing badly',
  'severe wheezing',
  'cannot speak',
  'can t speak',
  'can t talk',
  'unable to speak',
  'choking',
  'throat closing',
  'throat is closing',
  'throat swelling',
  'tongue swelling',
  'swollen tongue',
  'anaphylaxis',
  'passing out',
  'passed out',
  'fainting',
  'unconscious',
  'ribs pulling in',
  'retractions',
  'should i call an ambulance',
  'do i need an ambulance',
  'should i go to the hospital',
  'do i need to go to the hospital',
  'should i go to the er',
  'do i need the er',
  'emergency',
  'strangling',
] as const;

/** Canonicalized phrases used by the self-harm / crisis detector. */
export const CRISIS_KEYWORDS = [
  'kill myself',
  'killing myself',
  'want to kill myself',
  'end my life',
  'ending my life',
  'take my life',
  'want to die',
  'wanna die',
  'wish i was dead',
  'wish i were dead',
  'better off dead',
  'suicide',
  'suicidal',
  'self harm',
  'self harming',
  'hurt myself',
  'hurting myself',
  'cutting myself',
  'cut myself',
  'overdose',
  'overdosed',
  'took too many pills',
  'took too many tablets',
  'no reason to live',
  'nothing to live for',
  'no point in living',
  'don t want to live',
  'do not want to live',
  'don t want to be alive',
  'do not want to be alive',
  'don t want to be here',
  'do not want to be here',
  'better off without me',
  'end it all',
  'ending it all',
] as const;

/** Medical-advice and prescription refusal triggers. */
export const FORBIDDEN_MEDICAL_KEYWORDS = [
  'diagnose',
  'diagnosis',
  'prescribe',
  'prescription',
  'dosage',
  'dose',
  'refill',
  'antibiotic',
  'prednisone',
  'steroid',
  'cure asthma',
  'cure my',
  'home remedy',
  'herbal remedy',
  'alternative medicine',
  'do i have',
  'what do i have',
  'is this an attack',
  'is this asthma',
  'is it pneumonia',
  'is it bronchitis',
  'is it an infection',
  'should i stop',
  'can i stop',
  'may i stop',
  'should i skip',
  'can i skip',
  'may i skip',
  'stop taking',
  'stopped my',
  'stop my medicine',
  'stop my medication',
  'quit my inhaler',
  'quit my medication',
  'skip my',
  'skip the',
  'double my',
  'increase my',
  'decrease my',
  'change my dose',
  'change my medication',
  'change my inhaler',
  'how many puffs',
  'extra puffs',
  'more puffs',
  'two puffs',
  '2 puffs',
  'take two',
  'take 2',
  'should i take my',
  'should i take more',
  'should i take an extra',
  'can i take more',
  'can i take an extra',
  'can i take my inhaler',
  'can i use my inhaler',
  'should i use my inhaler',
  'how often should i use',
  'is my inhaler working',
  'is my inhaler effective',
  'which inhaler',
  'what inhaler',
  'out of my inhaler',
  'out of my medication',
  'ran out of my inhaler',
  'ran out of my medication',
  'missed my dose',
  'missed a dose',
  'took too much',
  'accidentally took',
  'side effect',
  'side effects',
  'drug interaction',
  'interact with my',
  'treat my',
  'what is wrong with me',
  'does my child have',
  'does my son have',
  'does my daughter have',
] as const;

/**
 * Normalize user input for matching:
 * - Unicode compatibility decomposition, strip combining marks
 * - curly quotes/dashes to ASCII equivalents
 * - lowercase and collapse whitespace
 */
export function normalizeMessage(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[‘’‚‛′`´]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Punctuation-free form used for token-boundary phrase matching. */
export function toSearchText(input: string): string {
  return normalizeMessage(input)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True only when the phrase appears as a complete token sequence. */
export function containsPhrase(searchText: string, phrase: string): boolean {
  if (!phrase) return false;
  const pattern = new RegExp(`(^| )${escapeRegExp(phrase)}( |$)`, 'i');
  return pattern.test(searchText);
}

/** True only when the single word appears; prevents "eat" matching "breathe". */
export function containsWord(searchText: string, word: string): boolean {
  return containsPhrase(searchText, word);
}

function containsAnyPhrase(searchText: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => containsPhrase(searchText, phrase));
}

export function evaluateGuardrails(userMessage: string): GuardrailCheckResult {
  const searchText = toSearchText(userMessage);
  const emergencyNumber = getDefaultEmergencyNumber();

  // 1. Self-harm / crisis takes precedence even if respiratory words are also present.
  const hasCrisis = containsAnyPhrase(searchText, CRISIS_KEYWORDS);
  if (hasCrisis) {
    return {
      isEmergency: true,
      isCrisis: true,
      isMedicalQuery: true,
      category: 'crisis',
      forcedResponse:
        `🚨 I’m really concerned about what you’re sharing. You deserve immediate support. ` +
        `If you are in the US or Canada, call or text 988 now. Anywhere else, contact your local crisis line ` +
        `or emergency services at ${emergencyNumber}. If you are in immediate danger, call ${emergencyNumber} ` +
        `or go to the nearest emergency department. Please reach out to someone you trust and stay with them ` +
        `while you get help. You are not alone.`,
    };
  }

  // 2. Acute respiratory / medical emergency.
  const hasEmergency = containsAnyPhrase(searchText, EMERGENCY_KEYWORDS);
  if (hasEmergency) {
    return {
      isEmergency: true,
      isCrisis: false,
      isMedicalQuery: true,
      category: 'emergency',
      forcedResponse:
        `🚨 EMERGENCY: This sounds like it could be a medical emergency. Call ${emergencyNumber} or your ` +
        `local emergency services now, or go to the nearest emergency department. Do not wait and do not ` +
        `rely on this app. Follow your written asthma action plan while help is on the way.`,
    };
  }

  // 3. Prescription / diagnosis / medical-advice refusal.
  const hasMedical = containsAnyPhrase(searchText, FORBIDDEN_MEDICAL_KEYWORDS);
  if (hasMedical) {
    return {
      isEmergency: false,
      isCrisis: false,
      isMedicalQuery: true,
      category: 'medical',
      forcedResponse:
        'This is not medical advice. I am your lifestyle companion and cannot interpret prescriptions, ' +
        'change dosages, diagnose symptoms, or replace your clinician’s plan. Please follow your doctor’s ' +
        'guidance and contact your physician or pharmacist for medication questions.',
    };
  }

  return {
    isEmergency: false,
    isCrisis: false,
    isMedicalQuery: false,
    category: 'none',
  };
}
