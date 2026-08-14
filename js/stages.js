// stages.js
// ステージマスターデータ
// enemyId は enemies.js の ENEMIES[].id と対応
//
// 将来の拡張イメージ：
//   type: 'normal' → 雑魚戦
//   type: 'boss'   → ボス戦（現在はこれのみ）
// 雑魚ステージを追加する場合は同じchapter内にnoを増やして追記する

const STAGES = [


  // ============================================================
  // CHAPTER 01 — 4ステージ構成
  // ============================================================
  {
    id: 'stage_01_01',
    chapter: 1,
    no: 1,
    type: 'normal',
    name: '朝',
    enemyIds: ['enemy_01', 'enemy_02b', 'enemy_02a'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 400, coin: 140 },
    unlocked: true,
    useBattle32: true,
    enemyRandomStartPosition: true,
      useRogueliteBattleRules: true,
  },

  {
    id: 'stage_01_02',
    chapter: 1,
    no: 2,
    type: 'normal',
    name: '呼吸',
    enemyIds: ['enemy_01', 'enemy_02b', 'enemy_02a'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 425, coin: 150 },
    unlocked: true,
    useBattle32: true,
    enemyRandomStartPosition: true,
      useRogueliteBattleRules: true,
  },

  {
    id: 'stage_01_03',
    chapter: 1,
    no: 3,
    type: 'normal',
    name: '邂逅',
    enemyIds: ['enemy_01', 'enemy_02b', 'enemy_02a'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 450, coin: 160 },
    unlocked: true,
    useBattle32: true,
    enemyRandomStartPosition: true,
      useRogueliteBattleRules: true,
  },

  {
    id: 'stage_01_04',
    chapter: 1,
    no: 4,
    type: 'boss',
    name: '旅立ち',
    enemyIds: ['enemy_01', 'enemy_02b', 'enemy_02a'],
    enemyName: 'レムナント01',
    difficulty: 'boss',
    rogueliteRunId: 'overseer',
    storyBossRemnantId: 'remnant_01',
    rogueliteRunReady: true,
    reward: { exp: 475, coin: 170 },
    unlocked: true,
    enemyRandomStartPosition: true,
  },

  // ============================================================
  // CHAPTER 02 — 4ステージ構成
  // ============================================================
  {
    id: 'stage_02_01',
    chapter: 2,
    no: 1,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_02'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 475, coin: 170 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_02_02',
    chapter: 2,
    no: 2,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_02'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 500, coin: 180 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_02_03',
    chapter: 2,
    no: 3,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_02'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 525, coin: 190 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_02_04',
    chapter: 2,
    no: 4,
    type: 'boss',
    name: '未定',
    enemyIds: ['enemy_02'],
    enemyName: 'レムナント02',
    difficulty: 'boss',
    rogueliteRunId: 'irish',
    storyBossRemnantId: 'remnant_02',
    rogueliteRunReady: true,
    reward: { exp: 550, coin: 200 },
    unlocked: true,
  },

  // ============================================================
  // CHAPTER 03 — 4ステージ構成
  // ============================================================
  {
    id: 'stage_03_01',
    chapter: 3,
    no: 1,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_03'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 550, coin: 200 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_03_02',
    chapter: 3,
    no: 2,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_03'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 575, coin: 210 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_03_03',
    chapter: 3,
    no: 3,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_03'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 600, coin: 220 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_03_04',
    chapter: 3,
    no: 4,
    type: 'boss',
    name: '未定',
    enemyIds: ['enemy_03'],
    enemyName: 'レムナント03',
    difficulty: 'boss',
    rogueliteRunId: 'rivia',
    storyBossRemnantId: 'remnant_03',
    rogueliteRunReady: true,
    reward: { exp: 625, coin: 230 },
    unlocked: true,
  },

  // ============================================================
  // CHAPTER 04 — 4ステージ構成
  // ============================================================
  {
    id: 'stage_04_01',
    chapter: 4,
    no: 1,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 625, coin: 230 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_04_02',
    chapter: 4,
    no: 2,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 650, coin: 240 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_04_03',
    chapter: 4,
    no: 3,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 675, coin: 250 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_04_04',
    chapter: 4,
    no: 4,
    type: 'boss',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: 'レムナント04',
    difficulty: 'boss',
    rogueliteRunId: 'sakiel',
    storyBossRemnantId: 'remnant_04',
    rogueliteRunReady: true,
    reward: { exp: 700, coin: 260 },
    unlocked: true,
  },

  // ============================================================
  // CHAPTER 05 — 4ステージ構成
  // ============================================================
  {
    id: 'stage_05_01',
    chapter: 5,
    no: 1,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 700, coin: 260 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_05_02',
    chapter: 5,
    no: 2,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 725, coin: 270 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_05_03',
    chapter: 5,
    no: 3,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 750, coin: 280 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_05_04',
    chapter: 5,
    no: 4,
    type: 'boss',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: 'レムナント05',
    difficulty: 'boss',
    rogueliteRunId: 'remnant05',
    storyBossRemnantId: 'remnant_05',
    rogueliteRunReady: true,
    reward: { exp: 775, coin: 290 },
    unlocked: true,
  },

  // ============================================================
  // CHAPTER 06 — 4ステージ構成
  // ============================================================
  {
    id: 'stage_06_01',
    chapter: 6,
    no: 1,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 775, coin: 290 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_06_02',
    chapter: 6,
    no: 2,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 800, coin: 300 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_06_03',
    chapter: 6,
    no: 3,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 825, coin: 310 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_06_04',
    chapter: 6,
    no: 4,
    type: 'boss',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: 'レムナント06',
    difficulty: 'boss',
    rogueliteRunId: 'remnant06',
    storyBossRemnantId: 'remnant_06',
    rogueliteRunReady: false,
    reward: { exp: 850, coin: 320 },
    unlocked: true,
  },

  // ============================================================
  // CHAPTER 07 — 4ステージ構成
  // ============================================================
  {
    id: 'stage_07_01',
    chapter: 7,
    no: 1,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 850, coin: 320 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_07_02',
    chapter: 7,
    no: 2,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 875, coin: 330 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_07_03',
    chapter: 7,
    no: 3,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 900, coin: 340 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_07_04',
    chapter: 7,
    no: 4,
    type: 'boss',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: 'レムナント07',
    difficulty: 'boss',
    rogueliteRunId: 'remnant07',
    storyBossRemnantId: 'remnant_07',
    rogueliteRunReady: false,
    reward: { exp: 925, coin: 350 },
    unlocked: true,
  },

  // ============================================================
  // CHAPTER 08 — 4ステージ構成
  // ============================================================
  {
    id: 'stage_08_01',
    chapter: 8,
    no: 1,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 925, coin: 350 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_08_02',
    chapter: 8,
    no: 2,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 950, coin: 360 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_08_03',
    chapter: 8,
    no: 3,
    type: 'normal',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: '??????',
    difficulty: 'normal',
    reward: { exp: 975, coin: 370 },
    unlocked: true,
      useBattle32: true,
    useRogueliteBattleRules: true,
  },

  {
    id: 'stage_08_04',
    chapter: 8,
    no: 4,
    type: 'boss',
    name: '未定',
    enemyIds: ['enemy_01'],
    enemyName: 'レムナント08',
    difficulty: 'boss',
    rogueliteRunId: 'remnant08',
    storyBossRemnantId: 'remnant_08',
    rogueliteRunReady: false,
    reward: { exp: 1000, coin: 380 },
    unlocked: true,
  },


  // ============================================================
  // SPECIAL ROGUELITE — 万象を知る白亜の座
  // 実際の連戦進行は roguelite_overseer_run.js が管理する。
  // ============================================================
  {
    id: 'roguelite_overseer_01', chapter: 'roguelite_overseer', no: 1,
    type: 'normal', name: 'オーバーシアのしもべ', useBattle32: true,
    enemyIds: ['rl_overseer_servant_straight', 'rl_overseer_servant_cross'],
    enemyName: 'オーバーシアのしもべ ×2', difficulty: 'roguelite',
    turnLimit: 10, unlocked: true, reward: { exp: 0, coin: 0 },
  },
  {
    id: 'roguelite_overseer_02', chapter: 'roguelite_overseer', no: 2,
    type: 'normal', name: 'オーバーシアのしもべ', useBattle32: true,
    enemyIds: ['rl_overseer_servant_straight', 'rl_overseer_servant_cross', 'rl_overseer_servant_skip'],
    enemyName: 'オーバーシアのしもべ ×3', difficulty: 'roguelite',
    turnLimit: 11, unlocked: true, reward: { exp: 0, coin: 0 },
  },
  {
    id: 'roguelite_overseer_03', chapter: 'roguelite_overseer', no: 3,
    type: 'boss', name: 'レムナント：オーバーシア', useBattle32: true,
    enemyIds: ['enemy_overseer_roguelite', 'rl_overseer_servant_straight', 'rl_overseer_servant_cross', 'rl_overseer_servant_skip'],
    enemyName: 'レムナント：オーバーシア', difficulty: 'boss',
    turnLimit: 14, unlocked: true, reward: { exp: 0, coin: 0 },
  },

];

// IDでステージデータを取得
function getStageById(id) {
  return STAGES.find(s => s.id === id) || null;
}

// チャプターでステージ一覧を取得
function getStagesByChapter(chapter) {
  return STAGES.filter(s => s.chapter === chapter);
}

// ステージの敵リストを取得（enemyIds配列 or 単体enemyId or インライン enemies に対応）
function getEnemiesForStage(stage) {
  if (!stage) return [];

  // インライン enemies 配列（チュートリアル等）
  if (Array.isArray(stage.enemies) && stage.enemies.length > 0) {
    return stage.enemies.map(e => JSON.parse(JSON.stringify(e)));
  }

  const ids = stage.enemyIds || (stage.enemyId ? [stage.enemyId] : []);

  return ids.map(id => {
    const e = (typeof getEnemyById === 'function') ? getEnemyById(id) : null;
    if (!e) return null;

    const copied = JSON.parse(JSON.stringify(e));

    // ステージ側で敵初期位置ランダム指定があれば、各敵に引き継ぐ
    if (stage.enemyRandomStartPosition) {
      copied.randomStartPosition = true;
    }

    return copied;
  }).filter(Boolean);
}
