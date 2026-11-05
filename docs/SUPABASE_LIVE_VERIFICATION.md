# Supabase Live Verification Runbook

This runbook verifies the parts of OTwo that cannot be proven without a real
Supabase project:

- Row Level Security (RLS) and cross-account/IDOR isolation
- Server-side account deletion and the client's fail-closed behavior
- Email-confirmation delivery and the native deep-link exchange
- Password-reset delivery, deep-link handling, and password update
- Auth rate limits and the app's 429 handling

It does **not** replace physical-device checks for SQLCipher, notifications,
iOS backup exclusion, performance, or screen-reader behavior. Record what was
actually observed; do not mark an item passed because the code looks correct.

Use a dedicated test project and disposable test accounts. Do not put real
health data in them.

---

## 0. Safety rules

- Use a new Supabase project, not production.
- Use two throwaway email accounts (plus aliases are fine).
- Never commit `.env.local`, the database password, access tokens, the
  service-role key, or the new `sb_secret_...` key.
- Never put a secret/service-role key in `EXPO_PUBLIC_*` or in the app bundle.
- Use a test device or emulator. Account deletion wipes local app data.
- Redact emails, tokens, and project secrets from screenshots and logs.

---

## 1. Prerequisites

- Node.js 20 or newer (this repo was validated on Node 24).
- npm and the repo dependencies: `npm ci`.
- Supabase account and an organization.
- A real inbox for account A and account B.
- Android Studio/SDK for an Android development build, or Xcode on macOS for
  iOS. Expo Go is not sufficient because it cannot open `otwo://` links.
- Optional Docker. The deployment command below uses `--use-api`, so Docker is
  not required.
- `jq` for the REST examples, or edit the commands to read JSON manually.

Baseline checks before starting:

```bash
npm test
npx tsc --noEmit
npx supabase@3.0.0 --version
```

The last command may need to download the CLI through `npx`. That is expected.
The repo is already initialized (`supabase/config.toml` and migrations exist);
do not run `supabase init` again.

---

## 2. Create the Supabase project

### Option A: CLI

```bash
npx supabase@3.0.0 login
npx supabase@3.0.0 orgs list
```

Copy the organization ID, then:

```bash
export SUPABASE_ORG_ID='your-org-id'
export SUPABASE_DB_PASSWORD='a-strong-unique-database-password'
npx supabase@3.0.0 projects create otwo-live-verify \
  --org-id "$SUPABASE_ORG_ID" \
  --db-password "$SUPABASE_DB_PASSWORD" \
  --region eu-central-1
```

Choose the region closest to you. Store the database password in a password
manager; it is not the app's publishable key.

```bash
npx supabase@3.0.0 projects list
export SUPABASE_PROJECT_REF='your-project-ref'
```

### Option B: Dashboard

Create a project in the Supabase Dashboard with the same name, region, and a
strong database password. Copy the project ref from **Project Settings >
General**.

Wait until the project reports healthy before continuing.

### Get the public client values

Dashboard: **Connect** or **Settings > API Keys**.

You need:

- Project URL: `https://<ref>.supabase.co`
- Publishable key: `sb_publishable_...`

The legacy `anon` JWT also works during Supabase's key migration. The
`service_role`/`sb_secret_...` key is only for backend code and must never be
used here.

CLI alternative:

```bash
npx supabase@3.0.0 projects api-keys --remote="$SUPABASE_PROJECT_REF"
```

Record the project ref, region, and date in the evidence table.

---

## 3. Link the repo and apply migrations

Run from the repository root (`/home/megalith/Downloads/OTwo`).

```bash
export SUPABASE_DB_PASSWORD='your-database-password'
npx supabase@3.0.0 link --project-ref "$SUPABASE_PROJECT_REF"
npx supabase@3.0.0 db push --remote --dry-run
npx supabase@3.0.0 db push --remote
```

The CLI v3 defaults `db push` to the local database. `--remote` is required to
target the linked hosted project.

Expected migrations, in filename order:

1. `20261027000000_initial_schema.sql`
2. `20261029000000_privacy_hardening.sql`

Verify in the SQL Editor:

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;

select relname, relrowsecurity
from pg_class
where relname in ('profiles', 'onboarding_responses', 'audit_logs');

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'onboarding_responses'
order by ordinal_position;

select to_regclass('public.sync_snapshots') as removed_sync_snapshots;
```

Expected:

- Both migration rows are present.
- `relrowsecurity = true` for all three tables.
- `onboarding_responses` has no `doctor_recommendations_encrypted` column.
- `removed_sync_snapshots` is `null`.

If `db push` reports no migrations, you are in the wrong directory or not
linked. If a migration fails, use a fresh test project rather than manually
editing the migration history unless you fully understand the repair.

---

## 4. Deploy the deletion Edge Function

```bash
npx supabase@3.0.0 functions deploy delete-account --use-api
npx supabase@3.0.0 functions list --remote="$SUPABASE_PROJECT_REF"
```

`--use-api` bundles the function server-side and avoids a local Docker
requirement. The function imports `npm:@supabase/supabase-js`.

The function reads the runtime-injected keys:

- `SUPABASE_PUBLISHABLE_KEYS` (new) or `SUPABASE_ANON_KEY` (legacy)
- `SUPABASE_SECRET_KEYS` (new) or `SUPABASE_SERVICE_ROLE_KEY` (legacy)

Do **not** try to set `SUPABASE_*` secrets manually; that prefix is reserved
for values Supabase injects. If the function reports "not configured", check
the deploy logs and the injected keys.

Verify JWT protection. With no `Authorization` header:

```bash
export SUPABASE_URL='https://<ref>.supabase.co'
export SUPABASE_ANON_KEY='sb_publishable_...'

curl -i -X POST "$SUPABASE_URL/functions/v1/delete-account" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"confirm":true}'
```

Expected: `401`, not `200`. The function also checks the caller's JWT itself,
but `verify_jwt = true` in `supabase/config.toml` is the first layer.

Dashboard: **Edge Functions > delete-account > Logs/Settings**. Confirm the
function is deployed and JWT verification is enabled.

---

## 5. Configure Supabase Auth

### 5.1 Providers

Dashboard: **Authentication > Providers**.

- Email: enabled.
- Confirm email: **ON**.
- Anonymous sign-ins: **OFF** (OTwo does not use them).
- Leaked password protection: recommended ON.
- CAPTCHA: leave OFF until the app is updated to send a CAPTCHA token.

### 5.2 URL configuration

Dashboard: **Authentication > URL Configuration**.

For a native-only verification, set:

- Site URL: `otwo://auth/confirm`
- Redirect URLs:
  - `otwo://auth/confirm`
  - `otwo://auth/reset`

For web development, also add:

- `http://localhost:8081/**`
- `https://YOUR_WEB_DOMAIN/**` (only if you deploy the web build)

The app calls `Linking.createURL('auth/confirm')` and
`Linking.createURL('auth/reset')`. The generated links are expected to be:

- `otwo://auth/confirm`
- `otwo://auth/reset`

If Supabase rejects an exact custom-scheme path, use `otwo://**` as a fallback,
then narrow it once the exact link format is confirmed. Do not use a broad
wildcard in production without reviewing it.

**Expo Go is not a valid target for this test.** Expo Go uses an `exp://` URL,
not `otwo://`, so email links will not open the app correctly. Build a
development client.

### 5.3 Email templates

For the first pass, leave the built-in **Confirm signup** and **Reset password**
templates unchanged. Their links use `{{ .ConfirmationURL }}`, which verifies
the token on Supabase's side and redirects to the app with a `?code=...`
parameter. The app handles that with `exchangeCodeForSession`.

Do **not** replace the href with `{{ .SiteURL }}/auth/confirm` unless you also
implement `token_hash` verification in the app. The current app handles:

- `?code=...` (PKCE)
- `?access_token=...&refresh_token=...` (legacy implicit fallback)

It does **not** handle `?token_hash=...&type=...` directly.

If you customize the template for branding, keep the `{{ .ConfirmationURL }}`
href or use the PKCE token-hash pattern only after adding app support.

### 5.4 SMTP and email delivery

The built-in Supabase email service is for smoke tests only: it is limited to
2 emails per hour and is best-effort. For any real deployment, configure custom
SMTP:

Dashboard: **Authentication > SMTP Settings**.

- Provider: Resend, SendGrid, Postmark, Amazon SES, Mailgun, etc.
- Sender email and name: a domain you control.
- Host, port, username, password: from the provider.
- TLS: enabled.
- Verify SPF, DKIM, and DMARC for the sending domain.
- Use **Send test email** and confirm delivery.

Check spam/junk and the Auth logs if a message does not arrive.

### 5.5 Rate limits

Dashboard: **Authentication > Rate Limits**.

Record the current values before changing anything. Defaults relevant to OTwo:

| Operation | Default |
| --- | --- |
| Sign-ups/sign-ins | 30 requests per 5 minutes per IP, burst 30 |
| Token endpoint | 150 requests per 5 minutes per IP, burst 30 |
| Emails sent (built-in) | 2 per hour |
| Per-user signup/reset resend | 60-second window |

For production, set the email-send limit to what your SMTP provider can safely
handle. Do not leave it unbounded.

---

## 6. Configure the app

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

- Use the publishable key. The legacy `anon` key also works.
- Never use the `service_role` or `sb_secret_...` key.
- `EXPO_PUBLIC_*` values are public and bundled into the app. That is expected
  for a publishable key.

Restart Metro with a cleared cache:

```bash
npx expo start -c
```

Build a development client, not Expo Go:

```bash
npx expo run:android
# or, on macOS:
npx expo run:ios
```

The native directories are generated and git-ignored. Do not edit them by hand.

If the app says cloud auth is not configured, the environment variables were
not loaded. Check that `.env.local` is at the repo root, restart Metro with
`-c`, and rebuild the development client.

### Deep-link pre-flight

The generated native configuration was checked during remediation:

- Android manifest contains an `android.intent.action.VIEW` filter with
  `android:scheme="otwo"`.
- iOS `Info.plist` contains `CFBundleURLSchemes` with `otwo`.

You can repeat the static check without a device:

```bash
npx expo prebuild --platform android --no-install --clean
grep -n 'android:scheme="otwo"' android/app/src/main/AndroidManifest.xml
rm -rf android

npx expo prebuild --platform ios --no-install --clean
grep -n -A 6 'CFBundleURLTypes' ios/OTwo/Info.plist
rm -rf ios
```

To prove the app receives a URL, send a deliberately fake code:

```bash
# Android
adb shell am start -a android.intent.action.VIEW -d "otwo://auth/confirm?code=fake"

# iOS simulator
xcrun simctl openurl booted "otwo://auth/confirm?code=fake"
```

The app should open and show an error that the link could not be verified. If
a browser opens instead, fix the native build/scheme before testing email.

---

## 7. Create two test accounts

Use distinct addresses, for example:

- `otwo.test.a+<timestamp>@yourdomain`
- `otwo.test.b+<timestamp>@yourdomain`

Do not use real names or real health details in the onboarding answers.

1. Sign up account A in the app. The app should say to check email, with no
   session yet.
2. Open the confirmation email on the same device and confirm.
3. Sign in as A and complete onboarding with obvious test values.
4. Repeat for account B, using different onboarding values.
5. Get both UUIDs from **Authentication > Users**, or:

```sql
select id, email, email_confirmed_at
from auth.users
where email like 'otwo.test.%@yourdomain'
order by created_at;
```

Record `A_ID` and `B_ID`.

Verify the cloud rows:

```sql
select id, email, age
from public.profiles
where id in ('A_ID', 'B_ID');

select user_id, personal_goals
from public.onboarding_responses
where user_id in ('A_ID', 'B_ID');
```

If the rows are missing, stop and fix that before testing RLS. The app's
onboarding upsert intentionally keeps local data working offline and catches
cloud errors, so a broken grant/RLS setup can be silent in the UI.

---

## 8. RLS and IDOR verification

Use both the SQL Editor (policy behavior) and PostgREST/curl (the real client
path). Use the test accounts only.

### 8.1 SQL Editor: policy behavior

Set `A_ID` and `B_ID` as appropriate. Run each block separately; an expected
error aborts a transaction, so keep failure tests isolated.

**As A: cross-account reads, updates, deletes**

```sql
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'A_ID';
set local request.jwt.claims = '{"sub":"A_ID","role":"authenticated"}';

select count(*) as own_profile
from public.profiles where id = 'A_ID';                 -- 1

select count(*) as other_profile
from public.profiles where id = 'B_ID';                 -- 0

select count(*) as other_onboarding
from public.onboarding_responses where user_id = 'B_ID';-- 0

select count(*) as other_audit
from public.audit_logs where user_id = 'B_ID';          -- 0

update public.profiles set age = 99
where id = 'B_ID' returning id;                         -- 0 rows

delete from public.profiles
where id = 'B_ID' returning id;                         -- 0 rows

update public.profiles set age = 31
where id = 'A_ID' returning id;                         -- 1 row

rollback;
```

**A cannot insert an audit log**

```sql
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'A_ID';
set local request.jwt.claims = '{"sub":"A_ID","role":"authenticated"}';

insert into public.audit_logs (user_id, action)
values ('A_ID', 'LIVE_VERIFICATION');
-- expected: permission denied

rollback;
```

**A cannot create a profile for B**

```sql
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'A_ID';
set local request.jwt.claims = '{"sub":"A_ID","role":"authenticated"}';

insert into public.profiles (id, email)
values ('B_ID', 'a@example.com');
-- expected: new row violates row-level security policy

rollback;
```

**A cannot create onboarding for B**

```sql
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'A_ID';
set local request.jwt.claims = '{"sub":"A_ID","role":"authenticated"}';

insert into public.onboarding_responses (user_id, personal_goals)
values ('B_ID', '["hacked"]'::jsonb);
-- expected: new row violates row-level security policy

rollback;
```

**Anonymous role**

```sql
begin;
set local role anon;

select count(*) from public.profiles;
-- expected: 0 or permission denied

rollback;
```

**RLS flags**

```sql
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname in ('profiles', 'onboarding_responses', 'audit_logs');
```

Expected: `relrowsecurity = true` for all three. `relforcerowsecurity = false`
is acceptable for client roles; it means the table owner can bypass RLS, which
is normal for migrations/admin work. Do not disable RLS.

### 8.2 PostgREST/curl: the real client path

```bash
export SUPABASE_URL='https://<ref>.supabase.co'
export SUPABASE_ANON_KEY='sb_publishable_...'
export A_ID='...'
export B_ID='...'
export A_EMAIL='...'
export A_PASSWORD='...'
export B_EMAIL='...'
export B_PASSWORD='...'
```

Sign in and capture tokens without printing them:

```bash
A_TOKEN=$(curl -sS -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$A_EMAIL\",\"password\":\"$A_PASSWORD\"}" \
  | jq -r '.access_token // empty')

B_TOKEN=$(curl -sS -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$B_EMAIL\",\"password\":\"$B_PASSWORD\"}" \
  | jq -r '.access_token // empty')

test -n "$A_TOKEN" && test -n "$B_TOKEN" && echo "tokens acquired"
```

A reads own profile (expected one row):

```bash
curl -sS "$SUPABASE_URL/rest/v1/profiles?select=id,email,age&id=eq.$A_ID" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $A_TOKEN" | jq
```

A reads B's profile (expected `[]`):

```bash
curl -sS "$SUPABASE_URL/rest/v1/profiles?select=id,email,age&id=eq.$B_ID" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $A_TOKEN" | jq
```

A tries to update B (expected `[]`):

```bash
curl -sS -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$B_ID" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $A_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"age":99}' | jq
```

Confirm B's age did not change:

```bash
curl -sS "$SUPABASE_URL/rest/v1/profiles?select=age&id=eq.$B_ID" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $B_TOKEN" | jq '.[0].age'
```

A tries to delete B (expected `[]`):

```bash
curl -sS -X DELETE "$SUPABASE_URL/rest/v1/profiles?id=eq.$B_ID" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $A_TOKEN" \
  -H "Prefer: return=representation" | jq
```

A tries to insert an audit log (expected 401/403, not 201):

```bash
curl -i -X POST "$SUPABASE_URL/rest/v1/audit_logs" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$A_ID\",\"action\":\"LIVE_VERIFICATION\"}"
```

A cannot read B's onboarding (expected `[]`):

```bash
curl -sS "$SUPABASE_URL/rest/v1/onboarding_responses?select=user_id,personal_goals&user_id=eq.$B_ID" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $A_TOKEN" | jq
```

A cannot insert onboarding for B (expected 401/403):

```bash
curl -i -X POST "$SUPABASE_URL/rest/v1/onboarding_responses" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$B_ID\",\"personal_goals\":[\"hacked\"]}"
```

A cannot upsert B's profile (expected error or `[]`; B unchanged):

```bash
curl -i -X POST "$SUPABASE_URL/rest/v1/profiles?on_conflict=id" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $A_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d "{\"id\":\"$B_ID\",\"email\":\"$A_EMAIL\",\"age\":99}"
```

Clear tokens from the shell when done:

```bash
unset A_TOKEN B_TOKEN A_PASSWORD B_PASSWORD
```

### 8.3 One-command repeatable check

The script `scripts/verify-supabase-live.mjs` runs the same checks against two
confirmed accounts and prints PASS/FAIL. It does not use a service-role key and
does not print tokens.

```bash
SUPABASE_URL="$SUPABASE_URL" \
SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
TEST_A_EMAIL="$A_EMAIL" TEST_A_PASSWORD="$A_PASSWORD" \
TEST_B_EMAIL="$B_EMAIL" TEST_B_PASSWORD="$B_PASSWORD" \
node scripts/verify-supabase-live.mjs
```

It seeds small verification rows for A and B. Add `--delete-user-a` only when
you are ready for section 9; A will be permanently deleted.

---

## 9. Account deletion verification

### 9.1 Rejected deletion leaves A intact

With A's token:

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/delete-account" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `400` with "Explicit confirmation is required."

Verify A can still read their profile:

```bash
curl -sS "$SUPABASE_URL/rest/v1/profiles?select=id&id=eq.$A_ID" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $A_TOKEN" | jq
```

Expected: one row.

Invalid token:

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/delete-account" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"confirm":true}'
```

Expected: `401`.

### 9.2 Successful deletion

Use the app UI for the full path:

**Settings > Delete Account & Wipe All Local Data > type `DELETE` > confirm.**

The app should call the function, sign out globally, wipe local data, and return
to the signed-out screen. Relaunch the app and verify no A data or reminders
remain.

To verify the server side independently:

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/delete-account" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirm":true}'
```

Expected: `200` with `{"success":true}`.

The old token must no longer resolve:

```bash
curl -i "$SUPABASE_URL/auth/v1/user" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $A_TOKEN"
```

Expected: `401`/`403`.

Verify the cascade in the SQL Editor:

```sql
select count(*) from auth.users where id = 'A_ID';                    -- 0
select count(*) from public.profiles where id = 'A_ID';               -- 0
select count(*) from public.onboarding_responses where user_id = 'A_ID'; -- 0
select count(*) from public.audit_logs where user_id = 'A_ID';        -- 0

select count(*) from public.profiles where id = 'B_ID';               -- 1
```

If you used curl instead of the app UI, the app still has local A data. Sign
out or clear app data, then test the UI wipe path separately.

### 9.3 Fail-closed local behavior (required)

Create/sign in as B with some local data (a completed checklist item, a symptom
log, or a doctor note). Then:

1. Turn on airplane mode or disable network access.
2. **Settings > Delete Account & Wipe All Local Data**.
3. Type `DELETE` and confirm.
4. Expected: the function call fails, the modal shows an error, B remains
   signed in, and the local data is still present.
5. Restore the network and retry.
6. Expected: server deletion succeeds and local data is wiped.

This proves the client does not destroy local data before the server confirms
deletion. Also check the function logs for the failed attempt.

### 9.4 Edge cases to record honestly

- If the network drops **after** the server processes deletion but before the
  response arrives, the app may keep local data and a dead session. The server
  account is gone. Clear app data/reinstall and verify the four zero counts.
- If the server deletion succeeds but local wipe fails, the app reports the
  wipe failure rather than claiming success. The account is already gone; clear
  app data manually. Record this as a residual resilience issue if observed.
- Do not retry a deletion after the auth user is gone and expect a different
  result; the function will return `401` because the session is invalid.

---

## 10. Email-confirmation verification

### 10.1 Signup remains sessionless

1. Sign out.
2. Sign up with a fresh A address.
3. Expected: "Account created. Check your email to confirm your address, then
   sign in." No onboarding, no session.

SQL check:

```sql
select email, email_confirmed_at, confirmation_sent_at
from auth.users
where email = 'the-new-address@yourdomain';
```

`email_confirmed_at` should be `null` before confirmation.

Try signing in before confirmation. Expected: failure ("Email not confirmed" or
equivalent) and no session.

### 10.2 Deliver and open the link

- Check the inbox and spam folder.
- Open the link on the **same device and app installation** that signed up.
- Expected link shape: `otwo://auth/confirm?code=...`.
- Expected app behavior: exchange the code, create the session, show onboarding.

If a browser opens instead:

```bash
# Android
adb shell am start -a android.intent.action.VIEW -d "PASTE_THE_EXACT_LINK_HERE"

# iOS simulator
xcrun simctl openurl booted "PASTE_THE_EXACT_LINK_HERE"
```

Then fix the native scheme/intent filter before production.

If the app says "PKCE code verifier not found" or "The sign-in link could not
be verified":

- The link was opened on a different device/browser.
- The app was reinstalled or its secure storage was cleared between signup and
  the click.
- The email template was changed in a way that drops the PKCE flow.

Request a new link and open it on the same device. Do not disable PKCE to work
around this.

Verify `email_confirmed_at` is now set, then sign in with the password.

### 10.3 Custom-template warning

Default templates are the safest first test. If you customize them, keep the
`{{ .ConfirmationURL }}` href. The app does not currently handle a raw
`token_hash` link. Changing to `{{ .SiteURL }}/auth/confirm?token_hash=...`
without app support will produce a link the app cannot exchange.

---

## 11. Password-reset verification

### 11.1 Request and deliver

1. Sign out.
2. Choose "Forgot password?" and enter A's address.
3. Expected: a generic success message, whether or not the address exists. This
   avoids account enumeration.
4. Open the email on the same device.
5. Expected link: `otwo://auth/reset?code=...`.
6. Expected app: the reset screen ("Choose a New Password"), not the normal
   sign-in screen.

### 11.2 Update the password

1. Enter a new password twice (at least 6 characters).
2. Save.
3. Expected: success, signed in, and the reset screen closes.
4. Sign out.
5. Old password: expected failure.
6. New password: expected success.

### 11.3 Negative cases

- Short password: client-side "at least 6 characters".
- Mismatched passwords: client-side "Passwords do not match".
- Reuse the same reset link: expected failure/expired; no session.
- Unknown email: generic success, no email sent.
- Open the link on a different device: expected PKCE verifier failure; request a
  new link on the correct device.
- Expired link: request a new one.

---

## 12. Rate-limit verification

Use the dedicated test project. Do not hammer production or real users.

### 12.1 Per-user reset cooldown (safe)

Request a reset for A twice within 60 seconds.

Expected second response: `429` or a message like "For security purposes, you
can only request this after X seconds." The app should display the message and
not crash.

Wait 60 seconds and retry. The request should be accepted again (subject to the
email-send quota).

### 12.2 Email-send limit

With the built-in provider, the project is limited to 2 emails per hour.
Trigger a third confirmation/reset email within the hour and expect `429`
("email rate limit exceeded").

With custom SMTP:

1. Record the current **Email sends** value.
2. Temporarily set it to 2 per hour on the test project.
3. Trigger three sends.
4. Expected: the third returns `429`.
5. Restore the original value immediately.

### 12.3 IP sign-in/token limit (optional, disposable project only)

The default is 30 requests per 5 minutes per IP, with a burst capacity of 30.
A few requests will not trigger it. To observe `429`, send 31+ rapid requests
with a wrong password:

```bash
for i in $(seq 1 35); do
  code=$(curl -s -o /dev/null -w '%{http_code}' \
    -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$A_EMAIL\",\"password\":\"wrong-password\"}")
  echo "$i $code"
  [ "$code" = "429" ] && break
done
```

Expected: eventually `429`. Then confirm the app shows the error and does not
create a session. Wait for the window to reset or use a different test IP.

If you changed any limit, restore it and record the original and restored
values in the evidence table.

---

## 13. Evidence and sign-off

Record only what you observed. Suggested table:

| Area | Test | Expected | Observed | Pass | Evidence |
| --- | --- | --- | --- | --- | --- |
| RLS | A reads own profile | 1 row | | | |
| RLS | A reads B profile | 0 rows | | | |
| RLS | A updates B profile | 0 rows; B unchanged | | | |
| RLS | A deletes B profile | 0 rows; B present | | | |
| RLS | A inserts audit log | denied | | | |
| RLS | A reads/writes B onboarding | denied/0 rows | | | |
| RLS | Anonymous read | 0 rows/denied | | | |
| Deletion | Missing confirm rejected | 400; A intact | | | |
| Deletion | Invalid token rejected | 401 | | | |
| Deletion | A deleted | 200 success | | | |
| Deletion | A token invalid | 401/403 | | | |
| Deletion | Auth/profile/onboarding/audit rows | 0 each | | | |
| Deletion | B still works | 1 row | | | |
| Deletion | Offline failure keeps local data | error; data intact | | | |
| Deletion | App UI wipe | local data gone | | | |
| Email | Signup without session | no session | | | |
| Email | Pre-confirmation sign-in | blocked | | | |
| Email | Confirmation link opens app | `otwo://auth/confirm` | | | |
| Email | Code exchange succeeds | session created | | | |
| Reset | Reset email delivered | yes | | | |
| Reset | Link opens app | `otwo://auth/reset` | | | |
| Reset | Password updated | new password works | | | |
| Reset | Old password rejected | yes | | | |
| Reset | Link reuse rejected | yes | | | |
| Rate limit | Reset cooldown | 429/message | | | |
| Rate limit | Email send limit | 429 | | | |
| Rate limit | IP sign-in limit | 429 (optional) | | | |
| Security | Advisor RLS findings | none for these tables | | | |
| Function | Logs | no errors/secret leak | | | |

### Live run results — 2026-11-04 (project `ooohwqvpuypzdsgqbdzi`, test accounts A + B)

**RLS / IDOR — verified, 14/14 automated checks passed**
- Anonymous client cannot read profiles: PASS — 0 rows.
- A can read own profile: PASS — 1 row.
- A cannot read B profile: PASS — 0 rows.
- A cannot update B profile: PASS — update affected 0 rows; B's age unchanged (40).
- A cannot delete B profile: PASS — delete affected 0 rows; B profile still present.
- A cannot insert audit log: PASS — denied.
- A cannot read/update/insert B onboarding: PASS — 0 rows / update affected 0 rows / insert denied; B goals unchanged.
- A cannot upsert B profile: PASS — denied; B age unchanged.
- A can read/update own onboarding and audit logs: PASS — own rows only.

**Account deletion — verified, 18/18 checks passed (including deletion run)**
- Missing `confirm` rejected: PASS — 400; A data intact.
- Function deletes A: PASS — success.
- A session invalidated after deletion: PASS — invalid.
- B still works after A deletion: PASS — B profile intact (1 row).

**Server-side cascade — verified**
- A's rows in `auth.users`, `public.profiles`, `public.onboarding_responses`, `public.audit_logs`: all 0.
- B still has their own profile row: 1.

**Email confirmation — verified via live sign-in**
- Signups returned no session and `email_verified: false`.
- Accounts subsequently confirmed and able to sign in with passwords (full RLS session established): PASS.

**Email send rate limit — verified live**
- Password-reset request after quota consumption: `429` / `over_email_send_rate_limit` / "email rate limit exceeded".

**Not yet completed (honest status)**
- Pre-confirmation sign-in block: not re-tested on a fresh unconfirmed account; signup response showed no session and `email_verified: false`, consistent with the expected behavior.
- Reset delivery/update, reset cooldown, IP sign-in limit: pending — blocked on SMTP / built-in 2-per-hour email quota being consumed by the two confirmation emails.
- App-side UI wipe, offline fail-closed device test, deep-link open behavior, function logs/advisor findings: device-blocked (no physical device / Expo Go cannot open `otwo://` links).

**Phase 2 (completed)**
- `src/services/supabaseErrors.ts`: new service translating Supabase auth errors into user-safe copy, with explicit rate-limit messages (email send limit, reset cooldown, too-many-attempts) plus pass-through for non-rate-limit errors.
- `src/store/useAuthStore.ts`: all auth flows now wrap Supabase calls (`signInWithPassword`, `signUp`, `resetPasswordForEmail`, `updateUser`, `exchangeCodeForSession`, `setSession`, `getSession`) with `withRetry`. The retry service retries transient errors (network, rate limit, 5xx) with exponential backoff (1s, 2s, 4s), and auth errors surface via `describeAuthError` with actionable copy.
- `tests/supabaseErrors.test.ts`: 7 regression tests covering rate-limit detection, message generation, code pass-through, and null-message fallback.
- `tests/supabaseRetry.test.ts`: 4 regression tests covering retry logic, rate-limit detection, non-transient error handling, and code pass-through.
- Validation at the time: 70/70 tests passed; `tsc --noEmit` clean; `eslint` clean on changed files.

**Phase 3 (web hardening, resilience, release readiness)**
- Web CSP: moved the service-worker registration to `public/register-sw.js` so the exported HTML has no inline scripts. `scripts/inject-web-csp.js` injects a strict CSP meta tag into `dist/index.html` and writes `dist/_headers`. The policy source is `src/constants/webSecurity.json`.
- CSP directives: `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'` (header only), `connect-src` limited to self, Supabase, and Open-Meteo. `style-src` allows inline styles because `react-native-web` injects them at runtime.
- Security headers: HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, a permissions policy that only allows geolocation, COOP/CORP, and no-cache rules for `sw.js` and `manifest.json`.
- Resilience: native Supabase token auto-refresh now follows `AppState` via `useAuthAutoRefresh`. Cloud restore now distinguishes a network failure from "no saved plan" instead of claiming the plan does not exist.
- Release readiness: added `docs/RELEASE_CHECKLIST.md` and `docs/DEVICE_VERIFICATION.md`; added initial iOS `buildNumber` and Android `versionCode` to `app.json`; the existing `eas.json` profiles are documented.
- Offline shell: the service worker now falls back to the cached app shell on a failed navigation response (including a proxy 5xx), not only on a thrown network error. Verified by stopping the local static server and reloading: the app still rendered with no load error.
- Validation: 78/78 tests pass; `tsc --noEmit` clean; `npm run lint` clean; the built `dist/` was loaded in a browser under the injected CSP with no CSP violations (only a benign `expo-notifications` web warning).
- Not verified: real hosting applies `dist/_headers` (the local Python static server does not), store submission/signing, and device-only checks.

Also record:

- Project ref and region
- Migration versions applied
- Function deployment time and `verify_jwt` state
- App build type, device/OS, and date
- Exact redirect URLs configured
- Any limit values changed and restored

---

## 14. Teardown

1. Delete test account B (and any leftovers) from **Authentication > Users** or
   through the app.
2. Delete the test project if it is no longer needed:
   `npx supabase@3.0.0 projects delete "$SUPABASE_PROJECT_REF"` (destructive).
3. Remove `.env.local` or replace its values with placeholders.
4. Do not commit evidence containing emails, tokens, or secrets.
5. If a key was exposed, rotate it in **Settings > API Keys**.

---

## 15. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "Cloud sign-in is not configured" | `.env.local` missing/misspelled, or Metro not restarted | Fix file, `npx expo start -c`, rebuild the dev client |
| "Invalid login credentials" | Wrong password, unconfirmed email, or deleted user | Confirm email; check Authentication > Users |
| Confirmation email not received | SMTP not configured, spam, rate limit, wrong address | Check Auth logs/SMTP; wait for the email quota; try another address |
| Link opens a browser | Native scheme/intent filter missing or stale build | Rebuild the dev client; verify `otwo` in the manifest/Info.plist |
| "PKCE code verifier not found" | Link opened on another device/browser or storage cleared | Request a new link and open it on the same device |
| "Email not confirmed" | Confirmation still pending | Open the confirmation link; check `email_confirmed_at` |
| Onboarding works locally but no cloud rows | RLS/grant error swallowed by the offline catch | Run the SQL/curl RLS checks; fix grants/policies |
| "permission denied for table" | Table grant missing | Check default privileges; do not disable RLS |
| "new row violates row-level security policy" | Wrong `user_id`/`auth.uid()` or profile missing | Create the profile first; ensure `user_id = auth.uid()` |
| Deletion returns 500 "not configured" | Function cannot read injected keys | Redeploy the updated function; check Edge Function logs |
| Deletion returns 401 | Session expired or user already deleted | Sign in again, or verify the account is gone |
| `429` from Auth | Rate limit | Wait for the window; check Authentication > Rate Limits |
| `db push` says no migrations | Wrong directory or not linked | Run from repo root; `supabase link`; use `--remote` |
| `functions deploy` fails bundling | No Docker/local bundler issue | Add `--use-api` |
| Web CORS error | Function/browser preflight | Check the function's CORS headers and browser console |

---

## 16. What this runbook does not prove

- SQLCipher encryption at rest or the SecureStore key flow on a physical device
- iOS backup exclusion on a real device
- Local notification delivery or Android channel behavior
- Low-end-device performance
- Screen-reader and accessibility behavior
- EAS build/submission credentials or store review
- Web PWA offline navigation outside the browser harness

Those require separate device/build verification and should be reported
separately.
