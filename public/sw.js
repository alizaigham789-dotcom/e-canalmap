// Canal E Record — service worker (network-first, self-updating).
// Version bump on every deploy forces old caches to be purged so installed
// mobile PWAs always load the latest modules, colors, and features.
const CACHE_VERSION = 'ecanals-v20260904a';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(['/', '/index.html']).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never cache cross-origin (analytics, media CDN, map tiles).
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for navigation (HTML) — always fresh when online so new
  // modules / colors / Fard Masrooba appear immediately after an update.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/')))
    );
    return;
  }

  // Stale-while-revalidate for same-origin static assets (JS/CSS chunks).
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
