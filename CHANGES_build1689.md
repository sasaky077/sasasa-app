# build1689 — 位相回遊：最高到達階ランキング（全国／フレンド）

## 先にやること
Supabase の SQL Editor で `zeraphia_build1689_phase_odyssey_ranking.sql` を実行してください（何度実行しても同じ結果）。
SQLが未実行でもゲームは動きます（ランキングが「読み込めませんでした」になるだけ）。

## 追加
- 位相回遊トップのタイトル右下に「ランキング」ボタン。BESTの表示をタップしても開きます。
- タブ（左右スワイプでも切替）
  - フレンド：自分＋承認済みフレンド（記録のある人のみ）
  - 全国：上位100位。自分が圏外なら最後に自分の順位を表示し、その位置までスクロール
- 1行に 順位（1〜3位は金・銀・銅）／名前／最高到達時の編成3人／到達階
- 順位は到達階の高い順。同じ階なら先に到達した人が上。

## 記録の送信
- 最高到達階を更新した時に送信（その時の編成も一緒に）。
- 位相回遊を開いた時、まだ送っていない記録があれば送信 → 既にプレイ中の人の記録も、次に開いた時点でランキングに入ります。
- サーバーは「今より高い時だけ」更新（下がらない）。

## サーバー（SQL）
- テーブル `phase_odyssey_records`（RLS有効・直接アクセス不可）
- `submit_phase_odyssey_best(p_user_id, p_best_floor, p_party_ids)`
- `get_phase_odyssey_national_ranking(p_user_id, p_limit)`
- `get_phase_odyssey_friend_ranking(p_user_id)`
- いずれも本人確認（is_my_game_user）あり。

## 変更ファイル
- js/phase_odyssey.js / css/phase_odyssey.css / index.html（ボタン・?v）
- js/shooting_event.js（MODULE_VERSION）/ version.json
- zeraphia_build1689_phase_odyssey_ranking.sql
