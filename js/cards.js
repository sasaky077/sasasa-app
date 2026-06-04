// cards.js
// 補助カード定義（旧バトルシステム用）
//
// ⚠️ Battle32 / ローグライト系では使用しない（設計整理 2025）。
//    cards.js を読み込んでいても Battle32 には影響しない。
//    位置入替はローグライトOPの「布陣入替」（roguelite_options.js: swap_right_1）として実装。
//    最大移動・霊装による移動変更は霊装システムで別途実装予定。
//    旧 battle.js 系との互換のため定義は残す。
//
// Battle32 では window.SUPPORT_CARDS を参照しない。

const SUPPORT_CARDS = window.SUPPORT_CARDS = [

  {
    id: 'reibo_shiki',
    name: '霊歩四式',
    desc: '味方1体を最大4マス移動させる。',
    type: 'move',
    // battle_32 側が処理: 選択した味方を最大4マス先の任意マスへ移動
    targetType: 'ally_single',
    value: 4,
    img: 'images/card_reibo.webp',
  },

  {
    id: 'kage_watari',
    name: '影渡り',
    desc: '味方2体の位置を入れ替える。',
    type: 'swap',
    targetType: 'ally_two',
    value: 0,
    img: 'images/card_kage.webp',
  },

  {
    id: 'shinki_supply',
    name: '神気供給',
    desc: '味方1体の神気ゲージを+1する。',
    type: 'buff',
    targetType: 'ally_single',
    value: 1,
    img: 'images/card_shinki.webp',
  },

  {
    id: 'kekkai_fuda',
    name: '結界札',
    desc: '味方1体の次に受けるダメージを40%軽減する（1回）。',
    type: 'shield',
    targetType: 'ally_single',
    value: 0.40,
    img: 'images/card_kekkai.webp',
  },

  {
    id: 'chiyu_fuda',
    name: '治癒札',
    desc: '味方1体のHPを最大HPの20%回復する。',
    type: 'heal',
    targetType: 'ally_single',
    value: 0.20,
    img: 'images/card_chiyu.webp',
  },
];
