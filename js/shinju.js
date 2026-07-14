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
    const ids = state.inventory.map(item => item.id);
    let last = null;
    ids.forEach(id => { last = offerItem(id); });
    return last || { ok: false, reason: 'empty', state: getViewState(readState()) };
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
        <button class="shinju-close" type="button" onclick="closeShinjuScreen()">×</button>
        <div class="shinju-visual-wrap">
          <img class="shinju-visual" id="shinju-visual" src="images/shinju_01.webp" alt="神樹">
          <div class="shinju-visual-glow"></div>
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
          <div class="shinju-items-head">
            <span>奉納可能な創世資源</span>
            <button class="shinju-offer-all" type="button" onclick="ShinjuProgress.offerAllFromUI()">すべて奉納</button>
          </div>
          <div class="shinju-item-list" id="shinju-item-list"></div>
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

  function renderOverlay() {
    const ov = ensureOverlay();
    const s = getViewState();
    const img = ov.querySelector('#shinju-visual');
    const stage = ov.querySelector('#shinju-stage');
    const expLabel = ov.querySelector('#shinju-exp-label');
    const expPercent = ov.querySelector('#shinju-exp-percent');
    const fill = ov.querySelector('#shinju-progress-fill');
    const lore = ov.querySelector('#shinju-lore');
    const list = ov.querySelector('#shinju-item-list');

    if (img) {
      img.src = s.imageSrc;
      img.onerror = function () {
        // 01〜04の画像が未配置の場合は、添付済みのMAX画像を暫定表示する。
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

    if (list) {
      if (!s.inventory.length) {
        list.innerHTML = '<div class="shinju-item-empty">奉納できる創世資源はありません。</div>';
      } else {
        list.innerHTML = s.inventory.map(item => `
          <div class="shinju-item-card">
            <div class="shinju-item-icon">✦</div>
            <div class="shinju-item-body">
              <div class="shinju-item-name">${escapeHtml(item.name)}</div>
              <div class="shinju-item-desc">${escapeHtml(item.desc || item.bossName || '')}</div>
              <div class="shinju-item-exp">神樹EXP +${Number(item.exp || 0)}</div>
            </div>
            <button class="shinju-offer-btn" type="button" onclick="ShinjuProgress.offerFromUI('${escapeHtml(item.id)}')">奉納</button>
          </div>
        `).join('');
      }
    }
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
    showTinyToast(`${result.item.name}を奉納した`);
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

  function offerAllFromUI() {
    const result = offerAllItems();
    if (!result.ok) {
      showTinyToast('奉納できる創世資源がありません');
      return result;
    }
    showOfferFeedback(result);
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
