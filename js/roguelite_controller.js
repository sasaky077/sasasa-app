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
  function _showResult(result, ops) {
    const isWin = result === 'win';
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

    ov.innerHTML = `
      <div class="rl-result-panel">
        <div class="rl-result-title ${isWin ? 'win' : 'lose'}">
          ${isWin ? '🏆 ラン成功' : '💀 ラン失敗'}
        </div>
        <div class="rl-result-sub">
          ${isWin
            ? '怪異の収容に成功した。全ステージクリア。'
            : 'ランが終了した。また挑め。'}
        </div>
        ${ops && ops.length > 0 ? `
          <div style="font-size:.68rem;color:rgba(190,165,255,0.35);
            letter-spacing:.1em;font-family:'Cinzel',serif;
            text-align:center;margin-bottom:10px;">
            — 取得した強化OP —
          </div>
          <div class="rl-result-ops">${opsHtml}</div>
        ` : ''}
        <button class="rl-result-btn" id="rl-result-close-btn">
          タイトルへ戻る
        </button>
      </div>
    `;

    document.body.appendChild(ov);

    document.getElementById('rl-result-close-btn').addEventListener('click', () => {
      ov.remove();
      _hideHud();
      // 既存のステージ選択 / タイトル表示があれば呼ぶ
      // （現状は何もしない — 画面が battle_32_ui.js 管理のため）
    });
  }

  // ── Battle32 UI だけを静かに隠すヘルパー ─────────────────
  // closeBattle32UI() は nav / explore / map を復帰させてしまうため
  // ローグライト中は使わない。このヘルパーで盤面だけを非表示にする。
  function _hideBattle32Only() {
  window.__ROGUELITE_TRANSITIONING__ = true;

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
      detail: '規定ターン内に制圧できなかったため、接続限界に到達しました。',
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
    _hideBattle32Only();

    const ops = window.RogueliteRun.getOptions();
    window.RogueliteRun.end('lose');
    _hideHud();
    _showResult('lose', ops);
    return;
  }

  // ボス戦勝利時：STAGE 4 CLEAR を見せてからラン成功画面へ
  if (window.RogueliteRun.isBossStage()) {
    const currentStage = window.RogueliteRun.getStageNo();
    await _waitStageClear(currentStage);
    _hideBattle32Only();

    const ops = window.RogueliteRun.getOptions();
    window.RogueliteRun.end('win');
    _hideHud();
    _showResult('win', ops);
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

      // 報酬UI非表示後に古いBATTLE END画面が再表示されないよう先に隠す
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
  };

})();
