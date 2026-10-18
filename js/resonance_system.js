// Zeraphia 共鳴モジュール
// index.html から分離。読み込み順: character_resonance.js -> resonance_system.js -> resonance_ui.js

// build1130: restore dependency bridge from shooting_resonance.js.
// resonance_system.js must not rely on private constants from shooting_resonance.js;
// consume the public window.ShootingResonance API and provide safe fallbacks.
(function ensureShootingResonanceReady(){
  if(!window.ShootingResonance){
    console.error('[Resonance] shooting_resonance.js が先に必要です');
  }
})();

var MAX_LIMIT_BREAK = window.ShootingResonance ? window.ShootingResonance.MAX_LEVEL : 4;
var LIMIT_BREAK_RATE = 0.04;
var EVOLUTION_MATERIAL_STORAGE_KEY = window.ShootingResonance
  ? window.ShootingResonance.MATERIAL_STORAGE_KEY
  : 'zeraphia_evolution_materials_v1';
var EVOLUTION_MATERIAL_MASTER = window.ShootingResonance
  ? window.ShootingResonance.MATERIAL_MASTER
  : {};

function getLimitBreakRate(limitBreak, charaId){
  var lb = Math.max(0, Number(limitBreak || 0));

  // トワは汎用+4%ではなく固有HP/ATK+10%をLv1/2で獲得する。
  if(Number(charaId) === 101) return 0;

  // エリはLv1で+5%、以降は従来どおり1Lvごとに+4%。
  if(Number(charaId) === 1 && lb > 0){
    return 0.05 + Math.max(0, lb - 1) * LIMIT_BREAK_RATE;
  }

  return lb * LIMIT_BREAK_RATE;
}

function applyLimitBreakStats(baseStats, limitBreak, rarity, charaId){
  var lb = Math.max(0, Number(limitBreak || 0));
  var rate = getLimitBreakRate(lb, charaId);
  var result = {};

  BASE_STATS.forEach(function(s){
    var base = baseStats[s] || 0;
    var statRate = rate;
    if(Number(charaId) === 101){
      statRate = s === 'HP' ? (lb >= 1 ? 0.10 : 0) : (s === 'ATK' ? (lb >= 2 ? 0.10 : 0) : 0);
    }
    // ハヤテは共鳴Lv.1の固有ボーナスとしてATKのみ+5%。
    // Lv.2以降は従来どおり、追加の共鳴1段階ごとに+4%を加算する。
    if(Number(charaId) === 12 && s === 'ATK' && lb > 0){
      statRate = 0.05 + Math.max(0, lb - 1) * LIMIT_BREAK_RATE;
    }
    result[s] = Math.floor(base * (1 + statRate));
  });

  return result;
}

function getResonanceBonusMaster(target){
  if(!target || !window.ShootingResonance || typeof window.ShootingResonance.getBonusMaster !== 'function') return null;
  var charaId = Number(target.id != null ? target.id : target.charaId);
  return window.ShootingResonance.getBonusMaster(charaId);
}


function getCharacterResonanceConfig(target){
  if(!target) return null;
  var charaId = Number(target.id != null ? target.id : target.charaId);
  var charaDef = (typeof CHARACTERS !== 'undefined' && Array.isArray(CHARACTERS))
    ? CHARACTERS.find(function(c){ return Number(c.id) === charaId; })
    : null;
  if(!charaDef) return null;

  return {
    profile: charaDef.resonanceBonusProfile || '',
    limitBreak: Math.max(0, Number(target.limitBreak != null ? target.limitBreak : target.limit_break || 0)),
    config: charaDef.resonanceBonusConfig || null
  };
}
window.getCharacterResonanceConfig = getCharacterResonanceConfig;

var evolutionMaterials = loadEvolutionMaterialsFromLocal();
// build1334: クラウド再読込後も、起動時の素材スナップショットを使い続けない。
window.addEventListener('zeraphia:evolution-materials-cloud-loaded', function(event){
  var payload = event && event.detail;
  if(!payload || typeof payload !== 'object' || Array.isArray(payload)){
    payload = loadEvolutionMaterialsFromLocal();
  }
  evolutionMaterials = Object.assign({}, payload);
  if(typeof updateZukanLimitBreakNotice === 'function') updateZukanLimitBreakNotice();
});


function loadEvolutionMaterialsFromLocal(){
  try {
    var raw = localStorage.getItem(EVOLUTION_MATERIAL_STORAGE_KEY);
    var parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch(e) {
    console.warn('[EvolutionMaterial] load failed:', e);
    return {};
  }
}

function saveEvolutionMaterialsToLocal(){
  try {
    localStorage.setItem(EVOLUTION_MATERIAL_STORAGE_KEY, JSON.stringify(evolutionMaterials || {}));
  } catch(e) {
    console.warn('[EvolutionMaterial] save failed:', e);
  }
}

function getEvolutionMaterialDef(materialId){
  return EVOLUTION_MATERIAL_MASTER[materialId] || null;
}

function getEvolutionMaterialCount(materialId){
  return Math.max(0, Number((evolutionMaterials && evolutionMaterials[materialId]) || 0));
}

function addEvolutionMaterial(materialId, count){
  var def = getEvolutionMaterialDef(materialId);
  if(!def) return null;
  var n = Math.max(1, Number(count || 1));
  evolutionMaterials[materialId] = getEvolutionMaterialCount(materialId) + n;
  saveEvolutionMaterialsToLocal();
  updateZukanLimitBreakNotice();
  return Object.assign({}, def, { count: n, total: getEvolutionMaterialCount(materialId) });
}

function consumeEvolutionMaterial(materialId, count){
  var n = Math.max(1, Number(count || 1));
  if(getEvolutionMaterialCount(materialId) < n) return false;
  evolutionMaterials[materialId] = getEvolutionMaterialCount(materialId) - n;
  if(evolutionMaterials[materialId] <= 0) delete evolutionMaterials[materialId];
  saveEvolutionMaterialsToLocal();
  return true;
}

var selectedLimitBreakSoulVesselId = '';
var selectedLimitBreakTargetKey = '';

function escapeHtml(str){
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getLimitBreakTargetKey(target){
  if(!target) return '';
  return String(target.db_id || target.instanceId || target.id || '') + '_' + String(target.limitBreak || 0);
}

function getLimitBreakElementList(element){
  var list = (typeof normalizeElementList === 'function') ? normalizeElementList(element) : [];
  var unique = [];
  list.forEach(function(key){
    if(key && unique.indexOf(key) === -1) unique.push(key);
  });
  return unique;
}

function normalizeLimitBreakElement(element){
  var list = getLimitBreakElementList(element);
  return list[0] || '';
}

function getSoulVesselMaterialIdByElement(element){
  var key = normalizeLimitBreakElement(element);
  if(!key) return '';
  return 'soul_vessel_' + key;
}

function getSoulVesselMaterialIdsByElement(element){
  return getLimitBreakElementList(element).map(function(key){
    return 'soul_vessel_' + key;
  }).filter(function(materialId){
    return !!getEvolutionMaterialDef(materialId);
  });
}

function getLimitBreakSoulVesselIdsForTarget(target){
  // エリは光属性キャラとして扱い、限界突破素材は「魂の器(光)」のみ。
  if(target && Number(target.id) === 1){
    return getEvolutionMaterialDef('soul_vessel_light') ? ['soul_vessel_light'] : [];
  }
  return getSoulVesselMaterialIdsByElement(target && target.element);
}

function resolveLimitBreakSoulVesselId(target, preferredId){
  var ids = getLimitBreakSoulVesselIdsForTarget(target);
  if(!ids.length) return '';

  if(preferredId && ids.indexOf(preferredId) !== -1){
    return preferredId;
  }

  // まず所持している器を優先する。複数所持している場合は、このあとUIから選択可能。
  var owned = ids.filter(function(materialId){
    return getEvolutionMaterialCount(materialId) >= 1;
  });
  if(owned.length) return owned[0];

  return ids[0];
}


var STORY_LIMIT_BREAK_CHARACTER_IDS = [1,3,5,17,20,22,25,28,37,39];
function isStoryLimitBreakCharacter(target){
  return !!target && STORY_LIMIT_BREAK_CHARACTER_IDS.indexOf(Number(target.id)) !== -1;
}
window.isStoryLimitBreakCharacter = isStoryLimitBreakCharacter;

function getLimitBreakRecipe(target, preferredSoulVesselId){
  var currentLb = target ? Number(target.limitBreak || 0) : 0;
  var nextLb = Math.min(currentLb + 1, MAX_LIMIT_BREAK);
  var isEri = !!(target && Number(target.id) === 1);
  var vesselOptions = getLimitBreakSoulVesselIdsForTarget(target).map(function(materialId){
    return {
      id: materialId,
      count: 1
    };
  });
  var selectedVesselId = resolveLimitBreakSoulVesselId(target, preferredSoulVesselId || selectedLimitBreakSoulVesselId);

  return {
    nextLb: nextLb,
    // ストーリー加入キャラ（エリを含む）は、重複キャラの代わりに「記憶の欠片」を1個使用する。
    sameChara: isStoryLimitBreakCharacter(target) ? 0 : 1,
    specialMaterialId: isStoryLimitBreakCharacter(target) ? 'memory_fragment' : '',
    specialMaterialCount: isStoryLimitBreakCharacter(target) ? 1 : 0,
    soulVesselId: selectedVesselId,
    soulVesselOptions: vesselOptions,
    soulVesselCount: 1,
    stoneId: 'kyoumei_stone',
    stoneCount: nextLb
  };
}

function getLimitBreakMaterialStatus(target, preferredSoulVesselId){
  var recipe = getLimitBreakRecipe(target, preferredSoulVesselId);
  var sameCharaCount = target ? getSameCharaMaterials(target).length : 0;
  var specialOwned = recipe.specialMaterialId
    ? getEvolutionMaterialCount(recipe.specialMaterialId)
    : 0;
  var stoneOwned = getEvolutionMaterialCount(recipe.stoneId);
  var currentLb = target ? Number(target.limitBreak || 0) : 0;

  var vesselOptionsStatus = (recipe.soulVesselOptions || []).map(function(opt){
    var owned = getEvolutionMaterialCount(opt.id);
    var def = getEvolutionMaterialDef(opt.id);
    return {
      id: opt.id,
      def: def,
      owned: owned,
      need: opt.count || 1,
      selected: opt.id === recipe.soulVesselId,
      available: owned >= (opt.count || 1)
    };
  });

  var selectedVessel = vesselOptionsStatus.find(function(opt){ return opt.selected; }) || null;
  var soulVesselAvailable = !!selectedVessel && selectedVessel.available;
  var hasAnySoulVesselOption = vesselOptionsStatus.length > 0;

  return {
    recipe: recipe,
    sameCharaOwned: sameCharaCount,
    specialMaterialOwned: specialOwned,
    soulVesselOwned: selectedVessel ? selectedVessel.owned : 0,
    soulVesselOptions: vesselOptionsStatus,
    selectedSoulVessel: selectedVessel,
    stoneOwned: stoneOwned,
    canLimitBreak: !!target && currentLb < MAX_LIMIT_BREAK &&
      sameCharaCount >= recipe.sameChara &&
      (!recipe.specialMaterialId || specialOwned >= recipe.specialMaterialCount) &&
      hasAnySoulVesselOption && soulVesselAvailable &&
      stoneOwned >= recipe.stoneCount
  };
}


// 一括限界突破で「今ある素材だけで何段階まで上げられるか」を事前計算する。
// 実データは変更せず、同キャラ / 専用素材 / 魂の器 / 共鳴石を段階ごとにシミュレート。
function getBulkLimitBreakPlan(target, preferredSoulVesselId){
  if(!target) return { steps:[], fromLb:0, toLb:0, canExecute:false, count:0 };

  var fromLb = Math.max(0, Number(target.limitBreak || 0));
  var sameRemain = getSameCharaMaterials(target).length;
  var stoneRemain = getEvolutionMaterialCount('kyoumei_stone');
  var specialRemain = {};
  var vesselIds = getLimitBreakSoulVesselIdsForTarget(target);
  var vesselRemain = {};
  vesselIds.forEach(function(id){ vesselRemain[id] = getEvolutionMaterialCount(id); });

  var preferred = resolveLimitBreakSoulVesselId(target, preferredSoulVesselId || selectedLimitBreakSoulVesselId);
  var steps = [];
  var level = fromLb;

  while(level < MAX_LIMIT_BREAK){
    var tempTarget = Object.assign({}, target, { limitBreak: level });
    var recipe = getLimitBreakRecipe(tempTarget, preferred);
    var vesselId = '';

    if(preferred && vesselIds.indexOf(preferred) !== -1 && Number(vesselRemain[preferred] || 0) >= recipe.soulVesselCount){
      vesselId = preferred;
    } else {
      vesselId = vesselIds.find(function(id){
        return Number(vesselRemain[id] || 0) >= recipe.soulVesselCount;
      }) || '';
    }

    if(recipe.specialMaterialId && specialRemain[recipe.specialMaterialId] == null){
      specialRemain[recipe.specialMaterialId] = getEvolutionMaterialCount(recipe.specialMaterialId);
    }

    var specialOk = !recipe.specialMaterialId || Number(specialRemain[recipe.specialMaterialId] || 0) >= recipe.specialMaterialCount;
    var sameOk = sameRemain >= recipe.sameChara;
    var vesselOk = !!vesselId;
    var stoneOk = stoneRemain >= recipe.stoneCount;
    if(!(specialOk && sameOk && vesselOk && stoneOk)) break;

    steps.push({
      fromLb: level,
      toLb: recipe.nextLb,
      soulVesselId: vesselId,
      stoneCount: recipe.stoneCount,
      sameCharaCount: recipe.sameChara,
      specialMaterialId: recipe.specialMaterialId,
      specialMaterialCount: recipe.specialMaterialCount
    });

    sameRemain -= recipe.sameChara;
    if(recipe.specialMaterialId){
      specialRemain[recipe.specialMaterialId] -= recipe.specialMaterialCount;
    }
    vesselRemain[vesselId] = Math.max(0, Number(vesselRemain[vesselId] || 0) - recipe.soulVesselCount);
    stoneRemain -= recipe.stoneCount;
    level = recipe.nextLb;
  }

  return {
    steps: steps,
    fromLb: fromLb,
    toLb: level,
    canExecute: steps.length > 0,
    count: steps.length
  };
}
window.getBulkLimitBreakPlan = getBulkLimitBreakPlan;


function consumeLimitBreakRecipeMaterials(target, preferredSoulVesselId){
  var status = getLimitBreakMaterialStatus(target, preferredSoulVesselId);
  if(!status.canLimitBreak) return false;
  var recipe = status.recipe;
  var vesselId = recipe.soulVesselId;

  if(recipe.specialMaterialId){
    if(!consumeEvolutionMaterial(recipe.specialMaterialId, recipe.specialMaterialCount)) return false;
  }

  if(!consumeEvolutionMaterial(vesselId, recipe.soulVesselCount)){
    if(recipe.specialMaterialId) addEvolutionMaterial(recipe.specialMaterialId, recipe.specialMaterialCount);
    return false;
  }

  if(recipe.stoneCount > 0 && !consumeEvolutionMaterial(recipe.stoneId, recipe.stoneCount)) {
    // 念のため、先に消費した素材を戻す
    addEvolutionMaterial(vesselId, recipe.soulVesselCount);
    if(recipe.specialMaterialId) addEvolutionMaterial(recipe.specialMaterialId, recipe.specialMaterialCount);
    return false;
  }
  return true;
}

function rollEvolutionMaterialDropFromRoguelite(meta){
  meta = meta || {};
  var rank = String(meta.rank || 'B').toUpperCase();
  var stoneCount = ({ S: 3, A: 3, B: 2, C: 2, D: 1, E: 1 })[rank] || 1;
  var elements = ['logos', 'chaos', 'mystis'];
  var vesselElement = elements[Math.floor(Math.random() * elements.length)];
  var drops = [];
  drops.push(addEvolutionMaterial('kyoumei_stone', stoneCount));
  drops.push(addEvolutionMaterial('soul_vessel_' + vesselElement, 1));
  return drops.filter(Boolean);
}

// 外部JS（ローグライト結果など）から付与できるよう公開
window.EVOLUTION_MATERIAL_MASTER = EVOLUTION_MATERIAL_MASTER;
window.getEvolutionMaterialCount = getEvolutionMaterialCount;
window.addEvolutionMaterial = addEvolutionMaterial;
window.grantEvolutionMaterialDropFromRoguelite = rollEvolutionMaterialDropFromRoguelite;

function isGachaMaterialResult(data){
  return !!(data && (data.resultKind === 'material' || data.materialId));
}

function getGachaMaterialRewardData(materialId, count, timeStr, capturedAt){
  var def = getEvolutionMaterialDef(materialId);
  if(!def) return null;
  var n = Math.max(1, Number(count || 1));
  return {
    resultKind: 'material',
    materialId: materialId,
    itemCount: n,
    id: 'material_' + materialId,
    name: def.name,
    img: def.img,
    upImg: def.img,
    cutImg: def.img,
    element: def.element || '',
    baseStats: {},
    stats: {},
    limitBreak: 0,
    rarity: 'r',
    hasRarity: false,
    isNew: false,
    time: timeStr || new Date().toLocaleString(),
    capturedAt: capturedAt || new Date().toISOString()
  };
}

function grantGachaResult(data){
  if(!data) return;

  if(isGachaMaterialResult(data)){
    if(!data.granted){
      var granted = addEvolutionMaterial(data.materialId, data.itemCount || 1);
      if(granted) data.total = granted.total;
      data.granted = true;
    }
    updateZukanLimitBreakNotice();
    return;
  }

  box.push(data);
  if(!collected[data.id]) collected[data.id] = data;
  updateZukanLimitBreakNotice();
  saveToDB(data);
}
// ─────────────────────────────────────────────────

function getSameCharaMaterials(target){
  return box.filter(function(b){
    return b && target && Number(b.id) === Number(target.id) && b !== target &&
      !!b.db_id && !!target.db_id && Number(b.db_id) !== Number(target.db_id) &&
      !b.isLocked && !b.is_locked;
  });
}

function getAutoLimitBreakMaterial(target){
  var materials = getSameCharaMaterials(target);
  if(!materials.length) return null;

  // 手動選択を省略するため、素材候補は自動選択する。
  // 育成済み個体をなるべく残すため、共鳴Lvが低い個体を優先して消費する。
  materials.sort(function(a, b){
    var lbA = Number(a.limitBreak || 0);
    var lbB = Number(b.limitBreak || 0);
    if(lbA !== lbB) return lbA - lbB;
    return String(a.db_id || '').localeCompare(String(b.db_id || ''));
  });
  return materials[0];
}


// build1334: ストーリー加入キャラの素材消費と突破Lv保存はサーバーで原子的に確定。
async function executeStoryLimitBreakSecure(target, vesselId, options){
  if(!target || !isStoryLimitBreakCharacter(target)) return false;
  var level = Math.max(0, Number(target.limitBreak || 0));
  if(level >= MAX_LIMIT_BREAK){
    showToast('限界突破LvはすでにMAXです');
    return false;
  }
  var status = getLimitBreakMaterialStatus(target, vesselId);
  if(!status.canLimitBreak){
    showToast('限界突破素材が不足しています');
    return false;
  }
  var choice = status.recipe.soulVesselId;
  if(!choice){
    showToast('魂の器を選択してください');
    return false;
  }
  try {
    if(!sb || typeof sb.rpc !== 'function') throw new Error('サーバーに接続できません');
    var args = {
      p_character_id: Number(target.id),
      p_expected_level: level,
      p_soul_vessel_id: choice,
      p_character_row_id: target.db_id != null ? Number(target.db_id) : null
    };
    var response = await sb.rpc('secure_story_character_limit_break', args);
    if(response.error) throw response.error;
    var result = response.data;
    if(!result || result.ok !== true || Number(result.limit_break) !== level + 1){
      throw new Error('限界突破の確定結果を確認できませんでした');
    }

    target.limitBreak = Number(result.limit_break);
    target.db_id = result.character_row_id;
    target.stats = result.stats || applyLimitBreakStats(target.baseStats || {}, target.limitBreak, target.rarity, target.id);

    // 即時表示用。再読込もサーバーから行い、他のアイテム画面を含めて整合させる。
    var balances = result.balances || {};
    Object.keys(balances).forEach(function(id){
      var n = Math.max(0, Number(balances[id] || 0));
      if(n > 0) evolutionMaterials[id] = n;
      else delete evolutionMaterials[id];
    });
    saveEvolutionMaterialsToLocal();
    try {
      if(typeof window.loadInventoryFromSupabase === 'function'){
        await window.loadInventoryFromSupabase(userId);
      }
    } catch(syncError){
      console.warn('[Resonance] server commit succeeded; inventory refresh deferred', syncError);
    }

    try {
      refreshLimitBreakScreens(target);
    } catch(renderError) {
      // サーバーの突破確定後にUI更新で失敗しても、二重消費や再試行はしない。
      console.warn('[Resonance] secure limit break committed; UI refresh failed', renderError);
    }
    var completeText = document.getElementById('lb-complete-text');
    if(completeText){
      var bonus = getResonanceBonusMaster(target);
      var unlocked = bonus && bonus[target.limitBreak];
      completeText.textContent = '共鳴Lvが ' + target.limitBreak + ' になりました。' +
        (unlocked ? ' 「' + unlocked.title + '」を解放しました。' : '');
    }
    if(!(options && options.silent)){
      var completeModal = document.getElementById('limitbreak-complete-modal');
      if(completeModal) completeModal.classList.add('active');
    }
    return true;
  } catch(err){
    console.error('[Resonance] story limit break rejected',err);
    var message = String(err && err.message || '');
    if(/insufficient|不足/i.test(message)) showToast('素材が不足しています。所持数を更新して確認してください');
    else if(/level changed|reload/i.test(message)) showToast('共鳴Lvが更新されています。画面を開き直してください');
    else showToast('限界突破を確定できませんでした。通信状態をご確認ください');
    try {
      if(typeof window.loadInventoryFromSupabase === 'function') await window.loadInventoryFromSupabase(userId);
    } catch(_){}
    return false;
  }
}

// build1335: ガチャキャラの同キャラ消費・素材消費・限界突破Lvを単一RPCで確定。
// 端末の在庫値は表示用キャッシュに過ぎず、サーバーが必ず再検証する。
async function executeGachaLimitBreakSecure(target, material, vesselId, options){
  if(!target || isStoryLimitBreakCharacter(target)) return false;
  var currentLb = Number(target.limitBreak || 0);
  if(currentLb >= MAX_LIMIT_BREAK){
    showToast('限界突破LvはすでにMAXです');
    return false;
  }
  if(!target.db_id || !material || !material.db_id ||
     Number(target.db_id) === Number(material.db_id)){
    showToast('素材キャラの情報を更新してください');
    return false;
  }
  var status = getLimitBreakMaterialStatus(target, vesselId);
  if(!status.canLimitBreak){
    showToast('限界突破素材が不足しています');
    return false;
  }
  var choice = status.recipe.soulVesselId;
  if(!choice){
    showToast('魂の器を選択してください');
    return false;
  }
  try {
    if(!sb || typeof sb.rpc !== 'function') throw new Error('サーバーに接続できません');
    var response = await sb.rpc('secure_gacha_character_limit_break', {
      p_character_row_id: Number(target.db_id),
      p_material_row_id: Number(material.db_id),
      p_expected_level: currentLb,
      p_soul_vessel_id: choice
    });
    if(response.error) throw response.error;
    var result = response.data;
    if(!result || result.ok !== true || Number(result.limit_break) !== currentLb + 1 ||
       Number(result.consumed_duplicate_id) !== Number(material.db_id)){
      throw new Error('限界突破結果を確認できませんでした');
    }

    // DBコミットが済んでからローカル表示を更新。サーバーの更新を差し戻さない。
    target.limitBreak = Number(result.limit_break);
    target.stats = result.stats || applyLimitBreakStats(target.baseStats || {}, target.limitBreak, target.rarity, target.id);
    box = box.filter(function(b){ return b !== material && Number(b.db_id || 0) !== Number(material.db_id); });
    if(collected[material.id] && Number(collected[material.id].db_id || 0) === Number(material.db_id)){
      var remain = box.find(function(b){ return Number(b.id) === Number(material.id); });
      if(remain) collected[material.id] = remain;
      else delete collected[material.id];
    }
    if(!collected[target.id] || Number(collected[target.id].db_id || 0) === Number(material.db_id)){
      collected[target.id] = target;
    }
    var balances = result.balances || {};
    Object.keys(balances).forEach(function(id){
      var quantity = Math.max(0,Number(balances[id] || 0));
      if(quantity) evolutionMaterials[id] = quantity;
      else delete evolutionMaterials[id];
    });
    saveEvolutionMaterialsToLocal();
    try {
      if(typeof window.loadInventoryFromSupabase === 'function') await window.loadInventoryFromSupabase(userId);
    } catch(syncError){ console.warn('[Resonance] post-commit inventory refresh deferred',syncError); }
    try {
      refreshLimitBreakScreens(target);
    } catch(renderError){ console.warn('[Resonance] post-commit UI refresh deferred',renderError); }
    var completeText = document.getElementById('lb-complete-text');
    if(completeText){
      var master = getResonanceBonusMaster(target);
      var unlocked = master && master[target.limitBreak];
      completeText.textContent = '共鳴Lvが ' + target.limitBreak + ' になりました。' +
        (unlocked ? ' 「' + unlocked.title + '」を解放しました。' : '');
    }
    if(!(options && options.silent)){
      var modal = document.getElementById('limitbreak-complete-modal');
      if(modal) modal.classList.add('active');
    }
    return true;
  } catch(error){
    console.error('[Resonance] gacha limit break failed',error);
    var message = String(error && error.message || '');
    if(/shortage|insufficient|不足|material locked/i.test(message)){
      showToast('素材が不足しています。所持数・保護状態を確認してください');
    } else if(/level changed|reload|not found|wrong character/i.test(message)){
      showToast('キャラの状態が変わっています。画面を開き直してください');
    } else {
      showToast('限界突破を確定できませんでした。再読み込みして状態を確認してください');
    }
    try {
      if(typeof window.loadInventoryFromSupabase === 'function') await window.loadInventoryFromSupabase(userId);
    } catch(_){}
    return false;
  }
}

// build1559: 限界突破後の画面更新。
// キャラ一覧の「詳細」表示中は renderBox() を呼ぶと一覧へ戻ってしまうため、
// 詳細をその場で再描画する（演出カバーの裏で実行され、演出後はそのまま詳細画面に戻る）。
function refreshLimitBreakScreens(target){
  var detailId = (typeof currentZukanDetailCharaId !== 'undefined') ? currentZukanDetailCharaId : null;
  var inBoxDetail = (typeof currentZukanMainTab === 'undefined' || currentZukanMainTab === 'box') &&
    detailId !== null && detailId !== undefined && typeof renderBoxDetail === 'function';
  if(inBoxDetail){
    renderBoxDetail(detailId);
    if(typeof updateZukanHeaderForMode === 'function') updateZukanHeaderForMode();
  } else {
    renderBox();
    if(typeof currentZukanMainTab !== 'undefined' && currentZukanMainTab !== 'box') showDetail(target, false);
  }
  updateMainUI();
  if(typeof updateZukanLimitBreakNotice === 'function') updateZukanLimitBreakNotice();
}
window.refreshLimitBreakScreens = refreshLimitBreakScreens;

async function executeLimitBreak(target, material, selectedSoulVesselId, options){
  if(!target) return false;
  if(isStoryLimitBreakCharacter(target)){
    return await executeStoryLimitBreakSecure(target, selectedSoulVesselId, options);
  }
  return await executeGachaLimitBreakSecure(target, material, selectedSoulVesselId, options);
}


