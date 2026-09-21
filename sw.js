/* Zeraphia self-healing update worker - build688 */
const SW_BUILD = '688';
const ASSET_CACHE = `sasaphia-assets-${SW_BUILD}`;

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith('sasaphia-assets-') && key !== ASSET_CACHE)
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
      await Promise.all(keys.filter(k => k.startsWith('sasaphia-assets-')).map(k => caches.delete(k)));
    })());
    return;
  }
  if (data.type === 'GET_BUILD' && event.source && event.source.postMessage) {
    event.source.postMessage({ type:'SASAPHIA_SW_BUILD', build:SW_BUILD });
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
  const isVersionedAsset = /\.(?:js|css)$/i.test(url.pathname);

  if (isNavigate || isHtml || isJson) {
    event.respondWith((async () => {
      try {
        return await fetch(req, { cache:'no-store' });
      } catch (err) {
        try { return await fetch(req); } catch (_) { throw err; }
      }
    })());
    return;
  }

  if (isVersionedAsset) {
    const rawVersion = String(url.searchParams.get('v') || '');
    const requestedBuild = rawVersion.split('-')[0];

    if (requestedBuild && requestedBuild !== SW_BUILD) {
      event.respondWith(fetch(req, { cache:'no-store' }));
      return;
    }

    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req, { cache:'no-cache' });
        if (res && res.ok) {
          await cache.put(req, res.clone());
        }
        return res;
      } catch (err) {
        const fallback = await cache.match(req, { ignoreVary:true });
        if (fallback) return fallback;
        throw err;
      }
    })());
  }
});
