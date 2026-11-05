# Privacy & Security: OTwo

This document describes what OTwo actually stores and protects. Native local
health data uses SQLCipher full-database encryption; web storage is **not**
encrypted by the app. OTwo does not implement field-level encryption, cloud
health-data sync, or remote push notifications.

## 1. Data Inventory

### Stored only on the device

The following are stored in account-scoped local storage. On native they live in
a SQLCipher-encrypted SQLite database; on web they live in `AsyncStorage`
(browser `localStorage`) under per-account keys.

- Daily plan templates and daily checklist items
- Completion status, notes, and completion timestamps
- Recovery state after missed days
- Habit streaks
- Medication reminder labels, times, and frequencies (reminder-only)
- Symptom check-ins, triggers, and free-text notes
- Companion chat history
- Doctor advice / action-plan notes
- Notification and air-quality preferences

Doctor advice notes are stored in the `sensitive_notes` table. They are never
sent to Supabase and cannot be restored after a reinstall or on another device.

### Stored in the optional cloud account

When Supabase is configured and the user creates an account, only non-sensitive
onboarding inputs are uploaded:

- Email address (Supabase Auth)
- Optional age
- Medication reminder labels, times, and frequencies
- Baseline habit answers (sleep, movement, hydration, stress)
- Selected personal goals

Symptom logs, chat history, daily plans, habit streaks, and doctor advice notes
are not uploaded. The cloud schema has no column for doctor advice.

### Third-party requests

- **Supabase** receives authentication and the cloud fields listed above.
- **Open-Meteo** receives device coordinates and the network request metadata
  needed to return public air-quality data. No account id or health data is sent.
  OTwo requests coordinates only after the user enables air quality, has no
  fallback city, and hides the reading when live data is unavailable.
- **Expo Notifications** is used for local scheduling only. OTwo does not send
  notifications through a remote push service.

## 2. Account Isolation

- Native rows carry a `user_id` column. Queries require the active account id.
- Web keys are shaped `@web_<encoded-user-id>_<table>` and every record is also
  filtered by `user_id`.
- Chat history uses `@otwo_companion_chat_history::<encoded-user-id>`.
- The active account id is set only after a verified Supabase session or guest
  session starts. If no account is active, local reads return empty and writes
  are no-ops (fail closed).
- Legacy, unscoped rows are quarantined under a reserved id and are never read
  by an account.

Signing out clears in-memory state and the cached auth profile but does not
erase the account's local rows. Signing back in as the same account restores
access. Deleting the account wipes all local data.

## 3. Authentication

- Cloud authentication is fail-closed. Without `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`, sign-in and sign-up show a configuration
  message instead of creating a fake local cloud session.
- Guest mode is local-only and uses a random guest id.
- Supabase enforces email confirmation. The app does not treat a sign-up without
  a session as signed in.
- Supabase uses PKCE. Automatic session detection from web URLs is disabled, and
  the app handles `otwo://auth/confirm` and `otwo://auth/reset` links explicitly.
  Password recovery opens a dedicated reset screen; recovery links are exchanged
  for a session before the password is changed.
- On native, the Supabase session and cached auth profile are stored with
  `expo-secure-store` (Android Keystore / iOS Keychain). Large sessions are
  chunked so they do not silently fall back to plaintext. Items use
  `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` accessibility.
- On web, session material uses `AsyncStorage` because browsers do not expose a
  native secure enclave to a web app. It is readable by same-origin JavaScript.

## 4. Account Deletion

Settings → **Delete Account & Wipe All Local Data** requires typing `DELETE`.

1. For a cloud account, the client calls the `delete-account` Edge Function.
2. The function identifies the caller from the JWT, removes their audit rows,
   and deletes the auth user with a service-role client. Profiles and onboarding
   rows cascade.
3. If server deletion fails, the client does not wipe local data. The user can
   retry safely.
4. On success, the client deletes the SQLite database, clears all AsyncStorage
   entries (including web tables and Supabase session data), clears the indexed
   SecureStore entries (including the database key), and resets in-memory stores.
5. Wipe failures are reported instead of claiming success.

Deletion is permanent and cannot be undone.

## 5. Local-at-Rest Protection

### Native (iOS and Android)

- The SQLite database is encrypted with SQLCipher. The app refuses to open or
  create a plaintext health database if SQLCipher is unavailable, and shows a
  bootstrap error instead. This means Expo Go cannot be used for native health
  data; a development or production build is required.
- The database key is 32 random bytes generated with `expo-crypto`, stored as hex
  in `expo-secure-store`, and never written to the database, exports, logs, or
  cloud payloads.
- A legacy plaintext database, if one exists, is read once and re-encrypted into
  a new SQLCipher database before the app continues.
- iOS: the config plugin `plugins/withIosBackupExclusion.js` sets
  `NSURLIsExcludedFromBackupKey` on `Documents/SQLite` before the database opens,
  covering the database, WAL, and SHM files.
- Android: application backups are disabled with `android.allowBackup: false`.
- The key uses `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. A device restore that does
  not carry the Keychain item cannot decrypt the database; the app reports this
  rather than silently discarding data.

### Web

- Web storage is **not encrypted by the app**. It relies on browser origin
  isolation, the device lock, and the absence of cross-site scripting.
  `localStorage` is readable by any JavaScript running on the same origin.
- The production web build injects a strict Content-Security-Policy
  (`default-src 'self'`, `script-src 'self'`, `object-src 'none'`, and no
  `'unsafe-inline'` or `'unsafe-eval'` for scripts) and writes `dist/_headers`
  with `frame-ancestors 'none'`, HSTS, `nosniff`, a no-referrer policy, and a
  permissions policy that only allows geolocation. `style-src` permits inline
  styles because `react-native-web` injects them at runtime.
- The CSP is effective only when the app is served with those headers (or the
  injected meta tag) from a trusted HTTPS origin you control. If Supabase uses a
  custom domain, add it to `connect-src` in `src/constants/webSecurity.json` and
  rebuild.
- Never inject third-party scripts, tag managers, or analytics into the app
  origin. The service worker caches the app shell and static assets only; it does
  not cache health data.
- Do not use OTwo on a shared, unlocked device or a shared browser profile.

## 6. Database Security (Supabase)

- Row Level Security is enabled on `profiles`, `onboarding_responses`, and
  `audit_logs`.
- Users can select and update only their own profile and onboarding row.
- Audit logs are server-managed. Clients may read their own rows but cannot
  insert, update, or delete them. The insert policy and table grant were removed
  by the privacy-hardening migration.
- The unused `sync_snapshots` table and the `doctor_recommendations_encrypted`
  column were removed. There is no cloud backup of local health data.

## 7. Threat Model & Limitations

OTwo is designed to reduce accidental data collection and protect native local
data at rest. It is not designed to resist a compromised, rooted, or jailbroken
device, or a hostile same-origin script on the web.

- A lost or stolen unlocked device can expose data while the app is running.
- A rooted/jailbroken device or a malicious browser extension may bypass OS
  protections.
- An XSS vulnerability on the web deployment could read `localStorage`. The CSP
  reduces the chance of script injection but does not encrypt web data, and it
  cannot protect against a compromised host or a malicious browser extension.
- SQLCipher, Keychain/Keystore behavior, iOS backup exclusion, and notification
  delivery require a physical development/production build and have not been
  verified on this machine.
- Supabase project configuration, RLS behavior, email confirmation, reset-email
  delivery, and the deletion function cannot be verified without a real project,
  deployment, and credentials.
- There is no remote push notification service in this build. Local notification
  permission can be denied, and the app reports that state honestly.
- Android app backup is disabled. iOS excludes the encrypted database directory
  from backups, but other files outside that directory are not covered by this
  plugin.

Do not describe web storage as "encrypted" or "hardware-backed." Native storage
may be described as SQLCipher-encrypted at rest, with the caveat that the key is
protected by the platform keystore and device lock.
