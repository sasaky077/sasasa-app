// remnant_blessings.js
// Remnant加護のマスターデータ。
// battle_32.js より前に読み込むこと。

(function () {
  'use strict';

  const STORAGE_KEY = 'zeraphia_remnants_owned_v1';

  const REMNANT_BLESSINGS = {
    remnant_01: {
      id: 'remnant_01',
      remnantName: 'オーバーシア',
      name: 'オーバーシアの加護',
      panelImg: 'images/remnant_01_panel.webp',
      materialName: 'オーバーシアの心核',
      maxLevel: 5,
      conditionType: 'enemy_kill_count',
      invRequiredKills: 3,
      invName: '万象観測',
      invDurationTurns: 1,

      // 「requiredCores」は、そのLvへ上げる際に必要な心核数。
      levels: {
        1: { passiveCriticalRate: 0.05, invCriticalRate: 0.60, requiredCores: 0 },
        2: { passiveCriticalRate: 0.08, invCriticalRate: 0.70, requiredCores: 1 },
        3: { passiveCriticalRate: 0.10, invCriticalRate: 0.80, requiredCores: 1 },
        4: { passiveCriticalRate: 0.12, invCriticalRate: 0.90, requiredCores: 2 },
        5: { passiveCriticalRate: 0.15, invCriticalRate: 1.00, requiredCores: 2 },
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
      requiredCores: Number(next && next.requiredCores || 0),
      nextLevel,
      text: {
        passive: `常時：critical率+${percent(lv.passiveCriticalRate)}%`,
        inv: `INV：発動ターンのみ味方全員のcritical率+${percent(lv.invCriticalRate)}%`,
        condition: `INV条件：敵を合計${Number(base.invRequiredKills || 0)}体撃破。`,
      },
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
