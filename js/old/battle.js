// battle.js v3
// 上下2グリッド構成・range判定ベースバトルシステム

(function () {

  // ============================================================
  // 定数
  // ============================================================
  const ROWS = ['near', 'mid', 'far'];
  const COLS = ['left', 'center', 'right'];
  const ROW_IDX = { near: 0, mid: 1, far: 2 };
  const COL_IDX = { left: 0, center: 1, right: 2 };
  const ROW_BY_IDX = ['near', 'mid', 'far'];
  const COL_BY_IDX = ['left', 'center', 'right'];

  // ============================================================
  // 範囲パターン定義
  // 引数: user={ row, col }（使用者）, grid=対象グリッドのユニット配列
  // 戻り値: ヒットするマスのSet('row-col'形式) or null（全体）
  // ============================================================
  const RANGE_PATTERNS = {
    // ── 敵エリア対象 ──────────────────────────────────────────
    single:      (user) => null,  // 選択式（別途処理）
    random1:     (user, grid) => {
      const alive = grid.filter(u => u.hp > 0);
      if (!alive.length) return new Set();
      const t = alive[Math.floor(Math.random() * alive.length)];
      return new Set([t.row + '-' + t.col]);
    },
    all:         () => _allCells(),
    row_near:    () => _row('near'),
    row_mid:     () => _row('mid'),
    row_far:     () => _row('far'),
    row2_near:   () => _rows(['near','mid']),
    row2_far:    () => _rows(['mid','far']),
    col_left:    () => _col('left'),
    col_center:  () => _col('center'),
    col_right:   () => _col('right'),
    col2_left:   () => _cols(['left','center']),
    col2_right:  () => _cols(['center','right']),
    cross:       () => { const s=_row('mid'); _col('center').forEach(v=>s.add(v)); return s; },
    xcross:      () => { const all=_allCells(); _row('mid').forEach(v=>all.delete(v)); _col('center').forEach(v=>all.delete(v)); return all; },
    corner:      () => new Set(['near-left','near-right','far-left','far-right']),
    donut:       () => { const s=_allCells(); s.delete('mid-center'); return s; },
    center1:     () => new Set(['mid-center']),
    front1:      () => new Set(['near-center']),
    front3:      () => _row('near'),
    pierce2:     () => new Set(['near-center','mid-center']),
    pierce3:     () => _col('center'),

    // ── 自エリア対象 ──────────────────────────────────────────
    ally_single:      (user) => null,  // 選択式
    ally_all:         () => _allCells(),
    ally_row_near:    () => _row('near'),
    ally_row_mid:     () => _row('mid'),
    ally_row_far:     () => _row('far'),
    ally_col_left:    () => _col('left'),
    ally_col_center:  () => _col('center'),
    ally_col_right:   () => _col('right'),
    ally_cross:       () => { const s=_row('mid'); _col('center').forEach(v=>s.add(v)); return s; },
    ally_self:        (user) => new Set([user.row+'-'+user.col]),
    ally_adjacent:    (user) => _adjacent(user),
    ally_except_self: (user) => { const s=_allCells(); s.delete(user.row+'-'+user.col); return s; },

    // ── 相対位置系 ──────────────────────────────────────────
    rel_front:  (user) => _relCell(user, -1, 0),
    rel_back:   (user) => _relCell(user,  1, 0),
    rel_left:   (user) => _relCell(user,  0,-1),
    rel_right:  (user) => _relCell(user,  0, 1),

    // ── 特殊 ──────────────────────────────────────────────
    self:       (user) => new Set([user.row+'-'+user.col]),
  };

  // 範囲パターンが味方エリアを対象とするか
  const ALLY_RANGES = new Set([
    'ally_single','ally_all','ally_row_near','ally_row_mid','ally_row_far',
    'ally_col_left','ally_col_center','ally_col_right','ally_cross',
    'ally_self','ally_adjacent','ally_except_self','self',
  ]);

  // ── 範囲計算ヘルパー ────────────────────────────────────────
  function _allCells() {
    const s = new Set();
    ROWS.forEach(r => COLS.forEach(c => s.add(r+'-'+c)));
    return s;
  }
  function _row(row) {
    return new Set(COLS.map(c => row+'-'+c));
  }
  function _rows(rows) {
    const s = new Set();
    rows.forEach(r => COLS.forEach(c => s.add(r+'-'+c)));
    return s;
  }
  function _col(col) {
    return new Set(ROWS.map(r => r+'-'+col));
  }
  function _cols(cols) {
    const s = new Set();
    ROWS.forEach(r => cols.forEach(c => s.add(r+'-'+c)));
    return s;
  }
  function _adjacent(user) {
    const s = new Set();
    const ri = ROW_IDX[user.row];
    const ci = COL_IDX[user.col];
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
      const nr = ROW_BY_IDX[ri+dr];
      const nc = COL_BY_IDX[ci+dc];
      if (nr && nc) s.add(nr+'-'+nc);
    });
    return s;
  }
  function _relCell(user, dr, dc) {
    const ri = ROW_IDX[user.row] + dr;
    const ci = COL_IDX[user.col] + dc;
    const nr = ROW_BY_IDX[ri];
    const nc = COL_BY_IDX[ci];
    return (nr && nc) ? new Set([nr+'-'+nc]) : new Set();
  }

  // 範囲パターンからヒットするユニットを取得
  function getTargets(rangeId, user, targetGrid) {
    const fn = RANGE_PATTERNS[rangeId];
    if (!fn) return [];
    const cells = fn(user, targetGrid);
    if (cells === null) return targetGrid.filter(u => u.hp > 0); // 全体
    return targetGrid.filter(u => u.hp > 0 && cells.has(u.row+'-'+u.col));
  }

  // ============================================================
  // 仮データ
  // ============================================================
  const DUMMY_PARTY = [
    { id:'chara_14', name:'アイム',  img:'images/chara_14_battle.webp',
      hp:740, hpMax:740, atk:280, def:210, spd:310, accuracy:290,
      row:'near', col:'center',
      skills:[
        { id:'s1', name:'縛鎖',  cd:0, cdMax:1, hit:85,  type:'debuff', range:'col_center', multiplier:1.0, desc:'怪異に「縛り」を付与する。' },
        { id:'s2', name:'実体化',cd:0, cdMax:1, hit:100, type:'debuff', range:'front1',     multiplier:1.0, desc:'怪異に「実体化」を付与する。' },
        { id:'s3', name:'灼打',  cd:0, cdMax:1, hit:90,  type:'attack', range:'front1',     multiplier:3.0, desc:'炎を纏った強烈な一撃。ATKの3倍のダメージ。' },
        { id:'s4', name:'加速',  cd:0, cdMax:1, hit:100, type:'buff',   range:'ally_self',  multiplier:1.0, desc:'自身のSPDを上昇させる。' },
        { id:'s5', name:'祓撃',  cd:0, cdMax:1, hit:65,  type:'attack', range:'pierce3',    multiplier:8.0, desc:'祓いの力を解放した超火力スキル。' },
      ]},
    { id:'chara_16', name:'アズキ', img:'images/chara_16_battle.webp',
      hp:950, hpMax:950, atk:255, def:325, spd:255, accuracy:260,
      row:'mid', col:'center',
      skills:[
        { id:'s1', name:'霧縛',  cd:0, cdMax:1, hit:85,  type:'debuff', range:'front3',    multiplier:1.0, desc:'霧を纏わせ怪異を縛る。' },
        { id:'s2', name:'結界',  cd:0, cdMax:1, hit:100, type:'buff',   range:'ally_all',  multiplier:1.0, desc:'強固な結界を展開する。' },
        { id:'s3', name:'繋ぎ手',cd:0, cdMax:1, hit:100, type:'debuff', range:'front1',    multiplier:1.0, desc:'怪異を現実に繋ぎ止める。「実体化」付与。' },
        { id:'s4', name:'散霧',  cd:0, cdMax:1, hit:75,  type:'attack', range:'row_near',  multiplier:2.0, desc:'霧を爆発させて攻撃する。' },
        { id:'s5', name:'霧歩き',cd:0, cdMax:1, hit:100, type:'move',   range:'ally_self', multiplier:1.0, desc:'霧に紛れて移動する。' },
      ]},
    { id:'chara_17', name:'ベン',   img:'images/chara_17_battle.webp',
      hp:800, hpMax:800, atk:255, def:250, spd:260, accuracy:270,
      row:'far', col:'center',
      skills:[
        { id:'s1', name:'模写',  cd:0, cdMax:1, hit:100, type:'special', range:'ally_self', multiplier:1.0, desc:'他の紡ぎ手のスキルを模倣する。' },
        { id:'s2', name:'道化撃',cd:0, cdMax:1, hit:90,  type:'attack',  range:'front1',    multiplier:2.0, desc:'道化師の動きで攻撃する。' },
        { id:'s3', name:'仮面',  cd:0, cdMax:1, hit:100, type:'buff',    range:'ally_self', multiplier:1.0, desc:'状態異常を無効化する。' },
        { id:'s4', name:'乱射',  cd:0, cdMax:1, hit:55,  type:'attack',  range:'all',       multiplier:6.0, desc:'全範囲に乱れ打つ。ATKの6倍の高火力。' },
        { id:'s5', name:'転換',  cd:0, cdMax:1, hit:100, type:'move',    range:'ally_self', multiplier:1.0, desc:'ポジションを変更する。' },
      ]},
  ];

  const DUMMY_ENEMY = {
    id:'enemy_01', name:'??????',
    upImg:'images/enemy_01_battle.webp',
    hp:2000, hpMax:2000,
    atk:375, def:280, spd:260,
    row:'near', col:'center',  // 怪異のグリッド上の位置
    phase:1, status:[],
    actionPattern:[
      { turn:1, action:'全体攻撃',   type:'atk_all',    range:'all',       desc:'全員に攻撃を行う。' },
      { turn:2, action:'単体攻撃',   type:'atk_single', range:'random1',   desc:'ランダムな1人に攻撃する。' },
      { turn:3, action:'中縦列攻撃', type:'atk_center', range:'col_center',desc:'中央縦列を攻撃する。' },
      { turn:4, action:'十字攻撃',   type:'atk_cross',  range:'cross',     desc:'十字形の範囲を攻撃する。' },
    ],
    actionIdx:0,
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
      <!-- ヘッダー：HP・状態 -->
      <div class="bt-header" id="bt-header">
        <div class="bt-enemy-status-row" id="bt-enemy-status-row"></div>
        <div class="bt-enemy-hp-wrap">
          <div class="bt-enemy-hp-bar">
            <div class="bt-enemy-hp-fill" id="bt-enemy-hp-fill"></div>
            <div class="bt-enemy-hp-phase"></div>
          </div>
          <div class="bt-enemy-hp-txt" id="bt-enemy-hp-txt"></div>
        </div>
        <div class="bt-next-wrap" id="bt-next-wrap" onclick="showNextDetail()">
          <span class="bt-next-label">NEXT</span>
          <span class="bt-next-val" id="bt-next-val">—</span>
          <span class="bt-next-hint">▸</span>
        </div>
      </div>

      <!-- 行動順トグル -->
      <div class="bt-order-toggle" id="bt-order-toggle" onclick="toggleOrderBar()">
        <span class="bt-order-toggle-label">— 行動順 —</span>
        <span class="bt-order-toggle-arrow">▾</span>
      </div>
      <div class="bt-order-wrap" id="bt-order-wrap">
        <div class="bt-order-list" id="bt-order-list"></div>
      </div>

      <!-- メインフィールド：上下2グリッド -->
      <div class="bt-main-field">

        <!-- 怪異グリッド（上） -->
        <div class="bt-grid-wrap bt-grid-enemy">
          <div class="bt-grid-col-labels">
            <div class="bt-grid-spacer"></div>
            <div class="bt-grid-col-label">左</div>
            <div class="bt-grid-col-label">中</div>
            <div class="bt-grid-col-label">右</div>
          </div>
          ${ROWS.map(row => `
            <div class="bt-grid-row">
              <div class="bt-grid-row-label">${{near:'近',mid:'中',far:'遠'}[row]}</div>
              ${COLS.map(col => `
                <div class="bt-grid-cell" id="bt-eg-${row}-${col}"></div>
              `).join('')}
            </div>
          `).join('')}
        </div>

        <!-- 区切り線 -->
        <div class="bt-field-divider"></div>

        <!-- 味方グリッド（下） -->
        <div class="bt-grid-wrap bt-grid-ally">
          <div class="bt-grid-col-labels">
            <div class="bt-grid-spacer"></div>
            <div class="bt-grid-col-label">左</div>
            <div class="bt-grid-col-label">中</div>
            <div class="bt-grid-col-label">右</div>
          </div>
          ${ROWS.map(row => `
            <div class="bt-grid-row">
              <div class="bt-grid-row-label">${{near:'近',mid:'中',far:'遠'}[row]}</div>
              ${COLS.map(col => `
                <div class="bt-grid-cell" id="bt-ag-${row}-${col}"></div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- スキルエリア -->
      <!-- 行動選択ボタン -->
      <div class="bt-action-toggle" id="bt-action-toggle" onclick="toggleSkillArea()">
        <span class="bt-action-toggle-label" id="bt-action-toggle-label">行動選択</span>
        <span class="bt-action-toggle-arrow" id="bt-action-toggle-arrow">▾</span>
      </div>

      <!-- スキル＋移動エリア -->
      <div class="bt-skill-area" id="bt-skill-area">
        <div class="bt-skill-cards" id="bt-skill-cards"></div>
        <div class="bt-execute-bar" id="bt-execute-bar">
          <div class="bt-execute-selected" id="bt-execute-selected">スキルを選択してください</div>
          <button class="bt-cancel-btn" onclick="cancelSkillSelect()">取消</button>
          <button class="bt-execute-btn" id="bt-execute-btn" onclick="executeSelectedSkill()">発動</button>
        </div>
        <div class="bt-skill-hint" id="bt-skill-hint">長押しで詳細を確認</div>
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
      /* ヘッダー */
      .bt-header {
        flex-shrink:0; padding:max(10px,env(safe-area-inset-top,10px)) 14px 8px;
        background:linear-gradient(to bottom,rgba(0,0,0,.7),rgba(0,0,0,.3));
        border-bottom:1px solid rgba(255,255,255,.05);
      }
      .bt-enemy-status-row { display:flex; gap:5px; margin-bottom:4px; min-height:16px; }
      .bt-status-badge { font-size:8px; letter-spacing:1px; padding:2px 7px; border-radius:3px; border:1px solid; font-family:"Cinzel",serif; }
      .bt-status-jittai  { color:#a8e6cf; border-color:rgba(168,230,207,.5); background:rgba(168,230,207,.1); }
      .bt-status-shibari { color:#ffd3a8; border-color:rgba(255,211,168,.5); background:rgba(255,211,168,.1); }
      .bt-enemy-hp-wrap { display:flex; align-items:center; gap:8px; margin-bottom:5px; }
      .bt-enemy-hp-bar { flex:1; height:5px; background:rgba(255,255,255,.1); border-radius:3px; overflow:hidden; position:relative; }
      .bt-enemy-hp-fill { height:100%; background:linear-gradient(90deg,#7a1515,#c02828); border-radius:3px; transition:width .6s ease; }
      .bt-enemy-hp-phase { position:absolute; top:0; bottom:0; width:1px; background:rgba(255,255,255,.3); left:50%; }
      .bt-enemy-hp-txt { font-family:"Cinzel",serif; font-size:10px; color:rgba(232,228,220,.5); white-space:nowrap; min-width:80px; text-align:right; }
      .bt-next-wrap { display:inline-flex; align-items:center; gap:6px; cursor:pointer; -webkit-tap-highlight-color:transparent; }
      .bt-next-label { font-family:"Cinzel",serif; font-size:8px; letter-spacing:3px; color:rgba(232,228,220,.35); }
      .bt-next-val { font-size:12px; color:#d4a84b; letter-spacing:1px; }
      .bt-next-hint { font-size:10px; color:rgba(212,168,75,.5); }

      /* 行動順（折りたたみ） */
      .bt-order-wrap {
        flex-shrink:0; overflow:hidden;
        max-height:0; transition:max-height .3s ease, padding .3s ease;
        border-bottom:none; padding:0 12px;
      }
      .bt-order-wrap.open {
        max-height:60px; padding:4px 12px 3px;
        border-bottom:1px solid rgba(255,255,255,.04);
      }
      .bt-order-list { display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; }
      .bt-order-list::-webkit-scrollbar { display:none; }
      .bt-order-chip { flex-shrink:0; display:flex; flex-direction:column; align-items:center; gap:1px; padding:3px 8px; border-radius:5px; border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.03); min-width:40px; transition:all .2s; }
      .bt-order-chip.is-active  { border-color:rgba(232,228,220,.45); background:rgba(232,228,220,.09); }
      .bt-order-chip.is-enemy   { border-color:rgba(180,40,40,.4);    background:rgba(180,40,40,.07); }
      .bt-order-chip.is-enemy.is-active { border-color:rgba(200,50,50,.8); background:rgba(200,50,50,.16); }
      .bt-order-chip-name { font-size:9px; color:rgba(232,228,220,.65); white-space:nowrap; }
      .bt-order-chip-spd  { font-family:"Cinzel",serif; font-size:9px; color:rgba(232,228,220,.35); }
      /* 行動順トグルボタン */
      .bt-order-toggle {
        flex-shrink:0; display:flex; align-items:center; justify-content:center;
        gap:4px; padding:3px 12px; cursor:pointer;
        -webkit-tap-highlight-color:transparent;
        border-bottom:1px solid rgba(255,255,255,.04);
      }
      .bt-order-toggle-label { font-family:"Cinzel",serif; font-size:8px; letter-spacing:2px; color:rgba(232,228,220,.25); }
      .bt-order-toggle-arrow { font-size:8px; color:rgba(232,228,220,.25); transition:transform .3s; }
      .bt-order-toggle.open .bt-order-toggle-arrow { transform:rotate(180deg); }

      /* メインフィールド */
      .bt-main-field { display:flex; flex-direction:column; flex:1; min-height:0; padding:4px 8px; gap:0; }

      /* グリッド共通 */
      .bt-grid-wrap { display:flex; flex-direction:column; flex:1; min-height:0; gap:2px; border-radius:0; padding:4px; background:transparent; border:none; box-shadow:none; }

      /* 怪異グリッド */
      .bt-grid-enemy { flex-direction:column-reverse; }
      .bt-grid-enemy .bt-grid-col-labels { order:99; }

      /* 味方グリッド */
      .bt-grid-ally { }

      .bt-grid-col-labels { display:flex; align-items:center; }
      .bt-grid-spacer { width:16px; flex-shrink:0; }
      .bt-grid-col-label { flex:1; text-align:center; font-family:"Cinzel",serif; font-size:7px; letter-spacing:2px; color:rgba(232,228,220,.2); }
      .bt-grid-row { display:flex; align-items:stretch; gap:2px; flex:1; min-height:0; }
      .bt-grid-row-label { width:16px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-family:"Cinzel",serif; font-size:8px; color:rgba(232,228,220,.2); }

      /* 全セル共通：白細枠 */
      .bt-grid-enemy .bt-grid-cell,
      .bt-grid-ally .bt-grid-cell {
        border:1px solid rgba(255,255,255,.12);
        background:rgba(0,0,0,.55);
        box-shadow:none;
      }
      .bt-grid-cell {
        flex:1; border-radius:0; overflow:hidden; position:relative;
        display:block;
        transition:border-color .2s, box-shadow .2s, background .2s;
        border:none !important; /* borderを擬似要素に移管 */
      }
      /* フレームを画像の上にオーバーレイ */
      .bt-grid-cell::after {
        content:''; position:absolute; inset:0; z-index:10;
        border:1px solid rgba(255,255,255,.12);
        pointer-events:none;
        transition:border-color .2s, box-shadow .2s;
      }
      .bt-grid-enemy .bt-grid-cell::after { border-color:rgba(255,255,255,.12); }
      .bt-grid-ally  .bt-grid-cell::after { border-color:rgba(255,255,255,.12); }
      .bt-grid-cell.danger::after {
        border-color:rgba(220,50,50,.85) !important;
        box-shadow:0 0 10px rgba(200,40,40,.5), 0 0 20px rgba(180,30,30,.3), inset 0 0 8px rgba(180,30,30,.2);
        animation:dangerPulse .9s ease-in-out infinite;
      }
      .bt-grid-cell.highlight::after {
        border-color:rgba(160,220,100,.9) !important;
        box-shadow:inset 0 0 0 1px rgba(150,210,90,.3), 0 0 8px rgba(130,200,80,.5);
        animation:highlightPulse .9s ease-in-out infinite;
      }
      .bt-grid-cell.movable::after {
        border-color:rgba(80,160,255,.9) !important;
        box-shadow:inset 0 0 0 1px rgba(70,150,240,.3), 0 0 8px rgba(60,130,220,.5);
        animation:movePulse .9s ease-in-out infinite;
      }
      .bt-grid-cell.skill-range::after {
        border-color:rgba(220,180,60,.9) !important;
        box-shadow:0 0 10px rgba(200,160,40,.5), 0 0 20px rgba(180,140,30,.3);
        animation:skillRangePulse .9s ease-in-out infinite;
      }

      /* 味方HPバーエリア */
      .bt-ally-hp-bar-area {
        flex-shrink:0; display:flex; gap:6px; padding:5px 14px 4px;
        border-top:1px solid rgba(255,255,255,.05);
        background:rgba(0,0,0,.4);
      }
      .bt-ally-hp-entry {
        flex:1; display:flex; flex-direction:column; gap:2px; align-items:center;
      }
      .bt-ally-hp-entry-name {
        font-size:7px; letter-spacing:0.5px; color:rgba(232,228,220,.5);
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;
      }
      .bt-ally-hp-entry-bar {
        width:100%; height:4px; background:rgba(255,255,255,.08); border-radius:2px; overflow:hidden;
      }
      .bt-ally-hp-entry-fill {
        height:100%; background:linear-gradient(90deg,#2e7d4f,#5bc47a);
        border-radius:2px; transition:width .4s ease;
      }
      .bt-ally-hp-entry-fill.low  { background:linear-gradient(90deg,#7a4010,#cc6020); }
      .bt-ally-hp-entry-fill.crit { background:linear-gradient(90deg,#7a1515,#c02828); }
      .bt-ally-hp-entry-num {
        font-family:"Cinzel",serif; font-size:8px; color:rgba(232,228,220,.7);
      }

      /* 区切り線 */
      .bt-field-divider { flex-shrink:0; height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent); margin:3px 0; }

      /* セル状態：危険（赤グロー枠のみ） */
      .bt-grid-cell.danger {
        border-color:rgba(220,50,50,.85) !important;
        background:rgba(0,0,0,.55) !important;
        box-shadow:0 0 10px rgba(200,40,40,.5), 0 0 20px rgba(180,30,30,.3), inset 0 0 8px rgba(180,30,30,.2) !important;
        animation:dangerPulse .9s ease-in-out infinite;
      }
      /* セル状態：ハイライト（緑グロー枠） */
      .bt-grid-cell.highlight {
        border-color:rgba(160,220,100,.9) !important;
        background:rgba(0,10,0,.7) !important;
        box-shadow:inset 0 0 0 1px rgba(150,210,90,.3), 0 0 8px rgba(130,200,80,.5), inset 0 0 12px rgba(120,190,70,.1) !important;
        animation:highlightPulse .9s ease-in-out infinite;
      }
      /* セル状態：移動可能（青グロー枠） */
      .bt-grid-cell.movable {
        border-color:rgba(80,160,255,.9) !important;
        background:rgba(0,5,15,.7) !important;
        box-shadow:inset 0 0 0 1px rgba(70,150,240,.3), 0 0 8px rgba(60,130,220,.5), inset 0 0 12px rgba(50,120,200,.1) !important;
        animation:movePulse .9s ease-in-out infinite; cursor:pointer;
      }
      .bt-grid-cell.movable:active { background:rgba(0,10,30,.8) !important; }
      /* スキル範囲ハイライト（黄色グロー枠） */
      .bt-grid-cell.skill-range {
        border-color:rgba(220,180,60,.9) !important;
        background:rgba(0,0,0,.55) !important;
        box-shadow:0 0 10px rgba(200,160,40,.5), 0 0 20px rgba(180,140,30,.3), inset 0 0 8px rgba(160,120,20,.2) !important;
        animation:skillRangePulse .9s ease-in-out infinite;
      }
      @keyframes skillRangePulse { 0%,100%{border-color:rgba(200,160,40,.6); box-shadow:0 0 6px rgba(180,140,30,.3)} 50%{border-color:rgba(240,200,60,.95); box-shadow:0 0 16px rgba(220,180,50,.7), 0 0 30px rgba(200,160,40,.3)} }
      @keyframes dangerPulse    { 0%,100%{border-color:rgba(200,40,40,.6); box-shadow:0 0 6px rgba(180,30,30,.3), inset 0 0 6px rgba(160,20,20,.15)} 50%{border-color:rgba(240,60,60,.95); box-shadow:0 0 16px rgba(220,50,50,.7), 0 0 30px rgba(200,40,40,.3), inset 0 0 12px rgba(190,30,30,.25)} }
      @keyframes highlightPulse { 0%,100%{box-shadow:inset 0 0 0 1px rgba(150,210,90,.2),  0 0 6px rgba(130,200,80,.3),  inset 0 0 10px rgba(120,190,70,.08)} 50%{box-shadow:inset 0 0 0 1px rgba(170,230,110,.5), 0 0 14px rgba(150,220,100,.7), inset 0 0 16px rgba(140,210,90,.15)} }
      @keyframes movePulse      { 0%,100%{box-shadow:inset 0 0 0 1px rgba(70,150,240,.2),  0 0 6px rgba(60,130,220,.3),  inset 0 0 10px rgba(50,120,200,.08)} 50%{box-shadow:inset 0 0 0 1px rgba(90,170,255,.5), 0 0 14px rgba(70,150,240,.7), inset 0 0 16px rgba(60,140,220,.15)} }

      /* 怪異カード */
      .bt-enemy-card { width:100%; height:100%; position:relative; display:block; }
      .bt-enemy-card-img { position:absolute; top:0; left:50%; transform:translateX(-50%); width:70%; height:auto; object-fit:contain; object-position:top center; display:block; }

      /* キャラカード */
      .bt-chara-card { width:100%; height:100%; cursor:pointer; -webkit-tap-highlight-color:transparent; position:relative; display:block; overflow:hidden; isolation:isolate; }
      .bt-chara-card.is-inactive {
        opacity: 0.4;
        transition: opacity 0.3s ease;
      }
      /* キャラ情報ポップアップ */
      .bt-chara-popup {
        position:fixed; z-index:250000;
        background:#0f1014; border:1px solid rgba(255,255,255,.12);
        border-radius:12px; padding:14px 16px;
        min-width:160px; max-width:220px;
        pointer-events:none;
        opacity:0; transform:scale(.9);
        transition:opacity .15s, transform .15s;
        box-shadow:0 4px 20px rgba(0,0,0,.8);
      }
      .bt-chara-popup.active {
        opacity:1; transform:scale(1);
      }
      .bt-chara-popup-name {
        font-family:"Cinzel",serif; font-size:13px; letter-spacing:2px;
        color:rgba(232,228,220,.9); margin-bottom:8px;
      }
      .bt-chara-popup-hp {
        font-family:"Cinzel",serif; font-size:11px;
        color:rgba(232,228,220,.7); margin-bottom:6px; letter-spacing:1px;
      }
      .bt-chara-popup-hp span { color:#5bc47a; }
      .bt-chara-popup-hp.low span  { color:#cc8020; }
      .bt-chara-popup-hp.crit span { color:#c02828; }
      .bt-chara-popup-status {
        display:flex; gap:4px; flex-wrap:wrap; min-height:16px;
      }

      /* HPバーはis-inactiveの影響を受けない独立レイヤー */
      .bt-chara-hp-bar-outer {
        position:absolute; bottom:0; left:0; right:0; height:3px;
        background:rgba(0,0,0,.5); z-index:20;
        opacity:1 !important; /* 親のopacityを突破できないのでfilterで補正 */
      }
      .bt-chara-card.is-inactive .bt-chara-hp-bar-outer {
        filter:brightness(3);
      }
      .bt-chara-hp-bar-fill {
        height:100%; background:linear-gradient(90deg,#2e7d4f,#5bc47a);
        border-radius:0; transition:width .4s ease;
      }
      .bt-chara-hp-bar-fill.low  { background:linear-gradient(90deg,#7a5010,#cc8020); }
      .bt-chara-hp-bar-fill.crit { background:linear-gradient(90deg,#7a1515,#c02828); }
      .bt-chara-card.is-inactive .bt-chara-hp-bar {
        opacity: 2.5;
        filter: brightness(2.5);
      }
      .bt-chara-card.is-inactive .bt-chara-hp-num {
        opacity: 2.5;
        filter: brightness(2.5);
      }
      .bt-chara-card.is-disabled { opacity:.3; pointer-events:none; }
      .bt-chara-img { position:absolute; top:0; left:50%; transform:translateX(-50%); width:50%; height:auto; object-fit:contain; object-position:top center; display:block; }
      .bt-chara-card::after {
        content:''; position:absolute; bottom:0; left:0; right:0; height:40%;
        background:linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, transparent 100%);
        pointer-events:none;
      }
      .bt-chara-name { display:none; }
      .bt-chara-hp-bar { position:absolute; bottom:0; left:0; right:0; height:3px; background:rgba(0,0,0,.5); }
      .bt-chara-hp-fill { height:100%; background:linear-gradient(90deg,#2e7d4f,#5bc47a); transition:width .4s ease; }
      .bt-chara-hp-num { position:absolute; bottom:4px; left:0; right:0; font-family:"Cinzel",serif; font-size:7px; text-align:center; color:rgba(232,228,220,.8); text-shadow:0 1px 4px rgba(0,0,0,1); pointer-events:none; }

      /* 行動選択ボタン（非表示） */
      .bt-action-toggle { display:none !important; }

      /* スキルエリア（常時表示） */
      .bt-skill-area {
        flex-shrink:0; overflow:hidden;
        background:linear-gradient(to top,rgba(0,0,0,.9),rgba(0,0,0,.5));
        border-top:1px solid rgba(255,255,255,.05);
      }
      .bt-skill-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; }
      .bt-skill-acting { font-size:11px; letter-spacing:2px; color:rgba(232,228,220,.5); }
      .bt-btn-move-card { /* 移動はbt-skill-cardと共通スタイル */ }
      .bt-btn-move-card.move-active { border-color:rgba(100,180,255,.6) !important; background:rgba(100,180,255,.1) !important; color:rgba(100,180,255,.9) !important; }
      .bt-skill-cards { display:flex; gap:5px; padding:6px 10px 4px; align-items:flex-end; }
      .bt-skill-hint { text-align:center; font-size:8px; letter-spacing:2px; color:rgba(232,228,220,.2); margin-top:2px; padding-bottom:4px; }
      .bt-move-cancel { text-align:center; font-size:10px; letter-spacing:2px; color:rgba(232,228,220,.3); cursor:pointer; padding:4px 0 2px; }

      /* 発動確認ボタン */
      .bt-execute-bar {
        display:none; align-items:center; gap:8px;
        padding:6px 10px 2px;
      }
      .bt-execute-bar.visible { display:flex; }
      .bt-execute-selected {
        flex:1; font-size:11px; letter-spacing:1px;
        color:rgba(232,228,220,.6); white-space:nowrap;
        overflow:hidden; text-overflow:ellipsis;
      }
      .bt-execute-btn {
        flex-shrink:0; padding:7px 18px; border-radius:8px;
        border:1px solid rgba(232,200,100,.5);
        background:rgba(232,200,100,.1);
        color:#d4a84b; font-size:12px; letter-spacing:2px;
        cursor:pointer; font-family:"Cinzel",serif;
        transition:background .15s;
      }
      .bt-execute-btn:active { background:rgba(232,200,100,.25); }
      .bt-cancel-btn {
        flex-shrink:0; padding:7px 12px; border-radius:8px;
        border:1px solid rgba(255,255,255,.1);
        background:rgba(255,255,255,.04);
        color:rgba(232,228,220,.4); font-size:11px; letter-spacing:1px;
        cursor:pointer; font-family:"Noto Serif JP",serif;
        transition:background .15s;
      }
      .bt-cancel-btn:active { background:rgba(255,255,255,.1); }
      .bt-skill-card-front.selected {
        border-color:rgba(232,200,100,.6) !important;
        background:rgba(232,200,100,.08) !important;
        box-shadow:0 0 10px rgba(212,168,75,.3);
      }

      /* カードめくり演出 */
      .bt-skill-card-wrap {
        flex:1;
        perspective:600px;
        cursor:pointer;
        -webkit-tap-highlight-color:transparent;

        aspect-ratio:3/4;
        min-width:0;
      }

      .bt-skill-card-inner {
        position:relative;
        width:100%;
        height:100%;

        transform-style:preserve-3d;
        transition:transform 0.35s ease;
      }
      .bt-skill-card-inner.flipped { transform:rotateY(180deg); }
      .bt-skill-card-front,
      .bt-skill-card-back {
        position:absolute; inset:0;
        backface-visibility:hidden; -webkit-backface-visibility:hidden;
        border-radius:9px; overflow:hidden;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        gap:4px;
      }
      /* 裏面 */
      .bt-skill-card-back {
        background:rgba(18,18,28,.95);
        border:1px solid rgba(255,255,255,.12);
        transform:rotateY(0deg);
      }
      .bt-skill-card-back-pattern {
        width:36px; height:36px; opacity:0.2;
        background:repeating-linear-gradient(
          45deg, rgba(255,255,255,.3) 0px, rgba(255,255,255,.3) 1px,
          transparent 1px, transparent 8px
        );
        border-radius:4px;
      }
      .bt-skill-card-back-label {
        font-family:"Cinzel",serif; font-size:8px; letter-spacing:2px;
        color:rgba(232,228,220,.2);
      }
      /* 表面 */
      .bt-skill-card-front {
        background:rgba(18,18,24,.95);
        border:1px solid rgba(255,255,255,.09);
        transform:rotateY(180deg);
        position:absolute;
        inset:0;
        overflow:hidden;
        box-sizing:border-box;
      }
      .bt-skill-card-front::after {
        content:''; position:absolute; top:0; left:0; right:0; height:1px;
        background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);
      }

      #bt-move-card{
        justify-content:flex-start;
        padding-top:30px;
      }

      /* スキルカード */
      .bt-skill-card { flex:1; background:rgba(18,18,24,.95); border:1px solid rgba(255,255,255,.09); border-radius:9px; padding:10px 5px 8px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; -webkit-tap-highlight-color:transparent; position:relative; overflow:hidden; transition:transform .12s, border-color .15s; user-select:none; -webkit-user-select:none; }
      .bt-skill-card::after { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent); }
      .bt-skill-card.pressing { transform:scale(.96); border-color:rgba(232,228,220,.3); background:rgba(232,228,220,.05); }
      .bt-skill-card.on-cd { opacity:.3; pointer-events:none; }
      .bt-skill-name { font-size:13px; letter-spacing:1px; color:#e8e4dc; font-weight:500; text-align:center; }
      .bt-skill-subdesc { font-size:8px; color:rgba(232,228,220,.35); letter-spacing:.5px; text-align:center; }
      .bt-skill-hit  { font-family:"Cinzel",serif; font-size:9px; color:rgba(232,228,220,.3); }
      .bt-skill-cd-badge { position:absolute; top:3px; right:3px; font-family:"Cinzel",serif; font-size:7px; color:rgba(255,255,255,.3); background:rgba(0,0,0,.5); border-radius:3px; padding:1px 4px; }

      .bt-skill-card-back,
      .bt-skill-card-front,
      .bt-skill-card {
        box-sizing:border-box;
      }

      /* ログ */
      .bt-log-wrap { flex-shrink:0; height:30px; display:flex; align-items:center; justify-content:center; padding:0 16px; padding-bottom:max(6px,env(safe-area-inset-bottom,6px)); }
      .bt-log { font-size:11px; color:rgba(232,228,220,.4); letter-spacing:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center; }

      /* ダメージポップ */
      .bt-dmg-pop { position:fixed; pointer-events:none; font-family:"Cinzel",serif; font-weight:700; font-size:22px; color:#fff; text-shadow:0 0 14px rgba(255,60,60,.9),0 2px 6px rgba(0,0,0,.9); animation:dmgFloat 1.1s ease-out forwards; z-index:299999; white-space:nowrap; }
      .bt-dmg-pop.miss { color:rgba(232,228,220,.45); text-shadow:none; font-size:14px; }
      .bt-dmg-pop.heal { color:#5bc47a; text-shadow:0 0 12px rgba(91,196,122,.8); }
      @keyframes dmgFloat { 0%{opacity:1;transform:translateY(0) scale(1)} 25%{opacity:1;transform:translateY(-18px) scale(1.15)} 100%{opacity:0;transform:translateY(-55px) scale(.75)} }

      /* 敵ターンオーバーレイ */
      #bt-enemy-turn-overlay { position:fixed; inset:0; z-index:210000; display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:opacity .25s; background:rgba(0,0,0,.25); }
      #bt-enemy-turn-overlay.active { opacity:1; pointer-events:auto; }
      .bt-enemy-turn-txt { font-family:"Cinzel",serif; font-size:26px; letter-spacing:8px; color:#c02828; text-shadow:0 0 24px rgba(200,40,40,.8); animation:etPulse 1.5s ease-out forwards; }
      @keyframes etPulse { 0%{opacity:0;transform:scale(.85)} 20%{opacity:1;transform:scale(1.04)} 80%{opacity:1;transform:scale(1)} 100%{opacity:0} }

      /* 詳細ポップアップ */
      .bt-detail-popup { position:fixed; inset:0; z-index:220000; display:flex; align-items:flex-end; justify-content:center; background:rgba(0,0,0,.6); backdrop-filter:blur(2px); opacity:0; pointer-events:none; transition:opacity .2s; }
      .bt-detail-popup.active { opacity:1; pointer-events:auto; }
      .bt-detail-box { width:100%; max-width:430px; background:#0f1014; border-top:1px solid rgba(255,255,255,.1); border-radius:16px 16px 0 0; padding:20px; padding-bottom:max(24px,env(safe-area-inset-bottom,24px)); transform:translateY(20px); transition:transform .25s ease; max-height:80vh; overflow-y:auto; }
      .bt-detail-popup.active .bt-detail-box { transform:translateY(0); }
      .bt-detail-title { font-family:"Cinzel",serif; font-size:15px; letter-spacing:3px; color:rgba(232,228,220,.9); margin-bottom:4px; }
      .bt-detail-type  { font-size:9px; letter-spacing:3px; color:rgba(232,228,220,.35); margin-bottom:10px; }
      .bt-detail-desc  { font-size:13px; color:rgba(232,228,220,.7); line-height:1.8; margin-bottom:14px; }
      .bt-detail-grid  { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px; }
      .bt-detail-stat  { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07); border-radius:8px; padding:8px 12px; }
      .bt-detail-stat-label { font-size:8px; letter-spacing:2px; color:rgba(232,228,220,.35); margin-bottom:2px; }
      .bt-detail-stat-val   { font-family:"Cinzel",serif; font-size:16px; color:rgba(232,228,220,.85); }
      .bt-detail-range-title { font-size:9px; letter-spacing:3px; color:rgba(232,228,220,.35); margin-bottom:8px; }
      .bt-range-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:3px; width:100px; margin-bottom:14px; }
      .bt-range-cell { aspect-ratio:1; border-radius:4px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.03); }
      .bt-range-cell.danger  { background:rgba(200,50,50,.3); border-color:rgba(200,50,50,.6); }
      .bt-range-cell.highlight { background:rgba(180,230,140,.2); border-color:rgba(180,230,140,.5); }
      .bt-detail-close { width:100%; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.05); color:rgba(232,228,220,.6); font-size:13px; letter-spacing:2px; cursor:pointer; font-family:"Noto Serif JP",serif; }
      .bt-detail-close:active { background:rgba(255,255,255,.1); }

      /* 結果バナー */
      #bt-result-banner { position:fixed; inset:0; z-index:230000; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,.88); opacity:0; pointer-events:none; transition:opacity .5s; }
      #bt-result-banner.active { opacity:1; pointer-events:auto; }
      .bt-result-txt { font-family:"Cinzel",serif; font-size:38px; letter-spacing:10px; margin-bottom:36px; }
      .bt-result-txt.win  { color:#d4a84b; text-shadow:0 0 28px rgba(212,168,75,.6); }
      .bt-result-txt.lose { color:#c02828; text-shadow:0 0 28px rgba(192,40,40,.6); }
      .bt-result-btn { padding:14px 44px; border-radius:12px; border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.07); color:#e8e4dc; font-size:14px; letter-spacing:2px; cursor:pointer; font-family:"Noto Serif JP",serif; }
      .bt-result-btn:active { background:rgba(255,255,255,.15); }
    `;
    document.body.appendChild(s);
  }

  // ============================================================
  // 状態
  // ============================================================
  let bs = null;
  let locked = false;
  let moveMode = false;
  let movingCharaId = null;

  // ============================================================
  // レンダリング
  // ============================================================
  function renderHeader() {
    const e = bs.enemy;
    const fill = document.getElementById('bt-enemy-hp-fill');
    if (fill) fill.style.width = (e.hp / e.hpMax * 100) + '%';
    const txt = document.getElementById('bt-enemy-hp-txt');
    if (txt) txt.textContent = e.hp + ' / ' + e.hpMax;
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
      chip.className = 'bt-order-chip' + (u.isEnemy?' is-enemy':'') + (i===bs.actingIdx?' is-active':'');
      chip.innerHTML = `<div class="bt-order-chip-name">${u.name}</div><div class="bt-order-chip-spd">${u.spd}</div>`;
      list.appendChild(chip);
    });
  }

  function renderEnemyGrid(highlightCells) {
    const isVisible = bs.enemy.status.includes('実体化');
    ROWS.forEach(row => {
      COLS.forEach(col => {
        const cell = document.getElementById('bt-eg-'+row+'-'+col);
        if (!cell) return;
        cell.innerHTML = '';
        const key = row+'-'+col;

        if (isVisible && bs.enemy.row === row && bs.enemy.col === col) {
          const card = document.createElement('div');
          card.className = 'bt-enemy-card';
          card.innerHTML = `<img class="bt-enemy-card-img" src="${bs.enemy.upImg||bs.enemy.img||''}" onerror="this.style.opacity='0'">`;
          cell.appendChild(card);
          cell.className = 'bt-grid-cell';
        } else {
          cell.className = 'bt-grid-cell' + (highlightCells && highlightCells.has(key) ? ' highlight' : '');
        }
      });
    });
  }

  function renderAllyGrid(highlightCells) {
    const isVisible = bs.enemy.status.includes('実体化');
    const nextAct = peekNextAction();
    const patFn = isVisible ? RANGE_PATTERNS[nextAct.range || 'random1'] : null;
    const dangerCells = patFn ? patFn({ row: bs.enemy.row, col: bs.enemy.col }, bs.party) : null;

    ROWS.forEach(row => {
      COLS.forEach(col => {
        const cell = document.getElementById('bt-ag-'+row+'-'+col);
        if (!cell) return;
        cell.innerHTML = '';
        const key = row+'-'+col;

        let cls = 'bt-grid-cell';
        if (highlightCells && highlightCells.has(key)) cls += ' highlight';
        else if (dangerCells && (dangerCells === null || dangerCells.has(key))) cls += ' danger';
        cell.className = cls;
      });
    });

    const actingUnit = bs.turnOrder[bs.actingIdx];
    const hasPlayerTurn = actingUnit && !actingUnit.isEnemy;
    bs.party.forEach(c => {
      const cell = document.getElementById('bt-ag-'+c.row+'-'+c.col);
      if (!cell) return;
      cell.classList.remove('is-acting');
      const hpRate = c.hp / c.hpMax * 100;
      const isActing = hasPlayerTurn && actingUnit.id === c.id;
      const isInactive = hasPlayerTurn && !isActing && c.hp > 0;
      const card = document.createElement('div');
      card.className = 'bt-chara-card'
        + (isInactive ? ' is-inactive' : '')
        + (c.hp <= 0 ? ' is-disabled' : '');
      card.innerHTML = `
        <img class="bt-chara-img" src="${c.img}" onerror="this.style.opacity='0'">
        <div class="bt-chara-hp-bar-outer">
          <div class="bt-chara-hp-bar-fill ${c.hp/c.hpMax < 0.25 ? 'crit' : c.hp/c.hpMax < 0.5 ? 'low' : ''}" style="width:${hpRate}%"></div>
        </div>
      `;
      if (c.hp > 0 && !locked) card.onclick = () => onCharaTap(c.id);
      cell.appendChild(card);
    });
  }

  function renderField(highlightEnemy, highlightAlly) {
    renderEnemyGrid(highlightEnemy);
    renderAllyGrid(highlightAlly);
  }

  let drawnSkills = [];

  function renderSkills(chara) {
    const area  = document.getElementById('bt-skill-area');
    const cards = document.getElementById('bt-skill-cards');
    if (!area || !cards) return;
    if (!chara) { closeSkillArea(); return; }
    // 行動選択ボタンは非表示のため何もしない

    const pool = chara.skills.filter(sk => sk.cd === 0);
    const tmp = [...pool];
    const drawn = [];
    while (drawn.length < 3 && tmp.length > 0) {
      drawn.push(tmp.splice(Math.floor(Math.random()*tmp.length), 1)[0]);
    }
    const display = [...drawn, ...chara.skills.filter(sk=>sk.cd>0).slice(0, 3-drawn.length)];

    const TYPE_LABEL = {attack:'攻撃', debuff:'妨害', buff:'補助', move:'移動', special:'特殊'};

    drawnSkills = display;

    cards.innerHTML = '';

    // スキル3枚：裏向きで生成
    display.forEach((sk, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'bt-skill-card-wrap';

      const inner = document.createElement('div');
      inner.className = 'bt-skill-card-inner';
      inner.dataset.idx = i;

      // 裏面
      const back = document.createElement('div');
      back.className = 'bt-skill-card-back';
      back.innerHTML = `
        <div class="bt-skill-card-back-pattern"></div>
        <div class="bt-skill-card-back-label">SKILL</div>
      `;

      // 表面
      const front = document.createElement('div');
      front.className = 'bt-skill-card-front' + (sk.cd>0?' on-cd':'');
      front.dataset.skillId = sk.id;
      front.innerHTML = `
        ${sk.cd>0?'<span class="bt-skill-cd-badge">CD</span>':''}
        <div class="bt-skill-name">${sk.name}</div>
        <div class="bt-skill-subdesc">${TYPE_LABEL[sk.type]||'スキル'}</div>
        <div class="bt-skill-hit">${sk.hit<100?'HIT '+sk.hit+'%':'確定命中'}</div>
      `;
      if (sk.cd === 0) setupSkillCard(front, chara, sk);

      inner.appendChild(back);
      inner.appendChild(front);
      wrap.appendChild(inner);

      // 裏向き状態でタップ→全カードめくり開始
      wrap.onclick = () => {
        if (!inner.classList.contains('flipped')) {
          flipAllCards();
        }
      };

      cards.appendChild(wrap);
    });

    // 移動カード（4枚目・スキルカードと同じwrap構造）
    const moveWrap = document.createElement('div');
    moveWrap.className = 'bt-skill-card-wrap';
    const moveCard = document.createElement('div');
    moveCard.className = 'bt-skill-card' + (moveMode ? ' move-active' : '');
    moveCard.id = 'bt-move-card';
    moveCard.style.cssText = 'width:100%; height:100%;';
    moveCard.innerHTML = `
      <div class="bt-skill-name">移動</div>
      <div class="bt-skill-subdesc">ポジション変更</div>
      <div class="bt-skill-hit">確定</div>
    `;
    moveCard.onclick = () => battleMoveMode();
    moveWrap.appendChild(moveCard);
    cards.appendChild(moveWrap);
  }

  // 3枚を順番にめくる（めくる前に高さを記録して固定）
  function flipAllCards() {
  const inners = document.querySelectorAll('.bt-skill-card-inner');

  inners.forEach((inner, i) => {
    setTimeout(() => {
      inner.classList.add('flipped');
    }, i * 300);
  });
}

  function setupSkillCard(card, chara, sk) {
    let pressTimer = null;
    let pressing = false;
    let startX = 0, startY = 0;
    const start = e => {
      const t = e.touches ? e.touches[0] : e;
      startX = t.clientX; startY = t.clientY; pressing = true;
      pressTimer = setTimeout(() => { pressing = false; card.classList.remove('pressing'); showSkillDetail(chara, sk); }, 500);
    };
    const move = e => {
      if (!pressing) return;
      const t = e.touches ? e.touches[0] : e;
      if (Math.abs(t.clientX-startX)>6 || Math.abs(t.clientY-startY)>6) cancel();
    };
    const cancel = () => { card.classList.remove('pressing'); if(pressTimer){clearTimeout(pressTimer);pressTimer=null;} pressing=false; };
    const end = () => { card.classList.remove('pressing'); if(pressTimer){clearTimeout(pressTimer);pressTimer=null; if(pressing){pressing=false;selectSkill(chara,sk);}} };
    card.addEventListener('touchstart', start, {passive:true});
    card.addEventListener('touchmove',  move,  {passive:true});
    card.addEventListener('touchend',   end);
    card.addEventListener('touchcancel',cancel);
    card.addEventListener('mousedown',  start);
    card.addEventListener('mousemove',  move);
    card.addEventListener('mouseup',    end);
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

  // 範囲グリッドHTML生成（詳細ポップアップ用）
  function buildRangeGridHTML(rangeId, user) {
    const fn = RANGE_PATTERNS[rangeId];
    if (!fn) return '';
    const cells = fn(user || {row:'mid',col:'center'}, []);
    const isAlly = ALLY_RANGES.has(rangeId);
    const html = ROWS.map(row =>
      COLS.map(col => {
        const hit = cells === null || cells.has(row+'-'+col);
        const cls = hit ? (isAlly ? 'highlight' : 'danger') : '';
        return `<div class="bt-range-cell ${cls}"></div>`;
      }).join('')
    ).join('');
    return `<div class="bt-detail-range-title">— 攻撃範囲 —</div><div class="bt-range-grid">${html}</div>`;
  }

  // ============================================================
  // 折りたたみトグル
  // ============================================================
  window.toggleSkillArea = function () {
    const area   = document.getElementById('bt-skill-area');
    const toggle = document.getElementById('bt-action-toggle');
    if (!area || !toggle) return;
    const isOpen = area.classList.contains('open');
    area.classList.toggle('open', !isOpen);
    toggle.classList.toggle('open', !isOpen);
  };

  window.toggleOrderBar = function () {
    const wrap   = document.getElementById('bt-order-wrap');
    const toggle = document.getElementById('bt-order-toggle');
    if (!wrap || !toggle) return;
    const isOpen = wrap.classList.contains('open');
    wrap.classList.toggle('open', !isOpen);
    toggle.classList.toggle('open', !isOpen);
  };

  function openSkillArea() {
    // 常時表示のため何もしない
  }
  function closeSkillArea() {
    // 常時表示のため折りたたまない。選択だけリセット
    cancelSkillSelect();
  }

  // ============================================================
  // スキル選択・発動
  // ============================================================
  let selectedSkill = null;
  let selectedChara = null;

  function selectSkill(chara, sk) {
    selectedSkill = sk;
    selectedChara = chara;

    // 全カードのselectedクラスをリセット
    document.querySelectorAll('.bt-skill-card-front').forEach(el => {
      el.classList.remove('selected');
    });
    // 選択したカードをハイライト
    document.querySelectorAll('.bt-skill-card-front').forEach(el => {
      if (el.dataset.skillId === sk.id) el.classList.add('selected');
    });

    // 範囲マスをハイライト
    highlightSkillRange(chara, sk);

    // 発動バーを表示
    const bar  = document.getElementById('bt-execute-bar');
    const txt  = document.getElementById('bt-execute-selected');
    const hint = document.getElementById('bt-skill-hint');
    if (bar)  bar.classList.add('visible');
    if (txt)  txt.textContent = '「' + sk.name + '」を発動しますか？';
    if (hint) hint.style.display = 'none';
  }

  function highlightSkillRange(chara, sk) {
    // まず全セルのskill-rangeクラスをリセット
    clearSkillRangeHighlight();

    const isAlly = ALLY_RANGES.has(sk.range);
    const fn = RANGE_PATTERNS[sk.range];
    if (!fn) return;

    const cells = fn({ row: chara.row, col: chara.col },
                      isAlly ? bs.party : [bs.enemy]);

    const prefix = isAlly ? 'bt-ag-' : 'bt-eg-';
    ROWS.forEach(row => {
      COLS.forEach(col => {
        const key  = row + '-' + col;
        const cell = document.getElementById(prefix + row + '-' + col);
        if (!cell) return;
        const hit  = cells === null || cells.has(key);
        if (hit) cell.classList.add('skill-range');
      });
    });
  }

  function clearSkillRangeHighlight() {
    document.querySelectorAll('.skill-range').forEach(el => {
      el.classList.remove('skill-range');
    });
  }

  window.cancelSkillSelect = function () {
    selectedSkill = null;
    selectedChara = null;
    document.querySelectorAll('.bt-skill-card-front').forEach(el => el.classList.remove('selected'));
    clearSkillRangeHighlight();
    const bar  = document.getElementById('bt-execute-bar');
    const hint = document.getElementById('bt-skill-hint');
    if (bar)  bar.classList.remove('visible');
    if (hint) hint.style.display = '';
    // フィールドを通常表示に戻す
    renderField();
  };

  window.executeSelectedSkill = function () {
    if (!selectedSkill || !selectedChara) return;
    const sk    = selectedSkill;
    const chara = selectedChara;
    cancelSkillSelect();
    onSkillTap(chara, sk);
  };

  // ============================================================
  // 詳細ポップアップ
  // ============================================================
  window.showNextDetail = function () {
    if (locked) return;
    const act = peekNextAction();
    let popup = document.getElementById('bt-next-detail-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'bt-next-detail-popup';
      popup.className = 'bt-detail-popup';
      popup.innerHTML = '<div class="bt-detail-box" id="bt-next-detail-box"></div>';
      popup.onclick = e => { if(e.target===popup) closeNextDetail(); };
      document.body.appendChild(popup);
    }
    document.getElementById('bt-next-detail-box').innerHTML = `
      <div class="bt-detail-title">${act.action}</div>
      <div class="bt-detail-type">怪異の行動</div>
      ${buildRangeGridHTML(act.range, {row:bs.enemy.row, col:bs.enemy.col})}
      <div class="bt-detail-desc">${act.desc||'詳細情報なし'}</div>
      <button class="bt-detail-close" onclick="closeNextDetail()">閉じる</button>
    `;
    requestAnimationFrame(() => popup.classList.add('active'));
  };
  window.closeNextDetail = function () {
    const p = document.getElementById('bt-next-detail-popup');
    if (p) p.classList.remove('active');
  };

  function showSkillDetail(chara, sk) {
    let popup = document.getElementById('bt-skill-detail-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'bt-skill-detail-popup';
      popup.className = 'bt-detail-popup';
      popup.innerHTML = '<div class="bt-detail-box" id="bt-skill-detail-box"></div>';
      popup.onclick = e => { if(e.target===popup) closeSkillDetail(); };
      document.body.appendChild(popup);
    }
    const TYPE_LABEL = {attack:'攻撃スキル', debuff:'妨害スキル', buff:'補助スキル', move:'移動スキル', special:'特殊スキル'};
    document.getElementById('bt-skill-detail-box').innerHTML = `
      <div class="bt-detail-title">${sk.name}</div>
      <div class="bt-detail-type">${TYPE_LABEL[sk.type]||'スキル'}</div>
      <div class="bt-detail-desc">${sk.desc||'詳細情報なし'}</div>
      <div class="bt-detail-grid">
        <div class="bt-detail-stat"><div class="bt-detail-stat-label">命中率</div><div class="bt-detail-stat-val">${sk.hit<100?sk.hit+'%':'確定'}</div></div>
        <div class="bt-detail-stat"><div class="bt-detail-stat-label">倍率</div><div class="bt-detail-stat-val">${sk.multiplier||1.0}×</div></div>
        <div class="bt-detail-stat"><div class="bt-detail-stat-label">クールダウン</div><div class="bt-detail-stat-val">${sk.cdMax}ターン</div></div>
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
  // 怪異行動
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
    closeSkillArea();

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

      const rangeId = act.range || 'random1';
      const targets = getTargets(rangeId, {row:bs.enemy.row, col:bs.enemy.col}, bs.party);

      if (targets.length > 0) {
        let delay = 0;
        targets.forEach(target => {
          setTimeout(() => {
            const dmg = calcEnemyDamage(bs.enemy, target);
            target.hp = Math.max(0, target.hp - dmg);
            renderField();
            const cell = document.getElementById('bt-ag-'+target.row+'-'+target.col);
            showDmgPop(cell, dmg, 'dmg');
          }, delay);
          delay += 200;
        });
        setTimeout(() => {
          checkPartyDead();
          locked = false;
          renderHeader();
          setTimeout(nextUnitInTurn, 700);
        }, delay + 280);
      } else {
        setTimeout(() => { locked=false; renderHeader(); setTimeout(nextUnitInTurn, 700); }, 1400);
      }
    }, 1400);
  }

  // ============================================================
  // プレイヤー操作
  // ============================================================
  let charaPopupTimer = null;

  function onCharaTap(id) {
    if (locked) return;
    // ポップアップ表示
    showCharaPopup(id);
  }

  function showCharaPopup(id) {
    const chara = bs.party.find(c => c.id === id);
    if (!chara) return;

    // 既存ポップアップを削除
    closeCharaPopup();

    const pct = chara.hp / chara.hpMax;
    const hpClass = pct < 0.25 ? 'crit' : pct < 0.5 ? 'low' : '';
    const statusHTML = chara.status && chara.status.length
      ? chara.status.map(st =>
          `<span class="bt-status-badge ${st==='実体化'?'bt-status-jittai':'bt-status-shibari'}">${st}</span>`
        ).join('')
      : '<span style="font-size:9px;color:rgba(232,228,220,.3);letter-spacing:1px">状態異常なし</span>';

    const popup = document.createElement('div');
    popup.id = 'bt-chara-popup';
    popup.className = 'bt-chara-popup';
    popup.innerHTML = `
      <div class="bt-chara-popup-name">${chara.name}</div>
      <div class="bt-chara-popup-hp ${hpClass}">HP :&nbsp;&nbsp;<span>${chara.hp} / ${chara.hpMax}</span></div>
      <div class="bt-chara-popup-status">${statusHTML}</div>
    `;

    // セルの位置を取得して表示位置を決定
    const cell = document.getElementById('bt-ag-'+chara.row+'-'+chara.col);
    const rect = cell ? cell.getBoundingClientRect() : null;
    if (rect) {
      let top  = rect.top - 10;
      let left = rect.left + rect.width / 2;
      popup.style.cssText = `top:${top}px;left:${left}px;transform-origin:bottom center;`;
      // 画面上端に収まるよう調整
      document.body.appendChild(popup);
      const popH = popup.offsetHeight || 100;
      if (top - popH < 10) {
        popup.style.top  = (rect.bottom + 10) + 'px';
        popup.style.transformOrigin = 'top center';
      } else {
        popup.style.top = (top - popH) + 'px';
      }
      popup.style.left = Math.min(Math.max(left - popup.offsetWidth/2, 8), window.innerWidth - popup.offsetWidth - 8) + 'px';
      popup.style.transform = 'scale(.9)';
    } else {
      document.body.appendChild(popup);
    }

    requestAnimationFrame(() => popup.classList.add('active'));

    // 2.5秒後に自動で閉じる
    charaPopupTimer = setTimeout(closeCharaPopup, 2500);

    // 画面タップで閉じる
    setTimeout(() => {
      document.addEventListener('touchstart', closeCharaPopup, {once:true, passive:true});
      document.addEventListener('mousedown',  closeCharaPopup, {once:true});
    }, 100);
  }

  function closeCharaPopup() {
    if (charaPopupTimer) { clearTimeout(charaPopupTimer); charaPopupTimer = null; }
    const p = document.getElementById('bt-chara-popup');
    if (p) {
      p.classList.remove('active');
      setTimeout(() => p.remove(), 200);
    }
  }

  function onSkillTap(chara, skill) {
    if (locked) return;
    locked = true;
    skill.cd = skill.cdMax;

    const isAlly = ALLY_RANGES.has(skill.range);
    const targetGrid = isAlly ? bs.party : [bs.enemy];
    const targets = getTargets(skill.range, {row:chara.row, col:chara.col}, targetGrid);

    if (skill.type === 'attack') {
      const hit = hitCheck(skill.hit, chara.accuracy);
      if (!hit) {
        addLog(chara.name + '「' + skill.name + '」は外れた');
        const cell = document.getElementById('bt-eg-'+bs.enemy.row+'-'+bs.enemy.col);
        showDmgPop(cell, 0, 'miss');
        locked = false;
        setTimeout(nextUnitInTurn, 1400);
        return;
      }
      targets.forEach(target => {
        const dmg = calcDamage(chara.atk, bs.enemy.def, bs.enemy, skill.multiplier || 1.0);
        bs.enemy.hp = Math.max(0, bs.enemy.hp - dmg);
        addLog(chara.name + '「' + skill.name + '」→ ' + dmg + ' ダメージ');
        const cell = document.getElementById('bt-eg-'+bs.enemy.row+'-'+bs.enemy.col);
        showDmgPop(cell, dmg, 'dmg');
      });
      renderHeader();
      if (bs.enemy.hp <= 0) { setTimeout(()=>onBattleEnd(true), 600); return; }

    } else if (skill.type === 'debuff') {
      const st = (skill.name==='実体化'||skill.name==='繋ぎ手'||skill.name==='繋ぎ鎖') ? '実体化' : '縛り';
      if (!bs.enemy.status.includes(st)) {
        bs.enemy.status.push(st);
        addLog(skill.name + ' → 「' + st + '」付与');
      } else {
        addLog(skill.name + ' → すでに' + st + '状態');
      }
      renderHeader();
    } else {
      addLog(chara.name + '「' + skill.name + '」を使用');
    }

    locked = false;
    setTimeout(nextUnitInTurn, 1100);
  }

  // ============================================================
  // 移動モード
  // ============================================================
  window.battleMoveMode = function () {
    if (locked) return;
    const acting = bs.turnOrder[bs.actingIdx];
    if (!acting || acting.isEnemy) return;

    if (moveMode) { cancelMoveMode(); return; }

    moveMode = true;
    movingCharaId = acting.id;

    const cards = document.getElementById('bt-skill-cards');
    const hint  = document.querySelector('.bt-skill-hint');
    if (cards) cards.innerHTML = '<div class="bt-move-cancel" onclick="battleMoveMode()">タップでキャンセル</div>';
    if (hint)  hint.style.display = 'none';
    const btn = document.getElementById('bt-move-card');
    if (btn) btn.classList.add('move-active');

    renderFieldMoveMode();
    addLog('移動先のマスを選んでください');
  };

  function cancelMoveMode() {
    moveMode = false; movingCharaId = null;
    const btn = document.getElementById('bt-move-card');
    if (btn) btn.classList.remove('move-active');
    const hint = document.querySelector('.bt-skill-hint');
    if (hint) hint.style.display = '';
    renderField();
    const acting = bs.turnOrder[bs.actingIdx];
    if (acting && !acting.isEnemy) renderSkills(bs.party.find(c=>c.id===acting.id));
    addLog('移動キャンセル');
  }

  function renderFieldMoveMode() {
    // 全セルリセット
    ROWS.forEach(row => COLS.forEach(col => {
      const cell = document.getElementById('bt-ag-'+row+'-'+col);
      if (cell) { cell.innerHTML=''; cell.className='bt-grid-cell'; cell.onclick=null; }
    }));

    const occupied = new Set(bs.party.filter(c=>c.hp>0).map(c=>c.row+'-'+c.col));
    const mover = bs.party.find(c=>c.id===movingCharaId);
    if (mover) occupied.delete(mover.row+'-'+mover.col);

    ROWS.forEach(row => COLS.forEach(col => {
      const cell = document.getElementById('bt-ag-'+row+'-'+col);
      if (!cell) return;
      const key = row+'-'+col;
      const isMoverCell = mover && mover.row===row && mover.col===col;
      if (!occupied.has(key) && !isMoverCell) {
        cell.className = 'bt-grid-cell movable';
        cell.onclick = () => executeMove(row, col);
      }
    }));

    // キャラ表示
    bs.party.filter(c=>c.hp>0).forEach(c => {
      const cell = document.getElementById('bt-ag-'+c.row+'-'+c.col);
      if (!cell) return;
      const hpRate = c.hp / c.hpMax * 100;
      const card = document.createElement('div');
      card.className = 'bt-chara-card' + (c.id===movingCharaId?' is-acting':'');
      card.innerHTML = `
        <img class="bt-chara-img" src="${c.img}" onerror="this.style.opacity='0'">
        <div class="bt-chara-hp-bar"><div class="bt-chara-hp-fill" style="width:${hpRate}%"></div></div>
        <div class="bt-chara-hp-num">${c.hp}</div>
      `;
      cell.appendChild(card);
    });

    renderEnemyGrid();
  }

  function executeMove(toRow, toCol) {
    if (!moveMode || !movingCharaId) return;
    const mover = bs.party.find(c=>c.id===movingCharaId);
    if (!mover) return;
    const RL = {near:'近',mid:'中',far:'遠'};
    const CL = {left:'左',center:'中',right:'右'};
    addLog(mover.name + ' が ' + RL[mover.row]+CL[mover.col] + ' → ' + RL[toRow]+CL[toCol] + ' へ移動');
    mover.row = toRow; mover.col = toCol; mover.pos = toRow;
    moveMode = false; movingCharaId = null;
    const btn = document.getElementById('bt-move-card');
    if (btn) btn.classList.remove('move-active');
    const hint = document.querySelector('.bt-skill-hint');
    if (hint) hint.style.display = '';
    renderField();
    setTimeout(nextUnitInTurn, 800);
  }

  // ============================================================
  // 勝敗
  // ============================================================
  function checkPartyDead() {
    if (bs.party.filter(c=>c.hp>0).length === 0) onBattleEnd(false);
  }

  function onBattleEnd(win) {
    locked = true;
    closeSkillArea();
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
    // 怪異の初期位置をランダムに設定
    const _ROWS = ['near','mid','far'];
    const _COLS = ['left','center','right'];
    bs.enemy.row = _ROWS[Math.floor(Math.random() * 3)];
    bs.enemy.col = _COLS[Math.floor(Math.random() * 3)];
    bs.turnOrder = calcTurnOrder(bs.party, bs.enemy);
    locked = false; moveMode = false; movingCharaId = null;

    const el = buildBattleScreen();
    el.style.display = 'flex';
    void el.offsetWidth;
    el.style.opacity = '1';

    const banner = document.getElementById('bt-result-banner');
    if (banner) banner.classList.remove('active');
    closeNextDetail();
    closeSkillDetail();
    closeSkillArea();

    renderHeader();
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
    setTimeout(() => { el.style.display='none'; locked=false; }, 600);
  }

  window.startBattle  = startBattle;
  window.closeBattle  = closeBattle;

})();
