// shinju.js
// ZERAPHIA: 神樹 / ゼラフィア創世進捗
// 依存: なし
// 使い方:
//   openShinjuScreen()                         : 神樹画面を開く
//   ShinjuProgress.grantBossItemFromRoguelite(): ボス撃破アイテムを付与
//   ShinjuProgress.getState()                  : 現在状態を取得

(function () {
  'use strict';

  const STORAGE_KEY = 'zeraphia_shinju_progress_v1';
  const CLOUD_STORAGE_KEY = 'zeraphia_shinju_v1';
  const EVENT_NAME = 'shinju-progress-updated';
  const MAX_STAGE = 5;
  const BLESSING_SLOTS = Object.freeze(['hp', 'atk', 'ult']);
  const BLESSING_LABELS = Object.freeze({ hp: 'HP SLOT', atk: 'ATK SLOT', ult: 'ULT SLOT' });

  // stage 1 = shinju_01.webp（芽） / stage 5 = shinju_05.webp（大木）
  const STAGE_EXP = [0, 1000, 2000, 4000, 7000];
  const COMPLETE_EXP = 10000;
  const STAGE_LABELS = [
    '萌芽',
    '若芽',
    '幼樹',
    '聖樹',
    '神樹',
  ];

  // 神聖樹の加護。段階1→5で最終 HP/ATK +25%、ULT還元20%。
  const BLESSING_RATE_BY_STAGE = Object.freeze({
    1: Object.freeze({ hp: 0.05, atk: 0.05, ult: 0.04 }),
    2: Object.freeze({ hp: 0.10, atk: 0.10, ult: 0.08 }),
    3: Object.freeze({ hp: 0.15, atk: 0.15, ult: 0.12 }),
    4: Object.freeze({ hp: 0.20, atk: 0.20, ult: 0.16 }),
    5: Object.freeze({ hp: 0.25, atk: 0.25, ult: 0.20 }),
  });

  const DEFAULT_BOSS_ITEM_EXP = 120;
  const RUN_REWARD_MASTER = {
    default: {
      bossId: 'enemy_01',
      bossName: 'レムナント：オーバーシア',
      itemName: '白糸の創世片',
      itemDesc: '白糸の残響から剥離した創世資源。神樹へ奉納できる。',
      exp: 140,
    },
    sakiel: {
      bossId: 'enemy_sakiel_roguelite',
      bossName: '大天使 サキエル',
      itemName: '天使核・サキエル',
      itemDesc: 'サキエルの残響から得た創世核。神樹へ奉納できる。',
      exp: 180,
    },
  };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, Number(n || 0)));
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function safeParse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
  }

  function stateTimestamp(state) {
    const t = Date.parse(state && state.updatedAt || '');
    return Number.isFinite(t) ? t : 0;
  }

  function readState() {
    try {
      // 旧実データキーとクラウド同期キーの両方を読み、更新時刻が新しい方を採用する。
      // build756以降はsaveState()で両方を同時更新する。
      const legacy = safeParse(localStorage.getItem(STORAGE_KEY));
      const cloud = safeParse(localStorage.getItem(CLOUD_STORAGE_KEY));
      const selected = stateTimestamp(cloud) > stateTimestamp(legacy) ? cloud : (legacy || cloud);
      return normalizeState(selected || createInitialState());
    } catch (err) {
      console.warn('[ShinjuProgress] 保存データ読込に失敗:', err);
      return createInitialState();
    }
  }

  function createInitialState() {
    return {
      exp: 0,
      inventory: [],
      offeredItems: [],
      gameClearSeen: false,
      blessings: { hp: null, atk: null, ult: null },
      updatedAt: new Date().toISOString(),
    };
  }

  function normalizeCharacterId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  function normalizeBlessings(value) {
    const src = value && typeof value === 'object' ? value : {};
    const normalized = {
      hp: normalizeCharacterId(src.hp),
      atk: normalizeCharacterId(src.atk),
      ult: normalizeCharacterId(src.ult),
    };

    // 同一キャラの重複加護は不可。古い/壊れた保存値も読み込み時に安全化する。
    const seen = new Set();
    BLESSING_SLOTS.forEach(slot => {
      const id = normalized[slot];
      if (id == null) return;
      if (seen.has(id)) normalized[slot] = null;
      else seen.add(id);
    });
    return normalized;
  }

  function normalizeState(state) {
    const s = state && typeof state === 'object' ? state : createInitialState();
    return {
      exp: Math.max(0, Number(s.exp || 0)),
      inventory: Array.isArray(s.inventory) ? s.inventory.filter(Boolean) : [],
      offeredItems: Array.isArray(s.offeredItems) ? s.offeredItems.filter(Boolean) : [],
      gameClearSeen: !!s.gameClearSeen,
      blessings: normalizeBlessings(s.blessings || s.blessingSlots || s.slots),
      updatedAt: s.updatedAt || new Date().toISOString(),
    };
  }

  let cloudSaveTimer = 0;
  function queueCloudSave() {
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => {
      try {
        if (typeof window.saveShinjuToSupabase === 'function') {
          Promise.resolve(window.saveShinjuToSupabase()).catch(err => {
            console.warn('[ShinjuProgress] cloud save skipped:', err && (err.message || err));
          });
        }
      } catch (err) {
        console.warn('[ShinjuProgress] cloud save failed:', err);
      }
    }, 120);
  }

  function writeStateLocal(state) {
    const s = normalizeState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify(s));
    return s;
  }

  function saveState(state, options) {
    const s = normalizeState(state);
    s.updatedAt = new Date().toISOString();
    writeStateLocal(s);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: getViewState(s) }));
    if (!options || options.cloud !== false) queueCloudSave();
    return s;
  }

  function getBlessingRates(stage) {
    const n = clamp(Math.floor(Number(stage || 1)), 1, MAX_STAGE);
    return Object.assign({}, BLESSING_RATE_BY_STAGE[n] || BLESSING_RATE_BY_STAGE[1]);
  }

  function getBlessingForCharacter(characterId, stateOverride) {
    const id = normalizeCharacterId(characterId);
    const view = getViewState(stateOverride || readState());
    const slots = view.blessings || {};
    const rates = view.blessingRates || getBlessingRates(view.stage);
    return {
      characterId: id,
      stage: view.stage,
      hpRate: id != null && Number(slots.hp) === id ? Number(rates.hp || 0) : 0,
      atkRate: id != null && Number(slots.atk) === id ? Number(rates.atk || 0) : 0,
      ultRefundRate: id != null && Number(slots.ult) === id ? Number(rates.ult || 0) : 0,
    };
  }

  function applyBlessingToProfile(profile, characterId) {
    if (!profile || typeof profile !== 'object') return profile;
    const blessing = getBlessingForCharacter(characterId);
    if (!blessing.hpRate && !blessing.atkRate) return profile;
    const next = Object.assign({}, profile);
    if (blessing.hpRate) next.hp = Math.max(1, Math.round(Number(profile.hp || 1) * (1 + blessing.hpRate)));
    if (blessing.atkRate) next.atk = Math.max(0, Math.round(Number(profile.atk || 0) * (1 + blessing.atkRate)));
    next.shinjuBlessing = blessing;
    return next;
  }

  function getStageByExp(exp) {
    const value = Math.max(0, Number(exp || 0));
    let stage = 1;
    for (let i = 0; i < STAGE_EXP.length; i++) {
      if (value >= STAGE_EXP[i]) stage = i + 1;
    }
    return clamp(stage, 1, MAX_STAGE);
  }

  function getViewState(state) {
    const s = normalizeState(state || readState());
    const stage = getStageByExp(s.exp);
    const currentMin = STAGE_EXP[stage - 1] || 0;
    const nextNeed = stage >= MAX_STAGE ? COMPLETE_EXP : STAGE_EXP[stage];
    const isMax = s.exp >= COMPLETE_EXP;
    const intoStage = Math.max(0, s.exp - currentMin);
    const stageSpan = Math.max(1, nextNeed - currentMin);
    const progress = isMax ? 100 : clamp((intoStage / stageSpan) * 100, 0, 100);

    return Object.assign({}, s, {
      stage,
      maxStage: MAX_STAGE,
      stageLabel: STAGE_LABELS[stage - 1] || '神樹',
      progress,
      currentStageExp: currentMin,
      nextStageExp: isMax ? null : nextNeed,
      totalRequiredExp: COMPLETE_EXP,
      isMax,
      pendingItemCount: s.inventory.length,
      blessingRates: getBlessingRates(stage),
      imageSrc: `images/shinju_${String(stage).padStart(2, '0')}.webp?v=758`,
    });
  }

  function setGameClearSeen(value) {
    const state = readState();
    state.gameClearSeen = !!value;
    saveState(state);
  }

  function grantBossItem(opts) {
    const o = opts || {};
    const state = readState();
    const item = {
      id: uid('shinju_item'),
      bossId: o.bossId || 'unknown_boss',
      bossName: o.bossName || 'UNKNOWN BOSS',
      runId: o.runId || '',
      name: o.itemName || o.name || '創世片',
      exp: Math.max(1, Number(o.exp || DEFAULT_BOSS_ITEM_EXP)),
      rank: o.rank || '',
      obtainedAt: new Date().toISOString(),
    };
    state.inventory.push(item);
    saveState(state);
    return item;
  }

  function grantBossItemFromRoguelite(payload) {
    const p = payload || {};
    const runId = p.runId || (window.RogueliteRun && window.RogueliteRun.getRunId && window.RogueliteRun.getRunId()) || window.__ROGUELITE_PENDING_RUN_ID__ || 'default';
    const master = RUN_REWARD_MASTER[runId] || RUN_REWARD_MASTER.default;
    return grantBossItem(Object.assign({}, master, {
      runId,
      rank: p.rank || '',
      totalTurns: p.totalTurns || 0,
    }));
  }

  function offerItem(itemId) {
    const state = readState();
    const idx = state.inventory.findIndex(item => item && item.id === itemId);
    if (idx < 0) return { ok: false, reason: 'not_found', state: getViewState(state) };

    const before = getViewState(state);
    const item = state.inventory.splice(idx, 1)[0];
    state.exp = Math.max(0, Number(state.exp || 0) + Number(item.exp || 0));
    state.offeredItems.push(Object.assign({}, item, { offeredAt: new Date().toISOString() }));
    const saved = saveState(state);
    const after = getViewState(saved);

    return {
      ok: true,
      item,
      before,
      after,
      levelUp: after.stage > before.stage,
      reachedMax: after.isMax && !before.isMax,
    };
  }

  function offerAllItems() {
    const state = readState();
    if (!state.inventory.length) {
      return { ok: false, reason: 'empty', state: getViewState(state) };
    }

    const before = getViewState(state);
    const items = state.inventory.slice();
    const totalExp = items.reduce((sum, item) => sum + Math.max(0, Number(item && item.exp || 0)), 0);
    const offeredAt = new Date().toISOString();

    state.inventory = [];
    state.exp = Math.max(0, Number(state.exp || 0) + totalExp);
    state.offeredItems.push(...items.map(item => Object.assign({}, item, { offeredAt })));

    const saved = saveState(state);
    const after = getViewState(saved);

    return {
      ok: true,
      items,
      totalExp,
      before,
      after,
      levelUp: after.stage > before.stage,
      reachedMax: after.isMax && !before.isMax,
    };
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureOverlay() {
    let ov = document.getElementById('shinju-overlay');
    if (ov) return ov;

    ov = document.createElement('div');
    ov.id = 'shinju-overlay';
    ov.innerHTML = `
      <div class="shinju-panel" role="dialog" aria-modal="true" aria-label="ゼラフィア創世進捗">
        <button class="shinju-close" type="button" onclick="closeShinjuScreen()">＜戻る</button>
        <div class="shinju-visual-wrap">
          <img class="shinju-visual" id="shinju-visual" src="images/shinju_01.webp?v=758" alt="神樹">
          <div class="shinju-visual-glow"></div>
          <div class="shinju-aura-field" id="shinju-aura-field" aria-hidden="true"></div>
          <div class="shinju-hero-info" aria-label="神樹の成長情報">
            <div class="shinju-stage" id="shinju-stage"></div>
            <div class="shinju-progress-box">
              <div class="shinju-progress-head">
                <span id="shinju-exp-label"></span>
                <span id="shinju-exp-percent"></span>
              </div>
              <div class="shinju-progress-bg"><div class="shinju-progress-fill" id="shinju-progress-fill"></div></div>
            </div>
          </div>
        </div>
        <div class="shinju-content">
          <div class="shinju-lore" id="shinju-lore"></div>
          <section class="shinju-blessing-section" aria-label="神聖樹の加護">
            <div class="shinju-blessing-head">
              <strong>神聖樹の加護</strong>
              <span>各スロットに1人</span>
            </div>
            <div class="shinju-blessing-slots" id="shinju-blessing-slots"></div>
          </section>
          <div class="shinju-offering-bar" id="shinju-offering-bar">
            <div class="shinju-offering-state">
              <span class="shinju-offering-label">奉納可能</span>
              <strong id="shinju-pending-count">0</strong>
              <small id="shinju-pending-exp"></small>
            </div>
            <button class="shinju-offer-all" id="shinju-offer-all" type="button" onclick="ShinjuProgress.offerAllFromUI()">すべて奉納</button>
          </div>
        </div>
      </div>
    `;
    ov.addEventListener('click', function (e) {
      if (e.target === ov) closeShinjuScreen();
    });
    document.body.appendChild(ov);
    return ov;
  }

  function renderHomeEntry() {
    const box = document.getElementById('shinju-home-entry');
    if (!box) return;
    const s = getViewState();

    // build522:
    // ホーム入口は「神聖樹」のテキストロゴをbutton側(data-home-head/rest)で描画する。
    // 旧ホーム画像は廃止済みのため、画像DOMを生成しない。
    box.innerHTML = `
      <span class="shinju-home-entry-badge" id="shinju-home-entry-badge" aria-hidden="true"></span>
    `;

    const label = s.isMax ? '創世完了' : `成長度 ${s.stage}/5`;
    const itemText = s.pendingItemCount > 0 ? `奉納待ち ${s.pendingItemCount}` : '奉納待ちなし';
    box.setAttribute('aria-label', `神樹へ移動。${label}。${itemText}`);
    box.title = `神樹へ / ${label} / ${itemText}`;
    const badge = box.querySelector('.shinju-home-entry-badge');
    if (badge) {
      const count = Math.max(0, Number(s.pendingItemCount || 0));
      badge.textContent = count > 99 ? '99+' : (count > 0 ? String(count) : '');
      badge.setAttribute('aria-hidden', count > 0 ? 'false' : 'true');
    }
    box.classList.toggle('has-items', s.pendingItemCount > 0);
    box.classList.toggle('is-clear', s.isMax);
  }

  const SHINJU_AURA_POSITIONS = [
    { x: 19, y: 18, s: .58, d: 0.0 },
    { x: 73, y: 21, s: .50, d: .7 },
    { x: 35, y: 29, s: .42, d: 1.1 },
    { x: 83, y: 36, s: .38, d: .3 },
    { x: 14, y: 39, s: .40, d: 1.5 },
    { x: 58, y: 14, s: .34, d: 1.9 },
    { x: 54, y: 34, s: .30, d: .9 },
  ];

  function renderAuraField(ov, state) {
    const field = ov.querySelector('#shinju-aura-field');
    if (!field) return;

    const count = Math.min(SHINJU_AURA_POSITIONS.length, Math.max(0, Number(state.pendingItemCount || 0)));
    field.classList.toggle('is-empty', count === 0);

    field.innerHTML = SHINJU_AURA_POSITIONS.slice(0, count).map((pos, index) => `
      <span class="shinju-aura-orb" data-aura-index="${index}"
        style="--aura-x:${pos.x}%;--aura-y:${pos.y}%;--aura-scale:${pos.s};--aura-delay:${pos.d}s">
        <img src="images/shinju_aura.webp" alt="">
      </span>
    `).join('');
  }

  function updateOfferingMeta(ov, state) {
    const count = ov.querySelector('#shinju-pending-count');
    const exp = ov.querySelector('#shinju-pending-exp');
    const btn = ov.querySelector('#shinju-offer-all');
    const totalExp = (state.inventory || []).reduce((sum, item) => sum + Math.max(0, Number(item && item.exp || 0)), 0);

    if (count) count.textContent = state.pendingItemCount > 0 ? `×${state.pendingItemCount}` : 'なし';
    if (exp) exp.textContent = state.pendingItemCount > 0 ? `創世EXP +${totalExp}` : '';
    if (btn) {
      btn.disabled = state.pendingItemCount <= 0 || !!ov.dataset.offering;
      btn.textContent = state.pendingItemCount > 0 ? 'すべて奉納' : '奉納する資源なし';
    }
  }

  function animateAuraOffering(ov) {
    const auras = Array.from(ov.querySelectorAll('.shinju-aura-orb'));
    const target = ov.querySelector('.shinju-progress-bg');
    if (!auras.length || !target) return Promise.resolve();

    const targetRect = target.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width * .5;
    const targetY = targetRect.top + targetRect.height * .5;

    ov.classList.add('is-offering');

    auras.forEach((aura, index) => {
      const rect = aura.getBoundingClientRect();
      const x = targetX - (rect.left + rect.width * .5);
      const y = targetY - (rect.top + rect.height * .5);
      aura.style.setProperty('--offer-x', `${x}px`);
      aura.style.setProperty('--offer-y', `${y}px`);
      aura.style.setProperty('--offer-delay', `${index * 90}ms`);
      void aura.offsetWidth;
      aura.classList.add('is-offering');
    });

    const totalMs = 760 + Math.max(0, auras.length - 1) * 90;
    return new Promise(resolve => setTimeout(resolve, totalMs));
  }

  function getCharacterModule() {
    return window.ShootingCharacters || null;
  }

  function getCharacterInfo(characterId) {
    const module = getCharacterModule();
    const id = normalizeCharacterId(characterId);
    const c = module && module.SHOOTING_CHARACTERS && module.SHOOTING_CHARACTERS[id];
    if (!c) return null;
    return {
      id,
      name: c.name || `CHARACTER ${id}`,
      image: c.panelImage || c.image || '',
      owned: typeof module.isShootingCharacterOwned === 'function' ? !!module.isShootingCharacterOwned(id) : true,
    };
  }

  function getOwnedBlessingCharacters() {
    const module = getCharacterModule();
    if (!module || !module.SHOOTING_CHARACTERS) return [];
    return Object.values(module.SHOOTING_CHARACTERS)
      .filter(Boolean)
      .filter(c => typeof module.isShootingCharacterOwned !== 'function' || module.isShootingCharacterOwned(c.id))
      .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  }

  function blessingRateLabel(slot, rate) {
    const pct = Math.round(Math.max(0, Number(rate || 0)) * 100);
    if (slot === 'hp') return `HP +${pct}%`;
    if (slot === 'atk') return `ATK +${pct}%`;
    return `ULT還元 +${pct}%`;
  }

  function setBlessingSlot(slot, characterId) {
    if (!BLESSING_SLOTS.includes(slot)) return { ok:false, reason:'invalid_slot' };
    const state = readState();
    const id = normalizeCharacterId(characterId);

    if (id != null) {
      const info = getCharacterInfo(id);
      if (!info || !info.owned) return { ok:false, reason:'not_owned' };
      const duplicate = BLESSING_SLOTS.find(other => other !== slot && Number(state.blessings[other]) === id);
      if (duplicate) {
        showTinyToast(`${info.name}は${BLESSING_LABELS[duplicate]}に設定済み`);
        return { ok:false, reason:'duplicate', duplicateSlot:duplicate };
      }
    }

    state.blessings[slot] = id;
    const saved = saveState(state);
    renderOverlay();
    renderHomeEntry();
    if (id == null) showTinyToast(`${BLESSING_LABELS[slot]}を解除した`);
    else {
      const info = getCharacterInfo(id);
      showTinyToast(`${BLESSING_LABELS[slot]}：${info ? info.name : id}`);
    }
    return { ok:true, state:getViewState(saved) };
  }

  function renderBlessingSlots(ov, state) {
    const box = ov.querySelector('#shinju-blessing-slots');
    if (!box) return;
    const rates = state.blessingRates || getBlessingRates(state.stage);
    box.innerHTML = BLESSING_SLOTS.map(slot => {
      const id = state.blessings && state.blessings[slot];
      const info = getCharacterInfo(id);
      const assigned = !!info;
      return `
        <button class="shinju-blessing-slot ${assigned ? 'is-assigned' : 'is-empty'}" type="button" data-blessing-slot="${slot}" onclick="ShinjuProgress.openBlessingPicker('${slot}')">
          <span class="shinju-blessing-slot-kind">${BLESSING_LABELS[slot]}</span>
          <span class="shinju-blessing-character-panel">
            ${assigned && info.image ? `<img src="${escapeHtml(info.image)}" alt="">` : '<span class="shinju-blessing-plus">＋</span>'}
          </span>
          <span class="shinju-blessing-slot-effect">${blessingRateLabel(slot, rates[slot])}</span>
        </button>`;
    }).join('');
  }

  function ensureBlessingPicker() {
    let picker = document.getElementById('shinju-blessing-picker');
    if (picker) return picker;
    picker = document.createElement('div');
    picker.id = 'shinju-blessing-picker';
    picker.className = 'shinju-blessing-picker';
    picker.innerHTML = `
      <div class="shinju-blessing-picker-card" role="dialog" aria-modal="true" aria-label="加護キャラクター選択">
        <div class="shinju-blessing-picker-head">
          <div class="shinju-blessing-picker-heading">
            <small>神聖樹の加護</small>
            <strong id="shinju-blessing-picker-title">SLOT</strong>
          </div>
          <button type="button" class="shinju-blessing-picker-close" onclick="ShinjuProgress.closeBlessingPicker()">閉じる</button>
        </div>
        <div class="shinju-blessing-picker-grid" id="shinju-blessing-picker-grid"></div>
        <div class="shinju-blessing-picker-foot">
          <button type="button" class="shinju-blessing-picker-clear" id="shinju-blessing-picker-clear">このスロットを解除</button>
        </div>
      </div>`;
    picker.addEventListener('click', e => {
      if (e.target === picker) closeBlessingPicker();
    });
    document.body.appendChild(picker);
    return picker;
  }

  function openBlessingPicker(slot) {
    if (!BLESSING_SLOTS.includes(slot)) return;
    const picker = ensureBlessingPicker();
    const state = getViewState();
    const title = picker.querySelector('#shinju-blessing-picker-title');
    const grid = picker.querySelector('#shinju-blessing-picker-grid');
    const clear = picker.querySelector('#shinju-blessing-picker-clear');
    if (title) title.textContent = BLESSING_LABELS[slot];
    picker.dataset.slot = slot;

    const assignedElsewhere = new Map();
    BLESSING_SLOTS.forEach(other => {
      if (other === slot) return;
      const id = Number(state.blessings && state.blessings[other]);
      if (id > 0) assignedElsewhere.set(id, other);
    });

    const chars = getOwnedBlessingCharacters();
    if (grid) {
      grid.innerHTML = chars.length ? chars.map(c => {
        const id = Number(c.id);
        const selected = Number(state.blessings && state.blessings[slot]) === id;
        const otherSlot = assignedElsewhere.get(id);
        const disabled = !!otherSlot;
        const img = c.panelImage || c.image || '';
        return `
          <button type="button" class="shinju-blessing-picker-character ${selected ? 'is-selected' : ''} ${disabled ? 'is-used' : ''}"
                  data-character-id="${id}" ${disabled ? 'disabled' : ''}>
            <span class="shinju-blessing-picker-portrait">${img ? `<img src="${escapeHtml(img)}" alt="" loading="lazy">` : ''}</span>
            <span class="shinju-blessing-picker-meta">
              <b>${escapeHtml(c.name || `CHARACTER ${id}`)}</b>
            </span>
          </button>`;
      }).join('') : '<div class="shinju-blessing-picker-empty">所持キャラクターがありません</div>';

      grid.querySelectorAll('.shinju-blessing-picker-character:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.characterId);
          const result = setBlessingSlot(slot, id);
          if (result && result.ok) closeBlessingPicker();
        });
      });
    }
    if (clear) {
      clear.disabled = !(state.blessings && state.blessings[slot]);
      clear.onclick = () => {
        setBlessingSlot(slot, null);
        closeBlessingPicker();
      };
    }
    picker.classList.add('active');
  }

  function closeBlessingPicker() {
    const picker = document.getElementById('shinju-blessing-picker');
    if (picker) picker.classList.remove('active');
  }

  function renderOverlay() {
    const ov = ensureOverlay();
    const s = getViewState();
    const img = ov.querySelector('#shinju-visual');
    const stage = ov.querySelector('#shinju-stage');
    const expLabel = ov.querySelector('#shinju-exp-label');
    const expPercent = ov.querySelector('#shinju-exp-percent');
    const fill = ov.querySelector('#shinju-progress-fill');
    const lore = ov.querySelector('#shinju-lore');

    if (img) {
      img.dataset.stage = String(s.stage);
      img.src = s.imageSrc;
      img.onerror = function () {
        this.onerror = null;
        this.src = 'images/shinju_05.webp?v=758';
      };
    }
    if (stage) stage.textContent = `${s.stageLabel}　${s.stage} / ${s.maxStage}`;
    if (expLabel) expLabel.textContent = s.isMax ? `創世EXP ${s.exp} / ${s.totalRequiredExp}` : `創世EXP ${s.exp} / ${s.nextStageExp}`;
    if (expPercent) expPercent.textContent = s.isMax ? 'MAX' : `${Math.round(s.progress)}%`;
    if (fill) fill.style.width = `${s.progress}%`;
    if (lore) {
      lore.textContent = s.isMax
        ? '神樹は成長臨界点に到達した。'
        : '創世資源を奉納すると、ゼラフィアの創世が進む。';
    }

    renderBlessingSlots(ov, s);
    renderAuraField(ov, s);
    updateOfferingMeta(ov, s);
  }

  function openShinjuScreen() {
    renderOverlay();
    const ov = ensureOverlay();
    ov.classList.add('active');
    if (typeof window.setNavVisible === 'function') window.setNavVisible(false);
  }

  function closeShinjuScreen() {
    closeBlessingPicker();
    const ov = document.getElementById('shinju-overlay');
    if (ov) ov.classList.remove('active');
    if (typeof window.setNavVisible === 'function') window.setNavVisible(true);
    renderHomeEntry();
  }

  function showOfferFeedback(result) {
    if (!result || !result.ok) return;
    renderOverlay();
    renderHomeEntry();

    if (result.reachedMax) {
      setTimeout(showGameClearOverlay, 260);
      return;
    }
    if (result.levelUp) {
      showTinyToast(`神樹が成長した：${result.after.stage} / 5`);
      return;
    }
    showTinyToast(result.totalExp ? `創世資源を奉納した　EXP +${result.totalExp}` : `${result.item.name}を奉納した`);
  }

  function showTinyToast(text) {
    const old = document.getElementById('shinju-toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'shinju-toast';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 20);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 280);
    }, 1500);
  }

  function showGameClearOverlay() {
    const old = document.getElementById('shinju-clear-overlay');
    if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'shinju-clear-overlay';
    ov.innerHTML = `
      <div class="shinju-clear-card">
        <div class="shinju-clear-kicker">GENESIS COMPLETE</div>
        <div class="shinju-clear-title">創世完了</div>
        <div class="shinju-clear-body">神樹は成長の果てに開花し、ゼラフィアは新世界の核へ到達した。</div>
        <button class="shinju-clear-btn" type="button">閉じる</button>
      </div>
    `;
    ov.querySelector('.shinju-clear-btn').addEventListener('click', function () {
      setGameClearSeen(true);
      ov.remove();
      renderOverlay();
      renderHomeEntry();
    });
    document.body.appendChild(ov);
  }

  function offerFromUI(itemId) {
    const result = offerItem(itemId);
    showOfferFeedback(result);
    return result;
  }

  async function offerAllFromUI() {
    const ov = ensureOverlay();
    const before = getViewState();
    if (!before.inventory.length) {
      showTinyToast('奉納できる創世資源がありません');
      return { ok: false, reason: 'empty', state: before };
    }
    if (ov.dataset.offering === '1') return { ok: false, reason: 'busy', state: before };

    ov.dataset.offering = '1';
    updateOfferingMeta(ov, before);

    await animateAuraOffering(ov);

    const result = offerAllItems();
    if (!result.ok) {
      delete ov.dataset.offering;
      renderOverlay();
      return result;
    }

    // EXPは吸い込み完了後に初めて反映し、ゲージの伸びを見せる。
    const stage = ov.querySelector('#shinju-stage');
    const expLabel = ov.querySelector('#shinju-exp-label');
    const expPercent = ov.querySelector('#shinju-exp-percent');
    const fill = ov.querySelector('#shinju-progress-fill');

    const applyAfterLabels = () => {
      if (stage) stage.textContent = `${result.after.stageLabel}　${result.after.stage} / ${result.after.maxStage}`;
      if (expLabel) expLabel.textContent = result.after.isMax
        ? `創世EXP ${result.after.exp} / ${result.after.totalRequiredExp}`
        : `創世EXP ${result.after.exp} / ${result.after.nextStageExp}`;
      if (expPercent) expPercent.textContent = result.after.isMax ? 'MAX' : `${Math.round(result.after.progress)}%`;
    };

    if (fill) {
      fill.style.width = `${result.before.progress}%`;
      void fill.offsetWidth;

      if (result.levelUp) {
        // 段階をまたぐ時は、まず現在ゲージを100%まで満たしてから
        // 新しい段階のゲージへ切り替える。減って見える演出を防ぐ。
        requestAnimationFrame(() => { fill.style.width = '100%'; });
        setTimeout(() => {
          applyAfterLabels();
          fill.style.transition = 'none';
          fill.style.width = '0%';
          void fill.offsetWidth;
          fill.style.transition = '';
          requestAnimationFrame(() => { fill.style.width = `${result.after.progress}%`; });
        }, 520);
      } else {
        applyAfterLabels();
        requestAnimationFrame(() => { fill.style.width = `${result.after.progress}%`; });
      }
    } else {
      applyAfterLabels();
    }

    ov.classList.add('shinju-gauge-receive');
    setTimeout(() => ov.classList.remove('shinju-gauge-receive'), result.levelUp ? 1250 : 760);

    setTimeout(() => {
      delete ov.dataset.offering;
      ov.classList.remove('is-offering');
      renderOverlay();
      showOfferFeedback(result);
    }, result.levelUp ? 1320 : 820);

    return result;
  }

  function resetForDebug() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CLOUD_STORAGE_KEY);
    renderHomeEntry();
    renderOverlay();
  }

  window.openShinjuScreen = openShinjuScreen;
  window.closeShinjuScreen = closeShinjuScreen;
  window.ShinjuProgress = {
    getState: () => getViewState(),
    getBlessingForCharacter,
    applyBlessingToProfile,
    setBlessingSlot,
    openBlessingPicker,
    closeBlessingPicker,
    grantBossItem,
    grantBossItemFromRoguelite,
    offerItem,
    offerAllItems,
    offerFromUI,
    offerAllFromUI,
    renderHomeEntry,
    open: openShinjuScreen,
    close: closeShinjuScreen,
    resetForDebug,
  };

  document.addEventListener('DOMContentLoaded', renderHomeEntry);
  window.addEventListener(EVENT_NAME, renderHomeEntry);
  window.addEventListener('zeraphia:shinju-cloud-loaded', function (event) {
    try {
      const incoming = normalizeState(event && event.detail || {});
      writeStateLocal(incoming);
      renderHomeEntry();
      const ov = document.getElementById('shinju-overlay');
      if (ov && ov.classList.contains('active')) renderOverlay();
    } catch (err) {
      console.warn('[ShinjuProgress] cloud apply failed:', err);
    }
  });
})();
