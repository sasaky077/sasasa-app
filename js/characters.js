
// characters.js
// effects[] 設計：
//   { type, target, hit, duration }
//   type: 'jittai' | 'stun' | 'atk_down' | 'def_down' | 'spd_down'
//         'atk_up' | 'def_up' | 'spd_up'
//         'sure_hit_self' | 'sure_hit_team' | 'heal'
//         'pull_1' | 'pull_2' | 'push_1' | 'push_2'
//         'shift_right_1' | 'shift_right_2' | 'shift_left_1' | 'shift_left_2'
//   target: 'enemy' | 'ally_self' | 'ally_all'
//   hit: 効果命中率（省略時100）
//   duration: 持続ターン数
//
// multiplier: 0 = ダメージなし、>0 = ダメージあり（ATK × multiplier - DEF）
// cdMax: クールダウン（0=毎ターン使用可、1=1ターンおき、2=2ターンおき…）

const CHARACTERS = [

  // ══════════════════════════════════════════════════════════════
  // R
  // ══════════════════════════════════════════════════════════════

  // ── id:1 ギョウタツ（バランス）────────────────────────────────
  // 安定した攻撃と自己防御。縛り＋実体化の両方を持つ万能型。
  { id: 1, name: 'ギョウタツ', gender: 'man', rarity: 'r',
    role: 'バランス',
    stats: { HP: 780, ATK: 230, DEF: 240, SPD: 210 },
    img: 'images/chara_01.webp', cutImg: 'images/chara_01_cut.webp',
    upImg: 'images/chara_01_up.webp', battleImg: 'images/chara_01_battle.webp',
    favScale: 0.75, favOffsetY: -100,
    skills: [
      { id: 's1', name: '正拳',   cdMax: 0, hit: 100, type: 'attack', multiplier: 2., range: 'front1',
        pierce: false,
        effects: [],
        desc: '確実に命中する基本攻撃。' },

      { id: 's2', name: '縛打',   cdMax: 2, hit: 85, type: 'attack', multiplier: 0.8, range: 'front_row_3',
        effects: [
          { type: 'atk_down', target: 'enemy', hit: 80, duration: 2 }
        ],
        desc: '打撃に縛りの力を込め、怪異のATKを下げる。' },

      { id: 's3', name: '見切り',   cdMax: 3, hit: 100, type: 'buff', multiplier: 0, range: 'self',
        effects: [
          { type: 'def_up', target: 'ally_self', hit: 100, duration: 2 }
        ],
        desc: '怪異の攻撃を見切り、自身のDEFを2ターン上昇させる。' },

      { id: 's4', name: '踏込み',   cdMax: 3, hit: 90, type: 'attack', multiplier: 2.0, range: 'front1',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 70, duration: 2 }
        ],
        desc: '素早く踏み込んで強攻撃。命中時に実体化を付与する。' },

      { id: 's5', name: '転身',   cdMax: 1, hit: 100, type: 'move', multiplier: 0.8, range: 'front_row_3',
        pierce: false,
        effects: [],
        desc: 'ポジションを変更する。' },

      // ── デバッグ用貫通テストスキル（Chapter00確認用） ──
      { id: 'test_gun',   cdMax: 0, hit: 100, name: '非貫通射撃', type: 'attack', multiplier: 1.0, range: 'pierce_all', pierce: false,
        desc: '射線上の最初の敵1体に命中する。' },
      { id: 'test_lance', cdMax: 0, hit: 100, name: '貫通射撃',   type: 'attack', multiplier: 1.0, range: 'pierce_all', pierce: true,
        desc: '射線上の敵すべてに命中する。' },
    ]},

  // ── id:2 タキヤマ（速度寄り）──────────────────────────────────
  // 高SPDで先手を取りSPDデバフを撒く。敵の行動順を崩す妨害役。
  { id: 2, name: 'タキヤマ', gender: 'woman', rarity: 'r',
    role: '速度寄り',
    stats: { HP: 720, ATK: 210, DEF: 200, SPD: 270 },
    img: 'images/chara_02.webp', cutImg: 'images/chara_02_cut.webp',
    upImg: 'images/chara_02_up.webp', battleImg: 'images/chara_02_battle.webp',
    skills: [
      { id: 's1', name: '閃刃',   cdMax: 0, hit: 90, type: 'attack', multiplier: 1.0, range: 'front1',
        pierce: false,
        effects: [],
        desc: '素早い連続斬りで怪異を攻撃する。' },

      { id: 's2', name: '縛鎖',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 0.5, range: 'front_row_3',
        effects: [
          { type: 'spd_down', target: 'enemy', hit: 85, duration: 2 }
        ],
        desc: '鎖で怪異の動きを縛り、SPDを2ターン低下させる。' },

      { id: 's3', name: '加速',   cdMax: 3, hit: 100, type: 'buff', multiplier: 0, range: 'self',
        effects: [
          { type: 'spd_up', target: 'ally_self', hit: 100, duration: 2 }
        ],
        desc: '自身のSPDを2ターン上昇させる。行動順が早くなる。' },

      { id: 's4', name: '切り込み',   cdMax: 2, hit: 85, type: 'attack', multiplier: 1.5, range: 'front_row_3',
        effects: [
          { type: 'spd_down', target: 'enemy', hit: 70, duration: 1 }
        ],
        desc: '斬りながら怪異のSPDを一時的に下げる。' },

      { id: 's5', name: '疾走',   cdMax: 2, hit: 100, type: 'move', multiplier: 1.0, range: 'front_row_3',
        pierce: false,
        effects: [],
        desc: '素早くポジションを移動する。' },
    ]},

  // ── id:3 マツバラ（耐久寄り）──────────────────────────────────
  // 高DEFと実体化で壁役を務める。敵を吸い寄せて自分に攻撃を集める。
  { id: 3, name: 'マツバラ', gender: 'man', rarity: 'r',
    role: '耐久寄り',
    stats: { HP: 840, ATK: 200, DEF: 275, SPD: 200 },
    img: 'images/chara_03.webp', cutImg: 'images/chara_03_cut.webp',
    upImg: 'images/chara_03_up.webp', battleImg: 'images/chara_03_battle.webp',
    skills: [
      { id: 's1', name: '盾撃',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'front1',
        pierce: false,
        effects: [],
        desc: '盾で怪異を殴りつける。威力は低いが確実に命中する。' },

      { id: 's2', name: '実体化',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 0, range: 'all',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 100, duration: 2 }
        ],
        desc: '怪異を現実に縛り付け「実体化」を2ターン付与する。敵の位置と次の攻撃範囲が見えるようになる。' },

      { id: 's3', name: '鉄壁',   cdMax: 3, hit: 100, type: 'buff', multiplier: 0, range: 'self',
        effects: [
          { type: 'def_up', target: 'ally_self', hit: 100, duration: 2 }
        ],
        desc: '自身のDEFを2ターン大幅に上昇させる。' },

      { id: 's4', name: '押し込み',   cdMax: 2, hit: 90, type: 'attack', multiplier: 1.5, range: 'front1',
        effects: [
          { type: 'pull_1', target: 'enemy', hit: 80, duration: 1 }
        ],
        desc: '体当たりで攻撃し、怪異を1マス吸い寄せる。' },

      { id: 's5', name: '前進',   cdMax: 1, hit: 100, type: 'move', multiplier: 0, range: 'self',
        effects: [],
        desc: 'ポジションを変更する。' },
    ]},

  // ── id:4 リョウ（火力寄り）───────────────────────────────────
  // 高倍率の攻撃特化。DEFダウンで味方の火力を底上げする。
  { id: 4, name: 'リョウ', gender: 'man', rarity: 'r',
    role: '火力寄り',
    stats: { HP: 730, ATK: 275, DEF: 205, SPD: 220 },
    img: 'images/chara_04.webp', cutImg: 'images/chara_04_cut.webp',
    upImg: 'images/chara_04_up.webp', battleImg: 'images/chara_04_battle.webp',
    favScale: 0.85, favOffsetY: -30,
    skills: [
      { id: 's1', name: '爆撃',   cdMax: 0, hit: 85, type: 'attack', multiplier: 3.0, range: 'front_row_3',
        pierce: false,
        effects: [],
        desc: '強力な爆発攻撃。ATKの3倍の高火力。' },

      { id: 's2', name: '縛り手',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 0, range: 'front1',
        effects: [
          { type: 'def_down', target: 'enemy', hit: 80, duration: 2 }
        ],
        desc: '怪異のDEFを2ターン低下させる。味方全員のダメージが通りやすくなる。' },

      { id: 's3', name: '猛撃',   cdMax: 4, hit: 65, type: 'attack', multiplier: 7.0, range: 'front1',
        pierce: false,
        effects: [],
        desc: '全力の一撃。ATKの7倍の超火力。命中率は低い。' },

      { id: 's4', name: '集中',   cdMax: 3, hit: 100, type: 'buff', multiplier: 0, range: 'self',
        effects: [
          { type: 'atk_up', target: 'ally_self', hit: 100, duration: 2 },
          { type: 'sure_hit_self', target: 'ally_self', hit: 100, duration: 1 }
        ],
        desc: '自身のATKを2ターン上昇させ、次の攻撃を必中にする。' },

      { id: 's5', name: '後退',   cdMax: 1, hit: 100, type: 'move', multiplier: 0, range: 'self',
        effects: [],
        desc: 'ポジションを変更する。' },
    ]},

  // ── id:7 ミユ（速度寄り）─────────────────────────────────────
  // 糸使い。SPDデバフと実体化を使い分けて敵の行動を制限する。
  { id: 7, name: 'ミユ', gender: 'woman', rarity: 'r',
    role: '速度寄り',
    stats: { HP: 710, ATK: 220, DEF: 200, SPD: 280 },
    img: 'images/chara_07.webp', cutImg: 'images/chara_07_cut.webp',
    upImg: 'images/chara_07_up.webp', battleImg: 'images/chara_07_battle.webp',
    skills: [
      { id: 's1', name: '貫通バン',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'pierce_all',
        pierce: true,
        effects: [],
        desc: '敵に祈りを込めた弾を打ち込む。中ダメージ。' },

      { id: 's2', name: '非貫通バン',   cdMax: 3, hit: 100, type: 'attack', multiplier: 1.0, range: 'pierce_all',
        pierce: false,
        effects: [],
        desc: '敵に祈りを込めた弾を乱れ打つ。中ダメージ。' },

      { id: 's3', name: 'ドカーン',   cdMax: 3, hit: 100, type: 'attack', multiplier: 1.0, range: 'pierce_all',
        pierce: true,
        effects: [],
        desc: '敵に祈りを込めた弾を打ち込む。大ダメージ。' },

      { id: 's4', name: 'ズキューン',   cdMax: 3, hit: 100, type: 'attack', multiplier: 0, range: 'pierce_all',
        pierce: true,
        effects: [],
        desc: '敵に祈りを込めた弾を乱れ打つ。大ダメージ。' },

      { id: 's5', name: 'ガチャッ',   cdMax: 1, hit: 100, type: 'move', multiplier: 0, range: 'self',
        effects: [],
        desc: 'マジナイ済みの弾をリロード。2ターンの間、SPDが上がる。' },
    ]},

  // ── id:8 カミジョウ ──────────────────────────────
  // スティックを使用し、遠距離の敵をけん制する。
  { id: 8, name: 'カミジョウ', gender: 'man', rarity: 'r',
    role: '耐久寄り',
    stats: { HP: 850, ATK: 205, DEF: 270, SPD: 200 },
    img: 'images/chara_08.webp', cutImg: 'images/chara_08_cut.webp',
    upImg: 'images/chara_08_up.webp', battleImg: 'images/chara_08_battle.webp',
    skills: [
      { id: 's1', name: '非貫通正突',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'pierce_all',
        pierce: false,
        effects: [],
        desc: '杖で敵を攻撃する。敵を1マス後ろに押し出す' },

      { id: 's2', name: '貫通一閃',   cdMax: 3, hit: 100, type: 'attack', multiplier: 1.0, range: 'pierce_all',
        pierce: true,
        effects: [],
        desc: '直線上を杖で貫く。中ダメージ。' },

      { id: 's3', name: '祓杖の風',   cdMax: 3, hit: 85, type: 'attack', multiplier: 1.0, range: 'row_far',
        pierce: false,
        effects: [],
        desc: '一番後ろの3マスすべてを浄化の風が吹き抜ける。大ダメージ。' },

      { id: 's4', name: '祓杖の雨',   cdMax: 5, hit: 100, type: 'attack', multiplier: 2.0, range: 'all',
        pierce: true,
        effects: [],
        desc: '敵マスすべてに浄化の雨が降り注ぐ。大ダメージ。' },

      { id: 's5', name: '祓浄の光',   cdMax: 1, hit: 100, type: 'buff', multiplier: 0, range: 'self',
        effects: [],
        desc: 'あたたかな光で自らを包む。状態異常を回復する。' },
    ]},

  // ── id:12 エリ（耐久寄り）────────────────────────────────────
  // 呪い使い。ATKダウンと全体DEFバフで味方を守る支援寄り耐久。
  { id: 12, name: 'エリ', gender: 'woman', rarity: 'r',
    role: '耐久寄り',
    stats: { HP: 820, ATK: 200, DEF: 278, SPD: 205 },
    img: 'images/chara_12.webp', cutImg: 'images/chara_12_cut.webp',
    upImg: 'images/chara_12_up.webp', battleImg: 'images/chara_12_battle.webp',
    skills: [
      { id: 's1', name: '呪打',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'front1',
        pierce: false,
        effects: [],
        desc: '呪いを込めた打撃。確実に命中する。' },

      { id: 's2', name: '呪縛',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 0, range: 'front_row_3',
        effects: [
          { type: 'atk_down', target: 'enemy', hit: 85, duration: 2 }
        ],
        desc: '呪いで怪異のATKを2ターン低下させる。' },

      { id: 's3', name: '呪護',   cdMax: 3, hit: 100, type: 'buff', multiplier: 0, range: 'all',
        effects: [
          { type: 'def_up', target: 'ally_all', hit: 100, duration: 2 }
        ],
        desc: '呪いを盾にする。味方全員のDEFを2ターン上昇させる。' },

      { id: 's4', name: '呪撃',   cdMax: 2, hit: 80, type: 'attack', multiplier: 2.0, range: 'front1',
        effects: [
          { type: 'atk_down', target: 'enemy', hit: 70, duration: 1 }
        ],
        desc: '強化された呪撃。命中時に怪異のATKを一時的に下げる。' },

      { id: 's5', name: '呪歩',   cdMax: 1, hit: 100, type: 'move', multiplier: 0, range: 'self',
        effects: [],
        desc: '呪力を纏いながら移動する。' },
    ]},

  // ── id:13 チサカ（バランス）──────────────────────────────────
  // 実体化と必中を組み合わせる。実体化後に味方の必中を確保する支援型。
  { id: 13, name: 'チサカ', gender: 'woman', rarity: 'r',
    role: 'バランス',
    stats: { HP: 760, ATK: 225, DEF: 235, SPD: 215 },
    img: 'images/chara_13.webp', cutImg: 'images/chara_13_cut.webp',
    upImg: 'images/chara_13_up.webp', battleImg: 'images/chara_13_battle.webp',
    skills: [
      { id: 's1', name: '霊打',   cdMax: 0, hit: 90, type: 'attack', multiplier: 1.0, range: 'front1',
        pierce: false,
        effects: [],
        desc: '霊力を込めた打撃で怪異を攻撃する。' },

      { id: 's2', name: '霊縛',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 0, range: 'front1',
        effects: [
          { type: 'spd_down', target: 'enemy', hit: 80, duration: 2 }
        ],
        desc: '霊力で怪異の動きを縛りSPDを2ターン低下させる。' },

      { id: 's3', name: '霊実',   cdMax: 3, hit: 85, type: 'debuff', multiplier: 0, range: 'front1',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 85, duration: 2 }
        ],
        desc: '霊力で怪異を実体化させる。敵の位置と次の攻撃が見える。' },

      { id: 's4', name: '霊護',   cdMax: 3, hit: 100, type: 'buff', multiplier: 0, range: 'self',
        effects: [
          { type: 'def_up', target: 'ally_self', hit: 100, duration: 2 },
          { type: 'sure_hit_self', target: 'ally_self', hit: 100, duration: 1 }
        ],
        desc: '霊力で身を守りながら、次の自分の攻撃を必中にする。' },

      { id: 's5', name: '霊歩',   cdMax: 1, hit: 100, type: 'move', multiplier: 0, range: 'self',
        effects: [],
        desc: '霊力を使って素早く移動する。' },
    ]},

  // ── id:11 ユズハ（火力寄り）──────────────────────────────────
  // 最高クラスの火力。DEFダウン後に10倍攻撃を叩き込む超アタッカー。
  { id: 11, name: 'ユズハ', gender: 'woman', rarity: 'r',
    role: '火力寄り',
    stats: { HP: 350, ATK: 330, DEF: 250, SPD: 285 },
    img: 'images/chara_11.webp', cutImg: 'images/chara_11_cut.webp',
    upImg: 'images/chara_11_up.webp', battleImg: 'images/chara_11_battle.webp',
    skills: [
      { id: 's1', name: '狂撃',   cdMax: 0, hit: 80, type: 'attack', multiplier: 2.0, range: 'front_row_3',
        pierce: false,
        effects: [],
        desc: '神通力を解放した一撃。ATKの2倍のダメージ。' },

      { id: 's2', name: '狂縛',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 0, range: 'front_row_3',
        effects: [
          { type: 'def_down', target: 'enemy', hit: 100, duration: 2 }
        ],
        desc: '怪異のDEFを2ターン大幅に低下させる。' },

      { id: 's3', name: '狂爆',   cdMax: 5, hit: 40, type: 'attack', multiplier: 3.0, range: 'pierce3',
        effects: [],
        desc: '力が湧いてくる。ATKの3倍の超火力。命中率は非常に低い。' },

      { id: 's4', name: '狂化',   cdMax: 3, hit: 100, type: 'attack', multiplier: 5.0, range: 'pierce3',
        effects: [
          { type: 'atk_up', target: 'enemy', hit: 100, duration: 2 }
        ],
        desc: '力が爆発する。ATKの5倍の大ダメージ。' },

      { id: 's5', name: '狂覚',   cdMax: 5, hit: 100, type: 'attack', multiplier: 0.3, range: 'all',
        effects: [],
        desc: '敵を実体化する。' },
    ]},


  // ══════════════════════════════════════════════════════════════
  // SR
  // ══════════════════════════════════════════════════════════════

  // ── id:5 ナガラ（火力寄り）───────────────────────────────────
  // 爆発系の超高火力。スタン＋押し出しで敵ポジションも操作する。
  { id: 5, name: 'ナガラ', gender: 'man', rarity: 'sr',
    role: '火力寄り',
    stats: { HP: 800, ATK: 305, DEF: 230, SPD: 245 },
    img: 'images/chara_05.webp', cutImg: 'images/chara_05_cut.webp',
    upImg: 'images/chara_05_up.webp', battleImg: 'images/chara_05_battle.webp',
    favScale: 0.85, favOffsetY: -30,
    skills: [
      { id: 's1', name: '爆砕',   cdMax: 0, hit: 85, type: 'attack', multiplier: 3.0, range: 'pierce3',
        effects: [],
        desc: '爆発的な力で怪異を攻撃する。ATKの3倍の高火力。' },

      { id: 's2', name: '縛爆',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 0, range: 'pierce3',
        effects: [
          { type: 'def_down', target: 'enemy', hit: 75, duration: 2 }
        ],
        desc: '爆発の衝撃で怪異のDEFを2ターン大幅に低下させる。' },

      { id: 's3', name: '実砕',   cdMax: 3, hit: 85, type: 'attack', multiplier: 5.0, range: 'pierce3',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 80, duration: 2 }
        ],
        desc: '攻撃と同時に怪異を実体化させる。ATKの5倍のダメージ。' },

      { id: 's4', name: '猛爆',   cdMax: 5, hit: 60, type: 'attack', multiplier: 10.0, range: 'front_row_3',
        effects: [
          { type: 'push_2', target: 'enemy', hit: 100, duration: 1 }
        ],
        desc: '全力の爆撃。ATKの10倍の超火力。命中時に敵を2マス押し出す。' },

      { id: 's5', name: '爆進',   cdMax: 2, hit: 50, type: 'attack', multiplier: 3.0, range: 'all',
        pierce: false,
        effects: [],
        desc: '爆発の反動を利用して移動しながら攻撃する。ATKの2倍のダメージ。' },
    ]},

  // ── id:10 フミカ（速度寄り）──────────────────────────────────
  // 最高SPD。必中バフと実体化を組み合わせ、高速で敵情報を暴く。
  { id: 10, name: 'フミカ', gender: 'woman', rarity: 'sr',
    role: '速度寄り',
    stats: { HP: 760, ATK: 250, DEF: 225, SPD: 300 },
    img: 'images/chara_10.webp', cutImg: 'images/chara_10_cut.webp',
    upImg: 'images/chara_10_up.webp', battleImg: 'images/chara_10_battle.webp',
    favScale: 0.85, favOffsetY: -100,
    skills: [
      { id: 's1', name: '白日',   cdMax: 0, hit: 90, type: 'attack', multiplier: 1.5, range: 'all',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 90, duration: 2 }
        ],
        desc: '素早く怪異を実体化させる。成功率が高い。' },

      { id: 's2', name: '慈愛',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 0, range: 'all',
        effects: [
          { type: 'spd_down', target: 'enemy', hit: 85, duration: 2 },
          { type: 'atk_down', target: 'enemy', hit: 75, duration: 2 },
          { type: 'jittai', target: 'enemy', hit: 90, duration: 2 }
        ],
        desc: '深い愛情で怪異を2ターン実体化し、SPDとATKを2ターン低下させる。' },

      { id: 's3', name: '寵愛',   cdMax: 3, hit: 90, type: 'debuff', multiplier: 0, range: 'all',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 90, duration: 2 }
        ],
        desc: '素早く怪異を実体化させる。成功率が高い。' },

      { id: 's4', name: '赦',   cdMax: 4, hit: 100, type: 'buff', multiplier: 0, range: 'all',
        effects: [
          { type: 'spd_up', target: 'ally_self', hit: 100, duration: 3 },
          { type: 'sure_hit_self', target: 'ally_self', hit: 100, duration: 2 },
          { type: 'jittai', target: 'enemy', hit: 90, duration: 2 }
        ],
        desc: '自身のSPDを3ターン大幅に上昇させ、2ターン必中状態にする。怪異を実体化する。' },

      { id: 's5', name: '風',   cdMax: 1, hit: 100, type: 'move', multiplier: 0, range: 'all',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 90, duration: 2 }
        ],
        desc: '怪異を実体化し、瞬時に任意のポジションへ移動する。' },
    ]},

  // ── id:15 アキ（速度・支援寄り）──────────────────────────────
  // 自分に寄せ付ける系のキャラにしたい。色術的な。
  { id: 15, name: 'アキ', gender: 'woman', rarity: 'sr',
    role: '速度・支援寄り',
    stats: { HP: 770, ATK: 235, DEF: 230, SPD: 295 },
    img: 'images/chara_15.webp', cutImg: 'images/chara_15_cut.webp',
    upImg: 'images/chara_15_up.webp', battleImg: 'images/chara_15_battle.webp',
    favScale: 0.85, favOffsetY: -30,
    skills: [
      { id: 's1', name: '色ノ前',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'all',
        effects: [
          { type: 'pull_2', target: 'enemy', hit: 100, duration: 1 }
        ],
        desc: 'ATKの1.0倍のダメージ。敵を2マス前へ引き寄せる' },

      { id: 's2', name: '色ノ後',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'all',
        effects: [
          { type: 'push_2', target: 'enemy', hit: 100, duration: 1 }
        ],
        desc: 'ATKの1.0倍のダメージ。敵を2マス奥へ押し出す。' },

      { id: 's3', name: '色ノ右',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'all',
        effects: [
          { type: 'shift_right_2', target: 'enemy', hit: 100, duration: 1 }
        ],
        desc: 'ATKの1.0倍のダメージ。敵を2マス右へ動かす。' },

      { id: 's4', name: '色ノ左',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'all',
        effects: [
          { type: 'shift_left_2', target: 'enemy', hit: 100, duration: 1 }
        ],
        desc: 'ATKの1.0倍のダメージ。敵を2マス左へ動かす。' },

      { id: 's5', name: '色ノ撃',   cdMax: 5, hit: 100, type: 'move', multiplier: 3.0, range: 'front3_row_3',
        pierce: false,
        effects: [],
        desc: '直線上の敵に大ダメージ。' },
    ]},

  // ── id:17 ベン（バランス）────────────────────────────────────
  // 独自の特殊スキル持ち。全体攻撃と強力なATKバフが強みのゼネラリスト。
  { id: 17, name: 'ベン', gender: 'man', rarity: 'sr',
    role: 'バランス',
    stats: { HP: 800, ATK: 255, DEF: 250, SPD: 260 },
    img: 'images/chara_17.webp', cutImg: 'images/chara_17_cut.webp',
    upImg: 'images/chara_17_up.webp', battleImg: 'images/chara_17_battle.webp',
    skills: [
      { id: 's1', name: '身元調査',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'all',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 85, duration: 2 }
        ],
        desc: '怪異の正体を調査する。実体化する。' },

      { id: 's2', name: '虚飾看破',   cdMax: 3, hit: 50, type: 'attack', multiplier: 2.0, range: 'all',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 85, duration: 2 }
        ],
        desc: '真実を見抜いた一撃。ATKの2倍のダメージ＋実体化付与。' },

      { id: 's3', name: '鮮やかな推断',   cdMax: 4, hit: 100, type: 'buff', multiplier: 0, range: 'self',
        effects: [
          { type: 'def_up', target: 'ally_self', hit: 100, duration: 2 },
          { type: 'atk_up', target: 'ally_self', hit: 100, duration: 2 }
        ],
        desc: '鮮やかな推断により、ATKとDEFを2ターン上昇させる。' },

      { id: 's4', name: '決死の暴露',   cdMax: 5, hit: 30, type: 'attack', multiplier: 6.0, range: 'all',
        pierce: false,
        effects: [],
        desc: '無数の攻撃を乱れ打つ。ATKの6倍の高火力。命中率は低い。' },

      { id: 's5', name: '華麗なる転換',   cdMax: 1, hit: 100, type: 'move', multiplier: 1.5, range: 'all',
        pierce: false,
        effects: [],
        desc: 'ポジションを任意に変更する。' },
    ]},

  // ── id:18 ジョー（火力寄り）──────────────────────────────────
  // ATKとSPDの同時バフが特徴。高速・高火力で敵を押し切る。
  { id: 18, name: 'ジョー', gender: 'woman', rarity: 'sr',
    role: '火力寄り',
    stats: { HP: 760, ATK: 300, DEF: 225, SPD: 240 },
    img: 'images/chara_18.webp', cutImg: 'images/chara_18_cut.webp',
    upImg: 'images/chara_18_up.webp', battleImg: 'images/chara_18_battle.webp',
    skills: [
      { id: 's1', name: '業火撃',   cdMax: 0, hit: 85, type: 'attack', multiplier: 3.0, range: 'front1',
        pierce: false,
        effects: [],
        desc: '業火を纏った強烈な一撃。ATKの3倍のダメージ。' },

      { id: 's2', name: '炎縛',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 0, range: 'front_row_3',
        effects: [
          { type: 'def_down', target: 'enemy', hit: 75, duration: 2 }
        ],
        desc: '炎で怪異のDEFを2ターン低下させる。' },

      { id: 's3', name: '爆炎',   cdMax: 5, hit: 60, type: 'attack', multiplier: 9.0, range: 'front1',
        pierce: false,
        effects: [],
        desc: '爆発的な炎を解放する。ATKの9倍の超火力。命中率は非常に低い。' },

      { id: 's4', name: '炎加速',   cdMax: 4, hit: 100, type: 'buff', multiplier: 0, range: 'self',
        effects: [
          { type: 'atk_up', target: 'ally_self', hit: 100, duration: 2 },
          { type: 'spd_up', target: 'ally_self', hit: 100, duration: 2 }
        ],
        desc: '炎の勢いでATKとSPDを2ターン同時に上昇させる。' },

      { id: 's5', name: '炎走',   cdMax: 2, hit: 80, type: 'attack', multiplier: 2.0, range: 'self',
        pierce: false,
        effects: [],
        desc: '炎を纏いながら移動して攻撃する。ATKの2倍のダメージ。' },
    ]},

  // ── id:19 アンナ（耐久寄り）──────────────────────────────────
  // 高HPと全体デバフが強力。実体化＋ATKダウンで攻防両立の壁。
  { id: 19, name: 'アンナ', gender: 'woman', rarity: 'sr',
    role: '耐久寄り',
    stats: { HP: 900, ATK: 230, DEF: 300, SPD: 225 },
    img: 'images/chara_19.webp', cutImg: 'images/chara_19_cut.webp',
    upImg: 'images/chara_19_up.webp', battleImg: 'images/chara_19_battle.webp',
    skills: [
      
      { id: 's1', name: '自己回復',   cdMax: 0, hit: 100, type: 'heal', multiplier: 0, range: 'self',
        effects: [
          { type: 'heal', target: 'ally_self', rate: 0.3, hit: 100 }
        ],
        desc: '自身のHPを最大HPの30%回復する。' },

      { id: 's2', name: '単体回復',   cdMax: 0, hit: 100, type: 'heal', multiplier: 0, range: 'ally_all',
        effects: [
          { type: 'heal', target: 'ally_lowest', rate: 0.35, hit: 100 }
        ],
        desc: 'HP割合が最も低い味方1人を最大HPの35%回復する。' },

      { id: 's3', name: '全体回復',   cdMax: 0, hit: 100, type: 'heal', multiplier: 0, range: 'ally_all',
        effects: [
          { type: 'heal', target: 'ally_all', rate: 0.2, hit: 100 }
        ],
        desc: '味方全員のHPを最大HPの20%回復する。' },

      { id: 's4', name: 'イケない治療',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 0, range: 'pierce_all',
        pierce: true,
        effects: [
          { type: 'atk_down', target: 'enemy', hit: 85, duration: 2 },
          { type: 'def_down', target: 'enemy', hit: 85, duration: 2 }
        ],
        desc: '直線上の敵すべてのATKとDEFを2ターン低下させる。' },

      { id: 's5', name: '神体実験',   cdMax: 4, hit: 100, type: 'buff', multiplier: 0, range: 'ally_all',
        effects: [
          { type: 'def_up', target: 'ally_all', hit: 100, duration: 2 },
          { type: 'heal', target: 'ally_all', rate: 0.15, hit: 100 }
        ],
        desc: '味方全員のDEFを2ターン上昇させ、最大HPの15%回復する。' },
    ]},

  // ── id:20 ミズキ（速度寄り）──────────────────────────────────
  // 強制移動でポジションを支配する。
  { id: 20, name: 'ミズキ', gender: 'man', rarity: 'sr',
    role: '速度寄り',
    stats: { HP: 780, ATK: 245, DEF: 228, SPD: 298 },
    img: 'images/chara_20.webp', cutImg: 'images/chara_20_cut.webp',
    upImg: 'images/chara_20_up.webp', battleImg: 'images/chara_20_battle.webp',
    skills: [
      { id: 's1', name: '蛇ノ前',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'all',
        effects: [
          { type: 'pull_1', target: 'enemy', hit: 100, duration: 1 }
        ],
        desc: 'ATKの1.0倍のダメージ。敵を1マス前へ引き寄せる' },

      { id: 's2', name: '蛇ノ後',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'all',
        effects: [
          { type: 'push_1', target: 'enemy', hit: 100, duration: 1 }
        ],
        desc: 'ATKの1.0倍のダメージ。敵を1マス奥へ押し出す。' },

      { id: 's3', name: '蛇ノ右',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'all',
        effects: [
          { type: 'shift_right_1', target: 'enemy', hit: 100, duration: 1 }
        ],
        desc: 'ATKの1.0倍のダメージ。敵を1マス右へ動かす。' },

      { id: 's4', name: '蛇ノ左',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'all',
        effects: [
          { type: 'shift_left_1', target: 'enemy', hit: 100, duration: 1 }
        ],
        desc: 'ATKの1.0倍のダメージ。敵を1マス左へ動かす。' },

      { id: 's5', name: '蛇ノ眼',   cdMax: 5, hit: 100, type: 'attack', multiplier: 0.7, range: 'all',
        pierce: false,
        effects: [
          { type: 'jittai', target: 'enemy', hit: 80, duration: 3 }
        ],
        desc: '蛇ノ眼で怪異を実体化する' },
    ]},


  // ══════════════════════════════════════════════════════════════
  // UR
  // ══════════════════════════════════════════════════════════════

  // ── id:6 エミ（速度・撹乱寄り）──────────────────────────────
  // 全体必中バフと左右の強制移動で敵ポジションを徹底支配する。
  { id: 6, name: 'エミ', gender: 'woman', rarity: 'ur',
    role: '速度・撹乱寄り',
    stats: { HP: 840, ATK: 270, DEF: 255, SPD: 330 },
    img: 'images/chara_06.webp', cutImg: 'images/chara_06_cut.webp',
    upImg: 'images/chara_06_up.webp', battleImg: 'images/chara_06_battle.webp',
    favScale: 0.85, favOffsetY: -30,
    skills: [
      { id: 's1', name: '蝉時雨',   cdMax: 0, hit: 90, type: 'attack', multiplier: 2.0, range: 'front1',
        pierce: false,
        effects: [],
        desc: '幻影を使った素早い攻撃。ATKの2倍のダメージ。' },

      { id: 's2', name: '湖上の月',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 0, range: 'col_center',
        effects: [
          { type: 'spd_down', target: 'enemy', hit: 85, duration: 2 },
          { type: 'shift_left_2', target: 'enemy', hit: 80, duration: 1 }
        ],
        desc: '幻影でSPDを下げながら怪異を2マス左に強制移動させる。' },

      { id: 's3', name: '幻実',   cdMax: 3, hit: 90, type: 'debuff', multiplier: 0, range: 'all',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 90, duration: 2 },
          { type: 'shift_right_1', target: 'enemy', hit: 80, duration: 1 }
        ],
        desc: '幻影で実体化させながら怪異を1マス右に強制移動。成功率が高い。' },

      { id: 's4', name: '彩愛の人',   cdMax: 4, hit: 100, type: 'buff', multiplier: 0, range: 'all',
        effects: [
          { type: 'spd_up', target: 'ally_all', hit: 100, duration: 2 },
          { type: 'sure_hit_team', target: 'ally_all', hit: 100, duration: 1 }
        ],
        desc: '味方全員のSPDを2ターン上昇させ、次のターン全員必中にする。' },

      { id: 's5', name: '爆発',   cdMax: 2, hit: 60, type: 'attack', multiplier: 3.0, range: 'all',
        pierce: false,
        effects: [],
        desc: '幻影を残しながら移動して攻撃する。ATKの3倍のダメージ。' },
    ]},

  // ── id:9 ルナ＆マーヤ（バランス・複合）──────────────────────
  // 全方位の高成功率デバフ。実体化＋スタンで1ターン完全拘束できる。
  { id: 9, name: 'ルナ＆マーヤ', gender: 'woman', rarity: 'ur',
    role: 'バランス・複合',
    stats: { HP: 900, ATK: 295, DEF: 280, SPD: 275 },
    img: 'images/chara_09.webp', cutImg: 'images/chara_09_cut.webp',
    upImg: 'images/chara_09_up.webp', battleImg: 'images/chara_09_battle.webp',
    favScale: 0.85, favOffsetY: -30,
    skills: [
      { id: 's1', name: '双星撃',   cdMax: 0, hit: 90, type: 'attack', multiplier: 3.0, range: 'front_row_3',
        pierce: false,
        effects: [],
        desc: '二人が同時に攻撃する。ATKの3倍の連携ダメージ。' },

      { id: 's2', name: '双縛',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 0, range: 'front_row_3',
        effects: [
          { type: 'atk_down', target: 'enemy', hit: 90, duration: 2 },
          { type: 'spd_down', target: 'enemy', hit: 90, duration: 2 }
        ],
        desc: '二人がかりでATKとSPDを2ターン低下させる。成功率が高い。' },

      { id: 's3', name: '双実',   cdMax: 3, hit: 90, type: 'debuff', multiplier: 0, range: 'front_row_3',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 95, duration: 2 },
          { type: 'stun', target: 'enemy', hit: 70, duration: 1 }
        ],
        desc: '二人の力で実体化とスタンを付与する。実体化成功率が非常に高い。' },

      { id: 's4', name: '双護',   cdMax: 4, hit: 100, type: 'buff', multiplier: 0, range: 'all',
        effects: [
          { type: 'atk_up', target: 'ally_all', hit: 100, duration: 2 },
          { type: 'def_up', target: 'ally_all', hit: 100, duration: 2 }
        ],
        desc: '互いに庇い合い、味方全員のATKとDEFを2ターン上昇させる。' },

      { id: 's5', name: '双星爆',   cdMax: 6, hit: 65, type: 'attack', multiplier: 8.0, range: 'front_row_3',
        pierce: false,
        effects: [],
        desc: '二人の力を爆発させる超技。ATKの8倍の超火力。命中率は低い。' },
    ]},

  // ── id:14 アイム（火力寄り）──────────────────────────────────
  // 全体攻撃と吸い寄せ＋押し出しで敵を翻弄する異能者。
  { id: 14, name: 'アイム', gender: 'man', rarity: 'ur',
    role: '火力寄り',
    stats: { HP: 740, ATK: 280, DEF: 205, SPD: 210 },
    img: 'images/chara_14.webp', cutImg: 'images/chara_14_cut.webp',
    upImg: 'images/chara_14_up.webp', battleImg: 'images/chara_14_battle.webp',
    skills: [
      { id: 's1', name: '物真似',   cdMax: 0, hit: 100, type: 'attack', multiplier: 1.0, range: 'all',
        pierce: false,
        effects: [],
        desc: '直前の味方の行動を真似する。' },

      { id: 's2', name: '虚像劇',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 1.0, range: 'all',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 100, duration: 3},
          { type: 'pull_2', target: 'enemy', hit: 100, duration: 1 }
        ],
        desc: '怪異を実体化させ、2マス後退させる。' },

      { id: 's3', name: '御遊戯',   cdMax: 3, hit: 100, type: 'attack', multiplier: 3.0, range: 'all',
        effects: [
          { type: 'def_down', target: 'enemy', hit: 80, duration: 2 }
        ],
        desc: '全体を巻き込む攻撃。ATKの3倍のダメージ＋DEFダウン。' },

      { id: 's4', name: '踊',   cdMax: 3, hit: 100, type: 'buff', multiplier: 0, range: 'self',
        effects: [
          { type: 'spd_up', target: 'ally_self', hit: 100, duration: 2 },
          { type: 'atk_up', target: 'ally_self', hit: 100, duration: 2 }
        ],
        desc: '自身のSPDとATKを2ターン上昇させる。' },

      { id: 's5', name: '哀笑',   cdMax: 6, hit: 100, type: 'attack', multiplier: 5.0, range: 'front3_row_3',
        effects: [
          { type: 'push_2', target: 'enemy', hit: 100, duration: 1 },
          { type: 'sure_hit_team', target: 'ally_all', hit: 100, duration: 1 }
        ],
        desc: '全体に圧倒的な攻撃。ATKの8倍。敵を2マス押し出し、味方全員を次ターン必中にする。' },
    ]},

  // ── id:16 アズキ（耐久寄り）──────────────────────────────────
  // 最高DEF。実体化の確実付与と全体攻撃のハイブリッド。スタンも持つ完全体壁役。
  { id: 16, name: 'アズキ', gender: 'woman', rarity: 'ur',
    role: '耐久寄り',
    stats: { HP: 950, ATK: 255, DEF: 325, SPD: 255 },
    img: 'images/chara_16.webp', cutImg: 'images/chara_16_cut.webp',
    upImg: 'images/chara_16_up.webp', battleImg: 'images/chara_16_battle.webp',
    skills: [
      { id: 's1', name: '見破り',   cdMax: 0, hit: 85, type: 'attack', multiplier: 1.5, range: 'front_row_3',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 80, duration: 2 }
        ],
        desc: '攻撃しながら怪異を実体化させる。ATKの1.5倍のダメージ。' },

      { id: 's2', name: '結界',   cdMax: 3, hit: 100, type: 'buff', multiplier: 0, range: 'self',
        effects: [
          { type: 'def_up', target: 'ally_self', hit: 100, duration: 3 }
        ],
        desc: '強固な結界を展開し、DEFを3ターン大幅に上昇させる。' },

      { id: 's3', name: '式神-POCHI-',   cdMax: 3, hit: 100, type: 'debuff', multiplier: 0.5, range: 'front_row_3',
        effects: [
          { type: 'jittai', target: 'enemy', hit: 100, duration: 2 },
          { type: 'atk_down', target: 'enemy', hit: 90, duration: 2 },
          { type: 'push_1', target: 'enemy', hit: 90, duration: 2 }
        ],
        desc: '怪異を確実に実体化させながらATKを2ターン低下させる。' },

      { id: 's4', name: '散霧',   cdMax: 4, hit: 75, type: 'attack', multiplier: 2.0, range: 'all',
        effects: [
          { type: 'stun', target: 'enemy', hit: 60, duration: 1 }
        ],
        desc: '霧を爆発させ全体攻撃。ATKの2倍。命中時に60%でスタンを付与する。' },

      { id: 's5', name: '御魂綴',   cdMax: 1, hit: 100, type: 'move', multiplier: 0, range: 'self',
        effects: [],
        desc: '魂を清め、自らの傷を癒す。' },
    ]},

];

function getCharaById(id) {
  return CHARACTERS.find(c => c.id === id) || null;
}
