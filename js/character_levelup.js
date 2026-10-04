// Zeraphia Character Level Up System v689
// - R:  Lv cap 30 / 35 / 40 / 45 / 50
// - SR: Lv cap 40 / 45 / 50 / 55 / 60
// - EXP materials: S=100 / M=500 / L=2000
// - Coin cost: 1 coin per material EXP
// - Level stats: Lv1=60% of 0凸 cap, then interpolate to each limit-break cap target.
(function(){
  'use strict';

  const MATERIALS = Object.freeze([
    Object.freeze({ id:'level_exp_small',  name:'強化素材・銅', shortName:'銅', exp:100,  tone:'small',  img:'images/item_exp_bronze.webp' }),
    Object.freeze({ id:'level_exp_medium', name:'強化素材・銀', shortName:'銀', exp:500,  tone:'medium', img:'images/item_exp_silver.webp' }),
    Object.freeze({ id:'level_exp_large',  name:'強化素材・金', shortName:'金', exp:2000, tone:'large',  img:'images/item_exp_gold.webp' })
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
    try {
      window.dispatchEvent(new CustomEvent('zeraphia:levelup-max-selected', {
        detail: {
          characterId:Number(target && target.id || 0),
          selected:Object.assign({}, selected),
          addExp:selectedExp()
        }
      }));
    } catch(_) {}
  }

  function materialRow(mat){
    const owned = getOwnedCount(mat.id);
    const count = Math.max(0, Number(selected[mat.id] || 0));
    return '' +
      '<div class="chara-level-material-row">' +
        '<div class="chara-level-material-icon tone-' + mat.tone + '"><img src="' + mat.img + '" alt=""></div>' +
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
    try {
      window.dispatchEvent(new CustomEvent('zeraphia:levelup-opened', {
        detail: { characterId:Number(target.id || 0), level:Number(target.characterLevel || 1) }
      }));
    } catch(_) {}
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
      // loadInventoryFromSupabase() 成功後はDB値が正本。
      // ここで古い inventoryAfter を再適用すると、サーバー確定値をローカルで巻き戻すため再適用しない。

      // 同じDB行を参照する collected 側も同期。
      try {
        if(typeof collected !== 'undefined' && collected && collected[target.id] && Number(collected[target.id].db_id) === Number(target.db_id)){
          collected[target.id].characterLevel = target.characterLevel;
          collected[target.id].characterExp = target.characterExp;
        }
      } catch(_){}

      const completedCharacterId = Number(target.id || 0);
      const completedLevel = Math.max(1, Number(target.characterLevel || 1));
      if(typeof updateMainUI === 'function') updateMainUI();
      notifyGrowthResourcesChanged();
      close();
      if(typeof renderBoxDetail === 'function' && typeof currentZukanDetailCharaId !== 'undefined' && currentZukanDetailCharaId != null){
        renderBoxDetail(currentZukanDetailCharaId);
      }
      if(typeof window.refreshShootingRoster === 'function'){
        try { window.refreshShootingRoster(); } catch(_){}
      }
      if(typeof showToast === 'function') showToast('Lv.' + completedLevel + ' に強化しました');
      try {
        window.dispatchEvent(new CustomEvent('zeraphia:levelup-complete', {
          detail: { characterId:completedCharacterId, level:completedLevel }
        }));
      } catch(_) {}
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



  // ============================================================
  // CH01-03 LEVEL UP TUTORIAL — build1152
  // CH01-03をクリアしてRESULTから戻った直後に初回だけ開始する。
  // 報酬: 金30 / 銀12 / 銅6 / 70,000コイン（初期6体をLv.MAXにできる量）。
  // ============================================================
  const LEVELUP_TUTORIAL_DONE_KEY = 'zeraphia_tutorial_levelup_ch01_03_follow_ui_v3';
  const LEVELUP_TUTORIAL_REWARD_KEY = 'zeraphia_tutorial_levelup_reward_ch01_03_v1';
  const LEVELUP_TUTORIAL_STAGE_ID = 'shooting_ch01_03';
  const LEVELUP_TUTORIAL_ERI_ID = 1;
  const LEVELUP_TUTORIAL_REWARD = Object.freeze({
    level_exp_large: 30,
    level_exp_medium: 12,
    level_exp_small: 6,
    coin: 70000
  });

  let levelupTutorialAwaitingReturn = false;
  let levelupTutorialObserver = null;
  let levelupTutorialStep = '';
  let levelupTutorialGuideCleanup = null;
  let levelupTutorialAllowedTarget = null;

  function isLevelupTutorialDone(){
    try { return localStorage.getItem(LEVELUP_TUTORIAL_DONE_KEY) === '1'; } catch(_) { return false; }
  }

  function injectLevelupTutorialStyle(){
    if(document.getElementById('zeraphia-levelup-tutorial-style')) return;
    const style = document.createElement('style');
    style.id = 'zeraphia-levelup-tutorial-style';
    style.textContent = `
      #zeraphia-levelup-tutorial-layer{position:fixed;inset:0;z-index:390000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(18,16,13,.46);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);font-family:"Noto Serif JP",serif}
      #zeraphia-levelup-tutorial-layer.is-guide{display:block;padding:0;background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none;pointer-events:none}
      .zeraphia-levelup-tutorial-card{width:min(350px,calc(100vw - 36px));padding:22px 20px 18px;border:1px solid rgba(164,132,72,.38);background:linear-gradient(180deg,#fffdf8,#f3ecdf);box-shadow:0 20px 60px rgba(40,30,18,.24);color:#584831;text-align:center;pointer-events:auto}
      #zeraphia-levelup-tutorial-layer.is-guide .zeraphia-levelup-tutorial-card{position:fixed;z-index:390004;width:min(330px,calc(100vw - 28px));padding:13px 16px 12px;background:rgba(255,253,247,.97);box-shadow:0 12px 34px rgba(45,34,20,.18);pointer-events:none}
      .zeraphia-levelup-tutorial-kicker{font-family:"Cinzel",serif;font-size:8px;font-weight:700;letter-spacing:.28em;color:#a48349}
      .zeraphia-levelup-tutorial-card h2{margin:7px 0 8px;font-size:19px;font-weight:500;letter-spacing:.08em;color:#493929}
      .zeraphia-levelup-tutorial-card p{margin:0;font-size:11px;line-height:1.8;color:#746451;white-space:pre-line}
      .zeraphia-levelup-tutorial-rewards{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:16px 0 15px;text-align:left}
      .zeraphia-levelup-tutorial-reward{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:7px;min-height:42px;padding:6px 8px;border:1px solid rgba(163,133,77,.18);background:rgba(255,255,255,.48)}
      .zeraphia-levelup-tutorial-reward img{width:28px;height:28px;object-fit:contain}
      .zeraphia-levelup-tutorial-reward span{font-size:9px;color:#756550}.zeraphia-levelup-tutorial-reward b{font-family:"Cinzel","Noto Serif JP",serif;font-size:11px;color:#5b472c}
      .zeraphia-levelup-tutorial-action{width:100%;height:44px;border:1px solid #8e7348;background:#715a38;color:#fff;font-family:"Noto Serif JP",serif;font-size:12px;letter-spacing:.10em;cursor:pointer}
      .zeraphia-levelup-tutorial-blocker{position:fixed;z-index:390001;background:rgba(20,17,13,.55);pointer-events:auto}
      .zeraphia-levelup-tutorial-focus{position:fixed;z-index:390003;border:2px solid rgba(196,154,76,.98);box-shadow:0 0 0 3px rgba(255,250,232,.70),0 0 25px rgba(184,140,55,.48);pointer-events:none;animation:zeraphiaLevelupTutorialPulse 1s ease-in-out infinite alternate}
      .zeraphia-levelup-tutorial-highlight{position:relative!important;outline:2px solid rgba(186,145,68,.95)!important;outline-offset:4px!important}
      @keyframes zeraphiaLevelupTutorialPulse{from{filter:brightness(1)}to{filter:brightness(1.09)}}
      body.zeraphia-levelup-tutorial-modal #character-levelup-modal .modal-close-btn,
      body.zeraphia-levelup-tutorial-modal #character-levelup-modal .character-levelup-cancel{pointer-events:none!important;opacity:.30!important}
      @media (max-width:360px){.zeraphia-levelup-tutorial-rewards{grid-template-columns:1fr}.zeraphia-levelup-tutorial-card{padding:18px 16px 15px}}
    `;
    document.head.appendChild(style);
  }

  function clearLevelupTutorialHighlight(){
    document.querySelectorAll('.zeraphia-levelup-tutorial-highlight').forEach(el => el.classList.remove('zeraphia-levelup-tutorial-highlight'));
  }

  function clearLevelupTutorialGuideTracking(){
    if(typeof levelupTutorialGuideCleanup === 'function'){
      try { levelupTutorialGuideCleanup(); } catch(_) {}
    }
    levelupTutorialGuideCleanup = null;
    levelupTutorialAllowedTarget = null;
  }

  function removeLevelupTutorialLayer(){
    clearLevelupTutorialGuideTracking();
    const old = document.getElementById('zeraphia-levelup-tutorial-layer');
    if(old) old.remove();
    clearLevelupTutorialHighlight();
  }

  function tutorialEventGuard(event){
    const target = levelupTutorialAllowedTarget;
    if(!target || !target.isConnected) return;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if(event.target === target || target.contains(event.target) || path.includes(target)) return;
    const layer = document.getElementById('zeraphia-levelup-tutorial-layer');
    if(layer && layer.contains(event.target)){
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  if(!window.__ZERAPHIA_LEVELUP_TUTORIAL_GUARD__){
    window.__ZERAPHIA_LEVELUP_TUTORIAL_GUARD__ = true;
    document.addEventListener('click', tutorialEventGuard, true);
    document.addEventListener('pointerdown', tutorialEventGuard, true);
    document.addEventListener('touchstart', tutorialEventGuard, { capture:true, passive:false });
  }

  function clampTutorialNumber(value, min, max){
    return Math.max(min, Math.min(max, value));
  }

  function findEriTutorialCard(){
    const cards = Array.from(document.querySelectorAll('#box-grid .primoa-index-card'));
    return cards.find(function(card){
      const action = String(card.getAttribute('onclick') || '').replace(/\s+/g,'');
      const aria = String(card.getAttribute('aria-label') || '');
      return action === 'openZukanCharacterDetail(1)' || aria.indexOf('エリ・') === 0;
    }) || null;
  }

  function resetZukanForLevelupTutorial(){
    try {
      if(window.zukanIndexFilter){
        window.zukanIndexFilter.elements = [];
        window.zukanIndexFilter.rarities = [];
        window.zukanIndexFilter.shotTypes = [];
        window.zukanIndexFilter.sort = 'id';
        window.zukanIndexFilter.query = '';
      }
      if(typeof window.isZukanFilterMenuOpen !== 'undefined') window.isZukanFilterMenuOpen = false;
      if(typeof window.isZukanNameSearchOpen !== 'undefined') window.isZukanNameSearchOpen = false;
      if(typeof switchZukanMainTab === 'function') switchZukanMainTab('box');
    } catch(_) {}
  }

  function waitForLevelupTutorialTarget(resolver, message, onActivate, attempt){
    const tries = Math.max(0, Number(attempt || 0));
    let target = null;
    try { target = typeof resolver === 'function' ? resolver() : document.querySelector(String(resolver || '')); } catch(_) {}
    if(target && target.isConnected){
      const rect = target.getBoundingClientRect();
      if(rect.top < 8 || rect.bottom > window.innerHeight - 8){
        try { target.scrollIntoView({ behavior:'smooth', block:'center', inline:'nearest' }); } catch(_) {}
        setTimeout(function(){ showLevelupTutorialGuide(target, message, onActivate); }, 260);
      } else {
        showLevelupTutorialGuide(target, message, onActivate);
      }
      return;
    }
    if(tries >= 70){
      console.error('[LevelUpTutorial] target not found:', resolver);
      removeLevelupTutorialLayer();
      if(typeof showToast === 'function') showToast('チュートリアルの表示に失敗しました。キャラ画面を開き直してください');
      return;
    }
    setTimeout(function(){ waitForLevelupTutorialTarget(resolver, message, onActivate, tries + 1); }, 100);
  }

  function tutorialRewardHtml(){
    return `
      <div class="zeraphia-levelup-tutorial-rewards">
        <div class="zeraphia-levelup-tutorial-reward"><img src="images/item_exp_gold.webp" alt=""><span>強化素材・金</span><b>×30</b></div>
        <div class="zeraphia-levelup-tutorial-reward"><img src="images/item_exp_silver.webp" alt=""><span>強化素材・銀</span><b>×12</b></div>
        <div class="zeraphia-levelup-tutorial-reward"><img src="images/item_exp_bronze.webp" alt=""><span>強化素材・銅</span><b>×6</b></div>
        <div class="zeraphia-levelup-tutorial-reward"><img src="images/icon_coin.webp" alt=""><span>コイン</span><b>×70,000</b></div>
      </div>`;
  }

  async function grantLevelupTutorialRewardOnce(){
    try {
      if(localStorage.getItem(LEVELUP_TUTORIAL_REWARD_KEY) === '1') return true;
    } catch(_) {}

    const sb = window.zsSupabase;
    if(!sb || typeof sb.rpc !== 'function') throw new Error('報酬サーバーへ接続できませんでした');
    if(window.zsAuthReady){
      try { await window.zsAuthReady; } catch(_) {}
    }

    // build1148: player_inventory へのクライアント直書きは禁止。
    // SECURITY DEFINER RPCで「1アカウント1回」を保証し、素材とコインを同一トランザクションで付与する。
    const rpcResult = await sb.rpc('claim_levelup_tutorial_reward');
    if(rpcResult && rpcResult.error) throw rpcResult.error;

    let data = rpcResult ? rpcResult.data : null;
    if(typeof data === 'string'){
      try { data = JSON.parse(data); } catch(_) {}
    }
    if(!data || data.ok === false) throw new Error((data && data.message) || 'チュートリアル報酬の受け取りに失敗しました');

    const userId = String((data && data.user_id) || (window.userProfile && window.userProfile.user_id) || '').trim();
    if(userId && typeof window.loadInventoryFromSupabase === 'function'){
      await window.loadInventoryFromSupabase(userId);
    } else if(window.ItemManagement && typeof window.ItemManagement.refresh === 'function'){
      await window.ItemManagement.refresh();
    }

    if(window.userProfile && data.coin != null){
      window.userProfile.coin = Math.max(0, Number(data.coin || 0));
      if(typeof window.writeProfileCache === 'function'){
        try { window.writeProfileCache(window.userProfile); } catch(_) {}
      }
    }
    if(typeof window.refreshProfileHud === 'function') window.refreshProfileHud();
    else if(typeof updateMainUI === 'function') updateMainUI();

    try { localStorage.setItem(LEVELUP_TUTORIAL_REWARD_KEY, '1'); } catch(_) {}
    notifyGrowthResourcesChanged();
    return true;
  }

  function showLevelupTutorialIntro(){
    injectLevelupTutorialStyle();
    removeLevelupTutorialLayer();
    const layer = document.createElement('div');
    layer.id = 'zeraphia-levelup-tutorial-layer';
    layer.innerHTML = `
      <div class="zeraphia-levelup-tutorial-card">
        <div class="zeraphia-levelup-tutorial-kicker">FIRST CLEAR REWARD</div>
        <h2>経験値素材を獲得しました</h2>
        <p>キャラクターのレベルアップに使用できます。<br>まずはエリをLv.MAXまで強化してみましょう。</p>
        ${tutorialRewardHtml()}
        <button type="button" class="zeraphia-levelup-tutorial-action" id="zeraphia-levelup-tutorial-start">チュートリアルを開始</button>
      </div>`;
    document.body.appendChild(layer);
    document.getElementById('zeraphia-levelup-tutorial-start')?.addEventListener('click', function(){
      // 報酬画面表示中に別モーダルが開かれていても、案内開始直前にもう一度初期化する。
      resetUiBeforeLevelupTutorial();
      levelupTutorialStep = 'open-character-tab';
      waitForLevelupTutorialTarget('#bnav-zukan', '画面下の「キャラ」をタップしてください。', function(){
        levelupTutorialStep = 'select-eri';
        setTimeout(function(){
          resetZukanForLevelupTutorial();
          waitForLevelupTutorialTarget(findEriTutorialCard, '「エリ」をタップしてください。', function(){
            levelupTutorialStep = 'open-levelup';
            setTimeout(function(){
              waitForLevelupTutorialTarget('.box-carousel-levelup-btn', '「レベルアップ」をタップしてください。', function(){
                // build1152: openイベントの発火順に依存せず、実際にモーダルが開いたDOMを追跡して次へ進む。
                levelupTutorialStep = 'select-max';
                document.body.classList.add('zeraphia-levelup-tutorial-modal');
                waitForLevelupTutorialTarget(
                  function(){
                    const modal = document.getElementById('character-levelup-modal');
                    return modal && modal.classList.contains('active') ? modal.querySelector('[data-levelup-max]') : null;
                  },
                  '「上限まで」をタップしてください。\nLv.MAXまでに必要な素材を自動で選択します。',
                  function(){
                    levelupTutorialStep = 'execute';
                    waitForLevelupTutorialTarget(
                      function(){
                        const modal = document.getElementById('character-levelup-modal');
                        if(!modal || !modal.classList.contains('active')) return null;
                        const button = modal.querySelector('[data-levelup-execute]');
                        return button && !button.disabled ? button : null;
                      },
                      'Lv.MAXになることを確認して、\n「強化する」をタップしてください。',
                      function(){
                        levelupTutorialStep = 'await-complete';
                        waitForLevelupTutorialComplete();
                      }
                    );
                  }
                );
              });
            }, 120);
          });
        }, 140);
      });
    }, { once:true });
  }

  function showLevelupTutorialGuide(targetOrSelector, message, onActivate){
    injectLevelupTutorialStyle();
    removeLevelupTutorialLayer();

    let targetEl = null;
    if(targetOrSelector && targetOrSelector.nodeType === 1) targetEl = targetOrSelector;
    else {
      try { targetEl = document.querySelector(String(targetOrSelector || '')); } catch(_) {}
    }
    if(!targetEl || !targetEl.isConnected){
      waitForLevelupTutorialTarget(targetOrSelector, message, onActivate, 0);
      return;
    }

    targetEl.classList.add('zeraphia-levelup-tutorial-highlight');
    levelupTutorialAllowedTarget = targetEl;

    const layer = document.createElement('div');
    layer.id = 'zeraphia-levelup-tutorial-layer';
    layer.className = 'is-guide';
    const sides = ['top','left','right','bottom'];
    const blockers = {};
    sides.forEach(function(side){
      const el = document.createElement('div');
      el.className = 'zeraphia-levelup-tutorial-blocker';
      el.dataset.side = side;
      blockers[side] = el;
      layer.appendChild(el);
    });
    const focus = document.createElement('div');
    focus.className = 'zeraphia-levelup-tutorial-focus';
    layer.appendChild(focus);
    const card = document.createElement('div');
    card.className = 'zeraphia-levelup-tutorial-card';
    card.innerHTML = '<div class="zeraphia-levelup-tutorial-kicker">TUTORIAL</div><p>' + message + '</p>';
    layer.appendChild(card);
    document.body.appendChild(layer);

    let raf = 0;
    function place(){
      if(!layer.isConnected || !targetEl.isConnected) return;
      const rect = targetEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = 7;
      const l = clampTutorialNumber(rect.left - pad, 0, vw);
      const r = clampTutorialNumber(rect.right + pad, 0, vw);
      const t = clampTutorialNumber(rect.top - pad, 0, vh);
      const b = clampTutorialNumber(rect.bottom + pad, 0, vh);
      const h = Math.max(0, b - t);

      Object.assign(blockers.top.style, {left:'0px',top:'0px',width:vw+'px',height:t+'px'});
      Object.assign(blockers.bottom.style, {left:'0px',top:b+'px',width:vw+'px',height:Math.max(0,vh-b)+'px'});
      Object.assign(blockers.left.style, {left:'0px',top:t+'px',width:l+'px',height:h+'px'});
      Object.assign(blockers.right.style, {left:r+'px',top:t+'px',width:Math.max(0,vw-r)+'px',height:h+'px'});
      Object.assign(focus.style, {left:l+'px',top:t+'px',width:Math.max(0,r-l)+'px',height:h+'px'});

      const cardWidth = Math.min(330, Math.max(260, vw - 28));
      const half = cardWidth / 2;
      const centerX = clampTutorialNumber(rect.left + rect.width / 2, half + 14, vw - half - 14);
      card.style.left = centerX + 'px';
      card.style.transform = 'translateX(-50%)';
      card.style.width = cardWidth + 'px';
      card.style.top = 'auto';
      card.style.bottom = 'auto';
      const cardHeight = Math.max(72, card.offsetHeight || 82);
      const belowSpace = vh - b;
      const aboveSpace = t;
      if(belowSpace >= cardHeight + 20 || belowSpace >= aboveSpace){
        card.style.top = clampTutorialNumber(b + 16, 12, Math.max(12, vh - cardHeight - 12)) + 'px';
      } else {
        card.style.top = clampTutorialNumber(t - cardHeight - 16, 12, Math.max(12, vh - cardHeight - 12)) + 'px';
      }
      raf = requestAnimationFrame(place);
    }
    raf = requestAnimationFrame(place);

    let activated = false;
    function handleTargetClick(){
      if(activated) return;
      activated = true;
      clearLevelupTutorialGuideTracking();
      setTimeout(function(){
        removeLevelupTutorialLayer();
        if(typeof onActivate === 'function') onActivate();
      }, 40);
    }
    targetEl.addEventListener('click', handleTargetClick, { once:true });

    levelupTutorialGuideCleanup = function(){
      if(raf) cancelAnimationFrame(raf);
      try { targetEl.removeEventListener('click', handleTargetClick); } catch(_) {}
      levelupTutorialAllowedTarget = null;
    };
  }

  function finishLevelupTutorial(characterName){
    levelupTutorialStep = 'done';
    document.body.classList.remove('zeraphia-levelup-tutorial-modal');
    clearLevelupTutorialHighlight();
    removeLevelupTutorialLayer();

    // レベルアップモーダルを閉じ、キャラ詳細から一覧へ自動で戻す。
    try { close(); } catch(_) {}
    try {
      if(typeof closeZukanCharacterDetail === 'function') closeZukanCharacterDetail();
      else if(typeof window.closeZukanCharacterDetail === 'function') window.closeZukanCharacterDetail();
    } catch(_) {}

    try { localStorage.setItem(LEVELUP_TUTORIAL_DONE_KEY, '1'); } catch(_) {}
    if(typeof window.scheduleCloudSave === 'function') {
      try { window.scheduleCloudSave(); } catch(_) {}
    }

    const name = String(characterName || 'エリ');
    const layer = document.createElement('div');
    layer.id = 'zeraphia-levelup-tutorial-layer';
    layer.innerHTML = `
      <div class="zeraphia-levelup-tutorial-card">
        <div class="zeraphia-levelup-tutorial-kicker">LEVEL UP COMPLETE</div>
        <h2>レベルアップ完了！</h2>
        <p>${name}がLv.MAXになりました。<br>他のキャラも強化してみよう！</p>
        <button type="button" class="zeraphia-levelup-tutorial-action" id="zeraphia-levelup-tutorial-finish">OK</button>
      </div>`;
    document.body.appendChild(layer);
    document.getElementById('zeraphia-levelup-tutorial-finish')?.addEventListener('click', function(){
      removeLevelupTutorialLayer();
      // 一覧が描画されていないケースだけ安全に再描画する。
      try {
        if(typeof renderBox === 'function' && !document.querySelector('#box-grid .primoa-index-card')) renderBox();
      } catch(_) {}
    }, { once:true });
  }

  function waitForLevelupTutorialComplete(attempt){
    const tries = Math.max(0, Number(attempt || 0));
    // execute() は成功時にモーダルを閉じ、詳細を再描画する。
    // CustomEventだけに依存せず、実データ/DOMのLv30到達も監視して完了させる。
    try {
      const st = targetState();
      if(st && st.level >= st.cap){
        const name = target && target.name ? target.name : 'エリ';
        finishLevelupTutorial(name);
        return;
      }
    } catch(_) {}

    const levelText = String(document.querySelector('#character-levelup-modal [data-levelup-level]')?.textContent || '');
    if(/Lv\.30\s*\/\s*30/.test(levelText) || /MAX/.test(levelText)){
      const name = target && target.name ? target.name : 'エリ';
      finishLevelupTutorial(name);
      return;
    }

    if(tries >= 120){
      console.error('[LevelUpTutorial] level up completion timeout');
      document.body.classList.remove('zeraphia-levelup-tutorial-modal');
      removeLevelupTutorialLayer();
      if(typeof showToast === 'function') showToast('レベルアップ完了を確認できませんでした。もう一度お試しください');
      return;
    }
    setTimeout(function(){ waitForLevelupTutorialComplete(tries + 1); }, 100);
  }

  function resetUiBeforeLevelupTutorial(){
    // build1151: チュートリアル開始前に残留モーダル/操作ロックを必ず片付ける。
    // 固定座標ではなく通常UIから始めるための共通初期化。
    try { clearLevelupTutorialGuideTracking(); } catch(_) {}
    try { removeLevelupTutorialLayer(); } catch(_) {}
    try { document.body.classList.remove('zeraphia-levelup-tutorial-modal'); } catch(_) {}

    // レベルアップ自身が残っていた場合も一旦閉じる。
    try { close(); } catch(_) {}

    // 結晶ショップ/確認/キャラ詳細など、通常モーダルはすべて閉じる。
    // closeModal() 固有の後処理に依存しないよう active を直接除去しつつ、
    // detail-modal の一時状態もクリアする。
    try {
      document.querySelectorAll('.modal-overlay.active').forEach(function(modal){
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      });
      const detail = document.getElementById('detail-modal');
      if(detail){
        detail.classList.remove(
          'is-gacha-pickup-preview',
          'is-gacha-pool-preview',
          'is-shooting-party-detail',
          'is-gacha-result-detail',
          'is-gacha-material-result'
        );
        detail.style.removeProperty('z-index');
      }
    } catch(_) {}

    // DOM外の特殊オーバーレイも、表示中なら閉じる。
    try {
      [
        '#summon-standby',
        '#reveal-modal',
        '#ten-result-modal',
        '#gacha-conversion-modal',
        '#gacha-pool-detail-modal',
        '#shooting-daily-stage-select',
        '#shooting-faceless-stage-select',
        '#noah-stage-select'
      ].forEach(function(selector){
        const el = document.querySelector(selector);
        if(!el) return;
        el.classList.remove('active','show','open');
        if(selector === '#shooting-daily-stage-select' || selector === '#shooting-faceless-stage-select' || selector === '#noah-stage-select'){
          try { el.remove(); } catch(_) {}
        }
      });
    } catch(_) {}

    // 他画面の没入表示が残っても、共有HUD/ボトムナビを復帰させる。
    try {
      if(typeof window.setGameChromeImmersive === 'function') window.setGameChromeImmersive(false, 'levelup-tutorial-reset');
      document.body.classList.remove('is-gacha-pool-detail-open');
      document.body.removeAttribute('data-ui-immersive-reason');
      const hud = document.getElementById('global-user-frame');
      const nav = document.getElementById('bottom-nav-shared');
      [hud, nav].forEach(function(el){
        if(!el) return;
        el.classList.remove('hidden');
        el.style.removeProperty('display');
        el.style.removeProperty('visibility');
        el.style.removeProperty('opacity');
        el.style.removeProperty('pointer-events');
      });
    } catch(_) {}

    // 古いチュートリアルの装飾/ガード対象を残さない。
    clearLevelupTutorialHighlight();
    levelupTutorialAllowedTarget = null;
  }

  async function startLevelupTutorialAfterReturn(){
    if(isLevelupTutorialDone()) return;
    injectLevelupTutorialStyle();
    resetUiBeforeLevelupTutorial();
    const loading = document.createElement('div');
    loading.id = 'zeraphia-levelup-tutorial-layer';
    loading.innerHTML = '<div class="zeraphia-levelup-tutorial-card"><div class="zeraphia-levelup-tutorial-kicker">FIRST CLEAR REWARD</div><h2>報酬を受け取っています</h2><p>少々お待ちください。</p></div>';
    document.body.appendChild(loading);
    try {
      await grantLevelupTutorialRewardOnce();
      showLevelupTutorialIntro();
    } catch(err){
      console.error('[LevelUpTutorial] reward grant failed:', err);
      removeLevelupTutorialLayer();
      if(typeof showToast === 'function') showToast('チュートリアル報酬の受け取りに失敗しました。もう一度CH01-03から戻ってください');
    }
  }

  function observeShootingReturnForLevelupTutorial(){
    if(levelupTutorialObserver) return;
    levelupTutorialObserver = new MutationObserver(function(){
      if(!levelupTutorialAwaitingReturn) return;
      if(document.getElementById('shooting-event-root')) return;
      levelupTutorialAwaitingReturn = false;
      levelupTutorialObserver.disconnect();
      levelupTutorialObserver = null;
      setTimeout(startLevelupTutorialAfterReturn, 220);
    });
    levelupTutorialObserver.observe(document.documentElement, { childList:true, subtree:true });
  }

  window.addEventListener('shooting-stage-result', function(event){
    const detail = event && event.detail ? event.detail : {};
    if(!detail.win || String(detail.stageId || '') !== LEVELUP_TUTORIAL_STAGE_ID || isLevelupTutorialDone()) return;
    levelupTutorialAwaitingReturn = true;
    observeShootingReturnForLevelupTutorial();
  });

  // build1152: 下記CustomEventはDOM追跡の補助としてのみ使用する。
  // チュートリアル本体は各ボタンの実クリック後に次DOMを待つため、
  // inline onclick / addEventListener の発火順が端末やブラウザで変わっても止まらない。
  window.addEventListener('zeraphia:levelup-complete', function(event){
    if(levelupTutorialStep !== 'await-complete' && levelupTutorialStep !== 'execute') return;
    const detail = event && event.detail ? event.detail : {};
    if(Number(detail.level || 0) < 30) return;
    const name = target && target.name ? target.name : 'エリ';
    finishLevelupTutorial(name);
  });

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
