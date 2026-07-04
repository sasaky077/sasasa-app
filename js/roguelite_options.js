// roguelite_options.js
// ローグライトラン用：報酬マスタ定義
// 依存: なし
//
// rewardKind:
//   passive : 取得後、以降の各ステージ開始時に applyOnStart(bs) を適用
//   item    : 取得後、バトル中アイテム枠に入る使い切りアイテム

(function () {

  function pct(n) {
    return Math.round(Number(n || 0) * 100);
  }

  function addCriticalRate(unit, amount) {
    if (!unit) return;
    const base = Number(unit.criticalRate ?? unit.critRate ?? 0.10);
    unit.criticalRate = Math.max(0, Math.min(1, base + Number(amount || 0)));
    unit.critRate = unit.criticalRate;
  }

  function makeAtkUp(rate, rarity) {
    const p = pct(rate);
    return {
      id: `atk_up_${p}`,
      name: `ATK +${p}%`,
      desc: `味方全員のATKが${p}%上昇する`,
      rarity,
      icon: '⚔️',
      rewardKind: 'passive',
      applyOnStart(bs) {
        if (!Array.isArray(bs.allies)) return;
        bs.allies.forEach(u => {
          if (u && typeof u.atk === 'number') {
            u.atk = Math.round(u.atk * (1 + rate));
          }
        });
      },
    };
  }

  function makeHpUp(rate, rarity) {
    const p = pct(rate);
    return {
      id: `hp_up_${p}`,
      name: `HP +${p}%`,
      desc: `味方全員の最大HPが${p}%上昇する`,
      rarity,
      icon: '💚',
      rewardKind: 'passive',
      applyOnStart(bs) {
        if (!Array.isArray(bs.allies)) return;
        bs.allies.forEach(u => {
          if (u && typeof u.hpMax === 'number') {
            const bonus = Math.round(u.hpMax * rate);
            u.hpMax += bonus;
            u.hp = Math.min(u.hpMax, Number(u.hp || 0) + bonus);
          }
        });
      },
    };
  }

  function makeCriticalUp(rate, rarity) {
    const p = pct(rate);
    return {
      id: `critical_up_${p}`,
      name: `CRITICAL +${p}%`,
      desc: `味方全員のクリティカル率が${p}%上昇する`,
      rarity,
      icon: '✦',
      rewardKind: 'passive',
      applyOnStart(bs) {
        if (!Array.isArray(bs.allies)) return;
        bs.allies.forEach(u => addCriticalRate(u, rate));
      },
    };
  }

  const ROGUELITE_OPTIONS = [
    makeAtkUp(0.10, 'common'),
    makeAtkUp(0.15, 'rare'),
    makeAtkUp(0.20, 'epic'),

    makeCriticalUp(0.10, 'rare'),
    makeCriticalUp(0.15, 'epic'),

    makeHpUp(0.10, 'common'),
    makeHpUp(0.20, 'rare'),
  ];

  const ROGUELITE_ITEM_REWARDS = [
    {
      id: 'item_reward_heal_30',
      name: 'HP回復 30%',
      desc: '味方1体のHPを最大HPの30%回復する',
      rarity: 'common',
      icon: '💊',
      rewardKind: 'item',
      item: {
        id: 'heal_30', name: 'HP回復30%', type: 'heal', rarity: 'common',
        linkCost: 0, target: 'ally_single', value: 0.30, consume: true,
        desc: '味方1体のHPを最大HPの30%回復する。',
      },
    },
    {
      id: 'item_reward_heal_50',
      name: 'HP回復 50%',
      desc: '味方1体のHPを最大HPの50%回復する',
      rarity: 'rare',
      icon: '💊',
      rewardKind: 'item',
      item: {
        id: 'heal_50', name: 'HP回復50%', type: 'heal', rarity: 'rare',
        linkCost: 0, target: 'ally_single', value: 0.50, consume: true,
        desc: '味方1体のHPを最大HPの50%回復する。',
      },
    },
    {
      id: 'item_reward_swap_ally',
      name: '味方位置入れ替え',
      desc: '選択した味方Aと味方Bの位置を入れ替える',
      rarity: 'rare',
      icon: '🔄',
      rewardKind: 'item',
      item: {
        id: 'swap_ally', name: '味方入替', type: 'swap_ally', rarity: 'rare',
        linkCost: 0, target: 'ally_pair', consume: true,
        desc: '選択した味方Aと味方Bの位置を入れ替える。',
      },
    },
    {
      id: 'item_reward_swap_enemy',
      name: '敵位置入れ替え',
      desc: '選択した敵Aと敵Bの位置を入れ替える',
      rarity: 'rare',
      icon: '🌀',
      rewardKind: 'item',
      item: {
        id: 'swap_enemy', name: '敵入替', type: 'swap_enemy', rarity: 'rare',
        linkCost: 0, target: 'enemy_pair', consume: true,
        desc: '選択した敵Aと敵Bの位置を入れ替える。',
      },
    },
    {
      id: 'item_reward_link_1',
      name: 'LINK回復 +1',
      desc: '現在LINKを+1回復する',
      rarity: 'common',
      icon: '🔗',
      rewardKind: 'item',
      item: {
        id: 'link_recover_1', name: 'LINK+1', type: 'link_recover', rarity: 'common',
        linkCost: 0, target: 'instant', value: 1, consume: true,
        desc: '現在LINKを+1回復する。',
      },
    },
    {
      id: 'item_reward_link_2',
      name: 'LINK回復 +2',
      desc: '現在LINKを+2回復する',
      rarity: 'rare',
      icon: '🔗',
      rewardKind: 'item',
      item: {
        id: 'link_recover_2', name: 'LINK+2', type: 'link_recover', rarity: 'rare',
        linkCost: 0, target: 'instant', value: 2, consume: true,
        desc: '現在LINKを+2回復する。',
      },
    },
    {
      id: 'item_reward_shinki_max',
      name: '神気ブースト',
      desc: '任意の味方1体の神気をMAXにする',
      rarity: 'epic',
      icon: '🔥',
      rewardKind: 'item',
      item: {
        id: 'shinki_max', name: '神気MAX', type: 'shinki_max', rarity: 'epic',
        linkCost: 0, target: 'ally_single', consume: true,
        desc: '任意の味方1体の神気をMAXにする。',
      },
    },
    {
      id: 'item_reward_enemy_hp_cut_10',
      name: '敵HP削り 10%',
      desc: 'フィールド上の全敵のHPを現在HPから10%削る',
      rarity: 'rare',
      icon: '☄️',
      rewardKind: 'item',
      item: {
        id: 'enemy_hp_cut_10', name: '敵HP-10%', type: 'enemy_hp_cut_all', rarity: 'rare',
        linkCost: 0, target: 'instant', value: 0.10, consume: true,
        desc: 'フィールド上の全敵のHPを現在HPから10%削る。',
      },
    },
    {
      id: 'item_reward_guard_50',
      name: 'ガード 50%',
      desc: '1ターンの間、任意の味方1体が受けるダメージを50%カットする（追加効果は受ける）',
      rarity: 'common',
      icon: '🛡️',
      rewardKind: 'item',
      item: {
        id: 'guard_50', name: 'ガード50%', type: 'guard', rarity: 'common',
        linkCost: 0, target: 'ally_single', value: 0.50, duration: 1, consume: true,
        desc: '1ターンの間、任意の味方1体が受けるダメージを50%カットする。追加効果は受ける。',
      },
    },
    {
      id: 'item_reward_guard_70',
      name: 'ガード 70%',
      desc: '1ターンの間、任意の味方1体が受けるダメージを70%カットする（追加効果は受ける）',
      rarity: 'rare',
      icon: '🛡️',
      rewardKind: 'item',
      item: {
        id: 'guard_70', name: 'ガード70%', type: 'guard', rarity: 'rare',
        linkCost: 0, target: 'ally_single', value: 0.70, duration: 1, consume: true,
        desc: '1ターンの間、任意の味方1体が受けるダメージを70%カットする。追加効果は受ける。',
      },
    },
    {
      id: 'item_reward_guard_90',
      name: 'ガード 90%',
      desc: '1ターンの間、任意の味方1体が受けるダメージを90%カットする（追加効果は受ける）',
      rarity: 'epic',
      icon: '🛡️',
      rewardKind: 'item',
      item: {
        id: 'guard_90', name: 'ガード90%', type: 'guard', rarity: 'epic',
        linkCost: 0, target: 'ally_single', value: 0.90, duration: 1, consume: true,
        desc: '1ターンの間、任意の味方1体が受けるダメージを90%カットする。追加効果は受ける。',
      },
    },
    {
      id: 'item_reward_stun_enemy',
      name: 'スタンアイテム',
      desc: '任意の敵1体を1ターンスタンする',
      rarity: 'rare',
      icon: '⚡',
      rewardKind: 'item',
      item: {
        id: 'stun_enemy', name: 'スタン', type: 'stun_enemy', rarity: 'rare',
        linkCost: 0, target: 'enemy_single', duration: 1, consume: true,
        desc: '任意の敵1体を1ターンスタンする。',
      },
    },
  ];

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ランダム3択生成
  // passiveは重複排除、itemは消耗品なので基本的に再出現可能。
  // ただしアイテム枠が満杯ならitem報酬は出さない。
  function getRandomOptions(excludeIds) {
    const excl = Array.isArray(excludeIds) ? excludeIds : [];
    const passivePool = ROGUELITE_OPTIONS.filter(op => !excl.includes(op.id));

    let canAddItem = true;
    try {
      if (window.RogueliteRun && typeof window.RogueliteRun.getItems === 'function') {
        canAddItem = window.RogueliteRun.getItems().length < 2;
      }
    } catch (e) {
      canAddItem = true;
    }

    const itemPool = canAddItem ? ROGUELITE_ITEM_REWARDS.slice() : [];
    const pool = shuffle([...passivePool, ...itemPool]);
    return pool.slice(0, Math.min(3, pool.length));
  }

  function getOptionById(id) {
    return ROGUELITE_OPTIONS.find(op => op.id === id) ||
      ROGUELITE_ITEM_REWARDS.find(op => op.id === id) ||
      null;
  }

  window.ROGUELITE_OPTIONS = ROGUELITE_OPTIONS;
  window.ROGUELITE_ITEM_REWARDS = ROGUELITE_ITEM_REWARDS;
  window.getRandomOptions = getRandomOptions;
  window.getOptionById = getOptionById;

})();
