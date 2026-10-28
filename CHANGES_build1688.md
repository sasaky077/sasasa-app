# build1688 — エクリプス／SUB MISSION の更新漏れ反映（build1687 込み）

build1681〜1684 で変更した次の3ファイルが本番に入っていなかったため、最新版を同梱します。
中身は build1684 時点のものと同じで、build1686 の内容はすべて含んでいます（差分確認済み）。

- js/shooting_enemies.js … エクリプス本体・光／闇の天秤の敵定義
- js/shooting_stages.js … 位相回遊 100/150/200/250…F のエクリプス戦ステージ
- js/phase_odyssey.js … 100F以降50階ごとにエクリプス確定、「お題」→「SUB MISSION」表記
- images/eclipse_battle.webp / images/eclipse_battle_start.webp … 既に配置済みなら上書きで問題なし

build1687（カミラ子蜘蛛のカクつき対策）のファイルも同梱しているので、このzipだけ上書きすればOKです。

## 確認
- 位相回遊100Fでエクリプス戦が始まり、闇の天秤→暗転・弾幕加速、光の天秤→攻撃が通る、の切り替えを確認。

## 変更ファイル
- js/shooting_enemies.js / js/shooting_stages.js / js/phase_odyssey.js
- images/eclipse_battle.webp / images/eclipse_battle_start.webp
- js/shooting_core.js / css/shooting_event.css（build1687と同じ）
- js/shooting_event.js（MODULE_VERSION）/ index.html（?v）/ version.json
