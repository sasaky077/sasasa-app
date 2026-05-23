// battle_range.js
// バトル用レンジ定義・座標変換専用

(function () {

  const ROWS = ['near', 'mid', 'far'];
  const COLS = ['left', 'center', 'right'];

  const ROW_IDX = { near: 0, mid: 1, far: 2 };
  const COL_IDX = { left: 0, center: 1, right: 2 };

  const ROW_BY_IDX = ['near', 'mid', 'far'];
  const COL_BY_IDX = ['left', 'center', 'right'];

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

    // 正面1列・横3マス
    front_row_3: [
      { dr: -1, dc: -1 },
      { dr: -1, dc:  0 },
      { dr: -1, dc:  1 },
    ],

    // 正面2マス先の横3マス
    front2_row_3: [
      { dr: -2, dc: -1 },
      { dr: -2, dc:  0 },
      { dr: -2, dc:  1 },
    ],

    // 正面3マス先の横3マス
    front3_row_3: [
      { dr: -3, dc: -1 },
      { dr: -3, dc:  0 },
      { dr: -3, dc:  1 },
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

    // 近列3マス
    row_near: [
      { row: 'near', col: 'left' },
      { row: 'near', col: 'center' },
      { row: 'near', col: 'right' },
    ],

    // 中列3マス
    row_mid: [
      { row: 'mid', col: 'left' },
      { row: 'mid', col: 'center' },
      { row: 'mid', col: 'right' },
    ],

    // 遠列3マス
    row_far: [
      { row: 'far', col: 'left' },
      { row: 'far', col: 'center' },
      { row: 'far', col: 'right' },
    ],

    // 左縦列3マス
    col_left: [
      { row: 'near', col: 'left' },
      { row: 'mid',  col: 'left' },
      { row: 'far',  col: 'left' },
    ],

    // 中央縦列3マス
    col_center: [
      { row: 'near', col: 'center' },
      { row: 'mid',  col: 'center' },
      { row: 'far',  col: 'center' },
    ],

    // 右縦列3マス
    col_right: [
      { row: 'near', col: 'right' },
      { row: 'mid',  col: 'right' },
      { row: 'far',  col: 'right' },
    ],

    // 中央十字5マス
    field_cross: [
      { row: 'near', col: 'center' },
      { row: 'mid',  col: 'left' },
      { row: 'mid',  col: 'center' },
      { row: 'mid',  col: 'right' },
      { row: 'far',  col: 'center' },
    ],

    // 中央以外の斜め4マス
    field_xcross: [
      { row: 'near', col: 'left' },
      { row: 'near', col: 'right' },
      { row: 'far',  col: 'left' },
      { row: 'far',  col: 'right' },
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
  };

})();