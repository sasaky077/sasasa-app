
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
//         'ally_shift_right_down' | 'ally_shift_left_down'
//   target: 'enemy' | 'ally_self' | 'ally_all'
//   hit: 効果命中率（省略時100）
//   duration: 持続ターン数
//
// multiplier: 0 = ダメージなし、>0 = ダメージあり（ATK × multiplier）

const CHARACTERS = [

  // ══════════════════════════════════════════════════════════════
  // R
  // ══════════════════════════════════════════════════════════════

  // ── id:12────────────────────────────────
  // 自己防御。縛りと広範囲打撃。
  { id: 12, name: 'イリス', rarity: 'r',
    element: 'mystis',
    role: '回復寄り',
    moveType: 'front_side_3',
    costMax: 12,
    costStart: 5,
    costRegen: 4,
    shinkiMax: 5,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: 
    { HP: 780, ATK: 210},
    img: 'images/chara_12.webp', 
    cutImg: 'images/chara_12_cut.webp', 
    ultImg: 'images/chara_12_cutin.webp',
    upImg: 'images/chara_12_up.webp', 
    battleImg: 'images/chara_12_battle.webp',
    battleBackImg: 'images/chara_12_battle_back.webp',
    panelImg: 'images/chara_12_panel.webp',
    favScale: 0.85, favOffsetY: -35,
    uiScale: {panel: 1.0,battleBack: 1.5},
    skills: [
  {
  id: 's1',
  name: 'Grace',
  linkCost: 3,
  isUltimate: false,
  hit: 100,
  type: 'attack',
  multiplier: 0.7,
  range: 'front_and_side_3_ally',
  effects: [
    { type: 'heal', target: 'ally_self', rate: 0.30 }
  ],
  hitStyle: 'multi',
  desc: '射程：前方1マス＋左右1マス。対象の敵にATK×0.7のダメージを与え、自身のHPを30%回復する。'
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
  desc: '射程：味方全体。ダメージなし。味方全体のHPを35%回復する。'
},
    ]},

     // ── id:6 ────────────────────
  // 神が奏でる音で敵を払いつつ、味方の攻撃テンポを上げる支援寄りアタッカー。
  { id: 6, name: 'オルフィア', rarity: 'r',
    element: 'mystis',
    role: '支援寄り',
    moveType: 'front_side_3',
    costMax: 12,
    costStart: 5,
    costRegen: 4,
    shinkiMax: 5,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: 
    { HP: 720, ATK: 240},
    img: 'images/chara_06.webp', 
    cutImg: 'images/chara_06_cut.webp', 
    ultImg: 'images/chara_06_cutin.webp',
    upImg: 'images/chara_06_up.webp', 
    battleImg: 'images/chara_06_battle.webp',
    battleBackImg: 'images/chara_06_battle_back.webp',
    panelImg: 'images/chara_06_panel.webp',
    favScale: 0.85, favOffsetY: -35,
    uiScale: {panel: 1.0,battleBack: 1.5},
    skills: [
      {
        id: 's1',
        name: 'アマノネイロ',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.2,
        range: 'front_row_3_ally',
        effects: [
          { type: 'atk_up', target: 'ally_all', hit: 100, duration: 1, rate: 1.15 }
        ],
        hitStyle: 'multi',
        desc: '射程：前方横3マス。対象の敵にATK×1.2のダメージを与え、味方全体のATKを1ターン15%上昇させる。'
      },
      {
        id: 'ult',
        name: 'ロックオブリンネ',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 2.6,
        range: 'cross_large',
        effects: [
          { type: 'stun', target: 'enemy', hit: 100, duration: 1 }
        ],
        hitStyle: 'multi',
        desc: '射程：前方大十字範囲。対象の敵にATK×2.6のダメージを与え、1ターン行動不能にする。'
      },
    ]},

  // ── id:2 ──────────────────────────────────
  // スタン・ATKデバフで敵を妨害する妨害役。
  { id: 2, name: 'ネム', rarity: 'r',
    element: 'chaos',
  role: '妨害寄り',
  moveType: 'front_back_row3',
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
    battleImg: 'images/chara_02_battle.webp',
    battleBackImg: 'images/chara_02_battle_back.webp',
    panelImg: 'images/chara_02_panel.webp',
    favScale: 0.85, favOffsetY: -25,
    uiScale: {panel: 1.0,battleBack: 1.5},
    skills: [
      { id: 's1',
        name: 'おやすみなさい',
        linkCost: 4,
        isUltimate: false,
        hit: 100,
        type: 'debuff',
        multiplier: 0.5,
        range: 'fan_2row_3_ally',
        effects: [
          { type: 'stun', target: 'enemy', hit: 100, duration: 2 }
        ],
        hitStyle: 'sleep',
        desc: '射程：前方2段×横3マス。対象の敵に眠りを付与する（2ターンスタン）。' },

      {
  id: 'ult',
  name: 'どりいむたいむ',
  linkCost: 5,
  isUltimate: true,
  hit: 100,
  type: 'attack',
  multiplier: 3.2,
  range: 'enemy_all',
  targetStatus: 'stun',
  effects: [],
  hitStyle: 'heavy',
  desc: '射程：敵全体。ただし眠り（スタン）状態の敵のみを対象に、ATK×3.2の大ダメージを与える。'}
  ]},

  // ── id:3 ──────────────────────────────────
  // 敵を縛り、ペースを握る。
  { id: 3, name: 'ヴェラ', rarity: 'r',
    element: 'chaos',
    role: '妨害寄り',
    moveType: 'front_side_3',
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
    uiScale: {panel: 1.0,battleBack: 1.5},
    skills: [
      { id: 's1',
      name: '支配',
      linkCost: 3,
      isUltimate: false,
      hit: 100,
      type: 'ally_reposition',
      multiplier: 0.0,
      range: 'front_line_all_ally',
      allyShiftDirection: 'right',
      effects: [
        { type: 'ally_shift_right_down', target: 'ally', hit: 100 }
      ],
      desc: '射程：自身の前方同列すべて。対象の味方を1マス右へずらし、さらに味方側へ限界まで引き寄せる。' },

      { id: 'ult',
        name: '絶対の命令',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 1.6,
        range: 'pierce3',
        effects: [
          { type: 'stun', target: 'enemy', hit: 50, duration: 1 }
        ],
        hitStyle: 'multi',
        desc: '射程：前方直線3マス。対象の敵にATK×1.6のダメージを与え、50%の確率で1ターン行動不能にする。' }
    ]},

     // ── id:17 ──────────────────────────────────
  // スタン・ATKデバフで敵を妨害する妨害役。
  { id: 17, name: 'ロゼ', rarity: 'r',
    element: 'chaos',
  role: '妨害寄り',
  moveType: 'front_back_row3',
    costMax: 10,
    costStart: 6,
    costRegen: 5,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 720, ATK: 210 },
    img: 'images/chara_17.webp', 
    cutImg: 'images/chara_17_cut.webp', 
    ultImg: 'images/chara_17_cutin.webp',
    upImg: 'images/chara_17_up.webp', 
    battleImg: 'images/chara_17_battle.webp',
    battleBackImg: 'images/chara_17_battle_back.webp',
    panelImg: 'images/chara_17_panel.webp',
    favScale: 0.85, favOffsetY: -25,
    uiScale: {panel: 1.0,battleBack: 1.5},
    skills: [
      { id: 's1',
        name: 'ラブリーソーン',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'debuff',
        multiplier: 0.0,
        range: 'fan_2row_3_ally',
        effects: [
          { type: 'stun', target: 'enemy', hit: 100, duration: 2 }
        ],
        hitStyle: 'sleep',
        desc: '射程：前方2段×横3マス。対象の敵に眠りを付与する（2ターンスタン）。' },

      {
  id: 'ult',
  name: 'ブラッディ・ローズ・ガーデン',
  linkCost: 5,
  isUltimate: true,
  hit: 100,
  type: 'summon_object',
  multiplier: 0.0,
  range: 'front2',
  summonName: '茨薔薇',
  summonImg: 'images/chara_17_set.webp',
  summonDuration: 3,
  summonDistance: 2,
  summonCount: 3,
  summonOffsets: [
    { dr: 0, dc: -1 },
    { dr: 0, dc:  0 },
    { dr: 0, dc:  1 },
  ],
  summonRange: 'around9',
  summonTickMultiplier: 0.35,
  summonScale: 1.35,
  effects: [
    { type: 'stun', target: 'enemy', hit: 40, duration: 1 }
  ],
  hitStyle: 'summon_tick',
  desc: '射程：前方2マス先を中心に横3マス。3つの茨薔薇を設置する。茨薔薇は3ターンの間、周囲9マスの敵に毎ターンATK×0.35の継続ダメージを与え、40%の確率で1ターンスタンさせる。'}
  ]},


  // ── id:7 
{ id: 7, name: 'スイ', rarity: 'r',
    element: 'chaos',
  role: 'バランス寄り',
  moveType: 'line_front_3',
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
    uiScale: {panel: 1.0,battleBack: 1.5},
    skills: [
      { id: 's1',
        name: '集中',
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.2,
        range: 'pierce3',
        effects: [],
        hitStyle: 'multi',
        desc: '射程：前方直線3マス。対象の敵にATK×1.2のダメージを与える。' },

      { id: 'ult',
        name: '絶対零度',
        linkCost: 4,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 1.6,
        range: 'around24',
        effects: [
        ],
        hitStyle: 'rapid',
        desc: '射程：自身の周囲2マス。対象の敵にATK×1.6のダメージを与える。' }
    ]},

    // ── id:7 シグレ
{ id: 5, name: 'シグレ', rarity: 'r',
    element: 'logos',
  role: 'テクニック寄り',
  moveType: 'front_side_3',
    costMax: 10,
    costStart: 5,
    costRegen: 3,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 600, ATK: 250 },
    img: 'images/chara_05.webp', 
    cutImg: 'images/chara_05_cut.webp', 
    ultImg: 'images/chara_05_cutin.webp',
    upImg: 'images/chara_05_up.webp', 
    battleImg: 'images/chara_05_battle.webp',
    battleBackImg: 'images/chara_05_battle_back.webp',
    panelImg: 'images/chara_05_panel.webp',
    favScale: 0.95, favOffsetY: 5,
    uiScale: {panel: 1.0,battleBack: 1.5},
    skills: [
      { id: 's1',
        name: '剣術・紫繰',
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.2,
        range: 'front1',
        effects: [
          { type: 'push_1', target: 'enemy', hit: 100 }
        ],
        hitStyle: 'normal',
        desc: '射程：正面1マス。対象の敵にATK×1.2のダメージを与え、1マス押し出す。' },

      { id: 'ult',
        name: '剣術・酔ノ想葬',
        linkCost: 3,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 1.5,
        range: 'front_row_3_ally',
        effects: [
          { type: 'yoi_no_sousou', target: 'ally_self', hit: 100, duration: 2, counterMultiplier: 1.0 }
        ],
        hitStyle: 'multi',
        desc: '射程：前方横3マス。対象の敵にATK×1.5のダメージを与える。さらに自身に2ターンの間「酔ノ想葬」を付与する。酔ノ想葬：敵から攻撃される時、その攻撃を回避し、攻撃者に隣接する空きマスへ移動してATK×1.0の反撃を行う。' }
    ]},
  
  // ── id:1 エリ
{ id: 1, name: 'エリ', rarity: 'r',
    element: 'mystis',
  role: 'バランス寄り',
  moveType: 'cross_1',
    costMax: 14,
    costStart: 5,
    costRegen: 2,
    shinkiMax: 5,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 700, ATK: 230 },
    img: 'images/chara_01.webp', 
    cutImg: 'images/chara_01_cut.webp', 
    ultImg: 'images/chara_01_cutin.webp',
    upImg: 'images/chara_01_up.webp', 
    battleImg: 'images/chara_01_battle.webp',
    battleUpImg: 'images/chara_01_battle_up.webp',
    battleBackImg: 'images/chara_01_battle_back.webp',
    panelImg: 'images/chara_01_panel.webp',
    favScale: 1.0, favOffsetY: -10,
    uiScale: {panel: 1.0,battleBack: 1.5},    
    skills: [
      { id: 's1',
        name: '謎の光',
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.3,
        range: 'side_lr',
        effects: [],
        desc: '射程：左右1マス。対象の敵にATK×1.3のダメージを与える。' },

      { id: 'ult',
        name: '駆け巡る閃光',
        linkCost: 4,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 3.0,
        range: 'diag_x_2',
        effects: [],
        desc: '射程：自身中心の斜め2マス。対象の敵にATK×3.0のダメージを与える。' }
    ]},

  // ── id:13 ──────────────────────────────────
  // 背後からの攻撃で大ダメージを狙う暗殺型。
  { id: 13, name: 'アヤカ', rarity: 'r',
    element: 'logos',
    role: 'テクニック寄り',
    moveType: 'front_side_jump',
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
    uiScale: {panel: 1.0,battleBack: 1.5},
    skills: [
      { id: 's1',
        name: '影打ち',
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.0,
        range: 'around8',
        backstabMultiplier: 2.0,
        effects: [],
        desc: '射程：自身の周囲1マス。対象の敵にATK×1.0のダメージを与える。敵の背後から攻撃した場合、ダメージが2倍になる。' },

      { id: 'ult',
        name: '音のない世界',
        linkCost: 4,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 1.8,
        range: 'around24',
        backstabMultiplier: 2.0,
        effects: [],
        hitStyle: 'multi',
        desc: '射程：自身の周囲2マス。対象の敵にATK×1.8のダメージを与える。敵の背後から攻撃した場合、ダメージが2倍になる。' }
    ]},  

  // ══════════════════════════════════════════════════════════════
  // SR
  // ══════════════════════════════════════════════════════════════

  // ── id:4 ───────────────────────────────────
  // 予知系。数ターン先に攻撃を予約する感じ。
  { id: 4, name: 'フローラ', rarity: 'r',
    element: 'mystis',
    role: 'テクニック寄り',
    moveType: 'front2_backdiag2',
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
    uiScale: {panel: 1.0,battleBack: 1.5},
    skills: [
      { id: 's1',
        name: 'もう無理～',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.2,
        range: 'diag_x_1',
        effects: [],
        hitStyle: 'rapid',
        desc: '射程：自身中心の斜め1マス。対象の敵にATK×1.2のダメージを与える。' },

      { id: 'ult',
        name: '明日から本気出すもん',
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
        desc: '射程：盤面中央十字。使用から2ターン後のターン開始時、対象の敵にATK×2.2のダメージを与える。' }
    ]},
 
// ── id:15 
{ id: 15, name: 'エテルナ', rarity: 'r',
    element: 'chaos',
  role: '妨害寄り',
  moveType: 'vertical2_frontdiag2',
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
    uiScale: {panel: 1.0,battleBack: 1.52},
    skills: [
{
  id: 's1',
  name: '序章',
  linkCost: 3,
  isUltimate: false,
  hit: 100,
  type: 'ally_reposition',
  multiplier: 0.0,
  range: 'front_line_all_ally',
  allyShiftDirection: 'left',
  effects: [
    { type: 'ally_shift_left_down', target: 'ally', hit: 100 }
  ],
  desc: '射程：自身の前方同列すべて。対象の味方を1マス左へずらし、さらに味方側へ限界まで引き寄せる。'
},

      {
  id: 'ult',
  name: '森羅万象',
  linkCost: 5,
  isUltimate: true,
  hit: 100,
  type: 'attack',
  multiplier: 3.0,
  range: 'around8',
  effects: [
    { type: 'push_3', target: 'enemy', hit: 100, duration: 1 }
  ],
  hitStyle: 'multi',
  desc: '射程：自身の周囲1マス。対象の敵にATK×3.0のダメージを与え、3マス後退させる。'
}
    ]},

  
  // ── id:19 ──────────────────────────────────
  // 高HPと全体デバフが強力。実体化＋ATKダウンで攻防両立の壁。
  { id: 19, name: 'アンジェ', rarity: 'r',
    element: 'logos',
    role: '妨害寄り',
    moveType: 'silver',
    costMax: 14,
    costStart: 5,
    costRegen: 3,
    shinkiMax: 6,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 600, ATK: 220 },
    img: 'images/chara_19.webp', 
    cutImg: 'images/chara_19_cut.webp', 
    ultImg: 'images/chara_19_cutin.webp',
    upImg: 'images/chara_19_up.webp', 
    battleImg: 'images/chara_19_battle.webp',
    battleBackImg: 'images/chara_19_battle_back.webp',
    panelImg: 'images/chara_19_panel.webp',
    favScale: 0.95, favOffsetY: 15,
    uiScale: {panel: 1.0,battleBack: 1.5},
    skills: [
      { id: 's1',
        name: '浄化の風',
        linkCost: 4,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 0.8,
        range: 'front2',
        effects: [
          { type: 'stun', target: 'enemy', duration: 1, hit: 100 }
        ],
        desc: '射程：前方直線2マス。対象の敵にATK×0.8のダメージを与え、1ターン行動不能にする。'
      },
      {
        id: 'ult',
        name: '癒しの雨',
        linkCost: 6,
        isUltimate: true,
        hit: 100,
        type: 'debuff',
        multiplier: 0.8,
        range: 'enemy_all',
        effects: [
          { type: 'stun', target: 'enemy', duration: 1, hit: 30 },
          { type: 'atk_down', target: 'enemy', duration: 2, hit: 100, rate: 0.7 }
        ],
        hitStyle: 'all',
        desc: '射程：敵全体。対象の敵にATK×0.8のダメージを与える。さらに30%の確率で1ターン行動不能にし、2ターンATKを低下させる。'
      }
    ]},

  // ── id:20 ──────────────────────────────────
  { id: 20, name: 'リブラ', rarity: 'r',
    element: 'logos',
    role: '支援寄り',
    moveType: 'front_back_row3',
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
    uiScale: {panel: 1.0,battleBack: 1.5},
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
        desc: '射程：味方全体。ダメージなし。味方全体のATKを1ターン30%上昇させる。' },

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
        desc: '射程：敵全体。対象の敵にATK×0.5のダメージを与える。さらに3ターンの間、毒による継続ダメージを与える。' }
    ]},


  // ══════════════════════════════════════════════════════════════
  // UR
  // ══════════════════════════════════════════════════════════════

  // ── id:14 ──────────────────────────────────
  // コピー系。
  { id: 14, name: 'イグニス', rarity: 'r',
    element: 'chaos',
    role: 'テクニック寄り',
    moveType: 'silver',
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
    battleUpImg: 'images/chara_14_battle_up.webp',
    battleImg: 'images/chara_14_battle.webp',
    battleBackImg: 'images/chara_14_battle_back.webp',
    panelImg: 'images/chara_14_panel.webp',
    favScale: 1.0, favOffsetY: -15,
    uiScale: {panel: 1.0,battleBack: 1.7},
    skills: [  
  { 
    id: 's1', 
    name: '猿真似',
    linkCost: 3,
    isUltimate: false,
    hit: 100,
    type: 'repeat_skill',
    multiplier: 0.0,
    range: 'self',
    effects: [],
    desc: '射程：自身。ダメージなし。このターン中、直前に発動した味方の通常スキルをもう一度発動する。'
},

{ id: 'ult',
  name: '神のみぞ知る',
  linkCost: 5,
  isUltimate: true,
  hit: 100,
  type: 'random_cell_attack',
  multiplier: 4.0,
  randomCellCount: 6,
  range: 'field_all',
  effects: [],
  hitStyle: 'heavy',
  desc: '射程：盤面全体からランダム6マス。命中した敵にATK×4.0のダメージを与える。'
}
    ]},


  // ── id:16 ミト（耐久寄り）──────────────────────────────────
  // 高HP。実体化の確実付与と全体攻撃のハイブリッド。スタンも持つ完全体壁役。
  { id: 16, name: 'ミト', rarity: 'r',
    element: 'mystis',
    role: '耐久寄り',
    moveType: 'silver',
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
    uiScale: {panel: 1.0,battleBack: 1.5},
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
        desc: '射程：自身の周囲1マス。対象の敵にATK×0.7のダメージを与え、80%の確率で2ターン実体化させる。' },

      { id: 'ult',
        name: 'ご飯の時間',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        type: 'summon_object',
        multiplier: 1.0,
        range: 'front2',
        summonImg: 'images/chara_16_set.webp',
        summonDuration: 3,
        summonRange: 'around9',
        summonTickMultiplier: 1.0,
        effects: [
        { 
          type: 'drain', 
          target: 'ally_all', 
          rate: 0.5 
        }
        ],
        hitStyle: 'multi',
        desc: '射程：前方2マス先。式神を設置する。式神は3ターンの間、周囲9マスの敵にATK×1.0の継続ダメージを与え、与えたダメージの50%分、味方全員のHPを回復する。3ターン後に消える。' }
        ]},

 // ── id:8 
{ id: 8, 
  name: 'アルノ', rarity: 'r',
    element: 'chaos',
  role: '速度寄り',
  moveType: 'front_back_frontdiag',
    costMax: 14,
    costStart: 4,
    costRegen: 2,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 600, ATK: 280 },
    img: 'images/chara_08.webp', 
    cutImg: 'images/chara_08_cut.webp', 
    ultImg: 'images/chara_08_cutin.webp',
    upImg: 'images/chara_08_up.webp', 
    battleImg: 'images/chara_08_battle.webp',
    battleUpImg: 'images/chara_08_battle_up.webp',
    battleBackImg: 'images/chara_08_battle_back.webp',
    panelImg: 'images/chara_08_panel.webp',
    uiScale: {panel: 1.0,battleBack: 1.5},
    skills: [
      { id: 's1',
        name: 'ギルティ',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.5,
        range: 'front1',
        effects: [],
        desc: '射程：正面1マス。対象の敵にATK×1.5のダメージを与える。' },

      { id: 'ult',
        name: 'エグゼキュート',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 2.5,
        range: 'around8',
        effects: [],
        desc: '射程：自身の周囲1マス。対象の敵にATK×2.5のダメージを与える。' }
    ]},


  // ── id:9 ミア ──────────────────────────────────
  // 猫モチーフ。白猫のように距離を詰め、爪跡で敵の攻撃力を落とす妨害寄りアタッカー。
  { id: 9, name: 'ミア', rarity: 'r',
    element: 'mystis',
    role: '妨害寄り',
    moveType: 'front_side_jump',
    costMax: 12,
    costStart: 5,
    costRegen: 4,
    shinkiMax: 4,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 680, ATK: 265 },
    img: 'images/chara_09.webp',
    cutImg: 'images/chara_09_cut.webp',
    ultImg: 'images/chara_09_cutin.webp',
    upImg: 'images/chara_09_up.webp',
    battleImg: 'images/chara_09_battle.webp',
    battleBackImg: 'images/chara_09_battle_back.webp',
    panelImg: 'images/chara_09_panel.webp',
    favScale: 0.90, favOffsetY: -25,
    uiScale: {panel: 1.0, battleBack: 1.5},
    skills: [
      { id: 's1',
        name: 'ネコダマシ',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.1,
        range: 'cat_paw_ally',
        effects: [
          { type: 'stun', target: 'enemy', hit: 70, duration: 1, rate: 0.75 }
        ],
        hitStyle: 'rapid',
        desc: '射程：前方1マス＋斜め前2マス＋左右1マス。対象の敵にATK×1.1のダメージを与え、70%の確率で敵を1ターンスタンする。' },

      { id: 'ult',
        name: 'ルミニャス・インパクト',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 2.2,
        range: 'cat_moon_ally',
        effects: [
          { type: 'stun', target: 'enemy', hit: 60, duration: 1 },
          { type: 'atk_down', target: 'enemy', hit: 100, duration: 2, rate: 0.65 }
        ],
        hitStyle: 'heavy',
        desc: '射程：前方2段の月爪範囲。対象の敵にATK×2.2のダメージを与え、60%の確率で1ターン行動不能にし、2ターンATKを35%低下させる。' }
    ]},

  ];

function getCharaById(id) {
  return CHARACTERS.find(c => c.id === id) || null;
}
