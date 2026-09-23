// stage_select.js
// 20260817-ch04-02-geometry-lite-v58
// ステージ選択モーダル
// openStageSelect(chapter) で開く → STORY SHOOTINGステージを選択

(function () {

  // ============================================================
  // STORY CHAPTER PROGRESSION
  // CHAPTER 01 から順に解放。前章の全ステージクリアで次章を解放。
  // ============================================================
  const STORY_CHAPTER_MIN = 1;
  const STORY_CHAPTER_MAX = 8;
  const STORY_CLEAR_KEY = 'zeraphia_story_stage_clears_v1';
  const STORY_CHAPTER_TITLES = {
    1: '目覚めの朝',
    2: 'ディストラクション',
    3: '失われたもの',
    4: '嘘と真実',
    5: '境界のマリオネット',
    6: '遮断領域',
    7: '未定',
    8: '未定'
  };

  // STORY表示用クリア条件。
  // ステージ固有タイトルは使わず、画面上では「ステージN」で統一する。
  const STORY_STAGE_CONDITIONS = {
    'shooting_ch01_01': 'アイテムを3つ拾得',
    'shooting_ch01_02': '90秒以内に敵をすべて撃破',
    'shooting_ch01_03': '被弾3回以内に敵をすべて撃破',
    'shooting_ch01_04': 'オーバーシアを撃破',

    'shooting_ch02_01': '敵をすべて撃破',
    'shooting_ch02_02': '150秒以内に敵をすべて撃破',
    'shooting_ch02_03': '被弾3回以内に敵をすべて撃破',
    'shooting_ch02_04': 'イリシュを撃破',

    'shooting_ch03_01': 'アイテムを3つ拾得',
    'shooting_ch03_02': 'アイテムを3つ拾得',
    'shooting_ch03_03': 'アイテムを3つ拾得',
    'shooting_ch03_04': 'リヴィアを撃破',

    'shooting_ch04_01': '60秒耐え、最後のアイテムを5秒以内に獲得',
    'shooting_ch04_02': '狭まる壁を避けて60秒耐え、最後のアイテムを獲得',
    'shooting_ch04_03': 'サキエルの猛攻を60秒逃げ切り、最後のアイテムを獲得',

    'shooting_ch05_01': 'アイテムを3つ取得',
    'shooting_ch05_02': '90秒以内に敵を3体撃破',
    'shooting_ch05_03': 'レムナント：ミラージュを撃破',

    'shooting_ch06_01': '壁の奥のFIRE強敵を撃破（AQUAのみ有効）',
    'shooting_ch06_02': '雑魚＋DARK強敵を撃破（LIGHTのみ有効）',
    'shooting_ch06_03': 'LIGHTボスを撃破（DARKのみ有効）',
  };


  function getStoryClearMap() {
    try {
      const raw = localStorage.getItem(STORY_CLEAR_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveStoryClearMap(map) {
    try { localStorage.setItem(STORY_CLEAR_KEY, JSON.stringify(map || {})); } catch (_) {}
  }

  function isStoryStageCleared(stageId) {
    if (!stageId) return false;
    return !!getStoryClearMap()[stageId];
  }

  const SHOOTING_STAGE_RECORD_KEY = 'zeraphia_shooting_stage_records_v1';
  const SHOOTING_HIGH_SCORE_KEY = 'zeraphia_shooting_high_scores_v1';

  const STORY_RANK_ORDER = Object.freeze({ S:6, A:5, B:4, C:3, D:2, E:1, '':0 });

  function getBetterStoryRank(a, b) {
    const left = String(a || '').toUpperCase();
    const right = String(b || '').toUpperCase();
    return (STORY_RANK_ORDER[right] || 0) > (STORY_RANK_ORDER[left] || 0) ? right : left;
  }

  function getStoryShootingRecord(stageId) {
    const id = String(stageId || '');
    if (!id) return { cleared: false, bestRank: '', highScore: 0 };

    // shooting_core.js がロード済みなら共通APIを正として使う。
    if (typeof window.getShootingStageRecordSummary === 'function') {
      try {
        const record = window.getShootingStageRecordSummary(id) || {};
        const cleared = isStoryStageCleared(id) || !!record.cleared;
        const highScore = Math.max(0, Number(record.highScore || 0));
        const storedRank = String(record.bestRank || '').toUpperCase();
        const scoreRank = cleared && highScore > 0 ? getStoryRankFromScore(highScore) : '';
        return {
          cleared,
          bestRank: getBetterStoryRank(storedRank, scoreRank),
          highScore,
        };
      } catch (_) {}
    }

    // stage_select.js は shooting_event.js より先に読み込まれるため、
    // 初回表示だけは localStorage から同じキーを直接参照できるようにする。
    let records = {};
    let scores = {};
    try {
      records = JSON.parse(localStorage.getItem(SHOOTING_STAGE_RECORD_KEY) || '{}') || {};
    } catch (_) {}
    try {
      scores = JSON.parse(localStorage.getItem(SHOOTING_HIGH_SCORE_KEY) || '{}') || {};
    } catch (_) {}

    const raw = records[id] || {};
    const cleared = isStoryStageCleared(id) || !!raw.cleared;
    const highScore = Math.max(0, Number(raw.highScore || 0), Number(scores[id] || 0));
    const storedRank = String(raw.bestRank || '').toUpperCase();

    // 旧バージョンではクリア済み/ハイスコアだけ保存され、RANK自体は未保存だった。
    // クリア済みが確認できるステージに限り、既存HIGH SCOREから現在の閾値で復元する。
    const scoreRank = cleared && highScore > 0 ? getStoryRankFromScore(highScore) : '';
    const derivedRank = getBetterStoryRank(storedRank, scoreRank);

    // 復元できた場合は新しい記録領域にも移行して、次回以降は通常の保存値として扱う。
    if (derivedRank && derivedRank !== storedRank) {
      try {
        records[id] = {
          ...raw,
          cleared: true,
          bestRank: derivedRank,
          highScore,
        };
        localStorage.setItem(SHOOTING_STAGE_RECORD_KEY, JSON.stringify(records));
      } catch (_) {}
    }

    return {
      cleared,
      bestRank: derivedRank,
      highScore,
    };
  }

  function getStoryRankFromScore(score) {
    const value = Math.max(0, Number(score || 0));
    if (value >= 24000) return 'S';
    if (value >= 20000) return 'A';
    if (value >= 16000) return 'B';
    if (value >= 12000) return 'C';
    if (value >= 8000) return 'D';
    return 'E';
  }

  function formatStoryShootingScore(value) {
    const score = Math.max(0, Math.floor(Number(value || 0)));
    return score > 0 ? String(score).padStart(6, '0') : '------';
  }

  function buildStoryRecordHtml(record) {
    const rank = record.bestRank || '—';
    const rankClass = record.bestRank ? ` rank-${record.bestRank.toLowerCase()}` : ' rank-none';
    return `
      <div class="ss-stage-record" aria-label="ベスト記録">
        <div class="ss-stage-record-rank${rankClass}">
          <span>RANK</span><b>${rank}</b>
        </div>
        <div class="ss-stage-record-score">
          <span>HIGH SCORE</span><b>${formatStoryShootingScore(record.highScore)}</b>
        </div>
      </div>`;
  }


  // ============================================================
  // build833: ステージ選択 - 出現属性表示
  // 通常/BOSSとも「主に出現する属性」を最大2属性まで表示。
  // 属性限定バリア対象の雑魚属性は、出現比率に関係なく必ず上位2枠へ含める。
  // BOSSステージは別行でBOSS自身の属性も表示する。
  // ============================================================
  const STORY_ELEMENT_ICON = Object.freeze({
    neutral: 'images/type_neutral.webp',
    fire: 'images/type_fire.webp',
    aqua: 'images/type_aqua.webp',
    wood: 'images/type_wood.webp',
    dark: 'images/type_dark.webp',
    light: 'images/type_light.webp',
  });

  const STORY_ELEMENT_LABEL = Object.freeze({
    neutral: '無属性',
    fire: '火',
    aqua: '水',
    wood: '木',
    dark: '闇',
    light: '光',
  });

  function normalizeStoryElement(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'water') return 'aqua';
    if (STORY_ELEMENT_ICON[raw]) return raw;
    return 'neutral';
  }

  function getStoryEnemyDef(enemyId) {
    if (!enemyId || !window.ShootingEnemies) return null;
    try {
      if (typeof window.ShootingEnemies.getShootingEnemy === 'function') {
        return window.ShootingEnemies.getShootingEnemy(enemyId) || null;
      }
      return window.ShootingEnemies.SHOOTING_ENEMIES?.[String(enemyId)] || null;
    } catch (_) {
      return null;
    }
  }

  function getStoryEnemyElement(enemyId) {
    const def = getStoryEnemyDef(enemyId);
    return normalizeStoryElement(def && def.element);
  }

  function getStoryMainEnemyIds(stage) {
    if (!stage) return [];

    // 実際の固定出現順があるステージはenemySequenceを最優先。
    const sequence = stage.normalBattle && Array.isArray(stage.normalBattle.enemySequence)
      ? stage.normalBattle.enemySequence.filter(Boolean)
      : [];
    if (sequence.length) return sequence.slice();

    // BOSS戦で援軍定義がある場合は、援軍構成を「主に出現する属性」の母集団にする。
    const bossAdds = stage.bossAdds && Array.isArray(stage.bossAdds.enemyIds)
      ? stage.bossAdds.enemyIds.filter(Boolean)
      : [];
    if (stage.type === 'boss' && bossAdds.length) return bossAdds.slice();

    // 援軍がないBOSS戦はBOSS自身、通常戦は通常のenemyIdsを参照。
    return Array.isArray(stage.enemyIds) ? stage.enemyIds.filter(Boolean) : [];
  }

  function getStoryForcedBarrierElements(stage, mainEnemyIds) {
    if (!stage) return [];
    const ids = Array.isArray(mainEnemyIds) ? mainEnemyIds : [];
    const forced = [];

    // CH06等：指定属性の敵だけが「弱点属性以外無効」の対象。
    const guarded = stage.weaknessOnlyElement ? normalizeStoryElement(stage.weaknessOnlyElement) : '';
    if (guarded) {
      const hasGuardedNormalEnemy = ids.some(enemyId => {
        const def = getStoryEnemyDef(enemyId);
        return !!(def && def.kind !== 'boss' && normalizeStoryElement(def.element) === guarded);
      });
      if (hasGuardedNormalEnemy) forced.push(guarded);
    }

    // build834: DAILY上級はshooting_core側で、stage定義にフラグが無くても
    // 非neutral雑魚へ「弱点属性以外無効」バリアを付ける。表示側も同じ判定へ統一。
    const isDailyAdvanced = !!(
      (stage.dailyQuest && stage.dailyQuest.level === 'advanced') ||
      /^shooting_daily_[a-z]{3}_advanced$/i.test(String(stage.id || ''))
    );

    // 全属性バリア指定 / DAILY上級：対象になる雑魚属性は出現比率に関係なく必ず表示。
    if (stage.weaknessOnlyEnemies === true || isDailyAdvanced) {
      ids.forEach(enemyId => {
        const def = getStoryEnemyDef(enemyId);
        if (!def || def.kind === 'boss') return;
        const element = normalizeStoryElement(def.element);
        if (element !== 'neutral' && !forced.includes(element)) forced.push(element);
      });
    }

    return forced;
  }

  function getStoryMainElements(stage) {
    const ids = getStoryMainEnemyIds(stage);
    const counts = new Map();
    const firstSeen = new Map();

    ids.forEach((enemyId, index) => {
      const element = getStoryEnemyElement(enemyId);
      counts.set(element, (counts.get(element) || 0) + 1);
      if (!firstSeen.has(element)) firstSeen.set(element, index);
    });

    let ranked = Array.from(counts.keys()).sort((a, b) => {
      const countDiff = (counts.get(b) || 0) - (counts.get(a) || 0);
      if (countDiff) return countDiff;
      return (firstSeen.get(a) || 0) - (firstSeen.get(b) || 0);
    });

    const forced = getStoryForcedBarrierElements(stage, ids);
    const selected = [];

    // 通常は上位2属性。
    // ただし属性バリア対象属性は絶対表示し、バリア属性が3種以上ある場合だけ2枠を超えて表示する。
    forced.forEach(element => {
      if (!selected.includes(element)) selected.push(element);
    });
    ranked.forEach(element => {
      if (selected.includes(element)) return;
      if (selected.length >= Math.max(2, forced.length)) return;
      selected.push(element);
    });
    selected.sort((a, b) => {
      const countDiff = (counts.get(b) || 0) - (counts.get(a) || 0);
      if (countDiff) return countDiff;
      return (firstSeen.get(a) ?? Number.MAX_SAFE_INTEGER) - (firstSeen.get(b) ?? Number.MAX_SAFE_INTEGER);
    });

    // enemy data未定義の予約ステージでも空欄にはしない。
    if (!selected.length && Array.isArray(stage.enemyIds) && stage.enemyIds.length) {
      selected.push('neutral');
    }
    return selected;
  }

  function getStoryBossElement(stage) {
    if (!stage || stage.type !== 'boss') return '';
    if (stage.bossElement) return normalizeStoryElement(stage.bossElement);

    const ids = Array.isArray(stage.enemyIds) ? stage.enemyIds : [];
    for (const enemyId of ids) {
      const def = getStoryEnemyDef(enemyId);
      if (def && def.kind === 'boss') return normalizeStoryElement(def.element);
    }
    return ids.length ? getStoryEnemyElement(ids[0]) : 'neutral';
  }

  function buildStoryElementIcons(elements, iconClass = 'ss-stage-element-icon') {
    return (Array.isArray(elements) ? elements : []).map(element => {
      const key = normalizeStoryElement(element);
      const src = STORY_ELEMENT_ICON[key] || STORY_ELEMENT_ICON.neutral;
      const label = STORY_ELEMENT_LABEL[key] || STORY_ELEMENT_LABEL.neutral;
      return `<img class="${iconClass}" src="${src}" alt="${label}" title="${label}" draggable="false">`;
    }).join('');
  }

  function resolveStageAttributeStage(stageOrId) {
    if (stageOrId && typeof stageOrId === 'object') return stageOrId;
    const stageId = String(stageOrId || '');
    if (!stageId || !window.ShootingStages) return null;
    try {
      if (typeof window.ShootingStages.getShootingStage === 'function') {
        return window.ShootingStages.getShootingStage(stageId) || null;
      }
      return window.ShootingStages.SHOOTING_STAGES?.[stageId] || null;
    } catch (_) {
      return null;
    }
  }

  // build834: 全ステージ選択画面で使う共通属性プレビュー。
  // 今後ステージ選択UIを追加する場合も、このbuildHtml()を1行差し込めば同じ構成になる。
  function buildStageAttributePreviewHtml(stageOrId, classes = {}) {
    const stage = resolveStageAttributeStage(stageOrId);
    if (!stage) return '';

    const className = {
      root: classes.root || 'shooting-stage-elements',
      line: classes.line || 'shooting-stage-element-line',
      bossLine: classes.bossLine || 'shooting-stage-boss-element-line',
      label: classes.label || 'shooting-stage-element-label',
      icons: classes.icons || 'shooting-stage-element-icons',
      icon: classes.icon || 'shooting-stage-element-icon',
    };

    const mainElements = getStoryMainElements(stage);
    const bossElement = getStoryBossElement(stage);
    const mainIcons = buildStoryElementIcons(mainElements, className.icon);
    const bossHtml = stage.type === 'boss'
      ? `<div class="${className.line} ${className.bossLine}"><span class="${className.label}">BOSSの属性：</span><span class="${className.icons}">${buildStoryElementIcons([bossElement || 'neutral'], className.icon)}</span></div>`
      : '';

    return `
      <div class="${className.root}" aria-label="ステージ属性">
        <div class="${className.line}"><span class="${className.label}">主に出現する属性：</span><span class="${className.icons}">${mainIcons}</span></div>
        ${bossHtml}
      </div>`;
  }

  window.ShootingStageAttributePreview = Object.freeze({
    buildHtml: buildStageAttributePreviewHtml,
    getMainElements: getStoryMainElements,
    getBossElement: getStoryBossElement,
  });

  function buildStoryStageElementHtml(stage) {
    return buildStageAttributePreviewHtml(stage, {
      root: 'ss-stage-elements',
      line: 'ss-stage-element-line',
      bossLine: 'ss-stage-boss-element-line',
      label: 'ss-stage-element-label',
      icons: 'ss-stage-element-icons',
      icon: 'ss-stage-element-icon',
    });
  }

  function markStoryStageCleared(stageId) {
    if (!stageId) return;
    const map = getStoryClearMap();
    if (map[stageId]) return;
    map[stageId] = true;
    saveStoryClearMap(map);
    renderStoryChapterList();
  }

  function getStoryStages(chapter, mode = 'normal') {
    if (!window.ShootingStages || typeof window.ShootingStages.getShootingStagesByChapter !== 'function') {
      return [];
    }
    if (mode === 'beginner' && typeof window.ShootingStages.getBeginnerShootingStagesByChapter === 'function') {
      return window.ShootingStages.getBeginnerShootingStagesByChapter(Number(chapter)) || [];
    }
    return window.ShootingStages.getShootingStagesByChapter(Number(chapter)) || [];
  }

  function isShootingStoryStageUnlocked(stage, mode = 'normal') {
    if (!stage) return false;
    const chapterStages = getStoryStages(stage.chapter, mode);
    const index = chapterStages.findIndex(s => s && s.id === stage.id);
    if (index <= 0) return true;
    const prev = chapterStages[index - 1];
    if (!prev) return false;

    if (isStoryStageCleared(prev.id)) return true;

    // 過去版でNORMALのCLEARがbaseStageId側に保存された端末を救済する。
    if (mode === 'beginner' && prev.baseStageId && isStoryStageCleared(prev.baseStageId)) return true;

    return false;
  }

  function isStoryChapterCleared(chapter, mode = 'normal') {
    const stages = getStoryStages(chapter, mode).filter(s => s && s.chapter === chapter && s.type !== 'debug');
    return stages.length > 0 && stages.every(s => isStoryStageCleared(s.id));
  }

  function isStoryChapterUnlocked(chapter, mode = 'normal') {
    chapter = Number(chapter);
    if (chapter < STORY_CHAPTER_MIN || chapter > STORY_CHAPTER_MAX) return false;

    // CHAPTER 01 はゲーム開始時から常時解放。
    // iPhone では shooting_event.js → ShootingStages の初期化が遅れることがあり、
    // 先に getStoryStages(1) を確認すると一瞬だけ空配列になって「???」表示になる。
    // ステージマスターのロード状態には依存させない。
    if (chapter === STORY_CHAPTER_MIN) return true;

    const currentStages = getStoryStages(chapter, mode);
    if (!currentStages.length) return false;

    return isStoryChapterCleared(chapter - 1, mode);
  }

  function showStoryLockedMessage() {
    if (typeof showToast === 'function') {
      showToast('解放されていません');
    } else {
      alert('解放されていません');
    }
  }

  function renderStoryChapterList(mode = 'normal') {
    const beginner = mode === 'beginner';
    const list = document.getElementById(beginner ? 'story-beginner-chapter-list' : 'story-chapter-list');
    if (!list) return;
    list.innerHTML = '';

    for (let chapter = STORY_CHAPTER_MIN; chapter <= STORY_CHAPTER_MAX; chapter++) {
      const unlocked = isStoryChapterUnlocked(chapter, mode);
      const item = document.createElement('div');
      item.className = 'ninmu-chapter-item story-chapter-item' + (unlocked ? '' : ' story-chapter-locked');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', unlocked
        ? `CHAPTER ${String(chapter).padStart(2, '0')} ${STORY_CHAPTER_TITLES[chapter] || '未定'}`
        : `CHAPTER ${String(chapter).padStart(2, '0')} 未解放`);

      item.innerHTML =
        '<div class="ninmu-chapter-label">CHAPTER:' + String(chapter).padStart(2, '0') + '</div>' +
        '<div class="ninmu-chapter-title">' + (unlocked ? (STORY_CHAPTER_TITLES[chapter] || '未定') : '???') + '</div>';

      item.addEventListener('click', () => {
        if (!isStoryChapterUnlocked(chapter, mode)) {
          showStoryLockedMessage();
          return;
        }
        window.openStageSelect(chapter, mode);
      });
      list.appendChild(item);
    }
  }

  window.renderStoryChapterList = renderStoryChapterList;
  window.isStoryChapterUnlocked = isStoryChapterUnlocked;
  window.isStoryChapterCleared = isStoryChapterCleared;
  window.markStoryStageCleared = markStoryStageCleared;

  // shooting_event.js 内部モジュールは非同期ロード。
  // iPhone / PWA では初期化が5秒以上遅れるケースもあるため、
  // 固定50回で監視を打ち切らず、ShootingStages が利用可能になるまで再描画を待つ。
  let storyMasterWatchTimer = 0;

  function refreshStoryChapterListWhenReady() {
    // CHAPTER 01 は ShootingStages 未ロードでも正しく表示できるので、まず即描画。
    renderStoryChapterList('normal');
    renderStoryChapterList('beginner');

    if (window.ShootingStages) {
      if (storyMasterWatchTimer) {
        clearInterval(storyMasterWatchTimer);
        storyMasterWatchTimer = 0;
      }
      // ステージ情報が揃った状態でもう一度描画し、CHAPTER 02以降も最新化。
      renderStoryChapterList('normal');
      renderStoryChapterList('beginner');
      return;
    }

    if (storyMasterWatchTimer) return;

    storyMasterWatchTimer = setInterval(() => {
      if (!window.ShootingStages) return;
      clearInterval(storyMasterWatchTimer);
      storyMasterWatchTimer = 0;
      renderStoryChapterList('normal');
      renderStoryChapterList('beginner');
    }, 250);
  }

  // Storyタブを開いた時やSafari/PWAへ復帰した時にも必ず最新状態へ更新。
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshStoryChapterListWhenReady);
  } else {
    setTimeout(refreshStoryChapterListWhenReady, 0);
  }

  window.addEventListener('pageshow', refreshStoryChapterListWhenReady);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshStoryChapterListWhenReady();
  });

  const DIFFICULTY_LABEL = {
    easy:      'EASY',
    normal:    'NORMAL',
    hard:      'HARD',
    boss:      'BOSS',
    debug:     'DEBUG',
    roguelite: 'ROGUELITE',  // ← 追加
  };

  const DIFFICULTY_COLOR = {
    easy:      'rgba(100,200,140,.85)',
    normal:    'rgba(200,180,80,.85)',
    hard:      'rgba(200,90,60,.85)',
    boss:      'rgba(180,60,180,.85)',
    debug:     'rgba(100,180,255,.85)',
    roguelite: 'rgba(140,80,255,.85)',  // ← 追加
  };

  // ============================================================
  // モーダル構築
  // ============================================================
  function buildModal() {
    if (document.getElementById('stage-select-modal')) return;

    const el = document.createElement('div');
    el.id = 'stage-select-modal';
    el.style.cssText = [
      'position:fixed',
      'top:var(--header-h,82px)', 'right:0',
      'bottom:var(--bottom-nav-h,76px)', 'left:0',
      'z-index:200',
      'display:none', 'flex-direction:column',
      'background:transparent', 'color:#4b4640',
      'font-family:"Noto Serif JP",serif',
      'opacity:0', 'transition:opacity 0.35s ease',
    ].join(';');

    el.innerHTML = `
      <div class="ss-header">
        <button class="ss-back-btn" onclick="closeStageSelect()">＜戻る</button>
        <div class="ss-title" id="ss-title">討伐任務</div>
        <div class="ss-spacer"></div>
      </div>
      <div class="ss-list-wrap">
        <div class="ss-list" id="ss-list"></div>
      </div>
    `;

    document.body.appendChild(el);
    injectStyle();
  }

  // ============================================================
  // CSS
  // ============================================================
  function injectStyle() {
    if (document.getElementById('stage-select-style')) return;
    const s = document.createElement('style');
    s.id = 'stage-select-style';
    s.textContent = `
      #stage-select-modal{
        position:fixed !important;
        top:var(--header-h,72px) !important;
        right:0 !important;
        bottom:var(--bottom-nav-h,76px) !important;
        left:0 !important;
        z-index:200 !important;
        display:none;
        flex-direction:column;
        overflow:hidden !important;
        background-color:#f6f1e6 !important;
        background-image:
          linear-gradient(rgba(255,253,247,.14),rgba(255,253,247,.14)),
          url("images/zeraphia_bg_01.webp") !important;
        background-repeat:no-repeat !important;
        background-position:center center !important;
        background-size:cover !important;
        color:#4b4640 !important;
        font-family:"Noto Serif JP","Yu Mincho","YuMincho","Hiragino Mincho ProN",serif !important;
      }
      #stage-select-modal::before{
        content:"";
        position:absolute;
        inset:0;
        pointer-events:none;
        background:linear-gradient(180deg,
          rgba(255,255,255,.18) 0%,
          rgba(255,255,255,.04) 42%,
          rgba(244,238,226,.12) 100%);
      }
      .ss-header {
        position:relative;
        z-index:2;
        flex:0 0 var(--app-page-header-h,52px);
        width:100%;
        height:var(--app-page-header-h,52px);
        min-height:var(--app-page-header-h,52px);
        box-sizing:border-box;
        margin:0;
        padding:0 var(--app-page-side,18px);
        display:flex;
        align-items:center;
        justify-content:center;
        border:0;
        background:transparent;
        box-shadow:none;
        isolation:isolate;
        gap:0;
      }
      .ss-header::after{
        content:"";
        position:absolute;
        z-index:-1;
        pointer-events:none;
        left:-6%;
        right:-6%;
        top:22%;
        height:78px;
        background:linear-gradient(to bottom,
          rgba(255,255,255,.82) 0%,
          rgba(255,255,255,.66) 34%,
          rgba(255,255,255,.35) 66%,
          rgba(255,255,255,0) 100%);
        filter:blur(10px);
        -webkit-filter:blur(10px);
      }
      .ss-back-btn {
        position:absolute;
        left:var(--app-page-side,18px);
        top:50%;
        transform:translateY(-50%);
        display:inline-flex;
        align-items:center;
        justify-content:flex-start;
        min-width:52px;
        width:auto;
        height:44px;
        margin:0;
        padding:0;
        border:0;
        border-radius:0;
        background:transparent;
        box-shadow:none;
        color:var(--app-back-color,#837361);
        font-family:"Noto Serif JP","Yu Mincho","YuMincho","Hiragino Mincho ProN",serif;
        font-size:var(--app-back-size,11px);
        font-weight:500;
        line-height:1;
        letter-spacing:.015em;
        text-shadow:0 0 8px rgba(255,255,255,.80);
        cursor:pointer;
      }
      .ss-back-btn:active { opacity:.58; transform:translateY(-50%); }
      .ss-title {
        position:static;
        width:auto;
        max-width:calc(100% - 150px);
        margin:0;
        padding:0;
        color:#6f5535;
        font-family:"Noto Serif JP","Yu Mincho","YuMincho","Hiragino Mincho ProN",serif;
        font-size:15px;
        font-weight:500;
        font-style:normal;
        line-height:1;
        letter-spacing:.12em;
        text-indent:.12em;
        text-align:center;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        text-shadow:0 0 9px rgba(255,255,255,.72);
        pointer-events:none;
      }
      /* build843: STORY chapter header must use the exact canonical selector.
         Do not allow older page/selector typography to recolor or re-font CHAPTER xx. */
      html body:not(.ui-immersive) #stage-select-modal .ss-header #ss-title{
        color:#6f5535 !important;
        font-family:"Noto Serif JP","Yu Mincho","YuMincho","Hiragino Mincho ProN",serif !important;
        font-size:15px !important;
        font-weight:500 !important;
        font-style:normal !important;
        line-height:1 !important;
        letter-spacing:.12em !important;
        text-indent:.12em !important;
        text-align:center !important;
        text-shadow:0 0 9px rgba(255,255,255,.72) !important;
        -webkit-text-fill-color:#6f5535 !important;
        opacity:1 !important;
        filter:none !important;
      }
      .ss-spacer { display:none; }
      .ss-list-wrap {
        position:relative;
        z-index:1;
        flex:1 1 auto;
        min-height:0;
        overflow-y:auto;
        -webkit-overflow-scrolling:touch;
        padding:0 0 calc(18px + env(safe-area-inset-bottom, 0px));
        scrollbar-width:none;
        background:transparent;
      }
      .ss-list-wrap::-webkit-scrollbar { display:none; }
      .ss-list { display:flex; flex-direction:column; gap:0; }
      .ss-card {
        position:relative;
        display:grid;
        grid-template-columns:28px minmax(0,1fr) minmax(86px, auto) 12px;
        align-items:center;
        gap:12px;
        width:100%;
        min-height:118px;
        padding:14px 16px 14px 15px;
        border:0;
        border-bottom:1px solid rgba(173,157,127,.24);
        border-top:1px solid rgba(255,255,255,.42);
        border-radius:0;
        background:linear-gradient(180deg, rgba(255,253,248,.32), rgba(255,252,247,.12));
        box-shadow:none;
        text-align:left;
        cursor:pointer;
        -webkit-tap-highlight-color:transparent;
        transition:background .12s ease, transform .12s ease;
        overflow:hidden;
      }
      .ss-card::before{
        content:"";
        position:absolute;
        inset:0;
        pointer-events:none;
        background:linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,0) 48%);
        opacity:.55;
      }
      .ss-card:active { transform:translateY(1px); background:linear-gradient(180deg, rgba(255,253,248,.40), rgba(255,252,247,.18)); }
      .ss-card.locked { opacity:.58; }
      .ss-card-no {
        position:relative;
        z-index:1;
        width:28px;
        min-width:28px;
        align-self:flex-start;
        padding:6px 0 0;
        font-family:"Cinzel","Times New Roman",serif;
        font-size:8px;
        font-weight:500;
        line-height:1;
        letter-spacing:.18em;
        color:#a3834e;
      }
      .ss-card-body {
        position:relative;
        z-index:1;
        min-width:0;
        display:flex;
        flex-direction:column;
        gap:4px;
        padding-right:4px;
      }
      .ss-card-name-row {
        display:flex;
        align-items:baseline;
        gap:8px;
        min-width:0;
      }
      .ss-card-name {
        color:#443827;
        font-family:"Noto Serif JP","Yu Mincho","YuMincho","Hiragino Mincho ProN",serif;
        font-size:15px;
        font-weight:400;
        line-height:1.35;
        letter-spacing:.06em;
        text-shadow:none;
      }
      .ss-story-clear {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        vertical-align:baseline;
        margin-left:6px;
        padding:1px 6px 0;
        border:1px solid rgba(195,170,116,.72);
        background:rgba(255,249,235,.74);
        color:#9a7a43;
        font-family:"Cinzel","Noto Serif JP",serif;
        font-size:8px;
        font-weight:600;
        letter-spacing:.15em;
        line-height:1.45;
      }
      .ss-card-meta {
        display:flex;
        align-items:flex-start;
        gap:8px;
      }
      .ss-card-enemy {
        color:#776a58;
        font-family:"Noto Serif JP","Yu Mincho","YuMincho","Hiragino Mincho ProN",serif;
        font-size:8px;
        line-height:1.55;
        letter-spacing:.08em;
      }
      .ss-stage-elements { margin-top:2px; }
      .ss-stage-element-line {
        display:flex;
        align-items:center;
        gap:6px;
        margin-top:3px;
        min-width:0;
      }
      .ss-stage-element-label {
        flex:0 0 auto;
        color:#a29076;
        font-size:7px;
        line-height:1.45;
        letter-spacing:.08em;
      }
      .ss-stage-element-icons {
        display:inline-flex;
        align-items:center;
        gap:4px;
        min-width:0;
        flex-wrap:wrap;
      }
      .ss-stage-element-icon {
        width:18px;
        height:18px;
        object-fit:contain;
        filter:drop-shadow(0 0 2px rgba(255,255,255,.45));
      }
      .ss-stage-boss-element-line .ss-stage-element-label { color:#9a8660; }
      .ss-stage-record {
        position:relative;
        z-index:1;
        min-width:84px;
        align-self:stretch;
        display:flex;
        flex-direction:column;
        justify-content:center;
        gap:8px;
        padding-right:2px;
        text-align:right;
      }
      .ss-stage-record-rank,
      .ss-stage-record-score {
        display:flex;
        flex-direction:column;
        gap:2px;
      }
      .ss-stage-record-rank span,
      .ss-stage-record-score span {
        color:#c1b29a;
        font-family:"Cinzel","Times New Roman",serif;
        font-size:7px;
        font-weight:500;
        letter-spacing:.14em;
        line-height:1;
      }
      .ss-stage-record-rank b {
        color:#b18741;
        font-family:"Cinzel","Times New Roman",serif;
        font-size:24px;
        font-weight:500;
        line-height:1;
        letter-spacing:.04em;
      }
      .ss-stage-record-rank.rank-s b { color:#b6883f; }
      .ss-stage-record-rank.rank-a b { color:#b48a45; }
      .ss-stage-record-rank.rank-b b { color:#9a8353; }
      .ss-stage-record-rank.rank-c b,
      .ss-stage-record-rank.rank-d b,
      .ss-stage-record-rank.rank-e b,
      .ss-stage-record-rank.rank-none b { color:#c9bdab; }
      .ss-stage-record-score b {
        color:#b0a189;
        font-family:"Cinzel","Times New Roman",serif;
        font-size:10px;
        font-weight:500;
        line-height:1;
        letter-spacing:.12em;
      }
      .ss-card-arrow,
      .ss-lock-icon {
        position:relative;
        z-index:1;
        align-self:center;
        justify-self:end;
        color:rgba(181,165,136,.82);
        font-size:16px;
        line-height:1;
      }
      .ss-lock-icon { font-size:12px; }
      .ss-roguelite-preparing {
        min-height:52vh;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        padding:48px 24px;
        text-align:center;
      }
      .ss-roguelite-preparing-en {
        font-family:"Cinzel",serif;
        font-size:11px;
        letter-spacing:.32em;
        color:rgba(150,130,98,.42);
        margin-bottom:18px;
      }
      .ss-roguelite-preparing-main {
        font-size:15px;
        letter-spacing:.12em;
        color:rgba(76,63,46,.82);
      }
      .ss-roguelite-preparing-sub {
        margin-top:10px;
        font-size:11px;
        letter-spacing:.08em;
        color:rgba(118,104,82,.56);
      }
      @media (min-width:500px){
        #stage-select-modal{
          left:50% !important;
          right:auto !important;
          width:100% !important;
          max-width:430px !important;
          transform:translateX(-50%) !important;
        }
      }
      @media (max-width:380px),(max-height:700px){
        .ss-header{
          flex-basis:var(--app-page-header-h,50px);
          height:var(--app-page-header-h,50px);
          min-height:var(--app-page-header-h,50px);
          padding-left:var(--app-page-side,14px);
          padding-right:var(--app-page-side,14px);
        }
        .ss-back-btn{ left:var(--app-page-side,14px); }
        .ss-list-wrap{ padding-bottom:calc(14px + env(safe-area-inset-bottom, 0px)); }
        .ss-card{
          min-height:110px;
          grid-template-columns:26px minmax(0,1fr) minmax(80px, auto) 10px;
          gap:10px;
          padding:13px 12px 13px 13px;
        }
        .ss-card-name{ font-size:14px; }
        .ss-stage-record{ min-width:78px; }
        .ss-stage-record-rank b{ font-size:22px; }
        .ss-stage-record-score b{ font-size:9px; }
      }
    `;
    document.body.appendChild(s);
  }

  // ============================================================
  // リスト描画
  // ============================================================
  function renderList(chapter, mode = 'normal') {
    const list = document.getElementById('ss-list');
    if (!list) return;
    list.innerHTML = '';

    // ============================================================
    // STORY = SHOOTING
    // ============================================================
    if (typeof chapter === 'number' && chapter >= STORY_CHAPTER_MIN && chapter <= STORY_CHAPTER_MAX) {
      if (!window.ShootingStages) {
        list.innerHTML = '<div style="text-align:center;color:rgba(117,103,81,.58);font-size:12px;padding:42px 0;letter-spacing:2px;">SHOOTING DATA LOADING...</div>';
        setTimeout(() => {
          const modal = document.getElementById('stage-select-modal');
          if (modal && modal.style.display !== 'none') renderList(chapter, mode);
        }, 120);
        return;
      }

      const stages = getStoryStages(chapter, mode);
      if (!stages.length) {
        list.innerHTML = '<div style="text-align:center;color:rgba(117,103,81,.48);font-size:13px;padding:40px 0;letter-spacing:2px;">準備中</div>';
        return;
      }

      stages.forEach(stageDef => {
        const unlocked = isShootingStoryStageUnlocked(stageDef, mode);
        const record = getStoryShootingRecord(stageDef.id);
        const cleared = record.cleared;
        const isBoss = stageDef.type === 'boss';
        const missionText = stageDef.mission?.text || (isBoss ? 'BOSSを撃破' : '敵を撃破');

        const card = document.createElement('div');
        card.className = 'ss-card ss-story-shooting-card' + (unlocked ? '' : ' locked');
        if (cleared) card.classList.add('story-cleared');

        const stageNo = Number(stageDef.stageNo || stageDef.no || 0);
        const displayStageName = 'ステージ' + stageNo;
        const displayCondition =
          STORY_STAGE_CONDITIONS[stageDef.id] ||
          STORY_STAGE_CONDITIONS[stageDef.baseStageId] ||
          missionText;

        card.innerHTML = `
          <div class="ss-card-no">${String(stageNo).padStart(2, '0')}</div>
          <div class="ss-card-body">
            <div class="ss-card-name-row">
              <div class="ss-card-name">${displayStageName}${cleared ? '　<span class="ss-story-clear" aria-label="クリア済み">CLEAR</span>' : ''}</div>
            </div>
            <div class="ss-card-meta">
              <div class="ss-card-enemy">クリア条件：${displayCondition}</div>
            </div>
            ${buildStoryStageElementHtml(stageDef)}
          </div>
          ${buildStoryRecordHtml(record)}
          ${unlocked ? '<div class="ss-card-arrow">›</div>' : '<div class="ss-lock-icon">🔒</div>'}
        `;

        if (unlocked) card.onclick = () => onShootingStoryStageTap(stageDef, mode);
        list.appendChild(card);
      });
      return;
    }


    // build476: STORY SHOOTING以外の旧ゲームモードは廃止。
    list.innerHTML = '<div style="text-align:center;color:rgba(95,82,63,.46);font-size:12px;padding:40px 0;letter-spacing:2px;">準備中</div>';
    return;
  }

  window.addEventListener('shooting-stage-record-updated', () => {
    const modal = document.getElementById('stage-select-modal');
    if (!modal || modal.style.display === 'none') return;
    const chapter = Number(modal.dataset.chapter || 0);
    const mode = modal.dataset.storyMode === 'beginner' ? 'beginner' : 'normal';
    if (chapter >= STORY_CHAPTER_MIN && chapter <= STORY_CHAPTER_MAX) renderList(chapter, mode);
  });

  // ============================================================
  // STORY（SHOOTING）ステージ選択
  // ============================================================
  function onShootingStoryStageTap(stage, mode = 'normal') {
    if (!stage || !stage.id) return;

    // STORY → 編成画面は中間画面を1フレームも見せず直結する。
    // 旧実装は closeStageSelect() の350msフェード中に背面の「巡行」が露出していた。
    const openStageDirect = () => {
      const modal = document.getElementById('stage-select-modal');
      if (modal) {
        modal.style.transition = 'none';
        modal.style.opacity = '0';
        modal.style.display = 'none';
      }
      // closeStageSelect() は呼ばない。nav/HUDの復帰を挟まず、
      // 同じJSタスク内でshooting側がそのまま表示制御を引き継ぐ。
      // 編成画面/結果画面から「戻る」を押した時に、直前のCHAPTER一覧へ戻せるよう
      // 呼び出し元CHAPTERを明示的に保持する。
      window.__shootingReturnContext = {
        type: 'storyChapter',
        chapter: Number(stage.chapter || 1),
        mode: mode === 'beginner' ? 'beginner' : 'normal',
      };
      window.openShootingStage(stage.id);
    };

    if (typeof window.openShootingStage === 'function') {
      openStageDirect();
      return;
    }

    // モジュールがまだ準備中なら、ステージ選択画面を残したまま待つ。
    // 準備できた瞬間に直接切り替えるため、巡行トップは露出しない。
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (typeof window.openShootingStage === 'function') {
        clearInterval(timer);
        openStageDirect();
      } else if (tries >= 30) {
        clearInterval(timer);
        alert('シューティングモジュールを読み込めませんでした');
      }
    }, 100);
  }

  // ============================================================
  // 開閉
  // ============================================================
  window.openStageSelect = function (chapter, mode = 'normal') {
  chapter = Number(chapter || 1);
  if(!Number.isFinite(chapter)) chapter = 1;

  if (typeof chapter === 'number' && chapter >= STORY_CHAPTER_MIN && chapter <= STORY_CHAPTER_MAX && !isStoryChapterUnlocked(chapter, mode)) {
    showStoryLockedMessage();
    return;
  }

  buildModal();

    const el = document.getElementById('stage-select-modal');
    const title = document.getElementById('ss-title');
    if (title) {
      title.textContent = 'CHAPTER ' + String(chapter).padStart(2, '0');
    }

    renderList(chapter, mode);
    el.dataset.chapter = String(chapter);
    el.dataset.storyMode = mode === 'beginner' ? 'beginner' : 'normal';

    el.style.display = 'flex';
    void el.offsetWidth;
    el.style.opacity = '1';

// build468:
// ステージ選択画面までは共通の上部ユーザーフレームとボトムナビを残す。
// 実際の戦闘画面へ遷移するまでは、ここで共有UIを隠さない。
const nav = document.getElementById('bottom-nav-shared');
if (nav) nav.style.display = '';

const guf = document.getElementById('global-user-frame');
if (guf) {
  guf.classList.remove('hidden');
  guf.style.display = '';
}
  };

  window.closeStageSelect = function () {
    const el = document.getElementById('stage-select-modal');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.display = 'none';
      // ボトムナビを戻す
      const nav = document.getElementById('bottom-nav-shared');
      if (nav) nav.style.display = '';
      const guf = document.getElementById('global-user-frame');
      if (guf) guf.style.display = '';
    }, 350);
  };


  // ============================================================
  // STORY CLEAR AUTO RECORD — SHOOTING
  // ============================================================
  window.addEventListener('shooting-stage-result', function (event) {
    const detail = event && event.detail ? event.detail : {};
    if (!detail.win || !detail.stageId) return;

    markStoryStageCleared(String(detail.stageId));
    renderStoryChapterList('normal');
    renderStoryChapterList('beginner');

    // RESULT後にステージ選択DOMが残っている場合も即再描画し、
    // 直前ステージのCLEARを次ステージの解放状態へ反映する。
    const modal = document.getElementById('stage-select-modal');
    if (modal) {
      const chapter = Number(modal.dataset.chapter || 0);
      const mode = modal.dataset.storyMode === 'beginner' ? 'beginner' : 'normal';
      if (chapter >= STORY_CHAPTER_MIN && chapter <= STORY_CHAPTER_MAX) {
        renderList(chapter, mode);
      }
    }
  });


})();
