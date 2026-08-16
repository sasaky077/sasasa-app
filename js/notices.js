// =========================================================
// Zeraphia Notices
// =========================================================
// お知らせ管理ファイル。
// お知らせを増やす場合は NOTICE_ITEMS に1件追加するだけでOK。
// index.html 側にはお知らせモーダルHTMLを直書きしない。
// =========================================================

window.NOTICE_ITEMS = [
  {
    id: 'notice_daily_raid_3attempts_20260817',
    date: '2026.08.17',
    title: 'レイドが1日3回挑戦できるようになりました！',
    body: 'デイリーレイドの挑戦回数を、1日1回から1日3回に変更しました。3回のうち最も高いスコアが記録として採用されます。見た目を犠牲に軽量化したので、たぶん動きます。クリアしたらテストちゃんもらえます！',
    hidden: false
  },

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
          <img src="images/icon_gem.webp" alt="" class="notice-reward-icon">
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNoticeBadge);
  } else {
    updateNoticeBadge();
  }
})();
