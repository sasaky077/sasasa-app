// ZERAPHIA build1757 — 記憶決戦 / MEMORY BATTLE
// 過去の脅威を「記憶の掟」付きで再現するボス戦。全8戦・難易度は横並び（持ち物検査）。
//
// ・ステージ定義（ボス・掟）は shooting_stages.js の MEMORY_BATTLE_STAGES が正本。
// ・月1回リセット（日本時間 毎月1日 0:00）。各ステージ、当月の初クリアで結晶（サーバーが付与）。
// ・出撃トークン：begin_memory_battle → finish_memory_battle（Supabase RPC）。
// ・shooting_core.js からは window.MemoryBattle.beginRun / finishRun だけを参照する。
(function(){
  'use strict';

  const SCREEN_ID = 'screen-memory-battle';
  const RUN_KEY = 'zeraphia_memory_battle_run_v1';
  const CACHE_KEY = 'zeraphia_memory_battle_state_cache_v1';
  // build1770: 報酬は結晶ではなく神聖樹の栄養（聖樹の息吹・創世EXP +5）。表示用。実際の付与量はサーバー（memory_battle_reward_exp）
  const REWARD_SHINJU_EXP = 5;
  const ELEMENT_LABEL = Object.freeze({ fire:'火', aqua:'水', wood:'木', light:'光', dark:'闇', neutral:'無' });
  // その属性のボスに「効果抜群」な属性（水＞火＞木＞水、光⇔闇）
  const WEAK_TO = Object.freeze({ aqua:'wood', fire:'aqua', wood:'fire', light:'dark', dark:'light' });

  let serverState = null;   // { month_key, next_reset_at, cleared:[...] }
  let loading = false;
  let runPromise = null;    // 発行中／発行済みの出撃トークン
  let finishing = null;

  const $ = id => document.getElementById(id);
  function sb(){ return window.zsSupabase || null; }
  function userId(){ return String(localStorage.getItem('zukan_user_id') || '').trim().toLowerCase(); }
  function stages(){ return window.ShootingStages || null; }
  function notify(msg){
    if (typeof window.showToast === 'function') window.showToast(msg);
    else console.info('[memory battle]', msg);
  }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function pad2(n){ return String(Math.max(0, Math.floor(Number(n) || 0))).padStart(2, '0'); }

  // ---------- 月 ----------
  function jstNow(){ return new Date(Date.now() + 9 * 3600 * 1000); }
  function localMonthKey(){ const d = jstNow(); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1); }
  function monthKey(){ return (serverState && serverState.month_key) || localMonthKey(); }
  function monthLabel(key){
    const m = String(key || '').match(/^(\d{4})-(\d{2})$/);
    return m ? `${Number(m[1])}年${Number(m[2])}月` : '';
  }
  function daysToReset(){
    const next = serverState && serverState.next_reset_at ? Date.parse(serverState.next_reset_at) : NaN;
    let target = next;
    if (!Number.isFinite(target)) {
      const d = jstNow();
      target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - 9 * 3600 * 1000;
    }
    const ms = Math.max(0, target - Date.now());
    return { days: Math.floor(ms / 86400000), hours: Math.floor(ms / 3600000) % 24 };
  }

  // ---------- 状態 ----------
  function clearedSet(){
    const list = serverState && Array.isArray(serverState.cleared) ? serverState.cleared : [];
    return new Set(list.map(Number));
  }
  function readCache(){
    try {
      const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (raw && raw.user === userId() && raw.month_key === localMonthKey()) return raw;
    } catch (_) {}
    return null;
  }
  function writeCache(){
    try { if (serverState) localStorage.setItem(CACHE_KEY, JSON.stringify({ ...serverState, user: userId() })); } catch (_) {}
  }
  function applyServerState(data){
    if (!data || typeof data !== 'object') return;
    serverState = {
      month_key: String(data.month_key || localMonthKey()),
      next_reset_at: data.next_reset_at || (serverState && serverState.next_reset_at) || null,
      cleared: Array.isArray(data.cleared) ? data.cleared.map(Number) : []
    };
    writeCache();
  }
  async function refresh(){
    const client = sb();
    const uid = userId();
    if (!client || typeof client.rpc !== 'function' || !uid || loading) return;
    loading = true;
    try {
      const { data, error } = await client.rpc('get_memory_battle_state', { p_user_id: uid });
      if (error) throw error;
      applyServerState(data);
    } catch (err) {
      console.warn('[memory battle] state', err && (err.message || err));
    } finally {
      loading = false;
      render();
    }
  }

  // ---------- 出撃トークン ----------
  function saveRun(run){ try { sessionStorage.setItem(RUN_KEY, JSON.stringify(run)); } catch (_) {} }
  function loadRun(){ try { return JSON.parse(sessionStorage.getItem(RUN_KEY) || 'null'); } catch (_) { return null; } }
  function clearRun(){ try { sessionStorage.removeItem(RUN_KEY); } catch (_) {} }

  function beginRun(stageNo){
    const no = Math.floor(Number(stageNo) || 0);
    finishing = null;
    clearRun();
    const client = sb();
    const uid = userId();
    if (!client || typeof client.rpc !== 'function' || !uid) { runPromise = Promise.resolve(null); return runPromise; }
    runPromise = (async () => {
      const { data, error } = await client.rpc('begin_memory_battle', { p_user_id: uid, p_stage_no: no });
      if (error) throw error;
      const token = String(data && data.run_token || '').trim();
      if (!token) throw new Error('run token was not issued');
      const run = { token, stageNo: no, user: uid };
      saveRun(run);
      return run;
    })().catch(err => {
      console.warn('[memory battle] begin', err && (err.message || err));
      notify('記憶決戦の出撃記録を作れませんでした。クリアしても報酬は受け取れません。');
      return null;
    });
    return runPromise;
  }

  // 戦闘RESULTから呼ばれる。shooting_core の結果表示が読む形 { firstClearClaimed, firstClearAmount, highScore } で返す。
  function finishRun(win, stageNo){
    if (finishing) return finishing;
    finishing = (async () => {
      let run = runPromise ? await runPromise : null;
      if (!run) run = loadRun();
      if (!run || !run.token || (stageNo && Number(run.stageNo) !== Number(stageNo))) {
        return { memoryConfirmed:false, firstClearClaimed:false, firstClearAmount:0, highScore:0 };
      }
      const client = sb();
      const { data, error } = await client.rpc('finish_memory_battle', { p_user_id: run.user, p_run_token: run.token, p_win: !!win });
      clearRun();
      runPromise = null;
      if (error) throw error;
      applyServerState({ month_key: data && data.month_key, cleared: data && data.cleared });
      const claimed = !!(data && data.first_clear_claimed);
      const amount = Math.max(0, Number(data && (data.shinju_exp ?? data.amount)) || 0);
      if (claimed && amount > 0 && window.ShinjuProgress && typeof window.ShinjuProgress.refreshFromServer === 'function') {
        // 受け取り待ちに入った栄養は、神聖樹側が自動で創世ptへ変換する
        try { await window.ShinjuProgress.refreshFromServer(); } catch (_) {}
      }
      if (win && data && data.win === false) notify('記憶決戦：勝利を確認できませんでした（時間が短すぎる等）。');
      // 結果画面は shinjuRewardExp があれば「聖樹の息吹 / 創世EXP +N」を報酬に並べる
      return { memoryConfirmed:true, firstClearClaimed:false, firstClearAmount:0, shinjuRewardExp: claimed ? amount : 0, highScore:0 };
    })().catch(err => {
      console.warn('[memory battle] finish', err && (err.message || err));
      return { memoryConfirmed:false, firstClearClaimed:false, firstClearAmount:0, highScore:0 };
    });
    return finishing;
  }

  // ---------- 掟の説明 ----------
  // build1765: カード内の1行＝{ icon, name, text }。アイコンは丸い金枠の中に描く。
  const RULE_ICON_SVG = Object.freeze({
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 4.5 5.3v6c0 4.7 3.2 8.6 7.5 10.2 4.3-1.6 7.5-5.5 7.5-10.2v-6z" fill="currentColor" opacity=".22"/><path d="M12 2.5 4.5 5.3v6c0 4.7 3.2 8.6 7.5 10.2 4.3-1.6 7.5-5.5 7.5-10.2v-6zM12 4.6l5.5 2.1v4.6c0 3.6-2.3 6.7-5.5 8.1z" fill="currentColor"/></svg>',
    hit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8l2.2 7.1 7.4.1-6 4.4 2.3 7.1-5.9-4.4-5.9 4.4 2.3-7.1-6-4.4 7.4-.1z" fill="currentColor"/></svg>',
    drop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c-3.2 4.6-6.3 8.3-6.3 12a6.3 6.3 0 0 0 12.6 0c0-3.7-3.1-7.4-6.3-12zm-2.6 12.6c.2 1.6 1.2 2.8 2.7 3.1" fill="currentColor"/></svg>',
    torii: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 4.5c3 .9 6.2 1.3 9.5 1.3s6.5-.4 9.5-1.3v2.6c-.9.2-1.8.4-2.8.6V9H20v2h-2.6v9.5h-2.2V11H8.8v9.5H6.6V11H4V9h2.6V7.7c-1-.2-1.9-.4-2.8-.6z" fill="currentColor"/></svg>',
    judgment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 1.8 5 13.2h5.6L9.4 22.2 19 9.8h-5.8z" fill="currentColor"/></svg>',
    sniper: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/></svg>',
    armor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5h16v6.2c0 5-3.4 9-8 10.8-4.6-1.8-8-5.8-8-10.8z" fill="currentColor" opacity=".25"/><path d="M4 4.5h16v6.2c0 5-3.4 9-8 10.8-4.6-1.8-8-5.8-8-10.8zM8 9h8M8 12.5h8M9.5 16h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    rule: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>',
  });
  function ruleRows(def){
    const info = (stages() && stages().MEMORY_BATTLE_RULE_INFO) || {};
    const rows = [];
    (def.rules || []).forEach(rule => {
      if (rule.type === 'element_barrier') {
        const el = String(rule.element || def.element || '').toLowerCase();
        const key = WEAK_TO[el] || '';
        rows.push({ icon: 'element:' + key, name: '属性結界',
          text: `${ELEMENT_LABEL[key] || ''}属性の攻撃だけが通る` }); // build1772: 「（取り巻きも）」の表記はやめた（仕様は従来どおり取り巻きにも結界）
      } else if (rule.type === 'linked_torii') {
        const sec = Math.round(Math.max(1000, Number(rule.reviveMs || 3000)) / 1000);
        rows.push({ icon: 'torii', name: '連なる鳥居', text: `鳥居は片方だけ壊れると、${sec}秒で修復される` });
      } else if (rule.type === 'judgment') {
        const sec = Math.round(Math.max(5000, Number(rule.intervalMs || 20000)) / 1000);
        const dmg = Math.max(0, Math.floor(Number(rule.damage || 0)));
        rows.push({ icon: 'judgment', name: '神罰', text: dmg > 0
          ? `約${sec}秒ごとに、出撃中のキャラへ${dmg.toLocaleString('ja-JP')}ダメージ`
          : `約${sec}秒ごとに、出撃中のキャラが即死する` });
      } else if (rule.type === 'sniper') {
        const sec = Math.round(Math.max(5000, Number(rule.intervalMs || 13000)) / 1000);
        rows.push({ icon: 'sniper', name: '狙撃', text: `約${sec}秒ごとに自機を照準で捉え、即死の狙撃を撃ち込む` });
      } else if (rule.type === 'armor') {
        const cut = Math.max(0, Math.floor(Number(rule.cut || 0)));
        rows.push({ icon: 'armor', name: '装甲', text: `ボスへの攻撃は1HITごとに${cut}ダメージ差し引かれる` });
      } else if (rule.type === 'guardians') {
        const hitHp = Math.max(0, Math.floor(Number(rule.hitHp || 0)));
        const sec = Math.round(Math.max(3000, Number(rule.respawnMs || 8000)) / 1000);
        const gName = (window.ShootingEnemies && window.ShootingEnemies.getShootingEnemy(rule.enemyId) || {}).name || '守護者';
        rows.push({ icon: 'shield', name: '守護者', text: `${gName}×${Math.max(1, Number(rule.count || 2))}がいる間、ボスは実体がなく攻撃がすり抜ける。倒すと${sec}秒だけ実体化` });
        if (hitHp > 0) rows.push({ icon: 'hit', name: 'HIT数', text: `守護者はどんな攻撃も1HIT＝1ダメージ（HP${hitHp}）` });
        if (Number(rule.spiderCount || 0) > 0) rows.push({ icon: 'drop', name: '吸血', text: '子蜘蛛に張り付かれると、ボスが回復する' });
      } else if (info[rule.type]) {
        rows.push({ icon: 'rule', name: info[rule.type].name, text: info[rule.type].desc });
      }
    });
    return rows;
  }
  function ruleIconHtml(icon){
    if (String(icon).indexOf('element:') === 0) {
      const key = icon.slice(8);
      return `<span class="mb-rule-icon is-element is-${esc(key)}"><img src="images/type_${esc(key)}.webp" alt="" decoding="async"></span>`;
    }
    return `<span class="mb-rule-icon is-${esc(icon)}">${RULE_ICON_SVG[icon] || RULE_ICON_SVG.rule}</span>`;
  }
  function bossImage(def){
    try {
      const e = window.ShootingEnemies && typeof window.ShootingEnemies.getShootingEnemy === 'function'
        ? window.ShootingEnemies.getShootingEnemy(def.enemyId) : null;
      return (e && (e.image || e.battleImage)) || '';
    } catch (_) { return ''; }
  }
  // カードの立ち絵：ステージ定義の panelImage（images/rivia_panel.webp 等）。無ければ戦闘画像。
  function panelImage(def){ return String(def.panelImage || '') || bossImage(def); }

  // ---------- 画面 ----------
  function ensureScreen(){
    let root = $(SCREEN_ID);
    if (root) return root;
    const anchor = $('screen-phase-odyssey') || document.querySelector('.screen');
    root = document.createElement('div');
    root.id = SCREEN_ID;
    root.className = 'screen app-page memory-battle-screen';
    root.setAttribute('aria-label', '記憶決戦');
    root.innerHTML = `
      <div class="mb-backdrop" aria-hidden="true"></div>
      <main class="mb-composition">
        <section class="mb-hero" aria-label="記憶決戦 MEMORY BATTLE">
          <div class="mb-hero-art" aria-hidden="true"></div>
          <button type="button" class="mb-back" data-mb-back aria-label="巡行へ戻る">戻る</button>
          <div class="mb-hero-row">
            <div class="mb-title-copy">
              <h1 class="mb-title">記憶決戦</h1>
              <div class="mb-title-en"><i></i>MEMORY BATTLE<i></i></div>
            </div>
            <div class="mb-month">
              <strong data-mb-month></strong>
              <span data-mb-reset></span>
            </div>
          </div>
        </section>
        <p class="mb-lead"><span>過去の脅威が「記憶の掟」をまとって甦る。</span><span>掟に合う仲間で挑め。</span></p>
        <div class="mb-divider" aria-hidden="true"><i></i><b></b><i></i></div>
        <div class="mb-progress">
          <div class="mb-progress-pill"><span>今月の踏破</span><b data-mb-count>0</b><small data-mb-total>/ 8</small></div>
          <div class="mb-progress-track" data-mb-track aria-hidden="true"></div>
        </div>
        <ol class="mb-list" data-mb-list></ol>
      </main>`;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(root, anchor.nextSibling);
    else document.body.appendChild(root);
    root.querySelector('[data-mb-back]').addEventListener('click', close);
    const list = root.querySelector('[data-mb-list]');
    list.addEventListener('click', e => {
      const card = e.target.closest('.mb-card[data-no]');
      if (!card || card.classList.contains('is-locked')) return;
      startStage(Number(card.dataset.no));
    });
    list.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.mb-card[data-no]');
      if (!card || card.classList.contains('is-locked')) return;
      e.preventDefault();
      startStage(Number(card.dataset.no));
    });
    return root;
  }

  function render(){
    const root = $(SCREEN_ID);
    if (!root) return;
    const S = stages();
    const total = (S && S.MEMORY_BATTLE_SLOT_COUNT) || 8;
    const cleared = clearedSet();
    const mk = monthKey();
    const reset = daysToReset();
    root.querySelector('[data-mb-month]').textContent = monthLabel(mk) + 'の記憶';
    root.querySelector('[data-mb-reset]').textContent = reset.days > 0 ? `リセットまで あと${reset.days}日` : `リセットまで あと${reset.hours}時間`;
    root.querySelector('[data-mb-count]').textContent = String(cleared.size);
    root.querySelector('[data-mb-total]').textContent = '/ ' + total;
    const track = [];
    for (let no = 1; no <= total; no++) track.push(`<i class="${cleared.has(no) ? 'is-done' : ''}"></i>`);
    root.querySelector('[data-mb-track]').innerHTML = track.join('');

    const list = root.querySelector('[data-mb-list]');
    const rows = [];
    for (let no = 1; no <= total; no++) {
      const def = S && typeof S.getMemoryBattleStageDef === 'function' ? S.getMemoryBattleStageDef(no) : null;
      if (!def) {
        rows.push(`<li class="mb-card is-locked" data-no="${no}">
          <span class="mb-ribbon is-small"><b>${pad2(no)}</b></span>
          <div class="mb-names"><strong class="mb-boss">？？？</strong><span class="mb-sub">記憶は、まだ眠っている</span></div>
          <span class="mb-soon">準備中</span>
        </li>`);
        continue;
      }
      const done = cleared.has(no);
      const img = panelImage(def);
      const fallback = bossImage(def);
      const rules = ruleRows(def).map(r => `<li class="mb-rule">${ruleIconHtml(r.icon)}<span class="mb-rule-name">${esc(r.name)}</span><span class="mb-rule-text">${esc(r.text)}</span></li>`).join('');
      rows.push(`<li class="mb-card${done ? ' is-cleared' : ''}" data-no="${no}" role="button" tabindex="0" aria-label="${esc(def.bossName)}に挑戦">
        <div class="mb-card-head">
          <span class="mb-ribbon"><b>${pad2(no)}</b></span>
          <div class="mb-names">
            <strong class="mb-boss">${esc(def.bossName)}</strong>
            <span class="mb-sub"><i></i>${esc(def.title || '')}<i></i></span>
          </div>
          ${done
            ? '<div class="mb-reward is-done"><b>踏破</b><span>今月クリア済</span></div>'
            : `<div class="mb-reward"><div class="mb-reward-gem is-shinju"><img src="images/shinju_aura.webp" alt="神聖樹の栄養" decoding="async"><b>+${REWARD_SHINJU_EXP}</b></div><small class="mb-reward-label">神聖樹の栄養</small><span>今月初回</span></div>`}
        </div>
        <div class="mb-card-body">
          <figure class="mb-portrait">${img ? `<img src="${esc(img)}" alt="${esc(def.bossName)}" decoding="async"${fallback && fallback !== img ? ` onerror="this.onerror=null;this.src='${esc(fallback)}'"` : ''}>` : ''}${done ? '<span class="mb-seal" aria-label="今月踏破"><b>踏破</b><small>CLEAR</small></span>' : ''}</figure>
          <ul class="mb-rules">${rules}</ul>
        </div>
      </li>`);
    }
    list.innerHTML = rows.join('');
  }

  function startStage(no){
    const S = stages();
    if (!S || !S.getMemoryBattleStageDef(no)) return;
    if (typeof window.openShootingEvent !== 'function') { notify('戦闘エンジンの準備が完了していません'); return; }
    window.__shootingReturnContext = { type:'memoryBattle' };
    try { window.openShootingEvent({ stageId: S.memoryBattleStageId(no) }); }
    catch (err) {
      window.__shootingReturnContext = null;
      console.error('[memory battle] open failed', err);
      notify('戦闘画面を開けませんでした');
    }
  }

  function open(){
    if (typeof window.requireChapter03ContentUnlock === 'function' && !window.requireChapter03ContentUnlock()) return;
    ensureScreen();
    if (!serverState) serverState = readCache();
    if (serverState && serverState.month_key !== localMonthKey()) serverState = null; // 月替わり
    if (typeof window.showMainTab === 'function') window.showMainTab('memory-battle');
    render();
    refresh();
    // ステージ定義（shooting_stages.js）の読み込みが済んでいなければ、済んだ時点で描き直す
    if (!stages() && window.__sasaphiaShootingModulesReady) {
      Promise.resolve(window.__sasaphiaShootingModulesReady).then(render).catch(() => {});
    }
  }
  function close(){
    if (typeof window.showMainTab === 'function') window.showMainTab('ninmu');
  }

  window.MemoryBattle = Object.freeze({ open, close, refresh, render, beginRun, finishRun, getState: () => serverState ? JSON.parse(JSON.stringify(serverState)) : null });
  window.openMemoryBattle = open;
  window.closeMemoryBattle = close;
})();
