# OTwo – Asthma Self-Management Companion

**OTwo** is a calm, production-ready mobile and web companion designed to help people living with asthma turn their physician's recommendations into realistic daily routines, track consistency, recover smoothly after setbacks, and build supportive habits — **without ever giving medical advice or diagnosing**.

---

## 1. Key Principles & Boundaries

- **Strictly Non-Clinical & Non-Diagnostic**: OTwo does not predict attacks, score risk, or interpret prescriptions. All medication reminders are strictly user-defined, time-of-day alerts.
- **Offline-First**: All checklists, streak logs, symptom observations, and habit records live on-device in `expo-sqlite` (and `AsyncStorage` fallback for Web PWA).
- **100% On-Device AI Companion**: Operates locally without sending personal health notes off-device to external LLMs. Enforces hard guardrails and instant emergency escalation for acute respiratory distress.
- **Client-Side Key Derivation & Encryption**: Notes or doctor advice synced to the cloud are encrypted with a key derived from device salt and user session entropy using PBKDF2 with SHA-256 rounds. No plaintext health text is stored without encryption.
- **Healing & Natural Green Design System**: Generous whitespace, 48dp+ touch targets, system typography, and a calm, non-clinical aesthetic (`#2F5D50`, `#87A96B`, `#A8E6CF`, `#F7F9F7`).

---

## 2. Tech Stack

- **Framework**: React Native with Expo (SDK 58 managed workflow)
- **Platforms**: Android (optimized for 2–3 GB RAM phones), Web (PWA), iOS
- **Local Storage**: `expo-sqlite` + `@react-native-async-storage/async-storage`
- **State Management**: `zustand` (minimal bundle size, zero boilerplate, fast cold starts)
- **Navigation**: React Navigation (`@react-navigation/native-stack` + `@react-navigation/bottom-tabs`)
- **Backend (Optional Sync & Auth)**: Supabase (Auth + PostgreSQL with Row Level Security)
- **Air Quality / Weather**: Free public Open-Meteo API (read-only, toggleable)

---

## 3. Project Structure

```
OTwo/
├── App.tsx                     # Entry point (providers, SQLite and Auth initialization)
├── app.json                    # Expo configuration (PWA, Android plugins)
├── package.json                # Dependencies
├── tsconfig.json               # Strict TypeScript config
├── docs/
│   ├── SAFETY_AND_BOUNDARIES.md # Safety protocol, emergency keywords & boundaries
│   └── ENCRYPTION_AND_SECURITY.md # Key derivation & Supabase RLS documentation
├── supabase/
│   └── migrations/
│       └── 20261027000000_initial_schema.sql # Profiles, responses, snapshots, RLS
└── src/
    ├── constants/
    │   ├── app.ts              # Configurable app display name & metadata
    │   ├── colors.ts           # Natural Green color tokens
    │   ├── layout.ts           # Spacing, typography, and 48dp touch constraints
    │   └── disclaimers.ts      # Standardized non-clinical disclaimers
    ├── db/
    │   ├── sqlite.ts           # SQLite & Web PWA storage adapter
    │   ├── supabase.ts         # Supabase client with offline fallback
    │   └── repositories/
    │       ├── templateRepo.ts # plan_templates repository (source of truth)
    │       ├── planRepo.ts     # daily_plans & adaptive recovery tracker
    │       ├── habitRepo.ts    # habits & medication reminders
    │       └── symptomRepo.ts  # non-diagnostic symptom logs
    ├── store/
    │   ├── useAuthStore.ts     # Authentication & onboarding flow
    │   ├── usePlanStore.ts     # Daily plan engine & 3-day recovery mode
    │   ├── useHabitStore.ts    # Streaks, consistency & reminder schedules
    │   ├── useSymptomStore.ts  # Symptom check-ins & critical escalation
    │   ├── useCompanionStore.ts # On-device chat assistant & emergency alert
    │   └── useEnvStore.ts      # Public air quality state & toggle
    ├── services/
    │   ├── ai/
    │   │   ├── guardrails.ts   # Emergency & medical query keyword filters
    │   │   └── onDeviceEngine.ts # 100% local deterministic lifestyle mentor
    │   ├── encryption.ts       # Client-side PBKDF2/AES key derivation service
    │   ├── environmentApi.ts   # Open-Meteo free AQI service
    │   └── reportGenerator.ts  # Structured Doctor Visit summary generator
    ├── components/
    │   ├── common/             # Button, Card, Input, Badge, DisclaimerBanner, EmergencyNotice
    │   ├── plan/               # ChecklistItem, RecoveryPlanBanner, ItemDetailModal
    │   └── environment/        # AirQualityWidget
    ├── navigation/
    │   ├── RootNavigator.tsx   # Auth -> Onboarding -> MainTabs switch
    │   ├── AuthNavigator.tsx   # Login & Signup screens
    │   └── TabNavigator.tsx    # Today, Habits, Check-in, Mentor, Settings
    └── screens/
        ├── auth/               # LoginScreen, SignupScreen, OnboardingScreen
        ├── today/              # TodayScreen
        ├── habits/             # HabitsScreen, AddReminderModal
        ├── symptoms/           # SymptomLogScreen
        ├── companion/          # CompanionScreen
        └── settings/           # SettingsScreen, DoctorReportModal
```

---

## 4. Setup & Running Instructions

### Prerequisites
- Node.js (v18+ or v24+)
- npm or bun

### 1. Install dependencies
```bash
npm install
```

### 2. Run the application
- **Web / PWA**:
  ```bash
  npm run web
  ```
- **Android**:
  ```bash
  npm run android
  ```
- **iOS**:
  ```bash
  npm run ios
  ```

---

## 5. Supabase Setup (Optional for Cloud Sync)

The application functions completely offline or in guest mode out-of-the-box. To connect your Supabase project for user authentication and encrypted backup:

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the migration SQL in your Supabase SQL Editor:
   ```bash
   cat supabase/migrations/20261027000000_initial_schema.sql
   ```
3. Set your environment variables in `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## 6. Verification & Quality Commands

```bash
npx tsc --noEmit     # Strict TypeScript type check
npx expo-doctor      # Dependency & Expo configuration diagnostic (20/20 passed)
```
