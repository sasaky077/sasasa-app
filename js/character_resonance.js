// Zeraphia 共鳴モジュール
// index.html から分離。読み込み順: character_resonance.js -> resonance_system.js -> resonance_ui.js

const MAX_LIMIT_BREAK = 4;

const LIMIT_BREAK_RATE = 0.04;

// エリ専用共鳴ボーナス。
// DBにはlimitBreakだけを保存し、効果はキャラIDとLvから毎回導出する。
const ERI_RESONANCE_BONUSES = {
  1: {
    title: '基礎共鳴',
    summary: 'HP・ATKが5%上昇',
    detail: 'エリの基礎HPとATKが5%上昇する。'
  },
  2: {
    title: '導きの残光',
    summary: '「謎の光」に味方回復を追加',
    detail: '謎の光の攻撃後、HP割合が最も低い味方をエリのATK×0.35回復する。'
  },
  3: {
    title: '連鎖領域拡張',
    summary: 'コンボ発動レンジ：直線 → 十字',
    detail: '共鳴する閃光の発動レンジが「直線上すべて」から「十字すべて」へ拡張する。'
  },
  4: {
    title: '光脈の同調',
    summary: 'コンボ時、味方全体ATK+10%',
    detail: 'エリのコンボ発動後、味方全体のATKを1ターン10%上昇させる。'
  }
};
window.ERI_RESONANCE_BONUSES = ERI_RESONANCE_BONUSES;


// イグニス専用共鳴ボーナス（R）。
// Lv.1は通常R共通のHP・ATK+4%。Lv.2以降は戦闘側でprofile/configを参照して適用する。
const IGNIS_RESONANCE_BONUSES = {
  1: {
    title: '猛炎の基礎',
    summary: 'HP・ATKが4%上昇',
    detail: 'イグニスの基礎HPとATKが4%上昇する。'
  },
  2: {
    title: '燃え残る闘志',
    summary: '「ブレイブ・スマッシュ」後、自身を回復',
    detail: 'ブレイブ・スマッシュの攻撃後、自身のHPをイグニスのATK×0.20回復する。'
  },
  3: {
    title: '炎陣拡張',
    summary: 'コンボ発動レンジ：隣接十字 → 十字全域',
    detail: 'ブレイズ・リレーの発動レンジが「上下左右1マス」から「十字上すべて」へ拡張する。'
  },
  4: {
    title: '猛炎連鎖',
    summary: 'コンボ倍率をATK×0.65へ強化',
    detail: 'ブレイズ・リレーの効果範囲は前方横3マスのまま、ダメージ倍率をATK×0.65へ強化する。'
  }
};
window.IGNIS_RESONANCE_BONUSES = IGNIS_RESONANCE_BONUSES;

// ロゼ専用共鳴ボーナス。
const ROSE_RESONANCE_BONUSES = {
  1: {
    title: '早咲きの号令',
    summary: 'ULT必要LINKコスト -1',
    detail: 'イグゾースト・ガーデンの必要LINKコストを1減少する。'
  },
  2: {
    title: '蔓薔薇の歩み',
    summary: '移動範囲：前方横3＋後方横3',
    detail: '移動範囲を前方横3マスと後方横3マスへ拡張する。'
  },
  3: {
    title: '薔薇園の侵食',
    summary: 'コンボ反応範囲：十字 → 十字＋X字',
    detail: 'ローズ・エコーの反応範囲を「十字すべて」から「十字＋X字すべて」へ拡張する。'
  },
  4: {
    title: '棘園の支配',
    summary: 'コンボATK-15%・25%スタン追加',
    detail: 'ローズ・エコーのATK低下を15%へ強化し、25%の確率で1ターンスタンを追加する。'
  }
};
window.ROSE_RESONANCE_BONUSES = ROSE_RESONANCE_BONUSES;


// その他キャラクター用共鳴ボーナス。
// キャラ詳細・共鳴画面では、全キャラクターに4段階の内容を表示する。
const CHARACTER_RESONANCE_BONUSES = {
  2: {
    1: { title:'基礎共鳴', summary:'HP・ATKが4%上昇', detail:'ネムの基礎HPとATKが4%上昇する。' },
    2: { title:'深いまどろみ', summary:'通常スキルの威力を強化', detail:'ぐっどないとのダメージ倍率をATK×0.65へ強化する。' },
    3: { title:'夢域拡張', summary:'コンボ反応範囲を周囲8マスへ拡張', detail:'スリープ・チェインの反応範囲を周囲8マスへ拡張する。' },
    4: { title:'夢鎖深化', summary:'コンボ威力強化・スタン40%', detail:'コンボのダメージ倍率をATK×0.30へ強化し、スタン確率を40%へ上昇する。' }
  },
  3: {
    1: { title:'星環短縮', summary:'ULT必要LINKコスト -1', detail:'星環の約束の必要LINKコストを1減少する。' },
    2: { title:'星読み深化', summary:'HP回復70%・critical+20%', detail:'星読みの予兆のHP回復量を最大HPの70%へ、味方全体critical上昇量を20%へ強化する。' },
    3: { title:'星路拡張', summary:'移動範囲に左右1マスを追加', detail:'前方直線3マスの移動範囲に、左右1マスを追加する。' },
    4: { title:'全天の星図', summary:'コンボ反応範囲：X字 → 十字＋X字', detail:'星導の余光の反応範囲をX字上すべてから、十字＋X字上すべてへ拡張する。' }
  },
  4: {
    1: { title:'基礎共鳴', summary:'HP・ATKが4%上昇', detail:'アルノの基礎HPとATKが4%上昇する。' },
    2: { title:'高速処刑', summary:'通常スキル威力・critical率強化', detail:'ギルティの倍率をATK×1.70、critical率を75%へ強化する。' },
    3: { title:'疾走連鎖', summary:'コンボ反応範囲を十字全域へ拡張', detail:'クイック・ギルティの反応範囲を十字上すべてへ拡張する。' },
    4: { title:'断罪加速', summary:'ULT×3.0・コンボ×1.15・critical時ATK+15%', detail:'エグゼキュートをATK×3.0、コンボをATK×1.15へ強化し、critical発生時に自身のATKを1ターン15%上昇する。' }
  },
  5: {
    1: { title:'基礎共鳴', summary:'HP・ATKが4%上昇', detail:'クラリネの基礎HPとATKが4%上昇する。' },
    2: { title:'再演準備', summary:'通常スキル必要LINKコスト -1', detail:'85%の効果量で再発動するアンコールの必要LINKコストを1減少する。' },
    3: { title:'喝采領域', summary:'コンボ反応範囲を周囲8マスへ拡張', detail:'コンボの反応範囲を周囲8マスへ拡張する。' },
    4: { title:'アンコール', summary:'コンボ威力強化・次の通常スキル軽減', detail:'コンボ倍率をATK×0.55へ強化し、次に使用する通常スキルの必要LINKを1軽減する。' }
  },
  8: {
    1: { title:'薬効促進', summary:'通常スキル必要LINKコスト -1', detail:'Overdoseの必要LINKコストを1減少する。' },
    2: { title:'高濃度投与', summary:'通常スキルATK上昇：20% → 30%', detail:'Overdoseによる味方全体のATK上昇量を30%へ強化する。' },
    3: { title:'極性展開', summary:'コンボ反応範囲：十字 → 十字＋X字', detail:'ケミカル・シナジーの反応範囲を十字上すべてから、十字＋X字上すべてへ拡張する。' },
    4: { title:'救命触媒', summary:'コンボATK+15%・最低HP味方10%回復', detail:'ケミカル・シナジーのATK上昇量を15%へ強化し、HP割合が最も低い味方を最大HPの10%回復する。' }
  },
  9: {
    1: { title:'基礎共鳴', summary:'HP・ATKが4%上昇', detail:'パトラの基礎HPとATKが4%上昇する。' },
    2: { title:'服従補助', summary:'通常スキル対象の味方ATK+10%', detail:'通常スキルで移動させた味方のATKを1ターン10%上昇する。' },
    3: { title:'支配領域', summary:'コンボ反応範囲を周囲8マスへ拡張', detail:'コンボの反応範囲を周囲8マスへ拡張する。' },
    4: { title:'絶対服従', summary:'コンボ威力強化・敵ATK-10%', detail:'コンボ倍率をATK×0.40へ強化し、対象のATKを1ターン10%低下させる。' }
  },
  10: {
    1: { title:'基礎共鳴', summary:'HP・ATKが4%上昇', detail:'フローラの基礎HPとATKが4%上昇する。' },
    2: { title:'休息深化', summary:'全体回復22%・瀕死回復36%', detail:'みんな、休憩しよ～の回復量を最大HPの22%へ、HP50%以下の味方への回復量を36%へ強化する。' },
    3: { title:'癒やしの輪', summary:'コンボ反応範囲を周囲8マスへ拡張', detail:'ひと休みしよ～の反応範囲を斜め隣接4マスから周囲8マスへ拡張する。' },
    4: { title:'本気の休息', summary:'コンボ12%/18%・ULT50%/70%', detail:'コンボ回復を12%、HP50%以下なら18%へ強化する。ULT回復を50%、HP50%以下なら70%へ強化する。' }
  },
  11: {
    1: { title:'基礎共鳴', summary:'HP・ATKが4%上昇', detail:'シグレの基礎HPとATKが4%上昇する。' },
    2: { title:'剣圧強化', summary:'通常スキル倍率をATK×1.40へ強化', detail:'通常スキルのダメージ倍率をATK×1.40へ強化する。' },
    3: { title:'間合い拡張', summary:'コンボ反応範囲を周囲8マスへ拡張', detail:'コンボの反応範囲を周囲8マスへ拡張する。' },
    4: { title:'押し切り', summary:'コンボ威力強化・押し出し75%', detail:'コンボ倍率をATK×0.60へ強化し、押し出し成功率を75%へ上昇する。' }
  },
  12: {
    1: { title:'疾風の共鳴', summary:'ATKが5%上昇', detail:'ハヤテの基礎ATKが5%上昇する。' },
    2: { title:'月穿ち強化', summary:'通常スキル倍率をATK×2.10へ強化', detail:'「閃駆・月穿ち」のダメージ倍率をATK×2.10へ強化する。' },
    3: { title:'閃光経路拡張', summary:'コンボ反応範囲をX字全体へ拡張', detail:'コンボの反応範囲を斜め隣接4マスからX字上すべてへ拡張する。' },
    4: { title:'雷光帰還', summary:'帰還成功時、1ターン1回LINK+1', detail:'ヒットアンドアウェイモード中、攻撃後の帰還に成功すると1ターンに1回までLINKを1回復する。' }
  },
  13: {
    1: { title:'基礎共鳴', summary:'HP・ATKが4%上昇', detail:'ミアの基礎HPとATKが4%上昇する。' },
    2: { title:'精密狙撃', summary:'通常スキル威力・critical率強化', detail:'通常スキル倍率をATK×2.05、critical率を30%へ強化する。' },
    3: { title:'月猫の星域', summary:'コンボ反応範囲を十字＋X字へ拡張', detail:'コンボの反応範囲を十字＋X字上すべてへ拡張する。' },
    4: { title:'審判の爪痕', summary:'コンボ威力・critical強化、ATK-10%', detail:'コンボ倍率をATK×0.80、critical率を25%へ強化し、敵のATKを10%低下させる。' }
  },
  14: {
    1: { title:'基礎共鳴', summary:'HP・ATKが4%上昇', detail:'アヤネの基礎HPとATKが4%上昇する。' },
    2: { title:'奇襲強化', summary:'通常スキル倍率をATK×1.15へ強化', detail:'通常スキルのダメージ倍率をATK×1.15へ強化する。' },
    3: { title:'死角拡張', summary:'コンボ反応範囲を周囲8マスへ拡張', detail:'コンボの反応範囲を周囲8マスへ拡張する。' },
    4: { title:'背面必殺', summary:'コンボ威力強化・背面倍率1.50倍', detail:'コンボ倍率をATK×0.60へ強化し、背面攻撃倍率を1.50倍へ上昇する。' }
  },
  15: {
    1: { title:'基礎共鳴', summary:'HP・ATKが4%上昇', detail:'エルテナの基礎HPとATKが4%上昇する。' },
    2: { title:'守護転移', summary:'通常スキル対象へ10%ガード', detail:'通常スキルで移動させた味方に、1ターン10%ガードを付与する。' },
    3: { title:'守護圏拡張', summary:'コンボ反応範囲を周囲8マスへ拡張', detail:'コンボの反応範囲を周囲8マスへ拡張する。' },
    4: { title:'堅牢なる反響', summary:'コンボ威力強化・押し出し75%', detail:'コンボ倍率をATK×0.50へ強化し、押し出し成功率を75%へ上昇する。' }
  },
  16: {
    1: { title:'基礎共鳴', summary:'HP・ATKが4%上昇', detail:'ミトの基礎HPとATKが4%上昇する。' },
    2: { title:'実体侵食', summary:'通常スキル威力・実体化率強化', detail:'通常スキル倍率をATK×0.85、実体化成功率を90%へ強化する。' },
    3: { title:'侵食圏拡張', summary:'コンボ反応範囲を周囲8マスへ拡張', detail:'コンボの反応範囲を周囲8マスへ拡張する。' },
    4: { title:'深層実体化', summary:'コンボ威力強化・実体化率60%', detail:'コンボ倍率をATK×0.45へ強化し、実体化成功率を60%へ上昇する。' }
  },
  17: {
    1: { title:'基礎共鳴', summary:'HP・ATKが4%上昇', detail:'アンジェの基礎HPとATKが4%上昇する。' },
    2: { title:'治癒増幅', summary:'通常スキル回復量+20%', detail:'通常スキルの回復量を20%増加する。' },
    3: { title:'祈りの縦糸', summary:'コンボ反応範囲を縦列全域へ拡張', detail:'コンボの反応範囲を同じ縦列上すべてへ拡張する。' },
    4: { title:'慈愛の余波', summary:'コンボ回復12%・最低HP味方+5%', detail:'コンボ回復量を最大HPの12%へ強化し、最もHPが低い味方を追加で最大HPの5%回復する。' }
  }
};
window.CHARACTER_RESONANCE_BONUSES = CHARACTER_RESONANCE_BONUSES;



// ============================================================
// バトル用共鳴実効果マスター
// 表示定義と同じキャラID / 共鳴Lvで管理する。
// resonance_system.js はこの宣言データを汎用適用し、キャラID別switchを持たない。
// ============================================================
const CHARACTER_RESONANCE_EFFECTS = {
  1: {
    2: [{ type:'skillSet', skillId:'s1', values:{ resonanceHealLowestAtkRate:0.35 } }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_cross_all' } }],
    4: [{ type:'comboSkillSet', values:{ resonanceTeamAtkUp:{ rate:1.10, duration:1 } } }]
  },
  2: {
    2: [{ type:'skillSet', skillId:'s1', values:{ multiplier:0.65 } }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_around8' } }],
    4: [
      { type:'comboSkillSet', values:{ multiplier:0.30 } },
      { type:'comboEffectSet', effectType:'stun', values:{ hit:40 } }
    ]
  },
  3: {
    1: [{ type:'skillLinkCostDelta', skillId:'ult', delta:-1, min:0 }],
    2: [
      { type:'skillOptionSet', skillId:'s1', optionList:'randomOptions', effectType:'lowest_hp_heal', values:{ rate:0.70, label:'一番HPの低い味方を最大HPの70%回復' } },
      { type:'skillOptionSet', skillId:'s1', optionList:'randomOptions', effectType:'all_critical_up', values:{ rate:0.20, label:'味方全体critical率+20%' } }
    ],
    3: [{ type:'characterSet', values:{ moveType:'line_front_3_side' } }],
    4: [{ type:'comboTriggerSet', values:{ range:'combo_star_all' } }]
  },
  4: {
    2: [{ type:'skillSet', skillId:'s1', values:{ multiplier:1.70, criticalRate:0.75 } }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_cross_all' } }],
    4: [
      { type:'skillSet', skillId:'ult', values:{ multiplier:3.0 } },
      { type:'comboSkillSet', values:{ multiplier:1.15, resonanceSelfAtkUpOnCritical:{ rate:1.15, duration:1 } } }
    ]
  },
  5: {
    2: [{ type:'skillSet', skillId:'s1', values:{ linkCost:2 } }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_around8' } }],
    4: [{ type:'comboSkillSet', values:{ multiplier:0.55, resonanceNextS1Discount:1 } }]
  },
  6: {
    2: [{ type:'skillSet', skillId:'s1', values:{ resonanceSelfHealAtkRate:0.20 } }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_cross_all' } }],
    4: [{ type:'comboSkillSet', values:{ multiplier:0.65 } }]
  },
  7: {
    1: [{ type:'skillLinkCostDelta', skillId:'ult', delta:-1, min:0 }],
    2: [{ type:'characterSet', values:{ moveType:'rose_resonance_move' } }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_star_all' } }],
    4: [
      { type:'comboEffectSet', effectType:'atk_down', values:{ rate:0.85 } },
      { type:'comboEffectAddIfMissing', effectType:'stun', effect:{ type:'stun', target:'enemy', hit:25, duration:1 } }
    ]
  },
  8: {
    1: [{ type:'skillLinkCostDelta', skillId:'s1', delta:-1, min:0 }],
    2: [{ type:'skillEffectSet', skillId:'s1', effectType:'atk_up', values:{ rate:1.30 } }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_star_all' } }],
    4: [
      { type:'comboEffectSet', effectType:'atk_up', values:{ rate:1.15 } },
      { type:'comboSkillSet', values:{ resonanceHealLowestSourceHpRate:0.10 } }
    ]
  },
  9: {
    2: [{ type:'skillSet', skillId:'s1', values:{ resonanceAffectedAllyAtkUp:{ rate:1.10, duration:1 } } }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_around8' } }],
    4: [
      { type:'comboSkillSet', values:{ multiplier:0.40 } },
      { type:'comboEffectSet', effectType:'atk_down', values:{ rate:0.90 } }
    ]
  },
  10: {
    2: [
      { type:'skillSet', skillId:'s1', values:{ healRate:0.22, lowHpHealRate:0.36 } },
      { type:'skillEffectSet', skillId:'s1', effectType:'heal', values:{ rate:0.22 } }
    ],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_around8' } }],
    4: [
      { type:'comboSkillSet', values:{ healRate:0.12, lowHpHealRate:0.18 } },
      { type:'comboEffectSet', effectType:'heal', values:{ rate:0.12 } },
      { type:'skillSet', skillId:'ult', values:{ healRate:0.50, lowHpHealRate:0.70 } },
      { type:'skillEffectSet', skillId:'ult', effectType:'heal', values:{ rate:0.50 } }
    ]
  },
  11: {
    2: [{ type:'skillSet', skillId:'s1', values:{ multiplier:1.40 } }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_around8' } }],
    4: [
      { type:'comboSkillSet', values:{ multiplier:0.60 } },
      { type:'comboEffectSet', effectType:'push_1', values:{ hit:75 } }
    ]
  },
  12: {
    2: [{ type:'skillSet', skillId:'s1', values:{ multiplier:2.10 } }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_x_all' } }],
    4: [{ type:'characterSet', values:{ hitAndAwayLinkRefund:1, hitAndAwayLinkRefundPerTurn:1 } }]
  },
  13: {
    2: [{ type:'skillSet', skillId:'s1', values:{ multiplier:2.05, criticalRate:0.30 } }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_star_all' } }],
    4: [
      { type:'comboSkillSet', values:{ multiplier:0.80, criticalRate:0.25 } },
      { type:'comboEffectAddIfMissing', effectType:'atk_down', effect:{ type:'atk_down', target:'enemy', hit:100, duration:1, rate:0.90 } }
    ]
  },
  14: {
    2: [{ type:'skillSet', skillId:'s1', values:{ multiplier:1.15 } }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_around8' } }],
    4: [{ type:'comboSkillSet', values:{ multiplier:0.60, backstabMultiplier:1.50 } }]
  },
  15: {
    2: [{ type:'skillSet', skillId:'s1', values:{ resonanceAffectedAllyGuard:{ rate:0.10, duration:1 } } }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_around8' } }],
    4: [
      { type:'comboSkillSet', values:{ multiplier:0.50 } },
      { type:'comboEffectSet', effectType:'push_1', values:{ hit:75 } }
    ]
  },
  16: {
    2: [
      { type:'skillSet', skillId:'s1', values:{ multiplier:0.85 } },
      { type:'skillEffectSet', skillId:'s1', effectType:'jittai', values:{ hit:90 } }
    ],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_around8' } }],
    4: [
      { type:'comboSkillSet', values:{ multiplier:0.45 } },
      { type:'comboEffectSet', effectType:'jittai', values:{ hit:60 } }
    ]
  },
  17: {
    2: [{ type:'skillScale', skillId:'s1', field:'healRate', multiplier:1.20, fallback:0.35 }],
    3: [{ type:'comboTriggerSet', values:{ range:'combo_line_all' } }],
    4: [{ type:'comboSkillSet', values:{ healRate:0.12, resonanceHealLowestTargetHpRate:0.05 } }]
  }
};
window.CHARACTER_RESONANCE_EFFECTS = CHARACTER_RESONANCE_EFFECTS;

function getCharacterResonanceEffects(charaId){
  return CHARACTER_RESONANCE_EFFECTS[Number(charaId)] || null;
}
window.getCharacterResonanceEffects = getCharacterResonanceEffects;

// ── 共鳴用進化素材 ──────────────────────────────────
// 保存先はlocalStorage。DBスキーマを増やさず、まずは素材所持数を永続化する。
const EVOLUTION_MATERIAL_STORAGE_KEY = 'zeraphia_evolution_materials_v1';
const EVOLUTION_MATERIAL_MASTER = {
  eri_origin_wing: {
    id: 'eri_origin_wing',
    name: '原初の翼環',
    shortName: '原初の翼環',
    img: 'images/item_wing.webp',
    exclusiveCharaId: 1,
    desc: 'エリの魂と世界の残響を結び直す、特別な共鳴素材。'
  },
  kyoumei_stone: {
    id: 'kyoumei_stone',
    name: '共鳴石',
    shortName: '共鳴石',
    img: 'images/item_kyoumeistone.webp',
    desc: 'プリモアの魂を同調させる神秘的な石。'
  },
  soul_vessel_logos: {
    id: 'soul_vessel_logos',
    name: '魂の器（LOGOS）',
    shortName: 'LOGOSの器',
    img: 'images/item_logos.webp',
    element: 'logos',
    desc: 'LOGOSの魂を受け止める神具。'
  },
  soul_vessel_chaos: {
    id: 'soul_vessel_chaos',
    name: '魂の器（CHAOS）',
    shortName: 'CHAOSの器',
    img: 'images/item_chaos.webp',
    element: 'chaos',
    desc: 'CHAOSの魂を受け止める神具。'
  },
  soul_vessel_mystis: {
    id: 'soul_vessel_mystis',
    name: '魂の器（MYSTIS）',
    shortName: 'MYSTISの器',
    img: 'images/item_mystis.webp',
    element: 'mystis',
    desc: 'MYSTISの魂を受け止める神具。'
  },
  seihai: {
    id: 'seihai',
    name: '聖なる盃',
    shortName: '聖なる盃',
    img: 'images/item_seihai.webp',
    desc: '神聖な力を湛えた進化用素材。'
  }
};

