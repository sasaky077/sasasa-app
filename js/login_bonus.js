/* =========================================================
   Sasaphia - 7日周期ログインボーナス
   DAY1: 共鳴石 ×3
   DAY2: 魂の器(LOGOS) ×3
   DAY3: 魂の器(Chaos) ×3
   DAY4: 魂の器(mistis) ×3
   DAY5: 共鳴石 ×6
   DAY6: 魂の器(LOGOS) ×3
   DAY7: SPECIAL STAGE TICKET ×1
   ※ 日付判定・付与の確定はSupabase RPC側で行う
   ========================================================= */
(function(){
  'use strict';

  var REWARDS = [
    { type:'item', itemId:'kyoumei_stone',      name:'共鳴石',          qty:3, image:'images/item_kyoumeistone.webp' },
    { type:'item', itemId:'soul_vessel_logos',  name:'魂の器(LOGOS)',   qty:3, image:'images/item_logos.webp' },
    { type:'item', itemId:'soul_vessel_chaos',  name:'魂の器(Chaos)',   qty:3, image:'images/item_chaos.webp' },
    { type:'item', itemId:'soul_vessel_mystis', name:'魂の器(mistis)',  qty:3, image:'images/item_mystis.webp' },
    { type:'item', itemId:'kyoumei_stone',      name:'共鳴石',          qty:6, image:'images/item_kyoumeistone.webp' },
    { type:'item', itemId:'soul_vessel_logos',  name:'魂の器(LOGOS)',   qty:3, image:'images/item_logos.webp' },
    { type:'ticket', itemId:'special_stage_ticket', name:'SPECIAL STAGE TICKET', qty:1, image:'images/special_stage_ticket.webp' }
  ];

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

  function getReward(day){
    day = Math.max(1, Math.min(7, Number(day || 1)));
    return REWARDS[day - 1];
  }

  function ensureModal(){
    if(modal) return modal;

    var root = document.createElement('div');
    root.id = 'login-bonus-modal';
    root.className = 'login-bonus-modal';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="login-bonus-backdrop"></div>' +
      '<section class="login-bonus-sheet login-bonus-sheet-mixed-v106" role="dialog" aria-modal="true" aria-labelledby="login-bonus-title">' +
        '<div class="login-bonus-kicker">DAILY RESONANCE</div>' +
        '<h2 id="login-bonus-title">ログインボーナス</h2>' +
        '<p class="login-bonus-sub">7日目にSPECIAL STAGE TICKETを獲得</p>' +
        '<div class="login-bonus-days" id="login-bonus-days"></div>' +
        '<div class="login-bonus-today login-bonus-today-mixed">' +
          '<span class="login-bonus-today-label">TODAY</span>' +
          '<img id="login-bonus-today-image" src="" alt="" class="login-bonus-today-reward-image">' +
          '<div class="login-bonus-today-copy">' +
            '<b id="login-bonus-reward">×1</b>' +
            '<span id="login-bonus-day-label">1日目</span>' +
            '<small id="login-bonus-today-note" class="login-bonus-today-note"></small>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="login-bonus-claim-btn" id="login-bonus-claim-btn">受け取る</button>' +
        '<div class="login-bonus-status" id="login-bonus-status" aria-live="polite"></div>' +
      '</section>';

    document.body.appendChild(root);

    if(!document.getElementById('login-bonus-mixed-style-v106')){
      var style = document.createElement('style');
      style.id = 'login-bonus-mixed-style-v106';
      style.textContent = [
        '.login-bonus-sheet-mixed-v106 .login-bonus-sub{line-height:1.5}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-days{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-day{min-height:118px;padding:9px 6px 9px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;position:relative;overflow:hidden}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-day.is-special{grid-column:span 2;min-height:118px}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-day-num{font-size:10px;letter-spacing:.12em;color:#b29461}',
        '.login-bonus-mixed-reward{width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;margin-top:7px}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-day img.login-bonus-material-thumb{display:block!important;width:45px!important;height:45px!important;max-width:45px!important;object-fit:contain!important;margin:0!important;filter:drop-shadow(0 2px 4px rgba(110,84,34,.10))!important}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-day img.login-bonus-ticket-thumb{display:block!important;width:138px!important;height:auto!important;max-width:none!important;object-fit:contain!important;margin:0!important;filter:drop-shadow(0 3px 6px rgba(110,84,34,.12))!important}',
        '.login-bonus-mixed-count{font-family:"Cinzel","Noto Serif JP",serif;font-size:13px;line-height:1;color:#9b6a18;font-weight:600}',
        '.login-bonus-mixed-name{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;font-size:7.5px;line-height:1.3;color:#9c8767}',
        '.login-bonus-today-mixed{display:flex;align-items:center;justify-content:center;gap:12px}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-today img.login-bonus-today-reward-image{display:block!important;width:66px!important;height:66px!important;max-width:66px!important;object-fit:contain!important;margin:0!important}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-today img.login-bonus-today-reward-image.is-ticket{width:154px!important;height:auto!important;max-width:42vw!important}',
        '.login-bonus-today-copy{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;min-width:0}',
        '.login-bonus-today-copy b{font-family:"Cinzel","Noto Serif JP",serif;font-size:28px;line-height:1;color:#9b6a18}',
        '.login-bonus-today-copy span{margin-top:4px}',
        '.login-bonus-today-note{margin-top:4px;font-size:9px;letter-spacing:.04em;color:#a98955;white-space:nowrap}',
        '.bonus-mixed-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}',
        '.bonus-mixed-day{min-height:118px;padding:9px 6px 9px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;border:1px solid rgba(214,194,156,.9);border-radius:12px;background:linear-gradient(180deg,rgba(255,252,247,.96),rgba(250,244,231,.92));overflow:hidden}',
        '.bonus-mixed-day.is-current{box-shadow:0 0 0 2px rgba(212,178,111,.35) inset}',
        '.bonus-mixed-day.is-claimed{opacity:.72}',
        '.bonus-mixed-day.is-special{grid-column:span 2}',
        '.bonus-mixed-day > span{font-size:10px;letter-spacing:.12em;color:#b29461}',
        '.bonus-mixed-reward{width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;margin-top:7px}',
        '.bonus-mixed-reward img.material{display:block!important;width:45px!important;height:45px!important;max-width:45px!important;object-fit:contain!important;margin:0!important}',
        '.bonus-mixed-reward img.ticket{display:block!important;width:138px!important;height:auto!important;max-width:none!important;object-fit:contain!important;margin:0!important}',
        '.bonus-mixed-reward b{font-family:"Cinzel","Noto Serif JP",serif;font-size:13px;line-height:1;color:#9b6a18;font-weight:600}',
        '.bonus-mixed-reward small{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;font-size:7.5px;line-height:1.3;color:#9c8767}',
        '@media(max-width:360px){',
        '  .login-bonus-sheet-mixed-v106 .login-bonus-day,.bonus-mixed-day{min-height:108px;padding:8px 5px}',
        '  .login-bonus-sheet-mixed-v106 .login-bonus-day img.login-bonus-material-thumb,.bonus-mixed-reward img.material{width:40px!important;height:40px!important;max-width:40px!important}',
        '  .login-bonus-sheet-mixed-v106 .login-bonus-day img.login-bonus-ticket-thumb,.bonus-mixed-reward img.ticket{width:122px!important}',
        '  .login-bonus-sheet-mixed-v106 .login-bonus-today img.login-bonus-today-reward-image.is-ticket{width:136px!important}',
        '}'
      ].join('');
      document.head.appendChild(style);
    }

    modal = root;
    root.querySelector('#login-bonus-claim-btn').addEventListener('click', function(){ claimLoginBonus(); });
    return root;
  }

  function renderDays(currentDay, alreadyClaimedToday){
    var root = ensureModal();
    var daysEl = root.querySelector('#login-bonus-days');
    var html = '';

    for(var i = 1; i <= 7; i++){
      var reward = getReward(i);
      var cls = ['login-bonus-day'];
      if(i === 7) cls.push('is-special');
      if(i === currentDay) cls.push('is-current');
      if(alreadyClaimedToday && i === currentDay) cls.push('is-claimed');
      html +=
        '<div class="' + cls.join(' ') + '">' +
          '<span class="login-bonus-day-num">DAY ' + i + '</span>' +
          '<div class="login-bonus-mixed-reward">' +
            '<img src="' + reward.image + '" alt="' + reward.name + '" class="' + (reward.type === 'ticket' ? 'login-bonus-ticket-thumb' : 'login-bonus-material-thumb') + '">' +
            '<b class="login-bonus-mixed-count">×' + reward.qty + '</b>' +
            '<small class="login-bonus-mixed-name">' + reward.name + '</small>' +
          '</div>' +
          (alreadyClaimedToday && i === currentDay ? '<span class="login-bonus-check">✓</span>' : '') +
        '</div>';
    }
    daysEl.innerHTML = html;
  }

  function applyTodayReward(day, quantityOverride){
    var root = ensureModal();
    var reward = getReward(day);
    var qty = quantityOverride == null ? reward.qty : Math.max(0, Number(quantityOverride || 0));
    var img = root.querySelector('#login-bonus-today-image');
    img.src = reward.image;
    img.alt = reward.name;
    img.classList.toggle('is-ticket', reward.type === 'ticket');
    root.querySelector('#login-bonus-reward').textContent = '×' + qty;
    root.querySelector('#login-bonus-day-label').textContent = day + '日目';
    root.querySelector('#login-bonus-today-note').textContent = reward.name;
  }

  function showModal(day){
    var root = ensureModal();
    day = Math.max(1, Math.min(7, Number(day || 1)));
    renderDays(day, false);
    applyTodayReward(day);
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
    var wasOpen = modal.classList.contains('show');
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('login-bonus-open');
    if(wasOpen){
      try{ window.dispatchEvent(new CustomEvent('zeraphia-login-bonus-closed')); }
      catch(_){
        try{
          var event = document.createEvent('Event');
          event.initEvent('zeraphia-login-bonus-closed', false, false);
          window.dispatchEvent(event);
        }catch(__){}
      }
    }
  }

  async function fetchState(){
    var sb = window.zsSupabase;
    var uid = getUserId();
    if(!sb || !uid) return null;
    var result = await sb.from('user_profiles')
      .select('login_bonus_day,last_login_bonus_date,special_stage_ticket')
      .eq('user_id', uid)
      .maybeSingle();
    if(result.error) throw result.error;
    return result.data || { login_bonus_day:0, last_login_bonus_date:null, special_stage_ticket:0 };
  }

  function applyInventoryReward(itemId, totalQuantity){
    if(!itemId || totalQuantity == null) return;
    var total = Math.max(0, Number(totalQuantity || 0));
    try {
      var key = 'zeraphia_inventory_v1';
      var inventory = {};
      try { inventory = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch(_) { inventory = {}; }
      inventory[itemId] = total;
      localStorage.setItem(key, JSON.stringify(inventory));
      if(window.userProfile){
        if(!window.userProfile.inventory || typeof window.userProfile.inventory !== 'object') window.userProfile.inventory = {};
        window.userProfile.inventory[itemId] = total;
      }
      try{ window.dispatchEvent(new CustomEvent('zeraphia:inventory-changed', { detail:{ itemId:itemId, quantity:total } })); }catch(_){}
    } catch(_) {}
  }

  async function openLoginBonusIfNeeded(){
    if(window._profileLoadState !== 'ready') return false;
    var state = await fetchState();
    if(!state) return false;
    var today = getJstDateString();
    updateBonusHomeNotice(state.last_login_bonus_date !== today);
    if(state.last_login_bonus_date === today) return false;
    var lastDay = Math.max(0, Math.min(7, Number(state.login_bonus_day || 0)));
    showModal((lastDay % 7) + 1);
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
      var reward = getReward(day);
      if(!row.claimed){
        status.textContent = '本日のログインボーナスは受け取り済みです。';
        btn.textContent = '受け取り済み';
        renderDays(day, true);
        applyTodayReward(day, 0);
        updateBonusHomeNotice(false);
        if(document.getElementById('screen-bonus') && document.getElementById('screen-bonus').classList.contains('active')) renderBonusPage();
        setTimeout(closeModal, 1200);
        return;
      }

      var rewardQty = Math.max(0, Number(row.reward_quantity != null ? row.reward_quantity : reward.qty));
      if(window.userProfile){
        window.userProfile.login_bonus_day = day;
        window.userProfile.last_login_bonus_date = row.last_claim_date || getJstDateString();
        if(row.total_special_ticket != null) window.userProfile.special_stage_ticket = Number(row.total_special_ticket || 0);
      }
      if(row.reward_item_id && row.total_item_quantity != null){
        applyInventoryReward(String(row.reward_item_id), Number(row.total_item_quantity || 0));
      }

      if(typeof window.updateMainUI === 'function') window.updateMainUI();
      updateBonusHomeNotice(false);
      if(document.getElementById('screen-bonus') && document.getElementById('screen-bonus').classList.contains('active')) renderBonusPage();
      if(typeof window.refreshSpecialTicketUI === 'function') window.refreshSpecialTicketUI();

      renderDays(day, true);
      applyTodayReward(day, rewardQty);
      status.textContent = reward.name + ' ×' + rewardQty + ' を獲得しました';
      btn.textContent = '受け取り完了 ✓';
      root.querySelector('.login-bonus-sheet').classList.add('is-received');
      if(typeof window.showToast === 'function') window.showToast('ログインボーナス：' + reward.name + ' ×' + rewardQty);

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

  async function renderBonusPage(){
    // bonus一覧でも、modal用に定義しているmixed reward CSSを必ず先に生成する。
    // これが無いと、本日受取済み等でmodalを一度も開かなかった端末では画像が原寸表示になりレイアウトが崩れる。
    ensureModal();
    var list = document.getElementById('bonus-page-list');
    if(!list) return;
    list.innerHTML = '<div class="bonus-page-loading">読み込み中...</div>';
    try {
      var state = await fetchState();
      if(!state){ list.innerHTML = '<div class="bonus-page-error">ログイン情報を取得できません。</div>'; return; }
      var today = getJstDateString();
      var claimedToday = state.last_login_bonus_date === today;
      var lastDay = Math.max(0, Math.min(7, Number(state.login_bonus_day || 0)));
      var displayDay = claimedToday ? Math.max(1, lastDay) : ((lastDay % 7) + 1);
      var html = '';
      html += '<section class="bonus-page-card">';
      html +=   '<div class="bonus-card-head">';
      html +=     '<div class="bonus-card-title-wrap"><small>DAILY RESONANCE</small><h3>ログインボーナス</h3></div>';
      html +=     '<div class="bonus-card-state' + (claimedToday ? ' is-claimed' : '') + '">' + (claimedToday ? '本日受取済み' : '受取可能') + '</div>';
      html +=   '</div>';
      html +=   '<div class="bonus-mixed-row">';
      for(var i = 1; i <= 7; i++){
        var reward = getReward(i);
        var cls = ['bonus-mixed-day'];
        if(i === displayDay) cls.push('is-current');
        if(claimedToday && i === displayDay) cls.push('is-claimed');
        if(i === 7) cls.push('is-special');
        html += '<div class="' + cls.join(' ') + '">'
          + '<span>DAY ' + i + '</span>'
          + '<div class="bonus-mixed-reward">'
            + '<img src="' + reward.image + '" alt="' + reward.name + '" class="' + (reward.type === 'ticket' ? 'ticket' : 'material') + '">'
            + '<b>×' + reward.qty + '</b>'
            + '<small>' + reward.name + '</small>'
          + '</div>'
          + '</div>';
      }
      html +=   '</div>';
      html +=   '<div class="bonus-card-foot">';
      html +=     '<div class="bonus-card-note">毎日 0:00（JST）更新<br>DAY 1〜6：育成素材<br>DAY 7：SPECIAL STAGE TICKET ×1</div>';
      html +=     '<button type="button" class="bonus-card-action" onclick="openLoginBonusFromBonusPage()"' + (claimedToday ? ' disabled' : '') + '>' + (claimedToday ? '受取済み' : '受け取る') + '</button>';
      html +=   '</div>';
      html += '</section>';
      list.innerHTML = html;
      updateBonusHomeNotice(!claimedToday);
    } catch(error) {
      console.error('[LoginBonus] bonus page render failed:', error);
      list.innerHTML = '<div class="bonus-page-error">ボーナス状況の取得に失敗しました。</div>';
    }
  }

  function updateBonusHomeNotice(hasUnclaimed){
    var btn = document.getElementById('bonus-home-entry');
    if(!btn) return;
    btn.classList.toggle('has-unclaimed', !!hasUnclaimed);
  }

  async function refreshBonusHomeNotice(){
    try {
      if(window._profileLoadState !== 'ready') return;
      var state = await fetchState();
      if(!state) return;
      updateBonusHomeNotice(state.last_login_bonus_date !== getJstDateString());
    } catch (_) {}
  }

  async function openBonusScreen(){
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    var screen = document.getElementById('screen-bonus');
    if(!screen) return;
    screen.classList.add('active');
    var guf = document.getElementById('global-user-frame');
    if(guf){ guf.classList.remove('hidden'); guf.classList.add('hud-dark'); guf.style.display = ''; }
    if(typeof window.setNavVisible === 'function') window.setNavVisible(true);
    var mainNav = document.getElementById('bnav-main');
    document.querySelectorAll('.bottom-nav-item').forEach(function(el){ el.classList.remove('active'); });
    if(mainNav) mainNav.classList.add('active');
    if(typeof window.updateHeaderHeight === 'function') window.updateHeaderHeight();
    await renderBonusPage();
  }

  async function openLoginBonusFromBonusPage(){
    var state = await fetchState();
    if(!state) return;
    var today = getJstDateString();
    if(state.last_login_bonus_date === today){ await renderBonusPage(); return; }
    var lastDay = Math.max(0, Math.min(7, Number(state.login_bonus_day || 0)));
    showModal((lastDay % 7) + 1);
  }

  async function getSpecialTicketBalance(){
    try { var state = await fetchState(); return Math.max(0, Number(state && state.special_stage_ticket || 0)); }
    catch (_) { return 0; }
  }

  async function refreshSpecialTicketUI(){
    var count = await getSpecialTicketBalance();
    document.querySelectorAll('#special-ticket-count,[data-special-ticket-count]').forEach(function(el){ el.textContent = String(count); });
    return count;
  }

  window.getSpecialTicketBalance = getSpecialTicketBalance;
  window.refreshSpecialTicketUI = refreshSpecialTicketUI;
  window.openLoginBonusIfNeeded = openLoginBonusIfNeeded;
  window.claimLoginBonus = claimLoginBonus;
  window.closeLoginBonus = closeModal;
  window.openBonusScreen = openBonusScreen;
  window.renderBonusPage = renderBonusPage;
  window.openLoginBonusFromBonusPage = openLoginBonusFromBonusPage;
  window.refreshBonusHomeNotice = refreshBonusHomeNotice;
})();
