// 20260817-testchan-raid-reward-v45
(function(){
  'use strict';

  const STAGE_ID = 'shooting_raid_test';
  let currentStatus = null;
  let finishPromise = null;
  const memberPanelCache = new Map();

  function sb(){ return window.zsSupabase || null; }
  function uid(){ return String(localStorage.getItem('zukan_user_id') || '').trim().toLowerCase(); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function n(v){ return Math.max(0, Math.floor(Number(v || 0))); }
  function fmt(v){ return n(v).toLocaleString('ja-JP'); }
  function isAdmin(){ return !!(window.SasaphiaAdmin && typeof window.SasaphiaAdmin.isEnabled === 'function' && window.SasaphiaAdmin.isEnabled()); }


  // ── HOME FRIEND ICON notification ─────────────────────────────
  // 赤ドット表示条件:
  //  1) 未処理のフレンド申請を受信している
  //  2) 本日のDAILY RAIDに所属しており、未挑戦かつ未討伐
  // 「画面を見た」だけでは既読扱いにせず、条件が解消するまで残す。
  let friendNoticeRefreshPromise = null;

  function ensureFriendNoticeDot(){
    const btn = document.getElementById('friend-home-entry');
    if(!btn) return null;
    let dot = btn.querySelector('.friend-notice-dot');
    if(!dot){
      dot = document.createElement('span');
      dot.className = 'friend-notice-dot';
      dot.setAttribute('aria-hidden','true');
      btn.appendChild(dot);
    }
    return dot;
  }

  function setFriendNotice(active, reasons){
    const btn = document.getElementById('friend-home-entry');
    const dot = ensureFriendNoticeDot();
    if(!btn || !dot) return;
    btn.classList.toggle('has-friend-notice', !!active);
    dot.classList.toggle('show', !!active);
    const why = Array.isArray(reasons) ? reasons.filter(Boolean) : [];
    btn.dataset.noticeReason = why.join(',');
    const base = 'フレンドへ移動';
    btn.setAttribute('aria-label', active ? base + '（新着あり）' : base);
  }

  async function refreshFriendHomeNotice(){
    if(friendNoticeRefreshPromise) return friendNoticeRefreshPromise;
    friendNoticeRefreshPromise = (async()=>{
      const client = sb();
      const userId = uid();
      ensureFriendNoticeDot();
      if(!client || !userId){
        setFriendNotice(false, []);
        return { pendingFriend:false, raidReady:false };
      }

      let pendingFriend = false;
      let raidReady = false;

      try {
        const req = await client.from('friendships')
          .select('id')
          .eq('receiver_id', userId)
          .eq('status', 'pending')
          .limit(1);
        pendingFriend = !!(req && !req.error && Array.isArray(req.data) && req.data.length);
      } catch(err) {
        console.warn('[friend notice] pending request check skipped', err && (err.message || err));
      }

      try {
        // ホーム通知は「状態を見るだけ」ではなく、本日のレイドを必要なら生成してから判定する。
        // データリセット直後の新規ユーザーでも、ホーム到達時点で挑戦可能通知を出せる。
        const res = await client.rpc('get_or_create_daily_raid', { p_user_id:userId });
        if(res && !res.error){
          const status = normalizeStatus(res.data);
          const me = status && status.me || null;
          const hasHp = !!(status && status.current_hp != null);
          const hp = hasHp ? n(status.current_hp) : null;
          const cleared = !!(
            status &&
            (
              status.status === 'cleared' ||
              (hasHp && hp <= 0)
            )
          );
          const attempts = Math.max(0, Math.min(3, n(me && me.attempt_count)));
          const inBattle = !!(me && me.attempt_started_at && !me.attempt_finished_at);
          raidReady = !!(status && me && attempts < 3 && !inBattle && !cleared);
        }
      } catch(err) {
        // レイド未作成・RPC一時失敗時はフレンド申請通知だけ生かす。
        console.warn('[friend notice] raid status check skipped', err && (err.message || err));
      }

      const reasons = [];
      if(pendingFriend) reasons.push('friend-request');
      if(raidReady) reasons.push('raid-ready');
      setFriendNotice(pendingFriend || raidReady, reasons);
      return { pendingFriend, raidReady };
    })().finally(()=>{ friendNoticeRefreshPromise = null; });
    return friendNoticeRefreshPromise;
  }


  function getCharacterPanelById(characterId){
    const id = Number(characterId || 0);
    if(!id) return '';
    try {
      const chars = Array.isArray(window.CHARACTERS) ? window.CHARACTERS : [];
      const chara = chars.find(ch => ch && Number(ch.id) === id);
      if(chara) return chara.panelImg || chara.panelImage || chara.img || '';
    } catch(_){}
    return `images/chara_${String(id).padStart(2,'0')}_panel.webp`;
  }

  async function hydrateMemberPanels(status){
    const members = Array.isArray(status && status.members) ? status.members : [];
    const ids = [...new Set(members.map(m => String(m && m.user_id || '').trim().toLowerCase()).filter(Boolean))];
    const missing = ids.filter(id => !memberPanelCache.has(id));
    if(!missing.length) {
      members.forEach(m => { m.panel_src = memberPanelCache.get(String(m.user_id||'').toLowerCase()) || ''; });
      return status;
    }

    const client = sb();
    if(!client) return status;
    try {
      // フレンド画面本体と同じ user_profiles / getFriendFavoriteCharacter を使う。
      // favorite_db_id を使っている旧データでも、favorite_char_id の現行データでも
      // ホーム画面に設定しているキャラの panelImg を同じ判定で取得できる。
      const res = await client.from('user_profiles')
        .select('*')
        .in('user_id', missing);
      if(res && res.error) throw res.error;

      const found = new Map();
      for(const profile of (res && res.data || [])) {
        const id = String(profile && profile.user_id || '').trim().toLowerCase();
        if(!id) continue;

        let panel = '';
        try {
          if(typeof window.getFriendFavoriteCharacter === 'function') {
            const favorite = await window.getFriendFavoriteCharacter(profile);
            panel = favorite && favorite.panelSrc ? String(favorite.panelSrc) : '';
          }
        } catch(err) {
          console.warn('[raid] favorite panel resolve skipped', id, err && (err.message || err));
        }

        // 万一グローバル関数が使えない古いindexでも表示を欠損させない。
        if(!panel) panel = getCharacterPanelById(profile.favorite_char_id || 1);

        found.set(id, panel);
        memberPanelCache.set(id, panel);
      }

      missing.forEach(id => {
        if(!found.has(id)) memberPanelCache.set(id, getCharacterPanelById(1));
      });
    } catch(err) {
      console.warn('[raid] member panel load skipped', err && (err.message || err));
      missing.forEach(id => memberPanelCache.set(id, getCharacterPanelById(1)));
    }

    members.forEach(m => {
      m.panel_src = memberPanelCache.get(String(m.user_id||'').trim().toLowerCase()) || '';
    });
    return status;
  }

  async function rpc(name, args){
    const client = sb();
    if(!client || typeof client.rpc !== 'function') throw new Error('Supabase接続がありません');
    const res = await client.rpc(name, args || {});
    if(res && res.error) throw res.error;
    return res ? res.data : null;
  }

  function normalizeStatus(raw){
    if(!raw) return null;
    if(typeof raw === 'string') { try { raw = JSON.parse(raw); } catch(_){} }
    return raw;
  }

  async function fetchStatus(create){
    const userId = uid();
    if(!userId) throw new Error('ユーザーIDがありません');
    const raw = await rpc(create ? 'get_or_create_daily_raid' : 'get_daily_raid_status', { p_user_id:userId });
    currentStatus = normalizeStatus(raw);
    return currentStatus;
  }

  function ensureRoot(){
    let root = document.getElementById('daily-raid-root');
    if(root) return root;
    root = document.createElement('div');
    root.id = 'daily-raid-root';
    root.setAttribute('aria-hidden','true');
    root.innerHTML = `
      <div class="daily-raid-page">
        <header class="daily-raid-head">
          <button type="button" onclick="closeDailyRaid()" aria-label="戻る">‹</button>
          <div class="daily-raid-head-title"><small>DAILY RAID</small><strong>ザ・テスト</strong></div>
          <div class="daily-raid-head-rule"><span>1 DAY</span><b>3 ATTEMPTS</b></div>
        </header>

        <main class="daily-raid-body">
          <section class="daily-raid-hero">
            <div class="daily-raid-hero-halo" aria-hidden="true"></div>
            <div class="daily-raid-hero-lines" aria-hidden="true"></div>
            <div class="daily-raid-hero-rank"><span>RAID ENEMY</span><b>TEST TYPE</b></div>
            <img src="images/raid_enemy_01.webp" alt="ザ・テスト">
            <div class="daily-raid-hero-copy">
              <small>RAID ENEMY</small>
              <strong>THE TEST</strong>
              <span>ザ・テスト</span>
            </div>
            <div class="daily-raid-hero-message">これは、神々への試験だ。</div>
          </section>

          <section class="daily-raid-hpbox">
            <div class="daily-raid-hphead">
              <div><small>SHARED HP</small><span>本日の共有耐久値</span></div>
              <strong id="daily-raid-hptext">-- / 100,000</strong>
            </div>
            <div class="daily-raid-hpbar"><i id="daily-raid-hpfill"></i><span></span></div>
            <div class="daily-raid-hpmeta">
              <b id="daily-raid-status">CONNECTING...</b>
              <span>RESET 00:00 JST</span>
            </div>
          </section>

          <section class="daily-raid-members">
            <div class="daily-raid-section-title">
              <div><small>CO-OP UNIT</small><span>RAID MEMBERS</span></div>
              <b id="daily-raid-member-count">0 / 4</b>
            </div>
            <div id="daily-raid-member-list" class="daily-raid-member-grid"></div>
          </section>

          <section class="daily-raid-rule">
            <div class="daily-raid-rule-title"><small>BATTLE RULE</small></div>
            <div class="daily-raid-rule-grid">
              <div><b>01</b><span>1人1日3回・BEST採用</span></div>
              <div><b>02</b><span>全滅または180秒で終了</span></div>
              <div><b>03</b><span>3回目終了時にBESTを共有HPへ反映</span></div>
            </div>
          </section>
        </main>

        <footer class="daily-raid-actions">
          <div class="daily-raid-attempt-copy"><small>TODAY'S ATTEMPT</small><b id="daily-raid-attempt-count">0 / 3</b></div>
          <button type="button" id="daily-raid-start" onclick="startDailyRaidBattle()"><span>RAID BATTLE</span><b>挑戦する</b></button>
        </footer>
      </div>`;
    document.body.appendChild(root);
    return root;
  }

  function render(status){
    const root = ensureRoot();
    const hp = n(status && status.current_hp);
    const maxHp = Math.max(1, n(status && status.max_hp) || 100000);
    const cleared = !!(status && status.status === 'cleared') || hp <= 0;
    const me = status && status.me || {};
    const admin = isAdmin();
    const attemptCount = Math.max(0, Math.min(3, n(me.attempt_count)));
    const inBattle = !!me.attempt_started_at && !me.attempt_finished_at;
    const allFinished = attemptCount >= 3 && !!me.attempt_finished_at;
    const bestDamage = n(me.best_damage);
    const members = Array.isArray(status && status.members) ? status.members : [];
    const hpText = root.querySelector('#daily-raid-hptext');
    const fill = root.querySelector('#daily-raid-hpfill');
    const stat = root.querySelector('#daily-raid-status');
    const count = root.querySelector('#daily-raid-member-count');
    const list = root.querySelector('#daily-raid-member-list');
    const attemptEl = root.querySelector('#daily-raid-attempt-count');
    const start = root.querySelector('#daily-raid-start');
    if(hpText) hpText.textContent = `${fmt(hp)} / ${fmt(maxHp)}`;
    if(fill) fill.style.transform = `scaleX(${Math.max(0,Math.min(1,hp/maxHp))})`;
    if(count) count.textContent = `${members.length} / 4`;
    if(attemptEl) attemptEl.textContent = admin ? '∞ / 3' : `${attemptCount} / 3`;
    if(stat) {
      if(admin) stat.textContent = 'ADMIN TEST · 挑戦回数/共有HPともに非反映';
      else if(cleared) stat.textContent = 'RAID CLEAR';
      else if(allFinished) stat.textContent = `本日のBEST確定 · ${fmt(bestDamage)} DAMAGE`;
      else if(inBattle) stat.textContent = `${attemptCount} / 3 挑戦中`;
      else if(attemptCount > 0) stat.textContent = `${attemptCount} / 3 完了 · 暫定BEST ${fmt(bestDamage)} DAMAGE`;
      else stat.textContent = '挑戦可能 · 3回中BESTを採用';
      stat.setAttribute('data-state', admin ? 'admin' : cleared ? 'clear' : allFinished ? 'done' : inBattle ? 'active' : 'ready');
    }
    if(list) {
      const myId = uid();
      const rows = members.map(m => {
        const mine = String(m.user_id||'') === myId;
        const attempts = Math.max(0, Math.min(3, n(m.attempt_count)));
        const active = !!m.attempt_started_at && !m.attempt_finished_at;
        const done = attempts >= 3 && !!m.attempt_finished_at;
        const best = n(m.best_damage);
        const state = done ? 'BEST LOCKED' : active ? `${attempts}/3 IN BATTLE` : attempts > 0 ? `${attempts}/3 READY` : 'READY';
        const damageText = best > 0 ? fmt(best) : '—';
        const panel = m.panel_src ? `<img class="daily-raid-member-panel" src="${esc(m.panel_src)}" alt="">` : '<div class="daily-raid-member-panel daily-raid-member-panel-empty"></div>';
        return `<div class="daily-raid-member${mine?' is-me':''}${done?' is-done':''}${active?' is-active':''}"><span class="daily-raid-member-no">${mine?'YOU':'ALLY'}</span>${panel}<div class="daily-raid-member-copy"><strong>${esc(m.display_name || m.user_id || 'PLAYER')}</strong><small class="daily-raid-member-state">${esc(state)}</small><div class="daily-raid-member-damage"><span>BEST</span><b>${esc(damageText)}</b></div></div></div>`;
      });
      while(rows.length < 4) rows.push('<div class="daily-raid-member is-empty"><span class="daily-raid-member-no">ALLY</span><div class="daily-raid-member-mark">＋</div><div class="daily-raid-member-copy"><strong>EMPTY</strong><small>フレンド枠</small></div><b>OPEN</b></div>');
      list.innerHTML = rows.join('');
    }
    if(start) {
      start.disabled = admin ? false : (cleared || inBattle || attemptCount >= 3);
      if(admin) start.innerHTML = '<span>ADMIN TEST</span><b>テスト挑戦</b>';
      else if(cleared) start.innerHTML = '<span>DAILY RAID</span><b>RAID CLEAR</b>';
      else if(inBattle) start.innerHTML = '<span>TODAY\'S ATTEMPT</span><b>挑戦中</b>';
      else if(attemptCount >= 3) start.innerHTML = '<span>BEST DAMAGE LOCKED</span><b>本日の3回終了</b>';
      else start.innerHTML = `<span>RAID BATTLE</span><b>${attemptCount + 1}回目に挑戦</b>`;
    }
  }

  async function open(options){
    const root = ensureRoot();
    root.style.display='block';
    root.setAttribute('aria-hidden','false');
    if(options && options.immediate) root.classList.add('show');
    else requestAnimationFrame(()=>root.classList.add('show'));
    try {
      const status = await fetchStatus(true);
      await hydrateMemberPanels(status);
      render(status);
      refreshFriendHomeNotice();
    } catch(err) {
      console.error('[raid] open failed', err);
      const stat = root.querySelector('#daily-raid-status');
      if(stat) stat.textContent='レイド情報を取得できません';
    }
  }

  function close(){
    const root=document.getElementById('daily-raid-root');
    if(!root) return;
    root.classList.remove('show');
    root.setAttribute('aria-hidden','true');
    setTimeout(()=>{ if(root.getAttribute('aria-hidden')==='true') root.style.display='none'; },180);
  }

  async function start(){
    const btn=document.getElementById('daily-raid-start');
    if(btn) btn.disabled=true;
    try {
      let begun;
      if(isAdmin()){
        // ADMIN TEST: 挑戦権を消費せず、共有HPにも一切触れない。
        const status = currentStatus || await fetchStatus(true);
        const maxHp = n(status && status.max_hp) || 100000;
        begun = { ok:true, raid_id:status && status.raid_id || 'admin-test', raid_date:status && status.raid_date || '', max_hp:maxHp, current_hp:maxHp, admin_test:true };
      } else {
        // USER MODE: 1日3回。開始時にその回数を消費し、3回目終了時にBESTだけ共有HPへ反映。
        begun = normalizeStatus(await rpc('begin_daily_raid_attempt',{p_user_id:uid()}));
        currentStatus = begun;
        if(!begun || begun.ok === false) throw new Error((begun && begun.message) || '本日は挑戦できません');
        refreshFriendHomeNotice();
      }
      const hp = n(begun.current_hp);
      if(hp <= 0 && !isAdmin()) { await open({immediate:true}); return; }
      close();
      window.__shootingReturnContext = { type:'raidLobby' };
      window.openShootingEvent({
        stageId: STAGE_ID,
        raidContext: { raidId: begun.raid_id, currentHp: hp, maxHp: n(begun.max_hp)||100000, raidDate: begun.raid_date, adminTest:!!begun.admin_test }
      });
    } catch(err) {
      console.error('[raid] start failed', err);
      alert(err && err.message ? err.message : 'レイドを開始できませんでした。');
      if(btn) btn.disabled=false;
      try { const status = await fetchStatus(false); await hydrateMemberPanels(status); render(status); } catch(_){}
    }
  }

  async function finishAttempt(damage, meta){
    if(isAdmin()){
      console.info('[raid] ADMIN TEST result (DB not updated)', { damage:n(damage), meta:meta||{} });
      return currentStatus;
    }
    if(finishPromise) return finishPromise;
    finishPromise = (async()=>{
      try {
        const result = normalizeStatus(await rpc('submit_daily_raid_damage',{ p_user_id:uid(), p_damage:n(damage) }));
        currentStatus=result;
        refreshFriendHomeNotice();
        if(result && (result.status === 'cleared' || n(result.current_hp) <= 0)){
          try { window.dispatchEvent(new CustomEvent('sasaphia-daily-raid-cleared', { detail:result })); } catch(_){}
          if(typeof window.refreshRaidClearRewardNotice === 'function'){
            try { window.refreshRaidClearRewardNotice(); } catch(_){}
          }
        }
        const root=document.getElementById('daily-raid-root');
        if(root && root.getAttribute('aria-hidden')==='false' && result) render(result);
        return result;
      } catch(err) {
        console.error('[raid] damage submit failed', err, meta||{});
        return null;
      } finally {
        setTimeout(()=>{ finishPromise=null; },300);
      }
    })();
    return finishPromise;
  }

  window.addEventListener('sasaphia-admin-mode-changed', ()=>{ if(currentStatus && document.getElementById('daily-raid-root')) render(currentStatus); });

  function setupFriendHomeNotice(){
    ensureFriendNoticeDot();

    // タイマーだけに依存せず、アプリ側DB初期化の完了後に必ず再確認する。
    try {
      const dbReady = window._dbLoadPromise;
      if(dbReady && typeof dbReady.then === 'function'){
        Promise.resolve(dbReady)
          .catch(()=>null)
          .then(()=>refreshFriendHomeNotice());
      }
    } catch(err) {
      console.warn('[friend notice] db-ready hook skipped', err && (err.message || err));
    }

    // 初期化タイミング差への保険。
    setTimeout(refreshFriendHomeNotice, 500);
    setTimeout(refreshFriendHomeNotice, 1800);
    setTimeout(refreshFriendHomeNotice, 5000);

    // 外から戻った時は、新しい申請や他ユーザーによるレイド作成を即反映。
    window.addEventListener('focus', refreshFriendHomeNotice);
    document.addEventListener('visibilitychange', ()=>{
      if(document.visibilityState === 'visible') refreshFriendHomeNotice();
    });

    // 承認/拒否後は、その場で赤ドットを再判定。
    document.addEventListener('click', e=>{
      const btn = e.target && e.target.closest ? e.target.closest('.friend-req-accept,.friend-req-decline') : null;
      if(btn) setTimeout(refreshFriendHomeNotice, 450);
    }, true);

    // アプリを開いたままでも新着を拾えるよう、軽量に定期確認。
    setInterval(refreshFriendHomeNotice, 60000);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupFriendHomeNotice, {once:true});
  else setupFriendHomeNotice();

  window.RaidEvent = { fetchStatus, finishAttempt, refreshFriendHomeNotice, getCurrentStatus:()=>currentStatus };
  window.openDailyRaid = open;
  window.closeDailyRaid = close;
  window.startDailyRaidBattle = start;
})();
