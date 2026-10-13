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
  // チャプター名は shooting_stages.js の SHOOTING_CHAPTER_TITLES で一元管理。
  function getStoryChapterTitle(chapter) {
    const titles = window.ShootingStages && window.ShootingStages.SHOOTING_CHAPTER_TITLES;
    return (titles && titles[chapter]) || '未定';
  }


  // クリア条件は shooting_stages.js の各ステージ mission.text を表示する。


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
        return {
          cleared,
          bestRank: storedRank || (cleared && highScore > 0 ? getStoryRankFromScore(highScore) : ''),
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
    const derivedRank = storedRank || (cleared && highScore > 0 ? getStoryRankFromScore(highScore) : '');

    // 復元できた場合は新しい記録領域にも移行して、次回以降は通常の保存値として扱う。
    if (!storedRank && derivedRank) {
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
      <div class="zss-record" aria-label="ベスト記録">
        <div class="zss-record-rank${rankClass}">
          <span>RANK</span><b>${rank}</b>
        </div>
        <div class="zss-record-score">
          <span>HIGH SCORE</span><b>${formatStoryShootingScore(record.highScore)}</b>
        </div>
      </div>`;
  }

  function escapeStageSelectHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch] || ch;
    });
  }

  // CHAPTER報酬欄: 通常 / 初回のみ / Sランク を分離する。
  // shinju_aura（神樹の栄養）はCHAPTERの報酬プレビューに掲載しない。
  // 表示は既存の報酬データの案内で、報酬付与処理自体は変更しない。
  function getStoryStageRewardPreview(stageDef, mode = 'normal') {
    const chapter = Math.max(1, Math.floor(Number(stageDef && stageDef.chapter || 1)));
    const stageNo = Math.max(1, Math.floor(Number(stageDef && (stageDef.stageNo || stageDef.no) || 1)));
    const gold = Math.max(500, chapter * 350 + stageNo * 150);
    const rewards = [
      { name:'ゴールド', image:'images/icon_coin.webp', amount:'×' + gold.toLocaleString('ja-JP') }
    ];

    // 通常報酬の代表例。CH01-03のレムナントの残骸はミッション回収物であり、
    // クリア報酬ではないため、CH01全ステージは共鳴石(5%ドロップ)を表示する。
    if (chapter >= 2 && stageNo >= 3) {
      rewards.push(
        stageNo >= 4
          ? { name:'強化素材・金', image:'images/item_exp_gold.webp', amount:'×1' }
          : { name:'強化素材・銀', image:'images/item_exp_silver.webp', amount:'×1' }
      );
    } else {
      rewards.push({ name:'共鳴石', image:'images/item_kyoumeistone.webp', amount:'×1' });
    }

    return rewards.filter(item => !/shinju_aura\.webp/i.test(item.image || '')).slice(0, 2);
  }

  function buildStoryRewardChip(item, slot) {
    // 1アイテム＝1フレーム。通常報酬は左の1・2枠を使う。
    return '<span class="zss-reward-chip zss-reward-normal-item zss-reward-slot-' + slot + '" title="' + escapeStageSelectHtml(item.name) + '">' +
      '<span class="zss-reward-icon"><img src="' + escapeStageSelectHtml(item.image) + '" alt="' + escapeStageSelectHtml(item.name) + '"></span>' +
      '<span class="zss-reward-count">' + escapeStageSelectHtml(item.amount || '') + '</span>' +
    '</span>';
  }

  function isStoryMemoryFragmentChapter(chapter) {
    return [4,7,10,13,16,19,22,25,28,30].includes(Number(chapter));
  }

  function getStoryBonusRewardItems(stageDef, mode, category) {
    const chapter = Math.max(1, Math.floor(Number(stageDef && stageDef.chapter || 1)));
    const stageNo = Math.max(1, Math.floor(Number(stageDef && (stageDef.stageNo || stageDef.no) || 1)));
    const isChapterFinal = mode === 'normal' && stageNo === 4;

    if (category === 'first') {
      // STORY初回クリア時: 結晶5個。章末は章クリア報酬を別フレームに表示。
      const items = [{ name:'初回クリア：結晶 ×5', image:'images/icon_gem.webp', amount:'×5' }];
      if (isChapterFinal) items.push({ name:'章クリア：記憶の欠片 ×1', image:'images/item_memory.webp', amount:'×1' });
      return items;
    }
    // 現行実装で独立したSランク報酬が存在するのは、対象章の最終ステージのみ。
    if (category === 's' && isChapterFinal && isStoryMemoryFragmentChapter(chapter)) {
      return [{ name:'Sランククリア：記憶の欠片 ×1', image:'images/item_memory.webp' }];
    }
    return [];
  }

  function buildStoryBonusRewardHtml(stageDef, mode, category) {
    const isFirst = category === 'first';
    const items = getStoryBonusRewardItems(stageDef, mode, category).slice(0, isFirst ? 2 : 1);
    const label = isFirst ? '初回のみ' : 'Sランク';
    const itemClass = isFirst ? 'zss-reward-first' : 'zss-reward-s';
    // 右寄せ5枠構成: [通常][通常][初回][初回][S]
    // 初回が1個のときは4枠目を使い、3枠目を空けて位置がずれないようにする。
    if (!items.length && !isFirst) {
      return '<span class="zss-reward-chip zss-reward-bonus zss-reward-s zss-reward-slot-5" title="Sランク限定報酬なし">' +
        '<span class="zss-reward-icon"><span class="zss-reward-unavailable" aria-label="Sランク限定報酬なし">—</span></span>' +
        '<span class="zss-reward-tag">Sランク</span></span>';
    }
    return items.map(function(item, index) {
      const slot = isFirst ? (items.length === 1 ? 4 : index + 3) : 5;
      return '<span class="zss-reward-chip zss-reward-bonus ' + itemClass + ' zss-reward-slot-' + slot + '" title="' + escapeStageSelectHtml(item.name) + '">' +
        '<span class="zss-reward-icon"><img src="' + escapeStageSelectHtml(item.image) + '" alt="' + escapeStageSelectHtml(item.name) + '"></span>' +
        (isFirst && item.amount ? '<span class="zss-reward-first-count">' + escapeStageSelectHtml(item.amount) + '</span>' : '') +
        '<span class="zss-reward-tag">' + label + '</span>' +
      '</span>';
    }).join('');
  }

  function buildStoryRewardPreviewHtml(stageDef, mode = 'normal') {
    const normal = getStoryStageRewardPreview(stageDef, mode).slice(0,2).map(function(item, index){
      return buildStoryRewardChip(item, index + 1);
    }).join('');
    return normal + buildStoryBonusRewardHtml(stageDef, mode, 'first') + buildStoryBonusRewardHtml(stageDef, mode, 's');
  }

  function buildStoryGimmickHtml(stageDef) {
    let gimmicks = [];
    try {
      if (typeof window.getShootingStageGimmickInfo === 'function') gimmicks = window.getShootingStageGimmickInfo(stageDef) || [];
    } catch (_) {}
    if (!Array.isArray(gimmicks) || !gimmicks.length) {
      return '<span class="zss-gimmick-chip is-none"><b>なし</b></span>';
    }
    return gimmicks.map(function(item){
      const label = escapeStageSelectHtml(item && item.label ? item.label : '');
      let extra = '';
      if (Array.isArray(item && item.elements) && item.elements.length) {
        extra += '<span class="zss-gimmick-elements">' + item.elements.map(function(elementId){
          const safe = String(elementId || '').toLowerCase();
          return '<img src="images/type_' + escapeStageSelectHtml(safe) + '.webp" alt="' + escapeStageSelectHtml(safe) + '">';
        }).join('') + '</span>';
      }
      if (item && item.id === 'timeLimit' && Number(item.seconds || 0) > 0) {
        extra += '<small>' + escapeStageSelectHtml(String(item.seconds) + '秒') + '</small>';
      }
      return '<span class="zss-gimmick-chip gimmick-' + escapeStageSelectHtml(item && item.id ? item.id : 'etc') + '"><b>' + label + '</b>' + extra + '</span>';
    }).join('');
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
        ? `CHAPTER ${String(chapter).padStart(2, '0')} ${getStoryChapterTitle(chapter)}`
        : `CHAPTER ${String(chapter).padStart(2, '0')} 未解放`);

      item.innerHTML =
        '<div class="ninmu-chapter-label">CHAPTER:' + String(chapter).padStart(2, '0') + '</div>' +
        '<div class="ninmu-chapter-title">' + (unlocked ? (getStoryChapterTitle(chapter)) : '???') + '</div>';

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

  // build1384: CHAPTER選択中は巡行トップの前景だけを消し、背景は維持する。
  // ステージ選択モーダルは body 直下なので、親画面の background をそのまま使える。
  let stageSelectCloseTimer = null;
  function setQuestForegroundHidden(hidden) {
    const quest = document.getElementById('screen-ninmu');
    if (quest) quest.classList.toggle('story-stage-select-open', !!hidden);
  }
  function cancelStageSelectClose() {
    if (stageSelectCloseTimer !== null) {
      clearTimeout(stageSelectCloseTimer);
      stageSelectCloseTimer = null;
    }
  }

  // ============================================================
  // モーダル構築
  // ============================================================
  function buildModal() {
    if (document.getElementById('stage-select-modal')) return;

    const el = document.createElement('div');
    el.id = 'stage-select-modal'; // Existing game event handlers depend on this ID.
    el.className = 'zss-root'; // Completely separate presentation namespace.
    el.style.display = 'none';
    el.style.opacity = '0';
    el.style.transition = 'opacity .24s ease';
    el.innerHTML = `
      <div class="zss-shell">
        <header class="zss-page-head">
          <button class="zss-back" type="button" onclick="closeStageSelect()">〈 戻る</button>
          <div class="zss-title" id="ss-title">CHAPTER 01</div>
          <div class="zss-title-rule" aria-hidden="true"><span>✦</span></div>
        </header>
        <div class="zss-scroll">
          <div class="zss-list" id="ss-list"></div>
        </div>
      </div>`;
    document.body.appendChild(el);
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
        list.innerHTML = '<div style="text-align:center;color:rgba(232,228,220,.45);font-size:12px;padding:42px 0;letter-spacing:2px;">SHOOTING DATA LOADING...</div>';
        setTimeout(() => {
          const modal = document.getElementById('stage-select-modal');
          if (modal && modal.style.display !== 'none') renderList(chapter, mode);
        }, 120);
        return;
      }

      const stages = getStoryStages(chapter, mode);
      if (!stages.length) {
        list.innerHTML = '<div style="text-align:center;color:rgba(232,228,220,.3);font-size:13px;padding:40px 0;letter-spacing:2px;">準備中</div>';
        return;
      }

      stages.forEach(stageDef => {
        const unlocked = isShootingStoryStageUnlocked(stageDef, mode);
        const record = getStoryShootingRecord(stageDef.id);
        const cleared = record.cleared;
        const isBoss = stageDef.type === 'boss';
        const missionText = stageDef.mission?.text || (isBoss ? 'BOSSを撃破' : '敵を撃破');

        const card = document.createElement('div');
        card.className = 'zss-card zss-story-shooting-card' + (unlocked ? '' : ' locked');
        if (cleared) card.classList.add('story-cleared');

        const stageNo = Number(stageDef.stageNo || stageDef.no || 0);
        const displayStageName = 'ステージ' + stageNo;
        const storyScenario = getStoryScenarioData(stageDef);
        const isNovelOnly = !!(storyScenario && String(storyScenario.stageType || '').toLowerCase() === 'novel');
        const displayCondition = isNovelOnly ? 'ストーリーを読む' : missionText;
        const gimmickHtml = buildStoryGimmickHtml(stageDef);
        // build1461: バトルではないステージ（物語・パズル・ミニゲーム）は報酬を付与しないため、報酬欄を出さない。
        const nonBattleKind = getStoryNonBattleKind(storyScenario);
        const rewardRowHtml = nonBattleKind
          ? `<div class="zss-card-row zss-card-row-reward zss-card-row-noreward">
              <span class="zss-card-label">主な報酬</span>
              <span class="zss-noreward"><span class="zss-kind-tag">${nonBattleKind}</span><small>報酬なし</small></span>
            </div>`
          : `<div class="zss-card-row zss-card-row-reward">
              <span class="zss-card-label">主な報酬</span>
              <span class="zss-rewards">${buildStoryRewardPreviewHtml(stageDef, mode)}</span>
            </div>`;

        card.innerHTML = `
          <div class="zss-card-no" aria-hidden="true"><span>✧</span><b>${String(stageNo).padStart(2, '0')}</b><span>✧</span></div>
          <div class="zss-card-body">
            <div class="zss-card-name-row">
              <span class="zss-card-name">${displayStageName}</span>
              ${cleared ? '<span class="zss-clear-badge" aria-label="クリア済み">✓ CLEAR</span>' : ''}
            </div>
            <div class="zss-mission">クリア条件：${escapeStageSelectHtml(displayCondition)}</div>
            <div class="zss-card-row zss-card-row-gimmick">
              <span class="zss-card-label">GIMMICK</span>
              <span class="zss-gimmicks">${gimmickHtml}</span>
            </div>
            ${rewardRowHtml}
          </div>
          ${buildStoryRecordHtml(record)}
          ${unlocked ? '<span class="zss-arrow" aria-hidden="true">›</span>' : '<span class="zss-lock" aria-hidden="true">🔒</span>'}
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
  // STORY NOVEL ONLY
  // stage_scenario.js 側で stageType: "novel" を指定したステージは、
  // 編成・バトルを挟まずノベル完了でCLEARにする。
  // ============================================================
  function getStoryScenarioData(stage) {
    if (!stage) return null;
    try {
      if (window.StoryNovel && typeof window.StoryNovel.dataFor === 'function') {
        return window.StoryNovel.dataFor(stage.baseStageId || stage.id) || null;
      }
    } catch (_) {}
    return null;
  }

  // build1461: バトルではないステージの種類（報酬なし表示用）。バトルなら空文字。
  function getStoryNonBattleKind(scenario) {
    const type = String(scenario && scenario.stageType || '').toLowerCase();
    if (type === 'novel') return 'STORY';
    if (type === 'puzzle') return 'PUZZLE';
    if (type === 'minigame') return 'MINI GAME';
    return '';
  }

  function isNovelOnlyStoryStage(stage) {
    const data = getStoryScenarioData(stage);
    return !!(data && String(data.stageType || '').toLowerCase() === 'novel');
  }

  function markNovelStoryStageCleared(stageId) {
    const id = String(stageId || '');
    if (!id) return;
    const map = getStoryClearMap();
    map[id] = true;
    saveStoryClearMap(map);

    // 戦闘記録のCLEAR判定と一覧再描画にも通知する。
    try {
      window.dispatchEvent(new CustomEvent('shooting-stage-record-updated', {
        detail: { stageId: id, cleared: true, novelOnly: true }
      }));
    } catch (_) {}
  }

  function playNovelOnlyStoryStage(stage, mode = 'normal') {
    if (!stage || !stage.id || !window.StoryNovel || typeof window.StoryNovel.playPre !== 'function') return false;

    cancelStageSelectClose();
    const modal = document.getElementById('stage-select-modal');
    if (modal) {
      modal.style.transition = 'none';
      modal.style.opacity = '0';
      modal.style.display = 'none';
    }
    setQuestForegroundHidden(false);

    const chapter = Number(stage.chapter || 1);
    const storyMode = mode === 'beginner' ? 'beginner' : 'normal';
    window.__shootingReturnContext = { type: 'storyChapter', chapter, mode: storyMode };

    const returnToChapter = () => {
      if (typeof window.openStageSelect === 'function') {
        window.openStageSelect(chapter, storyMode);
      }
    };

    const played = window.StoryNovel.playPre(stage.baseStageId || stage.id, {
      onComplete: () => {
        markNovelStoryStageCleared(stage.id);
        returnToChapter();
      },
      onExit: returnToChapter
    });

    if (!played) returnToChapter();
    return !!played;
  }

  function isRingPuzzleStage(stage) {
    const data = getStoryScenarioData(stage);
    return !!(data && String(data.stageType || '').toLowerCase() === 'puzzle');
  }

  function playRingPuzzleStage(stage, mode) {
    const stageId = stage.baseStageId || stage.id;
    const chapter = Number(stage.chapter || 5);
    const storyMode = mode === 'beginner' ? 'beginner' : 'normal';
    const old = document.getElementById('zeraphia-ring-overlay');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'zeraphia-ring-overlay';
    overlay.style.cssText = 'position:fixed!important;inset:0!important;width:100%!important;height:100%!important;height:100dvh!important;z-index:2147483647!important;background:#f1eadb!important;overflow:hidden!important;overscroll-behavior:none!important;touch-action:none!important;';
    const frame = document.createElement('iframe');
    frame.title = '円環パズル';
    frame.setAttribute('scrolling','no');
    frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block;overflow:hidden;';
    frame.src = 'ring_puzzle_ch05.html?v=1345-rich-ui&rings=' + (Number(stage.stageNo) === 2 ? '3' : '4');
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouch = document.body.style.touchAction;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    let done = false;
    let watch = null;
    function cleanup() {
      window.removeEventListener('message', onMessage);
      if (watch) clearInterval(watch);
      overlay.remove();
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouch;
    }
    function returnToChapter() {
      if (typeof window.openStageSelect === 'function') window.openStageSelect(chapter, storyMode);
    }
    function cleared() {
      if (done) return;
      done = true;
      cleanup();
      const complete = () => { markNovelStoryStageCleared(stage.id); returnToChapter(); };
      try {
        if (window.StoryNovel && typeof window.StoryNovel.playPost === 'function') {
          const played = window.StoryNovel.playPost(stageId,{onComplete:complete,onExit:complete});
          if (played) return;
        }
      } catch (err) { console.error('[CH05] post story failed',err); }
      complete();
    }
    function onMessage(event) {
      if (done || event.source !== frame.contentWindow) return;
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'zeraphia-ring-exit') { done=true;cleanup();returnToChapter(); }
      if (event.data.type === 'zeraphia-ring-cleared') cleared();
    }
    window.addEventListener('message', onMessage);
    frame.addEventListener('load', () => {
      try {
        const child = frame.contentWindow;
        if (!child || !child.document || !child.document.getElementById('board')) return;
        // Same-origin direct bridge; postMessage remains supported as a backup.
        child.zeraphiaRingClear = cleared;
        child.zeraphiaRingExit = () => { if (!done) {done=true;cleanup();returnToChapter();} };
        watch = setInterval(() => {
          try { if (!done && child.document.getElementById('board')?.classList.contains('solved')) { clearInterval(watch); watch=null; setTimeout(cleared, 2400); } }
          catch (_) {}
        }, 700);
      } catch (_) { /* cross-origin: use postMessage */ }
    });
  }

  // CH06 only: self-contained HTML mini games. Clear is accepted ONLY from the
  // final explicit completion event, never from a partial board state.
  function isChapter6StandaloneStage(stage) {
    const id = String((stage && (stage.baseStageId || stage.id)) || '');
    // ID-first: on fast replay taps scenario JS may not have loaded yet.
    return id === 'shooting_ch06_02' || id === 'shooting_ch06_04';
  }

  function playChapter6StandaloneStage(stage, mode = 'normal') {
    const stageId = String(stage.baseStageId || stage.id);
    const isStealth = stageId === 'shooting_ch06_02';
    const chapter = Number(stage.chapter || 6);
    const storyMode = mode === 'beginner' ? 'beginner' : 'normal';
    const file = isStealth ? 'stealth_ch06.html' : 'map_puzzle_ch06.html';
    const prefix = isStealth ? 'stealth' : 'map';
    const overlayId = 'zeraphia-ch06-game-overlay';
    document.getElementById(overlayId)?.remove();
    const overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.style.cssText = 'position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;z-index:2147483647!important;background:#f1eadb!important;overflow:hidden!important;overscroll-behavior:none!important;touch-action:none!important;';
    const frame = document.createElement('iframe');
    frame.title = isStealth ? 'アイナの隠密ミニゲーム' : '道しるべ・紙のパズル';
    frame.setAttribute('scrolling','no');
    frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block;overflow:hidden;';
    frame.src = file + '?v=1336';
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    const prev = [document.documentElement.style.overflow,document.body.style.overflow,document.body.style.touchAction];
    document.documentElement.style.overflow='hidden';
    document.body.style.overflow='hidden';
    document.body.style.touchAction='none';
    let done = false;
    function cleanup() {
      window.removeEventListener('message', onMessage);
      overlay.remove();
      document.documentElement.style.overflow=prev[0];
      document.body.style.overflow=prev[1];
      document.body.style.touchAction=prev[2];
      try { const child=frame.contentWindow; if(child){ delete child['zeraphia'+(isStealth?'Stealth':'Map')+'Clear']; delete child['zeraphia'+(isStealth?'Stealth':'Map')+'Exit']; } }catch(_){}
    }
    function returnToChapter() {
      if(typeof window.openStageSelect==='function') window.openStageSelect(chapter,storyMode);
    }
    function exit() { if(done)return; done=true;cleanup();returnToChapter(); }
    function cleared() {
      if(done)return;
      done=true;
      cleanup();
      const complete=()=>{
        markNovelStoryStageCleared(stage.id);
        if(typeof window.renderStoryChapterList==='function'){
          window.renderStoryChapterList('normal');
          window.renderStoryChapterList('beginner');
        }
        returnToChapter();
      };
      try {
        if(window.StoryNovel && typeof window.StoryNovel.playPost==='function'){
          const played=window.StoryNovel.playPost(stageId,{onComplete:complete,onExit:complete});
          if(played)return;
        }
      }catch(err){console.error('[CH06] post-story failed',err);}
      complete();
    }
    function onMessage(event) {
      if(done || event.source!==frame.contentWindow || event.origin!==location.origin)return;
      if(!event.data || typeof event.data!=='object')return;
      if(event.data.type==='zeraphia-'+prefix+'-cleared')cleared();
      else if(event.data.type==='zeraphia-'+prefix+'-exit')exit();
    }
    window.addEventListener('message',onMessage);
    frame.addEventListener('load',()=>{
      if(done)return;
      try {
        const child=frame.contentWindow;
        if(!child || !child.document || !child.document.getElementById('board'))return;
        child['zeraphia'+(isStealth?'Stealth':'Map')+'Clear']=cleared;
        child['zeraphia'+(isStealth?'Stealth':'Map')+'Exit']=exit;
      }catch(_){ /* postMessage fallback */ }
    });
  }

  // ============================================================
  // STORY（SHOOTING）ステージ選択
  // ============================================================
  function onShootingStoryStageTap(stage, mode = 'normal') {
    if (!stage || !stage.id) return;

    const chapter = Number(stage.chapter || 1);
    const storyMode = mode === 'beginner' ? 'beginner' : 'normal';
    const storyId = stage.baseStageId || stage.id;
    // build1272: CH04-04でのみクリア済み再挑戦を先行導入。
    const normalizedStoryId = String(storyId).replace(/^shooting_beginner_/, 'shooting_');
    // CLEAR済みの表示に用いた記録と同じ判定で、再挑戦フラグを戦闘側へ渡す。
    const replay = getStoryShootingRecord(stage.id).cleared ||
      getStoryShootingRecord(storyId).cleared ||
      getStoryShootingRecord(normalizedStoryId).cleared;

    const hideStageSelect = () => {
      cancelStageSelectClose();
      const modal = document.getElementById('stage-select-modal');
      if (modal) {
        modal.style.transition = 'none';
        modal.style.opacity = '0';
        modal.style.display = 'none';
      }
      setQuestForegroundHidden(false);
    };

    const setReturnContext = () => {
      window.__shootingReturnContext = {
        type: 'storyChapter',
        chapter,
        mode: storyMode,
      };
    };

    const returnToChapter = () => {
      if (typeof window.openStageSelect === 'function') {
        window.openStageSelect(chapter, storyMode);
      }
    };

    const openBattle = () => {
      hideStageSelect();
      setReturnContext();
      if (typeof window.openShootingStage === 'function') {
        if (replay && !isRingPuzzleStage(stage) && !isChapter6StandaloneStage(stage) && !isNovelOnlyStoryStage(stage) && typeof window.openShootingEvent === 'function') {
          window.openShootingEvent({ stageId: stage.id, storyReplay: true });
        } else {
          window.openShootingStage(stage.id);
        }
        return true;
      }
      return false;
    };

    const isStoryNovelReady = () => {
      const novel = window.StoryNovel;
      if (!novel || typeof novel.playPre !== 'function') return false;
      if (typeof novel.dataFor === 'function') {
        try {
          // シナリオデータ自体の読込完了も待つ。
          if (!novel.dataFor(storyId)) return false;
        } catch (_) {
          return false;
        }
      }
      return true;
    };

    const beginReadyStoryFlow = () => {
      if (isChapter6StandaloneStage(stage)) {
        const openGame = () => { hideStageSelect(); setReturnContext(); playChapter6StandaloneStage(stage, storyMode); };
        if (replay) { openGame(); return; }
        const novel=window.StoryNovel;
        const played=novel.playPre(storyId,{onComplete:openGame,onExit:returnToChapter});
        if (!played) openGame();
        return;
      }
      if (isRingPuzzleStage(stage)) {
        if (replay) { hideStageSelect();playRingPuzzleStage(stage, storyMode);return; }
        const novel=window.StoryNovel;
        const played=novel.playPre(storyId,{onComplete:()=>playRingPuzzleStage(stage,storyMode),onExit:returnToChapter});
        if (!played) playRingPuzzleStage(stage,storyMode);
        return;
      }
      if (replay && !isNovelOnlyStoryStage(stage)) { openBattle(); return; }
      // StoryNovel準備後にNOVEL専用判定をやり直す。
      // 読込前に判定するとCH03-01などが通常戦闘扱いになってしまう。
      if (isNovelOnlyStoryStage(stage)) {
        playNovelOnlyStoryStage(stage, storyMode);
        return;
      }

      hideStageSelect();
      setReturnContext();

      const novel = window.StoryNovel;
      const hasPre = !!(
        novel &&
        typeof novel.playPre === 'function' &&
        (typeof novel.hasPre !== 'function' || novel.hasPre(storyId))
      );

      if (!hasPre) {
        // StoryNovel/シナリオが準備済みで、本当にpreが無い場合のみ戦闘へ。
        openBattle();
        return;
      }

      const played = novel.playPre(storyId, {
        // ノベルを閉じる前に編成画面を背面で完成させる。
        // これにより「わ、わかった！」などpre最終行の後に
        // ステージ選択画面が一瞬見えるフラッシュを防ぐ。
        handoffBeforeNovelExit: true,
        onComplete: () => { openBattle(); },
        onExit: returnToChapter
      });

      // データ不整合などでpre開始に失敗した時だけ戦闘へフォールバック。
      if (!played) openBattle();
    };

    // ステージタップ直後にシューティングだけ先に準備完了していても、
    // StoryNovel / シナリオが未ロードなら待つ。
    // 以前はここで hasPre=false 扱いになり、事前ストーリーが飛ばされていた。
    hideStageSelect();
    setReturnContext();
    // 再挑戦はノベルのロードを待たず、戦闘モジュールだけ待つ。
    if (replay && isStoryNovelReady() && !isRingPuzzleStage(stage) && !isChapter6StandaloneStage(stage) && !isNovelOnlyStoryStage(stage) && typeof window.openShootingEvent === 'function') {
      openBattle();
      return;
    }

    let tries = 0;
    const maxTries = 50; // 最大5秒。通常は即時～数百msで揃う。
    const tryStart = () => {
      tries++;
      const battleReady = typeof window.openShootingStage === 'function';
      const storyReady = isStoryNovelReady();

      if (battleReady && storyReady) {
        beginReadyStoryFlow();
        return true;
      }

      if (tries >= maxTries) {
        // StoryNovelだけ失敗した場合に無言でpreを飛ばさない。
        // ユーザーに再試行可能な状態へ戻す。
        returnToChapter();
        if (typeof showToast === 'function') {
          showToast('ストーリーの読み込みに失敗しました。もう一度お試しください');
        } else {
          alert('ストーリーの読み込みに失敗しました。もう一度お試しください');
        }
        return true;
      }
      return false;
    };

    if (tryStart()) return;

    const timer = setInterval(() => {
      if (tryStart()) clearInterval(timer);
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
  cancelStageSelectClose();

    const el = document.getElementById('stage-select-modal');
    const title = document.getElementById('ss-title');
    if (title) {
      title.textContent = 'CHAPTER ' + String(chapter).padStart(2, '0');
    }

    renderList(chapter, mode);
    el.dataset.chapter = String(chapter);
    el.dataset.storyMode = mode === 'beginner' ? 'beginner' : 'normal';

    // 背景画像は #screen-ninmu に残し、画面①のパーツだけ非表示。
    setQuestForegroundHidden(true);
    el.style.transition = 'opacity .24s ease';
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
    cancelStageSelectClose();
    const el = document.getElementById('stage-select-modal');
    if (!el) {
      setQuestForegroundHidden(false);
      return;
    }
    el.style.transition = 'opacity .24s ease';
    el.style.opacity = '0';
    stageSelectCloseTimer = setTimeout(() => {
      stageSelectCloseTimer = null;
      el.style.display = 'none';
      // ②のフェードアウト後に①のカード・メニューを復帰させる。
      setQuestForegroundHidden(false);
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
