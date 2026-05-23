// characters.js
// multiplier: ATK倍率（ダメージ = ATK * multiplier - DEF）
// 火力寄りキャラの強スキルは5～10倍

const CHARACTERS = [

  // ── R ────────────────────────────────────────────

  { id: 1, name: "ギョウタツ", gender: "man", rarity: "r",
    role: "バランス",
    stats: { HP: 780, ATK: 230, DEF: 240, SPD: 210 },
    img: "images/chara_01.webp", cutImg: "images/chara_01_cut.webp", upImg: "images/chara_01_up.webp", battleImg: "images/chara_01_battle.webp",
    favScale: 0.75, favOffsetY: -100,
    skills: [
      { id: 's1', name: '正拳',   cd: 0, cdMax: 1, hit: 100, type: 'attack',  multiplier: 1.0, desc: '真っ直ぐな一撃を放つ。確実に命中する基本攻撃。' },
      { id: 's2', name: '縛打',   cd: 0, cdMax: 1, hit: 80,  type: 'debuff',  multiplier: 1.0, desc: '打撃に縛りの力を込める。命中すると怪異に「縛り」を付与する。' },
      { id: 's3', name: '見切り', cd: 0, cdMax: 1, hit: 100, type: 'buff',    multiplier: 1.0, desc: '次の怪異の攻撃を見切り、自身のDEFを一時的に上昇させる。' },
      { id: 's4', name: '踏込み', cd: 0, cdMax: 1, hit: 90,  type: 'attack',  multiplier: 1.5, desc: '素早く踏み込んで攻撃する。' },
      { id: 's5', name: '転身',   cd: 0, cdMax: 1, hit: 100, type: 'move',    multiplier: 1.0, desc: 'ポジションを変更する。移動のみのターンになる。' },
    ]},

  { id: 2, name: "タキヤマ", gender: "woman", rarity: "r",
    role: "速度寄り",
    stats: { HP: 720, ATK: 210, DEF: 200, SPD: 270 },
    img: "images/chara_02.webp", cutImg: "images/chara_02_cut.webp", upImg: "images/chara_02_up.webp", battleImg: "images/chara_02_battle.webp",
    skills: [
      { id: 's1', name: '閃刃',    cd: 0, cdMax: 1, hit: 90,  type: 'attack',  multiplier: 1.0, desc: '素早い連続斬りで怪異を攻撃する。' },
      { id: 's2', name: '縛鎖',    cd: 0, cdMax: 1, hit: 75,  type: 'debuff',  multiplier: 1.0, desc: '鎖を用いて怪異を縛る。「縛り」を付与する。' },
      { id: 's3', name: '加速',    cd: 0, cdMax: 1, hit: 100, type: 'buff',    multiplier: 1.0, desc: '自身のSPDを一時的に上昇させる。行動順が早くなる。' },
      { id: 's4', name: '切り込み',cd: 0, cdMax: 1, hit: 85,  type: 'move',    multiplier: 1.2, desc: '斬りながら前方へ移動する。移動と攻撃を同時に行う。' },
      { id: 's5', name: '疾走',    cd: 0, cdMax: 1, hit: 100, type: 'move',    multiplier: 1.0, desc: '素早くポジションを移動する。' },
    ]},

  { id: 3, name: "マツバラ", gender: "man", rarity: "r",
    role: "耐久寄り",
    stats: { HP: 840, ATK: 200, DEF: 275, SPD: 200 },
    img: "images/chara_03.webp", cutImg: "images/chara_03_cut.webp", upImg: "images/chara_03_up.webp", battleImg: "images/chara_03_battle.webp",
    skills: [
      { id: 's1', name: '盾撃',    cd: 0, cdMax: 1, hit: 100, type: 'attack',  multiplier: 1.0, desc: '盾で怪異を殴りつける。威力は低いが確実に命中する。' },
      { id: 's2', name: '実体化',  cd: 0, cdMax: 1, hit: 100, type: 'debuff',  multiplier: 1.0, desc: '怪異を現実に縛り付け「実体化」を付与する。以降のダメージが1.5倍になる。' },
      { id: 's3', name: '鉄壁',    cd: 0, cdMax: 1, hit: 100, type: 'buff',    multiplier: 1.0, desc: '自身のDEFを大幅に上昇させる。このターンの被ダメージを軽減する。' },
      { id: 's4', name: '押し込み',cd: 0, cdMax: 1, hit: 90,  type: 'attack',  multiplier: 1.2, desc: '体当たりで怪異を攻撃する。' },
      { id: 's5', name: '前進',    cd: 0, cdMax: 1, hit: 100, type: 'move',    multiplier: 1.0, desc: '近距離ポジションへ前進する。' },
    ]},

  { id: 4, name: "リョウ", gender: "man", rarity: "r",
    role: "火力寄り",
    stats: { HP: 730, ATK: 275, DEF: 205, SPD: 220 },
    img: "images/chara_04.webp", cutImg: "images/chara_04_cut.webp", upImg: "images/chara_04_up.webp", battleImg: "images/chara_04_battle.webp",
    favScale: 0.85, favOffsetY: -30,
    skills: [
      { id: 's1', name: '爆撃',  cd: 0, cdMax: 1, hit: 85, type: 'attack', multiplier: 3.0, desc: '強力な爆発攻撃を放つ。ATKの3倍で計算される高火力。' },
      { id: 's2', name: '縛り手',cd: 0, cdMax: 1, hit: 80, type: 'debuff', multiplier: 1.0, desc: '怪異を縛り動きを封じる。「縛り」を付与してATK・SPDを低下させる。' },
      { id: 's3', name: '猛撃',  cd: 0, cdMax: 1, hit: 65, type: 'attack', multiplier: 7.0, desc: '全力で攻撃する。ATKの7倍の超火力。命中率は低い。' },
      { id: 's4', name: '集中',  cd: 0, cdMax: 1, hit: 100,type: 'buff',   multiplier: 1.0, desc: '次の攻撃のATKを上昇させる。' },
      { id: 's5', name: '後退',  cd: 0, cdMax: 1, hit: 100,type: 'move',   multiplier: 1.0, desc: '遠距離ポジションへ後退する。' },
    ]},

  { id: 7, name: "ミユ", gender: "woman", rarity: "r",
    role: "速度寄り",
    stats: { HP: 710, ATK: 220, DEF: 200, SPD: 280 },
    img: "images/chara_07.webp", cutImg: "images/chara_07_cut.webp", upImg: "images/chara_07_up.webp", battleImg: "images/chara_07_battle.webp",
    skills: [
      { id: 's1', name: '糸斬',   cd: 0, cdMax: 1, hit: 90,  type: 'attack', multiplier: 1.0, desc: '細い糸で怪異を切り裂く。素早い攻撃。' },
      { id: 's2', name: '操糸',   cd: 0, cdMax: 1, hit: 80,  type: 'debuff', multiplier: 1.0, desc: '糸で怪異を縛る。「縛り」付与。' },
      { id: 's3', name: '糸実体', cd: 0, cdMax: 1, hit: 85,  type: 'debuff', multiplier: 1.0, desc: '糸を絡めて怪異を実体化させる。「実体化」付与。' },
      { id: 's4', name: '加速糸', cd: 0, cdMax: 1, hit: 100, type: 'buff',   multiplier: 1.0, desc: '糸を使って自身を加速する。SPDバフ。' },
      { id: 's5', name: '糸走り', cd: 0, cdMax: 1, hit: 100, type: 'move',   multiplier: 1.0, desc: '糸を伝って素早く移動する。' },
    ]},

  { id: 8, name: "カミジョウ", gender: "man", rarity: "r",
    role: "耐久寄り",
    stats: { HP: 850, ATK: 205, DEF: 270, SPD: 200 },
    img: "images/chara_08.webp", cutImg: "images/chara_08_cut.webp", upImg: "images/chara_08_up.webp", battleImg: "images/chara_08_battle.webp",
    skills: [
      { id: 's1', name: '守護撃',  cd: 0, cdMax: 1, hit: 100, type: 'attack', multiplier: 1.0, desc: '守りながら攻撃する。確実に命中する。' },
      { id: 's2', name: '繋ぎ手',  cd: 0, cdMax: 1, hit: 100, type: 'debuff', multiplier: 1.0, desc: '怪異を現実に繋ぎ止める。「実体化」付与。' },
      { id: 's3', name: '結界',    cd: 0, cdMax: 1, hit: 100, type: 'buff',   multiplier: 1.0, desc: '防護の結界を展開する。自身のDEFを上昇させる。' },
      { id: 's4', name: '重撃',    cd: 0, cdMax: 1, hit: 85,  type: 'attack', multiplier: 1.5, desc: '重い一撃を放つ。' },
      { id: 's5', name: '陣取り',  cd: 0, cdMax: 1, hit: 100, type: 'move',   multiplier: 1.0, desc: 'より有利なポジションへ移動する。' },
    ]},

  { id: 12, name: "エリ", gender: "woman", rarity: "r",
    role: "耐久寄り",
    stats: { HP: 820, ATK: 200, DEF: 278, SPD: 205 },
    img: "images/chara_12.webp", cutImg: "images/chara_12_cut.webp", upImg: "images/chara_12_up.webp", battleImg: "images/chara_12_battle.webp",
    skills: [
      { id: 's1', name: '呪打', cd: 0, cdMax: 1, hit: 100, type: 'attack', multiplier: 1.0, desc: '呪いを込めた打撃。確実に命中する。' },
      { id: 's2', name: '呪縛', cd: 0, cdMax: 1, hit: 85,  type: 'debuff', multiplier: 1.0, desc: '呪いで怪異を縛る。「縛り」を付与する。' },
      { id: 's3', name: '呪護', cd: 0, cdMax: 1, hit: 100, type: 'buff',   multiplier: 1.0, desc: '呪いを盾にする。自身のDEFを上昇させる。' },
      { id: 's4', name: '呪撃', cd: 0, cdMax: 1, hit: 80,  type: 'attack', multiplier: 1.5, desc: '強化された呪撃を放つ。' },
      { id: 's5', name: '呪歩', cd: 0, cdMax: 1, hit: 100, type: 'move',   multiplier: 1.0, desc: '呪力を纏いながら移動する。' },
    ]},

  { id: 13, name: "チサカ", gender: "woman", rarity: "r",
    role: "バランス",
    stats: { HP: 760, ATK: 225, DEF: 235, SPD: 215 },
    img: "images/chara_13.webp", cutImg: "images/chara_13_cut.webp", upImg: "images/chara_13_up.webp", battleImg: "images/chara_13_battle.webp",
    skills: [
      { id: 's1', name: '霊打', cd: 0, cdMax: 1, hit: 90,  type: 'attack', multiplier: 1.0, desc: '霊力を込めた打撃で怪異を攻撃する。' },
      { id: 's2', name: '霊縛', cd: 0, cdMax: 1, hit: 80,  type: 'debuff', multiplier: 1.0, desc: '霊力で怪異を縛る。「縛り」付与。' },
      { id: 's3', name: '霊実', cd: 0, cdMax: 1, hit: 85,  type: 'debuff', multiplier: 1.0, desc: '霊力で怪異を実体化させる。「実体化」付与。' },
      { id: 's4', name: '霊護', cd: 0, cdMax: 1, hit: 100, type: 'buff',   multiplier: 1.0, desc: '霊力で身を守る。DEFバフ。' },
      { id: 's5', name: '霊歩', cd: 0, cdMax: 1, hit: 100, type: 'move',   multiplier: 1.0, desc: '霊力を使って素早く移動する。' },
    ]},

  { id: 14, name: "アイム", gender: "man", rarity: "r",
    role: "火力寄り",
    stats: { HP: 740, ATK: 280, DEF: 205, SPD: 210 },
    img: "images/chara_14.webp", cutImg: "images/chara_14_cut.webp", upImg: "images/chara_14_up.webp", battleImg: "images/chara_14_battle.webp",
    skills: [
      { id: 's1', name: '縛鎖',  cd: 0, cdMax: 1, hit: 85,  type: 'debuff', multiplier: 1.0, desc: '怪異に「縛り」を付与する。縛り中はATK・SPDが低下する。' },
      { id: 's2', name: '実体化',cd: 0, cdMax: 1, hit: 100, type: 'debuff', multiplier: 1.0, desc: '怪異に「実体化」を付与する。実体化中は受けるダメージが1.5倍になる。' },
      { id: 's3', name: '灼打',  cd: 0, cdMax: 1, hit: 90,  type: 'attack', multiplier: 3.0, desc: '炎を纏った強烈な一撃。ATKの3倍のダメージ。攻撃と縛り付与を同時に試みる。' },
      { id: 's4', name: '加速',  cd: 0, cdMax: 1, hit: 100, type: 'buff',   multiplier: 1.0, desc: '自身のSPDを一時的に上昇させる。' },
      { id: 's5', name: '祓撃',  cd: 0, cdMax: 1, hit: 65,  type: 'attack', multiplier: 8.0, jittaiMultiplier: 14.0, desc: '祓いの力を解放した超火力スキル。実体化中は14倍のダメージ。命中率は低い。' },
    ]},

  // ── SR ───────────────────────────────────────────

  { id: 5, name: "ナガラ", gender: "man", rarity: "sr",
    role: "火力寄り",
    stats: { HP: 800, ATK: 305, DEF: 230, SPD: 245 },
    img: "images/chara_05.webp", cutImg: "images/chara_05_cut.webp", upImg: "images/chara_05_up.webp", battleImg: "images/chara_05_battle.webp",
    favScale: 0.85, favOffsetY: -30,
    skills: [
      { id: 's1', name: '爆砕',  cd: 0, cdMax: 1, hit: 85, type: 'attack', multiplier: 3.0, desc: '爆発的な力で怪異を攻撃する。ATKの3倍の高火力。' },
      { id: 's2', name: '縛爆',  cd: 0, cdMax: 1, hit: 75, type: 'debuff', multiplier: 1.0, desc: '爆発の衝撃で怪異を縛る。「縛り」付与。命中率は低い。' },
      { id: 's3', name: '実砕',  cd: 0, cdMax: 1, hit: 85, type: 'attack', multiplier: 5.0, jittaiMultiplier: 12.0, desc: '実体化中の怪異に特効の攻撃。通常時ATKの5倍、実体化中は12倍のダメージ。' },
      { id: 's4', name: '猛爆',  cd: 0, cdMax: 1, hit: 60, type: 'attack', multiplier: 10.0,desc: '全力の爆撃。ATKの10倍の超火力。命中率は最も低い。' },
      { id: 's5', name: '爆進',  cd: 0, cdMax: 1, hit: 85, type: 'move',   multiplier: 2.0, desc: '爆発の反動を利用して移動しながら攻撃する。ATKの2倍のダメージ。' },
    ]},

  { id: 10, name: "フミカ", gender: "woman", rarity: "sr",
    role: "速度寄り",
    stats: { HP: 760, ATK: 250, DEF: 225, SPD: 300 },
    img: "images/chara_10.webp", cutImg: "images/chara_10_cut.webp", upImg: "images/chara_10_up.webp", battleImg: "images/chara_10_battle.webp",
    favScale: 0.85, favOffsetY: -100,
    skills: [
      { id: 's1', name: '閃撃',   cd: 0, cdMax: 1, hit: 90,  type: 'attack', multiplier: 1.5, desc: '光速の一撃を放つ。ATKの1.5倍のダメージ。' },
      { id: 's2', name: '速縛',   cd: 0, cdMax: 1, hit: 80,  type: 'debuff', multiplier: 1.0, desc: '素早い動きで怪異を縛る。「縛り」付与。' },
      { id: 's3', name: '速実',   cd: 0, cdMax: 1, hit: 90,  type: 'debuff', multiplier: 1.0, desc: '素早く怪異を実体化させる。「実体化」付与。' },
      { id: 's4', name: '超加速', cd: 0, cdMax: 1, hit: 100, type: 'buff',   multiplier: 1.0, desc: '自身のSPDを大幅に上昇させる。行動順が大きく前倒しになる。' },
      { id: 's5', name: '瞬歩',   cd: 0, cdMax: 1, hit: 100, type: 'move',   multiplier: 1.0, desc: '瞬時に任意のポジションへ移動する。' },
    ]},

  { id: 15, name: "アキ", gender: "woman", rarity: "sr",
    role: "速度・支援寄り",
    stats: { HP: 770, ATK: 235, DEF: 230, SPD: 295 },
    img: "images/chara_15.webp", cutImg: "images/chara_15_cut.webp", upImg: "images/chara_15_up.webp", battleImg: "images/chara_15_battle.webp",
    favScale: 0.85, favOffsetY: -30,
    skills: [
      { id: 's1', name: '祓斬',  cd: 0, cdMax: 1, hit: 85,  type: 'attack', multiplier: 1.5, desc: '祓いの力を込めた斬撃。ATKの1.5倍のダメージ。' },
      { id: 's2', name: '繋縛',  cd: 0, cdMax: 1, hit: 75,  type: 'debuff', multiplier: 1.0, desc: '怪異を繋ぎ止めながら縛る。「縛り」と「実体化」の同時付与を試みる。' },
      { id: 's3', name: '加護',  cd: 0, cdMax: 1, hit: 100, type: 'buff',   multiplier: 1.0, desc: '仲間全員のDEFを一時的に上昇させる。' },
      { id: 's4', name: '疾撃',  cd: 0, cdMax: 1, hit: 90,  type: 'attack', multiplier: 2.0, desc: '素早く斬りかかる。ATKの2倍のダメージ。' },
      { id: 's5', name: '風走り',cd: 0, cdMax: 1, hit: 100, type: 'move',   multiplier: 1.0, desc: '風のように素早く移動する。' },
    ]},

  { id: 17, name: "ベン", gender: "man", rarity: "sr",
    role: "バランス（レオン）",
    stats: { HP: 800, ATK: 255, DEF: 250, SPD: 260 },
    img: "images/chara_17.webp", cutImg: "images/chara_17_cut.webp", upImg: "images/chara_17_up.webp", battleImg: "images/chara_17_battle.webp",
    skills: [
      { id: 's1', name: '模写',   cd: 0, cdMax: 1, hit: 100, type: 'special', multiplier: 1.0, desc: '他の紡ぎ手のスキルを一時的に模倣する。疑似的な重複編成を可能にする唯一のスキル。' },
      { id: 's2', name: '道化撃', cd: 0, cdMax: 1, hit: 90,  type: 'attack',  multiplier: 2.0, desc: '道化師の動きで攪乱しながら攻撃する。ATKの2倍のダメージ。' },
      { id: 's3', name: '仮面',   cd: 0, cdMax: 1, hit: 100, type: 'buff',    multiplier: 1.0, desc: '仮面を付け直し、このターンの状態異常を無効化する。' },
      { id: 's4', name: '乱射',   cd: 0, cdMax: 1, hit: 55,  type: 'attack',  multiplier: 6.0, desc: '無数の攻撃を乱れ打つ。ATKの6倍の高火力。命中率は低い。' },
      { id: 's5', name: '転換',   cd: 0, cdMax: 1, hit: 100, type: 'move',    multiplier: 1.0, desc: 'ポジションを任意に変更する。そのターンはこの移動のみ行動可能。' },
    ]},

  { id: 18, name: "ジョー", gender: "woman", rarity: "sr",
    role: "火力寄り",
    stats: { HP: 760, ATK: 300, DEF: 225, SPD: 240 },
    img: "images/chara_18.webp", cutImg: "images/chara_18_cut.webp", upImg: "images/chara_18_up.webp", battleImg: "images/chara_18_battle.webp",
    skills: [
      { id: 's1', name: '業火撃', cd: 0, cdMax: 1, hit: 85, type: 'attack', multiplier: 3.0, desc: '業火を纏った強烈な一撃。ATKの3倍のダメージ。' },
      { id: 's2', name: '炎縛',   cd: 0, cdMax: 1, hit: 75, type: 'debuff', multiplier: 1.0, desc: '炎で怪異を縛る。「縛り」付与。命中率は低い。' },
      { id: 's3', name: '爆炎',   cd: 0, cdMax: 1, hit: 60, type: 'attack', multiplier: 9.0, desc: '爆発的な炎を解放する。ATKの9倍の超火力。命中率は非常に低い。' },
      { id: 's4', name: '炎加速', cd: 0, cdMax: 1, hit: 100,type: 'buff',   multiplier: 1.0, desc: '炎の勢いで自身を加速する。ATKとSPDを同時に上昇させる。' },
      { id: 's5', name: '炎走',   cd: 0, cdMax: 1, hit: 80, type: 'move',   multiplier: 2.0, desc: '炎を纏いながら移動して攻撃する。ATKの2倍のダメージ。' },
    ]},

  { id: 19, name: "アンナ", gender: "woman", rarity: "sr",
    role: "耐久寄り",
    stats: { HP: 900, ATK: 230, DEF: 300, SPD: 225 },
    img: "images/chara_19.webp", cutImg: "images/chara_19_cut.webp", upImg: "images/chara_19_up.webp", battleImg: "images/chara_19_battle.webp",
    skills: [
      { id: 's1', name: '狼牙撃', cd: 0, cdMax: 1, hit: 100, type: 'attack', multiplier: 1.0, desc: '狼の力を宿した確実な一撃。' },
      { id: 's2', name: '鎖縛',   cd: 0, cdMax: 1, hit: 90,  type: 'debuff', multiplier: 1.0, desc: '鎖で怪異を縛る。「縛り」付与。' },
      { id: 's3', name: '狼盾',   cd: 0, cdMax: 1, hit: 100, type: 'buff',   multiplier: 1.0, desc: '狼の加護で身を守る。DEFを大幅に上昇させる。' },
      { id: 's4', name: '繋ぎ鎖', cd: 0, cdMax: 1, hit: 95,  type: 'debuff', multiplier: 1.0, desc: '鎖で怪異を現実に繋ぎ止める。「実体化」付与。' },
      { id: 's5', name: '狼走り', cd: 0, cdMax: 1, hit: 100, type: 'move',   multiplier: 1.0, desc: '狼のように素早く移動する。' },
    ]},

  { id: 20, name: "ミズキ", gender: "man", rarity: "sr",
    role: "速度寄り",
    stats: { HP: 780, ATK: 245, DEF: 228, SPD: 298 },
    img: "images/chara_20.webp", cutImg: "images/chara_20_cut.webp", upImg: "images/chara_20_up.webp", battleImg: "images/chara_20_battle.webp",
    skills: [
      { id: 's1', name: '蛇牙',   cd: 0, cdMax: 1, hit: 90,  type: 'attack', multiplier: 1.5, desc: '蛇のように素早い一撃を放つ。ATKの1.5倍のダメージ。' },
      { id: 's2', name: '蛇縛',   cd: 0, cdMax: 1, hit: 80,  type: 'debuff', multiplier: 1.0, desc: '蛇の力で怪異を縛る。「縛り」付与。' },
      { id: 's3', name: '蛇実',   cd: 0, cdMax: 1, hit: 85,  type: 'debuff', multiplier: 1.0, desc: '蛇の視線で怪異を実体化させる。「実体化」付与。' },
      { id: 's4', name: '毒牙',   cd: 0, cdMax: 1, hit: 65,  type: 'attack', multiplier: 5.0, desc: '毒を纏った強烈な攻撃。ATKの5倍のダメージ。命中率は低い。' },
      { id: 's5', name: '蛇走り', cd: 0, cdMax: 1, hit: 100, type: 'move',   multiplier: 1.0, desc: '蛇のようにしなやかに移動する。' },
    ]},

  // ── UR ───────────────────────────────────────────

  { id: 6, name: "エミ", gender: "woman", rarity: "ur",
    role: "速度・撹乱寄り",
    stats: { HP: 840, ATK: 270, DEF: 255, SPD: 330 },
    img: "images/chara_06.webp", cutImg: "images/chara_06_cut.webp", upImg: "images/chara_06_up.webp", battleImg: "images/chara_06_battle.webp",
    favScale: 0.85, favOffsetY: -30,
    skills: [
      { id: 's1', name: '幻撃',   cd: 0, cdMax: 1, hit: 90,  type: 'attack',  multiplier: 2.0, desc: '幻影を使った素早い攻撃。ATKの2倍のダメージ。' },
      { id: 's2', name: '幻縛',   cd: 0, cdMax: 1, hit: 85,  type: 'debuff',  multiplier: 1.0, desc: '幻影で怪異を縛る。「縛り」付与。' },
      { id: 's3', name: '幻実',   cd: 0, cdMax: 1, hit: 90,  type: 'debuff',  multiplier: 1.0, desc: '幻影を使って怪異を実体化させる。「実体化」付与。成功率が高い。' },
      { id: 's4', name: '超速',   cd: 0, cdMax: 1, hit: 100, type: 'buff',    multiplier: 1.0, desc: '自身のSPDを極限まで上昇させる。行動順が最前列になる。' },
      { id: 's5', name: '幻影走', cd: 0, cdMax: 1, hit: 80,  type: 'move',    multiplier: 3.0, desc: '幻影を残しながら移動して攻撃する。ATKの3倍のダメージ。' },
    ]},

  { id: 9, name: "ルナ＆マーヤ", gender: "woman", rarity: "ur",
    role: "バランス・複合",
    stats: { HP: 900, ATK: 295, DEF: 280, SPD: 275 },
    img: "images/chara_09.webp", cutImg: "images/chara_09_cut.webp", upImg: "images/chara_09_up.webp", battleImg: "images/chara_09_battle.webp",
    favScale: 0.85, favOffsetY: -30,
    skills: [
      { id: 's1', name: '双星撃', cd: 0, cdMax: 1, hit: 90,  type: 'attack',  multiplier: 3.0, desc: '二人が同時に攻撃する。ATKの3倍の連携ダメージ。' },
      { id: 's2', name: '双縛',   cd: 0, cdMax: 1, hit: 85,  type: 'debuff',  multiplier: 1.0, desc: '二人がかりで怪異を縛る。「縛り」付与。成功率が高い。' },
      { id: 's3', name: '双実',   cd: 0, cdMax: 1, hit: 90,  type: 'debuff',  multiplier: 1.0, desc: '二人の力で怪異を実体化させる。「実体化」付与。成功率が高い。' },
      { id: 's4', name: '双護',   cd: 0, cdMax: 1, hit: 100, type: 'buff',    multiplier: 1.0, desc: '互いに庇い合う。ATKとDEFを同時に上昇させる。' },
      { id: 's5', name: '双星爆', cd: 0, cdMax: 1, hit: 65,  type: 'attack',  multiplier: 8.0, desc: '二人の力を爆発させる超技。ATKの8倍の超火力。命中率は低い。' },
    ]},

  { id: 11, name: "ユズハ", gender: "woman", rarity: "ur",
    role: "火力寄り",
    stats: { HP: 850, ATK: 330, DEF: 250, SPD: 285 },
    img: "images/chara_11.webp", cutImg: "images/chara_11_cut.webp", upImg: "images/chara_11_up.webp", battleImg: "images/chara_11_battle.webp",
    skills: [
      { id: 's1', name: '狂撃',  cd: 0, cdMax: 1, hit: 80,  type: 'attack',  multiplier: 3.0,  desc: '狂気を解放した強烈な一撃。ATKの3倍のダメージ。' },
      { id: 's2', name: '狂縛',  cd: 0, cdMax: 1, hit: 75,  type: 'debuff',  multiplier: 1.0,  desc: '狂気の力で怪異を縛る。「縛り」付与。命中率は低い。' },
      { id: 's3', name: '狂爆',  cd: 0, cdMax: 1, hit: 55,  type: 'attack',  multiplier: 10.0, jittaiMultiplier: 18.0, desc: '狂気が爆発する。ATKの10倍の超火力。実体化中は18倍。命中率は最も低い。' },
      { id: 's4', name: '狂化',  cd: 0, cdMax: 1, hit: 100, type: 'buff',    multiplier: 1.0,  desc: '狂気を纏いATKを大幅に上昇させる。次の攻撃が強力になる。' },
      { id: 's5', name: '狂走',  cd: 0, cdMax: 1, hit: 75,  type: 'move',    multiplier: 5.0,  desc: '狂気の速度で移動しながら攻撃する。ATKの5倍のダメージ。' },
    ]},

  { id: 16, name: "アズキ", gender: "woman", rarity: "ur",
    role: "耐久寄り",
    stats: { HP: 950, ATK: 255, DEF: 325, SPD: 255 },
    img: "images/chara_16.webp", cutImg: "images/chara_16_cut.webp", upImg: "images/chara_16_up.webp", battleImg: "images/chara_16_battle.webp",
    skills: [
      { id: 's1', name: '霧縛',   cd: 0, cdMax: 1, hit: 85,  type: 'debuff',  multiplier: 1.0, desc: '霧を纏わせ怪異を縛る。「縛り」付与。' },
      { id: 's2', name: '結界',   cd: 0, cdMax: 1, hit: 100, type: 'buff',    multiplier: 1.0, desc: '強固な結界を展開する。DEFを大幅に上昇させ被ダメージを軽減する。' },
      { id: 's3', name: '繋ぎ手', cd: 0, cdMax: 1, hit: 100, type: 'debuff',  multiplier: 1.0, desc: '怪異を現実に繋ぎ止める。「実体化」付与。確実に成功する。' },
      { id: 's4', name: '散霧',   cd: 0, cdMax: 1, hit: 75,  type: 'attack',  multiplier: 2.0, desc: '霧を爆発させて攻撃する。ATKの2倍のダメージ。' },
      { id: 's5', name: '霧歩き', cd: 0, cdMax: 1, hit: 100, type: 'move',    multiplier: 1.0, desc: '霧に紛れて移動する。' },
    ]},

];

function getCharaById(id) {
  return CHARACTERS.find(c => c.id === id) || null;
}
