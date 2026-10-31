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
    get 6() { return window.ZERAPHIA_STORY_SCENARIO?.['shooting_ch06_01']?.chapterTitle || '来訪者'; },
    get 7() { const s=window.ZERAPHIA_STORY_SCENARIO||{}; return s.shooting_ch07_01?.chapterTitle || s.shooting_ch07_03?.chapterTitle || '未定'; },
    get 8() { return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch08_01?.chapterTitle || '七つの塔'; },
    get 9() { return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch09_01?.chapterTitle || '七塔の灯'; }
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

    CH06_01: 'shooting_ch06_01',
    CH06_02: 'shooting_ch06_02',
    CH06_03: 'shooting_ch06_03',
    CH06_04: 'shooting_ch06_04',

    CH07_01: 'shooting_ch07_01',
    CH07_02: 'shooting_ch07_02',
    CH07_03: 'shooting_ch07_03',
    CH07_04: 'shooting_ch07_04',

    CH08_01: 'shooting_ch08_01',
    CH08_02: 'shooting_ch08_02',
    CH08_03: 'shooting_ch08_03',
    CH08_04: 'shooting_ch08_04',
    // build1667: CHAPTER 09「七塔の灯」（01・03はパズル［共鳴灯］、02・04は戦闘）
    CH09_01: 'shooting_ch09_01',
    CH09_02: 'shooting_ch09_02',
    CH09_03: 'shooting_ch09_03',
    CH09_04: 'shooting_ch09_04',

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
    RHYTHM_TEST: 'shooting_event_rhythm_test',         // 律動 -仮面舞踏会- 最上級（3PHASE）
    RHYTHM_ADVANCED: 'shooting_event_rhythm_advanced', // build1637 律動 -仮面舞踏会- 上級（2PHASE・少し遅い）
    RHYTHM_ULTRA: 'shooting_event_rhythm_ultra',       // build1643 律動 -仮面舞踏会- 超級（最上級から音符♪なし）
    VERDANT_ADVANCED: 'shooting_event_verdant_advanced', // build1659 樹獣の森 上級
    VERDANT_SUPER: 'shooting_event_verdant_super',       // build1659 樹獣の森 最上級
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
  //   竜型レムナントBOSS
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


  // build1417 — 残響の塔：10層は既存シューティングの敵AIを再利用する。
  // 進行とキャラ封印はSupabaseでのみ確定。ここには付与型の報酬を設定しない。
  const TOWER_ENEMY_POOLS = [
    [SHOOTING_ENEMY_ID.MINI_01],
    [SHOOTING_ENEMY_ID.ZAKO_AQUA_SHOT, SHOOTING_ENEMY_ID.ZAKO_WOOD_SHOT],
    [SHOOTING_ENEMY_ID.ZAKO_FIRE_SHOT, SHOOTING_ENEMY_ID.ZAKO_AQUA_SHOT, SHOOTING_ENEMY_ID.ZAKO_WOOD_SHOT],
    [SHOOTING_ENEMY_ID.MINI_02],
    [SHOOTING_ENEMY_ID.ZAKO_DARK_SHOT, SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT],
    [SHOOTING_ENEMY_ID.ZAKO_AQUA_LASER, SHOOTING_ENEMY_ID.ZAKO_FIRE_SHOT],
    [SHOOTING_ENEMY_ID.ZAKO_WOOD_LASER, SHOOTING_ENEMY_ID.ZAKO_DARK_SHOT],
    [SHOOTING_ENEMY_ID.MINI_03],
    [SHOOTING_ENEMY_ID.ZAKO_LIGHT_LASER, SHOOTING_ENEMY_ID.ZAKO_DARK_LASER],
  ];
  function makeResonanceTowerStage(floor) {
    const difficult = floor === 3 || floor === 6 || floor === 9;
    // build1473 — 11F–15F. All effects use existing Canvas / elemental barriers / CH06 walls.
    if (floor === 11) return Object.freeze({
      id:'shooting_tower_11',chapter:0,stageNo:11,eventId:'resonance_tower',eventTitle:'残響の塔',
      difficultyLabel:'11F / 超弾幕',name:'第十一層',type:'normal',background:'images/battle_bg_01.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.ZAKO_FIRE_SHOT,SHOOTING_ENEMY_ID.ZAKO_AQUA_SHOT,
        SHOOTING_ENEMY_ID.ZAKO_WOOD_SHOT,SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT,SHOOTING_ENEMY_ID.ZAKO_DARK_SHOT]),
      normalBattle:Object.freeze({totalEnemies:5,maxActive:3,spawnIntervalMs:1550,enemyHp:3400,
        enemyBulletDamage:185,enemyBulletSpeed:188,enemyFireRate:1280,tower11Spread:true,itemDropRate:0}),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'5属性の超弾幕を突破'}),playable:true
    });
    if (floor === 12) return Object.freeze({
      id:'shooting_tower_12',chapter:0,stageNo:12,eventId:'resonance_tower',eventTitle:'残響の塔',
      difficultyLabel:'12F / 属性試練',name:'第十二層',type:'normal',background:'images/battle_bg_01.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.ZAKO_DARK_SHOT,SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT]),
      normalBattle:Object.freeze({totalEnemies:8,maxActive:2,spawnIntervalMs:1320,enemyHp:3800,
        enemyBulletDamage:180,enemyBulletSpeed:210,enemyFireRate:1160,enemyElementSequence:Object.freeze(['dark','light']),itemDropRate:0}),
      weaknessOnlyEnemies:true,towerLethalVolley:Object.freeze({intervalMs:2900,shotsPerEnemy:2,maxEnemyCount:2}),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'光・闇のバリアと即死弾を突破'}),playable:true
    });
    if (floor === 13) return Object.freeze({
      id:'shooting_tower_13',chapter:0,stageNo:13,eventId:'resonance_tower',eventTitle:'残響の塔',
      difficultyLabel:'13F / 群生',name:'第十三層',type:'normal',background:'images/battle_bg_01.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.SWARM_SPIDER_LARGE,SHOOTING_ENEMY_ID.STRONG_CH07_02]),
      normalBattle:Object.freeze({totalEnemies:3,maxActive:3,spawnIntervalMs:1300,itemDropRate:0}),
      // 13F: 大蜘蛛2体＋上部で5WAYを撃つ三頭狼1体が撃破ノルマ。
      // 蜘蛛の移動・産卵は従来どおり。三頭狼のみ専用AIで群れから分離する。
      swarmBattle:Object.freeze({largeCount:2,largeEnemyId:SHOOTING_ENEMY_ID.SWARM_SPIDER_LARGE,
        smallEnemyId:SHOOTING_ENEMY_ID.SWARM_SPIDER_SMALL,broodIntervalMs:5200,broodMaxPerLarge:2,
        // build1593: 13Fの大蜘蛛と小蜘蛛だけ移動速度+15%、接触ダメージ+30%。
        spiderMoveSpeedScale:1.15,spiderContactDamageScale:1.30,objectContactDps:78,
        guardEnemyId:SHOOTING_ENEMY_ID.STRONG_CH07_02,guardHp:7200,
        guardAi:'tower13_upper_spread5',guardShotIntervalMs:2000,guardSpreadAngleRad:.23,
        guardBulletSpeed:235,guardBulletDamage:120,guardMoveAngularSpeed:.92,
        guardMoveAmplitudeRate:.24,guardTopYRate:.20}),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'群がる蜘蛛と強敵を撃破'}),playable:true
    });
    if (floor === 14) return Object.freeze({
      id:'shooting_tower_14',chapter:0,stageNo:14,eventId:'resonance_tower',eventTitle:'残響の塔',
      difficultyLabel:'14F / 守護者',name:'第十四層',type:'boss',background:'images/battle_bg_01.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.REMNANT_03]),towerLiviaBoss:true,
      bossGaugeHps:Object.freeze([6750,6750,6750]),bossVisualScale:1.03,
      chapter6Barriers:Object.freeze([Object.freeze({xRate:.5,yRate:.47,widthRate:.62,height:23,
        moveRangeRate:.08,moveSpeed:.28,contactDamage:100})]),
      towerTimedWall:Object.freeze({firstAtMs:20000,intervalMs:20000,durationMs:10000}),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.BOSS_CLEAR,text:'強化リヴィアを撃破'}),playable:true
    });
    if (floor === 15) return Object.freeze({
      id:'shooting_tower_15',chapter:0,stageNo:15,eventId:'resonance_tower',eventTitle:'残響の塔',
      difficultyLabel:'15F / 最深部',name:'第十五層',type:'boss',background:'images/battle_bg_01.webp',
      // build1485: 15Fは専用BOSS（1体のみ）。PHASE2構成。
      //   WARNING（即死弾）が常に3つ浮遊し壁で反射し続ける。
      //   定期的に「暗転」：弾幕と自キャラ以外が見えなくなる。
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.TOWER15_BOSS]),
      // build1520: トワのバトル表示だけ自キャラ画像と同程度の横幅へ縮小。
      // 128px基準 × 1.1(uiScale) × 0.62 = 約87px（元は約141px）。
      bossElement:'dark',enemyElement:'dark',bossVisualScale:0.62,
      introImage:'images/tower15_boss_battle_start.webp',
      tower15Echo:Object.freeze({
        warningCount:3, warningSpeed:118, warningRespawnMs:2200,
        blackout:Object.freeze({
          firstAtMs:9000,
          1:Object.freeze({everyMs:16000, durationMs:4000}),
          2:Object.freeze({everyMs:11000, durationMs:5200})
        })
      }),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.BOSS_CLEAR,text:'トワを撃破'}),playable:true
    });
    // build1661 — 16F〜20F。16〜19Fは単騎（maxPartySize:1）の高難度。
    //  16〜18F：レイドボス（テスト／カミラ／シエン）を塔用に調整。共有HP・制限時間なし、HPは単騎向けに設定。
    //  19F：律動（リズム）最上級。20F：トワEX（15Fより強化）。報酬・進行はサーバー（resonance_tower RPC）が確定。
    if (floor >= 16 && floor <= 20) {
      const common = { id:'shooting_tower_'+floor, chapter:0, stageNo:floor, eventId:'resonance_tower', eventTitle:'残響の塔',
        name:'第'+['十六','十七','十八','十九','二十'][floor-16]+'層', type:'boss', background:'images/battle_bg_01.webp', playable:true };
      if (floor === 16) return Object.freeze({ ...common, difficultyLabel:'16F / 単騎', maxPartySize:1,
        enemyIds:Object.freeze([SHOOTING_ENEMY_ID.TOWER16_TEST]), bossElement:'wood', enemyElement:'wood',
        bossGaugeHps:Object.freeze([7000, 7500, 8000]),
        mission:Object.freeze({type:SHOOTING_MISSION_TYPE.BOSS_CLEAR,text:'単騎でテストを撃破'}) });
      if (floor === 17) return Object.freeze({ ...common, difficultyLabel:'17F / 単騎', maxPartySize:1,
        enemyIds:Object.freeze([SHOOTING_ENEMY_ID.TOWER17_CAMILLA]), bossElement:'fire', enemyElement:'fire',
        bossGaugeHps:Object.freeze([7500, 8000, 9000]),
        mission:Object.freeze({type:SHOOTING_MISSION_TYPE.BOSS_CLEAR,text:'単騎でカミラを撃破'}) });
      if (floor === 18) return Object.freeze({ ...common, difficultyLabel:'18F / 単騎', maxPartySize:1,
        enemyIds:Object.freeze([SHOOTING_ENEMY_ID.TOWER18_SHIEN]), bossElement:'dark', enemyElement:'dark',
        bossGaugeHps:Object.freeze([8000, 9000, 9500]),
        mission:Object.freeze({type:SHOOTING_MISSION_TYPE.BOSS_CLEAR,text:'単騎でシエンを撃破'}) });
      if (floor === 19) return Object.freeze({ ...common, difficultyLabel:'19F / 単騎', maxPartySize:1,
        // 律動 -仮面舞踏会- 最上級がベース。報酬設定は持たない。
        // build1671: 単騎（交代・予備HPなし）では無理ゲーだったため塔だけ緩和。
        //  弾が降りる速さ 900→1000ms（約1割ゆっくり）・穴を1マス広く（holeBonus 0→1）・HP 3万→2.4万。
        //  被弾ダメージは敵定義（TOWER19_RHYTHM）側で軽減。特別巡行の律動は変更なし。
        rhythm:Object.freeze({ difficulty:'super', travelMs:1000, holeBonus:1 }),
        bossGaugeHps:Object.freeze([7000, 8000, 9000]),
        introImage:'images/rhythm_masquerade_battle_start.webp',
        enemyIds:Object.freeze([SHOOTING_ENEMY_ID.TOWER19_RHYTHM]), bossElement:'dark', enemyElement:'dark',
        mission:Object.freeze({type:SHOOTING_MISSION_TYPE.BOSS_CLEAR,text:'単騎で弾幕の穴をたどって進め'}) });
      return Object.freeze({ ...common, difficultyLabel:'20F / 最深部 EX',
        enemyIds:Object.freeze([SHOOTING_ENEMY_ID.TOWER20_TOWA_EX]),
        bossElement:'dark', enemyElement:'dark', bossVisualScale:0.62,
        introImage:'images/tower15_boss_battle_start.webp',
        // 15Fより：WARNING 3→4・速く・補充が早い／暗転が早く・長く・頻繁／通常弾幕の間隔×0.88
        // build1691: 即死弾（WARNING）を1.5倍（4→6）に増量。
        tower15Echo:Object.freeze({
          warningCount:6, warningSpeed:132, warningRespawnMs:1800, fireIntervalScale:0.88,
          blackout:Object.freeze({
            firstAtMs:7000,
            1:Object.freeze({everyMs:13000, durationMs:4600}),
            2:Object.freeze({everyMs:9000, durationMs:5800})
          })
        }),
        mission:Object.freeze({type:SHOOTING_MISSION_TYPE.BOSS_CLEAR,text:'トワEXを撃破'}) });
    }
    if (floor === 10) return Object.freeze({
      id:'shooting_tower_10', chapter:0, stageNo:10,
      eventId:'resonance_tower', eventTitle:'残響の塔', difficultyLabel:'10F / 最深部',
      name:'第十層', type:'boss', background:'images/battle_bg_01.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.REMNANT_05]),
      bossVisualScale:1.0,
      tower10ReverseControls:Object.freeze({phases:Object.freeze([2,3]),triggerHpRatio:0.5,durationMs:5000}),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.BOSS_CLEAR,text:'最深部の守護者を撃破'}),
      playable:true
    });
    const totalEnemies=[5,6,7,7,8,8,9,9,10][floor-1];
    const battle={
      totalEnemies,
      // Tower08: keep its high-difficulty 2-enemy encounter, rendered via Canvas.
      maxActive:difficult?3:2,
      spawnIntervalMs:difficult?1100:1350,
      enemyHp:Math.round(520+floor*255+(difficult?350:0)),
      enemyBulletDamage:Math.round(65+floor*11),
      enemyBulletSpeed:145+floor*8,
      // Tower08: restore strong 7/9/12-shot volleys, keep Canvas bullet rendering.
      enemyFireRate:Math.max(920,1920-floor*80),
      barrageLevel:Math.min(5,1+Math.floor(floor/2)),itemDropRate:0
    };
    // Tower04: fixed visible obstruction; Tower06: original mobile obstruction.
    // Existing Chapter06 barrier collision logic handles projectile blocking.
    const barriers=floor===4?Object.freeze([Object.freeze({
      xRate:.5,yRate:.43,widthRate:.67,height:23,moveRangeRate:0,moveSpeed:0,contactDamage:80
    })]):floor===6?Object.freeze([Object.freeze({
      xRate:.5,yRate:.44,widthRate:.58,height:22,moveRangeRate:.12,moveSpeed:.25,contactDamage:80
    })]):null;
    return Object.freeze({
      id:'shooting_tower_'+String(floor).padStart(2,'0'),chapter:0,stageNo:floor,
      eventId:'resonance_tower',eventTitle:'残響の塔',
      difficultyLabel:String(floor).padStart(2,'0')+'F'+(difficult?' / 難関':''),
      name:'第'+floor+'層',type:'normal',background:'images/battle_bg_01.webp',
      enemyIds:Object.freeze(TOWER_ENEMY_POOLS[floor-1]),
      normalBattle:Object.freeze(floor===9?{...battle,enemyElementSequence:Object.freeze(['fire','aqua'])}:battle),
      ...(floor===9?{weaknessOnlyEnemies:true}:{}),
      ...(barriers?{chapter6Barriers:barriers}:{}),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'敵をすべて撃破'}),
      playable:true
    });
  }

  // build1643 — 位相回遊 / PHASE ODYSSEY：無限階層。
  // 既存の残響の塔の階層構成（敵AI・ギミック）をテンプレートとして流用し、
  // 階層ごとに敵HP・出現数・弾速を段階強化する。敵ATKは stage.phaseOdyssey.atkScale を
  // 戦闘側の被ダメ計算で乗算する。報酬付与は持たない（塔の封印・進行にも一切触れない）。
  const PHASE_ODYSSEY_STAGE_PREFIX = 'shooting_phase_odyssey_';
  const PHASE_ODYSSEY_MAX_FLOOR = 9999;
  //   1〜3F：軽め / 4〜6F：中級 / 7〜9F：難しめ / 10Fごと：ボス
  const PHASE_ODYSSEY_TEMPLATE_CYCLES = Object.freeze([
    Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    Object.freeze([4, 5, 6, 7, 8, 9, 11, 12, 13, 14]),
    Object.freeze([7, 8, 9, 11, 12, 13, 6, 9, 12, 15]),
  ]);
  const PHASE_ODYSSEY_BOSS_ROTATION = Object.freeze([10, 14, 15]);
  function getPhaseOdysseyTemplateFloor(floor) {
    const f = Math.max(1, Math.floor(Number(floor) || 1));
    const cycle = Math.floor((f - 1) / 10);
    const pos = (f - 1) % 10;
    if (cycle >= PHASE_ODYSSEY_TEMPLATE_CYCLES.length && pos === 9) {
      return PHASE_ODYSSEY_BOSS_ROTATION[cycle % PHASE_ODYSSEY_BOSS_ROTATION.length];
    }
    return PHASE_ODYSSEY_TEMPLATE_CYCLES[Math.min(cycle, PHASE_ODYSSEY_TEMPLATE_CYCLES.length - 1)][pos];
  }
  // 位相（5階ごと）を跨ぐたびに強化幅が上がる。31F以降は周回ごとにさらに乗算。
  function getPhaseOdysseyScaling(floor) {
    const f = Math.max(1, Math.floor(Number(floor) || 1));
    const tier = Math.floor((f - 1) / 5);
    const cycle = Math.floor((f - 1) / 10);
    const late = Math.max(0, cycle - 2);
    // build1691: 50F以降は「深層」。HP・ATKに追加倍率（50Fで×1.15、1階ごとに+0.6%、最大×1.6）、
    // 弾速の上限 +15%→+25%、敵の連射間隔×0.88、即死弾の常駐（getPhaseOdysseyLethalDrift）。
    const deep = f >= 50;
    const deepMul = deep ? Math.min(1.6, 1.15 + 0.006 * (f - 50)) : 1;
    return Object.freeze({
      floor: f,
      tier: tier + 1,
      hpScale: Math.round(Math.min(50, (1 + 0.03 * (f - 1) + 0.07 * tier) * Math.pow(1.12, late) * deepMul) * 1000) / 1000,
      atkScale: Math.round(Math.min(4, (1 + 0.02 * (f - 1) + 0.05 * tier) * Math.pow(1.08, late) * deepMul) * 1000) / 1000,
      bulletSpeedScale: Math.round((1 + Math.min(deep ? 0.25 : 0.15, 0.015 * tier)) * 1000) / 1000,
      fireRateScale: deep ? 0.88 : 1,
      extraEnemies: Math.min(3, cycle),
      deep,
    });
  }
  // build1691: 位相回遊 50F以降は毎階層、壁で反射し続ける即死弾（WARNING）が漂う。
  //  50〜69F：2個 / 70〜99F：3個 / 100F〜：4個。速さと補充間隔も深くなるほど厳しく。
  //  律動（弾幕の穴をたどるボス）と、元から即死弾が常駐するトワには付けない。
  function getPhaseOdysseyLethalDrift(floor) {
    const f = Math.max(1, Math.floor(Number(floor) || 1));
    if (f < 50) return null;
    const count = f >= 100 ? 4 : (f >= 70 ? 3 : 2);
    return Object.freeze({
      count,
      speed: Math.min(150, 104 + Math.floor((f - 50) / 10) * 6),
      respawnMs: Math.max(1600, 2800 - Math.floor((f - 50) / 10) * 150),
      startDelayMs: 1800,
    });
  }
  const phaseOdysseyStageCache = new Map();
  // ------------------------------------------------------------
  // build1643: 10階ごとのボス戦。既存ボス（STORY・残響の塔・レイド・律動）の行動・ギミックを流用し、
  // HP・ゲージ数（=PHASE数。カミラ/シエン等はPHASEでギミック段階が上がる）・被ダメ倍率を
  // 「その階層」に合わせて作り直す。オリジナルの難易度は使わない。
  // どのボスが出るかは window.PhaseOdyssey がrunごとに抽選し、ステージIDの末尾キーで渡す。
  // ------------------------------------------------------------
  const PHASE_ODYSSEY_BOSSES = Object.freeze({
    dragon:   Object.freeze({ name:'竜型レムナント', tpl:'shooting_ch01_04' }),
    irish:    Object.freeze({ name:'イリシュ',       tpl:'shooting_ch02_04' }),
    mirage:   Object.freeze({ name:'ミラージュ',     tpl:'shooting_tower_10' }),
    livia:    Object.freeze({ name:'リヴィア',       tpl:'shooting_tower_14' }),
    overseer: Object.freeze({ name:'オーバーシア',   enemy:SHOOTING_ENEMY_ID.PO_OVERSEER, overseer:true }),
    camilla:  Object.freeze({ name:'カミラ',         enemy:SHOOTING_ENEMY_ID.RAID_CAMILLA }),
    shien:    Object.freeze({ name:'シエン',         enemy:SHOOTING_ENEMY_ID.RAID_SHIEN }),
    rhythm:   Object.freeze({ name:'仮面舞踏会',     tpl:'shooting_event_rhythm_advanced', lateTpl:'shooting_event_rhythm_test', lateFrom:70 }),
    towa:     Object.freeze({ name:'トワ',           tpl:'shooting_tower_15' }),
    // build1643: レムナント：イノリ（STORYより先に位相回遊で実装）
    inori:    Object.freeze({ name:'イノリ',         enemy:SHOOTING_ENEMY_ID.INORI, inori:true }),
    // build1681: 100F・150F・200F…の確定ボス。本体無敵・天秤でダメージ／回復。
    eclipse:  Object.freeze({ name:'エクリプス',     enemy:SHOOTING_ENEMY_ID.PO_ECLIPSE, eclipse:true }),
  });
  const PHASE_ODYSSEY_DEFAULT_BOSS = 'mirage';
  // 報酬・チケット・スコア系の設定はボス戦に持ち込まない
  const PHASE_ODYSSEY_BOSS_STRIP_KEYS = Object.freeze(['fixedItemDrops', 'firstClearGems', 'specialTicketCost', 'baseStageId',
    'raid', 'scoreAttack', 'bossTotalHp', 'bossGaugeHp', 'survivalBoss', 'timeLimitSeconds', 'bossGauges', 'storyReplay']);
  function getPhaseOdysseyBossTuning(floor, enemyDef) {
    const scale = getPhaseOdysseyScaling(floor);
    const bossNo = Math.max(1, Math.floor(floor / 10));
    // 合計HP：10F≈13,400 / 20F≈17,800 / 30F≈22,200 …（位相のHP倍率に比例）
    const totalHp = Math.round(10000 * scale.hpScale);
    // ゲージ（PHASE）数：〜40Fは最大2、50F以降はオリジナルどおり（最大3）
    const maxGauges = floor >= 50 ? 3 : 2;
    // ボスごとの弾ダメージ差を均し、階層の敵ATK倍率に合わせる。最初のボスだけ少し控えめ。
    const baseDamage = Math.max(1, Number(enemyDef && enemyDef.bulletDamage || 210));
    const atkScale = Math.round(scale.atkScale * Math.max(0.8, Math.min(1.25, 210 / baseDamage)) * (bossNo === 1 ? 0.9 : 1) * 1000) / 1000;
    return { scale, totalHp, maxGauges, atkScale, bossNo };
  }
  function makePhaseOdysseyBossStage(f, requestedKey) {
    const key = PHASE_ODYSSEY_BOSSES[requestedKey] ? requestedKey : PHASE_ODYSSEY_DEFAULT_BOSS;
    const def = PHASE_ODYSSEY_BOSSES[key];
    const tplId = def.lateTpl && f >= def.lateFrom ? def.lateTpl : def.tpl;
    const tpl = tplId ? SHOOTING_STAGES[tplId] : null;
    const base = tpl ? { ...tpl } : {
      type: 'boss', background: 'images/battle_bg_01.webp', enemyIds: Object.freeze([def.enemy]),
    };
    if (def.overseer) {
      // オーバーシア：自ユニットと同程度の表示サイズ。監視の眼は最大3体まで同時に出現し、倒しても補充される。
      base.introImage = 'images/phase_odyssey_overseer_intro.webp';
      base.bossVisualScale = 0.7;
      base.bossAdds = Object.freeze({
        enemyIds: Object.freeze([SHOOTING_ENEMY_ID.PO_WATCHER]),
        totalEnemies: 0, maxActive: 3, startDelayMs: 2200, spawnIntervalMs: Math.max(3200, 6500 - Math.floor(f / 10) * 300),
      });
    }
    if (def.eclipse) {
      base.introImage = 'images/eclipse_battle_start.webp';
      base.bossVisualScale = 0.78;
    }
    PHASE_ODYSSEY_BOSS_STRIP_KEYS.forEach(k => { delete base[k]; });
    const enemyId = Array.isArray(base.enemyIds) && base.enemyIds.length ? base.enemyIds[0] : def.enemy;
    const enemyDef = typeof window.ShootingEnemies.getShootingEnemy === 'function'
      ? window.ShootingEnemies.getShootingEnemy(enemyId) : null;
    const tune = getPhaseOdysseyBossTuning(f, enemyDef);
    // 元のゲージ比率を保ったまま、階層の合計HPへ配分する
    let original = Array.isArray(tpl && tpl.bossGaugeHps) ? tpl.bossGaugeHps.slice() : null;
    if (!original && enemyDef) {
      if (Array.isArray(enemyDef.gaugeHps) && enemyDef.gaugeHps.length) original = enemyDef.gaugeHps.slice();
      else {
        const count = Math.max(1, Math.floor(Number((tpl && tpl.bossGauges) || enemyDef.gauges || 1)));
        original = Array.from({ length: count }, () => Math.max(1, Number(enemyDef.gaugeHp || enemyDef.hp || 1)));
      }
    }
    if (!original || !original.length) original = [1, 1];
    const used = original.slice(0, Math.max(1, Math.min(original.length, tune.maxGauges))).map(v => Math.max(1, Number(v) || 1));
    const sum = used.reduce((a, b) => a + b, 0);
    // build1682: エクリプスは攻撃が通るのが光状態（8秒）の間だけなので、合計HPを60%に（PHASEは常に3）
    const hpTotal = def.eclipse ? Math.round(tune.totalHp * 0.6) : tune.totalHp;
    const gaugeSrc = def.eclipse ? original.slice(0, 3) : used;
    const gaugeSum = gaugeSrc.reduce((a, b) => a + Math.max(1, Number(b) || 1), 0);
    const gaugeHps = gaugeSrc.map(v => Math.max(1, Math.round(hpTotal * Math.max(1, Number(v) || 1) / gaugeSum)));
    const lethalDrift = (key === 'rhythm' || key === 'towa') ? null : getPhaseOdysseyLethalDrift(f);
    if (key === 'towa' && f >= 50 && base.tower15Echo) {
      // トワは常駐WARNINGを増やして同じ「深層」の圧にする（3→5）
      base.tower15Echo = Object.freeze({ ...base.tower15Echo, warningCount: Number(base.tower15Echo.warningCount || 3) + 2 });
    }
    return Object.freeze({
      ...base,
      odysseyLethalDrift: lethalDrift,
      id: PHASE_ODYSSEY_STAGE_PREFIX + f + '_' + key,
      chapter: 0,
      stageNo: f,
      type: 'boss',
      enemyIds: Object.freeze([enemyId]),
      eventId: 'phase_odyssey',
      eventTitle: '位相回遊',
      name: '第' + f + '階層',
      difficultyLabel: 'FLOOR ' + f + ' / BOSS',
      bossGaugeHps: Object.freeze(gaugeHps),
      mission: Object.freeze({ type: SHOOTING_MISSION_TYPE.BOSS_CLEAR, text: def.name + 'を撃破' }),
      phaseOdyssey: Object.freeze({
        floor: f, templateFloor: 0, tier: tune.scale.tier, boss: key, bossName: def.name,
        watcherHp: def.overseer ? Math.round(1100 * tune.scale.hpScale) : 0,
        toriiHp: def.inori ? Math.round(1300 * tune.scale.hpScale) : 0,
        hpScale: tune.scale.hpScale, atkScale: tune.atkScale, bossGauges: gaugeHps.length,
      }),
      playable: true,
    });
  }

  function makePhaseOdysseyStage(floor, bossKey) {
    const f = Math.max(1, Math.min(PHASE_ODYSSEY_MAX_FLOOR, Math.floor(Number(floor) || 1)));
    if (f % 10 === 0) {
      const cacheKey = f + '_' + String(bossKey || '');
      if (!phaseOdysseyStageCache.has(cacheKey)) phaseOdysseyStageCache.set(cacheKey, makePhaseOdysseyBossStage(f, bossKey));
      return phaseOdysseyStageCache.get(cacheKey);
    }
    // build1679: 新ルールのrunだけ、お題・異常（variant）を付ける。旧runは variant=null で従来と完全に同じステージ。
    const rawVariant = getPhaseOdysseyFloorVariant(f);
    const cacheKey = rawVariant ? (f + '|' + rawVariant.objective + '|' + (rawVariant.anomaly || '')) : f;
    if (phaseOdysseyStageCache.has(cacheKey)) return phaseOdysseyStageCache.get(cacheKey);
    if (rawVariant && rawVariant.objective === 'lethal') {
      const lethalStage = makePhaseOdysseyLethalStage(f, rawVariant);
      phaseOdysseyStageCache.set(cacheKey, lethalStage);
      return lethalStage;
    }
    const templateFloor = getPhaseOdysseyTemplateFloor(f);
    const base = makeResonanceTowerStage(templateFloor);
    const scale = getPhaseOdysseyScaling(f);
    const stage = {
      ...base,
      id: PHASE_ODYSSEY_STAGE_PREFIX + f,
      chapter: 0,
      stageNo: f,
      eventId: 'phase_odyssey',
      eventTitle: '位相回遊',
      name: '第' + f + '階層',
      difficultyLabel: 'FLOOR ' + f + (base.type === 'boss' ? ' / BOSS' : ''),
      phaseOdyssey: Object.freeze({
        floor: f, templateFloor, tier: scale.tier,
        hpScale: scale.hpScale, atkScale: scale.atkScale,
      }),
      playable: true,
    };
    if (base.normalBattle) {
      const nb = { ...base.normalBattle };
      if (Number.isFinite(Number(nb.enemyHp))) nb.enemyHp = Math.round(Number(nb.enemyHp) * scale.hpScale);
      if (Number.isFinite(Number(nb.enemyBulletSpeed))) nb.enemyBulletSpeed = Math.round(Number(nb.enemyBulletSpeed) * scale.bulletSpeedScale);
      if (Number.isFinite(Number(nb.totalEnemies)) && !base.swarmBattle) nb.totalEnemies = Number(nb.totalEnemies) + scale.extraEnemies;
      if (scale.fireRateScale !== 1 && Number.isFinite(Number(nb.enemyFireRate))) nb.enemyFireRate = Math.round(Number(nb.enemyFireRate) * scale.fireRateScale);
      stage.normalBattle = Object.freeze(nb);
    }
    // build1691: 50F以降は必ず即死弾が漂う（トワのテンプレート階は常駐WARNINGを増やす）
    if (base.tower15Echo) {
      if (f >= 50) stage.tower15Echo = Object.freeze({ ...base.tower15Echo, warningCount: Number(base.tower15Echo.warningCount || 3) + 2 });
    } else if (!base.rhythm) {
      stage.odysseyLethalDrift = getPhaseOdysseyLethalDrift(f);
    }
    if (base.swarmBattle && Number.isFinite(Number(base.swarmBattle.guardHp))) {
      // build1680: 大蜘蛛・子蜘蛛のHPも階層倍率で強化（従来は三頭狼だけで、蜘蛛は全階層で塔13Fと同じHPだった）
      stage.swarmBattle = Object.freeze({ ...base.swarmBattle, guardHp: Math.round(Number(base.swarmBattle.guardHp) * scale.hpScale),
        spiderHpScale: scale.hpScale });
    }
    if (base.type === 'boss') {
      let gauges = Array.isArray(base.bossGaugeHps) ? base.bossGaugeHps.slice() : null;
      if (!gauges) {
        const bossId = Array.isArray(base.enemyIds) ? base.enemyIds[0] : '';
        const def = typeof window.ShootingEnemies.getShootingEnemy === 'function'
          ? window.ShootingEnemies.getShootingEnemy(bossId) : null;
        if (def && Array.isArray(def.gaugeHps) && def.gaugeHps.length) gauges = def.gaugeHps.slice();
        else if (def) {
          const count = Math.max(1, Math.floor(Number(def.gauges || 1)));
          const hp = Math.max(1, Number(def.gaugeHp || def.hp || 1));
          gauges = Array.from({ length: count }, () => hp);
        }
      }
      if (gauges && gauges.length) {
        stage.bossGaugeHps = Object.freeze(gauges.map(v => Math.max(1, Math.round(Number(v || 1) * scale.hpScale))));
      }
    }
    if (rawVariant) applyPhaseOdysseyVariant(stage, base, rawVariant, f);
    const frozen = Object.freeze(stage);
    phaseOdysseyStageCache.set(cacheKey, frozen);
    return frozen;
  }

  // ============================================================
  // build1692: 位相回遊の「死線」階（21F以降のボス階以外にまれに出る。抽選は phase_odyssey.js）。
  //  超弾幕（理想郷 -ノア-）の左右対称レーン弾幕を、すべて即死弾に置き換えたBOSS戦。
  //  自機狙い・追従はなし。1発でも当たればその味方は戦闘不能。
  //  そのぶんBOSSのHPは低め：基準 1,200 / 1,400 / 1,600（合計4,200）× 階層のHP倍率
  //  （同じ階層のボス階の合計HPの約4割）。即死弾の常駐（深層）は重ねない。
  // ============================================================
  const PHASE_ODYSSEY_LETHAL_GAUGES = Object.freeze([1200, 1400, 1600]);
  function makePhaseOdysseyLethalStage(f, v) {
    const scale = getPhaseOdysseyScaling(f);
    const gaugeHps = PHASE_ODYSSEY_LETHAL_GAUGES.map(hp => Math.max(1, Math.round(hp * scale.hpScale)));
    return Object.freeze({
      id: PHASE_ODYSSEY_STAGE_PREFIX + f,
      chapter: 0,
      stageNo: f,
      type: 'boss',
      background: 'images/battle_bg_01.webp',
      eventId: 'phase_odyssey',
      eventTitle: '位相回遊',
      name: '第' + f + '階層',
      difficultyLabel: 'FLOOR ' + f + ' / 死線',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.LETHAL_BARRAGE]),
      bossElement: 'neutral',
      enemyElement: 'neutral',
      bossGaugeHps: Object.freeze(gaugeHps),
      // 弾幕の調整値（shooting_core.js fireLethalBarrage が参照）。深い階ほど少しだけ速く・詰める。
      lethalBarrage: Object.freeze({
        intervalMs: Object.freeze([560, 470, 400].map(ms => Math.round(ms * (f >= 50 ? 0.92 : 1)))),
        speedMul: Object.freeze([0.80, 0.86, 0.92].map(m => Math.round(m * scale.bulletSpeedScale * 1000) / 1000)),
        radius: 9,
      }),
      mission: Object.freeze({ type: SHOOTING_MISSION_TYPE.BOSS_CLEAR, text: '即死弾幕をくぐり抜けて撃破' }),
      phaseOdyssey: Object.freeze({
        floor: f, templateFloor: 0, tier: scale.tier,
        hpScale: scale.hpScale, atkScale: scale.atkScale,
        variant: Object.freeze({ v: v.v, objective: 'lethal', anomaly: '' }),
      }),
      playable: true,
    });
  }

  // build1679: 位相回遊の「お題・異常」。抽選は phase_odyssey.js（run_seed＋階層）、戦闘内容への反映はここ。
  function getPhaseOdysseyFloorVariant(floor) {
    try {
      const api = window.PhaseOdyssey;
      return api && typeof api.getFloorVariant === 'function' ? api.getFloorVariant(floor) : null;
    } catch (_) { return null; }
  }
  const PHASE_ODYSSEY_OBJECTIVE_LABEL = Object.freeze({ clear:'殲滅', survive:'生存', elite:'精鋭', speed:'速攻', nohit:'見切り', lethal:'死線' });
  const PHASE_ODYSSEY_ANOMALY_LABEL = Object.freeze({ blackout:'暗転', haste:'加速', reverse:'反転', slow:'鈍化', crowd:'過密', burst:'連鎖' });
  function applyPhaseOdysseyVariant(stage, base, v, f) {
    if (!stage.normalBattle || base.type === 'boss') return;
    const nb = { ...stage.normalBattle };
    const swarm = !!base.swarmBattle;
    // 群生（蜘蛛）テンプレートは「生存」「精鋭」と「過密」を使わない（蜘蛛の産卵と噛み合わないため）
    let objective = (swarm && (v.objective === 'survive' || v.objective === 'elite')) ? 'clear' : v.objective;
    let anomaly = v.anomaly || '';
    if (swarm && anomaly === 'crowd') anomaly = 'haste';
    const out = { v: v.v, objective, anomaly };
    const M = SHOOTING_MISSION_TYPE;
    if (objective === 'survive') {
      const secs = f >= 31 ? 25 : 20;
      out.seconds = secs;
      nb.infiniteEnemies = true;
      nb.maxActive = Math.max(1, Number(nb.maxActive || 2)) + 1;
      nb.spawnIntervalMs = Math.round(Math.max(500, Number(nb.spawnIntervalMs || 1350) * 0.75));
      stage.mission = Object.freeze({ type: M.SURVIVE_TIME, targetSeconds: secs, text: secs + '秒間 生き残れ' });
    } else if (objective === 'elite') {
      nb.odysseyElite = Object.freeze({ hpMul: 5, scale: 1.45, fireRateMul: 0.8 });
      stage.mission = Object.freeze({ type: M.DEFEAT_ALL, text: '精鋭を含む敵をすべて撃破' });
    } else if (objective === 'speed') {
      const total = Number(nb.totalEnemies || 6) + (anomaly === 'crowd' ? 3 : 0);
      const secs = Math.max(20, Math.min(50, Math.round(8 + total * 4)));
      out.seconds = secs;
      stage.mission = Object.freeze({ type: M.DEFEAT_ALL, text: '敵をすべて撃破（' + secs + '秒以内でボーナス）' });
    } else if (objective === 'nohit') {
      out.maxHits = 3;
      stage.mission = Object.freeze({ type: M.DEFEAT_ALL, text: '敵をすべて撃破（被弾3回以内でボーナス）' });
    }
    if (anomaly === 'haste') nb.enemyBulletSpeed = Math.round(Number(nb.enemyBulletSpeed || 170) * 1.25);
    if (anomaly === 'crowd') {
      if (!nb.infiniteEnemies) nb.totalEnemies = Number(nb.totalEnemies || 6) + 3;
      nb.maxActive = Math.max(1, Number(nb.maxActive || 2)) + 1;
      if (nb.infiniteEnemies) nb.spawnIntervalMs = Math.round(Math.max(450, Number(nb.spawnIntervalMs || 1000) * 0.85));
    }
    if (anomaly === 'reverse') stage.reverseHorizontalControls = true;
    stage.normalBattle = Object.freeze(nb);
    stage.phaseOdyssey = Object.freeze({ ...stage.phaseOdyssey, variant: Object.freeze(out) });
    stage.difficultyLabel = 'FLOOR ' + f + ' / ' + (PHASE_ODYSSEY_OBJECTIVE_LABEL[objective] || '殲滅') +
      (anomaly ? '・' + (PHASE_ODYSSEY_ANOMALY_LABEL[anomaly] || '') : '');
  }

  const SHOOTING_STAGES = Object.freeze({
    ...Object.fromEntries(Array.from({length:20},(_,i)=>{const n=i+1;return ['shooting_tower_'+String(n).padStart(2,'0'),makeResonanceTowerStage(n)];})),
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

      // build1415: このステージだけ戦闘用BOSS画像を差し替え。AI / HP / 弾幕は従来通り。
      bossBattleImage: 'images/enemy_mini_03_battle.webp',
      introImage: 'images/remnant_01_battle_start.webp',
      // build1416: build1415比で約16%小さく表示（BOSS行動・HPは変更しない）。
      bossVisualScale: 1.30,

      // build1168: 負けイベント～アルノ戦まで最初から2ゲージ設計。
      bossGauges: 2,

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: '竜型レムナントを撃破',
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

      // build1415: BOSS画像だけ置換し、ボス戦闘ロジックは変更しない。
      bossBattleImage: 'images/enemy_remmaster.webp',
      introImage: 'images/remnant_02_battle_start.webp',
      // build1416: build1415比で16%小さく表示（BOSS行動・HPは変更しない）。
      bossVisualScale: 1.05,

      // build1190: CH02-04 boss battle uses two HP gauges.
      bossGauges: 2,

      // CH02-04の援軍もLIGHT属性で統一。
      bossAdds: Object.freeze({
        enemyIds: Object.freeze([
          SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT,
        ]),
        // build1415: LIGHT属性の遠隔1体と突進1体を各1回のみ出現させる。
        // 合計2体上限なので、撃破後に蘇生・補充されない。
        enemyVariants: Object.freeze(['normal', 'atack']),
        totalEnemies: 2,
        maxActive: 2,
        startDelayMs: 3500,
        spawnIntervalMs: 2500,
      }),

      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: '白い影を撃破',
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
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'闇属性レムナント3体を撃破'}),
      // build1468: Sランククリアのたびに追加でもらえる報酬（通常モードのみ）
      sRankBonusRewards:Object.freeze([
        Object.freeze({ id:'level_exp_large', name:'強化素材・金', image:'images/item_exp_gold.webp', count:1, rewardType:'level_exp' })
      ]),
      playable:true
    }),

    // ============================================================
    // CHAPTER 06 — 来訪者（物語 → 隠密ゲーム → 属性バリア戦 → 紙のパズル）
    // ============================================================
    [SHOOTING_STAGE_ID.CH06_01]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH06_01, chapter:6, stageNo:1,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch06_01?.stageTitle || '気配';},
      type:'normal', background:'images/battle_bg_01.webp', enemyIds:Object.freeze([]),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'物語を読む'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH06_02]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH06_02, chapter:6, stageNo:2,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch06_02?.stageTitle || '吉か凶か';},
      type:'normal', background:'images/battle_bg_01.webp', enemyIds:Object.freeze([]),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'隠密ミニゲームを2戦クリア'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH06_03]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH06_03, chapter:6, stageNo:3,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch06_03?.stageTitle || '火を払う水';},
      type:'normal', background:'images/battle_bg_01.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.MINI_03]),
      weaknessOnlyEnemies:true,
      normalBattle:Object.freeze({
        totalEnemies:3, maxActive:3, spawnAllAtStart:true, spawnIntervalMs:500,
        itemDropRate:0, enemyImage:'images/zako_enemy_01_normal_light.webp',
        enemyElementSequence:Object.freeze(['fire','fire','wood']),
        enemyHpSequence:Object.freeze([2200,2200,2200]),
        enemyBulletDamage:125, enemyBulletSpeed:250, enemyFireRate:1000, barrageLevel:4
      }),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'火2体・木1体の強化個体を撃破'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH06_04]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH06_04, chapter:6, stageNo:4,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch06_04?.stageTitle || '道しるべ';},
      type:'normal', background:'images/battle_bg_01.webp', enemyIds:Object.freeze([]),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'2枚の紙の紋様をつなぐ'}),playable:true
    }),

    // ============================================================
    // CHAPTER 07 — 灰路（仮）：9人で東の「輪をまとった光」の塔へ向かう道中
    // 7-1 出発（物語） / 7-2 空の聖堂 / 7-3 灰の丘 / 7-4 夜明け（灰から湧き上がる小蜘蛛の大群を突破）
    // ============================================================
    [SHOOTING_STAGE_ID.CH07_01]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH07_01, chapter:7, stageNo:1,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch07_01?.stageTitle || '出発';},
      type:'normal', background:'images/battle_bg_01.webp', enemyIds:Object.freeze([]),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'物語を読む'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH07_02]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH07_02, chapter:7, stageNo:2,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch07_02?.stageTitle || '空の聖堂';},
      type:'normal', background:'images/battle_bg_01.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.STRONG_CH07_02]),
      // 弱点バリアなし（weaknessOnlyEnemies を付けない）。遮断壁が左右にゆっくり動き、射線を切る。
      chapter6Barriers:Object.freeze([
        Object.freeze({ xRate:.50, yRate:.47, widthRate:.56, height:23, moveRangeRate:.18, moveSpeed:.34, contactDamage:85 }),
      ]),
      normalBattle:Object.freeze({
        totalEnemies:1, maxActive:1, spawnAllAtStart:true, spawnIntervalMs:500, itemDropRate:0,
        enemyBulletDamage:120, enemyBulletSpeed:235, enemyFireRate:1100, barrageLevel:4
      }),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'出口をふさぐ強化個体を撃破'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH07_03]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH07_03, chapter:7, stageNo:3,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch07_03?.stageTitle || '灰の丘';},
      type:'normal', background:'images/battle_bg_ch07_03.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.SWARM_SPIDER_LARGE]),
      swarmBattle:Object.freeze({
        largeEnemyId:SHOOTING_ENEMY_ID.SWARM_SPIDER_LARGE,
        smallEnemyId:SHOOTING_ENEMY_ID.SWARM_SPIDER_SMALL,
        largeCount:3,              // 勝利条件：この数の大を撃破
        broodIntervalMs:5000,      // 大1体あたり、5秒に1体ずつ小を生む
        broodMaxPerLarge:3,        // 大1体あたり、小は同時3体まで
        largeTrapHitsToKill:3,     // TRAP爆発3回で大を撃破
        largeMaxYRate:.58,         // 大は画面の58%より下へは降りない（逃げ場を残す）
        objectContactDps:60,       // デコイへ群がったときの毎秒ダメージ（1体あたり）
      }),
      normalBattle:Object.freeze({
        totalEnemies:3, maxActive:99, itemDropRate:0,
      }),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'群れを生む強化個体3体を撃破'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH07_04]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH07_04, chapter:7, stageNo:4,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch07_04?.stageTitle || '夜明け';},
      type:'normal', background:'images/battle_bg_ch07_03.webp',
      // 小蜘蛛だけが灰の中から次々と現れる。射撃弾は使用しない。
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.SWARM_SPIDER_SMALL]),
      spiderHorde:Object.freeze({
        smallEnemyId:SHOOTING_ENEMY_ID.SWARM_SPIDER_SMALL,
        totalEnemies:42, maxActive:14, batchSize:3, spawnIntervalMs:1000,
        moveSpeedMultiplier:1.75, surroundRadius:61,
        groupMinCount:3, groupHitIntervalMs:420,
        groupDamageHpRate:0.16, // 群がられ続けると概ね3秒で1キャラKO
      }),
      normalBattle:Object.freeze({
        totalEnemies:42, maxActive:14, spawnIntervalMs:1000, itemDropRate:0
      }),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'押し寄せる小蜘蛛42体を退け、灰の丘を越える'}),playable:true
    }),

    // ============================================================
    // CHAPTER 08 — 七つの塔
    // 全4ステージ：探索戦 → 壁＋属性戦 → 迎撃戦 → 守護者BOSS
    // ノア幹部の正体は明かさない。第7章「……呼んでる。」の直後から。
    // ============================================================
    [SHOOTING_STAGE_ID.CH08_01]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH08_01, chapter:8, stageNo:1,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch08_01?.stageTitle || '塔の麓';},
      type:'normal', background:'images/battle_bg_01.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.MINI_05, SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT]),
      normalBattle:Object.freeze({
        totalEnemies:5,maxActive:3,spawnIntervalMs:1700,itemDropRate:0,
        enemyElementSequence:Object.freeze(['light','dark','light','dark','light']),
        enemyHp:2200,enemyBulletDamage:125,enemyBulletSpeed:248,enemyFireRate:980,barrageLevel:4
      }),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'塔の入口を守るレムナント5体を撃破'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH08_02]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH08_02, chapter:8, stageNo:2,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch08_02?.stageTitle || '七方向の印';},
      type:'normal', background:'images/battle_bg_01.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.ZAKO_DARK_SHOT,SHOOTING_ENEMY_ID.ZAKO_LIGHT_SHOT]),
      chapter6Barriers:Object.freeze([
        Object.freeze({xRate:.50,yRate:.47,widthRate:.52,height:20,moveRangeRate:.14,moveSpeed:.31,contactDamage:90})
      ]),
      normalBattle:Object.freeze({
        totalEnemies:6,maxActive:3,spawnIntervalMs:1750,itemDropRate:0,
        enemyElementSequence:Object.freeze(['dark','light','dark','light','dark','light']),
        enemyHp:2350,enemyBulletDamage:130,enemyBulletSpeed:253,enemyFireRate:1030,barrageLevel:4
      }),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'遮断壁を越えて守護個体6体を撃破'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH08_03]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH08_03, chapter:8, stageNo:3,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch08_03?.stageTitle || '観測';},
      type:'normal', background:'images/battle_bg_01.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.MINI_05,SHOOTING_ENEMY_ID.ZAKO_AQUA_SHOT,SHOOTING_ENEMY_ID.ZAKO_WOOD_SHOT]),
      normalBattle:Object.freeze({
        totalEnemies:7,maxActive:3,spawnIntervalMs:1300,itemDropRate:0,
        enemyElementSequence:Object.freeze(['aqua','wood','dark','light','aqua','wood','dark']),
        enemyHp:2600,enemyBulletDamage:135,enemyBulletSpeed:262,enemyFireRate:900,barrageLevel:4
      }),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'塔の内壁に現れた観測個体7体を撃破'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH08_04]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH08_04, chapter:8, stageNo:4,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch08_04?.stageTitle || '応答';},
      type:'boss', background:'images/battle_bg_01.webp',
      // build1643: 塔の守護者を「オーバーシア」に差し替え（専用バトル画像・イントロ）。HPは従来どおり。
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.PO_OVERSEER]),
      bossGauges:2,
      bossGaugeHps:Object.freeze([9500,12500]),
      introImage:'images/phase_odyssey_overseer_intro.webp',
      // 自ユニットと同程度の表示サイズ
      bossVisualScale:0.7,
      // 監視の眼：最大3体、倒しても補充。視界に入っている間だけ敵弾が追従する。
      bossAdds:Object.freeze({
        enemyIds:Object.freeze([SHOOTING_ENEMY_ID.PO_WATCHER]),
        totalEnemies:0, maxActive:3, startDelayMs:2600, spawnIntervalMs:7000,
      }),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.BOSS_CLEAR,text:'オーバーシアを撃破し、円盤への道を開く'}),playable:true
    }),

    // ============================================================
    // build1667 CHAPTER 09「七塔の灯」
    //  01・03：パズル（共鳴灯）。resonance_lamp_ch09.html を iframe で開く（storyPuzzle / puzzleLevels）。
    //  02：フェイスレス（2WAVE・仮面オブジェクト）。04：イノリ（3PHASE・鳥居・全属性バリア）。
    // ============================================================
    [SHOOTING_STAGE_ID.CH09_01]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH09_01, chapter:9, stageNo:1,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch09_01?.stageTitle || '灯の扉';},
      type:'normal', background:'images/battle_bg_01.webp', enemyIds:Object.freeze([]),
      storyPuzzle:'resonance_lamp', puzzleLevels:Object.freeze([1,2,3]),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'扉の灯をすべてともす'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH09_02]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH09_02, chapter:9, stageNo:2,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch09_02?.stageTitle || '目覚める塔';},
      type:'boss', background:'images/battle_bg_01.webp',
      introImage:'images/enemy_faceless_battle_start.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.FACELESS]),
      // 特別巡行「無貌の天使」と同じ仕組みをストーリーで使う（eventId は付けない＝ストーリー扱い）
      storyFaceless:true,
      faceless:Object.freeze({
        difficulty:'advanced',
        waveHp:Object.freeze([7000, 15000]),
        waveBarrage:Object.freeze(['light', 'medium']),
        objectHp:900,
        objectWays:2,
        waveObjectCount:Object.freeze([1, 2]),
      }),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.BOSS_CLEAR,text:'目覚めた塔の守り、フェイスレスを撃破'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH09_03]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH09_03, chapter:9, stageNo:3,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch09_03?.stageTitle || '七塔の中心';},
      type:'normal', background:'images/battle_bg_01.webp', enemyIds:Object.freeze([]),
      storyPuzzle:'resonance_lamp', puzzleLevels:Object.freeze([4,5,6,7]),
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.DEFEAT_ALL,text:'七塔の灯をすべてともす'}),playable:true
    }),
    [SHOOTING_STAGE_ID.CH09_04]: Object.freeze({
      id:SHOOTING_STAGE_ID.CH09_04, chapter:9, stageNo:4,
      get name(){return window.ZERAPHIA_STORY_SCENARIO?.shooting_ch09_04?.stageTitle || '門の守護者';},
      type:'boss', background:'images/battle_bg_01.webp',
      enemyIds:Object.freeze([SHOOTING_ENEMY_ID.INORI]),
      bossElement:'light', enemyElement:'light',
      bossGauges:3,
      bossGaugeHps:Object.freeze([8000, 9500, 11000]),
      inoriToriiHp:1300,
      mission:Object.freeze({type:SHOOTING_MISSION_TYPE.BOSS_CLEAR,text:'門の守護者、イノリを撃破'}),playable:true
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
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.NOAH]),
      bossElement: 'light',
      enemyElement: 'light',
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: '理想郷 -ノア-を耐えきれ',
      }),
      playable: true,
    }),


    // ============================================================
    // build1630: SPECIAL STAGE 律動（リズム弾幕・試作）
    // 曲「仮面舞踏会」の拍どおりに弾の壁（ゲート）が届く。チケット消費・報酬なし。
    // ============================================================
    [SHOOTING_STAGE_ID.RHYTHM_TEST]: Object.freeze({
      id: SHOOTING_STAGE_ID.RHYTHM_TEST,
      chapter: 0,
      stageNo: 30,
      eventId: 'rhythm_test',
      eventTitle: '律動',
      difficultyLabel: '最上級',
      rhythm: Object.freeze({ difficulty: 'super', travelMs: 900, holeBonus: 0 }),
      type: 'boss',
      background: 'images/battle_bg_01.webp',
      introImage: 'images/rhythm_masquerade_battle_start.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.RHYTHM_GATE]),
      bossElement: 'dark',
      enemyElement: 'dark',
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: '弾幕の穴をたどって進め',
      }),
      // build1636: 通常クリア報酬は「強化素材・金」×2で固定（ランダムドロップなし）。
      // 初回クリアの結晶×10はサーバー（finish_secure_shooting_run）側で付与。
      fixedItemDrops: Object.freeze([Object.freeze({ id: 'level_exp_large', count: 2 })]),
      firstClearGems: 10,
      playable: true,
    }),

    [SHOOTING_STAGE_ID.RHYTHM_ADVANCED]: Object.freeze({
      id: SHOOTING_STAGE_ID.RHYTHM_ADVANCED,
      chapter: 0,
      stageNo: 31,
      eventId: 'rhythm_test',
      eventTitle: '律動',
      difficultyLabel: '上級',
      // 上級：落ちる速さを約2割遅く、穴を1マス広く、2PHASEまで
      rhythm: Object.freeze({ difficulty: 'advanced', travelMs: 1120, holeBonus: 1 }),
      type: 'boss',
      background: 'images/battle_bg_01.webp',
      introImage: 'images/rhythm_masquerade_battle_start.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.RHYTHM_GATE_ADVANCED]),
      bossElement: 'dark',
      enemyElement: 'dark',
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: '弾幕の穴をたどって進め',
      }),
      // build1636: 通常クリア報酬は「強化素材・金」×2で固定（ランダムドロップなし）。
      // 初回クリアの結晶×10はサーバー（finish_secure_shooting_run）側で付与。
      fixedItemDrops: Object.freeze([Object.freeze({ id: 'level_exp_large', count: 2 })]),
      firstClearGems: 5,
      playable: true,
    }),

    // build1643: 律動 超級。最上級と同じ譜面・速さ（3PHASE）で、音符（♪）が出ない。
    [SHOOTING_STAGE_ID.RHYTHM_ULTRA]: Object.freeze({
      id: SHOOTING_STAGE_ID.RHYTHM_ULTRA,
      chapter: 0,
      stageNo: 32,
      eventId: 'rhythm_test',
      eventTitle: '律動',
      difficultyLabel: '超級',
      rhythm: Object.freeze({ difficulty: 'ultra', travelMs: 900, holeBonus: 0, notes: false }),
      type: 'boss',
      background: 'images/battle_bg_01.webp',
      introImage: 'images/rhythm_masquerade_battle_start.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.RHYTHM_GATE]),
      bossElement: 'dark',
      enemyElement: 'dark',
      mission: Object.freeze({
        type: SHOOTING_MISSION_TYPE.BOSS_CLEAR,
        text: '弾幕の穴をたどって進め',
      }),
      // 通常クリア報酬は「強化素材・金」×2。初回クリアの結晶×15はサーバー（finish_secure_shooting_run）側で付与。
      fixedItemDrops: Object.freeze([Object.freeze({ id: 'level_exp_large', count: 2 })]),
      firstClearGems: 15,
      playable: true,
    }),


    // ============================================================
    // build1659: SPECIAL STAGE「樹獣の森」（木属性・ボス戦）
    //  ボス「樹獣の女王」（仮名）は蕾の姿で始まり、動いている間に成長して「開花」する。
    //  配下の「樹獣」（突進）・「芽吹き」（歩き回る）も動いている間に成長し、
    //  「大樹獣」（より速く・頻繁な突進）／「大樹」（その場に根を張り9方向弾幕）になる。
    //  捕縛・スタンなどで止めている間は、ボスも配下も成長しない。
    // ============================================================
    [SHOOTING_STAGE_ID.VERDANT_ADVANCED]: Object.freeze({
      id: SHOOTING_STAGE_ID.VERDANT_ADVANCED,
      chapter: 0,
      stageNo: 40,
      eventId: 'verdant',
      eventTitle: '樹獣の森',
      difficultyLabel: '上級',
      name: '樹獣の森',
      type: 'boss',
      background: 'images/battle_bg_02.webp',
      introImage: 'images/verdant_battle_start.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.VERDANT_QUEEN]),
      bossElement: 'wood',
      enemyElement: 'wood',
      bossGaugeHps: Object.freeze([12000, 14000]),
      // growthMs：配下（樹獣・芽吹き）の成長時間／bossGrowthMs：女王が開花するまでの移動時間
      // build1663: 移動による成長は遅く、「成長の実」が主な成長源。実を壊せばカミラ無しでも成長を抑えられる。
      verdant: Object.freeze({ growthMs: 12000, bossGrowthMs: 45000, enemyBulletCap: 130, // build1666: 通常弾の上限
        seeds: Object.freeze({ firstAtMs: 5000, intervalMs: 7000, max: 2, hp: 900, ripenMs: 7000,
          queenBoost: 0.22, addBoost: 0.5, addReach: 46 }) }),
      bossAdds: Object.freeze({
        enemyIds: Object.freeze([SHOOTING_ENEMY_ID.VERDANT_SPROUT, SHOOTING_ENEMY_ID.VERDANT_BEAST]),
        totalEnemies: 0, maxActive: 2, startDelayMs: 3000, spawnIntervalMs: 6500, grownSpawnIntervalMs: 4500,
      }),
      mission: Object.freeze({ type: SHOOTING_MISSION_TYPE.BOSS_CLEAR, text: '樹獣の女王を開花させずに倒せ' }),
      fixedItemDrops: Object.freeze([Object.freeze({ id: 'level_exp_large', count: 2 })]),
      firstClearGems: 5,
      playable: true,
    }),
    [SHOOTING_STAGE_ID.VERDANT_SUPER]: Object.freeze({
      id: SHOOTING_STAGE_ID.VERDANT_SUPER,
      chapter: 0,
      stageNo: 41,
      eventId: 'verdant',
      eventTitle: '樹獣の森',
      difficultyLabel: '最上級',
      name: '樹獣の森',
      type: 'boss',
      background: 'images/battle_bg_02.webp',
      introImage: 'images/verdant_battle_start.webp',
      enemyIds: Object.freeze([SHOOTING_ENEMY_ID.VERDANT_QUEEN]),
      bossElement: 'wood',
      enemyElement: 'wood',
      bossGaugeHps: Object.freeze([14000, 16000, 18000]),
      verdant: Object.freeze({ growthMs: 9000, bossGrowthMs: 34000, enemyBulletCap: 110, // build1666: 通常弾の上限（最上級）
        seeds: Object.freeze({ firstAtMs: 4000, intervalMs: 5500, max: 3, hp: 1300, ripenMs: 6000,
          queenBoost: 0.25, addBoost: 0.5, addReach: 46 }) }),
      bossAdds: Object.freeze({
        enemyIds: Object.freeze([SHOOTING_ENEMY_ID.VERDANT_SPROUT, SHOOTING_ENEMY_ID.VERDANT_BEAST]),
        totalEnemies: 0, maxActive: 3, startDelayMs: 2500, spawnIntervalMs: 5200, grownSpawnIntervalMs: 3500,
      }),
      mission: Object.freeze({ type: SHOOTING_MISSION_TYPE.BOSS_CLEAR, text: '樹獣の女王を開花させずに倒せ' }),
      fixedItemDrops: Object.freeze([Object.freeze({ id: 'level_exp_large', count: 2 })]),
      firstClearGems: 10,
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
      bossTotalHp: 100000,
      bossGaugeHp: 100000,
      bossGauges: 1,
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
      bossTotalHp: 100000,
      bossGaugeHp: 100000,
      bossGauges: 1,
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
    // DAILY RAID - SIGMA-IX
    // 共有HP 100,000 / 最大4人 / 1日1回。
    // 実際の残HPはSupabaseのraidContextからshooting_core側で上書きする。
    // ============================================================
    [SHOOTING_STAGE_ID.RAID_TEST]: Object.freeze({
      id: SHOOTING_STAGE_ID.RAID_TEST,
      chapter: 0,
      stageNo: 1,
      eventId: 'raid',
      eventTitle: 'テスト',
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
        text: '竜型レムナント（亜種）を撃破',
      }),
      guaranteedRewards: Object.freeze([
        Object.freeze({
          type: 'material',
          id: 'overseer_blk_core',
          name: '竜型レムナント亜種の心核',
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
    // build1643: 位相回遊は階層番号から動的に生成（SHOOTING_STAGES一覧には登録しない）。
    const phaseOdysseyMatch = id.match(/^shooting_phase_odyssey_(\d{1,4})(?:_([a-z]+))?$/);
    if (phaseOdysseyMatch) return makePhaseOdysseyStage(Number(phaseOdysseyMatch[1]), phaseOdysseyMatch[2] || '');
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
    getPhaseOdysseyScaling,
    PHASE_ODYSSEY_BOSSES,
  });
})();
