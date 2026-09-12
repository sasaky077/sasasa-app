// Zeraphia Character Level Up System v241
// - R:  Lv cap 30 / 35 / 40 / 45 / 50
// - SR: Lv cap 40 / 45 / 50 / 55 / 60
// - EXP materials: S=100 / M=500 / L=2000
// - Coin cost: 1 coin per material EXP
// - Level stats: Lv1=60% of 0凸 cap, then interpolate to each limit-break cap target.
(function(){
  'use strict';

  const MATERIALS = Object.freeze([
    Object.freeze({ id:'level_exp_small',  name:'強化素材・小', shortName:'小', exp:100,  tone:'small' }),
    Object.freeze({ id:'level_exp_medium', name:'強化素材・中', shortName:'中', exp:500,  tone:'medium' }),
    Object.freeze({ id:'level_exp_large',  name:'強化素材・大', shortName:'大', exp:2000, tone:'large' })
  ]);

  const COIN_PER_EXP = 1;
  const BASE_LEVEL_FACTOR = 0.60;
  const R_CAPS  = Object.freeze([30,35,40,45,50]);
  const SR_CAPS = Object.freeze([40,45,50,55,60]);
  const R_MILESTONE_MULTIPLIERS  = Object.freeze([1.00,1.25,1.50,1.75,2.00]);
  const SR_MILESTONE_MULTIPLIERS = Object.freeze([1.00,1.175,1.35,1.525,1.70]);

  let target = null;
  let selected = { level_exp_small:0, level_exp_medium:0, level_exp_large:0 };
  let busy = false;

  function rarityKey(rarity){
    return String(rarity || 'r').toLowerCase() === 'sr' ? 'sr' : 'r';
  }

  function clampLb(lb){
    return Math.max(0, Math.min(4, Math.floor(Number(lb || 0))));
  }

  function getLevelCap(rarity, limitBreak){
    const caps = rarityKey(rarity) === 'sr' ? SR_CAPS : R_CAPS;
    return caps[clampLb(limitBreak)];
  }

  function getBaseCap(rarity){
    return rarityKey(rarity) === 'sr' ? SR_CAPS[0] : R_CAPS[0];
  }

  function getMilestones(rarity){
    return rarityKey(rarity) === 'sr' ? SR_MILESTONE_MULTIPLIERS : R_MILESTONE_MULTIPLIERS;
  }

  function getLevelStatFactor(rarity, limitBreak, level){
    const lb = clampLb(limitBreak);
    const caps = rarityKey(rarity) === 'sr' ? SR_CAPS : R_CAPS;
    const multipliers = getMilestones(rarity);
    const cap = caps[lb];
    const lv = Math.max(1, Math.min(cap, Math.floor(Number(level || 1))));
    const baseCap = caps[0];

    // Lv1 -> 無凸上限は 60% -> 100% を滑らかに補間。
    if(lv <= baseCap){
      if(baseCap <= 1) return multipliers[0];
      const t = (lv - 1) / (baseCap - 1);
      return BASE_LEVEL_FACTOR + (multipliers[0] - BASE_LEVEL_FACTOR) * t;
    }

    // 凸後に解放された5Lv区間ごとに、対応するマイルストーンへ補間。
    for(let step=1; step<=lb; step++){
      const prevCap = caps[step-1];
      const nextCap = caps[step];
      if(lv <= nextCap){
        const t = (lv - prevCap) / Math.max(1, nextCap - prevCap);
        return multipliers[step-1] + (multipliers[step] - multipliers[step-1]) * t;
      }
    }
    return multipliers[lb];
  }

  function applyToProfile(profile, rarity, limitBreak, level){
    if(!profile) return profile;
    const factor = getLevelStatFactor(rarity || profile.rarity, limitBreak, level);
    return Object.assign({}, profile, {
      hp: Math.max(1, Math.round(Number(profile.hp || 0) * factor)),
      atk: Math.max(1, Math.round(Number(profile.atk || 0) * factor)),
      characterLevel: Math.max(1, Math.floor(Number(level || 1))),
      levelCap: getLevelCap(rarity || profile.rarity, limitBreak),
      levelStatFactor: factor
    });
  }

  function applyToStats(stats, rarity, limitBreak, level){
    stats = stats || {};
    const factor = getLevelStatFactor(rarity, limitBreak, level);
    return Object.assign({}, stats, {
      HP: Math.max(1, Math.round(Number(stats.HP || 0) * factor)),
      ATK: Math.max(1, Math.round(Number(stats.ATK || 0) * factor))
    });
  }

  function expToNext(level){
    const lv = Math.max(1, Math.floor(Number(level || 1)));
    return 100 + (lv - 1) * 20;
  }

  function expNeededToCap(level, exp, cap){
    let lv = Math.max(1, Math.min(cap, Math.floor(Number(level || 1))));
    let cur = Math.max(0, Math.floor(Number(exp || 0)));
    if(lv >= cap) return 0;
    let need = Math.max(0, expToNext(lv) - cur);
    for(let n=lv+1; n<cap; n++) need += expToNext(n);
    return need;
  }

  function simulate(level, exp, cap, addExp){
    let lv = Math.max(1, Math.min(cap, Math.floor(Number(level || 1))));
    let cur = Math.max(0, Math.floor(Number(exp || 0)));
    let remain = Math.max(0, Math.floor(Number(addExp || 0)));
    if(lv >= cap) return { level:cap, exp:0, usedExp:0, wastedExp:remain, isMax:true };

    let used = 0;
    while(remain > 0 && lv < cap){
      const need = Math.max(1, expToNext(lv) - cur);
      if(remain < need){
        cur += remain;
        used += remain;
        remain = 0;
        break;
      }
      remain -= need;
      used += need;
      lv += 1;
      cur = 0;
    }
    if(lv >= cap){
      return { level:cap, exp:0, usedExp:used, wastedExp:remain, isMax:true };
    }
    return { level:lv, exp:cur, usedExp:used, wastedExp:0, isMax:false };
  }

  function getInventory(){
    let inventory = {};
    try {
      if(typeof _zsGetInventoryState === 'function'){
        inventory = Object.assign({}, _zsGetInventoryState() || {});
      }
    } catch(_){}

    if(!Object.keys(inventory).length){
      try {
        inventory = JSON.parse(localStorage.getItem('zeraphia_inventory_v1') || '{}') || {};
      } catch(_){ inventory = {}; }
    }

    try {
      if(window.userProfile && window.userProfile.inventory && typeof window.userProfile.inventory === 'object'){
        Object.keys(window.userProfile.inventory).forEach(function(id){
          inventory[id] = Math.max(0, Number(window.userProfile.inventory[id] || 0));
        });
      }
    } catch(_){}

    return inventory;
  }

  function getOwnedCount(materialId){
    const inventory = getInventory();
    return Math.max(0, Math.floor(Number(inventory[materialId] || 0)));
  }

  function getCoin(){
    try {
      const profileCoin = Number(window.userProfile && window.userProfile.coin);
      if(Number.isFinite(profileCoin)) return Math.max(0, Math.floor(profileCoin));
    } catch(_){}

    // HUD反映済みだがprofile参照の更新が遅れた瞬間にも通知判定できるよう保険を持つ。
    try {
      const hud = document.getElementById('user-coin');
      if(hud){
        const hudCoin = Number(String(hud.textContent || '').replace(/[^0-9.-]/g, ''));
        if(Number.isFinite(hudCoin)) return Math.max(0, Math.floor(hudCoin));
      }
    } catch(_){}

    return 0;
  }

  function selectedExp(){
    return MATERIALS.reduce((sum, mat) => sum + Math.max(0, Number(selected[mat.id] || 0)) * mat.exp, 0);
  }

  // 現在の所持素材とコインで「最低1Lv」上げられるかを判定。
  // 通知ドット用なので、素材を持っているだけではなく実際に次Lvへ到達できることを条件にする。
  function getMinimumMaterialExpForNextLevel(data){
    if(!data) return 0;
    const cap = getLevelCap(data.rarity, data.limitBreak);
    const level = Math.max(1, Math.min(cap, Math.floor(Number(data.characterLevel || 1))));
    const exp = Math.max(0, Math.floor(Number(data.characterExp || 0)));
    if(level >= cap) return 0;

    const need = Math.max(1, expToNext(level) - exp);
    const coinBudget = getCoin();
    if(coinBudget < need) return 0;

    const small = MATERIALS[0];
    const medium = MATERIALS[1];
    const large = MATERIALS[2];
    const ownedSmall = getOwnedCount(small.id);
    const ownedMedium = getOwnedCount(medium.id);
    const ownedLarge = getOwnedCount(large.id);

    let best = Infinity;
    const maxLarge = Math.min(ownedLarge, Math.ceil(coinBudget / large.exp));
    const maxMedium = Math.min(ownedMedium, Math.ceil(coinBudget / medium.exp));

    for(let l=0; l<=maxLarge; l++){
      const largeExp = l * large.exp;
      if(largeExp > coinBudget) break;

      for(let m=0; m<=maxMedium; m++){
        const baseExp = largeExp + m * medium.exp;
        if(baseExp > coinBudget) break;

        const remaining = Math.max(0, need - baseExp);
        const s = Math.ceil(remaining / small.exp);
        if(s > ownedSmall) continue;

        const total = baseExp + s * small.exp;
        if(total >= need && total <= coinBudget && total < best){
          best = total;
        }
      }
    }

    return Number.isFinite(best) ? best : 0;
  }

  function canLevelUp(data){
    return getMinimumMaterialExpForNextLevel(data) > 0;
  }

  function notifyGrowthResourcesChanged(){
    try {
      window.dispatchEvent(new CustomEvent('sasaphia:growth-resources-changed'));
    } catch(_){}
  }

  function selectedItems(){
    return MATERIALS.reduce((sum, mat) => sum + Math.max(0, Number(selected[mat.id] || 0)), 0);
  }

  function selectedCoin(){
    return selectedExp() * COIN_PER_EXP;
  }

  function targetState(){
    if(!target) return null;
    const cap = getLevelCap(target.rarity, target.limitBreak);
    const level = Math.max(1, Math.min(cap, Number(target.characterLevel || 1)));
    const exp = Math.max(0, Number(target.characterExp || 0));
    return { cap, level, exp };
  }

  function setSelected(id, next){
    const owned = getOwnedCount(id);
    selected[id] = Math.max(0, Math.min(owned, Math.floor(Number(next || 0))));
    render();
  }

  function stepMaterial(id, delta){
    setSelected(id, Number(selected[id] || 0) + Number(delta || 0));
  }

  function clearSelection(){
    MATERIALS.forEach(mat => { selected[mat.id] = 0; });
  }

  // 「上限まで」: 現在の所持素材とコインで到達できる最大地点を選択。
  // 上限到達可能なら、必要EXPを超える量が最小の組み合わせを優先する。
  function selectToLimit(){
    if(!target) return;
    clearSelection();
    const st = targetState();
    if(!st || st.level >= st.cap){ render(); return; }

    const need = expNeededToCap(st.level, st.exp, st.cap);
    const coinBudget = getCoin();
    const owned = {};
    MATERIALS.forEach(m => { owned[m.id] = getOwnedCount(m.id); });

    let bestReach = null;
    let bestUnder = null;
    const small = MATERIALS[0], medium = MATERIALS[1], large = MATERIALS[2];
    const searchBudget = Math.min(need, coinBudget);
    const maxLarge = Math.min(owned[large.id], Math.ceil(searchBudget / large.exp) + 1);
    const maxMedium = Math.min(owned[medium.id], Math.ceil(searchBudget / medium.exp) + 1);

    for(let l=0; l<=maxLarge; l++){
      for(let m=0; m<=maxMedium; m++){
        const baseExp = l*large.exp + m*medium.exp;
        if(baseExp > coinBudget) continue;
        const smallBudget = Math.min(owned[small.id], Math.floor((coinBudget - baseExp) / small.exp));

        // 上限到達候補: 必要なsmallだけ足す。
        const needSmall = Math.max(0, Math.ceil((need - baseExp) / small.exp));
        if(needSmall <= smallBudget){
          const s = needSmall;
          const total = baseExp + s*small.exp;
          const candidate = { s,m,l,total,items:s+m+l };
          if(total >= need && (!bestReach || total < bestReach.total || (total === bestReach.total && candidate.items < bestReach.items))){
            bestReach = candidate;
          }
        }

        // 届かない場合は、使えるsmallを最大まで。
        const s2 = smallBudget;
        const total2 = baseExp + s2*small.exp;
        const candidate2 = { s:s2,m,l,total:total2,items:s2+m+l };
        if(total2 < need && (!bestUnder || total2 > bestUnder.total || (total2 === bestUnder.total && candidate2.items < bestUnder.items))){
          bestUnder = candidate2;
        }
      }
    }

    const best = bestReach || bestUnder;
    if(best){
      selected[small.id] = best.s;
      selected[medium.id] = best.m;
      selected[large.id] = best.l;
    }
    render();
  }

  function materialRow(mat){
    const owned = getOwnedCount(mat.id);
    const count = Math.max(0, Number(selected[mat.id] || 0));
    return '' +
      '<div class="chara-level-material-row">' +
        '<div class="chara-level-material-icon tone-' + mat.tone + '"><span>' + mat.shortName + '</span></div>' +
        '<div class="chara-level-material-info">' +
          '<strong>' + mat.name + '</strong>' +
          '<span>EXP +' + mat.exp.toLocaleString() + '　所持 ' + owned.toLocaleString() + '</span>' +
        '</div>' +
        '<div class="chara-level-material-stepper">' +
          '<button type="button" onclick="CharacterLeveling.stepMaterial(\'' + mat.id + '\',-1)" ' + (count<=0?'disabled':'') + '>−</button>' +
          '<span>' + count + '</span>' +
          '<button type="button" onclick="CharacterLeveling.stepMaterial(\'' + mat.id + '\',1)" ' + (count>=owned?'disabled':'') + '>＋</button>' +
        '</div>' +
      '</div>';
  }

  function render(){
    const modal = document.getElementById('character-levelup-modal');
    if(!modal || !target) return;
    const st = targetState();
    const addExp = selectedExp();
    const result = simulate(st.level, st.exp, st.cap, addExp);
    const coin = selectedCoin();
    const currentNeed = st.level >= st.cap ? 0 : expToNext(st.level);
    const enoughCoin = coin <= getCoin();
    const canExecute = !busy && addExp > 0 && enoughCoin && st.level < st.cap;

    const title = modal.querySelector('[data-levelup-name]');
    const level = modal.querySelector('[data-levelup-level]');
    const exp = modal.querySelector('[data-levelup-exp]');
    const materials = modal.querySelector('[data-levelup-materials]');
    const targetLevel = modal.querySelector('[data-levelup-target]');
    const cost = modal.querySelector('[data-levelup-cost]');
    const button = modal.querySelector('[data-levelup-execute]');
    const maxButton = modal.querySelector('[data-levelup-max]');

    if(title) title.textContent = target.name || 'キャラクター';
    if(level) level.textContent = 'Lv.' + st.level + ' / ' + st.cap + (st.level >= st.cap ? '　MAX' : '');
    if(exp) exp.textContent = st.level >= st.cap ? 'EXP　MAX' : ('EXP　' + st.exp.toLocaleString() + ' / ' + currentNeed.toLocaleString());
    if(materials) materials.innerHTML = MATERIALS.map(materialRow).join('');
    if(targetLevel) targetLevel.innerHTML = '<span>強化後</span><strong>Lv.' + st.level + ' → Lv.' + result.level + '</strong>' +
      (result.wastedExp > 0 ? '<small>上限超過 EXP ' + result.wastedExp.toLocaleString() + ' は消失</small>' : '');
    if(cost) cost.innerHTML = '<span>獲得EXP <b>+' + addExp.toLocaleString() + '</b></span>' +
      '<span>必要コイン <b>' + coin.toLocaleString() + '</b> / ' + getCoin().toLocaleString() + '</span>';
    if(button){
      button.disabled = !canExecute;
      button.textContent = busy ? '強化中…' : (st.level >= st.cap ? 'MAX' : '強化する');
    }
    if(maxButton){
      maxButton.disabled = busy || st.level >= st.cap;
      maxButton.textContent = st.level >= st.cap ? 'MAX' : '上限まで';
    }
    modal.classList.toggle('is-coin-short', !enoughCoin);
  }

  function open(data){
    if(!data || !data.db_id){
      if(typeof showToast === 'function') showToast('所持キャラクターを選択してください');
      return false;
    }
    target = data;
    target.characterLevel = Math.max(1, Number(target.characterLevel || 1));
    target.characterExp = Math.max(0, Number(target.characterExp || 0));
    clearSelection();
    busy = false;
    const modal = document.getElementById('character-levelup-modal');
    if(!modal) return false;
    modal.classList.add('active');
    render();
    return true;
  }

  function close(){
    if(busy) return;
    const modal = document.getElementById('character-levelup-modal');
    if(modal) modal.classList.remove('active');
    target = null;
    clearSelection();
  }

  async function execute(){
    if(busy || !target) return;
    const st = targetState();
    const addExp = selectedExp();
    const coinCost = selectedCoin();
    if(addExp <= 0 || st.level >= st.cap) return;
    if(coinCost > getCoin()){
      if(typeof showToast === 'function') showToast('コインが不足しています');
      return;
    }

    const inventoryBefore = getInventory();
    const inventoryAfter = Object.assign({}, inventoryBefore);
    for(const mat of MATERIALS){
      const use = Math.max(0, Math.floor(Number(selected[mat.id] || 0)));
      if(use > getOwnedCount(mat.id)){
        if(typeof showToast === 'function') showToast('強化素材が不足しています');
        return;
      }
      inventoryAfter[mat.id] = Math.max(0, Math.floor(Number(inventoryAfter[mat.id] || 0)) - use);
    }

    const result = simulate(st.level, st.exp, st.cap, addExp);
    const oldCoin = getCoin();
    const useSmall = Math.max(0, Math.floor(Number(selected.level_exp_small || 0)));
    const useMedium = Math.max(0, Math.floor(Number(selected.level_exp_medium || 0)));
    const useLarge = Math.max(0, Math.floor(Number(selected.level_exp_large || 0)));

    busy = true;
    render();

    try {
      if(typeof sb === 'undefined' || !sb || typeof sb.rpc !== 'function') {
        throw new Error('DB接続がありません');
      }

      const userId = String(localStorage.getItem('zukan_user_id') || '').trim();
      if(!userId) throw new Error('ユーザーIDがありません');
      if(!target.db_id) throw new Error('キャラクターDB IDがありません');

      // キャラLv / EXP・コイン・経験値素材をSupabase側で一括更新。
      // 途中失敗で一部だけ消費されることを防ぐ。
      const rpcResult = await sb.rpc('level_up_character_secure', {
        p_user_id: userId,
        p_character_row_id: Number(target.db_id),
        p_small: useSmall,
        p_medium: useMedium,
        p_large: useLarge
      });
      if(rpcResult && rpcResult.error) throw rpcResult.error;

      let rpcData = rpcResult ? rpcResult.data : null;
      if(typeof rpcData === 'string'){
        try { rpcData = JSON.parse(rpcData); } catch(_){}
      }
      if(!rpcData || rpcData.ok === false){
        throw new Error((rpcData && rpcData.message) || 'レベルアップに失敗しました');
      }

      const serverLevel = Math.max(1, Number(rpcData.level || result.level));
      const serverExp = Math.max(0, Number(rpcData.exp || result.exp));
      const serverCoin = Math.max(0, Number(rpcData.coin != null ? rpcData.coin : oldCoin - coinCost));

      // サーバー確定値でローカル状態を同期。
      target.characterLevel = serverLevel;
      target.characterExp = serverExp;
      if(window.userProfile) window.userProfile.coin = serverCoin;

      if(typeof loadInventoryFromSupabase === 'function'){
        await loadInventoryFromSupabase(userId);
      } else if(typeof _zsApplyInventoryState === 'function'){
        _zsApplyInventoryState(inventoryAfter);
      }
      try {
        if(target.baseStats && typeof applyLimitBreakStats === 'function'){
          const resonatedStats = applyLimitBreakStats(target.baseStats, target.limitBreak || 0, target.rarity, target.id);
          target.stats = applyToStats(resonatedStats, target.rarity, target.limitBreak || 0, target.characterLevel);
        }
      } catch(_){}
      if(typeof _zsApplyInventoryState === 'function') _zsApplyInventoryState(inventoryAfter);

      // 同じDB行を参照する collected 側も同期。
      try {
        if(typeof collected !== 'undefined' && collected && collected[target.id] && Number(collected[target.id].db_id) === Number(target.db_id)){
          collected[target.id].characterLevel = target.characterLevel;
          collected[target.id].characterExp = target.characterExp;
        }
      } catch(_){}

      if(typeof updateMainUI === 'function') updateMainUI();
      notifyGrowthResourcesChanged();
      close();
      if(typeof renderBoxDetail === 'function' && typeof currentZukanDetailCharaId !== 'undefined' && currentZukanDetailCharaId != null){
        renderBoxDetail(currentZukanDetailCharaId);
      }
      if(typeof window.refreshShootingRoster === 'function'){
        try { window.refreshShootingRoster(); } catch(_){}
      }
      if(typeof showToast === 'function') showToast('Lv.' + target.characterLevel + ' に強化しました');
    } catch(err){
      console.error('[CharacterLeveling] level up failed:', err);
      if(typeof showToast === 'function'){
        const message = String(err && (err.message || err) || '');
        if(/coin|コイン/i.test(message)) showToast('コインが不足しています');
        else if(/material|素材|inventory/i.test(message)) showToast('強化素材が不足しています');
        else showToast('レベルアップに失敗しました');
      }
    } finally {
      busy = false;
      if(target) render();
    }
  }

  // 将来のデイリー/イベント報酬から呼べる汎用付与API。
  async function grantMaterial(materialId, amount){
    const mat = MATERIALS.find(m => m.id === materialId);
    if(!mat) throw new Error('unknown level material: ' + materialId);
    amount = Math.max(0, Math.floor(Number(amount || 0)));
    if(!amount) return false;
    const inventory = getInventory();
    inventory[materialId] = Math.max(0, Number(inventory[materialId] || 0)) + amount;
    if(typeof saveInventoryToSupabase === 'function') await saveInventoryToSupabase(inventory);
    if(typeof _zsApplyInventoryState === 'function') _zsApplyInventoryState(inventory);
    notifyGrowthResourcesChanged();
    return true;
  }

  window.CharacterLeveling = Object.freeze({
    MATERIALS,
    COIN_PER_EXP,
    getLevelCap,
    getLevelStatFactor,
    applyToProfile,
    applyToStats,
    expToNext,
    expNeededToCap,
    simulate,
    getMinimumMaterialExpForNextLevel,
    canLevelUp,
    open,
    close,
    render,
    stepMaterial,
    selectToLimit,
    execute,
    grantMaterial
  });
  window.openCharacterLevelUpModal = open;
  window.closeCharacterLevelUpModal = close;
})();
