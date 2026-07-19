// stage_select.js
// ステージ選択モーダル
// openStageSelect(chapter) で開く → ステージ選択 → openPartySelect(enemyId) へ

(function () {

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

    // ── 特別巡行用ローグライト一覧 ──
    // CHAPTER 00はSTAGESに定義したBOSS単戦だけを表示する。
    if (chapter === 'roguelite') {
      const runs = [
        {
          id: 'overseer',
          icon: '◉',
          name: '万象を知る白亜の座',
          meta: '全3戦 · レムナント：オーバーシア',
          color: 'rgba(140,80,255,.9)',
        },
        {
          id: 'sakiel',
          icon: '✦',
          name: 'サキエル降臨',
          meta: '雑魚3戦 → Stage 4 サキエル',
          color: 'rgba(230,220,255,.92)',
        },
        {
          id: 'irish',
          icon: '◆',
          name: '無へ還す破壊の座',
          meta: '中ボス2戦 → Stage 3 レムナント：イリシュ',
          color: 'rgba(230,120,105,.92)',
        },
        {
          id: 'rivia',
          icon: '◇',
          name: '記憶を失くす白き座',
          meta: '眷属2戦 → Stage 3 レムナント：リヴィア',
          color: 'rgba(205,195,245,.92)',
        },
      ];

      runs.forEach(run => {
        const rlCard = document.createElement('div');
        rlCard.className = 'ss-card';
        rlCard.classList.add('ss-card-roguelite');
        rlCard.innerHTML = `
          <div class="ss-card-no" style="border-color:rgba(140,80,255,.35);color:${run.color}">${run.icon}</div>
          <div class="ss-card-body">
            <div class="ss-card-name" style="color:rgba(232,228,220,.92)">${run.name}</div>
            <div class="ss-card-meta">
              <div class="ss-card-enemy" style="color:rgba(190,170,255,.55)">${run.meta}</div>
            </div>
          </div>
          <div class="ss-diff-badge" style="color:rgba(140,80,255,.9);border-color:rgba(140,80,255,.4)">ROGUELITE</div>
          <div class="ss-card-arrow">›</div>
        `;
        rlCard.onclick = () => _openRoguelitePartySelect(run.id);
        list.appendChild(rlCard);
      });
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

      const diffColor  = DIFFICULTY_COLOR[stage.difficulty]  || DIFFICULTY_COLOR.normal;
      const diffLabel  = DIFFICULTY_LABEL[stage.difficulty]  || 'NORMAL';
      const rewardText = stage.reward
        ? `EXP +${stage.reward.exp}　Coin +${stage.reward.coin || 0}`
        : '';

      card.innerHTML = `
        <div class="ss-card-no">${String(stage.no).padStart(2, '0')}</div>
        <div class="ss-card-body">
          <div class="ss-card-name">${stage.name}</div>
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

  // ============================================================
  // ローグライト：パーティ選択を開く（battleMode:'roguelite' を渡す）
  // ============================================================
  function _openRoguelitePartySelect(runId) {
    const selectedRunId = runId || 'default';
    window.__ROGUELITE_PENDING_RUN_ID__ = selectedRunId;
    closeStageSelect();
    setTimeout(() => {
      if (typeof window.openPartySelect === 'function') {
        window.openPartySelect(null, {
          battleMode: 'roguelite',
          rogueliteRunId: selectedRunId,
        });
      } else {
        // party_select がない場合はデフォルトパーティで即起動
        if (window.RogueliteController) {
          window.RogueliteController.startRun([8, 12, 7], { runId: selectedRunId });
        }
      }
    }, 350);
  }

  window.openRoguelitePartySelect = _openRoguelitePartySelect;

  // ============================================================
  // ステージ選択
  // ============================================================
  function onStageTap(stage) {
    if (stage && stage.rogueliteRunId) {
      _openRoguelitePartySelect(stage.rogueliteRunId);
      return;
    }

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

})();
