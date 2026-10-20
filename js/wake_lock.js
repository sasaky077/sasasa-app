// ZERAPHIA build1643 — 戦闘中のスリープ（画面が暗くなる）防止
// Screen Wake Lock API で、シューティング画面（編成〜戦闘〜RESULT）を開いている間だけ画面を点けたままにする。
// ・iOS Safari 16.4以降／ホーム画面に追加したアプリ（PWA）は iOS 18.4以降で有効
// ・非対応の端末では何もしない（従来どおり端末の自動ロック設定に従う）
// ・バックグラウンドに回るとOSが自動解除するので、前面に戻った時に取り直す
(function(){
  'use strict';
  if (!('wakeLock' in navigator) || !navigator.wakeLock || typeof navigator.wakeLock.request !== 'function') return;

  let sentinel = null;
  let requesting = false;

  function shouldHold(){
    if (document.hidden) return false;
    const root = document.getElementById('shooting-event-root');
    return !!(root && root.classList.contains('open'));
  }
  async function acquire(){
    if (sentinel || requesting) return;
    requesting = true;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => { sentinel = null; });
    } catch (err) {
      // 省電力モード・権限・ユーザー操作待ちなどで拒否されることがある。次の同期で再試行。
      sentinel = null;
    } finally {
      requesting = false;
    }
    if (sentinel && !shouldHold()) release();
  }
  function release(){
    const s = sentinel;
    sentinel = null;
    if (s) { try { s.release(); } catch (_) {} }
  }
  function sync(){
    if (shouldHold()) void acquire();
    else release();
  }

  // 画面の出入り（shooting-event-root の生成・open切替）を監視
  let observedRoot = null;
  const rootObserver = new MutationObserver(sync);
  const bodyObserver = new MutationObserver(() => {
    const root = document.getElementById('shooting-event-root');
    if (root !== observedRoot) {
      rootObserver.disconnect();
      observedRoot = root;
      if (root) rootObserver.observe(root, { attributes:true, attributeFilter:['class'] });
    }
    sync();
  });

  function init(){
    if (document.body) bodyObserver.observe(document.body, { childList:true });
    const root = document.getElementById('shooting-event-root');
    if (root) { observedRoot = root; rootObserver.observe(root, { attributes:true, attributeFilter:['class'] }); }
    sync();
  }
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', sync);
  // iOSはユーザー操作直後でないと取得できない場合があるため、タップ時にも再試行
  window.addEventListener('pointerdown', () => { if (!sentinel && shouldHold()) void acquire(); }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
