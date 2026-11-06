# OTwo — Deployment Guide

Two independent deliverables ship from this repo:

| Target | Artifact | Command |
|--------|----------|---------|
| Web app (fixed URL) | `dist/` | `npm run build:web` |
| Android app | AAB or APK | `npx eas-cli build -p android` |
| iOS app | IPA | `npx eas-cli build -p ios` |

The web app and the native apps share the same code, but they store data
differently. Native builds use SQLCipher. The web build uses `localStorage`,
which is readable by same-origin JavaScript. Do not describe the web build as
encrypted at rest.

---

## 1. Deploy the web app to a fixed URL

### Recommended: Cloudflare Pages

Cloudflare Pages honors both `dist/_headers` and `dist/_redirects`, so the CSP,
HSTS, permissions policy, and SPA fallback are applied without extra config. The
free tier gives a permanent `https://<project>.pages.dev` URL and supports a
custom domain with automatic HTTPS.

1. Push this repo to GitHub (already done: `SamdaniSayam/OTwo`).
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repo and set:

   | Setting | Value |
   |---------|-------|
   | Framework preset | None |
   | Build command | `npm run build:web` |
   | Build output directory | `dist` |
   | Node version | `24` (add `NODE_VERSION=24` if the build image is older) |

4. Add the public build variables under **Settings → Environment variables**:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```

   These values are bundled into the client. Never add a `service_role` or
   `sb_secret_...` key here.

5. Deploy. The fixed URL is `https://<project>.pages.dev`.

Command-line alternative after `npx wrangler login`:

```bash
npm run build:web
npx wrangler pages deploy dist --project-name otwo
```

### Alternative: Netlify

Netlify also honors `_headers` and `_redirects`.

```bash
npm run build:web
npx netlify-cli deploy --prod --dir=dist
```

Set the same build command, output directory, Node version, and environment
variables in the Netlify dashboard.

### Alternative: Vercel

Vercel ignores `_headers` and `_redirects`. Add a root `vercel.json`:

```json
{
  "buildCommand": "npm run build:web",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Then copy the header values from the generated `dist/_headers` into
`vercel.json` (`headers` array) or the Vercel dashboard. If you skip that step
the meta CSP still applies, but HSTS, `frame-ancestors`, and the permissions
policy do not.

### Do not use GitHub Pages

GitHub Pages does not serve `_headers`, and its SPA fallback needs a manual
`404.html` copy of `index.html`. It is workable but loses the header layer.

### Why `_redirects` matters

`app.json` sets `web.output: "single"`, so Expo Router is a client-side app. A
fresh request to `https://<domain>/settings` or `https://<domain>/auth/reset`
must return `index.html`. Without the fallback those URLs return 404 before the
service worker is installed. `npm run build:web` writes:

```
/*    /index.html   200
```

---

## 2. Point Supabase Auth at the live URLs

The app uses PKCE with `detectSessionInUrl: false` and handles redirects
explicitly, so the exact URLs must be allowlisted.

In **Supabase → Authentication → URL Configuration**:

- **Site URL**: `https://<your-domain>` (or the `pages.dev` URL)
- **Redirect URLs** — add all that apply:

  ```
  https://<your-domain>/auth/confirm
  https://<your-domain>/auth/reset
  otwo://auth/confirm
  otwo://auth/reset
  ```

Without the web entries, email confirmation and password reset links redirect to
an unlisted URL and the app cannot exchange the code.

### Configure SMTP before public launch

Supabase's built-in email sender is rate-limited (a few messages per hour) and is
not intended for production. Configure **Authentication → Emails → SMTP
Settings** with a real provider before inviting users. Until then, signup and
reset emails can fail with a rate-limit error.

---

## 3. Verify the live web deployment

```bash
# Headers are actually applied (not just the meta tag)
curl -sI https://<your-domain>/ | grep -i -E 'content-security-policy|strict-transport-security|permissions-policy'

# SPA fallback works for a deep link
curl -s -o /dev/null -w '%{http_code}\n' https://<your-domain>/settings   # expect 200

# Service worker and manifest are reachable
curl -s -o /dev/null -w '%{http_code}\n' https://<your-domain>/sw.js
curl -s -o /dev/null -w '%{http_code}\n' https://<your-domain>/manifest.json
```

Then in a browser:

- [ ] The app loads at the fixed URL with no CSP violations in the console.
- [ ] Reloading `/settings` directly loads the app instead of a 404.
- [ ] The install icon appears in the address bar and installs as a standalone app.
- [ ] After the first load, disabling the network and reloading still opens the app shell.
- [ ] Sign-up confirmation and password reset arrive and complete on the live domain.
- [ ] Guest mode works without a cloud account.
- [ ] Deleting a guest account clears `localStorage` and returns to login.

After a new deploy, the service worker calls `skipWaiting()` and `clients.claim()`,
so the new cache takes over on the next load. If a tab still shows the previous
build, reload once.

---

## 4. Ship the native apps

### One-time setup

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # links the EAS project and writes extra.eas.projectId
```

`eas.json` is already configured:

- `development` — development client, internal distribution
- `preview` — internal distribution, Android APK
- `production` — store build, `autoIncrement: true`

`appVersionSource` is `remote`, so EAS tracks `versionCode`/`buildNumber`. Bump
`expo.version` in `app.json` (for example `1.0.0` → `1.0.1`) for each
user-facing release; EAS increments the build numbers automatically.

### Android

Store build (recommended for "anyone can install"):

```bash
npx eas-cli@latest build -p android --profile production
npx eas-cli@latest submit -p android --profile production
```

A Google Play developer account is required (currently a one-time fee; check the
Play Console for the current price). The production build produces an AAB.

Direct install without a store:

```bash
npx eas-cli@latest build -p android --profile preview
```

The `preview` profile produces an APK. Attach it to a GitHub Release:

```bash
gh release create v1.0.0 ./otwo.apk --title "OTwo 1.0.0" --notes "Android APK"
```

Anyone can then install it after enabling "install unknown apps". Sideloaded
users do not receive store updates; they must download each new APK.

### iOS

An Apple Developer Program membership is required (currently an annual fee).
There is no general sideloading path for the public.

```bash
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios --profile production
```

For a smaller audience, `preview` builds can be distributed through internal
distribution or TestFlight (external testers are supported up to the current
Apple limit).

### Store metadata

Privacy text, screenshots, medical disclaimers, and data-safety answers must
match what the app actually does:

- Local-first, no analytics or crash-reporting SDK.
- No OTA update channel is configured.
- Doctor advice notes are local-only and never uploaded.
- The app is a non-medical companion, not a diagnostic device.

The preflight checklist is in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

---

## 5. Updating the fixed URL

Every push to the connected branch can trigger a Cloudflare Pages or Netlify
build. Keep the pipeline honest:

1. `npm test`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `npm run build:web`
5. Re-run the live verification list in section 3.

The full local gate is in [LOCAL_TEST_BLUEPRINT.md](LOCAL_TEST_BLUEPRINT.md).
