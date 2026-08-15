// shinju.js
// ZERAPHIA: 神樹 / アルケミア創世進捗
// 依存: なし
// 使い方:
//   openShinjuScreen()                         : 神樹画面を開く
//   ShinjuProgress.grantBossItemFromRoguelite(): ボス撃破アイテムを付与
//   ShinjuProgress.getState()                  : 現在状態を取得

(function () {
  'use strict';

  const STORAGE_KEY = 'zeraphia_shinju_progress_v1';
  const EVENT_NAME = 'shinju-progress-updated';
  const MAX_STAGE = 5;

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

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createInitialState();
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
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
      updatedAt: new Date().toISOString(),
    };
  }

  function normalizeState(state) {
    const s = state && typeof state === 'object' ? state : createInitialState();
    return {
      exp: Math.max(0, Number(s.exp || 0)),
      inventory: Array.isArray(s.inventory) ? s.inventory.filter(Boolean) : [],
      offeredItems: Array.isArray(s.offeredItems) ? s.offeredItems.filter(Boolean) : [],
      gameClearSeen: !!s.gameClearSeen,
      updatedAt: s.updatedAt || new Date().toISOString(),
    };
  }

  function saveState(state) {
    const s = normalizeState(state);
    s.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: getViewState(s) }));
    return s;
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
      imageSrc: `images/shinju_${String(stage).padStart(2, '0')}.webp`,
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
      <div class="shinju-panel" role="dialog" aria-modal="true" aria-label="アルケミア創世進捗">
        <button class="shinju-close" type="button" onclick="closeShinjuScreen()">＜戻る</button>
        <div class="shinju-visual-wrap">
          <img class="shinju-visual" id="shinju-visual" src="images/shinju_01.webp" alt="神樹">
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

    // ホーム入口は右側の神樹アイコンのみ表示する。
    // innerHTMLを固定形に戻すことで、旧カード型HTMLが残っていても自動で置き換わる。
    box.innerHTML = `
      <img class="shinju-home-entry-icon" src="images/shinju.webp" alt="神樹">
      <span class="shinju-home-entry-badge" id="shinju-home-entry-badge" aria-hidden="true"></span>
    `;

    const label = s.isMax ? '創世完了' : `成長度 ${s.stage}/5`;
    const itemText = s.pendingItemCount > 0 ? `奉納待ち ${s.pendingItemCount}` : '奉納待ちなし';
    box.setAttribute('aria-label', `神樹へ移動。${label}。${itemText}`);
    box.title = `神樹へ / ${label} / ${itemText}`;
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
      img.src = s.imageSrc;
      img.onerror = function () {
        this.onerror = null;
        this.src = 'images/shinju_05.webp';
      };
    }
    if (stage) stage.textContent = `${s.stageLabel}　${s.stage} / ${s.maxStage}`;
    if (expLabel) expLabel.textContent = s.isMax ? `創世EXP ${s.exp} / ${s.totalRequiredExp}` : `創世EXP ${s.exp} / ${s.nextStageExp}`;
    if (expPercent) expPercent.textContent = s.isMax ? 'MAX' : `${Math.round(s.progress)}%`;
    if (fill) fill.style.width = `${s.progress}%`;
    if (lore) {
      lore.textContent = s.isMax
        ? '神樹は成長臨界点に到達した。'
        : '創世資源を奉納すると、アルケミアの創世が進む。';
    }

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
        <div class="shinju-clear-body">神樹は成長の果てに開花し、アルケミアは新世界の核へ到達した。</div>
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
    renderHomeEntry();
    renderOverlay();
  }

  window.openShinjuScreen = openShinjuScreen;
  window.closeShinjuScreen = closeShinjuScreen;
  window.ShinjuProgress = {
    getState: () => getViewState(),
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
})();
