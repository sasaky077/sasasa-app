// enemies.js
// 怪異マスターデータ
// 名前はない。名前を失った神々。

const ENEMIES = [

  // ============================================================
  // enemy_01：白糸の怪異（4×4強化版）
  // ============================================================
  {
    id: 'enemy_01',
    name: 'レムナント：オーバーシア',
    element: 'mystis',
    img:   'images/enemy_01.webp',
    upImg: 'images/enemy_01_up.webp',
    battleImg: 'images/enemy_01_battle.webp',
    isBoss: true,   // 32マスバトルでボス判定に使用
    uiScale: { battleBack: 2.0 },  // 盤面表示サイズ（3倍）

    // 4×4向けに強化
    hp: 2200, hpMax: 2200,
    atk: 400,

    randomStartPosition: true,
    fixedPosition: false,
    phase: 1,
    status: [],
    statusList: [],

    // battle.js互換用ダミー
    actionPattern: [
      {
        id: 'e01_all25',
        turn: 1,
        action: '全体侵食',
        type: 'atk_all',
        range: 'all',
        damageRate: 0.25,
        power: '中',
        desc: '糸を張り巡らせ、全マスに最大HP25%のダメージを与える。',
      },
    ],
    actionIdx: 0,

    // 初回固定行動
    // 1T：全体25%
    // 2T：前列35%
    // 3T：移動不能予兆
    // 4T：直線90%
    _phase1Fixed: [
      {
        id: 'e01_all25',
        action: '侵食',
        type: 'atk_all',
        range: 'all',
        damageRate: 0.25,
        power: '中',
        desc: '全マスに最大HP25%のダメージを与える。',
      },
      {
        id: 'e01_row_near35',
        action: '薙ぎ払い',
        type: 'atk_near',
        range: 'row_near',
        damageRate: 0.35,
        power: '大',
        desc: '前列すべてに最大HP35%のダメージを与える。',
      },
      {
        id: 'e01_bind_warning',
        action: '収束',
        type: 'move_lock',
        range: 'random1',
        status: 'move_lock',
        duration: 1,
        power: '予兆',
        desc: '次ターンの大技前にランダムな1体を1ターン移動不能にする。',
      },
      {
        id: 'e01_rupture90_t4',
        action: '断絶',
        type: 'atk_line',
        range: 'pierce_all',
        pierce: true,
        damageRate: 0.90,
        power: '危険',
        desc: '4ターン目の大技。自身の位置から直線上のすべてに最大HP90%のダメージを与える。',
      },
    ],

    // HP51%以上
    _phase1Pool: [
      {
        id: 'e01_all25_pool',
        action: '侵食',
        type: 'atk_all',
        range: 'all',
        damageRate: 0.25,
        power: '中',
        desc: '全マスに最大HP25%のダメージを与える。',
      },
      {
        id: 'e01_row_near_atk',
        action: '薙ぎ払い',
        type: 'atk_near',
        range: 'row_near',
        multiplier: 3.6,
        power: '大',
        desc: '前列すべてにATK依存のダメージを与える。',
      },
      {
        id: 'e01_single_heavy',
        action: '刺突',
        type: 'atk_single',
        range: 'random1',
        multiplier: 3.2,
        power: '特大',
        desc: 'ランダムな1体にATK依存の特大ダメージを与える。',
      },
      {
        id: 'e01_heal_team',
        action: '修復',
        type: 'heal_team',
        healRate: 0.15,
        power: '小',
        desc: '自身と生存中の仲間のHPを最大HPの15%回復する。',
      },
      {
        id: 'e01_move_lock',
        action: '束縛',
        type: 'move_lock',
        range: 'random1',
        status: 'move_lock',
        duration: 2,
        power: '小',
        desc: 'ランダムな1体を2ターン移動不能にする。',
      },
      {
        id: 'e01_pierce40',
        action: '直線貫通',
        type: 'atk_line',
        range: 'pierce_all',
        pierce: true,
        damageRate: 0.40,
        power: '大',
        desc: '自身の位置から直線上のすべてに最大HP40%のダメージを与える。',
      },
    ],

    // HP50%以下
    _phase2Pool: [
      {
        id: 'e01_cross40',
        action: '十字侵食',
        type: 'atk_cross',
        range: 'field_cross',
        damageRate: 0.40,
        power: '大',
        desc: '十字形のマスすべてに最大HP40%のダメージを与える。',
      },
      {
        id: 'e01_rupture90_p2',
        action: '断絶',
        type: 'atk_line',
        range: 'pierce_all',
        pierce: true,
        damageRate: 0.90,
        power: '危険',
        desc: '直線上の全対象に最大HP90%の大ダメージ。列避け前提の危険技。',
      },
      {
        id: 'e01_outer40',
        action: '外周薙ぎ払い',
        type: 'atk_outer',
        range: 'field_outer',
        damageRate: 0.40,
        power: '大',
        desc: '外周マスすべてに最大HP40%のダメージを与える。',
      },
      {
        id: 'e01_heal_team2',
        action: '修復',
        type: 'heal_team',
        healRate: 0.15,
        power: '小',
        desc: '自身と生存中の仲間のHPを最大HPの15%回復する。',
      },
      {
        id: 'e01_cleanse',
        action: '状態解除',
        type: 'cleanse_self',
        power: '小',
        desc: 'デバフ・霊体化などの不利な状態異常をすべて解除する。',
      },
    ],

    // HP30%以下
    _phase3Pool: [
      {
        id: 'e01_cross40_3',
        action: '十字侵食',
        type: 'atk_cross',
        range: 'field_cross',
        damageRate: 0.40,
        power: '大',
        desc: '十字形のマスすべてに最大HP40%のダメージを与える。',
      },
      {
        id: 'e01_rupture90_p3',
        action: '断絶',
        type: 'atk_line',
        range: 'pierce_all',
        pierce: true,
        damageRate: 0.90,
        power: '危険',
        desc: '終盤の大技。直線上の全対象に最大HP90%の大ダメージ。',
      },
      {
        id: 'e01_outer40_3',
        action: '外周薙ぎ払い',
        type: 'atk_outer',
        range: 'field_outer',
        damageRate: 0.40,
        power: '大',
        desc: '外周マスすべてに最大HP40%のダメージを与える。',
      },
      {
        id: 'e01_heal_team3',
        action: '修復',
        type: 'heal_team',
        healRate: 0.15,
        power: '小',
        desc: '自身と生存中の仲間のHPを最大HPの15%回復する。',
      },
    ],

    _tutorialTurn: 0,
    _lastActionId: null,
    _phase3Triggered: false,
    _reactiveActive: false,

    actionIdx: 0,
  },

  // ============================================================
  // enemy_mask：仮面の従者（4×4強化版）
  // ============================================================
  {
    id: 'enemy_mask',
    name: '仮面の従者',
    element: 'chaos',
    img:   'images/enemy_mask_battle.webp',
    upImg: 'images/enemy_mask_battle.webp',
    battleImg: 'images/enemy_mask_battle.webp',

    // 4×4向けに強化
    hp: 1150, hpMax: 1150,
    atk: 260,
    moveType: 'enemy_zako_shift',
    attackRange: 'around8',

    phase: 1,
    status: [],
    statusList: [],

    // battle.js互換用ダミー
    actionPattern: [
      {
        id: 'mask_pierce18',
        action: '直線小ダメージ',
        type: 'atk_line',
        range: 'pierce_all',
        pierce: true,
        damageRate: 0.18,
        power: '小',
        desc: '直線上すべてに最大HP18%のダメージを与える（貫通）。',
      },
    ],
    actionIdx: 0,

    _maskActionPool: [
      {
        id: 'mask_pierce18',
        action: '直線穿刺',
        type: 'atk_line',
        range: 'pierce_all',
        pierce: true,
        damageRate: 0.18,
        power: '小',
        desc: '直線上すべてに最大HP18%のダメージを与える（貫通）。',
      },
      {
        id: 'mask_pushback',
        action: '押し出し',
        type: 'push_front3',
        range: 'row_near',
        damageRate: 0.12,
        power: '小',
        desc: '前3列にいるキャラを最後列へ押し出し、最大HP12%のダメージを与える。',
      },
      {
        id: 'mask_heal_boss',
        action: 'ボス回復',
        type: 'heal_boss',
        healRate: 0.15,
        power: '小',
        desc: 'ボス（enemy_01）のHPを最大HPの15%回復する。',
      },
      {
        id: 'mask_atk_down',
        action: 'ATKデバフ',
        type: 'debuff_atk',
        range: 'random1',
        status: 'atk_down',
        value: 0.30,
        duration: 2,
        power: '中',
        desc: 'ランダムな1体のATKを2ターン30%ダウンさせる。',
      },
      {
        id: 'mask_atk_down',
        action: 'ATKデバフ',
        type: 'debuff_atk',
        range: 'random1',
        status: 'atk_down',
        value: 0.30,
        duration: 2,
        power: '中',
        desc: 'ランダムな1体のATKを2ターン30%ダウンさせる。',
      },
      {
        id: 'mask_front_single',
        action: '狙い撃ち',
        type: 'atk_line',
        range: 'pierce_all',
        pierce: false,
        damageRate: 0.45,
        power: '大',
        desc: '直線上の最前列にいる1体に最大HP45%のダメージを与える。',
      },
      {
        id: 'mask_side_col',
        action: '側面攻撃',
        type: 'atk_sides',
        range: 'field_side_columns',
        damageRate: 0.25,
        power: '中',
        desc: '左列・右列すべてに最大HP25%のダメージを与える。',
      },
      {
        id: 'mask_execute50',
        action: '処刑糸',
        type: 'atk_single',
        range: 'random1',
        damageRate: 0.50,
        power: '大',
        desc: 'ランダムな1体に最大HP50%のダメージ。放置した従者が事故要因になる。',
      },
    ],

    _lastActionId: null,
    actionIdx: 0,
  },

  // ============================================================
  // enemy_02：荊棘の怪異
  // ============================================================
  {
    id: 'enemy_02',
    name: '??????',
    element: 'chaos',
    img:   'images/enemy_02.webp',
    upImg: 'images/enemy_02_up.webp',
    battleImg: 'images/enemy_02_battle.webp',
    hp: 2200, hpMax: 2200,
    atk: 420,
    moveType: 'enemy_zako_shift',
    attackRange: 'around8',
    phase: 1,
    status: [],
    actionPattern: [
      { turn:1, action:'近列攻撃',  type:'atk_near',   desc:'近距離の全員を薙ぎ払う。' },
      { turn:2, action:'自己強化',  type:'buff_self',   desc:'荊棘を纏い自己強化を行う。' },
      { turn:3, action:'全体攻撃',  type:'atk_all',     desc:'荊棘を爆発させ全員にダメージを与える。' },
      { turn:4, action:'中列攻撃',  type:'atk_mid',     desc:'中距離の全員を一掃する。' },
      { turn:5, action:'逆十字攻撃',type:'atk_xcross',  desc:'外周を攻撃する。' },
      { turn:6, action:'全体攻撃',  type:'atk_all',     desc:'再び全員に攻撃を行う。' },
    ],
    actionIdx: 0,
    phases: {
      2: { hpThreshold: 0.5, actionPattern: [
        { turn:1, action:'全体攻撃',  type:'atk_all',   desc:'傷ついた怒りで全員を攻撃する。' },
        { turn:2, action:'近列攻撃',  type:'atk_near',  desc:'近距離を強化攻撃する。' },
        { turn:3, action:'十字攻撃',  type:'atk_cross', desc:'十字形に大規模な荊棘を展開する。' },
      ]},
    },
  },

  // ============================================================
  // enemy_03：堕天の怪異
  // ============================================================
  {
    id: 'enemy_03',
    name: '??????',
    element: 'chaos',
    img:   'images/enemy_03.webp',
    upImg: 'images/enemy_03_up.webp',
    battleImg: 'images/enemy_03_battle.webp',
    hp: 1900, hpMax: 1900,
    atk: 370,
    moveType: 'enemy_zako_shift',
    attackRange: 'enemy_attack_cross',
    phase: 1,
    status: [],
    actionPattern: [
      { turn:1, action:'全体攻撃',   type:'atk_all',    desc:'翼を広げ全員に攻撃を行う。' },
      { turn:2, action:'十字攻撃',   type:'atk_cross',  desc:'十字形を攻撃する。' },
      { turn:3, action:'左縦列攻撃', type:'atk_left',   desc:'左縦列にいるキャラ全員を攻撃する。' },
      { turn:4, action:'逆十字攻撃', type:'atk_xcross', desc:'外周（四隅）を攻撃する。' },
      { turn:5, action:'単体攻撃',   type:'atk_single', desc:'ランダムな1人に強力な一撃を放つ。' },
      { turn:6, action:'右縦列攻撃', type:'atk_right',  desc:'右縦列全員を攻撃する。' },
    ],
    actionIdx: 0,
    phases: {
      2: { hpThreshold: 0.5, actionPattern: [
        { turn:1, action:'全体攻撃',  type:'atk_all',    desc:'堕ちた翼で全員を薙ぎ払う。' },
        { turn:2, action:'十字攻撃',  type:'atk_cross',  desc:'強化された十字攻撃。' },
        { turn:3, action:'逆十字攻撃',type:'atk_xcross', desc:'強化された逆十字攻撃。' },
        { turn:4, action:'全体攻撃',  type:'atk_all',    desc:'渾身の全体攻撃。' },
      ]},
    },
  },

  // ============================================================
  // CHAPTER 02 雑魚系
  // ============================================================

  // 中ボス（isBoss: false / isMidBoss: true）
  {
    id: 'enemy_02b',
    name: '??????',
    element: 'chaos',
    img:       'images/enemy_02b_battle.webp',
    upImg:     'images/enemy_02b_battle.webp',
    battleUpImg: 'images/enemy_02b_battle.webp',
    battleImg: 'images/enemy_02b_battle.webp',

    isBoss:    false,
    isMidBoss: true,

    hp: 500, hpMax: 500,
    atk: 300,

    moveType:    'enemy_midboss_front3',
    attackRange: 'enemy_attack_cross',

    randomStartPosition: true,
    fixedPosition: false,
    phase: 1,
    status: [],
    statusList: [],
  },

  // 雑魚（3ターンごとにスポーンする敵として使用）
  {
    id: 'enemy_02a',
    name: '??????',
    element: 'chaos',
    img:       'images/enemy_02a_battle.webp',
    upImg:     'images/enemy_02a_up.webp',
    battleUpImg: 'images/enemy_02a_battle_up.webp',
    battleImg: 'images/enemy_02a_battle.webp',

    isBoss:    false,
    isMidBoss: false,

    hp: 200, hpMax: 200,
    atk: 220,

    moveType:    'enemy_zako_straight',
    attackRange: 'around8',

    randomStartPosition: true,
    fixedPosition: false,
    phase: 1,
    status: [],
    statusList: [],
  },


  // ============================================================
  // レムナント：オーバーシア ローグライト専用
  // ============================================================
  {
    id: 'rl_overseer_servant_straight',
    name: 'オーバーシアのしもべ',
    element: 'mystis',
    img: 'images/remnant_01_zako.webp',
    upImg: 'images/remnant_01_zako_up.webp',
    battleImg: 'images/remnant_01_zako.webp',
    battleUpImg: 'images/remnant_01_zako_up.webp',
    hp: 420, hpMax: 420,
    atk: 125,
    moveType: 'enemy_zako_straight',
    attackRange: 'enemy_attack_line',
    fixedPosition: false,
    canMove: true,
    uiScale: { battleBack: 1.22 },
    actionPattern: [],
    status: [], statusList: [],
  },
  {
    id: 'rl_overseer_servant_cross',
    name: 'オーバーシアのしもべ',
    element: 'mystis',
    img: 'images/remnant_01_zako.webp',
    upImg: 'images/remnant_01_zako_up.webp',
    battleImg: 'images/remnant_01_zako.webp',
    battleUpImg: 'images/remnant_01_zako_up.webp',
    hp: 460, hpMax: 460,
    atk: 115,
    moveType: 'enemy_zako_shift',
    attackRange: 'enemy_attack_cross',
    fixedPosition: false,
    canMove: true,
    uiScale: { battleBack: 1.22 },
    actionPattern: [],
    status: [], statusList: [],
  },
  {
    id: 'rl_overseer_servant_skip',
    name: 'オーバーシアのしもべ',
    element: 'mystis',
    img: 'images/remnant_01_zako.webp',
    upImg: 'images/remnant_01_zako_up.webp',
    battleImg: 'images/remnant_01_zako.webp',
    battleUpImg: 'images/remnant_01_zako_up.webp',
    hp: 390, hpMax: 390,
    atk: 140,
    moveType: 'enemy_zako_diag',
    attackRange: 'around8',
    fixedPosition: false,
    canMove: true,
    uiScale: { battleBack: 1.22 },
    actionPattern: [],
    status: [], statusList: [],
  },
  {
    id: 'enemy_overseer_roguelite',
    name: 'レムナント：オーバーシア',
    element: 'mystis',
    img: 'images/remnant_01_battle.webp',
    upImg: 'images/remnant_01_battle_up.webp',
    battleImg: 'images/remnant_01_battle.webp',
    battleUpImg: 'images/remnant_01_battle_up.webp',
    isBoss: true,
    hp: 3600, hpMax: 3600,
    atk: 260,
    moveType: 'none',
    attackRange: 'enemy_attack_cross',
    fixedPosition: true,
    canMove: false,
    startPosition: { row: 2, col: 2 },
    uiScale: { battleBack: 2.0 },
    status: [], statusList: [],
    actionPattern: [
      { id:'overseer_cross', turn:1, action:'万象照覧', type:'atk_cross', range:'enemy_attack_cross', multiplier:1.05, power:'中', desc:'十字方向へ白光を放つ。' },
      { id:'overseer_line',  turn:2, action:'白亜の視線', type:'atk_line', range:'pierce_all', multiplier:1.25, power:'大', desc:'直線上を貫く視線を放つ。' },
      { id:'overseer_all',   turn:3, action:'監督者の宣告', type:'atk_all', range:'all', damageRate:0.18, power:'大', desc:'味方全体へ最大HP割合ダメージ。' },
    ],
    actionIdx: 0,
  },

];

// IDで怪異データを取得（本番 + テスト両方を検索）
function getEnemyById(id) {
  return ENEMIES.find(e => e.id === id)
      || TEST_ENEMIES.find(e => e.id === id)
      || null;
}

// ============================================================
// テスト用怪異データ
// 追加する場合は TEST_ENEMIES 配列に push する
// ============================================================

const TEST_ENEMIES = [];

// ── テスト01：常時実体化・固定位置 ─────────────────────────
// 吸い込み・押し出しの動作確認用。
// 位置が固定されているので range の当たり判定も確認しやすい。
TEST_ENEMIES.push({
  id: 'enemy_test_static_jittai',
  name: 'TEST_FIXED',
    element: 'chaos',

  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',

  hp: 2000,
  hpMax: 2000,
  atk: 100,

  row: 'mid',
  col: 'center',

  fixedPosition: true,
  canMove: false,

  status: [],
  statusList: [],

  actionPattern: [
    {
      turn: 1,
      action: '待機',
      type: 'wait',
      desc: 'テスト用。何もしない。'
    }
  ],

  actionIdx: 0
});

// ── テスト02〜04：貫通・非貫通確認用（中央列に縦3体固定） ──────
// near=FRONT / mid=MID / far=BACK の順に並べることで
// pierce:false → FRONT のみ命中、pierce:true → 3体抜きを確認できる。

TEST_ENEMIES.push({
  id: 'enemy_test_pierce_front',
  name: 'TEST_FRONT',
    element: 'chaos',
  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',
  hp: 500, hpMax: 500,
  atk: 0,
  row: 'near', col: 'center',
  fixedPosition: true, canMove: false,
  status: [],
  statusList: [],
  actionPattern: [{ turn: 1, action: '待機', type: 'wait', desc: 'テスト用。何もしない。' }],
  actionIdx: 0,
});

TEST_ENEMIES.push({
  id: 'enemy_test_pierce_mid',
  name: 'TEST_MID',
    element: 'chaos',
  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',
  hp: 500, hpMax: 500,
  atk: 0,
  row: 'mid', col: 'center',
  fixedPosition: true, canMove: false,
  status: [],
  statusList: [],
  actionPattern: [{ turn: 1, action: '待機', type: 'wait', desc: 'テスト用。何もしない。' }],
  actionIdx: 0,
});

TEST_ENEMIES.push({
  id: 'enemy_test_pierce_back',
  name: 'TEST_BACK',
    element: 'chaos',
  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',
  hp: 500, hpMax: 500,
  atk: 0,
  row: 'far', col: 'center',
  fixedPosition: true, canMove: false,
  status: [],
  statusList: [],
  actionPattern: [{ turn: 1, action: '待機', type: 'wait', desc: 'テスト用。何もしない。' }],
  actionIdx: 0,
});

// ── テスト05：damageRate 20% 攻撃テスト ─────────────────────
TEST_ENEMIES.push({
  id: 'enemy_test_damage_20',
  name: 'TEST_DAMAGE_20',
    element: 'chaos',

  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',

  hp: 2000,
  hpMax: 2000,
  atk: 100,

  row: 'mid',
  col: 'center',

  fixedPosition: true,
  canMove: false,
  attackTiming: 'after_round',

  status: [],
  statusList: [],

  actionPattern: [
    {
      turn: 1,
      action: 'ランダム20%',
      type: 'atk_single',
      range: 'random1',
      damageRate: 0.2,
      desc: 'ランダムな1人に最大HP20%の攻撃。'
    }
  ],

  actionIdx: 0
});

// ── テスト06：damageRate 80% 攻撃テスト ─────────────────────
TEST_ENEMIES.push({
  id: 'enemy_test_damage_80',
  name: 'TEST_DAMAGE_80',
    element: 'chaos',

  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',

  hp: 2000,
  hpMax: 2000,
  atk: 100,

  row: 'mid',
  col: 'center',

  fixedPosition: true,
  canMove: false,
  attackTiming: 'after_round',

  status: [],
  statusList: [],

  actionPattern: [
    {
      turn: 1,
      action: '直線上80%',
      type: 'atk_line',
      range: 'pierce_all',
      pierce: true ,
      damageRate: 0.8,
      desc: '正面直線上に最大HP80%の攻撃。'
    }
  ],

  actionIdx: 0
});

// ── テスト07：after_each_action 反応攻撃テスト ───────────────
TEST_ENEMIES.push({
  id: 'enemy_test_reactive',
  name: 'TEST_REACTIVE',
    element: 'chaos',

  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',

  hp: 2000,
  hpMax: 2000,
  atk: 100,

  row: 'mid',
  col: 'center',

  fixedPosition: true,
  canMove: false,
  attackTiming: 'after_each_action',

  status: [],
  statusList: [],

  actionPattern: [
  {
    turn: 1,
    action: '反射20%',
    type: 'atk_all',
    range: 'all',
    damageRate: 0.2,
    desc: '味方1人が行動するたび、味方全員に最大HP20%の攻撃。'
  }
],

  actionIdx: 0
});

// ── テスト08：回復行動テスト ──────────────────────────────────
// enemy_self / enemy_all の回復確認用。2ターンごとに回復を挟む。
TEST_ENEMIES.push({
  id: 'enemy_test_healer',
  name: 'TEST_HEALER',
    element: 'chaos',

  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',

  hp: 2000,
  hpMax: 2000,
  atk: 100,

  row: 'mid',
  col: 'center',

  fixedPosition: true,
  canMove: false,
  attackTiming: 'after_round',

  status: [],
  statusList: [],

  actionPattern: [
    {
      turn: 1,
      action: '単体攻撃',
      type: 'atk_single',
      range: 'random1',
      power: '小',
      desc: 'ランダムな1人に攻撃。'
    },
    {
      turn: 2,
      action: '自己修復',
      type: 'heal',
      target: 'enemy_self',
      healRate: 0.3,
      desc: '自身のHPを最大HPの30%回復する。'
    }
  ],

  actionIdx: 0
});

// ============================================================
// ローグライト専用怪異マスタ
// 属性：chaos / logos / mystis
//   chaos  = 終末世界で自然発生した魂
//   logos  = 現実世界由来の転生者・研究体の魂
//   mystis = 天界・神性由来の魂
// ============================================================

// ── Stage 1（2体）──────────────────────────────────────────

ENEMIES.push({
  id: 'rl_chaos_walker',
  name: '??????',
  element: 'chaos',
  img:       'images/enemy_02a_battle.webp',
  upImg:     'images/enemy_02a_up.webp',
  battleUpImg: 'images/enemy_02a_battle_up.webp',
  battleImg: 'images/enemy_02a_battle.webp',
  isBoss: false,
  isMidBoss: false,
  hp: 700, hpMax: 700,
  atk: 190,
  moveType:    'enemy_zako_straight',
  attackRange: 'around8',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});

ENEMIES.push({
  id: 'rl_chaos_slant',
  name: '??????',
  element: 'chaos',
  img:       'images/enemy_02a_battle.webp',
  upImg:     'images/enemy_02a_up.webp',
  battleUpImg: 'images/enemy_02a_battle_up.webp',
  battleImg: 'images/enemy_02a_battle.webp',
  isBoss: false,
  isMidBoss: false,
  hp: 650, hpMax: 650,
  atk: 180,
  moveType:    'enemy_zako_diag',
  attackRange: 'enemy_attack_cross',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});

// ── Stage 2（3体）──────────────────────────────────────────

ENEMIES.push({
  id: 'rl_chaos_walker_plus',
  name: '??????',
  element: 'chaos',
  img:       'images/enemy_02a_battle.webp',
  upImg:     'images/enemy_02a_up.webp',
  battleUpImg: 'images/enemy_02a_battle_up.webp',
  battleImg: 'images/enemy_02a_battle.webp',
  isBoss: false,
  isMidBoss: false,
  hp: 900, hpMax: 900,
  atk: 250,
  moveType:    'enemy_zako_straight',
  attackRange: 'around8',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});

ENEMIES.push({
  id: 'rl_logos_ranged',
  name: '??????',
  element: 'logos',
  img:       'images/enemy_02b_battle.webp',
  upImg:     'images/enemy_02b_battle.webp',
  battleUpImg: 'images/enemy_02b_battle.webp',
  battleImg: 'images/enemy_02b_battle.webp',
  isBoss: false,
  isMidBoss: false,
  hp: 800, hpMax: 800,
  atk: 240,
  moveType:    'enemy_zako_straight',
  attackRange: 'enemy_attack_line',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});

ENEMIES.push({
  id: 'rl_mystis_caster',
  name: '??????',
  element: 'mystis',
  img:       'images/enemy_02b_battle.webp',
  upImg:     'images/enemy_02b_battle.webp',
  battleUpImg: 'images/enemy_02b_battle.webp',
  battleImg: 'images/enemy_02b_battle.webp',
  isBoss: false,
  isMidBoss: false,
  hp: 750, hpMax: 750,
  atk: 230,
  moveType:    'enemy_zako_diag',
  attackRange: 'enemy_attack_cross',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});

// ── Stage 3（4体）──────────────────────────────────────────

ENEMIES.push({
  id: 'rl_chaos_elite',
  name: '??????',
  element: 'chaos',
  img:       'images/enemy_02a_battle.webp',
  upImg:     'images/enemy_02a_up.webp',
  battleUpImg: 'images/enemy_02a_battle_up.webp',
  battleImg: 'images/enemy_02a_battle.webp',
  isBoss: false,
  isMidBoss: false,
  hp: 1100, hpMax: 1100,
  atk: 310,
  moveType:    'enemy_zako_straight',
  attackRange: 'around8',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});

ENEMIES.push({
  id: 'rl_logos_elite',
  name: '??????',
  element: 'logos',
  img:       'images/enemy_02b_battle.webp',
  upImg:     'images/enemy_02b_battle.webp',
  battleUpImg: 'images/enemy_02b_battle.webp',
  battleImg: 'images/enemy_02b_battle.webp',
  isBoss: false,
  isMidBoss: false,
  hp: 1050, hpMax: 1050,
  atk: 300,
  moveType:    'enemy_zako_diag',
  attackRange: 'enemy_attack_cross',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});

ENEMIES.push({
  id: 'rl_mystis_elite',
  name: '??????',
  element: 'mystis',
  img:       'images/enemy_02b_battle.webp',
  upImg:     'images/enemy_02b_battle.webp',
  battleUpImg: 'images/enemy_02b_battle.webp',
  battleImg: 'images/enemy_02b_battle.webp',
  isBoss: false,
  isMidBoss: false,
  hp: 1000, hpMax: 1000,
  atk: 295,
  moveType:    'enemy_zako_diag',
  attackRange: 'enemy_attack_cross',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});

ENEMIES.push({
  id: 'rl_chaos_ranged',
  name: '??????',
  element: 'chaos',
  img:       'images/enemy_02a_battle.webp',
  upImg:     'images/enemy_02a_up.webp',
  battleUpImg: 'images/enemy_02a_battle_up.webp',
  battleImg: 'images/enemy_02a_battle.webp',
  isBoss: false,
  isMidBoss: false,
  hp: 950, hpMax: 950,
  atk: 290,
  moveType:    'enemy_zako_straight',
  attackRange: 'enemy_attack_line',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});


// ============================================================
// ローグライト専用：サキエル降臨
//   Stage 1〜3: サキエル配下の天使型雑魚
//   Stage 4:    サキエル本体
// ============================================================

ENEMIES.push({
  id: 'rl_sakiel_zako_straight',
  name: 'サキエルのしもべ',
  displayName: 'サキエルのしもべ',
  enemyName: 'サキエルのしもべ',
  introName: 'サキエルのしもべ',
  stageIntroName: 'サキエルのしもべ',
  element: 'mystis',
  // ステージ入り演出用（添付1枚目）
  img:         'images/remnant_04_zako_up.webp',
  upImg:       'images/remnant_04_zako_up.webp',
  // グリッド上表示用（添付3枚目）
  battleImg:   'images/remnant_04_zako.webp',
  // 攻撃演出中のアップ表示用（添付4枚目）
  battleUpImg: 'images/remnant_04_zako_up.webp',
  isBoss: false,
  isMidBoss: false,
  uiScale: { battleBack: 1.7},
  hp: 600, hpMax: 600,
  atk: 250,
  moveType:    'enemy_zako_straight',
  attackRange: 'enemy_attack_line',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});

ENEMIES.push({
  id: 'rl_sakiel_spawn_glass',
  name: 'サキエルのしもべ',
  displayName: 'サキエルのしもべ',
  enemyName: 'サキエルのしもべ',
  introName: 'サキエルのしもべ',
  stageIntroName: 'サキエルのしもべ',
  element: 'mystis',
  // サキエルBOSS戦スポーン専用：高火力・紙耐久
  img:         'images/remnant_04_zako_up.webp',
  upImg:       'images/remnant_04_zako_up.webp',
  battleImg:   'images/remnant_04_zako.webp',
  battleUpImg: 'images/remnant_04_zako_up.webp',
  isBoss: false,
  isMidBoss: false,
  uiScale: { battleBack: 1.7 },
  hp: 300, hpMax: 300,
  atk: 330,
  moveType:    'enemy_zako_straight',
  attackRange: 'enemy_attack_line',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});

ENEMIES.push({
  id: 'rl_sakiel_zako_diag',
  name: 'サキエルのしもべ',
  displayName: 'サキエルのしもべ',
  enemyName: 'サキエルのしもべ',
  introName: 'サキエルのしもべ',
  stageIntroName: 'サキエルのしもべ',
  element: 'mystis',
  // ステージ入り演出用（添付1枚目）
  img:         'images/remnant_04_zako_up.webp',
  upImg:       'images/remnant_04_zako_up.webp',
  // グリッド上表示用（添付3枚目）
  battleImg:   'images/remnant_04_zako.webp',
  // 攻撃演出中のアップ表示用（添付4枚目）
  battleUpImg: 'images/remnant_04_zako_up.webp',
  isBoss: false,
  isMidBoss: false,
  uiScale: { battleBack: 1.7},
  hp: 720, hpMax: 720,
  atk: 200,
  moveType:    'enemy_zako_diag',
  attackRange: 'enemy_attack_cross',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});

ENEMIES.push({
  id: 'rl_sakiel_zako_ranged',
  name: 'サキエルのしもべ',
  displayName: 'サキエルのしもべ',
  enemyName: 'サキエルのしもべ',
  introName: 'サキエルのしもべ',
  stageIntroName: 'サキエルのしもべ',
  element: 'logos',
  // ステージ入り演出用（添付1枚目）
  img:         'images/remnant_04_zako_up.webp',
  upImg:       'images/remnant_04_zako_up.webp',
  // グリッド上表示用（添付3枚目）
  battleImg:   'images/remnant_04_zako.webp',
  // 攻撃演出中のアップ表示用（添付4枚目）
  battleUpImg: 'images/remnant_04_zako_up.webp',
  isBoss: false,
  isMidBoss: false,
  uiScale: { battleBack: 1.7},
  hp: 900, hpMax: 900,
  atk: 255,
  moveType:    'enemy_zako_straight',
  attackRange: 'enemy_attack_line',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});

ENEMIES.push({
  id: 'rl_sakiel_zako_elite',
  name: 'サキエルのしもべ',
  displayName: 'サキエルのしもべ',
  enemyName: 'サキエルのしもべ',
  introName: 'サキエルのしもべ',
  stageIntroName: 'サキエルのしもべ',
  element: 'mystis',
  // ステージ入り演出用（添付1枚目）
  img:         'images/remnant_04_zako_up.webp',
  upImg:       'images/remnant_04_zako_up.webp',
  // グリッド上表示用（添付3枚目）
  battleImg:   'images/remnant_04_zako.webp',
  // 攻撃演出中のアップ表示用（添付4枚目）
  battleUpImg: 'images/remnant_04_zako_up.webp',
  isBoss: false,
  isMidBoss: false,
  uiScale: { battleBack: 1.7},
  hp: 1120, hpMax: 1120,
  atk: 315,
  moveType:    'enemy_zako_diag',
  attackRange: 'enemy_attack_cross',
  randomStartPosition: true,
  fixedPosition: false,
  phase: 1,
  status: [],
  statusList: [],
});

ENEMIES.push({
  id: 'enemy_sakiel_roguelite',
  name: '大天使 サキエル',
  displayName: '大天使 サキエル',
  enemyName: '大天使 サキエル',
  introName: '大天使 サキエル',
  stageIntroName: '大天使 サキエル',
  element: 'mystis',
  // ステージ入り演出用（添付2枚目）
  img:         'images/remnant_04_battle_up.webp',
  upImg:       'images/remnant_04_battle_up.webp',
  // グリッド上表示用（添付5枚目）
  battleImg:   'images/remnant_04_battle.webp',
  // 攻撃演出中のアップ表示用（添付6枚目）
  battleUpImg: 'images/remnant_04_battle_up.webp',
  isBoss: true,
  isMidBoss: false,
  uiScale: { battleBack: 2.2},
  hp: 3600, hpMax: 3600,
  atk: 470,
  moveType: 'none',
  attackRange: 'manhattan_4',
  randomStartPosition: false,
  fixedPosition: true,
  eriPriority: true,

  // 毎ターン、専用5パターンから1つを等確率でランダム実行
  specialActionType: 'sakiel_random_5',
  specialActionDamageRate: 0.90,

  phase: 1,
  status: [],
  statusList: [],
});

// TEST_ENEMIES を ENEMIES にマージ（getEnemyById から参照可能にする）
ENEMIES.push(...TEST_ENEMIES);
