// Canal E Record service worker
// Network-first for ALL GET requests so every user (new and existing)
// always gets the latest deployed version — including app name, icon, and
// manifest changes. Cache is only a fallback for offline use.
// Old caches are wiped on activation so stale favicons/manifests are purged.
const CACHE = 'ecanal-app-v5';

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

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      if (fresh && fresh.status === 200 && (fresh.type === 'basic' || fresh.type === 'default' || fresh.type === 'cors')) {
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const cached = await cache.match(req);
      if (cached) return cached;
      // For navigations, fall back to cached root if available.
      if (req.mode === 'navigate') {
        const root = await cache.match('/');
        if (root) return root;
      }
      return Response.error();
    }
  })());
});
