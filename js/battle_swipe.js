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

  // スワイプ回数 → ダメージ倍率テーブル（インデックス = 回数、末尾が4手以上に適用）
  const MULTIPLIER_TABLE = [2.2, 1.8, 1.4, 1.1, 1.0];

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
  };

  // ============================================================
  // ヘルパー
  // ============================================================
  function getBs() { return window.bs; }

  function getMultiplier(count) {
    return MULTIPLIER_TABLE[Math.min(count, MULTIPLIER_TABLE.length - 1)];
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
    const enemyMoved = moveEnemiesBySwipe(ENEMY_DIR[swipeDir]);

    if (!actorMoved && !enemyMoved) {
      addLog('— 移動できない');
      return;
    }

    sw.moveCount++;
    sw.multiplier = getMultiplier(sw.moveCount);

    const bs = getBs();
    if (bs) bs.swipeComboMultiplier = sw.multiplier;

    refreshPreview();

    if (typeof window.renderBattleField === 'function') {
      window.renderBattleField();
    }

    renderHUD();
    highlightActorCell();
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
      if (el) el.classList.add('hit-preview');
    });
    sw.hitTargets.forEach(e => {
      const el = document.getElementById('bt-eg-' + e.row + '-' + e.col);
      if (el) el.classList.add('connected-hit');
    });
  }

  function clearPreview() {
    document.querySelectorAll('.hit-preview, .connected-hit').forEach(el => {
      el.classList.remove('hit-preview', 'connected-hit');
    });
  }

  function highlightActorCell() {
    document.querySelectorAll('.swipe-actor').forEach(el => el.classList.remove('swipe-actor'));
    if (!sw.active || !sw.actor) return;
    const el = document.getElementById('bt-ag-' + sw.actor.row + '-' + sw.actor.col);
    if (el) el.classList.add('swipe-actor');
  }

  // ============================================================
  // HUD
  // ============================================================
  function renderHUD() {
    let hud = document.getElementById('swipe-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'swipe-hud';
      document.body.appendChild(hud);
    }
    const connected = sw.hitTargets.length > 0;
    hud.innerHTML = `
      <div class="swipe-hud-row">
        ${connected
          ? '<span class="swipe-connected">⬡ TARGET LOCK</span>'
          : '<span class="swipe-no-hit">MISS RANGE</span>'}
      </div>
      <div class="swipe-hud-row swipe-hud-stats">
        <span>HIT <b>${sw.hitTargets.length}</b></span>
        <span>MOVE <b>${sw.moveCount}</b></span>
        <span>×<b>${sw.multiplier.toFixed(1)}</b></span>
      </div>
    `;

    let guide = document.getElementById('swipe-guide');
    if (!guide) {
      guide = document.createElement('div');
      guide.id = 'swipe-guide';
      document.body.appendChild(guide);
    }
    guide.textContent = connected ? '指を離すと発動' : '指を離すと空振り';
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
function attachPointerListeners() {
  const target = document.getElementById('battle-root');
  if (!target || target._swipeAttached) return;
  target._swipeAttached = true;

  // スマホで画面スクロールやブラウザ操作に奪われないようにする
  target.style.touchAction = 'none';

  target.addEventListener('pointerdown', (e) => {
    if (!sw.active || sw.pointerId !== null) return;

    // ボタン上ではスワイプ開始しない
    if (e.target.closest('button')) return;

    // 操作中キャラのセル（またはその子要素）からのみ開始する
    const actorCell = sw.actor
      ? document.getElementById('bt-ag-' + sw.actor.row + '-' + sw.actor.col)
      : null;
    if (!actorCell || !actorCell.contains(e.target)) {
      addLog('— 行動中キャラを押さえてスワイプしてください');
      return;
    }

    sw.pointerId = e.pointerId;
    sw.startX    = e.clientX;
    sw.startY    = e.clientY;

    target.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, { passive: false });

  target.addEventListener('pointermove', (e) => {
    if (!sw.active || e.pointerId !== sw.pointerId) return;

    const dx   = e.clientX - sw.startX;
    const dy   = e.clientY - sw.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < SWIPE_THRESHOLD) return;

    // 連続スワイプできるように基準点を更新
    sw.startX = e.clientX;
    sw.startY = e.clientY;

    trySwipeMove(detectDirection(dx, dy));
    e.preventDefault();
  }, { passive: false });

  target.addEventListener('pointerup', (e) => {
    if (!sw.active || e.pointerId !== sw.pointerId) return;

    sw.pointerId = null;
    applyIfReady();
    e.preventDefault();
  }, { passive: false });

  target.addEventListener('pointercancel', (e) => {
    if (e.pointerId === sw.pointerId) {
      sw.pointerId = null;
    }
  }, { passive: true });
}
  // ============================================================
  // 発動判定（HIT 0 でも必ず発動する）
  // ============================================================
  function applyIfReady() {
    if (!sw.active) return;

    const hitCount   = sw.hitTargets.length;
    const multiplier = sw.multiplier;

    // HIT数によらずログを出して発動へ進む
    if (hitCount > 0) {
      addLog(
        sw.actor.name + '「' + sw.skill.name + '」発動！' +
        ' (HIT ' + hitCount + ', MOVE ' + sw.moveCount + ', ×' + multiplier.toFixed(1) + ')'
      );
    } else {
      addLog(
        sw.actor.name + '「' + sw.skill.name + '」空振り！' +
        ' (HIT 0, MOVE ' + sw.moveCount + ', ×' + multiplier.toFixed(1) + ')'
      );
    }

    // ポインターイベントを止める（HUDはまだ残す）
    sw.active = false;

    // battle.js の executeSelectedSkill → executeImmediateSkill へ流す
    // swipeComboMultiplier は executeSelectedSkill 内で退避・復元されるため順序は問わない
    if (window._origExecuteSelectedSkill) {
      window._origExecuteSelectedSkill();
    } else if (window.executeSelectedSkill) {
      window.executeSelectedSkill();
    }

    // 発動後にHUD・プレビューを消す
    endSwipeAimMode();
  }

  // ============================================================
  // モード開始・終了
  // ============================================================
  window.SwipeBattle = {

  // battle.js の selectSkill() 末尾から呼ばれる
  start: function (actor, skill) {
    const bs = getBs();
    if (!bs || !actor || !skill) return;

    // planning以外でも一旦動かしたい場合は、ここでは弾かない
    // if (bs.phase !== 'planning') return;

    // 既に active なら一旦リセット（スキル切り替え時）
    if (sw.active) endSwipeAimMode();

    sw.active     = true;
    sw.actor      = actor;
    sw.skill      = skill;
    sw.moveCount  = 0;
    sw.multiplier = getMultiplier(0);
    sw.hitTargets = [];
    sw.pointerId  = null;
    sw.startX     = 0;
    sw.startY     = 0;

    bs.swipeComboMultiplier = sw.multiplier;

    refreshPreview();
    renderHUD();
    highlightActorCell();

    attachPointerListeners();

    addLog(actor.name + '「' + skill.name + '」選択中：行動中キャラを押さえてスワイプ');
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
    if (!sw.active && !sw.hitTargets.length) return; // 何もしない
    sw.active     = false;
    sw.actor      = null;
    sw.skill      = null;
    sw.pointerId  = null;
    sw.hitTargets = [];

    const bs = getBs();
    if (bs) bs.swipeComboMultiplier = 1.0;

    clearPreview();
    removeHUD();
    document.querySelectorAll('.swipe-actor').forEach(el => el.classList.remove('swipe-actor'));
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
      });
    });
    obs.observe(root, { childList: true, subtree: true });
  }

  // ============================================================
  // CSS
  // ============================================================
  function injectStyle() {
    if (document.getElementById('swipe-style')) return;
    const s = document.createElement('style');
    s.id = 'swipe-style';
    s.textContent = `
      /* レンジ内セル（青紫） */
      .bt-grid-cell.hit-preview::after {
        border-color: rgba(140,100,255,0.85) !important;
        box-shadow: 0 0 10px rgba(120,80,240,0.5), inset 0 0 8px rgba(80,40,200,0.2) !important;
        animation: hitPreviewPulse 0.9s ease-in-out infinite;
      }
      @keyframes hitPreviewPulse {
        0%,100% { border-color:rgba(120,80,240,0.6);   box-shadow:0 0 6px rgba(100,60,220,0.3); }
        50%     { border-color:rgba(180,140,255,0.95); box-shadow:0 0 16px rgba(160,120,255,0.7); }
      }

      /* 結線成立セル（金） */
      .bt-grid-cell.connected-hit::after {
        border-color: rgba(255,200,60,0.95) !important;
        box-shadow: 0 0 14px rgba(255,180,40,0.7), 0 0 28px rgba(240,160,20,0.4), inset 0 0 10px rgba(220,140,10,0.3) !important;
        animation: connectedPulse 0.6s ease-in-out infinite !important;
      }
      @keyframes connectedPulse {
        0%,100% { border-color:rgba(240,180,40,0.7); box-shadow:0 0 10px rgba(220,160,20,0.5); }
        50%     { border-color:rgba(255,220,80,1.0);  box-shadow:0 0 22px rgba(255,200,60,0.9), 0 0 40px rgba(240,180,40,0.5); }
      }

      /* 操作中キャラセル（紫枠） */
      .bt-grid-cell.swipe-actor::after {
        border-color: rgba(140,100,255,0.7) !important;
        box-shadow: inset 0 0 12px rgba(120,80,220,0.3) !important;
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

      /* ガイドテキスト */
      #swipe-guide {
        position:fixed; bottom:196px; left:50%; transform:translateX(-50%);
        z-index:210000;
        font-family:"Noto Serif JP",serif; font-size:10px; letter-spacing:2px;
        color:rgba(232,228,220,0.4); pointer-events:none; white-space:nowrap;
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
