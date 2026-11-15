/* ZERAPHIA build1997 — BGM を Web Audio で鳴らす（iOS 27.2 の WebKit 不具合対策）
 *
 * 背景（実機の ExcResource ログで確認）
 *   iOS 27.2 では <audio> で BGM を鳴らすと、WebKit の描画・音声プロセス（com.apple.WebKit.GPU）が
 *   「再生中」表示（ロック画面・コントロールセンター）の更新中に通信ポートを漏らし、約24秒で上限
 *   （131,072）に達して強制終了される端末がある。終了のたびに 弾の絵が消える・音が途切れる・
 *   画面が一瞬消える・カクつく。BGM をオフにすると起きない。
 *
 * 対策
 *   BGM の <audio> 要素はそのまま残し（既存コードは今まで通り play/pause/currentTime/volume を呼ぶ）、
 *   実際の音だけを Web Audio（AudioContext＋AudioBuffer）で鳴らす。<audio> 自体は一度も再生しない。
 *   Web Audio は iOS の「再生中」表示の仕組みを通らないので、不具合の引き金を踏まない。
 *
 * 対象：iPhone / iPad の Safari・ホーム画面アプリ（他の環境は従来どおり <audio>）
 *   localStorage 'zs_audio_engine' = 'auto'（既定）| 'webaudio'（どの環境でも Web Audio）| 'element'（従来の <audio>）
 *   ※ 切り替えはページの読み込み時に決まる（診断画面から変更 → アプリを開き直す）
 *
 * 音量：iOS の <audio> は volume が効かず常に最大で鳴っていた。聞こえ方を変えないよう、
 *   iOS では今まで通り volume を無視して最大で鳴らす（muted だけ反映）。
 *
 * マナーモード：Web Audio は iOS の消音スイッチに従う（<audio> は従わなかった）。
 *   localStorage 'zs_audio_session' = 'playback' で消音スイッチを無視する設定にできる（検証用）。
 */
(function () {
  'use strict';
  const IDS_SELECTOR = 'audio#bgm-opening, audio#bgm, audio.bgm-battle-track';
  const FADE_SEC = 0.035;            // build1999: 止める・始める時のなめらかな音量変化
  const MAX_CACHED_BUFFERS = 2;       // デコード済みの曲は最大2曲だけ持つ（1曲で数十MBになるため）

  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1);
  let setting = 'auto';
  try { setting = localStorage.getItem('zs_audio_engine') || 'auto'; } catch (_) {}
  const AC = window.AudioContext || window.webkitAudioContext;
  // build2001: 自動の時は iOS 27 系以降だけ（不具合が確認された 27.2 を含む系統）。それより古い iOS・PC・Android は従来の <audio>
  const safariMajor = (() => { const m = ua.match(/Version\/(\d+)/); return m ? Number(m[1]) : 0; })();
  const affectedIOS = isIOS && (safariMajor >= 27 || safariMajor === 0); // バージョン表記の無いiOSブラウザは安全側（Web Audio）
  const useWebAudio = !!AC && (setting === 'webaudio' || (setting === 'auto' && affectedIOS));

  // 診断ログ（zs_diag.js より先に読まれるので、無ければ同じ形式で直接書く）
  const diag = (type, detail) => {
    try {
      if (window.ZsDiag) { window.ZsDiag.log(type, detail); return; }
      const list = JSON.parse(localStorage.getItem('zs_diag_v1') || '[]');
      list.push({ t: new Date().toISOString(), type: String(type), detail: String(detail || '').slice(0, 300) });
      while (list.length > 40) list.shift();
      localStorage.setItem('zs_diag_v1', JSON.stringify(list));
    } catch (_) {}
  };
  const proto = HTMLMediaElement.prototype;

  window.ZsBgmEngine = { mode: useWebAudio ? 'webaudio' : 'element', setting, isIOS, safariMajor };
  if (!useWebAudio) return;

  // ---------------- AudioContext ----------------
  let ctx = null;
  function getCtx() {
    if (ctx) return ctx;
    try { ctx = new AC({ latencyHint: 'playback' }); } catch (_) { ctx = new AC(); }
    try {
      let sess = 'auto';
      try { sess = localStorage.getItem('zs_audio_session') || 'auto'; } catch (_) {}
      if (sess === 'playback' && navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch (_) {}
    ctx.addEventListener('statechange', () => {
      if (ctx.state === 'running') voices.forEach(v => v.kick());
    });
    return ctx;
  }
  // 全曲共通の出口（バックグラウンドへ移る時にまとめて静かにする）
  let master = null;
  function getMaster() {
    const c = getCtx();
    if (!master) { master = c.createGain(); master.gain.value = document.hidden ? 0 : 1; master.connect(c.destination); }
    return master;
  }
  function resumeCtx() {
    const c = getCtx();
    if (c.state !== 'running') { try { return c.resume(); } catch (_) {} }
    return Promise.resolve();
  }
  // build1997: iOS は画面操作の中でしか音を出し始められない。
  //  どの画面のどんなタップでも、最初の操作で「音の出口」（AudioContext）を開けておく。
  //  一度開けば、以後はタップなしでどの曲もいつでも鳴らせる（<audio> のように曲ごとの準備は要らない）。
  //  iOS で「操作」と認められるのは指を離した時（touchend / pointerup / click）とキー入力。押した瞬間（touchstart）は認められない。
  const unlock = () => {
    const c = getCtx();
    if (quiet && !document.hidden) restoreNow(); // フォーカスが戻った通知を取りこぼしても、触れば戻る
    if (c.state !== 'running') resumeCtx();
  };
  ['touchend', 'pointerup', 'click', 'keydown', 'pointerdown', 'touchstart'].forEach(t => window.addEventListener(t, unlock, { capture: true, passive: true }));
  // build2001: バックグラウンドへ移る時・アプリ切替画面を出した時は、音の出口（AudioContext）を完全に閉じる。
  //  一時停止（suspend）だけでは、iOS がページを凍結した後も音声側が最後の音を繰り返し「プーン…」と鳴る事があった。
  //  閉じれば iOS 側の音の処理ごと片付く。戻ってきたら作り直す（iOS の規則で、鳴り出すのは次のタップから）。
  //  曲のデータ（展開済みの AudioBuffer）は閉じても使い回せるので、再読み込みは起きない。
  let quiet = false;
  function quietNow(reason) {
    quiet = true;
    if (!ctx) return;
    try { if (master) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(0, t); } } catch (_) {}
    // 位置を覚えてから、鳴っている音をその場で切る（quiet 中の stopNode は即時に止める）
    voices.forEach(v => { try { v.stopNode(); } catch (_) {} v.gain = null; v.nodeGain = null; });
    const old = ctx;
    ctx = null; master = null;
    try { const p = old.close(); if (p && p.catch) p.catch(() => {}); } catch (_) {}
  }
  function restoreNow() {
    if (document.hidden) return;
    quiet = false;
    if (voices.some(v => !v.paused)) resumeCtx(); // 新しい出口を作って再開を試す（タップ前なら、次のタップで鳴る）
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) quietNow('hidden'); else restoreNow(); });
  window.addEventListener('pagehide', () => quietNow('pagehide'));
  window.addEventListener('pageshow', () => restoreNow());
  window.addEventListener('blur', () => { if (!document.hasFocus || !document.hasFocus()) quietNow('blur'); });
  window.addEventListener('focus', () => restoreNow());

  // ---------------- 曲データ（取得・デコード・キャッシュ） ----------------
  const buffers = new Map(); // key -> { buffer, promise, usedAt }
  function keyOf(src) {
    try {
      const u = new URL(src, location.href);
      const v = u.searchParams.get('v');
      return u.pathname + (v ? '?v=' + v : '');
    } catch (_) { return String(src || ''); }
  }
  function fetchUrlOf(src) {
    // 再読み込み用に付けられた印（retry / __bgm_recovery / r）はそのまま渡す＝キャッシュを避けた取得になる
    return src;
  }
  function loadBuffer(src) {
    const key = keyOf(src);
    let rec = buffers.get(key);
    if (rec && (rec.buffer || rec.promise)) { rec.usedAt = performance.now(); return rec.promise || Promise.resolve(rec.buffer); }
    rec = { buffer: null, promise: null, usedAt: performance.now() };
    buffers.set(key, rec);
    rec.promise = fetch(fetchUrlOf(src), { cache: 'default' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((resolve, reject) => {
        // Safari の古い版は Promise を返さないのでコールバック形式で呼ぶ
        try { const p = getCtx().decodeAudioData(ab, resolve, reject); if (p && p.then) p.then(resolve, reject); } catch (e) { reject(e); }
      }))
      .then(buf => { rec.buffer = buf; rec.promise = null; trimCache(); return buf; })
      .catch(err => { buffers.delete(key); throw err; });
    return rec.promise;
  }
  function trimCache() {
    const inUse = new Set(voices.filter(v => !v.paused || v.loading).map(v => keyOf(v.src)));
    const list = [...buffers.entries()].filter(([, r]) => r.buffer).sort((a, b) => b[1].usedAt - a[1].usedAt);
    let kept = 0;
    for (const [k] of list) {
      if (inUse.has(k)) { kept++; continue; }
      if (kept < MAX_CACHED_BUFFERS) { kept++; continue; }
      buffers.delete(k);
    }
  }

  // ---------------- 1曲ぶんの再生係（<audio> 1つに1つ） ----------------
  const voices = [];
  class Voice {
    constructor(el) {
      this.el = el;
      this.src = el.getAttribute('src') || '';
      this.paused = true;
      this.ended = false;
      this.volume = 1;
      this.muted = false;
      this.offset = 0;          // 止まっている時の再生位置（秒）
      this.startCtxTime = 0;    // 鳴っている時：位置0に当たる AudioContext の時刻
      this.node = null;
      this.gain = null;
      this.loading = false;
      this.error = null;
      this.metaSent = false;
    }
    get key() { return keyOf(this.src); }
    get buffer() { const r = buffers.get(this.key); return r && r.buffer; }
    get duration() { const b = this.buffer; return b ? b.duration : NaN; }
    get running() { return !!this.node; }
    get currentTime() {
      const b = this.buffer;
      if (!this.node || !b || !ctx) return this.offset;
      const t = ctx.currentTime - this.startCtxTime;
      if (this.el.loop) return ((t % b.duration) + b.duration) % b.duration;
      return Math.min(b.duration, Math.max(0, t));
    }
    set currentTime(sec) {
      const s = Math.max(0, Number(sec) || 0);
      const wasRunning = this.running;
      this.stopNode();
      this.offset = s;
      this.ended = false;
      if (wasRunning && !this.paused) this.kick();
    }
    gainValue() {
      if (this.muted) return 0;
      // iOS の <audio> は volume が効かず、常に最大音量で鳴っていた（フェードも無し）。
      // 既存コードには「音量0のまま再生」する経路もある（iOSでは無害だった）ので、iOS では今まで通り音量を無視する。
      if (isIOS) return 1;
      return Math.max(0, Math.min(1, Number(this.volume)));
    }
    applyGain() { if (this.gain) { try { this.gain.gain.value = this.gainValue(); } catch (_) {} } }
    stopNode() {
      if (!this.node) return;
      // 位置を覚えてから止める
      this.offset = this.currentTime;
      const n = this.node, fg = this.nodeGain; this.node = null; this.nodeGain = null;
      try { n.onended = null; } catch (_) {}
      if (quiet || document.hidden || !ctx || ctx.state !== 'running') {
        // 止まっている最中は音が出ないので、その場で切って片付ける（再開時に古い音が一瞬残らないように）
        try { n.stop(); } catch (_) {}
        try { n.disconnect(); } catch (_) {} try { fg && fg.disconnect(); } catch (_) {}
        return;
      }
      // build1999: いきなり切ると波形が途切れて「プツッ／プーン」と鳴る。数十ミリ秒で音量を0へ下げてから止める
      try {
        const t = ctx.currentTime;
        if (fg) { fg.gain.cancelScheduledValues(t); fg.gain.setValueAtTime(fg.gain.value, t); fg.gain.linearRampToValueAtTime(0, t + FADE_SEC); }
        n.stop(t + FADE_SEC + 0.01);
      } catch (_) { try { n.stop(); } catch (_) {} }
      setTimeout(() => { try { n.disconnect(); } catch (_) {} try { fg && fg.disconnect(); } catch (_) {} }, (FADE_SEC + 0.1) * 1000);
    }
    // 鳴らすべきなら鳴らす（曲の準備・AudioContext の再開を待ってから）
    kick() {
      if (this.paused || this.node) return;
      const b = this.buffer;
      if (!b) { this.prepare(); return; }
      const c = getCtx();
      if (c.state !== 'running') return; // 再開したら statechange から再度呼ばれる
      if (!this.gain) { this.gain = c.createGain(); this.gain.connect(getMaster()); }
      this.applyGain();
      const n = c.createBufferSource();
      n.buffer = b;
      n.loop = !!this.el.loop;
      // build1999: 1回の再生ごとに専用の音量（出だし・止める時にだけ短くなめらかに変える）
      const fg = c.createGain();
      fg.gain.setValueAtTime(0, c.currentTime);
      fg.gain.linearRampToValueAtTime(1, c.currentTime + FADE_SEC);
      n.connect(fg); fg.connect(this.gain);
      this.nodeGain = fg;
      let off = this.offset;
      if (!(off >= 0) || off >= b.duration) off = n.loop ? (off % b.duration) || 0 : 0;
      n.start(0, off);
      this.startCtxTime = c.currentTime - off;
      this.node = n;
      n.onended = () => {
        if (this.node !== n) return;
        this.node = null;
        this.offset = 0;
        this.paused = true;
        this.ended = true;
        fire(this.el, 'ended'); fire(this.el, 'pause');
      };
      buffers.get(this.key) && (buffers.get(this.key).usedAt = performance.now());
      trimCache();
      fire(this.el, 'playing');
    }
    prepare() {
      if (this.loading || this.buffer) return;
      this.loading = true;
      const src = this.src;
      loadBuffer(src).then(() => {
        this.loading = false;
        if (src !== this.src) return;
        this.error = null;
        if (!this.metaSent) { this.metaSent = true; fire(this.el, 'loadedmetadata'); fire(this.el, 'loadeddata'); fire(this.el, 'canplay'); fire(this.el, 'canplaythrough'); }
        this.kick();
      }, err => {
        this.loading = false;
        this.error = { code: 4, message: String(err && err.message || err) };
        diag('bgm-webaudio-error', `${this.el.id} ${this.error.message}`.slice(0, 200));
        fire(this.el, 'error');
      });
    }
    play() {
      this.ended = false;
      const was = this.paused;
      this.paused = false;
      if (was) fire(this.el, 'play');
      const resumed = resumeCtx(); // 操作の中で呼ばれていれば、ここで音が解禁される
      this.prepare();
      this.kick();
      // build1997: 音の出口がまだ開いていない（アプリ起動直後でまだ一度も触っていない）時も失敗にはしない。
      //  「鳴らしたい」状態のまま待ち、最初のタップで出口が開いた瞬間に鳴り始める（statechange → kick）。
      //  （以前は失敗を返して各画面の「次のタップで再試行」に任せていたが、iOS は押した瞬間の操作を認めないため取りこぼしがあった）
      Promise.resolve(resumed).then(() => { this.kick(); }, () => {});
      return Promise.resolve(); // 解禁を待つ約束は返さない（iOS では操作があるまで決着しないため）
    }
    pause() {
      if (this.paused) return;
      this.stopNode();
      this.paused = true;
      fire(this.el, 'pause');
      trimCache();
    }
    load() {
      // 曲を差し替えた／読み直し：今の位置は捨てる
      this.stopNode();
      this.offset = 0;
      this.metaSent = false;
      this.error = null;
      this.prepare();
      if (this.buffer && !this.metaSent) { this.metaSent = true; setTimeout(() => { fire(this.el, 'loadedmetadata'); fire(this.el, 'loadeddata'); fire(this.el, 'canplay'); }, 0); }
      if (!this.paused) this.kick();
    }
    setSrc(src) {
      const before = this.key;
      this.src = String(src || '');
      if (keyOf(this.src) !== before) {
        this.stopNode();
        this.offset = 0;
        this.metaSent = false;
      }
    }
  }
  function fire(el, type) {
    // ネイティブと同じく非同期で通知
    setTimeout(() => { try { el.dispatchEvent(new Event(type)); } catch (_) {} }, 0);
  }

  // ---------------- <audio> 要素に被せる ----------------
  function adopt(el) {
    if (!el || el.__zsVoice) return;
    const v = new Voice(el);
    el.__zsVoice = v;
    voices.push(v);
    // 本物の <audio> は読み込みも再生もさせない（メディア再生の仕組みに一切乗せない）
    try { el.removeAttribute('src'); el.preload = 'none'; proto.load.call(el); } catch (_) {}
    const def = (name, get, set) => Object.defineProperty(el, name, { configurable: true, enumerable: true, get, set });
    def('paused', () => v.paused);
    def('ended', () => v.ended);
    def('currentTime', () => v.currentTime, s => { v.currentTime = s; });
    def('volume', () => v.volume, x => { v.volume = Math.max(0, Math.min(1, Number(x) || 0)); v.applyGain(); });
    def('muted', () => v.muted, x => { v.muted = !!x; v.applyGain(); });
    def('duration', () => v.duration);
    def('readyState', () => (v.buffer ? 4 : (v.loading ? 1 : 0)));
    def('networkState', () => (v.loading ? 2 : 1));
    def('error', () => v.error);
    def('src', () => { try { return new URL(v.src, location.href).href; } catch (_) { return v.src; } }, x => v.setSrc(x));
    def('currentSrc', () => { try { return new URL(v.src, location.href).href; } catch (_) { return v.src; } });
    // 既存コードの getAttribute('src') 用に、属性は見かけだけ持たせる（読み込みは起きないよう preload=none を維持）
    el.play = () => v.play();
    el.pause = () => v.pause();
    el.load = () => v.load();
    const nativeGetAttr = el.getAttribute;
    el.getAttribute = function (name) {
      if (String(name).toLowerCase() === 'src') return v.src;
      return nativeGetAttr.call(this, name);
    };
  }
  function adoptAll() { document.querySelectorAll(IDS_SELECTOR).forEach(adopt); }
  adoptAll();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', adoptAll, { once: true });

  // build1998: タイトルBGMは起動直後（スプラッシュ表示中）に取得・展開しておく。
  //  展開は音の出口が開く前（タップ前）でもできるので、タイトルで最初にタップした瞬間に遅れなく鳴る。
  function prefetchTitleBgm() {
    try { if (localStorage.getItem('zeraphia_bgm_enabled') === 'false') return; } catch (_) {}
    const el = document.getElementById('bgm-opening');
    const v = el && el.__zsVoice;
    if (!v || v.buffer || v.loading) return;
    v.prepare();
  }
  setTimeout(prefetchTitleBgm, 0);

  Object.defineProperty(window.ZsBgmEngine, 'ctxState', { configurable: true, get: () => (ctx ? ctx.state : 'none') });
  window.ZsBgmEngine = Object.assign(window.ZsBgmEngine, {
    voices: () => voices.map(v => ({ id: v.el.id, gain: v.gainValue(), paused: v.paused, playing: !!v.node, t: Number(v.currentTime.toFixed(2)), loaded: !!v.buffer, loading: v.loading, err: v.error && v.error.message })),
    cached: () => [...buffers.entries()].map(([k, r]) => ({ key: k, ready: !!r.buffer, sec: r.buffer ? Math.round(r.buffer.duration) : 0 })),
    adopt,
  });
  diag('bgm-engine', `webaudio / setting=${setting} / ios=${isIOS} / voices=${voices.length}`);
})();
