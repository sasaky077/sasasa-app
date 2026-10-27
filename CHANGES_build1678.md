# build1678 変更点（ベース：build1677）

## カミラ：ボスの「再捕縛されない時間」を 1.5秒 → 1秒 に短縮
- 蜘蛛でボスを1秒拘束したあと、再び捕まらない時間を1秒に（build1677は1.5秒）
- ボスが止まっている時間の目安：約25%（実測）→ 約5割
- 蜘蛛の召喚間隔0.7秒・ザコ3秒拘束・ULTは変更なし

### 変更ファイル
- js/shooting_characters.js（設定値・説明文）
- js/shooting_core.js（既定値）
- js/shooting_event.js（MODULE_VERSION）、index.html（読み込みバージョン）、version.json
