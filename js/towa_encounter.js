/* ZERAPHIA build1549 — Towa: native full-screen acquisition precisely at the opening card, correct art. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const PRIZES=Object.freeze({
    '101':['トワ','images/chara_101_up.webp'],
    'flower_sr':['聖霊花 (SR)','images/item_flower_sr.webp'],
    'flower_r':['聖霊花 (R)','images/item_flower_r.webp'],
    'level_exp_large':['経験値・金','images/item_exp_gold.webp'],
    'level_exp_medium':['経験値・銀','images/item_exp_silver.webp'],
    'kyoumei_stone':['共鳴石','images/item_kyoumeistone.webp'],
    'soul_vessel_fire':['魂の器・火','images/item_soul_vessel_fire.webp'],
    'soul_vessel_aqua':['魂の器・水','images/item_soul_vessel_aqua.webp'],
    'soul_vessel_wood':['魂の器・木','images/item_soul_vessel_wood.webp'],
    'soul_vessel_light':['魂の器・光','images/item_soul_vessel_light.webp'],
    'soul_vessel_dark':['魂の器・闇','images/item_soul_vessel_dark.webp'],
    'coin':['コイン','images/icon_coin.webp']
  });
  // build1543: 虹5.0% / エンジ45.0% / 灰銀50.0% (server draw thresholds match).
  const RATES=[
    ['虹｜トワ (SR)','1.5%'],['虹｜聖霊花 (SR) ×1','3.5%'],
    ['エンジ｜聖霊花 (R) ×1','5.0%'],['エンジ｜経験値・金 ×5','5.0%'],
    ['エンジ｜コイン ×5,000','5.0%'],['エンジ｜共鳴石 ×1','5.0%'],
    ['エンジ｜魂の器・火 ×1','5.0%'],['エンジ｜魂の器・水 ×1','5.0%'],
    ['エンジ｜魂の器・木 ×1','5.0%'],['エンジ｜魂の器・光 ×1','5.0%'],
    ['エンジ｜魂の器・闇 ×1','5.0%'],
    ['灰銀｜経験値・銀 ×5','25.0%'],['灰銀｜コイン ×2,500','25.0%']
  ];
  let busy=false, loaded=false, visible=false, memory=0, pity=0, pendingId=null;
  let returnFocus=null;
  let preflight='idle'; // idle | confirm | standby | drawing

  function activeUserId(){
    try { return String((typeof userId !== 'undefined' && userId)||localStorage.getItem('zukan_user_id')||'').trim().toLowerCase(); }
    catch(_){return '';}
  }
  const storageKey=()=> 'zeraphia_towa_request_'+(activeUserId()||'anonymous');
  function notice(message){ const el=$('towa-gacha-message');if(el) el.textContent=String(message||''); }
  function showInfo(id){$(id)?.removeAttribute('hidden');updateModalLayer();}
  function hideInfo(id){$(id)?.setAttribute('hidden','');updateModalLayer();}
  function updateModalLayer(){
    const active=['towa-encounter-result','towa-encounter-pickup-modal','towa-encounter-rates-modal',
      'towa-encounter-confirm','towa-encounter-standby']
      .some(id=>$(id)&&!$(id).hidden);
    $('towa-encounter-screen')?.classList.toggle('towa-modal-active',active);
  }

  function fillRates(){
    const list=$('towa-rate-lines');if(!list||list.childElementCount)return;
    for(const [name,rate] of RATES){
      const r=document.createElement('div');r.className='towa-rate-row';
      const a=document.createElement('span');a.textContent=name;
      const b=document.createElement('strong');b.textContent=rate;
      r.append(a,b);list.append(r);
    }
  }
  // User confirmation and TAP are pure UI stages: neither spends a memory.
  // Only draw_towa_encounter() commits the ticket and draws, after the TAP.
  function cancelPreflight(){
    if(preflight==='drawing')return;
    preflight='idle';
    $('towa-encounter-confirm')?.setAttribute('hidden','');
    $('towa-encounter-standby')?.setAttribute('hidden','');
    $('towa-encounter-standby')?.classList.remove('is-starting');
    updateModalLayer();
  }
  function showDrawConfirmation(){
    if(preflight!=='idle'||busy||!loaded)return;
    if(!pendingId&&memory<1){notice('トワの記憶が足りません。');return;}
    const retry=!!pendingId;
    const message=$('towa-confirm-message');
    if(message)message.textContent=retry?'前回の抽選結果を確認します。新たな記憶の消費はありません。':
      'トワの記憶を1個消費して、10回引きますか？';
    const cost=$('towa-confirm-cost');if(cost)cost.textContent=retry?'トワの記憶 ×0（再確認）':'トワの記憶 ×1';
    const before=$('towa-confirm-before');if(before)before.textContent=String(memory);
    const after=$('towa-confirm-after');if(after)after.textContent=String(Math.max(0,memory-(retry?0:1)));
    preflight='confirm';
    $('towa-encounter-confirm')?.removeAttribute('hidden');
    updateModalLayer();
    $('towa-confirm-cancel')?.focus();
  }
  function enterTowaStandby(){
    if(preflight!=='confirm'||busy)return;
    preflight='standby';
    $('towa-encounter-confirm')?.setAttribute('hidden','');
    // Keep the previous results until the user commits by tapping.
    $('towa-encounter-standby')?.removeAttribute('hidden');
    updateModalLayer();
    $('towa-standby-start')?.focus();
  }
  function beginTowaDrawFromTap(){
    if(preflight!=='standby'||busy)return;
    preflight='drawing';
    $('towa-encounter-standby')?.classList.add('is-starting');
    $('towa-standby-start')?.setAttribute('disabled','');
    // Do not hide TAP until the server replies: no flash of the old gacha screen.
    void draw();
  }
  function newUUID(){
    if(window.crypto?.randomUUID)return window.crypto.randomUUID();
    const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);
    bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
  }
  function client(){const sb=window.zsSupabase;if(!sb?.rpc) throw new Error('サーバーへの接続を確認できません');return sb;}
  function render(){
    const count=$('towa-pity-count'),fill=$('towa-pity-fill'),balance=$('towa-memory-count'),btn=$('towa-draw-button'),redraw=$('towa-result-redraw');
    if(count)count.textContent=String(pity)+' / 100';
    if(fill)fill.style.width=Math.max(0,Math.min(100,pity))+'%';
    if(balance)balance.textContent=String(memory);
    if(btn){btn.disabled=busy||!loaded||(!pendingId&&memory<1);btn.querySelector('.towa-draw-main').textContent=pendingId?'前回の結果を確認':'10回引く';}
    if(redraw){redraw.disabled=busy||!loaded||(!pendingId&&memory<1);}
    $('towa-loading')?.toggleAttribute('hidden',loaded);
  }
  async function refresh(){
    loaded=false;render();
    try{
      const {data,error}=await client().rpc('get_towa_encounter_state');
      if(error)throw error;
      if(!data?.ok)throw new Error('ガチャ状態を取得できません');
      memory=Math.max(0,Number(data.memory)||0);pity=Math.max(0,Number(data.pity_count)||0);
      window.dispatchEvent(new CustomEvent('zeraphia:towa-memory-changed',{detail:{memory}}));
      notice(memory?'トワの記憶を使い、特別な邂逅へ。':'トワの記憶は残響の塔15階で入手できます。');
      loaded=true;
    }catch(e){console.error('[towa encounter] state',e);notice('通信エラー：ガチャ状態を取得できません。もう一度開き直してください。');}
    render();
  }
  function close(){
    if(busy||preflight==='drawing')return;
    cancelPreflight();
    stopTowaResultReveal();window.TowaDarkGacha?.cancel?.();
    visible=false;$('towa-encounter-screen')?.setAttribute('hidden','');
    $('towa-encounter-result')?.setAttribute('hidden','');
    hideInfo('towa-encounter-pickup-modal');
    hideInfo('towa-encounter-rates-modal');
    updateModalLayer();
    if(returnFocus?.isConnected)returnFocus.focus();returnFocus=null;
  }
  async function open(){
    if(visible)return;
    cancelPreflight();
    returnFocus=document.activeElement;
    const el=$('towa-encounter-screen');if(!el)return;
    visible=true;el.removeAttribute('hidden');$('towa-encounter-result')?.setAttribute('hidden','');
    try{pendingId=sessionStorage.getItem(storageKey())||null;}catch(_){pendingId=null;}
    if(pendingId) notice('前回の抽選を確認できます。再消費はしません。');
    await refresh();
  }
  let towaResultTimers=[];
  let towaResultSequence=0;
  function stopTowaResultReveal(){
    // Also wake suspended async waits.  A cancelled/opened-again screen must never
    // advance a stale result sequence or hold an unfinished Promise indefinitely.
    ++towaResultSequence;
    for(const {timer,resume} of towaResultTimers){clearTimeout(timer);resume();}
    towaResultTimers=[];
  }
  function waitTowaResult(ms){
    return new Promise(resolve=>{
      const entry={timer:null,resume:resolve};
      entry.timer=setTimeout(()=>{
        towaResultTimers=towaResultTimers.filter(e=>e!==entry);
        resolve();
      },ms);
      towaResultTimers.push(entry);
    });
  }
  async function renderResults(results){
    stopTowaResultReveal();
    const sequence=towaResultSequence;
    const grid=$('towa-result-grid');if(!grid)return;grid.replaceChildren();
    const win=(results||[]).some(r=>r.type==='character'&&Number(r.id)===101);
    const result=$('towa-encounter-result');
    const title=$('towa-result-heading');if(title)title.textContent=win?'トワとの邂逅':'邂逅の記憶';
    const caption=$('towa-result-caption');if(caption)caption.textContent='SPECIAL ENCOUNTER • 10 RESULTS';
    for(const item of results||[]){
      const id=String(item.id||'');const [name,src]=PRIZES[id]||[id,'images/unknown.webp'];
      const towa=item.type==='character'&&Number(item.id)===101;
      const visualTier=window.TowaDarkGacha?.tierFor?.(item)||'silver';
      // Existing ten-result card structure. No changes to standard-gacha DOM/CSS.
      const card=document.createElement('div');
      card.className='ten-result-card ten-card-hidden towa-native-result-card'+
        (towa?' towa-hit-card':'')+
        (visualTier==='rainbow'?' towa-tier-rainbow':visualTier==='gold'?' towa-tier-burgundy':' towa-tier-silver');
      const back=document.createElement('div');back.className='ten-card-back ten-card-alchemia-back';
      back.setAttribute('aria-label','未開封');
      back.innerHTML='<span class="ten-card-back-ring"></span><span class="ten-card-back-core"></span>';
      const front=document.createElement('div');front.className='towa-native-card-face';
      const img=document.createElement('img');img.className='ten-card-img'+(towa?'':' ten-card-item-img');
      img.src=src||'images/unknown.webp';img.alt='';img.loading='eager';
      img.onerror=()=>{img.onerror=null;img.src='images/unknown.webp';};
      const label=document.createElement('div');label.className='ten-card-bottom';
      const span=document.createElement('span');span.className='ten-card-name';span.textContent=name;
      const qty=document.createElement('small');qty.className='towa-native-card-qty';qty.textContent='×'+(Number(item.qty)||1).toLocaleString('ja-JP');
      label.append(span,qty);front.append(img,label);
      if(towa){
        const shimmer=document.createElement('span');shimmer.className='ten-card-sr-shimmer';front.append(shimmer);
        const aura=document.createElement('span');aura.className='ten-card-pickup-aura';front.append(aura);
      }
      if(item.pity){const mark=document.createElement('small');mark.className='towa-native-pity';mark.textContent='確定';front.append(mark);}
      card.append(back,front);grid.append(card);
    }
    const redraw=$('towa-result-redraw');if(redraw){
      redraw.disabled=busy||!loaded||(!pendingId&&memory<1);
      
    }
    result?.removeAttribute('hidden');updateModalLayer();
    const cards=[...grid.children];
    const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Exactly the normal gacha's sequential reveal: 720 ms first card,
    // 1,200 ms after EACH opened card. A Towa hit pauses the sequence at its
    // own slot, opens the game's ORIGINAL acquisition modal, then opens that card
    // when the player taps through. It never plays before the result grid.
    await waitTowaResult(reduced?0:720);
    for(let index=0;index<cards.length;index++){
      if(sequence!==towaResultSequence||!result||result.hidden||!cards[index].isConnected)return;
      const item=results[index];
      if(item?.type==='character'&&Number(item.id)===101){
        // Even already-owned Towa characters always get the full-screen reveal.
        await showTowaExistingAcquisition(item);
        if(sequence!==towaResultSequence||result.hidden)return;
      }
      const card=cards[index];
      card.classList.remove('ten-card-hidden');
      card.classList.add('towa-native-revealed');
      card.querySelector('.ten-card-back')?.remove();
      try{if(typeof window.playSE==='function')window.playSE('ten_gacha_open',.35);}catch(_){}
      if(index+1<cards.length)await waitTowaResult(reduced?0:1200);
    }
  }
  // build1544: Use the original game-wide "NEW CHARACTER" full-screen reveal,
  // not a lookalike. Every granted Towa triggers it, including owned duplicates.
  // Its normal close button is routed back here by the one-line closeReveal guard.
  function showTowaExistingAcquisition(item){
    if(!item || item.type!=='character' || Number(item.id)!==101) return Promise.resolve();
    if(typeof window.showRevealImageOnly!=='function'){
      console.error('[towa] original showRevealImageOnly is not ready');
      return Promise.resolve();
    }
    const modal=$('reveal-modal'), host=$('towa-encounter-screen');
    const content=$('reveal-content'), guf=$('global-user-frame');
    if(!modal || !content || !host){
      console.error('[towa] original acquisition reveal DOM is missing');
      return Promise.resolve();
    }
    return new Promise(resolve=>{
      let done=false;
      const oldGufDisplay=guf?.style.display||'';
      function finish(){
        if(done)return;
        done=true;
        if(window.__towaFullscreenRevealClose===finish) window.__towaFullscreenRevealClose=null;
        modal.classList.remove('active','reveal-is-new','reveal-is-known','is-pickup','is-material-result');
        content.classList.remove('show');
        $('reveal-chara-img')?.removeAttribute('src');
        const bg=$('reveal-bg');if(bg){bg.style.backgroundImage='';bg.style.opacity='0';}
        const overlay=$('reveal-overlay');if(overlay)overlay.style.background='rgba(0,0,0,0)';
        const particles=$('reveal-particles');if(particles)particles.replaceChildren();
        if(guf)guf.style.display=oldGufDisplay;
        host.classList.remove('towa-acquisition-active');
        resolve();
      }
      window.__towaFullscreenRevealClose=finish;
      host.classList.add('towa-acquisition-active');
      const reveal={
        resultKind:'character',id:101,name:'トワ',rarity:'sr',element:'dark',
        img:'images/chara_101.webp',
        isNew:true,isPickup:true,
        character_row_id:item.character_row_id
      };
      try{window.showRevealImageOnly(reveal);}catch(error){
        console.error('[towa] original full-screen acquisition reveal failed',error);
        finish();
      }
    });
  }

  async function draw(){
    // Guard this internal entry point: drawing is only possible after confirmation + TAP.
    if(preflight!=='drawing')return;
    if(busy||!loaded||(!pendingId&&memory<1)){
      preflight='idle';cancelPreflight();return;
    }
    stopTowaResultReveal();
    $('towa-encounter-result')?.setAttribute('hidden','');
    updateModalLayer();
    busy=true;render();notice('運命の扉を開いています…');
    try{
      if(!pendingId){pendingId=newUUID();try{sessionStorage.setItem(storageKey(),pendingId);}catch(_){}}
      const {data,error}=await client().rpc('draw_towa_encounter',{p_request_id:pendingId});
      if(error)throw error;
      if(!data?.ok||!Array.isArray(data.results)||data.results.length!==10)throw new Error('抽選結果を確認できません');
      memory=Math.max(0,Number(data.memory)||0);pity=Math.max(0,Number(data.pity_count)||0);
      window.dispatchEvent(new CustomEvent('zeraphia:towa-memory-changed',{detail:{memory}}));
      // On a confirmed server result, replace TAP with the Pixi presentation.
      $('towa-encounter-standby')?.setAttribute('hidden','');
      $('towa-encounter-standby')?.classList.remove('is-starting');
      updateModalLayer();
      // The server has already committed the reward. Clear the retry ID BEFORE presentation;
      // animation failure or skip must never submit a new draw or spend a second ticket.
      try{sessionStorage.removeItem(storageKey());}catch(_){}pendingId=null;
      try{
        if(window.TowaDarkGacha && typeof window.TowaDarkGacha.play==='function'){
          await window.TowaDarkGacha.play(data.results);
        }
      }catch(animationError){
        console.warn('[towa] special animation unavailable, using confirmed results',animationError);
      }
      // A Towa hit now triggers the ORIGINAL full-screen reveal while its exact
      // result card opens; wait for each close before continuing to the next card.
      await renderResults(data.results);
      notice('抽選完了。結果を確認してください。');
        // Refresh material balances from DB (never regrant from the browser).
      const uid=activeUserId();
      if(uid&&typeof window.loadInventoryFromSupabase==='function'){
        Promise.resolve(window.loadInventoryFromSupabase(uid)).catch(e=>console.warn('[towa] inventory sync',e));
      }
      // Mirror server-owned character rows into the running session; logout/reload still uses DB.
      const rows=data.results.filter(r=>r.type==='character'&&r.character_row_id!=null)
        .map(r=>Number(r.character_row_id)).filter(Number.isFinite);
      if(uid&&rows.length){
        Promise.resolve(client().from('collected_characters').select('*').eq('user_id',uid).in('id',rows))
          .then(result=>{
            if(result.error)throw result.error;
            if(typeof box==='undefined'||typeof collected==='undefined'||typeof buildOwnedEntryFromChara!=='function')return;
            (result.data||[]).forEach(row=>{
              const chara=typeof getCharaById==='function'?getCharaById(Number(row.character_id)):null;
              if(!chara||box.some(entry=>Number(entry.db_id)===Number(row.id)))return;
              const owned=buildOwnedEntryFromChara(chara,row);
              box.push(owned);if(!collected[owned.id])collected[owned.id]=owned;
            });
            if(typeof renderBox==='function')renderBox();
          }).catch(e=>console.warn('[towa] character refresh',e));
      }
      // Pull real post-draw coin balance; do not add displayed rewards again on a retry.
      if(uid){
        Promise.resolve(client().from('user_profiles').select('coin').eq('user_id',uid).maybeSingle())
          .then(r=>{
            if(r.error)throw r.error;
            if(r.data&&window.userProfile){
              window.userProfile.coin=Number(r.data.coin)||0;
              if(typeof window.updateMainUI==='function')window.updateMainUI();
            }
          }).catch(e=>console.warn('[towa] coin refresh',e));
      }
    }catch(e){console.error('[towa encounter] draw',e);
      notice('通信確認が必要です。同じ抽選IDで結果を再確認できます。再消費はしません。');
    }finally{
      preflight='idle';
      $('towa-encounter-standby')?.setAttribute('hidden','');
      $('towa-encounter-confirm')?.setAttribute('hidden','');
      $('towa-encounter-standby')?.classList.remove('is-starting');
      $('towa-standby-start')?.removeAttribute('disabled');
      busy=false;render();updateModalLayer();
    }
  }
  let trialStarting=false;
  async function trial(){
    if(busy||trialStarting)return;
    trialStarting=true;
    try{
      if(window.__sasaphiaShootingModulesReady)await window.__sasaphiaShootingModulesReady;
      if(!window.ShootingCharacters?.SHOOTING_CHARACTERS?.[101]){
        throw new Error('トワの戦闘データ(ID101)が読み込まれていません。ページを更新して再試行してください。');
      }
      if(typeof window.openShootingTrial!=='function')throw new Error('試遊エンジンが読み込まれていません');
      const result=window.openShootingTrial(101);
      if(result===false){
        const why=window.__zeraphiaShootingTrialFailure||'unknown (possibly cached shooting core)';
        throw new Error('試遊開始が拒否されました: '+why);
      }
      visible=false;$('towa-encounter-screen')?.setAttribute('hidden','');
    }catch(e){
      console.error('[towa] trial',e);
      const reason=String(e?.message||'');
      if(reason.includes('another-battle-open'))notice('別の戦闘が開いています。戦闘画面を終了してから試してください。');
      else if(reason.includes('戦闘データ')||reason.includes('character-definition-missing'))notice('トワの戦闘データを確認できません。ページを再読み込みしてください。');
      else notice('試遊を開始できませんでした。ページを再読み込みしてもう一度お試しください。');
    }finally{trialStarting=false;}
  }
  function init(){
    $('towa-encounter-back')?.addEventListener('click',close);
    $('towa-draw-button')?.addEventListener('click',showDrawConfirmation);
    $('towa-confirm-cancel')?.addEventListener('click',cancelPreflight);
    $('towa-confirm-accept')?.addEventListener('click',enterTowaStandby);
    $('towa-standby-start')?.addEventListener('click',beginTowaDrawFromTap);
    $('towa-result-close')?.addEventListener('click',()=>{stopTowaResultReveal();$('towa-encounter-result')?.setAttribute('hidden','');updateModalLayer();void refresh();});
    $('towa-result-redraw')?.addEventListener('click',showDrawConfirmation);
    $('towa-try-button')?.addEventListener('click',()=>void trial());
    $('towa-pickup-detail')?.addEventListener('click',()=>window.openTowaGachaPoolDetail?.());
    $('towa-pickup-modal-close')?.addEventListener('click',()=>hideInfo('towa-encounter-pickup-modal'));
    $('towa-pickup-modal-dismiss')?.addEventListener('click',()=>hideInfo('towa-encounter-pickup-modal'));
    $('towa-rates-open')?.addEventListener('click',()=>window.openTowaGachaPoolDetail?.());
    $('towa-rates-modal-close')?.addEventListener('click',()=>hideInfo('towa-encounter-rates-modal'));
    $('towa-rates-modal-dismiss')?.addEventListener('click',()=>hideInfo('towa-encounter-rates-modal'));
    // Use the REAL app bottom navigation, not a second copy inside Towa.
    const nativeNav=$('bottom-nav-shared');
    nativeNav?.addEventListener('click',()=>{
      if(visible&&!busy)close();
    },true);
    document.addEventListener('keydown',e=>{
      if(e.key!=='Escape'||!visible||busy)return;
      if(preflight==='confirm'||preflight==='standby'){cancelPreflight();return;}
      if(!$('towa-encounter-rates-modal')?.hidden)hideInfo('towa-encounter-rates-modal');
      else if(!$('towa-encounter-pickup-modal')?.hidden)hideInfo('towa-encounter-pickup-modal');
      else if(!$('towa-encounter-result')?.hidden){$('towa-encounter-result').hidden=true;updateModalLayer();}
      else close();
    });
  }
  window.openTowaEncounter=()=>void open();
  window.closeTowaEncounter=close;
  window.TowaEncounter=Object.freeze({open,close,refresh});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
