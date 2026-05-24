// enemies.js
// 怪異マスターデータ
// 名前はない。名前を失った神々。

const ENEMIES = [

  // ============================================================
  // enemy_01：白糸の怪異（チュートリアルボス仕様）
  // HP帯で行動が変化。HP30%以下でリアクティブダメージ発動。
  // ============================================================
  {
    id: 'enemy_01',
    name: '??????',
    img:   'images/enemy_01.webp',
    upImg: 'images/enemy_01_up.webp',
    battleImg: 'images/enemy_01_battle.webp',
    hp: 2200, hpMax: 2200,
    atk: 260, def: 180, spd: 280,
    phase: 1,
    status: [],
    statusList: [],

    // ── チュートリアル用：ランダム行動システム ──────────────
    // actionPattern は battle.js の既存ループと互換するダミー
    // 実際の行動選択は enemy_01_selectAction() で行う
    actionPattern: [
      {
        id: 'e01_all20',
        turn: 1,
        action: '全体侵食',
        type: 'atk_all',
        range: 'all',
        damageRate: 0.20,
        power: '中',
        desc: '糸を張り巡らせ、全マスに最大HP20%のダメージを与える。',
      },
    ],
    actionIdx: 0,

    // ── HP帯別ランダム行動プール ─────────────────────────────
    // phase1: HP51%以上（初回2ターンは固定）
    // phase2: HP50%以下
    // phase3: HP30%以下（移行時に実体化解除・リアクティブ発動）
    _phase1Fixed: [
      {
        id: 'e01_all20',
        action: '全体侵食',
        type: 'atk_all',
        range: 'all',
        damageRate: 0.20,
        power: '中',
        desc: '全マスに最大HP20%のダメージを与える。',
      },
      {
        id: 'e01_row_near30',
        action: '前列薙ぎ払い',
        type: 'atk_near',
        range: 'row_near',
        damageRate: 0.30,
        power: '中',
        desc: '前列すべてに最大HP30%のダメージを与える。',
      },
    ],
    _phase1Pool: [
      {
        id: 'e01_all20',
        action: '全体侵食',
        type: 'atk_all',
        range: 'all',
        damageRate: 0.20,
        power: '中',
        desc: '全マスに最大HP20%のダメージを与える。',
      },
      {
        id: 'e01_row_near30',
        action: '前列薙ぎ払い',
        type: 'atk_near',
        range: 'row_near',
        damageRate: 0.30,
        power: '中',
        desc: '前列すべてに最大HP30%のダメージを与える。',
      },
      {
        id: 'e01_single50',
        action: '白糸の刺突',
        type: 'atk_single',
        range: 'random1',
        damageRate: 0.50,
        power: '特大',
        desc: 'ランダムな1体に最大HP50%の特大ダメージを与える。',
      },
      {
        id: 'e01_heal_team',
        action: '糸の修復',
        type: 'heal_team',
        healRate: 0.20,
        power: '小',
        desc: '自身と生存中の仲間のHPを最大HPの20%回復する。',
      },
      {
        id: 'e01_move_lock',
        action: '縛糸',
        type: 'move_lock',
        range: 'random1',
        status: 'move_lock',
        duration: 2,
        power: '小',
        desc: 'ランダムな1体を2ターン移動不能にする。',
      },
      {
        id: 'e01_pierce30',
        action: '直線貫通',
        type: 'atk_line',
        range: 'pierce_all',
        pierce: true,
        damageRate: 0.30,
        power: '中',
        desc: '自身の位置から直線上のすべてに最大HP30%のダメージを与える。',
      },
    ],
    _phase2Pool: [
      {
        id: 'e01_cross30',
        action: '十字侵食',
        type: 'atk_cross',
        range: 'field_cross',
        damageRate: 0.30,
        power: '中',
        desc: '十字形のマスすべてに最大HP30%のダメージを与える。',
      },
      {
        id: 'e01_outer30',
        action: '外周薙ぎ払い',
        type: 'atk_outer',
        range: 'field_outer',
        damageRate: 0.30,
        power: '中',
        desc: '外周8マスすべてに最大HP30%のダメージを与える。',
      },
      {
        id: 'e01_heal_team2',
        action: '糸の修復',
        type: 'heal_team',
        healRate: 0.20,
        power: '小',
        desc: '自身と生存中の仲間のHPを最大HPの20%回復する。',
      },
      {
        id: 'e01_cleanse',
        action: '状態解除',
        type: 'cleanse_self',
        power: '小',
        desc: 'デバフ・実体化などの不利な状態異常をすべて解除する。',
      },
    ],
    _phase3Pool: [
      {
        id: 'e01_cross30_3',
        action: '十字侵食',
        type: 'atk_cross',
        range: 'field_cross',
        damageRate: 0.30,
        power: '中',
        desc: '十字形のマスすべてに最大HP30%のダメージを与える。',
      },
      {
        id: 'e01_outer30_3',
        action: '外周薙ぎ払い',
        type: 'atk_outer',
        range: 'field_outer',
        damageRate: 0.30,
        power: '中',
        desc: '外周8マスすべてに最大HP30%のダメージを与える。',
      },
      {
        id: 'e01_heal_team3',
        action: '糸の修復',
        type: 'heal_team',
        healRate: 0.20,
        power: '小',
        desc: '自身と生存中の仲間のHPを最大HPの20%回復する。',
      },
    ],

    // 内部状態
    _tutorialTurn: 0,           // ボス専用行動ターンカウント
    _lastActionId: null,        // 直前の行動ID（連続防止）
    _phase3Triggered: false,    // HP30%以下トリガー済みフラグ
    _reactiveActive: false,     // リアクティブダメージ有効フラグ

    actionIdx: 0,
  },

  // ============================================================
  // enemy_mask：仮面の従者
  // ============================================================
  {
    id: 'enemy_mask',
    name: '仮面の従者',
    img:   'images/enemy_mask_battle.webp',
    upImg: 'images/enemy_mask_battle.webp',
    battleImg: 'images/enemy_mask_battle.webp',
    hp: 700, hpMax: 700,
    atk: 190, def: 120, spd: 240,
    phase: 1,
    status: [],
    statusList: [],

    // ダミー actionPattern（battle.js 互換）
    actionPattern: [
      {
        id: 'mask_pierce10',
        action: '直線小ダメージ',
        type: 'atk_line',
        range: 'pierce_all',
        pierce: true,
        damageRate: 0.10,
        power: '小',
        desc: '直線上すべてに最大HP10%のダメージを与える（貫通）。',
      },
    ],
    actionIdx: 0,

    _maskActionPool: [
      {
        id: 'mask_pierce10',
        action: '直線穿刺',
        type: 'atk_line',
        range: 'pierce_all',
        pierce: true,
        damageRate: 0.10,
        power: '小',
        desc: '直線上すべてに最大HP10%のダメージを与える（貫通）。',
      },
      {
        id: 'mask_pushback',
        action: '押し出し',
        type: 'push_front3',
        range: 'row_near',
        damageRate: 0.07,
        power: '小',
        desc: '前3列にいるキャラを最後列へ押し出し、最大HP7%のダメージを与える。',
      },
      {
        id: 'mask_heal_boss',
        action: 'ボス回復',
        type: 'heal_boss',
        healRate: 0.10,
        power: '小',
        desc: 'ボス（enemy_01）のHPを最大HPの10%回復する。',
      },
      {
        id: 'mask_def_down',
        action: 'DEFデバフ',
        type: 'debuff_def',
        range: 'random1',
        status: 'def_down',
        value: 0.20,
        duration: 2,
        power: '小',
        desc: 'ランダムな1体のDEFを2ターン20%ダウンさせる。',
      },
      {
        id: 'mask_atk_down',
        action: 'ATKデバフ',
        type: 'debuff_atk',
        range: 'random1',
        status: 'atk_down',
        value: 0.20,
        duration: 2,
        power: '小',
        desc: 'ランダムな1体のATKを2ターン20%ダウンさせる。',
      },
      {
        id: 'mask_front_single',
        action: '狙い撃ち',
        type: 'atk_line',
        range: 'pierce_all',
        pierce: false,
        damageRate: 0.30,
        power: '中',
        desc: '直線上の最前列にいる1体に最大HP30%のダメージを与える。',
      },
      {
        id: 'mask_side_col',
        action: '側面攻撃',
        type: 'atk_sides',
        range: 'field_side_columns',
        damageRate: 0.15,
        power: '小',
        desc: '左列・右列すべてに最大HP15%のダメージを与える（中央列は除外）。',
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
    img:   'images/enemy_02.webp',
    upImg: 'images/enemy_02_up.webp',
    battleImg: 'images/enemy_02_battle.webp',
    hp: 2200, hpMax: 2200,
    atk: 420, def: 350, spd: 180,
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
    img:   'images/enemy_03.webp',
    upImg: 'images/enemy_03_up.webp',
    battleImg: 'images/enemy_03_battle.webp',
    hp: 1900, hpMax: 1900,
    atk: 370, def: 280, spd: 260,
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

  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',

  hp: 2000,
  hpMax: 2000,
  atk: 100,
  def: 50,
  spd: 100,

  row: 'mid',
  col: 'center',

  fixedPosition: true,
  canMove: false,

  status: [],
  statusList: [
    { type: 'jittai', duration: -1 }
  ],

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
  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',
  hp: 500, hpMax: 500,
  atk: 0, def: 0, spd: 50,
  row: 'near', col: 'center',
  fixedPosition: true, canMove: false,
  status: [],
  statusList: [{ type: 'jittai', duration: -1 }],
  actionPattern: [{ turn: 1, action: '待機', type: 'wait', desc: 'テスト用。何もしない。' }],
  actionIdx: 0,
});

TEST_ENEMIES.push({
  id: 'enemy_test_pierce_mid',
  name: 'TEST_MID',
  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',
  hp: 500, hpMax: 500,
  atk: 0, def: 0, spd: 50,
  row: 'mid', col: 'center',
  fixedPosition: true, canMove: false,
  status: [],
  statusList: [{ type: 'jittai', duration: -1 }],
  actionPattern: [{ turn: 1, action: '待機', type: 'wait', desc: 'テスト用。何もしない。' }],
  actionIdx: 0,
});

TEST_ENEMIES.push({
  id: 'enemy_test_pierce_back',
  name: 'TEST_BACK',
  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',
  hp: 500, hpMax: 500,
  atk: 0, def: 0, spd: 50,
  row: 'far', col: 'center',
  fixedPosition: true, canMove: false,
  status: [],
  statusList: [{ type: 'jittai', duration: -1 }],
  actionPattern: [{ turn: 1, action: '待機', type: 'wait', desc: 'テスト用。何もしない。' }],
  actionIdx: 0,
});

// ── テスト05：damageRate 20% 攻撃テスト ─────────────────────
TEST_ENEMIES.push({
  id: 'enemy_test_damage_20',
  name: 'TEST_DAMAGE_20',

  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',

  hp: 2000,
  hpMax: 2000,
  atk: 100,
  def: 0,
  spd: 100,

  row: 'mid',
  col: 'center',

  fixedPosition: true,
  canMove: false,
  attackTiming: 'after_round',

  status: [],
  statusList: [{ type: 'jittai', duration: -1 }],

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

  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',

  hp: 2000,
  hpMax: 2000,
  atk: 100,
  def: 0,
  spd: 100,

  row: 'mid',
  col: 'center',

  fixedPosition: true,
  canMove: false,
  attackTiming: 'after_round',

  status: [],
  statusList: [{ type: 'jittai', duration: -1 }],

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

  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',

  hp: 2000,
  hpMax: 2000,
  atk: 100,
  def: 0,
  spd: 100,

  row: 'mid',
  col: 'center',

  fixedPosition: true,
  canMove: false,
  attackTiming: 'after_each_action',

  status: [],
  statusList: [{ type: 'jittai', duration: -1 }],

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

  img: 'images/enemy_test.webp',
  upImg: 'images/enemy_test.webp',
  battleImg: 'images/enemy_test_battle.webp',

  hp: 2000,
  hpMax: 2000,
  atk: 100,
  def: 0,
  spd: 100,

  row: 'mid',
  col: 'center',

  fixedPosition: true,
  canMove: false,
  attackTiming: 'after_round',

  status: [],
  statusList: [{ type: 'jittai', duration: -1 }],

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

// TEST_ENEMIES を ENEMIES にマージ（getEnemyById から参照可能にする）
ENEMIES.push(...TEST_ENEMIES);
