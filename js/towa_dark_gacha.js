/* ZERAPHIA build1543: Towa visual adapter to the ORIGINAL PixiJS+GSAP build886 gacha runtime.
   Normal gacha globals, CSS, result modal, draw RPC, and timing are never modified. */
(function(){
  'use strict';
  let active=null;
  // Show the authoritative RPC reward tier. 'gold' is skinned as burgundy in this runtime.
  // Coins are two distinct prizes with a shared reward ID, so qty is the discriminator.
  function tierFor(reward){
    const id=String(reward?.id||'');
    if(reward?.type==='character' && Number(reward.id)===101) return 'rainbow';
    if(id==='flower_sr') return 'rainbow';
    if(id==='flower_r'||id==='level_exp_large'||id==='kyoumei_stone'||
       id.startsWith('soul_vessel_')||
       (id==='coin' && Number(reward.qty)===5000)) return 'gold';
    return 'silver';
  }
  function play(results){
    if(!Array.isArray(results)||results.length!==10) return Promise.reject(new Error('サーバー抽選結果が10件ではありません'));
    const host=document.getElementById('towa-encounter-screen');
    if(!host) return Promise.reject(new Error('トワの邂逅画面が見つかりません'));
    if(active)active.finish();
    const viewport=document.createElement('div');
    viewport.className='towa-pixi-sequence';
    viewport.setAttribute('role','dialog');
    viewport.setAttribute('aria-modal','true');
    viewport.setAttribute('aria-label','トワとの邂逅・召喚演出');
    const frame=document.createElement('iframe');
    frame.className='towa-pixi-frame';
    frame.title='トワとの邂逅・Pixi魂演出';
    frame.setAttribute('aria-hidden','true');
    frame.style.pointerEvents='none';
    // Exact clone of existing normal summon runtime, but with isolated Towa palette.
    frame.src='js/towa_pixi_runtime.html?v=1560-soul-flame';
    const skip=document.createElement('button');
    skip.type='button';skip.className='towa-pixi-skip';skip.textContent='演出をスキップ';
    skip.setAttribute('aria-label','演出をスキップして確定済みの結果へ');
    viewport.append(frame,skip);
    host.appendChild(viewport);
    host.classList.add('towa-animation-active');
    return new Promise(resolve=>{
      let finished=false,ready=false;
      const timers=[];
      const listener=(event)=>{
        if(finished||event.source!==frame.contentWindow)return;
        const msg=event.data||{};
        switch(msg.type){
          case 'ZERAPHIA_PIXI_GACHA_READY':
            if(ready)return;
            ready=true;
            try{frame.contentWindow.postMessage({type:'ZERAPHIA_PIXI_GACHA_START',tiers:results.map(tierFor)},'*');}
            catch(e){console.warn('[towa pixi] start',e);session.finish();}
            break;
          case 'ZERAPHIA_PIXI_GACHA_WHITEOUT':
            session.finish();break;
          case 'ZERAPHIA_PIXI_GACHA_ERROR':
            console.warn('[towa pixi] original runtime reported:',msg.message||msg);
            session.finish();break;
        }
      };
      const session={finish(){
        if(finished)return;
        finished=true;
        timers.forEach(clearTimeout);
        window.removeEventListener('message',listener);
        frame.src='about:blank';
        viewport.remove();
        host.classList.remove('towa-animation-active');
        if(active===session)active=null;
        resolve();
      }};
      active=session;
      window.addEventListener('message',listener);
      skip.addEventListener('click',()=>session.finish(),{once:true});
      // If the external Pixi/GSAP libraries cannot load, never trap the player.
      timers.push(setTimeout(()=>{if(!ready){console.warn('[towa pixi] ready timeout; showing saved results');session.finish();}},12000));
      timers.push(setTimeout(()=>{console.warn('[towa pixi] completion timeout; showing saved results');session.finish();},34000));
    });
  }
  function cancel(){if(active)active.finish();}
  window.TowaDarkGacha=Object.freeze({play,cancel,tierFor});
})();
