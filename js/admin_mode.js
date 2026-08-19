(function(){
  'use strict';

  const STORAGE_KEY = 'sasaphia_admin_mode_v1';
  const TAP_REQUIRED = 7;
  const TAP_WINDOW_MS = 5000;
  let tapCount = 0;
  let lastTapAt = 0;
  let verifying = false;

  function sb(){ return window.zsSupabase || null; }
  function uid(){ return String(localStorage.getItem('zukan_user_id') || '').trim().toLowerCase(); }

  function isEnabled(){
    try { return localStorage.getItem(STORAGE_KEY) === '1'; }
    catch(_) { return false; }
  }

  function setEnabled(value){
    try {
      if(value) localStorage.setItem(STORAGE_KEY, '1');
      else localStorage.removeItem(STORAGE_KEY);
    } catch(_) {}
    syncUi();
    try { window.dispatchEvent(new CustomEvent('sasaphia-admin-mode-changed', { detail:{ enabled:!!value } })); } catch(_) {}
  }

  function ensureUi(){
    if(!document.getElementById('sasaphia-admin-friend-style-v164')){
      const style=document.createElement('style');
      style.id='sasaphia-admin-friend-style-v164';
      style.textContent=`
#sasaphia-admin-force-friend{display:none;position:fixed;inset:0;z-index:410100;background:rgba(15,14,13,.72);align-items:center;justify-content:center;padding:18px}
#sasaphia-admin-force-friend.show{display:flex}
.sasaphia-admin-friend-card{width:min(92vw,430px);max-height:88vh;overflow:auto;background:#171614;border:1px solid rgba(217,184,112,.42);box-shadow:0 18px 70px rgba(0,0,0,.58);padding:22px;color:#eee;display:flex;flex-direction:column;gap:9px}
.sasaphia-admin-friend-card>strong{font-size:18px;letter-spacing:.04em}.sasaphia-admin-friend-card p{font-size:12px;line-height:1.7;color:#bbb;margin:0 0 4px}.sasaphia-admin-friend-card label{font-size:11px;color:#d8bc80;margin-top:5px}
.sasaphia-admin-friend-card input{width:100%;height:40px;border:1px solid rgba(216,188,128,.32);background:#0e0d0c;color:#fff;padding:0 11px;font-size:13px;outline:none}.sasaphia-admin-friend-card input:focus{border-color:#d8bc80}
.sasaphia-admin-user-preview{min-height:27px;padding:6px 9px;background:rgba(255,255,255,.04);font-size:11px;color:#aaa}.sasaphia-admin-user-preview.is-ok{color:#bfe5be;border-left:2px solid #79b878}.sasaphia-admin-user-preview.is-error{color:#e9a7a7;border-left:2px solid #c96868}
.sasaphia-admin-user-check,.sasaphia-admin-friend-btn{border:1px solid rgba(216,188,128,.5);background:rgba(216,188,128,.11);color:#e5ca90;min-height:38px;padding:8px 12px;cursor:pointer}.sasaphia-admin-friend-btn{width:100%;margin-top:8px}
`;
      document.head.appendChild(style);
    }
    if(!document.getElementById('sasaphia-admin-badge')){
      const badge = document.createElement('button');
      badge.id = 'sasaphia-admin-badge';
      badge.type = 'button';
      badge.textContent = 'DEV';
      badge.setAttribute('aria-label','管理者モード');
      badge.onclick = openAdminPanel;
      document.body.appendChild(badge);
    }

    if(!document.getElementById('sasaphia-admin-auth')){
      const modal = document.createElement('div');
      modal.id = 'sasaphia-admin-auth';
      modal.setAttribute('aria-hidden','true');
      modal.innerHTML = `
        <div class="sasaphia-admin-auth-panel" role="dialog" aria-modal="true" aria-labelledby="sasaphia-admin-auth-title">
          <div class="sasaphia-admin-kicker">DEVELOPER ACCESS</div>
          <strong id="sasaphia-admin-auth-title">管理者認証</strong>
          <p>管理者PINを入力してください。</p>
          <input id="sasaphia-admin-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="PIN">
          <div class="sasaphia-admin-auth-error" id="sasaphia-admin-auth-error"></div>
          <div class="sasaphia-admin-auth-actions">
            <button type="button" data-admin-cancel>キャンセル</button>
            <button type="button" class="primary" data-admin-submit>認証</button>
          </div>
        </div>`;
      modal.addEventListener('click', e => { if(e.target === modal || e.target.closest('[data-admin-cancel]')) closeAuth(); });
      modal.querySelector('[data-admin-submit]').addEventListener('click', verifyPin);
      modal.querySelector('#sasaphia-admin-pin').addEventListener('keydown', e => { if(e.key === 'Enter') verifyPin(); });
      document.body.appendChild(modal);
    }

    if(!document.getElementById('sasaphia-admin-panel')){
      const panel = document.createElement('div');
      panel.id = 'sasaphia-admin-panel';
      panel.setAttribute('aria-hidden','true');
      panel.innerHTML = `
        <div class="sasaphia-admin-panel-card">
          <div class="sasaphia-admin-kicker">ADMIN MODE</div>
          <strong>開発者モード</strong>
          <div class="sasaphia-admin-panel-row"><span>デイリーレイド</span><b>無制限テスト</b></div>
          <div class="sasaphia-admin-panel-row"><span>挑戦回数</span><b>消費しない</b></div>
          <div class="sasaphia-admin-panel-row"><span>共有HP</span><b>反映しない</b></div>
          <button type="button" class="sasaphia-admin-friend-btn" data-admin-force-friend>ユーザー同士をフレンド化</button>
          <button type="button" class="sasaphia-admin-raid-reset-btn" data-admin-raid-reset>本日のレイドを完全リセット</button>
          <button type="button" class="sasaphia-admin-exit" data-admin-exit>管理者モードを終了</button>
          <button type="button" class="sasaphia-admin-close" data-admin-panel-close>閉じる</button>
        </div>`;
      panel.addEventListener('click', e => {
        if(e.target === panel || e.target.closest('[data-admin-panel-close]')) closeAdminPanel();
        if(e.target.closest('[data-admin-force-friend]')) {
          closeAdminPanel();
          openForceFriend();
        }
        if(e.target.closest('[data-admin-raid-reset]')) {
          closeAdminPanel();
          openRaidReset();
        }
        if(e.target.closest('[data-admin-exit]')) {
          setEnabled(false);
          closeAdminPanel();
        }
      });
      document.body.appendChild(panel);
    }

    if(!document.getElementById('sasaphia-admin-force-friend')){
      const modal = document.createElement('div');
      modal.id = 'sasaphia-admin-force-friend';
      modal.setAttribute('aria-hidden','true');
      modal.innerHTML = `
        <div class="sasaphia-admin-friend-card" role="dialog" aria-modal="true" aria-labelledby="sasaphia-admin-friend-title">
          <div class="sasaphia-admin-kicker">USER RELATION CONTROL</div>
          <strong id="sasaphia-admin-friend-title">ユーザー同士をフレンド化</strong>
          <p>フレンド申請を経由せず、2ユーザー間の関係を <b>accepted</b> にします。</p>
          <label for="sasaphia-admin-friend-a">ユーザーA ID</label>
          <input id="sasaphia-admin-friend-a" type="text" autocomplete="off" placeholder="user_id">
          <div class="sasaphia-admin-user-preview" id="sasaphia-admin-friend-a-preview">未確認</div>
          <label for="sasaphia-admin-friend-b">ユーザーB ID</label>
          <input id="sasaphia-admin-friend-b" type="text" autocomplete="off" placeholder="user_id">
          <div class="sasaphia-admin-user-preview" id="sasaphia-admin-friend-b-preview">未確認</div>
          <button type="button" class="sasaphia-admin-user-check" data-admin-friend-check>ユーザーを確認</button>
          <label for="sasaphia-admin-friend-pin">管理者PIN</label>
          <input id="sasaphia-admin-friend-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="PIN">
          <div class="sasaphia-admin-auth-error" id="sasaphia-admin-friend-error"></div>
          <div class="sasaphia-admin-auth-actions">
            <button type="button" data-admin-friend-cancel>キャンセル</button>
            <button type="button" class="primary" data-admin-friend-submit>フレンド化</button>
          </div>
        </div>`;
      modal.addEventListener('click', e => {
        if(e.target === modal || e.target.closest('[data-admin-friend-cancel]')) closeForceFriend();
        if(e.target.closest('[data-admin-friend-check]')) previewForceFriendUsers();
      });
      modal.querySelector('[data-admin-friend-submit]').addEventListener('click', executeForceFriend);
      modal.querySelector('#sasaphia-admin-friend-pin').addEventListener('keydown', e => { if(e.key === 'Enter') executeForceFriend(); });
      document.body.appendChild(modal);
    }

    if(!document.getElementById('sasaphia-admin-raid-reset')){
      const modal = document.createElement('div');
      modal.id = 'sasaphia-admin-raid-reset';
      modal.setAttribute('aria-hidden','true');
      modal.innerHTML = `
        <div class="sasaphia-admin-reset-card" role="dialog" aria-modal="true" aria-labelledby="sasaphia-admin-reset-title">
          <div class="sasaphia-admin-kicker">DANGEROUS ACTION</div>
          <strong id="sasaphia-admin-reset-title">本日のレイドを完全リセット</strong>
          <p>同じレイドに参加している全員の挑戦状況・与ダメージを初期化し、ボスHPを最大値まで戻します。</p>
          <div class="sasaphia-admin-reset-summary">
            <span>全メンバー</span><b>未挑戦へ</b>
            <span>DAMAGE</span><b>0</b>
            <span>BOSS HP</span><b>MAX</b>
          </div>
          <label for="sasaphia-admin-reset-pin">確認のため管理者PINを再入力</label>
          <input id="sasaphia-admin-reset-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="PIN">
          <div class="sasaphia-admin-auth-error" id="sasaphia-admin-reset-error"></div>
          <div class="sasaphia-admin-auth-actions">
            <button type="button" data-admin-reset-cancel>キャンセル</button>
            <button type="button" class="danger" data-admin-reset-submit>完全リセット</button>
          </div>
        </div>`;
      modal.addEventListener('click', e => { if(e.target === modal || e.target.closest('[data-admin-reset-cancel]')) closeRaidReset(); });
      modal.querySelector('[data-admin-reset-submit]').addEventListener('click', executeRaidReset);
      modal.querySelector('#sasaphia-admin-reset-pin').addEventListener('keydown', e => { if(e.key === 'Enter') executeRaidReset(); });
      document.body.appendChild(modal);
    }
  }

  function syncUi(){
    ensureUi();
    const enabled = isEnabled();
    document.documentElement.classList.toggle('sasaphia-admin-mode', enabled);
    const badge = document.getElementById('sasaphia-admin-badge');
    if(badge) badge.style.display = enabled ? 'inline-flex' : 'none';

    let row = document.getElementById('sasaphia-admin-setting-row');
    if(enabled && !row){
      const danger = document.querySelector('#screen-setting .setting-danger');
      const section = danger && danger.closest('.setting-section');
      if(section){
        row = document.createElement('div');
        row.id = 'sasaphia-admin-setting-row';
        row.className = 'setting-row sasaphia-admin-setting-row';
        row.innerHTML = '<span class="setting-row-label">管理者モード</span><span class="setting-row-sub">ON · DEV</span>';
        row.onclick = openAdminPanel;
        section.parentNode.insertBefore(row, section);
      }
    } else if(!enabled && row){
      row.remove();
    }
  }

  function openAuth(){
    ensureUi();
    const modal = document.getElementById('sasaphia-admin-auth');
    const input = document.getElementById('sasaphia-admin-pin');
    const err = document.getElementById('sasaphia-admin-auth-error');
    if(err) err.textContent = '';
    if(input) input.value = '';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    setTimeout(()=>input && input.focus(), 80);
  }

  function closeAuth(){
    const modal = document.getElementById('sasaphia-admin-auth');
    if(!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
  }

  async function verifyPin(){
    if(verifying) return;
    const input = document.getElementById('sasaphia-admin-pin');
    const err = document.getElementById('sasaphia-admin-auth-error');
    const pin = String(input && input.value || '').trim();
    if(!pin){ if(err) err.textContent = 'PINを入力してください'; return; }
    const client = sb();
    if(!client || typeof client.rpc !== 'function'){ if(err) err.textContent = 'Supabaseへ接続できません'; return; }

    verifying = true;
    if(err) err.textContent = '認証中...';
    try {
      const res = await client.rpc('verify_sasaphia_admin_pin', { p_user_id:uid(), p_pin:pin });
      if(res && res.error) throw res.error;
      if(res && res.data === true){
        setEnabled(true);
        closeAuth();
        showToast('ADMIN MODE ON');
      } else {
        if(err) err.textContent = 'PINが違います';
        if(input){ input.value=''; input.focus(); }
      }
    } catch(e){
      console.error('[admin] verify failed', e);
      if(err) err.textContent = '認証エラー: ' + String((e && e.message) || 'SQL設定を確認してください');
    } finally {
      verifying = false;
    }
  }

  function openAdminPanel(){
    if(!isEnabled()) return openAuth();
    ensureUi();
    const panel = document.getElementById('sasaphia-admin-panel');
    panel.classList.add('show');
    panel.setAttribute('aria-hidden','false');
  }

  function closeAdminPanel(){
    const panel = document.getElementById('sasaphia-admin-panel');
    if(!panel) return;
    panel.classList.remove('show');
    panel.setAttribute('aria-hidden','true');
  }

  function normalizeAdminUserId(value){
    return String(value || '').trim().toLowerCase();
  }

  async function resolveAdminUserPreview(targetId, previewId){
    const preview = document.getElementById(previewId);
    const userId = normalizeAdminUserId(targetId);
    if(!preview) return null;
    if(!userId){ preview.textContent = 'IDを入力してください'; preview.className='sasaphia-admin-user-preview is-error'; return null; }
    const client = sb();
    if(!client){ preview.textContent = 'Supabaseへ接続できません'; preview.className='sasaphia-admin-user-preview is-error'; return null; }
    preview.textContent = '確認中...';
    preview.className='sasaphia-admin-user-preview';
    try {
      const res = await client.from('user_profiles').select('user_id,display_name').eq('user_id', userId).limit(1);
      if(res && res.error) throw res.error;
      const row = res && Array.isArray(res.data) ? res.data[0] : null;
      if(!row){ preview.textContent = 'ユーザーが見つかりません'; preview.className='sasaphia-admin-user-preview is-error'; return null; }
      preview.textContent = (row.display_name || 'Player') + ' / ' + row.user_id;
      preview.className='sasaphia-admin-user-preview is-ok';
      return row;
    } catch(e){
      preview.textContent = '確認失敗: ' + String((e && e.message) || e || 'error');
      preview.className='sasaphia-admin-user-preview is-error';
      return null;
    }
  }

  async function previewForceFriendUsers(){
    const a = normalizeAdminUserId(document.getElementById('sasaphia-admin-friend-a')?.value);
    const b = normalizeAdminUserId(document.getElementById('sasaphia-admin-friend-b')?.value);
    const rows = await Promise.all([
      resolveAdminUserPreview(a, 'sasaphia-admin-friend-a-preview'),
      resolveAdminUserPreview(b, 'sasaphia-admin-friend-b-preview')
    ]);
    return rows[0] && rows[1] ? rows : null;
  }

  function openForceFriend(){
    if(!isEnabled()) return openAuth();
    ensureUi();
    const modal = document.getElementById('sasaphia-admin-force-friend');
    const err = document.getElementById('sasaphia-admin-friend-error');
    if(err) err.textContent='';
    ['sasaphia-admin-friend-a','sasaphia-admin-friend-b','sasaphia-admin-friend-pin'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    ['sasaphia-admin-friend-a-preview','sasaphia-admin-friend-b-preview'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.textContent='未確認'; el.className='sasaphia-admin-user-preview'; } });
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    setTimeout(()=>document.getElementById('sasaphia-admin-friend-a')?.focus(),80);
  }

  function closeForceFriend(){
    const modal = document.getElementById('sasaphia-admin-force-friend');
    if(!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
  }

  async function executeForceFriend(){
    if(verifying || !isEnabled()) return;
    const err = document.getElementById('sasaphia-admin-friend-error');
    const a = normalizeAdminUserId(document.getElementById('sasaphia-admin-friend-a')?.value);
    const b = normalizeAdminUserId(document.getElementById('sasaphia-admin-friend-b')?.value);
    const pin = String(document.getElementById('sasaphia-admin-friend-pin')?.value || '').trim();
    if(!a || !b){ if(err) err.textContent='2人のユーザーIDを入力してください'; return; }
    if(a === b){ if(err) err.textContent='同じユーザー同士は指定できません'; return; }
    if(!pin){ if(err) err.textContent='管理者PINを入力してください'; return; }
    const users = await previewForceFriendUsers();
    if(!users){ if(err) err.textContent='ユーザーIDを確認してください'; return; }
    const client = sb();
    if(!client || typeof client.rpc !== 'function'){ if(err) err.textContent='Supabaseへ接続できません'; return; }
    verifying=true;
    if(err) err.textContent='フレンド化しています...';
    try {
      const res = await client.rpc('admin_force_friendship', {
        p_admin_user_id: uid(), p_pin: pin, p_user_a: a, p_user_b: b
      });
      if(res && res.error) throw res.error;
      const data = res ? res.data : null;
      if(!data || data.ok === false){ if(err) err.textContent=(data && data.message) || 'フレンド化できませんでした'; return; }
      closeForceFriend();
      showToast('FRIENDSHIP ACCEPTED');
      try { if(typeof window.loadFriendScreen === 'function') window.loadFriendScreen(); } catch(_) {}
      try { window.dispatchEvent(new CustomEvent('sasaphia-admin-friendship-changed', {detail:data})); } catch(_) {}
    } catch(e){
      console.error('[admin] force friendship failed',e);
      if(err) err.textContent='実行エラー: ' + String((e && e.message) || e || 'unknown');
    } finally { verifying=false; }
  }

  function openRaidReset(){
    if(!isEnabled()) return;
    ensureUi();
    const modal = document.getElementById('sasaphia-admin-raid-reset');
    const input = document.getElementById('sasaphia-admin-reset-pin');
    const err = document.getElementById('sasaphia-admin-reset-error');
    if(err) err.textContent = '';
    if(input) input.value = '';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    setTimeout(()=>input && input.focus(), 80);
  }

  function closeRaidReset(){
    const modal = document.getElementById('sasaphia-admin-raid-reset');
    if(!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
  }

  async function executeRaidReset(){
    if(verifying || !isEnabled()) return;
    const input = document.getElementById('sasaphia-admin-reset-pin');
    const err = document.getElementById('sasaphia-admin-reset-error');
    const pin = String(input && input.value || '').trim();
    if(!pin){ if(err) err.textContent = 'PINを入力してください'; return; }
    const client = sb();
    if(!client || typeof client.rpc !== 'function'){ if(err) err.textContent = 'Supabaseへ接続できません'; return; }

    verifying = true;
    if(err) err.textContent = 'リセット中...';
    try {
      const res = await client.rpc('admin_reset_daily_raid', { p_user_id:uid(), p_pin:pin });
      if(res && res.error) throw res.error;
      const data = res ? res.data : null;
      if(!data || data.ok === false){
        if(err) err.textContent = (data && data.message) || 'リセットできませんでした';
        return;
      }
      closeRaidReset();
      showToast('DAILY RAID RESET');
      try { window.dispatchEvent(new CustomEvent('sasaphia-daily-raid-reset', { detail:data })); } catch(_) {}
    } catch(e){
      console.error('[admin] raid reset failed', e);
      if(err) err.textContent = String((e && e.message) || 'リセットに失敗しました');
    } finally {
      verifying = false;
    }
  }

  function showToast(text){
    let el = document.getElementById('sasaphia-admin-toast');
    if(!el){ el=document.createElement('div'); el.id='sasaphia-admin-toast'; document.body.appendChild(el); }
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(el.__timer);
    el.__timer=setTimeout(()=>el.classList.remove('show'),1600);
  }

  function countAdminTap(){
    const now = Date.now();
    if(now - lastTapAt > TAP_WINDOW_MS) tapCount = 0;
    lastTapAt = now;
    tapCount++;

    // カウント確認用。通常利用者には7連打しない限り一瞬だけ表示される。

    if(tapCount >= TAP_REQUIRED){
      tapCount = 0;
      if(isEnabled()) openAdminPanel();
      else openAuth();
    }
  }

  function handleSettingsNavTap(){
    // 旧index互換。設定画面へ移動しつつ、ADMIN用タップも1回加算する。
    if(typeof window.showMainTab === 'function') window.showMainTab('setting');
    countAdminTap();
  }

  function bindSettingsNavTap(){
    const btn = document.getElementById('bnav-setting');
    if(!btn || btn.dataset.adminTapBound === '1') return;
    btn.dataset.adminTapBound = '1';

    // 元の安定実装に戻す：設定ボタンのclickを直接監視する。
    // onclick=showMainTab('setting') は変更しない。
    btn.addEventListener('click', countAdminTap, false);

    // 設定画面上部タイトルでも同じ7回操作を許可。
    const title = document.querySelector('#screen-setting .header-title');
    if(title && title.dataset.adminTapBound !== '1'){
      title.dataset.adminTapBound = '1';
      title.addEventListener('click', countAdminTap, false);
    }
  }

  window.SasaphiaAdmin = { isEnabled, setEnabled, openAuth, openPanel:openAdminPanel };
  window.handleSettingsNavTap = handleSettingsNavTap;

  function bootAdminMode(){
    syncUi();
    bindSettingsNavTap();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootAdminMode, {once:true});
  else bootAdminMode();
})();
