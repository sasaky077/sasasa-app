// roguelite_reward.js
// 雑魚戦クリア後の強化OP報酬3択UIを表示・管理するモジュール
//
// 依存: roguelite_options.js（getRandomOptions）
//
// 使い方:
//   RogueliteReward.show({
//     currentStage   : 1,          // クリアしたステージ番号
//     currentOptions : [],         // 現在保持OP配列（表示用）
//     excludeIds     : [],         // 既取得OPのid配列（重複排除）
//     onSelect       : (op) => {}  // 選択後コールバック（op = null のこともある）
//   });

(function () {

  // ── スタイル（1回だけ注入） ────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('rl-reward-style')) return;
    const s = document.createElement('style');
    s.id = 'rl-reward-style';
    s.textContent = `
/* ── オーバーレイ背景 ── */
#rl-reward-overlay {
  position: fixed;
  inset: 0;
  z-index: 200000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.82);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: rl-fade-in 0.28s ease;
  padding: 16px;
  box-sizing: border-box;
}
@keyframes rl-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── メインパネル ── */
.rl-rw-panel {
  width: min(680px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  background: linear-gradient(168deg, #16102a 0%, #09071a 100%);
  border: 1px solid rgba(160,120,255,0.3);
  border-radius: 18px;
  padding: 28px 20px 24px;
  box-shadow: 0 0 60px rgba(110,70,255,0.25), 0 24px 48px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ── ヘッダー ── */
.rl-rw-header { text-align: center; }
.rl-rw-header h2 {
  margin: 0 0 4px;
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: .14em;
  color: #e2d4ff;
  text-shadow: 0 0 18px rgba(150,90,255,0.65);
  font-family: "Cinzel", serif;
}
.rl-rw-header p {
  margin: 0;
  font-size: .73rem;
  color: rgba(190,165,255,0.5);
  letter-spacing: .1em;
  font-family: "Noto Serif JP", serif;
}

/* ── ステージプログレス ── */
.rl-rw-progress {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}
.rl-rw-pip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.rl-rw-pip-bar {
  width: 36px;
  height: 5px;
  border-radius: 3px;
  background: rgba(255,255,255,0.08);
  transition: background .3s;
}
.rl-rw-pip.done   .rl-rw-pip-bar { background: #6c3fff; }
.rl-rw-pip.active .rl-rw-pip-bar { background: #b87fff; box-shadow: 0 0 8px #b87fff; }
.rl-rw-pip-label {
  font-size: .6rem;
  letter-spacing: .06em;
  color: rgba(190,165,255,0.35);
  font-family: "Cinzel", serif;
}
.rl-rw-pip.done   .rl-rw-pip-label { color: #6c3fff; }
.rl-rw-pip.active .rl-rw-pip-label { color: #b87fff; }
.rl-rw-pip-sep {
  width: 18px;
  height: 1px;
  background: rgba(255,255,255,0.07);
  margin-top: -4px;
}

/* ── 3択グリッド ── */
.rl-rw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

/* ── OPカード ── */
.rl-rw-card {
  position: relative;
  cursor: pointer;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(160,120,255,0.18);
  border-radius: 14px;
  padding: 20px 14px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
/* レアリティ帯 */
.rl-rw-card::before {
  content: '';
  position: absolute;
  top: 0; left: 18px; right: 18px;
  height: 2px;
  border-radius: 0 0 2px 2px;
  background: var(--rl-rarity-color, rgba(160,120,255,0.4));
}
.rl-rw-card[data-rarity="common"]::before  { --rl-rarity-color: #7ec8e3; }
.rl-rw-card[data-rarity="rare"]::before    { --rl-rarity-color: #a07cff; }
.rl-rw-card[data-rarity="epic"]::before    { --rl-rarity-color: #ffb347; }

.rl-rw-card:hover {
  transform: translateY(-4px) scale(1.025);
  border-color: rgba(160,120,255,0.65);
  box-shadow: 0 8px 28px rgba(110,60,255,0.28);
}
.rl-rw-card:active { transform: translateY(-1px) scale(0.98); }
.rl-rw-card.selected {
  border-color: #9d6fff;
  background: rgba(110,60,255,0.18);
  box-shadow: 0 0 28px rgba(110,60,255,0.45);
  animation: rl-select-flash .32s ease;
  pointer-events: none;
}
@keyframes rl-select-flash {
  0%   { box-shadow: 0 0 0 rgba(110,60,255,0); }
  50%  { box-shadow: 0 0 44px rgba(110,60,255,0.75); }
  100% { box-shadow: 0 0 28px rgba(110,60,255,0.45); }
}

.rl-rw-card-icon   { font-size: 1.9rem; line-height: 1; }
.rl-rw-card-name   { font-size: .86rem; font-weight: 700; color: #ddd0ff; letter-spacing: .06em; font-family: "Noto Serif JP", serif; }
.rl-rw-card-desc   { font-size: .7rem; color: rgba(190,165,255,0.62); line-height: 1.55; font-family: "Noto Serif JP", serif; }
.rl-rw-card-rarity {
  font-size: .6rem;
  letter-spacing: .1em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 20px;
  border: 1px solid currentColor;
  opacity: .7;
  font-family: "Cinzel", serif;
}
[data-rarity="common"] .rl-rw-card-rarity { color: #7ec8e3; }
[data-rarity="rare"]   .rl-rw-card-rarity { color: #a07cff; }
[data-rarity="epic"]   .rl-rw-card-rarity { color: #ffb347; }

/* ── 現在の保持OP表示 ── */
.rl-rw-current-ops {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rl-rw-current-ops-label {
  font-size: .68rem;
  letter-spacing: .1em;
  color: rgba(190,165,255,0.35);
  font-family: "Cinzel", serif;
  text-align: center;
}
.rl-rw-op-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}
.rl-rw-op-tag {
  font-size: .68rem;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(110,60,200,0.2);
  border: 1px solid rgba(110,60,200,0.35);
  color: #b8a0ff;
  letter-spacing: .06em;
  font-family: "Noto Serif JP", serif;
}

/* ── フッター ── */
.rl-rw-footer {
  text-align: center;
  font-size: .68rem;
  color: rgba(190,165,255,0.28);
  letter-spacing: .08em;
  font-family: "Noto Serif JP", serif;
}
    `;
    document.head.appendChild(s);
  }

  // ── DOM構築 ────────────────────────────────────────────────
  function _buildOverlay(choices, currentStage, currentOptions) {
    const RL = { common: 'コモン', rare: 'レア', epic: 'エピック' };
    const STAGE_LABELS = ['S1', 'S2', 'S3', 'BOSS'];

    // ステージプログレス
    const pipsHtml = [1,2,3,4].map((n, i) => {
      const cls  = n < currentStage ? 'done' : n === currentStage ? 'active' : '';
      const sep  = i < 3 ? '<div class="rl-rw-pip-sep"></div>' : '';
      return `
        <div class="rl-rw-pip ${cls}">
          <div class="rl-rw-pip-bar"></div>
          <div class="rl-rw-pip-label">${STAGE_LABELS[i]}</div>
        </div>${sep}
      `;
    }).join('');

    // 保持OP
    const tagsHtml = currentOptions.length
      ? currentOptions.map(op =>
          `<span class="rl-rw-op-tag">${op.icon || ''} ${op.name}</span>`
        ).join('')
      : '<span style="font-size:.68rem;color:rgba(190,165,255,0.22)">なし</span>';

    // 3択カード
    const cardsHtml = choices.map((op, i) => `
      <div class="rl-rw-card" data-index="${i}" data-rarity="${op.rarity || 'common'}">
        <span class="rl-rw-card-icon">${op.icon || '✦'}</span>
        <span class="rl-rw-card-name">${op.name}</span>
        <span class="rl-rw-card-desc">${op.desc}</span>
        <span class="rl-rw-card-rarity">${RL[op.rarity] || op.rarity}</span>
      </div>
    `).join('');

    const ov = document.createElement('div');
    ov.id = 'rl-reward-overlay';
    ov.innerHTML = `
      <div class="rl-rw-panel">

        <div class="rl-rw-header">
          <h2>⚡ 強化オプション選択</h2>
          <p>STAGE ${currentStage} クリア — 1つを選んでください</p>
        </div>

        <div class="rl-rw-progress">${pipsHtml}</div>

        <div class="rl-rw-grid">${cardsHtml}</div>

        <div class="rl-rw-current-ops">
          <div class="rl-rw-current-ops-label">▸ 現在の保持オプション</div>
          <div class="rl-rw-op-tags">${tagsHtml}</div>
        </div>

        <div class="rl-rw-footer">選択後、次のステージが始まります</div>
      </div>
    `;
    return ov;
  }

  // ── 公開API ────────────────────────────────────────────────

  let _overlay  = null;
  let _callback = null;

  function show({ onSelect, excludeIds, currentStage, currentOptions } = {}) {
    if (_overlay) hide();

    _injectStyles();
    _callback = onSelect || null;

    const choices = (typeof window.getRandomOptions === 'function')
      ? window.getRandomOptions(excludeIds || [])
      : [];

    if (choices.length === 0) {
      console.warn('[RogueliteReward] 選択肢を生成できませんでした');
      if (_callback) _callback(null);
      return;
    }

    _overlay = _buildOverlay(choices, currentStage || 1, currentOptions || []);

    // カードクリック
    _overlay.querySelectorAll('.rl-rw-card').forEach((card, i) => {
      card.addEventListener('click', () => {
        // 二重クリック防止
        _overlay.querySelectorAll('.rl-rw-card')
          .forEach(c => { c.style.pointerEvents = 'none'; });
        card.classList.add('selected');
        const selected = choices[i];
        setTimeout(() => {
          hide();
          if (_callback) _callback(selected);
        }, 360);
      });
    });

    document.body.appendChild(_overlay);
  }

  function hide() {
    if (_overlay) { _overlay.remove(); _overlay = null; }
    _callback = null;
  }

  window.RogueliteReward = { show, hide };

})();
