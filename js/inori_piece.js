// ZERAPHIA build1819 — 特別巡行「境界者 -イノリ-」
//  ノアの「楽園 -ノア-」と同じ仕組み：
//   ・イノリ挑戦TICKET（インベントリ inori_challenge_ticket）を1枚使って挑戦（消費は begin_inori_attempt）
//   ・クリアで「イノリの欠片」を1つ（finish_inori_attempt）。9つ揃うとイノリ（ID111）が仲間になる。
//   ・揃うと次の周回へ。2周目以降は揃うたびにイノリをもう1体（限界突破用）。周回ごとに敵が強くなる。
//  見た目はノアの欠片パネルを流用（クラス名は noah-*、配色・配置は css/inori_piece.css が #inori-piece-overlay に複製）。
//  欠片数・周回はサーバーが正。ここは表示キャッシュだけを持つ。
(function(){
  'use strict';

  const PIECE_KEY = 'zeraphia_inori_piece_count_v1'; // 表示キャッシュのみ
  const MAX_PIECES = 9;
  const STAGE_ID = 'shooting_special_inori';
  const CHARACTER_ID = 111;
  const TICKET_ID = 'inori_challenge_ticket';
  const LAP_GRADES = ['通常', '困難', '激戦', '極限', '最高難易度'];

  let serverPieceCount = null;
  let serverLap = 1;
  let lastRewardMessage = '';
  let finishPending = false;

  function clampPieceCount(value){
    const n = Math.floor(Number(value || 0));
    return Math.max(0, Math.min(MAX_PIECES, Number.isFinite(n) ? n : 0));
  }
  function getCachedPieceCount(){
    try { return clampPieceCount(localStorage.getItem(PIECE_KEY)); } catch (_) { return 0; }
  }
  function getInoriPieceCount(){
    return serverPieceCount == null ? getCachedPieceCount() : clampPieceCount(serverPieceCount);
  }
  function setDisplayPieceCount(value){
    const count = clampPieceCount(value);
    serverPieceCount = count;
    try { localStorage.setItem(PIECE_KEY, String(count)); } catch (_) {}
    renderInoriPiecePanel();
    return count;
  }
  function lapLabel(lap){ return lap + '周目 ・ ' + LAP_GRADES[Math.min(lap, LAP_GRADES.length) - 1]; }
  function toast(msg){ if (typeof window.showToast === 'function') window.showToast(msg); else if (msg) console.info('[InoriPiece]', msg); }

  function getTicketCount(){
    const T = window.ItemTickets;
    return T ? T.getCount(TICKET_ID) : 0;
  }
  async function refreshTicketCount(){
    const T = window.ItemTickets;
    if (T) { try { await T.fetchCounts(true); } catch (_) {} }
    renderEntryCard();
    renderInoriPiecePanel();
    return getTicketCount();
  }

  async function refreshInoriProgress(){
    const sb = window.zsSupabase;
    if (!sb || typeof sb.rpc !== 'function') return getInoriPieceCount();
    try {
      const res = await sb.rpc('get_inori_progress_secure');
      if (res && res.error) throw res.error;
      let data = res ? res.data : null;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch (_) {} }
      if (!data || data.ok !== true || !Number.isInteger(Number(data.lap)) || Number(data.lap) < 1) throw new Error('invalid Inori progress');
      serverLap = Number(data.lap);
      window.__inoriLap = serverLap;
      setDisplayPieceCount(data.piece_count);
      renderEntryCard();
    } catch (err) {
      console.warn('[InoriPiece] progress load failed:', err);
    }
    return getInoriPieceCount();
  }

  // ------------------------------------------------------------
  // 巡行（特別巡行）の入口カード：周回と所持TICKET
  // ------------------------------------------------------------
  function renderEntryCard(){
    const lapEl = document.getElementById('inori-stage-lap-label');
    if (lapEl) lapEl.textContent = lapLabel(serverLap);
    const countEl = document.getElementById('inori-ticket-count');
    if (countEl) countEl.textContent = window.ItemTickets ? String(getTicketCount()) : '--';
  }

  // ------------------------------------------------------------
  // 欠片パネル（ノアと同じ構成）
  // ------------------------------------------------------------
  function buildPanel(){
    if (document.getElementById('inori-piece-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'inori-piece-overlay';
    overlay.className = 'noah-piece-overlay inori-piece-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    const pieceHtml = Array.from({ length:9 }, (_, i) => {
      const x = (i % 3) * 50, y = Math.floor(i / 3) * 50;
      return '<div class="noah-puzzle-piece locked" data-inori-piece="' + (i + 1) + '" style="background-position:' + x + '% ' + y + '%"></div>';
    }).join('');
    overlay.innerHTML =
      '<section class="noah-piece-screen" role="dialog" aria-modal="true" aria-labelledby="inori-piece-title">' +
        '<header class="noah-piece-head">' +
          '<button type="button" class="noah-piece-back" data-inori-close>‹ 戻る</button>' +
          '<div class="noah-piece-title"><small>SPECIAL STAGE</small><strong id="inori-piece-title">境界者 -イノリ-</strong></div>' +
          '<div class="noah-piece-head-spacer" aria-hidden="true"></div>' +
        '</header>' +
        '<div class="noah-piece-body">' +
          '<div class="noah-piece-lead">' +
            '<div class="en">FRAGMENTS OF THE BOUNDARY</div>' +
            '<p>イノリを打ち破り、欠片を集める。<br>9つの欠片が揃ったとき、祈りは仲間になる。</p>' +
          '</div>' +
          '<div class="noah-piece-lap-row" style="text-align:center;margin:6px 0 -6px;font:600 13px/1.2 \'Noto Serif JP\',serif;letter-spacing:.18em;color:#8c6c48;text-shadow:0 0 6px #fff,0 0 2px #fff;white-space:nowrap">' +
            '<span style="font:600 10px/1 Cinzel,serif;letter-spacing:.24em;opacity:.8;margin-right:6px">LAP</span><b id="inori-piece-lap" style="font-weight:700">1周目</b>' +
          '</div>' +
          '<div class="noah-piece-progress">' +
            '<span class="noah-piece-progress-label" style="white-space:nowrap">完成状況</span>' +
            '<strong id="inori-piece-progress-now">0</strong><span style="white-space:nowrap">/ 9</span>' +
          '</div>' +
          '<div class="noah-puzzle-frame"><div class="noah-puzzle-grid" id="inori-puzzle-grid">' + pieceHtml + '</div></div>' +
          '<div class="noah-piece-note" id="inori-piece-note">ステージクリアごとに、イノリの欠片を1つ獲得できます。</div>' +
        '</div>' +
        '<footer class="noah-piece-actions">' +
          '<button type="button" class="noah-piece-challenge" id="inori-piece-challenge"><span class="stage-ticket-button-title">イノリに挑戦する</span><span class="stage-ticket-button-count">所持チケット：<b id="inori-piece-ticket-count">0</b>枚</span></button>' +
          '<div class="noah-piece-complete" id="inori-piece-complete"></div>' +
        '</footer>' +
      '</section>';
    document.body.appendChild(overlay);
    overlay.querySelector('[data-inori-close]').addEventListener('click', closeInoriPiecePanel);
    overlay.querySelector('#inori-piece-challenge').addEventListener('click', challengeInoriSpecialStage);
  }

  function renderInoriPiecePanel(){
    if (!document.getElementById('inori-piece-overlay')) return;
    const count = getInoriPieceCount();
    const ticket = getTicketCount();
    const lapEl = document.getElementById('inori-piece-lap');
    if (lapEl) lapEl.textContent = serverLap + '周目';
    const progress = document.getElementById('inori-piece-progress-now');
    if (progress) progress.textContent = String(count);
    const ticketEl = document.getElementById('inori-piece-ticket-count');
    if (ticketEl) ticketEl.textContent = String(ticket);
    document.querySelectorAll('[data-inori-piece]').forEach(el => {
      const open = Number(el.getAttribute('data-inori-piece') || 0) <= count;
      el.classList.toggle('locked', !open);
      el.classList.toggle('open', open);
    });
    const note = document.getElementById('inori-piece-note');
    if (note) note.textContent = serverLap > 1
      ? '9つ揃うと、限界突破用のイノリを獲得。'
      : 'ステージクリアごとに、イノリの欠片を1つ獲得できます。';
    const button = document.getElementById('inori-piece-challenge');
    if (button) {
      // ノアと同じく、TICKETが無くても編成画面（ステージ情報）までは開ける。消費確認は出撃時。
      button.disabled = false;
    }
    const complete = document.getElementById('inori-piece-complete');
    if (complete) { complete.classList.toggle('show', !!lastRewardMessage); complete.textContent = lastRewardMessage; }
  }

  async function openInoriPiecePanel(){
    if (typeof window.requireChapter03ContentUnlock === 'function' && !window.requireChapter03ContentUnlock()) return;
    buildPanel();
    const overlay = document.getElementById('inori-piece-overlay');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    renderInoriPiecePanel();
    await Promise.all([refreshInoriProgress(), refreshTicketCount()]);
    renderInoriPiecePanel();
  }
  function closeInoriPiecePanel(){
    const overlay = document.getElementById('inori-piece-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  }
  function challengeInoriSpecialStage(){
    closeInoriPiecePanel();
    if (typeof window.openShootingEvent !== 'function') { console.error('[InoriPiece] openShootingEvent is not available'); return; }
    window.__inoriLap = serverLap;
    window.openShootingEvent({ stageId: STAGE_ID });
  }

  // ------------------------------------------------------------
  // クリア報酬
  // ------------------------------------------------------------
  async function syncUnlockedInoriToLocal(characterRowId){
    if (!characterRowId) return;
    try {
      const sb = window.zsSupabase;
      if (!sb || typeof sb.from !== 'function') return;
      const rowRes = await sb.from('collected_characters').select('*').eq('id', Number(characterRowId)).maybeSingle();
      if (rowRes && rowRes.error) throw rowRes.error;
      const row = rowRes && rowRes.data;
      if (!row) return;
      const chara = typeof getCharaById === 'function' ? getCharaById(CHARACTER_ID) : null;
      if (!chara) return;
      const entry = typeof buildOwnedEntryFromChara === 'function'
        ? buildOwnedEntryFromChara(chara, row)
        : (typeof createCharaSummonData === 'function' ? createCharaSummonData(chara, new Date(row.captured_at || Date.now())) : null);
      if (!entry) return;
      entry.db_id = row.id;
      if (typeof box !== 'undefined' && Array.isArray(box) && !box.some(x => x && Number(x.db_id) === Number(entry.db_id))) box.push(entry);
      if (typeof collected !== 'undefined' && collected) collected[CHARACTER_ID] = collected[CHARACTER_ID] || entry;
      try { if (typeof renderBox === 'function') renderBox(); } catch (_) {}
      try { if (typeof updateMainUI === 'function') updateMainUI(); } catch (_) {}
      try { if (typeof updateZukanLimitBreakNotice === 'function') updateZukanLimitBreakNotice(); } catch (_) {}
      try { if (typeof window.refreshShootingRoster === 'function') window.refreshShootingRoster(); } catch (_) {}
    } catch (err) {
      console.warn('[InoriPiece] local Inori sync failed:', err);
    }
  }

  function ensureCompletePopup(){
    let popup = document.getElementById('inori-complete-popup');
    if (popup) return popup;
    popup = document.createElement('div');
    popup.id = 'inori-complete-popup';
    popup.className = 'noah-complete-popup';
    popup.setAttribute('aria-hidden', 'true');
    popup.innerHTML =
      '<div class="noah-complete-popup-backdrop"></div>' +
      '<section class="noah-complete-popup-card" role="dialog" aria-modal="true" aria-labelledby="inori-complete-popup-title">' +
        '<div class="noah-complete-popup-kicker">CHARACTER UNLOCKED</div>' +
        '<div class="noah-complete-popup-image-wrap"><img class="noah-complete-popup-image" src="images/chara_111_panel.webp" alt="イノリ"></div>' +
        '<div class="noah-complete-popup-title" id="inori-complete-popup-title">プレイキャラ：イノリを入手しました。</div>' +
        '<button type="button" class="noah-complete-popup-close">OK</button>' +
      '</section>';
    document.body.appendChild(popup);
    popup.querySelector('.noah-complete-popup-close').addEventListener('click', closeCompletePopup);
    return popup;
  }
  function showInoriCompletePopup(){
    const popup = ensureCompletePopup();
    popup.classList.remove('show');
    popup.setAttribute('aria-hidden', 'false');
    void popup.offsetWidth;
    popup.classList.add('show');
  }
  function closeCompletePopup(){
    const popup = document.getElementById('inori-complete-popup');
    if (!popup) return;
    popup.classList.remove('show');
    popup.setAttribute('aria-hidden', 'true');
  }

  async function finishInoriClear(){
    if (finishPending) return;
    const attemptId = String(window.__inoriAttemptId || '');
    if (!attemptId) { console.warn('[InoriPiece] no attempt id; clear reward skipped'); return; }
    const sb = window.zsSupabase;
    if (!sb || typeof sb.rpc !== 'function') return;
    finishPending = true;
    try {
      const res = await sb.rpc('finish_inori_attempt', { p_attempt_id: attemptId });
      if (res && res.error) throw res.error;
      let data = res ? res.data : null;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch (_) {} }
      if (!data || data.ok === false) throw new Error((data && data.message) || 'イノリの欠片を受け取れませんでした');
      window.__inoriAttemptId = null;
      const before = getInoriPieceCount();
      if (Number.isInteger(Number(data.lap)) && Number(data.lap) >= 1) { serverLap = Number(data.lap); window.__inoriLap = serverLap; }
      lastRewardMessage = data.completed_lap != null ? String(data.message || '') : '';
      const after = setDisplayPieceCount(data.piece_count);
      renderEntryCard();
      if (data.granted_inori) {
        await syncUnlockedInoriToLocal(data.character_row_id);
        if (data.unlocked_inori) showInoriCompletePopup();
        else toast(data.message || 'イノリを1体獲得（限界突破に使えます）');
      } else if (data.completed_lap != null) {
        toast(data.message || '周回完了');
      } else if (after > before) {
        toast('イノリの欠片を1つ獲得しました（' + after + ' / 9）');
      }
    } catch (err) {
      console.error('[InoriPiece] finish attempt failed:', err);
      toast(err && err.message ? err.message : 'イノリの欠片の受取に失敗しました');
    } finally {
      finishPending = false;
    }
  }
  function handleShootingStageResult(event){
    const detail = event && event.detail ? event.detail : null;
    if (!detail || detail.stageId !== STAGE_ID) return;
    if (detail.win) void finishInoriClear();
    else window.__inoriAttemptId = null; // 敗北したattemptは報酬に使わない（次は新しいattempt）
  }

  // ボトムナビで別画面へ移ったらパネルを閉じる（ノアと同じ）
  document.addEventListener('click', e => {
    if (e.target && e.target.closest && e.target.closest('#bottom-nav-shared .bottom-nav-item')) closeInoriPiecePanel();
  }, true);
  document.addEventListener('click', e => {
    const card = e.target && e.target.closest ? e.target.closest('[data-open-inori-piece]') : null;
    if (!card) return;
    e.preventDefault();
    openInoriPiecePanel();
  });
  window.addEventListener('zeraphia:item-tickets-changed', () => { renderEntryCard(); renderInoriPiecePanel(); });
  window.addEventListener('shooting-stage-result', handleShootingStageResult);
  window.addEventListener('pageshow', () => { void refreshInoriProgress(); });
  function init(){
    renderEntryCard();
    // 起動直後の通信を増やしすぎないよう、少し遅らせて周回とTICKET数を取得
    setTimeout(() => { void refreshInoriProgress(); void refreshTicketCount(); }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true }); else init();

  window.getInoriPieceCount = getInoriPieceCount;
  window.refreshInoriProgress = refreshInoriProgress;
  window.renderInoriPiecePanel = renderInoriPiecePanel;
  window.openInoriPiecePanel = openInoriPiecePanel;
  window.closeInoriPiecePanel = closeInoriPiecePanel;
  window.challengeInoriSpecialStage = challengeInoriSpecialStage;
  window.showInoriCompletePopup = showInoriCompletePopup;
})();
