// 20260823-raid-finalize-by-raidid-v62
(function(){
  'use strict';

  const STAGE_ID = 'shooting_raid_test';
  let currentStatus = null;
  let finishPromise = null;
  let friendNoticeRefreshPromise = null;
  const memberPanelCache = new Map();

  function sb(){ return window.zsSupabase || null; }
  function uid(){ return String(localStorage.getItem('zukan_user_id') || '').trim().toLowerCase(); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function n(v){ return Math.max(0, Math.floor(Number(v || 0))); }
  function fmt(v){ return n(v).toLocaleString('ja-JP'); }
  function isAdmin(){ return !!(window.SasaphiaAdmin && typeof window.SasaphiaAdmin.isEnabled === 'function' && window.SasaphiaAdmin.isEnabled()); }

  async function rpc(name,args){
    const client=sb();
    if(!client || typeof client.rpc!=='function') throw new Error('Supabase接続がありません');
    const res=await client.rpc(name,args||{});
    if(res && res.error) throw res.error;
    return res ? res.data : null;
  }
  function normalizeStatus(raw){
    if(!raw) return null;
    if(typeof raw==='string'){ try{ raw=JSON.parse(raw); }catch(_){ } }
    return raw;
  }

  function ensureFriendNoticeDot(){
    const btn=document.getElementById('friend-home-entry');
    if(!btn) return null;
    let dot=btn.querySelector('.friend-notice-dot');
    if(!dot){
      dot=document.createElement('span');
      dot.className='friend-notice-dot';
      dot.setAttribute('aria-hidden','true');
      btn.appendChild(dot);
    }
    return dot;
  }
  function setFriendNotice(active,reasons){
    const btn=document.getElementById('friend-home-entry');
    const dot=ensureFriendNoticeDot();
    if(!btn || !dot) return;
    btn.classList.toggle('has-friend-notice',!!active);
    dot.classList.toggle('show',!!active);
    btn.dataset.noticeReason=(Array.isArray(reasons)?reasons:[]).filter(Boolean).join(',');
    btn.setAttribute('aria-label',active?'フレンドへ移動（新着あり）':'フレンドへ移動');
  }

  async function refreshFriendHomeNotice(){
    if(friendNoticeRefreshPromise) return friendNoticeRefreshPromise;
    friendNoticeRefreshPromise=(async()=>{
      const client=sb(), userId=uid();
      ensureFriendNoticeDot();
      if(!client || !userId){ setFriendNotice(false,[]); return {pendingFriend:false,raidReady:false}; }
      let pendingFriend=false, raidReady=false;
      try{
        const req=await client.from('friendships').select('id').eq('receiver_id',userId).eq('status','pending').limit(1);
        pendingFriend=!!(req && !req.error && Array.isArray(req.data) && req.data.length);
      }catch(err){ console.warn('[friend notice] request check skipped',err&&err.message||err); }
      try{
        const mine=normalizeStatus(await rpc('get_my_daily_raid_room',{p_user_id:userId}));
        if(mine && mine.raid_id){
          const me=mine.me||{};
          const hp=n(mine.current_hp);
          const cleared=mine.status==='cleared'||hp<=0;
          const attempts=Math.max(0,Math.min(3,n(me.attempt_count)));
          const inBattle=!!me.attempt_started_at&&!me.attempt_finished_at;
          raidReady=!cleared && attempts<3 && !inBattle;
        }else{
          const rooms=normalizeStatus(await rpc('list_recruiting_friend_raids',{p_user_id:userId}))||[];
          raidReady=Array.isArray(rooms) && rooms.length>0;
        }
      }catch(err){ console.warn('[friend notice] raid check skipped',err&&err.message||err); }
      const reasons=[];
      if(pendingFriend) reasons.push('friend-request');
      if(raidReady) reasons.push('raid-ready');
      setFriendNotice(pendingFriend||raidReady,reasons);
      return {pendingFriend,raidReady};
    })().finally(()=>{ friendNoticeRefreshPromise=null; });
    return friendNoticeRefreshPromise;
  }

  function getCharacterPanelById(characterId){
    const id=Number(characterId||0);
    if(!id) return '';
    try{
      const chars=Array.isArray(window.CHARACTERS)?window.CHARACTERS:[];
      const chara=chars.find(ch=>ch&&Number(ch.id)===id);
      if(chara) return chara.panelImg||chara.panelImage||chara.img||'';
    }catch(_){ }
    return `images/chara_${String(id).padStart(2,'0')}_panel.webp`;
  }

  async function hydrateMemberPanels(status){
    const members=Array.isArray(status&&status.members)?status.members:[];
    const ids=[...new Set(members.map(m=>String(m&&m.user_id||'').trim().toLowerCase()).filter(Boolean))];
    const missing=ids.filter(id=>!memberPanelCache.has(id));
    if(missing.length){
      const client=sb();
      if(client){
        try{
          const res=await client.from('user_profiles').select('*').in('user_id',missing);
          if(res&&res.error) throw res.error;
          const found=new Map();
          for(const profile of (res&&res.data||[])){
            const id=String(profile&&profile.user_id||'').trim().toLowerCase();
            if(!id) continue;
            let panel='';
            try{
              if(typeof window.getFriendFavoriteCharacter==='function'){
                const favorite=await window.getFriendFavoriteCharacter(profile);
                panel=favorite&&favorite.panelSrc?String(favorite.panelSrc):'';
              }
            }catch(_){ }
            if(!panel) panel=getCharacterPanelById(profile.favorite_char_id||1);
            found.set(id,panel); memberPanelCache.set(id,panel);
          }
          missing.forEach(id=>{ if(!found.has(id)) memberPanelCache.set(id,getCharacterPanelById(1)); });
        }catch(err){
          console.warn('[raid] member panel load skipped',err&&err.message||err);
          missing.forEach(id=>memberPanelCache.set(id,getCharacterPanelById(1)));
        }
      }
    }
    members.forEach(m=>{ m.panel_src=memberPanelCache.get(String(m.user_id||'').trim().toLowerCase())||''; });
    return status;
  }

  function ensureEarlyFinalizeStyle(){
    if(document.getElementById('daily-raid-early-finalize-style-v54')) return;
    const style=document.createElement('style');
    style.id='daily-raid-early-finalize-style-v54';
    style.textContent=`
      #daily-raid-root .daily-raid-actions{
        display:grid!important;
        grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
        grid-template-rows:auto 46px!important;
        gap:7px!important;
        align-items:stretch!important;
        padding-top:7px!important;
      }
      #daily-raid-root .daily-raid-attempt-copy{
        grid-column:1 / -1!important;
        grid-row:1!important;
        min-width:0!important;
        margin:0!important;
      }
      #daily-raid-root #daily-raid-start,
      #daily-raid-root #daily-raid-finalize-best{
        position:static!important;
        width:100%!important;
        min-width:0!important;
        max-width:none!important;
        height:46px!important;
        min-height:46px!important;
        margin:0!important;
        padding:5px 7px!important;
        border-radius:0!important;
        transform:none!important;
      }
      #daily-raid-root #daily-raid-start{
        grid-column:1!important;
        grid-row:2!important;
      }
      #daily-raid-root #daily-raid-finalize-best{
        grid-column:2!important;
        grid-row:2!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        border:1px solid rgba(132,157,105,.55)!important;
        background:linear-gradient(180deg,rgba(88,98,67,.94),rgba(62,71,48,.98))!important;
        color:#f5efce!important;
        font-family:"Noto Serif JP",serif!important;
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)!important;
      }
      #daily-raid-root #daily-raid-finalize-best[hidden]{
        display:none!important;
      }
      #daily-raid-root #daily-raid-finalize-best span,
      #daily-raid-root #daily-raid-start span{
        display:block!important;
        margin:0 0 3px!important;
        font-family:"Cinzel",serif!important;
        font-size:6px!important;
        line-height:1!important;
        letter-spacing:.16em!important;
        opacity:.72!important;
        white-space:nowrap!important;
      }
      #daily-raid-root #daily-raid-finalize-best b,
      #daily-raid-root #daily-raid-start b{
        display:block!important;
        margin:0!important;
        font-size:11px!important;
        line-height:1.12!important;
        font-weight:700!important;
        letter-spacing:.04em!important;
        white-space:nowrap!important;
      }
      #daily-raid-root #daily-raid-finalize-best:disabled{
        opacity:.38!important;
      }

      /* 確定ボタンが出ない状態ではバトル開始を2列分使う */
      #daily-raid-root .daily-raid-actions:not(.can-finalize-early) #daily-raid-start{
        grid-column:1 / -1!important;
      }

      @media (max-width:380px){
        #daily-raid-root .daily-raid-actions{
          gap:5px!important;
        }
        #daily-raid-root #daily-raid-finalize-best b,
        #daily-raid-root #daily-raid-start b{
          font-size:10px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureRoot(){
    ensureEarlyFinalizeStyle();
    let root=document.getElementById('daily-raid-root');
    if(root) return root;
    root=document.createElement('div');
    root.id='daily-raid-root';
    root.setAttribute('aria-hidden','true');
    root.innerHTML=`
      <div class="daily-raid-page">
        <header class="daily-raid-head">
          <button type="button" id="daily-raid-back" aria-label="戻る">‹</button>
          <div class="daily-raid-head-title"><small>DAILY RAID</small><strong>ザ・テスト</strong></div>
          <div class="daily-raid-head-rule"><span>1 DAY</span><b>3 ATTEMPTS</b></div>
        </header>

        <section class="daily-raid-entry" id="daily-raid-entry">
          <div class="daily-raid-entry-hero">
            <img src="images/raid_enemy_01.webp" alt="ザ・テスト">
            <div><small>DAILY CO-OP RAID</small><strong>THE TEST</strong><span>募集するか、フレンドの募集へ参加してください。</span></div>
          </div>
          <div class="daily-raid-mode-grid">
            <button type="button" class="daily-raid-mode-card is-host" id="daily-raid-recruit-btn">
              <small>HOST</small><strong>募集する</strong><span>自分のレイドを作成してフレンドを募集</span><b>募集しながらプレイ可能</b>
            </button>
            <button type="button" class="daily-raid-mode-card is-join" id="daily-raid-join-btn">
              <small>JOIN</small><strong>参加する</strong><span>募集中のフレンドレイドから選択</span><b>空きのある募集のみ表示</b>
            </button>
          </div>
          <div class="daily-raid-entry-note">募集主は、まだ誰も参加しておらず一度も挑戦していない間だけ募集を取り消せます。参加後・挑戦後は当日のチームで固定されます。</div>
        </section>

        <section class="daily-raid-join-select" id="daily-raid-join-select" hidden>
          <div class="daily-raid-join-head"><small>FRIEND RAID</small><strong>参加するレイドを選択</strong><span>フレンドが現在募集しているレイドです。</span></div>
          <div class="daily-raid-room-list" id="daily-raid-room-list"></div>
        </section>

        <div id="daily-raid-lobby" class="daily-raid-lobby" hidden>
          <main class="daily-raid-body">
            <section class="daily-raid-hero">
              <div class="daily-raid-hero-halo" aria-hidden="true"></div><div class="daily-raid-hero-lines" aria-hidden="true"></div>
              <div class="daily-raid-hero-rank"><span>RAID ENEMY</span><b>TEST TYPE</b></div>
              <img src="images/raid_enemy_01.webp" alt="ザ・テスト">
              <div class="daily-raid-hero-copy"><small>RAID ENEMY</small><strong>THE TEST</strong><span>ザ・テスト</span></div>
              <div class="daily-raid-hero-message">これは、神々への試験だ。</div>
            </section>

            <section class="daily-raid-team-meta">
              <div><small>RAID TEAM</small><strong id="daily-raid-team-name">--</strong></div>
              <div class="daily-raid-host-actions" id="daily-raid-host-actions" hidden>
                <button type="button" id="daily-raid-recruit-cancel" class="daily-raid-recruit-cancel" hidden>募集を取り消す</button>
              </div>
            </section>

            <section class="daily-raid-hpbox">
              <div class="daily-raid-hphead"><div><small>SHARED HP</small><span>本日の共有耐久値</span></div><strong id="daily-raid-hptext">-- / 100,000</strong></div>
              <div class="daily-raid-hpbar"><i id="daily-raid-hpfill"></i><span></span></div>
              <div class="daily-raid-hpmeta"><b id="daily-raid-status">CONNECTING...</b><span>RESET 00:00 JST</span></div>
            </section>

            <section class="daily-raid-members">
              <div class="daily-raid-section-title"><div><small>CO-OP UNIT</small><span>RAID MEMBERS</span></div><b id="daily-raid-member-count">0 / 4</b></div>
              <div id="daily-raid-member-list" class="daily-raid-member-grid"></div>
            </section>

            <section class="daily-raid-rule">
              <div class="daily-raid-rule-title"><small>BATTLE RULE</small></div>
              <div class="daily-raid-rule-grid">
                <div><b>01</b><span>1人につき1日3回チャレンジ・BESTダメージを採用</span></div>
                <div><b>02</b><span>全滅または180秒経過で終了</span></div>
                <div><b>03</b><span>3回目終了時にBESTダメージを共有HPから差し引く</span></div>
              </div>
            </section>
          </main>
          <footer class="daily-raid-actions">
            <div class="daily-raid-attempt-copy"><small>TODAY'S ATTEMPT</small><b id="daily-raid-attempt-count">0 / 3</b></div>
            <button type="button" id="daily-raid-finalize-best" class="daily-raid-finalize-best" hidden>
              <span>LOCK BEST SCORE</span><b>このスコアで確定する</b>
            </button>
            <button type="button" id="daily-raid-start"><span>RAID BATTLE</span><b>挑戦する</b></button>
          </footer>
        </div>
      </div>`;
    document.body.appendChild(root);

    root.querySelector('#daily-raid-back').addEventListener('click',()=>{
      const join=root.querySelector('#daily-raid-join-select');
      if(join && !join.hidden){ showEntryMode(); return; }
      close();
    });
    root.querySelector('#daily-raid-recruit-btn').addEventListener('click',startRecruiting);
    root.querySelector('#daily-raid-join-btn').addEventListener('click',showJoinList);
    root.querySelector('#daily-raid-start').addEventListener('click',start);
    root.querySelector('#daily-raid-finalize-best').addEventListener('click',finalizeBestNow);
    root.querySelector('#daily-raid-recruit-cancel').addEventListener('click',cancelRecruitment);
    return root;
  }

  function showOnly(which){
    const root=ensureRoot();
    const entry=root.querySelector('#daily-raid-entry');
    const join=root.querySelector('#daily-raid-join-select');
    const lobby=root.querySelector('#daily-raid-lobby');
    entry.hidden=which!=='entry'; join.hidden=which!=='join'; lobby.hidden=which!=='lobby';
  }
  function showEntryMode(){ currentStatus=null; showOnly('entry'); }

  async function fetchStatus(){
    const userId=uid();
    if(!userId) throw new Error('ユーザーIDがありません');
    currentStatus=normalizeStatus(await rpc('get_my_daily_raid_room',{p_user_id:userId}));
    return currentStatus;
  }

  async function showJoinList(){
    const root=ensureRoot(); showOnly('join');
    const list=root.querySelector('#daily-raid-room-list');
    list.innerHTML='<div class="daily-raid-room-empty">募集中のレイドを確認中...</div>';
    try{
      const rooms=normalizeStatus(await rpc('list_recruiting_friend_raids',{p_user_id:uid()}))||[];
      if(!Array.isArray(rooms)||!rooms.length){
        list.innerHTML='<div class="daily-raid-room-empty"><strong>現在募集中のフレンドはいません</strong><span>フレンドが「募集する」を選ぶと、ここに表示されます。</span></div>';
        return;
      }
      list.innerHTML=rooms.map(room=>{
        const count=Math.max(1,n(room.member_count));
        const hp=n(room.current_hp), max=Math.max(1,n(room.max_hp)||100000);
        const pct=Math.max(0,Math.min(100,Math.round(hp/max*100)));
        return `<button type="button" class="daily-raid-room-card" data-room-id="${esc(room.raid_id)}">
          <div class="daily-raid-room-card-top"><span>HOST</span><strong>${esc(room.host_display_name||room.host_user_id||'PLAYER')}</strong><b>${count} / 4</b></div>
          <div class="daily-raid-room-card-hp"><i style="width:${pct}%"></i></div>
          <div class="daily-raid-room-card-bottom"><span>${fmt(hp)} / ${fmt(max)} HP</span><b>このレイドに参加</b></div>
        </button>`;
      }).join('');
      list.querySelectorAll('.daily-raid-room-card').forEach(btn=>btn.addEventListener('click',()=>joinRoom(btn.dataset.roomId,btn)));
    }catch(err){
      console.error('[raid] list failed',err);
      list.innerHTML='<div class="daily-raid-room-empty"><strong>募集情報を取得できません</strong><span>'+esc(err&&err.message||'通信エラー')+'</span></div>';
    }
  }

  async function startRecruiting(){
    const btn=document.getElementById('daily-raid-recruit-btn');
    if(btn) btn.disabled=true;
    try{
      const status=normalizeStatus(await rpc('create_daily_raid_recruitment',{p_user_id:uid()}));
      currentStatus=status; await hydrateMemberPanels(status); render(status); refreshFriendHomeNotice();
    }catch(err){
      console.error('[raid] recruit failed',err); alert(err&&err.message?err.message:'募集を開始できませんでした。');
    }finally{ if(btn) btn.disabled=false; }
  }

  async function joinRoom(roomId,btn){
    if(!roomId) return;
    if(btn) btn.disabled=true;
    try{
      const status=normalizeStatus(await rpc('join_daily_raid_recruitment',{p_user_id:uid(),p_raid_id:roomId}));
      if(!status || status.ok===false) throw new Error(status&&status.message||'レイドへ参加できませんでした');
      currentStatus=status; await hydrateMemberPanels(status); render(status); refreshFriendHomeNotice();
    }catch(err){
      console.error('[raid] join failed',err); alert(err&&err.message?err.message:'レイドへ参加できませんでした。');
      await showJoinList();
    }finally{ if(btn) btn.disabled=false; }
  }

  async function cancelRecruitment(){
    if(!currentStatus || !currentStatus.is_host) return;
    const me=currentStatus.me||{};
    const members=Array.isArray(currentStatus.members)?currentStatus.members:[];
    const canCancel=members.length===1 && n(me.attempt_count)===0 && !me.attempt_started_at;
    if(!canCancel){
      alert('募集は、まだ誰も参加しておらず一度も挑戦していない場合のみ取り消せます。');
      return;
    }
    if(!confirm('このレイド募集を取り消しますか？')) return;
    const btn=document.getElementById('daily-raid-recruit-cancel');
    if(btn) btn.disabled=true;
    try{
      const result=normalizeStatus(await rpc('cancel_daily_raid_recruitment',{p_user_id:uid()}));
      if(!result || result.ok===false) throw new Error(result&&result.message||'募集を取り消せませんでした');
      currentStatus=null;
      showEntryMode();
      refreshFriendHomeNotice();
    }catch(err){
      console.error('[raid] cancel recruitment failed',err);
      alert(err&&err.message?err.message:'募集を取り消せませんでした。');
      try{
        const status=await fetchStatus();
        if(status&&status.raid_id){ await hydrateMemberPanels(status); render(status); }
      }catch(_){}
    }finally{ if(btn) btn.disabled=false; }
  }

  function render(status){
    const root=ensureRoot(); showOnly('lobby');
    const hp=n(status&&status.current_hp), maxHp=Math.max(1,n(status&&status.max_hp)||100000);
    const cleared=!!(status&&status.status==='cleared')||hp<=0;
    const me=status&&status.me||{};
    const admin=isAdmin();
    const attemptCount=Math.max(0,Math.min(3,n(me.attempt_count)));
    const inBattle=!!me.attempt_started_at&&!me.attempt_finished_at;
    const allFinished=attemptCount>=3&&!!me.attempt_finished_at;
    const bestDamage=n(me.best_damage);
    const members=Array.isArray(status&&status.members)?status.members:[];

    root.querySelector('#daily-raid-hptext').textContent=`${fmt(hp)} / ${fmt(maxHp)}`;
    root.querySelector('#daily-raid-hpfill').style.transform=`scaleX(${Math.max(0,Math.min(1,hp/maxHp))})`;
    root.querySelector('#daily-raid-member-count').textContent=`${members.length} / 4`;
    root.querySelector('#daily-raid-attempt-count').textContent=admin?'∞ / 3':`${attemptCount} / 3`;
    const teamName=root.querySelector('#daily-raid-team-name');
    if(teamName) teamName.textContent=status&&status.is_host?'あなたの募集レイド':`${status&&status.host_display_name||'フレンド'}のレイド`;

    const hostActions=root.querySelector('#daily-raid-host-actions');
    const cancelBtn=root.querySelector('#daily-raid-recruit-cancel');
    const isHost=!!(status&&status.is_host);
    const canCancelRecruitment=!!(isHost && !cleared && members.length===1 && attemptCount===0 && !me.attempt_started_at);
    if(hostActions) hostActions.hidden=!isHost||cleared;
    if(cancelBtn){
      cancelBtn.hidden=!canCancelRecruitment;
      cancelBtn.disabled=!canCancelRecruitment;
    }
    const stat=root.querySelector('#daily-raid-status');
    if(admin) stat.textContent='ADMIN TEST · 挑戦回数/共有HPともに非反映';
    else if(cleared) stat.textContent='RAID CLEAR';
    else if(allFinished) stat.textContent=`本日のBEST確定 · ${fmt(bestDamage)} DAMAGE`;
    else if(inBattle) stat.textContent=`${attemptCount} / 3 挑戦中`;
    else if(attemptCount>0) stat.textContent=`${attemptCount} / 3 完了 · 暫定BEST ${fmt(bestDamage)} DAMAGE`;
    else stat.textContent=status&&status.recruiting&&status.is_host?'フレンド募集中 · そのまま挑戦可能':'挑戦可能 · 3回中BESTを採用';
    stat.setAttribute('data-state',admin?'admin':cleared?'clear':allFinished?'done':inBattle?'active':'ready');

    const list=root.querySelector('#daily-raid-member-list');
    const myId=uid();
    const rows=members.map(m=>{
      const mine=String(m.user_id||'')===myId;
      const attempts=Math.max(0,Math.min(3,n(m.attempt_count)));
      const active=!!m.attempt_started_at&&!m.attempt_finished_at;
      const done=attempts>=3&&!!m.attempt_finished_at;
      const best=n(m.best_damage);
      const state=done?'BEST LOCKED':active?`${attempts}/3 IN BATTLE`:attempts>0?`${attempts}/3 READY`:'READY';
      const panel=m.panel_src?`<img class="daily-raid-member-panel" src="${esc(m.panel_src)}" alt="">`:'<div class="daily-raid-member-panel daily-raid-member-panel-empty"></div>';
      const host=String(m.user_id||'')===String(status&&status.host_user_id||'');
      return `<div class="daily-raid-member${mine?' is-me':''}${done?' is-done':''}${active?' is-active':''}"><span class="daily-raid-member-no">${mine?'YOU':host?'HOST':'ALLY'}</span>${panel}<div class="daily-raid-member-copy"><strong>${esc(m.display_name||m.user_id||'PLAYER')}</strong><small class="daily-raid-member-state">${esc(state)}</small><div class="daily-raid-member-damage"><span>BEST</span><b>${best>0?fmt(best):'—'}</b></div></div></div>`;
    });
    while(rows.length<4) rows.push('<div class="daily-raid-member is-empty"><span class="daily-raid-member-no">ALLY</span><div class="daily-raid-member-copy"><strong>EMPTY</strong><small>フレンド枠</small></div><b>OPEN</b></div>');
    list.innerHTML=rows.join('');

    const finalizeBtn=root.querySelector('#daily-raid-finalize-best');
    const actions=root.querySelector('.daily-raid-actions');
    const canFinalizeEarly=!admin && !cleared && !inBattle && attemptCount>0 && attemptCount<3;
    if(actions) actions.classList.toggle('can-finalize-early',canFinalizeEarly);
    if(finalizeBtn){
      finalizeBtn.hidden=!canFinalizeEarly;
      finalizeBtn.disabled=!canFinalizeEarly;
      if(canFinalizeEarly){
        finalizeBtn.innerHTML=`<span>BEST ${fmt(bestDamage)} DAMAGE</span><b>現在スコアで確定</b>`;
      }
    }

    const start=root.querySelector('#daily-raid-start');
    start.disabled=admin?false:(cleared||inBattle||attemptCount>=3);
    if(admin) start.innerHTML='<span>ADMIN TEST</span><b>テスト挑戦</b>';
    else if(cleared) start.innerHTML='<span>DAILY RAID</span><b>RAID CLEAR</b>';
    else if(inBattle) start.innerHTML='<span>TODAY\'S ATTEMPT</span><b>挑戦中</b>';
    else if(attemptCount>=3) start.innerHTML='<span>BEST DAMAGE LOCKED</span><b>本日の3回終了</b>';
    else start.innerHTML=`<span>${attemptCount+1} / 3 ATTEMPT</span><b>バトル開始</b>`;
  }

  async function open(options){
    const root=ensureRoot(); root.style.display='block'; root.setAttribute('aria-hidden','false');
    if(options&&options.immediate) root.classList.add('show'); else requestAnimationFrame(()=>root.classList.add('show'));
    try{
      const status=await fetchStatus();
      if(status&&status.raid_id){ await hydrateMemberPanels(status); render(status); }
      else showEntryMode();
      refreshFriendHomeNotice();
    }catch(err){
      console.error('[raid] open failed',err); showEntryMode();
    }
  }
  function close(){
    const root=document.getElementById('daily-raid-root'); if(!root) return;
    root.classList.remove('show'); root.setAttribute('aria-hidden','true');
    setTimeout(()=>{ if(root.getAttribute('aria-hidden')==='true') root.style.display='none'; },180);
  }

  async function finalizeBestNow(){
    const status=currentStatus||await fetchStatus();
    if(!status||!status.raid_id) return;

    const me=status.me||{};
    const attemptCount=Math.max(0,Math.min(3,n(me.attempt_count)));
    const bestDamage=n(me.best_damage);
    const inBattle=!!me.attempt_started_at&&!me.attempt_finished_at;
    const cleared=status.status==='cleared'||n(status.current_hp)<=0;

    if(cleared){ alert('レイドはすでに討伐されています。'); return; }
    if(inBattle){ alert('挑戦中はスコアを確定できません。'); return; }
    if(attemptCount<=0){ alert('1回以上挑戦してから確定してください。'); return; }
    if(attemptCount>=3){ return; }

    const remaining=Math.max(0,3-attemptCount);
    const ok=confirm(
      `現在スコア ${fmt(bestDamage)} DAMAGE で確定します。\n\n`+
      `現在スコアで確定する場合、残り${remaining}回の挑戦権を失います。\n\nOK？`
    );
    if(!ok) return;

    const btn=document.getElementById('daily-raid-finalize-best');
    const startBtn=document.getElementById('daily-raid-start');
    if(btn) btn.disabled=true;
    if(startBtn) startBtn.disabled=true;

    try{
      const result=normalizeStatus(await rpc('finalize_daily_raid_best_now',{p_user_id:uid(),p_raid_id:status.raid_id}));
      if(!result || result.ok===false) throw new Error(result&&result.message||'スコアを確定できませんでした');
      currentStatus=result;
      await hydrateMemberPanels(result);
      render(result);
      refreshFriendHomeNotice();

      if(result.status==='cleared'||n(result.current_hp)<=0){
        try{ window.dispatchEvent(new CustomEvent('sasaphia-daily-raid-cleared',{detail:result})); }catch(_){}
        if(typeof window.refreshRaidClearRewardNotice==='function'){
          try{ window.refreshRaidClearRewardNotice(); }catch(_){}
        }
      }
    }catch(err){
      console.error('[raid] early best finalize failed',err);
      alert(err&&err.message?err.message:'スコアを確定できませんでした。');
      try{
        const latest=await fetchStatus();
        if(latest){ await hydrateMemberPanels(latest); render(latest); }
      }catch(_){}
    }
  }

  async function start(){
    const btn=document.getElementById('daily-raid-start'); if(btn) btn.disabled=true;
    try{
      // ロビーの「挑戦する」では挑戦回数を消費しない。
      // ここではパーティ編成画面を開くだけ。
      const status=currentStatus||await fetchStatus();
      if(!status||!status.raid_id) throw new Error('レイド情報を取得できません');

      const hp=n(status.current_hp);
      const maxHp=n(status.max_hp)||100000;

      if(isAdmin()){
        close();
        window.__shootingReturnContext={type:'raidLobby'};
        window.openShootingEvent({
          stageId:STAGE_ID,
          raidContext:{
            raidId:status.raid_id||'admin-test',
            currentHp:maxHp,
            maxHp,
            raidDate:status.raid_date||'',
            adminTest:true,
            pendingAttempt:false,
            attemptStarted:true
          }
        });
        return;
      }

      const me=status.me||{};
      const attemptCount=Math.max(0,Math.min(3,n(me.attempt_count)));
      const inBattle=!!me.attempt_started_at&&!me.attempt_finished_at;
      const cleared=status.status==='cleared'||hp<=0;

      if(cleared) throw new Error('レイドはすでに討伐されています');
      if(inBattle) throw new Error('現在挑戦中のレイドがあります');
      if(attemptCount>=3) throw new Error('本日の3回の挑戦は終了しています');

      close();
      window.__shootingReturnContext={type:'raidLobby'};
      window.openShootingEvent({
        stageId:STAGE_ID,
        raidContext:{
          raidId:status.raid_id,
          currentHp:hp,
          maxHp,
          raidDate:status.raid_date||'',
          adminTest:false,
          pendingAttempt:true,
          attemptStarted:false,
          attemptCount
        }
      });
    }catch(err){
      console.error('[raid] party select open failed',err); alert(err&&err.message?err.message:'レイドを開始できませんでした。');
      if(btn) btn.disabled=false;
      try{ const status=await fetchStatus(); if(status){await hydrateMemberPanels(status);render(status);} }catch(_){ }
    }
  }

  async function finishAttempt(damage,meta){
    if(isAdmin()){ console.info('[raid] ADMIN TEST result (DB not updated)',{damage:n(damage),meta:meta||{}}); return currentStatus; }
    if(finishPromise) return finishPromise;
    finishPromise=(async()=>{
      try{
        const result=normalizeStatus(await rpc('submit_daily_raid_damage_v2',{p_user_id:uid(),p_damage:n(damage)}));
        currentStatus=result; refreshFriendHomeNotice();
        if(result&&(result.status==='cleared'||n(result.current_hp)<=0)){
          try{ window.dispatchEvent(new CustomEvent('sasaphia-daily-raid-cleared',{detail:result})); }catch(_){ }
          if(typeof window.refreshRaidClearRewardNotice==='function'){ try{ window.refreshRaidClearRewardNotice(); }catch(_){ } }
        }
        const root=document.getElementById('daily-raid-root');
        if(root&&root.getAttribute('aria-hidden')==='false'&&result){ await hydrateMemberPanels(result); render(result); }
        return result;
      }catch(err){ console.error('[raid] damage submit failed',err,meta||{}); return null; }
      finally{ setTimeout(()=>{finishPromise=null;},300); }
    })();
    return finishPromise;
  }

  function setupFriendHomeNotice(){
    ensureFriendNoticeDot();
    try{
      const dbReady=window._dbLoadPromise;
      if(dbReady&&typeof dbReady.then==='function') Promise.resolve(dbReady).catch(()=>null).then(()=>refreshFriendHomeNotice());
    }catch(_){ }
    setTimeout(refreshFriendHomeNotice,500); setTimeout(refreshFriendHomeNotice,1800); setTimeout(refreshFriendHomeNotice,5000);
    window.addEventListener('focus',refreshFriendHomeNotice);
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') refreshFriendHomeNotice(); });
    document.addEventListener('click',e=>{ const btn=e.target&&e.target.closest?e.target.closest('.friend-req-accept,.friend-req-decline'):null; if(btn)setTimeout(refreshFriendHomeNotice,450); },true);
    setInterval(refreshFriendHomeNotice,60000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setupFriendHomeNotice,{once:true}); else setupFriendHomeNotice();

  window.RaidEvent={fetchStatus,finishAttempt,finalizeBestNow,refreshFriendHomeNotice,getCurrentStatus:()=>currentStatus,showJoinList,startRecruiting};
  window.openDailyRaid=open;
  window.closeDailyRaid=close;
  window.startDailyRaidBattle=start;
})();
