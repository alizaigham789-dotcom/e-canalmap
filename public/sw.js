// Canal E Record service worker
// Network-first for ALL GET requests so every user (new and existing)
// always gets the latest deployed version — including app name, icon, and
// manifest changes. Cache is only a fallback for offline use.
// Old caches are wiped on activation so stale favicons/manifests are purged.
const CACHE = 'ecanal-app-v6';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Navigations (HTML pages) — network-first so users always get the latest
  // deployed version; fall back to cache when offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        const root = await caches.match('/');
        if (root) return root;
        return Response.error();
      }
    })());
    return;
  }

  // Static assets (JS/CSS/fonts/images) — stale-while-revalidate: serve from
  // cache instantly for a smooth, fast load, then refresh the cache in the
  // background so the next load picks up any new version.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then((fresh) => {
      if (fresh && fresh.status === 200 && (fresh.type === 'basic' || fresh.type === 'default' || fresh.type === 'cors')) {
        cache.put(req, fresh.clone());
      }
      return fresh;
    }).catch(() => null);
    return cached || network || Response.error();
  })());
});
