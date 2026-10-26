# Safety & Boundaries Document: OTwo Asthma Self-Management Companion

## 1. Core Purpose and Ethical Boundaries
**OTwo** is strictly a **self-management habit companion**, not a medical device, diagnostic system, or clinical decision support tool. It is designed to empower individuals with asthma to stay consistent with the lifestyle routines and action plans prescribed by their licensed healthcare providers.

### Absolute Boundaries
1. **Zero Diagnostic Logic**: The app never computes clinical risk scores, peak flow risk categories, or diagnostic evaluations.
2. **Zero Prescription Analysis**: The app treats medication entries solely as user-defined, time-of-day reminders (e.g., "Morning Controller at 8:00 AM"). It will never recommend dose changes, timing shifts, or drug alternatives.
3. **Always Doctor-First**: Every screen touching habits, symptoms, or routines reinforces that the user's doctor's instructions take precedence over all app suggestions.

---

## 2. On-Device AI Guardrails
The AI Assistant operates **strictly on-device**. It does not transmit health queries or personal notes to external LLMs.

### Guardrail Enforcements
- **Forbidden Topics**:
  - Analyzing prescription effectiveness or suggesting medication adjustments.
  - Assessing whether a cough or wheeze indicates an infection or asthma attack.
  - Formulating home remedies or unverified herbal interventions.
- **Mandatory Safe Fallback**:
  Whenever a user query asks for medical evaluation or prescription changes, the AI response engine forces the following answer:
  > *"This is not medical advice. I am your lifestyle companion and cannot interpret prescriptions or evaluate symptoms. Please follow your doctor's guidance and consult your healthcare provider."*
- **Emergency Escalation Filter**:
  If keywords indicating acute distress (e.g., *"can't breathe"*, *"lips blue"*, *"chest crushing"*, *"inhaler didn't work"*, *"strangling"*, *"struggling for air"*) are detected, the chat interface immediately switches to an emergency alert modal advising immediate emergency department care or calling emergency services.

---

## 3. Symptom Tracking vs. Diagnostic Logging
- The symptom logger records **Breathing Difficulty (1–5 scale)**, **Cough presence**, **Triggers**, and personal observations.
- It is clearly labeled:
  > *"Symptom logging is strictly for your personal observation and doctor discussion. It is not used for diagnostic scoring or clinical risk prediction."*
- Trends are described in simple observational terms (e.g., *"You logged cold air as a trigger 3 times this week"*), never in clinical or predictive terms.

---

## 4. Doctor Report & Data Sharing
- When exporting summaries for a healthcare visit, the document starts with the mandatory disclaimer:
  > *"CONFIDENTIAL PATIENT SELF-LOGGED SUMMARY. All records are self-reported by the patient for discussion purposes only. No algorithmic diagnosis or clinical scoring has been performed."*
- Reports summarize factual adherence percentages, logged triggers, and subjective breathing comfort ratings to facilitate meaningful conversations between patients and clinicians.
