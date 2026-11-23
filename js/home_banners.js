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

// build2150: 期間限定イベント「パラレル・ソワレ」の開催期間（日本時間）。ここだけ書き換えれば
//  ホームバナーの表示・イベント画面の出撃可否（party_event.js）がそろって切り替わる。
//  サーバー側の受付期間（party_event_server_spec.md）も同じ日時にそろえること。
window.PARTY_EVENT_PERIOD = Object.freeze({
  start: '2026-11-24T00:00:00+09:00',
  end:   '2026-12-01T23:59:59+09:00'
});
window.isPartyEventOpenNow = function(){
  try{
    const p = window.PARTY_EVENT_PERIOD, t = Date.now();
    return t >= Date.parse(p.start) && t <= Date.parse(p.end);
  }catch(_){ return false; }
};

window.HOME_EVENT_BANNERS = [
  {
    // build2150: 期間限定イベント「パラレル・ソワレ」。開催期間外（管理者以外）は出さない
    id: 'event_party_soiree',
    img: 'images/home_banner_party.webp',
    alt: '期間限定イベント パラレル・ソワレ 〜並行世界への招待状〜',
    actionName: 'openPartyEventFromHome',
    get hidden(){
      // admin_mode.js より先に描かれても判定できるよう、管理者フラグは保存値も見る
      let admin = !!(window.SasaphiaAdmin && typeof window.SasaphiaAdmin.isEnabled === 'function' && window.SasaphiaAdmin.isEnabled());
      try{ admin = admin || localStorage.getItem('sasaphia_admin_mode_v1') === '1'; }catch(_){}
      return !(admin || window.isPartyEventOpenNow());
    }
  },
  {
    // build2062: ヘイズのホームバナーを降ろし、特別巡行「最恐 -デイノヴァ-」へ差し替え
    id: 'event_deinova_special',
    img: 'images/home_banner_deinova.webp',
    alt: '特別巡行 最恐 -デイノヴァ- Sランククリアで「SR デイノヴァ」を入手しよう！',
    actionName: 'openDeinovaSpecialFromHome',
    hidden: true
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
    hidden: true
  }
];
