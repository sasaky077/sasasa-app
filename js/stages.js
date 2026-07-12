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
  // CHAPTER 00 — DEBUG / ローグライトBOSS単戦
  // ============================================================
  {
    id: 'stage_00_overseer_boss_test',
    chapter: 0,
    no: 1,
    type: 'debug',
    name: 'オーバーシア戦（BOSS）',
    enemyName: 'レムナント：オーバーシア',
    difficulty: 'debug',
    rogueliteRunId: 'debug_overseer_boss',
    reward: { exp: 0, coin: 0 },
    unlocked: true,
  },
  {
    id: 'stage_00_sakiel_boss_test',
    chapter: 0,
    no: 2,
    type: 'debug',
    name: 'サキエル戦（BOSS）',
    enemyName: '大天使 サキエル',
    difficulty: 'debug',
    rogueliteRunId: 'debug_sakiel_boss',
    reward: { exp: 0, coin: 0 },
    unlocked: true,
  },

  // ============================================================
  // CHAPTER 01 — 白糸の怪異
  // ============================================================
  {
  id: 'stage_01_boss',
  chapter: 1,
  no: 1,
  type: 'boss',
  name: '知恵',
  enemyIds: [
    'enemy_01',
    'enemy_02b',
    'enemy_02a',
  ],
  enemyRandomStartPosition: true,
  enemyName: '??????',
  difficulty: 'boss',
  reward: { exp: 375, coin: 150 },
  unlocked: true,
  useBattle32: true,

  // 2ターンに1度 enemy_02a が敵エリア内の空きマスにスポーン
  enemySpawn: {
    enemyId: 'enemy_02a',
    interval: 2,
    rows: [0, 1, 2, 3],
    cols: [0, 1, 2, 3, 4],
  },
},

  // 将来の雑魚ステージ追加例：
  // { id:'stage_01_1', chapter:1, no:1, type:'normal', name:'???', enemyId:'enemy_xx', ... },
  // { id:'stage_01_2', chapter:1, no:2, type:'normal', name:'???', enemyId:'enemy_xx', ... },
  // { id:'stage_01_boss', chapter:1, no:3, type:'boss', name:'白糸の間', enemyId:'enemy_01', ... },

  // ============================================================
  // CHAPTER 02 — 荊棘の怪異
  // ============================================================
  {
    id: 'stage_02_boss',
    chapter: 2,
    no: 1,
    type: 'boss',
    name: '破壊',
    enemyId: 'enemy_02',
    enemyName: '??????',
    difficulty: 'boss',
    reward: { exp: 450, coin: 180 },
    unlocked: true,
  },

  // ============================================================
  // CHAPTER 03 — 堕天の怪異
  // ============================================================
  {
    id: 'stage_03_boss',
    chapter: 3,
    no: 1,
    type: 'boss',
    name: '忘却',
    enemyId: 'enemy_03',
    enemyName: '??????',
    difficulty: 'boss',
    reward: { exp: 500, coin: 200 },
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
