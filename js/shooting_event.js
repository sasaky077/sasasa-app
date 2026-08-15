// Zeraphia Shooting entry point
// Keep this file as the only script referenced by the page.
// Shooting modules are intentionally independent from Strategy modules.
(function () {
  'use strict';

  const current = document.currentScript;
  const baseUrl = current && current.src ? new URL('.', current.src) : new URL('./js/', location.href);
  const queuedOpenArgs = [];

  window.openShootingEvent = window.openShootingEvent || function (...args) {
    queuedOpenArgs.push(args);
  };

  function isModuleReady(file) {
    if (file === 'shooting_characters.js') return !!window.ShootingCharacters;
    if (file === 'shooting_enemies.js') return !!window.ShootingEnemies;
    if (file === 'shooting_stages.js') return !!window.ShootingStages;
    if (file === 'shooting_ui.js') return !!window.ShootingUI;
    if (file === 'shooting_core.js') return typeof window.openShootingEvent === 'function' && !!window.ShootingCoreReady;
    return false;
  }

  function loadScript(file) {
    if (isModuleReady(file)) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find(s => {
        if (!s.src) return false;
        try {
          return new URL(s.src, location.href).pathname.endsWith('/' + file);
        } catch (_) {
          return false;
        }
      });

      if (existing) {
        const started = performance.now();
        const wait = () => {
          if (isModuleReady(file)) return resolve();
          if (performance.now() - started > 5000) {
            return reject(new Error(`Shooting module did not initialize: ${file}`));
          }
          setTimeout(wait, 25);
        };
        wait();
        return;
      }

      const script = document.createElement('script');
      script.src = new URL(file, baseUrl).href;
      script.dataset.shootingModule = file;
      script.async = false;
      script.addEventListener('load', () => {
        script.dataset.loaded = '1';
        if (isModuleReady(file) || file === 'shooting_core.js') resolve();
        else reject(new Error(`Shooting module loaded but did not initialize: ${file}`));
      }, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  loadScript('shooting_characters.js')
    .then(() => loadScript('shooting_enemies.js'))
    .then(() => loadScript('shooting_stages.js'))
    .then(() => loadScript('shooting_ui.js'))
    .then(() => loadScript('shooting_core.js'))
    .then(() => {
      if (queuedOpenArgs.length && typeof window.openShootingEvent === 'function') {
        const calls = queuedOpenArgs.splice(0);
        calls.forEach(args => window.openShootingEvent(...args));
      }
      ensureStandaloneEntryButton();
    })
    .catch(err => console.error('[shooting] module load failed', err));

  // ---- スタンドアロン起動ボタンのフォールバック（既存挙動には影響しない）----
  // ローグライト側の任務画面(#ninmu-panel-special)に用意されている
  // 「.shooting-entry-card」ボタンが既に存在する場合は何もしない。
  // ローグライトが凍結/削除されていてこのボタンがDOMに一つも無い時だけ、
  // 画面右下に最低限の起動ボタンを自前で追加する。
  function ensureStandaloneEntryButton() {
    try {
      if (document.querySelector('.shooting-entry-card')) return;
      if (document.getElementById('shooting-standalone-entry')) return;

      const btn = document.createElement('button');
      btn.id = 'shooting-standalone-entry';
      btn.type = 'button';
      btn.textContent = 'SPECIAL EVENT 銃撃戦';
      btn.style.cssText = [
        'position:fixed', 'right:16px', 'bottom:16px', 'z-index:9999',
        'padding:12px 20px', 'border-radius:999px',
        'border:1px solid rgba(160,126,66,.52)',
        'background:linear-gradient(180deg,#fffefa,#f1e5ca)',
        'color:#715a37', 'font-size:13px', 'letter-spacing:.05em',
        'box-shadow:0 8px 20px rgba(0,0,0,.18)', 'cursor:pointer',
      ].join(';');
      btn.addEventListener('click', () => {
        if (typeof window.openShootingEvent === 'function') window.openShootingEvent();
      });
      document.body.appendChild(btn);
    } catch (_) {}
  }
})();
