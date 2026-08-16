// =========================================================
// Zeraphia Notices
// =========================================================
// お知らせ管理ファイル。
// お知らせを増やす場合は NOTICE_ITEMS に1件追加するだけでOK。
// index.html 側にはお知らせモーダルHTMLを直書きしない。
// =========================================================

window.NOTICE_ITEMS = [
  {
    id: 'notice_first_play_thanks_001',
    date: '2XXX.08.16',
    title: '初プレイの感謝！',
    body: 'Sasaphiaを遊んでくれてありがとうやで。初プレイの感謝を込めて、結晶300個をプレゼントするやで。',
    reward: {
      type: 'gem',
      amount: 300,
      claimId: 'notice_reward_firstplay_300'
    },
    hidden: false
  },

  {
    id: 'notice_sakiel_001',
    date: '2XXX.06.29',
    title: 'フェイスレス降臨 開催',
    body: '特別巡行に「フェイスレス降臨」が追加されました。',
    hidden: false
  },

  {
    id: 'notice_002',
    date: '2XXX.05.28',
    title: '邂逅情報更新',
    body: '新たなキャラがリリースされました。',
    hidden: false
  }
];

(function () {
  const NOTICE_READ_KEY = 'sasaphia_notice_read_ids_v1';

  function ensureNoticeRuntimeStyle() {
    if (document.getElementById('sasaphia-notice-runtime-style-v4')) return;

    const style = document.createElement('style');
    style.id = 'sasaphia-notice-runtime-style-v4';
    style.textContent = `
      .notice-modal{
        position:fixed!important;
        inset:0!important;
        z-index:99990!important;
        display:none;
        align-items:center!important;
        justify-content:center!important;
        padding:calc(14px + env(safe-area-inset-top)) 14px calc(14px + env(safe-area-inset-bottom))!important;
        overflow:hidden!important;
      }
      .notice-modal.active{display:flex!important}
      .notice-panel{
        position:relative!important;
        display:flex!important;
        flex-direction:column!important;
        width:min(360px,100%)!important;
        max-width:100%!important;
        height:auto!important;
        max-height:min(78dvh,620px)!important;
        min-height:0!important;
        overflow:hidden!important;
        padding:18px!important;
        box-sizing:border-box!important;
      }
      .notice-head{flex:0 0 auto!important;margin-bottom:12px!important;padding-right:42px!important}
      .notice-head>img{
        width:46px!important;height:46px!important;
        min-width:46px!important;min-height:46px!important;
        max-width:46px!important;max-height:46px!important;
        object-fit:contain!important;
      }
      .notice-list{
        flex:1 1 auto!important;
        min-height:0!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch;
        display:flex!important;
        flex-direction:column!important;
        gap:10px!important;
      }
      .notice-item{
        flex:0 0 auto!important;
        width:100%!important;
        min-width:0!important;
        padding:12px!important;
        overflow:hidden!important;
        box-sizing:border-box!important;
      }
      .notice-reward{
        display:flex!important;
        align-items:center!important;
        justify-content:space-between!important;
        width:100%!important;
        min-width:0!important;
        gap:10px!important;
        margin-top:12px!important;
        padding:9px 10px!important;
        border:1px solid rgba(185,148,77,.24)!important;
        border-radius:11px!important;
        background:rgba(255,251,241,.76)!important;
        overflow:hidden!important;
        box-sizing:border-box!important;
      }
      .notice-reward-main{
        display:flex!important;
        align-items:center!important;
        gap:9px!important;
        flex:1 1 auto!important;
        min-width:0!important;
        overflow:hidden!important;
      }
      .notice-reward-icon-fixed{
        display:block!important;
        flex:0 0 30px!important;
        width:30px!important;
        height:30px!important;
        min-width:30px!important;
        min-height:30px!important;
        max-width:30px!important;
        max-height:30px!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        background:url("images/icon_gem.webp") center/contain no-repeat!important;
        transform:none!important;
      }
      .notice-reward-copy{
        display:flex!important;
        flex-direction:column!important;
        gap:1px!important;
        min-width:0!important;
        flex:1 1 auto!important;
      }
      .notice-reward-label{
        font-size:9px!important;
        line-height:1.2!important;
        color:#9a7a3b!important;
        font-weight:600!important;
        letter-spacing:.08em!important;
        white-space:nowrap!important;
      }
      .notice-reward-copy strong{
        display:block!important;
        font-size:13px!important;
        line-height:1.3!important;
        color:#795719!important;
        font-weight:700!important;
        white-space:nowrap!important;
      }
      .notice-reward-btn{
        flex:0 0 auto!important;
        width:auto!important;
        min-width:78px!important;
        height:34px!important;
        min-height:34px!important;
        max-height:34px!important;
        margin:0!important;
        padding:0 12px!important;
        border:1px solid rgba(174,133,54,.40)!important;
        border-radius:9px!important;
        background:linear-gradient(180deg,#fff8e8,#f1e1ba)!important;
        color:#795719!important;
        font-family:"Noto Serif JP",serif!important;
        font-size:11px!important;
        font-weight:600!important;
        line-height:1!important;
        white-space:nowrap!important;
        box-sizing:border-box!important;
      }
      .notice-reward-btn.claimed,
      .notice-reward-btn:disabled{
        background:rgba(226,215,192,.36)!important;
        color:rgba(105,90,68,.46)!important;
        border-color:rgba(142,122,89,.18)!important;
      }
      @media(max-height:700px){
        .notice-panel{max-height:82dvh!important;padding:15px!important}
        .notice-item{padding:10px!important}
        .notice-reward{margin-top:9px!important;padding:8px 9px!important}
      }
      @media(max-width:350px){
        .notice-modal{padding-left:10px!important;padding-right:10px!important}
        .notice-panel{padding:14px!important}
        .notice-reward-btn{min-width:70px!important;padding:0 9px!important;font-size:10px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function getReadNoticeIds() {
    try {
      const raw = localStorage.getItem(NOTICE_READ_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function setReadNoticeIds(ids) {
    try {
      localStorage.setItem(
        NOTICE_READ_KEY,
        JSON.stringify(Array.from(new Set((ids || []).filter(Boolean))))
      );
    } catch (_) {}
  }

  function getVisibleNotices() {
    return (window.NOTICE_ITEMS || []).filter(function (item) {
      return item && item.hidden !== true;
    });
  }

  function markVisibleNoticesAsRead() {
    const readIds = getReadNoticeIds();
    const visibleIds = getVisibleNotices()
      .map(function (item) { return item.id; })
      .filter(Boolean);

    setReadNoticeIds(readIds.concat(visibleIds));
  }

  function escapeHtml(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureNoticeModal() {
    ensureNoticeRuntimeStyle();
    if (document.getElementById('notice-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'notice-modal';
    modal.className = 'notice-modal';

    modal.innerHTML = `
      <div class="notice-panel">
        <button class="notice-close" onclick="closeNoticeModal()">×</button>

        <div class="notice-head">
          <img src="images/mail.webp" alt="">
          <div>
            <div class="notice-title">お知らせ</div>
            <div class="notice-sub">Notice</div>
          </div>
        </div>

        <div class="notice-list" id="notice-list"></div>
      </div>
    `;

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeNoticeModal();
    });

    document.body.appendChild(modal);
  }

  function getProfile() {
    return window.userProfile || null;
  }

  function isRewardClaimed(item) {
    if (!item || !item.reward || !item.reward.claimId) return false;
    const profile = getProfile();
    const used = profile && Array.isArray(profile.used_gachas) ? profile.used_gachas : [];
    return used.includes(item.reward.claimId);
  }

  function renderReward(item) {
    if (!item || !item.reward) return '';

    const reward = item.reward;
    const amount = Math.max(0, Number(reward.amount || 0));
    const claimed = isRewardClaimed(item);

    if (reward.type !== 'gem' || amount <= 0) return '';

    return `
      <div class="notice-reward">
        <div class="notice-reward-main">
          <span class="notice-reward-icon-fixed" aria-hidden="true"></span>
          <div class="notice-reward-copy">
            <span class="notice-reward-label">プレゼント</span>
            <strong>結晶 ×${amount}</strong>
          </div>
        </div>
        <button
          type="button"
          class="notice-reward-btn${claimed ? ' claimed' : ''}"
          data-notice-claim="${escapeHtml(item.id || '')}"
          ${claimed ? 'disabled' : ''}
        >${claimed ? '受取済み' : '受け取る'}</button>
      </div>
    `;
  }

  async function claimNoticeReward(itemId, button) {
    const item = (window.NOTICE_ITEMS || []).find(function (entry) {
      return entry && entry.id === itemId;
    });

    if (!item || !item.reward) return;
    if (isRewardClaimed(item)) {
      renderNoticeList();
      return;
    }

    if (window._profileLoadState !== 'ready' || !window.userProfile) {
      if (typeof window.showToast === 'function') {
        window.showToast('プロフィール読込後にもう一度試してほしいやで');
      }
      return;
    }

    if (typeof window.saveProfileToDB !== 'function') {
      console.error('[NoticeReward] saveProfileToDB is unavailable');
      return;
    }

    const reward = item.reward;
    const amount = Math.max(0, Number(reward.amount || 0));
    if (reward.type !== 'gem' || amount <= 0) return;

    if (button) {
      button.disabled = true;
      button.textContent = '受取中...';
    }

    try {
      const profile = window.userProfile;
      const used = Array.isArray(profile.used_gachas) ? profile.used_gachas.slice() : [];

      // 二重クリック・再受取対策。
      if (used.includes(reward.claimId)) {
        renderNoticeList();
        return;
      }

      const nextGem = Math.max(0, Number(profile.gem || 0)) + amount;
      const nextUsed = Array.from(new Set(used.concat(reward.claimId)));

      await window.saveProfileToDB({
        gem: nextGem,
        used_gachas: nextUsed,
        last_played: new Date().toISOString()
      });

      // saveProfileToDB 内でも userProfile は更新されるが、念のため参照を同期。
      window.userProfile.gem = nextGem;
      window.userProfile.used_gachas = nextUsed;

      if (typeof window.updateMainUI === 'function') window.updateMainUI();
      if (typeof window.updateSummonGemUI === 'function') window.updateSummonGemUI();

      if (typeof window.showToast === 'function') {
        window.showToast('結晶 ×' + amount + ' を受け取ったやで！');
      }

      renderNoticeList();
    } catch (error) {
      console.error('[NoticeReward] claim failed:', error);
      if (typeof window.showToast === 'function') {
        window.showToast('受け取りに失敗したやで。もう一度試してほしいやで');
      }
      renderNoticeList();
    }
  }

  function renderNoticeList() {
    const list = document.getElementById('notice-list');
    if (!list) return;

    const items = (window.NOTICE_ITEMS || []).filter(item => item && item.hidden !== true);

    if (!items.length) {
      list.innerHTML = `
        <div class="notice-item">
          <div class="notice-item-title">現在のお知らせはありません</div>
          <div class="notice-body">新しい通達が届くまでお待ちください。</div>
        </div>
      `;
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="notice-item${item.reward ? ' notice-item-reward' : ''}" data-notice-id="${escapeHtml(item.id || '')}">
        <div class="notice-date">${escapeHtml(item.date || '')}</div>
        <div class="notice-item-title">${escapeHtml(item.title || '')}</div>
        <div class="notice-body">${escapeHtml(item.body || '')}</div>
        ${renderReward(item)}
      </div>
    `).join('');

    list.querySelectorAll('[data-notice-claim]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        claimNoticeReward(button.getAttribute('data-notice-claim'), button);
      });
    });
  }

  function updateNoticeBadge() {
    const badge = document.querySelector('.home-notice-badge');
    if (!badge) return;

    const readIds = new Set(getReadNoticeIds());
    const hasUnreadNotice = getVisibleNotices().some(function (item) {
      return item.id && !readIds.has(item.id);
    });

    badge.style.display = hasUnreadNotice ? '' : 'none';
    badge.setAttribute('aria-hidden', hasUnreadNotice ? 'false' : 'true');
  }

  window.openNoticeModal = function (event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    ensureNoticeModal();
    renderNoticeList();

    const modal = document.getElementById('notice-modal');
    if (!modal) return;
    modal.classList.add('active');

    // お知らせ画面を開いた時点で、現在表示中のお知らせを既読にする。
    markVisibleNoticesAsRead();
    updateNoticeBadge();
  };

  window.refreshNoticeBadge = updateNoticeBadge;

  window.closeNoticeModal = function () {
    const modal = document.getElementById('notice-modal');
    if (!modal) return;
    modal.classList.remove('active');
  };

  function initializeNoticeUi() {
    ensureNoticeRuntimeStyle();
    updateNoticeBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNoticeUi);
  } else {
    initializeNoticeUi();
  }
})();
