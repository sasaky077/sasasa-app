// Zeraphia 共鳴モジュール
// index.html から分離。読み込み順: character_resonance.js -> resonance_system.js -> resonance_ui.js

function buildResonanceBonusHTML(target){
  var master = getResonanceBonusMaster(target);
  if(!master) return '';

  var currentLb = Number(target.limitBreak || 0);
  var rows = [1,2,3,4].map(function(level){
    var bonus = master[level];
    var state = level <= currentLb
      ? 'unlocked'
      : (level === currentLb + 1 ? 'next' : 'locked');
    var stateLabel = state === 'unlocked'
      ? '解放済み'
      : (state === 'next' ? '次回解放' : '未解放');

    return '<div class="lb-bonus-row ' + state + '">' +
      '<div class="lb-bonus-level">Lv.' + level + '</div>' +
      '<div class="lb-bonus-body">' +
        '<div class="lb-bonus-summary">' + escapeHtml(bonus.summary) + '</div>' +
      '</div>' +
      '<div class="lb-bonus-state">' + stateLabel + '</div>' +
    '</div>';
  }).join('');

  return '<div class="lb-bonus-box">' + rows + '</div>';
}

// 戦闘側から共鳴プロファイル／段階別設定を参照するための共通API。

function buildNextResonanceBonusHTML(target, nextLb){
  var master = getResonanceBonusMaster(target);
  var bonus = master && master[nextLb];
  if(!bonus) return '';

  return '<div class="lb-next-bonus">' +
    '<div class="lb-next-bonus-label">今回解放される限界突破効果</div>' +
    '<div class="lb-next-bonus-title">Lv.' + nextLb + '　' + escapeHtml(bonus.summary) + '</div>' +
    '<div class="lb-next-bonus-detail">' + escapeHtml(bonus.detail) + '</div>' +
  '</div>';
}



function setLimitBreakSoulVesselSelection(materialId){
  if(!currentDetailData) return;
  var ids = getSoulVesselMaterialIdsByElement(currentDetailData.element);
  if(ids.indexOf(materialId) === -1) return;
  if(getEvolutionMaterialCount(materialId) < 1){
    showToast('この魂の器は不足しています');
    return;
  }
  selectedLimitBreakSoulVesselId = materialId;
  openLimitBreakModal(currentDetailData);
}
window.selectLimitBreakSoulVessel = setLimitBreakSoulVesselSelection;

function getLimitBreakLackList(target){
  var status = getLimitBreakMaterialStatus(target);
  var recipe = status.recipe;
  var lacks = [];

  function pushLack(name, owned, need){
    var lackCount = Math.max(0, Number(need || 0) - Number(owned || 0));
    if(lackCount > 0){
      lacks.push({ name: name, owned: owned, need: need, lack: lackCount });
    }
  }

  var stoneDef = getEvolutionMaterialDef(recipe.stoneId);
  var selectedVessel = status.selectedSoulVessel;

  if(recipe.specialMaterialId){
    var specialDef = getEvolutionMaterialDef(recipe.specialMaterialId);
    pushLack(specialDef ? specialDef.name : '専用限界突破素材', status.specialMaterialOwned, recipe.specialMaterialCount);
  } else {
    pushLack(target && target.name ? target.name : '同キャラ', status.sameCharaOwned, recipe.sameChara);
  }
  pushLack(selectedVessel && selectedVessel.def ? selectedVessel.def.name : '同タイプの魂の器', status.soulVesselOwned, recipe.soulVesselCount);
  pushLack(stoneDef ? stoneDef.name : '共鳴石', status.stoneOwned, recipe.stoneCount);

  return lacks;
}

function buildLimitBreakLackHTML(target){
  var lacks = getLimitBreakLackList(target);
  if(!lacks.length) return '';
  return '<div class="lb-lack-box">' +
    '<div class="lb-lack-title">不足しています</div>' +
    lacks.map(function(item){
      return '<div class="lb-lack-row">' +
        '<span class="lb-lack-name">' + escapeHtml(item.name) + '</span>' +
        '<span class="lb-lack-count">不足：' + item.lack + '個</span>' +
      '</div>';
    }).join('') +
  '</div>';
}

function buildLimitBreakRecipeHTML(target){
  var status = getLimitBreakMaterialStatus(target);
  var recipe = status.recipe;
  var stoneDef = getEvolutionMaterialDef(recipe.stoneId);

  function row(iconHtml, name, owned, need){
    var ownedNum = Number(owned || 0);
    var needNum = Number(need || 0);
    var ok = ownedNum >= needNum;
    var lack = Math.max(0, needNum - ownedNum);
    return '<div class="lb-recipe-row ' + (ok ? 'ok' : 'ng') + '">' +
      '<div class="lb-recipe-icon">' + iconHtml + '</div>' +
      '<div class="lb-recipe-name">' + escapeHtml(name) +
        (!ok ? '<span class="lb-recipe-shortage-label">あと ' + lack + ' 個必要</span>' : '') +
      '</div>' +
      '<div class="lb-recipe-count">' + ownedNum + ' / ' + needNum + '</div>' +
    '</div>';
  }

  function buildSoulVesselHTML(){
    var options = status.soulVesselOptions || [];
    if(options.length <= 1){
      var opt = options[0];
      var def = opt && opt.def;
      var icon = def ? '<img src="' + def.img + '" onerror="this.style.display=\'none\'">' : '<span>?</span>';
      return row(icon, def ? def.name : '同タイプの魂の器', opt ? opt.owned : 0, opt ? opt.need : 1);
    }

    return '<div class="lb-vessel-choice-wrap">' +
      '<div class="lb-vessel-choice-title">魂の器を選択</div>' +
      options.map(function(opt){
        var def = opt.def;
        var selected = opt.selected;
        var disabled = !opt.available;
        var icon = def ? '<img src="' + def.img + '" onerror="this.style.display=\'none\'">' : '<span>?</span>';
        return '<button type="button" class="lb-vessel-choice ' +
          (selected ? 'selected ' : '') +
          (opt.available ? 'ok' : 'ng') + '" ' +
          (disabled ? 'disabled ' : '') +
          'onclick="selectLimitBreakSoulVessel(\'' + opt.id + '\')">' +
            '<span class="lb-vessel-choice-icon">' + icon + '</span>' +
            '<span class="lb-vessel-choice-name">' + escapeHtml(def ? def.name : '魂の器') + '</span>' +
            '<span class="lb-vessel-choice-count">' + opt.owned + ' / ' + opt.need + '</span>' +
        '</button>';
      }).join('') +
    '</div>';
  }

  var stoneIcon = stoneDef ? '<img src="' + stoneDef.img + '" onerror="this.style.display=\'none\'">' : '<span>✦</span>';
  var charaName = target && target.name ? target.name : '同キャラ';
  var charaImg = target && target.img
    ? target.img
    : 'images/chara_' + String(target && target.id || '').padStart(2, '0') + '_panel.webp';
  var charaIcon = '<img class="lb-recipe-chara-img" src="' + charaImg + '" onerror="this.style.display=\'none\'">';

  var firstMaterialRow = '';
  if(recipe.specialMaterialId){
    var specialDef = getEvolutionMaterialDef(recipe.specialMaterialId);
    var specialIcon = specialDef
      ? '<img class="lb-recipe-special-img" src="' + specialDef.img + '" onerror="this.style.display=\'none\'">'
      : '<span>✦</span>';
    firstMaterialRow = row(
      specialIcon,
      specialDef ? specialDef.name : '専用限界突破素材',
      status.specialMaterialOwned,
      recipe.specialMaterialCount
    );
  } else {
    firstMaterialRow = row(charaIcon, charaName, status.sameCharaOwned, recipe.sameChara);
  }

  return '<div class="lb-recipe-box">' +
    '<div class="lb-recipe-title">必要素材</div>' +
    firstMaterialRow +
    buildSoulVesselHTML() +
    row(stoneIcon, stoneDef ? stoneDef.name : '共鳴石', status.stoneOwned, recipe.stoneCount) +
  '</div>' +
  buildResonanceBonusHTML(target);
}



function getLimitBreakCutImage(target){
  if(!target) return '';
  if(target.cutImg) return target.cutImg;
  var idText = String(Number(target.id || 0)).padStart(2, '0');
  return 'images/chara_' + idText + '_cut.webp';
}

function ensureLimitBreakPowerupEffect(){
  var old = document.getElementById('limitbreak-powerup-effect');
  if(old) return old;

  var el = document.createElement('div');
  el.id = 'limitbreak-powerup-effect';
  el.className = 'lb-powerup-effect';
  el.innerHTML =
    '<div class="lb-powerup-bg"></div>' +
    '<div class="lb-powerup-rays"></div>' +
    '<div class="lb-powerup-ring ring-a"></div>' +
    '<div class="lb-powerup-ring ring-b"></div>' +
    '<div class="lb-powerup-image-wrap"><img id="lb-powerup-cut" alt=""></div>' +
    '<div class="lb-powerup-flash"></div>' +
    '<div class="lb-powerup-copy">' +
      '<small>RESONANCE</small>' +
      '<strong>LIMIT BREAK</strong>' +
      '<span id="lb-powerup-name"></span>' +
      '<b id="lb-powerup-level"></b>' +
    '</div>';
  document.body.appendChild(el);
  return el;
}


function beginLimitBreakTransitionCover(){
  var el = ensureLimitBreakPowerupEffect();
  el.classList.remove('show');
  el.classList.add('preparing');
  return el;
}

function endLimitBreakTransitionCover(){
  var el = document.getElementById('limitbreak-powerup-effect');
  if(!el) return;
  el.classList.remove('preparing');
}

function playLimitBreakPowerupEffect(target, fromLb, toLb){
  return new Promise(function(resolve){
    var el = ensureLimitBreakPowerupEffect();
    el.classList.remove('preparing');
    var img = document.getElementById('lb-powerup-cut');
    var name = document.getElementById('lb-powerup-name');
    var level = document.getElementById('lb-powerup-level');

    if(img){
      img.src = getLimitBreakCutImage(target);
      img.onerror = function(){
        this.onerror = null;
        this.src = target && (target.upImg || target.img || target.panelImg) || '';
      };
    }
    if(name) name.textContent = target && target.name ? target.name : '';
    if(level) level.textContent = 'Lv.' + Number(fromLb || 0) + '  →  Lv.' + Number(toLb || 0);

    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');

    setTimeout(function(){
      el.classList.remove('show');
      resolve();
    }, 2350);
  });
}

function buildBulkLimitBreakSummaryHTML(target, plan){
  if(!plan || !plan.count) return '';
  var isEri = Number(target && target.id) === 1;
  var isNoah = Number(target && target.id) === 52;
  var stoneTotal = plan.steps.reduce(function(sum, step){ return sum + Number(step.stoneCount || 0); }, 0);
  var vesselCounts = {};
  plan.steps.forEach(function(step){
    vesselCounts[step.soulVesselId] = Number(vesselCounts[step.soulVesselId] || 0) + 1;
  });

  var materialRows = [];
  if(isEri){
    materialRows.push('<div class="lb-confirm-consume-row"><span class="lb-confirm-consume-name">原初の翼環</span><span class="lb-confirm-consume-count">× ' + plan.count + '</span></div>');
  } else if(!isNoah) {
    materialRows.push('<div class="lb-confirm-consume-row"><span class="lb-confirm-consume-name">' + escapeHtml(target.name || '同キャラ') + '</span><span class="lb-confirm-consume-count">× ' + plan.count + '</span></div>');
  }

  Object.keys(vesselCounts).forEach(function(id){
    var def = getEvolutionMaterialDef(id);
    materialRows.push('<div class="lb-confirm-consume-row"><span class="lb-confirm-consume-name">' + escapeHtml(def ? def.name : '魂の器') + '</span><span class="lb-confirm-consume-count">× ' + vesselCounts[id] + '</span></div>');
  });
  materialRows.push('<div class="lb-confirm-consume-row"><span class="lb-confirm-consume-name">共鳴石</span><span class="lb-confirm-consume-count">× ' + stoneTotal + '</span></div>');

  var bonusMaster = getResonanceBonusMaster(target) || {};
  function buildEffectRow(step, extra){
    var bonus = bonusMaster[step.toLb] || {};
    var summary = bonus.summary || bonus.title || '限界突破効果';
    var detail = bonus.detail || '';
    return '<div class="lb-bulk-next-row' + (extra ? ' lb-bulk-next-row-extra' : '') + '">' +
      '<div class="lb-next-bonus-title">Lv.' + step.toLb + '　' + escapeHtml(summary) + '</div>' +
      (detail ? '<div class="lb-next-bonus-detail">' + escapeHtml(detail) + '</div>' : '') +
    '</div>';
  }

  var fixedEffectRows = plan.steps.slice(0, 2).map(function(step){
    return buildEffectRow(step, false);
  }).join('');
  var extraEffectRows = plan.steps.slice(2).map(function(step){
    return buildEffectRow(step, true);
  }).join('');

  return '<div class="lb-confirm-message lb-confirm-message-strong">一括限界突破を実行しますか？</div>' +
    '<div class="lb-next-bonus lb-bulk-next-bonus">' +
      '<div class="lb-next-bonus-label">今回解放される限界突破効果</div>' +
      '<div class="lb-bulk-next-fixed">' + fixedEffectRows + '</div>' +
      (extraEffectRows ? '<div class="lb-bulk-next-scroll">' + extraEffectRows + '</div>' : '') +
    '</div>' +
    '<div class="lb-confirm-consume-box"><div class="lb-confirm-consume-title">消費素材一覧</div>' +
      materialRows.join('') +
    '</div>' +
    '<div class="lb-confirm-level"><span>限界突破Lv</span><strong>' + plan.fromLb + ' → ' + plan.toLb + '</strong></div>' +
    '<div class="lb-confirm-warning">実行後に消費素材を元へ戻すことはできません。</div>';
}

function confirmBulkLimitBreak(){
  var target = currentDetailData;
  if(!target) return;

  var plan = getBulkLimitBreakPlan(target, selectedLimitBreakSoulVesselId);
  if(!plan || !plan.canExecute){
    showToast('一括で限界突破できる素材がありません');
    return;
  }

  document.getElementById('lb-confirm-text').innerHTML = buildBulkLimitBreakSummaryHTML(target, plan);

  var okBtn = document.getElementById('lb-confirm-ok-btn');
  okBtn.textContent = 'Lv.' + plan.toLb + ' まで一括強化';
  okBtn.onclick = async function(){
    okBtn.disabled = true;

    // 一括強化も決定直後から演出カバーを表示し、キャラ一覧への瞬間復帰を隠す。
    beginLimitBreakTransitionCover();
    closeModal('limitbreak-confirm-modal');
    closeLimitBreakModal();

    var fromLb = Number(target.limitBreak || 0);
    var completed = 0;

    for(var i = 0; i < plan.steps.length; i++){
      var step = plan.steps[i];
      var material = (Number(target.id) === 1 || Number(target.id) === 52) ? null : getAutoLimitBreakMaterial(target);
      var ok = await executeLimitBreak(target, material, step.soulVesselId, { silent:true, bulk:true });
      if(!ok) break;
      completed++;
    }

    if(completed > 0){
      await playLimitBreakPowerupEffect(target, fromLb, Number(target.limitBreak || 0));

      // 演出が終わってから背後画面を最新状態へ更新する。
      renderBox();
      updateMainUI();
      if(currentZukanMainTab !== 'box') showDetail(target, false);
      updateZukanLimitBreakNotice();

      var completeText = document.getElementById('lb-complete-text');
      if(completeText){
        completeText.style.whiteSpace = 'pre-line';
        completeText.textContent = completed + '段階の一括限界突破が完了しました。\n限界突破Lvが ' +
          Number(target.limitBreak || 0) + ' になりました。';
      }
      var completeModal = document.getElementById('limitbreak-complete-modal');
      if(completeModal) completeModal.classList.add('active');
    } else {
      endLimitBreakTransitionCover();
    }

    okBtn.disabled = false;
  };

  document.getElementById('limitbreak-confirm-modal').classList.add('active');
}
window.confirmBulkLimitBreak = confirmBulkLimitBreak;


function openLimitBreakModal(target){
  if(!target) return;
  var listEl = document.getElementById('lb-material-list');
  if(!listEl) return;

  var targetKey = getLimitBreakTargetKey(target);
  var validVesselIds = getSoulVesselMaterialIdsByElement(target.element);
  if(selectedLimitBreakTargetKey !== targetKey || validVesselIds.indexOf(selectedLimitBreakSoulVesselId) === -1){
    selectedLimitBreakSoulVesselId = resolveLimitBreakSoulVesselId(target, selectedLimitBreakSoulVesselId);
  }
  selectedLimitBreakTargetKey = targetKey;

  var status = getLimitBreakMaterialStatus(target, selectedLimitBreakSoulVesselId);
  var recipeHtml = buildLimitBreakRecipeHTML(target);
  listEl.innerHTML = recipeHtml;

  if((target.limitBreak || 0) >= MAX_LIMIT_BREAK){
    listEl.innerHTML += '<div class="lb-no-material">限界突破LvはすでにMAXです</div>';
  } else if(status.canLimitBreak){
    var bulkPlan = getBulkLimitBreakPlan(target, selectedLimitBreakSoulVesselId);
    listEl.innerHTML +=
      '<div class="lb-execute-area">' +
        (bulkPlan && bulkPlan.count >= 2
          ? '<button type="button" class="btn-pay lb-execute-btn lb-execute-bulk-btn" onclick="confirmBulkLimitBreak()">' +
              '一気に限界突破する' +
            '</button>'
          : '') +
        '<button type="button" class="btn-pay lb-execute-btn lb-execute-single-btn" onclick="confirmLimitBreak()">1Lvだけ突破する</button>' +
        '<div class="lb-execute-note">' +
          (status.recipe.specialMaterialId
            ? 'エリ専用素材「原初の翼環」を消費します'
            : '同キャラ素材は自動で消費されます') +
        '</div>' +
      '</div>';
  } else {
    listEl.innerHTML += buildLimitBreakLackHTML(target);
  }

  document.getElementById('limitbreak-modal').classList.add('active');
}

function closeLimitBreakModal(){
  document.getElementById('limitbreak-modal').classList.remove('active');
}

function confirmLimitBreak(materialDbId){
  var target = currentDetailData;
  if(!target) return;

  var isEri = Number(target.id) === 1;
  var isNoah = Number(target.id) === 52;
  var mat = null;

  if(!isEri && !isNoah){
    mat = materialDbId
      ? box.find(function(b){ return b.db_id === materialDbId; })
      : getAutoLimitBreakMaterial(target);

    if(!mat){
      showToast('同キャラ素材が不足しています');
      return;
    }
  }

  var status = getLimitBreakMaterialStatus(target, selectedLimitBreakSoulVesselId);
  if(!status.canLimitBreak){
    showToast('限界突破素材が不足しています');
    return;
  }

  var beforeLb = target.limitBreak || 0;
  var afterLb = Math.min(beforeLb + 1, MAX_LIMIT_BREAK);

  var recipe = status.recipe;
  var selectedVessel = status.selectedSoulVessel;
  var vesselDef = selectedVessel && selectedVessel.def
    ? selectedVessel.def
    : getEvolutionMaterialDef(recipe.soulVesselId);
  var stoneDef = getEvolutionMaterialDef(recipe.stoneId);
  var materialName = mat && mat.name ? mat.name : (target.name || '同キャラ');
  var firstConsumeName = recipe.specialMaterialId
    ? ((getEvolutionMaterialDef(recipe.specialMaterialId) || {}).name || '専用限界突破素材')
    : materialName;
  var firstConsumeCount = recipe.specialMaterialId
    ? recipe.specialMaterialCount
    : 1;

  document.getElementById('lb-confirm-text').innerHTML =
    '<div class="lb-confirm-message lb-confirm-message-strong">限界突破を実行しますか？</div>' +
    buildNextResonanceBonusHTML(target, afterLb) +
    '<div class="lb-confirm-consume-box">' +
      '<div class="lb-confirm-consume-title">消失する素材</div>' +
      '<div class="lb-confirm-consume-row">' +
        '<span class="lb-confirm-consume-name">' + escapeHtml(firstConsumeName) + '</span>' +
        '<span class="lb-confirm-consume-count">× ' + firstConsumeCount + '</span>' +
      '</div>' +
      '<div class="lb-confirm-consume-row">' +
        '<span class="lb-confirm-consume-name">' + escapeHtml(vesselDef ? vesselDef.name : '魂の器') + '</span>' +
        '<span class="lb-confirm-consume-count">× ' + recipe.soulVesselCount + '</span>' +
      '</div>' +
      '<div class="lb-confirm-consume-row">' +
        '<span class="lb-confirm-consume-name">' + escapeHtml(stoneDef ? stoneDef.name : '共鳴石') + '</span>' +
        '<span class="lb-confirm-consume-count">× ' + recipe.stoneCount + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="lb-confirm-level"><span>限界突破Lv</span><strong>' + beforeLb + ' → ' + afterLb + '</strong></div>' +
    '<div class="lb-confirm-warning">上記の素材は実行後に元へ戻せません。</div>';

  var okBtn = document.getElementById('lb-confirm-ok-btn');
  okBtn.textContent = 'はい';
  okBtn.onclick = async function(){
    okBtn.disabled = true;

    // 決定直後に白い演出カバーを先に出す。
    // 背後のキャラ一覧を1フレームでも見せず、そのまま強化演出へ繋ぐ。
    beginLimitBreakTransitionCover();
    closeModal('limitbreak-confirm-modal');
    closeLimitBreakModal();

    var fromLbForEffect = Number(target.limitBreak || 0);
    var ok = await executeLimitBreak(target, mat, selectedLimitBreakSoulVesselId, { silent:true });
    if(ok){
      await playLimitBreakPowerupEffect(target, fromLbForEffect, Number(target.limitBreak || 0));

      // 演出終了後に一覧/詳細を更新する。
      renderBox();
      updateMainUI();
      if(currentZukanMainTab !== 'box') showDetail(target, false);
      updateZukanLimitBreakNotice();

      var completeText = document.getElementById('lb-complete-text');
      if(completeText){
        var unlockedBonus = getResonanceBonusMaster(target);
        var unlocked = unlockedBonus && unlockedBonus[target.limitBreak];
        completeText.style.whiteSpace = 'pre-line';
        completeText.textContent = '限界突破Lvが ' + target.limitBreak + ' になりました。' +
          (unlocked ? '\n「' + unlocked.title + '」を解放しました。' : '');
      }
      var completeModal = document.getElementById('limitbreak-complete-modal');
      if(completeModal) completeModal.classList.add('active');
    } else {
      endLimitBreakTransitionCover();
    }
    okBtn.disabled = false;
  };

  document.getElementById('limitbreak-confirm-modal').classList.add('active');
}


function _resonanceSafeJson(value){
  try { return JSON.stringify(value); }
  catch(e) { return String(value); }
}

function _buildResonanceDiagnostic(error, target, beforeState){
  var raw = error || {};
  var cause = raw.cause || {};
  var diagnostic = {
    timestamp: new Date().toISOString(),
    page: location.href,
    online: navigator.onLine,
    userAgent: navigator.userAgent,
    userId: typeof userId !== 'undefined' ? userId : null,
    target: {
      id: target && target.id,
      name: target && target.name,
      db_id: target && target.db_id,
      beforeLimitBreak: beforeState && beforeState.limitBreak,
      attemptedLimitBreak: (raw && raw.attemptedLimitBreak != null) ? raw.attemptedLimitBreak : (target && target.limitBreak),
      rarity: target && target.rarity
    },
    error: {
      name: raw.name || '',
      message: raw.message || String(raw),
      code: raw.code || cause.code || '',
      details: raw.details || cause.details || '',
      hint: raw.hint || cause.hint || '',
      status: raw.status || cause.status || '',
      statusText: raw.statusText || cause.statusText || ''
    },
    lastSupabaseResult: window.__lastResonanceSupabaseResult || null
  };
  return diagnostic;
}

function showResonanceDiagnostic(error, target, beforeState){
  var diagnostic = _buildResonanceDiagnostic(error, target, beforeState);
  window.__lastResonanceDiagnostic = diagnostic;
  try { localStorage.setItem('zeraphia_last_resonance_diagnostic', JSON.stringify(diagnostic)); } catch(e) {}

  var old = document.getElementById('resonance-diagnostic-modal');
  if(old) old.remove();

  var overlay = document.createElement('div');
  overlay.id = 'resonance-diagnostic-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

  var panel = document.createElement('div');
  panel.style.cssText = 'width:min(430px,100%);max-height:86dvh;overflow:auto;background:#171717;border:1px solid rgba(255,255,255,.22);border-radius:14px;padding:18px;color:#fff;font-family:monospace;box-sizing:border-box;';

  var title = document.createElement('div');
  title.textContent = '共鳴保存エラー診断';
  title.style.cssText = 'font-family:"Noto Serif JP",serif;font-size:18px;font-weight:700;margin-bottom:10px;color:#ff9d9d;';

  var lead = document.createElement('div');
  lead.textContent = '素材と限界突破Lvは元に戻しました。下の内容をスクリーンショットしてください。';
  lead.style.cssText = 'font-family:"Noto Serif JP",serif;font-size:12px;line-height:1.6;color:#ddd;margin-bottom:12px;';

  var pre = document.createElement('pre');
  pre.textContent = JSON.stringify(diagnostic, null, 2);
  pre.style.cssText = 'white-space:pre-wrap;word-break:break-all;background:#090909;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:12px;font-size:10px;line-height:1.5;color:#d7e4ff;';

  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;margin-top:12px;';

  var copyBtn = document.createElement('button');
  copyBtn.textContent = '診断内容をコピー';
  copyBtn.style.cssText = 'flex:1;padding:12px;border:0;border-radius:8px;background:#eee;color:#111;font-weight:700;';
  copyBtn.onclick = async function(){
    var text = JSON.stringify(diagnostic, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'コピーしました';
    } catch(e) {
      window.prompt('この内容をコピーしてください', text);
    }
  };

  var closeBtn = document.createElement('button');
  closeBtn.textContent = '閉じる';
  closeBtn.style.cssText = 'flex:1;padding:12px;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:#222;color:#fff;font-weight:700;';
  closeBtn.onclick = function(){ overlay.remove(); };

  actions.appendChild(copyBtn);
  actions.appendChild(closeBtn);
  panel.appendChild(title);
  panel.appendChild(lead);
  panel.appendChild(pre);
  panel.appendChild(actions);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}


