// characters_32.js
// 既存 characters.js の CHARACTERS を 32マス共有盤面バトル用に変換する
//
// 前提：
// index.html では characters.js の後に、この characters_32.js を読み込むこと

(function () {
  const BASE =
    (typeof CHARACTERS !== 'undefined' && Array.isArray(CHARACTERS))
      ? CHARACTERS
      : (window.CHARACTERS || []);

  // 既存 characters.js 側の range 名を、BattleRange32 用に変換
  const RANGE_32_MAP = {
    front1: 'front_ally',
    front3: 'pierce_ally_3',
    pierce_ally_3: 'pierce_ally_3',
    adjacent: 'adjacent',
    self: 'self',
    around8: 'around8',
  };

  function convertRangeTo32(range) {
    return RANGE_32_MAP[range] || range;
  }

  function convertSkillTo32(skill) {
    const isUlt = !!skill.isUltimate;

    return {
      id: skill.id,
      name: skill.name,
      type: skill.type,
      range: convertRangeTo32(skill.range),
      target: skill.target || (skill.type === 'heal' || skill.type === 'buff' ? 'ally' : 'enemy'),

      multiplier: skill.multiplier || 0,
      healRate: skill.healRate || 0,

      // cost は撤廃。32マスバトルでは使わない
      cost: 0,

      // shinki は ULT 専用コスト
      // characters.js 側に shinkiCost があればそれを優先。なければ ULT は 3。
      shinkiCost: isUlt ? (skill.shinkiCost || 3) : 0,

      hit: skill.hit == null ? 100 : skill.hit,
      isUltimate: isUlt,
      pierce: !!skill.pierce,
      effects: skill.effects || [],
      moveBonus: skill.moveBonus || null,
      desc: skill.desc || '',
    };
  }

  function convertCharacterTo32(c) {
    return {
      id: c.id,
      name: c.name,
      gender: c.gender,
      rarity: c.rarity,
      role: c.role,

      hp: c.stats?.HP || 1,
      atk: c.stats?.ATK || 1,
      def: c.stats?.DEF || 0,
      spd: c.stats?.SPD || 0,

      shinkiMax: c.shinkiMax || 3,
      shinkiStart: c.shinkiStart || 0,
      shinkiRegen: c.shinkiRegen || 1,

      // 盤面上の画像
      img: c.battleImg || c.img || null,
      battleImg: c.battleImg || c.img || null,
      battleBackImg: c.battleBackImg || c.battleImg || c.img || null,

      // 下部パネル用
      panelImg: c.panelImg || c.upImg || c.img || null,

      // カットイン用
      cutin: c.ultImg || c.cutImg || null,

      // 参照用
      portrait: c.img || null,
      upImg: c.upImg || null,

      skills: (c.skills || []).map(convertSkillTo32),
    };
  }

  window.CHARACTERS_32 = BASE.map(convertCharacterTo32);

  console.log('[characters_32] converted:', window.CHARACTERS_32);
})();