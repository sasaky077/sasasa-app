/* Sasaphia update worker.
 * 方針:
 *  - html / navigate / version.json  -> 常にネットワークから最新を取得 (no-store)
 *    これらは更新検知の要なので、絶対にキャッシュを挟まない。
 *  - js / css (?v=build のクエリ付き) -> build単位でCache Storageに保存。
 *    同じbuildなら次回以降はキャッシュから即返す＝毎回フルDLしない。
 *    buildが変わればCACHE_NAMEごと新規作成され、古いキャッシュはactivate時に破棄される。
 */
const SW_BUILD = '20260821-gojo-limitbreak-v189';
const ASSET_CACHE = `sasaphia-assets-${SW_BUILD}`;

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // 現在のbuildのキャッシュだけ残し、それ以外(古いbuildのキャッシュ)は全部削除。
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith('sasaphia-assets-') && key !== ASSET_CACHE)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
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

  // --- html本体 / version.json: 更新検知の要なので毎回ネットワークへ ---
  if (isNavigate || isHtml || isJson) {
    event.respondWith((async () => {
      try {
        return await fetch(req, { cache: 'no-store' });
      } catch (err) {
        // 一時的な通信断時のみ通常fetchへフォールバック。
        try { return await fetch(req); } catch (_) { throw err; }
      }
    })());
    return;
  }

  // --- js / css: build番号(?v=...)ごとにキャッシュ。同build内は再DLしない ---
  if (isVersionedAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        // 200 OKのみキャッシュ対象（opaque/エラー応答は保存しない）
        if (res && res.ok) {
          cache.put(req, res.clone());
        }
        return res;
      } catch (err) {
        // ネットワーク不通時、同一buildの古いキャッシュがもし残っていれば使う
        const fallback = await cache.match(req, { ignoreVary: true });
        if (fallback) return fallback;
        throw err;
      }
    })());
  }
  // それ以外（画像等）はSWで介入せず、通常のブラウザ挙動に任せる。
});
