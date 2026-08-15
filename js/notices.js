// =========================================================
// Zeraphia Notices
// =========================================================
// お知らせ管理ファイル。
// お知らせを増やす場合は NOTICE_ITEMS に1件追加するだけでOK。
// index.html 側にはお知らせモーダルHTMLを直書きしない。
// =========================================================

window.NOTICE_ITEMS = [
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
  function escapeHtml(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureNoticeModal() {
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
      <div class="notice-item" data-notice-id="${escapeHtml(item.id || '')}">
        <div class="notice-date">${escapeHtml(item.date || '')}</div>
        <div class="notice-item-title">${escapeHtml(item.title || '')}</div>
        <div class="notice-body">${escapeHtml(item.body || '')}</div>
      </div>
    `).join('');
  }

  function updateNoticeBadge() {
    const badge = document.querySelector('.home-notice-badge');
    if (!badge) return;

    const hasVisibleNotice = (window.NOTICE_ITEMS || []).some(item => item && item.hidden !== true);
    badge.style.display = hasVisibleNotice ? '' : 'none';
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
  };

  window.closeNoticeModal = function () {
    const modal = document.getElementById('notice-modal');
    if (!modal) return;
    modal.classList.remove('active');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNoticeBadge);
  } else {
    updateNoticeBadge();
  }
})();
