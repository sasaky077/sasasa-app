(function(){
  'use strict';

  const SKIN_MASTER = {
    3: {
      limited_01: {
        id:'limited_01',
        name:'限定衣装',
        home:'images/chara_03_b_cut.webp',
        panel:'images/chara_03_b_panel.webp',
        exchangeCost:10
      }
    },
    9: {
      limited_01: {
        id:'limited_01',
        name:'限定衣装',
        home:'images/chara_09_b_cut.webp',
        panel:'images/chara_09_b_panel.webp',
        exchangeCost:10
      }
    },
    20: {
      limited_01: {
        id:'limited_01',
        name:'限定衣装',
        home:'images/chara_20_b_cut.webp',
        panel:'images/chara_20_b_panel.webp',
        exchangeCost:10
      }
    },
    36: {
      limited_01: {
        id:'limited_01',
        name:'限定衣装',
        home:'images/chara_36_b_cut.webp',
        panel:'images/chara_36_b_panel.webp',
        exchangeCost:10
      }
    }
  };

  const state = {
    loaded:false,
    loading:false,
    owned:new Set(),
    equipped:new Map(),
    publicEquipped:new Map()
  };

  function key(characterId, skinId){
    return String(Number(characterId||0)) + ':' + String(skinId||'');
  }

  function currentUserId(){
    return String(localStorage.getItem('zukan_user_id') || '').trim().toLowerCase();
  }

  function client(){
    return window.zsSupabase || null;
  }

  function chara(characterId){
    const id=Number(characterId||0);
    const list=Array.isArray(window.CHARACTERS) ? window.CHARACTERS : [];
    return list.find(c=>c && Number(c.id)===id) || null;
  }

  function defaultHome(characterId, fallback){
    const c=chara(characterId);
    return String(fallback || (c && c.cutImg) || ('images/chara_'+String(Number(characterId||0)).padStart(2,'0')+'_cut.webp'));
  }

  function defaultPanel(characterId, fallback){
    const c=chara(characterId);
    return String(fallback || (c && (c.panelImg||c.img)) || ('images/chara_'+String(Number(characterId||0)).padStart(2,'0')+'_panel.webp'));
  }

  function getSkin(characterId, skinId){
    const group=SKIN_MASTER[Number(characterId||0)];
    return group ? (group[String(skinId||'')] || null) : null;
  }

  function getSkins(characterId){
    const group=SKIN_MASTER[Number(characterId||0)] || {};
    return Object.values(group);
  }

  function hasSkins(characterId){
    return getSkins(characterId).length > 0;
  }

  function isOwned(characterId, skinId){
    if(!skinId || skinId==='default') return true;
    return state.owned.has(key(characterId,skinId));
  }

  function getEquippedSkinId(characterId){
    return state.equipped.get(Number(characterId||0)) || 'default';
  }

  function getHomeImage(characterId, fallback){
    const skinId=getEquippedSkinId(characterId);
    const skin=getSkin(characterId,skinId);
    return skin && isOwned(characterId,skinId) ? skin.home : defaultHome(characterId,fallback);
  }

  function getPanelImage(characterId, fallback){
    const skinId=getEquippedSkinId(characterId);
    const skin=getSkin(characterId,skinId);
    return skin && isOwned(characterId,skinId) ? skin.panel : defaultPanel(characterId,fallback);
  }

  async function loadMySkins(force){
    if(state.loading) return false;
    if(state.loaded && !force) return true;

    const sb=client();
    const userId=currentUserId();
    if(!sb || !userId) return false;

    state.loading=true;
    try{
      const [ownedRes,equippedRes]=await Promise.all([
        sb.from('player_character_skins')
          .select('character_id,skin_id')
          .eq('user_id',userId),
        sb.from('player_equipped_character_skins')
          .select('character_id,skin_id')
          .eq('user_id',userId)
      ]);

      if(ownedRes && ownedRes.error) throw ownedRes.error;
      if(equippedRes && equippedRes.error) throw equippedRes.error;

      state.owned.clear();
      (ownedRes && ownedRes.data || []).forEach(row=>{
        state.owned.add(key(row.character_id,row.skin_id));
      });

      state.equipped.clear();
      (equippedRes && equippedRes.data || []).forEach(row=>{
        const charId=Number(row.character_id||0);
        const skinId=String(row.skin_id||'');
        if(charId && getSkin(charId,skinId) && state.owned.has(key(charId,skinId))){
          state.equipped.set(charId,skinId);
        }
      });

      state.loaded=true;
      try{window.dispatchEvent(new CustomEvent('zeraphia:skins-loaded'));}catch(_){}
      if(typeof window.updateMainUI==='function'){
        try{window.updateMainUI();}catch(_){}
      }
      return true;
    }catch(err){
      console.warn('[CharacterSkins] load skipped',err&&err.message||err);
      return false;
    }finally{
      state.loading=false;
    }
  }

  async function equip(characterId, skinId){
    const charId=Number(characterId||0);
    const next=String(skinId||'default');
    if(!charId) return false;

    if(next!=='default' && !isOwned(charId,next)){
      if(typeof window.showToast==='function') window.showToast('この衣装は未所持です');
      return false;
    }

    const sb=client();
    const userId=currentUserId();
    if(!sb || !userId) return false;

    try{
      const res=await sb.rpc('equip_character_skin',{
        p_user_id:userId,
        p_character_id:charId,
        p_skin_id:next
      });
      if(res && res.error) throw res.error;

      if(next==='default') state.equipped.delete(charId);
      else state.equipped.set(charId,next);

      state.publicEquipped.delete(userId+':'+charId);

      try{window.dispatchEvent(new CustomEvent('zeraphia:skin-changed',{detail:{characterId:charId,skinId:next}}));}catch(_){}
      if(typeof window.updateMainUI==='function'){
        try{window.updateMainUI();}catch(_){}
      }

      // build1070: character box / character detail image follows equipped skin too.
      try{
        if(Number(window.currentZukanDetailCharaId||0)===charId && typeof window.renderBoxDetail==='function'){
          window.renderBoxDetail(charId);
        }else{
          var zukanScreen=document.getElementById('screen-zukan');
          if(zukanScreen && zukanScreen.classList.contains('active') && typeof window.renderBox==='function'){
            window.renderBox();
          }
        }
      }catch(_){}

      if(window.currentDetailData && Number(window.currentDetailData.id)===charId && typeof window.showDetail==='function'){
        try{window.showDetail(window.currentDetailData,false);}catch(_){}
      }

      if(typeof window.showToast==='function'){
        window.showToast(next==='default' ? '通常衣装に変更しました' : '限定衣装に変更しました');
      }
      return true;
    }catch(err){
      console.error('[CharacterSkins] equip failed',err);
      if(typeof window.showToast==='function') window.showToast(err&&err.message?err.message:'衣装変更に失敗しました');
      return false;
    }
  }

  function isCharacterOwned(characterId){
    const id=Number(characterId||0);
    try{
      if(window.collected && window.collected[id]) return true;
      if(Array.isArray(window.box) && window.box.some(x=>x&&Number(x.id)===id)) return true;
    }catch(_){}
    return false;
  }

  function esc(v){
    return String(v==null?'':v)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function buildFullscreenControlsHTML(charaDef){
    const charId=Number(charaDef && charaDef.id || 0);
    if(!charId || !hasSkins(charId) || !isCharacterOwned(charId)) return '';

    const limited=getSkins(charId)[0];
    if(!limited) return '';

    const equipped=getEquippedSkinId(charId);
    const owned=isOwned(charId,limited.id);

    return ''+
      '<div class="primor-skin-controls" onclick="event.stopPropagation()">'+
        '<div class="primor-skin-controls-label">衣装</div>'+
        '<div class="primor-skin-controls-buttons">'+
          '<button type="button" class="primor-skin-choice'+(equipped==='default'?' is-selected':'')+'" data-skin-choice="default">'+
            '<span>通常</span>'+
            '<small class="primor-skin-choice-state">'+(equipped==='default'?'装備中':'変更')+'</small>'+
          '</button>'+
          '<button type="button" class="primor-skin-choice'+(equipped===limited.id?' is-selected':'')+(owned?'':' is-locked')+'" '+
            'data-skin-choice="'+esc(limited.id)+'" '+(owned?'':'disabled')+'>'+
            '<span>限定衣装</span>'+
            '<small class="primor-skin-choice-state">'+(owned ? (equipped===limited.id?'装備中':'変更') : '未所持')+'</small>'+
          '</button>'+
        '</div>'+
      '</div>';
  }

  function buildSelectorHTML(data){
    const charId=Number(data && data.id || 0);
    if(!charId || !hasSkins(charId) || !isCharacterOwned(charId)) return '';

    const equipped=getEquippedSkinId(charId);
    const c=chara(charId) || data || {};
    const normalPanel=defaultPanel(charId,c.panelImg||c.img||'');
    const limited=getSkins(charId)[0];
    const owned=isOwned(charId,limited.id);

    return ''+
      '<div class="detail-shooting-section detail-skin-section">'+
        '<div class="detail-section-title">衣装</div>'+
        '<div class="detail-skin-options">'+
          '<button type="button" class="detail-skin-card'+(equipped==='default'?' is-selected':'')+'" onclick="CharacterSkins.equip('+charId+',\'default\')">'+
            '<span class="detail-skin-thumb"><img src="'+esc(normalPanel)+'" alt="" onerror="this.style.display=\'none\'"></span>'+
            '<span class="detail-skin-copy"><strong>通常</strong><small>'+(equipped==='default'?'装備中':'変更')+'</small></span>'+
          '</button>'+
          '<button type="button" class="detail-skin-card detail-skin-limited'+(equipped===limited.id?' is-selected':'')+(owned?'':' is-locked')+'" '+
            (owned ? 'onclick="CharacterSkins.equip('+charId+',\''+esc(limited.id)+'\')"' : 'disabled')+'>'+
            '<span class="detail-skin-thumb"><img src="'+esc(limited.panel)+'" alt="" onerror="this.style.display=\'none\'"></span>'+
            '<span class="detail-skin-copy"><strong>限定衣装</strong><small>'+(owned ? (equipped===limited.id?'装備中':'変更') : '未所持・聖霊花交換')+'</small></span>'+
          '</button>'+
        '</div>'+
      '</div>';
  }

  async function getPublicEquippedSkinId(userId, characterId){
    const uid=String(userId||'').trim().toLowerCase();
    const charId=Number(characterId||0);
    if(!uid || !charId) return 'default';

    if(uid===currentUserId()) return getEquippedSkinId(charId);

    const cacheKey=uid+':'+charId;
    if(state.publicEquipped.has(cacheKey)) return state.publicEquipped.get(cacheKey);

    const sb=client();
    if(!sb) return 'default';

    try{
      const res=await sb.from('player_equipped_character_skins')
        .select('skin_id')
        .eq('user_id',uid)
        .eq('character_id',charId)
        .maybeSingle();
      if(res && res.error) throw res.error;
      const skinId=res && res.data && getSkin(charId,res.data.skin_id)
        ? String(res.data.skin_id)
        : 'default';
      state.publicEquipped.set(cacheKey,skinId);
      return skinId;
    }catch(err){
      console.warn('[CharacterSkins] public skin load skipped',err&&err.message||err);
      state.publicEquipped.set(cacheKey,'default');
      return 'default';
    }
  }

  async function getPublicPanelImage(userId, characterId, fallback){
    const charId=Number(characterId||0);
    const skinId=await getPublicEquippedSkinId(userId,charId);
    const skin=getSkin(charId,skinId);
    return skin ? skin.panel : defaultPanel(charId,fallback);
  }

  function notifySkinAcquired(characterId, skinId){
    const charId=Number(characterId||0);
    const id=String(skinId||'');
    if(charId && getSkin(charId,id)){
      state.owned.add(key(charId,id));
      state.loaded=true;
      try{window.dispatchEvent(new CustomEvent('zeraphia:skins-loaded'));}catch(_){}
    }
  }

  window.CharacterSkins = {
    MASTER:SKIN_MASTER,
    loadMySkins,
    reloadMySkins:()=>loadMySkins(true),
    hasSkins,
    isOwned,
    getSkin,
    getSkins,
    getEquippedSkinId,
    getHomeImage,
    getPanelImage,
    getPublicPanelImage,
    buildSelectorHTML,
    buildFullscreenControlsHTML,
    equip,
    notifySkinAcquired
  };

  function boot(attempt){
    if(currentUserId() && client()){
      loadMySkins(true);
      return;
    }
    if((attempt||0)<20) setTimeout(()=>boot((attempt||0)+1),250);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>boot(0),{once:true});
  }else{
    boot(0);
  }
})();
