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
  // CHAPTER 01 — 白糸の怪異
  // ============================================================
  {
    id: 'stage_01_boss',
    chapter: 1,
    no: 1,
    type: 'boss',
    name: '白糸の間',
    enemyId: 'enemy_01',
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
