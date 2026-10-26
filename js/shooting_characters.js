// Zeraphia Unified Character Master + Shooting combat profiles / ownership
// build497:
// - キャラ共通情報の正本はこのファイル。
// - 旧 characters.js は廃止。
// - HOME / ガチャ / キャラ一覧 / 育成 / Shooting は同じマスターを参照する。
// - 旧Strategy専用性能は削除済み。
(function () {
  'use strict';

  const CHARACTER_ID = Object.freeze({
    CONJURER: 40, CAMILLA: 102,
    NINA: 36,
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
    AURA: 3,
    SHION: 18,
    ORION: 10,
    NOAH: 52,
    IVERNA: 32,
    REI: 33,
    GRESHA: 34,
    GISELLE: 35,
    TOYFEL: 37,
    CHLOE: 38,
    LEONA_CROSS: 39,
    KUREHA: 41,
    KYOU: 42, SUZU: 43, MELORIA: 44, KIRIMARU: 45, AIRENA: 46,
    LINLIN: 47, MUUMUU: 48, MEGMEG: 49, CHACHA: 51, RUIRUI: 53, HAO: 54, SMILE: 56, TOWA: 101, // ID52 is reserved for Noah (existing saves/RPC)
  });

  // ============================================================
  // シューティング専用レアリティ格差
  // ============================================================
  // rarity も共通情報の正本としてここで管理する。
  // Strategy characters.js 側へは実行時にこの値が反映されるため、二重更新は不要。
  // build1341: ニーナ(ID36)・オリビア(ID40)のSR漏れを修正。
  // v306 Gacha SR:
  //   限定: ラテルナ / スゥ / ロゼ / シュリ / ハヤテ
  //   恒常: ウルフ / レイ / アルノ / アヤネ / ミト
  //   ネム / クラリネはRへ移行。エリ・SIGMA-IX・ノアは別枠SR。
  const SHOOTING_RARITY = Object.freeze({
    1: 'sr',  // エリ
    26: 'r',   // ネム
    31: 'sr',  // スゥ
    20: 'sr', // アルノ
    27: 'r',   // クラリネ
    6: 'r',  // イグニス
    9: 'sr',  // ロゼ
    28: 'r',  // ミモザ
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
    32: 'sr',  // ラテルナ
    33: 'sr',  // レイ
    34: 'r',   // グレシャ
    35: 'r',   // ジゼル
    36: 'sr', // ニーナ（限定ピックアップSR）
    37: 'r',   // トイフェル
    38: 'r',   // クロエ
    39: 'r',   // レオナクロス
    40: 'sr', // オリビア（限定ピックアップSR）
    102: 'sr', // カミラ
    41: 'sr',  // シャオラン
    42: 'r', 43: 'r', 44: 'r', 45: 'r', 46: 'r',
    47: 'r', 48: 'r', 49: 'r', 51: 'r', 53: 'r', 54: 'sr', 56: 'sr', 101: 'sr',
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
    "element": "light",
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
    "name": "ラテルナ",
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
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -30,
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
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -30,
    "hidden": false
  },
  "38": {
    "id": 38,
    "name": "クロエ",
    "element": "light",
    "hp": 590,
    "atk": 255,
    "image": "images/chara_38_battle_back.webp",
    "panelImage": "images/chara_38_panel.webp",
    "cutinImage": "images/chara_38_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_38.webp",
    "homeImage": "images/chara_38_cut.webp",
    "upImage": "images/chara_38_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -30,
    "hidden": false
  },
  "39": {
    "id": 39,
    "name": "レオナクロス",
    "element": "dark",
    "hp": 590,
    "atk": 270,
    "image": "images/chara_39_battle_back.webp",
    "panelImage": "images/chara_39_panel.webp",
    "cutinImage": "images/chara_39_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_39.webp",
    "homeImage": "images/chara_39_cut.webp",
    "upImage": "images/chara_39_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -24,
    "hidden": false
  },
  "102": {
    "id": 102, "name": "カミラ", "element": "fire", "hp": 600, "atk": 290,
    "image": "images/chara_102_battle_back.webp",
    "panelImage": "images/chara_102_panel.webp",
    "cutinImage": "images/chara_102_cutin.webp",
    "uiScale": {"panel": 1, "battleBack": 1.2, "battleUp": 1},
    "portraitImage": "images/chara_102.webp", "homeImage": "images/chara_102_cut.webp",
    "upImage": "images/chara_102_up.webp", "homeScale": 0.88,
    "homeOffsetX": 0, "homeOffsetY": -16, "hidden": false
  },
  "40": {
    "id": 40,
    "name": "オリビア",
    "element": "wood",
    "hp": 590,
    "atk": 275,
    "image": "images/chara_40_battle_back.webp",
    "panelImage": "images/chara_40_panel.webp",
    "cutinImage": "images/chara_40_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_40.webp",
    "homeImage": "images/chara_40_cut.webp",
    "upImage": "images/chara_40_up.webp",
    "homeScale": 0.86,
    "homeOffsetX": 0,
    "homeOffsetY": -18,
    "hidden": false
  },
  "41": {
    "id": 41,
    "name": "シャオラン",
    "element": "fire",
    "hp": 600,
    "atk": 290,
    "image": "images/chara_41_battle_back.webp",
    "panelImage": "images/chara_41_panel.webp",
    "cutinImage": "images/chara_41_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_41.webp",
    "homeImage": "images/chara_41_cut.webp",
    "upImage": "images/chara_41_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -30,
    "hidden": false
  },
  "42": {
  "id": 42,
  "name": "キョウ",
  "element": "fire",
  "hp": 610,
  "atk": 285,
  "image": "images/chara_42_battle_back.webp",
  "panelImage": "images/chara_42_panel.webp",
  "cutinImage": "images/chara_42_cutin.webp",
  "uiScale": {
    "panel": 1,
    "battleBack": 1.2,
    "battleUp": 1
  },
  "portraitImage": "images/chara_42.webp",
  "homeImage": "images/chara_42_cut.webp",
  "upImage": "images/chara_42_up.webp",
  "homeScale": 0.82,
  "homeOffsetX": 0,
  "homeOffsetY": -24,
  "hidden": false
},
  "43": {
  "id": 43,
  "name": "スズ",
  "element": "wood",
  "hp": 600,
  "atk": 255,
  "image": "images/chara_43_battle_back.webp",
  "panelImage": "images/chara_43_panel.webp",
  "cutinImage": "images/chara_43_cutin.webp",
  "uiScale": {
    "panel": 1,
    "battleBack": 1.2,
    "battleUp": 1
  },
  "portraitImage": "images/chara_43.webp",
  "homeImage": "images/chara_43_cut.webp",
  "upImage": "images/chara_43_up.webp",
  "homeScale": 0.82,
  "homeOffsetX": 0,
  "homeOffsetY": -24,
  "hidden": false
},
  "44": {
  "id": 44,
  "name": "メロリア",
  "element": "dark",
  "hp": 590,
  "atk": 265,
  "image": "images/chara_44_battle_back.webp",
  "panelImage": "images/chara_44_panel.webp",
  "cutinImage": "images/chara_44_cutin.webp",
  "uiScale": {
    "panel": 1,
    "battleBack": 1.2,
    "battleUp": 1
  },
  "portraitImage": "images/chara_44.webp",
  "homeImage": "images/chara_44_cut.webp",
  "upImage": "images/chara_44_up.webp",
  "homeScale": 0.82,
  "homeOffsetX": 0,
  "homeOffsetY": -24,
  "hidden": false
},
  "45": {
  "id": 45,
  "name": "キリマル",
  "element": "aqua",
  "hp": 620,
  "atk": 255,
  "image": "images/chara_45_battle_back.webp",
  "panelImage": "images/chara_45_panel.webp",
  "cutinImage": "images/chara_45_cutin.webp",
  "uiScale": {
    "panel": 1,
    "battleBack": 1.2,
    "battleUp": 1
  },
  "portraitImage": "images/chara_45.webp",
  "homeImage": "images/chara_45_cut.webp",
  "upImage": "images/chara_45_up.webp",
  "homeScale": 0.82,
  "homeOffsetX": 0,
  "homeOffsetY": -24,
  "hidden": false
},
  "46": {
  "id": 46,
  "name": "アレイン",
  "element": "light",
  "hp": 590,
  "atk": 255,
  "image": "images/chara_46_battle_back.webp",
  "panelImage": "images/chara_46_panel.webp",
  "cutinImage": "images/chara_46_cutin.webp",
  "uiScale": {
    "panel": 1,
    "battleBack": 1.2,
    "battleUp": 1
  },
  "portraitImage": "images/chara_46.webp",
  "homeImage": "images/chara_46_cut.webp",
  "upImage": "images/chara_46_up.webp",
  "homeScale": 0.82,
  "homeOffsetX": 0,
  "homeOffsetY": -24,
  "hidden": false
},
  // build1308: 追加恒常R 5体。既存ノア（52）はIDを変更しない。
  "47": {
    "id": 47,
    "name": "リンリン",
    "element": "wood",
    "hp": 620,
    "atk": 250,
    "image": "images/chara_47_battle_back.webp",
    "panelImage": "images/chara_47_panel.webp",
    "cutinImage": "images/chara_47_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_47.webp",
    "homeImage": "images/chara_47_cut.webp",
    "upImage": "images/chara_47_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -24,
    "hidden": false
  },
  "48": {
    "id": 48,
    "name": "ムゥムゥ",
    "element": "dark",
    "hp": 610,
    "atk": 265,
    "image": "images/chara_48_battle_back.webp",
    "panelImage": "images/chara_48_panel.webp",
    "cutinImage": "images/chara_48_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_48.webp",
    "homeImage": "images/chara_48_cut.webp",
    "upImage": "images/chara_48_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -24,
    "hidden": false
  },
  "49": {
    "id": 49,
    "name": "メグメグ",
    "element": "fire",
    "hp": 590,
    "atk": 275,
    "image": "images/chara_49_battle_back.webp",
    "panelImage": "images/chara_49_panel.webp",
    "cutinImage": "images/chara_49_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_49.webp",
    "homeImage": "images/chara_49_cut.webp",
    "upImage": "images/chara_49_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -24,
    "hidden": false
  },
  "51": {
    "id": 51,
    "name": "チャチャ",
    "element": "light",
    "hp": 600,
    "atk": 255,
    "image": "images/chara_51_battle_back.webp",
    "panelImage": "images/chara_51_panel.webp",
    "cutinImage": "images/chara_51_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_51.webp",
    "homeImage": "images/chara_51_cut.webp",
    "upImage": "images/chara_51_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -24,
    "hidden": false
  },
  "53": {
    "id": 53,
    "name": "ルイルイ",
    "element": "aqua",
    "hp": 625,
    "atk": 250,
    "image": "images/chara_53_battle_back.webp",
    "panelImage": "images/chara_53_panel.webp",
    "cutinImage": "images/chara_53_cutin.webp",
    "uiScale": {
      "panel": 1,
      "battleBack": 1.2,
      "battleUp": 1
    },
    "portraitImage": "images/chara_53.webp",
    "homeImage": "images/chara_53_cut.webp",
    "upImage": "images/chara_53_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -24,
    "hidden": false
  },
  // build1312: 恒常SR 木属性・占い師ハオ（ID54）。画像は別途投入される命名規則を使用。
  "54": {
    "id": 54,
    "name": "ハオ",
    "element": "wood",
    "hp": 610,
    "atk": 285,
    "image": "images/chara_54_battle_back.webp",
    "panelImage": "images/chara_54_panel.webp",
    "cutinImage": "images/chara_54_cutin.webp",
    "uiScale": { "panel": 1, "battleBack": 1.2, "battleUp": 1 },
    "portraitImage": "images/chara_54.webp",
    "homeImage": "images/chara_54_cut.webp",
    "upImage": "images/chara_54_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -24,
    "hidden": false
  },
  // build1613: SR 光属性・道化師スマイル（ID56）。既存キャラと同じ画像パス規則。
  "56": {
    "id": 56,
    "name": "スマイル",
    "element": "light",
    "hp": 615,
    "atk": 285,
    "image": "images/chara_56_battle_back.webp",
    "panelImage": "images/chara_56_panel.webp",
    "cutinImage": "images/chara_56_cutin.webp",
    "uiScale": { "panel": 1, "battleBack": 1.2, "battleUp": 1 },
    "portraitImage": "images/chara_56.webp",
    "homeImage": "images/chara_56_cut.webp",
    "upImage": "images/chara_56_up.webp",
    "homeScale": 0.82,
    "homeOffsetX": 0,
    "homeOffsetY": -24,
    "hidden": false
  },
  "50": {
    "id": 50,
    "name": "テスト",
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
  },
  "101": {
    "id": 101,
    "name": "トワ",
    "element": "dark",
    "hp": 600,
    "atk": 250,
    "image": "images/chara_101_battle_back.webp",
    "panelImage": "images/chara_101_panel.webp",
    "cutinImage": "images/chara_101_cutin.webp",
    "uiScale": {"panel": 1, "battleBack": 1.2, "battleUp": 1},
    "portraitImage": "images/chara_101.webp",
    "homeImage": "images/chara_101_cut.webp",
    "upImage": "images/chara_101_up.webp",
    "homeScale": 0.83,
    "homeOffsetX": 0,
    "homeOffsetY": -26,
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
      precision: 'shotgun',
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
    if (type === 'charge') {
      out.size = String(source.size || (isMain ? profile.chargeSize : '') || 'M').toUpperCase() === 'L' ? 'L' : 'M';
    }
    if (type === 'bomb') {
      const fallbackSize = Number(profile.splashRadius || 0) >= 80 ? 'L' : 'M';
      out.size = String(source.size || (isMain ? profile.bombSize : '') || fallbackSize).toUpperCase() === 'L' ? 'L' : 'M';
    }
    return Object.freeze(out);
  }

  // ============================================================
  // build1496: CHARGE の規格（M / L）
  // 威力はチャージ時間に比例（MAX＝shotPowerRate×ATK）。MAX到達は1.0秒。
  // 着弾すると破裂し、半径内の他の敵へ「本体ダメージ×burstRate」を与える（MAX溜めは maxRate・範囲×maxRadiusBonus）。
  // 理論DPS（単体）：M＝ATK×1.10/秒、L＝ATK×1.25/秒。
  // ============================================================
  const CHARGE_SIZE_PRESETS = Object.freeze({
    M: Object.freeze({
      shotPowerRate: 1.10, chargeMaxMs: 1000, chargeMinSize: 28, chargeMaxSize: 66,
      chargeBurstRadiusMin: 36, chargeBurstRadiusMax: 70, chargeBurstMaxRadiusBonus: 1.10,
      chargeBurstRate: 0.30, chargeBurstMaxRate: 0.40, chargeHomingTurnRate: 2.6,
    }),
    L: Object.freeze({
      shotPowerRate: 1.25, chargeMaxMs: 1000, chargeMinSize: 32, chargeMaxSize: 82,
      chargeBurstRadiusMin: 52, chargeBurstRadiusMax: 96, chargeBurstMaxRadiusBonus: 1.12,
      chargeBurstRate: 0.40, chargeBurstMaxRate: 0.50, chargeHomingTurnRate: 3.0,
    }),
  });
  function applyChargeSizePreset(profile) {
    if (normalizeShotType(profile.shotType) !== 'charge') return profile;
    const size = String(profile.chargeSize || profile.mainShot?.size || 'M').toUpperCase() === 'L' ? 'L' : 'M';
    return {
      ...profile,
      ...CHARGE_SIZE_PRESETS[size],
      chargeSize: size,
      mainShot: { ...(profile.mainShot && typeof profile.mainShot === 'object' ? profile.mainShot : {}), type: 'charge', size },
    };
  }

  function buildShootingCharacter(profile) {
    profile = applyChargeSizePreset(profile);
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
    description: '暫定性能。ULTは敵弾を全消去し、敵を約1.4秒停止。約0.84秒後に敵全体へATK×2.8のダメージ。',
    ultDescription: '発動時に画面内の敵弾をすべて消去し、敵を約1.4秒間停止。約0.84秒後に敵全体へATK×2.8のダメージを与える。',
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
    ultDamageAtkMultiplier: 2.8,

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
  // その他13人：現時点ではエリ性能を継承
  const SHOOTING_CHARACTERS = {};

  Object.keys(SHOOTING_CHARACTER_MASTER).forEach(id => {
    const profile = makeInheritedProfile(Number(id));
    if (profile) SHOOTING_CHARACTERS[Number(id)] = profile;
  });

  // build1327 — 共有ULT「慈愛の光」: 回復系のアンジェ・ノエル・リンリン。
  // 通常ショットとキャラ固有の画像はそのまま。ULTのみ同一仕様を使用する。
  SHOOTING_CHARACTERS[CHARACTER_ID.ANGE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, id: CHARACTER_ID.ANGE, effectKey:'ange',
    label:'PARALLEL / HEAL',
    description:'2連射型。ULTで敵弾を消去し、3.5秒間の無敵と3個の回復ハートを展開する。',
    ultName: '慈愛の光',
    ultDescription: '発動時に画面内の敵弾をすべて消去し、3.5秒間無敵になる。盤面のランダムな位置に回復ハートを3個召喚。各ハートを取得すると、取得キャラの最大HPの30%を回復する。',
    ultType: 'ange_healing_hearts', ultBaseType: 'item_summon', ultAddons: ['bullet_clear','invincible','heal'],
    ultInvincibleDurationMs: 3500, ultHeartCount: 3, ultHeartHealPercent: 0.30,
    ultHeartLifeMs: 7000, ultHeartBlinkLeadMs: 2000,
  });

  // build1327 — シグレ: 正面狭範囲の近接一撃（命中しなければMISS）。
  SHOOTING_CHARACTERS[CHARACTER_ID.SHIGURE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, id: CHARACTER_ID.SHIGURE, effectKey:'shigure',
    label:'PARALLEL / PUNCH',
    description:'2連射型。ULTで真正面の狭い範囲へ近接一撃を放つ。',
    ultName:'神速一撃',
    ultDescription:'真正面の超狭範囲へ1Hitだけの強烈な一撃を叩き込む。命中時はATKの700%ダメージ。追尾せず、範囲外なら完全にMISSとなる。',
    ultType:'veronica_brass_punch', ultBaseType:'damage', ultAddons:['damage'],
    ultDamageAtkMultiplier:7.0, ultPunchRange:118, ultPunchWidth:68,
  });

  // build1327 — パトラ: シイナ/ルイルイ共通の敵弾減速円環。
  SHOOTING_CHARACTERS[CHARACTER_ID.PATRA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, id: CHARACTER_ID.PATRA, effectKey:'patra',
    label:'PARALLEL / SLOW RING',
    description:'2連射型。ULTで自機の周囲に7秒間、敵弾の速度を8割減する円環を展開する。',
    ultName:'砂時計の円環',
    ultDescription:'自身を中心に円環を7秒間展開する。円環内に入った敵弾は移動速度が20%に低下し、外へ出ると元の速度へ戻る。',
    ultType:'shiina_light_ring', ultBaseType:'field', ultAddons:['enemy_bullet_slow'],
    lightRingDurationMs:7000, lightRingRadius:190, lightRingBulletSpeedMultiplier:0.2,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.ERI] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.ERI,
    effectKey: 'eri',
    description: '扱いやすい2連射の標準型。ULTは敵弾を全消去、約1.4秒間敵を停止。約0.84秒後にATK×2.8の全体ダメージ。',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.SUI] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.SUI,
    effectKey: 'sui',
    label: 'PARALLEL / TIME DOMAIN',
    description: 'シンプルな2ライン射撃。ULT「時空操環」で6秒間、自機に追従する広い時空領域を展開し、領域内の敵弾を80%減速、攻撃力を1.3倍にする。',
    ultDescription: '自機を中心に6秒間、半径275pxの時空領域を展開。領域内の敵弾は速度が20%になり、操作キャラのATKは1.3倍になる。敵弾全消去・回復・全体攻撃は行わない。',
    ultName: '時空操環',
    ultType: 'sui_time_domain',
    ultBaseType: 'field',
    ultAddons: ['enemy_bullet_slow', 'atk_up'],
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

    // ---- ULT「時空操環」 ----
    suiDomainDurationMs: 6000,
    suiDomainRadius: 275,
    suiDomainBulletSpeedMultiplier: 0.2,
    suiDomainAtkMultiplier: 1.3,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.ARNO] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.ARNO,
    effectKey: 'arno',
    label: 'ORBIT / SLASH',
    description: '円環軌道を描きながら前進する特殊射撃。ULTは盤面の敵弾を消去して時間を止め、最も近い敵の目前へ接近。制限時間中、タップするたびに高速斬撃を叩き込む。',
    ultDescription: '盤面の敵弾を全消去して時間停止。最も近い敵の目前へ接近し、4秒間タップするたびATK×0.35の斬撃（最大13回）。終了時は発動前の位置へ戻って戦闘を再開する。',
    ultName: '瞬迅・千ノ刻',
    ultType: 'arno_thousand_slash',
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
    arnoSlashDurationMs: 4000,
    arnoSlashDamageAtkRate: 0.35,
    arnoSlashMinTapIntervalMs: 80,
    // build1672: 斬撃回数の上限（ATK×0.35×13＝最大ATK×4.55。他のULTより少し上の水準）
    arnoSlashMaxHits: 13,
  });


  // アリス：R版アルノ斬撃ULT（1タップATK×0.25）。通常射撃はベロニカ系近距離斬撃。
  SHOOTING_CHARACTERS[CHARACTER_ID.FLORA] = buildShootingCharacter({
    ...SHOOTING_CHARACTERS[CHARACTER_ID.FLORA],
    id: CHARACTER_ID.FLORA,
    effectKey: 'arno',
    label: 'STRIKE / SLASH',
    description: '前方を斬り払う近接型。ULTは敵の目前へ接近し、4秒間の高速連打斬撃を放つ。',
    shotType: 'strike',
    shotCount: 1,
    fireRate: 520,
    shotPowerRate: 0.95,
    slashRange: 182,
    slashWidth: 120,
    slashVisualMs: 180,
    ultDescription: '発動時に盤面の敵弾を全消去して時間停止。最も近い敵の目前へ接近し、4秒間、タップするたびにATK×0.25の斬撃を放つ（最大14回）。終了時は発動前の位置へ戻って戦闘を再開する。',
    ultName: '環流',
    ultType: 'arno_thousand_slash',
    burstDamage: 36,
    burstNeed: 30,
    ultGainPerHit: 0.555,
    arnoSlashDurationMs: 4000,
    arnoSlashDamageAtkRate: 0.25,
    arnoSlashMinTapIntervalMs: 80,
    // build1672: 斬撃回数の上限（R版：ATK×0.25×14＝最大ATK×3.5。他のULTと同じ水準）
    arnoSlashMaxHits: 14,
    auraTickDamage: 1.8,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.CLARINE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.CLARINE,
    effectKey: 'clarine',
    label: 'DECOY / CHAOS BARRAGE',
    description: '低火力の4ライン円環射撃。ULTは自機の目の前に大きなデコイを1体・4秒設置。デコイは敵弾を遮りながら、0.21秒ごとに8方向へ散弾（1発1.2ダメージ）を撃ち続ける。',
    ultDescription: '自機の目の前に、バトルユニットと同じ大きさのデコイを1体、4秒間設置する。デコイは敵弾を遮断しながら、約0.21秒ごとに8方向へ散弾（1発固定1.2ダメージ）を撃ち続け、時間が来ると消える。',
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

    // ---- ULT / デコイ設定（build1668：1体・4秒・敵弾遮断・8方向散弾・爆発なし） ----
    decoyDurationMs: 4000,
    decoyFireIntervalMs: 210,
    decoyShotWays: 8,
    decoyBulletSpeed: 300,
    decoyBulletDamage: 1.2,
    decoyFrontGap: 10,
    decoyBlockWidthRate: 0.86,
    decoyBlockHeightRate: 0.9,
    decoyImage: 'images/chara_27_battle_decoy.webp',
  });

  // ============================================================
  // グレシャ：クラリネ型ショット / 焼野原
  // ============================================================
  SHOOTING_CHARACTERS[CHARACTER_ID.GRESHA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.GRESHA,
    effectKey: 'gresha',
    label: 'BURN FIELD / ORBIT SHOT',
    description: '4ラインの円環射撃。ULTは敵陣へ6秒間「焼野原」を展開し、範囲内の敵全員へ毎秒ATK×1.5の火属性ダメージを与える。',
    ultDescription: '敵陣に6秒間ダメージフィールド「焼野原」を展開。フィールド内にいる敵全員へ1秒ごとにATK×1.5の火属性ダメージを与える。',
    ultName: '焼野原',
    ultType: 'gresha_burn_field',

    // クラリネと同一の通常ショット性能
    moveSpeed: 400,
    fireRate: 178,
    bulletSpeed: 430,
    shotPowerRate: 0.050,
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
    label: 'SEED / FORTRESS',
    description: '0.5秒ごとに7発の種子Spreadを放つ。ULTは5秒間、前方に盤面全幅の防御壁を固定設置。通常敵弾を吸収して操作中のキャラを1発につき最大HP3%回復。接触する敵には0.25秒ごとにATK×1.0の木属性ダメージ。',
    ultDescription: '5秒間、前方に盤面全幅の防御壁を設置。通常敵弾を吸収するたび操作中キャラの最大HPを3%回復（最大HP上限）。接触した敵へ0.25秒ごとにATK×1.0の木属性ダメージ。WARNING・HEAVY・レーザー等は防げない。展開中は通常射撃が停止する。',
    ultName: 'ローズフォートレス',
    ultType: 'rose_fortress',
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

    // ---- ULT / ローズフォートレス ----
    fortressImage: 'images/chara_09_battle_object.webp',
    fortressDurationMs: 5000,
    fortressForwardOffsetY: 92,
    fortressContactIntervalMs: 250,
    fortressContactDamageAtkRate: 1.0,
    fortressBulletHealMaxHpRate: 0.01, // build1595: 実際は1発ごとに0.7〜1.0%のランダム（shooting_core.js）

    // ---- 廃止済み旧「花園の息吹」設定（別系統に影響させない）----
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
    description: '指を押している間チャージし、離した瞬間に水の波動を放つCHARGE M型。最大1秒。威力はチャージ時間に比例し、着弾すると破裂して周囲の敵も巻き込む。',
    moveSpeed: 400,

    // ---- 通常ショット：リリース式チャージ ----
    // build1496: CHARGE M（威力・溜め時間・破裂範囲は CHARGE_SIZE_PRESETS.M）
    shotType: 'charge',
    chargeSize: 'M',
    shotStyle: 'mia-charge',
    fireRate: 0,                 // 自動射撃は使用しない
    bulletSpeed: 760,
    shotCount: 1,
    shotOffsetY: 44,
    chargeMinMs: 120,            // 誤タップ対策。これ未満は不発

    // ULTは今回未実装。既存の暫定挙動には触れない。
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
    shotType: 'shotgun',
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
    description: 'ULT発動で本体のHP・ATK・通常射撃性能を引き継ぐ召喚獣を8秒間召喚。独立して移動・射撃し、HPが0になると消滅。8秒間生存した場合は残HP分だけ本体を回復する。',
    ultDescription: '本体のHP・ATK・通常射撃性能を引き継ぐ召喚獣を8秒間召喚する。召喚獣は独立して移動・射撃し、敵弾や接触でHPを失う。HP0で消滅。8秒間生存した場合、召喚獣の残HP分だけ本体を回復する。召喚獣の攻撃ではULTゲージは増加しない。',

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
    label: 'ORBIT / SLOW RING', description: '2発の円環軌道ショット。ULTで7秒間、敵弾の速度を8割減する円環を展開する。',
    shotType: 'orbit', shotCount: 2, shotSpacing: 28, fireRate: 450, bulletSpeed: 520, shotPowerRate: 0.165,
    orbitRadius: 30, orbitAngularSpeed: 12.0, orbitForwardLoopRate: 0.29, orbitPhaseStep: Math.PI,
    ultName: '静寂の円環',
    ultDescription: '自身を中心に円環を7秒間展開する。円環内に入った敵弾は移動速度が20%に低下し、外へ出ると元の速度へ戻る。',
    ultBaseType:'field', ultAddons:['enemy_bullet_slow'], ultType:'shiina_light_ring',
    lightRingDurationMs:7000, lightRingRadius:190, lightRingBulletSpeedMultiplier:0.2,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.RYUNE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.RYUNE, effectKey: 'ryune',
    label: 'LASER / AQUA', description: '細い水流レーザーを連続照射するRレーザー型。',
    shotType: 'laser', shotStyle: 'ryune', laserSize: 'M', fireRate: 100, laserWidth: 10, laserHitWidth: 34, laserDamageAtkRate: 0.058, laserVisualHoldMs: 125,
    ultName: 'アブソリュート・レーテー',
    ultDescription: '盤面の敵全員の属性バリアを解除し、敵全体へATK×2.8のダメージを与える。',
    ultBaseType: 'beam', ultAddons: ['damage', 'barrier_clear'], ultType: 'ryune_absolute_lethe',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.KAINA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.KAINA, effectKey: 'kaina',
    label: 'CHARGE / STEALTH',
    description: '長押しで力を蓄えるRチャージ型。ULTで10秒間敵の認識から姿を消し、射撃威力を強化する。',
    ultDescription: '10秒間、敵からのターゲッティングを無効化し、発動時の最後に感知された位置を狙わせる。通常射撃ダメージ×1.3。敵弾は消去されず、無敵にもならない。固定弾幕・既存の敵弾・接触ダメージは通常どおり。',
    ultName: '気配遮断',
    // build1496: CHARGE M（威力・破裂範囲は CHARGE_SIZE_PRESETS.M）
    shotType: 'charge', chargeSize: 'M', shotStyle: 'kaina-charge', fireRate: 0, bulletSpeed: 760, shotCount: 1,
    chargeMinMs: 120,
    ultBaseType: 'buff', ultAddons: ['enemy_aim_block','shot_power_up'], ultType: 'aina_stealth',
    ainaStealthDurationMs: 10000,
    ainaStealthShotMultiplier: 1.3,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.REISIA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.REISIA, effectKey: 'reisia',
    label: 'STRAIGHT / AQUA', description: '左右2発の水弾をまっすぐ前方へ同時射出するRストレート型。',
    shotType: 'parallel', shotCount: 2, shotSpacing: 28, fireRate: 500, bulletSpeed: 640, shotPowerRate: 0.14,
    ultBaseType: 'summon', ultAddons: ['damage'], ultType: 'prototype_generic',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.NOEL] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.NOEL, effectKey: 'noel',
    label: 'BOMB / HEAL', description: '着弾時に小範囲へ広がるRスプラッシュ型。ULTで敵弾を消去し、3.5秒間の無敵と3個の回復ハートを展開する。',
    shotType: 'bomb', bombSize: 'M', shotCount: 1, fireRate: 550, bulletSpeed: 660, shotPowerRate: 0.27, splashRadius: 76, splashDamageRate: 0.55,
    ultName: '慈愛の光',
    ultDescription: '発動時に画面内の敵弾をすべて消去し、3.5秒間無敵になる。盤面のランダムな位置に回復ハートを3個召喚。各ハートを取得すると、取得キャラの最大HPの30%を回復する。',
    ultType: 'ange_healing_hearts', ultBaseType: 'item_summon', ultAddons: ['bullet_clear','invincible','heal'],
    ultInvincibleDurationMs: 3500, ultHeartCount: 3, ultHeartHealPercent: 0.30,
    ultHeartLifeMs: 7000, ultHeartBlinkLeadMs: 2000,
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
    ultDescription: '真正面の超狭範囲へ1Hitだけの強烈な一撃を叩き込む。命中時はATKの700%ダメージ。追尾せず、範囲外なら完全にMISSとなる。',
    ultBaseType: 'damage', ultAddons: ['damage'], ultType: 'veronica_brass_punch',
    ultDamageAtkMultiplier: 7.0,
    ultPunchRange: 118,
    ultPunchWidth: 68,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.ELSIA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.ELSIA, effectKey: 'elsia',
    label: 'ORBIT / BULLET SLOW FIELD',
    description: '2発の円環軌道ショット。ULTは自身を中心に大きな光の円環を7秒間展開し、円内へ入った敵弾の速度を8割減する。',
    ultName: '術式・光の円環',
    ultDescription: '自身を中心に円環を7秒間展開する。円環内に入った敵弾は移動速度が20%に低下し、外へ出ると元の速度へ戻る。',
    shotType: 'orbit', shotCount: 2, shotSpacing: 28, fireRate: 450, bulletSpeed: 520, shotPowerRate: 0.165,
    orbitRadius: 32, orbitAngularSpeed: 11.8, orbitForwardLoopRate: 0.29, orbitPhaseStep: Math.PI,
    ultBaseType: 'field', ultAddons: ['enemy_bullet_slow'], ultType: 'shiina_light_ring',
    lightRingDurationMs: 7000,
    lightRingRadius: 190,
    lightRingBulletSpeedMultiplier: 0.2,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.FIA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.FIA, effectKey: 'fia',
    label: 'LASER / WOOD', description: '細い高密度レーザーを照射するRレーザー型。ULTは6本の細レーザーを射出し、5秒間ランダム反射させて画面全域を掃射する。',
    shotType: 'laser', shotStyle: 'fia', laserSize: 'M', fireRate: 100, laserWidth: 10, laserHitWidth: 34, laserDamageAtkRate: 0.058, laserVisualHoldMs: 125,
    ultName: 'SCRAMBLE RAY',
    ultDescription: 'ジグを起点に6本の細長い閃光レーザーを射出。5秒間、画面端でランダム反射しながら敵を貫通してダメージを与える。完凸時は9本に増加。',
    ultBaseType: 'beam', ultAddons: ['damage','bullet_clear'], ultType: 'jig_scramble_ray',
    jigUltDurationMs: 5000,
    jigUltBeamCount: 6,
    jigUltBeamSpeed: 520,
    jigUltBeamLength: 280,
    jigUltBeamWidth: 2,
    jigUltDamageAtkRate: 0.12,
    jigUltHitIntervalMs: 200,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.RAGNA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.RAGNA, effectKey: 'ragna',
    label: 'BOMB / FIRE', description: '着弾点を中心に爆ぜるRスプラッシュ型。ULTは広範囲BURST。',
    shotType: 'bomb', bombSize: 'L', shotCount: 1, fireRate: 550, bulletSpeed: 680, shotPowerRate: 0.27, splashRadius: 96, splashDamageRate: 0.58,
    ultBaseType: 'burst', ultAddons: ['damage'], ultType: 'prototype_generic',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.AURA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.AURA, effectKey: 'aura',
    label: 'CLUSTER 4 / DOT', description: '着弾時に4方向へ分裂するCLUSTER型。ULTは継続ダメージ＋微回復。',
    shotType: 'cluster', clusterSize: 'M', clusterSplitCount: 4, clusterFragmentDamageRate: 0.50,
    shotCount: 1, fireRate: 550, bulletSpeed: 650, shotPowerRate: 0.27,
    ultBaseType: 'dot', ultAddons: ['heal'], ultType: 'prototype_generic',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.SHION] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.SHION, effectKey: 'shion',
    label: 'SHOTGUN / DELAY',
    description: '高威力の単発精密射撃。ULT「黒羽葬鐘」は敵全体へ呪印を刻み、時間差で闇撃を起こした後、敵の攻撃力を弱体化する。',
    ultDescription: '敵全体へ黒羽の呪印を刻む。1.2秒後にATK×2.8の闇属性ダメージを与え、その後6秒間、敵から受ける非即死ダメージを30%軽減する。敵弾消去・スタン・無敵は発生しない。',
    ultName: '黒羽葬鐘',
    shotType: 'shotgun', shotCount: 1, fireRate: 600, bulletSpeed: 1400, shotPowerRate: 0.44,
    ultGainPerHit: 3.600,
    ultType: 'shion_delayed_curse',
    ultDelayMs: 1200,
    ultDamageAtkMultiplier: 2.8,
    ultDebuffDurationMs: 6000,
    ultEnemyDamageMultiplier: 0.70,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.ORION] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.ORION, effectKey: 'orion',
    label: 'SHOTGUN / BARRIER CLEAR', description: '高威力の単発精密射撃。ULTで敵の属性バリアを解除し、敵全体へダメージを与える。',
    shotType: 'shotgun', shotCount: 1, fireRate: 600, bulletSpeed: 1400, shotPowerRate: 0.44,
    ultGainPerHit: 3.600,
    ultName:'星界の解放',
    ultDescription:'盤面の敵全員の属性バリアを解除し、敵全体へATK×2.0のダメージを与える。',
    ultBaseType:'beam', ultAddons:['damage','barrier_clear'], ultType:'ryune_absolute_lethe',
    ultDamageAtkMultiplier:2.0,
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
    description: '深いJ字軌道を描く2発ホーミング射撃。ULTは敵陣にブラックホールを生成し、敵を吸引・拘束しながら継続ダメージを与える。',
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
  // build1248: ID35 / 37 / 38 正式プロフィール復帰
  // ============================================================
  SHOOTING_CHARACTERS[CHARACTER_ID.GISELLE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.GISELLE,
    effectKey: 'giselle',
    label: 'ORBIT / ATK FIELD',
    description: '水属性の2発ORBIT。ULTは敵弾を消去し、10秒間ATK×1.3の強化フィールドを展開する。',
    ultDescription: '発動時に画面内の敵弾をすべて消去。フィールド中央へ円形のATK UP領域を10秒間展開し、領域内の操作キャラのATKを1.3倍にする。',
    ultName: 'AQUA FIELD',
    ultType: 'wolf_atk_field',
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
    burstNeed: 30,
    ultGainPerHit: 0.75,
    ultFieldDurationMs: 10000,
    ultFieldAtkMultiplier: 1.3,
    ultFieldRadius: 112,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.TOYFEL] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.TOYFEL,
    effectKey: 'toyfel',
    label: 'BOMB / DUAL BLACK HOLE',
    description: '闇属性のBOMB M。ULTは左右端にブラックホールを7秒間展開し、敵弾を吸収する。',
    ultDescription: '発動時の自機Y座標に合わせ、画面左右端へ2つのブラックホールを7秒間展開。敵弾を吸収する。',
    ultName: 'DUAL BLACK HOLE',
    ultType: 'toyfel_double_black_hole',
    shotType: 'bomb',
    bombSize: 'M',
    shotCount: 1,
    fireRate: 550,
    bulletSpeed: 660,
    shotPowerRate: 0.27,
    splashRadius: 76,
    splashDamageRate: 0.55,
    burstNeed: 30,
    ultGainPerHit: 0.60,
    toyfelBlackHoleDurationMs: 7000,
    toyfelBlackHoleSize: 96,
    toyfelBlackHoleEdgeInset: 34,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.CHLOE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.CHLOE,
    effectKey: 'chloe',
    label: 'BOMB / ELEMENT PAINT',
    description: '光属性のBOMB M。ULT「虹のかかる世界」は6属性の貫通弾を同時に放ち、命中した敵の属性を書き換える。',
    ultDescription: '無・火・水・木・闇・光の6属性弾を同時発射。全弾貫通し、命中ごとに対象属性を上書きする。',
    ultName: '虹のかかる世界',
    ultType: 'painter_rainbow_world',
    shotType: 'bomb',
    bombSize: 'M',
    shotCount: 1,
    fireRate: 550,
    bulletSpeed: 660,
    shotPowerRate: 0.27,
    splashRadius: 76,
    splashDamageRate: 0.55,
    burstNeed: 30,
    ultGainPerHit: 0.60,
    paintSpreadDamageAtkMultiplier: 1.75,
    paintSpreadSpeed: 560,
  });


  // ============================================================
  // SIGMA-IX：DAILY RAIDクリア報酬
  // ============================================================
  // build1219: レオナクロス(ID39)を正式にShooting masterへ復帰。
  // CH03-04の編成候補として表示し、既存coreのTRAP挙動を使用する。
  SHOOTING_CHARACTERS[CHARACTER_ID.LEONA_CROSS] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.LEONA_CROSS,
    effectKey: 'testchan',
    label: 'TRAP / PHOTON BUSTER',
    description: '闇属性の設置型TRAPで敵を迎撃するテクニカル型。最大3基まで設置可能。ULTは闇属性の極太レーザーを5秒間照射する。',
    ultDescription: '正面へ極太レーザーを5秒間連続照射する。0.25秒ごとにATK×0.35のダメージを与え、全段命中で最大ATK×7.0。敵弾消去・スタン・無敵は発生しない。',
    ultName: '対神性滅焼破壊砲 -フォトンバスター 202-',
    ultType: 'testchan_black_ship',
    moveSpeed: 400,

    // ---- 通常ショット：TRAP ----
    shotType: 'trap',
    shotStyle: 'remna',
    shotElement: 'dark',
    shotPowerRate: 0.95,
    shotOffsetY: 30,
    trapMaxPlaced: 3,
    trapCountdownMs: 3000,
    trapExplosionRadius: 88,
    trapPreDeployDamageRate: 0.50,
    trapThrowSpeed: 560,
    trapPlaceOffsetY: 146,

    // ---- ULT ----
    burstNeed: 32,
    ultGainPerHit: 1.0,
    coreTop: '38%',
    ultBeamDurationMs: 5000,
    ultBeamTickMs: 250,
    ultBeamTickAtkMultiplier: 0.35,
    ultBeamWidth: 62,
    ultBeamElement: 'dark',
  });

  // ============================================================
  // build1252: シャオラン / 限定SR FIRE
  // SPREADで集敵後の密着火力を狙う。ULT中も通常ショットを継続可能。
  // ============================================================
  SHOOTING_CHARACTERS[CHARACTER_ID.KUREHA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.KUREHA,
    effectKey: 'kureha',
    label: 'SPREAD / FIRE BLACK HOLE',
    description: 'FIRE属性の5WAY SPREAD。ULTは敵陣に炎のブラックホールを展開し、通常敵を中心へ集めながら5秒間継続ダメージを与える。ULT中も通常ショットを継続できる。',
    ultDescription: '敵陣へ炎のブラックホールを展開。5秒間、通常敵を一か所へ吸引しながら0.25秒ごとにFIRE属性ダメージを与え、全時間でATK×3.0相当。ボスは吸引しないが継続ダメージは有効。発動中も通常ショットを撃ち続けられる。',
    ultName: '紅蓮坩堝',
    ultType: 'kureha_fire_black_hole',
    moveSpeed: 400,
    fireRate: 300,
    bulletSpeed: 900,
    shotPowerRate: 0.070,
    shotType: 'spread',
    shotCount: 5,
    shotAngleStep: 0.115,
    shotStyle: 'kureha',
    shotElement: 'fire',
    shotOffsetY: 40,
    burstDamage: 0,
    burstNeed: 32,
    ultGainPerHit: 0.45,
    coreTop: '38%',
    blackHoleTravelSpeed: 760,
    blackHoleDurationMs: 5000,
    blackHoleSize: 170,
    blackHolePullStrength: 12.0,
    blackHoleTargetY: 112,
    blackHoleEnemyStopRadius: 10,
    blackHoleBossStopRadius: 18,
    blackHoleDamageAtkMultiplier: 3.0,
    blackHoleDamageTickMs: 250,
    blackHolePullBoss: false,
    blackHolePauseEnemyAttacks: false,
    blackHoleDamageElemental: true,
    blackHoleStyle: 'fire',
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.TESTCHAN] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.TESTCHAN,
    effectKey: 'testchan',
    label: 'TRI-LASER / BLACK SHIP',
    description: '未来から来たアンドロイド、テスト。3WAYの緑色レーザーを照射するSR火力型。ULT「ブラックシップ」は5秒間、正面へ極太レーザーを照射する。弾幕消去・スタン等の追加効果はなく、純粋な高火力特化。',
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
    dark: 'images/type_dark.webp',
    light: 'images/type_light.webp',
  });

  function getShootingRosterElementIcon(element) {
    const raw = Array.isArray(element) ? element[0] : element;
    const key = String(raw || 'neutral').trim().toLowerCase();
    return SHOOTING_ELEMENT_ICON[key] || SHOOTING_ELEMENT_ICON.neutral;
  }

  // build1146: キャラ一覧とパーティセレクトで共通利用する基本表示順。
  // ストーリー主要キャラを先頭、ラテルナ / SIGMA-IX / ノアを末尾固定。
  const SHOOTING_STORY_FIRST_ORDER = Object.freeze([1, 5, 3, 28, 39, 20, 24, 30, 25]);
  const SHOOTING_LAST_ORDER = Object.freeze([32, 50, 52]);

  function getShootingBaseOrderRank(charaId) {
    const id = Number(charaId || 0);
    const storyIndex = SHOOTING_STORY_FIRST_ORDER.indexOf(id);
    if (storyIndex >= 0) return storyIndex;

    const lastIndex = SHOOTING_LAST_ORDER.indexOf(id);
    if (lastIndex >= 0) return 100000 + lastIndex;

    return 1000 + id;
  }

  function compareShootingBaseOrder(a, b) {
    const diff = getShootingBaseOrderRank(a && a.id) - getShootingBaseOrderRank(b && b.id);
    if (diff !== 0) return diff;
    return Number((a && a.id) || 0) - Number((b && b.id) || 0);
  }

  function getShootingRosterHtml() {
    return Object.values(SHOOTING_CHARACTERS)
      .sort(compareShootingBaseOrder)
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
  // build1282: 恒常R 5体。既存ショット/ULTエンジンを再利用する。
  // build1436: キョウはベロニカの戦闘性能（SHOT/ULT）を流用するが、
  // 完成済みのベロニカをそのまま展開すると画像・属性・HP/ATK・表示倍率までベロニカになり、
  // さらにHP/ATKへR倍率(0.8)が二重に掛かっていた。
  // マスター由来の項目は取り除き、buildShootingCharacter()でキョウ自身のマスターから付け直す。
  const {
    image: _veronicaImage, panelImage: _veronicaPanel, cutinImage: _veronicaCutin,
    element: _veronicaElement, hp: _veronicaHp, atk: _veronicaAtk, rarity: _veronicaRarity,
    uiScale: _veronicaUiScale, name: _veronicaName,
    ...VERONICA_BATTLE_PROFILE
  } = SHOOTING_CHARACTERS[22];
  SHOOTING_CHARACTERS[42] = buildShootingCharacter({ ...VERONICA_BATTLE_PROFILE, id:42, name:getShootingCharacterMaster(42).name, effectKey:'kyou', ultType:'veronica_brass_punch', ultName:'一天突破', description:'真正面の超近接打撃。ULTは狭い射程へ一撃を叩き込み、命中時ATK×7.0のダメージを与える。' });
  SHOOTING_CHARACTERS[45] = buildShootingCharacter({ ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id:45, effectKey:'kirimaru', shotType:'spread', shotCount:5, fireRate:500, bulletSpeed:650, shotPowerRate:0.20, ultType:'jig_scramble_ray', ultName:'水鏡乱反射', ultDescription:'水属性の反射レーザーを5秒間展開する。', jigUltDurationMs:5000, jigUltBeamCount:6, jigUltBeamSpeed:520, jigUltBeamLength:280, jigUltBeamWidth:2, jigUltDamageAtkRate:0.12, jigUltHitIntervalMs:200 });
  SHOOTING_CHARACTERS[43] = buildShootingCharacter({ ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id:43, effectKey:'suzu', shotType:'parallel', shotCount:2, shotSpacing:28, fireRate:500, bulletSpeed:640, shotPowerRate:0.14, ultType:'suzu_bullet_silence', suzuBulletSilenceMs:3500, ultName:'静寂の森', ultDescription:'敵弾を全消去し、3.5秒間新たな敵弾を封じる。敵の移動は継続。' });
  SHOOTING_CHARACTERS[46] = buildShootingCharacter({ ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id:46, effectKey:'airena', shotType:'charge', chargeSize:'M', shotStyle:'kaina-charge', fireRate:0, bulletSpeed:760, shotCount:1, chargeMinMs:120, ultType:'airena_atk_item', ultName:'光の祝福', ultDescription:'ATK1.5倍・5秒のアイテムを1個出現させる。', itemAtkMultiplier:1.5, itemAtkDurationMs:5000 });
  SHOOTING_CHARACTERS[44] = buildShootingCharacter({ ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id:44, effectKey:'meloria', shotType:'piercing', shotCount:1, fireRate:530, bulletSpeed:720, shotPowerRate:0.28, ultType:'meloria_stun', ultName:'冥府の宣告', ultDescription:'敵全員を5秒スタン。各敵に20%の確率で最大HP50%のダメージ。', ultStunMs:5000, meloriaPercentChance:0.20, meloriaMaxHpDamageRate:0.50 });

  // build1308 — 恒常R 5体。属性・画像・R倍率は上の共通マスターが正本。
  // ULTは既存の射撃エンジンを再利用。空欄のメグメグSHOTは暫定的にジグのLASER M。
  SHOOTING_CHARACTERS[CHARACTER_ID.LINLIN] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON,
    id: CHARACTER_ID.LINLIN, effectKey:'linlin',
    label:'PARALLEL / HEAL', description:'木属性のPARALLEL 2連射。ULTで敵弾を消去し、3.5秒間の無敵と3個の回復ハートを展開する。',
    shotType:'parallel', shotCount:2, shotSpacing:18, fireRate:170, bulletSpeed:780, shotPowerRate:0.095,
    ultName: '慈愛の光',
    ultDescription: '発動時に画面内の敵弾をすべて消去し、3.5秒間無敵になる。盤面のランダムな位置に回復ハートを3個召喚。各ハートを取得すると、取得キャラの最大HPの30%を回復する。',
    ultType: 'ange_healing_hearts', ultBaseType: 'item_summon', ultAddons: ['bullet_clear','invincible','heal'],
    ultInvincibleDurationMs: 3500, ultHeartCount: 3, ultHeartHealPercent: 0.30,
    ultHeartLifeMs: 7000, ultHeartBlinkLeadMs: 2000,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.MUUMUU] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON,
    id: CHARACTER_ID.MUUMUU, effectKey:'muumuu',
    label:'ORBIT / DARK', description:'闇属性のORBIT 2発。ULTは敵全体へ攻撃し、属性バリアを解除する。',
    shotType:'orbit', shotCount:2, shotSpacing:28, fireRate:450, bulletSpeed:520, shotPowerRate:0.165,
    orbitRadius:32, orbitAngularSpeed:11.8, orbitForwardLoopRate:0.29, orbitPhaseStep:Math.PI,
    ultName:'奥義・鵺の型',
    ultDescription:'盤面の敵全員の属性バリアを解除し、敵全体へATK×2.0のダメージを与える。',
    ultType:'ryune_absolute_lethe', ultBaseType:'beam', ultAddons:['damage','barrier_clear'],
    ultDamageAtkMultiplier:2.0,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.MEGMEG] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON,
    id: CHARACTER_ID.MEGMEG, effectKey:'megmeg',
    label:'LASER / FIRE', description:'暫定LASER M射撃。ULTは複数のレーザーを画面端で反射させて敵を攻撃する。',
    shotType:'laser', shotStyle:'megmeg', laserSize:'M', fireRate:100,
    laserWidth:10, laserHitWidth:34, laserDamageAtkRate:0.058, laserVisualHoldMs:125,
    ultName:'ディバイン・フレア',
    ultDescription:'発動時に画面内の敵弾を全消去。自身を起点に6本の反射レーザーを射出し、5秒間、画面端で反射しながら敵を貫通してダメージを与える。',
    ultType:'jig_scramble_ray', ultBaseType:'beam', ultAddons:['damage','bullet_clear'],
    jigUltDurationMs:5000, jigUltBeamCount:6, jigUltBeamSpeed:520, jigUltBeamLength:280,
    jigUltBeamWidth:2, jigUltDamageAtkRate:0.12, jigUltHitIntervalMs:200,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.CHACHA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON,
    id: CHARACTER_ID.CHACHA, effectKey:'chacha',
    label:'SPREAD / LIGHT', description:'光属性のSPREAD 5WAY。ULTは敵へ連続落雷を放ち、命中時に麻痺させる。',
    shotType:'spread', shotCount:5, fireRate:500, bulletSpeed:650, shotPowerRate:0.20,
    ultName:'フォビドゥン・ショック',
    ultDescription:'8秒間に最大16回の落雷攻撃を行う。1発ごとにATK×2.8のダメージを与え、命中時は敵を3秒間麻痺させる。',
    ultType:'forbidden_shock', ultBaseType:'damage', ultAddons:['damage','stun'],
    ninaUltDurationMs:8000, ninaUltHitCount:16, ninaUltHitAtkMultiplier:2.8,
    ninaUltParalyzeMs:3000,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.RUIRUI] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON,
    id: CHARACTER_ID.RUIRUI, effectKey:'ruirui',
    label:'CLUSTER / AQUA', description:'水属性のCLUSTER 4分裂。ULTは周囲に円環を展開し、敵弾を減速させる。',
    shotType:'cluster', clusterSize:'M', clusterSplitCount:4, clusterFragmentDamageRate:0.5,
    shotCount:1, fireRate:550, bulletSpeed:650, shotPowerRate:0.27,
    ultName:'アビス・マレディクション',
    ultDescription:'自身を中心に円環を7秒間展開する。円環内に入った敵弾は移動速度が20%に低下し、外へ出ると元の速度へ戻る。',
    ultType:'shiina_light_ring', ultBaseType:'field', ultAddons:['enemy_bullet_slow'],
    lightRingDurationMs:7000, lightRingRadius:190, lightRingBulletSpeedMultiplier:0.2,
  });

  // build1312: ハオ / 木属性・恒常SR。CHARGEと5段階の接触起動ULT。
  SHOOTING_CHARACTERS[CHARACTER_ID.HAO] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON,
    id: CHARACTER_ID.HAO, effectKey: 'hao',
    label: 'CHARGE / FUTURE TRIGGER',
    description: '木属性のCHARGE L型。溜めた大きな波動は敵へゆるく向かって飛び、着弾すると広く破裂して周囲の敵も巻き込む。ULTで敵弾を全消去し、前方へ5段階の起動紋様を設置。触れた時点の強さで全敵へ落雷を与える。',
    // build1496: CHARGE L（威力・破裂範囲は CHARGE_SIZE_PRESETS.L）
    shotType: 'charge', chargeSize: 'L', shotStyle: 'kaina-charge', shotElement: 'wood', shotCount: 1,
    fireRate: 0, bulletSpeed: 760, chargeMinMs: 120,
    ultName: '天機・五刻の雷',
    ultDescription: '発動時に敵弾を全消去し、前方へ起動紋様を設置。接触時に全敵へ木属性落雷。0/2/4/6/8秒でLV1〜5に成長（ATK×1.0/1.8/3.0/4.0/5.0）。LV5は維持、設置後0.5秒間は接触判定なし。',
    ultType: 'hao_fivefold_trigger', ultBaseType: 'trap', ultAddons: ['bullet_clear', 'damage'],
    haoTriggerUpgradeMs: 2000, haoTriggerSafetyMs: 500,
    haoTriggerMultipliers: [1.0, 1.8, 3.0, 4.0, 5.0],
    burstNeed: 30, ultGainPerHit: 0.476,
  });

  // build1613: スマイル (ID56) — 光 SR / LASER L / びっくり箱。
  // 入手経路は未設定。ガチャ排出枠や配布処理には追加しない。
  SHOOTING_CHARACTERS[CHARACTER_ID.SMILE] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.SMILE, effectKey: 'smile',
    label: 'LASER L / SURPRISE BOX',
    description: '光属性LASER L。ULT「びっくり箱」で前方に敵弾を遮る箱を設置。3秒後に爆発し、周囲へATK×3の光属性ダメージ。ATK UP・無敵・HP回復・ULT全回復のいずれかのアイテムを1個残す。',
    shotType: 'laser', shotStyle: 'smile', laserSize: 'L',
    fireRate: 95, laserWidth: 16, laserHitWidth: 50,
    laserDamageAtkRate: 0.105, laserVisualHoldMs: 130,
    ultName: 'びっくり箱',
    ultDescription: '前方に弾幕を遮る箱を3秒間設置。時間経過で箱が開き、周囲広範囲の爆風が当たった敵にATK×3.0の光属性ダメージ。ATK×1.5（5秒）・無敵（3秒）・HP33%回復・ULT全回復のいずれか1つをランダムで出現させる。',
    ultType: 'smile_surprise_box', ultBaseType: 'summon',
    ultAddons: ['bullet_block', 'damage', 'item_summon'],
    smileBoxDurationMs: 3000, smileBoxOffsetY: 90,
    smileBoxDamageMultiplier: 3.0, smileBoxBlastRadius: 230, // build1615: 広範囲の爆風
    smileItemAtkMultiplier: 1.5, smileItemAtkDurationMs: 5000,
    smileItemInvincibleDurationMs: 3000, smileItemHealPercent: 0.33,
    burstNeed: 32, ultGainPerHit: 0.676,
    coreTop: '38%', shotOffsetY: 42,
  });

  // build1532: トワ (ID101) — 闇 SR / CHARGE M / 常闇。
  SHOOTING_CHARACTERS[CHARACTER_ID.TOWA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE,
    id: CHARACTER_ID.TOWA,
    effectKey: 'towa',
    label: 'CHARGE / ETERNAL DARKNESS',
    description: '闇属性CHARGE M型。ULT「常闇」で敵弾を全消去し、5秒間盤面を暗転させて敵の新規弾生成を封印する。',
    shotType: 'charge', chargeSize: 'M', shotStyle: 'kaina-charge',
    shotElement: 'dark', fireRate: 0, bulletSpeed: 760, shotCount: 1,
    chargeMinMs: 120, shotOffsetY: 44, coreTop: '38%',
    ultType: 'towa_eternal_darkness', ultBaseType: 'field',
    ultAddons: ['bullet_clear', 'enemy_bullet_silence'],
    ultName: '常闇',
    ultDescription: '発動時に盤面の敵弾をすべて削除。5秒間、盤面が暗転して新規敵弾の生成が停止。終了時にフェードインして通常の射撃が再開する。',
    towaDarkDurationMs: 5000,
    burstNeed: 32, burstDamage: 0, ultGainPerHit: 0.50,
  });

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

  SHOOTING_CHARACTERS[CHARACTER_ID.NINA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON, id: CHARACTER_ID.NINA, effectKey: 'nina',
    label: 'PLASMA / CHAIN',
    description: '弾を撃たず、220px圏内を暴れる電撃が接触した敵・オブジェクトへ絡みつくSRチェイン型。接続は250pxまで維持。最大4体へ伝播し、威力は100%→50%→25%→12.5%。',
    ultName: '出力最大！',
    ultDescription: '7秒間、PLASMAの威力が1.5倍、射程が2倍になる。連鎖数と発射速度は変化しない。',
    shotType: 'lightning',
    shotCount: 1,
    fireRate: 300,
    shotPowerRate: 0.28,
    lightningMaxTargets: 4,
    lightningTickCount: 4,
    lightningTickMs: 70,
    lightningChainDecay: 0.5,
    lightningAcquireRange: 220,
    lightningReleaseRange: 250,
    lightningChainRange: 160,
    ultBaseType: 'buff',
    ultAddons: ['plasma_power_up','plasma_range_up'],
    ultType: 'nina_output_max',
    ninaOutputMaxDurationMs: 7000,
    ninaOutputMaxPowerMultiplier: 1.5,
    ninaOutputMaxRangeMultiplier: 2.0,
  });

  SHOOTING_CHARACTERS[CHARACTER_ID.CONJURER] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON,
    id: CHARACTER_ID.CONJURER,
    effectKey: 'conjure',
    label: 'CONJURE / TURRET',
    description: '無機構造物を生成して戦う設置型SR。タップ中に自機前方へ設置予告を表示し、離すと半透明砲台を生成する。最大3基。各砲台は3秒間、1秒ごとに8方向へ非貫通弾を射出する。',
    ultName: 'オーバーライド・コンストラクト',
    ultDescription: '自身の左右へ追従砲台を5秒間召喚。左右それぞれ毎秒5発、計25発ずつのHOMING弾を自動射出する。HOMING弾は敵に命中すると消滅する。ULT中も通常砲台の射撃・新規設置は継続できる。',
    shotType: 'conjure',
    mainShot: { type: 'conjure' },
    shotCount: 1,
    fireRate: 1000,
    bulletSpeed: 520,
    shotPowerRate: 0.40,
    conjureMaxTurrets: 3,
    conjureLifetimeMs: 3000,
    conjureVolleyIntervalMs: 1000,
    conjureVolleyCount: 3,
    conjureBulletsPerVolley: 8,
    conjurePlaceOffsetY: 112,
    conjureTurretBulletSpeed: 520,
    burstNeed: 30,
    ultGainPerHit: 0.50,
    ultBaseType: 'summon',
    ultAddons: ['damage','homing'],
    ultType: 'conjure_homing_battery',
    conjureUltDurationMs: 5000,
    conjureUltShotIntervalMs: 200,
    conjureUltShotsPerSide: 25,
    conjureUltDamageAtkMultiplier: 0.30,
    conjureUltHomingSpeed: 680,
    conjureUltHomingTurnRate: 8.5,
    conjureUltTurretOffsetX: 54,
    conjureUltTurretOffsetY: -8,
  });


  // build1657: カミラ（102）/ オリビアの設置系CONJUREを継承。
  SHOOTING_CHARACTERS[CHARACTER_ID.CAMILLA] = buildShootingCharacter({
    ...ERI_BASE_PROFILE, ...NEW_ROSTER_COMMON,
    id: CHARACTER_ID.CAMILLA,
    effectKey: 'camilla_web',
    label: 'CONJURE / SPIDER',
    description: '1発につき蜘蛛1体を召喚（最大4体）。蜘蛛はカサカサと走って最も近い敵に張り付き、ダメージを与えて移動を3秒間封じると消える。射撃は継続する。',
    ultName: '血界・緋糸万華',
    shotType: 'conjure', mainShot: {type:'conjure'}, shotCount:1,
    fireRate:1000, shotPowerRate:0.4, bulletSpeed:520,
    conjureObjectImage:'images/chara_102_spider.webp', conjureMaxTurrets:4,
    conjureLifetimeMs:3000, conjureVolleyIntervalMs:1000, conjureVolleyCount:3,
    conjurePlaceOffsetY:112, conjureTurretBulletSpeed:520,
    // build1659: 蜘蛛は弾を撃たず、走って張り付く。1体あたりのダメージは従来の蜘蛛糸3発分（ATK×0.4×3）
    camillaSpiderAi:true, camillaSpiderSpeed:260, camillaSpiderLifeMs:6000, camillaSpiderLatchMs:260, camillaSpiderDamageRate:1.2,
    burstNeed:30, ultGainPerHit:0.5,
    ultBaseType:'bind', ultAddons:['lifesteal'], ultType:'camilla_crimson_web',
    camillaUltSecondsByLb:[3,4,5,6,7],
    camillaUltAbsorbByLb:[0.02,0.03,0.04,0.05,0.06]
  });

  // build1326: ULT説明の共通テンプレート。個別の固有名・他キャラへの参照を入れず、
  // 同じultTypeなら基本文言を同じにして性能パラメータだけを差し替える。
  // 戦闘処理・数値そのものは変更しない。
  function formatUltNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0.0';
    const rounded = Math.round(n * 100) / 100;
    return rounded.toFixed(rounded * 10 === Math.round(rounded * 10) ? 1 : 2);
  }
  function formatUltSeconds(value) {
    return String(Number((Number(value) / 1000).toFixed(2)));
  }
  // build1482: ULT説明の統一テンプレート。
  // 「同じ効果は同じ書き方」にし、キャラごとの違いは数値（時間・威力・個数）だけ。
  // 用語：敵弾を全消去／敵全体／スタン（行動停止）／吸い寄せて拘束／n秒間／ATK×n／
  //       アイテムをn個出現。拾うと〜／通常ショット。制限事項は末尾に「※」で1行。
  // 属性はULT欄の属性アイコンで示すため、本文には書かない（属性を変える効果のみ例外）。
  // 戦闘処理・数値は変更しない（数値は各キャラのパラメータ／戦闘側の既定値から生成）。
  function getCanonicalUltDescription(c) {
    const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
    const fmtNum = v => { const n = Math.round(num(v, 0) * 100) / 100; return n.toFixed(Number.isInteger(n * 10) ? 1 : 2); };
    const atk = (v, d) => 'ATK×' + fmtNum(num(v, d));
    const sec = (ms, d) => String(Number((num(ms, d) / 1000).toFixed(2))) + '秒';
    const pct = (rate, d) => Math.round(num(rate, d) * 100) + '%';
    const mul = (v, d) => String(Number(num(v, d).toFixed(2))) + '倍';
    const CLEAR = '敵弾を全消去し、';
    const note = text => '※' + text;
    const join = parts => parts.filter(Boolean).join('');

    switch (c.ultType) {
      // --- 弾消し＋全体スタン＋全体ダメージ（基本型） ---
      case 'balance_flash':
      case 'prototype_generic':
        return CLEAR + '敵全体を1.4秒間スタン。0.84秒後、敵全体に' + atk(c.ultDamageAtkMultiplier, 3.0) + 'のダメージ。';

      // --- 全体ダメージ ---
      case 'ryune_absolute_lethe':
        return '敵全体の属性バリアを解除し、敵全体に' + atk(c.ultDamageAtkMultiplier, 2.0) + 'のダメージ。';
      case 'shion_delayed_curse':
        return '敵全体に呪印を刻み、' + sec(c.ultDelayMs, 1200) + '後に' + atk(c.ultDamageAtkMultiplier, 2.8) + 'のダメージ。その後' + sec(c.ultDebuffDurationMs, 6000) + '間、受けるダメージを' + pct(1 - num(c.ultEnemyDamageMultiplier, 0.7), 0.3) + '軽減。' + note('即死攻撃は軽減しない');
      case 'sui_time_domain':
        return '自機に追従する半径' + String(num(c.suiDomainRadius, 275)) + 'pxの時空領域を' + sec(c.suiDomainDurationMs, 6000) + '間展開。領域内の敵弾を' + pct(1 - num(c.suiDomainBulletSpeedMultiplier, 0.2), 0.8) + '減速し、領域内の操作キャラのATKを' + mul(c.suiDomainAtkMultiplier, 1.3) + 'にする。' + note('敵弾全消去・回復・全体攻撃なし');
      case 'meloria_stun':
        return '敵全体を' + sec(c.ultStunMs, 5000) + '間スタン。さらに各敵に' + pct(c.meloriaPercentChance, 0.2) + 'の確率で最大HPの' + pct(c.meloriaMaxHpDamageRate, 0.5) + 'のダメージ。';

      // --- 単体・範囲攻撃 ---
      case 'veronica_brass_punch':
        return '真正面のごく狭い範囲に一撃を放ち、命中した敵に' + atk(c.ultDamageAtkMultiplier, 7) + 'のダメージ。' + note('追尾しない。範囲外ならMISS');
      case 'arno_thousand_slash':
        return CLEAR + '時間を止めて最も近い敵の目前へ移動。' + sec(c.arnoSlashDurationMs, 4000) + '間、タップするたびに' + atk(c.arnoSlashDamageAtkRate, 0.35) + 'の斬撃（最大' + String(num(c.arnoSlashMaxHits, 13)) + '回）。終了後は元の位置に戻る。';
      case 'precision_beam':
        return CLEAR + '前方に黒い手を伸ばして射線上の敵を7秒間拘束。拘束中に合計' + atk(c.ultDamageAtkMultiplier, 3.5) + 'のダメージ。';
      case 'jig_scramble_ray':
        return CLEAR + '反射レーザーを' + String(num(c.jigUltBeamCount, 6)) + '本射出。' + sec(c.jigUltDurationMs, 5000) + '間、画面端で反射しながら敵を貫通し、命中ごとに' + atk(c.jigUltDamageAtkRate, 0.12) + 'のダメージ。';
      case 'testchan_black_ship': {
        const dur = num(c.ultBeamDurationMs, 5000), tick = Math.max(1, num(c.ultBeamTickMs, 250)), rate = num(c.ultBeamTickAtkMultiplier, 0.35);
        return '正面に極太レーザーを' + sec(dur) + '間照射し、' + sec(tick) + 'ごとに' + atk(rate) + 'のダメージ（最大' + atk(rate * Math.floor(dur / tick)) + '）。';
      }
      case 'forbidden_shock':
        return sec(c.ninaUltDurationMs, 8000) + '間に最大' + String(num(c.ninaUltHitCount, 16)) + '回の落雷。1発ごとに' + atk(c.ninaUltHitAtkMultiplier, 2.8) + 'のダメージを与え、命中した敵を' + sec(c.ninaUltParalyzeMs, 3000) + '間スタン。';
      case 'noah_time_homing':
        return CLEAR + '敵全体の動きを止める。ランダムな敵に' + String(num(c.noahUltHitCount, 16)) + '回の落雷（1発' + atk(c.noahUltHitAtkMultiplier, 0.35) + 'のダメージ）。終了後、落雷を受けた敵を' + sec(c.noahUltParalyzeMs, 1500) + '間スタン。';
      case 'hao_fivefold_trigger': {
        const m = Array.isArray(c.haoTriggerMultipliers) && c.haoTriggerMultipliers.length ? c.haoTriggerMultipliers : [1, 1.8, 3, 4, 5];
        return CLEAR + '前方に紋様を設置。敵が触れると敵全体に落雷のダメージ。威力は' + sec(c.haoTriggerUpgradeMs, 2000) + 'ごとに成長（ATK×' + m.map(v => fmtNum(v)).join('→') + '）。' + note('設置後' + sec(c.haoTriggerSafetyMs, 500) + 'は反応しない');
      }
      case 'painter_rainbow_world':
      case 'painter_element_spread':
        return '6属性の弾を同時に発射。弾は敵を貫通し、命中ごとに' + atk(c.paintSpreadDamageAtkMultiplier, 1.75) + 'のダメージを与え、敵の属性をその弾の属性に変える。';

      // --- 持続ダメージ・フィールド ---
      case 'ignis_fire_wheel': {
        const tick = Math.max(1, num(c.burnTickMs, 1000)), dur = num(c.burnDurationMs, 5000), rate = num(c.burnDamageAtkRate, 0.3);
        return '火炎車を' + sec(c.fireWheelDurationMs, 3500) + '間展開。触れた敵を' + sec(dur) + '間燃焼させ、' + sec(tick) + 'ごとに' + atk(rate) + 'のダメージ（合計' + atk(rate * Math.floor(dur / tick)) + '）。';
      }
      case 'gresha_burn_field':
        return '敵陣に燃焼エリアを' + sec(c.burnFieldDurationMs, 6000) + '間展開。エリア内の敵に' + sec(c.burnFieldTickMs, 1000) + 'ごとに' + atk(c.burnFieldAtkMultiplier, 1.5) + 'のダメージ。';
      case 'eltena_black_hole': {
        const total = num(c.blackHoleDamageAtkMultiplier, 0);
        return '敵陣にブラックホールを' + sec(c.blackHoleDurationMs, 8000) + '間展開し、敵全体（ボスを含む）を吸い寄せて拘束。' +
          (total > 0 ? '効果中に合計' + atk(total) + 'のダメージ。' : note('ULT自体のダメージなし'));
      }
      case 'kureha_fire_black_hole':
        return '敵陣にブラックホールを' + sec(c.blackHoleDurationMs, 5000) + '間展開し、敵を吸い寄せる。効果中に合計' + atk(c.blackHoleDamageAtkMultiplier, 3.0) + 'のダメージ。' + note('ボスは吸い寄せない。効果中も通常ショット可');
      case 'gojo_purple':
        return '大鎌を正面に投げ、最初に当たった敵の位置で' + sec(c.gojoPurpleDurationMs, 7000) + '間停止。周囲の敵を吸い寄せて拘束（移動・攻撃も停止）。' + note('敵弾は消去しない。正面に敵がいなければMISS');

      // --- 行動妨害・防御 ---
      case 'camilla_crimson_web':
        return '盤面全体に紅い蜘蛛の巣を展開し、敵の移動を3〜7秒間止める（凸段階で変動、射撃は継続）。拘束中の敵への与ダメージの2〜6%をHP吸収。';
      case 'nem_stun':
        return '敵全体を' + sec(c.ultStunMs, 5000) + '間スタン。' + note('ULT自体のダメージなし');
      case 'towa_eternal_darkness':
        return CLEAR + sec(c.towaDarkDurationMs, 5000) + '間、盤面を常闇に包み、敵弾の新規生成を完全停止。効果終了時にフェードインして敵の射撃が再開する。';
      case 'suzu_bullet_silence':
        return CLEAR + sec(c.suzuBulletSilenceMs, 3500) + '間、敵の射撃を封じる。' + note('敵の移動は止まらない');
      case 'shiina_light_ring':
        return '自身の周りに円環を' + sec(c.lightRingDurationMs, 7000) + '間展開。円環内の敵弾を' + pct(1 - num(c.lightRingBulletSpeedMultiplier, 0.2), 0.8) + '減速。';
      case 'toyfel_double_black_hole':
        return '画面の左右端にブラックホールを2つ、' + sec(c.toyfelBlackHoleDurationMs, 7000) + '間展開。近くの敵弾を吸い込んで消す。';
      case 'rose_fortress':
        return '前方に画面幅の防御壁を' + sec(c.fortressDurationMs, 5000) + '間設置。通常の敵弾を防ぐたび操作キャラの最大HPの0.7〜1%をランダムに回復し、触れた敵に' + sec(c.fortressContactIntervalMs, 250) + 'ごとに' + atk(c.fortressContactDamageAtkRate, 1.0) + 'のダメージ。' + note('WARNING・HEAVY・レーザーは防げない。展開中は通常ショット停止');
      case 'aina_stealth':
        return sec(c.ainaStealthDurationMs, 10000) + '間、敵に狙われなくなる（発動時の位置を狙わせる）。効果中は通常ショットの威力が' + mul(c.ainaStealthShotMultiplier, 1.3) + '。' + note('敵弾は消えず、無敵にもならない');

      // --- 強化 ---
      case 'speed_storm':
        return CLEAR + '3.5秒間無敵。効果中は通常ショットの連射速度が' + mul(1 / Math.max(0.01, num(c.moonlightFireRateMultiplier, 0.6))) + '、威力が' + mul(c.moonlightPowerMultiplier, 2.47) + '。';
      case 'wolf_atk_field':
        return CLEAR + 'フィールド中央にATK強化エリアを' + sec(c.ultFieldDurationMs, 10000) + '間展開。エリア内の操作キャラのATKが' + mul(c.ultFieldAtkMultiplier, 1.5) + '。';
      case 'nina_output_max':
        return sec(c.ninaOutputMaxDurationMs, 7000) + '間、通常ショットの威力が' + mul(c.ninaOutputMaxPowerMultiplier, 1.5) + '、射程が' + mul(c.ninaOutputMaxRangeMultiplier, 2) + '。' + note('連鎖数と発射速度は変わらない');

      // --- 回復・アイテム ---
      case 'ange_healing_hearts':
        return CLEAR + sec(c.ultInvincibleDurationMs, 3500) + '間無敵。回復ハートを' + String(num(c.ultHeartCount, 3)) + '個出現。拾うと最大HPの' + pct(c.ultHeartHealPercent, 0.3) + 'を回復。';
      case 'mimosa_item_spawn':
        return '赤・青・緑のアイテムを1個ずつ出現。拾うと、赤：' + sec(c.itemAtkDurationMs, 10000) + '間ATKが' + mul(c.itemAtkMultiplier, 1.3) + '／青：' + sec(c.itemInvincibleDurationMs, 3000) + '間無敵／緑：最大HPの' + pct(c.itemHealPercent, 0.3) + 'を回復。' + note('効果は拾ったキャラのみ');
      case 'airena_atk_item':
        return 'アイテムを1個出現。拾うと' + sec(c.itemAtkDurationMs, 5000) + '間ATKが' + mul(c.itemAtkMultiplier, 1.5) + '。' + note('効果は拾ったキャラのみ');

      // --- 召喚 ---
      case 'mito_summon_double':
        return '自身のHP・ATK・通常ショットを引き継ぐ召喚獣を' + sec(c.summonDurationMs, 8000) + '間召喚。召喚獣は自動で移動・射撃し、最後まで耐えると残りHP分だけ本体を回復。' + note('召喚獣の攻撃ではULTゲージが増えない');
      case 'clarine_decoy':
        return '自機の目の前に大きなデコイを1体、' + sec(c.decoyDurationMs, 4000) + '間設置。デコイは敵弾を遮りながら、' + sec(c.decoyFireIntervalMs, 210) + 'ごとに' + String(num(c.decoyShotWays, 8)) + '方向へ散弾を撃つ（1発' + fmtNum(c.decoyBulletDamage) + 'ダメージ）。' + note('壊れず、爆発もしない');
      case 'conjure_homing_battery':
        return '左右に追従砲台を' + sec(c.conjureUltDurationMs, 5000) + '間召喚。各砲台が' + sec(c.conjureUltShotIntervalMs, 200) + 'ごとにホーミング弾を撃つ（各' + String(num(c.conjureUltShotsPerSide, 25)) + '発・1発' + atk(c.conjureUltDamageAtkMultiplier, 0.3) + 'のダメージ）。' + note('ULT中も通常の砲台は使える');
      default: return null;
    }
  }
  // ステータス画面・提供割合・図鑑は同じ戦闘プロファイルを参照する。
  Object.values(SHOOTING_CHARACTERS).forEach(c => {
    const description = getCanonicalUltDescription(c);
    if (description) c.ultDescription = description;
  });

  window.ShootingCharacters = Object.freeze({
    CHARACTER_ID,
    SHOOTING_CHARACTER_MASTER,
    CHARACTER_CATALOG,
    SHOOTING_CHARACTERS,
    SHOOTING_RARITY,
    RARITY_STAT_MULTIPLIER,
    SHOT_VARIANTS,
    CHARGE_SIZE_PRESETS,
    PARTY_SIZE: 3,
    SWITCH_COOLDOWN_MS: 5000,
    getShootingCharacterMaster,
    getShootingRarity,
    getShootingRarityMultiplier,
    getOwnedShootingInstance,
    isShootingCharacterOwned,
    SHOOTING_STORY_FIRST_ORDER,
    SHOOTING_LAST_ORDER,
    getShootingBaseOrderRank,
    compareShootingBaseOrder,
    getShootingRosterHtml,
  });
  // 旧UI互換。実体は上の統合マスターのみ。
  window.CHARACTERS = CHARACTER_CATALOG;
})();

// classic-script global binding
var CHARACTERS = window.ShootingCharacters.CHARACTER_CATALOG;
