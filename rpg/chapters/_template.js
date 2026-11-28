// =====================================================================
//  CHAPTER ○○ — （章の名前）
//  このファイルをコピーして chNN.js（2桁）にする。書き方は README.md
//  確認：rpg/index.html?ch=○○&debug=1
// =====================================================================
window.ZERAPHIA_CHAPTER = {
  chapter: 1,
  title: '章タイトル',
  startMap: 'はじまり',
  respawn: { map: 'はじまり', message: '気がつくと、見覚えのある場所にいた……' },
  scene: 'scene_ch10_garden.webp',   // 会話の背景（本編 images/ 内）
  // theme: { floor: 'images/floor_tile.webp', horizon: 'images/horizon.webp', castle: 'images/far_castle.webp' },
  portraits: { 'エリ': 'images/chara_01_cut.webp' },

  quests: [
    { type: 'talk', npc: 'someone', map: 'はじまり', text: '〇〇に話しかける' },
    { type: 'end', text: 'つづく' },
  ],

  maps: {
    'はじまり': {
      place: 'エリア名', quest: '目的：〇〇',
      size: [2000, 2400], horizonY: 700, walk: { top: 860, bottom: 2200 },
      castle: { x: 1000, w: 760 },
      start: [1025, 2000],
      // encounter: { rate: 0.06, minSteps: 12, safe: 3, table: [ { stage: 'shooting_rpg_ch10_01', name: '敵の名前', weight: 1 } ] },
      npcs: [
        { id: 'someone', name: '〇〇', x: 1025, y: 1625, sprite: 'images/chara_05_down_idle.webp',
          talk: [
            { speaker: 'エリ', text: 'こんにちは。' },
            { speaker: '〇〇', text: '……やあ。' },
          ] },
      ],
      objects: [
        { type: 'pillar', x: 700, y: 1500 },
        { type: 'pillar', x: 1350, y: 1500, flip: true },
      ],
      blocks: [], opens: [],
    },
  },
};
