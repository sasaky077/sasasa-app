# ZERAPHIA STORY RPG（全章共通）

## フォルダ構成

```
rpg/
  index.html        起動ページ（?ch=章番号 で開く）… ふだんは触らない
  rpg.js            エンジン（全章共通）… ふだんは触らない
  style.css         見た目（全章共通）
  objects.js        マップ部品の定義（全章で共有）※ tools/build_objects.py で自動生成
  chapters/
    ch10.js         ← 章ごとのデータはここだけ
    _template.js    新しい章のひな形
  images/           画像（全章で共有）
```

**新しい章を作る時に編集するのは `chapters/chNN.js` だけです。**

## 新しい章の作り方

1. `chapters/_template.js` をコピーして `chapters/ch01.js` のような名前にする（番号は2桁）
2. `chapter`・`title`・`quests`・`maps` を書く
3. 確認：`rpg/index.html?ch=1&debug=1` で開く（Webサーバー推奨：`python -m http.server 8000`）
4. 本編で開けるようにする：`js/ch10_rpg_bridge.js` の `RPG_CHAPTERS` に番号を足す
   （例：`[1, 10]`）。STORYの章ボタンが自動でRPGを開くようになります
5. 公開するときは `js/ch10_rpg_bridge.js` の `RPG_BUILD` を上げる（RPG内のファイル全部のキャッシュ対策）

## 章データの項目

| 項目 | 必須 | 内容 |
|---|---|---|
| `chapter` | ○ | 章番号 |
| `title` | ○ | 章タイトル（ヘッダー・会話画面・編成画面に出る） |
| `startMap` |  | 最初のマップ名（省略時は maps の最初） |
| `respawn` |  | 全滅時に戻る場所 `{ map, from, message }`。from = どのマップへの門の前か |
| `scene` |  | 会話の背景（本編 images/ 内）。マップごとに `scene` で上書き可 |
| `player` |  | 歩く主人公の画像名（既定 `chara_01` → `images/chara_01_down_walk1.webp` など） |
| `theme` |  | 床・地平線・遠景の画像 `{ floor, horizon, castle }`。マップごとに `theme` で上書き可 |
| `portraits` |  | 単体起動で会話を確認する時の立ち絵 `{ 'エリ': 'images/chara_01_cut.webp' }` |
| `saveKey` / `editKey` |  | セーブ名（省略時は `zeraphia_ch01_rpg_v1` のように自動）。CH10は旧セーブ引継ぎのため指定済み |
| `quests` | ○ | 目的（上から順に進む） |
| `maps` | ○ | マップ |

### quests（目的）

- `{ type:'talk', npc:'zig', map:'庭園', text:'ジグに話しかける' }` … そのキャラと話したら次へ
- `{ type:'gate', to:'回廊', map:'庭園', text:'光の門へ行く' }` … その門をくぐったら次へ（それまで門は閉じている）
- `{ type:'end', text:'…' }` … 最後

### maps（マップ1つ分）

- `place`：画面に出るエリア名
- `size`・`horizonY`・`walk`・`start`：広さ・地平線の高さ・歩ける範囲・開始位置
- `castle`：遠景 `{ x, w }`（`img` で画像も変えられる）
- `tint`：色味をかける（例：`'rgba(110,122,170,.13)'`）
- `encounter`：ランダム戦闘（`stage` は本編 shooting_stages.js の RPG_ENCOUNTER_DEFS）
- `npcs`：キャラ（立ち絵1枚 `sprite` だけでOK）と会話 `talk`
- `objects`：部品の配置（`gate:'行き先'` で門になる）
- `blocks` / `opens`：通れないマス・通れるマスの手直し

## マップの配置エディタ

`?debug=1` を付けて開く（または G キー）。
部品をドラッグで移動 / 1〜4キーで追加 / F で反転 / Delete で削除 / 空きマスをタップで通行切替 / N ですり抜け。
「配置をコピー」→ その章のファイルの該当マップに貼り付け。

## 画像を足す

- 新しい地域の床・遠景：`images/` に置き、章かマップの `theme` で指定
- 新しい部品：背景透過の画像を用意して `tools/build_objects.py` の SPECS に1行足して実行
- NPC：512×512・足元 y=480 の立ち絵1枚（`images/chara_XX_down_idle.webp`）
- ヘッダー：`images/ui2_header_base.webp`（文字なし）。章番号・タイトルは自動で書かれる

## 本編とのつなぎ（js/ch10_rpg_bridge.js）

RPG側から呼ぶ関数：`playZeraphiaRPGNovel`（会話）・`startZeraphiaRPGEncounter`（戦闘）・
`openZeraphiaRPGParty`（編成）・`closeZeraphiaRPG`（戻る）。旧名 `…Ch10…` も残してあります。
