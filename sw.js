/* Zeraphia runtime service worker - release safety v3
   Runtime release/build number lives only in version.json.
   This worker never forces a page reload.

   v2 changes:
   - Runtime cache keys ignore the query string (?v= / ?bootstrap=), so old
     versions of the same file no longer pile up in the cache.
   - Offline navigations get a small "offline" page instead of the browser's
     error screen. (The game itself needs the network: Supabase, images.)

   v3 changes:
   - HTML / JS / CSS are fetched with cache:'no-cache' instead of 'no-store'.
     The browser still asks the server every time (so a new release is picked up
     immediately), but an unchanged file comes back as a tiny 304 instead of
     re-downloading ~3.5MB (index.html, style.css, shooting_core.js, ...) on every
     launch. Those full re-downloads were competing with HOME / character images. */
const RUNTIME_CACHE = 'zeraphia-runtime-v2';

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

// One cache entry per file path, whatever the ?v= query was.
function cacheKeyFor(url) {
  return url.origin + url.pathname;
}

function offlineResponse() {
  const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0d0f1f">
<title>Zeraphia - オフライン</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;background:#0d0f1f;color:#e8e4f5;
       font-family:"Noto Serif JP","Hiragino Mincho ProN",serif;text-align:center;
       padding:env(safe-area-inset-top) 24px env(safe-area-inset-bottom);box-sizing:border-box}
  h1{font-size:1.25rem;font-weight:600;margin:0 0 12px}
  p{font-size:.9rem;line-height:1.7;opacity:.8;margin:0 0 24px}
  button{font:inherit;font-size:1rem;color:#fff;background:#7832c8;border:0;border-radius:999px;padding:12px 32px}
</style></head><body><main>
<h1>通信できませんでした</h1>
<p>Zeraphia のプレイにはインターネット接続が必要です。<br>通信環境を確認してから再読み込みしてください。</p>
<button type="button" onclick="location.reload()">再読み込み</button>
</main></body></html>`;
  return new Response(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

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

  // Page loads: always network, never an old cached HTML.
  // If the network is down, show the offline page instead of the browser error.
  if (isNavigate) {
    event.respondWith(fetch(req, { cache:'no-cache' }).catch(() => offlineResponse()));
    return;
  }

  // HTML fetched by script: always revalidated with the server.
  if (isHtml) {
    event.respondWith(fetch(req, { cache:'no-cache' }));
    return;
  }

  // Release metadata (version.json etc.): tiny, never from any cache.
  if (isJson) {
    event.respondWith(fetch(req, { cache:'no-store' }));
    return;
  }

  // JS/CSS are NETWORK FIRST on every page load.
  // Cache is fallback-only for a transient offline/network failure.
  if (isCode) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const key = cacheKeyFor(url);
      try {
        const res = await fetch(req, { cache:'no-cache' });
        if (res && res.ok) {
          event.waitUntil(cache.put(key, res.clone()).catch(() => {}));
        }
        return res;
      } catch (err) {
        const cached = await cache.match(key, { ignoreVary:true });
        if (cached) return cached;
        throw err;
      }
    })());
  }
});
