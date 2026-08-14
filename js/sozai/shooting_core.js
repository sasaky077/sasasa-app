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
      img.src = (c.id === CHARACTER_ID.HAYATE && state && performance.now() < (state.hayateMoonlightUntil || 0)) ? 'images/chara_12_battle_back_moon.webp' : c.image;
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
      state.normalEnemyStunUntil = Math.max(state.normalEnemyStunUntil || 0, now + durationMs);
      clearEnemyBulletsOnly();
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
    const owner = SHOOTING_CHARACTERS[ownerId];
    const every = owner && Number.isFinite(owner.comboStunEvery) ? owner.comboStunEvery : 0;
    const milestone = !!(every && state.combo % every === 0);
    pulseCombo(milestone);
    if (milestone && owner.id === CHARACTER_ID.NEM) applyBossStun(owner.comboStunMs || 1500, 'combo');
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

  function firePlayer(now) {
    const c = getCurrentCharacter();
    const moonlight = c.id === CHARACTER_ID.HAYATE && now < (state.hayateMoonlightUntil || 0);
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
          effectivePower,
          c.id
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
        heavy ? c.power * 1.65 : c.power,
        c.id
      ));
      return;
    }

    const gap = 9;
    const bulletClass = 'shooting-bullet' + (c.id === CHARACTER_ID.NEM ? ' shooting-bullet-nem' : '');
    state.bullets.push(makeProjectile(bulletClass, state.player.x - gap, y, 0, -c.bulletSpeed, c.power, c.id));
    state.bullets.push(makeProjectile(bulletClass, state.player.x + gap, y, 0, -c.bulletSpeed, c.power, c.id));
  }


  function isNormalBattle() {
    return !!(state && state.battleType === 'normal');
  }

  function getNormalBattleConfig() {
    return (selectedStage && selectedStage.normalBattle) || {};
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
    layer.appendChild(el);

    const lane = state.normalSpawned % 4;
    const lanes = [w * .20, w * .40, w * .60, w * .80];
    const x = lanes[lane] + (Math.random() - .5) * Math.min(28, w * .06);
    const y = Math.max(92, h * (.16 + (state.normalSpawned % 2) * .075));
    const enemy = {
      uid: `mini_${Date.now()}_${state.normalSpawned}_${Math.random().toString(36).slice(2,6)}`,
      def: enemyDef, el, x, y, baseX: x, baseY: y,
      hp: Number(enemyDef.hp || 18),
      hpMax: Number(enemyDef.hp || 18),
      spawnedAt: now,
      lastShotAt: now + Math.random() * 500,
      phaseSeed: Math.random() * Math.PI * 2,
    };
    positionUnit(el, x, y);
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

  function fireNormalEnemy(enemy, now) {
    if (!enemy || !enemy.el || now < (state.normalEnemyStunUntil || 0)) return;
    const def = enemy.def || {};
    if (now - enemy.lastShotAt < Number(def.fireRate || 1550)) return;
    enemy.lastShotAt = now;
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const angle = Math.atan2(dy, dx);
    const speed = Number(def.bulletSpeed || 185);
    state.enemyBullets.push(makeProjectile(
      'shooting-enemy-bullet shooting-mini-enemy-bullet',
      enemy.x, enemy.y + 24,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      Number(def.bulletDamage || 85)
    ));
  }

  function updateNormalEnemies(now) {
    if (!isNormalBattle()) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const w = arena.clientWidth;
    state.normalEnemies.forEach(enemy => {
      if (!enemy || !enemy.el) return;
      const age = (now - enemy.spawnedAt) / 1000;
      enemy.x = clamp(enemy.baseX + Math.sin(age * 1.25 + enemy.phaseSeed) * Math.min(58, w * .14), 36, w - 36);
      enemy.y = enemy.baseY + Math.sin(age * .9 + enemy.phaseSeed) * 8;
      positionUnit(enemy.el, enemy.x, enemy.y);
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
      old.classList.add('defeated');
      setTimeout(() => old.remove(), 260);
    }
    enemy.el = null;
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
    // 前方移動制限：ボスのすぐ手前まで接近できるようにする。
    // ボスの現在位置を基準にするため、上下に揺れても自然な距離を保つ。
    const minY = isNormalBattle() ? Math.max(90, h * 0.23) : clamp(state.boss.y + 108, h * 0.27, h * 0.42);
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
    const bossStunned = now < (state.bossStunUntil || 0);
    if (!isNormalBattle() && !bossGrabbed && !bossStunned) {
      state.boss.x = w * 0.5 + Math.sin(t * 0.92) * w * 0.30;
      state.boss.y = Math.max(56, h * 0.17 + Math.sin(t * 1.7) * 12);
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
      p.x += p.vx * dt; p.y += p.vy * dt;
      positionUnit(p.el, p.x, p.y);
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
        registerComboHit(ownerId, now);
        const ownerMoonlightBlocked = Number(ownerId) === CHARACTER_ID.HAYATE && now < (state.hayateMoonlightUntil || 0);
        if (!ownerMoonlightBlocked) {
          const gain = Number.isFinite(chara.ultGainPerHit) ? chara.ultGainPerHit : 1;
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
      const moonlightInvulnerable = getCurrentCharacter().id === CHARACTER_ID.HAYATE && now < (state.hayateMoonlightUntil || 0);
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

  function gameLoop(ts) {
    if (!state || !state.running || state.ended || state.finishing || state.countdown) return;
    const dt = Math.min(0.032, Math.max(0, (ts - (prevTs || ts)) / 1000));
    prevTs = ts;
    if (!state.koTransition) updateMovement(dt, ts);
    const ultLocked = ts < (state.ultLockUntil || 0);
    const bossGrabbed = ts < (state.bossGrabUntil || 0);
    const bossStunned = ts < (state.bossStunUntil || 0);
    if (!state.phaseTransition && !state.koTransition && !ultLocked) {
      firePlayer(ts);
      if (isNormalBattle()) {
        spawnNormalEnemies(ts);
        updateNormalEnemies(ts);
      } else if (!bossGrabbed && !bossStunned) {
        fireBoss(ts);
      }
    }
    updateProjectiles(dt, ts);
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
    pointerX = clamp(e.clientX - r.left, 30, r.width - 30);
    pointerY = clamp(e.clientY - r.top, r.height * 0.53, r.height - 45);
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
      state.ultLockUntil = performance.now() + 800;
      pushUltTimer(() => applyUltDamage(c.burstDamage + 22, true), 420);
      return;
    }
    showUltCut(c.ultName, c.effectKey);
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
    member.ultUseCount = (member.ultUseCount || 0) + 1;
    clearUltTimers();

    if (c.ultType === 'speed_storm') useHayateUlt(c);
    else if (c.ultType === 'precision_beam') useAyaneUlt(c);
    else if (c.ultType === 'nem_stun') useNemUlt(c);
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
