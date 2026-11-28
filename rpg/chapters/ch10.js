// =====================================================================
//  CHAPTER 10 — はじまりの箱庭
//  章ごとのデータはこのファイルだけ。エンジン（rpg.js）は全章共通なので触らない。
//  書き方の説明は README.md を参照。
// =====================================================================
window.ZERAPHIA_CHAPTER = {
  chapter: 10,
  title: '開発中(仮)',               // 章タイトル（会話画面・編成画面の見出し）
  startMap: '庭園',                  // 最初のマップ
  // 全滅時に戻る場所（from のマップへの門の前で目を覚ます）
  respawn: { map: '庭園', from: '回廊', message: '光の門の前で目を覚ました……' },
  scene: 'scene_ch10_garden.webp',   // 会話の背景（本編 images/ 内）。マップごとに scene で上書き可
  // 以前のセーブを引き継ぐため、CH10だけ旧キーを指定（新しい章は書かなくてよい）
  saveKey: 'zeraphia_ch10_rpg_v3',
  editKey: 'zeraphia_ch10_editor_v1',
  // 単体起動（本編なし）で会話を確認する時の立ち絵
  portraits: { 'エリ': 'images/chara_01_cut.webp', 'ジグ': 'images/chara_05_cut.webp' },

  // -------------------------------------------------------------------
  //  ミッション（目的）— 上から順に進む
  //    talk : npc（maps の npcs の id）に話しかけ、会話が終わったら次へ
  //    gate : to のマップへの門をくぐったら次へ（それまで門は通れない）
  //    end  : 最後（ここで止まる）
  // -------------------------------------------------------------------
  quests: [
    { type: 'talk', npc: 'zig',    map: '庭園', text: 'ジグに話しかける' },
    { type: 'talk', npc: 'aura',   map: '庭園', text: 'アウラに話しかける' },
    { type: 'talk', npc: 'mimosa', map: '庭園', text: 'ミモザに話しかける' },
    { type: 'gate', to: '回廊',    map: '庭園', text: '光の門へ行く' },
    { type: 'talk', npc: 'hao',    map: '回廊', text: 'ハオに話を聞く' },
    { type: 'end',                              text: '次なるアップデートを待つ' },
  ],

  // -------------------------------------------------------------------
  //  マップ — 絵を描かずに、部品(objects.js)を並べてマップを作る
  //  座標はワールドpx（1マス=50px）。?debug=1 で配置エディタ
  // -------------------------------------------------------------------
  maps: {
    '庭園': {
      place: 'はじまりの箱庭 1層', quest: '目的：光の門を探す',   // place = 画面に出るエリア名
      size: [2000, 3650],            // マップの広さ（幅, 高さ）
      horizonY: 840,                  // 地平線の高さ（これより上は空）
      walk: { top: 1000, bottom: 3050 }, // 歩ける範囲の上端・下端
      castle: { x: 1025, w: 820 },     // 遠景の城（パララックス）
      start: [1025, 2875],
      scene: 'scene_ch10_garden.webp',  // 会話時のノベル背景（本編 images/ 内のファイル名）
      // ランダムエンカウント：歩くと一定確率で本編のシューティング戦闘へ
      //   rate     : 1歩ごとの遭遇率（0.06 ≒ 平均17歩に1回）
      //   minSteps : 前の戦闘・マップ移動のあと、最低この歩数は遭遇しない
      //   safe     : キャラ・門からこのマス数以内では遭遇しない
      //   table    : 出現する敵（stage = 本編 shooting_stages.js の RPG_ENCOUNTER_DEFS、weight = 出やすさ）
      encounter: { rate: 0.06, minSteps: 12, safe: 3,
        table: [
          { stage: 'shooting_rpg_ch10_01', name: '観測眼のレムナント', weight: 3 },
          { stage: 'shooting_rpg_ch10_02', name: '星護のレムナント', weight: 2 },
        ] },
      // NPC：x,y はマス中央（50の倍数+25）。sprite は変換スクリプト規格の立ち絵
      // talk は本編シナリオと同じ書式。今は「エリが聞く → 相手が答える」の一問一答（セリフは仮）
      npcs: [
        { id: 'zig', name: 'ジグ', x: 1025, y: 2625, sprite: 'images/chara_05_down_idle.webp',
          talk: [
            { speaker: 'エリ', text: 'ジグ、アウラと一緒じゃないの？' },
            { speaker: 'ジグ', text: 'いや…花を見つけた、って走っていった。' },
          ] },
        { id: 'aura', name: 'アウラ', x: 1325, y: 2375, sprite: 'images/chara_03_down_idle.webp',
          talk: [
            { speaker: 'エリ', text: 'なんだか…不思議な場所だね。' },
            { speaker: 'アウラ', text: 'エリ、お花が咲いてたよ！\nミモザに見せてあげよう！' },
          ] },
        { id: 'mimosa', name: 'ミモザ', x: 725, y: 2125, sprite: 'images/chara_28_down_idle.webp',
          talk: [
            { speaker: 'エリ', text: '（ミモザ…難しい顔をしてる…）' },
            { speaker: 'ミモザ', text: 'なんだか…\nこの場所に見覚えがあるの。' },
          ] },
        { id: 'arno', name: 'アルノ', x: 1325, y: 1475, sprite: 'images/chara_20_down_idle.webp',
          talk: [
            { speaker: 'エリ', text: 'アルノ、あの光の向こうには何があるの？' },
            { speaker: 'アルノ', text: '……分からない。\n残念ながら私は向こうへ行けなかった。' },
          ] },
      ],
      sigils: [[1007, 3000, 74], [1010, 2330, 44]],
      objects: [
        // --- 北：光の門 ---
        { type: 'arch_small', x: 1025, y: 1200, gate: '回廊', gateLabel: '光の門' },
        { type: 'pillar', x: 575, y: 1325 },
        { type: 'pillar', x: 1450, y: 1350, flip: true },
        // --- 中央 ---
        { type: 'pillar', x: 1400, y: 1575, flip: true },
        { type: 'arch_banner', x: 475, y: 1800, flip: true },
        { type: 'pillar', x: 1000, y: 1975 },
        { type: 'arch_column', x: 1575, y: 2100, flip: true },
        // --- 南：スタート地点（モックの構図） ---
        { type: 'pillar', x: 700, y: 2475, flip: true },
        { type: 'pillar', x: 1350, y: 2850 },
        { type: 'arch_column', x: 575, y: 3100 },
        { type: 'arch_banner', x: 1475, y: 3200 },
        // --- 左右に広げた部分 ---
        { type: 'arch_banner', x: 175, y: 1175, flip: true },
        { type: 'pillar', x: 1850, y: 1150, flip: true },
        { type: 'pillar', x: 225, y: 1650 },
        { type: 'arch_banner', x: 1900, y: 1700 },
        { type: 'arch_column', x: 125, y: 2475 },
        { type: 'pillar', x: 1800, y: 2475, flip: true },
        { type: 'pillar', x: 225, y: 2900 },
        { type: 'arch_column', x: 1925, y: 2975, flip: true },
      ],
      blocks: [],   // 追加で通れなくするマス ["tx,ty", ...]
      opens: [],    // 部品の判定を上書きして通れるようにするマス
    },

    '回廊': {
      place: 'はじまりの箱庭 2層', quest: '目的：残響を探す',
      size: [2000, 2400], horizonY: 700, walk: { top: 860, bottom: 2200 },
      castle: { x: 1070, w: 760 },
      tint: 'rgba(110,122,170,.13)',   // 回廊の色味（薄い青）。数値を上げるほど暗くなる
      start: [1025, 1275],
      scene: 'scene_ch10_garden.webp', stageNo: 2,
      encounter: { rate: 0.07, minSteps: 10, safe: 3,
        table: [
          { stage: 'shooting_rpg_ch10_02', name: '星護のレムナント', weight: 2 },
          { stage: 'shooting_rpg_ch10_03', name: 'ミラージュの残影', weight: 2 },
        ] },
      npcs: [
        { id: 'echo', name: '残響', x: 1025, y: 1825,
          talk: [
            { speaker: '残響', text: '世界は終わったのではない。' },
            { speaker: '残響', text: '……すべては、輪廻の中にあるのだ。' },
          ] },
        { id: 'hao', name: 'ハオ', x: 375, y: 1825, sprite: 'images/chara_54_down_idle.webp',
          talk: [
            { speaker: 'エリ', text: 'あなたは、ここで何をしているの？' },
            { speaker: 'ハオ', text: 'なんと…天はこのときを……\n待っていたのだ…' },
          ] },
        { id: 'aina', name: 'アイナ', x: 1725, y: 1775, sprite: 'images/chara_17_down_idle.webp',
          talk: [
            { speaker: 'エリ', text: 'わっ、アイナ！アイナはこっちに来れたんだね！' },
            { speaker: 'アイナ', text: '……' },
          ] },
        { id: 'smile', name: 'スマイル', x: 1225, y: 1525, sprite: 'images/chara_56_down_idle.webp',
          talk: [
            { speaker: 'エリ', text: 'あなたは……ずっと笑ってるね。' },
            { speaker: 'スマイル', text: 'アハハ！泣いているよりいいじゃない！' },
          ] },
      ],
      sigils: [[1025, 1825, 90]],
      objects: [
        { type: 'arch_small', x: 1025, y: 1060, gate: '庭園', gateLabel: '1層への門' },
        { type: 'arch_column', x: 500, y: 1650 },
        { type: 'arch_column', x: 1550, y: 1700, flip: true },
        { type: 'pillar', x: 700, y: 2150 },
        { type: 'pillar', x: 1350, y: 2175, flip: true },
        { type: 'arch_banner', x: 1500, y: 1300 },
        { type: 'arch_banner', x: 525, y: 1250, flip: true },
        // --- 左右に広げた部分 ---
        { type: 'pillar', x: 200, y: 1500 },
        { type: 'pillar', x: 1825, y: 1475, flip: true },
        { type: 'arch_banner', x: 175, y: 2125, flip: true },
        { type: 'arch_banner', x: 1875, y: 2150 },
      ],
      blocks: [], opens: [],
    },
  },
};
