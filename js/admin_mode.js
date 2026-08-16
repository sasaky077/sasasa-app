(function(){
  'use strict';

  const STORAGE_KEY = 'sasaphia_admin_mode_v1';
  const TAP_REQUIRED = 7;
  const TAP_WINDOW_MS = 3200;
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
          <button type="button" class="sasaphia-admin-raid-reset-btn" data-admin-raid-reset>本日のレイドを完全リセット</button>
          <button type="button" class="sasaphia-admin-exit" data-admin-exit>管理者モードを終了</button>
          <button type="button" class="sasaphia-admin-close" data-admin-panel-close>閉じる</button>
        </div>`;
      panel.addEventListener('click', e => {
        if(e.target === panel || e.target.closest('[data-admin-panel-close]')) closeAdminPanel();
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

  function handleSettingsNavTap(){
    if(typeof window.showMainTab === 'function') window.showMainTab('setting');
    const now = Date.now();
    if(now - lastTapAt > TAP_WINDOW_MS) tapCount = 0;
    lastTapAt = now;
    tapCount++;
    if(tapCount >= TAP_REQUIRED){
      tapCount = 0;
      if(isEnabled()) openAdminPanel();
      else openAuth();
    }
  }

  function bindSettingsNavTap(){
    const btn = document.getElementById('bnav-setting');
    if(!btn || btn.dataset.adminTapBound === '1') return;
    btn.dataset.adminTapBound = '1';

    // 既存の画面遷移はそのまま残し、ADMIN用タップ数だけ横取りせずに加算する。
    // onclick属性を書き換えないため、通常の設定ボタン挙動を壊さない。
    btn.addEventListener('click', function(){
      const now = Date.now();
      if(now - lastTapAt > TAP_WINDOW_MS) tapCount = 0;
      lastTapAt = now;
      tapCount++;
      if(tapCount >= TAP_REQUIRED){
        tapCount = 0;
        if(isEnabled()) openAdminPanel();
        else openAuth();
      }
    });
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
