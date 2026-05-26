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
  // 範囲パターン定義（後方互換レイヤー）
  // ⚠ 新規スキルには battle_range.js の RANGE_PRESETS / FIELD_PRESETS を使用すること。
  //   ここは highlightSkillRange（ally系）や ALLY_RANGES 判定のために残している。
  //   敵攻撃の範囲計算・スキル範囲ハイライト・ダメージ対象取得は
  //   すべて BattleRange.getCellsFromRange / getUnitsFromRange に移行済み。
  //
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

  // ── BattleRange ラッパー ──────────────────────────────────────
  // すべての範囲計算は BattleRange に委譲する。
  // user: { row, col }（使用者）, range: rangeId文字列 or rangeオブジェクト
  function _getCells(user, range) {
    if (window.BattleRange) return BattleRange.getCellsFromRange(user, range);
    return new Set();
  }

  function _getUnits(user, range, pool) {
    if (window.BattleRange) return BattleRange.getUnitsFromRange(user, range, pool);
    return [];
  }

function getEnemyCellsFromAllyRange(chara, range) {
  // 固定系・全体攻撃はそのまま敵グリッド上で処理
  const normalized = BattleRange.normalizeRange(range);
  if (!normalized) return new Set();

  if (normalized.origin === 'field' || normalized.type === 'all') {
    return BattleRange.getCellsFromRange(chara, range);
  }

  // 敵3段 + 味方3段を1つの縦6段フィールドとして扱う
  const FIELD_ROWS = [
    { side:'enemy', row:'far'  },
    { side:'enemy', row:'mid'  },
    { side:'enemy', row:'near' },
    { side:'ally',  row:'near' },
    { side:'ally',  row:'mid'  },
    { side:'ally',  row:'far'  },
  ];

  const ALLY_ROW_TO_FIELD_IDX = {
    near: 3,
    mid:  4,
    far:  5,
  };

  const COL_IDX = { left:0, center:1, right:2 };
  const COL_BY_IDX = ['left','center','right'];

  const s = new Set();
  const baseRi = ALLY_ROW_TO_FIELD_IDX[chara.row];
  const baseCi = COL_IDX[chara.col];

  if (baseRi == null || baseCi == null) return s;

  (normalized.cells || []).forEach(cell => {
    const ri = baseRi + cell.dr;
    const ci = baseCi + cell.dc;

    const pos = FIELD_ROWS[ri];
    const col = COL_BY_IDX[ci];

    if (!pos || !col) return;

    // 敵グリッドに入ったマスだけ返す
    if (pos.side === 'enemy') {
      s.add(pos.row + '-' + col);
    }
  });

  return s;
}
  // 後方互換：敵ユニット取得（旧呼び出し箇所用）
  function getEnemyTargetsFromAllyRange(chara, rangeId) {
  const cells = getEnemyCellsFromAllyRange(chara, rangeId);
  const enemies = bs.enemies || (bs.enemy ? [bs.enemy] : []);
  return enemies.filter(e => e && e.hp > 0 && cells.has(e.row + '-' + e.col));
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
    // def は _rebuildStatusMod() で補正済みの値を受け取る前提。
    // ここで再度 def_down を掛けると二重適用になるため行わない。
    return Math.max(1, Math.floor(atk * m) - def);
  }
 function calcEnemyDamage(enemy, target, action) {
  // 割合ダメージ：damageRate がある場合
  // 例：damageRate: 0.20 → 最大HPの20%
  if (action && action.damageRate != null) {
    return Math.max(1, Math.floor(target.hpMax * action.damageRate));
  }

  // ATK/DEF依存ダメージ：multiplier がある場合
  // 例：multiplier: 1.2 → enemy.atk × 1.2 - target.def
  const m = action && action.multiplier != null ? action.multiplier : 1.0;
  return Math.max(1, Math.floor(enemy.atk * m) - target.def);
}

  // ============================================================
  // 回復ヘルパー
  // ============================================================
  function healUnit(unit, amount) {
    if (!unit || unit.hp <= 0) return 0;
    const before = unit.hp;
    unit.hp = Math.min(unit.hpMax, unit.hp + amount);
    return unit.hp - before;
  }

  function calcHealAmount(unit, effect) {
    if (!unit || !effect) return 0;
    if (effect.amount != null) return Math.max(1, Math.floor(effect.amount));
    if (effect.rate  != null) return Math.max(1, Math.floor(unit.hpMax * effect.rate));
    return 0;
  }

  function getLowestHpUnit(units) {
    const alive = (units || []).filter(u => u && u.hp > 0);
    if (!alive.length) return null;
    return alive.slice().sort((a, b) => (a.hp / a.hpMax) - (b.hp / b.hpMax))[0];
  }

  // 既存のaction.typeからrangeIdへ変換（action.rangeが未指定の場合のフォールバック）
  function getRangeFromEnemyActionType(type) {
    switch (type) {
      case 'atk_single': return 'random1';
      case 'atk_near':   return 'row_near';
      case 'atk_mid':    return 'row_mid';
      case 'atk_far':    return 'row_far';
      case 'atk_left':   return 'col_left';
      case 'atk_center': return 'col_center';
      case 'atk_right':  return 'col_right';
      case 'atk_cross':  return 'field_cross';
      case 'atk_xcross': return 'field_xcross';
      case 'atk_all':    return 'all';
      default:           return 'random1';
    }
  }
  function hitCheck(baseHit, accuracy) {
    return Math.random() * 100 < Math.min(100, baseHit + Math.floor((accuracy - 250) / 10));
  }
  // hit_up / hit_down を命中率に反映する（_statusMod 参照）
  function getEffectiveHit(baseHit, actor) {
    const mod = actor._statusMod || {};
    return baseHit + ((mod.hit_up || 0) * 100) - ((mod.hit_down || 0) * 100);
  }
  function calcTurnOrder(party, enemyOrEnemies) {
    const units = party.filter(c => c.hp > 0).map(c => ({ ...c, isEnemy: false }));
    const enemies = Array.isArray(enemyOrEnemies) ? enemyOrEnemies : [enemyOrEnemies];
    enemies
      .filter(e => e && e.hp > 0)
      .forEach(e => {
        units.push({ ...e, isEnemy: true, name: e.name || '怪異' });
      });
    units.sort((a, b) => {
      if (b.spd !== a.spd) return b.spd - a.spd;
      return a.isEnemy ? -1 : 1;
    });
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
        <div class="bt-enemy-preview-panel" id="bt-enemy-preview-panel">
          <div class="bt-enemy-preview-empty">敵をタップすると次行動の詳細を確認できます</div>
        </div>
        <button class="bt-menu-btn" id="bt-menu-btn" onclick="openBattleMenu()">MENU</button>
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
          ${['far','mid','near'].map(row => `
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
        <div class="bt-skill-area-header">
          <button class="bt-pass-btn" onclick="executePassAction()">PASS +3</button>
          <div class="bt-cost-display" id="bt-cost-display">COST  30 / 30</div>
      </div>
        <div class="bt-skill-cards" id="bt-skill-cards"></div>
        <div class="bt-execute-bar" id="bt-execute-bar">
        <div class="bt-execute-selected" id="bt-execute-selected">スキルを選択してください</div>
        <button class="bt-cancel-btn" onclick="cancelSkillSelect()">取消</button>
        <button class="bt-execute-btn" id="bt-execute-btn" onclick="executeSelectedSkill()">決定</button>
      </div>
        <div class="bt-skill-hint" id="bt-skill-hint">スキルをタップして詳細を確認</div>
      </div>

        <div class="bt-skill-detail-popup" id="bt-skill-detail-popup">
      <div class="bt-skill-detail-head">
        <div>
          <div class="bt-skill-detail-name" id="bt-skill-detail-name">—</div>
          <div class="bt-skill-detail-type" id="bt-skill-detail-type">—</div>
        </div>
        <button class="bt-skill-detail-x" onclick="cancelSkillSelect()">×</button>
      </div>

      <div class="bt-skill-detail-body" id="bt-skill-detail-body"></div>

        <div class="bt-skill-detail-actions">
          <button class="bt-skill-detail-cancel" onclick="cancelSkillSelect()">取消</button>
        </div>
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
      .bt-status-spiritual { color:#a0b8ff; border-color:rgba(140,160,255,.5); background:rgba(100,120,255,.08); }
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

      /* 雑魚敵ミニHPバー */
      .bt-enemy-mini-hp {
        position:absolute;
        left:8%; right:8%; bottom:2px;
        height:3px;
        background:rgba(0,0,0,.55);
        border-radius:999px;
        overflow:hidden;
        z-index:5;
      }
      .bt-enemy-mini-hp-fill {
        height:100%;
        background:linear-gradient(90deg,#7a1515,#c02828);
        border-radius:999px;
        transition:width .3s ease;
      }

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
      .bt-skill-area-header {
        display:flex; align-items:center; justify-content:flex-end;
        padding:4px 10px 0;
      }
      .bt-cost-display {
        font-family:"Cinzel",serif; font-size:11px; letter-spacing:2px;
        color:rgba(180,220,140,.9);
        text-shadow:0 0 8px rgba(150,200,100,.35);
      }

      .bt-pass-btn {
  margin-right:auto;
  padding:3px 8px;
  border-radius:6px;
  border:1px solid rgba(180,220,140,.35);
  background:rgba(120,180,80,.08);
  color:rgba(180,220,140,.9);
  font-family:"Cinzel",serif;
  font-size:9px;
  letter-spacing:1px;
  cursor:pointer;
}

.bt-pass-btn:active {
  background:rgba(120,180,80,.18);
}
      /* コスト不足カード */
      .bt-skill-card-front.cost-short {
        opacity:0.45;
        pointer-events:none;
      }
      .bt-skill-cost-short-badge {
        position:absolute; top:3px; right:3px;
        font-family:"Cinzel",serif; font-size:7px; letter-spacing:0.5px;
        color:#ff6060; background:rgba(0,0,0,.7);
        padding:1px 4px; border-radius:3px;
        border:1px solid rgba(220,60,60,.4);
      }
      /* コスト・命中行 */
      .bt-skill-cost-row {
        display:flex; gap:4px; align-items:center; justify-content:space-between;
        margin-top:3px;
      }
      .bt-skill-cost {
        font-family:"Cinzel",serif; font-size:8px; letter-spacing:1px;
        color:rgba(180,220,140,.85);
      }
      .bt-skill-cost.short { color:rgba(220,80,80,.8); }
      .bt-skill-hit {
        font-family:"Cinzel",serif; font-size:8px; letter-spacing:1px;
        color:rgba(232,228,220,.45);
      }
      /* 超必殺技カード */
      .bt-skill-card-front.is-ultimate {
        border-color:rgba(230,190,60,.55) !important;
        background:linear-gradient(180deg, rgba(70,50,15,.98), rgba(16,14,18,.98)) !important;
        box-shadow:
          inset 0 1px 0 rgba(255,230,100,.12),
          inset 0 0 18px rgba(180,120,0,.25),
          0 0 12px rgba(200,160,40,.2),
          0 4px 12px rgba(0,0,0,.55) !important;
      }
      .bt-skill-ultimate-label {
        font-family:"Cinzel",serif; font-size:7px; letter-spacing:2px;
        color:rgba(230,190,60,.85);
        text-align:center; margin-bottom:2px;
        text-shadow:0 0 8px rgba(220,170,40,.5);
      }
      .bt-skill-card-front.is-ultimate .bt-skill-name {
        color:rgba(255,235,160,.98) !important;
        text-shadow:0 0 10px rgba(220,170,40,.35) !important;
      }
      .bt-skill-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; }
      .bt-skill-acting { font-size:11px; letter-spacing:2px; color:rgba(232,228,220,.5); }
      .bt-skill-cards { display:flex; gap:5px; padding:6px 10px 4px; align-items:flex-end; }
      .bt-skill-hint { text-align:center; font-size:8px; letter-spacing:2px; color:rgba(232,228,220,.2); margin-top:2px; padding-bottom:4px; }
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
        flex: 1;
        perspective: 600px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;

        height: 82px;
        min-width: 0;
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

      /* スキルカード */
      .bt-skill-card { flex:1; background:rgba(18,18,24,.95); border:1px solid rgba(255,255,255,.09); border-radius:9px; padding:10px 5px 8px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; -webkit-tap-highlight-color:transparent; position:relative; overflow:hidden; transition:transform .12s, border-color .15s; user-select:none; -webkit-user-select:none; }
      .bt-skill-card::after { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent); }
      .bt-skill-card.pressing { transform:scale(.96); border-color:rgba(232,228,220,.3); background:rgba(232,228,220,.05); }
      .bt-skill-card.on-cd { opacity:.3; pointer-events:none; }
      .bt-skill-name { font-size:13px; letter-spacing:1px; color:#e8e4dc; font-weight:500; text-align:center; }
      .bt-skill-subdesc { font-size:8px; color:rgba(232,228,220,.35); letter-spacing:.5px; text-align:center; }
      .bt-skill-hit  { font-family:"Cinzel",serif; font-size:9px; color:rgba(232,228,220,.3); }
      .bt-skill-cd-badge { position:absolute; top:3px; right:3px; font-family:"Cinzel",serif; font-size:7px; color:rgba(255,255,255,.3); background:rgba(0,0,0,.5); border-radius:3px; padding:1px 4px; }

      .bt-skill-card-mb {
  margin-top: 2px;
  padding: 2px 5px;
  border-radius: 6px;
  background: rgba(120,80,220,.14);
  border: 1px solid rgba(160,120,255,.28);
  color: #d8c7ff;
  font-family: "Cinzel", serif;
  font-size: 8px;
  line-height: 1.15;
  letter-spacing: .4px;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.bt-skill-card-mb-cond,
.bt-skill-card-mb-benefit {
  display: block;
  white-space: nowrap;
}

      .bt-skill-mb-box {
        margin-top: 8px;
        padding: 8px;
        border-radius: 8px;
        background: rgba(120,80,220,.12);
        border: 1px solid rgba(160,120,255,.28);
      }

      .bt-skill-mb-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 11px;
        line-height: 1.6;
      }

      .bt-skill-mb-row span {
        color: rgba(232,228,220,.55);
      }

      .bt-skill-mb-row b {
        color: #d8c7ff;
        font-weight: 600;
        text-align: right;
      }

      .bt-skill-card-back,
      .bt-skill-card-front,
      .bt-skill-card {
        box-sizing:border-box;
      }

      .bt-skill-card-front,
      .bt-skill-card-back {
        gap: 3px;
        padding: 6px 4px;
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
      /* 消失（敵HP0） */
      .bt-dmg-pop.vanish {
        font-size: 18px;
        color: rgba(232,228,220,.85);
        letter-spacing: 4px;
        text-shadow:
          0 0 12px rgba(255,255,255,.45),
          0 0 28px rgba(180,180,220,.25),
          0 2px 8px rgba(0,0,0,.95);
      }
      /* 戦線離脱（味方HP0） */
      .bt-dmg-pop.withdraw {
        font-size: 16px;
        color: rgba(180,220,255,.9);
        letter-spacing: 3px;
        text-shadow:
          0 0 12px rgba(120,180,255,.45),
          0 0 28px rgba(80,120,220,.25),
          0 2px 8px rgba(0,0,0,.95);
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
      .bt-result-actions { display:flex; gap:10px; justify-content:center; }
      .bt-result-btn { padding:12px 24px; border-radius:12px; border:1px solid rgba(212,168,75,.55); background:rgba(212,168,75,.12); color:#d4a84b; font-size:13px; letter-spacing:2px; cursor:pointer; font-family:"Noto Serif JP",serif; }
      .bt-result-btn:active { background:rgba(212,168,75,.25); }
      .bt-result-btn-sub { border-color:rgba(255,255,255,.18); background:rgba(255,255,255,.05); color:rgba(232,228,220,.75); }
      .bt-result-btn-sub:active { background:rgba(255,255,255,.12); }
      .bt-skill-detail-popup {
  position: fixed;
  left: 14px;
  right: 14px;
  bottom: max(18px, env(safe-area-inset-bottom, 18px));
  z-index: 260000;
  display: none;
  padding: 14px 14px 12px;
  border-radius: 14px;
  background: rgba(12, 13, 18, 0.86);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 8px 28px rgba(0,0,0,.85), 0 0 18px rgba(120,80,40,.18);
  color: #e8e4dc;
}

.bt-skill-detail-popup.active {
  display: block;
}

.bt-skill-detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.bt-skill-detail-name {
  font-size: 15px;
  letter-spacing: 1px;
  color: #f0e8d8;
}

.bt-skill-detail-type {
  margin-top: 3px;
  font-size: 10px;
  color: rgba(232,228,220,.55);
}

.bt-skill-detail-x {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(255,255,255,.04);
  color: rgba(232,228,220,.75);
}

.bt-skill-detail-body {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 11px;
  line-height: 1.55;
}

.bt-skill-detail-row {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 8px;
}

.bt-skill-detail-label {
  color: rgba(232,228,220,.45);
}

.bt-skill-detail-value {
  color: rgba(232,228,220,.88);
}

.bt-skill-detail-desc {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,.08);
  color: rgba(232,228,220,.72);
  font-size: 11px;
}

.bt-skill-detail-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.bt-skill-detail-cancel,
.bt-skill-detail-ok {
  height: 42px;
  border-radius: 10px;
  font-size: 13px;
  letter-spacing: 2px;
}

.bt-skill-detail-cancel {
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
  color: rgba(232,228,220,.7);
}

.bt-skill-detail-ok {
  border: 1px solid rgba(210,170,80,.45);
  background: linear-gradient(180deg, rgba(160,120,45,.34), rgba(70,45,20,.55));
  color: #f4d98a;
}

      /* 敵技詳細パネル */
      .bt-enemy-preview-panel {
        margin-top: 6px;
        padding: 8px 10px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.03);
        border-radius: 8px;
      }
      .bt-enemy-preview-empty {
        font-size: 10px;
        color: rgba(232,228,220,.35);
        text-align: center;
        letter-spacing: 1px;
      }
      .bt-enemy-preview-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
      }
      .bt-enemy-preview-enemy {
        font-size: 10px;
        color: rgba(232,228,220,.5);
        letter-spacing: 1px;
      }
      .bt-enemy-preview-skill {
        font-size: 13px;
        color: #d4a84b;
        letter-spacing: 1px;
      }
      .bt-enemy-preview-desc {
        font-size: 10px;
        color: rgba(232,228,220,.7);
        line-height: 1.5;
        margin-bottom: 6px;
      }
      .bt-enemy-preview-grid {
        display: flex;
        gap: 8px;
      }
      .bt-enemy-preview-item {
        flex: 1;
        min-width: 0;
      }
      .bt-enemy-preview-label {
        font-size: 8px;
        color: rgba(232,228,220,.35);
        margin-bottom: 2px;
        letter-spacing: 1px;
      }
      .bt-enemy-preview-value {
        font-size: 11px;
        color: rgba(232,228,220,.85);
      }

      /* MENUボタン */
      .bt-header { position: relative; }
      .bt-menu-btn {
        position: absolute;
        top: max(10px, env(safe-area-inset-top, 10px));
        right: 12px;
        z-index: 2;
        padding: 5px 10px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,.15);
        background: rgba(0,0,0,.35);
        color: rgba(232,228,220,.8);
        font-family: "Cinzel", serif;
        font-size: 10px;
        letter-spacing: 2px;
        cursor: pointer;
      }
      .bt-menu-btn:active { background: rgba(255,255,255,.08); }

      /* バトルメニューアクション */
      .bt-battle-menu-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 14px;
      }
        /* =========================================
   追加：バトル画面リッチ化CSS v1
========================================= */

/* 画面全体：黒一色から儀式場っぽい奥行きへ */
#battle-root {
  background:
    radial-gradient(circle at 50% 18%, rgba(120, 20, 20, .28), transparent 38%),
    radial-gradient(circle at 50% 78%, rgba(210, 160, 70, .10), transparent 42%),
    linear-gradient(180deg, #050507 0%, #09080b 46%, #030304 100%) !important;
}

/* 盤面全体 */
.bt-grid-wrap {
  position: relative;
  border-radius: 14px;
  padding: 8px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.01)),
    rgba(0,0,0,.35);
  border: 1px solid rgba(220, 190, 120, .12);
  box-shadow:
    inset 0 0 24px rgba(0,0,0,.75),
    0 0 24px rgba(0,0,0,.55);
}

/* 敵側は赤黒 */
.bt-grid-enemy {
  background:
    radial-gradient(circle at 50% 20%, rgba(160, 20, 20, .20), transparent 55%),
    rgba(0,0,0,.34);
  border-color: rgba(180, 40, 40, .22);
}

/* 味方側は青白 */
.bt-grid-ally {
  background:
    radial-gradient(circle at 50% 80%, rgba(80, 140, 180, .14), transparent 55%),
    rgba(0,0,0,.34);
  border-color: rgba(160, 190, 210, .18);
}

/* セルを石板・結界マスっぽく */
.bt-grid-cell {
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.01)),
    rgba(0,0,0,.58) !important;
  box-shadow:
    inset 0 0 16px rgba(0,0,0,.8),
    inset 0 1px 0 rgba(255,255,255,.06);
}

/* セル枠は ::after 側で上書き */
.bt-grid-cell::after {
  border-radius: 8px;
  border-color: rgba(220, 190, 120, .16) !important;
}

/* 敵味方の境界線を結界っぽく */
.bt-field-divider {
  height: 14px;
  background:
    linear-gradient(90deg, transparent, rgba(210, 170, 80, .45), transparent);
  mask-image: linear-gradient(to bottom, transparent, black 45%, transparent);
}

/* キャラ・敵に影を足す */
.bt-chara-card::before,
.bt-enemy-card::before {
  content: "";
  position: absolute;
  left: 18%;
  right: 18%;
  bottom: 5px;
  height: 18px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0,0,0,.75), transparent 70%);
  z-index: 0;
}

.bt-chara-img,
.bt-enemy-card-img {
  z-index: 2;
  filter:
    drop-shadow(0 8px 10px rgba(0,0,0,.85))
    drop-shadow(0 0 12px rgba(255,255,255,.08));
}

/* スキルカードを術式札っぽく */
.bt-skill-card-front {
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(55,45,35,.96), rgba(16,14,18,.96));
  border: 1px solid rgba(210, 175, 95, .22);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    inset 0 0 18px rgba(0,0,0,.75),
    0 4px 12px rgba(0,0,0,.45);
}

.bt-skill-name {
  color: rgba(245, 232, 200, .95);
  text-shadow: 0 0 8px rgba(210, 160, 70, .18);
}

.bt-skill-card-front.selected {
  border-color: rgba(230, 190, 90, .75) !important;
  box-shadow:
    0 0 18px rgba(220, 170, 70, .35),
    inset 0 0 18px rgba(220, 170, 70, .10);
}

/* 攻撃予告を少し強化 */
.bt-grid-cell.danger::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 9;
  pointer-events: none;
  background:
    repeating-linear-gradient(
      135deg,
      rgba(220,40,40,0) 0px,
      rgba(220,40,40,0) 6px,
      rgba(220,40,40,.12) 7px,
      rgba(220,40,40,.12) 9px
    );
  animation: dangerScan 1.1s linear infinite;
}

@keyframes dangerScan {
  from { background-position: 0 0; }
  to   { background-position: 18px 18px; }
}

/* =========================================
   追加：セル被弾エフェクト
========================================= */

.bt-cell-hit-effect {
  animation: btCellHitShake .34s ease-out;
}

.bt-cell-hit-effect::before {
  content: "";
  position: absolute;
  inset: -2px;
  z-index: 12;
  pointer-events: none;
  border-radius: inherit;
  background:
    radial-gradient(circle at center,
      rgba(255,255,255,.65) 0%,
      rgba(255,80,60,.42) 18%,
      rgba(180,20,20,.22) 42%,
      transparent 70%);
  box-shadow:
    0 0 18px rgba(255,70,50,.75),
    inset 0 0 18px rgba(255,80,60,.35);
  animation: btCellHitFlash .42s ease-out forwards;
}

.bt-cell-hit-effect::after {
  border-color: rgba(255,90,70,.95) !important;
  box-shadow:
    0 0 18px rgba(255,60,40,.8),
    0 0 32px rgba(180,30,20,.45),
    inset 0 0 14px rgba(255,80,60,.28) !important;
}

@keyframes btCellHitFlash {
  0% {
    opacity: 0;
    transform: scale(.78);
  }
  18% {
    opacity: 1;
    transform: scale(1.06);
  }
  100% {
    opacity: 0;
    transform: scale(1.24);
  }
}

@keyframes btCellHitShake {
  0%   { transform: translate(0, 0); }
  20%  { transform: translate(-2px, 1px); }
  40%  { transform: translate(2px, -1px); }
  60%  { transform: translate(-1px, -1px); }
  80%  { transform: translate(1px, 1px); }
  100% { transform: translate(0, 0); }
}
  /* =========================================
   追加：セル被弾エフェクト v2
   renderField()で消えない固定レイヤー方式
========================================= */

.bt-cell-hit-burst {
  position: fixed;
  z-index: 310000;
  pointer-events: none;
  border-radius: 8px;
  overflow: visible;
  box-sizing: border-box;
  animation: btCellHitBurstShake .36s ease-out forwards;
}

.bt-cell-hit-burst::before {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: inherit;
  background:
    radial-gradient(circle at center,
      rgba(255,255,255,.95) 0%,
      rgba(255,95,70,.72) 16%,
      rgba(190,25,25,.42) 42%,
      transparent 72%);
  box-shadow:
    0 0 20px rgba(255,70,50,.95),
    0 0 42px rgba(200,30,20,.55),
    inset 0 0 18px rgba(255,90,70,.45);
  animation: btCellHitBurstFlash .52s ease-out forwards;
}

.bt-cell-hit-burst::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 2px solid rgba(255,110,90,.95);
  box-shadow:
    0 0 18px rgba(255,70,50,.9),
    inset 0 0 16px rgba(255,80,60,.35);
  animation: btCellHitBurstRing .52s ease-out forwards;
}

@keyframes btCellHitBurstFlash {
  0% {
    opacity: 0;
    transform: scale(.65);
  }
  12% {
    opacity: 1;
    transform: scale(1.02);
  }
  100% {
    opacity: 0;
    transform: scale(1.35);
  }
}

@keyframes btCellHitBurstRing {
  0% {
    opacity: 0;
    transform: scale(.88);
  }
  18% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.18);
  }
}

@keyframes btCellHitBurstShake {
  0%   { transform: translate(0, 0); }
  20%  { transform: translate(-3px, 1px); }
  40%  { transform: translate(3px, -1px); }
  60%  { transform: translate(-2px, -1px); }
  80%  { transform: translate(2px, 1px); }
  100% { transform: translate(0, 0); }
}

#battle-root,
.bt-main-field,
.bt-grid-wrap,
.bt-grid-cell,
.bt-chara-card,
.bt-chara-img {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.bt-grid-cell.drag-target-cell::after {
  border-color: rgba(80,160,255,.95) !important;
  box-shadow:
    0 0 12px rgba(80,160,255,.65),
    inset 0 0 10px rgba(80,160,255,.25) !important;
}

.bt-grid-cell.drag-target-cell {
  background: rgba(0,20,45,.75) !important;
}

.bt-chara-img {
  pointer-events: none;
  -webkit-user-drag: none;
}

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
  // ============================================================
  // 次行動敵の取得・プレビュー保存
  // ============================================================
  function getNextActingEnemy() {
    // bs.turnOrder上の次に行動するisEnemyを探す（生存敵のみ）
    if (bs.turnOrder && bs.turnOrder.length) {
      const unit = bs.turnOrder.find(u => u.isEnemy && u.hp > 0);
      if (unit) {
        const liveEnemy = (bs.enemies || []).find(e => e.instanceId === unit.instanceId || e.id === unit.id);
        if (liveEnemy && liveEnemy.hp > 0) return liveEnemy;
      }
    }
    // フォールバック：SPD順で最速の生存敵
    const alive = (bs.enemies || []).filter(e => e && e.hp > 0);
    if (!alive.length) return null;
    return alive.slice().sort((a, b) => (b.spd || 0) - (a.spd || 0))[0];
  }

  function updateNextPreview() {
    const nextEnemy = getNextActingEnemy();
    if (!nextEnemy) {
      bs.nextPreviewEnemy = null;
      bs.nextPreviewAction = null;
      return;
    }
    bs.nextPreviewEnemy = nextEnemy;
    bs.nextPreviewAction = peekNextAction(nextEnemy);
  }

  function renderHeader() {
    const e = bs.enemy;
    // 複数敵の場合は全体HPの合計を表示
    const enemies = bs.enemies || [e];
    const totalHp = enemies.reduce((s, en) => s + Math.max(0, en.hp), 0);
    const totalHpMax = enemies.reduce((s, en) => s + (en.hpMax || 0), 0);
    const fill = document.getElementById('bt-enemy-hp-fill');
    if (fill) fill.style.width = (totalHpMax > 0 ? totalHp / totalHpMax * 100 : 0) + '%';
    const txt = document.getElementById('bt-enemy-hp-txt');
    if (txt) {
      if (enemies.length > 1) {
        txt.textContent = '全 ' + totalHp + ' / ' + totalHpMax;
      } else {
        txt.textContent = e.hp + ' / ' + e.hpMax;
      }
    }
    const row = document.getElementById('bt-enemy-status-row');
    if (row) {
      row.innerHTML = '';
      (e.statusList || []).forEach(st => {
        const b = document.createElement('span');
        const cls = STATUS_BADGE_CLASS[st.type] || 'bt-status-other';
        b.className = 'bt-status-badge ' + cls;
        b.textContent = (STATUS_LABEL[st.type] || st.type) + (st.duration > 0 ? ' ' + st.duration : '');
        row.appendChild(b);
      });
    }
    // 共通コスト表示を更新
    const costEl = document.getElementById('bt-cost-display');
    if (costEl && bs) {
      const cur = bs.cost != null ? bs.cost : 30;
      const max = bs.costMax != null ? bs.costMax : 30;
      costEl.textContent = 'COST  ' + cur + ' / ' + max;
      const ratio = max > 0 ? cur / max : 1;
      costEl.style.color = ratio <= 0.3 ? 'rgba(220,80,80,.9)' : ratio <= 0.6 ? 'rgba(220,180,60,.9)' : 'rgba(180,220,140,.9)';
    }
  }

  // スキル選択中の射程キャッシュ（renderEnemyGrid/renderAllyGridから参照するため先に宣言）
  let _skillRangeCache = null; // { prefix, cells } or null

  function isEnemyJittai(enemy) {
  // 新仕様：敵はデフォルトで実体化。
  // spiritual 状態のときだけ霊体化扱い。
  return !!enemy && !hasStatus(enemy, 'spiritual');
}

function isEnemySpiritual(enemy) {
  return !!enemy && hasStatus(enemy, 'spiritual');
}

  function createEnemyCard(e) {
    const card = document.createElement('div');
    card.className = 'bt-enemy-card';
    const hpPct = e.hpMax > 0 ? Math.max(0, e.hp / e.hpMax * 100) : 0;
    card.innerHTML = `
      <img class="bt-enemy-card-img" src="${e.battleImg || e.upImg || e.img}" onerror="this.style.opacity='0'">
      <div class="bt-enemy-mini-hp">
        <div class="bt-enemy-mini-hp-fill" style="width:${hpPct}%"></div>
      </div>
    `;
    // 霊体化中は半透明表示
    if (isEnemySpiritual(e)) {
      card.style.opacity = '0.4';
      card.style.filter = 'grayscale(40%) brightness(0.7)';
    }
    // 敵は常にタップ可能（デフォルト実体化）
    card.style.cursor = 'pointer';
    card.onclick = function(ev) {
      ev.stopPropagation();
      showEnemyNextRange(e);
    };
    return card;
  }

  function renderEnemyGrid(highlightCells) {
    // 敵グリッドの役割：
    //   - 実体化している敵の画像を表示する
    //   - 味方スキル選択中の敵グリッドハイライトを表示する
    //   - 敵の攻撃予告danger表示は行わない（味方グリッド側に出す）
    const enemies = bs.enemies || (bs.enemy ? [bs.enemy] : []);
    const aliveEnemies = enemies.filter(e => e && e.hp > 0);

    ROWS.forEach(row => {
      COLS.forEach(col => {
        const cell = document.getElementById('bt-eg-'+row+'-'+col);
        if (!cell) return;
        cell.innerHTML = '';
        const key = row+'-'+col;

        // スキル選択中の射程ハイライト
        if (_skillRangeCache && _skillRangeCache.prefix === 'bt-eg-') {
          const sc = _skillRangeCache.cells;
          if (sc === null || sc.has(key)) {
            cell.className = 'bt-grid-cell skill-range';
            // 全ての敵をこのマスに画像表示
            aliveEnemies.forEach(e => {
              if (e.row === row && e.col === col) {
                cell.appendChild(createEnemyCard(e));
              }
            });
            return;
          }
        }

        // 各敵を描画（全敵を表示：デフォルト実体化）
        aliveEnemies.forEach(e => {
          if (e.row !== row || e.col !== col) return;
          cell.appendChild(createEnemyCard(e));
        });

        // セルのクラス設定（danger表示なし・highlightのみ）
        cell.className = 'bt-grid-cell' + (highlightCells && highlightCells.has(key) ? ' highlight' : '');
      });
    });
  }

  function renderField(highlightEnemy, allyDangerCells) {
    renderEnemyGrid(highlightEnemy);
    renderAllyGrid(allyDangerCells);
  }

  let drawnSkills = [];
  let skillDrawLocked = false;

  function renderSkills(chara) {
    const area  = document.getElementById('bt-skill-area');
    const cards = document.getElementById('bt-skill-cards');
    if (!area || !cards) return;
    if (!chara) { closeSkillArea(); return; }

    skillDrawLocked = true; // 常時表示なのでロック不要（trueにして古い挙動を無効化）

    // 通常スキル3つ + 超必殺技1つを固定表示
const normalSkills = (chara.skills || []).filter(sk => !sk.isUltimate).slice(0, 3);
const ultimateSkill = (chara.skills || []).find(sk => sk.isUltimate);

const display = ultimateSkill
  ? normalSkills.concat([ultimateSkill])
  : (chara.skills || []).slice(0, 4);

    const TYPE_LABEL = {attack:'攻撃', debuff:'妨害', buff:'補助', move:'移動', special:'特殊'};

    drawnSkills = display;

    cards.innerHTML = '';

    // スキル4枚：常に表向きで生成
    display.forEach((sk, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'bt-skill-card-wrap';

      const inner = document.createElement('div');
      inner.className = 'bt-skill-card-inner flipped'; // 常に表向き
      inner.dataset.idx = i;

      // 裏面（表示されないが構造上必要）
      const back = document.createElement('div');
      back.className = 'bt-skill-card-back';
      back.innerHTML = `
        <div class="bt-skill-card-back-pattern"></div>
        <div class="bt-skill-card-back-label">SKILL</div>
      `;

      // コスト不足チェック
      const skillCost = sk.cost || 0;
      const currentCost = (bs && bs.cost != null) ? bs.cost : 30;
      const costShort = skillCost > currentCost;
      const onCd = sk.cd > 0;
      const disabled = costShort;

      // 表面
      const front = document.createElement('div');
      front.className = 'bt-skill-card-front'
        + (costShort ? ' cost-short' : '')
        + (sk.isUltimate ? ' is-ultimate' : '');
      front.dataset.skillId = sk.id;

      const mbShortText = buildMoveBonusShortText(sk);
      if (sk.isUltimate) {
        front.innerHTML = `
          ${costShort ? '<span class="bt-skill-cost-short-badge">COST不足</span>' : ''}
          <div class="bt-skill-ultimate-label">ULTIMATE</div>
          <div class="bt-skill-name">${sk.name}</div>
          <div class="bt-skill-cost-row">
            <span class="bt-skill-cost ${costShort ? 'short' : ''}">COST ${skillCost}</span>
            <span class="bt-skill-hit">HIT ${sk.hit || 100}</span>
          </div>
          ${mbShortText ? '<div class="bt-skill-card-mb">' + mbShortText + '</div>' : ''}
        `;
      } else {
        front.innerHTML = `
          ${costShort ? '<span class="bt-skill-cost-short-badge">COST不足</span>' : ''}
          <div class="bt-skill-name">${sk.name}</div>
          <div class="bt-skill-cost-row">
            <span class="bt-skill-cost ${costShort ? 'short' : ''}">COST ${skillCost}</span>
            <span class="bt-skill-hit">HIT ${sk.hit || 100}</span>
          </div>
          ${mbShortText ? '<div class="bt-skill-card-mb">' + mbShortText + '</div>' : ''}
        `;
      }

      if (!disabled) setupSkillCard(front, chara, sk);

      inner.appendChild(back);
      inner.appendChild(front);
      wrap.appendChild(inner);

      cards.appendChild(wrap);
    });
  }

  // 後方互換：flipAllCards は何もしない（常時表示に変更のため）
  function flipAllCards() {
    skillDrawLocked = true;
  }

  function setupSkillCard(card, chara, sk) {
  let pressTimer = null;
  let longPressed = false;

  card.addEventListener('pointerdown', (e) => {
    if (sk.cd > 0) return;

    e.stopPropagation();
    longPressed = false;

    pressTimer = setTimeout(() => {
      longPressed = true;
      showSkillDetailPopup(chara, sk);
    }, 400);
  }, { passive: true });

  card.addEventListener('pointerup', (e) => {
    if (sk.cd > 0) return;

    e.stopPropagation();

    clearTimeout(pressTimer);
    pressTimer = null;

    const popup = document.getElementById('bt-skill-detail-popup');

    if (longPressed) {
      longPressed = false;
      if (popup) popup.classList.remove('active');
      return;
    }

    if (popup) popup.classList.remove('active');
    selectSkill(chara, sk);
  }, { passive: true });

  card.addEventListener('pointercancel', () => {
    clearTimeout(pressTimer);
    pressTimer = null;
    longPressed = false;

    const popup = document.getElementById('bt-skill-detail-popup');
    if (popup) popup.classList.remove('active');
  }, { passive: true });
}

// ── Move Bonus 表示ヘルパー ───────────────────────────────────
function formatMoveBonusCondition(moveBonus) {
  if (!moveBonus || !Array.isArray(moveBonus.idealMoves)) return '';

  return moveBonus.idealMoves.map(function(n) {
    return String(n);
  }).join('/');
}

function formatMoveBonusBenefit(moveBonus) {
  if (!moveBonus || !moveBonus.damageRate || moveBonus.damageRate <= 1) return '';

  return 'DMG*' + moveBonus.damageRate;
}

function buildMoveBonusShortText(skill) {
  var mb = skill.moveBonus;
  var cond = formatMoveBonusCondition(mb);
  var benefit = formatMoveBonusBenefit(mb);

  if (!cond || !benefit) return '';

  return '' +
    '<span class="bt-skill-card-mb-cond">MB ' + cond + '</span>' +
    '<span class="bt-skill-card-mb-benefit">' + benefit + '</span>';
}

function buildMoveBonusDetailHTML(skill) {
  var mb = skill.moveBonus;
  var cond = formatMoveBonusCondition(mb);
  var benefit = formatMoveBonusBenefit(mb);
  if (!cond || !benefit) return '';
  return '' +
    '<div class="bt-skill-mb-box">' +
      '<div class="bt-skill-mb-row"><span>MB条件</span><b>' + cond + '</b></div>' +
      '<div class="bt-skill-mb-row"><span>MB恩恵</span><b>' + benefit + '</b></div>' +
    '</div>';
}

const MOVE_EFFECT_RATE = [1.0, 0.9, 0.75, 0.6, 0.5];

function getMoveEffectRate(distance) {
  return MOVE_EFFECT_RATE[Math.min(distance, MOVE_EFFECT_RATE.length - 1)];
}

function getMoveDistance(fromRow, fromCol, toRow, toCol) {
  const rowIdx = { near: 0, mid: 1, far: 2 };
  const colIdx = { left: 0, center: 1, right: 2 };

  return (
    Math.abs(rowIdx[fromRow] - rowIdx[toRow]) +
    Math.abs(colIdx[fromCol] - colIdx[toCol])
  );
}

function getReachableMoveDistanceAvoidingAllies(fromRow, fromCol, toRow, toCol, dragChara) {
  const rows = ['near', 'mid', 'far'];
  const cols = ['left', 'center', 'right'];

  const rowIdx = { near: 0, mid: 1, far: 2 };
  const colIdx = { left: 0, center: 1, right: 2 };

  const startKey = fromRow + '-' + fromCol;
  const goalKey = toRow + '-' + toCol;

  // 同じマスなら移動距離0
  if (startKey === goalKey) return 0;

  // 移動先に味方がいるならNG
  const goalOccupied = bs.party.some(u =>
    u &&
    u.hp > 0 &&
    u.id !== dragChara.id &&
    u.row === toRow &&
    u.col === toCol
  );

  if (goalOccupied) return null;

  // 味方のいるマスを壁にする
  const blocked = new Set(
    bs.party
      .filter(u => u && u.hp > 0 && u.id !== dragChara.id)
      .map(u => u.row + '-' + u.col)
  );

  // 幅優先探索：上下左右に1マスずつ進み、最短距離を探す
  const queue = [{ key: startKey, dist: 0 }];
  const visited = new Set([startKey]);

  while (queue.length) {
    const current = queue.shift();
    const [row, col] = current.key.split('-');

    const r = rowIdx[row];
    const c = colIdx[col];

    const nextList = [
      [r - 1, c], // 上
      [r + 1, c], // 下
      [r, c - 1], // 左
      [r, c + 1], // 右
    ];

    for (const [nr, nc] of nextList) {
      const nextRow = rows[nr];
      const nextCol = cols[nc];

      if (!nextRow || !nextCol) continue;

      const nextKey = nextRow + '-' + nextCol;

      if (visited.has(nextKey)) continue;
      if (blocked.has(nextKey)) continue;

      const nextDist = current.dist + 1;

      if (nextKey === goalKey) {
        return nextDist;
      }

      visited.add(nextKey);
      queue.push({ key: nextKey, dist: nextDist });
    }
  }

  // どのルートでも到達不可
  return null;
}

function getAllyCellFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;

  const cell = el.closest('.bt-grid-ally .bt-grid-cell');
  if (!cell || !cell.id || !cell.id.startsWith('bt-ag-')) return null;

  const parts = cell.id.replace('bt-ag-', '').split('-');

  return {
    el: cell,
    row: parts[0],
    col: parts[1],
  };
}

function clearDragTargetCell() {
  document.querySelectorAll('.drag-target-cell').forEach(el => {
    el.classList.remove('drag-target-cell');
  });
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
    const u = user || { row: 'mid', col: 'center' };
    const cells = _getCells(u, rangeId);
    if (!cells || cells.size === 0) return '';
    const isAllyRange = ALLY_RANGES.has(rangeId);
    const html = ROWS.map(row =>
      COLS.map(col => {
        const hit = cells.has(row+'-'+col);
        const cls = hit ? (isAllyRange ? 'highlight' : 'danger') : '';
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

  const bar = document.getElementById('bt-execute-bar');
  if(bar) bar.classList.remove('visible');

  // showSkillDetailPopup(chara, sk);

  // スワイプ結線システムへの橋渡し（battle_swipe.js が存在する場合のみ）
  if (window.SwipeBattle && typeof window.SwipeBattle.start === 'function') {
    window.SwipeBattle.start(chara, sk);
  }
}

function getSkillTypeLabel(sk){
  if(!sk) return 'その他';

  const range = sk.range || '';

  // 自分・味方・自陣対象はその他
  if(
    range === 'self' ||
    range.indexOf('ally') >= 0
  ){
    return 'その他';
  }

  // pierce系は直進型
  if(range.indexOf('pierce') >= 0){
    return '直進型';
  }

  // front / row / col / all は着弾型
  if(
    range.indexOf('front') >= 0 ||
    range.indexOf('row') >= 0 ||
    range.indexOf('col') >= 0 ||
    range === 'all'
  ){
    return '着弾型';
  }

  return 'その他';
}

function showSkillDetailPopup(chara, sk){
  const popup = document.getElementById('bt-skill-detail-popup');
  const nameEl = document.getElementById('bt-skill-detail-name');
  const typeEl = document.getElementById('bt-skill-detail-type');
  const bodyEl = document.getElementById('bt-skill-detail-body');

  if(!popup || !nameEl || !typeEl || !bodyEl) return;

  nameEl.textContent = sk.name;
  typeEl.textContent = 'スキル詳細';

  bodyEl.innerHTML = `
    <div class="bt-skill-detail-row">
      <div class="bt-skill-detail-label">スキルタイプ</div>
      <div class="bt-skill-detail-value">${getSkillTypeLabel(sk)}</div>
    </div>
    <div class="bt-skill-detail-row">
      <div class="bt-skill-detail-label">COST</div>
      <div class="bt-skill-detail-value">${sk.cost || 0}</div>
    </div>
    <div class="bt-skill-detail-row">
      <div class="bt-skill-detail-label">貫通</div>
      <div class="bt-skill-detail-value">${getPierceLabel(sk)}</div>
    </div>
    <div class="bt-skill-detail-row">
      <div class="bt-skill-detail-label">命中率</div>
      <div class="bt-skill-detail-value">${sk.hit || 100}%</div>
    </div>
    <div class="bt-skill-detail-row">
      <div class="bt-skill-detail-label">効果</div>
      <div class="bt-skill-detail-value">${getEffectText(sk)}</div>
    </div>
    <div class="bt-skill-detail-row">
      <div class="bt-skill-detail-label">継続ターン</div>
      <div class="bt-skill-detail-value">${getSkillDurationText(sk)}</div>
    </div>
    ${buildMoveBonusDetailHTML(sk)}
    <div class="bt-skill-detail-desc">${sk.desc || ''}</div>
  `;

  popup.classList.add('active');
}

function getSkillTypeLabel(sk){
  if(!sk) return 'その他';

  const range = sk.range || '';

  if(sk.type === 'heal') return 'その他';
  if(sk.type === 'buff') return 'その他';
  if(sk.type === 'move') return 'その他';

  if(range.indexOf('pierce') >= 0) return '直進型';
  if(range === 'front1' || range.indexOf('front') >= 0) return '直進型';
  if(range === 'all' || range.indexOf('row') >= 0 || range.indexOf('col') >= 0) return '着弾型';

  return 'その他';
}

function getPierceLabel(sk){
  return sk && sk.pierce ? '有' : '無';
}

function getDurationLabel(effect){
  if(!effect) return '—';
  if(effect.duration == null) return '永続';
  return effect.duration + 'ターン';
}

function getEffectText(sk){
  if(!sk) return '—';

  const texts = [];

  if(sk.multiplier && sk.multiplier > 0){
    texts.push('敵に自身の攻撃力の' + sk.multiplier + '倍ダメージ');
  }

  const effects = sk.effects || [];

  effects.forEach(function(e){
    if(e.type === 'heal'){
      if(e.rate != null){
        texts.push('味方のHPを最大HPの' + Math.round(e.rate * 100) + '%回復');
      } else if(e.amount != null){
        texts.push('味方のHPを' + e.amount + '回復');
      } else {
        texts.push('味方のHPを回復');
      }
    }

    if(e.type === 'atk_down') texts.push('敵の攻撃力を下げる');
    if(e.type === 'def_down') texts.push('敵の守備力を下げる');
    if(e.type === 'spd_down') texts.push('敵の素早さを下げる');

    if(e.type === 'atk_up') texts.push('味方の攻撃力を上げる');
    if(e.type === 'def_up') texts.push('味方の守備力を上げる');
    if(e.type === 'spd_up') texts.push('味方の素早さを上げる');

    if(e.type === 'jittai') texts.push('敵の霊体化を解除する');
    if(e.type === 'stun') texts.push('敵をスタンさせる');

    if(e.type === 'pull_1') texts.push('敵を1マス引き寄せる');
    if(e.type === 'pull_2') texts.push('敵を2マス引き寄せる');
    if(e.type === 'push_1') texts.push('敵を1マス押し出す');
    if(e.type === 'push_2') texts.push('敵を2マス押し出す');

    if(e.type === 'shift_right_1') texts.push('対象を右へ1マス移動');
    if(e.type === 'shift_right_2') texts.push('対象を右へ2マス移動');
    if(e.type === 'shift_left_1') texts.push('対象を左へ1マス移動');
    if(e.type === 'shift_left_2') texts.push('対象を左へ2マス移動');
  });

  if(!texts.length && sk.type === 'move'){
    texts.push('ポジションを変更する');
  }

  return texts.length ? texts.join(' / ') : '効果なし';
}

function getSkillDurationText(sk){
  const effects = sk.effects || [];
  if(!effects.length) return '—';

  const durations = effects
    .map(function(e){ return getDurationLabel(e); })
    .filter(Boolean);

  return durations.length ? durations.join(' / ') : '—';
}



function getPierceLabel(sk){
  return sk && sk.pierce ? '有' : '無';
}

function getDurationLabel(effect){
  if(!effect) return '—';
  if(effect.duration == null) return '永続';
  return effect.duration + 'ターン';
}

function getEffectText(sk){
  if(!sk) return '—';

  const texts = [];

  if(sk.multiplier && sk.multiplier > 0){
    texts.push('敵に自身の攻撃力の' + sk.multiplier + '倍ダメージ');
  }

  const effects = sk.effects || [];

  effects.forEach(function(e){
    if(e.type === 'heal'){
      if(e.rate != null){
        texts.push('味方のHPを最大HPの' + Math.round(e.rate * 100) + '%回復');
      } else if(e.amount != null){
        texts.push('味方のHPを' + e.amount + '回復');
      } else {
        texts.push('味方のHPを回復');
      }
    }

    if(e.type === 'atk_down') texts.push('敵の攻撃力を下げる');
    if(e.type === 'def_down') texts.push('敵の守備力を下げる');
    if(e.type === 'spd_down') texts.push('敵の素早さを下げる');

    if(e.type === 'atk_up') texts.push('味方の攻撃力を上げる');
    if(e.type === 'def_up') texts.push('味方の守備力を上げる');
    if(e.type === 'spd_up') texts.push('味方の素早さを上げる');

    if(e.type === 'jittai') texts.push('敵の霊体化を解除する');
    if(e.type === 'stun') texts.push('敵をスタンさせる');

    if(e.type === 'pull_1') texts.push('敵を1マス引き寄せる');
    if(e.type === 'pull_2') texts.push('敵を2マス引き寄せる');
    if(e.type === 'push_1') texts.push('敵を1マス押し出す');
    if(e.type === 'push_2') texts.push('敵を2マス押し出す');

    if(e.type === 'shift_right_1') texts.push('対象を右へ1マス移動');
    if(e.type === 'shift_right_2') texts.push('対象を右へ2マス移動');
    if(e.type === 'shift_left_1') texts.push('対象を左へ1マス移動');
    if(e.type === 'shift_left_2') texts.push('対象を左へ2マス移動');
  });

  if(!texts.length && sk.type === 'move'){
    texts.push('ポジションを変更する');
  }

  return texts.length ? texts.join(' / ') : '効果なし';
}

function getSkillDurationText(sk){
  const effects = sk.effects || [];
  if(!effects.length) return '—';

  const durations = effects
    .map(function(e){ return getDurationLabel(e); })
    .filter(Boolean);

  return durations.length ? durations.join(' / ') : '—';
}

function highlightSkillRange(chara, sk) {
    const isAllyRange = ALLY_RANGES.has(sk.range);

    if (isAllyRange) {
      // 味方グリッドをハイライト（バフ・回復系）
      const fn = RANGE_PATTERNS[sk.range];
      const cells = fn
        ? fn({ row: chara.row, col: chara.col }, bs.party)
        : _getCells(chara, sk.range);

      _skillRangeCache = { prefix: 'bt-ag-', cells };
    } else {
      // 敵グリッドをハイライト（攻撃・デバフ系）
      const cells = getEnemyCellsFromAllyRange(chara, sk.range);
      _skillRangeCache = { prefix: 'bt-eg-', cells };
    }

    // スキルハイライト中は敵攻撃予告は一時非表示
    renderField(null, null);
  }

  function clearSkillRangeHighlight() {
    _skillRangeCache = null;
    document.querySelectorAll('.skill-range').forEach(el => el.classList.remove('skill-range'));
  }

  window.cancelSkillSelect = function () {
    selectedSkill = null;
    selectedChara = null;

    document.querySelectorAll('.bt-skill-card-front').forEach(el => el.classList.remove('selected'));
    clearSkillRangeHighlight();

    const popup = document.getElementById('bt-skill-detail-popup');
    if (popup) popup.classList.remove('active');

    const bar  = document.getElementById('bt-execute-bar');
    const hint = document.getElementById('bt-skill-hint');
    if (bar)  bar.classList.remove('visible');
    if (hint) hint.style.display = '';
    // 敵タップ時の攻撃予告を維持しながら再描画
    const dangerArg = bs.selectedEnemyPreview ? bs.selectedEnemyPreview.dangerArg : null;
    renderField(null, dangerArg);
  };

  window.executePassAction = function () {
  if (!bs || bs.phase === 'result') return;

  // スキル選択中なら selectedChara、未選択なら現在の行動キャラを使う
  const chara =
    selectedChara ||
    (bs.planningCharaId
      ? bs.party.find(c => c.id === bs.planningCharaId)
      : null);

  if (!chara || chara.hp <= 0) {
    addLog('パスするキャラがいません');
    return;
  }

  cancelSkillSelect();
  executePassAction(chara);
};
  
  // 即時発動（スワイプ結線・通常スキル選択の両方から呼ばれる）
  window.executeSelectedSkill = function () {
    if (!selectedSkill || !selectedChara) return;

    const sk    = selectedSkill;
    const chara = selectedChara;

    // cancelSkillSelect() で倍率が 1.0 に戻る可能性があるため先に退避
    const swipeMult =
    bs && typeof bs.swipeComboMultiplier === 'number'
      ? bs.swipeComboMultiplier
      : 1.0;

    cancelSkillSelect();

    // cancelSkillSelect 後に倍率を復元
    if (bs) bs.swipeComboMultiplier = swipeMult;

    executeImmediateSkill(chara, sk);
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

  // ============================================================
  // 即時発動フロー（スワイプ結線バトル用）
  // ============================================================

  // スキルを即時発動し、敵攻撃 → 次キャラへ進む
  function executeImmediateSkill(chara, skill) {
    if (!bs || !chara || !skill) return;
    if (bs.phase === 'result') return;

    // コスト不足チェック
    const skillCost = skill.cost || 0;
    if (skillCost > (bs.cost != null ? bs.cost : 30)) {
      addLog('コストが足りない（必要: ' + skillCost + ' / 現在: ' + bs.cost + '）');
      return;
    }

    bs.phase = 'executing';
    closeSkillArea();

    // コスト消費
    if (bs.cost != null) {
      bs.cost -= skillCost;
      if (bs.cost < 0) bs.cost = 0;
    }
    renderHeader();

    // CDを消費（移動スキルはcd管理なし）
    const sk = chara.skills.find(s => s.id === skill.id);
    if (sk && sk.cdMax > 0) sk.cd = sk.cdMax;

    const battleUnit = {
      ...chara,
      img: chara.battleImg || chara.img,
      isEnemy: false,
    };

    _execStepPlayer(chara, battleUnit, skill, () => {
      // プレイヤー行動後：全敵が攻撃
      doEnemyAction(() => {
        // リアクティブダメージ（HP30%以下の enemy_01）
        _applyReactiveDamage(chara, () => {
          markCharaActed(chara);
          goNextPlanningCharaOrTurnEnd();
        });
      });
    });
  }

  function executePassAction(chara) {
  if (!bs || !chara) return;
  if (bs.phase === 'result') return;

  bs.phase = 'executing';
  closeSkillArea();

  const recover = 3;
  const before = bs.cost != null ? bs.cost : 0;
  const max = bs.costMax != null ? bs.costMax : 30;

  bs.cost = Math.min(max, before + recover);

  renderHeader();
  addLog(chara.name + ' は様子を見た。COST +' + (bs.cost - before));

  const battleUnit = {
    ...chara,
    img: chara.battleImg || chara.img,
    isEnemy: false,
  };

  // パス後も敵行動 → リアクティブダメージ → 次キャラへ
  doEnemyAction(() => {
    _applyReactiveDamage(chara, () => {
      markCharaActed(chara);
      goNextPlanningCharaOrTurnEnd();
    });
  });
}

  // そのターンに行動したキャラのIDを記録
  function markCharaActed(chara) {
    if (!bs.actedCharaIds) bs.actedCharaIds = [];
    if (!bs.actedCharaIds.includes(chara.id)) {
      bs.actedCharaIds.push(chara.id);
    }
  }

  // 未行動キャラがいれば次へ、全員行動済みならターン終了
  function goNextPlanningCharaOrTurnEnd() {
  if (!bs || bs.phase === 'result') return;

  // turnOrderはコピーを含むため、HP判定は必ずbs.partyの実体を見る
  const nextOrderUnit = (bs.turnOrder || []).find(u => {
    if (!u || u.isEnemy) return false;
    if ((bs.actedCharaIds || []).includes(u.id)) return false;

    const liveChara = bs.party.find(c => c.id === u.id);
    return liveChara && liveChara.hp > 0;
  });

  if (nextOrderUnit) {
    const chara = bs.party.find(c => c.id === nextOrderUnit.id);

    if (!chara || chara.hp <= 0) {
      // 念のため。ここには基本来ない
      markCharaActed(nextOrderUnit);
      goNextPlanningCharaOrTurnEnd();
      return;
    }

    bs.phase = 'planning';
    bs.planningCharaId = chara.id;

    renderSkills(chara);
    renderField();
    renderOrder(null);
    addLog(chara.name + ' の行動を選んでください');
  } else {
    onTurnEnd();
  }
}

  function advancePlanningCursor() {
    // 未予約のキャラをSPD順で探す
    const playerUnits = bs.turnOrder.filter(u => {
  if (!u || u.isEnemy) return false;
  const liveChara = bs.party.find(c => c.id === u.id);
  return liveChara && liveChara.hp > 0;
});

const unset = playerUnits.find(u =>
  !bs.pendingActions.some(a => a.charaId === u.id)
);

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
      // after_each_action の敵はここでは攻撃しない（各プレイヤー行動後に攻撃済み）
      const liveEnemy = (bs.enemies || []).find(e => e.instanceId === unit.instanceId || e.id === unit.id) || unit;
      const timing = liveEnemy.attackTiming || (bs.enemy && bs.enemy.attackTiming) || 'after_round';
      if (timing === 'after_each_action') {
        setTimeout(() => executeNext(idx + 1), 100);
        return;
      }
      _execStepEnemy(unit, () => executeNext(idx + 1));
    } else {
      const action = bs.pendingActions.find(a => a.charaId === unit.id);
      if (!action || unit.hp <= 0) {
        setTimeout(() => executeNext(idx + 1), 400);
        return;
      }
      const chara = bs.party.find(c => c.id === unit.id);
      const battleUnit = { ...unit, img: chara.battleImg || chara.img || unit.img, isEnemy: false };
      _execStepPlayer(chara, battleUnit, action.skill, () => {
        // after_each_action：プレイヤー1人行動後に敵が反応攻撃
        const timing = bs.enemy && bs.enemy.attackTiming || 'after_round';
        if (timing === 'after_each_action' && bs.enemy && bs.enemy.hp > 0) {
          const enemyUnit = bs.turnOrder.find(u => u.isEnemy);
          if (enemyUnit) {
            _execStepEnemy(enemyUnit, () => {
              _applyReactiveDamage(chara, () => executeNext(idx + 1));
            });
          } else {
            _applyReactiveDamage(chara, () => executeNext(idx + 1));
          }
        } else {
          // HP30%以下リアクティブダメージ（enemy_01から）
          _applyReactiveDamage(chara, () => executeNext(idx + 1));
        }
      });
    }
  }

  // ============================================================
  // リアクティブダメージ（HP30%以下の enemy_01 からプレイヤーへ）
  // ============================================================
  function _applyReactiveDamage(chara, onNext) {
    if (!chara || chara.hp <= 0) { onNext(); return; }
    // _reactiveActive が有効な enemy_01 を探す
    const boss = (bs.enemies || []).find(e => (e._origId || e.id) === 'enemy_01' && e._reactiveActive && e.hp > 0);
    if (!boss) { onNext(); return; }
    const dmg = Math.max(1, Math.floor(chara.hpMax * 0.10));
    const cell = document.getElementById('bt-ag-' + chara.row + '-' + chara.col);
    showCellDamageEffect(cell);
    showResultPop(cell, '反応 -' + dmg, 'dmg');
    addLog('【反応ダメージ】' + chara.name + ' に ' + dmg + ' ダメージ');
    const vanished = applyDamageAndCheckVanish(chara, dmg, 'ally');
    renderHeader();
    if (vanished) {
      setTimeout(() => {
        renderField();
        checkPartyDead();
        onNext();
      }, 700);
    } else {
      renderField();
      setTimeout(() => {
        checkPartyDead();
        onNext();
      }, 600);
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
    // unit が bs.enemies の参照に対応する実体を取得（turnOrder は shallow copy のため）
    const liveEnemy = (bs.enemies || []).find(e => e.instanceId === unit.instanceId || e.id === unit.id) || unit;

    // 死亡済みならスキップ
    if (!liveEnemy || liveEnemy.hp <= 0) {
      setTimeout(onNext, 100);
      return;
    }

    const act = peekNextAction(liveEnemy);

    // ⑤ 敵画像表示（liveEnemy の情報を使う）
    showActingChara({ ...liveEnemy, isEnemy: true });

    // ⑥ 行動名フラッシュ（1000ms後）
    setTimeout(() => {
      showSkillFlash(act.action || liveEnemy.name);

      // ⑦ 結果（さらに1200ms後）
      setTimeout(() => {
        doSingleEnemyAction(liveEnemy, () => {
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
      miss:     'bt-dmg-pop miss',
      dmg:      'bt-dmg-pop',
      buff:     'bt-dmg-pop buff',
      debuff:   'bt-dmg-pop debuff',
      heal:     'bt-dmg-pop heal',
      vanish:   'bt-dmg-pop vanish',
      withdraw: 'bt-dmg-pop withdraw',
    }[type] || 'bt-dmg-pop';
    pop.className = cls;
    pop.textContent = text;
    const cx = rect.left + rect.width / 2;
    pop.style.cssText = `left:${cx}px;top:${rect.top + 10}px;transform:translateX(-50%);`;
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 2000);
  }

function showResultPopOffset(cell, text, type, offsetX, offsetY) {
  if (!cell) return;

  const rect = cell.getBoundingClientRect();
  const pop = document.createElement('div');

  pop.className = 'bt-dmg-pop ' + (type || '');
  pop.textContent = text;

  const x = rect.left + rect.width / 2 + (offsetX || 0);
  const y = rect.top + rect.height / 2 + (offsetY || 0);

  pop.style.left = x + 'px';
  pop.style.top = y + 'px';

  document.body.appendChild(pop);

  setTimeout(() => {
    pop.remove();
  }, 1600);
}

function getMultiHitPopOffset(index, count) {
  if (count <= 1) return { x: 0, y: 0 };

  const pattern = [
    { x: -14, y: -8 },
    { x:  12, y: -18 },
    { x: -6,  y:  8 },
    { x:  18, y:  4 },
    { x: -20, y: -22 },
    { x:  4,  y: -30 },
  ];

  return pattern[index % pattern.length];
}

function showCellDamageEffect(cell) {
  if (!cell) return;

  const rect = cell.getBoundingClientRect();

  const fx = document.createElement('div');
  fx.className = 'bt-cell-hit-burst';
  fx.style.left = rect.left + 'px';
  fx.style.top = rect.top + 'px';
  fx.style.width = rect.width + 'px';
  fx.style.height = rect.height + 'px';

  document.body.appendChild(fx);

  setTimeout(() => {
    fx.remove();
  }, 650);
}

  // ============================================================
  // HP減算＋HP0時の消失/戦線離脱ポップ共通処理
  // side: 'enemy' | 'ally'
  // ============================================================
  function applyDamageAndCheckVanish(unit, dmg, side) {
    if (!unit || unit.hp <= 0) return false;

    // 霊体化中の敵は被ダメ50%軽減
    if (side === 'enemy' && isEnemySpiritual(unit)) {
      dmg = Math.max(1, Math.floor(dmg * 0.5));
    }

    const before = unit.hp;
    unit.hp = Math.max(0, unit.hp - dmg);

    const becameDead = before > 0 && unit.hp <= 0;

    if (becameDead) {
      const cellId = side === 'enemy'
        ? 'bt-eg-' + unit.row + '-' + unit.col
        : 'bt-ag-' + unit.row + '-' + unit.col;

      const cell = document.getElementById(cellId);

      const vanishText = side === 'enemy' ? '消失' : '戦線離脱';
      const vanishType = side === 'enemy' ? 'vanish' : 'withdraw';

      setTimeout(() => {
        showResultPop(cell, vanishText, vanishType);
      }, 260);
    }

    return becameDead;
  }

  // ============================================================
  // ステータス効果の定数定義
  // ============================================================
  const STATUS_LABEL = {
    jittai:       '実体化',
    spiritual:    '霊体化',
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
    spiritual:    'bt-status-spiritual',
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
  // value未指定時のフォールバック効果量
  const STATUS_MOD_RATE = 0.25;

  // フラグ系（value不要・重複スタックしない）typeのセット
  const STATUS_FLAG_TYPES = new Set([
    'jittai', 'stun', 'sure_hit_self', 'sure_hit_team', 'spiritual',
  ]);

  // ============================================================
  // statusList管理ユーティリティ
  // ============================================================
  // unit.statusList = [ { type, value?, duration } ]
  //
  // スタック仕様：
  //   数値系（atk_up, def_down など）→ 同typeでも別エントリで積む。
  //     _rebuildStatusMod で合算して実数値に反映。
  //   フラグ系（jittai, stun など）→ 重複させず duration を加算。
  //     数値意味がないため何枚積んでも同じなので。
  //
  // duration: -1=永続, 0=このターン中有効（次tick終了時に除去）, n=nターン後除去

  function hasStatus(unit, type) {
    return (unit.statusList || []).some(s => s.type === type);
  }

  // 新形式: addStatus(unit, { type, value?, duration })
  // 旧形式: addStatus(unit, 'jittai', 2)  ← 後方互換
  function addStatus(unit, statusOrType, duration) {
    if (!unit.statusList) unit.statusList = [];

    let status;
    if (typeof statusOrType === 'string') {
      status = { type: statusOrType, duration: duration };
    } else {
      status = { ...statusOrType };
    }

    if (!status.type) return;
    if (status.duration == null) status.duration = 1;

    if (STATUS_FLAG_TYPES.has(status.type)) {
      // フラグ系：重複させず duration 加算
      const existing = unit.statusList.find(s => s.type === status.type);
      if (existing) {
        existing.duration += status.duration;
      } else {
        unit.statusList.push(status);
      }
    } else {
      // 数値系：毎回新エントリとして積む（スタック）
      unit.statusList.push(status);
    }

    _rebuildStatusMod(unit);
  }

  function removeStatus(unit, type) {
    if (!unit.statusList) return;
    unit.statusList = unit.statusList.filter(s => s.type !== type);
    _rebuildStatusMod(unit);
  }

  // statusList を見て _statusMod と実数値を再構築
  // 数値系は同typeのvalue合算、フラグ系はtrue/falseで管理
  function _rebuildStatusMod(unit) {
    if (!unit._base) {
      unit._base = { atk: unit.atk, def: unit.def, spd: unit.spd };
    }
    const mod = {};
    (unit.statusList || []).forEach(s => {
      const v = (s.value != null) ? s.value : STATUS_MOD_RATE;
      switch (s.type) {
        case 'atk_up':   mod.atk_up   = (mod.atk_up   || 0) + v; break;
        case 'atk_down': mod.atk_down = (mod.atk_down || 0) + v; break;
        case 'def_up':   mod.def_up   = (mod.def_up   || 0) + v; break;
        case 'def_down': mod.def_down = (mod.def_down || 0) + v; break;
        case 'spd_up':   mod.spd_up   = (mod.spd_up   || 0) + v; break;
        case 'spd_down': mod.spd_down = (mod.spd_down || 0) + v; break;
        case 'hit_up':   mod.hit_up   = (mod.hit_up   || 0) + v; break;
        case 'hit_down': mod.hit_down = (mod.hit_down || 0) + v; break;
        case 'jittai':   mod.jittai   = true; break;
        case 'stun':     mod.stun     = true; break;
        case 'spiritual': mod.spiritual = true; break;
      }
    });
    unit._statusMod = mod;
    // ATK / DEF / SPD 実数値に反映
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
      return s.duration >= 0; // 0になったターンはまだ有効（次のtickで消える）
    });
    _rebuildStatusMod(unit);
  }

  // ============================================================
  // 貫通判定付き対象取得
  // ============================================================
  // 射線上の対象を手前から並べ、pierce:false なら最初の1体のみ返す。
  // 味方は射線を遮らない（敵攻撃・味方攻撃ともに同じ仕様）。
  //
  // attacker : { row, col }
  // range    : rangeId or rangeオブジェクト
  // units    : 対象プールの配列（敵攻撃なら bs.party、味方攻撃なら [bs.enemy]）
  // options  : { pierce: bool, side: 'enemy'|'ally' }
  // ============================================================
  function sortTargetsByLineOrder(targets) {
    const ROW_ORDER = ['near', 'mid', 'far'];
    const COL_ORDER = ['left', 'center', 'right'];
    return targets.slice().sort((a, b) => {
      const ar = ROW_ORDER.indexOf(a.row);
      const br = ROW_ORDER.indexOf(b.row);
      if (ar !== br) return ar - br;
      return COL_ORDER.indexOf(a.col) - COL_ORDER.indexOf(b.col);
    });
  }

  // pierce_ 系rangeかどうかを判定する
  // pierce_ で始まるrangeID、またはpierce2/pierce3 も対象
  function isPierceRange(range) {
    if (typeof range === 'string') {
      return range.startsWith('pierce_') || range === 'pierce2' || range === 'pierce3';
    }
    if (range && typeof range.id === 'string') {
      return range.id.startsWith('pierce_');
    }
    return false;
  }
  function getEnemyAttackCellsOnAllyGrid(enemy, rangeId) {
  if (!enemy || !rangeId) return new Set();

  // 敵→味方の直線攻撃は、敵と同じ列の味方グリッドを対象
  if (rangeId === 'pierce_all' || rangeId === 'pierce3') {
    return new Set([
      'near-' + enemy.col,
      'mid-' + enemy.col,
      'far-' + enemy.col,
    ]);
  }

  if (rangeId === 'pierce2') {
    return new Set([
      'near-' + enemy.col,
      'mid-' + enemy.col,
    ]);
  }

  if (!window.BattleRange || !BattleRange.getCellsFromRange) {
    return new Set();
  }

  return BattleRange.getCellsFromRange(
    { row: enemy.row, col: enemy.col },
    rangeId
  );
}

  function getTargetsByPierce(attacker, range, units, options) {
  const pierce = options && options.pierce === true;
  const side   = options && options.side;

  let cells;

  if (side === 'enemy') {
    // 味方 → 敵
    cells = getEnemyCellsFromAllyRange(attacker, range);
  } else {
    // 敵 → 味方
    cells = getEnemyAttackCellsOnAllyGrid(attacker, range);
  }

  let candidates = (units || []).filter(u => {
    return u && u.hp > 0 && cells && cells.has(u.row + '-' + u.col);
  });

  candidates = sortTargetsByLineOrder(candidates);

  // pierce_ 系rangeでない場合は、範囲内の全対象を返す
  if (!isPierceRange(range)) {
    return candidates;
  }

  // pierce_ 系rangeで、pierce:false の場合は最前列の1体だけ
  if (!pierce) {
    return candidates.length ? [candidates[0]] : [];
  }

  // pierce:true の場合は直線上すべて
  return candidates;
}

  // ============================================================
  // 敵強制移動（push / pull / shift_left / shift_right）
  //
  // 縦方向（行）:
  //   push_1 / push_2 / push  = 奥へ（near→mid→far）
  //   pull_1 / pull_2 / pull  = 手前へ（far→mid→near）
  // 横方向（列）:
  //   shift_left_1 / shift_left_2   = 左へ
  //   shift_right_1 / shift_right_2 = 右へ
  //
  // ※ canMove:false / fixedPosition:true はスキルによる強制移動を止めない。
  //    これらは敵の自動移動だけを制御するフラグとして扱う。
  //
  // 戻り値: 移動した場合 true
  // ============================================================
  function applyEnemyMoveEffect(enemy, effect) {
  if (!enemy || enemy.hp <= 0) return false;

  if (isEnemySpiritual(enemy)) {
    addLog('→ ' + enemy.name + ' は霊体化中のため移動効果を受けない');
    return false;
  }

  let direction = null;
  let maxSteps  = 1;

    // ── 縦方向：push / pull ──────────────────────────────────
    if (effect.type === 'push' || effect.type === 'push_1' || effect.type === 'push_2') {
      direction = 'back';   // near → mid → far
      maxSteps  = effect.type.endsWith('_2') ? 2 : (effect.amount || 1);
    }
    else if (effect.type === 'pull' || effect.type === 'pull_1' || effect.type === 'pull_2') {
      direction = 'front';  // far → mid → near
      maxSteps  = effect.type.endsWith('_2') ? 2 : (effect.amount || 1);
    }
    // ── 横方向：shift_left / shift_right ────────────────────
    else if (effect.type === 'shift_left_1' || effect.type === 'shift_left_2') {
      direction = 'left';
      maxSteps  = effect.type.endsWith('_2') ? 2 : 1;
    }
    else if (effect.type === 'shift_right_1' || effect.type === 'shift_right_2') {
      direction = 'right';
      maxSteps  = effect.type.endsWith('_2') ? 2 : 1;
    }
    else {
      return false;
    }

    const result = BattleRange.tryMoveUnitStepwise(enemy, direction, maxSteps, bs.enemies);

    if (result.moved) {
      const dirLabel = {
        back:  '押し込んだ',
        front: '引き寄せた',
        left:  result.steps + 'マス左へ移動した',
        right: result.steps + 'マス右へ移動した',
      }[direction];
      addLog('→ 敵を' + (direction === 'back' || direction === 'front' ? result.steps + 'マス' : '') + dirLabel);
      renderField();
      return true;
    }

    addLog('→ 移動先が塞がっているため、敵は動かなかった');
    return false;
  }

  // ============================================================
  // 単一エフェクト適用エンジン
  // effect: { type, target, hit, duration, amount }
  // ============================================================
  const ROW_IDX_MAP = { near:0, mid:1, far:2 };
  const COL_IDX_MAP = { left:0, center:1, right:2 };
  const ROW_BY_IDX_MAP = ['near','mid','far'];
  const COL_BY_IDX_MAP = ['left','center','right'];

  function _applyEffect(effect, chara, showPop, effectTargets) {
    const dur = (effect.duration != null) ? effect.duration : 1;
    const effectHit = effect.hit != null ? effect.hit : 100;

    // 命中判定（必中フラグ考慮）
    const isSureHit = hasStatus(chara, 'sure_hit_self') || hasStatus(chara, 'sure_hit_team') ||
                      bs.party.some(c => c.id !== chara.id && hasStatus(c, 'sure_hit_team'));
    const landed = isSureHit ? true : (Math.random() * 100 < effectHit);

    const enemyCell = (e) => document.getElementById('bt-eg-' + (e || bs.enemy).row + '-' + (e || bs.enemy).col);
    const allyCell  = (c) => document.getElementById('bt-ag-' + c.row + '-' + c.col);

    // ── 敵対象 ─────────────────────────────────────────────
    if (effect.target === 'enemy') {
      // effectTargetsが渡されていればそれを使う。なければbs.enemyにフォールバック
      const targets = (effectTargets && effectTargets.length)
        ? effectTargets.filter(e => e && e.hp > 0)
        : [bs.enemy].filter(Boolean);

      if (!landed) {
        targets.forEach(enemy => {
          showPop && showResultPop(enemyCell(enemy), 'MISS', 'miss');
        });
        return false;
      }

      targets.forEach(enemy => {
        const cell = enemyCell(enemy);
        switch (effect.type) {

          case 'jittai':
  // 新仕様：jittaiはspiritualを解除する効果。
  // すでに実体化している敵には失敗扱いにする。
  if (hasStatus(enemy, 'spiritual')) {
    removeStatus(enemy, 'spiritual');
    showPop && showResultPop(cell, '霊体化解除', 'buff');
    addLog('→ ' + enemy.name + ' の霊体化を解除した');
  } else {
    showPop && showResultPop(cell, 'MISS', 'miss');
    addLog('→ ' + enemy.name + ' はすでに実体化しています');
  }
  break;

          case 'stun':
            addStatus(enemy, 'stun', dur);
            showPop && showResultPop(cell, 'スタン▲', 'debuff');
            addLog('→ ' + enemy.name + ' にスタン付与 (' + dur + 'T)');
            break;

          case 'atk_down':
            addStatus(enemy, 'atk_down', dur);
            showPop && showResultPop(cell, 'ATK↓', 'debuff');
            addLog('→ ' + enemy.name + ' にATKダウン (' + dur + 'T)');
            break;

          case 'def_down':
            addStatus(enemy, 'def_down', dur);
            showPop && showResultPop(cell, 'DEF↓', 'debuff');
            addLog('→ ' + enemy.name + ' にDEFダウン (' + dur + 'T)');
            break;

          case 'spd_down':
            addStatus(enemy, 'spd_down', dur);
            showPop && showResultPop(cell, 'SPD↓', 'debuff');
            addLog('→ ' + enemy.name + ' にSPDダウン (' + dur + 'T)');
            break;

          // 敵強制移動（旧形式：後方互換）
          case 'pull_1': case 'pull_2': {
            const steps = effect.type === 'pull_1' ? 1 : 2;
            const moved = applyEnemyMoveEffect(enemy, { type: 'pull', amount: steps });
            if (moved) showPop && showResultPop(cell, '吸寄' + steps, 'debuff');
            break;
          }
          case 'push_1': case 'push_2': {
            const steps = effect.type === 'push_1' ? 1 : 2;
            const moved = applyEnemyMoveEffect(enemy, { type: 'push', amount: steps });
            if (moved) showPop && showResultPop(cell, '押出' + steps, 'debuff');
            break;
          }

          // 敵強制移動（新形式：push/pull + amount）
          case 'push': {
            const moved = applyEnemyMoveEffect(enemy, effect);
            if (moved) showPop && showResultPop(cell, '押出' + (effect.amount || 1), 'debuff');
            break;
          }
          case 'pull': {
            const moved = applyEnemyMoveEffect(enemy, effect);
            if (moved) showPop && showResultPop(cell, '吸寄' + (effect.amount || 1), 'debuff');
            break;
          }
          case 'shift_right_1': case 'shift_right_2': {
            const steps = effect.type === 'shift_right_1' ? 1 : 2;
            const moved = applyEnemyMoveEffect(enemy, effect);
            if (moved) showPop && showResultPop(cell, '右寄' + steps, 'debuff');
            break;
          }
          case 'shift_left_1': case 'shift_left_2': {
            const steps = effect.type === 'shift_left_1' ? 1 : 2;
            const moved = applyEnemyMoveEffect(enemy, effect);
            if (moved) showPop && showResultPop(cell, '左寄' + steps, 'debuff');
            break;
          }
        }
      });

      renderField();
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
      }
    });

    // ── 味方回復（target指定あり） ──────────────────────────────
    if (effect.type === 'heal') {
      if (!landed) {
        showPop && showResultPop(allyCell(chara), 'MISS', 'miss');
        return false;
      }

      if (effect.target === 'ally_self') {
        const amount = calcHealAmount(chara, effect);
        const healed = healUnit(chara, amount);
        if (healed > 0) {
          showPop && showResultPop(allyCell(chara), '+' + healed, 'heal');
          addLog('→ ' + chara.name + ' を ' + healed + ' 回復');
        }
        renderField();
        return true;
      }

      if (effect.target === 'ally_lowest') {
        const t = getLowestHpUnit(bs.party);
        if (!t) return false;
        const amount = calcHealAmount(t, effect);
        const healed = healUnit(t, amount);
        if (healed > 0) {
          showPop && showResultPop(allyCell(t), '+' + healed, 'heal');
          addLog('→ ' + t.name + ' を ' + healed + ' 回復');
        }
        renderField();
        return true;
      }

      if (effect.target === 'ally_all') {
        const targets = bs.party.filter(c => c && c.hp > 0);
        targets.forEach(t => {
          const amount = calcHealAmount(t, effect);
          const healed = healUnit(t, amount);
          if (healed > 0) showPop && showResultPop(allyCell(t), '+' + healed, 'heal');
        });
        addLog('→ 味方全員を回復');
        renderField();
        return true;
      }
    }

    return landed;
  }

  function sortEnemyTargetsForHitOrder(targets, skill) {
  if (!targets || !targets.length) return targets || [];

  // 直線・貫通っぽいスキルだけ順番演出対象にする
  const range = skill && skill.range;
  const isLineSkill =
    range === 'pierce_all' ||
    range === 'pierce3' ||
    range === 'pierce2' ||
    range === 'front3_row_3' ||
    skill.pierce === true;

  if (!isLineSkill) return targets;

  const rowOrder = {
    near: 0, // 手前
    mid: 1,
    far: 2  // 奥
  };

  return targets.slice().sort((a, b) => {
    const ar = rowOrder[a.row] ?? 99;
    const br = rowOrder[b.row] ?? 99;
    if (ar !== br) return ar - br;

    // 同じ距離なら左→中→右
    const colOrder = { left: 0, center: 1, right: 2 };
    return (colOrder[a.col] ?? 99) - (colOrder[b.col] ?? 99);
  });
}

function getHitStyle(skill) {
  const type = skill && skill.hitStyle ? skill.hitStyle : 'normal';

  switch (type) {
    case 'heavy':
      return {
        count: 1,
        interval: 0,
        targetInterval: 220
      };

    case 'rapid':
      return {
        count: 6,
        interval: 55,
        targetInterval: 120
      };

    case 'multi':
    default:
      return {
        count: 3,
        interval: 90,
        targetInterval: 160
      };
  }
}

function splitDamage(totalDmg, count) {
  count = Math.max(1, count || 1);

  const base = Math.floor(totalDmg / count);
  const rest = totalDmg - base * count;

  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(base + (i === count - 1 ? rest : 0));
  }
  return arr;
}

function applyDrainEffect(chara, skill, totalDamageDealt) {
  if (!chara || !skill || totalDamageDealt <= 0) return false;

  const drain = (skill.effects || []).find(e => e.type === 'drain');
  if (!drain) return false;

  const rate = drain.rate != null ? drain.rate : 1.0;
  const amount = Math.max(1, Math.floor(totalDamageDealt * rate));

  let target = chara;

  if (drain.target === 'ally_lowest') {
    target = getLowestHpUnit(bs.party);
  }

  if (drain.target === 'ally_all') {
    const allies = bs.party.filter(c => c && c.hp > 0);
    allies.forEach(ally => {
      const healed = healUnit(ally, amount);
      if (healed > 0) {
        const cell = document.getElementById('bt-ag-' + ally.row + '-' + ally.col);
        showResultPop(cell, '+' + healed, 'heal');
      }
    });
    addLog('→ 与えたダメージを生命力に変換した');
    renderField();
    return true;
  }

  if (!target || target.hp <= 0) return false;

  const healed = healUnit(target, amount);
  if (healed > 0) {
    const cell = document.getElementById('bt-ag-' + target.row + '-' + target.col);
    showResultPop(cell, '+' + healed, 'heal');
    addLog('→ ' + target.name + ' は ' + healed + ' 回復');
    renderHeader();
    renderField();
    return true;
  }

  return false;
}
  // ============================================================
  // doPlayerAction：effects[]ベースに全面刷新
  // ============================================================
  function doPlayerAction(chara, skill, onDone) {
    addLog(chara.name + '「' + skill.name + '」');

    // ── ダメージ対象の決定 ──────────────────────────────────────
    // range が ally系（ALLY_RANGES）→ 味方グリッドから対象取得
    // それ以外 → BattleRange で敵グリッドから対象取得
    const isAllyRange = ALLY_RANGES.has(skill.range);
    let targets;
    if (isAllyRange) {
      // 味方グリッド上の対象（バフ・回復系）
      const fn = RANGE_PATTERNS[skill.range];
      const cells = fn ? fn({ row: chara.row, col: chara.col }, bs.party) : _getCells(chara, skill.range);
      targets = bs.party.filter(u => u.hp > 0 && (cells === null || cells.has(u.row + '-' + u.col)));
    } else {
      // 敵グリッド上の対象（攻撃・デバフ系）
      // pierce未指定は false 扱い（既存スキル互換）
      targets = getTargetsByPierce(chara, skill.range, bs.enemies, {
        pierce: skill.pierce === true,
        side: 'enemy',
      });
    }

    // 必中チェック
    const sureHit = hasStatus(chara, 'sure_hit_self') || hasStatus(chara, 'sure_hit_team') ||
                    bs.party.some(c => c.id !== chara.id && hasStatus(c, 'sure_hit_team'));
    if (sureHit) {
      removeStatus(chara, 'sure_hit_self');
      bs.party.forEach(c => removeStatus(c, 'sure_hit_team'));
    }

    // ── ダメージ処理 ──────────────────────────────────────────
    const hasDmg = (skill.multiplier || 0) > 0;
    if (hasDmg) {
      if (targets.length === 0) {
  addLog(chara.name + '「' + skill.name + '」は空を切った');

  const fallback =
    document.getElementById('bt-eg-mid-center') ||
    document.querySelector('.bt-grid-enemy .bt-grid-cell');

  showResultPop(fallback, 'MISS', 'miss');

  // 空振りでもスワイプ倍率はリセット
  if (bs) {
    bs.swipeComboMultiplier = 1.0;
  }

  renderHeader();
  renderField();

  setTimeout(() => {
    onDone && onDone();
  }, 600);

  return;
}
      const effectiveHit = getEffectiveHit(skill.hit, chara);
      const hit = sureHit ? true : hitCheck(effectiveHit, chara.accuracy);
      if (!hit) {
        addLog('— 外れた');
        const cell =
  targets[0]
    ? document.getElementById('bt-eg-' + targets[0].row + '-' + targets[0].col)
    : document.getElementById('bt-eg-mid-center');

showResultPop(cell, 'MISS', 'miss');

if (bs) {
  bs.swipeComboMultiplier = 1.0;
}
        setTimeout(() => { renderField(); onDone(); }, 1800);
        return;
      }
      let anyVanished = false;
let totalDamageDealt = 0;

const orderedTargets = sortEnemyTargetsForHitOrder(targets, skill);
let hitDelay = 0;

const hitStyle = getHitStyle(skill);

orderedTargets.forEach(target => {
  setTimeout(() => {
    let totalDmg = calcDamage(chara.atk, target.def, target, skill.multiplier);

    // スワイプ結線コンボ補正（battle_swipe.js が bs.swipeComboMultiplier をセット）
    if (bs && typeof bs.swipeComboMultiplier === 'number') {
      totalDmg = Math.floor(totalDmg * bs.swipeComboMultiplier);
    }

    const cell = document.getElementById('bt-eg-' + target.row + '-' + target.col);
    const damages = splitDamage(totalDmg, hitStyle.count);

    damages.forEach((partDmg, i) => {
      setTimeout(() => {
        if (!target || target.hp <= 0) return;

        showCellDamageEffect(cell);

const offset = getMultiHitPopOffset(i, damages.length);
showResultPopOffset(cell, '-' + partDmg, 'dmg', offset.x, offset.y);

addLog('→ ' + target.name + ' に ' + partDmg + ' ダメージ');

        totalDamageDealt += partDmg;
        const vanished = applyDamageAndCheckVanish(target, partDmg, 'enemy');
        if (vanished) anyVanished = true;

        renderHeader();

        if (vanished) {
          setTimeout(() => renderField(), 700);
        } else {
          renderField();
        }
      }, i * hitStyle.interval);
    });
  }, hitDelay);

  hitDelay += (hitStyle.count - 1) * hitStyle.interval + hitStyle.targetInterval;
});

      // 連続ヒット演出が終わってから、最終描画・勝利判定を行う
setTimeout(() => {
  // drainはダメージ演出完了後に処理
  applyDrainEffect(chara, skill, totalDamageDealt);

  // スワイプ倍率をリセット
  bs.swipeComboMultiplier = 1.0;

  renderHeader();
  renderField();

  // 全敵が倒れたら勝利
  if (bs.enemies.every(e => e.hp <= 0)) {
    setTimeout(() => onBattleEnd(true), 1200);
    return;
  }
}, hitDelay + 700);

    } // ← これを追加。ここで if (hasDmg) を閉じる

    // ── effects[] 処理 ────────────────────────────────────────
    const effects = (skill.effects || []).filter(effect => effect.type !== 'drain');
    let effectDelay = hasDmg ? hitDelay + 400 : 0;
    effects.forEach(effect => {
      setTimeout(() => {
        _applyEffect(effect, chara, true, targets);
        renderHeader();
        renderField();
        if (['spd_up','spd_down'].includes(effect.type)) {
          bs.turnOrder = calcTurnOrder(bs.party, bs.enemies);
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
  // 敵行動選択：ランダム（直前と同じ行動を避ける）
  // ============================================================
  function pickEnemyAction(pool, lastId) {
    if (!pool || !pool.length) return null;
    let candidates = pool.filter(a => a.id !== lastId);
    if (!candidates.length) candidates = pool; // 候補が1つしかなければ同じ行動も許可
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // ============================================================
  // enemy_01 HP帯別行動選択
  // ============================================================
  function selectEnemy01Action(enemy) {
    const hpRate = enemy.hp / enemy.hpMax;
    enemy._tutorialTurn = (enemy._tutorialTurn || 0) + 1;

    // HP30%以下フェーズ3
    if (hpRate <= 0.30) {
      const act = pickEnemyAction(enemy._phase3Pool, enemy._lastActionId);
      enemy._lastActionId = act ? act.id : null;
      return act || enemy._phase3Pool[0];
    }
    // HP50%以下フェーズ2
    if (hpRate <= 0.50) {
      const act = pickEnemyAction(enemy._phase2Pool, enemy._lastActionId);
      enemy._lastActionId = act ? act.id : null;
      return act || enemy._phase2Pool[0];
    }
    // HP51%以上フェーズ1（初回2ターン固定）
    if (enemy._tutorialTurn <= 2 && enemy._phase1Fixed) {
      const act = enemy._phase1Fixed[enemy._tutorialTurn - 1];
      enemy._lastActionId = act ? act.id : null;
      return act || enemy._phase1Pool[0];
    }
    // ランダム
    const act = pickEnemyAction(enemy._phase1Pool, enemy._lastActionId);
    enemy._lastActionId = act ? act.id : null;
    return act || enemy._phase1Pool[0];
  }

  // ============================================================
  // enemy_mask 行動選択
  // ============================================================
  function selectMaskAction(enemy) {
    const pool = enemy._maskActionPool;
    if (!pool) return enemy.actionPattern[0];
    const act = pickEnemyAction(pool, enemy._lastActionId);
    enemy._lastActionId = act ? act.id : null;
    return act || pool[0];
  }

  // ============================================================
  // 敵行動実行（単体）
  // ============================================================
  function doSingleEnemyAction(enemy, onDone) {
    if (hasStatus(enemy, 'stun')) {
      addLog(enemy.name + '：スタン — 行動できない');
      const cell = document.getElementById('bt-eg-' + enemy.row + '-' + enemy.col);
      showResultPop(cell, 'STUN', 'miss');
      setTimeout(() => {
         moveEnemy(enemy); 
         clearEnemyPlannedAction(enemy);
         onDone();
      }, 800);
      return;
    }

    // HP30%以下フェーズ3トリガーチェック（enemy_01のみ）
    const baseId = enemy._origId || enemy.id;
    if (baseId === 'enemy_01' && !enemy._phase3Triggered && enemy.hp / enemy.hpMax <= 0.30) {
      enemy._phase3Triggered = true;
      enemy._reactiveActive = true;
      // HP30%以下で敵自身が霊体化（ダメージ軽減・強制移動無効）
      // 霊体化する
addStatus(enemy, 'spiritual', 2);

// 仲間maskも霊体化する
(bs.enemies || []).forEach(e => {
  if (e !== enemy && e.hp > 0) addStatus(e, 'spiritual', 2);
});

addLog('【白糸の怪異】HP30%以下！霊体化・反応ダメージ開始！');
      renderHeader();
      renderField();
    }

    // 行動選択
    // 行動選択：予告で確定済みの行動を使う
let act = enemy._plannedAction || planEnemyAction(enemy);

if (!act) {
  addLog(enemy.name + '：行動なし');
  clearEnemyPlannedAction(enemy);
  setTimeout(() => {
    moveEnemy(enemy);
    clearEnemyPlannedAction(enemy);
    onDone();
  }, 600);
  return;
}

// 通常actionPattern型の敵だけ、実行時にactionIdxを進める
if (!(baseId === 'enemy_01' && enemy._phase1Pool) &&
    !(baseId === 'enemy_mask' && enemy._maskActionPool)) {
  enemy.actionIdx = (enemy.actionIdx || 0) + 1;
}

    addLog(enemy.name + '：' + act.action);

    if (bs.party.filter(c => c.hp > 0).length === 0) { onBattleEnd(false); return; }

    // ── 行動タイプ別処理 ─────────────────────────────────────
    const type = act.type;

    // 回復系
   if (type === 'heal' || type === 'heal_team' || type === 'heal_boss') {
  doEnemySpecialHeal(enemy, act);
  setTimeout(() => {
    moveEnemy(enemy);
    clearEnemyPlannedAction(enemy);
    onDone();
}, 1200);
  return;
}

    // 状態異常回復（cleanse）
    if (type === 'cleanse_self') {
      const debuffs = ['atk_down', 'def_down', 'spd_down', 'spiritual'];
      debuffs.forEach(d => removeStatus(enemy, d));
      const cell = document.getElementById('bt-eg-' + enemy.row + '-' + enemy.col);
      showResultPop(cell, '状態回復', 'buff');
      addLog('→ ' + enemy.name + ' がデバフ・霊体化を解除した');
      renderHeader();
      renderField();
      setTimeout(() => { 
        moveEnemy(enemy); 
        clearEnemyPlannedAction(enemy);
        onDone(); 
      }, 1000);
      return;
    }

    // move_lock（行動ロック）
    if (type === 'move_lock') {
      const alive = bs.party.filter(u => u.hp > 0);
      if (alive.length) {
        const t = alive[Math.floor(Math.random() * alive.length)];
        addStatus(t, { type: 'move_lock', duration: act.duration || 2 });
        const cell = document.getElementById('bt-ag-' + t.row + '-' + t.col);
        showResultPop(cell, '行動封じ', 'debuff');
        addLog('→ ' + t.name + ' を ' + (act.duration || 2) + 'ターン行動封じ');
        renderField();
      }
      setTimeout(() => { 
        moveEnemy(enemy);
        clearEnemyPlannedAction(enemy); 
        onDone(); 
      }, 1000);
      return;
    }

    // push_front3（前2列のキャラを後方へ最大2マス押し出し）
    if (type === 'push_front3') {
      const targets = bs.party.filter(u => u.hp > 0 && u.row !== 'far');
      if (targets.length) {
        targets.forEach(t => {
          const dmg = Math.max(1, Math.floor(t.hpMax * (act.damageRate || 0.07)));
          // ダメージ表示は移動前のセルに出す
          const cell = document.getElementById('bt-ag-' + t.row + '-' + t.col);
          showResultPop(cell, '-' + dmg, 'dmg');
          const vanished = applyDamageAndCheckVanish(t, dmg, 'ally');
          const result = BattleRange.tryMoveUnitStepwise(t, 'back', 2, bs.party);
          if (result.moved) {
            addLog('→ ' + t.name + ' を' + result.steps + 'マス押し出し、' + dmg + 'ダメージ');
          } else {
            addLog('→ ' + t.name + ' は移動先が塞がっていたため移動せず、' + dmg + 'ダメージ');
          }
          if (vanished) {
            setTimeout(() => renderField(), 700);
          } else {
            renderField();
          }
        });
        renderField();
        checkPartyDead();
      } else {
        addLog('→ 押し出し対象なし');
      }
      setTimeout(() => { 
        moveEnemy(enemy); 
        clearEnemyPlannedAction(enemy);
        onDone(); 
      }, 1200);
      return;
    }

    // debuff_def / debuff_atk
    if (type === 'debuff_def' || type === 'debuff_atk') {
      const alive = bs.party.filter(u => u.hp > 0);
      if (alive.length) {
        const t = alive[Math.floor(Math.random() * alive.length)];
        const statusType = type === 'debuff_def' ? 'def_down' : 'atk_down';
        addStatus(t, { type: statusType, value: act.value || 0.20, duration: act.duration || 2 });
        const cell = document.getElementById('bt-ag-' + t.row + '-' + t.col);
        showResultPop(cell, type === 'debuff_def' ? 'DEF↓' : 'ATK↓', 'debuff');
        addLog('→ ' + t.name + ' に' + (type === 'debuff_def' ? 'DEF' : 'ATK') + 'ダウン (' + (act.duration || 2) + 'T)');
        renderField();
      }
      setTimeout(() => { 
        moveEnemy(enemy);
        clearEnemyPlannedAction(enemy); 
        onDone(); 
      }, 1000);
      return;
    }

    // 通常攻撃（range指定）
    const rangeId = act.range || getRangeFromEnemyActionType(type);
    let targets;
    if (rangeId === 'random1') {
      const alive = bs.party.filter(u => u.hp > 0);
      targets = alive.length ? [alive[Math.floor(Math.random() * alive.length)]] : [];
    } else {
      targets = getTargetsByPierce(
        { row: enemy.row, col: enemy.col },
        rangeId,
        bs.party,
        { pierce: act.pierce === true, side: 'ally' }
      );
    }

    if (targets.length > 0) {
      let delay = 0;
      const vanishedTargets = [];
      targets.forEach(target => {
        setTimeout(() => {
          const dmg = calcEnemyDamage(enemy, target, act);
          const cell = document.getElementById('bt-ag-' + target.row + '-' + target.col);
          showCellDamageEffect(cell);
          showResultPop(cell, '-' + dmg, 'dmg');
          addLog('→ ' + target.name + ' に ' + dmg + ' ダメージ');
          const vanished = applyDamageAndCheckVanish(target, dmg, 'ally');
          if (vanished) {
            setTimeout(() => renderField(), 700);
          } else {
            renderField();
          }
        }, delay);
        delay += 300;
      });
      setTimeout(() => {
        checkPartyDead();
        renderHeader();
        moveEnemy(enemy);
        clearEnemyPlannedAction(enemy);
        onDone();
      }, delay + 400);
    } else {
      addLog('— 範囲内に標的なし');
      moveEnemy(enemy);
      clearEnemyPlannedAction(enemy);
      setTimeout(onDone, 600);
    }
  }

  // ============================================================
  // enemy_01/mask 特殊回復処理
  // ============================================================
  function doEnemySpecialHeal(enemy, act) {
    const type = act.type;
    const rate = act.healRate || 0.20;

    if (type === 'heal_boss') {
      // enemy_01を回復（なければ味方単体回復）
      const boss = bs.enemies.find(e => (e._origId || e.id) === 'enemy_01' && e.hp > 0);
      const target = boss || bs.enemies.find(e => e.hp > 0);
      if (target) {
        const amount = Math.max(1, Math.floor(target.hpMax * rate));
        const healed = healUnit(target, amount);
        if (healed > 0) {
          const cell = document.getElementById('bt-eg-' + target.row + '-' + target.col);
          showResultPop(cell, '+' + healed, 'heal');
          addLog('→ ' + target.name + ' を ' + healed + ' 回復');
        }
      }
      renderHeader();
      renderField();
      return;
    }

    if (type === 'heal_team') {
      // 自身と生存中の仲間全員を回復
      const aliveEnemies = bs.enemies.filter(e => e.hp > 0);
      aliveEnemies.forEach(e => {
        const amount = Math.max(1, Math.floor(e.hpMax * rate));
        const healed = healUnit(e, amount);
        if (healed > 0) {
          const cell = document.getElementById('bt-eg-' + e.row + '-' + e.col);
          showResultPop(cell, '+' + healed, 'heal');
        }
      });
      addLog('→ 仲間全員を ' + Math.round(rate * 100) + '% 回復');
      renderHeader();
      renderField();
      return;
    }

    // heal (enemy_self / enemy_all 既存パターン)
    doEnemyHealAction(enemy, act);
  }

  // ============================================================
  // 敵行動実行（メイン：複数敵を順番に処理）
  // ============================================================
  function doEnemyAction(onDone) {
    const aliveEnemies = (bs.enemies || []).filter(e => e && e.hp > 0);
    if (!aliveEnemies.length) { onDone(); return; }

    // SPD順でソート（速い敵が先に行動）
    const ordered = aliveEnemies.slice().sort((a, b) => (b.spd || 0) - (a.spd || 0));

    let idx = 0;
    function next() {
      if (idx >= ordered.length) { onDone(); return; }
      const e = ordered[idx++];
      if (!e || e.hp <= 0) { next(); return; }
      doSingleEnemyAction(e, () => {
        setTimeout(next, 600);
      });
    }
    next();
  }

  // ============================================================
  // 敵回復行動
  // ============================================================
  function doEnemyHealAction(enemy, action) {
    if (!enemy || !action) return false;

    const enemies = bs.enemies || (bs.enemy ? [bs.enemy] : []);
    let targets = [];

    if (action.target === 'enemy_self') {
      targets = [enemy].filter(e => e && e.hp > 0);
    } else if (action.target === 'enemy_lowest') {
      const t = getLowestHpUnit(enemies);
      targets = t ? [t] : [];
    } else if (action.target === 'enemy_all') {
      targets = enemies.filter(e => e && e.hp > 0);
    }

    if (!targets.length) return false;

    targets.forEach(target => {
      const rate = action.healRate != null ? action.healRate : 0.2;
      const amount = Math.max(1, Math.floor(target.hpMax * rate));
      const healed = healUnit(target, amount);
      if (healed > 0) {
        const cell = document.getElementById('bt-eg-' + target.row + '-' + target.col);
        showResultPop(cell, '+' + healed, 'heal');
      }
    });

    addLog('→ ' + (action.action || '回復') + ' が発動');
    renderHeader();
    renderField();
    return true;
  }

  // ============================================================
  // 怪異移動（複数敵対応・衝突回避）
  // ============================================================
  function moveEnemy(enemy) {
    const target = enemy || bs.enemy;
    if (!target) return;
    if (target.canMove === false || target.fixedPosition) return;
    // 移動確率35%
    if (Math.random() > 0.35) return;
    const _R = ['near','mid','far'];
    const _C = ['left','center','right'];
    // 他の生存敵が占有しているマスを除外
    const occupied = new Set(
      (bs.enemies || [])
        .filter(e => e && e.hp > 0 && e !== target)
        .map(e => e.row + '-' + e.col)
    );
    const available = [];
    _R.forEach(r => _C.forEach(c => {
      const key = r + '-' + c;
      if (!occupied.has(key) && !(target.row === r && target.col === c)) {
        available.push({ row: r, col: c });
      }
    }));
    if (!available.length) return;
    const next = available[Math.floor(Math.random() * available.length)];
    target.row = next.row;
    target.col = next.col;
    renderField();
  }

  // ============================================================
  // ターン終了処理
  // ============================================================
  function onTurnEnd() {
    bs.turn++;
    bs.phase = 'planning';
    bs.pendingActions = [];
    bs.actedCharaIds  = [];       // ← 行動済みIDをリセット
    bs.planningCharaId = null;

    // CD消化
    bs.party.forEach(c => c.skills.forEach(sk => { if (sk.cd > 0) sk.cd--; }));

    // コスト回復（ターン終了時に10回復、最大30）
    if (bs.cost != null && bs.costMax != null) {
      bs.cost = Math.min(bs.costMax, bs.cost + 10);
    }

    // ── statusList持続ターン消化（全敵） ──────────────────────
    (bs.enemies || [bs.enemy]).forEach(e => { if (e) tickStatusList(e); });
    bs.party.forEach(c => tickStatusList(c));

    // 行動順をSPDバフ変動後に再計算
    bs.turnOrder = calcTurnOrder(bs.party, bs.enemies);

    addLog('— ターン ' + bs.turn + ' —');
    renderOrder(null);
    renderField();

    setTimeout(() => showTurnOverlay(bs.turn, () => startPlanning()), 1000);
  }

  // ============================================================
  // EXECUTE中・行動キャラポップ表示
  // ============================================================
  function showActingChara(unit) {
  if (!bs || bs.phase === 'result') return;

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

  function removeActingCharaNow() {
    const pop = document.getElementById('bt-acting-chara-pop');
    if (pop && pop.parentNode) {
      pop.parentNode.removeChild(pop);
    }
  }

  function cleanupBattleOverlays() {
    const ids = [
      'bt-acting-chara-pop',
      'bt-skill-flash',
      'bt-enemy-turn-overlay',
      'bt-turn-overlay',
      'bt-enemy-warning',
      'bt-exec-phase-overlay',
      'bt-next-detail-popup',
      'bt-skill-detail-popup',
      'bt-battle-menu-popup'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    // ダメージ・回復ポップも残っていれば消す
    document.querySelectorAll('.bt-dmg-pop').forEach(el => el.remove());
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
  if (!bs || bs.phase === 'result') return;

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
      // TURN表示後はそのまま onDone（startPlanning）へ進む。
      // 敵攻撃範囲の確認は実体化した敵をタップして行う。
      if (onDone) setTimeout(onDone, 300);
    }, 1800);
  }

  // 敵攻撃予告オーバーレイ
  function showEnemyWarning(onDone, enemy) {
    const e = enemy || bs.enemy;
    const act = peekNextAction(e);
    const isRandom = (act.range || 'random1') === 'random1';

    let el = document.getElementById('bt-enemy-warning');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bt-enemy-warning';
      document.body.appendChild(el);
    }

    // 威力ランクテキスト＆クラス
    const powerMap = { '特大':['特大ダメージ','tok'], '大':['大ダメージ','dai'], '中':['中ダメージ','chu'], '小':['小ダメージ','sho'] };

    // 回復行動は専用表示
    const isHeal = act.type === 'heal';
    const [powerTxt, powerCls] = isHeal
      ? ['回復行動', 'sho']
      : (powerMap[act.power] || ['ダメージ','sho']);

    // 攻撃説明文を生成
    const descText = isHeal
      ? (act.desc || act.action)
      : isRandom
        ? 'ランダムで1体に' + powerTxt
        : act.action + 'の範囲に' + powerTxt;

    // 範囲グリッドHTML（random1以外 & 攻撃時のみ）
    let gridHTML = '';
    if (!isRandom && !isHeal) {
      // BattleRange で敵位置基準の攻撃範囲を取得
      const cells = _getCells({ row: e.row, col: e.col }, act.range);
      const ROWS_ = ['near','mid','far'];
      const COLS_ = ['left','center','right'];
      gridHTML = '<div class="bt-ew-grid">';
      ROWS_.forEach(r => {
        COLS_.forEach(c => {
          const hit = cells.has(r+'-'+c);
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
  function getEnemyBaseId(enemy) {
  return enemy ? (enemy._origId || enemy.id) : '';
}

function planEnemyAction(enemy) {
  if (!enemy || enemy.hp <= 0) return null;

  // すでにこのターンの予定行動が決まっているなら、それを返す
  if (enemy._plannedAction) return enemy._plannedAction;

  const baseId = getEnemyBaseId(enemy);
  let act = null;

  // ボス：HP帯別・固定ターン込みの行動をここで確定
  if (baseId === 'enemy_01' && enemy._phase1Pool) {
    act = selectEnemy01Action(enemy);
  }
  // 仮面の従者：ランダム行動をここで確定
  else if (baseId === 'enemy_mask' && enemy._maskActionPool) {
    act = selectMaskAction(enemy);
  }
  // 通常敵：actionPatternから確定
  else {
    const pat = enemy.actionPattern || [];
    if (pat.length) {
      const idx = enemy.actionIdx || 0;
      act = pat[idx % pat.length];
    }
  }

  if (!act) return null;

  enemy._plannedAction = { ...act };
  return enemy._plannedAction;
}

function peekNextAction(enemy) {
  return planEnemyAction(enemy);
}

function clearEnemyPlannedAction(enemy) {
  if (enemy) enemy._plannedAction = null;
}

function planAllEnemyActions() {
  (bs.enemies || []).forEach(enemy => {
    if (enemy && enemy.hp > 0) planEnemyAction(enemy);
  });
}

  // ============================================================
  // 敵タップ→次行動範囲を味方グリッドに表示
  // ============================================================
  function showEnemyNextRange(enemy) {
    if (!enemy || enemy.hp <= 0) return;
    const act = peekNextAction(enemy);
    if (!act) return;

    // スキル範囲表示が残っていたら解除
    _skillRangeCache = null;
    document.querySelectorAll('.skill-range').forEach(el => el.classList.remove('skill-range'));

    const rangeId = act.range || getRangeFromEnemyActionType(act.type) || 'random1';
    const isRandom = rangeId === 'random1';

    let dangerArg;
    if (isRandom) {
      // random1：味方グリッド全体に薄い警告
      dangerArg = 'random';
    } else {
      // 固定範囲：味方グリッド側のマスを計算
        dangerArg = getEnemyAttackCellsOnAllyGrid(enemy, rangeId);
      if (!dangerArg || dangerArg.size === 0) {
        dangerArg = 'random';
      }
    }

    bs.selectedEnemyPreview = {
      enemyId: enemy.id,
      action: act,
      dangerArg,
    };

    renderEnemyPreviewPanel(enemy, act, rangeId, dangerArg);

    // 敵グリッドは光らせない。味方グリッド側にdanger表示。
    renderField(null, dangerArg);

    const rangeLabel = isRandom ? '（ランダム単体）' : '';
    addLog(enemy.name + 'の次行動：' + (act.action || '不明') + rangeLabel);
  }

  function renderEnemyPreviewPanel(enemy, act, rangeId, dangerArg) {
    const panel = document.getElementById('bt-enemy-preview-panel');
    if (!panel) return;

    const rangeLabel = getEnemyRangeLabel(rangeId, dangerArg);
    const powerLabel = act.power || '—';
    const hitLabel = (act.hit != null) ? (act.hit + '%') : '—';

    panel.innerHTML = `
      <div class="bt-enemy-preview-head">
        <div class="bt-enemy-preview-enemy">${enemy.name}</div>
        <div class="bt-enemy-preview-skill">${act.action || '不明な行動'}</div>
      </div>
      <div class="bt-enemy-preview-desc">${act.desc || '詳細情報なし'}</div>
      <div class="bt-enemy-preview-grid">
        <div class="bt-enemy-preview-item">
          <div class="bt-enemy-preview-label">威力</div>
          <div class="bt-enemy-preview-value">${powerLabel}</div>
        </div>
        <div class="bt-enemy-preview-item">
          <div class="bt-enemy-preview-label">命中</div>
          <div class="bt-enemy-preview-value">${hitLabel}</div>
        </div>
        <div class="bt-enemy-preview-item">
          <div class="bt-enemy-preview-label">範囲</div>
          <div class="bt-enemy-preview-value">${rangeLabel}</div>
        </div>
      </div>
    `;
  }

  function getEnemyRangeLabel(rangeId, dangerArg) {
    if (dangerArg === 'random' || rangeId === 'random1') return 'ランダム単体';
    if (rangeId === 'all') return '全体';
    if (rangeId === 'row_near') return '前列';
    if (rangeId === 'row_mid') return '中列';
    if (rangeId === 'row_far') return '後列';
    if (rangeId === 'col_left') return '左列';
    if (rangeId === 'col_center') return '中央列';
    if (rangeId === 'col_right') return '右列';
    if (rangeId === 'cross' || rangeId === 'field_cross') return '十字';
    if (rangeId === 'xcross' || rangeId === 'field_xcross') return '斜め十字';
    return rangeId || '不明';
  }

  function resetEnemyPreviewPanel() {
    const panel = document.getElementById('bt-enemy-preview-panel');
    if (!panel) return;
    panel.innerHTML = `
      <div class="bt-enemy-preview-empty">敵をタップすると次行動の詳細を確認できます</div>
    `;
  }

  // ============================================================
  // Planning開始
  // ============================================================
  function startPlanning() {
    bs.phase = 'planning';
    bs.pendingActions = [];
    bs.actedCharaIds  = [];       // ← 即時発動方式：行動済みIDをリセット
    bs.planningCharaId = null;
    bs.selectedEnemyPreview = null; // 前ターンの攻撃予告をリセット
    resetEnemyPreviewPanel();
    hideExecuteButton();
    planAllEnemyActions();

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
      // 即時発動方式：行動済みかどうかで SET 表示を切り替え
      const hasAction = !u.isEnemy && bs.actedCharaIds && bs.actedCharaIds.includes(u.id);
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
  function renderAllyGrid(dangerCells) {
    // dangerCells: 敵タップ時に showEnemyNextRange から渡される攻撃予告マスのSet
    // 常時自動表示はしない。dangerCellsがあればdanger、なければ通常表示。

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
        if (sc === null || sc.has(key)) {
          cls += ' skill-range';
        }
      }
        // 敵タップによる攻撃予告
        if (dangerCells) {
          if (dangerCells === 'random') {
            cls += ' danger-random';
          } else if (dangerCells.has(key)) {
            cls += ' danger';
          }
        }
        cell.className = cls;
      });
    });

    const planningId = bs.planningCharaId;

    bs.party.filter(c => c && c.hp > 0).forEach(c => {
      const cell = document.getElementById('bt-ag-'+c.row+'-'+c.col);
      if (!cell) return;
      const hpRate   = c.hp / c.hpMax * 100;
      const isPlanning = c.id === planningId;
      const action   = bs.pendingActions && bs.pendingActions.find(a => a.charaId === c.id);
      // 即時発動方式：行動済みキャラは非アクティブ表示
      const hasActed = bs.actedCharaIds && bs.actedCharaIds.includes(c.id);
      const isInactive = bs.phase === 'planning' && !isPlanning && !hasActed;

      const card = document.createElement('div');
      card.className = 'bt-chara-card'
        + (isInactive ? ' is-inactive' : '');

      card.innerHTML = `
        <img class="bt-chara-img" src="${c.img}" onerror="this.style.opacity='0'">
        ${hasActed ? `<div class="bt-chara-set-label">DONE</div>` : ''}
        ${isPlanning ? `<div class="bt-chara-planning-label">?</div>` : ''}
        <div class="bt-chara-hp-bar-outer">
          <div class="bt-chara-hp-bar-fill ${hpRate < 25 ? 'crit' : hpRate < 50 ? 'low' : ''}" style="width:${hpRate}%"></div>
        </div>
      `;
      if (c.hp > 0) {
        // スキル選択中：このキャラを直接ドラッグ開始させる
      card.addEventListener('pointerdown', (e) => {

  console.log('[card.pointerdown]', {
    chara: c.name,
    selectedSkill,
    selectedChara,
    phase: bs.phase
  });

  // スキル未選択なら通常タップに任せる
  if (!selectedSkill) return;

  // selectedChara が取れている場合だけ、操作キャラ判定する
  if (selectedChara && c.id !== selectedChara.id) return;

  // planning中以外は無視
  if (bs.phase !== 'planning') return;

  e.preventDefault();
  e.stopPropagation();

  const dragChara = selectedChara || c;

  const fromRow = dragChara.row;
  const fromCol = dragChara.col;

  let pendingCell = null;
  let pendingDistance = 0;
  let pendingRate = 1.0;

  card.setPointerCapture?.(e.pointerId);

  addLog('— キャラをつかみました：移動先にドラッグしてください');

  const onMove = (ev) => {
    ev.preventDefault();

    const cellInfo = getAllyCellFromPoint(ev.clientX, ev.clientY);
    if (!cellInfo) return;

    // 自分以外の生存味方がいるマスは不可
    const occupied = bs.party.some(u =>
      u &&
      u.hp > 0 &&
      u.id !== dragChara.id &&
      u.row === cellInfo.row &&
      u.col === cellInfo.col
    );

    if (occupied) {
      clearDragTargetCell();
      pendingCell = null;
      pendingDistance = 0;
      pendingRate = 1.0;
      addLog('— そのマスには味方がいます');
      return;
    }

    const routeDistance = getReachableMoveDistanceAvoidingAllies(
  fromRow,
  fromCol,
  cellInfo.row,
  cellInfo.col,
  dragChara
);

if (routeDistance == null) {
  clearDragTargetCell();
  pendingCell = null;
  pendingDistance = 0;
  pendingRate = 1.0;
  addLog('— 味方に道を塞がれています');
  return;
}

pendingCell = cellInfo;
pendingDistance = routeDistance;
pendingRate = getMoveEffectRate(pendingDistance);

    clearDragTargetCell();
    cellInfo.el.classList.add('drag-target-cell');

    if (bs) {
      bs.swipeComboMultiplier = pendingRate;
    }

    addLog(
      '— 移動距離：' + pendingDistance +
      ' / 効果：' + Math.round(pendingRate * 100) + '%'
    );
  };

  const onUp = (ev) => {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }

    clearDragTargetCell();

    if (pendingCell) {
      dragChara.row = pendingCell.row;
      dragChara.col = pendingCell.col;

      if (bs) {
        bs.swipeComboMultiplier = pendingRate;
      }

      addLog(
        '— 移動確定：' + pendingCell.row + '-' + pendingCell.col +
        ' / 効果：' + Math.round(pendingRate * 100) + '%'
      );

    } else {
      // 移動なしの場合は100%
      if (bs) {
        bs.swipeComboMultiplier = 1.0;
      }

      addLog('— 移動なし：効果100%');
    }

    cleanup();

    if (selectedSkill && selectedChara && typeof window.executeSelectedSkill === 'function') {
      window.executeSelectedSkill();
    }
  };

  function cleanup() {
    clearDragTargetCell();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  }

  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp, { passive: false });
  window.addEventListener('pointercancel', onUp, { passive: false });

}, { passive: false, capture: true });

  card.onclick = () => {
    console.log('[card.onclick]', {
  chara: c.name,
  selectedSkill,
  selectedChara,
  phase: bs.phase
});

  // スキル選択中は情報ポップアップを絶対に出さない
  if (selectedSkill) {
    return;
  }

  // スキル選択中（スワイプモード中）は通常タップを無効化
  if (
    window.SwipeBattle &&
    window.SwipeBattle.state &&
    window.SwipeBattle.state.active
  ) {
    return;
  }

  // planning中以外は無効
  if (bs.phase !== 'planning') return;

    // 既に行動済みなら触れない
    if (bs.actedCharaIds && bs.actedCharaIds.includes(c.id)) return;

    // 現在操作中キャラ以外は触れない
    if (c.id !== bs.planningCharaId) return;

    onCharaTap(c.id);
  };
}
      cell.appendChild(card);
    });
  }

  // ============================================================
  // キャラポップアップ（タップ）
  // ============================================================
  let charaPopupTimer = null;

 function onCharaTap(id) {

  if (bs.phase === 'planning') {

    const chara = bs.party.find(c => c.id === id && c.hp > 0);

    if (chara) {
      renderSkills(chara);
      return;
    }
  }

  showCharaPopup(id);
}

  function showCharaPopup(id) {
    const chara = bs.party.find(c => c.id === id && c.hp > 0);
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
  // ============================================================
  // 勝敗
  // ============================================================
  function checkPartyDead() {
    if (bs.party.filter(c=>c.hp>0).length === 0) onBattleEnd(false);
  }

  function onBattleEnd(win) {
    bs.phase = 'result';
    hideExecuteButton();
    hideActingChara();
    // 念のためスキル名フラッシュも消す
    const skillFlash = document.getElementById('bt-skill-flash');
    if (skillFlash) skillFlash.classList.remove('active');
    let banner = document.getElementById('bt-result-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'bt-result-banner';
      document.body.appendChild(banner);
    }
    banner.innerHTML = `
      <div class="bt-result-txt ${win ? 'win' : 'lose'}">${win ? 'VICTORY' : 'DEFEAT'}</div>
      <div class="bt-result-actions">
        <button class="bt-result-btn" onclick="returnToStageSelect()">ステージ選択へ</button>
        <button class="bt-result-btn bt-result-btn-sub" onclick="returnToHome()">ホームへ</button>
      </div>
    `;
    addLog(win ? '怪異を祓った——' : '敗北…');
    setTimeout(() => banner.classList.add('active'), 800);
  }

  // ============================================================
  // 詳細ポップアップ
  // ============================================================
  window.showNextDetail = function () {
    // renderHeaderで保存済みのプレビューを使う（peekNextAction再実行しない）
    const enemy = bs.nextPreviewEnemy;
    const act = bs.nextPreviewAction;
    if (!act) return;
    let popup = document.getElementById('bt-next-detail-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'bt-next-detail-popup';
      popup.className = 'bt-detail-popup';
      popup.innerHTML = '<div class="bt-detail-box" id="bt-next-detail-box"></div>';
      popup.onclick = e => { if(e.target===popup) closeNextDetail(); };
      document.body.appendChild(popup);
    }
    const enemyLabel = (enemy && bs.enemies && bs.enemies.length > 1) ? (enemy.name + 'の行動') : '怪異の行動';
    document.getElementById('bt-next-detail-box').innerHTML = `
      <div class="bt-detail-title">${act.action}</div>
      <div class="bt-detail-type">${enemyLabel}</div>
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
  function startBattle(party, enemyOrEnemies, options) {
    // 単体 or 配列どちらでも受け取れる
    const enemyList = Array.isArray(enemyOrEnemies)
      ? enemyOrEnemies
      : [enemyOrEnemies || DUMMY_ENEMY];

    const initialPartySeed   = JSON.parse(JSON.stringify(party || DUMMY_PARTY));
    const initialEnemySeed   = JSON.parse(JSON.stringify(enemyList));
    const initialOptionsSeed = JSON.parse(JSON.stringify(options || {}));

    bs = {
      party:           JSON.parse(JSON.stringify(initialPartySeed)),
      enemies:         JSON.parse(JSON.stringify(initialEnemySeed)),
      enemy:           null, // 後で bs.enemies[0] を代入（後方互換用）
      turn:            1,
      actingIdx:       0,
      phase:           'planning',
      pendingActions:  [],
      actedCharaIds:   [],  // ← 即時発動方式：行動済みキャラID
      planningCharaId: null,
      returnChapter:   options && options.returnChapter != null ? options.returnChapter : null,
      returnStageId:   options && options.stageId ? options.stageId : null,
      nextPreviewEnemy:  null,
      nextPreviewAction: null,
      selectedEnemyPreview: null,
      cost:    30,   // 3キャラ共通コスト
      costMax: 30,
      initialBattleSeed: {
        party:   initialPartySeed,
        enemies: initialEnemySeed,
        options: initialOptionsSeed,
      },
    };

    // 全敵に instanceId（個体識別子）を付与する。
    // 同じ id の敵が複数いても instanceId は必ずユニーク。
    // 内部処理は instanceId で個体を追跡し、表示・定義参照は _origId / id を使う。
    const idCount = {};
    bs.enemies.forEach((e, i) => {
      const baseId = e.id;
      if (!idCount[baseId]) idCount[baseId] = 0;
      // instanceId: 例 "enemy_mask_0", "enemy_mask_1"
      e.instanceId = baseId + '_' + idCount[baseId];
      idCount[baseId]++;
      // 2体目以降は _origId を保存して id をユニーク化（後方互換）
      if (idCount[baseId] > 1) {
        e._origId = baseId;
        e.id = baseId + '_' + (idCount[baseId] - 1);
      }
    });

    // 各敵の初期位置設定
    // 各敵の初期位置設定
const _R = ['near','mid','far'], _C = ['left','center','right'];
const occupied = new Set();

function placeEnemyRandom(e) {
  const candidates = [];

  _R.forEach(row => {
    _C.forEach(col => {
      const key = row + '-' + col;
      if (!occupied.has(key)) {
        candidates.push({ row, col, key });
      }
    });
  });

  if (!candidates.length) return false;

  const p = candidates[Math.floor(Math.random() * candidates.length)];
  e.row = p.row;
  e.col = p.col;
  occupied.add(p.key);
  return true;
}

// placeEnemyRandomly: 仕様書命名エイリアス（placeEnemyRandom と同一処理）
const placeEnemyRandomly = placeEnemyRandom;

// 敵初期位置設定
// 優先順位:
//   1. fixedPosition === true  → data の row/col に固定（occupied 登録のみ）
//   2. randomStartPosition === true → row/col を無視してランダム配置
//   3. id別フォールバック固定配置（enemy_mask など）
//   4. 上記いずれでもなければランダム配置
bs.enemies.forEach((e, i) => {
  // 1. fixedPosition: true の敵は data の row/col を固定位置として使う
  if (e.fixedPosition === true) {
    if (e.row && e.col) occupied.add(e.row + '-' + e.col);
    return;
  }

  // 2. randomStartPosition: true の敵は最優先でランダム配置
  //    （enemies.js または stages.js で指定された場合どちらも有効）
  if (e.randomStartPosition === true) {
    placeEnemyRandomly(e);
    return;
  }

  const baseId = e._origId || e.id;
  let placed = false;

  // 3. id別フォールバック固定配置
  if (baseId === 'enemy_mask') {
    // 左→右の順に配置
    const maskPos = [{ row:'mid', col:'left' }, { row:'mid', col:'right' }];
    for (const pos of maskPos) {
      const key = pos.row + '-' + pos.col;
      if (!occupied.has(key)) {
        e.row = pos.row; e.col = pos.col;
        occupied.add(key);
        placed = true;
        break;
      }
    }
  }

  // 4. 配置できなかった場合はランダム配置（重複回避）
  if (!placed) {
    placeEnemyRandomly(e);
  }
});

    // bs.enemy = 代表敵（既存処理との後方互換）
    bs.enemy = bs.enemies[0];

    const ENEMY_TYPE_RANGE = {
      atk_all: 'all', atk_single: 'random1',
      atk_near: 'row_near', atk_mid: 'row_mid', atk_far: 'row_far',
      atk_center: 'col_center', atk_right: 'col_right', atk_left: 'col_left',
      atk_cross: 'cross', atk_xcross: 'xcross',
    };

    // 全敵のactionPatternにrangeとpowerを補完
    bs.enemies.forEach(e => {
      if (e.actionPattern) {
        e.actionPattern = e.actionPattern.map(a => ({
          ...a,
          range: a.range || ENEMY_TYPE_RANGE[a.type] || 'random1',
          power: a.power || '中',
        }));
      }
    });

    // statusList・_statusMod・_base 初期化（全敵）
    bs.enemies.forEach(e => {
      if (!e.statusList || e.statusList.length === 0) e.statusList = [];
      e._statusMod = {};
      e._base = { atk: e.atk, def: e.def, spd: e.spd };
      if (e.statusList.length > 0) _rebuildStatusMod(e);
    });
    bs.party.forEach(c => {
      c.statusList = [];
      c._statusMod = {};
      c._base = { atk: c.atk, def: c.def, spd: c.spd };
    });

    bs.turnOrder = calcTurnOrder(bs.party, bs.enemies);
    bs.swipeComboMultiplier = 1.0; // スワイプ結線倍率（battle_swipe.js が使用）
    locked = false;

    // ── 外部公開（battle_swipe.js からアクセスするため） ──────────
    window.bs = bs;
    window.renderBattleField = renderField;

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

    // body直下に作られたバトル用一時DOMを先に消す
    cleanupBattleOverlays();

    const banner = document.getElementById('bt-result-banner');
    if (banner) banner.classList.remove('active');

    if (!el) {
      locked = false;
      return;
    }

    el.style.opacity = '0';

    setTimeout(() => {
      el.style.display = 'none';
      locked = false;
    }, 350);
  }

  function returnToStageSelect() {
    closeBattle();
    const banner = document.getElementById('bt-result-banner');
    if (banner) banner.classList.remove('active');
    setTimeout(() => {
      const chapter = bs && bs.returnChapter != null ? bs.returnChapter : 0;
      if (typeof openStageSelect === 'function') {
        openStageSelect(chapter);
      } else {
        returnToHome();
      }
    }, 400);
  }

  window.openBattleMenu = function () {
    let popup = document.getElementById('bt-battle-menu-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'bt-battle-menu-popup';
      popup.className = 'bt-detail-popup';
      popup.innerHTML = `
        <div class="bt-detail-box">
          <div class="bt-detail-title">BATTLE MENU</div>
          <div class="bt-battle-menu-actions">
            <button class="bt-result-btn" onclick="restartBattleFromMenu()">やり直し</button>
            <button class="bt-result-btn bt-result-btn-sub" onclick="returnToHomeFromMenu()">ホームに戻る</button>
            <button class="bt-detail-close" onclick="closeBattleMenu()">閉じる</button>
          </div>
        </div>
      `;
      popup.onclick = function(e) {
        if (e.target === popup) closeBattleMenu();
      };
      document.body.appendChild(popup);
    }
    requestAnimationFrame(() => popup.classList.add('active'));
  };

  window.closeBattleMenu = function () {
    const popup = document.getElementById('bt-battle-menu-popup');
    if (popup) popup.classList.remove('active');
  };

  window.restartBattleFromMenu = function () {
    if (!bs || !bs.initialBattleSeed) return;
    const seed = bs.initialBattleSeed;
    closeBattleMenu();
    closeBattle();
    setTimeout(() => {
      startBattle(seed.party, seed.enemies, seed.options);
    }, 450);
  };

  window.returnToHomeFromMenu = function () {
    closeBattleMenu();
    returnToHome();
  };

  function returnToHome() {
    closeBattle();
    const banner = document.getElementById('bt-result-banner');
    if (banner) banner.classList.remove('active');
    setTimeout(() => {
      if (typeof showMainTab === 'function') {
        showMainTab('main');
      }
      const nav = document.getElementById('bottom-nav-shared');
      if (nav) nav.style.display = '';
      const guf = document.getElementById('global-user-frame');
      if (guf) guf.style.display = '';
    }, 400);
  }

  window.startBattle = startBattle;
  window.closeBattle = closeBattle;
  window.returnToStageSelect = returnToStageSelect;
  window.returnToHome = returnToHome;

  window.testRange = function(row,col,range){
  console.log(
    [...BattleRange.getCellsFromRange(
      { row, col },
      range
    )]
  );
};

})();