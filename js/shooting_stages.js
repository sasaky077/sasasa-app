// Zeraphia Shooting - standalone stage master
// Strategy stages.js is NOT referenced.
// CHAPTER 01 foundation: 01-03 normal mission stages / 04 boss.
(function () {
  'use strict';

  if (!window.ShootingEnemies) {
    throw new Error('shooting_stages.js requires shooting_enemies.js');
  }

  const { SHOOTING_ENEMY_ID } = window.ShootingEnemies;

  const SHOOTING_MISSION_TYPE = Object.freeze({
    COLLECT_ITEM: 'collect_item',
    CLEAR_TIME: 'clear_time',
    MAX_HITS_TAKEN: 'max_hits_taken',
    BOSS_CLEAR: 'boss_clear',
    DEFEAT_ALL: 'defeat_all',

    // Future mission types reserved for later chapters.
    MAX_COMBO: 'max_combo',
    MIN_ULT_USE: 'min_ult_use',
    MIN_SWITCH_COUNT: 'min_switch_count',
    NO_DOWN: 'no_down',
    SCORE: 'score',
    SURVIVE_TIME: 'survive_time',
  });

  const SHOOTING_STAGE_ID = Object.freeze({
    CH01_01: 'shooting_ch01_01',
    CH01_02: 'shooting_ch01_02',
    CH01_03: 'shooting_ch01_03',
    CH01_04: 'shooting_ch01_04',

    CH02_01: 'shooting_ch02_01',
    CH02_02: 'shooting_ch02_02',
    CH02_03: 'shooting_ch02_03',
    CH02_04: 'shooting_ch02_04',

    CH03_01: 'shooting_ch03_01',
    CH03_02: 'shooting_ch03_02',
    CH03_03: 'shooting_ch03_03',
    CH03_04: 'shooting_ch03_04',
  });

  // ============================================================
  // CHAPTER 01
  // ============================================================
  //
  // 01 朝:
  //   収集を覚えるステージ
  //
  // 02 呼吸:
  //   攻撃効率 / キャラ交代を意識するタイムアタック
  //
  // 03 邂逅:
  //   赤コアを意識して避ける被弾管理
  //
  // 04 旅立ち:
  //   オーバーシアBOSS
  //
  const SHOOTING_STAGES = Object.freeze({
    [SHOOTING_STAGE_ID.CH01_01]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH01_01,
      chapter: 1,
      stageNo: 1,
      name: '朝',
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_01,
      ]),
      normalBattle: Object.freeze({
        totalEnemies: 7,
        maxActive: 2,
        spawnIntervalMs: 950,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.COLLECT_ITEM,
        target: 3,
        text: 'アイテムを3個拾ってクリア',
      }),

      // Normal Stage battle logic is the next implementation step.
      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH01_02]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH01_02,
      chapter: 1,
      stageNo: 2,
      name: '呼吸',
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_01,
      ]),
      normalBattle: Object.freeze({
        totalEnemies: 9,
        maxActive: 3,
        spawnIntervalMs: 820,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.CLEAR_TIME,
        targetSeconds: 60,
        text: '60秒以内にクリア',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH01_03]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH01_03,
      chapter: 1,
      stageNo: 3,
      name: '邂逅',
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_01,
      ]),
      normalBattle: Object.freeze({
        totalEnemies: 11,
        maxActive: 3,
        spawnIntervalMs: 720,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.MAX_HITS_TAKEN,
        maxHits: 3,
        text: '被弾3回以内でクリア',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH01_04]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH01_04,
      chapter: 1,
      stageNo: 4,
      name: '旅立ち',
      type: 'boss',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.REMNANT_01,
      ]),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: 'オーバーシアを撃破',
      }),

      playable: true,
    }),

    // ============================================================
    // CHAPTER 02 - 暴力
    // 数ではなく、一体一体の圧力でプレイヤーを追い詰める章。
    // ============================================================
    [SHOOTING_STAGE_ID.CH02_01]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH02_01,
      chapter: 2,
      stageNo: 1,
      name: '圧',
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_02,
      ]),
      normalBattle: Object.freeze({
        totalEnemies: 3,
        maxActive: 1,
        spawnIntervalMs: 1300,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.DEFEAT_ALL,
        text: '強敵をすべて撃破',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH02_02]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH02_02,
      chapter: 2,
      stageNo: 2,
      name: '蹂躙',
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_02,
      ]),
      normalBattle: Object.freeze({
        totalEnemies: 4,
        maxActive: 2,
        spawnIntervalMs: 1500,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.CLEAR_TIME,
        targetSeconds: 90,
        text: '90秒以内に強敵を撃破',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH02_03]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH02_03,
      chapter: 2,
      stageNo: 3,
      name: '威圧',
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_02,
      ]),
      normalBattle: Object.freeze({
        totalEnemies: 5,
        maxActive: 2,
        spawnIntervalMs: 1450,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.MAX_HITS_TAKEN,
        maxHits: 2,
        text: '被弾2回以内でクリア',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH02_04]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH02_04,
      chapter: 2,
      stageNo: 4,
      name: '暴力',
      type: 'boss',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.REMNANT_02,
      ]),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: 'REMNANT 02「暴力」を浄化',
      }),

      // ボス画像 images/remnant_02_battle.webp を配置すればそのまま遊べる。
      playable: true,
    }),

    // ============================================================
    // CHAPTER 03 - 弾幕
    // アイテムを拾いながら、濃い弾幕を抜けて進む章。
    // 01-03は収集、04は本格的な弾幕ボス戦。
    // ============================================================
    [SHOOTING_STAGE_ID.CH03_01]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH03_01,
      chapter: 3,
      stageNo: 1,
      name: '羽音',
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_03,
      ]),
      normalBattle: Object.freeze({
        totalEnemies: 9,
        maxActive: 2,
        spawnIntervalMs: 880,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.COLLECT_ITEM,
        target: 4,
        text: 'アイテムを4個拾ってクリア',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH03_02]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH03_02,
      chapter: 3,
      stageNo: 2,
      name: '星雨',
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_03,
      ]),
      normalBattle: Object.freeze({
        totalEnemies: 11,
        maxActive: 2,
        spawnIntervalMs: 800,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.COLLECT_ITEM,
        target: 5,
        text: 'アイテムを5個拾ってクリア',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH03_03]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH03_03,
      chapter: 3,
      stageNo: 3,
      name: '交差',
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_03,
      ]),
      normalBattle: Object.freeze({
        totalEnemies: 13,
        maxActive: 3,
        spawnIntervalMs: 760,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.COLLECT_ITEM,
        target: 6,
        text: 'アイテムを6個拾ってクリア',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH03_04]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH03_04,
      chapter: 3,
      stageNo: 4,
      name: '雨冠',
      type: 'boss',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.REMNANT_03,
      ]),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: 'REMNANT 03「天墜」を浄化',
      }),

      playable: true,
    }),

  });

  function getShootingStage(stageId) {
    return SHOOTING_STAGES[String(stageId || '')] || null;
  }

  function getShootingStagesByChapter(chapter) {
    const ch = Number(chapter);
    return Object.values(SHOOTING_STAGES)
      .filter(stage => stage && Number(stage.chapter) === ch)
      .sort((a, b) => a.stageNo - b.stageNo);
  }

  function getShootingChapter01Stages() {
    return getShootingStagesByChapter(1);
  }

  function getShootingStagePrimaryEnemy(stageId) {
    const stage = getShootingStage(stageId);
    if (!stage || !Array.isArray(stage.enemyIds) || !stage.enemyIds.length) return null;
    return window.ShootingEnemies.getShootingEnemy(stage.enemyIds[0]);
  }

  window.ShootingStages = Object.freeze({
    SHOOTING_MISSION_TYPE,
    SHOOTING_STAGE_ID,
    SHOOTING_STAGES,
    getShootingStage,
    getShootingStagesByChapter,
    getShootingChapter01Stages,
    getShootingStagePrimaryEnemy,
  });
})();
