
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
//         'sure_hit_self' | 'sure_hit_team' | 'heal'
//         'pull_1' | 'pull_2' | 'push_1' | 'push_2'
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

  // ── id:1 ギョウタツ（バランス）────────────────────────────────
  // 安定した攻撃と自己防御。縛り＋実体化の両方を持つ万能型。
  { id: 1, name: 'ギョウタツ', gender: 'man', rarity: 'r',
    role: 'バランス',
    moveType: 'gold',
    costMax: 12,
    costStart: 5,
    costRegen: 4,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: 
    { 
      HP: 780, 
      ATK: 230},
    img: 'images/chara_01.webp', 
    cutImg: 'images/chara_01_cut.webp', 
    ultImg: 'images/chara_01_cutin.webp',
    upImg: 'images/chara_01_up.webp', 
    battleImg: 'images/chara_01_battle.webp',
    battleBackImg: 'images/chara_01_battle_back.webp',
    favScale: 0.85, favOffsetY: -35,
    skills: [
      { id: 's1',
        name: '正拳',
        cost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 2.0,
        range: 'front1',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [1, 3],
          damageRate: 1.4
        },
        desc: '確実に命中する基本攻撃。' },

      { id: 's2',
        name: '縛拳',
        cost: 4,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 3.0,
        range: 'front1',
        effects: [
          { 
            type: 'atk_down', 
            target: 'enemy', 
            hit: 70, 
            duration: 2 
          },
          { 
            type: 'stun', 
            target: 'enemy', 
            hit: 70, 
            duration: 1 
          }
        ],
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.3
        },
        desc: '打撃に縛りの力を込め、怪異のATKを下げる。' },

      { id: 's3',
        name: '精神統一',
        cost: 4,
        isUltimate: false,
        hit: 100,
        type: 'buff',
        multiplier: 0.0,
        range: 'self',
        effects: [
        ],
        moveBonus: {
          idealMoves: [0],
          damageRate: 1.0
        },
        desc: '精神を統一し、自身のATKを2ターン上昇させる。' },

      { id: 'ult',
        name: '精神統一',
        cost: 10,
        isUltimate: true,
        hit: 100,
        type: 'move',
        multiplier: 0.0,
        range: 'self',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [1],
          damageRate: 1.0
        },
        desc: 'ポジションを変更する。' },
    ]},

  // ── id:2 シグレ（速度寄り）──────────────────────────────────
  // スタン・ATKデバフで敵を妨害する妨害役。
  { id: 2, name: 'シグレ', gender: 'woman', rarity: 'r',
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
    battleImg: 'images/chara_02_battle.webp',
    battleBackImg: 'images/chara_02_battle_back.webp',
    panelImg: 'images/chara_02_panel.webp',
    favScale: 0.85, favOffsetY: -25,
    skills: [
      { id: 's1',
        name: '神巫',
        cost: 3,
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 2.0,
        range: 'front1',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [1],
          damageRate: 1.3
        },
        desc: '素早い太刀で目の前の1マスを攻撃する。' },

      {
  id: 'ult',
  name: '時雨',
  cost: 10,
  linkCost: 4,
  isUltimate: true,
  hit: 100,
  type: 'attack',
  multiplier: 3.0,
  range: 'cross_tail_6',
  pierce: false,
  effects: [],
  hitStyle: 'multi',
  moveBonus: {
    idealMoves: [1],
    damageRate: 1.5
  },
  desc: '上2マス、左右、斜め下左右を攻撃する。'
}
    ]},

  // ── id:3 マツバラ（耐久寄り）──────────────────────────────────
  // 敵を縛り、ペースを握る。
  { id: 3, name: 'マツバラ', gender: 'man', rarity: 'r',
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
    favScale: 1.0, favOffsetY: 10,
    skills: [
      { id: 's1',
        name: '盾撃',
        cost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.0,
        range: 'front1',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [1],
          damageRate: 1.3
        },
        desc: '盾で怪異を殴りつける。威力は低いが確実に命中する。' },

      { id: 's2',
        name: '実体化',
        cost: 3,
        isUltimate: false,
        hit: 100,
        type: 'debuff',
        multiplier: 1.0,
        range: 'all',
        effects: [
          { 
            type: 'jittai', 
            target: 'enemy', 
            hit: 100, 
            duration: 2 
          }
        ],
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.2
        },
        desc: '怪異を現実に縛り付け「実体化」を2ターン付与する。敵の位置と次の攻撃範囲が見えるようになる。' },

      { id: 's3',
        name: '鉄壁',
        cost: 3,
        isUltimate: false,
        hit: 100,
        type: 'buff',
        multiplier: 0.0,
        range: 'self',
        effects: [
        ],
        moveBonus: {
          idealMoves: [0],
          damageRate: 1.0
        },
        desc: '防御態勢をとり、次の被ダメージを軽減する（シールド付与）。' },

      { id: 'ult',
        name: '前進',
        cost: 10,
        isUltimate: true,
        hit: 100,
        type: 'move',
        multiplier: 0.0,
        range: 'self',
        effects: [],
        moveBonus: {
          idealMoves: [1],
          damageRate: 1.0
        },
        desc: 'ポジションを変更する。' }
    ]},

  // ── id:7 ミユ
{ id: 7, name: 'ミユ', gender: 'woman', rarity: 'r',
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
        name: '貫通弾',
        cost: 4,
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.2,
        range: 'pierce3',
        pierce: true,
        effects: [],
        hitStyle: 'multi',
        moveBonus: {
          idealMoves: [1,2,3,5,],
          damageRate: 1.5
        },
        desc: '直線上3マス以内の敵にダメージ' },

      { id: 'ult',
        name: '鉛の雨',
        cost: 10,
        linkCost: 4,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 2.0,
        range: 'around24',
        effects: [
        ],
        hitStyle: 'rapid',
        moveBonus: {
          idealMoves: [7],
          damageRate: 1.5
        },
        desc: '自分を中心に周囲2マス以内の敵に中ダメージ' }
    ]},

    // ── id:10 フミカ（速度寄り）──────────────────────────────────
  // 必中バフと実体化を組み合わせ、敵情報を暴くサポーター。
  { id: 10, name: 'フミカ', gender: 'woman', rarity: 'r',
    role: '速度寄り',
    costMax: 10,
    costStart: 5,
    costRegen: 2,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 760, ATK: 250 },
    img: 'images/chara_10.webp', 
    cutImg: 'images/chara_10_cut.webp', 
    ultImg: 'images/chara_10_cutin.webp',
    upImg: 'images/chara_10_up.webp', 
    battleImg: 'images/chara_10_battle.webp',
    battleBackImg: 'images/chara_10_battle_back.webp',
    panelImg: 'images/chara_10_panel.webp',
    favScale: 0.75, favOffsetY: -80,
    skills: [
      { id: 's1',
        name: '白日',
        cost: 3,
        isUltimate: false,
        hit: 90,
        type: 'attack',
        multiplier: 1.5,
        range: 'all',
        effects: [
          { 
            type: 'jittai', 
            target: 'enemy', 
            hit: 90, 
            duration: 2 
          }
        ],
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.3
        },
        desc: '素早く怪異を実体化させる。成功率が高い。' },

      { id: 's2',
        name: '慈愛',
        cost: 6,
        isUltimate: false,
        hit: 100,
        type: 'debuff',
        multiplier: 0.0,
        range: 'all',
        effects: [,
          { 
            type: 'atk_down', 
            target: 'enemy', 
            hit: 75, 
            duration: 2 
          },
          { 
            type: 'jittai', 
            target: 'enemy', 
            hit: 90, 
            duration: 2 
          }
        ],
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.2
        },
        desc: '深い愛情で怪異を2ターン実体化し、ATKを2ターン低下させる。' },

      { id: 's3',
        name: '寵愛',
        cost: 3,
        isUltimate: false,
        hit: 90,
        type: 'debuff',
        multiplier: 0.0,
        range: 'all',
        effects: [
          {
             type: 'jittai', 
             target: 'enemy', 
             hit: 90, 
             duration: 2 
            }
        ],
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.2
        },
        desc: '素早く怪異を実体化させる。成功率が高い。' },

      { id: 'ult',
        name: '風',
        cost: 10,
        isUltimate: true,
        hit: 100,
        type: 'move',
        multiplier: 2.0,
        range: 'all',
        effects: [
          { 
            type: 'jittai', 
            target: 'enemy', 
            hit: 90, 
            duration: 2 
          },
          { 
            type: 'push_2', 
            target: 'enemy', 
            hit: 100, 
            duration: 1 
          }
        ],
        moveBonus: {
          idealMoves: [1,2,3,4],
          damageRate: 1.0
        },
        desc: '怪異を実体化し、全員を最後列に押し出す。' }
    ]},

  // ── id:12 エリ
{ id: 12, name: 'エリ', gender: 'woman', rarity: 'r',
  role: '速度寄り',
  moveType: 'eri',
    costMax: 14,
    costStart: 5,
    costRegen: 2,
    shinkiMax: 4,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 820, ATK: 200 },
    img: 'images/chara_12.webp', 
    cutImg: 'images/chara_12_cut.webp', 
    ultImg: 'images/chara_12_cutin.webp',
    upImg: 'images/chara_12_up.webp', 
    battleImg: 'images/chara_12_battle.webp',
    battleBackImg: 'images/chara_12_battle_back.webp',
    panelImg: 'images/chara_12_panel.webp',
    favScale: 0.85, favOffsetY: -10,    
    skills: [
      { id: 's1',
        name: '閃',
        cost: 3,
        linkCost: 2,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.2,
        range: 'side_lr',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [1],
          damageRate: 1.3
        },
        desc: '自身の左右1マス以内の敵にダメージ' },

      { id: 'ult',
        name: '終',
        cost: 10,
        linkCost: 4,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 3.0,
        range: 'diag_x_2',
        effects: [],
        moveBonus: {
          idealMoves: [1],
          damageRate: 1.3
        },
        desc: '自身を中心に斜め2マス以内の敵に大ダメージ' }
    ]},

  // ── id:13 チサカ（バランス）──────────────────────────────────
  // 実体化と必中を組み合わせる。実体化後に味方の必中を確保する支援型。
  { id: 13, name: 'チサカ', gender: 'woman', rarity: 'r',
    role: 'バランス',
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
        name: '霊打',
        cost: 3,
        isUltimate: false,
        hit: 90,
        type: 'attack',
        multiplier: 1.0,
        range: 'front1',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [1],
          damageRate: 1.3
        },
        desc: '霊力を込めた打撃で怪異を攻撃する。' },

      { id: 's2',
        name: '霊縛',
        cost: 3,
        isUltimate: false,
        hit: 100,
        type: 'debuff',
        multiplier: 0.0,
        range: 'front1',
        effects: [
        ],
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.2
        },
        desc: '霊力で怪異を縛り、ATKを2ターン低下させる。' },

      { id: 's3',
        name: '霊実',
        cost: 3,
        isUltimate: false,
        hit: 85,
        type: 'debuff',
        multiplier: 0.0,
        range: 'front1',
        effects: [
          { 
            type: 'jittai', 
            target: 'enemy', 
            hit: 85, 
            duration: 2 
          }
        ],
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.2
        },
        desc: '霊力で怪異を実体化させる。敵の位置と次の攻撃が見える。' },

      { id: 'ult',
        name: '霊歩',
        cost: 10,
        isUltimate: true,
        hit: 100,
        type: 'move',
        multiplier: 0.0,
        range: 'self',
        effects: [],
        moveBonus: {
          idealMoves: [1],
          damageRate: 1.0
        },
        desc: '霊力を使って素早く移動する。' }
    ]},

  // ── id:11 カンナ（火力寄り）──────────────────────────────────
  // 最高クラスの火力。高倍率攻撃を叩き込む超アタッカー。
  { id: 11, name: 'カンナ', gender: 'woman', rarity: 'r',
    role: '火力寄り',
    costMax: 14,
    costStart: 3,
    costRegen: 4,
    shinkiMax: 6,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 200, ATK: 350 },
    img: 'images/chara_11.webp', 
    cutImg: 'images/chara_11_cut.webp', 
    ultImg: 'images/chara_11_cutin.webp',
    upImg: 'images/chara_11_up.webp', 
    battleImg: 'images/chara_11_battle.webp',
    battleBackImg: 'images/chara_11_battle_back.webp',
    panelImg: 'images/chara_11_panel.webp',
    favScale: 0.85, favOffsetY: -15,
    skills: [
      { id: 's1',
        name: '解放します',
        cost: 3,
        isUltimate: false,
        hit: 80,
        type: 'attack',
        multiplier: 2.0,
        range: 'front_row_3',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.3
        },
        desc: '神通力を解放した一撃。ATKの2倍のダメージ。' },

      { id: 'ult',
        name: '壊します！',
        cost: 10,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 5.0,
        range: 'front1',
        effects: [
        ],
        moveBonus: {
          idealMoves: [2,3],
          damageRate: 1.3
        },
        desc: '敵を実体化する。' }
    ]},


  // ══════════════════════════════════════════════════════════════
  // SR
  // ══════════════════════════════════════════════════════════════

  // ── id:4 ユズハ（ギャル寄り）───────────────────────────────────
  // 予知系。数ターン先に攻撃を予約する感じ。
  { id: 4, name: 'ユズハ', gender: 'man', rarity: 'sr',
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
        name: '堕ちろっ♡',
        cost: 3,
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.5,
        range: 'diag_x_1',
        pierce: false,
        effects: [],
        hitStyle: 'rapid',
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.3
        },
        desc: '自身の直線上3マス先まで非貫弾を打ち込む。' },

      { id: 'ult',
        name: '圧倒的神頼みっ♡',
        cost: 10,
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        type: 'delayed_attack',
        multiplier: 3.0,
        range: 'field_cross_center',
        pierce: true,
        effects: [],
        hitStyle: 'multi',
        delayTurns: 2,
        delayedTrigger: 'allyTurnStart',
        moveBonus: {
          idealMoves: [1],
          damageRate: 1.5
        },
        desc: '使用した2ターン後のターン開始時に固定マスに大ダメージ。' }
    ]},

  // ── id:5 ナガラ（火力寄り）───────────────────────────────────
  // 爆発系の超高火力。遠距離攻撃＋押し出しで敵ポジションも操作する。
  { id: 5, name: 'ナガラ', gender: 'man', rarity: 'sr',
    role: '火力寄り',
    costMax: 14,
    costStart: 3,
    costRegen: 2,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 800, ATK: 305 },
    img: 'images/chara_05.webp', 
    cutImg: 'images/chara_05_cut.webp', 
    ultImg: 'images/chara_05_cutin.webp',
    upImg: 'images/chara_05_up.webp', 
    battleImg: 'images/chara_05_battle.webp',
    battleBackImg: 'images/chara_05_battle_back.webp',
    panelImg: 'images/chara_05_panel.webp',
    favScale: 1.0, favOffsetY: 10,
    skills: [
      { id: 's1',
        name: '爆砕',
        cost: 2,
        isUltimate: false,
        hit: 85,
        type: 'attack',
        multiplier: 2.0,
        range: 'front3',
        effects: [],
        moveBonus: {
          idealMoves: [1, 3],
          damageRate: 1.3
        },
        desc: '直線上の3マス先のマスを爆破。中ダメージ。' },

      { id: 's2',
        name: '縛爆',
        cost: 3,
        isUltimate: false,
        hit: 100,
        type: 'debuff',
        multiplier:2.0,
        range: 'cross',
        effects: [
        ],
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.2
        },
        desc: '直線上の3マス先を爆破。中ダメージ。' },

      { id: 's3',
        name: '閃光弾',
        cost: 5,
        isUltimate: false,
        hit: 85,
        type: 'attack',
        multiplier: 3.0,
        range: 'pierce3',
        effects: [
          { 
            type: 'jittai', 
            target: 'enemy', 
            hit: 80, 
            duration: 2 }
        ],
        moveBonus: {
          idealMoves: [2, 4],
          damageRate: 1.3
        },
        desc: '直線上全てのマスを爆破する。大ダメージを与え、被弾した敵を実体化する。' },

      { id: 'ult',
        name: '爆了',
        cost: 10,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 4.0,
        range: 'front3_row_3',
        pierce: false,
        effects: [
          { 
            type: 'pull_2', 
            target: 'enemy', 
            hit: 100, 
            duration: 1 
          }
        ],
        moveBonus: {
          idealMoves: [0],
          damageRate: 1.5
        },
        desc: '最後列の敵に特大ダメージを与え、最前列に寄せ付ける。' }
    ]},

// ── id:15 アキ
{ id: 15, name: 'アキ', gender: 'woman', rarity: 'sr',
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
        name: '邪魔よ',
        cost: 3,
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.5,
        range: 'pierce3',
        effects: [
          {
             type: 'pull_2', 
             target: 'enemy', 
             hit: 100, 
             duration: 1 
            }
        ],
        moveBonus: {
          idealMoves: [2,5,6,7],
          damageRate: 1.3
        },
        desc: 'ATKの1.0倍のダメージ。敵を2マス前へ引き寄せる' },

      { id: 'ult',
        name: '跪きなさい',
        cost: 10,
        linkCost: 5,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 3.0,
        range: 'front_9',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [9],
          damageRate: 1.0
        },
        desc: '全てのマスの敵を最前列に寄せ付けてスタンさせる。' }
    ]},

  // ── id:17 ベン（バランス）────────────────────────────────────
  // 独自の特殊スキル持ち。全体攻撃と強力なATKバフが強みのゼネラリスト。
  { id: 17, name: 'ベン', gender: 'man', rarity: 'sr',
    role: 'バランス',
    costMax: 12,
    costStart: 6,
    costRegen: 4,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 800, ATK: 255 },
    img: 'images/chara_17.webp', 
    cutImg: 'images/chara_17_cut.webp', 
    ultImg: 'images/chara_17_cutin.webp',
    upImg: 'images/chara_17_up.webp', 
    battleImg: 'images/chara_17_battle.webp',
    battleBackImg: 'images/chara_17_battle_back.webp',
    panelImg: 'images/chara_17_panel.webp',
    favScale: 0.95, favOffsetY: 10,
    skills: [
      { id: 's1',
        name: '身元調査',
        cost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.0,
        range: 'all',
        effects: [
          { 
            type: 'jittai', 
            target: 'enemy', 
            hit: 85, 
            duration: 2 
          }
        ],
        moveBonus: {
          idealMoves: [1,3,5],
          damageRate: 1.3
        },
        desc: '怪異の正体を調査する。実体化する。' },

      { id: 's2',
        name: '虚飾看破',
        cost: 3,
        isUltimate: false,
        hit: 50,
        type: 'attack',
        multiplier: 2.0,
        range: 'all',
        effects: [
          {
             type: 'jittai', 
             target: 'enemy', 
             hit: 85, 
             duration: 2 
            }
        ],
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.3
        },
        desc: '真実を見抜いた一撃。ATKの2倍のダメージ＋実体化付与。' },

      { id: 's3',
        name: '鮮やかな推断',
        cost: 3,
        isUltimate: false,
        hit: 100,
        type: 'buff',
        multiplier: 0.0,
        range: 'self',
        effects: [,
          { 
            type: 'atk_up', 
            target: 'ally_self', 
            hit: 100, 
            duration: 2 
          }
        ],
        moveBonus: {
          idealMoves: [0],
          damageRate: 1.0
        },
        desc: '鮮やかな推断により、ATKを2ターン上昇させる。' },

      { id: 'ult',
        name: '華麗なる転換',
        cost: 10,
        isUltimate: true,
        hit: 100,
        type: 'move',
        multiplier: 1.5,
        range: 'all',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [1],
          damageRate: 1.0
        },
        desc: 'ポジションを任意に変更する。' }
    ]},

  // ── id:18 ナシロ（コントロール寄り）──────────────────────────────────
  // 敵の位置コントロールで盤面を整える。
  { id: 18, name: 'ナシロ', gender: 'woman', rarity: 'sr',
    role: '火力寄り',
    costMax: 14,
    costStart: 6,
    costRegen: 4,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 760, ATK: 300 },
    img: 'images/chara_18.webp', 
    cutImg: 'images/chara_18_cut.webp', 
    ultImg: 'images/chara_18_cutin.webp',
    upImg: 'images/chara_18_up.webp', 
    battleImg: 'images/chara_18_battle.webp',
    battleBackImg: 'images/chara_18_battle_back.webp',
    panelImg: 'images/chara_18_panel.webp',
    skills: [
      { id: 's1',
        name: '催眠',
        cost: 3,
        isUltimate: false,
        hit: 85,
        type: 'attack',
        multiplier: 3.0,
        range: 'front1',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [1, 3],
          damageRate: 1.4
        },
        desc: '業火を纏った強烈な一撃。ATKの3倍のダメージ。' },

      { id: 's2',
        name: '虚飾',
        cost: 3,
        isUltimate: false,
        hit: 100,
        type: 'debuff',
        multiplier: 0.0,
        range: 'front_row_3',
        effects: [
        ],
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.2
        },
        desc: '炎で怪異のATKを2ターン低下させる。' },

      { id: 's3',
        name: '神通',
        cost: 3,
        isUltimate: false,
        hit: 60,
        type: 'attack',
        multiplier: 9.0,
        range: 'front1',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [2, 4],
          damageRate: 1.5
        },
        desc: '爆発的な炎を解放する。ATKの9倍の超火力。命中率は非常に低い。' },

      { id: 'ult',
        name: '炎走',
        cost: 10,
        isUltimate: true,
        hit: 80,
        type: 'attack',
        multiplier: 2.0,
        range: 'self',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [1, 3],
          damageRate: 1.4
        },
        desc: '炎を纏いながら移動して攻撃する。ATKの2倍のダメージ。' }
    ]},

  // ── id:19 カンナ（耐久寄り）──────────────────────────────────
  // 高HPと全体デバフが強力。実体化＋ATKダウンで攻防両立の壁。
  { id: 19, name: 'カンナ', gender: 'woman', rarity: 'sr',
    role: '耐久寄り',
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
        name: '麻酔薬',
        cost: 3,
        linkCost: 4,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 0.8,
        range: 'front2',
        pierce: false,
        effects: [
          { type: 'stun', target: 'enemy', duration: 1, hit: 100 }
        ],
        moveBonus: {
          idealMoves: [0, 2, 4, 6],
          damageRate: 1.0
        },
        desc: '前方の敵に麻酔針を撃ち込み、1ターン行動不能にする。'
      },
      {
        id: 'ult',
        name: '神体実験',
        cost: 0,
        linkCost: 6,
        isUltimate: true,
        hit: 100,
        type: 'debuff',
        multiplier: 1.5,
        range: 'enemy_all',
        pierce: false,
        effects: [
          { type: 'stun',     target: 'enemy', duration: 1, hit: 100 },
          { type: 'atk_down', target: 'enemy', duration: 2, hit: 100 }
        ],
        moveBonus: {
          idealMoves: [0],
          damageRate: 1.0
        },
        desc: '敵全体に麻酔領域を展開し、スタンとATK低下を付与する。'
      }
    ]},

  // ── id:20 ミズキ（速度寄り）──────────────────────────────────
  // 強制移動でポジションを支配する。
  { id: 20, name: 'ミズキ', gender: 'man', rarity: 'sr',
    role: '速度寄り',
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
        name: '蛇ノ前',
        cost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.0,
        range: 'all',
        effects: [
          { 
            type: 'pull_1', 
            target: 'enemy', 
            hit: 100, 
            duration: 1 
          }
        ],
        moveBonus: {
          idealMoves: [3,6],
          damageRate: 1.3
        },
        desc: 'ATKの1.0倍のダメージ。敵を1マス前へ引き寄せる' },

      { id: 's2',
        name: '蛇ノ後',
        cost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.0,
        range: 'all',
        effects: [
          { type: 'push_1', target: 'enemy', hit: 100, duration: 1 }
        ],
        moveBonus: {
          idealMoves: [3,6],
          damageRate: 1.3
        },
        desc: 'ATKの1.0倍のダメージ。敵を1マス奥へ押し出す。' },

      { id: 's3',
        name: '蛇ノ右',
        cost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 1.0,
        range: 'all',
        effects: [
          { type: 'shift_right_1', target: 'enemy', hit: 100, duration: 1 }
        ],
        moveBonus: {
          idealMoves: [3,6],
          damageRate: 1.3
        },
        desc: 'ATKの1.0倍のダメージ。敵を1マス右へ動かす。' },

      { id: 'ult',
        name: '蛇ノ眼',
        cost: 10,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 0.7,
        range: 'all',
        pierce: false,
        effects: [
          { type: 'jittai', target: 'enemy', hit: 80, duration: 3 }
        ],
        moveBonus: {
          idealMoves: [3,6],
          damageRate: 1.3
        },
        desc: '蛇ノ眼で怪異を実体化する' }
    ]},


  // ══════════════════════════════════════════════════════════════
  // UR
  // ══════════════════════════════════════════════════════════════

  // ── id:6 エミ（速度・撹乱寄り）──────────────────────────────
  // 全体必中バフと左右の強制移動で敵ポジションを徹底支配する。
  { id: 6, name: 'エミ', gender: 'woman', rarity: 'ur',
    role: '速度・撹乱寄り',
    costMax: 10,
    costStart: 6,
    costRegen: 5,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 840, ATK: 270 },
    img: 'images/chara_06.webp', 
    cutImg: 'images/chara_06_cut.webp', 
    ultImg: 'images/chara_06_cutin.webp',
    upImg: 'images/chara_06_up.webp', 
    battleImg: 'images/chara_06_battle.webp',
    battleBackImg: 'images/chara_06_battle_back.webp',
    panelImg: 'images/chara_06_panel.webp',
    favScale: 0.95, favOffsetY: 10,
    skills: [
      { id: 's1',
        name: '蝉時雨',
        cost: 3,
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 2.0,
        range: 'front1',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [1, 3],
          damageRate: 1.4
        },
        desc: '幻影を使った素早い攻撃。ATKの2倍のダメージ。' },

      { id: 'ult',
        name: '夢幻',
        cost: 10,
        linkCost: 4,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 3.0,
        range: 'all',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.3
        },
        desc: '幻影を残しながら移動して攻撃する。ATKの3倍のダメージ。' }
    ]},

  // ── id:9 ルナ＆マーヤ（バランス・複合）──────────────────────
  // 全方位の高成功率デバフ。実体化＋スタンで1ターン完全拘束できる。
  { id: 9, name: 'ルナ＆マーヤ', gender: 'woman', rarity: 'ur',
    role: 'バランス・複合',
    costMax: 12,
    costStart: 6,
    costRegen: 4,
    shinkiMax: 3,
    shinkiStart: 0,
    shinkiRegen: 1,
    stats: { HP: 900, ATK: 295 },
    img: 'images/chara_09.webp', 
    cutImg: 'images/chara_09_cut.webp', 
    ultImg: 'images/chara_09_cutin.webp',
    upImg: 'images/chara_09_up.webp', 
    battleImg: 'images/chara_09_battle.webp',
    battleBackImg: 'images/chara_09_battle_back.webp',
    panelImg: 'images/chara_09_panel.webp',
    favScale: 0.85, favOffsetY: -15,
    skills: [
  { id: 's1',
    name: 'Twin Star',
    cost: 3,
    isUltimate: false,
    hit: 100,
    type: 'attack',
    multiplier: 1.7,
    range: 'twin_cross_4',
    pierce: false,
    effects: [],
    moveBonus: {
      idealMoves: [2],
      damageRate: 1.3
    },
    desc: '二人が左右に分かれ、互い違いの軌道で敵を同時に攻撃する。'
  },

  { id: 'ult',
    name: 'Twin Star改',
    cost: 10,
    isUltimate: true,
    hit: 100,
    type: 'attack',
    multiplier: 2.2,
    range: 'twin_star_8',
    pierce: false,
    effects: [],
    moveBonus: {
      idealMoves: [2, 4],
      damageRate: 1.5
    },
    desc: '二人が星を描くように交差し、左右の広範囲を同時に薙ぎ払う。'
  }
]
  },

  // ── id:14 アイム（火力寄り）──────────────────────────────────
  // コピー系。
  { id: 14, name: 'アイム', gender: 'man', rarity: 'ur',
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
    cost: 3,
    linkCost: 2,
    isUltimate: false,
    hit: 100,
    type: 'repeat_skill',
    multiplier: 0.0,
    range: 'self',
    pierce: false,
    effects: [],
    moveBonus: {
    idealMoves: [1,5],
    damageRate: 1.0
  },
    desc: 'このターン中、直前に発動した味方の通常スキルをもう一度発動する。'
},

{ id: 'ult',
  name: 'ジャグラー',
  cost: 10,
  linkCost: 5,
  isUltimate: true,
  hit: 100,
  type: 'random_cell_attack',
  multiplier: 7.0,
  randomCellCount: 7,
  range: 'field_all',
  effects: [],
  hitStyle: 'heavy',
  moveBonus: {
    idealMoves: [2, 4],
    damageRate: 1.0
  },
  desc: '盤面上のランダムな7マスを攻撃する。当たった敵にATKの7倍ダメージ。'
}
    ]},


  // ── id:16 ミト（耐久寄り）──────────────────────────────────
  // 高HP。実体化の確実付与と全体攻撃のハイブリッド。スタンも持つ完全体壁役。
  { id: 16, name: 'ミト', gender: 'woman', rarity: 'ur',
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
        cost: 2,
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 0.7,
        range: 'around8',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 80, duration: 2 }
        ],
        moveBonus: {
          idealMoves: [2],
          damageRate: 1.0
        },
        desc: '攻撃しながら怪異を実体化させる。ATKの0.7倍のダメージ。' },

      { id: 'ult',
        name: 'ご飯の時間',
        cost: 10,
        linkCost: 4,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 3.,
        range: 'pierce_all',
        pierce: true,
        effects: [
        { 
          type: 'drain', 
          target: 'ally_all', 
          rate: 0.5 
        }
        ],
        hitStyle: 'multi',
        moveBonus: {
          idealMoves: [0, 2],
          damageRate: 1.3
        },
        desc: '与えたダメージの50%分、味方全員のHPを回復する。' }
        ]},

 // ── id:8 アサミ
{ id: 8, 
  name: 'アサミ', gender: 'woman', rarity: 'ur',
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
        cost: 4,
        linkCost: 3,
        isUltimate: false,
        hit: 100,
        type: 'attack',
        multiplier: 2.0,
        range: 'front1',
        pierce: false,
        effects: [],
        moveBonus: {
          idealMoves: [2,4],
          damageRate: 1.3
        },
        desc: '正面のマスに中ダメージ' },

      { id: 'ult',
        name: 'ざ・りっぱー！',
        cost: 10,
        linkCost: 3,
        isUltimate: true,
        hit: 100,
        type: 'attack',
        multiplier: 3.5,
        range: 'around8',
        effects: [],
        moveBonus: {
          idealMoves: [1,3,4,7,8],
          damageRate: 1.5
        },
        desc: '自分を中心周囲1マスに大ダメージ' }
    ]},

  ];

function getCharaById(id) {
  return CHARACTERS.find(c => c.id === id) || null;
}
