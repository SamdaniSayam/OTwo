# Safety & Boundaries: OTwo Asthma Self-Management Companion

## 1. Core Purpose and Ethical Boundaries

**OTwo** is a self-management habit companion, not a medical device, diagnostic system, or clinical decision-support tool. It helps people with asthma stay consistent with the lifestyle routines and action plans prescribed by their licensed healthcare providers.

### Absolute boundaries

1. **No diagnostic logic**: OTwo never computes clinical risk scores, peak-flow categories, or diagnostic evaluations.
2. **No prescription analysis**: Medication entries are user-defined, time-of-day reminders only. OTwo never recommends dose changes, timing changes, or drug alternatives.
3. **Doctor-first**: Every screen touching habits, symptoms, or routines reinforces that the user's doctor's instructions take precedence.
4. **No emergency substitution**: OTwo cannot assess severity or summon help. It directs users to emergency services and their written action plan.

---

## 2. On-Device Companion Guardrails

The companion is a deterministic local rules engine. It makes no network calls and does not send health queries or notes to an external LLM.

### Input normalization

Matching is performed on a Unicode-normalized, punctuation-free, lowercase form of the message. Curly quotes (`can’t`), accents, hyphens, zero-width characters, and extra whitespace cannot bypass a rule. Phrases are matched on token boundaries, so a word like `eat` never matches inside `breathe`.

### Forbidden topics

- Analyzing prescription effectiveness or suggesting medication adjustments.
- Assessing whether a cough or wheeze indicates an infection or asthma attack.
- Formulating home remedies or unverified herbal interventions.
- Interpreting symptoms, test results, or medication instructions.

### Medical refusal

When a message asks for diagnosis, dosage, prescription changes, or medication decisions, the engine refuses and directs the user to their clinician or pharmacist. The refusal is not personalized medical advice.

### Emergency escalation

The companion detects acute respiratory warning signs, including:

- `can't breathe`, `cannot breathe`, `struggling to breathe`, `unable to breathe`
- `blue lips`, `blue fingernails`, `grey lips`
- `asthma attack`, `chest tightness`, `chest pain`, `wheezing`
- `inhaler not working`, `rescue inhaler failed`
- `cannot speak`, `suffocating`, `emergency`

When detected, the chat shows a blocking emergency modal with a call button and directs the user to emergency services or the nearest emergency department. It does not wait for the user to finish the conversation.

### Self-harm and crisis escalation

The companion separately detects self-harm and suicide-related language, including `kill myself`, `want to die`, `end my life`, `suicide`, `self harm`, and related phrases. Crisis language takes precedence over respiratory rules.

The crisis modal:

- States that the user deserves immediate support.
- Mentions the US/Canada 988 Suicide & Crisis Lifeline where applicable.
- Shows the configured emergency number and a call button.
- Encourages the user to contact someone they trust and not stay alone.

### Mandatory disclaimer

Every companion response — including emergency and refusal responses — ends with:

> 🌿 Note: This is not medical advice. Please follow your doctor’s guidance.

### Emergency numbers

Emergency numbers vary by country and can change. The app chooses a best-effort default from the device region (for example, 911 in the US/Canada, 999 in the UK, 112 in much of Europe, 000 in Australia) and falls back to **112**. The number is editable in Settings. The user is responsible for verifying that the configured number reaches local emergency services.

Do not treat the default as a guaranteed emergency directory.

---

## 3. Symptom Tracking vs. Diagnostic Logging

- The symptom logger records **breathing difficulty (1–5)**, **cough presence**, **triggers**, and optional personal notes.
- It is labeled: *"Symptom logging is strictly for your personal observation and doctor discussion. It is not used for diagnostic scoring or clinical risk prediction."*
- A rating of 5 triggers the emergency notice, but the app does not claim to assess severity.
- Trends are described observationally (for example, *"You logged cold air as a trigger 3 times this week"*), never clinically or predictively.

---

## 4. Doctor Report & Data Sharing

- Exported summaries begin with the confidential self-logged summary header and a statement that no algorithmic diagnosis or clinical scoring was performed.
- Reports summarize self-reported adherence, logged triggers, and subjective breathing ratings for discussion with a clinician.
- The report is generated from local data only.
- Sharing is initiated explicitly by the user. The app does not upload the report.

---

## 5. Data and Safety Boundaries

- Symptom logs and doctor advice notes are local-only and are not uploaded to the cloud.
- Cloud accounts store only non-sensitive onboarding inputs needed to rebuild a plan.
- Account deletion removes server rows first, then wipes local data. If the server step fails, local data is preserved for a safe retry.
- Local reminder notifications are user-configured time-of-day alerts only. They are not monitoring, clinical supervision, or remote push, and the app cannot observe symptoms or contact anyone automatically.
- Free-text symptom notes are excluded from doctor reports unless the user explicitly opts in. Doctor advice notes are always excluded from exports.
