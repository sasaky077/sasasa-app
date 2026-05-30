// party_select.js
// 9マスポジション対応編成モーダル
// ポジション: row(near/mid/far) × col(left/center/right)

(function () {

  const ROWS = ['near', 'mid', 'far', 'deep'];
  const COLS = ['left', 'center', 'right', 'outer'];
  const ROW_LABEL = { near: '近', mid: '中', far: '遠', deep: '深' };
  const COL_LABEL = { left: '左', center: '中', right: '右', outer: '外' };

  // selected: { charaId, row, col }[]  最大4件
  let selected = [];

  // ▼ 修正：現在選択中のステージ敵ID（文字列 or 配列）
  let currentEnemyRef = 'enemy_01';
  let currentBattleOptions = {};

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

    // 列ラベル
    const colLabels = COLS.map(c =>
      `<div class="ps-col-label">${COL_LABEL[c]}</div>`
    ).join('');

    // 9マスグリッド
    const gridRows = ROWS.map(row => `
      <div class="ps-grid-row">
        <div class="ps-row-label">${ROW_LABEL[row]}</div>
        ${COLS.map(col => `
          <div class="ps-cell ps-cell-empty" id="ps-cell-${row}-${col}"
               onclick="onCellTap('${row}','${col}')">
            <div class="ps-cell-plus">＋</div>
          </div>
        `).join('')}
      </div>
    `).join('');

    el.innerHTML = `
      <div class="ps-header">
        <div class="ps-title">部隊編成</div>
        <div class="ps-sub">1〜4人選択 · マスをタップして配置</div>
      </div>

      <div class="ps-grid-wrap">
        <div class="ps-col-labels">
          <div class="ps-row-label-spacer"></div>
          ${colLabels}
        </div>
        <div class="ps-grid" id="ps-grid">
          ${gridRows}
        </div>
      </div>

      <div class="ps-list-wrap">
        <div class="ps-selecting-hint" id="ps-selecting-hint" style="display:none">
          配置するマスを選んでください
        </div>
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

      /* グリッド */
      .ps-grid-wrap {
        flex-shrink: 0;
        padding: 10px 14px 8px;
        background: rgba(0,0,0,0.45);
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .ps-col-labels {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
      }
      .ps-row-label-spacer {
        width: 20px;
        flex-shrink: 0;
      }
      .ps-col-label {
        flex: 1;
        text-align: center;
        font-family: "Cinzel", serif;
        font-size: 9px;
        letter-spacing: 2px;
        color: rgba(232,228,220,0.3);
      }
      .ps-grid {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .ps-grid-row {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .ps-row-label {
        width: 20px;
        flex-shrink: 0;
        text-align: center;
        font-family: "Cinzel", serif;
        font-size: 10px;
        letter-spacing: 1px;
        color: rgba(232,228,220,0.35);
      }
      .ps-cell {
        flex: 1;
        aspect-ratio: 1;
        border-radius: 7px;
        border: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.03);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        transition: border-color 0.15s, background 0.15s;
        -webkit-tap-highlight-color: transparent;
      }
      .ps-cell.ps-cell-empty {
        pointer-events: none;
      }
      .ps-cell.ps-cell-selectable {
        pointer-events: auto;
        border-color: rgba(232,228,220,0.25);
        background: rgba(232,228,220,0.04);
        animation: cellPulse 1.2s ease-in-out infinite;
      }
      @keyframes cellPulse {
        0%,100% { border-color: rgba(232,228,220,0.2); }
        50%      { border-color: rgba(232,228,220,0.5); }
      }
      .ps-cell.filled {
        border-color: rgba(232,228,220,0.3);
        pointer-events: auto;
      }
      .ps-cell.filled:active { background: rgba(255,80,80,0.1); }
      .ps-cell-plus {
        font-size: 14px;
        color: rgba(232,228,220,0.12);
      }
      .ps-cell-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top center;
      }
      .ps-cell-name {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        font-size: 7px;
        color: rgba(232,228,220,0.85);
        background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
        text-align: center;
        padding: 5px 1px 1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ps-cell-remove {
        position: absolute;
        top: 1px; right: 1px;
        width: 13px; height: 13px;
        border-radius: 50%;
        background: rgba(0,0,0,0.65);
        color: rgba(255,255,255,0.6);
        font-size: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* キャラ一覧 */
      .ps-list-wrap {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 8px 10px 0;
      }
      .ps-selecting-hint {
        font-size: 11px;
        letter-spacing: 2px;
        color: rgba(232,228,220,0.5);
        text-align: center;
        padding: 6px 0 8px;
        animation: cellPulse 1.2s ease-in-out infinite;
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
      .ps-chara-card.selecting {
        outline: 2px solid rgba(232,228,220,0.6);
        border-radius: 9px;
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
      .ps-chara-img-wrap img {
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
      .ps-detail-close {
        width: calc(100% - 28px); margin: 14px 14px 0;
        padding: 12px; border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);
        color: rgba(232,228,220,0.6); font-size: 13px; letter-spacing: 2px;
        cursor: pointer; font-family: "Noto Serif JP", serif; display: block;
      }
      .ps-detail-close:active { background: rgba(255,255,255,0.1); }
      .ps-chara-card.pressing .ps-chara-img-wrap {
        border-color: rgba(232,228,220,0.5);
        transform: scale(0.95);
        transition: transform 0.1s;
      }
    `;
    document.body.appendChild(s);
  }

  // ============================================================
  // 状態
  // ============================================================
  let pendingCharaId = null; // マス選択待ちのキャラID

  // ============================================================
  // グリッドレンダリング
  // ============================================================
  function renderGrid() {
    ROWS.forEach(row => {
      COLS.forEach(col => {
        const cell = document.getElementById('ps-cell-' + row + '-' + col);
        if (!cell) return;

        const entry = selected.find(s => s.row === row && s.col === col);
        const isSelectable = pendingCharaId !== null && !entry;

        if (entry) {
          const chara = CHARACTERS.find(c => c.id === entry.charaId);
          cell.className = 'ps-cell filled';
          cell.innerHTML = `
            <img class="ps-cell-img" src="${chara.upImg || chara.img}" onerror="this.style.opacity='0'">
            <div class="ps-cell-name">${chara.name}</div>
            <div class="ps-cell-remove">✕</div>
          `;
        } else if (isSelectable) {
          cell.className = 'ps-cell ps-cell-selectable';
          cell.innerHTML = '<div class="ps-cell-plus">＋</div>';
        } else {
          cell.className = 'ps-cell ps-cell-empty';
          cell.innerHTML = '<div class="ps-cell-plus">＋</div>';
        }
      });
    });

    const btn = document.getElementById('ps-btn-start');
    if (btn) btn.disabled = selected.length < 1;

    // ヒント表示
    const hint = document.getElementById('ps-selecting-hint');
    if (hint) hint.style.display = pendingCharaId ? 'block' : 'none';
  }

  // ============================================================
  // キャラ一覧レンダリング
  // ============================================================
  function renderCharaList() {
    const list = document.getElementById('ps-chara-list');
    if (!list) return;
    list.innerHTML = '';

    CHARACTERS.forEach(c => {
      const owned = typeof collected !== 'undefined' && !!collected[c.id];
      const isSelected = selected.some(s => s.charaId === c.id);
      const isPending = pendingCharaId === c.id;

      const card = document.createElement('div');
      card.className = 'ps-chara-card'
        + (!owned ? ' not-owned' : '')
        + (isSelected ? ' selected' : '')
        + (isPending ? ' selecting' : '');
      card.innerHTML = `
        <div class="ps-chara-img-wrap">
          <img src="${c.upImg || c.img}" onerror="this.style.opacity='0'">
          <div class="ps-rarity-dot ${c.rarity}"></div>
          <div class="ps-chara-check">✓</div>
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

  function showCharaDetail(charaId) {
    const chara = CHARACTERS.find(c => c.id === charaId);
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
    const TYPE_LABEL = { attack:'攻撃', debuff:'妨害', buff:'補助', move:'移動', special:'特殊' };

    const skillsHTML = (chara.skills || []).map(sk => `
      <div class="ps-detail-skill">
        <div class="ps-detail-skill-header">
          <div class="ps-detail-skill-name">${sk.name}</div>
          <div class="ps-detail-skill-type ${sk.type}">${TYPE_LABEL[sk.type]||'スキル'}</div>
        </div>
        <div class="ps-detail-skill-desc">${sk.desc || '詳細情報なし'}</div>
        <div class="ps-detail-skill-hit">${sk.hit < 100 ? 'HIT ' + sk.hit + '%' : '確定命中'} / CD ${sk.cdMax}ターン</div>
      </div>
    `).join('');

    document.getElementById('ps-chara-detail-box').innerHTML = `
      <div class="ps-detail-hero">
        <img class="ps-detail-img" src="${chara.upImg || chara.img}" onerror="this.style.opacity='0'">
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
            <div class="ps-detail-stat">
              <div class="ps-detail-stat-label">DEF</div>
              <div class="ps-detail-stat-val">${chara.stats.DEF}</div>
            </div>
            <div class="ps-detail-stat">
              <div class="ps-detail-stat-label">SPD</div>
              <div class="ps-detail-stat-val">${chara.stats.SPD}</div>
            </div>
          </div>
        </div>
      </div>
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

  function onCharaTap(charaId) {
    // 選択済みなら外す
    const idx = selected.findIndex(s => s.charaId === charaId);
    if (idx !== -1) {
      selected.splice(idx, 1);
      pendingCharaId = null;
      renderGrid();
      renderCharaList();
      return;
    }
    // 4人埋まってたら無視
    if (selected.length >= 4) return;

    // マス選択モードへ
    if (pendingCharaId === charaId) {
      pendingCharaId = null;
    } else {
      pendingCharaId = charaId;
    }
    renderGrid();
    renderCharaList();
  }

  // マスタップ
  window.onCellTap = function (row, col) {
    const entry = selected.find(s => s.row === row && s.col === col);

    // 埋まってるマスをタップ→そのキャラを外す
    if (entry) {
      const idx = selected.indexOf(entry);
      selected.splice(idx, 1);
      if (pendingCharaId === entry.charaId) pendingCharaId = null;
      renderGrid();
      renderCharaList();
      return;
    }

    // マス選択待ち中なら配置
    if (pendingCharaId !== null) {
      selected.push({ charaId: pendingCharaId, row, col });
      pendingCharaId = null;
      renderGrid();
      renderCharaList();
    }
  };

  // ============================================================
  // 戦闘開始  ▼ 修正：currentEnemyId を使う
  // ============================================================
  window.confirmPartySelect = function () {
    if (selected.length < 1) return;

    const party = selected.map(s => {
      const master = CHARACTERS.find(c => c.id === s.charaId);
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

      // 盤面用
        img:       master.battleImg || master.img,
        battleImg: master.battleImg || master.img,

      // 下部パネル用
        panelImg:  master.panelImg || master.upImg || master.img,

      // ULTカットイン用
        upImg:    master.upImg,
        ultImg:   master.ultImg,
        cutImg:   master.ultImg || master.cutImg || master.upImg || master.battleImg || master.img,

        hp:       master.stats.HP,
        hpMax:    master.stats.HP,
        atk:      master.stats.ATK,
        def:      master.stats.DEF,
        spd:      master.stats.SPD,
        accuracy: 250,
        row:      s.row,
        col:      s.col,
        pos:      s.row,
        cost:      Math.min(costStart, costMax),
        costMax:   costMax,
        costRegen: costRegen,
        shinki:      Math.min(shinkiStart, shinkiMax),
        shinkiMax:   shinkiMax,
        shinkiRegen: shinkiRegen,
        skills: master.skills.map(sk => ({ ...sk })),
      };
      });

    // ▼ 修正：単体 or 複数敵の両方に対応
    let enemyData;
    if (Array.isArray(currentEnemyRef)) {
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
            // enemies.jsが未ロードの場合のフォールバック（開発用）
            id: 'enemy_01', name: '??????',
            img: 'images/enemy_01.webp',
            upImg: 'images/enemy_01_up.webp',
            battleImg: 'images/enemy_01_battle.webp',
            hp: 1800, hpMax: 2000,
            atk: 375, def: 280, spd: 260,
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

    // [Battle32] 選択キャラIDを options に追加し、battleMode:'32' 時に Battle32.start へ渡せるようにする
    const selectedCharaIds = selected.map(p => p.charaId);
    const mergedOptions = Object.assign({}, currentBattleOptions, {
      partyIds: selectedCharaIds,
    });

    setTimeout(() => startEnemyIntro(enemyData, party, mergedOptions), 400);
  };

  // ============================================================
  // 開閉  ▼ 修正：enemyId を引数で受け取る
  // ============================================================
  window.openPartySelect = function (enemyIdOrIds, options) {
    // 敵ID（文字列 or 配列）をセット
    currentEnemyRef = enemyIdOrIds || 'enemy_01';
    currentBattleOptions = options || {};

    buildModal();
    selected = [];
    pendingCharaId = null;
    const el = document.getElementById('party-select-modal');
    el.style.display = 'flex';
    void el.offsetWidth;
    el.style.opacity = '1';
    renderGrid();
    renderCharaList();
  };

  window.closePartySelect = function () {
    const el = document.getElementById('party-select-modal');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; }, 400);
    pendingCharaId = null;
  };

})();
