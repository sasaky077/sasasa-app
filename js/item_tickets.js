// ZERAPHIA build1813 — 使用型アイテム（チケット）
//  ・レイドリセット券        raid_reset_ticket
//  ・位相回遊スキップ券(銀/金) phase_skip_ticket_silver / phase_skip_ticket_gold
//  ・創世ptルーレット券(銀/金) genesis_roulette_ticket_silver / genesis_roulette_ticket_gold
//
//  所持数はサーバーのインベントリ（get_my_inventory_snapshot）。抽選・消費・付与はすべてサーバー側RPCで行い、
//  クライアントは結果を受け取ってルーレット演出で見せるだけ（演出の止まる位置＝サーバーの結果）。
//    use_raid_reset_ticket()                    → { ok, remaining }
//    use_phase_skip_ticket(p_tier)              → { ok, skip_floor, remaining }
//    use_genesis_roulette_ticket(p_tier)        → { ok, gained_pt, shinju_pt, remaining }
(function(){
  'use strict';

  const ITEMS = Object.freeze({
    raid_reset_ticket: {
      id:'raid_reset_ticket', name:'レイドリセット券', img:'images/item_raid_reset_ticket.webp',
      kicker:'RAID RESET TICKET', tag:'レイド',
      desc:'その日のレイドの挑戦回数を 0 / 3 に戻す。すでに挑戦済みでも使用できる。'
    },
    phase_skip_ticket_silver: {
      id:'phase_skip_ticket_silver', tier:'silver', name:'位相回遊スキップ券（銀）', img:'images/item_phase_skip_ticket_silver.webp',
      kicker:'PHASE SKIP TICKET', tag:'位相回遊',
      desc:'位相回遊の挑戦開始時に使用。ルーレットで 10 / 20 / 30 / 40 階のどこまで踏破済みにするかが決まる。スキップした階層の強化はその場で順番に選ぶ。'
    },
    phase_skip_ticket_gold: {
      id:'phase_skip_ticket_gold', tier:'gold', name:'位相回遊スキップ券（金）', img:'images/item_phase_skip_ticket_gold.webp',
      kicker:'PHASE SKIP TICKET', tag:'位相回遊',
      desc:'位相回遊の挑戦開始時に使用。ルーレットで 30 / 40 階のどちらかまで踏破済みになる。スキップした階層の強化はその場で順番に選ぶ。'
    },
    genesis_roulette_ticket_silver: {
      id:'genesis_roulette_ticket_silver', tier:'silver', name:'創世ptルーレット券（銀）', img:'images/item_genesis_roulette_ticket_silver.webp',
      kicker:'GENESIS ROULETTE', tag:'神聖樹',
      desc:'ルーレットを回して、神聖樹の創世ptを 30 / 50 / 80 / 100pt 獲得する。'
    },
    genesis_roulette_ticket_gold: {
      id:'genesis_roulette_ticket_gold', tier:'gold', name:'創世ptルーレット券（金）', img:'images/item_genesis_roulette_ticket_gold.webp',
      kicker:'GENESIS ROULETTE', tag:'神聖樹',
      desc:'ルーレットを回して、神聖樹の創世ptを 80 / 100pt 獲得する。'
    }
  });
  const ORDER = ['raid_reset_ticket', 'phase_skip_ticket_silver', 'phase_skip_ticket_gold', 'genesis_roulette_ticket_silver', 'genesis_roulette_ticket_gold'];

  // 表示用の当選割合（実際の抽選はサーバー。値を変える時はサーバー側と揃える）
  const ROULETTE = Object.freeze({
    phase: {
      silver: [{ v:10, w:20 }, { v:20, w:35 }, { v:30, w:35 }, { v:40, w:10 }],
      gold:   [{ v:10, w:0 },  { v:20, w:0 },  { v:30, w:50 }, { v:40, w:50 }]
    },
    genesis: {
      silver: [{ v:30, w:40 }, { v:50, w:30 }, { v:80, w:20 }, { v:100, w:10 }],
      gold:   [{ v:30, w:0 },  { v:50, w:0 },  { v:80, w:50 }, { v:100, w:50 }]
    }
  });

  // ------------------------------------------------------------
  // サーバー
  // ------------------------------------------------------------
  function client(){
    const c = window.zsSupabase;
    if (!c || typeof c.rpc !== 'function') throw new Error('サーバーへ接続できません');
    return c;
  }
  async function rpc(name, args){
    if (window.zsAuthReady) { try { await window.zsAuthReady; } catch (_) {} }
    const res = await client().rpc(name, args || {});
    if (res && res.error) throw res.error;
    let data = res ? res.data : null;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch (_) {} }
    if (!data || data.ok === false) throw new Error(serverMessage(data && (data.message || data.error)));
    return data;
  }
  function serverMessage(raw){
    const m = String(raw || '');
    if (/not enough|no ticket|insufficient/i.test(m)) return 'チケットを所持していません';
    if (/no raid|raid not found/i.test(m)) return '本日のレイドに参加していません';
    if (/in battle|attempt in progress/i.test(m)) return 'レイドの挑戦中は使用できません';
    if (/no attempt|nothing to reset/i.test(m)) return 'まだ挑戦していないため、リセットの必要はありません';
    if (/cleared/i.test(m)) return 'レイドはすでに討伐済みです';
    return m || 'チケットを使用できませんでした';
  }

  let counts = {};
  let countsAt = 0;
  let countsPromise = null;
  async function fetchCounts(force){
    if (!force && countsAt && Date.now() - countsAt < 30000) return counts;
    if (countsPromise) return countsPromise;
    countsPromise = (async () => {
      const data = await rpc('get_my_inventory_snapshot');
      const raw = data.items || {};
      const next = {};
      Object.keys(raw).forEach(k => {
        const id = String(k).replace(/^evo:/, '');
        next[id] = (next[id] || 0) + Math.max(0, Math.floor(Number(raw[k]) || 0));
      });
      counts = next;
      countsAt = Date.now();
      return counts;
    })().finally(() => { countsPromise = null; });
    return countsPromise;
  }
  function getCount(id){ return Math.max(0, Number(counts[id] || 0)); }
  function setCount(id, n){
    if (!Number.isFinite(Number(n))) return;
    counts[id] = Math.max(0, Math.floor(Number(n)));
    countsAt = Date.now();
  }
  function afterUse(id, data){
    if (data && data.remaining != null) setCount(id, data.remaining);
    else setCount(id, getCount(id) - 1);
    try { window.dispatchEvent(new CustomEvent('zeraphia:item-tickets-changed', { detail:{ id, counts:Object.assign({}, counts) } })); } catch (_) {}
    try { if (typeof window.refreshItemManagement === 'function' && document.getElementById('screen-item')?.classList.contains('active')) window.refreshItemManagement(); } catch (_) {}
  }

  function toast(msg){
    if (typeof window.showToast === 'function') window.showToast(msg);
    else if (msg) console.info('[ItemTickets]', msg);
  }
  function esc(v){
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ------------------------------------------------------------
  // 画面（確認ダイアログ・ルーレット）
  // ------------------------------------------------------------
  function ensureStyle(){
    if (document.getElementById('item-ticket-style-v1813')) return;
    const st = document.createElement('style');
    st.id = 'item-ticket-style-v1813';
    st.textContent = `
      .it-layer{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;
        background:rgba(36,28,18,.58);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);
        font-family:"Noto Serif JP","Yu Mincho","Hiragino Mincho ProN",serif;color:#4b3a24;animation:itFade .18s ease both}
      .it-layer[hidden]{display:none}
      @keyframes itFade{from{opacity:0}to{opacity:1}}
      .it-sheet{position:relative;width:min(360px,100%);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;
        padding:18px 16px 16px;border-radius:14px;text-align:center;
        background:linear-gradient(180deg,#fffdf6,#f5ecd9);border:1px solid rgba(168,135,78,.55);
        box-shadow:0 0 0 4px rgba(255,251,240,.55),0 18px 48px rgba(30,20,8,.45);animation:itPop .22s cubic-bezier(.2,.9,.3,1.2) both}
      @keyframes itPop{from{transform:translateY(8px) scale(.96);opacity:0}to{transform:none;opacity:1}}
      .it-kicker{font-size:10px;letter-spacing:.22em;color:#a0804a}
      .it-title{margin:4px 0 0;font-size:17px;font-weight:700;letter-spacing:.08em;color:#4b3520}
      .it-ticket{display:block;width:132px;height:132px;margin:6px auto 0;object-fit:contain;filter:drop-shadow(0 6px 10px rgba(60,40,10,.28));
        transform:rotate(-6deg)}
      .it-ticket.is-spin{animation:itTicket 1.1s ease-in-out infinite alternate}
      @keyframes itTicket{from{transform:rotate(-8deg) translateY(0)}to{transform:rotate(-2deg) translateY(-4px)}}
      .it-msg{margin:8px 0 0;font-size:12.5px;line-height:1.7;white-space:pre-line;color:#5a4630}
      .it-own{margin-top:6px;font-size:11px;color:#8a7150;letter-spacing:.06em}
      .it-own b{color:#5a3f1e;font-size:13px}
      .it-reel{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:14px 0 4px}
      .it-cell{position:relative;padding:10px 2px 8px;border-radius:10px;background:#fffaf0;border:1px solid rgba(176,145,92,.45);
        box-shadow:inset 0 1px 0 #fff;transition:transform .08s ease,background .08s ease,box-shadow .08s ease}
      .it-cell b{display:block;font-size:19px;line-height:1.1;color:#4b3520;font-variant-numeric:tabular-nums;letter-spacing:.02em}
      .it-cell small{display:block;margin-top:1px;font-size:9.5px;letter-spacing:.12em;color:#9b7f52}
      .it-cell .it-rate{display:block;margin-top:6px;font-size:10px;color:#8b7454;font-variant-numeric:tabular-nums}
      .it-cell.is-zero{opacity:.38;filter:grayscale(.6)}
      .it-cell.is-lit{background:linear-gradient(180deg,#fff6d6,#ffe9a8);border-color:#d6a640;transform:translateY(-2px) scale(1.04);
        box-shadow:0 0 0 2px rgba(240,196,90,.55),0 6px 14px rgba(190,140,40,.35)}
      .it-cell.is-win{background:linear-gradient(180deg,#fff3c4,#ffd76a);border-color:#c8902a;transform:translateY(-3px) scale(1.08);
        box-shadow:0 0 0 3px rgba(255,214,102,.75),0 0 22px rgba(255,190,60,.75);animation:itWin .7s ease-in-out infinite alternate}
      @keyframes itWin{from{box-shadow:0 0 0 3px rgba(255,214,102,.75),0 0 14px rgba(255,190,60,.55)}to{box-shadow:0 0 0 3px rgba(255,214,102,.95),0 0 28px rgba(255,190,60,.95)}}
      .it-result{min-height:22px;margin-top:10px;font-size:15px;font-weight:700;letter-spacing:.06em;color:#7a4f12}
      .it-result.is-show{animation:itPop .3s cubic-bezier(.2,.9,.3,1.4) both}
      .it-note{margin-top:4px;font-size:10.5px;color:#8a7150;line-height:1.6}
      .it-actions{display:flex;gap:8px;margin-top:14px}
      .it-btn{flex:1;min-height:42px;border-radius:999px;border:1px solid rgba(160,128,74,.6);background:#fffaf0;color:#5a4328;
        font:inherit;font-size:13.5px;font-weight:700;letter-spacing:.08em;cursor:pointer}
      .it-btn.is-primary{background:linear-gradient(180deg,#d9b35e,#b78a35);border-color:#9c7426;color:#fffdf5;text-shadow:0 1px 1px rgba(80,50,10,.45)}
      .it-btn:disabled{opacity:.5;cursor:default}
      .it-choice{display:flex;align-items:center;gap:10px;width:100%;margin-top:8px;padding:8px 10px;border-radius:12px;text-align:left;
        background:#fffaf0;border:1px solid rgba(176,145,92,.5);font:inherit;color:inherit;cursor:pointer}
      .it-choice img{width:58px;height:58px;object-fit:contain;flex:none}
      .it-choice b{display:block;font-size:13.5px}
      .it-choice small{display:block;font-size:11px;color:#8a7150;margin-top:2px}
      .it-choice:disabled{opacity:.45;cursor:default}
      #screen-item .item-row.is-ticket .item-row-name{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.3!important}
      @media (prefers-reduced-motion:reduce){.it-layer,.it-sheet,.it-result.is-show{animation:none}.it-ticket.is-spin,.it-cell.is-win{animation:none}}
    `;
    document.head.appendChild(st);
  }
  let layerEl = null;
  function openLayer(build){
    ensureStyle();
    closeLayer();
    layerEl = document.createElement('div');
    layerEl.className = 'it-layer';
    const sheet = document.createElement('section');
    sheet.className = 'it-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    layerEl.appendChild(sheet);
    document.body.appendChild(layerEl);
    build(sheet, layerEl);
    return sheet;
  }
  function closeLayer(){ if (layerEl) { layerEl.remove(); layerEl = null; } }

  // はい/いいえの確認。resolve(true/false)
  function confirmTicket(id, title, message, yesLabel){
    const meta = ITEMS[id];
    return new Promise(resolve => {
      openLayer((sheet, layer) => {
        sheet.innerHTML =
          `<div class="it-kicker">${esc(meta.kicker)}</div>` +
          `<h2 class="it-title">${esc(title || meta.name)}</h2>` +
          `<img class="it-ticket" src="${esc(meta.img)}" alt="" onerror="this.style.display='none'">` +
          `<p class="it-msg">${esc(message)}</p>` +
          `<div class="it-own">所持 <b>${getCount(id)}</b> 枚</div>` +
          `<div class="it-actions"><button type="button" class="it-btn" data-it-no>やめる</button><button type="button" class="it-btn is-primary" data-it-yes>${esc(yesLabel || '使用する')}</button></div>`;
        const done = ok => { closeLayer(); resolve(ok); };
        sheet.querySelector('[data-it-no]').addEventListener('click', () => done(false));
        sheet.querySelector('[data-it-yes]').addEventListener('click', () => done(true), { once:true });
        layer.addEventListener('click', e => { if (e.target === layer) done(false); });
      });
    });
  }

  // 銀・金の両方を持っている時の選択。resolve('silver'|'gold'|null)
  function chooseTier(kind){
    const ids = kind === 'phase' ? ['phase_skip_ticket_silver', 'phase_skip_ticket_gold'] : ['genesis_roulette_ticket_silver', 'genesis_roulette_ticket_gold'];
    const owned = ids.filter(id => getCount(id) > 0);
    if (owned.length === 0) return Promise.resolve(null);
    if (owned.length === 1) return Promise.resolve(ITEMS[owned[0]].tier);
    return new Promise(resolve => {
      openLayer((sheet, layer) => {
        const head = kind === 'phase' ? '位相回遊スキップ券' : '創世ptルーレット券';
        sheet.innerHTML = `<div class="it-kicker">SELECT TICKET</div><h2 class="it-title">${head}</h2><p class="it-msg">使用するチケットを選んでください</p>` +
          ids.map(id => {
            const m = ITEMS[id];
            const r = ROULETTE[kind][m.tier].filter(x => x.w > 0).map(x => kind === 'phase' ? `${x.v}F` : `${x.v}pt`).join(' / ');
            return `<button type="button" class="it-choice" data-it-tier="${m.tier}"><img src="${esc(m.img)}" alt=""><span><b>${esc(m.name)}</b><small>${r}　所持 ${getCount(id)}枚</small></span></button>`;
          }).join('') +
          `<div class="it-actions"><button type="button" class="it-btn" data-it-no>やめる</button></div>`;
        const done = v => { closeLayer(); resolve(v); };
        sheet.querySelectorAll('[data-it-tier]').forEach(b => b.addEventListener('click', () => done(b.dataset.itTier), { once:true }));
        sheet.querySelector('[data-it-no]').addEventListener('click', () => done(null));
        layer.addEventListener('click', e => { if (e.target === layer) done(null); });
      });
    });
  }

  // ルーレット。spin() はサーバー結果（当選値）を返す Promise。
  //  resolve({ value, data }) / キャンセル・失敗は null
  function runRoulette(opts){
    const { id, kind, tier, title, unit, unitSmall, describe, resultText, spinLabel, finishLabel, note, spin } = opts;
    const meta = ITEMS[id];
    const table = ROULETTE[kind][tier];
    const total = table.reduce((n, x) => n + x.w, 0) || 1;
    return new Promise(resolve => {
      openLayer((sheet, layer) => {
        sheet.innerHTML =
          `<div class="it-kicker">${esc(meta.kicker)}</div>` +
          `<h2 class="it-title">${esc(title || meta.name)}</h2>` +
          `<img class="it-ticket" src="${esc(meta.img)}" alt="">` +
          `<p class="it-msg">${esc(describe || '')}</p>` +
          `<div class="it-reel">` + table.map((x, i) =>
            `<div class="it-cell${x.w <= 0 ? ' is-zero' : ''}" data-i="${i}"><b>${x.v}</b><small>${esc(unitSmall || unit)}</small><span class="it-rate">${Math.round(x.w / total * 100)}%</span></div>`).join('') +
          `</div>` +
          `<div class="it-result" aria-live="polite"></div>` +
          (note ? `<div class="it-note">${esc(note)}</div>` : '') +
          `<div class="it-own">所持 <b>${getCount(id)}</b> 枚（1枚使用）</div>` +
          `<div class="it-actions"><button type="button" class="it-btn" data-it-no>やめる</button><button type="button" class="it-btn is-primary" data-it-spin>${esc(spinLabel || 'ルーレットを回す')}</button></div>`;
        const cells = [...sheet.querySelectorAll('.it-cell')];
        const resultEl = sheet.querySelector('.it-result');
        const noBtn = sheet.querySelector('[data-it-no]');
        const spinBtn = sheet.querySelector('[data-it-spin]');
        const ticketImg = sheet.querySelector('.it-ticket');
        let busy = false, finished = false, outcome = null;
        const done = v => { closeLayer(); resolve(v); };
        noBtn.addEventListener('click', () => { if (!busy) done(finished ? outcome : null); });
        layer.addEventListener('click', e => { if (e.target === layer && !busy && !finished) done(null); });
        spinBtn.addEventListener('click', async () => {
          if (finished) { done(outcome); return; }
          if (busy) return;
          busy = true;
          spinBtn.disabled = true; noBtn.disabled = true;
          ticketImg.classList.add('is-spin');
          const live = table.map((x, i) => i).filter(i => table[i].w > 0);
          // サーバー応答を待つ間も回り続ける
          let idx = 0, stop = false;
          const light = i => cells.forEach((c, k) => c.classList.toggle('is-lit', k === i));
          let spinning = true;
          (async () => { while (spinning) { light(live[idx % live.length]); idx++; await wait(70); } })();
          let data = null, value = null;
          try {
            data = await spin();
            value = Number(data && data.value);
          } catch (err) {
            spinning = false;
            light(-1);
            ticketImg.classList.remove('is-spin');
            busy = false; spinBtn.disabled = false; noBtn.disabled = false;
            toast(err && err.message ? err.message : 'チケットを使用できませんでした');
            return;
          }
          spinning = false;
          await wait(80);
          const target = table.findIndex(x => x.v === value);
          const tIdx = live.indexOf(target >= 0 ? target : live[0]);
          // 減速しながら目標で止める（最低2周）
          const cur = idx % live.length;
          let steps = live.length * 2 + ((tIdx - cur + live.length) % live.length);
          let delay = 70;
          for (let s = 0; s <= steps; s++) {
            light(live[(cur + s) % live.length]);
            const remain = steps - s;
            delay = remain > 6 ? 75 : 75 + (6 - remain) * 55;
            await wait(delay);
          }
          cells.forEach(c => c.classList.remove('is-lit'));
          if (target >= 0) cells[target].classList.add('is-win');
          ticketImg.classList.remove('is-spin');
          resultEl.textContent = resultText(value, data);
          resultEl.classList.add('is-show');
          outcome = { value, data };
          finished = true; busy = false;
          noBtn.hidden = true;
          const noteEl = sheet.querySelector('.it-note');
          if (noteEl) noteEl.hidden = true;
          spinBtn.disabled = false;
          spinBtn.textContent = finishLabel || 'OK';
          const own = sheet.querySelector('.it-own b');
          if (own) own.textContent = String(getCount(id));
          const ownWrap = sheet.querySelector('.it-own');
          if (ownWrap) ownWrap.innerHTML = `残り <b>${getCount(id)}</b> 枚`;
        });
      });
    });
  }
  function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

  // ------------------------------------------------------------
  // 各チケットの使用
  // ------------------------------------------------------------
  let using = false;

  // レイドリセット券：確認 → サーバーで回数を戻す
  async function useRaidReset(options){
    if (using) return false;
    try { await fetchCounts(); } catch (_) {}
    if (getCount('raid_reset_ticket') < 1) { toast('レイドリセット券を所持していません'); return false; }
    const ok = await confirmTicket('raid_reset_ticket', 'レイドリセット券',
      (options && options.message) || '本日のレイドの挑戦回数を 0 / 3 に戻します。\nよろしいですか？', 'リセットする');
    if (!ok) return false;
    using = true;
    try {
      const data = await rpc('use_raid_reset_ticket');
      afterUse('raid_reset_ticket', data);
      try { window.dispatchEvent(new CustomEvent('zeraphia:raid-attempts-reset', { detail:data })); } catch (_) {}
      toast('レイドの挑戦回数を 0 / 3 に戻しました');
      return true;
    } catch (err) {
      console.warn('[ItemTickets] raid reset failed', err);
      toast(err && err.message ? err.message : 'レイドリセット券を使用できませんでした');
      return false;
    } finally { using = false; }
  }

  // 位相回遊スキップ券：ルーレット → 当選階（10/20/30/40）を返す。消費はサーバー。
  //  呼び出し元（位相回遊）が、runの開始と強化選択を受け持つ。
  //  onResult(floor) はサーバーの結果が届いた直後（演出の前）に呼ばれる。アプリが落ちても結果を失わないよう、呼び出し側はここで保存する。
  async function spinPhaseSkip(tierArg, onResult){
    if (using) return null;
    try { await fetchCounts(); } catch (_) {}
    const tier = tierArg || await chooseTier('phase');
    if (!tier) return null;
    const id = 'phase_skip_ticket_' + tier;
    if (getCount(id) < 1) { toast(ITEMS[id].name + 'を所持していません'); return null; }
    using = true;
    try {
      const res = await runRoulette({
        id, kind:'phase', tier, unit:'FLOOR', unitSmall:'F',
        describe:'止まった階層まで踏破済みになります。\nスキップした階層の強化は、このあと順番に選びます。',
        note:'ルーレットを回すとチケットを1枚消費します。',
        spinLabel:'ルーレットを回す', finishLabel:'強化を選ぶ',
        resultText: v => `FLOOR ${v} まで踏破！`,
        spin: async () => {
          const data = await rpc('use_phase_skip_ticket', { p_tier: tier });
          afterUse(id, data);
          try { if (typeof onResult === 'function') onResult(Number(data.skip_floor)); } catch (err) { console.warn('[ItemTickets] skip apply failed', err); }
          return Object.assign({}, data, { value: Number(data.skip_floor) });
        }
      });
      return res ? Number(res.value) : null;
    } finally { using = false; }
  }

  // 創世ptルーレット券
  async function useGenesisRoulette(tierArg){
    if (using) return null;
    try { await fetchCounts(); } catch (_) {}
    const tier = tierArg || await chooseTier('genesis');
    if (!tier) return null;
    const id = 'genesis_roulette_ticket_' + tier;
    if (getCount(id) < 1) { toast(ITEMS[id].name + 'を所持していません'); return null; }
    using = true;
    try {
      const res = await runRoulette({
        id, kind:'genesis', tier, unit:'創世pt', unitSmall:'pt',
        describe:'止まった数の創世ptが神聖樹に注がれます。',
        note:'ルーレットを回すとチケットを1枚消費します。',
        resultText: v => `創世pt +${v}`,
        spin: async () => {
          const data = await rpc('use_genesis_roulette_ticket', { p_tier: tier });
          afterUse(id, data);
          return Object.assign({}, data, { value: Number(data.gained_pt) });
        }
      });
      if (res) {
        try { if (window.ShinjuProgress && typeof window.ShinjuProgress.refreshFromServer === 'function') await window.ShinjuProgress.refreshFromServer(); } catch (_) {}
        try { if (window.ShinjuProgress && typeof window.ShinjuProgress.renderHomeEntry === 'function') window.ShinjuProgress.renderHomeEntry(); } catch (_) {}
        toast(`創世pt +${res.value}（神聖樹へ）`);
      }
      return res ? Number(res.value) : null;
    } finally { using = false; }
  }

  // アイテム画面の「使用」ボタンから
  async function useFromItemScreen(id){
    const meta = ITEMS[id];
    if (!meta) return;
    if (id === 'raid_reset_ticket') {
      await useRaidReset({ message:'本日参加しているレイドの挑戦回数を 0 / 3 に戻します。\nよろしいですか？' });
      return;
    }
    if (id.startsWith('genesis_roulette_ticket_')) { await useGenesisRoulette(meta.tier); return; }
    if (id.startsWith('phase_skip_ticket_')) {
      // スキップは位相回遊の挑戦開始時に使う。画面を開いて案内する。
      if (typeof window.openPhaseOdyssey === 'function') {
        window.openPhaseOdyssey();
        setTimeout(() => {
          const api = window.PhaseOdyssey;
          if (api && typeof api.offerSkip === 'function') api.offerSkip(meta.tier);
        }, 320);
      } else toast('位相回遊の挑戦開始時に使用できます');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureStyle, { once:true }); else ensureStyle();

  window.ItemTickets = Object.freeze({
    ITEMS, ORDER, ROULETTE,
    fetchCounts, getCount,
    useRaidReset, spinPhaseSkip, useGenesisRoulette, useFromItemScreen, chooseTier, confirmTicket
  });
})();
