// battle_swipe.js  v2
// スワイプ結線バトルシステム — プロトタイプ
//
// 読み込み順：battle_range.js → battle.js → battle_swipe.js
//
// battle.js 側の対応（v2 で追加済み）:
//   startBattle() 内  → window.bs = bs; / window.renderBattleField = renderField;
//                       bs.swipeComboMultiplier = 1.0;
//   selectSkill()末尾 → SwipeBattle.start(chara, sk) を呼び出し
//   doPlayerAction()  → dmg に bs.swipeComboMultiplier を乗算、発動後リセット

(function () {
  'use strict';

  // ============================================================
  // 定数
  // ============================================================
  const SWIPE_THRESHOLD = 30;   // px — この距離を超えたら1スワイプ判定

  // 味方スワイプ方向 → 敵の移動方向（逆方向）
  const ENEMY_DIR = { up: 'front', down: 'back', left: 'right', right: 'left' };

  // 味方スワイプ方向 → 味方の移動方向
  const ACTOR_DIR = { up: 'front', down: 'back', left: 'left', right: 'right' };

  // 旧仕様：スワイプ回数ごとの共通倍率テーブル
　// 現在は廃止。倍率はスキルごとの moveBonus で判定する。
  // const MULTIPLIER_TABLE = [1.0, 1.0, 1.0, 1.0, 1.0];

  // ============================================================
  // スワイプ状態（モジュール内シングルトン）
  // ============================================================
  const sw = {
    active:     false,
    actor:      null,   // 操作中キャラ（bs.party 内の参照）
    skill:      null,   // 選択中スキル
    moveCount:  0,
    multiplier: 1.0,
    hitTargets: [],     // 現在レンジ内の敵
    startX:     0,
    startY:     0,
    pointerId:  null,
    startCell:  null,   // スキル選択開始時のキャラ位置 { row, col }
    path: [], // [{ row, col, step }]
  };

  // ドラッグ中フラグ（pointerdown〜pointerup の間だけ true）
  let dragging = false;

  // 発動処理中フラグ（二重発動防止）
  let applying = false;
  // ============================================================
  // ヘルパー
  // ============================================================
  function getBs() { return window.bs; }

  // ============================================================
  // 新move計算ヘルパー
  // ============================================================

  // 実効moveCount：元位置に戻った場合は0、それ以外はsw.moveCount
  function getEffectiveMoveCount() {
  if (!sw.actor || !sw.startCell) return 0;

  // 元のマスに戻ったら完全に0扱い
  if (sw.actor.row === sw.startCell.row && sw.actor.col === sw.startCell.col) {
    return 0;
  }

  return sw.path.length;
}

  // moveTrigger判定
  // 優先度: skill.moveTrigger > actor.moveTrigger > skill.allowedMoves > actor.allowedMoves
  //         > skill.moveBonus.idealMoves（既存データ互換）> 制限なし
  function isMoveTriggerMatched(actor, skill, moveCount) {
    if (moveCount <= 0) return false;

    const trigger = (skill && skill.moveTrigger)
      || (actor && actor.moveTrigger)
      || (skill && skill.allowedMoves)
      || (actor && actor.allowedMoves);

    if (trigger) {
      if (Array.isArray(trigger)) {
        return trigger.includes(moveCount);
      }

      if (Array.isArray(trigger.moves)) {
        if (trigger.type === 'exact' || !trigger.type) {
          return trigger.moves.includes(moveCount);
        }
      }

      if (trigger.type === 'even') return moveCount % 2 === 0;
      if (trigger.type === 'odd')  return moveCount % 2 === 1;
      if (trigger.type === 'min') {
        return moveCount >= (trigger.moves?.[0] ?? trigger.min ?? 1);
      }

      return true;
    }

    // 既存データ互換：moveTrigger がない場合は moveBonus.idealMoves を
    // 発動可能歩数として扱う（5歩以上ボーナスとは別の概念）
    if (
      skill &&
      skill.moveBonus &&
      Array.isArray(skill.moveBonus.idealMoves)
    ) {
      return skill.moveBonus.idealMoves.includes(moveCount);
    }

    // moveTrigger も idealMoves もないスキルは歩数制限なし（1歩以上で発動）
    return true;
  }

  // MOVE BONUS倍率（新仕様：5歩以上でボーナス、idealMoves互換あり）
  function getMoveBonusMultiplier(skill, moveCount) {
    const mb = (skill && skill.moveBonus) || {};

    // 旧仕様互換：idealMoves が一致したら発動
    if (Array.isArray(mb.idealMoves)) {
      if (mb.idealMoves.includes(moveCount)) return mb.damageRate || 1.0;
      // idealMovesが指定されていれば新仕様minMovesは見ない
      return 1.0;
    }

    // 新仕様：minMoves（デフォルト5）以上でボーナス
    const minMoves = mb.minMoves != null ? mb.minMoves : 5;
    if (moveCount >= minMoves) return mb.damageRate || 1.2;

    return 1.0;
  }

  function isMoveBonusActive(skill, moveCount) {
    return getMoveBonusMultiplier(skill, moveCount) > 1.0;
  }

  function getMoveBonusLabel(skill, moveCount) {
    const mb = (skill && skill.moveBonus) || {};
    const active = isMoveBonusActive(skill, moveCount);

    if (!active) return 'MBなし';

    const parts = [];
    if (mb.damageRate != null && mb.damageRate !== 1.0) parts.push('DMG ×' + mb.damageRate);
    if (mb.hitAdd    != null && mb.hitAdd    !== 0)    parts.push('HIT +' + mb.hitAdd + '%');
    if (mb.healRate  != null && mb.healRate  !== 1.0)  parts.push('HEAL ×' + mb.healRate);
    if (mb.addEffect)                                   parts.push('追加効果');
    if (!parts.length) return 'MB発動';
    return 'MB ' + parts.join(' / ');
  }

  // moveTrigger の期待歩数を文字列化（HUD表示用）
  function getMoveTriggerLabel(actor, skill) {
    const trigger = (skill && skill.moveTrigger)
      || (actor && actor.moveTrigger)
      || (skill && skill.allowedMoves)
      || (actor && actor.allowedMoves);
    if (trigger) {
      if (Array.isArray(trigger)) return trigger.join('/') + '歩';
      if (Array.isArray(trigger.moves) && (trigger.type === 'exact' || !trigger.type))
        return trigger.moves.join('/') + '歩';
      if (trigger.type === 'even') return '偶数歩';
      if (trigger.type === 'odd')  return '奇数歩';
      if (trigger.type === 'min')  return (trigger.moves?.[0] ?? trigger.min ?? 1) + '歩以上';
      return null;
    }
    // idealMoves フォールバック
    if (skill && skill.moveBonus && Array.isArray(skill.moveBonus.idealMoves)) {
      return skill.moveBonus.idealMoves.join('/') + '歩';
    }
    return null;
  }
  // ============================================================
  // 味方→敵グリッド射影
  // battle.js の getEnemyCellsFromAllyRange と同等の処理を再実装
  // ============================================================
  function getEnemyCellsForAlly(chara, range) {
    if (!window.BattleRange) return new Set();
    const normalized = BattleRange.normalizeRange(range);
    if (!normalized) return new Set();

    // field系・全体はそのまま適用
    if (normalized.origin === 'field' || normalized.type === 'all') {
      return BattleRange.getCellsFromRange(chara, range);
    }

    // 6段フィールド：敵far(0)〜敵near(2)〜味方near(3)〜味方far(5)
    const FIELD_ROWS = [
      { side: 'enemy', row: 'far'  },
      { side: 'enemy', row: 'mid'  },
      { side: 'enemy', row: 'near' },
      { side: 'ally',  row: 'near' },
      { side: 'ally',  row: 'mid'  },
      { side: 'ally',  row: 'far'  },
    ];
    const ALLY_ROW_IDX = { near: 3, mid: 4, far: 5 };
    const COL_IDX      = { left: 0, center: 1, right: 2 };
    const COL_BY_IDX   = ['left', 'center', 'right'];

    const s = new Set();
    const baseRi = ALLY_ROW_IDX[chara.row];
    const baseCi = COL_IDX[chara.col];
    if (baseRi == null || baseCi == null) return s;

    (normalized.cells || []).forEach(cell => {
      const ri  = baseRi + cell.dr;
      const ci  = baseCi + cell.dc;
      const pos = FIELD_ROWS[ri];
      const col = COL_BY_IDX[ci];
      if (pos && col && pos.side === 'enemy') s.add(pos.row + '-' + col);
    });
    return s;
  }

  // 現在のアクター/スキルでレンジ内の敵を取得
  function getHitTargets() {
    const bs = getBs();
    if (!bs || !sw.actor || !sw.skill) return [];
    const cells = getEnemyCellsForAlly(sw.actor, sw.skill.range);
    const enemies = bs.enemies || (bs.enemy ? [bs.enemy] : []);
    return enemies.filter(e => e && e.hp > 0 && cells.has(e.row + '-' + e.col));
  }

  // ============================================================
  // 移動処理
  // ============================================================
  function moveActorBySwipe(direction) {
    const bs = getBs();
    if (!bs || !sw.actor) return false;
    return BattleRange.tryMoveUnitStepwise(sw.actor, direction, 1, bs.party).moved;
  }

  function moveEnemiesBySwipe(direction) {
    const bs = getBs();
    if (!bs) return false;
    const ROW_IDX    = { near: 0, mid: 1, far: 2 };
    const COL_IDX    = { left: 0, center: 1, right: 2 };
    const ROW_BY_IDX = ['near', 'mid', 'far'];
    const COL_BY_IDX = ['left', 'center', 'right'];

    const enemies = (bs.enemies || []).filter(e => e && e.hp > 0);
    if (!enemies.length) return false;

    function nextPos(e) {
      const ri = ROW_IDX[e.row], ci = COL_IDX[e.col];
      if (direction === 'front') { const r = ROW_BY_IDX[ri - 1]; return r ? { row: r, col: e.col } : null; }
      if (direction === 'back')  { const r = ROW_BY_IDX[ri + 1]; return r ? { row: r, col: e.col } : null; }
      if (direction === 'left')  { const c = COL_BY_IDX[ci - 1]; return c ? { row: e.row, col: c } : null; }
      if (direction === 'right') { const c = COL_BY_IDX[ci + 1]; return c ? { row: e.row, col: c } : null; }
      return null;
    }

    const plans = enemies.map(e => ({ e, to: nextPos(e) }));

    // 盤外 or 重なりが発生する場合は全体キャンセル
    const toKeys = plans.filter(p => p.to).map(p => p.to.row + '-' + p.to.col);
    if (toKeys.length !== new Set(toKeys).size) return false;

    let moved = false;
    for (const { e, to } of plans) {
      if (!to) continue;
      e.row = to.row; e.col = to.col;
      moved = true;
    }
    return moved;
  }

  // ============================================================
  // スワイプ方向検出
  // ============================================================
  function detectDirection(dx, dy) {
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy < 0 ? 'up' : 'down';  // 上スワイプ = 手前(near)方向
  }

  // ============================================================
  // 1スワイプ処理
  // ============================================================
  function trySwipeMove(swipeDir) {
  if (!sw.active) return;

  const actorMoved = moveActorBySwipe(ACTOR_DIR[swipeDir]);

  // 自キャラが動けなかった場合は歩数も敵移動も進めない
  if (!actorMoved) {
    addLog('— 移動できない');
    return;
  }

  // 自キャラが動けた場合だけ敵も動かす
  // moveEnemiesBySwipe(ENEMY_DIR[swipeDir]);

  // 元の位置に戻ったら完全リセット
  if (
    sw.startCell &&
    sw.actor.row === sw.startCell.row &&
    sw.actor.col === sw.startCell.col
  ) {
    sw.moveCount = 0;
    sw.path = [];
} else {
  const currentKey = sw.actor.row + '-' + sw.actor.col;

  // すでに通ったマスへ戻った場合は、そこまで履歴を巻き戻す
  const existingIndex = sw.path.findIndex(p =>
    p.row === sw.actor.row && p.col === sw.actor.col
  );

  if (existingIndex >= 0) {
    // 例: 1→2→3 から 2 に戻ったら、3を消す
    // 例: 1→2 から 1 に戻ったら、2を消す
    sw.path = sw.path.slice(0, existingIndex + 1);

    // step番号を振り直す
    sw.path = sw.path.map((p, i) => ({
      row: p.row,
      col: p.col,
      step: i + 1,
    }));
  } else {
    // 新しいマスに進んだ場合だけ追加
    sw.path.push({
      row: sw.actor.row,
      col: sw.actor.col,
      step: sw.path.length + 1,
    });
  }

  sw.moveCount = sw.path.length;
}

  const effectiveMoveCount = getEffectiveMoveCount();
  sw.multiplier = getMoveBonusMultiplier(sw.skill, effectiveMoveCount);

  const bs = getBs();
  if (bs) bs.swipeComboMultiplier = sw.multiplier;

  if (typeof window.renderBattleField === 'function') {
    window.renderBattleField();
  }

  // renderBattleField() の後に、現在位置ベースの攻撃予定マスを再適用する
  refreshPreview();

  highlightActorCell();
  renderMoveStepNumbers();
  }

  // ============================================================
  // レンジプレビュー更新
  // ============================================================
  function refreshPreview() {
    clearPreview();
    if (!sw.active || !sw.actor || !sw.skill) return;

    sw.hitTargets = getHitTargets();
    const cells   = getEnemyCellsForAlly(sw.actor, sw.skill.range);

    cells.forEach(key => {
      const el = document.getElementById('bt-eg-' + key);
      if (el) el.classList.add('skill-range');
    });
    sw.hitTargets.forEach(e => {
      const el = document.getElementById('bt-eg-' + e.row + '-' + e.col);
      if (el) el.classList.add('skill-range');
    });
  }

  function clearPreview() {
    document
      .querySelectorAll(
        '.bt-grid-enemy .hit-preview, ' +
        '.bt-grid-enemy .connected-hit, ' +
        '.bt-grid-enemy .skill-range'
      )
      .forEach(el => {
        el.classList.remove('hit-preview', 'connected-hit', 'skill-range');
      });
  }

  function highlightActorCell() {
    document.querySelectorAll('.swipe-actor').forEach(el => el.classList.remove('swipe-actor'));
    if (!sw.active || !sw.actor) return;
    const el = document.getElementById('bt-ag-' + sw.actor.row + '-' + sw.actor.col);
    if (el) el.classList.add('swipe-actor');
    console.log('[SwipeBattle] highlightActorCell:', sw.actor.name, sw.actor.row, sw.actor.col, '/ el:', !!el);
    bindActorDragStart();
  }

  function clearMoveStepNumbers() {
  document.querySelectorAll('.bt-move-step-num').forEach(el => el.remove());
}

function renderMoveStepNumbers() {
  clearMoveStepNumbers();

  if (!sw.active || !sw.actor || !sw.startCell) return;

  const effectiveMoveCount = getEffectiveMoveCount();
  const canActivate =
    effectiveMoveCount > 0 &&
    isMoveTriggerMatched(sw.actor, sw.skill, effectiveMoveCount);

  sw.path.forEach(p => {
    const cell = document.getElementById('bt-ag-' + p.row + '-' + p.col);
    if (!cell) return;

    const rect = cell.getBoundingClientRect();

    const badge = document.createElement('div');
    badge.className = 'bt-move-step-num ' + (canActivate ? 'is-ok' : 'is-ng');
    badge.textContent = String(p.step);

    badge.style.fontSize = '72px';
    badge.style.fontWeight = '900';
    badge.style.lineHeight = '1';

    badge.style.left = (rect.left + rect.width / 2) + 'px';
    badge.style.top  = (rect.top  + rect.height / 2) + 'px';

    document.body.appendChild(badge);
  });
}

function playMoveCountBurst(moveCount, isOk) {
  return new Promise(resolve => {
    const old = document.getElementById('bt-move-burst');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'bt-move-burst';
    el.className = 'bt-move-burst ' + (isOk ? 'is-ok' : 'is-ng');
    el.textContent = String(moveCount);

    document.body.appendChild(el);

    el.addEventListener('animationend', () => {
      el.remove();
      resolve();
    }, { once: true });
  });
}

  // ============================================================
  // HUD
  // ============================================================
  function renderHUD() {
  // HUDポップアップは使わない。
  // 盤面上の歩数表示だけ更新する。
  renderMoveStepNumbers();
}
function renderSwipePassButton() {
  removeSwipePassButton();

  if (!sw.active) return;

  const btn = document.createElement('button');
  btn.id = 'bt-swipe-pass-btn';
  btn.textContent = 'PASS';

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!sw.active || applying) return;

    applying = true;

    try {
      addLog('— パスしました');

      clearMoveStepNumbers();
      clearPreview();

      endSwipeAimMode();

      if (typeof window.executePassAction === 'function') {
        window.executePassAction();
      }
    } finally {
      applying = false;
    }
  });

  const root = document.getElementById('battle-root');
if (root) {
  root.appendChild(btn);
} else {
  document.body.appendChild(btn);
}
}

function removeSwipePassButton() {
  const el = document.getElementById('bt-swipe-pass-btn');
  if (el) el.remove();
}
  function removeHUD() {
    ['swipe-hud', 'swipe-guide'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function addLog(msg) {
    const log = document.getElementById('bt-log');
    if (log) log.textContent = msg;
  }
  // ============================================================
  // アクターカード直接ドラッグ方式
  // ============================================================
  function getActorCell() {
    if (!sw.actor) return null;
    return document.getElementById('bt-ag-' + sw.actor.row + '-' + sw.actor.col);
  }

  function getActorCard() {
    const cell = getActorCell();
    if (!cell) return null;
    return cell.querySelector('.bt-chara-card');
  }

  function bindActorDragStart() {
    const cell = getActorCell();
    const card = cell && cell.querySelector('.bt-chara-card');

    if (!card) {
      console.warn('[SwipeBattle] bindActorDragStart: カードが見つからない', {
        actorRow: sw.actor && sw.actor.row,
        actorCol: sw.actor && sw.actor.col,
        cellId: sw.actor ? 'bt-ag-' + sw.actor.row + '-' + sw.actor.col : null,
        cellFound: !!cell,
      });
      return;
    }

    // _swipeDragBound は同一DOMノードへの二重バインドを防ぐためのフラグ。
    // renderField() がカードを innerHTML で再構築した場合は新しいノードになるため、
    // フラグは自動的に消える（古いノードが捨てられる）。
    if (card._swipeDragBound) {
      console.log('[SwipeBattle] bindActorDragStart: 既にバインド済み（スキップ）', sw.actor && sw.actor.name);
      return;
    }

    card._swipeDragBound = true;
    card.classList.add('swipe-draggable');

    // img に draggable=false を付与
    card.querySelectorAll('img').forEach(img => {
      img.draggable = false;
    });

    // capture: true で上位レイヤーより先に拾う
    card.addEventListener('pointerdown', onActorPointerDown, { passive: false, capture: true });

    console.log('[SwipeBattle] drag bound:', sw.actor && sw.actor.name, '/ card:', card);
  }

  function onActorPointerDown(e) {
    console.log('[SwipeBattle] onActorPointerDown:', sw.actor && sw.actor.name, 'active:', sw.active);

    if (!sw.active || sw.pointerId !== null) return;
    if (e.target.closest('button')) return;

    sw.pointerId = e.pointerId;
    sw.startX    = e.clientX;
    sw.startY    = e.clientY;
    dragging     = true;

    // DOM再生成でカードが消えても追跡できるよう document 側でリスナーを持つ
    addDocumentDragListeners();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    addLog('— キャラをつかみました：そのまま動かしてください');
    console.log('[SwipeBattle] pointerdown:', sw.actor && sw.actor.name, e.pointerId);

    e.preventDefault();
    e.stopPropagation();
  }

  // ============================================================
  // document レベルのドラッグリスナー（pointerdown 後に付け外し）
  // ============================================================
  function onDocumentPointerMove(e) {
  if (!sw.active || !dragging || e.pointerId !== sw.pointerId) return;

  const next = getAllyCellFromPoint(e.clientX, e.clientY);
  if (!next) {
    e.preventDefault();
    return;
  }

  if (!sw.actor) {
    e.preventDefault();
    return;
  }

  // 現在位置と同じマスなら何もしない
  if (next.row === sw.actor.row && next.col === sw.actor.col) {
    e.preventDefault();
    return;
  }

  // 隣接マスに入ったときだけ1歩進める
  const swipeDir = getSwipeDirToCell(sw.actor, next);
  if (!swipeDir) {
    e.preventDefault();
    return;
  }

  trySwipeMove(swipeDir);

  e.preventDefault();
}

function getAllyCellFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;

  const cell = el.closest('.bt-grid-cell');
  if (!cell || !cell.id || !cell.id.startsWith('bt-ag-')) return null;

  // id形式: bt-ag-near-left
  const parts = cell.id.replace('bt-ag-', '').split('-');
  if (parts.length !== 2) return null;

  return {
    row: parts[0],
    col: parts[1],
    cell,
  };
}

function getSwipeDirToCell(actor, target) {
  const ROW_IDX = { near: 0, mid: 1, far: 2 };
  const COL_IDX = { left: 0, center: 1, right: 2 };

  const ar = ROW_IDX[actor.row];
  const ac = COL_IDX[actor.col];
  const tr = ROW_IDX[target.row];
  const tc = COL_IDX[target.col];

  if (ar == null || ac == null || tr == null || tc == null) return null;

  const dr = tr - ar;
  const dc = tc - ac;

  // 斜め・2マス以上移動は無効
  if (Math.abs(dr) + Math.abs(dc) !== 1) return null;

  if (dr === -1) return 'up';
  if (dr ===  1) return 'down';
  if (dc === -1) return 'left';
  if (dc ===  1) return 'right';

  return null;
}

  function onDocumentPointerUp(e) {
    if (!sw.active || e.pointerId !== sw.pointerId) return;

    dragging     = false;
    sw.pointerId = null;
    removeDocumentDragListeners();

    applyIfReady();
    e.preventDefault();
  }

  function onDocumentPointerCancel(e) {
    if (e.pointerId !== sw.pointerId) return;

    dragging     = false;
    sw.pointerId = null;
    removeDocumentDragListeners();

    addLog('— ドラッグをキャンセルしました');
  }

  function addDocumentDragListeners() {
    document.addEventListener('pointermove',   onDocumentPointerMove,   { passive: false });
    document.addEventListener('pointerup',     onDocumentPointerUp,     { passive: false });
    document.addEventListener('pointercancel', onDocumentPointerCancel, { passive: false });
  }

  function removeDocumentDragListeners() {
    document.removeEventListener('pointermove',   onDocumentPointerMove);
    document.removeEventListener('pointerup',     onDocumentPointerUp);
    document.removeEventListener('pointercancel', onDocumentPointerCancel);
  }

  // battle-root には touchAction だけ設定（pointermove/up は document 側で処理）
  function attachPointerListeners() {
    const target = document.getElementById('battle-root');
    if (!target) return;
    target.style.touchAction = 'none';
  }
  // ============================================================
  // 発動判定（move0・歩数不一致では発動しない）
  // ============================================================
  async function applyIfReady() {
  if (applying) return;
  applying = true;

  try {
    if (!sw.active) return;

    const moveCount = getEffectiveMoveCount();

    // move0：元の位置に戻っているので、何も起こさずスワイプやり直し
    if (moveCount <= 0) {
      addLog('— 1歩以上移動してください（元の位置に戻っています）');

      // 表示だけ更新。ターンは進めない
      refreshPreview();
      highlightActorCell();
      renderMoveStepNumbers();

      return;
    }

    // moveTrigger不一致：移動は確定、スキル不発、ターンを進める
    if (!isMoveTriggerMatched(sw.actor, sw.skill, moveCount)) {
      const trigLabel = getMoveTriggerLabel(sw.actor, sw.skill);
      const need = trigLabel ? '（必要歩数：' + trigLabel + '）' : '';

      addLog('— 歩数条件不一致。スキルは発動しません' + need + ' MOVE ' + moveCount);

      // 数字・プレビューを消す
      clearMoveStepNumbers();
      clearPreview();

      // 倍率を戻す
      const bs = getBs();
      if (bs) bs.swipeComboMultiplier = 1.0;

      // スワイプモード終了
      endSwipeAimMode();

      // 中央MOVE演出
      await playMoveCountBurst(moveCount, false);

      // スキル発動なし・霊力回復なし・サブスキルなしでターンだけ進める
      if (typeof window.executePassAction === 'function') {
        window.executePassAction();
      }

      return;
    }

    // 発動確定：倍率を確定してから executeSelectedSkill へ
    sw.multiplier = getMoveBonusMultiplier(sw.skill, moveCount);

    const bs = getBs();
    if (bs) bs.swipeComboMultiplier = sw.multiplier;

    const hitCount = sw.hitTargets.length;
    const mbLabel  = getMoveBonusLabel(sw.skill, moveCount);

    if (hitCount > 0) {
      addLog(
        sw.actor.name + '「' + sw.skill.name + '」発動！' +
        ' (HIT ' + hitCount + ', MOVE ' + moveCount + ', ' + mbLabel + ')'
      );
    } else {
      addLog(
        sw.actor.name + '「' + sw.skill.name + '」空振り！' +
        ' (HIT 0, MOVE ' + moveCount + ', ' + mbLabel + ')'
      );
    }

    // 発動確定した瞬間に歩数表示を消す
    clearMoveStepNumbers();

    sw.active = false;

    // move0/idealMoves判定を通過した発動確定時のみ承認フラグを立てる。
    window.__SWIPE_EXECUTE_APPROVED__ = true;

    // 中央MOVE演出
    await playMoveCountBurst(moveCount, true);

    if (window._origExecuteSelectedSkill) {
      window._origExecuteSelectedSkill();
    } else if (window.executeSelectedSkill) {
      window.executeSelectedSkill();
    }

    endSwipeAimMode();

  } finally {
    applying = false;
  }
}

  // ============================================================
  // モード開始・終了
  // ============================================================
  window.SwipeBattle = {

  // battle.js の selectSkill() 末尾から呼ばれる
  start: function (actor, skill) {
    console.log('[SwipeBattle.start]', {
      actor: actor && actor.name,
      skill: skill && skill.name,
      actorRow: actor && actor.row,
      actorCol: actor && actor.col,
      bs: window.bs,
      bsPhase: window.bs && window.bs.phase,
    });

    const bs = getBs();
    if (!bs || !actor || !skill) {
      console.warn('[SwipeBattle.start] 早期リターン:', { bs: !!bs, actor: !!actor, skill: !!skill });
      return;
    }

    // planning以外でも一旦動かしたい場合は、ここでは弾かない
    // if (bs.phase !== 'planning') return;

    // 既に active なら一旦リセット（スキル切り替え時）
    if (sw.active) endSwipeAimMode();

    sw.active     = true;
    sw.actor      = actor;
    sw.skill      = skill;
    sw.moveCount  = 0;
    sw.multiplier = 1.0;
    sw.hitTargets = [];
    sw.pointerId  = null;
    sw.startX     = 0;
    sw.startY     = 0;
    sw.startCell  = { row: actor.row, col: actor.col }; // 開始位置を記録
    sw.path       = [];

    bs.swipeComboMultiplier = sw.multiplier;

    refreshPreview();
    renderHUD();
    highlightActorCell();

    attachPointerListeners();
    bindActorDragStart();

    // bindActorDragStart 結果を確認
    const cell = document.getElementById('bt-ag-' + actor.row + '-' + actor.col);
    const card = cell && cell.querySelector('.bt-chara-card');
    console.log('[SwipeBattle.start] bindActorDragStart 後:', {
      cellId: 'bt-ag-' + actor.row + '-' + actor.col,
      cellFound: !!cell,
      cardFound: !!card,
      swipeDragBound: card && card._swipeDragBound,
      swipeActive: sw.active,
    });
    // PASSボタンはbattle.js側で常時表示済みのため動的生成しない
    // renderSwipePassButton();

    addLog(actor.name + '「' + skill.name + '」選択中：キャラをつかんでドラッグ');
  },
  

  // 外部から終了させたいときに使う
  end: endSwipeAimMode,

  // デバッグ用：コンソールから手動スワイプテスト
  swipe: function (dir) {
    trySwipeMove(dir);
  },

  state: sw,
};

  function endSwipeAimMode() {
    if (!sw.active && !sw.hitTargets.length && !document.querySelector('.bt-move-step-num')) return;

    dragging      = false;
    sw.active     = false;
    sw.actor      = null;
    sw.skill      = null;
    sw.pointerId  = null;
    sw.hitTargets = [];
    sw.path       = [];

    clearMoveStepNumbers();
    // PASSボタンはbattle.js側の常時表示に移行したため動的削除しない
    // removeSwipePassButton();

    removeDocumentDragListeners();

    const bs = getBs();
    if (bs) bs.swipeComboMultiplier = 1.0;

    clearPreview();
    removeHUD();
    document.querySelectorAll('.swipe-actor').forEach(el => el.classList.remove('swipe-actor'));
    // ドラッグバインドをリセット（次回のactorカード再バインドに備える）
    document.querySelectorAll('.bt-chara-card.swipe-draggable').forEach(card => {
      card.classList.remove('swipe-draggable');
      card._swipeDragBound = false;
      card.removeEventListener('pointerdown', onActorPointerDown, { capture: true });
    });
  }

  // ============================================================
  // cancelSkillSelect のラップ（スワイプモードを一緒に終了）
  // ============================================================
  // executeSelectedSkill は battle.js 側に倍率補正を移したため
  // ここではラップしない（二重ラップを防ぐ）。
  function hookCancelSkillSelect() {
    if (window._swipeCancelHooked) return;
    window._swipeCancelHooked = true;
    const orig = window.cancelSkillSelect;
    if (!orig) return;
    window._origCancelSkillSelect = orig;
    window.cancelSkillSelect = function () {
      endSwipeAimMode();
      orig.call(this);
    };
  }

  // ============================================================
  // MutationObserver：renderField 後にプレビューを再適用
  // （battle.js 内 renderField がDOMを再構築するためクラスが消える）
  // ============================================================
  function watchEnemyGrid() {
    const root = document.getElementById('battle-root');
    if (!root || root._swipeGridWatched) return;
    root._swipeGridWatched = true;

    const obs = new MutationObserver(() => {
      if (!sw.active) return;
      requestAnimationFrame(() => {
        if (!sw.active) return;
        refreshPreview();
highlightActorCell();
renderMoveStepNumbers();
bindActorDragStart();
      });
    });
    obs.observe(root, { childList: true, subtree: true });
  }

  // ============================================================
  // CSS
  // ============================================================
  function injectStyle() {
  const old = document.getElementById('swipe-style');
  if (old) old.remove();

  const s = document.createElement('style');
  s.id = 'swipe-style';

    s.textContent = `
      /* 着弾予定マス（skill-range と同じ黄色に統一） */
      .bt-grid-cell.hit-preview,
      .bt-grid-cell.connected-hit {
        background: rgba(0,0,0,.55) !important;
        box-shadow:
          0 0 10px rgba(200,160,40,.5),
          0 0 20px rgba(180,140,30,.3),
          inset 0 0 8px rgba(160,120,20,.2) !important;
      }
      .bt-grid-cell.hit-preview::after,
      .bt-grid-cell.connected-hit::after {
        border-color: rgba(220,180,60,.9) !important;
        box-shadow:
          0 0 10px rgba(200,160,40,.5),
          0 0 20px rgba(180,140,30,.3) !important;
        animation: skillRangePulse .9s ease-in-out infinite;
      }

      #swipe-hud,
      #swipe-guide {
        display: none !important;
      }

      /* 操作中キャラセル（紫枠） */
      .bt-grid-cell.swipe-actor::after {
        border-color: rgba(140,100,255,0.7) !important;
        box-shadow: inset 0 0 12px rgba(120,80,220,0.3) !important;
      }

      /* タッチ操作・ドラッグ防止 */
      #battle-root,
      .bt-main-field,
      .bt-grid-wrap,
      .bt-grid-cell,
      .bt-chara-card,
      .bt-chara-img {
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }

      /* ドラッグ可能カード */
      .bt-chara-card.swipe-draggable {
        pointer-events: auto !important;
        cursor: grab;
      }
      .bt-chara-card.swipe-draggable:active {
        cursor: grabbing;
      }

      /* キャラ画像はポインターイベントを無効化 */
      .bt-chara-img {
        pointer-events: none !important;
        -webkit-user-drag: none;
      }

      /* スワイプHUD */
      #swipe-hud {
        position:fixed; bottom:220px; left:50%; transform:translateX(-50%);
        z-index:210000;
        background:rgba(10,10,18,0.88);
        border:1px solid rgba(140,100,255,0.35); border-radius:12px;
        padding:10px 20px; text-align:center;
        backdrop-filter:blur(8px); pointer-events:none; min-width:180px;
      }
      .swipe-hud-row { display:flex; justify-content:center; align-items:center; gap:14px; line-height:1.4; }
      .swipe-connected {
        font-family:"Cinzel",serif; font-size:13px; letter-spacing:3px;
        color:rgba(255,210,80,0.95); text-shadow:0 0 10px rgba(255,180,40,0.6);
      }
      .swipe-no-hit {
        font-family:"Cinzel",serif; font-size:11px; letter-spacing:2px;
        color:rgba(232,228,220,0.35);
      }
      .swipe-hud-stats {
        margin-top:6px; font-family:"Cinzel",serif;
        font-size:11px; letter-spacing:2px; color:rgba(232,228,220,0.65);
      }
      .swipe-hud-stats b { color:rgba(232,228,220,0.95); font-weight:700; }
      .swipe-hud-status { margin-top:4px; font-size:10px; letter-spacing:1px; }
      .swipe-move-warn  { color:rgba(255,120,80,0.9); font-family:"Noto Serif JP",serif; }
      .swipe-move-bonus { color:rgba(255,210,60,0.95); font-family:"Cinzel",serif; letter-spacing:2px; }
      .swipe-move-ok    { color:rgba(120,220,140,0.85); font-family:"Noto Serif JP",serif; }

      /* ガイドテキスト */
      #swipe-guide {
        position:fixed; bottom:196px; left:50%; transform:translateX(-50%);
        z-index:210000;
        font-family:"Noto Serif JP",serif; font-size:10px; letter-spacing:2px;
        color:rgba(232,228,220,0.4); pointer-events:none; white-space:nowrap;
      }

.bt-move-step-num {
  position: fixed !important;
  z-index: 999999 !important;
  transform: translate(-50%, -50%) !important;

  font-size: 76px !important;
  font-weight: 900 !important;
  line-height: 1 !important;

  width: auto !important;
  height: auto !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;

  pointer-events: none;
}

#bt-move-burst {
  position: fixed;
  left: 50%;
  top: 42%;
  z-index: 1000000;
  transform: translate(-50%, -50%) scale(.45);

  font-family: "Cinzel", serif;
  font-size: 96px;
  font-weight: 900;
  line-height: 1;

  pointer-events: none;
  opacity: 0;

  animation: btMoveBurst .72s ease-out forwards;
}

#bt-move-burst.is-ng {
  color: #ff4b4b;
  text-shadow:
    0 0 8px rgba(255, 80, 80, 1),
    0 0 24px rgba(255, 0, 0, .95),
    0 0 52px rgba(255, 0, 0, .75),
    0 0 90px rgba(180, 0, 0, .65);
}

#bt-move-burst.is-ok {
  color: #61ff9a;
  text-shadow:
    0 0 8px rgba(120, 255, 170, 1),
    0 0 24px rgba(40, 255, 120, .95),
    0 0 52px rgba(20, 220, 100, .75),
    0 0 90px rgba(0, 180, 80, .65);
}

@keyframes btMoveBurst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(.45);
    filter: blur(2px);
  }
  18% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
    filter: blur(0);
  }
  70% {
    opacity: .85;
    transform: translate(-50%, -50%) scale(1.45);
    filter: blur(1px);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2.25);
    filter: blur(8px);
  }
}

.bt-move-step-num.is-ng {
  color: #ff4b4b;
  text-shadow:
    0 0 6px rgba(255, 80, 80, 1),
    0 0 16px rgba(255, 0, 0, .95),
    0 0 32px rgba(255, 0, 0, .75),
    0 0 52px rgba(180, 0, 0, .65);
}

.bt-move-step-num.is-ok {
  color: #61ff9a;
  text-shadow:
    0 0 6px rgba(120, 255, 170, 1),
    0 0 16px rgba(40, 255, 120, .95),
    0 0 32px rgba(20, 220, 100, .75),
    0 0 52px rgba(0, 180, 80, .65);
}

#battle-root {
  position: relative;
}

#bt-swipe-pass-btn {
  position: absolute;
  left: 58px;
  bottom: 54px;
  z-index: 1000001;

  width: 58px;
  height: 24px;
  padding: 0;

  border-radius: 999px;

  font-family: "Cinzel", serif;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2px;

  color: rgba(255,255,255,.92);
  background: rgba(20, 20, 28, .82);
  border: 1px solid rgba(255,255,255,.32);

  box-shadow:
    0 0 12px rgba(255,255,255,.16),
    inset 0 0 10px rgba(255,255,255,.08);

  backdrop-filter: blur(8px);
}

#bt-swipe-pass-btn:active {
  transform: scale(.96);
}

@keyframes btMoveStepPop {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(.72);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
  
    `;
    document.body.appendChild(s);
  }

  // ============================================================
  // 初期化
  // ============================================================
  function init() {
    injectStyle();

    // battle-root が生成されるのを待つ
    const check = setInterval(() => {
      if (!document.getElementById('battle-root')) return;
      clearInterval(check);
      hookCancelSkillSelect();
      watchEnemyGrid();
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
