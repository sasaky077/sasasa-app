// characters_32.js
// 既存 characters.js の CHARACTERS を 32マス共有盤面バトル用に変換する
//
// キャラクターIDは characters.js の再採番後IDをそのまま引き継ぐ。
// 前提：
// index.html では characters.js の後に、この characters_32.js を読み込むこと

(function () {
  const BASE =
    (typeof CHARACTERS !== 'undefined' && Array.isArray(CHARACTERS))
      ? CHARACTERS
      : (window.CHARACTERS || []);

  // 既存 characters.js 側の range 名を、BattleRange32 用に変換
  const RANGE_32_MAP = {
    // 旧バトル系 range → 32マス用への変換
    front1:        'front_ally',          // 前方1マス（ally向き）
    front2:        'pierce_ally_2',       // 前方直線2マス
    front3:        'pierce_ally_3',       // 前方直線3マス
    pierce2:       'pierce_ally_2',       // 前方直線2マス（別名）
    pierce3:       'pierce_ally_3',       // 前方直線3マス（別名）
    pierce_ally_2: 'pierce_ally_2',
    pierce_ally_3: 'pierce_ally_3',
    adjacent:      'adjacent',
    self:          'self',
    around8:       'around8',
    around24:      'around24',

    front_row_3:   'front_row_3_ally',    // 前方横3マス（前・左前・右前）
    front3_row_3:  'front3_row_3_ally',   // 前方3行×横3マス
    front_9:       'front_9_ally',
    front_9_ally:  'front_9_ally',
    all:           'enemy_all',           // 全体（敵対象スキル時は敵全体）
    enemy_all:     'enemy_all',
    ally_all:      'ally_all',
    pierce_all:    'pierce_all',          // 前方直線全マス（enemy_allに変換しない）

    // 斜めレンジ（左右V字）
    diag3:          'diag_ally_3',        // 前方左右斜め3マス（将来 left/right 分離予定）
    diag_ally_3:    'diag_ally_3',
    diag_v3:        'diag_v_ally_3',      // 前方左右斜め3マス（V字）
    diag_v_ally_3:  'diag_v_ally_3',

    // 追加：未変換で警告が出ていたレンジ名
    cross:         'cross_32',           // 十字（上下左右1マス）
    col_center:    'col_center_32',      // 自列縦全体（特殊処理）
    side_lr:       'side_lr',            // 左右のみ
    diag_x_2:      'diag_x_2',          // 斜めX字2マス
    twin_cross_4:  'twin_cross_4',       // ツイン十字4マス
    twin_star_8:   'twin_star_8',        // ツイン星8マス
    cat_snipe_ally: 'cat_snipe_ally',      // ミア遠距離狙撃
    cat_luminous_far_ally: 'cat_luminous_far_ally', // ミア遠距離ULT
  };

  function convertRangeTo32(range) {
    return RANGE_32_MAP[range] || range;
  }

  function convertSkillTo32(skill, character) {
    const isUlt = !!skill.isUltimate;

    // 元スキルの全プロパティを維持してから、Battle32向けに必要な項目だけ変換する。
    // 新しい特殊パラメータを追加しても、ここへ個別追記しない限り消える事故を防ぐ。
    const converted = {
      ...skill,
      range: convertRangeTo32(skill.range),
      target: skill.target || (skill.type === 'heal' || skill.type === 'buff' ? 'ally' : 'enemy'),
      cost: 0,
      linkCost: skill.linkCost,
      shinkiCost: isUlt ? (skill.shinkiCost ?? character.shinkiMax ?? 3) : 0,
      hit: skill.hit == null ? 100 : skill.hit,
      isUltimate: isUlt,
      hitStyle: skill.hitStyle || 'normal',
      multiplier: Number(skill.multiplier || 0),
      healRate: Number(skill.healRate || 0),
      delayTurns: skill.delayTurns != null ? skill.delayTurns : null,
      delayedTrigger: skill.delayedTrigger || null,
      hitCount: skill.hitCount != null ? Number(skill.hitCount) : null,
      pierce: !!skill.pierce,
      randomCellCount: skill.randomCellCount || null,
      criticalRate: skill.criticalRate,
      criticalDamageRate: skill.criticalDamageRate,
      targetStatus: skill.targetStatus || skill.requiredStatus || null,
      requiredStatus: skill.requiredStatus || skill.targetStatus || null,
      moveBonus: skill.moveBonus || null,
      allyShiftDirection: skill.allyShiftDirection || null,
      backstabMultiplier: skill.backstabMultiplier || null,
      desc: skill.desc || '',
    };

    // ネスト配列・オブジェクトは参照共有を避けて複製する。
    converted.randomOptions = Array.isArray(skill.randomOptions)
      ? skill.randomOptions.map(option => ({ ...option }))
      : null;
    converted.choiceOptions = Array.isArray(skill.choiceOptions)
      ? skill.choiceOptions.map(option => ({ ...option }))
      : null;
    converted.selectedOption = skill.selectedOption ? { ...skill.selectedOption } : null;
    converted.summonOffsets = Array.isArray(skill.summonOffsets)
      ? skill.summonOffsets.map(offset => ({ ...offset }))
      : null;

    // DEF / SPD 系エフェクトは現行仕様へ変換する。
    const DEF_SPD_REMAP = {
      def_up: 'atk_up',
      def_down: 'atk_down',
      spd_up: null,
      spd_down: 'atk_down',
    };
    converted.effects = (skill.effects || [])
      .map(effect => {
        const remapped = DEF_SPD_REMAP[effect.type];
        if (remapped === null) return null;
        if (remapped !== undefined) return { ...effect, type: remapped };
        return { ...effect };
      })
      .filter(Boolean);

    return converted;
  }


  function convertComboTo32(combo, character) {
    if (!combo || !combo.skill) return null;
    return {
      range: combo.range || 'combo_cross_4',
      skill: convertSkillTo32({ ...combo.skill, isUltimate: false, linkCost: 0, shinkiCost: 0 }, character),
    };
  }

  function convertCharacterTo32(c) {
  return {
    id: c.id,
    name: c.name,
    gender: c.gender,
    rarity: c.rarity,
    role: c.role,
    element: c.element || 'chaos',

    hp: c.stats?.HP || 1,
    atk: c.stats?.ATK || 1,
    criticalRate: Number.isFinite(Number(c.criticalRate ?? c.critRate)) ? Number(c.criticalRate ?? c.critRate) : 0.10,
    criticalDamageRate: Number.isFinite(Number(c.criticalDamageRate ?? c.critDamageRate)) ? Number(c.criticalDamageRate ?? c.critDamageRate) : 1.5,

    shinkiMax: c.shinkiMax || 3,
    shinkiStart: c.shinkiStart || 0,
    shinkiRegen: c.shinkiRegen || 1,

    img: c.battleImg || c.battleUpImg || c.img || null,
    battleImg: c.battleImg || c.battleUpImg || c.img || null,
    battleUpImg: c.battleUpImg || c.battleImg || c.img || null,
    battleBackImg: c.battleBackImg || c.battleImg || c.battleUpImg || c.img || null,

    panelImg: c.panelImg || c.upImg || c.img || null,

    cutin: c.ultImg || c.cutImg || null,

    portrait: c.img || null,
    upImg: c.upImg || null,

    // ★追加
    uiScale: c.uiScale || {},
    uiOffset: c.uiOffset || {},

    skills: (c.skills || []).map(skill => convertSkillTo32(skill, c)),
    combo: convertComboTo32(c.combo, c),

    // 移動型は battle_range_32.js の MOVE_PRESETS_32 に集約
    // characters.js 側では moveType 名だけ指定する
    moveType: c.moveType || 'silver',
  };
}

  window.CHARACTERS_32 = BASE.map(convertCharacterTo32);

  console.log('[characters_32] converted:', window.CHARACTERS_32);
})();