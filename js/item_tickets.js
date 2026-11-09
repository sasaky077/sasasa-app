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
    // build1819: 特別巡行「境界者 -イノリ-」の挑戦TICKET（消費は begin_inori_attempt）
    inori_challenge_ticket: {
      id:'inori_challenge_ticket', name:'イノリ挑戦TICKET', img:'images/inori_stage_ticket.webp',
      kicker:'SPECIAL TICKET -INORI-', tag:'クエスト',
      desc:'特別巡行「境界者 -イノリ-」への挑戦に使用する。クリアでイノリの欠片を1つ獲得し、9つ集めるとイノリが仲間になる。'
    },
    genesis_roulette_ticket_gold: {
      id:'genesis_roulette_ticket_gold', tier:'gold', name:'創世ptルーレット券（金）', img:'images/item_genesis_roulette_ticket_gold.webp',
      kicker:'GENESIS ROULETTE', tag:'神聖樹',
      desc:'ルーレットを回して、神聖樹の創世ptを 80 / 100pt 獲得する。'
    }
  });
  const ORDER = ['inori_challenge_ticket', 'raid_reset_ticket', 'phase_skip_ticket_silver', 'phase_skip_ticket_gold', 'genesis_roulette_ticket_silver', 'genesis_roulette_ticket_gold'];

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
      try { window.dispatchEvent(new CustomEvent('zeraphia:item-tickets-changed', { detail:{ counts:Object.assign({}, counts) } })); } catch (_) {}
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
      /* build1836: 円盤ルーレット */
      .it-sheet.is-roulette{width:min(380px,100%);padding:20px 20px 16px;border-radius:16px;
        background:linear-gradient(180deg,#fffdf7,#f6efe1);border:1px solid rgba(196,164,104,.7);
        box-shadow:0 0 0 5px rgba(255,251,240,.6),0 0 0 6px rgba(196,164,104,.35),0 20px 50px rgba(30,20,8,.45)}
      .it-rw-close{position:absolute;right:10px;top:8px;width:36px;height:36px;border:0;background:none;color:#a8854a;font:300 30px/1 serif;cursor:pointer}
      .it-rw-close[hidden]{display:none}
      .it-rw-kicker{display:flex;align-items:center;gap:10px;justify-content:center;font:600 11px/1 Cinzel,"Noto Serif JP",serif;letter-spacing:.24em;color:#a8854a}
      .it-rw-kicker::before,.it-rw-kicker::after{content:"";flex:0 1 46px;height:1px;background:linear-gradient(90deg,transparent,rgba(168,133,74,.7))}
      .it-rw-kicker::after{transform:scaleX(-1)}
      .it-rw-title{margin:8px 0 0;font-size:21px;font-weight:700;letter-spacing:.06em;color:#3f2c18}
      .it-rw-divider{position:relative;height:12px;margin:6px 34px 0}
      .it-rw-divider::before{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:linear-gradient(90deg,transparent,rgba(168,133,74,.7),transparent)}
      .it-rw-divider i{position:absolute;left:50%;top:50%;width:7px;height:7px;margin:-3.5px;background:#c39a50;transform:rotate(45deg)}
      .it-rw-stage{position:relative;width:min(272px,74vw);aspect-ratio:1;margin:14px auto 6px}
      .it-rw-frame{position:absolute;inset:0;border-radius:50%;padding:6px;
        background:linear-gradient(145deg,#fff4cf,#d4ab55 35%,#f6dc93 55%,#b8862e);box-shadow:0 6px 18px rgba(120,84,26,.32),inset 0 0 0 1px rgba(255,255,255,.6)}
      .it-rw-wheel{width:100%;height:100%;border-radius:50%;overflow:hidden;will-change:transform;background:#fffaf0}
      .it-rw-wheel svg{display:block;width:100%;height:100%}
      .it-rw-seg.is-gold{fill:url(#itRwGold)}
      .it-rw-seg.is-ivory{fill:url(#itRwIvory)}
      .it-rw-seg{transition:filter .3s ease}
      .it-rw-seg.is-win{filter:brightness(1.12) drop-shadow(0 0 0 #fff);animation:itRwWin .7s ease-in-out infinite alternate}
      @keyframes itRwWin{from{fill-opacity:1}to{fill-opacity:.7}}
      .it-rw-line{stroke:rgba(196,160,92,.75);stroke-width:1.4}
      .it-rw-rim{fill:none;stroke:rgba(255,255,255,.7);stroke-width:2}
      .it-rw-num{fill:#4a3018;font-family:"Noto Serif JP","Yu Mincho",serif;font-weight:800;text-anchor:middle;dominant-baseline:middle;letter-spacing:-.01em}
      .it-rw-unit{fill:#6a4a26;font-family:"Noto Serif JP",serif;font-weight:700;text-anchor:middle;dominant-baseline:middle}
      .it-rw-hub{position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px;border-radius:50%;
        background:radial-gradient(circle at 38% 32%,#fff6d4,#e2bd68 45%,#a87a26);box-shadow:0 2px 6px rgba(90,60,10,.45),inset 0 0 0 2px rgba(255,240,200,.6)}
      .it-rw-pointer{position:absolute;left:50%;top:-10px;width:30px;height:44px;margin-left:-15px;z-index:2;transform-origin:50% 8px;
        clip-path:polygon(50% 100%,0 34%,18% 0,82% 0,100% 34%);
        background:linear-gradient(135deg,#fff6d0,#e2b95a 40%,#b9862c 70%,#f0d08a);filter:drop-shadow(0 3px 3px rgba(90,60,10,.4))}
      .it-rw-pointer.is-tick{animation:itRwTick .12s ease-out}
      @keyframes itRwTick{0%{transform:rotate(0)}40%{transform:rotate(-14deg)}100%{transform:rotate(0)}}
      .it-rw-spark{position:absolute;color:#d6b062;font-size:14px;opacity:.85;animation:itRwSpark 1.8s ease-in-out infinite alternate}
      .it-rw-spark.s1{left:-14px;top:8%;font-size:18px}.it-rw-spark.s2{left:-22px;top:20%;font-size:11px;animation-delay:.6s}.it-rw-spark.s3{right:-16px;bottom:10%;font-size:16px;animation-delay:1.1s}
      @keyframes itRwSpark{from{opacity:.35;transform:scale(.85)}to{opacity:1;transform:scale(1.1)}}
      .it-sheet.is-spinning .it-rw-frame{box-shadow:0 6px 22px rgba(200,150,50,.5),0 0 26px rgba(255,214,110,.55),inset 0 0 0 1px rgba(255,255,255,.6)}
      .it-rw-lead{margin:10px 0 0;font-size:16px;font-weight:700;letter-spacing:.04em;color:#3f2c18;white-space:pre-line;line-height:1.5}
      .it-rw-result{display:none;margin-top:8px}
      .it-rw-result.is-show{display:block;animation:itPop .34s cubic-bezier(.2,.9,.3,1.5) both}
      .it-rw-result b{display:inline-block;padding:6px 18px;border-radius:999px;font-size:20px;letter-spacing:.06em;color:#6e4510;
        background:linear-gradient(180deg,#fff7d8,#ffe39a);border:1px solid #d6a640;box-shadow:0 0 18px rgba(255,200,80,.6)}
      .it-sheet.is-done .it-rw-lead{display:none}
      .it-rw-rates{display:flex;justify-content:center;flex-wrap:wrap;gap:4px 18px;margin:10px 4px 0;padding:9px 12px;border-radius:10px;
        background:linear-gradient(180deg,#fffaf0,#f8efdc);border:1px solid rgba(196,164,104,.55);font-size:15px;font-weight:700;color:#4a3018;font-variant-numeric:tabular-nums}
      .it-rw-rates i{font-style:normal;margin:0 2px;opacity:.7}
      .it-rw-own{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:12px;font-size:14px;font-weight:600;color:#4a3018}
      .it-rw-own img{width:52px;height:52px;object-fit:contain;margin:-8px 0;filter:drop-shadow(0 2px 3px rgba(90,60,10,.25))}
      .it-rw-own-sep{width:1px;height:24px;background:rgba(168,133,74,.55)}
      .it-rw-own b{font-size:24px;margin:0 3px;font-family:"Noto Serif JP",serif}
      .it-rw-spin{display:block;width:100%;min-height:54px;margin-top:14px;border-radius:12px;border:1px solid #a87d2a;cursor:pointer;
        clip-path:polygon(10px 0,calc(100% - 10px) 0,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0 calc(100% - 10px),0 10px);
        background:linear-gradient(180deg,#f0d38a,#d1a24a 55%,#b98a32);color:#fffdf5;font:700 21px/1 "Noto Serif JP",serif;letter-spacing:.1em;
        text-shadow:0 1px 2px rgba(90,55,10,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.55)}
      .it-rw-spin:disabled{filter:saturate(.7) brightness(.95);cursor:default}
      .it-rw-note{margin-top:7px;font-size:11.5px;letter-spacing:.12em;color:#6a5638}
      .it-rw-note[hidden]{display:none}
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
  // build1836: 円盤のルーレット。サーバーの結果（当選値）の区画で針の下に止まる。
  //  区画の大きさは当選割合に比例（金券のように2種類しかない時は、交互に2回ずつ並べて4区画にする）。
  const RW_SIZE = 300, RW_C = 150, RW_R = 138;
  function rwPoint(deg, r){ const a = deg * Math.PI / 180; return [RW_C + r * Math.sin(a), RW_C - r * Math.cos(a)]; }
  function rwSegments(table){
    const live = table.filter(x => x.w > 0);
    const total = live.reduce((n, x) => n + x.w, 0) || 1;
    const list = live.length <= 2 ? [...live, ...live] : live; // 2種類なら 100/80/100/80 のように4区画
    const sum = list.reduce((n, x) => n + x.w, 0) || 1;
    let a = 0;
    // 金券のモックに合わせ、2種類の時は大きい値から時計回りに交互
    return list.map((x, i) => {
      const span = x.w / sum * 360;
      const seg = { v:x.v, w:x.w, rate:x.w / total, from:a, to:a + span, span, mid:a + span / 2, alt:i % 2 === 0 };
      a += span;
      return seg;
    });
  }
  function rwSvg(segs, unitSmall){
    const parts = segs.map((g, i) => {
      const [x0, y0] = rwPoint(g.from, RW_R), [x1, y1] = rwPoint(g.to, RW_R);
      const large = g.span > 180 ? 1 : 0;
      const d = g.span >= 359.9
        ? `M${RW_C},${RW_C - RW_R}A${RW_R},${RW_R} 0 1 1 ${RW_C - 0.01},${RW_C - RW_R}Z`
        : `M${RW_C},${RW_C}L${x0.toFixed(2)},${y0.toFixed(2)}A${RW_R},${RW_R} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}Z`;
      // 文字は区画の中ほどに置き、回転中も常に正立させる（setAngle で逆回転をかける）
      // 文字の大きさは全区画・全チケットで統一（細い区画は外寄りに置いて収める）
      const fs = 34;
      const [lx, ly] = rwPoint(g.mid, RW_R * (g.span < 50 ? 0.72 : 0.56));
      const ny = ly - fs * 0.16, uy = ly + fs * 0.5;
      return `<path class="it-rw-seg ${g.alt ? 'is-gold' : 'is-ivory'}" data-seg="${i}" d="${d}"/>` +
        `<g class="it-rw-label" data-lx="${lx.toFixed(2)}" data-ly="${ly.toFixed(2)}"><text class="it-rw-num" x="${lx.toFixed(1)}" y="${ny.toFixed(1)}" font-size="${fs.toFixed(1)}">${g.v}</text>` +
        `<text class="it-rw-unit" x="${lx.toFixed(1)}" y="${uy.toFixed(1)}" font-size="16">${esc(unitSmall)}</text></g>`;
    }).join('');
    const lines = segs.map(g => { const [x, y] = rwPoint(g.from, RW_R); return `<line class="it-rw-line" x1="${RW_C}" y1="${RW_C}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}"/>`; }).join('');
    return `<svg viewBox="0 0 ${RW_SIZE} ${RW_SIZE}" aria-hidden="true">` +
      `<defs><radialGradient id="itRwGold" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#f3e2b4"/><stop offset="1" stop-color="#dcbd7a"/></radialGradient>` +
      `<radialGradient id="itRwIvory" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#f1e7d2"/></radialGradient></defs>` +
      parts + lines + `<circle class="it-rw-rim" cx="${RW_C}" cy="${RW_C}" r="${RW_R}"/></svg>`;
  }
  function runRoulette(opts){
    const { id, kind, tier, title, unitSmall, unit, describe, resultText, finishLabel, spin } = opts;
    const meta = ITEMS[id];
    const table = ROULETTE[kind][tier];
    const segs = rwSegments(table);
    const total = table.reduce((n, x) => n + x.w, 0) || 1;
    const rates = table.filter(x => x.w > 0).map(x => `<span>${x.v}${esc(unitSmall || unit)}<i>：</i>${Math.round(x.w / total * 100)}%</span>`).join('');
    return new Promise(resolve => {
      openLayer((sheet, layer) => {
        sheet.classList.add('is-roulette');
        sheet.innerHTML =
          `<button type="button" class="it-rw-close" data-it-no aria-label="閉じる">×</button>` +
          `<div class="it-rw-kicker"><span>${esc(kind === 'phase' ? 'PHASE SKIP ROULETTE' : 'GENESIS ROULETTE')}</span></div>` +
          `<h2 class="it-rw-title">${esc(title || meta.name)}</h2>` +
          `<div class="it-rw-divider"><i></i></div>` +
          `<div class="it-rw-stage">` +
            `<span class="it-rw-spark s1">✦</span><span class="it-rw-spark s2">✦</span><span class="it-rw-spark s3">✦</span>` +
            `<div class="it-rw-frame"><div class="it-rw-wheel">${rwSvg(segs, unitSmall || unit)}</div><div class="it-rw-hub"></div></div>` +
            `<div class="it-rw-pointer"></div>` +
          `</div>` +
          `<p class="it-rw-lead">${esc(describe || '')}</p>` +
          `<div class="it-rw-result" aria-live="polite"></div>` +
          `<div class="it-rw-rates">${rates}</div>` +
          `<div class="it-rw-own"><img src="${esc(meta.img)}" alt="" onerror="this.style.display='none'"><span class="it-rw-own-sep"></span><span data-it-own>所持数 <b>${getCount(id)}</b> 枚</span></div>` +
          `<button type="button" class="it-rw-spin" data-it-spin>ルーレットを回す</button>` +
          `<div class="it-rw-note">1回につきチケットを1枚消費</div>`;
        const wheel = sheet.querySelector('.it-rw-wheel');
        const pointer = sheet.querySelector('.it-rw-pointer');
        const resultEl = sheet.querySelector('.it-rw-result');
        const noBtn = sheet.querySelector('[data-it-no]');
        const spinBtn = sheet.querySelector('[data-it-spin]');
        let busy = false, finished = false, outcome = null;
        let angle = 0;
        const labels = [...sheet.querySelectorAll('.it-rw-label')].map(el => ({ el, x:el.dataset.lx, y:el.dataset.ly }));
        const setAngle = a => {
          angle = a;
          wheel.style.transform = `rotate(${a}deg)`;
          const r = (-a % 360).toFixed(2);
          for (const l of labels) l.el.setAttribute('transform', `rotate(${r} ${l.x} ${l.y})`);
        };
        // 区画の境目を針が通るたびに針を小さく弾く
        let lastBoundary = -1;
        const boundaries = segs.map(g => g.from);
        const tickCheck = () => {
          const top = ((-angle % 360) + 360) % 360; // 針（真上）に来ている円盤上の角度
          let idx = 0;
          for (let i = 0; i < boundaries.length; i++) if (top >= boundaries[i]) idx = i;
          if (idx !== lastBoundary) {
            lastBoundary = idx;
            pointer.classList.remove('is-tick'); void pointer.offsetWidth; pointer.classList.add('is-tick');
          }
        };
        const done = v => { closeLayer(); resolve(v); };
        noBtn.addEventListener('click', () => { if (!busy) done(finished ? outcome : null); });
        layer.addEventListener('click', e => { if (e.target === layer && !busy && !finished) done(null); });
        spinBtn.addEventListener('click', async () => {
          if (finished) { done(outcome); return; }
          if (busy) return;
          busy = true;
          spinBtn.disabled = true; noBtn.hidden = true;
          sheet.classList.add('is-spinning');
          // サーバー応答待ちの間は、加速しながら回り続ける
          let spinning = true, speed = 0, prevT = performance.now();
          const MAX = 1.05; // 度/ms
          const loop = t => {
            if (!spinning) return;
            const dt = Math.min(40, t - prevT); prevT = t;
            speed = Math.min(MAX, speed + dt * 0.0035);
            setAngle(angle + speed * dt);
            tickCheck();
            requestAnimationFrame(loop);
          };
          requestAnimationFrame(loop);
          let data = null, value = null;
          try {
            const [d] = await Promise.all([spin(), wait(650)]);
            data = d; value = Number(data && data.value);
          } catch (err) {
            spinning = false;
            sheet.classList.remove('is-spinning');
            busy = false; spinBtn.disabled = false; noBtn.hidden = false;
            toast(err && err.message ? err.message : 'チケットを使用できませんでした');
            return;
          }
          spinning = false;
          // 当選値の区画（同じ値が複数あればランダム）の中ほどで止める
          const cands = segs.map((g, i) => i).filter(i => segs[i].v === value);
          const segIdx = cands.length ? cands[Math.floor(Math.random() * cands.length)] : 0;
          const seg = segs[segIdx];
          const jitter = (Math.random() - 0.5) * seg.span * 0.62;
          const stopAt = seg.mid + jitter;              // 円盤上でこの角度が真上に来ればよい
          const startA = angle;
          const want = ((-stopAt % 360) + 360) % 360;    // 最終角度 mod 360
          let delta = want - (((startA % 360) + 360) % 360);
          if (delta < 0) delta += 360;
          delta += 360 * 4;                              // 少なくとも4周してから止まる
          const dur = 3400;
          // 開始速度（≒MAX）から滑らかに減速：ease-out（4次）で初速を合わせる
          const t0 = performance.now();
          await new Promise(res => {
            const step = t => {
              const k = Math.min(1, (t - t0) / dur);
              const e = 1 - Math.pow(1 - k, 4);
              setAngle(startA + delta * e);
              tickCheck();
              if (k < 1) requestAnimationFrame(step); else res();
            };
            requestAnimationFrame(step);
          });
          sheet.classList.remove('is-spinning');
          const winPath = sheet.querySelector(`.it-rw-seg[data-seg="${segIdx}"]`);
          if (winPath) winPath.classList.add('is-win');
          sheet.classList.add('is-done');
          resultEl.innerHTML = `<b>${esc(resultText(value, data))}</b>`;
          resultEl.classList.add('is-show');
          outcome = { value, data };
          finished = true; busy = false;
          spinBtn.disabled = false;
          spinBtn.textContent = finishLabel || 'OK';
          const own = sheet.querySelector('[data-it-own]');
          if (own) own.innerHTML = `残り <b>${getCount(id)}</b> 枚`;
          const note = sheet.querySelector('.it-rw-note');
          if (note) note.hidden = true;
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
        describe:'ルーレットで踏破する階層を決定',
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
        describe:'ルーレットを回して創世ptを獲得',
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
    if (id === 'inori_challenge_ticket') {
      if (typeof window.openInoriPiecePanel === 'function') window.openInoriPiecePanel();
      else toast('特別巡行「境界者 -イノリ-」で使用できます');
      return;
    }
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
