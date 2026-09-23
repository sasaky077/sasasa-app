// 20260923-raid-glass-canonical-v80
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

  function ensureRaidNoticeDot(){
    const btn=document.getElementById('raid-home-entry');
    if(!btn) return null;
    let dot=btn.querySelector('.raid-notice-dot');
    if(!dot){
      dot=document.createElement('span');
      dot.className='raid-notice-dot';
      dot.setAttribute('aria-hidden','true');
      btn.appendChild(dot);
    }
    return dot;
  }

  function setFriendNotice(count,reasons){
    const btn=document.getElementById('friend-home-entry');
    const dot=ensureFriendNoticeDot();
    if(!btn || !dot) return;
    const noticeCount=Math.max(0,Math.floor(Number(count||0)));
    const active=noticeCount>0;
    btn.classList.toggle('has-friend-notice',active);
    dot.classList.toggle('show',active);
    dot.textContent=active?(noticeCount>99?'99+':String(noticeCount)):'';
    dot.setAttribute('aria-hidden',active?'false':'true');
    btn.dataset.noticeReason=(Array.isArray(reasons)?reasons:[]).filter(Boolean).join(',');
    btn.setAttribute('aria-label',active?('フレンドへ移動、申請'+noticeCount+'件'):'フレンドへ移動');
  }

  function setRaidNotice(active,reason){
    const btn=document.getElementById('raid-home-entry');
    const dot=ensureRaidNoticeDot();
    if(!btn || !dot) return;
    active=!!active;
    btn.classList.toggle('has-raid-notice',active);
    dot.classList.toggle('show',active);
    dot.textContent='';
    dot.setAttribute('aria-hidden',active?'false':'true');
    btn.dataset.noticeReason=active?String(reason||'active-raid'):'';
    btn.setAttribute(
      'aria-label',
      active
        ? (reason==='hosting'?'レイドバトルへ移動、自分の募集レイド進行中':'レイドバトルへ移動、参加中のレイドあり')
        : 'レイドバトルへ移動'
    );
  }

  function isRaidResultFinal(status){
    if(!status || !status.raid_id) return true;

    const state=String(status.status||'').trim().toLowerCase();
    const finalStates=new Set([
      'cleared','clear',
      'completed','complete',
      'finished','finish',
      'resolved','result',
      'closed',
      'cancelled','canceled'
    ]);

    if(finalStates.has(state)) return true;
    if(n(status.current_hp)<=0) return true;

    // Future/server-compatible result flags.
    if(
      status.result_confirmed===true ||
      status.result_finalized===true ||
      status.is_result_confirmed===true ||
      status.is_finished===true ||
      status.raid_finished===true ||
      status.ended===true
    ) return true;

    if(
      status.result_confirmed_at ||
      status.result_finalized_at ||
      status.raid_finished_at ||
      status.ended_at ||
      status.closed_at ||
      status.cancelled_at ||
      status.canceled_at
    ) return true;

    return false;
  }

  async function refreshFriendHomeNotice(){
    if(friendNoticeRefreshPromise) return friendNoticeRefreshPromise;
    friendNoticeRefreshPromise=(async()=>{
      const client=sb(), userId=uid();
      ensureFriendNoticeDot();
      ensureRaidNoticeDot();

      if(!client || !userId){
        setFriendNotice(0,[]);
        setRaidNotice(false,'');
        return {
          pendingFriend:false,
          pendingFriendCount:0,
          activeRaid:false,
          raidRole:''
        };
      }

      // FRIEND dot: friend requests ONLY.
      let pendingFriendCount=0;
      try{
        const req=await client
          .from('friendships')
          .select('id')
          .eq('receiver_id',userId)
          .eq('status','pending');

        pendingFriendCount=
          (req && !req.error && Array.isArray(req.data))
            ? req.data.length
            : 0;
      }catch(err){
        console.warn('[home notice] friend request check skipped',err&&err.message||err);
      }

      const pendingFriend=pendingFriendCount>0;
      setFriendNotice(
        pendingFriendCount,
        pendingFriend?['friend-request']:[]
      );

      // RAID dot:
      // - my hosted raid is active
      // - OR I already joined a friend's raid
      // Merely having a friend who is recruiting does NOT show a dot.
      let activeRaid=false;
      let raidRole='';
      try{
        const mine=normalizeStatus(
          await rpc('get_my_daily_raid_room',{p_user_id:userId})
        );

        if(mine && mine.raid_id && !isRaidResultFinal(mine)){
          activeRaid=true;
          raidRole=mine.is_host?'hosting':'joined';
        }
      }catch(err){
        console.warn('[home notice] active raid check skipped',err&&err.message||err);
      }

      setRaidNotice(activeRaid,raidRole);

      return {
        pendingFriend,
        pendingFriendCount,
        activeRaid,
        raidRole
      };
    })().finally(()=>{
      friendNoticeRefreshPromise=null;
    });

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
    if(document.getElementById('daily-raid-early-finalize-style-v99')) return;
    const style=document.createElement('style');
    style.id='daily-raid-early-finalize-style-v99';
    style.textContent=`
      #daily-raid-root .daily-raid-actions{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        min-height:66px!important;
        height:66px!important;
        padding:6px 14px!important;
        gap:8px!important;
        background:transparent!important;
        border:0!important;
        box-shadow:none!important;
        box-sizing:border-box!important;
      }
      #daily-raid-root .daily-raid-attempt-copy{
        display:none!important;
        visibility:hidden!important;
      }
      #daily-raid-root #daily-raid-start{
        position:static!important;
        width:210px!important;
        min-width:0!important;
        max-width:210px!important;
        height:52px!important;
        min-height:52px!important;
        margin:0 auto!important;
        padding:0 14px!important;
        border-radius:0!important;
        transform:none!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        box-sizing:border-box!important;
        clip-path:none!important;
      }
      #daily-raid-root .daily-raid-actions.can-finalize-early #daily-raid-start,
      #daily-raid-root .daily-raid-actions.can-finalize-early #daily-raid-finalize-best{
        flex:1 1 0!important;
        width:auto!important;
        min-width:0!important;
        max-width:182px!important;
        height:52px!important;
        min-height:52px!important;
        margin:0!important;
        box-sizing:border-box!important;
        border-radius:0!important;
        clip-path:none!important;
      }
      #daily-raid-root .daily-raid-actions.can-finalize-early #daily-raid-start::before,
      #daily-raid-root .daily-raid-actions.can-finalize-early #daily-raid-start::after,
      #daily-raid-root .daily-raid-actions.can-finalize-early #daily-raid-finalize-best::before,
      #daily-raid-root .daily-raid-actions.can-finalize-early #daily-raid-finalize-best::after{
        display:none!important;
        content:none!important;
      }
      #daily-raid-root #daily-raid-finalize-best{
        position:static!important;
        width:210px!important;
        min-width:0!important;
        max-width:210px!important;
        height:52px!important;
        min-height:52px!important;
        margin:0!important;
        padding:5px 8px!important;
        border-radius:0!important;
        transform:none!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        border:1px solid rgba(201,171,101,.78)!important;
        background:linear-gradient(180deg,rgba(56,57,56,.97),rgba(29,30,30,.99))!important;
        color:#f7f3ea!important;
        font-family:"Noto Serif JP",serif!important;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.10),
          inset 0 0 0 1px rgba(255,255,255,.025),
          0 2px 8px rgba(25,22,18,.16)!important;
      }
      #daily-raid-root #daily-raid-finalize-best[hidden]{
        display:none!important;
      }
      #daily-raid-root #daily-raid-finalize-best span{
        display:block!important;
        margin:0 0 4px!important;
        color:#d9bc72!important;
        font-family:"Cinzel",serif!important;
        font-size:9px!important;
        line-height:1!important;
        font-weight:650!important;
        letter-spacing:.06em!important;
        opacity:1!important;
        white-space:nowrap!important;
        text-shadow:0 1px 2px rgba(0,0,0,.70)!important;
      }
      #daily-raid-root #daily-raid-start span{
        display:none!important;
      }
      #daily-raid-root #daily-raid-finalize-best b{
        display:block!important;
        margin:0!important;
        color:#fffaf0!important;
        font-size:12px!important;
        line-height:1.12!important;
        font-weight:700!important;
        letter-spacing:.035em!important;
        white-space:nowrap!important;
        text-shadow:0 1px 2px rgba(0,0,0,.78)!important;
      }
      #daily-raid-root #daily-raid-start b{
        display:block!important;
        margin:0!important;
        color:#241911!important;
        font-size:18px!important;
        line-height:1!important;
        font-weight:750!important;
        letter-spacing:.14em!important;
        white-space:nowrap!important;
      }
      #daily-raid-root #daily-raid-finalize-best:disabled{
        opacity:.38!important;
      }

      #daily-raid-root #daily-raid-back{
        display:inline-flex!important;
        visibility:visible!important;
        opacity:1!important;
        pointer-events:auto!important;
        align-items:center!important;
        justify-content:flex-start!important;
        width:auto!important;
        min-width:0!important;
        height:auto!important;
        min-height:0!important;
        padding:4px 0!important;
        border:0!important;
        background:transparent!important;
        box-shadow:none!important;
        color:#5a422e!important;
        -webkit-text-fill-color:#5a422e!important;
        font-family:"Noto Serif JP",serif!important;
        font-size:11px!important;
        font-weight:500!important;
        letter-spacing:.04em!important;
        line-height:1.2!important;
      }
      #daily-raid-root #daily-raid-back:active{
        opacity:.55!important;
        transform:none!important;
      }

      /* v66: レイド上部を他コンテンツと同じ「戻る + 中央タイトル」に統一 */
      #daily-raid-root .daily-raid-head{
        position:relative!important;
        z-index:30!important;
        flex:0 0 var(--app-page-header-h,52px)!important;
        min-height:var(--app-page-header-h,52px)!important;
        height:var(--app-page-header-h,52px)!important;
        margin:0!important;
        padding:0 var(--app-page-side,18px)!important;
        display:flex!important;
        visibility:visible!important;
        opacity:1!important;
        align-items:center!important;
        justify-content:flex-start!important;
        box-sizing:border-box!important;
        border:0!important;
        background:transparent!important;
        box-shadow:none!important;
        overflow:visible!important;
      }
      #daily-raid-root .daily-raid-head::before,
      #daily-raid-root .daily-raid-head::after{
        content:none!important;
        display:none!important;
      }
      #daily-raid-root .daily-raid-head-title{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        position:absolute!important;
        left:50%!important;
        top:50%!important;
        transform:translate(-50%,-50%)!important;
        width:calc(100% - 140px)!important;
        margin:0!important;
        text-align:center!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        color:#5a422e!important;
        -webkit-text-fill-color:#5a422e!important;
        font-family:"Noto Serif JP",serif!important;
        font-size:14px!important;
        font-weight:600!important;
        line-height:1!important;
        letter-spacing:.12em!important;
        pointer-events:none!important;
      }
      #daily-raid-root .daily-raid-head-rule{
        display:none!important;
      }

      /* 上部右端にあった回数表示を、独立した見やすいステータス帯へ移動 */
      #daily-raid-root .daily-raid-attempt-overview{
        position:relative!important;
        min-height:36px!important;
        margin:4px 18px 10px!important;
        padding:7px 12px 7px 14px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:flex-start!important;
        gap:10px!important;
        box-sizing:border-box!important;
        border:0!important;
        border-radius:999px!important;
        background:transparent!important;
        box-shadow:none!important;
        overflow:visible!important;
        isolation:isolate!important;
      }
      #daily-raid-root .daily-raid-attempt-overview::before{
        content:""!important;
        position:absolute!important;
        inset:-3px -2px!important;
        z-index:0!important;
        border-radius:999px!important;
        background:
          radial-gradient(ellipse at 18% 50%,
            rgba(255,255,255,.78) 0%,
            rgba(255,255,255,.58) 34%,
            rgba(255,255,255,.30) 60%,
            rgba(255,255,255,.10) 82%,
            rgba(255,255,255,0) 100%
          ),
          linear-gradient(
            90deg,
            rgba(255,255,255,.62) 0%,
            rgba(255,255,255,.42) 42%,
            rgba(255,255,255,.18) 72%,
            rgba(255,255,255,0) 100%
          )!important;
        filter:blur(12px)!important;
        -webkit-filter:blur(12px)!important;
        opacity:.98!important;
        box-shadow:
          0 4px 18px rgba(98,84,58,.03),
          inset 0 1px 0 rgba(255,255,255,.42)!important;
      }
      #daily-raid-root .daily-raid-attempt-overview::after{
        content:""!important;
        position:absolute!important;
        left:0!important;
        top:7px!important;
        bottom:7px!important;
        width:2px!important;
        border-radius:999px!important;
        background:linear-gradient(180deg,rgba(175,142,78,.72),rgba(175,142,78,.16))!important;
        z-index:1!important;
      }
      #daily-raid-root .daily-raid-attempt-overview > span{
        position:relative!important;
        z-index:2!important;
        margin:0!important;
        color:#8c7651!important;
        font-family:"Noto Serif JP",serif!important;
        font-size:10px!important;
        font-weight:620!important;
        line-height:1.2!important;
        letter-spacing:.04em!important;
        white-space:nowrap!important;
        text-shadow:0 1px 0 rgba(255,255,255,.94),0 0 5px rgba(255,255,255,.58)!important;
      }
      #daily-raid-root .daily-raid-attempt-overview > strong{
        position:relative!important;
        z-index:2!important;
        margin:0!important;
        display:inline-flex!important;
        align-items:baseline!important;
        justify-content:flex-start!important;
        gap:4px!important;
        color:#6a573e!important;
        font-family:"Noto Serif JP",serif!important;
        font-size:12px!important;
        font-weight:650!important;
        line-height:1!important;
        letter-spacing:.03em!important;
        white-space:nowrap!important;
        text-shadow:0 1px 0 rgba(255,255,255,.94),0 0 5px rgba(255,255,255,.58)!important;
      }
      #daily-raid-root #daily-raid-attempt-remaining{
        min-width:18px!important;
        margin:0!important;
        text-align:left!important;
        color:#9d7a36!important;
        font-family:"Cinzel","Noto Serif JP",serif!important;
        font-size:18px!important;
        font-weight:700!important;
        line-height:1!important;
      }
      #daily-raid-root .daily-raid-attempt-overview.is-empty #daily-raid-attempt-remaining{
        color:#6a4938!important;
        -webkit-text-fill-color:#6a4938!important;
      }

      /* v77: ガラスフレーム内は白/黄文字を使わず、濃いブラウンで視認性を固定 */
      #daily-raid-root{
        --raid-glass-text:#493524;
        --raid-glass-sub:#654c37;
        --raid-glass-muted:#7b6651;
      }
      #daily-raid-root :is(
        .daily-raid-entry-hero,
        .daily-raid-mode-card,
        .daily-raid-join-head,
        .daily-raid-room-card,
        .daily-raid-room-empty,
        .daily-raid-attempt-overview,
        .daily-raid-swipe-tabs,
        .daily-raid-team-meta,
        .daily-raid-hpbox,
        .daily-raid-members,
        .daily-raid-member,
        .daily-raid-rule-dialog
      ){
        color:var(--raid-glass-text)!important;
        -webkit-text-fill-color:var(--raid-glass-text)!important;
      }
      #daily-raid-root :is(
        .daily-raid-entry-hero,
        .daily-raid-mode-card,
        .daily-raid-join-head,
        .daily-raid-room-card,
        .daily-raid-room-empty,
        .daily-raid-attempt-overview,
        .daily-raid-swipe-tabs,
        .daily-raid-team-meta,
        .daily-raid-hpbox,
        .daily-raid-members,
        .daily-raid-member,
        .daily-raid-rule-dialog
      ) :is(strong,b,.daily-raid-member-copy strong,.daily-raid-room-card-top strong){
        color:var(--raid-glass-text)!important;
        -webkit-text-fill-color:var(--raid-glass-text)!important;
        text-shadow:none!important;
      }
      #daily-raid-root :is(
        .daily-raid-entry-hero,
        .daily-raid-mode-card,
        .daily-raid-join-head,
        .daily-raid-room-card,
        .daily-raid-room-empty,
        .daily-raid-attempt-overview,
        .daily-raid-swipe-tabs,
        .daily-raid-team-meta,
        .daily-raid-hpbox,
        .daily-raid-members,
        .daily-raid-member,
        .daily-raid-rule-dialog
      ) :is(span,small){
        color:var(--raid-glass-sub)!important;
        -webkit-text-fill-color:var(--raid-glass-sub)!important;
        text-shadow:none!important;
      }
      #daily-raid-root :is(
        .daily-raid-entry-note,
        .daily-raid-member-state,
        .daily-raid-hpmeta
      ){
        color:var(--raid-glass-muted)!important;
        -webkit-text-fill-color:var(--raid-glass-muted)!important;
        text-shadow:none!important;
      }
      #daily-raid-root .daily-raid-attempt-overview > span,
      #daily-raid-root .daily-raid-attempt-overview > strong,
      #daily-raid-root #daily-raid-attempt-remaining{
        color:var(--raid-glass-text)!important;
        -webkit-text-fill-color:var(--raid-glass-text)!important;
        text-shadow:none!important;
      }

      /* build850: TOPの募集/参加カードを参加一覧の空状態ガラスと完全共通化 */
      #daily-raid-root .daily-raid-mode-card,
      #daily-raid-root .daily-raid-mode-card.is-host,
      #daily-raid-root .daily-raid-mode-card.is-join{
        border:1px solid rgba(135,112,75,.20)!important;
        border-radius:0!important;
        background:linear-gradient(180deg,rgba(255,255,255,.72) 0%,rgba(248,245,239,.54) 100%)!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.72),0 7px 18px rgba(58,51,42,.05)!important;
        backdrop-filter:blur(7px) saturate(.78)!important;
        -webkit-backdrop-filter:blur(7px) saturate(.78)!important;
      }
      #daily-raid-root .daily-raid-mode-card::before,
      #daily-raid-root .daily-raid-mode-card::after,
      #daily-raid-root .daily-raid-mode-card.is-host::before,
      #daily-raid-root .daily-raid-mode-card.is-host::after,
      #daily-raid-root .daily-raid-mode-card.is-join::before,
      #daily-raid-root .daily-raid-mode-card.is-join::after{
        content:none!important;
        display:none!important;
        background:none!important;
        border:0!important;
        box-shadow:none!important;
      }
      #daily-raid-root .daily-raid-mode-card small{
        color:var(--raid-glass-sub)!important;
        -webkit-text-fill-color:var(--raid-glass-sub)!important;
      }
      #daily-raid-root .daily-raid-mode-card strong{
        color:var(--raid-glass-text)!important;
        -webkit-text-fill-color:var(--raid-glass-text)!important;
      }
      #daily-raid-root .daily-raid-mode-card span,
      #daily-raid-root .daily-raid-mode-card b{
        color:var(--raid-glass-sub)!important;
        -webkit-text-fill-color:var(--raid-glass-sub)!important;
      }



      /* build851: 抜本改修 - レイド内の主要ガラスUIを参加一覧の空状態ボックス基準の薄さへ統一 */
      #daily-raid-root{
        --raid-pane-bg:linear-gradient(180deg,rgba(255,255,255,.42) 0%,rgba(248,245,239,.24) 100%);
        --raid-pane-border:rgba(135,112,75,.16);
        --raid-pane-shadow:inset 0 1px 0 rgba(255,255,255,.44),0 2px 8px rgba(58,51,42,.03);
        --raid-pane-blur:blur(2px) saturate(.72);
      }
      #daily-raid-root .daily-raid-mode-card,
      #daily-raid-root .daily-raid-mode-card.is-host,
      #daily-raid-root .daily-raid-mode-card.is-join,
      #daily-raid-root .daily-raid-room-empty,
      #daily-raid-root .daily-raid-room-card,
      #daily-raid-root .daily-raid-swipe-tabs,
      #daily-raid-root .daily-raid-team-meta,
      #daily-raid-root .daily-raid-hpbox,
      #daily-raid-root .daily-raid-members,
      #daily-raid-root .daily-raid-member,
      #daily-raid-root .daily-raid-rule-dialog,
      #daily-raid-root #daily-raid-start,
      #daily-raid-root #daily-raid-finalize-best,
      #daily-raid-root .daily-raid-swipe-tab{
        border:1px solid var(--raid-pane-border)!important;
        border-radius:0!important;
        background:var(--raid-pane-bg)!important;
        box-shadow:var(--raid-pane-shadow)!important;
        backdrop-filter:var(--raid-pane-blur)!important;
        -webkit-backdrop-filter:var(--raid-pane-blur)!important;
      }
      #daily-raid-root .daily-raid-mode-card::before,
      #daily-raid-root .daily-raid-mode-card::after,
      #daily-raid-root .daily-raid-room-card::before,
      #daily-raid-root .daily-raid-room-card::after,
      #daily-raid-root .daily-raid-hpbox::before,
      #daily-raid-root .daily-raid-hpbox::after,
      #daily-raid-root .daily-raid-team-meta::before,
      #daily-raid-root .daily-raid-team-meta::after,
      #daily-raid-root .daily-raid-members::before,
      #daily-raid-root .daily-raid-members::after,
      #daily-raid-root #daily-raid-start::before,
      #daily-raid-root #daily-raid-start::after,
      #daily-raid-root #daily-raid-finalize-best::before,
      #daily-raid-root #daily-raid-finalize-best::after{
        content:none!important;
        display:none!important;
      }
      #daily-raid-root .daily-raid-mode-card,
      #daily-raid-root .daily-raid-room-card,
      #daily-raid-root .daily-raid-room-empty,
      #daily-raid-root .daily-raid-hpbox,
      #daily-raid-root .daily-raid-team-meta,
      #daily-raid-root .daily-raid-members,
      #daily-raid-root .daily-raid-member,
      #daily-raid-root .daily-raid-swipe-tabs,
      #daily-raid-root .daily-raid-swipe-tab,
      #daily-raid-root .daily-raid-rule-dialog,
      #daily-raid-root #daily-raid-start,
      #daily-raid-root #daily-raid-finalize-best{
        color:var(--raid-glass-text)!important;
        -webkit-text-fill-color:var(--raid-glass-text)!important;
        text-shadow:none!important;
      }
      #daily-raid-root .daily-raid-swipe-tab.is-active{
        background:linear-gradient(180deg,rgba(255,255,255,.50) 0%,rgba(248,245,239,.30) 100%)!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.50),0 2px 8px rgba(58,51,42,.035)!important;
      }
      #daily-raid-root .daily-raid-mode-card small,
      #daily-raid-root .daily-raid-room-card small,
      #daily-raid-root .daily-raid-room-empty small,
      #daily-raid-root .daily-raid-swipe-tab small,
      #daily-raid-root .daily-raid-team-meta small,
      #daily-raid-root .daily-raid-hpbox small,
      #daily-raid-root #daily-raid-finalize-best span{
        color:var(--raid-glass-sub)!important;
        -webkit-text-fill-color:var(--raid-glass-sub)!important;
        text-shadow:none!important;
      }
      #daily-raid-root .daily-raid-mode-card strong,
      #daily-raid-root .daily-raid-room-card strong,
      #daily-raid-root .daily-raid-room-empty strong,
      #daily-raid-root .daily-raid-join-head strong,
      #daily-raid-root .daily-raid-hphead strong,
      #daily-raid-root .daily-raid-section-title b,
      #daily-raid-root #daily-raid-start b,
      #daily-raid-root #daily-raid-finalize-best b,
      #daily-raid-root .daily-raid-swipe-tab span,
      #daily-raid-root .daily-raid-hero-copy strong,
      #daily-raid-root .daily-raid-hero-rank b,
      #daily-raid-root #daily-raid-status{
        color:var(--raid-glass-text)!important;
        -webkit-text-fill-color:var(--raid-glass-text)!important;
        text-shadow:none!important;
      }
      #daily-raid-root .daily-raid-mode-card span,
      #daily-raid-root .daily-raid-mode-card b,
      #daily-raid-root .daily-raid-room-card span,
      #daily-raid-root .daily-raid-room-empty span,
      #daily-raid-root .daily-raid-hphead span,
      #daily-raid-root .daily-raid-hpmeta span,
      #daily-raid-root .daily-raid-member-state{
        color:var(--raid-glass-sub)!important;
        -webkit-text-fill-color:var(--raid-glass-sub)!important;
        text-shadow:none!important;
      }
      #daily-raid-root #daily-raid-start{
        width:210px!important;
        max-width:210px!important;
        border-color:rgba(135,112,75,.18)!important;
      }
      #daily-raid-root #daily-raid-start b{
        font-size:17px!important;
        font-weight:700!important;
        letter-spacing:.10em!important;
      }
      #daily-raid-root #daily-raid-finalize-best{
        border-color:rgba(135,112,75,.18)!important;
      }
      #daily-raid-root .daily-raid-hpbox,
      #daily-raid-root .daily-raid-team-meta,
      #daily-raid-root .daily-raid-members{
        box-shadow:var(--raid-pane-shadow)!important;
      }
      #daily-raid-root .daily-raid-hpmeta{
        border-top:1px solid rgba(135,112,75,.12)!important;
      }
      #daily-raid-root .daily-raid-room-empty,
      #daily-raid-root .daily-raid-mode-card,
      #daily-raid-root .daily-raid-room-card,
      #daily-raid-root .daily-raid-hpbox,
      #daily-raid-root .daily-raid-team-meta,
      #daily-raid-root .daily-raid-members,
      #daily-raid-root #daily-raid-start,
      #daily-raid-root #daily-raid-finalize-best{
        filter:none!important;
      }

      /* =========================================================
         build852 FINAL CANONICAL GLASS
         参加レイド0件の中央パネルを唯一の基準にする。
         既存の高詳細度 !important を確実に上書きするため、
         各画面コンテキストまで含めたセレクタで固定。
         ========================================================= */
      #daily-raid-root{
        --raid-canonical-bg:linear-gradient(180deg,rgba(255,255,255,.31) 0%,rgba(250,248,244,.21) 100%);
        --raid-canonical-border:rgba(115,96,70,.13);
        --raid-canonical-shadow:inset 0 1px 0 rgba(255,255,255,.32),0 2px 7px rgba(54,47,38,.025);
        --raid-canonical-blur:blur(0.8px) saturate(.80);
      }

      /* TOP: 募集する / 参加する */
      #daily-raid-root .daily-raid-entry .daily-raid-mode-grid .daily-raid-mode-card,
      #daily-raid-root .daily-raid-entry .daily-raid-mode-grid .daily-raid-mode-card.is-host,
      #daily-raid-root .daily-raid-entry .daily-raid-mode-grid .daily-raid-mode-card.is-join{
        background:var(--raid-canonical-bg)!important;
        border:1px solid var(--raid-canonical-border)!important;
        box-shadow:var(--raid-canonical-shadow)!important;
        backdrop-filter:var(--raid-canonical-blur)!important;
        -webkit-backdrop-filter:var(--raid-canonical-blur)!important;
        filter:none!important;
      }

      /* JOIN: これが基準。空状態/募集カードとも同じ薄さ */
      #daily-raid-root .daily-raid-join-select .daily-raid-room-list .daily-raid-room-empty,
      #daily-raid-root .daily-raid-join-select .daily-raid-room-list .daily-raid-room-card{
        background:var(--raid-canonical-bg)!important;
        border:1px solid var(--raid-canonical-border)!important;
        box-shadow:var(--raid-canonical-shadow)!important;
        backdrop-filter:var(--raid-canonical-blur)!important;
        -webkit-backdrop-filter:var(--raid-canonical-blur)!important;
        filter:none!important;
      }

      /* LOBBY: タブ */
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-shell .daily-raid-swipe-tabs{
        background:var(--raid-canonical-bg)!important;
        border:1px solid var(--raid-canonical-border)!important;
        box-shadow:var(--raid-canonical-shadow)!important;
        backdrop-filter:var(--raid-canonical-blur)!important;
        -webkit-backdrop-filter:var(--raid-canonical-blur)!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-shell .daily-raid-swipe-tabs .daily-raid-swipe-tab,
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-shell .daily-raid-swipe-tabs .daily-raid-swipe-tab.is-active{
        background:transparent!important;
        border:0!important;
        box-shadow:none!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
      }

      /* LOBBY: HP panel — 既存 .daily-raid-enemy-page .daily-raid-hpbox より強くする */
      #daily-raid-root .daily-raid-lobby .daily-raid-enemy-page .daily-raid-hpbox{
        background:var(--raid-canonical-bg)!important;
        border:1px solid var(--raid-canonical-border)!important;
        box-shadow:var(--raid-canonical-shadow)!important;
        backdrop-filter:var(--raid-canonical-blur)!important;
        -webkit-backdrop-filter:var(--raid-canonical-blur)!important;
        filter:none!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-enemy-page .daily-raid-hpbox::before,
      #daily-raid-root .daily-raid-lobby .daily-raid-enemy-page .daily-raid-hpbox::after{
        content:none!important;
        display:none!important;
      }

      /* LOBBY: RAID INFO panels */
      #daily-raid-root .daily-raid-lobby .daily-raid-info-page .daily-raid-team-meta,
      #daily-raid-root .daily-raid-lobby .daily-raid-info-page .daily-raid-members,
      #daily-raid-root .daily-raid-lobby .daily-raid-info-page .daily-raid-member{
        background:var(--raid-canonical-bg)!important;
        border:1px solid var(--raid-canonical-border)!important;
        box-shadow:var(--raid-canonical-shadow)!important;
        backdrop-filter:var(--raid-canonical-blur)!important;
        -webkit-backdrop-filter:var(--raid-canonical-blur)!important;
        filter:none!important;
      }

      /* LOBBY: 下部の白フェード自体を撤去。これがボタン周辺を白くしていた */
      #daily-raid-root .daily-raid-lobby .daily-raid-actions{
        background:transparent!important;
        box-shadow:none!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
      }

      /* LOBBY: 操作ボタン */
      #daily-raid-root .daily-raid-lobby .daily-raid-actions #daily-raid-start,
      #daily-raid-root .daily-raid-lobby .daily-raid-actions #daily-raid-finalize-best{
        background:var(--raid-canonical-bg)!important;
        border:1px solid var(--raid-canonical-border)!important;
        box-shadow:var(--raid-canonical-shadow)!important;
        backdrop-filter:var(--raid-canonical-blur)!important;
        -webkit-backdrop-filter:var(--raid-canonical-blur)!important;
        filter:none!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-actions #daily-raid-start::before,
      #daily-raid-root .daily-raid-lobby .daily-raid-actions #daily-raid-start::after,
      #daily-raid-root .daily-raid-lobby .daily-raid-actions #daily-raid-finalize-best::before,
      #daily-raid-root .daily-raid-lobby .daily-raid-actions #daily-raid-finalize-best::after{
        content:none!important;
        display:none!important;
      }

      /* 全ガラス面の文字は濃いブラウン。白/黄を禁止 */
      #daily-raid-root .daily-raid-entry .daily-raid-mode-card :is(strong,b),
      #daily-raid-root .daily-raid-join-select .daily-raid-room-list :is(strong,b),
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs :is(strong,b,span),
      #daily-raid-root .daily-raid-lobby .daily-raid-hpbox :is(strong,b),
      #daily-raid-root .daily-raid-lobby .daily-raid-info-page :is(strong,b),
      #daily-raid-root .daily-raid-lobby .daily-raid-actions :is(strong,b){
        color:#493524!important;
        -webkit-text-fill-color:#493524!important;
        text-shadow:none!important;
      }
      #daily-raid-root .daily-raid-entry .daily-raid-mode-card :is(span,small),
      #daily-raid-root .daily-raid-join-select .daily-raid-room-list :is(span,small),
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs small,
      #daily-raid-root .daily-raid-lobby .daily-raid-hpbox :is(span,small),
      #daily-raid-root .daily-raid-lobby .daily-raid-info-page :is(span,small),
      #daily-raid-root .daily-raid-lobby .daily-raid-actions span{
        color:#654c37!important;
        -webkit-text-fill-color:#654c37!important;
        text-shadow:none!important;
      }


      /* build853: 単一の共通クラス raid-surface へ統一。
         どのページのパネルでも全く同じ質感になるよう、
         背景・枠線・影・ブラー・文字色をこのクラスだけで管理する。 */
      #daily-raid-root{
        --raid-surface-bg:linear-gradient(180deg, rgba(255,255,255,.25) 0%, rgba(248,245,239,.16) 100%);
        --raid-surface-border:rgba(122,102,76,.12);
        --raid-surface-shadow:inset 0 1px 0 rgba(255,255,255,.22), 0 1px 4px rgba(58,51,42,.02);
        --raid-surface-blur:none;
      }
      #daily-raid-root .raid-surface,
      #daily-raid-root button.raid-surface,
      #daily-raid-root .raid-surface.is-host,
      #daily-raid-root .raid-surface.is-join,
      #daily-raid-root .raid-surface.is-active{
        appearance:none!important;
        -webkit-appearance:none!important;
        background:var(--raid-surface-bg)!important;
        background-color:transparent!important;
        border:1px solid var(--raid-surface-border)!important;
        border-radius:0!important;
        box-shadow:var(--raid-surface-shadow)!important;
        backdrop-filter:var(--raid-surface-blur)!important;
        -webkit-backdrop-filter:var(--raid-surface-blur)!important;
        filter:none!important;
      }
      #daily-raid-root .raid-surface::before,
      #daily-raid-root .raid-surface::after{
        content:none!important;
        display:none!important;
        background:none!important;
        border:0!important;
        box-shadow:none!important;
      }
      #daily-raid-root .raid-surface :is(strong,b),
      #daily-raid-root .raid-surface strong,
      #daily-raid-root .raid-surface b,
      #daily-raid-root .raid-surface .daily-raid-member-copy strong,
      #daily-raid-root .raid-surface .daily-raid-room-card-top strong,
      #daily-raid-root .raid-surface .daily-raid-section-title b{
        color:#493524!important;
        -webkit-text-fill-color:#493524!important;
        text-shadow:none!important;
      }
      #daily-raid-root .raid-surface :is(span,small),
      #daily-raid-root .raid-surface span,
      #daily-raid-root .raid-surface small{
        color:#654c37!important;
        -webkit-text-fill-color:#654c37!important;
        text-shadow:none!important;
      }
      #daily-raid-root .daily-raid-entry .raid-surface,
      #daily-raid-root .daily-raid-join-select .raid-surface,
      #daily-raid-root .daily-raid-lobby .raid-surface{
        opacity:1!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-actions{
        background:transparent!important;
        box-shadow:none!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs.raid-surface .daily-raid-swipe-tab.raid-surface,
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs.raid-surface .daily-raid-swipe-tab.raid-surface.is-active{
        background:transparent!important;
        border:0!important;
        box-shadow:none!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs.raid-surface{
        padding:0!important;
        overflow:hidden!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs.raid-surface .daily-raid-swipe-tab.raid-surface.is-active{
        background:linear-gradient(180deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,.04) 100%)!important;
      }
      #daily-raid-root #daily-raid-start.raid-surface,
      #daily-raid-root #daily-raid-finalize-best.raid-surface{
        min-height:52px!important;
      }


      /* build854: legacy装飾を完全無効化。inline !important とセットで使用 */
      #daily-raid-root [data-raid-canonical-surface="1"]::before,
      #daily-raid-root [data-raid-canonical-surface="1"]::after,
      #daily-raid-root [data-raid-canonical-surface="1"] > small::before,
      #daily-raid-root [data-raid-canonical-surface="1"] > small::after,
      #daily-raid-root .daily-raid-mode-card[data-raid-canonical-surface="1"] small::before,
      #daily-raid-root .daily-raid-mode-card[data-raid-canonical-surface="1"] small::after{
        content:none!important;
        display:none!important;
        background:none!important;
        border:0!important;
        box-shadow:none!important;
        filter:none!important;
        -webkit-filter:none!important;
      }


      /* build855: 「募集を取り消す」だけをレイドUIへ馴染ませる（build856でinline統一の補助として維持） */
      #daily-raid-root #daily-raid-recruit-cancel{
        appearance:none!important;
        -webkit-appearance:none!important;
        border-radius:0!important;
        border:1px solid rgba(151,104,96,.22)!important;
        background:rgba(193,132,124,.12)!important;
        background-color:rgba(193,132,124,.12)!important;
        background-image:none!important;
        box-shadow:none!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
        filter:none!important;
        color:#6a443c!important;
        -webkit-text-fill-color:#6a443c!important;
        text-shadow:none!important;
      }
      #daily-raid-root #daily-raid-recruit-cancel::before,
      #daily-raid-root #daily-raid-recruit-cancel::after{
        content:none!important;
        display:none!important;
      }
      #daily-raid-root #daily-raid-recruit-cancel:active{
        background:rgba(193,132,124,.18)!important;
        transform:none!important;
      }


      /* build857: RAID INFO tabs — タブであることを明確化 */
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs.raid-surface{
        display:grid!important;
        grid-template-columns:1fr 1fr!important;
        align-items:stretch!important;
        overflow:hidden!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs.raid-surface .daily-raid-swipe-tab{
        position:relative!important;
        min-width:0!important;
        opacity:.58!important;
        transform:scale(.91)!important;
        transform-origin:center center!important;
        transition:opacity .18s ease,transform .18s ease,background .18s ease!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs.raid-surface .daily-raid-swipe-tab + .daily-raid-swipe-tab{
        border-left:1px solid rgba(112,94,70,.20)!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs.raid-surface .daily-raid-swipe-tab.is-active{
        opacity:1!important;
        transform:scale(1)!important;
        background:rgba(255,255,255,.13)!important;
        box-shadow:inset 0 -2px 0 rgba(111,79,47,.54)!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs.raid-surface .daily-raid-swipe-tab:not(.is-active) span{
        color:#806f5e!important;
        -webkit-text-fill-color:#806f5e!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs.raid-surface .daily-raid-swipe-tab:not(.is-active) small{
        color:#9a8b7a!important;
        -webkit-text-fill-color:#9a8b7a!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs.raid-surface .daily-raid-swipe-tab.is-active span{
        color:#493524!important;
        -webkit-text-fill-color:#493524!important;
        font-weight:650!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-swipe-tabs.raid-surface .daily-raid-swipe-tab.is-active small{
        color:#654c37!important;
        -webkit-text-fill-color:#654c37!important;
      }

      /* build867: RAID HP BAR — flat / square / restrained */
      #daily-raid-root .daily-raid-lobby .daily-raid-hpbar{
        position:relative!important;
        width:100%!important;
        height:7px!important;
        min-height:7px!important;
        max-height:7px!important;
        padding:0!important;
        overflow:hidden!important;
        border:1px solid rgba(91,72,49,.22)!important;
        border-radius:0!important;
        background:rgba(92,76,56,.10)!important;
        background-image:none!important;
        box-shadow:none!important;
        filter:none!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-hpbar > i{
        position:absolute!important;
        inset:0!important;
        transform-origin:left center!important;
        border:0!important;
        border-radius:0!important;
        background:#a78749!important;
        background-image:none!important;
        box-shadow:none!important;
        filter:none!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-hpbar > span{
        display:none!important;
        content:none!important;
      }
      #daily-raid-root .daily-raid-lobby .daily-raid-hphead small{
        color:#654c37!important;
        -webkit-text-fill-color:#654c37!important;
        font-family:"Noto Serif JP","Yu Mincho","YuMincho",serif!important;
        letter-spacing:.12em!important;
        text-shadow:none!important;
      }
      @media (max-width:380px){
        #daily-raid-root .daily-raid-actions{
          padding-left:10px!important;
          padding-right:10px!important;
          gap:6px!important;
        }
        #daily-raid-root .daily-raid-actions.can-finalize-early #daily-raid-start,
        #daily-raid-root .daily-raid-actions.can-finalize-early #daily-raid-finalize-best{
          max-width:none!important;
        }
        #daily-raid-root #daily-raid-finalize-best span{
          font-size:8px!important;
        }
        #daily-raid-root #daily-raid-finalize-best b{
          font-size:10.5px!important;
          letter-spacing:.015em!important;
        }
        #daily-raid-root #daily-raid-start b{
          font-size:16px!important;
          letter-spacing:.10em!important;
        }
        #daily-raid-root .daily-raid-head{
          padding-left:14px!important;
          padding-right:14px!important;
        }
        #daily-raid-root .daily-raid-attempt-overview{
          margin-left:14px!important;
          margin-right:14px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }


  const RAID_CANONICAL_SURFACE_SELECTOR = [
    '.daily-raid-mode-card',
    '.daily-raid-room-empty',
    '.daily-raid-room-card',
    '.daily-raid-swipe-tabs',
    '.daily-raid-hpbox',
    '.daily-raid-team-meta',
    '.daily-raid-members',
    '.daily-raid-member',
    '.daily-raid-rule-dialog',
    '#daily-raid-start',
    '#daily-raid-finalize-best',
    '#daily-raid-recruit-cancel'
  ].join(',');

  function forceRaidSurfaceStyle(el){
    if(!el || !el.style) return;
    el.setAttribute('data-raid-canonical-surface','1');
    const set=(prop,value)=>el.style.setProperty(prop,value,'important');
    const isCancel = el.id === 'daily-raid-recruit-cancel';

    // build856: 視認性を上げるため、全パネル共通で白膜を強める。
    // 個別差を出さないよう、背景・枠線・影・ブラーは1系統へ寄せる。
    // 取消ボタンのみ、同じ設計のまま色相だけ淡いピンクへ寄せる。
    const bg = isCancel ? 'rgba(223,170,165,.34)' : 'rgba(255,255,255,.44)';
    const border = isCancel ? '1px solid rgba(181,126,118,.30)' : '1px solid rgba(112,94,70,.17)';
    const mainText = isCancel ? '#6a443c' : '#493524';
    const subText = isCancel ? '#7d564d' : '#654c37';

    set('background', bg);
    set('background-color', bg);
    set('background-image', 'none');
    set('border', border);
    set('border-radius', '0');
    set('box-shadow', 'none');
    set('backdrop-filter', 'none');
    set('-webkit-backdrop-filter', 'none');
    set('filter', 'none');
    set('opacity', '1');
    set('mix-blend-mode', 'normal');
    set('background-blend-mode', 'normal');
    set('-webkit-mask-image', 'none');
    set('mask-image', 'none');

    el.querySelectorAll('strong,b').forEach(node=>{
      node.style.setProperty('color', mainText, 'important');
      node.style.setProperty('-webkit-text-fill-color', mainText, 'important');
      node.style.setProperty('text-shadow', 'none', 'important');
    });
    el.querySelectorAll('span,small').forEach(node=>{
      node.style.setProperty('color', subText, 'important');
      node.style.setProperty('-webkit-text-fill-color', subText, 'important');
      node.style.setProperty('text-shadow', 'none', 'important');
    });

    if(isCancel){
      el.style.setProperty('color', mainText, 'important');
      el.style.setProperty('-webkit-text-fill-color', mainText, 'important');
      el.style.setProperty('text-shadow', 'none', 'important');
    }
  }

  function applyRaidCanonicalSurfaces(root){
    if(!root) return;
    root.querySelectorAll(RAID_CANONICAL_SURFACE_SELECTOR).forEach(forceRaidSurfaceStyle);
  }

  function bindRaidSurfaceObserver(root){
    if(!root || root.dataset.raidSurfaceObserverBound==='1') return;
    root.dataset.raidSurfaceObserverBound='1';
    const observer=new MutationObserver(mutations=>{
      let shouldApply=false;
      for(const mutation of mutations){
        if(mutation.type==='childList' && mutation.addedNodes && mutation.addedNodes.length){
          shouldApply=true;
          break;
        }
      }
      if(shouldApply) applyRaidCanonicalSurfaces(root);
    });
    observer.observe(root,{childList:true,subtree:true});
    root.__raidSurfaceObserver=observer;
  }

  function ensureRoot(){
    ensureEarlyFinalizeStyle();
    let root=document.getElementById('daily-raid-root');
    if(root){ applyRaidCanonicalSurfaces(root); bindRaidSurfaceObserver(root); return root; }
    root=document.createElement('div');
    root.id='daily-raid-root';
    root.setAttribute('aria-hidden','true');
    root.innerHTML=`
      <div class="daily-raid-page">
        <header class="daily-raid-head">
          <button type="button" id="daily-raid-back" aria-label="戻る">＜戻る</button>
        </header>

        <div class="daily-raid-attempt-overview" id="daily-raid-attempt-overview" aria-live="polite">
          <span>本日の挑戦回数</span>
          <strong>残り <b id="daily-raid-attempt-remaining">3</b> / 3 回</strong>
          <button type="button" id="daily-raid-rule-open" class="daily-raid-rule-open" aria-haspopup="dialog" aria-controls="daily-raid-rule-modal">RAID RULE</button>
        </div>

        <section class="daily-raid-entry" id="daily-raid-entry">
          <div class="daily-raid-entry-hero">
            <img src="images/raid_enemy_01.webp" alt="SIGMA-IX">
            <div><small>RAID BATTLE</small><strong>SIGMA-IX</strong><span>募集するか、フレンドの募集へ参加してください。</span></div>
          </div>
          <div class="daily-raid-mode-grid">
            <button type="button" class="daily-raid-mode-card is-host raid-surface" id="daily-raid-recruit-btn">
              <small>HOST</small><strong>募集する</strong><span>自分のレイドを作成してフレンドを募集</span><b>募集しながらプレイ可能</b>
            </button>
            <button type="button" class="daily-raid-mode-card is-join raid-surface" id="daily-raid-join-btn">
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
          <div class="daily-raid-swipe-shell">
            <nav class="daily-raid-swipe-tabs raid-surface" aria-label="レイド情報切替">
              <button type="button" class="daily-raid-swipe-tab raid-surface is-active" data-raid-page="0" aria-selected="true">
                <small>01</small><span>ENEMY INFO</span>
              </button>
              <button type="button" class="daily-raid-swipe-tab raid-surface" data-raid-page="1" aria-selected="false">
                <small>02</small><span>RAID INFO</span>
              </button>
            </nav>

            <main class="daily-raid-body daily-raid-swipe-viewport" id="daily-raid-swipe-viewport">
              <div class="daily-raid-swipe-track" id="daily-raid-swipe-track">
                <section class="daily-raid-swipe-page daily-raid-enemy-page" data-raid-page-index="0">
                  <section class="daily-raid-hero">
                    <div class="daily-raid-hero-halo" aria-hidden="true"></div><div class="daily-raid-hero-lines" aria-hidden="true"></div>
                    <div class="daily-raid-hero-rank"><span>RAID ENEMY</span><b>SIGMA-IX</b></div>
                    <img src="images/raid_enemy_01.webp" alt="SIGMA-IX">
                    <div class="daily-raid-hero-copy"><small>RAID ENEMY</small><strong>SIGMA-IX</strong><span>―これより、調査を開始する。</span></div>
                  </section>

                  <section class="daily-raid-hpbox raid-surface">
                    <div class="daily-raid-hphead"><div><small>現在のHP</small></div><strong id="daily-raid-hptext">-- / 100,000</strong></div>
                    <div class="daily-raid-hpbar"><i id="daily-raid-hpfill"></i><span></span></div>
                    <div class="daily-raid-hpmeta"><b id="daily-raid-status">CONNECTING...</b><span>RESET 00:00 JST</span></div>
                  </section>
                </section>

                <section class="daily-raid-swipe-page daily-raid-info-page" data-raid-page-index="1">
                  <section class="daily-raid-team-meta raid-surface">
                    <div><small>RAID TEAM</small><strong id="daily-raid-team-name">--</strong></div>
                    <div class="daily-raid-host-actions" id="daily-raid-host-actions" hidden>
                      <button type="button" id="daily-raid-recruit-cancel" class="daily-raid-recruit-cancel" hidden>募集を取り消す</button>
                    </div>
                  </section>

                  <section class="daily-raid-members raid-surface">
                    <div class="daily-raid-section-title"><div><small>CO-OP UNIT</small><span>RAID MEMBERS</span></div><b id="daily-raid-member-count">0 / 4</b></div>
                    <div id="daily-raid-member-list" class="daily-raid-member-grid"></div>
                  </section>


                </section>
              </div>
            </main>

            <div class="daily-raid-swipe-indicator" aria-hidden="true">
              <i class="is-active"></i><i></i>
            </div>
          </div>

          <footer class="daily-raid-actions">
            <div class="daily-raid-attempt-copy"><small>TODAY'S ATTEMPT</small><b id="daily-raid-attempt-count">0 / 3</b></div>
            <button type="button" id="daily-raid-finalize-best" class="daily-raid-finalize-best raid-surface" hidden>
              <span>現在BEST：--</span><b>残り挑戦をスキップ</b>
            </button>
            <button type="button" id="daily-raid-start" class="raid-surface"><span>RAID BATTLE</span><b>バトル開始</b></button>
          </footer>
        </div>
        <div id="daily-raid-rule-modal" class="daily-raid-rule-modal" hidden aria-hidden="true">
          <div class="daily-raid-rule-backdrop" data-raid-rule-close></div>
          <section class="daily-raid-rule-dialog" role="dialog" aria-modal="true" aria-labelledby="daily-raid-rule-title">
            <button type="button" class="daily-raid-rule-close" data-raid-rule-close aria-label="ルールを閉じる">×</button>
            <div class="daily-raid-rule-heading">
              <small>RAID RULE</small>
              <strong id="daily-raid-rule-title">BATTLE RULE</strong>
            </div>
            <div class="daily-raid-rule-modal-grid">
              <div><b>01</b><span>1人につき1日3回。BESTダメージを採用</span></div>
              <div><b>02</b><span>全滅または180秒経過で終了</span></div>
              <div><b>03</b><span>3回目終了時にBESTを共有HPへ反映</span></div>
            </div>
          </section>
        </div>
      </div>`;
    document.body.appendChild(root);
    applyRaidCanonicalSurfaces(root);
    bindRaidSurfaceObserver(root);

    root.querySelector('#daily-raid-back').addEventListener('click',()=>{
      if(root.dataset.raidView==='join'){ showEntryMode(); return; }
      close();
    });
    root.querySelector('#daily-raid-recruit-btn').addEventListener('click',startRecruiting);
    root.querySelector('#daily-raid-join-btn').addEventListener('click',showJoinList);
    root.querySelector('#daily-raid-start').addEventListener('click',start);
    root.querySelector('#daily-raid-finalize-best').addEventListener('click',skipRemainingAttempts);
    root.querySelector('#daily-raid-recruit-cancel').addEventListener('click',cancelRecruitment);

    const ruleModal=root.querySelector('#daily-raid-rule-modal');
    const ruleOpen=root.querySelector('#daily-raid-rule-open');
    const closeRuleModal=()=>{
      if(!ruleModal) return;
      ruleModal.hidden=true;
      ruleModal.setAttribute('aria-hidden','true');
      ruleModal.classList.remove('is-open');
    };
    const openRuleModal=()=>{
      if(!ruleModal) return;
      ruleModal.hidden=false;
      ruleModal.setAttribute('aria-hidden','false');
      requestAnimationFrame(()=>ruleModal.classList.add('is-open'));
    };
    if(ruleOpen) ruleOpen.addEventListener('click',openRuleModal);
    root.querySelectorAll('[data-raid-rule-close]').forEach(el=>el.addEventListener('click',closeRuleModal));
    root.addEventListener('keydown',e=>{
      if(e.key==='Escape' && ruleModal && !ruleModal.hidden){
        e.preventDefault();
        closeRuleModal();
      }
    });

    bindRaidSwipe(root);
    return root;
  }


  let raidSwipePage=0;

  function setRaidSwipePage(page, immediate){
    const root=document.getElementById('daily-raid-root');
    if(!root) return;
    const track=root.querySelector('#daily-raid-swipe-track');
    const tabs=[...root.querySelectorAll('.daily-raid-swipe-tab')];
    const dots=[...root.querySelectorAll('.daily-raid-swipe-indicator i')];
    page=Math.max(0,Math.min(1,Number(page)||0));
    raidSwipePage=page;
    if(track){
      track.style.transition=immediate?'none':'transform .32s cubic-bezier(.22,.78,.22,1)';
      track.style.transform=`translate3d(${-page*100}%,0,0)`;
      if(immediate){
        requestAnimationFrame(()=>{ track.style.transition='transform .32s cubic-bezier(.22,.78,.22,1)'; });
      }
    }
    tabs.forEach((tab,i)=>{
      const active=i===page;
      tab.classList.toggle('is-active',active);
      tab.setAttribute('aria-selected',active?'true':'false');
    });
    dots.forEach((dot,i)=>dot.classList.toggle('is-active',i===page));
  }

  function bindRaidSwipe(root){
    const viewport=root.querySelector('#daily-raid-swipe-viewport');
    if(!viewport || viewport.dataset.swipeBound==='1') return;
    viewport.dataset.swipeBound='1';

    root.querySelectorAll('.daily-raid-swipe-tab').forEach(tab=>{
      tab.addEventListener('click',()=>setRaidSwipePage(Number(tab.dataset.raidPage)||0,false));
    });

    let pointerId=null;
    let startX=0;
    let startY=0;
    let currentX=0;
    let currentY=0;
    let tracking=false;

    viewport.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse' && e.button!==0) return;
      if(e.target && e.target.closest && e.target.closest('button')) return;
      pointerId=e.pointerId;
      startX=currentX=e.clientX;
      startY=currentY=e.clientY;
      tracking=true;
      try{ viewport.setPointerCapture(pointerId); }catch(_){}
    });

    viewport.addEventListener('pointermove',e=>{
      if(!tracking || e.pointerId!==pointerId) return;
      currentX=e.clientX;
      currentY=e.clientY;
      const dx=currentX-startX;
      const dy=currentY-startY;
      if(Math.abs(dx)>8 && Math.abs(dx)>Math.abs(dy)*1.1 && e.cancelable){
        e.preventDefault();
      }
    });

    function finishSwipe(e){
      if(!tracking || (e && e.pointerId!==pointerId)) return;
      const dx=currentX-startX;
      const dy=currentY-startY;
      tracking=false;
      try{ viewport.releasePointerCapture(pointerId); }catch(_){}
      pointerId=null;
      if(Math.abs(dx)>=44 && Math.abs(dx)>Math.abs(dy)*1.15){
        setRaidSwipePage(raidSwipePage+(dx<0?1:-1),false);
      }else{
        setRaidSwipePage(raidSwipePage,false);
      }
    }

    viewport.addEventListener('pointerup',finishSwipe);
    viewport.addEventListener('pointercancel',finishSwipe);
    viewport.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft'){ e.preventDefault(); setRaidSwipePage(raidSwipePage-1,false); }
      if(e.key==='ArrowRight'){ e.preventDefault(); setRaidSwipePage(raidSwipePage+1,false); }
    });

    setRaidSwipePage(0,true);
  }

  function showOnly(which){
    const root=ensureRoot();
    root.dataset.raidView=String(which||'entry');
    const entry=root.querySelector('#daily-raid-entry');
    const join=root.querySelector('#daily-raid-join-select');
    const lobby=root.querySelector('#daily-raid-lobby');

    const apply=(el,name)=>{
      if(!el) return;
      const active=which===name;
      el.hidden=!active;
      el.setAttribute('aria-hidden',active?'false':'true');

      // Later component CSS uses display:flex!important for the lobby.
      // Inline important guarantees an inactive screen can never remain visible.
      if(active){
        el.style.removeProperty('display');
        el.style.removeProperty('visibility');
        el.style.removeProperty('pointer-events');
      }else{
        el.style.setProperty('display','none','important');
        el.style.setProperty('visibility','hidden','important');
        el.style.setProperty('pointer-events','none','important');
      }
    };

    apply(entry,'entry');
    apply(join,'join');
    apply(lobby,'lobby');
  }

  function updateAttemptOverview(status){
    const root=ensureRoot();
    const box=root.querySelector('#daily-raid-attempt-overview');
    const value=root.querySelector('#daily-raid-attempt-remaining');
    if(!box || !value) return;

    if(isAdmin()){
      value.textContent='∞';
      box.classList.remove('is-empty');
      return;
    }

    const me=status&&status.me||{};
    const used=Math.max(0,Math.min(3,n(me.attempt_count)));
    const remaining=Math.max(0,3-used);
    value.textContent=String(remaining);
    box.classList.toggle('is-empty',remaining<=0);
  }



  function bindRaidChromeNavigation(){
    const nav=document.getElementById('bottom-nav-shared');
    if(!nav || nav.dataset.raidCloseBound==='1') return;
    nav.dataset.raidCloseBound='1';
    nav.addEventListener('click',event=>{
      const item=event.target&&event.target.closest
        ? event.target.closest('.bottom-nav-item')
        : null;
      if(!item) return;
      const root=document.getElementById('daily-raid-root');
      if(root && root.getAttribute('aria-hidden')==='false'){
        close();
      }
    },true);
  }

  function showEntryMode(){ currentStatus=null; updateAttemptOverview(null); setRaidSwipePage(0,true); showOnly('entry'); }

  async function fetchStatus(){
    const userId=uid();
    if(!userId) throw new Error('ユーザーIDがありません');
    currentStatus=normalizeStatus(await rpc('get_my_daily_raid_room',{p_user_id:userId}));
    return currentStatus;
  }

  async function showJoinList(){
    const root=ensureRoot(); showOnly('join');
    const list=root.querySelector('#daily-raid-room-list');
    list.innerHTML='<div class="daily-raid-room-empty raid-surface">募集中のレイドを確認中...</div>'; applyRaidCanonicalSurfaces(root);
    try{
      const rooms=normalizeStatus(await rpc('list_recruiting_friend_raids',{p_user_id:uid()}))||[];
      if(!Array.isArray(rooms)||!rooms.length){
        list.innerHTML='<div class="daily-raid-room-empty raid-surface"><strong>現在募集中のフレンドはいません</strong><span>フレンドが「募集する」を選ぶと、ここに表示されます。</span></div>'; applyRaidCanonicalSurfaces(root);
        return;
      }
      list.innerHTML=rooms.map(room=>{
        const count=Math.max(1,n(room.member_count));
        const hp=n(room.current_hp), max=Math.max(1,n(room.max_hp)||100000);
        const pct=Math.max(0,Math.min(100,Math.round(hp/max*100)));
        return `<button type="button" class="daily-raid-room-card raid-surface" data-room-id="${esc(room.raid_id)}">
          <div class="daily-raid-room-card-top"><span>HOST</span><strong>${esc(room.host_display_name||room.host_user_id||'PLAYER')}</strong><b>${count} / 4</b></div>
          <div class="daily-raid-room-card-hp"><i style="width:${pct}%"></i></div>
          <div class="daily-raid-room-card-bottom"><span>${fmt(hp)} / ${fmt(max)} HP</span><b>このレイドに参加</b></div>
        </button>`;
      }).join('');
      applyRaidCanonicalSurfaces(root);
      list.querySelectorAll('.daily-raid-room-card').forEach(btn=>btn.addEventListener('click',()=>joinRoom(btn.dataset.roomId,btn)));
    }catch(err){
      console.error('[raid] list failed',err);
      list.innerHTML='<div class="daily-raid-room-empty raid-surface"><strong>募集情報を取得できません</strong><span>'+esc(err&&err.message||'通信エラー')+'</span></div>'; applyRaidCanonicalSurfaces(root);
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
    const root=ensureRoot();
    const lobbyWasHidden=!!(root.querySelector('#daily-raid-lobby')&&root.querySelector('#daily-raid-lobby').hidden);
    updateAttemptOverview(status); showOnly('lobby');
    if(lobbyWasHidden) setRaidSwipePage(0,true);
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
    applyRaidCanonicalSurfaces(root);

    const finalizeBtn=root.querySelector('#daily-raid-finalize-best');
    const actions=root.querySelector('.daily-raid-actions');
    const canFinalizeEarly=!admin && !cleared && !inBattle && attemptCount>0 && attemptCount<3;
    if(actions) actions.classList.toggle('can-finalize-early',canFinalizeEarly);
    if(finalizeBtn){
      finalizeBtn.hidden=!canFinalizeEarly;
      finalizeBtn.disabled=!canFinalizeEarly;
      if(canFinalizeEarly){
        finalizeBtn.innerHTML=`<span>現在BEST：${fmt(bestDamage)}</span><b>残り挑戦をスキップ</b>`;
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
    bindRaidChromeNavigation();
    document.body.classList.add('raid-shell-active');
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
    document.body.classList.remove('raid-shell-active');
    const root=document.getElementById('daily-raid-root'); if(!root) return;
    root.classList.remove('show'); root.setAttribute('aria-hidden','true');
    setTimeout(()=>{ if(root.getAttribute('aria-hidden')==='true') root.style.display='none'; },180);
  }

  async function skipRemainingAttempts(){
    const status=currentStatus||await fetchStatus();
    if(!status||!status.raid_id) return;

    const me=status.me||{};
    const attemptCount=Math.max(0,Math.min(3,n(me.attempt_count)));
    const bestDamage=n(me.best_damage);
    const inBattle=!!me.attempt_started_at&&!me.attempt_finished_at;
    const cleared=status.status==='cleared'||n(status.current_hp)<=0;

    if(cleared){ alert('レイドはすでに討伐されています。'); return; }
    if(inBattle){ alert('挑戦中は残り挑戦をスキップできません。'); return; }
    if(attemptCount<=0){ alert('1回以上挑戦してから使用してください。'); return; }
    if(attemptCount>=3){ return; }

    const remaining=Math.max(0,3-attemptCount);
    const ok=confirm(
      `残り${remaining}回の挑戦をスキップします。\n\n`+
      `スキップした挑戦は 0 DAMAGE として処理されます。\n`+
      `3回目終了時の既存処理で、現在のBEST ${fmt(bestDamage)} DAMAGE が共有HPへ反映されます。\n\n`+
      `この操作は取り消せません。\n\nOK？`
    );
    if(!ok) return;

    const btn=document.getElementById('daily-raid-finalize-best');
    const startBtn=document.getElementById('daily-raid-start');
    if(btn) btn.disabled=true;
    if(startBtn) startBtn.disabled=true;

    try{
      let result=status;

      // 新しい「確定RPC」は使わない。
      // 普通の挑戦と同じ既存ルートを、0 DAMAGEで残回数ぶん繰り返す。
      for(let i=attemptCount;i<3;i++){
        const begun=normalizeStatus(await rpc('begin_daily_raid_attempt_v2',{p_user_id:uid()}));
        if(!begun || begun.ok===false){
          throw new Error(begun&&begun.message||'残り挑戦の開始処理に失敗しました');
        }

        result=normalizeStatus(await rpc('submit_daily_raid_damage_v2',{
          p_user_id:uid(),
          p_damage:0
        }));
        if(!result || result.ok===false){
          throw new Error(result&&result.message||'残り挑戦のスキップ処理に失敗しました');
        }

        currentStatus=result;

        if(result.status==='cleared'||n(result.current_hp)<=0) break;
      }

      const latest=await fetchStatus();
      if(latest) result=latest;
      currentStatus=result;

      if(result){
        await hydrateMemberPanels(result);
        render(result);
      }
      refreshFriendHomeNotice();

      if(result&&(result.status==='cleared'||n(result.current_hp)<=0)){
        try{ window.dispatchEvent(new CustomEvent('sasaphia-daily-raid-cleared',{detail:result})); }catch(_){}
        if(typeof window.refreshRaidClearRewardNotice==='function'){
          try{ window.refreshRaidClearRewardNotice(); }catch(_){}
        }
      }
    }catch(err){
      console.error('[raid] skip remaining attempts failed',err);
      alert(err&&err.message?err.message:'残り挑戦をスキップできませんでした。');
      try{
        const latest=await fetchStatus();
        if(latest){ await hydrateMemberPanels(latest); render(latest); }
      }catch(_){}
    }finally{
      if(btn) btn.disabled=false;
      if(startBtn) startBtn.disabled=false;
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
    ensureRaidNoticeDot();
    try{
      const dbReady=window._dbLoadPromise;
      if(dbReady&&typeof dbReady.then==='function') Promise.resolve(dbReady).catch(()=>null).then(()=>refreshFriendHomeNotice());
    }catch(_){ }
    setTimeout(refreshFriendHomeNotice,500); setTimeout(refreshFriendHomeNotice,1800); setTimeout(refreshFriendHomeNotice,5000);
    window.addEventListener('focus',refreshFriendHomeNotice);
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') refreshFriendHomeNotice(); });
    document.addEventListener('click',e=>{ const btn=e.target&&e.target.closest?e.target.closest('.friend-req-accept,.friend-req-decline'):null; if(btn)setTimeout(refreshFriendHomeNotice,450); },true);
    window.addEventListener('sasaphia-daily-raid-cleared',()=>setTimeout(refreshFriendHomeNotice,100));
    setInterval(refreshFriendHomeNotice,60000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setupFriendHomeNotice,{once:true}); else setupFriendHomeNotice();

  window.RaidEvent={fetchStatus,finishAttempt,skipRemainingAttempts,refreshFriendHomeNotice,refreshHomeNotices:refreshFriendHomeNotice,getCurrentStatus:()=>currentStatus,showJoinList,startRecruiting};
  window.openDailyRaid=open;
  window.closeDailyRaid=close;
  window.startDailyRaidBattle=start;
})();
