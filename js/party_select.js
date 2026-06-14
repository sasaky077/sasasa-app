// party_select.js
// 出撃メンバー3体選択画面（配置なし）

(function () {

  // selected: { charaId }[]  通常最大3件 / ローグライト最大4件
  let selected = [];

  // ローグライト専用：主人公エリは1st固定
  const ROGUELITE_FIXED_FIRST_CHARA_ID = 1;

  let currentEnemyRef = 'enemy_01';
  let currentBattleOptions = {};

  function _isRogueliteMode() { return currentBattleOptions && currentBattleOptions.battleMode === 'roguelite'; }
  function _maxPartySize() { return _isRogueliteMode() ? 4 : 3; }
  function _minPartySize() { return _isRogueliteMode() ? 4 : 3; }
  function _isFixedFirstChara(charaId) {
    return _isRogueliteMode() && Number(charaId) === ROGUELITE_FIXED_FIRST_CHARA_ID;
  }
  function _ensureRogueliteFixedFirst() {
    if (!_isRogueliteMode()) return;

    // エリを必ず先頭に置き、重複があれば除去する。
    selected = selected.filter(s => Number(s.charaId) !== ROGUELITE_FIXED_FIRST_CHARA_ID);
    selected.unshift({ charaId: ROGUELITE_FIXED_FIRST_CHARA_ID, fixed: true });
    selected = selected.slice(0, _maxPartySize());
  }


  // パーティ編成画面専用画像
  // レイチェルだけ partyImg を優先し、他キャラは従来通り upImg -> img を使う
  function getPartySelectImg(chara) {
    if (!chara) return '';
    if (chara.id === 2 || chara.name === 'レイチェル') {
      return chara.partyImg || chara.upImg || chara.img || '';
    }
    return chara.upImg || chara.img || '';
  }

  function unitElementIcon(element) {
    const map = {
      chaos:  'images/icon_chaos.webp',
      logos:  'images/icon_logos.webp',
      mystis: 'images/icon_mystis.webp',
    };
    return map[element] || '';
  }

  function unitElementLabel(element) {
    const map = {
      chaos:  'ケイオス',
      logos:  'ロゴス',
      mystis: 'ミスティス',
    };
    return map[element] || element || '無属性';
  }

  // ============================================================
  // モーダル構築
  // ============================================================
  function buildModal() {
    if (document.getElementById('party-select-modal')) return;

    const el = document.createElement('div');
    el.id = 'party-select-modal';
    el.style.cssText = [
      'position:fixed','inset:0','z-index:150000',
      'display:none','flex-direction:column',
      'background:#0a0a0c','color:#e8e4dc',
      'font-family:"Noto Serif JP",serif',
      'opacity:0','transition:opacity 0.4s ease',
    ].join(';');

    el.innerHTML = `
      <div class="ps-header">
        <div class="ps-title">パーティ編成</div>
        <div class="ps-sub" id="ps-sub-text">3人選択 · 連れていくキャラを選んでください</div>
      </div>

      <div class="ps-slots-wrap">
        <div class="ps-slots" id="ps-slots">
          <!-- renderSlots() で描画 -->
        </div>
      </div>

      <div class="ps-list-wrap">
        <div class="ps-list" id="ps-chara-list"></div>
      </div>

      <div class="ps-footer">
        <button class="ps-btn-cancel" onclick="closePartySelect()">キャンセル</button>
        <button class="ps-btn-start" id="ps-btn-start" onclick="confirmPartySelect()" disabled>
          戦闘開始
        </button>
      </div>
    `;

    document.body.appendChild(el);
    injectStyle();
  }

  // ============================================================
  // CSS
  // ============================================================
  function injectStyle() {
    if (document.getElementById('party-select-style')) return;
    const s = document.createElement('style');
    s.id = 'party-select-style';
    s.textContent = `
      .ps-header {
        padding: max(18px, env(safe-area-inset-top, 18px)) 18px 8px;
        background: rgba(0,0,0,0.6);
        flex-shrink: 0;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .ps-title {
        font-family: "Cinzel", serif;
        font-size: 17px;
        letter-spacing: 4px;
        color: rgba(232,228,220,0.9);
        margin-bottom: 2px;
      }
      .ps-sub {
        font-size: 9px;
        letter-spacing: 2px;
        color: rgba(232,228,220,0.35);
      }

      /* スロットエリア */
      .ps-slots-wrap {
        flex-shrink: 0;
        padding: 12px 14px 10px;
        background: rgba(0,0,0,0.45);
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .ps-slots {
        display: flex;
        gap: 10px;
        justify-content: center;
      }
      .ps-slot {
        flex: 1;
        max-width: 110px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .ps-slot-box {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 10px;
        border: 1.5px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.03);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: border-color 0.15s;
      }
      .ps-slot.filled .ps-slot-box {
        border-color: rgba(232,228,220,0.35);
      }
      .ps-slot.filled .ps-slot-box:active {
        background: rgba(255,80,80,0.1);
      }
      .ps-slot-empty-label {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        color: rgba(232,228,220,0.18);
      }
      .ps-slot-empty-label span {
        font-family: "Cinzel", serif;
        font-size: 9px;
        letter-spacing: 2px;
      }
      .ps-slot-empty-plus {
        font-size: 18px;
        line-height: 1;
      }
      .ps-slot-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top center;
      }
      .ps-slot-chara-name {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        font-size: 7px;
        color: rgba(232,228,220,0.85);
        background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
        text-align: center;
        padding: 6px 2px 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ps-slot-remove {
        position: absolute;
        top: 2px; right: 2px;
        width: 14px; height: 14px;
        border-radius: 50%;
        background: rgba(0,0,0,0.65);
        color: rgba(255,255,255,0.65);
        font-size: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ps-slot.fixed { cursor: default; }
      .ps-slot-lock {
        position: absolute;
        top: 3px; right: 3px;
        padding: 2px 4px;
        border-radius: 999px;
        background: rgba(0,0,0,0.68);
        color: rgba(232,228,220,0.72);
        font-family: "Cinzel", serif;
        font-size: 6px;
        letter-spacing: .08em;
      }
      /* キャラ一覧 */
      .ps-list-wrap {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 8px 10px 0;
      }
      .ps-list {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        padding-bottom: 8px;
      }
      .ps-chara-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .ps-chara-card.not-owned {
        opacity: 0.2;
        pointer-events: none;
      }
      .ps-chara-img-wrap {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 8px;
        border: 1.5px solid rgba(255,255,255,0.08);
        overflow: hidden;
        background: rgba(255,255,255,0.03);
        position: relative;
        transition: border-color 0.15s;
      }
      .ps-chara-img-wrap > img:not(.ps-element-icon) {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top center;
      }
      .ps-chara-card.selected .ps-chara-img-wrap {
        border-color: rgba(232,228,220,0.6);
        box-shadow: 0 0 8px rgba(232,228,220,0.15);
      }
      .ps-chara-check {
        display: none;
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.4);
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: #fff;
      }
      .ps-chara-card.selected .ps-chara-check { display: flex; }
      .ps-element-icon {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 16px !important;
        height: 16px !important;
        object-fit: contain !important;
        border-radius: 50%;
        z-index: 6;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,.8));
        pointer-events: none;
      }
      .ps-slot-box {
        position: relative;
      }
      .ps-slot-element-icon {
        position: absolute;
        top: 4px;
        left: 4px;
        width: 18px !important;
        height: 18px !important;
        object-fit: contain !important;
        border-radius: 50%;
        z-index: 6;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,.85));
        pointer-events: none;
      }
      .ps-rarity-dot {
        position: absolute;
        bottom: 3px; right: 3px;
        width: 5px; height: 5px;
        border-radius: 50%;
      }
      .ps-rarity-dot.r  { background: #c0c0c0; }
      .ps-rarity-dot.sr { background: #ffd700; }
      .ps-rarity-dot.ur { background: linear-gradient(135deg,#ff80ff,#80ffff); }
      .ps-chara-name {
        font-size: 8px;
        color: rgba(232,228,220,0.55);
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
      }

      /* フッター */
      .ps-footer {
        display: flex;
        gap: 10px;
        padding: 10px 14px;
        padding-bottom: max(14px, env(safe-area-inset-bottom, 14px));
        background: rgba(0,0,0,0.6);
        border-top: 1px solid rgba(255,255,255,0.06);
        flex-shrink: 0;
      }
      .ps-btn-cancel {
        flex: 1; padding: 12px; border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.04);
        color: rgba(232,228,220,0.55); font-size: 13px; letter-spacing: 1px;
        cursor: pointer; font-family: "Noto Serif JP", serif;
      }
      .ps-btn-cancel:active { background: rgba(255,255,255,0.1); }
      .ps-btn-start {
        flex: 2; padding: 12px; border-radius: 12px;
        border: 1px solid rgba(232,228,220,0.25);
        background: rgba(232,228,220,0.08);
        color: #e8e4dc; font-size: 13px; letter-spacing: 2px;
        cursor: pointer; font-family: "Noto Serif JP", serif;
        transition: background 0.15s, opacity 0.15s;
      }
      .ps-btn-start:disabled { opacity: 0.3; pointer-events: none; }
      .ps-btn-start:not(:disabled):active { background: rgba(232,228,220,0.18); }

      /* キャラ詳細ポップアップ */
      .ps-detail-popup {
        position: fixed; inset: 0; z-index: 160000;
        display: flex; align-items: flex-end; justify-content: center;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(3px);
        opacity: 0; pointer-events: none; transition: opacity 0.2s;
      }
      .ps-detail-popup.active { opacity: 1; pointer-events: auto; }
      .ps-detail-box {
        width: 100%; max-width: 430px;
        background: #0e0f13;
        border-top: 1px solid rgba(255,255,255,0.1);
        border-radius: 18px 18px 0 0;
        padding: 0 0 max(20px,env(safe-area-inset-bottom,20px));
        transform: translateY(24px); transition: transform 0.25s ease;
        max-height: 85vh; overflow-y: auto;
      }
      .ps-detail-popup.active .ps-detail-box { transform: translateY(0); }
      .ps-detail-hero {
        display: flex; gap: 14px; padding: 18px 18px 14px; align-items: flex-start;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .ps-detail-img {
        width: 80px; height: 80px; border-radius: 10px; object-fit: cover;
        object-position: top center; flex-shrink: 0;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .ps-detail-info { flex: 1; min-width: 0; }
      .ps-detail-name {
        font-family: "Cinzel", serif; font-size: 16px; letter-spacing: 2px;
        color: rgba(232,228,220,0.92); margin-bottom: 4px;
      }
      .ps-detail-rarity {
        font-size: 9px; letter-spacing: 3px; margin-bottom: 10px;
      }
      .ps-detail-rarity.r  { color: #c0c0c0; }
      .ps-detail-rarity.sr { color: #ffd700; }
      .ps-detail-rarity.ur { color: #ff80ff; }
      .ps-detail-stats {
        display: grid; grid-template-columns: repeat(4,1fr); gap: 6px;
      }
      .ps-detail-stat {
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
        border-radius: 7px; padding: 5px 4px; text-align: center;
      }
      .ps-detail-stat-label {
        font-size: 7px; letter-spacing: 1px; color: rgba(232,228,220,0.35); margin-bottom: 2px;
      }
      .ps-detail-stat-val {
        font-family: "Cinzel", serif; font-size: 13px; color: rgba(232,228,220,0.85);
      }
      .ps-detail-skills-title {
        font-size: 9px; letter-spacing: 3px; color: rgba(232,228,220,0.3);
        padding: 12px 18px 8px; font-family: "Cinzel", serif;
      }
      .ps-detail-skill-list { padding: 0 14px; display: flex; flex-direction: column; gap: 6px; }
      .ps-detail-skill {
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
        border-radius: 9px; padding: 10px 12px;
      }
      .ps-detail-skill-main {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: start;
      }
      .ps-mini-range-board {
        display: grid;
        grid-template-columns: repeat(5, 9px);
        grid-template-rows: repeat(8, 9px);
        gap: 2px;
        padding: 6px;
        border-radius: 8px;
        background: rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.08);
        flex-shrink: 0;
      }
      .ps-mini-range-cell {
        width: 9px;
        height: 9px;
        border-radius: 2px;
        background: rgba(255,255,255,0.045);
        border: 1px solid rgba(255,255,255,0.05);
      }
      .ps-mini-range-cell.enemy-zone {
        background: rgba(80,40,120,0.16);
        border-color: rgba(160,100,220,0.12);
      }
      .ps-mini-range-cell.ally-zone {
        background: rgba(40,90,150,0.15);
        border-color: rgba(90,170,255,0.12);
      }
      .ps-mini-range-cell.self {
        background: rgba(255,230,120,0.95);
        border-color: rgba(255,245,180,0.95);
        box-shadow: 0 0 7px rgba(255,210,80,0.65);
        border-radius: 50%;
      }
      .ps-mini-range-cell.target {
        background: rgba(255,90,90,0.60);
        border-color: rgba(255,140,120,0.95);
        box-shadow: 0 0 7px rgba(255,70,70,0.45);
      }
      .ps-mini-range-cell.ally-target {
        background: rgba(90,200,255,0.55);
        border-color: rgba(150,230,255,0.9);
        box-shadow: 0 0 7px rgba(90,200,255,0.45);
      }

      .ps-mini-range-board-5x5 {
        grid-template-columns: repeat(5, 10px) !important;
        grid-template-rows: repeat(5, 10px) !important;
      }
      .ps-mini-range-board.mode-center .ps-mini-range-cell.self {
        box-shadow:
          0 0 7px rgba(255,220,120,0.55),
          inset 0 0 0 1px rgba(255,255,255,0.28);
      }

      .ps-detail-skill-header {
        display: flex; align-items: center; gap: 8px; margin-bottom: 5px;
      }
      .ps-detail-skill-name {
        font-size: 13px; letter-spacing: 1px; color: rgba(232,228,220,0.9); font-weight: 500;
      }
      .ps-detail-skill-type {
        font-size: 8px; letter-spacing: 1px; padding: 2px 7px; border-radius: 4px; border: 1px solid;
      }
      .ps-detail-skill-type.attack  { color: #f08080; border-color: rgba(240,128,128,0.4); background: rgba(240,128,128,0.08); }
      .ps-detail-skill-type.debuff  { color: #b8a0e8; border-color: rgba(184,160,232,0.4); background: rgba(184,160,232,0.08); }
      .ps-detail-skill-type.buff    { color: #80d4a0; border-color: rgba(128,212,160,0.4); background: rgba(128,212,160,0.08); }
      .ps-detail-skill-type.move    { color: #80c8f0; border-color: rgba(128,200,240,0.4); background: rgba(128,200,240,0.08); }
      .ps-detail-skill-type.special { color: #f0d080; border-color: rgba(240,208,128,0.4); background: rgba(240,208,128,0.08); }
      .ps-detail-skill-desc {
        font-size: 11px; color: rgba(232,228,220,0.5); line-height: 1.7; letter-spacing: 0.3px;
      }
      .ps-detail-skill-hit {
        font-family: "Cinzel", serif; font-size: 9px; color: rgba(232,228,220,0.3); margin-top: 4px;
      }
      .ps-detail-move-section {
        border-bottom: 1px solid rgba(255,255,255,0.06);
        padding-bottom: 10px;
      }
      .ps-detail-move-title {
        font-size: 9px;
        letter-spacing: 3px;
        color: rgba(232,228,220,0.3);
        padding: 12px 18px 8px;
        font-family: "Cinzel", serif;
      }
      .ps-detail-move-list {
        padding: 0 14px;
      }
      .ps-detail-move-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 9px;
        padding: 10px 12px;
      }
      .ps-detail-move-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: start;
      }
      .ps-detail-move-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 5px;
      }
      .ps-detail-move-name {
        font-size: 13px;
        letter-spacing: 1px;
        color: rgba(232,228,220,0.9);
        font-weight: 500;
      }
      .ps-detail-move-type {
        font-size: 8px;
        letter-spacing: 1px;
        padding: 2px 7px;
        border-radius: 4px;
        border: 1px solid rgba(128,200,240,0.4);
        color: #80c8f0;
        background: rgba(128,200,240,0.08);
      }
      .ps-detail-move-desc {
        font-size: 11px;
        color: rgba(232,228,220,0.5);
        line-height: 1.7;
        letter-spacing: 0.3px;
      }
      .ps-detail-move-meta {
        font-family: "Cinzel", serif;
        font-size: 9px;
        color: rgba(232,228,220,0.3);
        margin-top: 4px;
      }
      .ps-mini-range-board-7x5 {
        grid-template-columns: repeat(5, 9px) !important;
        grid-template-rows: repeat(7, 9px) !important;
      }
      .ps-mini-range-board.move-board {
        background: rgba(0,0,0,0.35);
        border-color: rgba(255,255,255,0.08);
      }
      .ps-mini-range-cell.move-target {
        background: rgba(90,200,255,0.58);
        border-color: rgba(150,230,255,0.95);
        box-shadow: 0 0 7px rgba(90,200,255,0.45);
      }
      .ps-detail-close {
        width: calc(100% - 28px); margin: 14px 14px 0;
        padding: 12px; border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);
        color: rgba(232,228,220,0.6); font-size: 13px; letter-spacing: 2px;
        cursor: pointer; font-family: "Noto Serif JP", serif; display: block;
      }
      .ps-detail-close:active { background: rgba(255,255,255,0.1); }
      .ps-chara-card.pressing .ps-chara-img-wrap,
      .ps-slot.pressing .ps-slot-box {
        border-color: rgba(232,228,220,0.5);
        transform: scale(0.95);
        transition: transform 0.1s;
      }
    `;
    document.body.appendChild(s);
  }

  // ============================================================
  // スロット描画（左・中・右）
  // ============================================================
  function _getSlotLabels() {
    return _isRogueliteMode()
      ? ['1', '2', '3', '4']
      : ['左', '中', '右'];
  }

  function renderSlots() {
    const wrap = document.getElementById('ps-slots');
    if (!wrap) return;

    // サブテキスト更新
    const subEl = document.getElementById('ps-sub-text');
    if (subEl) {
      subEl.textContent = _isRogueliteMode()
        ? 'エリ固定 · 2〜4枠目のキャラを選んでください'
        : '3人選択 · 連れていくキャラを選んでください';
    }

    const SLOT_LABELS = _getSlotLabels();
    wrap.innerHTML = SLOT_LABELS.map((label, i) => {
      const entry = selected[i];
      if (entry) {
        const chara = (typeof CHARACTERS !== 'undefined' ? CHARACTERS : []).find(c => c.id === entry.charaId);
        const imgSrc = getPartySelectImg(chara);
        const name   = chara ? chara.name : '';
        return `
          <div class="ps-slot filled${entry.fixed ? ' fixed' : ''}" data-slot-index="${i}">
            <div class="ps-slot-box">
              <img class="ps-slot-img" src="${imgSrc}" onerror="this.style.opacity='0'">
              ${chara && unitElementIcon(chara.element) ? `<img class="ps-slot-element-icon" src="${unitElementIcon(chara.element)}" alt="${unitElementLabel(chara.element)}" title="${unitElementLabel(chara.element)}" onerror="this.style.display='none'">` : ''}
              <div class="ps-slot-chara-name">${entry.fixed ? '1st · ' : ''}${name}</div>
              ${entry.fixed ? '<div class="ps-slot-lock">LOCK</div>' : '<div class="ps-slot-remove">✕</div>'}
            </div>
          </div>
        `;
      } else {
        return `
          <div class="ps-slot">
            <div class="ps-slot-box">
              <div class="ps-slot-empty-label">
                <span>${label}</span>
                <div class="ps-slot-empty-plus">＋</div>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');

    // スロット：タップで解除 / 長押しで詳細表示
    wrap.querySelectorAll('.ps-slot.filled[data-slot-index]').forEach(slot => {
      const idx = Number(slot.dataset.slotIndex);
      const entry = selected[idx];
      if (entry) setupSlotCard(slot, entry, idx);
    });

    // 戦闘開始ボタン：通常は3体必須 / ローグライトは1体以上で有効化
    const btn = document.getElementById('ps-btn-start');
    const minSize = _minPartySize();
    if (btn) btn.disabled = selected.length < minSize;
  }

  // スロット削除（クリック時に左詰め）
  window._psRemoveSlot = function (idx) {
    const entry = selected[idx];
    if (entry && entry.fixed) return;

    selected.splice(idx, 1);
    _ensureRogueliteFixedFirst();
    renderSlots();
    renderCharaList();
  };

  // スロット：タップで解除、長押しでキャラ詳細を表示
  // エリ固定枠はタップ解除不可。ただし長押しで能力確認は可能。
  function setupSlotCard(slot, entry, idx) {
    if (!slot || !entry) return;

    let pressTimer = null;
    let pressing = false;
    let longPressed = false;
    let startX = 0;
    let startY = 0;

    const start = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      if (!touch) return;

      startX = touch.clientX;
      startY = touch.clientY;
      pressing = true;
      longPressed = false;
      slot.classList.add('pressing');

      pressTimer = setTimeout(() => {
        longPressed = true;
        pressing = false;
        pressTimer = null;
        slot.classList.remove('pressing');
        showCharaDetail(entry.charaId);
      }, 500);
    };

    const move = (e) => {
      if (!pressing) return;
      const touch = e.touches ? e.touches[0] : e;
      if (!touch) return;

      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);
      if (dx > 6 || dy > 6) cancel();
    };

    const cancel = () => {
      slot.classList.remove('pressing');
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      pressing = false;
    };

    const end = () => {
      slot.classList.remove('pressing');

      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;

        if (pressing && !longPressed && !entry.fixed) {
          window._psRemoveSlot(idx);
        }
      }

      pressing = false;
      setTimeout(() => { longPressed = false; }, 0);
    };

    slot.addEventListener('touchstart', start, {passive: true});
    slot.addEventListener('touchmove', move, {passive: true});
    slot.addEventListener('touchend', end);
    slot.addEventListener('touchcancel', cancel);
    slot.addEventListener('mousedown', start);
    slot.addEventListener('mousemove', move);
    slot.addEventListener('mouseup', end);
    slot.addEventListener('mouseleave', cancel);
  }

  // ============================================================
  // キャラ一覧レンダリング
  // ============================================================
  function renderCharaList() {
    const list = document.getElementById('ps-chara-list');
    if (!list) return;
    list.innerHTML = '';

    // 表示順は characters.js の CHARACTERS 配列順。
    // ローグライトでは主人公エリは1st固定枠にだけ表示し、選択候補一覧からは除外する。
    const chars = (typeof CHARACTERS !== 'undefined' ? CHARACTERS : [])
      .filter(c => !(_isRogueliteMode() && Number(c.id) === ROGUELITE_FIXED_FIRST_CHARA_ID));

    chars.forEach(c => {
      const owned = _isFixedFirstChara(c.id) || (typeof collected !== 'undefined' && !!collected[c.id]);
      const isSelected = selected.some(s => s.charaId === c.id);

      const card = document.createElement('div');
      card.className = 'ps-chara-card'
        + (!owned ? ' not-owned' : '')
        + (isSelected ? ' selected' : '')
        + (_isFixedFirstChara(c.id) ? ' fixed-first' : '');
      card.innerHTML = `
        <div class="ps-chara-img-wrap">
          <img src="${getPartySelectImg(c)}" onerror="this.style.opacity='0'">
          <div class="ps-rarity-dot ${c.rarity}"></div>
          <div class="ps-chara-check">✓</div>
          ${unitElementIcon(c.element) ? `<img class="ps-element-icon" src="${unitElementIcon(c.element)}" alt="${unitElementLabel(c.element)}" title="${unitElementLabel(c.element)}" onerror="this.style.display='none'">` : ''}
        </div>
        <div class="ps-chara-name">${c.name}</div>
      `;
      if (owned) setupCharaCard(card, c);
      list.appendChild(card);
    });
  }

  // ============================================================
  // インタラクション
  // ============================================================

  // タップ→選択、長押し→詳細
  function setupCharaCard(card, chara) {
    let pressTimer = null;
    let pressing = false;
    let startX = 0;
    let startY = 0;

    const start = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      pressing = true;
      card.classList.add('pressing');
      pressTimer = setTimeout(() => {
        pressing = false;
        card.classList.remove('pressing');
        showCharaDetail(chara.id);
      }, 500);
    };
    const move = (e) => {
      if (!pressing) return;
      const touch = e.touches ? e.touches[0] : e;
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);
      if (dx > 6 || dy > 6) { cancel(); }
    };
    const cancel = () => {
      card.classList.remove('pressing');
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      pressing = false;
    };
    const end = () => {
      card.classList.remove('pressing');
      if (pressTimer) {
        clearTimeout(pressTimer); pressTimer = null;
        if (pressing) { pressing = false; onCharaTap(chara.id); }
      }
    };

    card.addEventListener('touchstart', start, {passive: true});
    card.addEventListener('touchmove', move, {passive: true});
    card.addEventListener('touchend', end);
    card.addEventListener('touchcancel', cancel);
    card.addEventListener('mousedown', start);
    card.addEventListener('mousemove', move);
    card.addEventListener('mouseup', end);
    card.addEventListener('mouseleave', cancel);
  }

  function buildSkillMetaText(sk) {
    const parts = [];
    if (sk.linkCost != null) parts.push('LINK ' + sk.linkCost);
    if (sk.hit != null) parts.push(sk.hit < 100 ? 'HIT ' + sk.hit + '%' : '確定命中');
    if (sk.cdMax != null) parts.push('CD ' + sk.cdMax + 'ターン');
    if (sk.isUltimate) parts.push('ULT');
    return parts.join(' / ') || '—';
  }

  function normalizePartyMiniRange(range) {
    const alias = {
      front_row_3: 'front_row_3_ally',
      front3_row_3: 'front3_row_3_ally',
      front_9: 'front_9_ally',
      cross: 'cross_32'
    };
    return alias[range] || range || '';
  }

  function getPartyMiniRangeMode(range) {
    range = normalizePartyMiniRange(range);

    const fullBoard = new Set([
      'all',
      'enemy_all',
      'ally_all',
      'field_all',
      'field_cross_center',
      'front_all_rows_ally',
      'pierce_all',
      'col_center_32'
    ]);

    const centered = new Set([
      'self',
      'adjacent',
      'around8',
      'around24',
      'side_lr',
      'diag_x_1',
      'diag_x_2',
      'cross_32'
    ]);

    if (fullBoard.has(range)) return 'field';
    return centered.has(range) ? 'center' : 'front';
  }

  function getPartyMiniRangeSpec(range) {
    range = normalizePartyMiniRange(range);
    const mode = getPartyMiniRangeMode(range);

    if (mode === 'field') {
      return { rows: 8, cols: 5, user: { row: 6, col: 2, side: 'ally' }, mode: 'field' };
    }

    return mode === 'center'
      ? { rows: 5, cols: 5, user: { row: 2, col: 2, side: 'ally' }, mode: 'center' }
      : { rows: 7, cols: 5, user: { row: 6, col: 2, side: 'ally' }, mode: 'front' };
  }


  function getPartyMoveTypeLabel(moveType) {
    const map = {
      // 汎用名（正式）
      pawn: '前方1マス',
      front_1: '前方1マス',
      lance: '前方直線3マス',
      line_front_3: '前方直線3マス',
      gold: '前・左右',
      front_side_3: '前・左右',
      silver: '前方3方向',
      front_diag_3: '前方3方向',
      rook_short: '前・左右',
      bishop_short: '斜め前2方向＋斜め後ろ',
      knight: '前方桂馬',
      cross_1: '上下左右1マス',
      front_back_row3: '前1・後方横3',
      front_back_frontdiag: '前後・斜め前',
      vertical2_frontdiag2: '前後2・前桂馬',
      front_side_jump: '前・左右・飛越',
      front2_backdiag2: '前2・後方斜め',

      // 旧名互換
      shigure: '前1・後方横3',
      miyu: '前方直線3マス',
      eri: '上下左右1マス',
      aki: '前後2・前桂馬',
      asami: '前後・斜め前',
      chisaka: '前・左右・飛越',
      yuzuha: '前2・後方斜め',
      none: '移動なし'
    };
    return map[moveType] || (moveType || 'silver');
  }

  function buildPartyMoveMiniBoard(chara) {
    if (!chara) return '';

    const moveType = chara.moveType || 'silver';
    const spec = { rows: 7, cols: 5, user: { row: 3, col: 2, side: 'ally', moveType }, mode: 'move' };
    const user = spec.user;
    let offsets = [];

    if (window.BattleRange32 && typeof window.BattleRange32.getMoveOffsets === 'function') {
      offsets = window.BattleRange32.getMoveOffsets(user) || [];
    } else {
      offsets = fallbackPartyMoveOffsets(moveType);
    }

    const cells = new Set();
    offsets.forEach(p => {
      const r = user.row + p.dr;
      const c = user.col + p.dc;
      if (r >= 0 && r < spec.rows && c >= 0 && c < spec.cols) cells.add(r + '-' + c);
    });

    let board = '<div class="ps-mini-range-board ps-mini-range-board-7x5 move-board mode-move" aria-label="移動範囲">';
    for (let r = 0; r < spec.rows; r++) {
      for (let c = 0; c < spec.cols; c++) {
        const cls = ['ps-mini-range-cell'];
        if (r === user.row && c === user.col) cls.push('self');
        else if (cells.has(r + '-' + c)) cls.push('move-target');
        board += '<span class="' + cls.join(' ') + '"></span>';
      }
    }
    board += '</div>';

    return `
      <div class="ps-detail-move-section">
        <div class="ps-detail-move-title">— MOVE —</div>
        <div class="ps-detail-move-list">
          <div class="ps-detail-move-card">
            <div class="ps-detail-move-row">
              <div>
                <div class="ps-detail-move-header">
                  <div class="ps-detail-move-name">${getPartyMoveTypeLabel(moveType)}</div>
                  <div class="ps-detail-move-type">移動</div>
                </div>
                <div class="ps-detail-move-desc">このキャラの移動可能マスを表示します。</div>
              </div>
              ${board}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function fallbackPartyMoveOffsets(moveType) {
    const presets = {
      pawn: [{ dr:-1, dc:0 }],
      front_1: [{ dr:-1, dc:0 }],
      lance: [{ dr:-1, dc:0 }, { dr:-2, dc:0 }, { dr:-3, dc:0 }],
      line_front_3: [{ dr:-1, dc:0 }, { dr:-2, dc:0 }, { dr:-3, dc:0 }],
      gold: [{ dr:-1, dc:0 }, { dr:0, dc:-1 }, { dr:0, dc:1 }],
      front_side_3: [{ dr:-1, dc:0 }, { dr:0, dc:-1 }, { dr:0, dc:1 }],
      silver: [{ dr:-1, dc:0 }, { dr:-1, dc:-1 }, { dr:-1, dc:1 }],
      front_diag_3: [{ dr:-1, dc:0 }, { dr:-1, dc:-1 }, { dr:-1, dc:1 }],
      rook_short: [{ dr:-1, dc:0 }, { dr:0, dc:-1 }, { dr:0, dc:1 }],
      shigure: [{ dr:-1, dc:0 }, { dr:1, dc:-1 }, { dr:1, dc:0 }, { dr:1, dc:1 }],
      front_back_row3: [{ dr:-1, dc:0 }, { dr:1, dc:-1 }, { dr:1, dc:0 }, { dr:1, dc:1 }],
      miyu: [{ dr:-1, dc:0 }, { dr:-2, dc:0 }, { dr:-3, dc:0 }],
      eri: [{ dr:-1, dc:0 }, { dr:1, dc:0 }, { dr:0, dc:-1 }, { dr:0, dc:1 }],
      cross_1: [{ dr:-1, dc:0 }, { dr:1, dc:0 }, { dr:0, dc:-1 }, { dr:0, dc:1 }],
      aki: [{ dr:-2, dc:0 }, { dr:2, dc:0 }, { dr:-2, dc:-1 }, { dr:-2, dc:1 }],
      vertical2_frontdiag2: [{ dr:-2, dc:0 }, { dr:2, dc:0 }, { dr:-2, dc:-1 }, { dr:-2, dc:1 }],
      asami: [{ dr:-1, dc:0 }, { dr:1, dc:0 }, { dr:-1, dc:-1 }, { dr:-1, dc:1 }],
      front_back_frontdiag: [{ dr:-1, dc:0 }, { dr:1, dc:0 }, { dr:-1, dc:-1 }, { dr:-1, dc:1 }],
      chisaka: [{ dr:-1, dc:0 }, { dr:0, dc:-1 }, { dr:0, dc:1 }, { dr:-2, dc:0 }, { dr:-2, dc:-2 }, { dr:-2, dc:2 }],
      front_side_jump: [{ dr:-1, dc:0 }, { dr:0, dc:-1 }, { dr:0, dc:1 }, { dr:-2, dc:0 }, { dr:-2, dc:-2 }, { dr:-2, dc:2 }],
      yuzuha: [{ dr:-2, dc:0 }, { dr:2, dc:-1 }, { dr:2, dc:1 }],
      front2_backdiag2: [{ dr:-2, dc:0 }, { dr:2, dc:-1 }, { dr:2, dc:1 }],
      bishop_short: [{ dr:-1, dc:-1 }, { dr:-1, dc:1 }, { dr:1, dc:-1 }],
      knight: [{ dr:-2, dc:-1 }, { dr:-2, dc:1 }],
      none: []
    };
    return presets[moveType] || presets.silver;
  }

  function buildPartySkillMiniBoard(sk) {
    const rawRange = sk && sk.range;
    if (!rawRange) return '';
    const range = normalizePartyMiniRange(rawRange);

    const spec = getPartyMiniRangeSpec(range);
    const user = spec.user;
    let cells = new Set();

    if (window.BattleRange32 && typeof window.BattleRange32.getCellsFromRange32 === 'function') {
      cells = window.BattleRange32.getCellsFromRange32(user, range) || new Set();
    } else {
      cells = fallbackPartyRangeCells(user, range);
    }

    const isAllySkill = sk.type === 'heal' || sk.type === 'buff' || (sk.effects || []).some(e => String(e.target || '').startsWith('ally'));
    let html = '<div class="ps-mini-range-board ps-mini-range-board-' + spec.rows + 'x' + spec.cols + ' mode-' + spec.mode + '" aria-label="スキル範囲">';
    for (let r = 0; r < spec.rows; r++) {
      for (let c = 0; c < spec.cols; c++) {
        const key = r + '-' + c;
        const cls = ['ps-mini-range-cell'];
        if (spec.rows === 8) {
          if (r <= 2) cls.push('enemy-zone');
          if (r >= 5) cls.push('ally-zone');
        }
        if (r === user.row && c === user.col) cls.push('self');
        else if (cells.has(key)) cls.push(isAllySkill ? 'ally-target' : 'target');
        html += '<span class="' + cls.join(' ') + '"></span>';
      }
    }
    html += '</div>';
    return html;
  }

  function fallbackPartyRangeCells(user, range) {
    const s = new Set();
    const add = (r, c) => {
      if (r >= 0 && r < 8 && c >= 0 && c < 5) s.add(r + '-' + c);
    };
    const rel = (list) => list.forEach(p => add(user.row + p.dr, user.col + p.dc));

    if (range === 'self') add(user.row, user.col);
    else if (range === 'ally_all' || range === 'enemy_all' || range === 'field_all' || range === 'all') {
      for (let r = user.row - 2; r <= user.row + 2; r++) {
        for (let c = user.col - 2; c <= user.col + 2; c++) add(r, c);
      }
    } else if (range === 'front_all_rows_ally') {
      for (let r = user.row - 1; r >= user.row - 4; r--) for (let c = user.col - 2; c <= user.col + 2; c++) add(r, c);
    } else if (range === 'front_row_3_ally' || range === 'front_row_3') {
      rel([{dr:-1,dc:-1},{dr:-1,dc:0},{dr:-1,dc:1}]);
    } else if (range === 'front_and_side_3_ally') {
      rel([{dr:-1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}]);
    } else if (range === 'fan_2row_3_ally') {
      rel([{dr:-1,dc:-1},{dr:-1,dc:0},{dr:-1,dc:1},{dr:-2,dc:-2},{dr:-2,dc:-1},{dr:-2,dc:0},{dr:-2,dc:1},{dr:-2,dc:2}]);
    } else if (range === 'pierce_all') {
      for (let r = user.row - 1; r >= user.row - 4; r--) add(r, user.col);
    } else if (range === 'pierce_ally_3' || range === 'pierce3' || range === 'front3') {
      rel([{dr:-1,dc:0},{dr:-2,dc:0},{dr:-3,dc:0}]);
    } else if (range === 'front2' || range === 'pierce_ally_2' || range === 'pierce2') {
      rel([{dr:-1,dc:0},{dr:-2,dc:0}]);
    } else if (range === 'front1' || range === 'front_ally') {
      rel([{dr:-1,dc:0}]);
    } else if (range === 'around8' || range === 'adjacent') {
      rel([{dr:-1,dc:-1},{dr:-1,dc:0},{dr:-1,dc:1},{dr:0,dc:-1},{dr:0,dc:1},{dr:1,dc:-1},{dr:1,dc:0},{dr:1,dc:1}]);
    } else if (range === 'around24') {
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (dr === 0 && dc === 0) continue;
          add(user.row + dr, user.col + dc);
        }
      }
    } else if (range === 'side_lr') {
      rel([{dr:0,dc:-1},{dr:0,dc:1}]);
    } else if (range === 'diag_x_1') {
      rel([{dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1},{dr:1,dc:1}]);
    } else if (range === 'diag_x_2') {
      rel([{dr:-1,dc:-1},{dr:-2,dc:-2},{dr:-1,dc:1},{dr:-2,dc:2},{dr:1,dc:-1},{dr:2,dc:-2},{dr:1,dc:1},{dr:2,dc:2}]);
    } else if (range === 'cross' || range === 'cross_32') {
      rel([{dr:-1,dc:0},{dr:-2,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}]);
    } else if (range === 'field_cross_center') {
      for (let r = 0; r < 8; r++) add(r, 2);
      for (let c = 0; c < 5; c++) add(2, c);
    } else if (range === 'cross_large') {
      rel([{dr:-1,dc:0},{dr:-2,dc:0},{dr:-3,dc:0},{dr:-4,dc:0},{dr:-2,dc:-2},{dr:-2,dc:-1},{dr:-2,dc:1},{dr:-2,dc:2}]);
    } else if (range === 'super_but_night_6') {
      rel([{dr:-1,dc:-2},{dr:-1,dc:-1},{dr:-1,dc:0},{dr:-1,dc:1},{dr:-1,dc:2},{dr:-2,dc:-1},{dr:-2,dc:0},{dr:-2,dc:1},{dr:-3,dc:0}]);
    } else {
      // 未定義でも空欄にせず、自分マスだけ出して「起点」を見せる
      add(user.row, user.col);
    }
    return s;
  }


  function showCharaDetail(charaId) {
    const chars = typeof CHARACTERS !== 'undefined' ? CHARACTERS : [];
    const chara = chars.find(c => c.id === charaId);
    if (!chara) return;

    let popup = document.getElementById('ps-chara-detail-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'ps-chara-detail-popup';
      popup.className = 'ps-detail-popup';
      popup.innerHTML = '<div class="ps-detail-box" id="ps-chara-detail-box"></div>';
      popup.onclick = e => { if (e.target === popup) closeCharaDetail(); };
      document.body.appendChild(popup);
    }

    const RARITY_LABEL = { r: 'R', sr: 'SR', ur: 'UR' };
    const TYPE_LABEL = { attack:'攻撃', debuff:'妨害', buff:'補助', heal:'回復', move:'移動', special:'特殊' };

    const skillsHTML = (chara.skills || []).map(sk => `
      <div class="ps-detail-skill">
        <div class="ps-detail-skill-header">
          <div class="ps-detail-skill-name">${sk.name}</div>
          <div class="ps-detail-skill-type ${sk.type}">${TYPE_LABEL[sk.type]||'スキル'}</div>
        </div>
        <div class="ps-detail-skill-main">
          <div>
            <div class="ps-detail-skill-desc">${sk.desc || '詳細情報なし'}</div>
            <div class="ps-detail-skill-hit">${buildSkillMetaText(sk)}</div>
          </div>
          ${buildPartySkillMiniBoard(sk)}
        </div>
      </div>
    `).join('');

    document.getElementById('ps-chara-detail-box').innerHTML = `
      <div class="ps-detail-hero">
        <img class="ps-detail-img" src="${getPartySelectImg(chara)}" onerror="this.style.opacity='0'">
        <div class="ps-detail-info">
          <div class="ps-detail-name">${chara.name}</div>
          <div class="ps-detail-rarity ${chara.rarity}">${RARITY_LABEL[chara.rarity] || ''}</div>
          <div class="ps-detail-stats">
            <div class="ps-detail-stat">
              <div class="ps-detail-stat-label">HP</div>
              <div class="ps-detail-stat-val">${chara.stats.HP}</div>
            </div>
            <div class="ps-detail-stat">
              <div class="ps-detail-stat-label">ATK</div>
              <div class="ps-detail-stat-val">${chara.stats.ATK}</div>
            </div>
            <!-- DEF / SPD は使用しないため非表示（設計整理 2025） -->
          </div>
        </div>
      </div>
      ${buildPartyMoveMiniBoard(chara)}
      <div class="ps-detail-skills-title">— SKILLS —</div>
      <div class="ps-detail-skill-list">${skillsHTML}</div>
      <button class="ps-detail-close" onclick="closeCharaDetail()">閉じる</button>
    `;

    requestAnimationFrame(() => popup.classList.add('active'));
  }

  window.closeCharaDetail = function () {
    const p = document.getElementById('ps-chara-detail-popup');
    if (p) p.classList.remove('active');
  };

  // キャラタップ：空き枠に追加、選択済みなら解除（左詰め）
  function onCharaTap(charaId) {
    if (_isFixedFirstChara(charaId)) return;

    const idx = selected.findIndex(s => s.charaId === charaId);
    if (idx !== -1) {
      // 選択解除 → 左詰め（ローグライトの1st固定エリは維持）
      selected.splice(idx, 1);
      _ensureRogueliteFixedFirst();
      renderSlots();
      renderCharaList();
      return;
    }
    // 枠が埋まっていたら無視
    if (selected.length >= _maxPartySize()) return;

    selected.push({ charaId });
    _ensureRogueliteFixedFirst();
    renderSlots();
    renderCharaList();
  }

  // ============================================================
  // 戦闘開始
  // ============================================================
  window.confirmPartySelect = function () {
    _ensureRogueliteFixedFirst();
    if (selected.length < _minPartySize()) return;

    // Battle32 に渡す partyIds（選択順の charaId 配列）
    const selectedCharaIds = selected.map(s => s.charaId);

    // 旧バトル用 party 情報（startEnemyIntro など既存フローへの互換）
    const chars = typeof CHARACTERS !== 'undefined' ? CHARACTERS : [];
    const party = selected.map(s => {
      const master = chars.find(c => c.id === s.charaId);
      if (!master) return null;
      const costMax    = master.costMax    ?? 10;
      const costStart  = master.costStart  ?? 5;
      const costRegen  = master.costRegen  ?? 3;
      const shinkiMax  = master.shinkiMax  ?? 3;
      const shinkiStart = master.shinkiStart ?? 0;
      const shinkiRegen = master.shinkiRegen ?? 1;
      return {
        id:       'chara_' + master.id,
        charaId:  master.id,
        name:     master.name,
        img:       master.battleImg || master.img,
        battleImg: master.battleImg || master.img,
        panelImg:  master.panelImg || master.upImg || master.img,
        upImg:    master.upImg,
        ultImg:   master.ultImg,
        cutImg:   master.ultImg || master.cutImg || master.upImg || master.battleImg || master.img,
        hp:       master.stats.HP,
        hpMax:    master.stats.HP,
        atk:      master.stats.ATK,
        // DEF / SPD は使用しない（設計整理 2025）
        accuracy: 250,
        cost:      Math.min(costStart, costMax),
        costMax,
        costRegen,
        shinki:      Math.min(shinkiStart, shinkiMax),
        shinkiMax,
        shinkiRegen,
        skills: master.skills.map(sk => ({ ...sk })),
      };
    }).filter(Boolean);

    // 敵データ解決
    // 優先順位: currentBattleOptions.enemies（インライン定義）> currentEnemyRef（ID参照）
    let enemyData;
    if (Array.isArray(currentBattleOptions.enemies) && currentBattleOptions.enemies.length > 0) {
      // stages.js に直接書かれた敵定義をそのまま演出用 enemyData として使う
      // enemy_intro.js が Array 対応済みのため先頭要素の img が演出に使われる
      enemyData = currentBattleOptions.enemies;
    } else if (Array.isArray(currentEnemyRef)) {
      enemyData = currentEnemyRef
        .map(id => {
          const master = typeof getEnemyById === 'function' ? getEnemyById(id) : null;
          return master ? JSON.parse(JSON.stringify(master)) : null;
        })
        .filter(Boolean);
    } else {
      const enemyMaster = (typeof getEnemyById === 'function')
        ? getEnemyById(currentEnemyRef)
        : null;
      enemyData = enemyMaster
        ? JSON.parse(JSON.stringify(enemyMaster))
        : {
            id: 'enemy_01', name: '??????',
            img: 'images/enemy_01.webp',
            upImg: 'images/enemy_01_up.webp',
            battleImg: 'images/enemy_01_battle.webp',
            hp: 1800, hpMax: 2000,
            atk: 375,
            phase: 1, status: [],
            actionPattern: [
              { turn: 1, action: '全体攻撃',   type: 'atk_all' },
              { turn: 2, action: '単体攻撃',   type: 'atk_single' },
              { turn: 3, action: '中縦列攻撃', type: 'atk_center' },
              { turn: 4, action: '十字攻撃',   type: 'atk_cross' },
            ],
            actionIdx: 0,
          };
    }

    window._saveLastParty && window._saveLastParty(party);
    closePartySelect();

    // currentBattleOptions のすべてのフィールド（enemies / enemyActionMode /
    // enemyActionsPerTurn / turnLimit / bossCaptureMax / enemySpawn 等）を透過的に引き継ぐ。
    // partyIds だけ編成選択結果で上書きする。
    const mergedOptions = Object.assign({}, currentBattleOptions, {
      partyIds: selectedCharaIds,
    });

    // ─── ローグライト分岐 ─────────────────────────────────────
    // battleMode: 'roguelite' のとき RogueliteController.startRun へ流す
    if (mergedOptions.battleMode === 'roguelite') {
      setTimeout(() => {
        if (window.RogueliteController && typeof window.RogueliteController.startRun === 'function') {
          window.RogueliteController.startRun(selectedCharaIds);
        } else {
          console.error('[party_select] RogueliteController が見つかりません。roguelite_controller.js を読み込んでいるか確認してください。');
        }
      }, 400);
      return;  // 通常の startEnemyIntro は呼ばない
    }
    // ─────────────────────────────────────────────────────────

    setTimeout(() => startEnemyIntro(enemyData, party, mergedOptions), 400);
  };

  // ============================================================
  // 開閉
  // ============================================================
  window.openPartySelect = function (enemyIdOrIds, options) {
    currentEnemyRef = enemyIdOrIds || 'enemy_01';
    currentBattleOptions = options || {};

    buildModal();
    selected = [];
    _ensureRogueliteFixedFirst();
    const el = document.getElementById('party-select-modal');
    el.style.display = 'flex';
    void el.offsetWidth;
    el.style.opacity = '1';
    renderSlots();
    renderCharaList();
  };

  window.closePartySelect = function () {
    const el = document.getElementById('party-select-modal');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; }, 400);
  };

})();
