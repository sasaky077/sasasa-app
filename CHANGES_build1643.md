# build1643 — 位相回遊 / PHASE ODYSSEY

ベース：build1642（index(20261020-012614) / version(20261020-012615) / js・css(20261020-0126xx)）

## 変更ファイル
| 種別 | ファイル | 内容 |
|---|---|---|
| 新規 | js/phase_odyssey.js | run管理・保存・トップ画面描画・編成選択・強化3択・戦闘フックAPI（window.PhaseOdyssey） |
| 新規 | css/phase_odyssey.css | トップ画面／モーダル／入口カード／戦闘中バッジ。すべて `#screen-phase-odyssey` `#phase-odyssey-layer` `.phase-odyssey-*` にスコープ |
| 新規 | images/phase_odyssey_hero.webp | メインビジュアル（モックの位相ゲート背景。題字は画面側でHTML描画） |
| 新規 | images/phase_odyssey_slot_empty.webp | 出撃メンバー未設定枠（シルエット） |
| 新規 | images/phase_odyssey_icon_attack / barrier / ult.webp | 強化アイコン（強化の一例・強化選択カードで使用） |
| 修正 | index.html | 画面 `#screen-phase-odyssey` 追加、特別巡行に入口カード追加、css/js読込追加、shooting_event.js の ?v 更新 |
| 修正 | js/shooting_stages.js | `shooting_phase_odyssey_<階層>` を動的生成（残響の塔の構成をテンプレートに敵強化）。SHOOTING_STAGES一覧には登録しない |
| 修正 | js/shooting_core.js | 位相回遊用フック（下記）。他ステージの挙動は変更なし |
| 修正 | js/shooting_event.js | MODULE_VERSION を build1643 へ（戦闘モジュールのキャッシュ更新） |
| 修正 | version.json | build 1643 |

## shooting_core.js のフック（すべて `isPhaseOdysseyStage()` の時だけ動作）
- 固定編成：`getSelectedStoryFixedPartyIds()` がrunの3人を返す（STORY固定編成と同じUI・判定を流用）
- 強化：`buildResonatedCharacterProfile()` の最後に ATK / ショット威力 / 最大HP / 移動速度 / 属性共鳴 を適用
- 持ち越し：戦闘開始時 `applyPhaseOdysseyCarryover()` でHP・ULTゲージ（比率）を反映
- 被ダメ：位相による敵ATK倍率・被ダメージ軽減・バリア吸収（即死弾は対象外）
- ULT：`grantUltGaugeForHits()` に回収量倍率
- 出撃：`PhaseOdyssey.beginFloor()` で現在階層・編成の一致を確認
- 結果：`submitShootingHighScore()` → `PhaseOdyssey.finishFloor()`（スコア送信・初回報酬・ドロップ・RETRY・STORY記録通知・中断復帰データは無効）
- 戻り先：`__shootingReturnContext = {type:'phaseOdyssey'}` で位相回遊トップへ

## 保存方式
localStorage（ユーザーID別キー `zeraphia_phase_odyssey_roguelite_progress_v1:<user_id>`）。
キー名に "roguelite"/"progress" を含むため、既存のクラウド保存 `saveProgressToSupabase()`（player_progress.other_state.localStorage）へ自動同梱される。
保存のたびに既存の `scheduleCloudSave()` を呼ぶ。**新テーブル・RPC・DB変更なし。**

保存項目：user_id / current_floor / best_floor / run_status / selected_members / build_list / hp_state / ult_state / updated_at
（ほかに draft_members・pending_choices・last_result）

## run_status
idle（未開始）→ ready（挑戦中）→ battle（戦闘中）→ select（強化選択待ち）→ ready …
battle のまま画面に戻った／再読込した場合は suspended（中断中）として同じ階層から再開。敗北・リタイアで ended。

## 敵強化（getPhaseOdysseyScaling）
- 1〜10F：塔1〜10F構成（1〜3F軽め／4〜6F中級／7〜9F難しめ／10Fボス）
- 11〜20F：塔4〜9・11〜13F、20Fボス（強化リヴィア）／21〜30F：…30Fボス（トワ）／以降はボスを循環
- HP倍率：1 + 3%×(階層-1) + 7%×位相（5階ごと）。31F以降は10階ごとに×1.12（上限×50）
- ATK倍率：1 + 2%×(階層-1) + 5%×位相。31F以降は10階ごとに×1.08（上限×4）
- 出現数：10階ごとに+1（最大+3）、弾速：位相ごとに+1.5%（最大+15%）

## 強化（条件・揺らぎ・使い切り）
1つの強化は「種類・効果量・レア度（★1〜★3）・条件」を持ち、提示のたびに抽選する。
- レア度：★1 通常 55% / ★2 上質 33% / ★3 極上 12%。種類ごとの範囲内で★が高いほど効果量が大きい
- 条件付き（効果量が高め）：
  - 属性強化：指定属性（火・水・木・光・闇）の味方のATK +12〜28%
  - ショット種強化：2系統（PARALLEL / SPREAD / LASER / HOMING / CHARGE / SPECIAL）のキャラの通常ショット威力 +14〜32%
  - 条件は60%の確率で編成に寄せて抽選。残りは完全ランダムのため「対象：編成内にいません」（はずれ）もある
- 条件なし：攻撃力 6〜14% / 凱旋の昂揚（クリア時ULT）10〜30% / 最大HP 6〜15% / 被ダメ軽減 4〜10%（合計40%まで） / 被弾時バリア 6〜14% / 回復量増加 5〜15% / 移動速度 3〜8%（合計30%まで） / ULT回収 8〜20% / 開幕チャージ 10〜25%
- 使い切り：臨界解放（次の階層開始時に全員ULT MAX。その階層の決着で消費、途中で中断した場合は残る） / 癒しの泉（選んだ瞬間に全員HPを25〜50%回復）
- 3択は攻撃・防御・補助を1つずつ混ぜ、同じ種類・条件の重複は出さない。提示内容は保存され再読込しても変わらない
- 旧形式（文字列ID）の保存データは近い強化へ自動変換

## 追加修正（同build）
- メインビジュアルのZERAPHIAロゴを削除（戻るボタンとの重なり解消）
- タイトル部（位相回遊 / PHASE ODYSSEY）を固定し、ステータス以降のカードのみスクロールする構成に変更
- 出撃メンバー選択を独自モーダルから共通パーティ選択画面へ変更。未開始時はFLOOR 1の編成画面で所持キャラから3人を自由編成（前回の3人を初期配置）、「戦闘開始」で確認ダイアログ→run開始。挑戦中は固定編成で表示
- 強化選択画面に「味方の状態」（各キャラのHP・ULT・ATK〔強化分を併記〕、取得済み強化とLv・効果量）を追加。挑戦中はトップの出撃メンバー枠タップで同じ状態画面を表示
- shooting_core.js：`window.getShootingCharacterGrowthProfile(id)` を追加（共鳴・レベル・神聖樹反映済みの育成値を返す。表示専用）
- スコアを廃止（評価は到達階層のみ）。RESULTはSCORE・RANK・MAX COMBOを隠し「○階踏破」と最高踏破階層を表示。戦闘中のSCOREプレートは「PHASE ODYSSEY / FLOOR n」、編成画面のHIGH SCOREは「最高踏破」に置き換え。戦闘中バッジはバリア残量のみ
- 10階ごとのボス戦を刷新：既存ボスの行動・ギミックを流用し、HP・PHASE数・被ダメ倍率をその階層に合わせて再設定（オリジナルの難易度は使わない）
  - 候補：10F〜 竜型レムナント／イリシュ／ミラージュ、20F〜 リヴィア／オーバーシア、30F〜 カミラ／シエン、40F〜 仮面舞踏会（70F以降は最上級版）／トワ
  - runごとの乱数で抽選（直前のボスとは被らない）。ステージIDは `shooting_phase_odyssey_<階>_<ボスキー>`
  - 合計HP＝10,000×位相HP倍率（10F≈13,400／20F≈17,800／30F≈22,200）、PHASEは40Fまで最大2・50F以降はオリジナル数（カミラ・シエンはPHASEでギミック段階が上がる）
  - 弾ダメージはボスごとの差を均して階層の敵ATK倍率に合わせ、最初のボス（10F）は1割控えめ
  - 強化選択画面で次がボス階なら「BOSS『カミラ』」と予告、ステージ開始演出にもボス名を表示
- ボス「オーバーシア」を追加し、STORY CH08-04の「塔の守護者」と位相回遊20F〜のボス候補を差し替え
  - 新規画像：images/phase_odyssey_overseer_battle.webp（バトルユニット）/ phase_odyssey_overseer_intro.webp（イントロ）/ phase_odyssey_watcher.webp（配下）
  - 表示サイズは自ユニット程度（bossVisualScale 0.7）。弾幕は barrage_v1 系
  - 配下「監視の眼」：最大3体同時、倒しても補充。攻撃はせず、首振りする扇形の視界を持つ（位相回遊ではHP・補充間隔が階層に比例）
  - 監視ギミック：自機が視界に入っている間だけ、画面上の全ての敵弾が自機へ追従（向きを毎秒2.4radまで曲げる・速さは不変）。視界から外れる／眼を倒すと、その時の向きのまま直進に戻る。視界が赤くなり「監視されている ― 敵弾が追従」と画面縁の赤い明滅で通知。停止系ULT中は首振り・監視とも停止
  - STORY CH08-04：HP（9,500／12,500）は従来どおり。ミッション文を「オーバーシアを撃破し、円盤への道を開く」に変更。敵マスターの「塔の守護者」（CH08_GUARDIAN）定義は残置（未使用）
  - shooting_enemies.js に PO_OVERSEER / PO_WATCHER を追加
- 呼称の整理：「オーバーシア」はCH08-04（位相回遊20F〜含む）の守護者のみ。CH01-04の竜型レムナントと乱入ボスは「竜型レムナント（亜種）」に統一
  - 表示名を変更：乱入ボス名・ミッション文、イントロ／WAVE演出の副題（DRAGON REMNANT VARIANT）、アイテム「竜型レムナント亜種の心核」（item_management.js / shooting_resonance.js / shooting_stages.js）
  - 内部ID（shooting_overseer_ambush / overseer_blk_core / 画像ファイル名）は保存データ互換のため変更なし
- 位相回遊トップ：上部HUD・下部ナビの白いぼかし帯（と名前・通貨の白い光彩）を位相回遊表示中だけ非表示に。メインビジュアルをHUDの裏まで敷き、上端だけ薄く暗くしたうえで、名前・結晶・コインを白文字＋濃い縁取りに変更。ボタン下のぼかしも削除。ナビの文字は白い縁取り（`body:has(#screen-phase-odyssey.active)`でスコープ）
- 取得済み強化の表示対策：同じ種類・条件はまとめて合計値＋×個数で表示（被ダメ軽減・バリア・移動速度は上限で頭打ち表示）。トップは最大6件＋「ほかN件 ›」（タップで状態画面）、状態画面の一覧は枠内スクロール。3桁以上の階層数は文字を縮小
- 深い階層で各強化の取得上限に達しても、3択が欠けない（空になって進めなくなる）よう上限を外して補充
- 入口を変更：特別巡行のカードを廃止し、巡行画面の左タブ（ストーリーの下）に独立した「位相回遊 / PHASE」タブを追加。タップで専用画面へ（右パネルは切り替えない）。CH03-04未クリア時は他の巡行タブと同じロック扱い。戻るボタンは巡行画面へ
- 律動 -仮面舞踏会-（上級・最上級、位相回遊の仮面舞踏会ボスも共通）：弾の列にときどき音符（♪）が出現
  - おおよそ3列に1回（連続はしない）。穴の端から3〜6マス離れた位置に音符を置き、音符と左右1マスずつ（計3マス）の弾・当たり判定を抜く（●　♪　●）。穴との間には弾が1つ以上残る
  - 取ると ATK×1.5（5秒）／無敵（3秒）／ULT満タン／HP33%回復 のいずれかがランダムで発動（ミモザのアイテムと同じ効果処理・通知は「♪ RHYTHM BONUS」）
  - 見た目：金の八分音符＋光輪＋周回するきらめき（Canvas描画・拍に合わせて脈動）、取得時は光輪がはじける演出（css/shooting_event.css）
  - 音符の配置は別系統の乱数で決めるため、既存の穴の並び（譜面）は変わらない
- BGM対策（新規 js/bgm_guard.js、index.html の shouldMainBgmPlay に hidden 判定を追加）
  - バックグラウンドに回ったら、鳴っていたBGM（タイトル／通常／戦闘・律動）をすべて一時停止。前面に戻ったら、止める直前に鳴っていて今の画面に合うものだけ再開（PAUSE中の律動など止めていた曲は再開しない）。iOSで再開が拒否された場合は次のタップで再開
  - 場違いなBGMの再生を即停止：タイトルBGMはタイトル表示中だけ、通常BGMは通常画面だけ、戦闘BGMはシューティング画面で戦闘BGMが有効な時だけ。ロック画面・コントロールセンター・イヤホンの再生/一時停止は「今の画面に合ったBGMの再開/停止」として処理（Media Session）
  - 律動の曲の読み込み確認：曲の長さが想定（約200秒）と5秒以上違う場合、別の曲が読み込まれたとみなしキャッシュを避けて1回だけ読み込み直す
  - shooting_core.js：window.isShootingBattleBgmSessionActive() を公開（ガード用）
- 戦闘中のスリープ防止（新規 js/wake_lock.js）：Screen Wake Lock APIで、シューティング画面を開いている間だけ画面を点けたままにする。バックグラウンド復帰時・タップ時に取り直し、画面を閉じたら解除。非対応端末では何もしない（iOS Safari 16.4〜、ホーム画面アプリは iOS 18.4〜）
- 音声読み込みの ERR_CACHE_OPERATION_NOT_SUPPORTED 対策：戦闘BGMの先読みで load() を重ねない（読み込み中・先読み済みならスキップ）。BGMの読み込みが失敗したら、キャッシュを避けたURLで1回だけ読み込み直し、再生しようとしていた場合は再開（bgm_guard.js）
