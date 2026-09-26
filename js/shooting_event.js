// Zeraphia Shooting entry point
// Keep this file as the only script referenced by the page.
// Shooting modules are intentionally independent from Strategy modules.
(function () {
  'use strict';

  const current = document.currentScript;
  const baseUrl = current && current.src ? new URL('.', current.src) : new URL('./js/', location.href);
  const queuedOpenArgs = [];
  const currentVersionParam = current && current.src
    ? new URL(current.src, location.href).searchParams.get('v')
    : '';
  const MODULE_VERSION = '20260926-build960-noah-center-rail-big-small';
  window.__sasaphiaShootingLoaderVersion = MODULE_VERSION;

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
      const moduleUrl = new URL(file, baseUrl);
      moduleUrl.searchParams.set('v', MODULE_VERSION);
      script.src = moduleUrl.href;
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

  const modulesReady = loadScript('shooting_characters.js')
    .then(() => loadScript('shooting_enemies.js'))
    .then(() => loadScript('shooting_stages.js'))
    .then(() => loadScript('shooting_ui.js'))
    .then(() => loadScript('shooting_core.js'))
    .then(() => {
      // build471: module readiness is required, image warmup is not.
      // The shooting screen opens immediately and its images may finish naturally from cache/network.
      if (queuedOpenArgs.length && typeof window.openShootingEvent === 'function') {
        const calls = queuedOpenArgs.splice(0);
        calls.forEach(args => window.openShootingEvent(...args));
      }
      return true;
    });

  // タイトル画面の起動ローダーから、
  // シューティング用キャラ画像の列挙前にモジュール完了を待てるよう公開。
  window.__sasaphiaShootingModulesReady = modulesReady;

  modulesReady.catch(err => console.error('[shooting] module load failed', err));
})();
