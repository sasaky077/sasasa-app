// Zeraphia Unified Character Master + Shooting combat profiles / ownership
// build497:
// - キャラ共通情報の正本はこのファイル。
// - 旧 characters.js は廃止。
// - HOME / ガチャ / キャラ一覧 / 育成 / Shooting は同じマスターを参照する。
// - 旧Strategy専用性能は削除済み。
(function () {
  'use strict';

  const CHARACTER_ID = Object.freeze({
    ERI: 1,
    NEM: 26,
    SUI: 31,
    ARNO: 20,
    CLARINE: 27,
    IGNIS: 6,
    ROSE: 9,
    MIMOSA: 28,
    PATRA: 16,
    FLORA: 15,
    SHIGURE: 13,
    HAYATE: 4,
    MIA: 14,
    AYANE: 11,
    ELTENA: 29,
    MITO: 7,
    ANGE: 21,
    WOLF: 2,
    TESTCHAN: 50,
    SHURI: 8,
    SERA: 23,
    RYUNE: 25,
    KAINA: 17,
    REISIA: 30,
    NOEL: 24,
    IONA: 22,
    ELSIA: 12,
    FIA: 5,
    RAGNA: 19,
    RIZE: 3,
    SHION: 18,
    ORION: 10,
    NOAH: 52,
    IVERNA: 32,
    REI: 33,
    GRESHA: 34,
    GISELLE: 35,
    NINA: 36,
    TOYFEL: 37,
  });

  // ============================================================
  // シューティング専用レアリティ格差
  // ============================================================
  // rarity も共通情報の正本としてここで管理する。
  // Strategy characters.js 側へは実行時にこの値が反映されるため、二重更新は不要。
  // v306 Gacha SR:
  //   限定: イヴェルナ / スゥ / ロゼ / シュリ / ハヤテ
  //   恒常: ウルフ / レイ / ミモザ / アヤネ / ミト
  //   ネム / クラリネはRへ移行。エリ・SIGMA-IX・ノアは別枠SR。
  const SHOOTING_RARITY = Object.freeze({
    1: 'sr',  // エリ
    26: 'r',   // ネム
    31: 'sr',  // スゥ
    20: 'r',  // アルノ
    27: 'r',   // クラリネ
    6: 'r',  // イグニス
    9: 'sr',  // ロゼ
    28: 'sr',  // ミモザ
    16: 'r',  // パトラ
    15: 'r',  // アリス
    13: 'r',  // シグレ
    4: 'sr',  // ハヤテ
    14: 'r',  // ミア
    11: 'sr',  // アヤネ
    29: 'r',  // エルテナ
    7: 'sr',  // ミト
    21: 'r',  // アンジェ
    2: 'sr',  // ウルフ
    8: 'sr',  // シュリ
    23: 'r',  // セレナ
    25: 'r',  // リュネ
    17: 'r',  // アイナ
    30: 'r',  // リズ
    24: 'r',  // ノエル
    22: 'r',  // ベロニカ
    12: 'r',  // シイナ
    5: 'r',  // ジグ
    19: 'r',  // ラグナ
    3: 'r',  // アウラ
    18: 'r',  // シオン
    10: 'r',  // オリオン
    50: 'sr',  // SIGMA-IX
    52: 'sr',  // ノア
    32: 'sr',  // イヴェルナ
    33: 'sr',  // レイ
    34: 'r',   // グレシャ
    35: 'r',   // ジゼル
    36: 'sr',  // ニーナ
    37: 'r',   // トイフェル
  });

  // 現行互換：R はSRに対して基本性能(HP/ATK)を20%落とす。育成/凸の新倍率は別フェーズで統合予定。
  // 通常射撃威力・ULTゲージ効率などはATK経由でそのまま連動するため、
  // ここを直せば連射数やshotPowerRateなど武器固有チューニングを個別に触らずに
  // レアリティ格差だけを一括調整できる。
  const RARITY_STAT_MULTIPLIER = Object.freeze({
    sr: 1.0,
    r: 0.8,
  });

  function getShootingRarity(id) {
    return SHOOTING_RARITY[Number(id)] || 'r';
  }

  function getShootingRarityMultiplier(id) {
    return RARITY_STAT_MULTIPLIER[getShootingRarity(id)] ?? 1.0;
  }

  // ============================================================
  // キャラクター共通マスター（正本）
  // ============================================================
  // name / element / base HP / base ATK / 共通画像はここを唯一の正本とする。
  // characters.js はこの値を参照するため、ここを変更すればStrategy側にも反映される。
  // uiScale はShooting画面専用の表示調整値。
  // build478: battleBack は全キャラ 1.0 固定。
  // ============================================================
  // Zeraphia 統合キャラクターマスター（唯一の正本）
  // ============================================================
  // build476:
  // HOME / ガチャ / キャラ一覧 / 育成 / Shooting をここへ完全一本化。
  // 旧 characters.js は廃止。
  // 重複情報はShooting側を正とする。
  // 旧Strategy専用情報は保持しない。
  // ============================================================
  const SHOOTING_CHARACTER_MASTER = Object.freeze({
  "1": {
    "id": 1,
    "name": "エリ",
    "element": "neutral",
    "hp": 670,
    "atk": 235,
    "image": "images/chara_01_battle_back.webp",
    "panelImage": "images/chara_01_panel.webp",
    "cutinImage": "images/chara_01_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_01.webp",
    "homeImage": "images/chara_01_cut.webp",
    "upImage": "images/chara_01_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -40,
    "hidden": false
  },
  "2": {
    "id": 2,
    "name": "ウルフ",
    "element": "fire",
    "hp": 610,
    "atk": 300,
    "image": "images/chara_02_battle_back.webp",
    "panelImage": "images/chara_02_panel.webp",
    "cutinImage": "images/chara_02_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_02.webp",
    "homeImage": "images/chara_02_cut.webp",
    "upImage": "images/chara_02_up.webp",
    "homeScale": 0.85,
    "homeOffsetX": 0,
    "homeOffsetY": -10,
    "hidden": false
  },
  "3": {
    "id": 3,
    "name": "アウラ",
    "element": "wood",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_03_battle_back.webp",
    "panelImage": "images/chara_03_panel.webp",
    "cutinImage": "images/chara_03_cutin.webp",
    "uiScale": {
      "panel": 0.72,
      "battleBack": 1.2,
      "battleUp": 0.72
    },
    "portraitImage": "images/chara_03.webp",
    "homeImage": "images/chara_03_cut.webp",
    "upImage": "images/chara_03_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -20,
    "hidden": false
  },
  "4": {
    "id": 4,
    "name": "ハヤテ",
    "element": "light",
    "hp": 580,
    "atk": 305,
    "image": "images/chara_04_battle_back.webp",
    "panelImage": "images/chara_04_panel.webp",
    "cutinImage": "images/chara_04_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_04.webp",
    "homeImage": "images/chara_04_cut.webp",
    "upImage": "images/chara_04_up.webp",
    "homeScale": 0.85,
    "homeOffsetX": 0,
    "homeOffsetY": -70,
    "hidden": false
  },
  "5": {
    "id": 5,
    "name": "ジグ",
    "element": "wood",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_05_battle_back.webp",
    "panelImage": "images/chara_05_panel.webp",
    "cutinImage": "images/chara_05_cutin.webp",
    "uiScale": {
      "panel": 0.72,
      "battleBack": 1.2,
      "battleUp": 0.72
    },
    "portraitImage": "images/chara_05.webp",
    "homeImage": "images/chara_05_cut.webp",
    "upImage": "images/chara_05_up.webp",
    "homeScale": 0.81,
    "homeOffsetX": 0,
    "homeOffsetY": -20,
    "hidden": false
  },
  "6": {
    "id": 6,
    "name": "イグニス",
    "element": "fire",
    "hp": 600,
    "atk": 285,
    "image": "images/chara_06_battle_back.webp",
    "panelImage": "images/chara_06_panel.webp",
    "cutinImage": "images/chara_06_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_06.webp",
    "homeImage": "images/chara_06_cut.webp",
    "upImage": "images/chara_06_up.webp",
    "homeScale": 0.81,
    "homeOffsetX": 0,
    "homeOffsetY": -34,
    "hidden": false
  },
  "7": {
    "id": 7,
    "name": "ミト",
    "element": "light",
    "hp": 700,
    "atk": 245,
    "image": "images/chara_07_battle_back.webp",
    "panelImage": "images/chara_07_panel.webp",
    "cutinImage": "images/chara_07_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_07.webp",
    "homeImage": "images/chara_07_cut.webp",
    "upImage": "images/chara_07_up.webp",
    "homeScale": 0.81,
    "homeOffsetX": 0,
    "homeOffsetY": -32,
    "hidden": false
  },
  "8": {
    "id": 8,
    "name": "マグダレーナ",
    "element": "dark",
    "hp": 680,
    "atk": 300,
    "image": "images/chara_08_battle_back.webp",
    "panelImage": "images/chara_08_panel.webp",
    "cutinImage": "images/chara_08_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_08.webp",
    "homeImage": "images/chara_08_cut.webp",
    "upImage": "images/chara_08_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -30,
    "hidden": false
  },
  "9": {
    "id": 9,
    "name": "ロゼ",
    "element": "wood",
    "hp": 680,
    "atk": 230,
    "image": "images/chara_09_battle_back.webp",
    "panelImage": "images/chara_09_panel.webp",
    "cutinImage": "images/chara_09_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_09.webp",
    "homeImage": "images/chara_09_cut.webp",
    "upImage": "images/chara_09_up.webp",
    "homeScale": 0.79,
    "homeOffsetX": 0,
    "homeOffsetY": -40,
    "hidden": false
  },
  "10": {
    "id": 10,
    "name": "オリオン",
    "element": "light",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_10_battle_back.webp",
    "panelImage": "images/chara_10_panel.webp",
    "cutinImage": "images/chara_10_cutin.webp",
    "uiScale": {
      "panel": 0.72,
      "battleBack": 1.2,
      "battleUp": 0.72
    },
    "portraitImage": "images/chara_10.webp",
    "homeImage": "images/chara_10_cut.webp",
    "upImage": "images/chara_10_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -20,
    "hidden": false
  },
  "11": {
    "id": 11,
    "name": "アヤネ",
    "element": "dark",
    "hp": 740,
    "atk": 225,
    "image": "images/chara_11_battle_back.webp",
    "panelImage": "images/chara_11_panel.webp",
    "cutinImage": "images/chara_11_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 0.7
    },
    "portraitImage": "images/chara_11.webp",
    "homeImage": "images/chara_11_cut.webp",
    "upImage": "images/chara_11_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -50,
    "hidden": false
  },
  "12": {
    "id": 12,
    "name": "シイナ",
    "element": "light",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_12_battle_back.webp",
    "panelImage": "images/chara_12_panel.webp",
    "cutinImage": "images/chara_12_cutin.webp",
    "uiScale": {
      "panel": 0.72,
      "battleBack": 1.2,
      "battleUp": 0.72
    },
    "portraitImage": "images/chara_12.webp",
    "homeImage": "images/chara_12_cut.webp",
    "upImage": "images/chara_12_up.webp",
    "homeScale": 0.85,
    "homeOffsetX": 0,
    "homeOffsetY": -30,
    "hidden": false
  },
  "13": {
    "id": 13,
    "name": "シグレ",
    "element": "dark",
    "hp": 500,
    "atk": 200,
    "image": "images/chara_13_battle_back.webp",
    "panelImage": "images/chara_13_panel.webp",
    "cutinImage": "images/chara_13_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_13.webp",
    "homeImage": "images/chara_13_cut.webp",
    "upImage": "images/chara_13_up.webp",
    "homeScale": 0.88,
    "homeOffsetX": 0,
    "homeOffsetY": 5,
    "hidden": false
  },
  "14": {
    "id": 14,
    "name": "ミア",
    "element": "aqua",
    "hp": 540,
    "atk": 295,
    "image": "images/chara_14_battle_back.webp",
    "panelImage": "images/chara_14_panel.webp",
    "cutinImage": "images/chara_14_cutin.webp",
    "uiScale": {
      "panel": 0.6,
      "battleBack": 1.2,
      "battleUp": 0.75
    },
    "portraitImage": "images/chara_14.webp",
    "homeImage": "images/chara_14_cut.webp",
    "upImage": "images/chara_14_up.webp",
    "homeScale": 0.81,
    "homeOffsetX": 0,
    "homeOffsetY": -40,
    "hidden": false
  },
  "15": {
    "id": 15,
    "name": "アリス",
    "element": "light",
    "hp": 650,
    "atk": 210,
    "image": "images/chara_15_battle_back.webp",
    "panelImage": "images/chara_15_panel.webp",
    "cutinImage": "images/chara_15_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_15.webp",
    "homeImage": "images/chara_15_cut.webp",
    "upImage": "images/chara_15_up.webp",
    "homeScale": 0.78,
    "homeOffsetX": 0,
    "homeOffsetY": -30,
    "hidden": false
  },
  "16": {
    "id": 16,
    "name": "パトラ",
    "element": "dark",
    "hp": 590,
    "atk": 275,
    "image": "images/chara_16_battle_back.webp",
    "panelImage": "images/chara_16_panel.webp",
    "cutinImage": "images/chara_16_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_16.webp",
    "homeImage": "images/chara_16_cut.webp",
    "upImage": "images/chara_16_up.webp",
    "homeScale": 0.91,
    "homeOffsetX": 0,
    "homeOffsetY": 10,
    "hidden": false
  },
  "17": {
    "id": 17,
    "name": "アイナ",
    "element": "fire",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_17_battle_back.webp",
    "panelImage": "images/chara_17_panel.webp",
    "cutinImage": "images/chara_17_cutin.webp",
    "uiScale": {
      "panel": 0.72,
      "battleBack": 1.2,
      "battleUp": 0.72
    },
    "portraitImage": "images/chara_17.webp",
    "homeImage": "images/chara_17_cut.webp",
    "upImage": "images/chara_17_up.webp",
    "homeScale": 0.81,
    "homeOffsetX": 0,
    "homeOffsetY": -20,
    "hidden": false
  },
  "18": {
    "id": 18,
    "name": "シオン",
    "element": "dark",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_18_battle_back.webp",
    "panelImage": "images/chara_18_panel.webp",
    "cutinImage": "images/chara_18_cutin.webp",
    "uiScale": {
      "panel": 0.72,
      "battleBack": 1.2,
      "battleUp": 0.72
    },
    "portraitImage": "images/chara_18.webp",
    "homeImage": "images/chara_18_cut.webp",
    "upImage": "images/chara_18_up.webp",
    "homeScale": 0.79,
    "homeOffsetX": 0,
    "homeOffsetY": -20,
    "hidden": false
  },
  "19": {
    "id": 19,
    "name": "ラグナ",
    "element": "fire",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_19_battle_back.webp",
    "panelImage": "images/chara_19_panel.webp",
    "cutinImage": "images/chara_19_cutin.webp",
    "uiScale": {
      "panel": 0.72,
      "battleBack": 1.2,
      "battleUp": 0.72
    },
    "portraitImage": "images/chara_19.webp",
    "homeImage": "images/chara_19_cut.webp",
    "upImage": "images/chara_19_up.webp",
    "homeScale": 0.80,
    "homeOffsetX": 0,
    "homeOffsetY": -20,
    "hidden": false
  },
  "20": {
    "id": 20,
    "name": "アルノ",
    "element": "fire",
    "hp": 500,
    "atk": 300,
    "image": "images/chara_20_battle_back.webp",
    "panelImage": "images/chara_20_panel.webp",
    "cutinImage": "images/chara_20_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_20.webp",
    "homeImage": "images/chara_20_cut.webp",
    "upImage": "images/chara_20_up.webp",
    "homeScale": 0.96,
    "homeOffsetX": 0,
    "homeOffsetY": -30,
    "hidden": false
  },
  "21": {
    "id": 21,
    "name": "アンジェ",
    "element": "light",
    "hp": 720,
    "atk": 190,
    "image": "images/chara_21_battle_back.webp",
    "panelImage": "images/chara_21_panel.webp",
    "cutinImage": "images/chara_21_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 0.8
    },
    "portraitImage": "images/chara_21.webp",
    "homeImage": "images/chara_21_cut.webp",
    "upImage": "images/chara_21_up.webp",
    "homeScale": 0.91,
    "homeOffsetX": 0,
    "homeOffsetY": 15,
    "hidden": false
  },
  "22": {
    "id": 22,
    "name": "ベロニカ",
    "element": "aqua",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_22_battle_back.webp",
    "panelImage": "images/chara_22_panel.webp",
    "cutinImage": "images/chara_22_cutin.webp",
    "uiScale": {
      "panel": 0.72,
      "battleBack": 1.2,
      "battleUp": 0.72
    },
    "portraitImage": "images/chara_22.webp",
    "homeImage": "images/chara_22_cut.webp",
    "upImage": "images/chara_22_up.webp",
    "homeScale": 0.79,
    "homeOffsetX": 0,
    "homeOffsetY": -20,
    "hidden": false
  },
  "23": {
    "id": 23,
    "name": "セレナ",
    "element": "wood",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_23_battle_back.webp",
    "panelImage": "images/chara_23_panel.webp",
    "cutinImage": "images/chara_23_cutin.webp",
    "uiScale": {
      "panel": 0.72,
      "battleBack": 1.2,
      "battleUp": 0.72
    },
    "portraitImage": "images/chara_23.webp",
    "homeImage": "images/chara_23_cut.webp",
    "upImage": "images/chara_23_up.webp",
    "homeScale": 0.80,
    "homeOffsetX": 0,
    "homeOffsetY": -20,
    "hidden": false
  },
  "24": {
    "id": 24,
    "name": "ノエル",
    "element": "light",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_24_battle_back.webp",
    "panelImage": "images/chara_24_panel.webp",
    "cutinImage": "images/chara_24_cutin.webp",
    "uiScale": {
      "panel": 0.72,
      "battleBack": 1.2,
      "battleUp": 0.72
    },
    "portraitImage": "images/chara_24.webp",
    "homeImage": "images/chara_24_cut.webp",
    "upImage": "images/chara_24_up.webp",
    "homeScale": 0.81,
    "homeOffsetX": 0,
    "homeOffsetY": -20,
    "hidden": false
  },
  "25": {
    "id": 25,
    "name": "リュネ",
    "element": "aqua",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_25_battle_back.webp",
    "panelImage": "images/chara_25_panel.webp",
    "cutinImage": "images/chara_25_cutin.webp",
    "uiScale": {
      "panel": 0.72,
      "battleBack": 1.2,
      "battleUp": 0.72
    },
    "portraitImage": "images/chara_25.webp",
    "homeImage": "images/chara_25_cut.webp",
    "upImage": "images/chara_25_up.webp",
    "homeScale": 0.80,
    "homeOffsetX": 0,
    "homeOffsetY": -12,
    "hidden": false
  },
  "26": {
    "id": 26,
    "name": "ネム",
    "element": "light",
    "hp": 560,
    "atk": 270,
    "image": "images/chara_26_battle_back.webp",
    "panelImage": "images/chara_26_panel.webp",
    "cutinImage": "images/chara_26_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_26.webp",
    "homeImage": "images/chara_26_cut.webp",
    "upImage": "images/chara_26_up.webp",
    "homeScale": 0.90,
    "homeOffsetX": 0,
    "homeOffsetY": -25,
    "hidden": false
  },
  "27": {
    "id": 27,
    "name": "クラリネ",
    "element": "dark",
    "hp": 580,
    "atk": 280,
    "image": "images/chara_27_battle_back.webp",
    "panelImage": "images/chara_27_panel.webp",
    "cutinImage": "images/chara_27_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_27.webp",
    "homeImage": "images/chara_27_cut.webp",
    "upImage": "images/chara_27_up.webp",
    "homeScale": 0.83,
    "homeOffsetX": 0,
    "homeOffsetY": -45,
    "hidden": false
  },
  "28": {
    "id": 28,
    "name": "ミモザ",
    "element": "wood",
    "hp": 700,
    "atk": 220,
    "image": "images/chara_28_battle_back.webp",
    "panelImage": "images/chara_28_panel.webp",
    "cutinImage": "images/chara_28_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_28.webp",
    "homeImage": "images/chara_28_cut.webp",
    "upImage": "images/chara_28_up.webp",
    "homeScale": 0.89,
    "homeOffsetX": 0,
    "homeOffsetY": -45,
    "hidden": false
  },
  "29": {
    "id": 29,
    "name": "エルテナ",
    "element": "wood",
    "hp": 560,
    "atk": 290,
    "image": "images/chara_29_battle_back.webp",
    "panelImage": "images/chara_29_panel.webp",
    "cutinImage": "images/chara_29_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_29.webp",
    "homeImage": "images/chara_29_cut.webp",
    "upImage": "images/chara_29_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -50,
    "hidden": false
  },
  "30": {
    "id": 30,
    "name": "リズ",
    "element": "aqua",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_30_battle_back.webp",
    "panelImage": "images/chara_30_panel.webp",
    "cutinImage": "images/chara_30_cutin.webp",
    "uiScale": {
      "panel": 0.72,
      "battleBack": 1.2,
      "battleUp": 0.72
    },
    "portraitImage": "images/chara_30.webp",
    "homeImage": "images/chara_30_cut.webp",
    "upImage": "images/chara_30_up.webp",
    "homeScale": 0.79,
    "homeOffsetX": 0,
    "homeOffsetY": -20,
    "hidden": false
  },
  "31": {
    "id": 31,
    "name": "スゥ",
    "element": "aqua",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_31_battle_back.webp",
    "panelImage": "images/chara_31_panel.webp",
    "cutinImage": "images/chara_31_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_31.webp",
    "homeImage": "images/chara_31_cut.webp",
    "upImage": "images/chara_31_up.webp",
    "homeScale": 0.81,
    "homeOffsetX": 0,
    "homeOffsetY": -10,
    "hidden": false
  },
  "32": {
    "id": 32,
    "name": "イヴェルナ",
    "element": "fire",
    "hp": 620,
    "atk": 300,
    "image": "images/chara_32_battle_back.webp",
    "panelImage": "images/chara_32_panel.webp",
    "cutinImage": "images/chara_32_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_32.webp",
    "homeImage": "images/chara_32_cut.webp",
    "upImage": "images/chara_32_up.webp",
    "homeScale": 0.79,
    "homeOffsetX": 0,
    "homeOffsetY": -30,
    "hidden": false
  },
  "33": {
    "id": 33,
    "name": "レイ",
    "element": "aqua",
    "hp": 650,
    "atk": 255,
    "image": "images/chara_33_battle_back.webp",
    "panelImage": "images/chara_33_panel.webp",
    "cutinImage": "images/chara_33_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_33.webp",
    "homeImage": "images/chara_33_cut.webp",
    "upImage": "images/chara_33_up.webp",
    "homeScale": 0.79,
    "homeOffsetX": 0,
    "homeOffsetY": -25,
    "hidden": false
  },
  "34": {
    "id": 34,
    "name": "グレシャ",
    "element": "fire",
    "hp": 580,
    "atk": 280,
    "image": "images/chara_34_battle_back.webp",
    "panelImage": "images/chara_34_panel.webp",
    "cutinImage": "images/chara_34_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_34.webp",
    "homeImage": "images/chara_34_cut.webp",
    "upImage": "images/chara_34_up.webp",
    "homeScale": 0.83,
    "homeOffsetX": 0,
    "homeOffsetY": -40,
    "hidden": false
  },
  "35": {
    "id": 35,
    "name": "ジゼル",
    "element": "aqua",
    "hp": 620,
    "atk": 255,
    "image": "images/chara_35_battle_back.webp",
    "panelImage": "images/chara_35_panel.webp",
    "cutinImage": "images/chara_35_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_35.webp",
    "homeImage": "images/chara_35_cut.webp",
    "upImage": "images/chara_35_up.webp",
    "homeScale": 1,
    "homeOffsetX": 0,
    "homeOffsetY": 0,
    "hidden": false
  },
  "36": {
    "id": 36,
    "name": "ニーナ",
    "element": "light",
    "hp": 590,
    "atk": 280,
    "image": "images/chara_36_battle_back.webp",
    "panelImage": "images/chara_36_panel.webp",
    "cutinImage": "images/chara_36_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_36.webp",
    "homeImage": "images/chara_36_cut.webp",
    "upImage": "images/chara_36_up.webp",
    "homeScale": 1,
    "homeOffsetX": 0,
    "homeOffsetY": 0,
    "hidden": false
  },
  "37": {
    "id": 37,
    "name": "トイフェル",
    "element": "dark",
    "hp": 580,
    "atk": 290,
    "image": "images/chara_37_battle_back.webp",
    "panelImage": "images/chara_37_panel.webp",
    "cutinImage": "images/chara_37_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_37.webp",
    "homeImage": "images/chara_37_cut.webp",
    "upImage": "images/chara_37_up.webp",
    "homeScale": 1,
    "homeOffsetX": 0,
    "homeOffsetY": 0,
    "hidden": false
  },
  "50": {
    "id": 50,
    "name": "SIGMA-IX",
    "element": "wood",
    "hp": 620,
    "atk": 285,
    "image": "images/chara_50_battle_back.webp",
    "panelImage": "images/chara_50_panel.webp",
    "cutinImage": "images/chara_50_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_50.webp",
    "homeImage": "images/chara_50_cut.webp",
    "upImage": "images/chara_50.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -20,
    "hidden": false
  },
  "52": {
    "id": 52,
    "name": "ノア",
    "element": "light",
    "hp": 650,
    "atk": 305,
    "image": "images/chara_52_battle_back.webp",
    "panelImage": "images/chara_52_panel.webp",
    "cutinImage": "images/chara_52_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_52_cut.webp",
    "homeImage": "images/chara_52_cutin.webp",
    "upImage": "images/chara_52_panel.webp",
    "homeScale": 0.99,
    "homeOffsetX": 0,
    "homeOffsetY": -24,
    "hidden": false
  }
});

  function getShootingCharacterMaster(id) {
    return SHOOTING_CHARACTER_MASTER[Number(id)] || null;
  }

  const SHOT_VARIANTS = Object.freeze({
    parallel: Object.freeze([2, 3, 4, 5]),
    spread: Object.freeze([3, 5, 7]),
    laser: Object.freeze(['M', 'L']),
    bomb: Object.freeze(['M', 'L']),
  });

  function normalizeShotType(type) {
    const raw = String(type || '').trim().toLowerCase();
    const aliases = {
      orbit_forward: 'orbit',
      charge_release: 'charge',
      precision: 'piercing',
      shotgun: 'piercing',
      splash: 'bomb',
      melee_slash: 'strike',
      wolf_j_homing: 'homing',
      rose_seed_splash: 'spread',
      noah_hybrid: 'laser',
    };
    return aliases[raw] || raw || 'parallel';
  }

  function buildShotSlot(slot, profile, isMain) {
    if (slot === null || slot === false) return null;
    const source = slot && typeof slot === 'object' ? slot : {};
    const type = normalizeShotType(source.type || (isMain ? profile.shotType : ''));
    if (!type) return null;

    const out = { ...source, type };
    if (type === 'parallel' || type === 'spread') {
      const allowed = SHOT_VARIANTS[type];
      const requested = Math.max(1, Math.floor(Number(source.count ?? (isMain ? profile.shotCount : allowed[0]) ?? allowed[0])));
      out.count = allowed.includes(requested) ? requested : allowed[0];
    }
    if (type === 'laser') {
      const fallbackSize = Number(profile.laserWidth || 0) >= 11 ? 'L' : 'M';
      out.size = String(source.size || (isMain ? profile.laserSize : '') || fallbackSize).toUpperCase() === 'L' ? 'L' : 'M';
    }
    if (type === 'bomb') {
      const fallbackSize = Number(profile.splashRadius || 0) >= 80 ? 'L' : 'M';
      out.size = String(source.size || (isMain ? profile.bombSize : '') || fallbackSize).toUpperCase() === 'L' ? 'L' : 'M';
    }
    return Object.freeze(out);
  }

  function buildShootingCharacter(profile) {
    const master = getShootingCharacterMaster(profile.id);
    if (!master) return null;

    const rarity = getShootingRarity(master.id);
    const rarityMultiplier = getShootingRarityMultiplier(master.id);

    // v542: 通常攻撃を MAIN / SUB のスロット構造へ統一。
    // 既存トップレベルの戦闘パラメータは互換性のため維持し、shotType は MAIN の type を正本として同期する。
    const normalizedProfileType = normalizeShotType(profile.shotType);
    const inheritedMainType = profile.mainShot && typeof profile.mainShot === 'object'
      ? normalizeShotType(profile.mainShot.type)
      : '';
    const mainShotSource = profile.mainShot && inheritedMainType === normalizedProfileType
      ? profile.mainShot
      : { type: profile.shotType };
    const mainShot = buildShotSlot(mainShotSource, profile, true);
    const subShot = profile.subShot ? buildShotSlot(profile.subShot, profile, false) : null;

    // hp/atkが個体側(profile)で明示指定されていない限りmasterの値を基準にし、
    // そこへレアリティ倍率をかけてから丸める。
    // resonance(共鳴)の加算は、この確定済みhp/atkの上に別途適用される。
    const baseHp = Number(profile.hp ?? master.hp);
    const baseAtk = Number(profile.atk ?? master.atk);

    return {
      ...profile,
      shotType: mainShot?.type || normalizeShotType(profile.shotType),
      mainShot,
      subShot,
      id: master.id,
      name: profile.name || master.name,
      element: profile.element ?? master.element ?? null,
      image: profile.image || master.image,
      panelImage: profile.panelImage || master.panelImage || master.image,
      cutinImage: profile.cutinImage || master.cutinImage || '',
      rarity,
      hp: Math.round(baseHp * rarityMultiplier),
      atk: Math.round(baseAtk * rarityMultiplier),

      // v321: 移動速度はキャラ差を廃止。全キャラ400固定。
      // 個別profileにmoveSpeedが残っていてもここで必ず400へ統一する。
      moveSpeed: 400,

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
    description: '暫定性能。ULTは敵弾を全消去し、敵行動を約1秒停止。属性色の閃光後、敵全体へATK×3.0のダメージを与える。',
    ultDescription: '発動時に盤面上の敵弾をすべて消去し、敵行動を停止。盤面上の全敵へ自身の属性色の細い閃光を走らせ、ATK×3.0のダメージを与えた後、敵行動が再開する。',
    ultName: '駆け巡る閃光',
    ultType: 'balance_flash',
    moveSpeed: 400,
    fireRate: 170,
    bulletSpeed: 780,
    shotPowerRate: 0.095,

    // ---- 通常ショット設定 ----
    shotType: 'parallel',
    shotCount: 2,          // 同時に出す弾数
    shotSpacing: 18,       // 並列弾の中心間隔(px)
    shotAngleStep: 0,      // 角度差(rad)。parallelでは通常0
    shotStyle: 'normal',   // CSS演出キー

    // ---- ULT / 駆け巡る閃光 ----
    // エリ本人と、固有性能未実装でERI_BASE_PROFILEを継承するキャラ共通。
    // 固定ダメージではなく現在ATKを参照する。
    ultDamageAtkMultiplier: 3.0,

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
  // 固有実装済み：1エリ / 2ネム / 3スイ / 4アルノ / 5クラリネ / 6イグニス / 7ロゼ / 12ハヤテ / 13ミア / 14アヤネ / 15エルテナ
  // その他未調整キャラ：現時点ではエリ性能を継承
  const SHOOTING_CHARACTERS = {};

  Object.keys(SHOOTING_CHARACTER_MASTER).forEach(id => {
    const profile = makeInheritedProfile(Number(id));
    if (profile) SHOOTING_CHARACTERS[Number(id)] = profile;
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.ERI] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.ERI,
    effectKey: 'eri',
    description: '扱いやすい2連射の標準型。ULTは敵弾を全消去し、敵を1秒停止させた後、ATKの280%ダメージを与える。',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.SUI] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.SUI,
    effectKey: 'sui',
    label: 'CLOCK / DELAY BURST',
    description: 'シンプルな2ライン射撃。ULTは4秒のカウント後、HPを100%まで回復し、敵弾を全消去してATKの300%ダメージを与える。',
    ultDescription: '発動から4秒後に効果発動。操作中キャラのHPを100%まで回復し、画面内の敵弾をすべて消去、さらに敵へATK×3.0のダメージを与える。',
    ultName: '星環の約束',
    ultType: 'sui_clock_burst',
    moveSpeed: 400,
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
    description: '円環軌道を描きながら前進する特殊射撃。ULTは敵弾を全消去し、5秒間オーラを展開。0.25秒ごとに1.8ダメージ（単体へ最大36ダメージ）を与える。',
    ultDescription: '発動時に画面内の敵弾をすべて消去し、5秒間攻撃オーラを展開。0.25秒ごとに固定1.8ダメージを与える（最大36ダメージ/1体）。',
    ultName: '環流',
    ultType: 'arno_aura',
    moveSpeed: 400,
    fireRate: 185,
    bulletSpeed: 455,
    shotPowerRate: 0.105,

    // ---- 通常ショット設定 ----
    shotType: 'orbit',
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


  // アリス：通常攻撃をベロニカ系の近距離斬撃へ変更。ULT「環流」は従来どおり。
  SHOOTING_CHARACTERS[CHARACTER_ID.FLORA] = buildShootingCharacter({
    ...SHOOTING_CHARACTERS[CHARACTER_ID.FLORA],
    id: CHARACTER_ID.FLORA,
    effectKey: 'arno',
    label: 'STRIKE / AURA',
    description: '前方の近距離を斬り払う近接型。通常攻撃はベロニカと同じ近距離斬撃で、ULTは敵弾を消去して5秒間の攻撃オーラを展開する。',
    shotType: 'strike',
    shotCount: 1,
    fireRate: 520,
    shotPowerRate: 0.95,
    slashRange: 182,
    slashWidth: 120,
    slashVisualMs: 180,
    ultDescription: '発動時に画面内の敵弾をすべて消去し、5秒間攻撃オーラを展開。0.25秒ごとに固定1.8ダメージを与える（最大36ダメージ/1体）。',
    ultName: '環流',
    ultType: 'arno_aura',
    burstDamage: 36,
    burstNeed: 30,
    ultGainPerHit: 0.555,
    auraDurationMs: 5000,
    auraTickMs: 250,
    auraTickDamage: 1.8,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.CLARINE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.CLARINE,
    effectKey: 'clarine',
    label: 'DECOY / CHAOS BARRAGE',
    description: '低火力の4ライン円環射撃。ULTはHP520のデコイを2体・6秒召喚。各デコイは0.21秒ごとに4発（1発1.2ダメージ）を乱射し、消滅時にATKの220%範囲ダメージを与える。',
    ultDescription: 'HP520のデコイを2体、6秒間召喚する。各デコイは約0.21秒ごとに4発の全方位弾（1発固定1.2ダメージ）を放つ。敵弾で破壊された場合、周囲へATK×2.2の爆発ダメージを与える。',
    ultName: '空想遊戯',
    ultType: 'clarine_decoy',
    moveSpeed: 400,
    fireRate: 178,
    bulletSpeed: 430,
    shotPowerRate: 0.050,

    // ---- 通常ショット設定 ----
    shotType: 'orbit',
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
    decoyImage: 'images/chara_27_battle_decoy.webp',
  });

  // ============================================================
  // グレシャ：FIRE 3WAY SPREAD / 焼野原
  // ============================================================
  SHOOTING_CHARACTERS[CHARACTER_ID.GRESHA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.GRESHA,
    effectKey: 'gresha',
    label: 'SPREAD / BURN FIELD',
    description: '扇状に3WAYの火属性弾を放つR広域射撃型。ULT「焼野原」は敵陣へ6秒間ダメージフィールドを展開し、範囲内の敵全員へ毎秒ATK×1.5の火属性ダメージを与える。',
    ultDescription: '敵陣に6秒間ダメージフィールド「焼野原」を展開。フィールド内にいる敵全員へ1秒ごとにATK×1.5の火属性ダメージを与える。',
    ultName: '焼野原',
    ultType: 'gresha_burn_field',

    // 通常ショット：FIRE 3WAY SPREAD
    moveSpeed: 400,
    fireRate: 360,
    bulletSpeed: 760,
    shotPowerRate: 0.095,
    shotType: 'spread',
    shotCount: 3,
    shotAngleStep: 0.18,

    burstDamage: 0,
    burstNeed: 30,
    ultGainPerHit: 0.75,
    coreTop: '38%',
    shotOffsetY: 40,

    // ULT
    burnFieldDurationMs: 6000,
    burnFieldTickMs: 1000,
    burnFieldAtkMultiplier: 1.5,
    burnFieldWidthRate: 0.84,
    burnFieldHeightRate: 0.42,
    burnFieldCenterYRate: 0.27,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.IGNIS] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.IGNIS,
    effectKey: 'ignis',
    label: 'LASER / BURN',
    description: '一直線の連続レーザーを照射し続ける火力型。ULTは炎の輪を3.5秒展開。接触した敵を5秒間燃焼させ、1秒ごとにATKの30%ダメージ（計150%）を与える。',
    ultDescription: '火炎車を3.5秒間展開。接触した敵を5秒間燃焼状態にし、1秒ごとにATK×30%のダメージを与える（合計ATK×150%）。',
    ultName: '火炎車',
    ultType: 'ignis_fire_wheel',
    moveSpeed: 400,

    // ---- 通常ショット / 連続レーザー ----
    shotType: 'laser',
    shotStyle: 'ignis',
    laserSize: 'L',
    fireRate: 95,              // レーザーのダメージ判定間隔
    laserWidth: 16,
    laserHitWidth: 50,
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
    description: '0.5秒ごとに7発の種子Spreadを放つ。ULTは5.2秒間大花を展開して敵弾を遮断。0.24秒ごとにハートを10個放ち、取得した場のキャラのみ最大HPの5%回復／敵へATKの30%ダメージ。',
    ultDescription: '中央に大花を5.2秒間展開して敵弾を遮断。0.24秒ごとにハートを10個放つ。ハートを取得すると、その時点で操作中のキャラの最大HPを5%回復。敵に命中した場合はATK×30%のダメージを与える。',
    ultName: '花園の息吹',
    ultType: 'rose_flower_heart',
    moveSpeed: 400,

    // ---- 通常ショット ----
    shotType: 'spread',
    shotStyle: 'rose-seed',
    fireRate: 500,
    bulletSpeed: 335,
    shotPowerRate: 0.07286, // 旧6発×0.085と総火力をほぼ同等に維持
    shotCount: 7,
    shotAngleStep: 0.145,

    burstDamage: 0,
    burstNeed: 28,
    ultGainPerHit: 0.467,
    coreTop: '38%',
    shotOffsetY: 40,

    // ---- ULT / 花 ----
    flowerImage: 'images/chara_09_battle_flower.webp',
    flowerDurationMs: 5200,
    flowerHeartIntervalMs: 240,
    flowerHeartBurstCount: 10,
    flowerHeartSpeed: 250,
    flowerHeartLifeMs: 2200,
    flowerHeartHealMaxHpRate: 0.05,

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
    description: '高速2ライン射撃で安定して攻撃を継続する。ULTは敵を5秒間完全停止させる。',
    ultDescription: '敵の行動を5秒間完全停止させる。ULT自体にダメージはなく、停止中も通常射撃で攻撃できる。',
    ultName: 'どりいむたいむ',
    ultType: 'nem_stun',
    moveSpeed: 400,
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
    description: '高速移動・5WAY射撃型。ULTは敵弾を全消去し、3.5秒間無敵。さらに連射間隔を60%に短縮（約1.67倍速）し、通常弾威力を247%に強化する。',
    ultDescription: '発動時に画面内の敵弾をすべて消去し、3.5秒間完全無敵になる。さらに通常射撃の間隔を60%に短縮（約1.67倍速）し、通常弾威力を247%に強化する。',
    ultName: '黄月閃界・雷光巡行',
    ultType: 'speed_storm',
    moveSpeed: 400,
    // 端末負荷軽減：旧92ms→125ms。5WAYは維持し、1発威力を補正して通常DPSをほぼ維持。
    fireRate: 125,
    bulletSpeed: 900,
    shotPowerRate: 0.0285,

    // ---- 通常ショット設定 ----
    shotType: 'spread',
    shotCount: 5,
    shotAngleStep: 0.19,
    shotStyle: 'hayate',

    // ---- ULT中の射撃補正 ----
    moonlightImage: 'images/chara_04_battle_back_moon.webp',
    // ULT中も弾生成数を抑えつつ、総DPSは旧設定とほぼ同等。
    moonlightFireRateMultiplier: 0.60,
    moonlightPowerMultiplier: 2.47,

    burstDamage: 15,
    burstNeed: 34,
    // 発射頻度低下分を補正し、ULTゲージの平均充填速度も旧設定に寄せる。
    ultGainPerHit: 0.2125,
    coreTop: '34%',
  });

  // ============================================================
  // ミア：長押しCHARGE → 指を離して発射
  // ============================================================
  SHOOTING_CHARACTERS[CHARACTER_ID.MIA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.MIA,
    effectKey: 'mia',
    label: 'CHARGE / RELEASE',
    description: '指を押している間チャージし、離した瞬間に肉球弾を発射する一撃型。最大1秒。威力はチャージ時間に比例するため、理論DPSは他キャラと同程度。',
    moveSpeed: 400,

    // ---- 通常ショット：リリース式チャージ ----
    shotType: 'charge',
    shotStyle: 'mia-charge',
    fireRate: 0,                 // 自動射撃は使用しない
    bulletSpeed: 760,
    shotPowerRate: 1.24,         // MAX1秒で約ATK×124%。R補正後でも約293ダメージ/秒相当
    shotCount: 1,
    shotOffsetY: 44,
    chargeMinMs: 120,            // 誤タップ対策。これ未満は不発
    chargeMaxMs: 1000,
    chargeMinSize: 30,
    chargeMaxSize: 76,

    // ULTはERI系共通仕様：敵弾消去＋敵行動停止＋属性閃光＋ATK×3.0。
    coreTop: '38%',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.AYANE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.AYANE,
    effectKey: 'ayane',
    label: 'TECHNICAL / POWER',
    description: '狭い射線と遅い連射の高火力型。通常射撃は4発ごとに威力165%。ULTは敵弾を全消去し、射線上の敵を7秒拘束して合計ATKの350%ダメージを与える。',
    ultDescription: '発動時に画面内の敵弾をすべて消去。前方へ黒手を伸ばし、射線上の敵を同時に約7秒間拘束する。各対象へ合計ATK×3.5のダメージを分割して与え、拘束成立後は通常射撃をすぐ再開できる。',
    ultName: '暴走',
    ultType: 'precision_beam',
    moveSpeed: 400,
    fireRate: 275,
    bulletSpeed: 1250,
    shotPowerRate: 0.315,

    // ---- 通常ショット設定 ----
    shotType: 'piercing',
    shotCount: 1,
    shotStyle: 'ayane',
    chargedEvery: 4,
    chargedPowerMultiplier: 1.65,

    burstDamage: 27,
    ultDamageAtkMultiplier: 3.5,
    burstNeed: 24,
    ultGainPerHit: 1.320,
    coreTop: '37%',
    shotOffsetY: 42,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.ELTENA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.ELTENA,
    effectKey: 'eltena',
    label: 'GRAVITY / CONTROL',
    description: '0.7秒ごとに巨大な3WAY弾を放つ。ULTは敵陣上端にブラックホールを生成し、8秒間すべての敵を中心へ吸引・拘束する。',
    ultDescription: '正面にブラックホールを射出し、敵陣で8秒間展開する。範囲内の通常敵・大型敵・ボスを中心へ吸引・拘束する。ULT自体のダメージは0。',
    ultName: '事象の地平',
    ultType: 'eltena_black_hole',
    moveSpeed: 400,

    // ---- 通常ショット：巨大3WAY ----
    fireRate: 700,
    bulletSpeed: 610,
    shotPowerRate: 0.150,
    shotType: 'spread',
    shotCount: 3,
    shotAngleStep: 0.235,
    shotStyle: 'eltena',
    shotOffsetY: 44,

    // 3発命中時は高め、拡散で1〜2発命中なら標準火力になる想定。
    burstDamage: 0,
    burstNeed: 30,
    ultGainPerHit: 1.40,

    // ---- ULT：ブラックホール ----
    blackHoleTravelSpeed: 760,
    blackHoleDurationMs: 8000,
    blackHoleSize: 154,
    blackHolePullStrength: 11.5,
    blackHoleTargetY: 104,
    blackHoleEnemyStopRadius: 10,
    blackHoleBossStopRadius: 18,
    coreTop: '38%',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.MIMOSA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.MIMOSA,
    effectKey: 'mimosa',
    label: 'SPREAD / ITEM SUPPORT',
    description: '0.7秒ごとに5WAY拡散弾を放つ。ULTは3種の恩恵を各1個設置：ATK130%を10秒／最大HPの30%回復／3秒無敵。拾ったキャラだけに効果が適用される。',
    ultDescription: 'フィールド上に3種類(赤/青/緑)のアイテムを各1個ずつ設置する。赤：10秒間の間、ATKを1.3倍にする。青：3秒間無敵状態になる。緑：最大HPの30%を回復する。各効果は拾ったキャラのみに適用され、交代先やベンチには引き継がれない。',
    ultName: 'ミモザの贈り物',
    ultType: 'mimosa_item_spawn',
    moveSpeed: 400,

    // ---- 通常ショット：5WAY拡散（エルテナと同弾種・同系統チューニング） ----
    shotType: 'spread',
    shotStyle: 'eltena',
    fireRate: 700,
    bulletSpeed: 610,
    shotPowerRate: 0.185,
    shotCount: 5,
    shotAngleStep: 0.12,
    shotOffsetY: 44,

    // SRの他キャラ(エリ/スゥ/アルノ/ロゼ/ハヤテ)平均DPS(約293)に寄せた値。
    burstDamage: 0,
    burstNeed: 30,
    ultGainPerHit: 0.84,
    coreTop: '38%',

    // ---- ULT：恩恵アイテム設置 ----
    // 3つとも固定の異なる効果（ATK UP / HP回復 / 無敵）。ランダム位置に設置され、
    // 拾うまでフィールドに残り続ける。効果は拾ったキャラのみに適用され、
    // 交代先・ベンチのキャラには一切引き継がれない（shooting_core.js側でmember単位管理）。
    itemCount: 3,
    itemAtkMultiplier: 1.3,
    itemAtkDurationMs: 10000,
    itemHealPercent: 0.30,
    itemInvincibleDurationMs: 3000,
  });

  // ============================================================
  // ミト：召喚獣サイドカー支援
  // ============================================================
  SHOOTING_CHARACTERS[CHARACTER_ID.MITO] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.MITO,
    effectKey: 'mito',
    label: 'FAMILIAR / TEMPORARY DOUBLE',
    description: 'ULT発動で召喚獣を8秒間フィールドへ独立召喚。召喚獣はミトと同じHP・ATK・ショット性能を持って自律移動しながら射撃する。HPが0になると消滅。8秒経過で消える場合は残HPをミトの回復へ変換する。',
    ultDescription: 'HP・ATK・通常ショット性能がミトと同じ召喚獣を8秒間召喚する。召喚獣は独立してフィールド内を移動・射撃し、敵弾や接触でHPを失う。HP0で消滅。8秒間生存した場合、残HP分だけミトを回復する。召喚獣の攻撃ではULTゲージは増加しない。',

    moveSpeed: 400,
    fireRate: 170,
    bulletSpeed: 780,
    shotPowerRate: 0.095,
    shotType: 'parallel',
    shotCount: 2,
    shotSpacing: 18,
    shotStyle: 'normal',
    shotOffsetY: 38,

    companionImage: 'images/chara_07_battle_set.webp',
    companionScale: 1.0,
    companionShotOffsetY: 30,

    ultName: '時駆けの獣',
    ultType: 'mito_summon_double',
    summonDurationMs: 8000,
    summonMoveSpeed: 250,
    summonContactInvulnMs: 650,
    summonBulletInvulnMs: 90,
  });

  // ============================================================
  // ウルフ：深いJ字ホーミング / ATK UP FIELD
  // ============================================================
  SHOOTING_CHARACTERS[CHARACTER_ID.WOLF] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.WOLF,
    effectKey: 'wolf',
    label: 'HOMING / PREDATOR FIELD',
    description: '左右2発がいったん肩より後ろへ沈み込み、深いJ字を描いてUターン。2本の軌道は同じ標的へ収束するホーミング射撃。ULTは敵弾を全消去し、中央に10秒間ATK×1.5の強化フィールドを展開する。',
    ultDescription: '発動時に画面内の敵弾をすべて消去。フィールド中央へ円形のATK UP領域を10秒間展開し、領域内の操作キャラのATKを1.5倍にする。',
    ultName: '月喰みの狩場',
    ultType: 'wolf_atk_field',
    moveSpeed: 400,
    fireRate: 285,
    bulletSpeed: 900,
    shotPowerRate: 0.115,

    // 左右2発が後方へ沈み、J字で反転して同一点へ収束する。
    shotType: 'homing',
    shotCount: 2,
    shotSpacing: 30,
    shotStyle: 'wolf',
    wolfCurveDurationMs: 430,
    wolfRetreatDepth: 78,
    wolfOuterOffset: 52,
    wolfConvergeLead: 54,

    burstNeed: 32,
    ultGainPerHit: 0.44,
    coreTop: '38%',
    shotOffsetY: 32,

    ultFieldDurationMs: 10000,
    ultFieldAtkMultiplier: 1.5,
    ultFieldRadius: 112,
  });


  // ============================================================
  // ノア：灰白レーザー + 2WAY追尾 / 5秒時止め50連撃
  // ============================================================

  // ============================================================
  // v228: Release roster IDs 20-31
  // ULT名・最終数値は未確定。ここでは通常ショットを正式ロールへ合わせ、
  // ULT構成は basic + addons のメタデータとして先行実装する。
  // ============================================================
  const NEW_ROSTER_COMMON = Object.freeze({
    moveSpeed: 400,
    burstNeed: 30,
    coreTop: '38%',
    shotOffsetY: 40,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.SERA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.SERA, effectKey: 'sera',
    label: 'ORBIT / WOOD', description: '2発の円環軌道ショット。ULTは敵弾を消去し、敵行動停止後に属性閃光で敵全体へATK×3.0ダメージ。',
    shotType: 'orbit', shotCount: 2, shotSpacing: 28, fireRate: 450, bulletSpeed: 520, shotPowerRate: 0.165,
    orbitRadius: 30, orbitAngularSpeed: 12.0, orbitForwardLoopRate: 0.29, orbitPhaseStep: Math.PI,
    ultBaseType: 'burst', ultAddons: ['damage','bullet_clear'], ultType: 'prototype_generic',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.RYUNE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.RYUNE, effectKey: 'ryune',
    label: 'LASER / AQUA', description: '細い水流レーザーを連続照射するRレーザー型。ULTは敵弾を消去し、敵行動停止後に属性閃光で敵全体へATK×3.0ダメージ。',
    shotType: 'laser', shotStyle: 'ryune', laserSize: 'M', fireRate: 100, laserWidth: 10, laserHitWidth: 34, laserDamageAtkRate: 0.058, laserVisualHoldMs: 125,
    ultBaseType: 'burst', ultAddons: ['damage','bullet_clear'], ultType: 'prototype_generic',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.KAINA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.KAINA, effectKey: 'kaina',
    label: 'CHARGE / ATK FIELD',
    description: '長押しで溜め、離して撃つRチャージ型。ULTはウルフと同系統のATK UP領域を展開するR版。',
    ultDescription: '発動時に画面内の敵弾をすべて消去。フィールド中央へ円形のATK UP領域を10秒間展開し、領域内の操作キャラのATKを1.3倍にする。',
    ultName: '紅蓮の領域',
    shotType: 'charge', shotStyle: 'kaina-charge', fireRate: 0, bulletSpeed: 760, shotPowerRate: 0.90, shotCount: 1,
    chargeMinMs: 120, chargeMaxMs: 1200, chargeMinSize: 28, chargeMaxSize: 72,
    ultBaseType: 'field', ultAddons: ['bullet_clear','player_buff'], ultType: 'wolf_atk_field',
    ultFieldDurationMs: 10000,
    ultFieldAtkMultiplier: 1.3,
    ultFieldRadius: 112,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.REISIA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.REISIA, effectKey: 'reisia',
    label: 'BOMB / AQUA',
    description: '水属性の爆弾を前方へ投げ、着弾時に小範囲へAQUA属性の爆風を広げるRスプラッシュ型。ULTは巨大なAQUA爆弾を敵陣へ投げ込み、着弾時に盤面を覆う大爆発を起こす。',
    ultName: 'MEGA AQUA BOMB',
    ultDescription: '巨大なAQUA爆弾を敵陣へ放り投げる。着弾時に盤面上の敵弾を消去し、敵全体へATK×4.0のAQUA属性ダメージを与える。',
    shotType: 'bomb', bombSize: 'M', shotCount: 1, fireRate: 550, bulletSpeed: 660, shotPowerRate: 0.27, splashRadius: 76, splashDamageRate: 0.55,
    ultBaseType: 'burst', ultAddons: ['damage','bullet_clear'], ultType: 'liz_giant_bomb',
    ultDamageAtkMultiplier: 4.0,
    lizUltBlastRadius: 164,
    lizUltThrowMs: 760,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.NOEL] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.NOEL, effectKey: 'noel',
    label: 'BOMB / LIGHT', description: '着弾時に小範囲へ広がるRスプラッシュ型。ULTは敵弾を消去し、敵行動停止後に属性閃光で敵全体へATK×3.0ダメージ。',
    shotType: 'bomb', bombSize: 'M', shotCount: 1, fireRate: 550, bulletSpeed: 660, shotPowerRate: 0.27, splashRadius: 76, splashDamageRate: 0.55,
    ultBaseType: 'burst', ultAddons: ['damage','bullet_clear'], ultType: 'prototype_generic',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.IONA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.IONA, effectKey: 'iona',
    label: 'STRIKE / BRASS PUNCH',
    description: 'メリケンサックで真正面をぶん殴る超近接型。通常攻撃も射程は短いが高火力。ULTはさらに狭い間合いへ、外せば終わりの一撃を叩き込む。',
    shotType: 'strike', shotCount: 1, fireRate: 520, shotPowerRate: 0.95,
    slashRange: 182,
    slashWidth: 120,
    slashVisualMs: 180,
    ultName: 'キョーレツな一発をあげる♡',
    ultDescription: '真正面の超狭範囲へ1Hitだけの強烈な拳を叩き込む。命中時はATKの700%ダメージ。追尾せず、範囲外なら完全にMISSとなる。',
    ultBaseType: 'damage', ultAddons: ['damage'], ultType: 'veronica_brass_punch',
    ultDamageAtkMultiplier: 7.0,
    ultPunchRange: 118,
    ultPunchWidth: 68,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.ELSIA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.ELSIA, effectKey: 'elsia',
    label: 'ORBIT / BULLET SLOW FIELD',
    description: '2発の円環軌道ショット。ULTは自身を中心に大きな光の円環を7秒間展開し、円内へ入った敵弾の速度を半減する。',
    ultName: '術式・光の円環',
    ultDescription: '自身を中心に大きな光のサークルを7秒間展開する。サークル内に入った敵弾は移動速度が50%に低下し、サークル外へ出ると元の速度へ戻る。',
    shotType: 'orbit', shotCount: 2, shotSpacing: 28, fireRate: 450, bulletSpeed: 520, shotPowerRate: 0.165,
    orbitRadius: 32, orbitAngularSpeed: 11.8, orbitForwardLoopRate: 0.29, orbitPhaseStep: Math.PI,
    ultBaseType: 'field', ultAddons: ['enemy_bullet_slow'], ultType: 'shiina_light_ring',
    lightRingDurationMs: 7000,
    lightRingRadius: 190,
    lightRingBulletSpeedMultiplier: 0.5,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.FIA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.FIA, effectKey: 'fia',
    label: 'LASER / WOOD', description: '細い高密度レーザーを照射するRレーザー型。ULTは6本の細レーザーを射出し、5秒間ランダム反射させて画面全域を掃射する。',
    shotType: 'laser', shotStyle: 'fia', laserSize: 'M', fireRate: 100, laserWidth: 10, laserHitWidth: 34, laserDamageAtkRate: 0.058, laserVisualHoldMs: 125,
    ultName: 'SCRAMBLE RAY',
    ultDescription: 'ジグを起点に6本の細レーザーを射出。5秒間、画面端でランダム反射しながら敵を貫通してダメージを与える。',
    ultBaseType: 'beam', ultAddons: ['damage','bullet_clear'], ultType: 'jig_scramble_ray',
    jigUltDurationMs: 5000,
    jigUltBeamCount: 6,
    jigUltBeamSpeed: 520,
    jigUltBeamLength: 128,
    jigUltBeamWidth: 5,
    jigUltDamageAtkRate: 0.12,
    jigUltHitIntervalMs: 200,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.RAGNA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.RAGNA, effectKey: 'ragna',
    label: 'BOMB / FIRE', description: '着弾点を中心に爆ぜるRスプラッシュ型。ULTは敵弾を消去し、敵行動停止後に属性閃光で敵全体へATK×3.0ダメージ。',
    shotType: 'bomb', bombSize: 'L', shotCount: 1, fireRate: 550, bulletSpeed: 680, shotPowerRate: 0.27, splashRadius: 96, splashDamageRate: 0.58,
    ultBaseType: 'burst', ultAddons: ['damage','bullet_clear'], ultType: 'prototype_generic',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.RIZE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.RIZE, effectKey: 'rize',
    label: 'BOMB / WOOD', description: '小範囲へ広がるRスプラッシュ型。ULTは敵弾を消去し、敵行動停止後に属性閃光で敵全体へATK×3.0ダメージ。',
    shotType: 'bomb', bombSize: 'M', shotCount: 1, fireRate: 550, bulletSpeed: 650, shotPowerRate: 0.27, splashRadius: 76, splashDamageRate: 0.55,
    ultBaseType: 'burst', ultAddons: ['damage','bullet_clear'], ultType: 'prototype_generic',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.SHION] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.SHION, effectKey: 'shion',
    label: 'PIERCING / DELAY',
    description: '高威力の単発精密射撃。ULT「黒羽葬鐘」は敵全体へ呪印を刻み、時間差で闇撃を起こした後、敵の攻撃力を弱体化する。',
    ultDescription: '敵全体へ黒羽の呪印を刻む。1.2秒後にATK×2.8の闇属性ダメージを与え、その後6秒間、敵から受ける非即死ダメージを30%軽減する。敵弾消去・スタン・無敵は発生しない。',
    ultName: '黒羽葬鐘',
    shotType: 'piercing', shotCount: 1, fireRate: 600, bulletSpeed: 1400, shotPowerRate: 0.44,
    ultGainPerHit: 3.600,
    ultType: 'shion_delayed_curse',
    ultDelayMs: 1200,
    ultDamageAtkMultiplier: 2.8,
    ultDebuffDurationMs: 6000,
    ultEnemyDamageMultiplier: 0.70,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.ORION] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.ORION, effectKey: 'orion',
    label: 'PIERCING / LIGHT', description: '高威力の単発精密射撃。ULTは敵弾を消去し、敵行動停止後に属性閃光で敵全体へATK×3.0ダメージ。',
    shotType: 'piercing', shotCount: 1, fireRate: 600, bulletSpeed: 1400, shotPowerRate: 0.44,
    ultGainPerHit: 3.600,
    ultBaseType: 'burst', ultAddons: ['damage','bullet_clear'], ultType: 'prototype_generic',
  });

  // v306: 限定SR FIRE / LASER
  SHOOTING_CHARACTERS[CHARACTER_ID.IVERNA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.IVERNA,
    effectKey: 'iverna',
    label: 'LASER / FIRE',
    description: '太い紅色レーザーを連続照射する限定SRレーザー型。',
    ultDescription: '正面へ極太レーザーを5秒間連続照射する。0.25秒ごとにATK×35%のダメージ判定が発生し、全段命中時は最大ATK×700%相当。敵弾消去・スタン・無敵などの追加効果はない。',
    ultName: '終端紅閃',
    ultType: 'testchan_black_ship',
    moveSpeed: 400,
    shotType: 'laser',
    shotStyle: 'iverna',
    laserSize: 'L',
    fireRate: 95,
    laserWidth: 16,
    laserHitWidth: 50,
    laserDamageAtkRate: 0.090,
    laserVisualHoldMs: 130,
    burstDamage: 0,
    burstNeed: 32,
    ultGainPerHit: 0.70,
    coreTop: '39%',
    shotOffsetY: 40,

    // ULT：SIGMA-IX「ブラックシップ」と同一性能
    ultBeamDurationMs: 5000,
    ultBeamTickMs: 250,
    ultBeamTickAtkMultiplier: 0.35,
    ultBeamWidth: 62,
    ultBeamElement: 'fire',
  });

  // v313: 限定SR AQUA
  // 通常ショットはウルフと同じ「深いJ字2発ホーミング」。
  // ULTはブラックホールを展開し、吸引・拘束しながら継続ダメージ。
  SHOOTING_CHARACTERS[CHARACTER_ID.REI] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.REI,
    effectKey: 'rei',
    label: 'HOMING / BLACK HOLE',
    description: 'ウルフと同じ深いJ字軌道の2発ホーミング射撃。ULTは敵陣にブラックホールを生成し、すべての敵を吸引・拘束しながら継続ダメージを与える。',
    ultDescription: '敵陣へブラックホールを射出し、7秒間展開。通常敵・大型敵・ボスを中心へ吸引して拘束し、展開中に合計ATK×3.5相当の継続ダメージを与える。',
    ultName: '深淵水界',
    ultType: 'eltena_black_hole',
    moveSpeed: 400,

    // ---- 通常ショット：ウルフと完全に同じ挙動 ----
    fireRate: 285,
    bulletSpeed: 900,
    shotPowerRate: 0.115,
    shotType: 'homing',
    shotCount: 2,
    shotSpacing: 30,
    shotStyle: 'wolf',
    wolfCurveDurationMs: 430,
    wolfRetreatDepth: 78,
    wolfOuterOffset: 52,
    wolfConvergeLead: 54,

    burstDamage: 0,
    burstNeed: 32,
    ultGainPerHit: 0.44,
    coreTop: '38%',
    shotOffsetY: 32,

    // ---- ULT：ブラックホール + 継続ダメージ ----
    blackHoleTravelSpeed: 760,
    blackHoleDurationMs: 7000,
    blackHoleSize: 164,
    blackHolePullStrength: 11.8,
    blackHoleTargetY: 112,
    blackHoleEnemyStopRadius: 10,
    blackHoleBossStopRadius: 18,
    blackHoleDamageAtkMultiplier: 3.5,
    blackHoleDamageTickMs: 250,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.NOAH] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.NOAH,
    effectKey: 'noah',
    label: 'LASER / HOMING / TIME STOP',
    description: '中心へLIGHT属性の連続レーザーを照射し、その周囲からFIRE属性の2発の追尾弾を放つ複合射撃型。ULTは盤面の弾幕を消去し、敵の動きを止めながら無数の灰白波動弾を降り注がせる。',
    ultDescription: '発動した瞬間に盤面の敵弾をすべて消去し、盤面上の敵全体の移動を停止。8拍子を間を置かず2周、合計16発の落雷をランダムな敵へ叩き込む。各落雷で画面が揺れ、落雷を受けた敵は終了後1.5秒間スタンする。',
    ultName: '理想郷の静止',
    ultType: 'noah_time_homing',
    moveSpeed: 400,

    // MAIN：LIGHT属性 Laser M。
    // SUB：FIRE属性 Homing。SUBは現時点でノアだけが持つ希少スロット。
    shotType: 'laser',
    mainShot: { type: 'laser', size: 'M' },
    subShot: {
      type: 'homing',
      count: 2,
      element: 'fire',
      fireRate: 285,
      shotPowerRate: 0.070,
      bulletSpeed: 860,
      shotSpacing: 28,
      wolfCurveDurationMs: 360,
      wolfRetreatDepth: 52,
      wolfOuterOffset: 42,
      wolfConvergeLead: 44,
    },
    shotStyle: 'noah',
    fireRate: 95,
    laserElement: 'light',
    laserSize: 'M',
    laserWidth: 10,
    laserHitWidth: 34,
    laserDamageAtkRate: 0.085,
    laserVisualHoldMs: 130,
    shotCount: 1,
    shotPowerRate: 0.070,

    burstNeed: 34,
    ultGainPerHit: 0.36,
    coreTop: '38%',
    shotOffsetY: 38,

    // ULT：16拍子で16連続落雷。総倍率はATK×5.6相当。
    noahUltHitCount: 16,
    noahUltHitAtkMultiplier: 0.35,
    noahUltBeatMs: 540,
    noahUltParalyzeMs: 1500,
  });


  // ============================================================
  // SIGMA-IX：DAILY RAIDクリア報酬
  // ============================================================

  // ============================================================
  // build737: ID35-37 combat profiles
  // ============================================================
  SHOOTING_CHARACTERS[CHARACTER_ID.GISELLE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.GISELLE, effectKey: 'giselle',
    label: 'ORBIT / AQUA',
    description: '2発の水属性円環ショットが前進しながら軌道を描くORBIT型。ULTはウルフ系のATK UP FIELDをR向けに抑えた1.3倍・10秒版。',
    ultName: 'ATK UP FIELD',
    ultDescription: '発動時に画面内の敵弾をすべて消去。フィールド中央へ円形のATK UP領域を10秒間展開し、領域内の操作キャラのATKを1.3倍にする。',
    shotType: 'orbit',
    shotCount: 2,
    shotSpacing: 28,
    fireRate: 450,
    bulletSpeed: 520,
    shotPowerRate: 0.165,
    orbitRadius: 30,
    orbitAngularSpeed: 12.0,
    orbitForwardLoopRate: 0.29,
    orbitPhaseStep: Math.PI,
    ultBaseType: 'field',
    ultAddons: ['bullet_clear','player_buff'],
    ultType: 'wolf_atk_field',
    ultFieldDurationMs: 10000,
    ultFieldAtkMultiplier: 1.3,
    ultFieldRadius: 112,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.NINA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.NINA, effectKey: 'nina',
    label: 'LIGHTNING / CHAIN',
    description: '電撃弾を放つSRチェイン型。命中した敵から周囲の敵へ感電が連鎖。ULTは画面上半分の敵側フィールドを8分割し、8秒間に16回ランダムエリアへ落雷する。',
    ultName: 'LIGHTNING STORM',
    ultDescription: '画面上半分の敵側フィールドを4列×2段の8エリアに分割。8秒間に16回、ランダムな1エリアへ落雷し、その瞬間エリア内にいる敵全員へATK×4.0のLIGHT属性ダメージ。命中した敵は3秒間、移動と射撃が停止する。',
    shotType: 'lightning',
    shotCount: 1,
    fireRate: 300,
    bulletSpeed: 900,
    shotPowerRate: 0.28,
    lightningChainRadius: 120,
    lightningMaxJumps: 3,
    lightningChainDamageRate: 0.62,
    lightningChainDecay: 0.82,
    ultBaseType: 'storm',
    ultAddons: ['damage','enemy_paralyze'],
    ultType: 'nina_lightning_storm',
    ninaUltDurationMs: 8000,
    ninaUltHitCount: 16,
    ninaUltHitAtkMultiplier: 4.0,
    ninaUltParalyzeMs: 3000,
    ninaUltEnemyFieldRatio: 0.5,
    ninaUltZoneColumns: 4,
    ninaUltZoneRows: 2,
    ninaUltTelegraphMs: 180,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.TOYFEL] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.TOYFEL, effectKey: 'toyfel',
    label: 'BOMB / DARK',
    description: '闇属性の爆弾を前方へ投げ、着弾時に周囲へDARK属性の爆風を広げるBOMB型。ULTは発動地点の左右端へ2つのブラックホールを7秒間展開し、敵弾を吸収する。',
    ultName: 'DUAL BLACK HOLE',
    ultDescription: '発動時の自機Y座標に合わせて、画面左端・右端へブラックホールを1つずつ召喚。7秒間、盤面上の敵弾を左右どちらかのブラックホールへ吸引して消滅させる。',
    shotType: 'bomb',
    bombSize: 'M',
    shotCount: 1,
    fireRate: 550,
    bulletSpeed: 660,
    shotPowerRate: 0.27,
    splashRadius: 76,
    splashDamageRate: 0.55,
    ultBaseType: 'field',
    ultAddons: ['enemy_bullet_absorb'],
    ultType: 'toyfel_double_black_hole',
    toyfelBlackHoleDurationMs: 7000,
    toyfelBlackHoleSize: 96,
    toyfelBlackHoleEdgeInset: 34,
    toyfelBlackHoleAbsorbRadius: 28,
    toyfelBlackHoleAbsorbSpeed: 980,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.TESTCHAN] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.TESTCHAN,
    effectKey: 'testchan',
    label: 'TRI-LASER / BLACK SHIP',
    description: '未来から来たアンドロイド、SIGMA-IX（シグマ-ナイン）。3WAYの緑色レーザーを照射するSR火力型。ULT「ブラックシップ」は5秒間、正面へ極太レーザーを照射する。弾幕消去・スタン等の追加効果はなく、純粋な高火力特化。',
    ultDescription: '正面へ極太レーザーを5秒間連続照射する。0.25秒ごとにATK×35%のダメージ判定が発生し、全段命中時は最大ATK×700%相当。敵弾消去・スタン・無敵などの追加効果はない。',
    ultName: 'ブラックシップ',
    ultType: 'testchan_black_ship',
    moveSpeed: 400,
    fireRate: 250,
    bulletSpeed: 920,
    shotPowerRate: 0.075,

    shotType: 'spread',
    shotCount: 3,
    shotAngleStep: 0.115,
    shotStyle: 'testchan',

    burstNeed: 32,
    ultGainPerHit: 0.42,
    coreTop: '38%',
    shotOffsetY: 38,

    ultBeamDurationMs: 5000,
    ultBeamTickMs: 250,
    ultBeamTickAtkMultiplier: 0.35,
    ultBeamWidth: 62,
  });


  // ============================================================
  // マグダレーナ：紅黒5WAY気弾 / ULT「彼岸残月」
  // build564: 大鎌を正面へ直線投擲し、最初に当たった敵の位置で停止。
  // 命中地点の一定範囲だけを吸引・行動停止する。誰にも当たらなければMISS。
  // ============================================================
  SHOOTING_CHARACTERS[CHARACTER_ID.SHURI] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.SHURI,
    effectKey: 'gojo',
    label: 'CRIMSON MOON / FIVE-WAY',
    description: '淡い紅黒の5WAY気弾を放つSR火力型。ULT「彼岸残月」は大鎌を正面へ直線投擲し、最初に命中した敵の位置で停止。周囲の敵を吸引して行動を封じる。',
    ultDescription: '大鎌を正面へ一直線に投擲する。最初に敵へ命中した位置で鎌が停止し、その一定範囲内の敵を約7秒間吸引。吸引された敵は効果中、移動・攻撃・弾の生成が停止する。すでに盤面に存在する敵弾は消去しない。直線上に敵がいなければMISSで終了する。',
    ultName: '彼岸残月',
    ultType: 'gojo_purple',
    moveSpeed: 400,
    fireRate: 300,
    bulletSpeed: 900,
    shotPowerRate: 0.080,

    // ---- 通常ショット：紅黒の5WAY ----
    shotType: 'spread',
    shotCount: 5,
    shotAngleStep: 0.125,
    shotStyle: 'gojo',
    shotOffsetY: 42,

    // ---- ULT：正面直線投擲 / 命中地点周辺だけを吸引・拘束 ----
    burstDamage: 27,
    burstNeed: 24,
    ultGainPerHit: 0.46,
    gojoPurpleDurationMs: 7000,
    gojoPurplePullRadius: 165,
    gojoPurplePullStrength: 10.8,
    gojoPurpleEnemyStopRadius: 18,
    gojoPurpleBossStopRadius: 26,
    coreTop: '37%',
  });



  // ============================================================
  // 所持判定
  // ============================================================
  // ここは「キャラ定義」ではなくアカウント側の所持データをIDで参照する。
  // 旧 characters.js は参照しない。
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


    return null;
  }

  function isShootingCharacterOwned(charaId) {
    return !!getOwnedShootingInstance(charaId);
  }

  // build481: パーティ選択パネル用 属性アイコン
  const SHOOTING_ELEMENT_ICON = Object.freeze({
    neutral: 'images/type_neutral.webp',
    aqua: 'images/type_aqua.webp',
    fire: 'images/type_fire.webp',
    wood: 'images/type_wood.webp',
    dark: 'images/type_dark.webp?v=571',
    light: 'images/type_light.webp',
  });

  function getShootingRosterElementIcon(element) {
    const raw = Array.isArray(element) ? element[0] : element;
    const key = String(raw || 'neutral').trim().toLowerCase();
    return SHOOTING_ELEMENT_ICON[key] || SHOOTING_ELEMENT_ICON.neutral;
  }

  function getShootingRosterHtml() {
    return Object.values(SHOOTING_CHARACTERS)
      .sort((a, b) => a.id - b.id)
      .map(c => {
        const ownedData = getOwnedShootingInstance(c.id);
        const owned = !!ownedData;
        const currentLevel = owned
          ? Math.max(1, Math.floor(Number(
              ownedData.characterLevel != null
                ? ownedData.characterLevel
                : (ownedData.character_level != null ? ownedData.character_level : 1)
            ) || 1))
          : 0;

        return `
          <div class="shooting-character-option-wrap${owned ? '' : ' locked'}" data-character-wrap-id="${c.id}">
            <button type="button"
                    class="shooting-character-option${owned ? '' : ' locked'}"
                    data-character-id="${c.id}"
                    aria-label="${owned ? `${c.name} Lv.${currentLevel}。長押しで詳細` : '未所持キャラクター'}"
                    onclick="selectShootingCharacter(${c.id})"
                    ${owned ? '' : 'disabled aria-disabled="true"'}>
              <span class="shooting-character-portrait">
                <img src="${c.panelImage || c.image}"
                     alt="${owned ? c.name : '未所持'}"
                     draggable="false">
                ${owned ? `<img class="shooting-character-element-icon"
                               src="${getShootingRosterElementIcon(c.element)}"
                               alt=""
                               aria-hidden="true"
                               draggable="false">` : ''}
              </span>
              <b class="shooting-character-level-label">${owned ? `Lv.${currentLevel}` : '????'}</b>
            </button>
          </div>`;
      })
      .join('');
  }


  // ============================================================
  // 既存UI互換ビュー
  // ============================================================
  // 別マスターではない。SHOOTING_CHARACTER_MASTERから毎回生成する読み取り用配列。
  const CHARACTER_CATALOG = Object.freeze(
    Object.values(SHOOTING_CHARACTER_MASTER)
      .sort((a,b) => Number(a.id) - Number(b.id))
      .map(master => Object.freeze({
        id: Number(master.id),
        name: master.name,
        rarity: getShootingRarity(master.id),
        element: master.element,
        stats: Object.freeze({
          HP: Number(master.hp || 0),
          ATK: Number(master.atk || 0),
        }),
        img: master.portraitImage,
        cutImg: master.homeImage,
        ultImg: master.cutinImage,
        upImg: master.upImage,
        battleBackImg: master.image,
        panelImg: master.panelImage,
        uiScale: Object.freeze({
          panel: Number(master.uiScale && master.uiScale.panel != null ? master.uiScale.panel : 1),
          battleBack: Number(master.uiScale && master.uiScale.battleBack != null ? master.uiScale.battleBack : 1),
          battleUp: Number(master.uiScale && master.uiScale.battleUp != null ? master.uiScale.battleUp : 1),
        }),
        panelScale: Number(master.uiScale && master.uiScale.panel != null ? master.uiScale.panel : 1),
        battleBackScale: Number(master.uiScale && master.uiScale.battleBack != null ? master.uiScale.battleBack : 1),
        battleUpScale: Number(master.uiScale && master.uiScale.battleUp != null ? master.uiScale.battleUp : 1),
        favScale: Number(master.homeScale ?? 1),
        favOffsetX: Number(master.homeOffsetX ?? 0),
        favOffsetY: Number(master.homeOffsetY ?? 0),
        hidden: master.hidden === true,
      }))
  );

  window.ShootingCharacters = Object.freeze({
    CHARACTER_ID,
    SHOOTING_CHARACTER_MASTER,
    CHARACTER_CATALOG,
    SHOOTING_CHARACTERS,
    SHOOTING_RARITY,
    RARITY_STAT_MULTIPLIER,
    SHOT_VARIANTS,
    PARTY_SIZE: 3,
    SWITCH_COOLDOWN_MS: 5000,
    getShootingCharacterMaster,
    getShootingRarity,
    getShootingRarityMultiplier,
    getOwnedShootingInstance,
    isShootingCharacterOwned,
    getShootingRosterHtml,
  });
  // 旧UI互換。実体は上の統合マスターのみ。
  window.CHARACTERS = CHARACTER_CATALOG;
})();

// classic-script global binding
var CHARACTERS = window.ShootingCharacters.CHARACTER_CATALOG;
