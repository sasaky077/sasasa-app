// battle_range.js
// バトル用レンジ定義・座標変換専用
// 4×4グリッド対応版
// ROWS: near / mid / far / deep
// COLS: left / center / right / outer

(function () {

  const ROWS = ['near', 'mid', 'far', 'deep'];
  const COLS = ['left', 'center', 'right', 'outer'];

  const ROW_IDX = { near: 0, mid: 1, far: 2, deep: 3 };
  const COL_IDX = { left: 0, center: 1, right: 2, outer: 3 };

  const ROW_BY_IDX = ['near', 'mid', 'far', 'deep'];
  const COL_BY_IDX = ['left', 'center', 'right', 'outer'];

  // ============================================================
  // よく使うレンジID
  // dr: 縦方向。-1 = 前、+1 = 後ろ
  // dc: 横方向。-1 = 左、+1 = 右
  // ============================================================
  const RANGE_PRESETS = {

    // 自分のマス
    self: [
      { dr: 0, dc: 0 },
    ],

    // 正面1マス
    front1: [
      { dr: -1, dc: 0 },
    ],

    // 正面2マス先
    front2: [
      { dr: -2, dc: 0 },
    ],

    // 正面3マス先
    front3: [
      { dr: -3, dc: 0 },
    ],

    // 左1マス
    left1: [
      { dr: 0, dc: -1 },
    ],

    // 右1マス
    right1: [
      { dr: 0, dc: 1 },
    ],

    // 正面1列・横3マス（後方互換）
    front_row_3: [
      { dr: -1, dc: -1 },
      { dr: -1, dc:  0 },
      { dr: -1, dc:  1 },
    ],

    // 正面1列・横4マス（4×4新規）
    front_row_4: [
      { dr: -1, dc: -1 },
      { dr: -1, dc:  0 },
      { dr: -1, dc:  1 },
      { dr: -1, dc:  2 },
    ],

    // 正面2マス先の横3マス
    front2_row_3: [
      { dr: -2, dc: -1 },
      { dr: -2, dc:  0 },
      { dr: -2, dc:  1 },
    ],

    // 正面2マス先の横4マス（4×4新規）
    front2_row_4: [
      { dr: -2, dc: -1 },
      { dr: -2, dc:  0 },
      { dr: -2, dc:  1 },
      { dr: -2, dc:  2 },
    ],

    // 正面3マス先の横3マス
    front3_row_3: [
      { dr: -3, dc: -1 },
      { dr: -3, dc:  0 },
      { dr: -3, dc:  1 },
    ],

    // 正面3マス先の横4マス（4×4新規）
    front3_row_4: [
      { dr: -3, dc: -1 },
      { dr: -3, dc:  0 },
      { dr: -3, dc:  1 },
      { dr: -3, dc:  2 },
    ],

    // 正面方向へ縦2マス
    pierce2: [
      { dr: -1, dc: 0 },
      { dr: -2, dc: 0 },
    ],

    // 正面方向へ縦3マス
    pierce3: [
      { dr: -1, dc: 0 },
      { dr: -2, dc: 0 },
      { dr: -3, dc: 0 },
    ],

    // 正面方向へ縦4マス
    pierce4: [
      { dr: -1, dc: 0 },
      { dr: -2, dc: 0 },
      { dr: -3, dc: 0 },
      { dr: -4, dc: 0 },
    ],

    // 味方位置移動用：自身の前方同列すべて（盤面外は後段で除外）
    front_line_all_ally: [
      { dr: -1, dc: 0 },
      { dr: -2, dc: 0 },
      { dr: -3, dc: 0 },
      { dr: -4, dc: 0 },
      { dr: -5, dc: 0 },
      { dr: -6, dc: 0 },
      { dr: -7, dc: 0 },
    ],

    // 敵最奥まで縦貫通（8段フィールド対応）
    pierce_all: [
      { dr: -1, dc: 0 },
      { dr: -2, dc: 0 },
      { dr: -3, dc: 0 },
      { dr: -4, dc: 0 },
      { dr: -5, dc: 0 },
      { dr: -6, dc: 0 },
      { dr: -7, dc: 0 },
    ],

    // 前方横3 + その奥中央1
    front_wide: [
      { dr: -1, dc: -1 },
      { dr: -1, dc:  0 },
      { dr: -1, dc:  1 },
      { dr: -2, dc:  0 },
    ],

    // 小型扇形
    cone_small: [
      { dr: -1, dc:  0 },
      { dr: -2, dc: -1 },
      { dr: -2, dc:  0 },
      { dr: -2, dc:  1 },
    ],

    // 上下左右4マス
    cross: [
      { dr: -1, dc:  0 },
      { dr:  1, dc:  0 },
      { dr:  0, dc: -1 },
      { dr:  0, dc:  1 },
    ],

    // 周囲8マス
    around8: [
      { dr: -1, dc: -1 },
      { dr: -1, dc:  0 },
      { dr: -1, dc:  1 },
      { dr:  0, dc: -1 },
      { dr:  0, dc:  1 },
      { dr:  1, dc: -1 },
      { dr:  1, dc:  0 },
      { dr:  1, dc:  1 },
    ],

    // 斜め4マス
    xcross: [
      { dr: -1, dc: -1 },
      { dr: -1, dc:  1 },
      { dr:  1, dc: -1 },
      { dr:  1, dc:  1 },
    ],

    // 1マス飛ばして正面
    jump_front: [
      { dr: -2, dc: 0 },
    ],

    // 遠距離正面1マス
    sniper: [
      { dr: -3, dc: 0 },
    ],

    // 正面斜め2マス
    diagonal_front: [
      { dr: -1, dc: -1 },
      { dr: -1, dc:  1 },
    ],
  };

  // ============================================================
  // 固定座標系レンジ
  // origin:'field' 用
  // ============================================================
  const FIELD_PRESETS = {

    // 全マス
    all: 'all',

    // 近列4マス
    row_near: [
      { row: 'near', col: 'left' },
      { row: 'near', col: 'center' },
      { row: 'near', col: 'right' },
      { row: 'near', col: 'outer' },
    ],

    // 中列4マス
    row_mid: [
      { row: 'mid', col: 'left' },
      { row: 'mid', col: 'center' },
      { row: 'mid', col: 'right' },
      { row: 'mid', col: 'outer' },
    ],

    // 遠列4マス
    row_far: [
      { row: 'far', col: 'left' },
      { row: 'far', col: 'center' },
      { row: 'far', col: 'right' },
      { row: 'far', col: 'outer' },
    ],

    // 深列4マス（4×4新規）
    row_deep: [
      { row: 'deep', col: 'left' },
      { row: 'deep', col: 'center' },
      { row: 'deep', col: 'right' },
      { row: 'deep', col: 'outer' },
    ],

    // 左縦列4マス
    col_left: [
      { row: 'near', col: 'left' },
      { row: 'mid',  col: 'left' },
      { row: 'far',  col: 'left' },
      { row: 'deep', col: 'left' },
    ],

    // 中央縦列4マス
    col_center: [
      { row: 'near', col: 'center' },
      { row: 'mid',  col: 'center' },
      { row: 'far',  col: 'center' },
      { row: 'deep', col: 'center' },
    ],

    // 右縦列4マス
    col_right: [
      { row: 'near', col: 'right' },
      { row: 'mid',  col: 'right' },
      { row: 'far',  col: 'right' },
      { row: 'deep', col: 'right' },
    ],

    // 外縦列4マス（4×4新規）
    col_outer: [
      { row: 'near', col: 'outer' },
      { row: 'mid',  col: 'outer' },
      { row: 'far',  col: 'outer' },
      { row: 'deep', col: 'outer' },
    ],

    // 中央十字（4×4版）
    field_cross: [
      { row: 'near', col: 'center' },
      { row: 'mid',  col: 'left' },
      { row: 'mid',  col: 'center' },
      { row: 'mid',  col: 'right' },
      { row: 'far',  col: 'center' },
      { row: 'far',  col: 'left' },
      { row: 'far',  col: 'right' },
      { row: 'deep', col: 'center' },
    ],

    // 斜め4隅（4×4版）
    field_xcross: [
      { row: 'near', col: 'left'  },
      { row: 'near', col: 'outer' },
      { row: 'deep', col: 'left'  },
      { row: 'deep', col: 'outer' },
    ],

    // 外周マス（4×4版、端4行の端4列）
    field_outer: [
      { row: 'near', col: 'left'   },
      { row: 'near', col: 'center' },
      { row: 'near', col: 'right'  },
      { row: 'near', col: 'outer'  },
      { row: 'mid',  col: 'left'   },
      { row: 'mid',  col: 'outer'  },
      { row: 'far',  col: 'left'   },
      { row: 'far',  col: 'outer'  },
      { row: 'deep', col: 'left'   },
      { row: 'deep', col: 'center' },
      { row: 'deep', col: 'right'  },
      { row: 'deep', col: 'outer'  },
    ],

    // 外周マス別名（後方互換）
    field_outer_4: [
      { row: 'near', col: 'left'   },
      { row: 'near', col: 'center' },
      { row: 'near', col: 'right'  },
      { row: 'near', col: 'outer'  },
      { row: 'mid',  col: 'left'   },
      { row: 'mid',  col: 'outer'  },
      { row: 'far',  col: 'left'   },
      { row: 'far',  col: 'outer'  },
      { row: 'deep', col: 'left'   },
      { row: 'deep', col: 'center' },
      { row: 'deep', col: 'right'  },
      { row: 'deep', col: 'outer'  },
    ],

    // 左列＋右列（中央2列除外）
    field_side_columns: [
      { row: 'near', col: 'left'  },
      { row: 'mid',  col: 'left'  },
      { row: 'far',  col: 'left'  },
      { row: 'deep', col: 'left'  },
      { row: 'near', col: 'outer' },
      { row: 'mid',  col: 'outer' },
      { row: 'far',  col: 'outer' },
      { row: 'deep', col: 'outer' },
    ],
  };

  function allCells() {
    const s = new Set();
    ROWS.forEach(row => {
      COLS.forEach(col => {
        s.add(row + '-' + col);
      });
    });
    return s;
  }

  function cellsFromRelative(user, cells) {
    const s = new Set();

    if (!user || !user.row || !user.col) return s;

    cells.forEach(cell => {
      const ri = ROW_IDX[user.row] + cell.dr;
      const ci = COL_IDX[user.col] + cell.dc;

      const row = ROW_BY_IDX[ri];
      const col = COL_BY_IDX[ci];

      if (row && col) {
        s.add(row + '-' + col);
      }
    });

    return s;
  }

  function cellsFromField(cells) {
    const s = new Set();

    if (cells === 'all') {
      return allCells();
    }

    cells.forEach(cell => {
      if (ROWS.includes(cell.row) && COLS.includes(cell.col)) {
        s.add(cell.row + '-' + cell.col);
      }
    });

    return s;
  }

  function normalizeRange(range) {
    if (typeof range === 'string') {
      if (RANGE_PRESETS[range]) {
        return {
          origin: 'self',
          cells: RANGE_PRESETS[range],
        };
      }

      if (FIELD_PRESETS[range]) {
        return {
          origin: 'field',
          cells: FIELD_PRESETS[range],
        };
      }

      return null;
    }

    if (range && typeof range === 'object') {
      return range;
    }

    return null;
  }

  function getCellsFromRange(user, range) {
    const normalized = normalizeRange(range);

    if (!normalized) return new Set();

    if (normalized.type === 'all') {
      return allCells();
    }

    if (normalized.origin === 'field') {
      return cellsFromField(normalized.cells);
    }

    return cellsFromRelative(user, normalized.cells || []);
  }

  function getUnitsFromRange(user, range, units) {
    const cells = getCellsFromRange(user, range);

    return units.filter(unit => {
      return unit.hp > 0 && cells.has(unit.row + '-' + unit.col);
    });
  }

  // ============================================================
  // 移動先チェック・共通移動ヘルパー
  // units: 同陣営のユニット配列（敵なら bs.enemies、味方なら bs.party）
  // self: 移動対象ユニット自身（占有判定から除外）
  // ============================================================
  function isCellOccupied(units, row, col, self) {
    return (units || []).some(u =>
      u &&
      u !== self &&
      u.hp > 0 &&
      u.row === row &&
      u.col === col
    );
  }

  function canMoveTo(units, row, col, self) {
    if (!ROWS.includes(row) || !COLS.includes(col)) return false;
    if (isCellOccupied(units, row, col, self)) return false;
    return true;
  }

  function tryMoveUnit(unit, toRow, toCol, units) {
    if (!unit) return false;
    if (!canMoveTo(units, toRow, toCol, unit)) return false;
    unit.row = toRow;
    unit.col = toCol;
    return true;
  }

  // ============================================================
  // 段階移動ヘルパー
  // direction: 'front' | 'back' | 'left' | 'right'
  //   front = deep→far→mid→near（near方向）
  //   back  = near→mid→far→deep（deep方向）
  //   left  = outer/right/center→left
  //   right = left/center/right→outer
  // ============================================================
  function getNextCell(row, col, direction) {
    const rowIdx = ROW_IDX[row];
    const colIdx = COL_IDX[col];

    if (direction === 'back') {
      const nextRow = ROW_BY_IDX[rowIdx + 1];
      return nextRow ? { row: nextRow, col } : null;
    }
    if (direction === 'front') {
      const nextRow = ROW_BY_IDX[rowIdx - 1];
      return nextRow ? { row: nextRow, col } : null;
    }
    if (direction === 'left') {
      const nextCol = COL_BY_IDX[colIdx - 1];
      return nextCol ? { row, col: nextCol } : null;
    }
    if (direction === 'right') {
      const nextCol = COL_BY_IDX[colIdx + 1];
      return nextCol ? { row, col: nextCol } : null;
    }
    return null;
  }

  // 1マスずつ方向へ移動を試みる。途中にユニットがいたらその直前で停止。
  // 戻り値: { moved: bool, steps: number, from: {row,col}, to: {row,col} }
  function tryMoveUnitStepwise(unit, direction, maxSteps, units) {
    if (!unit || maxSteps <= 0) {
      return {
        moved: false,
        steps: 0,
        from: unit ? { row: unit.row, col: unit.col } : null,
        to:   unit ? { row: unit.row, col: unit.col } : null,
      };
    }

    const from = { row: unit.row, col: unit.col };
    let curRow = unit.row;
    let curCol = unit.col;
    let movedSteps = 0;

    for (let i = 0; i < maxSteps; i++) {
      const next = getNextCell(curRow, curCol, direction);

      // 盤外
      if (!next || !next.row || !next.col) break;

      // 占有チェック（死亡ユニットは無視される：canMoveTo → isCellOccupied が hp>0 のみ対象）
      if (!canMoveTo(units, next.row, next.col, unit)) break;

      curRow = next.row;
      curCol = next.col;
      movedSteps++;
    }

    if (movedSteps > 0) {
      unit.row = curRow;
      unit.col = curCol;
    }

    return {
      moved: movedSteps > 0,
      steps: movedSteps,
      from,
      to: { row: unit.row, col: unit.col },
    };
  }

  window.BattleRange = {
    ROWS,
    COLS,
    RANGE_PRESETS,
    FIELD_PRESETS,
    allCells,
    cellsFromRelative,
    cellsFromField,
    normalizeRange,
    getCellsFromRange,
    getUnitsFromRange,
    isCellOccupied,
    canMoveTo,
    tryMoveUnit,
    getNextCell,
    tryMoveUnitStepwise,
  };

})();
