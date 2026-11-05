import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import policy from '../src/constants/webSecurity.json';

function findDirective(csp: string, name: string): string | undefined {
  return csp
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive === name || directive.startsWith(`${name} `));
}

test('meta CSP locks down scripts and plugins without inline script execution', () => {
  assert.ok(findDirective(policy.metaCsp, 'default-src') === "default-src 'self'");
  assert.ok(findDirective(policy.metaCsp, 'script-src') === "script-src 'self'");
  assert.ok(findDirective(policy.metaCsp, 'object-src') === "object-src 'none'");
  assert.ok(findDirective(policy.metaCsp, 'base-uri') === "base-uri 'self'");

  assert.ok(!policy.metaCsp.includes("'unsafe-eval'"), 'CSP must not allow eval');
  assert.ok(
    !/(?:^|;\s*)script-src[^;]*'unsafe-inline'/.test(policy.metaCsp),
    'script-src must not allow inline scripts'
  );
});

test('header CSP adds protections that a meta tag cannot express', () => {
  assert.ok(findDirective(policy.headerCsp, 'frame-ancestors') === "frame-ancestors 'none'");
  assert.ok(policy.headerCsp.includes('upgrade-insecure-requests'));
});

test('connect-src is limited to the app and its two data providers', () => {
  const connect = findDirective(policy.metaCsp, 'connect-src');
  assert.ok(connect, 'connect-src must be present');
  assert.ok(connect!.includes("'self'"));
  assert.ok(connect!.includes('https://*.supabase.co'));
  assert.ok(connect!.includes('wss://*.supabase.co'));
  assert.ok(connect!.includes('https://air-quality-api.open-meteo.com'));
  assert.ok(
    !/(?:^|\s)https:\/\/\*(?:\s|;|$)/.test(connect!),
    'connect-src must not allow every HTTPS origin'
  );
});

test('security headers cover sniffing, referrers, permissions, and HSTS', () => {
  assert.equal(policy.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(policy.headers['Referrer-Policy'], 'no-referrer');
  assert.match(policy.headers['Permissions-Policy'], /geolocation=\(self\)/);
  assert.match(policy.headers['Permissions-Policy'], /camera=\(\)/);
  assert.match(policy.headers['Strict-Transport-Security'], /max-age=\d+/);
  assert.equal(policy.headers['Cross-Origin-Opener-Policy'], 'same-origin');
});

test('service worker and manifest are not cached as immutable', () => {
  const sw = policy.cacheHeaders.find((entry) => entry.path === '/sw.js');
  const manifest = policy.cacheHeaders.find((entry) => entry.path === '/manifest.json');
  assert.equal(sw?.['Cache-Control'], 'no-cache');
  assert.equal(manifest?.['Cache-Control'], 'no-cache');
});
