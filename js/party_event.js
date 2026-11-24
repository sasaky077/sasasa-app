// =========================================================
// ZERAPHIA build2150 — 期間限定イベント「パラレル・ソワレ 〜並行世界への招待状〜」
// ---------------------------------------------------------
// ・ステージ：shooting_event_party（shooting_stages.js）。60秒以内に謎の主催者を討伐。
//   夜会の客（料理＝加点／人間＝減点）と祝杯のグラス（ボーナスタイム）は shooting_core.js updatePartyMechanics。
// ・OPパネル（3×3）：条件を満たすと開き、OP（有利な効果）が以降の出撃に乗る。
//   ビンゴは揃ったライン数（1〜8）ごとに報酬。8ライン（MAX BINGO）でアヤネ（正装）。
// ・判定と報酬はサーバー（Supabase RPC）：
//     get_party_event_state()                         → progress
//     finish_party_event_run(p_run_token, p_stats)    → { progress, new_panels, new_bingo, new_rewards, outfit_granted }
//   サーバーのRPCが未作成の間は「端末モード」：パネルの進み具合だけ端末に保存して試せる（報酬なし）。
// ・開催期間は js/home_banners.js の PARTY_EVENT_PERIOD（管理者は期間外でも入れる）。
// =========================================================
(function(){
  'use strict';

  const STAGE_ID = 'shooting_event_party';
  const LOCAL_KEY = 'zeraphia_party_event_local_v1';

  // パネル（左上から右下へ 1〜9）。cum＝累計で判定／run＝1回の出撃で判定。\n は表示の改行位置
  const PANELS = Object.freeze([
    { id:1, cond:'Bランク以上で\nクリア 1回',        op:'料理の加点\n+20%',               cum:p=>p.clears_b>=1, count:p=>p.clears_b, need:1 },
    { id:2, cond:'被弾5回以内で\nクリア',            op:'開始直後に\nボーナスタイム3秒',  run:r=>r.win && r.hitsTaken<=5 },
    { id:3, cond:'Aランク以上で\nクリア 1回',        op:'主催者への\n与ダメージ+10%',     cum:p=>p.clears_a>=1, count:p=>p.clears_a, need:1 },
    { id:4, cond:'人間を1人も\n倒さずにクリア',      op:'祝杯のグラス\n+1',               run:r=>r.win && r.humanKills===0 },
    { id:5, cond:'料理を\n累計100皿',                op:'人間の減点\n−30%',               cum:p=>p.food_total>=100, count:p=>p.food_total, need:100 },
    { id:6, cond:'1回で料理を\n15皿倒して\nクリア',  op:'人間のHP\n+50%',                 run:r=>r.win && r.foodKills>=15 },
    { id:7, cond:'Bランク以上で\nクリア 5回',        op:'ボーナスタイム\n+2秒',           cum:p=>p.clears_b>=5, count:p=>p.clears_b, need:5 },
    { id:8, cond:'残り20秒以上で\nクリア',           op:'シャンパン\nタワー出現UP',       run:r=>r.win && r.remainSec>=20 },
    { id:9, cond:'Aランク以上で\nクリア 3回',        op:'ボーナス中の\n加点×2.5',         cum:p=>p.clears_a>=3, count:p=>p.clears_a, need:3 }
  ]);
  const oneLine = t => String(t || '').replace(/\n/g, '');
  const brText = t => esc(t).replace(/\n/g, '<br>');

  // ビンゴのライン（id はサーバーと共通）。3×3なので最大8ライン
  const LINES = Object.freeze([
    { id:'row1', cells:[1,2,3] }, { id:'row2', cells:[4,5,6] }, { id:'row3', cells:[7,8,9] },
    { id:'col1', cells:[1,4,7] }, { id:'col2', cells:[2,5,8] }, { id:'col3', cells:[3,6,9] },
    { id:'diag1', cells:[1,5,9] }, { id:'diag2', cells:[3,5,7] }
  ]);
  const MAX_LINES = LINES.length;
  // 揃ったライン数ごとの報酬（その本数に届いた時に1回だけ）。8ライン＝全パネル＝MAX BINGO
  const REWARDS = Object.freeze([
    { lines:1, name:'聖霊花(R) ×5',                img:'images/item_flower_r.webp' },
    { lines:2, name:'TICKET ノア ×5',              img:'images/special_stage_ticket.webp' },
    { lines:3, name:'創世ptルーレット券（金）×1',  img:'images/item_genesis_roulette_ticket_gold.webp' },
    { lines:4, name:'TICKET イノリ ×5',            img:'images/inori_stage_ticket.webp' },
    { lines:5, name:'位相回遊スキップ券（金）×1',  img:'images/item_phase_skip_ticket_gold.webp' },
    { lines:6, name:'聖霊花(SR) ×1',               img:'images/item_flower_sr.webp' },
    { lines:7, name:'結晶 ×50',                    img:'images/icon_gem.webp' },
    { lines:8, name:'限定衣装：アヤネ（正装）',    img:'images/chara_11_b_panel.webp', outfit:true }
  ]);

  const state = {
    mode:'',          // 'server' | 'local'（RPC未作成）
    loaded:false,
    loading:null,
    progress:emptyProgress(),
    submitting:false
  };

  function emptyProgress(){
    return { clears_b:0, clears_a:0, clears_s:0, food_total:0, panels:[], bingo:[], outfit:false };
  }
  function normProgress(p){
    const o = emptyProgress();
    if(!p || typeof p !== 'object') return o;
    ['clears_b','clears_a','clears_s','food_total'].forEach(k => { o[k] = Math.max(0, Math.floor(Number(p[k]) || 0)); });
    o.panels = (Array.isArray(p.panels) ? p.panels : []).map(Number).filter(n => n >= 1 && n <= 9);
    o.panels = o.panels.filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
    o.bingo = (Array.isArray(p.bingo) ? p.bingo : []).map(String).filter(id => LINES.some(l => l.id === id));
    o.outfit = !!p.outfit;
    return o;
  }
  function sb(){ return window.zsSupabase || null; }
  function isAdmin(){
    if(window.SasaphiaAdmin && typeof window.SasaphiaAdmin.isEnabled === 'function') return !!window.SasaphiaAdmin.isEnabled();
    try{ return localStorage.getItem('sasaphia_admin_mode_v1') === '1'; }catch(_){ return false; }
  }
  function isOpen(){ return typeof window.isPartyEventOpenNow === 'function' ? window.isPartyEventOpenNow() : false; }
  function canEnter(){ return isOpen() || isAdmin(); }
  function toast(msg){ if(typeof window.showToast === 'function') window.showToast(msg); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function parse(d){ if(typeof d === 'string'){ try{ return JSON.parse(d); }catch(_){ return null; } } return Array.isArray(d) ? (d[0] || null) : d; }
  function isMissingRpc(err){
    const code = String(err && err.code || '');
    const msg = String(err && (err.message || err) || '');
    return code === 'PGRST202' || code === '42883' || /Could not find the function|does not exist/i.test(msg);
  }

  // ---------------- 進み具合 ----------------
  function readLocal(){ try{ return normProgress(JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')); }catch(_){ return emptyProgress(); } }
  function writeLocal(p){ try{ localStorage.setItem(LOCAL_KEY, JSON.stringify(p)); }catch(_){} }

  async function load(force){
    if(state.loading) return state.loading;
    if(state.loaded && !force) return true;
    state.loading = (async () => {
      const client = sb();
      try{
        if(!client || typeof client.rpc !== 'function') throw Object.assign(new Error('no client'), { offline:true });
        const res = await client.rpc('get_party_event_state');
        if(res && res.error) throw res.error;
        state.mode = 'server';
        state.progress = normProgress(parse(res && res.data));
      }catch(err){
        if(isMissingRpc(err) || (err && err.offline)){
          state.mode = 'local';
          state.progress = readLocal();
        }else{
          console.warn('[party event] load failed', err && (err.message || err));
          if(!state.mode) state.mode = 'server';
        }
      }
      state.loaded = true;
      return true;
    })().finally(() => { state.loading = null; });
    return state.loading;
  }

  // 1回分の記録から、開くパネル・揃うライン・衣装を求める（端末モード用。サーバーも同じ規則で判定する）
  function applyRun(prev, run){
    const p = normProgress(prev);
    const r = Object.assign({ win:false, rank:'E', hitsTaken:99, foodKills:0, humanKills:99, remainSec:0 }, run || {});
    if(r.win){
      if(['S','A','B'].includes(r.rank)) p.clears_b++;
      if(['S','A'].includes(r.rank)) p.clears_a++;
      if(r.rank === 'S') p.clears_s++;
    }
    p.food_total += Math.max(0, Math.floor(Number(r.foodKills) || 0));
    const newPanels = [];
    PANELS.forEach(pn => {
      if(p.panels.includes(pn.id)) return;
      const ok = (pn.cum && pn.cum(p)) || (pn.run && pn.run(r));
      if(ok){ p.panels.push(pn.id); newPanels.push(pn.id); }
    });
    p.panels.sort((a, b) => a - b);
    const newBingo = [];
    LINES.forEach(l => {
      if(p.bingo.includes(l.id)) return;
      if(l.cells.every(c => p.panels.includes(c))){ p.bingo.push(l.id); newBingo.push(l.id); }
    });
    const before = normProgress(prev).bingo.length;
    const newRewards = REWARDS.filter(rw => rw.lines > before && rw.lines <= p.bingo.length).map(rw => rw.lines);
    let outfitGranted = false;
    if(!p.outfit && p.bingo.length >= MAX_LINES){ p.outfit = true; outfitGranted = true; }
    return { progress:p, newPanels, newBingo, newRewards, outfitGranted };
  }

  // 出撃時のOP（開いているパネルの効果）。shooting_core.js の readPartyOptions が読む
  function getBattleOptions(){
    const has = id => state.progress.panels.includes(id);
    return {
      foodMul:        has(1) ? 1.2 : 1,
      startBonusMs:   has(2) ? 3000 : 0,
      bossDamageMul:  has(3) ? 1.1 : 1,
      extraGlass:     has(4) ? 1 : 0,
      humanPenaltyMul:has(5) ? 0.7 : 1,
      humanHpMul:     has(6) ? 1.5 : 1,
      bonusExtraMs:   has(7) ? 2000 : 0,
      extraTower:     has(8),
      bonusPlusMul:   has(9) ? 2.5 : 0
    };
  }

  // 出撃結果の送信（shooting_core.js から）。runToken なし（sb=null）は端末モードの時だけ記録する
  async function submitRun(client, runToken, stats){
    if(state.submitting) return null;
    state.submitting = true;
    try{
      await load(false);
      if(client && runToken && state.mode === 'server'){
        const res = await client.rpc('finish_party_event_run', { p_run_token: runToken, p_stats: stats || {} });
        if(res && res.error){
          if(isMissingRpc(res.error)){ state.mode = 'local'; state.progress = readLocal(); }
          else throw res.error;
        }else{
          const d = parse(res && res.data) || {};
          state.progress = normProgress(d.progress);
          const out = {
            newPanels:(Array.isArray(d.new_panels) ? d.new_panels : []).map(Number),
            newBingo:(Array.isArray(d.new_bingo) ? d.new_bingo : []).map(String),
            newRewards:(Array.isArray(d.new_rewards) ? d.new_rewards : []).map(Number),
            outfitGranted:!!d.outfit_granted,
            mode:'server'
          };
          if(out.outfitGranted && window.CharacterSkins && typeof window.CharacterSkins.notifySkinAcquired === 'function'){
            window.CharacterSkins.notifySkinAcquired(11, 'limited_01');
          }
          scheduleResultPopup(out);
          return out;
        }
      }
      if(state.mode !== 'local') return null;
      const res = applyRun(state.progress, stats);
      state.progress = res.progress;
      writeLocal(state.progress);
      const out = { newPanels:res.newPanels, newBingo:res.newBingo, newRewards:res.newRewards, outfitGranted:false, outfitReachedLocal:res.outfitGranted, mode:'local' };
      scheduleResultPopup(out);
      return out;
    }catch(err){
      console.warn('[party event] submit failed', err && (err.message || err));
      return { error:true };
    }finally{
      state.submitting = false;
    }
  }

  // ---------------- 画面 ----------------
  function periodText(){
    const p = window.PARTY_EVENT_PERIOD || {};
    const f = s => {
      const d = new Date(Date.parse(s) + 9 * 3600 * 1000);
      if(isNaN(d.getTime())) return '';
      return (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + ' ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
    };
    return f(p.start) + ' 〜 ' + f(p.end);
  }

  function boardHTML(highlight){
    const pr = state.progress;
    const lit = new Set();
    LINES.forEach(l => { if(pr.bingo.includes(l.id)) l.cells.forEach(c => lit.add(c)); });
    return PANELS.map(pn => {
      const open = pr.panels.includes(pn.id);
      const cls = 'pe-cell' + (open ? ' is-open' : '') + (lit.has(pn.id) ? ' is-bingo' : '') + (highlight && highlight.includes(pn.id) ? ' is-new' : '');
      return '<div class="' + cls + '" data-pe-cell="' + pn.id + '">' +
        '<span class="pe-cell-no">' + pn.id + '</span>' +
        (open
          ? '<b class="pe-cell-op">' + brText(pn.op) + '</b><small class="pe-cell-done">OPEN</small>'
          : '<small class="pe-cell-cond">' + brText(pn.cond) + '</small>' +
            (pn.count ? '<em class="pe-cell-prog">' + Math.min(pn.need, pn.count(pr)) + ' / ' + pn.need + '</em>' : '')) +
      '</div>';
    }).join('');
  }

  function rewardsHTML(){
    const got = state.progress.bingo.length;
    return REWARDS.map(rw => {
      const done = got >= rw.lines;
      return '<li class="pe-rw' + (done ? ' is-got' : '') + (rw.outfit ? ' is-outfit' : '') + '"' +
        (rw.outfit ? ' data-pe-outfit-preview role="button" tabindex="0" aria-label="アヤネ（正装）を見る"' : '') + '>' +
        '<span class="pe-rw-line">' + (rw.lines >= MAX_LINES ? 'MAX<br>BINGO' : rw.lines + '<small>LINE</small>') + '</span>' +
        '<img class="pe-rw-img" src="' + esc(rw.img) + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
        (rw.outfit
          ? '<b class="pe-rw-name"><small>LIMITED OUTFIT　限定衣装</small>アヤネ（正装）</b>'
          : '<b class="pe-rw-name">' + esc(rw.name) + '</b>') +
        '<em class="pe-rw-state">' + (done ? '獲得' : '') + '</em>' +
      '</li>';
    }).join('');
  }

  function render(highlight){
    const root = document.getElementById('party-event-screen');
    if(!root) return;
    const pr = state.progress;
    root.querySelector('.pe-board').innerHTML = boardHTML(highlight);
    root.querySelector('.pe-rewards').innerHTML = rewardsHTML();
    root.querySelector('.pe-bingo-count').textContent = pr.bingo.length + ' / ' + MAX_LINES + ' LINE';
    root.querySelector('.pe-stats').innerHTML = [
      ['S', 'Sランク', pr.clears_s + '回'],
      ['A', 'Aランク以上', pr.clears_a + '回'],
      ['B', 'Bランク以上', pr.clears_b + '回'],
      ['', '料理（累計）', pr.food_total + '皿'],
      ['', 'ビンゴ', pr.bingo.length + ' / ' + MAX_LINES + ' LINE']
    ].map(x => '<li>' + (x[0] ? '<i class="pe-stat-rank rank-' + x[0] + '">' + x[0] + '</i>' : '<i class="pe-stat-rank"></i>') +
      '<span>' + esc(x[1]) + '</span><b>' + esc(x[2]) + '</b></li>').join('');
    root.querySelector('.pe-period').textContent = '開催期間　' + periodText();
    const note = root.querySelector('.pe-note');
    note.hidden = state.mode !== 'local';
    note.textContent = 'サーバー未設定のため、パネルの進み具合は端末にだけ記録されます（報酬は受け取れません）';
    const go = root.querySelector('.pe-go');
    go.disabled = !canEnter();
    go.querySelector('small').textContent = canEnter() ? (isOpen() ? '60秒以内に謎の主催者を討伐' : '管理者：期間外の試遊') : '開催期間外です';
  }

  function ensureScreen(){
    let root = document.getElementById('party-event-screen');
    if(root) return root;
    root = document.createElement('div');
    root.id = 'party-event-screen';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'パラレル・ソワレ');
    root.innerHTML =
      '<div class="pe-bg" aria-hidden="true"></div>' +
      '<div class="pe-scroll">' +
        '<header class="pe-head">' +
          '<img class="pe-banner" src="images/home_banner_party.webp" alt="パラレル・ソワレ 〜並行世界への招待状〜">' +
          '<p class="pe-period"></p>' +
        '</header>' +
        '<section class="pe-section pe-record">' +
          '<h3 class="pe-h"><small>RECORD</small>あなたの記録</h3>' +
          '<ul class="pe-stats"></ul>' +
        '</section>' +
        '<section class="pe-section">' +
          '<h3 class="pe-h"><small>OPTION PANEL</small>夜会の招待状</h3>' +
          '<p class="pe-lead">条件を満たすとパネルが開き、<br>OPがずっと付きます。</p>' +
          '<div class="pe-board"></div>' +
        '</section>' +
        '<section class="pe-section">' +
          '<h3 class="pe-h"><small>BINGO REWARD</small>ビンゴ報酬</h3>' +
          '<p class="pe-lead">縦・横・斜めの揃ったライン数で受け取れます。<br><b class="pe-bingo-count"></b></p>' +
          '<ul class="pe-rewards"></ul>' +
        '</section>' +
        // build2166: ルールは1か所（ポップアップ）にまとめ、ここは開くための細い帯だけ
        '<button type="button" class="pe-rule-bar pe-rule-again">' +
          '<span class="pe-rule-bar-k">RULE</span>' +
          '<span class="pe-rule-bar-t">夜会の作法</span>' +
          '<span class="pe-rule-bar-icons" aria-hidden="true"><img src="images/event_party_dish.webp" alt=""><img src="images/event_party_guest_a.webp" alt=""><img src="images/event_party_glass.webp" alt=""></span>' +
          '<span class="pe-rule-bar-arrow" aria-hidden="true">›</span>' +
        '</button>' +
        '<p class="pe-note" hidden></p>' +
      '</div>' +
      '<footer class="pe-foot">' +
        '<button type="button" class="pe-close">戻る</button>' +
        '<button type="button" class="pe-go"><b>出撃</b><small></small></button>' +
      '</footer>';
    root.addEventListener('click', e => {
      if(e.target.closest('.pe-close')){ close(); return; }
      if(e.target.closest('.pe-go')){ start(); return; }
      if(e.target.closest('.pe-rule-again')){ showRuleGuide({ sortie:false }); return; }
      if(e.target.closest('[data-pe-outfit-preview]')){ openOutfitPreview(); return; }
      const cell = e.target.closest('[data-pe-cell]');
      if(cell){
        const pn = PANELS.find(p => p.id === Number(cell.dataset.peCell));
        if(pn) toast(oneLine(pn.cond) + '　→　' + oneLine(pn.op));
      }
    });
    document.body.appendChild(root);
    return root;
  }

  // build2159: 衣装報酬をタップすると立ち絵（chara_11_b.webp）を大きく表示
  function openOutfitPreview(){
    document.getElementById('party-event-outfit-preview')?.remove();
    const ov = document.createElement('div');
    ov.id = 'party-event-outfit-preview';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'アヤネ（正装）');
    ov.innerHTML =
      '<figure class="pop-frame">' +
        '<img src="images/chara_11_b.webp" alt="アヤネ（正装）">' +
        '<figcaption><small>LIMITED OUTFIT</small><b>アヤネ（正装）</b></figcaption>' +
      '</figure>' +
      '<p class="pop-hint">タップで閉じる</p>';
    ov.addEventListener('click', () => ov.remove());
    document.body.appendChild(ov);
  }

  async function open(){
    const root = ensureScreen();
    root.classList.add('is-open');
    render();
    await load(true);
    render();
  }
  function close(){
    const root = document.getElementById('party-event-screen');
    if(root) root.classList.remove('is-open');
  }
  // build2165: 初回だけ、出撃前に3行のルール案内（戦闘前なのでタイマーは動かない）。表示済みはプレイヤー単位で端末に保存
  function ruleSeenKey(){
    let uid = '';
    try{ uid = String(localStorage.getItem('zukan_user_id') || ''); }catch(_){}
    return 'zeraphia_party_rule_seen_v1:' + (uid || 'guest');
  }
  function isRuleSeen(){ try{ return localStorage.getItem(ruleSeenKey()) === '1'; }catch(_){ return true; } }
  function markRuleSeen(){ try{ localStorage.setItem(ruleSeenKey(), '1'); }catch(_){} }
  function showRuleGuide(opts){
    const o = opts || {};
    document.getElementById('party-event-rule-guide')?.remove();
    const ov = document.createElement('div');
    ov.id = 'party-event-rule-guide';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', '夜会の作法');
    ov.innerHTML =
      '<div class="prg-card">' +
        '<small class="prg-kicker">HOW TO PLAY</small>' +
        '<h3>夜会の作法</h3>' +
        '<ul class="prg-list">' +
          '<li class="is-food"><span class="prg-icon"><img src="images/event_party_dish.webp" alt=""><i class="prg-ring"></i></span><p><b>料理を撃って</b>スコアを獲得。<small>シャンパンタワーは高得点。光属性なので闇の攻撃で壊しやすい</small></p></li>' +
          '<li class="is-human"><span class="prg-icon"><img src="images/event_party_guest_a.webp" alt=""><i class="prg-ring"></i></span><p><b>招待客への攻撃</b>は減点。<small>弾が当たると青く震えて知らせます</small></p></li>' +
          '<li class="is-glass"><span class="prg-icon"><img src="images/event_party_glass.webp" alt=""><i class="prg-ring"></i></span><p><b>祝杯のグラスに触れると</b>ボーナスタイム！<small>減点なし・料理の加点2倍</small></p></li>' +
        '</ul>' +
        '<p class="prg-rank">S 32,000点　A 26,000点　B 討伐<small>時間切れはE</small></p>' +
        '<div class="prg-actions">' +
          '<button type="button" class="prg-close">閉じる</button>' +
          (o.sortie ? '<button type="button" class="prg-go">出撃する</button>' : '') +
        '</div>' +
      '</div>';
    const finish = go => {
      ov.remove();
      if(o.sortie){ markRuleSeen(); if(go || o.closeAlsoGoes) launch(); }
    };
    ov.addEventListener('click', e => {
      if(e.target.closest('.prg-go')){ finish(true); return; }
      if(e.target.closest('.prg-close')){ finish(!!o.closeAlsoGoes); return; }
    });
    document.body.appendChild(ov);
  }
  function launch(){
    if(typeof window.openShootingEvent !== 'function'){ toast('戦闘エンジンの準備が完了していません'); return; }
    close();
    try{ window.openShootingEvent({ stageId:STAGE_ID }); }
    catch(err){ console.error('[party event] open stage failed', err); toast('イベントを開けませんでした'); }
  }
  function start(){
    if(!canEnter()){ toast('開催期間外です'); return; }
    if(typeof window.openShootingEvent !== 'function'){ toast('戦闘エンジンの準備が完了していません'); return; }
    // 初回のみ案内（「閉じる」でも「出撃する」でも先へ進む）。2回目以降は自動表示しない
    if(!isRuleSeen()){ showRuleGuide({ sortie:true, closeAlsoGoes:true }); return; }
    launch();
  }

  // ---------------- 結果のお知らせ ----------------
  let pendingPopup = null;
  function scheduleResultPopup(out){
    if(!out) return;
    const anything = (out.newPanels && out.newPanels.length) || (out.newBingo && out.newBingo.length) || (out.newRewards && out.newRewards.length) || out.outfitGranted || out.outfitReachedLocal;
    if(!anything) return;
    pendingPopup = out;
    setTimeout(showResultPopup, 900);
  }
  function showResultPopup(){
    const out = pendingPopup; pendingPopup = null;
    if(!out) return;
    document.getElementById('party-event-result')?.remove();
    const ov = document.createElement('div');
    ov.id = 'party-event-result';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    const panels = (out.newPanels || []).map(id => PANELS.find(p => p.id === id)).filter(Boolean);
    const lineCount = (out.newBingo || []).length;
    const rewards = (out.newRewards || []).map(n => REWARDS.find(r => r.lines === n)).filter(Boolean);
    ov.innerHTML =
      '<div class="per-card">' +
        '<small class="per-kicker">PARALLEL SOIREE</small>' +
        (panels.length ? '<h3>パネルが開きました</h3><ul class="per-list">' + panels.map(p => '<li><span class="per-no">' + p.id + '</span><b>' + esc(oneLine(p.op)) + '</b></li>').join('') + '</ul>' : '') +
        (lineCount ? '<h3 class="per-bingo">BINGO</h3><p class="per-lines">' + esc(String(state.progress.bingo.length)) + ' LINE</p>' : '') +
        (rewards.filter(r => !r.outfit).length ? '<ul class="per-list">' + rewards.filter(r => !r.outfit).map(r => '<li><img src="' + esc(r.img) + '" alt=""><b>' + esc(r.name) + '</b></li>').join('') + '</ul>' : '') +
        (out.outfitGranted ? '<div class="per-outfit"><img src="images/chara_11_b_panel.webp" alt=""><b>アヤネ（正装）を獲得</b></div>' : '') +
        (out.outfitReachedLocal ? '<p class="per-note">MAX BINGO達成（端末モードのため衣装は付与されません）</p>' : '') +
        (out.mode === 'server' && rewards.length ? '<p class="per-note">報酬はプレゼントボックスに届きます</p>' : '') +
        (out.mode === 'local' && rewards.length ? '<p class="per-note">端末モードのため報酬は付与されません</p>' : '') +
        '<button type="button" class="per-ok">OK</button>' +
      '</div>';
    ov.addEventListener('click', e => { if(e.target === ov || e.target.closest('.per-ok')) ov.remove(); });
    document.body.appendChild(ov);
  }

  window.openPartyEventFromHome = function(){ void open(); return true; };
  window.PartyEvent = Object.freeze({
    STAGE_ID, PANELS, LINES, REWARDS,
    showRuleGuide,
    open, close, load,
    isOpen, canEnter,
    getBattleOptions,
    submitRun,
    applyRun,
    getProgress: () => normProgress(state.progress),
    getMode: () => state.mode
  });

  // 起動時に一度読む（出撃前にOPをそろえておく）
  function boot(attempt){
    if(sb() && String(localStorage.getItem('zukan_user_id') || '')){ void load(true); return; }
    if((attempt || 0) < 20) setTimeout(() => boot((attempt || 0) + 1), 400);
    else void load(true);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(0), { once:true });
  else boot(0);
})();
