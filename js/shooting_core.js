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

  const { CHARACTER_ID, SHOOTING_CHARACTERS, PARTY_SIZE, SWITCH_COOLDOWN_MS, isShootingCharacterOwned, getShootingRosterHtml, getOwnedShootingInstance } = CharacterModule;
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


  function isFacelessStage() {
    return !!(selectedStage && selectedStage.eventId === 'faceless' && selectedStage.faceless);
  }

  function isRaidStage() {
    return !!(selectedStage && selectedStage.eventId === 'raid' && selectedStage.raid);
  }

  function getBattleTimeLimitSeconds() {
    if (!selectedStage) return 0;
    const explicit = Number(selectedStage.timeLimitSeconds || 0);
    if (explicit > 0) return explicit;
    if (isRaidStage()) {
      const raidLimit = Number(selectedStage.raid?.timeLimitSeconds || 0);
      if (raidLimit > 0) return raidLimit;
    }
    const mission = selectedStage.mission || {};
    if (mission.type === SHOOTING_MISSION_TYPE.CLEAR_TIME) {
      return Math.max(0, Number(mission.targetSeconds || 0));
    }
    return 0;
  }

  function getBattleTimeLeft(now) {
    const limit = getBattleTimeLimitSeconds();
    if (!limit || !state) return 0;
    return Math.max(0, limit - (Number(now || performance.now()) - Number(state.startedAt || performance.now())) / 1000);
  }

  function formatBattleTimer(seconds) {
    const safe = Math.max(0, Number(seconds || 0));
    const whole = Math.ceil(safe);
    const min = Math.floor(whole / 60);
    const sec = whole % 60;
    return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  function updateBattleTimer(now) {
    const wrap = document.getElementById('shooting-battle-timer');
    const value = document.getElementById('shooting-battle-timer-value');
    if (!wrap || !value) return;
    const limit = getBattleTimeLimitSeconds();
    const visible = !!(limit > 0 && state && !state.ended && !state.countdown);
    wrap.classList.toggle('show', visible);
    wrap.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (!visible) return;
    const left = getBattleTimeLeft(now);
    value.textContent = formatBattleTimer(left);
    wrap.classList.toggle('is-warning', left <= 30 && left > 10);
    wrap.classList.toggle('is-danger', left <= 10);
  }

  function checkBattleTimeLimit(now) {
    const limit = getBattleTimeLimitSeconds();
    if (!limit || !state || state.ended || state.finishing || state.countdown) return false;
    if (getBattleTimeLeft(now) > 0) return false;
    state.missionFailed = true;
    endGame(false);
    return true;
  }

  function getRaidStartingHp() {
    const remoteHp = Number(selectedRaidContext && selectedRaidContext.currentHp);
    if (Number.isFinite(remoteHp) && remoteHp > 0) return remoteHp;
    return Number(selectedStage && selectedStage.raid && selectedStage.raid.maxHp) || 100000;
  }

  function isStoryShootingStage() {
    return !!(
      selectedStage &&
      /^shooting_ch\d{2}_\d{2}$/i.test(String(selectedStage.id || ''))
    );
  }

  function ensureStoryEriLeader() {
    if (!isStoryShootingStage()) return;
    selectedPartyIds = selectedPartyIds.filter(id => Number(id) !== Number(CHARACTER_ID.ERI));
    if (isShootingCharacterOwned(CHARACTER_ID.ERI)) {
      selectedPartyIds.unshift(Number(CHARACTER_ID.ERI));
    }
    selectedPartyIds = selectedPartyIds.slice(0, PARTY_SIZE);
  }

  function isShootingPartyReady() {
    if (selectedPartyIds.length < 1 || selectedPartyIds.length > PARTY_SIZE) return false;
    if (!selectedPartyIds.every(isShootingCharacterOwned)) return false;
    if (isStoryShootingStage()) {
      return Number(selectedPartyIds[0]) === Number(CHARACTER_ID.ERI);
    }
    return true;
  }

  function getFacelessConfig() {
    return isFacelessStage() ? selectedStage.faceless : null;
  }

  function getFacelessWaveHp(wave) {
    const cfg = getFacelessConfig();
    const values = cfg && Array.isArray(cfg.waveHp) ? cfg.waveHp : [7600, 19000];
    return Number(values[Math.max(0, Number(wave || 1) - 1)] || 7600);
  }

  function getFacelessObjectHp() {
    return Number(getFacelessConfig()?.objectHp || 950);
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
  let selectedRaidContext = null; // DAILY RAID: Supabaseで確定した当日の共有HP/attempt情報

  const SHOOTING_UI_LAYOUT_STORAGE_KEY = 'zeraphia_shooting_ui_layout_type';
  let shootingUiLayoutType = 1;

  // Stage high score: local cache + Supabase RPC.
  // The local cache keeps the UI usable even before the SQL patch is applied.
  const SHOOTING_HIGH_SCORE_STORAGE_KEY = 'zeraphia_shooting_high_scores_v1';
  let selectedStageHighScore = 0;

  function getShootingUserId() {
    try {
      return String(window.localStorage.getItem('zukan_user_id') || '').trim().toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function readLocalShootingHighScores() {
    try {
      const raw = window.localStorage.getItem(SHOOTING_HIGH_SCORE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeLocalShootingHighScore(stageId, score) {
    if (!stageId) return;
    const map = readLocalShootingHighScores();
    const next = Math.max(Number(map[stageId] || 0), Math.max(0, Number(score || 0)));
    map[stageId] = next;
    try { window.localStorage.setItem(SHOOTING_HIGH_SCORE_STORAGE_KEY, JSON.stringify(map)); } catch (_) {}
  }

  function getLocalShootingHighScore(stageId) {
    return Math.max(0, Number(readLocalShootingHighScores()[stageId] || 0));
  }

  function formatShootingScore(value) {
    return String(Math.max(0, Math.floor(Number(value || 0)))).padStart(6, '0');
  }

  function setShootingStageHeader(inBattle) {
    const title = document.getElementById('shooting-hud-stage-title');
    const difficulty = document.getElementById('shooting-hud-difficulty');
    const kicker = document.getElementById('shooting-hud-kicker');
    const score = document.getElementById('shooting-score');

    const isSpecialEvent = !!selectedStage?.eventId;
    // STORYでは内部マスターの固有名（朝・呼吸・邂逅・旅立ち等）をヘッダーに出さない。
    // ステージ選択画面と表記を揃え、「ステージ1〜4」で統一する。
    const stageTitle = isSpecialEvent
      ? (selectedStage?.eventTitle || selectedStage?.name || BOSS?.displayName || BOSS?.name || 'STAGE')
      : `ステージ${Number(selectedStage?.stageNo || 1)}`;
    const difficultyLabel = isSpecialEvent ? (selectedStage?.difficultyLabel || '') : '';

    if (kicker) kicker.textContent = isSpecialEvent ? 'SPECIAL EVENT' : `CHAPTER ${String(selectedStage?.chapter || 1).padStart(2, '0')}`;
    if (title) {
      // Keep the difficulty badge node while replacing the title text.
      title.childNodes.forEach(node => { if (node.nodeType === Node.TEXT_NODE) node.remove(); });
      title.insertBefore(document.createTextNode(stageTitle + (difficultyLabel ? ' ' : '')), title.firstChild);
    }
    if (difficulty) {
      difficulty.textContent = difficultyLabel ? `― ${difficultyLabel} ―` : '';
      difficulty.style.display = difficultyLabel ? 'inline' : 'none';
    }
    if (score) {
      if (inBattle) {
        score.textContent = `SCORE ${formatShootingScore(state?.score || 0)}`;
      } else {
        score.innerHTML = `<span class="shooting-high-score-label">HIGH SCORE</span><strong class="shooting-high-score-value">${formatShootingScore(selectedStageHighScore)}</strong>`;
      }
      score.classList.toggle('is-high-score', !inBattle);
    }
  }

  async function loadShootingHighScore() {
    const stageId = selectedStage?.id || '';
    if (!stageId) return 0;

    selectedStageHighScore = getLocalShootingHighScore(stageId);
    setShootingStageHeader(false);

    const sb = window.zsSupabase;
    const userId = getShootingUserId();
    if (!sb || typeof sb.rpc !== 'function' || !userId) return selectedStageHighScore;

    try {
      const result = await sb.rpc('get_shooting_high_score', {
        p_user_id: userId,
        p_stage_id: stageId
      });
      if (result?.error) throw result.error;
      const cloudScore = Math.max(0, Number(result?.data || 0));
      selectedStageHighScore = Math.max(selectedStageHighScore, cloudScore);
      writeLocalShootingHighScore(stageId, selectedStageHighScore);
      const root = document.getElementById(ROOT_ID);
      if (root && !root.classList.contains('battle-hud-visible')) setShootingStageHeader(false);
    } catch (err) {
      console.warn('[shooting] high score load skipped:', err?.message || err);
    }
    return selectedStageHighScore;
  }

  async function submitShootingHighScore(value) {
    const stageId = selectedStage?.id || state?.stageId || '';
    const scoreValue = Math.max(0, Math.floor(Number(value || 0)));
    if (!stageId) return;

    if (scoreValue > getLocalShootingHighScore(stageId)) writeLocalShootingHighScore(stageId, scoreValue);
    selectedStageHighScore = Math.max(selectedStageHighScore, scoreValue);

    const sb = window.zsSupabase;
    const userId = getShootingUserId();
    if (!sb || typeof sb.rpc !== 'function' || !userId) return;

    try {
      const result = await sb.rpc('submit_shooting_high_score', {
        p_user_id: userId,
        p_stage_id: stageId,
        p_score: scoreValue
      });
      if (result?.error) throw result.error;
      const cloudScore = Math.max(0, Number(result?.data || 0));
      selectedStageHighScore = Math.max(selectedStageHighScore, cloudScore);
      writeLocalShootingHighScore(stageId, selectedStageHighScore);
    } catch (err) {
      console.warn('[shooting] high score save skipped:', err?.message || err);
    }
  }

  function normalizeShootingUiLayoutType(value) {
    return Number(value) === 2 ? 2 : 1;
  }

  function loadShootingUiLayoutType() {
    try {
      return normalizeShootingUiLayoutType(window.localStorage.getItem(SHOOTING_UI_LAYOUT_STORAGE_KEY));
    } catch (_) {
      return 1;
    }
  }

  function saveShootingUiLayoutType(type) {
    try {
      window.localStorage.setItem(SHOOTING_UI_LAYOUT_STORAGE_KEY, String(normalizeShootingUiLayoutType(type)));
    } catch (_) {}
  }

  function applyShootingUiLayout(type) {
    shootingUiLayoutType = normalizeShootingUiLayoutType(type);
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.classList.remove('ui-type-1', 'ui-type-2');
    root.classList.add(`ui-type-${shootingUiLayoutType}`);
    const label = document.getElementById('shooting-ui-layout-label');
    if (label) label.textContent = 'UI切替';
    const toggleBtn = document.getElementById('shooting-ui-layout-btn');
    if (toggleBtn) {
      const nextType = shootingUiLayoutType === 1 ? 2 : 1;
      toggleBtn.setAttribute('data-ui-type', String(shootingUiLayoutType));
      toggleBtn.setAttribute('aria-label', `UI表示切替 現在タイプ${shootingUiLayoutType} / タップでタイプ${nextType}`);
      toggleBtn.title = `UI切替（現在 TYPE ${shootingUiLayoutType}）`;
    }
  }

  window.toggleShootingUiLayout = function () {
    const nextType = shootingUiLayoutType === 1 ? 2 : 1;
    applyShootingUiLayout(nextType);
    saveShootingUiLayoutType(nextType);
  };

  shootingUiLayoutType = loadShootingUiLayoutType();

  function getShootingResonanceLevel(id) {
    try {
      const owned = typeof getOwnedShootingInstance === 'function'
        ? getOwnedShootingInstance(Number(id))
        : null;
      return Math.max(0, Number(
        owned && (owned.limitBreak != null ? owned.limitBreak : owned.limit_break) || 0
      ));
    } catch (_) {
      return 0;
    }
  }

  function buildResonatedCharacterProfile(id) {
    const base = SHOOTING_CHARACTERS[Number(id)] || SHOOTING_CHARACTERS[CHARACTER_ID.ERI];
    const lb = getShootingResonanceLevel(id);
    if (typeof window.applyShootingResonanceToProfile === 'function') {
      return window.applyShootingResonanceToProfile(base, lb) || base;
    }
    if (window.ShootingResonance && typeof window.ShootingResonance.applyToProfile === 'function') {
      return window.ShootingResonance.applyToProfile(base, lb) || base;
    }
    return base;
  }

  function getBattleCharacter(id) {
    const numericId = Number(id);
    if (state && state.characterProfiles && state.characterProfiles[numericId]) {
      return state.characterProfiles[numericId];
    }
    return buildResonatedCharacterProfile(numericId);
  }

  function getCurrentCharacter() {
    const id = state && state.activeCharacterId ? state.activeCharacterId : selectedCharacterId;
    return getBattleCharacter(id);
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
  let countdownMoveRafId = 0;
  let prevTs = 0;
  let keys = Object.create(null);
  let pointerActive = false;
  let pointerIsTouch = false;
  let activePointerId = null;
  let pointerX = 0;
  let pointerY = 0;
  let dragStartClientX = 0;
  let dragStartClientY = 0;
  let dragStartPlayerX = 0;
  let dragStartPlayerY = 0;
  let lastPointerClientX = 0;
  let lastPointerClientY = 0;
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

  // ============================================================
  // Performance safety guard
  // ============================================================
  // 通常プレイの弾幕量・難易度には一切干渉しない。
  // DOM敵弾が異常な数まで積み上がった場合だけ、端末フリーズを避けるため
  // 古い「通常敵弾」を整理する最後の安全装置。WARNING系の危険弾は保護する。
  const ENEMY_BULLET_HARD_LIMIT = 520;
  const ENEMY_BULLET_RECOVERY_TARGET = 460;

  // DAILY RAIDだけは長時間戦になるため、DOM敵弾が増えすぎる前に通常弾生成を抑える。
  // WARNING / danger系はこの制限対象外。
  const RAID_ENEMY_BULLET_SOFT_LIMIT = 240;
  const RAID_ENEMY_BULLET_HARD_LIMIT = 300;
  const RAID_ENEMY_BULLET_RECOVERY_TARGET = 260;
  let lastEnemyBulletGuardLogAt = 0;

  // 自機弾側にも同じ安全装置を用意する。複数キャラの高速射撃が重なった場合の
  // 保険で、通常プレイのDPS/弾数バランスには影響しない値に設定している。
  const PLAYER_BULLET_HARD_LIMIT = 400;
  const PLAYER_BULLET_RECOVERY_TARGET = 340;
  let lastPlayerBulletGuardLogAt = 0;

  function isTouchLikePointer(e) {
    return !!(
      e && (
        e.pointerType === 'touch' ||
        e.pointerType === 'pen' ||
        ((navigator.maxTouchPoints || 0) > 0 &&
         window.matchMedia &&
         window.matchMedia('(pointer: coarse)').matches)
      )
    );
  }

  // スマホ操作時、指がキャラクター(と被弾判定コア)を隠してしまう対策。
  // 指の実際の接地点より、キャラクターを上にずらして表示する。
  // マウス/ペン操作では正確な1:1追従のままにするため、touchの時だけ適用する。
  const TOUCH_Y_OFFSET = 50;

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

  // ============================================================
  // パフォーマンス対策：当たり判定の脱DOM化
  // ============================================================
  // 弾・敵・デコイは元々 x/y をJS側の数値として持っており、DOMはそれを
  // 描画しているだけ(positionUnit)。にもかかわらず毎フレームの当たり判定で
  // el.getBoundingClientRect() を呼ぶと、弾の数×敵の数に比例して
  // 強制レイアウト計算が走り、弾幕が濃くなるほど重くなっていた。
  //
  // サイズ(幅/高さ)は生成時に一度だけ実測してキャッシュ(_hw/_hh)し、
  // 毎フレームは x/y の数値計算だけでrectsHitと同じ形の矩形を作る。
  // rectsHitはただの数値比較なので、DOM由来かどうかは問わない。
  function measureUnitSize(entry) {
    if (!entry || !entry.el) return;
    const r = entry.el.getBoundingClientRect();
    entry._hw = r.width / 2;
    entry._hh = r.height / 2;
  }

  // arenaRectはフレーム内で使い回す(呼び出し側で1回だけ取得する想定)。
  // x/yはarena基準のローカル座標なので、getBoundingClientRect()と同じ
  // ビューポート座標系に変換してから比較できるようにする。
  // これにより、まだ数値化していない他の当たり判定(ボス等)ともそのまま混在できる。
  function getUnitRect(entry, arenaRect) {
    const hw = Number(entry && entry._hw) || 0;
    const hh = Number(entry && entry._hh) || 0;
    const x = arenaRect.left + Number(entry.x || 0);
    const y = arenaRect.top + Number(entry.y || 0);
    return { left: x - hw, right: x + hw, top: y - hh, bottom: y + hh };
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
      const c = buildResonatedCharacterProfile(id);
      const fixedStoryEri =
        isStoryShootingStage() &&
        i === 0 &&
        Number(id) === Number(CHARACTER_ID.ERI);
      return fixedStoryEri
        ? `<button type="button" class="shooting-party-slot filled fixed" aria-label="${c.name}・ストーリー固定枠">
            <img src="${c.panelImage || c.image}" alt="${c.name}" draggable="false"><small>${c.name}</small>
          </button>`
        : `<button type="button" class="shooting-party-slot filled" onclick="removeShootingPartyCharacter(${id})" aria-label="${c.name}を外す">
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
    if (isStoryShootingStage() && id === Number(CHARACTER_ID.ERI)) return;
    const idx = selectedPartyIds.indexOf(id);
    if (idx >= 0) selectedPartyIds.splice(idx, 1);
    if (isStoryShootingStage()) ensureStoryEriLeader();
    selectedCharacterId = selectedPartyIds[0] || CHARACTER_ID.ERI;
    applySelectedCharacterToUi();
  };

  function applySelectedCharacterToUi() {
    if (isStoryShootingStage()) ensureStoryEriLeader();
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
    const ruleText = document.getElementById('shooting-party-rule-text');
    if (ruleText) {
      ruleText.textContent = isStoryShootingStage()
        ? '最大3人 · エリ固定 · 1人から出撃可能'
        : '最大3人 · 1人から出撃可能';
    }

    const startBtn = document.getElementById('shooting-character-start');
    if (startBtn) {
      const ready = isShootingPartyReady();
      startBtn.disabled = !ready;
      startBtn.textContent = ready ? '戦闘開始' : 'あと 1人 選択';
    }
    renderSwitchRail(true);
  }

  function setBattleHudVisible(visible) { UIModule.setBattleHudVisible(ROOT_ID, visible); }
  function setCharacterSelectVisible(visible) { UIModule.setCharacterSelectVisible(ROOT_ID, visible); }
  function setCommonUiVisible(open) { UIModule.setCommonUiVisible(open); }

  function resetState() {
    selectedPartyIds = selectedPartyIds
      .map(Number)
      .filter((id, index, arr) =>
        arr.indexOf(id) === index &&
        !!SHOOTING_CHARACTERS[id] &&
        isShootingCharacterOwned(id)
      )
      .slice(0, PARTY_SIZE);

    if (isStoryShootingStage()) ensureStoryEriLeader();

    selectedCharacterId =
      selectedPartyIds[0] ||
      Object.keys(SHOOTING_CHARACTERS).map(Number).find(isShootingCharacterOwned) ||
      CHARACTER_ID.ERI;

    const resolvedProfiles = Object.create(null);
    selectedPartyIds.forEach(id => {
      resolvedProfiles[Number(id)] = buildResonatedCharacterProfile(id);
    });

    state = {
      characterProfiles: resolvedProfiles,
      running: false, ended: false, finishing: false, countdown: true,
      phaseTransition: false, koTransition: false,
      activeCharacterId: selectedCharacterId,
      switchReadyAt: 0,
      party: selectedPartyIds.map(id => {
        const c = resolvedProfiles[Number(id)] || buildResonatedCharacterProfile(id);
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
      mimosaItems: [],
      boss: {
        x: 0, y: 42,
        hp: isRaidStage() ? getRaidStartingHp() : (isFacelessStage() ? getFacelessWaveHp(1) : Number(BOSS.gaugeHp || BOSS.hp || 1) * Number(BOSS.gauges || 1)),
        hpMax: isRaidStage() ? Number(selectedStage.raid.maxHp || 100000) : (isFacelessStage() ? getFacelessWaveHp(1) : Number(BOSS.gaugeHp || BOSS.hp || 1) * Number(BOSS.gauges || 1)),
        gaugeHp: isRaidStage() ? Math.ceil(Number(selectedStage.raid.maxHp || 100000) / 3) : (isFacelessStage() ? getFacelessWaveHp(1) : Number(BOSS.gaugeHp || BOSS.hp || 1)),
        gauges: isRaidStage() ? 3 : (isFacelessStage() ? 1 : Number(BOSS.gauges || 1)),
        phase: 1
      },
      raidInitialHp: isRaidStage() ? getRaidStartingHp() : 0,
      raidDamageDealt: 0,
      raidAttemptFinished: false,
      raidLastBossHitVisualAt: 0,
      raidLastBossDamageNumberAt: 0,
      facelessWave: isFacelessStage() ? 1 : 0,
      facelessSummonTriggered: false,
      facelessObjects: [],
      facelessObjectSeq: 0,
      bossMotionBlendFromX: 0,
      bossMotionBlendFromY: 0,
      bossMotionBlendStartedAt: 0,
      bossMotionBlendDurationMs: 420,
      // BOSS大技（WARNING付き即死弾）制御
      nextBossDangerAt: 0, bossDangerExecuteAt: 0, bossDangerWarningEl: null,
      bossDangerPatternIndex: 0,
      bullets: [], enemyBullets: [], score: 0, shotsHit: 0,
      combo: 0, maxCombo: 0, lastComboHitAt: 0,
      ultActiveUntil: 0, ultLockUntil: 0, hayateMoonlightUntil: 0,
      ultCutinActive: false, ultCutinTimer: 0, skipNextUltCut: false,
      paused: false, pauseStartedAt: 0,
      arnoAuraUntil: 0, arnoAuraNextTickAt: 0, arnoAuraOwnerId: 0,
      clarineDecoys: [], clarineDecoySeq: 0,
      ignisLaserEl: null, ignisLaserHideAt: 0,
      ignisFireWheel: null,
      ignisBossBurnUntil: 0, ignisBossBurnNextTickAt: 0,
      roseFlower: null, roseHeartSeq: 0,
      eltenaBlackHole: null,
      ultTimerIds: [], bossGrabUntil: 0, bossStunUntil: 0, lastShotAt: -9999, lastBossShotAt: -9999, shotIndex: 0,
      startedAt: performance.now(), clearTimeMs: 0,
    };

    if (isRaidStage() && state.boss) {
      const remainingGauges = Math.max(1, Math.ceil(state.boss.hp / state.boss.gaugeHp));
      state.boss.phase = Math.max(1, Math.min(3, 4 - remainingGauges));
    }
  }

  function renderSwitchRail(rebuild) {
    const rail = document.getElementById('shooting-switch-rail');
    if (!rail || !state || !Array.isArray(state.party)) return;
    const others = state.party.filter(m => m.id !== state.activeCharacterId);
    if (rebuild || rail.children.length !== others.length) {
      rail.innerHTML = others.map(m => {
        const c = getBattleCharacter(m.id);
        return `<button type="button" class="shooting-switch-btn" data-switch-id="${m.id}" onclick="switchShootingCharacter(${m.id})">
          <span class="shooting-switch-ult-ring" aria-hidden="true"></span>
          <img src="${c.panelImage || c.image}" alt="${c.name}" draggable="false">
          <span class="shooting-switch-buff-badge" aria-hidden="true"></span>
          <span class="shooting-switch-name">${c.name}</span>
          <span class="shooting-switch-hp"><i></i></span>
          <small class="shooting-switch-status"></small>
        </button>`;
      }).join('');
    }
    const remain = Math.max(0, (state.switchReadyAt || 0) - performance.now());
    const now = performance.now();
    rail.querySelectorAll('.shooting-switch-btn').forEach(btn => {
      const id = Number(btn.getAttribute('data-switch-id'));
      const m = getPartyMember(id);
      if (!m) return;
      const c = getBattleCharacter(id);
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

      // ミモザの恩恵アイテム効果は、控え中でも「まだ効いているか」が
      // 見た目で分かるよう小さいバッジで表示する(交代しても他人には移らない)。
      const isInvincible = now < (m.invincibleUntil || 0);
      const hasAtkBuff = now < (m.atkBuffUntil || 0);
      btn.classList.toggle('has-invincible-buff', isInvincible);
      btn.classList.toggle('has-atk-buff', !isInvincible && hasAtkBuff);
      const buffBadge = btn.querySelector('.shooting-switch-buff-badge');
      if (buffBadge) {
        buffBadge.textContent = isInvincible ? '無敵' : hasAtkBuff ? 'ATK' : '';
      }
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
    if (!state || state.ended || state.finishing || state.koTransition) return;
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

    // iPhone対策:
    // キャラ切替時に「指の座標へ即代入」すると、再描画タイミング次第でワープに見える。
    // キャラチェンジ時は移動目標を保持したままドラッグ基準だけ更新する。
    // 指を離さず操作している時の「一瞬止まる」感覚をなくす。
    rebaseTouchDragToPlayer(true);

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
    arena.querySelectorAll('.shooting-bullet,.shooting-enemy-bullet,.shooting-hit,.shooting-arno-aura,.shooting-clarine-decoy,.shooting-clarine-decoy-burst,.shooting-ignis-laser,.shooting-ignis-fire-wheel,.shooting-ignis-burn,.shooting-rose-flower,.shooting-ult-cutin,.shooting-faceless-object,.shooting-faceless-object-hp,.shooting-faceless-battle-cut,.shooting-boss-danger-warning').forEach(el => el.remove());
    if (state) {
      state.bullets = [];
      state.enemyBullets = [];
      state.clarineDecoys = [];
      state.ignisLaserEl = null;
      state.ignisFireWheel = null;
      state.roseFlower = null;
      state.bossDangerWarningEl = null;
      state.bossDangerExecuteAt = 0;
      if (Array.isArray(state.facelessObjects)) {
        state.facelessObjects.forEach(obj => {
          obj?.el?.remove();
          obj?.hpEl?.remove();
        });
        state.facelessObjects = [];
      }
    }
  }

  // ============================================================
  // 時限バフ / 無敵の統一ステータス取得
  // ============================================================
  // 「無敵」「ATK UP」など時限で発生するプレイヤーバフは、発生源(ミモザの
  // アイテム、ハヤテの月光モードなど)がどれだけ増えても、自機のリング演出・
  // 頭上バッジ・切り替えボタンのバフアイコンに"自動的に"反映されるよう、
  // 判定をこの関数だけに集約する。
  //
  // 今後、新しいキャラのULTなどで時限の無敵/ATK UPを追加する場合：
  //   - member単位で完結する効果 → member.invincibleUntil / member.atkBuffUntil
  //     （+ member.atkBuffMultiplier）をそのまま使えば、この関数を触らずに
  //     自動でUI反映される。
  //   - state単位（ハヤテの月光モードのように「このキャラがアクティブな間だけ」
  //     成立する効果）→ 下のinvincibleSources / atkBuffSources 配列に
  //     1エントリ追記するだけでよい。
  //
  // 将来「HP吸収UP」「被ダメージ軽減」等の別種バフを追加する場合も、
  // 同じ形（sources配列 + Math.max/優先順位で1つに絞る）を踏襲すること。
  function getPlayerBuffStatus(member, chara, now) {
    if (!member) {
      return { invincibleLeft: 0, atkBuffLeft: 0, atkBuffMultiplier: 1 };
    }

    // ---- 無敵：発生源が増えたらここに1行足すだけでよい ----
    const invincibleSources = [
      (member.invincibleUntil || 0) - now, // ミモザ「ミモザの贈り物」
      chara && chara.id === CHARACTER_ID.HAYATE
        ? (state.hayateMoonlightUntil || 0) - now // ハヤテ「雷光巡行」月光モード
        : -Infinity,
    ];
    const invincibleLeft = Math.max(0, ...invincibleSources);

    // ---- ATK UP：発生源が増えたらここに1エントリ足すだけでよい ----
    // { left: 残りms, multiplier: 表示用倍率 } の配列から、残り時間が最大のものを採用する。
    const atkBuffSources = [
      { left: (member.atkBuffUntil || 0) - now, multiplier: Number(member.atkBuffMultiplier || 1.3) }, // ミモザのアイテム
      {
        left: chara && chara.id === CHARACTER_ID.HAYATE ? (state.hayateMoonlightUntil || 0) - now : -Infinity,
        multiplier: Number((chara && chara.moonlightPowerMultiplier) || 1.85), // ハヤテ自身の月光モードATK UP
      },
    ].filter(entry => entry.left > 0);

    let atkBuffLeft = 0;
    let atkBuffMultiplier = 1;
    if (atkBuffSources.length) {
      const best = atkBuffSources.reduce((a, b) => (b.left > a.left ? b : a));
      atkBuffLeft = best.left;
      atkBuffMultiplier = best.multiplier;
    }

    return { invincibleLeft, atkBuffLeft, atkBuffMultiplier };
  }

  function renderHud() {
    if (!state) return;
    updateBattleTimer(performance.now());
    const bossBar = document.getElementById('shooting-boss-bar');
    const bossGauge = bossBar ? bossBar.querySelector('i') : null;
    const bossPhase = document.getElementById('shooting-boss-phase');
    const score = document.getElementById('shooting-score');
    const comboCount = document.getElementById('shooting-combo-count');
    const hpText = document.getElementById('shooting-player-hp-text');
    const hpBar = document.querySelector('#shooting-player-hp-bar i');
    const gaugeWrap = document.getElementById('shooting-ult-side');
    const gauge = document.getElementById('shooting-burst-gauge');

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
    if (bossPhase) {
      bossPhase.textContent = isFacelessStage()
        ? `WAVE ${state.facelessWave || 1} / 2`
        : `PHASE ${phase} / ${state.boss.gauges}`;
    }
    if (score) {
      const root = document.getElementById(ROOT_ID);
      if (root?.classList.contains('battle-hud-visible')) {
        score.textContent = `SCORE ${formatShootingScore(state.score)}`;
        score.classList.remove('is-high-score');
      }
    }
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
          // アイテム収集ミッションは、敵撃破数を勝利条件に含めない。
          missionProgress.textContent = `ITEM ${state.collectedItems}/${Number(m.target || 3)}`;
        } else if (m.type === SHOOTING_MISSION_TYPE.CLEAR_TIME) {
          missionProgress.textContent = `ENEMY ${state.normalDefeated}/${total}`;
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

    // 無敵・ATK UPの時限バフを自機に分かりやすく可視化する。
    // 発生源の判定はgetPlayerBuffStatusに集約済み。ここでは結果を表示に反映するだけ。
    const nowHud = performance.now();
    const playerEl = document.getElementById(PLAYER_ID);
    const buffBadges = document.getElementById('shooting-player-buff-badges');
    if (member && playerEl) {
      const buffStatus = getPlayerBuffStatus(member, chara, nowHud);
      const invincibleLeft = buffStatus.invincibleLeft;
      const atkBuffLeft = buffStatus.atkBuffLeft;
      const isInvincible = invincibleLeft > 0;
      const hasAtkBuff = atkBuffLeft > 0;

      playerEl.classList.toggle('shooting-invincible-active', isInvincible);
      playerEl.classList.toggle('shooting-atk-buff-active', hasAtkBuff);

      if (buffBadges) {
        const badges = [];
        if (isInvincible) {
          badges.push(`<span class="shooting-player-buff-badge invincible">無敵 ${(invincibleLeft / 1000).toFixed(1)}s</span>`);
        }
        if (hasAtkBuff) {
          const mult = buffStatus.atkBuffMultiplier.toFixed(1);
          badges.push(`<span class="shooting-player-buff-badge atk">ATK×${mult} ${(atkBuffLeft / 1000).toFixed(1)}s</span>`);
        }
        buffBadges.innerHTML = badges.join('');
        buffBadges.setAttribute('aria-hidden', badges.length ? 'false' : 'true');
      }
    } else if (playerEl) {
      playerEl.classList.remove('shooting-invincible-active', 'shooting-atk-buff-active');
      if (buffBadges) { buffBadges.innerHTML = ''; buffBadges.setAttribute('aria-hidden', 'true'); }
    }

    const pct = member ? clamp(member.burst / chara.burstNeed, 0, 1) : 0;
    const ultReady =
      pct >= 1 &&
      !state.ended &&
      !state.phaseTransition &&
      !state.koTransition &&
      performance.now() >= (state.ultLockUntil || 0);

    if (gauge) gauge.style.setProperty('--ult-fill', String(pct));
    if (gaugeWrap) gaugeWrap.classList.toggle('is-ready', ultReady);

    if (member && !ultReady && pct < 1) {
      member.ultReadyNotified = false;
    }

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

  // ミモザのULTアイテム取得時など、画面中央に短時間テキストを出すための共通演出。
  // showUltReadyNoticeと同じHTML構造・タイミング・アニメーションクラスを流用し、
  // デザインを統一する。
  function showShootingItemEffectNotice(label, detail) {
    const root = document.getElementById(ROOT_ID);
    if (!root || !state || state.ended) return;

    const old = root.querySelector('.shooting-item-effect-notice');
    if (old) old.remove();

    const el = document.createElement('div');
    el.className = 'shooting-item-effect-notice';
    el.innerHTML = `<span>ITEM GET</span><strong>${label}</strong><small>${detail}</small>`;
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
    measureUnitSize(p);
    return p;
  }

  function isProtectedEnemyProjectile(p) {
    if (!p) return false;
    if (p.dangerRicochet || p.dangerDrift) return true;
    const el = p.el;
    if (!el || !el.classList) return false;
    // 将来WARNING弾のクラス名が増えても、danger / warning を含むものは保護する。
    const cls = String(el.className || '').toLowerCase();
    return cls.includes('danger') || cls.includes('warning');
  }

  function enforceEnemyBulletSafetyLimit(now) {
    if (!state || !Array.isArray(state.enemyBullets)) return;
    const current = state.enemyBullets.length;
    const hardLimit = isRaidStage() ? RAID_ENEMY_BULLET_HARD_LIMIT : ENEMY_BULLET_HARD_LIMIT;
    const recoveryTarget = isRaidStage() ? RAID_ENEMY_BULLET_RECOVERY_TARGET : ENEMY_BULLET_RECOVERY_TARGET;
    if (current <= hardLimit) return;

    let removeNeeded = Math.max(0, current - recoveryTarget);
    let removed = 0;
    const kept = [];

    // enemyBulletsは生成順にpushされるため、先頭から整理すると古い通常弾から消える。
    // 危険弾は上限超過時でも残し、ゲーム固有ギミックを壊さない。
    for (const p of state.enemyBullets) {
      if (removeNeeded > 0 && p && p.el && !isProtectedEnemyProjectile(p)) {
        p.el.remove();
        removeNeeded--;
        removed++;
        continue;
      }
      kept.push(p);
    }

    state.enemyBullets = kept;

    // テスト時に発動有無を追えるよう、最大5秒に1回だけconsoleへ記録。
    if (removed > 0 && now - lastEnemyBulletGuardLogAt >= 5000) {
      lastEnemyBulletGuardLogAt = now;
      console.warn(`[shooting] enemy bullet safety guard: ${current} -> ${state.enemyBullets.length}`);
    }
  }

  function enforcePlayerBulletSafetyLimit(now) {
    if (!state || !Array.isArray(state.bullets)) return;
    const current = state.bullets.length;
    if (current <= PLAYER_BULLET_HARD_LIMIT) return;

    let removeNeeded = Math.max(0, current - PLAYER_BULLET_RECOVERY_TARGET);
    let removed = 0;
    const kept = [];

    // state.bulletsも生成順にpushされるため、古い自機弾から間引く。
    for (const p of state.bullets) {
      if (removeNeeded > 0 && p && p.el) {
        p.el.remove();
        removeNeeded--;
        removed++;
        continue;
      }
      kept.push(p);
    }

    state.bullets = kept;

    if (removed > 0 && now - lastPlayerBulletGuardLogAt >= 5000) {
      lastPlayerBulletGuardLogAt = now;
      console.warn(`[shooting] player bullet safety guard: ${current} -> ${state.bullets.length}`);
    }
  }

  function getRaidOrdinaryEnemyBulletCount() {
    if (!state || !Array.isArray(state.enemyBullets)) return 0;
    let count = 0;
    for (const p of state.enemyBullets) {
      if (p && p.el && !isProtectedEnemyProjectile(p)) count++;
    }
    return count;
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

  function createArnoOrbitProjectile(c, now, damage) {
    const startY = state.player.y - c.shotOffsetY;
    const attrClass = getCharacterBulletClass(c);
    const p = makeProjectile(
      'shooting-bullet shooting-bullet-arno' + attrClass,
      state.player.x,
      startY,
      0,
      -Number(c.bulletSpeed || 455),
      Number(damage ?? (Number(c.atk || 0) * Number(c.shotPowerRate || 0.095))),
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

    if (isFacelessStage()) {
      const obj = (state.facelessObjects || [])
        .filter(o =>
          o && o.hp > 0 &&
          Math.abs(Number(o.x || 0) - x) <= hitWidth &&
          Number(o.y || 0) < startY
        )
        .sort((a, b) => Number(b.y || 0) - Number(a.y || 0))[0];
      if (obj) return { isFacelessObject: true, object: obj, x: obj.x, y: obj.y };
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

    if (target.isFacelessObject && target.object) {
      damageFacelessObject(target.object, damage, now);
      state.score += Math.round(damage * 60);
    } else if (target.isBoss) {
      const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(damage || 0)));
      state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
      createHit(state.boss.x, state.boss.y, false);
      showBossDamageNumber(appliedDamage, false);
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
        if (c.id === state.activeCharacterId) {
          showShootingUltFullChargeNotice();
        }
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

    // ミモザのATK UPアイテムは、取得した瞬間のアクティブキャラ(member)にのみ
    // 紐づく一時バフ。交代すると効果は外れ、他キャラには一切影響しない。
    const activeMember = getActiveMember();
    const itemAtkBuffMultiplier =
      activeMember && now < (activeMember.atkBuffUntil || 0)
        ? Number(activeMember.atkBuffMultiplier || 1)
        : 1;

    const effectiveFireRate = Number(c.fireRate || 170) * fireRateMultiplier;
    const effectivePower =
      Number(c.atk || 0) *
      Number(c.shotPowerRate || 0.095) *
      powerMultiplier *
      itemAtkBuffMultiplier;

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
        const p = createArnoOrbitProjectile(c, now, effectivePower);
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
    const cfg = getNormalBattleConfig();
    const stageEnemyHp = Number(cfg.enemyHp);
    const enemyHp = Number.isFinite(stageEnemyHp)
      ? stageEnemyHp
      : Number(enemyDef.hp || 18);

    const enemy = {
      uid: `mini_${Date.now()}_${state.normalSpawned}_${Math.random().toString(36).slice(2,6)}`,
      def: enemyDef, el, hpEl: hpWrap, x, y, baseX: x, baseY: y,
      hp: enemyHp,
      hpMax: enemyHp,
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
    requestAnimationFrame(() => {
      el.classList.remove('spawning');
      // spawningクラス除去後(最終的な--enemy-scale込みの見た目)でサイズを実測してキャッシュする。
      // ここでのgetBoundingClientRect呼び出しは生成時に1回だけなので、毎フレームのコストにはならない。
      measureUnitSize(enemy);
    });
    return enemy;
  }

  function spawnNormalEnemies(now) {
    if (!isNormalBattle() || state.finishing || state.ended) return;
    const cfg = getNormalBattleConfig();
    const infiniteEnemies = !!cfg.infiniteEnemies;
    const total = Number(cfg.totalEnemies || 7);
    const maxActive = Number(cfg.maxActive || 2);
    const interval = Number(cfg.spawnIntervalMs || 900);

    // CH03などの無限湧きステージでは、撃破数ではスポーンを止めない。
    // ミッション達成まで常にmaxActiveを補充する。
    if ((!infiniteEnemies && state.normalSpawned >= total) || state.normalEnemies.length >= maxActive) return;
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
      const cfg = getNormalBattleConfig();
      const level = Math.max(1, Math.min(3, Number(cfg.barrageLevel || 2)));
      const fireRate = Number(cfg.enemyFireRate || def.fireRate || 1220);

      if (now - enemy.lastShotAt < fireRate) return;
      enemy.lastShotAt = now;

      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      const baseAngle = Math.atan2(dy, dx);
      const speed = Number(cfg.enemyBulletSpeed || def.bulletSpeed || 220);
      const damage = Number(cfg.enemyBulletDamage || def.bulletDamage || 105);

      if (level === 1) {
        // CH03-01 弱:
        // 3WAY → 5WAY。正面中心で、弾間隔も広い。
        const pattern = enemy.actionIndex % 2;

        if (pattern === 0) {
          [-0.28, 0, 0.28].forEach(offset => {
            shootNormalEnemyProjectile(
              enemy,
              baseAngle + offset,
              speed,
              damage,
              'shooting-enemy-bullet shooting-mini-enemy-bullet'
            );
          });
        } else {
          [-0.42, -0.21, 0, 0.21, 0.42].forEach(offset => {
            shootNormalEnemyProjectile(
              enemy,
              baseAngle + offset,
              speed * 0.94,
              damage,
              'shooting-enemy-bullet shooting-mini-enemy-bullet'
            );
          });
        }

        enemy.actionIndex = (enemy.actionIndex + 1) % 2;
        return;
      }

      if (level === 2) {
        // CH03-02 中:
        // 5WAY → 揺れる7WAY → 8発リング。
        const pattern = enemy.actionIndex % 3;

        if (pattern === 0) {
          [-0.42, -0.21, 0, 0.21, 0.42].forEach(offset => {
            shootNormalEnemyProjectile(
              enemy,
              baseAngle + offset,
              speed,
              damage,
              'shooting-enemy-bullet shooting-mini-enemy-bullet'
            );
          });
        } else if (pattern === 1) {
          const phaseOffset = Math.sin((enemy.phaseSeed || 0) + now * 0.0028) * 0.12;
          [-0.54, -0.36, -0.18, 0, 0.18, 0.36, 0.54].forEach(offset => {
            shootNormalEnemyProjectile(
              enemy,
              baseAngle + offset + phaseOffset,
              speed * 0.96,
              damage,
              'shooting-enemy-bullet shooting-mini-enemy-bullet'
            );
          });
        } else {
          const startAngle = (enemy.phaseSeed || 0) + now * 0.0018;
          for (let i = 0; i < 8; i++) {
            const angle = startAngle + (Math.PI * 2 * i / 8);
            shootNormalEnemyProjectile(
              enemy,
              angle,
              speed * 0.80,
              Math.max(1, damage - 10),
              'shooting-enemy-bullet shooting-mini-enemy-bullet'
            );
          }
        }

        enemy.actionIndex = (enemy.actionIndex + 1) % 3;
        return;
      }

      // CH03-03 強:
      // 7WAY → 回転9WAY → 12発リング。
      // BOSS前の最終練習として、通路を読む必要がある密度にする。
      const pattern = enemy.actionIndex % 3;

      if (pattern === 0) {
        [-0.57, -0.38, -0.19, 0, 0.19, 0.38, 0.57].forEach(offset => {
          shootNormalEnemyProjectile(
            enemy,
            baseAngle + offset,
            speed,
            damage,
            'shooting-enemy-bullet shooting-mini-enemy-bullet'
          );
        });
      } else if (pattern === 1) {
        const phaseOffset = Math.sin((enemy.phaseSeed || 0) + now * 0.0035) * 0.20;
        [-0.72, -0.54, -0.36, -0.18, 0, 0.18, 0.36, 0.54, 0.72].forEach(offset => {
          shootNormalEnemyProjectile(
            enemy,
            baseAngle + offset + phaseOffset,
            speed * 1.02,
            damage,
            'shooting-enemy-bullet shooting-mini-enemy-bullet'
          );
        });
      } else {
        const startAngle = (enemy.phaseSeed || 0) + now * 0.0027;
        for (let i = 0; i < 12; i++) {
          const angle = startAngle + (Math.PI * 2 * i / 12);
          shootNormalEnemyProjectile(
            enemy,
            angle,
            speed * 0.86,
            Math.max(1, damage - 12),
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

      // エルテナULT吸引中は通常の移動AIを止める。
      // 旧実装ではこの後の通常AIが毎フレーム baseX/baseY から位置を再計算し、
      // ブラックホール側の吸引移動を実質リセットしていたため、
      // 「移動ロックは掛かるが吸い込まれない敵」が発生していた。
      const activeBlackHole =
        state.eltenaBlackHole &&
        state.eltenaBlackHole.phase === 'active' &&
        now < Number(state.eltenaBlackHole.activeUntil || 0);

      if (activeBlackHole) {
        // 攻撃も止め、吸引中は位置更新をブラックホール処理だけに一元化する。
        enemy.dashVx = 0;
        enemy.dashVy = 0;
        if (enemy.attackState === 'dash') {
          enemy.attackState = 'idle';
          enemy.el.classList.remove('violence-dash');
        }
        return;
      }

      // アヤネULTで掴まれている敵だけを個別拘束する。
      // global stunではなく、命中した敵だけ7秒間停止。
      if (now < Number(enemy.ayaneGrabUntil || 0)) {
        enemy.dashVx = 0;
        enemy.dashVy = 0;
        enemy.attackState = 'idle';
        positionUnit(enemy.el, enemy.x, enemy.y);
        positionMiniEnemyHp(enemy);
        return;
      }

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

    const cfg = getNormalBattleConfig();
    const configuredDropRate = Number(cfg.itemDropRate);

    // CH03: 敵撃破時に80%抽選など、ステージ設定の確率ドロップを使用。
    if (Number.isFinite(configuredDropRate)) {
      return Math.random() < clamp(configuredDropRate, 0, 1);
    }

    // 既存CHAPTERの収集ステージは従来の保証ドロップ方式を維持。
    const total = Number(cfg.totalEnemies || 7);
    const milestones = Array.from({length: target}, (_, i) =>
      Math.max(1, Math.round(total * (i + 1) / (target + 1)))
    );
    return milestones.includes(defeatedNo) ||
      defeatedNo >= total - (target - state.collectedItems - state.collectibles.length);
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
    const appliedDamage = Math.min(enemy.hp, Math.max(0, Number(amount || 0)));
    enemy.hp = Math.max(0, enemy.hp - appliedDamage);
    renderMiniEnemyHp(enemy, true);
    createHit(enemy.x, enemy.y, !!big);
    showDamageNumber(enemy.x, enemy.y, appliedDamage, 'enemy', !!big);
    if (enemy.el) {
      sustainHitFeedback(enemy.el, big ? 210 : 145);
    }
    if (enemy.hp > 0) return;

    // アヤネ拘束中に撃破された場合、残っている拘束演出を即掃除。
    enemy.ayaneGrabUntil = 0;
    if (enemy.ayaneGrabMarker) {
      enemy.ayaneGrabMarker.remove();
      enemy.ayaneGrabMarker = null;
    }
    if (enemy.el) enemy.el.classList.remove('ayane-grabbed', 'ayane-multi-grabbed');

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
      // アイテム収集ミッションは敵全滅を要求しない。
      // 指定数のアイテムを取得した瞬間にクリア。
      state.missionComplete = state.collectedItems >= Number(mission.target || 3);
    } else {
      state.missionComplete = allDefeated;
    }
    if (state.missionComplete) beginNormalStageClear();
  }

  function showStageClearSequence(onComplete) {
    const root = document.getElementById(ROOT_ID);
    if (!root) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    root.querySelectorAll('.shooting-clear-condition-achieved').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'shooting-clear-condition-achieved';
    overlay.setAttribute('aria-live', 'assertive');
    overlay.innerHTML = `
      <div class="shooting-clear-condition-achieved-line"></div>
      <div class="shooting-clear-condition-achieved-copy">
        <strong></strong>
      </div>
      <div class="shooting-clear-condition-achieved-line"></div>
    `;

    root.appendChild(overlay);

    const copy = overlay.querySelector('strong');
    const steps = [
      { text: 'クリア条件達成', phase: 'condition-phase', hold: 1320 },
      { text: 'STAGE CLEAR', phase: 'stage-clear-phase', hold: 1480 }
    ];
    let index = 0;

    const finish = () => {
      overlay.classList.add('sequence-out');
      setTimeout(() => {
        overlay.remove();
        if (typeof onComplete === 'function') onComplete();
      }, 620);
    };

    const showStep = () => {
      if (!overlay.isConnected || !copy) return finish();
      const step = steps[index];

      overlay.classList.remove('condition-phase', 'stage-clear-phase', 'step-out');
      overlay.classList.add(step.phase, 'show');
      copy.textContent = step.text;
      copy.classList.remove('ceremony-pop');
      void copy.offsetWidth;
      copy.classList.add('ceremony-pop');

      setTimeout(() => {
        if (!overlay.isConnected) return;
        overlay.classList.add('step-out');

        setTimeout(() => {
          index += 1;
          if (index < steps.length) showStep();
          else finish();
        }, 360);
      }, step.hold);
    };

    requestAnimationFrame(showStep);
  }

  function beginNormalStageClear() {
    if (!state || state.ended || state.finishing) return;
    state.finishing = true;
    state.running = false;
    cancelAnimationFrame(rafId);
    clearEnemyBulletsOnly();
    renderHud();
    document.getElementById(ROOT_ID)?.classList.add('normal-stage-clear');

    // 全通常ステージ共通：クリア条件達成 → STAGE CLEAR → RESULT。
    showStageClearSequence(() => {
      if (!state || state.ended) return;
      const root = document.getElementById(ROOT_ID);
      if (root) root.classList.remove('normal-stage-clear');
      state.finishing = false;
      endGame(true);
    });
  }

  function clearNormalBattleObjects() {
    if (!state) return;
    (state.normalEnemies || []).forEach(enemy => enemy?.el?.remove());
    (state.collectibles || []).forEach(item => item?.el?.remove());
    (state.mimosaItems || []).forEach(item => item?.el?.remove());
    state.normalEnemies = [];
    state.collectibles = [];
    state.mimosaItems = [];
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


  function showFacelessBattleCut(title, sub) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.querySelectorAll('.shooting-faceless-battle-cut').forEach(el => el.remove());
    const el = document.createElement('div');
    el.className = 'shooting-faceless-battle-cut';
    el.innerHTML = `<small>${sub || 'FACELESS'}</small><strong>${title || '無貌の天使'}</strong>`;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => el.classList.add('out'), 650);
    setTimeout(() => el.remove(), 1050);
  }

  function spawnFacelessObject(x, y, ways) {
    if (!state || !isFacelessStage()) return null;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;

    const el = document.createElement('img');
    el.className = 'shooting-faceless-object';
    el.src = 'images/enemy_faceless_battle_object.webp';
    el.alt = '仮面';
    el.draggable = false;
    arena.appendChild(el);

    const hpEl = document.createElement('div');
    hpEl.className = 'shooting-faceless-object-hp';
    hpEl.innerHTML = '<i></i>';
    arena.appendChild(hpEl);

    const hp = getFacelessObjectHp();
    const obj = {
      id: ++state.facelessObjectSeq,
      el, hpEl,
      x, y,
      hp, hpMax: hp,
      ways: Number(ways || 2),
      vx: (state.facelessObjectSeq % 2 ? 1 : -1) * 58,
      lastShotAt: -9999,
    };
    state.facelessObjects.push(obj);
    positionUnit(el, x, y);
    positionUnit(hpEl, x, y + 56);
    measureUnitSize(obj);

    // 無貌専用：召喚直後の1発目を確実に出す。
    // Safari/iPhoneで最初のAI更新が遅れても、仮面が無反応に見えないようにする。
    const spawnNow = performance.now();
    obj.lastShotAt = -999999;
    fireFacelessObject(obj, spawnNow);

    return obj;
  }

  function damageFacelessObject(obj, damage, now) {
    if (!obj || obj.hp <= 0) return;
    const appliedDamage = Math.min(obj.hp, Math.max(0, Number(damage || 0)));
    obj.hp = Math.max(0, obj.hp - appliedDamage);
    createHit(obj.x, obj.y, false);
    showDamageNumber(obj.x, obj.y, appliedDamage, 'enemy', false);
    if (obj.el) sustainHitFeedback(obj.el, 145);
    const fill = obj.hpEl?.querySelector('i');
    if (fill) fill.style.width = `${clamp(obj.hp / obj.hpMax, 0, 1) * 100}%`;
    if (obj.hp <= 0) {
      obj.el?.classList.add('defeated');
      setTimeout(() => {
        obj.el?.remove();
        obj.hpEl?.remove();
      }, 180);
    }
  }

  function fireFacelessObject(obj, now) {
    if (!state || !obj || obj.hp <= 0 || !obj.el) return;

    const fireInterval = obj.ways >= 3 ? 720 : 820;
    if (now - Number(obj.lastShotAt || 0) < fireInterval) return;
    obj.lastShotAt = now;

    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    // 内部座標(obj.x / obj.y)から発射位置を推測しない。
    // 実際に描画されている仮面DOMの矩形を取得し、
    // その「見た目上の下端」を発射口として使う。
    const arenaRect = arena.getBoundingClientRect();
    const maskRect = obj.el.getBoundingClientRect();

    const left = maskRect.left - arenaRect.left;
    const right = maskRect.right - arenaRect.left;
    const center = (left + right) * 0.5;

    // 弾の中心が仮面に埋まって見えないよう、下端より少し下へ出す。
    const muzzleY = maskRect.bottom - arenaRect.top + 5;

    const width = Math.max(1, right - left);
    const leftMuzzleX = left + width * 0.28;
    const rightMuzzleX = left + width * 0.72;

    const speed = obj.ways >= 3 ? 230 : 215;
    const damage = obj.ways >= 3 ? 125 : 105;

    const shots = obj.ways >= 3
      ? [
          // 3WAY: 仮面の左下 / 中央下 / 右下
          { x: leftMuzzleX,  y: muzzleY, angle: Math.PI / 2 + 0.30 },
          { x: center,       y: muzzleY, angle: Math.PI / 2 },
          { x: rightMuzzleX, y: muzzleY, angle: Math.PI / 2 - 0.30 },
        ]
      : [
          // 2WAY: 仮面の左下 / 右下
          { x: leftMuzzleX,  y: muzzleY, angle: Math.PI / 2 + 0.24 },
          { x: rightMuzzleX, y: muzzleY, angle: Math.PI / 2 - 0.24 },
        ];

    shots.forEach(shot => {
      const projectile = makeProjectile(
        'shooting-enemy-bullet shooting-faceless-object-bullet',
        shot.x,
        shot.y,
        Math.cos(shot.angle) * speed,
        Math.sin(shot.angle) * speed,
        damage
      );
      if (projectile) state.enemyBullets.push(projectile);
    });
  }

  function updateFacelessObjects(dt, now) {
    if (!state || !isFacelessStage() || !Array.isArray(state.facelessObjects)) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const w = arena.clientWidth;

    const activeBlackHole =
      state.eltenaBlackHole &&
      state.eltenaBlackHole.phase === 'active' &&
      now < Number(state.eltenaBlackHole.activeUntil || 0);

    state.facelessObjects = state.facelessObjects.filter(obj => {
      if (!obj || obj.hp <= 0) return false;

      // ブラックホール中はOBJECT側の横移動/攻撃AIを止め、
      // 吸引処理だけに座標更新を一元化する。
      if (activeBlackHole) {
        positionUnit(obj.el, obj.x, obj.y);
        positionUnit(obj.hpEl, obj.x, obj.y + 56);
        return true;
      }

      obj.x += obj.vx * dt;
      const minX = 72;
      const maxX = Math.max(minX + 40, w - 72);
      if (obj.x <= minX || obj.x >= maxX) {
        obj.x = clamp(obj.x, minX, maxX);
        obj.vx *= -1;
      }
      positionUnit(obj.el, obj.x, obj.y);
      positionUnit(obj.hpEl, obj.x, obj.y + 56);
      fireFacelessObject(obj, now);
      return true;
    });
  }

  function beginFacelessObjectSummon(count, ways) {
    if (!state || state.ended || state.finishing || state.phaseTransition) return;
    state.facelessSummonTriggered = true;
    state.phaseTransition = true;
    clearEnemyBulletsOnly();
    showFacelessBattleCut('仮面顕現', `${count} OBJECT`);

    setTimeout(() => {
      if (!state || state.ended || state.finishing || !isFacelessStage()) return;
      const arena = document.getElementById('shooting-arena');
      if (!arena) return;
      const w = arena.clientWidth;
      const h = arena.clientHeight;
      // 無貌専用：仮面は画面中央付近に顕現させる。
      // 旧0.46はiPhone縦長画面で下寄りに見えたため上へ補正。
      const y = h * 0.28;
      if (count <= 1) {
        spawnFacelessObject(w * 0.5, y, ways);
      } else {
        spawnFacelessObject(w * 0.34, y, ways);
        spawnFacelessObject(w * 0.66, y, ways);
      }
      state.phaseTransition = false;
      state.lastBossShotAt = performance.now();
      state.lastShotAt = performance.now();
      renderHud();
    }, 850);
  }

  function updateFacelessStageMechanics(now) {
    if (!state || !isFacelessStage() || state.ended || state.finishing) return;
    const wave = Number(state.facelessWave || 1);
    const ratio = state.boss.hpMax > 0 ? state.boss.hp / state.boss.hpMax : 1;
    if (!state.facelessSummonTriggered && ratio <= 0.5 && state.boss.hp > 0) {
      const cfg = getFacelessConfig();
      const counts = Array.isArray(cfg?.waveObjectCount) ? cfg.waveObjectCount : [1, 2];
      beginFacelessObjectSummon(Number(counts[wave - 1] || (wave === 1 ? 1 : 2)), Number(cfg?.objectWays || 2));
    }
  }

  function beginFacelessWave2() {
    if (!state || !isFacelessStage() || Number(state.facelessWave || 1) !== 1) return false;
    state.phaseTransition = true;
    clearEnemyBulletsOnly();
    state.facelessObjects.forEach(obj => { obj?.el?.remove(); obj?.hpEl?.remove(); });
    state.facelessObjects = [];
    state.facelessWave = 2;
    state.facelessSummonTriggered = false;

    const hp = getFacelessWaveHp(2);
    state.boss.hp = hp;
    state.boss.hpMax = hp;
    state.boss.gaugeHp = hp;
    state.boss.gauges = 1;
    state.boss.phase = 1;

    showFacelessBattleCut('WAVE 2', selectedStage?.difficultyLabel || 'SPECIAL EVENT');
    renderHud();

    setTimeout(() => {
      if (!state || state.ended || state.finishing || !isFacelessStage()) return;
      state.phaseTransition = false;
      state.lastBossShotAt = performance.now();
      state.lastShotAt = performance.now();
      renderHud();
    }, 1200);
    return true;
  }

  function fireFacelessBoss(now) {
    if (!state || !isFacelessStage()) return;
    const cfg = getFacelessConfig();
    const wave = Number(state.facelessWave || 1);
    const mode = Array.isArray(cfg?.waveBarrage) ? cfg.waveBarrage[wave - 1] : 'medium';

    let fireRate = 900;
    let offsets = [-0.18, 0, 0.18];
    let speed = 215;
    let damage = 125;

    if (mode === 'medium') {
      fireRate = 690;
      offsets = [-0.34, -0.17, 0, 0.17, 0.34];
      speed = 225;
      damage = 140;
    } else if (mode === 'dense') {
      fireRate = 500;
      offsets = [-0.48, -0.32, -0.16, 0, 0.16, 0.32, 0.48];
      speed = 238;
      damage = 150;
    }

    if (now - state.lastBossShotAt < fireRate) return;
    state.lastBossShotAt = now;

    const base = Math.atan2(state.player.y - state.boss.y, state.player.x - state.boss.x);
    offsets.forEach(offset => {
      const a = base + offset;
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet shooting-faceless-bullet',
        state.boss.x, state.boss.y + 38,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        damage
      ));
    });

    // 超上級wave2のみ、ときどき薄い円形弾を混ぜて「濃い」にする。
    if (mode === 'dense' && Math.floor(now / fireRate) % 3 === 0) {
      const start = now * 0.0022;
      for (let i = 0; i < 10; i++) {
        const a = start + Math.PI * 2 * i / 10;
        state.enemyBullets.push(makeProjectile(
          'shooting-enemy-bullet shooting-faceless-bullet',
          state.boss.x, state.boss.y + 24,
          Math.cos(a) * 185,
          Math.sin(a) * 185,
          115
        ));
      }
    }
  }

  // ============================================================
  // Enemy damage tuning / BOSS WARNING attack
  // ============================================================
  // Enemy damage is intentionally FIXED so high-HP characters gain real survivability.
  // Balance target around the current roster:
  //   normal enemy: 110      -> roughly 5-6 hits for standard HP, more for high-HP units
  //   boss normal:  240      -> roughly 2-3 hits
  //   boss heavy:   350      -> roughly 2 hits
  //   WARNING:      999999   -> guaranteed 1 hit DOWN
  const ENEMY_FIXED_DAMAGE = Object.freeze({
    NORMAL: 110,
    BOSS: 240,
    BOSS_HEAVY: 350,
    LETHAL: 999999,
  });

  function classifyIncomingAttack(projectile) {
    const el = projectile && projectile.el;
    if (!el) return 'raw';
    if (el.classList.contains('shooting-danger-bullet')) return 'lethal';
    if (el.classList.contains('shooting-mini-enemy-bullet')) return 'normal';
    if (el.classList.contains('shooting-violence-boss-heavy')) return 'boss-heavy';
    if (el.classList.contains('shooting-enemy-bullet')) return 'boss';
    return 'raw';
  }

  function isFacelessSuperDifficulty() {
    return !!(isFacelessStage() && getFacelessConfig()?.difficulty === 'super');
  }

  function isChapter03BossStage() {
    return !!(selectedStage && selectedStage.id === SHOOTING_STAGE_ID.CH03_04);
  }

  function resolveIncomingDamage(member, amount, attackType) {
    if (attackType === 'lethal') return ENEMY_FIXED_DAMAGE.LETHAL;

    let damage = 0;
    if (attackType === 'normal') damage = ENEMY_FIXED_DAMAGE.NORMAL;
    else if (attackType === 'boss-heavy') damage = ENEMY_FIXED_DAMAGE.BOSS_HEAVY;
    else if (attackType === 'boss') damage = ENEMY_FIXED_DAMAGE.BOSS;
    else damage = Math.max(0, Number(amount || 0));

    // CHAPTER03-04はCHAPTER02より一段上のBOSS戦として通常被弾も強化。
    // BOSS通常弾 240 → 300（1.25倍）。密度の高さと合わせて難度差を作る。
    if (isChapter03BossStage()) damage *= 1.25;

    // フェイスレス最上級のみ、即死攻撃以外の基本攻撃力を1.3倍。
    // 固定ダメージ制は維持し、高HPキャラの耐久メリットも残す。
    if (isFacelessSuperDifficulty()) damage *= 1.3;
    return Math.round(damage);
  }

  function removeBossDangerWarning() {
    if (!state) return;
    const el = state.bossDangerWarningEl;
    if (el && el.isConnected) el.remove();
    state.bossDangerWarningEl = null;
    document.getElementById(ROOT_ID)?.classList.remove('boss-danger-active');
  }

  function showBossDangerWarning() {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !state) return;
    removeBossDangerWarning();
    const el = document.createElement('div');
    el.className = 'shooting-boss-danger-warning';
    el.innerHTML = '<span>WARNING</span><strong>DANGER ATTACK</strong><small>一撃でDOWN ─ 回避せよ</small>';
    arena.appendChild(el);
    state.bossDangerWarningEl = el;
    document.getElementById(ROOT_ID)?.classList.add('boss-danger-active');
    requestAnimationFrame(() => el.classList.add('show'));
  }

  function getBossDangerInterval() {
    const phase = Math.max(1, Number(state?.boss?.phase || 1));
    // フェーズが進むほど大技の頻度を上げる。初回は十分な猶予を取る。
    if (phase >= 3) return 6200;
    if (phase === 2) return 7600;
    return 9000;
  }

  function handleBossDangerAttack(now) {
    if (!state || isNormalBattle() || state.phaseTransition || state.koTransition) return false;

    if (state.bossDangerExecuteAt > 0) {
      // WARNING中も通常弾幕は止めない。大技の予兆と通常攻撃を同時進行させる。
      if (now < state.bossDangerExecuteAt) return false;

      const dx = state.player.x - state.boss.x;
      const dy = state.player.y - state.boss.y;
      const angle = Math.atan2(dy, dx);
      const speed = Math.max(325, Number(BOSS.bulletSpeed || 240) * 1.38);

      if (isChapter03BossStage()) {
        // リヴィア（CH03-04）の即死攻撃は2種類を順番に繰り返す。
        // ① 2WAY + 壁2反射
        // ② 4発の即死弾が8秒間、戦場をゆらゆら漂う
        const pattern = Number(state.bossDangerPatternIndex || 0) % 2;
        state.bossDangerPatternIndex = Number(state.bossDangerPatternIndex || 0) + 1;

        if (pattern === 0) {
          [-0.22, 0.22].forEach(offset => {
            const shotAngle = angle + offset;
            const projectile = makeProjectile(
              'shooting-enemy-bullet shooting-danger-bullet shooting-livia-danger-ricochet',
              state.boss.x, state.boss.y + 38,
              Math.cos(shotAngle) * speed,
              Math.sin(shotAngle) * speed,
              999999
            );
            if (!projectile) return;
            projectile.dangerRicochet = true;
            projectile.dangerWallHits = 0;
            projectile.dangerMaxReflections = 2;
            state.enemyBullets.push(projectile);
          });
        } else {
          const driftSpeed = 138;
          const driftOffsets = [-1.05, -0.35, 0.35, 1.05];
          driftOffsets.forEach((offset, index) => {
            const heading = angle + offset;
            const projectile = makeProjectile(
              'shooting-enemy-bullet shooting-danger-bullet shooting-livia-danger-drift',
              state.boss.x, state.boss.y + 38,
              Math.cos(heading) * driftSpeed,
              Math.sin(heading) * driftSpeed,
              999999
            );
            if (!projectile) return;
            projectile.dangerDrift = true;
            projectile.dangerExpireAt = now + 8000;
            projectile.dangerDriftSpeed = driftSpeed;
            projectile.dangerDriftHeading = heading;
            projectile.dangerDriftPhase = index * 1.7 + now * 0.0007;
            projectile.dangerDriftTurnRate = 0.78;
            state.enemyBullets.push(projectile);
          });
        }
      } else {
        const dangerOffsets = isFacelessSuperDifficulty() ? [-0.34, 0, 0.34] : [0];
        dangerOffsets.forEach(offset => {
          const shotAngle = angle + offset;
          const projectile = makeProjectile(
            'shooting-enemy-bullet shooting-danger-bullet',
            state.boss.x, state.boss.y + 38,
            Math.cos(shotAngle) * speed,
            Math.sin(shotAngle) * speed,
            999999
          );
          if (!projectile) return;

          // 最上級WARNING弾だけ壁反射を有効化。
          // 1・2回目は反射し、3回目の壁接触で消滅する。
          if (isFacelessSuperDifficulty()) {
            projectile.dangerRicochet = true;
            projectile.dangerWallHits = 0;
            projectile.dangerMaxReflections = 2;
          }
          state.enemyBullets.push(projectile);
        });
      }

      removeBossDangerWarning();
      state.bossDangerExecuteAt = 0;
      state.nextBossDangerAt = now + getBossDangerInterval();
      // 大技発射フレームでも通常攻撃を止めない。
      return false;
    }

    if (!state.nextBossDangerAt) {
      state.nextBossDangerAt = now + 7200;
      return false;
    }

    if (now >= state.nextBossDangerAt) {
      state.bossDangerExecuteAt = now + 1250;
      showBossDangerWarning();
      // WARNING表示中も既存弾・通常射撃はそのまま継続する。
      return false;
    }

    return false;
  }

  function fireBoss(now) {
    // WARNING攻撃は必ず先に処理する。レイド軽量化で危険攻撃を消さない。
    if (handleBossDangerAttack(now)) return;

    // DAILY RAID第2段階軽量化:
    // 通常敵弾が一定数を超えたフレームだけ通常射撃の新規生成を止める。
    // 既存弾はそのまま動き、弾数が減れば自動的に射撃を再開する。
    if (isRaidStage() && getRaidOrdinaryEnemyBulletCount() >= RAID_ENEMY_BULLET_SOFT_LIMIT) {
      return;
    }

    if (BOSS && BOSS.behavior === 'faceless_event_v1') {
      fireFacelessBoss(now);
      return;
    }
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
    if (!state || state.boss.hp <= 0 || isFacelessStage()) return;
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
    removeBossDangerWarning();
    state.bossDangerExecuteAt = 0;
    state.nextBossDangerAt = performance.now() + 4200;
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

  const sustainedHitTimers = new WeakMap();

  // 連射時に毎回animationをリスタートすると点滅が追いつかず、
  // 「当たっているのか分からない」状態になるため、
  // 命中が続いている間はクラスを維持して連続パルスさせる。
  function sustainHitFeedback(el, durationMs = 130) {
    if (!el || !el.isConnected) return;

    if (!el.classList.contains('shooting-hit-sustained')) {
      el.classList.add('shooting-hit-sustained');
    }

    const oldTimer = sustainedHitTimers.get(el);
    if (oldTimer) clearTimeout(oldTimer);

    const timer = setTimeout(() => {
      if (el && el.isConnected) el.classList.remove('shooting-hit-sustained');
      sustainedHitTimers.delete(el);
    }, Math.max(90, Number(durationMs || 130)));

    sustainedHitTimers.set(el, timer);
  }

  function showDamageNumber(x, y, amount, kind = 'enemy', big = false) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const value = Math.max(0, Math.round(Number(amount || 0)));
    if (!value) return;

    const el = document.createElement('span');
    el.className =
      'shooting-damage-number ' +
      (kind === 'player' ? 'to-player' : 'to-enemy') +
      (big ? ' big' : '');

    el.textContent = String(value);

    // 同じ場所に数値が積み重ならないよう、命中位置周辺へランダム分散。
    const spreadX = kind === 'player' ? 38 : 52;
    const spreadY = kind === 'player' ? 28 : 40;
    const offsetX = (Math.random() - 0.5) * spreadX;
    const offsetY = -12 + (Math.random() - 0.5) * spreadY;

    arena.appendChild(el);
    positionUnit(el, Number(x || 0) + offsetX, Number(y || 0) + offsetY);

    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => el.classList.add('out'), big ? 620 : 460);
    setTimeout(() => el.remove(), big ? 900 : 720);
  }

  // ============================================================
  // DAILY RAID performance: hit visual throttling
  // ============================================================
  // レイドは長時間・高HPのため、通常弾1発ごとにHITエフェクト/数字/フラッシュを
  // DOM生成すると端末負荷が大きい。ゲーム上のダメージ・コンボ・ULT加算は一切
  // 間引かず、視覚演出だけ頻度制限する。
  function shouldRenderRaidBossHitVisual(now, kind = 'hit') {
    if (!isRaidStage() || !state) return true;

    const t = Number(now || performance.now());
    if (kind === 'number') {
      const interval = 150; // ダメージ数字は最大約6.7回/秒
      const last = Number(state.raidLastBossDamageNumberAt || 0);
      if (t - last < interval) return false;
      state.raidLastBossDamageNumberAt = t;
      return true;
    }

    const interval = 80; // HIT/flashは最大12.5回/秒
    const last = Number(state.raidLastBossHitVisualAt || 0);
    if (t - last < interval) return false;
    state.raidLastBossHitVisualAt = t;
    return true;
  }

  function showBossDamageNumber(amount, big = false) {
    if (!state || !state.boss) return;
    showDamageNumber(state.boss.x, state.boss.y, amount, 'enemy', big);
  }

  function flashBossHit(big) {
    const boss = document.getElementById(BOSS_ID);
    if (!boss) return;

    if (!big) {
      sustainHitFeedback(boss, 150);
      return;
    }

    // 大技だけは従来の強い単発フラッシュを残す。
    boss.classList.remove('burst-hit');
    void boss.offsetWidth;
    boss.classList.add('burst-hit');
    setTimeout(() => boss.classList.remove('burst-hit'), 420);
  }

  function updateMovement(dt, now, playerOnly = false) {
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
      if (pointerIsTouch) {
        // iPhone / タッチ操作:
        // 目標座標へ1フレームで代入せず、最大追従速度を設ける。
        // これによりSafariが一瞬だけ大きな座標差を返してもワープしない。
        const dx = pointerX - state.player.x;
        const dy = pointerY - state.player.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.001) {
          // 操作感を損ねない程度に通常moveSpeedより速く追従するが、
          // 1フレーム瞬間移動は絶対にしない。
          const followSpeed = Math.max(Number(c.moveSpeed || 0) * 2.2, 720);
          const maxStep = Math.max(1, followSpeed * dt);
          const step = Math.min(dist, maxStep);
          state.player.x += dx / dist * step;
          state.player.y += dy / dist * step;
        }
      } else {
        // PCマウスは従来の少し滑らかな追従を維持。
        state.player.x += (pointerX - state.player.x) * Math.min(1, dt * 18);
        state.player.y += (pointerY - state.player.y) * Math.min(1, dt * 18);
      }
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

    // カウントダウン中は本当にプレイヤー移動だけ。
    // ボスAIをここで止めることで、START時に周期運動の位相がリセットされても
    // 「カクッ」と位置が飛んだように見えないようにする。
    if (playerOnly) {
      positionUnit(player, state.player.x, state.player.y);
      return;
    }

    const t = (now - state.startedAt) / 1000;
    const bossGrabbed = now < (state.bossGrabUntil || 0);
    const bossStunned = now < (state.bossStunUntil || 0);
    const bossBlackHolePulled =
      state.eltenaBlackHole &&
      state.eltenaBlackHole.phase === 'active' &&
      now < Number(state.eltenaBlackHole.activeUntil || 0);

    const applyBossStartBlend = (targetX, targetY) => {
      const startedAt = Number(state.bossMotionBlendStartedAt || 0);
      const duration = Math.max(1, Number(state.bossMotionBlendDurationMs || 420));
      if (!startedAt || now >= startedAt + duration) {
        return { x: targetX, y: targetY };
      }

      const raw = clamp((now - startedAt) / duration, 0, 1);
      // smoothstep: 開始/終了の速度を0寄りにして視覚的な段差をなくす。
      const eased = raw * raw * (3 - 2 * raw);
      return {
        x: Number(state.bossMotionBlendFromX || targetX) + (targetX - Number(state.bossMotionBlendFromX || targetX)) * eased,
        y: Number(state.bossMotionBlendFromY || targetY) + (targetY - Number(state.bossMotionBlendFromY || targetY)) * eased,
      };
    };

    // ブラックホール吸引中は大型BOSSの通常移動AIも停止。
    // これを止めないとフェイスレス等のAIが毎フレーム座標を上書きして
    // 吸引が見た目上ほぼ無効になっていた。
    if (!isNormalBattle() && !bossGrabbed && !bossStunned && !bossBlackHolePulled) {
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
        const targetX = clamp(w * 0.5 + playerInfluence + Math.sin(t * (0.86 + phase * 0.08)) * xAmp, 56, w - 56);
        const targetY = Math.max(58, h * (phase === 3 ? 0.16 : 0.18) + Math.sin(t * (1.35 + phase * 0.18)) * (phase === 3 ? 18 : 12));
        const blended = applyBossStartBlend(targetX, targetY);
        state.boss.x = blended.x;
        state.boss.y = blended.y;
      } else {
        const targetX = w * 0.5 + Math.sin(t * 0.92) * w * 0.30;
        const targetY = Math.max(56, h * 0.17 + Math.sin(t * 1.7) * 12);
        const blended = applyBossStartBlend(targetX, targetY);
        state.boss.x = blended.x;
        state.boss.y = blended.y;
      }
    }

    positionUnit(player, state.player.x, state.player.y);
    if (boss && !isNormalBattle()) positionUnit(boss, state.boss.x, state.boss.y);
  }

  function updateProjectiles(dt, now) {
    // 通常は何もしない。弾が異常増殖した時だけ、当たり判定を回す前に負荷を戻す。
    enforceEnemyBulletSafetyLimit(now);
    enforcePlayerBulletSafetyLimit(now);

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
    const arenaRect = arena.getBoundingClientRect();

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

        const r = getUnitRect(p, arenaRect);
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
          ? state.normalEnemies.find(enemy => enemy && enemy.el && enemy.hp > 0 && rectsHit(r, getUnitRect(enemy, arenaRect), 0, 10))
          : null;

        if (hitBossHeart || hitNormalHeart) {
          const rose = getBattleCharacter(CHARACTER_ID.ROSE);
          const heartDamage =
            Number(rose?.atk || 0) *
            Number(rose?.flowerHeartDamageAtkRate || 0.30);

          if (hitNormalHeart) {
            damageNormalEnemy(hitNormalHeart, heartDamage, now, false);
            state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
          } else if (hitBossHeart && state.boss) {
            const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(heartDamage || 0)));
            state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
            updateBossPhase();
            if (shouldRenderRaidBossHitVisual(now, 'hit')) {
              createHit(p.x, p.y, false);
              flashBossHit(false);
            }
            if (shouldRenderRaidBossHitVisual(now, 'number')) {
              showBossDamageNumber(appliedDamage, false);
            }
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
      const r = getUnitRect(p, arenaRect);
      let normalTarget = null;
      let normalTargets = null;
      const facelessObjectTarget = isFacelessStage()
        ? (state.facelessObjects || []).find(obj =>
            obj && obj.el && obj.hp > 0 &&
            rectsHit(r, getUnitRect(obj, arenaRect), 0, 10)
          )
        : null;
      const hitBoss = !facelessObjectTarget && !isNormalBattle() && bossRect && rectsHit(r, bossRect, 0, 22);

      if (isNormalBattle()) {
        const blackHoleMultiHit =
          state.eltenaBlackHole &&
          state.eltenaBlackHole.phase === 'active' &&
          now < Number(state.eltenaBlackHole.activeUntil || 0);

        if (blackHoleMultiHit) {
          // エルテナULT中だけ、同じ弾判定に重なっている敵を全件取得する。
          // 離れた敵を貫通するのではなく、ブラックホールで密集した敵群への同時ヒット。
          normalTargets = state.normalEnemies.filter(enemy =>
            enemy && enemy.el && enemy.hp > 0 &&
            rectsHit(r, getUnitRect(enemy, arenaRect), 0, 13)
          );
          normalTarget = normalTargets[0] || null;
        } else {
          // 通常時は従来どおり、1発につき最初に当たった敵1体だけ。
          normalTarget = state.normalEnemies.find(enemy =>
            enemy && enemy.el && enemy.hp > 0 &&
            rectsHit(r, getUnitRect(enemy, arenaRect), 0, 13)
          );
        }
      }

      if (facelessObjectTarget || normalTarget || hitBoss) {
        const ownerId = p.ownerId || state.activeCharacterId;
        const chara = getBattleCharacter(ownerId) || getCurrentCharacter();
        const member = getPartyMember(ownerId) || getActiveMember();

        let hitCount = 1;

        if (facelessObjectTarget) {
          damageFacelessObject(facelessObjectTarget, p.damage, now);
          state.score += 80;
        } else if (normalTarget) {
          const targetsToDamage =
            Array.isArray(normalTargets) && normalTargets.length
              ? normalTargets
              : [normalTarget];

          hitCount = targetsToDamage.length;

          targetsToDamage.forEach(enemy => {
            damageNormalEnemy(enemy, p.damage, now, false);
          });

          state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
        } else {
          const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(p.damage || 0)));
          state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
          updateBossPhase();
          state.score += 120;
          // DAILY RAIDでは実ダメージ処理は全弾そのまま。
          // DOM負荷の大きいHIT演出/数字/flashだけ頻度制限する。
          if (shouldRenderRaidBossHitVisual(now, 'hit')) {
            createHit(p.x, p.y, false);
            flashBossHit(false);
          }
          if (shouldRenderRaidBossHitVisual(now, 'number')) {
            showBossDamageNumber(appliedDamage, false);
          }
          if (state.boss.hp <= 0) beginBossDefeat();
        }

        state.shotsHit += hitCount;

        if (!p.noComboGain) {
          for (let i = 0; i < hitCount; i++) {
            registerComboHit(ownerId, now);
          }
        }

        const ownerMoonlightBlocked =
          Number(ownerId) === CHARACTER_ID.HAYATE &&
          now < (state.hayateMoonlightUntil || 0);

        if (!p.noUltGain && !ownerMoonlightBlocked) {
          const baseGain = Number.isFinite(chara.ultGainPerHit) ? chara.ultGainPerHit : 1;
          const gain = baseGain * ULT_GAIN_GLOBAL_MULTIPLIER * hitCount;

          if (member) {
            const wasReady = member.burst >= chara.burstNeed;
            member.burst = Math.min(chara.burstNeed, member.burst + gain);
            if (!wasReady && member.burst >= chara.burstNeed && !member.ultReadyNotified) {
              member.ultReadyNotified = true;
              if (ownerId === state.activeCharacterId) {
                showShootingUltFullChargeNotice();
              }
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

      // リヴィアの漂流即死弾。8秒で消え、ゆるく蛇行しながら戦場内を漂う。
      if (p.dangerDrift) {
        if (now >= Number(p.dangerExpireAt || 0)) {
          p.el.remove();
          return false;
        }
        const phase = Number(p.dangerDriftPhase || 0);
        const turnRate = Number(p.dangerDriftTurnRate || 0.78);
        const wobble =
          Math.sin(now * 0.00135 + phase) * 0.86 +
          Math.sin(now * 0.00215 + phase * 1.37) * 0.34;
        p.dangerDriftHeading = Number(p.dangerDriftHeading || Math.atan2(p.vy, p.vx)) + wobble * turnRate * dt;
        const driftSpeed = Number(p.dangerDriftSpeed || 138);
        p.vx = Math.cos(p.dangerDriftHeading) * driftSpeed;
        p.vy = Math.sin(p.dangerDriftHeading) * driftSpeed;
      }

      p.x += p.vx * dt; p.y += p.vy * dt;

      // リヴィアの漂流弾は8秒間フィールド内に残すため、壁では消さずに反射する。
      if (p.dangerDrift) {
        const margin = 10;
        const hitLeft = p.x <= margin;
        const hitRight = p.x >= w - margin;
        const hitTop = p.y <= margin;
        const hitBottom = p.y >= h - margin;
        if (hitLeft || hitRight || hitTop || hitBottom) {
          if (hitLeft || hitRight) p.vx *= -1;
          if (hitTop || hitBottom) p.vy *= -1;
          p.x = Math.min(w - margin, Math.max(margin, p.x));
          p.y = Math.min(h - margin, Math.max(margin, p.y));
          p.dangerDriftHeading = Math.atan2(p.vy, p.vx);
        }
      }

      // 最上級のWARNING危険弾はアリーナ壁で跳ね返る。
      // 1回目・2回目は反射、3回目の壁接触で消滅。
      if (p.dangerRicochet) {
        const margin = 7;
        const hitLeft = p.x <= margin;
        const hitRight = p.x >= w - margin;
        const hitTop = p.y <= margin;
        const hitBottom = p.y >= h - margin;
        const touchedWall = hitLeft || hitRight || hitTop || hitBottom;

        if (touchedWall) {
          p.dangerWallHits = Number(p.dangerWallHits || 0) + 1;
          if (p.dangerWallHits > Number(p.dangerMaxReflections || 2)) {
            p.el.remove();
            return false;
          }

          // 角ヒットは1回の壁接触として数えつつ、両軸を反転する。
          if (hitLeft || hitRight) p.vx *= -1;
          if (hitTop || hitBottom) p.vy *= -1;
          p.x = Math.min(w - margin, Math.max(margin, p.x));
          p.y = Math.min(h - margin, Math.max(margin, p.y));
          p.el.classList.remove('ricochet');
          void p.el.offsetWidth;
          p.el.classList.add('ricochet');
        }
      }

      positionUnit(p.el, p.x, p.y);
      if (!p.dangerRicochet && !p.dangerDrift && (p.y > h + 30 || p.x < -30 || p.x > w + 30 || p.y < -30)) { p.el.remove(); return false; }
      const r = getUnitRect(p, arenaRect);

      // ロゼULTの花は、効果時間中「壁」として敵弾を遮断する。
      // 花自体にはHPを持たせず、敵弾は接触した時点で消滅。
      const roseFlower = state.roseFlower;
      if (roseFlower && roseFlower.el && roseFlower.el.isConnected) {
        const flowerRect = getUnitRect(roseFlower, arenaRect);
        if (rectsHit(r, flowerRect, 0, 28)) {
          p.el.remove();
          return false;
        }
      }

      const hitDecoy = (state.clarineDecoys || []).find(decoy =>
        decoy && decoy.el && rectsHit(r, getUnitRect(decoy, arenaRect), 12, 8)
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
          damagePlayer(now, p.damage, classifyIncomingAttack(p));
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
    const arenaRectForContact = document.getElementById('shooting-arena')?.getBoundingClientRect();
    if (!arenaRectForContact) return;

    if (isNormalBattle()) {
      const hitEnemy = state.normalEnemies.find(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return false;
        // 画像の透明余白で早すぎる接触にならないよう、双方を少し内側へ絞る。
        return rectsHit(playerRect, getUnitRect(enemy, arenaRectForContact), 14, 9);
      });
      if (hitEnemy) {
        damagePlayer(now, Number(hitEnemy.def && (hitEnemy.def.contactDamage || hitEnemy.def.bulletDamage)) || 85, 'normal');
      }
      return;
    }

    const boss = document.getElementById(BOSS_ID);
    if (!boss || !state.boss || state.boss.hp <= 0) return;
    if (rectsHit(playerRect, boss.getBoundingClientRect(), 14, 18)) {
      damagePlayer(now, Number(BOSS.contactDamage || BOSS.bulletDamage) || 200, 'boss-heavy');
    }
  }

  function damagePlayer(now, amount, attackType) {
    if (!state || state.ended || state.koTransition) return;
    const member = getActiveMember();
    if (!member) return;
    // ミモザの無敵アイテム効果中は被弾自体をなかったことにする
    // (コンボも被弾回数もダメージも一切発生させない)。
    // 効果は取得したmemberにのみ紐づくため、交代先には影響しない。
    if (now < (member.invincibleUntil || 0)) return;
    // COMBOは時間経過では切れない。プレイヤーが被弾した瞬間だけ0へ戻す。
    resetCombo();
    member.hitCount = (member.hitCount || 0) + 1;
    state.totalHitsTaken = (state.totalHitsTaken || 0) + 1;
    const rawDamage = Number.isFinite(amount) ? Number(amount) : Number(BOSS.bulletDamage || 0);
    const incomingDamage = resolveIncomingDamage(member, rawDamage, attackType || 'raw');
    const appliedDamage = Math.min(member.hp, Math.max(0, incomingDamage));
    member.hp = Math.max(0, member.hp - appliedDamage);
    showDamageNumber(state.player.x, state.player.y, appliedDamage, 'player', false);
    if (isNormalBattle()) evaluateNormalMission(now);
    state.player.invulnUntil = now + 1150;
    const player = document.getElementById(PLAYER_ID);
    if (player) {
      player.classList.remove('damaged');
      void player.offsetWidth;
      player.classList.add('damaged');
      sustainHitFeedback(player, 220);
    }
    renderHud();
    if (member.hp <= 0) beginPlayerDefeat();
  }

  function showGameOverNotice() {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    arena.querySelectorAll('.shooting-game-over-notice').forEach(el => el.remove());
    const el = document.createElement('div');
    el.className = 'shooting-game-over-notice';
    el.textContent = 'GAME OVER';
    arena.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
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
      showGameOverNotice();
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
      // GAME OVERを戦闘画面上でしっかり見せてからRESULTへ遷移する。
      // プレイヤー消滅演出(1.45秒)の後にも少し余韻を残す。
      setTimeout(() => {
        if (!state || state.ended) return;
        state.finishing = false;
        endGame(false);
      }, 2600);
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
  const AYANE_ULT_HAND_OPEN_SRC = 'images/ayane_ult_hand_open.webp';
  const AYANE_ULT_HAND_CLOSE_SRC = 'images/ayane_ult_hand_close.webp';

  function getAyaneBlackhandHtml(extraHtml = '') {
    return `
      <div class="shooting-ayane-blackhand-aura"></div>
      <div class="shooting-ayane-blackhand-shot">
        <img class="hand-open" src="${AYANE_ULT_HAND_OPEN_SRC}" alt="">
        <img class="hand-close" src="${AYANE_ULT_HAND_CLOSE_SRC}" alt="">
      </div>
      <div class="shooting-ayane-blackhand-afterimage a1"></div>
      <div class="shooting-ayane-blackhand-afterimage a2"></div>
      <div class="shooting-ayane-blackhand-afterimage a3"></div>
      <div class="shooting-ayane-blackhand-impact"></div>
      ${extraHtml}
    `;
  }

  function preloadShootingImage(src, timeoutMs = 7000, blocking = false) {
    if (!src) return Promise.resolve(false);
    if (window.GameAssets && typeof window.GameAssets.image === 'function') {
      return window.GameAssets.image(src, {
        timeout: timeoutMs,
        blocking: blocking,
        loadingDelay: 300
      });
    }
    return new Promise(resolve => {
      const img = new Image();
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        resolve(false);
      }, timeoutMs);
      const finish = ok => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(!!ok);
      };
      img.onload = () => {
        if (typeof img.decode === 'function') {
          img.decode().catch(() => {}).finally(() => finish(true));
        } else {
          finish(true);
        }
      };
      img.onerror = () => finish(false);
      img.src = src;
      if (img.complete && img.naturalWidth > 0) finish(true);
    });
  }

  function warmShootingAssets() {
    if (!window.GameAssets) return;
    const urls = [];

    // キャラ画像・パネル・ULTは戦闘中に高確率で使うため先読み。
    // 敵/ステージマスター全件は、未実装画像参照が混ざる可能性があるので読まない。
    try { window.GameAssets.collectFromObject(window.ShootingCharacters, urls); } catch (_) {}

    window.GameAssets.many(urls, { timeout: 7000, quiet: true });
  }

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

  async function playUltCutin(c, onComplete) {
    if (!state || state.ended || state.finishing) return;

    clearUltCutin();

    const root = document.getElementById(ROOT_ID);
    const arena = document.getElementById('shooting-arena');
    if (!root || !arena) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    const cutinSrc = c.cutinImage || `images/chara_${String(c.id).padStart(2, '0')}_cutin.webp`;
    await preloadShootingImage(cutinSrc, 7000, true);

    // ロード待ち中に戦闘終了/画面遷移した場合は演出を作らない。
    if (!state || state.ended || state.finishing || !document.getElementById(ROOT_ID)) return;

    const wrap = document.createElement('div');
    wrap.className = 'shooting-ult-cutin';
    wrap.setAttribute('aria-hidden', 'true');

    const img = document.createElement('img');
    img.className = 'shooting-ult-cutin-image';
    img.src = cutinSrc;
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

        // カットイン終了時も指位置へ即ワープさせず、
        // 現在位置から相対ドラッグを継続する。
        rebaseTouchDragToPlayer();

        if (typeof onComplete === 'function') onComplete();
      }, 120);
    }, ULT_CUTIN_DURATION_MS);
  }


  function clearEltenaBlackHole() {
    if (!state) return;

    (state.normalEnemies || []).forEach(enemy => {
      if (!enemy) return;
      if (enemy.el) enemy.el.classList.remove('eltena-pulled');
      if (enemy.hpEl) enemy.hpEl.classList.remove('eltena-pulled');
    });
    (state.facelessObjects || []).forEach(obj => {
      if (obj?.el) obj.el.classList.remove('eltena-pulled');
      if (obj?.hpEl) obj.hpEl.classList.remove('eltena-pulled');
    });
    document.getElementById(BOSS_ID)?.classList.remove('eltena-pulled');

    if (state.eltenaBlackHole) {
      const bh = state.eltenaBlackHole;
      if (bh.el && bh.el.isConnected) bh.el.remove();
    }
    state.eltenaBlackHole = null;
    document.getElementById(ROOT_ID)?.classList.remove('eltena-black-hole-active');
  }

  function createEltenaBlackHole(c) {
    if (!state || state.ended || state.finishing) return;

    clearEltenaBlackHole();

    const arena = document.getElementById('shooting-arena');
    const root = document.getElementById(ROOT_ID);
    if (!arena) return;

    const now = performance.now();
    const startX = Number(state.player.x || arena.clientWidth * .5);
    const startY = Number(state.player.y || arena.clientHeight * .72);

    // ブラックホール本体が画面端で見切れないよう、半径＋余白ぶん内側へ着弾させる。
    const holeSize = Number(c.blackHoleSize || 154);
    const holeRadius = holeSize * .5;
    const safeMargin = holeRadius + 16;
    const targetX = clamp(startX, safeMargin, arena.clientWidth - safeMargin);
    const requestedTargetY = Number(c.blackHoleTargetY || 104);
    const targetY = clamp(
      Math.max(requestedTargetY, safeMargin),
      safeMargin,
      Math.max(safeMargin, arena.clientHeight * .28)
    );

    const distance = Math.max(1, Math.hypot(targetX - startX, targetY - startY));
    const travelMs = Math.max(260, distance / Math.max(120, Number(c.blackHoleTravelSpeed || 760)) * 1000);

    const el = document.createElement('div');
    el.className = 'shooting-eltena-black-hole traveling';
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--eltena-bh-size', `${Number(c.blackHoleSize || 154)}px`);
    el.innerHTML = '<i></i><b></b><span></span>';
    arena.appendChild(el);
    positionUnit(el, startX, startY);

    state.eltenaBlackHole = {
      el,
      ownerId: c.id,
      phase: 'travel',
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      launchedAt: now,
      travelMs,
      activeFrom: 0,
      activeUntil: 0,
      durationMs: Number(c.blackHoleDurationMs || 8000),
      pullStrength: Number(c.blackHolePullStrength || 11.5),
      enemyStopRadius: Number(c.blackHoleEnemyStopRadius || 10),
      bossStopRadius: Number(c.blackHoleBossStopRadius || 18),
    };

    if (root) {
      root.classList.remove('eltena-black-hole-cast');
      void root.offsetWidth;
      root.classList.add('eltena-black-hole-cast');
      setTimeout(() => root.classList.remove('eltena-black-hole-cast'), 520);
    }
  }

  function pullPointTowardBlackHole(obj, bh, dt, stopRadius, bounds) {
    if (!obj || !bh) return;
    const dx = bh.x - Number(obj.x || 0);
    const dy = bh.y - Number(obj.y || 0);
    const dist = Math.max(0.001, Math.hypot(dx, dy));

    if (dist <= stopRadius) return;

    // ブラックホール中心へ強く収束。
    // stopRadiusは「外周」ではなく中心付近のごく小さな重なり幅として使う。
    const follow = 1 - Math.exp(-Math.max(0.1, bh.pullStrength) * dt);

    // 距離が遠いほど大きく引き、中心付近では自然に減速。
    // 1フレーム最低移動量も持たせて、敵AIの移動に負けないようにする。
    const desired = Math.max(0, dist - stopRadius);
    const minStep = Math.min(desired, 180 * dt);
    const move = Math.min(desired, Math.max(dist * follow, minStep));

    obj.x += dx / dist * move;
    obj.y += dy / dist * move;

    if (bounds) {
      obj.x = clamp(obj.x, bounds.minX, bounds.maxX);
      obj.y = clamp(obj.y, bounds.minY, bounds.maxY);
    }
  }

  function updateEltenaBlackHole(dt, now) {
    if (!state || !state.eltenaBlackHole) return;

    const bh = state.eltenaBlackHole;
    const arena = document.getElementById('shooting-arena');
    if (!arena || !bh.el || !bh.el.isConnected) {
      clearEltenaBlackHole();
      return;
    }

    if (bh.phase === 'travel') {
      const p = clamp((now - bh.launchedAt) / Math.max(1, bh.travelMs), 0, 1);
      // 少し加速して敵側の壁へ飛ぶ。
      const eased = 1 - Math.pow(1 - p, 3);
      bh.x = bh.startX + (bh.targetX - bh.startX) * eased;
      bh.y = bh.startY + (bh.targetY - bh.startY) * eased;
      positionUnit(bh.el, bh.x, bh.y);

      if (p >= 1) {
        bh.phase = 'active';
        bh.x = bh.targetX;
        bh.y = bh.targetY;
        bh.activeFrom = now;
        bh.activeUntil = now + bh.durationMs;
        bh.el.classList.remove('traveling');
        bh.el.classList.add('active');
        document.getElementById(ROOT_ID)?.classList.add('eltena-black-hole-active');
        positionUnit(bh.el, bh.x, bh.y);
      }
      return;
    }

    if (now >= bh.activeUntil) {
      bh.el.classList.add('ending');
      document.getElementById(ROOT_ID)?.classList.remove('eltena-black-hole-active');

      (state.normalEnemies || []).forEach(enemy => {
        if (!enemy) return;
        if (enemy.el) enemy.el.classList.remove('eltena-pulled');
        if (enemy.hpEl) enemy.hpEl.classList.remove('eltena-pulled');
        positionMiniEnemyHp(enemy);
      });
      (state.facelessObjects || []).forEach(obj => {
        if (obj?.el) obj.el.classList.remove('eltena-pulled');
        if (obj?.hpEl) obj.hpEl.classList.remove('eltena-pulled');
      });
      document.getElementById(BOSS_ID)?.classList.remove('eltena-pulled');

      const doomed = bh.el;
      state.eltenaBlackHole = null;
      setTimeout(() => doomed.isConnected && doomed.remove(), 320);
      return;
    }

    const w = arena.clientWidth;
    const h = arena.clientHeight;

    // 通常敵は全員吸引。ダメージは一切与えない。
    (state.normalEnemies || []).forEach(enemy => {
      if (!enemy || !enemy.el || enemy.hp <= 0) return;
      pullPointTowardBlackHole(enemy, bh, dt, bh.enemyStopRadius, {
        minX: 34, maxX: w - 34, minY: 42, maxY: h - 46
      });
      // baseX/baseY は書き換えない。
      // ここを書き換えるとULT終了後も敵の通常待機位置が画面上部に固定されてしまう。
      enemy.el.classList.add('eltena-pulled');
      if (enemy.hpEl) enemy.hpEl.classList.add('eltena-pulled');
      positionUnit(enemy.el, enemy.x, enemy.y);
      positionMiniEnemyHp(enemy);
    });

    // SPECIAL EVENTのHP付きOBJECTも敵として吸引対象。
    // 大型/小型/召喚物を問わず、戦闘フィールド上の敵を同じ重力場で扱う。
    (state.facelessObjects || []).forEach(obj => {
      if (!obj || !obj.el || obj.hp <= 0) return;
      pullPointTowardBlackHole(obj, bh, dt, bh.enemyStopRadius, {
        minX: 34, maxX: w - 34, minY: 42, maxY: h - 46
      });
      obj.el.classList.add('eltena-pulled');
      if (obj.hpEl) obj.hpEl.classList.add('eltena-pulled');
      positionUnit(obj.el, obj.x, obj.y);
      positionUnit(obj.hpEl, obj.x, obj.y + 56);
    });

    // ボスも「すべての敵」に含めて吸引する。
    if (!isNormalBattle() && state.boss && state.boss.hp > 0) {
      pullPointTowardBlackHole(state.boss, bh, dt, bh.bossStopRadius, {
        minX: 54, maxX: w - 54, minY: 52, maxY: h * .74
      });
      const bossEl = document.getElementById(BOSS_ID);
      if (bossEl) {
        bossEl.classList.add('eltena-pulled');
        positionUnit(bossEl, state.boss.x, state.boss.y);
      }
    }
  }

  function useEltenaUlt(c) {
    if (!state || state.ended || state.finishing) return;
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-eltena');
    createEltenaBlackHole(c);
  }

  // ============================================================
  // ミモザ：ミモザの贈り物
  // ============================================================
  // 盤面のランダム位置に恩恵アイテムを3つ設置する。
  // 3つは常に固定の異なる効果（ATK UP / HP回復 / 無敵）で、拾うまで
  // フィールドに残り続ける（連続でULTを使えば未回収分に積み上がる）。
  // 効果は「拾った瞬間にアクティブだったmember」だけに紐づき、
  // 交代先やベンチのキャラには一切引き継がれない。
  function useMimosaUlt(c) {
    if (!state || state.ended || state.finishing) return;
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-mimosa');
    spawnMimosaItems(c);
    state.ultLockUntil = performance.now() + 300;
    renderHud();
  }

  function spawnMimosaItems(c) {
    if (!state) return;
    const arena = document.getElementById('shooting-arena');
    const layer = document.getElementById('shooting-collectible-layer');
    if (!arena || !layer) return;

    const w = arena.clientWidth;
    const h = arena.clientHeight;

    const defs = [
      {
        kind: 'atk',
        cls: 'mimosa-item-atk',
        label: 'ATK UP',
        detail: `ATK ×${Number(c.itemAtkMultiplier || 1.3).toFixed(1)} / ${Math.round(Number(c.itemAtkDurationMs || 10000) / 1000)}秒`,
        atkBuffMultiplier: Number(c.itemAtkMultiplier || 1.3),
        atkBuffDurationMs: Number(c.itemAtkDurationMs || 10000),
      },
      {
        kind: 'heal',
        cls: 'mimosa-item-heal',
        label: 'HP HEAL',
        detail: `HP ${Math.round(Number(c.itemHealPercent || 0.30) * 100)}%回復`,
        healPercent: Number(c.itemHealPercent || 0.30),
      },
      {
        kind: 'invincible',
        cls: 'mimosa-item-invincible',
        label: 'INVINCIBLE',
        detail: `${Math.round(Number(c.itemInvincibleDurationMs || 3000) / 1000)}秒無敵`,
        invincibleDurationMs: Number(c.itemInvincibleDurationMs || 3000),
      },
    ];

    defs.forEach(def => {
      const el = document.createElement('div');
      el.className = `shooting-mimosa-item ${def.cls}`;
      el.innerHTML = '<i></i>';
      layer.appendChild(el);

      // 盤面内のランダム位置。HUDや自機初期位置に極端に近づかない範囲に収める。
      const x = w * (0.16 + Math.random() * 0.68);
      const y = h * (0.22 + Math.random() * 0.48);

      const item = {
        uid: `mimosa_${def.kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        el, x, y,
        kind: def.kind,
        label: def.label,
        detail: def.detail,
        atkBuffMultiplier: def.atkBuffMultiplier,
        atkBuffDurationMs: def.atkBuffDurationMs,
        healPercent: def.healPercent,
        invincibleDurationMs: def.invincibleDurationMs,
      };
      state.mimosaItems.push(item);
      positionUnit(el, x, y);
    });
  }

  function updateMimosaItems() {
    if (!state || !state.mimosaItems || !state.mimosaItems.length) return;
    const playerCore = document.getElementById('shooting-player-core');
    if (!playerCore) return;
    const coreRect = playerCore.getBoundingClientRect();

    state.mimosaItems = state.mimosaItems.filter(item => {
      if (!item || !item.el) return false;
      if (rectsHit(item.el.getBoundingClientRect(), coreRect, -5, -3)) {
        applyMimosaItemEffect(item, performance.now());
        item.el.remove();
        return false;
      }
      return true;
    });
  }

  function applyMimosaItemEffect(item, now) {
    if (!item) return;
    // 取得した瞬間にアクティブだったmemberだけに効果を紐づける。
    // このmemberオブジェクトはパーティ内の特定キャラID専用の実体なので、
    // 交代しても他メンバーのmemberオブジェクトへは一切波及しない。
    const member = getActiveMember();
    if (!member) return;

    if (item.kind === 'atk') {
      member.atkBuffMultiplier = Number(item.atkBuffMultiplier || 1.3);
      member.atkBuffUntil = now + Number(item.atkBuffDurationMs || 10000);
    } else if (item.kind === 'heal') {
      const healAmount = Math.round(Number(member.hpMax || 0) * Number(item.healPercent || 0.30));
      member.hp = Math.min(member.hpMax, member.hp + healAmount);
    } else if (item.kind === 'invincible') {
      member.invincibleUntil = now + Number(item.invincibleDurationMs || 3000);
    }

    showShootingItemEffectNotice(item.label, item.detail);
    renderHud();
  }

  function gameLoop(ts) {
    if (!state || !state.running || state.ended || state.finishing || state.countdown) return;

    if (state.paused) {
      // メニュー表示中はゲーム進行を完全停止。
      // RAFだけ継続して、復帰時のdtジャンプを防ぐ。
      prevTs = ts;
      rafId = requestAnimationFrame(gameLoop);
      return;
    }

    if (state.ultCutinActive) {
      // ULTカットイン中はプレイヤー・敵・弾・DoT・召喚物を含めて完全停止。
      // RAFだけ継続し、再開時のdtジャンプを防ぐ。
      prevTs = ts;
      renderHud();
      rafId = requestAnimationFrame(gameLoop);
      return;
    }

    if (checkBattleTimeLimit(ts)) return;

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

    // エルテナULTは通常の敵移動が終わった後に吸引を適用。
    // これによりAIの横移動よりブラックホールの集敵を優先する。
    updateEltenaBlackHole(dt, ts);

    // 敵の位置更新後にプレイヤーとの直接接触を判定する。
    updateEnemyContactCollisions(ts);
    updateFacelessObjects(dt, ts);
    updateProjectiles(dt, ts);
    updateFacelessStageMechanics(ts);
    updateArnoAura(ts);
    updateCollectibles(dt);
    updateMimosaItems();
    if (isNormalBattle()) evaluateNormalMission(ts);
    renderHud();
    if (!state.ended) rafId = requestAnimationFrame(gameLoop);
  }


  function getBossIntroMeta() {
    if (!selectedStage || selectedStage.type !== 'boss' || !BOSS) return null;

    const battleImage = String(BOSS.image || '');
    const fileName = battleImage.split('/').pop() || '';
    const lower = fileName.toLowerCase();

    // ファイル名を基準にイントロ画像・名称を判定。
    // battle画像とbattle_start画像を同じ命名規則に統一する。
    let introImage = '';
    if (/_battle\.(webp|png|jpg|jpeg)$/i.test(battleImage)) {
      introImage = battleImage.replace(/_battle\.(webp|png|jpg|jpeg)$/i, '_battle_start.$1');
    } else if (selectedStage.introImage) {
      introImage = String(selectedStage.introImage);
    }

    const meta = {
      image: introImage,
      kicker: 'BOSS ENCOUNTER',
      title: BOSS.name || 'BOSS',
      sub: '',
      key: lower,
    };

    if (lower.includes('remnant_01')) {
      meta.kicker = 'REMNANT 01';
      meta.title = 'オーバーシア';
      meta.sub = 'OVERSEER';
    } else if (lower.includes('remnant_02')) {
      meta.kicker = 'REMNANT 02';
      meta.title = 'イリシュ';
      meta.sub = 'IRISH';
    } else if (lower.includes('remnant_03')) {
      meta.kicker = 'REMNANT 03';
      meta.title = 'リヴィア';
      meta.sub = 'RIVIA';
    } else if (lower.includes('remnant_04')) {
      meta.kicker = 'REMNANT 04';
      meta.title = 'サキエル';
      meta.sub = 'SAKIEL';
    } else if (lower.includes('faceless')) {
      meta.kicker = 'SPECIAL EVENT';
      meta.title = '無貌の天使';
      meta.sub = selectedStage.difficultyLabel || 'FACELESS';
      meta.image = selectedStage.introImage || 'images/enemy_faceless_battle_start.webp';
    } else {
      meta.sub = selectedStage.mission?.text || '';
    }

    return meta.image ? meta : null;
  }

  async function playBossStageIntro(onComplete) {
    const meta = getBossIntroMeta();

    // 通常ステージは従来通り、そのままカウントダウンへ。
    if (!meta) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    const root = document.getElementById(ROOT_ID);
    if (!root) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    await preloadShootingImage(meta.image, 7000, true);

    if (!document.getElementById(ROOT_ID) || !state || state.ended) return;

    root.querySelectorAll('.shooting-boss-intro').forEach(el => el.remove());

    const intro = document.createElement('div');
    intro.className = 'shooting-boss-intro';
    intro.setAttribute('aria-hidden', 'true');
    intro.innerHTML = `
      <div class="shooting-boss-intro-media">
        <img class="shooting-boss-intro-image" src="${meta.image}" alt="">
        <div class="shooting-boss-intro-glitch g1"></div>
        <div class="shooting-boss-intro-glitch g2"></div>
        <div class="shooting-boss-intro-glitch g3"></div>
      </div>
      <div class="shooting-boss-intro-vignette"></div>
      <div class="shooting-boss-intro-noise"></div>
      <div class="shooting-boss-intro-scan"></div>
      <div class="shooting-boss-intro-flash"></div>
      <div class="shooting-boss-intro-copy">
        <small>${meta.kicker}</small>
        <strong>${meta.title}</strong>
        <span>${meta.sub || ''}</span>
      </div>
      <div class="shooting-boss-intro-line line-a"></div>
      <div class="shooting-boss-intro-line line-b"></div>
    `;

    root.appendChild(intro);

    // 背景画像と同じ画像をglitch stripにも使用。
    intro.querySelectorAll('.shooting-boss-intro-glitch').forEach(glitch => {
      glitch.style.backgroundImage = `url("${meta.image}")`;
    });

    requestAnimationFrame(() => {
      intro.classList.add('show', 'shake-entry');
    });

    // 登場直後：画面全体へ短い衝撃。長く揺らさず、余韻だけ残す。
    setTimeout(() => {
      if (intro.isConnected) intro.classList.remove('shake-entry');
    }, 430);

    // タイトルが立ち上がる瞬間に二度目の小さなシェイク。
    setTimeout(() => {
      if (intro.isConnected) intro.classList.add('shake-title');
    }, 650);

    // 中盤で一瞬だけ強めのノイズ/glitchを出す。
    setTimeout(() => {
      if (intro.isConnected) intro.classList.add('glitch-burst');
    }, 720);

    setTimeout(() => {
      if (intro.isConnected) intro.classList.remove('shake-title');
    }, 1010);

    setTimeout(() => {
      if (intro.isConnected) intro.classList.remove('glitch-burst');
    }, 1050);

    // タイトルを少し長めに残し、余韻を保ったままゆっくり戦闘画面へ溶かす。
    setTimeout(() => {
      if (intro.isConnected) intro.classList.add('out');
    }, 2750);

    // フェードが完全に抜けてから READY カウントダウンへ。
    setTimeout(() => {
      intro.remove();
      if (typeof onComplete === 'function') onComplete();
    }, 3650);
  }

  function closeFacelessStageSelect() {
    document.getElementById('shooting-faceless-stage-select')?.remove();
  }

  function openFacelessStage(stageId) {
    // 「無貌の天使」ステージ一覧 → パーティ編成へ進んだことを保持。
    // 編成画面の「戻る」は、特別巡行トップではなく直前のステージ一覧へ戻す。
    window.__shootingReturnContext = { type: 'facelessStageSelect' };
    closeFacelessStageSelect();
    window.openShootingEvent({ stageId: String(stageId || '') });
  }

  function showFacelessStageSelect(options = {}) {
    closeFacelessStageSelect();
    const immediate = !!(options && options.immediate);
    const overlay = document.createElement('div');
    overlay.id = 'shooting-faceless-stage-select';
    overlay.className = 'shooting-special-stage-select shooting-faceless-stage-select';
    if (immediate) {
      // 編成画面から戻る時は、下層の「特別巡行」が1フレームでも露出しないよう
      // DOMへ載せる前から完全表示状態にしておく。
      overlay.classList.add('show');
      overlay.style.transition = 'none';
    }
    overlay.innerHTML = `
      <div class="shooting-special-stage-page shooting-faceless-stage-page">
        <div class="shooting-special-stage-header shooting-faceless-stage-header">
          <button type="button" class="shooting-special-stage-back shooting-faceless-stage-back" onclick="closeFacelessStageSelect()" aria-label="戻る">＜戻る</button>
          <div class="shooting-special-stage-title shooting-faceless-stage-title">無貌の天使</div>
        </div>

        <div class="shooting-special-stage-list shooting-faceless-stage-list">
          <button type="button" class="shooting-special-stage-row shooting-faceless-stage-row" onclick="openFacelessStage('${SHOOTING_STAGE_ID.FACELESS_ADVANCED}')">
            <div class="shooting-special-stage-no shooting-faceless-stage-no">01</div>
            <div class="shooting-special-stage-main shooting-faceless-stage-main">
              <div class="shooting-special-stage-name-row shooting-faceless-stage-name-row">
                <strong>上級</strong>
              </div>
              <div class="shooting-special-stage-condition shooting-faceless-stage-condition">クリア条件：フェイスレスを撃破</div>
              <div class="shooting-special-stage-wave shooting-faceless-stage-wave">総WAVE2</div>
            </div>
          </button>

          <button type="button" class="shooting-special-stage-row shooting-faceless-stage-row" onclick="openFacelessStage('${SHOOTING_STAGE_ID.FACELESS_SUPER}')">
            <div class="shooting-special-stage-no shooting-faceless-stage-no">02</div>
            <div class="shooting-special-stage-main shooting-faceless-stage-main">
              <div class="shooting-special-stage-name-row shooting-faceless-stage-name-row">
                <strong>最上級</strong>
              </div>
              <div class="shooting-special-stage-condition shooting-faceless-stage-condition">クリア条件：フェイスレスを撃破</div>
              <div class="shooting-special-stage-wave shooting-faceless-stage-wave">総WAVE2</div>
            </div>
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    if (!immediate) {
      requestAnimationFrame(() => overlay.classList.add('show'));
    } else {
      // 次フレーム以降は通常のtransition定義へ戻す。
      requestAnimationFrame(() => { if (overlay.isConnected) overlay.style.transition = ''; });
    }
  }

  window.closeFacelessStageSelect = closeFacelessStageSelect;
  window.openFacelessStage = openFacelessStage;

  function stopCountdownMovementLoop() {
    if (countdownMoveRafId) {
      cancelAnimationFrame(countdownMoveRafId);
      countdownMoveRafId = 0;
    }
  }

  function countdownMovementLoop(ts) {
    if (!state || state.ended || state.finishing || !state.countdown) {
      countdownMoveRafId = 0;
      return;
    }

    // カウントダウン中は「プレイヤー移動だけ」を動かす。
    // 敵・弾・自動射撃・ミッション時間・DoT等は一切開始しない。
    const dt = Math.min(0.032, Math.max(0, (ts - (prevTs || ts)) / 1000));
    prevTs = ts;

    if (!state.paused && !state.koTransition) {
      updateMovement(dt, ts, true);
    }

    renderHud();
    countdownMoveRafId = requestAnimationFrame(countdownMovementLoop);
  }

  function runStartCountdown() {
    const countdown = document.getElementById('shooting-countdown');
    const copy = document.getElementById('shooting-start-copy');
    if (!state || !countdown) return;

    stopCountdownMovementLoop();

    state.countdown = true;
    state.running = false;
    if (copy) copy.classList.add('hide');

    countdown.classList.remove('ready-phase', 'number-phase', 'start-phase');
    countdown.classList.add('show');
    countdown.setAttribute('aria-hidden', 'false');

    const span = countdown.querySelector('span');
    const sequence = [
      { text:'ARE YOU READY', phase:'ready-phase',  hold:1250 },
      { text:'3',             phase:'number-phase', hold:850 },
      { text:'2',             phase:'number-phase', hold:850 },
      { text:'1',             phase:'number-phase', hold:850 },
      { text:'START',         phase:'start-phase',  hold:1050 }
    ];

    // 「ARE YOU READY」表示前からキャラを掴めるよう、
    // 戦闘ロジックとは独立した移動専用RAFを先に開始する。
    prevTs = performance.now();
    countdownMoveRafId = requestAnimationFrame(countdownMovementLoop);

    let i = 0;

    const showStep = () => {
      if (!state || state.ended || !span) return;

      const step = sequence[i];
      countdown.classList.remove('ready-phase', 'number-phase', 'start-phase');
      countdown.classList.add(step.phase);

      span.textContent = step.text;
      span.classList.remove('pop', 'ready-pop', 'start-pop');
      void span.offsetWidth;

      if (step.phase === 'ready-phase') span.classList.add('ready-pop');
      else if (step.phase === 'start-phase') span.classList.add('start-pop');
      else span.classList.add('pop');

      i += 1;

      if (i < sequence.length) {
        setTimeout(showStep, step.hold);
        return;
      }

      // STARTはカウントダウン演出として完結させる。
      // START表示中はまだ敵弾・自動射撃・時間計測を開始せず、
      // 文字が消えた直後から実戦を開始する。
      setTimeout(() => {
        if (!state || state.ended || !state.countdown) return;

        countdown.classList.remove('show', 'ready-phase', 'number-phase', 'start-phase');
        countdown.setAttribute('aria-hidden', 'true');
        stopCountdownMovementLoop();

        state.countdown = false;
        state.running = true;
        state.startedAt = performance.now();
        state.lastShotAt = -9999;
        state.lastBossShotAt = -9999;

        // START直後の実座標から戦闘AIの軌道へ短くブレンドする。
        state.bossMotionBlendFromX = Number(state.boss?.x || 0);
        state.bossMotionBlendFromY = Number(state.boss?.y || 0);
        state.bossMotionBlendStartedAt = state.startedAt;

        // カウントダウン中から指を置いたままでも、
        // 現在位置を基準に相対ドラッグをそのまま継続する。
        rebaseTouchDragToPlayer();

        prevTs = performance.now();
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(gameLoop);
      }, step.hold);
    };

    // 戦闘画面が見えた直後に一拍置いて開始。
    setTimeout(showStep, 260);
  }

  function beginBossDefeat() {
    if (!state || state.ended || state.finishing) return;
    if (isFacelessStage() && Number(state.facelessWave || 1) === 1) {
      beginFacelessWave2();
      return;
    }
    state.finishing = true;
    state.running = false;
    cancelAnimationFrame(rafId);

    // 撃破した瞬間に弾を止め、少し余韻を残してからリザルトへ。
    clearProjectiles();
    renderHud();

    // 全BOSSステージ共通：撃破エフェクトの余韻後、勝利セレモニーへ。
    // フェイスレスWAVE1では上の分岐でreturnするため誤表示しない。

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
      showStageClearSequence(() => {
        if (!state || state.ended) return;
        state.finishing = false;
        endGame(true);
      });
    }, 1050);
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

    // GAME OVERは戦闘画面専用。RESULTへ持ち越さない。
    document.querySelectorAll('.shooting-game-over-notice').forEach(el => el.remove());

    // RESULTへ切り替える前に、戦闘中だけの演出/HUD状態を確実に解除する。
    const rootForResult = document.getElementById(ROOT_ID);
    if (rootForResult) {
      rootForResult.classList.remove('normal-stage-clear', 'mission-item-get');
      rootForResult.querySelectorAll('.shooting-clear-condition-achieved').forEach(el => el.remove());
    }
    const missionHudForResult = document.getElementById('shooting-mission-hud');
    if (missionHudForResult) missionHudForResult.style.display = 'none';
    const battleTimerForResult = document.getElementById('shooting-battle-timer');
    if (battleTimerForResult) {
      battleTimerForResult.classList.remove('show','is-warning','is-danger');
      battleTimerForResult.setAttribute('aria-hidden','true');
    }
    const comboForResult = document.getElementById('shooting-combo');
    if (comboForResult) comboForResult.style.display = 'none';
    state.running = false;
    cancelAnimationFrame(rafId);
    clearEltenaBlackHole();
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
    const raidRow = document.getElementById('shooting-result-raid-row');
    const raidDamageEl = document.getElementById('shooting-result-raid-damage');
    const retryBtn = document.getElementById('shooting-result-retry');
    const rankLetter = getResultRank(state.score, win);
    state.clearTimeMs = Math.max(0, performance.now() - (state.startedAt || performance.now()));

    if (isRaidStage()) {
      state.raidDamageDealt = Math.max(0, Math.floor(Number(state.raidInitialHp || 0) - Number(state.boss && state.boss.hp || 0)));
      if (raidRow) raidRow.style.display = '';
      if (raidDamageEl) raidDamageEl.textContent = state.raidDamageDealt.toLocaleString('ja-JP');
      if (retryBtn) retryBtn.style.display = 'none';
      if (!state.raidAttemptFinished && window.RaidEvent && typeof window.RaidEvent.finishAttempt === 'function') {
        state.raidAttemptFinished = true;
        void window.RaidEvent.finishAttempt(state.raidDamageDealt, { bossDefeated: !!win });
      }
    } else {
      if (raidRow) raidRow.style.display = 'none';
      if (retryBtn) retryBtn.style.display = '';
    }

    // ステージ別最高スコアをローカルへ即時反映し、Supabaseへ非同期保存。
    void submitShootingHighScore(state.score);
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
      const c = getBattleCharacter(m.id);
      return `<span class="shooting-result-member${markDown && m.hp <= 0 ? ' down' : ''}" title="${c.name}"><img src="${c.panelImage || c.image}" alt="${c.name}"><b>${value}${suffix}</b></span>`;
    };
    if (kicker) kicker.textContent = win ? '' : 'MISSION FAILED';
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

  function rebaseTouchDragToPlayer(preserveTarget = false) {
    if (!pointerActive || !pointerIsTouch || !state || !state.player) return;

    dragStartClientX = lastPointerClientX;
    dragStartClientY = lastPointerClientY;

    if (preserveTarget) {
      // キャラチェンジ中も、指が向かっている「現在の移動目標」を捨てない。
      // 同じ指位置で次のpointermoveが来てもtargetが変わらないため、
      // 一瞬ブレーキが掛かったような操作感を防ぐ。
      dragStartPlayerX = pointerX;
      dragStartPlayerY = pointerY;
      return;
    }

    dragStartPlayerX = state.player.x;
    dragStartPlayerY = state.player.y;
    pointerX = state.player.x;
    pointerY = state.player.y;
  }

  function beginTouchDrag(e) {
    if (!state || !state.player) return;

    pointerActive = true;
    pointerIsTouch = true;
    activePointerId = e.pointerId;

    lastPointerClientX = e.clientX;
    lastPointerClientY = e.clientY;
    dragStartClientX = e.clientX;
    dragStartClientY = e.clientY;

    // 重要:
    // 指を置いた座標ではなく「その瞬間のキャラ位置」を移動目標にする。
    // これで画面の離れた場所をタップしてもキャラは1pxもワープしない。
    dragStartPlayerX = state.player.x;
    dragStartPlayerY = state.player.y;
    pointerX = state.player.x;
    pointerY = state.player.y;
  }

  function onPointerDown(e) {
    if (!state || state.ended || state.finishing || state.paused) return;

    const touchLike = isTouchLikePointer(e);

    // すでに別の指で操作中なら、その指以外のpointerdownは移動入力に使わない。
    if (
      pointerActive &&
      activePointerId !== null &&
      e.pointerId !== activePointerId
    ) {
      return;
    }

    const now = performance.now();
    const dx = e.clientX - lastTapX;
    const dy = e.clientY - lastTapY;
    const isDoubleTap =
      lastTapAt > 0 &&
      (now - lastTapAt) <= ULT_DOUBLE_TAP_MS &&
      Math.hypot(dx, dy) <= ULT_DOUBLE_TAP_DISTANCE;

    if (touchLike) {
      beginTouchDrag(e);
    } else {
      pointerActive = true;
      pointerIsTouch = false;
      activePointerId = e.pointerId;
      lastPointerClientX = e.clientX;
      lastPointerClientY = e.clientY;
      updatePointer(e);
    }

    swipeStartX = e.clientX;
    swipeStartY = e.clientY;
    swipeStartAt = now;

    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}

    if (isDoubleTap) {
      lastTapAt = 0;

      if (!state.countdown && isUltReady()) {
        // ULT発動時も「現在のキャラ位置」をドラッグ基準に維持。
        // 指の絶対座標へ同期しない。
        window.useShootingBurst();
        e.preventDefault();
        return;
      }
    } else {
      lastTapAt = now;
      lastTapX = e.clientX;
      lastTapY = e.clientY;
    }

    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!pointerActive || !state || state.ended || state.finishing || state.paused) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;

    lastPointerClientX = e.clientX;
    lastPointerClientY = e.clientY;

    // ultCutinActive中でも入力基準だけ更新する。
    updatePointer(e);
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;

    const wasActive = pointerActive;

    pointerActive = false;
    pointerIsTouch = false;
    activePointerId = null;

    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}

    if (wasActive && state && !state.ended && !state.finishing && !state.koTransition) {
      const elapsed = performance.now() - swipeStartAt;
      const dx = e.clientX - swipeStartX;
      const dy = e.clientY - swipeStartY;
      const isFlick =
        elapsed <= SWITCH_SWIPE_MAX_MS &&
        Math.abs(dx) >= SWITCH_SWIPE_MIN_X &&
        Math.abs(dx) >= Math.abs(dy) * SWITCH_SWIPE_AXIS_RATIO;

      if (isFlick) {
        const others = state.party.filter(m => m.id !== state.activeCharacterId && m.hp > 0);
        const target = dx > 0 ? others[0] : others[1];
        if (target) window.switchShootingCharacter(target.id);
      }
    }

    e.preventDefault();
  }

  function updatePointer(e) {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !state || !state.player) return;

    const r = arena.getBoundingClientRect();
    const touchLike = pointerIsTouch || isTouchLikePointer(e);

    if (touchLike) {
      // iPhoneでは絶対座標に追従させない。
      // touchstartから動いた「差分」だけを、touchstart時点のキャラ位置へ足す。
      const deltaX = e.clientX - dragStartClientX;
      const deltaY = e.clientY - dragStartClientY;

      pointerX = clamp(
        dragStartPlayerX + deltaX,
        30,
        r.width - 30
      );

      pointerY = clamp(
        dragStartPlayerY + deltaY,
        34,
        r.height - 38
      );

      return;
    }

    // PCマウスは従来どおり絶対座標へ追従。
    pointerX = clamp(e.clientX - r.left, 30, r.width - 30);
    pointerY = clamp(e.clientY - r.top, 34, r.height - 38);
  }

  window.selectShootingCharacter = function (id) {
    id = Number(id);
    if (!SHOOTING_CHARACTERS[id] || !isShootingCharacterOwned(id)) return;

    if (isStoryShootingStage() && id === Number(CHARACTER_ID.ERI)) {
      ensureStoryEriLeader();
      selectedCharacterId = Number(CHARACTER_ID.ERI);
      applySelectedCharacterToUi();
      return;
    }

    const idx = selectedPartyIds.indexOf(id);
    if (idx >= 0) selectedPartyIds.splice(idx, 1);
    else if (selectedPartyIds.length < PARTY_SIZE) selectedPartyIds.push(id);

    if (isStoryShootingStage()) ensureStoryEriLeader();
    selectedCharacterId = selectedPartyIds[0] || id;
    applySelectedCharacterToUi();
  };



  function showShootingUltFullChargeNotice() {
    const el = document.getElementById('shooting-ult-full-notice');
    if (!el) return;

    el.classList.remove('show');
    el.setAttribute('aria-hidden', 'false');

    // アニメーションを毎回確実に再スタート
    void el.offsetWidth;
    el.classList.add('show');

    window.clearTimeout(el.__hideTimer);
    el.__hideTimer = window.setTimeout(() => {
      el.classList.remove('show');
      el.setAttribute('aria-hidden', 'true');
    }, 2350);
  }

  function setShootingHeaderMenuMode(inBattle) {
    const btn = document.querySelector(`#${ROOT_ID} .shooting-back`);
    if (!btn) return;

    // バトル中は左上ボタンを完全に消す。
    // 一時停止メニューは右下のMENUボタンから開く。
    if (inBattle) {
      btn.classList.remove('is-menu');
      btn.classList.add('is-battle-hidden');
      btn.textContent = '＜戻る';
      btn.setAttribute('aria-label', '戻る');
      btn.setAttribute('onclick', 'closeShootingEvent()');
    } else {
      btn.classList.remove('is-menu', 'is-battle-hidden');
      btn.textContent = '＜戻る';
      btn.setAttribute('aria-label', '戻る');
      btn.setAttribute('onclick', 'closeShootingEvent()');
    }
    setShootingStageHeader(!!inBattle);
  }

  function ensureShootingPauseMenu() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return null;

    let menu = root.querySelector('#shooting-pause-menu');
    if (menu) return menu;

    menu = document.createElement('div');
    menu.id = 'shooting-pause-menu';
    menu.className = 'shooting-pause-menu';
    menu.setAttribute('aria-hidden', 'true');
    menu.innerHTML = `
      <div class="shooting-pause-backdrop" aria-hidden="true"></div>
      <section class="shooting-pause-card" role="dialog" aria-modal="true" aria-labelledby="shooting-pause-title">
        <div class="shooting-pause-kicker">PAUSE</div>
        <h2 id="shooting-pause-title">メニュー</h2>
        <div class="shooting-pause-divider"></div>
        <button type="button" class="shooting-pause-action shooting-pause-exit" onclick="exitShootingStageFromPause()">ステージを終了する</button>
        <button type="button" class="shooting-pause-action" onclick="restartShootingStageFromPause()">最初からやり直す</button>
        <button type="button" class="shooting-pause-action shooting-pause-close" onclick="closeShootingPauseMenu()">閉じる</button>
      </section>
    `;
    root.appendChild(menu);
    return menu;
  }

  function shiftPausedTimestamps(target, deltaMs, seen) {
    if (!target || typeof target !== 'object' || !deltaMs) return;
    seen = seen || new Set();
    if (seen.has(target)) return;
    seen.add(target);

    Object.keys(target).forEach(key => {
      const value = target[key];

      if (
        typeof value === 'number' &&
        value > 0 &&
        (/(At|Until)$/.test(key) || key === 'startedAt')
      ) {
        target[key] = value + deltaMs;
        return;
      }

      if (value && typeof value === 'object') {
        shiftPausedTimestamps(value, deltaMs, seen);
      }
    });
  }

  function resumeShootingFromPause(shiftTime) {
    if (!state || !state.paused) return;

    const now = performance.now();
    const pausedFor = Math.max(0, now - Number(state.pauseStartedAt || now));

    if (shiftTime !== false && pausedFor > 0) {
      // 攻撃間隔・バフ/デバフ残り時間・クリアタイム等が
      // PAUSE中に勝手に進まないよう、絶対時刻を停止時間分ずらす。
      shiftPausedTimestamps(state, pausedFor);
    }

    state.paused = false;
    state.pauseStartedAt = 0;
    prevTs = now;
    keys = Object.create(null);
    pointerActive = false;
    pointerIsTouch = false;
  }

  window.openShootingPauseMenu = function () {
    if (!state || state.ended || state.finishing || state.countdown) return;

    const menu = ensureShootingPauseMenu();
    if (!menu || state.paused) return;

    state.paused = true;
    state.pauseStartedAt = performance.now();
    pointerActive = false;
    pointerIsTouch = false;
    keys = Object.create(null);

    menu.classList.add('show');
    menu.setAttribute('aria-hidden', 'false');
  };

  window.closeShootingPauseMenu = function () {
    const menu = document.getElementById('shooting-pause-menu');
    if (menu) {
      menu.classList.remove('show');
      menu.setAttribute('aria-hidden', 'true');
    }
    resumeShootingFromPause(true);
  };

  window.restartShootingStageFromPause = function () {
    const menu = document.getElementById('shooting-pause-menu');
    if (menu) {
      menu.classList.remove('show');
      menu.setAttribute('aria-hidden', 'true');
    }
    resumeShootingFromPause(false);
    window.restartShootingEvent();
  };

  window.exitShootingStageFromPause = function () {
    const menu = document.getElementById('shooting-pause-menu');
    if (menu) {
      menu.classList.remove('show');
      menu.setAttribute('aria-hidden', 'true');
    }
    if (state) {
      state.paused = false;
      state.pauseStartedAt = 0;
    }
    window.closeShootingEvent();
  };

  window.startSelectedShootingCharacter = function () {
    if (isStoryShootingStage()) ensureStoryEriLeader();
    if (!isShootingPartyReady()) return;
    selectedCharacterId = selectedPartyIds[0];
    clearEltenaBlackHole();
    resetState();
    clearProjectiles();
    clearNormalBattleObjects();
    applySelectedCharacterToUi();
    setCharacterSelectVisible(false);
    setBattleHudVisible(true);
    applyShootingUiLayout(shootingUiLayoutType);
    setShootingHeaderMenuMode(true);
    ensureShootingPauseMenu();

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
      playBossStageIntro(runStartCountdown);
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
      showFacelessStageSelect();
      return;
    }

    resolveSelectedStage(options || {});
    selectedRaidContext = options && options.raidContext ? { ...options.raidContext } : null;
    BOSS = getCurrentShootingEnemy();

    // パーティ選択中に、その後のバトル画像・ULT・敵画像を先読みしておく。
    warmShootingAssets();
    const root = UIModule.buildRoot({
      ROOT_ID, PLAYER_ID, BOSS_ID, BOSS, SHOOTING_CHARACTERS, CHARACTER_ID,
      getShootingRosterHtml, onPointerDown, onPointerMove, onPointerUp
    });
    const bossImage = document.getElementById(BOSS_ID);
    if (bossImage) {
      if (BOSS.image) void preloadShootingImage(BOSS.image, 7000);
      const introMeta = getBossIntroMeta();
      if (introMeta && introMeta.image) void preloadShootingImage(introMeta.image, 7000);
      bossImage.src = BOSS.image || '';
      bossImage.alt = BOSS.name || '';
      bossImage.style.setProperty('--enemy-scale', String(Number(BOSS.uiScale || 1)));
      bossImage.style.display = selectedStage && selectedStage.type === 'normal' ? 'none' : '';
    }
    root.setAttribute('data-shooting-stage', selectedStage ? selectedStage.id : '');
    root.setAttribute('data-battle-type', selectedStage ? selectedStage.type : 'boss');
    applyShootingUiLayout(shootingUiLayoutType);

    setCommonUiVisible(true);
    root.style.display = 'block';
    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
    clearEltenaBlackHole();
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
    selectedStageHighScore = getLocalShootingHighScore(selectedStage?.id || '');
    setShootingHeaderMenuMode(false);
    void loadShootingHighScore();
    ensureShootingPauseMenu();
    refreshShootingRoster();

    const firstOwned = Object.keys(SHOOTING_CHARACTERS).map(Number).find(isShootingCharacterOwned);
    if (isStoryShootingStage() && isShootingCharacterOwned(CHARACTER_ID.ERI)) {
      selectedPartyIds = [Number(CHARACTER_ID.ERI)];
      selectedCharacterId = Number(CHARACTER_ID.ERI);
    } else {
      selectedCharacterId = firstOwned || CHARACTER_ID.ERI;
    }

    applySelectedCharacterToUi();
    setCharacterSelectVisible(true);
    setBattleHudVisible(false);
    requestAnimationFrame(() => {
      placeInitialUnits();
      renderHud();
    });
  };

  window.restartShootingEvent = function () {
    if (isRaidStage()) {
      alert('DAILY RAIDは1日1回のみ挑戦できます。');
      return;
    }
    const root = document.getElementById(ROOT_ID);
    if (!root) return window.openShootingEvent();
    clearEltenaBlackHole();

    // RETRY前の旧stateが生きているうちに無貌OBJECT/弾を先に掃除する。
    // さらにclearProjectiles自体もDOM直指定で消すため、画像だけ残るゴーストを防ぐ。
    clearProjectiles();
    resetState();
    setShootingHeaderMenuMode(true);
    ensureShootingPauseMenu();
    clearNormalBattleObjects();
    applySelectedCharacterToUi();
    setCharacterSelectVisible(false);
    setBattleHudVisible(true);
    applyShootingUiLayout(shootingUiLayoutType);
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
    playBossStageIntro(runStartCountdown);
  };

  window.closeShootingEvent = function () {
    // 戻る先は「この画面を開いた直前の画面」。
    // 先に退避してからクリアし、古い戻り先が次回起動へ残らないようにする。
    const returnContext = window.__shootingReturnContext || null;
    window.__shootingReturnContext = null;

    const returningToFacelessStageSelect = !!(
      returnContext && returnContext.type === 'facelessStageSelect'
    );
    const returningToRaidLobby = !!(returnContext && returnContext.type === 'raidLobby');

    // 戦闘途中で戻った場合も、その日の挑戦は消費済み。
    // そこまでに与えたダメージだけを確定してリトライ抜けを防ぐ。
    if (isRaidStage() && state && !state.raidAttemptFinished && window.RaidEvent && typeof window.RaidEvent.finishAttempt === 'function') {
      state.raidDamageDealt = Math.max(0, Math.floor(Number(state.raidInitialHp || 0) - Number(state.boss && state.boss.hp || 0)));
      state.raidAttemptFinished = true;
      void window.RaidEvent.finishAttempt(state.raidDamageDealt, { aborted: true });
    }

    // ④パーティ編成 → ③無貌の天使 の戻りだけは、先に③を最前面へ完成表示する。
    // その後で④のshooting rootを破棄することで、背面の②特別巡行を一瞬も見せない。
    if (returningToFacelessStageSelect) {
      showFacelessStageSelect({ immediate: true });
    } else {
      closeFacelessStageSelect();
    }
    clearUltTimers();
    if (state) {
      state.running = false;
      state.ended = true;
      state.countdown = false;
      state.finishing = false;
      state.paused = false;
      state.pauseStartedAt = 0;
    }
    cancelAnimationFrame(rafId);
    clearEltenaBlackHole();
    clearProjectiles();
    clearNormalBattleObjects();
    pointerActive = false;
    pointerIsTouch = false;
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

    // 直前画面を復元する。
    if (returningToFacelessStageSelect) {
      // ③はroot削除前にすでに描画済み。
      selectedRaidContext = null;
      return;
    }

    if (returningToRaidLobby) {
      selectedRaidContext = null;
      if (typeof window.openDailyRaid === 'function') window.openDailyRaid({ immediate: true, refresh: true });
      return;
    }

    selectedRaidContext = null;
    if (returnContext && returnContext.type === 'storyChapter') {
      const chapter = Number(returnContext.chapter || 1);
      if (typeof window.openStageSelect === 'function') {
        window.openStageSelect(chapter);
      }
    }
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
    const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(amount || 0)));
    state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
    updateBossPhase();
    createHit(state.boss.x, state.boss.y, !!big);
    showBossDamageNumber(appliedDamage, !!big);
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
      const damage =
        Number(c.atk || 0) *
        Number(c.ultDamageAtkMultiplier || 2.8);
      applyUltDamage(damage, true);
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
    preloadShootingImage(AYANE_ULT_HAND_OPEN_SRC);
    preloadShootingImage(AYANE_ULT_HAND_CLOSE_SRC);
    if (isNormalBattle()) {
      showUltCut(c.ultName, c.effectKey);
      ultScreenFlash('ult-flash-ayane');
      clearEnemyBulletsOnly();

      const arena = document.getElementById('shooting-arena');
      const root = document.getElementById(ROOT_ID);
      const livingTargets = (state.normalEnemies || [])
        .filter(enemy => enemy && enemy.el && enemy.hp > 0);

      if (!arena || !livingTargets.length) {
        state.ultLockUntil = performance.now() + 420;
        return;
      }

      const now = performance.now();
      const STRIKE_DELAY = 620;
      const GRAB_DURATION = 7000;
      const RELEASE_DELAY = STRIKE_DELAY + GRAB_DURATION;

      const startX = state.player.x;
      const startY = Math.max(24, state.player.y - 18);

      // 最寄りの敵を「主目標」にして射線方向を決める。
      const primary = livingTargets
        .slice()
        .sort((a, b) => {
          const da = Math.hypot((a.x || 0) - startX, (a.y || 0) - startY);
          const db = Math.hypot((b.x || 0) - startX, (b.y || 0) - startY);
          return da - db;
        })[0];

      const aimDx = Number(primary.x || 0) - startX;
      const aimDy = Number(primary.y || 0) - startY;
      const aimLen = Math.max(1, Math.hypot(aimDx, aimDy));
      const ux = aimDx / aimLen;
      const uy = aimDy / aimLen;

      // 黒手は主目標で止めず、その方向へ画面外まで伸びる。
      // 射線上に複数の敵が並んでいれば、全員を同時に掴む。
      const rayLength = Math.hypot(arena.clientWidth, arena.clientHeight) * 1.25;
      const endX = startX + ux * rayLength;
      const endY = startY + uy * rayLength;

      // 「当たった」の判定幅。黒手の見た目に合わせてやや太め。
      const HIT_HALF_WIDTH = 74;

      function distanceToAyaneRay(enemy) {
        const ex = Number(enemy.x || 0) - startX;
        const ey = Number(enemy.y || 0) - startY;
        const along = ex * ux + ey * uy;
        if (along < 0 || along > rayLength) return { along, side: Infinity };
        const side = Math.abs(ex * uy - ey * ux);
        return { along, side };
      }

      let hitTargets = livingTargets
        .map(enemy => ({ enemy, ...distanceToAyaneRay(enemy) }))
        .filter(v => v.side <= HIT_HALF_WIDTH)
        .sort((a, b) => a.along - b.along)
        .map(v => v.enemy);

      // 主目標は必ず掴む。端数・DOM位置差で主目標だけ漏れるのを防止。
      if (!hitTargets.includes(primary)) hitTargets.unshift(primary);

      // 同一敵の重複を防止。
      hitTargets = Array.from(new Set(hitTargets));

      // アヤネ自身は黒手が命中するまでだけ通常射撃停止。
      // 命中後は7秒拘束中でも通常攻撃・キャラチェンジ可能。
      state.ultLockUntil = now + STRIKE_DELAY + 120;

      const visualDistance = Math.max(100, rayLength);
      const angle = Math.atan2(uy, ux) * 180 / Math.PI;

      const fx = document.createElement('div');
      fx.className = 'shooting-ayane-blackhand-ult shooting-ayane-blackhand-multi';
      fx.style.setProperty('--ayane-start-x', `${startX}px`);
      fx.style.setProperty('--ayane-start-y', `${startY}px`);
      fx.style.setProperty('--ayane-end-x', `${endX}px`);
      fx.style.setProperty('--ayane-end-y', `${endY}px`);
      fx.style.setProperty('--ayane-distance', `${visualDistance}px`);
      fx.style.setProperty('--ayane-angle', `${angle}deg`);
      fx.innerHTML = getAyaneBlackhandHtml();
      arena.appendChild(fx);

      if (root) root.classList.add('ayane-rampage-active');

      pushUltTimer(() => fx.classList.add('charge'), 90);
      pushUltTimer(() => {
        if (!fx.isConnected) return;
        fx.classList.add('strike');
      }, 300);

      pushUltTimer(() => {
        if (!state || !fx.isConnected) return;

        fx.classList.add('hit', 'grab');
        if (root) root.classList.add('ayane-rampage-shake');

        const grabUntil = performance.now() + GRAB_DURATION;
        const totalDamage =
          Number(c.atk || 0) *
          Number(c.ultDamageAtkMultiplier || 3.5);
        const initialDamage = totalDamage * 0.18;
        const tickCount = 28; // 250ms × 28 = 7秒
        const tickDamage = (totalDamage - initialDamage) / tickCount;

        // 命中した敵を全員、個別に7秒拘束。
        hitTargets.forEach((enemy, index) => {
          if (!enemy || enemy.hp <= 0 || !enemy.el) return;

          enemy.ayaneGrabUntil = grabUntil;
          enemy.el.classList.add('ayane-grabbed', 'ayane-multi-grabbed');

          // 各敵の位置に個別の拘束リングを表示。
          const marker = document.createElement('div');
          marker.className = 'shooting-ayane-multi-grip';
          marker.dataset.enemyUid = String(enemy.uid || index);
          arena.appendChild(marker);
          positionUnit(marker, enemy.x, enemy.y);
          enemy.ayaneGrabMarker = marker;

          createHit(enemy.x, enemy.y, true);
          damageNormalEnemy(enemy, initialDamage, performance.now(), true);

          // 7秒間に残りダメージを分割。
          for (let i = 1; i <= tickCount; i++) {
            pushUltTimer(() => {
              if (!state || state.ended || !enemy || enemy.hp <= 0) return;
              damageNormalEnemy(enemy, tickDamage, performance.now(), false);

              // 敵が倒れた場合は拘束マーカーを即消す。
              if (enemy.hp <= 0 && enemy.ayaneGrabMarker) {
                enemy.ayaneGrabMarker.remove();
                enemy.ayaneGrabMarker = null;
                enemy.ayaneGrabUntil = 0;
              }
            }, i * 250);
          }
        });

        // 命中成立後はアヤネ通常攻撃を即再開。
        state.ultLockUntil = performance.now() + 120;
        state.lastShotAt = performance.now();

        renderHud();
      }, STRIKE_DELAY);

      pushUltTimer(() => {
        hitTargets.forEach(enemy => {
          if (!enemy) return;
          enemy.ayaneGrabUntil = 0;
          if (enemy.el) enemy.el.classList.remove('ayane-grabbed', 'ayane-multi-grabbed');
          if (enemy.ayaneGrabMarker) {
            enemy.ayaneGrabMarker.classList.add('release');
            const marker = enemy.ayaneGrabMarker;
            enemy.ayaneGrabMarker = null;
            setTimeout(() => marker.isConnected && marker.remove(), 280);
          }
        });

        fx.classList.remove('grab');
        fx.classList.add('release');
        if (root) root.classList.remove('ayane-rampage-shake');
        renderHud();
      }, RELEASE_DELAY);

      pushUltTimer(() => {
        fx.classList.add('fade');
        if (root) {
          root.classList.remove('ayane-rampage-shake');
          root.classList.remove('ayane-rampage-active');
        }
      }, RELEASE_DELAY + 240);

      pushUltTimer(() => {
        if (fx.isConnected) fx.remove();
      }, RELEASE_DELAY + 700);

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
    fx.innerHTML = getAyaneBlackhandHtml(`
      <div class="shooting-ayane-blackhand-grip-ring r1"></div>
      <div class="shooting-ayane-blackhand-grip-ring r2"></div>
      <div class="shooting-ayane-blackhand-grip-ring r3"></div>
      <div class="shooting-ayane-blackhand-smoke s1"></div>
      <div class="shooting-ayane-blackhand-smoke s2"></div>
      <div class="shooting-ayane-blackhand-smoke s3"></div>
      <div class="shooting-ayane-blackhand-smoke s4"></div>
    `);
    arena.appendChild(fx);

    if (root) root.classList.add('ayane-rampage-active');
    requestAnimationFrame(() => fx.classList.add('run'));

    pushUltTimer(() => fx.classList.add('charge'), 180);

    pushUltTimer(() => {
      fx.classList.add('strike');
    }, 520);

    pushUltTimer(() => {
      // 見た目と当たり判定を一致させる。
      // 黒手の実DOMとボス画像の実DOMが重なっているかを最優先で判定する。
      const impactEl = fx.querySelector('.shooting-ayane-blackhand-impact');
      const impactRect = impactEl ? impactEl.getBoundingClientRect() : null;
      const bossRect = bossEl ? bossEl.getBoundingClientRect() : null;

      const visualHit =
        !!(impactRect && bossRect && rectsHit(impactRect, bossRect, -6, -6));

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
      if (root) root.classList.add('ayane-rampage-shake');

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
        const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(initialDamage || 0)));
        state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
        createHit(state.boss.x, state.boss.y, true);
        showBossDamageNumber(appliedDamage, true);
        flashBossHit(true);
        state.score += Math.round(initialDamage * 100);
        renderHud();
        if (state.boss.hp <= 0) beginBossDefeat();
      }

      for (let i = 1; i <= tickCount; i++) {
        pushUltTimer(() => {
          if (!state || state.ended || state.finishing || state.boss.hp <= 0) return;
          const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(tickDamage || 0)));
          state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
          showBossDamageNumber(appliedDamage, false);
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

    const c = getBattleCharacter(state.arnoAuraOwnerId || CHARACTER_ID.ARNO);
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
    const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(damage || 0)));
    state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
    showBossDamageNumber(appliedDamage, false);
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
    const c = getBattleCharacter(CHARACTER_ID.ROSE);
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
    // scale transition(.42s)が収まった後の最終サイズで1回だけ実測する。
    setTimeout(() => measureUnitSize(state.roseFlower), 440);

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
    const c = getBattleCharacter(CHARACTER_ID.IGNIS);
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
      const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(damage || 0)));
      state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
      createHit(state.boss.x, state.boss.y, true);
      showBossDamageNumber(appliedDamage, true);
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
    const c = getBattleCharacter(CHARACTER_ID.IGNIS);
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
    return getBattleCharacter(CHARACTER_ID.CLARINE) || {};
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
    const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(damage || 0)));
    state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
    updateBossPhase();
    createHit(x, y, true);
    showBossDamageNumber(appliedDamage, true);
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
    // height:autoで画像の実サイズに依存するため、ロード完了後に1回だけ実測する。
    if (el.complete) {
      measureUnitSize(decoy);
    } else {
      el.addEventListener('load', () => measureUnitSize(decoy), { once: true });
    }
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
    else if (c.ultType === 'eltena_black_hole') useEltenaUlt(c);
    else if (c.ultType === 'nem_stun') useNemUlt(c);
    else if (c.ultType === 'mimosa_item_spawn') useMimosaUlt(c);
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
