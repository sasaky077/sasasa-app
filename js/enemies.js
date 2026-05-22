// enemies.js
// 怪異マスターデータ
// 名前はない。名前を失った神々。

const ENEMIES = [

  // ============================================================
  // enemy_01：白糸の怪異
  // 素早く動き回り、縦列・単体攻撃を得意とする。
  // 近づくと危険。遠列に引いても中縦列を狙ってくる。
  // ============================================================
  {
    id: 'enemy_01',
    name: '??????',
    img:   'images/enemy_01.webp',
    upImg: 'images/enemy_01_up.webp',
    hp: 1600, hpMax: 1600,
    atk: 320, def: 200, spd: 340,  // 高速型
    phase: 1,
    status: [],
    actionPattern: [
      {
        turn: 1,
        action: '近列攻撃',
        type: 'atk_near',
        desc: '近距離にいるキャラ全員に攻撃を行う。近列に多く配置するほど被害が大きくなる。',
      },
      {
        turn: 2,
        action: '単体攻撃',
        type: 'atk_single',
        desc: 'ランダムな1人に集中した攻撃を行う。対象はランダムのため予測不可能。',
      },
      {
        turn: 3,
        action: '中縦列攻撃',
        type: 'atk_center',
        desc: '中央縦列（左中右の中）にいるキャラ全員を狙う。中央に固まると危険。',
      },
      {
        turn: 4,
        action: '単体攻撃',
        type: 'atk_single',
        desc: 'ランダムな1人に集中した攻撃を行う。',
      },
      {
        turn: 5,
        action: '右縦列攻撃',
        type: 'atk_right',
        desc: '右縦列にいるキャラ全員を攻撃する。右側に寄せた編成は注意が必要。',
      },
    ],
    actionIdx: 0,

    // フェーズ変化（HP50%以下で行動が変化）
    phases: {
      2: {
        hpThreshold: 0.5,
        actionPattern: [
          {
            turn: 1,
            action: '十字攻撃',
            type: 'atk_cross',
            desc: '中列と中縦列が交差する十字形の範囲を一斉攻撃する。中央配置のキャラは要注意。',
          },
          {
            turn: 2,
            action: '単体攻撃',
            type: 'atk_single',
            desc: 'ランダムな1人に強力な攻撃を行う。',
          },
          {
            turn: 3,
            action: '全体攻撃',
            type: 'atk_all',
            desc: '糸を張り巡らせ全員を攻撃する。フェーズ2以降に使用する。',
          },
        ],
      },
    },
  },

  // ============================================================
  // enemy_02：荊棘の怪異
  // 重厚で遅いが攻撃力が高い。範囲攻撃が多く、
  // 横列をまとめて狙ってくる。縦に散らすのが有効。
  // ============================================================
  {
    id: 'enemy_02',
    name: '??????',
    img:   'images/enemy_02.webp',
    upImg: 'images/enemy_02_up.webp',
    hp: 2200, hpMax: 2200,
    atk: 420, def: 350, spd: 180,  // 重装型・高火力
    phase: 1,
    status: [],
    actionPattern: [
      {
        turn: 1,
        action: '近列攻撃',
        type: 'atk_near',
        desc: '近距離の全員を薙ぎ払う。近列への配置は最小限にしたい。',
      },
      {
        turn: 2,
        action: '自己強化',
        type: 'buff_self',
        desc: '荊棘を纏い自己強化を行う。次のターンの攻撃力が上昇する。',
      },
      {
        turn: 3,
        action: '全体攻撃',
        type: 'atk_all',
        desc: '荊棘を爆発させ全員にダメージを与える。自己強化後に使用する大技。',
      },
      {
        turn: 4,
        action: '中列攻撃',
        type: 'atk_mid',
        desc: '中距離の全員を一掃する。近遠に分散する戦略が有効。',
      },
      {
        turn: 5,
        action: '逆十字攻撃',
        type: 'atk_xcross',
        desc: '中列・中縦列を除いた外周を攻撃する。中央に集めると安全。',
      },
      {
        turn: 6,
        action: '全体攻撃',
        type: 'atk_all',
        desc: '再び全員に攻撃を行う。',
      },
    ],
    actionIdx: 0,

    phases: {
      2: {
        hpThreshold: 0.5,
        actionPattern: [
          {
            turn: 1,
            action: '全体攻撃',
            type: 'atk_all',
            desc: '傷ついた怒りで全員を攻撃する。',
          },
          {
            turn: 2,
            action: '近列攻撃',
            type: 'atk_near',
            desc: '近距離を強化攻撃する。',
          },
          {
            turn: 3,
            action: '十字攻撃',
            type: 'atk_cross',
            desc: '十字形に大規模な荊棘を展開する。',
          },
        ],
      },
    },
  },

  // ============================================================
  // enemy_03：堕天の怪異
  // バランス型。縦横どちらも狙い、予測しにくい。
  // 十字・逆十字を組み合わせ、どこにいても危険。
  // ============================================================
  {
    id: 'enemy_03',
    name: '??????',
    img:   'images/enemy_03.webp',
    upImg: 'images/enemy_03_up.webp',
    hp: 1900, hpMax: 1900,
    atk: 370, def: 280, spd: 260,  // バランス型
    phase: 1,
    status: [],
    actionPattern: [
      {
        turn: 1,
        action: '全体攻撃',
        type: 'atk_all',
        desc: '翼を広げ全員に攻撃を行う。',
      },
      {
        turn: 2,
        action: '十字攻撃',
        type: 'atk_cross',
        desc: '中列と中縦列が交差する十字形を攻撃する。中央は常に危険。',
      },
      {
        turn: 3,
        action: '左縦列攻撃',
        type: 'atk_left',
        desc: '左縦列にいるキャラ全員を攻撃する。',
      },
      {
        turn: 4,
        action: '逆十字攻撃',
        type: 'atk_xcross',
        desc: '外周（中列・中縦列を除く四隅周辺）を攻撃する。中央に固めると安全。',
      },
      {
        turn: 5,
        action: '単体攻撃',
        type: 'atk_single',
        desc: 'ランダムな1人に強力な一撃を放つ。',
      },
      {
        turn: 6,
        action: '右縦列攻撃',
        type: 'atk_right',
        desc: '右縦列全員を攻撃する。',
      },
    ],
    actionIdx: 0,

    phases: {
      2: {
        hpThreshold: 0.5,
        actionPattern: [
          {
            turn: 1,
            action: '全体攻撃',
            type: 'atk_all',
            desc: '堕ちた翼で全員を薙ぎ払う。',
          },
          {
            turn: 2,
            action: '十字攻撃',
            type: 'atk_cross',
            desc: '強化された十字攻撃。',
          },
          {
            turn: 3,
            action: '逆十字攻撃',
            type: 'atk_xcross',
            desc: '強化された逆十字攻撃。十字と組み合わせるとほぼ全域をカバーする。',
          },
          {
            turn: 4,
            action: '全体攻撃',
            type: 'atk_all',
            desc: '渾身の全体攻撃。',
          },
        ],
      },
    },
  },

];

// IDで怪異データを取得
function getEnemyById(id) {
  return ENEMIES.find(e => e.id === id) || null;
}
