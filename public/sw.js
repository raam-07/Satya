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
const CACHE_VERSION = 'v4';
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

// ---------------------------------------------------------------------------
// WEB PUSH NOTIFICATIONS
// ---------------------------------------------------------------------------

const DEFAULT_ICON = '/favicons/gavel-192.png';
const DEFAULT_BADGE = '/favicons/gavel-32.png';

// Two actions is the practical maximum most platforms will render.
const DEFAULT_ACTIONS = [
  { action: 'open', title: 'Read full story' },
  { action: 'dismiss', title: 'Dismiss' },
];

self.addEventListener('push', (event) => {
  let data = {
    title: 'SatyaDheesh',
    body: 'New critical civic development.',
    url: '/',
    tag: 'satya-alert',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  // Only offer the "Read full story" action when there is somewhere to go.
  const hasDestination = Boolean(data.url) && data.url !== '/';
  const actions = Array.isArray(data.actions) && data.actions.length
    ? data.actions.slice(0, 2)
    : (hasDestination ? DEFAULT_ACTIONS : [{ action: 'dismiss', title: 'Dismiss' }]);

  const options = {
    body: data.body,
    icon: data.icon || DEFAULT_ICON,
    badge: data.badge || DEFAULT_BADGE,
    // Hero image shown when the notification is expanded (Android / desktop).
    image: data.image || undefined,
    data: {
      url: data.url || '/',
      tag: data.tag || 'satya-alert',
      sentAt: data.timestamp || Date.now(),
    },
    tag: data.tag || 'satya-alert',
    // Replace an older alert carrying the same tag, but still alert the user.
    renotify: true,
    // Critical alerts stay on screen until acted on; routine ones auto-dismiss.
    requireInteraction: Boolean(data.requireInteraction),
    timestamp: data.timestamp || Date.now(),
    vibrate: [180, 90, 180],
    lang: data.lang || 'en-IN',
    dir: 'auto',
    actions,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // The dismiss action should close the notification and nothing else.
  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  const targetPath = new URL(targetUrl, self.location.origin).href;

  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });

    // Prefer a tab already showing the destination — just focus it.
    for (const client of clientList) {
      if (client.url === targetPath && 'focus' in client) {
        return client.focus();
      }
    }

    // Otherwise reuse any open tab and navigate it there.
    for (const client of clientList) {
      if ('focus' in client && 'navigate' in client) {
        await client.focus();
        return client.navigate(targetPath);
      }
    }

    // No window open at all.
    if (clients.openWindow) {
      return clients.openWindow(targetPath);
    }
  })());
});

/**
 * The browser can silently invalidate and rotate a push subscription on its own
 * (expiry, FCM re-registration, storage pressure). Without this handler the user
 * stops receiving alerts and we only find out the next time they happen to open
 * the site. Here we re-subscribe immediately, in the background, and tell the
 * server about the new endpoint.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      // Reuse the key the old subscription was created with when the browser
      // gives it to us; otherwise ask the server for the current public key.
      let applicationServerKey = event.oldSubscription?.options?.applicationServerKey;

      if (!applicationServerKey) {
        const res = await fetch('/api/notifications/vapid-key');
        const { publicKey } = await res.json();
        if (!publicKey) return;
        applicationServerKey = urlBase64ToUint8Array(publicKey);
      }

      const newSub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: newSub.toJSON(),
          userAgent: self.navigator ? self.navigator.userAgent : '',
        }),
      });
    } catch (err) {
      // Nothing more we can do from here; the foreground hook will repair the
      // subscription the next time the user opens the site.
      console.warn('[sw] pushsubscriptionchange re-subscribe failed:', err);
    }
  })());
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}
