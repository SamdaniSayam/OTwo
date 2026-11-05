import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '../..');
const publicDir = resolve(projectRoot, 'public');

test('PWA manifest is installable and references local icons', () => {
  const manifest = JSON.parse(readFileSync(resolve(publicDir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.ok(Array.isArray(manifest.icons));

  const sizes = new Set(manifest.icons.map((icon: { sizes: string }) => icon.sizes));
  assert.ok(sizes.has('192x192'));
  assert.ok(sizes.has('512x512'));
  assert.ok(
    manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')
  );

  for (const icon of manifest.icons) {
    assert.ok(existsSync(resolve(publicDir, icon.src.replace(/^\//, ''))), icon.src);
  }
});

test('service worker implements an offline app shell', () => {
  const sw = readFileSync(resolve(publicDir, 'sw.js'), 'utf8');
  assert.match(sw, /addEventListener\('install'/);
  assert.match(sw, /addEventListener\('activate'/);
  assert.match(sw, /addEventListener\('fetch'/);
  assert.match(sw, /request\.mode === 'navigate'/);
  assert.match(sw, /self\.__OTWO_PRECACHE__/);
  assert.match(sw, /cache\.match\('\/index\.html'\)/);
  assert.match(sw, /url\.origin !== self\.location\.origin/);
});

test('offline navigation falls back to the cached shell on failed responses', () => {
  const sw = readFileSync(resolve(publicDir, 'sw.js'), 'utf8');
  assert.match(sw, /const cachedShell =/);
  assert.match(sw, /return cachedShell \|\| response;/);
  assert.match(sw, /if \(response\.ok\) \{\s*await cache\.put\('\/index\.html'/);
});

test('HTML links the manifest and registers the service worker externally', () => {
  const html = readFileSync(resolve(publicDir, 'index.html'), 'utf8');
  assert.match(html, /rel="manifest" href="\/manifest\.json"/);
  assert.match(html, /<script src="\/register-sw\.js" defer><\/script>/);
  assert.ok(
    !/<script(?![^>]*\bsrc=)[^>]*>/i.test(html),
    'the template must not contain inline scripts under script-src self'
  );
  assert.match(html, /name="theme-color" content="#2F5D50"/);

  const registration = readFileSync(resolve(publicDir, 'register-sw.js'), 'utf8');
  assert.match(registration, /navigator\.serviceWorker\.register\('\/sw\.js'\)/);
});

test('build step generates the precache manifest after export', () => {
  const script = readFileSync(
    resolve(projectRoot, 'scripts/generate-service-worker.js'),
    'utf8'
  );
  assert.match(script, /__OTWO_PRECACHE__/);
  assert.match(script, /dist/);
});
