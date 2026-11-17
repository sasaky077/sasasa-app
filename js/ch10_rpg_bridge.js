(() => { 'use strict';
 // ZERAPHIA CH10 RPG bridge — build2040
 // RPG(iframe) を開閉し、RPG内の会話を本編ノベルエンジン(window.StoryNovel)で、
 // ランダムエンカウントを本編のシューティング戦闘(openShootingEvent)で再生する。
 const RPG_BUILD='2052';
 let root=null, returnFocus=null, frame=null, novelOpen=false, battleOpen=false, battleDone=null;
 function close(){
   if(!root||novelOpen||battleOpen)return;
   root.remove();root=null;frame=null;
   document.body.classList.remove('ch10-rpg-modal-open');
   if(returnFocus && returnFocus.isConnected)returnFocus.focus();
 }
 function open(){
   if(root)return;
   returnFocus=document.activeElement;
   root=document.createElement('div');
   root.className='ch10-rpg-modal';
   root.setAttribute('role','dialog');
   root.setAttribute('aria-modal','true');
   root.setAttribute('aria-label','第10章 RPGモード 開発中');
   frame=document.createElement('iframe');
   // RPG本体も更新のたびに必ず新しいものを読む（古い index.html がキャッシュに残ると旧データのまま動くため）
   frame.src='rpg/ch10/index.html?v='+RPG_BUILD;
   frame.title='ZERAPHIA 第10章 RPG試作';
   frame.setAttribute('allow','fullscreen');
   root.append(frame);
   document.body.append(root);
   document.body.classList.add('ch10-rpg-modal-open');
   frame.focus();
 }

 // RPG側から呼ぶ: 本編と同じノベル画面で会話を再生する
 //   key   : 'rpg_ch10_zig' など（シナリオ表に一時登録するID）
 //   data  : { chapter, chapterTitle, stageNo, stageTitle, entries:[{speaker,text,location,...}] }
 //   onDone: 会話終了（SKIP含む）で呼ばれる
 function playNovel(key, data, onDone){
   const SN=window.StoryNovel;
   const entries=data && Array.isArray(data.entries) ? data.entries : [];
   if(!SN || typeof SN.playPost!=='function' || !entries.length) return false;
   const id='rpg_ch10_'+String(key||'talk').replace(/[^a-zA-Z0-9_-]/g,'');
   // 本編シナリオ表は freeze されているので、RPG用の1件を足した新しい表に差し替える
   const base=window.ZERAPHIA_STORY_SCENARIO||{};
   window.ZERAPHIA_STORY_SCENARIO=Object.freeze(Object.assign({}, base, { [id]: {
     chapter:data.chapter||10, chapterTitle:data.chapterTitle||'', stageNo:data.stageNo||1, stageTitle:data.stageTitle||'',
     post:entries
   }}));
   let done=false;
   const finish=result=>{
     if(done)return; done=true; novelOpen=false;
     document.body.classList.remove('ch10-rpg-novel-open');
     if(frame) frame.focus();
     if(typeof onDone==='function'){ try{ onDone(result||{}); }catch(_){ } }
   };
   novelOpen=true;
   // ノベル(z-index:260500)をRPGモーダルより前に出す。終了時はノベルのフェードの下にRPGがそのまま見える
   document.body.classList.add('ch10-rpg-novel-open');
   const ok=SN.playPost(id,{ onComplete:finish, onExit:finish });
   if(!ok) finish({failed:true});
   return !!ok;
 }

 // RPG側から呼ぶ: ランダムエンカウントで本編のシューティング戦闘を始める
 //   stageId : 'shooting_rpg_ch10_01' など（shooting_stages.js の RPG_ENCOUNTER_DEFS）
 //   opts.partyScreen : true なら編成画面から。false（既定）は前回の編成のまま即出撃
 //   onDone  : 戦闘を抜けたら {win, fromResult} で呼ばれる（RESULTの「戻る」・途中退出・編成キャンセル）
 function startEncounter(stageId, opts, onDone){
   if(typeof window.openShootingEvent!=='function') return false;
   battleOpen=true; battleDone=onDone;
   window.__shootingReturnContext={ type:'ch10Rpg' };
   try{ window.openShootingEvent({ stageId:String(stageId||'') }); }
   catch(err){ console.warn('[ch10 rpg] battle open failed',err); window.__shootingReturnContext=null; battleOpen=false; battleDone=null; return false; }
   const reveal=()=>document.body.classList.add('ch10-rpg-battle-open');
   if(opts&&opts.partyScreen){ reveal(); return true; }
   // RPGの暗転が画面を覆っている間に出撃させ、戦闘の開始演出から見せる
   const t0=performance.now();
   const tryStart=()=>{
     const r=document.getElementById('shooting-event-root');
     const ready=r&&getComputedStyle(r).display!=='none';
     if(!ready&&performance.now()-t0<2500){ setTimeout(tryStart,60); return; }
     Promise.resolve(typeof window.startSelectedShootingCharacter==='function'?window.startSelectedShootingCharacter():null)
       .catch(err=>console.warn('[ch10 rpg] auto start failed',err))
       .finally(()=>setTimeout(reveal,150));
   };
   setTimeout(tryStart,60);
   return true;
 }
 // shooting_core.js の closeShootingEvent（returnContext.type==='ch10Rpg'）から呼ばれる
 window.__ch10RpgBattleFinished=function(info){
   if(!battleOpen) return;
   battleOpen=false;
   document.body.classList.remove('ch10-rpg-battle-open');
   if(frame) frame.focus();
   const cb=battleDone; battleDone=null;
   if(typeof cb==='function'){ try{ cb(info||{}); }catch(_){ } }
 };

 // ---------------------------------------------------------------
 // build2046: RPGメニューの「編成」。本編のパーティ編成画面と同じ見た目（css/ch10_rpg_party.css）
 //   キャラカードは本編の getShootingRosterHtml() をそのまま使い、ストーリー加入キャラだけに絞る
 //   保存先はエンカウント戦と共通の localStorage キー
 // ---------------------------------------------------------------
 const PARTY_KEY='zeraphia_rpg_encounter_party_v1', PARTY_MAX=3;
 let partyRoot=null;
 function readParty(){ try{ const v=JSON.parse(localStorage.getItem(PARTY_KEY)||'[]'); return Array.isArray(v)?v.map(Number).filter(Number.isFinite):[]; }catch(_){ return []; } }
 function openParty(opts){
   opts=opts||{};
   const M=window.ShootingCharacters;
   if(!M||typeof M.getShootingRosterHtml!=='function') return false;
   if(partyRoot) return true;
   const storyIds=(M.SHOOTING_STORY_FIRST_ORDER||[]).map(Number);
   const owned=id=>!!M.isShootingCharacterOwned(id);
   let draft=readParty().filter(id=>storyIds.includes(id)&&owned(id)).slice(0,PARTY_MAX);
   if(!draft.length) draft=storyIds.filter(owned).slice(0,PARTY_MAX);
   const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
   const elIcon=c=>{ const e=Array.isArray(c.element)?c.element[0]:c.element; return e?`images/type_${e}.webp`:''; };

   partyRoot=document.createElement('div');
   partyRoot.id='ch10-party-root';
   partyRoot.className='open ui-type-1';
   partyRoot.setAttribute('role','dialog'); partyRoot.setAttribute('aria-modal','true'); partyRoot.setAttribute('aria-label','パーティ編成');
   partyRoot.innerHTML=`
     <div class="shooting-stage">
       <div id="ch10-party-select" class="zpf-screen show">
        <div class="zpf-shell" role="region" aria-label="パーティ編成">
         <header class="zpf-header" aria-label="編成">
           <button class="zpf-header-back" type="button" data-act="cancel" aria-label="戻る"><span aria-hidden="true">‹</span> 戻る</button>
           <div class="zpf-header-center">
             <span class="zpf-header-chapter">CHAPTER 10</span>
             <strong class="zpf-header-stage">編成</strong>
             <small class="zpf-header-subtitle">${esc(opts.place||'')}</small>
           </div>
           <div class="zpf-header-spacer" aria-hidden="true"></div>
         </header>
         <div class="zpf-intro">
           <div class="zpf-intro-heading">
             <span class="zpf-intro-mark" aria-hidden="true">✧</span>
             <strong>パーティ編成</strong>
             <span class="zpf-intro-english">— PARTY FORMATION —</span>
           </div>
           <div class="zpf-rule">STORY加入キャラから最大3人 · 1番がリーダー</div>
         </div>
         <div class="zpf-slots" aria-label="編成枠"></div>
         <div class="shooting-party-roster zpf-roster" role="list" aria-label="所持キャラクター"></div>
         <div class="zpf-actions">
           <button type="button" class="shooting-party-cancel zpf-btn-cancel" data-act="cancel">キャンセル</button>
           <button type="button" class="shooting-character-start zpf-btn-start" data-act="save">決定</button>
         </div>
        </div>
       </div>
     </div>`;
   // 本編のカードを流用（ストーリー加入キャラだけ・本編の選択処理は外す）
   const roster=partyRoot.querySelector('.zpf-roster');
   const tmp=document.createElement('div'); tmp.innerHTML=M.getShootingRosterHtml();
   storyIds.forEach(id=>{ const w=tmp.querySelector(`[data-character-wrap-id="${id}"]`); if(!w) return;
     w.querySelectorAll('[onclick]').forEach(el=>el.removeAttribute('onclick')); roster.appendChild(w); });
   const slots=partyRoot.querySelector('.zpf-slots');
   const saveBtn=partyRoot.querySelector('[data-act="save"]');
   const render=()=>{
     slots.innerHTML=Array.from({length:PARTY_MAX},(_,i)=>{ const id=draft[i], c=id!=null&&M.SHOOTING_CHARACTERS[id];
       if(!c) return `<button type="button" class="shooting-party-slot empty" aria-label="編成枠${i+1}・空き"><span class="zpf-slot-number">${i+1}</span><b aria-hidden="true">＋</b></button>`;
       const panel=roster.querySelector(`[data-character-id="${id}"] .shooting-character-portrait img:not(.shooting-character-element-icon)`);
       return `<button type="button" class="shooting-party-slot filled" data-character-id="${id}" aria-label="${esc(c.name)}を外す"><span class="zpf-slot-number">${i+1}</span>`+
         (elIcon(c)?`<img class="shooting-party-slot-element-icon" src="${elIcon(c)}" alt="" aria-hidden="true" draggable="false">`:'')+
         `<img src="${esc(panel?panel.getAttribute('src'):(c.panelImage||c.image||''))}" alt="${esc(c.name)}" draggable="false"><small>${esc(c.name)}</small><i>×</i></button>`; }).join('');
     roster.querySelectorAll('.shooting-character-option').forEach(b=>b.classList.toggle('selected',draft.includes(Number(b.dataset.characterId))));
     saveBtn.disabled=!draft.length;
   };
   const close=saved=>{ if(!partyRoot) return; try{ window.ShootingPartyFilter&&window.ShootingPartyFilter.close(); }catch(_){} document.body.classList.remove('ch10-party-open'); partyRoot.remove(); partyRoot=null; document.removeEventListener('keydown',onKey,true);
     if(frame) frame.focus(); if(typeof opts.onClose==='function'){ try{ opts.onClose(!!saved); }catch(_){} } };
   const onKey=e=>{ if(e.key==='Escape'&&!document.getElementById('shooting-party-filter-layer')){ e.preventDefault(); e.stopPropagation(); close(false); } };
   partyRoot.addEventListener('click',e=>{
     const act=e.target.closest('[data-act]'); if(act){ if(act.dataset.act==='save'){ if(!draft.length) return; try{ localStorage.setItem(PARTY_KEY,JSON.stringify(draft)); }catch(_){} close(true); } else close(false); return; }
     const slot=e.target.closest('.shooting-party-slot.filled'); if(slot){ draft=draft.filter(id=>id!==Number(slot.dataset.characterId)); render(); return; }
     const opt=e.target.closest('.shooting-character-option'); if(!opt||opt.disabled) return;
     const id=Number(opt.dataset.characterId);
     if(draft.includes(id)) draft=draft.filter(x=>x!==id); else if(draft.length<PARTY_MAX) draft.push(id);
     else if(typeof window.showToast==='function') window.showToast('編成は3人までです');
     render();
   });
   document.addEventListener('keydown',onKey,true);
   document.body.appendChild(partyRoot);
   render();
   // 検索・絞り込みは本編の ShootingPartyFilter をそのまま使う（並び順・お気に入り★・ULT検索も本編と同じ）
   document.body.classList.add('ch10-party-open');
   try{ if(window.ShootingPartyFilter&&typeof window.ShootingPartyFilter.openFor==='function') window.ShootingPartyFilter.openFor('#ch10-party-select'); }catch(err){ console.warn('[ch10 party] filter failed',err); }
   return true;
 }
 window.openZeraphiaCh10Party=openParty;

 window.openZeraphiaCh10RPG=open;
 window.closeZeraphiaCh10RPG=close;
 window.playZeraphiaCh10Novel=playNovel;
 window.startZeraphiaCh10Encounter=startEncounter;
 window.addEventListener('keydown',e=>{ if(e.key==='Escape'&&root&&!novelOpen&&!battleOpen){ e.preventDefault(); close(); } });
})();
