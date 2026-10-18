// Zeraphia Shooting - standalone enemy master
// Strategy enemies.js is NOT referenced.
// Shooting enemies are completely independent even when the same Remnant appears.
(function () {
  'use strict';

  const SHOOTING_ENEMY_ID = Object.freeze({
    // Normal enemies
    MINI_01: 'shooting_mini_01',
    MINI_02: 'shooting_mini_02',
    MINI_03: 'shooting_mini_03',
    MINI_04: 'shooting_mini_04',
    MINI_05: 'shooting_mini_05',

    // Generic elemental angels
    ZAKO_AQUA_SHOT: 'zako_aqua_shot',
    ZAKO_AQUA_LASER: 'zako_aqua_laser',
    ZAKO_FIRE_SHOT: 'zako_fire_shot',
    ZAKO_FIRE_LASER: 'zako_fire_laser',
    ZAKO_FIRE_CHARGE: 'zako_fire_charge',
    ZAKO_WOOD_SHOT: 'zako_wood_shot',
    ZAKO_WOOD_LASER: 'zako_wood_laser',
    ZAKO_DARK_SHOT: 'zako_dark_shot',
    ZAKO_DARK_LASER: 'zako_dark_laser',
    ZAKO_LIGHT_SHOT: 'zako_light_shot',
    ZAKO_LIGHT_LASER: 'zako_light_laser',

    // CH07: 群がる強化個体（クモ型）。弾は撃たず、接触ダメージのみ。
    SWARM_SPIDER_LARGE: 'swarm_spider_large',
    SWARM_SPIDER_SMALL: 'swarm_spider_small',
    // CH07-2: 空の聖堂の強化個体（バリアなし・単体）
    STRONG_CH07_02: 'strong_ch07_02',
    CH07_WILL_O_WISP: 'ch07_will_o_wisp',

    // Remnant bosses
    REMNANT_01: 'shooting_remnant_01',
    REMNANT_02: 'shooting_remnant_02',
    REMNANT_03: 'shooting_remnant_03',
    REMNANT_04: 'shooting_remnant_04',
    REMNANT_05: 'shooting_remnant_05',
    REMNANT_06: 'shooting_remnant_06',
    REMNANT_07: 'shooting_remnant_07',
    REMNANT_08: 'shooting_remnant_08',
    CH08_GUARDIAN: 'shooting_ch08_guardian',

    // SPECIAL EVENT bosses
    FACELESS: 'shooting_faceless',
    RAID_TEST: 'shooting_raid_test',
    // build1570: DAILY RAID 日替わりボス
    RAID_SHIEN: 'shooting_raid_shien',
    RAID_CAMILLA: 'shooting_raid_camilla',
    BULLET_HELL_TEST: 'shooting_bullet_hell_test',
    NOAH: 'shooting_noah',
    OVERSEER_AMBUSH: 'shooting_overseer_ambush',
    // build1485: 残響の塔15F BOSS
    TOWER15_BOSS: 'shooting_tower15_boss',
  });

  // ============================================================
  // SHOOTING専用敵マスター
  // ============================================================
  // mini_01～05:
  //   画像・ID・基本枠だけ先に確保。
  //   攻撃AIはNormal Stage実装時にshooting_core側へ追加する。
  //
  // remnant_01～03:
  //   CH01～CH03のストーリーBOSS。
  //   可変ゲージHPは gaugeHps で定義する。
  //
  // remnant_04～08:
  //   後続CHAPTER用。
  const SHOOTING_ENEMIES = Object.freeze({
    // ------------------------------------------------------------
    // NORMAL ENEMIES
    // ------------------------------------------------------------

    // ============================================================
    // GENERIC ELEMENTAL ANGELS
    // 5 attributes x SHOT/LASER = 10 reusable zako.
    // FIRE also has a dedicated CHARGE attacker.
    // ============================================================
    [SHOOTING_ENEMY_ID.ZAKO_AQUA_SHOT]: Object.freeze({
      id: SHOOTING_ENEMY_ID.ZAKO_AQUA_SHOT, kind: 'normal', implemented: true,
      name: '水属性天使・SHOT', displayName: 'AQUA ANGEL / SHOT',
      element: 'aqua', attackType: 'shot', image: 'images/zako_aqua_shot.webp',
      hp: 1300, bulletDamage: 90, bulletSpeed: 215, fireRate: 1280,
      moveSpeed: 42, scoreValue: 800, behavior: 'generic_element_shot_v1', uiScale: 1.0,
    }),
    [SHOOTING_ENEMY_ID.ZAKO_AQUA_LASER]: Object.freeze({
      id: SHOOTING_ENEMY_ID.ZAKO_AQUA_LASER, kind: 'normal', implemented: true,
      name: '水属性天使・LASER', displayName: 'AQUA ANGEL / LASER',
      element: 'aqua', attackType: 'laser', image: 'images/zako_aqua_laser.webp',
      hp: 1700, laserDamage: 145, laserSpeed: 540, fireRate: 2050,
      moveSpeed: 30, scoreValue: 950, behavior: 'generic_element_laser_v1', uiScale: 1.0,
    }),
    [SHOOTING_ENEMY_ID.ZAKO_FIRE_SHOT]: Object.freeze({
      id: SHOOTING_ENEMY_ID.ZAKO_FIRE_SHOT, kind: 'normal', implemented: true,
      name: '火属性天使・SHOT', displayName: 'FIRE ANGEL / SHOT',
      element: 'fire', attackType: 'shot', image: 'images/zako_fire_shot.webp',
      hp: 1300, bulletDamage: 90, bulletSpeed: 215, fireRate: 1280,
      moveSpeed: 42, scoreValue: 800, behavior: 'generic_element_shot_v1', uiScale: 1.0,
    }),
    [SHOOTING_ENEMY_ID.ZAKO_FIRE_LASER]: Object.freeze({
      id: SHOOTING_ENEMY_ID.ZAKO_FIRE_LASER, kind: 'normal', implemented: true,
      name: '火属性天使・LASER', displayName: 'FIRE ANGEL / LASER',
      element: 'fire', attackType: 'laser', image: 'images/zako_fire_laser.webp',
      hp: 1700, laserDamage: 145, laserSpeed: 540, fireRate: 2050,
      moveSpeed: 30, scoreValue: 950, behavior: 'generic_element_laser_v1', uiScale: 1.0,
    }),
    [SHOOTING_ENEMY_ID.ZAKO_FIRE_CHARGE]: Object.freeze({
      id: SHOOTING_ENEMY_ID.ZAKO_FIRE_CHARGE, kind: 'normal', implemented: true,
      name: '火属性天使・CHARGE', displayName: 'FIRE ANGEL / CHARGE',
      element: 'fire', attackType: 'charge', image: 'images/zako_fire_charge.webp',
      hp: 1900,
      contactDamage: 180,
      chargeSpeed: 500,
      chargeDurationMs: 620,
      telegraphMs: 760,
      fireRate: 1650,
      moveSpeed: 28,
      scoreValue: 1050,
      behavior: 'generic_element_charge_v1',
      uiScale: 1.12,
    }),
    [SHOOTING_ENEMY_ID.ZAKO_WOOD_SHOT]: Object.freeze({
      id: SHOOTING_ENEMY_ID.ZAKO_WOOD_SHOT, kind: 'normal', implemented: true,
      name: '木属性天使・SHOT', displayName: 'WOOD ANGEL / SHOT',
      element: 'wood', attackType: 'shot', image: 'images/zako_wood_shot.webp',
      hp: 1300, bulletDamage: 90, bulletSpeed: 215, fireRate: 1280,
      moveSpeed: 42, scoreValue: 800, behavior: 'generic_element_shot_v1', uiScale: 1.0,
    }),
    [SHOOTING_ENEMY_ID.ZAKO_WOOD_LASER]: Object.freeze({
      id: SHOOTING_ENEMY_ID.ZAKO_WOOD_LASER, kind: 'normal', implemented: true,
      name: '木属性天使・LASER', displayName: 'WOOD ANGEL / LASER',
      element: 'wood', attackType: 'laser', image: 'images/zako_wood_laser.webp',
      hp: 1700, laserDamage: 145, laserSpeed: 540, fireRate: 2050,
      moveSpeed: 30, scoreValue: 950, behavior: 'generic_element_laser_v1', uiScale: 1.0,
    }),
    [SHOOTING_ENEMY_ID.ZAKO_DARK_SHOT]: Object.freeze({
      id: SHOOTING_ENEMY_ID.ZAKO_DARK_SHOT, kind: 'normal', implemented: true,
      name: '闇属性天使・SHOT', displayName: 'DARK ANGEL / SHOT',
      element: 'dark', attackType: 'shot', image: 'images/zako_dark_shot.webp',
      hp: 1300, bulletDamage: 90, bulletSpeed: 215, fireRate: 1280,
      moveSpeed: 42, scoreValue: 800, behavior: 'generic_element_shot_v1', uiScale: 1.0,
    }),
    [SHOOTING_ENEMY_ID.ZAKO_DARK_LASER]: Object.freeze({
      id: SHOOTING_ENEMY_ID.ZAKO_DARK_LASER, kind: 'normal', implemented: true,
      name: '闇属性天使・LASER', displayName: 'DARK ANGEL / LASER',
      element: 'dark', attackType: 'laser', image: 'images/zako_dark_laser.webp',
      hp: 1700, laserDamage: 145, laserSpeed: 540, fireRate: 2050,
      moveSpeed: 30, scoreValue: 950, behavior: 'generic_element_laser_v1', uiScale: 1.0,
    }),
    [SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT]: Object.freeze({
      id: SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT, kind: 'normal', implemented: true,
      name: '光属性天使・SHOT', displayName: 'LIGHT ANGEL / SHOT',
      element: 'light', attackType: 'shot', image: 'images/zako_light_shot.webp',
      hp: 1300, bulletDamage: 90, bulletSpeed: 215, fireRate: 1280,
      moveSpeed: 42, scoreValue: 800, behavior: 'generic_element_shot_v1', uiScale: 1.0,
    }),
    [SHOOTING_ENEMY_ID.ZAKO_LIGHT_LASER]: Object.freeze({
      id: SHOOTING_ENEMY_ID.ZAKO_LIGHT_LASER, kind: 'normal', implemented: true,
      name: '光属性天使・LASER', displayName: 'LIGHT ANGEL / LASER',
      element: 'light', attackType: 'laser', image: 'images/zako_light_laser.webp',
      hp: 1700, laserDamage: 145, laserSpeed: 540, fireRate: 2050,
      moveSpeed: 30, scoreValue: 950, behavior: 'generic_element_laser_v1', uiScale: 1.0,
    }),

    // ============================================================
    // CH07-3 群がる強化個体
    // 一番近い味方オブジェクト（TRAP / デコイ / 召喚獣 / 自機）へ這い寄り、接触でダメージ。
    // 大：TRAP爆発3回で撃破（通常射撃でも削れる）。5秒ごとに小を生む（1体につき同時3体まで）。
    // 小：TRAP爆発1回で撃破。速い。
    // ============================================================
    // CH07-2 空の聖堂：出口をふさぐ強化個体（弱点バリアなし。遮断壁の向こうから弾幕）
    // 白い三頭狼。
    [SHOOTING_ENEMY_ID.STRONG_CH07_02]: Object.freeze({
      id: SHOOTING_ENEMY_ID.STRONG_CH07_02, kind: 'normal', implemented: true,
      name: '白い三頭狼の強化個体', displayName: 'ENHANCED / WOLF',
      element: 'neutral', image: 'images/strong_ch07_02_wolf.webp',
      hp: 6000, bulletDamage: 120, bulletSpeed: 235, fireRate: 1100,
      moveSpeed: 40, scoreValue: 3000, behavior: 'mini_barrage_v1',
      strongEnemy: true, uiScale: 2.1,
    }),

    // CH07-04: own-willed bullets that continuously seek a living presence.
    [SHOOTING_ENEMY_ID.CH07_WILL_O_WISP]: Object.freeze({
      id:SHOOTING_ENEMY_ID.CH07_WILL_O_WISP, kind:'normal', implemented:true,
      name:'灰の追跡眼', displayName:'ASH / SEEKER', element:'neutral',
      image:'images/enemy_mini_01_battle.webp',
      hp:5700, bulletDamage:100, bulletSpeed:205, fireRate:1850,
      moveSpeed:33, scoreValue:1750, behavior:'ch07_sentient_eye_v1',
      strongEnemy:true, uiScale:1.50
    }),

    [SHOOTING_ENEMY_ID.SWARM_SPIDER_LARGE]: Object.freeze({
      id: SHOOTING_ENEMY_ID.SWARM_SPIDER_LARGE, kind: 'normal', implemented: true,
      name: '灰織りの強化個体', displayName: 'SWARM / BROOD',
      element: 'neutral', attackType: 'contact', image: 'images/remnant_spider_large.webp',
      hp: 3600, contactDamage: 140, moveSpeed: 30, scoreValue: 2400,
      behavior: 'swarm_spider_v1', swarmRole: 'large', uiScale: 1.75,
    }),
    [SHOOTING_ENEMY_ID.SWARM_SPIDER_SMALL]: Object.freeze({
      id: SHOOTING_ENEMY_ID.SWARM_SPIDER_SMALL, kind: 'normal', implemented: true,
      name: '灰織りの子', displayName: 'SWARM / LARVA',
      element: 'neutral', attackType: 'contact', image: 'images/remnant_spider_small.webp',
      hp: 160, contactDamage: 55, moveSpeed: 96, scoreValue: 120,
      behavior: 'swarm_spider_v1', swarmRole: 'small', uiScale: 0.72,
    }),

    [SHOOTING_ENEMY_ID.MINI_01]: Object.freeze({
      id: SHOOTING_ENEMY_ID.MINI_01,
      kind: 'normal',
      miniNo: 1,
      implemented: true,
      name: '観測眼の残穢',
      displayName: '観測眼の残穢',
      image: 'images/enemy_mini_01_battle.webp',
      element: 'neutral',
      hp: 1000,
      bulletDamage: 85,
      bulletSpeed: 185,
      fireRate: 1550,
      moveSpeed: 38,
      scoreValue: 650,
      behavior: 'mini_eye_v1',
      uiScale: 1.0,
    }),

    [SHOOTING_ENEMY_ID.MINI_02]: Object.freeze({
      id: SHOOTING_ENEMY_ID.MINI_02,
      kind: 'normal',
      miniNo: 2,
      implemented: true,
      name: '暴威の残穢',
      displayName: '暴威の残穢',
      image: 'images/enemy_mini_02_battle.webp',

      // CHAPTER 02: 数ではなく「個の暴力」で押す強敵。
      hp: 4000,
      bulletDamage: 180,
      contactDamage: 240,
      bulletSpeed: 250,
      fireRate: 1900,
      moveSpeed: 55,
      scoreValue: 1200,

      // 重撃 / 圧力弾 / 突進を順番に使う。
      heavyShotDamage: 210,
      pressureShotDamage: 150,
      chargeDamage: 240,
      chargeSpeed: 520,
      telegraphMs: 520,
      behavior: 'mini_violence_v1',
      uiScale: 2.0,
    }),

    [SHOOTING_ENEMY_ID.MINI_03]: Object.freeze({
      id: SHOOTING_ENEMY_ID.MINI_03,
      kind: 'normal',
      miniNo: 3,
      implemented: true,
      name: '星護の残穢',
      displayName: '星護の残穢',
      image: 'images/enemy_mini_03_battle.webp',
      element: 'aqua',
      // CH03通常敵。弾幕は濃いが、撃破テンポは軽めにする。
      hp: 1400,
      bulletDamage: 105,
      bulletSpeed: 220,
      fireRate: 1220,
      moveSpeed: 44,
      scoreValue: 900,
      behavior: 'mini_barrage_v1',
      uiScale: 1.45,
    }),

    [SHOOTING_ENEMY_ID.MINI_04]: Object.freeze({
      id: SHOOTING_ENEMY_ID.MINI_04,
      kind: 'normal',
      miniNo: 4,
      implemented: true,
      name: '流麗の残穢',
      displayName: '流麗の残穢',
      image: 'images/remnant_04_zako_up.webp',
      // CH04通常敵。密度よりも軌道の美しさを優先する。
      hp: 1500,
      bulletDamage: 95,
      bulletSpeed: 205,
      fireRate: 1180,
      moveSpeed: 40,
      scoreValue: 1050,
      behavior: 'mini_beautiful_v1',
      uiScale: 1.40,
    }),

    [SHOOTING_ENEMY_ID.MINI_05]: Object.freeze({
      id: SHOOTING_ENEMY_ID.MINI_05,
      kind: 'normal',
      miniNo: 5,
      implemented: true,
      name: 'ミラージュの残影',
      displayName: 'ミラージュの残影',
      image: 'images/remnant_05_battle_mini.webp',
      hp: 2400,
      bulletDamage: 120,
      bulletSpeed: 230,
      fireRate: 1080,
      moveSpeed: 44,
      scoreValue: 1000,
      behavior: 'mini_mirage_v1',
      uiScale: 1.35,
    }),

    // ------------------------------------------------------------
    // BOSS - REMNANT 01
    // ------------------------------------------------------------
    [SHOOTING_ENEMY_ID.REMNANT_01]: Object.freeze({
      id: SHOOTING_ENEMY_ID.REMNANT_01,
      kind: 'boss',
      remnantNo: 1,
      implemented: true,
      name: 'オーバーシア',
      displayName: 'REMNANT 01　オーバーシア',
      image: 'images/remnant_01_battle.webp',
      element: 'neutral',

      gaugeHps: Object.freeze([6500, 7500]),
      gauges: 2,

      bulletSpeed: 255,
      fireRate: 760,
      bulletDamage: 200,

      behavior: 'overseer_v1',
      uiScale: 1.0,
    }),

    // ------------------------------------------------------------
    // FUTURE BOSSES
    // ------------------------------------------------------------
    [SHOOTING_ENEMY_ID.REMNANT_02]: Object.freeze({
      id: SHOOTING_ENEMY_ID.REMNANT_02,
      kind: 'boss',
      remnantNo: 2,
      implemented: true,
      name: 'イリシュ',
      displayName: 'REMNANT 02　イリシュ',
      image: 'images/remnant_02_battle.webp',
      element: 'fire',

      gaugeHps: Object.freeze([5500, 7500]),
      gauges: 2,

      bulletSpeed: 285,
      fireRate: 920,
      bulletDamage: 230,
      contactDamage: 300,
      chargeSpeed: 610,

      behavior: 'violence_v1',
      // CH02-4 突進の当たり判定が広すぎて回避不能だったため縮小。
      // 旧: 2.0 (画面幅の大半を占め、突進を避けられなかった)
      uiScale: 1.15,
    }),
    [SHOOTING_ENEMY_ID.REMNANT_03]: Object.freeze({
      id: SHOOTING_ENEMY_ID.REMNANT_03,
      kind: 'boss',
      remnantNo: 3,
      implemented: true,
      name: 'リヴィア',
      displayName: 'REMNANT 03　リヴィア',
      image: 'images/remnant_03_battle.webp',
      element: 'aqua',

      gaugeHps: Object.freeze([4500, 4500, 4500]),
      gauges: 3,

      bulletSpeed: 248,
      fireRate: 820,
      bulletDamage: 210,

      behavior: 'barrage_v1',
      uiScale: 1.18,
    }),

    // CH08 final boss: the identity of the tower's guard remains unknown.
    // Uses existing barrage_v1 behavior and placeholder art until dedicated art is supplied.
    [SHOOTING_ENEMY_ID.CH08_GUARDIAN]: Object.freeze({
      id: SHOOTING_ENEMY_ID.CH08_GUARDIAN,
      kind: 'boss', implemented: true,
      name: '塔の守護者', displayName: 'TOWER GUARDIAN　塔の守護者',
      image: 'images/remnant_03_battle.webp', element: 'light',
      gaugeHps: Object.freeze([9500,12500]), gauges: 2,
      bulletSpeed: 250, fireRate: 920, bulletDamage: 175,
      behavior: 'barrage_v1', uiScale: 1.03,
    }),

    // ------------------------------------------------------------
    // SPECIAL EVENT - 無貌の天使
    // ------------------------------------------------------------
    [SHOOTING_ENEMY_ID.FACELESS]: Object.freeze({
      id: SHOOTING_ENEMY_ID.FACELESS,
      kind: 'boss',
      implemented: true,
      name: 'フェイスレス',
      displayName: 'FACELESS　無貌の天使',
      image: 'images/enemy_faceless_battle.webp',

      // 実HPはステージ側のfaceless.waveHpでwaveごとに上書きする。
      gaugeHp: 7600,
      gauges: 1,

      bulletSpeed: 225,
      fireRate: 820,
      bulletDamage: 145,

      behavior: 'faceless_event_v1',
      uiScale: 1.28,
    }),


    // ------------------------------------------------------------
    // DAILY RAID - ザ・テスト
    // ------------------------------------------------------------
    [SHOOTING_ENEMY_ID.RAID_TEST]: Object.freeze({
      id: SHOOTING_ENEMY_ID.RAID_TEST,
      kind: 'boss',
      implemented: true,
      name: 'ザ・テスト',
      displayName: 'RAID ENEMY　ザ・テスト',
      image: 'images/raid_enemy_01_battle.webp',

      // 共有HPはSupabaseの日次レイド値で上書き。
      gaugeHp: 33334,
      gauges: 3,
      bulletSpeed: 248,
      fireRate: 820,
      bulletDamage: 190,
      behavior: 'barrage_v1',
      uiScale: 1.12,
    }),

    // ------------------------------------------------------------
    // DAILY RAID - シエン（build1570）
    // 紫煙をまとう剣士。突進と重い一撃（violence_v1）。闇属性。
    // 共有HPはSupabaseの日次レイド値で上書きされる。
    // ------------------------------------------------------------
    [SHOOTING_ENEMY_ID.RAID_SHIEN]: Object.freeze({
      id: SHOOTING_ENEMY_ID.RAID_SHIEN,
      kind: 'boss',
      implemented: true,
      name: 'シエン',
      displayName: 'RAID ENEMY　シエン',
      image: 'images/raid_enemy_02_battle.webp',
      element: 'dark',

      gaugeHp: 33334,
      gauges: 3,
      bulletSpeed: 270,
      fireRate: 960,
      bulletDamage: 210,
      contactDamage: 280,
      chargeSpeed: 600,

      behavior: 'violence_v1',
      // build1571: 霞化(7秒実体→4秒無敵) / 回転斬り / 出血。shooting_core.js updateShienMechanics。
      shienMechanics: true,
      // 突進の当たり判定は表示サイズに比例するため、イリシュ（CH02-4）と同じ1.15に留める。
      uiScale: 1.15,
    }),
    [SHOOTING_ENEMY_ID.RAID_CAMILLA]: Object.freeze({
      id: SHOOTING_ENEMY_ID.RAID_CAMILLA,
      kind: 'boss',
      implemented: true,
      name: 'カミラ',
      displayName: 'RAID ENEMY　カミラ',
      image: 'images/raid_enemy_03_battle.webp',
      element: 'fire',

      gaugeHp: 33334,
      gauges: 3,
      bulletSpeed: 200,
      fireRate: 860,
      bulletDamage: 205,

      // build1578: 3体目。サキエルと同じ「美しい弾幕」（螺旋＋ウェーブ）。専用ギミックは今後追加。
      behavior: 'beautiful_boss_v1',
      uiScale: 1.15,
    }),


    // ------------------------------------------------------------
    // SPECIAL STAGE - 超弾幕（パフォーマンス検証用ストレステスト）
    // 見た目は徹底的に簡素化し、弾数の生値だけで重さを測る想定。
    // 4発被弾で撃破される想定のダメージ値(bulletDamage)にしてある。
    // ------------------------------------------------------------
    [SHOOTING_ENEMY_ID.BULLET_HELL_TEST]: Object.freeze({
      id: SHOOTING_ENEMY_ID.BULLET_HELL_TEST,
      kind: 'boss',
      implemented: true,
      name: 'テストエネミー',
      displayName: 'SPECIAL STAGE　超弾幕',
      image: 'images/testenemy_battle_up.webp',

      // WAVE(フェーズ)3段。各段のHPは軽め＝早く弾幕密度が上がる方を優先。
      gaugeHp: 5000,
      gauges: 3,

      bulletSpeed: 230,
      fireRate: 300,
      // 標準HP帯(エリ670前後)を基準に「4発で撃破」相当。
      // キャラのHPにより多少前後する点は許容。
      bulletDamage: 180,

      behavior: 'bullet_hell_test_v1',
      uiScale: 1.0,
    }),


    // ------------------------------------------------------------
    // SPECIAL STAGE - 楽園 -ノア-
    // スコアアタック用テスト敵とは分離した専用BOSS。
    // 弾幕ロジックは既存 bullet_hell_test_v1 を流用する。
    // ------------------------------------------------------------
    // build1485: 残響の塔15F BOSS。PHASE2構成・WARNING常駐・暗転。
    [SHOOTING_ENEMY_ID.TOWER15_BOSS]: Object.freeze({
      id: SHOOTING_ENEMY_ID.TOWER15_BOSS,
      kind: 'boss',
      implemented: true,
      name: 'トワ',
      displayName: 'ECHO TOWER 15F　トワ',
      image: 'images/tower15_boss_battle.webp',
      element: 'dark',
      gaugeHps: Object.freeze([11000, 13000]),
      gauges: 2,
      bulletSpeed: 180,
      fireRate: 140,
      bulletDamage: 240,
      behavior: 'tower15_echo_v1',
      uiScale: 1.1,
    }),

    [SHOOTING_ENEMY_ID.NOAH]: Object.freeze({
      id: SHOOTING_ENEMY_ID.NOAH,
      kind: 'boss',
      implemented: true,
      name: '理想郷：ノア',
      displayName: 'SPECIAL STAGE　理想郷：ノア',
      image: 'images/noah_battle.webp',
      element: 'light', // 光属性：本体と発射弾の共通属性

      gaugeHp: 5000,
      gauges: 3,

      bulletSpeed: 230,
      fireRate: 300,
      bulletDamage: 180,

      behavior: 'bullet_hell_test_v1',
      uiScale: 1.0,
    }),

    [SHOOTING_ENEMY_ID.REMNANT_04]: Object.freeze({
      id: SHOOTING_ENEMY_ID.REMNANT_04,
      kind: 'boss',
      remnantNo: 4,
      implemented: true,
      name: 'サキエル',
      displayName: 'REMNANT 04　サキエル',
      image: 'images/enemy_sakiel_battle.webp',

      // CHAPTER04-04「美しい弾幕」本実装。
      // 超軽量を維持しつつ、螺旋とウェーブを多色で見せる。
      gaugeHp: 13500,
      gauges: 3,
      bulletSpeed: 190,
      fireRate: 860,
      bulletDamage: 205,

      behavior: 'beautiful_boss_v1',
      uiScale: 1.18,
    }),
    [SHOOTING_ENEMY_ID.REMNANT_05]: Object.freeze({
      id: SHOOTING_ENEMY_ID.REMNANT_05,
      kind: 'boss',
      remnantNo: 5,
      implemented: true,
      name: 'ミラージュ',
      displayName: 'REMNANT 05　ミラージュ',
      image: 'images/remnant_05_battle.webp',
      gaugeHp: 4500,
      gauges: 3,
      bulletSpeed: 240,
      fireRate: 820,
      bulletDamage: 220,
      behavior: 'barrage_v1',
      uiScale: 1.20,
    }),
    // ------------------------------------------------------------
    // RANDOM AMBUSH - OVERSEER VARIANT
    // ------------------------------------------------------------
    [SHOOTING_ENEMY_ID.OVERSEER_AMBUSH]: Object.freeze({
      id: SHOOTING_ENEMY_ID.OVERSEER_AMBUSH,
      kind: 'boss',
      implemented: true,
      name: 'オーバーシア（亜種）',
      displayName: 'EMERGENCY　オーバーシア（亜種）',
      image: 'images/remnant_01_blk_battle.webp',
      gaugeHp: 2500,
      gauges: 1,
      bulletSpeed: 210,
      fireRate: 920,
      bulletDamage: 350,
      behavior: 'overseer_ambush_v1',
      uiScale: 1.0,
    }),

    [SHOOTING_ENEMY_ID.REMNANT_06]: Object.freeze({
      id: SHOOTING_ENEMY_ID.REMNANT_06,
      kind: 'boss',
      remnantNo: 6,
      implemented: false,
    }),
    [SHOOTING_ENEMY_ID.REMNANT_07]: Object.freeze({
      id: SHOOTING_ENEMY_ID.REMNANT_07,
      kind: 'boss',
      remnantNo: 7,
      implemented: false,
    }),
    [SHOOTING_ENEMY_ID.REMNANT_08]: Object.freeze({
      id: SHOOTING_ENEMY_ID.REMNANT_08,
      kind: 'boss',
      remnantNo: 8,
      implemented: false,
    }),
  });

  const DEFAULT_SHOOTING_ENEMY_ID = SHOOTING_ENEMY_ID.REMNANT_01;

  function getShootingEnemy(enemyId) {
    return SHOOTING_ENEMIES[String(enemyId || '')] || null;
  }

  function getDefaultShootingEnemy() {
    return getShootingEnemy(DEFAULT_SHOOTING_ENEMY_ID);
  }

  function isShootingEnemyImplemented(enemyId) {
    const enemy = getShootingEnemy(enemyId);
    return !!(enemy && enemy.implemented);
  }

  function getShootingNormalEnemies() {
    return Object.values(SHOOTING_ENEMIES).filter(enemy => enemy && enemy.kind === 'normal');
  }

  function getShootingBossEnemies() {
    return Object.values(SHOOTING_ENEMIES).filter(enemy => enemy && enemy.kind === 'boss');
  }

  window.ShootingEnemies = Object.freeze({
    SHOOTING_ENEMY_ID,
    SHOOTING_ENEMIES,
    DEFAULT_SHOOTING_ENEMY_ID,
    getShootingEnemy,
    getDefaultShootingEnemy,
    isShootingEnemyImplemented,
    getShootingNormalEnemies,
    getShootingBossEnemies,
  });
})();
