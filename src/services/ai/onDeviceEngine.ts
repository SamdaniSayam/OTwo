/**
 * On-Device AI Lifestyle Companion Engine
 * Operates 100% locally on device. Zero external API calls.
 * Provides encouragement, habit planning, and gentle lifestyle mentors.
 * Strictly adheres to non-medical boundaries.
 */
import { evaluateGuardrails } from './guardrails';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isEmergencyAlert?: boolean;
}

const MANDATORY_DISCLAIMER_SUFFIX =
  '\n\n🌿 Note: This is not medical advice. Please follow your doctor’s guidance.';

export function generateOnDeviceResponse(userText: string): {
  reply: string;
  isEmergency: boolean;
} {
  const check = evaluateGuardrails(userText);
  if (check.isEmergency || check.isMedicalQuery) {
    return {
      reply: check.forcedResponse || 'Please consult your healthcare provider.',
      isEmergency: check.isEmergency,
    };
  }

  const query = userText.toLowerCase().trim();

  // 1. Habit & routine planning help
  if (query.includes('routine') || query.includes('habit') || query.includes('plan') || query.includes('morning')) {
    return {
      reply:
        'Building a consistent routine is all about small, gentle steps. Taking your doctor-prescribed morning controller at the same time each day (like right after brushing your teeth) helps make it automatic. How is your morning routine feeling this week?' +
        MANDATORY_DISCLAIMER_SUFFIX,
      isEmergency: false,
    };
  }

  // 2. Recovery / Missed days encouragement
  if (query.includes('missed') || query.includes('forgot') || query.includes('behind') || query.includes('skipped')) {
    return {
      reply:
        'Setbacks are completely normal and part of every journey! Do not be hard on yourself. Our adaptive recovery mode keeps things simple: just focus on your core hydration and your regular prescribed doctor routine today. One calm breath at a time.' +
        MANDATORY_DISCLAIMER_SUFFIX,
      isEmergency: false,
    };
  }

  // 3. Movement / Exercise general lifestyle principles
  if (query.includes('exercise') || query.includes('walk') || query.includes('movement') || query.includes('run')) {
    return {
      reply:
        'Regular, gentle movement like walking supports cardiovascular health and steady breathing. General principles recommend warming up gradually, staying well-hydrated, and avoiding sudden cold, dry air. Always follow any specific exercise guidelines given by your doctor.' +
        MANDATORY_DISCLAIMER_SUFFIX,
      isEmergency: false,
    };
  }

  // 4. Sleep & wind-down
  if (query.includes('sleep') || query.includes('rest') || query.includes('night') || query.includes('tired')) {
    return {
      reply:
        'Quality sleep allows your airways and immune system to rest. Helpful habits include keeping bedroom air clean and dust-free, elevating your pillow slightly if comfortable, and winding down with 5–10 minutes of gentle relaxation before bedtime.' +
        MANDATORY_DISCLAIMER_SUFFIX,
      isEmergency: false,
    };
  }

  // 5. Stress & relaxation
  if (query.includes('stress') || query.includes('anxious') || query.includes('relax') || query.includes('calm')) {
    return {
      reply:
        'Stress can cause rapid, shallow breathing patterns. Try pausing for a moment: breathe gently through your nose for 4 counts, hold softly for 2, and breathe out slowly for 6. Gentle, paced breathing activates your calm relaxation response.' +
        MANDATORY_DISCLAIMER_SUFFIX,
      isEmergency: false,
    };
  }

  // 6. Food & hydration
  if (query.includes('food') || query.includes('eat') || query.includes('water') || query.includes('hydration') || query.includes('drink')) {
    return {
      reply:
        'Adequate hydration keeps airway mucus membranes moist and thin, making natural clearing easier. Aim to sip water regularly throughout the day. A colorful diet rich in antioxidants and whole fruits provides natural nutritional support.' +
        MANDATORY_DISCLAIMER_SUFFIX,
      isEmergency: false,
    };
  }

  // 7. Encouragement / General greeting
  if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('thanks') || query.includes('thank you')) {
    return {
      reply:
        'Hello! I am here to encourage your daily habits, help you stay consistent with your routine, and answer general lifestyle questions. How can I support you today?' +
        MANDATORY_DISCLAIMER_SUFFIX,
      isEmergency: false,
    };
  }

  // Default gentle guidance
  return {
    reply:
      'I am here to support your daily wellness habits and routine consistency. Whether you want to reflect on hydration, movement, sleep, or staying consistent with your daily checklist, I am here to help.' +
      MANDATORY_DISCLAIMER_SUFFIX,
    isEmergency: false,
  };
}
