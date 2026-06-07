// battle_range_32.js
// 32マス共有盤面（row:0〜7, col:0〜3）用レンジ定義・座標変換
// 既存 battle_range.js とは独立して共存する

(function () {

  // row 0〜7、col 0〜3
  const ROWS = [0, 1, 2, 3, 4, 5, 6, 7];
  const COLS = [0, 1, 2, 3, 4];

  // ============================================================
  // レンジプリセット（相対座標系）
  // dr: 行方向（正が下＝row増加）
  // dc: 列方向（正が右＝col増加）
  // ユニットの side に関わらず dr の方向は盤面固定
  // 味方は上（row小）を「敵方向」として定義する
  // ============================================================
  const RANGE_PRESETS_32 = {

    // 自マス
    self: [{ dr: 0, dc: 0 }],

    // 上下左右隣接1マス（通常攻撃用）
    adjacent: [
      { dr: -1, dc:  0 },
      { dr:  1, dc:  0 },
      { dr:  0, dc: -1 },
      { dr:  0, dc:  1 },
    ],

    // 左右2マスのみ
    side_lr: [
      { dr: 0, dc: -1 },
      { dr: 0, dc:  1 },
    ],

    // 前方（ally: 上方向 / enemy: 下方向）を基準とした直線3マス
    // この定義は「ally用」: dr = -1〜-3（上）
    pierce_ally_3: [
      { dr: -1, dc: 0 },
      { dr: -2, dc: 0 },
      { dr: -3, dc: 0 },
    ],

    // enemy用: dr = +1〜+3（下）
    pierce_enemy_3: [
      { dr:  1, dc: 0 },
      { dr:  2, dc: 0 },
      { dr:  3, dc: 0 },
    ],

    // 周囲8マス（神気技・周囲回復用）
    around8: [
      { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
      { dr:  0, dc: -1 },                     { dr:  0, dc: 1 },
      { dr:  1, dc: -1 }, { dr:  1, dc: 0 }, { dr:  1, dc: 1 },
    ],

    // 周囲2マス（中心を除く最大24マス）
    around24: [
      { dr: -2, dc: -2 }, { dr: -2, dc: -1 }, { dr: -2, dc: 0 }, { dr: -2, dc: 1 }, { dr: -2, dc: 2 },
      { dr: -1, dc: -2 }, { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 }, { dr: -1, dc: 2 },
      { dr:  0, dc: -2 }, { dr:  0, dc: -1 },                     { dr:  0, dc: 1 }, { dr:  0, dc: 2 },
      { dr:  1, dc: -2 }, { dr:  1, dc: -1 }, { dr:  1, dc: 0 }, { dr:  1, dc: 1 }, { dr:  1, dc: 2 },
      { dr:  2, dc: -2 }, { dr:  2, dc: -1 }, { dr:  2, dc: 0 }, { dr:  2, dc: 1 }, { dr:  2, dc: 2 },
    ],


    // 自分中心：斜め4マス
diag_x_1: [
  { dr: -1, dc: -1 },
  { dr: -1, dc:  1 },
  { dr:  1, dc: -1 },
  { dr:  1, dc:  1 },
],

    // 自分中心：斜めX字2マス
diag_x_2: [
  { dr: -1, dc: -1 },
  { dr: -2, dc: -2 },

  { dr: -1, dc:  1 },
  { dr: -2, dc:  2 },

  { dr:  1, dc: -1 },
  { dr:  2, dc: -2 },

  { dr:  1, dc:  1 },
  { dr:  2, dc:  2 },
],

    // ── 旧range名互換エイリアス ──────────────────────────────
    // ローグライト等でcharacters_32.jsの変換を通らずに旧名が来ても壊れないようにする

    // front1 = front_ally（目の前1マス）
    front1: [{ dr: -1, dc: 0 }],

    // front2 = pierce_ally_2（前方直線2マス）
    front2: [
      { dr: -1, dc: 0 },
      { dr: -2, dc: 0 },
    ],

    // front3 = pierce_ally_3（前方直線3マス）
    front3: [
      { dr: -1, dc: 0 },
      { dr: -2, dc: 0 },
      { dr: -3, dc: 0 },
    ],

    // pierce2 = pierce_ally_2
    pierce2: [
      { dr: -1, dc: 0 },
      { dr: -2, dc: 0 },
    ],

    // pierce3 = pierce_ally_3
    pierce3: [
      { dr: -1, dc: 0 },
      { dr: -2, dc: 0 },
      { dr: -3, dc: 0 },
    ],

    // pierce_ally_2（前方直線2マス・ally向き）
    pierce_ally_2: [
      { dr: -1, dc: 0 },
      { dr: -2, dc: 0 },
    ],

    // ────────────────────────────────────────────────────────

    // 前方隣接1マス（ally: 上）
    front_ally: [{ dr: -1, dc: 0 }],

    // 前方隣接1マス（enemy: 下）
    front_enemy: [{ dr:  1, dc: 0 }],

    // 前方横3マス・ally用（前・左前・右前）
    front_row_3_ally: [
      { dr: -1, dc:  0 },
      { dr: -1, dc: -1 },
      { dr: -1, dc:  1 },
    ],

    // 前方横3マス・enemy用
    front_row_3_enemy: [
      { dr:  1, dc:  0 },
      { dr:  1, dc: -1 },
      { dr:  1, dc:  1 },
    ],

    // 前方直線貫通3マス + 横広がり（front3_row_3 = 前3列×横3） — 簡易版
    front3_row_3_ally: [
      { dr: -1, dc: -1 }, { dr: -1, dc:  0 }, { dr: -1, dc:  1 },
      { dr: -2, dc: -1 }, { dr: -2, dc:  0 }, { dr: -2, dc:  1 },
      { dr: -3, dc: -1 }, { dr: -3, dc:  0 }, { dr: -3, dc:  1 },
    ],

    front_9_ally: [
      { dr: -1, dc: -1 }, { dr: -1, dc:  0 }, { dr: -1, dc:  1 },
      { dr: -2, dc: -1 }, { dr: -2, dc:  0 }, { dr: -2, dc:  1 },
      { dr: -3, dc: -1 }, { dr: -3, dc:  0 }, { dr: -3, dc:  1 },
    ],

    // 前方左右斜め各3マス（V字）— ally用
    // diag_ally_3 は現時点では diag_v_ally_3 と同じ挙動（将来 diag_left/right に分離予定）
    diag_ally_3: [
      { dr: -1, dc: -1 }, { dr: -2, dc: -2 }, { dr: -3, dc: -3 },
      { dr: -1, dc:  1 }, { dr: -2, dc:  2 }, { dr: -3, dc:  3 },
    ],

    // 前方左右斜め各3マス（V字）— ally用（diag_ally_3 の明示的V字エイリアス）
    diag_v_ally_3: [
      { dr: -1, dc: -1 }, { dr: -2, dc: -2 }, { dr: -3, dc: -3 },
      { dr: -1, dc:  1 }, { dr: -2, dc:  2 }, { dr: -3, dc:  3 },
    ],

    twin_cross_4: [
      { dr: -1, dc:  1 }, // 右上
      { dr:  0, dc: -1 }, // 左
      { dr:  0, dc:  1 }, // 右
      { dr:  1, dc: -1 }, // 左下
    ],

    twin_star_8: [
      { dr: -2, dc:  2 }, // 右上奥
      { dr: -1, dc: -2 }, // 左上
      { dr: -1, dc:  2 }, // 右上
      { dr:  0, dc: -2 }, // 左
      { dr:  0, dc:  2 }, // 右
      { dr:  1, dc: -2 }, // 左下
      { dr:  1, dc:  2 }, // 右下
      { dr:  2, dc: -2 }, // 左下奥
    ],

    // 十字（上下左右1マス）
    cross_32: [
      { dr: -1, dc:  0 },
      { dr:  1, dc:  0 },
      { dr:  0, dc: -1 },
      { dr:  0, dc:  1 },
    ],

    cross_tail_6: [
  { dr: -2, dc:  0 }, // 2マス上
  { dr: -1, dc:  0 }, // 1マス上

  { dr:  0, dc: -1 }, // 左
  { dr:  0, dc:  1 }, // 右

  { dr:  1, dc: -1 }, // 左下
  { dr:  1, dc:  1 }, // 右下
],

    // ── 敵専用攻撃レンジ（盤面固定方向：dr 方向はそのまま使用） ──

    // 敵の前方1マス（下方向）
    enemy_attack_front: [
      { dr: 1, dc: 0 }
    ],

    // 敵の十字範囲（上下左右）
    enemy_attack_cross: [
      { dr: -1, dc:  0 },
      { dr:  1, dc:  0 },
      { dr:  0, dc: -1 },
      { dr:  0, dc:  1 },
    ],
  };

  // ============================================================
  // 移動型プリセット（将棋駒風移動定義）
  // 味方は上方向（dr: -1）を前方とする
  // 敵の場合は getMoveOffsets 内で dr を反転
  // ============================================================
  const MOVE_PRESETS_32 = {
    // 歩：前方1マス
    pawn: [
      { dr: -1, dc: 0 }
    ],
    // 香：前方直線最大3マス
    lance: [
      { dr: -1, dc: 0 },
      { dr: -2, dc: 0 },
      { dr: -3, dc: 0 }
    ],
    // 金将：前・左・右
    gold: [
      { dr: -1, dc:  0 },
      { dr:  0, dc: -1 },
      { dr:  0, dc:  1 }
    ],
    // 銀将：前・斜め前左・斜め前右
    silver: [
      { dr: -1, dc:  0 },
      { dr: -1, dc: -1 },
      { dr: -1, dc:  1 }
    ],
    // 飛車（短縮）：前・左・右 各1マス
    rook_short: [
      { dr: -1, dc:  0 },
      { dr:  0, dc: -1 },
      { dr:  0, dc:  1 }
    ],
    // シグレ型
    // 　□
    // 　自
    // □□□
    shigure: [
      { dr: -1, dc:  0 },
      { dr:  1, dc: -1 },
      { dr:  1, dc:  0 },
      { dr:  1, dc:  1 },
    ],

    // ミユ型：前方直進3マス
    miyu: [
      { dr: -1, dc:  0 },
      { dr: -2, dc:  0 },
      { dr: -3, dc:  0 },
    ],

    // エリ型：上下左右1マス
    eri: [
      { dr: -1, dc:  0 },
      { dr:  1, dc:  0 },
      { dr:  0, dc: -1 },
      { dr:  0, dc:  1 },
    ],

    // アキ型：前2・後2・前桂馬左右
    aki: [
      { dr: -2, dc:  0 },
      { dr:  2, dc:  0 },
      { dr: -2, dc: -1 },
      { dr: -2, dc:  1 },
    ],

    // アサミ型：前・後・左前・右前
    asami: [
      { dr: -1, dc:  0 },
      { dr:  1, dc:  0 },
      { dr: -1, dc: -1 },
      { dr: -1, dc:  1 },
    ],

    // ユズハ型：前2・右後2・左後2
yuzuha: [
  { dr: -2, dc:  0 }, // 2マス上
  { dr:  2, dc: -1 }, // 2マス下・左
  { dr:  2, dc:  1 }, // 2マス下・右
],

    // 角行（短縮）：斜め前左・斜め前右・斜め後左
    bishop_short: [
      { dr: -1, dc: -1 },
      { dr: -1, dc:  1 },
      { dr:  1, dc: -1 }
    ],
    // 桂馬：前方2マス＋左右1マス（2択）
    knight: [
      { dr: -2, dc: -1 },
      { dr: -2, dc:  1 }
    ],

    // ── 敵専用移動型（enemy_ プレフィックス：dr 反転しない） ──
    // [enemy movement unified] 名前と挙動を一致させ、後退・余分な候補を除去。
    // 唯一の正：これを参照して getMoveCells() / 敵AI / UIガイドが動く。

    // 移動なし（ボス用）
    none: [],

    // 敵直進型：前方1マスのみ
    // enemy_move_straight / enemy_zako_straight は同一仕様に統一
    enemy_move_straight: [
      { dr: 1, dc: 0 },
    ],
    enemy_zako_straight: [
      { dr: 1, dc: 0 },
    ],

    // 敵斜行型：斜め前左・斜め前右のみ
    enemy_move_diag: [
      { dr: 1, dc: -1 },
      { dr: 1, dc:  1 },
    ],
    enemy_zako_diag: [
      { dr: 1, dc: -1 },
      { dr: 1, dc:  1 },
    ],

    // 敵シフト型：前進＋左右横移動（詰まり回避あり）
    enemy_zako_shift: [
      { dr: 1, dc:  0 }, // 前方
      { dr: 0, dc: -1 }, // 左
      { dr: 0, dc:  1 }, // 右
    ],

    // 中ボス：前方横3マス
    enemy_midboss_front3: [
      { dr: 1, dc: -1 },
      { dr: 1, dc:  0 },
      { dr: 1, dc:  1 },
    ],
  };

  /**
   * ユニットの moveType から移動オフセット配列を返す
   * enemy は dr を反転して下方向が前方になる
   * @param {object} unit - { moveType?: string, side: 'ally'|'enemy' }
   * @returns {{ dr: number, dc: number }[]}
   */
  function getMoveOffsets(unit) {
  if (!unit) return [];

  // 移動型は MOVE_PRESETS_32 に集約する。
  // キャラ個別の moveCells は使わない。

  const type = unit.moveType || 'silver';

  // 移動なし
  if (type === 'none') return [];

  const preset = MOVE_PRESETS_32[type] || MOVE_PRESETS_32.silver;

  // enemy_ プレフィックスの移動型はそのまま使用（dr 反転しない）
  if (type.startsWith('enemy_')) {
    return preset;
  }

  // 通常の敵（敵側でも将棋駒型を使う場合）は dr を反転して下方向を前方に
  if (unit.side === 'enemy') {
    return preset.map(p => ({ dr: -p.dr, dc: p.dc }));
  }

  return preset;
}

  // ============================================================
  // フィールド固定座標プリセット
  // ============================================================
  const FIELD_PRESETS_32 = {
  // 全マス
  all:       'all',
  enemy_all: 'all',
  ally_all:  'all',
  field_all: 'all',

  // 固定十字：中央縦1列 + row2横一列
  // □□■□□
  // □□■□□
  // ■■■■■
  // □□■□□
  // □□■□□
  // □□■□□
  // □□■□□
  // □□■□□
  field_cross_center: (function () {
    const cells = [];

    // 縦線：中央列 col:2 を全row
    for (let r = 0; r < 8; r++) {
      cells.push({ row: r, col: 2 });
    }

    // 横線：row:2 を全col
    for (let c = 0; c < 5; c++) {
      cells.push({ row: 2, col: c });
    }

    return cells;
  })(),

  // 中央列（col:1,2）縦全体（ボス予兆攻撃用）
  center_cols: (function () {
    const cells = [];
    for (let r = 0; r < 8; r++) {
      cells.push({ row: r, col: 1 });
      cells.push({ row: r, col: 2 });
    }
    return cells;
  })(),

    // 味方初期エリア row:5〜7
    ally_zone: (function () {
      const cells = [];
      for (let r = 5; r < 8; r++) {
        for (let c = 0; c < 5; c++) cells.push({ row: r, col: c });
      }
      return cells;
    })(),

    // 敵初期エリア row:0〜2
    enemy_zone: (function () {
      const cells = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) cells.push({ row: r, col: c });
      }
      return cells;
    })(),
  };

  // ============================================================
  // ユーティリティ
  // ============================================================
  function allCells() {
    const s = new Set();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 5; c++) {
        s.add(r + '-' + c);
      }
    }
    return s;
  }

  function isValidCell(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 5;
}

  // 相対座標から対象マスセットを生成
  function cellsFromRelative32(user, deltas) {
    const s = new Set();
    if (user == null || user.row == null || user.col == null) return s;
    deltas.forEach(({ dr, dc }) => {
      const nr = user.row + dr;
      const nc = user.col + dc;
      if (isValidCell(nr, nc)) s.add(nr + '-' + nc);
    });
    return s;
  }

  // フィールド固定座標からセットを生成
  function cellsFromField32(cells) {
    if (cells === 'all') return allCells();
    const s = new Set();
    cells.forEach(({ row, col }) => {
      if (isValidCell(row, col)) s.add(row + '-' + col);
    });
    return s;
  }

  // レンジ文字列または定義オブジェクトを正規化
  function normalizeRange32(range) {
    if (typeof range === 'string') {
      if (RANGE_PRESETS_32[range]) {
        return { origin: 'self', cells: RANGE_PRESETS_32[range] };
      }
      if (FIELD_PRESETS_32[range] != null) {
        return { origin: 'field', cells: FIELD_PRESETS_32[range] };
      }
      // 未知レンジを警告（サイレント失敗の代わり）
      console.warn('[BattleRange32] 未定義のレンジ名:', range,
        '— RANGE_PRESETS_32 または FIELD_PRESETS_32 への追加を確認してください');
      return null;
    }
    if (range && typeof range === 'object') return range;
    return null;
  }

  // ユーザー位置とレンジ定義からマスセットを取得
  function getCellsFromRange32(user, range) {
    // col_center_32: ユーザーの列を縦全体（特殊処理）
    if (range === 'col_center_32') {
      const s = new Set();
      if (user && user.col != null) {
        for (let r = 0; r < 8; r++) {
          if (isValidCell(r, user.col)) s.add(`${r}-${user.col}`);
        }
      }
      return s;
    }

    const normalized = normalizeRange32(range);
    if (!normalized) return new Set();
    if (normalized.origin === 'field') return cellsFromField32(normalized.cells);
    return cellsFromRelative32(user, normalized.cells || []);
  }

  // マスセット内の生存ユニットを返す
  function getUnitsFromRange32(user, range, units) {
    const cells = getCellsFromRange32(user, range);
    return units.filter(u => u.hp > 0 && cells.has(u.row + '-' + u.col));
  }

  // ============================================================
  // 移動ユーティリティ
  // ============================================================
  function isCellOccupied32(allUnits, row, col, self) {
    return allUnits.some(u => u && u !== self && u.hp > 0 && u.row === row && u.col === col);
  }

  function canMoveTo32(allUnits, row, col, self) {
    if (!isValidCell(row, col)) return false;
    if (isCellOccupied32(allUnits, row, col, self)) return false;
    return true;
  }

  // 単純移動（1ステップ）
  function tryMoveUnit32(unit, toRow, toCol, allUnits) {
    if (!unit) return false;
    if (!canMoveTo32(allUnits, toRow, toCol, unit)) return false;
    unit.row = toRow;
    unit.col = toCol;
    return true;
  }

  // マンハッタン距離
  function manhattanDist(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  }

  // 指定ユニットに最も近い目標ユニットを返す
  function nearestUnit(from, targets) {
    let best = null;
    let bestDist = Infinity;
    targets.forEach(t => {
      if (t.hp <= 0) return;
      const d = manhattanDist(from, t);
      if (d < bestDist) { bestDist = d; best = t; }
    });
    return best;
  }

  // 1マスずつ target に近づく（障害物考慮）
  function stepToward(unit, target, allUnits) {
    if (!unit || !target) return false;
    const dr = target.row - unit.row;
    const dc = target.col - unit.col;

    // 縦・横どちらを優先するか（距離が大きい方）
    const candidates = [];
    if (dr !== 0) candidates.push({ row: unit.row + Math.sign(dr), col: unit.col });
    if (dc !== 0) candidates.push({ row: unit.row, col: unit.col + Math.sign(dc) });
    // 距離が大きい方を先頭に
    if (Math.abs(dr) < Math.abs(dc)) candidates.reverse();

    for (const c of candidates) {
      if (canMoveTo32(allUnits, c.row, c.col, unit)) {
        unit.row = c.row;
        unit.col = c.col;
        return true;
      }
    }
    return false;
  }

  // 最大maxSteps マス移動（空きマスを選んでドラッグ移動）
  function moveUnitTo32(unit, toRow, toCol, maxSteps, allUnits) {
    if (!unit) return false;
    const dist = manhattanDist(unit, { row: toRow, col: toCol });
    if (dist > maxSteps) return false;
    if (!canMoveTo32(allUnits, toRow, toCol, unit)) return false;
    unit.row = toRow;
    unit.col = toCol;
    return true;
  }

  window.BattleRange32 = {
    RANGE_PRESETS_32,
    FIELD_PRESETS_32,
    MOVE_PRESETS_32,
    getMoveOffsets,
    allCells,
    isValidCell,
    cellsFromRelative32,
    cellsFromField32,
    normalizeRange32,
    getCellsFromRange32,
    getUnitsFromRange32,
    isCellOccupied32,
    canMoveTo32,
    tryMoveUnit32,
    manhattanDist,
    nearestUnit,
    stepToward,
    moveUnitTo32,
  };

})();
