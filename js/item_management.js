
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

  // 廃止済みの素材は所持データを消さず、画面からのみ除外する。
  const RETIRED_EVOLUTION_ITEMS = new Set(['soul_vessel_logos', 'eri_origin_wing']);

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
    seihai:{name:'聖なる盃',img:'images/item_seihai.webp',desc:'神聖な力を湛えた進化用素材。'},
    overseer_blk_core:{name:'竜型レムナント亜種の心核',img:'images/item_overseer_blk_core.webp',desc:'特殊強化に使用する異質な心核。'},
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
      // build1486: 残響の塔15F（トワ）の報酬。使い道は今後実装。
      id:'towa_memory',
      source:'inventory',
      name:'トワの記憶',
      img:'images/item_towa_memory.webp',
      kicker:'ECHO MEMORY',
      desc:'残響の塔の最深部で、トワが遺した記憶の結晶。その使い道はまだ分からない。',
      tag:'記憶'
    },
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
      id:'tower_limited_ten_ticket',
      source:'inventory',
      name:'限定邂逅10連無料TICKET',
      img:'images/gacha_ticket_10.webp',
      kicker:'LIMITED ENCOUNTER TICKET',
      desc:'残響の塔7Fの報酬。限定邂逅（ニーナ／オリビア／スマイル）で10連を1回無料で引けます。',
      tag:'ガチャ'
    },
    {
      id:'flower_r',
      source:'inventory',
      name:'聖霊花(R)',
      img:'images/item_flower_r.webp',
      kicker:'SPIRIT FLOWER',
      desc:'Rキャラクターが完凸後に重複した際、代わりに獲得する交換素材。',
      tag:'交換素材'
    },
    {
      id:'flower_sr',
      source:'inventory',
      name:'聖霊花(SR)',
      img:'images/item_flower_sr.webp',
      kicker:'SPIRIT FLOWER',
      desc:'SRキャラクターが完凸後に重複した際、代わりに獲得する交換素材。',
      tag:'交換素材'
    }
  ];

  // build1645: SR確定単発チケット。抽選はサーバーで行う。
  OTHER_ITEMS.push({id:'sr_guaranteed_ticket',source:'inventory',name:'SR確定ガチャTICKET',
    img:'images/gacha_ticket_10.webp',kicker:'SR GUARANTEED',
    desc:'指定SR13体から1体確定。邂逅の「超特別邂逅」から使用。',tag:'ガチャ'});

  // build1813: 使用型チケット（レイドリセット券・位相回遊スキップ券・創世ptルーレット券）。定義は item_tickets.js
  if(window.ItemTickets && Array.isArray(window.ItemTickets.ORDER)){
    window.ItemTickets.ORDER.forEach(id=>{
      const m=window.ItemTickets.ITEMS[id];
      if(m) OTHER_ITEMS.push({id:m.id,source:'inventory',name:m.name,img:m.img,kicker:m.kicker,desc:m.desc,tag:m.tag,useTicket:true});
    });
  }

  const FLOWER_SR_EXCHANGES = [
    {id:'skin_112_limited_01',cost:3,characterId:112,name:'トワ（光の姿） 雪桜',img:'images/chara_112_b_panel.webp',desc:'限定衣装を解放'},
    {id:'noah_ticket_1',cost:1,name:'ノア挑戦チケット ×1',img:'images/special_stage_ticket.webp',desc:'SPECIAL STAGE「理想郷 -ノア-」へ挑戦'},
    {id:'flower_r_3',cost:1,name:'聖霊花(R) ×3',img:'images/item_flower_r.webp',desc:'聖霊花(R)を3個獲得'},
    {id:'sr_ticket_1',cost:5,name:'SR確定ガチャTICKET ×1',img:'images/gacha_ticket_10.webp',desc:'恒常SRが1体確定する単発チケット'}
  ];

  const FLOWER_R_EXCHANGES = [
    {group:'R ×25',id:'flower_sr_1',cost:25,name:'聖霊花(SR) ×1',img:'images/item_flower_sr.webp',desc:'聖霊花(SR)を1個獲得'},
    // build2221: プロフィールのカードデザイン（各1回）。付与はサーバー（exchange_spirit_flower_r → player_profile_card_designs）
    {group:'R ×5',id:'pcard_study',cost:5,designId:'study',name:'陽だまりの書斎',img:'images/profile_card_study.webp',desc:'カードデザインを解放（プロフィール）'},
    {group:'R ×5',id:'pcard_festival',cost:5,designId:'festival',name:'星夜の祝祭',img:'images/profile_card_festival.webp',desc:'カードデザインを解放（プロフィール）'},
    {
      group:'R ×1',
      id:'exp_gold_5',
      cost:1,
      name:'経験値素材・金 ×5',
      img:'images/item_exp_gold.webp',
      desc:'強化素材・金を5個獲得'
    },
    {
      group:'R ×1',
      id:'kyoumei_1',
      cost:1,
      name:'共鳴石 ×1',
      img:'images/item_kyoumeistone.webp',
      desc:'共鳴石を1個獲得'
    },
    {
      group:'R ×1',
      id:'vessel_fire_2',
      cost:1,
      name:'魂の器(火) ×2',
      img:'images/item_soul_vessel_fire.webp',
      desc:'火属性の器を2個獲得'
    },
    {
      group:'R ×1',
      id:'vessel_aqua_2',
      cost:1,
      name:'魂の器(水) ×2',
      img:'images/item_soul_vessel_aqua.webp',
      desc:'水属性の器を2個獲得'
    },
    {
      group:'R ×1',
      id:'vessel_wood_2',
      cost:1,
      name:'魂の器(木) ×2',
      img:'images/item_soul_vessel_wood.webp',
      desc:'木属性の器を2個獲得'
    },
    {
      group:'R ×1',
      id:'vessel_dark_2',
      cost:1,
      name:'魂の器(闇) ×2',
      img:'images/item_soul_vessel_dark.webp',
      desc:'闇属性の器を2個獲得'
    },
    {
      group:'R ×1',
      id:'vessel_light_2',
      cost:1,
      name:'魂の器(光) ×2',
      img:'images/item_soul_vessel_light.webp',
      desc:'光属性の器を2個獲得'
    },
    {
      group:'R ×3',
      id:'exp_set_10',
      cost:3,
      name:'経験値素材セット',
      img:'images/item_exp_gold.webp',
      desc:'金・銀・銅を各10個ずつ獲得'
    },
    {
      group:'R ×3',
      id:'vessel_all_1',
      cost:3,
      name:'各種器セット',
      img:'images/item_kyoumeistone.webp',
      desc:'火・水・木・闇・光の器を各1個獲得'
    },
    {
      group:'R ×5',
      id:'event_ticket_silver',
      cost:5,
      name:'イベントticket銀',
      img:'',
      desc:'今後実装予定',
      disabled:true
    },
    {
      group:'R ×10',
      id:'event_ticket_gold',
      cost:10,
      name:'イベントticket金',
      img:'',
      desc:'今後実装予定',
      disabled:true
    },
    {
      group:'R ×10',
      id:'skin_3_limited_01',
      cost:10,
      name:'限定衣装',
      characterId:3,
      img:'images/chara_03_b_panel.webp',
      desc:'キャラクター衣装を解放'
    },
    {
      group:'R ×10',
      id:'skin_9_limited_01',
      cost:10,
      name:'限定衣装',
      characterId:9,
      img:'images/chara_09_b_panel.webp',
      desc:'キャラクター衣装を解放'
    },
    {
      group:'R ×10',
      id:'skin_20_limited_01',
      cost:10,
      name:'限定衣装',
      characterId:20,
      img:'images/chara_20_b_panel.webp',
      desc:'キャラクター衣装を解放'
    },
    {
      group:'R ×10',
      id:'skin_36_limited_01',
      cost:10,
      name:'限定衣装',
      characterId:36,
      img:'images/chara_36_b_panel.webp',
      desc:'キャラクター衣装を解放'
    }
    // build1706: レオナクロス ハロウィン衣装はお知らせのプレゼントで全員に配布（交換所には出さない）
  ];

  let state = {
    tab:'evolution',
    loading:false,
    items:{},
    sellPrices:{},
    coin:0,
    specialStageTicket:0,
    sellItemId:'',
    sellQty:1,
    exchanging:false
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
    // build1711: レイドボスの欠片（〇〇の欠片／images/raid_piece_<キャラ名>.webp）。定義は raid_event.js に一本化。
    if(typeof window.getRaidPieceItemMeta==='function'){
      Object.keys(state.items||{}).forEach(id=>{
        if(master[id]) return;
        const pm=window.getRaidPieceItemMeta(id);
        if(pm) master[id]=pm;
      });
    }
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

  // 進化素材は明示的な許可リストのみ。チケット・記憶・交換アイテムは所持していても表示しない。
  function isEvolutionItem(id){
    if(RETIRED_EVOLUTION_ITEMS.has(id)) return false;
    if(id==='kyoumei_stone') return true;
    if(/^soul_vessel_(fire|aqua|wood|dark|light|mystis|chaos)$/.test(id)) return true;
    // レイド欠片の正本定義を参照し、名前が似た非レイド素材は含めない。
    return typeof window.getRaidPieceItemMeta==='function' && !!window.getRaidPieceItemMeta(id);
  }

  function getEvolutionIds(){
    const seen=new Set();
    const ids=[];
    function add(id){ if(isEvolutionItem(id) && !seen.has(id)){seen.add(id);ids.push(id);} }
    SELLABLE_DEFAULT_ORDER.forEach(add);
    Object.keys(state.items).forEach(add);
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

    // build2147: 衣装（所持している限定衣装。キャラ未所持の衣装も表示）
    if(state.tab==='skin'){
      if(kicker) kicker.textContent='OUTFIT';
      if(title) title.textContent='衣装';
      const api=window.CharacterSkins;
      if(api && typeof api.isLoaded==='function' && !api.isLoaded() && typeof api.loadMySkins==='function'){
        list.innerHTML='<div class="item-management-loading">読み込み中...</div>';
        api.loadMySkins(true).then(()=>{ if(state.tab==='skin') render(); });
        return;
      }
      const owned=(api && typeof api.listOwnedSkins==='function') ? api.listOwnedSkins() : [];
      if(!owned.length){
        list.innerHTML='<div class="item-management-empty">まだ衣装を持っていません。<br>イベントや交換所で手に入る限定衣装がここに並びます。</div>';
        return;
      }
      const charas=Array.isArray(window.CHARACTERS)?window.CHARACTERS:[];
      list.innerHTML=owned.map(({characterId,skin})=>{
        const c=charas.find(x=>x&&Number(x.id)===Number(characterId));
        const cname=(c&&c.name)||'';
        const hasChara=!!(api.isCharacterOwned && api.isCharacterOwned(characterId));
        const wearing=hasChara && api.getEquippedSkinId && api.getEquippedSkinId(characterId)===skin.id;
        const status=!hasChara
          ? '<span class="item-skin-status is-locked">'+escapeHtml(cname)+'を入手すると着替えられます</span>'
          : (wearing
              ? '<span class="item-skin-status is-wearing">着用中</span>'
              : '<span class="item-skin-status">キャラ詳細で着替えられます</span>');
        return ''+
          '<article class="item-row item-row-other item-row-skin'+(hasChara?'':' is-chara-missing')+'" data-skin-preview="'+Number(characterId)+'" role="button" tabindex="0" aria-label="'+escapeHtml(cname+' '+(skin.name||'限定衣装'))+'">'+
            '<div class="item-row-icon item-row-icon-skin"><img src="'+escapeHtml(skin.panel||skin.home||'')+'" alt="" onerror="this.style.display=\'none\'"></div>'+
            '<div class="item-row-main">'+
              '<div class="item-row-kicker">LIMITED OUTFIT</div>'+
              '<div class="item-row-name">'+escapeHtml(cname)+'（'+escapeHtml(skin.name||'限定衣装')+'）</div>'+
              '<div class="item-row-desc">'+status+'</div>'+
            '</div>'+
          '</article>';
      }).join('');
      return;
    }

    if(state.tab==='other'){
      if(kicker) kicker.textContent='OTHER ITEM';
      if(title) title.textContent='その他';

      list.innerHTML=OTHER_ITEMS.map(meta=>{
        const qty=meta.source==='profile'
          ? state.specialStageTicket
          : Math.max(0,Number(state.items[meta.id]||0));

        const isFlowerR=meta.id==='flower_r';
        const isFlowerSR=meta.id==='flower_sr';
        const actionHtml=isFlowerR
          ? '<div class="item-row-actions item-row-actions-other"><button class="item-exchange-open-btn" type="button" data-open-flower-exchange>交換</button></div>'
          : (isFlowerSR
              ? '<div class="item-row-actions item-row-actions-other"><button class="item-exchange-open-btn" type="button" data-open-flower-sr-exchange>交換</button></div>'
              : ((meta.useTicket || meta.id==='special_stage_ticket' || meta.id==='tower_limited_ten_ticket' || meta.id==='sr_guaranteed_ticket')
                  ? '<div class="item-row-actions item-row-actions-other"><button class="item-exchange-open-btn" type="button" data-use-other-ticket="'+escapeHtml(meta.id)+'" '+(qty>0?'':'disabled')+'>使用</button></div>'
                  : ''));

        return ''+
          '<article class="item-row item-row-other'+(qty<=0?' is-zero':'')+(meta.useTicket?' is-ticket':'')+'">'+
            renderIcon(meta,'other')+
            '<div class="item-row-main">'+
              '<div class="item-row-kicker">'+escapeHtml(meta.kicker||'OTHER ITEM')+'</div>'+
              '<div class="item-row-name">'+escapeHtml(meta.name)+'</div>'+
              '<div class="item-row-desc">'+escapeHtml(meta.desc||'')+'</div>'+
              '<div class="item-row-count item-row-count-other"><span>OWNED</span><strong>'+(isFlowerSR&&qty<=0?'—':fmt(qty))+'</strong></div>'+
            '</div>'+
            actionHtml+
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
      const price=Math.max(0,Number(state.sellPrices[id]||0));
      const sellable=price>0 && qty>0;
      return ''+
        '<article class="item-row'+(qty<=0?' is-zero':'')+'">'+
          renderIcon(meta,'evolution')+
          '<div class="item-row-main">'+
            '<div class="item-row-kicker">EVOLUTION ITEM</div>'+
            '<div class="item-row-name">'+escapeHtml(meta.name||id)+'</div>'+
            '<div class="item-row-desc">'+escapeHtml(meta.desc||'進化に使用する素材。')+'</div>'+
            '<div class="item-row-count"><span>OWNED</span><strong>'+fmt(qty)+'</strong></div>'+
          '</div>'+
          (pieceActionHtml(id,qty) ||
          '<div class="item-row-actions">'+
            '<button class="item-sell-btn" type="button" data-sell-item="'+escapeHtml(id)+'" '+(sellable?'':'disabled')+'>売却</button>'+
            '<div class="item-row-price">'+
              (price>0?'<img src="images/icon_coin.webp" alt=""> '+fmt(price)+' / 個':'売却対象外')+
            '</div>'+
          '</div>')+
        '</article>';
    }).join('');
  }

  // build2236: キャラ入手の共通処理（レイド欠片の交換など）
  function resolveCharaId(id, name){
    const n=Number(id||0); if(n>0) return n;
    const list=Array.isArray(window.CHARACTERS)?window.CHARACTERS:[];
    const c=list.find(x=>x&&String(x.name)===String(name||''));
    return c?Number(c.id):0;
  }
  async function syncOwnedCharacter(charaId){
    let synced=false;
    if(charaId && typeof window.refreshOwnedCharacterById==='function'){
      try{ await window.refreshOwnedCharacterById(charaId); synced=true; }catch(err){ console.warn('[ItemManagement] owned character sync failed',err); }
    }
    if(!synced && typeof window.loadDatabaseFromSupabase==='function'){ try{ await window.loadDatabaseFromSupabase(); synced=true; }catch(_){ } }
    return synced;
  }
  function showCharacterObtainModal(o){
    o=o||{};
    const cid=Number(o.charaId||0);
    const list=Array.isArray(window.CHARACTERS)?window.CHARACTERS:[];
    const c=list.find(x=>x&&Number(x.id)===cid)||{};
    const name=String(o.name||c.name||'');
    const img=c.panelImg||(cid?'images/chara_'+String(cid).padStart(2,'0')+'_panel.webp':'');
    const msg=String(o.message||(name+' が仲間になりました！'));
    const title=o.converted?'CONVERTED':(/限界突破|凸/.test(msg)?'LIMIT BREAK':'NEW CHARACTER');
    if(!document.getElementById('zs-obtain-style')){
      const st=document.createElement('style'); st.id='zs-obtain-style';
      st.textContent=`
        #zs-obtain-modal{position:fixed;inset:0;z-index:520600;display:flex;align-items:center;justify-content:center;background:rgba(255,250,238,.84);
          backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);animation:zsObIn .45s ease-out both}
        #zs-obtain-modal .zso-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:11px;padding:24px 26px 18px;width:min(300px,84vw);box-sizing:border-box;
          border:1px solid #d6b878;border-radius:4px;background:linear-gradient(180deg,#fffdf6,#f6ecd6);box-shadow:0 10px 30px rgba(120,90,40,.25);animation:zsObPop .55s cubic-bezier(.2,1.3,.4,1) both}
        #zs-obtain-modal .zso-card::before{content:"";position:absolute;inset:5px;border:1px solid rgba(214,184,120,.45);pointer-events:none}
        #zs-obtain-modal small{font:600 9px/1 "Cinzel",serif;letter-spacing:.36em;color:#b58a3e}
        #zs-obtain-modal .zso-title{font:700 17px/1 "Cinzel",serif;letter-spacing:.22em;color:#8a6224}
        #zs-obtain-modal .zso-face{position:relative;width:150px;height:150px}
        #zs-obtain-modal .zso-face::before{content:"";position:absolute;inset:-14px;border-radius:50%;background:radial-gradient(circle,rgba(255,226,150,.75),rgba(255,226,150,0) 68%);animation:zsObGlow 2.2s ease-in-out infinite alternate}
        #zs-obtain-modal img{position:relative;width:150px;height:150px;object-fit:cover;object-position:50% 16%;border-radius:50%;border:2px solid #e2c88e;box-shadow:0 0 22px rgba(255,214,120,.65);background:#fff8e8}
        #zs-obtain-modal .zso-name{font:700 20px/1.2 "Noto Serif JP",serif;color:#4f3a22;letter-spacing:.08em}
        #zs-obtain-modal .zso-msg{font:500 13px/1.5 "Noto Serif JP",serif;color:#6b5434;text-align:center}
        #zs-obtain-modal button{margin-top:4px;padding:9px 30px;border:1px solid #c9a25a;background:#fffaf0;color:#6b5434;font:600 13px/1 "Noto Serif JP",serif;letter-spacing:.2em;border-radius:2px}
        @keyframes zsObIn{from{opacity:0}to{opacity:1}}
        @keyframes zsObPop{from{opacity:0;transform:scale(.86) translateY(10px)}to{opacity:1;transform:none}}
        @keyframes zsObGlow{from{opacity:.55;transform:scale(.95)}to{opacity:1;transform:scale(1.05)}}
        @media (prefers-reduced-motion:reduce){#zs-obtain-modal,#zs-obtain-modal .zso-card,#zs-obtain-modal .zso-face::before{animation:none}}`;
      document.head.appendChild(st);
    }
    document.getElementById('zs-obtain-modal')?.remove();
    const el=document.createElement('div'); el.id='zs-obtain-modal'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true');
    el.setAttribute('data-skin-ignore','');
    el.innerHTML='<div class="zso-card"><small>'+escapeHtml(o.kicker||'GET')+'</small><div class="zso-title">'+title+'</div>'+
      (img?'<div class="zso-face"><img src="'+escapeHtml(img)+'" alt="" onerror="this.style.visibility=\'hidden\'"></div>':'')+
      '<div class="zso-name">'+escapeHtml(name)+'</div><div class="zso-msg">'+escapeHtml(msg)+'</div><button type="button">閉じる</button></div>';
    el.querySelector('button').addEventListener('click',()=>el.remove());
    el.addEventListener('click',e=>{ if(e.target===el) el.remove(); });
    document.body.appendChild(el);
  }
  window.showCharacterObtainModal=showCharacterObtainModal;
  window.syncOwnedCharacterById=syncOwnedCharacter;

  // build2235: レイドボスの欠片は、必要数に達していればどの日でもここからキャラと交換できる
  function raidPieceMeta(id){
    try{ const m=typeof window.getRaidPieceItemMeta==='function'?window.getRaidPieceItemMeta(id):null; return m&&m.bossKey?m:null; }catch(_){ return null; }
  }
  function pieceActionHtml(id,qty){
    const pm=raidPieceMeta(id); if(!pm) return '';
    const need=Math.max(1,Number(pm.need||10)), ready=qty>=need;
    return '<div class="item-row-actions">'+
      '<button class="item-sell-btn item-piece-exchange-btn'+(ready?' is-ready':'')+'" type="button" data-piece-exchange="'+escapeHtml(id)+'" '+(ready&&!state.exchanging?'':'disabled')+'>交換</button>'+
      '<div class="item-row-price">'+(ready?'<b class="item-piece-ready">'+escapeHtml(pm.charaName)+'と交換できます</b>':'あと'+fmt(need-qty)+'個で交換')+'</div>'+
    '</div>';
  }
  async function exchangeRaidPiece(id){
    const pm=raidPieceMeta(id); if(!pm||state.exchanging) return;
    const need=Math.max(1,Number(pm.need||10));
    if(Number(state.items[id]||0)<need) return;
    if(!window.confirm(pm.charaName+'の欠片を'+need+'個使って、'+pm.charaName+'を仲間にします。\n\nOK？')) return;
    state.exchanging=true; render();
    try{
      const client=window.zsSupabase;
      if(!client||typeof client.rpc!=='function') throw new Error('サーバーへ接続できません');
      const userId=String(localStorage.getItem('zukan_user_id')||'').trim();
      let res=await client.rpc('exchange_raid_boss_piece',{p_user_id:userId,p_boss_key:pm.bossKey});
      if(res&&res.error){
        const msg=String(res.error.message||res.error.code||'');
        if(/PGRST202|does not exist|Could not find the function/i.test(msg)) throw new Error('サーバーの更新が必要です（exchange_raid_boss_piece が未適用）');
        throw res.error;
      }
      let data=res&&res.data; if(typeof data==='string') data=JSON.parse(data);
      if(!data||data.ok===false) throw new Error((data&&data.message)||'交換できませんでした');
      await fetchSnapshot();
      if(userId&&typeof window.loadInventoryFromSupabase==='function') try{await window.loadInventoryFromSupabase(userId)}catch(_){}
      // build2236: 再起動なしで所持BOXへ反映し、入手モーダルを出す
      const charaId=resolveCharaId(data.chara_id||data.character_id, pm.charaName);
      await syncOwnedCharacter(charaId);
      try{window.dispatchEvent(new CustomEvent('sasaphia:growth-resources-changed'))}catch(_){}
      showCharacterObtainModal({ charaId, name:data.chara_name||pm.charaName, message:data.message, converted:!!data.converted, kicker:'RAID PIECE EXCHANGE' });
    }catch(err){ console.error('[ItemManagement] raid piece exchange failed',err); toast(err&&err.message||'交換できませんでした'); }
    finally{ state.exchanging=false; render(); }
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
      price:RETIRED_EVOLUTION_ITEMS.has(id)
        ? 0
        : Math.max(0,Math.floor(Number(state.sellPrices[id]||0)))
    };
  }

  function updateSellUI(typing){
    const id=state.sellItemId;
    if(!id) return;
    const data=getSellMeta(id);
    const max=Math.max(1,data.owned);
    // build2215: 入力中（typing）は空欄・途中の値を書き換えない。確定時に1〜最大へ丸める
    if(!typing) state.sellQty=Math.max(1,Math.min(max,Math.floor(Number(state.sellQty)||1)));
    const q=Math.max(0,Math.min(max,Math.floor(Number(state.sellQty)||0)));

    const qty=document.getElementById('item-sell-qty');
    if(qty && !typing){
      qty.value=String(state.sellQty);
    }

    const owned=document.getElementById('item-sell-owned');
    const unit=document.getElementById('item-sell-unit-price');
    const total=document.getElementById('item-sell-total-price');
    if(owned) owned.textContent=fmt(data.owned);
    if(unit) unit.textContent=fmt(data.price);
    if(total) total.textContent=fmt(data.price*q);

    const confirm=document.getElementById('item-sell-confirm');
    if(confirm) confirm.disabled=!(data.owned>0 && data.price>0 && q>0);
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


  /* ---------------------------------------------------------
     build2215: 数量入力（売却・交換で共通）
     ・数字を自由に入力できる（入力中は空欄も可）
     ・最大値を超えたら、その場で最大値に置き換える
     ・空欄／0のまま入力欄を離れたら1にする
     ・タップで数字を全選択（そのまま打ち直せる）
     --------------------------------------------------------- */
  function bindQtyInput(input,getMax,onChange){
    if(!input || input.dataset.qtyBound==='1') return;
    input.dataset.qtyBound='1';
    try{ input.type='text'; }catch(_){}
    input.setAttribute('inputmode','numeric');
    input.setAttribute('pattern','[0-9]*');
    input.setAttribute('autocomplete','off');
    input.setAttribute('enterkeyhint','done');
    input.addEventListener('focus',()=>{ setTimeout(()=>{ try{input.select()}catch(_){} },0); });
    input.addEventListener('input',()=>{
      const max=Math.max(1,Math.floor(Number(getMax())||1));
      const raw=String(input.value||'')
        .replace(/[０-９]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0xFEE0))
        .replace(/\D/g,'').replace(/^0+/,'');
      if(raw===''){ if(input.value!=='') input.value=''; onChange(0,true); return; }
      let n=parseInt(raw,10);
      if(n>max) n=max;
      if(input.value!==String(n)) input.value=String(n);
      onChange(n,true);
    });
    const settle=()=>{
      const max=Math.max(1,Math.floor(Number(getMax())||1));
      let n=parseInt(String(input.value||'').replace(/\D/g,''),10);
      if(!(n>0)) n=1;
      if(n>max) n=max;
      input.value=String(n);
      onChange(n,false);
    };
    input.addEventListener('blur',settle);
    input.addEventListener('change',settle);
    input.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); input.blur(); } });
  }

  /* 交換の数量ダイアログ（売却ダイアログと同じ見た目） */
  const exchangeQty={kind:'',id:'',qty:1};
  function exchangeDef(kind,id){
    return (kind==='sr'?FLOWER_SR_EXCHANGES:FLOWER_R_EXCHANGES).find(x=>x.id===id)||null;
  }
  function exchangeOwned(kind){
    return Math.max(0,Math.floor(Number(state.items[kind==='sr'?'flower_sr':'flower_r']||0)));
  }
  function exchangeMax(kind,def){
    if(!def||!(def.cost>0)) return 0;
    return Math.min(9999,Math.floor(exchangeOwned(kind)/def.cost));
  }
  function ensureExchangeQtyModal(){
    let modal=document.getElementById('item-exchange-qty-modal');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id='item-exchange-qty-modal';
    modal.className='item-sell-modal item-exchange-qty-modal';
    modal.hidden=true;
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML=
      '<div class="item-sell-backdrop" data-exchange-qty-close></div>'+
      '<section class="item-sell-dialog" role="dialog" aria-modal="true" aria-labelledby="item-exchange-qty-title">'+
        '<button type="button" class="item-sell-close" data-exchange-qty-close aria-label="閉じる">×</button>'+
        '<small class="item-sell-kicker">EXCHANGE</small>'+
        '<h2 id="item-exchange-qty-title">アイテム交換</h2>'+
        '<div class="item-sell-selected">'+
          '<div class="item-sell-icon" id="item-exchange-qty-icon"></div>'+
          '<div class="item-sell-copy"><strong id="item-exchange-qty-name">--</strong><span id="item-exchange-qty-owned">--</span></div>'+
        '</div>'+
        '<div class="item-sell-stepper">'+
          '<button type="button" id="item-exchange-qty-minus" aria-label="交換回数を減らす">−</button>'+
          '<input id="item-exchange-qty-input" type="text" value="1" inputmode="numeric" aria-label="交換回数">'+
          '<button type="button" id="item-exchange-qty-plus" aria-label="交換回数を増やす">＋</button>'+
          '<button type="button" id="item-exchange-qty-max">MAX</button>'+
        '</div>'+
        '<div class="item-sell-summary">'+
          '<div><span>消費</span><strong><img id="item-exchange-qty-cost-icon" src="images/item_flower_r.webp" alt=""> <b id="item-exchange-qty-cost">0</b></strong></div>'+
          '<div><span>獲得</span><strong><b id="item-exchange-qty-gain">--</b></strong></div>'+
        '</div>'+
        '<button type="button" class="item-sell-confirm" id="item-exchange-qty-confirm">交換する</button>'+
        '<p class="item-sell-note">交換後のアイテムは直接アイテムBOXへ加算されます。</p>'+
      '</section>';
    // 交換所のモーダル（item-exchange-modal）より手前に出す
    modal.style.zIndex='18100';
    const host=document.getElementById('screen-item')||document.body;
    host.appendChild(modal);
    modal.querySelectorAll('[data-exchange-qty-close]').forEach(el=>el.addEventListener('click',closeExchangeQty));
    const input=modal.querySelector('#item-exchange-qty-input');
    bindQtyInput(input,()=>exchangeMax(exchangeQty.kind,exchangeDef(exchangeQty.kind,exchangeQty.id)),(n,typing)=>{
      exchangeQty.qty=n; updateExchangeQtyUI(typing);
    });
    modal.querySelector('#item-exchange-qty-minus').addEventListener('click',()=>{exchangeQty.qty=Math.max(1,(exchangeQty.qty||1)-1);updateExchangeQtyUI();});
    modal.querySelector('#item-exchange-qty-plus').addEventListener('click',()=>{exchangeQty.qty=(exchangeQty.qty||0)+1;updateExchangeQtyUI();});
    modal.querySelector('#item-exchange-qty-max').addEventListener('click',()=>{exchangeQty.qty=exchangeMax(exchangeQty.kind,exchangeDef(exchangeQty.kind,exchangeQty.id));updateExchangeQtyUI();});
    modal.querySelector('#item-exchange-qty-confirm').addEventListener('click',()=>{
      const n=Math.max(1,Math.floor(Number(exchangeQty.qty)||0));
      const kind=exchangeQty.kind, id=exchangeQty.id;
      closeExchangeQty();
      if(kind==='sr') exchangeFlowerSR(id,n,true); else exchangeFlowerR(id,n);
    });
    return modal;
  }
  function gainText(def,qty){
    // 「共鳴石 ×1」→「共鳴石 ×(1×回数)」
    const m=String(def.name||'').match(/^(.*?)\s*[×x]\s*(\d+)\s*$/);
    if(m) return m[1]+' ×'+fmt(Number(m[2])*qty);
    return (def.name||'')+(qty>1?' ×'+fmt(qty):'');
  }
  function updateExchangeQtyUI(typing){
    const modal=document.getElementById('item-exchange-qty-modal');
    if(!modal) return;
    const def=exchangeDef(exchangeQty.kind,exchangeQty.id);
    if(!def) return;
    const max=Math.max(1,exchangeMax(exchangeQty.kind,def));
    if(!typing) exchangeQty.qty=Math.max(1,Math.min(max,Math.floor(Number(exchangeQty.qty)||1)));
    const q=Math.max(0,Math.min(max,Math.floor(Number(exchangeQty.qty)||0)));
    const input=modal.querySelector('#item-exchange-qty-input');
    if(input && !typing) input.value=String(q||1);
    const sr=exchangeQty.kind==='sr';
    modal.querySelector('#item-exchange-qty-owned').textContent='所持 '+(sr?'聖霊花(SR)':'聖霊花(R)')+' '+fmt(exchangeOwned(exchangeQty.kind))+'（最大 '+fmt(max)+'回）';
    modal.querySelector('#item-exchange-qty-cost-icon').src=sr?'images/item_flower_sr.webp':'images/item_flower_r.webp';
    modal.querySelector('#item-exchange-qty-cost').textContent=fmt(def.cost*q);
    modal.querySelector('#item-exchange-qty-gain').textContent=q>0?gainText(def,q):'--';
    modal.querySelector('#item-exchange-qty-confirm').disabled=!(q>0)||!!state.exchanging;
  }
  function openExchangeQty(kind,id){
    const def=exchangeDef(kind,id);
    if(!def) return;
    if(exchangeMax(kind,def)<1){ toast(kind==='sr'?'聖霊花(SR)が不足しています':'聖霊花(R)が不足しています'); return; }
    const modal=ensureExchangeQtyModal();
    exchangeQty.kind=kind; exchangeQty.id=id; exchangeQty.qty=1;
    modal.querySelector('#item-exchange-qty-name').textContent=def.name;
    modal.querySelector('#item-exchange-qty-icon').innerHTML=def.img?'<img src="'+escapeHtml(def.img)+'" alt="" onerror="this.style.display=\'none\'">':'';
    updateExchangeQtyUI();
    modal.hidden=false; modal.setAttribute('aria-hidden','false');
  }
  function closeExchangeQty(){
    const modal=document.getElementById('item-exchange-qty-modal');
    if(modal){ modal.hidden=true; modal.setAttribute('aria-hidden','true'); }
  }
  // サーバーに回数指定版（p_quantity）が無い間は、1回ずつの交換を繰り返す
  function isMissingRpcSignature(err){
    const msg=String(err&&(err.message||err.details||err.hint)||'');
    return (err&&err.code==='PGRST202')||/Could not find the function|function .* does not exist|p_quantity/i.test(msg);
  }
  async function callExchangeRpc(fn,exchangeId,qty,onProgress){
    const client=window.zsSupabase;
    if(!client || typeof client.rpc!=='function') throw new Error('サーバーへ接続できません');
    const parse=res=>{
      if(res && res.error) throw res.error;
      let r=res?res.data:null;
      if(typeof r==='string'){ try{r=JSON.parse(r)}catch(_){} }
      if(!r || r.ok===false) throw new Error((r&&r.message)||'交換に失敗しました');
      return r;
    };
    if(qty<=1) return parse(await client.rpc(fn,{p_exchange_id:exchangeId}));
    try{
      const r=parse(await client.rpc(fn,{p_exchange_id:exchangeId,p_quantity:qty}));
      if(r.exchanged===undefined) r.exchanged=qty;
      return r;
    }catch(err){
      if(!isMissingRpcSignature(err)) throw err;
    }
    // 旧サーバー：1回ずつ。途中で失敗したら、そこまでの結果を返す
    const total={ok:true,grants:{},exchanged:0};
    for(let i=0;i<qty;i++){
      if(onProgress) onProgress(i,qty);
      let r;
      try{ r=parse(await client.rpc(fn,{p_exchange_id:exchangeId})); }
      catch(err){ if(total.exchanged>0){ total.partialError=err; break; } throw err; }
      total.exchanged++;
      Object.keys(r.grants||{}).forEach(k=>{ total.grants[k]=(total.grants[k]||0)+Math.max(0,Math.floor(Number(r.grants[k])||0)); });
      ['remaining_flower_r','remaining_flower_sr','skin'].forEach(k=>{ if(r[k]!==undefined) total[k]=r[k]; });
    }
    return total;
  }

  function closeFlowerExchange(){
    const modal=document.getElementById('spirit-flower-exchange-modal');
    if(!modal) return;
    modal.hidden=true;
    modal.setAttribute('aria-hidden','true');
  }

  function renderFlowerExchange(){
    const list=document.getElementById('spirit-flower-exchange-list');
    const ownedEl=document.getElementById('flower-r-exchange-owned');
    if(!list) return;

    const owned=Math.max(0,Math.floor(Number(state.items.flower_r||0)));
    if(ownedEl) ownedEl.textContent=fmt(owned);

    // build1475: 必要数は各行に表示するため、グループ見出し（R ×1 など）は出さない。
    list.innerHTML=FLOWER_R_EXCHANGES.map(item=>{
      const groupHead='';

      const skinId=item.characterId ? 'limited_01' : '';
      const skinOwned=!!(item.characterId && window.CharacterSkins &&
        typeof window.CharacterSkins.isOwned==='function' &&
        window.CharacterSkins.isOwned(item.characterId,skinId));
      // build2221: カードデザインは所持済みなら交換不可（取得済み）
      const designOwned=!!(item.designId && window.ProfileCardDesign && window.ProfileCardDesign.isOwned(item.designId));
      const doneOnce=skinOwned||designOwned;
      const canExchange=!item.disabled && !doneOnce && owned>=item.cost && !state.exchanging;
      // build1489: 限定衣装は画像タップで衣装の立ち絵をプレビューできる。build2221: カードデザインも背景をプレビュー
      const previewAttr=item.characterId ? ' data-skin-preview="'+Number(item.characterId)+'" role="button" tabindex="0" aria-label="限定衣装をプレビュー"'
        : item.designId ? ' data-design-preview="'+escapeHtml(item.designId)+'" role="button" tabindex="0" aria-label="カードデザインをプレビュー"' : '';
      const icon=item.img
        ? '<div class="item-exchange-reward-icon'+(item.characterId||item.designId?' is-previewable':'')+(item.designId?' is-design':'')+'"'+previewAttr+'><img src="'+escapeHtml(item.img)+'" alt="" onerror="this.style.display=\'none\'"></div>'
        : '<div class="item-exchange-reward-icon is-placeholder"><span>?</span></div>';

      let displayName=item.name;
      let displayDesc=item.desc||'';
      if(item.characterId){
        const c=(Array.isArray(window.CHARACTERS)?window.CHARACTERS:[]).find(x=>x&&Number(x.id)===Number(item.characterId));
        const sk=window.CharacterSkins&&typeof window.CharacterSkins.getSkin==='function'?window.CharacterSkins.getSkin(item.characterId,skinId):null;
        displayName=(c&&c.name?c.name+' ':'')+((sk&&sk.name)||'限定衣装');
        displayDesc=skinOwned?'取得済み':'キャラクター衣装を解放';
      }
      if(item.designId && designOwned) displayDesc='取得済み・プロフィールで設定';

      return groupHead+
        '<article class="item-exchange-row'+(item.disabled?' is-disabled':'')+(doneOnce?' is-owned':'')+'">'+
          icon+
          '<div class="item-exchange-copy">'+
            '<strong>'+escapeHtml(displayName)+'</strong>'+
            '<span>'+escapeHtml(displayDesc)+'</span>'+
          '</div>'+
          '<div class="item-exchange-cost'+(owned<item.cost?' is-short':'')+'" aria-label="必要数 聖霊花(R) '+fmt(item.cost)+'">'+
            '<img src="images/item_flower_r.webp" alt="" onerror="this.style.visibility=\'hidden\'"><b>'+fmt(item.cost)+'</b>'+
          '</div>'+
          '<button type="button" class="item-exchange-btn" data-flower-exchange-id="'+escapeHtml(item.id)+'" '+
            (canExchange?'':'disabled')+'>'+
            (item.disabled?'準備中':(doneOnce?'取得済み':'交換'))+
          '</button>'+
        '</article>';
    }).join('');
  }

  function openFlowerExchange(){
    const modal=document.getElementById('spirit-flower-exchange-modal');
    if(!modal) return;
    renderFlowerExchange();
    modal.hidden=false;
    modal.setAttribute('aria-hidden','false');
  }

  function buildExchangeGrantText(grants){
    const evo=evolutionMaster();
    const levels=Object.fromEntries(levelMaster().map(x=>[x.id,x]));
    return Object.keys(grants||{}).map(id=>{
      const meta=levels[id]||evo[id]||OTHER_ITEMS.find(x=>x.id===id)||{name:id};
      return (meta.name||id)+' ×'+fmt(grants[id]);
    }).join(' / ');
  }

  async function exchangeFlowerR(exchangeId,quantity){
    if(state.exchanging) return;
    const def=FLOWER_R_EXCHANGES.find(x=>x.id===exchangeId);
    if(!def || def.disabled) return;

    const owned=Math.max(0,Math.floor(Number(state.items.flower_r||0)));
    // build2215: 回数指定（限定衣装は常に1回）
    const single=!!(def.characterId||def.designId);
    const qty=single?1:Math.max(1,Math.min(Math.floor(owned/def.cost),Math.floor(Number(quantity)||1)));
    if(owned<def.cost*qty){
      toast('聖霊花(R)が不足しています');
      return;
    }
    // build2221: カードデザインは所持済みなら交換しない。交換前に確認
    if(def.designId){
      if(window.ProfileCardDesign && window.ProfileCardDesign.isOwned(def.designId)){ toast('このカードデザインは取得済みです'); return; }
      if(!window.confirm('聖霊花(R) ×'+def.cost+' を消費して\nカードデザイン「'+def.name+'」を解放しますか？')) return;
    }

    state.exchanging=true;
    renderFlowerExchange();

    try{
      const result=await callExchangeRpc('exchange_spirit_flower_r',exchangeId,qty,(i,n)=>{
        const b=document.querySelector('[data-flower-exchange-id="'+exchangeId+'"]'); if(b) b.textContent='交換中 '+(i+1)+'/'+n;
      });

      if(result.remaining_flower_r!==undefined) state.items.flower_r=Math.max(0,Math.floor(Number(result.remaining_flower_r)||0));
      if(result.partialError) toast('途中で止まりました（'+fmt(result.exchanged)+'回まで交換済み）');
      Object.keys(result.grants||{}).forEach(id=>{
        state.items[id]=Math.max(0,Math.floor(Number(state.items[id]||0)))+
          Math.max(0,Math.floor(Number(result.grants[id]||0)));
      });

      const userId=String(localStorage.getItem('zukan_user_id')||'').trim();
      if(userId && typeof window.loadInventoryFromSupabase==='function'){
        try{await window.loadInventoryFromSupabase(userId)}catch(err){
          console.warn('[ItemManagement] exchange local inventory sync skipped',err);
        }
      }

      if(result.skin && result.skin.character_id && result.skin.skin_id){
        if(window.CharacterSkins && typeof window.CharacterSkins.notifySkinAcquired==='function'){
          window.CharacterSkins.notifySkinAcquired(result.skin.character_id,result.skin.skin_id);
        }
        if(window.CharacterSkins && typeof window.CharacterSkins.reloadMySkins==='function'){
          try{await window.CharacterSkins.reloadMySkins()}catch(_){}
        }
      }

      // build2221: カードデザインの解放
      const gotDesign=def.designId ? String(result.profile_card_design||def.designId) : '';
      if(gotDesign && window.ProfileCardDesign){
        try{ window.ProfileCardDesign.markOwned(gotDesign); }catch(_){}
        try{ window.ProfileCardDesign.loadOwned(); }catch(_){}
      }

      try{window.dispatchEvent(new CustomEvent('sasaphia:growth-resources-changed'))}catch(_){}
      renderFlowerExchange();
      render();

      if(gotDesign){
        toast('カードデザイン「'+def.name+'」を解放しました。プロフィールの CARD DESIGN から設定できます');
      }else if(result.skin && result.skin.character_id){
        const c=(Array.isArray(window.CHARACTERS)?window.CHARACTERS:[]).find(x=>x&&Number(x.id)===Number(result.skin.character_id));
        const skDone=window.CharacterSkins&&typeof window.CharacterSkins.getSkin==='function'?window.CharacterSkins.getSkin(def.characterId,'limited_01'):null;
        toast('交換しました：'+((c&&c.name)||'キャラクター')+' '+((skDone&&skDone.name)||'限定衣装'));
      }else{
        toast('交換しました：'+buildExchangeGrantText(result.grants||{}));
      }
    }catch(err){
      console.error('[ItemManagement] spirit flower exchange failed',err);
      toast(err&&err.message?err.message:'交換に失敗しました');
    }finally{
      state.exchanging=false;
      renderFlowerExchange();
    }
  }

  function closeFlowerSRExchange(){
    const modal=document.getElementById('spirit-flower-sr-exchange-modal');
    if(modal){modal.hidden=true;modal.setAttribute('aria-hidden','true');}
  }
  function srSkinOwned(item){return !!(item.characterId && window.CharacterSkins && window.CharacterSkins.isOwned(item.characterId,'limited_01'));}
  function renderFlowerSRExchange(){
    const list=document.getElementById('spirit-flower-sr-exchange-list');
    if(!list) return;
    const owned=Math.max(0,Math.floor(Number(state.items.flower_sr||0)));
    const count=document.getElementById('flower-sr-exchange-owned');
    if(count)count.textContent=fmt(owned);
    list.innerHTML=FLOWER_SR_EXCHANGES.map(item=>
      '<article class="item-exchange-row">'+
       '<div class="item-exchange-reward-icon"'+(item.characterId?' data-sr-skin-preview="'+item.characterId+'"':'')+'><img src="'+escapeHtml(item.img)+'" alt=""></div>'+
       '<div class="item-exchange-copy"><strong>'+escapeHtml(item.name)+'</strong><span>'+escapeHtml(item.desc)+'</span></div>'+
       '<div class="item-exchange-cost'+(owned<item.cost?' is-short':'')+'"><img src="images/item_flower_sr.webp" alt=""><b>'+fmt(item.cost)+'</b></div>'+
       '<button type="button" class="item-exchange-btn" data-flower-sr-exchange-id="'+escapeHtml(item.id)+'" '+(state.exchanging||owned<item.cost||srSkinOwned(item)?'disabled':'')+'>'+(srSkinOwned(item)?'取得済み':'交換')+'</button>'+
      '</article>'
    ).join('');
  }
  function openFlowerSRExchange(){
    renderFlowerSRExchange();
    const modal=document.getElementById('spirit-flower-sr-exchange-modal');
    if(modal){modal.hidden=false;modal.setAttribute('aria-hidden','false');}
  }
  async function exchangeFlowerSR(exchangeId,quantity,confirmed){
    if(state.exchanging)return;
    const def=FLOWER_SR_EXCHANGES.find(x=>x.id===exchangeId);
    if(!def||srSkinOwned(def))return;
    const ownedSr=Math.floor(Number(state.items.flower_sr||0));
    const qty=def.characterId?1:Math.max(1,Math.min(Math.floor(ownedSr/def.cost),Math.floor(Number(quantity)||1)));
    if(ownedSr<def.cost*qty){toast('聖霊花(SR)が不足しています');return;}
    // build2215: 数量ダイアログで確認済みなら確認を出さない（限定衣装は従来どおり確認）
    if(!confirmed && !window.confirm('聖霊花(SR) ×'+def.cost+' を消費して\n「'+def.name+'」に交換しますか？'))return;
    state.exchanging=true;renderFlowerSRExchange();
    try{
      const data=await callExchangeRpc('exchange_spirit_flower_sr',exchangeId,qty,(i,n)=>{
        const b=document.querySelector('[data-flower-sr-exchange-id="'+exchangeId+'"]'); if(b) b.textContent='交換中 '+(i+1)+'/'+n;
      });
      if(data.partialError) toast('途中で止まりました（'+fmt(data.exchanged)+'回まで交換済み）');
      if(data.skin && window.CharacterSkins){window.CharacterSkins.notifySkinAcquired(data.skin.character_id,data.skin.skin_id);try{await window.CharacterSkins.reloadMySkins()}catch(_){}}
      await fetchSnapshot();
      if(typeof window.loadInventoryFromSupabase==='function'){
        const userId=String(localStorage.getItem('zukan_user_id')||'').trim();
        if(userId)try{await window.loadInventoryFromSupabase(userId)}catch(_){}
      }
      render();renderFlowerSRExchange();
      try{window.dispatchEvent(new CustomEvent('sasaphia:growth-resources-changed'))}catch(_){}
      toast('交換しました：'+(qty>1?gainText(def,data.exchanged||qty):def.name));
    }catch(err){console.error('[ItemManagement] SR exchange failed',err);toast(err&&err.message||'交換に失敗しました');}
    finally{state.exchanging=false;renderFlowerSRExchange();}
  }
  async function useSRTicket(){
    if(state.exchanging||Number(state.items.sr_guaranteed_ticket||0)<1)return;
    if(!window.confirm('SR確定ガチャTICKETを1枚使って恒常SRを1体獲得しますか？'))return;
    state.exchanging=true;
    try{
      const client=window.zsSupabase;
      if(!client||typeof client.rpc!=='function')throw new Error('サーバーへ接続できません');
      const res=await client.rpc('use_sr_guaranteed_ticket');
      if(res&&res.error)throw res.error;
      let data=res&&res.data;if(typeof data==='string')data=JSON.parse(data);
      if(!data||data.ok===false)throw new Error((data&&data.message)||'チケットを使用できませんでした');
      await fetchSnapshot();
      const userId=String(localStorage.getItem('zukan_user_id')||'').trim();
      if(userId&&typeof window.loadInventoryFromSupabase==='function')try{await window.loadInventoryFromSupabase(userId)}catch(_){}
      render();
      try{window.dispatchEvent(new CustomEvent('sasaphia:growth-resources-changed'))}catch(_){}
      toast(data.converted?'SR確定：'+data.character_name+'（完凸分を聖霊花(SR)へ変換）':'SR確定：'+data.character_name+' を獲得！');
    }catch(err){console.error('[ItemManagement] SR ticket use failed',err);toast(err&&err.message||'チケットを使用できませんでした');}
    finally{state.exchanging=false;render();}
  }

  // build1489: 限定衣装プレビュー（chara_XX_b_cut.webp）。画像が無ければ衣装パネル画像を表示。
  function openSkinPreview(characterId){
    const id=Number(characterId||0);
    if(!id) return;
    const pad=String(id).padStart(2,'0');
    const skin=window.CharacterSkins && typeof window.CharacterSkins.getSkin==='function'
      ? window.CharacterSkins.getSkin(id,'limited_01') : null;
    const chain=(id===112?[skin&&skin.img,skin&&skin.panel]:['images/chara_'+pad+'_b_cut.webp', skin&&skin.home, skin&&skin.panel, 'images/chara_'+pad+'_b_panel.webp'])
      .filter((v,i,a)=>v && a.indexOf(v)===i);
    const c=(Array.isArray(window.CHARACTERS)?window.CHARACTERS:[]).find(x=>x&&Number(x.id)===id);
    const name=(c&&c.name)||'';

    closeSkinPreview();
    const ov=document.createElement('div');
    ov.id='item-skin-preview';
    ov.setAttribute('role','dialog');
    ov.setAttribute('aria-modal','true');
    const skinName=(skin&&skin.name)||'限定衣装';
    ov.setAttribute('aria-label',(name?name+' ':'')+skinName);
    ov.innerHTML=
      '<div class="item-skin-preview-frame">'+
        '<img class="item-skin-preview-img" alt="">'+
        '<div class="item-skin-preview-caption"><small>LIMITED OUTFIT</small><strong>'+escapeHtml(name)+'</strong><span>'+escapeHtml(skinName)+'</span></div>'+
      '</div>'+
      '<button type="button" class="item-skin-preview-close" aria-label="閉じる">×</button>'+
      '<p class="item-skin-preview-hint">タップで閉じる</p>';
    const img=ov.querySelector('.item-skin-preview-img');
    img.onerror=function(){ const next=chain.shift(); if(next) this.src=next; else this.onerror=null; };
    img.src=chain.shift();
    ov.addEventListener('click',closeSkinPreview);
    document.addEventListener('keydown',onSkinPreviewKey);
    document.body.appendChild(ov);
    ov.querySelector('.item-skin-preview-close').focus();
  }
  // build2221: カードデザインの背景を大きく表示（限定衣装のプレビューと同じ見た目）
  function openDesignPreview(designId){
    const api=window.ProfileCardDesign;
    const d=api && typeof api.getDesign==='function' ? api.getDesign(designId) : null;
    if(!d || !d.bg) return;
    closeSkinPreview();
    const ov=document.createElement('div');
    ov.id='item-skin-preview';
    ov.className='is-design-preview';
    ov.setAttribute('role','dialog');
    ov.setAttribute('aria-modal','true');
    ov.setAttribute('aria-label','カードデザイン '+d.name);
    ov.innerHTML=
      '<div class="item-skin-preview-frame">'+
        '<img class="item-skin-preview-img" alt="" src="'+escapeHtml(d.bg)+'">'+
        '<div class="item-skin-preview-caption"><small>CARD DESIGN</small><strong>'+escapeHtml(d.name)+'</strong><span>プロフィールのカードデザイン</span></div>'+
      '</div>'+
      '<button type="button" class="item-skin-preview-close" aria-label="閉じる">×</button>'+
      '<p class="item-skin-preview-hint">タップで閉じる</p>';
    ov.addEventListener('click',closeSkinPreview);
    document.addEventListener('keydown',onSkinPreviewKey);
    document.body.appendChild(ov);
    ov.querySelector('.item-skin-preview-close').focus();
  }
  function onSkinPreviewKey(e){ if(e.key==='Escape') closeSkinPreview(); }
  function closeSkinPreview(){
    const old=document.getElementById('item-skin-preview');
    if(old) old.remove();
    document.removeEventListener('keydown',onSkinPreviewKey);
  }

  function bind(){
    const srList=document.getElementById('spirit-flower-sr-exchange-list');
    if(srList)srList.addEventListener('click',e=>{const preview=e.target.closest('[data-sr-skin-preview]');if(preview){openSkinPreview(Number(preview.dataset.srSkinPreview));return;}const btn=e.target.closest('[data-flower-sr-exchange-id]');if(btn&&!btn.disabled){const d=exchangeDef('sr',btn.dataset.flowerSrExchangeId);if(d&&!d.characterId)openExchangeQty('sr',d.id);else exchangeFlowerSR(btn.dataset.flowerSrExchangeId);}});
    document.querySelectorAll('[data-flower-sr-exchange-close]').forEach(el=>el.addEventListener('click',closeFlowerSRExchange));
    document.querySelectorAll('#screen-item .item-category-tab').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const next=btn.dataset.itemTab;
        state.tab=(next==='level'||next==='other'||next==='skin') ? next : 'evolution';
        const list=document.getElementById('item-management-list');
        if(list) list.scrollTop=0;
        render();
      });
    });

    const list=document.getElementById('item-management-list');
    if(list){
      list.addEventListener('click',e=>{
        const skinRow=e.target.closest('.item-row-skin[data-skin-preview]');
        if(skinRow){ openSkinPreview(Number(skinRow.dataset.skinPreview)); return; }
        const pieceBtn=e.target.closest('[data-piece-exchange]');
        if(pieceBtn){ if(!pieceBtn.disabled) exchangeRaidPiece(pieceBtn.dataset.pieceExchange); return; }
        const sellBtn=e.target.closest('[data-sell-item]');
        if(sellBtn && !sellBtn.disabled){
          openSell(sellBtn.dataset.sellItem);
          return;
        }
        const exchangeOpen=e.target.closest('[data-open-flower-exchange]');
        if(exchangeOpen && !exchangeOpen.disabled){
          openFlowerExchange();
          return;
        }
        if(e.target.closest('[data-open-flower-sr-exchange]')){openFlowerSRExchange();return;}
        const ticketBtn=e.target.closest('[data-use-other-ticket]');
        if(ticketBtn && !ticketBtn.disabled){
          const id=ticketBtn.dataset.useOtherTicket;
          if(id==='sr_guaranteed_ticket'){useSRTicket();return;}
          if(id==='special_stage_ticket'){
            if(typeof window.openNoahPiecePanel==='function') window.openNoahPiecePanel();
            else toast('特別巡行「楽園 -ノア-」から使用できます');
            return;
          }
          if(id==='tower_limited_ten_ticket'){
            // チケットは限定邂逅の10連実行時に消費する。ここでは邂逅へ移動するだけ。
            if(typeof window.showMainTab==='function') window.showMainTab('summon');
            else toast('限定邂逅の10連から使用できます');
            return;
          }
          if(window.ItemTickets){
            ticketBtn.disabled=true;
            Promise.resolve(window.ItemTickets.useFromItemScreen(id))
              .catch(err=>{console.error('[ItemManagement] ticket use failed',err);toast('チケットを使用できませんでした');})
              .finally(()=>{ if(!state.loading) refresh(); });
          }
          return;
        }
      });
    }

    const exchangeList=document.getElementById('spirit-flower-exchange-list');
    if(exchangeList){
      exchangeList.addEventListener('click',e=>{
        const preview=e.target.closest('[data-skin-preview]');
        if(preview){ openSkinPreview(Number(preview.dataset.skinPreview)); return; }
        const dPreview=e.target.closest('[data-design-preview]');
        if(dPreview){ openDesignPreview(dPreview.dataset.designPreview); return; }
        const btn=e.target.closest('[data-flower-exchange-id]');
        if(btn && !btn.disabled){
          // build2215: 限定衣装以外は数量を選んでから交換
          const d=exchangeDef('r',btn.dataset.flowerExchangeId);
          if(d && !d.characterId && !d.designId) openExchangeQty('r',d.id);
          else exchangeFlowerR(btn.dataset.flowerExchangeId);
        }
      });
      exchangeList.addEventListener('keydown',e=>{
        if(e.key!=='Enter' && e.key!==' ') return;
        const preview=e.target.closest('[data-skin-preview]');
        if(preview){ e.preventDefault(); openSkinPreview(Number(preview.dataset.skinPreview)); }
      });
    }

    const refreshBtn=document.getElementById('item-refresh-btn');
    if(refreshBtn) refreshBtn.addEventListener('click',refresh);

    document.querySelectorAll('[data-item-sell-close]').forEach(el=>el.addEventListener('click',closeSell));
    document.querySelectorAll('[data-flower-exchange-close]').forEach(el=>el.addEventListener('click',closeFlowerExchange));

    const minus=document.getElementById('item-sell-minus');
    const plus=document.getElementById('item-sell-plus');
    const max=document.getElementById('item-sell-max');
    const qty=document.getElementById('item-sell-qty');
    const confirm=document.getElementById('item-sell-confirm');

    if(minus) minus.addEventListener('click',()=>{state.sellQty=Math.max(1,(Number(state.sellQty)||1)-1);updateSellUI();});
    if(plus) plus.addEventListener('click',()=>{state.sellQty=(Number(state.sellQty)||0)+1;updateSellUI();});
    if(max) max.addEventListener('click',()=>{
      if(state.sellItemId) state.sellQty=getSellMeta(state.sellItemId).owned;
      updateSellUI();
    });
    // build2215: 自由入力（入力中は空欄も可、最大値超えはその場で最大値に置き換え）
    bindQtyInput(qty,()=>state.sellItemId?getSellMeta(state.sellItemId).owned:1,(n,typing)=>{
      state.sellQty=n; updateSellUI(typing);
    });
    if(confirm) confirm.addEventListener('click',sell);

    window.addEventListener('sasaphia:growth-resources-changed',()=>{
      if(document.getElementById('screen-item')?.classList.contains('active')) refresh();
    });
    window.addEventListener('zeraphia:skins-loaded',()=>{
      const modal=document.getElementById('spirit-flower-exchange-modal');
      if(modal && !modal.hidden) renderFlowerExchange();
    });
    window.addEventListener('zeraphia:skin-changed',()=>{
      const modal=document.getElementById('spirit-flower-exchange-modal');
      if(modal && !modal.hidden) renderFlowerExchange();
    });
  }


  /* ---------------------------------------------------------
     Gacha excess-copy conversion display bridge
     Server draw_gacha() returns flower_r / flower_sr as
     material results when effective ownership is already 5/5.
     --------------------------------------------------------- */
  const OTHER_GACHA_REWARDS = {
    flower_r:{
      name:'聖霊花(R)',
      img:'images/item_flower_r.webp',
      rarity:'r',
      itemCategory:'exchange'
    },
    flower_sr:{
      name:'聖霊花(SR)',
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
