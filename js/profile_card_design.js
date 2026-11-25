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
    { id:'dusk',    name:'宵闇',         sub:'TWILIGHT', tone:'dark',  bg:'images/profile_card_dusk.webp' }
    // 限定デザインの例：{ id:'soiree', name:'夜会', sub:'SOIREE', tone:'dark', bg:'images/profile_card_soiree.webp', limited:true, how:'パラレル・ソワレ報酬' }
  ];
  const DEFAULT_OWNED = ['classic','flower','dusk'];
  const STORE_KEY = 'zs_profile_card_design_v1';
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
    btn.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0 L11.6 8.4 L20 10 L11.6 11.6 L10 20 L8.4 11.6 L0 10 L8.4 8.4Z" fill="currentColor"/></svg><span>カードデザイン</span>';
    btn.addEventListener('click',openPicker);
    c.appendChild(btn);
  }

  function pickerHTML(){
    const cur=getEquipped();
    return '<div class="zcd-sheet" role="dialog" aria-modal="true" aria-labelledby="zcd-title">'+
      '<div class="zcd-head"><span id="zcd-title">CARD DESIGN</span><small>カードデザイン</small>'+
        '<button type="button" class="zcd-close" aria-label="閉じる">×</button></div>'+
      '<div class="zcd-list">'+DESIGNS.map(d=>{
        const owned=isOwned(d.id), on=d.id===cur;
        return '<button type="button" class="zcd-item'+(on?' is-on':'')+(owned?'':' is-locked')+'" data-zcd="'+d.id+'"'+(owned?'':' disabled')+'>'+
          '<span class="zcd-thumb" data-design="'+d.id+'"'+(d.bg?' style="--zpp-design-bg:'+bgVar(d.bg).replace(/"/g,'&quot;')+'"':'')+'><i></i></span>'+
          '<span class="zcd-name">'+d.name+'</span>'+
          '<small class="zcd-sub">'+(owned?(on?'設定中':d.sub):(d.how||'未所持'))+'</small>'+
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
  function closePicker(){
    document.querySelectorAll('#zs-player-profile .zcd-picker').forEach(p=>p.remove());
  }

  function init(){
    const host=document.getElementById('zs-player-profile');
    if(!host) return;
    ensureButton();
    apply(getEquipped());
    // プロフィールを開くたびに（ユーザー切り替え後も）装備中のデザインを当て直す
    new MutationObserver(()=>{
      if(host.classList.contains('is-open')){ ensureButton(); apply(getEquipped()); }
      else closePicker();
    }).observe(host,{attributes:true,attributeFilter:['class']});
    // 背景画像は先に読み込んでおく（開いた時に絵が遅れて出ないように）
    DESIGNS.forEach(d=>{ if(d.bg){ const im=new Image(); im.decoding='async'; im.src=d.bg; } });
  }

  window.ProfileCardDesign={
    DESIGNS,
    getEquipped,
    isOwned,
    apply,
    openPicker,
    // 限定デザインの所持（サーバー対応後に呼ぶ）
    setOwned(ids){ extraOwned=new Set((ids||[]).map(String)); const c=getEquipped(); apply(c); }
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
