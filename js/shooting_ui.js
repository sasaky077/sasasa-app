// Zeraphia Shooting - DOM/UI shell
(function () {
  'use strict';
  let savedNavDisplay = null;
  let savedFrameDisplay = null;

  function buildRoot(options) {
    const { ROOT_ID, PLAYER_ID, BOSS_ID, BOSS, SHOOTING_CHARACTERS, CHARACTER_ID, getShootingRosterHtml, onPointerDown, onPointerMove, onPointerUp } = options;
    let root = document.getElementById(ROOT_ID);
    if (root) return root;

    root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="shooting-stage" id="shooting-stage">
        <div class="shooting-bg" aria-hidden="true"></div>
        <div class="shooting-wash" aria-hidden="true"></div>

        <header class="shooting-hud">
          <button class="shooting-back" type="button" onclick="closeShootingEvent()" aria-label="戻る">‹</button>
          <div class="shooting-hud-title">
            <span>SPECIAL EVENT</span>
            <strong>無貌の天使</strong>
          </div>
          <div class="shooting-score" id="shooting-score">SCORE 000000</div>
        </header>

        <section class="shooting-boss-hud">
          <div class="shooting-boss-name">${BOSS.displayName || BOSS.name}</div>
          <div class="shooting-boss-bar phase-1" id="shooting-boss-bar"><i></i></div><div class="shooting-boss-phase" id="shooting-boss-phase">PHASE 1 / ${BOSS.gauges}</div>
        </section>
        <section class="shooting-mission-hud" id="shooting-mission-hud" aria-live="polite">
          <span id="shooting-stage-label">CHAPTER 01</span>
          <strong id="shooting-mission-text">MISSION</strong>
          <b id="shooting-mission-progress"></b>
        </section>

        <div class="shooting-arena" id="shooting-arena">
          <div class="shooting-combo" id="shooting-combo" aria-live="polite"><strong id="shooting-combo-count">0</strong><span>COMBO</span></div>
          <div class="shooting-ult-side" id="shooting-ult-side" aria-label="ULTゲージ">
            <div class="shooting-ult-side-copy" aria-hidden="true">
              <span>U L T I M A T E&nbsp;&nbsp;&nbsp;G A U G E</span>
            </div>
            <div class="shooting-ult-side-track">
              <i id="shooting-burst-gauge"></i>
            </div>
          </div>
          <div class="shooting-ult-full-notice" id="shooting-ult-full-notice" aria-live="polite" aria-hidden="true">
            <span>ULT FULL CHARGE</span>
            <small>ダブルタップでULTスキルの使用が可能</small>
          </div>
          <div class="shooting-character-select" id="shooting-character-select" aria-hidden="false">
            <div class="shooting-character-select-card shooting-party-select-card">
              <div class="shooting-party-select-head">
                <strong>パーティ編成</strong>
                <small id="shooting-party-rule-text">最大3人 · 1人から出撃可能</small>
              </div>
              <div class="shooting-party-slots" id="shooting-party-slots"></div>
              <div class="shooting-party-blessing">
                <div class="shooting-party-section-head"><span>加護</span><small>任意 · 1つまで</small></div>
                <button type="button" class="shooting-party-blessing-current" id="shooting-party-blessing-current" onclick="toggleShootingBlessingPicker()">
                  <span class="shooting-party-blessing-plus">＋</span>
                  <span><b id="shooting-party-blessing-name">加護を選択</b><small>タップしてレムナントを選択</small></span>
                </button>
                <div class="shooting-party-blessing-picker" id="shooting-party-blessing-picker"></div>
              </div>
              <div class="shooting-character-grid shooting-party-roster">
                ${getShootingRosterHtml()}
              </div>
              <div class="shooting-party-actions">
                <button type="button" class="shooting-party-cancel" onclick="closeShootingEvent()">キャンセル</button>
                <button type="button" class="shooting-character-start" id="shooting-character-start" onclick="startSelectedShootingCharacter()">戦闘開始</button>
              </div>
            </div>
          </div>
          <div class="shooting-start-copy" id="shooting-start-copy">
            <b id="shooting-start-character">ERI</b>
            <span>ドラッグ / WASD・矢印キーで移動</span>
            <small id="shooting-start-type">射撃は自動</small>
          </div>
          <div class="shooting-countdown" id="shooting-countdown" aria-hidden="true"><span>3</span></div>
          <div class="shooting-normal-enemy-layer" id="shooting-normal-enemy-layer" aria-hidden="true"></div>
          <div class="shooting-collectible-layer" id="shooting-collectible-layer" aria-hidden="true"></div>
          <img id="${BOSS_ID}" class="shooting-boss" src="${BOSS.image}" alt="${BOSS.name}" draggable="false">
          <div id="${PLAYER_ID}" class="shooting-player" data-character-id="1">
            <img id="shooting-player-image" src="${SHOOTING_CHARACTERS[CHARACTER_ID.ERI].image}" alt="エリ" draggable="false">
            <span class="shooting-player-aura"></span>
            <span id="shooting-player-core" class="shooting-player-core" aria-label="被弾判定コア"></span>
          </div>
          <div class="shooting-switch-rail" id="shooting-switch-rail" aria-label="キャラクター切り替え"></div>
        </div>

        <footer class="shooting-footer">
          <div class="shooting-player-hud">
            <div class="shooting-player-hud-top"><div class="shooting-player-name" id="shooting-player-name">エリ</div><div class="shooting-player-hp-text" id="shooting-player-hp-text">670 / 670</div></div>
            <div class="shooting-player-hp-bar" id="shooting-player-hp-bar"><i></i></div>
          </div>
          <div class="shooting-battle-controls">
            <button class="shooting-ui-layout-btn" id="shooting-ui-layout-btn" type="button" onclick="toggleShootingUiLayout()" aria-label="UI表示切替">
              <span id="shooting-ui-layout-label">UI切替</span>
            </button>
            <button class="shooting-battle-menu-btn" id="shooting-battle-menu-btn" type="button" onclick="openShootingPauseMenu()" aria-label="一時停止メニュー">
              <span>MENU</span>
            </button>
          </div>
        </footer>

        <div class="shooting-result" id="shooting-result" aria-hidden="true">
          <div class="shooting-result-card">
            <span id="shooting-result-kicker">SPECIAL EVENT</span>
            <strong id="shooting-result-title">RESULT</strong>
            <div class="shooting-result-rank-wrap">
              <small>RANK</small>
              <b class="shooting-result-rank" id="shooting-result-rank" data-rank="E">E</b>
            </div>
            <div class="shooting-result-stats">
              <div><span>SCORE</span><strong id="shooting-result-score">000000</strong></div>
              <div><span>MAX COMBO</span><strong id="shooting-result-combo">0</strong></div>
            </div>
            <div class="shooting-result-breakdown">
              <div class="shooting-result-detail-row">
                <span class="shooting-result-detail-label">総被弾回数</span>
                <div class="shooting-result-member-list" id="shooting-result-hit-details"></div>
                <strong id="shooting-result-hit-total">0回</strong>
              </div>
              <div class="shooting-result-detail-row">
                <span class="shooting-result-detail-label">ULT使用回数</span>
                <div class="shooting-result-member-list" id="shooting-result-ult-details"></div>
                <strong id="shooting-result-ult-total">0回</strong>
              </div>
              <div class="shooting-result-detail-row">
                <span class="shooting-result-detail-label">生存キャラ数</span>
                <div class="shooting-result-member-list" id="shooting-result-survivor-details"></div>
                <strong id="shooting-result-survivor-total">3/3</strong>
              </div>
              <div class="shooting-result-detail-row shooting-result-time-row">
                <span class="shooting-result-detail-label">クリアタイム</span>
                <strong id="shooting-result-clear-time">0.00秒</strong>
              </div>
            </div>
            <div class="shooting-result-actions">
              <button type="button" onclick="restartShootingEvent()">RETRY</button>
              <button type="button" class="sub" onclick="closeShootingEvent()">戻る</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const arena = root.querySelector('#shooting-arena');
    arena.addEventListener('pointerdown', onPointerDown, { passive: false });
    arena.addEventListener('pointermove', onPointerMove, { passive: false });
    arena.addEventListener('pointerup', onPointerUp, { passive: false });
    arena.addEventListener('pointercancel', onPointerUp, { passive: false });
    const switchRail = root.querySelector('#shooting-switch-rail');
    if (switchRail) {
      // スマホでは click まで待つと、指が数px動いただけでタップがキャンセルされることがある。
      // キャラチェンジは pointerdown の瞬間に確定させ、操作感を優先する。
      switchRail.addEventListener('pointerdown', ev => {
        ev.stopPropagation();

        const btn = ev.target && ev.target.closest
          ? ev.target.closest('.shooting-switch-btn')
          : null;

        if (!btn || btn.disabled) return;

        const id = Number(btn.getAttribute('data-switch-id'));
        if (!Number.isFinite(id)) return;

        ev.preventDefault();

        // 直後に生成されるclickで二重切り替えされないようフラグを付与。
        switchRail.dataset.suppressClick = '1';
        window.switchShootingCharacter(id);

        window.setTimeout(() => {
          if (switchRail) delete switchRail.dataset.suppressClick;
        }, 420);
      }, { passive: false });

      ['pointermove','pointerup','pointercancel'].forEach(type => {
        switchRail.addEventListener(type, ev => ev.stopPropagation(), { passive: false });
      });

      switchRail.addEventListener('click', ev => {
        ev.stopPropagation();
        if (switchRail.dataset.suppressClick === '1') {
          ev.preventDefault();
        }
      }, { passive: false });
    }
    return root;
  }


  function setBattleHudVisible(rootId, visible) {
    const root = document.getElementById(rootId);
    if (!root) return;
    root.classList.toggle('battle-hud-visible', !!visible);
    const footer = root.querySelector('.shooting-footer');
    const switchRail = root.querySelector('.shooting-switch-rail');
    const combo = root.querySelector('.shooting-combo');
    if (footer) footer.style.display = visible ? 'flex' : 'none';
    if (switchRail) switchRail.style.display = visible ? '' : 'none';
    if (combo) combo.style.display = visible ? 'flex' : 'none';
  }

  function setCharacterSelectVisible(rootId, visible) {
    const panel = document.getElementById('shooting-character-select');
    if (!panel) return;
    panel.classList.toggle('show', visible);
    panel.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (visible) setBattleHudVisible(rootId, false);
  }

  function setCommonUiVisible(open) {
    const nav = document.getElementById('bottom-nav-shared');
    const frame = document.getElementById('global-user-frame');
    if (open) {
      savedNavDisplay = nav ? nav.style.display : null;
      savedFrameDisplay = frame ? frame.style.display : null;
      if (nav) nav.style.display = 'none';
      if (frame) frame.style.display = 'none';
    } else {
      if (nav) nav.style.display = savedNavDisplay == null ? '' : savedNavDisplay;
      if (frame) frame.style.display = savedFrameDisplay == null ? '' : savedFrameDisplay;
    }
  }

  window.ShootingUI = Object.freeze({
    buildRoot,
    setBattleHudVisible,
    setCharacterSelectVisible,
    setCommonUiVisible,
  });
})();
