// stage_select.js
// ステージ選択モーダル
// openStageSelect(chapter) で開く → ステージ選択 → openPartySelect(enemyId) へ

(function () {

  // ============================================================
  // STORY CHAPTER PROGRESSION
  // CHAPTER 01 から順に解放。前章4ステージ全クリアで次章を解放。
  // ============================================================
  const STORY_CHAPTER_MIN = 1;
  const STORY_CHAPTER_MAX = 8;
  const STORY_CLEAR_KEY = 'zeraphia_story_stage_clears_v1';
  const STORY_CHAPTER_TITLES = {
    1: '目覚めの朝',
    2: 'ディストラクション',
    3: '失われたもの',
    4: '嘘と真実',
    5: '未定',
    6: '未定',
    7: '未定',
    8: '未定'
  };

  // STORY表示用クリア条件。
  // ステージ固有タイトルは使わず、画面上では「ステージ1〜4」で統一する。
  const STORY_STAGE_CONDITIONS = {
    'shooting_ch01_01': 'アイテムを3つ拾得',
    'shooting_ch01_02': '90秒以内に敵をすべて撃破',
    'shooting_ch01_03': '被弾3回以内に敵をすべて撃破',
    'shooting_ch01_04': 'オーバーシアを撃破',

    'shooting_ch02_01': '敵をすべて撃破',
    'shooting_ch02_02': '150秒以内に敵をすべて撃破',
    'shooting_ch02_03': '被弾2回以内に敵をすべて撃破',
    'shooting_ch02_04': 'イリシュを撃破',

    'shooting_ch03_01': 'アイテムを3つ拾得',
    'shooting_ch03_02': 'アイテムを3つ拾得',
    'shooting_ch03_03': 'アイテムを3つ拾得',
    'shooting_ch03_04': 'リヴィアを撃破',
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
      <div class="ss-stage-record" aria-label="ベスト記録">
        <div class="ss-stage-record-rank${rankClass}">
          <span>RANK</span><b>${rank}</b>
        </div>
        <div class="ss-stage-record-score">
          <span>HIGH SCORE</span><b>${formatStoryShootingScore(record.highScore)}</b>
        </div>
      </div>`;
  }

  function markStoryStageCleared(stageId) {
    if (!stageId) return;
    const map = getStoryClearMap();
    if (map[stageId]) return;
    map[stageId] = true;
    saveStoryClearMap(map);
    renderStoryChapterList();
  }

  function getStoryStages(chapter) {
    if (!window.ShootingStages || typeof window.ShootingStages.getShootingStagesByChapter !== 'function') {
      return [];
    }
    return window.ShootingStages.getShootingStagesByChapter(Number(chapter)) || [];
  }

  function isShootingStoryStageUnlocked(stage) {
    if (!stage) return false;
    const chapterStages = getStoryStages(stage.chapter);
    const index = chapterStages.findIndex(s => s && s.id === stage.id);
    if (index <= 0) return true;
    const prev = chapterStages[index - 1];
    return !!(prev && isStoryStageCleared(prev.id));
  }

  function isStoryChapterCleared(chapter) {
    const stages = getStoryStages(chapter).filter(s => s && s.chapter === chapter && s.type !== 'debug');
    return stages.length > 0 && stages.every(s => isStoryStageCleared(s.id));
  }

  function isStoryChapterUnlocked(chapter) {
    chapter = Number(chapter);
    if (chapter < STORY_CHAPTER_MIN || chapter > STORY_CHAPTER_MAX) return false;
    const currentStages = getStoryStages(chapter);
    if (!currentStages.length) return false;
    if (chapter === STORY_CHAPTER_MIN) return true;
    return isStoryChapterCleared(chapter - 1);
  }

  function showStoryLockedMessage() {
    if (typeof showToast === 'function') {
      showToast('解放されていません');
    } else {
      alert('解放されていません');
    }
  }

  function renderStoryChapterList() {
    const list = document.getElementById('story-chapter-list');
    if (!list) return;
    list.innerHTML = '';

    for (let chapter = STORY_CHAPTER_MIN; chapter <= STORY_CHAPTER_MAX; chapter++) {
      const unlocked = isStoryChapterUnlocked(chapter);
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
        if (!isStoryChapterUnlocked(chapter)) {
          showStoryLockedMessage();
          return;
        }
        window.openStageSelect(chapter);
      });
      list.appendChild(item);
    }
  }

  window.renderStoryChapterList = renderStoryChapterList;
  window.isStoryChapterUnlocked = isStoryChapterUnlocked;
  window.isStoryChapterCleared = isStoryChapterCleared;
  window.markStoryStageCleared = markStoryStageCleared;

  // shooting_event.js 内部モジュールの非同期ロード完了後に再描画。
  (function waitForShootingStoryMaster(attempt) {
    if (window.ShootingStages) {
      renderStoryChapterList();
      return;
    }
    if ((attempt || 0) >= 50) return;
    setTimeout(() => waitForShootingStoryMaster((attempt || 0) + 1), 100);
  })(0);

  // Storyタブが開かれた時に最新の解放状態を反映するため、
  // DOM構築後とタブ操作後に再描画する。
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderStoryChapterList);
  } else {
    setTimeout(renderStoryChapterList, 0);
  }

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
      'position:fixed', 'inset:0', 'z-index:140000',
      'display:none', 'flex-direction:column',
      'background:#07080a', 'color:#e8e4dc',
      'font-family:"Noto Serif JP",serif',
      'opacity:0', 'transition:opacity 0.35s ease',
    ].join(';');

    el.innerHTML = `
      <div class="ss-header">
        <button class="ss-back-btn" onclick="closeStageSelect()">‹ 戻る</button>
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
      /* ヘッダー */
      .ss-header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        padding: max(18px, env(safe-area-inset-top, 18px)) 16px 12px;
        border-bottom: 1px solid rgba(255,255,255,.06);
        background: rgba(0,0,0,.5);
        gap: 12px;
      }
      .ss-back-btn {
        background: none;
        border: none;
        color: rgba(232,228,220,.5);
        font-family: "Noto Serif JP", serif;
        font-size: 14px;
        letter-spacing: 1px;
        cursor: pointer;
        padding: 4px 0;
        flex-shrink: 0;
      }
      .ss-back-btn:active { color: rgba(232,228,220,.85); }
      .ss-title {
        flex: 1;
        text-align: center;
        font-family: "Cinzel", serif;
        font-size: 15px;
        letter-spacing: 4px;
        color: rgba(232,228,220,.85);
      }
      .ss-spacer { flex-shrink: 0; width: 48px; }

      /* リスト */
      .ss-list-wrap {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 0 0 calc(40px + env(safe-area-inset-bottom, 20px));
      }
      .ss-list {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      /* ステージカード */
      .ss-card {
        display: flex;
        align-items: center;
        gap: 14px;
        min-height: 72px;
        padding: 14px 18px;
        border-radius: 0;
        border: 0;
        border-bottom: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.03);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: background .15s;
        position: relative;
        overflow: hidden;
      }
      .ss-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,.03) 0%, transparent 60%);
        pointer-events: none;
      }
      .ss-card:active {
        background: rgba(255,255,255,.09);
      }
      .ss-card.locked {
        opacity: .35;
        pointer-events: none;
      }

      /* ステージ番号 */
      .ss-card-no {
        flex-shrink: 0;
        width: 36px;
        height: auto;
        border-radius: 0;
        border: 0;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        font-family: "Cinzel", serif;
        font-size: 11px;
        color: rgba(232,228,220,.55);
        letter-spacing: .12em;
      }

      /* テキストエリア */
      .ss-card-body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .ss-card-name {
        font-size: 15px;
        letter-spacing: 1px;
        color: rgba(232,228,220,.9);
        font-weight: 500;
      }
      .ss-card-meta {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ss-card-enemy {
        font-size: 11px;
        letter-spacing: 2px;
        color: rgba(232,228,220,.4);
        font-family: "Cinzel", serif;
      }
      .ss-card-reward {
        font-size: 10px;
        color: rgba(180,160,100,.6);
        letter-spacing: 1px;
      }

      /* 難易度バッジ */
      .ss-diff-badge {
        flex-shrink: 0;
        font-family: "Cinzel", serif;
        font-size: 8px;
        letter-spacing: 2px;
        padding: 0;
        border-radius: 0;
        border: 0;
        background: transparent;
      }

      /* 矢印 */
      .ss-card-arrow {
        flex-shrink: 0;
        font-size: 16px;
        color: rgba(232,228,220,.2);
      }

      /* ロックアイコン */
      .ss-lock-icon {
        flex-shrink: 0;
        font-size: 14px;
        color: rgba(232,228,220,.2);
      }

      .ss-roguelite-preparing {
        min-height: 52vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        text-align: center;
      }
      .ss-roguelite-preparing-en {
        font-family: "Cinzel", serif;
        font-size: 11px;
        letter-spacing: .32em;
        color: rgba(190,170,255,.42);
        margin-bottom: 18px;
      }
      .ss-roguelite-preparing-main {
        font-size: 15px;
        letter-spacing: .12em;
        color: rgba(232,228,220,.82);
      }
      .ss-roguelite-preparing-sub {
        margin-top: 10px;
        font-size: 11px;
        letter-spacing: .08em;
        color: rgba(232,228,220,.35);
      }
    `;
    document.body.appendChild(s);
  }

  // ============================================================
  // リスト描画
  // ============================================================
  function renderList(chapter) {
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
          if (modal && modal.style.display !== 'none') renderList(chapter);
        }, 120);
        return;
      }

      const stages = getStoryStages(chapter);
      if (!stages.length) {
        list.innerHTML = '<div style="text-align:center;color:rgba(232,228,220,.3);font-size:13px;padding:40px 0;letter-spacing:2px;">準備中</div>';
        return;
      }

      stages.forEach(stageDef => {
        const unlocked = isShootingStoryStageUnlocked(stageDef);
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
          missionText;

        card.innerHTML = `
          <div class="ss-card-no">${String(stageNo).padStart(2, '0')}</div>
          <div class="ss-card-body">
            <div class="ss-card-name-row">
              <div class="ss-card-name">${displayStageName}${cleared ? '　<span class="ss-story-clear">CLEAR</span>' : ''}</div>
            </div>
            <div class="ss-card-meta">
              <div class="ss-card-enemy">クリア条件：${displayCondition}</div>
            </div>
          </div>
          ${buildStoryRecordHtml(record)}
          ${unlocked ? '<div class="ss-card-arrow">›</div>' : '<div class="ss-lock-icon">🔒</div>'}
        `;

        if (unlocked) card.onclick = () => onShootingStoryStageTap(stageDef);
        list.appendChild(card);
      });
      return;
    }


    // ── 特別巡行用ローグライト ──
    // 現在は非公開。カード一覧自体を出さず、準備中表示だけにする。
    if (chapter === 'roguelite') {
      list.innerHTML = `
        <div class="ss-roguelite-preparing">
          <div class="ss-roguelite-preparing-en">ROGUELITE</div>
          <div class="ss-roguelite-preparing-main">このコンテンツは準備中です</div>
          <div class="ss-roguelite-preparing-sub">現在はシューティングのみプレイできます</div>
        </div>
      `;
      return;
    }


    const stages = (typeof getStagesByChapter === 'function')
      ? getStagesByChapter(chapter)
      : STAGES.filter(s => s.chapter === chapter);

    if (stages.length === 0) {
      list.innerHTML += '<div style="text-align:center;color:rgba(232,228,220,.3);font-size:13px;padding:40px 0;letter-spacing:2px;">準備中</div>';
      return;
    }

    stages.forEach(stage => {
      const card = document.createElement('div');
      card.className = 'ss-card' + (!stage.unlocked ? ' locked' : '');
      if (stage.chapter >= 1 && stage.chapter <= 8 && isStoryStageCleared(stage.id)) card.classList.add('story-cleared');

      const diffColor  = DIFFICULTY_COLOR[stage.difficulty]  || DIFFICULTY_COLOR.normal;
      const diffLabel  = DIFFICULTY_LABEL[stage.difficulty]  || 'NORMAL';
      const rewardText = stage.reward
        ? `EXP +${stage.reward.exp}　Coin +${stage.reward.coin || 0}`
        : '';

      card.innerHTML = `
        <div class="ss-card-no">${String(stage.no).padStart(2, '0')}</div>
        <div class="ss-card-body">
          <div class="ss-card-name">${stage.name}${isStoryStageCleared(stage.id) ? '　<span class="ss-story-clear">CLEAR</span>' : ''}</div>
          <div class="ss-card-meta">
            <div class="ss-card-enemy">${stage.enemyName}</div>
            ${rewardText ? `<div class="ss-card-reward">${rewardText}</div>` : ''}
          </div>
        </div>
        <div class="ss-diff-badge" style="color:${diffColor};border-color:${diffColor.replace('.85', '.4')}">${diffLabel}</div>
        ${stage.unlocked
          ? '<div class="ss-card-arrow">›</div>'
          : '<div class="ss-lock-icon">🔒</div>'
        }
      `;

      if (stage.unlocked) {
        card.onclick = () => onStageTap(stage);
      }

      list.appendChild(card);
    });
  }

  window.addEventListener('shooting-stage-record-updated', () => {
    const modal = document.getElementById('stage-select-modal');
    if (!modal || modal.style.display === 'none') return;
    const chapter = Number(modal.dataset.chapter || 0);
    if (chapter >= STORY_CHAPTER_MIN && chapter <= STORY_CHAPTER_MAX) renderList(chapter);
  });

  // ============================================================
  // ローグライト：パーティ選択を開く（battleMode:'roguelite' を渡す）
  // ============================================================
  function _openRoguelitePartySelect(runId) {
    // 非公開期間中の最終防衛ライン。
    // HTML・ホームバナー・旧ステージ定義など、どこから呼ばれても開始しない。
    if (typeof showToast === 'function') {
      showToast('このコンテンツは準備中です');
    } else {
      alert('このコンテンツは準備中です');
    }
    return false;
  }

  window.openRoguelitePartySelect = _openRoguelitePartySelect;

  // ============================================================
  // STORY（SHOOTING）ステージ選択
  // ============================================================
  function onShootingStoryStageTap(stage) {
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
  // 旧ストラテジー側ステージ選択（コードは保持・STORY導線からは使用しない）
  // ============================================================
  function onStageTap(stage) {
    if (stage && stage.rogueliteRunId) {
      // ローグライトは現在すべて非公開。
      _openRoguelitePartySelect(stage.rogueliteRunId);
      return;
    }

    /* legacy roguelite branch disabled
      // CHAPTER06〜08は対応ローグライトランがまだ未実装のため、誤って別BOSSを起動しない。
      if (stage.rogueliteRunReady === false) {
        alert('このBOSSステージは準備中です');
        return;
      }
      // STORYの各CHAPTER 04(BOSS)は、特別巡行と同じローグライトランを使用する。
      // 勝利した場合に、このstory stageをCLEARとして記録できるようコンテキストを保持。
      if (Number(stage.chapter) >= STORY_CHAPTER_MIN && Number(stage.chapter) <= STORY_CHAPTER_MAX) {
        window.__STORY_BOSS_ROGUELITE_CONTEXT__ = {
          stageId: stage.id,
          chapter: Number(stage.chapter),
          runId: stage.rogueliteRunId,
        };
      }
      _openRoguelitePartySelect(stage.rogueliteRunId);
      return;
    */
    closeStageSelect();
    // 少し間を置いてから編成モーダルへ
    setTimeout(() => {
      if (typeof openPartySelect === 'function') {
        // [Battle32 分岐] stage.useBattle32 === true のステージは battleMode:'32' を付与
        const battleOptions = {
          returnChapter: stage.chapter,
          stageId: stage.id,
        };
        if (stage.useBattle32 === true) {
          battleOptions.battleMode = '32';

          // Battle32の戦闘ルールは全モード共通。
          // エリ固定・最大4人編成、LINK、ロスター、召喚などは常に有効。
          // ローグライトとの差はラン進行・戦闘後報酬の有無。
          battleOptions.useRogueliteBattleRules = true;

          // enemyIds を明示的に battleOptions にも持たせる
          // openPartySelect → Battle32.start(config) の config.enemyIds に渡るようにする
          if (stage.enemyIds && stage.enemyIds.length > 0) {
            battleOptions.enemyIds = stage.enemyIds;
          }

          // enemies（インライン敵定義配列）を引き継ぐ
          // enemyIds より優先度が高い場合は Battle32.start() 側で判定する
          if (stage.enemies && stage.enemies.length > 0) {
            battleOptions.enemies = stage.enemies;
          }

          // 敵スポーン設定を引き継ぐ
          if (stage.enemySpawn) {
            battleOptions.enemySpawn = stage.enemySpawn;
          }

          // 敵行動モード（'all' | 'limit'）
          if (stage.enemyActionMode) {
            battleOptions.enemyActionMode = stage.enemyActionMode;
          }

          // 1ターンあたりの敵行動数（enemyActionMode:'limit' のとき有効）
          if (stage.enemyActionsPerTurn != null) {
            battleOptions.enemyActionsPerTurn = stage.enemyActionsPerTurn;
          }

          // ターン制限
          if (stage.turnLimit != null) {
            battleOptions.turnLimit = stage.turnLimit;
          }

          // バトル背景番号（設計者指定）。未指定はUI側で01。
          if (stage.battleBackgroundNo != null) {
            battleOptions.battleBackgroundNo = stage.battleBackgroundNo;
          }

          // DEBUG等でローグライトと同じロスター/初期配置だけを使う
          if (stage.forceRogueliteLayout === true) {
            battleOptions.forceRogueliteLayout = true;
          }

          // ボス捕獲に必要な駒取り回数
          if (stage.bossCaptureMax != null) {
            battleOptions.bossCaptureMax = stage.bossCaptureMax;
          }
        }
        openPartySelect(stage.enemyIds || stage.enemyId, battleOptions);
      }
    }, 350);
  }

  // ============================================================
  // 開閉
  // ============================================================
  window.openStageSelect = function (chapter) {
  chapter = chapter ?? 1;

  if (typeof chapter === 'number' && chapter >= STORY_CHAPTER_MIN && chapter <= STORY_CHAPTER_MAX && !isStoryChapterUnlocked(chapter)) {
    showStoryLockedMessage();
    return;
  }

  buildModal();

    const el = document.getElementById('stage-select-modal');
    const title = document.getElementById('ss-title');
    if (title) {
      title.textContent = chapter === 'roguelite'
        ? 'ROGUELITE'
        : chapter === 0
          ? '— DEBUG —'
          : 'CHAPTER ' + String(chapter).padStart(2, '0');
    }

    renderList(chapter);
    el.dataset.chapter = String(chapter);

    el.style.display = 'flex';
    void el.offsetWidth;
    el.style.opacity = '1';

// ボトムナビ・HUD制御
// 通常のステージ選択ではホーム用ボトムナビを表示する
// 明示的に隠したい場合だけ window.__HIDE_HOME_NAV_ON_STAGE_SELECT__ = true にする
const shouldHideHomeNav = window.__HIDE_HOME_NAV_ON_STAGE_SELECT__ === true;

const nav = document.getElementById('bottom-nav-shared');
if (nav) nav.style.display = shouldHideHomeNav ? 'none' : '';

const guf = document.getElementById('global-user-frame');
if (guf) {
  guf.classList.remove('hidden');
  guf.style.display = shouldHideHomeNav ? 'none' : '';
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
    markStoryStageCleared(detail.stageId);
    renderStoryChapterList();
  });


})();
