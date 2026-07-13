// combo_32.js
// Battle32用コンボ連鎖管理。
// 仕様:
// - 起点攻撃の処理完了後に開始
// - 世代単位の幅優先(BFS)
// - 同世代はキャラパネル左→右（bs.allies配列順）
// - 1アクション中、同じキャラのコンボは1回だけ
// - 各コンボは 演出→ダメージ/効果→撃破判定 を完了してから次へ
(function () {
  'use strict';

  const BOARD_ROWS = 8;
  const BOARD_COLS = 5;

  // コンボ反応範囲の基本形。
  // owner自身のマスは含めない。
  const RANGE_BUILDERS = {
    // 同じ縦列すべて（前後両方向）
    combo_line_all(owner) {
      const cells = [];
      for (let row = 0; row < BOARD_ROWS; row++) {
        if (row !== owner.row) cells.push({ row, col: owner.col });
      }
      return cells;
    },

    // 縦横すべて
    combo_cross_all(owner) {
      const cells = [];
      for (let row = 0; row < BOARD_ROWS; row++) {
        if (row !== owner.row) cells.push({ row, col: owner.col });
      }
      for (let col = 0; col < BOARD_COLS; col++) {
        if (col !== owner.col) cells.push({ row: owner.row, col });
      }
      return cells;
    },

    // 斜め4方向すべて
    combo_x_all(owner) {
      const cells = [];
      const dirs = [
        { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
        { dr: 1, dc: -1 }, { dr: 1, dc: 1 },
      ];
      dirs.forEach(({ dr, dc }) => {
        let row = owner.row + dr;
        let col = owner.col + dc;
        while (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
          cells.push({ row, col });
          row += dr;
          col += dc;
        }
      });
      return cells;
    },

    // R向け：上下左右の隣接4マス
    combo_cross_1(owner) {
      const cells = [];
      [
        { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
        { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
      ].forEach(({ dr, dc }) => {
        const row = owner.row + dr;
        const col = owner.col + dc;
        if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
          cells.push({ row, col });
        }
      });
      return cells;
    },

    // R向け：斜め隣接4マス
    combo_x_1(owner) {
      const cells = [];
      [
        { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
        { dr: 1, dc: -1 }, { dr: 1, dc: 1 },
      ].forEach(({ dr, dc }) => {
        const row = owner.row + dr;
        const col = owner.col + dc;
        if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
          cells.push({ row, col });
        }
      });
      return cells;
    },

    // R向け：同じ縦列の前後2マス以内
    combo_line_2(owner) {
      const cells = [];
      [-2, -1, 1, 2].forEach(dr => {
        const row = owner.row + dr;
        if (row >= 0 && row < BOARD_ROWS) cells.push({ row, col: owner.col });
      });
      return cells;
    },

    // 十字＋斜め4方向すべて（SR共鳴強化用）
    combo_star_all(owner) {
      const cells = [];
      for (let row = 0; row < BOARD_ROWS; row++) {
        if (row !== owner.row) cells.push({ row, col: owner.col });
      }
      for (let col = 0; col < BOARD_COLS; col++) {
        if (col !== owner.col) cells.push({ row: owner.row, col });
      }
      const dirs = [
        { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
        { dr: 1, dc: -1 }, { dr: 1, dc: 1 },
      ];
      dirs.forEach(({ dr, dc }) => {
        let row = owner.row + dr;
        let col = owner.col + dc;
        while (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
          cells.push({ row, col });
          row += dr;
          col += dc;
        }
      });
      return cells;
    },

    // 周囲8マス
    combo_around8(owner) {
      const cells = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const row = owner.row + dr;
          const col = owner.col + dc;
          if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
            cells.push({ row, col });
          }
        }
      }
      return cells;
    },
  };

  // 旧ID互換。既存保存データが残っていても動かす。
  const LEGACY_RANGE_ALIAS = {
    combo_cross_4: 'combo_cross_all',
    combo_front_4: 'combo_line_all',
    combo_diagonal_4: 'combo_x_all',
  };

  const PRESETS = RANGE_BUILDERS;

  let serial = 0;
  let running = false;

  function resolveRangeId(rangeId) {
    return LEGACY_RANGE_ALIAS[rangeId] || rangeId || 'combo_cross_all';
  }

  function buildRangeCells(owner, rangeId) {
    if (!owner) return [];
    const id = resolveRangeId(rangeId);
    const builder = RANGE_BUILDERS[id] || RANGE_BUILDERS.combo_cross_all;
    return builder(owner);
  }

  function inRange(owner, trigger, rangeId) {
    if (!owner || !trigger) return false;
    return buildRangeCells(owner, rangeId).some(cell =>
      cell.row === trigger.row && cell.col === trigger.col
    );
  }

  function getPanelOrderMap(bs) {
    const map = new Map();
    (bs && bs.allies || []).forEach((unit, index) => {
      if (unit && unit._uid) map.set(unit._uid, index);
    });
    return map;
  }

  function sortByPanelOrder(units, panelOrder) {
    return [...units].sort((a, b) => {
      const ai = panelOrder.has(a._uid) ? panelOrder.get(a._uid) : Number.MAX_SAFE_INTEGER;
      const bi = panelOrder.has(b._uid) ? panelOrder.get(b._uid) : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  }

  function collectResponders(bs, trigger, fired, queued, panelOrder) {
    if (!bs || !trigger) return [];

    const responders = (bs.allies || []).filter(unit =>
      unit &&
      unit.hp > 0 &&
      unit._uid !== trigger._uid &&
      unit.combo &&
      unit.combo.skill &&
      !fired.has(unit._uid) &&
      !queued.has(unit._uid) &&
      inRange(unit, trigger, unit.combo.range)
    );

    return sortByPanelOrder(responders, panelOrder);
  }

  /**
   * 起点キャラの攻撃完了後に呼ぶ。
   * @returns {Promise<string[]>} 実際にコンボを実行したUID順
   */
  async function runFromAction(actorUid, options) {
    const B = window.Battle32;
    if (
      running ||
      !B ||
      typeof B.getBS !== 'function' ||
      typeof B.executeComboSkill !== 'function'
    ) {
      return [];
    }

    const bs = B.getBS();
    if (!bs || bs.result) return [];

    const root = (bs.allies || []).find(unit =>
      unit && unit._uid === actorUid && unit.hp > 0
    );
    if (!root) return [];

    running = true;

    const ctx = {
      id: ++serial,
      rootUid: actorUid,
      fired: new Set(),
      queued: new Set(),
      log: [],
      generation: 0,
      options: options || {},
    };

    try {
      const panelOrder = getPanelOrderMap(bs);

      // 起点キャラAの攻撃アップ演出が完全に終わってから、
      // 1COMBO目の表示へ進む。
      if (typeof window.waitForBattle32AttackCinematicIdle === 'function') {
        await window.waitForBattle32AttackCinematicIdle();
      }

      // 第1世代: 起点キャラAに反応する全キャラ
      let currentGeneration = collectResponders(
        bs,
        root,
        ctx.fired,
        ctx.queued,
        panelOrder
      );

      currentGeneration.forEach(unit => ctx.queued.add(unit._uid));

      while (currentGeneration.length && !bs.result) {
        const nextGenerationCandidates = [];

        // 同世代は必ずキャラパネル左→右
        currentGeneration = sortByPanelOrder(currentGeneration, panelOrder);

        for (const responder of currentGeneration) {
          if (bs.result) break;
          if (!responder || responder.hp <= 0) continue;
          if (ctx.fired.has(responder._uid)) continue;

          ctx.queued.delete(responder._uid);
          ctx.fired.add(responder._uid);

          // 演出・ダメージ・追加効果・撃破判定まで完全にawait
          const result = await B.executeComboSkill(
            responder._uid,
            responder.combo.skill,
            {
              actionId: ctx.id,
              rootUid: ctx.rootUid,
              generation: ctx.generation + 1,
              triggerUids: ctx.generation === 0
                ? [root._uid]
                : [],
            }
          );

          if (!result || result.executed === false) continue;

          // responderの攻撃アップ演出・ダメージ表示が完全に終わるまで待つ。
          // 終了後にだけ次のCOMBO表示へ進める。
          if (typeof window.waitForBattle32AttackCinematicIdle === 'function') {
            await window.waitForBattle32AttackCinematicIdle();
          }

          ctx.log.push(responder._uid);

          // Bの処理が完全に終わった時点で、Bに反応する次世代を収集。
          // ただし実行は現在世代が全員終わったあと。
          const next = collectResponders(
            bs,
            responder,
            ctx.fired,
            ctx.queued,
            panelOrder
          );

          next.forEach(unit => {
            ctx.queued.add(unit._uid);
            nextGenerationCandidates.push(unit);
          });
        }

        // 複数の親から同じキャラが候補になった場合はUIDで重複排除
        const unique = new Map();
        nextGenerationCandidates.forEach(unit => {
          if (unit && !unique.has(unit._uid)) unique.set(unit._uid, unit);
        });

        currentGeneration = sortByPanelOrder(
          [...unique.values()],
          panelOrder
        );

        ctx.generation += 1;
      }

      return ctx.log;
    } finally {
      running = false;
    }
  }

  function getRangeCells(owner, rangeId) {
    return buildRangeCells(owner, rangeId);
  }

  function getRangeLabel(rangeId) {
    const id = resolveRangeId(rangeId);
    const labels = {
      combo_line_all: '直線上すべて',
      combo_cross_all: '十字すべて',
      combo_x_all: 'X字すべて',
      combo_around8: '周囲8マス',
      combo_cross_1: '上下左右1マス',
      combo_x_1: '斜め隣接4マス',
      combo_line_2: '縦列・前後2マス',
    };
    return labels[id] || id || '—';
  }

  window.Combo32 = {
    runFromAction,
    getRangeCells,
    getRangeLabel,
    inRange,
    PRESETS,
    isRunning: () => running,
  };
})();
