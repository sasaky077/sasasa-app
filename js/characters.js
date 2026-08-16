
// characters.js
// ★ 正式仕様（設計整理 2025）
//   - stats は HP / ATK のみ
//   - element は 'logos' / 'mystis' / 'chaos'、または ['logos','chaos'] のような複属性に対応
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

  // ── id:1 エリ
  { id: 1, name: 'エリ', rarity: 'sr',
    element: ['mystis', 'logos'],
    role: 'バランス寄り',
    moveType: 'cross_1',
    costMax: 14,
    costStart: 5,
    costRegen: 2,
    shinkiMax: 5,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 670, ATK: 235 },
    img: 'images/chara_01.webp', 
    cutImg: 'images/chara_01_cut.webp', 
    ultImg: 'images/chara_01_cutin.webp',
    upImg: 'images/chara_01_up.webp', 
    battleImg: 'images/chara_01_battle.webp',
    battleUpImg: 'images/chara_01_battle_up.webp',
    battleBackImg: 'images/chara_01_battle_back.webp',
    panelImg: 'images/chara_01_panel.webp',
    favScale: 0.80, favOffsetY: -40,
    resonanceMaterialId: 'eri_origin_wing',
    resonanceBonusProfile: 'eri_v1',
    uiScale: {panel: 1.0,battleBack: 1.0,battleUp: 1.0},    
        combo: {
      range: 'combo_line_all',
      skill: { id: 'combo', name: '共鳴する閃光', type: 'attack', multiplier: 0.80, range: 'combo_x_all', effects: [], hitStyle: 'normal', desc: '同じ縦列上の味方スキルに反応し、X字上の敵へ追撃する。' }
    },
skills: [
      { id: 's1',
        name: '謎の光',
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.10,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 1.5,
        range: 'side_lr',
        effects: [],
        desc: '射程：左右1マス。対象の敵にATK×1.5のダメージを与える。' },

      { id: 'ult',
        name: '駆け巡る閃光',
        linkCost: 4,
        isUltimate: true,
        hit: 100,
        criticalRate: 0.30,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 3.0,
        range: 'diag_x_2',
        effects: [],
        desc: '射程：自身中心の斜め2マス。対象の敵にATK×3.0のダメージを与える。' }
    ]},

  // ── id:2 ネム
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
    stats: { HP: 560, ATK: 270 },
    img: 'images/chara_02.webp', 
    cutImg: 'images/chara_02_cut.webp', 
    ultImg: 'images/chara_02_cutin.webp',
    upImg: 'images/chara_02_up.webp', 
    battleImg: 'images/chara_02_battle.webp',
    battleUpImg: 'images/chara_02_battle_up.webp',
    battleBackImg: 'images/chara_02_battle_back.webp',
    panelImg: 'images/chara_02_panel.webp',
    favScale: 0.85, favOffsetY: -25,
    uiScale: {panel: 1.0,battleBack: 1.5,battleUp: 1.0},
    combo: {
      range: 'combo_cross_1',
      skill: { id: 'combo', name: 'スリープ・チェイン', type: 'debuff', multiplier: 0.20, range: 'around8', effects: [{ type: 'stun', target: 'enemy', hit: 25, duration: 1 }], hitStyle: 'sleep', desc: '上下左右1マスの味方スキルに反応し、周囲1マスの敵へ小ダメージを与える。25%の確率で1ターン眠り状態にする。' }
    },
    skills: [
      { id: 's1',
        name: 'ぐっどないと',
        linkCost: 4,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.10,
        criticalDamageRate: 1.5,
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

  // ── id:3 スイ
  { id: 3, name: 'スイ', rarity: 'sr',
    element: 'mystis',
  role: 'バランス寄り',
  moveType: 'line_front_3',
    costMax: 10,
    costStart: 5,
    costRegen: 3,
    shinkiMax: 5,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 600, ATK: 250 },
    img: 'images/chara_03.webp', 
    cutImg: 'images/chara_03_cut.webp', 
    ultImg: 'images/chara_03_cutin.webp',
    upImg: 'images/chara_03_up.webp', 
    battleImg: 'images/chara_03_battle.webp',
    battleUpImg: 'images/chara_03_battle_up.webp',
    battleBackImg: 'images/chara_03_battle_back.webp',
    panelImg: 'images/chara_03_panel.webp',
    favScale: 0.90, favOffsetY: -10,
    resonanceBonusProfile: 'sui_v1',
    uiScale: {panel: 1.0,battleBack: 1.0,battleUp: 1.0},
        combo: {
      range: 'combo_x_all',
      skill: { id: 'combo', name: '星導の余光', type: 'buff', multiplier: 0, range: 'ally_all', effects: [{ type: 'critical_up', target: 'ally_all', hit: 100, duration: 1, rate: 0.10 }], hitStyle: 'support', desc: 'X字上の味方スキルに反応し、味方全体のcritical率を1ターン10%上昇する。' }
    },
skills: [
      { id: 's1',
        name: '星読みの予兆',
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.00,
        criticalDamageRate: 1.5,
        type: 'delayed_random_support',
        multiplier: 0.0,
        range: 'self',
        randomOptions: [
          { effectType: 'link_plus_2', label: 'LINK+2', amount: 2 },
          { effectType: 'lowest_hp_heal', label: '一番HPの低い味方を最大HPの50%回復', rate: 0.50 },
          { effectType: 'all_critical_up', label: '味方全体critical率+15%', rate: 0.15, duration: 1 }
        ],
        effects: [],
        hitStyle: 'support',
        desc: '次の自ターン開始時、LINK+2／一番HPの低い味方を最大HPの50%回復／味方全体critical率+15% のいずれかがランダムで発動する。' },

      { id: 'ult',
        name: '星環の約束',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        criticalRate: 0.00,
        criticalDamageRate: 1.5,
        type: 'delayed_choice_support',
        multiplier: 0.0,
        range: 'self',
        choiceOptions: [
          { effectType: 'link_plus_2', label: 'LINK+2', amount: 2 },
          { effectType: 'all_critical_up', label: '味方全体critical率+50%', rate: 0.50, duration: 1 },
          { effectType: 'all_guard', label: '味方全体ガード（ダメージ70%カット）', rate: 0.70, duration: 1 }
        ],
        effects: [],
        hitStyle: 'support',
        desc: '任意の効果を選択して予約する。次の自ターン開始時、LINK+2／味方全体critical率+50%（1ターン）／味方全体ガード（ダメージ70%カット・1ターン）のいずれかが発動する。' }
    ]},

     // ── id:4 アルノ
  { id: 4, 
  name: 'アルノ', rarity: 'sr',
    element: 'chaos',
  role: '速度寄り',
  moveType: 'front_back_frontdiag',
    costMax: 14,
    costStart: 4,
    costRegen: 2,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 500, ATK: 300 },
    img: 'images/chara_04.webp', 
    cutImg: 'images/chara_04_cut.webp', 
    ultImg: 'images/chara_04_cutin.webp',
    upImg: 'images/chara_04_up.webp', 
    battleImg: 'images/chara_04_battle.webp',
    battleUpImg: 'images/chara_04_battle_up.webp',
    battleBackImg: 'images/chara_04_battle_back.webp',
    panelImg: 'images/chara_04_panel.webp',
    resonanceBonusConfig: {
      3: { comboTriggerRange: 'combo_cross_all' },
      4: {
        comboMultiplier: 1.15,
        ultMultiplier: 3.0,
        selfAtkUpOnCritical: { rate: 1.15, duration: 1 }
      }
    },
    favScale: 0.82, favOffsetY: -50,
    uiScale: {panel: 1.0,battleBack: 1.0,battleUp: 1.0},
        combo: {
      range: 'combo_cross_1',
      skill: { id: 'combo', name: 'クイック・ギルティ', type: 'attack', multiplier: 0.90, range: 'combo_line_all', effects: [], hitStyle: 'rapid_multi', hitCount: 3, desc: '上下左右1マスの味方スキルに反応し、同じ縦列上の敵へ高速追撃する。' }
    },
skills: [
      { id: 's1',
        name: 'ギルティ',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.7,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 1.5,
        range: 'front1',
        effects: [],
        hitStyle: 'rapid_multi',
        hitCount: 5,
        desc: '射程：正面1マス。対象の敵にATK×1.5のダメージを5連撃で与える（合計ダメージはATK×1.5）。' },

      { id: 'ult',
        name: 'エグゼキュート',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        criticalRate: 0.50,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 2.5,
        range: 'around8',
        effects: [],
        hitStyle: 'rapid_multi',
        hitCount: 5,
        desc: '射程：自身の周囲1マス。対象の敵にATK×2.5のダメージを与える。' }
    ]},

  // ── id:5 クラリネ
  { id: 5, name: 'クラリネ', rarity: 'r',
 element: 'chaos',
    role: 'テクニック寄り',
    moveType: 'king_8',
    costMax: 14,
    costStart: 6,
    costRegen: 4,
    shinkiMax: 4,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 580, ATK: 280 },
    img: 'images/chara_05.webp', 
    cutImg: 'images/chara_05_cut.webp', 
    ultImg: 'images/chara_05_cutin.webp',
    upImg: 'images/chara_05_up.webp', 
    battleUpImg: 'images/chara_05_battle_up.webp',
    battleImg: 'images/chara_05_battle.webp',
    battleBackImg: 'images/chara_05_battle_back.webp',
    panelImg: 'images/chara_05_panel.webp',
    favScale: 0.80, favOffsetY: -45,
    uiScale: {panel: 1.0,battleBack: 1.3,battleUp: 1.0},
    combo: {
      range: 'combo_x_1',
      skill: { id: 'combo', name: 'トリック・アンコール', type: 'attack', multiplier: 0.40, range: 'around8', effects: [], hitStyle: 'rapid', desc: '斜め隣接4マスの味方スキルに反応し、自身の周囲1マスへ軽い追撃を行う。' }
    },
    skills: [  
  { 
    id: 's1', 
    name: 'アンコール',
    linkCost: 3,
    isUltimate: false,
    hit: 100,
    criticalRate: 0.10,
    criticalDamageRate: 1.5,
    type: 'repeat_skill',
    repeatPowerRate: 0.85,
    multiplier: 0.0,
    range: 'self',
    effects: [],
    desc: 'このターン中、直前に発動した味方の通常スキルを85%の効果量でもう一度発動する。'
},

{ id: 'ult',
  name: 'ワンダー・パニッシュ',
  linkCost: 5,
  isUltimate: true,
  hit: 100,
  criticalRate: 0.00,
  criticalDamageRate: 1.5,
  type: 'random_cell_attack',
  multiplier: 4.0,
  randomCellCount: 8,
  range: 'field_all',
  effects: [],
  hitStyle: 'heavy',
  desc: '射程：盤面全体からランダム8マス。命中した敵にATK×4.0のダメージを与える。'
}
    ]},

  // ── id:6 イグニス
  { id: 6, name: 'イグニス', rarity: 'r',
    element: 'chaos',
    role: '火力寄り',
    moveType: 'front_back_frontdiag',
    costMax: 12,
    costStart: 5,
    costRegen: 4,
    shinkiMax: 5,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 600, ATK: 285 },
    img: 'images/chara_06.webp', 
    cutImg: 'images/chara_06_cut.webp', 
    ultImg: 'images/chara_06_cutin.webp',
    upImg: 'images/chara_06_up.webp', 
    battleUpImg: 'images/chara_06_battle_up.webp',
    battleImg: 'images/chara_06_battle.webp',
    battleBackImg: 'images/chara_06_battle_back.webp',
    panelImg: 'images/chara_06_panel.webp',
    favScale: 0.85, favOffsetY: -45,
    resonanceBonusProfile: 'ignis_v1',
    resonanceBonusConfig: {
      2: { skillId: 's1', selfHealAtkRate: 0.20 },
      3: { comboTriggerRange: 'combo_cross_all' },
      4: { comboMultiplier: 0.65 }
    },
    uiScale: {panel: 1.0,battleBack: 1.7,battleUp: 1.0},
        combo: {
      range: 'combo_cross_1',
      skill: { id: 'combo', name: 'ブレイズ・リレー', type: 'attack', multiplier: 0.55, range: 'front_row_3_ally', effects: [], hitStyle: 'heavy', desc: '上下左右1マスの味方スキルに反応し、前方横3マスへ炎の追撃を行う。' }
    },
skills: [
      {
        id: 's1',
        name: 'ブレイブ・スマッシュ',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.50,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 1.4,
        range: 'front_row_3_ally',
        effects: [
          { type: 'atk_up', target: 'ally_self', hit: 100, duration: 1, rate: 1.20 }
        ],
        hitStyle: 'heavy',
        desc: '射程：前方横3マス。対象の敵にATK×1.4のダメージを与える。さらに自身のATKを1ターン20%上昇させる。'
      },

      {
        id: 'ult',
        name: 'イグニッション・ブレイク',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        criticalRate: 0.5,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 2.8,
        range: 'pierce_all',
        effects: [
          { type: 'atk_up', target: 'ally_all', hit: 100, duration: 1, rate: 1.15 }
        ],
        hitStyle: 'heavy',
        desc: '射程：前方直線全マス。対象の敵にATK×2.8の大ダメージを与える。さらに味方全体のATKを1ターン15%上昇させる。'
      }
    ]},

     // ── id:7 ロゼ
  { id: 7, name: 'ロゼ', rarity: 'sr',
    element: 'chaos',
    role: '盤面制圧寄り',
    moveType: 'front_back_row3',
    costMax: 10,
    costStart: 6,
    costRegen: 5,
    shinkiMax: 4,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 680, ATK: 230 },
    img: 'images/chara_07.webp', 
    cutImg: 'images/chara_07_cut.webp', 
    ultImg: 'images/chara_07_cutin.webp',
    upImg: 'images/chara_07_up.webp', 
    battleImg: 'images/chara_07_battle.webp',
    battleUpImg: 'images/chara_07_battle_up.webp',
    battleBackImg: 'images/chara_07_battle_back.webp',
    panelImg: 'images/chara_07_panel.webp',
    favScale: 0.85, favOffsetY: -40,
    resonanceBonusProfile: 'rose_v1',
    uiScale: {panel: 1.0,battleBack: 1.5,battleUp: 1.0},
        combo: {
      range: 'combo_cross_all',
      skill: { id: 'combo', name: 'ローズ・エコー', type: 'debuff', multiplier: 0.40, range: 'combo_line_all', effects: [{ type: 'atk_down', target: 'enemy', hit: 100, duration: 1, rate: 0.90 }], hitStyle: 'sleep', desc: '十字上の味方スキルに反応し、同じ縦列上の敵へ小ダメージとATK10%低下を与える。' }
    },
skills: [
      { id: 's1',
        name: 'ローズ・バインド',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.00,
        criticalDamageRate: 1.5,
        type: 'debuff',
        multiplier: 0.0,
        range: 'fan_2row_3_ally',
        effects: [
          { type: 'stun', target: 'enemy', hit: 75, duration: 1 },
          { type: 'atk_down', target: 'enemy', hit: 100, duration: 1, rate: 0.85 }
        ],
        hitStyle: 'sleep',
        desc: '射程：前方2段×横3マス。対象の敵に75%で1ターンスタンを付与し、1ターンATKを15%低下させる。高確率だが確定ではない、盤面制圧用の通常スキル。' },

      {
        id: 'ult',
        name: 'イグゾースト・ガーデン',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        criticalRate: 0.00,
        criticalDamageRate: 1.5,
        type: 'summon_object',
        multiplier: 0.0,
        range: 'front2',
        summonName: '茨薔薇',
        summonImg: 'images/chara_07_set.webp',
        summonDuration: 2,
        summonDistance: 2,
        summonCount: 3,
        summonOffsets: [
          { dr: 0, dc: -1 },
          { dr: 0, dc:  0 },
          { dr: 0, dc:  1 },
        ],
        summonRange: 'around9',
        summonTickMultiplier: 0.15,
        summonDrainRate: 0,
        summonBlockEnemyProjectiles: true,
        summonBlockEnemyFrontAttack: true,
        summonScale: 1.35,
        effects: [
          { type: 'stun', target: 'enemy', hit: 35, duration: 1 }
        ],
        hitStyle: 'summon_tick',
        desc: '射程：前方2マス先を中心に横3マス。2ターン持続する茨薔薇を3つ設置する。茨薔薇は敵の直線系攻撃を遮り、後ろの味方を守る。毎ターン周囲9マスの敵に小ダメージを与え、35%で1ターンスタンさせる。'}
    ]},

     // ── id:08 ミモザ
  { id: 8, name: 'ミモザ', rarity: 'sr',
    element: 'logos',
    role: '支援寄り',
    moveType: 'front_back_row3',
    costMax: 10,
    costStart: 6,
    costRegen: 5,
    shinkiMax: 4,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 700, ATK: 220 },
    img: 'images/chara_08.webp', 
    cutImg: 'images/chara_08_cut.webp', 
    ultImg: 'images/chara_08_cutin.webp',
    upImg: 'images/chara_08_up.webp', 
    battleImg: 'images/chara_08_battle.webp',
    battleUpImg: 'images/chara_08_battle_up.webp',
    battleBackImg: 'images/chara_08_battle_back.webp',
    panelImg: 'images/chara_08_panel.webp',
    favScale: 0.85, favOffsetY: -45,
    uiScale: {panel: 1.0,battleBack: 1.55,battleUp: 1.0},
    combo: {
      range: 'combo_cross_all',
      skill: { id: 'combo', name: 'ケミカル・シナジー', type: 'buff', multiplier: 0, range: 'ally_all', effects: [{ type: 'atk_up', target: 'ally_all', hit: 100, duration: 1, rate: 1.10 }], hitStyle: 'support', desc: '十字上の味方スキルに反応し、味方全体のATKを1ターン10%上昇させる。' }
    },
    skills: [
      { id: 's1',
        name: 'Overdose',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.10,
        criticalDamageRate: 1.5,
        type: 'buff',
        multiplier: 0.0,
        range: 'ally_all',
        effects: [
          { type: 'atk_up', target: 'ally_all', hit: 100, duration: 1, rate: 1.20 }
        ],
        desc: '射程：味方全体。ダメージなし。味方全体のATKを1ターン20%上昇させる。' },

      { id: 'ult',
        name: 'Toxic Mist',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        criticalRate: 0.10,
        criticalDamageRate: 1.5,
        type: 'debuff',
        multiplier: 0.7,
        range: 'cross_all',
        effects: [
          { type: 'poison', target: 'enemy', hit: 100, duration: 3, rate: 0.50 }
        ],
        hitStyle: 'all',
        desc: '射程：自身中心の十字上すべて。対象の敵にATK×0.7のダメージを与える。さらに3ターンの間、毒による継続ダメージを与える。' }
    ]},


  // ── id:10 フローラ
  { id: 10, name: 'フローラ', rarity: 'r',
    element: 'mystis',
    role: 'ヒーラー',
    moveType: 'front2_backdiag2',
    costMax: 12,
    costStart: 5,
    costRegen: 3,
    shinkiMax: 4,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 650, ATK: 210 },
    img: 'images/chara_10.webp', 
    cutImg: 'images/chara_10_cut.webp', 
    ultImg: 'images/chara_10_cutin.webp',
    upImg: 'images/chara_10_up.webp', 
    battleImg: 'images/chara_10_battle.webp',
    battleUpImg: 'images/chara_10_battle_up.webp',
    battleBackImg: 'images/chara_10_battle_back.webp',
    panelImg: 'images/chara_10_panel.webp',
    favScale: 1.00, favOffsetY: 20,
    uiScale: {panel: 1.0,battleBack: 1.5,battleUp: 1.0},
    combo: {
      range: 'combo_x_1',
      skill: {
        id: 'combo',
        name: 'ひと休みしよ～',
        type: 'heal',
        multiplier: 0,
        range: 'ally_all',
        healRate: 0.08,
        lowHpThreshold: 0.50,
        lowHpHealRate: 0.12,
        effects: [{ type: 'heal', target: 'ally_lowest', hit: 100, rate: 0.08 }],
        hitStyle: 'heal',
        desc: '斜め隣接4マスの味方スキルに反応し、HP割合が最も低い味方1体を最大HPの8%回復する。対象のHPが50%以下なら12%回復する。'
      }
    },
    skills: [
      {
        id: 's1',
        name: 'みんな、休憩しよ～',
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.00,
        criticalDamageRate: 1.5,
        type: 'heal',
        multiplier: 0.0,
        healRate: 0.18,
        lowHpThreshold: 0.50,
        lowHpHealRate: 0.30,
        range: 'ally_all',
        effects: [{ type: 'heal', target: 'ally_all', hit: 100, rate: 0.18 }],
        hitStyle: 'heal_all',
        desc: '味方全体のHPを最大HPの18%回復する。HPが50%以下の味方は最大HPの30%回復する。防御効果を持たない代わりに、低コストで全体を立て直す。'
      },
      {
        id: 'ult',
        name: '今日は本気出すもん',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        criticalRate: 0.00,
        criticalDamageRate: 1.5,
        type: 'heal',
        multiplier: 0.0,
        healRate: 0.42,
        lowHpThreshold: 0.50,
        lowHpHealRate: 0.60,
        range: 'ally_all',
        effects: [{ type: 'heal', target: 'ally_all', hit: 100, rate: 0.42 }],
        hitStyle: 'heal_all',
        desc: '味方全体のHPを最大HPの42%回復する。HPが50%以下の味方は最大HPの60%回復する。ダメージカットは付与せず、純粋な回復量に特化したULT。'
      }
    ]},

  // ── id:11 シグレ
  { id: 11, name: 'シグレ', rarity: 'r',
    element: 'logos',
  role: 'テクニック寄り',
  moveType: 'front_side_3',
    costMax: 10,
    costStart: 5,
    costRegen: 3,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 500, ATK: 200 },
    img: 'images/chara_11.webp', 
    cutImg: 'images/chara_11_cut.webp', 
    ultImg: 'images/chara_11_cutin.webp',
    upImg: 'images/chara_11_up.webp', 
    battleImg: 'images/chara_11_battle.webp',
    battleUpImg: 'images/chara_11_battle_up.webp',
    battleBackImg: 'images/chara_11_battle_back.webp',
    panelImg: 'images/chara_11_panel.webp',
    favScale: 0.95, favOffsetY: 5,
    uiScale: {panel: 1.0,battleBack: 1.5,battleUp: 1.0},
    combo: {
      range: 'combo_cross_1',
      skill: { id: 'combo', name: '紫繰・返し刃', type: 'attack', multiplier: 0.45, range: 'front1', effects: [{ type: 'push_1', target: 'enemy', hit: 50 }], hitStyle: 'normal', desc: '上下左右1マスの味方スキルに反応し、正面1マスの敵へ追撃する。50%の確率で1マス押し出す。' }
    },
    skills: [
      { id: 's1',
        name: '剣術・紫繰',
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.10,
        criticalDamageRate: 1.5,
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
        criticalRate: 0.10,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 1.5,
        range: 'front_row_3_ally',
        effects: [
          { type: 'yoi_no_sousou', target: 'ally_self', hit: 100, duration: 2, counterMultiplier: 1.0 }
        ],
        hitStyle: 'multi',
        desc: '射程：前方横3マス。対象の敵にATK×1.5のダメージを与える。さらに自身に2ターンの間「酔ノ想葬」を付与する。酔ノ想葬：敵から攻撃される時、その攻撃を回避し、攻撃者に隣接する空きマスへ移動してATK×1.0の反撃を行う。' }
    ]},

  // ── id:12 ハヤテ
  { id: 12, name: 'ハヤテ', rarity: 'sr',
    element: 'logos',
    role: '速度寄り',
    moveType: 'king_8',
    costMax: 14,
    costStart: 5,
    costRegen: 4,
    shinkiMax: 5,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 580, ATK: 305 },
    img: 'images/chara_12.webp',
    cutImg: 'images/chara_12_cut.webp',
    ultImg: 'images/chara_12_cutin.webp',
    upImg: 'images/chara_12_up.webp',
    battleImg: 'images/chara_12_battle.webp',
    battleUpImg: 'images/chara_12_battle_up.webp',
    battleBackImg: 'images/chara_12_battle_back.webp',
    panelImg: 'images/chara_12_panel.webp',
    favScale: 0.85, favOffsetY: -70,
    resonanceBonusConfig: {
      2: { skillId: 's1', skillMultiplier: 2.10 },
      3: { comboTriggerRange: 'combo_x_all' },
      4: { hitAndAwayLinkRefund: 1, hitAndAwayLinkRefundPerTurn: 1 }
    },
    uiScale: {panel: 1.0,battleBack: 1.25,battleUp: 1.0},
    combo: {
      range: 'combo_x_1',
      skill: { id: 'combo', name: '閃光追駆', type: 'attack', multiplier: 0.65, range: 'front_row_3_ally', effects: [], hitStyle: 'rapid', desc: '斜め隣接4マスの味方スキルに反応し、前方横3マスの敵へ高速追撃する。' }
    },
    skills: [
      {
        id: 's1',
        name: '閃駆・月穿ち',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.35,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 1.85,
        range: 'front_row_3_ally',
        effects: [],
        hitStyle: 'rapid_multi',
        hitCount: 3,
        desc: '射程：前方横3マス。対象の敵にATK×1.85のダメージを与える。ヒットアンドアウェイモード中は、攻撃判定後に移動前の位置へ戻る。'
      },
      {
        id: 'ult',
        name: '黄月閃界・雷光巡行',
        linkCost: 4,
        isUltimate: true,
        hit: 100,
        type: 'hit_and_away_mode',
        multiplier: 2.4,
        range: 'front3_row_3_ally',
        effects: [],
        criticalRate: 0.40,
        criticalDamageRate: 1.5,
        hitStyle: 'rapid_multi',
        hitCount: 7,
        modeDuration: 3,
        moveRangeBonus: 6,
        desc: '射程：前方3段×横3マス。対象の敵にATK×2.4のダメージを与え、その後3ターンの間ヒットアンドアウェイモードに入る。モード中は8方向へ最大7マス移動でき、通常攻撃またはSKILLの攻撃判定後、移動前の位置へ戻る。帰還ではLINKを消費しない。'
      },
    ]},

  // ── id:9
  { id: 9, name: 'パトラ', rarity: 'r',
    element: 'chaos',
    role: '妨害寄り',
    moveType: 'front_side_3',
    costMax: 14,
    costStart: 5,
    costRegen: 3,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 590, ATK: 275 },
    img: 'images/chara_09.webp', 
    cutImg: 'images/chara_09_cut.webp', 
    ultImg: 'images/chara_09_cutin.webp',
    upImg: 'images/chara_09_up.webp', 
    battleImg: 'images/chara_09_battle.webp',
    battleUpImg: 'images/chara_09_battle_up.webp',
    battleBackImg: 'images/chara_09_battle_back.webp',
    panelImg: 'images/chara_09_panel.webp',
    favScale: 1.0, favOffsetY: 10,
    uiScale: {panel: 1.0,battleBack: 1.5,battleUp: 1.0},
    combo: {
      range: 'combo_cross_1',
      skill: { id: 'combo', name: '服従の余波', type: 'debuff', multiplier: 0.25, range: 'front1', effects: [{ type: 'atk_down', target: 'enemy', hit: 100, duration: 1, rate: 0.95 }], hitStyle: 'normal', desc: '上下左右1マスの味方スキルに反応し、正面1マスの敵へ小ダメージを与え、1ターンATKを5%低下させる。' }
    },
    skills: [
      { id: 's1',
      name: '支配',
      linkCost: 3,
      isUltimate: false,
      hit: 100,
      criticalRate: 0.10,
      criticalDamageRate: 1.5,
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
        criticalRate: 0.10,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 1.6,
        range: 'pierce3',
        effects: [
          { type: 'stun', target: 'enemy', hit: 50, duration: 1 }
        ],
        hitStyle: 'multi',
        desc: '射程：前方直線3マス。対象の敵にATK×1.6のダメージを与え、50%の確率で1ターン行動不能にする。' }
    ]},
  

 

  // ── id:13 ミア
  { id: 13, name: 'ミア', rarity: 'r',
    element: 'mystis',
    role: '遠距離寄り',
    moveType: 'cat_step',
    costMax: 12,
    costStart: 5,
    costRegen: 4,
    shinkiMax: 4,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 540, ATK: 295 },
    img: 'images/chara_13.webp',
    cutImg: 'images/chara_13_cut.webp',
    ultImg: 'images/chara_13_cutin.webp',
    upImg: 'images/chara_13_up.webp',
    battleImg: 'images/chara_13_battle.webp',
    battleUpImg: 'images/chara_13_battle_up.webp',
    battleBackImg: 'images/chara_13_battle_back.webp',
    panelImg: 'images/chara_13_panel.webp',
    favScale: 0.85, favOffsetY: -40,
    uiScale: {panel: 0.60, battleBack: 1.0,battleUp: 0.75},
    combo: {
      range: 'combo_x_1',
      skill: { id: 'combo', name: 'キャット・フォロー', type: 'attack', multiplier: 0.50, range: 'cat_snipe_ally', effects: [{ type: 'drain', target: 'ally_self', rate: 0.20 }], hitStyle: 'rapid', desc: '斜め隣接4マスの味方スキルに反応し、前方遠距離の敵へ小さな追撃を行う。与えたダメージの20%分、自身のHPを回復する。' }
    },
    skills: [
      { id: 's1',
        name: 'キャット・スナイプ',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.20,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 1.75,
        range: 'cat_snipe_ally',
        effects: [
          { type: 'drain', target: 'ally_self', rate: 0.30 }
        ],
        hitStyle: 'rapid',
        desc: '射程：前方3〜5マスの遠距離狙撃。近距離には当たらない。対象の敵にATK×1.75のダメージを与え、与えたダメージの30%分、自身のHPを回復する。' },

      { id: 'ult',
        name: 'ルミニャス・シュート',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        criticalRate: 0.25,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 2.75,
        range: 'cat_luminous_far_ally',
        effects: [
          { type: 'atk_down', target: 'enemy', hit: 100, duration: 1, rate: 0.80 }
        ],
        hitStyle: 'multi',
        desc: '射程：前方3〜5マスの広域遠距離。近距離には当たらない。対象の敵にATK×2.75のダメージを与え、1ターンATKを20%低下させる。' }
    ]},

  // ── id:14 アヤネ
  { id: 14, name: 'アヤネ', rarity: 'r',
    element: 'logos',
    role: 'テクニック寄り',
    moveType: 'front_side_jump',
    costMax: 12,
    costStart: 6,
    costRegen: 4,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 740, ATK: 225 },
    img: 'images/chara_14.webp', 
    cutImg: 'images/chara_14_cut.webp', 
    ultImg: 'images/chara_14_cutin.webp',
    upImg: 'images/chara_14_up.webp', 
    battleImg: 'images/chara_14_battle.webp',
    battleUpImg: 'images/chara_14_battle_up.webp',
    battleBackImg: 'images/chara_14_battle_back.webp',
    panelImg: 'images/chara_14_panel.webp',
    favScale: 0.80, favOffsetY: -50,
    uiScale: {panel: 1.0,battleBack: 1.0,battleUp: 0.70},
    combo: {
      range: 'combo_cross_1',
      skill: { id: 'combo', name: '無音の追い刃', type: 'attack', multiplier: 0.45, range: 'around8', effects: [], hitStyle: 'rapid', desc: '上下左右1マスの味方スキルに反応し、自身の周囲1マスの敵へ小さな追撃を行う。' }
    },
    skills: [
      { id: 's1',
        name: '影打ち',
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.10,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 1.0,
        range: 'around8',
        backstabMultiplier: 2.0,
        effects: [],
        desc: '射程：自身の周囲1マス。対象の敵にATK×1.0のダメージを与える。敵の背後から攻撃した場合、ダメージが2倍になる。' },

      { id: 'ult',
        name: '暴走',
        linkCost: 4,
        isUltimate: true,
        hit: 100,
        criticalRate: 0.10,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 1.8,
        range: 'around24',
        backstabMultiplier: 2.0,
        effects: [],
        hitStyle: 'multi',
        desc: '射程：自身の周囲2マス。対象の敵にATK×1.8のダメージを与える。敵の背後から攻撃した場合、ダメージが2倍になる。' }
    ]},


  // ── id:15 エルテナ
  { id: 15, name: 'エルテナ', rarity: 'r',
    element: 'chaos',
  role: '妨害寄り',
  moveType: 'vertical2_frontdiag2',
    costMax: 12,
    costStart: 7,
    costRegen: 2,
    shinkiMax: 5,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 560, ATK: 290 },
    img: 'images/chara_15.webp', 
    cutImg: 'images/chara_15_cut.webp', 
    ultImg: 'images/chara_15_cutin.webp',
    upImg: 'images/chara_15_up.webp', 
    battleImg: 'images/chara_15_battle.webp',
    battleUpImg: 'images/chara_15_battle_up.webp',
    battleBackImg: 'images/chara_15_battle_back.webp',
    panelImg: 'images/chara_15_panel.webp',
    favScale: 0.90, favOffsetY: -100,
    uiScale: {panel: 1.0,battleBack: 1.52,battleUp: 1.0},
    combo: {
      range: 'combo_x_1',
      skill: { id: 'combo', name: '万象のさざ波', type: 'attack', multiplier: 0.35, range: 'front1', effects: [{ type: 'push_1', target: 'enemy', hit: 50 }], hitStyle: 'normal', desc: '斜め隣接4マスの味方スキルに反応し、正面1マスの敵へ小ダメージを与える。50%の確率で1マス押し出す。' }
    },
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

  // ── id:16 ミト
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
    stats: { HP: 700, ATK: 245 },
    img: 'images/chara_16.webp', 
    cutImg: 'images/chara_16_cut.webp', 
    ultImg: 'images/chara_16_cutin.webp',
    upImg: 'images/chara_16_up.webp', 
    battleImg: 'images/chara_16_battle.webp',
    battleUpImg: 'images/chara_16_battle_up.webp',
    battleBackImg: 'images/chara_16_battle_back.webp',
    panelImg: 'images/chara_16_panel.webp',
    favScale: 0.90, favOffsetY: -40,
    uiScale: {panel: 1.0,battleBack: 1.5,battleUp: 1.0},
    combo: {
      range: 'combo_cross_1',
      skill: { id: 'combo', name: 'シロのお手伝い', type: 'debuff', multiplier: 0.30, range: 'around8', effects: [{ type: 'jittai', target: 'enemy', hit: 40, duration: 1 }], hitStyle: 'normal', desc: '上下左右1マスの味方スキルに反応し、周囲1マスの敵へ小ダメージを与える。40%の確率で1ターン実体化させる。' }
    },
    skills: [
      { id: 's1',
        name: 'シロと一緒',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.10,
        criticalDamageRate: 1.5,
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
        criticalRate: 0.10,
        criticalDamageRate: 1.5,
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

 
  // ── id:17 アンジェ
  { id: 17, name: 'アンジェ', rarity: 'r',
    element: 'logos',
    role: 'ヒーラー',
    moveType: 'silver',
    costMax: 14,
    costStart: 5,
    costRegen: 3,
    shinkiMax: 5,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 720, ATK: 190 },
    img: 'images/chara_17.webp', 
    cutImg: 'images/chara_17_cut.webp', 
    ultImg: 'images/chara_17_cutin.webp',
    upImg: 'images/chara_17_up.webp', 
    battleImg: 'images/chara_17_battle.webp',
    battleUpImg: 'images/chara_17_battle_up.webp',
    battleBackImg: 'images/chara_17_battle_back.webp',
    panelImg: 'images/chara_17_panel.webp',
    favScale: 0.95, favOffsetY: 15,
    uiScale: {panel: 1.0,battleBack: 1.55,battleUp: 0.80},
    combo: {
      range: 'combo_line_2',
      skill: { id: 'combo', name: '聖雫の余韻', type: 'heal', multiplier: 0, range: 'self', healRate: 0.08, effects: [], hitStyle: 'heal', desc: '同じ縦列の前後2マス以内にいる味方のスキルに反応し、自身のHPを最大HPの8%回復する。' }
    },
    skills: [
      { id: 's1',
        name: 'セイクリッド・ミスト',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.00,
        criticalDamageRate: 1.5,
        type: 'heal',
        multiplier: 0.0,
        healRate: 0.35,
        range: 'ally_all',
        effects: [
          { type: 'heal', target: 'ally_lowest', hit: 100, rate: 0.35 },
          { type: 'damage_cut', target: 'ally', hit: 100, duration: 1, rate: 0.35 }
        ],
        hitStyle: 'heal',
        desc: 'HP割合が最も低い味方1体を最大HPの35%回復し、1ターン被ダメージを35%カットする。高火力敵の集中攻撃を受けた味方を立て直す。'
      },
      {
        id: 'ult',
        name: 'レイン・オブ・サンクチュアリ',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        criticalRate: 0.00,
        criticalDamageRate: 1.5,
        type: 'heal',
        multiplier: 0.0,
        healRate: 0.28,
        range: 'ally_all',
        effects: [
          { type: 'heal', target: 'ally_all', hit: 100, rate: 0.28 },
          { type: 'damage_cut', target: 'ally_all', hit: 100, duration: 1, rate: 0.50 }
        ],
        hitStyle: 'heal_all',
        desc: '味方全体のHPを最大HPの28%回復し、1ターン被ダメージを50%カットする。高火力ステージの敵フェーズを受け切るための防御型ULT。'
      }
    ]}
,
  // ── id:50 テストちゃん（DAILY RAIDクリア報酬）
  { id: 50, name: 'テストちゃん', rarity: 'sr',
    element: 'logos',
    role: '高火力レーザー',
    moveType: 'cross_1',
    costMax: 14,
    costStart: 5,
    costRegen: 3,
    shinkiMax: 5,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 620, ATK: 285 },
    img: 'images/chara_50.webp',
    cutImg: 'images/chara_50_cut.webp',
    ultImg: 'images/chara_50_cutin.webp',
    upImg: 'images/chara_50.webp',
    battleImg: 'images/chara_50.webp',
    battleUpImg: 'images/chara_50.webp',
    battleBackImg: 'images/chara_50_battle_back.webp',
    panelImg: 'images/chara_50_panel.webp',
    favScale: 0.90, favOffsetY: -20,
    uiScale: {panel: 1.0,battleBack: 1.25,battleUp: 1.0},
    combo: {
      range: 'combo_line_all',
      skill: {
        id: 'combo', name: 'グリーン・トレース', type: 'attack',
        multiplier: 0.75, range: 'front3', effects: [], hitStyle: 'normal',
        desc: '同列の味方スキルに反応し、前方へ追撃する。'
      }
    },
    skills: [
      {
        id: 's1',
        name: 'トライ・レーザー',
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        criticalRate: 0.10,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 1.6,
        range: 'front3',
        effects: [],
        hitStyle: 'multi',
        desc: '前方へ3WAYレーザーを照射し、対象へATK×1.6のダメージを与える。'
      },
      {
        id: 'ult',
        name: 'ブラックシップ',
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        criticalRate: 0.10,
        criticalDamageRate: 1.5,
        type: 'attack',
        multiplier: 4.5,
        range: 'front_all',
        effects: [],
        hitStyle: 'multi',
        desc: '正面へ極太レーザーを照射する高威力ULT。追加効果は持たない。'
      }
    ]
  }

  ];
function getCharaById(id) {
  return CHARACTERS.find(c => c.id === id) || null;
}
