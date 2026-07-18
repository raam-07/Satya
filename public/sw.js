// SatyaDheesh service worker — SAFE caching recipe (no stale-version trap).
//
//   • Navigations (HTML): NETWORK-FIRST — always try fresh; use cache only
//     when offline. Users can never get stuck on an old page.
//   • Next static assets (/_next/static/*, content-hashed): CACHE-FIRST —
//     safe because a new deploy changes the filenames.
//   • Everything else (API/data, images): NETWORK-FIRST, cache as fallback.
//   • skipWaiting + clients.claim: a new SW version takes over on next launch.
//
// Bump CACHE_VERSION on any deploy where you want caches wiped.
const CACHE_VERSION = 'v1';
const SHELL_CACHE = `satya-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `satya-runtime-${CACHE_VERSION}`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop caches from older versions
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.endsWith(CACHE_VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isNextStatic(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/favicons/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin

  // Cache-first for content-hashed static assets (safe: names change on deploy)
  if (isNextStatic(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) (await caches.open(SHELL_CACHE)).put(req, res.clone());
      return res;
    })());
    return;
  }

  // Network-first for navigations and everything else; cache is only a fallback
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok && (req.mode === 'navigate' || url.pathname === '/')) {
        (await caches.open(RUNTIME_CACHE)).put(req, res.clone());
      }
      return res;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      // Offline navigation with no cache → the home shell if we have it
      if (req.mode === 'navigate') {
        const home = await caches.match('/');
        if (home) return home;
      }
      throw new Error('offline and uncached');
    }
  })());
});
