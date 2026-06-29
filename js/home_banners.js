// =========================================================
// Zeraphia Home Event Banners
// =========================================================
// ホーム上部イベントバナーの管理ファイル。
// バナーを増やす場合は images/ に画像を追加し、この配列に1件追加するだけでOK。
// index.html のHTML本体は基本的に触らなくてOK。
//
// actionTab: タップ時に移動するタブ
//   'main' / 'ninmu' / 'zukan' / 'summon' / 'setting'
// hidden: true にすると一覧に出さない
// =========================================================

window.HOME_EVENT_BANNERS = [
  {
    id: 'event_sachiel',
    img: 'images/event_banner01.webp',
    alt: 'サキエル降臨',
    actionName: 'openSakielRogueliteFromHome',
    hidden: false
  },
  {
    id: 'event_zeraphia_intro',
    img: 'images/event_banner02.webp',
    alt: 'Zeraphiaを知って、ゲームを100倍楽しもう',
    actionTab: 'ninmu',
    hidden: false
  }
];
