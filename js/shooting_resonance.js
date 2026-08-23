// Zeraphia Shooting Resonance
// シューティング専用共鳴マスター。
// Strategy / Battle32 / LINK / moveType / combo / range には一切依存しない。
(function () {
  'use strict';

  const MAX_LEVEL = 4;

  // 強化素材はゲーム共通の育成資産として継続利用する。
  const MATERIAL_STORAGE_KEY = 'zeraphia_evolution_materials_v1';

  const MATERIAL_MASTER = Object.freeze({
    eri_origin_wing: Object.freeze({
      id: 'eri_origin_wing',
      name: '原初の翼環',
      shortName: '原初の翼環',
      img: 'images/item_wing.webp',
      exclusiveCharaId: 1,
      desc: 'エリの魂と世界の残響を結び直す、特別な強化素材。'
    }),
    kyoumei_stone: Object.freeze({
      id: 'kyoumei_stone',
      name: '共鳴石',
      shortName: '共鳴石',
      img: 'images/item_kyoumeistone.webp',
      desc: 'プリモアの魂を同調させる神秘的な石。'
    }),
    soul_vessel_logos: Object.freeze({
      id: 'soul_vessel_logos',
      name: '魂の器（LOGOS）',
      shortName: 'LOGOSの器',
      img: 'images/item_logos.webp',
      element: 'logos',
      desc: 'LOGOSの魂を受け止める神具。'
    }),
    soul_vessel_chaos: Object.freeze({
      id: 'soul_vessel_chaos',
      name: '魂の器（CHAOS）',
      shortName: 'CHAOSの器',
      img: 'images/item_chaos.webp',
      element: 'chaos',
      desc: 'CHAOSの魂を受け止める神具。'
    }),
    soul_vessel_mystis: Object.freeze({
      id: 'soul_vessel_mystis',
      name: '魂の器（MYSTIS）',
      shortName: 'MYSTISの器',
      img: 'images/item_mystis.webp',
      element: 'mystis',
      desc: 'MYSTISの魂を受け止める神具。'
    }),
    seihai: Object.freeze({
      id: 'seihai',
      name: '聖なる盃',
      shortName: '聖なる盃',
      img: 'images/item_seihai.webp',
      desc: '神聖な力を湛えた進化用素材。'
    }),
    overseer_blk_core: Object.freeze({
      id: 'overseer_blk_core',
      name: 'オーバーシア亜種の心核',
      shortName: '亜種の心核',
      img: 'images/item_overseer_blk_core.webp',
      desc: 'オーバーシア亜種から回収された異質な心核。今後の特殊強化に使用する素材。'
    })
  });

  // effect type
  // statRate:          hp / atk の基礎値へ加算倍率
  // profileMultiply:   SHOOTING_CHARACTERS の数値フィールドへ乗算
  // profileSet:        数値/設定を指定値へ変更
  // profileAdd:        数値フィールドへ加算
  //
  // Lv1〜現在Lvまでを順番に累積適用する。
  const BONUS_MASTER = Object.freeze({
    1: Object.freeze({
      1: bonus('基礎共鳴', 'HP・ATK +5%', '基礎HPとATKが5%上昇する。', [
        { type:'statRate', hp:0.05, atk:0.05 }
      ]),
      2: bonus('閃光増幅', '通常射撃ダメージ +8%', '通常射撃の1Hitダメージを8%強化する。', [
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.08 }
      ]),
      3: bonus('共鳴加速', 'ULTゲージ獲得量 +15%', '命中時のULTゲージ獲得量を15%増加する。', [
        { type:'profileMultiply', field:'ultGainPerHit', multiplier:1.15 }
      ]),
      4: bonus('三重閃光', '通常射撃 2発 → 3発', '通常射撃の同時発射数が3発になる。', [
        { type:'profileAdd', field:'shotCount', add:1 }
      ])
    }),

    2: Object.freeze({
      1: bonus('基礎共鳴', 'HP・ATK +4%', '基礎HPとATKが4%上昇する。', [
        { type:'statRate', hp:0.04, atk:0.04 }
      ]),
      2: bonus('夢弾深化', '通常射撃ダメージ +10%', '通常射撃の1Hitダメージを10%強化する。', [
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.10 }
      ]),
      3: bonus('夢域同調', 'ULTゲージ獲得量 +15%', '命中時のULTゲージ獲得量を15%増加する。', [
        { type:'profileMultiply', field:'ultGainPerHit', multiplier:1.15 }
      ]),
      4: bonus('深層睡眠', 'ULTスタン 5秒 → 6.5秒', '「どりいむたいむ」のスタン時間を6.5秒へ延長する。', [
        { type:'profileSet', field:'ultStunMs', value:6500 }
      ])
    }),

    3: Object.freeze({
      1: bonus('基礎共鳴', 'HP・ATK +4%', '基礎HPとATKが4%上昇する。', [
        { type:'statRate', hp:0.04, atk:0.04 }
      ]),
      2: bonus('星光増幅', '通常射撃ダメージ +10%', '通常射撃の1Hitダメージを10%強化する。', [
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.10 }
      ]),
      3: bonus('星環同調', 'ULTゲージ獲得量 +15%', '命中時のULTゲージ獲得量を15%増加する。', [
        { type:'profileMultiply', field:'ultGainPerHit', multiplier:1.15 }
      ]),
      4: bonus('星環深化', 'ULTダメージ ATK×3.0 → ×4.0', '4秒の時計演出・全回復・敵弾消去はそのまま、ULTダメージだけをATK×4.0へ強化する。', [
        { type:'profileSet', field:'ultDamageAtkMultiplier', value:4.0 }
      ])
    }),

    4: Object.freeze({
      1: bonus('基礎共鳴', 'HP・ATK +4%', '基礎HPとATKが4%上昇する。', [
        { type:'statRate', hp:0.04, atk:0.04 }
      ]),
      2: bonus('環流増幅', '通常射撃ダメージ +10%', '通常射撃の1Hitダメージを10%強化する。', [
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.10 }
      ]),
      3: bonus('循環加速', 'ULTゲージ獲得量 +15%', '命中時のULTゲージ獲得量を15%増加する。', [
        { type:'profileMultiply', field:'ultGainPerHit', multiplier:1.15 }
      ]),
      4: bonus('永環', 'オーラ持続 5秒 → 7秒', 'ULT「環流」の攻撃オーラ持続時間を7秒へ延長する。', [
        { type:'profileSet', field:'auraDurationMs', value:7000 }
      ])
    }),

    5: Object.freeze({
      1: bonus('基礎共鳴', 'HP・ATK +4%', '基礎HPとATKが4%上昇する。', [
        { type:'statRate', hp:0.04, atk:0.04 }
      ]),
      2: bonus('遊戯増幅', '通常射撃ダメージ +10%', '通常射撃の1Hitダメージを10%強化する。', [
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.10 }
      ]),
      3: bonus('空想同調', 'ULTゲージ獲得量 +15%', '命中時のULTゲージ獲得量を15%増加する。', [
        { type:'profileMultiply', field:'ultGainPerHit', multiplier:1.15 }
      ]),
      4: bonus('終わらない遊戯', 'デコイHP +40%・持続8秒', 'デコイHPを40%増加し、持続時間を6秒から8秒へ延長する。', [
        { type:'profileMultiply', field:'decoyHp', multiplier:1.40 },
        { type:'profileSet', field:'decoyDurationMs', value:8000 }
      ])
    }),

    6: Object.freeze({
      1: bonus('基礎共鳴', 'HP・ATK +4%', '基礎HPとATKが4%上昇する。', [
        { type:'statRate', hp:0.04, atk:0.04 }
      ]),
      2: bonus('猛炎増幅', 'レーザーダメージ +10%', '通常レーザーのダメージを10%強化する。', [
        { type:'profileMultiply', field:'laserDamageAtkRate', multiplier:1.10 }
      ]),
      3: bonus('火勢同調', 'ULTゲージ獲得量 +15%', '命中時のULTゲージ獲得量を15%増加する。', [
        { type:'profileMultiply', field:'ultGainPerHit', multiplier:1.15 }
      ]),
      4: bonus('灼熱連鎖', '燃焼ダメージ +25%・持続6秒', '燃焼1Tickのダメージを25%強化し、持続時間を5秒から6秒へ延長する。', [
        { type:'profileMultiply', field:'burnDamageAtkRate', multiplier:1.25 },
        { type:'profileSet', field:'burnDurationMs', value:6000 }
      ])
    }),

    7: Object.freeze({
      1: bonus('基礎共鳴', 'HP・ATK +4%', '基礎HPとATKが4%上昇する。', [
        { type:'statRate', hp:0.04, atk:0.04 }
      ]),
      2: bonus('種子増幅', '種弾ダメージ +10%', '通常の種弾ダメージを10%強化する。', [
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.10 }
      ]),
      3: bonus('花園同調', 'ULTゲージ獲得量 +15%', '命中時のULTゲージ獲得量を15%増加する。', [
        { type:'profileMultiply', field:'ultGainPerHit', multiplier:1.15 }
      ]),
      4: bonus('満開の心', 'ハート回復・ダメージ +25%', 'ULTのハートによる回復量と敵へのダメージを25%強化する。', [
        { type:'profileMultiply', field:'flowerHeartHealAmount', multiplier:1.25 },
        { type:'profileMultiply', field:'flowerHeartDamageAtkRate', multiplier:1.25 }
      ])
    }),

    8: genericSet('ミモザ'),
    9: genericSet('パトラ'),
    10: genericSet('フローラ'),
    11: genericSet('シグレ'),

    12: Object.freeze({
      1: bonus('疾風の共鳴', 'ATK +5%', '基礎ATKが5%上昇する。', [
        { type:'statRate', hp:0, atk:0.05 }
      ]),
      2: bonus('雷光増幅', '通常射撃ダメージ +8%', '通常射撃の1Hitダメージを8%強化する。', [
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.08 }
      ]),
      3: bonus('月光同調', 'ULTゲージ獲得量 +12%', '命中時のULTゲージ獲得量を12%増加する。', [
        { type:'profileMultiply', field:'ultGainPerHit', multiplier:1.12 }
      ]),
      4: bonus('雷光巡行・極', 'ULT中の連射性能 約15%強化', 'ULT中の射撃間隔をさらに約15%短縮する。', [
        { type:'profileMultiply', field:'moonlightFireRateMultiplier', multiplier:0.85 }
      ])
    }),

    13: genericSet('ミア'),

    14: Object.freeze({
      1: bonus('基礎共鳴', 'HP・ATK +4%', '基礎HPとATKが4%上昇する。', [
        { type:'statRate', hp:0.04, atk:0.04 }
      ]),
      2: bonus('精密増幅', '通常射撃ダメージ +10%', '通常射撃の1Hitダメージを10%強化する。', [
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.10 }
      ]),
      3: bonus('暴走同調', 'ULTゲージ獲得量 +15%', '命中時のULTゲージ獲得量を15%増加する。', [
        { type:'profileMultiply', field:'ultGainPerHit', multiplier:1.15 }
      ]),
      4: bonus('臨界射撃', '4発ごとの強化弾 ×1.65 → ×2.0', '4発ごとに放つ強化弾の威力倍率を2.0へ強化する。', [
        { type:'profileSet', field:'chargedPowerMultiplier', value:2.0 }
      ])
    }),

    15: Object.freeze({
      1: bonus('基礎共鳴', 'HP・ATK +4%', '基礎HPとATKが4%上昇する。', [
        { type:'statRate', hp:0.04, atk:0.04 }
      ]),
      2: bonus('重力増幅', '通常射撃ダメージ +10%', '通常射撃の1Hitダメージを10%強化する。', [
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.10 }
      ]),
      3: bonus('事象同調', 'ULTゲージ獲得量 +15%', '命中時のULTゲージ獲得量を15%増加する。', [
        { type:'profileMultiply', field:'ultGainPerHit', multiplier:1.15 }
      ]),
      4: bonus('事象深淵', 'ブラックホール10秒・吸引力強化', 'ブラックホール持続時間を8秒から10秒へ延長し、吸引力を20%強化する。', [
        { type:'profileSet', field:'blackHoleDurationMs', value:10000 },
        { type:'profileMultiply', field:'blackHolePullStrength', multiplier:1.20 }
      ])
    }),

    16: genericSet('ミト'),
    17: genericSet('アンジェ'),

    18: Object.freeze({
      1: bonus('狩狼の共鳴', 'HP・ATK +5%', 'ウルフの基礎HPとATKが5%上昇する。', [
        { type:'statRate', hp:0.05, atk:0.05 }
      ]),
      2: bonus('追牙増幅', '通常射撃ダメージ +10%', 'J字ホーミング射撃の1Hitダメージを10%強化する。', [
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.10 }
      ]),
      3: bonus('狩場同調', 'ULTゲージ獲得量 +15%', '命中時のULTゲージ獲得量を15%増加する。', [
        { type:'profileMultiply', field:'ultGainPerHit', multiplier:1.15 }
      ]),
      4: bonus('深月の領域', 'ATK UP 1.5倍 → 1.65倍', 'ULTで展開するATK UPフィールドの倍率を1.65倍へ強化する。', [
        { type:'profileSet', field:'ultFieldAtkMultiplier', value:1.65 }
      ])
    }),

    50: Object.freeze({
      1: bonus('艦砲同調', 'ATK +5%', 'テストちゃんの基礎ATKが5%上昇する。', [
        { type:'statRate', hp:0, atk:0.05 }
      ]),
      2: bonus('トライ・レーザー増幅', '通常射撃ダメージ +10%', '3WAY通常射撃の1Hitダメージを10%強化する。', [
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.10 }
      ]),
      3: bonus('ブラックシップ同調', 'ULTゲージ獲得量 +15%', '命中時のULTゲージ獲得量を15%増加する。', [
        { type:'profileMultiply', field:'ultGainPerHit', multiplier:1.15 }
      ]),
      4: bonus('ブラックシップ・フルバースト', 'ULT 7秒・1Tick ATK×45%', 'ULT「ブラックシップ」の照射時間を5秒から7秒へ延長し、0.25秒ごとのダメージをATK×35%からATK×45%へ強化する。追加効果は付与せず、純粋な火力特化を維持する。', [
        { type:'profileSet', field:'ultBeamDurationMs', value:7000 },
        { type:'profileSet', field:'ultBeamTickAtkMultiplier', value:0.45 }
      ])
    }),

    51: Object.freeze({
      1: bonus('六眼覚醒', 'HP・ATK +5%', '五条 悟の基礎HPとATKが5%上昇する。', [
        { type:'statRate', hp:0.05, atk:0.05 }
      ]),
      2: bonus('紫弾深化', '通常射撃ダメージ +12%', '半透明の紫5WAYショットの1Hitダメージを12%強化する。', [
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.12 }
      ]),
      3: bonus('収束する茈', 'ULT吸引力 +25%', '「虚式・茈」の吸引力を25%強化し、敵をより素早く波動中心へ引き寄せる。', [
        { type:'profileMultiply', field:'gojoPurplePullStrength', multiplier:1.25 }
      ]),
      4: bonus('虚式極致', 'ULT ATK×3.5 → ×4.5', '「虚式・茈」の吸引・停止時間はそのまま、継続ダメージ総量をATK×3.5からATK×4.5へ強化する。', [
        { type:'profileSet', field:'ultDamageAtkMultiplier', value:4.5 }
      ])
    }),

    52: Object.freeze({
      1: bonus('理想の共鳴', 'HP・ATK +5%', 'ノアの基礎HPとATKが5%上昇する。', [
        { type:'statRate', hp:0.05, atk:0.05 }
      ]),
      2: bonus('灰白星路', 'レーザー・波動弾 +10%', '通常射撃の中心レーザーと2発の波動ホーミング弾をそれぞれ10%強化する。', [
        { type:'profileMultiply', field:'laserDamageAtkRate', multiplier:1.10 },
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.10 }
      ]),
      3: bonus('停止世界の残光', '落雷ダメージ +15%', '16発の落雷それぞれのダメージを15%強化する。', [
        { type:'profileMultiply', field:'noahUltHitAtkMultiplier', multiplier:1.15 }
      ]),
      4: bonus('完成された理想郷', 'スタン 1.5秒 → 2.2秒', '落雷を受けた敵に発生するスタン時間を2.2秒へ延長する。', [
        { type:'profileSet', field:'noahUltParalyzeMs', value:2200 }
      ])
    })
  });

  function bonus(title, summary, detail, effects) {
    return Object.freeze({
      title: String(title || ''),
      summary: String(summary || ''),
      detail: String(detail || ''),
      effects: Object.freeze((effects || []).map(effect => Object.freeze({ ...effect })))
    });
  }

  function genericSet(name) {
    return Object.freeze({
      1: bonus('基礎共鳴', 'HP・ATK +4%', `${name}の基礎HPとATKが4%上昇する。`, [
        { type:'statRate', hp:0.04, atk:0.04 }
      ]),
      2: bonus('射撃増幅', '通常射撃ダメージ +10%', '通常射撃の1Hitダメージを10%強化する。', [
        { type:'profileMultiply', field:'shotPowerRate', multiplier:1.10 }
      ]),
      3: bonus('射撃加速', '連射速度 +8%', '通常射撃の間隔を8%短縮する。', [
        { type:'profileMultiply', field:'fireRate', multiplier:0.92 }
      ]),
      4: bonus('深層同調', 'ULTゲージ獲得量 +20%', '命中時のULTゲージ獲得量を20%増加する。', [
        { type:'profileMultiply', field:'ultGainPerHit', multiplier:1.20 }
      ])
    });
  }

  function getBonusMaster(characterId) {
    return BONUS_MASTER[Number(characterId)] || null;
  }

  function getBonus(characterId, level) {
    const master = getBonusMaster(characterId);
    return master ? master[Math.max(1, Math.min(MAX_LEVEL, Number(level || 1)))] || null : null;
  }

  function getUnlockedBonuses(characterId, level) {
    const master = getBonusMaster(characterId);
    if (!master) return [];
    const current = Math.max(0, Math.min(MAX_LEVEL, Number(level || 0)));
    const result = [];
    for (let lv = 1; lv <= current; lv++) {
      if (master[lv]) result.push(master[lv]);
    }
    return result;
  }

  function applyEffect(profile, effect) {
    if (!profile || !effect) return;

    switch (effect.type) {
      case 'statRate': {
        if (Number.isFinite(Number(profile.hp))) {
          profile.hp = Math.floor(Number(profile.hp) * (1 + Number(effect.hp || 0)));
        }
        if (Number.isFinite(Number(profile.atk))) {
          profile.atk = Math.floor(Number(profile.atk) * (1 + Number(effect.atk || 0)));
        }
        break;
      }

      case 'profileMultiply': {
        const field = String(effect.field || '');
        if (!field || !Number.isFinite(Number(profile[field]))) break;
        profile[field] = Number(profile[field]) * Number(effect.multiplier || 1);
        break;
      }

      case 'profileSet': {
        const field = String(effect.field || '');
        if (!field) break;
        profile[field] = effect.value;
        break;
      }

      case 'profileAdd': {
        const field = String(effect.field || '');
        if (!field || !Number.isFinite(Number(profile[field]))) break;
        profile[field] = Number(profile[field]) + Number(effect.add || 0);
        break;
      }
    }
  }

  function applyToProfile(baseProfile, level) {
    if (!baseProfile) return null;

    // 現状のshooting profileはprimitive中心なので浅いcloneで独立できる。
    // uiScaleだけは明示cloneして共有参照を避ける。
    const profile = {
      ...baseProfile,
      uiScale: baseProfile.uiScale ? { ...baseProfile.uiScale } : {}
    };

    const bonuses = getUnlockedBonuses(profile.id, level);
    bonuses.forEach(b => b.effects.forEach(effect => applyEffect(profile, effect)));

    profile.resonanceLevel = Math.max(0, Math.min(MAX_LEVEL, Number(level || 0)));
    return profile;
  }

  window.ShootingResonance = Object.freeze({
    MAX_LEVEL,
    MATERIAL_STORAGE_KEY,
    MATERIAL_MASTER,
    BONUS_MASTER,
    getBonusMaster,
    getBonus,
    getUnlockedBonuses,
    applyToProfile
  });
})();
