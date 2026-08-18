/* Sasaphia - SCORE ATTACK / すこあた！ */
(function(){
'use strict';
const STAGES={normal:'shooting_score_attack_normal',hard:'shooting_score_attack_hard'};
const PANEL_MAP={"1": "images/chara_01_panel.webp", "2": "images/chara_02_panel.webp", "3": "images/chara_03_panel.webp", "4": "images/chara_04_panel.webp", "5": "images/chara_05_panel.webp", "6": "images/chara_06_panel.webp", "7": "images/chara_07_panel.webp", "8": "images/chara_08_panel.webp", "9": "images/chara_09_panel.webp", "10": "images/chara_10_panel.webp", "11": "images/chara_11_panel.webp", "12": "images/chara_12_panel.webp", "13": "images/chara_13_panel.webp", "14": "images/chara_14_panel.webp", "15": "images/chara_15_panel.webp", "16": "images/chara_16_panel.webp", "17": "images/chara_17_panel.webp", "50": "images/chara_50_panel.webp"};
let currentDifficulty='normal',root=null,loading=false;
function uid(){return String(localStorage.getItem('zukan_user_id')||'').trim().toLowerCase();}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function panelSrc(id){id=Number(id||0);try{const m=window.ShootingCharacters&&window.ShootingCharacters.SHOOTING_CHARACTER_MASTER;if(m&&m[id]&&m[id].panelImage)return m[id].panelImage;}catch(_){}return PANEL_MAP[id]||'';}
function partyHtml(ids,large){const a=Array.isArray(ids)?ids.slice(0,3):[];while(a.length<3)a.push(0);return '<div class="score-attack-party'+(large?' is-large':'')+'">'+a.map(id=>{const src=panelSrc(id);return src?'<span><img src="'+esc(src)+'" alt="" draggable="false"></span>':'<span class="empty"></span>';}).join('')+'</div>';}
function ensureRoot(){
 if(root)return root;
 root=document.createElement('div');root.id='score-attack-root';root.setAttribute('aria-hidden','true');
 root.innerHTML=`<div class="score-attack-page">
 <div class="score-attack-bg-deco score-attack-bg-deco-a" aria-hidden="true"></div>
 <div class="score-attack-bg-deco score-attack-bg-deco-b" aria-hidden="true"></div>

 <header class="score-attack-head">
   <button type="button" class="score-attack-back" onclick="closeScoreAttack()">‹ 戻る</button>
   <div class="score-attack-head-title">
     <small>SCORE ATTACK EVENT</small>
     <strong>すこあた！</strong>
   </div>
   <div class="score-attack-head-mark" aria-hidden="true">✦</div>
 </header>

 <div class="score-attack-scroll">

  <section class="score-attack-ranking score-attack-ranking-first">
    <div class="score-attack-section-head">
      <div><strong>現在のランキング</strong></div>
    </div>
    <div id="score-attack-list" class="score-attack-list"><div class="score-attack-loading">読み込み中...</div></div>
  </section>

  <section class="score-attack-mode-card">
    <div class="score-attack-mode-head">
      <div><small>DIFFICULTY</small><strong>難易度を選択</strong></div>
      <span>各難易度で個別ランキング</span>
    </div>
    <div class="score-attack-tabs">
      <button id="score-attack-tab-normal" class="active" onclick="setScoreAttackDifficulty('normal')">
        <small>NORMAL</small><b>標準弾速</b>
      </button>
      <button id="score-attack-tab-hard" onclick="setScoreAttackDifficulty('hard')">
        <small>HARD</small><b>高速・高威力</b>
      </button>
    </div>
  </section>

  <section class="score-attack-me">
    <div class="score-attack-me-head">
      <div><small>YOUR RECORD</small><span>MY BEST</span></div>
      <div class="score-attack-me-badge">PERSONAL BEST</div>
    </div>
    <strong id="score-attack-my-score">------</strong>
    <div class="score-attack-my-party-label">BEST PARTY</div>
    <div id="score-attack-my-party"></div>
    <button type="button" class="score-attack-start" onclick="startScoreAttack()">
      <span>挑戦する</span><small>START SCORE ATTACK</small>
    </button>
  </section>

 </div></div>`;
 document.body.appendChild(root);return root;
}
async function fetchRanking(){const sb=window.zsSupabase,userId=uid();if(!sb||typeof sb.rpc!=='function'||!userId)return[];const res=await sb.rpc('get_score_attack_friend_ranking',{p_user_id:userId,p_difficulty:currentDifficulty});if(res&&res.error)throw res.error;return Array.isArray(res&&res.data)?res.data:[];}
function renderRows(rows){
 const r=ensureRoot(),myId=uid(),list=r.querySelector('#score-attack-list');
 const mine=rows.find(x=>String(x.user_id||'').toLowerCase()===myId)||null;
 r.querySelector('#score-attack-my-score').textContent=mine&&Number(mine.best_score||0)>0?Number(mine.best_score).toLocaleString('ja-JP'):'------';
 r.querySelector('#score-attack-my-party').innerHTML=mine?partyHtml(mine.party_ids,false):partyHtml([],false);

 if(!rows.length){
   list.innerHTML='<div class="score-attack-empty">まだ記録がありません</div>';
   return;
 }

 list.innerHTML=rows.map((row,i)=>{
   const me=String(row.user_id||'').toLowerCase()===myId;
   const rank=Number(row.rank_no||i+1);
   return '<div class="score-attack-row'+(me?' is-me':'')+'">'+
     '<span class="score-attack-rank-no">'+rank+'</span>'+
     '<div class="score-attack-row-main">'+
       '<b>'+esc(row.display_name||row.user_id||'Player')+(me?' <em>YOU</em>':'')+'</b>'+
       partyHtml(row.party_ids,false)+
     '</div>'+
     '<strong>'+Number(row.best_score||0).toLocaleString('ja-JP')+'</strong>'+
   '</div>';
 }).join('');
}
async function refresh(){if(loading)return;loading=true;const r=ensureRoot();r.querySelector('#score-attack-list').innerHTML='<div class="score-attack-loading">読み込み中...</div>';try{renderRows(await fetchRanking());}catch(err){console.error('[ScoreAttack] ranking failed',err);renderRows([]);r.querySelector('#score-attack-list').innerHTML='<div class="score-attack-empty">ランキングを取得できません。<br>Supabase SQLを確認してください。</div>';}finally{loading=false;}}
window.openScoreAttack=function(){const r=ensureRoot();r.classList.add('show');r.setAttribute('aria-hidden','false');if(window.setNavVisible)setNavVisible(false);if(window.setHomeBtnVisible)setHomeBtnVisible(false);if(window.setReloadBtnVisible)setReloadBtnVisible(false);refresh();};
window.closeScoreAttack=function(){const r=ensureRoot();r.classList.remove('show');r.setAttribute('aria-hidden','true');if(window.setNavVisible)setNavVisible(true);if(window.setHomeBtnVisible)setHomeBtnVisible(false);if(window.setReloadBtnVisible)setReloadBtnVisible(true);};
window.setScoreAttackDifficulty=function(d){currentDifficulty=d==='hard'?'hard':'normal';const r=ensureRoot();r.querySelector('#score-attack-tab-normal').classList.toggle('active',currentDifficulty==='normal');r.querySelector('#score-attack-tab-hard').classList.toggle('active',currentDifficulty==='hard');refresh();};
window.startScoreAttack=function(){const stageId=STAGES[currentDifficulty];closeScoreAttack();if(typeof window.openShootingEvent==='function')window.openShootingEvent({stageId});};
window.ScoreAttack={async submitResult(detail){if(!detail||!String(detail.stageId||'').startsWith('shooting_score_attack_'))return;const sb=window.zsSupabase,userId=uid();if(!sb||typeof sb.rpc!=='function'||!userId)return;const difficulty=String(detail.stageId).endsWith('_hard')?'hard':'normal';try{const res=await sb.rpc('submit_score_attack_result',{p_user_id:userId,p_difficulty:difficulty,p_score:Math.max(0,Math.floor(Number(detail.score||0))),p_party_ids:(Array.isArray(detail.partyIds)?detail.partyIds:[]).map(Number).filter(Boolean)});if(res&&res.error)throw res.error;}catch(err){console.error('[ScoreAttack] submit failed',err);}},refresh};
window.addEventListener('shooting-stage-result',ev=>{const d=ev&&ev.detail;if(d&&String(d.stageId||'').startsWith('shooting_score_attack_'))void window.ScoreAttack.submitResult(d);});
})();
