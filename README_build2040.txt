ZERAPHIA build2040（build2034〜2039の内容を含む）

ゲームのルートに上書きしてください。

■ 今回（2040）ランダムエンカウント → シューティング戦闘
  流れ：歩く → 「！」 → 白フラッシュ×2 → 縞ワイプで暗転 → 「〇〇が あらわれた！」
        → 本編のシューティング戦闘 → RESULTの「戻る」/途中退出でフィールドへ（白 or 暗転から復帰）
  ・2回目以降は「前回エンカウントで出撃した編成」で即出撃（初回だけ編成画面）
  ・エンカウント戦は 報酬・スコア送信・クリア記録・中断復帰 なし（無限稼ぎ防止）
  ・負け/逃走のペナルティなし（その場に戻る）。戦闘後は minSteps 歩は遭遇しない
  ・?debug=1（配置エディタ）では遭遇しない（?debug=1&enc=1 で遭遇あり）

  rpg/ch10/maps.js      … 各マップの encounter（遭遇率・最低歩数・安全圏・出現表）
  rpg/ch10/rpg.js       … 遭遇判定と演出
  rpg/ch10/index.html / style.css … 演出用レイヤー（UIより上）
  js/shooting_stages.js … エンカウント専用ステージ shooting_rpg_ch10_01〜03（RPG_ENCOUNTER_DEFS で敵・数・HPを調整）
  js/shooting_core.js   … エンカウント戦の報酬/記録/復帰の除外、前回編成の記憶、RPGへの戻り
  js/shooting_event.js  … 読み込み番号のみ更新
  js/ch10_rpg_bridge.js / css/ch10_rpg_bridge.css … 戦闘の開始・RPGへの復帰・重なり順
  index.html / version.json … 読み込み番号と build を 2040 に

■ 2039 門の目印・回廊の明るさ / 2038 マップ拡張 / 2037 軽量化 / 2036 NPC / 2035 エリ立ち絵 / 2034 会話統一
