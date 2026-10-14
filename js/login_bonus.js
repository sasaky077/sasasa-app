/* =========================================================
   ZERAPHIA - 7日周期ログインボーナス
   DAY1〜6: 結晶 ×2 / 4 / 6 / 8 / 10 / 20
   DAY7: SPECIAL TICKET -ノア- ×1
   ※ 日付判定・付与の確定はSupabase RPC側で行う
   ========================================================= */
(function(){
  'use strict';

  var REWARDS = [
    { type:'gem',    itemId:null, name:'結晶',                    qty:2,  image:'images/icon_gem.webp' },
    { type:'gem',    itemId:null, name:'結晶',                    qty:4,  image:'images/icon_gem.webp' },
    { type:'gem',    itemId:null, name:'結晶',                    qty:6,  image:'images/icon_gem.webp' },
    { type:'gem',    itemId:null, name:'結晶',                    qty:8,  image:'images/icon_gem.webp' },
    { type:'gem',    itemId:null, name:'結晶',                    qty:10, image:'images/icon_gem.webp' },
    { type:'gem',    itemId:null, name:'結晶',                    qty:20, image:'images/icon_gem.webp' },
    { type:'ticket', itemId:'special_stage_ticket', name:'SPECIAL TICKET -ノア-', qty:1, image:'images/special_stage_ticket.webp' }
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

  // build1487: 「今日受け取ったか」の判定を一本化。
  //  ・DBの日付が時刻付き（'2026-10-15T00:00:00' 等）でも先頭10文字で比較する。
  //  ・サーバーが「今日は受取済み」と返した日は端末に控え、日付表記がずれていても未受取扱いにしない
  //    （サーバーがUTC日付で記録している場合、JST 0〜9時に通知ドットが消えなくなるため）。
  var SERVER_CLAIMED_KEY = 'zeraphia_login_bonus_server_claimed_v1';
  function normalizeDate(v){ return String(v || '').slice(0, 10); }
  function markServerClaimedToday(){
    try { localStorage.setItem(SERVER_CLAIMED_KEY, getUserId() + '|' + getJstDateString()); } catch(_){}
  }
  function isServerClaimedToday(){
    try { return localStorage.getItem(SERVER_CLAIMED_KEY) === getUserId() + '|' + getJstDateString(); } catch(_){ return false; }
  }
  function isClaimedToday(state){
    if(isServerClaimedToday()) return true;
    return normalizeDate(state && state.last_login_bonus_date) === getJstDateString();
  }

  function getReward(day){
    day = Math.max(1, Math.min(7, Number(day || 1)));
    return REWARDS[day - 1];
  }

  function getClaimedThrough(state){
    state = state || {};
    var lastDay = Math.max(0, Math.min(7, Number(state.login_bonus_day || 0)));
    if(lastDay <= 0) return 0;
    var claimedToday = isClaimedToday(state);
    // DAY7受取後、翌日は新しい7日サイクルのDAY1。
    if(!claimedToday && lastDay === 7) return 0;
    return lastDay;
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
        '<p class="login-bonus-sub">DAY 7：SPECIAL TICKET -ノア- ×1</p>' +
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

    if(!document.getElementById('login-bonus-mixed-style-v107')){
      var style = document.createElement('style');
      style.id = 'login-bonus-mixed-style-v107';
      style.textContent = [
        '.login-bonus-sheet-mixed-v106 .login-bonus-sub{line-height:1.5}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-days{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:136px;gap:8px;align-items:stretch}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-day{height:136px;min-height:136px;padding:9px 6px 9px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;position:relative;overflow:hidden;box-sizing:border-box}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-day.is-special{grid-column:span 2;height:136px;min-height:136px}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-day-num{font-size:10px;letter-spacing:.12em;color:#b29461}',
        '.login-bonus-mixed-reward{width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;margin-top:7px}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-day img.login-bonus-material-thumb{display:block!important;width:45px!important;height:45px!important;max-width:45px!important;object-fit:contain!important;margin:0!important;filter:drop-shadow(0 2px 4px rgba(110,84,34,.10))!important}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-day img.login-bonus-ticket-thumb{display:block!important;width:120px!important;height:auto!important;max-width:none!important;object-fit:contain!important;margin:0!important;filter:drop-shadow(0 3px 6px rgba(110,84,34,.12))!important}',
        '.login-bonus-mixed-count{font-family:"Cinzel","Noto Serif JP",serif;font-size:13px;line-height:1;color:#9b6a18;font-weight:600}',
        '.login-bonus-mixed-name{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;font-size:7.5px;line-height:1.3;color:#9c8767}',
        '.login-bonus-today-mixed{display:flex;align-items:center;justify-content:center;gap:12px}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-today img.login-bonus-today-reward-image{display:block!important;width:66px!important;height:66px!important;max-width:66px!important;object-fit:contain!important;margin:0!important}',
        '.login-bonus-sheet-mixed-v106 .login-bonus-today img.login-bonus-today-reward-image.is-ticket{width:154px!important;height:auto!important;max-width:42vw!important}',
        '.login-bonus-today-copy{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;min-width:0}',
        '.login-bonus-today-copy b{font-family:"Cinzel","Noto Serif JP",serif;font-size:28px;line-height:1;color:#9b6a18}',
        '.login-bonus-today-copy span{margin-top:4px}',
        '.login-bonus-today-note{margin-top:4px;font-size:9px;letter-spacing:.04em;color:#a98955;white-space:nowrap}',
        '#login-bonus-modal .login-bonus-day.is-special .login-bonus-mixed-reward{margin-top:2px!important;gap:1px!important}',
        '#login-bonus-modal .login-bonus-day.is-special img.login-bonus-ticket-thumb{width:96px!important;max-width:96px!important}',
        '#login-bonus-modal .login-bonus-day.is-special .login-bonus-mixed-count{margin-top:0!important;line-height:1!important}',
        '#login-bonus-modal .login-bonus-day.is-special .login-bonus-mixed-name{line-height:1.15!important;font-size:7px!important;overflow:visible!important;text-overflow:clip!important}',
        '#login-bonus-modal .login-bonus-sheet{border-radius:0!important}',
        '#login-bonus-modal .login-bonus-day{border-radius:0!important}',
        '#login-bonus-modal .login-bonus-today{border-radius:0!important}',
        '#login-bonus-modal .login-bonus-claim-btn{border-radius:0!important}',
        '#login-bonus-modal .login-bonus-day{position:relative!important}',
        '#login-bonus-modal .login-bonus-check{position:absolute!important;top:7px!important;right:7px!important;left:auto!important;border-radius:0!important;width:auto!important;min-width:42px!important;height:18px!important;padding:0 5px!important;font-size:7px!important;font-weight:500!important;letter-spacing:.04em!important;z-index:4!important}',
        '#login-bonus-modal .login-bonus-day.is-claimed{background:rgba(239,238,235,.76)!important;border-color:rgba(142,136,126,.24)!important;box-shadow:none!important}',
        '#login-bonus-modal .login-bonus-day.is-claimed .login-bonus-day-num,#login-bonus-modal .login-bonus-day.is-claimed .login-bonus-mixed-reward{opacity:.48!important;filter:grayscale(.72) saturate(.22)!important}',
        '#login-bonus-modal .login-bonus-day.is-claimed .login-bonus-check{opacity:.88!important;filter:none!important;background:rgba(156,148,136,.72)!important;color:#fffdf8!important}',
        '@media(max-width:360px){',
        '  .login-bonus-sheet-mixed-v106 .login-bonus-day{height:126px;min-height:126px;padding:8px 5px}',
        '  .login-bonus-sheet-mixed-v106 .login-bonus-day img.login-bonus-material-thumb{width:40px!important;height:40px!important;max-width:40px!important}',
        '  .login-bonus-sheet-mixed-v106 .login-bonus-day img.login-bonus-ticket-thumb{width:90px!important}',
        '  .login-bonus-sheet-mixed-v106 .login-bonus-today img.login-bonus-today-reward-image.is-ticket{width:136px!important}',
        '}'
      ].join('');
      document.head.appendChild(style);
    }

    modal = root;
    root.querySelector('#login-bonus-claim-btn').addEventListener('click', function(){ claimLoginBonus(); });
    return root;
  }

  function renderDays(currentDay, claimedThrough){
    var root = ensureModal();
    var daysEl = root.querySelector('#login-bonus-days');
    var html = '';
    claimedThrough = Math.max(0, Math.min(7, Number(claimedThrough || 0)));

    for(var i = 1; i <= 7; i++){
      var reward = getReward(i);
      var claimed = i <= claimedThrough;
      var cls = ['login-bonus-day'];
      if(i === 7) cls.push('is-special');
      if(i === currentDay) cls.push('is-current');
      if(claimed) cls.push('is-claimed');
      html +=
        '<div class="' + cls.join(' ') + '">' +
          '<span class="login-bonus-day-num">DAY ' + i + '</span>' +
          '<div class="login-bonus-mixed-reward">' +
            '<img src="' + reward.image + '" alt="' + reward.name + '" class="' + (reward.type === 'ticket' ? 'login-bonus-ticket-thumb' : 'login-bonus-material-thumb') + '">' +
            '<b class="login-bonus-mixed-count">×' + reward.qty + '</b>' +
            '<small class="login-bonus-mixed-name">' + reward.name + '</small>' +
          '</div>' +
          (claimed ? '<span class="login-bonus-check">受取済み</span>' : '') +
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

  function showModal(day, claimedThrough){
    var root = ensureModal();
    day = Math.max(1, Math.min(7, Number(day || 1)));
    renderDays(day, claimedThrough || 0);
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
      .select('login_bonus_day,last_login_bonus_date,special_stage_ticket,gem')
      .eq('user_id', uid)
      .maybeSingle();
    if(result.error) throw result.error;
    return result.data || { login_bonus_day:0, last_login_bonus_date:null, special_stage_ticket:0, gem:0 };
  }

  function applyInventoryReward(itemId, totalQuantity){
    if(!itemId || totalQuantity == null) return;
    var total = Math.max(0, Number(totalQuantity || 0));
    try {
      var isEvolution = !!(window.EVOLUTION_MATERIAL_MASTER && window.EVOLUTION_MATERIAL_MASTER[itemId]);
      if(isEvolution){
        var evoKey = 'zeraphia_evolution_materials_v1';
        var evolution = {};
        try { evolution = JSON.parse(localStorage.getItem(evoKey) || '{}') || {}; } catch(_) { evolution = {}; }
        if(total > 0) evolution[itemId] = total;
        else delete evolution[itemId];
        localStorage.setItem(evoKey, JSON.stringify(evolution));
        try{ window.dispatchEvent(new CustomEvent('zeraphia:evolution-materials-cloud-loaded', { detail:evolution })); }catch(_){}
        return;
      }

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

  // build1483: 0時以降の初回ログインとホームの［ボーナス］は同じ画面へ。
  async function openLoginBonusIfNeeded(){
    if(window._profileLoadState !== 'ready') return false;
    var state = await fetchState();
    if(!state) return false;
    var today = getJstDateString();
    var claimed = isClaimedToday(state);
    updateBonusHomeNotice(!claimed);
    if(claimed) return false;
    await openBonusScreen();
    return true;
  }

  // 受け取り処理もボーナス画面内で完結させる（旧モーダルを表示しない）。
  // 報酬の重複付与防止・日付確定は従来どおりSupabase RPCが担当。
  async function claimLoginBonus(){
    if(isClaiming) return;
    isClaiming = true;
    var btn = document.querySelector('#screen-bonus .bonus-card-action');
    if(btn){
      btn.disabled = true;
      btn.textContent = '受け取り中...';
    }

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
        markServerClaimedToday();
        updateBonusHomeNotice(false);
        await renderBonusPage();
        if(typeof window.showToast === 'function') window.showToast('ログインボーナスは受取済みです。');
        return;
      }

      markServerClaimedToday();
      var rewardQty = Math.max(0, Number(row.reward_quantity != null ? row.reward_quantity : reward.qty));
      var refreshedProfile = await fetchState();
      if(window.userProfile){
        if(refreshedProfile && refreshedProfile.gem != null) window.userProfile.gem = Number(refreshedProfile.gem || 0);
        window.userProfile.login_bonus_day = day;
        window.userProfile.last_login_bonus_date = row.last_claim_date || getJstDateString();
        if(row.total_special_ticket != null) window.userProfile.special_stage_ticket = Number(row.total_special_ticket || 0);
      }
      if(row.reward_item_id && row.total_item_quantity != null){
        if(typeof window.loadInventoryFromSupabase === 'function'){
          await window.loadInventoryFromSupabase(uid);
        } else {
          applyInventoryReward(String(row.reward_item_id), Number(row.total_item_quantity || 0));
        }
      }

      if(typeof window.updateMainUI === 'function') window.updateMainUI();
      updateBonusHomeNotice(false);
      await renderBonusPage();
      if(typeof window.refreshSpecialTicketUI === 'function') window.refreshSpecialTicketUI();
      if(typeof window.showToast === 'function') window.showToast('ログインボーナス：' + reward.name + ' ×' + rewardQty);
    } catch(error) {
      console.error('[LoginBonus] claim failed:', error);
      if(btn){
        btn.disabled = false;
        btn.textContent = 'もう一度試す';
      }
      if(typeof window.showToast === 'function') window.showToast('受け取りに失敗しました。通信状況をご確認ください。');
    } finally {
      isClaiming = false;
    }
  }

  async function renderBonusPage(){
    var list = document.getElementById('bonus-page-list');
    if(!list) return;
    list.innerHTML = '<div class="bonus-page-loading">読み込み中...</div>';
    try {
      var state = await fetchState();
      if(!state){ list.innerHTML = '<div class="bonus-page-error">ログイン情報を取得できません。</div>'; return; }
      var today = getJstDateString();
      var claimedToday = isClaimedToday(state);
      var lastDay = Math.max(0, Math.min(7, Number(state.login_bonus_day || 0)));
      var cycleDay = ((lastDay % 7) + 1);
      var nextDay = cycleDay;
      var claimedThrough = getClaimedThrough(state);
      var html = '';
      html += '<section class="bonus-page-card">';
      html +=   '<div class="bonus-card-head">';
      html +=     '<div class="bonus-card-title-wrap">';
      html +=       '<small>DAILY RESONANCE</small>';
      html +=       '<h3>ログインボーナス</h3>';
      html +=       '<p class="bonus-card-sub">— 今日も、世界のどこかで、きっと誰かが祈っている —</p>';
      html +=     '</div>';
      html +=     '<button type="button" class="bonus-archive-btn" aria-label="受取済み一覧">受取済み一覧</button>';
      html +=   '</div>';
      html +=   '<div class="bonus-mixed-row">';
      for(var i = 1; i <= 7; i++){
        var reward = getReward(i);
        var cls = ['bonus-mixed-day'];
        var isClaimed = (i <= claimedThrough);
        var isNext = (i === nextDay);
        var isTodayClaimed = claimedToday && i === lastDay;
        if(i === 7) cls.push('is-special');
        if(isClaimed) cls.push('is-claimed');
        if(isNext) cls.push('is-next');
        if(isTodayClaimed) cls.push('is-today-claimed');
        html += '<div class="' + cls.join(' ') + '">';
        html +=   '<div class="bonus-day-head"><span class="bonus-day-label"><em>DAY</em><b>' + i + '</b></span></div>';
        if(isClaimed) html += '<i class="bonus-day-mark bonus-day-mark-claimed" aria-hidden="true">受取済み</i>';
        if(isNext) html += '<i class="bonus-day-mark bonus-day-mark-next" aria-hidden="true">NEXT</i>';
        html +=   '<div class="bonus-mixed-reward">';
        html +=     '<img src="' + reward.image + '" alt="' + reward.name + '" class="' + (reward.type === 'ticket' ? 'ticket' : 'material') + '">';
        html +=     '<b>×' + reward.qty + '</b>';
        html +=     '<small>' + reward.name + '</small>';
        html +=   '</div>';
        html += '</div>';
      }
      html +=   '</div>';
      html +=   '<div class="bonus-card-foot">';
      html +=     '<div class="bonus-card-note">毎日 0:00（JST）に更新されます<br>DAY 1〜6：育成素材（結晶）<br>DAY 7：SPECIAL TICKET -ノア- ×1</div>';
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
    var badge = document.getElementById('bonus-home-entry-notice');
    var count = hasUnclaimed ? 1 : 0;
    btn.classList.toggle('has-unclaimed', count > 0);
    if(badge){
      badge.textContent = count > 0 ? String(count) : '';
      badge.setAttribute('aria-hidden', count > 0 ? 'false' : 'true');
    }
    btn.setAttribute('aria-label', count > 0 ? ('ボーナスを確認、未受取' + count + '件') : 'ボーナスを確認');
  }

  async function refreshBonusHomeNotice(){
    try {
      if(window._profileLoadState !== 'ready') return;
      var state = await fetchState();
      if(!state) return;
      updateBonusHomeNotice(!isClaimedToday(state));
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
    // ［受け取る］でも旧ポップアップへ遷移せず、この画面で確定する。
    await claimLoginBonus();
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
