// Zeraphia SPECIAL EVENT - 銃撃戦 prototype
// DOM-based shooting mini game. Playable characters: エリ / ハヤテ / アヤネ. Boss: remnant_01.
(function () {
  'use strict';

  const ROOT_ID = 'shooting-event-root';
  const PLAYER_ID = 'shooting-player';
  const BOSS_ID = 'shooting-boss';

  const SHOOTING_CHARACTERS = {
    eri: {
      id: 'eri',
      name: 'エリ',
      label: 'BALANCE',
      description: '扱いやすい標準型。2連射で安定して攻める。',
      image: 'images/chara_01_battle_back.webp',
      panelImage: 'images/chara_01_panel.webp',
      ultName: '駆け巡る閃光',
      ultType: 'balance_flash',
      hp: 670,
      moveSpeed: 430,
      fireRate: 170,
      bulletSpeed: 780,
      power: 2,
      shotType: 'double',
      burstDamage: 18,
      burstNeed: 28,
      ultGainPerHit: 1.0,
      coreTop: '38%',
      shotOffsetY: 38,
    },
    hayate: {
      id: 'hayate',
      name: 'ハヤテ',
      label: 'SPEED / WIDE',
      description: '高速移動・高連射。5WAYで広い範囲を制圧する。',
      image: 'images/chara_12_battle_back.webp',
      panelImage: 'images/chara_12_panel.webp',
      ultName: '黄月閃界・雷光巡行',
      ultType: 'speed_storm',
      hp: 580,
      moveSpeed: 560,
      fireRate: 92,
      bulletSpeed: 900,
      power: 0.82,
      shotType: 'spread5',
      spread: 0.19,
      burstDamage: 15,
      burstNeed: 34,
      ultGainPerHit: 0.30,
      coreTop: '34%',
      shotOffsetY: 38,
    },
    ayane: {
      id: 'ayane',
      name: 'アヤネ',
      label: 'TECHNICAL / POWER',
      description: '狭い射線と遅い連射。命中させ続ければ最大火力。',
      image: 'images/chara_14_battle_back.webp',
      panelImage: 'images/chara_14_panel.webp',
      ultName: '暴走',
      ultType: 'precision_beam',
      hp: 740,
      moveSpeed: 360,
      fireRate: 275,
      bulletSpeed: 980,
      power: 6.2,
      shotType: 'precision',
      burstDamage: 27,
      burstNeed: 24,
      ultGainPerHit: 1.0,
      coreTop: '37%',
      shotOffsetY: 42,
    },
  };

  let selectedCharacterId = 'eri';
  let selectedPartyIds = [];
  let selectedBlessingId = null; // UI selection only. Shooting effects are not wired yet.
  const PARTY_SIZE = 3;
  const SWITCH_COOLDOWN_MS = 5000;

  function getCurrentCharacter() {
    const id = state && state.activeCharacterId ? state.activeCharacterId : selectedCharacterId;
    return SHOOTING_CHARACTERS[id] || SHOOTING_CHARACTERS.eri;
  }

  function getActiveMember() {
    if (!state || !Array.isArray(state.party)) return null;
    return state.party.find(m => m.id === state.activeCharacterId) || state.party[0] || null;
  }

  function getPartyMember(id) {
    if (!state || !Array.isArray(state.party)) return null;
    return state.party.find(m => m.id === id) || null;
  }

  const BOSS = {
    id: 'remnant_01',
    name: 'レムナント：オーバーシア',
    image: 'images/remnant_01_battle.webp',
    gaugeHp: 120,
    gauges: 3,
    bulletSpeed: 255,
    fireRate: 760,
    bulletDamage: 200,
  };

  let state = null;
  let rafId = 0;
  let prevTs = 0;
  let keys = Object.create(null);
  let pointerActive = false;
  let pointerX = 0;
  let pointerY = 0;
  let lastTapAt = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeStartAt = 0;
  const SWITCH_SWIPE_MIN_X = 78;
  const SWITCH_SWIPE_MAX_MS = 260;
  const SWITCH_SWIPE_AXIS_RATIO = 1.45;
  const ULT_DOUBLE_TAP_MS = 320;
  const ULT_DOUBLE_TAP_DISTANCE = 72;
  let savedNavDisplay = null;
  let savedFrameDisplay = null;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function rectsHit(a, b, insetA, insetB) {
    const ia = insetA || 0;
    const ib = insetB || 0;
    return !(
      a.right - ia < b.left + ib ||
      a.left + ia > b.right - ib ||
      a.bottom - ia < b.top + ib ||
      a.top + ia > b.bottom - ib
    );
  }

  function buildRoot() {
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
            <strong>銃撃戦</strong>
          </div>
          <div class="shooting-score" id="shooting-score">SCORE 000000</div>
        </header>

        <section class="shooting-boss-hud">
          <div class="shooting-boss-name">REMNANT 01　オーバーシア</div>
          <div class="shooting-boss-bar phase-1" id="shooting-boss-bar"><i></i></div><div class="shooting-boss-phase" id="shooting-boss-phase">PHASE 1 / 3</div>
        </section>

        <div class="shooting-arena" id="shooting-arena">
          <div class="shooting-character-select" id="shooting-character-select" aria-hidden="false">
            <div class="shooting-character-select-card shooting-party-select-card">
              <div class="shooting-party-select-head">
                <strong>パーティ編成</strong>
                <small>最大3人 · 3人選択で出撃</small>
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
                ${Object.values(SHOOTING_CHARACTERS).map(c => `
                  <button type="button" class="shooting-character-option" data-character="${c.id}" onclick="selectShootingCharacter('${c.id}')">
                    <span class="shooting-character-portrait"><img src="${c.panelImage || c.image}" alt="${c.name}" draggable="false"></span>
                    <b>${c.name}</b>
                    <small>${c.label}</small>
                  </button>
                `).join('')}
              </div>
              <button type="button" class="shooting-character-start" id="shooting-character-start" onclick="startSelectedShootingCharacter()">戦闘開始</button>
            </div>
          </div>
          <div class="shooting-start-copy" id="shooting-start-copy">
            <b id="shooting-start-character">ERI</b>
            <span>ドラッグ / WASD・矢印キーで移動</span>
            <small id="shooting-start-type">射撃は自動</small>
          </div>
          <div class="shooting-countdown" id="shooting-countdown" aria-hidden="true"><span>3</span></div>
          <img id="${BOSS_ID}" class="shooting-boss" src="${BOSS.image}" alt="${BOSS.name}" draggable="false">
          <div id="${PLAYER_ID}" class="shooting-player" data-character="eri">
            <img id="shooting-player-image" src="${SHOOTING_CHARACTERS.eri.image}" alt="エリ" draggable="false">
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
          <button class="shooting-burst" id="shooting-burst" type="button" onclick="useShootingBurst()" disabled>
            <span id="shooting-ult-label">ULT</span><i id="shooting-burst-gauge"></i>
          </button>
        </footer>

        <div class="shooting-result" id="shooting-result" aria-hidden="true">
          <div class="shooting-result-card">
            <span id="shooting-result-kicker">SPECIAL EVENT</span>
            <strong id="shooting-result-title">COMPLETE</strong>
            <div id="shooting-result-score">SCORE 000000</div>
            <button type="button" onclick="restartShootingEvent()">RETRY</button>
            <button type="button" class="sub" onclick="closeShootingEvent()">戻る</button>
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
      ['pointerdown','pointermove','pointerup','pointercancel','click'].forEach(type => {
        switchRail.addEventListener(type, ev => ev.stopPropagation(), { passive: false });
      });
    }
    return root;
  }

  function getShootingBlessingDefs() {
    const defs = Array.isArray(window.REMNANT_BLESSINGS) ? window.REMNANT_BLESSINGS : [];
    return defs.filter(Boolean).map((b, i) => ({
      id: String(b.id || b.remnantId || `blessing_${i + 1}`),
      name: String(b.name || b.blessingName || b.title || `加護 ${i + 1}`),
      img: b.panelImg || b.img || b.icon || '',
    }));
  }

  function renderShootingPartySlots() {
    const wrap = document.getElementById('shooting-party-slots');
    if (!wrap) return;
    wrap.innerHTML = Array.from({ length: PARTY_SIZE }, (_, i) => {
      const id = selectedPartyIds[i];
      if (!id) return `<button type="button" class="shooting-party-slot empty" aria-label="空きスロット"><span>${i + 1}</span><b>＋</b></button>`;
      const c = SHOOTING_CHARACTERS[id];
      return `<button type="button" class="shooting-party-slot filled" onclick="removeShootingPartyCharacter('${id}')" aria-label="${c.name}を外す">
        <img src="${c.panelImage || c.image}" alt="${c.name}" draggable="false"><small>${c.name}</small><i>×</i>
      </button>`;
    }).join('');
  }

  function renderShootingBlessingPicker() {
    const picker = document.getElementById('shooting-party-blessing-picker');
    const name = document.getElementById('shooting-party-blessing-name');
    if (!picker) return;
    const defs = getShootingBlessingDefs();
    const selected = defs.find(b => b.id === selectedBlessingId);
    if (name) name.textContent = selected ? selected.name : '加護を選択';
    const rows = [{ id: '', name: '加護なし', img: '' }, ...defs];
    picker.innerHTML = rows.map(b => `<button type="button" class="shooting-blessing-option ${String(selectedBlessingId || '') === b.id ? 'selected' : ''}" onclick="selectShootingBlessing('${b.id.replace(/'/g, "\\'")}')">
      ${b.img ? `<img src="${b.img}" alt="" draggable="false">` : '<span>＋</span>'}<b>${b.name}</b>
    </button>`).join('');
  }

  window.toggleShootingBlessingPicker = function() {
    const picker = document.getElementById('shooting-party-blessing-picker');
    if (!picker) return;
    picker.classList.toggle('show');
  };
  window.selectShootingBlessing = function(id) {
    selectedBlessingId = id || null;
    renderShootingBlessingPicker();
    document.getElementById('shooting-party-blessing-picker')?.classList.remove('show');
  };
  window.removeShootingPartyCharacter = function(id) {
    const idx = selectedPartyIds.indexOf(id);
    if (idx >= 0) selectedPartyIds.splice(idx, 1);
    selectedCharacterId = selectedPartyIds[0] || 'eri';
    applySelectedCharacterToUi();
  };

  function applySelectedCharacterToUi() {
    const c = getCurrentCharacter();
    const player = document.getElementById(PLAYER_ID);
    const img = document.getElementById('shooting-player-image');
    const core = document.getElementById('shooting-player-core');
    const name = document.getElementById('shooting-player-name');
    const startName = document.getElementById('shooting-start-character');
    const startType = document.getElementById('shooting-start-type');
    if (player) player.setAttribute('data-character', c.id);
    if (img) {
      img.src = (c.id === 'hayate' && state && performance.now() < (state.hayateMoonlightUntil || 0)) ? 'images/chara_12_battle_back_moon.webp' : c.image;
      img.alt = c.name;
    }
    if (core) core.style.setProperty('--core-top', c.coreTop || '38%');
    if (name) name.textContent = c.name;
    if (startName) startName.textContent = c.name;
    if (startType) startType.textContent = `${c.label} · 射撃は自動`;
    document.querySelectorAll('.shooting-character-option').forEach(btn => {
      const id = btn.getAttribute('data-character');
      btn.classList.toggle('selected', selectedPartyIds.includes(id));
    });
    renderShootingPartySlots();
    renderShootingBlessingPicker();
    const startBtn = document.getElementById('shooting-character-start');
    if (startBtn) {
      startBtn.disabled = selectedPartyIds.length !== PARTY_SIZE;
      startBtn.textContent = selectedPartyIds.length === PARTY_SIZE ? '戦闘開始' : `あと ${PARTY_SIZE - selectedPartyIds.length}人 選択`;
    }
    renderSwitchRail(true);
  }

  function setBattleHudVisible(visible) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.classList.toggle('battle-hud-visible', !!visible);

    const footer = root.querySelector('.shooting-footer');
    const switchRail = root.querySelector('.shooting-switch-rail');
    if (footer) footer.style.display = visible ? 'flex' : 'none';
    if (switchRail) switchRail.style.display = visible ? '' : 'none';
  }

  function setCharacterSelectVisible(visible) {
    const panel = document.getElementById('shooting-character-select');
    if (!panel) return;
    panel.classList.toggle('show', visible);
    panel.setAttribute('aria-hidden', visible ? 'false' : 'true');
    // 編成画面では戦闘専用のHP/ULT HUD・交代ボタンを絶対に表示しない。
    if (visible) setBattleHudVisible(false);
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

  function resetState() {
    if (selectedPartyIds.length !== PARTY_SIZE) selectedPartyIds = Object.keys(SHOOTING_CHARACTERS).slice(0, PARTY_SIZE);
    selectedCharacterId = selectedPartyIds[0] || 'eri';
    state = {
      running: false, ended: false, finishing: false, countdown: true,
      phaseTransition: false, koTransition: false,
      activeCharacterId: selectedCharacterId,
      switchReadyAt: 0,
      party: selectedPartyIds.map(id => {
        const c = SHOOTING_CHARACTERS[id];
        return { id, hp: c.hp, hpMax: c.hp, burst: 0, ultReadyNotified: false };
      }),
      player: { x: 0, y: 0, invulnUntil: 0 },
      boss: { x: 0, y: 42, hp: BOSS.gaugeHp * BOSS.gauges, hpMax: BOSS.gaugeHp * BOSS.gauges, gaugeHp: BOSS.gaugeHp, gauges: BOSS.gauges, phase: 1 },
      bullets: [], enemyBullets: [], score: 0, shotsHit: 0,
      ultActiveUntil: 0, ultLockUntil: 0, hayateMoonlightUntil: 0,
      ultTimerIds: [], bossGrabUntil: 0, lastShotAt: -9999, lastBossShotAt: -9999, shotIndex: 0,
      startedAt: performance.now(),
    };
  }

  function renderSwitchRail(rebuild) {
    const rail = document.getElementById('shooting-switch-rail');
    if (!rail || !state || !Array.isArray(state.party)) return;
    const others = state.party.filter(m => m.id !== state.activeCharacterId);
    if (rebuild || rail.children.length !== others.length) {
      rail.innerHTML = others.map(m => {
        const c = SHOOTING_CHARACTERS[m.id];
        return `<button type="button" class="shooting-switch-btn" data-switch-id="${m.id}" onclick="switchShootingCharacter('${m.id}')">
          <span class="shooting-switch-ult-ring" aria-hidden="true"></span>
          <img src="${c.panelImage || c.image}" alt="${c.name}" draggable="false">
          <span class="shooting-switch-name">${c.name}</span>
          <span class="shooting-switch-hp"><i></i></span>
          <small class="shooting-switch-status"></small>
        </button>`;
      }).join('');
    }
    const remain = Math.max(0, (state.switchReadyAt || 0) - performance.now());
    rail.querySelectorAll('.shooting-switch-btn').forEach(btn => {
      const id = btn.getAttribute('data-switch-id');
      const m = getPartyMember(id);
      if (!m) return;
      const c = SHOOTING_CHARACTERS[id];
      const hp = btn.querySelector('.shooting-switch-hp i');
      if (hp) hp.style.width = `${clamp(m.hp / m.hpMax, 0, 1) * 100}%`;
      // Bench ULT gauge: the circular ring around each switch button mirrors that member's own ULT charge.
      const ultRing = btn.querySelector('.shooting-switch-ult-ring');
      const ultPct = clamp(m.burst / c.burstNeed, 0, 1);
      if (ultRing) ultRing.style.setProperty('--ult-ring-fill', String(ultPct));
      btn.classList.toggle('ult-ready', ultPct >= 1);
      const dead = m.hp <= 0;
      const cooling = remain > 0;
      btn.disabled = dead || cooling || state.ended || state.finishing || state.koTransition;
      btn.classList.toggle('dead', dead);
      btn.classList.toggle('cooling', cooling && !dead);
      const status = btn.querySelector('.shooting-switch-status');
      if (status) status.textContent = dead ? 'DOWN' : cooling ? `${(remain / 1000).toFixed(1)}s` : (m.burst >= c.burstNeed ? 'ULT READY' : 'CHANGE');
    });
  }

  function stopHayateMoonlightForSwitch() {
    if (!state || state.hayateMoonlightUntil <= performance.now()) return;
    state.hayateMoonlightUntil = 0;
    state.ultActiveUntil = 0;
    document.getElementById(ROOT_ID)?.classList.remove('hayate-moonlight-active');
    document.getElementById(PLAYER_ID)?.classList.remove('hayate-moonlight');
  }

  window.switchShootingCharacter = function(id, forced) {
    if (!state || state.ended || state.finishing || state.countdown || state.koTransition) return;
    const member = getPartyMember(id);
    if (!member || member.hp <= 0 || id === state.activeCharacterId) return;
    const now = performance.now();
    if (!forced && now < (state.switchReadyAt || 0)) return;
    if (getCurrentCharacter().id === 'hayate') stopHayateMoonlightForSwitch();
    state.activeCharacterId = id;
    selectedCharacterId = id;
    state.switchReadyAt = forced ? now + 800 : now + SWITCH_COOLDOWN_MS;
    state.player.invulnUntil = Math.max(state.player.invulnUntil || 0, now + 260);
    state.lastShotAt = -9999;
    applySelectedCharacterToUi();
    const player = document.getElementById(PLAYER_ID);
    if (player) {
      player.classList.remove('character-swap');
      void player.offsetWidth;
      player.classList.add('character-swap');
      setTimeout(() => player.classList.remove('character-swap'), 260);
    }
    renderHud();
  };

  function placeInitialUnits() {
    const arena = document.getElementById('shooting-arena');
    const player = document.getElementById(PLAYER_ID);
    const boss = document.getElementById(BOSS_ID);
    if (!arena || !player || !boss) return;
    const w = arena.clientWidth;
    const h = arena.clientHeight;
    state.player.x = w * 0.5;
    state.player.y = h * 0.82;
    state.boss.x = w * 0.5;
    state.boss.y = Math.max(54, h * 0.16);
    positionUnit(player, state.player.x, state.player.y);
    positionUnit(boss, state.boss.x, state.boss.y);
  }

  function positionUnit(el, x, y) {
    if (!el) return;
    el.style.setProperty('--unit-x', `${x}px`);
    el.style.setProperty('--unit-y', `${y}px`);
    if (el.id === BOSS_ID) {
      el.style.setProperty('--boss-x', `${x}px`);
      el.style.setProperty('--boss-y', `${y}px`);
    }
    el.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
  }

  function clearProjectiles() {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    arena.querySelectorAll('.shooting-bullet,.shooting-enemy-bullet,.shooting-hit').forEach(el => el.remove());
    if (state) {
      state.bullets = [];
      state.enemyBullets = [];
    }
  }

  function renderHud() {
    if (!state) return;
    const bossBar = document.getElementById('shooting-boss-bar');
    const bossGauge = bossBar ? bossBar.querySelector('i') : null;
    const bossPhase = document.getElementById('shooting-boss-phase');
    const score = document.getElementById('shooting-score');
    const hpText = document.getElementById('shooting-player-hp-text');
    const hpBar = document.querySelector('#shooting-player-hp-bar i');
    const burst = document.getElementById('shooting-burst');
    const gauge = document.getElementById('shooting-burst-gauge');
    const ultLabel = document.getElementById('shooting-ult-label');

    const gaugeHp = state.boss.gaugeHp;
    const phase = state.boss.phase || 1;
    const gaugeFloor = (state.boss.gauges - phase) * gaugeHp;
    const currentGaugeHp = clamp(state.boss.hp - gaugeFloor, 0, gaugeHp);
    const amount = currentGaugeHp / gaugeHp;
    if (bossGauge) bossGauge.style.setProperty('--gauge-fill', String(amount));
    if (bossBar) {
      bossBar.classList.remove('phase-1', 'phase-2', 'phase-3');
      bossBar.classList.add(`phase-${phase}`);
    }
    if (bossPhase) bossPhase.textContent = `PHASE ${phase} / 3`;
    if (score) score.textContent = `SCORE ${String(state.score).padStart(6, '0')}`;
    const member = getActiveMember();
    const chara = getCurrentCharacter();
    if (member) {
      if (hpText) hpText.textContent = `${Math.ceil(member.hp)} / ${member.hpMax}`;
      if (hpBar) hpBar.style.width = `${clamp(member.hp / member.hpMax, 0, 1) * 100}%`;
    }
    if (ultLabel) ultLabel.textContent = 'ULT';
    const pct = member ? clamp(member.burst / chara.burstNeed, 0, 1) : 0;
    if (gauge) gauge.style.width = `${pct * 100}%`;
    if (burst) burst.disabled = pct < 1 || state.ended || state.phaseTransition || state.koTransition || performance.now() < (state.ultLockUntil || 0);
    renderSwitchRail(false);
  }

  function showUltReadyNotice() {
    const root = document.getElementById(ROOT_ID);
    if (!root || !state || state.ended) return;

    const old = root.querySelector('.shooting-ult-ready-notice');
    if (old) old.remove();

    const c = getCurrentCharacter();
    const el = document.createElement('div');
    el.className = `shooting-ult-ready-notice ${c.id || ''}`;
    el.innerHTML = `<span>ULT READY</span><strong>ULT 発動可能</strong><small>ダブルタップで発動</small>`;
    root.appendChild(el);

    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => el.classList.add('hide'), 1250);
    setTimeout(() => el.remove(), 1650);
  }

  function makeProjectile(cls, x, y, vx, vy, damage) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;
    const el = document.createElement('i');
    el.className = cls;
    arena.appendChild(el);
    const p = { el, x, y, vx, vy, damage: damage || 1 };
    positionUnit(el, x, y);
    return p;
  }

  function firePlayer(now) {
    const c = getCurrentCharacter();
    const moonlight = c.id === 'hayate' && now < (state.hayateMoonlightUntil || 0);
    const effectiveFireRate = moonlight ? c.fireRate * 0.45 : c.fireRate;
    const effectivePower = moonlight ? c.power * 1.85 : c.power;
    if (now - state.lastShotAt < effectiveFireRate) return;
    state.lastShotAt = now;
    state.shotIndex = (state.shotIndex || 0) + 1;
    const y = state.player.y - c.shotOffsetY;

    if (c.shotType === 'spread5') {
      const spread = c.spread || 0.18;
      [-2, -1, 0, 1, 2].forEach(step => {
        const angle = -Math.PI / 2 + spread * step;
        const speed = c.bulletSpeed;
        state.bullets.push(makeProjectile(
          'shooting-bullet shooting-bullet-hayate',
          state.player.x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          effectivePower
        ));
      });
      return;
    }

    if (c.shotType === 'precision') {
      const heavy = state.shotIndex % 4 === 0;
      state.bullets.push(makeProjectile(
        'shooting-bullet shooting-bullet-ayane' + (heavy ? ' charged' : ''),
        state.player.x,
        y,
        0,
        -c.bulletSpeed,
        heavy ? c.power * 1.65 : c.power
      ));
      return;
    }

    const gap = 9;
    state.bullets.push(makeProjectile('shooting-bullet', state.player.x - gap, y, 0, -c.bulletSpeed, c.power));
    state.bullets.push(makeProjectile('shooting-bullet', state.player.x + gap, y, 0, -c.bulletSpeed, c.power));
  }

  function fireBoss(now) {
    const phase = state.boss.phase || 1;
    const fireRates = { 1: 760, 2: 560, 3: 390 };
    if (now - state.lastBossShotAt < fireRates[phase]) return;
    state.lastBossShotAt = now;

    const dx = state.player.x - state.boss.x;
    const dy = state.player.y - state.boss.y;
    const baseAngle = Math.atan2(dy, dx);
    const patterns = {
      1: [-0.22, 0, 0.22],
      2: [-0.34, -0.17, 0, 0.17, 0.34],
      3: [-0.48, -0.32, -0.16, 0, 0.16, 0.32, 0.48],
    };
    const speed = BOSS.bulletSpeed * (phase === 1 ? 1 : phase === 2 ? 1.08 : 1.16);
    patterns[phase].forEach(offset => {
      const a = baseAngle + offset;
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet',
        state.boss.x, state.boss.y + 42,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        BOSS.bulletDamage
      ));
    });

    // 最終ゲージでは、狙い撃ちの合間に左右へ広がる追加弾を混ぜる。
    if (phase === 3 && Math.floor(now / fireRates[phase]) % 2 === 0) {
      [-0.9, 0.9].forEach(offset => {
        const a = baseAngle + offset;
        state.enemyBullets.push(makeProjectile(
          'shooting-enemy-bullet',
          state.boss.x, state.boss.y + 36,
          Math.cos(a) * speed * 0.92,
          Math.sin(a) * speed * 0.92,
          1
        ));
      });
    }
  }

  function updateBossPhase() {
    if (!state || state.boss.hp <= 0) return;
    const previous = state.boss.phase || 1;
    const remainingGauges = Math.max(1, Math.ceil(state.boss.hp / state.boss.gaugeHp));
    const nextPhase = 4 - remainingGauges; // 3→phase1 / 2→phase2 / 1→phase3
    if (nextPhase !== previous) {
      state.boss.phase = nextPhase;
      beginBossPhaseBreak(nextPhase);
    }
  }

  function beginBossPhaseBreak(phase) {
    if (!state || state.ended || state.finishing) return;
    state.phaseTransition = true;
    state.lastBossShotAt = performance.now();
    state.lastShotAt = performance.now();
    clearProjectiles();
    flashBossPhaseChange(phase);
    renderHud();

    const root = document.getElementById(ROOT_ID);
    if (root) root.classList.add('boss-phase-pause');

    setTimeout(() => {
      if (!state || state.ended || state.finishing) return;
      state.phaseTransition = false;
      state.lastBossShotAt = performance.now();
      state.lastShotAt = performance.now();
      if (root) root.classList.remove('boss-phase-pause');
      renderHud();
    }, 2000);
  }

  function clearEnemyBulletsOnly() {
    if (!state) return;
    state.enemyBullets.forEach(p => p && p.el && p.el.remove());
    state.enemyBullets = [];
  }

  function flashBossPhaseChange(phase) {
    const boss = document.getElementById(BOSS_ID);
    const root = document.getElementById(ROOT_ID);
    if (boss) {
      boss.classList.remove('phase-change');
      void boss.offsetWidth;
      boss.classList.add('phase-change');
      setTimeout(() => boss.classList.remove('phase-change'), 700);
    }
    if (root) {
      root.setAttribute('data-boss-phase', String(phase));
      root.classList.remove('boss-phase-flash');
      void root.offsetWidth;
      root.classList.add('boss-phase-flash');
      setTimeout(() => root.classList.remove('boss-phase-flash'), 650);
    }
  }

  function createHit(x, y, big) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const el = document.createElement('i');
    el.className = 'shooting-hit' + (big ? ' big' : '');
    arena.appendChild(el);
    positionUnit(el, x, y);
    setTimeout(() => el.remove(), 280);
  }

  function flashBossHit(big) {
    const boss = document.getElementById(BOSS_ID);
    if (!boss) return;
    const cls = big ? 'burst-hit' : 'hit-flash';
    boss.classList.remove('hit-flash', 'burst-hit');
    void boss.offsetWidth;
    boss.classList.add(cls);
    setTimeout(() => boss.classList.remove(cls), big ? 420 : 180);
  }

  function updateMovement(dt, now) {
    const arena = document.getElementById('shooting-arena');
    const player = document.getElementById(PLAYER_ID);
    const boss = document.getElementById(BOSS_ID);
    if (!arena || !player || !boss) return;

    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const c = getCurrentCharacter();
    const marginX = 30;
    const minY = h * 0.53;
    const maxY = h - 45;

    if (pointerActive) {
      state.player.x += (pointerX - state.player.x) * Math.min(1, dt * 12);
      state.player.y += (pointerY - state.player.y) * Math.min(1, dt * 12);
    } else {
      let dx = 0, dy = 0;
      if (keys.ArrowLeft || keys.a || keys.A) dx -= 1;
      if (keys.ArrowRight || keys.d || keys.D) dx += 1;
      if (keys.ArrowUp || keys.w || keys.W) dy -= 1;
      if (keys.ArrowDown || keys.s || keys.S) dy += 1;
      if (dx || dy) {
        const l = Math.hypot(dx, dy) || 1;
        state.player.x += dx / l * c.moveSpeed * dt;
        state.player.y += dy / l * c.moveSpeed * dt;
      }
    }
    state.player.x = clamp(state.player.x, marginX, w - marginX);
    state.player.y = clamp(state.player.y, minY, maxY);

    const t = (now - state.startedAt) / 1000;
    const bossGrabbed = now < (state.bossGrabUntil || 0);
    if (!bossGrabbed) {
      state.boss.x = w * 0.5 + Math.sin(t * 0.92) * w * 0.30;
      state.boss.y = Math.max(56, h * 0.17 + Math.sin(t * 1.7) * 12);
    }

    positionUnit(player, state.player.x, state.player.y);
    positionUnit(boss, state.boss.x, state.boss.y);
  }

  function updateProjectiles(dt, now) {
    const arena = document.getElementById('shooting-arena');
    const boss = document.getElementById(BOSS_ID);
    const player = document.getElementById(PLAYER_ID);
    const playerCore = document.getElementById('shooting-player-core');
    if (!arena || !boss || !player || !playerCore) return;
    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const bossRect = boss.getBoundingClientRect();
    const playerCoreRect = playerCore.getBoundingClientRect();

    state.bullets = state.bullets.filter(p => {
      if (!p || !p.el) return false;
      p.x += p.vx * dt; p.y += p.vy * dt;
      positionUnit(p.el, p.x, p.y);
      if (p.y < -20 || p.x < -20 || p.x > w + 20) { p.el.remove(); return false; }
      const r = p.el.getBoundingClientRect();
      if (rectsHit(r, bossRect, 0, 22)) {
        state.boss.hp = Math.max(0, state.boss.hp - p.damage);
        updateBossPhase();
        state.score += 120;
        state.shotsHit++;
        const chara = getCurrentCharacter();
        // ULT中はゲージを回収しない。特にハヤテの月光モードは
        // 高速5WAYによる自己再充填を防ぎ、終了後は0から溜め直す。
        const ultGaugeRecoveryBlocked = now < (state.ultActiveUntil || 0);
        if (!ultGaugeRecoveryBlocked) {
          const gain = Number.isFinite(chara.ultGainPerHit) ? chara.ultGainPerHit : 1;
          const member = getActiveMember();
          if (member) {
            const wasReady = member.burst >= chara.burstNeed;
            member.burst = Math.min(chara.burstNeed, member.burst + gain);
            const isNowReady = member.burst >= chara.burstNeed;
            if (!wasReady && isNowReady && !member.ultReadyNotified) {
              member.ultReadyNotified = true;
              showUltReadyNotice();
            }
          }
        }
        createHit(p.x, p.y, false);
        flashBossHit(false);
        p.el.remove();
        if (state.boss.hp <= 0) beginBossDefeat();
        return false;
      }
      return true;
    });

    state.enemyBullets = state.enemyBullets.filter(p => {
      if (!p || !p.el) return false;
      p.x += p.vx * dt; p.y += p.vy * dt;
      positionUnit(p.el, p.x, p.y);
      if (p.y > h + 30 || p.x < -30 || p.x > w + 30 || p.y < -30) { p.el.remove(); return false; }
      const moonlightInvulnerable = getCurrentCharacter().id === 'hayate' && now < (state.hayateMoonlightUntil || 0);
      if (!moonlightInvulnerable && now >= state.player.invulnUntil) {
        const r = p.el.getBoundingClientRect();
        // 被弾判定はキャラクター画像全体ではなく、胸元の可視コアだけ。
        if (rectsHit(r, playerCoreRect, 0, 1)) {
          p.el.remove();
          damagePlayer(now, p.damage);
          return false;
        }
      }
      return true;
    });
  }

  function damagePlayer(now, amount) {
    if (!state || state.ended || state.koTransition) return;
    const member = getActiveMember();
    if (!member) return;
    member.hp = Math.max(0, member.hp - (Number.isFinite(amount) ? amount : BOSS.bulletDamage));
    state.player.invulnUntil = now + 1150;
    const player = document.getElementById(PLAYER_ID);
    if (player) {
      player.classList.remove('damaged');
      void player.offsetWidth;
      player.classList.add('damaged');
    }
    renderHud();
    if (member.hp <= 0) beginPlayerDefeat();
  }

  function beginPlayerDefeat() {
    if (!state || state.ended || state.finishing || state.koTransition) return;
    const living = state.party.filter(m => m.hp > 0 && m.id !== state.activeCharacterId);
    if (!living.length) {
      state.finishing = true;
      state.running = false;
      state.phaseTransition = false;
      cancelAnimationFrame(rafId);
      clearProjectiles();
      renderHud();
      const player = document.getElementById(PLAYER_ID);
      const root = document.getElementById(ROOT_ID);
      if (player) {
        player.classList.remove('damaged');
        void player.offsetWidth;
        player.classList.add('defeated');
      }
      if (root) {
        root.classList.remove('player-defeat-flash');
        void root.offsetWidth;
        root.classList.add('player-defeat-flash');
      }
      createHit(state.player.x, state.player.y, true);
      setTimeout(() => {
        if (!state || state.ended) return;
        state.finishing = false;
        endGame(false);
      }, 1500);
      return;
    }

    state.koTransition = true;
    clearProjectiles();
    const player = document.getElementById(PLAYER_ID);
    if (player) {
      player.classList.remove('damaged');
      void player.offsetWidth;
      player.classList.add('party-ko');
    }
    createHit(state.player.x, state.player.y, true);
    renderHud();
    setTimeout(() => {
      if (!state || state.ended) return;
      const next = state.party.find(m => m.hp > 0 && m.id !== state.activeCharacterId);
      state.koTransition = false;
      if (!next) return beginPlayerDefeat();
      if (player) player.classList.remove('party-ko');
      window.switchShootingCharacter(next.id, true);
      state.player.invulnUntil = performance.now() + 1200;
      renderHud();
    }, 760);
  }

  function gameLoop(ts) {
    if (!state || !state.running || state.ended || state.finishing || state.countdown) return;
    const dt = Math.min(0.032, Math.max(0, (ts - (prevTs || ts)) / 1000));
    prevTs = ts;
    if (!state.koTransition) updateMovement(dt, ts);
    const ultLocked = ts < (state.ultLockUntil || 0);
    const bossGrabbed = ts < (state.bossGrabUntil || 0);
    if (!state.phaseTransition && !state.koTransition && !ultLocked) {
      firePlayer(ts);
      if (!bossGrabbed) fireBoss(ts);
    }
    updateProjectiles(dt, ts);
    renderHud();
    if (!state.ended) rafId = requestAnimationFrame(gameLoop);
  }

  function runStartCountdown() {
    const countdown = document.getElementById('shooting-countdown');
    const copy = document.getElementById('shooting-start-copy');
    if (!state || !countdown) return;

    state.countdown = true;
    state.running = false;
    if (copy) copy.classList.add('hide');
    countdown.classList.add('show');
    countdown.setAttribute('aria-hidden', 'false');

    const values = ['3', '2', '1'];
    let i = 0;
    const tick = () => {
      if (!state || state.ended) return;
      const span = countdown.querySelector('span');
      if (span) {
        span.textContent = values[i];
        span.classList.remove('pop');
        void span.offsetWidth;
        span.classList.add('pop');
      }
      i += 1;
      if (i < values.length) {
        setTimeout(tick, 720);
        return;
      }
      setTimeout(() => {
        if (!state || state.ended) return;
        countdown.classList.remove('show');
        countdown.setAttribute('aria-hidden', 'true');
        state.countdown = false;
        state.running = true;
        state.startedAt = performance.now();
        state.lastShotAt = -9999;
        state.lastBossShotAt = -9999;
        prevTs = performance.now();
        rafId = requestAnimationFrame(gameLoop);
      }, 650);
    };
    tick();
  }

  function beginBossDefeat() {
    if (!state || state.ended || state.finishing) return;
    state.finishing = true;
    state.running = false;
    cancelAnimationFrame(rafId);

    // 撃破した瞬間に弾を止め、少し余韻を残してからリザルトへ。
    clearProjectiles();
    renderHud();

    const boss = document.getElementById(BOSS_ID);
    const root = document.getElementById(ROOT_ID);
    if (boss) {
      boss.classList.remove('hit-flash', 'burst-hit');
      void boss.offsetWidth;
      boss.classList.add('defeated');
    }
    if (root) {
      root.classList.remove('boss-defeat-flash');
      void root.offsetWidth;
      root.classList.add('boss-defeat-flash');
    }

    // 大きめの撃破エフェクトを数回出す。
    createHit(state.boss.x, state.boss.y, true);
    setTimeout(() => createHit(state.boss.x - 24, state.boss.y + 12, true), 260);
    setTimeout(() => createHit(state.boss.x + 22, state.boss.y - 8, true), 520);

    setTimeout(() => {
      if (!state || state.ended) return;
      state.finishing = false;
      endGame(true);
    }, 1850);
  }

  function endGame(win) {
    if (!state || state.ended) return;
    state.ended = true;
    state.running = false;
    cancelAnimationFrame(rafId);
    clearProjectiles();
    const result = document.getElementById('shooting-result');
    const kicker = document.getElementById('shooting-result-kicker');
    const title = document.getElementById('shooting-result-title');
    const score = document.getElementById('shooting-result-score');
    if (kicker) kicker.textContent = win ? 'REMNANT PURIFIED' : 'MISSION FAILED';
    if (title) title.textContent = win ? 'COMPLETE' : 'LOST';
    if (score) score.textContent = `SCORE ${String(state.score).padStart(6, '0')}`;
    if (result) {
      result.classList.add('show');
      result.setAttribute('aria-hidden', 'false');
    }
    // 終了後は結果画面の裏にも戦闘HUDを残さない。
    setBattleHudVisible(false);
  }

  function onPointerDown(e) {
    if (!state || state.ended || state.countdown || state.finishing) return;

    const now = performance.now();
    const dx = e.clientX - lastTapX;
    const dy = e.clientY - lastTapY;
    const isDoubleTap =
      lastTapAt > 0 &&
      (now - lastTapAt) <= ULT_DOUBLE_TAP_MS &&
      Math.hypot(dx, dy) <= ULT_DOUBLE_TAP_DISTANCE;

    if (isDoubleTap) {
      lastTapAt = 0;
      if (isUltReady()) {
        pointerActive = false;
        window.useShootingBurst();
        e.preventDefault();
        return;
      }
    } else {
      lastTapAt = now;
      lastTapX = e.clientX;
      lastTapY = e.clientY;
    }

    pointerActive = true;
    swipeStartX = e.clientX;
    swipeStartY = e.clientY;
    swipeStartAt = now;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    updatePointer(e);
    e.preventDefault();
  }
  function onPointerMove(e) {
    if (!pointerActive || !state || state.ended || state.countdown || state.finishing) return;
    updatePointer(e);
    e.preventDefault();
  }
  function onPointerUp(e) {
    const wasActive = pointerActive;
    pointerActive = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}

    if (wasActive && state && !state.ended && !state.countdown && !state.finishing && !state.koTransition) {
      const elapsed = performance.now() - swipeStartAt;
      const dx = e.clientX - swipeStartX;
      const dy = e.clientY - swipeStartY;
      const isFlick =
        elapsed <= SWITCH_SWIPE_MAX_MS &&
        Math.abs(dx) >= SWITCH_SWIPE_MIN_X &&
        Math.abs(dx) >= Math.abs(dy) * SWITCH_SWIPE_AXIS_RATIO;

      if (isFlick) {
        const others = state.party.filter(m => m.id !== state.activeCharacterId && m.hp > 0);
        // Right flick -> upper bench / Left flick -> lower bench.
        const target = dx > 0 ? others[0] : others[1];
        if (target) window.switchShootingCharacter(target.id);
      }
    }

    e.preventDefault();
  }
  function updatePointer(e) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const r = arena.getBoundingClientRect();
    pointerX = clamp(e.clientX - r.left, 30, r.width - 30);
    pointerY = clamp(e.clientY - r.top, r.height * 0.53, r.height - 45);
  }

  window.selectShootingCharacter = function (id) {
    if (!SHOOTING_CHARACTERS[id]) return;
    const idx = selectedPartyIds.indexOf(id);
    if (idx >= 0) selectedPartyIds.splice(idx, 1);
    else if (selectedPartyIds.length < PARTY_SIZE) selectedPartyIds.push(id);
    selectedCharacterId = selectedPartyIds[0] || id;
    applySelectedCharacterToUi();
  };

  window.startSelectedShootingCharacter = function () {
    if (selectedPartyIds.length !== PARTY_SIZE) return;
    selectedCharacterId = selectedPartyIds[0];
    resetState();
    clearProjectiles();
    applySelectedCharacterToUi();
    setCharacterSelectVisible(false);
    setBattleHudVisible(true);

    const root = document.getElementById(ROOT_ID);
    const result = document.getElementById('shooting-result');
    const boss = document.getElementById(BOSS_ID);
    const player = document.getElementById(PLAYER_ID);
    if (result) { result.classList.remove('show'); result.setAttribute('aria-hidden', 'true'); }
    if (boss) boss.classList.remove('defeated');
    if (player) player.classList.remove('defeated', 'damaged', 'hayate-moonlight');
    if (root) {
      root.classList.remove('boss-defeat-flash', 'boss-phase-flash', 'boss-phase-pause', 'player-defeat-flash');
      root.setAttribute('data-boss-phase', '1');
    }

    requestAnimationFrame(() => {
      placeInitialUnits();
      renderHud();
      runStartCountdown();
    });
  };

  window.openShootingEvent = function () {
    lastTapAt = 0;
    const root = buildRoot();
    setCommonUiVisible(true);
    root.style.display = 'block';
    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
    resetState();
    clearProjectiles();
    const result = document.getElementById('shooting-result');
    if (result) { result.classList.remove('show'); result.setAttribute('aria-hidden', 'true'); }
    const copy = document.getElementById('shooting-start-copy');
    if (copy) copy.classList.add('hide');
    const boss = document.getElementById(BOSS_ID);
    if (boss) boss.classList.remove('defeated');
    const player = document.getElementById(PLAYER_ID);
    if (player) player.classList.remove('defeated');
    root.classList.remove('boss-defeat-flash', 'boss-phase-flash', 'boss-phase-pause', 'player-defeat-flash');
    root.setAttribute('data-boss-phase', '1');
    selectedPartyIds = [];
    selectedBlessingId = null;
    selectedCharacterId = 'eri';
    applySelectedCharacterToUi();
    setCharacterSelectVisible(true);
    setBattleHudVisible(false);
    requestAnimationFrame(() => {
      placeInitialUnits();
      renderHud();
    });
  };

  window.restartShootingEvent = function () {
    const root = document.getElementById(ROOT_ID);
    if (!root) return window.openShootingEvent();
    resetState();
    clearProjectiles();
    applySelectedCharacterToUi();
    setCharacterSelectVisible(false);
    setBattleHudVisible(true);
    const result = document.getElementById('shooting-result');
    if (result) { result.classList.remove('show'); result.setAttribute('aria-hidden', 'true'); }
    const boss = document.getElementById(BOSS_ID);
    if (boss) boss.classList.remove('defeated');
    const player = document.getElementById(PLAYER_ID);
    if (player) player.classList.remove('defeated');
    root.classList.remove('boss-defeat-flash', 'boss-phase-flash', 'boss-phase-pause', 'player-defeat-flash');
    root.setAttribute('data-boss-phase', '1');
    placeInitialUnits();
    renderHud();
    runStartCountdown();
  };

  window.closeShootingEvent = function () {
    clearUltTimers();
    if (state) { state.running = false; state.ended = true; state.countdown = false; state.finishing = false; }
    cancelAnimationFrame(rafId);
    clearProjectiles();
    pointerActive = false;
    keys = Object.create(null);
    lastTapAt = 0;
    const root = document.getElementById(ROOT_ID);
    if (root) {
      // Close every shooting-only HUD immediately before returning to the previous screen.
      root.querySelectorAll('.shooting-footer, .shooting-switch-rail, .shooting-boss-hud, .shooting-hud').forEach(el => {
        el.style.display = 'none';
      });
      root.classList.remove('open');
      root.setAttribute('aria-hidden', 'true');
      root.style.pointerEvents = 'none';
      root.remove();
    }
    // Safety cleanup for stale nodes from an older build/session.
    document.querySelectorAll('.shooting-footer, .shooting-switch-rail').forEach(el => {
      if (el.closest(`#${ROOT_ID}`) || el.id === 'shooting-switch-rail') el.remove();
    });
    setCommonUiVisible(false);
    state = null;
  };

  function clearUltTimers() {
    if (!state || !Array.isArray(state.ultTimerIds)) return;
    state.ultTimerIds.forEach(id => clearTimeout(id));
    state.ultTimerIds = [];
  }

  function pushUltTimer(fn, delay) {
    if (!state) return;
    const id = setTimeout(() => {
      if (!state || state.ended || state.finishing) return;
      fn();
    }, delay);
    state.ultTimerIds.push(id);
  }

  function showUltCut(name, className) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    const old = root.querySelector('.shooting-ult-cut');
    if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'shooting-ult-cut ' + (className || '');
    el.innerHTML = `<span>ULT</span><strong>${name}</strong>`;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => el.classList.add('hide'), 720);
    setTimeout(() => el.remove(), 1150);
  }

  function ultScreenFlash(className) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.classList.remove('ult-flash-eri','ult-flash-hayate','ult-flash-ayane');
    void root.offsetWidth;
    root.classList.add(className);
    setTimeout(() => root.classList.remove(className), 700);
  }

  function applyUltDamage(amount, big) {
    if (!state || state.ended || state.finishing) return;
    state.boss.hp = Math.max(0, state.boss.hp - amount);
    updateBossPhase();
    createHit(state.boss.x, state.boss.y, !!big);
    flashBossHit(true);
    state.score += Math.round(amount * 100);
    renderHud();
    if (state.boss.hp <= 0) beginBossDefeat();
  }

  function fireUltProjectile(x, y, vx, vy, damage, cls) {
    const p = makeProjectile('shooting-bullet shooting-ult-shot ' + (cls || ''), x, y, vx, vy, damage);
    if (p) state.bullets.push(p);
  }

  function useEriUlt(c) {
    showUltCut(c.ultName, 'eri');
    ultScreenFlash('ult-flash-eri');
    clearEnemyBulletsOnly();
    state.ultLockUntil = performance.now() + 900;
    renderHud();
    pushUltTimer(() => {
      applyUltDamage(c.burstDamage + 8, true);
      renderHud();
    }, 420);
  }

  function useHayateUlt(c) {
    const now = performance.now();
    const MODE_DURATION = 3500;
    const root = document.getElementById(ROOT_ID);
    const player = document.getElementById(PLAYER_ID);

    showUltCut(c.ultName, 'hayate');
    ultScreenFlash('ult-flash-hayate');
    clearEnemyBulletsOnly();

    // 月光モード：3.5秒間、完全無敵＋ATK/攻撃速度アップ。
    // 発動直後だけ短い演出ロックを入れ、その後は強化状態の通常射撃を続ける。
    state.hayateMoonlightUntil = now + MODE_DURATION;
    state.ultActiveUntil = now + MODE_DURATION;
    state.ultLockUntil = now + 320;
    state.player.invulnUntil = Math.max(state.player.invulnUntil || 0, now + MODE_DURATION);
    state.lastShotAt = -9999;

    if (root) {
      root.classList.remove('hayate-moonlight-active');
      void root.offsetWidth;
      root.classList.add('hayate-moonlight-active');
    }
    if (player) player.classList.add('hayate-moonlight');
    const playerImg = document.getElementById('shooting-player-image');
    if (playerImg) playerImg.src = 'images/chara_12_battle_back_moon.webp';
    renderHud();

    pushUltTimer(() => {
      if (!state) return;
      state.hayateMoonlightUntil = 0;
      state.ultActiveUntil = 0;
      if (root) root.classList.remove('hayate-moonlight-active');
      if (player) player.classList.remove('hayate-moonlight');
      const playerImg = document.getElementById('shooting-player-image');
      if (playerImg && getCurrentCharacter().id === 'hayate') {
        playerImg.src = getCurrentCharacter().image;
      }
      renderHud();
    }, MODE_DURATION);
  }

  function useAyaneUlt(c) {
    showUltCut(c.ultName, 'ayane');
    ultScreenFlash('ult-flash-ayane');
    clearEnemyBulletsOnly();

    const now = performance.now();
    const GRAB_DURATION = 5000;
    const STRIKE_DELAY = 760;
    const RELEASE_DELAY = STRIKE_DELAY + GRAB_DURATION;
    // 黒手が飛んでいる間だけ一時停止。命中した場合のみ5秒拘束へ延長する。
    // MISS時に5秒間ボス攻撃だけ止まり続ける不具合を防ぐ。
    state.ultLockUntil = now + STRIKE_DELAY + 220;
    renderHud();

    const arena = document.getElementById('shooting-arena');
    const root = document.getElementById(ROOT_ID);
    const bossEl = document.getElementById(BOSS_ID);
    if (!arena) return;

    const startX = state.player.x;
    const startY = Math.max(24, state.player.y - 18);
    const endX = state.boss.x;
    const endY = Math.max(24, state.boss.y + 14);
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.max(80, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const aligned = Math.abs(state.boss.x - state.player.x) <= 58;

    const fx = document.createElement('div');
    fx.className = 'shooting-ayane-blackhand-ult';
    fx.style.setProperty('--ayane-start-x', `${startX}px`);
    fx.style.setProperty('--ayane-start-y', `${startY}px`);
    fx.style.setProperty('--ayane-end-x', `${endX}px`);
    fx.style.setProperty('--ayane-end-y', `${endY}px`);
    fx.style.setProperty('--ayane-distance', `${distance}px`);
    fx.style.setProperty('--ayane-angle', `${angle}deg`);
    fx.innerHTML = `
      <div class="shooting-ayane-blackhand-aura"></div>
      <div class="shooting-ayane-blackhand-arm">
        <i class="shooting-ayane-blackhand-vein v1"></i>
        <i class="shooting-ayane-blackhand-vein v2"></i>
        <i class="shooting-ayane-blackhand-vein v3"></i>
      </div>
      <div class="shooting-ayane-blackhand-claw">
        <i class="finger f1"></i><i class="finger f2"></i><i class="finger f3"></i><i class="finger f4"></i><i class="finger f5"></i>
        <b class="palm"></b>
      </div>
      <div class="shooting-ayane-blackhand-afterimage a1"></div>
      <div class="shooting-ayane-blackhand-afterimage a2"></div>
      <div class="shooting-ayane-blackhand-afterimage a3"></div>
      <div class="shooting-ayane-blackhand-impact"></div>
      <div class="shooting-ayane-blackhand-grip-ring r1"></div>
      <div class="shooting-ayane-blackhand-grip-ring r2"></div>
      <div class="shooting-ayane-blackhand-grip-ring r3"></div>
      <div class="shooting-ayane-blackhand-smoke s1"></div>
      <div class="shooting-ayane-blackhand-smoke s2"></div>
      <div class="shooting-ayane-blackhand-smoke s3"></div>
      <div class="shooting-ayane-blackhand-smoke s4"></div>
    `;
    arena.appendChild(fx);

    if (root) root.classList.add('ayane-rampage-active');
    requestAnimationFrame(() => fx.classList.add('run'));

    pushUltTimer(() => fx.classList.add('charge'), 180);

    pushUltTimer(() => {
      fx.classList.add('strike');
      if (root) root.classList.add('ayane-rampage-shake');
    }, 520);

    pushUltTimer(() => {
      fx.classList.add(aligned ? 'hit' : 'miss');
      if (!aligned) {
        // MISS：掴み状態には入らず、黒手はそのまま通過して短時間で消える。
        // ボスの横移動・攻撃もすぐ通常状態へ戻す。
        state.bossGrabUntil = 0;
        state.ultLockUntil = performance.now() + 180;
        fx.classList.add('release', 'fade');
        if (root) {
          root.classList.add('ult-miss');
          root.classList.remove('ayane-rampage-shake');
          setTimeout(() => root.classList.remove('ult-miss'), 450);
        }
        setTimeout(() => {
          if (fx && fx.isConnected) fx.remove();
          if (root) root.classList.remove('ayane-rampage-active');
        }, 520);
        renderHud();
        return;
      }

      // 命中時のみ、黒手がボスを5秒間掴んで完全拘束する。
      state.bossGrabUntil = performance.now() + GRAB_DURATION;
      state.ultLockUntil = performance.now() + GRAB_DURATION + 420;
      clearEnemyBulletsOnly();
      fx.classList.add('grab');
      if (bossEl) bossEl.classList.add('ayane-grabbed');

      const totalDamage = c.burstDamage + 22;
      const initialDamage = 5;
      const tickCount = 20; // 250ms × 20 = 5秒
      const tickDamage = Math.max(0.1, (totalDamage - initialDamage) / tickCount);

      // 掴んだ瞬間の初撃。ゲージ段階更新は拘束終了時にまとめる。
      if (state && !state.ended && !state.finishing) {
        state.boss.hp = Math.max(0, state.boss.hp - initialDamage);
        createHit(state.boss.x, state.boss.y, true);
        flashBossHit(true);
        state.score += Math.round(initialDamage * 100);
        renderHud();
        if (state.boss.hp <= 0) beginBossDefeat();
      }

      for (let i = 1; i <= tickCount; i++) {
        pushUltTimer(() => {
          if (!state || state.ended || state.finishing || state.boss.hp <= 0) return;
          state.boss.hp = Math.max(0, state.boss.hp - tickDamage);
          state.score += Math.round(tickDamage * 100);
          if (i % 2 === 0) {
            createHit(state.boss.x + (Math.random() - .5) * 26, state.boss.y + (Math.random() - .5) * 20, false);
            flashBossHit(false);
            fx.classList.remove('grip-pulse');
            void fx.offsetWidth;
            fx.classList.add('grip-pulse');
          }
          renderHud();
          if (state.boss.hp <= 0) beginBossDefeat();
        }, i * 250);
      }

      pushUltTimer(() => {
        if (!state) return;
        state.bossGrabUntil = 0;
        if (bossEl) bossEl.classList.remove('ayane-grabbed');
        fx.classList.remove('grab');
        fx.classList.add('release');
        // 5秒の継続ダメージ終了後にゲージ割り判定を行う。
        if (!state.ended && !state.finishing && state.boss.hp > 0) updateBossPhase();
        renderHud();
      }, GRAB_DURATION);
    }, STRIKE_DELAY);

    pushUltTimer(() => {
      fx.classList.add('fade');
      if (root) {
        root.classList.remove('ayane-rampage-shake');
        root.classList.remove('ayane-rampage-active');
      }
      if (bossEl) bossEl.classList.remove('ayane-grabbed');
      if (state) state.bossGrabUntil = 0;
      renderHud();
    }, RELEASE_DELAY + 240);

    setTimeout(() => {
      fx.remove();
      if (root) {
        root.classList.remove('ayane-rampage-shake');
        root.classList.remove('ayane-rampage-active');
      }
      if (bossEl) bossEl.classList.remove('ayane-grabbed');
      if (state) state.bossGrabUntil = 0;
    }, RELEASE_DELAY + 700);
  }

  function isUltReady() {
    if (!state || state.ended || state.phaseTransition || state.finishing || state.countdown) return false;
    if (performance.now() < (state.ultLockUntil || 0)) return false;
    const c = getCurrentCharacter();
    const member = getActiveMember();
    return !!member && member.burst >= c.burstNeed;
  }

  window.useShootingBurst = function () {
    if (!isUltReady()) return;
    const c = getCurrentCharacter();
    const member = getActiveMember();
    if (!member) return;
    member.burst = 0;
    member.ultReadyNotified = false;
    clearUltTimers();

    if (c.ultType === 'speed_storm') useHayateUlt(c);
    else if (c.ultType === 'precision_beam') useAyaneUlt(c);
    else useEriUlt(c);

    renderHud();
  };

  window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (document.getElementById(ROOT_ID)?.classList.contains('open') && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  }, { passive: false });
  window.addEventListener('keyup', e => { keys[e.key] = false; });
  window.addEventListener('resize', () => {
    if (state && state.running && !state.ended) placeInitialUnits();
  });
})();
