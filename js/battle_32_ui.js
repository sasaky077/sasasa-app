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
  let _selMoveAllyUid  = null; // 移動対象キャラ（移動先選択中）
  let _moveMode        = false; // 移動先マス選択中フラグ
  let _selSkillAllyUid = null; // スキル使用キャラ（移動後に改めて選択）
  let _selSkillId      = null; // 選択中のスキルID

  function _resetSkillState() {
    _selMoveAllyUid  = null;
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

  // cellType 付き Map を返す: key = "row-col", value = cellType
  function _skillRangeCells(allyUid, skillId) {
    if (!window.Battle32 || !window.Battle32.getSkillRangeCells) return new Map();
    const cells = window.Battle32.getSkillRangeCells(allyUid, skillId);
    const map = new Map();
    cells.forEach(c => map.set(`${c.row}-${c.col}`, c.cellType || 'range'));
    return map;
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

        /* 初期状態：非表示 */
        opacity: 0;
        transform: translate3d(0, 8px, 0) scale(.995);
        filter: blur(2px);

        /* transition ベース：スマホでも滑らか */
        transition:
          opacity 900ms ease,
          transform 900ms cubic-bezier(.16, 1, .3, 1),
          filter 900ms ease;

        will-change: opacity, transform, filter;
        backface-visibility: hidden;
        transform-style: preserve-3d;
      }

      /* ── 表示状態 ── */
      #b32-center-text.b32ct-visible {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
        filter: blur(0);
      }

      /* ── 退場状態：上方向へ抜ける ── */
      #b32-center-text.b32ct-hidden {
        opacity: 0;
        transform: translate3d(0, -6px, 0) scale(1);
        filter: blur(2px);
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

/* ── スキル名カットイン：フレームなし・左文字・右キャラ ── */
.b32-skill-name-burst {
  position: fixed;
  left: 50%;
  top: 42%;
  z-index: 999999;
  pointer-events: none;
  transform: translate(-50%, -50%);
  width: min(92vw, 560px);
  height: 180px;

  /* フレーム感を消す */
  background: none;
  border: none;
  box-shadow: none;
  border-radius: 0;

  overflow: visible;
  animation: b32SkillNameBurst 1500ms ease-out forwards;
}

.b32-skill-burst-img {
  position: absolute;
  right: -2px;
  bottom: -22px;
  height: 255px;
  max-width: 68%;
  object-fit: contain;

  opacity: .72;
  filter:
    brightness(1.12)
    contrast(1.18)
    saturate(1.08)
    drop-shadow(0 0 8px rgba(255,230,170,.28))
    drop-shadow(0 0 18px rgba(255,150,40,.14));

  /* 追加：下端だけ自然に透明へ */
  -webkit-mask-image: linear-gradient(
    to bottom,
    #000 0%,
    #000 70%,
    rgba(0,0,0,.65) 84%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    #000 0%,
    #000 70%,
    rgba(0,0,0,.65) 84%,
    transparent 100%
  );

  transform: translateX(12px) scale(1.08);
  transform-origin: center bottom;
  animation: b32SkillBurstImg 1500ms ease-out forwards;
}

.b32-skill-burst-name {
  position: absolute;
  left: 0;
  top: 50%;
  width: 44%;
  z-index: 2;
  transform: translateY(-50%);

  padding: 0;
  background: none;
  border: none;
  border-radius: 0;

  font-family: 'Noto Serif JP', serif;
  font-size: clamp(20px, 5.4vw, 34px);
  font-weight: 700;
  letter-spacing: 4px;
  line-height: 1.2;
  color: #fff4c8;
  text-align: center;
  white-space: nowrap;

  text-shadow:
    0 0 8px rgba(255,245,200,.95),
    0 0 22px rgba(255,190,70,.72),
    0 0 44px rgba(255,140,40,.28),
    0 2px 4px rgba(0,0,0,.95);
}

@keyframes b32SkillNameBurst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(.86);
    filter: blur(3px);
  }
  18% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.02);
    filter: blur(0);
  }
  72% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -52%) scale(1.01);
    filter: blur(1px);
  }
}

@keyframes b32SkillBurstImg {
  0% {
    opacity: 0;
    transform: translateX(34px) scale(.98);
    filter:
      blur(4px)
      brightness(1.05)
      contrast(1.05)
      drop-shadow(0 0 10px rgba(255,230,170,.12));
  }
  18% {
    opacity: .76;
    transform: translateX(0) scale(1.08);
    filter:
      blur(0)
      brightness(1.12)
      contrast(1.18)
      saturate(1.08)
      drop-shadow(0 0 12px rgba(255,230,170,.30))
      drop-shadow(0 0 20px rgba(255,150,40,.14));
  }
  72% {
    opacity: .68;
    transform: translateX(0) scale(1.09);
    filter:
      blur(0)
      brightness(1.10)
      contrast(1.16)
      saturate(1.06)
      drop-shadow(0 0 10px rgba(255,230,170,.26));
  }
  100% {
    opacity: 0;
    transform: translateX(-8px) scale(1.12);
    filter:
      blur(2px)
      brightness(1.05)
      contrast(1.08)
      drop-shadow(0 0 18px rgba(255,150,40,.12));
  }
}

/* ── ULT専用カットイン ── */
.b32-ult-cutin {
  position: fixed;
  inset: 0;
  z-index: 1000000;
  pointer-events: none;
  overflow: hidden;
  background:
    radial-gradient(circle at 70% 45%, rgba(255,230,170,.20), transparent 34%),
    linear-gradient(180deg, rgba(0,0,0,.88), rgba(4,6,14,.72), rgba(0,0,0,.90));
  animation: b32UltCutinWrap 1900ms ease-out forwards;
}

.b32-ult-cutin-img {
  position: absolute;
  left: 50%;
  top: 46%;

  width: 100vw;
  min-width: 100vw;
  height: auto;
  max-width: none;

  object-fit: fill; /* 実質効かないが置いてもOK */
  transform: translate(-50%, -50%);

  opacity: .98;
  filter:
    brightness(1.08)
    contrast(1.16)
    saturate(1.06)
    drop-shadow(0 0 22px rgba(255,230,170,.28));

  animation: b32UltCutinImgSlide 1700ms cubic-bezier(.18,.82,.22,1) forwards;
}

.b32-ult-cutin-shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(0,0,0,.72) 0%, rgba(0,0,0,.24) 36%, rgba(0,0,0,.10) 70%, rgba(0,0,0,.62) 100%),
    linear-gradient(180deg, rgba(0,0,0,.40) 0%, transparent 42%, rgba(0,0,0,.70) 100%);
}

.b32-ult-cutin-label {
  position: absolute;
  left: 22px;
  bottom: 82px;
  font-family: 'Cinzel', serif;
  font-size: 11px;
  letter-spacing: 5px;
  color: rgba(255,220,150,.88);
  text-shadow:
    0 0 10px rgba(255,210,120,.7),
    0 2px 4px rgba(0,0,0,1);
  animation: b32UltTextIn 1900ms ease-out forwards;
}

.b32-ult-cutin-name {
  position: absolute;
  left: 22px;
  bottom: 42px;
  max-width: 88vw;
  font-family: 'Noto Serif JP', serif;
  font-size: clamp(28px, 9vw, 52px);
  font-weight: 800;
  letter-spacing: 6px;
  line-height: 1;
  color: #fff4c8;
  text-shadow:
    0 0 8px rgba(255,255,255,.92),
    0 0 28px rgba(255,190,70,.82),
    0 0 60px rgba(255,120,40,.44),
    0 3px 6px rgba(0,0,0,1);
  animation: b32UltTextIn 1900ms ease-out forwards;
}

.b32-ult-cutin-line {
  position: absolute;
  left: -20%;
  top: 50%;
  width: 140%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,245,210,.95), transparent);
  box-shadow:
    0 0 14px rgba(255,230,170,.9),
    0 0 34px rgba(255,160,70,.5);
  transform: rotate(-8deg);
  opacity: 0;
  animation: b32UltLine 1900ms ease-out forwards;
}

.b32-ult-white-flash {
  position: fixed;
  inset: 0;
  z-index: 1000001;
  pointer-events: none;
  background: white;
  opacity: 0;
  animation: b32UltWhiteFlash 1900ms ease-out forwards;
}

@keyframes b32UltCutinWrap {
  0%   { opacity: 0; }
  10%  { opacity: 1; }
  82%  { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes b32UltCutinImg {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.16);
    filter: blur(5px) brightness(1.05) contrast(1.05);
  }
  14% {
    opacity: .98;
    transform: translate(-50%, -50%) scale(1.08);
    filter: blur(0) brightness(1.12) contrast(1.18) saturate(1.08);
  }
  78% {
    opacity: .98;
    transform: translate(-50%, -50%) scale(1.02);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.00);
    filter: blur(2px) brightness(1.04) contrast(1.08);
  }
}

/* 左から入り・中央で静止・左へ抜けるスライド演出 */
@keyframes b32UltCutinImgSlide {
  0% {
    opacity: 0;
    transform: translate(-70%, -50%);
    filter: blur(4px) brightness(1.02);
  }
  14% {
    opacity: .98;
    transform: translate(-50%, -50%);
    filter: blur(0) brightness(1.08) contrast(1.16) saturate(1.06);
  }
  76% {
    opacity: .98;
    transform: translate(-50%, -50%);
    filter: blur(0) brightness(1.08) contrast(1.14);
  }
  100% {
    opacity: 0;
    transform: translate(-68%, -50%);
    filter: blur(3px) brightness(1.04);
  }
}

@keyframes b32UltTextIn {
  0% {
    opacity: 0;
    transform: translateX(-20px);
    filter: blur(3px);
  }
  16% {
    opacity: 1;
    transform: translateX(0);
    filter: blur(0);
  }
  78% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(10px);
    filter: blur(1px);
  }
}

@keyframes b32UltLine {
  0% {
    opacity: 0;
    transform: translateX(-20%) rotate(-8deg) scaleX(.3);
  }
  20% {
    opacity: .95;
    transform: translateX(0) rotate(-8deg) scaleX(1);
  }
  46% {
    opacity: .25;
  }
  100% {
    opacity: 0;
    transform: translateX(12%) rotate(-8deg) scaleX(1.1);
  }
}

@keyframes b32UltWhiteFlash {
  0%, 70% {
    opacity: 0;
  }
  76% {
    opacity: .72;
  }
  86% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

/* ── ULTカットイン強化：ULTIMATE ラベル ── */
.b32-ult-cutin-label {
  font-size: 12px !important;
  letter-spacing: 7px !important;
  color: rgba(255,235,170,.98) !important;
  text-shadow:
    0 0 6px rgba(255,255,255,.9),
    0 0 18px rgba(255,220,120,.95),
    0 0 40px rgba(255,170,60,.70),
    0 2px 4px rgba(0,0,0,1) !important;
}

/* ── ULTカットイン強化：技名 ── */
.b32-ult-cutin-name {
  text-shadow:
    0 0 10px rgba(255,255,255,.98),
    0 0 32px rgba(255,200,80,.95),
    0 0 72px rgba(255,130,40,.60),
    0 0 120px rgba(255,80,20,.25),
    0 3px 8px rgba(0,0,0,1) !important;
}

/* ── ULT専用：強い画面揺れ ── */
.b32-screen-shake-ult {
  animation: b32ScreenShakeUlt 380ms ease-out;
}

@keyframes b32ScreenShakeUlt {
  0%   { transform: translate(0, 0); }
  14%  { transform: translate(-4px, 2px); }
  28%  { transform: translate(5px, -2px); }
  42%  { transform: translate(-4px, 2px); }
  56%  { transform: translate(3px, -1px); }
  72%  { transform: translate(-2px, 1px); }
  86%  { transform: translate(1px, 0); }
  100% { transform: translate(0, 0); }
}

/* ── hitStyle: heavy 用：強い画面揺れ ── */
.b32-screen-shake-heavy {
  animation: b32ScreenShakeHeavy 340ms ease-out;
}

@keyframes b32ScreenShakeHeavy {
  0%   { transform: translate(0, 0); }
  16%  { transform: translate(-4px, 2px); }
  32%  { transform: translate(5px, -2px); }
  52%  { transform: translate(-3px, 1px); }
  72%  { transform: translate(2px, -1px); }
  100% { transform: translate(0, 0); }
}

/* ── ULT ダメージ数値：大きめ ── */
.b32-float-number.damage.ult {
  font-size: 26px !important;
  color: #ffcc44 !important;
  text-shadow:
    0 0 10px rgba(255,200,60,.95),
    0 0 24px rgba(255,140,40,.80),
    0 1px 4px rgba(0,0,0,.95) !important;
}

/* ── ULT ヒールナンバー：大きめ ── */
.b32-float-number.heal.ult {
  font-size: 24px !important;
  color: #80ffcc !important;
  text-shadow:
    0 0 10px rgba(60,255,180,.9),
    0 1px 4px rgba(0,0,0,.95) !important;
}

/* ── hitStyle: rapid — 小さめスラッシュ ── */
.b32-hit-slash.rapid {
  width: 38px !important;
  height: 4px !important;
  opacity: .75;
}

/* ── hitStyle: heavy — 大きめスラッシュ ── */
.b32-hit-slash.heavy {
  width: 80px !important;
  height: 9px !important;
  box-shadow:
    0 0 14px rgba(255, 90, 70, .95),
    0 0 28px rgba(255, 90, 70, .50) !important;
}

/* ── ULT スラッシュ ── */
.b32-hit-slash.ult {
  width: 90px !important;
  height: 10px !important;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255,255,255,1),
    rgba(255,210,80,.95),
    transparent
  ) !important;
  box-shadow:
    0 0 16px rgba(255, 200, 60, .95),
    0 0 34px rgba(255, 140, 40, .55) !important;
  animation: b32HitSlashUlt 300ms ease-out forwards !important;
}

/* ULT + multi は一番派手 */
.b32-hit-slash.ult.multi {
  width: 100px !important;
  height: 12px !important;
}

@keyframes b32HitSlashUlt {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(-28deg) scaleX(.25);
    filter: blur(2px);
  }
  20% {
    opacity: 1;
    filter: blur(0);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(-28deg) scaleX(1.35);
    filter: blur(1px);
  }
}

/* ── 画面全体の軽いヒット揺れ ── */
.b32-screen-shake {
  animation: b32ScreenShake 260ms ease-out;
}

@keyframes b32ScreenShake {
  0%   { transform: translate(0, 0); }
  20%  { transform: translate(-2px, 1px); }
  40%  { transform: translate(3px, -1px); }
  60%  { transform: translate(-2px, 1px); }
  80%  { transform: translate(1px, 0); }
  100% { transform: translate(0, 0); }
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

      /* ── スキル対象ハイライト：敵（赤橙） ── */
      .b32-cell.skill-target-enemy {
        background:
          linear-gradient(145deg, rgba(255,100,60,.22), rgba(40,8,4,.34)),
          rgba(18,6,4,.52) !important;
        border-color: rgba(255,130,70,.70) !important;
        box-shadow:
          inset 0 0 14px rgba(255,100,50,.24),
          0 0 16px rgba(255,100,50,.28) !important;
      }

      /* ── スキル対象ハイライト：味方（青緑） ── */
      .b32-cell.skill-target-ally {
        background:
          linear-gradient(145deg, rgba(60,220,170,.20), rgba(4,22,16,.30)),
          rgba(4,12,10,.50) !important;
        border-color: rgba(70,230,180,.65) !important;
        box-shadow:
          inset 0 0 14px rgba(60,220,170,.20),
          0 0 16px rgba(60,220,170,.24) !important;
      }

      /* ── パーティパネル HP バー ── */
      .b32-party-hp-bar-wrap {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(0,0,0,.45);
        overflow: hidden;
        margin: 3px 0 1px;
      }
      .b32-party-hp-bar {
        height: 100%;
        border-radius: 2px;
        transition: width .25s ease;
      }
      .b32-party-hp-text {
        font-family: 'Cinzel', serif;
        font-size: 9px;
        letter-spacing: .5px;
        color: rgba(232,228,220,.65);
        text-align: center;
        line-height: 1.2;
      }
      .b32-party-hp-max {
        font-size: 8px;
        color: rgba(232,228,220,.35);
      }

      /* ── ダメージ・回復 フロートナンバー ── */
      .b32-float-number {
        position: fixed;
        z-index: 999999;
        pointer-events: none;
        font-family: 'Cinzel', serif;
        font-weight: 700;
        font-size: 18px;
        letter-spacing: 1px;
        transform: translate(-50%, 0);
        white-space: nowrap;
        animation: b32FloatUp 950ms ease-out forwards;
      }
      .b32-float-number.damage {
        color: #ff6060;
        text-shadow: 0 0 8px rgba(255,60,60,.8), 0 1px 3px rgba(0,0,0,.9);
      }
      .b32-float-number.damage.boss {
        font-size: 22px;
        color: #ff9020;
        text-shadow: 0 0 12px rgba(255,140,40,.9), 0 1px 4px rgba(0,0,0,.9);
      }
      .b32-float-number.heal {
        color: #50e8a0;
        text-shadow: 0 0 8px rgba(60,220,140,.8), 0 1px 3px rgba(0,0,0,.9);
      }
      @keyframes b32FloatUp {
        0%   { opacity: 0;   transform: translate(-50%, 6px)  scale(.8);  }
        18%  { opacity: 1;   transform: translate(-50%, 0px)  scale(1.2); }
        55%  { opacity: 1;   transform: translate(-50%, -10px) scale(1.0); }
        100% { opacity: 0;   transform: translate(-50%, -30px) scale(.9);  }
      }

      /* ── 衝撃波リング ── */
.b32-impact-ring {
  position: fixed;
  z-index: 999998;
  pointer-events: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
}

.b32-impact-ring.damage {
  border: 2px solid rgba(255, 230, 220, .95);
  box-shadow:
    0 0 10px rgba(255, 80, 60, .75),
    inset 0 0 8px rgba(255, 80, 60, .45);
  animation: b32ImpactRingDamage 420ms ease-out forwards;
}

.b32-impact-ring.heal {
  border: 2px solid rgba(180, 255, 220, .85);
  box-shadow:
    0 0 10px rgba(60, 220, 140, .65),
    inset 0 0 8px rgba(60, 220, 140, .35);
  animation: b32ImpactRingHeal 520ms ease-out forwards;
}

@keyframes b32ImpactRingDamage {
  0% {
    opacity: 0;
    width: 10px;
    height: 10px;
    filter: blur(0);
  }
  18% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    width: 76px;
    height: 76px;
    filter: blur(1px);
  }
}

@keyframes b32ImpactRingHeal {
  0% {
    opacity: 0;
    width: 12px;
    height: 12px;
    filter: blur(0);
  }
  20% {
    opacity: .9;
  }
  100% {
    opacity: 0;
    width: 64px;
    height: 64px;
    filter: blur(2px);
  }
}

/* ── 斜めヒットスラッシュ ── */
.b32-hit-slash {
  position: fixed;
  z-index: 999999;
  pointer-events: none;
  width: 56px;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255,255,255,.95),
    rgba(255,80,60,.9),
    transparent
  );
  transform: translate(-50%, -50%) rotate(-28deg);
  box-shadow:
    0 0 8px rgba(255, 90, 70, .85),
    0 0 16px rgba(255, 90, 70, .35);
  animation: b32HitSlash 260ms ease-out forwards;
}

@keyframes b32HitSlash {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(-28deg) scaleX(.35);
  }
  25% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(-28deg) scaleX(1.25);
  }
}

/* ── 打撃揺れ ── */
.b32-impact-shake {
  animation: b32ImpactShake 260ms ease-out;
}

@keyframes b32ImpactShake {
  0%   { transform: translateX(0); }
  18%  { transform: translateX(-3px); }
  36%  { transform: translateX(4px); }
  54%  { transform: translateX(-2px); }
  72%  { transform: translateX(2px); }
  100% { transform: translateX(0); }
}

      /* ── ヒットフラッシュ（セル or カードに一時追加） ── */
      .b32-hit-flash-damage {
        outline: 2px solid rgba(255,80,60,.85) !important;
        box-shadow: inset 0 0 18px rgba(255,60,40,.45), 0 0 20px rgba(255,60,40,.35) !important;
        transition: none !important;
      }
      .b32-hit-flash-heal {
        outline: 2px solid rgba(60,220,140,.75) !important;
        box-shadow: inset 0 0 18px rgba(60,220,140,.35), 0 0 16px rgba(60,220,140,.28) !important;
        transition: none !important;
      }

      /* ── 神気バッジ：カード右上に絶対配置 ── */
      .b32-party-shinki-badge {
        position: absolute;
        top: 4px;
        right: 4px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        align-items: center;
        z-index: 2;
      }

      /* .b32-party-row.shinki は非表示（.b32-party-shinki-badge に移行） */
      .b32-party-row.shinki {
        display: none;
      }

      /* ── HP セクション：カード最下部 ── */
      .b32-party-hp-section {
        width: 100%;
        margin-top: 3px;
      }

      /* ── 自陣コア画像 ── */
.b32-core-object {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotateX(-50deg);
  transform-origin: center center;
  pointer-events: none;
}

.b32-core-img {
  width: 115%;
  height: 115%;
  object-fit: contain;
  filter:
    drop-shadow(0 0 6px rgba(80, 240, 255, .75))
    drop-shadow(0 0 12px rgba(80, 220, 255, .35));
}

.b32-core-object.stability-2 .b32-core-img {
  filter:
    drop-shadow(0 0 6px rgba(255, 220, 80, .8))
    drop-shadow(0 0 14px rgba(255, 180, 40, .45));
}

.b32-core-object.stability-1 .b32-core-img {
  filter:
    drop-shadow(0 0 7px rgba(255, 60, 60, .9))
    drop-shadow(0 0 16px rgba(255, 40, 40, .55));
}

/* ── コア被弾：時空歪みレベルの大揺れ ── */
.b32-screen-shake-core {
  animation: b32ScreenShakeCore 720ms cubic-bezier(.2,.9,.25,1);
}

@keyframes b32ScreenShakeCore {
  0%   { transform: translate(0, 0) rotate(0deg); filter: none; }
  8%   { transform: translate(-8px, 5px) rotate(-0.4deg); filter: contrast(1.15); }
  16%  { transform: translate(10px, -6px) rotate(0.5deg); }
  25%  { transform: translate(-12px, 4px) rotate(-0.6deg); }
  35%  { transform: translate(9px, 6px) rotate(0.4deg); }
  48%  { transform: translate(-7px, -5px) rotate(-0.3deg); }
  62%  { transform: translate(5px, 3px) rotate(0.2deg); }
  78%  { transform: translate(-3px, 1px) rotate(-0.1deg); }
  100% { transform: translate(0, 0) rotate(0deg); filter: none; }
}

/* コア被弾時の赤い画面フラッシュ */
.b32-core-damage-flash {
  position: fixed;
  inset: 0;
  z-index: 1000002;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 62%, rgba(255,40,40,.34), transparent 36%),
    linear-gradient(180deg, rgba(70,0,0,.26), rgba(0,0,0,0), rgba(90,0,0,.30));
  animation: b32CoreDamageFlash 720ms ease-out forwards;
}

@keyframes b32CoreDamageFlash {
  0%   { opacity: 0; }
  12%  { opacity: 1; }
  36%  { opacity: .55; }
  100% { opacity: 0; }
}

/* コア被弾の大きい歪みリング */
.b32-core-distort-ring {
  position: fixed;
  z-index: 1000001;
  pointer-events: none;
  left: 50%;
  top: 62%;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid rgba(255,80,80,.95);
  box-shadow:
    0 0 18px rgba(255,40,40,.95),
    0 0 48px rgba(255,0,0,.55),
    inset 0 0 18px rgba(255,80,80,.45);
  animation: b32CoreDistortRing 780ms ease-out forwards;
}

@keyframes b32CoreDistortRing {
  0% {
    opacity: 0;
    width: 20px;
    height: 20px;
    filter: blur(0);
  }
  14% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    width: 180px;
    height: 180px;
    filter: blur(2px);
  }
}

/* コア被弾テキスト */
.b32-core-damage-text {
  position: fixed;
  left: 50%;
  top: 56%;
  z-index: 1000003;
  transform: translate(-50%, -50%);
  pointer-events: none;
  font-family: 'Cinzel', serif;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 4px;
  color: #ffdddd;
  text-shadow:
    0 0 8px rgba(255,255,255,.9),
    0 0 24px rgba(255,40,40,.95),
    0 0 60px rgba(255,0,0,.55),
    0 2px 4px rgba(0,0,0,1);
  animation: b32CoreDamageText 850ms ease-out forwards;
}

@keyframes b32CoreDamageText {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(.72);
    filter: blur(3px);
  }
  18% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.12);
    filter: blur(0);
  }
  62% {
    opacity: 1;
    transform: translate(-50%, -54%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -62%) scale(1.05);
    filter: blur(1px);
  }
}

/* コア画像自体も揺らす */
.b32-core-object.core-hit {
  animation: b32CoreObjectHit 700ms ease-out;
}

@keyframes b32CoreObjectHit {
  0%   { transform: rotateX(-50deg) translateX(0) scale(1); }
  15%  { transform: rotateX(-50deg) translateX(-5px) scale(1.12); }
  30%  { transform: rotateX(-50deg) translateX(6px) scale(1.08); }
  48%  { transform: rotateX(-50deg) translateX(-4px) scale(1.10); }
  70%  { transform: rotateX(-50deg) translateX(2px) scale(1.04); }
  100% { transform: rotateX(-50deg) translateX(0) scale(1); }
}

    `;
    document.head.appendChild(chipStyle);

    // ── ボス危険エリア用スタイル ──
    if (document.getElementById('b32-danger-style')) return;
    const dangerStyle = document.createElement('style');
    dangerStyle.id = 'b32-danger-style';
    dangerStyle.textContent = `
      /* ── ボス危険エリア：通常攻撃（薄い赤） ── */
      .b32-cell.boss-danger-normal {
        background:
          radial-gradient(circle at center, rgba(255, 80, 80, .18), transparent 62%),
          rgba(60, 8, 8, .18) !important;
        border-color: rgba(255, 90, 90, .38) !important;
        box-shadow:
          inset 0 0 10px rgba(255, 60, 60, .18),
          0 0 8px rgba(255, 40, 40, .14) !important;
      }

      /* ── ボス危険エリア：予兆攻撃（オレンジ） ── */
      .b32-cell.boss-danger-warn {
        background:
          linear-gradient(145deg, rgba(255, 150, 40, .24), rgba(80, 20, 0, .28)),
          rgba(50, 10, 0, .22) !important;
        border-color: rgba(255, 170, 60, .60) !important;
        box-shadow:
          inset 0 0 14px rgba(255, 150, 40, .24),
          0 0 14px rgba(255, 120, 40, .24) !important;
      }

      /* ── ボス危険エリア：直線強攻撃（濃い赤＋点滅） ── */
      .b32-cell.boss-danger-line {
        background:
          linear-gradient(180deg, rgba(255, 40, 40, .34), rgba(80, 0, 0, .34)),
          rgba(60, 0, 0, .30) !important;
        border-color: rgba(255, 70, 70, .82) !important;
        box-shadow:
          inset 0 0 18px rgba(255, 40, 40, .34),
          0 0 18px rgba(255, 20, 20, .34) !important;
        /* filter: brightness() は子要素の transform を潰すため使わない */
        animation: b32DangerPulse 1.2s ease-in-out infinite;
      }

      /* 点滅は border-color の opacity 変化で表現（filter 非使用） */
      @keyframes b32DangerPulse {
        0%, 100% {
          border-color: rgba(255, 70, 70, .82) !important;
          box-shadow:
            inset 0 0 18px rgba(255, 40, 40, .34),
            0 0 18px rgba(255, 20, 20, .34) !important;
        }
        50% {
          border-color: rgba(255, 120, 120, 1) !important;
          box-shadow:
            inset 0 0 28px rgba(255, 60, 60, .55),
            0 0 28px rgba(255, 40, 40, .55) !important;
        }
      }

      /* ── コアセルに危険エリアが重なった場合：点滅アニメを止めてコア表示を保護 ── */
      .b32-cell.boss-danger-line:has(.b32-core-object),
      .b32-cell.boss-danger-warn:has(.b32-core-object),
      .b32-cell.boss-danger-normal:has(.b32-core-object) {
        animation: none !important;
      }

      /* :has() 非対応ブラウザ向けフォールバック（JS で has-core クラスを付与） */
      .b32-cell.has-core.boss-danger-line,
      .b32-cell.has-core.boss-danger-warn,
      .b32-cell.has-core.boss-danger-normal {
        animation: none !important;
      }

      /* ── 危険エリア + スキル範囲が重なった場合：スキル範囲を前面に ── */
      .b32-cell.boss-danger-normal.skill-target-enemy,
      .b32-cell.boss-danger-warn.skill-target-enemy,
      .b32-cell.boss-danger-line.skill-target-enemy {
        background:
          linear-gradient(145deg, rgba(255,100,60,.22), rgba(40,8,4,.34)),
          rgba(18,6,4,.52) !important;
        border-color: rgba(255,130,70,.70) !important;
        box-shadow:
          inset 0 0 14px rgba(255,100,50,.24),
          0 0 16px rgba(255,100,50,.28) !important;
        animation: none !important;
      }

      .b32-cell.boss-danger-normal.skill-range,
      .b32-cell.boss-danger-warn.skill-range,
      .b32-cell.boss-danger-line.skill-range {
        animation: none !important;
      }

      /* ── 危険エリア + 移動可能セルが重なった場合：movable枠を上書きしない ── */
      .b32-cell.boss-danger-normal.movable,
      .b32-cell.boss-danger-warn.movable,
      .b32-cell.boss-danger-line.movable {
        /* movable の枠は残し、危険の背景だけを重ねる */
        animation: none !important;
      }
    `;
    document.head.appendChild(dangerStyle);

    // ── 駒取りマス（move-capture）スタイル ──
    if (!document.getElementById('b32-move-capture-style')) {
      const moveCaptureStyle = document.createElement('style');
      moveCaptureStyle.id = 'b32-move-capture-style';
      moveCaptureStyle.textContent = `
        /* ── 駒取り可能マス（赤金系） ── */
        .b32-cell.move-capture {
          background:
            linear-gradient(145deg, rgba(255,180,30,.22), rgba(40,8,4,.34)),
            rgba(18,6,4,.52) !important;
          border-color: rgba(255,160,40,.85) !important;
          box-shadow:
            inset 0 0 14px rgba(255,150,30,.28),
            0 0 18px rgba(255,140,20,.35) !important;
          cursor: pointer;
        }
        .b32-cell.move-capture::after {
          content: '×';
          position: absolute;
          top: 2px; right: 4px;
          font-size: 9px;
          color: rgba(255,180,40,.85);
          pointer-events: none;
        }
      `;
      document.head.appendChild(moveCaptureStyle);
    }


    // ── ULT使用可能演出スタイル ──
    if (document.getElementById('b32-ult-ready-style')) return;
    const ultReadyStyle = document.createElement('style');
    ultReadyStyle.id = 'b32-ult-ready-style';
    ultReadyStyle.textContent = `
      /* ── ULT使用可能：鼓動 + 発光 ── */
      .b32-float-action-btn.ult.ult-ready {
        position: relative;
        overflow: visible !important;
        color: #fff4c8 !important;
        border-color: rgba(255, 190, 80, .95) !important;
        background:
          radial-gradient(circle at 50% 65%, rgba(255, 120, 20, .42), transparent 58%),
          linear-gradient(180deg, rgba(120, 30, 10, .60), rgba(35, 4, 4, .92)) !important;
        box-shadow:
          0 0 10px rgba(255, 210, 90, .85),
          0 0 22px rgba(255, 110, 30, .70),
          0 0 42px rgba(255, 40, 20, .42),
          inset 0 0 12px rgba(255, 180, 70, .38) !important;
        animation:
          b32UltHeartbeat 1.05s ease-in-out infinite,
          b32UltGlow 1.6s ease-in-out infinite;
      }

      /* 外側の脈動リング */
      .b32-float-action-btn.ult.ult-ready::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 999px;
        pointer-events: none;
        border: 1px solid rgba(255, 210, 100, .65);
        box-shadow:
          0 0 10px rgba(255, 190, 70, .75),
          0 0 24px rgba(255, 80, 30, .45);
        opacity: .75;
        animation: b32UltPulseRing 1.05s ease-out infinite;
      }

      /* ── ULTボタン：重なり順の基準 ── */
      .b32-float-action-btn.ult {
        position: relative;
        isolation: isolate;
      }

      /* 魂炎は文字より背面 */
      .b32-ult-soul-flame {
        z-index: 0 !important;
      }

      /* ── ULT文字：通常時 ── */
      .b32-float-action-btn.ult .b32-ult-label {
        position: relative;
        z-index: 5 !important;
        display: inline-flex;
        align-items: center;
        justify-content: center;

        font-family: 'Cinzel', serif;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1px;

        color: #fff7d0;
        text-shadow:
          0 0 4px rgba(255,255,255,.95),
          0 0 10px rgba(255,230,140,.95),
          0 0 18px rgba(255,160,60,.75),
          0 1px 3px rgba(0,0,0,1);

        pointer-events: none;
        transform-origin: center center;
      }

      /* ── ULT使用可能時：文字も鼓動＋シアン発光 ── */
      .b32-float-action-btn.ult.ult-ready .b32-ult-label {
        color: #ffffff;
        font-size: 12px;

        text-shadow:
          0 0 5px rgba(255,255,255,1),
          0 0 12px rgba(160,255,255,.95),
          0 0 22px rgba(60,230,255,.85),
          0 0 34px rgba(255,200,80,.55),
          0 2px 4px rgba(0,0,0,1);

        animation: b32UltLabelHeartbeat 1.05s ease-in-out infinite;
      }

      /* disabled 時は文字鼓動を止める */
      .b32-float-action-btn.ult.disabled .b32-ult-label {
        animation: none !important;
      }

      /* ボタン本体の b32UltHeartbeat と同周期・同タイミング */
      @keyframes b32UltLabelHeartbeat {
        0%, 100% {
          transform: translateY(-1px) scale(1);
          filter: brightness(1);
        }
        12% {
          transform: translateY(-1px) scale(1.22);
          filter: brightness(1.45);
        }
        24% {
          transform: translateY(-1px) scale(1.04);
          filter: brightness(1.08);
        }
        38% {
          transform: translateY(-1px) scale(1.16);
          filter: brightness(1.32);
        }
        56% {
          transform: translateY(-1px) scale(1);
          filter: brightness(1);
        }
      }

      /* ── 魂炎SVGレイヤー ── */
      .b32-ult-soul-flame {
        position: absolute;
        left: 50%;
        bottom: -10px;
        width: 58px;
        height: 86px;
        transform: translateX(-50%);
        pointer-events: none;
        z-index: 0;
        opacity: .95;
        animation: b32UltFlameFloat 1.05s ease-in-out infinite;
      }

      .b32-ult-soul-flame svg {
        width: 100%;
        height: 100%;
        overflow: visible;
        filter:
          drop-shadow(0 0 5px rgba(80, 255, 255, .95))
          drop-shadow(0 0 14px rgba(40, 220, 255, .75))
          drop-shadow(0 0 28px rgba(40, 160, 255, .42));
      }

      .b32-ult-flame-outer,
      .b32-ult-flame-inner {
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .b32-ult-flame-outer {
        stroke: rgba(40, 255, 255, .95);
        stroke-width: 8;
      }

      .b32-ult-flame-inner {
        stroke: rgba(150, 255, 255, .92);
        stroke-width: 6;
      }

      /* 魂炎の浮遊・ゆらぎ */
      @keyframes b32UltFlameFloat {
        0%, 100% {
          transform: translateX(-50%) translateY(2px) scale(.96) rotate(-1deg);
          opacity: .72;
        }
        50% {
          transform: translateX(-50%) translateY(-7px) scale(1.08) rotate(1deg);
          opacity: 1;
        }
      }

      /* disabled 時は燃やさない */
      .b32-float-action-btn.ult.disabled {
        animation: none !important;
      }
      .b32-float-action-btn.ult.disabled::after {
        display: none !important;
      }
      .b32-float-action-btn.ult.disabled .b32-ult-soul-flame {
        display: none !important;
      }

      /* overflow を親まで伝播させる */
      .b32-floating-actions {
        overflow: visible !important;
      }

      /* ── 三角配置レイアウト ── */
      .b32-floating-actions.b32-triangle-layout {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0;
        overflow: visible;
      }
      .b32-float-row {
        display: flex;
        justify-content: flex-end;
      }
      /* ULT: 一番上・右端 */
      .b32-float-row--top {
        margin-right: 0;
      }
      /* 終了: 真ん中・少し左にずらす */
      .b32-float-row--mid {
        margin-right: 50px;
        margin-top: -6px;
      }
      /* 戻る: 一番下・さらに左にずらす */
      .b32-float-row--bot {
        margin-right: 100px;
        margin-top: -6px;
      }

      /* 戻るボタン基本スタイル（endボタンに準じる・控えめな色） */
      .b32-float-action-btn.back {
        background: rgba(60, 60, 80, 0.82);
        border: 1px solid rgba(160, 160, 200, 0.45);
        color: rgba(200, 200, 220, 0.85);
        font-size: 13px;
        font-family: 'Cinzel', serif;
        letter-spacing: 1px;
      }
      .b32-float-action-btn.back:active {
        filter: brightness(1.15);
      }

      @keyframes b32UltHeartbeat {
        0%, 100% { transform: scale(1); }
        12%       { transform: scale(1.08); }
        24%       { transform: scale(1.02); }
        38%       { transform: scale(1.06); }
        56%       { transform: scale(1); }
      }

      @keyframes b32UltGlow {
        0%, 100% { filter: brightness(1); }
        50%       { filter: brightness(1.32); }
      }

      @keyframes b32UltPulseRing {
        0%   { transform: scale(.92); opacity: .85; }
        70%  { transform: scale(1.32); opacity: .18; }
        100% { transform: scale(1.42); opacity: 0; }
      }
    `;
    document.head.appendChild(ultReadyStyle);
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

    // クラスだけで状態を制御する（style.opacity 直接操作はしない）
    el.classList.remove('b32ct-visible');
    el.classList.add('b32ct-hidden');

    el.innerHTML = `
      <div class="b32ct-main">${main}</div>
      ${sub ? `<div class="b32ct-sub">${sub}</div>` : ''}
    `;

    // レイアウト確定 → 次フレームで visible へ（transition が確実に走る）
    void el.offsetWidth;

    requestAnimationFrame(() => {
      el.classList.remove('b32ct-hidden');
      el.classList.add('b32ct-visible');
    });

    // duration 後にフェードアウト開始
    const exitDuration = 900;   // CSSの transition 900ms に合わせる
    _centerTextTimer = setTimeout(() => {
      el.classList.remove('b32ct-visible');
      el.classList.add('b32ct-hidden');

      _centerTextTimer2 = setTimeout(() => {
        el.innerHTML = '';
        el.classList.remove('b32ct-hidden');
        _centerTextTimer2 = null;
      }, exitDuration);

      _centerTextTimer = null;
    }, duration || 1200);
  };

  // await 可能バージョン：テキストが完全に消えるまで Promise を返す
  window.showBattle32CenterTextAsync = function (main, sub, duration) {
    return new Promise(resolve => {
      window.showBattle32CenterText(main, sub, duration);
      // duration(表示) + exitDuration(900ms) + 50ms余裕
      setTimeout(resolve, (duration || 1200) + 950);
    });
  };

  // ============================================================
  // ダメージ・回復 演出
  // ============================================================

  // 有効な BoundingClientRect かチェック（display:none の親があると 0 になる）
  function _validRect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return r;
  }

  // セルまたはカードの中心座標を返す（fixed座標系）
  // 優先順位：
  //   ally: .b32-party-card[data-uid] → .b32-action-char-card[data-uid]
  //          → 盤面セル → battle32-root 下部中央（フォールバック）
  //   enemy: 盤面セル
  function _getUnitScreenPos(unitInfo) {
  if (!unitInfo) return null;

  // ── 敵：必ず盤面セル上に表示 ──
  if (unitInfo.side === 'enemy') {
    const cell = document.querySelector(
      `.b32-cell[data-row="${unitInfo.row}"][data-col="${unitInfo.col}"]`
    );
    const r = _validRect(cell);
    if (!r) return null;

    return {
      x: r.left + r.width * 0.5,
      y: r.top + r.height * 0.25,
    };
  }

  // ── 味方：HP増減は必ず下部パネル側に表示 ──

  // 1) 3人パーティカード
  const card = document.querySelector(`.b32-party-card[data-uid="${unitInfo._uid}"]`);
  const cardRect = _validRect(card);
  if (cardRect) {
    return {
      x: cardRect.left + cardRect.width * 0.5,
      y: cardRect.top + cardRect.height * 0.22,
    };
  }

  // 2) スキル選択中キャラカード
  const actionCard = document.querySelector(`.b32-action-char-card[data-uid="${unitInfo._uid}"]`);
  const actionRect = _validRect(actionCard);
  if (actionRect) {
    return {
      x: actionRect.left + actionRect.width * 0.5,
      y: actionRect.top + actionRect.height * 0.22,
    };
  }

  // 3) 下部パーティエリア内のキャラ順で座標を作る
  // ※味方HP増減は盤面セルには出さない
  const bs = _bs();
  const partyStatus = document.getElementById('b32-party-status');
  const partyRect = _validRect(partyStatus);

  if (bs && partyRect && Array.isArray(bs.allies)) {
    const idx = bs.allies.findIndex(a => a._uid === unitInfo._uid);
    if (idx >= 0) {
      const count = Math.max(1, bs.allies.length);
      const cardW = partyRect.width / count;

      return {
        x: partyRect.left + cardW * (idx + 0.5),
        y: partyRect.top + partyRect.height * 0.25,
      };
    }
  }

  // 4) 最後のフォールバック：下部中央
  const root = document.getElementById('battle32-root');
  if (root) {
    const rr = root.getBoundingClientRect();
    return {
      x: rr.left + rr.width * 0.5,
      y: rr.bottom - rr.height * 0.18,
    };
  }

  return {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.82,
  };
}

  // フロートナンバーを表示
  function _showFloatNumber(unitInfo, amount, kind, isUlt) {
    const pos = _getUnitScreenPos(unitInfo);
    if (!pos) return;

    const el = document.createElement('div');
    const sign  = kind === 'heal' ? '+' : '-';
    const isBoss = unitInfo.side === 'enemy' && amount > 500;
    const ultCls = isUlt ? ' ult' : '';
    el.className = `b32-float-number ${kind}${isBoss ? ' boss' : ''}${ultCls}`;
    el.textContent = `${sign}${amount}`;
    el.style.left = `${pos.x}px`;
    el.style.top  = `${pos.y}px`;
    document.body.appendChild(el);

    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1000);
  }

  function _showSkillNameBurst(skillName, charImg) {
  if (!skillName) return Promise.resolve();

  return new Promise(resolve => {
    const el = document.createElement('div');
    el.className = 'b32-skill-name-burst';

    const imgHtml = charImg
      ? `<img class="b32-skill-burst-img" src="${charImg}" alt="" onerror="this.style.display='none'">`
      : '';

    el.innerHTML = `
      ${imgHtml}
      <div class="b32-skill-burst-name">${skillName}</div>
    `;

    document.body.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
      resolve();
    }, 1520);
  });
}

function _showUltCutin(skillName, cutinImg) {
  if (!skillName) skillName = 'ULT';

  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'b32-ult-cutin';

    const imgHtml = cutinImg
      ? `<img class="b32-ult-cutin-img" src="${cutinImg}" alt="" onerror="this.style.display='none'">`
      : '';

    wrap.innerHTML = `
      ${imgHtml}
      <div class="b32-ult-cutin-shade"></div>
      <div class="b32-ult-cutin-line"></div>
      <div class="b32-ult-cutin-label">ULTIMATE</div>
      <div class="b32-ult-cutin-name">${skillName}</div>
    `;

    const flash = document.createElement('div');
    flash.className = 'b32-ult-white-flash';

    document.body.appendChild(wrap);
    document.body.appendChild(flash);

    setTimeout(() => {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if (flash.parentNode) flash.parentNode.removeChild(flash);
      resolve();
    }, 1920);
  });
}

function _showScreenShake(variant) {
  const root = document.getElementById('battle32-root');
  if (!root) return;

  // variant: 'ult' | 'heavy' | '' (normal)
  const cls = variant === 'ult'   ? 'b32-screen-shake-ult'
            : variant === 'heavy' ? 'b32-screen-shake-heavy'
            :                       'b32-screen-shake';
  const dur = variant === 'ult' ? 400 : variant === 'heavy' ? 360 : 280;

  root.classList.remove('b32-screen-shake', 'b32-screen-shake-ult', 'b32-screen-shake-heavy');
  void root.offsetWidth;
  root.classList.add(cls);

  setTimeout(() => {
    root.classList.remove(cls);
  }, dur);
}

function _getCoreScreenPos(core) {
  if (!core) return null;

  const cell = document.querySelector(
    `.b32-cell[data-row="${core.row}"][data-col="${core.col}"]`
  );
  const r = _validRect(cell);
  if (!r) {
    return {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.62,
    };
  }

  return {
    x: r.left + r.width * 0.5,
    y: r.top + r.height * 0.45,
  };
}

function _showCoreDamageEvent(data) {
  const core = data && data.core ? data.core : null;
  const pos = _getCoreScreenPos(core);

  const root = document.getElementById('battle32-root');
  if (root) {
    root.classList.remove('b32-screen-shake-core');
    void root.offsetWidth;
    root.classList.add('b32-screen-shake-core');
    setTimeout(() => root.classList.remove('b32-screen-shake-core'), 760);
  }

  const flash = document.createElement('div');
  flash.className = 'b32-core-damage-flash';
  document.body.appendChild(flash);
  setTimeout(() => {
    if (flash.parentNode) flash.parentNode.removeChild(flash);
  }, 780);

  const ring = document.createElement('div');
  ring.className = 'b32-core-distort-ring';
  ring.style.left = `${pos.x}px`;
  ring.style.top = `${pos.y}px`;
  document.body.appendChild(ring);
  setTimeout(() => {
    if (ring.parentNode) ring.parentNode.removeChild(ring);
  }, 820);

  const text = document.createElement('div');
  text.className = 'b32-core-damage-text';
  text.textContent = core && core.stability <= 0
  ? 'SPATIAL LINK LOST'
  : 'LINK DESTABILIZED';
  text.style.left = `${pos.x}px`;
  text.style.top = `${pos.y - 24}px`;
  document.body.appendChild(text);
  setTimeout(() => {
    if (text.parentNode) text.parentNode.removeChild(text);
  }, 900);

  const coreEl = document.querySelector('.b32-core-object');
  if (coreEl) {
    coreEl.classList.remove('core-hit');
    void coreEl.offsetWidth;
    coreEl.classList.add('core-hit');
    setTimeout(() => coreEl.classList.remove('core-hit'), 740);
  }
}

function _wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

  // 対象DOMを取得する
function _getTargetElement(unitInfo) {
  if (!unitInfo) return null;

  if (unitInfo.side === 'enemy') {
    const cell = document.querySelector(
      `.b32-cell[data-row="${unitInfo.row}"][data-col="${unitInfo.col}"]`
    );
    return _validRect(cell) ? cell : null;
  }

  // 味方：下部カード → アクションカード
  // ※味方HP増減の演出は盤面セルに出さない
  const card = document.querySelector(`.b32-party-card[data-uid="${unitInfo._uid}"]`);
  if (_validRect(card)) return card;

  const actionCard = document.querySelector(`.b32-action-char-card[data-uid="${unitInfo._uid}"]`);
  if (_validRect(actionCard)) return actionCard;

  return null;
}

// 衝撃波リング
function _showImpactRing(unitInfo, kind, variant) {
  const pos = _getUnitScreenPos(unitInfo);
  if (!pos) return;

  const el = document.createElement('div');
  el.className = `b32-impact-ring ${kind}`;

  // ULT/heavy は CSS animation を上書きして大きく拡張する
  if (variant === 'ult' || variant === 'heavy') {
    const scale = variant === 'ult' ? 1.55 : 1.32;
    el.style.setProperty('--ring-scale', scale);
    // アニメEnd幅を直接Styleで制御する代わりに、transformで拡大する
    el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    el.style.transformOrigin = 'center center';
    // アニメ自体が translate(-50%,-50%) を使うため、wrapperでscaleを当てる
    const wrap = document.createElement('div');
    wrap.style.cssText = `position:fixed;left:${pos.x}px;top:${pos.y}px;pointer-events:none;z-index:999997;`;
    const inner = document.createElement('div');
    inner.className = `b32-impact-ring ${kind}`;
    inner.style.cssText = `left:0;top:0;transform:translate(-50%,-50%) scale(${scale});transform-origin:center center;`;
    wrap.appendChild(inner);
    document.body.appendChild(wrap);
    setTimeout(() => { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, kind === 'heal' ? 560 : 460);
    return;
  }

  el.style.left = `${pos.x}px`;
  el.style.top  = `${pos.y}px`;
  document.body.appendChild(el);

  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, kind === 'heal' ? 560 : 460);
}

// 斜めヒットスラッシュ
function _showHitSlash(unitInfo, variant, isMulti) {
  const pos = _getUnitScreenPos(unitInfo);
  if (!pos) return;

  // slashCount: multi は2本、他は1本
  const count = isMulti ? 2 : 1;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    // variant クラスを追加
    const variantCls = variant ? ` ${variant}` : '';
    const multiCls   = isMulti ? ' multi' : '';
    el.className = `b32-hit-slash${variantCls}${multiCls}`;

    // 複数本の場合はわずかにズラす
    const ox = i * 12 - (count - 1) * 6;
    const oy = i * 8  - (count - 1) * 4;
    el.style.left = `${pos.x + ox}px`;
    el.style.top  = `${pos.y + oy}px`;

    // 2本目は少し遅延
    const delay = i * 80;
    if (delay > 0) el.style.animationDelay = `${delay}ms`;

    document.body.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300 + delay);
  }
}

// 対象を小さく揺らす
function _showImpactShake(unitInfo) {
  const el = _getTargetElement(unitInfo);
  if (!el) return;

  el.classList.remove('b32-impact-shake');
  void el.offsetWidth; // animation再発火
  el.classList.add('b32-impact-shake');

  setTimeout(() => {
    el.classList.remove('b32-impact-shake');
  }, 280);
}

  // ヒットフラッシュ（対象セル or カードを一瞬光らせる）
  function _showHitFlash(unitInfo, kind) {
    let el = null;
    if (unitInfo.side === 'enemy') {
      el = document.querySelector(
        `.b32-cell[data-row="${unitInfo.row}"][data-col="${unitInfo.col}"]`
      );
    } else {
      // パーティカード → アクションカード の順で有効なものを探す
      const card = document.querySelector(`.b32-party-card[data-uid="${unitInfo._uid}"]`);
      if (_validRect(card)) {
        el = card;
      } else {
        const ac = document.querySelector(`.b32-action-char-card[data-uid="${unitInfo._uid}"]`);
        if (_validRect(ac)) el = ac;
      }
    }
    if (!el) return;
    const cls = kind === 'heal' ? 'b32-hit-flash-heal' : 'b32-hit-flash-damage';
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 380);
  }

  // damage / heal イベントハンドラ（Battle32 callbacks から呼ばれる）
  function _onDamageEvent(data) {
  if (!data || !data.target) return;

  const isUlt    = !!data.isUltimate;
  const hitStyle = data.hitStyle || 'normal';
  const isMulti  = hitStyle === 'multi';
  const isHeavy  = hitStyle === 'heavy';
  const isRapid  = hitStyle === 'rapid';

  // shakeVariant: ULT > heavy > normal
  const shakeVariant = isUlt ? 'ult' : isHeavy ? 'heavy' : '';

  // slashVariant: ULT スラッシュクラス (ult/heavy/rapid/'' のどれか)
  const slashVariant = isUlt ? 'ult' : isHeavy ? 'heavy' : isRapid ? 'rapid' : '';

  // ringVariant: ULT/heavy で大きく
  const ringVariant  = isUlt ? 'ult' : isHeavy ? 'heavy' : '';

  // スキル名表示の直後に「当たった感」が来るよう、少し溜める
  setTimeout(() => {
    _showScreenShake(shakeVariant);
    _showImpactRing(data.target, 'damage', ringVariant);
    _showHitSlash(data.target, slashVariant, isMulti);
    _showImpactShake(data.target);
    _showHitFlash(data.target, 'damage');
  }, 120);

  // 数値は衝撃より少し後に出す
  setTimeout(() => {
    _showFloatNumber(data.target, data.amount, 'damage', isUlt);
  }, 240);
}

function _onHealEvent(data) {
  if (!data || !data.target) return;

  const isUlt = !!data.isUltimate;

  setTimeout(() => {
    _showImpactRing(data.target, 'heal', isUlt ? 'ult' : '');
    _showHitFlash(data.target, 'heal');
  }, 120);

  setTimeout(() => {
    _showFloatNumber(data.target, data.amount, 'heal', isUlt);
  }, 240);
}

  // 公開：hookBattle32Start から呼べるように
  window._b32OnDamage = _onDamageEvent;
  window._b32OnHeal   = _onHealEvent;
  window._b32OnCoreDamage = _showCoreDamageEvent;

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

  // 戻るボタン：選択解除のみ。行動権は消費しない。
  window._b32OnBackButtonTap = function () {
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
    // HP0の味方・雑魚はマス占有から除外。ボスはHP0後も核露出状態で残す。
    const unitMap = {};
    [
      ...bs.allies.filter(u => u.hp > 0),
      ...bs.enemies.filter(u => u.hp > 0 || u.isBoss),
    ].forEach(u => { unitMap[`${u.row}-${u.col}`] = u; });

    // ── スキルフェーズ用ハイライト ──
    let skillSelectableUids = new Set();
    let skillRangeCells     = new Map();   // key:'row-col', value:cellType
    let movableCells  = new Set();   // 通常移動マス
    let captureCells  = new Set();   // 駒取りマス

    if (bs.phase === 'skill') {
      // ターン単位の行動権チェック
      const turnMoveUsed  = !!(bs.moveUsedThisTurn);
      const turnSkillUsed = !!(bs.skillUsedThisTurn);

      if (_moveMode && _selMoveAllyUid) {
        // ── フェーズ2: 移動先マス選択中 ──
        // _selMoveAllyUid のキャラの移動可能マスを表示
        if (!turnMoveUsed && window.Battle32 && window.Battle32.getMoveCells) {
          const cells = window.Battle32.getMoveCells(_selMoveAllyUid);
          cells.forEach(c => {
            const k = `${c.row}-${c.col}`;
            if (c.cellType === 'capture') captureCells.add(k);
            else movableCells.add(k);
          });
        } else if (!turnMoveUsed && window.Battle32 && window.Battle32.getMovableCells) {
          // フォールバック（旧API）
          const cells = window.Battle32.getMovableCells(_selMoveAllyUid, 3);
          movableCells = new Set(cells.map(c => `${c.row}-${c.col}`));
        }

      } else if (_selSkillAllyUid) {
        // ── フェーズ4: スキルキャラ選択済み ──
        // スキル範囲のみ表示
        if (_selSkillId) {
          skillRangeCells = _skillRangeCells(_selSkillAllyUid, _selSkillId);
        }

      } else {
        // ── フェーズ1 or 3: キャラ選択待ち ──
        // 移動未使用 → 移動キャラ選択
        // 移動済み・スキル未使用 → スキルキャラ選択
        // どちらも生存味方全員をタップ可能にする
        if (!turnSkillUsed) {
          bs.allies.filter(u => u.hp > 0)
            .forEach(u => skillSelectableUids.add(u._uid));
        }
      }
    }

    // ── 危険エリア（ボス攻撃予告） ──
    // スキルフェーズ中かつボスが生存のときだけ表示
    let bossDangerCells = new Map();   // key:'row-col', value: 'boss_line' | 'boss_warn' | 'boss_normal'
    if (
      bs.phase === 'skill' &&
      window.Battle32 &&
      window.Battle32.getBossDangerCells
    ) {
      const dangerList = window.Battle32.getBossDangerCells();
      dangerList.forEach(cell => {
        const k = `${cell.row}-${cell.col}`;
        // 同一セルに複数種が重なる場合は優先度の高い方を維持
        // boss_line > boss_warn > boss_normal
        const existing = bossDangerCells.get(k);
        if (!existing ||
            (cell.type === 'boss_line') ||
            (cell.type === 'boss_warn' && existing === 'boss_normal')) {
          bossDangerCells.set(k, cell.type || 'boss_normal');
        }
      });
    }

    const cells = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 5; c++) {
        const key  = `${r}-${c}`;
        const unit = unitMap[key] || null;

        const zoneClass = r <= 2 ? 'enemy-zone' : r >= 5 ? 'ally-zone' : '';
        const isDivider = r === 4;

        const isSkillSelectable = unit && unit.side === 'ally' && skillSelectableUids.has(unit._uid);
        // 移動対象または スキル対象として選択中のキャラを盤面ハイライト
        const isSkillSelected   = unit && bs.phase === 'skill' && (
          unit._uid === _selSkillAllyUid ||
          (unit._uid === _selMoveAllyUid && _moveMode)
        );
        // skillRangeCells は Map<"row-col", cellType>
        const skillCellType     = skillRangeCells.get ? skillRangeCells.get(key) : null;
        const isMovable         = movableCells.has(key);
        const isCapture         = captureCells.has(key);
        // 危険エリア種別（'boss_line' | 'boss_warn' | 'boss_normal' | undefined）
        const bossDangerType    = bossDangerCells.get(key);

        let cls = `b32-cell ${zoneClass}`;
        if (isDivider)           cls += ' row-divider';
        // 危険エリアは最初に付与（後続のスキル範囲クラスに上書きされる）
        if (bossDangerType === 'boss_line')        cls += ' boss-danger-line';
        else if (bossDangerType === 'boss_warn')   cls += ' boss-danger-warn';
        else if (bossDangerType === 'boss_normal') cls += ' boss-danger-normal';
        // コアがあるセルにフラグ付与（filter/animation からコア表示を保護するため）
        if (bs.cores?.ally && r === bs.cores.ally.row && c === bs.cores.ally.col) {
          cls += ' has-core';
        }
        if (isSkillSelectable)   cls += ' skill-selectable';
        if (isSkillSelected)     cls += ' skill-selected';
        if (isMovable)           cls += ' movable';
        if (isCapture)           cls += ' move-capture';
        // 範囲ハイライト: ユニットがいるセルも含めて cellType で色分け
        if (skillCellType === 'target_enemy')    cls += ' skill-target-enemy';
        else if (skillCellType === 'target_ally') cls += ' skill-target-ally';
        else if (skillCellType === 'range')       cls += ' skill-range';

        // クリックハンドラ
        let onclick = '';

        if (isMovable && !unit) {
           onclick = `onclick="_b32OnMoveCellTap(${r},${c})"`;
        } else if (isCapture) {
          // 駒取りマス（敵ユニットがいるセルへの移動）
          onclick = `onclick="_b32OnMoveCellTap(${r},${c})"`;
        } else if (isSkillSelectable || isSkillSelected) {
          onclick = `onclick="_b32OnSkillAllyTap('${unit._uid}')"` ;
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

  // 自陣コアのみ表示
  if (cores.ally && row === cores.ally.row && col === cores.ally.col) {
    const stability = cores.ally.stability ?? 3;

    let img = 'images/battle_core_100.webp';
    if (stability <= 1) {
      img = 'images/battle_core_30.webp';
    } else if (stability === 2) {
      img = 'images/battle_core_60.webp';
    }

    return `
      <div class="b32-core-object stability-${stability}">
        <img class="b32-core-img" src="${img}" alt="CORE" onerror="this.style.display='none'">
      </div>
    `;
  }

  return '';
}

  function renderUnit(u, phase) {
    // 生存判定：味方・敵ともに hp で統一
    // ただしボスは HP0 後も盤面に残る（核露出状態）
    const bsCurrent = _bs();
    const bossExposed = u.isBoss && bsCurrent?.bossCore?.exposed;

    const dead   = u.side === 'ally'
      ? (u.hp <= 0)
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
    // 移動先選択中はキャラタップを無視する
    if (_moveMode && _selMoveAllyUid) return;
    const bs = _bs();
    if (!bs || bs.phase !== 'skill') return;

    const ally = bs.allies.find(u => u._uid === allyUid);
    if (!ally || ally.hp <= 0) return;

    // ── フェーズ判定 ──
    // 移動済みまたは移動不要 → スキルキャラ選択モード
    // まだ移動していない → 移動キャラ選択モード
    const isMovePhase = !bs.moveUsedThisTurn && !_selMoveAllyUid && !_moveMode;

    if (isMovePhase) {
      // ── フェーズ1: 移動キャラ選択 ──
      // 同キャラ再タップで選択解除
      if (_selMoveAllyUid === allyUid && _moveMode) {
        _selMoveAllyUid = null;
        _moveMode = false;
        renderBattle32UI();
        return;
      }
      // 移動キャラとして選択し、移動先マス選択モードへ
      _selMoveAllyUid  = allyUid;
      _selSkillAllyUid = null;
      _selSkillId      = null;
      _moveMode        = true;
      renderBattle32UI();

    } else if (!_selSkillAllyUid || !bs.skillUsedThisTurn) {
      // ── フェーズ3: スキルキャラ選択（移動後） ──
      // スキル権が消費済みなら選択不可
      if (bs.skillUsedThisTurn) return;

      // 同キャラ再タップで選択解除
      if (_selSkillAllyUid === allyUid) {
        _selSkillAllyUid = null;
        _selSkillId = null;
        renderBattle32UI();
        return;
      }
      // スキルキャラとして選択
      _selSkillAllyUid = allyUid;
      _selSkillId      = null;
      _moveMode        = false;
      renderBattle32UI();
    }
  };

  // 移動可能マスをタップ
  window._b32OnMoveCellTap = async function (row, col) {
    if (_b32InputLocked) return;
    if (!_selMoveAllyUid || !window.Battle32 || !window.Battle32.moveAlly) return;

    const ok = window.Battle32.moveAlly(_selMoveAllyUid, row, col);
    if (!ok) return;

    // 移動成功 → 移動状態をリセット。スキルキャラ選択フェーズへ移行
    _b32InputLocked  = true;
    _selMoveAllyUid  = null;
    _moveMode        = false;
    // スキルキャラはまだ選んでいない状態に戻す
    _selSkillAllyUid = null;
    _selSkillId      = null;
    renderBattle32UI();
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

// スキル名を取得
const allyNow = bs.allies.find(u => u._uid === allyUid);
const skillNow = allyNow && allyNow.skills
  ? allyNow.skills.find(s => s.id === skillId)
  : null;

// 入力ロックして、スキル名をボワァン表示
_b32InputLocked = true;
const charImg =
  allyNow?.panelImg ||
  allyNow?.panel ||
  allyNow?.portrait ||
  allyNow?.upImg ||
  allyNow?.img ||
  allyNow?.battleImg ||
  null;

if (skillNow?.isUltimate) {
  const ultImg =
    allyNow?.cutin ||
    allyNow?.ultImg ||
    allyNow?.cutImg ||
    allyNow?.panelImg ||
    allyNow?.img ||
    null;

  await _showUltCutin(skillNow ? skillNow.name : 'ULT', ultImg);
} else {
  await _showSkillNameBurst(skillNow ? skillNow.name : 'SKILL', charImg);
}

// 少しだけ溜めてから実行
await _wait(60);

const ok = window.Battle32.executeAllySkill(allyUid, skillId);
if (!ok) {
  console.warn('[Battle32UI] executeAllySkill failed');
  _b32InputLocked = false;
  return;
}

_resetSkillState();
renderBattle32UI();

// ダメージ・回復演出を見せるための待ち
await _wait(skillNow?.isUltimate ? 1200 : 850);

// キャラのターン終了演出
await window.showBattle32CenterTextAsync('ターン終了', '', 700);

await _afterCharTurnFlow();
  };

  // キャラ単位の行動終了（スキルなしで終了）
  window._b32EndCharTurn = async function (allyUid) {
    if (_b32InputLocked) return;
    const bs = _bs();
    if (!bs || bs.phase !== 'skill') return;
    if (!window.Battle32) return;

    const ally = bs.allies.find(u => u._uid === allyUid);
    // 行動終了はいつでも押せる
    if (typeof window.Battle32.endCharTurn === 'function') {
      window.Battle32.endCharTurn(allyUid);
    }
    _resetSkillState();
    _b32InputLocked = true;
    renderBattle32UI();

    await window.showBattle32CenterTextAsync('ターン終了', '', 900);

    await _afterCharTurnFlow();
  };

  // キャラ行動後の共通フロー
  async function _afterCharTurnFlow() {
    // battle_32.js 側で endSkillPhase() が呼ばれているので、
    // UI側はロック解除とレンダリングのみ担当
    const bsAfter = _bs();
    if (!bsAfter) { _b32InputLocked = false; return; }
    // phase が 'enemy' に切り替わっている場合、_runEnemyTurnFlow がロックを管理する
    // まだ 'skill' の場合（endSkillPhase未呼び出し等）は操作解除
    if (bsAfter.phase === 'skill') {
      _b32InputLocked = false;
    }
    renderBattle32UI();
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

      const dead     = ally.hp <= 0;
      // ターン単位のスキル権で「done」を判定
      const done     = !!(bs.skillUsedThisTurn);
      // 移動対象として選択中 or スキルキャラとして選択中ならハイライト
      const selected = ally._uid === _selMoveAllyUid || ally._uid === _selSkillAllyUid;

      // HP バー＋数値表示
      const hpPct = ally.hpMax > 0 ? Math.max(0, Math.round((ally.hp / ally.hpMax) * 100)) : 0;
      const hpBarColor = hpPct > 50 ? '#5ad48a' : hpPct > 25 ? '#e8c87a' : '#d07878';
      const hpHtml = `
        <div class="b32-party-hp-bar-wrap">
          <div class="b32-party-hp-bar" style="width:${hpPct}%;background:${hpBarColor}"></div>
        </div>
        <div class="b32-party-hp-text">${ally.hp}<span class="b32-party-hp-max"> /${ally.hpMax}</span></div>
      `;

      const shinkiDots = Array.from({ length: ally.shinkiMax || 3 }, (_, i) =>
        `<span class="b32-party-shinki-dot ${i < (ally.shinki || 0) ? 'filled' : ''}"></span>`
      ).join('');

      // タップ可否：スキル権がない・dead の場合は選択不可
      const tappable = !dead && !bs.skillUsedThisTurn && bs.phase === 'skill';
      const onclickAttr = tappable ? `onclick="_b32OnSkillAllyTap('${ally._uid}')"` : '';

      return `
        <div class="b32-party-card${dead ? ' dead' : ''}${done ? ' done' : ''}${selected ? ' selected' : ''}"
          data-uid="${ally._uid}"
          ${onclickAttr}>
          <!-- 神気ドット：絶対配置でカード右上に固定 -->
          <div class="b32-party-shinki-badge">${shinkiDots}</div>
          <div class="b32-party-img-wrap">
            ${img
              ? `<img class="b32-party-img" src="${img}" alt="" onerror="this.style.display='none'">`
              : `<div class="b32-party-initial">${initial(ally.name)}</div>`}
          </div>
          <div class="b32-party-name">${ally.name}</div>
          <!-- HP バー＋数値：カード下部 -->
          <div class="b32-party-hp-section">${hpHtml}</div>
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

      // ── フェーズ判定 ──
      // Phase1: 移動キャラ選択中      (_selMoveAllyUid=null, _moveMode=false, !bs.moveUsedThisTurn)
      // Phase2: 移動先マス選択中      (_selMoveAllyUid=set,  _moveMode=true)
      // Phase3: スキルキャラ選択中    (_selSkillAllyUid=null, bs.moveUsedThisTurn=true)
      // Phase4: スキル内容選択中      (_selSkillAllyUid=set)

      if (_moveMode && _selMoveAllyUid) {
        // ── Phase2: 移動先マス選択中 ──
        const partyStatusEl = document.getElementById('b32-party-status');
        if (partyStatusEl) partyStatusEl.style.setProperty('display', 'none', 'important');
        if (guideEl) guideEl.textContent = '移動先のマスをタップしてください。';
        const charaNameEl = document.getElementById('b32-skill-chara-name');
        if (charaNameEl) charaNameEl.textContent = '';
        const listEl = document.getElementById('b32-skill-list');
        if (listEl) {
          const backBtn = `<button type="button" class="b32-float-action-btn back" onclick="_b32OnBackButtonTap()">戻る</button>`;
          listEl.innerHTML = `<div class="b32-floating-actions b32-triangle-layout"><div class="b32-float-row b32-float-row--bot">${backBtn}</div></div>`;
        }

      } else if (_selSkillAllyUid) {
        // ── Phase4: スキルキャラ選択済み、スキル内容を選ぶ ──
        const ally = bs.allies.find(u => u._uid === _selSkillAllyUid);
        if (!ally) {
          _resetSkillState();
          renderBattle32UI();
          return;
        }

        // スキル選択中はパーティカードを隠す
        const partyStatusEl = document.getElementById('b32-party-status');
        if (partyStatusEl) partyStatusEl.style.setProperty('display', 'none', 'important');

        if (guideEl) guideEl.textContent = 'アクションを選択してください。';

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
          const cantUlt = bs.skillUsedThisTurn || (shinki > ally.shinki);
          const ultReady = !cantUlt;

          const flameHtml = ultReady ? `
            <span class="b32-ult-soul-flame" aria-hidden="true">
              <svg viewBox="0 0 100 140">
                <path class="b32-ult-flame-outer" d="M50 6 C76 38 58 55 78 82 C96 112 73 134 50 134 C24 134 5 112 20 82 C30 62 44 58 42 38 C41 24 46 14 50 6Z">
                  <animate attributeName="d" dur="1.2s" repeatCount="indefinite" values="M50 6 C76 38 58 55 78 82 C96 112 73 134 50 134 C24 134 5 112 20 82 C30 62 44 58 42 38 C41 24 46 14 50 6Z;M52 4 C69 35 64 52 76 78 C98 112 72 136 49 134 C22 132 4 108 22 80 C35 59 47 61 39 36 C35 21 46 13 52 4Z;M50 6 C76 38 58 55 78 82 C96 112 73 134 50 134 C24 134 5 112 20 82 C30 62 44 58 42 38 C41 24 46 14 50 6Z"/>
                </path>
                <path class="b32-ult-flame-inner" d="M50 52 C63 70 55 81 66 96 C75 112 64 125 50 125 C35 125 25 112 34 96 C41 84 50 82 47 68 C45 60 48 55 50 52Z">
                  <animate attributeName="d" dur=".9s" repeatCount="indefinite" values="M50 52 C63 70 55 81 66 96 C75 112 64 125 50 125 C35 125 25 112 34 96 C41 84 50 82 47 68 C45 60 48 55 50 52Z;M51 50 C60 69 58 80 67 95 C78 113 62 127 49 124 C34 121 27 110 36 95 C44 82 51 83 46 67 C43 58 48 54 51 50Z;M50 52 C63 70 55 81 66 96 C75 112 64 125 50 125 C35 125 25 112 34 96 C41 84 50 82 47 68 C45 60 48 55 50 52Z"/>
                </path>
              </svg>
            </span>
          ` : '';

          ultBtn = `
            <button type="button"
              class="b32-float-action-btn ult${cantUlt ? ' disabled' : ''}${ultReady ? ' ult-ready' : ''}"
              ${cantUlt ? 'disabled' : ''}
              onclick="_b32OnSkillChipClick(event,'${ally._uid}','${ultSkill.id}')">
              ${flameHtml}
              <span class="b32-ult-label">ULT</span>
            </button>
          `;
        } else {
          ultBtn = `<button type="button" class="b32-float-action-btn ult disabled" disabled><span class="b32-ult-label">ULT</span></button>`;
        }

        const endBtn = `<button type="button" class="b32-float-action-btn end" onclick="_b32EndCharTurn('${ally._uid}')">終了</button>`;
        const backBtn = `<button type="button" class="b32-float-action-btn back" onclick="_b32OnBackButtonTap()">戻る</button>`;

        floatingButtonsHtml = `
          <div class="b32-floating-actions b32-triangle-layout">
            <div class="b32-float-row b32-float-row--top">${ultBtn}</div>
            <div class="b32-float-row b32-float-row--mid">${endBtn}</div>
            <div class="b32-float-row b32-float-row--bot">${backBtn}</div>
          </div>
        `;

        // スキル詳細画面（スキル選択済みの場合）
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
                <button type="button" class="b32-action-detail-btn confirm" onclick="_b32ConfirmSkill('${ally._uid}','${selectedSkill.id}')">決定</button>
                <button type="button" class="b32-action-detail-btn cancel" onclick="_b32CancelSkillDetail(event)">キャンセル</button>
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
            const cantUse = bs.skillUsedThisTurn || (shinki > ally.shinki);
            const disabledCls = cantUse ? ' disabled' : '';
            normalSkillChips.push(
              `<button type="button" class="b32-bottom-skill-btn${disabledCls}" ${cantUse ? 'disabled' : ''} onclick="_b32OnSkillChipClick(event,'${ally._uid}','${skill.id}')">${skill.name}</button>`
            );
          });
        while (normalSkillChips.length < 3) {
          normalSkillChips.push(`<button type="button" class="b32-bottom-skill-btn disabled" disabled>—</button>`);
        }

        const img = ally.panelImg || ally.panel || ally.battleImg || ally.img || ally.portrait || ally.upImg || '';
        const hpPctBottom = ally.hpMax > 0 ? Math.max(0, Math.round((ally.hp / ally.hpMax) * 100)) : 0;
        const hpBarColorBottom = hpPctBottom > 50 ? '#5ad48a' : hpPctBottom > 25 ? '#e8c87a' : '#d07878';
        const animaHtml = `
          <div class="b32-party-hp-bar-wrap" style="width:100%;margin:2px 0">
            <div class="b32-party-hp-bar" style="width:${hpPctBottom}%;background:${hpBarColorBottom}"></div>
          </div>
          <div class="b32-party-hp-text" style="font-size:9px">${ally.hp}<span class="b32-party-hp-max"> /${ally.hpMax}</span></div>
        `;
        const shinkiHtml = Array.from({ length: ally.shinkiMax || 3 }, (_, i) =>
          `<span class="b32-party-shinki-dot ${i < (ally.shinki || 0) ? 'filled' : ''}"></span>`
        ).join('');

        listEl.innerHTML = `
          ${floatingButtonsHtml}
          <div class="b32-action-skill-panel">
            <div class="b32-action-char-card" data-uid="${ally._uid}">
              <div class="b32-action-char-img-wrap">
                ${img ? `<img class="b32-action-char-img" src="${img}" alt="" onerror="this.style.display='none'">` : `<div class="b32-party-initial">${initial(ally.name)}</div>`}
              </div>
              <div class="b32-action-char-dots hp">${animaHtml}</div>
              <div class="b32-action-char-dots shinki">${shinkiHtml}</div>
            </div>
            <div class="b32-action-skill-buttons">${normalSkillChips.join('')}</div>
          </div>
        `;

      } else {
        // ── Phase1 or Phase3: キャラ選択待ち ──
        // Phase1: 移動キャラを選ぶ (moveUsedThisTurn=false)
        // Phase3: 移動後にスキルキャラを選ぶ (moveUsedThisTurn=true)
        const guideText = bs.moveUsedThisTurn
          ? 'スキルを使うキャラを選択してください。'
          : '移動するキャラを選択してください。';
        if (guideEl) guideEl.textContent = guideText;

        // 3人分のキャラカードを必ず表示
        const partyStatusEl = document.getElementById('b32-party-status');
        if (partyStatusEl) partyStatusEl.style.removeProperty('display');

        const charaNameEl = document.getElementById('b32-skill-chara-name');
        if (charaNameEl) charaNameEl.textContent = '';

        const listEl = document.getElementById('b32-skill-list');
        if (listEl) listEl.innerHTML = '';
      }

    } else if (bs.phase === 'enemy') {
  skillPanel.style.display = 'none';
  if (guideEl) guideEl.textContent = '敵の行動中です。';
  // 敵ターン中はパーティカードを表示（演出位置取得に必要）
  const partyStatusEnemyTurn = document.getElementById('b32-party-status');
  if (partyStatusEnemyTurn) partyStatusEnemyTurn.style.removeProperty('display');
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

    if (bs.phase === 'skill') {
      if (_moveMode && _selMoveAllyUid) {
        // Phase2: 移動先選択中
        const ally = bs.allies.find(u => u._uid === _selMoveAllyUid);
        bar.textContent = ally ? `${ally.name} を移動` : '';
        bar.className = 'skill-hint';
      } else if (_selSkillAllyUid) {
        // Phase4: スキルキャラ選択済み
        const ally = bs.allies.find(u => u._uid === _selSkillAllyUid);
        bar.textContent = ally ? `${ally.name} のスキルを選択` : '';
        bar.className = 'skill-hint';
      } else {
        bar.textContent = '';
        bar.className   = '';
      }
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
      // 移動キャラ選択中 or スキルキャラ選択中は選択解除ボタンを表示
      btnCancel.style.display = (_selMoveAllyUid || _selSkillAllyUid) ? '' : 'none';
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
    (rootW <= 390 && rootH <= 700 ? 4 : 20);

  const boardAvailW = Math.max(240, rootW - 24);
  const boardAvailH = Math.max(200, rootH - reservedH);

  const gap = 3;
  const cellByW = Math.floor((boardAvailW - gap * 4) / 5);
  const cellByH = Math.floor((boardAvailH - gap * 7) / 8);

  const isCompact = rootW <= 390 && rootH <= 700;
  const minCell = isCompact ? 24 : 28;
  const maxCell = isCompact ? 48 : 72;

  const cellSize = Math.max(minCell, Math.min(maxCell, cellByW, cellByH));
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
      // damage / heal コールバックを UI 演出に接続
      // UI演出と外部callbacks を両方呼ぶ（どちらかが undefined でも安全）
      const userCb = callbacks || {};
      
      const uiCallbacks = {
        ...userCb,
        damage: (data) => {
          window._b32OnDamage && window._b32OnDamage(data);
          if (typeof userCb.damage === 'function') userCb.damage(data);
        },
        heal: (data) => {
          window._b32OnHeal && window._b32OnHeal(data);
          if (typeof userCb.heal === 'function') userCb.heal(data);
        },
        coreDamage: (data) => {
          window._b32OnCoreDamage && window._b32OnCoreDamage(data);
          if (typeof userCb.coreDamage === 'function') userCb.coreDamage(data);
        },
      };
      originalStart.call(window.Battle32, config, uiCallbacks);
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
