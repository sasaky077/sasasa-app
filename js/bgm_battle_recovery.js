/* ZERAPHIA build1918 — battle BGM recovery (HTMLAudioElement only)
 * No automatic play() or load() from a timer. Detection is passive; an actual
 * user gesture is required for recovery. No effect on other BGM, game clocks,
 * disabled BGM, background sessions, or intentionally paused rhythm battles.
 */
(function () {
  'use strict';
  const MAX_ATTEMPTS = 2;
  const MIN_STALL_MS = 3500;
  const RETRY_COOLDOWN_MS = 6000;
  const HISTORY_LIMIT = 50;
  let activeAudio = null;
  let previousTime = null;
  let lastProgressAt = 0;
  let lastAttemptAt = 0;
  let attempts = 0;
  let pending = false;
  let inFlight = false;
  let manualPending = false;
  const history = [];

  function record(type, a, extra) {
    const row = {
      at: new Date().toISOString(), type,
      audio: a ? (a.id || '') : '',
      paused: a ? !!a.paused : null,
      ended: a ? !!a.ended : null,
      currentTime: a ? Number(a.currentTime || 0).toFixed(2) : null,
      readyState: a ? a.readyState : null,
      networkState: a ? a.networkState : null,
      errorCode: a && a.error ? a.error.code : null,
      muted: a ? !!a.muted : null,
      volume: a ? Number(a.volume) : null,
      visibility: document.visibilityState,
      extra: extra || ''
    };
    history.push(row);
    if (history.length > HISTORY_LIMIT) history.shift();
  }

  function enabled() {
    try {
      if (typeof window.isAudioEnabled === 'function') return !!window.isAudioEnabled('main_bgm');
      return localStorage.getItem('zeraphia_bgm_enabled') !== 'false';
    } catch (_) { return false; }
  }
  function pausedByGame() {
    const root = document.getElementById('shooting-event-root');
    return !!(root && root.classList.contains('is-shooting-paused'));
  }
  function current() {
    if (document.hidden || !enabled() || pausedByGame()) return null;
    const root = document.getElementById('shooting-event-root');
    if (!root || !root.classList.contains('open')) return null;
    try {
      if (typeof window.isShootingBattleBgmSessionActive !== 'function' ||
          !window.isShootingBattleBgmSessionActive()) return null;
      if (typeof window.getActiveShootingBattleBgmElement !== 'function') return null;
      return window.getActiveShootingBattleBgmElement();
    } catch (_) { return null; }
  }
  function changeAudio(next) {
    if (next === activeAudio) return;
    if (activeAudio) record('track-ended', activeAudio);
    activeAudio = next;
    previousTime = null;
    lastProgressAt = performance.now();
    lastAttemptAt = 0;
    attempts = 0;
    pending = false;
    inFlight = false;
    manualPending = false;
    if (activeAudio) record('track-start', activeAudio);
  }
  function onAudioEvent(e) {
    const a = e.currentTarget;
    if (a !== current()) return;
    const type = e.type;
    if (['error', 'waiting', 'stalled', 'emptied', 'playing', 'pause'].includes(type)) {
      record(type, a);
    }
    if (type === 'error' && (!a.error || a.error.code !== 1)) pending = true;
    if (type === 'playing') {
      lastProgressAt = performance.now();
      previousTime = Number(a.currentTime || 0);
      pending = false;
    }
  }
  function bindEvents() {
    document.querySelectorAll('audio.bgm-battle-track').forEach(a => {
      if (a.dataset.bgmBattleRecoveryBound === '1') return;
      a.dataset.bgmBattleRecoveryBound = '1';
      ['waiting', 'stalled', 'emptied', 'error', 'playing', 'pause'].forEach(t => a.addEventListener(t, onAudioEvent));
    });
  }
  function sample() {
    // Do not forget attempts or trigger recovery during an intentional pause.
    if (pausedByGame()) return;
    const a = current();
    changeAudio(a);
    if (!a || inFlight || a.paused || a.muted || a.volume <= 0) return;
    const now = performance.now();
    const at = Number(a.currentTime || 0);
    if (previousTime === null || at > previousTime + 0.08 || at < previousTime - 0.3) {
      previousTime = at;
      lastProgressAt = now;
      pending = false;
      return;
    }
    if (now - lastProgressAt >= MIN_STALL_MS && !pending) {
      pending = true;
      record('no-progress', a, 'currentTime unchanged >= 3.5 s');
    }
  }

  function recover(reason, explicit) {
    const a = current();
    if (!a || a !== activeAudio) return false;
    if (!explicit && !pending) return false;
    const now = performance.now();
    if (inFlight || attempts >= MAX_ATTEMPTS || now - lastAttemptAt < RETRY_COOLDOWN_MS) return false;
    // If audio resumed without us, never reload it based on an old stalled event.
    if (!explicit && !a.paused && previousTime !== null &&
        Number(a.currentTime || 0) > previousTime + 0.12) {
      pending = false;
      return false;
    }
    attempts++;
    lastAttemptAt = now;
    inFlight = true;
    pending = false;
    const desiredTime = Number(a.currentTime || 0);
    record('recovery-start', a, reason + ', attempt=' + attempts);
    try {
      const raw = a.getAttribute('src') || a.currentSrc;
      if (!raw) throw new Error('empty audio src');
      const url = new URL(raw, location.href);
      // Remove prior recovery query so it does not grow indefinitely.
      url.searchParams.set('__bgm_recovery', String(Date.now()));
      a.pause();
      a.src = url.href;
      a.preload = 'auto';
      // Try to preserve the battle's soundtrack position (especially rhythm mode).
      const restore = () => {
        if (a !== current()) return;
        if (Number.isFinite(desiredTime) && desiredTime > 0 && Number.isFinite(a.duration) && a.duration > desiredTime + 0.1) {
          try { a.currentTime = desiredTime; } catch (_) {}
        }
      };
      a.addEventListener('loadedmetadata', restore, { once: true });
      a.load();
      a.muted = false;
      // play() occurs directly within the user activation event, not asynchronously.
      const promise = a.play();
      if (promise && typeof promise.then === 'function') {
        promise.then(() => { record('recovery-play-ok', a); }, err => {
          record('recovery-play-failed', a, String(err && err.name || err));
        }).finally(() => { inFlight = false; });
      } else inFlight = false;
      // A pending play promise can be delayed while buffering; do not lock forever.
      window.setTimeout(() => { inFlight = false; }, 5000);
      previousTime = null;
      lastProgressAt = performance.now();
      return true;
    } catch (err) {
      record('recovery-error', a, String(err && err.message || err));
      inFlight = false;
      return false;
    }
  }

  function onGesture() {
    // Passive waiting/stall recovery. It never starts an intentionally paused BGM.
    if (pending) recover('gesture-after-stall', false);
  }
  window.recoverShootingBgmAfterToggle = function () {
    // The toggle resides in the battle pause menu: defer until the player
    // clicks "resume", so the rhythm-song pause cannot be undone accidentally.
    if (pausedByGame()) {
      manualPending = true;
      record('manual-recovery-deferred', activeAudio);
      return true;
    }
    const a = current();
    if (!a) return false;
    changeAudio(a);
    return recover('off-on', true);
  };
  window.resumePendingShootingBgmRecovery = function () {
    if (!manualPending || pausedByGame()) return false;
    manualPending = false;
    const a = current();
    if (!a) return false;
    changeAudio(a);
    return recover('resume-after-off-on', true);
  };
  window.getShootingBgmDiagnostics = function () {
    return { build: 1918, activeId: activeAudio ? activeAudio.id : null,
      pending, attempts, history: history.slice() };
  };
  window.markShootingBgmSilent = function () {
    record('player-reported-silence', current() || activeAudio);
    return window.getShootingBgmDiagnostics();
  };
  document.addEventListener('pointerdown', onGesture, true);
  document.addEventListener('touchstart', onGesture, { capture:true, passive:true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pending = false; changeAudio(null); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindEvents, { once: true });
  else bindEvents();
  window.setInterval(sample, 1200);
})();
