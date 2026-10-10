// Zeraphia Shooting - standalone stage master
// Strategy stages.js is NOT referenced.
// CHAPTER 01 foundation: 01-03 normal mission stages / 04 boss.
(function () {
  'use strict';

  if (!window.ShootingEnemies) {
    throw new Error('shooting_stages.js requires shooting_enemies.js');
  }

  const { SHOOTING_ENEMY_ID } = window.ShootingEnemies;

  const SHOOTING_MISSION_TYPE = Object.freeze({
    COLLECT_ITEM: 'collect_item',
    CLEAR_TIME: 'clear_time',
    MAX_HITS_TAKEN: 'max_hits_taken',
    BOSS_CLEAR: 'boss_clear',
    DEFEAT_ALL: 'defeat_all',

    // Future mission types reserved for later chapters.
    MAX_COMBO: 'max_combo',
    MIN_ULT_USE: 'min_ult_use',
    MIN_SWITCH_COUNT: 'min_switch_count',
    NO_DOWN: 'no_down',
    SCORE: 'score',
    SURVIVE_TIME: 'survive_time',
  });

  const SHOOTING_CHAPTER_TITLES = {
    get 1() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch01_01']?.chapterTitle || '白の戦線'; },
    get 2() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch02_01']?.chapterTitle || '残骸'; },
    get 3() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch03_01']?.chapterTitle || '魂との邂逅'; },
    get 4() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch04_01']?.chapterTitle || '水音'; },
    get 5() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch05_01']?.chapterTitle || '円環'; },
    6: '未定',
    7: '未定',
    8: '未定'
  };

  const SHOOTING_STAGE_ID = Object.freeze({
    GACHA_TRIAL: 'shooting_gacha_trial', // 勧誘画面専用・非保存の無限試遊
    CH01_01: 'shooting_ch01_01',
    CH01_02: 'shooting_ch01_02',
    CH01_03: 'shooting_ch01_03',
    CH01_04: 'shooting_ch01_04',

    CH02_01: 'shooting_ch02_01',
    CH02_02: 'shooting_ch02_02',
    CH02_03: 'shooting_ch02_03',
    CH02_04: 'shooting_ch02_04',

    CH03_01: 'shooting_ch03_01',
    CH03_02: 'shooting_ch03_02',
    CH03_03: 'shooting_ch03_03',
    CH03_04: 'shooting_ch03_04',

    CH04_01: 'shooting_ch04_01',
    CH04_02: 'shooting_ch04_02',
    CH04_03: 'shooting_ch04_03',
    CH04_04: 'shooting_ch04_04',

    CH05_01: 'shooting_ch05_01',
    CH05_02: 'shooting_ch05_02',
    CH05_03: 'shooting_ch05_03',
    CH05_04: 'shooting_ch05_04',

    DAILY_MON_INTERMEDIATE: 'shooting_daily_mon_intermediate',
    DAILY_MON_ADVANCED: 'shooting_daily_mon_advanced',
    DAILY_TUE_INTERMEDIATE: 'shooting_daily_tue_intermediate',
    DAILY_TUE_ADVANCED: 'shooting_daily_tue_advanced',
    DAILY_WED_INTERMEDIATE: 'shooting_daily_wed_intermediate',
    DAILY_WED_ADVANCED: 'shooting_daily_wed_advanced',
    DAILY_THU_INTERMEDIATE: 'shooting_daily_thu_intermediate',
    DAILY_THU_ADVANCED: 'shooting_daily_thu_advanced',
    DAILY_FRI_INTERMEDIATE: 'shooting_daily_fri_intermediate',
    DAILY_FRI_ADVANCED: 'shooting_daily_fri_advanced',
    DAILY_SAT_INTERMEDIATE: 'shooting_daily_sat_intermediate',
    DAILY_SAT_ADVANCED: 'shooting_daily_sat_advanced',
    DAILY_SUN_INTERMEDIATE: 'shooting_daily_sun_intermediate',
    DAILY_SUN_ADVANCED: 'shooting_daily_sun_advanced',
    DAILY_EXP_INTERMEDIATE: 'shooting_daily_exp_intermediate',
    DAILY_EXP_ADVANCED: 'shooting_daily_exp_advanced',

    FACELESS_ADVANCED: 'shooting_event_faceless_advanced',
    FACELESS_SUPER: 'shooting_event_faceless_super',
    RAID_TEST: 'shooting_raid_test',
    BULLET_HELL_TEST: 'shooting_event_bullet_hell_test',
    SCORE_ATTACK_NORMAL: 'shooting_score_attack_normal',
    SCORE_ATTACK_HARD: 'shooting_score_attack_hard',
    OVERSEER_AMBUSH: 'shooting_event_overseer_ambush',
  });

  // ============================================================
  // CHAPTER 01
  // ============================================================
  //
  // 01 朝:
  //   収集を覚えるステージ
  //
  // 02 呼吸:
  //   攻撃効率 / キャラ交代を意識するタイムアタック
  //
  // 03 邂逅:
  //   赤コアを意識して避ける被弾管理
  //
  // 04 旅立ち:
  //   オーバーシアBOSS
  //
  function makeDailyStage(config) {
    const level = config.level === 'advanced' ? 'advanced' : 'intermediate';
    const rewardCount = level === 'advanced' ? 2 : 1;
    return Object.freeze({
      id: config.id,
      chapter: 0,
      stageNo: 0,
      name: config.name,
      type: 'normal',
      background: 'images/battle_bg_01.webp',
      enemyIds: Object.freeze(Array.from(config.enemyIds || [])),
      normalBattle: Object.freeze({
        totalEnemies: Math.max(1, Number(config.totalEnemies || (level === 'advanced' ? 8 : 5))),
        maxActive: Math.max(1, Number(config.maxActive || (level === 'advanced' ? 3 : 2))),
        spawnIntervalMs: Math.max(500, Number(config.spawnIntervalMs || (level === 'advanced' ? 1050 : 1250))),
      }),
      mission: Object.freeze(config.mission || { type: SHOOTING_MISSION_TYPE.DEFEAT_ALL, text: '敵をすべて撃破' }),
      dailyQuest: Object.freeze({
        weekday: config.weekday || '',
        level,
        questType: config.questType || 'weekday',
        runLevel: config.runLevel || level,
        rewardId: config.rewardId || '',
        rewardPool: Object.freeze(Array.from(config.rewardPool || [])),
        rewardCount: Math.max(1, Number(config.rewardCount || rewardCount)),
      }),
      playable: true,
    });
  }

  const SHOOTING_STAGES = Object.freeze({
    // 本編の敵・ショット・ULT・操作系を共用するが、通常ステージには登録しない試遊専用ステージ。
    [SHOOTING_STAGE_ID.GACHA_TRIAL]: Object.freeze({
      id: SHOOTING_STAGE_ID.GACHA_TRIAL,
      chapter: 0, stageNo: 0, name: 'TRIAL BATTLE', type: 'normal',
      eventId: 'gacha_trial', background: 'images/battle_bg_01.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.MINI_03]),
      normalBattle: Object.freeze({
        infiniteEnemies: true, maxActive: 4, spawnIntervalMs: 750,
        itemDropRate: 0, enemyHp: 900, enemyBulletDamage: 55,
        enemyBulletSpeed: 170, enemyFireRate: 1600, barrageLevel: 1,
      }),
      // 制限時間ゼロのSURVIVE_TIMEではミッション達成が発生しない。
      mission: Object.freeze({ type: SHOOTING_MISSION_TYPE.SURVIVE_TIME, targetSeconds: 0, text: '何度でも試せます' }),
      playable: false,
    }),
    [SHOOTING_STAGE_ID.CH01_01]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH01_01,
      chapter: 1,
      stageNo: 1,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch01_01']?.stageTitle || '朝'; },
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_01,
      ]),
      normalBattle: Object.freeze({
        totalEnemies: 7,
        maxActive: 2,
        spawnIntervalMs: 950,

        // build1162: CH01-01〜03はLv1前提のまま、敵HPをbuild1157比3倍・ATK(被弾ダメージ)を100へ統一。
        enemyHp: 255,
        enemyBulletDamage: 100,
        enemyBulletSpeed: 135,
        enemyFireRate: 1900,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.COLLECT_ITEM,
        target: 3,
        text: 'アイテムを3個拾ってクリア',
      }),

      // Normal Stage battle logic is the next implementation step.
      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH01_02]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH01_02,
      chapter: 1,
      stageNo: 2,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch01_02']?.stageTitle || '呼吸'; },
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_01,
      ]),
      normalBattle: Object.freeze({
        // build1157: エリ→ジグのキャラチェンジ＋レーザー貫通チュートリアル。
        // 3体はcore側で縦一列に固定配置するため、通常スポーンは使用しない。
        totalEnemies: 3,
        maxActive: 3,
        spawnIntervalMs: 999999,
        enemyImage: 'images/remnant_01_zako.webp',
        // build1163: CH01-02も他の序盤ステージに合わせ、HPを225へ統一寄せ。
        enemyHp: 225,
        enemyBulletDamage: 100,
        enemyBulletSpeed: 120,
        enemyFireRate: 2200,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.DEFEAT_ALL,
        text: '敵を3体すべて撃破',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH01_03]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH01_03,
      chapter: 1,
      stageNo: 3,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch01_03']?.stageTitle || '邂逅'; },
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_01,
      ]),
      normalBattle: Object.freeze({
        // build1141: レムナント雑魚を無限湧き。3個回収するまで戦闘継続。
        infiniteEnemies: true,
        maxActive: 3,
        spawnIntervalMs: 720,
        enemyImage: 'images/remnant_01_zako.webp',
        itemDropRate: 1,

        // build1162: CH01-03もHP3倍・ATK(被弾ダメージ)100へ調整。
        enemyHp: 225,
        enemyBulletDamage: 100,
        enemyBulletSpeed: 130,
        enemyFireRate: 1900,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.COLLECT_ITEM,
        target: 3,
        itemImage: 'images/item_memory_mini.webp',
        text: 'レムナントの残骸を3つ入手する',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH01_04]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH01_04,
      chapter: 1,
      stageNo: 4,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch01_04']?.stageTitle || '旅立ち'; },
      type: 'boss',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.REMNANT_01,
      ]),

      // build1168: 負けイベント～アルノ戦まで最初から2ゲージ設計。
      bossGauges: 2,

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: 'オーバーシアを撃破',
      }),

      playable: true,
    }),

    // ============================================================
    // CHAPTER 02 - 暴力
    // 数ではなく、一体一体の圧力でプレイヤーを追い詰める章。
    // ============================================================
    [SHOOTING_STAGE_ID.CH02_01]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH02_01,
      chapter: 2,
      stageNo: 1,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch02_01']?.stageTitle || '圧'; },
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      // CH02は属性解説前のため、敵属性は全ステージLIGHTで統一。
      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT,
      ]),
      normalBattle: Object.freeze({
        totalEnemies: 3,
        maxActive: 1,
        spawnIntervalMs: 1300,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.DEFEAT_ALL,
        text: '強敵をすべて撃破',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH02_02]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH02_02,
      chapter: 2,
      stageNo: 2,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch02_02']?.stageTitle || '蹂躙'; },
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT,
      ]),

      // build1242:
      // 属性相性を実戦で覚えるステージ。
      // 1体ずつ DARK -> WOOD -> AQUA の順で出現し、
      // エリ(LIGHT) -> アルノ(FIRE) -> アウラ(WOOD)へ切り替えて突破する。
      weaknessOnlyEnemies: true,
      normalBattle: Object.freeze({
        totalEnemies: 3,
        maxActive: 1,
        spawnIntervalMs: 900,
        itemDropRate: 0,

        enemyVariants: Object.freeze(['normal', 'normal', 'normal']),
        enemyElementSequence: Object.freeze(['dark', 'wood', 'aqua']),

        // Lv1想定のエリ/アウラは短め、Lv40想定のアルノ担当だけ高耐久。
        // 1: DARK -> エリ(LIGHT)
        // 2: WOOD -> アルノ(FIRE)
        // 3: AQUA -> アウラ(WOOD)
        enemyHpSequence: Object.freeze([900, 2700, 900]),
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.DEFEAT_ALL,
        text: '敵をすべて撃破',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH02_03]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH02_03,
      chapter: 2,
      stageNo: 3,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch02_03']?.stageTitle || '威圧'; },
      type: 'normal',
      background: 'images/battle_bg_01.webp',

      // CH02はLIGHT属性で統一。
      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT,
      ]),
      normalBattle: Object.freeze({
        totalEnemies: 3,
        maxActive: 2,
        spawnIntervalMs: 1450,
        // build1189: CH02雑魚は2種のみ。normal=遠隔弾 / atack=突進。
        enemyVariants: Object.freeze(['normal', 'atack', 'normal']),
        // CH02-3だけ突進を少し見切りやすくする。
        chargeSpeed: 470,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.DEFEAT_ALL,
        text: '敵をすべて撃破',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH02_04]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH02_04,
      chapter: 2,
      stageNo: 4,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch02_04']?.stageTitle || '暴力'; },
      type: 'boss',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.REMNANT_02,
      ]),

      // build1190: CH02-04 boss battle uses two HP gauges.
      bossGauges: 2,

      // CH02-04の援軍もLIGHT属性で統一。
      bossAdds: Object.freeze({
        enemyIds: Object.freeze([
          SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT,
        ]),
        // build1214: CH02-04 イリシュ戦は突進(ATACK)雑魚を出さない。
        // 援軍は通常射撃タイプのみ。
        enemyVariants: Object.freeze(['normal', 'normal', 'normal', 'normal']),
        totalEnemies: 4,
        maxActive: 1,
        startDelayMs: 4500,
        spawnIntervalMs: 7000,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: 'イリシュを撃破',
      }),

      // ボス画像 images/remnant_02_battle.webp を配置すればそのまま遊べる。
      playable: true,
    }),

    // ============================================================
    // CHAPTER 03 - 弾幕
    // アイテムを拾いながら、濃い弾幕を抜けて進む章。
    // 01-03は収集、04は本格的な弾幕ボス戦。
    // ============================================================
    [SHOOTING_STAGE_ID.CH03_01]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH03_01,
      chapter: 3,
      stageNo: 1,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch03_01']?.stageTitle || '羽音'; },
      type: 'normal',
      element: 'aqua',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_03,
      ]),
      normalBattle: Object.freeze({
        infiniteEnemies: true,
        maxActive: 2,
        spawnIntervalMs: 980,
        itemDropRate: 0.80,

        // CH03-01: 弱
        enemyHp: 900,
        enemyBulletDamage: 75,
        enemyBulletSpeed: 190,
        enemyFireRate: 1450,
        barrageLevel: 1,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.COLLECT_ITEM,
        target: 3,
        text: 'アイテムを3個拾ってクリア',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH03_02]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH03_02,
      chapter: 3,
      stageNo: 2,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch03_02']?.stageTitle || '星雨'; },
      type: 'normal',
      element: 'aqua',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_03,
      ]),
      normalBattle: Object.freeze({
        // build1216: アイテム収集を廃止。3体を全滅させたらクリア。
        totalEnemies: 3,
        maxActive: 2,
        spawnIntervalMs: 850,
        itemDropRate: 0,

        // CH03-02: 中
        enemyHp: 1200,
        enemyBulletDamage: 95,
        enemyBulletSpeed: 215,
        enemyFireRate: 1230,
        barrageLevel: 2,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.DEFEAT_ALL,
        text: '敵をすべて撃破',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH03_03]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH03_03,
      chapter: 3,
      stageNo: 3,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch03_03']?.stageTitle || '交差'; },
      type: 'normal',
      element: 'aqua',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.MINI_03,
      ]),
      normalBattle: Object.freeze({
        // build1216: アイテム収集を廃止。5体を全滅させたらクリア。
        totalEnemies: 5,
        maxActive: 3,
        spawnIntervalMs: 760,
        itemDropRate: 0,

        // build1241: 5体を5属性で1体ずつ出現させる。
        // 出現順: 木 → 火 → 水 → 闇 → 光
        enemyElementSequence: Object.freeze(['wood', 'fire', 'aqua', 'dark', 'light']),

        // CH03-03: 強
        enemyHp: 1500,
        enemyBulletDamage: 115,
        enemyBulletSpeed: 235,
        enemyFireRate: 1080,
        barrageLevel: 3,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.DEFEAT_ALL,
        text: '敵をすべて撃破',
      }),

      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH03_04]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH03_04,
      chapter: 3,
      stageNo: 4,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch03_04']?.stageTitle || '雨冠'; },
      type: 'boss',
      element: 'aqua',
      background: 'images/battle_bg_01.webp',

      enemyIds: Object.freeze([
        SHOOTING_ENEMY_ID.REMNANT_03,
      ]),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: 'リヴィアを撃破',
      }),

      playable: true,
    }),


    // ============================================================
    // CHAPTER 04 - 美しい弾幕
    // 密度で押すCH03とは分離し、規則性・軌跡・余白の美しさを主役にする。
    // 01: 螺旋 / 02: 波 / 03: 螺旋と波の複合 / 04: BOSS予約枠
    // ============================================================
    // ============================================================
    // CHAPTER 04 - 呼び声
    // 最新シナリオ準拠:
    // 01 余波: 通常戦
    // 02 異質: 木 / 水 属性バリア
    // 03 炎壁: 火属性バリア。リュネ登場イベントまで水属性以外IMMUNE
    // 04 リュネ: 大量レムナントとの通常戦。クリア後リュネ正式加入
    // ============================================================
    [SHOOTING_STAGE_ID.CH04_01]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH04_01,
      chapter: 4,
      stageNo: 1,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch04_01']?.stageTitle || '予感'; },
      type: 'normal',
      background: 'images/battle_bg_01.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.MINI_03]),
      normalBattle: Object.freeze({
        totalEnemies: 5,
        maxActive: 2,
        spawnIntervalMs: 760,
        itemDropRate: 0,
        enemyImage: 'images/zako_enemy_01_normal_light.webp',
        enemyElementSequence: Object.freeze(['light', 'light', 'dark', 'light', 'wood']),
        enemyHp: 1550,
        enemyBulletDamage: 110,
        enemyBulletSpeed: 230,
        enemyFireRate: 1120,
        barrageLevel: 2,
      }),
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.DEFEAT_ALL,
        text: '強化個体をすべて撃破',
      }),
      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH04_02]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH04_02,
      chapter: 4,
      stageNo: 2,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch04_02']?.stageTitle || ''; },
      type: 'normal',
      background: 'images/battle_bg_01.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.MINI_03]),
      weaknessOnlyEnemies: true,
      normalBattle: Object.freeze({
        totalEnemies: 2,
        maxActive: 2,
        spawnAllAtStart: true,
        spawnIntervalMs: 500,
        itemDropRate: 0,
        enemyImage: 'images/zako_enemy_01_normal_light.webp',
        enemyElementSequence: Object.freeze(['wood', 'aqua']),
        enemyHpSequence: Object.freeze([1850, 1850]),
        enemyBulletDamage: 115,
        enemyBulletSpeed: 235,
        enemyFireRate: 1080,
        barrageLevel: 2,
      }),
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.DEFEAT_ALL,
        text: '強化個体をすべて撃破',
      }),
      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH04_03]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH04_03,
      chapter: 4,
      stageNo: 3,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch04_03']?.stageTitle || '火を纏う壁'; },
      type: 'normal',
      background: 'images/battle_bg_01.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.MINI_03]),
      weaknessOnlyEnemies: true,
      ch04StrictFireBarrier: true,
      normalBattle: Object.freeze({
        totalEnemies: 2,
        maxActive: 2,
        spawnAllAtStart: true,
        spawnIntervalMs: 500,
        itemDropRate: 0,
        enemyImage: 'images/zako_enemy_01_normal_light.webp',
        enemyElementSequence: Object.freeze(['fire', 'fire']),
        enemyHpSequence: Object.freeze([2000, 2000]),
        enemyBulletDamage: 120,
        enemyBulletSpeed: 240,
        enemyFireRate: 1050,
        barrageLevel: 3,
      }),
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.DEFEAT_ALL,
        text: '強化個体をすべて撃破',
      }),
      playable: true,
    }),

    [SHOOTING_STAGE_ID.CH04_04]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH04_04,
      chapter: 4,
      stageNo: 4,
      get name() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch04_04']?.stageTitle || '忘却の川'; },
      type: 'normal',
      background: 'images/battle_bg_01.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.MINI_03]),
      normalBattle: Object.freeze({
        totalEnemies: 3,
        maxActive: 5,
        spawnIntervalMs: 5000,
        itemDropRate: 0,
        enemyImage: 'images/zako_enemy_01_normal_light.webp',
        enemyElementSequence: Object.freeze(['aqua', 'fire', 'light']),
        enemyHp: 1800,
        enemyBulletDamage: 120,
        enemyBulletSpeed: 240,
        enemyFireRate: 1030,
        barrageLevel: 3,
      }),
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.DEFEAT_ALL,
        text: '強化個体をすべて撃破',
      }),
      playable: true,
    }),

    // ============================================================
    // CHAPTER 05 — 円環
    [SHOOTING_STAGE_ID.CH05_01]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH05_01, chapter:5, stageNo:1,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch05_01?.stageTitle || '沈黙する円盤';},
      type:'normal', background:'images/battle_bg_01.webp', enemyIds:Object.freeze([]),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'物語を読む'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH05_02]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH05_02, chapter:5, stageNo:2,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch05_02?.stageTitle || 'ずれた輪';},
      type:'normal', background:'images/battle_bg_01.webp', enemyIds:Object.freeze([]),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'三つの輪の紋様をつなぐ'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH05_03]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH05_03, chapter:5, stageNo:3,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch05_03?.stageTitle || 'もう一つの円環';},
      type:'normal', background:'images/battle_bg_01.webp', enemyIds:Object.freeze([]),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'四つの輪の紋様をつなぐ'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH05_04]: Object.freeze({
      id: SHOOTING_STAGE_ID.CH05_04, chapter:5, stageNo:4,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch05_04?.stageTitle || '二人きりの巡回';},
      type:'normal', background:'images/battle_bg_01.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.MINI_05]),
      normalBattle:Object.freeze({totalEnemies:3,maxActive:3,spawnIntervalMs:0,spawnAllAtStart:true,
        itemDropRate:0,enemyElementSequence:Object.freeze(['dark','dark','dark']),
        enemyHp:1600,enemyBulletDamage:115,enemyBulletSpeed:250,enemyFireRate:780,barrageLevel:4}),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'闇属性レムナント3体を撃破'}),playable:true
    }),

    // ============================================================
        // SPECIAL EVENT - 無貌の天使
    // 「照射◯秒」は現行プレイ感の基準DPSを約190としてHP化。
    // wave1: 約40秒 → 7,600 / wave2: 約100秒 → 19,000
    // object: 約5秒 → 950
    // ============================================================
    // ============================================================
    // DAILY QUEST
    // 中級1個 / 上級2個。日曜のみ敵・報酬とも全属性ミックス。
    // ============================================================
    [SHOOTING_STAGE_ID.DAILY_MON_INTERMEDIATE]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_MON_INTERMEDIATE, weekday: 'Mon', level: 'intermediate', name: '月曜巡行・中級',
      enemyIds: [SHOOTING_ENEMY_ID.ZAKO_DARK_SHOT], rewardId: 'soul_vessel_dark',
    }),
    [SHOOTING_STAGE_ID.DAILY_MON_ADVANCED]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_MON_ADVANCED, weekday: 'Mon', level: 'advanced', name: '月曜巡行・上級',
      enemyIds: [SHOOTING_ENEMY_ID.ZAKO_DARK_SHOT, SHOOTING_ENEMY_ID.ZAKO_DARK_LASER], rewardId: 'soul_vessel_dark',
    }),
    [SHOOTING_STAGE_ID.DAILY_TUE_INTERMEDIATE]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_TUE_INTERMEDIATE, weekday: 'Tue', level: 'intermediate', name: '火曜巡行・中級',
      enemyIds: [SHOOTING_ENEMY_ID.ZAKO_FIRE_SHOT, SHOOTING_ENEMY_ID.ZAKO_FIRE_CHARGE], rewardId: 'soul_vessel_fire',
    }),
    [SHOOTING_STAGE_ID.DAILY_TUE_ADVANCED]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_TUE_ADVANCED, weekday: 'Tue', level: 'advanced', name: '火曜巡行・上級',
      enemyIds: [SHOOTING_ENEMY_ID.ZAKO_FIRE_SHOT, SHOOTING_ENEMY_ID.ZAKO_FIRE_LASER, SHOOTING_ENEMY_ID.ZAKO_FIRE_CHARGE],
      rewardId: 'soul_vessel_fire',
    }),
    [SHOOTING_STAGE_ID.DAILY_WED_INTERMEDIATE]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_WED_INTERMEDIATE, weekday: 'Wed', level: 'intermediate', name: '水曜巡行・中級',
      enemyIds: [SHOOTING_ENEMY_ID.ZAKO_AQUA_SHOT], rewardId: 'soul_vessel_aqua',
    }),
    [SHOOTING_STAGE_ID.DAILY_WED_ADVANCED]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_WED_ADVANCED, weekday: 'Wed', level: 'advanced', name: '水曜巡行・上級',
      enemyIds: [SHOOTING_ENEMY_ID.ZAKO_AQUA_SHOT, SHOOTING_ENEMY_ID.ZAKO_AQUA_LASER], rewardId: 'soul_vessel_aqua',
    }),
    [SHOOTING_STAGE_ID.DAILY_THU_INTERMEDIATE]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_THU_INTERMEDIATE, weekday: 'Thu', level: 'intermediate', name: '木曜巡行・中級',
      enemyIds: [SHOOTING_ENEMY_ID.ZAKO_WOOD_SHOT], rewardId: 'soul_vessel_wood',
    }),
    [SHOOTING_STAGE_ID.DAILY_THU_ADVANCED]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_THU_ADVANCED, weekday: 'Thu', level: 'advanced', name: '木曜巡行・上級',
      enemyIds: [SHOOTING_ENEMY_ID.ZAKO_WOOD_SHOT, SHOOTING_ENEMY_ID.ZAKO_WOOD_LASER], rewardId: 'soul_vessel_wood',
    }),
    [SHOOTING_STAGE_ID.DAILY_FRI_INTERMEDIATE]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_FRI_INTERMEDIATE, weekday: 'Fri', level: 'intermediate', name: '金曜巡行・中級',
      enemyIds: [SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT], rewardId: 'soul_vessel_light',
    }),
    [SHOOTING_STAGE_ID.DAILY_FRI_ADVANCED]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_FRI_ADVANCED, weekday: 'Fri', level: 'advanced', name: '金曜巡行・上級',
      enemyIds: [SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT, SHOOTING_ENEMY_ID.ZAKO_LIGHT_LASER], rewardId: 'soul_vessel_light',
    }),
    [SHOOTING_STAGE_ID.DAILY_SAT_INTERMEDIATE]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_SAT_INTERMEDIATE, weekday: 'Sat', level: 'intermediate', name: '土曜巡行・中級',
      enemyIds: [
        SHOOTING_ENEMY_ID.ZAKO_FIRE_SHOT, SHOOTING_ENEMY_ID.ZAKO_AQUA_SHOT, SHOOTING_ENEMY_ID.ZAKO_WOOD_SHOT,
        SHOOTING_ENEMY_ID.ZAKO_DARK_SHOT, SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT,
      ],
      rewardId: 'kyoumei_stone', totalEnemies: 5,
    }),
    [SHOOTING_STAGE_ID.DAILY_SAT_ADVANCED]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_SAT_ADVANCED, weekday: 'Sat', level: 'advanced', name: '土曜巡行・上級',
      enemyIds: [
        SHOOTING_ENEMY_ID.ZAKO_FIRE_LASER, SHOOTING_ENEMY_ID.ZAKO_AQUA_LASER, SHOOTING_ENEMY_ID.ZAKO_WOOD_LASER,
        SHOOTING_ENEMY_ID.ZAKO_DARK_LASER, SHOOTING_ENEMY_ID.ZAKO_LIGHT_LASER,
      ],
      rewardId: 'kyoumei_stone',
    }),
    [SHOOTING_STAGE_ID.DAILY_SUN_INTERMEDIATE]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_SUN_INTERMEDIATE, weekday: 'Sun', level: 'intermediate', name: '日曜巡行・中級',
      enemyIds: [
        SHOOTING_ENEMY_ID.ZAKO_FIRE_SHOT, SHOOTING_ENEMY_ID.ZAKO_AQUA_SHOT, SHOOTING_ENEMY_ID.ZAKO_WOOD_SHOT,
        SHOOTING_ENEMY_ID.ZAKO_DARK_SHOT, SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT,
      ],
      rewardPool: ['kyoumei_stone','soul_vessel_fire','soul_vessel_aqua','soul_vessel_wood','soul_vessel_dark','soul_vessel_light'],
      totalEnemies: 6,
    }),
    [SHOOTING_STAGE_ID.DAILY_SUN_ADVANCED]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_SUN_ADVANCED, weekday: 'Sun', level: 'advanced', name: '日曜巡行・上級',
      enemyIds: [
        SHOOTING_ENEMY_ID.ZAKO_FIRE_SHOT, SHOOTING_ENEMY_ID.ZAKO_FIRE_LASER, SHOOTING_ENEMY_ID.ZAKO_FIRE_CHARGE,
        SHOOTING_ENEMY_ID.ZAKO_AQUA_SHOT, SHOOTING_ENEMY_ID.ZAKO_AQUA_LASER,
        SHOOTING_ENEMY_ID.ZAKO_WOOD_SHOT, SHOOTING_ENEMY_ID.ZAKO_WOOD_LASER,
        SHOOTING_ENEMY_ID.ZAKO_DARK_SHOT, SHOOTING_ENEMY_ID.ZAKO_DARK_LASER,
        SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT, SHOOTING_ENEMY_ID.ZAKO_LIGHT_LASER,
      ],
      rewardPool: ['kyoumei_stone','soul_vessel_fire','soul_vessel_aqua','soul_vessel_wood','soul_vessel_dark','soul_vessel_light'],
      totalEnemies: 10, maxActive: 3, spawnIntervalMs: 950,
    }),


    // 経験値素材DAILY。敵撃破で素材アイコンが落ち、合計10個取得でクリア。
    [SHOOTING_STAGE_ID.DAILY_EXP_INTERMEDIATE]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_EXP_INTERMEDIATE,
      level: 'intermediate',
      questType: 'exp',
      runLevel: 'exp_intermediate',
      name: '経験値素材・中級',
      enemyIds: [
        SHOOTING_ENEMY_ID.ZAKO_FIRE_SHOT,
        SHOOTING_ENEMY_ID.ZAKO_AQUA_SHOT,
        SHOOTING_ENEMY_ID.ZAKO_WOOD_SHOT,
        SHOOTING_ENEMY_ID.ZAKO_DARK_SHOT,
        SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT,
      ],
      totalEnemies: 10,
      maxActive: 2,
      spawnIntervalMs: 1050,
      rewardCount: 10,
      mission: {
        type: SHOOTING_MISSION_TYPE.COLLECT_ITEM,
        target: 10,
        itemImage: 'images/item_exp_bronze.webp',
        text: '経験値素材を合計10個獲得',
      },
    }),
    [SHOOTING_STAGE_ID.DAILY_EXP_ADVANCED]: makeDailyStage({
      id: SHOOTING_STAGE_ID.DAILY_EXP_ADVANCED,
      level: 'advanced',
      questType: 'exp',
      runLevel: 'exp_advanced',
      name: '経験値素材・上級',
      enemyIds: [
        SHOOTING_ENEMY_ID.ZAKO_FIRE_LASER,
        SHOOTING_ENEMY_ID.ZAKO_AQUA_LASER,
        SHOOTING_ENEMY_ID.ZAKO_WOOD_LASER,
        SHOOTING_ENEMY_ID.ZAKO_DARK_LASER,
        SHOOTING_ENEMY_ID.ZAKO_LIGHT_LASER,
        SHOOTING_ENEMY_ID.ZAKO_FIRE_CHARGE,
      ],
      totalEnemies: 10,
      maxActive: 3,
      spawnIntervalMs: 900,
      rewardCount: 10,
      mission: {
        type: SHOOTING_MISSION_TYPE.COLLECT_ITEM,
        target: 10,
        itemImage: 'images/item_exp_gold.webp',
        text: '経験値素材を合計10個獲得',
      },
    }),

    [SHOOTING_STAGE_ID.FACELESS_ADVANCED]: Object.freeze({
      id: SHOOTING_STAGE_ID.FACELESS_ADVANCED,
      chapter: 0,
      stageNo: 1,
      eventId: 'faceless',
      eventTitle: '無貌の天使',
      difficultyLabel: '上級',
      type: 'boss',
      background: 'images/battle_bg_01.webp',
      introImage: 'images/enemy_faceless_battle_start.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.FACELESS]),
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: 'フェイスレスを撃破',
      }),
      faceless: Object.freeze({
        difficulty: 'advanced',
        waveHp: Object.freeze([7600, 19000]),
        waveBarrage: Object.freeze(['light', 'medium']),
        objectHp: 950,
        objectWays: 2,
        waveObjectCount: Object.freeze([1, 2]),
      }),
      playable: true,
    }),

    [SHOOTING_STAGE_ID.FACELESS_SUPER]: Object.freeze({
      id: SHOOTING_STAGE_ID.FACELESS_SUPER,
      chapter: 0,
      stageNo: 2,
      eventId: 'faceless',
      eventTitle: '無貌の天使',
      difficultyLabel: '最上級',
      type: 'boss',
      background: 'images/battle_bg_01.webp',
      introImage: 'images/enemy_faceless_battle_start.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.FACELESS]),
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: 'フェイスレスを撃破',
      }),
      faceless: Object.freeze({
        difficulty: 'super',
        waveHp: Object.freeze([7600, 19000]),
        waveBarrage: Object.freeze(['medium', 'dense']),
        objectHp: 950,
        objectWays: 3,
        waveObjectCount: Object.freeze([1, 2]),
      }),
      playable: true,
    }),


    // ============================================================
    // SPECIAL STAGE - 理想郷 -ノア-
    // パフォーマンス検証用のストレステストステージ。
    // 見た目は極限まで簡素化(装飾なし)。WAVE1から高密度、WAVE3でさらに濃く。
    // 1発被弾での即死はなし(4発被弾で撃破される想定のダメージ値)。
    // ============================================================
    [SHOOTING_STAGE_ID.BULLET_HELL_TEST]: Object.freeze({
      id: SHOOTING_STAGE_ID.BULLET_HELL_TEST,
      chapter: 0,
      stageNo: 3,
      eventId: 'bullet_hell_test',
      eventTitle: '理想郷 -ノア-',
      // 戦闘開始時にSPECIAL STAGE TICKETを1枚消費。
      specialTicketCost: 1,
      difficultyLabel: 'STRESS TEST',
      type: 'boss',
      background: 'images/battle_bg_01.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.BULLET_HELL_TEST]),
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: '理想郷 -ノア-を耐えきれ',
      }),
      playable: true,
    }),


    // ============================================================
    // SCORE ATTACK - すこあた！
    // 60秒固定タイムライン。同じ難易度では毎回同じ弾幕。
    // NORMAL / HARD は弾道構成を共通にし、速度・被ダメージだけ変更。
    // ============================================================
    [SHOOTING_STAGE_ID.SCORE_ATTACK_NORMAL]: Object.freeze({
      id: SHOOTING_STAGE_ID.SCORE_ATTACK_NORMAL,
      chapter: 0,
      stageNo: 20,
      eventId: 'score_attack',
      eventTitle: 'すこあた！',
      difficultyLabel: 'NORMAL',
      type: 'boss',
      background: 'images/battle_bg_01.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.BULLET_HELL_TEST]),
      survivalBoss: true,
      timeLimitSeconds: 60,
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.SURVIVE_TIME,
        targetSeconds: 60,
        text: '60秒間でハイスコアを目指せ',
      }),
      scoreAttack: Object.freeze({
        difficulty: 'normal',
        bulletSpeedMultiplier: 0.92,
        bulletDamage: 105,
        volleyIntervalMs: 880,
        maxEnemyBullets: 100,
        recoverEnemyBulletsTo: 76,
        maxPlayerBullets: 72,
        recoverPlayerBulletsTo: 54,
        warningDamageMultiplier: 2.0,
      }),
      playable: true,
    }),

    [SHOOTING_STAGE_ID.SCORE_ATTACK_HARD]: Object.freeze({
      id: SHOOTING_STAGE_ID.SCORE_ATTACK_HARD,
      chapter: 0,
      stageNo: 21,
      eventId: 'score_attack',
      eventTitle: 'すこあた！',
      difficultyLabel: 'HARD',
      type: 'boss',
      background: 'images/battle_bg_01.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.BULLET_HELL_TEST]),
      survivalBoss: true,
      timeLimitSeconds: 60,
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.SURVIVE_TIME,
        targetSeconds: 60,
        text: '60秒間でハイスコアを目指せ',
      }),
      scoreAttack: Object.freeze({
        difficulty: 'hard',
        bulletSpeedMultiplier: 1.22,
        bulletDamage: 165,
        volleyIntervalMs: 880,
        maxEnemyBullets: 100,
        recoverEnemyBulletsTo: 76,
        maxPlayerBullets: 72,
        recoverPlayerBulletsTo: 54,
        warningDamageMultiplier: 2.0,
      }),
      playable: true,
    }),


    // ============================================================
    // DAILY RAID - ザ・テスト
    // 共有HP 100,000 / 最大4人 / 1日1回。
    // 実際の残HPはSupabaseのraidContextからshooting_core側で上書きする。
    // ============================================================
    [SHOOTING_STAGE_ID.RAID_TEST]: Object.freeze({
      id: SHOOTING_STAGE_ID.RAID_TEST,
      chapter: 0,
      stageNo: 1,
      eventId: 'raid',
      eventTitle: 'ザ・テスト',
      difficultyLabel: 'DAILY RAID',
      type: 'boss',
      background: 'images/battle_bg_01.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.RAID_TEST]),
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: '共有HPを削れ',
      }),
      raid: Object.freeze({
        bossId: 'the_test',
        maxHp: 100000,
        maxPlayers: 4,
        attemptsPerDay: 1,
        timeLimitSeconds: 180,
      }),
      playable: true,
    }),

    [SHOOTING_STAGE_ID.OVERSEER_AMBUSH]: Object.freeze({
      id: SHOOTING_STAGE_ID.OVERSEER_AMBUSH,
      chapter: 0,
      stageNo: 0,
      name: '緊急遭遇',
      type: 'boss',
      eventId: 'random_ambush',
      background: 'images/battle_bg_01.webp',
      introImage: 'images/remnant_01_blk_battle_start.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.OVERSEER_AMBUSH]),
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: 'オーバーシア（亜種）を撃破',
      }),
      guaranteedRewards: Object.freeze([
        Object.freeze({
          type: 'material',
          id: 'overseer_blk_core',
          name: 'オーバーシア亜種の心核',
          image: 'images/item_overseer_blk_core.webp',
          count: 1,
          detail: '特殊強化素材',
        }),
      ]),
      ambush: Object.freeze({
        enabled: false,
        triggerRate: 0.00,
        waveHp: Object.freeze([5000, 8000]),
        waveDamage: Object.freeze([350, 600]),
        warningEveryMs: 4000,
        warningWave1Bounces: 4,
        minionHp: Object.freeze([800, 1500]),
        minionFireEveryMs: 5000,
        minionBulletSpeed: 108,
        laserTriggerRatio: 0.10,
        laserWarningMs: 1300,
        laserDurationMs: 5000,
        laserWidthRatio: 0.50,
      }),
      playable: true,
    }),

  });

  function toBeginnerStageId(stageId) {
    const id = String(stageId || '');
    if (!id) return '';
    if (id.startsWith('shooting_beginner_')) return id;
    return id.replace(/^shooting_/, 'shooting_beginner_');
  }

  function fromBeginnerStageId(stageId) {
    return String(stageId || '').replace(/^shooting_beginner_/, 'shooting_');
  }

  function makeBeginnerStage(baseStage) {
    if (!baseStage || !baseStage.id || !Number(baseStage.chapter)) return null;
    const reduceBullets =
      Number(baseStage.chapter) !== 5 && (
        Number(baseStage.chapter) > 3 ||
        (Number(baseStage.chapter) === 3 && Number(baseStage.stageNo || 0) >= 4)
      );

    return Object.freeze({
      ...baseStage,
      id: toBeginnerStageId(baseStage.id),
      beginnerMode: true,
      baseStageId: baseStage.id,
      bulletQuantityMultiplier: reduceBullets ? 0.60 : 1.0,
    });
  }

  function getShootingStage(stageId) {
    const id = String(stageId || '');
    if (id.startsWith('shooting_beginner_')) {
      return makeBeginnerStage(SHOOTING_STAGES[fromBeginnerStageId(id)] || null);
    }
    return SHOOTING_STAGES[id] || null;
  }

  function getShootingStagesByChapter(chapter) {
    const ch = Number(chapter);
    return Object.values(SHOOTING_STAGES)
      .filter(stage => stage && Number(stage.chapter) === ch)
      .sort((a, b) => a.stageNo - b.stageNo);
  }

  function getBeginnerShootingStagesByChapter(chapter) {
    return getShootingStagesByChapter(chapter)
      .map(makeBeginnerStage)
      .filter(Boolean);
  }

  function getShootingChapter01Stages() {
    return getShootingStagesByChapter(1);
  }

  function getShootingStagePrimaryEnemy(stageId) {
    const stage = getShootingStage(stageId);
    if (!stage || !Array.isArray(stage.enemyIds) || !stage.enemyIds.length) return null;
    return window.ShootingEnemies.getShootingEnemy(stage.enemyIds[0]);
  }

  window.ShootingStages = Object.freeze({
    SHOOTING_MISSION_TYPE,
    SHOOTING_CHAPTER_TITLES,
    SHOOTING_STAGE_ID,
    SHOOTING_STAGES,
    getShootingStage,
    getShootingStagesByChapter,
    getBeginnerShootingStagesByChapter,
    toBeginnerStageId,
    fromBeginnerStageId,
    getShootingChapter01Stages,
    getShootingStagePrimaryEnemy,
  });
})();
