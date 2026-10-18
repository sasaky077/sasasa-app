/* =========================================================
   build1622 — BGM のフェード（共通）
   iOS Safari は <audio>.volume の変更が効かず、従来のフェードが「すぱっと切れる」状態だった。
   Web Audio の GainNode を経由させてフェードする（iOS でも有効）。使えない環境は volume で代替。
   - ZsBgmFade.fadeOut(audio, ms, {reset})  … なめらかに下げて pause
   - ZsBgmFade.fadeIn(audio, ms)            … 0 から上げる（再生は呼び出し側）
   - ZsBgmFade.cancel(audio)                … 進行中のフェードを止めて音量を戻す
   ========================================================= */
(function () {
  'use strict';
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null;

  function ensureContext() {
    if (!AC) return null;
    try {
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch (_) { ctx = null; }
    return ctx;
  }
  // AudioContext はユーザー操作中に作る／再開する必要がある（iOS）
  ['pointerdown', 'touchend', 'keydown'].forEach(type => {
    window.addEventListener(type, ensureContext, { capture: true, passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  });

  // GainNode へ接続（要素ごとに1回だけ）。コンテキストが動いていない時は接続しない（無音化を防ぐ）。
  function gainOf(audio) {
    if (!audio) return null;
    if (audio.__zsGain) return audio.__zsGain;
    const c = ensureContext();
    if (!c || c.state !== 'running') return null;
    try {
      const src = c.createMediaElementSource(audio);
      const gain = c.createGain();
      gain.gain.value = 1;
      src.connect(gain).connect(c.destination);
      audio.__zsGain = gain;
      return gain;
    } catch (_) { return null; }
  }

  function cancel(audio) {
    if (!audio) return;
    if (audio.__zsFadeTimer) { clearTimeout(audio.__zsFadeTimer); audio.__zsFadeTimer = 0; }
    if (audio.__zsFadeRaf) { cancelAnimationFrame(audio.__zsFadeRaf); audio.__zsFadeRaf = 0; }
    const g = audio.__zsGain;
    if (g && ctx) {
      try { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setValueAtTime(1, ctx.currentTime); } catch (_) {}
    }
  }

  // volume での代替（PC・Android 向け）。cos カーブで聴感上なめらかに。
  function rampVolume(audio, from, to, ms, done) {
    const start = performance.now();
    const step = now => {
      const r = Math.max(0, Math.min(1, (now - start) / ms));
      const k = to < from ? Math.cos(r * Math.PI / 2) : Math.sin(r * Math.PI / 2);
      audio.volume = Math.max(0, Math.min(1, to < from ? to + (from - to) * k : from + (to - from) * k));
      if (r < 1) audio.__zsFadeRaf = requestAnimationFrame(step);
      else { audio.__zsFadeRaf = 0; if (done) done(); }
    };
    audio.__zsFadeRaf = requestAnimationFrame(step);
  }

  function fadeOut(audio, ms, opts) {
    opts = opts || {};
    if (!audio) return;
    cancel(audio);
    ms = Math.max(60, Number(ms || 800));
    const finish = () => {
      try { audio.pause(); } catch (_) {}
      if (opts.reset) { try { audio.currentTime = 0; } catch (_) {} }
      if (audio.__zsGain && ctx) { try { audio.__zsGain.gain.setValueAtTime(1, ctx.currentTime); } catch (_) {} }
      if (typeof opts.restoreVolume === 'number') audio.volume = opts.restoreVolume;
      if (typeof opts.onDone === 'function') opts.onDone();
    };
    if (audio.paused) { finish(); return; }
    const g = gainOf(audio);
    if (g && ctx) {
      const t = ctx.currentTime;
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        // 指数カーブ（時定数 = 長さの1/4）で自然に減衰させ、最後に0へ
        g.gain.setTargetAtTime(0.0001, t, ms / 4000);
      } catch (_) {}
      audio.__zsFadeTimer = setTimeout(() => { audio.__zsFadeTimer = 0; finish(); }, ms);
      return;
    }
    rampVolume(audio, Number(audio.volume || 0), 0, ms, finish);
  }

  function fadeIn(audio, ms, targetVolume) {
    if (!audio) return;
    cancel(audio);
    ms = Math.max(60, Number(ms || 800));
    const target = typeof targetVolume === 'number' ? targetVolume : Number(audio.volume || 1);
    const g = gainOf(audio);
    if (g && ctx) {
      audio.volume = target;
      const t = ctx.currentTime;
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(1, t + ms / 1000);
      } catch (_) {}
      return;
    }
    audio.volume = 0;
    rampVolume(audio, 0, target, ms);
  }

  window.ZsBgmFade = { fadeOut, fadeIn, cancel, ensureContext };
})();
