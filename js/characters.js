
// characters.js
// ★ 正式仕様（設計整理 2025）
//   - stats は HP / ATK のみ
//   - Battle32 / Roguelite は DEF / SPD を使用しない
//   - effect type に def_* / spd_* は使用しない
//   - ダメージ式は ATK × multiplier
//
// effects[] 設計：
//   { type, target, hit, duration }
//   type: 'jittai' | 'stun' | 'atk_down' | 'atk_up'
//         'sure_hit_self' | 'sure_hit_team' | 'heal' | 'poison'
//         'pull_1' | 'pull_2' | 'push_1' | 'push_2' | 'push_3'
//         'shift_right_1' | 'shift_right_2' | 'shift_left_1' | 'shift_left_2'
//   target: 'enemy' | 'ally_self' | 'ally_all'
//   hit: 効果命中率（省略時100）
//   duration: 持続ターン数
//
// multiplier: 0 = ダメージなし、>0 = ダメージあり（ATK × multiplier）

const CHARACTERS = [

  // ══════════════════════════════════════════════════════════════
  // R
  // ══════════════════════════════════════════════════════════════

  // ── id:12 アンジェリカ（バランス）────────────────────────────────
  // 安定した攻撃と自己防御。縛りと広範囲打撃。
  { id: 12, name: 'アンジェリカ', rarity: 'ur',
    role: 'バランス',
    moveType: 'gold',
    costMax: 12,
    costStart: 5,
    costRegen: 4,
    shinkiMax: 5,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: 
    { 
      HP: 780, 
      ATK: 230},
    img: 'images/chara_12.webp', 
    cutImg: 'images/chara_12_cut.webp', 
    ultImg: 'images/chara_12_cutin.webp',
    upImg: 'images/chara_12_up.webp', 
    battleImg: 'images/chara_12_battle.webp',
    battleBackImg: 'images/chara_12_battle_back.webp',
    panelImg: 'images/chara_12_panel.webp',
    favScale: 0.85, favOffsetY: -35,
    skills: [
  {
    id: 's1',
    name: 'Grace',
    linkCost: 3,
    isUltimate: false,
    hit: 100,
    type: 'heal',
    multiplier: 0.0,
    range: 'self',
    effects: [
      { type: 'heal', target: 'ally_self', rate: 0.30 }
    ],
    desc: '祈りにより自身のHPを30%回復する。'
  },
  {
  id: 'ult',
  name: 'Descent',
  linkCost: 5,
  isUltimate: true,
  hit: 100,
  type: 'heal',
  multiplier: 0.0,
  range: 'ally_all',
  effects: [
    { type: 'heal', target: 'ally_all', rate: 0.35 }
  ],
  hitStyle: 'all',
  desc: '味方全体のHPを35%回復する。'
},
    ]},

  // ── id:2 レイチェル（速度寄り）──────────────────────────────────
  // スタン・ATKデバフで敵を妨害する妨害役。
  { id: 2, name: 'レイチェル', rarity: 'r',
  role: '速度寄り',
  moveType: 'shigure',
    costMax: 10,
    costStart: 6,
    costRegen: 5,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 720, ATK: 210 },
    img: 'images/chara_02.webp', 
    cutImg: 'images/chara_02_cut.webp', 
    ultImg: 'images/chara_02_cutin.webp',
    upImg: 'images/chara_02_up.webp', 
    partyImg: 'images/chara_02_party.webp',
    battleImg: 'images/chara_02_battle.webp',
    battleBackImg: 'images/chara_02_battle_back.webp',
    panelImg: 'images/chara_02_panel.webp',
    favScale: 0.85, favOffsetY: -25,
    skills: [
      { id: 's1',
        name: 'ばぁっ',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.5,
        range: 'fan_2row_3_ally',
        effects: [],
        desc: '' },

      {
  id: 'ult',
  name: '超BUTな夜',
  linkCost: 5,
  isUltimate: true,
  hit: 100,
  type: 'attack',
  multiplier: 2.2,
  range: 'super_but_night_6',
  effects: [
    { type: 'stun', target: 'enemy', hit: 100, duration: 1 }
  ],
  hitStyle: 'multi',
  desc: '前方に広がるコウモリの群れで攻撃し、命中した敵を1ターンスタンさせる。'}
  ]},

  // ── id:3 アズミ（耐久寄り）──────────────────────────────────
  // 敵を縛り、ペースを握る。
  { id: 3, name: 'アズミ', rarity: 'r',
    role: '耐久寄り',
    moveType: 'gold',
    costMax: 14,
    costStart: 5,
    costRegen: 3,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 840, ATK: 200 },
    img: 'images/chara_03.webp', 
    cutImg: 'images/chara_03_cut.webp', 
    ultImg: 'images/chara_03_cutin.webp',
    upImg: 'images/chara_03_up.webp', 
    battleImg: 'images/chara_03_battle.webp',
    battleBackImg: 'images/chara_03_battle_back.webp',
    panelImg: 'images/chara_03_panel.webp',
    favScale: 1.0, favOffsetY: 10,
    skills: [
      { id: 's1',
        name: '蛇睨み',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 0.8,
        range: 'front1',
        effects: [
          { type: 'stun', target: 'enemy', hit: 100, duration: 1 }
        ],
        desc: '目の前の敵に小ダメージを与え、1ターン行動不能にする。' },

      { id: 'ult',
        name: '白鱗呑天',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 1.6,
        range: 'pierce3',
        effects: [
          { type: 'stun', target: 'enemy', hit: 100, duration: 1 }
        ],
        hitStyle: 'multi',
        desc: '前方直線3マスの敵にダメージを与え、1ターン行動不能にする。' }
    ]},

  // ── id:7 ルナ
{ id: 7, name: 'ルナ', rarity: 'r',
  role: '速度寄り',
  moveType: 'miyu',
    costMax: 10,
    costStart: 5,
    costRegen: 3,
    shinkiMax: 5,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 600, ATK: 250 },
    img: 'images/chara_07.webp', 
    cutImg: 'images/chara_07_cut.webp', 
    ultImg: 'images/chara_07_cutin.webp',
    upImg: 'images/chara_07_up.webp', 
    battleImg: 'images/chara_07_battle.webp',
    battleBackImg: 'images/chara_07_battle_back.webp',
    panelImg: 'images/chara_07_panel.webp',
    favScale: 0.95, favOffsetY: 5,
    skills: [
      { id: 's1',
        name: 'いくよ！ベル！',
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.2,
        range: 'pierce3',
        effects: [],
        hitStyle: 'multi',
        desc: '直線上3マス以内の敵にダメージ' },

      { id: 'ult',
        name: 'あ、当たるよね？！',
        linkCost: 4,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 1.6,
        range: 'around24',
        effects: [
        ],
        hitStyle: 'rapid',
        desc: '自分を中心に周囲2マス以内の敵に中ダメージ' }
    ]},
  
  // ── id:1 エリ
{ id: 1, name: 'エリ', rarity: 'r',
  role: '速度寄り',
  moveType: 'eri',
    costMax: 14,
    costStart: 5,
    costRegen: 2,
    shinkiMax: 4,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 820, ATK: 200 },
    img: 'images/chara_01.webp', 
    cutImg: 'images/chara_01_cut.webp', 
    ultImg: 'images/chara_01_cutin.webp',
    upImg: 'images/chara_01_up.webp', 
    battleImg: 'images/chara_01_battle.webp',
    battleBackImg: 'images/chara_01_battle_back.webp',
    panelImg: 'images/chara_01_panel.webp',
    favScale: 0.85, favOffsetY: -10,    
    skills: [
      { id: 's1',
        name: '閃',
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.2,
        range: 'side_lr',
        effects: [],
        desc: '自身の左右1マス以内の敵にダメージ' },

      { id: 'ult',
        name: '終',
        linkCost: 4,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 3.0,
        range: 'diag_x_2',
        effects: [],
        desc: '自身を中心に斜め2マス以内の敵に大ダメージ' }
    ]},

  // ── id:13 チサカ（暗殺寄り）──────────────────────────────────
  // 背後からの攻撃で大ダメージを狙う暗殺型。
  { id: 13, name: 'チサカ', rarity: 'r',
    role: '暗殺寄り',
    moveType: 'chisaka',
    costMax: 12,
    costStart: 6,
    costRegen: 4,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 760, ATK: 225 },
    img: 'images/chara_13.webp', 
    cutImg: 'images/chara_13_cut.webp', 
    ultImg: 'images/chara_13_cutin.webp',
    upImg: 'images/chara_13_up.webp', 
    battleImg: 'images/chara_13_battle.webp',
    battleBackImg: 'images/chara_13_battle_back.webp',
    panelImg: 'images/chara_13_panel.webp',
    favScale: 0.90, favOffsetY: 10,
    skills: [
      { id: 's1',
        name: '影刺し',
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.0,
        range: 'around8',
        backstabMultiplier: 2.0,
        effects: [],
        desc: '周囲1マスの敵にダメージを与える。敵の背後から攻撃した場合、ダメージが2倍になる。' },

      { id: 'ult',
        name: '無音',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 1.8,
        range: 'around24',
        backstabMultiplier: 2.0,
        effects: [],
        hitStyle: 'multi',
        desc: '周囲2マスの敵にダメージを与える。敵の背後から攻撃した場合、ダメージが2倍になる。' }
    ]},  

  // ══════════════════════════════════════════════════════════════
  // SR
  // ══════════════════════════════════════════════════════════════

  // ── id:4 ユズハ（ギャル寄り）───────────────────────────────────
  // 予知系。数ターン先に攻撃を予約する感じ。
  { id: 4, name: 'ユズハ', rarity: 'sr',
    role: '火力寄り',
    moveType: 'yuzuha',
    costMax: 14,
    costStart: 0,
    costRegen: 2,
    shinkiMax: 4,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 730, ATK: 275 },
    img: 'images/chara_04.webp', 
    cutImg: 'images/chara_04_cut.webp', 
    ultImg: 'images/chara_04_cutin.webp',
    upImg: 'images/chara_04_up.webp', 
    battleImg: 'images/chara_04_battle.webp',
    battleBackImg: 'images/chara_04_battle_back.webp',
    panelImg: 'images/chara_04_panel.webp',
    favScale: 1.00, favOffsetY: 20,
    uiScale: {
    panel: 1.0,
    battleBack: 1.0
},
    skills: [
      { id: 's1',
        name: '堕ちちゃう系？',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.2,
        range: 'diag_x_1',
        effects: [],
        hitStyle: 'rapid',
        desc: '自分を中心にX字の範囲にダメージ' },

      { id: 'ult',
        name: '意外と神様信じてる',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        type: 'delayed_attack',
        multiplier: 2.2,
        range: 'field_cross_center',
        effects: [],
        hitStyle: 'multi',
        delayTurns: 2,
        delayedTrigger: 'allyTurnStart',
        desc: '使用した2ターン後のターン開始時に固定マスに大ダメージ。' }
    ]},
 
// ── id:15 アキ
{ id: 15, name: 'アキ', rarity: 'sr',
  role: '速度・支援寄り',
  moveType: 'aki',
    costMax: 12,
    costStart: 7,
    costRegen: 2,
    shinkiMax: 5,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 770, ATK: 235 },
    img: 'images/chara_15.webp', 
    cutImg: 'images/chara_15_cut.webp', 
    ultImg: 'images/chara_15_cutin.webp',
    upImg: 'images/chara_15_up.webp', 
    battleImg: 'images/chara_15_battle.webp',
    battleBackImg: 'images/chara_15_battle_back.webp',
    panelImg: 'images/chara_15_panel.webp',
    favScale: 0.90, favOffsetY: 20,
    uiScale: {
    panel: 1.5,
    battleBack: 1.15
},
    skills: [
      { id: 's1',
        name: 'おいで',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.3,
        range: 'pierce3',
        effects: [
          {
             type: 'pull_2', 
             target: 'enemy', 
             hit: 100, 
             duration: 1 
            }
        ],
        desc: '前方直線3マスの敵にダメージを与え、2マス引き寄せる。' },

      {
  id: 'ult',
  name: '退いて',
  linkCost: 5,
  isUltimate: true,
  hit: 100,
  type: 'attack',
  multiplier: 1.0,
  range: 'around8',
  effects: [
    { type: 'push_3', target: 'enemy', hit: 100, duration: 1 }
  ],
  hitStyle: 'multi',
  desc: '自身の周囲8マスの敵にダメージを与え、3マス後退させる。'
}
    ]},

  
  // ── id:19 カンナ（耐久寄り）──────────────────────────────────
  // 高HPと全体デバフが強力。実体化＋ATKダウンで攻防両立の壁。
  { id: 19, name: 'カンナ', rarity: 'sr',
    role: '制御・妨害寄り',
    moveType: 'silver',
    costMax: 14,
    costStart: 5,
    costRegen: 3,
    shinkiMax: 6,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 600, ATK: 250 },
    img: 'images/chara_19.webp', 
    cutImg: 'images/chara_19_cut.webp', 
    ultImg: 'images/chara_19_cutin.webp',
    upImg: 'images/chara_19_up.webp', 
    battleImg: 'images/chara_19_battle.webp',
    battleBackImg: 'images/chara_19_battle_back.webp',
    panelImg: 'images/chara_19_panel.webp',
    favScale: 0.95, favOffsetY: 15,
    skills: [
      { id: 's1',
        name: '神経遮断',
        linkCost: 4,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 0.8,
        range: 'front2',
        effects: [
          { type: 'stun', target: 'enemy', duration: 1, hit: 100 }
        ],
        desc: '神経伝達を遮断する麻酔弾を撃ち込み、前方2マスの敵に小ダメージを与えて1ターン行動不能にする。'
      },
      {
        id: 'ult',
        name: 'シナプス崩壊',
        linkCost: 6,
        isUltimate: true,
        hit: 100,
        type: 'debuff',
        multiplier: 0.8,
        range: 'enemy_all',
        effects: [
          { type: 'stun', target: 'enemy', duration: 1, hit: 100 },
          { type: 'atk_down', target: 'enemy', duration: 2, hit: 100, rate: 0.7 }
        ],
        hitStyle: 'all',
        desc: '敵全体に小ダメージを与える。さらに1ターン行動不能にし、2ターンATKを低下させる。'
      }
    ]},

  // ── id:20 マアヤ（支援寄り）──────────────────────────────────
  { id: 20, name: 'マアヤ', rarity: 'sr',
    role: '支援・毒寄り',
    moveType: 'shigure',
    costMax: 10,
    costStart: 6,
    costRegen: 5,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 780, ATK: 245 },
    img: 'images/chara_20.webp', 
    cutImg: 'images/chara_20_cut.webp', 
    ultImg: 'images/chara_20_cutin.webp',
    upImg: 'images/chara_20_up.webp', 
    battleImg: 'images/chara_20_battle.webp',
    battleBackImg: 'images/chara_20_battle_back.webp',
    panelImg: 'images/chara_20_panel.webp',
    favScale: 0.90, favOffsetY: -35,
    skills: [
      { id: 's1',
        name: 'Overdose',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'buff',
        multiplier: 0.0,
        range: 'ally_all',
        effects: [
          { type: 'atk_up', target: 'ally_all', hit: 100, duration: 1, rate: 1.3 }
        ],
        desc: '薬剤を投与し、味方全体のATKを1ターン上昇させる。' },

      { id: 'ult',
        name: 'Toxic Mist',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        type: 'debuff',
        multiplier: 0.5,
        range: 'enemy_all',
        effects: [
          { type: 'poison', target: 'enemy', hit: 100, duration: 3, rate: 0.50 }
        ],
        hitStyle: 'all',
        desc: '毒性ミストを戦場全体に拡散し、敵全体に小ダメージを与える。さらに3ターンの間、毒による継続ダメージを与える。' }
    ]},


  // ══════════════════════════════════════════════════════════════
  // UR
  // ══════════════════════════════════════════════════════════════

  // ── id:14 アイム（火力寄り）──────────────────────────────────
  // コピー系。
  { id: 14, name: 'アイム', rarity: 'sr',
    role: 'テクニック寄り',
    costMax: 14,
    costStart: 6,
    costRegen: 4,
    shinkiMax: 4,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 777, ATK: 246 },
    img: 'images/chara_14.webp', 
    cutImg: 'images/chara_14_cut.webp', 
    ultImg: 'images/chara_14_cutin.webp',
    upImg: 'images/chara_14_up.webp', 
    battleImg: 'images/chara_14_battle.webp',
    battleBackImg: 'images/chara_14_battle_back.webp',
    panelImg: 'images/chara_14_panel.webp',
    favScale: 0.85, favOffsetY: -15,
    skills: [  
  { 
    id: 's1', 
    name: 'リプレイ',
    linkCost: 3,
    isUltimate: false,
    hit: 100,
    type: 'repeat_skill',
    multiplier: 0.0,
    range: 'self',
    effects: [],
    desc: 'このターン中、直前に発動した味方の通常スキルをもう一度発動する。'
},

{ id: 'ult',
  name: 'ジャグラー',
  linkCost: 5,
  isUltimate: true,
  hit: 100,
  type: 'random_cell_attack',
  multiplier: 4.0,
  randomCellCount: 6,
  range: 'field_all',
  effects: [],
  hitStyle: 'heavy',
  desc: '盤面上のランダムな6マスを攻撃する。当たった敵にATKの4倍ダメージ。'
}
    ]},


  // ── id:16 ミト（耐久寄り）──────────────────────────────────
  // 高HP。実体化の確実付与と全体攻撃のハイブリッド。スタンも持つ完全体壁役。
  { id: 16, name: 'ミト', rarity: 'ur',
    role: '耐久寄り',
    costMax: 14,
    costStart: 5,
    costRegen: 3,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 800, ATK: 255 },
    img: 'images/chara_16.webp', 
    cutImg: 'images/chara_16_cut.webp', 
    ultImg: 'images/chara_16_cutin.webp',
    upImg: 'images/chara_16_up.webp', 
    battleImg: 'images/chara_16_battle.webp',
    battleBackImg: 'images/chara_16_battle_back.webp',
    panelImg: 'images/chara_16_panel.webp',
    favScale: 1.1, favOffsetY: 35,
    skills: [
      { id: 's1',
        name: 'シロと一緒',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 0.7,
        range: 'around8',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 80, duration: 2 }
        ],
        desc: '攻撃しながら怪異を実体化させる。ATKの0.7倍のダメージ。' },

      { id: 'ult',
        name: 'ご飯の時間',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 2.0,
        range: 'pierce_all',
        effects: [
        { 
          type: 'drain', 
          target: 'ally_all', 
          rate: 0.3 
        }
        ],
        hitStyle: 'multi',
        desc: '与えたダメージの30%分、味方全員のHPを回復する。' }
        ]},

 // ── id:8 アサミ
{ id: 8, 
  name: 'アサミ', rarity: 'sr',
  role: '速度寄り',
  moveType: 'asami',
    costMax: 14,
    costStart: 4,
    costRegen: 2,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 850, ATK: 280 },
    img: 'images/chara_08.webp', 
    cutImg: 'images/chara_08_cut.webp', 
    ultImg: 'images/chara_08_cutin.webp',
    upImg: 'images/chara_08_up.webp', 
    battleImg: 'images/chara_08_battle.webp',
    battleBackImg: 'images/chara_08_battle_back.webp',
    panelImg: 'images/chara_08_panel.webp',
    uiScale: {
    panel: 1.0,
    battleBack: 1.15
    },
    skills: [
      { id: 's1',
        name: 'じゃっく！',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.5,
        range: 'front1',
        effects: [],
        desc: '正面のマスに中ダメージ' },

      { id: 'ult',
        name: 'ざ・りっぱー！',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 2.2,
        range: 'around8',
        effects: [],
        desc: '自分を中心周囲1マスにダメージ' }
    ]},

  ];

function getCharaById(id) {
  return CHARACTERS.find(c => c.id === id) || null;
}
