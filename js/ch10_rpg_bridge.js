(() => { 'use strict';
 // ZERAPHIA CH10 RPG bridge — build2034
 // RPG(iframe) を開閉し、RPG内の会話を本編ノベルエンジン(window.StoryNovel)で再生する。
 let root=null, returnFocus=null, frame=null, novelOpen=false;
 function close(){
   if(!root||novelOpen)return;
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

 window.openZeraphiaCh10RPG=open;
 window.closeZeraphiaCh10RPG=close;
 window.playZeraphiaCh10Novel=playNovel;
 window.addEventListener('keydown',e=>{ if(e.key==='Escape'&&root&&!novelOpen){ e.preventDefault(); close(); } });
})();
