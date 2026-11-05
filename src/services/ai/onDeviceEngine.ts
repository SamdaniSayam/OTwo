/**
 * On-Device AI Lifestyle Companion Engine
 * Operates 100% locally on device. Zero external API calls.
 * Provides encouragement, habit planning, and gentle lifestyle mentoring.
 * Strictly adheres to non-medical boundaries.
 */
import {
  containsPhrase,
  containsWord,
  evaluateGuardrails,
  MANDATORY_DISCLAIMER,
  toSearchText,
} from './guardrails';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isEmergencyAlert?: boolean;
  isCrisisAlert?: boolean;
}

export interface OnDeviceResponse {
  reply: string;
  isEmergency: boolean;
  isCrisis: boolean;
}

/** Append the mandatory disclaimer exactly once. */
export function withMandatoryDisclaimer(message: string): string {
  if (message.includes(MANDATORY_DISCLAIMER)) return message;
  return `${message}\n\n${MANDATORY_DISCLAIMER}`;
}

export function generateOnDeviceResponse(userText: string): OnDeviceResponse {
  const check = evaluateGuardrails(userText);

  // Forced safety / refusal responses also carry the mandatory disclaimer.
  if (check.forcedResponse) {
    return {
      reply: withMandatoryDisclaimer(check.forcedResponse),
      isEmergency: check.isEmergency,
      isCrisis: check.isCrisis,
    };
  }

  const search = toSearchText(userText);

  // 1. Habit & routine planning help
  if (
    ['routine', 'habit', 'plan', 'schedule', 'morning', 'consistent', 'consistency'].some(
      (word) => containsWord(search, word)
    )
  ) {
    return {
      reply: withMandatoryDisclaimer(
        'Building a consistent routine is all about small, gentle steps. Taking your doctor-prescribed ' +
          'morning controller at the same time each day (like right after brushing your teeth) helps make ' +
          'it automatic. How is your morning routine feeling this week?'
      ),
      isEmergency: false,
      isCrisis: false,
    };
  }

  // 2. Recovery / missed days encouragement
  if (
    ['missed', 'forgot', 'behind', 'skipped', 'setback', 'slip'].some((word) =>
      containsWord(search, word)
    )
  ) {
    return {
      reply: withMandatoryDisclaimer(
        'Setbacks are completely normal and part of every journey! Do not be hard on yourself. Our ' +
          'adaptive recovery mode keeps things simple: just focus on your core hydration and your regular ' +
          'prescribed doctor routine today. One calm breath at a time.'
      ),
      isEmergency: false,
      isCrisis: false,
    };
  }

  // 3. Movement / exercise general lifestyle principles
  if (
    ['exercise', 'walk', 'walking', 'movement', 'run', 'running', 'workout', 'stretch', 'stretching'].some(
      (word) => containsWord(search, word)
    )
  ) {
    return {
      reply: withMandatoryDisclaimer(
        'Regular, gentle movement like walking supports cardiovascular health and steady breathing. ' +
          'General principles recommend warming up gradually, staying well-hydrated, and avoiding sudden ' +
          'cold, dry air. Always follow any specific exercise guidelines given by your doctor.'
      ),
      isEmergency: false,
      isCrisis: false,
    };
  }

  // 4. Sleep & wind-down
  if (
    ['sleep', 'rest', 'night', 'tired', 'bedtime', 'insomnia', 'winding'].some((word) =>
      containsWord(search, word)
    )
  ) {
    return {
      reply: withMandatoryDisclaimer(
        'Quality sleep allows your airways and immune system to rest. Helpful habits include keeping ' +
          'bedroom air clean and dust-free, elevating your pillow slightly if comfortable, and winding ' +
          'down with 5–10 minutes of gentle relaxation before bedtime.'
      ),
      isEmergency: false,
      isCrisis: false,
    };
  }

  // 5. Stress & relaxation
  if (
    ['stress', 'stressed', 'anxious', 'anxiety', 'relax', 'calm', 'panic', 'overwhelmed'].some(
      (word) => containsWord(search, word)
    ) ||
    containsPhrase(search, 'breathing exercise') ||
    containsPhrase(search, 'paced breathing')
  ) {
    return {
      reply: withMandatoryDisclaimer(
        'Stress can cause rapid, shallow breathing patterns. Try pausing for a moment: breathe gently ' +
          'through your nose for 4 counts, hold softly for 2, and breathe out slowly for 6. Gentle, paced ' +
          'breathing activates your calm relaxation response.'
      ),
      isEmergency: false,
      isCrisis: false,
    };
  }

  // 6. Food & hydration. Use word matching so "eat" never matches "breathe".
  if (
    ['food', 'eat', 'eating', 'meal', 'snack', 'water', 'hydration', 'hydrate', 'drink', 'diet', 'nutrition'].some(
      (word) => containsWord(search, word)
    )
  ) {
    return {
      reply: withMandatoryDisclaimer(
        'Adequate hydration keeps airway mucus membranes moist and thin, making natural clearing easier. ' +
          'Aim to sip water regularly throughout the day. A colorful diet rich in antioxidants and whole ' +
          'fruits provides natural nutritional support.'
      ),
      isEmergency: false,
      isCrisis: false,
    };
  }

  // 7. Encouragement / General greeting
  if (
    ['hello', 'hi', 'hey', 'thanks'].some((word) => containsWord(search, word)) ||
    containsPhrase(search, 'thank you') ||
    containsPhrase(search, 'good morning') ||
    containsPhrase(search, 'good evening')
  ) {
    return {
      reply: withMandatoryDisclaimer(
        'Hello! I am here to encourage your daily habits, help you stay consistent with your routine, and ' +
          'answer general lifestyle questions. How can I support you today?'
      ),
      isEmergency: false,
      isCrisis: false,
    };
  }

  // Default gentle guidance
  return {
    reply: withMandatoryDisclaimer(
      'I am here to support your daily wellness habits and routine consistency. Whether you want to ' +
        'reflect on hydration, movement, sleep, or staying consistent with your daily checklist, I am here ' +
        'to help.'
    ),
    isEmergency: false,
    isCrisis: false,
  };
}
