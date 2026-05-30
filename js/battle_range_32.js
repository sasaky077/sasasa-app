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

    // 前方隣接1マス（ally: 上）
    front_ally: [{ dr: -1, dc: 0 }],

    // 前方隣接1マス（enemy: 下）
    front_enemy: [{ dr:  1, dc: 0 }],
  };

  // ============================================================
  // フィールド固定座標プリセット
  // ============================================================
  const FIELD_PRESETS_32 = {
    // 全マス
    all: 'all',

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
      return null;
    }
    if (range && typeof range === 'object') return range;
    return null;
  }

  // ユーザー位置とレンジ定義からマスセットを取得
  function getCellsFromRange32(user, range) {
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
