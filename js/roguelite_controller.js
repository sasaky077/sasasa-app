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
  position: fixed;
  top: calc(max(14px, env(safe-area-inset-top, 14px)));
  left: 50%;
  transform: translateX(-50%);
  z-index: 170000;
  display: none;
  align-items: center;
  gap: 10px;
  background: rgba(14,8,36,0.88);
  border: 1px solid rgba(140,100,255,0.28);
  border-radius: 28px;
  padding: 6px 16px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  pointer-events: none;
  white-space: nowrap;
  max-width: 92vw;
}
#rl-hud.visible { display: flex; }
.rl-hud-stage {
  font-size: .72rem;
  font-weight: 700;
  color: #c0a8ff;
  letter-spacing: .1em;
  font-family: "Cinzel", serif;
}
.rl-hud-div { color: rgba(140,100,255,0.35); font-size: .8rem; }
.rl-hud-ops { display: flex; gap: 5px; flex-wrap: wrap; }
.rl-hud-op {
  font-size: .66rem;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(100,55,200,0.28);
  border: 1px solid rgba(120,70,220,0.32);
  color: #b09fff;
  font-family: "Noto Serif JP", serif;
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
function _updateHud() {
  let hud = document.getElementById('rl-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'rl-hud';
    document.body.appendChild(hud);
  }

  if (!window.RogueliteRun || !window.RogueliteRun.isActive()) {
    hud.classList.remove('visible');
    hud.innerHTML = '';
    hud.style.display = 'none';
    return;
  }

  const stageNo = window.RogueliteRun.getStageNo();
  const ops     = window.RogueliteRun.getOptions();
  const isBoss  = window.RogueliteRun.isBossStage();
  const stageLabel = isBoss ? '⚔ BOSS' : `STAGE ${stageNo}`;

  const opTagsHtml = ops.map(op =>
    `<span class="rl-hud-op">${op.icon || '✦'} ${op.name}</span>`
  ).join('');

  hud.innerHTML = `
    <span class="rl-hud-stage">🎲 ${stageLabel}</span>
    ${ops.length > 0 ? '<span class="rl-hud-div">|</span>' : ''}
    <div class="rl-hud-ops">${opTagsHtml}</div>
  `;

  // _hideHud() で display:none にした後でも再表示できるようにする
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

  // ── バトル起動 ───────────────────────────────────────────
  function _startBattle() {
  _hideHud();

  if (!window.RogueliteRun || !window.RogueliteRun.isActive()) return;
    const config = window.RogueliteRun.buildBattleConfig({
      // バトル終了時のコールバックを注入
      rogueliteOnBattleEnd: (payload) => _onBattleEnd(payload.result),
      // Battle32.start で useBattle32 相当として動くよう battleMode を渡す
      battleMode: '32',
    });

    console.log('[RogueliteController] Battle32.start:', config);

    // ステージ演出（enemy_intro）を経由してバトルへ
    // isBossStage → ボス敵のimgを使って演出
    // 雑魚戦 → 先頭の雑魚定義を使って演出（imgがなければスキップ）
    const def = window.RogueliteRun.getStageDef();
    const introEnemies = def && def.isBoss
      ? (config.enemyIds || []).map(id => {
          const e = typeof getEnemyById === 'function' ? getEnemyById(id) : null;
          return e ? JSON.parse(JSON.stringify(e)) : { id, name:'??????', img:'images/enemy_01.webp' };
        }).filter(Boolean)
      : (config.enemies || []).map(e => ({
          ...e,
          img: e.img || 'images/enemy_test.webp',
        }));

    if (typeof window.startEnemyIntro === 'function' && introEnemies.length > 0) {
      window.startEnemyIntro(introEnemies, [], config);
    } else if (window.Battle32 && typeof window.Battle32.start === 'function') {
      // enemy_intro なしで直接起動
      window.Battle32.start(config);
    } else {
      console.error('[RogueliteController] Battle32 が見つかりません');
    }
  }
  function _waitVictoryConfirm() {
  return new Promise(resolve => {
    let done = false;

    const blocker = document.createElement('div');
    blocker.id = 'rl-victory-wait-layer';
    blocker.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:210000',
      'background:transparent',
      'cursor:pointer',
      '-webkit-tap-highlight-color:transparent',
    ].join(';');

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (blocker.parentNode) blocker.parentNode.removeChild(blocker);
      resolve();
    }

    blocker.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      finish();
    }, { once: true });

    document.body.appendChild(blocker);

    const timer = setTimeout(finish, 3000);
  });
}

 // ── バトル終了ハンドラ ──────────────────────────────────
async function _onBattleEnd(result) {
  _hideHud();

  if (!window.RogueliteRun || !window.RogueliteRun.isActive()) return;

  console.log('[RogueliteController] バトル終了:', result,
    '/ Stage:', window.RogueliteRun.getStageNo());

  if (result === 'lose') {
    const ops = window.RogueliteRun.getOptions();
    window.RogueliteRun.end('lose');
    _hideHud();
    _showResult('lose', ops);
    return;
  }

  // 勝利：ボス戦ならラン成功
  if (window.RogueliteRun.isBossStage()) {
    const ops = window.RogueliteRun.getOptions();
    window.RogueliteRun.end('win');
    _hideHud();
    _showResult('win', ops);
    return;
  }

  // 雑魚戦クリア → VICTORYを見せる → 報酬選択 → 次ステージ
  const currentStage   = window.RogueliteRun.getStageNo();
  const currentOptions = window.RogueliteRun.getOptions();
  const excludeIds     = currentOptions.map(o => o.id);

  _hideHud();

  // VICTORY画面を見せる：タップ or 3秒後に報酬画面へ
  await _waitVictoryConfirm();

  window.RogueliteReward.show({
    currentStage,
    currentOptions,
    excludeIds,
    onSelect: (selectedOp) => {
      if (selectedOp) {
        window.RogueliteRun.addOption(selectedOp);
        console.log('[RogueliteController] OP選択:', selectedOp.name);
      }

      window.RogueliteRun.advance();
      _hideHud();

      // 少し間を置いてから次バトル
      setTimeout(() => _startBattle(), 400);
    },
  });
}

  // ── 公開: ランを開始 ─────────────────────────────────────
  /**
   * party_select.js の confirmPartySelect() 等から呼ぶ
   * @param {number[]} partyIds - 選択済みキャラ ID 配列
   */
  function startRun(partyIds) {
    _injectStyles();

    if (window.RogueliteRun.isActive()) {
      window.RogueliteRun.end('lose'); // 既存ランを中断
    }

    window.RogueliteRun.start(partyIds || []);
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
    mountDebugButton,
    // デバッグ用: 直接終了コールバックを呼べるようにする
    _onBattleEnd,
    _updateHud,
  };

})();
