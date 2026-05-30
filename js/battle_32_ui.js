// battle_32_ui.js
// Battle32 の状態を画面に描画するUIレイヤー
// 依存: battle_32.js（Battle32グローバル）
// battle.js / battle_range.js / battle_swipe.js には一切触れない
//
// 公開API:
//   renderBattle32UI()   — 現在の Battle32.getState() を読んで全画面再描画
//   closeBattle32UI()    — UI全体を非表示にしてマップ画面へ戻す

(function () {

  // ============================================================
  // 定数
  // ============================================================
  const ROOT_ID  = 'battle32-root';
  const STYLE_ID = 'battle32-ui-style';
  const ALLY_MOVE_STEPS = 3;

  const PHASE_LABEL = {
    skill: 'SKILL PHASE',
    enemy: 'ENEMY PHASE',
    end:   'BATTLE END',
  };
  const PHASE_COLOR = {
    skill: '#e8c87a',
    enemy: '#d07878',
    end:   '#a0a0a0',
  };

  // ============================================================
  // ステート — スキル操作
  // ============================================================
  let _selSkillAllyUid = null;
  let _selSkillId      = null;
  let _moveMode        = false;

  function _resetSkillState() {
  _selSkillAllyUid = null;
  _selSkillId      = null;
  _moveMode        = false;

  const box = document.getElementById('b32-skill-detail-box');
  if (box) {
    box.style.display = 'none';
    box.classList.remove('show');
  }
}

  // ============================================================
  // ヘルパー
  // ============================================================
  function initial(name) { return (name || '?')[0]; }

  function hpColor(hp, hpMax) {
    const r = hp / hpMax;
    if (r > 0.6) return '#5ad48a';
    if (r > 0.3) return '#e8c87a';
    return '#d07878';
  }

  function _bs() {
    return window.Battle32 && window.Battle32.getState ? window.Battle32.getState() : null;
  }

  function _skillRangeCells(allyUid, skillId) {
    if (!window.Battle32 || !window.Battle32.getSkillRangeCells) return new Set();
    const cells = window.Battle32.getSkillRangeCells(allyUid, skillId);
    return new Set(cells.map(c => `${c.row}-${c.col}`));
  }

  // ============================================================
  // CSS
  // ============================================================
  function injectStyle() {
    // CSSは css/battle_32_ui.css に分離済み
    // ── 中央テキスト演出 専用スタイル（黒ぼかし背景 + ドーンアップアウト演出） ──
    if (document.getElementById('b32-center-text-style')) return;
    const style = document.createElement('style');
    style.id = 'b32-center-text-style';
    style.textContent = `
      /* ── ラッパー：画面全体を覆う（pointer-events: none） ── */
      #b32-center-text {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        gap: 10px;
        opacity: 0;
      }
      /* ── 背景帯：黒ぼかし半透明グラデーション ── */
      #b32-center-text::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          180deg,
          transparent 0%,
          rgba(0,0,0,.52) 30%,
          rgba(4,6,18,.64) 50%,
          rgba(0,0,0,.52) 70%,
          transparent 100%
        );
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
        pointer-events: none;
      }
      /* ── テキストは背景より前面 ── */
      #b32-center-text .b32ct-main,
      #b32-center-text .b32ct-sub {
        position: relative;
        z-index: 1;
      }
      #b32-center-text .b32ct-main {
        font-family: 'Cinzel', serif;
        font-size: clamp(26px, 7vw, 46px);
        font-weight: 700;
        letter-spacing: 7px;
        color: #f5edbc;
        text-shadow:
          0 0 6px rgba(255,255,255,.6),
          0 0 22px rgba(240, 200, 80, .85),
          0 0 55px rgba(240, 160, 40, .50),
          0 2px 4px rgba(0,0,0,.9);
        white-space: nowrap;
      }
      #b32-center-text .b32ct-sub {
        font-family: 'Noto Serif JP', serif;
        font-size: clamp(12px, 3.2vw, 17px);
        letter-spacing: 4px;
        color: rgba(232, 228, 220, .85);
        text-shadow:
          0 0 10px rgba(200, 180, 120, .6),
          0 1px 3px rgba(0,0,0,.9);
        white-space: nowrap;
      }
      /* ── じわ〜と浮かび上がり、じわ〜と消える静かな演出 ── */
      #b32-center-text.b32ct-enter {
        animation: b32ctEnter .75s ease-out forwards;
      }
      #b32-center-text.b32ct-exit {
        animation: b32ctExit .85s ease-in forwards;
      }
      @keyframes b32ctEnter {
        0% {
          opacity: 0;
          transform: translateY(6px) scale(0.995);
          filter: blur(2px);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
      }
      @keyframes b32ctExit {
        0% {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
        100% {
          opacity: 0;
          transform: translateY(-4px) scale(1);
          filter: blur(2px);
        }
      }
    `;
    document.head.appendChild(style);

    // ── スキルチップ横並び用スタイル ──
    if (document.getElementById('b32-skill-chip-style')) return;
    const chipStyle = document.createElement('style');
    chipStyle.id = 'b32-skill-chip-style';
    chipStyle.textContent = `
      /* スキルチップ行：横並び1段 */
      .b32-skill-chip-row {
        display: flex;
        gap: 5px;
        width: 100%;
        align-items: stretch;
        flex-wrap: nowrap;
      }

#b32-log {
  height: 14px !important;
  line-height: 14px !important;
  font-size: 9px !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

/* 下部エリアを詰める */
#b32-bottom-area {
  margin-top: 0 !important;
  padding-top: 0 !important;
}

/* 案内テキスト */
#b32-bottom-guide {
  height: 12px !important;
  min-height: 12px !important;
  margin: 0 0 4px 0 !important;
  line-height: 12px !important;
}

/* キャラカード行 */
#b32-party-status {
  margin-top: 0 !important;
}

      #b32-bottom-guide {
      width: 100%;
      height: 14px;
      min-height: 14px;
      margin: 0;
      text-align: center;
      font-size: 10px;
      letter-spacing: 1px;
      color: rgba(232, 228, 220, .72);
      text-shadow:
        0 0 8px rgba(220, 190, 120, .35),
        0 1px 2px rgba(0,0,0,.9);
      font-family: 'Noto Serif JP', serif;
    }
    /* フィールド下〜キャラボックス上の案内エリアを最小化 */
#b32-log-wrap {
  display: block !important;
  height: 14px !important;
  min-height: 14px !important;
  max-height: 14px !important;
  margin: 2px 0 0 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  flex: 0 0 14px !important;
}

/* ログ本文は1行だけ。不要なら透明でもOK */
#b32-log {
  height: 14px !important;
  line-height: 14px !important;
  font-size: 9px !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

/* 操作案内テキストも1行分だけ */
#b32-bottom-guide {
  height: 14px !important;
  min-height: 14px !important;
  max-height: 14px !important;
  line-height: 14px !important;
  margin: 0 0 4px 0 !important;
  padding: 0 !important;
  font-size: 10px !important;
}

/* 下部エリア自体の上余白を消す */
#b32-bottom-area {
  margin-top: 0 !important;
  padding-top: 0 !important;
}
      /* 個別チップ */
      .b32-skill-chip {
        flex: 1;
        min-width: 0;
        height: 36px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 9px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.05);
        color: rgba(232,228,220,.85);
        font-family: 'Noto Serif JP', serif;
        font-size: 11px;
        letter-spacing: .5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        padding: 0 6px;
        transition: background .12s, border-color .12s;
        position: relative;
      }

      .b32-skill-chip:active {
        background: rgba(232,192,64,.18);
        border-color: rgba(232,192,64,.4);
      }

      /* ULTチップ */
      .b32-skill-chip.ult {
        flex: 0 0 44px;
        border-color: rgba(200,140,255,.4);
        background: rgba(160,80,220,.10);
        color: rgba(220,180,255,.85);
        font-size: 10px;
        letter-spacing: 1px;
      }

      .b32-skill-chip.ult:active {
        background: rgba(160,80,220,.25);
      }

      /* 行動終了チップ */
      .b32-skill-chip.end-turn {
        flex: 0 0 44px;
        border-color: rgba(180,180,180,.25);
        background: rgba(180,180,180,.05);
        color: rgba(232,228,220,.45);
        font-size: 10px;
        letter-spacing: .5px;
      }

      /* 無効チップ（神気不足・使用済み） */
      .b32-skill-chip.disabled {
        opacity: 0.35;
        pointer-events: none;
      }

      /* 神気ドット（チップ内下部） */
      .b32-chip-shinki {
        display: flex;
        gap: 2px;
        margin-top: 2px;
      }

      .b32-chip-shinki-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        border: 1px solid rgba(240,192,64,.4);
        background: rgba(240,192,64,.08);
      }

      .b32-chip-shinki-dot.filled {
        background: rgba(240,192,64,.9);
        border-color: rgba(240,192,64,.8);
      }

      /* キャラ名（コンパクト） */
      #b32-skill-chara-name {
        font-family: 'Cinzel', serif;
        font-size: 10px !important;
        letter-spacing: 2px !important;
        padding: 2px 0 2px !important;
      }
    `;
    document.head.appendChild(chipStyle);
  }

  // ============================================================
  // DOM 構築
  // ============================================================
  function buildRoot() {
    if (document.getElementById(ROOT_ID)) return;
    injectStyle();

    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.innerHTML = `
      <div id="b32-header">
        <div id="b32-turn-box">TURN<span id="b32-turn-num">1</span></div>
        <div id="b32-phase-badge"></div>
        <div id="b32-stage-label">STAGE<span id="b32-stage-id">—</span></div>
      </div>

      <div id="b32-hint-bar"></div>

        <div id="b32-boss-hp-ui" style="display:none">
          <div id="b32-boss-hp-name">BOSS</div>
          <div id="b32-boss-hp-bar-wrap">
            <div id="b32-boss-hp-bar"></div>
          </div>
          <div id="b32-boss-hp-text"></div>
        </div>

      <div id="b32-scroll">
        <div id="b32-board-wrap">
          <div id="b32-board"></div>
          <div class="b32-zone-label" style="top:0">ENEMY</div>
          <div class="b32-zone-label" style="bottom:0">ALLY</div>
        </div>

        <div id="b32-log-wrap"><div id="b32-log"></div></div>

        <div id="b32-bottom-area">
        <div id="b32-bottom-guide"></div>

        <!-- パーティステータス：常時表示 -->
        <div id="b32-party-status"></div>

        <!-- スキルフェーズ：スキルパネル -->
<div id="b32-skill-panel" style="display:none">
  <div id="b32-skill-chara-name"></div>

  <div id="b32-skill-list"></div>

  <div id="b32-skill-detail-box" style="display:none">
    <div id="b32-skill-detail-name"></div>
    <div id="b32-skill-detail-desc"></div>
    <div id="b32-skill-detail-meta"></div>

    <div id="b32-skill-detail-actions">
      <button type="button" id="b32-skill-confirm-btn" class="b32-skill-confirm-btn">
        決定
      </button>
    </div>
  </div>
</div>
</div>

      </div>

        <div style="height:8px;flex-shrink:0"></div>
      </div>

      <div id="b32-result-overlay">
        <div id="b32-result-text"></div>
        <button class="b32-btn" style="max-width:200px" onclick="closeBattle32UI()">
          マップへ戻る
        </button>
      </div>
    `;
    document.body.appendChild(root);
  }

  // ============================================================
  // フェーズボタン（グローバル公開）
  // ============================================================
  // ============================================================
  // 中央テキスト演出
  // ============================================================
  // ── 操作ロック ──
  let _b32InputLocked = false;

  window.b32LockInput = function () { _b32InputLocked = true; };
  window.b32UnlockInput = function () { _b32InputLocked = false; };

  let _centerTextTimer  = null;
  let _centerTextTimer2 = null;

  window.showBattle32CenterText = function (main, sub, duration) {
    // 既存タイマーを全クリア
    if (_centerTextTimer)  { clearTimeout(_centerTextTimer);  _centerTextTimer  = null; }
    if (_centerTextTimer2) { clearTimeout(_centerTextTimer2); _centerTextTimer2 = null; }

    // スタイルを確実に注入済みにする
    if (!document.getElementById('b32-center-text-style')) injectStyle();

    let el = document.getElementById('b32-center-text');
    if (!el) {
      el = document.createElement('div');
      el.id = 'b32-center-text';
      document.body.appendChild(el);
    }

    // 既存アニメを即リセットしてから再適用（再トリガー用）
    el.className = '';
    el.style.opacity = '0';
    el.innerHTML = `
      <div class="b32ct-main">${main}</div>
      ${sub ? `<div class="b32ct-sub">${sub}</div>` : ''}
    `;

    // 次フレームで enter アニメを開始
    requestAnimationFrame(() => {
      el.className = 'b32ct-enter';
    });

    // duration 後に exit アニメ開始
    const exitDuration = 850;  // CSSフェードアウト (.85s) に合わせる
    _centerTextTimer = setTimeout(() => {
      el.className = 'b32ct-exit';
      _centerTextTimer2 = setTimeout(() => {
        el.innerHTML = '';
        el.className  = '';
        el.style.opacity = '0';
        _centerTextTimer2 = null;
      }, exitDuration);
      _centerTextTimer = null;
    }, duration || 1200);
  };

  // await 可能バージョン：テキストが完全に消えるまで Promise を返す
  window.showBattle32CenterTextAsync = function (main, sub, duration) {
    return new Promise(resolve => {
      window.showBattle32CenterText(main, sub, duration);
      // duration(表示) + 400(フェードアウト) + 50(余裕) で resolve
      setTimeout(resolve, (duration || 1200) + 900);  // フェードアウト(.85s)分を確保
    });
  };

  window._b32EndSkill = function () {
    if (_b32InputLocked) return;
    _resetSkillState();
    if (window.Battle32) window.Battle32.endSkillPhase();
    renderBattle32UI();
  };
  window._b32CancelSel = function () {
    if (_b32InputLocked) return;
    _resetSkillState();
    renderBattle32UI();
  };

  // ============================================================
  // ボード描画
  // ============================================================
  function renderBoard(bs) {
    const board = document.getElementById('b32-board');
    if (!board) return;

    // ユニットマップ
    const unitMap = {};
    [...bs.allies, ...bs.enemies].forEach(u => { unitMap[`${u.row}-${u.col}`] = u; });

    // ── スキルフェーズ用ハイライト ──
    let skillSelectableUids = new Set();
    let skillRangeCells     = new Set();
    let movableCells = new Set();

    if (bs.phase === 'skill') {
  if (!_selSkillAllyUid) {
    bs.allies.filter(u => u.anima > 0 && !u.skillUsedThisTurn)
      .forEach(u => skillSelectableUids.add(u._uid));
  } else {
    if (_moveMode && window.Battle32 && window.Battle32.getMovableCells) {
      const cells = window.Battle32.getMovableCells(_selSkillAllyUid, ALLY_MOVE_STEPS);
      movableCells = new Set(cells.map(c => `${c.row}-${c.col}`));
    }

    if (_selSkillId) {
      skillRangeCells = _skillRangeCells(_selSkillAllyUid, _selSkillId);
    }
  }
}

    const cells = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 5; c++) {
        const key  = `${r}-${c}`;
        const unit = unitMap[key] || null;

        const zoneClass = r <= 2 ? 'enemy-zone' : r >= 5 ? 'ally-zone' : '';
        const isDivider = r === 4;

        const isSkillSelectable = unit && unit.side === 'ally' && skillSelectableUids.has(unit._uid);
        const isSkillSelected   = unit && unit._uid === _selSkillAllyUid && bs.phase === 'skill';
        const isSkillRange      = skillRangeCells.has(key);
        const isMovable = movableCells.has(key);

        let cls = `b32-cell ${zoneClass}`;
        if (isDivider)           cls += ' row-divider';
        if (isSkillSelectable)   cls += ' skill-selectable';
        if (isSkillSelected)     cls += ' skill-selected';
        if (isSkillRange && !unit) cls += ' skill-range';
        if (isMovable) cls += ' movable';

        // クリックハンドラ
        let onclick = '';

        if (isMovable && !unit) {
           onclick = `onclick="_b32OnMoveCellTap(${r},${c})"`;
        } else if (isSkillSelectable || isSkillSelected) {
          onclick = `onclick="_b32OnSkillAllyTap('${unit._uid}')"`;
        }

        cells.push(
         `<div class="${cls}" data-row="${r}" data-col="${c}" ${onclick}>` +
         (unit ? renderUnit(unit, bs.phase) : renderCore(r, c, bs)) +
        `</div>`
       );
      }
    }
    board.innerHTML = cells.join('');
  }

  function renderCore(row, col, bs) {
  const cores = bs.cores;
  if (!cores) return '';

  // 自陣コアのみ表示（敵コアは廃止・ボス自身がコアを内包する仕様）
  if (cores.ally && row === cores.ally.row && col === cores.ally.col) {
    return `
      <div style="
        font-size:8px;
        color:#8ff;
        border:1px solid rgba(120,240,255,.55);
        padding:2px 4px;
        border-radius:4px;
        background:rgba(0,40,55,.65);
        font-family:'Cinzel',serif;
        letter-spacing:1px;
        transform: rotateX(-50deg);
        transform-origin:center center;
      ">CORE</div>
    `;
  }

  return '';
}

  function renderUnit(u, phase) {
    // 味方の生存判定は anima、敵は hp
    // ただしボスは HP0 後も盤面に残る（核露出状態）
    const bsCurrent = _bs();
    const bossExposed = u.isBoss && bsCurrent?.bossCore?.exposed;

    const dead   = u.side === 'ally'
      ? (u.anima <= 0)
      : (u.hp <= 0 && !bossExposed); // ボス核露出中は dead 扱いしない

    const isDone = u.side === 'ally' && phase === 'skill' && u.skillUsedThisTurn;

    let inner = '';
    const displayImg = u.img || u.battleImg || null;
    if (displayImg) {
      inner += `<img class="b32-unit-icon" src="${displayImg}" alt="" onerror="this.style.display='none'">`;
    } else {
      inner += `<div class="b32-unit-initial">${initial(u.name)}</div>`;
    }
    inner += `<div class="b32-unit-name">${u.name}</div>`;

    // 敵のみ HP バーを出力（味方は HP バー廃止）
    // ボスは核露出後もバーを表示（HP0で0%表示になる）
    if (u.side === 'enemy') {
      const hpPct = Math.max(0, Math.round((u.hp / u.hpMax) * 100));
      const hpCol = hpColor(u.hp, u.hpMax);
      inner += `<div class="b32-hp-bar-wrap"><div class="b32-hp-bar" style="width:${hpPct}%;background:${hpCol}"></div></div>`;
    }

    if (u.side === 'ally') {
      const dots = Array.from({ length: u.shinkiMax }, (_, i) =>
        `<div class="b32-shinki-dot ${i < u.shinki ? 'filled' : ''}"></div>`
      ).join('');
      inner += `<div class="b32-shinki-dots">${dots}</div>`;
    }
    if (u.isBoss) inner += `<div class="b32-boss-badge">BOSS</div>`;
    // 核露出中はバッジを追加表示
    if (bossExposed) {
      const bc = bsCurrent.bossCore;
      inner += `<div class="b32-boss-badge" style="top:14px;background:rgba(180,80,220,.9)">CORE ${bc.capture}/${bc.captureMax}</div>`;
    }
    if (isDone) inner += `<div class="b32-unit-done-mark">✓</div>`;

    const extraCls =
      (isDone ? ' skill-done' : '') +
      (u.isBoss ? ' boss' : '');

    return `<div class="b32-unit ${u.side}${dead ? ' dead' : ''}${extraCls}">${inner}</div>`;
  }

  // ============================================================
  // スキル タップ操作
  // ============================================================

  // 盤面上の味方をタップ（スキルフェーズ）
  window._b32OnSkillAllyTap = async function (allyUid) {
  if (_b32InputLocked) return;
  const bs = _bs();
  if (!bs || bs.phase !== 'skill') return;

  // 移動後はスキル選択中なので、他キャラへ変更させない
  if (_selSkillAllyUid && !_moveMode && _selSkillAllyUid !== allyUid) {
    return;
  }

  const ally = bs.allies.find(u => u._uid === allyUid);
  if (!ally || ally.anima <= 0 || ally.skillUsedThisTurn) return;

  // 移動前なら同キャラタップで選択解除OK
  if (_selSkillAllyUid === allyUid) {
    if (_moveMode) {
      _resetSkillState();
      renderBattle32UI();
    }
    return;
  }

  // キャラ選択 → MOVE PHASE 表示が消えてから移動可能に
  _b32InputLocked = true;
  _selSkillAllyUid = allyUid;
  _selSkillId      = null;
  _moveMode        = true;
  renderBattle32UI();
  // await window.showBattle32CenterTextAsync('MOVE PHASE', '移動先のマスをタップしてください', 2200);
  _b32InputLocked = false;
  renderBattle32UI();
};

  // 移動可能マスをタップ
  window._b32OnMoveCellTap = async function (row, col) {
    if (_b32InputLocked) return;
    if (!_selSkillAllyUid || !window.Battle32 || !window.Battle32.moveAlly) return;

   const ok = window.Battle32.moveAlly(_selSkillAllyUid, row, col);
   if (!ok) return;

   // 移動後: SKILL PHASE 表示が消えてからスキル選択可能に
   _b32InputLocked = true;
   _moveMode = false;
   renderBattle32UI();
   // await window.showBattle32CenterTextAsync('SKILL PHASE', 'アクションを選択してください', 2200);
   _b32InputLocked = false;
   renderBattle32UI();
  };


  // ============================================================
  // スキルチップ 長押し判定
  // ============================================================
  let _skillPressTimer   = null;
  let _skillLongPressed  = false;

  window._b32SkillPressStart = function (event, allyUid, skillId) {
  if (_b32InputLocked) return;

  if (event) {
    event.preventDefault();
    event.stopPropagation();

    // pointercancel が起きにくくなる
    if (event.currentTarget && event.pointerId != null && event.currentTarget.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch (e) {}
    }
  }

  _skillLongPressed = false;
  clearTimeout(_skillPressTimer);

  _skillPressTimer = setTimeout(() => {
    _skillPressTimer = null;
    _skillLongPressed = true;
    _b32ShowSkillDetail(allyUid, skillId);
  }, 450); // 600だと長いので少し短縮
};

window._b32SkillPressEnd = function (event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (_skillPressTimer) {
    clearTimeout(_skillPressTimer);
    _skillPressTimer = null;
  }
};

window._b32OnSkillChipClick = function (event, allyUid, skillId) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (_b32InputLocked) return;

  // スキルを選んだら、ボトムUIを詳細画面へ切り替える
  _selSkillId = skillId;

  const box = document.getElementById('b32-skill-detail-box');
  if (box) {
    box.style.display = 'none';
    box.classList.remove('show');
  }

  renderBattle32UI();
};

window._b32CancelSkillDetail = function (event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (_b32InputLocked) return;

  // 詳細画面を閉じて、スキル選択画面へ戻す
  _selSkillId = null;

  const box = document.getElementById('b32-skill-detail-box');
  if (box) {
    box.style.display = 'none';
    box.classList.remove('show');
  }

  renderBattle32UI();
};

  function _b32ShowSkillDetail(allyUid, skillId) {
  const bs = _bs();
  if (!bs) return;

  const ally = bs.allies.find(u => u._uid === allyUid);
  if (!ally) return;

  const skill = ally.skills.find(s => s.id === skillId);
  if (!skill) return;

  const box  = document.getElementById('b32-skill-detail-box');
  const name = document.getElementById('b32-skill-detail-name');
  const desc = document.getElementById('b32-skill-detail-desc');
  const meta = document.getElementById('b32-skill-detail-meta');
  const btn  = document.getElementById('b32-skill-confirm-btn');

  if (!box || !name || !desc || !meta || !btn) return;

  const metaParts = [];
  if (skill.shinkiCost > 0) metaParts.push(`神気 ${skill.shinkiCost}`);
  if (skill.multiplier)     metaParts.push(`倍率 ${skill.multiplier}`);
  if (skill.range)          metaParts.push(`射程 ${skill.range}`);

  name.textContent = skill.name || 'SKILL';
  desc.textContent = skill.desc || '説明はまだありません。';
  meta.textContent = metaParts.join('　/　');

  // 決定ボタンを押した時だけ発動
  btn.onclick = function (event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    window._b32ConfirmSkill(allyUid, skillId);
  };

  box.style.display = '';
  box.classList.remove('show');
  void box.offsetWidth;
  box.classList.add('show');
}
  // スキル決定ボタン → 発動
window._b32ConfirmSkill = async function (allyUid, skillId) {
    if (_b32InputLocked) return;
    if (!window.Battle32) return;
    const bs = _bs();
    if (!bs || bs.phase !== 'skill') return;

    const allyBefore = bs.allies.find(u => u._uid === allyUid);
    const allyName   = allyBefore ? allyBefore.name : '';

    _selSkillId = skillId;

    const ok = window.Battle32.executeAllySkill(allyUid, skillId);
    if (!ok) { console.warn('[Battle32UI] executeAllySkill failed'); return; }

    _resetSkillState();
    _b32InputLocked = true;
    renderBattle32UI();

    // キャラのターン終了演出（完全に消えるまで待つ）
    await window.showBattle32CenterTextAsync('ターンを終了しました。', '', 900);

    await _afterCharTurnFlow();
  };

  // キャラ単位の行動終了（スキルなしで終了）
  window._b32EndCharTurn = async function (allyUid) {
    if (_b32InputLocked) return;
    const bs = _bs();
    if (!bs || bs.phase !== 'skill') return;
    if (!window.Battle32) return;

    const ally = bs.allies.find(u => u._uid === allyUid);
    if (!ally || ally.anima <= 0 || ally.skillUsedThisTurn) return;

    if (typeof window.Battle32.endCharTurn === 'function') {
      window.Battle32.endCharTurn(allyUid);
    }
    _resetSkillState();
    _b32InputLocked = true;
    renderBattle32UI();

    await window.showBattle32CenterTextAsync('ターンを終了しました。', '', 900);

    await _afterCharTurnFlow();
  };

  // キャラ行動後の共通フロー
  async function _afterCharTurnFlow() {
    const bsAfter = _bs();
    if (!bsAfter) { _b32InputLocked = false; return; }

    if (bsAfter.phase === 'skill') {
      const allDone = bsAfter.allies.every(u => u.anima <= 0 || u.skillUsedThisTurn);

      if (allDone) {
        // 全員終了 → endSkillPhase（この中で ALLY TURN END → ENEMY TURN のフローが走る）
        // endSkillPhase 自体は同期なので呼ぶだけでよい
        if (window.Battle32) window.Battle32.endSkillPhase();
        // ロック解除は _startAllyTurnFlow の末尾で行われる
        renderBattle32UI();
      } else {
        // まだ行動可能な味方がいる → PLAYER ACTION 表示して操作解除
        // await window.showBattle32CenterTextAsync('PLAYER ACTION', '移動するキャラを選択してください', 2200);
        _b32InputLocked = false;
        renderBattle32UI();
      }
    } else {
      _b32InputLocked = false;
      renderBattle32UI();
    }
  }

  // ============================================================
  // パーティステータスパネル描画
  // ============================================================
  function renderPartyStatus(bs) {
    const el = document.getElementById('b32-party-status');
    if (!el) return;

    el.innerHTML = bs.allies.map(ally => {
      // 正面・胸上画像を優先（盤面の後ろ姿とは別）
      const img =
        ally.panelImg ||
        ally.panel ||
        ally.battleImg ||
        ally.img ||
        ally.portrait ||
        ally.upImg ||
        '';

      // アニマ（将来的に anima に置き換え予定。現在は hp を暫定使用）
      const animaMax = ally.animaMax ?? 3;
      const anima = ally.anima ?? animaMax;

      const dead     = anima <= 0;
      const done     = !!ally.skillUsedThisTurn;
      const selected = ally._uid === _selSkillAllyUid;

      // アニマドット（最大10個まで表示、多すぎる場合は数値で補完）
      const MAX_ANIMA_DOTS = 10;
      let animaHtml;
      if (animaMax <= MAX_ANIMA_DOTS) {
        animaHtml = Array.from({ length: animaMax }, (_, i) =>
          `<span class="b32-anima-dot ${i < anima ? 'filled' : ''}"></span>`
        ).join('');
      } else {
        // ドットが多すぎる場合は数値表示にフォールバック
        animaHtml = `<span class="b32-anima-text">${anima}<span class="b32-anima-max">/${animaMax}</span></span>`;
      }

      const shinkiDots = Array.from({ length: ally.shinkiMax || 3 }, (_, i) =>
        `<span class="b32-party-shinki-dot ${i < (ally.shinki || 0) ? 'filled' : ''}"></span>`
      ).join('');

      // タップ可否：dead か done の場合は選択不可
      const tappable = !dead && !done && bs.phase === 'skill';
      const onclickAttr = tappable ? `onclick="_b32OnSkillAllyTap('${ally._uid}')"` : '';

      return `
        <div class="b32-party-card${dead ? ' dead' : ''}${done ? ' done' : ''}${selected ? ' selected' : ''}"
          ${onclickAttr}>
          <div class="b32-party-img-wrap">
            ${img
              ? `<img class="b32-party-img" src="${img}" alt="" onerror="this.style.display='none'">`
              : `<div class="b32-party-initial">${initial(ally.name)}</div>`}
          </div>
          <div class="b32-party-name">${ally.name}</div>
          <div class="b32-party-row anima">${animaHtml}</div>
          <div class="b32-party-row shinki">${shinkiDots}</div>
          ${dead ? `<div class="b32-party-return">RETURN</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // ============================================================
  // スキルパネル描画
  // ============================================================
  function renderBottomArea(bs) {
    const guideEl    = document.getElementById('b32-bottom-guide');
    const skillPanel = document.getElementById('b32-skill-panel');
    if (!skillPanel) return;

    if (bs.phase === 'skill') {
      skillPanel.style.display = '';

  if (!_selSkillAllyUid) {
  if (guideEl) guideEl.textContent = '移動するキャラを選択してください。';

  // キャラ未選択時は3人カードを表示
  const partyStatusEl = document.getElementById('b32-party-status');
  if (partyStatusEl) partyStatusEl.style.removeProperty('display');

  const charaNameEl = document.getElementById('b32-skill-chara-name');
  if (charaNameEl) charaNameEl.textContent = '';

  const listEl = document.getElementById('b32-skill-list');
  if (listEl) listEl.innerHTML = '';

} else {
  const ally = bs.allies.find(u => u._uid === _selSkillAllyUid);
  if (!ally) {
    _resetSkillState();
    renderBattle32UI();
    return;
  }

  // キャラ選択後は3人分のキャラカードを消す
  const partyStatusEl = document.getElementById('b32-party-status');
  if (partyStatusEl) partyStatusEl.style.setProperty('display', 'none', 'important');

  if (guideEl) guideEl.textContent = _moveMode
    ? '移動先のマスをタップしてください。'
    : 'アクションを選択してください。';

  // 選択キャラ名の見出しは不要
  const charaNameEl = document.getElementById('b32-skill-chara-name');
  if (charaNameEl) charaNameEl.textContent = '';

  const listEl = document.getElementById('b32-skill-list');
  if (!listEl) return;

  // ULT / 終了の丸ボタン
  const ultSkill = ally.skills.find(skill => skill.isUltimate);
  let floatingButtonsHtml = '';

  let ultBtn = '';
  if (ultSkill) {
    const shinki = ultSkill.shinkiCost || 0;
    const cantUlt = ally.skillUsedThisTurn || (shinki > ally.shinki);

    ultBtn = `
      <button type="button"
        class="b32-float-action-btn ult${cantUlt ? ' disabled' : ''}"
        ${cantUlt ? 'disabled' : ''}
        onclick="_b32OnSkillChipClick(event,'${ally._uid}','${ultSkill.id}')">
        ULT
      </button>
    `;
  } else {
    ultBtn = `
      <button type="button" class="b32-float-action-btn ult disabled" disabled>
        ULT
      </button>
    `;
  }

const endBtn = ally.skillUsedThisTurn
  ? `
    <button type="button" class="b32-float-action-btn end disabled" disabled>
      終了
    </button>
  `
  : `
    <button type="button"
      class="b32-float-action-btn end"
      onclick="_b32EndCharTurn('${ally._uid}')">
      終了
    </button>
  `;

floatingButtonsHtml = `
  <div class="b32-floating-actions">
    ${ultBtn}
    ${endBtn}
  </div>
`;

      // ── 移動後ボトムUI ──
// 通常時： [行動キャラ画像][スキル1][スキル2][スキル3]
// 詳細時： [スキル説明][決定][キャンセル]

// 選択中スキルがある場合は、詳細画面へ切り替え
if (_selSkillId) {
  const selectedSkill = ally.skills.find(s => s.id === _selSkillId);

  if (!selectedSkill) {
    _selSkillId = null;
    renderBattle32UI();
    return;
  }

  const metaParts = [];
  if ((selectedSkill.shinkiCost || 0) > 0) metaParts.push(`神気 ${selectedSkill.shinkiCost}`);
  if (selectedSkill.multiplier) metaParts.push(`倍率 ${selectedSkill.multiplier}`);
  if (selectedSkill.range) metaParts.push(`射程 ${selectedSkill.range}`);

  listEl.innerHTML = `
  ${floatingButtonsHtml}

  <div class="b32-action-detail-panel">
    <div class="b32-action-detail-title">${selectedSkill.name || 'SKILL'}</div>
    <div class="b32-action-detail-desc">${selectedSkill.desc || '説明はまだありません。'}</div>
    <div class="b32-action-detail-meta">${metaParts.join('　/　')}</div>

    <div class="b32-action-detail-buttons">
      <button type="button"
        class="b32-action-detail-btn confirm"
        onclick="_b32ConfirmSkill('${ally._uid}','${selectedSkill.id}')">
        決定
      </button>

      <button type="button"
        class="b32-action-detail-btn cancel"
        onclick="_b32CancelSkillDetail(event)">
        キャンセル
      </button>
    </div>
  </div>
`;
  return;
}

// 通常スキル選択画面
const normalSkillChips = [];

ally.skills
  .filter(skill => !skill.isUltimate)
  .slice(0, 3)
  .forEach(skill => {
    const shinki = skill.shinkiCost || 0;
    const cantUse = ally.skillUsedThisTurn || (shinki > ally.shinki);
    const disabledCls = cantUse ? ' disabled' : '';

    normalSkillChips.push(
      `<button type="button"
        class="b32-bottom-skill-btn${disabledCls}"
        ${cantUse ? 'disabled' : ''}
        onclick="_b32OnSkillChipClick(event,'${ally._uid}','${skill.id}')">
        ${skill.name}
      </button>`
    );
  });

// 3つ未満でもレイアウトが崩れないように空ボタンを補完
while (normalSkillChips.length < 3) {
  normalSkillChips.push(`<button type="button" class="b32-bottom-skill-btn disabled" disabled>—</button>`);
}

const img =
  ally.panelImg ||
  ally.panel ||
  ally.battleImg ||
  ally.img ||
  ally.portrait ||
  ally.upImg ||
  '';

const animaMax = ally.animaMax ?? 3;
const anima = ally.anima ?? animaMax;

const animaHtml = Array.from({ length: animaMax }, (_, i) =>
  `<span class="b32-anima-dot ${i < anima ? 'filled' : ''}"></span>`
).join('');

const shinkiHtml = Array.from({ length: ally.shinkiMax || 3 }, (_, i) =>
  `<span class="b32-party-shinki-dot ${i < (ally.shinki || 0) ? 'filled' : ''}"></span>`
).join('');

listEl.innerHTML = `
  ${floatingButtonsHtml}

  <div class="b32-action-skill-panel">
    <div class="b32-action-char-card">
      <div class="b32-action-char-img-wrap">
        ${img
          ? `<img class="b32-action-char-img" src="${img}" alt="" onerror="this.style.display='none'">`
          : `<div class="b32-party-initial">${initial(ally.name)}</div>`}
      </div>
      <div class="b32-action-char-dots anima">${animaHtml}</div>
      <div class="b32-action-char-dots shinki">${shinkiHtml}</div>
    </div>

    <div class="b32-action-skill-buttons">
      ${normalSkillChips.join('')}
    </div>
  </div>
`;
      }

    } else if (bs.phase === 'enemy') {
  skillPanel.style.display = 'none';
  if (guideEl) guideEl.textContent = '敵の行動中です。';
} else {
  skillPanel.style.display = 'none';
  if (guideEl) guideEl.textContent = '';
}
  }

  // ============================================================
  // ヒントバー
  // ============================================================
  function renderHintBar(bs) {
    const bar = document.getElementById('b32-hint-bar');
    if (!bar) return;

    bar.className = 'b32-hint-bar';

    if (bs.phase === 'skill' && _selSkillAllyUid) {
      const ally = bs.allies.find(u => u._uid === _selSkillAllyUid);
      bar.textContent = ally ? `${ally.name} のスキルを選択` : '';
      bar.className = 'skill-hint';
    } else {
      bar.textContent = '';
      bar.className   = '';
    }
  }

  // ============================================================
  // ヘッダー・ボタン
  // ============================================================
  function renderHeader(bs) {
    const turnNum   = document.getElementById('b32-turn-num');
    const phaseBadge= document.getElementById('b32-phase-badge');
    const stageId   = document.getElementById('b32-stage-id');
    if (turnNum)    turnNum.textContent   = bs.turn;
    if (stageId)    stageId.textContent   = bs.stageId || '—';
    if (phaseBadge) {
      const label = PHASE_LABEL[bs.phase] || bs.phase;
      const color = PHASE_COLOR[bs.phase] || '#aaa';
      phaseBadge.textContent     = label;
      phaseBadge.style.color       = color;
      phaseBadge.style.borderColor = color + '66';
      phaseBadge.style.background  = color + '18';
    }
  }

  function renderCoreStatus(bs) {
  const subEl = document.getElementById('b32-bottom-sub');
  if (!subEl || !bs.cores) return;

  // 味方操作中・敵ターン中は、操作案内テキストを優先する
  if (bs.phase === 'skill' || bs.phase === 'enemy') return;

  const ally = bs.cores.ally;
  const bc   = bs.bossCore;

  let bossCoreText;
  if (!bc) {
    bossCoreText = '—';
  } else if (bc.captured) {
    bossCoreText = '固定済';
  } else if (bc.exposed) {
    bossCoreText = `露出 ${bc.capture}/${bc.captureMax}`;
  } else {
    bossCoreText = '未露出';
  }

  subEl.textContent =
    `自コア ${ally.stability}/${ally.stabilityMax}　神性核 ${bossCoreText}　残TURN ${Math.max(0, bs.turnLimit - bs.turn + 1)}`;
}

  function renderBossHp(bs) {
    const box    = document.getElementById('b32-boss-hp-ui');
    const nameEl = document.getElementById('b32-boss-hp-name');
    const barEl  = document.getElementById('b32-boss-hp-bar');
    const textEl = document.getElementById('b32-boss-hp-text');

    if (!box || !nameEl || !barEl || !textEl) return;

    // ボスは HP0 後も核露出状態で表示する
    const boss = (bs.enemies || []).find(e => e.isBoss);
    const bossExposed = bs.bossCore?.exposed;

    if (!boss || (!bossExposed && boss.hp <= 0)) {
      box.style.display = 'none';
      return;
    }

    const hpMax = boss.hpMax || boss.hp || 1;
    const hpPct = Math.max(0, Math.min(100, Math.round((boss.hp / hpMax) * 100)));

    box.style.display  = 'block';
    // 核露出後は名前に状態を付加
    if (bossExposed) {
      const bc = bs.bossCore;
      nameEl.textContent = `${boss.name || 'BOSS'} ▸ 神性核露出`;
      textEl.textContent  = `干渉 ${bc.capture}/${bc.captureMax}`;
    } else {
      nameEl.textContent = boss.name || 'BOSS';
      textEl.textContent = `${boss.hp} / ${hpMax}`;
    }
    barEl.style.width = hpPct + '%';
  }

  function renderButtons(bs) {
    const btnEndSkill = document.getElementById('b32-btn-end-skill');
    const btnCancel   = document.getElementById('b32-btn-cancel');

    if (btnEndSkill) {
  btnEndSkill.style.display = bs.phase === 'skill' ? '' : 'none';
  // スキルフェーズ中は常に押せる（移動後にスキルを強制しない）
  btnEndSkill.disabled = bs.phase !== 'skill';
}
    if (btnCancel) {
  // キャラ選択中（移動前・移動後どちらでも）は選択解除ボタンを表示
  btnCancel.style.display = _selSkillAllyUid ? '' : 'none';
}
  }

  // ============================================================
  // ログ
  // ============================================================
  function renderLog(bs) {
    const logEl = document.getElementById('b32-log');
    if (!logEl || !bs.log) return;
    const lines = [...bs.log].reverse().slice(0, 30);
    logEl.innerHTML = lines.map(l => `<span class="log-line">${l}</span>`).join('');
  }

  // ============================================================
  // 結果オーバーレイ
  // ============================================================
  function renderResult(bs) {
    const overlay = document.getElementById('b32-result-overlay');
    const text    = document.getElementById('b32-result-text');
    if (!overlay || !text) return;
    if (bs.result === 'win') {
      text.textContent = 'VICTORY'; text.className = 'win';
      overlay.style.display = 'flex';
    } else if (bs.result === 'lose') {
      text.textContent = 'DEFEAT'; text.className = 'lose';
      overlay.style.display = 'flex';
    } else {
      overlay.style.display = 'none';
    }
  }

  // ============================================================
  // 公開: renderBattle32UI()
  // ============================================================
  window.renderBattle32UI = function () {
    const bs = _bs();
    if (!bs) {
      console.warn('[Battle32UI] Battle32.getState() が null。Battle32.start() を先に呼んでください。');
      return;
    }

    buildRoot();
    document.getElementById(ROOT_ID).style.display = 'flex';

    renderHeader(bs);
    renderHintBar(bs);
    renderBossHp(bs);
    renderBoard(bs);
    renderPartyStatus(bs);
    renderLog(bs);
    renderBottomArea(bs);
    // renderCoreStatus(bs);
    renderButtons(bs);
    renderResult(bs);

    requestAnimationFrame(fitBattle32Layout);
  };

  // ============================================================
  // セルサイズ自動調整
  // ============================================================
  function fitBattle32Layout() {
  const root    = document.getElementById(ROOT_ID);
  const header  = document.getElementById('b32-header');
  const hint    = document.getElementById('b32-hint-bar');
  const actions = document.getElementById('b32-actions'); // 消していてもOKにする
  const bottom  = document.getElementById('b32-bottom-area');
  const bossHp  = document.getElementById('b32-boss-hp-ui');

  if (!root || !header || !bottom) return;

  const rootH = root.clientHeight;
  const rootW = root.clientWidth;

  const hintVisible = hint && getComputedStyle(hint).display !== 'none';
  const hintH = hintVisible ? hint.offsetHeight : 0;

  const bossHpVisible = bossHp && getComputedStyle(bossHp).display !== 'none';
  const bossHpH = bossHpVisible ? bossHp.offsetHeight : 0;

  const actionsVisible = actions && getComputedStyle(actions).display !== 'none';
  const actionsH = actionsVisible ? actions.offsetHeight : 0;

  const reservedH =
    header.offsetHeight +
    hintH +
    bossHpH +
    actionsH +
    bottom.offsetHeight +
    20;

  const boardAvailW = Math.max(240, rootW - 24);
  const boardAvailH = Math.max(200, rootH - reservedH);

  const gap = 3;
  const cellByW = Math.floor((boardAvailW - gap * 4) / 5);
  const cellByH = Math.floor((boardAvailH - gap * 7) / 8);

  const cellSize = Math.max(28, Math.min(72, cellByW, cellByH));
  root.style.setProperty('--cell-size', `${cellSize}px`);
}

  window.addEventListener('resize', () => {
    requestAnimationFrame(fitBattle32Layout);
  });

  // ============================================================
  // 公開: closeBattle32UI()
  // ============================================================
  window.closeBattle32UI = function () {
    _resetSkillState();
    const root = document.getElementById(ROOT_ID);
    if (root) root.style.display = 'none';

    const nav = document.getElementById('bottom-nav-shared');
    if (nav) nav.style.display = '';
    const guf = document.getElementById('global-user-frame');
    if (guf) guf.style.display = '';
    const explore = document.getElementById('explore-root') || document.getElementById('explore-screen');
    if (explore) explore.style.display = '';
  };

  // ============================================================
  // Battle32.start() フック
  // ============================================================
  function _hideAllScreens() {
    ['stage-select-modal','party-select-modal','enemy-intro-root','battle-root'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const nav = document.getElementById('bottom-nav-shared');
    if (nav) nav.style.display = 'none';
    const guf = document.getElementById('global-user-frame');
    if (guf) guf.style.display = 'none';
  }

  function hookBattle32Start() {
    if (!window.Battle32) {
      setTimeout(hookBattle32Start, 50);
      return;
    }

    if (window.Battle32._uiHooked) return;

    const originalStart = window.Battle32.start;
    window.Battle32.start = function (config, callbacks) {
      _resetSkillState();
      _hideAllScreens();
      originalStart.call(window.Battle32, config, callbacks);
      window.renderBattle32UI();
    };

    window.Battle32._uiHooked = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookBattle32Start);
  } else {
    hookBattle32Start();
  }

})();
