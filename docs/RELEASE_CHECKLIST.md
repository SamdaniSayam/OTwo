# OTwo — Release Checklist

Status: **draft, not yet executed end to end.** This repository has no store
credentials, signing keys, or physical devices attached. Every box below must be
checked by a release owner with those resources. Do not mark the app "released"
or "store-ready" until they are.

---

## 1. Preflight (must be green)

Run from the repository root:

```bash
npm ci
npm run lint
npm test
npx tsc --noEmit
npx expo-doctor
npm run build:web
```

Expected:

| Check | Expected |
|-------|----------|
| `npm run lint` | no errors |
| `npm test` | all tests pass |
| `npx tsc --noEmit` | clean |
| `npx expo-doctor` | 20/20 checks pass (or only documented warnings) |
| `npm run build:web` | `dist/` with `index.html`, `sw.js`, `_headers` |

Also confirm no secrets are tracked:

```bash
git ls-files | grep -E '(^|/)\.env' || true
```

Only `.env.example` may appear.

---

## 2. Environment and EAS setup

Public client values (safe to embed in the bundle):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable/anon key only)

Never put the Supabase service-role key in the app or in `EXPO_PUBLIC_*`.
The service-role key belongs only in the `delete-account` Edge Function's
server-side environment.

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # first time only; links an EAS project
npx eas-cli@latest env:create --name production --visibility plaintext \
  --value "https://<project-ref>.supabase.co"   # EXPO_PUBLIC_SUPABASE_URL
npx eas-cli@latest env:create --name production --visibility plaintext \
  --value "<publishable-key>"                    # EXPO_PUBLIC_SUPABASE_ANON_KEY
```

The committed `eas.json` defines:

- `development`: development client, internal distribution
- `preview`: internal distribution, Android APK
- `production`: store build, remote version auto-increment

---

## 3. Backend readiness

- [ ] Migrations applied to the production project (`supabase db push --remote`)
- [ ] RLS enabled on `profiles`, `onboarding_responses`, `audit_logs`
- [ ] `delete-account` Edge Function deployed with `verify_jwt: true`
- [ ] Service-role key set only in the function environment
- [ ] Auth redirect URLs include `otwo://auth/confirm` and `otwo://auth/reset`
- [ ] SMTP configured for production email delivery
- [ ] Email confirmation required
- [ ] Password-reset flow tested end to end
- [ ] `scripts/verify-supabase-live.mjs` passes against a staging project

See [SUPABASE_LIVE_VERIFICATION.md](SUPABASE_LIVE_VERIFICATION.md).

---

## 4. Native builds

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

Before submitting:

- [ ] Android `versionCode` / iOS `buildNumber` incremented (EAS remote source)
- [ ] `app.json` version matches the intended release
- [ ] Android backup disabled (`android.allowBackup: false`)
- [ ] iOS backup-exclusion plugin runs and covers `Documents/SQLite`
- [ ] SQLCipher enabled (`expo-sqlite` plugin `useSQLCipher: true`)
- [ ] No development menu or debug logging in the production bundle
- [ ] Install the production build on a physical device and complete
      [DEVICE_VERIFICATION.md](DEVICE_VERIFICATION.md)

---

## 5. Web release

Build:

```bash
npm run build:web
```

Deploy the **`dist/`** directory to a trusted HTTPS host you control. The build
writes `dist/_headers` for hosts that support it (Netlify, Cloudflare Pages).
For other hosts, copy the same headers into the host configuration.

Required response headers (already generated into `dist/_headers`):

- `Content-Security-Policy` with `script-src 'self'` (no `'unsafe-inline'` for scripts)
- `frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy` with `geolocation=(self)` and camera/microphone disabled
- `Cross-Origin-Opener-Policy: same-origin`
- `Strict-Transport-Security`
- `Cache-Control: no-cache` for `/sw.js` and `/manifest.json`

Hosting rules:

- [ ] HTTPS only; HTTP redirects to HTTPS
- [ ] No third-party scripts, tag managers, or analytics injected into the page
- [ ] No untrusted subdomains share the app origin
- [ ] If Supabase uses a custom domain, add it to `connect-src` in
      `src/constants/webSecurity.json` and rebuild
- [ ] `dist/index.html` contains the CSP meta tag (defense in depth)
- [ ] Browser console shows no CSP violations on first load
- [ ] PWA installs, reloads offline, and serves the app shell
- [ ] `localStorage` is treated as readable by same-origin JavaScript; do not
      claim web storage is encrypted

Verify headers after deployment:

```bash
curl -sI https://<your-domain>/ | grep -iE 'content-security-policy|strict-transport|x-content-type|referrer|permissions'
```

---

## 6. Store metadata and disclosures

- [ ] App name, subtitle, description, screenshots, and category
- [ ] Privacy policy URL (must describe local storage, optional Supabase cloud
      fields, Open-Meteo requests, and deletion)
- [ ] Medical disclaimer visible in the store listing and in the app:
      OTwo is not a medical device and does not provide medical advice
- [ ] Data safety / privacy nutrition labels:
      - local health data stored on device
      - optional account email and non-sensitive onboarding fields
      - no ads, no tracking SDKs, no remote push
      - account deletion available in-app
- [ ] Age rating and health-content declarations
- [ ] Support URL and contact email
- [ ] Export-compliance answer (encryption: standard OS-provided encryption)

---

## 7. Versioning and updates

- [ ] `app.json` `version` updated
- [ ] iOS `buildNumber` / Android `versionCode` handled by EAS remote source
- [ ] Git tag created for the release commit
- [ ] Release notes written

Over-the-air updates are **not configured**. `expo-updates` is not installed.
If OTA updates are added later, configure `runtimeVersion` and a signing
certificate, and document the rollback procedure before shipping.

---

## 8. Post-release verification

- [ ] Production build launches on a clean device
- [ ] Guest mode works with no account
- [ ] Cloud sign-in, sign-up, confirmation, and reset work
- [ ] Account deletion removes server rows and local data
- [ ] Notifications schedule and cancel
- [ ] Deep links open the app
- [ ] Air quality shows a real reading or an honest unavailable state
- [ ] No crash on first launch, rotation, backgrounding, or low memory

---

## 9. Rollback

- Native: keep the previous store build available; halt staged rollout if a
  crash or data-loss issue appears.
- Web: redeploy the previous `dist/` artifact and keep the old service-worker
  cache version; the new worker deletes old caches on activation.
- Backend: migrations are additive. Do not delete columns or tables in a hotfix
  without a backward-compatible app release.

---

## 10. Honest limitations

These remain true until verified on real infrastructure and devices:

- Web storage is not encrypted by the app.
- Native SQLCipher, Keychain/Keystore, iOS backup exclusion, notifications,
  deep links, and screen-reader behavior require a physical build.
- There is no remote push, no crash-reporting SDK, and no analytics.
- Store submission, signing, and SMTP delivery have not been performed in this
  repository.
