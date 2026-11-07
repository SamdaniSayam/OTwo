# OTwo – Asthma Self-Management Companion

**OTwo** is a calm mobile and web companion that helps people living with asthma turn their physician's recommendations into realistic daily routines, track their own consistency, recover gently after setbacks, and prepare for doctor visits — **without giving medical advice or diagnosing anything**.

---

## 1. Key Principles & Boundaries

- **Strictly non-clinical**: OTwo does not predict attacks, score risk, interpret prescriptions, or recommend dose changes. Medication entries are user-defined reminder times only.
- **Local-first**: Checklists, streaks, symptom observations, chat history, and doctor advice notes live on the device in a SQLCipher-encrypted `expo-sqlite` database on native and `AsyncStorage` (browser `localStorage`) on web. Every row and storage key is scoped to the active account.
- **Doctor advice stays local**: Free-text doctor recommendations are stored only on the device where they were entered. They are never uploaded to Supabase and cannot be restored after a reinstall.
- **On-device companion**: The lifestyle companion is a deterministic local rules engine with no network calls and no external LLM. Every response, including safety refusals, carries the non-medical disclaimer.
- **Real PWA**: The web build ships an installable manifest, icons, and a service worker that precaches the exported app shell and static assets. Health data is not placed in the service-worker cache.
- **Honest security claims**: Native health data uses SQLCipher full-database encryption with a random key in the platform keystore, and iOS excludes the database directory from device backups. Web storage is not encrypted by the app and is readable by same-origin JavaScript. See [docs/PRIVACY_AND_SECURITY.md](docs/PRIVACY_AND_SECURITY.md).

---

## 2. Tech Stack

- **Framework**: React Native with Expo SDK 58 (managed workflow)
- **Platforms**: Android, iOS, Web (PWA)
- **Local storage**: SQLCipher-encrypted `expo-sqlite` (native), `AsyncStorage` (web), `expo-secure-store` for the database key and cached auth profile on native
- **State**: Zustand
- **Navigation**: React Navigation (native stack + bottom tabs)
- **Optional cloud**: Supabase Auth + PostgreSQL with Row Level Security
- **Air quality**: Open-Meteo public API (read-only, requires device location permission)
- **Notifications**: Local-only `expo-notifications` scheduling; no remote push
- **Tests**: TypeScript compile + Node's built-in test runner

---

## 3. Project Structure

```
OTwo/
├── App.tsx                     # Providers, database and auth initialization
├── app.json                    # Expo config (Android backup disabled, web/PWA metadata)
├── public/
│   ├── index.html              # Web HTML template (manifest + external SW registration)
│   ├── register-sw.js          # External SW registration (keeps script-src 'self')
│   ├── manifest.json           # Installable PWA manifest
│   ├── sw.js                   # Offline app-shell service worker
│   └── icon-*.png              # PWA icons
├── scripts/
│   ├── generate-service-worker.js # Embeds exported assets in the precache list
│   └── inject-web-csp.js       # Injects CSP meta tag + writes dist/_headers
├── plugins/
│   └── withIosBackupExclusion.js # Excludes Documents/SQLite from iOS backups
├── tests/                      # Safety, storage isolation, recovery, streaks, auth, web-security regressions
├── docs/
│   ├── SAFETY_AND_BOUNDARIES.md
│   ├── PRIVACY_AND_SECURITY.md
│   ├── SUPABASE_LIVE_VERIFICATION.md
│   ├── LOCAL_TEST_BLUEPRINT.md
│   ├── DEVICE_VERIFICATION.md
│   └── RELEASE_CHECKLIST.md
├── supabase/
│   ├── config.toml
│   ├── functions/delete-account/index.ts
│   └── migrations/
│       ├── 20261027000000_initial_schema.sql
│       └── 20261029000000_privacy_hardening.sql
└── src/
    ├── components/             # Common, plan, and environment UI
    ├── constants/              # App metadata, colors, layout, disclaimers, web CSP policy
    ├── hooks/                  # Native auth auto-refresh lifecycle
    ├── db/
    │   ├── sqlite.ts           # Native SQLite schema + account-scoped helpers
    │   ├── sqlite.web.ts       # Web per-account AsyncStorage adapter
    │   ├── supabase.ts         # Optional Supabase client
    │   └── repositories/
    │       ├── templateRepo.ts
    │       ├── planRepo.ts
    │       ├── habitRepo.ts
    │       ├── symptomRepo.ts
    │       └── notesRepo.ts    # Local-only doctor advice notes
    ├── navigation/
    ├── screens/                # Auth, onboarding/restore, today, habits, symptoms, companion, settings
    ├── services/
    │   ├── ai/                 # Guardrails + deterministic on-device engine
    │   ├── environmentApi.ts
    │   ├── localData.ts        # Full local wipe for account deletion
    │   ├── localWipe.ts        # Ordered, failure-reporting wipe
    │   ├── notifications.ts    # Local permission, channels, schedules
    │   ├── onboardingPlan.ts
    │   ├── recovery.ts         # Idempotent daily recovery state machine
    │   ├── reportExport.ts     # Temporary file + share sheet
    │   ├── reportGenerator.ts
    │   ├── reportMath.ts       # Pure adherence/measurement arithmetic
    │   ├── secureStorage.ts    # Chunked SecureStore adapter
    │   ├── streaks.ts          # Derived full-day streaks
    │   ├── supabaseErrors.ts   # User-safe auth error copy + rate-limit messages
    │   └── supabaseRetry.ts    # Exponential backoff for transient cloud errors
    ├── store/                  # Zustand stores + per-account reset
    └── utils/                  # Local dates, emergency numbers, storage scope
```

---

## 4. Setup & Running

### Prerequisites
- Node.js 24+ (Node 20+ should work)
- npm

### Install
```bash
npm install
```

### Run
```bash
npm run web       # Web development server
npm run android   # Android development build
npm run ios       # iOS development build
```

Native builds use SQLCipher, which is not available in Expo Go. `npm run android` / `npm run ios` build and launch a development client; use `npx expo run:android`, `npx expo run:ios`, or an EAS development build if you do not already have one. In Expo Go the app intentionally refuses to open a plaintext native database and shows a bootstrap error.

### Verify
```bash
npm run typecheck   # Strict TypeScript check
npm run lint        # ESLint (eslint-config-expo)
npm test            # Compile and run regression tests
npx expo-doctor     # Expo dependency/config diagnostics
```

### Build the PWA
```bash
npm run build:web
```
This runs `expo export -p web`, injects a strict `Content-Security-Policy` meta tag into `dist/index.html`, writes `dist/_headers` (CSP, HSTS, permissions policy, cache rules), writes `dist/_redirects` (SPA fallback so deep links do not 404), and embeds every exported asset in the service-worker precache list.

Serve `dist/` over HTTPS on a domain you control. The build requires `script-src 'self'`; the service-worker registration lives in `public/register-sw.js` rather than an inline script. `style-src` still allows inline styles because `react-native-web` injects them at runtime. If your Supabase project uses a custom domain, add it to `connect-src` in `src/constants/webSecurity.json` and rebuild. Hosts that support `_headers` and `_redirects` (Netlify, Cloudflare Pages) apply the policy and SPA fallback automatically; other hosts need the same rules copied into their config.

For a fixed public URL, mobile-store builds, and the post-deploy Supabase redirect settings, follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

**Live web prototype:** https://samdanisayam.github.io/OTwo/ (GitHub Pages; see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) §1.5).

---

## 5. Optional Supabase Setup

The app works fully in guest mode without Supabase. Guest data is local to the device.

1. Create a Supabase project.
2. Link the repo and apply both migrations in `supabase/migrations/` in order:
   ```bash
   npx supabase@3.0.0 link --project-ref YOUR_PROJECT_REF
   npx supabase@3.0.0 db push --remote
   ```
   The CLI v3 `db push` defaults to the local database; `--remote` targets the linked project.
3. Copy the environment template and fill in the public client values:
   ```bash
   cp .env.example .env.local
   ```
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```
   Use the publishable key (or the legacy `anon` key during Supabase's key migration). Never put a `service_role` or `sb_secret_...` key in the app.
4. Deploy the deletion function:
   ```bash
   npx supabase@3.0.0 functions deploy delete-account --use-api
   ```
   The function reads the keys Supabase injects into Edge Functions, including the new `SUPABASE_SECRET_KEYS` dictionary and the legacy `SUPABASE_SERVICE_ROLE_KEY`. Never expose those keys to the client.
5. Configure the Supabase Auth email templates and redirect URLs. The app uses PKCE and handles `otwo://auth/confirm` and `otwo://auth/reset` links explicitly; add the equivalent hosted URLs for the web build if you deploy it. Leave the default email templates in place for the first test: the app exchanges the `?code=...` redirect, not a raw `token_hash`.

If Supabase is not configured, cloud sign-in and sign-up fail closed with a clear message; no fake account is created. Email confirmation is enforced by Supabase, and the app does not create a session until the address is confirmed.

For the full live-verification procedure (RLS/IDOR, deletion, email confirmation, password reset, and rate limits), see [Supabase Live Verification](docs/SUPABASE_LIVE_VERIFICATION.md). It includes a repeatable RLS/deletion check: `node scripts/verify-supabase-live.mjs`.

### What is stored in the cloud

Only non-sensitive onboarding inputs needed to rebuild a plan: email, optional age, reminder labels/times, baseline habit answers, and selected goals. Symptom logs, chat history, daily plans, habit streaks, and doctor advice notes are **never** uploaded.

---

## 6. Account Deletion

Settings → **Delete Account & Wipe All Local Data** asks the user to type `DELETE`. For a cloud account, the client first calls the `delete-account` Edge Function. The function resolves the caller from their JWT and uses a service-role client to remove audit rows and delete the auth user (cascading to profiles and onboarding rows). If server deletion fails, the client keeps all local data and shows the error so the user can retry. On success, the client removes the SQLite database, all AsyncStorage entries, session material, and indexed SecureStore items including the database key. Wipe failures are reported rather than silently treated as success.

Deletion is permanent. A signed-out account's local rows remain scoped on the device for the next sign-in; only account deletion wipes them.

---

## 7. Release Builds

EAS profiles are defined in `eas.json` (`development`, `preview`, `production`). Provide the public client values as EAS environment variables; never commit secrets.

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform android --profile production
npx eas-cli@latest submit --platform ios --profile production
```

`production` builds auto-increment the remote version. `npm run build:web` produces the deployable web artifact.

The full preflight, store metadata, hosting-header, and rollback checklist is in [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md). Device-only checks are in [docs/DEVICE_VERIFICATION.md](docs/DEVICE_VERIFICATION.md).

OTwo does not include `expo-updates`, analytics, or crash reporting. Do not claim over-the-air updates or monitoring.

---

## 8. Known Limitations

- Native health data is protected by SQLCipher with a random key in the platform keystore, and iOS excludes `Documents/SQLite` from backups. Web `localStorage` is **not encrypted by the app** and is readable by same-origin JavaScript. Do not use the app on a shared, unlocked device or browser profile.
- SQLCipher, Keychain/Keystore, iOS backup exclusion, notification delivery, and screen-reader behavior require a physical development/production build to verify. They cannot be exercised in Expo Go or on this development machine.
- Android app backups are disabled (`android.allowBackup: false`). The iOS plugin covers the database directory only, not arbitrary files elsewhere.
- The web app stores data in `localStorage`, which is readable by same-origin JavaScript. The build injects a strict CSP (`script-src 'self'`, no inline scripts) and writes `dist/_headers`, but deploying to a trusted HTTPS host and applying those headers to the host config are still required. `style-src` permits inline styles because `react-native-web` injects them at runtime. The service worker caches only the app shell.
- Notifications are local-only. Android/iOS permission can be denied, and the app shows that state instead of pretending reminders are scheduled. There is no remote push.
- Air quality requires device location permission. There is no fallback city; when permission is denied or live data is unavailable, the widget is hidden or shows an honest enable/retry state instead of an invented reading.
- Supabase RLS, deletion, email-confirmation, reset-email delivery, and rate-limit behavior require a configured project and credentials to verify end to end.
- Store submission, signing keys, SMTP delivery, and device-only checks (SQLCipher at rest, iOS backup exclusion, notifications, deep links, screen readers, low-end performance) have not been performed in this repository. See [docs/DEVICE_VERIFICATION.md](docs/DEVICE_VERIFICATION.md).
- There is no analytics or crash-reporting SDK. Render and bootstrap failures are handled in-app and logged only in development.

---

## 9. Documentation

- [Safety & Boundaries](docs/SAFETY_AND_BOUNDARIES.md)
- [Privacy & Security](docs/PRIVACY_AND_SECURITY.md)
- [Supabase Live Verification](docs/SUPABASE_LIVE_VERIFICATION.md)
- [Local Test Blueprint](docs/LOCAL_TEST_BLUEPRINT.md)
- [Device Verification](docs/DEVICE_VERIFICATION.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)
