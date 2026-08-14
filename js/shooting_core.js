// Zeraphia SPECIAL EVENT - 銃撃戦 prototype
// DOM-based shooting battle core. Character definitions and UI shell are split into separate modules.
(function () {
  'use strict';

  const ROOT_ID = 'shooting-event-root';
  const PLAYER_ID = 'shooting-player';
  const BOSS_ID = 'shooting-boss';

  let CharacterModule = window.ShootingCharacters;
  let EnemyModule = window.ShootingEnemies;
  let StageModule = window.ShootingStages;
  let UIModule = window.ShootingUI;

  // 旧index等から shooting_core.js が直接読み込まれていても壊れないように、
  // 不足モジュールを自動ロードしてからcore自身を1回だけ再実行する。
  if (!CharacterModule || !EnemyModule || !StageModule || !UIModule) {
    if (!window.__shootingCoreBootstrapPromise) {
      const current = document.currentScript;
      const baseUrl = current && current.src ? new URL('.', current.src) : new URL('./js/', location.href);

      function loadDependency(file, readyCheck) {
        if (readyCheck()) return Promise.resolve();

        return new Promise((resolve, reject) => {
          const absolute = new URL(file, baseUrl).href;
          const existing = Array.from(document.scripts).find(s => {
            try { return new URL(s.src, location.href).pathname === new URL(absolute).pathname; }
            catch (_) { return false; }
          });

          if (existing) {
            const waitStarted = performance.now();
            const wait = () => {
              if (readyCheck()) return resolve();
              if (performance.now() - waitStarted > 5000) {
                return reject(new Error(`Shooting dependency did not initialize: ${file}`));
              }
              setTimeout(wait, 25);
            };
            wait();
            return;
          }

          const script = document.createElement('script');
          script.src = absolute;
          script.async = false;
          script.dataset.shootingBootstrap = file;
          script.onload = () => {
            if (readyCheck()) resolve();
            else reject(new Error(`Shooting dependency loaded but did not initialize: ${file}`));
          };
          script.onerror = () => reject(new Error(`Failed to load shooting dependency: ${file}`));
          document.head.appendChild(script);
        });
      }

      window.__shootingCoreBootstrapPromise =
        loadDependency('shooting_characters.js', () => !!window.ShootingCharacters)
          .then(() => loadDependency('shooting_enemies.js', () => !!window.ShootingEnemies))
          .then(() => loadDependency('shooting_stages.js', () => !!window.ShootingStages))
          .then(() => loadDependency('shooting_ui.js', () => !!window.ShootingUI))
          .then(() => {
            // 依存が揃ったのでcoreを再実行。
            const script = document.createElement('script');
            script.src = new URL(`shooting_core.js?bootstrap=${Date.now()}`, baseUrl).href;
            script.async = false;
            script.dataset.shootingCoreBootstrapRetry = '1';
            document.head.appendChild(script);
          })
          .catch(err => {
            console.error('[shooting] bootstrap failed', err);
            window.__shootingCoreBootstrapPromise = null;
          });
    }
    return;
  }

  const { CHARACTER_ID, SHOOTING_CHARACTERS, PARTY_SIZE, SWITCH_COOLDOWN_MS, isShootingCharacterOwned, getShootingRosterHtml } = CharacterModule;
  const { DEFAULT_SHOOTING_ENEMY_ID, getShootingEnemy } = EnemyModule;
  const { SHOOTING_STAGE_ID, SHOOTING_MISSION_TYPE, getShootingStage } = StageModule;

  window.ShootingCoreReady = true;

  // Stage selection is not separated yet, so Remnant 01 remains the current default.
  // When shooting_stages.js is introduced, set this ID from the selected stage.
  let selectedStageId = SHOOTING_STAGE_ID.CH01_04;
  let selectedStage = getShootingStage(selectedStageId);
  let selectedEnemyId = DEFAULT_SHOOTING_ENEMY_ID;

  function resolveSelectedStage(options) {
    if (options && options.stageId) selectedStageId = String(options.stageId);
    const stage = getShootingStage(selectedStageId);
    if (!stage) throw new Error(`Shooting stage not found: ${selectedStageId}`);
    selectedStage = stage;
    if (Array.isArray(stage.enemyIds) && stage.enemyIds.length) selectedEnemyId = stage.enemyIds[0];
    if (options && options.enemyId) selectedEnemyId = String(options.enemyId);
    return stage;
  }

  function getCurrentShootingEnemy() {
    const enemy = getShootingEnemy(selectedEnemyId);
    if (!enemy || !enemy.implemented) {
      throw new Error(`Shooting enemy is not implemented: ${selectedEnemyId}`);
    }
    return enemy;
  }
  let BOSS = getCurrentShootingEnemy();

  function refreshShootingRoster() {
    const roster = document.querySelector('.shooting-party-roster');
    if (!roster) return;
    roster.innerHTML = getShootingRosterHtml();
    selectedPartyIds = selectedPartyIds.filter(id => isShootingCharacterOwned(id));
  }

  let selectedCharacterId = CHARACTER_ID.ERI;
  let selectedPartyIds = [];
  let selectedBlessingId = null; // UI selection only. Shooting effects are not wired yet.

  function getCurrentCharacter() {
    const id = state && state.activeCharacterId ? state.activeCharacterId : selectedCharacterId;
    return SHOOTING_CHARACTERS[Number(id)] || SHOOTING_CHARACTERS[CHARACTER_ID.ERI];
  }

  function getActiveMember() {
    if (!state || !Array.isArray(state.party)) return null;
    return state.party.find(m => Number(m.id) === Number(state.activeCharacterId)) || state.party[0] || null;
  }

  function getPartyMember(id) {
    if (!state || !Array.isArray(state.party)) return null;
    return state.party.find(m => Number(m.id) === Number(id)) || null;
  }

  let state = null;
  let rafId = 0;
  let prevTs = 0;
  let keys = Object.create(null);
  let pointerActive = false;
  let pointerX = 0;
  let pointerY = 0;

  // スマホでは指そのものが自機/被弾コアを隠してしまうため、
  // タッチ操作時だけ「指より少し上」を実際の移動先にする。
  // マウス操作ではオフセットしない。
  const TOUCH_CONTROL_OFFSET_Y = 76;
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

  // ULTゲージ獲得量の全体倍率。
  // 0.5 = 従来の約2倍の命中数が必要。
  // キャラごとの ultGainPerHit の相対差はそのまま維持する。
  const ULT_GAIN_GLOBAL_MULTIPLIER = 0.5;

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
      return `<button type="button" class="shooting-party-slot filled" onclick="removeShootingPartyCharacter(${id})" aria-label="${c.name}を外す">
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
    id = Number(id);
    const idx = selectedPartyIds.indexOf(id);
    if (idx >= 0) selectedPartyIds.splice(idx, 1);
    selectedCharacterId = selectedPartyIds[0] || CHARACTER_ID.ERI;
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
    if (player) {
      player.setAttribute('data-character-id', String(c.id));
      const battleBackScale = Number(c.uiScale?.battleBack || 1);
      player.style.setProperty('--unit-scale', String(battleBackScale));
    }
    if (img) {
      img.src = (c.id === CHARACTER_ID.HAYATE && state && performance.now() < (state.hayateMoonlightUntil || 0)) ? (c.moonlightImage || c.image) : c.image;
      img.alt = c.name;
    }
    if (core) core.style.setProperty('--core-top', c.coreTop || '38%');
    if (name) name.textContent = c.name;
    if (startName) startName.textContent = c.name;
    if (startType) startType.textContent = `${c.label} · 射撃は自動`;
    document.querySelectorAll('.shooting-character-option').forEach(btn => {
      const id = Number(btn.getAttribute('data-character-id'));
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

  function setBattleHudVisible(visible) { UIModule.setBattleHudVisible(ROOT_ID, visible); }
  function setCharacterSelectVisible(visible) { UIModule.setCharacterSelectVisible(ROOT_ID, visible); }
  function setCommonUiVisible(open) { UIModule.setCommonUiVisible(open); }

  function resetState() {
    if (selectedPartyIds.length !== PARTY_SIZE) {
      selectedPartyIds = Object.keys(SHOOTING_CHARACTERS).map(Number).filter(isShootingCharacterOwned).slice(0, PARTY_SIZE);
    }
    selectedCharacterId = selectedPartyIds[0] || CHARACTER_ID.ERI;
    state = {
      running: false, ended: false, finishing: false, countdown: true,
      phaseTransition: false, koTransition: false,
      activeCharacterId: selectedCharacterId,
      switchReadyAt: 0,
      party: selectedPartyIds.map(id => {
        const c = SHOOTING_CHARACTERS[id];
        return { id, hp: c.hp, hpMax: c.hp, burst: 0, ultReadyNotified: false, hitCount: 0, ultUseCount: 0 };
      }),
      player: { x: 0, y: 0, invulnUntil: 0 },
      battleType: selectedStage && selectedStage.type === 'normal' ? 'normal' : 'boss',
      stageId: selectedStage ? selectedStage.id : null,
      mission: selectedStage ? selectedStage.mission : null,
      missionFailed: false,
      missionComplete: false,
      collectedItems: 0,
      totalHitsTaken: 0,
      normalEnemies: [],
      normalSpawned: 0,
      normalDefeated: 0,
      normalLastSpawnAt: -9999,
      normalEnemyStunUntil: 0,
      collectibles: [],
      boss: {
        x: 0, y: 42,
        hp: Number(BOSS.gaugeHp || BOSS.hp || 1) * Number(BOSS.gauges || 1),
        hpMax: Number(BOSS.gaugeHp || BOSS.hp || 1) * Number(BOSS.gauges || 1),
        gaugeHp: Number(BOSS.gaugeHp || BOSS.hp || 1),
        gauges: Number(BOSS.gauges || 1),
        phase: 1
      },
      bullets: [], enemyBullets: [], score: 0, shotsHit: 0,
      combo: 0, maxCombo: 0, lastComboHitAt: 0,
      ultActiveUntil: 0, ultLockUntil: 0, hayateMoonlightUntil: 0,
      ultCutinActive: false, ultCutinTimer: 0, skipNextUltCut: false,
      arnoAuraUntil: 0, arnoAuraNextTickAt: 0, arnoAuraOwnerId: 0,
      clarineDecoys: [], clarineDecoySeq: 0,
      ignisLaserEl: null, ignisLaserHideAt: 0,
      ignisFireWheel: null,
      ignisBossBurnUntil: 0, ignisBossBurnNextTickAt: 0,
      roseFlower: null, roseHeartSeq: 0,
      ultTimerIds: [], bossGrabUntil: 0, bossStunUntil: 0, lastShotAt: -9999, lastBossShotAt: -9999, shotIndex: 0,
      startedAt: performance.now(), clearTimeMs: 0,
    };
  }

  function renderSwitchRail(rebuild) {
    const rail = document.getElementById('shooting-switch-rail');
    if (!rail || !state || !Array.isArray(state.party)) return;
    const others = state.party.filter(m => m.id !== state.activeCharacterId);
    if (rebuild || rail.children.length !== others.length) {
      rail.innerHTML = others.map(m => {
        const c = SHOOTING_CHARACTERS[m.id];
        return `<button type="button" class="shooting-switch-btn" data-switch-id="${m.id}" onclick="switchShootingCharacter(${m.id})">
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
      const id = Number(btn.getAttribute('data-switch-id'));
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
    id = Number(id);
    if (!state || state.ended || state.finishing || state.countdown || state.koTransition) return;
    const member = getPartyMember(id);
    if (!member || member.hp <= 0 || id === state.activeCharacterId) return;
    const now = performance.now();
    if (!forced && now < (state.switchReadyAt || 0)) return;
    if (getCurrentCharacter().id === CHARACTER_ID.HAYATE) stopHayateMoonlightForSwitch();
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
    if (!arena || !player) return;
    if (!isNormalBattle() && !boss) return;
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

    const isEnemyUnit =
      el.id === BOSS_ID ||
      el.classList.contains('shooting-mini-enemy');

    if (el.id === BOSS_ID) {
      el.style.setProperty('--boss-x', `${x}px`);
      el.style.setProperty('--boss-y', `${y}px`);
    }

    // Scale is placed AFTER translation so changing enemy size never scales
    // the x/y coordinates themselves.
    if (isEnemyUnit) {
      el.style.transform =
        `translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(var(--enemy-scale,1))`;
    } else {
      el.style.transform =
        `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
    }
  }

  function clearProjectiles() {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    arena.querySelectorAll('.shooting-bullet,.shooting-enemy-bullet,.shooting-hit,.shooting-arno-aura,.shooting-clarine-decoy,.shooting-clarine-decoy-burst,.shooting-ignis-laser,.shooting-ignis-fire-wheel,.shooting-ignis-burn,.shooting-rose-flower,.shooting-ult-cutin').forEach(el => el.remove());
    if (state) {
      state.bullets = [];
      state.enemyBullets = [];
      state.clarineDecoys = [];
      state.ignisLaserEl = null;
      state.ignisFireWheel = null;
      state.roseFlower = null;
    }
  }

  function renderHud() {
    if (!state) return;
    const bossBar = document.getElementById('shooting-boss-bar');
    const bossGauge = bossBar ? bossBar.querySelector('i') : null;
    const bossPhase = document.getElementById('shooting-boss-phase');
    const score = document.getElementById('shooting-score');
    const comboCount = document.getElementById('shooting-combo-count');
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
    if (bossPhase) bossPhase.textContent = `PHASE ${phase} / ${state.boss.gauges}`;
    if (score) score.textContent = `SCORE ${String(state.score).padStart(6, '0')}`;
    const bossHud = document.querySelector(`#${ROOT_ID} .shooting-boss-hud`);
    const missionHud = document.getElementById('shooting-mission-hud');
    if (bossHud) bossHud.style.display = isNormalBattle() ? 'none' : '';
    if (missionHud) missionHud.style.display = isNormalBattle() ? 'grid' : 'none';
    if (isNormalBattle() && selectedStage) {
      const stageLabel = document.getElementById('shooting-stage-label');
      const missionText = document.getElementById('shooting-mission-text');
      const missionProgress = document.getElementById('shooting-mission-progress');
      if (stageLabel) stageLabel.textContent = `CHAPTER ${String(selectedStage.chapter).padStart(2,'0')}　${String(selectedStage.stageNo).padStart(2,'0')} ${selectedStage.name}`;
      if (missionText) missionText.textContent = selectedStage.mission?.text || '敵を撃破';
      if (missionProgress) {
        const m = selectedStage.mission || {};
        const total = Number(getNormalBattleConfig().totalEnemies || 0);
        if (m.type === SHOOTING_MISSION_TYPE.COLLECT_ITEM) {
          missionProgress.textContent = `ITEM ${state.collectedItems}/${Number(m.target || 3)}　ENEMY ${state.normalDefeated}/${total}`;
        } else if (m.type === SHOOTING_MISSION_TYPE.CLEAR_TIME) {
          const left = Math.max(0, Number(m.targetSeconds || 60) - (performance.now() - state.startedAt) / 1000);
          missionProgress.textContent = `${left.toFixed(1)}秒　ENEMY ${state.normalDefeated}/${total}`;
        } else if (m.type === SHOOTING_MISSION_TYPE.MAX_HITS_TAKEN) {
          missionProgress.textContent = `被弾 ${state.totalHitsTaken}/${Number(m.maxHits || 3)}　ENEMY ${state.normalDefeated}/${total}`;
        } else {
          missionProgress.textContent = `ENEMY ${state.normalDefeated}/${total}`;
        }
      }
    }
    if (comboCount) comboCount.textContent = String(state.combo || 0);
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

  function pulseCombo(milestone) {
    const combo = document.getElementById('shooting-combo');
    if (!combo) return;
    combo.classList.remove('pulse', 'milestone');
    void combo.offsetWidth;
    combo.classList.add('pulse');
    if (milestone) combo.classList.add('milestone');
    setTimeout(() => combo.classList.remove('pulse', 'milestone'), milestone ? 520 : 220);
  }

  function resetCombo() {
    if (!state || !state.combo) return;
    state.combo = 0;
    state.lastComboHitAt = 0;
    renderHud();
  }

  function applyBossStun(durationMs, source) {
    if (!state || state.ended || state.finishing) return;
    const now = performance.now();
    if (isNormalBattle()) {
      // ネムのスタンは「これから行う敵の攻撃」を止めるだけ。
      // すでに発射済みの敵弾まで消してしまうと、通常射撃の30COMBOごとに
      // 画面上の敵弾が着弾前に突然消えるため、既存弾は残す。
      state.normalEnemyStunUntil = Math.max(state.normalEnemyStunUntil || 0, now + durationMs);
      return;
    }
    if (state.boss.hp <= 0) return;
    state.bossStunUntil = Math.max(state.bossStunUntil || 0, now + durationMs);
    state.lastBossShotAt = state.bossStunUntil;
    const boss = document.getElementById(BOSS_ID);
    const root = document.getElementById(ROOT_ID);
    if (boss) boss.classList.add('nem-stunned');
    if (root) {
      root.classList.add('nem-stun-active');
      root.setAttribute('data-nem-stun-source', source || 'combo');
    }
    const expectedUntil = state.bossStunUntil;
    setTimeout(() => {
      if (!state || state.ended || (state.bossStunUntil || 0) > performance.now() + 8 || state.bossStunUntil !== expectedUntil) return;
      state.bossStunUntil = 0;
      if (boss) boss.classList.remove('nem-stunned');
      if (root) {
        root.classList.remove('nem-stun-active');
        root.removeAttribute('data-nem-stun-source');
      }
      state.lastBossShotAt = performance.now();
    }, durationMs + 30);
  }

  function registerComboHit(ownerId, now) {
    if (!state || state.ended || state.finishing) return;
    state.combo = (state.combo || 0) + 1;
    state.maxCombo = Math.max(state.maxCombo || 0, state.combo);
    state.lastComboHitAt = now;
    pulseCombo(false);
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

  function makeProjectile(cls, x, y, vx, vy, damage, ownerId) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;
    const el = document.createElement('i');
    el.className = cls;
    arena.appendChild(el);
    const p = { el, x, y, vx, vy, damage: damage || 1, ownerId: ownerId || null };
    positionUnit(el, x, y);
    return p;
  }

  function getCharacterElements(c) {
    if (!c) return [];
    const raw =
      c.element ??
      c.attribute ??
      c.typeAttribute ??
      c.affinity ??
      [];

    const list = Array.isArray(raw) ? raw : [raw];
    return list
      .map(v => String(v || '').toLowerCase().trim())
      .filter(Boolean);
  }

  function getCharacterBulletClass(c) {
    const elements = getCharacterElements(c);

    const hasMystis = elements.some(v => v === 'mystis' || v === 'ミスティス');
    const hasLogos = elements.some(v => v === 'logos' || v === 'ロゴス');
    const hasChaos = elements.some(v => v === 'chaos' || v === 'カオス');

    if (hasMystis && hasLogos) return ' shooting-bullet-mystis-logos';
    if (hasMystis && hasChaos) return ' shooting-bullet-mystis-chaos';
    if (hasLogos && hasChaos) return ' shooting-bullet-logos-chaos';
    if (hasMystis) return ' shooting-bullet-mystis';
    if (hasLogos) return ' shooting-bullet-logos';
    if (hasChaos) return ' shooting-bullet-chaos';
    return '';
  }

  function createArnoOrbitProjectile(c, now) {
    const startY = state.player.y - c.shotOffsetY;
    const attrClass = getCharacterBulletClass(c);
    const p = makeProjectile(
      'shooting-bullet shooting-bullet-arno' + attrClass,
      state.player.x,
      startY,
      0,
      -Number(c.bulletSpeed || 455),
      Number(c.power || 3),
      c.id
    );
    if (!p) return null;

    p.kind = 'arno_orbit_forward';
    p.centerX = state.player.x;
    p.centerY = startY;
    p.orbitPhase = ((state.shotIndex || 0) % Math.max(1, Number(c.shotCount || 1))) * Number(c.orbitPhaseStep || Math.PI);
    p.orbitRadius = Number(c.orbitRadius || 34);
    p.orbitAngularSpeed = Number(c.orbitAngularSpeed || 13.5);
    p.orbitForwardLoopRate = Number(c.orbitForwardLoopRate || .30);
    p.forwardSpeed = Number(c.bulletSpeed || 455);
    p.createdAt = now;
    return p;
  }

  function updateArnoOrbitProjectile(p, dt) {
    // No homing: the projectile advances straight upward while drawing
    // a circular/corkscrew orbit around its forward axis.
    p.centerY -= p.forwardSpeed * dt;
    p.orbitPhase += p.orbitAngularSpeed * dt;

    const side = Math.sin(p.orbitPhase) * p.orbitRadius;
    const forwardLoop = Math.cos(p.orbitPhase) * p.orbitRadius * Number(p.orbitForwardLoopRate || .30);

    p.x = p.centerX + side;
    p.y = p.centerY + forwardLoop;
  }

  function getCharacterShotStyleClass(c) {
    const style = String(c?.shotStyle || '').trim().toLowerCase();
    if (!style || style === 'normal') return '';
    return ` shooting-bullet-${style}`;
  }

  function getCenteredShotOffset(index, count, spacing) {
    return (index - (count - 1) / 2) * spacing;
  }

  function hideIgnisLaser() {
    if (!state || !state.ignisLaserEl) return;
    state.ignisLaserEl.classList.remove('active');
  }

  function ensureIgnisLaser(c) {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !state) return null;

    let el = state.ignisLaserEl;
    if (!el || !el.isConnected) {
      el = document.createElement('div');
      el.className = 'shooting-ignis-laser';
      el.innerHTML = '<i></i><b></b>';
      arena.appendChild(el);
      state.ignisLaserEl = el;
    }
    el.style.setProperty('--ignis-laser-width', `${Number(c.laserWidth || 12)}px`);
    return el;
  }

  function getIgnisLaserTarget(x, startY, hitWidth) {
    if (!state) return null;

    if (isNormalBattle()) {
      const candidates = (state.normalEnemies || [])
        .filter(enemy =>
          enemy && enemy.el && enemy.hp > 0 &&
          Math.abs(Number(enemy.x || 0) - x) <= hitWidth &&
          Number(enemy.y || 0) < startY
        )
        .sort((a, b) => Number(b.y || 0) - Number(a.y || 0));

      return candidates[0] || null;
    }

    if (
      state.boss && state.boss.hp > 0 &&
      Math.abs(Number(state.boss.x || 0) - x) <= hitWidth &&
      Number(state.boss.y || 0) < startY
    ) {
      return { isBoss: true, x: state.boss.x, y: state.boss.y };
    }
    return null;
  }

  function fireIgnisLaser(c, now) {
    if (!state) return;

    const startX = state.player.x;
    const startY = state.player.y - Number(c.shotOffsetY || 42);
    const hitWidth = Number(c.laserHitWidth || 22);
    const target = getIgnisLaserTarget(startX, startY, hitWidth);

    const beamEndY = target ? Number(target.y || 0) : 12;
    const beamHeight = Math.max(18, startY - beamEndY);

    const el = ensureIgnisLaser(c);
    if (el) {
      el.style.left = `${startX}px`;
      el.style.top = `${startY}px`;
      el.style.height = `${beamHeight}px`;
      el.classList.add('active');
      state.ignisLaserHideAt = now + Number(c.laserVisualHoldMs || 130);
    }

    if (!target) return;

    const damage = Number(c.atk || 0) * Number(c.laserDamageAtkRate || 0.105);
    const member = getPartyMember(c.id);

    if (target.isBoss) {
      state.boss.hp = Math.max(0, state.boss.hp - damage);
      createHit(state.boss.x, state.boss.y, false);
      flashBossHit(false);
      state.score += Math.round(damage * 100);
      updateBossPhase();
      if (state.boss.hp <= 0) beginBossDefeat();
    } else {
      damageNormalEnemy(target, damage, now, false);
      state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
    }

    state.shotsHit++;
    registerComboHit(c.id, now);

    if (member) {
      const baseGain = Number.isFinite(c.ultGainPerHit) ? c.ultGainPerHit : 0.3;
      const gain = baseGain * ULT_GAIN_GLOBAL_MULTIPLIER;
      const wasReady = member.burst >= c.burstNeed;
      member.burst = Math.min(c.burstNeed, member.burst + gain);
      if (!wasReady && member.burst >= c.burstNeed && !member.ultReadyNotified) {
        member.ultReadyNotified = true;
        if (c.id === state.activeCharacterId) showUltReadyNotice();
      }
    }
  }

  function firePlayer(now) {
    const c = getCurrentCharacter();
    const attrBulletClass = getCharacterBulletClass(c);
    const styleClass = getCharacterShotStyleClass(c);

    const moonlight =
      c.id === CHARACTER_ID.HAYATE &&
      now < (state.hayateMoonlightUntil || 0);

    const fireRateMultiplier = moonlight
      ? Number(c.moonlightFireRateMultiplier || 1)
      : 1;

    const powerMultiplier = moonlight
      ? Number(c.moonlightPowerMultiplier || 1)
      : 1;

    const effectiveFireRate = Number(c.fireRate || 170) * fireRateMultiplier;
    const effectivePower =
      Number(c.atk || 0) *
      Number(c.shotPowerRate || 0.095) *
      powerMultiplier;

    if (now - state.lastShotAt < effectiveFireRate) return;

    state.lastShotAt = now;
    state.shotIndex = (state.shotIndex || 0) + 1;

    const y = state.player.y - Number(c.shotOffsetY || 38);
    const shotCount = Math.max(1, Math.floor(Number(c.shotCount || 1)));
    const bulletClass = 'shooting-bullet' + styleClass + attrBulletClass;

    // ----------------------------------------------------------
    // イグニス：連続レーザー
    // ----------------------------------------------------------
    if (c.shotType === 'laser') {
      fireIgnisLaser(c, now);
      return;
    }

    // ----------------------------------------------------------
    // アルノ系：前進しながら円環軌道
    // ----------------------------------------------------------
    if (c.shotType === 'orbit_forward') {
      for (let i = 0; i < shotCount; i++) {
        const p = createArnoOrbitProjectile(c, now);
        if (!p) continue;

        p.orbitPhase =
          i * Number(c.orbitPhaseStep || (Math.PI * 2 / shotCount));

        const spacing = Number(c.shotSpacing || 0);
        if (spacing) {
          const offset = getCenteredShotOffset(i, shotCount, spacing);
          p.centerX += offset;
          p.x += offset;
        }

        state.bullets.push(p);
      }
      return;
    }

    // ----------------------------------------------------------
    // ロゼ：種まきスプラッシュ
    // 1秒ごとにふわっと広がる種弾を散布
    // ----------------------------------------------------------
    if (c.shotType === 'rose_seed_splash') {
      const angleStep = Number(c.shotAngleStep || 0.17);

      for (let i = 0; i < shotCount; i++) {
        const step = i - (shotCount - 1) / 2;
        const jitter = (Math.random() - 0.5) * 0.08;
        const speedScale = 0.82 + Math.random() * 0.24;
        const angle = -Math.PI / 2 + angleStep * step + jitter;

        const p = makeProjectile(
          bulletClass,
          state.player.x,
          y,
          Math.cos(angle) * Number(c.bulletSpeed || 335) * speedScale,
          Math.sin(angle) * Number(c.bulletSpeed || 335) * speedScale,
          effectivePower,
          c.id
        );
        if (p) {
          p.kind = 'rose_seed';
          state.bullets.push(p);
        }
      }
      return;
    }

    // ----------------------------------------------------------
    // 扇状ショット
    // shotCount / shotAngleStep をキャラJSだけで調整
    // ----------------------------------------------------------
    if (c.shotType === 'spread') {
      const angleStep = Number(c.shotAngleStep || 0.18);

      for (let i = 0; i < shotCount; i++) {
        const step = i - (shotCount - 1) / 2;
        const angle = -Math.PI / 2 + angleStep * step;

        state.bullets.push(makeProjectile(
          bulletClass,
          state.player.x,
          y,
          Math.cos(angle) * Number(c.bulletSpeed || 780),
          Math.sin(angle) * Number(c.bulletSpeed || 780),
          effectivePower,
          c.id
        ));
      }
      return;
    }

    // ----------------------------------------------------------
    // 精密射撃
    // chargedEvery / chargedPowerMultiplier もキャラJS側
    // ----------------------------------------------------------
    if (c.shotType === 'precision') {
      const chargedEvery = Math.max(0, Math.floor(Number(c.chargedEvery || 0)));
      const heavy = chargedEvery > 0 && state.shotIndex % chargedEvery === 0;
      const chargedMultiplier = Number(c.chargedPowerMultiplier || 1);

      for (let i = 0; i < shotCount; i++) {
        const spacing = Number(c.shotSpacing || 0);
        const offset = getCenteredShotOffset(i, shotCount, spacing);

        state.bullets.push(makeProjectile(
          bulletClass + (heavy ? ' charged' : ''),
          state.player.x + offset,
          y,
          0,
          -Number(c.bulletSpeed || 780),
          heavy ? effectivePower * chargedMultiplier : effectivePower,
          c.id
        ));
      }
      return;
    }

    // ----------------------------------------------------------
    // 並列ショット
    // shotCount / shotSpacing をキャラJSだけで調整
    // ----------------------------------------------------------
    const spacing = Number(c.shotSpacing || 0);

    for (let i = 0; i < shotCount; i++) {
      const offset = getCenteredShotOffset(i, shotCount, spacing);

      state.bullets.push(makeProjectile(
        bulletClass,
        state.player.x + offset,
        y,
        0,
        -Number(c.bulletSpeed || 780),
        effectivePower,
        c.id
      ));
    }
  }

  function isNormalBattle() {
    return !!(state && state.battleType === 'normal');
  }

  function getNormalBattleConfig() {
    return (selectedStage && selectedStage.normalBattle) || {};
  }

  function positionMiniEnemyHp(enemy) {
    if (!enemy || !enemy.hpEl) return;

    const scale = Math.max(0.1, Number(enemy.def && enemy.def.uiScale || 1));

    // Base mobile enemy box is about 60px tall.
    // Keep the HP bar just above the visible unit as uiScale changes.
    const hpOffsetY = 30 * scale + 9;

    enemy.hpEl.style.transform =
      `translate3d(${enemy.x}px,${enemy.y - hpOffsetY}px,0) translate(-50%,-50%)`;
  }

  function renderMiniEnemyHp(enemy, flash) {
    if (!enemy || !enemy.hpEl) return;
    const fill = enemy.hpEl.querySelector('i');
    const max = Math.max(1, Number(enemy.hpMax || 1));
    const ratio = Math.max(0, Math.min(1, Number(enemy.hp || 0) / max));
    if (fill) fill.style.transform = `scaleX(${ratio})`;

    enemy.hpEl.classList.toggle('low', ratio <= .30);

    if (flash) {
      enemy.hpEl.classList.remove('hit');
      void enemy.hpEl.offsetWidth;
      enemy.hpEl.classList.add('hit');
      setTimeout(() => enemy.hpEl && enemy.hpEl.classList.remove('hit'), 180);
    }
  }

  function createNormalEnemy(enemyDef, now) {
    const arena = document.getElementById('shooting-arena');
    const layer = document.getElementById('shooting-normal-enemy-layer');
    if (!arena || !layer || !enemyDef) return null;

    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const el = document.createElement('img');
    el.className = 'shooting-mini-enemy spawning';
    el.src = enemyDef.image;
    el.alt = enemyDef.name || '敵';
    el.draggable = false;
    el.style.setProperty('--enemy-scale', String(Number(enemyDef.uiScale || 1)));
    layer.appendChild(el);

    // 雑魚敵共通HPバー
    const hpWrap = document.createElement('div');
    hpWrap.className = 'shooting-mini-enemy-hp';
    hpWrap.setAttribute('aria-hidden', 'true');
    hpWrap.innerHTML = '<i></i>';
    layer.appendChild(hpWrap);

    const lane = state.normalSpawned % 4;
    const lanes = [w * .20, w * .40, w * .60, w * .80];
    const x = lanes[lane] + (Math.random() - .5) * Math.min(28, w * .06);
    const y = Math.max(92, h * (.16 + (state.normalSpawned % 2) * .075));
    const enemy = {
      uid: `mini_${Date.now()}_${state.normalSpawned}_${Math.random().toString(36).slice(2,6)}`,
      def: enemyDef, el, hpEl: hpWrap, x, y, baseX: x, baseY: y,
      hp: Number(enemyDef.hp || 18),
      hpMax: Number(enemyDef.hp || 18),
      spawnedAt: now,
      lastShotAt: now + Math.random() * 500,
      phaseSeed: Math.random() * Math.PI * 2,
      nextActionAt: now + 900 + Math.random() * 450,
      actionIndex: state.normalSpawned % 3,
      attackState: 'idle',
      attackExecuteAt: 0,
      dashUntil: 0,
      dashVx: 0,
      dashVy: 0,
    };
    positionUnit(el, x, y);
    positionMiniEnemyHp(enemy);
    renderMiniEnemyHp(enemy);
    requestAnimationFrame(() => el.classList.remove('spawning'));
    return enemy;
  }

  function spawnNormalEnemies(now) {
    if (!isNormalBattle() || state.finishing || state.ended) return;
    const cfg = getNormalBattleConfig();
    const total = Number(cfg.totalEnemies || 7);
    const maxActive = Number(cfg.maxActive || 2);
    const interval = Number(cfg.spawnIntervalMs || 900);
    if (state.normalSpawned >= total || state.normalEnemies.length >= maxActive) return;
    if (now - state.normalLastSpawnAt < interval) return;
    const enemyId = selectedStage && selectedStage.enemyIds && selectedStage.enemyIds[0];
    const def = getShootingEnemy(enemyId);
    if (!def || !def.implemented) return;
    const enemy = createNormalEnemy(def, now);
    if (!enemy) return;
    state.normalEnemies.push(enemy);
    state.normalSpawned++;
    state.normalLastSpawnAt = now;
  }

  function shootNormalEnemyProjectile(enemy, angle, speed, damage, className) {
    state.enemyBullets.push(makeProjectile(
      className || 'shooting-enemy-bullet shooting-mini-enemy-bullet',
      enemy.x, enemy.y + 24,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      damage
    ));
  }

  function fireNormalEnemy(enemy, now) {
    if (!enemy || !enemy.el || now < (state.normalEnemyStunUntil || 0)) return;
    const def = enemy.def || {};

    // CHAPTER 02: 暴威の残穢
    // 「重撃 → 圧力弾 → 突進」を繰り返し、弾幕ではなく個の圧力を作る。
    if (def.behavior === 'mini_violence_v1') {
      if (enemy.attackState === 'telegraph') {
        if (now < enemy.attackExecuteAt) return;

        enemy.el.classList.remove('violence-warning');
        const dx = state.player.x - enemy.x;
        const dy = state.player.y - enemy.y;
        const baseAngle = Math.atan2(dy, dx);
        const action = enemy.actionIndex % 3;

        if (action === 0) {
          // 重撃：大きく、速く、痛い単発。
          shootNormalEnemyProjectile(
            enemy,
            baseAngle,
            Number(def.bulletSpeed || 250),
            Number(def.heavyShotDamage || 210),
            'shooting-enemy-bullet shooting-mini-enemy-bullet shooting-violence-heavy'
          );
        } else if (action === 1) {
          // 圧力弾：3方向で逃げ道を削る。
          [-0.34, 0, 0.34].forEach(offset => {
            shootNormalEnemyProjectile(
              enemy,
              baseAngle + offset,
              Number(def.bulletSpeed || 250) * .88,
              Number(def.pressureShotDamage || 150),
              'shooting-enemy-bullet shooting-mini-enemy-bullet shooting-violence-pressure'
            );
          });
        } else {
          // 突進：予兆後、プレイヤーの現在位置へ一気に踏み込む。
          const speed = Number(def.chargeSpeed || 520);
          enemy.dashVx = Math.cos(baseAngle) * speed;
          enemy.dashVy = Math.sin(baseAngle) * speed;
          enemy.dashUntil = now + 520;
          enemy.attackState = 'dash';
          enemy.el.classList.add('violence-dash');
          return;
        }

        enemy.actionIndex = (enemy.actionIndex + 1) % 3;
        enemy.attackState = 'idle';
        enemy.nextActionAt = now + Number(def.fireRate || 1900);
        return;
      }

      if (enemy.attackState === 'dash') return;
      if (now < (enemy.nextActionAt || 0)) return;

      enemy.attackState = 'telegraph';
      enemy.attackExecuteAt = now + Number(def.telegraphMs || 520);
      enemy.el.classList.add('violence-warning');
      return;
    }

    if (def.behavior === 'mini_barrage_v1') {
      if (now - enemy.lastShotAt < Number(def.fireRate || 1220)) return;
      enemy.lastShotAt = now;

      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      const baseAngle = Math.atan2(dy, dx);
      const speed = Number(def.bulletSpeed || 220);
      const pattern = enemy.actionIndex % 3;

      if (pattern === 0) {
        // 5WAYの素直な扇状弾。まず避けるリズムを作る。
        [-0.42, -0.21, 0, 0.21, 0.42].forEach(offset => {
          shootNormalEnemyProjectile(
            enemy,
            baseAngle + offset,
            speed,
            Number(def.bulletDamage || 105),
            'shooting-enemy-bullet shooting-mini-enemy-bullet'
          );
        });
      } else if (pattern === 1) {
        // 少し回転した7WAY。前回とズラして通路を狭める。
        const phaseOffset = Math.sin((enemy.phaseSeed || 0) + now * 0.0032) * 0.18;
        [-0.54, -0.36, -0.18, 0, 0.18, 0.36, 0.54].forEach(offset => {
          shootNormalEnemyProjectile(
            enemy,
            baseAngle + offset + phaseOffset,
            speed * 0.96,
            Number(def.bulletDamage || 105),
            'shooting-enemy-bullet shooting-mini-enemy-bullet'
          );
        });
      } else {
        // 薄いリング。全周だが数は抑え、見た目ほど理不尽になりすぎないようにする。
        const start = (enemy.phaseSeed || 0) + now * 0.0022;
        const count = 10;
        for (let i = 0; i < count; i++) {
          const angle = start + (Math.PI * 2 * i / count);
          shootNormalEnemyProjectile(
            enemy,
            angle,
            speed * 0.82,
            Math.max(80, Number(def.bulletDamage || 105) - 10),
            'shooting-enemy-bullet shooting-mini-enemy-bullet'
          );
        }
      }

      enemy.actionIndex = (enemy.actionIndex + 1) % 3;
      return;
    }

    // CHAPTER 01など既存敵。
    if (now - enemy.lastShotAt < Number(def.fireRate || 1550)) return;
    enemy.lastShotAt = now;
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const angle = Math.atan2(dy, dx);
    const speed = Number(def.bulletSpeed || 185);
    shootNormalEnemyProjectile(
      enemy,
      angle,
      speed,
      Number(def.bulletDamage || 85),
      'shooting-enemy-bullet shooting-mini-enemy-bullet'
    );
  }

  function updateNormalEnemies(dt, now) {
    if (!isNormalBattle()) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const w = arena.clientWidth;
    const h = arena.clientHeight;

    state.normalEnemies.forEach(enemy => {
      if (!enemy || !enemy.el) return;
      const def = enemy.def || {};

      if (def.behavior === 'mini_violence_v1' && enemy.attackState === 'dash') {
        enemy.x += enemy.dashVx * dt;
        enemy.y += enemy.dashVy * dt;
        enemy.x = clamp(enemy.x, 34, w - 34);
        enemy.y = clamp(enemy.y, 46, h - 48);
        positionUnit(enemy.el, enemy.x, enemy.y);
        positionMiniEnemyHp(enemy);

        if (now >= enemy.dashUntil) {
          enemy.attackState = 'idle';
          enemy.actionIndex = (enemy.actionIndex + 1) % 3;
          enemy.nextActionAt = now + 1150;
          enemy.baseX = enemy.x;
          enemy.baseY = clamp(enemy.y, 78, Math.max(90, h * .40));
          enemy.el.classList.remove('violence-dash');
        }
        return;
      }

      const age = (now - enemy.spawnedAt) / 1000;

      if (def.behavior === 'mini_violence_v1') {
        // 強敵は細かく漂わず、重くゆっくりと位置を変える。
        const targetBaseY = Math.max(84, Math.min(h * .34, enemy.baseY));
        enemy.x = clamp(enemy.baseX + Math.sin(age * .62 + enemy.phaseSeed) * Math.min(38, w * .09), 36, w - 36);
        enemy.y = targetBaseY + Math.sin(age * .48 + enemy.phaseSeed) * 10;
      } else if (def.behavior === 'mini_barrage_v1') {
        // 弾幕担当の雑魚。上空で横移動しながら、交差する角度を作る。
        enemy.x = clamp(enemy.baseX + Math.sin(age * 1.08 + enemy.phaseSeed) * Math.min(72, w * .18), 36, w - 36);
        enemy.y = Math.max(76, Math.min(h * .34, enemy.baseY)) + Math.sin(age * .76 + enemy.phaseSeed * 1.7) * 14;
      } else {
        enemy.x = clamp(enemy.baseX + Math.sin(age * 1.25 + enemy.phaseSeed) * Math.min(58, w * .14), 36, w - 36);
        enemy.y = enemy.baseY + Math.sin(age * .9 + enemy.phaseSeed) * 8;
      }

      positionUnit(enemy.el, enemy.x, enemy.y);
      positionMiniEnemyHp(enemy);
      fireNormalEnemy(enemy, now);
    });
  }

  function shouldDropMissionItem(defeatedNo) {
    if (!selectedStage || selectedStage.mission?.type !== SHOOTING_MISSION_TYPE.COLLECT_ITEM) return false;
    const target = Number(selectedStage.mission.target || 3);
    if (state.collectedItems + state.collectibles.length >= target) return false;
    const total = Number(getNormalBattleConfig().totalEnemies || 7);
    const milestones = Array.from({length: target}, (_, i) => Math.max(1, Math.round(total * (i + 1) / (target + 1))));
    return milestones.includes(defeatedNo) || defeatedNo >= total - (target - state.collectedItems - state.collectibles.length);
  }

  function spawnMissionItem(x, y) {
    const layer = document.getElementById('shooting-collectible-layer');
    if (!layer) return;
    const el = document.createElement('div');
    el.className = 'shooting-mission-item';
    el.innerHTML = '<i></i>';
    layer.appendChild(el);
    const item = { uid:`item_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, el, x, y:Math.max(y + 18, 150) };
    state.collectibles.push(item);
    positionUnit(el, item.x, item.y);
  }

  function updateCollectibles(dt) {
    if (!isNormalBattle() || !state.collectibles.length) return;
    const playerCore = document.getElementById('shooting-player-core');
    if (!playerCore) return;
    const coreRect = playerCore.getBoundingClientRect();
    state.collectibles = state.collectibles.filter(item => {
      if (!item || !item.el) return false;
      item.y += 16 * dt;
      positionUnit(item.el, item.x, item.y);
      if (rectsHit(item.el.getBoundingClientRect(), coreRect, -5, -3)) {
        item.el.remove();
        state.collectedItems++;
        state.score += 500;
        evaluateNormalMission(performance.now());
        return false;
      }
      return true;
    });
  }

  function damageNormalEnemy(enemy, amount, now, big) {
    if (!enemy || enemy.hp <= 0) return;
    enemy.hp = Math.max(0, enemy.hp - Number(amount || 0));
    renderMiniEnemyHp(enemy, true);
    createHit(enemy.x, enemy.y, !!big);
    if (enemy.el) {
      enemy.el.classList.remove('hit-flash');
      void enemy.el.offsetWidth;
      enemy.el.classList.add('hit-flash');
      setTimeout(() => enemy.el && enemy.el.classList.remove('hit-flash'), 140);
    }
    if (enemy.hp > 0) return;

    state.normalDefeated++;
    state.score += Number(enemy.def?.scoreValue || 650);
    if (shouldDropMissionItem(state.normalDefeated)) spawnMissionItem(enemy.x, enemy.y);
    if (enemy.el) {
      const old = enemy.el;
      const isViolenceEnemy = enemy.def && enemy.def.behavior === 'mini_violence_v1';

      // CHAPTER 02の強敵は、倒したことが分かるように撃破演出を強化。
      old.classList.remove('hit-flash', 'violence-warning', 'violence-dash');
      old.classList.add('defeated');
      if (isViolenceEnemy) old.classList.add('violence-defeated');

      setTimeout(() => old.remove(), isViolenceEnemy ? 620 : 260);
    }
    if (enemy.hpEl) {
      const oldHp = enemy.hpEl;
      oldHp.classList.add('defeated');
      setTimeout(() => oldHp.remove(), 220);
    }
    removeIgnisBurnVisual(String(enemy.uid || 'enemy'));
    enemy.el = null;
    enemy.hpEl = null;
    evaluateNormalMission(now);
  }

  function evaluateNormalMission(now) {
    if (!isNormalBattle() || state.ended || state.finishing) return;
    const mission = state.mission || {};
    const cfg = getNormalBattleConfig();
    const total = Number(cfg.totalEnemies || 0);
    const allDefeated = total > 0 && state.normalDefeated >= total && state.normalSpawned >= total;

    if (mission.type === SHOOTING_MISSION_TYPE.CLEAR_TIME) {
      if ((now - state.startedAt) / 1000 > Number(mission.targetSeconds || 60)) {
        state.missionFailed = true;
        endGame(false);
        return;
      }
      state.missionComplete = allDefeated;
    } else if (mission.type === SHOOTING_MISSION_TYPE.MAX_HITS_TAKEN) {
      if (state.totalHitsTaken > Number(mission.maxHits || 3)) {
        state.missionFailed = true;
        endGame(false);
        return;
      }
      state.missionComplete = allDefeated;
    } else if (mission.type === SHOOTING_MISSION_TYPE.COLLECT_ITEM) {
      state.missionComplete = allDefeated && state.collectedItems >= Number(mission.target || 3);
    } else {
      state.missionComplete = allDefeated;
    }
    if (state.missionComplete) beginNormalStageClear();
  }

  function beginNormalStageClear() {
    if (!state || state.ended || state.finishing) return;
    state.finishing = true;
    state.running = false;
    cancelAnimationFrame(rafId);
    clearEnemyBulletsOnly();
    renderHud();
    document.getElementById(ROOT_ID)?.classList.add('normal-stage-clear');
    setTimeout(() => {
      if (!state || state.ended) return;
      const root = document.getElementById(ROOT_ID);
      if (root) root.classList.remove('normal-stage-clear');
      state.finishing = false;
      endGame(true);
    }, 900);
  }

  function clearNormalBattleObjects() {
    if (!state) return;
    (state.normalEnemies || []).forEach(enemy => enemy?.el?.remove());
    (state.collectibles || []).forEach(item => item?.el?.remove());
    state.normalEnemies = [];
    state.collectibles = [];
    const layer = document.getElementById('shooting-normal-enemy-layer');
    if (layer) layer.innerHTML = '';
    const items = document.getElementById('shooting-collectible-layer');
    if (items) items.innerHTML = '';
  }

  function fireViolenceBoss(now) {
    const phase = state.boss.phase || 1;
    const interval = phase === 1 ? 1050 : phase === 2 ? 820 : 650;
    if (now - state.lastBossShotAt < interval) return;
    state.lastBossShotAt = now;

    const dx = state.player.x - state.boss.x;
    const dy = state.player.y - state.boss.y;
    const baseAngle = Math.atan2(dy, dx);
    const speed = Number(BOSS.bulletSpeed || 285);

    // 暴力は弾数ではなく、一発の圧で押す。
    if (phase === 1) {
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet shooting-violence-boss-heavy',
        state.boss.x, state.boss.y + 42,
        Math.cos(baseAngle) * speed,
        Math.sin(baseAngle) * speed,
        Number(BOSS.bulletDamage || 230)
      ));
      return;
    }

    if (phase === 2) {
      [-0.22, 0.22].forEach(offset => {
        const a = baseAngle + offset;
        state.enemyBullets.push(makeProjectile(
          'shooting-enemy-bullet shooting-violence-boss-heavy',
          state.boss.x, state.boss.y + 40,
          Math.cos(a) * speed * 1.04,
          Math.sin(a) * speed * 1.04,
          Number(BOSS.bulletDamage || 230)
        ));
      });
      return;
    }

    // 最終段階だけ3方向。弾幕化はさせず、逃げ道を削る。
    [-0.30, 0, 0.30].forEach(offset => {
      const a = baseAngle + offset;
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet shooting-violence-boss-heavy',
        state.boss.x, state.boss.y + 38,
        Math.cos(a) * speed * 1.10,
        Math.sin(a) * speed * 1.10,
        Number(BOSS.bulletDamage || 230)
      ));
    });
  }

  function fireBarrageBoss(now) {
    const phase = state.boss.phase || 1;
    const interval = phase === 1 ? 860 : phase === 2 ? 690 : 540;
    if (now - state.lastBossShotAt < interval) return;
    state.lastBossShotAt = now;

    const dx = state.player.x - state.boss.x;
    const dy = state.player.y - state.boss.y;
    const baseAngle = Math.atan2(dy, dx);
    const speed = Number(BOSS.bulletSpeed || 248);
    state.boss.patternTick = (state.boss.patternTick || 0) + 1;
    const tick = state.boss.patternTick;

    if (phase === 1) {
      // 7WAYの主弾 + たまに小リング
      [-0.54, -0.36, -0.18, 0, 0.18, 0.36, 0.54].forEach(offset => {
        const a = baseAngle + offset;
        state.enemyBullets.push(makeProjectile(
          'shooting-enemy-bullet',
          state.boss.x, state.boss.y + 40,
          Math.cos(a) * speed,
          Math.sin(a) * speed,
          Number(BOSS.bulletDamage || 210)
        ));
      });

      if (tick % 2 === 0) {
        const start = now * 0.0022;
        for (let i = 0; i < 10; i++) {
          const a = start + (Math.PI * 2 * i / 10);
          state.enemyBullets.push(makeProjectile(
            'shooting-enemy-bullet',
            state.boss.x, state.boss.y + 30,
            Math.cos(a) * speed * 0.74,
            Math.sin(a) * speed * 0.74,
            Math.max(1, Number(BOSS.bulletDamage || 210) - 25)
          ));
        }
      }
      return;
    }

    if (phase === 2) {
      // 9WAYの厚い弾幕 + 交差リング
      [-0.68, -0.51, -0.34, -0.17, 0, 0.17, 0.34, 0.51, 0.68].forEach(offset => {
        const a = baseAngle + offset;
        state.enemyBullets.push(makeProjectile(
          'shooting-enemy-bullet',
          state.boss.x, state.boss.y + 40,
          Math.cos(a) * speed * 1.02,
          Math.sin(a) * speed * 1.02,
          Number(BOSS.bulletDamage || 210)
        ));
      });

      const start = (tick % 2 === 0 ? 0 : Math.PI / 12) + now * 0.0028;
      for (let i = 0; i < 12; i++) {
        const a = start + (Math.PI * 2 * i / 12);
        state.enemyBullets.push(makeProjectile(
          'shooting-enemy-bullet',
          state.boss.x, state.boss.y + 28,
          Math.cos(a) * speed * 0.82,
          Math.sin(a) * speed * 0.82,
          Math.max(1, Number(BOSS.bulletDamage || 210) - 18)
        ));
      }
      return;
    }

    // 最終段階: 11WAY + 高密度リング。しんどい弾幕。
    [-0.80, -0.64, -0.48, -0.32, -0.16, 0, 0.16, 0.32, 0.48, 0.64, 0.80].forEach(offset => {
      const a = baseAngle + offset;
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet',
        state.boss.x, state.boss.y + 38,
        Math.cos(a) * speed * 1.08,
        Math.sin(a) * speed * 1.08,
        Number(BOSS.bulletDamage || 210)
      ));
    });

    const start = now * 0.0034 + (tick % 2 ? Math.PI / 18 : 0);
    for (let i = 0; i < 14; i++) {
      const a = start + (Math.PI * 2 * i / 14);
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet',
        state.boss.x, state.boss.y + 26,
        Math.cos(a) * speed * 0.86,
        Math.sin(a) * speed * 0.86,
        Math.max(1, Number(BOSS.bulletDamage || 210) - 15)
      ));
    }
  }

  function fireBoss(now) {
    if (BOSS && BOSS.behavior === 'violence_v1') {
      fireViolenceBoss(now);
      return;
    }
    if (BOSS && BOSS.behavior === 'barrage_v1') {
      fireBarrageBoss(now);
      return;
    }

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
    // プレイヤーの中心座標を、バトルアリーナ全体まで移動可能にする。
    // 以前は敵の手前でY座標を止めていたため接触できなかった。
    const marginX = 26;
    const minY = 34;
    const maxY = h - 38;

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
    const bossStunned = now < (state.bossStunUntil || 0);
    if (!isNormalBattle() && !bossGrabbed && !bossStunned) {
      if (BOSS && BOSS.behavior === 'violence_v1') {
        const phase = state.boss.phase || 1;
        const follow = phase === 1 ? .018 : phase === 2 ? .028 : phase === 3 ? .042 : .042;
        const targetX = clamp(state.player.x, 58, w - 58);
        const targetY = clamp(state.player.y - (phase === 3 ? 90 : 145), 62, h * .72);
        state.boss.x += (targetX - state.boss.x) * Math.min(1, follow * 60 * dt);
        state.boss.y += (targetY - state.boss.y) * Math.min(1, follow * 42 * dt);
        // 微妙な横揺れだけ残し、「追われている」圧を優先する。
        state.boss.x = clamp(state.boss.x + Math.sin(t * 1.15) * .7, 54, w - 54);
        state.boss.y = clamp(state.boss.y, 56, h * .74);
      } else if (BOSS && BOSS.behavior === 'barrage_v1') {
        const phase = state.boss.phase || 1;
        const xAmp = phase === 1 ? w * 0.22 : phase === 2 ? w * 0.28 : w * 0.32;
        const centerFollow = phase === 3 ? 0.18 : 0.10;
        const playerInfluence = (state.player.x - w * 0.5) * centerFollow;
        state.boss.x = clamp(w * 0.5 + playerInfluence + Math.sin(t * (0.86 + phase * 0.08)) * xAmp, 56, w - 56);
        state.boss.y = Math.max(58, h * (phase === 3 ? 0.16 : 0.18) + Math.sin(t * (1.35 + phase * 0.18)) * (phase === 3 ? 18 : 12));
      } else {
        state.boss.x = w * 0.5 + Math.sin(t * 0.92) * w * 0.30;
        state.boss.y = Math.max(56, h * 0.17 + Math.sin(t * 1.7) * 12);
      }
    }

    positionUnit(player, state.player.x, state.player.y);
    if (boss && !isNormalBattle()) positionUnit(boss, state.boss.x, state.boss.y);
  }

  function updateProjectiles(dt, now) {
    const arena = document.getElementById('shooting-arena');
    const boss = document.getElementById(BOSS_ID);
    const player = document.getElementById(PLAYER_ID);
    const playerCore = document.getElementById('shooting-player-core');
    if (!arena || !player || !playerCore) return;
    if (!isNormalBattle() && !boss) return;
    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const bossRect = boss && !isNormalBattle() ? boss.getBoundingClientRect() : null;
    const playerCoreRect = playerCore.getBoundingClientRect();

    state.bullets = state.bullets.filter(p => {
      if (!p || !p.el) return false;
      if (p.kind === 'arno_orbit_forward') {
        updateArnoOrbitProjectile(p, dt);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      positionUnit(p.el, p.x, p.y);

      if (p.kind === 'rose_heart') {
        if (p.y < -30 || p.y > h + 30 || p.x < -30 || p.x > w + 30 || now >= Number(p.expireAt || 0)) {
          p.el.remove();
          return false;
        }

        const r = p.el.getBoundingClientRect();
        const playerRect = player.getBoundingClientRect();

        // 味方(現状はアクティブなプレイヤー)に当たると回復。
        if (rectsHit(r, playerRect, 0, 4)) {
          healRoseParty(p.healAmount || 0);
          p.el.remove();
          return false;
        }

        // 敵に当たるとロゼATK参照のダメージ。
        // この分岐は通常弾のコンボ/ULT加算処理へ進まないため、
        // ハートによるダメージではULTゲージを一切増やさない。
        const hitBossHeart = !isNormalBattle() && bossRect && rectsHit(r, bossRect, 0, 16);
        const hitNormalHeart = isNormalBattle()
          ? state.normalEnemies.find(enemy => enemy && enemy.el && enemy.hp > 0 && rectsHit(r, enemy.el.getBoundingClientRect(), 0, 10))
          : null;

        if (hitBossHeart || hitNormalHeart) {
          const rose = SHOOTING_CHARACTERS[CHARACTER_ID.ROSE];
          const heartDamage =
            Number(rose?.atk || 0) *
            Number(rose?.flowerHeartDamageAtkRate || 0.30);

          if (hitNormalHeart) {
            damageNormalEnemy(hitNormalHeart, heartDamage, now, false);
            state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
          } else if (hitBossHeart && state.boss) {
            state.boss.hp = Math.max(0, state.boss.hp - heartDamage);
            updateBossPhase();
            createHit(p.x, p.y, false);
            flashBossHit(false);
            if (state.boss.hp <= 0) beginBossDefeat();
          }

          // noComboGain / noUltGain を明示しているが、
          // そもそもこの専用分岐でreturnするため通常のゲージ加算処理には入らない。
          p.noComboGain = true;
          p.noUltGain = true;
          p.el.remove();
          return false;
        }
        return true;
      }

      if (p.y < -20 || p.x < -20 || p.x > w + 20) { p.el.remove(); return false; }
      const r = p.el.getBoundingClientRect();
      let normalTarget = null;
      const hitBoss = !isNormalBattle() && bossRect && rectsHit(r, bossRect, 0, 22);
      if (isNormalBattle()) {
        normalTarget = state.normalEnemies.find(enemy => enemy && enemy.el && enemy.hp > 0 && rectsHit(r, enemy.el.getBoundingClientRect(), 0, 13));
      }
      if (normalTarget || hitBoss) {
        const ownerId = p.ownerId || state.activeCharacterId;
        const chara = SHOOTING_CHARACTERS[ownerId] || getCurrentCharacter();
        const member = getPartyMember(ownerId) || getActiveMember();
        if (normalTarget) {
          damageNormalEnemy(normalTarget, p.damage, now, false);
          state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
        } else {
          state.boss.hp = Math.max(0, state.boss.hp - p.damage);
          updateBossPhase();
          state.score += 120;
          createHit(p.x, p.y, false);
          flashBossHit(false);
          if (state.boss.hp <= 0) beginBossDefeat();
        }
        state.shotsHit++;

        if (!p.noComboGain) {
          registerComboHit(ownerId, now);
        }

        const ownerMoonlightBlocked =
          Number(ownerId) === CHARACTER_ID.HAYATE &&
          now < (state.hayateMoonlightUntil || 0);

        if (!p.noUltGain && !ownerMoonlightBlocked) {
          const baseGain = Number.isFinite(chara.ultGainPerHit) ? chara.ultGainPerHit : 1;
          const gain = baseGain * ULT_GAIN_GLOBAL_MULTIPLIER;
          if (member) {
            const wasReady = member.burst >= chara.burstNeed;
            member.burst = Math.min(chara.burstNeed, member.burst + gain);
            if (!wasReady && member.burst >= chara.burstNeed && !member.ultReadyNotified) {
              member.ultReadyNotified = true;
              if (ownerId === state.activeCharacterId) showUltReadyNotice();
            }
          }
        }
        p.el.remove();
        return false;
      }
      return true;
    });

    state.enemyBullets = state.enemyBullets.filter(p => {
      if (!p || !p.el) return false;
      p.x += p.vx * dt; p.y += p.vy * dt;
      positionUnit(p.el, p.x, p.y);
      if (p.y > h + 30 || p.x < -30 || p.x > w + 30 || p.y < -30) { p.el.remove(); return false; }
      const r = p.el.getBoundingClientRect();

      // ロゼULTの花は、効果時間中「壁」として敵弾を遮断する。
      // 花自体にはHPを持たせず、敵弾は接触した時点で消滅。
      const roseFlower = state.roseFlower;
      if (roseFlower && roseFlower.el && roseFlower.el.isConnected) {
        const flowerRect = roseFlower.el.getBoundingClientRect();
        if (rectsHit(r, flowerRect, 0, 28)) {
          p.el.remove();
          return false;
        }
      }

      const hitDecoy = (state.clarineDecoys || []).find(decoy =>
        decoy && decoy.el && rectsHit(r, decoy.el.getBoundingClientRect(), 12, 8)
      );
      if (hitDecoy) {
        const c = getClarineDecoyConfig();
        hitDecoy.hp = Math.max(0, hitDecoy.hp - Number(p.damage || 0));
        if (hitDecoy.el) {
          hitDecoy.el.classList.remove('hit');
          void hitDecoy.el.offsetWidth;
          hitDecoy.el.classList.add('hit');
          setTimeout(() => hitDecoy.el && hitDecoy.el.classList.remove('hit'), 120);
        }
        p.el.remove();
        if (hitDecoy.hp <= 0) {
          breakClarineDecoy(hitDecoy, c);
          state.clarineDecoys = state.clarineDecoys.filter(decoy => decoy && decoy.el);
        }
        return false;
      }

      const moonlightInvulnerable = getCurrentCharacter().id === CHARACTER_ID.HAYATE && now < (state.hayateMoonlightUntil || 0);
      if (!moonlightInvulnerable && now >= state.player.invulnUntil) {
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

  function updateEnemyContactCollisions(now) {
    if (!state || state.ended || state.finishing || state.koTransition || state.countdown) return;
    if (now < (state.player.invulnUntil || 0)) return;

    // ハヤテの月光中は弾と同様、接触ダメージも無効。
    const moonlightInvulnerable = getCurrentCharacter().id === CHARACTER_ID.HAYATE && now < (state.hayateMoonlightUntil || 0);
    if (moonlightInvulnerable) return;

    const player = document.getElementById(PLAYER_ID);
    if (!player) return;
    const playerRect = player.getBoundingClientRect();

    if (isNormalBattle()) {
      const hitEnemy = state.normalEnemies.find(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return false;
        // 画像の透明余白で早すぎる接触にならないよう、双方を少し内側へ絞る。
        return rectsHit(playerRect, enemy.el.getBoundingClientRect(), 14, 9);
      });
      if (hitEnemy) {
        damagePlayer(now, Number(hitEnemy.def && (hitEnemy.def.contactDamage || hitEnemy.def.bulletDamage)) || 85);
      }
      return;
    }

    const boss = document.getElementById(BOSS_ID);
    if (!boss || !state.boss || state.boss.hp <= 0) return;
    if (rectsHit(playerRect, boss.getBoundingClientRect(), 14, 18)) {
      damagePlayer(now, Number(BOSS.contactDamage || BOSS.bulletDamage) || 200);
    }
  }

  function damagePlayer(now, amount) {
    if (!state || state.ended || state.koTransition) return;
    const member = getActiveMember();
    if (!member) return;
    // COMBOは時間経過では切れない。プレイヤーが被弾した瞬間だけ0へ戻す。
    resetCombo();
    member.hitCount = (member.hitCount || 0) + 1;
    state.totalHitsTaken = (state.totalHitsTaken || 0) + 1;
    member.hp = Math.max(0, member.hp - (Number.isFinite(amount) ? amount : BOSS.bulletDamage));
    if (isNormalBattle()) evaluateNormalMission(now);
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


  const ULT_CUTIN_DURATION_MS = 1000;

  function clearUltCutin() {
    const root = document.getElementById(ROOT_ID);
    if (state && state.ultCutinTimer) {
      clearTimeout(state.ultCutinTimer);
      state.ultCutinTimer = 0;
    }
    if (state) state.ultCutinActive = false;
    if (root) {
      root.classList.remove('ult-cutin-active');
      root.querySelectorAll('.shooting-ult-cutin').forEach(el => el.remove());
    }
  }

  function playUltCutin(c, onComplete) {
    if (!state || state.ended || state.finishing) return;

    clearUltCutin();

    const root = document.getElementById(ROOT_ID);
    const arena = document.getElementById('shooting-arena');
    if (!root || !arena) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'shooting-ult-cutin';
    wrap.setAttribute('aria-hidden', 'true');

    const img = document.createElement('img');
    img.className = 'shooting-ult-cutin-image';
    img.src = c.cutinImage || `images/chara_${String(c.id).padStart(2, '0')}_cutin.webp`;
    img.alt = '';
    img.draggable = false;

    const flash = document.createElement('span');
    flash.className = 'shooting-ult-cutin-flash';

    const label = document.createElement('div');
    label.className = 'shooting-ult-cutin-label';
    label.innerHTML = `<span>ULT</span><strong>${c.ultName || 'Ultimate'}</strong>`;

    wrap.appendChild(img);
    wrap.appendChild(flash);
    wrap.appendChild(label);
    arena.appendChild(wrap);

    state.ultCutinActive = true;
    root.classList.add('ult-cutin-active');

    // カットイン中は完全停止。再開時のdt跳ねを防ぐためprevTsも更新する。
    prevTs = performance.now();

    requestAnimationFrame(() => wrap.classList.add('show'));

    state.ultCutinTimer = setTimeout(() => {
      if (!state || state.ended || state.finishing) {
        clearUltCutin();
        return;
      }

      wrap.classList.add('out');

      setTimeout(() => {
        if (wrap.isConnected) wrap.remove();
        if (!state) return;
        state.ultCutinActive = false;
        state.ultCutinTimer = 0;
        state.skipNextUltCut = true;
        root.classList.remove('ult-cutin-active');
        prevTs = performance.now();

        if (typeof onComplete === 'function') onComplete();
      }, 120);
    }, ULT_CUTIN_DURATION_MS);
  }

  function gameLoop(ts) {
    if (!state || !state.running || state.ended || state.finishing || state.countdown) return;

    if (state.ultCutinActive) {
      // ULTカットイン中はプレイヤー・敵・弾・DoT・召喚物を含めて完全停止。
      // RAFだけ継続し、再開時のdtジャンプを防ぐ。
      prevTs = ts;
      renderHud();
      rafId = requestAnimationFrame(gameLoop);
      return;
    }

    const dt = Math.min(0.032, Math.max(0, (ts - (prevTs || ts)) / 1000));
    prevTs = ts;
    if (!state.koTransition) updateMovement(dt, ts);
    updateClarineDecoys(dt, ts);
    updateIgnisFireWheel(ts);
    updateIgnisBurns(ts);
    updateRoseFlower(ts);
    if (state.ignisLaserEl && (
      getCurrentCharacter().id !== CHARACTER_ID.IGNIS ||
      ts >= Number(state.ignisLaserHideAt || 0)
    )) {
      hideIgnisLaser();
    }
    const ultLocked = ts < (state.ultLockUntil || 0);
    const bossGrabbed = ts < (state.bossGrabUntil || 0);
    const bossStunned = ts < (state.bossStunUntil || 0);
    if (!state.phaseTransition && !state.koTransition && !ultLocked) {
      firePlayer(ts);
      if (isNormalBattle()) {
        spawnNormalEnemies(ts);
        updateNormalEnemies(dt, ts);
      } else if (!bossGrabbed && !bossStunned) {
        fireBoss(ts);
      }
    }
    // 敵の位置更新後にプレイヤーとの直接接触を判定する。
    updateEnemyContactCollisions(ts);
    updateProjectiles(dt, ts);
    updateArnoAura(ts);
    updateCollectibles(dt);
    if (isNormalBattle()) evaluateNormalMission(ts);
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


  const RESULT_RANK_THRESHOLDS = Object.freeze([
    { rank: 'S', score: 24000 },
    { rank: 'A', score: 20000 },
    { rank: 'B', score: 16000 },
    { rank: 'C', score: 12000 },
    { rank: 'D', score: 8000 },
  ]);

  function getResultRank(score, win) {
    if (!win) return 'E';
    const value = Number(score) || 0;
    const hit = RESULT_RANK_THRESHOLDS.find(t => value >= t.score);
    return hit ? hit.rank : 'E';
  }

  function endGame(win) {
    if (!state || state.ended) return;
    state.ended = true;

    // RESULTへ切り替える前に、戦闘中だけの演出/HUD状態を確実に解除する。
    const rootForResult = document.getElementById(ROOT_ID);
    if (rootForResult) {
      rootForResult.classList.remove('normal-stage-clear', 'mission-item-get');
    }
    const missionHudForResult = document.getElementById('shooting-mission-hud');
    if (missionHudForResult) missionHudForResult.style.display = 'none';
    const comboForResult = document.getElementById('shooting-combo');
    if (comboForResult) comboForResult.style.display = 'none';
    state.running = false;
    cancelAnimationFrame(rafId);
    clearProjectiles();
    clearNormalBattleObjects();
    document.getElementById(BOSS_ID)?.classList.remove('nem-stunned');
    document.getElementById(ROOT_ID)?.classList.remove('nem-stun-active');
    const result = document.getElementById('shooting-result');
    const kicker = document.getElementById('shooting-result-kicker');
    const title = document.getElementById('shooting-result-title');
    const score = document.getElementById('shooting-result-score');
    const combo = document.getElementById('shooting-result-combo');
    const rank = document.getElementById('shooting-result-rank');
    const hitDetails = document.getElementById('shooting-result-hit-details');
    const hitTotal = document.getElementById('shooting-result-hit-total');
    const ultDetails = document.getElementById('shooting-result-ult-details');
    const ultTotal = document.getElementById('shooting-result-ult-total');
    const survivorDetails = document.getElementById('shooting-result-survivor-details');
    const survivorTotal = document.getElementById('shooting-result-survivor-total');
    const clearTime = document.getElementById('shooting-result-clear-time');
    const rankLetter = getResultRank(state.score, win);
    state.clearTimeMs = Math.max(0, performance.now() - (state.startedAt || performance.now()));
    // STORY進捗へシューティング結果を通知。
    try {
      window.dispatchEvent(new CustomEvent('shooting-stage-result', {
        detail: {
          stageId: state.stageId || (selectedStage && selectedStage.id) || null,
          chapter: selectedStage ? selectedStage.chapter : null,
          stageNo: selectedStage ? selectedStage.stageNo : null,
          win: !!win,
          score: Number(state.score || 0),
          maxCombo: Number(state.maxCombo || 0),
          clearTimeMs: Number(state.clearTimeMs || 0),
          hitsTaken: Number(state.totalHitsTaken || 0),
          collectedItems: Number(state.collectedItems || 0)
        }
      }));
    } catch (_) {}
    const totalHits = state.party.reduce((sum, m) => sum + (m.hitCount || 0), 0);
    const totalUlts = state.party.reduce((sum, m) => sum + (m.ultUseCount || 0), 0);
    const survivors = state.party.filter(m => m.hp > 0);
    const resultMemberHtml = (m, value, suffix, markDown) => {
      const c = SHOOTING_CHARACTERS[m.id];
      return `<span class="shooting-result-member${markDown && m.hp <= 0 ? ' down' : ''}" title="${c.name}"><img src="${c.panelImage || c.image}" alt="${c.name}"><b>${value}${suffix}</b></span>`;
    };
    if (kicker) kicker.textContent = win ? (isNormalBattle() ? 'MISSION COMPLETE' : 'REMNANT PURIFIED') : 'MISSION FAILED';
    if (title) title.textContent = 'RESULT';
    if (score) score.textContent = String(state.score).padStart(6, '0');
    if (combo) combo.textContent = String(state.maxCombo || 0);
    if (hitDetails) hitDetails.innerHTML = state.party.map(m => resultMemberHtml(m, m.hitCount || 0, '回', false)).join('');
    if (hitTotal) hitTotal.textContent = `${totalHits}回`;
    if (ultDetails) ultDetails.innerHTML = state.party.map(m => resultMemberHtml(m, m.ultUseCount || 0, '回', false)).join('');
    if (ultTotal) ultTotal.textContent = `${totalUlts}回`;
    if (survivorDetails) survivorDetails.innerHTML = state.party.map(m => resultMemberHtml(m, m.hp > 0 ? '生存' : 'DOWN', '', true)).join('');
    if (survivorTotal) survivorTotal.textContent = `${survivors.length}/${state.party.length}`;
    if (clearTime) clearTime.textContent = `${(state.clearTimeMs / 1000).toFixed(2)}秒`;
    if (rank) {
      rank.textContent = rankLetter;
      rank.setAttribute('data-rank', rankLetter);
    }
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

    const isTouchLike =
      e.pointerType === 'touch' ||
      e.pointerType === 'pen';

    const touchOffsetY = isTouchLike ? TOUCH_CONTROL_OFFSET_Y : 0;

    pointerX = clamp(e.clientX - r.left, 30, r.width - 30);
    pointerY = clamp(e.clientY - r.top - touchOffsetY, 34, r.height - 38);
  }

  window.selectShootingCharacter = function (id) {
    id = Number(id);
    if (!SHOOTING_CHARACTERS[id] || !isShootingCharacterOwned(id)) return;
    const idx = selectedPartyIds.indexOf(id);
    if (idx >= 0) selectedPartyIds.splice(idx, 1);
    else if (selectedPartyIds.length < PARTY_SIZE) selectedPartyIds.push(id);
    selectedCharacterId = selectedPartyIds[0] || id;
    applySelectedCharacterToUi();
  };

  window.startSelectedShootingCharacter = function () {
    if (selectedPartyIds.length !== PARTY_SIZE || !selectedPartyIds.every(isShootingCharacterOwned)) return;
    selectedCharacterId = selectedPartyIds[0];
    resetState();
    clearProjectiles();
    clearNormalBattleObjects();
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

  window.openShootingStage = function (stageId) {
    return window.openShootingEvent({ stageId });
  };

  window.openShootingEvent = function (options = {}) {
    lastTapAt = 0;

    // 特別巡行の既存導線は openShootingEvent() を引数なしで呼ぶ。
    // STORYで最後に選んだstageIdを引き継がないよう、
    // 引数なし起動は常に従来のオーバーシア単戦へ戻す。
    const hasExplicitStage = !!(options && options.stageId);
    const hasExplicitEnemy = !!(options && options.enemyId);
    if (!hasExplicitStage && !hasExplicitEnemy) {
      selectedStageId = SHOOTING_STAGE_ID.CH01_04;
      selectedStage = getShootingStage(selectedStageId);
      selectedEnemyId = DEFAULT_SHOOTING_ENEMY_ID;
    }

    resolveSelectedStage(options || {});
    BOSS = getCurrentShootingEnemy();
    const root = UIModule.buildRoot({
      ROOT_ID, PLAYER_ID, BOSS_ID, BOSS, SHOOTING_CHARACTERS, CHARACTER_ID,
      getShootingRosterHtml, onPointerDown, onPointerMove, onPointerUp
    });
    const bossImage = document.getElementById(BOSS_ID);
    if (bossImage) {
      bossImage.src = BOSS.image || '';
      bossImage.alt = BOSS.name || '';
      bossImage.style.setProperty('--enemy-scale', String(Number(BOSS.uiScale || 1)));
      bossImage.style.display = selectedStage && selectedStage.type === 'normal' ? 'none' : '';
    }
    root.setAttribute('data-shooting-stage', selectedStage ? selectedStage.id : '');
    root.setAttribute('data-battle-type', selectedStage ? selectedStage.type : 'boss');

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
    refreshShootingRoster();
    const firstOwned = Object.keys(SHOOTING_CHARACTERS).map(Number).find(isShootingCharacterOwned);
    selectedCharacterId = firstOwned || CHARACTER_ID.ERI;
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
    clearNormalBattleObjects();
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
    clearNormalBattleObjects();
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
    if (state && state.skipNextUltCut) {
      state.skipNextUltCut = false;
      return;
    }
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
    root.classList.remove('ult-flash-eri','ult-flash-hayate','ult-flash-ayane','ult-flash-nem');
    void root.offsetWidth;
    root.classList.add(className);
    setTimeout(() => root.classList.remove(className), 700);
  }

  function applyUltDamage(amount, big) {
    if (!state || state.ended || state.finishing) return;
    if (isNormalBattle()) {
      const targets = state.normalEnemies.filter(enemy => enemy && enemy.el && enemy.hp > 0);
      targets.forEach(enemy => damageNormalEnemy(enemy, amount, performance.now(), !!big));
      state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
      state.score += Math.round(amount * 35 * Math.max(1, targets.length));
      evaluateNormalMission(performance.now());
      renderHud();
      return;
    }
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
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-eri');
    clearEnemyBulletsOnly();
    applyBossStun(1000, 'eri_ult');
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

    showUltCut(c.ultName, c.effectKey);
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
      if (playerImg && getCurrentCharacter().id === CHARACTER_ID.HAYATE) {
        playerImg.src = getCurrentCharacter().image;
      }
      renderHud();
    }, MODE_DURATION);
  }

  function useNemUlt(c) {
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-nem');
    const now = performance.now();
    state.ultLockUntil = now + 260;
    applyBossStun(c.ultStunMs || 5000, 'ult');
    renderHud();
  }

  function useAyaneUlt(c) {
    if (isNormalBattle()) {
      showUltCut(c.ultName, c.effectKey);
      ultScreenFlash('ult-flash-ayane');
      clearEnemyBulletsOnly();

      const arena = document.getElementById('shooting-arena');
      const root = document.getElementById(ROOT_ID);
      const targets = (state.normalEnemies || []).filter(enemy => enemy && enemy.el && enemy.hp > 0);

      // 通常ステージでも黒手演出を出す。
      // これまでnormalBattle分岐ではダメージだけ処理してreturnしていたため、
      // ボス戦で見えていた「黒手が伸びて掴む」演出が完全に省略されていた。
      const target = targets
        .slice()
        .sort((a, b) => {
          const da = Math.hypot((a.x || 0) - state.player.x, (a.y || 0) - state.player.y);
          const db = Math.hypot((b.x || 0) - state.player.x, (b.y || 0) - state.player.y);
          return da - db;
        })[0];

      if (!arena || !target) {
        state.ultLockUntil = performance.now() + 800;
        pushUltTimer(() => {
          const damage = Number(c.atk || 0) * Number(c.ultDamageAtkMultiplier || 3.5);
          applyUltDamage(damage, true);
        }, 420);
        return;
      }

      const now = performance.now();
      const STRIKE_DELAY = 620;
      const HOLD_DURATION = 900;

      state.ultLockUntil = now + STRIKE_DELAY + HOLD_DURATION + 220;
      state.normalEnemyStunUntil = Math.max(
        state.normalEnemyStunUntil || 0,
        now + STRIKE_DELAY + HOLD_DURATION
      );

      const startX = state.player.x;
      const startY = Math.max(24, state.player.y - 18);
      const endX = target.x;
      const endY = Math.max(24, target.y + 10);
      const dx = endX - startX;
      const dy = endY - startY;
      const distance = Math.max(80, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;

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

      pushUltTimer(() => fx.classList.add('charge'), 90);

      pushUltTimer(() => {
        fx.classList.add('strike');
        if (root) root.classList.add('ayane-rampage-shake');
      }, 300);

      pushUltTimer(() => {
        if (!fx.isConnected) return;

        fx.classList.add('hit', 'grab');

        const damage = Number(c.atk || 0) * Number(c.ultDamageAtkMultiplier || 3.5);
        applyUltDamage(damage, true);

        if (target.el) {
          target.el.classList.add('hit-flash');
          setTimeout(() => target.el && target.el.classList.remove('hit-flash'), 260);
        }

        createHit(endX, endY, true);
      }, STRIKE_DELAY);

      pushUltTimer(() => {
        if (!fx.isConnected) return;
        fx.classList.remove('grab');
        fx.classList.add('release', 'fade');
        if (root) root.classList.remove('ayane-rampage-shake');
      }, STRIKE_DELAY + HOLD_DURATION);

      pushUltTimer(() => {
        if (fx.isConnected) fx.remove();
        if (root) {
          root.classList.remove('ayane-rampage-shake');
          root.classList.remove('ayane-rampage-active');
        }
      }, STRIKE_DELAY + HOLD_DURATION + 380);

      return;
    }
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-ayane');
    clearEnemyBulletsOnly();

    const now = performance.now();
    const GRAB_DURATION = 7000;
    const STRIKE_DELAY = 760;
    const RELEASE_DELAY = STRIKE_DELAY + GRAB_DURATION;
    // 黒手が飛んでいる間だけアヤネの通常射撃を一時停止。命中した場合は7秒拘束へ移行する。
    // MISS時に5秒間ボス攻撃だけ止まり続ける不具合を防ぐ。
    state.ultLockUntil = now + STRIKE_DELAY + 220;

    // 黒手の突進中はボス位置も固定する。
    // ultLockUntil は射撃停止には効くが、ボス移動自体は止めないため、
    // 旧実装では黒手の到達点を決めた後にボスだけ動いてMISSしやすかった。
    state.bossGrabUntil = now + STRIKE_DELAY + 80;

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
      // 見た目と当たり判定を一致させる。
      // 黒手の実DOMとボス画像の実DOMが重なっているかを最優先で判定する。
      const clawEl = fx.querySelector('.shooting-ayane-blackhand-claw');
      const clawRect = clawEl ? clawEl.getBoundingClientRect() : null;
      const bossRect = bossEl ? bossEl.getBoundingClientRect() : null;

      const visualHit =
        !!(clawRect && bossRect && rectsHit(clawRect, bossRect, -16, -10));

      // DOM取得不能時の保険。突進中はボスを固定しているため、
      // 到達点との距離でも十分一致する。
      const hitDistance = Math.hypot(
        Number(state.boss.x || 0) - endX,
        Number(state.boss.y || 0) - endY
      );
      const didHit = visualHit || hitDistance <= 118;

      fx.classList.add(didHit ? 'hit' : 'miss');
      if (!didHit) {
        // MISS：掴み状態には入らず、黒手はそのまま通過して短時間で消える。
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

      // 命中時のみ、黒手がボスを7秒間掴んで完全拘束する。
      // ボスは bossGrabUntil で止めるが、アヤネ側の ultLockUntil はすぐ解除する。
      // これにより「拘束中も通常攻撃を続けられる」状態になる。
      state.bossGrabUntil = performance.now() + GRAB_DURATION;
      state.ultLockUntil = performance.now() + 120;
      state.lastShotAt = performance.now();
      clearEnemyBulletsOnly();
      fx.classList.add('grab');

      if (bossEl) {
        bossEl.classList.add('ayane-grabbed');
        bossEl.classList.remove('hit-flash', 'burst-hit');
        void bossEl.offsetWidth;
        bossEl.classList.add('burst-hit');
      }

      // 命中したことが視覚的に分かるよう、掴み成立時に大きめのHIT演出を出す。
      createHit(state.boss.x, state.boss.y, true);

      const totalDamage =
        Number(c.atk || 0) *
        Number(c.ultDamageAtkMultiplier || 3.5);
      const initialDamage = totalDamage * 0.18;
      const tickCount = 28; // 250ms × 28 = 7秒
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
        // 7秒の継続ダメージ終了後にゲージ割り判定を行う。
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

  function getArnoAuraVisualKey(enemy) {
    if (!enemy) return '';
    return enemy.isBoss ? 'boss' : String(enemy.uid || '');
  }

  function getArnoAuraTargets() {
    if (!state) return [];
    if (isNormalBattle()) {
      return (state.normalEnemies || [])
        .filter(enemy => enemy && enemy.el && enemy.hp > 0)
        .map(enemy => ({ ...enemy, isBoss: false }));
    }
    if (state.boss && state.boss.hp > 0) {
      return [{ uid: 'boss', x: state.boss.x, y: state.boss.y, isBoss: true }];
    }
    return [];
  }

  function syncArnoAuraVisuals(now) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    if (!state || now >= (state.arnoAuraUntil || 0)) {
      arena.querySelectorAll('.shooting-arno-aura').forEach(el => el.remove());
      return;
    }

    const targets = getArnoAuraTargets();
    const liveKeys = new Set(targets.map(getArnoAuraVisualKey));

    arena.querySelectorAll('.shooting-arno-aura').forEach(el => {
      if (!liveKeys.has(el.dataset.auraKey || '')) el.remove();
    });

    targets.forEach(target => {
      const key = getArnoAuraVisualKey(target);
      let el = arena.querySelector(`.shooting-arno-aura[data-aura-key="${key}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'shooting-arno-aura';
        el.dataset.auraKey = key;
        el.innerHTML = '<i></i><b></b><span></span>';
        arena.appendChild(el);
      }
      positionUnit(el, target.x, target.y);
    });
  }

  function applyArnoAuraTick(now) {
    if (!state || now >= (state.arnoAuraUntil || 0)) return;
    if (now < (state.arnoAuraNextTickAt || 0)) return;

    const c = SHOOTING_CHARACTERS[state.arnoAuraOwnerId] || SHOOTING_CHARACTERS[CHARACTER_ID.ARNO];
    const tickMs = Number(c?.auraTickMs || 250);
    const damage = Number(c?.auraTickDamage || 1.8);
    state.arnoAuraNextTickAt = now + tickMs;

    if (isNormalBattle()) {
      const targets = [...(state.normalEnemies || [])];
      targets.forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;
        damageNormalEnemy(enemy, damage, now, false);
      });
      state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
      return;
    }

    if (!state.boss || state.boss.hp <= 0) return;
    state.boss.hp = Math.max(0, state.boss.hp - damage);
    state.score += Math.round(damage * 100);
    createHit(
      state.boss.x + (Math.random() - .5) * 32,
      state.boss.y + (Math.random() - .5) * 28,
      false
    );
    flashBossHit(false);
    updateBossPhase();
    if (state.boss.hp <= 0) beginBossDefeat();
  }

  function updateArnoAura(now) {
    syncArnoAuraVisuals(now);
    applyArnoAuraTick(now);
  }

  function healRoseParty(amount) {
    if (!state || !Array.isArray(state.party)) return;
    const heal = Math.max(0, Number(amount || 0));
    if (!heal) return;

    state.party.forEach(member => {
      if (!member || member.hp <= 0) return;
      member.hp = Math.min(member.hpMax, member.hp + heal);
    });
    renderHud();
  }

  function removeRoseFlower() {
    if (!state || !state.roseFlower) return;
    const flower = state.roseFlower;
    if (flower.el) {
      flower.el.classList.add('fade');
      setTimeout(() => flower.el && flower.el.remove(), 260);
    }
    state.roseFlower = null;
  }

  function createRoseHeartProjectile(flower, c, angle, angleOffset) {
    if (!state || !flower) return null;

    const speed = Number(c.flowerHeartSpeed || 250);
    const theta = angle + angleOffset;

    // 花を「弾を撃つユニット」として扱う。
    // プレイヤー弾が state.player.x/y、敵弾が enemy.x/y から出るのと同じ。
    const originX =
      Number(flower.x || 0) +
      Number(c.flowerHeartOriginOffsetX || 0);

    const originY =
      Number(flower.y || 0) +
      Number(c.flowerHeartOriginOffsetY || 0);

    const p = makeProjectile(
      'shooting-bullet shooting-bullet-rose-heart',
      originX,
      originY,
      Math.cos(theta) * speed,
      Math.sin(theta) * speed,
      0,
      c.id
    );
    if (!p) return null;

    // 位置決め用の要素(p.el)自体には rotate を一切かけず、
    // ハートの見た目(回転・疑似要素オフセット)は中の子要素だけに閉じ込める。
    // こうすることで「transform(位置) と rotate(回転) を同じ要素に同時適用した際の
    // ブラウザ側の描画ズレ」の可能性そのものを排除する。
    if (p.el) {
      p.el.innerHTML = '<span class="shooting-rose-heart-shape"></span>';
    }

    p.kind = 'rose_heart';
    p.healAmount = Number(c.flowerHeartHealAmount || 34);
    p.expireAt = performance.now() + Number(c.flowerHeartLifeMs || 2200);
    p.noUltGain = true;
    p.noComboGain = true;
    p.sourceType = 'rose_flower';

    return p;
  }

  function updateRoseFlower(now) {
    if (!state || !state.roseFlower) return;
    const flower = state.roseFlower;
    const c = SHOOTING_CHARACTERS[CHARACTER_ID.ROSE];
    if (!c) return;

    if (!flower.el || !flower.el.isConnected || now >= flower.endAt) {
      removeRoseFlower();
      return;
    }

    // 花の見た目と発射座標を常に同じ flower.x/y に固定。
    positionUnit(flower.el, flower.x, flower.y);

    if (now >= flower.nextEmitAt) {
      const count = Math.max(1, Math.floor(Number(c.flowerHeartBurstCount || 10)));
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < count; i++) {
        const angle = base + (Math.PI * 2 * i / count);
        const offset = (Math.random() - 0.5) * 0.14;
        const p = createRoseHeartProjectile(flower, c, angle, offset);
        if (p) state.bullets.push(p);
      }
      flower.nextEmitAt = now + Number(c.flowerHeartIntervalMs || 240);
    }
  }

  function useRoseUlt(c) {
    if (!state) return;
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-sui');

    removeRoseFlower();

    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const flower = document.createElement('div');
    flower.className = 'shooting-rose-flower';
    flower.innerHTML = `<img src="${c.flowerImage || 'images/chara_07_battle_flower.webp'}" alt="rose flower" draggable="false"><span class="shooting-rose-flower-aura"></span>`;
    arena.appendChild(flower);

    const x = arena.clientWidth * 0.5;
    const y = arena.clientHeight * 0.48;
    positionUnit(flower, x, y);
    requestAnimationFrame(() => flower.classList.add('show'));

    const now = performance.now();
    state.roseFlower = {
      el: flower,
      x, y,
      startedAt: now,
      endAt: now + Number(c.flowerDurationMs || 5200),
      nextEmitAt: now + 180,
    };
    state.ultLockUntil = now + 260;
  }

  function getIgnisBurnFx(key) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;
    return arena.querySelector(`.shooting-ignis-burn[data-burn-key="${key}"]`);
  }

  function createIgnisBurnVisual(key, x, y) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;

    let burn = getIgnisBurnFx(key);
    if (!burn) {
      burn = document.createElement('img');
      burn.className = 'shooting-ignis-burn';
      burn.dataset.burnKey = key;
      burn.src = 'images/battle_barn.webp';
      burn.alt = 'burn';
      burn.draggable = false;
      arena.appendChild(burn);
    }

    // 少し下へずらして、敵の足元から燃え上がる見え方にする。
    positionUnit(burn, x, y + 12);
    return burn;
  }

  function removeIgnisBurnVisual(key) {
    const burn = getIgnisBurnFx(key);
    if (!burn) return;
    burn.classList.add('fade');
    setTimeout(() => burn.remove(), 180);
  }

  function igniteIgnisTarget(target, c, now) {
    if (!state || !target) return;
    const duration = Number(c.burnDurationMs || 5000);

    if (target.isBoss) {
      state.ignisBossBurnUntil = Math.max(state.ignisBossBurnUntil || 0, now + duration);
      if (!state.ignisBossBurnNextTickAt || state.ignisBossBurnNextTickAt < now) {
        state.ignisBossBurnNextTickAt = now + Number(c.burnTickMs || 1000);
      }
      const bossEl = document.getElementById(BOSS_ID);
      if (bossEl) bossEl.classList.add('ignis-burning');
      createIgnisBurnVisual('boss', state.boss.x, state.boss.y);
      return;
    }

    target.ignisBurnUntil = Math.max(Number(target.ignisBurnUntil || 0), now + duration);
    if (!target.ignisBurnNextTickAt || target.ignisBurnNextTickAt < now) {
      target.ignisBurnNextTickAt = now + Number(c.burnTickMs || 1000);
    }
    if (target.el) {
      target.el.classList.add('ignis-burning');
      createIgnisBurnVisual(String(target.uid || 'enemy'), target.x, target.y);
    }
  }

  function updateIgnisBurns(now) {
    if (!state) return;
    const c = SHOOTING_CHARACTERS[CHARACTER_ID.IGNIS];
    if (!c) return;

    const tickMs = Number(c.burnTickMs || 1000);
    const damage = Number(c.atk || 0) * Number(c.burnDamageAtkRate || 0.30);

    if (isNormalBattle()) {
      const targets = [...(state.normalEnemies || [])];
      targets.forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;

        const burnKey = String(enemy.uid || 'enemy');

        if (now >= Number(enemy.ignisBurnUntil || 0)) {
          enemy.el.classList.remove('ignis-burning');
          removeIgnisBurnVisual(burnKey);
          return;
        }

        // 炎エフェクトは敵本体の座標へ追従させる。
        createIgnisBurnVisual(burnKey, enemy.x, enemy.y);

        if (now >= Number(enemy.ignisBurnNextTickAt || 0)) {
          enemy.ignisBurnNextTickAt = now + tickMs;
          damageNormalEnemy(enemy, damage, now, true);
        }
      });
      state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
      return;
    }

    const bossEl = document.getElementById(BOSS_ID);
    if (now >= Number(state.ignisBossBurnUntil || 0)) {
      if (bossEl) bossEl.classList.remove('ignis-burning');
      removeIgnisBurnVisual('boss');
      return;
    }

    if (state.boss && state.boss.hp > 0) {
      createIgnisBurnVisual('boss', state.boss.x, state.boss.y);
    }

    if (state.boss && state.boss.hp > 0 && now >= Number(state.ignisBossBurnNextTickAt || 0)) {
      state.ignisBossBurnNextTickAt = now + tickMs;
      state.boss.hp = Math.max(0, state.boss.hp - damage);
      createHit(state.boss.x, state.boss.y, true);
      flashBossHit(true);
      state.score += Math.round(damage * 100);
      updateBossPhase();
      if (state.boss.hp <= 0) beginBossDefeat();
    }
  }

  function removeIgnisFireWheel() {
    if (!state || !state.ignisFireWheel) return;
    const wheel = state.ignisFireWheel;
    if (wheel.el) {
      wheel.el.classList.add('fade');
      setTimeout(() => wheel.el && wheel.el.remove(), 300);
    }
    state.ignisFireWheel = null;
  }

  function updateIgnisFireWheel(now) {
    if (!state || !state.ignisFireWheel) return;
    const wheel = state.ignisFireWheel;
    const c = SHOOTING_CHARACTERS[CHARACTER_ID.IGNIS];
    if (!c) return;

    if (now >= wheel.endAt) {
      removeIgnisFireWheel();
      return;
    }

    const arena = document.getElementById('shooting-arena');
    if (!arena || !wheel.el) return;

    const elapsed = (now - wheel.startedAt) / 1000;
    const angle = wheel.startAngle + elapsed * Number(c.fireWheelAngularSpeed || 1.15);
    const cx = arena.clientWidth * 0.5;
    const cy = arena.clientHeight * 0.43;

    // 大きく駆け回るのではなく、盤面をゆっくり漂うように旋回。
    const floatX =
      Math.sin(elapsed * Number(c.fireWheelFloatSpeedX || 0.72) + wheel.floatSeedX) *
      Number(c.fireWheelFloatX || 18);
    const floatY =
      Math.cos(elapsed * Number(c.fireWheelFloatSpeedY || 0.94) + wheel.floatSeedY) *
      Number(c.fireWheelFloatY || 14);

    wheel.x =
      cx +
      Math.cos(angle) * Number(c.fireWheelOrbitRadiusX || 118) +
      floatX;

    wheel.y =
      cy +
      Math.sin(angle) * Number(c.fireWheelOrbitRadiusY || 172) +
      floatY;

    positionUnit(wheel.el, wheel.x, wheel.y);

    // 見た目と当たり判定を一致させる。
    // 旧実装は「火炎車の中心点と敵の中心点の距離」だけで判定していたため、
    // 画像同士は明らかに重なっていても、中心距離が少し遠いだけで
    // やけどが付かないケースがあった。
    const wheelRect = wheel.el.getBoundingClientRect();

    if (isNormalBattle()) {
      (state.normalEnemies || []).forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;

        const enemyRect = enemy.el.getBoundingClientRect();

        // 炎の輪と敵画像が視覚的に重なったらやけど付与。
        if (rectsHit(wheelRect, enemyRect, 6, 8)) {
          igniteIgnisTarget(enemy, c, now);
        }
      });
    } else if (state.boss && state.boss.hp > 0) {
      const bossEl = document.getElementById(BOSS_ID);
      if (!bossEl) return;

      const bossRect = bossEl.getBoundingClientRect();

      if (rectsHit(wheelRect, bossRect, 8, 12)) {
        igniteIgnisTarget({ isBoss: true }, c, now);
      }
    }
  }

  function useIgnisUlt(c) {
    if (!state) return;

    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-eri');

    removeIgnisFireWheel();

    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const el = document.createElement('div');
    el.className = 'shooting-ignis-fire-wheel';
    el.innerHTML = '<i></i><b></b><span></span>';
    el.style.width = `${Number(c.fireWheelSize || 104)}px`;
    el.style.height = `${Number(c.fireWheelSize || 104)}px`;
    arena.appendChild(el);

    const now = performance.now();
    state.ignisFireWheel = {
      el,
      x: arena.clientWidth * 0.5,
      y: arena.clientHeight * 0.5,
      startedAt: now,
      endAt: now + Number(c.fireWheelDurationMs || 3500),
      startAngle: -Math.PI / 2,
      floatSeedX: Math.random() * Math.PI * 2,
      floatSeedY: Math.random() * Math.PI * 2,
    };

    state.ultLockUntil = now + 280;
    requestAnimationFrame(() => el.classList.add('active'));
    updateIgnisFireWheel(now);
  }

  function getClarineDecoyConfig() {
    return SHOOTING_CHARACTERS[CHARACTER_ID.CLARINE] || {};
  }

  function removeClarineDecoy(decoy, expired) {
    if (!decoy) return;
    if (decoy.el) {
      const el = decoy.el;
      el.classList.remove('hit');
      el.classList.add(expired ? 'expired' : 'defeated');
      setTimeout(() => el.remove(), expired ? 260 : 520);
      decoy.el = null;
    }
  }

  function spawnClarineExplosionVisual(x, y) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const burst = document.createElement('div');
    burst.className = 'shooting-clarine-decoy-burst';
    burst.innerHTML = '<i></i><b></b><span></span>';
    arena.appendChild(burst);
    positionUnit(burst, x, y);
    requestAnimationFrame(() => burst.classList.add('show'));
    setTimeout(() => burst.remove(), 760);
  }

  function applyClarineExplosionDamage(x, y, c) {
    const now = performance.now();
    const radius = Number(c.decoyExplosionRadius || 124);
    const damage = Number(c.atk || 0) * Number(c.decoyExplosionDamageMultiplier || 2.2);

    spawnClarineExplosionVisual(x, y);

    if (isNormalBattle()) {
      const targets = [...(state.normalEnemies || [])];
      targets.forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;
        const dist = Math.hypot((enemy.x || 0) - x, (enemy.y || 0) - y);
        if (dist <= radius) damageNormalEnemy(enemy, damage, now, true);
      });
      state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
      evaluateNormalMission(now);
      return;
    }

    if (!state.boss || state.boss.hp <= 0) return;
    const dist = Math.hypot((state.boss.x || 0) - x, (state.boss.y || 0) - y);
    if (dist > radius + 20) return;
    state.boss.hp = Math.max(0, state.boss.hp - damage);
    updateBossPhase();
    createHit(x, y, true);
    flashBossHit(true);
    state.score += Math.round(damage * 100);
    renderHud();
    if (state.boss.hp <= 0) beginBossDefeat();
  }

  function breakClarineDecoy(decoy, c) {
    if (!decoy || !decoy.el) return;
    const x = decoy.x;
    const y = decoy.y;
    removeClarineDecoy(decoy, false);
    applyClarineExplosionDamage(x, y, c);
  }

  function getClarineSpawnPoint(index) {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !state) return { x: 180, y: 180 };

    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const cfg = getClarineDecoyConfig();

    const minX = 56;
    const maxX = Math.max(minX + 10, w - 56);
    const minY = 84;
    const maxY = Math.max(minY + 10, h * Number(cfg.decoyYMaxRatio || 0.47));

    let x = minX + Math.random() * (maxX - minX);
    let y = minY + Math.random() * (maxY - minY);

    const others = (state.clarineDecoys || []).filter(d => d && d.el);
    if (others.length) {
      const nearest = others[0];
      const dist = Math.hypot(x - nearest.x, y - nearest.y);
      if (dist < 88) {
        x = nearest.x < w * 0.5 ? clamp(nearest.x + 110, minX, maxX) : clamp(nearest.x - 110, minX, maxX);
        y = clamp(nearest.y + (Math.random() > .5 ? 30 : -30), minY, maxY);
      }
    }

    return { x, y };
  }

  function createClarineDecoy(c, index, now) {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !state) return null;

    const pt = getClarineSpawnPoint(index);
    const el = document.createElement('img');
    el.className = 'shooting-clarine-decoy';
    el.src = c.decoyImage || 'images/chara_05_battle_decoy.webp';
    el.alt = 'デコイ';
    el.draggable = false;
    arena.appendChild(el);

    const decoy = {
      id: `clarine_decoy_${++state.clarineDecoySeq}`,
      ownerId: c.id,
      x: pt.x,
      y: pt.y,
      el,
      hp: Number(c.decoyHp || 520),
      hpMax: Number(c.decoyHp || 520),
      expireAt: now + Number(c.decoyDurationMs || 6000),
      nextShotAt: now + 120 + index * 80,
      fireIntervalMs: Number(c.decoyFireIntervalMs || 210),
      shotsPerBurst: Number(c.decoyShotsPerBurst || 4),
      bulletSpeed: Number(c.decoyBulletSpeed || 300),
      bulletDamage: Number(c.decoyBulletDamage || 1.2),
      driftSeed: Math.random() * Math.PI * 2,
    };

    positionUnit(el, decoy.x, decoy.y);
    requestAnimationFrame(() => el.classList.add('show'));
    return decoy;
  }

  function fireClarineDecoyBurst(decoy, c) {
    if (!state || !decoy || !decoy.el) return;

    const attrClass = getCharacterBulletClass(c);
    const cls = 'shooting-bullet shooting-bullet-clarine-decoy' + attrClass;

    for (let i = 0; i < Math.max(1, decoy.shotsPerBurst); i++) {
      const angle = Math.random() * Math.PI * 2;
      const p = makeProjectile(
        cls,
        decoy.x,
        decoy.y,
        Math.cos(angle) * decoy.bulletSpeed,
        Math.sin(angle) * decoy.bulletSpeed,
        decoy.bulletDamage,
        decoy.ownerId
      );
      if (p) {
        // ULTそのものが次のULTゲージやCOMBOを生まないようにする。
        p.noUltGain = true;
        p.noComboGain = true;
        p.sourceType = 'clarine_decoy';
        state.bullets.push(p);
      }
    }
  }

  function updateClarineDecoys(dt, now) {
    if (!state) return;
    const c = getClarineDecoyConfig();

    state.clarineDecoys = (state.clarineDecoys || []).filter(decoy => {
      if (!decoy || !decoy.el) return false;

      if (now >= decoy.expireAt) {
        removeClarineDecoy(decoy, true);
        return false;
      }

      const driftT = now / 1000;
      const renderX = decoy.x + Math.sin(driftT * 1.25 + decoy.driftSeed) * 4;
      const renderY = decoy.y + Math.cos(driftT * 1.6 + decoy.driftSeed) * 3;
      positionUnit(decoy.el, renderX, renderY);

      if (now >= decoy.nextShotAt) {
        fireClarineDecoyBurst(decoy, c);
        decoy.nextShotAt = now + decoy.fireIntervalMs;
      }
      return true;
    });
  }

  function useClarineUlt(c) {
    if (!state) return;
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-eri');

    const now = performance.now();
    state.ultLockUntil = now + 320;

    // 同時に存在できるデコイ数を制限。
    // ULTを再使用しても既存分を含めて最大2体まで。
    state.clarineDecoys = (state.clarineDecoys || []).filter(decoy => decoy && decoy.el);

    const maxActive = Math.max(1, Math.floor(Number(c.decoyMaxActive || 2)));
    const summonCount = Math.max(1, Math.floor(Number(c.decoyCount || 2)));
    const remainingSlots = Math.max(0, maxActive - state.clarineDecoys.length);
    const count = Math.min(summonCount, remainingSlots);

    for (let i = 0; i < count; i++) {
      const decoy = createClarineDecoy(c, i, now);
      if (decoy) state.clarineDecoys.push(decoy);
    }

    renderHud();
  }

  function showSuiClockMark(mark, stepIndex) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const markEl = document.createElement('div');
    markEl.className = 'shooting-sui-clock-mark';
    markEl.textContent = String(mark || '');
    markEl.style.setProperty('--sui-clock-step', String(stepIndex || 0));
    arena.appendChild(markEl);

    requestAnimationFrame(() => markEl.classList.add('show'));
    setTimeout(() => markEl.remove(), 920);
  }

  function triggerSuiClockBurst(c, ownerId) {
    if (!state || state.ended) return;

    const owner = getPartyMember(ownerId);
    if (owner && c.ultFullHeal !== false) {
      owner.hp = owner.hpMax;
    }

    if (c.ultClearEnemyBullets !== false) {
      clearEnemyBulletsOnly();
    }

    const damage = Number(c.atk || 0) * Number(c.ultDamageAtkMultiplier || 3);
    applyUltDamage(damage, true);

    const root = document.getElementById(ROOT_ID);
    if (root) {
      root.classList.remove('sui-clock-detonate');
      void root.offsetWidth;
      root.classList.add('sui-clock-detonate');
      setTimeout(() => root.classList.remove('sui-clock-detonate'), 820);
    }

    const arena = document.getElementById('shooting-arena');
    if (arena) {
      const burst = document.createElement('div');
      burst.className = 'shooting-sui-clock-burst';
      burst.innerHTML = '<i></i><b></b>';
      arena.appendChild(burst);
      requestAnimationFrame(() => burst.classList.add('show'));
      setTimeout(() => burst.remove(), 900);
    }

    renderHud();
  }

  function useSuiUlt(c) {
    if (!state) return;

    const now = performance.now();
    const marks = Array.isArray(c.clockMarks) && c.clockMarks.length
      ? c.clockMarks
      : ['X', 'XI', 'XII'];
    const stepMs = Math.max(200, Number(c.clockStepMs || 1000));
    const titleLeadMs = Math.max(0, Number(c.clockTitleLeadMs || 1000));
    const totalDelay = Math.max(
      titleLeadMs + marks.length * stepMs,
      Number(c.clockDelayMs || 4000)
    );
    const ownerId = c.id;

    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-sui');

    // 発動モーションだけ短くロック。カウント中は通常操作・射撃を継続できる。
    state.ultLockUntil = now + 260;

    // スキルタイトル演出を先に見せ、その後に X → XI → XII。
    marks.forEach((mark, index) => {
      pushUltTimer(() => {
        if (!state || state.ended) return;
        showSuiClockMark(mark, index);
      }, titleLeadMs + index * stepMs);
    });

    pushUltTimer(() => {
      triggerSuiClockBurst(c, ownerId);
    }, totalDelay);

    renderHud();
  }

  function useArnoUlt(c) {
    if (!state) return;
    const now = performance.now();
    const duration = Number(c.auraDurationMs || 5000);

    // First effect: erase every hostile projectile currently on the board.
    clearEnemyBulletsOnly();

    state.arnoAuraOwnerId = c.id;
    state.arnoAuraUntil = now + duration;
    state.arnoAuraNextTickAt = now;
    state.ultLockUntil = now + 260;

    const root = document.getElementById(ROOT_ID);
    if (root) {
      root.classList.remove('arno-aura-cast');
      void root.offsetWidth;
      root.classList.add('arno-aura-cast');
      setTimeout(() => root.classList.remove('arno-aura-cast'), 620);
    }

    syncArnoAuraVisuals(now);
  }

  function isUltReady() {
    if (!state || state.ended || state.phaseTransition || state.finishing || state.countdown) return false;
    if (performance.now() < (state.ultLockUntil || 0)) return false;
    const c = getCurrentCharacter();
    const member = getActiveMember();
    return !!member && member.burst >= c.burstNeed;
  }

  function executeCharacterUlt(c) {
    if (!state || state.ended || state.finishing) return;

    if (c.ultType === 'sui_clock_burst') useSuiUlt(c);
    else if (c.ultType === 'rose_flower_heart') useRoseUlt(c);
    else if (c.ultType === 'ignis_fire_wheel') useIgnisUlt(c);
    else if (c.ultType === 'clarine_decoy') useClarineUlt(c);
    else if (c.ultType === 'arno_aura') useArnoUlt(c);
    else if (c.ultType === 'speed_storm') useHayateUlt(c);
    else if (c.ultType === 'precision_beam') useAyaneUlt(c);
    else if (c.ultType === 'nem_stun') useNemUlt(c);
    else useEriUlt(c);

    renderHud();
  }

  window.useShootingBurst = function () {
    if (!isUltReady()) return;
    const c = getCurrentCharacter();
    const member = getActiveMember();
    if (!member) return;

    // 二重発動防止のため、カットイン開始時点でゲージを消費。
    member.burst = 0;
    member.ultReadyNotified = false;
    member.ultUseCount = (member.ultUseCount || 0) + 1;
    clearUltTimers();

    // 約1秒のカットイン → その後にULT効果を発動。
    playUltCutin(c, () => executeCharacterUlt(c));
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
