// remnant_blessings.js
// Remnant加護のマスターデータ。
// battle_32.js より前に読み込むこと。

(function () {
  'use strict';

  const STORAGE_KEY = 'zeraphia_remnants_owned_v1';

  const REMNANT_BLESSINGS = {
    remnant_01: {
      id: 'remnant_01', remnantName: 'オーバーシア', name: 'オーバーシアの加護',
      panelImg: 'images/remnant_01_panel.webp', materialName: 'オーバーシアの心核',
      maxLevel: 5, conditionType: 'enemy_kill_count', invRequiredKills: 3,
      invName: '万象観測', invEffectType: 'critical_up', invDurationTurns: 1,
      levels: {
        1:{passiveCriticalRate:0.05,invCriticalRate:0.60,requiredCores:0},
        2:{passiveCriticalRate:0.08,invCriticalRate:0.70,requiredCores:1},
        3:{passiveCriticalRate:0.10,invCriticalRate:0.80,requiredCores:1},
        4:{passiveCriticalRate:0.12,invCriticalRate:0.90,requiredCores:2},
        5:{passiveCriticalRate:0.15,invCriticalRate:1.00,requiredCores:2},
      },
    },
    remnant_02: {
      id: 'remnant_02', remnantName: 'イリシュ', name: 'イリシュの加護',
      panelImg: 'images/remnant_02_panel.webp', materialName: 'イリシュの心核',
      maxLevel: 5, conditionType: 'multi_target_attack', invRequiredTargets: 2,
      invName: '壊滅衝動', invEffectType: 'single_enemy_damage',
      levels: {
        1:{passiveAtkRate:0.05,invDamageRate:0.60,requiredCores:0},
        2:{passiveAtkRate:0.07,invDamageRate:0.70,requiredCores:1},
        3:{passiveAtkRate:0.09,invDamageRate:0.80,requiredCores:1},
        4:{passiveAtkRate:0.12,invDamageRate:0.90,requiredCores:2},
        5:{passiveAtkRate:0.15,invDamageRate:1.00,requiredCores:2},
      },
    },
    remnant_03: {
      id: 'remnant_03', remnantName: 'リヴィア', name: 'リヴィアの加護',
      panelImg: 'images/remnant_03_panel.webp', materialName: 'リヴィアの心核',
      maxLevel: 5, conditionType: 'enemy_kill_count', invRequiredKills: 3,
      invName: '償却の静止', invEffectType: 'all_enemy_stun', invStunTurns: 1,
      levels: {
        1:{turnStartLinkChance:0.60,requiredCores:0},
        2:{turnStartLinkChance:0.70,requiredCores:1},
        3:{turnStartLinkChance:0.80,requiredCores:1},
        4:{turnStartLinkChance:0.90,requiredCores:2},
        5:{turnStartLinkChance:1.00,requiredCores:2},
      },
    },
    remnant_04: {
      id: 'remnant_04', remnantName: 'サキエル', name: 'サキエルの加護',
      panelImg: 'images/remnant_04_panel.webp', materialName: 'サキエルの心核',
      maxLevel: 5, conditionType: 'lost_ally_exists',
      invName: '真実の再臨', invEffectType: 'revive_ally', invReviveHpRate: 0.50,
      levels: {
        1:{passiveAtkRate:0.03,passiveHpRate:0.05,invReviveChance:0.60,requiredCores:0},
        2:{passiveAtkRate:0.04,passiveHpRate:0.07,invReviveChance:0.70,requiredCores:1},
        3:{passiveAtkRate:0.05,passiveHpRate:0.10,invReviveChance:0.80,requiredCores:1},
        4:{passiveAtkRate:0.07,passiveHpRate:0.12,invReviveChance:0.90,requiredCores:2},
        5:{passiveAtkRate:0.10,passiveHpRate:0.15,invReviveChance:1.00,requiredCores:2},
      },
    },
  };

  function clampLevel(def, level) {
    const max = Number(def && def.maxLevel || 5);
    const n = Math.floor(Number(level || 1));
    return Math.min(max, Math.max(1, Number.isFinite(n) ? n : 1));
  }

  function readOwnedEntry(id) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return data && data[id] ? data[id] : null;
    } catch (_) {
      return null;
    }
  }

  function percent(rate) {
    return Math.round(Number(rate || 0) * 100);
  }

  function buildBlessingText(base, lv) {
    switch (base.id) {
      case 'remnant_02':
        return {
          passive: `常時：味方全員のATK+${percent(lv.passiveAtkRate)}%`,
          inv: `INV：敵1体に味方全員の合計ATK×${percent(lv.invDamageRate)}%のダメージ。`,
          condition: `INV条件：1度の攻撃で敵${Number(base.invRequiredTargets || 2)}体以上にダメージを与える。`,
        };
      case 'remnant_03':
        return {
          passive: `常時：ターン開始時、${percent(lv.turnStartLinkChance)}%の確率でLINK+1。`,
          inv: `INV：盤面上の敵全員を${Number(base.invStunTurns || 1)}ターンスタン。`,
          condition: `INV条件：敵を合計${Number(base.invRequiredKills || 3)}体撃破。`,
        };
      case 'remnant_04':
        return {
          passive: `常時：味方全員のATK+${percent(lv.passiveAtkRate)}%、最大HP+${percent(lv.passiveHpRate)}%。`,
          inv: `INV：LOSTした任意の味方1体を${percent(lv.invReviveChance)}%の確率で蘇生。`,
          condition: 'INV条件：味方が1体以上LOSTしている。',
        };
      default:
        return {
          passive: `常時：critical率+${percent(lv.passiveCriticalRate)}%`,
          inv: `INV：発動ターンのみ味方全員のcritical率+${percent(lv.invCriticalRate)}%`,
          condition: `INV条件：敵を合計${Number(base.invRequiredKills || 0)}体撃破。`,
        };
    }
  }

  function getRemnantBlessingById(id) {
    if (!id) return null;
    return REMNANT_BLESSINGS[id] || null;
  }

  function resolveRemnantBlessingById(id, explicitLevel) {
    const base = getRemnantBlessingById(id);
    if (!base) return null;

    const owned = readOwnedEntry(id);
    const level = clampLevel(base, explicitLevel != null ? explicitLevel : (owned && owned.blessingLevel));
    const lv = base.levels[level] || base.levels[1];
    const nextLevel = level < base.maxLevel ? level + 1 : null;
    const next = nextLevel ? base.levels[nextLevel] : null;

    return {
      ...base,
      level,
      passiveCriticalRate: Number(lv.passiveCriticalRate || 0),
      invCriticalRate: Number(lv.invCriticalRate || 0),
      passiveAtkRate: Number(lv.passiveAtkRate || 0),
      passiveHpRate: Number(lv.passiveHpRate || 0),
      invDamageRate: Number(lv.invDamageRate || 0),
      turnStartLinkChance: Number(lv.turnStartLinkChance || 0),
      invReviveChance: Number(lv.invReviveChance || 0),
      requiredCores: Number(next && next.requiredCores || 0),
      nextLevel,
      text: buildBlessingText(base, lv),
    };
  }

  // バトル側は現在所持Lvを解決した定義を受け取る。
  function cloneRemnantBlessingById(id) {
    const def = resolveRemnantBlessingById(id);
    return def ? JSON.parse(JSON.stringify(def)) : null;
  }

  window.REMNANT_BLESSINGS = REMNANT_BLESSINGS;
  window.getRemnantBlessingById = getRemnantBlessingById;
  window.resolveRemnantBlessingById = resolveRemnantBlessingById;
  window.cloneRemnantBlessingById = cloneRemnantBlessingById;
})();
