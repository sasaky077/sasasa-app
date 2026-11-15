/* ============================================================
   build1877 — 隠しステージ「夜明け」（トワ -光の姿-）
   残響の塔20F（通常モード）のクリア時に、サーバーが1/30で出現を確定する。
     20F開始  : begin_towa_dawn_watch()                → watch_id（本番・練習どちらも）
     20F勝利  : roll_towa_dawn(watch_id, party_ids)    → hit なら dawn_id
     RESULT後 : クラッシュ（フリーズ→ノイズ→ホワイトアウト）→ SPECIAL STAGE / 夜明け → 出撃 → 戦闘（編成は20Fのまま固定・全回復）
     戦闘開始 : begin_towa_dawn_run(dawn_id)           → party_ids（サーバーが正）
     戦闘終了 : finish_towa_dawn_run(dawn_id, win)      → トワ（光）付与・凸・完凸後は聖霊花(SR)
   抽選・権利・報酬はすべてサーバーで確定する。ここは表示と呼び出しだけ。
   ============================================================ */
(function () {
  'use strict';
  const STAGE_ID = 'shooting_towa_dawn';
  const TOWER20_ID = 'shooting_tower_20';
  const STORE_KEY = 'zeraphia_towa_dawn_pending_v1';
  const CHARACTER_ID = 112;

  let watchId = '';
  let watchPromise = null;
  let pending = null;      // { dawnId, party:[...], expiresAt }
  let rollPromise = null;
  let launching = false;

  const client = () => window.zsSupabase || null;
  const parse = (d) => { if (typeof d === 'string') { try { return JSON.parse(d); } catch (_) { return null; } } return d; };
  const toast = (m) => { try { if (typeof window.showToast === 'function') window.showToast(m); } catch (_) {} };

  function savePending() {
    try {
      if (pending) localStorage.setItem(STORE_KEY, JSON.stringify(pending));
      else localStorage.removeItem(STORE_KEY);
    } catch (_) {}
  }
  function loadPending() {
    try {
      const v = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (v && v.dawnId && (!v.expiresAt || Date.parse(v.expiresAt) > Date.now())) return v;
    } catch (_) {}
    return null;
  }
  pending = loadPending();

  async function rpc(name, args) {
    const c = client();
    if (!c || typeof c.rpc !== 'function') throw new Error('サーバーへ接続できません');
    const res = await c.rpc(name, args || {});
    if (res && res.error) throw res.error;
    const data = parse(res ? res.data : null);
    return data || {};
  }

  // ---------------- 20F ----------------
  function isTower20(stage) { return !!(stage && String(stage.id || '') === TOWER20_ID); }

  function onTower20Start(stage, partyIds) {
    watchId = '';
    if (!isTower20(stage)) return;
    const proof = window.ResonanceTower?.getDawnProof?.();
    const party = Array.isArray(partyIds) ? partyIds.map(Number) : (proof?.party || []);
    if (!party.length || party.some(id => !Number.isInteger(id))) return;
    watchPromise = rpc('begin_towa_dawn_watch', {p_party_ids:party, p_tower_token:proof?.towerToken || null})
      .then(d => { if (d && d.ok !== false && d.watch_id) watchId = String(d.watch_id); })
      .catch(err => { console.warn('[TowaDawn] watch skipped', err); });
  }

  function onTower20Result(stage, win, partyIds) {
    if (!isTower20(stage) || !win) { watchId = ''; return Promise.resolve(false); }
    rollPromise = (async () => {
      try { await watchPromise; } catch (_) {}
      if (!watchId) {
        console.warn('[TowaDawn] 20F watch is missing; roll cannot run');
        window.showToast?.('夜明けの抽選を開始できませんでした。観測記録がありません');
        return false;
      }
      const id = watchId;
      const party = (partyIds || []).map(Number).filter(n => n > 0).slice(0, 3);
      // Retry only when the server explicitly reports that the minimum 40-second
      // observation window has not elapsed, or when a transient connection fails.
      // Do not consume watchId until a confirmed server result is returned.
      for (let retry = 0; retry < 5; retry++) {
        try {
          const d = await rpc('roll_towa_dawn', { p_watch_id: id, p_party_ids: party });
          if (d && d.ok === false && d.reason === 'too_fast') {
            await new Promise(resolve => setTimeout(resolve, 2200));
            continue;
          }
          if (d && d.ok === false) {
            console.warn('[TowaDawn] roll rejected:', d.reason || 'unknown');
            window.showToast?.('夜明けの抽選を確認できません：' + String(d.reason || 'unknown'));
            return false;
          }
          if (d && d.ok !== false) {
            watchId = '';
            if (d.hit && d.dawn_id) {
              pending = { dawnId: String(d.dawn_id), party: (d.party_ids || party).map(Number), expiresAt: d.expires_at || '' };
              savePending();
              return true;
            }
            return false;
          }
        } catch (err) {
          console.warn('[TowaDawn] roll attempt failed', retry + 1, err);
          if (retry === 4) {
            window.showToast?.('夜明けの抽選を確認できませんでした。通信状態をご確認ください');
            return false;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      console.warn('[TowaDawn] roll timed out waiting for minimum observation time');
      window.showToast?.('夜明けの抽選を確認できませんでした（観測時間不足）');
      return false;
    })();
    return rollPromise;
  }

  function hasPending() { return !!(pending && pending.dawnId); }
  async function waitRoll() { try { await rollPromise; } catch (_) {} return hasPending(); }

  // ---------------- build1971: 20F RESULT → クラッシュ（フリーズ → ノイズ → ホワイトアウト） ----------------
  //  夜明けが当たっている時だけ、RESULTの「戻る」で通常の白フェードの代わりに流す。
  //  終わりは画面全体が白のまま残す（このあと launch() のスプラッシュが同じ白から始まる）。
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };

  // ノイズ音（WebAudio で生成。BGM音量設定に合わせ、0なら鳴らさない）
  function createCrashAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const vol = Math.max(0, Math.min(1, Number(window.bgmVolume ?? 30) / 100));
    if (!AC || vol <= 0) return null;
    let ctx;
    try { ctx = new AC(); if (ctx.state === 'suspended') ctx.resume().catch(() => {}); } catch (_) { return null; }
    const len = Math.floor(ctx.sampleRate * 1.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 1600; band.Q.value = .6;
    const gain = ctx.createGain(); gain.gain.value = 0;
    src.connect(band).connect(gain).connect(ctx.destination);
    src.start();
    const base = .42 * vol;
    return {
      // ざざ…：不規則に揺れる短いノイズ
      burst(ms, level) {
        const t0 = ctx.currentTime;
        const steps = Math.max(2, Math.round(ms / 45));
        for (let i = 0; i < steps; i++) {
          const v = base * level * (Math.random() < .22 ? .08 : (.45 + Math.random() * .55));
          gain.gain.setValueAtTime(v, t0 + i * .045);
        }
        gain.gain.setValueAtTime(0, t0 + ms / 1000);
      },
      // ホワイトアウト：ノイズが高く細く伸びて消え、鈴のような音が一つ残る
      whiteout(ms) {
        const t0 = ctx.currentTime, d = ms / 1000;
        gain.gain.cancelScheduledValues(t0);
        gain.gain.setValueAtTime(base * .9, t0);
        gain.gain.exponentialRampToValueAtTime(.0005, t0 + d);
        band.frequency.setValueAtTime(1600, t0);
        band.frequency.exponentialRampToValueAtTime(9000, t0 + d);
        band.Q.setValueAtTime(.6, t0); band.Q.linearRampToValueAtTime(6, t0 + d);
        [880, 1318.5].forEach((f, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = f;
          const ts = t0 + d * .75 + i * .09;
          g.gain.setValueAtTime(0, ts);
          g.gain.linearRampToValueAtTime(base * (i ? .22 : .35), ts + .02);
          g.gain.exponentialRampToValueAtTime(.0005, ts + 1.8);
          o.connect(g).connect(ctx.destination); o.start(ts); o.stop(ts + 1.9);
        });
      },
      close() { setTimeout(() => { try { src.stop(); ctx.close(); } catch (_) {} }, 2600); },
    };
  }

  function ensureCrashStyle() {
    if (document.getElementById('towa-dawn-crash-style')) return;
    const st = document.createElement('style');
    st.id = 'towa-dawn-crash-style';
    st.textContent = `
      .tdc-frozen, .tdc-frozen *{animation-play-state:paused!important;transition:none!important;pointer-events:none!important}
      #towa-dawn-crash{position:fixed;inset:0;z-index:520400;pointer-events:auto;overflow:hidden;user-select:none;-webkit-user-select:none}
      #towa-dawn-crash canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;opacity:0;mix-blend-mode:hard-light}
      #towa-dawn-crash.is-noise canvas{opacity:.28}
      #towa-dawn-crash canvas{mix-blend-mode:difference}
      #towa-dawn-crash .tdc-slice{position:absolute;inset:0;overflow:hidden;opacity:0;pointer-events:none}
      #towa-dawn-crash .tdc-slice > *{position:absolute!important;inset:0!important;margin:0!important}
      .tdc-frozen{filter:brightness(.9) saturate(.8)}
      #towa-dawn-crash .tdc-bar{position:absolute;left:-10%;width:120%;height:0;opacity:0;will-change:transform}
      #towa-dawn-crash .tdc-tag{position:absolute;left:14px;top:calc(env(safe-area-inset-top,0px) + 12px);
        font:700 11px/1.4 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.12em;color:rgba(255,255,255,.92);
        text-shadow:2px 0 rgba(255,0,70,.75),-2px 0 rgba(0,220,255,.75);opacity:0}
      #towa-dawn-crash .tdc-white{position:absolute;inset:0;background:#fff;opacity:0}
      #towa-dawn-crash .tdc-bloom{position:absolute;left:-20%;right:-20%;top:50%;height:0;margin-top:0;
        background:radial-gradient(ellipse at 50% 50%,#fff 0 30%,rgba(255,244,214,.85) 52%,rgba(255,226,160,0) 72%);opacity:0}
      #towa-dawn-crash.is-white .tdc-bloom{animation:tdcBloom .8s cubic-bezier(.5,0,.2,1) forwards}
      #towa-dawn-crash.is-white .tdc-white{animation:tdcWhite .8s cubic-bezier(.6,0,.4,1) .12s forwards}
      #towa-dawn-crash.is-white .tdc-bar{background:#fff!important;box-shadow:0 0 18px 4px rgba(255,236,190,.9)!important;mix-blend-mode:normal!important}
      @keyframes tdcBloom{0%{height:2px;margin-top:-1px;opacity:1}100%{height:180vh;margin-top:-90vh;opacity:1}}
      @keyframes tdcWhite{to{opacity:1}}
      .tdc-hitch{translate:0 2px}
    `;
    document.head.appendChild(st);
  }

  async function playCrash(opts = {}) {
    ensureCrashStyle();
    document.getElementById('towa-dawn-crash')?.remove();
    const result = opts.resultEl || document.getElementById('shooting-result');
    const calm = reducedMotion();
    const ov = document.createElement('div');
    ov.id = 'towa-dawn-crash';
    ov.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas');
    canvas.width = 90; canvas.height = 160;
    ov.appendChild(canvas);
    const bars = Array.from({ length: 9 }, () => { const b = document.createElement('i'); b.className = 'tdc-bar'; ov.appendChild(b); return b; });
    ov.insertAdjacentHTML('beforeend', '<span class="tdc-tag">NO SIGNAL<br>ECHO TOWER 20F ／ LOST</span><i class="tdc-bloom"></i><i class="tdc-white"></i>');
    document.body.appendChild(ov);
    const tag = ov.querySelector('.tdc-tag');
    // 画面の裂け目：RESULTの静止コピーを帯状に切り抜き、横へずらす（明るい画面でもはっきり見える）
    const slices = [];
    if (result && !calm) {
      for (let i = 0; i < 3; i++) {
        const wrap = document.createElement('div');
        wrap.className = 'tdc-slice';
        try {
          const copy = result.cloneNode(true);
          copy.removeAttribute('id');
          copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
          wrap.appendChild(copy);
        } catch (_) {}
        ov.insertBefore(wrap, canvas);
        slices.push(wrap);
      }
    }
    const g = canvas.getContext('2d');
    const img = g ? g.createImageData(canvas.width, canvas.height) : null;

    // 1) フリーズ：音が途切れ、画面が止まる。一度だけ引っかかる
    try { opts.cutBgm && opts.cutBgm(); } catch (_) {}
    const audio = createCrashAudio();
    if (result) result.classList.add('tdc-frozen');
    await sleep(340);
    if (result && !calm) { result.classList.add('tdc-hitch'); await sleep(50); result.classList.remove('tdc-hitch'); }
    await sleep(calm ? 200 : 330);

    // 2) ノイズ：横線が走り、画面がずれる（ざざ…）
    let intensity = 0;
    const tick = () => {
      if (img) {
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
        g.putImageData(img, 0, 0);
      }
      const h = window.innerHeight || 700;
      bars.forEach((b, i) => {
        const on = Math.random() < .25 + intensity * .6;
        if (!on) { b.style.opacity = '0'; return; }
        const thick = 1 + Math.random() * (4 + intensity * 26);
        const hue = Math.random();
        b.style.top = `${Math.random() * h}px`;
        b.style.height = `${thick}px`;
        b.style.opacity = String(.35 + Math.random() * .6);
        b.style.transform = `translateX(${(Math.random() - .5) * 40 * (1 + intensity)}px)`;
        b.style.background = hue < .3 ? 'rgba(18,10,26,.82)' : hue < .58 ? '#fff' : hue < .78 ? 'rgba(255,40,90,.6)' : 'rgba(30,210,255,.6)';
        b.style.mixBlendMode = hue >= .3 && hue < .58 ? 'difference' : 'normal';
      });
      const hPx = window.innerHeight || 700;
      slices.forEach(sl => {
        if (Math.random() > .2 + intensity * .55) { sl.style.opacity = '0'; return; }
        const top = Math.random() * hPx, band = 6 + Math.random() * (20 + intensity * 70);
        sl.style.opacity = '1';
        sl.style.clipPath = `inset(${top.toFixed(0)}px 0 ${Math.max(0, hPx - top - band).toFixed(0)}px 0)`;
        sl.style.transform = `translateX(${((Math.random() - .5) * (24 + intensity * 70)).toFixed(0)}px)`;
        sl.style.filter = Math.random() < .3 ? 'invert(1) hue-rotate(180deg)' : (Math.random() < .5 ? 'drop-shadow(3px 0 rgba(255,0,70,.7))' : 'none');
      });
      if (result && !calm) {
        const shift = (Math.random() - .5) * 14 * intensity;
        result.style.transform = Math.random() < .3 + intensity * .4 ? `translateX(${shift}px) skewX(${(Math.random() - .5) * 4 * intensity}deg)` : '';
        const flicker = intensity >= 1 && Math.random() < .1 ? ' invert(1) hue-rotate(180deg)' : '';
        result.style.filter = `drop-shadow(${2 + intensity * 3}px 0 rgba(255,0,70,.55)) drop-shadow(-${2 + intensity * 3}px 0 rgba(0,220,255,.55)) contrast(${1 + intensity * .4})${flicker}`;
      }
    };
    const timer = setInterval(tick, calm ? 160 : 55);
    ov.classList.add('is-noise');
    intensity = .25; audio && audio.burst(420, .7);
    await sleep(420);
    // 一瞬の静寂（止まる）
    intensity = 0; bars.forEach(b => { b.style.opacity = '0'; }); slices.forEach(sl => { sl.style.opacity = '0'; }); ov.classList.remove('is-noise');
    await sleep(170);
    // 二度目は強く、長く
    ov.classList.add('is-noise');
    intensity = .7; audio && audio.burst(640, 1);
    if (tag && !calm) { tag.style.opacity = '1'; setTimeout(() => { tag.style.opacity = '0'; }, 260); setTimeout(() => { tag.style.opacity = '.8'; }, 380); }
    await sleep(320);
    intensity = 1;
    await sleep(320);

    // 3) ホワイトアウト：横線が光に変わり、中心の一筋から白が満ちる
    audio && audio.whiteout(900);
    if (tag) tag.style.opacity = '0';
    slices.forEach(sl => sl.remove());
    ov.classList.add('is-white');
    await sleep(950);
    clearInterval(timer);
    if (result) { result.style.transform = ''; result.style.filter = ''; result.classList.remove('tdc-frozen'); }
    audio && audio.close();
    // 白のまま残す（スプラッシュが出たら消える）
  }
  function removeCrash() { document.getElementById('towa-dawn-crash')?.remove(); }

  // ---------------- ホワイトアウト → SPECIAL STAGE / 夜明け ----------------
  function ensureSplashStyle() {
    if (document.getElementById('towa-dawn-splash-style')) return;
    const st = document.createElement('style');
    st.id = 'towa-dawn-splash-style';
    st.textContent = `
      #towa-dawn-splash{position:fixed;inset:0;z-index:520500;display:flex;align-items:center;justify-content:center;
        background:#fff;opacity:1;pointer-events:auto;user-select:none;-webkit-user-select:none;overflow:hidden}
      #towa-dawn-splash::before{content:"";position:absolute;inset:-20%;
        background:radial-gradient(ellipse at 50% 58%,rgba(255,236,190,.0) 0,rgba(255,226,160,.38) 30%,rgba(255,255,255,0) 62%);
        opacity:0;animation:tdsGlow 3.4s ease-out .3s forwards}
      #towa-dawn-splash .tds-horizon{position:absolute;left:0;right:0;top:64%;height:1px;
        background:linear-gradient(90deg,transparent,rgba(214,160,70,.85) 30%,#fff 50%,rgba(214,160,70,.85) 70%,transparent);
        box-shadow:0 0 14px rgba(255,200,110,.8);transform:scaleX(0);animation:tdsHorizon 1.2s cubic-bezier(.2,.8,.2,1) .35s forwards}
      #towa-dawn-splash .tds-mote{position:absolute;bottom:-12px;width:4px;height:var(--rise);transform-origin:50% 100%;opacity:0;animation:tdsMote var(--dur) ease-out var(--dl) forwards}
      #towa-dawn-splash .tds-mote::after{content:"";position:absolute;left:0;bottom:0;width:4px;height:4px;border-radius:50%;background:#fff;box-shadow:0 0 8px 2px rgba(255,214,130,.85)}
      #towa-dawn-splash .tds-go{position:absolute;left:0;right:0;top:calc(50% + 92px);display:flex;flex-direction:column;align-items:center;gap:10px}
      #towa-dawn-splash .tds-slash{width:100vw;height:2px;background:linear-gradient(90deg,transparent,#fff 40%,#ffe2a0 60%,transparent);
        box-shadow:0 0 16px 3px rgba(255,214,120,.9);transform:scaleX(0);transform-origin:0 50%;animation:tdsSlash .45s cubic-bezier(.7,0,.2,1) 3.5s forwards}
      #towa-dawn-splash .tds-go b{font:700 22px/1 "Noto Serif JP","Yu Mincho",serif;letter-spacing:.9em;text-indent:.9em;color:#b07a2a;
        text-shadow:0 0 12px rgba(255,214,120,.9);opacity:0;animation:tdsGo .7s cubic-bezier(.2,.8,.2,1) 3.65s forwards}
      #towa-dawn-splash .tds-flash{position:absolute;inset:0;background:#fff;opacity:0;animation:tdsIn .45s ease-in 4.3s forwards}
      #towa-dawn-splash .tds-copy{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center}
      #towa-dawn-splash .tds-kicker{font:600 12px/1 "Cinzel","Times New Roman",serif;letter-spacing:.62em;text-indent:.62em;color:#b58a3e;
        opacity:0;animation:tdsIn .9s ease-out .5s forwards}
      #towa-dawn-splash .tds-rule{width:0;height:1px;background:linear-gradient(90deg,transparent,#c9a25a,transparent);animation:tdsRule 1.1s ease-out .9s forwards}
      #towa-dawn-splash .tds-title{font:400 clamp(40px,12vw,64px)/1 "Noto Serif JP","Yu Mincho","Hiragino Mincho ProN",serif;letter-spacing:.4em;text-indent:.4em;
        color:#5d4a33;opacity:0;filter:blur(8px);animation:tdsTitle 1.4s cubic-bezier(.2,.8,.2,1) 1.2s forwards}
      #towa-dawn-splash .tds-sub{font:400 15px/1 "Noto Serif JP",serif;letter-spacing:.32em;text-indent:.32em;color:#8e7656;opacity:0;animation:tdsIn 1s ease-out 2.1s forwards}
      #towa-dawn-splash.is-out{opacity:0;transition:opacity .7s ease}
      @keyframes tdsIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      @keyframes tdsRule{to{width:min(56vw,260px)}}
      @keyframes tdsTitle{to{opacity:1;filter:blur(0)}}
      @keyframes tdsGlow{0%{opacity:0}60%{opacity:1}100%{opacity:.8}}
      @keyframes tdsHorizon{to{transform:scaleX(1)}}
      @keyframes tdsMote{0%{opacity:0;transform:translateY(0)}20%{opacity:1}100%{opacity:0;transform:translateY(-100%)}} /* build1976: 変数を使わない */
      @keyframes tdsSlash{to{transform:scaleX(1)}}
      @keyframes tdsGo{0%{opacity:0;letter-spacing:1.6em;filter:blur(4px)}100%{opacity:1;letter-spacing:.9em;filter:none}}
      @media (prefers-reduced-motion:reduce){
        #towa-dawn-splash .tds-mote{display:none}
      }
    `;
    document.head.appendChild(st);
  }
  function showSplash() {
    ensureSplashStyle();
    document.getElementById('towa-dawn-splash')?.remove();
    const el = document.createElement('div');
    el.id = 'towa-dawn-splash';
    el.setAttribute('role', 'presentation');
    // build1971: 白の中に地平線が引かれ、光の粒が舞う → 「出撃」→ 白へ（バトルのイントロにつなぐ）
    const motes = Array.from({ length: 16 }, (_, i) => {
      const left = 6 + Math.random() * 88, dl = (.6 + Math.random() * 2.4).toFixed(2), dur = (2 + Math.random() * 1.6).toFixed(2);
      const rise = Math.round(260 + Math.random() * 420), dx = Math.round((Math.random() - .5) * 60);
      return `<i class="tds-mote" style="left:${left.toFixed(1)}%;--dl:${dl}s;--dur:${dur}s;--rise:${rise}px;rotate:${(dx / 20).toFixed(1)}deg"></i>`;
    }).join('');
    el.innerHTML = '<i class="tds-horizon"></i>' + motes + // build1971b: 下から昇る太陽・光条・朝焼けは外した
      '<div class="tds-copy"><div class="tds-kicker">SPECIAL STAGE</div><i class="tds-rule"></i>' +
      '<div class="tds-title">夜明け</div><div class="tds-sub">トワ -光の姿-</div></div>' +
      '<div class="tds-go"><i class="tds-slash"></i><b>出撃</b></div><i class="tds-flash"></i>';
    document.body.appendChild(el);
    removeCrash(); // クラッシュの白幕は、同じ白のスプラッシュに引き継ぐ
    return el;
  }
  function hideSplash() {
    removeCrash();
    const el = document.getElementById('towa-dawn-splash');
    if (!el) return;
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 760);
  }

  // RESULT画面の「戻る」で白くフェードした後に呼ばれる（shooting_core の closeShootingEvent から）
  async function launch() {
    if (launching || !hasPending()) return false;
    launching = true;
    try {
      showSplash();
      await new Promise(r => setTimeout(r, 4800)); // build1971: 「出撃」→ 白へ抜けるまで
      window.__shootingReturnContext = { type: 'resonanceTower' };
      if (typeof window.openShootingEvent !== 'function' || typeof window.startTowaDawnBattle !== 'function') throw new Error('戦闘画面を開けませんでした');
      window.openShootingEvent({ stageId: STAGE_ID });
      await new Promise(r => setTimeout(r, 60));
      const ok = await window.startTowaDawnBattle(pending.party || []);
      if (!ok) throw new Error('夜明けを開始できませんでした');
      // 白い幕は、戦闘のイントロ（白いステージ情報）が出るまで残す（編成画面を一瞬も見せない）
      const t0 = Date.now();
      while (Date.now() - t0 < 1200) {
        const info = document.getElementById('shooting-stage-info');
        if (info && info.classList.contains('is-visible')) break;
        await new Promise(r => setTimeout(r, 60));
      }
      hideSplash();
      return true;
    } catch (err) {
      console.warn('[TowaDawn] launch failed', err);
      hideSplash();
      toast(String((err && err.message) || err));
      if (typeof window.openResonanceTower === 'function') window.openResonanceTower();
      return false;
    } finally {
      launching = false;
    }
  }

  // ---------------- 戦闘の開始・終了 ----------------
  async function beginRun() {
    if (!hasPending()) return null;
    try {
      const d = await rpc('begin_towa_dawn_run', { p_dawn_id: pending.dawnId });
      if (d && d.ok === false) {
        if (d.reason === 'expired' || d.reason === 'finished' || d.reason === 'not_found') { pending = null; savePending(); }
        toast(d.reason === 'expired' ? '夜明けの気配は消えてしまった（期限切れ）' : '夜明けに挑戦できません');
        return null;
      }
      const party = Array.isArray(d.party_ids) && d.party_ids.length ? d.party_ids.map(Number) : (pending.party || []);
      pending.party = party; pending.started = true; savePending();
      return party;
    } catch (err) {
      console.warn('[TowaDawn] begin failed', err);
      toast('通信に失敗しました。もう一度お試しください');
      return null;
    }
  }

  async function finishRun(win) {
    const res = { towerConfirmed: true, firstClearClaimed: false, firstClearAmount: 0, highScore: 0 };
    if (!hasPending()) return res;
    const dawnId = pending.dawnId;
    try {
      let d, lastError;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          d = await rpc('finish_towa_dawn_run', { p_dawn_id: dawnId, p_win: !!win });
          if (d && d.ok === false && d.reason === 'too_fast' && attempt < 2) {
            await new Promise(r => setTimeout(r, 2200));
            continue;
          }
          lastError = null;
          break;
        } catch (e) {
          lastError = e;
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
      if (lastError) throw lastError;
      if (!d || d.ok !== true) throw new Error('夜明けの確定拒否: ' + (d?.reason || 'unknown'));
      pending = null; savePending();
      if (win && d.win) {
        await refreshInventory();
        showReward(d);
      } else if (!win) {
        toast('夜明けは遠のいた…');
      }
    } catch (err) {
      console.warn('[TowaDawn] finish failed', err);
      toast('結果を確定できませんでした。通信状態を確認してください');
      res.towerConfirmed = false;
    }
    return res;
  }

  async function refreshInventory() {
    try {
      const userId = String(localStorage.getItem('zukan_user_id') || '').trim();
      if (userId && typeof window.loadInventoryFromSupabase === 'function') await window.loadInventoryFromSupabase(userId);
    } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('sasaphia:growth-resources-changed')); } catch (_) {}
    try { window.dispatchEvent(new Event('zeraphia:inventory-refresh')); } catch (_) {}
  }

  function showReward(d) {
    const kind = String(d.granted || 'new');
    const msg = kind === 'flower'
      ? 'トワ（光）は完凸済み。聖霊花(SR)×' + Math.max(1, Number(d.flower_sr_qty) || 1) + ' を獲得'
      : kind === 'limit_break'
        ? 'トワ（光）を獲得！ 限界突破 +1'
        : 'トワ -光の姿- を獲得！';
    toast(msg);
    try {
      ensureSplashStyle();
      const el = document.createElement('div');
      el.id = 'towa-dawn-reward';
      el.setAttribute('role', 'dialog');
      el.innerHTML = '<div class="tdr-card"><small>SPECIAL STAGE CLEAR</small>' +
        '<img src="images/chara_112_panel.webp" alt="">' +
        '<b>' + msg + '</b><button type="button">閉じる</button></div>';
      const st = document.getElementById('towa-dawn-reward-style') || document.createElement('style');
      st.id = 'towa-dawn-reward-style';
      st.textContent = `
        #towa-dawn-reward{position:fixed;inset:0;z-index:520600;display:flex;align-items:center;justify-content:center;background:rgba(255,250,238,.82);
          backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);animation:tdsIn .5s ease-out both}
        #towa-dawn-reward .tdr-card{display:flex;flex-direction:column;align-items:center;gap:12px;padding:22px 26px 18px;border:1px solid #d6b878;border-radius:4px;
          background:linear-gradient(180deg,#fffdf6,#f6ecd6);box-shadow:0 10px 30px rgba(120,90,40,.25);max-width:82vw}
        #towa-dawn-reward small{font:600 10px/1 "Cinzel",serif;letter-spacing:.42em;color:#b58a3e}
        #towa-dawn-reward img{width:150px;height:150px;object-fit:cover;border-radius:50%;border:2px solid #e2c88e;box-shadow:0 0 22px rgba(255,214,120,.65)}
        #towa-dawn-reward b{font:600 15px/1.5 "Noto Serif JP",serif;color:#5d4a33;text-align:center}
        #towa-dawn-reward button{margin-top:4px;padding:8px 26px;border:1px solid #c9a25a;background:#fffaf0;color:#6b5434;font:600 13px/1 "Noto Serif JP",serif;letter-spacing:.2em;border-radius:2px}
      `;
      document.head.appendChild(st);
      el.querySelector('button').addEventListener('click', () => el.remove());
      document.body.appendChild(el);
    } catch (_) {}
  }

  window.TowaDawn = Object.freeze({
    STAGE_ID, CHARACTER_ID,
    onTower20Start, onTower20Result, hasPending, waitRoll, launch, beginRun, finishRun,
    playCrash, // build1971
    getPendingParty: () => (pending && pending.party ? pending.party.slice() : []),
  });
})();
