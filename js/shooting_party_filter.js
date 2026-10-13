// ZERAPHIA build1432 — Character-list-style filters for the pre-battle party roster.
// This is a display-only layer: ownership, selected party, tower sealing and sortie checks
// remain exclusively owned by shooting_core.js / ResonanceTower.
(function(){
  'use strict';
  const state = { query:'', elements:[], rarities:[], shotTypes:[], sort:'id' };
  const elementOrder = ['fire','aqua','wood','light','dark'];
  const elementLabels = {fire:'FIRE',aqua:'AQUA',wood:'WOOD',light:'LIGHT',dark:'DARK'};
  const shotOrder = ['parallel','homing','cluster','bomb','spread','laser','piercing','orbit','charge','lightning','strike','conjure','trap'];
  const shotLabels = {parallel:'PARALLEL',homing:'HOMING',cluster:'CLUSTER',bomb:'BOMB',spread:'SPREAD',laser:'LASER',piercing:'PIERCING',orbit:'ORBIT',charge:'CHARGE',lightning:'PLASMA',strike:'STRIKE',conjure:'CONJURE',trap:'TRAP'};
  const shotAliases = {plasma:'lightning',orbit_forward:'orbit',charge_release:'charge',precision:'piercing',shotgun:'piercing',splash:'bomb',melee_slash:'strike',wolf_j_homing:'homing',rose_seed_splash:'spread',noah_hybrid:'laser'};
  let currentRoot = null;

  function esc(str){return String(str).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function normalize(s){
    let text = String(s == null ? '' : s);
    try{text=text.normalize('NFKC');}catch(_){}
    return text.toLowerCase().replace(/[\s　]+/g,'').replace(/[\u30a1-\u30f6]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0x60));
  }
  function elem(value){const s=String(value||'neutral').toLowerCase();return elementOrder.includes(s)?s:'neutral';}
  function rarity(value){return String(value||'r').toLowerCase()==='sr'?'sr':'r';}
  function shot(value){const s=String(value||'').toLowerCase();return shotAliases[s]||s;}
  function getData(id){return window.ShootingCharacters?.SHOOTING_CHARACTERS?.[id]||{};}
  function currentRoster(){return document.querySelector('#shooting-character-select .shooting-party-roster');}
  function isActive(){return state.query.trim()||state.elements.length||state.rarities.length||state.shotTypes.length||state.sort!=='id';}
  function ownedLevel(id){
    const data=window.ShootingCharacters?.getOwnedShootingInstance?.(id);
    return Math.max(0,Number(data?.characterLevel??data?.character_level??0)||0);
  }
  function rank(id){const c=getData(id);return window.ShootingCharacters?.getShootingBaseOrderRank?.(c.id)??id;}
  function apply(){
    const roster=currentRoster(),tools=document.getElementById('zpf-filter-toolbar');
    if(!roster||!tools)return;
    tools.hidden=roster.style.display==='none';
    const query=normalize(state.query);
    const entries=[];
    let visible=0;
    Array.from(roster.querySelectorAll('.shooting-character-option-wrap')).forEach(wrap=>{
      const btn=wrap.querySelector('[data-character-id]');
      if(!btn)return;
      const id=Number(btn.dataset.characterId),c=getData(id);
      const ok=(!query||normalize(c.name||'').includes(query))&&
        (!state.elements.length||state.elements.includes(elem(c.element)))&&
        (!state.rarities.length||state.rarities.includes(rarity(c.rarity)))&&
        (!state.shotTypes.length||state.shotTypes.includes(shot(c.shotType||c.mainShot?.type)));
      wrap.classList.toggle('zpf-filtered-out',!ok);
      wrap.setAttribute('aria-hidden',ok?'false':'true');
      if(ok)visible++;
      entries.push({wrap,id,c});
    });
    entries.sort((a,b)=>{
      if(state.sort==='level'){
        const diff=ownedLevel(b.id)-ownedLevel(a.id);
        if(diff)return diff;
      }else if(state.sort==='element'){
        const diff=elementOrder.indexOf(elem(a.c.element))-elementOrder.indexOf(elem(b.c.element));
        if(diff)return diff;
        const rarityDiff=(rarity(a.c.rarity)==='sr'?0:1)-(rarity(b.c.rarity)==='sr'?0:1);
        if(rarityDiff)return rarityDiff;
      }else if(state.sort==='rarity'){
        const diff=(rarity(a.c.rarity)==='sr'?0:1)-(rarity(b.c.rarity)==='sr'?0:1);
        if(diff)return diff;
        const elemDiff=elementOrder.indexOf(elem(a.c.element))-elementOrder.indexOf(elem(b.c.element));
        if(elemDiff)return elemDiff;
      }
      return rank(a.id)-rank(b.id)||a.id-b.id;
    });
    // Move existing nodes; never redraw panels or rebind their long-press handlers.
    entries.forEach(({wrap})=>roster.appendChild(wrap));
    let empty=roster.querySelector('.zpf-filter-empty');
    if(!empty){empty=document.createElement('p');empty.className='zpf-filter-empty';empty.textContent='条件に一致する仲間はいません';roster.appendChild(empty);}
    empty.hidden=visible>0;
    const count=tools.querySelector('.zpf-filter-count');if(count)count.textContent=visible+'人';
    const filterButton=tools.querySelector('.zpf-filter-button');
    if(filterButton){filterButton.classList.toggle('is-filtered',!!isActive());filterButton.setAttribute('aria-pressed',isActive()?'true':'false');}
  }
  function syncToolbar(){
    const t=document.getElementById('zpf-filter-toolbar');if(!t)return;
    const input=t.querySelector('input');if(input&&input.value!==state.query)input.value=state.query;
    const clear=t.querySelector('.zpf-search-clear');if(clear)clear.hidden=!state.query;
    apply();
  }
  function mount(){
    const root=document.getElementById('shooting-character-select');
    if(!root)return;
    currentRoot=root;
    if(root.querySelector('#zpf-filter-toolbar')){syncToolbar();return;}
    const roster=root.querySelector('.shooting-party-roster');if(!roster)return;
    const toolbar=document.createElement('div');toolbar.id='zpf-filter-toolbar';toolbar.className='zpf-filter-toolbar';
    toolbar.innerHTML=`<label class="zpf-search" aria-label="キャラ名検索">
       <span class="zpf-search-icon" aria-hidden="true">⌕</span>
       <input type="search" placeholder="キャラ名で検索" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="キャラ名で検索">
       <button type="button" class="zpf-search-clear" aria-label="検索文字を消す" hidden>×</button>
      </label><button type="button" class="zpf-filter-button" aria-label="絞り込みメニュー" aria-pressed="false">☷ 絞り込み</button>
      <span class="zpf-filter-count" aria-live="polite"></span>`;
    roster.parentNode.insertBefore(toolbar,roster);
    toolbar.querySelector('input').addEventListener('input',e=>{state.query=e.target.value;syncToolbar();});
    toolbar.querySelector('.zpf-search-clear').addEventListener('click',()=>{
      state.query='';syncToolbar();toolbar.querySelector('input').focus();
    });
    toolbar.querySelector('.zpf-filter-button').addEventListener('click',openDialog);
    syncToolbar();
  }
  function chip(group,key,label,img){
    const selected=key==='all'?!state[group].length:state[group].includes(key);
    // Same icon classes as the character-list filter. Without these classes,
    // the original 300px icon assets expand over the whole dialog.
    const iconClass=group==='elements'?'zcf-attribute-icon':'zcf-shot-icon';
    const iconSize=group==='elements'?22:24;
    const icon=img?`<img class="${iconClass}" src="${esc(img)}" width="${iconSize}" height="${iconSize}" alt="" decoding="async" draggable="false" onerror="this.style.visibility='hidden'">`:'';
    return `<button type="button" class="zcf-choice${selected?' is-selected':''}" aria-pressed="${selected}" data-group="${group}" data-key="${key}">${icon}<span class="zcf-choice-label">${esc(label)}</span></button>`;
  }
  function openDialog(){
    closeDialog();
    const layer=document.createElement('div');layer.id='shooting-party-filter-layer';layer.className='zcf-overlay';
    const attrTop=['all','fire','aqua','wood'].map(k=>chip('elements',k,k==='all'?'すべて':elementLabels[k],k==='all'?'':'images/type_'+k+'.webp')).join('');
    const attrBottom=['light','dark'].map(k=>chip('elements',k,elementLabels[k],'images/type_'+k+'.webp')).join('');
    const rarities=['all','sr','r'].map(k=>chip('rarities',k,k==='all'?'すべて':k.toUpperCase())).join('');
    const shots=['all',...shotOrder].map(k=>chip('shotTypes',k,k==='all'?'すべて':shotLabels[k],k==='all'?'':'images/shot_'+(k==='lightning'?'plasma':k)+'.webp')).join('');
    const sorts=['id','element','rarity','level'].map(k=>{
      const label={id:'ID',element:'属性',rarity:'レアリティ',level:'レベル'}[k];
      return `<button type="button" class="zcf-choice${state.sort===k?' is-selected':''}" data-sort="${k}" aria-pressed="${state.sort===k}"><span class="zcf-choice-label">${label}</span></button>`;
    }).join('');
    layer.innerHTML=`<section class="zcf-dialog" role="dialog" aria-modal="true" aria-label="パーティ編成の絞り込み">
      <header class="zcf-header"><h2 class="zcf-title">絞り込み</h2><span class="zcf-heading-rule" aria-hidden="true">✦</span>
      <button type="button" class="zcf-close" data-close aria-label="閉じる"><img src="images/button_close.webp" alt=""></button></header>
      <div class="zcf-scroll">
        <section class="zcf-section"><h3 class="zcf-section-title">属性</h3><div class="zcf-grid zcf-grid-attr-top">${attrTop}</div><div class="zcf-grid zcf-grid-attr-bottom">${attrBottom}</div></section>
        <section class="zcf-section"><h3 class="zcf-section-title">レアリティ</h3><div class="zcf-grid zcf-grid-rarity">${rarities}</div></section>
        <section class="zcf-section"><h3 class="zcf-section-title">ショットタイプ</h3><div class="zcf-grid zcf-grid-shots">${shots}</div></section>
        <section class="zcf-section"><h3 class="zcf-section-title">並び順</h3><div class="zcf-grid zcf-grid-sort">${sorts}</div></section>
      </div><footer class="zcf-footer"><button type="button" class="zcf-footer-button zcf-reset" data-reset>リセット</button><button type="button" class="zcf-footer-button zcf-apply" data-close>決定</button></footer>
    </section>`;
    layer.addEventListener('click',event=>{
      const target=event.target.closest('button');
      if(event.target===layer||target?.hasAttribute('data-close')){closeDialog();return;}
      if(!target)return;
      if(target.hasAttribute('data-reset')){
        state.elements=[];state.rarities=[];state.shotTypes=[];state.sort='id';state.query='';
        apply();closeDialog();syncToolbar();openDialog();return;
      }
      const group=target.dataset.group,key=target.dataset.key;
      if(group&&Object.prototype.hasOwnProperty.call(state,group)){
        const values=state[group];
        if(key==='all')state[group]=[];
        else if(values.includes(key))state[group]=values.filter(v=>v!==key);
        else state[group]=values.concat(key);
      }else if(target.dataset.sort)state.sort=target.dataset.sort;
      else return;
      layer.querySelectorAll('[data-group]').forEach(b=>{
        const active=b.dataset.key==='all'?!state[b.dataset.group].length:state[b.dataset.group].includes(b.dataset.key);
        b.classList.toggle('is-selected',active);b.setAttribute('aria-pressed',String(active));
      });
      layer.querySelectorAll('[data-sort]').forEach(b=>{const active=b.dataset.sort===state.sort;b.classList.toggle('is-selected',active);b.setAttribute('aria-pressed',String(active));});
      syncToolbar();
    });
    document.body.appendChild(layer);
    layer.querySelector('.zcf-close')?.focus({preventScroll:true});
  }
  function closeDialog(){document.getElementById('shooting-party-filter-layer')?.remove();}
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('shooting-party-filter-layer')){e.stopPropagation();closeDialog();}});
  function open(){
    closeDialog();state.query='';state.elements=[];state.rarities=[];state.shotTypes=[];state.sort='id';
    mount();syncToolbar();
  }
  window.ShootingPartyFilter=Object.freeze({open,refresh:apply,close:closeDialog,getState:()=>({...state})});
})();
