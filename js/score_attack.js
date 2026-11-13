/* Sasaphia - SCORE ATTACK / すこあた！ */
(function(){
'use strict';
const STAGES={normal:'shooting_score_attack_normal',hard:'shooting_score_attack_hard'};
const PANEL_MAP={"1": "images/chara_01_panel.webp", "2": "images/chara_02_panel.webp", "3": "images/chara_03_panel.webp", "4": "images/chara_04_panel.webp", "5": "images/chara_05_panel.webp", "6": "images/chara_06_panel.webp", "7": "images/chara_07_panel.webp", "8": "images/chara_08_panel.webp", "9": "images/chara_09_panel.webp", "10": "images/chara_10_panel.webp", "11": "images/chara_11_panel.webp", "12": "images/chara_12_panel.webp", "13": "images/chara_13_panel.webp", "14": "images/chara_14_panel.webp", "15": "images/chara_15_panel.webp", "16": "images/chara_16_panel.webp", "17": "images/chara_17_panel.webp", "50": "images/chara_50_panel.webp"};
let currentDifficulty='normal',currentRankingScope='friends',root=null,currentAttemptId=null,currentAttemptPartyIds=[],currentAttemptStartedAt='',rankingRequestSeq=0;
const ATTEMPT_STORAGE_KEY='zeraphia_score_attack_attempt_v1';
const ATTEMPT_MAX_AGE_MS=30*60*1000;
const rankingCache=Object.create(null);
function uid(){return String(localStorage.getItem('zukan_user_id')||'').trim().toLowerCase();}
function normalizePartyIds(partyIds){
 return (Array.isArray(partyIds)?partyIds:[])
  .map(Number)
  .filter((id,index,arr)=>id>0&&arr.indexOf(id)===index)
  .slice(0,3);
}
function difficultyFromStageId(stageId){
 const id=String(stageId||'');
 if(id===STAGES.hard)return'hard';
 if(id===STAGES.normal)return'normal';
 return'';
}
function sameParty(a,b){
 const aa=normalizePartyIds(a),bb=normalizePartyIds(b);
 return aa.length===bb.length&&aa.every((id,i)=>id===bb[i]);
}
function clearPersistedAttempt(){
 try{localStorage.removeItem(ATTEMPT_STORAGE_KEY);}catch(_){}
}
function persistCurrentAttempt(){
 if(!currentAttemptId)return;
 const record={
  attemptId:String(currentAttemptId),
  difficulty:currentDifficulty,
  partyIds:normalizePartyIds(currentAttemptPartyIds),
  startedAt:String(currentAttemptStartedAt||''),
  userId:uid(),
  savedAt:Date.now()
 };
 try{localStorage.setItem(ATTEMPT_STORAGE_KEY,JSON.stringify(record));}catch(_){}
}
function readPersistedAttempt(){
 try{
  const raw=localStorage.getItem(ATTEMPT_STORAGE_KEY);
  if(!raw)return null;
  const record=JSON.parse(raw);
  if(!record||!record.attemptId||!['normal','hard'].includes(String(record.difficulty||''))){clearPersistedAttempt();return null;}
  if(record.userId&&String(record.userId)!==uid()){clearPersistedAttempt();return null;}
  const startedAtMs=Date.parse(String(record.startedAt||''));
  const savedAt=Number(record.savedAt||0);
  const ageBase=Number.isFinite(startedAtMs)?startedAtMs:savedAt;
  if(ageBase&&Date.now()-ageBase>ATTEMPT_MAX_AGE_MS){clearPersistedAttempt();return null;}
  record.partyIds=normalizePartyIds(record.partyIds);
  return record;
 }catch(_){clearPersistedAttempt();return null;}
}
function restoreAttemptRecord(record,stageId,partyIds){
 if(!record||!record.attemptId)return false;
 const stageDifficulty=difficultyFromStageId(stageId);
 const recordDifficulty=String(record.difficulty||stageDifficulty||'');
 if(stageDifficulty&&recordDifficulty!==stageDifficulty)return false;
 const resultParty=normalizePartyIds(partyIds);
 const recordParty=normalizePartyIds(record.partyIds);
 if(recordParty.length&&resultParty.length&&!sameParty(recordParty,resultParty))return false;
 currentDifficulty=recordDifficulty||currentDifficulty;
 currentAttemptId=String(record.attemptId);
 currentAttemptPartyIds=recordParty.length?recordParty:resultParty;
 currentAttemptStartedAt=String(record.startedAt||'');
 persistCurrentAttempt();
 console.log('[ScoreAttack] attempt restored:',currentAttemptId,'party=',currentAttemptPartyIds);
 return true;
}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function playerName7(v){
 const s=String(v==null?'':v).trim()||'Player';
 return Array.from(s).slice(0,7).join('');
}
function panelSrc(id){
 id=Number(id||0);
 if(!id)return '';
 try{
  const m=window.ShootingCharacters&&window.ShootingCharacters.SHOOTING_CHARACTER_MASTER;
  if(m&&m[id]&&m[id].panelImage)return m[id].panelImage;
 }catch(_){}
 // build530: score attack may render before ShootingCharacters is ready.
 // Party IDs are character IDs, so derive the canonical panel path directly.
 return PANEL_MAP[id]||('images/chara_'+String(id).padStart(2,'0')+'_panel.webp');
}
function partyHtml(ids,large){const a=Array.isArray(ids)?ids.slice(0,3):[];while(a.length<3)a.push(0);return '<div class="score-attack-party'+(large?' is-large':'')+'">'+a.map(id=>{const src=panelSrc(id);return src?'<span><img src="'+esc(src)+'" alt="" draggable="false"></span>':'<span class="empty"></span>';}).join('')+'</div>';}
function ensureRoot(){
 if(root && root.isConnected && root.dataset.scoreAttackUi==='1447')return root;
 // build694: if an older SCORE ATTACK DOM survived an asset update/BFCache restore,
 // discard it before rendering the current markup. This prevents old FRIEND/全国
 // controls from mixing with the new navigation CSS.
 const stale=document.getElementById('score-attack-root');
 if(stale)stale.remove();
 root=document.createElement('div');
 root.id='score-attack-root';
 root.className='app-page app-page--overlay score-attack-app-page';
 root.dataset.scoreAttackUi='1447';
 root.setAttribute('aria-hidden','true');
 root.innerHTML=`<div class="score-attack-page app-page-surface">
 <div class="score-attack-bg-deco score-attack-bg-deco-a" aria-hidden="true"></div>
 <div class="score-attack-bg-deco score-attack-bg-deco-b" aria-hidden="true"></div>

 <header class="app-page-header score-attack-head">
   <button type="button" class="app-page-back" onclick="closeScoreAttack()">＜戻る</button>
   <div class="app-page-heading">
     <small class="app-page-eyebrow">SCORE ATTACK</small>
     <h1 class="app-page-title">スコアアタック</h1>
   </div>
   <div class="score-attack-head-rule" aria-hidden="true"></div>
   <div class="app-page-action score-attack-head-mark" aria-hidden="true"></div>
 </header>

 <div class="app-page-content score-attack-scroll">

  <section class="score-attack-ranking score-attack-ranking-first" data-ranking-scope="friends">
    <div class="score-attack-ranking-nav" aria-label="ランキング切替">
      <button id="score-attack-swipe-prev" type="button" class="score-attack-swipe-cue is-prev" aria-label="フレンドランキングへ" onclick="setScoreAttackRankingScope('friends')">‹</button>
      <strong id="score-attack-ranking-title">フレンドランキング</strong>
      <i class="score-attack-ranking-rule" aria-hidden="true"></i>
      <button id="score-attack-swipe-next" type="button" class="score-attack-swipe-cue is-next" aria-label="全国ランキングへ" onclick="setScoreAttackRankingScope('national')">›</button>
    </div>
    <div id="score-attack-list" class="score-attack-list"><div class="score-attack-loading">読み込み中...</div></div>
  </section>

  <section class="score-attack-mode-card">
    <div class="score-attack-mode-head">
      <div>
        <small>DIFFICULTY</small>
        <strong>難易度を選択</strong>
      </div>
      <i class="score-attack-mode-rule" aria-hidden="true"></i>
    </div>
    <div class="score-attack-tabs">
      <button id="score-attack-tab-normal" class="active" onclick="setScoreAttackDifficulty('normal')">
        <i class="score-attack-tab-spark" aria-hidden="true"></i><small>NORMAL</small><i class="score-attack-tab-spark" aria-hidden="true"></i>
      </button>
      <button id="score-attack-tab-hard" onclick="setScoreAttackDifficulty('hard')">
        <i class="score-attack-tab-spark" aria-hidden="true"></i><small>HARD</small><i class="score-attack-tab-spark" aria-hidden="true"></i>
      </button>
    </div>
  </section>

  <section class="score-attack-me score-attack-start-only">
    <button type="button" class="score-attack-start" onclick="startScoreAttack()">
      <span><i class="score-attack-start-spark" aria-hidden="true"></i>挑戦する<i class="score-attack-start-spark" aria-hidden="true"></i></span>
    </button>
  </section>

 </div></div>`;
 document.body.appendChild(root);
 installRankingSwipe(root);
 updateRankingScopeUi();
 return root;
}
function rankingKey(scope){return currentDifficulty+':'+scope;}
async function fetchRanking(scope){
 const sb=window.zsSupabase,userId=uid();
 if(!sb||typeof sb.rpc!=='function'||!userId)return[];
 const isNational=scope==='national';
 const rpcName=isNational?'get_score_attack_national_ranking':'get_score_attack_friend_ranking';
 const args=isNational
   ? {p_difficulty:currentDifficulty}
   : {p_user_id:userId,p_difficulty:currentDifficulty};
 const res=await sb.rpc(rpcName,args);
 if(res&&res.error)throw res.error;
 const rows=Array.isArray(res&&res.data)?res.data:[];
 // Rankings and snapshot access use identical eligibility rules on the server.
 try{
   const details=await sb.rpc('get_score_attack_party_details',{p_user_id:userId,p_difficulty:currentDifficulty,p_scope:scope});
   if(!details.error && details.data){
     rows.forEach(row=>{const entry=details.data[row.user_id];if(Array.isArray(entry))row.party_details=entry;});
   }
 }catch(err){console.warn('[ScoreAttack] party details unavailable',err);}
 return rows;
}
function updateRankingScopeUi(){
 const r=ensureRoot();
 const national=currentRankingScope==='national';
 const section=r.querySelector('.score-attack-ranking');
 const title=r.querySelector('#score-attack-ranking-title');
 const prevCue=r.querySelector('#score-attack-swipe-prev');
 const nextCue=r.querySelector('#score-attack-swipe-next');
 if(section)section.setAttribute('data-ranking-scope',national?'national':'friends');
 if(title)title.textContent=national?'全国ランキング':'フレンドランキング';
 if(prevCue){prevCue.disabled=!national;prevCue.setAttribute('aria-disabled',!national?'true':'false');}
 if(nextCue){nextCue.disabled=national;nextCue.setAttribute('aria-disabled',national?'true':'false');}
}
function animateRankingSwap(direction){
 const list=ensureRoot().querySelector('#score-attack-list');
 if(!list)return;
 list.classList.remove('swipe-from-left','swipe-from-right');
 void list.offsetWidth;
 list.classList.add(direction==='right'?'swipe-from-left':'swipe-from-right');
 setTimeout(()=>list.classList.remove('swipe-from-left','swipe-from-right'),280);
}
function installRankingSwipe(r){
 const section=r.querySelector('.score-attack-ranking');
 if(!section||section.dataset.swipeReady==='1')return;
 section.dataset.swipeReady='1';
 let sx=0,sy=0;
 section.addEventListener('touchstart',ev=>{
   const t=ev.touches&&ev.touches[0];
   if(!t)return;
   sx=t.clientX;sy=t.clientY;
 },{passive:true});
 section.addEventListener('touchend',ev=>{
   const t=ev.changedTouches&&ev.changedTouches[0];
   if(!t)return;
   const dx=t.clientX-sx,dy=t.clientY-sy;
   if(Math.abs(dx)<46||Math.abs(dx)<=Math.abs(dy)*1.15)return;
   if(dx<0&&currentRankingScope==='friends')window.setScoreAttackRankingScope('national');
   else if(dx>0&&currentRankingScope==='national')window.setScoreAttackRankingScope('friends');
 },{passive:true});
}
function openRankingCharacter(row,idx){
 const id=Number((row.party_ids||[])[idx]||0);if(!id)return;
 const details=Array.isArray(row.party_details)?row.party_details:[];
 const d=details[idx]&&Number(details[idx].id)===id?details[idx]:details.find(v=>v&&Number(v.id)===id);
 const master=(window.ShootingCharacters&&window.ShootingCharacters.SHOOTING_CHARACTER_MASTER)||{};
 const char=master[id]||{};
 const name=char.name||char.displayName||('CHARACTER '+String(id).padStart(2,'0'));
 const level=d&&Number.isFinite(Number(d.level))&&d.level!==null?'Lv.'+Number(d.level):'Lv. 記録なし';
 const lb=d&&Number.isFinite(Number(d.limitBreak))&&d.limitBreak!==null?'凸'+Number(d.limitBreak):'限界突破 記録なし';
 document.getElementById('score-attack-character-overlay')?.remove();
 const overlay=document.createElement('div');overlay.id='score-attack-character-overlay';
 overlay.className='score-attack-character-overlay';
 overlay.innerHTML='<div class="score-attack-character-shade"></div><section class="score-attack-character-sheet" role="dialog" aria-modal="true" aria-label="キャラクター詳細">'+
 '<button type="button" class="score-attack-character-close" aria-label="閉じる">×</button>'+
 '<div class="score-attack-character-kicker">BEST RECORD / PARTY</div>'+
 '<div class="score-attack-character-picture"><img src="'+esc(panelSrc(id))+'" alt=""></div>'+
 '<div class="score-attack-character-name">'+esc(name)+'</div>'+
 '<div class="score-attack-character-values"><span>'+esc(level)+'</span><i></i><span>'+esc(lb)+'</span></div>'+
 '<div class="score-attack-character-score">BEST SCORE <b>'+Number(row.best_score||0).toLocaleString('ja-JP')+'</b></div>'+
 '<div class="score-attack-character-note">スコア記録時の育成情報</div></section>';
 const close=()=>overlay.remove();
 overlay.querySelector('.score-attack-character-shade').addEventListener('click',close);
 overlay.querySelector('.score-attack-character-close').addEventListener('click',close);
 document.body.appendChild(overlay);
 overlay.querySelector('.score-attack-character-close').focus();
}
function renderRows(rows,scope){
 const r=ensureRoot(),myId=uid(),list=r.querySelector('#score-attack-list');
 const isNational=scope==='national';

 if(!rows.length){
   list.innerHTML='<div class="score-attack-empty">'+(isNational?'全国ランキングに記録がありません':'まだ記録がありません')+'</div>';
   return;
 }

 const TOP_COUNT=isNational?20:5;
 const html=rows.map((row,i)=>{
   const me=String(row.user_id||'').toLowerCase()===myId;
   const rank=Number(row.rank_no||i+1);
   const extra=(!isNational&&i>=TOP_COUNT)?' score-attack-row-extra':'';
   const rankCls=rank===1?' rank-1':rank===2?' rank-2':rank===3?' rank-3':'';
   return '<div class="score-attack-row'+(me?' is-me':'')+extra+rankCls+'">'+
     '<span class="score-attack-rank-no'+rankCls+'"><i class="score-attack-crown" aria-hidden="true"></i><span>'+rank+'</span></span>'+
     '<div class="score-attack-row-main">'+
       '<b title="'+esc(row.display_name||row.user_id||'Player')+'"><span class="score-attack-player-name">'+esc(playerName7(row.display_name||row.user_id||'Player'))+'</span>'+(me?'<em>自分</em>':'')+'</b>'+
       // build1712: 装備中の称号
       (row.title_id?'<span class="zt-block-title" data-title-id="'+esc(row.title_id)+'" data-title-level="'+esc(row.title_level||1)+'"></span>':(row.user_id?'<span class="zt-block-title" data-title-user="'+esc(row.user_id)+'"></span>':''))+
       partyHtml(row.party_ids,false).replace('<div class="score-attack-party"','<div class="score-attack-party" data-score-party="'+i+'"')+
       (Array.isArray(row.party_details)&&row.party_details.length?'<div class="score-attack-party-levels">'+row.party_details.map(d=> d&&d.level!=null&&d.limitBreak!=null?'<span>Lv.'+Number(d.level)+' <em>凸'+Number(d.limitBreak)+'</em></span>':'<span>—</span>').join('')+'</div>':'')+
     '</div>'+
     '<div class="score-attack-score"><small class="score-attack-best-label">'+(me?'自己ベスト':'ベスト')+'</small><strong>'+Number(row.best_score||0).toLocaleString('ja-JP')+'</strong></div>'+
   '</div>';
 }).join('');

 const moreCount=isNational?0:Math.max(0,rows.length-TOP_COUNT);
 const toggleHtml=moreCount>0
   ? '<button type="button" class="score-attack-more" onclick="toggleScoreAttackRankingMore(this)" aria-expanded="false">'+
       '<span>6位以下を表示</span><small>+'+moreCount+'</small>'+
     '</button>'
   : '';

 list.innerHTML=html+toggleHtml;
 list.querySelectorAll('[data-score-party]').forEach(el=>{
   const i=Number(el.getAttribute('data-score-party'));
   const row=rows[i];if(!row)return;
   el.querySelectorAll('span').forEach((slot,idx)=>{
     const id=Number((row.party_ids||[])[idx]||0);if(!id)return;
     slot.classList.add('score-attack-party-clickable');
     slot.setAttribute('role','button');slot.setAttribute('tabindex','0');
     slot.setAttribute('aria-label','キャラクター詳細を表示');
     const open=ev=>{ev.stopPropagation();openRankingCharacter(row,idx);};
     slot.addEventListener('click',open);
     slot.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();open(ev);}});
   });
 });
 try{ if(window.ZeraphiaTitles) void window.ZeraphiaTitles.decorate(list); }catch(_){}
}
async function prefetchRanking(scope){
 const key=rankingKey(scope);
 if(rankingCache[key])return;
 try{rankingCache[key]=await fetchRanking(scope);}catch(err){console.warn('[ScoreAttack] ranking prefetch failed',scope,err);}
}
async function refresh(options){
 const opts=options||{};
 const r=ensureRoot(),scope=currentRankingScope,key=rankingKey(scope),list=r.querySelector('#score-attack-list');
 updateRankingScopeUi();
 if(list)list.scrollTop=0;
 if(!opts.force&&rankingCache[key])renderRows(rankingCache[key],scope);
 else if(list)list.innerHTML='<div class="score-attack-loading">読み込み中...</div>';
 const seq=++rankingRequestSeq;
 try{
   const rows=await fetchRanking(scope);
   rankingCache[key]=rows;
   if(seq!==rankingRequestSeq||scope!==currentRankingScope)return;
   renderRows(rows,scope);
 }catch(err){
   console.error('[ScoreAttack] ranking failed',err);
   if(seq!==rankingRequestSeq||scope!==currentRankingScope)return;
   list.innerHTML='<div class="score-attack-empty">ランキングを取得できません。<br>もう一度お試しください。</div>';
 }
}
window.openScoreAttack=function(){
  if (typeof window.requireChapter03ContentUnlock === 'function' && !window.requireChapter03ContentUnlock()) return false;
  const r=ensureRoot();
  r.classList.add('show');
  r.setAttribute('aria-hidden','false');

  // UI Foundation v2: Score Attack is a Standard Page.
  // Chrome visibility is controlled by the shared application policy only.
  if(window.setGameChromeImmersive) window.setGameChromeImmersive(false,'score-attack');
  if(window.setNavVisible) window.setNavVisible(true);
  if(window.setBnavActive) window.setBnavActive('main');
  if(typeof window.updateHeaderHeight==='function') window.updateHeaderHeight();
  updateRankingScopeUi();
  refresh();
  void prefetchRanking(currentRankingScope==='friends'?'national':'friends');
};
window.closeScoreAttack=function(){
  const r=ensureRoot();
  r.classList.remove('show');
  r.setAttribute('aria-hidden','true');
  if(window.setNavVisible) window.setNavVisible(true);
};
window.setScoreAttackDifficulty=function(d){
 currentDifficulty=d==='hard'?'hard':'normal';
 const r=ensureRoot();
 r.querySelector('#score-attack-tab-normal').classList.toggle('active',currentDifficulty==='normal');
 r.querySelector('#score-attack-tab-hard').classList.toggle('active',currentDifficulty==='hard');
 refresh({force:true});
 void prefetchRanking(currentRankingScope==='friends'?'national':'friends');
};
window.setScoreAttackRankingScope=function(scope){
 const next=scope==='national'?'national':'friends';
 if(next===currentRankingScope)return;
 const direction=next==='national'?'left':'right';
 currentRankingScope=next;
 updateRankingScopeUi();
 animateRankingSwap(direction);
 refresh();
};
window.toggleScoreAttackRankingMore=function(btn){
 const r=ensureRoot();
 const list=r.querySelector('#score-attack-list');
 if(!list||!btn)return;
 const open=list.classList.toggle('show-all');
 btn.setAttribute('aria-expanded',open?'true':'false');
 const span=btn.querySelector('span');
 if(span)span.textContent=open?'6位以下を閉じる':'6位以下を表示';
};
window.startScoreAttack=async function(){
  const stageId=STAGES[currentDifficulty];
  const sb=window.zsSupabase;
  if(!sb||typeof sb.rpc!=='function'){
    alert('通信準備ができていません。もう一度お試しください。');
    return;
  }

  // build532:
  // この時点ではまだパーティ未選択。
  // attemptは戦闘開始ボタン押下時に実編成で作成する。
  currentAttemptId=null;
  currentAttemptPartyIds=[];
  currentAttemptStartedAt='';
  clearPersistedAttempt();
  closeScoreAttack();
  if(typeof window.openShootingEvent==='function'){
    window.openShootingEvent({stageId});
  }
};
window.ScoreAttack={
  async beginAttemptForParty(partyIds){
    const sb=window.zsSupabase;
    const ids=normalizePartyIds(partyIds);

    if(!sb||typeof sb.rpc!=='function'){
      alert('通信準備ができていません。もう一度お試しください。');
      return false;
    }
    if(!ids.length){
      alert('出撃キャラクターを選択してください。');
      return false;
    }

    try{
      const res=await sb.rpc('begin_score_attack_attempt',{
        p_difficulty:currentDifficulty,
        p_party_ids:ids
      });
      if(res&&res.error)throw res.error;

      const data=res&&res.data;
      const attemptId=data&&data.attempt_id;
      if(!attemptId)throw new Error('attempt_id was not returned');

      currentAttemptId=String(attemptId);
      currentAttemptPartyIds=ids.slice();
      currentAttemptStartedAt=String(data&&data.started_at||'');
      persistCurrentAttempt();
      console.log('[ScoreAttack] attempt started:',currentAttemptId,'party=',ids);
      return true;
    }catch(err){
      console.error('[ScoreAttack] begin attempt failed',err);
      alert('スコアアタックを開始できませんでした。通信状況を確認してもう一度お試しください。');
      return false;
    }
  },

  async submitResult(detail){
    if(!detail||!String(detail.stageId||'').startsWith('shooting_score_attack_'))return;

    const sb=window.zsSupabase;
    if(!sb||typeof sb.rpc!=='function'){
      console.error('[ScoreAttack] finish blocked: Supabase is not ready');
      return;
    }

    const resultPartyIds=normalizePartyIds(detail.partyIds||[]);

    // クラッシュ復帰ではJSメモリ上のattempt_idが消える。
    // 終了時に新attemptを作ると「開始直後のfinish」になりサーバーに拒否されるため、
    // 戦闘開始時に保存した元attemptだけを復元して使う。
    if(!currentAttemptId){
      const persisted=readPersistedAttempt();
      if(!restoreAttemptRecord(persisted,detail.stageId,resultPartyIds)){
        console.error('[ScoreAttack] finish blocked: original attempt_id is missing');
        if(typeof window.showToast==='function')window.showToast('スコアアタックの挑戦情報を復元できませんでした');
        return;
      }
    }

    const attemptId=currentAttemptId;
    try{

      const res=await sb.rpc('finish_score_attack_attempt_v2',{
        p_attempt_id:attemptId,
        p_score:Math.min(99999999,Math.max(0,Math.floor(Number(detail.score||0)))),
        p_party_ids:resultPartyIds
      });
      if(res&&res.error)throw res.error;

      console.log('[ScoreAttack] attempt finished:',attemptId,'party=',resultPartyIds,res&&res.data);
      currentAttemptId=null;
      currentAttemptPartyIds=[];
      currentAttemptStartedAt='';
      clearPersistedAttempt();
      Object.keys(rankingCache).forEach(key=>delete rankingCache[key]);
      if(root&&root.isConnected&&root.classList.contains('show'))void refresh({force:true});
    }catch(err){
      console.error('[ScoreAttack] finish attempt failed',err);
      const message=String(err&&err.message||'');
      if(/attempt (?:expired|already used)|invalid attempt/i.test(message)){
        currentAttemptId=null;
        currentAttemptPartyIds=[];
        currentAttemptStartedAt='';
        clearPersistedAttempt();
      }
    }
  },
  getResumeAttempt(){
    const live=currentAttemptId?{
      attemptId:String(currentAttemptId),
      difficulty:currentDifficulty,
      partyIds:normalizePartyIds(currentAttemptPartyIds),
      startedAt:String(currentAttemptStartedAt||''),
      userId:uid(),
      savedAt:Date.now()
    }:readPersistedAttempt();
    return live?{...live,partyIds:normalizePartyIds(live.partyIds)}:null;
  },
  restoreAttemptFromResume(record,stageId,partyIds){
    return restoreAttemptRecord(record,stageId,partyIds)
      || restoreAttemptRecord(readPersistedAttempt(),stageId,partyIds);
  },
  clearAttempt(){
    currentAttemptId=null;
    currentAttemptPartyIds=[];
    currentAttemptStartedAt='';
    clearPersistedAttempt();
  },
  refresh
};
window.addEventListener('shooting-stage-result',ev=>{const d=ev&&ev.detail;if(d&&String(d.stageId||'').startsWith('shooting_score_attack_'))void window.ScoreAttack.submitResult(d);});
})();

/* build1926 - compact score party level labels */
(function(){var st=document.createElement('style');st.textContent='.score-attack-party-levels{display:grid;grid-template-columns:repeat(3,32px);gap:4px;margin-top:3px;color:#776b5c;font:500 9px/1.2 Cinzel,serif}.score-attack-party-levels span{text-align:center;white-space:nowrap}.score-attack-party-levels em{font-style:normal;color:#a78958}';document.head.appendChild(st);})();

/* build1927 - score ranking party inspection */
(function(){let st=document.createElement('style');st.textContent=`
.score-attack-party-clickable{cursor:pointer;touch-action:manipulation;transition:filter .15s ease,transform .15s ease}
.score-attack-party-clickable:active{transform:scale(.94)}.score-attack-party-clickable:focus-visible{outline:2px solid #a88951;outline-offset:2px}
.score-attack-character-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:22px;box-sizing:border-box}
.score-attack-character-shade{position:absolute;inset:0;background:rgba(13,15,32,.70);backdrop-filter:blur(5px)}
.score-attack-character-sheet{position:relative;width:min(100%,330px);padding:29px 22px 24px;background:linear-gradient(165deg,#fffefb,#f6f2e9);border:1px solid #bfa675;color:#28263d;box-shadow:0 18px 52px rgba(0,0,0,.25);text-align:center;font-family:'Noto Serif JP',serif;box-sizing:border-box}
.score-attack-character-close{position:absolute;right:12px;top:8px;border:0;background:none;font-size:26px;color:#55516a;cursor:pointer;padding:4px 10px}
.score-attack-character-kicker{font:10px Cinzel,serif;letter-spacing:.22em;color:#918267}
.score-attack-character-picture{margin:20px auto 12px;width:132px;height:132px;border:1px solid #d8c6a3;background:#eee9e4}
.score-attack-character-picture img{width:100%;height:100%;object-fit:cover}
.score-attack-character-name{font-size:19px;font-weight:700;letter-spacing:.07em}
.score-attack-character-values{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:13px;font-size:13px}
.score-attack-character-values i{height:14px;width:1px;background:#d0c3a9}
.score-attack-character-score{margin-top:21px;border-top:1px solid #dfd3bd;padding-top:14px;font:10px Cinzel,serif;letter-spacing:.1em;color:#8a7c62}
.score-attack-character-score b{display:block;font-size:24px;color:#24243e;letter-spacing:.02em;margin-top:4px}
.score-attack-character-note{margin-top:9px;font-size:10px;color:#8d8578}
`;document.head.appendChild(st);})();
