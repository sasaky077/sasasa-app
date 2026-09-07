// noah_piece.js
(function(){
  'use strict';

  const PIECE_KEY = 'sasaphia_noah_piece_count_v1'; // 表示キャッシュのみ
  const MAX_PIECES = 9;
  const STAGE_ID = 'shooting_event_bullet_hell_test';

  let serverPieceCount = null;
  let finishPending = false;

  function clampPieceCount(value){
    const n = Math.floor(Number(value || 0));
    return Math.max(0, Math.min(MAX_PIECES, Number.isFinite(n) ? n : 0));
  }

  function getCachedPieceCount(){
    try { return clampPieceCount(localStorage.getItem(PIECE_KEY)); }
    catch (_) { return 0; }
  }

  function getNoahPieceCount(){
    return serverPieceCount == null ? getCachedPieceCount() : clampPieceCount(serverPieceCount);
  }

  function setDisplayPieceCount(value){
    const count = clampPieceCount(value);
    serverPieceCount = count;
    try { localStorage.setItem(PIECE_KEY, String(count)); } catch (_) {}
    renderNoahPiecePanel();
    return count;
  }

  async function refreshNoahProgress(){
    const sb = window.zsSupabase;
    const userId = String(localStorage.getItem('zukan_user_id') || '').trim();
    if (!sb || !userId) return getNoahPieceCount();

    try {
      const res = await sb.from('noah_progress')
        .select('piece_count')
        .eq('user_id', userId)
        .maybeSingle();

      if (res && res.error) throw res.error;
      setDisplayPieceCount(res && res.data ? res.data.piece_count : 0);
    } catch (err) {
      console.warn('[NoahPiece] progress load failed:', err);
    }
    return getNoahPieceCount();
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
      button.disabled = ticket < 1 || count >= MAX_PIECES;
      const small = button.querySelector('small');
      if (small) {
        small.textContent = count >= MAX_PIECES
          ? 'ノア解放済み'
          : (ticket < 1 ? 'SPECIAL STAGE TICKET がありません' : 'SPECIAL STAGE TICKET ×1');
      }
    }

    const complete = document.getElementById('noah-piece-complete');
    if (complete) complete.classList.toggle('show', count >= MAX_PIECES);
  }

  async function openNoahPiecePanel(){
    buildPanel();
    if (typeof window.refreshSpecialTicketUI === 'function') {
      try { await window.refreshSpecialTicketUI(); } catch (_) {}
    }
    await refreshNoahProgress();
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

    if (typeof window.openShootingEvent === 'function') {
      window.openShootingEvent({ stageId: STAGE_ID });
    } else {
      console.error('[NoahPiece] openShootingEvent is not available');
    }
  }

  async function syncUnlockedNoahToLocal(characterRowId){
    if (!characterRowId) return;
    try {
      const sb = window.zsSupabase;
      if (!sb) return;

      const rowRes = await sb.from('collected_characters')
        .select('*')
        .eq('id', Number(characterRowId))
        .maybeSingle();
      if (rowRes && rowRes.error) throw rowRes.error;
      const row = rowRes && rowRes.data;
      if (!row) return;

      const chara = typeof getCharaById === 'function' ? getCharaById(52) : null;
      if (!chara) return;

      const entry = typeof buildOwnedEntryFromChara === 'function'
        ? buildOwnedEntryFromChara(chara, row)
        : (typeof createCharaSummonData === 'function'
            ? createCharaSummonData(chara, new Date(row.captured_at || Date.now()))
            : null);

      if (!entry) return;
      entry.db_id = row.id;

      if (typeof box !== 'undefined' && Array.isArray(box) &&
          !box.some(x => x && Number(x.db_id) === Number(entry.db_id))) {
        box.push(entry);
      }
      if (typeof collected !== 'undefined' && collected) {
        collected[52] = collected[52] || entry;
      }

      try { if (typeof renderBox === 'function') renderBox(); } catch (_) {}
      try { if (typeof updateMainUI === 'function') updateMainUI(); } catch (_) {}
      try { if (typeof updateZukanLimitBreakNotice === 'function') updateZukanLimitBreakNotice(); } catch (_) {}
      try { if (typeof window.refreshShootingRoster === 'function') window.refreshShootingRoster(); } catch (_) {}
    } catch (err) {
      console.warn('[NoahPiece] local Noah sync failed:', err);
    }
  }

  async function finishNoahClear(){
    if (finishPending) return;

    const attemptId = String(window.__noahAttemptId || '');
    if (!attemptId) {
      console.warn('[NoahPiece] no attempt id; clear reward skipped');
      return;
    }

    const sb = window.zsSupabase;
    if (!sb || typeof sb.rpc !== 'function') return;

    finishPending = true;
    try {
      const res = await sb.rpc('finish_noah_attempt', { p_attempt_id: attemptId });
      if (res && res.error) throw res.error;

      let data = res ? res.data : null;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (_) {}
      }
      if (!data || data.ok === false) {
        throw new Error((data && data.message) || 'ノアの欠片を受け取れませんでした');
      }

      window.__noahAttemptId = null;
      const before = getNoahPieceCount();
      const after = setDisplayPieceCount(data.piece_count);

      if (data.unlocked_noah) {
        await syncUnlockedNoahToLocal(data.character_row_id);
        if (typeof window.showNoahCompletePopup === 'function') {
          try { window.showNoahCompletePopup(); } catch (_) {}
        } else if (typeof window.showToast === 'function') {
          window.showToast('ノアが解放されました');
        }
      } else if (after > before && typeof window.showToast === 'function') {
        window.showToast('ノアの欠片を1つ獲得しました');
      }
    } catch (err) {
      console.error('[NoahPiece] finish attempt failed:', err);
      if (typeof window.showToast === 'function') {
        window.showToast(err && err.message ? err.message : 'ノアの欠片の受取に失敗しました');
      }
    } finally {
      finishPending = false;
    }
  }

  function handleShootingStageResult(event){
    const detail = event && event.detail ? event.detail : null;
    if (!detail || detail.stageId !== STAGE_ID) return;

    if (detail.win) {
      void finishNoahClear();
    } else {
      // 敗北したattemptは報酬に使わず、次の挑戦では新しいattemptを発行する。
      window.__noahAttemptId = null;
    }
  }

  window.getNoahPieceCount = getNoahPieceCount;
  window.setNoahPieceCount = setDisplayPieceCount;
  window.refreshNoahProgress = refreshNoahProgress;
  window.renderNoahPiecePanel = renderNoahPiecePanel;
  window.openNoahPiecePanel = openNoahPiecePanel;
  window.closeNoahPiecePanel = closeNoahPiecePanel;
  window.challengeNoahSpecialStage = challengeNoahSpecialStage;

  window.addEventListener('shooting-stage-result', handleShootingStageResult);
  window.addEventListener('pageshow', function(){
    void refreshNoahProgress();
  });
})();
