# ZERAPHIA UI FOUNDATION v2 — build646

## 方針

UIを以下の3系統に分離しました。

- **Standard Page**: 巡行 / ボーナス / アイテム / キャラ一覧 / 戦友 / 設定 / スコアアタック
- **Special Page**: 邂逅 / レイド / ノアなど。独自デザインを維持
- **Immersive**: シューティング戦闘 / ガチャ演出 / ストーリー演出。原則変更なし

## Standard Page の共通構造

- `.app-page`
- `.app-page-header`
- `.app-page-back`
- `.app-page-heading`
- `.app-page-title`
- `.app-page-action`
- `.app-page-content`
- `.app-scroll-region`

ページ外枠、見出し、戻る、HUD/Bottom Navとの境界、通常スクロールの責務は `css/app_chrome.css` が唯一の所有者です。

## build645からの主な整理

- index内の旧Chrome/Header系inline styleを削除
- style.cssのv408〜v436 Chrome hotfix履歴を撤去
- Standard Page 6画面を共通DOMへ移行
- Score AttackをStandard Pageシェルへ移行
- 巡行 / 設定 / キャラ一覧にも正式な「＜戻る」を追加
- Character detailは同じback slotを使って一覧へ戻る
- Item独自page shellを削除し、内部リストスクロールだけを維持
- Score Attack chrome CSSを315行 → 89行に整理し、`!important`を0に削減
- `admin_mode.js` の設定タイトル7タップ判定を新 `.app-page-title` へ追従
- 邂逅 / Raid / Shooting battleの固有デザインには手を入れていません

## 削減量

- index.html: 17,730行 → 15,498行
- index.html `!important`: 1,797 → 913
- style.css: 37,486行 → 36,678行
- score_attack_chrome.css: 314行 → 89行
- score_attack_chrome.css `!important`: 131 → 0
- item_management.css: 931行 → 877行

## 最優先テスト

1. HOME → 巡行 → 戻る
2. HOME → ボーナス → 戻る
3. HOME → アイテム → 戻る
4. HOME → キャラ一覧 → キャラ詳細 → 戻る → HOME
5. HOME → 戦友 → 戻る
6. HOME → 設定 → 戻る / 設定タイトル7タップADMIN
7. HOME → スコアアタック → 戻る / 挑戦 → Shooting
8. Bottom Navから各Standard Pageへ直接遷移
9. iPhone SE相当サイズでタイトル/戻る位置とスクロール
10. 邂逅 / Raid / Shooting / Storyがbuild645同様に動くこと

## ロールバック

build645のバックアップを復元すれば元に戻せます。build646はUI構造変更を含むため、部分ロールバックよりbuild645一式への戻しを推奨します。


## build647 / UI Foundation v2.1

- Removed the vertical separator at the right edge of the player-name frame.
- The player name and gem/coin groups now flow without a hard vertical divider.
- Existing horizontal name-frame lines, resource underlines, RANK ring, HUD spacing, and game logic are unchanged.
- This was done by retiring the legacy `hud-info::after` divider definitions instead of stacking another hotfix at the end of the stylesheet.


## build648 / UI Foundation v2.2

- Removed the upper horizontal line from the player-name frame.
- Removed the remaining gold/warm UI tint from the top user frame:
  - RANK EXP ring is now neutral graphite/silver.
  - Player-name text/panel accents are neutral.
  - Remaining player-frame connector/lower line are neutral gray.
  - Gem plus-control accent is neutral.
- Coin/crystal artwork colors themselves are preserved.
- No gameplay logic changed.
