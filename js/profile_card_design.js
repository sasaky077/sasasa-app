/* =========================================================
   build2217: PLAYER PROFILE のカードデザイン（着せ替え）
   ・最初から全員が持つ3種類：白金の羊皮紙（今のデザイン）／花畑／宵闇
   ・限定デザインは DESIGNS に足し、所持はサーバーから setOwned() で渡す（今は未使用）
   ・装備中のデザインはユーザーごとに端末へ保存（他のプレイヤーへの表示は今後サーバー対応）
   ・背景の絵は images/profile_card_<id>.webp。画像が無い間は色だけの仮の背景で表示
   ========================================================= */
(function(){
  'use strict';
  const DESIGNS = [
    { id:'classic', name:'白金の羊皮紙', sub:'PARCHMENT', tone:'light', bg:'' },
    { id:'flower',  name:'花畑',         sub:'FLOWER FIELD', tone:'light', bg:'images/profile_card_flower.webp' },
    { id:'dusk',    name:'宵闇',         sub:'TWILIGHT', tone:'dark',  bg:'images/profile_card_dusk.webp' },
    // build2221: 聖霊花交換所で交換して手に入れるデザイン（聖霊花(R)×5、各1回）
    { id:'study',    name:'陽だまりの書斎', sub:'ATELIER',  tone:'light', bg:'images/profile_card_study.webp',    exchange:true, how:'聖霊花交換所' },
    { id:'festival', name:'星夜の祝祭',     sub:'FESTIVAL', tone:'dark',  bg:'images/profile_card_festival.webp', exchange:true, how:'聖霊花交換所' }
    // 限定デザインの例：{ id:'soiree', name:'夜会', sub:'SOIREE', tone:'dark', bg:'images/profile_card_soiree.webp', limited:true, how:'パラレル・ソワレ報酬' }
  ];
  const DEFAULT_OWNED = ['classic','flower','dusk'];
  const STORE_KEY = 'zs_profile_card_design_v1';
  const OWNED_KEY = 'zs_profile_card_owned_v1'; // サーバーから取った所持の控え（起動直後の表示用）
  let extraOwned = new Set();

  function uid(){ return String(localStorage.getItem('zukan_user_id')||'guest').trim().toLowerCase()||'guest'; }
  function getDesign(id){ return DESIGNS.find(d=>d.id===id)||DESIGNS[0]; }
  function isOwned(id){ return DEFAULT_OWNED.includes(id)||extraOwned.has(id); }
  function getEquipped(){
    let id='';
    try{ const all=JSON.parse(localStorage.getItem(STORE_KEY)||'{}'); id=String(all[uid()]||''); }catch(_){}
    return (id && DESIGNS.some(d=>d.id===id) && isOwned(id)) ? id : 'classic';
  }
  function saveEquipped(id){
    try{
      const all=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
      all[uid()]=id;
      localStorage.setItem(STORE_KEY,JSON.stringify(all));
    }catch(_){}
  }

  function card(){ return document.querySelector('#zs-player-profile .zpp-card'); }

  /* ---- 所持（交換・限定デザイン）：サーバーの get_my_profile_card_designs から ---- */
  function readOwnedCache(){
    try{ const all=JSON.parse(localStorage.getItem(OWNED_KEY)||'{}'); return Array.isArray(all[uid()])?all[uid()]:[]; }catch(_){ return []; }
  }
  function writeOwnedCache(ids){
    try{ const all=JSON.parse(localStorage.getItem(OWNED_KEY)||'{}'); all[uid()]=ids; localStorage.setItem(OWNED_KEY,JSON.stringify(all)); }catch(_){}
  }
  function setOwnedIds(ids){
    extraOwned=new Set((ids||[]).map(v=>String(v&&v.design_id!==undefined?v.design_id:v)).filter(Boolean));
    writeOwnedCache([...extraOwned]);
    apply(getEquipped()); // 持っていないデザインを装備していたら白金に戻る
    refreshPickerIfOpen();
    try{ window.dispatchEvent(new CustomEvent('zeraphia:profile-designs-loaded')); }catch(_){}
  }
  let loading=null;
  async function loadOwned(){
    const sb=window.zsSupabase;
    if(!sb || typeof sb.rpc!=='function') return;
    if(loading) return loading;
    loading=(async()=>{
      try{
        const res=await sb.rpc('get_my_profile_card_designs');
        if(res && res.error) throw res.error;
        let d=res?res.data:null; if(typeof d==='string'){ try{d=JSON.parse(d)}catch(_){} }
        const list=Array.isArray(d)?d:(d&&Array.isArray(d.designs)?d.designs:[]);
        setOwnedIds(list);
      }catch(err){ console.warn('[ProfileCardDesign] owned designs load skipped',err&&err.message||err); }
      finally{ loading=null; }
    })();
    return loading;
  }
  function markOwned(id){
    if(!id) return;
    extraOwned.add(String(id));
    writeOwnedCache([...extraOwned]);
    refreshPickerIfOpen();
  }
  // CSS変数のurl()はCSSファイルの場所（css/）を基準に解決されるため、ページ基準の完全なURLにして渡す
  function absUrl(path){ try{ return new URL(path,document.baseURI).href; }catch(_){ return path; } }
  function bgVar(path){ return 'url("'+absUrl(path).replace(/"/g,'%22')+'")'; }

  function apply(id){
    const c=card(); if(!c) return;
    const d=getDesign(id);
    c.dataset.design=d.id;
    c.dataset.tone=d.tone;
    if(d.bg) c.style.setProperty('--zpp-design-bg',bgVar(d.bg));
    else c.style.removeProperty('--zpp-design-bg');
    // 星の飾りは色をデザインに合わせる（SVGのfillを直接）
    c.querySelectorAll('.zpp-star path').forEach(p=>p.setAttribute('fill',d.tone==='dark'?'#d6b878':'#c4a462'));
  }

  function ensureButton(){
    const c=card(); if(!c || c.querySelector('.zpp-design-btn')) return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='zpp-design-btn';
    btn.setAttribute('aria-label','カードデザインを変更');
    // build2219: ボタンらしさを消し、下の飾り線の下に添える細い英字（✦ CARD DESIGN ✦）に
    btn.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0 L11.6 8.4 L20 10 L11.6 11.6 L10 20 L8.4 11.6 L0 10 L8.4 8.4Z" fill="currentColor"/></svg><span>CARD DESIGN</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0 L11.6 8.4 L20 10 L11.6 11.6 L10 20 L8.4 11.6 L0 10 L8.4 8.4Z" fill="currentColor"/></svg>';
    btn.addEventListener('click',openPicker);
    c.appendChild(btn);
  }

  function pickerHTML(){
    const cur=getEquipped();
    return '<div class="zcd-sheet" role="dialog" aria-modal="true" aria-labelledby="zcd-title">'+
      '<div class="zcd-head"><span id="zcd-title">CARD DESIGN</span><small>カードデザイン</small>'+
        '<button type="button" class="zcd-close" aria-label="閉じる">×</button></div>'+
      // build2222: 持っているデザインだけを並べる（未所持の交換・限定デザインは出さない）
      '<div class="zcd-list">'+DESIGNS.filter(d=>isOwned(d.id)).map(d=>{
        const owned=isOwned(d.id), on=d.id===cur;
        return '<button type="button" class="zcd-item'+(on?' is-on':'')+(owned?'':' is-locked')+'" data-zcd="'+d.id+'"'+(owned?'':' disabled')+'>'+
          '<span class="zcd-thumb" data-design="'+d.id+'"'+(d.bg?' style="--zpp-design-bg:'+bgVar(d.bg).replace(/"/g,'&quot;')+'"':'')+'><i></i></span>'+
          '<span class="zcd-name">'+d.name+'</span>'+
          '<small class="zcd-sub">'+(owned?(on?'設定中':d.sub):(d.how?d.how+'で交換':'未所持'))+'</small>'+
          (d.limited?'<em class="zcd-limited">LIMITED</em>':'')+
        '</button>';
      }).join('')+'</div>'+
    '</div>';
  }
  function openPicker(){
    const host=document.getElementById('zs-player-profile'); if(!host) return;
    closePicker();
    const wrap=document.createElement('div');
    wrap.className='zcd-picker';
    wrap.innerHTML=pickerHTML();
    wrap.addEventListener('click',e=>{
      if(e.target===wrap || e.target.closest('.zcd-close')){ closePicker(); return; }
      const it=e.target.closest('[data-zcd]');
      if(!it || it.disabled) return;
      const id=it.dataset.zcd;
      saveEquipped(id); apply(id);
      wrap.querySelectorAll('.zcd-item').forEach(b=>{
        const on=b.dataset.zcd===id; b.classList.toggle('is-on',on);
        const d=getDesign(b.dataset.zcd); const sub=b.querySelector('.zcd-sub');
        if(sub && isOwned(d.id)) sub.textContent=on?'設定中':d.sub;
      });
    });
    host.appendChild(wrap);
    requestAnimationFrame(()=>wrap.classList.add('is-open'));
  }
  function refreshPickerIfOpen(){
    const wrap=document.querySelector('#zs-player-profile .zcd-picker');
    if(wrap) wrap.innerHTML=pickerHTML();
  }
  function closePicker(){
    document.querySelectorAll('#zs-player-profile .zcd-picker').forEach(p=>p.remove());
  }

  function init(){
    const host=document.getElementById('zs-player-profile');
    if(!host) return;
    extraOwned=new Set(readOwnedCache());
    ensureButton();
    apply(getEquipped());
    // プロフィールを開くたびに（ユーザー切り替え後も）装備中のデザインを当て直す
    new MutationObserver(()=>{
      if(host.classList.contains('is-open')){ ensureButton(); apply(getEquipped()); loadOwned(); }
      else closePicker();
    }).observe(host,{attributes:true,attributeFilter:['class']});
    // ログイン直後にも一度取る（サーバー接続の準備を待って数回試す）
    let tries=0; const t=setInterval(()=>{ if(window.zsSupabase||++tries>20){ clearInterval(t); loadOwned(); } },1500);
    // 背景画像は先に読み込んでおく（開いた時に絵が遅れて出ないように）
    DESIGNS.forEach(d=>{ if(d.bg){ const im=new Image(); im.decoding='async'; im.src=d.bg; } });
  }

  window.ProfileCardDesign={
    DESIGNS,
    getEquipped,
    isOwned,
    apply,
    openPicker,
    getDesign,
    loadOwned,
    markOwned,
    setOwned:setOwnedIds
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
