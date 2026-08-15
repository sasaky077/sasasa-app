// Zeraphia Shooting - standalone character master / combat profiles / ownership
// IMPORTANT:
// - This file does NOT read CHARACTERS / window.CHARACTERS.
// - Strategy character definitions and shooting character definitions are fully independent.
// - Character IDs are kept aligned only as identifiers.
(function () {
  'use strict';

  const CHARACTER_ID = Object.freeze({
    ERI: 1,
    NEM: 2,
    SUI: 3,
    ARNO: 4,
    CLARINE: 5,
    IGNIS: 6,
    ROSE: 7,
    MIMOSA: 8,
    PATRA: 9,
    FLORA: 10,
    SHIGURE: 11,
    HAYATE: 12,
    MIA: 13,
    AYANE: 14,
    ELTENA: 15,
    MITO: 16,
    ANGE: 17,
  });

  // ============================================================
  // SHOOTING専用キャラクターマスター
  // ============================================================
  // Strategy側 characters.js とは完全に独立。
  // 今後、HP / ATK / 画像 / 表示倍率をシューティングだけ変更しても
  // Strategy側には一切影響しない。
  const SHOOTING_CHARACTER_MASTER = Object.freeze({
    1: {
      id: 1, name: 'エリ',
      element: ['mystis', 'logos'],
      hp: 670, atk: 235,
      image: 'images/chara_01_battle_back.webp',
      panelImage: 'images/chara_01_panel.webp',
      cutinImage: 'images/chara_01_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 1.0, battleUp: 1.0 },
    },
    2: {
      id: 2, name: 'ネム',
      element: 'chaos',
      hp: 560, atk: 270,
      image: 'images/chara_02_battle_back.webp',
      panelImage: 'images/chara_02_panel.webp',
      cutinImage: 'images/chara_02_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 1.3, battleUp: 1.0 },
    },
    3: {
      id: 3, name: 'スイ',
      element: 'mystis',
      hp: 600, atk: 250,
      image: 'images/chara_03_battle_back.webp',
      panelImage: 'images/chara_03_panel.webp',
      cutinImage: 'images/chara_03_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 0.75, battleUp: 1.0 },
    },
    4: {
      id: 4, name: 'アルノ',
      element: 'chaos',
      hp: 500, atk: 300,
      image: 'images/chara_04_battle_back.webp',
      panelImage: 'images/chara_04_panel.webp',
      cutinImage: 'images/chara_04_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 0.85, battleUp: 1.0 },
    },
    5: {
      id: 5, name: 'クラリネ',
      element: 'chaos',
      hp: 580, atk: 280,
      image: 'images/chara_05_battle_back.webp',
      panelImage: 'images/chara_05_panel.webp',
      cutinImage: 'images/chara_05_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 1.3, battleUp: 1.0 },
    },
    6: {
      id: 6, name: 'イグニス',
      element: 'chaos',
      hp: 600, atk: 285,
      image: 'images/chara_06_battle_back.webp',
      panelImage: 'images/chara_06_panel.webp',
      cutinImage: 'images/chara_06_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 1.7, battleUp: 1.0 },
    },
    7: {
      id: 7, name: 'ロゼ',
      element: 'chaos',
      hp: 680, atk: 230,
      image: 'images/chara_07_battle_back.webp',
      panelImage: 'images/chara_07_panel.webp',
      cutinImage: 'images/chara_07_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 1.2, battleUp: 1.0 },
    },
    8: {
      id: 8, name: 'ミモザ',
      element: 'logos',
      hp: 700, atk: 220,
      image: 'images/chara_08_battle_back.webp',
      panelImage: 'images/chara_08_panel.webp',
      cutinImage: 'images/chara_08_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 1.55, battleUp: 1.0 },
    },
    9: {
      id: 9, name: 'パトラ',
      element: 'chaos',
      hp: 590, atk: 275,
      image: 'images/chara_09_battle_back.webp',
      panelImage: 'images/chara_09_panel.webp',
      cutinImage: 'images/chara_09_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 1.5, battleUp: 1.0 },
    },
    10: {
      id: 10, name: 'フローラ',
      element: 'mystis',
      hp: 650, atk: 210,
      image: 'images/chara_10_battle_back.webp',
      panelImage: 'images/chara_10_panel.webp',
      cutinImage: 'images/chara_10_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 1.5, battleUp: 1.0 },
    },
    11: {
      id: 11, name: 'シグレ',
      element: 'logos',
      hp: 500, atk: 200,
      image: 'images/chara_11_battle_back.webp',
      panelImage: 'images/chara_11_panel.webp',
      cutinImage: 'images/chara_11_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 1.5, battleUp: 1.0 },
    },
    12: {
      id: 12, name: 'ハヤテ',
      element: 'logos',
      hp: 580, atk: 305,
      image: 'images/chara_12_battle_back.webp',
      panelImage: 'images/chara_12_panel.webp',
      cutinImage: 'images/chara_12_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 1.0, battleUp: 1.0 },
    },
    13: {
      id: 13, name: 'ミア',
      element: 'mystis',
      hp: 540, atk: 295,
      image: 'images/chara_13_battle_back.webp',
      panelImage: 'images/chara_13_panel.webp',
      cutinImage: 'images/chara_13_cutin.webp',
      uiScale: { panel: 0.6, battleBack: 1.0, battleUp: 0.75 },
    },
    14: {
      id: 14, name: 'アヤネ',
      element: 'logos',
      hp: 740, atk: 225,
      image: 'images/chara_14_battle_back.webp',
      panelImage: 'images/chara_14_panel.webp',
      cutinImage: 'images/chara_14_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 0.70, battleUp: 0.7 },
    },
    15: {
      id: 15, name: 'エルテナ',
      element: 'chaos',
      hp: 560, atk: 290,
      image: 'images/chara_15_battle_back.webp',
      panelImage: 'images/chara_15_panel.webp',
      cutinImage: 'images/chara_15_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 1.25, battleUp: 1.0 },
    },
    16: {
      id: 16, name: 'ミト',
      element: 'mystis',
      hp: 700, atk: 245,
      image: 'images/chara_16_battle_back.webp',
      panelImage: 'images/chara_16_panel.webp',
      cutinImage: 'images/chara_16_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 1.5, battleUp: 1.0 },
    },
    17: {
      id: 17, name: 'アンジェ',
      element: 'logos',
      hp: 720, atk: 190,
      image: 'images/chara_17_battle_back.webp',
      panelImage: 'images/chara_17_panel.webp',
      cutinImage: 'images/chara_17_cutin.webp',
      uiScale: { panel: 1.0, battleBack: 1.55, battleUp: 0.8 },
    },
  });

  function getShootingCharacterMaster(id) {
    return SHOOTING_CHARACTER_MASTER[Number(id)] || null;
  }

  function buildShootingCharacter(profile) {
    const master = getShootingCharacterMaster(profile.id);
    if (!master) return null;

    return {
      ...profile,
      id: master.id,
      name: profile.name || master.name,
      element: profile.element ?? master.element ?? null,
      image: profile.image || master.image,
      panelImage: profile.panelImage || master.panelImage || master.image,
      cutinImage: profile.cutinImage || master.cutinImage || '',
      hp: Number(profile.hp ?? master.hp),
      atk: Number(profile.atk ?? master.atk),
      uiScale: profile.uiScale || master.uiScale || {},
    };
  }

  // ============================================================
  // 未調整キャラの仮性能
  // ============================================================
  // 固有性能決定まではエリの操作感・ULTを継承。
  // HP / ATK / 画像 / 表示倍率だけは各SHOOTING_CHARACTER_MASTERを使用。
  const ERI_BASE_PROFILE = Object.freeze({
    // 通常攻撃ダメージは ATK × shotPowerRate。
    // fireRate / shotCount と合わせて理論DPSを調整する。
    label: 'BALANCE',
    description: '暫定：エリと同じ標準性能。',
    ultName: '駆け巡る閃光',
    ultType: 'balance_flash',
    moveSpeed: 430,
    fireRate: 170,
    bulletSpeed: 780,
    shotPowerRate: 0.095,

    // ---- 通常ショット設定 ----
    shotType: 'parallel',
    shotCount: 2,          // 同時に出す弾数
    shotSpacing: 18,       // 並列弾の中心間隔(px)
    shotAngleStep: 0,      // 角度差(rad)。parallelでは通常0
    shotStyle: 'normal',   // CSS演出キー

    burstDamage: 18,
    burstNeed: 28,
    ultGainPerHit: 0.476,
    coreTop: '38%',
    shotOffsetY: 38,
  });

  function makeInheritedProfile(id) {
    const master = getShootingCharacterMaster(id);
    if (!master) return null;

    return buildShootingCharacter({
      ...ERI_BASE_PROFILE,
      id: master.id,
      effectKey: 'eri', // 暫定ULTはエリ演出を共有
      name: master.name,
    });
  }

  // ============================================================
  // SHOOTING専用戦闘プロフィール
  // ============================================================
  // 固有実装済み：1エリ / 2ネム / 3スイ / 4アルノ / 5クラリネ / 6イグニス / 7ロゼ / 12ハヤテ / 14アヤネ
  // その他13人：現時点ではエリ性能を継承
  const SHOOTING_CHARACTERS = {};

  Object.keys(SHOOTING_CHARACTER_MASTER).forEach(id => {
    const profile = makeInheritedProfile(Number(id));
    if (profile) SHOOTING_CHARACTERS[Number(id)] = profile;
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.ERI] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.ERI,
    effectKey: 'eri',
    description: '扱いやすい標準型。2連射で安定して攻める。',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.SUI] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.SUI,
    effectKey: 'sui',
    label: 'CLOCK / DELAY BURST',
    description: 'シンプルな2ライン射撃。ULTは時計のカウント後、3秒後に大回復と弾幕消去と大ダメージを同時発動する。',
    ultName: '星環の約束',
    ultType: 'sui_clock_burst',
    moveSpeed: 420,
    fireRate: 170,
    bulletSpeed: 800,
    shotPowerRate: 0.095,

    // ---- 通常ショット設定 ----
    shotType: 'parallel',
    shotCount: 2,
    shotSpacing: 18,
    shotStyle: 'sui',

    burstDamage: 0,
    burstNeed: 30,
    ultGainPerHit: 0.510,
    coreTop: '38%',
    shotOffsetY: 38,

    // ---- ULT設定 ----
    clockTitleLeadMs: 1000,
    clockDelayMs: 4000,
    clockMarks: ['X', 'XI', 'XII'],
    clockStepMs: 1000,
    ultDamageAtkMultiplier: 3.0,
    ultFullHeal: true,
    ultClearEnemyBullets: true,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.ARNO] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.ARNO,
    effectKey: 'arno',
    label: 'ORBIT / AURA',
    description: '円環軌道を描きながら前進する特殊射撃。ULTは弾幕を消し、5秒間の攻撃オーラを展開する。',
    ultName: '環流',
    ultType: 'arno_aura',
    moveSpeed: 405,
    fireRate: 185,
    bulletSpeed: 455,
    shotPowerRate: 0.105,

    // ---- 通常ショット設定 ----
    shotType: 'orbit_forward',
    shotCount: 2,
    shotSpacing: 28,
    shotStyle: 'arno',
    orbitRadius: 34,
    orbitAngularSpeed: 13.5,
    orbitForwardLoopRate: 0.30,
    orbitPhaseStep: Math.PI,

    burstDamage: 36,
    burstNeed: 30,
    ultGainPerHit: 0.555,
    coreTop: '38%',
    shotOffsetY: 38,
    auraDurationMs: 5000,
    auraTickMs: 250,
    auraTickDamage: 1.8,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.CLARINE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.CLARINE,
    effectKey: 'clarine',
    label: 'DECOY / CHAOS BARRAGE',
    description: '低火力の4ライン円環射撃。ULTでデコイを2体召喚し、全方位乱射と爆散で盤面を攪乱する。',
    ultName: '空想遊戯',
    ultType: 'clarine_decoy',
    moveSpeed: 410,
    fireRate: 178,
    bulletSpeed: 430,
    shotPowerRate: 0.050,

    // ---- 通常ショット設定 ----
    shotType: 'orbit_forward',
    shotCount: 4,
    shotSpacing: 26,
    shotStyle: 'clarine',
    orbitRadius: 28,
    orbitAngularSpeed: 12.4,
    orbitForwardLoopRate: 0.28,
    orbitPhaseStep: 1.5707963267948966,

    burstDamage: 0,
    burstNeed: 30,
    ultGainPerHit: 0.297,
    coreTop: '38%',
    shotOffsetY: 38,

    // ---- ULT / デコイ設定 ----
    decoyCount: 2,
    decoyMaxActive: 2,
    decoyDurationMs: 6000,
    decoyHp: 520,
    decoyFireIntervalMs: 210,
    decoyShotsPerBurst: 4,
    decoyBulletSpeed: 300,
    decoyBulletDamage: 1.2,
    decoyExplosionRadius: 124,
    decoyExplosionDamageMultiplier: 2.2,
    decoyYMaxRatio: 0.47,
    decoyImage: 'images/chara_05_battle_decoy.webp',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.IGNIS] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.IGNIS,
    effectKey: 'ignis',
    label: 'LASER / BURN',
    description: '一直線の連続レーザーを照射し続ける火力型。ULT「火炎車」は炎の輪を3.5秒旋回させ、接触した敵を燃焼させる。',
    ultName: '火炎車',
    ultType: 'ignis_fire_wheel',
    moveSpeed: 390,

    // ---- 通常ショット / 連続レーザー ----
    shotType: 'laser',
    shotStyle: 'ignis',
    fireRate: 95,              // レーザーのダメージ判定間隔
    laserWidth: 12,
    laserHitWidth: 22,
    laserDamageAtkRate: 0.105,
    laserVisualHoldMs: 130,

    burstDamage: 0,
    burstNeed: 32,
    ultGainPerHit: 0.676,
    coreTop: '38%',
    shotOffsetY: 42,

    // ---- ULT / 火炎車 ----
    fireWheelDurationMs: 3500,
    fireWheelOrbitRadiusX: 118,
    fireWheelOrbitRadiusY: 172,
    fireWheelAngularSpeed: 1.15,
    fireWheelSize: 112,
    fireWheelHitRadius: 62,
    fireWheelFloatX: 18,
    fireWheelFloatY: 14,
    fireWheelFloatSpeedX: 0.72,
    fireWheelFloatSpeedY: 0.94,
    fireWheelSelfSpinMs: 2200,

    // ---- やけど ----
    burnDurationMs: 5000,
    burnTickMs: 1000,
    burnDamageAtkRate: 0.30,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.ROSE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.ROSE,
    effectKey: 'rose',
    label: 'SEED / HEAL FLOWER',
    description: '0.5秒ごとに種まきのようなスプラッシュ弾を放つ。ULTで中央に大花を咲かせ、花は敵弾を遮り、ハートは味方を回復・敵へダメージ。',
    ultName: '花園の息吹',
    ultType: 'rose_flower_heart',
    moveSpeed: 405,

    // ---- 通常ショット ----
    shotType: 'rose_seed_splash',
    shotStyle: 'rose-seed',
    fireRate: 500,
    bulletSpeed: 335,
    shotPowerRate: 0.085,
    shotCount: 6,
    shotAngleStep: 0.17,

    burstDamage: 0,
    burstNeed: 28,
    ultGainPerHit: 0.467,
    coreTop: '38%',
    shotOffsetY: 40,

    // ---- ULT / 花 ----
    flowerImage: 'images/chara_07_battle_flower.webp',
    flowerDurationMs: 5200,
    flowerHeartIntervalMs: 240,
    flowerHeartBurstCount: 10,
    flowerHeartSpeed: 250,
    flowerHeartLifeMs: 2200,
    flowerHeartHealAmount: 34,

    // ハートが敵に当たった時のダメージ。
    // ULT由来なのでATK参照。ULTゲージは増加させない。
    flowerHeartDamageAtkRate: 0.30,

    flowerHeartOriginOffsetX: 0,
    flowerHeartOriginOffsetY: 0,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.NEM] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.NEM,
    effectKey: 'nem',
    label: 'CONTROL / STUN',
    description: '高速2ライン射撃で安定して攻撃を継続する。',
    ultName: 'どりいむたいむ',
    ultType: 'nem_stun',
    moveSpeed: 410,
    fireRate: 155,
    bulletSpeed: 820,
    shotPowerRate: 0.090,

    // ---- 通常ショット設定 ----
    shotType: 'parallel',
    shotCount: 2,
    shotSpacing: 18,
    shotStyle: 'nem',

    burstDamage: 0,
    burstNeed: 30,
    ultGainPerHit: 0.517,
    ultStunMs: 5000,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.HAYATE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.HAYATE,
    effectKey: 'hayate',
    label: 'SPEED / WIDE',
    description: '高速移動・高連射。5WAYで広い範囲を制圧する。',
    ultName: '黄月閃界・雷光巡行',
    ultType: 'speed_storm',
    moveSpeed: 560,
    fireRate: 92,
    bulletSpeed: 900,
    shotPowerRate: 0.021,

    // ---- 通常ショット設定 ----
    shotType: 'spread',
    shotCount: 5,
    shotAngleStep: 0.19,
    shotStyle: 'hayate',

    // ---- ULT中の射撃補正 ----
    moonlightImage: 'images/chara_12_battle_back_moon.webp',
    moonlightFireRateMultiplier: 0.45,
    moonlightPowerMultiplier: 1.85,

    burstDamage: 15,
    burstNeed: 34,
    ultGainPerHit: 0.1564,
    coreTop: '34%',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.AYANE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.AYANE,
    effectKey: 'ayane',
    label: 'TECHNICAL / POWER',
    description: '狭い射線と遅い連射。命中させ続ければ最大火力。',
    ultName: '暴走',
    ultType: 'precision_beam',
    moveSpeed: 360,
    fireRate: 275,
    bulletSpeed: 980,
    shotPowerRate: 0.315,

    // ---- 通常ショット設定 ----
    shotType: 'precision',
    shotCount: 1,
    shotStyle: 'ayane',
    chargedEvery: 4,
    chargedPowerMultiplier: 1.65,

    burstDamage: 27,
    ultDamageAtkMultiplier: 3.5,
    burstNeed: 24,
    ultGainPerHit: 1.100,
    coreTop: '37%',
    shotOffsetY: 42,
  });

  // ============================================================
  // 所持判定
  // ============================================================
  // ここは「キャラ定義」ではなくアカウント側の所持データをIDで参照する。
  // Strategy characters.js は参照しない。
  function getOwnedShootingInstance(charaId) {
    const id = Number(charaId);

    try {
      if (typeof getRepresentativeOwnedInstance === 'function') {
        const rep = getRepresentativeOwnedInstance(id);
        if (rep) return rep;
      }
    } catch (_) {}

    try {
      if (typeof collected !== 'undefined' && collected && collected[id]) {
        return collected[id];
      }
    } catch (_) {}

    try {
      if (typeof box !== 'undefined' && Array.isArray(box)) {
        return box.find(b => b && Number(b.id) === id) || null;
      }
    } catch (_) {}

    // ---- ローグライト凍結時のフォールバック（既存挙動には影響しない）----
    // 上の3つ(getRepresentativeOwnedInstance / collected / box)が
    // 「そもそも定義すら存在しない」場合だけ、ローグライトが凍結/未読込の
    // スタンドアロン環境とみなし、シューティング内蔵の解放リストにフォールバックする。
    // ローグライトが生きている環境では、このいずれかが必ず定義されているため
    // この分岐には入らず、今までと完全に同じ挙動になる。
    try {
      const roguelitePresent =
        (typeof getRepresentativeOwnedInstance === 'function') ||
        (typeof collected !== 'undefined') ||
        (typeof box !== 'undefined');
      if (!roguelitePresent) {
        return { id, standalone: true };
      }
    } catch (_) {}

    return null;
  }

  function isShootingCharacterOwned(charaId) {
    return !!getOwnedShootingInstance(charaId);
  }

  function getShootingRosterHtml() {
    return Object.values(SHOOTING_CHARACTERS)
      .sort((a, b) => a.id - b.id)
      .map(c => {
        const owned = isShootingCharacterOwned(c.id);
        return `
          <button type="button"
                  class="shooting-character-option${owned ? '' : ' locked'}"
                  data-character-id="${c.id}"
                  onclick="selectShootingCharacter(${c.id})"
                  ${owned ? '' : 'disabled aria-disabled="true"'}>
            <span class="shooting-character-portrait">
              <img src="${c.panelImage || c.image}"
                   alt="${owned ? c.name : '未所持'}"
                   draggable="false">
            </span>
            <b>${owned ? c.name : '????'}</b>
          </button>`;
      })
      .join('');
  }


  window.ShootingCharacters = Object.freeze({
    CHARACTER_ID,
    SHOOTING_CHARACTER_MASTER,
    SHOOTING_CHARACTERS,
    PARTY_SIZE: 3,
    SWITCH_COOLDOWN_MS: 5000,
    getShootingCharacterMaster,
    getOwnedShootingInstance,
    isShootingCharacterOwned,
    getShootingRosterHtml,
  });
})();
