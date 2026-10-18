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
  var ids = (typeof getLimitBreakSoulVesselIdsForTarget === 'function')
    ? getLimitBreakSoulVesselIdsForTarget(currentDetailData)
    : getSoulVesselMaterialIdsByElement(currentDetailData.element);
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
      '<div class="lb-recipe-count"><b>' + ownedNum + '</b><small>/ ' + needNum + '</small></div>' +
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
  } else if(recipe.sameChara > 0) {
    firstMaterialRow = row(charaIcon, charaName, status.sameCharaOwned, recipe.sameChara);
  }

  var stoneRow = recipe.stoneCount > 0
    ? row(stoneIcon, stoneDef ? stoneDef.name : '共鳴石', status.stoneOwned, recipe.stoneCount)
    : '';

  return '<div class="lb-recipe-box">' +
    '<div class="lb-recipe-title">必要素材</div>' +
    firstMaterialRow +
    buildSoulVesselHTML() +
    stoneRow +
  '</div>' +
  buildResonanceBonusHTML(target);
}



function getLimitBreakCutImage(target){
  if(!target) return '';
  if(target.cutImg) return target.cutImg;
  var idText = String(Number(target.id || 0)).padStart(2, '0');
  return 'images/chara_' + idText + '_cut.webp';
}

// ============================================================
// build1559 LIMIT BREAK EFFECT (lbx)
// 決定 → 白カバー(サーバー確定待ち) → 強化演出 → キャラ詳細へフェード。
// カバーと演出は同一要素で、class切替を同一フレームで行うため背後は一度も見えない。
// ============================================================
var LBX_DURATION_MS = 3900;
var LBX_FADE_MS = 520;
var LBX_ELEMENT_ACCENT = {
  fire:'224,96,63', aqua:'63,143,216', wood:'74,163,92',
  light:'214,167,44', dark:'138,92,200', neutral:'179,154,106'
};

function ensureLimitBreakPowerupEffect(){
  var old = document.getElementById('limitbreak-powerup-effect');
  if(old && old.classList.contains('lbx')) return old;
  if(old) old.remove();

  var motes = '';
  for(var i = 0; i < 18; i++){
    var x = (Math.round((Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * 84) + 8);
    motes += '<i style="--x:' + x + '%;--d:' + (1.05 + (i % 5) * 0.11).toFixed(2) + 's;--s:' + (3 + (i % 3)) + 'px;--w:' + ((i * 37) % 9 - 4) + 'vw;--t:' + (1050 + (i * 83) % 900) + 'ms"></i>';
  }
  var shards = '';
  for(var k = 0; k < 12; k++){
    shards += '<i style="--a:' + (k * 30 + (k % 2 ? 9 : -6)) + 'deg;--l:' + (k % 3 === 0 ? 46 : 32) + 'vmin"></i>';
  }

  var el = document.createElement('div');
  el.id = 'limitbreak-powerup-effect';
  el.className = 'lb-powerup-effect lbx';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<div class="lbx-bg"></div>' +
    '<div class="lbx-rays"></div>' +
    '<div class="lbx-sigil"><i class="s1"></i><i class="s2"></i><i class="s3"></i><i class="s4"></i></div>' +
    '<div class="lbx-core"></div>' +
    '<div class="lbx-pillar"></div>' +
    '<div class="lbx-chara"><img id="lb-powerup-cut" alt="" decoding="async"></div>' +
    '<div class="lbx-ring r1"></div><div class="lbx-ring r2"></div><div class="lbx-ring r3"></div>' +
    '<div class="lbx-shards">' + shards + '</div>' +
    '<div class="lbx-motes">' + motes + '</div>' +
    '<div class="lbx-flash"></div>' +
    '<div class="lbx-copy">' +
      '<small>RESONANCE</small>' +
      '<strong class="lbx-title" aria-label="LIMIT BREAK"></strong>' +
      '<span class="lbx-name" id="lb-powerup-name"></span>' +
      '<div class="lbx-level" id="lb-powerup-level"></div>' +
      '<div class="lbx-pips" id="lbx-pips"></div>' +
      '<p class="lbx-unlock" id="lbx-unlock"></p>' +
    '</div>' +
    '<div class="lbx-skip">TAP TO SKIP</div>';

  var title = el.querySelector('.lbx-title');
  'LIMIT BREAK'.split('').forEach(function(ch, idx){
    var span = document.createElement('span');
    span.textContent = ch === ' ' ? ' ' : ch;
    span.style.setProperty('--i', idx);
    title.appendChild(span);
  });
  document.body.appendChild(el);
  return el;
}

function beginLimitBreakTransitionCover(){
  var el = ensureLimitBreakPowerupEffect();
  el.classList.remove('show', 'lbx-out');
  el.classList.add('preparing');
  return el;
}

function endLimitBreakTransitionCover(){
  var el = document.getElementById('limitbreak-powerup-effect');
  if(!el) return;
  el.classList.remove('preparing');
}

function getLimitBreakUnlockTitles(target, fromLb, toLb){
  var master = (typeof getResonanceBonusMaster === 'function') ? getResonanceBonusMaster(target) : null;
  var titles = [];
  if(!master) return titles;
  for(var lv = Number(fromLb || 0) + 1; lv <= Number(toLb || 0); lv++){
    var b = master[lv];
    if(b && (b.title || b.summary)) titles.push(String(b.title || b.summary));
  }
  return titles;
}

function loadLimitBreakCutImage(img, candidates, timeoutMs){
  return new Promise(function(resolve){
    if(!img || !candidates.length){ if(img) img.removeAttribute('src'); resolve(false); return; }
    var index = 0;
    var done = false;
    var finish = function(ok){ if(done) return; done = true; resolve(ok); };
    var timer = setTimeout(function(){ finish(false); }, timeoutMs);
    img.onload = function(){
      clearTimeout(timer);
      if(typeof img.decode === 'function') img.decode().catch(function(){}).then(function(){ finish(true); });
      else finish(true);
    };
    img.onerror = function(){
      index++;
      if(index < candidates.length) img.src = candidates[index];
      else { clearTimeout(timer); img.removeAttribute('src'); finish(false); }
    };
    img.src = candidates[0];
  });
}

function playLimitBreakPowerupEffect(target, fromLb, toLb){
  // 画像の読込はカバー表示中に最大1.2秒だけ待つ。失敗しても演出は必ず完走する。
  var el = ensureLimitBreakPowerupEffect();
  if(!el.classList.contains('preparing')) el.classList.add('preparing');

  var from = Number(fromLb || 0);
  var to = Number(toLb || 0);
  var max = (typeof MAX_LIMIT_BREAK !== 'undefined') ? Number(MAX_LIMIT_BREAK) : 4;

  var name = document.getElementById('lb-powerup-name');
  if(name) name.textContent = target && target.name ? target.name : '';
  var level = document.getElementById('lb-powerup-level');
  if(level){
    level.innerHTML = '<small>共鳴Lv</small><b class="from">' + from + '</b><em aria-hidden="true"></em><b class="to">' + to + '</b>';
  }
  var pips = document.getElementById('lbx-pips');
  if(pips){
    var html = '';
    for(var p = 1; p <= max; p++){
      var cls = p <= from ? 'on' : (p <= to ? 'gain' : '');
      html += '<i class="' + cls + '" style="--n:' + Math.max(0, p - from - 1) + '"></i>';
    }
    pips.innerHTML = html;
  }
  var unlock = document.getElementById('lbx-unlock');
  if(unlock){
    var titles = getLimitBreakUnlockTitles(target, from, to);
    unlock.textContent = titles.length ? '解放「' + titles.join('」「') + '」' : '';
    unlock.style.display = titles.length ? '' : 'none';
  }
  var elementKey = String(target && target.element || 'neutral').toLowerCase();
  el.style.setProperty('--lbx-accent', LBX_ELEMENT_ACCENT[elementKey] || LBX_ELEMENT_ACCENT.neutral);

  var img = document.getElementById('lb-powerup-cut');
  var candidates = [getLimitBreakCutImage(target), target && target.upImg,
    target && target.img, target && target.panelImg]
    .filter(function(src,i,arr){return !!src && arr.indexOf(src) === i;});

  return loadLimitBreakCutImage(img, candidates, 1200).then(function(){
    return new Promise(function(resolve){
      var finished = false;
      var timers = [];
      var finish = function(){
        if(finished) return;
        finished = true;
        timers.forEach(clearTimeout);
        el.removeEventListener('pointerdown', onSkip);
        el.classList.remove('show', 'lbx-out', 'preparing');
        resolve(true);
      };
      var fadeOut = function(){
        if(finished || el.classList.contains('lbx-out')) return;
        el.classList.add('lbx-out');
        timers.push(setTimeout(finish, LBX_FADE_MS));
      };
      var onSkip = function(){
        // 誤タップ防止：バースト(0.9秒)前はスキップしない。
        if(performance.now() - startedAt < 900) return;
        fadeOut();
      };
      var startedAt = performance.now();

      // カバー → 演出は同一フレームで切替（間に背後が見えるフレームを作らない）。
      el.classList.remove('show', 'lbx-out');
      void el.offsetWidth;
      el.classList.add('show');
      el.classList.remove('preparing');
      el.addEventListener('pointerdown', onSkip);

      timers.push(setTimeout(fadeOut, LBX_DURATION_MS - LBX_FADE_MS));
    });
  });
}

function buildBulkLimitBreakSummaryHTML(target, plan){
  if(!plan || !plan.count) return '';
  var isStory = isStoryLimitBreakCharacter(target);
  var stoneTotal = plan.steps.reduce(function(sum, step){ return sum + Number(step.stoneCount || 0); }, 0);
  var vesselCounts = {};
  plan.steps.forEach(function(step){
    vesselCounts[step.soulVesselId] = Number(vesselCounts[step.soulVesselId] || 0) + 1;
  });

  var materialRows = [];
  if(isStory){
    var fragmentDef = getEvolutionMaterialDef('memory_fragment');
    materialRows.push('<div class="lb-confirm-consume-row"><span class="lb-confirm-consume-name">' + escapeHtml(fragmentDef ? fragmentDef.name : '記憶の欠片') + '</span><span class="lb-confirm-consume-count">× ' + plan.count + '</span></div>');
  } else {
    materialRows.push('<div class="lb-confirm-consume-row"><span class="lb-confirm-consume-name">' + escapeHtml(target.name || '同キャラ') + '</span><span class="lb-confirm-consume-count">× ' + plan.count + '</span></div>');
  }

  Object.keys(vesselCounts).forEach(function(id){
    var def = getEvolutionMaterialDef(id);
    materialRows.push('<div class="lb-confirm-consume-row"><span class="lb-confirm-consume-name">' + escapeHtml(def ? def.name : '魂の器') + '</span><span class="lb-confirm-consume-count">× ' + vesselCounts[id] + '</span></div>');
  });
  if(stoneTotal > 0){
    materialRows.push('<div class="lb-confirm-consume-row"><span class="lb-confirm-consume-name">共鳴石</span><span class="lb-confirm-consume-count">× ' + stoneTotal + '</span></div>');
  }

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
      var material = isStoryLimitBreakCharacter(target) ? null : getAutoLimitBreakMaterial(target);
      var ok = await executeLimitBreak(target, material, step.soulVesselId, { silent:true, bulk:true });
      if(!ok) break;
      completed++;
    }

    if(completed > 0){
      // build1559: 背後はキャラ詳細のまま最新化（カバーの裏）→ 演出 → そのまま詳細へ。
      try { refreshLimitBreakScreens(target); } catch(e){ console.warn('[Resonance] refresh before effect failed', e); }
      await playLimitBreakPowerupEffect(target, fromLb, Number(target.limitBreak || 0));
    } else {
      endLimitBreakTransitionCover();
    }

    okBtn.disabled = false;
  };

  document.getElementById('limitbreak-confirm-modal').classList.add('active');
}
window.confirmBulkLimitBreak = confirmBulkLimitBreak;


async function openLimitBreakModal(target){
  if(!target) return;
  var listEl = document.getElementById('lb-material-list');
  if(!listEl) return;

  // build1335: ストーリー／ガチャ双方、サーバーの所持数を読み直してから素材判定する。
  if(typeof window.loadInventoryFromSupabase === 'function'){
    listEl.innerHTML = '<div class="lb-no-material">所持素材を確認しています…</div>';
    document.getElementById('limitbreak-modal').classList.add('active');
    try {
      await window.loadInventoryFromSupabase(userId);
    } catch(error){
      console.warn('[Resonance] material refresh failed', error);
      listEl.innerHTML = '<div class="lb-no-material">素材情報を取得できませんでした。通信状態を確認して開き直してください。</div>';
      return;
    }
    if(!document.getElementById('limitbreak-modal').classList.contains('active')) return;
  }

  var targetKey = getLimitBreakTargetKey(target);
  var validVesselIds = (typeof getLimitBreakSoulVesselIdsForTarget === 'function')
    ? getLimitBreakSoulVesselIdsForTarget(target)
    : getSoulVesselMaterialIdsByElement(target.element);
  if(selectedLimitBreakTargetKey !== targetKey || validVesselIds.indexOf(selectedLimitBreakSoulVesselId) === -1){
    selectedLimitBreakSoulVesselId = resolveLimitBreakSoulVesselId(target, selectedLimitBreakSoulVesselId);
  }
  selectedLimitBreakTargetKey = targetKey;

  var status = getLimitBreakMaterialStatus(target, selectedLimitBreakSoulVesselId);
  // build1479: 対象キャラと「共鳴Lv 現在 → 次」をヘッダーに表示
  var headEl = document.getElementById('lb-head-status');
  if(headEl){
    var curLb = Math.max(0, Number(target.limitBreak || 0));
    var nextLb = Math.min(curLb + 1, MAX_LIMIT_BREAK);
    var pips = '';
    for(var pi = 1; pi <= MAX_LIMIT_BREAK; pi++){
      pips += '<i class="' + (pi <= curLb ? 'on' : (pi === nextLb && curLb < MAX_LIMIT_BREAK ? 'next' : '')) + '"></i>';
    }
    var headImg = target.panelImg || ('images/chara_' + String(Number(target.id || 0)).padStart(2, '0') + '_panel.webp');
    headEl.innerHTML =
      '<span class="lb-head-face"><img src="' + headImg + '" alt="" onerror="this.style.visibility=\'hidden\'"></span>' +
      '<span class="lb-head-body">' +
        '<strong>' + escapeHtml(target.name || '') + '</strong>' +
        '<span class="lb-head-pips" aria-label="共鳴Lv ' + curLb + '">' + pips + '</span>' +
      '</span>' +
      '<span class="lb-head-level">' +
        (curLb >= MAX_LIMIT_BREAK
          ? '<b class="is-max">MAX</b>'
          : '<small>共鳴Lv</small><b>' + curLb + '</b><em aria-hidden="true">→</em><b class="is-next">' + nextLb + '</b>') +
      '</span>';
  }
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
            ? '記憶の欠片を同キャラ素材の代わりに消費します'
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

  var isStory = isStoryLimitBreakCharacter(target);
  var mat = null;

  if(!isStory){
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
  var consumeRows = '';
  if(recipe.specialMaterialId){
    var specialName = ((getEvolutionMaterialDef(recipe.specialMaterialId) || {}).name || '専用限界突破素材');
    consumeRows += '<div class="lb-confirm-consume-row">' +
      '<span class="lb-confirm-consume-name">' + escapeHtml(specialName) + '</span>' +
      '<span class="lb-confirm-consume-count">× ' + recipe.specialMaterialCount + '</span>' +
    '</div>';
  } else if(recipe.sameChara > 0){
    consumeRows += '<div class="lb-confirm-consume-row">' +
      '<span class="lb-confirm-consume-name">' + escapeHtml(materialName) + '</span>' +
      '<span class="lb-confirm-consume-count">× ' + recipe.sameChara + '</span>' +
    '</div>';
  }
  consumeRows += '<div class="lb-confirm-consume-row">' +
    '<span class="lb-confirm-consume-name">' + escapeHtml(vesselDef ? vesselDef.name : '魂の器') + '</span>' +
    '<span class="lb-confirm-consume-count">× ' + recipe.soulVesselCount + '</span>' +
  '</div>';
  if(recipe.stoneCount > 0){
    consumeRows += '<div class="lb-confirm-consume-row">' +
      '<span class="lb-confirm-consume-name">' + escapeHtml(stoneDef ? stoneDef.name : '共鳴石') + '</span>' +
      '<span class="lb-confirm-consume-count">× ' + recipe.stoneCount + '</span>' +
    '</div>';
  }

  document.getElementById('lb-confirm-text').innerHTML =
    '<div class="lb-confirm-message lb-confirm-message-strong">限界突破を実行しますか？</div>' +
    buildNextResonanceBonusHTML(target, afterLb) +
    '<div class="lb-confirm-consume-box">' +
      '<div class="lb-confirm-consume-title">消失する素材</div>' +
      consumeRows +
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
      // build1559: 背後はキャラ詳細のまま最新化（カバーの裏）→ 演出 → そのまま詳細へ。
      try { refreshLimitBreakScreens(target); } catch(e){ console.warn('[Resonance] refresh before effect failed', e); }
      await playLimitBreakPowerupEffect(target, fromLbForEffect, Number(target.limitBreak || 0));
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


