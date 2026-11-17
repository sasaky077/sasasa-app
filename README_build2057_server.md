# build2057 サーバー側の対応（GPT向け仕様）

特別巡行「最恐 -デイノヴァ-」（stage_id = `shooting_special_deinova`）のドロップをサーバーで確定させるための仕様です。
クライアントは build2057 で実装済みです。

## 1. 既存RPCの対応

- `begin_secure_shooting_run(p_user_id, p_stage_id, ...)`
  - 許可するステージの一覧があれば、`shooting_special_deinova` を追加してください。
  - 挑戦回数は無制限です。TICKETの消費はありません。
- `finish_secure_shooting_run(p_user_id, p_run_token, p_score, p_win)`
  - 通常のステージと同じ処理です（スコア・ハイスコア・EXP/COIN）。変更は不要です。

## 2. 新規RPC：`claim_deinova_special_drop(p_run_token text) returns jsonb`

クライアントは `finish_secure_shooting_run` が成功した後、勝利した時だけこのRPCを呼びます。

### 処理
1. `p_run_token` のランを取得し、次をすべて確認する。満たさなければ `dropped:false` を返す。
   - 呼び出したユーザー本人（auth.uid()）のランである。
   - stage_id が `shooting_special_deinova` である。
   - finish 済みで、勝利（win = true）である。
2. ランクは finish で確定したスコアから**サーバーで**判定する（クライアントの申告は使わない）。
   - S：スコア 24000 以上 → 確定でドロップ
   - A：スコア 20000 以上 → 50% でドロップ（`random() < 0.5`）
   - それ以外 → ドロップなし
3. ドロップした場合は、`collected_characters` に `character_id = 113` の行を1件追加する。
   - 列はガチャで入手した時と同じにする（user_id, character_id, captured_at, limit_break = 0, character_level = 1, character_exp = 0, base_stats など）。
   - 2体目以降も同じく1行追加する。限界突破はユーザーが既存の画面で自分で行う。
4. **同じ run token で2回呼ばれても、2体目を渡さない**（冪等）。
   - 例：ランの行に `deinova_claimed_at` と `deinova_result jsonb` を持たせ、2回目以降は保存した結果をそのまま返す。
5. `owned_count` = 追加後のそのユーザーの `character_id = 113` の行数。

### 返り値（jsonb）
```json
{
  "rank": "S",
  "dropped": true,
  "character_row_id": 12345,
  "owned_count": 2
}
```
- ドロップしなかった時は `dropped:false`、`character_row_id:null` にする。
- クライアントは `character_row_id` を使って `collected_characters` からその1行を読み直し、所持一覧へ反映します。

### 権限
- `security definer` にして、`grant execute ... to authenticated` を付ける。
- 乱数とランク判定はサーバー内だけで行う。
