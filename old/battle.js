// battle.js  ステップ3：UI刷新 + NEXT詳細 + スキル長押し詳細

(function () {

  // ============================================================
  // 仮データ
  // ============================================================
  const DUMMY_PARTY = [
    {
      id: 'chara_14', name: 'アイム', img: 'images/chara_14_up.webp',
      hp: 740, hpMax: 740, atk: 280, def: 210, spd: 310, accuracy: 290,
      row: 'near', col: 'center',
      skills: [
        { id: 's1', name: '縛鎖',  cd: 0, cdMax: 1, hit: 85,  type: 'debuff', desc: '怪異に「縛り」を付与する。縛り中はATK・SPDが低下し、縛り限定スキルが使用可能になる。' },
        { id: 's2', name: '実体化',cd: 0, cdMax: 1, hit: 100, type: 'debuff', desc: '怪異に「実体化」を付与する。実体化中は受けるダメージが1.5倍になり、実体化限定スキルが使用可能になる。' },
        { id: 's3', name: '灼打',  cd: 0, cdMax: 1, hit: 90,  type: 'attack', desc: '怪異に攻撃を行い、追加で「縛り」付与を試みる。攻撃が外れた場合、付与効果も無効になる。' },
        { id: 's4', name: '加速',  cd: 0, cdMax: 1, hit: 100, type: 'buff',   desc: '自身のSPDを一時的に上昇させる。次のターンの行動順が早くなる。' },
        { id: 's5', name: '祓撃',  cd: 0, cdMax: 1, hit: 75,  type: 'attack', desc: '祓いの力を込めた攻撃。命中率は低いが、実体化中の怪異に対して特に有効。' },
      ]
    },
    {
      id: 'chara_16', name: 'アズキ', img: 'images/chara_16_up.webp',
      hp: 950, hpMax: 950, atk: 255, def: 325, spd: 255, accuracy: 260,
      row: 'mid', col: 'center',
      skills: [
        { id: 's1', name: '霧縛',  cd: 0, cdMax: 1, hit: 80,  type: 'debuff', desc: '霧を纏わせ怪異を縛る。縛り付与。命中率がやや低い。' },
        { id: 's2', name: '結界',  cd: 0, cdMax: 1, hit: 100, type: 'buff',   desc: '味方全体に防御結界を張る。このターン中受けるダメージを軽減する。' },
        { id: 's3', name: '繋ぎ手',cd: 0, cdMax: 1, hit: 100, type: 'debuff', desc: '怪異を現実に繋ぎ止める。実体化付与の補助として機能し、実体化の効果時間を延長する。' },
        { id: 's4', name: '散霧',  cd: 0, cdMax: 1, hit: 70,  type: 'attack', desc: '霧を爆発させて範囲攻撃を行う。命中率は低いが複数の効果を持つ。' },
        { id: 's5', name: '回廊',  cd: 0, cdMax: 1, hit: 100, type: 'move',   desc: '霧の回廊を使い移動しながら攻撃する。移動先はスキル固定。' },
      ]
    },
    {
      id: 'chara_17', name: 'ベン', img: 'images/chara_17_up.webp',
      hp: 800, hpMax: 800, atk: 255, def: 250, spd: 260, accuracy: 270,
      row: 'far', col: 'center',
      skills: [
        { id: 's1', name: '模写',  cd: 0, cdMax: 1, hit: 100, type: 'special', desc: '他の紡ぎ手のスキルを一時的に模倣する。同キャラ編成が禁止される中、疑似的な重複編成を可能にする唯一のスキル。' },
        { id: 's2', name: '道化撃',cd: 0, cdMax: 1, hit: 90,  type: 'attack',  desc: '道化師の動きで怪異を攪乱しながら攻撃する。' },
        { id: 's3', name: '仮面',  cd: 0, cdMax: 1, hit: 100, type: 'buff',    desc: '仮面を付け直し、このターンの状態異常を無効化する。' },
        { id: 's4', name: '乱射',  cd: 0, cdMax: 1, hit: 65,  type: 'attack',  desc: '無数の攻撃を乱れ打つ。命中率は低いが、当たれば高ダメージ。' },
        { id: 's5', name: '転換',  cd: 0, cdMax: 1, hit: 100, type: 'move',    desc: 'ポジションを任意に変更する。そのターンはこの移動のみ行動可能。' },
      ]
    },
  ];

  const DUMMY_ENEMY = {
    id: 'enemy_01',
    name: '??????',
    upImg: 'images/enemy_01_up.webp',
    hp: 2000, hpMax: 2000,
    atk: 375, def: 280, spd: 260,
    phase: 1, status: [],
    actionPattern: [
      { turn: 1, action: '全体攻撃',   type: 'atk_all',    desc: '全員に攻撃を行う。ポジションに関係なく全キャラが対象になる。' },
      { turn: 2, action: '単体攻撃',   type: 'atk_single', desc: 'ランダムな1人に強力な攻撃を行う。' },
      { turn: 3, action: '中縦列攻撃', type: 'atk_center', desc: '中央列（左中右の中）にいるキャラ全員を攻撃する。' },
      { turn: 4, action: '十字攻撃',   type: 'atk_cross',  desc: '中列と中縦列が重なる十字形の範囲を攻撃する。中央に置くほど危険。' },
    ],
    actionIdx: 0,
  };

  // 攻撃パターン対象計算
  const ATTACK_PATTERNS = {
    atk_single:  p => { const a=p.filter(c=>c.hp>0); return a.length?[a[Math.floor(Math.random()*a.length)]]:[] },
    atk_all:     p => p.filter(c=>c.hp>0),
    atk_near:    p => p.filter(c=>c.hp>0 && (c.row||c.pos)==='near'),
    atk_mid:     p => p.filter(c=>c.hp>0 && (c.row||c.pos)==='mid'),
    atk_far:     p => p.filter(c=>c.hp>0 && (c.row||c.pos)==='far'),
    atk_left:    p => p.filter(c=>c.hp>0 && c.col==='left'),
    atk_center:  p => p.filter(c=>c.hp>0 && c.col==='center'),
    atk_right:   p => p.filter(c=>c.hp>0 && c.col==='right'),
    atk_cross:   p => p.filter(c=>c.hp>0 && ((c.row||c.pos)==='mid' || c.col==='center')),
    atk_xcross:  p => p.filter(c=>c.hp>0 && (c.row||c.pos)!=='mid' && c.col!=='center'),
  };

  // 攻撃パターンの範囲図（9マスのどこが対象か）
  const PATTERN_GRID = {
    atk_single:  () => null, // ランダムなのでグレー表示
    atk_all:     () => 'all',
    atk_near:    () => ({rows:['near'], cols:['left','center','right']}),
    atk_mid:     () => ({rows:['mid'],  cols:['left','center','right']}),
    atk_far:     () => ({rows:['far'],  cols:['left','center','right']}),
    atk_left:    () => ({rows:['near','mid','far'], cols:['left']}),
    atk_center:  () => ({rows:['near','mid','far'], cols:['center']}),
    atk_right:   () => ({rows:['near','mid','far'], cols:['right']}),
    atk_cross:   () => 'cross',
    atk_xcross:  () => 'xcross',
  };

  // ============================================================
  // ダメージ計算
  // ============================================================
  function calcDamage(atk, def, enemy, multiplier) {
    const m = multiplier || 1.0;
    let dmg = Math.max(1, Math.floor(atk * m) - def);
    if (enemy.status.includes('実体化')) dmg = Math.floor(dmg * 1.5);
    if (enemy.status.includes('縛り'))   dmg = Math.floor(dmg * 1.25);
    return dmg;
  }
  function calcEnemyDamage(enemy, target) {
    return Math.max(1, enemy.atk - target.def);
  }
  function hitCheck(baseHit, accuracy) {
    return Math.random() * 100 < Math.min(100, baseHit + Math.floor((accuracy - 250) / 10));
  }

  function calcTurnOrder(party, enemy) {
    const units = party.filter(c=>c.hp>0).map(c=>({...c, isEnemy:false}));
    units.push({...enemy, isEnemy:true, name:'怪異'});
    units.sort((a,b) => b.spd!==a.spd ? b.spd-a.spd : (a.isEnemy?-1:1));
    return units;
  }

  // ============================================================
  // HTML構築
  // ============================================================
  function buildBattleScreen() {
    if (document.getElementById('battle-root')) return document.getElementById('battle-root');

    const el = document.createElement('div');
    el.id = 'battle-root';
    el.style.cssText = 'position:fixed;inset:0;z-index:200000;display:none;flex-direction:column;background:#07080a;color:#e8e4dc;font-family:"Noto Serif JP",serif;opacity:0;transition:opacity 0.5s ease;overflow:hidden;';

    el.innerHTML = `
      <!-- 怪異エリア（上部・画像＋HP） -->
      <div class="bt-enemy-area" id="bt-enemy-area">
        <img class="bt-enemy-img" id="bt-enemy-img" src="" alt="">
        <div class="bt-enemy-overlay">
          <div class="bt-enemy-status-row" id="bt-enemy-status-row"></div>
          <div class="bt-enemy-hp-wrap">
            <div class="bt-enemy-hp-bar">
              <div class="bt-enemy-hp-fill" id="bt-enemy-hp-fill"></div>
              <div class="bt-enemy-hp-phase" id="bt-enemy-hp-phase"></div>
            </div>
            <div class="bt-enemy-hp-txt" id="bt-enemy-hp-txt"></div>
          </div>
          <div class="bt-next-wrap" id="bt-next-wrap" onclick="showNextDetail()">
            <span class="bt-next-label">NEXT</span>
            <span class="bt-next-val" id="bt-next-val">—</span>
            <span class="bt-next-hint">▸</span>
          </div>
        </div>
      </div>

      <!-- 行動順 -->
      <div class="bt-order-wrap">
        <div class="bt-order-list" id="bt-order-list"></div>
      </div>

      <!-- 9マスフィールド -->
      <div class="bt-field">
        <div class="bt-field-col-labels">
          <div class="bt-field-spacer"></div>
          <div class="bt-field-col-label">左</div>
          <div class="bt-field-col-label">中</div>
          <div class="bt-field-col-label">右</div>
        </div>
        <div class="bt-field-row">
          <div class="bt-field-row-label">近</div>
          <div class="bt-field-cell" id="bt-cell-near-left"></div>
          <div class="bt-field-cell" id="bt-cell-near-center"></div>
          <div class="bt-field-cell" id="bt-cell-near-right"></div>
        </div>
        <div class="bt-field-row">
          <div class="bt-field-row-label">中</div>
          <div class="bt-field-cell" id="bt-cell-mid-left"></div>
          <div class="bt-field-cell" id="bt-cell-mid-center"></div>
          <div class="bt-field-cell" id="bt-cell-mid-right"></div>
        </div>
        <div class="bt-field-row">
          <div class="bt-field-row-label">遠</div>
          <div class="bt-field-cell" id="bt-cell-far-left"></div>
          <div class="bt-field-cell" id="bt-cell-far-center"></div>
          <div class="bt-field-cell" id="bt-cell-far-right"></div>
        </div>
      </div>

      <!-- スキルエリア -->
      <div class="bt-skill-area" id="bt-skill-area" style="display:none">
        <div class="bt-skill-header">
          <span class="bt-skill-acting" id="bt-skill-acting"></span>
          <button class="bt-btn-move" onclick="battleMoveMode()">移動</button>
        </div>
        <div class="bt-skill-cards" id="bt-skill-cards"></div>
        <div class="bt-skill-hint">長押しで詳細を確認</div>
      </div>

      <!-- ログ -->
      <div class="bt-log-wrap">
        <div class="bt-log" id="bt-log">—</div>
      </div>
    `;

    document.body.appendChild(el);
    injectStyle();
    return el;
  }

  // ============================================================
  // CSS
  // ============================================================
  function injectStyle() {
    if (document.getElementById('battle-style')) return;
    const s = document.createElement('style');
    s.id = 'battle-style';
    s.textContent = `
      /* 怪異エリア */
      .bt-enemy-area {
        position:relative; flex-shrink:0;
        height: 32vh; min-height:160px; max-height:240px;
        overflow:hidden;
      }
      .bt-enemy-img {
        width:100%; height:100%; object-fit:cover; object-position:center top;
        display:block;
      }
      .bt-enemy-overlay {
        position:absolute; inset:0;
        background:linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(7,8,10,0.85) 80%, rgba(7,8,10,1) 100%);
        display:flex; flex-direction:column; justify-content:flex-end;
        padding: max(8px,env(safe-area-inset-top,8px)) 14px 8px;
      }
      .bt-enemy-status-row { display:flex; gap:5px; margin-bottom:5px; min-height:18px; }
      .bt-status-badge {
        font-size:8px; letter-spacing:1px; padding:2px 7px; border-radius:3px; border:1px solid;
        font-family:"Cinzel",serif;
      }
      .bt-status-jittai  { color:#a8e6cf; border-color:rgba(168,230,207,.5); background:rgba(168,230,207,.1); }
      .bt-status-shibari { color:#ffd3a8; border-color:rgba(255,211,168,.5); background:rgba(255,211,168,.1); }
      .bt-enemy-hp-wrap { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
      .bt-enemy-hp-bar {
        flex:1; height:5px; background:rgba(255,255,255,.1); border-radius:3px; overflow:hidden; position:relative;
      }
      .bt-enemy-hp-fill {
        height:100%; background:linear-gradient(90deg,#7a1515,#c02828);
        border-radius:3px; transition:width .6s ease; width:90%;
      }
      .bt-enemy-hp-phase {
        position:absolute; top:0; bottom:0; width:1px; background:rgba(255,255,255,.3); left:50%;
      }
      .bt-enemy-hp-txt {
        font-family:"Cinzel",serif; font-size:10px; color:rgba(232,228,220,.5); white-space:nowrap; min-width:80px; text-align:right;
      }
      .bt-next-wrap {
        display:inline-flex; align-items:center; gap:6px; cursor:pointer;
        padding:3px 0; -webkit-tap-highlight-color:transparent;
      }
      .bt-next-label {
        font-family:"Cinzel",serif; font-size:8px; letter-spacing:3px; color:rgba(232,228,220,.35);
      }
      .bt-next-val { font-size:12px; color:#d4a84b; letter-spacing:1px; }
      .bt-next-hint { font-size:10px; color:rgba(212,168,75,.5); }

      /* 行動順 */
      .bt-order-wrap {
        flex-shrink:0; padding:5px 12px 4px;
        border-bottom:1px solid rgba(255,255,255,.04);
      }
      .bt-order-list { display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; }
      .bt-order-list::-webkit-scrollbar { display:none; }
      .bt-order-chip {
        flex-shrink:0; display:flex; flex-direction:column; align-items:center; gap:1px;
        padding:3px 8px; border-radius:5px;
        border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.03);
        min-width:40px; transition:all .2s;
      }
      .bt-order-chip.is-active  { border-color:rgba(232,228,220,.45); background:rgba(232,228,220,.09); }
      .bt-order-chip.is-enemy   { border-color:rgba(180,40,40,.4);    background:rgba(180,40,40,.07); }
      .bt-order-chip.is-enemy.is-active { border-color:rgba(200,50,50,.8); background:rgba(200,50,50,.16); }
      .bt-order-chip-name { font-size:9px; color:rgba(232,228,220,.65); letter-spacing:.3px; white-space:nowrap; }
      .bt-order-chip-spd  { font-family:"Cinzel",serif; font-size:9px; color:rgba(232,228,220,.35); }

      /* フィールド */
      .bt-field { display:flex; flex-direction:column; flex:1; min-height:0; padding:4px 10px; gap:3px; }
      .bt-field-col-labels { display:flex; align-items:center; padding-bottom:1px; }
      .bt-field-spacer { width:18px; flex-shrink:0; }
      .bt-field-col-label {
        flex:1; text-align:center; font-family:"Cinzel",serif;
        font-size:8px; letter-spacing:2px; color:rgba(232,228,220,.2);
      }
      .bt-field-row { display:flex; align-items:stretch; gap:3px; flex:1; min-height:0; }
      .bt-field-row-label {
        width:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center;
        font-family:"Cinzel",serif; font-size:9px; color:rgba(232,228,220,.25);
      }
      .bt-field-cell {
        flex:1; border-radius:5px; border:1px solid rgba(255,255,255,.05);
        background:rgba(255,255,255,.02); overflow:hidden; position:relative;
        display:flex; align-items:stretch;
        transition: border-color .2s, background .2s;
      }
      .bt-field-cell.danger {
        border-color:rgba(200,50,50,.4); background:rgba(200,50,50,.06);
        animation:dangerPulse .8s ease-in-out infinite;
      }
      @keyframes dangerPulse {
        0%,100% { border-color:rgba(200,50,50,.3); }
        50%      { border-color:rgba(200,50,50,.7); }
      }

      /* キャラカード */
      .bt-chara-card {
        width:100%; display:flex; flex-direction:column;
        cursor:pointer; -webkit-tap-highlight-color:transparent;
        position:relative;
      }
      .bt-chara-card.is-acting {
        outline:2px solid rgba(180,230,140,.7);
        outline-offset:-2px;
      }
      .bt-chara-card.is-disabled { opacity:.3; pointer-events:none; }
      .bt-chara-img {
        width:100%; aspect-ratio:3/4; object-fit:cover; object-position:top center; display:block;
      }
      .bt-chara-name { display:none; }
      .bt-chara-hp-bar {
        position:absolute; bottom:0; left:0; right:0; height:3px; background:rgba(0,0,0,.5);
      }
      .bt-chara-hp-fill { height:100%; background:linear-gradient(90deg,#2e7d4f,#5bc47a); transition:width .4s ease; }
      .bt-chara-hp-num {
        position:absolute; bottom:4px; left:0; right:0;
        font-family:"Cinzel",serif; font-size:8px; text-align:center;
        color:rgba(232,228,220,.8); text-shadow:0 1px 4px rgba(0,0,0,1);
        pointer-events:none;
      }

      /* スキルエリア */
      .bt-skill-area {
        flex-shrink:0; padding:7px 12px 4px;
        background:linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,.5) 100%);
        border-top:1px solid rgba(255,255,255,.05);
      }
      .bt-skill-header {
        display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;
      }
      .bt-skill-acting { font-size:11px; letter-spacing:2px; color:rgba(232,228,220,.5); }
      .bt-btn-move {
        font-size:10px; letter-spacing:2px; padding:4px 12px; border-radius:6px;
        border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.05);
        color:rgba(232,228,220,.6); cursor:pointer; font-family:"Noto Serif JP",serif;
      }
      .bt-btn-move:active { background:rgba(255,255,255,.12); }
      .bt-skill-cards { display:flex; gap:7px; }
      .bt-skill-hint {
        text-align:center; font-size:8px; letter-spacing:2px;
        color:rgba(232,228,220,.2); margin-top:5px; padding-bottom:2px;
      }

      /* スキルカード */
      .bt-skill-card {
        flex:1; background:rgba(18,18,24,.95);
        border:1px solid rgba(255,255,255,.09); border-radius:9px;
        padding:10px 5px 8px; cursor:pointer;
        display:flex; flex-direction:column; align-items:center; gap:4px;
        -webkit-tap-highlight-color:transparent; position:relative; overflow:hidden;
        transition:transform .12s, border-color .15s;
        user-select:none; -webkit-user-select:none;
      }
      .bt-skill-card::after {
        content:''; position:absolute; top:0; left:0; right:0; height:1px;
        background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);
      }
      .bt-skill-card.pressing {
        transform:scale(.96); border-color:rgba(232,228,220,.3);
        background:rgba(232,228,220,.05);
      }
      .bt-skill-card.on-cd { opacity:.3; pointer-events:none; }
      .bt-skill-name { font-size:13px; letter-spacing:1px; color:#e8e4dc; font-weight:500; text-align:center; }
      .bt-skill-subdesc { font-size:9px; color:rgba(232,228,220,.35); letter-spacing:.5px; text-align:center; }
      .bt-skill-hit  { font-family:"Cinzel",serif; font-size:9px; color:rgba(232,228,220,.3); }
      .bt-skill-cd-badge {
        position:absolute; top:3px; right:3px;
        font-family:"Cinzel",serif; font-size:7px; color:rgba(255,255,255,.3);
        background:rgba(0,0,0,.5); border-radius:3px; padding:1px 4px;
      }

      /* ログ */
      .bt-log-wrap {
        flex-shrink:0; height:32px; display:flex; align-items:center; justify-content:center;
        padding: 0 16px; padding-bottom:max(6px,env(safe-area-inset-bottom,6px));
      }
      .bt-log { font-size:11px; color:rgba(232,228,220,.4); letter-spacing:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center; }

      /* ダメージポップ */
      .bt-dmg-pop {
        position:fixed; pointer-events:none; font-family:"Cinzel",serif; font-weight:700; font-size:22px;
        color:#fff; text-shadow:0 0 14px rgba(255,60,60,.9), 0 2px 6px rgba(0,0,0,.9);
        animation:dmgFloat 1.1s ease-out forwards; z-index:299999; white-space:nowrap;
      }
      .bt-dmg-pop.miss { color:rgba(232,228,220,.45); text-shadow:none; font-size:14px; }
      .bt-dmg-pop.heal { color:#5bc47a; text-shadow:0 0 12px rgba(91,196,122,.8); }
      @keyframes dmgFloat {
        0%  { opacity:1; transform:translateY(0) scale(1); }
        25% { opacity:1; transform:translateY(-18px) scale(1.15); }
        100%{ opacity:0; transform:translateY(-55px) scale(.75); }
      }

      /* 敵ターンオーバーレイ */
      #bt-enemy-turn-overlay {
        position:fixed; inset:0; z-index:210000; display:flex;
        align-items:center; justify-content:center;
        opacity:0; pointer-events:none; transition:opacity .25s;
        background:rgba(0,0,0,.25);
      }
      #bt-enemy-turn-overlay.active { opacity:1; pointer-events:auto; }
      .bt-enemy-turn-txt {
        font-family:"Cinzel",serif; font-size:26px; letter-spacing:8px;
        color:#c02828; text-shadow:0 0 24px rgba(200,40,40,.8);
        animation:etPulse 1.5s ease-out forwards;
      }
      @keyframes etPulse {
        0%  { opacity:0; transform:scale(.85); }
        20% { opacity:1; transform:scale(1.04); }
        80% { opacity:1; transform:scale(1); }
        100%{ opacity:0; }
      }

      /* 詳細ポップアップ共通 */
      .bt-detail-popup {
        position:fixed; inset:0; z-index:220000;
        display:flex; align-items:flex-end; justify-content:center;
        background:rgba(0,0,0,.6); backdrop-filter:blur(2px);
        opacity:0; pointer-events:none; transition:opacity .2s;
      }
      .bt-detail-popup.active { opacity:1; pointer-events:auto; }
      .bt-detail-box {
        width:100%; max-width:430px;
        background:#0f1014; border-top:1px solid rgba(255,255,255,.1);
        border-radius:16px 16px 0 0; padding:20px 20px;
        padding-bottom:max(24px,env(safe-area-inset-bottom,24px));
        transform:translateY(20px); transition:transform .25s ease;
      }
      .bt-detail-popup.active .bt-detail-box { transform:translateY(0); }
      .bt-detail-title {
        font-family:"Cinzel",serif; font-size:15px; letter-spacing:3px;
        color:rgba(232,228,220,.9); margin-bottom:6px;
      }
      .bt-detail-type {
        font-size:9px; letter-spacing:3px; color:rgba(232,228,220,.35); margin-bottom:12px;
      }
      .bt-detail-desc {
        font-size:13px; color:rgba(232,228,220,.7); line-height:1.8; letter-spacing:.5px; margin-bottom:16px;
      }
      .bt-detail-grid {
        display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px;
      }
      .bt-detail-stat {
        background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
        border-radius:8px; padding:8px 12px; display:flex; flex-direction:column; gap:2px;
      }
      .bt-detail-stat-label { font-size:8px; letter-spacing:2px; color:rgba(232,228,220,.35); }
      .bt-detail-stat-val { font-family:"Cinzel",serif; font-size:16px; color:rgba(232,228,220,.85); }

      /* 攻撃範囲グリッド */
      .bt-detail-range-title {
        font-size:9px; letter-spacing:3px; color:rgba(232,228,220,.35); margin-bottom:8px;
      }
      .bt-range-grid {
        display:grid; grid-template-columns:repeat(3,1fr); gap:3px; width:120px; margin-bottom:16px;
      }
      .bt-range-cell {
        aspect-ratio:1; border-radius:4px;
        border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.03);
      }
      .bt-range-cell.danger { background:rgba(200,50,50,.3); border-color:rgba(200,50,50,.6); }
      .bt-range-cell.safe   { background:rgba(255,255,255,.04); border-color:rgba(255,255,255,.06); }

      .bt-detail-close {
        width:100%; padding:12px; border-radius:10px;
        border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.05);
        color:rgba(232,228,220,.6); font-size:13px; letter-spacing:2px;
        cursor:pointer; font-family:"Noto Serif JP",serif;
      }
      .bt-detail-close:active { background:rgba(255,255,255,.1); }

      /* 移動モード */
      .bt-field-cell.movable {
        border-color:rgba(100,180,255,.5); background:rgba(100,180,255,.07);
        animation:movePulse .9s ease-in-out infinite; cursor:pointer;
      }
      @keyframes movePulse {
        0%,100% { border-color:rgba(100,180,255,.3); }
        50%      { border-color:rgba(100,180,255,.8); }
      }
      .bt-field-cell.movable:active { background:rgba(100,180,255,.18); }
      .bt-btn-move.move-active {
        border-color:rgba(100,180,255,.6); background:rgba(100,180,255,.12);
        color:rgba(100,180,255,.9);
      }
      .bt-move-cancel {
        text-align:center; font-size:10px; letter-spacing:2px;
        color:rgba(232,228,220,.3); cursor:pointer; padding:4px 0 2px;
        -webkit-tap-highlight-color:transparent;
      }

      /* 結果バナー */
      #bt-result-banner {
        position:fixed; inset:0; z-index:230000;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        background:rgba(0,0,0,.88); opacity:0; pointer-events:none; transition:opacity .5s;
      }
      #bt-result-banner.active { opacity:1; pointer-events:auto; }
      .bt-result-txt {
        font-family:"Cinzel",serif; font-size:38px; letter-spacing:10px; margin-bottom:36px;
      }
      .bt-result-txt.win  { color:#d4a84b; text-shadow:0 0 28px rgba(212,168,75,.6); }
      .bt-result-txt.lose { color:#c02828; text-shadow:0 0 28px rgba(192,40,40,.6); }
      .bt-result-btn {
        padding:14px 44px; border-radius:12px;
        border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.07);
        color:#e8e4dc; font-size:14px; letter-spacing:2px;
        cursor:pointer; font-family:"Noto Serif JP",serif;
      }
      .bt-result-btn:active { background:rgba(255,255,255,.15); }
    `;
    document.body.appendChild(s);
  }

  // ============================================================
  // 状態
  // ============================================================
  let bs = null;
  let locked = false;

  // ============================================================
  // レンダリング
  // ============================================================
  function renderEnemy() {
    const e = bs.enemy;
    const fill = document.getElementById('bt-enemy-hp-fill');
    if (fill) fill.style.width = (e.hp / e.hpMax * 100) + '%';
    const txt = document.getElementById('bt-enemy-hp-txt');
    if (txt) txt.textContent = e.hp + ' / ' + e.hpMax;
    const img = document.getElementById('bt-enemy-img');
    if (img && e.upImg) img.src = e.upImg;
    const next = document.getElementById('bt-next-val');
    if (next) next.textContent = peekNextAction().action;

    const row = document.getElementById('bt-enemy-status-row');
    if (row) {
      row.innerHTML = '';
      e.status.forEach(st => {
        const b = document.createElement('span');
        b.className = 'bt-status-badge ' + (st==='実体化'?'bt-status-jittai':'bt-status-shibari');
        b.textContent = st;
        row.appendChild(b);
      });
    }
  }

  function renderOrder() {
    const list = document.getElementById('bt-order-list');
    if (!list) return;
    list.innerHTML = '';
    bs.turnOrder.forEach((u,i) => {
      const chip = document.createElement('div');
      chip.className = 'bt-order-chip'
        + (u.isEnemy?' is-enemy':'')
        + (i===bs.actingIdx?' is-active':'');
      chip.innerHTML = `<div class="bt-order-chip-name">${u.name}</div><div class="bt-order-chip-spd">${u.spd}</div>`;
      list.appendChild(chip);
    });
  }

  function renderField() {
    const ROWS = ['near','mid','far'];
    const COLS = ['left','center','right'];

    // 危険マス計算（次の敵行動）
    const nextAct = peekNextAction();
    const patFn = PATTERN_GRID[nextAct.type];
    const pat = patFn ? patFn() : null;

    ROWS.forEach(row => {
      COLS.forEach(col => {
        const cell = document.getElementById('bt-cell-'+row+'-'+col);
        if (!cell) return;
        cell.innerHTML = '';

        // 危険ハイライト
        let isDanger = false;
        if (pat === 'all') isDanger = true;
        else if (pat === 'cross') isDanger = (row==='mid' || col==='center');
        else if (pat === 'xcross') isDanger = (row!=='mid' && col!=='center');
        else if (pat && pat.rows && pat.cols) isDanger = pat.rows.includes(row) && pat.cols.includes(col);
        cell.className = 'bt-field-cell' + (isDanger?' danger':'');
      });
    });

    const actingUnit = bs.turnOrder[bs.actingIdx];
    bs.party.forEach(c => {
      const row = c.row || c.pos || 'near';
      const col = c.col || 'left';
      const cell = document.getElementById('bt-cell-'+row+'-'+col);
      if (!cell) return;

      const hpRate = (c.hp / c.hpMax * 100);
      const isActing = !actingUnit.isEnemy && actingUnit.id === c.id;
      const isDead = c.hp <= 0;

      const card = document.createElement('div');
      card.className = 'bt-chara-card'
        + (isActing?' is-acting':'')
        + (isDead?' is-disabled':'');
      card.innerHTML = `
        <img class="bt-chara-img" src="${c.img}" onerror="this.style.opacity='0'">
        <div class="bt-chara-name">${c.name}</div>
        <div class="bt-chara-hp-bar">
          <div class="bt-chara-hp-fill" style="width:${hpRate}%"></div>
        </div>
        <div class="bt-chara-hp-num">${c.hp}</div>
      `;
      if (!isDead && !locked) card.onclick = () => onCharaTap(c.id);
      cell.appendChild(card);
    });
  }

  function renderSkills(chara) {
    const area = document.getElementById('bt-skill-area');
    const cards = document.getElementById('bt-skill-cards');
    const acting = document.getElementById('bt-skill-acting');
    if (!area || !cards) return;

    if (!chara) { area.style.display = 'none'; return; }
    area.style.display = '';
    if (acting) acting.textContent = '— ' + chara.name + ' の行動 —';

    const pool = chara.skills.filter(sk => sk.cd === 0);
    const tmp = [...pool];
    const drawn = [];
    while (drawn.length < 3 && tmp.length > 0) {
      drawn.push(tmp.splice(Math.floor(Math.random()*tmp.length), 1)[0]);
    }
    const display = [...drawn, ...chara.skills.filter(sk=>sk.cd>0).slice(0, 3-drawn.length)];

    cards.innerHTML = '';
    display.forEach(sk => {
      const card = document.createElement('div');
      card.className = 'bt-skill-card' + (sk.cd>0?' on-cd':'');
      card.innerHTML = `
        ${sk.cd>0?'<span class="bt-skill-cd-badge">CD</span>':''}
        <div class="bt-skill-name">${sk.name}</div>
        <div class="bt-skill-subdesc">${sk.type==='attack'?'攻撃':sk.type==='debuff'?'妨害':sk.type==='buff'?'補助':sk.type==='move'?'移動':'特殊'}</div>
        <div class="bt-skill-hit">${sk.hit<100?'HIT '+sk.hit+'%':'確定命中'}</div>
      `;
      if (sk.cd === 0) {
        // 長押し→詳細、タップ→発動
        setupSkillCard(card, chara, sk);
      }
      cards.appendChild(card);
    });
  }

  // 長押し判定
  function setupSkillCard(card, chara, sk) {
    let pressTimer = null;
    let pressing = false;

    const start = () => {
      pressing = true;
      card.classList.add('pressing');
      pressTimer = setTimeout(() => {
        pressing = false;
        card.classList.remove('pressing');
        showSkillDetail(sk);
      }, 450);
    };
    const cancel = () => {
      card.classList.remove('pressing');
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    };
    const end = () => {
      card.classList.remove('pressing');
      if (pressTimer) {
        clearTimeout(pressTimer); pressTimer = null;
        if (pressing) { pressing = false; onSkillTap(chara, sk); }
      }
    };

    card.addEventListener('touchstart', start, {passive:true});
    card.addEventListener('touchend', end);
    card.addEventListener('touchcancel', cancel);
    card.addEventListener('mousedown', start);
    card.addEventListener('mouseup', end);
    card.addEventListener('mouseleave', cancel);
  }

  function addLog(msg) {
    const log = document.getElementById('bt-log');
    if (log) log.textContent = msg;
  }

  function showDmgPop(el, value, type) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.className = 'bt-dmg-pop' + (type==='miss'?' miss':type==='heal'?' heal':'');
    pop.textContent = type==='miss'?'MISS':type==='heal'?'+'+value:'-'+value;
    pop.style.cssText = `left:${rect.left+rect.width/2-20}px;top:${rect.top+10}px;font-size:${type==='miss'?13:22}px;`;
    document.body.appendChild(pop);
    setTimeout(()=>pop.remove(), 1200);
  }

  // ============================================================
  // 詳細ポップアップ
  // ============================================================

  // NEXTタップ→攻撃詳細
  window.showNextDetail = function () {
    if (locked) return;
    const act = peekNextAction();
    const patFn = PATTERN_GRID[act.type];
    const pat = patFn ? patFn() : null;

    let popup = document.getElementById('bt-next-detail-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'bt-next-detail-popup';
      popup.className = 'bt-detail-popup';
      popup.innerHTML = `<div class="bt-detail-box" id="bt-next-detail-box"></div>`;
      popup.onclick = e => { if(e.target===popup) closeNextDetail(); };
      document.body.appendChild(popup);
    }

    const ROWS = ['near','mid','far'];
    const COLS = ['left','center','right'];
    const cells = ROWS.map(row =>
      COLS.map(col => {
        let d = false;
        if (pat==='all') d=true;
        else if (pat==='cross') d=(row==='mid'||col==='center');
        else if (pat==='xcross') d=(row!=='mid'&&col!=='center');
        else if (pat&&pat.rows&&pat.cols) d=pat.rows.includes(row)&&pat.cols.includes(col);
        return `<div class="bt-range-cell ${d?'danger':'safe'}"></div>`;
      }).join('')
    ).join('');

    const rangeSection = pat !== null ? `
      <div class="bt-detail-range-title">— 攻撃範囲 —</div>
      <div class="bt-range-grid">${cells}</div>
    ` : `<div class="bt-detail-type" style="margin-bottom:12px">対象：ランダム1体</div>`;

    document.getElementById('bt-next-detail-box').innerHTML = `
      <div class="bt-detail-title">${act.action}</div>
      <div class="bt-detail-type">怪異の行動</div>
      ${rangeSection}
      <div class="bt-detail-desc">${act.desc || '詳細情報なし'}</div>
      <button class="bt-detail-close" onclick="closeNextDetail()">閉じる</button>
    `;

    requestAnimationFrame(() => popup.classList.add('active'));
  };

  window.closeNextDetail = function () {
    const p = document.getElementById('bt-next-detail-popup');
    if (p) { p.classList.remove('active'); }
  };

  // スキル長押し→詳細
  function showSkillDetail(sk) {
    let popup = document.getElementById('bt-skill-detail-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'bt-skill-detail-popup';
      popup.className = 'bt-detail-popup';
      popup.innerHTML = `<div class="bt-detail-box" id="bt-skill-detail-box"></div>`;
      popup.onclick = e => { if(e.target===popup) closeSkillDetail(); };
      document.body.appendChild(popup);
    }

    const typeLabel = {attack:'攻撃スキル', debuff:'妨害スキル', buff:'補助スキル', move:'移動スキル', special:'特殊スキル'};

    document.getElementById('bt-skill-detail-box').innerHTML = `
      <div class="bt-detail-title">${sk.name}</div>
      <div class="bt-detail-type">${typeLabel[sk.type]||'スキル'}</div>
      <div class="bt-detail-desc">${sk.desc||'詳細情報なし'}</div>
      <div class="bt-detail-grid">
        <div class="bt-detail-stat">
          <div class="bt-detail-stat-label">命中率</div>
          <div class="bt-detail-stat-val">${sk.hit<100?sk.hit+'%':'確定'}</div>
        </div>
        <div class="bt-detail-stat">
          <div class="bt-detail-stat-label">クールダウン</div>
          <div class="bt-detail-stat-val">${sk.cdMax}ターン</div>
        </div>
      </div>
      <button class="bt-detail-close" onclick="closeSkillDetail()">閉じる</button>
    `;

    requestAnimationFrame(() => popup.classList.add('active'));
  }

  window.closeSkillDetail = function () {
    const p = document.getElementById('bt-skill-detail-popup');
    if (p) p.classList.remove('active');
  };

  // ============================================================
  // 怪異行動パターン
  // ============================================================
  function peekNextAction() {
    const pat = bs.enemy.actionPattern;
    return pat[bs.enemy.actionIdx % pat.length];
  }
  function consumeAction() {
    const act = peekNextAction();
    bs.enemy.actionIdx++;
    return act;
  }

  // ============================================================
  // ターン進行
  // ============================================================
  function advanceTurnIndex() {
    bs.turnOrder = calcTurnOrder(bs.party, bs.enemy);
    bs.actingIdx = 0;
    renderOrder();
    renderField();

    const acting = bs.turnOrder[0];
    if (acting.isEnemy) {
      doEnemyTurn();
    } else {
      renderSkills(bs.party.find(c=>c.id===acting.id));
      addLog(acting.name + ' の番');
    }
  }

  function nextUnitInTurn() {
    bs.actingIdx++;
    if (bs.actingIdx >= bs.turnOrder.length) {
      bs.turn++;
      bs.party.forEach(c => c.skills.forEach(sk=>{ if(sk.cd>0) sk.cd--; }));
      addLog('— ターン ' + bs.turn + ' —');
      setTimeout(advanceTurnIndex, 500);
      return;
    }
    renderOrder();
    renderField();
    const acting = bs.turnOrder[bs.actingIdx];
    if (acting.isEnemy) {
      doEnemyTurn();
    } else {
      renderSkills(bs.party.find(c=>c.id===acting.id));
      addLog(acting.name + ' の番');
    }
  }

  // ============================================================
  // 敵ターン
  // ============================================================
  function doEnemyTurn() {
    locked = true;
    document.getElementById('bt-skill-area').style.display = 'none';

    let overlay = document.getElementById('bt-enemy-turn-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'bt-enemy-turn-overlay';
      overlay.innerHTML = '<div class="bt-enemy-turn-txt">ENEMY TURN</div>';
      document.body.appendChild(overlay);
    }
    overlay.classList.add('active');

    setTimeout(() => {
      overlay.classList.remove('active');
      const act = consumeAction();
      addLog('怪異：' + act.action);

      if (bs.party.filter(c=>c.hp>0).length === 0) { onBattleEnd(false); return; }

      const patFn = ATTACK_PATTERNS[act.type] || ATTACK_PATTERNS['atk_single'];
      const targets = patFn(bs.party);

      if (targets.length > 0) {
        let delay = 0;
        targets.forEach(target => {
          setTimeout(() => {
            const dmg = calcEnemyDamage(bs.enemy, target);
            target.hp = Math.max(0, target.hp - dmg);
            renderField();
            const cell = document.getElementById('bt-cell-'+(target.row||target.pos||'near')+'-'+(target.col||'left'));
            showDmgPop(cell, dmg, 'dmg');
          }, delay);
          delay += 220;
        });
        setTimeout(() => {
          checkPartyDead();
          locked = false;
          renderEnemy(); // NEXTを更新
          setTimeout(nextUnitInTurn, 350);
        }, delay + 280);
      } else {
        setTimeout(() => { locked = false; renderEnemy(); setTimeout(nextUnitInTurn, 350); }, 700);
      }
    }, 1400);
  }

  // ============================================================
  // プレイヤー操作
  // ============================================================
  function onCharaTap(id) {
    if (locked) return;
    const acting = bs.turnOrder[bs.actingIdx];
    if (acting && !acting.isEnemy && acting.id === id) {
      renderSkills(bs.party.find(c=>c.id===id));
    }
  }

  function onSkillTap(chara, skill) {
    if (locked) return;
    locked = true;
    skill.cd = skill.cdMax;

    if (skill.type === 'attack') {
      const hit = hitCheck(skill.hit, chara.accuracy);
      if (!hit) {
        addLog(chara.name + ' の「' + skill.name + '」は外れた');
        const area = document.getElementById('bt-enemy-area');
        showDmgPop(area, 0, 'miss');
        locked = false;
        setTimeout(nextUnitInTurn, 700);
        return;
      }
      const dmg = calcDamage(chara.atk, bs.enemy.def, bs.enemy, skill.multiplier || 1.0);
      bs.enemy.hp = Math.max(0, bs.enemy.hp - dmg);
      addLog(chara.name + '「' + skill.name + '」→ ' + dmg + ' ダメージ');
      const area = document.getElementById('bt-enemy-area');
      showDmgPop(area, dmg, 'dmg');
      renderEnemy();
      if (bs.enemy.hp <= 0) { setTimeout(()=>onBattleEnd(true), 600); return; }

    } else if (skill.type === 'debuff') {
      const st = (skill.name==='実体化'||skill.name==='繋ぎ手') ? '実体化' : '縛り';
      if (!bs.enemy.status.includes(st)) {
        bs.enemy.status.push(st);
        addLog(skill.name + ' → 「' + st + '」付与');
      } else {
        addLog(skill.name + ' → すでに' + st + '状態');
      }
      renderEnemy();
    } else {
      addLog(chara.name + '「' + skill.name + '」を使用');
    }

    locked = false;
    setTimeout(nextUnitInTurn, 550);
  }

  // 移動モード状態
  let moveMode = false;
  let movingCharaId = null;

  window.battleMoveMode = function () {
    if (locked) return;
    const acting = bs.turnOrder[bs.actingIdx];
    if (!acting || acting.isEnemy) return;

    if (moveMode) {
      // 移動モードキャンセル
      cancelMoveMode();
      return;
    }

    moveMode = true;
    movingCharaId = acting.id;

    // スキルエリアをキャンセルボタンに切り替え
    const cards = document.getElementById('bt-skill-cards');
    const hint  = document.querySelector('.bt-skill-hint');
    if (cards) cards.innerHTML = '<div class="bt-move-cancel" onclick="battleMoveMode()">タップでキャンセル</div>';
    if (hint)  hint.style.display = 'none';

    const btn = document.getElementById('bt-btn-move');
    if (btn) btn.classList.add('move-active');

    renderFieldMoveMode();
    addLog('移動先のマスを選んでください');
  };

  function cancelMoveMode() {
    moveMode = false;
    movingCharaId = null;
    const btn = document.getElementById('bt-btn-move');
    if (btn) btn.classList.remove('move-active');
    const hint = document.querySelector('.bt-skill-hint');
    if (hint) hint.style.display = '';
    renderField();
    const acting = bs.turnOrder[bs.actingIdx];
    if (acting && !acting.isEnemy) {
      renderSkills(bs.party.find(c => c.id === acting.id));
    }
    addLog('移動キャンセル');
  }

  function renderFieldMoveMode() {
    const ROWS = ['near','mid','far'];
    const COLS = ['left','center','right'];

    // 全セルをクリア
    ROWS.forEach(row => COLS.forEach(col => {
      const cell = document.getElementById('bt-cell-'+row+'-'+col);
      if (cell) { cell.innerHTML = ''; cell.className = 'bt-field-cell'; cell.onclick = null; }
    }));

    // 占有マスを収集
    const occupied = new Set(bs.party.filter(c=>c.hp>0).map(c=>(c.row||c.pos)+'-'+(c.col||'left')));
    // 移動するキャラ自身のマスは除外
    const mover = bs.party.find(c=>c.id===movingCharaId);
    if (mover) occupied.delete((mover.row||mover.pos)+'-'+(mover.col||'left'));

    ROWS.forEach(row => {
      COLS.forEach(col => {
        const cell = document.getElementById('bt-cell-'+row+'-'+col);
        if (!cell) return;

        const key = row+'-'+col;
        const isMoverCell = mover && (mover.row||mover.pos)===row && (mover.col||'left')===col;
        const isOccupied  = occupied.has(key);

        if (!isOccupied && !isMoverCell) {
          // 移動可能マス
          cell.className = 'bt-field-cell movable';
          cell.onclick = () => executeMove(row, col);
        } else {
          // 移動不可（現在地 or 他キャラ）
          cell.className = 'bt-field-cell';
          cell.onclick = null;
        }
      });
    });

    // キャラ画像はそのまま表示
    if (mover) {
      const moverCell = document.getElementById('bt-cell-'+(mover.row||mover.pos)+'-'+(mover.col||'left'));
      if (moverCell) {
        const hpRate = (mover.hp / mover.hpMax * 100);
        const card = document.createElement('div');
        card.className = 'bt-chara-card is-acting';
        card.innerHTML = `
          <img class="bt-chara-img" src="${mover.img}" onerror="this.style.opacity='0'">
          <div class="bt-chara-name">${mover.name}</div>
          <div class="bt-chara-hp-bar"><div class="bt-chara-hp-fill" style="width:${hpRate}%"></div></div>
          <div class="bt-chara-hp-num">${mover.hp}</div>
        `;
        moverCell.appendChild(card);
      }
    }

    // 他のキャラも表示
    bs.party.filter(c=>c.hp>0 && c.id!==movingCharaId).forEach(c => {
      const cell = document.getElementById('bt-cell-'+(c.row||c.pos)+'-'+(c.col||'left'));
      if (!cell) return;
      const hpRate = (c.hp / c.hpMax * 100);
      const card = document.createElement('div');
      card.className = 'bt-chara-card';
      card.innerHTML = `
        <img class="bt-chara-img" src="${c.img}" onerror="this.style.opacity='0'">
        <div class="bt-chara-name">${c.name}</div>
        <div class="bt-chara-hp-bar"><div class="bt-chara-hp-fill" style="width:${hpRate}%"></div></div>
        <div class="bt-chara-hp-num">${c.hp}</div>
      `;
      cell.appendChild(card);
    });
  }

  function executeMove(toRow, toCol) {
    if (!moveMode || !movingCharaId) return;

    const mover = bs.party.find(c => c.id === movingCharaId);
    if (!mover) return;

    const fromRow = mover.row || mover.pos || 'near';
    const fromCol = mover.col || 'left';

    mover.row = toRow;
    mover.col = toCol;
    mover.pos = toRow; // 互換

    addLog(mover.name + ' が ' + ({near:'近',mid:'中',far:'遠'}[fromRow]) + ({left:'左',center:'中',right:'右'}[fromCol]) + ' → ' + ({near:'近',mid:'中',far:'遠'}[toRow]) + ({left:'左',center:'中',right:'右'}[toCol]) + ' へ移動');

    moveMode = false;
    movingCharaId = null;

    const btn = document.getElementById('bt-btn-move');
    if (btn) btn.classList.remove('move-active');
    const hint = document.querySelector('.bt-skill-hint');
    if (hint) hint.style.display = '';

    // 移動はそのターンの行動終了
    renderField();
    setTimeout(nextUnitInTurn, 400);
  }

  function checkPartyDead() {
    if (bs.party.filter(c=>c.hp>0).length === 0) onBattleEnd(false);
  }

  function onBattleEnd(win) {
    locked = true;
    document.getElementById('bt-skill-area').style.display = 'none';

    let banner = document.getElementById('bt-result-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'bt-result-banner';
      banner.innerHTML = `
        <div class="bt-result-txt ${win?'win':'lose'}">${win?'VICTORY':'DEFEAT'}</div>
        <button class="bt-result-btn" onclick="closeBattle()">${win?'祀りへ進む':'撤退する'}</button>
      `;
      document.body.appendChild(banner);
    } else {
      banner.querySelector('.bt-result-txt').textContent = win?'VICTORY':'DEFEAT';
      banner.querySelector('.bt-result-txt').className = 'bt-result-txt '+(win?'win':'lose');
      banner.querySelector('.bt-result-btn').textContent = win?'祀りへ進む':'撤退する';
    }
    addLog(win ? '怪異を祓った——' : '敗北…');
    setTimeout(() => banner.classList.add('active'), 400);
  }

  // ============================================================
  // 起動・終了
  // ============================================================
  function startBattle(party, enemy) {
    bs = {
      party: JSON.parse(JSON.stringify(party || DUMMY_PARTY)),
      enemy: JSON.parse(JSON.stringify(enemy || DUMMY_ENEMY)),
      turn: 1, actingIdx: 0,
    };
    bs.turnOrder = calcTurnOrder(bs.party, bs.enemy);
    locked = false;

    const el = buildBattleScreen();
    el.style.display = 'flex';
    void el.offsetWidth;
    el.style.opacity = '1';

    const banner = document.getElementById('bt-result-banner');
    if (banner) banner.classList.remove('active');
    closeNextDetail();
    closeSkillDetail();

    renderEnemy();
    renderOrder();
    renderField();

    const first = bs.turnOrder[0];
    if (first.isEnemy) {
      doEnemyTurn();
    } else {
      renderSkills(bs.party.find(c=>c.id===first.id));
      addLog('戦闘開始 — ' + first.name + ' の番');
    }
  }

  function closeBattle() {
    const el = document.getElementById('battle-root');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; locked = false; }, 600);
  }

  window.startBattle = startBattle;
  window.closeBattle = closeBattle;

})();
