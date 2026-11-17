(() => { 'use strict';
 // ZERAPHIA CH10 RPG bridge — build2040
 // RPG(iframe) を開閉し、RPG内の会話を本編ノベルエンジン(window.StoryNovel)で、
 // ランダムエンカウントを本編のシューティング戦闘(openShootingEvent)で再生する。
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
   frame.src='rpg/ch10/index.html';
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

 window.openZeraphiaCh10RPG=open;
 window.closeZeraphiaCh10RPG=close;
 window.playZeraphiaCh10Novel=playNovel;
 window.startZeraphiaCh10Encounter=startEncounter;
 window.addEventListener('keydown',e=>{ if(e.key==='Escape'&&root&&!novelOpen&&!battleOpen){ e.preventDefault(); close(); } });
})();
