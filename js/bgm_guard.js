// ZERAPHIA build1643 — BGMガード
//
// 1) バックグラウンド中はBGMを鳴らさない
//    ・アプリがバックグラウンドに回ったら、鳴っていたBGMをすべて一時停止して覚えておく
//    ・前面に戻ったら、覚えていたBGMのうち「今の画面で鳴ってよいもの」だけを再開する
//      （PAUSEメニューで止めていた律動の曲などは再開しない）
// 2) その画面で鳴るべきでないBGMは、どの経路で再生されても即停止する
//    ・タイトルBGM：タイトル画面が表示されている時だけ
//    ・通常BGM：shouldMainBgmPlay()（ホーム等の通常画面）の時だけ
//    ・戦闘BGM：シューティング画面が開いていて戦闘BGMが有効な時だけ
//    iOSのロック画面／コントロールセンター／イヤホン操作による「再生」で、
//    以前に鳴らしたタイトルBGMが戦闘中（律動など）に再開してしまうのを防ぐ。
// 3) ロック画面などの再生・一時停止ボタンは、今の画面に合ったBGMの再開／停止として扱う
// 4) 音声の読み込みがブラウザのキャッシュ都合で失敗した場合、キャッシュを避けて1回だけ読み込み直す
(function(){
  'use strict';

  function bgmAudios(){
    return Array.from(document.querySelectorAll('audio#bgm-opening, audio#bgm, audio.bgm-battle-track'));
  }
  function isVisibleEl(el){
    if (!el) return false;
    const cs = window.getComputedStyle(el);
    return el.style.display !== 'none' && cs.display !== 'none' && cs.visibility !== 'hidden';
  }
  function titleVisible(){
    const t = document.getElementById('title-screen');
    return !!(t && isVisibleEl(t) && !t.classList.contains('closing'));
  }
  function shootingOpen(){
    const r = document.getElementById('shooting-event-root');
    return !!(r && r.classList.contains('open'));
  }
  function battleBgmActive(){
    try {
      if (typeof window.isShootingBattleBgmSessionActive === 'function') return !!window.isShootingBattleBgmSessionActive();
    } catch (_) {}
    return shootingOpen();
  }
  function mainBgmAllowed(){
    try { if (typeof window.shouldMainBgmPlay === 'function') return !!window.shouldMainBgmPlay(); } catch (_) {}
    return !shootingOpen() && !titleVisible();
  }
  function isAllowed(audio){
    if (!audio || document.hidden) return false;
    if (audio.id === 'bgm-opening') return titleVisible() && !shootingOpen();
    if (audio.id === 'bgm') return mainBgmAllowed();
    if (audio.classList.contains('bgm-battle-track')) return shootingOpen() && battleBgmActive();
    return true;
  }
  function stop(audio, rewind){
    try { audio.pause(); } catch (_) {}
    if (rewind) { try { audio.currentTime = 0; } catch (_) {} }
  }

  // ---------- 2) 場違いな再生は即停止 ----------
  function onPlay(e){
    const a = e.target;
    if (!a || a.muted || isAllowed(a)) return; // 無音のprime（再生権限の取得）は対象外
    stop(a, a.id === 'bgm-opening');
    console.warn('[BGM guard] stopped out-of-context BGM:', a.id || a.currentSrc);
  }
  // ---------- 読み込み失敗の自動回復 ----------
  // ERR_CACHE_OPERATION_NOT_SUPPORTED など、ブラウザのキャッシュ都合で音声の読み込みが失敗した場合、
  // キャッシュを避けたURLで1回だけ読み込み直す。再生中（または再生しようとしていた）なら再開する。
  function onAudioError(e){
    const a = e.target;
    if (!a || a.dataset.bgmRetried === '1') return;
    const err = a.error;
    if (err && err.code === 1) return; // MEDIA_ERR_ABORTED（意図的な中断）は対象外
    a.dataset.bgmRetried = '1';
    const wanted = a.dataset.bgmWantPlay === '1';
    console.warn('[BGM guard] audio load failed, retrying without cache:', a.id, err && err.code);
    setTimeout(() => {
      try {
        const url = new URL(a.getAttribute('src') || a.currentSrc, location.href);
        url.searchParams.set('retry', String(Date.now()));
        a.src = url.href;
        a.load();
        if (wanted && isAllowed(a)) a.play().catch(() => {});
      } catch (_) {}
    }, 250);
  }
  function rememberPlayIntent(e){ if (e.target) e.target.dataset.bgmWantPlay = '1'; }
  function forgetPlayIntent(e){ if (e.target && e.target.paused) e.target.dataset.bgmWantPlay = '0'; }
  function bindPlayGuard(){
    bgmAudios().forEach(a => {
      if (a.dataset.bgmGuard === '1') return;
      a.dataset.bgmGuard = '1';
      a.addEventListener('play', onPlay);
      a.addEventListener('playing', onPlay);
      a.addEventListener('play', rememberPlayIntent);
      a.addEventListener('pause', forgetPlayIntent);
      a.addEventListener('error', onAudioError);
    });
  }

  // ---------- 1) バックグラウンドで停止・前面で再開 ----------
  let resumeOnShow = [];
  let hiddenHandled = false;
  function onHide(){
    if (hiddenHandled) return;
    hiddenHandled = true;
    const playing = bgmAudios().filter(a => !a.paused && !a.muted);
    resumeOnShow = playing;
    playing.forEach(a => stop(a, false));
  }
  let retryBound = false;
  function bindGestureRetry(list){
    if (retryBound) return;
    retryBound = true;
    const retry = () => {
      window.removeEventListener('pointerdown', retry, true);
      window.removeEventListener('touchstart', retry, true);
      retryBound = false;
      list.forEach(a => { if (a.paused && isAllowed(a)) a.play().catch(() => {}); });
    };
    window.addEventListener('pointerdown', retry, true);
    window.addEventListener('touchstart', retry, true);
  }
  function onShow(){
    if (document.hidden) return;
    hiddenHandled = false;
    const list = resumeOnShow;
    resumeOnShow = [];
    const failed = [];
    list.forEach(a => {
      if (!isAllowed(a) || !a.paused) return;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => { failed.push(a); bindGestureRetry(failed); });
    });
    // ホーム等の通常BGMは既存の同期処理にも任せる（hide中に画面が変わった場合を含む）
    try { if (typeof window.syncMainBgmToHome === 'function') window.syncMainBgmToHome(); } catch (_) {}
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) onHide(); else onShow(); });
  window.addEventListener('pagehide', onHide);
  window.addEventListener('pageshow', () => { if (!document.hidden) onShow(); });
  document.addEventListener('freeze', onHide);

  // ---------- 3) ロック画面・イヤホンの再生／一時停止 ----------
  function resumeContextBgm(){
    if (document.hidden) return;
    if (titleVisible()) {
      const t = document.getElementById('bgm-opening');
      if (t && t.paused) t.play().catch(() => {});
      return;
    }
    if (shootingOpen()) {
      try { if (typeof window.syncShootingBattleBgm === 'function') window.syncShootingBattleBgm(); } catch (_) {}
      return;
    }
    try { if (typeof window.syncMainBgmToHome === 'function') window.syncMainBgmToHome(); } catch (_) {}
  }
  if ('mediaSession' in navigator && navigator.mediaSession && typeof navigator.mediaSession.setActionHandler === 'function') {
    const set = (action, fn) => { try { navigator.mediaSession.setActionHandler(action, fn); } catch (_) {} };
    set('play', resumeContextBgm);
    set('pause', () => bgmAudios().forEach(a => stop(a, false)));
    set('stop', () => bgmAudios().forEach(a => stop(a, false)));
    ['seekbackward', 'seekforward', 'previoustrack', 'nexttrack', 'seekto'].forEach(a => set(a, null));
  }

  function init(){
    bindPlayGuard();
    if (document.hidden) onHide();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
