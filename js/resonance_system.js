// Zeraphia 共鳴モジュール
// index.html から分離。読み込み順: character_resonance.js -> resonance_system.js -> resonance_ui.js

function getLimitBreakRate(limitBreak, charaId){
  var lb = Math.max(0, Number(limitBreak || 0));

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
  if(!target) return null;

  var charaId = Number(target.id);
  var charaDef = (typeof CHARACTERS !== 'undefined' && Array.isArray(CHARACTERS))
    ? CHARACTERS.find(function(c){ return Number(c.id) === charaId; })
    : null;
  var profile = target.resonanceBonusProfile || (charaDef && charaDef.resonanceBonusProfile) || '';

  if(profile === 'eri_v1' || charaId === 1) return ERI_RESONANCE_BONUSES;
  if(profile === 'ignis_v1' || charaId === 6) return IGNIS_RESONANCE_BONUSES;
  if(profile === 'rose_v1' || charaId === 7) return ROSE_RESONANCE_BONUSES;
  return CHARACTER_RESONANCE_BONUSES[charaId] || null;
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
    config: (typeof getCharacterResonanceEffects === 'function')
      ? getCharacterResonanceEffects(charaId)
      : ((typeof CHARACTER_RESONANCE_EFFECTS !== 'undefined' && CHARACTER_RESONANCE_EFFECTS)
        ? CHARACTER_RESONANCE_EFFECTS[charaId] || null
        : null)
  };
}
window.getCharacterResonanceConfig = getCharacterResonanceConfig;

var evolutionMaterials = loadEvolutionMaterialsFromLocal();

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

function resolveLimitBreakSoulVesselId(target, preferredId){
  var ids = getSoulVesselMaterialIdsByElement(target && target.element);
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


function getLimitBreakRecipe(target, preferredSoulVesselId){
  var currentLb = target ? Number(target.limitBreak || 0) : 0;
  var nextLb = Math.min(currentLb + 1, MAX_LIMIT_BREAK);
  var vesselOptions = getSoulVesselMaterialIdsByElement(target && target.element).map(function(materialId){
    return {
      id: materialId,
      count: 1
    };
  });
  var selectedVesselId = resolveLimitBreakSoulVesselId(target, preferredSoulVesselId || selectedLimitBreakSoulVesselId);
  var isEri = !!(target && Number(target.id) === 1);

  return {
    nextLb: nextLb,
    sameChara: isEri ? 0 : 1,
    specialMaterialId: isEri ? 'eri_origin_wing' : '',
    specialMaterialCount: isEri ? 1 : 0,
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

  if(!consumeEvolutionMaterial(recipe.stoneId, recipe.stoneCount)) {
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
    return b.id === target.id && b !== target && b.db_id !== target.db_id;
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


async function executeLimitBreak(target, material, selectedSoulVesselId){

  if(!target) return;
  var isEri = Number(target.id) === 1;
  if(!isEri && !material) return;

  var currentLb = target.limitBreak || 0;

  if(currentLb >= MAX_LIMIT_BREAK){
    showToast('共鳴LvはすでにMAXです');
    return;
  }

  if(!getLimitBreakMaterialStatus(target, selectedSoulVesselId).canLimitBreak){
    showToast('共鳴素材が不足しています');
    return;
  }

  // DB保存失敗時に、共鳴Lv・素材・BOX状態を元へ戻せるよう事前退避する。
  var beforeState = {
    limitBreak: Number(target.limitBreak || 0),
    stats: Object.assign({}, target.stats || {}),
    dbId: target.db_id || null,
    evolutionMaterials: JSON.parse(JSON.stringify(evolutionMaterials || {})),
    box: box.slice(),
    collected: Object.assign({}, collected)
  };

  if(!consumeLimitBreakRecipeMaterials(target, selectedSoulVesselId)){
    showToast('共鳴素材の消費に失敗しました');
    return;
  }

  target.limitBreak = beforeState.limitBreak + 1;
  target.stats = applyLimitBreakStats(
    target.baseStats,
    target.limitBreak,
    target.rarity,
    target.id
  );

  // 通常キャラのみ、同キャラ素材をBOXから削除する。
  // エリは専用アイテムを消費するため、キャラクターは削除しない。
  if(material){
    box = box.filter(function(b){ return b !== material; });

    if(collected[material.id] && collected[material.id].db_id === material.db_id){
      var remain = box.find(function(b){ return b.id === material.id; });
      if(remain){
        collected[material.id] = remain;
      } else {
        delete collected[material.id];
      }
    }
  }

  try {
    // エリはdb_id欠落時も user_id + character_id で保存先を解決する。
    await updateLimitBreakToDB(target);

    // 通常キャラだけ素材キャラをDELETEする。
    if(material){
      await deleteMaterialFromDB(material);
    }
  } catch(saveError) {
    console.error('[Resonance] save failed; rolling back local state:', saveError);
    saveError.attemptedLimitBreak = Number(target.limitBreak || 0);

    target.limitBreak = beforeState.limitBreak;
    target.stats = beforeState.stats;
    target.db_id = beforeState.dbId;
    evolutionMaterials = beforeState.evolutionMaterials;
    saveEvolutionMaterialsToLocal();
    box = beforeState.box;
    collected = beforeState.collected;

    renderBox();
    updateMainUI();
    if(currentZukanMainTab !== 'box') showDetail(target, false);

    showResonanceDiagnostic(saveError, target, beforeState);
    return;
  }

  renderBox();
  updateMainUI();
  if(currentZukanMainTab !== 'box'){
    showDetail(target, false);
  }

  var completeText = document.getElementById('lb-complete-text');
  if(completeText){
    var unlockedBonus = getResonanceBonusMaster(target);
    var unlocked = unlockedBonus && unlockedBonus[target.limitBreak];
    completeText.textContent = '共鳴Lvが ' + target.limitBreak + ' になりました。' +
      (unlocked ? ' 「' + unlocked.title + '」を解放しました。' : '');
  }

  var completeModal = document.getElementById('limitbreak-complete-modal');
  if (completeModal) {
    completeModal.classList.add('active');
  } else {
    alert('共鳴が完了しました。');
  }
}



async function updateLimitBreakToDB(target){
  if(!target) throw new Error('共鳴対象がありません');

  var payload = {
    limit_break: Number(target.limitBreak || 0),
    stats: target.stats || {},
    base_stats: target.baseStats || target.stats || {}
  };

  var result = null;

  // 通常は行IDで厳密に更新する。
  if(target.db_id){
    result = await sb.from('collected_characters')
      .update(payload)
      .eq('id', target.db_id)
      .eq('user_id', userId)
      .select('id,user_id,character_id,limit_break,stats,base_stats');
  }

  // エリだけは、古い端末データでdb_idが欠落／不一致でも保存先を再解決する。
  if(Number(target.id) === 1 && (!result || result.error || !result.data || result.data.length === 0)){
    result = await sb.from('collected_characters')
      .update(payload)
      .ilike('user_id', userId)
      .eq('character_id', 1)
      .select('id,user_id,character_id,limit_break,stats,base_stats');
  }

  window.__lastResonanceSupabaseResult = {
    userId: typeof userId !== 'undefined' ? userId : null,
    targetId: target && target.id,
    targetDbId: target && target.db_id,
    data: result && result.data ? result.data : null,
    error: result && result.error ? {
      message: result.error.message || '',
      code: result.error.code || '',
      details: result.error.details || '',
      hint: result.error.hint || ''
    } : null,
    status: result && result.status,
    statusText: result && result.statusText
  };

  if(result && result.error){
    var supabaseError = new Error(result.error.message || 'Supabase共鳴保存エラー');
    supabaseError.name = 'SupabaseResonanceSaveError';
    supabaseError.code = result.error.code || '';
    supabaseError.details = result.error.details || '';
    supabaseError.hint = result.error.hint || '';
    supabaseError.status = result.status;
    supabaseError.statusText = result.statusText;
    supabaseError.cause = result.error;
    throw supabaseError;
  }

  if(!result || !result.data || result.data.length === 0){
    var noRowError = new Error('共鳴データの更新対象が0件でした');
    noRowError.name = 'ResonanceUpdateZeroRowsError';
    noRowError.details = 'userId=' + String(typeof userId !== 'undefined' ? userId : '') + ', characterId=' + String(target && target.id) + ', db_id=' + String(target && target.db_id);
    noRowError.status = result && result.status;
    noRowError.statusText = result && result.statusText;
    throw noRowError;
  }

  // エリが誤って複数行ある場合でも、以後は更新済み行を参照する。
  var savedRow = result.data[0];
  target.db_id = savedRow.id;

  // 旧表記の行をcase-insensitive検索で拾った場合も、その場で正規IDへ寄せる。
  if(savedRow.user_id && normalizeZeraphiaUserId(savedRow.user_id) === userId && savedRow.user_id !== userId){
    var canonicalizeResult = await sb.from('collected_characters')
      .update({ user_id: userId })
      .eq('id', savedRow.id);
    if(canonicalizeResult && canonicalizeResult.error){
      console.warn('[Resonance] user_id canonicalize failed:', canonicalizeResult.error);
    } else {
      savedRow.user_id = userId;
    }
  }

  return savedRow;
}

async function deleteMaterialFromDB(material){
  if(!material || !material.db_id) throw new Error('共鳴素材のDB IDがありません');
  var result = await sb.from('collected_characters')
    .delete()
    .eq('id', material.db_id)
    .eq('user_id', userId)
    .select('id');
  if(result.error) throw result.error;
  if(!result.data || result.data.length === 0){
    throw new Error('共鳴素材の削除対象が見つかりません');
  }
  return true;
}

// ============================================================
// バトル用共鳴効果の共通適用
// character_resonance.js の CHARACTER_RESONANCE_EFFECTS を宣言的に適用する。
// キャラID別switchを持たず、共鳴仕様の正本を1ファイルに統一する。
// ============================================================
function _getResonanceSkill32(characterDef, skillId){
  if(!characterDef || !Array.isArray(characterDef.skills)) return null;
  if(skillId === 'ult'){
    return characterDef.skills.find(function(skill){
      return skill && (skill.id === 'ult' || skill.isUltimate === true);
    }) || null;
  }
  return characterDef.skills.find(function(skill){ return skill && skill.id === skillId; }) || null;
}

function _assignResonanceValues32(target, values){
  if(!target || !values) return;
  Object.keys(values).forEach(function(key){
    var value = values[key];
    if(value && typeof value === 'object'){
      target[key] = JSON.parse(JSON.stringify(value));
    } else {
      target[key] = value;
    }
  });
}

function _findResonanceEffect32(skill, effectType){
  return skill && Array.isArray(skill.effects)
    ? skill.effects.find(function(effect){ return effect && effect.type === effectType; }) || null
    : null;
}

function _applyResonanceOperation32(characterDef, operation){
  if(!characterDef || !operation) return;
  var comboTrigger = characterDef.combo || null;
  var comboSkill = comboTrigger && comboTrigger.skill ? comboTrigger.skill : null;
  var skill = operation.skillId ? _getResonanceSkill32(characterDef, operation.skillId) : null;

  switch(operation.type){
    case 'characterSet':
      _assignResonanceValues32(characterDef, operation.values);
      break;
    case 'skillSet':
      _assignResonanceValues32(skill, operation.values);
      break;
    case 'skillScale':
      if(skill && operation.field){
        var base = Number(skill[operation.field]);
        if(!Number.isFinite(base)) base = Number(operation.fallback || 0);
        skill[operation.field] = base * Number(operation.multiplier || 1);
      }
      break;
    case 'skillLinkCostDelta':
      if(skill){
        var min = Number.isFinite(Number(operation.min)) ? Number(operation.min) : 0;
        skill.linkCost = Math.max(min, Number(skill.linkCost || 0) + Number(operation.delta || 0));
      }
      break;
    case 'comboTriggerSet':
      _assignResonanceValues32(comboTrigger, operation.values);
      break;
    case 'comboSkillSet':
      _assignResonanceValues32(comboSkill, operation.values);
      break;
    case 'skillEffectSet': {
      var skillEffect = _findResonanceEffect32(skill, operation.effectType);
      _assignResonanceValues32(skillEffect, operation.values);
      break;
    }
    case 'comboEffectSet': {
      var comboEffect = _findResonanceEffect32(comboSkill, operation.effectType);
      _assignResonanceValues32(comboEffect, operation.values);
      break;
    }
    case 'comboEffectAddIfMissing':
      if(comboSkill){
        if(!Array.isArray(comboSkill.effects)) comboSkill.effects = [];
        if(!_findResonanceEffect32(comboSkill, operation.effectType) && operation.effect){
          comboSkill.effects.push(JSON.parse(JSON.stringify(operation.effect)));
        }
      }
      break;
    case 'skillOptionSet':
      if(skill && operation.optionList && Array.isArray(skill[operation.optionList])){
        var option = skill[operation.optionList].find(function(item){
          return item && item.effectType === operation.effectType;
        });
        _assignResonanceValues32(option, operation.values);
      }
      break;
  }
}

function applyCharacterResonanceToBattleDef(characterDef, limitBreak){
  if(!characterDef) return characterDef;

  var lb = Math.max(0, Number(limitBreak != null ? limitBreak : (characterDef.limitBreak || 0)));
  characterDef.limitBreak = lb;

  var master = (typeof getCharacterResonanceEffects === 'function')
    ? getCharacterResonanceEffects(characterDef.id)
    : ((typeof CHARACTER_RESONANCE_EFFECTS !== 'undefined' && CHARACTER_RESONANCE_EFFECTS)
      ? CHARACTER_RESONANCE_EFFECTS[Number(characterDef.id)]
      : null);

  if(!master || lb <= 0) return characterDef;

  for(var level = 1; level <= lb; level++){
    var operations = master[level];
    if(!Array.isArray(operations)) continue;
    operations.forEach(function(operation){
      _applyResonanceOperation32(characterDef, operation);
    });
  }

  return characterDef;
}
window.applyCharacterResonanceToBattleDef = applyCharacterResonanceToBattleDef;

