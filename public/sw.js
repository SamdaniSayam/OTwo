/* OTwo service worker
 *
 * Provides an offline app shell for the web build. Native builds do not use
 * this file. The build script (scripts/generate-service-worker.js) replaces the
 * marker below with the list of exported assets so an installed app can start
 * without a network connection after the first visit.
 *
 * Data requests to Supabase and environment APIs are never cached here.
 */

const CACHE_VERSION = 'otwo-__BUILD_VERSION__';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];
const PRECACHE_MANIFEST = self.__OTWO_PRECACHE__ || [];
const PRECACHE_URLS = Array.from(new Set([...APP_SHELL, ...PRECACHE_MANIFEST]));

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: 'reload' }));
          } catch {
            // A single missing asset must not block the whole install.
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname === '/sw.js') return false;
  // Never cache the Metro development bundle or hot-update payloads.
  if (
    url.pathname.includes('.bundle') ||
    url.pathname.includes('hot-update') ||
    url.searchParams.get('dev') === 'true'
  ) {
    return false;
  }
  return true;
}

async function updateStaticCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return null;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cachedShell =
          (await cache.match('/index.html')) || (await cache.match('/'));

        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put('/index.html', response.clone());
            return response;
          }
          // A proxy or host can return 5xx while the device is effectively
          // offline. Prefer the cached app shell over an error page so an
          // installed app still starts. With no cached shell, surface the
          // real response instead of inventing success.
          return cachedShell || response;
        } catch {
          return (
            cachedShell ||
            new Response('Offline and no cached app shell is available.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }
      })()
    );
    return;
  }

  if (!isCacheableAsset(url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request);
      if (cached) {
        event.waitUntil(updateStaticCache(request));
        return cached;
      }
      const fresh = await updateStaticCache(request);
      return (
        fresh ||
        new Response('Offline and asset is not cached.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      );
    })()
  );
});
