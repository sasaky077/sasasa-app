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

    // Remnant bosses
    REMNANT_01: 'shooting_remnant_01',
    REMNANT_02: 'shooting_remnant_02',
    REMNANT_03: 'shooting_remnant_03',
    REMNANT_04: 'shooting_remnant_04',
    REMNANT_05: 'shooting_remnant_05',
    REMNANT_06: 'shooting_remnant_06',
    REMNANT_07: 'shooting_remnant_07',
    REMNANT_08: 'shooting_remnant_08',

    // SPECIAL EVENT bosses
    FACELESS: 'shooting_faceless',
  });

  // ============================================================
  // SHOOTING専用敵マスター
  // ============================================================
  // mini_01～05:
  //   画像・ID・基本枠だけ先に確保。
  //   攻撃AIはNormal Stage実装時にshooting_core側へ追加する。
  //
  // remnant_01:
  //   現在実装済みのオーバーシア。
  //
  // remnant_02～08:
  //   ID予約のみ。性能は未定義。
  const SHOOTING_ENEMIES = Object.freeze({
    // ------------------------------------------------------------
    // NORMAL ENEMIES
    // ------------------------------------------------------------
    [SHOOTING_ENEMY_ID.MINI_01]: Object.freeze({
      id: SHOOTING_ENEMY_ID.MINI_01,
      kind: 'normal',
      miniNo: 1,
      implemented: true,
      name: '観測眼の残穢',
      displayName: '観測眼の残穢',
      image: 'images/enemy_mini_01_battle.webp',
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
      implemented: false,
      name: '残穢 04',
      displayName: '残穢 04',
      image: 'images/enemy_mini_04_battle.webp',
      behavior: 'mini_04_pending',
    }),

    [SHOOTING_ENEMY_ID.MINI_05]: Object.freeze({
      id: SHOOTING_ENEMY_ID.MINI_05,
      kind: 'normal',
      miniNo: 5,
      implemented: false,
      name: '残穢 05',
      displayName: '残穢 05',
      image: 'images/enemy_mini_05_battle.webp',
      behavior: 'mini_05_pending',
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

      gaugeHp: 7500,
      gauges: 3,

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
      name: '暴力',
      displayName: 'REMNANT 02　暴力',
      image: 'images/remnant_02_battle.webp',

      gaugeHp: 10000,
      gauges: 3,

      bulletSpeed: 285,
      fireRate: 920,
      bulletDamage: 230,
      contactDamage: 300,
      chargeSpeed: 610,

      behavior: 'violence_v1',
      uiScale: 2.0,
    }),
    [SHOOTING_ENEMY_ID.REMNANT_03]: Object.freeze({
      id: SHOOTING_ENEMY_ID.REMNANT_03,
      kind: 'boss',
      remnantNo: 3,
      implemented: true,
      name: '天墜',
      displayName: 'REMNANT 03　天墜',
      image: 'images/remnant_03_battle.webp',

      gaugeHp: 12000,
      gauges: 3,

      bulletSpeed: 248,
      fireRate: 820,
      bulletDamage: 210,

      behavior: 'barrage_v1',
      uiScale: 1.18,
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

    [SHOOTING_ENEMY_ID.REMNANT_04]: Object.freeze({
      id: SHOOTING_ENEMY_ID.REMNANT_04,
      kind: 'boss',
      remnantNo: 4,
      implemented: false,
    }),
    [SHOOTING_ENEMY_ID.REMNANT_05]: Object.freeze({
      id: SHOOTING_ENEMY_ID.REMNANT_05,
      kind: 'boss',
      remnantNo: 5,
      implemented: false,
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
