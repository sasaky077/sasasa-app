ZERAPHIA build2036（build2034・2035の内容を含む）

ゲームのルートに上書きしてください。

■ 今回（2036）
  rpg/ch10/maps.js     … NPCを複数置ける形（npcs: [...]）に変更し、7人を配置
                          庭園：ジグ・アウラ・ミモザ・アルノ
                          回廊：ハオ・アイナ・スマイル（＋既存の残響）
                          会話はエリとの一問一答（エリが聞く→相手が答える）。セリフは仮
  rpg/ch10/rpg.js      … 複数NPC対応（当たり判定・タップで近づいて会話・「！」表示・
                          配置エディタでNPCもドラッグ移動＆書き出し）
  rpg/ch10/images/chara_XX_down_idle.webp … 7人の立ち絵（512x512・足元y=480に変換済み）
  rpg/ch10/tools/normalize_sprites.py     … 上の7人の変換設定入り
  js/story_novel.js    … ノベルの話者に「ハオ(54)」「スマイル(56)」を追加
                          （images/chara_54_cut.webp / chara_56_cut.webp があれば立ち絵が出ます）
  index.html / version.json … 読み込み番号と build を 2036 に

■ 2035
  css/story_novel_cut.css … キャラ別の立ち絵サイズ補正（エリ90%）

■ 2034
  js/ch10_rpg_bridge.js / css/ch10_rpg_bridge.css / images/scene_ch10_garden.webp
  … RPGの会話を本編ノベル画面で再生
