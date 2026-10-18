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
  // build896: Supabase is the authority. localStorage is display/offline cache only.
  let authoritativeState = null;
  let shinjuServerReady = false;
  let shinjuRefreshPromise = null;

  // stage 1 = shinju_01.webp（芽） / stage 5 = shinju_05.webp（大木）
  // build1605: 聖樹の息吹1個=1。Lv5(MAX)まで累計500個。1段ごとの必要数 50→90→140→220（サーバー _shinju_level_for と揃える）
  // build1610: 神樹EXP ＝ 3SLOTに注いだ創世ptの合計。Lv5(MAX)＝全SLOT Lv10（456pt）
  const STAGE_EXP = [0, 50, 140, 280, 456];
  const COMPLETE_EXP = 456;
  // SLOT育成（サーバー _shinju_slot_cost と揃える）。効果はLvごとに HP/ATK +2.5%、ULT還元 +2%
  const SLOT_MAX_LEVEL = 10;
  const SLOT_COSTS = Object.freeze([5, 6, 8, 10, 12, 15, 18, 22, 26, 30]);
  const SLOT_RATE_PER_LEVEL = Object.freeze({ hp: 0.025, atk: 0.025, ult: 0.02 });
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
  // build1608: 加護SLOTの差し替え・解除に必要な創世pt（サーバー set_shinju_blessing_secure と揃える）
  // build1610: 加護キャラの入れ替えは無料
  const SLOT_CHANGE_COST = 0;
  const RUN_REWARD_MASTER = {
    default: {
      bossId: 'enemy_01',
      bossName: '竜型レムナント',
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
    if (authoritativeState) return normalizeState(authoritativeState);
    try {
      const legacy = safeParse(localStorage.getItem(STORAGE_KEY));
      const cloud = safeParse(localStorage.getItem(CLOUD_STORAGE_KEY));
      const selected = stateTimestamp(cloud) > stateTimestamp(legacy) ? cloud : (legacy || cloud);
      return normalizeState(selected || createInitialState());
    } catch (err) {
      console.warn('[ShinjuProgress] cache load failed:', err);
      return createInitialState();
    }
  }

  function applyServerPayload(payload) {
    const raw = payload && payload.state && typeof payload.state === 'object'
      ? payload.state
      : payload;
    const state = normalizeState(raw || createInitialState());
    authoritativeState = state;
    shinjuServerReady = true;
    writeStateLocal(state);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: getViewState(state) }));
    return getViewState(state);
  }

  async function refreshFromServer() {
    if (shinjuRefreshPromise) return shinjuRefreshPromise;
    const sb = window.zsSupabase;
    if (!sb || typeof sb.rpc !== 'function') return getViewState(readState());

    shinjuRefreshPromise = (async () => {
      const res = await sb.rpc('get_shinju_state_secure');
      if (res && res.error) throw res.error;
      let data = res ? res.data : null;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (_) {}
      }
      if (!data || data.ok === false) throw new Error('神聖樹データを取得できませんでした');
      return applyServerPayload(data);
    })().catch(err => {
      console.warn('[ShinjuProgress] secure refresh failed:', err && (err.message || err));
      return getViewState(readState());
    }).finally(() => {
      shinjuRefreshPromise = null;
    });

    return shinjuRefreshPromise;
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

  function normalizeSlots(value) {
    const src = value && typeof value === 'object' ? value : {};
    const lv = v => Math.max(0, Math.min(SLOT_MAX_LEVEL, Math.floor(Number(v || 0))));
    return { hp: lv(src.hp), atk: lv(src.atk), ult: lv(src.ult) };
  }
  function slotRates(slots) {
    const s = normalizeSlots(slots);
    return { hp: s.hp * SLOT_RATE_PER_LEVEL.hp, atk: s.atk * SLOT_RATE_PER_LEVEL.atk, ult: s.ult * SLOT_RATE_PER_LEVEL.ult };
  }
  function slotNextCost(level) {
    const lv = Math.floor(Number(level || 0));
    return lv >= SLOT_MAX_LEVEL ? null : SLOT_COSTS[lv];
  }
  function fmtPct(rate) {
    const v = Math.round(Number(rate || 0) * 1000) / 10;
    return (Number.isInteger(v) ? String(v) : v.toFixed(1)) + '%';
  }
  function normalizeState(state) {
    const s = state && typeof state === 'object' ? state : createInitialState();
    return {
      exp: Math.max(0, Number(s.exp || 0)),
      pt: Math.max(0, Number(s.pt || 0)),
      slots: normalizeSlots(s.slots),
      inventory: Array.isArray(s.inventory) ? s.inventory.filter(Boolean) : [],
      offeredItems: Array.isArray(s.offeredItems) ? s.offeredItems.filter(Boolean) : [],
      gameClearSeen: !!s.gameClearSeen,
      blessings: normalizeBlessings(s.blessings || s.blessingSlots || s.slots),
      updatedAt: s.updatedAt || new Date().toISOString(),
    };
  }

  let cloudSaveTimer = 0;
  function queueCloudSave() {
    // build896: direct client upsert is intentionally disabled.
    // Authoritative mutations use dedicated SECURITY DEFINER RPCs.
  }

  function writeStateLocal(state) {
    const s = normalizeState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify(s));
    return s;
  }

  function saveState(state, options) {
    // Cache-only helper. Never treats local data as authoritative.
    const s = normalizeState(state);
    s.updatedAt = new Date().toISOString();
    writeStateLocal(s);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: getViewState(s) }));
    return s;
  }

  function getBlessingRates(stage) {
    const n = clamp(Math.floor(Number(stage || 1)), 1, MAX_STAGE);
    return Object.assign({}, BLESSING_RATE_BY_STAGE[n] || BLESSING_RATE_BY_STAGE[1]);
  }

  function getBlessingForCharacter(characterId, stateOverride) {
    const id = normalizeCharacterId(characterId);

    // Combat bonuses are disabled until a server-confirmed snapshot has loaded.
    // This prevents localStorage edits from becoming battle buffs.
    if (!shinjuServerReady || !authoritativeState) {
      return { characterId:id, stage:1, hpRate:0, atkRate:0, ultRefundRate:0 };
    }

    const view = getViewState(authoritativeState);
    const slots = view.blessings || {};
    const rates = view.blessingRates || slotRates(view.slots);
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
      // build1605: 奉納待ちの「栄養の個数」（1行に複数個入ることがある）
      pendingNutrition: (s.inventory || []).reduce((sum, item) => sum + Math.max(0, Number(item && item.exp || 0)), 0),
      blessingRates: slotRates(s.slots),
      imageSrc: `images/shinju_${String(stage).padStart(2, '0')}.webp?v=1609`,
    });
  }

  async function setGameClearSeen(value) {
    const sb = window.zsSupabase;
    if (!sb || typeof sb.rpc !== 'function') return false;
    try {
      const res = await sb.rpc('set_shinju_game_clear_seen_secure', { p_seen: !!value });
      if (res && res.error) throw res.error;
      let data = res ? res.data : null;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (_) {}
      }
      applyServerPayload(data);
      return true;
    } catch (err) {
      console.warn('[ShinjuProgress] clear-seen update failed:', err && (err.message || err));
      return false;
    }
  }

  function grantBossItem(opts) {
    // build896: reward creation is server-side.
    console.warn('[ShinjuProgress] client reward grant ignored; server-authoritative mode');
    void refreshFromServer();
    return { ok:false, reason:'server_authoritative' };
  }

  function grantBossItemFromRoguelite(payload) {
    // Reserved until the roguelite reward source is server-finalized.
    console.warn('[ShinjuProgress] roguelite client reward grant ignored in secure mode');
    void refreshFromServer();
    return { ok:false, reason:'server_authoritative' };
  }

  function offerItem(itemId) {
    return { ok:false, reason:'server_authoritative', state:getViewState(readState()) };
  }

  function offerAllItems() {
    return { ok:false, reason:'server_authoritative', state:getViewState(readState()) };
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
          <img class="shinju-visual" id="shinju-visual" src="images/shinju_01.webp?v=1609" alt="神樹">
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
              <span class="shinju-pt-chip" title="加護SLOTの変更に使う創世pt">創世pt <b id="shinju-pt-balance">0</b></span>
              <button type="button" class="shinju-help-btn" aria-label="加護の段階一覧" onclick="ShinjuProgress.openBlessingHelp()">?</button>
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
    const itemText = s.pendingNutrition > 0 ? `奉納待ち ${s.pendingNutrition}` : '奉納待ちなし';
    box.setAttribute('aria-label', `神樹へ移動。${label}。${itemText}`);
    box.title = `神樹へ / ${label} / ${itemText}`;
    const badge = box.querySelector('.shinju-home-entry-badge');
    if (badge) {
      const count = Math.max(0, Number(s.pendingNutrition || 0));
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

    if (count) count.textContent = totalExp > 0 ? `×${totalExp}` : 'なし';
    if (exp) exp.textContent = '';
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
    const pct = fmtPct(Math.max(0, Number(rate || 0)));
    if (slot === 'hp') return `HP +${pct}`;
    if (slot === 'atk') return `ATK +${pct}`;
    return `ULT還元 ${pct}`;
  }

  async function setBlessingSlot(slot, characterId) {
    if (!BLESSING_SLOTS.includes(slot)) return { ok:false, reason:'invalid_slot' };
    const id = normalizeCharacterId(characterId);
    const sb = window.zsSupabase;
    if (!sb || typeof sb.rpc !== 'function') return { ok:false, reason:'offline' };

    try {
      const res = await sb.rpc('set_shinju_blessing_secure', {
        p_slot: slot,
        p_character_id: id
      });
      if (res && res.error) throw res.error;
      let data = res ? res.data : null;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (_) {}
      }
      const view = applyServerPayload(data);
      renderOverlay();
      renderHomeEntry();

      const spent = Math.max(0, Number(data && data.pt_spent || 0));
      const spentText = spent > 0 ? `（創世pt -${spent}）` : '';
      if (id == null) showTinyToast(`${BLESSING_LABELS[slot]}を解除した${spentText}`);
      else {
        const info = getCharacterInfo(id);
        showTinyToast(`${BLESSING_LABELS[slot]}：${info ? info.name : id}${spentText}`);
      }
      return { ok:true, state:view };
    } catch (err) {
      const message = String(err && err.message || '');
      if (message.includes('another shinju slot')) showTinyToast('このキャラは別スロットに設定済みです');
      else if (message.includes('not owned')) showTinyToast('未所持キャラは設定できません');
      else if (message.includes('not enough shinju pt')) showTinyToast(`創世ptが足りません（変更に${SLOT_CHANGE_COST}pt必要）`);
      else showTinyToast('加護の設定に失敗しました');
      return { ok:false, reason:'server_rejected', error:err };
    }
  }

  function renderBlessingSlots(ov, state) {
    const box = ov.querySelector('#shinju-blessing-slots');
    if (!box) return;
    const rates = state.blessingRates || slotRates(state.slots);
    const slots = normalizeSlots(state.slots);
    const pt = Math.max(0, Number(state.pt || 0));
    box.innerHTML = BLESSING_SLOTS.map(slot => {
      const id = state.blessings && state.blessings[slot];
      const info = getCharacterInfo(id);
      const assigned = !!info;
      const lv = slots[slot];
      const cost = slotNextCost(lv);
      const isMax = cost == null;
      const canPay = !isMax && pt >= cost;
      // build1610: キャラ配置（円をタップ）と SLOT 強化（下のボタン）を分ける
      return `
        <div class="shinju-blessing-slot ${assigned ? 'is-assigned' : 'is-empty'}" data-blessing-slot="${slot}">
          <span class="shinju-blessing-slot-kind">${BLESSING_LABELS[slot].replace(' SLOT', '<span class="shinju-slot-word"> SLOT</span>')}<i class="shinju-slot-lv">Lv${lv}</i></span>
          <button type="button" class="shinju-blessing-character-panel" aria-label="${BLESSING_LABELS[slot]}のキャラを選ぶ" onclick="ShinjuProgress.openBlessingPicker('${slot}')">
            ${assigned && info.image ? `<img src="${escapeHtml(info.image)}" alt="">` : '<span class="shinju-blessing-plus">＋</span>'}
          </button>
          <span class="shinju-blessing-slot-effect">${blessingRateLabel(slot, rates[slot])}</span>
          <button type="button" class="shinju-slot-invest ${isMax ? 'is-max' : (canPay ? '' : 'is-short')}" data-invest-slot="${slot}" ${isMax ? 'disabled' : ''}
            onclick="ShinjuProgress.investSlotFromUI('${slot}', this)">${isMax ? 'MAX' : `強化 <b>${cost}</b>pt`}</button>
        </div>`;
    }).join('');
  }

  // build1611: SLOT 強化。確認ポップアップ（〇〇SLOTを LvX⇒LvY に強化します（Npt消費））で「強化する」を押して確定
  function confirmInvest(slot, lv, cost, pt) {
    return new Promise(resolve => {
      let box = document.getElementById('shinju-invest-confirm');
      if (!box) {
        box = document.createElement('div');
        box.id = 'shinju-invest-confirm';
        box.className = 'shinju-invest-confirm';
        document.body.appendChild(box);
      }
      const rate = SLOT_RATE_PER_LEVEL[slot];
      box.innerHTML = `
        <div class="shinju-invest-confirm-card" role="dialog" aria-modal="true" aria-label="SLOT強化の確認">
          <button type="button" class="shinju-modal-x" data-act="no" aria-label="閉じる">×</button>
          <small>SLOT ENHANCE</small>
          <p class="shinju-invest-confirm-main">${BLESSING_LABELS[slot]}を<br><b>Lv${lv}</b> ⇒ <b>Lv${lv + 1}</b> に強化します</p>
          <p class="shinju-invest-confirm-cost">（創世pt <b>${cost}</b> を消費）</p>
          <div class="shinju-invest-confirm-detail">
            <span>${blessingRateLabel(slot, lv * rate)}</span><i>⇒</i><span class="is-up">${blessingRateLabel(slot, (lv + 1) * rate)}</span>
          </div>
          <div class="shinju-invest-confirm-pt">所持 創世pt ${pt} ⇒ ${pt - cost}</div>
          <div class="shinju-invest-confirm-actions">
            <button type="button" class="is-cancel" data-act="no">やめる</button>
            <button type="button" class="is-ok" data-act="yes">強化する</button>
          </div>
        </div>`;
      const done = ok => { box.classList.remove('active'); box.onclick = null; resolve(ok); };
      box.onclick = e => {
        const act = e.target && e.target.closest && e.target.closest('[data-act]');
        if (act) done(act.dataset.act === 'yes');
        else if (e.target === box) done(false);
      };
      box.classList.add('active');
    });
  }
  async function investSlotFromUI(slot, btn) {
    if (!BLESSING_SLOTS.includes(slot) || !btn) return;
    const s = getViewState();
    const lv = normalizeSlots(s.slots)[slot];
    const cost = slotNextCost(lv);
    if (cost == null) return;
    const pt = Number(s.pt || 0);
    if (pt < cost) { showTinyToast(`創世ptが足りません（あと ${cost - pt}pt）`); return; }
    if (!(await confirmInvest(slot, lv, cost, pt))) return;
    btn.disabled = true;
    const sb = window.zsSupabase;
    try {
      if (!sb || typeof sb.rpc !== 'function') throw new Error('offline');
      const res = await sb.rpc('invest_shinju_slot_secure', { p_slot: slot, p_levels: 1 });
      if (res && res.error) throw res.error;
      let data = res ? res.data : null;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch (_) {} }
      applyServerPayload(data);
      renderOverlay();
      renderHomeEntry();
      const after = getViewState();
      if (Number(data && data.stage_after) > Number(data && data.stage_before)) {
        showTinyToast(`神樹が成長した：${after.stageLabel} ${after.stage} / 5`);
      } else {
        showTinyToast(`${BLESSING_LABELS[slot]} Lv${data && data.slot_level}（創世pt -${data && data.pt_spent}）`);
      }
    } catch (err) {
      const message = String(err && err.message || '');
      if (message.includes('not enough shinju pt')) showTinyToast('創世ptが足りません');
      else if (message.includes('already max')) showTinyToast('このSLOTは最大です');
      else showTinyToast('強化に失敗しました');
      renderOverlay();
    }
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
          <button type="button" class="shinju-blessing-picker-close shinju-modal-x" aria-label="閉じる" onclick="ShinjuProgress.closeBlessingPicker()">×</button>
        </div>
        <div class="shinju-blessing-picker-cost" id="shinju-blessing-picker-cost"></div>
        <div class="shinju-blessing-picker-grid" id="shinju-blessing-picker-grid"></div>
        <div class="shinju-blessing-picker-confirm" id="shinju-blessing-picker-confirm" hidden>
          <p id="shinju-blessing-picker-confirm-text"></p>
          <div>
            <button type="button" class="is-cancel" id="shinju-blessing-picker-confirm-no">やめる</button>
            <button type="button" class="is-ok" id="shinju-blessing-picker-confirm-yes">変更する</button>
          </div>
        </div>
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
    // build1608: キャラが入っているスロットの差し替え・解除は創世ptを消費
    const currentId = Number(state.blessings && state.blessings[slot]) || 0;
    const needsCost = SLOT_CHANGE_COST > 0 && currentId > 0;
    const canPay = !needsCost || Number(state.pt || 0) >= SLOT_CHANGE_COST;
    const costBox = picker.querySelector('#shinju-blessing-picker-cost');
    if (costBox) {
      costBox.className = 'shinju-blessing-picker-cost' + (needsCost && !canPay ? ' is-short' : '');
      costBox.innerHTML = needsCost
        ? `変更・解除には <b>創世pt ${SLOT_CHANGE_COST}</b> を消費します（所持 ${Number(state.pt || 0)}pt）`
        : 'キャラの入れ替えは無料です';
    }
    const confirmBox = picker.querySelector('#shinju-blessing-picker-confirm');
    if (confirmBox) confirmBox.hidden = true;
    const askCost = (text, run) => {
      if (!needsCost) { run(); return; }
      if (!canPay) { showTinyToast(`創世ptが足りません（変更に${SLOT_CHANGE_COST}pt必要）`); return; }
      if (!confirmBox) { run(); return; }
      confirmBox.querySelector('#shinju-blessing-picker-confirm-text').innerHTML = `${text}<br><small>創世pt ${SLOT_CHANGE_COST} を消費します（所持 ${Number(state.pt || 0)}pt → ${Number(state.pt || 0) - SLOT_CHANGE_COST}pt）</small>`;
      confirmBox.hidden = false;
      confirmBox.querySelector('#shinju-blessing-picker-confirm-no').onclick = () => { confirmBox.hidden = true; };
      confirmBox.querySelector('#shinju-blessing-picker-confirm-yes').onclick = () => { confirmBox.hidden = true; run(); };
    };

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
          if (id === currentId) { closeBlessingPicker(); return; }
          const name = (btn.querySelector('b') && btn.querySelector('b').textContent) || '';
          askCost(`${BLESSING_LABELS[slot]}を「${escapeHtml(name)}」に変更しますか？`, async () => {
            btn.disabled = true;
            const result = await setBlessingSlot(slot, id);
            if (result && result.ok) closeBlessingPicker();
            else btn.disabled = false;
          });
        });
      });
    }
    if (clear) {
      clear.disabled = !(state.blessings && state.blessings[slot]);
      clear.onclick = () => {
        askCost(`${BLESSING_LABELS[slot]}を解除しますか？`, async () => {
          clear.disabled = true;
          const result = await setBlessingSlot(slot, null);
          if (result && result.ok) closeBlessingPicker();
          else clear.disabled = false;
        });
      };
    }
    picker.classList.add('active');
  }

  // build1608: 加護の段階一覧（？ボタン）。次の段階を目指したくなるよう、全段階の恩恵と必要ptを並べる。
  function openBlessingHelp() {
    let help = document.getElementById('shinju-blessing-help');
    if (!help) {
      help = document.createElement('div');
      help.id = 'shinju-blessing-help';
      help.className = 'shinju-blessing-help';
      help.addEventListener('click', e => { if (e.target === help) closeBlessingHelp(); });
      document.body.appendChild(help);
    }
    const s = getViewState();
    const slots = normalizeSlots(s.slots);
    const slotRows = SLOT_COSTS.map((cost, i) => {
      const lv = i + 1;
      const mark = k => slots[k] >= lv ? ' is-done' : (slots[k] + 1 === lv ? ' is-next' : '');
      return `<tr><th>Lv${lv}</th><td>${cost}pt</td>
        <td class="${mark('hp')}">+${fmtPct(lv * SLOT_RATE_PER_LEVEL.hp)}</td>
        <td class="${mark('atk')}">+${fmtPct(lv * SLOT_RATE_PER_LEVEL.atk)}</td>
        <td class="${mark('ult')}">${fmtPct(lv * SLOT_RATE_PER_LEVEL.ult)}</td></tr>`;
    }).join('');
    const treeRows = STAGE_LABELS.map((label, i) => {
      const stage = i + 1;
      const need = STAGE_EXP[i] || 0;
      const st = stage < s.stage ? 'is-done' : (stage === s.stage ? 'is-current' : (stage === s.stage + 1 ? 'is-next' : 'is-locked'));
      const tag = st === 'is-current' ? '<em>現在</em>' : (st === 'is-next' ? `<em>あと ${Math.max(0, need - s.exp)}pt</em>` : (st === 'is-done' ? '<em>到達済</em>' : ''));
      return `<li class="${st}"><div class="shinju-help-stage"><b>Lv${stage}</b><span>${escapeHtml(label)}</span>${tag}</div>
        <div class="shinju-help-need">${stage === 1 ? 'はじまり' : `神樹EXP ${need}`}</div></li>`;
    }).join('');
    help.innerHTML = `
      <div class="shinju-blessing-help-card" role="dialog" aria-modal="true" aria-label="神聖樹の加護">
        <button type="button" class="shinju-modal-x" aria-label="閉じる" onclick="ShinjuProgress.closeBlessingHelp()">×</button>
        <div class="shinju-blessing-help-head">
          <small>BLESSING OF THE SACRED TREE</small>
          <strong>神聖樹の加護</strong>
        </div>
        <p class="shinju-blessing-help-lead">創世ptをSLOTに注ぐと加護が強まり、注いだ分だけ神樹が育ちます。</p>
        <h3 class="shinju-help-sub">SLOT強化</h3>
        <div class="shinju-help-table-wrap"><table class="shinju-help-table">
          <thead><tr><th></th><th>必要</th><th>HP<small>Lv${slots.hp}</small></th><th>ATK<small>Lv${slots.atk}</small></th><th>ULT還元<small>Lv${slots.ult}</small></th></tr></thead>
          <tbody>${slotRows}</tbody>
        </table></div>
        <h3 class="shinju-help-sub">神樹の成長</h3>
        <ol class="shinju-blessing-help-list">${treeRows}</ol>
        <ul class="shinju-blessing-help-notes">
          <li>聖樹の息吹を奉納すると創世ptになります</li>
          <li>HP / ATK：SLOTのキャラの最終ステータスに加算</li>
          <li>ULT還元：ULT発動直後、必要ゲージの一部が戻る</li>
          <li>SLOTに置くキャラの入れ替えは無料です</li>
        </ul>
      </div>`;
    help.classList.add('active');
  }
  function closeBlessingHelp() {
    const help = document.getElementById('shinju-blessing-help');
    if (help) help.classList.remove('active');
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
        this.src = 'images/shinju_05.webp?v=1609';
      };
    }
    if (stage) stage.innerHTML = `${escapeHtml(s.stageLabel)}<i class="shinju-stage-sep" aria-hidden="true">◆</i>${s.stage} / ${s.maxStage}`;
    if (expLabel) expLabel.textContent = s.isMax ? `神樹EXP ${s.exp} / ${s.totalRequiredExp}` : `神樹EXP ${s.exp} / ${s.nextStageExp}`;
    const ptEl = ov.querySelector('#shinju-pt-balance');
    if (ptEl) ptEl.textContent = String(s.pt || 0);
    if (expPercent) expPercent.textContent = s.isMax ? 'MAX' : `${Math.round(s.progress)}%`;
    if (fill) fill.style.width = `${s.progress}%`;
    if (lore) {
      lore.textContent = s.isMax
        ? '神樹は成長臨界点に到達した。'
        : '創世ptをSLOTに注ぐと、神樹が育つ。';
    }

    renderBlessingSlots(ov, s);
    renderAuraField(ov, s);
    updateOfferingMeta(ov, s);
  }

  function openShinjuScreen() {
    if (typeof window.requireChapter03ContentUnlock === 'function' && !window.requireChapter03ContentUnlock()) return false;
    renderOverlay();
    const ov = ensureOverlay();
    ov.classList.add('active');
    if (typeof window.setNavVisible === 'function') window.setNavVisible(false);

    // Show cached UI immediately, then replace it with the authoritative server snapshot.
    void refreshFromServer().then(() => {
      if (ov.classList.contains('active')) renderOverlay();
      renderHomeEntry();
    });
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
    showTinyToast(result.totalExp ? `聖樹の息吹を奉納した　創世pt +${result.totalExp}` : `${result.item.name}を奉納した`);
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
    const before = await refreshFromServer();
    if (!before.inventory.length) {
      showTinyToast('奉納できる創世資源がありません');
      renderOverlay();
      return { ok:false, reason:'empty', state:before };
    }
    if (ov.dataset.offering === '1') return { ok:false, reason:'busy', state:before };

    ov.dataset.offering = '1';
    updateOfferingMeta(ov, before);
    await animateAuraOffering(ov);

    try {
      const sb = window.zsSupabase;
      if (!sb || typeof sb.rpc !== 'function') throw new Error('Supabase unavailable');

      const res = await sb.rpc('offer_all_shinju_secure');
      if (res && res.error) throw res.error;
      let data = res ? res.data : null;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (_) {}
      }
      const after = applyServerPayload(data);
      const offeredCount = Math.max(0, Number(data && data.offered_count_now || 0));
      const totalExp = Math.max(0, Number(data && data.offered_exp || 0));

      if (!offeredCount) {
        delete ov.dataset.offering;
        ov.classList.remove('is-offering');
        renderOverlay();
        showTinyToast('奉納できる創世資源がありません');
        return { ok:false, reason:'empty', state:after };
      }

      const result = {
        ok:true,
        items:before.inventory.slice(),
        totalExp,
        before,
        after,
        levelUp:after.stage > before.stage,
        reachedMax:after.isMax && !before.isMax
      };

      const stage = ov.querySelector('#shinju-stage');
      const expLabel = ov.querySelector('#shinju-exp-label');
      const expPercent = ov.querySelector('#shinju-exp-percent');
      const fill = ov.querySelector('#shinju-progress-fill');

      const applyAfterLabels = () => {
        if (stage) stage.innerHTML = `${escapeHtml(after.stageLabel)}<i class="shinju-stage-sep" aria-hidden="true">◆</i>${after.stage} / ${after.maxStage}`;
        if (expLabel) expLabel.textContent = after.isMax
          ? `神樹EXP ${after.exp} / ${after.totalRequiredExp}`
          : `神樹EXP ${after.exp} / ${after.nextStageExp}`;
        if (expPercent) expPercent.textContent = after.isMax ? 'MAX' : `${Math.round(after.progress)}%`;
      };

      if (fill) {
        fill.style.width = `${before.progress}%`;
        void fill.offsetWidth;
        if (result.levelUp) {
          requestAnimationFrame(() => { fill.style.width = '100%'; });
          setTimeout(() => {
            applyAfterLabels();
            fill.style.transition = 'none';
            fill.style.width = '0%';
            void fill.offsetWidth;
            fill.style.transition = '';
            requestAnimationFrame(() => { fill.style.width = `${after.progress}%`; });
          }, 520);
        } else {
          applyAfterLabels();
          requestAnimationFrame(() => { fill.style.width = `${after.progress}%`; });
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
    } catch (err) {
      delete ov.dataset.offering;
      ov.classList.remove('is-offering');
      renderOverlay();
      showTinyToast('奉納処理に失敗しました');
      console.warn('[ShinjuProgress] secure offer failed:', err && (err.message || err));
      return { ok:false, reason:'server_error', state:getViewState(readState()) };
    }
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
    refreshFromServer,
    getBlessingForCharacter,
    applyBlessingToProfile,
    setBlessingSlot,
    openBlessingPicker,
    closeBlessingPicker,
    openBlessingHelp,
    investSlotFromUI,
    closeBlessingHelp,
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

  document.addEventListener('DOMContentLoaded', function () {
    renderHomeEntry();
    void refreshFromServer();
  });
  window.addEventListener(EVENT_NAME, renderHomeEntry);
  window.addEventListener('pageshow', function () { void refreshFromServer(); });
  window.addEventListener('zeraphia:shinju-cloud-loaded', function (event) {
    try {
      authoritativeState = normalizeState(event && event.detail || {});
      shinjuServerReady = true;
      writeStateLocal(authoritativeState);
      renderHomeEntry();
      const ov = document.getElementById('shinju-overlay');
      if (ov && ov.classList.contains('active')) renderOverlay();
    } catch (err) {
      console.warn('[ShinjuProgress] cloud apply failed:', err);
    }
  });
})();
