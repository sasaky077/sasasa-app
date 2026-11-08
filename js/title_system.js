// =========================================================
// ZERAPHIA 称号システム（build1712 / build1713でランク制）
// ---------------------------------------------------------
// ・称号の定義はこのファイルの TITLE_MASTER に一本化する（名前・説明・入手条件・ランクの見た目）。
// ・称号は「何回獲得したか」がランク（Lv）になる。例：絶望を超えし者 I → II → III …
//   ランクが一定に達すると見た目（tier）が変わる。tier の境目は TITLE_MASTER の tiers で決める。
// ・所持と装備はサーバーが正（Supabase）：
//     get_my_titles()                → { owned:[{ title_id, level }...], equipped:title_id|null }
//                                       ※ owned が title_id の文字列配列でも動く（その場合 Lv1 扱い）
//     equip_title(p_title_id)        → { ok, equipped }   ※ null で外す
//     get_public_titles(p_user_ids)  → [{ user_id, title_id, title_level }]（装備中の称号だけ）
//   付与・ランクアップはコンテンツ側のサーバー処理（例：finish_despair_tower_run の20F踏破）が行う。
// ・表示：ホームの名前の上／設定のプロフィール／フレンド一覧／ランキング。
//   他の画面から使うときは ZeraphiaTitles.badgeHTML(titleId, level) か decorate(root) を呼ぶ。
//   decorate は [data-title-user="ユーザーID"] か [data-title-id="称号ID"][data-title-level="Lv"] に差し込む。
// =========================================================
(function(){
  'use strict';

  const TITLE_MASTER = Object.freeze({
    reason_knower: Object.freeze({
      id:'reason_knower', name:'理を知る者', rarity:'SR',
      desc:'位相回遊100Fから50Fごとの初回突破で I〜V に昇格する称号。',
      how:'位相回遊100F / 150F / 200F / 250F / 300F',
      tone:'reason', tiers:Object.freeze([{min:1,key:'t1',label:'I'}, {min:2,key:'t2',label:'II'}, {min:3,key:'t3',label:'III'}, {min:4,key:'t4',label:'IV'}, {min:5,key:'t5',label:'V'}])
    }),
    despair_conqueror: Object.freeze({
      id: 'despair_conqueror',
      rarity: 'R',
      name: '絶望を超えし者',
      desc: '残響の塔（絶望）20Fを毎週踏破することで昇格する称号。',
      how: '今週の残響の塔を制覇し、残響の塔（絶望）20Fを踏破',
      tone: 'despair',
      // Lvがこの値以上で見た目が変わる（1：深紅／3：銀縁／5：金縁／10：輝く金縁）
      tiers: Object.freeze([
        Object.freeze({ min: 1,  key: 't1', label: '深紅' }),
        Object.freeze({ min: 3,  key: 't2', label: '銀縁' }),
        Object.freeze({ min: 5,  key: 't3', label: '金縁' }),
        Object.freeze({ min: 10, key: 't4', label: '輝く金縁' })
      ])
    })
  });

  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  function roman(n){
    const v = Math.max(1, Math.floor(Number(n) || 1));
    return v <= 10 ? ROMAN[v] : String(v);
  }

  const PUBLIC_CACHE_MS = 5 * 60 * 1000;
  const state = { loaded:false, loading:null, owned:new Map(), equipped:'', publicCache:new Map() };

  function client(){ return window.zsSupabase || null; }
  function myId(){ try{ return String(localStorage.getItem('zukan_user_id')||'').trim().toLowerCase(); }catch(_){ return ''; } }
  function getTitle(id){ return TITLE_MASTER[String(id||'')] || null; }
  function levelOf(v){ return Math.max(1, Math.floor(Number(v) || 1)); }
  function getTier(titleId, level){
    const t = getTitle(titleId);
    if(!t || !Array.isArray(t.tiers) || !t.tiers.length) return null;
    const lv = levelOf(level);
    let hit = t.tiers[0];
    t.tiers.forEach(x => { if(lv >= x.min) hit = x; });
    return hit;
  }
  function nextTier(titleId, level){
    const t = getTitle(titleId);
    if(!t || !Array.isArray(t.tiers)) return null;
    const lv = levelOf(level);
    return t.tiers.find(x => x.min > lv) || null;
  }
  function labelOf(titleId, level){
    const t = getTitle(titleId);
    if(!t) return '';
    return t.name + ' ' + roman(levelOf(level)) + (t.rarity ? ' ('+t.rarity+')' : '');
  }
  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
  }
  function toast(msg){ if(typeof window.showToast==='function') window.showToast(msg); }
  function parse(data){ if(typeof data==='string'){ try{ return JSON.parse(data); }catch(_){ return null; } } return data; }

  function ensureStyle(){
    if(document.getElementById('zeraphia-title-style-v1713')) return;
    const st = document.createElement('style');
    st.id = 'zeraphia-title-style-v1713';
    st.textContent = `
      .zt-title-badge{display:inline-flex;align-items:center;gap:3px;max-width:100%;padding:1px 7px 1px 6px;border-radius:999px;
        font:700 9px/1.5 "Noto Serif JP",serif;letter-spacing:.08em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        border:1px solid #c6a466;background:linear-gradient(180deg,#fffdf7,#f3e7cf);color:#6b5132;vertical-align:middle}
      .zt-title-badge::before{content:"✦";font-size:8px;opacity:.85}
      .zt-title-badge .zt-rank{font-family:Cinzel,"Noto Serif JP",serif;font-weight:700;letter-spacing:.04em;margin-left:2px}
      .zt-title-badge.tone-reason{border-color:#d7b66a;background:linear-gradient(180deg,#fff6d9,#e8ce8f);color:#684914;box-shadow:0 0 7px rgba(214,170,70,.35)}
      /* 絶望を超えし者：既存ランクも表示可能 */
      .zt-title-badge.tone-despair{border-color:#a8305a;background:linear-gradient(180deg,#5a1530,#2a0814);color:#f6dbe5;box-shadow:0 0 6px rgba(168,48,90,.45)}
      .zt-title-badge.tone-despair.tier-t2{border-color:#d8dde6;box-shadow:0 0 0 1px rgba(216,221,230,.55) inset,0 0 7px rgba(200,210,225,.6)}
      .zt-title-badge.tone-despair.tier-t2 .zt-rank{color:#e7ecf3}
      .zt-title-badge.tone-despair.tier-t3{border-color:#e2bd62;background:linear-gradient(180deg,#6a1736,#2a0814);
        box-shadow:0 0 0 1px rgba(226,189,98,.6) inset,0 0 8px rgba(226,189,98,.55)}
      .zt-title-badge.tone-despair.tier-t3 .zt-rank,.zt-title-badge.tone-despair.tier-t3::before{color:#f3d58a}
      .zt-title-badge.tone-despair.tier-t4{border-color:#f6d77a;background:linear-gradient(180deg,#7d1a40,#30081a);color:#fff3f7;
        box-shadow:0 0 0 1px rgba(246,215,122,.85) inset,0 0 10px rgba(246,215,122,.75);animation:ztGlow 2.4s ease-in-out infinite}
      .zt-title-badge.tone-despair.tier-t4 .zt-rank,.zt-title-badge.tone-despair.tier-t4::before{color:#ffe39a}
      @keyframes ztGlow{0%,100%{box-shadow:0 0 0 1px rgba(246,215,122,.85) inset,0 0 6px rgba(246,215,122,.5)}50%{box-shadow:0 0 0 1px rgba(246,215,122,.95) inset,0 0 14px rgba(246,215,122,.95)}}
      @media (prefers-reduced-motion:reduce){.zt-title-badge.tone-despair.tier-t4{animation:none}}
      #hud-title{display:block;margin-top:2px;line-height:1;min-height:0}
      #hud-title:empty{display:none}
      /* ホームのヘッダーは名前が下端に固定された44pxの枠なので、称号は名前のすぐ上に重ねる */
      html body #global-user-frame #hud-title{position:absolute !important;left:10px;right:9px;bottom:19px;margin:0;overflow:hidden;white-space:nowrap}
      html body #global-user-frame #hud-title .zt-title-badge{font-size:8.5px;line-height:1.45}
      .zt-block-title{display:block;margin-top:2px}
      .zt-block-title:empty{display:none}
      #zt-title-modal{position:fixed;inset:0;z-index:100050;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(30,22,12,.45)}
      #zt-title-modal .zt-card{width:min(360px,100%);max-height:80vh;overflow:auto;padding:18px 16px 14px;border-radius:12px;
        background:linear-gradient(180deg,#fffdf7,#f5ecda);border:1px solid #c6a466;box-shadow:0 12px 30px rgba(60,40,15,.3)}
      #zt-title-modal h2{margin:0 0 2px;text-align:center;font:700 17px/1.3 "Noto Serif JP",serif;letter-spacing:.14em;color:#3a2a18}
      #zt-title-modal .zt-sub{margin:0 0 12px;text-align:center;font:600 10px/1 Cinzel,serif;letter-spacing:.3em;color:#9c7330}
      #zt-title-modal .zt-list{display:flex;flex-direction:column;gap:8px}
      #zt-title-modal .zt-opt{display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%;padding:10px 12px;border-radius:8px;
        border:1px solid #d9c49a;background:#fffaf0;text-align:left;cursor:pointer;font:500 11px/1.5 "Noto Serif JP",serif;color:#5b4527}
      #zt-title-modal .zt-opt.is-selected{border-color:#9c7330;box-shadow:0 0 0 2px rgba(156,115,48,.35)}
      #zt-title-modal .zt-opt:disabled{opacity:.55;cursor:default}
      #zt-title-modal .zt-opt small{color:#7d6c55}
      #zt-title-modal .zt-tiers{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}
      #zt-title-modal .zt-close{display:block;margin:12px auto 0;padding:7px 24px;border-radius:999px;border:1px solid #c6a466;
        background:#fff;font:600 12px/1 "Noto Serif JP",serif;color:#5b4527;cursor:pointer}
    `;
    document.head.appendChild(st);
  }

  function badgeHTML(titleId, level){
    const t = getTitle(titleId);
    if(!t) return '';
    ensureStyle();
    const lv = levelOf(level);
    const tier = getTier(titleId, lv);
    return '<span class="zt-title-badge tone-' + esc(t.tone || 'gold') + (tier ? ' tier-' + esc(tier.key) : '') +
      '" title="' + esc(t.desc) + '">' + esc(t.name) + '<span class="zt-rank">'+esc(roman(lv))+'</span>' + (t.rarity ? '<span class="zt-rank">'+esc(t.rarity)+'</span>' : '') + '</span>';
  }

  function readOwned(list){
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach(x => {
      const id = String((x && (x.title_id || x.id)) || x || '');
      if(!getTitle(id)) return;
      const lv = levelOf(x && (x.level ?? x.title_level ?? x.count));
      map.set(id, Math.max(map.get(id) || 0, lv));
    });
    return map;
  }

  async function loadMine(force){
    if(state.loading) return state.loading;
    if(state.loaded && !force) return true;
    const sb = client();
    if(!sb || typeof sb.rpc !== 'function' || !myId()) return false;
    state.loading = (async () => {
      try{
        const res = await sb.rpc('get_my_titles');
        if(res && res.error) throw res.error;
        const data = parse(res && res.data) || {};
        state.owned = readOwned(data.owned);
        const eq = String(data.equipped || '');
        state.equipped = (eq && state.owned.has(eq)) ? eq : '';
        state.loaded = true;
        state.publicCache.set(myId(), { at:Date.now(), titleId:state.equipped, level:state.owned.get(state.equipped) || 1 });
        renderHud();
        return true;
      }catch(err){
        console.warn('[Titles] load skipped', err && (err.message || err));
        return false;
      }finally{ state.loading = null; }
    })();
    return state.loading;
  }

  async function equip(titleId){
    const next = titleId ? String(titleId) : '';
    if(next && !state.owned.has(next)){ toast('この称号はまだ獲得していません'); return false; }
    const sb = client();
    if(!sb || typeof sb.rpc !== 'function'){ toast('サーバーに接続できません'); return false; }
    try{
      const res = await sb.rpc('equip_title', { p_title_id: next || null });
      if(res && res.error) throw res.error;
      const data = parse(res && res.data) || {};
      if(data.ok === false) throw new Error(data.message || '称号を変更できませんでした');
      state.equipped = next;
      state.publicCache.set(myId(), { at:Date.now(), titleId:next, level:state.owned.get(next) || 1 });
      renderHud();
      toast(next ? ('称号「' + labelOf(next, state.owned.get(next)) + '」を設定しました') : '称号を外しました');
      return true;
    }catch(err){
      console.error('[Titles] equip failed', err);
      toast(err && err.message ? err.message : '称号を変更できませんでした');
      return false;
    }
  }

  // 他プレイヤーの装備中の称号（フレンド・ランキング用）。まとめて取得し、5分キャッシュ。
  async function getPublicTitles(userIds){
    const ids = Array.from(new Set((userIds || []).map(v => String(v || '').trim().toLowerCase()).filter(Boolean)));
    const out = {};
    const need = [];
    const now = Date.now();
    ids.forEach(id => {
      if(id === myId() && state.loaded){ out[id] = { titleId:state.equipped, level:state.owned.get(state.equipped) || 1 }; return; }
      const c = state.publicCache.get(id);
      if(c && now - c.at < PUBLIC_CACHE_MS) out[id] = { titleId:c.titleId, level:c.level };
      else need.push(id);
    });
    if(need.length){
      const sb = client();
      if(sb && typeof sb.rpc === 'function'){
        try{
          const res = await sb.rpc('get_public_titles', { p_user_ids: need });
          if(res && res.error) throw res.error;
          const rows = parse(res && res.data);
          const got = {};
          (Array.isArray(rows) ? rows : []).forEach(r => {
            const uid = String(r && r.user_id || '').toLowerCase();
            const tid = String(r && r.title_id || '');
            if(uid) got[uid] = { titleId:getTitle(tid) ? tid : '', level:levelOf(r && (r.title_level ?? r.level)) };
          });
          need.forEach(id => {
            out[id] = got[id] || { titleId:'', level:1 };
            state.publicCache.set(id, { at:now, titleId:out[id].titleId, level:out[id].level });
          });
        }catch(err){
          console.warn('[Titles] public titles skipped', err && (err.message || err));
        }
      }
    }
    return out;
  }

  async function decorate(root){
    const scope = root || document;
    scope.querySelectorAll('[data-title-id]').forEach(el => {
      el.innerHTML = badgeHTML(el.getAttribute('data-title-id'), el.getAttribute('data-title-level'));
    });
    const els = Array.from(scope.querySelectorAll('[data-title-user]'));
    if(!els.length) return;
    const map = await getPublicTitles(els.map(el => el.getAttribute('data-title-user')));
    els.forEach(el => {
      const uid = String(el.getAttribute('data-title-user') || '').toLowerCase();
      const v = map[uid];
      el.innerHTML = v && v.titleId ? badgeHTML(v.titleId, v.level) : '';
    });
  }

  function renderHud(){
    ensureStyle();
    const nameEl = document.getElementById('hud-name');
    if(nameEl){
      let slot = document.getElementById('hud-title');
      if(!slot){
        slot = document.createElement('div');
        slot.id = 'hud-title';
        nameEl.insertAdjacentElement('afterend', slot);
      }
      const html = badgeHTML(state.equipped, state.owned.get(state.equipped));
      if(slot.innerHTML !== html) slot.innerHTML = html;
    }
    const setting = document.getElementById('setting-title-value');
    if(setting){
      setting.textContent = state.equipped ? labelOf(state.equipped, state.owned.get(state.equipped)) : (state.owned.size ? 'なし' : '未獲得');
    }
  }

  function closeSelector(){ document.getElementById('zt-title-modal')?.remove(); }
  async function openSelector(){
    ensureStyle();
    closeSelector();
    await loadMine(true);
    const ov = document.createElement('div');
    ov.id = 'zt-title-modal';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', '称号の設定');
    const list = Object.values(TITLE_MASTER).map(t => {
      const owned = state.owned.has(t.id);
      const lv = state.owned.get(t.id) || 1;
      const nt = owned ? nextTier(t.id, lv) : null;
      const tiers = Array.isArray(t.tiers) ? '<span class="zt-tiers">' + t.tiers.map(x => badgeHTML(t.id, x.min)).join('') + '</span>' : '';
      const status = owned
        ? ('獲得済み' + (nt ? '・次の昇格：' + esc(nt.label) + (t.id==='reason_knower' ? '（'+(100+(nt.min-1)*50)+'F）' : '（あと'+(nt.min-lv)+'回）') : '') + '　' + (state.equipped === t.id ? '設定中' : 'タップで設定'))
        : ('未獲得：' + esc(t.how));
      return '<button type="button" class="zt-opt' + (state.equipped === t.id ? ' is-selected' : '') + '" data-zt-equip="' + esc(t.id) + '"' + (owned ? '' : ' disabled') + '>' +
        badgeHTML(t.id, lv) +
        '<span>' + esc(t.desc) + '</span>' +
        '<small>' + status + '</small>' +
        tiers +
      '</button>';
    }).join('');
    ov.innerHTML =
      '<section class="zt-card">' +
        '<h2>称号</h2><p class="zt-sub">TITLE</p>' +
        '<div class="zt-list">' +
          '<button type="button" class="zt-opt' + (!state.equipped ? ' is-selected' : '') + '" data-zt-equip=""><span>なし</span><small>' + (!state.equipped ? '設定中' : '称号を表示しない') + '</small></button>' +
          list +
        '</div>' +
        '<button type="button" class="zt-close">閉じる</button>' +
      '</section>';
    ov.addEventListener('click', async e => {
      if(e.target === ov || e.target.closest('.zt-close')){ closeSelector(); return; }
      const btn = e.target.closest('[data-zt-equip]');
      if(!btn || btn.disabled) return;
      const id = btn.getAttribute('data-zt-equip') || '';
      if(id === state.equipped){ closeSelector(); return; }
      if(await equip(id)) closeSelector();
    });
    document.body.appendChild(ov);
  }

  // コンテンツ側で付与・ランクアップが確定した時に呼ぶ（表示を即時更新し、サーバーから取り直す）
  function notifyAcquired(titleId, level){
    if(!getTitle(titleId)) return;
    const id = String(titleId);
    state.owned.set(id, Math.max(state.owned.get(id) || 0, levelOf(level)));
    renderHud();
    void loadMine(true);
  }

  window.ZeraphiaTitles = Object.freeze({
    MASTER: TITLE_MASTER,
    getTitle,
    getTier,
    labelOf,
    badgeHTML,
    loadMine,
    reload: () => loadMine(true),
    equip,
    getEquipped: () => state.equipped,
    getLevel: id => state.owned.get(String(id || '')) || 0,
    isOwned: id => state.owned.has(String(id || '')),
    getPublicTitles,
    decorate,
    renderHud,
    openSelector,
    notifyAcquired
  });
  window.openTitleSelector = openSelector;

  function boot(attempt){
    if(myId() && client()){ void loadMine(true); return; }
    if((attempt || 0) < 40) setTimeout(() => boot((attempt || 0) + 1), 250);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(0), { once:true });
  else boot(0);
})();
