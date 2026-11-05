# OTwo — Local Test Blueprint

A repeatable local gate for checking whether the app is broken. Run it after any
change and before declaring a phase done. Record results in the evidence table.

Device-only checks are separate: see [DEVICE_VERIFICATION.md](DEVICE_VERIFICATION.md).
Release/store work is in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

---

## 0. Prerequisites (local machine)

- Node.js (validated on Node 24)
- npm
- Supabase CLI v3 (`npx supabase@3.0.0`) — no global install needed
- Optional: `adb` (Android emulator/device), `xcrun simctl` (macOS simulator)

`expo-doctor` reports missing optional native tooling. Treat those warnings as
informational unless they affect the change area.

---

## 1. Dependency & environment diagnosis

```bash
node --version
npm --version
npx expo-doctor
```

| Step | Expected | Observed | Status |
|------|----------|----------|--------|
| Node runtime | `v24.x` | `v24.22.0` | Pass |
| npm | `11.x` | `11.19.1` | Pass |
| `expo-doctor` | 20/20 checks pass (or documented warnings) | 20/20, no issues detected | Pass |

---

## 2. Unit / integration tests

```bash
npm test
```

Expected: all tests pass, zero failures, zero cancellations.

| Step | Expected | Observed | Status |
|------|----------|----------|--------|
| `npm test` | all pass | 78/78 pass, 0 fail | Pass |

---

## 3. Typecheck

```bash
npx tsc --noEmit
```

Expected: clean exit, no errors.

| Step | Expected | Observed | Status |
|------|----------|----------|--------|
| `npx tsc --noEmit` | clean | clean exit | Pass |

---

## 4. Lint

```bash
npm run lint
```

Expected: no errors. Warnings are visible but should not grow; fix warnings in
files you touch.

| Step | Expected | Observed | Status |
|------|----------|----------|--------|
| `npm run lint` | no errors | no errors | Pass |

---

## 5. Web build (PWA), CSP, and offline shell

```bash
npm run build:web
```

This runs `expo export -p web`, injects the CSP meta tag, writes `dist/_headers`,
and embeds every exported asset in the service-worker precache list.

Verify:

- `dist/index.html` exists and contains `Content-Security-Policy`
- `dist/sw.js` exists and contains a populated `PRECACHE_MANIFEST`
- `dist/_headers` exists and includes `script-src 'self'` and
  `frame-ancestors 'none'`
- `dist/register-sw.js` exists (no inline SW registration in `index.html`)
- Serve `dist/` over localhost/HTTPS, open it, and confirm the browser console
  has no CSP violations
- Reload offline → the app shell loads

Quick local serve:

```bash
python3 -m http.server 4173 --directory dist
# open http://localhost:4173
```

| Step | Expected | Observed | Status |
|------|----------|----------|--------|
| `build:web` | `dist/` + CSP + `_headers` + SW | `dist/index.html` with CSP meta; `_headers` with `script-src 'self'` and `frame-ancestors 'none'`; 21 assets precached | Pass |
| First load | app renders, no CSP violations | Login rendered; only the benign `expo-notifications` web warning | Pass |
| Offline shell | app opens without network | Server stopped; reload rendered Login with no load error | Pass |

---

## 6. Local Supabase (optional, for cloud-path verification)

Start the local stack and serve the Edge Function locally:

```bash
npx supabase@3.0.0 start
npx supabase@3.0.0 db reset                 # applies migrations locally
npx supabase@3.0.0 functions serve delete-account
```

For a linked remote project, use:

```bash
npx supabase@3.0.0 db push --remote
npx supabase@3.0.0 functions deploy delete-account --use-api
```

Then point the verification script at the local API URL (the CLI prints the
port, usually `http://localhost:54321`). Expected: the same RLS/deletion checks
pass against local infrastructure.

**Last run (2026-11-05): not run.** This step is optional. Docker is available,
but no Supabase local images were cached, so it would require pulling the full
local stack. The provisioned project was verified separately (14/14 and 18/18).

---

## 7. Live-verification script (provisioned Supabase project)

```bash
cp .env.example .env.local          # real public URL + publishable key
cp .env.example .env.verify.local   # TEST_A/B email + password
set -a; . ./.env.verify.local; set +a
node scripts/verify-supabase-live.mjs
```

Expected: **14/14 checks passed** without `--delete-user-a`, or **18/18** with
it. The destructive flag deletes test account A and is not safe to run against
accounts you want to keep.

**Last run (2026-11-05): not re-run.** Test account A was intentionally deleted
during the prior destructive verification, and the built-in email quota is
exhausted, so a fresh confirmed account cannot be created right now. Prior
result: 14/14 without deletion and 18/18 with deletion. Re-run this step after
creating fresh test accounts or configuring SMTP.

---

## 8. Manual smoke list (device / simulator)

These need a real device or emulator and cannot be covered by this repo's unit
tests or Expo Go:

| Check | Expected |
|-------|----------|
| `npx expo run:android` / `run:ios` builds | app installs and launches |
| `otwo://auth/confirm?code=fake` opens the app | app shows a verification error |
| `otwo://auth/reset?code=fake` opens the reset screen | app shows a reset error |
| Local notifications fire at the scheduled time | notification appears |
| Guest mode creates no cloud account | local-only session |
| Offline deletion → error, data intact | fail-closed behavior |
| iOS backup exclusion | `Documents/SQLite` excluded from backups |

Record device name, OS version, and build profile. Full steps:
[DEVICE_VERIFICATION.md](DEVICE_VERIFICATION.md).

**Last run (2026-11-05) — web smoke checks executed in a browser:**

| Check | Observed | Status |
|-------|----------|--------|
| Empty sign-in | alert: "Please enter both email and password." | Pass |
| Guest mode | entered onboarding; no cloud session created | Pass |
| Onboarding completion | built a 6-item Today plan | Pass |
| Checklist persistence | completed item survived a full reload | Pass |
| Doctor advice note | stored only in the account-scoped `sensitive_notes` key and displayed in the notes dialog | Pass |
| Doctor report | free-text symptom notes excluded by default; doctor advice notes never included | Pass |
| Symptom check-in | saved, appeared in Recent Logs, persisted in `symptom_logs` | Pass |
| Companion guardrail | answered a routine prompt; refused a dosage-change question and directed to a clinician/pharmacist | Pass |
| Air quality | showed "location permission is blocked"; no guessed location | Pass |
| Guest deletion | wiped all `localStorage` keys and returned to login | Pass |
| Native-only rows (builds, deep links, notifications, SQLCipher, iOS backup exclusion, screen readers, performance) | not executable without a device/emulator | Pending |

---

## 9. Evidence table

| Area | Step | Expected | Observed | Pass | Evidence |
|------|------|----------|----------|------|----------|
| Environment | `node` / `npm` | Node 24.x, npm 11.x | Node `v24.22.0`, npm `11.19.1` | Yes | command output |
| Doctor | `npx expo-doctor` | 20/20 | 20/20, no issues | Yes | command output |
| Tests | `npm test` | all pass | 78/78 pass | Yes | test summary |
| Typecheck | `tsc --noEmit` | clean | clean exit | Yes | command output |
| Lint | `npm run lint` | no errors | no errors | Yes | command output |
| Web build | `npm run build:web` | `dist/` + CSP + `_headers` + SW | 21 assets precached; CSP meta and `_headers` present | Yes | `dist/` inspection |
| CSP load | serve `dist/` | no console CSP violations | no violations; one benign `expo-notifications` web warning | Yes | browser console |
| Offline shell | `dist/` over localhost | loads offline | server stopped; Login rendered, no load error | Yes | browser reload |
| Web smoke | guest/onboarding/logs/companion/wipe | app flows work locally | all executed checks passed | Yes | section 8 table |
| Live script | `verify-supabase-live.mjs` | 14/14 (or 18/18 destructive) | not re-run; prior 14/14 and 18/18 | N/A | account A deleted, email quota exhausted |
| Device checks | builds/deep links/notifications/SQLCipher | verified on hardware | not executable here | Pending | no device/emulator |

---

## 10. Sign-off

- [x] All executed rows green; skipped rows marked N/A or Pending
- [x] No committed secrets in `.env*` or `supabase/functions/.env`
- [x] Device-only sections either executed or explicitly marked pending
- [x] Rerun this blueprint after any further change

Last run: **2026-11-05** (Node `v24.22.0`, npm `11.19.1`, Linux).

---

> **Status**: living document. Update it whenever a command or expected result
> changes. A skipped check is not a pass.
