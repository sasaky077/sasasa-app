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
  // CHAPTER 00 — デバッグ用テストステージ
  // 本番には影響しない。TEST_ENEMY_* は enemies.js 末尾で定義。
  // 新しいテストケースを追加する場合はここに no を増やして追記。
  // ============================================================
  {
    id: 'stage_00_jittai',
    chapter: 0,
    no: 1,
    type: 'boss',
    name: '常時実体化・固定位置',
    enemyId: 'enemy_test_static_jittai',
    enemyName: '固定怪異',
    difficulty: 'debug',
    reward: { exp: 0, coin: 0 },
    unlocked: true,
  },

  {
    id: 'stage_00_pierce_test',
    chapter: 0,
    no: 2,
    type: 'debug',
    name: '貫通・非貫通テスト',
    enemyIds: [
      'enemy_test_pierce_front',
      'enemy_test_pierce_mid',
      'enemy_test_pierce_back',
    ],
    enemyName: '貫通判定テスト',
    difficulty: 'debug',
    reward: { exp: 0, coin: 0 },
    unlocked: true,
  },

  {
    id: 'stage_00_damage_20',
    chapter: 0,
    no: 3,
    type: 'debug',
    name: '被ダメ20%テスト',
    enemyId: 'enemy_test_damage_20',
    enemyName: '20%攻撃テスト',
    difficulty: 'debug',
    reward: { exp: 0, coin: 0 },
    unlocked: true,
  },

  {
    id: 'stage_00_damage_80',
    chapter: 0,
    no: 4,
    type: 'debug',
    name: '被ダメ80%テスト',
    enemyId: 'enemy_test_damage_80',
    enemyName: '80%攻撃テスト',
    difficulty: 'debug',
    reward: { exp: 0, coin: 0 },
    unlocked: true,
  },

  {
    id: 'stage_00_reactive',
    chapter: 0,
    no: 5,
    type: 'debug',
    name: '行動ごと反応攻撃テスト',
    enemyId: 'enemy_test_reactive',
    enemyName: '反応型テスト',
    difficulty: 'debug',
    reward: { exp: 0, coin: 0 },
    unlocked: true,
  },

  {
    id: 'stage_00_heal',
    chapter: 0,
    no: 6,
    type: 'debug',
    name: '回復行動テスト',
    enemyId: 'enemy_test_healer',
    enemyName: '回復テスト',
    difficulty: 'debug',
    reward: { exp: 0, coin: 0 },
    unlocked: true,
  },

  // テストケース追加例：
  // {
  //   id: 'stage_00_highdef',
  //   chapter: 0,
  //   no: 2,
  //   type: 'boss',
  //   name: '高防御テスト',
  //   enemyId: 'enemy_test_high_def',
  //   enemyName: '高防御怪異',
  //   difficulty: 'debug',
  //   reward: { exp: 0, coin: 0 },
  //   unlocked: true,
  // },

  // ============================================================
  // CHAPTER 01 — 白糸の怪異
  // ============================================================
  {
    id: 'stage_01_boss',
    chapter: 1,
    no: 1,
    type: 'boss',
    name: '白糸の間',
    enemyIds: [
      'enemy_01',
      'enemy_mask',
      'enemy_mask',
    ],
    enemyName: '??????',
    difficulty: 'boss',
    reward: { exp: 375, coin: 150 },
    unlocked: true,
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
    name: '荊棘の間',
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
    name: '堕天の間',
    enemyId: 'enemy_03',
    enemyName: '??????',
    difficulty: 'boss',
    reward: { exp: 500, coin: 200 },
    unlocked: true,
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

// ステージの敵リストを取得（enemyIds配列 or 単体enemyId に対応）
function getEnemiesForStage(stage) {
  if (!stage) return [];
  const ids = stage.enemyIds || (stage.enemyId ? [stage.enemyId] : []);
  return ids.map(id => {
    const e = (typeof getEnemyById === 'function') ? getEnemyById(id) : null;
    return e ? JSON.parse(JSON.stringify(e)) : null;
  }).filter(Boolean);
}
