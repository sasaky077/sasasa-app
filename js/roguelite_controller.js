// roguelite_controller.js
// ローグライトランの進行を束ねる統合コントローラ
//
// 依存:
//   roguelite_options.js  → ROGUELITE_OPTIONS, getRandomOptions
//   roguelite_run.js      → RogueliteRun
//   roguelite_reward.js   → RogueliteReward
//   battle_32.js          → Battle32 (window.Battle32)
//   enemy_intro.js        → startEnemyIntro (window.startEnemyIntro)
//
// ── 公開API ─────────────────────────────────────────────────
//   RogueliteController.startRun(partyIds)  : 選択済みpartyIdsでランを開始
//   RogueliteController.mountDebugButton()  : デバッグ用「ローグライト開始」ボタンを画面固定表示
//
// ── 既存フローとの接続 ───────────────────────────────────────
// party_select.js の confirmPartySelect() が呼ぶ
//   openPartySelect(enemyId, battleOptions)
// battleOptions.battleMode === 'roguelite' のとき startRun に流れるよう
// stage_select.js または party_select.js に 1行追加するだけで接続できる。
// ────────────────────────────────────────────────────────────

(function () {

  // ── HUD スタイル（1回だけ注入） ──────────────────────────
  function _injectStyles() {
    if (document.getElementById('rl-ctrl-style')) return;
    const s = document.createElement('style');
    s.id = 'rl-ctrl-style';
    s.textContent = `
/* ── デバッグ起動ボタン ── */
#rl-debug-btn {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  right: 16px;
  z-index: 170000;
  padding: 11px 18px;
  background: linear-gradient(135deg, #5c28ff, #9050ff);
  color: #fff;
  font-size: .8rem;
  font-weight: 700;
  letter-spacing: .1em;
  border: none;
  border-radius: 28px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(80,40,255,0.5);
  transition: transform .15s, box-shadow .15s;
  font-family: "Noto Serif JP", serif;
  white-space: nowrap;
}
#rl-debug-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(80,40,255,0.65);
}

/* ── ラン中HUD（画面上部） ── */
#rl-hud {
  position: relative;
  z-index: 2;
  flex: 0 0 36px;
  display: none;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  width: 100%;
  max-width: none;
  height: 36px;
  box-sizing: border-box;
  padding: 6px 0 5px;
  margin: 0;
  background:
    linear-gradient(180deg, rgba(0,0,0,0.34), rgba(7,5,22,0.22));
  border-bottom: 1px solid rgba(160,120,255,0.08);
}
#rl-hud.visible { display: flex; }
.rl-hud-main {
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  width: 100%;
}
.rl-hud-title { display: none; }
.rl-hud-progress {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 16px;
  padding: 0;
  border-radius: 0;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  font-family: "Cinzel", serif;
}
.rl-hud-pip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.rl-hud-pip-bar {
  width: 44px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255,255,255,0.10);
  transition: background .25s ease, box-shadow .25s ease;
}
.rl-hud-pip.done .rl-hud-pip-bar {
  background: rgba(108,63,255,0.72);
}
.rl-hud-pip.active .rl-hud-pip-bar {
  background: rgba(184,127,255,0.98);
  box-shadow: 0 0 9px rgba(184,127,255,0.82);
}
.rl-hud-pip-label {
  font-size: .58rem;
  line-height: 1;
  letter-spacing: .05em;
  color: rgba(190,165,255,0.32);
}
.rl-hud-pip.done .rl-hud-pip-label {
  color: rgba(140,105,255,0.62);
}
.rl-hud-pip.active .rl-hud-pip-label {
  color: rgba(218,198,255,0.92);
  text-shadow: 0 0 6px rgba(184,127,255,0.55);
}
.rl-hud-pip.boss .rl-hud-pip-label {
  letter-spacing: .02em;
}
.rl-hud-sep { display: none; }
.rl-hud-node { display: none; }
.rl-hud-ops { display: none; }
.rl-hud-op { display: none; }

/* ── ローグライト専用：画面遷移シールド ── */
#rl-transition-shield {
  position: fixed;
  inset: 0;
  z-index: 260000;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  pointer-events: auto;
  background:
    radial-gradient(circle at 50% 42%, rgba(150,105,255,.18), transparent 34%),
    linear-gradient(180deg, rgba(0,0,0,.96), rgba(5,3,14,.98));
  color: #efe6ff;
  opacity: 1;
  transition: opacity .22s ease, transform .22s ease;
}
#rl-transition-shield.is-hiding {
  opacity: 0;
  transform: scale(1.015);
}
.rl-transition-kicker {
  font-family: "Cinzel", serif;
  font-size: .62rem;
  letter-spacing: .22em;
  color: rgba(220,205,255,.42);
  margin-bottom: 10px;
}
.rl-transition-title {
  font-family: "Cinzel", "Noto Serif JP", serif;
  font-size: clamp(1.25rem, 6vw, 2rem);
  font-weight: 900;
  letter-spacing: .18em;
  color: #fff3c4;
  text-shadow: 0 0 18px rgba(255,220,120,.55), 0 0 42px rgba(130,80,255,.42);
}
.rl-transition-line {
  width: min(54vw, 220px);
  height: 1px;
  margin-top: 18px;
  background: linear-gradient(90deg, transparent, rgba(255,230,150,.76), transparent);
  box-shadow: 0 0 14px rgba(255,220,120,.42);
}

/* ── ステージクリア演出 ── */
#rl-stage-clear-overlay {
  position: fixed;
  inset: 0;
  z-index: 210000;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: rgba(0,0,0,0.86);
  color: #fff;
  pointer-events: auto;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  animation: rl-stage-clear-in .22s ease both;
}
.rl-stage-clear-title {
  font-family: "Cinzel", serif;
  font-size: clamp(2rem, 9vw, 4rem);
  font-weight: 900;
  letter-spacing: .12em;
  color: #efe6ff;
  text-shadow: 0 0 18px rgba(170,115,255,.85), 0 0 48px rgba(100,54,255,.52);
  transform: translateY(0);
}
.rl-stage-clear-sub {
  margin-top: 12px;
  font-family: "Noto Serif JP", serif;
  font-size: .78rem;
  letter-spacing: .14em;
  color: rgba(220,205,255,.58);
}
.rl-stage-clear-progress {
  margin-top: 22px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
  padding: 5px 10px 4px;
  border-radius: 10px;
  background: rgba(12,8,34,0.50);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.rl-stage-clear-pip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.rl-stage-clear-pip-bar {
  width: 34px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255,255,255,0.10);
  transition: background .25s ease, box-shadow .25s ease;
}
.rl-stage-clear-pip.done .rl-stage-clear-pip-bar,
.rl-stage-clear-pip.active .rl-stage-clear-pip-bar {
  background: rgba(184,127,255,0.96);
  box-shadow: 0 0 8px rgba(184,127,255,0.70);
}
.rl-stage-clear-pip-label {
  font-family: "Cinzel", serif;
  font-size: .55rem;
  line-height: 1;
  letter-spacing: .05em;
  color: rgba(190,165,255,.38);
}
.rl-stage-clear-pip.done .rl-stage-clear-pip-label,
.rl-stage-clear-pip.active .rl-stage-clear-pip-label {
  color: rgba(218,198,255,.92);
}
.rl-stage-clear-sep,
.rl-stage-clear-node { display: none; }
@keyframes rl-stage-clear-in {
  from { opacity: 0; transform: scale(1.025); }
  to   { opacity: 1; transform: scale(1); }
}


/* ── ステージ失敗演出 ── */
#rl-stage-fail-overlay {
  position: fixed;
  inset: 0;
  z-index: 210000;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background:
    radial-gradient(circle at 50% 42%, rgba(150,35,55,0.18), transparent 42%),
    rgba(0,0,0,0.88);
  color: #fff;
  pointer-events: auto;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  animation: rl-stage-clear-in .22s ease both;
}
.rl-stage-fail-title {
  font-family: "Cinzel", serif;
  font-size: clamp(2.2rem, 10vw, 4.4rem);
  font-weight: 900;
  letter-spacing: .14em;
  color: #ffe8e8;
  text-shadow:
    0 0 18px rgba(255,70,90,.88),
    0 0 52px rgba(170,20,50,.58),
    0 2px 4px rgba(0,0,0,.95);
}
.rl-stage-fail-reason {
  margin-top: 12px;
  font-family: "Cinzel", "Noto Serif JP", serif;
  font-size: clamp(1rem, 4.2vw, 1.5rem);
  font-weight: 800;
  letter-spacing: .12em;
  color: #ff9c9c;
  text-shadow: 0 0 14px rgba(255,80,90,.65);
}
.rl-stage-fail-detail {
  margin-top: 8px;
  font-family: "Noto Serif JP", serif;
  font-size: .76rem;
  letter-spacing: .08em;
  line-height: 1.7;
  color: rgba(255,220,220,.66);
  text-align: center;
}
.rl-stage-fail-stage {
  margin-top: 22px;
  font-family: "Cinzel", serif;
  font-size: .68rem;
  letter-spacing: .14em;
  color: rgba(255,210,220,.42);
}


/* ── ラン最終勝利：盤面上フィニッシュ演出 ── */
#rl-run-victory-fx {
  position: fixed;
  inset: 0;
  z-index: 220000;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 44%, rgba(255,228,150,.16), transparent 28%),
    radial-gradient(circle at 50% 58%, rgba(150,95,255,.18), transparent 44%),
    rgba(0,0,0,.08);
  animation: rlRunVictoryBg 2600ms ease both;
}
#rl-run-victory-fx::before,
#rl-run-victory-fx::after {
  content: '';
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(circle, rgba(255,235,170,.9) 0 1px, transparent 2px) 0 0 / 34px 34px,
    radial-gradient(circle, rgba(190,155,255,.72) 0 1px, transparent 2px) 12px 18px / 42px 42px;
  opacity: 0;
  animation: rlRunSparkle 2400ms ease-out both;
}
#rl-run-victory-fx::after {
  filter: blur(1px);
  transform: rotate(18deg) scale(1.08);
  animation-delay: 180ms;
}
.rl-run-victory-line {
  position: absolute;
  width: min(88vw, 420px);
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,236,170,.96), transparent);
  box-shadow: 0 0 18px rgba(255,220,120,.75);
  animation: rlRunVictoryLine 1500ms ease-out both;
}
.rl-run-victory-title {
  position: relative;
  z-index: 2;
  font-family: "Noto Serif JP", "Cinzel", serif;
  font-size: clamp(2rem, 10vw, 4.2rem);
  font-weight: 900;
  letter-spacing: .34em;
  color: #fff3b0;
  text-shadow:
    0 0 8px rgba(255,255,255,.82),
    0 0 24px rgba(255,214,96,.92),
    0 0 64px rgba(130,75,255,.72),
    0 3px 8px rgba(0,0,0,.98);
  transform: translateX(.17em);
  opacity: 0;
  animation: rlRunVictoryTitle 2300ms cubic-bezier(.16,1,.3,1) both;
}
.b32-unit.enemy.boss.rl-boss-vanish,
.b32-unit.enemy.midboss.rl-boss-vanish,
.b32-unit.enemy-id-enemy_01.rl-boss-vanish,
.b32-unit.enemy-id-enemy_sakiel_roguelite.rl-boss-vanish {
  animation: rlBossVanish 1500ms ease-in forwards !important;
  filter: brightness(1.8) saturate(0.55) drop-shadow(0 0 18px rgba(255,235,165,.9));
}
@keyframes rlBossVanish {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  38%  { opacity: 1; transform: translateY(-5px) scale(1.08); }
  100% { opacity: 0; transform: translateY(-26px) scale(.82); filter: blur(5px) brightness(2.2); }
}
@keyframes rlRunVictoryBg {
  0% { opacity: 0; }
  15%, 84% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes rlRunSparkle {
  0% { opacity: 0; transform: translateY(20px) scale(.96); }
  18% { opacity: .95; }
  100% { opacity: 0; transform: translateY(-80px) scale(1.08); }
}
@keyframes rlRunVictoryLine {
  0% { opacity: 0; transform: scaleX(.1); }
  28%, 72% { opacity: 1; transform: scaleX(1); }
  100% { opacity: 0; transform: scaleX(1.15); }
}
@keyframes rlRunVictoryTitle {
  0% { opacity: 0; transform: translateX(.17em) scale(.86); filter: blur(6px); }
  18% { opacity: 1; transform: translateX(.17em) scale(1.05); filter: blur(0); }
  70% { opacity: 1; transform: translateX(.17em) scale(1); }
  100% { opacity: 0; transform: translateX(.17em) scale(1.08); filter: blur(4px); }
}

/* ── リッチ版ラン結果 ── */
.rl-result-panel.rich {
  position: relative;
  overflow: hidden;
  padding: 28px 22px 24px;
  background:
    radial-gradient(circle at 50% -8%, rgba(255,220,110,.20), transparent 34%),
    radial-gradient(circle at 50% 22%, rgba(120,70,255,.26), transparent 54%),
    linear-gradient(168deg, #140b2c 0%, #060412 100%);
}
.rl-result-panel.rich::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent, rgba(255,245,190,.12), transparent),
    radial-gradient(circle, rgba(255,230,150,.42) 0 1px, transparent 2px) 0 0 / 38px 38px;
  opacity: .34;
  pointer-events: none;
}
.rl-result-kicker {
  position: relative;
  z-index: 1;
  font-family: "Cinzel", serif;
  font-size: .62rem;
  letter-spacing: .22em;
  color: rgba(220,205,255,.52);
  margin-bottom: 6px;
}
.rl-result-rank-wrap {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 14px 0 16px;
}
.rl-result-rank-label {
  font-family: "Cinzel", serif;
  font-size: .66rem;
  letter-spacing: .18em;
  color: rgba(220,205,255,.48);
}
.rl-result-rank {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: "Cinzel", serif;
  font-size: 3.8rem;
  font-weight: 900;
  color: #fff1a6;
  background: radial-gradient(circle, rgba(255,230,120,.20), rgba(82,38,210,.18) 58%, rgba(0,0,0,.18));
  border: 1px solid rgba(255,225,140,.36);
  box-shadow: 0 0 28px rgba(255,205,80,.30), inset 0 0 20px rgba(120,80,255,.22);
  text-shadow: 0 0 16px rgba(255,210,90,.86), 0 2px 5px rgba(0,0,0,.95);
}
.rl-result-stats {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 16px 0 18px;
}
.rl-result-stat {
  padding: 10px 8px;
  border-radius: 12px;
  background: rgba(255,255,255,.055);
  border: 1px solid rgba(190,160,255,.16);
}
.rl-result-stat-label {
  font-family: "Cinzel", serif;
  font-size: .56rem;
  letter-spacing: .12em;
  color: rgba(220,205,255,.42);
  margin-bottom: 4px;
}
.rl-result-stat-value {
  font-family: "Cinzel", "Noto Serif JP", serif;
  font-size: 1.02rem;
  font-weight: 800;
  color: #efe6ff;
}
.rl-result-rewards {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 0 18px;
}
.rl-result-reward-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 14px;
  background: rgba(20,12,46,.72);
  border: 1px solid rgba(255,230,150,.16);
}
.rl-result-reward-left {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  color: rgba(240,232,255,.82);
  font-size: .76rem;
  letter-spacing: .08em;
}
.rl-result-reward-icon { font-size: 1.15rem; }
.rl-result-reward-value {
  font-family: "Cinzel", serif;
  font-size: 1.05rem;
  font-weight: 900;
  color: #ffe680;
  text-shadow: 0 0 12px rgba(255,210,90,.55);
}

/* ── ラン結果オーバーレイ ── */
#rl-result-overlay {
  position: fixed;
  inset: 0;
  z-index: 190000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 16px;
  box-sizing: border-box;
  animation: rl-fade-in 0.3s ease;
}
.rl-result-panel {
  width: min(460px, 100%);
  background: linear-gradient(168deg, #120a28 0%, #060412 100%);
  border: 1px solid rgba(150,110,255,0.28);
  border-radius: 20px;
  padding: 38px 28px 32px;
  text-align: center;
  box-shadow: 0 0 80px rgba(90,50,255,0.2), 0 32px 64px rgba(0,0,0,0.7);
}
.rl-result-title {
  font-size: 1.9rem;
  font-weight: 900;
  letter-spacing: .16em;
  margin-bottom: 8px;
  font-family: "Cinzel", serif;
}
.rl-result-title.win  { color: #ffe680; text-shadow: 0 0 22px rgba(255,220,0,0.6); }
.rl-result-title.lose { color: #ff6b6b; text-shadow: 0 0 22px rgba(255,80,80,0.5); }
.rl-result-sub {
  font-size: .82rem;
  color: rgba(190,165,255,0.55);
  margin-bottom: 22px;
  letter-spacing: .08em;
  font-family: "Noto Serif JP", serif;
}
.rl-result-ops {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 26px;
  text-align: left;
}
.rl-result-op {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(90,50,200,0.12);
  border: 1px solid rgba(110,65,220,0.22);
  border-radius: 10px;
  font-family: "Noto Serif JP", serif;
}
.rl-result-op-icon { font-size: 1.25rem; flex-shrink: 0; }
.rl-result-op-name { font-size: .82rem; font-weight: 700; color: #c8aaff; }
.rl-result-op-desc { font-size: .68rem; color: rgba(190,165,255,0.6); margin-top: 2px; }
.rl-result-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #5c28ff, #9050ff);
  color: #fff;
  font-size: .88rem;
  font-weight: 700;
  letter-spacing: .1em;
  border: none;
  border-radius: 28px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(80,40,255,0.4);
  transition: transform .15s;
  font-family: "Noto Serif JP", serif;
}
.rl-result-btn:hover { transform: translateY(-2px); }
    `;
    document.head.appendChild(s);
  }

  // ── HUD 更新 ─────────────────────────────────────────────
  // ── HUD 更新 ─────────────────────────────────────────────
function _makeStageProgressHtml(stageNo, baseClass) {
  const current = Math.max(1, Math.min(4, Number(stageNo || 1)));
  let html = '';

  for (let i = 1; i <= 4; i++) {
    const classes = [baseClass + '-pip'];
    if (i < current) classes.push('done');
    if (i === current) classes.push('active');
    if (i === 4) classes.push('boss');

    const label = i === 4 ? 'BOSS' : `ST${i}`;
    html += `
      <span class="${classes.join(' ')}">
        <span class="${baseClass}-pip-bar"></span>
        <span class="${baseClass}-pip-label">${label}</span>
      </span>
    `;
  }

  return html;
}

function _updateHud() {
  const battleRoot = document.getElementById('battle32-root');
  const battleHeader = document.getElementById('b32-header');
  let hud = document.getElementById('rl-hud');

  // battle_32_ui.js の通常フローへ必ず組み込む。
  // root/header がまだ無いタイミングでは body 直下に出さない。
  if (!battleRoot || !battleHeader) {
    if (hud && hud.parentNode === document.body) hud.remove();
    return;
  }

  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'rl-hud';
  }

  // Header → Stage Progress → Hint/Board の順を強制。
  // renderBattle32UI() の再描画後もここで正しい位置へ戻す。
  if (hud.parentNode !== battleRoot || hud.previousElementSibling !== battleHeader) {
    battleRoot.insertBefore(hud, battleHeader.nextSibling);
  }

  if (!window.RogueliteRun || !window.RogueliteRun.isActive()) {
    hud.classList.remove('visible');
    hud.innerHTML = '';
    hud.style.display = 'none';
    return;
  }

  const stageNo = window.RogueliteRun.getStageNo();
  const progressHtml = _makeStageProgressHtml(stageNo, 'rl-hud');

  hud.innerHTML = `
    <div class="rl-hud-main">
      <div class="rl-hud-progress" aria-label="Roguelite Stage Progress">
        ${progressHtml}
      </div>
    </div>
  `;

  hud.style.display = 'flex';
  hud.classList.add('visible');
}

function _hideHud() {
  const hud = document.getElementById('rl-hud');
  if (hud) {
    hud.classList.remove('visible');
    hud.innerHTML = '';
    hud.style.display = 'none';
  }
}

  // ── ラン結果画面 ─────────────────────────────────────────
  function _getRankFromTurns(totalTurns) {
    if (window.RogueliteRun && typeof window.RogueliteRun.getClearRank === 'function') {
      return window.RogueliteRun.getClearRank(totalTurns);
    }
    const t = Number(totalTurns || 0);
    if (t <= 32) return 'S';
    if (t <= 35) return 'A';
    if (t <= 38) return 'B';
    if (t <= 41) return 'C';
    if (t <= 45) return 'D';
    return 'E';
  }

  function _coinByRank(rank) {
    return ({ S: 500, A: 400, B: 300, C: 220, D: 150, E: 100 })[rank] || 100;
  }

  function _calcRunExp(rank) {
    // 既存の巡行EXPロジックがあればそれを使う。
    // boss/S相当をベースに、ラン評価ランクで倍率を変える。
    if (typeof window.calcNodeExp === 'function') {
      return window.calcNodeExp('boss', rank, true);
    }
    const mul = ({ S: 1.5, A: 1.2, B: 1.0, C: 0.7, D: 0.55, E: 0.4 })[rank] || 0.4;
    return Math.floor(1000 * mul);
  }

  async function _grantRunRewards(rank) {
    const coin = _coinByRank(rank);
    const exp = _calcRunExp(rank);

    try {
      if (window.userProfile) {
        window.userProfile.coin = Number(window.userProfile.coin || 0) + coin;
      }

      if (typeof window.addTotalScore === 'function') {
        await window.addTotalScore(exp);
      } else if (window.userProfile) {
        window.userProfile.total_score = Number(window.userProfile.total_score || 0) + exp;
      }

      if (typeof window.saveProfileToDB === 'function' && window.userProfile) {
        await window.saveProfileToDB({
          coin: window.userProfile.coin,
          total_score: window.userProfile.total_score,
          rank: window.userProfile.rank,
          last_played: new Date().toISOString(),
        });
      }

      if (typeof window.updateMainUI === 'function') window.updateMainUI();
    } catch (err) {
      console.warn('[RogueliteController] 報酬付与に失敗:', err);
    }

    return { coin, exp };
  }

  async function _showResult(result, ops, summary) {
    _hideCommonGameScreens();
    _hideTransitionShield();

    const isWin = result === 'win';
    const data = summary || {};
    const totalTurns = Number(data.totalTurns || 0);
    const rank = data.rank || _getRankFromTurns(totalTurns);
    const reward = isWin ? (data.reward || await _grantRunRewards(rank)) : null;
    const shinjuItem = isWin ? (data.shinjuItem || null) : null;

    const ov    = document.createElement('div');
    ov.id       = 'rl-result-overlay';

    const opsHtml = (ops || []).map(op => `
      <div class="rl-result-op">
        <span class="rl-result-op-icon">${op.icon || '✦'}</span>
        <div>
          <div class="rl-result-op-name">${op.name}</div>
          <div class="rl-result-op-desc">${op.desc || ''}</div>
        </div>
      </div>
    `).join('');

    ov.innerHTML = isWin ? `
      <div class="rl-result-panel rich">
        <div class="rl-result-kicker">ROGUELITE COMPLETE</div>
        <div class="rl-result-title win">ラン成功</div>
        <div class="rl-result-sub">怪異の収容に成功した。全ステージクリア。</div>

        <div class="rl-result-rank-wrap">
          <div class="rl-result-rank-label">SCORE</div>
          <div class="rl-result-rank">${rank}</div>
        </div>

        <div class="rl-result-stats">
          <div class="rl-result-stat">
            <div class="rl-result-stat-label">TOTAL TURN</div>
            <div class="rl-result-stat-value">${totalTurns}</div>
          </div>
          <div class="rl-result-stat">
            <div class="rl-result-stat-label">STAGE</div>
            <div class="rl-result-stat-value">4 / 4</div>
          </div>
          <div class="rl-result-stat">
            <div class="rl-result-stat-label">GRADE</div>
            <div class="rl-result-stat-value">${rank}</div>
          </div>
        </div>

        <div class="rl-result-rewards">
          <div class="rl-result-reward-row">
            <div class="rl-result-reward-left"><span class="rl-result-reward-icon">🪙</span><span>獲得コイン</span></div>
            <div class="rl-result-reward-value">+${reward.coin}</div>
          </div>
          <div class="rl-result-reward-row">
            <div class="rl-result-reward-left"><span class="rl-result-reward-icon">✦</span><span>獲得EXP</span></div>
            <div class="rl-result-reward-value">+${reward.exp}</div>
          </div>
          ${shinjuItem ? `
          <div class="rl-result-reward-row">
            <div class="rl-result-reward-left"><span class="rl-result-reward-icon">🌳</span><span>創世資源</span></div>
            <div class="rl-result-reward-value">${shinjuItem.name} +${shinjuItem.exp}</div>
          </div>` : ''}
        </div>

        ${ops && ops.length > 0 ? `
          <div style="position:relative;z-index:1;font-size:.62rem;color:rgba(190,165,255,0.35);letter-spacing:.1em;font-family:'Cinzel',serif;text-align:center;margin-bottom:10px;">
            — 取得した強化OP —
          </div>
          <div class="rl-result-ops">${opsHtml}</div>
        ` : ''}
        <button class="rl-result-btn" id="rl-result-close-btn">タイトルへ戻る</button>
      </div>
    ` : `
      <div class="rl-result-panel">
        <div class="rl-result-title lose">💀 ラン失敗</div>
        <div class="rl-result-sub">ランが終了した。また挑め。</div>
        ${ops && ops.length > 0 ? `
          <div style="font-size:.68rem;color:rgba(190,165,255,0.35);letter-spacing:.1em;font-family:'Cinzel',serif;text-align:center;margin-bottom:10px;">
            — 取得した強化OP —
          </div>
          <div class="rl-result-ops">${opsHtml}</div>
        ` : ''}
        <button class="rl-result-btn" id="rl-result-close-btn">タイトルへ戻る</button>
      </div>
    `;

    document.body.appendChild(ov);

    document.getElementById('rl-result-close-btn').addEventListener('click', () => {
      _hideHud();
      _restoreCommonGameScreensAfterRun();
    });
  }

  function _waitRunVictoryGridFx() {
    return new Promise(resolve => {
      const root = document.getElementById('battle32-root');
      if (!root || root.style.display === 'none') {
        resolve();
        return;
      }

      root.querySelectorAll('.b32-unit.enemy.boss, .b32-unit.enemy.midboss, .b32-unit.enemy-id-enemy_01, .b32-unit.enemy-id-enemy_sakiel_roguelite')
        .forEach(el => el.classList.add('rl-boss-vanish'));

      const old = document.getElementById('rl-run-victory-fx');
      if (old) old.remove();

      const fx = document.createElement('div');
      fx.id = 'rl-run-victory-fx';
      fx.innerHTML = `
        <div class="rl-run-victory-line"></div>
        <div class="rl-run-victory-title">殲 滅 完 了</div>
      `;
      document.body.appendChild(fx);

      setTimeout(() => {
        if (fx.parentNode) fx.parentNode.removeChild(fx);
        resolve();
      }, 2700);
    });
  }

  // ── Battle32 UI だけを静かに隠すヘルパー ─────────────────
  // closeBattle32UI() は nav / explore / map を復帰させてしまうため

  // ── ローグライト専用：通常画面を見せないための共通隠蔽 ─────────────
  function _hideCommonGameScreens() {
    [
      'stage-select-modal',
      'party-select-modal',
      'enemy-intro-root',
      'battle-root',
      'explore-root',
      'explore-screen'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const nav = document.getElementById('bottom-nav-shared');
    if (nav) nav.style.display = 'none';

    const guf = document.getElementById('global-user-frame');
    if (guf) guf.style.display = 'none';
  }

  // ── ローグライト終了後：通常UIを必ず復帰してステージ選択へ戻す ─────────────
  // ラン失敗/成功の結果画面を閉じた後、_hideCommonGameScreens() で消した
  // 共通ヘッダー・ボトムナビが残留非表示にならないようにここへ集約する。
  function _restoreCommonGameScreensAfterRun() {
    window.__ROGUELITE_TRANSITIONING__ = false;
    window.__BATTLE32_UI_ACTIVE__ = false;

    // Battle32側の掃除関数がある場合は、body直下のバトル系オーバーレイもまとめて掃除する。
    // ただし closeBattle32UI() は通常ステージ復帰ロジックまで走るため直接呼ばない。
    if (typeof window.cleanupBattle32Overlays === 'function') {
      window.cleanupBattle32Overlays({ restoreCommonUi: true });
    }

    [
      'rl-transition-shield',
      'rl-stage-clear-overlay',
      'rl-stage-fail-overlay',
      'rl-run-victory-fx',
      'rl-result-overlay',
      'b32-result-overlay',
      'b32-center-text',
      'b32-turn-danger-frame',
      'b32-link-bar',
      'b32-roster-panel',
      'b32-item-panel',
      'b32-action-detail-portal'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === 'b32-result-overlay') {
        el.style.display = 'none';
        el.classList.remove('active');
      } else {
        el.remove();
      }
    });

    const battle32Root = document.getElementById('battle32-root');
    if (battle32Root) {
      battle32Root.style.display = 'none';
      delete battle32Root.dataset.rlHidden;
    }

    const nav = document.getElementById('bottom-nav-shared');
    if (nav) {
      nav.classList.remove('hidden');
      nav.style.display = '';
      nav.style.visibility = '';
      nav.style.opacity = '';
      nav.style.pointerEvents = '';
    }

    const guf = document.getElementById('global-user-frame');
    if (guf) {
      guf.classList.remove('hidden');
      guf.style.display = '';
      guf.style.visibility = '';
      guf.style.opacity = '';
      guf.style.pointerEvents = '';
    }

    // ステージ選択画面へ戻す。環境差に備えて複数の既存APIを順に試す。
    if (typeof window.openStageSelect === 'function') {
      window.openStageSelect();
    } else if (typeof window.showStageSelect === 'function') {
      window.showStageSelect();
    } else {
      const stage = document.getElementById('stage-select-modal');
      if (stage) stage.style.display = '';
    }

    if (typeof window.updateMainUI === 'function') {
      window.updateMainUI();
    }
  }

  function _showTransitionShield(title) {
    _hideCommonGameScreens();

    let shield = document.getElementById('rl-transition-shield');
    if (!shield) {
      shield = document.createElement('div');
      shield.id = 'rl-transition-shield';
      document.body.appendChild(shield);
    }

    shield.classList.remove('is-hiding');
    shield.innerHTML = `
      <div class="rl-transition-kicker">ROGUELITE</div>
      <div class="rl-transition-title">${title || 'NEXT STAGE'}</div>
      <div class="rl-transition-line"></div>
    `;
    shield.style.display = 'flex';
    return shield;
  }

  function _hideTransitionShield() {
    const shield = document.getElementById('rl-transition-shield');
    if (!shield) return;
    shield.classList.add('is-hiding');
    setTimeout(() => {
      if (shield && shield.parentNode) shield.parentNode.removeChild(shield);
    }, 240);
  }

  // ローグライト中は使わない。このヘルパーで盤面だけを非表示にする。
  function _hideBattle32Only() {
  window.__ROGUELITE_TRANSITIONING__ = true;
  _hideCommonGameScreens();

  const root = document.getElementById('battle32-root');
  if (root) {
    root.style.display = 'none';
    root.dataset.rlHidden = '1';
  }

  // ローグライト専用UI要素も非表示
  ['b32-link-bar', 'b32-roster-panel', 'b32-item-panel', 'b32-turn-danger-frame'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const result = document.getElementById('b32-result-overlay');
  if (result) {
    result.style.display = 'none';
    result.classList.remove('active');
  }

  const center = document.getElementById('b32-center-text');
  if (center) {
    center.innerHTML = '';
    center.className = '';
    center.style.opacity = '0';
  }
}

  // ── バトル起動 ───────────────────────────────────────────
  function _startBattle() {
  if (!window.RogueliteRun || !window.RogueliteRun.isActive()) return;

  _hideCommonGameScreens();
  _updateHud();

  // 次のバトルを始めるので、古いBATTLE END再表示ブロックを解除
  window.__ROGUELITE_TRANSITIONING__ = false;

  const config = window.RogueliteRun.buildBattleConfig({
    rogueliteOnBattleEnd: (payload) => _onBattleEnd(payload.result, payload),
    battleMode: 'roguelite',
  });

  console.log('[RogueliteController] Battle32.start:', config);


    // ステージ演出（enemy_intro）を経由してバトルへ
    // isBossStage → ボス敵のimgを使って演出
    // 雑魚戦 → 先頭の雑魚定義を使って演出（imgがなければスキップ）
    const def = window.RogueliteRun.getStageDef();
    const introEnemies = (config.enemyIds || []).map(id => {
      const e = typeof getEnemyById === 'function' ? getEnemyById(id) : null;
      return e ? JSON.parse(JSON.stringify(e)) : { id, name:'??????', img:'images/enemy_test.webp' };
    }).filter(Boolean);

    if (introEnemies.length === 0 && Array.isArray(config.enemies)) {
      config.enemies.forEach(e => introEnemies.push({
        ...e,
        img: e.img || 'images/enemy_test.webp',
      }));
    }

    if (typeof window.startEnemyIntro === 'function' && introEnemies.length > 0) {
      window.startEnemyIntro(introEnemies, [], config);
    } else if (window.Battle32 && typeof window.Battle32.start === 'function') {
      // enemy_intro なしで直接起動
      window.Battle32.start(config);
    } else {
      console.error('[RogueliteController] Battle32 が見つかりません');
    }

    // enemy_intro / battle32-root が前面に乗った後、黒シールドを外す。
    setTimeout(_hideTransitionShield, 260);
  }
  function _waitStageClear(stageNo) {
  return new Promise(resolve => {
    let done = false;
    const current = Math.max(1, Math.min(4, Number(stageNo || 1)));

    const old = document.getElementById('rl-stage-clear-overlay');
    if (old) old.remove();

    const ov = document.createElement('div');
    ov.id = 'rl-stage-clear-overlay';
    ov.innerHTML = `
      <div class="rl-stage-clear-title">STAGE ${current} CLEAR</div>
      <div class="rl-stage-clear-sub">${current >= 4 ? 'RUN COMPLETE' : 'REWARD SELECT'}</div>
      <div class="rl-stage-clear-progress">
        ${_makeStageProgressHtml(current, 'rl-stage-clear')}
      </div>
    `;

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);

      ov.style.transition = 'opacity .24s ease, transform .24s ease';
      ov.style.opacity = '0';
      ov.style.transform = 'scale(1.015)';

      setTimeout(() => {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        resolve();
      }, 250);
    }

    ov.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      finish();
    }, { once: true });

    document.body.appendChild(ov);

    const timer = setTimeout(finish, 1400);
  });
}


function _getLoseReasonView(reason) {
  const key = String(reason || '').toLowerCase();

  if (key === 'turn_over' || key === 'turnover' || key === 'time_over') {
    return {
      title: 'TURN OVER',
      detail: '規定ターン内に討伐できなかったため、ゲームオーバーとなります。',
    };
  }

  if (key === 'all_dead' || key === 'party_wipe' || key === 'annihilated') {
    return {
      title: '全滅',
      detail: '出撃可能な味方が全員戦闘不能になりました。',
    };
  }

  if (key === 'core_destroyed') {
    return {
      title: 'CORE BREAK',
      detail: '自陣コアが侵食され、戦線を維持できませんでした。',
    };
  }

  return {
    title: 'MISSION FAILED',
    detail: '作戦継続不能によりランを終了します。',
  };
}

function _waitStageFail(payload) {
  return new Promise(resolve => {
    let done = false;
    const reason = _getLoseReasonView(payload && (payload.reason || payload.loseReason));
    const stageNo = window.RogueliteRun && window.RogueliteRun.getStageNo
      ? window.RogueliteRun.getStageNo()
      : null;

    const old = document.getElementById('rl-stage-fail-overlay');
    if (old) old.remove();

    const ov = document.createElement('div');
    ov.id = 'rl-stage-fail-overlay';
    ov.innerHTML = `
      <div class="rl-stage-fail-title">GAME OVER</div>
      <div class="rl-stage-fail-reason">${reason.title}</div>
      <div class="rl-stage-fail-detail">${reason.detail}</div>
      ${stageNo ? `<div class="rl-stage-fail-stage">STAGE ${stageNo} FAILED</div>` : ''}
    `;

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);

      ov.style.transition = 'opacity .24s ease, transform .24s ease';
      ov.style.opacity = '0';
      ov.style.transform = 'scale(1.015)';

      setTimeout(() => {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        resolve();
      }, 250);
    }

    ov.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      finish();
    }, { once: true });

    document.body.appendChild(ov);

    const timer = setTimeout(finish, 1700);
  });
}

 // ── バトル終了ハンドラ ──────────────────────────────────
async function _onBattleEnd(result, payload) {
  _hideHud();

  if (!window.RogueliteRun || !window.RogueliteRun.isActive()) return;

  console.log('[RogueliteController] バトル終了:', result,
    '/ Stage:', window.RogueliteRun.getStageNo());

  // 敗北時：失敗理由を表示してからラン失敗画面へ
  if (result === 'lose') {
    await _waitStageFail(payload || { reason: 'unknown' });
    _showTransitionShield('RUN FAILED');
    _hideBattle32Only();

    const ops = window.RogueliteRun.getOptions();
    window.RogueliteRun.end('lose');
    _hideHud();
    await _showResult('lose', ops);
    return;
  }

  // 勝利ターンをラン通算に加算
  if (result === 'win' && typeof window.RogueliteRun.addClearedStageTurn === 'function') {
    window.RogueliteRun.addClearedStageTurn(payload && payload.turn);
  }

  // ボス戦勝利時：盤面上フィニッシュ演出 → STAGE 4 CLEAR → ラン成功画面へ
  if (window.RogueliteRun.isBossStage()) {
    const currentStage = window.RogueliteRun.getStageNo();
    await _waitRunVictoryGridFx();
    await _waitStageClear(currentStage);
    _showTransitionShield('RESULT');
    _hideBattle32Only();

    const ops = window.RogueliteRun.getOptions();
    const totalTurns = typeof window.RogueliteRun.getTotalTurns === 'function'
      ? window.RogueliteRun.getTotalTurns()
      : 0;
    const rank = _getRankFromTurns(totalTurns);
    const reward = await _grantRunRewards(rank);
    const runId = (window.RogueliteRun && typeof window.RogueliteRun.getRunId === 'function')
      ? window.RogueliteRun.getRunId()
      : 'default';
    const shinjuItem = (window.ShinjuProgress && typeof window.ShinjuProgress.grantBossItemFromRoguelite === 'function')
      ? window.ShinjuProgress.grantBossItemFromRoguelite({ runId, rank, totalTurns })
      : null;
    window.RogueliteRun.end('win');
    _hideHud();
    await _showResult('win', ops, { totalTurns, rank, reward, shinjuItem });
    return;
  }

  // 雑魚戦クリア → ここではまだBattle32を隠さない
  const currentStage   = window.RogueliteRun.getStageNo();
  const currentOptions = window.RogueliteRun.getOptions();
  const excludeIds     = currentOptions.map(o => o.id);

  console.log('[RogueliteController] 報酬待機前');

  // STAGE CLEAR 演出を見せてから報酬画面へ
  await _waitStageClear(currentStage);

  console.log('[RogueliteController] 報酬表示直前');
 
  console.log('[RogueliteController] RogueliteReward:', window.RogueliteReward);
  console.log('[RogueliteController] getRandomOptions:', window.getRandomOptions);
  console.log('[RogueliteController] excludeIds:', excludeIds);

  window.RogueliteReward.show({
    currentStage,
    currentOptions,
    excludeIds,
    onSelect: (selectedOp) => {
      console.log('[RogueliteController] 報酬選択 onSelect fired:', selectedOp);

      // 報酬選択後は黒シールドで通常画面を覆ったまま次ステージへ移管する
      _showTransitionShield('NEXT STAGE');
      _hideBattle32Only();

      if (selectedOp) {
        window.RogueliteRun.addOption(selectedOp);
        console.log('[RogueliteController] OP選択:', selectedOp.name);
      }

      console.log(
        '[RogueliteController] advance前 stage:',
        window.RogueliteRun.getStageNo(),
        'active:',
        window.RogueliteRun.isActive()
      );

      window.RogueliteRun.advance();

      console.log(
        '[RogueliteController] advance後 stage:',
        window.RogueliteRun.getStageNo(),
        'active:',
        window.RogueliteRun.isActive(),
        'isBoss:',
        window.RogueliteRun.isBossStage()
      );

      _hideHud();

      setTimeout(() => {
        console.log('[RogueliteController] 次戦開始');
        _startBattle();
      }, 400);
    }
  });
}

  // ── 公開: ランを開始 ─────────────────────────────────────
  /**
   * party_select.js の confirmPartySelect() 等から呼ぶ
   * @param {number[]} partyIds - 選択済みキャラ ID 配列
   */
  function startRun(partyIds, runOptions) {
    _injectStyles();

    const runId = (typeof runOptions === 'string')
      ? runOptions
      : (runOptions && runOptions.runId)
        || window.__ROGUELITE_PENDING_RUN_ID__
        || 'default';

    window.__ROGUELITE_PENDING_RUN_ID__ = null;

    if (window.RogueliteRun.isActive()) {
      window.RogueliteRun.end('lose'); // 既存ランを中断
    }

    window.RogueliteRun.start(partyIds || [], runId);
_showTransitionShield('RUN START');
_hideHud();
_startBattle();
  }

  // ── 公開: デバッグボタンを画面に固定表示 ────────────────
  /**
   * 開発時に body に「ローグライト開始」ボタンを追加する。
   * partySelectOpener が関数なら、タップ時にパーティ選択を開く。
   * @param {Function|null} partySelectOpener - openPartySelect 相当の関数（省略可）
   */
  function mountDebugButton(partySelectOpener) {
    _injectStyles();

    if (document.getElementById('rl-debug-btn')) return;

    const btn = document.createElement('button');
    btn.id          = 'rl-debug-btn';
    btn.textContent = '🎲 ローグライト';
    btn.title       = 'ローグライトランを開始（デバッグ）';

    btn.addEventListener('click', () => {
      if (typeof partySelectOpener === 'function') {
        // パーティ選択経由で起動
        partySelectOpener();
      } else {
        // デフォルト: party_select.js の openPartySelect を直接呼ぶ
        if (typeof window.openPartySelect === 'function') {
          window.openPartySelect(null, {
            battleMode: 'roguelite',
          });
        } else {
          // party_select なしのデバッグ: デフォルトパーティ（ID 8,12,7）でそのまま起動
          console.warn('[RogueliteController] openPartySelect が見つかりません。デフォルトパーティで起動します。');
          startRun([8, 12, 7]);
        }
      }
    });

    document.body.appendChild(btn);
  }

  // グローバル公開
  window.RogueliteController = {
    startRun,
    startSakielRun: (partyIds) => startRun(partyIds, { runId: 'sakiel' }),
    mountDebugButton,
    // デバッグ用: 直接終了コールバックを呼べるようにする
    _onBattleEnd,
    _updateHud,
    _hideHud,
    _hideBattle32Only,
    _showTransitionShield,
    _hideTransitionShield,
    _restoreCommonGameScreensAfterRun,
  };

})();
