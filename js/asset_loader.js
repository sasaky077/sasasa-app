// Sasaphia shared asset loader
// Images/audio are cached as Promises and held strongly so first-use effects
// do not race against network/decode on slower mobile devices.
(function () {
  'use strict';

  const imagePromises = new Map();
  const audioPromises = new Map();
  const imageObjects = new Map();
  const audioObjects = new Map();

  // ------------------------------------------------------------
  // Foreground loading indicator
  // - speculative/background preload never shows this
  // - only blocking waits that exceed 300ms are surfaced
  // ------------------------------------------------------------
  let blockingVisibleCount = 0;

  function ensureLoadingOverlay() {
    let overlay = document.getElementById('sasaphia-asset-loading');
    if (overlay) return overlay;

    const style = document.createElement('style');
    style.id = 'sasaphia-asset-loading-style';
    style.textContent = `
      #sasaphia-asset-loading{
        position:fixed;
        inset:0;
        z-index:20000;
        display:flex;
        align-items:center;
        justify-content:center;
        pointer-events:none;
        opacity:0;
        visibility:hidden;
        transition:opacity .16s ease, visibility .16s ease;
        background:rgba(18,16,14,.10);
        backdrop-filter:blur(1.5px);
        -webkit-backdrop-filter:blur(1.5px);
      }
      #sasaphia-asset-loading.show{
        opacity:1;
        visibility:visible;
      }
      #sasaphia-asset-loading .asset-loading-box{
        min-width:126px;
        padding:14px 18px 12px;
        border:1px solid rgba(214,195,156,.48);
        border-radius:14px;
        background:rgba(250,247,239,.94);
        box-shadow:0 12px 34px rgba(20,16,10,.18);
        text-align:center;
        color:#7d6848;
        font-family:"Cinzel","Noto Serif JP",serif;
      }
      #sasaphia-asset-loading .asset-loading-label{
        font-size:11px;
        font-weight:600;
        letter-spacing:.18em;
      }
      #sasaphia-asset-loading .asset-loading-dots{
        display:flex;
        justify-content:center;
        gap:6px;
        margin-top:8px;
      }
      #sasaphia-asset-loading .asset-loading-dots i{
        display:block;
        width:4px;
        height:4px;
        border-radius:50%;
        background:rgba(157,126,71,.58);
        animation:sasaphiaAssetDot 1s ease-in-out infinite;
      }
      #sasaphia-asset-loading .asset-loading-dots i:nth-child(2){animation-delay:.14s}
      #sasaphia-asset-loading .asset-loading-dots i:nth-child(3){animation-delay:.28s}
      @keyframes sasaphiaAssetDot{
        0%,100%{transform:translateY(0);opacity:.35}
        50%{transform:translateY(-3px);opacity:1}
      }
    `;
    document.head.appendChild(style);

    overlay = document.createElement('div');
    overlay.id = 'sasaphia-asset-loading';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="asset-loading-box">
        <div class="asset-loading-label">LOADING...</div>
        <div class="asset-loading-dots"><i></i><i></i><i></i></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function showBlockingLoading() {
    blockingVisibleCount += 1;
    const overlay = ensureLoadingOverlay();
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function hideBlockingLoading() {
    blockingVisibleCount = Math.max(0, blockingVisibleCount - 1);
    if (blockingVisibleCount > 0) return;
    const overlay = document.getElementById('sasaphia-asset-loading');
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function withBlockingLoading(promise, delayMs) {
    delayMs = Math.max(0, Number(delayMs == null ? 300 : delayMs));
    let shown = false;
    const timer = setTimeout(function () {
      shown = true;
      showBlockingLoading();
    }, delayMs);

    return Promise.resolve(promise).finally(function () {
      clearTimeout(timer);
      if (shown) hideBlockingLoading();
    });
  }

  function cleanUrl(src) {
    if (!src || typeof src !== 'string') return '';
    const value = src.trim();
    if (!value || value.startsWith('data:') || value.startsWith('blob:')) return value;
    try {
      return new URL(value, document.baseURI).href;
    } catch (_) {
      return value;
    }
  }

  function isImageUrl(src) {
    return /\.(?:avif|webp|png|jpe?g|gif|svg)(?:[?#].*)?$/i.test(src || '');
  }

  function isAudioUrl(src) {
    return /\.(?:mp3|m4a|aac|wav|ogg|opus)(?:[?#].*)?$/i.test(src || '');
  }

  function withTimeout(promise, ms, fallback) {
    return new Promise(function (resolve) {
      let done = false;
      const timer = setTimeout(function () {
        if (done) return;
        done = true;
        resolve(fallback);
      }, Math.max(500, Number(ms || 7000)));

      Promise.resolve(promise).then(function (value) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(value);
      }).catch(function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(fallback);
      });
    });
  }

  function image(src, options) {
    options = options || {};
    const key = cleanUrl(src);
    if (!key) return Promise.resolve(false);
    if (imagePromises.has(key)) return imagePromises.get(key);

    const promise = withTimeout(new Promise(function (resolve) {
      const img = new Image();
      imageObjects.set(key, img);

      let finished = false;
      function finish(ok) {
        if (finished) return;
        finished = true;
        resolve(!!ok);
      }

      img.onload = function () {
        if (typeof img.decode === 'function' && options.decode !== false) {
          img.decode().catch(function () {}).finally(function () { finish(true); });
        } else {
          finish(true);
        }
      };
      img.onerror = function () {
        if (!options.quiet) console.warn('[Assets] image failed:', src);
        finish(false);
      };

      img.decoding = options.decode === false ? 'auto' : 'async';
      img.src = src;

      if (img.complete && img.naturalWidth > 0) {
        if (typeof img.decode === 'function' && options.decode !== false) {
          img.decode().catch(function () {}).finally(function () { finish(true); });
        } else {
          finish(true);
        }
      }
    }), options.timeout || 7000, false);

    imagePromises.set(key, promise);
    return options.blocking ? withBlockingLoading(promise, options.loadingDelay) : promise;
  }

  function audio(src, options) {
    options = options || {};
    const key = cleanUrl(src);
    if (!key) return Promise.resolve(false);
    if (audioPromises.has(key)) return audioPromises.get(key);

    const promise = withTimeout(new Promise(function (resolve) {
      const el = new Audio();
      audioObjects.set(key, el);
      el.preload = 'auto';

      let finished = false;
      function finish(ok) {
        if (finished) return;
        finished = true;
        cleanup();
        resolve(!!ok);
      }
      function cleanup() {
        el.removeEventListener('canplaythrough', onReady);
        el.removeEventListener('canplay', onReady);
        el.removeEventListener('loadeddata', onReady);
        el.removeEventListener('error', onError);
      }
      function onReady() { finish(true); }
      function onError() {
        if (!options.quiet) console.warn('[Assets] audio failed:', src);
        finish(false);
      }

      el.addEventListener('canplaythrough', onReady, { once: true });
      el.addEventListener('canplay', onReady, { once: true });
      el.addEventListener('loadeddata', onReady, { once: true });
      el.addEventListener('error', onError, { once: true });

      el.src = src;
      try { el.load(); } catch (_) {}

      if (el.readyState >= 2) finish(true);
    }), options.timeout || 6000, false);

    audioPromises.set(key, promise);
    return options.blocking ? withBlockingLoading(promise, options.loadingDelay) : promise;
  }

  function many(urls, options) {
    options = options || {};
    const unique = Array.from(new Set((urls || []).filter(Boolean)));
    const childOptions = Object.assign({}, options, { blocking: false });

    const batch = Promise.all(unique.map(function (src) {
      if (isAudioUrl(src)) return audio(src, childOptions);
      if (isImageUrl(src)) return image(src, childOptions);
      return Promise.resolve(false);
    }));

    return options.blocking ? withBlockingLoading(batch, options.loadingDelay) : batch;
  }

  function collectFromObject(value, out, seen, depth) {
    out = out || [];
    seen = seen || new WeakSet();
    depth = depth == null ? 0 : depth;
    if (depth > 6 || value == null) return out;

    if (typeof value === 'string') {
      if (isImageUrl(value) || isAudioUrl(value)) out.push(value);
      return out;
    }
    if (typeof value !== 'object') return out;
    if (seen.has(value)) return out;
    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach(function (item) { collectFromObject(item, out, seen, depth + 1); });
      return out;
    }

    Object.keys(value).forEach(function (key) {
      try { collectFromObject(value[key], out, seen, depth + 1); } catch (_) {}
    });
    return out;
  }

  function scanDom() {
    const urls = [];

    document.querySelectorAll('img[src]').forEach(function (el) {
      if (el.getAttribute('src')) urls.push(el.getAttribute('src'));
    });
    document.querySelectorAll('audio[src], source[src]').forEach(function (el) {
      if (el.getAttribute('src')) urls.push(el.getAttribute('src'));
    });
    document.querySelectorAll('[style*="url("]').forEach(function (el) {
      const style = el.getAttribute('style') || '';
      const rx = /url\((['"]?)(.*?)\1\)/g;
      let m;
      while ((m = rx.exec(style))) if (m[2]) urls.push(m[2]);
    });

    return many(urls, { timeout: 5000, quiet: true });
  }

  function warmKnownGlobals() {
    const urls = [];
    [
      // 常時表示・近い将来使うものだけを対象にする。
      // ENEMIES / ShootingEnemies / ShootingStages は未実装画像参照を含む場合があるため
      // 全件先読みしない。必要な敵画像は各バトル開始前に個別ロードする。
      window.CHARACTERS,
      window.GACHA_BANNERS,
      window.ShootingCharacters,
      window.HOME_EVENT_BANNERS
    ].forEach(function (obj) {
      if (obj) collectFromObject(obj, urls);
    });
    return many(urls, { timeout: 7000, quiet: true });
  }

  // Observe dynamically-created images/audio and immediately warm the same URL.
  function observeDynamicAssets() {
    if (!('MutationObserver' in window)) return;
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (!node || node.nodeType !== 1) return;
          if (node.matches && node.matches('img[src]')) image(node.getAttribute('src'));
          if (node.matches && node.matches('audio[src],source[src]')) audio(node.getAttribute('src'));
          if (node.querySelectorAll) {
            node.querySelectorAll('img[src]').forEach(function (el) { image(el.getAttribute('src')); });
            node.querySelectorAll('audio[src],source[src]').forEach(function (el) { audio(el.getAttribute('src')); });
          }
        });

        if (mutation.type === 'attributes' && mutation.target) {
          const el = mutation.target;
          const src = el.getAttribute && el.getAttribute('src');
          if (!src) return;
          if (el.tagName === 'IMG') image(src);
          else if (el.tagName === 'AUDIO' || el.tagName === 'SOURCE') audio(src);
        }
      });
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src']
    });
  }

  const api = {
    image,
    audio,
    many,
    withBlockingLoading,
    collectFromObject,
    scanDom,
    warmKnownGlobals,
    isImageReady: function (src) {
      const key = cleanUrl(src);
      const img = imageObjects.get(key);
      return !!(img && img.complete && img.naturalWidth > 0);
    }
  };

  window.GameAssets = api;

  function initialWarmup() {
    scanDom();
    // Modules/masters load late. Warm once immediately, then again after script initialization.
    setTimeout(warmKnownGlobals, 700);
    setTimeout(warmKnownGlobals, 2200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialWarmup, { once: true });
  } else {
    initialWarmup();
  }
  observeDynamicAssets();
})();
