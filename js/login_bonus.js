/* =========================================================
   Zeraphia - 7日周期ログインボーナス
   1〜6日目: ガチャ石 ×5 / 7日目: ガチャ石 ×20
   7日合計: 50個
   ※ 日付判定・付与の確定はSupabase RPC側で行う
   ========================================================= */
(function(){
  'use strict';

  var REWARDS = [5, 5, 5, 5, 5, 5, 20];
  var modal = null;
  var isClaiming = false;

  function getUserId(){
    return String(localStorage.getItem('zukan_user_id') || '').trim().toLowerCase();
  }

  function getJstDateString(){
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function(p){ map[p.type] = p.value; });
      return map.year + '-' + map.month + '-' + map.day;
    } catch (_) {
      var d = new Date(Date.now() + 9 * 60 * 60 * 1000);
      return d.toISOString().slice(0, 10);
    }
  }

  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function ensureModal(){
    if(modal) return modal;

    var root = document.createElement('div');
    root.id = 'login-bonus-modal';
    root.className = 'login-bonus-modal';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="login-bonus-backdrop"></div>' +
      '<section class="login-bonus-sheet" role="dialog" aria-modal="true" aria-labelledby="login-bonus-title">' +
        '<div class="login-bonus-kicker">DAILY RESONANCE</div>' +
        '<h2 id="login-bonus-title">ログインボーナス</h2>' +
        '<p class="login-bonus-sub">7日間でガチャ石 合計50個</p>' +
        '<div class="login-bonus-days" id="login-bonus-days"></div>' +
        '<div class="login-bonus-today">' +
          '<span class="login-bonus-today-label">TODAY</span>' +
          '<img src="images/icon_gem.webp" alt="ガチャ石">' +
          '<div><b id="login-bonus-reward">×5</b><span id="login-bonus-day-label">1日目</span></div>' +
        '</div>' +
        '<button type="button" class="login-bonus-claim-btn" id="login-bonus-claim-btn">受け取る</button>' +
        '<div class="login-bonus-status" id="login-bonus-status" aria-live="polite"></div>' +
      '</section>';

    document.body.appendChild(root);
    modal = root;

    var btn = root.querySelector('#login-bonus-claim-btn');
    btn.addEventListener('click', function(){ claimLoginBonus(); });
    return root;
  }

  function renderDays(currentDay, alreadyClaimedToday){
    var root = ensureModal();
    var daysEl = root.querySelector('#login-bonus-days');
    var html = '';

    for(var i = 1; i <= 7; i++){
      var reward = REWARDS[i - 1];
      var cls = ['login-bonus-day'];
      if(i === 7) cls.push('is-special');
      if(i === currentDay) cls.push('is-current');
      if(alreadyClaimedToday && i === currentDay) cls.push('is-claimed');

      html +=
        '<div class="' + cls.join(' ') + '">' +
          '<span class="login-bonus-day-num">DAY ' + i + '</span>' +
          '<img src="images/icon_gem.webp" alt="">' +
          '<b>×' + reward + '</b>' +
          (alreadyClaimedToday && i === currentDay ? '<span class="login-bonus-check">✓</span>' : '') +
        '</div>';
    }
    daysEl.innerHTML = html;
  }

  function showModal(day){
    var root = ensureModal();
    day = Math.max(1, Math.min(7, Number(day || 1)));
    renderDays(day, false);
    root.querySelector('#login-bonus-reward').textContent = '×' + REWARDS[day - 1];
    root.querySelector('#login-bonus-day-label').textContent = day + '日目';
    root.querySelector('#login-bonus-status').textContent = '';
    var btn = root.querySelector('#login-bonus-claim-btn');
    btn.disabled = false;
    btn.textContent = '受け取る';
    root.classList.add('show');
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('login-bonus-open');
  }

  function closeModal(){
    if(!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('login-bonus-open');
  }

  async function fetchState(){
    var sb = window.zsSupabase;
    var uid = getUserId();
    if(!sb || !uid) return null;

    var result = await sb.from('user_profiles')
      .select('login_bonus_day,last_login_bonus_date')
      .eq('user_id', uid)
      .maybeSingle();

    if(result.error) throw result.error;
    return result.data || { login_bonus_day: 0, last_login_bonus_date: null };
  }

  async function openLoginBonusIfNeeded(){
    if(window._profileLoadState !== 'ready') return false;

    var state = await fetchState();
    if(!state) return false;

    var today = getJstDateString();
    if(state.last_login_bonus_date === today) return false;

    var lastDay = Math.max(0, Math.min(7, Number(state.login_bonus_day || 0)));
    var nextDay = (lastDay % 7) + 1;
    showModal(nextDay);
    return true;
  }

  async function claimLoginBonus(){
    if(isClaiming) return;
    isClaiming = true;

    var root = ensureModal();
    var btn = root.querySelector('#login-bonus-claim-btn');
    var status = root.querySelector('#login-bonus-status');
    btn.disabled = true;
    btn.textContent = '受け取り中...';
    status.textContent = '';

    try {
      var sb = window.zsSupabase;
      var uid = getUserId();
      if(!sb || !uid) throw new Error('SupabaseまたはユーザーIDを取得できません');

      var result = await sb.rpc('claim_zeraphia_login_bonus', { p_user_id: uid });
      if(result.error) throw result.error;

      var row = Array.isArray(result.data) ? result.data[0] : result.data;
      if(!row) throw new Error('ログインボーナスの応答がありません');

      var day = Math.max(1, Math.min(7, Number(row.claim_day || 1)));
      if(!row.claimed){
        status.textContent = '本日のログインボーナスは受け取り済みです。';
        btn.textContent = '受け取り済み';
        renderDays(day, true);
        setTimeout(closeModal, 1200);
        return;
      }

      var totalGem = Number(row.total_gem || 0);
      if(window.userProfile){
        window.userProfile.gem = totalGem;
        window.userProfile.login_bonus_day = day;
        window.userProfile.last_login_bonus_date = row.last_claim_date || getJstDateString();
      }

      if(typeof window.updateMainUI === 'function') window.updateMainUI();
      if(typeof window.updateSummonGemUI === 'function') window.updateSummonGemUI();

      renderDays(day, true);
      root.querySelector('#login-bonus-reward').textContent = '×' + Number(row.reward_gem || REWARDS[day - 1]);
      root.querySelector('#login-bonus-day-label').textContent = day + '日目';
      status.textContent = 'ガチャ石 ×' + Number(row.reward_gem || 0) + ' を獲得しました';
      btn.textContent = '受け取り完了 ✓';
      root.querySelector('.login-bonus-sheet').classList.add('is-received');

      if(typeof window.showToast === 'function'){
        window.showToast('ログインボーナス：ガチャ石 ×' + Number(row.reward_gem || 0));
      }

      setTimeout(function(){
        var sheet = root.querySelector('.login-bonus-sheet');
        if(sheet) sheet.classList.remove('is-received');
        closeModal();
      }, 1700);
    } catch(error) {
      console.error('[LoginBonus] claim failed:', error);
      status.textContent = '受け取りに失敗しました。通信状況またはSupabase設定を確認してください。';
      btn.disabled = false;
      btn.textContent = 'もう一度試す';
    } finally {
      isClaiming = false;
    }
  }

  window.openLoginBonusIfNeeded = openLoginBonusIfNeeded;
  window.claimLoginBonus = claimLoginBonus;
  window.closeLoginBonus = closeModal;
})();
