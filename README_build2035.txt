ZERAPHIA build2035（build2034の内容を含む）

ゲームのルートに上書きしてください。
  index.html               … ch10_rpg_bridge を ?v=2034、story_novel.js を ?v=2035-portrait-scale に変更
  version.json             … build 2035
  js/story_novel.js        … story_novel_cut.css の読み込み番号だけ変更（処理は無変更）
  css/story_novel_cut.css  … 末尾に「キャラ別の立ち絵サイズ補正」を追加。エリ = 90%・6%下げ
                             他キャラも img[alt="名前"]{--sn-scale:..;--sn-shift:..;} の1行で調整できます
  js/ch10_rpg_bridge.js / css/ch10_rpg_bridge.css / images/scene_ch10_garden.webp / rpg/ch10/
                           … build2034（RPGの会話を本編ノベル画面で再生）
