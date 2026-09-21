// 20260816-limitbreak-material-db-resolve-v44
// Zeraphia Shooting 共鳴システム
// Strategy / Battle32 / LINK / moveType / combo / range に依存しない。
// 読み込み順: shooting_resonance.js -> resonance_system.js -> resonance_ui.js

(function ensureShootingResonanceReady(){
  if(!window.ShootingResonance){
    console.error('[Resonance] shooting_resonance.js が先に必要です');
  }
})();

var MAX_LIMIT_BREAK = window.ShootingResonance ? window.ShootingResonance.MAX_LEVEL : 4;
var EVOLUTION_MATERIAL_STORAGE_KEY = window.ShootingResonance
  ? window.ShootingResonance.MATERIAL_STORAGE_KEY
  : 'zeraphia_evolution_materials_v1';
var EVOLUTION_MATERIAL_MASTER = window.ShootingResonance
  ? window.ShootingResonance.MATERIAL_MASTER
  : {};

// 既存BOX/DBデータは limitBreak / baseStats / stats を維持する。
// 表示用HP/ATKも、シューティング共鳴マスターと同じ定義から算出する。
function applyLimitBreakStats(baseStats, limitBreak, rarity, charaId){
  var base = baseStats || {};
  var source = {
    id: Number(charaId || 0),
    hp: Number(base.HP || base.hp || 0),
    atk: Number(base.ATK || base.atk || 0)
  };

  var applied = (window.ShootingResonance && typeof window.ShootingResonance.applyToProfile === 'function')
    ? window.ShootingResonance.applyToProfile(source, limitBreak)
    : source;

  return {
    HP: Math.max(0, Math.floor(Number(applied && applied.hp || 0))),
    ATK: Math.max(0, Math.floor(Number(applied && applied.atk || 0)))
  };
}

// UI互換API。正本は shooting_resonance.js の BONUS_MASTER。
function getResonanceBonusMaster(target){
  if(!target || !window.ShootingResonance) return null;
  return window.ShootingResonance.getBonusMaster(Number(target.id != null ? target.id : target.charaId));
}

// 戦闘側へ渡す共鳴設定もシューティングプロフィールのみ。
function getCharacterResonanceConfig(target){
  if(!target || !window.ShootingResonance) return null;
  var charaId = Number(target.id != null ? target.id : target.charaId);
  var lb = Math.max(0, Number(target.limitBreak != null ? target.limitBreak : target.limit_break || 0));

  return {
    characterId: charaId,
    limitBreak: lb,
    bonuses: window.ShootingResonance.getUnlockedBonuses(charaId, lb)
  };
}
window.getCharacterResonanceConfig = getCharacterResonanceConfig;

// shooting_core.js から利用する共通API。
// baseProfileを破壊せず、共鳴適用済みプロフィールを返す。
function applyShootingResonanceToProfile(baseProfile, limitBreak){
  if(!baseProfile) return null;
  if(!window.ShootingResonance || typeof window.ShootingResonance.applyToProfile !== 'function'){
    return Object.assign({}, baseProfile);
  }
  return window.ShootingResonance.applyToProfile(baseProfile, limitBreak);
}
window.applyShootingResonanceToProfile = applyShootingResonanceToProfile;

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
  var isNoah = !!(target && Number(target.id) === 52);

  return {
    nextLb: nextLb,
    sameChara: (isEri || isNoah) ? 0 : 1,
    specialMaterialId: isEri ? 'eri_origin_wing' : '',
    specialMaterialCount: isEri ? 1 : 0,
    soulVesselId: selectedVesselId,
    soulVesselOptions: vesselOptions,
    soulVesselCount: 1,
    stoneId: 'kyoumei_stone',
    stoneCount: nextLb
  };
}


// build461: 限界突破は「現在の凸段階でのLv上限」に到達している場合のみ許可する。
// SR: 40 -> 凸 -> 45 -> 凸 -> 50 -> ...
// R : 30 -> 凸 -> 35 -> 凸 -> 40 -> ...
function getLimitBreakRequiredLevel(target){
  if(!target) return 0;

  var lb = Math.max(0, Math.min(MAX_LIMIT_BREAK, Number(target.limitBreak || 0)));

  if(window.CharacterLeveling && typeof window.CharacterLeveling.getLevelCap === 'function'){
    return Math.max(1, Number(window.CharacterLeveling.getLevelCap(target.rarity, lb) || 1));
  }

  var rarity = String(target.rarity || 'r').toLowerCase();
  return (rarity === 'sr' ? 40 : 30) + (lb * 5);
}

function isLimitBreakLevelReady(target){
  if(!target) return false;
  var requiredLevel = getLimitBreakRequiredLevel(target);
  var currentLevel = Math.max(1, Number(target.characterLevel || target.character_level || 1));
  return currentLevel >= requiredLevel;
}

window.getLimitBreakRequiredLevel = getLimitBreakRequiredLevel;
window.isLimitBreakLevelReady = isLimitBreakLevelReady;


function getLimitBreakMaterialStatus(target, preferredSoulVesselId){
  var recipe = getLimitBreakRecipe(target, preferredSoulVesselId);
  var sameCharaCount = target ? getSameCharaMaterials(target).length : 0;
  var specialOwned = recipe.specialMaterialId
    ? getEvolutionMaterialCount(recipe.specialMaterialId)
    : 0;
  var stoneOwned = getEvolutionMaterialCount(recipe.stoneId);
  var currentLb = target ? Number(target.limitBreak || 0) : 0;
  var requiredLevel = getLimitBreakRequiredLevel(target);
  var currentLevel = target
    ? Math.max(1, Number(target.characterLevel || target.character_level || 1))
    : 1;
  var levelReady = !!target && currentLevel >= requiredLevel;

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
    currentLevel: currentLevel,
    requiredLevel: requiredLevel,
    levelReady: levelReady,
    canLimitBreak: !!target && currentLb < MAX_LIMIT_BREAK &&
      levelReady &&
      sameCharaCount >= recipe.sameChara &&
      (!recipe.specialMaterialId || specialOwned >= recipe.specialMaterialCount) &&
      hasAnySoulVesselOption && soulVesselAvailable &&
      stoneOwned >= recipe.stoneCount
  };
}



// 一括限界突破で「今ある素材だけで何段階まで上げられるか」を事前計算する。
// 実データは変更せず、同キャラ / 専用素材 / 魂の器 / 共鳴石を段階ごとにシミュレート。
function getBulkLimitBreakPlan(target, preferredSoulVesselId){
  var fromLb = target ? Math.max(0, Number(target.limitBreak || 0)) : 0;
  return {
    steps: [],
    fromLb: fromLb,
    toLb: fromLb,
    canExecute: false,
    count: 0,
    disabledByLevelProgression: true
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

  if(!consumeEvolutionMaterial(recipe.stoneId, recipe.stoneCount)) {
    // 念のため、先に消費した素材を戻す
    addEvolutionMaterial(vesselId, recipe.soulVesselCount);
    if(recipe.specialMaterialId) addEvolutionMaterial(recipe.specialMaterialId, recipe.specialMaterialCount);
    return false;
  }
  return true;
}

// 強化素材API（ガチャ・ログインボーナス・イベント報酬などから利用可能）
window.EVOLUTION_MATERIAL_MASTER = EVOLUTION_MATERIAL_MASTER;
window.getEvolutionMaterialCount = getEvolutionMaterialCount;
window.addEvolutionMaterial = addEvolutionMaterial;

// build459: DB(player_inventory)から再読込された進化素材を、
// 実行中メモリにも即時反映する。localStorageだけ更新されて表示が古いまま残る不具合を防止。
window.addEventListener('zeraphia:evolution-materials-cloud-loaded', function(event){
  var detail = event && event.detail && typeof event.detail === 'object' ? event.detail : {};
  evolutionMaterials = {};
  Object.keys(detail).forEach(function(materialId){
    if(!getEvolutionMaterialDef(materialId)) return;
    var count = Math.max(0, Math.floor(Number(detail[materialId] || 0)));
    if(count > 0) evolutionMaterials[materialId] = count;
  });
  saveEvolutionMaterialsToLocal();
  updateZukanLimitBreakNotice();
  try { window.dispatchEvent(new CustomEvent('sasaphia:growth-resources-changed')); } catch (_) {}
});

function isGachaMaterialResult(data){
  return !!(data && (data.resultKind === 'material' || data.materialId));
}

function getGachaMaterialRewardData(materialId, count, timeStr, capturedAt){
  // v192: Supabase側のガチャ設定が旧3属性IDのままでも落ちないよう互換変換する。
  // 魂の器はローカル進化素材として付与されるため、旧ID受信時に新5属性へ振り分ける。
  var legacyVesselIds = ['soul_vessel_logos','soul_vessel_mystis','soul_vessel_chaos'];
  if(legacyVesselIds.indexOf(String(materialId || '')) !== -1){
    var vesselPool = [
      'soul_vessel_fire',
      'soul_vessel_aqua',
      'soul_vessel_wood',
      'soul_vessel_dark',
      'soul_vessel_light'
    ];
    materialId = vesselPool[Math.floor(Math.random() * vesselPool.length)];
  }

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
  // 育成済み個体をなるべく残すため、強化Lvが低い個体を優先して消費する。
  materials.sort(function(a, b){
    // DB IDが付いている素材を優先し、ガチャ保存中の一時オブジェクトを
    // なるべく素材に選ばない。
    var persistedA = a && a.db_id ? 0 : 1;
    var persistedB = b && b.db_id ? 0 : 1;
    if(persistedA !== persistedB) return persistedA - persistedB;

    var lbA = Number(a.limitBreak || 0);
    var lbB = Number(b.limitBreak || 0);
    if(lbA !== lbB) return lbA - lbB;

    // レベル育成済み個体を素材にしないよう、同凸なら低Lvを優先する。
    var lvA = Math.max(1, Number(a.characterLevel || 1));
    var lvB = Math.max(1, Number(b.characterLevel || 1));
    if(lvA !== lvB) return lvA - lvB;

    return String(a.db_id || '').localeCompare(String(b.db_id || ''));
  });
  return materials[0];
}


async function executeLimitBreak(target, material, selectedSoulVesselId, options){

  options = options || {};
  var silent = !!options.silent;

  if(!target) return false;
  var isEri = Number(target.id) === 1;
  var isNoah = Number(target.id) === 52;
  if(!isEri && !isNoah && !material) return false;

  var currentLb = target.limitBreak || 0;
  if(currentLb >= MAX_LIMIT_BREAK){
    showToast('限界突破LvはすでにMAXです');
    return false;
  }

  var requiredLevel = getLimitBreakRequiredLevel(target);
  var currentLevel = Math.max(1, Number(target.characterLevel || target.character_level || 1));
  if(currentLevel < requiredLevel){
    showToast('Lv.' + requiredLevel + 'まで上げると限界突破できます');
    return false;
  }

  if(!target.db_id){
    try {
      var resolved = await sb.from('collected_characters')
        .select('id')
        .eq('user_id', userId)
        .eq('character_id', Number(target.id))
        .order('id', { ascending:true })
        .limit(1);
      if(resolved && resolved.error) throw resolved.error;
      if(resolved && resolved.data && resolved.data[0]) target.db_id = resolved.data[0].id;
    } catch(err){
      console.error('[Resonance] target row resolve failed:', err);
    }
  }

  if(!target.db_id){
    showToast('共鳴対象を確認できません');
    return false;
  }

  try {
    var result = await sb.rpc('resonate_character_secure', {
      p_character_row_id: Number(target.db_id),
      p_soul_vessel_id: selectedSoulVesselId || null
    });
    if(result && result.error) throw result.error;

    var data = result ? result.data : null;
    if(typeof data === 'string'){
      try { data = JSON.parse(data); } catch(_){ }
    }
    if(!data || data.ok === false){
      throw new Error((data && data.message) || '共鳴に失敗しました');
    }

    target.limitBreak = Math.max(0, Number(data.limit_break || (currentLb + 1)));
    var resonatedStats = applyLimitBreakStats(
      target.baseStats,
      target.limitBreak,
      target.rarity,
      target.id
    );
    target.stats = (window.CharacterLeveling && typeof window.CharacterLeveling.applyToStats === 'function')
      ? window.CharacterLeveling.applyToStats(
          resonatedStats,
          target.rarity,
          target.limitBreak,
          Math.max(1, Number(target.characterLevel || 1))
        )
      : resonatedStats;

    var consumedDuplicateId = Number(data.consumed_duplicate_id || 0);
    if(consumedDuplicateId){
      box = box.filter(function(b){ return Number(b && b.db_id || 0) !== consumedDuplicateId; });
      if(collected[target.id] && Number(collected[target.id].db_id || 0) === consumedDuplicateId){
        var remain = box.find(function(b){ return b && Number(b.id) === Number(target.id); });
        if(remain) collected[target.id] = remain;
        else collected[target.id] = target;
      }
    }

    if(typeof window.loadInventoryFromSupabase === 'function'){
      await window.loadInventoryFromSupabase(userId);
    }
  } catch(saveError) {
    console.error('[Resonance] secure RPC failed:', saveError);
    showToast(saveError && saveError.message ? saveError.message : '共鳴に失敗しました');
    return false;
  }

  if(!silent){
    renderBox();
    updateMainUI();
    if(currentZukanMainTab !== 'box') showDetail(target, false);
  }

  var completeText = document.getElementById('lb-complete-text');
  if(completeText){
    var unlockedBonus = getResonanceBonusMaster(target);
    var unlocked = unlockedBonus && unlockedBonus[target.limitBreak];
    completeText.textContent = '限界突破Lvが ' + target.limitBreak + ' になりました。' +
      (unlocked ? ' 「' + unlocked.title + '」を解放しました。' : '');
  }

  if(!silent){
    var completeModal = document.getElementById('limitbreak-complete-modal');
    if (completeModal) completeModal.classList.add('active');
    else alert('限界突破が完了しました。');
  }
  return true;
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

async function deleteMaterialFromDB(material, target){
  if(!material) throw new Error('限界突破素材がありません');

  var materialDbId = material.db_id || null;

  // ガチャ直後など、BOXには存在するが非同期INSERTの反映前で db_id が
  // まだ入っていない素材があり得る。その場合はSupabase上の同キャラ行を
  // 再検索して素材行を解決する。
  if(!materialDbId){
    var charaId = Number(material.id || 0);
    if(!charaId) throw new Error('限界突破素材のキャラIDがありません');

    var query = sb.from('collected_characters')
      .select('id,user_id,character_id,limit_break,captured_at')
      .eq('user_id', userId)
      .eq('character_id', charaId);

    // 強化対象そのものは絶対に素材候補へ入れない。
    if(target && target.db_id){
      query = query.neq('id', target.db_id);
    }

    var lookup = await query
      .order('limit_break', { ascending:true, nullsFirst:true })
      .order('id', { ascending:true })
      .limit(20);

    if(lookup && lookup.error) throw lookup.error;

    var candidates = (lookup && Array.isArray(lookup.data)) ? lookup.data : [];

    // capturedAtが一致する行があれば最優先。なければ従来の自動選択と同様、
    // 限界突破Lvが低い個体→DB IDが若い個体の順で1体だけ消費する。
    var capturedAt = material.capturedAt || material.captured_at || '';
    var resolved = null;
    if(capturedAt){
      resolved = candidates.find(function(row){
        return String(row && row.captured_at || '') === String(capturedAt);
      }) || null;
    }
    if(!resolved && candidates.length){
      resolved = candidates[0];
    }

    if(!resolved || !resolved.id){
      var missing = new Error('限界突破素材のDB行を再解決できませんでした');
      missing.name = 'LimitBreakMaterialResolveError';
      missing.details = 'userId=' + String(userId) +
        ', characterId=' + String(charaId) +
        ', targetDbId=' + String(target && target.db_id || '') +
        ', localMaterialDbId=' + String(material.db_id || '');
      throw missing;
    }

    materialDbId = resolved.id;
    material.db_id = resolved.id;
  }

  var result = await sb.from('collected_characters')
    .delete()
    .eq('id', materialDbId)
    .eq('user_id', userId)
    .select('id');

  if(result && result.error) throw result.error;
  if(!result || !result.data || result.data.length === 0){
    throw new Error('限界突破素材の削除対象が見つかりません');
  }

  return true;
}
