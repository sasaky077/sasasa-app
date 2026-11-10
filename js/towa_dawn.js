/* ============================================================
   build1877 — 隠しステージ「夜明け」（トワ -光の姿-）
   残響の塔20F（通常モード）のクリア時に、サーバーが1/30で出現を確定する。
     20F開始  : begin_towa_dawn_watch()                → watch_id（本番・練習どちらも）
     20F勝利  : roll_towa_dawn(watch_id, party_ids)    → hit なら dawn_id
     RESULT後 : ホワイトアウト → SPECIAL STAGE / 夜明け → 戦闘（編成は20Fのまま固定・全回復）
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
      if (!watchId) return false;
      const id = watchId; watchId = '';
      const party = (partyIds || []).map(Number).filter(n => n > 0).slice(0, 3);
      try {
        const d = await rpc('roll_towa_dawn', { p_watch_id: id, p_party_ids: party });
        if (d && d.ok !== false && d.hit && d.dawn_id) {
          pending = { dawnId: String(d.dawn_id), party: (d.party_ids || party).map(Number), expiresAt: d.expires_at || '' };
          savePending();
          return true;
        }
      } catch (err) { console.warn('[TowaDawn] roll failed', err); }
      return false;
    })();
    return rollPromise;
  }

  function hasPending() { return !!(pending && pending.dawnId); }
  async function waitRoll() { try { await rollPromise; } catch (_) {} return hasPending(); }

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
    `;
    document.head.appendChild(st);
  }
  function showSplash() {
    ensureSplashStyle();
    document.getElementById('towa-dawn-splash')?.remove();
    const el = document.createElement('div');
    el.id = 'towa-dawn-splash';
    el.setAttribute('role', 'presentation');
    el.innerHTML = '<div class="tds-copy"><div class="tds-kicker">SPECIAL STAGE</div><i class="tds-rule"></i>' +
      '<div class="tds-title">夜明け</div><div class="tds-sub">トワ -光の姿-</div></div>';
    document.body.appendChild(el);
    return el;
  }
  function hideSplash() {
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
      await new Promise(r => setTimeout(r, 3600));
      window.__shootingReturnContext = { type: 'resonanceTower' };
      if (typeof window.openShootingEvent !== 'function' || typeof window.startTowaDawnBattle !== 'function') throw new Error('戦闘画面を開けませんでした');
      window.openShootingEvent({ stageId: STAGE_ID });
      await new Promise(r => setTimeout(r, 60));
      const ok = await window.startTowaDawnBattle(pending.party || []);
      if (!ok) throw new Error('夜明けを開始できませんでした');
      // 白い幕は、戦闘のイントロ（白いステージ情報）が出るまで残す（編成画面を一瞬も見せない）
      const t0 = Date.now();
      while (Date.now() - t0 < 8000) {
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
      const d = await rpc('finish_towa_dawn_run', { p_dawn_id: dawnId, p_win: !!win });
      pending = null; savePending();
      if (win && d && d.ok !== false && d.win) {
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
    getPendingParty: () => (pending && pending.party ? pending.party.slice() : []),
  });
})();
