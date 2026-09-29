/* Zeraphia runtime service worker - release safety v1
   Runtime release/build number lives only in version.json.
   This worker never forces a page reload. */
const RUNTIME_CACHE = 'zeraphia-runtime-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key =>
          key.startsWith('sasaphia-assets-') ||
          (key.startsWith('zeraphia-runtime-') && key !== RUNTIME_CACHE)
        )
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'CLEAR_RUNTIME_CACHES') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key.startsWith('sasaphia-assets-') || key.startsWith('zeraphia-runtime-'))
          .map(key => caches.delete(key))
      );
    })());
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  const isNavigate = req.mode === 'navigate';
  const isHtml = /\.(?:html?)$/i.test(url.pathname);
  const isJson = /\.json$/i.test(url.pathname);
  const isCode = /\.(?:js|css)$/i.test(url.pathname);

  // HTML and release metadata must never be served from an old runtime cache.
  if (isNavigate || isHtml || isJson) {
    event.respondWith(fetch(req, { cache:'no-store' }));
    return;
  }

  // JS/CSS are NETWORK FIRST on every page load.
  // Even if an old ?v= query remains in HTML, online users receive current bytes.
  // Cache is fallback-only for a transient offline/network failure.
  if (isCode) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      try {
        const res = await fetch(req, { cache:'no-store' });
        if (res && res.ok) await cache.put(req, res.clone());
        return res;
      } catch (err) {
        const cached = await cache.match(req, { ignoreVary:true });
        if (cached) return cached;
        throw err;
      }
    })());
  }
});
