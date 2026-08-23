// noah_piece.js
(function(){
  'use strict';

  const PIECE_KEY = 'sasaphia_noah_piece_count_v1';
  const MAX_PIECES = 9;
  const STAGE_ID = 'shooting_event_bullet_hell_test';

  function clampPieceCount(value){
    const n = Math.floor(Number(value || 0));
    return Math.max(0, Math.min(MAX_PIECES, Number.isFinite(n) ? n : 0));
  }

  function getNoahPieceCount(){
    try {
      return clampPieceCount(localStorage.getItem(PIECE_KEY));
    } catch (_) {
      return 0;
    }
  }

  function saveNoahPieceCount(value){
    const count = clampPieceCount(value);
    try { localStorage.setItem(PIECE_KEY, String(count)); } catch (_) {}
    renderNoahPiecePanel();
    return count;
  }

  function getSpecialTicketCount(){
    const profileValue = Number(window.userProfile && window.userProfile.special_stage_ticket);
    if (Number.isFinite(profileValue)) return Math.max(0, Math.floor(profileValue));

    const el = document.getElementById('special-ticket-count');
    const domValue = Number(el && el.textContent);
    return Number.isFinite(domValue) ? Math.max(0, Math.floor(domValue)) : 0;
  }

  function buildPanel(){
    if (document.getElementById('noah-piece-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'noah-piece-overlay';
    overlay.className = 'noah-piece-overlay';
    overlay.setAttribute('aria-hidden','true');

    const pieceHtml = Array.from({length:9}, (_, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = col * 50;
      const y = row * 50;
      return '<div class="noah-puzzle-piece locked" data-noah-piece="' + (i + 1) + '" ' +
        'style="background-position:' + x + '% ' + y + '%"></div>';
    }).join('');

    overlay.innerHTML =
      '<section class="noah-piece-screen" role="dialog" aria-modal="true" aria-labelledby="noah-piece-title">' +
        '<header class="noah-piece-head">' +
          '<button type="button" class="noah-piece-back" onclick="closeNoahPiecePanel()">‹ 戻る</button>' +
          '<div class="noah-piece-title">' +
            '<small>SPECIAL STAGE</small>' +
            '<strong id="noah-piece-title">楽園 -ノア-</strong>' +
          '</div>' +
          '<div class="noah-piece-ticket">所持枚数 <b id="noah-piece-ticket-count">0</b>枚</div>' +
        '</header>' +
        '<div class="noah-piece-body">' +
          '<div class="noah-piece-lead">' +
            '<div class="en">FRAGMENTS OF PARADISE</div>' +
            '<h2>失われた楽園を完成させる</h2>' +
            '<p>ノアを打ち破り、欠片を集める。<br>9つの欠片が揃ったとき、ひとつの姿が完成する。</p>' +
          '</div>' +
          '<div class="noah-piece-progress">' +
            '<span class="noah-piece-progress-label">完成状況</span>' +
            '<strong id="noah-piece-progress-now">0</strong><span>/ 9</span>' +
          '</div>' +
          '<div class="noah-puzzle-frame">' +
            '<div class="noah-puzzle-grid" id="noah-puzzle-grid">' + pieceHtml + '</div>' +
          '</div>' +
          '<div class="noah-piece-note">ステージクリアごとに、ノアの欠片を1つ獲得できます。</div>' +
        '</div>' +
        '<footer class="noah-piece-actions">' +
          '<button type="button" class="noah-piece-challenge" id="noah-piece-challenge" onclick="challengeNoahSpecialStage()">' +
            '<small>SPECIAL STAGE TICKET ×1</small>' +
            'チケットを1枚消費して ノアに挑戦する' +
          '</button>' +
          '<div class="noah-piece-complete" id="noah-piece-complete">楽園の欠片がすべて揃いました。</div>' +
        '</footer>' +
      '</section>';

    document.body.appendChild(overlay);
  }

  function renderNoahPiecePanel(){
    buildPanel();
    const count = getNoahPieceCount();
    const ticket = getSpecialTicketCount();

    const progress = document.getElementById('noah-piece-progress-now');
    if (progress) progress.textContent = String(count);

    const ticketEl = document.getElementById('noah-piece-ticket-count');
    if (ticketEl) ticketEl.textContent = String(ticket);

    document.querySelectorAll('[data-noah-piece]').forEach(function(el){
      const pieceNo = Number(el.getAttribute('data-noah-piece') || 0);
      const open = pieceNo <= count;
      el.classList.toggle('locked', !open);
      el.classList.toggle('open', open);
    });

    const button = document.getElementById('noah-piece-challenge');
    if (button) {
      button.disabled = ticket < 1;
      button.querySelector('small').textContent = ticket < 1
        ? 'SPECIAL STAGE TICKET がありません'
        : 'SPECIAL STAGE TICKET ×1';
    }

    const complete = document.getElementById('noah-piece-complete');
    if (complete) complete.classList.toggle('show', count >= MAX_PIECES);
  }

  function openNoahPiecePanel(){
    buildPanel();
    if (typeof window.refreshSpecialTicketUI === 'function') {
      try {
        const p = window.refreshSpecialTicketUI();
        if (p && typeof p.then === 'function') {
          p.finally(renderNoahPiecePanel);
        }
      } catch (_) {}
    }
    renderNoahPiecePanel();

    const overlay = document.getElementById('noah-piece-overlay');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden','false');
  }

  function closeNoahPiecePanel(){
    const overlay = document.getElementById('noah-piece-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden','true');
  }

  function challengeNoahSpecialStage(){
    const ticket = getSpecialTicketCount();
    if (ticket < 1) {
      if (typeof window.showToast === 'function') window.showToast('SPECIAL STAGE TICKETがありません');
      else alert('SPECIAL STAGE TICKETがありません');
      return;
    }

    closeNoahPiecePanel();

    // 現在のノア戦は既存シューティングステージへ接続する。
    // チケット消費はシューティング側の「戦闘開始」処理で行う設計。
    if (typeof window.openShootingEvent === 'function') {
      window.openShootingEvent({ stageId: STAGE_ID });
    } else {
      console.error('[NoahPiece] openShootingEvent is not available');
    }
  }

  // クリア報酬接続用API。今回はプレイアブル化までは行わない。
  function addNoahPiece(amount){
    const before = getNoahPieceCount();
    return saveNoahPieceCount(before + Math.max(1, Math.floor(Number(amount || 1))));
  }

  window.getNoahPieceCount = getNoahPieceCount;
  window.setNoahPieceCount = saveNoahPieceCount;
  window.addNoahPiece = addNoahPiece;
  window.renderNoahPiecePanel = renderNoahPiecePanel;
  window.openNoahPiecePanel = openNoahPiecePanel;
  window.closeNoahPiecePanel = closeNoahPiecePanel;
  window.challengeNoahSpecialStage = challengeNoahSpecialStage;

  window.addEventListener('pageshow', function(){
    if (document.getElementById('noah-piece-overlay')) renderNoahPiecePanel();
  });
})();
