// battle.js v3
// 上下2グリッド構成・range判定ベースバトルシステム

(function () {

  // ============================================================
  // 定数
  // ============================================================
  const ROWS = ['near', 'mid', 'far'];
  const COLS = ['left', 'center', 'right'];

  const RANGE_LABEL = {
  front1: '前方1マス',
  front3: '前列3マス',
  pierce2: '縦2マス貫通',
  pierce3: '縦列貫通',
  all: '敵全体',
  col_center: '同列',
  col_left: '左列',
  col_right: '右列',

  ally_self: '自身',
  ally_all: '味方全体',
  ally_adjacent: '隣接味方',
  ally_except_self: '自身以外',
  };

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
    // ── 敵エリア対象（すべてuser位置を基準とした相対計算）──────────
    single:      (user) => null,  // 選択式（別途処理）
    random1:     (user, grid) => {
      const alive = grid.filter(u => u.hp > 0);
      if (!alive.length) return new Set();
      const t = alive[Math.floor(Math.random() * alive.length)];
      return new Set([t.row + '-' + t.col]);
    },
    all:         () => _allCells(),

    // 絶対行（行攻撃は「どの行を狙うか」が意味を持つため絶対座標維持）
    row_near:    () => _row('near'),
    row_mid:     () => _row('mid'),
    row_far:     () => _row('far'),
    row2_near:   () => _rows(['near','mid']),
    row2_far:    () => _rows(['mid','far']),

    // 列系：userの列を基準に相対計算
    col_center:  (user) => _col(user.col),                          // 自分の列
    col_left:    (user) => { const c=COL_BY_IDX[COL_IDX[user.col]-1]; return c?_col(c):new Set(); },  // 自分の1つ左列
    col_right:   (user) => { const c=COL_BY_IDX[COL_IDX[user.col]+1]; return c?_col(c):new Set(); }, // 自分の1つ右列
    col2_left:   (user) => { // 自分の列＋左列
      const s=_col(user.col);
      const c=COL_BY_IDX[COL_IDX[user.col]-1]; if(c)_col(c).forEach(v=>s.add(v)); return s;
    },
    col2_right:  (user) => { // 自分の列＋右列
      const s=_col(user.col);
      const c=COL_BY_IDX[COL_IDX[user.col]+1]; if(c)_col(c).forEach(v=>s.add(v)); return s;
    },

    // 十字・特殊：userの位置基準
    cross:       (user) => { const s=_relRow(user,0); _col(user.col).forEach(v=>s.add(v)); return s; },
    xcross:      (user) => { const all=_allCells(); _relRow(user,0).forEach(v=>all.delete(v)); _col(user.col).forEach(v=>all.delete(v)); return all; },
    corner:      () => new Set(['near-left','near-right','far-left','far-right']),
    donut:       (user) => { const s=_allCells(); s.delete(user.row+'-'+user.col); return s; },
    center1:     (user) => new Set([user.row+'-'+user.col]),        // 自分のいるマス

    // 前方系：userの正面方向（rowインデックスが小さい方向＝near方向）
    front1:      (user) => _relCell(user, -1, 0),                   // 正面1マス
    front3:      (user) => _relRow(user, -1),                       // 正面1行
    pierce2:     (user) => _relPierce(user, 2),                     // 自列を前方2マス貫通
    pierce3:     (user) => _col(user.col),                          // 自列全体貫通

    // ── 自エリア対象 ──────────────────────────────────────────
    ally_single:      (user) => null,
    ally_all:         () => _allCells(),
    ally_row_near:    () => _row('near'),
    ally_row_mid:     () => _row('mid'),
    ally_row_far:     () => _row('far'),
    ally_col_center:  (user) => _col(user.col),                     // 自分の列の味方
    ally_col_left:    (user) => { const c=COL_BY_IDX[COL_IDX[user.col]-1]; return c?_col(c):new Set(); },
    ally_col_right:   (user) => { const c=COL_BY_IDX[COL_IDX[user.col]+1]; return c?_col(c):new Set(); },
    ally_cross:       (user) => { const s=_relRow(user,0); _col(user.col).forEach(v=>s.add(v)); return s; },
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
  // userの行からrowOffset分ずれた行全体（範囲外なら空Set）
  function _relRow(user, rowOffset) {
    const ri = ROW_IDX[user.row] + rowOffset;
    const r  = ROW_BY_IDX[ri];
    return r ? _row(r) : new Set();
  }

  // userの列をfrontから最大n マス貫通（範囲外で止まる）
  function _relPierce(user, n) {
    const s  = new Set();
    const ci = COL_IDX[user.col];
    let   ri = ROW_IDX[user.row] - 1; // front方向
    for (let i = 0; i < n; i++) {
      const r = ROW_BY_IDX[ri];
      const c = COL_BY_IDX[ci];
      if (!r || !c) break;
      s.add(r + '-' + c);
      ri--;
    }
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

  function getEnemyCellsFromAllyRange(chara, rangeId) {
  const s = new Set();

  if (rangeId === 'all') {
    ROWS.forEach(r => COLS.forEach(c => s.add(r + '-' + c)));

  } else if (rangeId === 'front1') {
    s.add(chara.row + '-' + chara.col);

  } else if (rangeId === 'front3') {
   COLS.forEach(c => s.add(chara.row + '-' + c));

  } else if (rangeId === 'pierce2') {
    s.add('near-' + chara.col);
    s.add('mid-' + chara.col);

  } else if (rangeId === 'pierce3') {
    ROWS.forEach(r => s.add(r + '-' + chara.col));

  } else if (rangeId === 'col_center') {
    ROWS.forEach(r => s.add(r + '-' + chara.col));

  } else if (rangeId === 'col_left') {
    const c = COL_BY_IDX[COL_IDX[chara.col] - 1];
    if (c) ROWS.forEach(r => s.add(r + '-' + c));

  } else if (rangeId === 'col_right') {
    const c = COL_BY_IDX[COL_IDX[chara.col] + 1];
    if (c) ROWS.forEach(r => s.add(r + '-' + c));
  }

  return s;
}

function getEnemyTargetsFromAllyRange(chara, rangeId) {
  const cells = getEnemyCellsFromAllyRange(chara, rangeId);
  return [bs.enemy].filter(e => e.hp > 0 && cells.has(e.row + '-' + e.col));
}

  // ============================================================
  // 仮データ
  // ============================================================
  // ============================================================
  // CHARACTERS → バトル用パーティデータ変換
  // ============================================================
  // 開始位置テンプレート（3人編成）
  const DEFAULT_POSITIONS = [
    { row:'near', col:'center' },
    { row:'mid',  col:'center' },
    { row:'far',  col:'center' },
  ];

  // CHARACTERSのキャラデータをバトル内部形式に変換
  function charaToPartyUnit(chara, posIdx) {
    const pos = DEFAULT_POSITIONS[posIdx] || DEFAULT_POSITIONS[0];
    return {
      id:       'chara_' + chara.id,
      charaId:  chara.id,
      name:     chara.name,
      img:      chara.battleImg || chara.img,
      battleImg:chara.battleImg,
      hp:       chara.stats.HP,
      hpMax:    chara.stats.HP,
      atk:      chara.stats.ATK,
      def:      chara.stats.DEF,
      spd:      chara.stats.SPD,
      accuracy: chara.stats.SPD + 30, // accuracy = SPD + 30 で簡易計算
      status:   [],
      row:      pos.row,
      col:      pos.col,
      skills:   chara.skills.map(sk => ({ ...sk, cd: 0 })),
    };
  }

  // CHARACTERS配列からパーティを生成（IDリストで指定）
  function buildPartyFromIds(idList) {
    return idList
      .map((id, i) => {
        const chara = (typeof CHARACTERS !== 'undefined')
          ? CHARACTERS.find(c => c.id === id)
          : null;
        return chara ? charaToPartyUnit(chara, i) : null;
      })
      .filter(Boolean);
  }

  // テスト用デフォルトパーティ（CHARACTERS未ロード時のフォールバック）
  const DUMMY_PARTY = (typeof CHARACTERS !== 'undefined')
    ? buildPartyFromIds([14, 16, 17])
    : [];

  const DUMMY_ENEMY = {
    id:'enemy_01', name:'??????',
    upImg:'images/enemy_01_up.webp',
    battleImg:'images/enemy_01_battle.webp',
    hp:2000, hpMax:2000,
    atk:375, def:280, spd:260,
    row:'near', col:'center',  // 怪異のグリッド上の位置
    phase:1, status:[],
    actionPattern:[
      { turn:1, action:'全体攻撃',   type:'atk_all',    range:'all',       power:'中', desc:'全員に攻撃を行う。' },
      { turn:2, action:'単体攻撃',   type:'atk_single', range:'random1',   power:'大', desc:'ランダムな1人に攻撃する。' },
      { turn:3, action:'中縦列攻撃', type:'atk_center', range:'col_center',power:'中', desc:'中央縦列を攻撃する。' },
      { turn:4, action:'十字攻撃',   type:'atk_cross',  range:'cross',     power:'特大', desc:'十字形の範囲を攻撃する。' },
    ],
    actionIdx:0,
  };

  // ============================================================
  // ダメージ計算
  // ============================================================
  function calcDamage(atk, def, enemy, multiplier) {
    const m = multiplier || 1.0;
    // 敵のDEFダウンを反映
    const mod = enemy._statusMod || {};
    const effectiveDef = Math.max(0, Math.floor(def * (1 - (mod.def_down || 0))));
    return Math.max(1, Math.floor(atk * m) - effectiveDef);
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
          <button class="bt-execute-btn" id="bt-execute-btn" onclick="executeSelectedSkill()">決定</button>
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
      .bt-status-stun    { color:#ff8080; border-color:rgba(255,100,100,.5); background:rgba(255,80,80,.1); }
      .bt-status-debuff  { color:#ffd3a8; border-color:rgba(255,211,168,.5); background:rgba(255,211,168,.1); }
      .bt-status-buff    { color:#a8c8ff; border-color:rgba(168,200,255,.5); background:rgba(168,200,255,.1); }
      .bt-status-other   { color:#ccc;    border-color:rgba(200,200,200,.3); background:rgba(200,200,200,.05); }
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

      .bt-grid-cell.danger-random::after {
  border-color: rgba(220,60,60,.55) !important;
  box-shadow: 0 0 8px rgba(200,40,40,.35), inset 0 0 6px rgba(160,20,20,.18);
  animation: dangerRandomAfterPulse 1.4s ease-in-out infinite;
}

@keyframes dangerRandomAfterPulse {
  0%,100% {
    border-color: rgba(180,30,30,.35);
    box-shadow: 0 0 5px rgba(180,30,30,.25), inset 0 0 5px rgba(160,20,20,.12);
  }
  50% {
    border-color: rgba(230,70,70,.7);
    box-shadow: 0 0 12px rgba(220,50,50,.45), inset 0 0 8px rgba(190,30,30,.2);
  }
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
      /* 単体ランダム攻撃：全マス薄赤（どこに来るか不明を表現） */
      .bt-grid-cell.danger-random {
        border-color:rgba(200,50,50,.45) !important;
        background:rgba(0,0,0,.55) !important;
        box-shadow:inset 0 0 6px rgba(160,20,20,.15) !important;
        animation:dangerRandomPulse 1.4s ease-in-out infinite;
      }
      @keyframes dangerRandomPulse {
        0%,100%{ border-color:rgba(180,30,30,.3); }
        50%    { border-color:rgba(220,60,60,.6); }
      }

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
      .bt-enemy-card-img { position:absolute; top:0; left:50%; transform:translateX(-50%); width:80%; height:auto; object-fit:contain; object-position:top center; display:block; }

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
      .bt-chara-img { position:absolute; top:0; left:50%; transform:translateX(-50%); width:80%; height:auto; object-fit:contain; object-position:top center; display:block; }
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
      .bt-skill-range {
        margin-top: 4px;
        font-size: 9px;
        color: rgba(255,255,255,0.45);
        letter-spacing: 1px;
      }
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

      /* ダメージ・結果ポップ */
      .bt-dmg-pop {
        position:fixed; pointer-events:none; z-index:299999; white-space:nowrap;
        font-family:"Cinzel",serif; font-weight:700;
        animation:dmgFloat 1.6s ease-out forwards;
        transform:translateX(-50%);
      }
      /* 攻撃ダメージ：赤・大 */
      .bt-dmg-pop:not(.miss):not(.buff):not(.debuff):not(.heal) {
        font-size:26px; color:#fff;
        text-shadow:0 0 16px rgba(255,60,60,1), 0 0 32px rgba(200,30,30,.7), 0 2px 6px rgba(0,0,0,.95);
      }
      /* MISS：白薄・小 */
      .bt-dmg-pop.miss {
        font-size:15px; color:rgba(232,228,220,.5); text-shadow:none; letter-spacing:3px;
      }
      /* バフ：青緑・中 */
      .bt-dmg-pop.buff {
        font-size:15px; color:#7fe8c0;
        text-shadow:0 0 14px rgba(100,230,180,.8), 0 1px 4px rgba(0,0,0,.9);
        letter-spacing:1px;
      }
      /* デバフ付与：黄橙・中 */
      .bt-dmg-pop.debuff {
        font-size:15px; color:#f0c060;
        text-shadow:0 0 14px rgba(240,160,40,.8), 0 1px 4px rgba(0,0,0,.9);
        letter-spacing:1px;
      }
      /* 回復：緑 */
      .bt-dmg-pop.heal {
        font-size:18px; color:#5bc47a;
        text-shadow:0 0 12px rgba(91,196,122,.9), 0 1px 4px rgba(0,0,0,.9);
      }
      @keyframes dmgFloat {
        0%   { opacity:0;   transform:translateX(-50%) translateY(0)    scale(.7); }
        12%  { opacity:1;   transform:translateX(-50%) translateY(-10px) scale(1.15); }
        60%  { opacity:1;   transform:translateX(-50%) translateY(-32px) scale(1); }
        100% { opacity:0;   transform:translateX(-50%) translateY(-70px) scale(.8); }
      }

      /* 敵ターンオーバーレイ */
      #bt-enemy-turn-overlay { position:fixed; inset:0; z-index:210000; display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:opacity .25s; background:rgba(0,0,0,.25); }
      #bt-enemy-turn-overlay.active { opacity:1; pointer-events:auto; }
      .bt-enemy-turn-txt { font-family:"Cinzel",serif; font-size:26px; letter-spacing:8px; color:#c02828; text-shadow:0 0 24px rgba(200,40,40,.8); animation:etPulse 1.5s ease-out forwards; }
      @keyframes etPulse { 0%{opacity:0;transform:scale(.85)} 20%{opacity:1;transform:scale(1.04)} 80%{opacity:1;transform:scale(1)} 100%{opacity:0} }

      /* 行動キャラポップ（左下・ぼんやり浮遊） */
      .bt-acting-chara-pop {
        position:fixed;
        bottom:0; left:-10px;
        z-index:215000;
        display:flex; flex-direction:column; align-items:center;
        width:148px;
        pointer-events:none;
        opacity:0;
        transform:translateY(18px) scale(.96);
        transition:opacity .55s ease, transform .55s cubic-bezier(.22,1,.36,1);
      }
      .bt-acting-chara-pop.active {
        opacity:1;
        transform:translateY(0) scale(1);
      }
      .bt-acting-chara-pop img {
        width:148px; height:auto;
        object-fit:contain; object-position:bottom center;
        border:none;
        filter:
          drop-shadow(0 0 18px rgba(255,255,255,.18))
          drop-shadow(0 0 40px rgba(180,160,220,.15))
          drop-shadow(0 8px 24px rgba(0,0,0,.85));
        -webkit-mask-image:linear-gradient(to top, transparent 0%, rgba(0,0,0,.4) 12%, black 40%);
        mask-image:linear-gradient(to top, transparent 0%, rgba(0,0,0,.4) 12%, black 40%);
      }
      .bt-acting-chara-pop-name {
        margin-top:-24px; /* 画像下端に重ねる */
        position:relative; z-index:2;
        text-align:center; width:100%;
        font-family:"Noto Serif JP",serif;
        font-size:10px; letter-spacing:2px;
        color:rgba(232,228,220,.65);
        text-shadow:0 0 12px rgba(255,255,255,.5), 0 1px 6px rgba(0,0,0,.95);
        white-space:nowrap;
        padding-bottom:8px;
      }

        .bt-acting-chara-pop.ally {
          bottom:0;
          left:-10px;
          right:auto;
          top:auto;
        }

        .bt-acting-chara-pop.enemy {
          top:60px;
          right:-10px;
          left:auto;
          bottom:auto;
        }
    
      /* ターン番号オーバーレイ */
      #bt-turn-overlay { position:fixed; inset:0; z-index:210000; display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:opacity .25s; background:rgba(0,0,0,.18); }
      #bt-turn-overlay.active { opacity:1; }
      .bt-turn-txt { font-family:"Cinzel",serif; font-size:32px; letter-spacing:10px; color:rgba(232,228,220,.92); text-shadow:0 0 32px rgba(212,168,75,.6), 0 2px 8px rgba(0,0,0,.9); animation:turnPop 1.8s ease-out forwards; }
      @keyframes turnPop { 0%{opacity:0;transform:scale(.8) translateY(8px)} 20%{opacity:1;transform:scale(1.06) translateY(0)} 70%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1)} }

      /* 敵攻撃予告オーバーレイ */
      #bt-enemy-warning {
        position:fixed; inset:0; z-index:211000;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        gap:14px;
        opacity:0; pointer-events:none;
        transition:opacity .35s;
        background:rgba(0,0,0,.72);
      }
      #bt-enemy-warning.active { opacity:1; pointer-events:auto; }
      .bt-ew-label {
        font-family:"Cinzel",serif; font-size:9px; letter-spacing:4px;
        color:rgba(200,50,50,.7);
        animation:ewFadeIn .5s ease-out forwards;
      }
      .bt-ew-action {
        font-family:"Noto Serif JP",serif; font-size:22px; letter-spacing:4px;
        color:rgba(232,228,220,.95);
        text-shadow:0 0 20px rgba(220,60,60,.5), 0 2px 8px rgba(0,0,0,.95);
        animation:ewFadeIn .5s ease-out forwards; animation-delay:.08s;
      }
      .bt-ew-desc {
        font-family:"Noto Serif JP",serif; font-size:12px; letter-spacing:1px;
        color:rgba(232,228,220,.5);
        animation:ewFadeIn .5s ease-out forwards; animation-delay:.16s;
      }
      .bt-ew-divider {
        width:80px; height:1px;
        background:linear-gradient(90deg,transparent,rgba(200,50,50,.45),transparent);
        animation:ewFadeIn .5s ease-out forwards; animation-delay:.12s;
      }
      /* 範囲グリッド（3×3ミニマップ） */
      .bt-ew-grid {
        display:grid; grid-template-columns:repeat(3,28px); grid-template-rows:repeat(3,20px);
        gap:3px;
        animation:ewFadeIn .5s ease-out forwards; animation-delay:.2s;
      }
      .bt-ew-cell {
        border-radius:3px;
        background:rgba(255,255,255,.04);
        border:1px solid rgba(255,255,255,.08);
        transition:background .2s;
      }
      .bt-ew-cell.hit {
        background:rgba(200,40,40,.35);
        border-color:rgba(220,60,60,.7);
        box-shadow:0 0 6px rgba(200,40,40,.4);
        animation:ewCellPulse 1s ease-in-out infinite;
      }
      @keyframes ewCellPulse {
        0%,100%{ background:rgba(180,30,30,.25); border-color:rgba(200,50,50,.5); }
        50%    { background:rgba(220,50,50,.5);  border-color:rgba(240,70,70,.9); }
      }
      .bt-ew-power {
        font-family:"Cinzel",serif; font-size:11px; letter-spacing:3px;
        animation:ewFadeIn .5s ease-out forwards; animation-delay:.24s;
      }
      .bt-ew-power.tok { color:#ff6060; text-shadow:0 0 12px rgba(255,80,80,.7); }
      .bt-ew-power.dai { color:#ff9040; text-shadow:0 0 12px rgba(255,140,40,.6); }
      .bt-ew-power.chu { color:#ffd060; text-shadow:0 0 10px rgba(255,200,60,.5); }
      .bt-ew-power.sho { color:rgba(232,228,220,.5); }
      .bt-ew-tap {
        font-family:"Cinzel",serif; font-size:8px; letter-spacing:3px;
        color:rgba(232,228,220,.25);
        margin-top:8px;
        animation:ewTapBlink 1.2s ease-in-out infinite;
      }
      @keyframes ewFadeIn {
        0%  { opacity:0; transform:translateY(6px); }
        100%{ opacity:1; transform:translateY(0); }
      }
      @keyframes ewTapBlink {
        0%,100%{ opacity:.2; } 50%{ opacity:.5; }
      }

      /* EXECUTION PHASEオーバーレイ */
      #bt-exec-phase-overlay {
        position:fixed; inset:0; z-index:212000;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        gap:10px; opacity:0; pointer-events:none;
        transition:opacity .3s; background:rgba(0,0,0,.6);
      }
      #bt-exec-phase-overlay.active { opacity:1; }
      .bt-exec-phase-ja {
        font-family:"Noto Serif JP",serif; font-size:22px; letter-spacing:8px;
        color:rgba(232,228,220,.9);
        text-shadow:0 0 20px rgba(212,168,75,.5), 0 2px 6px rgba(0,0,0,.95);
        animation:execPhaseIn 2.2s ease-out forwards;
      }
      .bt-exec-phase-en {
        font-family:"Cinzel",serif; font-size:13px; letter-spacing:6px;
        color:rgba(212,168,75,.8);
        text-shadow:0 0 16px rgba(212,168,75,.5);
        animation:execPhaseIn 2.2s ease-out forwards;
        animation-delay:0.08s;
      }
      .bt-exec-phase-line {
        width:0; height:1px;
        background:linear-gradient(90deg,transparent,rgba(212,168,75,.5),transparent);
        animation:execPhaseLine 2.2s ease-out forwards;
      }
      @keyframes execPhaseIn {
        0%  { opacity:0; transform:translateY(6px); }
        18% { opacity:1; transform:translateY(0); }
        70% { opacity:1; }
        100%{ opacity:0; }
      }
      @keyframes execPhaseLine {
        0%  { width:0;     opacity:0; }
        25% { width:120px; opacity:1; }
        70% { opacity:1; }
        100%{ opacity:0; }
      }

      /* スキル名フラッシュ */
      #bt-skill-flash {
        position:fixed;
        bottom:max(130px, calc(130px + env(safe-area-inset-bottom)));
        left:50%; transform:translateX(-50%);
        z-index:216000; pointer-events:none;
        opacity:0; transition:opacity .15s;
        text-align:center; white-space:nowrap;
      }
      #bt-skill-flash.active { opacity:1; }
      .bt-skill-flash-name {
        font-family:"Noto Serif JP",serif; font-size:20px; letter-spacing:4px;
        color:rgba(232,228,220,.97);
        text-shadow:0 0 24px rgba(255,255,255,.35), 0 2px 8px rgba(0,0,0,.95);
        animation:skillFlashAnim 1.8s ease-out forwards;
      }
      .bt-skill-flash-sub {
        font-family:"Cinzel",serif; font-size:9px; letter-spacing:4px;
        color:rgba(212,168,75,.75); margin-top:5px;
        animation:skillFlashAnim 1.8s ease-out forwards;
        animation-delay:0.06s;
      }
      @keyframes skillFlashAnim {
        0%  { opacity:0; transform:translateY(6px); }
        14% { opacity:1; transform:translateY(0); }
        60% { opacity:1; }
        100%{ opacity:0; transform:translateY(-8px); }
      }

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


      /* EXECUTEボタン */
      .bt-execute-all-btn {
        display:none; width:calc(100% - 28px); margin:0 14px;
        padding:14px; border-radius:12px;
        border:1px solid rgba(212,168,75,.6);
        background:rgba(212,168,75,.12);
        color:#d4a84b; font-family:"Cinzel",serif;
        font-size:16px; letter-spacing:6px;
        cursor:pointer; text-align:center;
        box-shadow:0 0 20px rgba(212,168,75,.2);
        animation:executePulse 1.5s ease-in-out infinite;
        flex-shrink:0;
      }
      @keyframes executePulse {
        0%,100%{box-shadow:0 0 10px rgba(212,168,75,.2)}
        50%{box-shadow:0 0 24px rgba(212,168,75,.5)}
      }
      .bt-execute-all-btn:active { background:rgba(212,168,75,.25); }

      /* SETラベル */
      .bt-chara-set-label {
        position:absolute; top:3px; left:3px; z-index:20;
        font-family:"Cinzel",serif; font-size:8px; letter-spacing:1px;
        color:#d4a84b; background:rgba(0,0,0,.7);
        padding:1px 5px; border-radius:3px;
        border:1px solid rgba(212,168,75,.4);
        pointer-events:none;
      }
      .bt-chara-planning-label {
        position:absolute; top:3px; right:3px; z-index:20;
        font-family:"Cinzel",serif; font-size:10px;
        color:rgba(232,228,220,.6); background:rgba(0,0,0,.6);
        width:16px; height:16px; border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        border:1px solid rgba(255,255,255,.2);
        pointer-events:none;
        animation:planningPulse 1s ease-in-out infinite;
      }
      @keyframes planningPulse {
        0%,100%{opacity:.6} 50%{opacity:1}
      }
      /* 行動順チップのSETスタイル */
      .bt-order-chip.has-action { border-color:rgba(212,168,75,.5); background:rgba(212,168,75,.08); }
      .bt-order-chip-set { font-family:"Cinzel",serif; font-size:7px; color:#d4a84b; letter-spacing:1px; }
    
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
      (e.statusList || []).forEach(st => {
        const b = document.createElement('span');
        const cls = STATUS_BADGE_CLASS[st.type] || 'bt-status-other';
        b.className = 'bt-status-badge ' + cls;
        b.textContent = STATUS_LABEL[st.type] + (st.duration > 0 ? ' ' + st.duration : '');
        row.appendChild(b);
      });
    }
  }

  // スキル選択中の射程キャッシュ（renderEnemyGrid/renderAllyGridから参照するため先に宣言）
  let _skillRangeCache = null; // { prefix, cells } or null

  function renderEnemyGrid(highlightCells) {
    // 実体化中は敵位置と次攻撃範囲を常に表示
    const isVisible = (bs.enemy.statusList||[]).some(s => s.type === 'jittai');
    // 実体化中は次の攻撃範囲も敵グリッドに表示
    let jittaiDangerCells = null;
    if (isVisible) {
      const nextAct = peekNextAction();
      const patFn = RANGE_PATTERNS[nextAct.range || 'random1'];
      jittaiDangerCells = patFn ? patFn({ row: bs.enemy.row, col: bs.enemy.col }, bs.party) : null;
    }
    ROWS.forEach(row => {
      COLS.forEach(col => {
        const cell = document.getElementById('bt-eg-'+row+'-'+col);
        if (!cell) return;
        cell.innerHTML = '';
        const key = row+'-'+col;

        // スキル選択中の射程ハイライト（敵グリッド対象のスキル）
        if (_skillRangeCache && _skillRangeCache.prefix === 'bt-eg-') {
          const sc = _skillRangeCache.cells;
          if (sc === null || sc.has(key)) {
            cell.className = 'bt-grid-cell skill-range';
            // 実体化中なら敵画像も表示
            if (isVisible && bs.enemy.row === row && bs.enemy.col === col) {
              const card = document.createElement('div');
              card.className = 'bt-enemy-card';
              card.innerHTML = `<img class="bt-enemy-card-img" src="${bs.enemy.battleImg || bs.enemy.upImg || bs.enemy.img}" onerror="this.style.opacity='0'">`;
              cell.appendChild(card);
            }
            return;
          }
        }

        if (isVisible && bs.enemy.row === row && bs.enemy.col === col) {
          const card = document.createElement('div');
          card.className = 'bt-enemy-card';
          card.innerHTML = `<img class="bt-enemy-card-img" src="${bs.enemy.battleImg || bs.enemy.upImg || bs.enemy.img}" onerror="this.style.opacity='0'">`;
          cell.appendChild(card);
          // 実体化中：敵がいるマスは位置表示＋次攻撃範囲をdangerで重ねる
          const isDanger = jittaiDangerCells === null || (jittaiDangerCells && jittaiDangerCells.has(key));
          cell.className = 'bt-grid-cell' + (isDanger ? ' danger' : '');
        } else if (isVisible && jittaiDangerCells) {
          // 実体化中：攻撃範囲マスをdanger表示（敵がいないマスも）
          const isDanger = jittaiDangerCells === null || jittaiDangerCells.has(key);
          cell.className = 'bt-grid-cell' + (isDanger ? ' danger' : '');
        } else {
          cell.className = 'bt-grid-cell' + (highlightCells && highlightCells.has(key) ? ' highlight' : '');
        }
      });
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
        <div class="bt-skill-range">射程：${RANGE_LABEL[sk.range] || sk.range || '指定なし'}</div>
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
    setTimeout(()=>pop.remove(), 2400);
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

  function openSkillArea()  { /* 常時表示 */ }
  function closeSkillArea() { cancelSkillSelect(); }

  // ============================================================
  // フェーズ管理
  // planning: 全キャラの行動を予約する
  // executing: SPD順に一括実行
  // result: 勝敗表示
  // ============================================================
  // bs.phase: 'planning' | 'executing' | 'result'
  // bs.pendingActions: [{charaId, skill, moveTarget}] SPD順にソート済み
  // bs.planningIdx: 現在どのキャラの予約中か（turnOrder内インデックス）

  // ============================================================
  // スキル選択・予約（planning）
  // ============================================================
  let selectedSkill = null;
  let selectedChara = null;
  function selectSkill(chara, sk) {
  selectedSkill = sk;
  selectedChara = chara;

  document.querySelectorAll('.bt-skill-card-front').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.bt-skill-card-front').forEach(el => {
    if (el.dataset.skillId === sk.id) el.classList.add('selected');
  });

  highlightSkillRange(chara, sk);

  document.getElementById('bt-execute-selected').textContent =
    '「' + sk.name + '」を予約しますか？';
  document.getElementById('bt-execute-bar').classList.add('visible');
}
  function highlightSkillRange(chara, sk) {
  const isAlly = ALLY_RANGES.has(sk.range);

  if (isAlly) {
    const fn = RANGE_PATTERNS[sk.range];

    if (!fn) {
      _skillRangeCache = null;
      return;
    }

    const cells = fn(
      { row: chara.row, col: chara.col },
      bs.party
    );

    _skillRangeCache = {
      prefix: 'bt-ag-',
      cells
    };

  } else {

    const cells = getEnemyCellsFromAllyRange(
      chara,
      sk.range
    );

    _skillRangeCache = {
      prefix: 'bt-eg-',
      cells
    };
  }

  renderField();
}

  function clearSkillRangeHighlight() {
    _skillRangeCache = null;
    // renderFieldで再描画されるのでクラス直接操作は不要だが念のため残す
    document.querySelectorAll('.skill-range').forEach(el => el.classList.remove('skill-range'));
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
    renderField();
  };

  // 予約確定（「発動」→「予約」に変わる）
  window.executeSelectedSkill = function () {
    if (!selectedSkill || !selectedChara) return;
    const sk    = selectedSkill;
    const chara = selectedChara;
    cancelSkillSelect();
    reserveAction(chara, sk);
  };

  // ============================================================
  // 行動予約
  // ============================================================
  function reserveAction(chara, sk) {
    // 既存予約を上書き
    bs.pendingActions = bs.pendingActions.filter(a => a.charaId !== chara.id);
    bs.pendingActions.push({ charaId: chara.id, skill: JSON.parse(JSON.stringify(sk)) });

    // SETラベルをグリッドに表示
    renderField();
    addLog(chara.name + ' → 「' + sk.name + '」を予約');

    // 次のキャラへ、または全員予約済みならEXECUTEボタン表示
    advancePlanningCursor();
  }

  function advancePlanningCursor() {
    // 未予約のキャラをSPD順で探す
    const playerUnits = bs.turnOrder.filter(u => !u.isEnemy && u.hp > 0);
    const unset = playerUnits.find(u => !bs.pendingActions.some(a => a.charaId === u.id));

    if (unset) {
      // 次の未予約キャラのスキルを表示
      bs.planningCharaId = unset.id;
      const chara = bs.party.find(c => c.id === unset.id);
      renderSkills(chara);
      renderField();
      addLog(unset.name + ' の行動を選んでください');
    } else {
      // 全員予約完了 → EXECUTEボタン表示
      bs.planningCharaId = null;
      renderField();
      showExecuteButton();
      addLog('全員の行動が揃いました — EXECUTE');
    }
  }

  function showExecuteButton() {
    let btn = document.getElementById('bt-execute-all-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'bt-execute-all-btn';
      btn.className = 'bt-execute-all-btn';
      btn.textContent = 'EXECUTE';
      btn.onclick = () => startExecuting();
      document.getElementById('bt-log-wrap') && document.body.appendChild(btn);
      // ログの上に差し込む
      const logWrap = document.querySelector('.bt-log-wrap');
      if (logWrap) logWrap.parentNode.insertBefore(btn, logWrap);
    }
    btn.style.display = 'block';
  }

  function hideExecuteButton() {
    const btn = document.getElementById('bt-execute-all-btn');
    if (btn) btn.style.display = 'none';
  }

  // ============================================================
  // EXECUTE（一括実行）
  // ============================================================
  function startExecuting() {
    bs.phase = 'executing';
    hideExecuteButton();
    closeSkillArea();

    // CDを消費
    bs.pendingActions.forEach(a => { a.skill.cd = a.skill.cdMax; });

    // ④ EXECUTION PHASE 演出 → 実行開始
    showExecPhaseOverlay(() => {
      addLog('— EXECUTION PHASE —');
      executeNext(0);
    });
  }

  // ============================================================
  // EXECUTE 段階的処理
  // ⑤ キャラ表示(0ms)→⑥スキル名(1000ms)→⑦結果(2000ms)→次へ
  // ============================================================
  function executeNext(idx) {
    if (idx >= bs.turnOrder.length) {
      onTurnEnd();
      return;
    }

    const unit = bs.turnOrder[idx];
    renderOrder(idx);

    if (unit.isEnemy) {
      _execStepEnemy(unit, () => executeNext(idx + 1));
    } else {
      const action = bs.pendingActions.find(a => a.charaId === unit.id);
      if (!action || unit.hp <= 0) {
        setTimeout(() => executeNext(idx + 1), 400);
        return;
      }
      const chara = bs.party.find(c => c.id === unit.id);
      const battleUnit = { ...unit, img: chara.battleImg || chara.img || unit.img, isEnemy: false };
      _execStepPlayer(chara, battleUnit, action.skill, () => executeNext(idx + 1));
    }
  }

  // ⑤→⑥→⑦ プレイヤー版
  function _execStepPlayer(chara, battleUnit, skill, onNext) {
    // ⑤ キャラ画像表示
    showActingChara(battleUnit);

    // ⑥ スキル名フラッシュ（1000ms後）
    setTimeout(() => {
      showSkillFlash(skill.name);

      // ⑦ 結果（さらに1200ms後）
      setTimeout(() => {
        doPlayerAction(chara, skill, () => {
          // 結果が落ち着いてから画像を消して次へ（1200ms後）
          setTimeout(() => {
            hideActingChara();
            setTimeout(onNext, 400);
          }, 1200);
        });
      }, 1200);
    }, 1000);
  }

  // ⑤→⑥→⑦ 敵版
  function _execStepEnemy(unit, onNext) {
    const act = peekNextAction();

    // ⑤ 敵画像表示
    showActingChara(unit);

    // ⑥ 行動名フラッシュ（1000ms後）
    setTimeout(() => {
      showSkillFlash(unit.name, act.action);

      // ⑦ 結果（さらに1200ms後）
      setTimeout(() => {
        doEnemyAction(() => {
          setTimeout(() => {
            hideActingChara();
            setTimeout(onNext, 400);
          }, 1200);
        });
      }, 1200);
    }, 1000);
  }

  // ============================================================
  // プレイヤー行動実行
  // ============================================================
  // ============================================================
  // 結果ポップアップ（汎用）
  // type: 'miss' | 'dmg' | 'buff' | 'debuff' | 'heal'
  // ============================================================
  function showResultPop(el, text, type) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pop = document.createElement('div');
    const cls = {
      miss:   'bt-dmg-pop miss',
      dmg:    'bt-dmg-pop',
      buff:   'bt-dmg-pop buff',
      debuff: 'bt-dmg-pop debuff',
      heal:   'bt-dmg-pop heal',
    }[type] || 'bt-dmg-pop';
    pop.className = cls;
    pop.textContent = text;
    const cx = rect.left + rect.width / 2;
    pop.style.cssText = `left:${cx}px;top:${rect.top + 10}px;transform:translateX(-50%);`;
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 2000);
  }

  // ============================================================
  // ステータス効果の定数定義
  // ============================================================
  const STATUS_LABEL = {
    jittai:       '実体化',
    stun:         'スタン',
    atk_down:     'ATK↓',
    def_down:     'DEF↓',
    spd_down:     'SPD↓',
    atk_up:       'ATK↑',
    def_up:       'DEF↑',
    spd_up:       'SPD↑',
    sure_hit_self: '必中(自)',
    sure_hit_team: '必中(全)',
  };
  const STATUS_BADGE_CLASS = {
    jittai:       'bt-status-jittai',
    stun:         'bt-status-stun',
    atk_down:     'bt-status-debuff',
    def_down:     'bt-status-debuff',
    spd_down:     'bt-status-debuff',
    atk_up:       'bt-status-buff',
    def_up:       'bt-status-buff',
    spd_up:       'bt-status-buff',
    sure_hit_self: 'bt-status-buff',
    sure_hit_team: 'bt-status-buff',
  };
  // ステータス変動倍率
  const STATUS_MOD_RATE = 0.25; // 25%変動

  // ============================================================
  // statusList管理ユーティリティ
  // ============================================================
  // unit.statusList = [ { type, duration } ]
  // duration: -1=永続, 0=このターン終了時に除去, n=nターン後除去

  function hasStatus(unit, type) {
    return (unit.statusList || []).some(s => s.type === type);
  }

  function addStatus(unit, type, duration) {
    if (!unit.statusList) unit.statusList = [];
    // 同種は上書き（durationが長い方を採用）
    const existing = unit.statusList.find(s => s.type === type);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
    } else {
      unit.statusList.push({ type, duration });
    }
    _rebuildStatusMod(unit);
  }

  function removeStatus(unit, type) {
    if (!unit.statusList) return;
    unit.statusList = unit.statusList.filter(s => s.type !== type);
    _rebuildStatusMod(unit);
  }

  // ステータス変動をユニットの実数値に反映
  function _rebuildStatusMod(unit) {
    if (!unit._base) {
      unit._base = { atk: unit.atk, def: unit.def, spd: unit.spd };
    }
    const mod = {};
    (unit.statusList || []).forEach(s => {
      if (s.type === 'atk_down') mod.atk_down = STATUS_MOD_RATE;
      if (s.type === 'def_down') mod.def_down = STATUS_MOD_RATE;
      if (s.type === 'spd_down') mod.spd_down = STATUS_MOD_RATE;
      if (s.type === 'atk_up')  mod.atk_up  = STATUS_MOD_RATE;
      if (s.type === 'def_up')  mod.def_up  = STATUS_MOD_RATE;
      if (s.type === 'spd_up')  mod.spd_up  = STATUS_MOD_RATE;
    });
    unit._statusMod = mod;
    // 実数値に反映
    unit.atk = Math.floor(unit._base.atk * (1 + (mod.atk_up||0) - (mod.atk_down||0)));
    unit.def = Math.floor(unit._base.def * (1 + (mod.def_up||0) - (mod.def_down||0)));
    unit.spd = Math.floor(unit._base.spd * (1 + (mod.spd_up||0) - (mod.spd_down||0)));
  }

  // ターン終了時にdurationを1消費し、0になったら除去
  function tickStatusList(unit) {
    if (!unit.statusList) return;
    unit.statusList = unit.statusList.filter(s => {
      if (s.duration === -1) return true; // 永続
      s.duration--;
      return s.duration > 0;
    });
    _rebuildStatusMod(unit);
  }

  // ============================================================
  // 単一エフェクト適用エンジン
  // effect: { type, target, hit, duration, amount }
  // ============================================================
  const ROW_IDX_MAP = { near:0, mid:1, far:2 };
  const COL_IDX_MAP = { left:0, center:1, right:2 };
  const ROW_BY_IDX_MAP = ['near','mid','far'];
  const COL_BY_IDX_MAP = ['left','center','right'];

  function _applyEffect(effect, chara, showPop) {
    const dur = (effect.duration != null) ? effect.duration : 1;
    const effectHit = effect.hit != null ? effect.hit : 100;

    // 命中判定（必中フラグ考慮）
    const isSureHit = hasStatus(chara, 'sure_hit_self') || hasStatus(chara, 'sure_hit_team') ||
                      bs.party.some(c => c.id !== chara.id && hasStatus(c, 'sure_hit_team'));
    const landed = isSureHit ? true : (Math.random() * 100 < effectHit);

    const enemyCell = () => document.getElementById('bt-eg-' + bs.enemy.row + '-' + bs.enemy.col);
    const allyCell  = (c) => document.getElementById('bt-ag-' + c.row + '-' + c.col);

    // ── 敵対象 ─────────────────────────────────────────────
    if (effect.target === 'enemy') {
      if (!landed) {
        showPop && showResultPop(enemyCell(), 'MISS', 'miss');
        return false;
      }
      switch (effect.type) {

        case 'jittai':
          addStatus(bs.enemy, 'jittai', dur);
          showPop && showResultPop(enemyCell(), '実体化▲', 'debuff');
          addLog('→ 実体化付与 (' + dur + 'T)');
          break;

        case 'stun':
          addStatus(bs.enemy, 'stun', dur);
          showPop && showResultPop(enemyCell(), 'スタン▲', 'debuff');
          addLog('→ スタン付与 (' + dur + 'T)');
          break;

        case 'atk_down':
          addStatus(bs.enemy, 'atk_down', dur);
          showPop && showResultPop(enemyCell(), 'ATK↓', 'debuff');
          addLog('→ ATKダウン (' + dur + 'T)');
          break;

        case 'def_down':
          addStatus(bs.enemy, 'def_down', dur);
          showPop && showResultPop(enemyCell(), 'DEF↓', 'debuff');
          addLog('→ DEFダウン (' + dur + 'T)');
          break;

        case 'spd_down':
          addStatus(bs.enemy, 'spd_down', dur);
          showPop && showResultPop(enemyCell(), 'SPD↓', 'debuff');
          addLog('→ SPDダウン (' + dur + 'T)');
          break;

        // 敵強制移動
        case 'pull_1': case 'pull_2': {
          const steps = effect.type === 'pull_1' ? 1 : 2;
          const ri = ROW_IDX_MAP[bs.enemy.row];
          const newRi = Math.max(0, ri - steps); // near方向
          bs.enemy.row = ROW_BY_IDX_MAP[newRi];
          showPop && showResultPop(enemyCell(), '吸寄' + steps, 'debuff');
          addLog('→ 敵を' + steps + 'マス前へ');
          break;
        }
        case 'push_1': case 'push_2': {
          const steps = effect.type === 'push_1' ? 1 : 2;
          const ri = ROW_IDX_MAP[bs.enemy.row];
          const newRi = Math.min(2, ri + steps); // far方向
          bs.enemy.row = ROW_BY_IDX_MAP[newRi];
          showPop && showResultPop(enemyCell(), '押出' + steps, 'debuff');
          addLog('→ 敵を' + steps + 'マス後へ');
          break;
        }
        case 'shift_right_1': case 'shift_right_2': {
          const steps = effect.type === 'shift_right_1' ? 1 : 2;
          const ci = COL_IDX_MAP[bs.enemy.col];
          const newCi = Math.min(2, ci + steps);
          bs.enemy.col = COL_BY_IDX_MAP[newCi];
          showPop && showResultPop(enemyCell(), '右寄' + steps, 'debuff');
          addLog('→ 敵を' + steps + 'マス右へ');
          break;
        }
        case 'shift_left_1': case 'shift_left_2': {
          const steps = effect.type === 'shift_left_1' ? 1 : 2;
          const ci = COL_IDX_MAP[bs.enemy.col];
          const newCi = Math.max(0, ci - steps);
          bs.enemy.col = COL_BY_IDX_MAP[newCi];
          showPop && showResultPop(enemyCell(), '左寄' + steps, 'debuff');
          addLog('→ 敵を' + steps + 'マス左へ');
          break;
        }
      }
      return true;
    }

    // ── 味方対象 ────────────────────────────────────────────
    // target: 'ally_self' | 'ally_all' | 'ally_target'
    const allyTargets = effect.target === 'ally_all'
      ? bs.party.filter(c => c.hp > 0)
      : [chara];

    allyTargets.forEach(target => {
      if (!landed) {
        showPop && showResultPop(allyCell(target), 'MISS', 'miss');
        return;
      }
      switch (effect.type) {
        case 'atk_up':
          addStatus(target, 'atk_up', dur);
          showPop && showResultPop(allyCell(target), 'ATK↑', 'buff');
          addLog('→ ATKアップ (' + dur + 'T)');
          break;
        case 'def_up':
          addStatus(target, 'def_up', dur);
          showPop && showResultPop(allyCell(target), 'DEF↑', 'buff');
          addLog('→ DEFアップ (' + dur + 'T)');
          break;
        case 'spd_up':
          addStatus(target, 'spd_up', dur);
          showPop && showResultPop(allyCell(target), 'SPD↑', 'buff');
          addLog('→ SPDアップ (' + dur + 'T)');
          break;
        case 'sure_hit_self':
          addStatus(target, 'sure_hit_self', dur);
          showPop && showResultPop(allyCell(target), '必中▲', 'buff');
          addLog('→ 次回必中(自)');
          break;
        case 'sure_hit_team':
          bs.party.filter(c => c.hp > 0).forEach(c => addStatus(c, 'sure_hit_team', dur));
          showPop && showResultPop(allyCell(target), '必中▲(全)', 'buff');
          addLog('→ 次回必中(全)');
          break;
        case 'heal':
          const heal = Math.floor(target.hpMax * (effect.amount || 0.15));
          target.hp = Math.min(target.hpMax, target.hp + heal);
          showPop && showResultPop(allyCell(target), '+' + heal, 'heal');
          addLog('→ HP回復 +' + heal);
          break;
      }
    });
    return landed;
  }

  // ============================================================
  // doPlayerAction：effects[]ベースに全面刷新
  // ============================================================
  function doPlayerAction(chara, skill, onDone) {
    addLog(chara.name + '「' + skill.name + '」');

    const isAlly = ALLY_RANGES.has(skill.range);
    let targets;
    if (isAlly) {
      targets = getTargets(skill.range, { row: chara.row, col: chara.col }, bs.party);
    } else {
      targets = getEnemyTargetsFromAllyRange(chara, skill.range);
    }

    // 必中チェック（自分or味方の sure_hit で命中率100%扱い）
    const sureHit = hasStatus(chara, 'sure_hit_self') || hasStatus(chara, 'sure_hit_team') ||
                    bs.party.some(c => c.id !== chara.id && hasStatus(c, 'sure_hit_team'));
    // 必中消費
    if (sureHit) {
      removeStatus(chara, 'sure_hit_self');
      // sure_hit_team は全員から消費
      bs.party.forEach(c => removeStatus(c, 'sure_hit_team'));
    }

    // ── ダメージ処理 ──────────────────────────────────────────
    const hasDmg = (skill.multiplier || 0) > 0;
    if (hasDmg) {
      if (targets.length === 0) {
        addLog('— 範囲内に標的なし');
        const fallback = document.getElementById('bt-eg-' + bs.enemy.row + '-' + bs.enemy.col);
        showResultPop(fallback, 'MISS', 'miss');
        setTimeout(() => { renderField(); onDone(); }, 1800);
        return;
      }
      const hit = sureHit ? true : hitCheck(skill.hit, chara.accuracy);
      if (!hit) {
        addLog('— 外れた');
        const cell = document.getElementById('bt-eg-' + bs.enemy.row + '-' + bs.enemy.col);
        showResultPop(cell, 'MISS', 'miss');
        setTimeout(() => { renderField(); onDone(); }, 1800);
        return;
      }
      targets.forEach(() => {
        const dmg = calcDamage(chara.atk, bs.enemy.def, bs.enemy, skill.multiplier);
        bs.enemy.hp = Math.max(0, bs.enemy.hp - dmg);
        addLog('→ ' + dmg + ' ダメージ');
        const cell = document.getElementById('bt-eg-' + bs.enemy.row + '-' + bs.enemy.col);
        showResultPop(cell, '-' + dmg, 'dmg');
      });
      renderHeader();
      renderField();
      if (bs.enemy.hp <= 0) { setTimeout(() => onBattleEnd(true), 1200); return; }
    }

    // ── effects[] 処理 ────────────────────────────────────────
    const effects = skill.effects || [];
    let effectDelay = hasDmg ? 400 : 0;
    effects.forEach(effect => {
      setTimeout(() => {
        _applyEffect(effect, chara, true);
        renderHeader();
        renderField();
        // 行動順をSPD変動に合わせて再計算
        if (['spd_up','spd_down'].includes(effect.type)) {
          bs.turnOrder = calcTurnOrder(bs.party, bs.enemy);
          renderOrder(null);
        }
      }, effectDelay);
      effectDelay += 300;
    });

    // ── 移動スキル ────────────────────────────────────────────
    if (skill.type === 'move') {
      addLog(chara.name + '「' + skill.name + '」を使用');
      renderField();
    }

    setTimeout(onDone, Math.max(800, effectDelay + 200));
  }

  // ============================================================
  // 敵行動実行
  // ============================================================
  function doEnemyAction(onDone) {
    // ── スタン中は行動スキップ ────────────────────────────────
    if (hasStatus(bs.enemy, 'stun')) {
      addLog('怪異：スタン — 行動できない');
      const cell = document.getElementById('bt-eg-' + bs.enemy.row + '-' + bs.enemy.col);
      showResultPop(cell, 'STUN', 'miss');
      consumeAction(); // 行動インデックスは進める
      setTimeout(onDone, 800);
      return;
    }

    const act = consumeAction();
    addLog('怪異：' + act.action);

    if (bs.party.filter(c=>c.hp>0).length === 0) { onBattleEnd(false); return; }

    const targets = getTargets(act.range || 'random1', {row:bs.enemy.row, col:bs.enemy.col}, bs.party);

    if (targets.length > 0) {
      // 複数ターゲットは200ms刻みで順番にダメージ
      let delay = 0;
      targets.forEach(target => {
        setTimeout(() => {
          const dmg = calcEnemyDamage(bs.enemy, target);
          target.hp = Math.max(0, target.hp - dmg);
          renderField();
          const cell = document.getElementById('bt-ag-'+target.row+'-'+target.col);
          showResultPop(cell, '-' + dmg, 'dmg');
        }, delay);
        delay += 300;
      });
      setTimeout(() => {
        checkPartyDead();
        renderHeader();
        moveEnemy();
        onDone();
      }, delay + 400);
    } else {
      // 攻撃範囲に誰もいない
      const anycell = document.getElementById('bt-ag-'+bs.party.filter(c=>c.hp>0)[0]?.row+'-'+bs.party.filter(c=>c.hp>0)[0]?.col);
      showResultPop(anycell, 'MISS', 'miss');
      moveEnemy();
      setTimeout(onDone, 600);
    }
  }

  // ============================================================
  // 怪異移動
  // ============================================================
  function moveEnemy() {
    if (Math.random() < 0.25) return;
    const _R = ['near','mid','far'];
    const _C = ['left','center','right'];
    bs.enemy.row = _R[Math.floor(Math.random()*3)];
    bs.enemy.col = _C[Math.floor(Math.random()*3)];
    renderField();
  }

  // ============================================================
  // ターン終了処理
  // ============================================================
  function onTurnEnd() {
    bs.turn++;
    bs.phase = 'planning';
    bs.pendingActions = [];
    bs.planningCharaId = null;

    // CD消化
    bs.party.forEach(c => c.skills.forEach(sk => { if (sk.cd > 0) sk.cd--; }));

    // ── statusList持続ターン消化 ──────────────────────────────
    tickStatusList(bs.enemy);
    bs.party.forEach(c => tickStatusList(c));

    // 行動順をSPDバフ変動後に再計算
    bs.turnOrder = calcTurnOrder(bs.party, bs.enemy);

    addLog('— ターン ' + bs.turn + ' —');
    renderOrder(null);
    renderField();

    setTimeout(() => showTurnOverlay(bs.turn, () => startPlanning()), 1000);
  }

  // ============================================================
  // EXECUTE中・行動キャラポップ表示
  // ============================================================
  function showActingChara(unit) {
  let pop = document.getElementById('bt-acting-chara-pop');

  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'bt-acting-chara-pop';
    document.body.appendChild(pop);
  }

  const img = unit.isEnemy
    ? (unit.battleImg || unit.upImg || unit.img || '')
    : (unit.img || '');

  pop.className = unit.isEnemy
    ? 'bt-acting-chara-pop enemy'
    : 'bt-acting-chara-pop ally';

  pop.style.position = 'fixed';

  pop.innerHTML = `<img src="${img}" onerror="this.style.opacity='0'">`;

  pop.classList.remove('active');
  void pop.offsetWidth;
  pop.classList.add('active');
}

  function hideActingChara() {
    const pop = document.getElementById('bt-acting-chara-pop');
    if (pop) { pop.classList.remove('active'); setTimeout(() => { if(pop.parentNode) pop.remove(); }, 1400); }
  }

  // EXECUTION PHASEオーバーレイ
  function showExecPhaseOverlay(onDone) {
    let el = document.getElementById('bt-exec-phase-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bt-exec-phase-overlay';
      document.body.appendChild(el);
    }
    el.innerHTML = '<div class="bt-exec-phase-ja">\u57f7\u884c\u30d5\u30a7\u30fc\u30ba</div><div class="bt-exec-phase-line"></div><div class="bt-exec-phase-en">EXECUTION PHASE</div>';
    el.classList.remove('active');
    void el.offsetWidth;
    el.classList.add('active');
    setTimeout(() => {
      el.classList.remove('active');
      if (onDone) setTimeout(onDone, 300);
    }, 2000);
  }

  // スキル名フラッシュ
  function showSkillFlash(skillName) {
  let el = document.getElementById('bt-skill-flash');

  if (!el) {
    el = document.createElement('div');
    el.id = 'bt-skill-flash';
    document.body.appendChild(el);
  }

  el.innerHTML =
    '<div class="bt-skill-flash-name">「' + skillName + '」</div>';

  el.classList.remove('active');
  void el.offsetWidth;
  el.classList.add('active');

  setTimeout(() => el.classList.remove('active'), 1800);
}

  // ターン番号オーバーレイ（TURN 01 形式）
  function showTurnOverlay(turnNum, onDone) {
    let overlay = document.getElementById('bt-turn-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'bt-turn-overlay';
      document.body.appendChild(overlay);
    }
    const label = 'TURN ' + String(turnNum).padStart(2, '0');
    overlay.innerHTML = '';
    const txt = document.createElement('div');
    txt.className = 'bt-turn-txt';
    txt.textContent = label;
    overlay.appendChild(txt);
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');
    setTimeout(() => {
      overlay.classList.remove('active');
      // TURNオーバーレイ後 → 攻撃予告 → onDone
      setTimeout(() => showEnemyWarning(onDone), 300);
    }, 1800);
  }

  // 敵攻撃予告オーバーレイ
  function showEnemyWarning(onDone) {
    const act = peekNextAction();
    const isRandom = (act.range || 'random1') === 'random1';

    let el = document.getElementById('bt-enemy-warning');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bt-enemy-warning';
      document.body.appendChild(el);
    }

    // 威力ランクテキスト＆クラス
    const powerMap = { '特大':['特大ダメージ','tok'], '大':['大ダメージ','dai'], '中':['中ダメージ','chu'], '小':['小ダメージ','sho'] };
    const [powerTxt, powerCls] = powerMap[act.power] || ['ダメージ','sho'];

    // 攻撃説明文を生成
    const descText = isRandom
      ? 'ランダムで1体に' + powerTxt
      : act.action + 'の範囲に' + powerTxt;

    // 範囲グリッドHTML（random1以外）
    let gridHTML = '';
    if (!isRandom) {
      const patFn = RANGE_PATTERNS[act.range];
      // bs.partyを渡すことでrandom1等も正しく機能する（ミニグリッドではランダム要素は無視）
      const cells = patFn ? patFn({row:bs.enemy.row, col:bs.enemy.col}, bs.party || []) : null;
      const ROWS_ = ['near','mid','far'];
      const COLS_ = ['left','center','right'];
      gridHTML = '<div class="bt-ew-grid">';
      ROWS_.forEach(r => {
        COLS_.forEach(c => {
          const hit = cells === null || cells.has(r+'-'+c);
          gridHTML += `<div class="bt-ew-cell${hit?' hit':''}"></div>`;
        });
      });
      gridHTML += '</div>';
    }

    el.innerHTML = `
      <div class="bt-ew-label">— 怪異の行動 —</div>
      <div class="bt-ew-action">${act.action}</div>
      <div class="bt-ew-divider"></div>
      <div class="bt-ew-desc">${descText}</div>
      ${gridHTML}
      <div class="bt-ew-power ${powerCls}">${powerTxt}</div>
      <div class="bt-ew-tap">TAP TO CONTINUE</div>
    `;

    el.classList.remove('active');
    void el.offsetWidth;
    el.classList.add('active');

    // タップで閉じる
    const close = () => {
      el.removeEventListener('touchstart', close);
      el.removeEventListener('click', close);
      el.classList.remove('active');
      if (onDone) setTimeout(onDone, 300);
    };
    setTimeout(() => {
      el.addEventListener('touchstart', close, { passive:true, once:true });
      el.addEventListener('click', close, { once:true });
    }, 600); // 誤タップ防止で少し遅らせる
  }

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
  // Planning開始
  // ============================================================
  function startPlanning() {
    bs.phase = 'planning';
    bs.pendingActions = [];
    bs.planningCharaId = null;
    hideExecuteButton();

    const playerUnits = bs.turnOrder.filter(u => !u.isEnemy && u.hp > 0);
    if (playerUnits.length === 0) { onBattleEnd(false); return; }

    bs.planningCharaId = playerUnits[0].id;
    const chara = bs.party.find(c => c.id === playerUnits[0].id);
    renderSkills(chara);
    renderField();
    addLog(playerUnits[0].name + ' の行動を選んでください');
  }

  // ============================================================
  // 行動順表示（executingフェーズ用：現在実行中を強調）
  // ============================================================
  function renderOrder(activeIdx) {
    const list = document.getElementById('bt-order-list');
    if (!list) return;
    list.innerHTML = '';
    bs.turnOrder.forEach((u, i) => {
      const chip = document.createElement('div');
      // pendingActionsに予約があるかチェック
      const hasAction = !u.isEnemy && bs.pendingActions && bs.pendingActions.some(a => a.charaId === u.id);
      const isActive  = activeIdx !== null && i === activeIdx;
      chip.className = 'bt-order-chip'
        + (u.isEnemy  ? ' is-enemy'  : '')
        + (isActive   ? ' is-active' : '')
        + (hasAction  ? ' has-action': '');
      chip.innerHTML = `
        <div class="bt-order-chip-name">${u.name}</div>
        <div class="bt-order-chip-spd">${u.spd}</div>
        ${hasAction ? '<div class="bt-order-chip-set">SET</div>' : ''}
      `;
      list.appendChild(chip);
    });
  }

  // ============================================================
  // フィールドレンダリング（SETラベル付き）
  // ============================================================
  function renderAllyGrid(highlightCells) {
    // 実体化に関わらず常に次の攻撃範囲を表示する
    const nextAct     = peekNextAction();
    const isRandom    = (nextAct.range || 'random1') === 'random1';
    const patFn       = RANGE_PATTERNS[nextAct.range || 'random1'];
    // patFnがnull返し（全体攻撃）の場合はdangerCells=nullで全マス対象
    const dangerCells = (!isRandom && patFn)
      ? patFn({row:bs.enemy.row, col:bs.enemy.col}, bs.party)
      : null;

    ROWS.forEach(row => {
      COLS.forEach(col => {
        const cell = document.getElementById('bt-ag-'+row+'-'+col);
        if (!cell) return;
        cell.innerHTML = '';
        const key = row+'-'+col;
        let cls = 'bt-grid-cell';
        // スキル選択中の射程ハイライト（味方グリッド対象のスキル）
        if (_skillRangeCache && _skillRangeCache.prefix === 'bt-ag-') {
          const sc = _skillRangeCache.cells;
          if (sc === null || sc.has(key)) { cell.className = cls + ' skill-range'; return; }
        }
        if (highlightCells && highlightCells.has(key)) {
          cls += ' highlight';
        } else if (isRandom) {
          cls += ' danger-random';
        } else if (dangerCells === null || dangerCells.has(key)) {
          cls += ' danger';
        }
        cell.className = cls;
      });
    });

    const planningId = bs.planningCharaId;

    bs.party.forEach(c => {
      const cell = document.getElementById('bt-ag-'+c.row+'-'+c.col);
      if (!cell) return;
      const hpRate   = c.hp / c.hpMax * 100;
      const isPlanning = c.id === planningId;
      const action   = bs.pendingActions && bs.pendingActions.find(a => a.charaId === c.id);
      const isInactive = bs.phase === 'planning' && !isPlanning && !action && c.hp > 0;

      const card = document.createElement('div');
      card.className = 'bt-chara-card'
        + (isInactive ? ' is-inactive' : '')
        + (c.hp <= 0  ? ' is-disabled' : '');

      card.innerHTML = `
        <img class="bt-chara-img" src="${c.img}" onerror="this.style.opacity='0'">
        ${action ? `<div class="bt-chara-set-label">SET</div>` : ''}
        ${isPlanning ? `<div class="bt-chara-planning-label">?</div>` : ''}
        <div class="bt-chara-hp-bar-outer">
          <div class="bt-chara-hp-bar-fill ${hpRate < 25 ? 'crit' : hpRate < 50 ? 'low' : ''}" style="width:${hpRate}%"></div>
        </div>
      `;
      if (c.hp > 0) card.onclick = () => onCharaTap(c.id);
      cell.appendChild(card);
    });
  }

  // ============================================================
  // キャラポップアップ（タップ）
  // ============================================================
  let charaPopupTimer = null;

  function onCharaTap(id) {
    // planning中は現在予約中のキャラをタップで切り替え
    if (bs.phase === 'planning') {
      const chara = bs.party.find(c => c.id === id && c.hp > 0);
      if (chara) {
        // カードがすでにめくられていたら再ドロー不可（ロック）
        const flipped = document.querySelectorAll('.bt-skill-card-inner.flipped');
        if (flipped.length > 0) {
          // ポップアップのみ表示して終了
          showCharaPopup(id);
          return;
        }
        bs.planningCharaId = id;
        renderSkills(chara);
        renderField();
        addLog(chara.name + ' の行動を選んでください');
        return;
      }
    }
    showCharaPopup(id);
  }

  function showCharaPopup(id) {
    const chara = bs.party.find(c => c.id === id);
    if (!chara) return;
    closeCharaPopup();

    const pct     = chara.hp / chara.hpMax;
    const hpClass = pct < 0.25 ? 'crit' : pct < 0.5 ? 'low' : '';
    const action  = bs.pendingActions && bs.pendingActions.find(a => a.charaId === id);
    const statusHTML = chara.status && chara.status.length
      ? chara.status.map(st =>
          `<span class="bt-status-badge ${st==='実体化'?'bt-status-jittai':'bt-status-shibari'}">${st}</span>`
        ).join('')
      : '<span style="font-size:9px;color:rgba(232,228,220,.3)">状態異常なし</span>';

    const popup = document.createElement('div');
    popup.id = 'bt-chara-popup';
    popup.className = 'bt-chara-popup';
    popup.innerHTML = `
      <div class="bt-chara-popup-name">${chara.name}</div>
      <div class="bt-chara-popup-hp ${hpClass}">HP :&nbsp;&nbsp;<span>${chara.hp} / ${chara.hpMax}</span></div>
      ${action ? `<div style="font-size:10px;color:#d4a84b;letter-spacing:1px;margin-top:4px">SET : ${action.skill.name}</div>` : ''}
      <div class="bt-chara-popup-status">${statusHTML}</div>
    `;

    const cell = document.getElementById('bt-ag-'+chara.row+'-'+chara.col);
    const rect = cell ? cell.getBoundingClientRect() : null;
    if (rect) {
      document.body.appendChild(popup);
      const popH = popup.offsetHeight || 100;
      const top  = rect.top - popH - 8 < 10 ? rect.bottom + 8 : rect.top - popH - 8;
      popup.style.top  = top + 'px';
      popup.style.left = Math.min(Math.max(rect.left + rect.width/2 - popup.offsetWidth/2, 8), window.innerWidth - popup.offsetWidth - 8) + 'px';
    } else {
      document.body.appendChild(popup);
    }

    requestAnimationFrame(() => popup.classList.add('active'));
    charaPopupTimer = setTimeout(closeCharaPopup, 10000);
    setTimeout(() => {
      document.addEventListener('touchstart', closeCharaPopup, {once:true, passive:true});
      document.addEventListener('mousedown',  closeCharaPopup, {once:true});
    }, 100);
  }

  function closeCharaPopup() {
    if (charaPopupTimer) { clearTimeout(charaPopupTimer); charaPopupTimer = null; }
    const p = document.getElementById('bt-chara-popup');
    if (p) { p.classList.remove('active'); setTimeout(() => p.remove(), 400); }
  }

  // ============================================================
  // 移動モード（planningフェーズ内）
  // ============================================================
  let _savedSkillCardsHTML = null; // 移動モード突入前のカードHTML退避用

  window.battleMoveMode = function () {
    if (bs.phase !== 'planning') return;
    const chara = bs.party.find(c => c.id === bs.planningCharaId);
    if (!chara) return;

    if (moveMode) { cancelMoveMode(); return; }
    moveMode = true;
    movingCharaId = chara.id;

    const cards = document.getElementById('bt-skill-cards');
    const hint  = document.querySelector('.bt-skill-hint');
    // カードの現在の中身を退避してからキャンセル表示に切り替え
    if (cards) {
      cards.innerHTML = '<div class="bt-move-cancel" onclick="battleMoveMode()">タップでキャンセル</div>';
    }
    if (hint)  hint.style.display = 'none';
    const btn = document.getElementById('bt-move-card');
    if (btn) btn.classList.add('move-active');

    renderFieldMoveMode();
    addLog('移動先のマスを選んでください');
  };

  function cancelMoveMode() {
  moveMode = false;
  movingCharaId = null;
  _savedSkillCardsHTML = null;

  const btn = document.getElementById('bt-move-card');
  if (btn) btn.classList.remove('move-active');

  const hint = document.querySelector('.bt-skill-hint');
  if (hint) hint.style.display = '';

  const chara = bs.party.find(c => c.id === bs.planningCharaId);
  if (chara) renderSkills(chara);

  renderField();
  addLog('移動キャンセル');
}

  function renderFieldMoveMode() {
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
      if (!occupied.has(row+'-'+col) && !(mover && mover.row===row && mover.col===col)) {
        cell.className = 'bt-grid-cell movable';
        cell.onclick = () => executeMove(row, col);
      }
    }));
    bs.party.filter(c=>c.hp>0).forEach(c => {
      const cell = document.getElementById('bt-ag-'+c.row+'-'+c.col);
      if (!cell) return;
      const hpRate = c.hp / c.hpMax * 100;
      const card = document.createElement('div');
      card.className = 'bt-chara-card' + (c.id===movingCharaId?' is-acting':'');
      card.innerHTML = `
        <img class="bt-chara-img" src="${c.img}" onerror="this.style.opacity='0'">
        <div class="bt-chara-hp-bar-outer"><div class="bt-chara-hp-bar-fill" style="width:${hpRate}%"></div></div>
      `;
      cell.appendChild(card);
    });
    renderEnemyGrid();
  }

  function executeMove(toRow, toCol) {
    if (!moveMode || !movingCharaId) return;
    const mover = bs.party.find(c=>c.id===movingCharaId);
    if (!mover) return;
    const RL={near:'近',mid:'中',far:'遠'}, CL={left:'左',center:'中',right:'右'};
    addLog(mover.name+' '+RL[mover.row]+CL[mover.col]+' → '+RL[toRow]+CL[toCol]);
    mover.row = toRow; mover.col = toCol; mover.pos = toRow;
    moveMode = false; movingCharaId = null;
    const btn = document.getElementById('bt-move-card');
    if (btn) btn.classList.remove('move-active');
    const hint = document.querySelector('.bt-skill-hint');
    if (hint) hint.style.display = '';

    // 移動も予約として登録
    reserveAction(mover, { id:'move', name:'移動', type:'move', range:'ally_self', hit:100, multiplier:1.0, cd:0, cdMax:0 });
  }

  // ============================================================
  // 勝敗
  // ============================================================
  function checkPartyDead() {
    if (bs.party.filter(c=>c.hp>0).length === 0) onBattleEnd(false);
  }

  function onBattleEnd(win) {
    bs.phase = 'result';
    hideExecuteButton();
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
      banner.querySelector('.bt-result-txt').className   = 'bt-result-txt '+(win?'win':'lose');
      banner.querySelector('.bt-result-btn').textContent = win?'祀りへ進む':'撤退する';
    }
    addLog(win ? '怪異を祓った——' : '敗北…');
    setTimeout(() => banner.classList.add('active'), 800);
  }

  // ============================================================
  // 詳細ポップアップ
  // ============================================================
  window.showNextDetail = function () {
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
  // 起動・終了
  // ============================================================
  function startBattle(party, enemy) {
      console.log('startBattle enemy arg:', enemy);
    bs = {
      party:           JSON.parse(JSON.stringify(party  || DUMMY_PARTY)),
      enemy:           JSON.parse(JSON.stringify(enemy  || DUMMY_ENEMY)),
      turn:            1,
      actingIdx:       0,
      phase:           'planning',
      pendingActions:  [],
      planningCharaId: null,
    };
    const _R=['near','mid','far'], _C=['left','center','right'];
    bs.enemy.row = _R[Math.floor(Math.random()*3)];
    bs.enemy.col = _C[Math.floor(Math.random()*3)];

    const ENEMY_TYPE_RANGE = {
  atk_all: 'all',
  atk_single: 'random1',
  atk_near: 'row_near',
  atk_mid: 'row_mid',
  atk_far: 'row_far',
  atk_center: 'col_center',
  atk_right: 'col_right',
  atk_left: 'col_left',
  atk_cross: 'cross',
  atk_xcross: 'xcross'
};

if (bs.enemy.actionPattern) {
  bs.enemy.actionPattern = bs.enemy.actionPattern.map(a => ({
    ...a,
    range: a.range || ENEMY_TYPE_RANGE[a.type] || 'random1',
    power: a.power || '中'
  }));
}

    // statusList初期化
    bs.enemy.statusList = [];
    bs.enemy._statusMod = {};
    bs.enemy._base = { atk: bs.enemy.atk, def: bs.enemy.def, spd: bs.enemy.spd };
    bs.party.forEach(c => {
      c.statusList = [];
      c._statusMod = {};
      c._base = { atk: c.atk, def: c.def, spd: c.spd };
    });

    bs.turnOrder = calcTurnOrder(bs.party, bs.enemy);
    locked = false; moveMode = false; movingCharaId = null;

    const el = buildBattleScreen();
    el.style.display = 'flex';
    void el.offsetWidth;
    el.style.opacity = '1';

    const banner = document.getElementById('bt-result-banner');
    if (banner) banner.classList.remove('active');
    hideExecuteButton();
    closeNextDetail();
    closeSkillDetail();

    renderHeader();
    renderOrder(null);
    renderField();

    setTimeout(() => showTurnOverlay(bs.turn, () => startPlanning()), 800);
  }

  function closeBattle() {
    const el = document.getElementById('battle-root');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => { el.style.display='none'; locked=false; }, 1200);
  }

  window.startBattle = startBattle;
  window.closeBattle = closeBattle;

})();