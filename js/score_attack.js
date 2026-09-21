/* Sasaphia - SCORE ATTACK / すこあた！ */
(function(){
'use strict';
const STAGES={normal:'shooting_score_attack_normal',hard:'shooting_score_attack_hard'};
const PANEL_MAP={"1": "images/chara_01_panel.webp", "2": "images/chara_02_panel.webp", "3": "images/chara_03_panel.webp", "4": "images/chara_04_panel.webp", "5": "images/chara_05_panel.webp", "6": "images/chara_06_panel.webp", "7": "images/chara_07_panel.webp", "8": "images/chara_08_panel.webp", "9": "images/chara_09_panel.webp", "10": "images/chara_10_panel.webp", "11": "images/chara_11_panel.webp", "12": "images/chara_12_panel.webp", "13": "images/chara_13_panel.webp", "14": "images/chara_14_panel.webp", "15": "images/chara_15_panel.webp", "16": "images/chara_16_panel.webp", "17": "images/chara_17_panel.webp", "50": "images/chara_50_panel.webp"};
let currentDifficulty='normal',root=null,loading=false,currentAttemptId=null;
function uid(){return String(localStorage.getItem('zukan_user_id')||'').trim().toLowerCase();}
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
 if(root)return root;
 root=document.createElement('div');root.id='score-attack-root';root.setAttribute('aria-hidden','true');
 root.innerHTML=`<div class="score-attack-page">
 <div class="score-attack-bg-deco score-attack-bg-deco-a" aria-hidden="true"></div>
 <div class="score-attack-bg-deco score-attack-bg-deco-b" aria-hidden="true"></div>

 <header class="score-attack-head">
   <button type="button" class="score-attack-back" aria-label="戻る" onclick="closeScoreAttack()">＜戻る</button>
   <div class="score-attack-head-title">
     <small>SCORE ATTACK</small>
     <strong>スコアアタック</strong>
   </div>
   <div class="score-attack-head-mark" aria-hidden="true">✦</div>
 </header>

 <div class="score-attack-scroll">

  <section class="score-attack-ranking score-attack-ranking-first">
    <div class="score-attack-section-head">
      <div>
        <span>RANKING</span>
        <strong>フレンドランキング</strong>
      </div>
      <small>BEST SCORE</small>
    </div>
    <div id="score-attack-list" class="score-attack-list"><div class="score-attack-loading">読み込み中...</div></div>
  </section>

  <section class="score-attack-mode-card">
    <div class="score-attack-mode-head">
      <div>
        <small>DIFFICULTY</small>
        <strong>難易度を選択</strong>
      </div>
      <span>難易度別ランキング</span>
    </div>
    <div class="score-attack-tabs">
      <button id="score-attack-tab-normal" class="active" onclick="setScoreAttackDifficulty('normal')">
        <small>NORMAL</small>
      </button>
      <button id="score-attack-tab-hard" onclick="setScoreAttackDifficulty('hard')">
        <small>HARD</small>
      </button>
    </div>
  </section>

  <section class="score-attack-me score-attack-start-only">
    <button type="button" class="score-attack-start" onclick="startScoreAttack()">
      <span>挑戦する</span>
    </button>
  </section>

 </div></div>`;
 document.body.appendChild(root);return root;
}
async function fetchRanking(){const sb=window.zsSupabase,userId=uid();if(!sb||typeof sb.rpc!=='function'||!userId)return[];const res=await sb.rpc('get_score_attack_friend_ranking',{p_user_id:userId,p_difficulty:currentDifficulty});if(res&&res.error)throw res.error;return Array.isArray(res&&res.data)?res.data:[];}
function renderRows(rows){
 const r=ensureRoot(),myId=uid(),list=r.querySelector('#score-attack-list');

 if(!rows.length){
   list.innerHTML='<div class="score-attack-empty">まだ記録がありません</div>';
   return;
 }

 const TOP_COUNT=5;
 const rowHtml=rows.map((row,i)=>{
   const me=String(row.user_id||'').toLowerCase()===myId;
   const rank=Number(row.rank_no||i+1);
   const extra=i>=TOP_COUNT?' score-attack-row-extra':'';
   return '<div class="score-attack-row'+(me?' is-me':'')+extra+'">'+
     '<span class="score-attack-rank-no">'+rank+'</span>'+
     '<div class="score-attack-row-main">'+
       '<b title="'+esc(row.display_name||row.user_id||'Player')+'"><span class="score-attack-player-name">'+esc(playerName7(row.display_name||row.user_id||'Player'))+'</span>'+(me?'<em>自分</em>':'')+'</b>'+
       partyHtml(row.party_ids,false)+
     '</div>'+
     '<strong>'+Number(row.best_score||0).toLocaleString('ja-JP')+'</strong>'+
   '</div>';
 }).join('');

 const moreCount=Math.max(0,rows.length-TOP_COUNT);
 const toggleHtml=moreCount>0
   ? '<button type="button" class="score-attack-more" onclick="toggleScoreAttackRankingMore(this)" aria-expanded="false">'+
       '<span>6位以下を表示</span><small>+'+moreCount+'</small>'+
     '</button>'
   : '';

 list.innerHTML=rowHtml+toggleHtml;
}
async function refresh(){if(loading)return;loading=true;const r=ensureRoot();r.querySelector('#score-attack-list').innerHTML='<div class="score-attack-loading">読み込み中...</div>';try{renderRows(await fetchRanking());}catch(err){console.error('[ScoreAttack] ranking failed',err);renderRows([]);r.querySelector('#score-attack-list').innerHTML='<div class="score-attack-empty">ランキングを取得できません。<br>Supabase SQLを確認してください。</div>';}finally{loading=false;}}
window.openScoreAttack=function(){
  const r=ensureRoot();
  r.classList.add('show');
  r.setAttribute('aria-hidden','false');

  // Score Attack is now a normal app page, not an immersive/fullscreen layer.
  document.body.classList.remove('ui-immersive');
  document.body.removeAttribute('data-ui-immersive-reason');

  const hud=document.getElementById('global-user-frame');
  if(hud){
    hud.classList.remove('hidden');
    hud.style.removeProperty('display');
    hud.style.removeProperty('visibility');
    hud.style.removeProperty('opacity');
    hud.style.removeProperty('pointer-events');
  }

  if(window.setNavVisible) setNavVisible(true);
  if(window.setHomeBtnVisible) setHomeBtnVisible(false);
  if(window.setReloadBtnVisible) setReloadBtnVisible(true);
  if(window.setBnavActive) setBnavActive('main');

  if(typeof window.updateHeaderHeight==='function') window.updateHeaderHeight();
  refresh();
};
window.closeScoreAttack=function(){
  const r=ensureRoot();
  r.classList.remove('show');
  r.setAttribute('aria-hidden','true');
  if(window.setNavVisible) setNavVisible(true);
  if(window.setHomeBtnVisible) setHomeBtnVisible(false);
  if(window.setReloadBtnVisible) setReloadBtnVisible(true);
};
window.setScoreAttackDifficulty=function(d){currentDifficulty=d==='hard'?'hard':'normal';const r=ensureRoot();r.querySelector('#score-attack-tab-normal').classList.toggle('active',currentDifficulty==='normal');r.querySelector('#score-attack-tab-hard').classList.toggle('active',currentDifficulty==='hard');refresh();};
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
  closeScoreAttack();
  if(typeof window.openShootingEvent==='function'){
    window.openShootingEvent({stageId});
  }
};
window.ScoreAttack={
  async beginAttemptForParty(partyIds){
    const sb=window.zsSupabase;
    const ids=(Array.isArray(partyIds)?partyIds:[])
      .map(Number)
      .filter((id,index,arr)=>id>0&&arr.indexOf(id)===index)
      .slice(0,3);

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

    // 復帰時などattemptが無い場合は、結果に含まれる実編成から復旧を試みる。
    if(!currentAttemptId){
      const ok=await window.ScoreAttack.beginAttemptForParty(detail.partyIds||[]);
      if(!ok){
        console.error('[ScoreAttack] finish blocked: attempt_id is missing');
        return;
      }
    }

    const attemptId=currentAttemptId;
    try{
      const resultPartyIds=(Array.isArray(detail.partyIds)?detail.partyIds:[])
        .map(Number)
        .filter((id,index,arr)=>id>0&&arr.indexOf(id)===index)
        .slice(0,3);

      const res=await sb.rpc('finish_score_attack_attempt_v2',{
        p_attempt_id:attemptId,
        p_score:Math.max(0,Math.floor(Number(detail.score||0))),
        p_party_ids:resultPartyIds
      });
      if(res&&res.error)throw res.error;

      console.log('[ScoreAttack] attempt finished:',attemptId,'party=',resultPartyIds,res&&res.data);
      currentAttemptId=null;
    }catch(err){
      console.error('[ScoreAttack] finish attempt failed',err);
    }
  },
  refresh
};
window.addEventListener('shooting-stage-result',ev=>{const d=ev&&ev.detail;if(d&&String(d.stageId||'').startsWith('shooting_score_attack_'))void window.ScoreAttack.submitResult(d);});
})();
