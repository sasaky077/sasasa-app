
(function(){
  'use strict';

  const SELLABLE_DEFAULT_ORDER = [
    'kyoumei_stone',
    'soul_vessel_fire',
    'soul_vessel_aqua',
    'soul_vessel_wood',
    'soul_vessel_dark',
    'soul_vessel_light'
  ];

  const LEGACY_LABELS = {
    soul_vessel_mystis:'魂の器(MYSTIS)',
    soul_vessel_chaos:'魂の器(CHAOS)'
  };

  const FALLBACK_EVOLUTION = {
    kyoumei_stone:{name:'共鳴石',img:'images/item_kyoumeistone.webp',desc:'プリモアの魂を同調させる神秘的な石。'},
    soul_vessel_fire:{name:'魂の器(火)',img:'images/item_soul_vessel_fire.webp',desc:'火属性の魂を受け止める神具。'},
    soul_vessel_aqua:{name:'魂の器(水)',img:'images/item_soul_vessel_aqua.webp',desc:'水属性の魂を受け止める神具。'},
    soul_vessel_wood:{name:'魂の器(木)',img:'images/item_soul_vessel_wood.webp',desc:'木属性の魂を受け止める神具。'},
    soul_vessel_dark:{name:'魂の器(闇)',img:'images/item_soul_vessel_dark.webp',desc:'闇属性の魂を受け止める神具。'},
    soul_vessel_light:{name:'魂の器(光)',img:'images/item_soul_vessel_light.webp',desc:'光属性の魂を受け止める神具。'},
    eri_origin_wing:{name:'原初の翼',img:'images/item_wing.webp',desc:'エリ専用の進化素材。ストーリー進行で入手できるよう実装予定。'},
    seihai:{name:'聖なる盃',img:'images/item_seihai.webp',desc:'神聖な力を湛えた進化用素材。'},
    overseer_blk_core:{name:'オーバーシア亜種の心核',img:'images/item_overseer_blk_core.webp',desc:'特殊強化に使用する異質な心核。'},
    soul_vessel_mystis:{name:'魂の器(MYSTIS)',img:'',desc:'旧式の進化素材。'},
    soul_vessel_chaos:{name:'魂の器(CHAOS)',img:'',desc:'旧式の進化素材。'}
  };

  const FALLBACK_LEVEL = [
    {id:'level_exp_small',name:'強化素材・銅',shortName:'銅',img:'images/item_exp_bronze.webp',exp:100},
    {id:'level_exp_medium',name:'強化素材・銀',shortName:'銀',img:'images/item_exp_silver.webp',exp:500},
    {id:'level_exp_large',name:'強化素材・金',shortName:'金',img:'images/item_exp_gold.webp',exp:2000}
  ];

  const OTHER_ITEMS = [
    {
      id:'special_stage_ticket',
      source:'profile',
      name:'ノア挑戦チケット',
      img:'images/special_stage_ticket.webp',
      kicker:'QUEST TICKET',
      desc:'SPECIAL STAGE「理想郷 -ノア-」への挑戦に使用するチケット。',
      tag:'クエスト'
    },
    {
      id:'flower_r',
      source:'inventory',
      name:'聖霊花・R',
      img:'images/item_flower_r.webp',
      kicker:'SPIRIT FLOWER',
      desc:'Rキャラクターが完凸後に重複した際、代わりに獲得する交換素材。',
      tag:'交換素材'
    },
    {
      id:'flower_sr',
      source:'inventory',
      name:'聖霊花・SR',
      img:'images/item_flower_sr.webp',
      kicker:'SPIRIT FLOWER',
      desc:'SRキャラクターが完凸後に重複した際、代わりに獲得する交換素材。',
      tag:'交換素材'
    }
  ];

  let state = {
    tab:'evolution',
    loading:false,
    items:{},
    sellPrices:{},
    coin:0,
    specialStageTicket:0,
    sellItemId:'',
    sellQty:1
  };

  function fmt(n){
    return Math.max(0,Math.floor(Number(n)||0)).toLocaleString('ja-JP');
  }

  function toast(msg){
    if(typeof window.showToast==='function') window.showToast(msg);
    else if(msg) alert(msg);
  }

  function normalizeItemId(raw){
    return String(raw||'').replace(/^evo:/,'');
  }

  function normalizedItems(raw){
    const out={};
    Object.keys(raw||{}).forEach(key=>{
      const id=normalizeItemId(key);
      const qty=Math.max(0,Math.floor(Number(raw[key])||0));
      out[id]=(out[id]||0)+qty;
    });
    return out;
  }

  function evolutionMaster(){
    const master=Object.assign({},FALLBACK_EVOLUTION);
    const ext=window.ShootingResonance && window.ShootingResonance.MATERIAL_MASTER;
    if(ext && typeof ext==='object'){
      Object.keys(ext).forEach(id=>{
        master[id]=Object.assign({},master[id]||{},ext[id]||{});
      });
    }
    Object.keys(LEGACY_LABELS).forEach(id=>{
      if(!master[id]) master[id]={name:LEGACY_LABELS[id],img:'',desc:'進化素材。'};
    });
    return master;
  }

  function levelMaster(){
    const fallbackById=Object.fromEntries(FALLBACK_LEVEL.map(x=>[x.id,Object.assign({},x)]));
    const ext=window.CharacterLeveling && Array.isArray(window.CharacterLeveling.MATERIALS)
      ? window.CharacterLeveling.MATERIALS
      : [];

    ext.forEach(x=>{
      const id=String(x.id||'');
      if(!id) return;
      fallbackById[id]=Object.assign({},fallbackById[id]||{},x||{});
    });

    return FALLBACK_LEVEL.map(base=>{
      const x=fallbackById[base.id]||base;
      return {
        id:String(x.id||base.id),
        name:String(base.name),
        shortName:String(base.shortName),
        img:String(base.img||x.img||''),
        exp:Math.max(0,Number(x.exp!=null?x.exp:base.exp)||0)
      };
    });
  }

  async function fetchSnapshot(){
    const client=window.zsSupabase;
    if(!client || typeof client.rpc!=='function') throw new Error('サーバーへ接続できません');

    if(window.zsAuthReady){
      try{ await window.zsAuthReady; }catch(_){}
    }

    const res=await client.rpc('get_my_inventory_snapshot');
    if(res && res.error) throw res.error;

    let data=res ? res.data : null;
    if(typeof data==='string'){
      try{ data=JSON.parse(data); }catch(_){}
    }
    if(!data || data.ok===false) throw new Error((data&&data.message)||'アイテム情報を取得できません');

    state.items=normalizedItems(data.items||{});
    state.sellPrices=data.sell_prices||{};
    state.coin=Math.max(0,Math.floor(Number(data.coin)||0));
    state.specialStageTicket=Math.max(0,Math.floor(Number(data.special_stage_ticket)||0));

    if(window.userProfile){
      window.userProfile.coin=state.coin;
      window.userProfile.special_stage_ticket=state.specialStageTicket;
      if(typeof window.writeProfileCache==='function'){
        try{ window.writeProfileCache(window.userProfile); }catch(_){}
      }
    }
    if(typeof window.updateMainUI==='function') window.updateMainUI();
    return data;
  }

  function getEvolutionIds(){
    const master=evolutionMaster();
    const seen=new Set();
    const ids=[];

    SELLABLE_DEFAULT_ORDER.forEach(id=>{
      if(!seen.has(id)){seen.add(id);ids.push(id);}
    });

    Object.keys(state.items).forEach(id=>{
      if(id.startsWith('level_exp_')) return;
      if(id==='flower_r' || id==='flower_sr') return;
      if(id==='soul_vessel_logos') return; // 廃止アイテム: UIには出さない
      if(!seen.has(id)){seen.add(id);ids.push(id);}
    });

    Object.keys(master).forEach(id=>{
      if((state.items[id]||0)>0 && !seen.has(id)){seen.add(id);ids.push(id);}
    });
    return ids;
  }

  function countOwnedTypes(ids){
    return ids.reduce((sum,id)=>sum+((state.items[id]||0)>0?1:0),0);
  }

  function renderIcon(meta, type){
    if(meta && meta.img){
      return '<div class="item-row-icon'+(type==='level'?' is-exp':'')+'"><img src="'+escapeHtml(meta.img)+'" alt="" onerror="this.style.display=\'none\'"></div>';
    }
    const fallback=(type==='level' ? (meta.shortName||'強') : String(meta.name||'?').slice(0,1));
    return '<div class="item-row-icon is-level"><span>'+escapeHtml(fallback)+'</span></div>';
  }

  function escapeHtml(value){
    return String(value==null?'':value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function render(){
    const list=document.getElementById('item-management-list');
    if(!list) return;

    const coin=document.getElementById('item-screen-coin');
    if(coin) coin.textContent=fmt(state.coin);

    const evoMaster=evolutionMaster();
    const evoIds=getEvolutionIds();
    const lvlMaster=levelMaster();

    document.querySelectorAll('#screen-item .item-category-tab').forEach(btn=>{
      btn.classList.toggle('is-active',btn.dataset.itemTab===state.tab);
    });

    const kicker=document.getElementById('item-panel-kicker');
    const title=document.getElementById('item-panel-title');

    if(state.tab==='other'){
      if(kicker) kicker.textContent='OTHER ITEM';
      if(title) title.textContent='その他';

      list.innerHTML=OTHER_ITEMS.map(meta=>{
        const qty=meta.source==='profile'
          ? state.specialStageTicket
          : Math.max(0,Number(state.items[meta.id]||0));

        return ''+
          '<article class="item-row item-row-other'+(qty<=0?' is-zero':'')+'">'+
            renderIcon(meta,'other')+
            '<div class="item-row-main">'+
              '<div class="item-row-kicker">'+escapeHtml(meta.kicker||'OTHER ITEM')+'</div>'+
              '<div class="item-row-name">'+escapeHtml(meta.name)+'</div>'+
              '<div class="item-row-desc">'+escapeHtml(meta.desc||'')+'</div>'+
              '<div class="item-row-count item-row-count-other"><span>OWNED</span><strong>'+fmt(qty)+'</strong></div>'+
            '</div>'+
          '</article>';
      }).join('');
      return;
    }

    if(state.tab==='level'){
      if(kicker) kicker.textContent='ENHANCE MATERIAL';
      if(title) title.textContent='強化素材';

      list.innerHTML=lvlMaster.map(meta=>{
        const qty=Math.max(0,Number(state.items[meta.id]||0));
        const price=Math.max(0,Number(state.sellPrices[meta.id]||0));
        const sellable=price>0 && qty>0;
        return ''+
          '<article class="item-row'+(qty<=0?' is-zero':'')+'">'+
            renderIcon(meta,'level')+
            '<div class="item-row-main">'+
              '<div class="item-row-kicker">ENHANCE ITEM</div>'+
              '<div class="item-row-name">'+escapeHtml(meta.name)+'</div>'+
              '<div class="item-row-desc">キャラクター経験値 +'+fmt(meta.exp)+'</div>'+
              '<div class="item-row-count"><span>OWNED</span><strong>'+fmt(qty)+'</strong></div>'+
            '</div>'+
            '<div class="item-row-actions">'+
              '<button class="item-sell-btn" type="button" data-sell-item="'+escapeHtml(meta.id)+'" '+(sellable?'':'disabled')+'>売却</button>'+
              '<div class="item-row-price">'+
                (price>0?'<img src="images/icon_coin.webp" alt=""> '+fmt(price)+' / 個':'売却対象外')+
              '</div>'+
            '</div>'+
          '</article>';
      }).join('');
      return;
    }

    if(kicker) kicker.textContent='EVOLUTION MATERIAL';
    if(title) title.textContent='進化素材';

    list.innerHTML=evoIds.map(id=>{
      const meta=evoMaster[id]||{name:id,img:'',desc:'進化素材。'};
      const qty=Math.max(0,Number(state.items[id]||0));
      const price=id==='eri_origin_wing'
        ? 0
        : Math.max(0,Number(state.sellPrices[id]||0));
      const sellable=id!=='eri_origin_wing' && price>0 && qty>0;
      return ''+
        '<article class="item-row'+(qty<=0?' is-zero':'')+'">'+
          renderIcon(meta,'evolution')+
          '<div class="item-row-main">'+
            '<div class="item-row-kicker">EVOLUTION ITEM</div>'+
            '<div class="item-row-name">'+escapeHtml(meta.name||id)+'</div>'+
            '<div class="item-row-desc">'+escapeHtml(meta.desc||'進化に使用する素材。')+'</div>'+
            '<div class="item-row-count"><span>OWNED</span><strong>'+fmt(qty)+'</strong></div>'+
          '</div>'+
          '<div class="item-row-actions">'+
            '<button class="item-sell-btn" type="button" data-sell-item="'+escapeHtml(id)+'" '+(sellable?'':'disabled')+'>売却</button>'+
            '<div class="item-row-price">'+
              (id==='eri_origin_wing'
                ? '売却不可'
                : (price>0?'<img src="images/icon_coin.webp" alt=""> '+fmt(price)+' / 個':'売却対象外'))+
            '</div>'+
          '</div>'+
        '</article>';
    }).join('');
  }

  async function refresh(){
    if(state.loading) return;
    state.loading=true;
    const list=document.getElementById('item-management-list');
    if(list) list.innerHTML='<div class="item-management-loading">読み込み中...</div>';
    const refreshBtn=document.getElementById('item-refresh-btn');
    if(refreshBtn) refreshBtn.disabled=true;

    try{
      await fetchSnapshot();
      render();
    }catch(err){
      console.error('[ItemManagement] refresh failed',err);
      if(list) list.innerHTML='<div class="item-management-empty">アイテム情報を読み込めませんでした。<br>通信状態を確認して再度お試しください。</div>';
      toast(err&&err.message?err.message:'アイテム情報の取得に失敗しました');
    }finally{
      state.loading=false;
      if(refreshBtn) refreshBtn.disabled=false;
    }
  }

  function closeSell(){
    const modal=document.getElementById('item-sell-modal');
    if(!modal) return;
    modal.hidden=true;
    modal.setAttribute('aria-hidden','true');
    state.sellItemId='';
    state.sellQty=1;
  }

  function getSellMeta(id){
    const evo=evolutionMaster();
    const level=levelMaster().find(x=>x.id===id);
    const meta=level || evo[id] || {name:id,img:'',desc:''};
    return {
      id,
      meta,
      owned:Math.max(0,Math.floor(Number(state.items[id]||0))),
      price:id==='eri_origin_wing'
        ? 0
        : Math.max(0,Math.floor(Number(state.sellPrices[id]||0)))
    };
  }

  function updateSellUI(){
    const id=state.sellItemId;
    if(!id) return;
    const data=getSellMeta(id);
    const max=Math.max(1,data.owned);
    state.sellQty=Math.max(1,Math.min(max,Math.floor(Number(state.sellQty)||1)));

    const qty=document.getElementById('item-sell-qty');
    if(qty){
      qty.max=String(max);
      qty.value=String(state.sellQty);
    }

    const owned=document.getElementById('item-sell-owned');
    const unit=document.getElementById('item-sell-unit-price');
    const total=document.getElementById('item-sell-total-price');
    if(owned) owned.textContent=fmt(data.owned);
    if(unit) unit.textContent=fmt(data.price);
    if(total) total.textContent=fmt(data.price*state.sellQty);

    const confirm=document.getElementById('item-sell-confirm');
    if(confirm) confirm.disabled=!(data.owned>0 && data.price>0 && state.sellQty>0);
  }

  function openSell(id){
    const data=getSellMeta(id);
    if(!(data.owned>0 && data.price>0)) return;

    state.sellItemId=id;
    state.sellQty=1;

    const modal=document.getElementById('item-sell-modal');
    const name=document.getElementById('item-sell-name');
    const icon=document.getElementById('item-sell-icon');
    if(name) name.textContent=data.meta.name||id;
    if(icon){
      icon.innerHTML=data.meta.img
        ? '<img src="'+escapeHtml(data.meta.img)+'" alt="" onerror="this.style.display=\'none\'">'
        : '<span>'+escapeHtml(String(data.meta.name||'?').slice(0,1))+'</span>';
    }
    updateSellUI();
    if(modal){
      modal.hidden=false;
      modal.setAttribute('aria-hidden','false');
    }
  }

  async function sell(){
    const id=state.sellItemId;
    if(!id) return;
    updateSellUI();
    const qty=Math.max(1,Math.floor(Number(state.sellQty)||1));
    const confirm=document.getElementById('item-sell-confirm');
    if(confirm){confirm.disabled=true;confirm.textContent='売却中...';}

    try{
      const client=window.zsSupabase;
      if(!client || typeof client.rpc!=='function') throw new Error('サーバーへ接続できません');

      const res=await client.rpc('sell_inventory_item',{
        p_item_id:id,
        p_quantity:qty
      });
      if(res && res.error) throw res.error;

      let result=res?res.data:null;
      if(typeof result==='string'){
        try{result=JSON.parse(result)}catch(_){}
      }
      if(!result || result.ok===false) throw new Error((result&&result.message)||'売却に失敗しました');

      state.items[id]=Math.max(0,Math.floor(Number(result.remaining_quantity)||0));
      state.coin=Math.max(0,Math.floor(Number(result.coin)||0));

      if(window.userProfile){
        window.userProfile.coin=state.coin;
        if(typeof window.writeProfileCache==='function'){
          try{window.writeProfileCache(window.userProfile)}catch(_){}
        }
      }

      // Other growth UI/local inventory uses the same server source; reload it after sale.
      const userId=String(localStorage.getItem('zukan_user_id')||'').trim();
      if(userId && typeof window.loadInventoryFromSupabase==='function'){
        try{await window.loadInventoryFromSupabase(userId)}catch(err){console.warn('[ItemManagement] local inventory sync skipped',err);}
      }

      if(typeof window.updateMainUI==='function') window.updateMainUI();
      try{window.dispatchEvent(new CustomEvent('sasaphia:growth-resources-changed'))}catch(_){}

      closeSell();
      render();
      toast((result.sold_quantity||qty)+'個を売却し、'+fmt(result.coin_gain)+'コインを獲得しました');
    }catch(err){
      console.error('[ItemManagement] sell failed',err);
      toast(err&&err.message?err.message:'売却に失敗しました');
    }finally{
      if(confirm){confirm.disabled=false;confirm.textContent='売却する';}
    }
  }

  function bind(){
    document.querySelectorAll('#screen-item .item-category-tab').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const next=btn.dataset.itemTab;
        state.tab=(next==='level'||next==='other') ? next : 'evolution';
        const list=document.getElementById('item-management-list');
        if(list) list.scrollTop=0;
        render();
      });
    });

    const list=document.getElementById('item-management-list');
    if(list){
      list.addEventListener('click',e=>{
        const btn=e.target.closest('[data-sell-item]');
        if(btn && !btn.disabled) openSell(btn.dataset.sellItem);
      });
    }

    const refreshBtn=document.getElementById('item-refresh-btn');
    if(refreshBtn) refreshBtn.addEventListener('click',refresh);

    document.querySelectorAll('[data-item-sell-close]').forEach(el=>el.addEventListener('click',closeSell));

    const minus=document.getElementById('item-sell-minus');
    const plus=document.getElementById('item-sell-plus');
    const max=document.getElementById('item-sell-max');
    const qty=document.getElementById('item-sell-qty');
    const confirm=document.getElementById('item-sell-confirm');

    if(minus) minus.addEventListener('click',()=>{state.sellQty--;updateSellUI();});
    if(plus) plus.addEventListener('click',()=>{state.sellQty++;updateSellUI();});
    if(max) max.addEventListener('click',()=>{
      if(state.sellItemId) state.sellQty=getSellMeta(state.sellItemId).owned;
      updateSellUI();
    });
    if(qty){
      qty.addEventListener('input',()=>{
        state.sellQty=Math.floor(Number(qty.value)||1);
        updateSellUI();
      });
    }
    if(confirm) confirm.addEventListener('click',sell);

    window.addEventListener('sasaphia:growth-resources-changed',()=>{
      if(document.getElementById('screen-item')?.classList.contains('active')) refresh();
    });
  }


  /* ---------------------------------------------------------
     Gacha excess-copy conversion display bridge
     Server draw_gacha() returns flower_r / flower_sr as
     material results when effective ownership is already 5/5.
     --------------------------------------------------------- */
  const OTHER_GACHA_REWARDS = {
    flower_r:{
      name:'聖霊花・R',
      img:'images/item_flower_r.webp',
      rarity:'r',
      itemCategory:'exchange'
    },
    flower_sr:{
      name:'聖霊花・SR',
      img:'images/item_flower_sr.webp',
      rarity:'sr',
      itemCategory:'exchange'
    }
  };

  const originalGetGachaMaterialRewardData =
    typeof window.getGachaMaterialRewardData==='function'
      ? window.getGachaMaterialRewardData
      : null;

  if(originalGetGachaMaterialRewardData){
    window.getGachaMaterialRewardData=function(materialId,count,timeStr,capturedAt){
      const id=String(materialId||'');
      const other=OTHER_GACHA_REWARDS[id];

      if(other){
        const n=Math.max(1,Number(count||1));
        return {
          resultKind:'material',
          materialId:id,
          itemCount:n,
          id:'material_'+id,
          name:other.name,
          img:other.img,
          upImg:other.img,
          cutImg:other.img,
          element:'',
          baseStats:{},
          stats:{},
          limitBreak:0,
          rarity:other.rarity,
          hasRarity:false,
          isNew:false,
          itemCategory:other.itemCategory,
          time:timeStr||new Date().toLocaleString(),
          capturedAt:capturedAt||new Date().toISOString()
        };
      }

      return originalGetGachaMaterialRewardData.apply(this,arguments);
    };
  }

  window.ItemManagement={
    refresh,
    getCount:function(itemId){
      const id=String(itemId||'');
      if(id==='special_stage_ticket') return state.specialStageTicket;
      return Math.max(0,Math.floor(Number(state.items[id]||0)));
    }
  };

  window.openItemScreen=function(){
    if(typeof window.showMainTab==='function'){
      window.showMainTab('item');
      if(typeof window.setBnavActive==='function') window.setBnavActive('main');
    }

    // Only the material list scrolls. Always enter that viewport at its top.
    const list=document.getElementById('item-management-list');
    if(list){
      list.scrollTop=0;
      requestAnimationFrame(()=>{ list.scrollTop=0; });
    }

    setTimeout(()=>{
      const current=document.getElementById('item-management-list');
      if(current) current.scrollTop=0;
      refresh();
    },0);
  };

  window.refreshItemManagement=refresh;

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bind,{once:true});
  }else{
    bind();
  }
})();
