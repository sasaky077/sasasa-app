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
    // build2062: ヘイズのホームバナーを降ろし、特別巡行「最恐 -デイノヴァ-」へ差し替え
    id: 'event_deinova_special',
    img: 'images/home_banner_deinova.webp',
    alt: '特別巡行 最恐 -デイノヴァ- Sランククリアで「SR デイノヴァ」を入手しよう！',
    actionName: 'openDeinovaSpecialFromHome',
    hidden: false
  },
  {
    id: 'event_faceless',
    img: 'images/home_banner_faceless_v1.webp',
    alt: 'フェイスレス降臨',
    actionName: 'openShootingEvent',
    hidden: true
  },
  {
    id: 'event_daily_raid',
    img: 'images/raid_banner_01.webp',
    alt: 'DAILY RAID BATTLE',
    actionName: 'openDailyRaid',
    // build1594: その日のレイドボスのバナーに自動で差し替える（raid_event.js の RAID_BOSS_DEFS.banner）。
    // img は日替わりボスが分からない時の予備。
    raidBossBanner: true,
    hidden: false
  },
  {
    id: 'event_wolf_implemented',
    img: 'images/event_banner_03.webp',
    alt: 'ウルフ実装',
    actionName: 'openWolfGachaFromHome',
    hidden: false
  }
];
