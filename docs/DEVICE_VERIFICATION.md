# OTwo — Device Verification Checklist

This checklist covers behavior that **cannot** be verified in this repository,
in Expo Go, or on a machine without a physical device. It is intentionally
separate from the automated tests. Record the device, OS version, build type,
and date for every run.

> Expo Go cannot be used for native health data: the app refuses to open a
> plaintext database without SQLCipher. Use a development or production build.

---

## 1. Environment record

| Field | Value |
|-------|-------|
| App version / build | |
| Platform (iOS / Android) | |
| OS version | |
| Device model | |
| Build profile | development / preview / production |
| Date | |
| Tester | |

---

## 2. Local encryption at rest (native)

**Goal:** health data is stored in a SQLCipher database, and the key is not in
the database file or logs.

Steps:

1. Install a development or production build.
2. Complete onboarding and add a symptom note with a unique marker string.
3. Locate the app database:
   - iOS: `Documents/SQLite/` in the app container
   - Android: app databases directory
4. Confirm the database file does **not** start with the plaintext SQLite header
   `SQLite format 3`.
5. Search the database bytes for the marker string. It must not appear in
   plaintext.
6. Confirm the key is stored in SecureStore / Keychain / Keystore, not in the
   database or exported files.
7. Force-quit and reopen. Data must still load.

Expected: encrypted database, no plaintext marker, key retrievable only from the
platform keystore.

---

## 3. iOS backup exclusion

**Goal:** `Documents/SQLite` is excluded from iCloud/iTunes backups.

Steps:

1. Build and launch on iOS.
2. Inspect the database directory's `NSURLIsExcludedFromBackupKey` (via a debug
   build log, a small verification screen, or `xcrun simctl` tooling).
3. Confirm the database, `-wal`, and `-shm` files are covered.

Expected: the directory is excluded. Files outside `Documents/SQLite` are not
covered by this plugin.

---

## 4. Authentication deep links

**Goal:** confirmation and reset links open the app, not a browser.

Steps:

1. Sign up with a real email address.
2. Open the confirmation link. It must open OTwo (`otwo://auth/confirm?code=...`).
3. Confirm the app exchanges the PKCE code and signs in.
4. Request a password reset and open `otwo://auth/reset?code=...`.
5. Confirm the dedicated reset screen opens and the new password works.
6. Test an expired or malformed link. The app must show an error, not crash.

Expected: links open the app and the session is established explicitly.

---

## 5. Notifications

**Goal:** reminders are local-only and the app reports permission honestly.

Steps:

1. Deny notification permission. The app must show "denied" and must not claim
   reminders are scheduled.
2. Grant permission. Add a reminder one minute in the future.
3. Confirm the notification fires with the configured label.
4. Delete or disable the reminder. Confirm the scheduled notification is
   cancelled.
5. Background and foreground the app. Confirm no duplicate notifications.
6. Confirm no remote push token is registered or sent.

Expected: local scheduling only; denial is visible.

---

## 6. Offline and fail-closed behavior

**Goal:** cloud failures never destroy local data or fake success.

Steps:

1. Enable airplane mode.
2. Try cloud sign-in. The app must show a network error and must not create a
   local cloud session.
3. Continue as guest. Local features must still work.
4. Attempt account deletion while offline. The app must keep local data and show
   an error.
5. Reconnect and retry deletion. Server deletion must succeed before local wipe.
6. Reload the web app offline. The app shell must load; data requests must fail
   visibly rather than showing invented data.

Expected: fail closed, no silent data loss.

---

## 7. Account deletion and wipe

**Goal:** deletion removes server rows and all local data.

Steps:

1. Create a test account with onboarding data and local health data.
2. Settings → Delete Account → type `DELETE`.
3. Confirm the server account is gone and the token no longer works.
4. Confirm the local database, SecureStore key, AsyncStorage entries, and cached
   profile are gone.
5. Sign in again. The app must not restore the deleted account.
6. Repeat as a guest. Guest data must be wiped.

Expected: permanent, complete deletion with no stale local rows.

---

## 8. Screen readers and accessibility

Test with VoiceOver (iOS) and TalkBack (Android):

1. Every button, input, switch, and checklist item has a meaningful label.
2. Headings are announced as headings.
3. Error banners are announced (`assertive` live region).
4. Modals announce as dialogs and trap focus.
5. Controls meet the minimum touch target.
6. Dynamic type / large text does not clip critical labels.
7. Color contrast is sufficient in light mode.

Expected: the full onboarding, today, symptoms, and settings flows are usable
without sight.

---

## 9. Performance on a low-end device

1. Cold start to interactive screen: record seconds.
2. Scroll the today checklist and symptom history: record dropped frames.
3. Open and close modals repeatedly: no visible jank or memory growth.
4. Background for 10 minutes, return: session refresh and UI recovery work.
5. Air quality fetch timeout: the UI shows an unavailable state, not a hang.

Record device class and results. Do not claim performance targets without data.

---

## 10. Web/PWA

1. Build with `npm run build:web` and serve `dist/` over HTTPS.
2. Install the PWA. Reload offline; the app shell must load.
3. Confirm the browser console has no CSP violations.
4. Confirm response headers match `dist/_headers`.
5. Inspect `localStorage`: confirm per-account keys and no plaintext secrets
   beyond what the app documents. Web storage is **not** encrypted.
6. Deny geolocation. Air quality must show an honest enable/retry state.
7. Delete the account. Confirm local keys are removed.
8. Try the app in a second browser profile. It must not see the first profile's
   data.

---

## 11. Sign-off

- [ ] All sections above executed
- [ ] Evidence attached (logs, screenshots, file checks)
- [ ] Known failures filed with reproduction steps
- [ ] No claim of "verified" for any skipped section

> A skipped check is not a pass. Report it as pending.
