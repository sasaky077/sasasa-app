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
    // 旧バトル系 range → 32マス用への変換
    front1:        'front_ally',          // 前方1マス（ally向き）
    front3:        'pierce_ally_3',       // 前方直線3マス
    pierce3:       'pierce_ally_3',       // 同上（別名）
    pierce_ally_3: 'pierce_ally_3',
    adjacent:      'adjacent',
    self:          'self',
    around8:       'around8',

    front_row_3:   'front_row_3_ally',    // 前方横3マス（前・左前・右前）
    front3_row_3:  'front3_row_3_ally',   // 前方3行×横3マス
    all:           'enemy_all',           // 全体（敵対象スキル時は敵全体）
    enemy_all:     'enemy_all',
    ally_all:      'ally_all',
    pierce_all:    'enemy_all',           // 全体貫通 → 全体攻撃として扱う

    // 斜めレンジ（左右V字）
    diag3:          'diag_ally_3',        // 前方左右斜め3マス（将来 left/right 分離予定）
    diag_ally_3:    'diag_ally_3',
    diag_v3:        'diag_v_ally_3',      // 前方左右斜め3マス（V字）
    diag_v_ally_3:  'diag_v_ally_3',
  };

  function convertRangeTo32(range) {
    return RANGE_32_MAP[range] || range;
  }

  function convertSkillTo32(skill, character) {
  const isUlt = !!skill.isUltimate;

  return {
    id: skill.id,
    name: skill.name,
    type: skill.type,
    range: convertRangeTo32(skill.range),
    target: skill.target || (skill.type === 'heal' || skill.type === 'buff' ? 'ally' : 'enemy'),

    multiplier: skill.multiplier || 0,
    healRate: skill.healRate || 0,

    cost: 0,

    shinkiCost: isUlt ? (skill.shinkiCost ?? character.shinkiMax ?? 3) : 0,

    hit: skill.hit == null ? 100 : skill.hit,
    isUltimate: isUlt,
    hitStyle: skill.hitStyle || 'normal',
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

      skills: (c.skills || []).map(skill => convertSkillTo32(skill, c)),

      // 移動型（未設定キャラは 'silver' をデフォルトとする）
      moveType: c.moveType || 'silver',
    };
  }

  window.CHARACTERS_32 = BASE.map(convertCharacterTo32);

  console.log('[characters_32] converted:', window.CHARACTERS_32);
})();