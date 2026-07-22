// battle_32.js
// 32マス共有盤面バトルシステム（MVP）
// 依存: battle_range_32.js, characters_32.js, remnant_blessings.js
// 既存 battle.js / battle_range.js / battle_swipe.js には一切触れない
//
// 使い方（index.html）:
//   <script src="js/battle_range_32.js"></script>
//   <script src="js/characters_32.js"></script>
//   <script src="js/battle_32.js"></script>
//   window.Battle32.start(config)  で起動

(function () {

  // ============================================================
  // 定数
  // ============================================================
  const BR = window.BattleRange32;

  const BOARD_ROWS = 8;
  const BOARD_COLS = 5;

  // ローグライト専用：主人公エリは最初から1st固定・盤面配置済み
  const ROGUELITE_FIXED_FIRST_CHARA_ID = 1;
  const ROGUELITE_ERI_START_POS = { row: 7, col: 2 }; // 主人公エリの初期配置

  // ============================================================
  // 属性相性
  // ============================================================
  // ロゴス → ケイオス / ケイオス → ミスティス / ミスティス → ロゴス
  const ELEMENT_RATE_32 = {
  chaos:  { logos: 1.25, mystis: 0.80, chaos: 1.00 },
  logos:  { mystis: 1.25, chaos: 0.80, logos: 1.00 },
  mystis: { chaos: 1.25, logos: 0.80, mystis: 1.00 },
};

  const ELEMENT_LABEL_32 = {
    logos:  'ロゴス',
    chaos:  'ケイオス',
    mystis: 'ミスティス',
  };

  const ELEMENT_CANONICAL_ORDER_32 = ['logos', 'mystis', 'chaos'];

  function normalizeElements32(element) {
    if (Array.isArray(element)) {
      return [...new Set(element.map(v => String(v || '').trim()).filter(Boolean))]
        .filter(v => ELEMENT_LABEL_32[v]);
    }

    if (typeof element === 'string') {
      const raw = element.trim();
      if (!raw) return [];

      // 対応表記:
      // 'logos'
      // 'logos+chaos'
      // 'logos_mystis'
      // 'logos,mystis'
      // 'logos mystis'
      const parts = raw
        .split(/[+,\s/|]+|_/)
        .map(v => v.trim())
        .filter(Boolean)
        .filter(v => ELEMENT_LABEL_32[v]);

      if (parts.length) return [...new Set(parts)];
      return ELEMENT_LABEL_32[raw] ? [raw] : [];
    }

    return [];
  }

  function getElementKey32(element) {
    const list = normalizeElements32(element);
    if (!list.length) return '';
    return ELEMENT_CANONICAL_ORDER_32
      .filter(e => list.includes(e))
      .join('_');
  }

  function getElementRate32(sourceElement, targetElement) {
    const sources = normalizeElements32(sourceElement);
    const targets = normalizeElements32(targetElement);
    if (!sources.length || !targets.length) return 1.0;

    let hasAdvantage = false;
    let hasDisadvantage = false;

    sources.forEach(s => {
      targets.forEach(t => {
        const rate = (ELEMENT_RATE_32[s] && ELEMENT_RATE_32[s][t]) || 1.0;
        if (rate > 1) hasAdvantage = true;
        if (rate < 1) hasDisadvantage = true;
      });
    });

    // 複属性は「有利属性が増える」ことを優先する。
    // 例: logos+chaos → mystis は logos 側で有利、chaos 側で不利だが、攻撃時は有利扱い。
    // 一方、防御時も弱点属性が増えるため、相手側から見た時は有利を取られやすくなる。
    if (hasAdvantage) return 1.25;
    if (hasDisadvantage) return 0.80;
    return 1.0;
  }

  function getElementLabel32(element) {
    const list = normalizeElements32(element);
    if (!list.length) return element || '無属性';
    return ELEMENT_CANONICAL_ORDER_32
      .filter(e => list.includes(e))
      .map(e => ELEMENT_LABEL_32[e])
      .join('+');
  }

  function getElementMatchText32(sourceElement, targetElement) {
    const rate = getElementRate32(sourceElement, targetElement);
    if (rate > 1) return '有利';
    if (rate < 1) return '不利';
    return '';
  }


  // ============================================================
  // LINK コスト定数
  // ============================================================
  const LINK_COST = {
    summon: { r: 4, sr: 5, ur: 6 },
    move: 1,
    skill: 99,
    ult: 99,
    itemDefault: 1,
  };

  // ターン数に応じたLINK最大値
  function calcLinkMax(turn) {
  return 6;
}

  // LINK消費ヘルパー
  function _canSpendLink(cost) {
    return _bs && _bs.link && _bs.link.current >= cost;
  }

  function _spendLink(cost, label) {
    if (!_canSpendLink(cost)) {
      _log('LINKが不足しています');
      return false;
    }
    _bs.link.current -= cost;
    if (label) _log(`${label}：LINK ${cost} 消費`);
    return true;
  }

  // ボスのコア直接破壊間隔（現在は無効化）
  // const BOSS_LINE_ATTACK_INTERVAL = 5;
  const BOSS_LINE_ATTACK_RATE = 1.35;

  // ボス3ターンに1度の位置入れ替え攻撃間隔
  const BOSS_SWAP_INTERVAL = 3;

  // ボス予兆攻撃の間隔（ターン数）
  const BOSS_WARN_INTERVAL = 4;
  // ボス予兆攻撃のダメージ倍率（ATK比）
  const BOSS_WARN_RATE = 0.90;

  // オーバーシア専用行動
  const OVERSEER_ULT_INTERVAL = 6;
  const OVERSEER_PATTERN_RATE = 1.0;
  const OVERSEER_GRID_DAMAGE = 150;

  // ============================================================
  // CRITICAL
  // ============================================================
  // criticalRate は 0.10 = 10% として扱う。
  // critical_up / critical_down は statusEffects に乗せれば将来バフとして使える。
  const CRITICAL_DAMAGE_RATE_32 = 1.5;
  const DEFAULT_ALLY_CRITICAL_RATE_32 = 0.10;
  const DEFAULT_ENEMY_CRITICAL_RATE_32 = 0.05;

  // 加護マスターデータは remnant_blessings.js に分離。
  // index.htmlでは remnant_blessings.js を battle_32.js より前に読み込むこと。
  function getBlessingDef32(id) {
    if (!id) return null;

    if (typeof window.cloneRemnantBlessingById === 'function') {
      return window.cloneRemnantBlessingById(id);
    }

    const defs = window.REMNANT_BLESSINGS;
    if (defs && defs[id]) {
      return JSON.parse(JSON.stringify(defs[id]));
    }

    console.error(`[Battle32] 加護定義が見つかりません: ${id}。remnant_blessings.js の読み込み順を確認してください。`);
    return null;
  }

  function makeBlessingState32(id) {
    const def = getBlessingDef32(id);
    if (!def) return null;
    return {
      ...def,
      killCount: 0,
      used: false,
      activeTurn: null,
      defeatedEnemyUids: [],
      conditionMet: false,
      multiTargetMax: 0,
    };
  }


  

  // ============================================================
  // 内部状態
  // ============================================================
  let _bs = null;   // バトルステート
  let _cb = null;   // コールバック群

  // ターン演出・フェーズ進行の二重起動防止
  let _allyTurnFlowRunning = false;
  let _enemyTurnFlowRunning = false;
  let _battleFlowToken = 0;

  // MAX COMBOのLINK報酬を同一コンボ連鎖内で1回だけ付与するための識別子
  let _maxComboRewardActionId = null;
 
  // ============================================================
  // 演出ユーティリティ（UI との橋渡し）
  // ============================================================

  // ── テンポ定数（ここを変えると全体速度が変わる） ──
  const B32_WAIT = {
  turn:        1000,
  guide:       800,
  phase:       800,
  action:      800,
  move:        700,
  attack:      900,
  charEnd:     3700,
  turnEnd:     800,
  enemyTurn:   900,
  enemyAction: 800,
  enemyEnd:    900,
  afterText:   160,
};

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function _renderUI() {
    if (typeof window.renderBattle32UI === 'function') {
      window.renderBattle32UI();
    }
  }

  function _lockInput() {
    if (typeof window.b32LockInput === 'function') window.b32LockInput();
  }

  function _unlockInput() {
    if (typeof window.b32UnlockInput === 'function') window.b32UnlockInput();
  }

  function _centerText(main, sub, duration) {
    if (typeof window.showBattle32CenterText === 'function') {
      window.showBattle32CenterText(main, sub, duration);
    }
  }

  // 表示 + 完全消滅まで await できるバージョン
  // UI側に showBattle32CenterTextAsync があればそれを使い、
  // なければ duration + フェードアウト時間を wait する
  async function _centerTextWait(main, sub, duration) {
    if (typeof window.showBattle32CenterTextAsync === 'function') {
      await window.showBattle32CenterTextAsync(main, sub, duration);
    } else {
      _centerText(main, sub, duration);
      await wait(duration + 500);   // 500ms = フェードアウト余裕
    }
    await wait(B32_WAIT.afterText); // 消えた後の一息
  }

  // ============================================================
  // ターン制限アラート演出
  // ============================================================
  // 残り3ターン以下で、画面フチの赤点滅 + 中央ターン表示の赤点滅/拡大を行う。
  // battle_32_ui.js 側の中央テキスト関数は汎用のまま使い、
  // ここで一時的にCSSクラスを付与して危険演出だけ上書きする。
  function _injectTurnDangerStyle() {
    if (document.getElementById('b32-turn-danger-style')) return;

    const style = document.createElement('style');
    style.id = 'b32-turn-danger-style';
    style.textContent = `
#b32-turn-danger-frame {
  position: fixed;
  inset: 0;
  z-index: 999998;
  pointer-events: none;
  opacity: 0;
  box-sizing: border-box;
  border: 0 solid rgba(255,40,60,0);
  transition: opacity .16s ease;
}
#b32-turn-danger-frame.active {
  opacity: 1;
  animation: b32TurnDangerEdge 900ms steps(2, end) infinite;
}
#b32-turn-danger-frame::before,
#b32-turn-danger-frame::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}
#b32-turn-danger-frame::before {
  box-shadow:
    inset 0 0 0 3px rgba(255,55,70,.82),
    inset 0 0 22px rgba(255,20,30,.62),
    inset 0 0 62px rgba(180,0,20,.34);
}
#b32-turn-danger-frame::after {
  background:
    linear-gradient(90deg, rgba(255,20,35,.28), transparent 18%, transparent 82%, rgba(255,20,35,.28)),
    linear-gradient(180deg, rgba(255,20,35,.24), transparent 16%, transparent 84%, rgba(255,20,35,.24));
  mix-blend-mode: screen;
}
@keyframes b32TurnDangerEdge {
  0%, 100% { filter: brightness(1); opacity: .44; }
  50% { filter: brightness(1.85); opacity: 1; }
}
#b32-center-text.b32ct-turn-danger::before {
  background: radial-gradient(circle at 50% 50%, rgba(120,0,0,.62), rgba(0,0,0,.60) 46%, transparent 76%);
}
#b32-center-text.b32ct-turn-danger .b32ct-main {
  color: #ff3b48 !important;
  font-size: clamp(34px, 10vw, 62px) !important;
  letter-spacing: 8px !important;
  text-shadow:
    0 0 8px rgba(255,255,255,.84),
    0 0 18px rgba(255,40,55,.95),
    0 0 52px rgba(255,0,30,.82),
    0 3px 6px rgba(0,0,0,1) !important;
  animation: b32TurnDangerText 560ms ease-in-out infinite;
}
#b32-center-text.b32ct-turn-danger .b32ct-sub {
  color: #ffd0d0 !important;
  font-size: clamp(15px, 4.2vw, 21px) !important;
  font-weight: 800 !important;
  text-shadow:
    0 0 10px rgba(255,60,80,.95),
    0 2px 4px rgba(0,0,0,1) !important;
  animation: b32TurnDangerSub 560ms ease-in-out infinite;
}
@keyframes b32TurnDangerText {
  0%, 100% { transform: scale(1); opacity: .86; }
  50% { transform: scale(1.13); opacity: 1; }
}
@keyframes b32TurnDangerSub {
  0%, 100% { transform: scale(1); opacity: .72; }
  50% { transform: scale(1.08); opacity: 1; }
}
    `;
    document.head.appendChild(style);
  }

  function _setTurnDangerAlert(active) {
    _injectTurnDangerStyle();

    let el = document.getElementById('b32-turn-danger-frame');
    if (!el) {
      el = document.createElement('div');
      el.id = 'b32-turn-danger-frame';
      document.body.appendChild(el);
    }

    if (active) {
      el.classList.add('active');
      el.style.display = 'block';
    } else {
      el.classList.remove('active');
      el.style.opacity = '0';
      setTimeout(() => {
        if (!el.classList.contains('active')) el.style.display = 'none';
      }, 180);
    }
  }

  async function _centerTextWaitTurn(main, sub, duration, isDanger) {
    if (!isDanger) {
      await _centerTextWait(main, sub, duration);
      return;
    }

    _injectTurnDangerStyle();

    // showBattle32CenterTextAsync だとクラス付与のタイミングが取りづらいため、
    // 危険ターンだけは同期版を呼んでからclassを足す。
    _centerText(main, sub, duration);

    const center = document.getElementById('b32-center-text');
    if (center) center.classList.add('b32ct-turn-danger');

    await wait((duration || 1200) + 360);

    const current = document.getElementById('b32-center-text');
    if (current) current.classList.remove('b32ct-turn-danger');

    await wait(B32_WAIT.afterText);
  }

  // ============================================================
  // ユーティリティ
  // ============================================================
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ============================================================
  // 中断保存ヘルパー（index.html 側の saveBattle32ResumeState を呼ぶ）
  // ============================================================
  function _saveResume() {
    if (typeof window.saveBattle32ResumeState === 'function') {
      window.saveBattle32ResumeState('battle-action');
    }
  }

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }


  // ============================================================
  // 所持データ反映（共鳴Lv後ステータス）
  // ============================================================
  // Battle32 / Roguelite は partyIds（キャラID）だけで起動するため、
  // ここで所持BOX・図鑑データから最新の共鳴後 HP / ATK を引き当てる。
  // 同一キャラを複数所持している場合は、現在のUI仕様では個体指定ではなく
  // charaId指定のため、もっとも共鳴Lvが高い個体を採用する。
  function _getOwnedEntryForBattle(charaId) {
    const idNum = Number(charaId);
    const candidates = [];

    // box: 所持BOX（全個体）
    if (Array.isArray(window.box)) {
      window.box.forEach(entry => {
        if (entry && Number(entry.id) === idNum) candidates.push(entry);
      });
    }

    // collected: 図鑑用代表個体
    if (window.collected && window.collected[idNum]) {
      candidates.push(window.collected[idNum]);
    }

    if (candidates.length === 0) return null;

    // もっとも共鳴Lvが高い個体を採用。同Lvなら stats がある方を優先。
    candidates.sort((a, b) => {
      const lbA = Number(a.limitBreak || 0);
      const lbB = Number(b.limitBreak || 0);
      if (lbA !== lbB) return lbB - lbA;
      const hasStatsA = a.stats && (a.stats.HP != null || a.stats.ATK != null) ? 1 : 0;
      const hasStatsB = b.stats && (b.stats.HP != null || b.stats.ATK != null) ? 1 : 0;
      return hasStatsB - hasStatsA;
    });

    return candidates[0];
  }

  function _calcOwnedStatsForBattle(baseCharDef, ownedEntry) {
    if (!baseCharDef || !ownedEntry) return null;

    const lb = Number(ownedEntry.limitBreak || 0);
    const rarity = ownedEntry.rarity || baseCharDef.rarity || 'r';

    // index.html 側の共鳴計算関数が使えるなら、それで再計算する。
    // これによりDB保存済みstatsの古さ・不整合を避ける。
    if (typeof window.applyLimitBreakStats === 'function') {
      const baseStats = ownedEntry.baseStats || {
        HP: baseCharDef.hp,
        ATK: baseCharDef.atk,
      };
      return window.applyLimitBreakStats(baseStats, lb, rarity, baseCharDef.id);
    }

    // fallback: 所持データのstatsを使う。
    if (ownedEntry.stats) return ownedEntry.stats;

    return null;
  }

  function _applyOwnedStatsToCharDef(charDef) {
    if (!charDef) return null;

    const c = deepClone(charDef);
    const owned = _getOwnedEntryForBattle(c.id);
    const lb = Number(owned && owned.limitBreak || 0);

    // 共鳴Lvはステータス保存状態にかかわらず、必ずバトル定義へ反映する。
    c.limitBreak = lb;
    c.ownedStatsApplied = false;

    if (owned) {
      const ownedStats = _calcOwnedStatsForBattle(c, owned);
      if (ownedStats) {
        const hp  = Number(ownedStats.HP ?? ownedStats.hp ?? c.hp);
        const atk = Number(ownedStats.ATK ?? ownedStats.atk ?? c.atk);
        if (Number.isFinite(hp) && hp > 0) c.hp = Math.floor(hp);
        if (Number.isFinite(atk) && atk > 0) c.atk = Math.floor(atk);
        c.ownedStatsApplied = true;
      }
    }

    const s1 = Array.isArray(c.skills)
      ? c.skills.find(skill => skill && skill.id === 's1')
      : null;
    const combo = c.combo && c.combo.skill ? c.combo.skill : null;
    const effect = (type) => combo && Array.isArray(combo.effects)
      ? combo.effects.find(e => e && e.type === type)
      : null;

    // Lv.2＝通常スキル強化 / Lv.3＝コンボ範囲強化 / Lv.4＝コンボ完成効果
    switch (Number(c.id)) {
      case 1: // エリ
        if (lb >= 2 && s1) s1.resonanceHealLowestAtkRate = 0.35;
        if (lb >= 3 && c.combo) c.combo.range = 'combo_cross_all';
        if (lb >= 4 && combo) combo.resonanceTeamAtkUp = { rate: 1.10, duration: 1 };
        break;
      case 2: // ネム R
        if (lb >= 2 && s1) s1.multiplier = 0.65;
        if (lb >= 3 && c.combo) c.combo.range = 'combo_around8';
        if (lb >= 4 && combo) {
          combo.multiplier = 0.30;
          const e = effect('stun'); if (e) e.hit = 40;
        }
        break;
      case 3: { // スイ SR
        const ult = Array.isArray(c.skills)
          ? c.skills.find(skill => skill && (skill.id === 'ult' || skill.isUltimate === true))
          : null;

        // Lv.1：ULT必要LINKコスト -1
        if (lb >= 1 && ult) {
          ult.linkCost = Math.max(0, Number(ult.linkCost || 0) - 1);
        }

        // Lv.2：通常スキルの回復を50%→70%、criticalを15%→20%へ強化
        if (lb >= 2 && s1 && Array.isArray(s1.randomOptions)) {
          s1.randomOptions.forEach(option => {
            if (!option) return;
            if (option.effectType === 'lowest_hp_heal') {
              option.rate = 0.70;
              option.label = '一番HPの低い味方を最大HPの70%回復';
            }
            if (option.effectType === 'all_critical_up') {
              option.rate = 0.20;
              option.label = '味方全体critical率+20%';
            }
          });
        }

        // Lv.3：前方直線3マス＋左右1マスへ移動範囲を拡張
        if (lb >= 3) {
          c.moveType = 'line_front_3_side';
        }

        // Lv.4：コンボ反応範囲をX字から十字＋X字へ拡張
        if (lb >= 4 && c.combo) {
          c.combo.range = 'combo_star_all';
        }
        break;
      }
      case 4: // アルノ SR
        if (lb >= 2 && s1) { s1.multiplier = 1.70; s1.criticalRate = 0.75; }
        if (lb >= 3 && combo) combo.range = 'combo_cross_all';
        if (lb >= 4 && combo) { combo.multiplier = 1.05; combo.resonanceSelfAtkUpOnCritical = { rate: 1.15, duration: 1 }; }
        break;
      case 5: // クラリネ R
        if (lb >= 2 && s1) s1.linkCost = 2;
        if (lb >= 3 && c.combo) c.combo.range = 'combo_around8';
        if (lb >= 4 && combo) { combo.multiplier = 0.55; combo.resonanceNextS1Discount = 1; }
        break;
      case 6: // イグニス R
        // Lv.2：ブレイブ・スマッシュ後、自身をATK×0.20回復
        if (lb >= 2 && s1) s1.resonanceSelfHealAtkRate = 0.20;
        // Lv.3：コンボ反応範囲を上下左右1マスから十字すべてへ拡張
        if (lb >= 3 && c.combo) c.combo.range = 'combo_cross_all';
        // Lv.4：コンボ効果範囲を前方横3マスから前方2段×横3マスへ拡張
        if (lb >= 4 && combo) combo.range = 'fan_2row_3_ally';
        break;
      case 7: { // ロゼ SR
        const ult = Array.isArray(c.skills)
          ? c.skills.find(skill => skill && (skill.id === 'ult' || skill.isUltimate === true))
          : null;

        // Lv.1：ULT必要LINKコスト -1
        if (lb >= 1 && ult) {
          ult.linkCost = Math.max(0, Number(ult.linkCost || 0) - 1);
        }

        // Lv.2：前方横3 + 後方横3へ移動範囲を拡張
        if (lb >= 2) {
          c.moveType = 'rose_resonance_move';
        }

        // Lv.3：コンボ反応範囲を十字から十字＋X字へ拡張
        if (lb >= 3 && c.combo) {
          c.combo.range = 'combo_star_all';
        }

        // Lv.4：コンボATK低下を15%へ強化し、25%スタンを追加
        if (lb >= 4 && combo) {
          const down = effect('atk_down');
          if (down) down.rate = 0.85;
          if (!effect('stun')) {
            combo.effects.push({ type:'stun', target:'enemy', hit:25, duration:1 });
          }
        }
        break;
      }
      case 8: // ミモザ SR
        if (lb >= 2 && s1) {
          const up = (s1.effects || []).find(x => x && x.type === 'atk_up'); if (up) up.rate = 1.35;
          if (!(s1.effects || []).some(x => x && x.type === 'critical_up')) s1.effects.push({ type:'critical_up', target:'ally_all', hit:100, rate:0.10, duration:1 });
        }
        if (lb >= 3 && c.combo) c.combo.range = 'combo_star_all';
        if (lb >= 4 && combo) {
          const up = effect('atk_up'); if (up) up.rate = 1.15;
          combo.resonanceHealLowestSourceHpRate = 0.10;
        }
        break;
      case 9: // ヴェラ R
        if (lb >= 2 && s1) s1.resonanceAffectedAllyAtkUp = { rate:1.10, duration:1 };
        if (lb >= 3 && c.combo) c.combo.range = 'combo_around8';
        if (lb >= 4 && combo) {
          combo.multiplier = 0.40;
          const down = effect('atk_down'); if (down) down.rate = 0.90;
        }
        break;
      case 10: // フローラ R
        if (lb >= 2 && s1) s1.multiplier = 1.40;
        if (lb >= 3 && c.combo) c.combo.range = 'combo_around8';
        if (lb >= 4 && combo) { combo.multiplier = 0.55; combo.resonanceDelayedUltBoost = 1.10; }
        break;
      case 11: // シグレ R
        if (lb >= 2 && s1) s1.multiplier = 1.40;
        if (lb >= 3 && c.combo) c.combo.range = 'combo_around8';
        if (lb >= 4 && combo) {
          combo.multiplier = 0.60;
          const push = effect('push_1'); if (push) push.hit = 75;
        }
        break;
      case 12: // ハヤテ R
        // Lv.2：通常スキル倍率をATK×1.90へ強化
        if (lb >= 2 && s1) s1.multiplier = 1.90;
        // Lv.3：コンボ反応範囲を斜め隣接4マスからX字全体へ拡張
        if (lb >= 3 && c.combo) c.combo.range = 'combo_x_all';
        // Lv.4：ヒットアンドアウェイ帰還成功時、1ターン1回LINK+1
        if (lb >= 4) {
          c.hitAndAwayLinkRefund = 1;
          c.hitAndAwayLinkRefundPerTurn = 1;
        }
        break;
      case 13: // ミア SR
        c.rarity = 'sr';
        if (lb >= 2 && s1) { s1.multiplier = 2.05; s1.criticalRate = 0.30; }
        if (lb >= 3 && c.combo) c.combo.range = 'combo_star_all';
        if (lb >= 4 && combo) {
          combo.multiplier = 0.80;
          combo.criticalRate = 0.25;
          if (!effect('atk_down')) combo.effects.push({ type:'atk_down', target:'enemy', hit:100, duration:1, rate:0.90 });
        }
        break;
      case 14: // アヤカ R
        if (lb >= 2 && s1) s1.multiplier = 1.15;
        if (lb >= 3 && c.combo) c.combo.range = 'combo_around8';
        if (lb >= 4 && combo) { combo.multiplier = 0.60; combo.backstabMultiplier = 1.50; }
        break;
      case 15: // エテルナ R
        if (lb >= 2 && s1) s1.resonanceAffectedAllyGuard = { rate:0.10, duration:1 };
        if (lb >= 3 && c.combo) c.combo.range = 'combo_around8';
        if (lb >= 4 && combo) {
          combo.multiplier = 0.50;
          const push = effect('push_1'); if (push) push.hit = 75;
        }
        break;
      case 16: // ミト R
        if (lb >= 2 && s1) {
          s1.multiplier = 0.85;
          const e = (s1.effects || []).find(x => x && x.type === 'jittai'); if (e) e.hit = 90;
        }
        if (lb >= 3 && c.combo) c.combo.range = 'combo_around8';
        if (lb >= 4 && combo) {
          combo.multiplier = 0.45;
          const e = effect('jittai'); if (e) e.hit = 60;
        }
        break;
      case 17: // アンジェ R
        if (lb >= 2 && s1) s1.healRate = Number(s1.healRate || 0.35) * 1.20;
        if (lb >= 3 && c.combo) c.combo.range = 'combo_line_all';
        if (lb >= 4 && combo) { combo.healRate = 0.12; combo.resonanceHealLowestTargetHpRate = 0.05; }
        break;
    }

    return c;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ============================================================
  // ランダム配置ヘルパー
  // ============================================================
  function makePositionPool(rows, cols, blockedKeys) {
    const list = [];
    rows.forEach(row => {
      cols.forEach(col => {
        const key = `${row}-${col}`;
        if (!blockedKeys || !blockedKeys.has(key)) {
          list.push({ row, col, key });
        }
      });
    });
    return list;
  }

  function takeRandomPosition(pool, occupied) {
    const candidates = pool.filter(p => !occupied.has(p.key));
    if (candidates.length === 0) return null;
    const p = candidates[Math.floor(Math.random() * candidates.length)];
    occupied.add(p.key);
    return { row: p.row, col: p.col };
  }

  // DEF 参照式を廃止。ATK × multiplier のみで計算する。
  // 敵の硬さを表現したい場合は target.damageTakenRate（未設定時 1.0）を使う。
  function calcDamage(atk, multiplier, target, source) {
    const takenRate = (target && target.damageTakenRate != null) ? target.damageTakenRate : 1.0;
    const elementRate = getElementRate32(source && source.element, target && target.element);
    return Math.max(1, Math.floor(atk * multiplier * takenRate * elementRate));
  }

  function _normalizeCriticalRate32(rate) {
    const n = Number(rate);
    if (!Number.isFinite(n)) return 0;
    // 10 と書いた場合は 10% として扱い、0.10 と書いた場合もそのまま使える。
    return n > 1 ? n / 100 : n;
  }

  function _clampCriticalRate32(rate) {
    return Math.max(0, Math.min(1, _normalizeCriticalRate32(rate)));
  }

  function _getSkillHitCountForCritical32(skill) {
    if (!skill) return 1;
    const explicit = Number(skill.hitCount);
    if (Number.isFinite(explicit) && explicit > 1) {
      return Math.min(12, Math.max(1, Math.floor(explicit)));
    }
    // アルノ等の多段アップ演出。現状は5hitとして内部判定する。
    if (skill.hitStyle === 'rapid_multi') return 5;
    // 汎用multiは3hitとして扱う。厳密に変えたい場合は skill.hitCount を指定する。
    if (skill.hitStyle === 'multi') return 3;
    return 1;
  }

  function _canCritical32(source, skill) {
    if (!source) return false;
    if (skill && skill.canCritical === false) return false;

    // 継続ダメージ・設置物tickは通常の攻撃ではないためcritical対象外。
    const hitStyle = skill && skill.hitStyle;
    if (hitStyle === 'poison' || hitStyle === 'summon_tick') return false;

    return true;
  }

  function getCriticalRate32(source, skill) {
    if (!_canCritical32(source, skill)) return 0;

    let rate = source.criticalRate ?? source.critRate;
    if (rate == null) {
      rate = source.side === 'enemy' ? DEFAULT_ENEMY_CRITICAL_RATE_32 : DEFAULT_ALLY_CRITICAL_RATE_32;
    }
    rate = Number(rate);


    if (_bs && _bs.blessing && source.side === 'ally') {
      rate += Number(_bs.blessing.passiveCriticalRate || 0);
      if (!_bs.blessing.used || _bs.blessing.activeTurn === _bs.turn) {
        if (_bs.blessing.activeTurn === _bs.turn) {
          rate += Number(_bs.blessing.invCriticalRate || 0);
        }
      }
    }

    if (Array.isArray(source.statusEffects)) {
      source.statusEffects.forEach(e => {
        if (!e || (e.duration != null && e.duration <= 0)) return;
        if (e.type === 'critical_up' || e.type === 'crit_up') {
          rate += _normalizeCriticalRate32(e.rate != null ? e.rate : 0.20);
        } else if (e.type === 'critical_down' || e.type === 'crit_down') {
          rate -= _normalizeCriticalRate32(e.rate != null ? e.rate : 0.20);
        }
      });
    }

    return _clampCriticalRate32(rate);
  }

  function getCriticalDamageRate32(source, skill) {
    const n = Number(
      (skill && (skill.criticalDamageRate ?? skill.critDamageRate)) ??
      (source && (source.criticalDamageRate ?? source.critDamageRate)) ??
      CRITICAL_DAMAGE_RATE_32
    );
    return Number.isFinite(n) && n > 1 ? n : CRITICAL_DAMAGE_RATE_32;
  }

  function _splitDamageAmount32(total, count) {
    const safeTotal = Math.max(0, Math.floor(Number(total || 0)));
    const safeCount = Math.max(1, Math.floor(Number(count || 1)));
    const base = Math.floor(safeTotal / safeCount);
    const rest = safeTotal % safeCount;
    return Array.from({ length: safeCount }, (_, i) => base + (i < rest ? 1 : 0));
  }

  // rawDamage に対して critical を適用する。
  // 多段系はhitごとに判定し、合計値を最終ダメージにする。
  function rollCriticalDamage32(rawDamage, source, skill) {
    const baseDamage = Math.max(0, Math.floor(Number(rawDamage || 0)));
    const rate = getCriticalRate32(source, skill);
    const critMultiplier = getCriticalDamageRate32(source, skill);
    const hitCount = _getSkillHitCountForCritical32(skill);

    const result = {
      amount: baseDamage,
      baseAmount: baseDamage,
      isCritical: false,
      criticalCount: 0,
      criticalRate: rate,
      criticalMultiplier: critMultiplier,
      hitCount,
      criticalHits: [],
    };

    if (baseDamage <= 0 || rate <= 0 || !_canCritical32(source, skill)) {
      if (hitCount > 1) {
        result.criticalHits = _splitDamageAmount32(baseDamage, hitCount).map((amount, index) => ({
          index,
          amount,
          baseAmount: amount,
          isCritical: false,
        }));
      }
      return result;
    }

    if (hitCount <= 1) {
      const isCritical = Math.random() < rate;
      result.isCritical = isCritical;
      result.criticalCount = isCritical ? 1 : 0;
      result.amount = isCritical ? Math.max(1, Math.floor(baseDamage * critMultiplier)) : baseDamage;
      result.criticalHits = [{
        index: 0,
        amount: result.amount,
        baseAmount: baseDamage,
        isCritical,
      }];
      return result;
    }

    const parts = _splitDamageAmount32(baseDamage, hitCount);
    let total = 0;
    result.criticalHits = parts.map((part, index) => {
      const isCritical = Math.random() < rate;
      const amount = isCritical ? Math.max(1, Math.floor(part * critMultiplier)) : part;
      if (isCritical) result.criticalCount += 1;
      total += amount;
      return {
        index,
        amount,
        baseAmount: part,
        isCritical,
      };
    });

    result.isCritical = result.criticalCount > 0;
    result.amount = Math.max(1, total);
    return result;
  }

  // 状態異常込みのATKを返す。
  // atk_up / atk_down は effects[] の rate で倍率指定可能。
  // 例: { type:'atk_up', rate:1.5 } / { type:'atk_down', rate:0.7 }
  function getEffectiveAtk(unit) {
    if (!unit) return 1;
    let atk = Number(unit.atk || 1);
    if (_bs && _bs.blessing && unit.side === 'ally') {
      atk *= (1 + Number(_bs.blessing.passiveAtkRate || 0));
    }
    const effects = Array.isArray(unit.statusEffects) ? unit.statusEffects : [];

    effects.forEach(e => {
      if (!e) return;
      if (e.type === 'atk_up') {
        const rate = Number(e.rate != null ? e.rate : 1.5);
        if (Number.isFinite(rate) && rate > 0) atk *= rate;
      } else if (e.type === 'atk_down') {
        const rate = Number(e.rate != null ? e.rate : 0.7);
        if (Number.isFinite(rate) && rate > 0) atk *= rate;
      }
    });

    return Math.max(1, Math.floor(atk));
  }



  // 背後攻撃判定。
  // 敵は下方向へ進行するため、敵より上側のマスから攻撃した場合を「背後」とする。
  function isBackstabAttack(source, target) {
    if (!source || !target) return false;
    if (source.side !== 'ally' || target.side !== 'enemy') return false;
    return Number(source.row) < Number(target.row);
  }

  function applyBackstabBonus(dmg, source, target, skill) {
    const rate = Number(skill && skill.backstabMultiplier != null ? skill.backstabMultiplier : 1);
    if (!Number.isFinite(rate) || rate <= 1) return dmg;
    if (!isBackstabAttack(source, target)) return dmg;

    const boosted = Math.max(1, Math.round(dmg * rate));
    _log(`${source.name} の背後攻撃！ ダメージ ${rate}倍`);
    return boosted;
  }

function pickRandomBoardCells(count) {
  const cells = [];

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      cells.push({ row, col, key: `${row}-${col}` });
    }
  }

  const shuffled = shuffle(cells);
  return shuffled.slice(0, Math.max(0, Number(count || 0)));
}

  function getAllUnits() {
    if (!_bs) return [];
    return [
      ..._bs.allies.filter(u => u.hp > 0),
      ..._bs.enemies.filter(u => u.hp > 0 || u.isBoss),
      ...((_bs.summons || []).filter(u => u && u.hp > 0)),
    ];
  }

  function aliveAllies() {
    return _bs.allies.filter(u => u.hp > 0);
  }

  function getEriUnit() {
    if (!_bs || !Array.isArray(_bs.allies)) return null;
    return _bs.allies.find(u => Number(u.id) === ROGUELITE_FIXED_FIRST_CHARA_ID) || null;
  }

  function isEriLost() {
    const eri = getEriUnit();
    return !!(eri && eri.hp <= 0);
  }

  function aliveBosses() {
    return _bs.enemies.filter(e => e.isBoss && e.hp > 0);
  }

  function hasBossInBattle() {
    return _bs.enemies.some(e => e.isBoss);
  }

  function aliveNonBossEnemies() {
    return _bs.enemies.filter(e => !e.isBoss && e.hp > 0);
  }

  function aliveEnemies() {
    // ボスはHP0以降も盤面に残るが、行動しない（hp > 0 のみ返す）
    // 雑魚はHP0で除外（通常通り）
    return _bs.enemies.filter(u => u.hp > 0);
  }

  // 盤面描画用：ボスはHP0後も表示する（bosCoreExposed状態として）
  function visibleEnemies() {
    return _bs.enemies.filter(u => u.hp > 0 || u.isBoss);
  }

  // ============================================================
  // ユニット生成
  // ============================================================
  function makeAlly(charDef, row, col) {
    return {
      _uid: uid(),
      id: charDef.id,
      name: charDef.name,
      rarity: charDef.rarity,
      role: charDef.role,
      element: charDef.element || 'chaos',
      side: 'ally',
      moveType: charDef.moveType || 'silver',
      moveCells: Array.isArray(charDef.moveCells)
  ? charDef.moveCells.map(p => ({ dr: p.dr, dc: p.dc }))
  : null,

      // HP で生存管理（味方・敵ともに統一）
      hp:    charDef.hp,
      hpMax: charDef.hp,

      atk:  charDef.atk,
      criticalRate: Number.isFinite(Number(charDef.criticalRate ?? charDef.critRate)) ? Number(charDef.criticalRate ?? charDef.critRate) : DEFAULT_ALLY_CRITICAL_RATE_32,
      criticalDamageRate: Number.isFinite(Number(charDef.criticalDamageRate ?? charDef.critDamageRate)) ? Number(charDef.criticalDamageRate ?? charDef.critDamageRate) : CRITICAL_DAMAGE_RATE_32,
      shinki:    charDef.shinkiStart,
      shinkiMax: charDef.shinkiMax,
      row,
      col,
      skills: charDef.skills,

      // コンボ定義。キャラクターマスターからバトルユニットへ引き継ぐ。
      // これが無いとコンボ発動・レンジ表示・説明表示のすべてが参照できない。
      combo: charDef.combo ? deepClone(charDef.combo) : null,

      // 盤面用
      img:          charDef.battleBackImg || charDef.battleImg || charDef.img || null,
      battleImg:    charDef.battleImg     || charDef.img       || null,
      battleBackImg: charDef.battleBackImg || null,

      // アップ演出・下部パネル用
      // upImg は通常UI用、battleUpImg はバトル中の攻撃アップ演出専用。
      // battleUpImg を分けることで、通常詳細/一覧用の upImg を汚さない。
      battleUpImg: charDef.battleUpImg || null,
      upImg:       charDef.upImg || charDef.panelImg || charDef.img || null,
      panelImg:    charDef.panelImg || charDef.upImg || charDef.img || null,

      // カットイン用
      cutin: charDef.cutin || charDef.ultImg || charDef.cutImg || null,

      uiScale: charDef.uiScale || {},
      uiOffset: charDef.uiOffset || {},

      // 状態異常
      statusEffects:    [],
      shieldRate:       0,
      skillUsedThisTurn: false,
      stunned:          false,
    };
  }

  function makeEnemy(def, row, col) {
    // イリシュ本体：低HP・高機動のヒット＆アウェイ型へ統一。
    // データ定義側が旧設定でも、Battle32起動時に現行仕様を優先する。
    if (def && (def.id === 'enemy_irish_roguelite' || def.specialActionType === 'irish_destruction_4')) {
      def = {
        ...def,
        hp: 3000,
        hpMax: 3000,
        fixedPosition: false,
        moveType: 'irish_hit_and_away',
        allowBossMovement: true,
        customMoveOffsets: [
          { dr: -1, dc:  0 }, // 後方1
          { dr:  0, dc: -1 }, // 左1
          { dr:  0, dc:  1 }, // 右1
          { dr:  1, dc:  0 }, // 前方1
          { dr:  2, dc:  0 }, // 前方2
        ],
        aiType: 'hit_and_away',
        retreatAfterAttack: true,
        retreatDistance: 2,
        retreatTarget: 'away_from_attack_target',
      };
    }

    return {
      _uid: uid(),
      id: def.id,
      name: def.name,
      element: def.element || 'chaos',
      side: 'enemy',

      img: def.battleImg || def.img || def.upImg || null,
      battleImg: def.battleImg || def.img || null,
      battleUpImg: def.battleUpImg || null,
      upImg: def.upImg || null,
      cutin: def.cutin || def.ultImg || def.cutImg || null,

      isBoss:    !!def.isBoss,
      isMidBoss: !!def.isMidBoss,
      hp: def.hp,
      hpMax: def.hpMax || def.hp,
      atk: def.atk,
      criticalRate: Number.isFinite(Number(def.criticalRate ?? def.critRate)) ? Number(def.criticalRate ?? def.critRate) : DEFAULT_ENEMY_CRITICAL_RATE_32,
      criticalDamageRate: Number.isFinite(Number(def.criticalDamageRate ?? def.critDamageRate)) ? Number(def.criticalDamageRate ?? def.critDamageRate) : CRITICAL_DAMAGE_RATE_32,
      // damageTakenRate: 敵の硬さを表現（省略時 1.0）
      damageTakenRate: def.damageTakenRate ?? 1.0,
      row,
      col,
      statusEffects: [],
      stunned: false,
      attackRange: def.attackRange || (def.isBoss ? 'enemy_attack_cross' : 'enemy_attack_front'),
      moveType:    def.moveType    || (def.isBoss ? 'none' : 'enemy_move_straight'),
      // 敵ごとの柔軟な移動候補。指定時は共通MOVE_PRESETより優先する。
      customMoveOffsets: Array.isArray(def.customMoveOffsets)
        ? def.customMoveOffsets.map(offset => ({ dr: Number(offset.dr || 0), dc: Number(offset.dc || 0) }))
        : null,
      allowBossMovement: !!def.allowBossMovement,
      uiScale:     def.uiScale    || {},

      // 通常敵AI拡張（ヒット＆アウェイ等）
      aiType: def.aiType || 'chaser',
      retreatAfterAttack: !!def.retreatAfterAttack,
      retreatDistance: Math.max(0, Number(def.retreatDistance || 0)),
      retreatTarget: def.retreatTarget || 'away_from_attack_target',

      // 特殊BOSS制御
      eriPriority: !!def.eriPriority,
      specialActionType: def.specialActionType || null,
      specialActionDamageRate: Number.isFinite(Number(def.specialActionDamageRate))
        ? Number(def.specialActionDamageRate)
        : 0.90,
    };
  }

  // ============================================================
  // デフォルト敵定義
  // ============================================================
  const DEFAULT_ENEMIES = [
  {
    id: 'boss',
    name: 'ボス怪異',
    element: 'chaos',
    isBoss: true,
    hp: 3200,
    atk: 520,
    moveType: 'none',
    attackRange: 'enemy_attack_cross',
  },
  {
  id: 'mob1',
  name: '雑魚A',
  element: 'chaos',
  hp: 700,
  atk: 240,
  moveType: 'enemy_zako_straight',
  attackRange: 'enemy_attack_front',
},
{
  id: 'mob2',
  name: '雑魚B',
  element: 'chaos',
  hp: 650,
  atk: 220,
  moveType: 'enemy_zako_diag',
  attackRange: 'enemy_attack_cross',
},
];

  // ============================================================
  // バトル初期化
  // ============================================================
  function start(config, callbacks) {
    _cb = callbacks || {};

    _battleFlowToken++;
    _allyTurnFlowRunning = false;
    _enemyTurnFlowRunning = false;

    const stageId = config.stageId || null;

    const allChars = (window.CHARACTERS_32 || []).map(c => _applyOwnedStatsToCharDef(c)).filter(Boolean);

// テストプレイ用：アサミ・エリ・ミユ
const TEST_PARTY_IDS_32 = [8, 12, 7];

let chars = config.partyIds && config.partyIds.length
  ? config.partyIds.map(pid => allChars.find(c => c.id === pid)).filter(Boolean)
  : TEST_PARTY_IDS_32.map(pid => allChars.find(c => c.id === pid)).filter(Boolean);

    while (chars.length < 3 && allChars.length > 0) {
      chars.push(allChars[chars.length % allChars.length]);
    }

    // ── 味方初期配置：row 6〜7、col 0〜4 のランダム配置 ──
    // 味方コア (row:7, col:2) には配置しない。重複なし。
    const ALLY_CORE_POS = { row: 7, col: 2 };
    const allyOccupied = new Set([
      `${ALLY_CORE_POS.row}-${ALLY_CORE_POS.col}`,
    ]);
    const allyStartPool = makePositionPool(
      [6, 7],
      [0, 1, 2, 3, 4],
      allyOccupied
    );
    const allyChars = chars.slice(0, 3);
    const allies = allyChars.map(c => {
      const pos = takeRandomPosition(allyStartPool, allyOccupied) || { row: 6, col: 2 };
      return makeAlly(c, pos.row, pos.col);
    });

    // --- 敵生成
    // 優先順位: config.enemies（インライン定義）> config.enemyIds（ID参照）> DEFAULT_ENEMIES
    let enemyDefs;

    if (Array.isArray(config.enemies) && config.enemies.length > 0) {
      // stages.js に直接書かれた敵定義をそのまま使う
      enemyDefs = config.enemies;
    } else if (config.enemyIds && config.enemyIds.length > 0) {
      const resolved = config.enemyIds.map(id => {
        if (typeof getEnemyById === 'function') {
          return getEnemyById(id) || null;
        }
        return (window.ENEMIES || []).find(e => e.id === id) || null;
      }).filter(Boolean);

      enemyDefs = resolved.length > 0 ? resolved : DEFAULT_ENEMIES;
    } else {
      enemyDefs = DEFAULT_ENEMIES;
    }

    // ── 敵初期配置：ボスは固定、雑魚は row 0〜1 ランダム配置 ──
    const BOSS_POS = { row: 0, col: 2 };
    const enemyOccupied = new Set([
      `${BOSS_POS.row}-${BOSS_POS.col}`,
    ]);
    const enemyStartPool = makePositionPool(
      [0, 1],
      [0, 1, 2, 3, 4],
      enemyOccupied
    );

    let mobIndex = 0;

const enemies = enemyDefs.map(def => {
  let pos;

  // 敵定義側の startPosition を最優先。
  // オーバーシア戦では敵側3列目中央（row:2,col:2）へ固定配置する。
  if (def && def.startPosition && Number.isFinite(Number(def.startPosition.row)) && Number.isFinite(Number(def.startPosition.col))) {
    pos = { row: Number(def.startPosition.row), col: Number(def.startPosition.col) };
    enemyOccupied.add(`${pos.row}-${pos.col}`);
  } else if (def.isBoss) {
    pos = BOSS_POS;
  } else {
    pos = takeRandomPosition(enemyStartPool, enemyOccupied) || { row: 1, col: 2 };
  }

  const enemy = makeEnemy(def, pos.row, pos.col);

  // moveType は enemies.js / stage定義側を優先する
  // 未指定の場合のみフォールバックで moveType を設定する
  if (!enemy.isBoss && !enemy.moveType) {
    if (mobIndex === 0) {
      enemy.moveType = 'enemy_zako_straight';
    } else if (mobIndex === 1) {
      enemy.moveType = 'enemy_zako_diag';
    }
    mobIndex++;
  }

  return enemy;
});

    console.log('[Battle32] enemyDefs:', enemyDefs);
    console.log('[Battle32] enemies:', enemies);

    // ── ローグライトモードのroster構築 ──
    const isRogueliteMode = config.battleMode === 'roguelite' || typeof config.rogueliteOnBattleEnd === 'function';
    let rosterData = [];
    let initialAllies = allies;

    if (isRogueliteMode && config.partyIds && config.partyIds.length > 0) {
      // ローグライト：エリは1st固定で、味方コアの前に初期配置済み。
      // 2〜4枠目だけ召喚対象として待機させる。
      const allChars32 = allChars;
      const normalizedPartyIds = [
        ROGUELITE_FIXED_FIRST_CHARA_ID,
        ...config.partyIds.filter(pid => Number(pid) !== ROGUELITE_FIXED_FIRST_CHARA_ID),
      ].slice(0, 4);

      let fixedDeployedUid = null;
      initialAllies = [];

      rosterData = normalizedPartyIds.map((pid, idx) => {
        const charDef = allChars32.find(c => Number(c.id) === Number(pid));
        if (!charDef) return null;
        const rar = (charDef.rarity || 'r').toLowerCase();
        const cost = LINK_COST.summon[rar] || 1;
        const isFixedFirst = idx === 0 && Number(pid) === ROGUELITE_FIXED_FIRST_CHARA_ID;

        if (isFixedFirst) {
          const unit = makeAlly(charDef, ROGUELITE_ERI_START_POS.row, ROGUELITE_ERI_START_POS.col);
          unit.isFixedFirst = true;
          initialAllies.push(unit);
          fixedDeployedUid = unit._uid;
        }

        return {
          rosterId: `roster_${idx}`,
          charaId: pid,
          name: charDef.name,
          rarity: rar,
          summonCost: cost,
          status: isFixedFirst ? 'deployed' : 'standby',
          deployedUid: isFixedFirst ? fixedDeployedUid : null,
          fixedFirst: isFixedFirst,
          charDef,
        };
      }).filter(Boolean);
    }

    _bs = {
      turn: 1,
      phase: 'skill',
      stageId,
      allies: initialAllies,
      enemies,
      log: [],
      bossWarnTurn: BOSS_WARN_INTERVAL,
      bossWarning: false,
      result: null,
      loseReason: null,
      blessing: makeBlessingState32(config.blessingId || null),

      delayedActions: [],

      // ── 盤面設置型召喚物 ──────────────────────────
      summons: [],

      // ── LINK システム ──
      link: {
        current: calcLinkMax(1),
        max: calcLinkMax(1),
        cap: 6,
        // レヴィ「追憶抹消」など、次の味方ターン開始時に適用するLINK減少予約
        pendingTurnStartPenalty: 0,
      },

      // ── ローグライト: ロスター（5体持ち込み）──
      roster: rosterData,
      deployLimit: 4,

      // ── ローグライト: アイテム2枠 ──
      items: Array.isArray(config.rogueliteItems) ? config.rogueliteItems.slice(0, 2) : [],

      // コア概念は廃止。敗北条件はエリのロストのみ。
      // ターン制限は廃止。早いほどスコアが高く、遅くてもタイムオーバー敗北にはしない。
      cores: null,
      bossCore: null,

      turnLimit: null,
      noTurnLimit: true,

      // 敵行動数制御
      enemyActionsPerTurn: config.enemyActionsPerTurn ?? null,
      enemyActionMode:     config.enemyActionMode     || 'all',

      // 敵スポーン設定（ステージ設定から引き継ぐ）
      enemySpawn: config.enemySpawn || null,

      // ターン単位の行動権（後方互換用・判定には使わない）
      moveUsedThisTurn:  false,
      skillUsedThisTurn: false,
      movedUnitUid:      null,
      skillUnitUid:      null,
      // LINKベース行動権管理
      actionCount:        0,
      actionMax:          99,
      lastActionType:     null,
      lastActionUnitUid:  null,
      unitActionHistory:  {},

      // このターン中に直前に成功した味方スキル
      lastAllySkillThisTurn: null,

      // ── ローグライト専用フィールド ──────────────────────────
      // isRoguelite: ローグライトランとして起動されたか（UI分岐の判定に使う）
      isRoguelite:          isRogueliteMode,
      // rogueliteOptions: 保持中の強化OPオブジェクト配列
      rogueliteOptions:     Array.isArray(config.rogueliteOptions) ? config.rogueliteOptions : [],
      // isBossStage: ボス戦かどうか（霊装OP等の判定用）
      isBossStage:          !!config.isBossStage,
      // スキルダメージ補正倍率（OP「秘術の触媒」が加算）
      _rl_skillDmgMult:     1.0,
      // 駒取り廃止により未使用（将来: スキル撃破時の神気ボーナスに転用予定）
      _rl_captureSpBonus:   0,
      // 霊装権ボーナス保持（OP「霊装の予兆」が積む）
      _rl_pendingReisouBonus: 0,
      // ボスへのスキルダメージ追加補正（OP「核穿ち」が加算）
      _rl_bossDmgMult:      1.0,
      // バトル終了時コールバック（ローグライトコントローラから注入）
      _rl_onBattleEnd:      typeof config.rogueliteOnBattleEnd === 'function'
                              ? config.rogueliteOnBattleEnd
                              : null,
    };

    _bs.allies.forEach(a => { a.skillUsedThisTurn = false; });
    (_bs.allies || []).forEach(_applyBlessingHpPassive32);
    _applyTurnStartBlessing32();

    // ── ローグライトOP開始時補正を適用 ──────────────────────
    // applyOnStart(_bs) は _bs を直接書き換える
    // （HP/ATK/コア耐久などを補正後に _emit('start') でスナップショットを取るため、
    //   _bs 構築直後かつ emit より前に呼ぶ）
    _applyRogueliteOnStart();

    // サキエルはバトル開始時点で最初の行動を先行決定する。
    // これによりTURN 1の味方フェーズから攻撃予告を確認できる。
    _initializeSakielNextActions();
    _initializeOverseerNextActions();
    _initializeRiviaNextActions();

    _emit('start', { bs: _snapshot() });
    _emit('phaseChange', { phase: 'skill', bs: _snapshot() });
    // バトル開始時の演出は _startAllyTurnFlow() で管理
    _startAllyTurnFlow();
  }

  // ターン開始演出フロー（ALLY TURN → PLAYER ACTION → 操作解除）
  async function _startAllyTurnFlow() {
  if (!_bs || _bs.result) return;

  // 二重起動防止
  if (_allyTurnFlowRunning) return;

  const token = _battleFlowToken;
  _allyTurnFlowRunning = true;

  try {
    _lockInput();
    _renderUI();

    // 味方ターン開始直後に予約攻撃を処理
    await _processDelayedActions('allyTurnStart');

    if (!_bs || _bs.result || token !== _battleFlowToken) {
      _renderUI();
      return;
    }

    // ターン制限は廃止。ターン数はスコア評価用としてのみ表示する。
    _setTurnDangerAlert(false);

    await _centerTextWaitTurn(`TURN ${_bs.turn}`, 'PLAYER ACTION', B32_WAIT.turn, false);

    if (!_bs || _bs.result || _bs.phase !== 'skill' || token !== _battleFlowToken) {
      _renderUI();
      return;
    }

    _unlockInput();
    _renderUI();

  } finally {
    if (token === _battleFlowToken) {
      _allyTurnFlowRunning = false;
    }
  }
}

  // ============================================================
  // ローグライト補助関数
  // ============================================================

  /**
   * バトル開始時に保持OPの applyOnStart(_bs) を順に呼ぶ。
   * _bs 構築直後かつ _emit('start') より前に実行すること。
   */
  function _applyRogueliteOnStart() {
    const opts = (_bs && Array.isArray(_bs.rogueliteOptions)) ? _bs.rogueliteOptions : [];
    if (opts.length === 0) return;

    console.log('[Battle32] ローグライトOP開始補正を適用:', opts.map(o => o.id));
    opts.forEach(op => {
      if (op && typeof op.applyOnStart === 'function') {
        try {
          op.applyOnStart(_bs);
          // バトルログにOP発動を表示（_log は _bs 構築後なら呼び出し可）
          _log(`強化OP「${op.name}」が発動`);
        } catch (e) {
          console.error('[Battle32] applyOnStart エラー:', op.id, e);
        }
      }
    });
  }


  /**
   * ローグライトOPを、バトル中に新しく召喚された1ユニットへ適用する。
   * applyOnStart はバトル開始時点の bs.allies だけを対象にするため、
   * 後から召喚した味方にも同じ永続補正・表示バッジを反映する。
   */
  function _applyRogueliteOptionsToUnit(unit) {
    if (!_bs || !unit) return;
    const opts = Array.isArray(_bs.rogueliteOptions) ? _bs.rogueliteOptions : [];
    if (opts.length === 0) return;

    opts.forEach(op => {
      if (!op) return;
      try {
        if (typeof op.applyToUnit === 'function') {
          op.applyToUnit(unit, _bs);
        } else if (typeof op.applyOnStart === 'function') {
          // 後方互換：古いOP定義は applyToUnit を持たないため、
          // allies を召喚ユニット1体だけにした一時BSで適用する。
          // 現行のATK/HP/CRITICAL系OPは allies のみを見るため安全。
          op.applyOnStart({ ..._bs, allies: [unit] });
        }
      } catch (e) {
        console.error('[Battle32] applyToUnit エラー:', op.id, unit.name, e);
      }
    });
  }

  /**
   * バトル中イベント発火（駒取り等）で各OPの applyOnEvent を呼ぶ。
   * @param {string} event   - イベント識別子（例: 'capture'）
   * @param {Object} payload - イベント固有のデータ
   */
  function _fireRogueliteEvent(event, payload) {
    const opts = (_bs && Array.isArray(_bs.rogueliteOptions)) ? _bs.rogueliteOptions : [];
    opts.forEach(op => {
      if (op && typeof op.applyOnEvent === 'function') {
        try {
          op.applyOnEvent(_bs, event, payload);
        } catch (e) {
          console.error('[Battle32] applyOnEvent エラー:', op.id, event, e);
        }
      }
    });
  }

  // ============================================================
  // スナップショット（UI用）
  // ============================================================
  function _snapshot() {
    return {
      turn: _bs.turn,
      phase: _bs.phase,
      stageId: _bs.stageId,
      allies: _bs.allies.map(u => ({ ...u, statusEffects: [...u.statusEffects] })),
      // ボスはHP0後も盤面表示のため常に含める
      enemies: _bs.enemies.map(u => ({ ...u, statusEffects: [...u.statusEffects] })),
      bossWarning: _bs.bossWarning,
      log: [..._bs.log],
      result: _bs.result,
      loseReason: _bs.loseReason || null,
      blessing: _bs.blessing ? JSON.parse(JSON.stringify(_bs.blessing)) : null,

      delayedActions: _bs.delayedActions ? _bs.delayedActions.map(a => ({ ...a })) : [],
      summons: _bs.summons ? _bs.summons.map(u => ({ ...u, statusEffects: [...(u.statusEffects || [])] })) : [],

      isRoguelite: !!_bs.isRoguelite,
      cores: null,
      bossCore: null,
      turnLimit: null,
      noTurnLimit: true,
      // LINK
      link: _bs.link ? { ..._bs.link } : null,
      // ローグライト: roster / deployLimit / items
      roster: _bs.roster ? _bs.roster.map(r => ({ ...r })) : [],
      deployLimit: _bs.deployLimit || 4,
      items: _bs.items ? [..._bs.items] : [],
      // 後方互換用
      moveUsedThisTurn:  _bs.moveUsedThisTurn,
      skillUsedThisTurn: _bs.skillUsedThisTurn,
      movedUnitUid:      _bs.movedUnitUid,
      skillUnitUid:      _bs.skillUnitUid,
      // 敵スポーン設定
      enemySpawn:        _bs.enemySpawn || null,
      // 行動権管理
      actionCount:       _bs.actionCount,
      actionMax:         _bs.actionMax,
      lastActionType:    _bs.lastActionType,
      lastActionUnitUid: _bs.lastActionUnitUid,
      unitActionHistory: JSON.parse(JSON.stringify(_bs.unitActionHistory || {})),
      activeEnemyAttackTraceCells: Array.isArray(_bs.activeEnemyAttackTraceCells)
        ? _bs.activeEnemyAttackTraceCells.map(cell => ({ ...cell }))
        : [],
    };
  }

  function _emit(event, data) {
    if (_cb && typeof _cb[event] === 'function') {
      try {
        _cb[event](data);
      } catch (e) {
        // UI演出側の例外で、ダメージ計算・HP更新・行動消費まで巻き戻らないようにする。
        // 例：damage演出のDOM取得/演出処理で落ちても、バトルロジックは継続する。
        console.error('[Battle32] callback error:', event, e, data);
      }
    }
  }

  function _log(msg) {
    _bs.log.push(msg);
    _emit('log', { msg, bs: _snapshot() });
  }



  let _blessingActionHitEnemyUids32 = null;

  function _beginBlessingAttackTrack32() {
    _blessingActionHitEnemyUids32 = new Set();
  }

  function _finishBlessingAttackTrack32() {
    if (!_bs || !_bs.blessing || !_blessingActionHitEnemyUids32) {
      _blessingActionHitEnemyUids32 = null;
      return;
    }
    const blessing = _bs.blessing;
    const count = _blessingActionHitEnemyUids32.size;
    _blessingActionHitEnemyUids32 = null;
    if (blessing.conditionType !== 'multi_target_attack') return;
    blessing.multiTargetMax = Math.max(Number(blessing.multiTargetMax || 0), count);
    if (!blessing.used && count >= Number(blessing.invRequiredTargets || 2)) {
      blessing.conditionMet = true;
      _log(`加護条件達成：1度の攻撃で敵${count}体にダメージ`);
      _emit('blessingProgress', { blessing: { ...blessing }, bs: _snapshot() });
    }
  }

  function _isBlessingReady32(blessing) {
    if (!blessing || blessing.used) return false;
    if (blessing.conditionType === 'enemy_kill_count') {
      return Number(blessing.killCount || 0) >= Number(blessing.invRequiredKills || 0);
    }
    if (blessing.conditionType === 'multi_target_attack') return !!blessing.conditionMet;
    if (blessing.conditionType === 'lost_ally_exists') {
      return (_bs.allies || []).some(a => a && a.hp <= 0 && !a.isFixedFirst);
    }
    return false;
  }

  function _applyBlessingHpPassive32(unit) {
    if (!unit || !_bs || !_bs.blessing || unit._blessingHpApplied) return;
    const rate = Number(_bs.blessing.passiveHpRate || 0);
    if (rate <= 0) return;
    const oldMax = Number(unit.hpMax || unit.hp || 1);
    const newMax = Math.max(1, Math.round(oldMax * (1 + rate)));
    unit.hpMax = newMax;
    if (unit.hp > 0) unit.hp = Math.max(1, Math.round(Number(unit.hp || oldMax) * (1 + rate)));
    unit._blessingHpApplied = true;
  }

  function _applyTurnStartBlessing32() {
    if (!_bs || !_bs.blessing || !_bs.link) return;
    const blessing = _bs.blessing;
    if (blessing.id !== 'remnant_03') return;
    const chance = Math.max(0, Math.min(1, Number(blessing.turnStartLinkChance || 0)));
    if (Math.random() >= chance) return;
    const before = Number(_bs.link.current || 0);
    _bs.link.max = Math.max(Number(_bs.link.max || 0), before + 1);
    _bs.link.current = before + 1;
    _log(`リヴィアの加護：ターン開始時 LINK+1`);
    _emit('blessingPassive', { blessing: { ...blessing }, type: 'link_plus', amount: 1, bs: _snapshot() });
  }

  function _syncBlessingDefeats32() {
    if (!_bs || !_bs.blessing) return;
    const blessing = _bs.blessing;
    const seen = new Set(Array.isArray(blessing.defeatedEnemyUids) ? blessing.defeatedEnemyUids : []);
    (_bs.enemies || []).forEach(enemy => {
      if (!enemy || Number(enemy.hp || 0) > 0) return;
      const uid = enemy._uid || enemy.id;
      if (!uid || seen.has(uid)) return;
      seen.add(uid);
      blessing.killCount = Number(blessing.killCount || 0) + 1;
      _log(`加護条件：敵撃破 ${blessing.killCount} / ${blessing.invRequiredKills}`);
      _emit('blessingProgress', { blessing: { ...blessing, defeatedEnemyUids: [...seen] }, bs: _snapshot() });
    });
    blessing.defeatedEnemyUids = [...seen];
  }

  function getBlessingInvTargets() {
    if (!_bs || !_bs.blessing) return [];
    const type = _bs.blessing.invEffectType;
    if (type === 'single_enemy_damage') {
      return (_bs.enemies || []).filter(e => e && e.hp > 0).map(e => ({ _uid:e._uid, name:e.name, side:'enemy', hp:e.hp, hpMax:e.hpMax }));
    }
    if (type === 'revive_ally') {
      return (_bs.allies || []).filter(a => a && a.hp <= 0 && !a.isFixedFirst).map(a => ({ _uid:a._uid, name:a.name, side:'ally', hp:a.hp, hpMax:a.hpMax }));
    }
    return [];
  }

  function activateBlessingInv(targetUid) {
    if (!_bs || !_bs.blessing || _bs.result || _bs.phase !== 'skill') return false;
    const blessing = _bs.blessing;
    _syncBlessingDefeats32();
    if (!_isBlessingReady32(blessing)) return false;

    const effectType = blessing.invEffectType || 'critical_up';
    let target = null;
    if (effectType === 'single_enemy_damage') {
      target = (_bs.enemies || []).find(e => e && e.hp > 0 && e._uid === targetUid);
      if (!target) return { needsTarget: true, targetType: 'enemy', targets: getBlessingInvTargets() };
    } else if (effectType === 'revive_ally') {
      target = (_bs.allies || []).find(a => a && a.hp <= 0 && !a.isFixedFirst && a._uid === targetUid);
      if (!target) return { needsTarget: true, targetType: 'lost_ally', targets: getBlessingInvTargets() };
    }

    blessing.used = true;
    blessing.activeTurn = effectType === 'critical_up' ? _bs.turn : null;
    const invName = blessing.invName || blessing.name || '加護';

    if (effectType === 'critical_up') {
      const invRate = Math.round(Number(blessing.invCriticalRate || 0) * 100);
      _log(`INV「${invName}」発動：このターン、味方全員のcritical率+${invRate}%`);
    } else if (effectType === 'single_enemy_damage') {
      const totalAtk = (_bs.allies || []).filter(a => a && a.hp > 0).reduce((sum, a) => sum + getEffectiveAtk(a), 0);
      const damage = Math.max(1, Math.round(totalAtk * Number(blessing.invDamageRate || 0.8)));
      applyDamage(target, damage, { name: invName, side: 'ally' }, { id:'blessing_inv', name:invName });
      _log(`INV「${invName}」：${target.name}に${damage}ダメージ`);
    } else if (effectType === 'all_enemy_stun') {
      const turns = Math.max(1, Number(blessing.invStunTurns || 1));
      (_bs.enemies || []).filter(e => e && e.hp > 0).forEach(enemy => {
        enemy.stunned = true;
        enemy.statusEffects = Array.isArray(enemy.statusEffects) ? enemy.statusEffects : [];
        enemy.statusEffects.push({ type:'stun', duration:turns, sourceName:invName });
      });
      _log(`INV「${invName}」：盤面上の敵全員を${turns}ターンスタン`);
    } else if (effectType === 'revive_ally') {
      const chance = Math.max(0, Math.min(1, Number(blessing.invReviveChance || 0)));
      if (Math.random() < chance) {
        target.hp = Math.max(1, Math.round(Number(target.hpMax || 1) * Number(blessing.invReviveHpRate || 0.5)));
        target.stunned = false;
        target.statusEffects = [];
        if (_bs.roster) {
          const rosterEntry = _bs.roster.find(r => r && r.deployedUid === target._uid);
          if (rosterEntry) rosterEntry.status = 'deployed';
        }
        _log(`INV「${invName}」成功：${target.name}が蘇生した`);
        _emit('revive', { target:{...target}, blessing:{...blessing}, bs:_snapshot() });
      } else {
        _log(`INV「${invName}」失敗：${target.name}は蘇生しなかった`);
      }
    }

    _emit('blessingInv', { blessing: { ...blessing }, target: target ? { ...target } : null, bs: _snapshot() });
    _renderUI();
    _checkWinLose();
    _saveResume();
    return true;
  }

  // ============================================================
  // 能力変動エフェクト通知ヘルパー
  // ============================================================
  function _statusEffectLabel32(effect) {
    if (!effect) return '';
    const type = effect.type || '';
    const rate = Number(effect.rate);
    const dur = effect.duration ? `${effect.duration}T` : '';

    if (type === 'atk_up') {
      const pct = Number.isFinite(rate) ? Math.round((rate - 1) * 100) : 50;
      return `ATK+${pct}%${dur ? ` / ${dur}` : ''}`;
    }
    if (type === 'atk_down') {
      const pct = Number.isFinite(rate) ? Math.round((1 - rate) * 100) : 30;
      return `ATK-${pct}%${dur ? ` / ${dur}` : ''}`;
    }
    if (type === 'critical_up' || type === 'crit_up') {
      const pct = Number.isFinite(rate) ? Math.round(_normalizeCriticalRate32(rate) * 100) : 20;
      return `CRI+${pct}%${dur ? ` / ${dur}` : ''}`;
    }
    if (type === 'critical_down' || type === 'crit_down') {
      const pct = Number.isFinite(rate) ? Math.round(_normalizeCriticalRate32(rate) * 100) : 20;
      return `CRI-${pct}%${dur ? ` / ${dur}` : ''}`;
    }
    if (type === 'damage_cut') {
      const pct = Number.isFinite(rate) ? Math.round(rate * 100) : 50;
      return `DMG-${pct}%${dur ? ` / ${dur}` : ''}`;
    }
    if (type === 'stun') return `STUN${dur ? ` / ${dur}` : ''}`;
    if (type === 'poison') return `POISON${dur ? ` / ${dur}` : ''}`;
    if (type === 'yoi_no_sousou') return `COUNTER${dur ? ` / ${dur}` : ''}`;
    return `${String(type).toUpperCase()}${dur ? ` / ${dur}` : ''}`;
  }

  function _statusEffectTone32(effect) {
    const type = effect && effect.type;
    if (type === 'atk_up' || type === 'damage_cut' || type === 'yoi_no_sousou' || type === 'critical_up' || type === 'crit_up') return 'buff';
    if (type === 'atk_down' || type === 'stun' || type === 'poison' || type === 'critical_down' || type === 'crit_down') return 'debuff';
    return 'status';
  }

  function _emitStatusChange32(target, effect, source, reason) {
    if (!target || !effect) return;
    _emit('statusChange', {
      source: source ? { _uid: source._uid, name: source.name, side: source.side, row: source.row, col: source.col } : null,
      target: { _uid: target._uid, name: target.name, side: target.side, row: target.row, col: target.col },
      effect: { ...effect },
      label: _statusEffectLabel32(effect),
      tone: _statusEffectTone32(effect),
      reason: reason || null,
      bs: _snapshot(),
    });
  }

  // ============================================================
  // 酔ノ想葬：敵攻撃への回避・移動・反撃
  // ============================================================
  function _hasYoiNoSousou(unit) {
    return !!(unit && Array.isArray(unit.statusEffects) &&
      unit.statusEffects.some(e => e && e.type === 'yoi_no_sousou' && (e.duration || 0) > 0));
  }

  function _pickYoiNoSousouCounterCell(ally, enemy) {
    if (!ally || !enemy) return null;

    // 敵に隣接する8方向の空きマス。現在地は「移動」にならないので除外。
    const candidates = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const row = enemy.row + dr;
        const col = enemy.col + dc;
        if (row === ally.row && col === ally.col) continue;
        if (!_canForcedMoveTo(ally, row, col)) continue;
        candidates.push({ row, col });
      }
    }

    if (candidates.length === 0) return null;

    // 酔剣らしく候補からランダム。近接できればどこでも良い。
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function _tryYoiNoSousouCounter(target, source, rawDamage, skill) {
    if (!_bs || !target || !source) return false;
    if (target.side !== 'ally' || source.side !== 'enemy') return false;
    if (target.hp <= 0 || source.hp <= 0) return false;
    if (!_hasYoiNoSousou(target)) return false;

    const from = { row: target.row, col: target.col };
    const cell = _pickYoiNoSousouCounterCell(target, source);

    _log(`${target.name} は「酔ノ想葬」で ${source.name} の攻撃を回避！`);

    if (!cell) {
      _log(`${target.name} は反撃位置を取れなかった`);
      _emit('evadeCounter', {
        source: { _uid: source._uid, name: source.name, side: source.side, row: source.row, col: source.col },
        target: { _uid: target._uid, name: target.name, side: target.side, row: target.row, col: target.col },
        evaded: true,
        countered: false,
        skillName: '酔ノ想葬',
        bs: _snapshot(),
      });
      return true;
    }

    target.row = cell.row;
    target.col = cell.col;

    _emit('forcedMove', {
      source: { _uid: target._uid, name: target.name, side: target.side, row: target.row, col: target.col },
      target: { _uid: target._uid, name: target.name, side: target.side, row: target.row, col: target.col },
      from,
      to: { row: target.row, col: target.col },
      effectType: 'yoi_no_sousou',
      moved: 1,
      bs: _snapshot(),
    });

    const eff = target.statusEffects.find(e => e && e.type === 'yoi_no_sousou' && (e.duration || 0) > 0) || {};
    const rate = Number(eff.counterMultiplier != null ? eff.counterMultiplier : 1.0);
    const counterDmg = calcDamage(getEffectiveAtk(target), Number.isFinite(rate) ? rate : 1.0, source, target);

    _log(`${target.name} が ${source.name} に反撃！`);
    applyDamage(source, counterDmg, target, {
      id: 'yoi_no_sousou_counter',
      name: '酔ノ想葬・反撃',
      isUltimate: false,
      hitStyle: 'counter',
    });

    _emit('evadeCounter', {
      source: { _uid: source._uid, name: source.name, side: source.side, row: source.row, col: source.col },
      target: { _uid: target._uid, name: target.name, side: target.side, row: target.row, col: target.col },
      evaded: true,
      countered: true,
      skillName: '酔ノ想葬',
      bs: _snapshot(),
    });

    return true;
  }

  // ============================================================
  // ダメージ処理（結界・def_down 考慮）
  // 味方・敵ともに hp を減らす（統一）
  // ============================================================
  function applyDamage(target, rawDamage, source, skill) {
    if (_tryYoiNoSousouCounter(target, source, rawDamage, skill)) {
      _checkWinLose();
      return;
    }

    const criticalRoll = rollCriticalDamage32(rawDamage, source, skill);
    let dmg = criticalRoll.amount;

    // ローグライト: ガードアイテムによるダメージカット。
    // 追加効果（スタン/毒など）はこの後の effects 処理で通常通り入るため、ダメージだけを軽減する。
    if (target.side === 'ally' && Array.isArray(target.statusEffects)) {
      const guards = target.statusEffects.filter(e =>
        e && e.type === 'damage_cut' && (e.duration == null || e.duration > 0)
      );
      if (guards.length > 0) {
        const cut = guards.reduce((m, e) => {
          const r = Number(e.rate != null ? e.rate : e.value);
          return Number.isFinite(r) ? Math.max(m, Math.max(0, Math.min(0.95, r))) : m;
        }, 0);
        if (cut > 0) {
          dmg = Math.max(0, Math.floor(dmg * (1 - cut)));
          _log(`${target.name} はガード状態：ダメージ${Math.round(cut * 100)}%カット`);
        }
      }
    }

    // 結界：ダメージ軽減（味方のみ）
    if (target.side === 'ally' && target.shieldRate > 0) {
      dmg = Math.floor(dmg * (1 - target.shieldRate));
      target.shieldRate = 0;
      _log(`${target.name} の結界が発動！ダメージを軽減`);
    }

    const hpBefore = Number(target.hp || 0);
    if (_blessingActionHitEnemyUids32 && target.side === 'enemy' && source && source.side === 'ally' && dmg > 0) {
      _blessingActionHitEnemyUids32.add(target._uid || target.id);
    }
    target.hp = Math.max(0, target.hp - dmg);
    const hpAfter = Number(target.hp || 0);
    if (target.side === 'enemy' && hpBefore > 0 && hpAfter <= 0) _syncBlessingDefeats32();
    const isFatalDamage = hpBefore > 0 && dmg > 0 && hpAfter <= 0;
    const overkillDamage = isFatalDamage ? Math.max(0, dmg - hpBefore) : 0;
    const elementText = source ? getElementMatchText32(source.element, target.element) : '';
    const elementSuffix = elementText ? `【${elementText}】` : '';
    const criticalSuffix = criticalRoll.isCritical ? ` CRITICAL×${criticalRoll.criticalCount || 1}` : '';
    _log(`${source ? source.name : '？'} → ${target.name} に ${dmg} ダメージ！${criticalSuffix}${elementSuffix}（残HP: ${target.hp}）`);

    // ローグライト: 味方HPが0になったらrosterをdead更新
    if (target.side === 'ally' && target.hp <= 0 && _bs.roster) {
      const rEntry = _bs.roster.find(r => r.deployedUid === target._uid);
      if (rEntry && rEntry.status === 'deployed') {
        rEntry.status = 'dead';
      }
    }
    _emit('damage', {
      source: source ? { 
        _uid: source._uid, 
        name: source.name, 
        side: source.side, 
        row: source.row, 
        col: source.col,
        element: source.element,
      } : null,

      target: { 
        _uid: target._uid, 
        name: target.name, 
        side: target.side, 
        row: target.row, 
        col: target.col,
        element: target.element,
        hpBefore,
        hpAfter,
        hpMax: target.hpMax,
        isFatal: isFatalDamage,
         },

      amount: dmg,
      kind: 'damage',
      hpBefore,
      hpAfter,
      targetHpMax: target.hpMax,
      isFatal: isFatalDamage,
      overkill: overkillDamage,

      isCritical: !!criticalRoll.isCritical,
      criticalCount: criticalRoll.criticalCount || 0,
      criticalRate: criticalRoll.criticalRate || 0,
      criticalMultiplier: criticalRoll.criticalMultiplier || CRITICAL_DAMAGE_RATE_32,
      baseAmount: criticalRoll.baseAmount,
      criticalHits: Array.isArray(criticalRoll.criticalHits) ? criticalRoll.criticalHits.map(h => ({ ...h })) : [],

      elementMatch: elementText || '',
      elementRate: source ? getElementRate32(source.element, target.element) : 1.0,
      sourceElement: source ? source.element : null,
      targetElement: target ? target.element : null,

      skillId:     skill?.id        || null,
      skillName:   skill?.name      || null,
      isUltimate:  !!skill?.isUltimate,
      hitStyle:    skill?.hitStyle  || 'normal',
      hitCount:    skill?.hitCount  || criticalRoll.hitCount || null,
      bs: _snapshot(),
    });

    // ダメージ後に勝敗を即チェック
    _checkWinLose();
    return { amount: dmg, criticalRoll, hpBefore, hpAfter };
  }

function _queueDelayedAttack(ally, skill) {
  if (!_bs.delayedActions) _bs.delayedActions = [];

  const delayTurns = Number(skill.delayTurns || 2);

  _bs.delayedActions.push({
    id: uid(),
    kind: 'attack',
    ownerUid: ally._uid,
    ownerName: ally.name,
    ownerElement: ally.element || null,
    ownerAtk: getEffectiveAtk(ally),

    skillId: skill.id,
    skillName: skill.name,
    isUltimate: !!skill.isUltimate,

    range: skill.range,
    multiplier: skill.multiplier || 1,
    hit: skill.hit == null ? 100 : skill.hit,
    hitStyle: skill.hitStyle || 'normal',
    effects: Array.isArray(skill.effects) ? deepClone(skill.effects) : [],

    trigger: skill.delayedTrigger || 'allyTurnStart',
    triggerTurn: _bs.turn + delayTurns,
  });

  _log(`${ally.name} は「${skill.name}」を予約した。${delayTurns}ターン後に発動する`);
}


function _findOriginalSkillDefinition32(ally, skill) {
  if (!ally || !skill) return null;

  const charIdCandidates = [
    ally.id,
    ally.charId,
    ally.charaId,
    ally.characterId,
    skill.charId,
    skill.charaId,
    skill.characterId,
  ].filter(v => v != null);

  const charList = (typeof CHARACTERS !== 'undefined' && Array.isArray(CHARACTERS))
    ? CHARACTERS
    : (Array.isArray(window.CHARACTERS) ? window.CHARACTERS : []);

  let charDef = null;
  for (const id of charIdCandidates) {
    charDef = charList.find(c => c && String(c.id) === String(id)) || null;
    if (charDef) break;
  }
  if (!charDef && ally.name) {
    charDef = charList.find(c => c && c.name === ally.name) || null;
  }

  const skills = Array.isArray(charDef && charDef.skills) ? charDef.skills : [];
  return skills.find(s => s && s.id === skill.id) || skills.find(s => s && s.name === skill.name) || null;
}

function _getDelayedSupportOptions32(ally, skill, key) {
  const fromSkill = Array.isArray(skill && skill[key]) ? skill[key] : [];
  if (fromSkill.length > 0) return deepClone(fromSkill);

  const masterSkill = _findOriginalSkillDefinition32(ally, skill);
  const fromMaster = Array.isArray(masterSkill && masterSkill[key]) ? masterSkill[key] : [];
  if (fromMaster.length > 0) return deepClone(fromMaster);

  // 最終フォールバック：スイの星読み系だけはここで候補を復元する。
  // characters_32 変換で randomOptions / choiceOptions が落ちても、空効果にならないようにする。
  const skillName = String((skill && skill.name) || '');
  const skillType = String((skill && skill.type) || '').toLowerCase();
  if (key === 'randomOptions' && (skillType === 'delayed_random_support' || skillName.includes('星読み'))) {
    return [
      { effectType: 'link_plus_2', label: 'LINK+2', amount: 2 },
      { effectType: 'lowest_hp_heal', label: '一番HPの低い味方を最大HPの50%回復', rate: 0.50 },
      { effectType: 'all_critical_up', label: '味方全体critical率+15%', rate: 0.15, duration: 1 },
    ];
  }
  if (key === 'choiceOptions' && (skillType === 'delayed_choice_support' || skillName.includes('星環'))) {
    return [
      { effectType: 'link_plus_2', label: 'LINK+2', amount: 2 },
      { effectType: 'all_critical_up', label: '味方全体critical率+50%', rate: 0.50, duration: 1 },
      { effectType: 'all_guard', label: '味方全体ガード（ダメージ70%カット）', rate: 0.70, duration: 1 },
    ];
  }

  return [];
}

function _queueDelayedSupport(ally, skill, selectedOptionOverride) {
  if (!_bs.delayedActions) _bs.delayedActions = [];

  // 支援予約は「次の自ターン開始時」が基本。明示指定があればそれを優先。
  const delayTurns = Math.max(1, Number(skill.delayTurns || 1));
  const randomOptions = _getDelayedSupportOptions32(ally, skill, 'randomOptions');
  const choiceOptions = _getDelayedSupportOptions32(ally, skill, 'choiceOptions');

  _bs.delayedActions.push({
    id: uid(),
    kind: 'support',
    ownerUid: ally._uid,
    ownerName: ally.name,
    ownerElement: ally.element || null,

    skillId: skill.id,
    skillName: skill.name,
    isUltimate: !!skill.isUltimate,
    hitStyle: skill.hitStyle || 'support',

    randomOptions,
    choiceOptions,
    selectedOption: selectedOptionOverride
      ? deepClone(selectedOptionOverride)
      : (skill.selectedOption ? deepClone(skill.selectedOption) : null),

    trigger: skill.delayedTrigger || 'allyTurnStart',
    triggerTurn: _bs.turn + delayTurns,
  });

  _log(`${ally.name} は「${skill.name}」を予約した。次の味方ターン開始時に発動する`);
}

function _pickDelayedSupportOption(action) {
  if (!action) return null;

  if (action.selectedOption) return deepClone(action.selectedOption);

  const randomOptions = Array.isArray(action.randomOptions) ? action.randomOptions : [];
  if (randomOptions.length > 0) {
    return deepClone(randomOptions[Math.floor(Math.random() * randomOptions.length)]);
  }

  const choiceOptions = Array.isArray(action.choiceOptions) ? action.choiceOptions : [];
  if (choiceOptions.length > 0) {
    // UI側で選択肢指定がまだない場合の安全フォールバック。
    // ULTが未選択で止まるよりは、先頭効果を発動させる。
    return deepClone(choiceOptions[0]);
  }

  return null;
}

function _formatDelayedSupportOptionLabel(option) {
  if (!option) return '効果なし';
  if (option.label) return String(option.label);

  const type = String(option.effectType || option.type || '');
  const rate = Number(option.rate);
  const amount = Number(option.amount);

  if (type === 'link_plus_2' || type === 'link_plus_3' || type === 'link_plus') {
    const n = Number.isFinite(amount) ? amount : Number(type.replace('link_plus_', '')) || 0;
    return `LINK+${n}`;
  }
  if (type === 'lowest_full_heal') return '一番HPの低い味方を全回復';
  if (type === 'lowest_hp_heal') {
    const healRate = Number.isFinite(rate) ? rate : 0.50;
    return `一番HPの低い味方を最大HPの${Math.round(healRate * 100)}%回復`;
  }
  if (type === 'all_critical_up' || type === 'critical_up' || type === 'crit_up') {
    return `味方全体CRI+${Number.isFinite(rate) ? Math.round(rate * 100) : 20}%`;
  }
  if (type === 'all_guard' || type === 'damage_cut') {
    return `味方全体ガード`;
  }
  return type || '効果';
}

function _applyDelayedSupportOption(action, option) {
  if (!_bs || !option) return { label: '効果なし', detail: '発動できる効果がありません' };

  const type = String(option.effectType || option.type || '');
  const label = _formatDelayedSupportOptionLabel(option);
  const source = {
    _uid: action.ownerUid,
    name: action.ownerName || '星読み',
    side: 'ally',
    row: 0,
    col: 0,
    element: action.ownerElement || null,
  };

  if (type === 'link_plus_2' || type === 'link_plus_3' || type === 'link_plus') {
    if (!_bs.link) return { label, detail: 'LINKがありません' };

    const amount = Math.max(0, Math.floor(Number(option.amount != null ? option.amount : String(type).replace('link_plus_', '')) || 0));
    const before = Number(_bs.link.current || 0);

    // ターン開始直後はLINKが満タンになりがちなので、星読み分はそのターンだけ一時的に上限も押し上げる。
    // 例：6/6の状態でLINK+2を引いたら 8/8 まで保持できる。
    const baseMax = Number(_bs.link.max || before);
    const after = before + amount;
    _bs.link.max = Math.max(baseMax, after);
    _bs.link.current = after;
    _bs.link.overCapUntilTurnEnd = _bs.link.max > Number(_bs.link.baseMax || calcLinkMax(_bs.turn));

    const detail = _bs.link.max > baseMax
      ? `LINK上限突破 ${before} → ${_bs.link.current}`
      : `LINK ${before} → ${_bs.link.current}`;
    _log(`${action.ownerName}の「${action.skillName}」により ${label} が発動（${detail}）`);
    return { label, detail };
  }

  if (type === 'lowest_full_heal' || type === 'lowest_hp_heal') {
    const targets = (_bs.allies || []).filter(a => a && a.hp > 0);
    if (!targets.length) {
      _log(`${action.ownerName}の「${action.skillName}」が発動したが、回復対象がいません`);
      return { label, detail: '回復対象なし' };
    }

    targets.sort((a, b) => {
      const ar = a.hpMax > 0 ? a.hp / a.hpMax : 1;
      const br = b.hpMax > 0 ? b.hp / b.hpMax : 1;
      return ar - br;
    });

    const target = targets[0];
    const before = Number(target.hp || 0);
    const hpMax = Number(target.hpMax || target.hp || 0);
    const healRate = type === 'lowest_full_heal'
      ? 1
      : Math.max(0, Math.min(1, Number(option.rate != null ? option.rate : 0.50)));
    const healValue = type === 'lowest_full_heal'
      ? hpMax
      : Math.max(1, Math.floor(hpMax * healRate));
    target.hp = Math.min(hpMax, before + healValue);
    const amount = Math.max(0, target.hp - before);
    const detail = amount > 0 ? `${target.name} HP ${before} → ${target.hp}` : `${target.name} はHP満タン`;

    const healText = type === 'lowest_full_heal' ? '全回復' : `最大HPの${Math.round(healRate * 100)}%回復`;
    _log(`${action.ownerName}の「${action.skillName}」により ${target.name} が${healText}`);
    if (amount > 0) {
      _emit('heal', {
        source,
        target: { _uid: target._uid, name: target.name, side: target.side, row: target.row, col: target.col },
        amount,
        kind: 'heal',
        skillId: action.skillId || null,
        skillName: action.skillName || null,
        isUltimate: !!action.isUltimate,
        hitStyle: action.hitStyle || 'support',
        bs: _snapshot(),
      });
    }
    return { label, detail };
  }

  if (type === 'all_critical_up' || type === 'critical_up' || type === 'crit_up') {
    const rate = Math.max(0, Math.min(1, Number(option.rate != null ? option.rate : 0.20)));
    const duration = Math.max(1, Number(option.duration || 1));
    const targets = (_bs.allies || []).filter(a => a && a.hp > 0);

    targets.forEach(target => {
      if (!Array.isArray(target.statusEffects)) target.statusEffects = [];
      const applied = {
        type: 'critical_up',
        rate,
        duration,
        sourceName: action.skillName || action.ownerName || '星読み',
      };
      target.statusEffects.push(applied);
      _emitStatusChange32(target, applied, source, 'delayed_support');
    });

    const detail = `味方全体にCRI+${Math.round(rate * 100)}% / ${duration}T`;
    _log(`${action.ownerName}の「${action.skillName}」により ${detail} が付与された`);
    return { label: `CRI+${Math.round(rate * 100)}%`, detail };
  }

  if (type === 'all_guard' || type === 'damage_cut') {
    const rate = Math.max(0, Math.min(0.95, Number(option.rate != null ? option.rate : 0.80)));
    const duration = Math.max(1, Number(option.duration || 2));
    const targets = (_bs.allies || []).filter(a => a && a.hp > 0);

    targets.forEach(target => {
      if (!Array.isArray(target.statusEffects)) target.statusEffects = [];
      const applied = {
        type: 'damage_cut',
        rate,
        duration,
        sourceName: action.skillName || action.ownerName || '星読み',
      };
      target.statusEffects.push(applied);
      _emitStatusChange32(target, applied, source, 'delayed_support');
    });

    const detail = `味方全体にガード / ダメージ${Math.round(rate * 100)}%カット / ${duration}T`;
    _log(`${action.ownerName}の「${action.skillName}」により ${detail} が付与された`);
    return { label: 'ガード', detail };
  }

  _log(`${action.ownerName}の「${action.skillName}」が発動したが、未対応効果です: ${type}`);
  return { label, detail: `未対応効果: ${type}` };
}

async function _executeDelayedSupport(action) {
  const option = _pickDelayedSupportOption(action);
  const result = _applyDelayedSupportOption(action, option);

  _renderUI();

  const owner = action.ownerName || 'スイ';
  const skill = action.skillName || '星読みの予兆';
  const label = result && result.label ? result.label : _formatDelayedSupportOptionLabel(option);
  const detail = result && result.detail ? result.detail : label;

  // 星読み系はランダム効果の把握が重要なので、通常アクションより長めに見せる。
  // 次の TURNS 表示に即上書きされて「何が起きたか分からない」状態を防ぐ。
  await _centerTextWait(
    `${owner}の${skill}`,
    `${label} が発動：${detail}`,
    Math.max(2200, B32_WAIT.action || 0)
  );

  await wait(420);
}

async function _processDelayedActions(trigger) {
  if (!_bs || !_bs.delayedActions || _bs.delayedActions.length === 0) return;

  const ready = _bs.delayedActions.filter(a =>
    a.trigger === trigger &&
    _bs.turn >= a.triggerTurn
  );

  if (ready.length === 0) return;

  _bs.delayedActions = _bs.delayedActions.filter(a => !ready.includes(a));

  for (const action of ready) {
    if (_bs.result) break;

    if (action && action.kind === 'support') {
      await _executeDelayedSupport(action);
      continue;
    }

    await _centerTextWait(action.skillName || 'DELAYED ATTACK', '未来干渉 発動', B32_WAIT.action);

    _executeDelayedAttack(action);

    _renderUI();
    await wait(B32_WAIT.attack);
    await wait(B32_WAIT.afterText);
  }
}

function _executeDelayedAttack(action) {
  // field系レンジは使用者位置に依存しないのでダミーでOK
  const dummyUser = {
    row: 0,
    col: 0,
    side: 'ally',
    name: action.ownerName || '予約攻撃',
  };

  const targets = BR
    .getUnitsFromRange32(dummyUser, action.range, _bs.enemies)
    .filter(e => e.hp > 0);

  if (targets.length === 0) {
    _log(`「${action.skillName}」が発動したが、範囲内に敵はいなかった`);
    return;
  }

  _log(`「${action.skillName}」が発動！`);

  targets.forEach(enemy => {
    let dmg = calcDamage(action.ownerAtk || 1, action.multiplier || 1, enemy, { element: action.ownerElement });

    // ローグライト：スキルダメージ補正
    if (_bs._rl_skillDmgMult && _bs._rl_skillDmgMult !== 1.0) {
      dmg = Math.round(dmg * _bs._rl_skillDmgMult);
    }

    // ローグライト：ボスダメージ補正
    if (enemy.isBoss && _bs._rl_bossDmgMult && _bs._rl_bossDmgMult !== 1.0) {
      dmg = Math.round(dmg * _bs._rl_bossDmgMult);
    }

    applyDamage(enemy, dmg, {
      _uid: action.ownerUid,
      name: action.ownerName,
      element: action.ownerElement || null,
      side: 'ally',
      row: dummyUser.row,
      col: dummyUser.col,
    }, {
      id: action.skillId,
      name: action.skillName,
      isUltimate: action.isUltimate,
      hitStyle: action.hitStyle || 'normal',
    });

    _applyEffects(action.effects, enemy, {
      _uid: action.ownerUid,
      name: action.ownerName,
      side: 'ally',
    });
  });

  _checkWinLose();
}


  // ============================================================
  // 盤面設置型召喚物（chara_16 ULTなど）
  // ============================================================
  function _getForwardCellFromUnit(unit, distance) {
    const d = Math.max(1, Number(distance || 1));
    // 味方は上方向（row小）を前方として扱う
    const dr = unit && unit.side === 'enemy' ? d : -d;
    return { row: Number(unit.row) + dr, col: Number(unit.col) };
  }

  function _isCellBlocked(row, col) {
    if (!_isInsideBoard(row, col)) return true;
    return getAllUnits().some(u =>
      u && (u.hp > 0 || u.isBoss) && Number(u.row) === Number(row) && Number(u.col) === Number(col)
    );
  }

  function _createBoardSummon(owner, skill, row, col) {
    if (!_bs.summons) _bs.summons = [];

    const duration = Math.max(1, Number(skill.summonDuration || 3));
    const summonHp = Math.max(1, Number(skill.summonHp || 1));
    const drainEffect = (skill.effects || []).find(e => e && e.type === 'drain') || null;
    const summon = {
      _uid: uid(),
      id: `${owner.id || 'ally'}_${skill.id || 'summon'}_set`,
      name: skill.summonName || '式神',
      side: 'summon',
      ownerUid: owner._uid,
      ownerName: owner.name,
      ownerElement: owner.element || null,
      ownerAtk: getEffectiveAtk(owner),
      skillId: skill.id || null,
      skillName: skill.name || null,
      row,
      col,
      hp: summonHp,
      hpMax: summonHp,
      atk: 0,
      element: owner.element || 'mystis',
      img: skill.summonImg || 'images/chara_16_set.webp',
      battleImg: skill.summonImg || 'images/chara_16_set.webp',
      battleBackImg: skill.summonImg || 'images/chara_16_set.webp',
      uiScale: { battleBack: Number(skill.summonScale || 1.45) },
      uiOffset: { battleBack: 0 },
      statusEffects: [],
      remainingTurns: duration,
      tickMultiplier: Number(skill.summonTickMultiplier || skill.multiplier || 1.0),
      tickEffects: (skill.effects || [])
        .filter(e => e && e.type !== 'drain' && (!e.target || e.target === 'enemy'))
        .map(e => ({ ...e })),
      summonRange: skill.summonRange || 'around9',
      drainRate: drainEffect
        ? Number(drainEffect.rate != null ? drainEffect.rate : 0.5)
        : Number(skill.summonDrainRate != null ? skill.summonDrainRate : 0),
      drainTarget: (drainEffect && drainEffect.target) || 'ally_all',

      // ロゼの茨薔薇など、敵の直線系攻撃を遮る設置物。
      // 敵の攻撃対象として先に受け、後ろの味方へ貫通させない。
      blocksEnemyProjectiles: !!skill.summonBlockEnemyProjectiles,
      blocksEnemyFrontAttack: !!skill.summonBlockEnemyFrontAttack,
    };

    _bs.summons.push(summon);
    _log(`${owner.name} は ${summon.name} を設置した（${duration}T）`);
    _emit('summonObject', { summon: { ...summon }, owner: { ...owner }, skill, bs: _snapshot() });
    return summon;
  }

  function _executeSummonObjectSkill(ally, skill) {
    const distance = Math.max(1, Number(skill.summonDistance || 2));
    const base = _getForwardCellFromUnit(ally, distance);
    const rawOffsets = Array.isArray(skill.summonOffsets) && skill.summonOffsets.length > 0
      ? skill.summonOffsets
      : [{ dr: 0, dc: 0 }];
    const count = Math.max(1, Number(skill.summonCount || rawOffsets.length || 1));
    const offsets = rawOffsets.slice(0, count);

    let created = 0;
    offsets.forEach(offset => {
      const row = Number(base.row) + Number(offset && offset.dr || 0);
      const col = Number(base.col) + Number(offset && offset.dc || 0);

      if (!_isInsideBoard(row, col)) {
        _log(`${ally.name}：設置候補が盤面外です`);
        return;
      }
      if (_isCellBlocked(row, col)) {
        _log(`${ally.name}：設置候補には設置できません`);
        return;
      }

      _createBoardSummon(ally, skill, row, col);
      created += 1;
    });

    if (created <= 0) {
      _log(`${ally.name}：召喚物を設置できるマスがありません`);
      return false;
    }
    return true;
  }

  function _getEnemiesAround9(row, col) {
    return (_bs.enemies || []).filter(enemy => {
      if (!enemy || enemy.hp <= 0) return false;
      return Math.abs(Number(enemy.row) - Number(row)) <= 1 &&
             Math.abs(Number(enemy.col) - Number(col)) <= 1;
    });
  }

  function _applyBoardSummonTicks() {
    if (!_bs || !_bs.summons || _bs.summons.length === 0) return;

    const survivors = [];

    _bs.summons.forEach(summon => {
      if (!summon || summon.hp <= 0) return;

      const targets = _getEnemiesAround9(summon.row, summon.col);
      let drainTotal = 0;

      if (targets.length > 0) {
        targets.forEach(enemy => {
          const source = {
            _uid: summon.ownerUid || summon._uid,
            name: summon.ownerName || summon.name || '式神',
            element: summon.ownerElement || summon.element || null,
            side: 'ally',
            row: summon.row,
            col: summon.col,
          };
          const skillInfo = {
            id: summon.skillId || 'summon_object_tick',
            name: summon.skillName || summon.name || '式神',
            isUltimate: true,
            hitStyle: 'summon_tick',
          };
          const dmg = calcDamage(Number(summon.ownerAtk || 1), Number(summon.tickMultiplier || 1.0), enemy, source);
          const hpBefore = enemy.hp;
          applyDamage(enemy, dmg, source, skillInfo);
          drainTotal += Math.min(dmg, hpBefore);
          _log(`${summon.name} が ${enemy.name} に ${dmg} ダメージ`);

          if (enemy.hp > 0 && Array.isArray(summon.tickEffects) && summon.tickEffects.length > 0) {
            _applyEffects(summon.tickEffects, enemy, source);
          }
        });

        if (drainTotal > 0 && Number(summon.drainRate || 0) > 0) {
          const rate = Number(summon.drainRate != null ? summon.drainRate : 0.5);
          const healAmount = Math.max(1, Math.round(drainTotal * rate));
          const healTargets = (summon.drainTarget === 'ally_self' || summon.drainTarget === 'self')
            ? (_bs.allies || []).filter(a => a && a.hp > 0 && a._uid === summon.ownerUid)
            : (_bs.allies || []).filter(a => a && a.hp > 0);

          healTargets.forEach(a => {
            const before = a.hp;
            a.hp = Math.min(a.hpMax, a.hp + healAmount);
            const actual = a.hp - before;
            if (actual <= 0) return;
            _log(`${a.name} は式神のドレインで ${actual} HP 回復`);
            _emit('heal', {
              source: { _uid: summon._uid, name: summon.name, side: 'summon', row: summon.row, col: summon.col },
              target: { _uid: a._uid, name: a.name, side: a.side, row: a.row, col: a.col },
              amount: actual,
              kind: 'drain',
              skillId: summon.skillId || null,
              skillName: summon.skillName || summon.name,
              isUltimate: true,
              hitStyle: 'summon_tick',
              bs: _snapshot(),
            });
          });
        }
      } else {
        _log(`${summon.name} の周囲に敵はいない`);
      }

      summon.remainingTurns = Number(summon.remainingTurns || 1) - 1;
      if (summon.remainingTurns > 0) {
        survivors.push(summon);
      } else {
        _log(`${summon.name} は消滅した`);
        _emit('summonObjectExpired', { summon: { ...summon }, bs: _snapshot() });
      }
    });

    _bs.summons = survivors;
  }

  function _splitSkillEffectsByTarget(skill) {
    const effects = Array.isArray(skill && skill.effects) ? skill.effects : [];
    return {
      enemyEffects: effects.filter(e => !e.target || e.target === 'enemy'),
      selfEffects: effects.filter(e => e.target === 'ally_self' || e.target === 'self'),
    };
  }

  function _applySelfEffectsFromSkill(skill, ally) {
    const { selfEffects } = _splitSkillEffectsByTarget(skill);
    if (!selfEffects.length || !ally || ally.hp <= 0) return;
    _applyEffects(selfEffects, ally, ally);
  }

  function _unitHasStatus32(unit, statusType) {
    if (!unit) return false;
    const status = String(statusType || '').toLowerCase();
    const effects = Array.isArray(unit.statusEffects) ? unit.statusEffects : [];

    // 仕様上「眠り」は stun として扱う。
    if (status === 'stun' || status === 'sleep' || status === '眠り') {
      return !!unit.stunned || effects.some(e =>
        e && e.type === 'stun' && (e.duration == null || Number(e.duration) > 0)
      );
    }

    return effects.some(e =>
      e && e.type === status && (e.duration == null || Number(e.duration) > 0)
    );
  }

  function _filterTargetsByRequiredStatus(targets, skill) {
    const requiredStatus = skill && (skill.requiredStatus || skill.targetStatus);
    if (!requiredStatus) return targets;
    return (targets || []).filter(target => _unitHasStatus32(target, requiredStatus));
  }


  // 予約攻撃系スキル判定。
  // characters.js 側で type 名が揺れても、delayTurns / delayedTrigger を持つものは
  // 「今は攻撃せず、未来ターンに発動するスキル」として成功扱いにする。
  function _isDelayedAttackSkill(skill) {
    if (!skill) return false;
    const t = String(skill.type || '').toLowerCase();

    // スイ系の未来支援は攻撃ではないため、別ルートで処理する。
    if (_isDelayedSupportSkill(skill)) return false;

    const delayedAttackTypes = new Set([
      'delayed_attack',
      'delayed',
      'reserve_attack',
      'reserved_attack',
      'future_attack',
      'forecast_attack',
    ]);
    if (delayedAttackTypes.has(t)) return true;

    // characters_32 変換で通常スキルに delayTurns:0 が入ることがある。
    // 0 / null / undefined は通常攻撃として扱い、予約攻撃にはしない。
    const delayTurns = Number(skill.delayTurns);
    return Number.isFinite(delayTurns) && delayTurns > 0 && !!skill.delayedTrigger;
  }

  // 予約支援系スキル判定。
  // 例：スイ「星読みの予兆」= 次の味方ターン開始時にランダム支援が発動。
  function _isDelayedSupportSkill(skill) {
    if (!skill) return false;
    const t = String(skill.type || '').toLowerCase();
    return t === 'delayed_random_support' ||
      t === 'delayed_choice_support' ||
      t === 'delayed_support' ||
      t === 'reserved_support' ||
      t === 'future_support' ||
      Array.isArray(skill.randomOptions) ||
      Array.isArray(skill.choiceOptions);
  }

  // ============================================================
  // ハヤテ：ヒットアンドアウェイモード
  // ============================================================
  function _isHitAndAwayModeActive32(unit) {
    if (!unit || !_bs) return false;
    const untilTurn = Number(unit.hitAndAwayUntilTurn || 0);
    return untilTurn >= Number(_bs.turn || 0);
  }

  function _activateHitAndAwayMode32(unit, skill) {
    const duration = Math.max(1, Number(skill && skill.modeDuration || 3));
    unit.hitAndAwayUntilTurn = Number(_bs.turn || 1) + duration - 1;
    unit.hitAndAwayMoveBonus = Math.max(0, Number(skill && skill.moveRangeBonus || 2));
    unit.hitAndAwayOrigin = null;
    _log(`${unit.name} はヒットアンドアウェイモードに入った（${duration}ターン）`);
  }

  function _returnHitAndAwayUnit32(unit) {
    if (!unit || !_isHitAndAwayModeActive32(unit)) return false;
    const origin = unit.hitAndAwayOrigin;
    if (!origin || Number(origin.turn) !== Number(_bs.turn)) return false;

    const occupied = getAllUnits().some(other =>
      other && other._uid !== unit._uid && other.hp > 0 &&
      Number(other.row) === Number(origin.row) && Number(other.col) === Number(origin.col)
    );
    if (occupied) {
      _log(`${unit.name}：帰還地点が塞がれているため元の位置へ戻れない`);
      unit.hitAndAwayOrigin = null;
      return false;
    }

    const from = { row: unit.row, col: unit.col };
    unit.row = Number(origin.row);
    unit.col = Number(origin.col);
    unit.hitAndAwayOrigin = null;
    _log(`${unit.name} が閃光とともに元の位置へ帰還した`);

    // ハヤテ共鳴Lv.4：帰還成功時に1ターン1回だけLINKを回復する。
    const refund = Math.max(0, Number(unit.hitAndAwayLinkRefund || 0));
    const perTurn = Math.max(1, Number(unit.hitAndAwayLinkRefundPerTurn || 1));
    const currentTurn = Number(_bs.turn || 0);
    if (refund > 0 && _bs.link) {
      if (Number(unit._hitAndAwayRefundTurn || -1) !== currentTurn) {
        unit._hitAndAwayRefundTurn = currentTurn;
        unit._hitAndAwayRefundCount = 0;
      }
      const used = Math.max(0, Number(unit._hitAndAwayRefundCount || 0));
      if (used < perTurn) {
        const before = Number(_bs.link.current || 0);
        _bs.link.current = Math.min(Number(_bs.link.max || 6), before + refund);
        unit._hitAndAwayRefundCount = used + 1;
        const gained = Number(_bs.link.current || 0) - before;
        if (gained > 0) _log(`${unit.name}：共鳴効果でLINK +${gained}`);
      }
    }

    _emit('move', { ally: { ...unit }, from, hitAndAwayReturn: true, bs: _snapshot() });
    return true;
  }

  // ============================================================
  // スキル実行（味方）
  // ============================================================
  async function executeAllySkill(allyUid, skillId, executionOptions) {
    if (_bs.phase !== 'skill') {
      _log('スキルフェーズではありません');
      console.warn('[Battle32] executeAllySkill failed: phase is not skill', { phase: _bs && _bs.phase, allyUid, skillId });
      return false;
    }

    const ally = _bs.allies.find(u => u._uid === allyUid);
    if (!ally || ally.hp <= 0) {
      _log('スキル使用対象の味方が見つかりません');
      console.warn('[Battle32] executeAllySkill failed: ally not found or dead', { allyUid, skillId, ally });
      return false;
    }

    if (_unitHasStatus32(ally, 'skill_forget')) {
      _log(`${ally.name} はスキルを忘れている`);
      await _centerTextWait(ally.name, 'SKILL FORGOTTEN', B32_WAIT.enemyAction);
      return false;
    }

    const skill = ally.skills.find(s => s.id === skillId);
    if (!skill) {
      _log('スキル情報が見つかりません');
      console.warn('[Battle32] executeAllySkill failed: skill not found', { allyUid, skillId, skills: ally.skills });
      return false;
    }

    // ULTかどうかでLINK判定タイプを切り替え
    const actionType = skill.isUltimate ? 'ult' : 'skill';
    if (!_canUsePlayerAction(actionType, allyUid, skillId)) {
      console.warn('[Battle32] executeAllySkill failed: cannot use player action', {
        allyUid,
        skillId,
        skillName: skill.name,
        actionType,
        link: _bs && _bs.link,
        unitActionHistory: _bs && _bs.unitActionHistory && _bs.unitActionHistory[allyUid],
      });
      return false;
    }

    if ((skill.shinkiCost || 0) > ally.shinki) {
      _log(`${ally.name}: 神気が不足しています`);
      return false;
    }

    _log(`${ally.name} が「${skill.name}」を発動！`);
    _beginBlessingAttackTrack32();

    // ── 対象解決ヘルパー（スコープ内ローカル） ──
    const _enemyTargets = (rangeKey) =>
      _getComboRangeUnits32(ally, rangeKey, _bs.enemies).filter(u => u.hp > 0);
    const _allyTargets = (rangeKey) =>
      (rangeKey === 'self'
        ? [ally]
        : _getComboRangeUnits32(ally, rangeKey, _bs.allies).filter(u => u.hp > 0));

    const stype = skill.type;
    const isDelayedAttack = _isDelayedAttackSkill(skill);
    let noTargets = false;

    // ── repeat_skill：このターン中、直前に成功した味方通常スキルを再発動 ──
if (stype === 'repeat_skill') {
  const last = _bs.lastAllySkillThisTurn;

  if (!last || !last.skill) {
    noTargets = true;
    _log(`${ally.name}：このターン中に再現できる味方スキルがありません`);
  } else {
    const copiedSkill = deepClone(last.skill);

    // 安全対策：物真似・ULT・予約攻撃はコピーしない
    if (
      copiedSkill.type === 'repeat_skill' ||
      copiedSkill.isUltimate ||
      copiedSkill.type === 'delayed_attack'
    ) {
      noTargets = true;
      _log(`${ally.name}：そのスキルは再現できません`);
    } else {
      copiedSkill.id = `repeat_${copiedSkill.id}`;
      copiedSkill.name = `${copiedSkill.name}`;
      copiedSkill.shinkiCost = 0;
      copiedSkill.linkCost = 0;
      copiedSkill.isUltimate = false;

      _log(`${ally.name} は ${last.ownerName} の「${copiedSkill.name}」を再現した！`);

      // ここでは「アイムが使った」扱いにする。
      // 射程・ATK・位置はアイム基準。
      const copiedType = copiedSkill.type;

      if (copiedType === 'attack') {
        const targets = _enemyTargets(copiedSkill.range);
        if (targets.length === 0) {
          noTargets = true;
          _log(`${ally.name}：範囲内に敵がいません`);
        } else {
          let drainTotal = 0;
          const hasDrain = (copiedSkill.effects || []).some(e => e.type === 'drain');

          targets.forEach(enemy => {
            let dmg = calcDamage(getEffectiveAtk(ally), copiedSkill.multiplier, enemy, ally);
            dmg = applyBackstabBonus(dmg, ally, enemy, copiedSkill);

            if (_bs._rl_skillDmgMult && _bs._rl_skillDmgMult !== 1.0) {
              dmg = Math.round(dmg * _bs._rl_skillDmgMult);
            }

            if (enemy.isBoss && _bs._rl_bossDmgMult && _bs._rl_bossDmgMult !== 1.0) {
              dmg = Math.round(dmg * _bs._rl_bossDmgMult);
            }

            const hpBefore = enemy.hp;
            applyDamage(enemy, dmg, ally, copiedSkill);
            if (hasDrain) drainTotal += Math.min(dmg, hpBefore);
            _applyEffects(copiedSkill.effects, enemy, ally);
          });

          if (hasDrain) _applyDrainHealing(copiedSkill, ally, drainTotal);
        }

      } else if (copiedType === 'debuff') {
        const targets = _enemyTargets(copiedSkill.range);
        if (targets.length === 0) {
          noTargets = true;
          _log(`${ally.name}：範囲内に敵がいません`);
        } else {
          targets.forEach(enemy => {
            if ((copiedSkill.multiplier || 0) > 0) {
              let dmg = calcDamage(getEffectiveAtk(ally), copiedSkill.multiplier, enemy, ally);
            dmg = applyBackstabBonus(dmg, ally, enemy, copiedSkill);

              if (_bs._rl_skillDmgMult && _bs._rl_skillDmgMult !== 1.0) {
                dmg = Math.round(dmg * _bs._rl_skillDmgMult);
              }

              if (enemy.isBoss && _bs._rl_bossDmgMult && _bs._rl_bossDmgMult !== 1.0) {
                dmg = Math.round(dmg * _bs._rl_bossDmgMult);
              }

              applyDamage(enemy, dmg, ally, copiedSkill);
            }
            _applyEffects(copiedSkill.effects, enemy, ally);
          });
        }

      } else if (copiedType === 'heal') {
        const healEffect = (copiedSkill.effects || []).find(e => e.type === 'heal') || {};
        const healTarget = healEffect.target || copiedSkill.target || 'ally';
        const healRate = healEffect.rate || healEffect.healRate || copiedSkill.healRate || 0.1;

        const alive = _bs.allies.filter(u => u.hp > 0);
        let targets = [];

        if (healTarget === 'ally_self' || healTarget === 'self' || copiedSkill.range === 'self') {
          targets = [ally].filter(u => u && u.hp > 0);
        } else if (healTarget === 'ally_lowest') {
          const candidates = alive.slice();
          if (candidates.length > 0) {
            candidates.sort((a, b) => {
              const ar = a.hpMax > 0 ? a.hp / a.hpMax : 1;
              const br = b.hpMax > 0 ? b.hp / b.hpMax : 1;
              return ar - br;
            });
            targets = [candidates[0]];
          }
        } else if (healTarget === 'ally_all' || copiedSkill.range === 'ally_all') {
          targets = alive;
        } else {
          targets = _allyTargets(copiedSkill.range);
        }

        if (targets.length === 0) {
          noTargets = true;
          _log(`${ally.name}：回復対象がいません`);
        } else {
          targets.forEach(a => {
            const before = a.hp;
            const recover = Math.max(1, Math.round(a.hpMax * healRate));
            a.hp = Math.min(a.hpMax, a.hp + recover);
            const actualRecover = a.hp - before;

            if (actualRecover > 0) {
              _log(`${a.name} の HP が ${actualRecover} 回復！（残HP: ${a.hp}）`);
              _emit('heal', {
                source: { _uid: ally._uid, name: ally.name, side: ally.side, row: ally.row, col: ally.col },
                target: { _uid: a._uid, name: a.name, side: a.side, row: a.row, col: a.col },
                amount: actualRecover,
                kind: 'heal',
                skillId: copiedSkill.id || null,
                skillName: copiedSkill.name || null,
                isUltimate: false,
                hitStyle: copiedSkill.hitStyle || 'normal',
                bs: _snapshot(),
              });
            } else {
              _log(`${a.name} は既にHP満タンです`);
            }
          });
        }

      } else if (copiedType === 'buff') {
        const mainEffect = (copiedSkill.effects || [])[0];
        const effTarget = mainEffect ? (mainEffect.target || '') : '';
        let targets;

        if (copiedSkill.range === 'self' || effTarget === 'ally_self') {
          targets = [ally];
        } else {
          targets = _allyTargets(copiedSkill.range);
          if (targets.length === 0) targets = [ally];
        }

        targets.forEach(a => {
          _applyEffects(copiedSkill.effects, a, ally);
          _log(`${a.name} にバフを付与（${copiedSkill.name}）`);
        });

      } else {
        noTargets = true;
        _log(`${ally.name}：そのスキルタイプは再現できません`);
      }
    }
  }

// ── summon_object：盤面設置型召喚物 ───────────────────────
} else if (stype === 'summon_object') {
  const ok = _executeSummonObjectSkill(ally, skill);
  if (!ok) noTargets = true;

// ── delayed_random_support / delayed_choice_support：未来支援 ─────
} else if (_isDelayedSupportSkill(skill)) {
  const selectedOption = executionOptions && executionOptions.selectedOption
    ? executionOptions.selectedOption
    : null;
  _queueDelayedSupport(ally, skill, selectedOption);

// ── delayed_attack：未来予約攻撃 ─────────────────────────────
} else if (isDelayedAttack) {
  // 予約攻撃は「今この瞬間に敵へ命中しない」ことが正常なので、
  // 範囲内に敵がいなくても失敗扱いにしない。
  _queueDelayedAttack(ally, skill);

// ── random_cell_attack：盤面ランダムマス攻撃 ────────────────
} else if (stype === 'random_cell_attack') {
  const count = Number(skill.randomCellCount || 7);
  const pickedCells = pickRandomBoardCells(count);
  const pickedKeys = new Set(pickedCells.map(c => c.key));

  _log(`${ally.name} の「${skill.name}」が盤面上の${count}マスを乱撃！`);

  // 演出・ガイド用イベント
  _emit('randomCellAttack', {
    source: {
      _uid: ally._uid,
      name: ally.name,
      side: ally.side,
      row: ally.row,
      col: ally.col,
    },
    skillId: skill.id,
    skillName: skill.name,
    cells: pickedCells.map(c => ({ row: c.row, col: c.col })),
    bs: _snapshot(),
  });

  const targets = _bs.enemies.filter(e =>
    e &&
    e.hp > 0 &&
    pickedKeys.has(`${e.row}-${e.col}`)
  );

  if (targets.length === 0) {
  _log(`${ally.name}：ランダム攻撃は空振りした`);
  } else {
    targets.forEach(enemy => {
      let dmg = calcDamage(getEffectiveAtk(ally), skill.multiplier || 7.0, enemy, ally);
            dmg = applyBackstabBonus(dmg, ally, enemy, skill);

      // ローグライト: スキルダメージ補正
      if (_bs._rl_skillDmgMult && _bs._rl_skillDmgMult !== 1.0) {
        dmg = Math.round(dmg * _bs._rl_skillDmgMult);
      }

      // ローグライト: ボスへのスキルダメージ追加補正
      if (enemy.isBoss && _bs._rl_bossDmgMult && _bs._rl_bossDmgMult !== 1.0) {
        dmg = Math.round(dmg * _bs._rl_bossDmgMult);
      }

      applyDamage(enemy, dmg, ally, skill);
      _applyEffects(skill.effects, enemy, ally);
    });
  }

// ── attack ──────────────────────────────────────────────────
} else if (stype === 'attack') {

      let targets = _enemyTargets(skill.range);
      targets = _filterTargetsByRequiredStatus(targets, skill);
      if (targets.length === 0) {
        noTargets = true;
        const requiredStatus = skill.requiredStatus || skill.targetStatus;
        if (requiredStatus) {
          _log(`${ally.name}：対象状態の敵がいません`);
        } else {
          _log(`${ally.name}：範囲内に敵がいません`);
        }
      } else {
        let drainTotal = 0;
        const { enemyEffects } = _splitSkillEffectsByTarget(skill);
        const hasDrain = (skill.effects || []).some(e => e.type === 'drain');

        targets.forEach(enemy => {
          let dmg = calcDamage(getEffectiveAtk(ally), skill.multiplier, enemy, ally);
            dmg = applyBackstabBonus(dmg, ally, enemy, skill);
          // ─ ローグライト: スキルダメージ補正 ─
          if (_bs._rl_skillDmgMult && _bs._rl_skillDmgMult !== 1.0) {
            const _dmgBefore = dmg;
            dmg = Math.round(dmg * _bs._rl_skillDmgMult);
            console.log('[RL OP] skill_dmg_mult', { before: _dmgBefore, after: dmg, mult: _bs._rl_skillDmgMult });
          }
          // ─ ローグライト: ボスへのスキルダメージ追加補正 ─
          if (enemy.isBoss && _bs._rl_bossDmgMult && _bs._rl_bossDmgMult !== 1.0) {
            dmg = Math.round(dmg * _bs._rl_bossDmgMult);
          }
          const hpBefore = enemy.hp;
          applyDamage(enemy, dmg, ally, skill);
          if (hasDrain) drainTotal += Math.min(dmg, hpBefore); // 実ダメージ分だけ積算
          _applyEffects(enemyEffects, enemy, ally);
        });

        if (hasDrain) _applyDrainHealing(skill, ally, drainTotal);
      }

      // 攻撃対象の有無に関わらず、自己付与効果は1回だけ処理する
      _applySelfEffectsFromSkill(skill, ally);

    // ── debuff（ダメージあり/なし両対応） ──────────────────────
    } else if (stype === 'debuff') {
      const targets = _enemyTargets(skill.range);
      if (targets.length === 0) {
        noTargets = true;
        _log(`${ally.name}：範囲内に敵がいません`);
      } else {
        targets.forEach(enemy => {
          if ((skill.multiplier || 0) > 0) {
            let dmg = calcDamage(getEffectiveAtk(ally), skill.multiplier, enemy, ally);
            dmg = applyBackstabBonus(dmg, ally, enemy, skill);
            // ─ ローグライト: スキルダメージ補正 ─
            if (_bs._rl_skillDmgMult && _bs._rl_skillDmgMult !== 1.0) {
              const _dmgBefore = dmg;
              dmg = Math.round(dmg * _bs._rl_skillDmgMult);
              console.log('[RL OP] skill_dmg_mult(debuff)', { before: _dmgBefore, after: dmg, mult: _bs._rl_skillDmgMult });
            }
            // ─ ローグライト: ボスへのスキルダメージ追加補正 ─
            if (enemy.isBoss && _bs._rl_bossDmgMult && _bs._rl_bossDmgMult !== 1.0) {
              dmg = Math.round(dmg * _bs._rl_bossDmgMult);
            }
            applyDamage(enemy, dmg, ally, skill);
          }
          _applyEffects(skill.effects, enemy, ally);
        });
      }

    // ── heal ────────────────────────────────────────────────────
    // ── heal ────────────────────────────────────────────────────
} else if (stype === 'heal') {
  const healEffect = (skill.effects || []).find(e => e.type === 'heal') || {};
  const healTarget = healEffect.target || skill.target || 'ally';
  const healRate = healEffect.rate || healEffect.healRate || skill.healRate || 0.1;

  const alive = _bs.allies.filter(u => u.hp > 0);
  let targets = [];

  if (healTarget === 'ally_self' || healTarget === 'self' || skill.range === 'self') {
    targets = [ally].filter(u => u && u.hp > 0);

  } else if (healTarget === 'ally_lowest') {
    // HP割合が最も低い味方1人
    const candidates = alive.slice();

    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        const ar = a.hpMax > 0 ? a.hp / a.hpMax : 1;
        const br = b.hpMax > 0 ? b.hp / b.hpMax : 1;
        return ar - br;
      });
      targets = [candidates[0]];
    }

  } else if (healTarget === 'ally_all' || skill.range === 'ally_all') {
    // 味方全員
    targets = alive;

  } else {
    // 通常の範囲回復
    targets = _allyTargets(skill.range);
  }

  if (targets.length === 0) {
    noTargets = true;
    _log(`${ally.name}：回復対象がいません`);
  } else {
    targets.forEach(a => {
      const before = a.hp;
      const recover = Math.max(1, Math.round(a.hpMax * healRate));
      a.hp = Math.min(a.hpMax, a.hp + recover);
      const actualRecover = a.hp - before;

      // HP満タンの場合もログだけ分かるようにする
      if (actualRecover > 0) {
  _log(`${a.name} の HP が ${actualRecover} 回復！（残HP: ${a.hp}）`);

  _emit('heal', {
    source: {
      _uid: ally._uid,
      name: ally.name,
      side: ally.side,
      row: ally.row,
      col: ally.col
    },
    target: {
      _uid: a._uid,
      name: a.name,
      side: a.side,
      row: a.row,
      col: a.col
    },
    amount: actualRecover,
    kind: 'heal',
    skillId:    skill?.id       || null,
    skillName:  skill?.name     || null,
    isUltimate: !!skill?.isUltimate,
    hitStyle:   skill?.hitStyle || 'normal',
    bs: _snapshot(),
  });
} else {
  _log(`${a.name} は既にHP満タンです`);
}

      // healスキルに付随した防御バフなどを同じ対象へ付与する。
      // heal効果そのものは上で処理済みなので二重回復を避ける。
      const supportEffects = (skill.effects || []).filter(e =>
        e && e.type !== 'heal' && (
          e.target === 'ally' ||
          e.target === 'ally_all' ||
          e.target === 'ally_self' ||
          e.target === 'self' ||
          !e.target
        )
      );
      if (supportEffects.length > 0) {
        _applyEffects(supportEffects, a, ally);
      }
    });
  }

    // ── hit_and_away_mode ───────────────────────────────────────
    } else if (stype === 'hit_and_away_mode') {
      _activateHitAndAwayMode32(ally, skill);
      _emit('statusApplied', {
        source: { ...ally },
        target: { ...ally },
        effect: { type: 'hit_and_away_mode', duration: Number(skill.modeDuration || 3) },
        label: 'HIT & AWAY',
        bs: _snapshot(),
      });

    // ── buff ────────────────────────────────────────────────────
    } else if (stype === 'buff') {
      // effects の target フィールドで対象を決定
      const mainEffect = (skill.effects || [])[0];
      const effTarget = mainEffect ? (mainEffect.target || '') : '';
      let targets;
      if (skill.range === 'self' || effTarget === 'ally_self') {
        targets = [ally];
      } else {
        targets = _allyTargets(skill.range);
        if (targets.length === 0) targets = [ally]; // フォールバック：自分だけ
      }
      targets.forEach(a => {
        _applyEffects(skill.effects, a, ally);
        _log(`${a.name} にバフを付与（${skill.name}）`);
      });

    // ── move ────────────────────────────────────────────────────
    } else if (stype === 'move') {
      // 移動スキルはUI側の専用実装待ち
      _log(`${ally.name}：「${skill.name}」は移動スキルです（現バージョンでは未実装）`);

    // ── 未知タイプ ────────────────────────────────────────────
    } else {
      _log(`${ally.name}：未知のスキルタイプ「${stype}」（スキップ）`);
    }

    // リプレイ不成立・設置失敗はスキル消費せず選び直せるようにする
if (noTargets && (skill.type === 'repeat_skill' || skill.type === 'summon_object')) {
  _log('→ スキル選択に戻ります');
  return false;
}

    ally.shinki -= (skill.shinkiCost || 0);

// ハヤテ：モード中に攻撃した場合、攻撃判定完了後に移動前の位置へ帰還する。
// ULTはモード移行のみなので帰還対象外。
if (
  !noTargets &&
  !skill.isUltimate &&
  (skill.type === 'attack' || skill.type === 'debuff')
) {
  _returnHitAndAwayUnit32(ally);
}

// スキル/ULTのダメージで勝敗が確定していたら、ここで終了する
// applyDamage() 内で _checkWinLose() は既に呼ばれている
if (_bs.result) {
  _renderUI();
  return true;
}

// 成功した味方通常スキルを、このターン中のコピー候補として記録
// repeat_skill / ULT / delayed_attack はコピー対象外
if (
  !noTargets &&
  skill.type !== 'repeat_skill' &&
  !_isDelayedAttackSkill(skill) &&
  !_isDelayedSupportSkill(skill) &&
  !skill.isUltimate
) {
  _bs.lastAllySkillThisTurn = {
    ownerUid: ally._uid,
    ownerName: ally.name,
    skill: deepClone(skill),
  };
}

// エリ共鳴Lv.2：通常スキルの攻撃処理後、HP割合が最も低い味方を回復する。
if (
  !noTargets &&
  Number(ally.id) === 1 &&
  skill.id === 's1' &&
  Number(skill.resonanceHealLowestAtkRate || 0) > 0
) {
  const candidates = (_bs.allies || [])
    .filter(unit => unit && unit.hp > 0 && unit.hp < unit.hpMax)
    .sort((a, b) => {
      const ar = a.hpMax > 0 ? a.hp / a.hpMax : 1;
      const br = b.hpMax > 0 ? b.hp / b.hpMax : 1;
      return ar - br;
    });

  const healTarget = candidates[0] || null;
  if (healTarget) {
    const recover = Math.max(
      1,
      Math.round(getEffectiveAtk(ally) * Number(skill.resonanceHealLowestAtkRate))
    );
    const before = healTarget.hp;
    healTarget.hp = Math.min(healTarget.hpMax, healTarget.hp + recover);
    const actual = healTarget.hp - before;

    if (actual > 0) {
      _log(`共鳴：${healTarget.name} のHPが ${actual} 回復`);
      _emit('heal', {
        source: { _uid: ally._uid, name: ally.name, side: ally.side, row: ally.row, col: ally.col },
        target: { _uid: healTarget._uid, name: healTarget.name, side: healTarget.side, row: healTarget.row, col: healTarget.col },
        amount: actual,
        kind: 'resonance_heal',
        skillId: skill.id,
        skillName: skill.name,
        isUltimate: false,
        hitStyle: 'normal',
        bs: _snapshot(),
      });
    }
  }
}

// イグニス共鳴Lv.2：通常スキルの攻撃処理後、自身をATK×0.20回復する。
if (
  !noTargets &&
  skill.id === 's1' &&
  Number(skill.resonanceSelfHealAtkRate || 0) > 0 &&
  ally.hp > 0 &&
  ally.hp < ally.hpMax
) {
  const recover = Math.max(
    1,
    Math.round(getEffectiveAtk(ally) * Number(skill.resonanceSelfHealAtkRate))
  );
  const before = ally.hp;
  ally.hp = Math.min(ally.hpMax, ally.hp + recover);
  const actual = ally.hp - before;

  if (actual > 0) {
    _log(`共鳴：${ally.name} のHPが ${actual} 回復`);
    _emit('heal', {
      source: { _uid: ally._uid, name: ally.name, side: ally.side, row: ally.row, col: ally.col },
      target: { _uid: ally._uid, name: ally.name, side: ally.side, row: ally.row, col: ally.col },
      amount: actual,
      kind: 'resonance_self_heal',
      skillId: skill.id,
      skillName: skill.name,
      isUltimate: false,
      hitStyle: 'normal',
      bs: _snapshot(),
    });
  }
}

// 共鳴Lv.2：位置操作スキル後の対象味方バフ。
if (!noTargets && skill.id === 's1' && (skill.resonanceAffectedAllyAtkUp || skill.resonanceAffectedAllyGuard)) {
  let targets = BR.getUnitsFromRange32(ally, skill.range, _bs.allies).filter(u => u && u.hp > 0 && u._uid !== ally._uid);
  if (!targets.length) targets = (_bs.allies || []).filter(u => u && u.hp > 0 && u._uid !== ally._uid);
  targets.forEach(target => {
    if (skill.resonanceAffectedAllyAtkUp) {
      const b = skill.resonanceAffectedAllyAtkUp;
      _applyEffects([{ type:'atk_up', target:'ally', hit:100, rate:Number(b.rate||1.10), duration:Number(b.duration||1) }], target, ally);
    }
    if (skill.resonanceAffectedAllyGuard) {
      const b = skill.resonanceAffectedAllyGuard;
      _applyEffects([{ type:'guard', target:'ally', hit:100, rate:Number(b.rate||0.10), duration:Number(b.duration||1) }], target, ally);
    }
  });
}

_finishBlessingAttackTrack32();
_emit('allyAction', { ally: { ...ally }, skill, bs: _snapshot() });

// 行動権を消費（LINKも消費される）
_consumePlayerAction(actionType, allyUid, skillId);

// 敵を攻撃したスキル/ULTの全処理完了後に、コンボ連鎖を開始する。
// 演出・ダメージ・追加効果・撃破判定を終えてから、世代キューをawaitする。
const comboTriggerEligible =
  !noTargets &&
  (skill.type === 'attack' || skill.type === 'debuff');

if (
  comboTriggerEligible &&
  !_bs.result &&
  window.Combo32 &&
  typeof window.Combo32.runFromAction === 'function'
) {
  await window.Combo32.runFromAction(allyUid, {
    skillId: skill.id,
    skillName: skill.name,
    isUltimate: !!skill.isUltimate,
  });
}

// 勝敗未確定のときだけ保存
if (!_bs.result) {
  _saveResume();
}

return true;
  }


  // ============================================================
  // コンボスキル実行（LINK・神気・行動回数を消費しない）
  // ============================================================
  function _getComboRangeUnits32(owner, rangeId, units) {
    const isComboRange =
      typeof rangeId === 'string' &&
      rangeId.startsWith('combo_');

    if (
      isComboRange &&
      window.Combo32 &&
      typeof window.Combo32.getRangeCells === 'function'
    ) {
      const keys = new Set(
        window.Combo32.getRangeCells(owner, rangeId)
          .map(cell => `${cell.row}-${cell.col}`)
      );
      return (units || []).filter(unit =>
        unit && keys.has(`${unit.row}-${unit.col}`)
      );
    }

    return BR.getUnitsFromRange32(owner, rangeId, units);
  }

  async function executeComboSkill(allyUid, comboSkill, context) {
    if (!_bs || _bs.result || !comboSkill) {
      return { executed: false, affected: false };
    }

    const ally = (_bs.allies || []).find(unit =>
      unit && unit._uid === allyUid && unit.hp > 0
    );
    if (!ally) {
      return { executed: false, affected: false };
    }

    const enemyTargets = rangeKey =>
      _getComboRangeUnits32(ally, rangeKey, _bs.enemies)
        .filter(unit => unit && unit.hp > 0);

    const allyTargets = rangeKey =>
      rangeKey === 'self'
        ? [ally]
        : _getComboRangeUnits32(ally, rangeKey, _bs.allies)
            .filter(unit => unit && unit.hp > 0);

    const stype = comboSkill.type || 'attack';

    // 実行直前に対象を再計算する。
    // 先行コンボで敵が倒れた場合、対象なしなら演出も省略する。
    let previewTargets = [];
    if (stype === 'attack' || stype === 'debuff') {
      previewTargets = enemyTargets(comboSkill.range);
      if (!previewTargets.length) {
        return { executed: false, affected: false, reason: 'no-target' };
      }
    }

    _lockInput();

    try {
      const generation = Number(context && context.generation || 1);
      const comboDamageRate = Math.max(1, Number(context && context.comboDamageRate || 1));
      const isMaxCombo = !!(context && context.isMaxCombo);
      const comboTitle = isMaxCombo ? 'MAX COMBO!' : `${generation}COMBO!`;
      const comboBonusText = `DAMAGE ×${comboDamageRate.toFixed(1)}`;

      // COMBO専用演出。
      // 通常の中央テキストは単一DOM・単一タイマーを共有しており、
      // 別演出の表示命令で上書きされるとコンボ表示だけ消えるため、専用レイヤーを優先する。
      if (typeof window.showBattle32ComboTextAsync === 'function') {
        await window.showBattle32ComboTextAsync(
          comboTitle,
          `${ally.name}「${comboSkill.name}」 / ${comboBonusText}`,
          620
        );
      } else {
        await _centerTextWait(
          comboTitle,
          `${ally.name}「${comboSkill.name}」 / ${comboBonusText}`,
          620
        );
      }

      _log(`COMBO：${ally.name} が「${comboSkill.name}」を発動！`);
      _beginBlessingAttackTrack32();

      // 既存イベントを先に通知し、UI側のキャラ演出を開始可能にする。
      _emit('comboActionStart', {
        ally: { ...ally },
        skill: deepClone(comboSkill),
        context: context || null,
        bs: _snapshot(),
      });

      _renderUI();
      await wait(180);

      let affected = false;
      let affectedCount = 0;
      let comboHadCritical = false;

      if (stype === 'attack' || stype === 'debuff') {
        // 演出後にもう一度対象を再取得
        const targets = enemyTargets(comboSkill.range);

        let comboDrainTotal = 0;
        const comboHasDrain = (comboSkill.effects || []).some(
          effect => effect && effect.type === 'drain'
        );

        for (const enemy of targets) {
          if (_bs.result) break;

          if (Number(comboSkill.multiplier || 0) > 0) {
            let damage = calcDamage(
              getEffectiveAtk(ally),
              Number(comboSkill.multiplier || 0) * comboDamageRate,
              enemy,
              ally
            );
            damage = applyBackstabBonus(damage, ally, enemy, comboSkill);
            const hpBeforeCombo = Number(enemy.hp || 0);
            const damageResult = applyDamage(enemy, damage, ally, comboSkill);
            if (comboHasDrain) {
              comboDrainTotal += Math.max(0, Math.min(damage, hpBeforeCombo));
            }
            if (damageResult && damageResult.criticalRoll && damageResult.criticalRoll.isCritical) comboHadCritical = true;
          }

          if (
            enemy.hp > 0 &&
            Array.isArray(comboSkill.effects) &&
            comboSkill.effects.length
          ) {
            _applyEffects(comboSkill.effects, enemy, ally);
          }

          affected = true;
          affectedCount += 1;
        }

        if (comboHasDrain && comboDrainTotal > 0) {
          _applyDrainHealing(comboSkill, ally, comboDrainTotal);
        }
      } else if (stype === 'buff' || stype === 'heal') {
        const effectTarget = (comboSkill.effects || [])[0]?.target || '';

        let targets = effectTarget === 'ally_all'
          ? (_bs.allies || []).filter(unit => unit && unit.hp > 0)
          : allyTargets(comboSkill.range || 'self');

        if (!targets.length) targets = [ally];

        for (const target of targets) {
          if (stype === 'heal') {
            // effects に heal が定義されている場合は _applyEffects() 側だけで回復する。
            // これにより、アンジェの「最大HP×8%回復」が二重適用されるのを防ぐ。
            const hasExplicitHealEffect = (comboSkill.effects || []).some(
              effect => effect && effect.type === 'heal'
            );

            if (!hasExplicitHealEffect) {
              const amount = Math.max(
                1,
                Math.round(
                  getEffectiveAtk(ally) *
                  Number(comboSkill.healRate || comboSkill.multiplier || 0.25)
                )
              );
              target.hp = Math.min(target.hpMax, target.hp + amount);
            }
          }

          _applyEffects(comboSkill.effects || [], target, ally);
          affected = true;
          affectedCount += 1;
        }
      }

      // MAX COMBO報酬：同一コンボ連鎖につき1回だけLINK+2。
      if (
        affected &&
        isMaxCombo &&
        _bs.link &&
        _maxComboRewardActionId !== Number(context && context.actionId)
      ) {
        const actionId = Number(context && context.actionId);
        const linkPlus = Math.max(0, Number(context && context.maxComboLinkPlus || 2));
        const before = Number(_bs.link.current || 0);
        _bs.link.current = Math.min(Number(_bs.link.max || 6), before + linkPlus);
        _maxComboRewardActionId = actionId;
        const gained = _bs.link.current - before;
        _log(`MAX COMBO：ダメージ×${comboDamageRate.toFixed(1)} / LINK +${gained}`);
        _emit('maxComboBonus', {
          comboIndex: generation,
          damageRate: comboDamageRate,
          linkPlus: gained,
          bs: _snapshot(),
        });
        _renderUI();
      }

      // エリ共鳴Lv.4：コンボ発動後、味方全体のATKを1ターン10%上昇。
      if (
        Number(ally.id) === 1 &&
        comboSkill.resonanceTeamAtkUp &&
        affected
      ) {
        const buff = comboSkill.resonanceTeamAtkUp;
        (_bs.allies || [])
          .filter(unit => unit && unit.hp > 0)
          .forEach(unit => {
            _applyEffects([{
              type: 'atk_up',
              target: 'ally_all',
              hit: 100,
              rate: Number(buff.rate || 1.10),
              duration: Number(buff.duration || 1)
            }], unit, ally);
          });
        _log('共鳴：味方全体のATKが10%上昇');
      }

      // 全キャラ共通の共鳴Lv.4コンボ追加効果。
      if (affected) {
        if (Number(comboSkill.resonanceLinkPlus || 0) > 0 && _bs.link) {
          const before = Number(_bs.link.current || 0);
          _bs.link.current = Math.min(Number(_bs.link.max || 6), before + Number(comboSkill.resonanceLinkPlus));
          _log(`共鳴：LINK +${_bs.link.current - before}`);
        }
        if (comboSkill.resonanceSelfAtkUp) {
          const b = comboSkill.resonanceSelfAtkUp;
          _applyEffects([{ type:'atk_up', target:'ally_self', hit:100, rate:Number(b.rate||1.10), duration:Number(b.duration||1) }], ally, ally);
        }
        if (comboHadCritical && comboSkill.resonanceSelfAtkUpOnCritical) {
          const b = comboSkill.resonanceSelfAtkUpOnCritical;
          _applyEffects([{ type:'atk_up', target:'ally_self', hit:100, rate:Number(b.rate||1.15), duration:Number(b.duration||1) }], ally, ally);
          _log('共鳴：コンボcriticalにより自身のATKが上昇');
        }
        if (Number(comboSkill.resonanceNextS1Discount || 0) > 0) {
          ally._resonanceNextS1Discount = Number(comboSkill.resonanceNextS1Discount);
          _log('共鳴：次の通常スキルLINKコストを軽減');
        }
        if (Number(comboSkill.resonanceDelayedUltBoost || 0) > 1 && Array.isArray(_bs.delayedActions)) {
          const pending = _bs.delayedActions.filter(a => a && a.ownerUid === ally._uid && a.isUltimate);
          pending.forEach(a => { a.multiplier = Number(a.multiplier || 1) * Number(comboSkill.resonanceDelayedUltBoost); });
          if (pending.length) _log('共鳴：予約中ULTの威力が10%上昇');
        }
        const healLowest = (rate, sourceHpBased) => {
          const candidates = (_bs.allies || []).filter(u => u && u.hp > 0 && u.hp < u.hpMax)
            .sort((a,b) => (a.hp/a.hpMax) - (b.hp/b.hpMax));
          const target = candidates[0];
          if (!target) return;
          const baseHp = sourceHpBased ? ally.hpMax : target.hpMax;
          const amount = Math.max(1, Math.round(baseHp * Number(rate || 0)));
          target.hp = Math.min(target.hpMax, target.hp + amount);
          _log(`共鳴：${target.name} のHPが ${amount} 回復`);
        };
        if (Number(comboSkill.resonanceHealLowestSourceHpRate || 0) > 0) healLowest(comboSkill.resonanceHealLowestSourceHpRate, true);
        if (Number(comboSkill.resonanceHealLowestTargetHpRate || 0) > 0) healLowest(comboSkill.resonanceHealLowestTargetHpRate, false);
        if (comboSkill.resonanceLowestAllyAtkUp) {
          const candidates = (_bs.allies || []).filter(u => u && u.hp > 0)
            .sort((a,b) => (a.hp/a.hpMax) - (b.hp/b.hpMax));
          const target = candidates[0];
          if (target) {
            const b = comboSkill.resonanceLowestAllyAtkUp;
            _applyEffects([{ type:'atk_up', target:'ally', hit:100, rate:Number(b.rate||1.05), duration:Number(b.duration||1) }], target, ally);
          }
        }
      }

      _checkWinLose();
      _renderUI();

      _emit('comboAction', {
        ally: { ...ally },
        skill: deepClone(comboSkill),
        context: context || null,
        affected,
        affectedCount,
        bs: _snapshot(),
      });

      // damageイベントから開始される攻撃アップ演出を、このコンボ処理の一部として待つ。
      // 待機をCombo32側だけに任せると、45msの集約タイマーと次コンボ開始が競合し、
      // ダメージだけ入り攻撃演出が落ちる場合がある。
      if (affected && typeof window.waitForBattle32AttackCinematicIdle === 'function') {
        await window.waitForBattle32AttackCinematicIdle();
      } else {
        // UIヘルパーがない環境でも、ダメージ表示の最低時間は確保する。
        await wait(700);
      }

      return {
        executed: true,
        affected,
        affectedCount,
        allyUid,
      };
    } finally {
      _finishBlessingAttackTrack32();
      _unlockInput();
    }
  }

  // ============================================================
  // 強制移動ヘルパー群（pull / push / shift）
  // ============================================================

  function _isInsideBoard(row, col) {
    return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;
  }

  function _isAllyCoreCell(row, col) {
    // コア概念廃止：コアセルは存在しない
    return false;
  }

  function _getAliveUnitAt(row, col, ignoreUid) {
    return getAllUnits().find(u =>
      u._uid !== ignoreUid &&
      u.row === row &&
      u.col === col &&
      (u.hp > 0 || u.isBoss)
    ) || null;
  }

  function _canForcedMoveTo(unit, row, col) {
    if (!_isInsideBoard(row, col)) return false;
    if (_isAllyCoreCell(row, col)) return false;
    if (_getAliveUnitAt(row, col, unit._uid)) return false;
    return true;
  }

  function _sign(n) {
    return n === 0 ? 0 : n > 0 ? 1 : -1;
  }

  function _getEffectStep(effectType) {
    const m = String(effectType || '').match(/_(\d+)$/);
    return m ? Math.max(0, Number(m[1])) : 0;
  }

  function _getForcedMoveVector(effectType, source, target) {
    const rowToSource = _sign(source.row - target.row);
    const colToSource = _sign(source.col - target.col);

    if (effectType.startsWith('pull_')) {
      return { dr: rowToSource, dc: colToSource };
    }
    if (effectType.startsWith('push_')) {
      return { dr: -rowToSource, dc: -colToSource };
    }
    if (effectType.startsWith('shift_right_')) {
      return { dr: 0, dc: 1 };
    }
    if (effectType.startsWith('shift_left_')) {
      return { dr: 0, dc: -1 };
    }
    return { dr: 0, dc: 0 };
  }

  function _applyForcedEnemyMove(effect, target, source) {
    if (!_bs || !effect || !target || !source) return 0;
    if (target.side !== 'enemy') return 0;
    if (target.isBoss) {
      _log(`${target.name} は強制移動を受けない`);
      return 0;
    }
    if (target.hp <= 0) return 0;

    const effectType = effect.type;
    const steps = _getEffectStep(effectType);
    if (steps <= 0) return 0;

    const vec = _getForcedMoveVector(effectType, source, target);
    if (!vec.dr && !vec.dc) return 0;

    const from = { row: target.row, col: target.col };
    let moved = 0;

    for (let i = 0; i < steps; i++) {
      const nr = target.row + vec.dr;
      const nc = target.col + vec.dc;
      if (!_canForcedMoveTo(target, nr, nc)) break;
      target.row = nr;
      target.col = nc;
      moved++;
    }

    const to = { row: target.row, col: target.col };

    if (moved > 0) {
      _log(`${target.name} を ${moved}マス移動させた`);
      _emit('forcedMove', {
        source: { _uid: source._uid, name: source.name, side: source.side, row: source.row, col: source.col },
        target: { _uid: target._uid, name: target.name, side: target.side, row: target.row, col: target.col },
        from,
        to,
        effectType,
        moved,
        bs: _snapshot(),
      });
    } else {
      _log(`${target.name} は移動できなかった`);
    }

    return moved;
  }

  // ============================================================
  // drain 回復ヘルパー
  // ============================================================
  function _applyDrainHealing(skill, ally, totalDamage) {
    const drainEff = (skill.effects || []).find(e => e.type === 'drain');
    if (!drainEff || totalDamage <= 0) return;

    const rate = drainEff.rate != null ? drainEff.rate : 0.5;
    const healAmount = Math.max(1, Math.round(totalDamage * rate));
    const tgt = drainEff.target || 'ally_all';

    let healTargets = [];
    if (tgt === 'ally_self' || tgt === 'self') {
      healTargets = [ally].filter(u => u && u.hp > 0);
    } else {
      healTargets = (_bs.allies || []).filter(u => u.hp > 0);
    }

    healTargets.forEach(a => {
      const before = a.hp;
      a.hp = Math.min(a.hpMax, a.hp + healAmount);
      const actual = a.hp - before;
      if (actual <= 0) return;
      _log(`${a.name} はドレインで ${actual} HP 回復！（残HP: ${a.hp}）`);
      _emit('heal', {
        source: { _uid: ally._uid, name: ally.name, side: ally.side, row: ally.row, col: ally.col },
        target: { _uid: a._uid,    name: a.name,    side: a.side,    row: a.row,    col: a.col    },
        amount: actual,
        kind:   'drain',
        skillId:    skill.id   || null,
        skillName:  skill.name || null,
        isUltimate: !!skill.isUltimate,
        hitStyle:   skill.hitStyle || 'normal',
        bs: _snapshot(),
      });
    });

    _log(`${ally.name}「${skill.name}」ドレイン：与えた ${totalDamage} ダメージの ${Math.round(rate * 100)}% → ${healAmount} HP 回復`);
  }

  // ============================================================
  // エフェクト付与ヘルパー（命中判定つき）
  // ============================================================
  // source は任意（省略可）
  function _applyEffects(effects, target, source) {
    if (!effects || effects.length === 0) return;
    const FORCED_MOVE_TYPES = new Set([
  'pull_1', 'pull_2',
  'push_1', 'push_2', 'push_3',
  'shift_right_1', 'shift_right_2',
  'shift_left_1',  'shift_left_2',
]);
    effects.forEach(eff => {
      // ── 強制移動エフェクト ────────────────────────────────────
      if (FORCED_MOVE_TYPES.has(eff.type)) {
        if (eff.target === 'enemy' && target.side === 'enemy') {
          // hp <= 0 の敵は移動しない（ダメージで倒れた直後も除外）
          if (target.hp <= 0 && !target.isBoss) return;
          const hitRate = eff.hit == null ? 100 : Number(eff.hit);
          if (Math.random() * 100 <= hitRate) {
            _applyForcedEnemyMove(eff, target, source);
          } else {
            _log(`${target.name} への強制移動は失敗`);
          }
        }
        return;
      }

      // ── heal エフェクト：statusEffects ではなく HP 回復として処理 ──
      if (eff.type === 'heal') {
        const rate = eff.rate || eff.healRate || 0.1;
        const recover = Math.max(1, Math.round((target.hpMax || target.hp) * rate));
        target.hp = Math.min(target.hpMax || target.hp, target.hp + recover);
        _log(`${target.name} の HP が ${recover} 回復！（残HP: ${target.hp}）`);
        _emit('heal', {
          source: source ? { _uid: source._uid, name: source.name, side: source.side, row: source.row, col: source.col } : null,
          target: { _uid: target._uid, name: target.name, side: target.side, row: target.row, col: target.col },
          amount: recover,
          kind:   'heal',
          skillId:    null,
          skillName:  null,
          isUltimate: false,
          hitStyle:   'normal',
          bs:     _snapshot(),
        });
        return;
      }

      // ── drain エフェクト：attack ループ側で totalDrain として処理するためここはスキップ ──
      if (eff.type === 'drain') {
        return;
      }

      // ── stun エフェクト：即時 stunned = true を立てる ──────
      if (eff.type === 'stun') {
        const hitRate = eff.hit != null ? eff.hit : 100;
        if (Math.random() * 100 > hitRate) {
          _log(`${target.name} にスタン — 外れ`);
          return;
        }
        target.stunned = true;
        if (!Array.isArray(target.statusEffects)) target.statusEffects = [];
        const applied = { type: 'stun', duration: eff.duration || 1 };
        target.statusEffects.push(applied);
        _log(`${target.name} はスタンした`);
        _emitStatusChange32(target, applied, source, 'effect');
        return;
      }

      // ── poison エフェクト：敵ターン開始時に継続ダメージ ──────
      // rate は sourceAtk に対する倍率。例 rate:0.25 なら使用者ATKの25%/ターン。
      if (eff.type === 'poison') {
        const hitRate = eff.hit != null ? eff.hit : 100;
        if (Math.random() * 100 > hitRate) {
          _log(`${target.name} に毒 — 外れ`);
          return;
        }
        if (!Array.isArray(target.statusEffects)) target.statusEffects = [];
        const applied = {
          type: 'poison',
          duration: eff.duration || 2,
          rate: eff.rate != null ? Number(eff.rate) : 0.25,
          sourceAtk: source ? getEffectiveAtk(source) : 1,
          sourceName: source ? source.name : '毒',
          sourceUid: source ? source._uid : null,
          sourceElement: source ? source.element : null,
        };
        target.statusEffects.push(applied);
        _log(`${target.name} は毒に侵された（${eff.duration || 2}T）`);
        _emitStatusChange32(target, applied, source, 'effect');
        return;
      }

      // ── 酔ノ想葬：敵攻撃を回避して反撃する自己状態 ──────
      if (eff.type === 'yoi_no_sousou') {
        const hitRate = eff.hit != null ? eff.hit : 100;
        if (Math.random() * 100 > hitRate) {
          _log(`${target.name} に 酔ノ想葬 — 外れ`);
          return;
        }
        if (!Array.isArray(target.statusEffects)) target.statusEffects = [];

        // 重複した場合はターン数を延長/更新。複数スタックにはしない。
        const existing = target.statusEffects.find(e => e && e.type === 'yoi_no_sousou');
        let applied;
        if (existing) {
          existing.duration = Math.max(existing.duration || 0, eff.duration || 2);
          existing.counterMultiplier = eff.counterMultiplier != null ? Number(eff.counterMultiplier) : 1.0;
          applied = existing;
        } else {
          applied = {
            type: 'yoi_no_sousou',
            duration: eff.duration || 2,
            counterMultiplier: eff.counterMultiplier != null ? Number(eff.counterMultiplier) : 1.0,
          };
          target.statusEffects.push(applied);
        }
        _log(`${target.name} は「酔ノ想葬」に入った（${eff.duration || 2}T）`);
        _emitStatusChange32(target, applied, source, 'effect');
        return;
      }

      const hitRate = eff.hit != null ? eff.hit : 100;
      if (Math.random() * 100 > hitRate) {
        _log(`${target.name} に ${eff.type} — 外れ`);
        return;
      }
      if (!Array.isArray(target.statusEffects)) target.statusEffects = [];
      const applied = {
        type:     eff.type,
        duration: eff.duration || 1,
        rate:     eff.rate,
      };
      target.statusEffects.push(applied);
      _log(`${target.name} に ${eff.type} を付与（${eff.duration || 1}T）`);
      _emitStatusChange32(target, applied, source, 'effect');
    });
  }

      // ============================================================
      // フェーズ進行
      // ============================================================

      // ============================================================
      // 行動権管理ヘルパー
      // ============================================================
      const UNIT_ACTION_MAX_PER_TURN = 2;

      function _getUnitActionHistory(unitUid) {
        if (!_bs.unitActionHistory) _bs.unitActionHistory = {};
        if (!_bs.unitActionHistory[unitUid]) _bs.unitActionHistory[unitUid] = {};
        return _bs.unitActionHistory[unitUid];
      }

      function _getUnitActionCount(unitHistory) {
        const explicit = Number(unitHistory && unitHistory.actionCount);
        if (Number.isFinite(explicit) && explicit > 0) return explicit;

        // 後方互換：古い保存データに actionCount がない場合だけ、既存フラグから復元する。
        let count = 0;
        if (unitHistory && unitHistory.move) count += 1;
        if (unitHistory && (unitHistory.skill || unitHistory.ult || unitHistory.skillOrUlt)) count += 1;
        if (unitHistory && unitHistory.unitActionDone && count === 0) count = UNIT_ACTION_MAX_PER_TURN;
        return count;
      }

      function _canUsePlayerAction(type, unitUid, skillId) {
        if (!_bs || _bs.phase !== 'skill') return false;
        if (_bs.result) return false;

        // 駒アクション（move/skill/ult）はユニット単位で1ターン最大2回。
        // ただし移動は1回まで、スキル/ULTはいずれか1回まで。
        if (type === 'move' || type === 'skill' || type === 'ult') {
          const unitHistory = (_bs.unitActionHistory || {})[unitUid] || {};
          const count = _getUnitActionCount(unitHistory);

          if (count >= UNIT_ACTION_MAX_PER_TURN || unitHistory.unitActionDone) {
            _log('このキャラはこのターンの行動上限に達しています');
            return false;
          }

          if (type === 'move' && unitHistory.move) {
            _log('このキャラはこのターンすでに移動しています');
            return false;
          }

          if ((type === 'skill' || type === 'ult') && (unitHistory.skill || unitHistory.ult || unitHistory.skillOrUlt)) {
            _log('このキャラはこのターンすでにスキルを使用しています');
            return false;
          }
        }

        // LINK消費チェック
        const cost = _getLinkCostForAction(type, unitUid, skillId);
        if (!_canSpendLink(cost)) {
          const current = _bs.link ? Number(_bs.link.current || 0) : 0;
          _log(`LINKが不足しています（必要: ${cost} / 残: ${current}）`);
          return false;
        }

        return true;
      }

      function _getLinkCostForAction(type, unitUid, skillId) {
        if (type === 'move') return LINK_COST.move;

        if (type === 'skill' || type === 'ult') {
          const ally = (_bs && _bs.allies || []).find(u => u._uid === unitUid);
          const skill = ally && (ally.skills || []).find(s => s.id === skillId);
          if (skill && skill.linkCost != null) {
            const n = Number(skill.linkCost);
            let cost = Number.isFinite(n) ? Math.max(0, n) : (type === 'ult' ? LINK_COST.ult : LINK_COST.skill);
            if (type === 'skill' && skill.id === 's1' && Number(ally && ally._resonanceNextS1Discount || 0) > 0) {
              cost = Math.max(1, cost - Number(ally._resonanceNextS1Discount));
            }
            return cost;
          }
          return type === 'ult' ? LINK_COST.ult : LINK_COST.skill;
        }

        if (type === 'summon') {
          if (!_bs.roster || !unitUid) return 1;
          const r = _bs.roster.find(r => r.rosterId === unitUid);
          return r ? (LINK_COST.summon[r.rarity] || 1) : 1;
        }
        return 0;
      }

      function _consumePlayerAction(type, unitUid, skillId) {
        if (!_bs || _bs.phase !== 'skill') return false;

        // LINK消費
        const linkCost = _getLinkCostForAction(type, unitUid, skillId);
        _spendLink(linkCost, null);
        const actedUnit = (_bs.allies || []).find(u => u && u._uid === unitUid);
        if (type === 'skill' && actedUnit && skillId === 's1' && Number(actedUnit._resonanceNextS1Discount || 0) > 0) {
          actedUnit._resonanceNextS1Discount = 0;
        }

        const unitHistory = _getUnitActionHistory(unitUid);

        // 駒アクション（move/skill/ult）はユニット単位で最大2回。
        // 移動1回 + スキル/ULT1回までを記録する。
        if (type === 'move' || type === 'skill' || type === 'ult') {
          const beforeCount = _getUnitActionCount(unitHistory);
          unitHistory.actionCount = Math.min(UNIT_ACTION_MAX_PER_TURN, beforeCount + 1);

          if (type === 'move') unitHistory.move = true;
          if (type === 'skill' || type === 'ult') unitHistory.skillOrUlt = true;

          unitHistory.unitActionDone = unitHistory.actionCount >= UNIT_ACTION_MAX_PER_TURN;
        }
        unitHistory[type] = true;

        _bs.actionCount       = (_bs.actionCount || 0) + 1;
        _bs.lastActionType    = type || null;
        _bs.lastActionUnitUid = unitUid || null;

        // 後方互換フラグ更新
        if (type === 'move') {
          _bs.moveUsedThisTurn = true;
          _bs.movedUnitUid     = unitUid || null;
        }
        if (type === 'skill' || type === 'ult') {
          _bs.skillUsedThisTurn = true;
          _bs.skillUnitUid      = unitUid || null;
          const ally = _bs.allies.find(u => u._uid === unitUid);
          if (ally) ally.skillUsedThisTurn = true;
        }

        _emit('playerActionConsumed', {
          type,
          unitUid,
          actionCount: _bs.actionCount,
          actionMax:   _bs.actionMax,
          link: { ..._bs.link },
          unitActionHistory: JSON.parse(JSON.stringify(_bs.unitActionHistory || {})),
          bs: _snapshot(),
        });

        _checkWinLose();
        if (_bs.result) return true;

        _renderUI();
        return true;
      }

      // スキルフェーズ終了 → 敵フェーズ
      function endSkillPhase() {
  if (!_bs || _bs.phase !== 'skill') return;

  // スマホの二重タップ・二重イベント対策
  if (_enemyTurnFlowRunning) return;

      // 勝敗条件を確認
      _checkWinLose();
      if (_bs.result) return;

      _bs.phase = 'enemy';
      _log('─── 敵フェーズ ───');
      _emit('phaseChange', { phase: 'enemy', bs: _snapshot() });
      _runEnemyTurnFlow();   // async フローで進行
    }

    // ALLY TURN END → ENEMY TURN → 敵行動 の完全 async フロー
    async function _runEnemyTurnFlow() {
  if (!_bs || _bs.result) return;

  // 二重起動防止
  if (_enemyTurnFlowRunning) return;

  const token = _battleFlowToken;
  _enemyTurnFlowRunning = true;

  try {
    _lockInput();
    _renderUI();

    await _centerTextWait('ALLY TURN END', '行動終了', B32_WAIT.turnEnd);

    if (!_bs || _bs.result || _bs.phase !== 'enemy' || token !== _battleFlowToken) {
      _renderUI();
      return;
    }

    await _centerTextWait('ENEMY TURN', '怪異の干渉を検知', B32_WAIT.enemyTurn);

    if (!_bs || _bs.result || _bs.phase !== 'enemy' || token !== _battleFlowToken) {
      _renderUI();
      return;
    }

    await _runEnemyPhase();

  } finally {
    if (token === _battleFlowToken) {
      _enemyTurnFlowRunning = false;
    }
  }
}
    function manhattan(a, b) {
      return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
    }

    function _isEnemyProjectileBlocker(unit, range) {
      if (!unit || unit.hp <= 0) return false;
      if (unit.side !== 'summon') return false;
      if (range === 'enemy_attack_front') {
        return !!(unit.blocksEnemyProjectiles || unit.blocksEnemyFrontAttack);
      }
      return !!unit.blocksEnemyProjectiles;
    }

    function _getFirstEnemyLineTarget(enemy, includeFrontOnly) {
      if (!enemy) return null;
      const candidates = [
        ...(_bs.summons || []).filter(u => _isEnemyProjectileBlocker(u, includeFrontOnly ? 'enemy_attack_front' : 'enemy_attack_line')),
        ...(_bs.allies || []).filter(u => u && u.hp > 0),
      ].filter(u => Number(u.col) === Number(enemy.col) && Number(u.row) > Number(enemy.row));

      if (!candidates.length) return null;

      candidates.sort((a, b) => Number(a.row) - Number(b.row));
      const first = candidates[0];

      if (includeFrontOnly) {
        return Number(first.row) === Number(enemy.row) + 1 ? first : null;
      }

      return first;
    }

    function getEnemyAttackTargets(enemy) {
      const range = enemy.attackRange || 'enemy_attack_front';

      // ロゼの茨薔薇などの設置物は、敵の正面/直線攻撃を遮る。
      // 直線系は最初に当たった味方または遮蔽物だけを返し、後ろへ貫通させない。
      if (range === 'enemy_attack_line') {
        const first = _getFirstEnemyLineTarget(enemy, false);
        return first ? [first] : [];
      }
      if (range === 'enemy_attack_front') {
        const first = _getFirstEnemyLineTarget(enemy, true);
        return first ? [first] : [];
      }

      // 生存している味方のみ対象
      const allies = _bs.allies.filter(a => a.hp > 0);

      // enemy_attack_* / adjacent は BattleRange32 のレンジ定義で判定
      if (range.startsWith('enemy_attack_') || range === 'adjacent') {
        return BR.getUnitsFromRange32(enemy, range, allies);
      }

      // 後方互換：manhattan_N
      const m = /^manhattan_(\d+)$/.exec(range);
      if (m) {
        const dist = Number(m[1]);
        return allies.filter(a => manhattan(enemy, a) <= dist);
      }

      // その他はそのまま BattleRange32 に委譲
      return BR.getUnitsFromRange32(enemy, range, allies);
    }

    // 敵攻撃の実行導線（命中の有無に関係なく全通過マスを表示）
    function _getEnemyAttackTraceCells(enemy, explicitRange) {
      const cells = new Set();
      if (!enemy) return cells;
      const range = explicitRange || enemy.attackRange || 'enemy_attack_front';
      const add = (row, col) => { if (BR.isValidCell(row, col)) cells.add(`${row}-${col}`); };
      if (range === 'enemy_attack_line') {
        for (let row = Number(enemy.row) + 1; row < BOARD_ROWS; row++) add(row, Number(enemy.col));
        return cells;
      }
      if (range === 'enemy_attack_front') {
        add(Number(enemy.row) + 1, Number(enemy.col));
        return cells;
      }
      if (window.BattleRange32 && typeof window.BattleRange32.getCellsFromRange32 === 'function') {
        const resolved = window.BattleRange32.getCellsFromRange32(enemy, range);
        if (resolved && typeof resolved.forEach === 'function') resolved.forEach(key => cells.add(String(key)));
      }
      return cells;
    }

    function _setEnemyAttackTraceCells(cells, enemy, label) {
      const targetKeys = new Set((_bs.allies || []).filter(u => u && u.hp > 0).map(u => `${u.row}-${u.col}`));
      _bs.activeEnemyAttackTraceCells = Array.from(cells || []).map(key => {
        const [row, col] = String(key).split('-').map(Number);
        return { row, col, hit: targetKeys.has(`${row}-${col}`), enemyUid: enemy && enemy._uid || null, label: label || 'ATTACK' };
      });
      _renderUI();
    }

    function _clearEnemyAttackTraceCells() {
      if (!_bs) return;
      _bs.activeEnemyAttackTraceCells = [];
      _renderUI();
    }


    // ============================================================
    // 敵の「強攻撃」共通定義
    // ------------------------------------------------------------
    // 1) 敵/行動データに strongAttack:true がある
    // 2) power が「大」「危険」「強」
    // 3) 必殺技・ULT
    // 4) ATK倍率1.5以上 / 最大HP割合45%以上 / 固定150以上
    // 5) 3ライン以上、または10マス以上を攻撃する広範囲技
    // のいずれかを満たす攻撃を強攻撃として扱う。
    // strongAttack:false を明示すると自動判定を無効化できる。
    // ============================================================
    function _isStrongEnemyAttack(meta) {
      const m = meta || {};
      if (m.strongAttack === false) return false;
      if (m.strongAttack === true) return true;
      if (m.isUltimate || m.ultimate) return true;

      const power = String(m.power || m.attackPower || '').trim();
      if (['大', '危険', '強', '強攻撃', 'HEAVY', 'DANGER'].includes(power.toUpperCase ? power.toUpperCase() : power)) return true;
      if (['大', '危険', '強', '強攻撃'].includes(power)) return true;

      const multiplier = Number(m.multiplier || 0);
      const damageRate = Number(m.damageRate || 0);
      const fixedDamage = Number(m.fixedDamage || 0);
      const cellCount = Number(m.cellCount || 0);
      const lineCount = Number(m.lineCount || 0);

      if (multiplier >= 1.5) return true;
      if (damageRate >= 0.45) return true;
      if (fixedDamage >= 150) return true;
      if (lineCount >= 3) return true;
      if (cellCount >= 10) return true;
      return false;
    }

    function _playEnemyStrongAttackShake(meta) {
      if (!_isStrongEnemyAttack(meta)) return false;
      if (typeof window.playBattle32EnemyStrongShake !== 'function') return false;
      const isUltimate = !!(meta && (meta.isUltimate || meta.ultimate));
      return window.playBattle32EnemyStrongShake(isUltimate ? 'ultimate' : 'strong');
    }

    function _isEriPriorityEnemy(enemy) {
      return !!(enemy && (enemy.isBoss || enemy.eriPriority || enemy.targetPriority === 'eri' || enemy.aiTarget === 'eri'));
    }

    function _pickClosestUnit(from, units) {
      const list = (units || []).filter(u => u && u.hp > 0);
      if (list.length === 0) return null;
      return list.slice().sort((a, b) => {
        const da = manhattan(from, a);
        const db = manhattan(from, b);
        if (da !== db) return da - db;
        return Math.random() < 0.5 ? -1 : 1;
      })[0];
    }

    function _pickEnemyAttackTarget(enemy, targets) {
      const list = (targets || []).filter(t => t && t.hp > 0);
      if (list.length === 0) return null;

      if (_isEriPriorityEnemy(enemy)) {
        const eri = getEriUnit();
        const eriInRange = eri && eri.hp > 0 && list.some(t => t._uid === eri._uid);
        if (eriInRange) return eri;
      }

      return _pickClosestUnit(enemy, list);
    }

    function _getEnemyMoveTarget(enemy) {
      const allies = aliveAllies();
      if (allies.length === 0) return null;

      if (_isEriPriorityEnemy(enemy)) {
        const eri = getEriUnit();
        if (eri && eri.hp > 0) return eri;
      }

      return _pickClosestUnit(enemy, allies);
    }

function canEnemyAttackAllyCore(enemy) {
  // コア概念廃止：敵はコアを攻撃しない
  return false;
}

function damageAllyCore(sourceEnemy) {
  // コア概念廃止：互換用no-op
  return false;
}

function getBossLineAttackCells(boss) {
  const cells = new Set();

  // ボスから自陣方向へ一直線
  // 現状ボスは row:0 col:2 なので、中央列を下方向へ撃つ
  for (let r = boss.row + 1; r < BOARD_ROWS; r++) {
    cells.add(`${r}-${boss.col}`);
  }

  return cells;
}

function doBossLineAttack(boss) {
  if (!boss || boss.hp <= 0) return false;

  const cells = getBossLineAttackCells(boss);

  _log(`${boss.name} が直線上に空間断裂攻撃！`);

  _emit('bossWarning', {
    type: 'boss_line_attack',
    cells: Array.from(cells),
    bs: _snapshot(),
  });

  // 味方への強攻撃。
  // 敵の直線攻撃と同様、遮蔽物が先にある場合はそこで止まり、後ろへ貫通しない。
  const candidates = [
    ...(_bs.summons || []).filter(u => _isEnemyProjectileBlocker(u, 'enemy_attack_line')),
    ...(_bs.allies || []).filter(u => u && u.hp > 0),
  ].filter(u => cells.has(`${u.row}-${u.col}`));

  candidates.sort((a, b) => Number(a.row) - Number(b.row));
  const target = candidates[0] || null;

  if (target) {
    const dmg = Math.floor(boss.atk * BOSS_LINE_ATTACK_RATE);
    applyDamage(
      target,
      dmg,
      boss,
      {
        id: 'boss_line_attack',
        name: '空間断裂',
        isUltimate: true,
        hitStyle: 'heavy',
      }
    );
  }

  return true;
}

  // ============================================================
  // ボス位置入れ替え攻撃
  // ============================================================
  function swapUnitPositions(a, b) {
    if (!a || !b) return false;
    const ar = a.row;
    const ac = a.col;
    a.row = b.row;
    a.col = b.col;
    b.row = ar;
    b.col = ac;
    return true;
  }

  function pickTwoRandomUnits(units) {
    const list = (units || []).filter(u => u && u.hp > 0);
    if (list.length < 2) return null;
    const shuffled = shuffle(list);
    return [shuffled[0], shuffled[1]];
  }

  function doBossSwapAttack(boss) {
    if (!boss || boss.hp <= 0) return false;

    const aliveAllies = _bs.allies.filter(u => u.hp > 0);
    const aliveMobs   = _bs.enemies.filter(u => u.hp > 0 && !u.isBoss);

    const patterns = [];
    if (aliveAllies.length >= 2) patterns.push('ally');
    if (aliveMobs.length   >= 2) patterns.push('enemy');

    if (patterns.length === 0) {
      _log(`${boss.name} が空間干渉を試みたが、入れ替え対象がいない`);
      return false;
    }

    const type = patterns[Math.floor(Math.random() * patterns.length)];

    if (type === 'ally') {
      const pair = pickTwoRandomUnits(aliveAllies);
      if (!pair) return false;
      const [a, b] = pair;
      swapUnitPositions(a, b);
      _log(`${boss.name} が空間を歪め、${a.name} と ${b.name} の位置を入れ替えた！`);
      _emit('bossSwap', {
        type: 'ally',
        units: [
          { _uid: a._uid, name: a.name, side: a.side, row: a.row, col: a.col },
          { _uid: b._uid, name: b.name, side: b.side, row: b.row, col: b.col },
        ],
        bs: _snapshot(),
      });
      return true;
    }

    if (type === 'enemy') {
      const pair = pickTwoRandomUnits(aliveMobs);
      if (!pair) return false;
      const [a, b] = pair;
      swapUnitPositions(a, b);
      _log(`${boss.name} が空間を歪め、${a.name} と ${b.name} の位置を入れ替えた！`);
      _emit('bossSwap', {
        type: 'enemy',
        units: [
          { _uid: a._uid, name: a.name, side: a.side, row: a.row, col: a.col },
          { _uid: b._uid, name: b.name, side: b.side, row: b.row, col: b.col },
        ],
        bs: _snapshot(),
      });
      return true;
    }

    return false;
  }

    function _checkBossCoreCapture() {
      // コア概念廃止：ボスHP0は _checkWinLose() で直接勝利判定する
    }

  // ============================================================
  // 敵AIフェーズ（完全 async）
  // ============================================================
  // ============================================================
  // 敵スポーン（ステージ設定に応じて定期的に敵を召喚）
  // ============================================================
  function _spawnEnemyFromConfig() {
    if (!_bs || !_bs.enemySpawn) return false;

    const sp = _bs.enemySpawn;
    const interval = sp.interval || 3;

    if (!_bs.turn || _bs.turn % interval !== 0) return false;

    const enemyId = sp.enemyId;
    if (!enemyId) return false;

    const enemyDef =
      (typeof getEnemyById === 'function' ? getEnemyById(enemyId) : null) ||
      ((window.ENEMIES || []).find(e => e.id === enemyId));

    if (!enemyDef) {
      _log(`スポーン対象 ${enemyId} が見つかりません`);
      return false;
    }

    const rows = sp.rows || [0, 1, 2, 3];
    const cols = sp.cols || [0, 1, 2, 3, 4];

    const occupied = new Set();

    // 生存味方
    _bs.allies.forEach(u => {
      if (u.hp > 0) occupied.add(`${u.row}-${u.col}`);
    });

    // 生存敵 + ボスはHP0後も盤面に残るため占有扱い
    _bs.enemies.forEach(u => {
      if (u.hp > 0 || u.isBoss) occupied.add(`${u.row}-${u.col}`);
    });

    const candidates = [];
    rows.forEach(row => {
      cols.forEach(col => {
        if (!BR.isValidCell(row, col)) return;
        const key = `${row}-${col}`;
        if (occupied.has(key)) return;
        candidates.push({ row, col });
      });
    });

    if (candidates.length === 0) {
      _log('敵が出現できる空きマスがありません');
      return false;
    }

    const pos = candidates[Math.floor(Math.random() * candidates.length)];
    const enemy = makeEnemy(enemyDef, pos.row, pos.col);

    _bs.enemies.push(enemy);

    _log(`${enemy.name} が出現した`);
    _emit('enemySpawn', { enemy: { ...enemy }, bs: _snapshot() });
    _renderUI();

    return true;
  }

  async function _runEnemyPhase() {
    // エリが生存していれば、他の味方が倒れていても通常フローを続ける。
    // 勝敗が確定している場合のみここで終了する。
    _checkWinLose();
    if (_bs.result) { _renderUI(); return; }

    // 敵ターン開始時：毒の継続ダメージ
    _applyPoisonTicks();
    _checkWinLose();
    if (_bs.result) { _renderUI(); return; }

    // 敵ターン開始時：盤面設置型召喚物の継続ダメージ
    _applyBoardSummonTicks();
    _checkWinLose();
    _renderUI();
    if (_bs.result) { _renderUI(); return; }

    // ステージ設定に応じた敵スポーン（ordered 作成前に呼び、即行動させる）
    _spawnEnemyFromConfig();

    // ボス予兆攻撃（行動ループより先に発動）
    if (_bs.turn % BOSS_WARN_INTERVAL === 0) {
      const boss = _bs.enemies.find(u => u.isBoss && u.hp > 0);
      if (boss && !_isSakielBoss(boss) && !_isOverseerBoss(boss)) {
        await _centerTextWait('⚠️ WARNING', 'ボスが予兆攻撃…', B32_WAIT.enemyAction);
        _doBossWarnAttack(boss, getAllUnits());
        _renderUI();
        await wait(B32_WAIT.attack);
        await wait(B32_WAIT.afterText);
        if (_bs.result) { _renderUI(); return; }
      }
    }
    // 3ターンに1度：ボスが位置入れ替え攻撃
    if (_bs.turn % BOSS_SWAP_INTERVAL === 0) {
      const boss = _bs.enemies.find(u => u.isBoss && u.hp > 0);

      if (boss && !_isSakielBoss(boss) && !_isOverseerBoss(boss)) {
        await _centerTextWait('⚠️ SPACE SHIFT', '空間干渉：位置入れ替え', B32_WAIT.enemyAction);

        doBossSwapAttack(boss);

        _renderUI();
        await wait(B32_WAIT.attack);
        await wait(B32_WAIT.afterText);

        if (_bs.result) return;
      }
    }
    // 行動順：毎ターン、生存敵をランダム順に並べて1体ずつ処理する。
    // 以前の「雑魚 → ボス」固定順だと、複数敵が一気に動いたように見えるため、
    // ここで actors を確定し、各敵の移動・攻撃・演出待ちが終わってから次の敵へ進む。
    const ordered = shuffle(aliveEnemies().filter(e => e && e.hp > 0));

    // 敵行動数を制御（'all' または未設定なら全員行動）
    // limit の場合も、先にランダム並びへしてから先頭N体を採用する。
    let actors = ordered;
    if (_bs.enemyActionMode !== 'all' && Number.isFinite(_bs.enemyActionsPerTurn)) {
      actors = ordered.slice(0, _bs.enemyActionsPerTurn);
    }

    _bs.enemyActionOrder = actors.map(e => e._uid);
    _bs.enemyActionIndex = 0;
    _bs.enemyActionTotal = actors.length;
    _bs.activeEnemyUid = null;

    for (let i = 0; i < actors.length; i++) {
      if (_bs.result) break;

      const enemy = actors[i];
      if (!enemy || enemy.hp <= 0) continue;

      _bs.activeEnemyUid = enemy._uid;
      _bs.enemyActionIndex = i + 1;
      _emit('enemyActionStart', {
        enemy: { ...enemy },
        index: _bs.enemyActionIndex,
        total: _bs.enemyActionTotal,
        bs: _snapshot(),
      });
      _renderUI();
      await wait(260);

      await _runEnemySingleAction(enemy);

      _emit('enemyActionEnd', {
        enemy: { ...enemy },
        index: _bs.enemyActionIndex,
        total: _bs.enemyActionTotal,
        bs: _snapshot(),
      });
      _bs.activeEnemyUid = null;
      _renderUI();

      if (_bs.result) break;
      await wait(320);
    }

    _clearEnemyAttackTraceCells();
    _bs.activeEnemyUid = null;
    _bs.enemyActionOrder = [];
    _bs.enemyActionIndex = 0;
    _bs.enemyActionTotal = 0;

    _tickStatusEffects();
    _checkWinLose();
    if (_bs.result) { _renderUI(); return; }

    // ENEMY TURN END
    await _centerTextWait('ENEMY TURN END', '干渉低下', B32_WAIT.enemyEnd);

    _nextTurn();
  }

  // ============================================================
  // 敵移動：詰まり回避ロジック（グループ優先順位つき候補リスト）
  // ============================================================

  /**
   * 移動先が有効かどうかを判定する
   * - 盤面外 / 他ユニット在室 / ボス在室 は NG
   * - コア概念廃止により、コアマス制約は持たない
   */
  function _canEnemyMoveTo(row, col, enemy) {
    if (!BR.isValidCell(row, col)) return false;

    const allUnits = getAllUnits();

    // ボスのいるマス（HP0後の核露出状態も含む）は進入禁止
    const bossAtCell = _bs.enemies.find(e => e.isBoss && e.row === row && e.col === col);
    if (bossAtCell) return false;

    const occupant = allUnits.find(u => u !== enemy && u.hp > 0 && u.row === row && u.col === col);

    // 他の敵・召喚物がいれば進入禁止。味方のみ「駒取り」として許可。
    if (occupant && occupant.side !== 'ally') return false;

    return true;
  }

  /**
   * 指定ターゲットへのマンハッタン距離
   */
  function _distToTarget(row, col, target) {
    if (!target) return 999;
    return Math.abs(row - target.row) + Math.abs(col - target.col);
  }

  /**
   * 候補マスをターゲットへの近さでソートする（同距離はランダム）
   */
  function _sortByTargetDistance(candidates, target) {
    return candidates.sort((a, b) => {
      const da = _distToTarget(a.row, a.col, target);
      const db = _distToTarget(b.row, b.col, target);
      if (da !== db) return da - db;
      return Math.random() < 0.5 ? -1 : 1;
    });
  }

  // [enemy movement unified] _getEnemyMoveCandidates() を廃止。
  // 移動候補の唯一の入口は getMoveCells(unitUid)。
  // MOVE_PRESETS_32 → BR.getMoveOffsets() → getMoveCells() の経路に一元化。

  /**
   * 後方互換用ラッパー。getMoveCells() に委譲するだけ。
   * 外部が getEnemyMoveCells() を呼んでいても壊れないよう残す。
   */
  function getEnemyMoveCells(enemyUid) {
    return getMoveCells(enemyUid);
  }


  /**
   * [enemy movement unified] 敵1体の移動先を決定する
   * 移動候補は getMoveCells(enemy._uid) から取得（MOVE_PRESETS_32 が唯一の正）。
   * ここでは「候補の中からどのマスを選ぶか」だけを担当する。
   * 戻り値: { row, col, isCapture, occupant } | null
   */
  function _decideEnemyMoveCell(enemy) {
    // getMoveCells() が唯一の移動候補ソース
    const candidates = getMoveCells(enemy._uid);
    if (!candidates || candidates.length === 0) return null;

    // 駒取り廃止：空きマスへの移動のみ
    const moves = candidates.filter(c => c.cellType === 'move');
    if (moves.length === 0) return null;

    const target = _getEnemyMoveTarget(enemy);
    if (!target) return null;

    const curDist = _distToTarget(enemy.row, enemy.col, target);
    const approaching = moves.filter(c => _distToTarget(c.row, c.col, target) < curDist);

    const pool = approaching.length > 0 ? approaching : moves;
    const sorted = _sortByTargetDistance(pool, target);
    const chosen = sorted[0];

    if (approaching.length === 0) {
      console.log('[B32 enemy lateral move]', {
        name: enemy.name,
        moveType: enemy.moveType,
        target: target.name,
        from: { row: enemy.row, col: enemy.col },
        to: chosen,
      });
      _log(`${enemy.name} が進路を調整した`);
    }

    return { row: chosen.row, col: chosen.col, isCapture: false, occupant: null };
  }


  /**
   * 攻撃後離脱用の移動候補をBFSで収集する。
   * 通常のmoveTypeとは独立し、上下左右へ最大distance歩けるが、
   * 生存ユニットのいるマスは通過・停止できない。
   */
  function _getEnemyRetreatCells(enemy, distance) {
    const maxDist = Math.max(0, Number(distance || 0));
    if (!enemy || maxDist <= 0) return [];

    const occupied = new Set();
    const units = [
      ...(_bs.allies || []),
      ...(_bs.enemies || []),
      ...(_bs.summons || []),
    ];
    units.forEach(unit => {
      if (!unit || unit === enemy || unit.hp <= 0) return;
      occupied.add(`${unit.row}-${unit.col}`);
    });

    // 専用移動レンジを持つヒット＆アウェイ型は、離脱時も同じレンジだけを使う。
    // イリシュ：後方1・左右1・前方1/2。
    if (
      enemy.aiType === 'hit_and_away' &&
      Array.isArray(enemy.customMoveOffsets) &&
      enemy.customMoveOffsets.length > 0
    ) {
      return enemy.customMoveOffsets
        .map(({ dr, dc }) => ({
          row: Number(enemy.row) + Number(dr || 0),
          col: Number(enemy.col) + Number(dc || 0),
          steps: Math.abs(Number(dr || 0)) + Math.abs(Number(dc || 0)),
        }))
        .filter(cell =>
          cell.steps > 0 &&
          cell.steps <= maxDist &&
          BR.isValidCell(cell.row, cell.col) &&
          !occupied.has(`${cell.row}-${cell.col}`)
        );
    }

    const startKey = `${enemy.row}-${enemy.col}`;
    const visited = new Set([startKey]);
    const queue = [{ row: enemy.row, col: enemy.col, steps: 0 }];
    const result = [];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

    while (queue.length) {
      const cur = queue.shift();
      if (cur.steps >= maxDist) continue;

      for (const [dr, dc] of dirs) {
        const row = cur.row + dr;
        const col = cur.col + dc;
        const key = `${row}-${col}`;
        if (!BR.isValidCell(row, col) || visited.has(key) || occupied.has(key)) continue;
        visited.add(key);
        const next = { row, col, steps: cur.steps + 1 };
        queue.push(next);
        result.push(next);
      }
    }
    return result;
  }

  /**
   * 攻撃対象から最も離れるマスへ最大指定距離だけ離脱する。
   * 同距離なら、より多く歩けるマスを優先し、最後はランダム。
   * 包囲や盤面端により退路がなければ離脱しない。
   */
  async function _retreatEnemyAfterAttack(enemy, attackedTarget) {
    if (!enemy || enemy.hp <= 0 || !enemy.retreatAfterAttack) return false;
    const maxDistance = Math.max(0, Number(enemy.retreatDistance || 0));
    if (!attackedTarget || maxDistance <= 0) return false;

    const candidates = _getEnemyRetreatCells(enemy, maxDistance);
    if (!candidates.length) {
      _log(`${enemy.name} は退路を塞がれた`);
      return false;
    }

    const currentDistance = _distToTarget(enemy.row, enemy.col, attackedTarget);
    const farther = candidates.filter(cell => _distToTarget(cell.row, cell.col, attackedTarget) > currentDistance);
    if (!farther.length) {
      _log(`${enemy.name} は退路を確保できなかった`);
      return false;
    }

    farther.sort((a, b) => {
      const da = _distToTarget(a.row, a.col, attackedTarget);
      const db = _distToTarget(b.row, b.col, attackedTarget);
      if (da !== db) return db - da;
      if (a.steps !== b.steps) return b.steps - a.steps;
      return Math.random() < 0.5 ? -1 : 1;
    });

    const chosen = farther[0];
    _emit('enemyActionStep', {
      step: 'retreat_after_attack',
      enemy: { ...enemy },
      from: { row: enemy.row, col: enemy.col },
      to: { row: chosen.row, col: chosen.col },
      target: { ...attackedTarget },
      bs: _snapshot(),
    });
    enemy.row = chosen.row;
    enemy.col = chosen.col;
    _log(`${enemy.name} が攻撃後に${chosen.steps}マス離脱した`);
    _renderUI();
    await wait(B32_WAIT.move);
    await wait(B32_WAIT.afterText);
    return true;
  }

  // ============================================================
  // サキエル専用：毎ターン5種からランダム1行動
  // ============================================================

  function _isOverseerBoss(enemy) {
    if (!enemy) return false;
    // 本番ローグライトは enemy_overseer_roguelite。
    // DEBUG・旧ステージ定義では enemy_01 が残っているため、両方を同じ専用AIへ統一する。
    return enemy.id === 'enemy_overseer_roguelite'
      || enemy.id === 'enemy_01'
      || enemy.specialActionType === 'overseer_random_4_ult6';
  }

  function _overseerForwardCells(enemy, mode) {
    const cells = new Set();
    if (!enemy) return cells;

    if (mode === 'three_lines') {
      for (let r = enemy.row + 1; r < BOARD_ROWS; r++) {
        [enemy.col - 1, enemy.col, enemy.col + 1].forEach(c => {
          if (BR.isValidCell(r, c)) cells.add(`${r}-${c}`);
        });
      }
      return cells;
    }

    if (mode === 'triangle') {
      for (let depth = 1; depth <= 3; depth++) {
        const row = enemy.row + depth;
        const radius = depth - 1;
        for (let c = enemy.col - radius; c <= enemy.col + radius; c++) {
          if (BR.isValidCell(row, c)) cells.add(`${row}-${c}`);
        }
      }
      return cells;
    }

    if (mode === 'grid') {
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          if ((r + c) % 2 === 0) cells.add(`${r}-${c}`);
        }
      }
    }
    return cells;
  }

  async function _overseerDamagePattern(enemy, mode, title, sub, fixedDamage) {
    const cells = _overseerForwardCells(enemy, mode);
    _setTransientBossDangerCells(cells, mode === 'grid' ? 'ULT' : 'WARNING');
    await _centerTextWait(mode === 'grid' ? `⚠️ ${title}` : title, sub, B32_WAIT.guide);

    _setEnemyAttackTraceCells(cells, enemy, title);
    await wait(180);
    _playEnemyStrongAttackShake({
      strongAttack: true,
      isUltimate: mode === 'grid',
      fixedDamage: fixedDamage,
      cellCount: cells.size,
      lineCount: mode === 'three_lines' ? 3 : 0,
      patternId: mode,
    });
    const targets = (_bs.allies || []).filter(a => a && a.hp > 0 && cells.has(`${a.row}-${a.col}`));
    _emit('enemyActionStep', {
      step: 'overseer_pattern',
      enemy: { ...enemy },
      patternId: mode,
      cells: Array.from(cells),
      targets: targets.map(t => ({ ...t })),
      bs: _snapshot(),
    });

    targets.forEach(target => {
      const dmg = fixedDamage != null
        ? Number(fixedDamage)
        : calcDamage(getEffectiveAtk(enemy), OVERSEER_PATTERN_RATE, target, enemy);
      applyDamage(target, dmg, enemy, {
        id: `overseer_${mode}`,
        name: title,
        isUltimate: mode === 'grid',
        hitStyle: mode === 'grid' ? 'heavy' : 'holy',
        canCritical: false,
      });
    });

    _log(`${enemy.name}：${title}`);
    _renderUI();
    await wait(B32_WAIT.attack);
    await wait(B32_WAIT.afterText);
    _clearEnemyAttackTraceCells();
    _clearTransientBossDangerCells();
  }

  async function _overseerPullFarthest(enemy) {
    const allies = (_bs.allies || []).filter(a => a && a.hp > 0);
    if (!allies.length) return;
    allies.sort((a, b) => manhattan(enemy, b) - manhattan(enemy, a));
    const target = allies[0];
    const dest = { row: enemy.row + 1, col: enemy.col };
    if (!BR.isValidCell(dest.row, dest.col)) return;

    await _centerTextWait('収監', '最遠のユニットを眼前へ引き寄せる', B32_WAIT.enemyAction);

    const occupant = getAllUnits().find(u => u && u.hp > 0 && u._uid !== target._uid && u.row === dest.row && u.col === dest.col);
    const old = { row: target.row, col: target.col };
    target.row = dest.row;
    target.col = dest.col;
    if (occupant) {
      occupant.row = old.row;
      occupant.col = old.col;
    }

    _log(`${enemy.name} が ${target.name} を目の前へ引き寄せた`);
    _emit('bossSwap', {
      type: 'overseer_pull',
      units: [
        { _uid: target._uid, name: target.name, side: target.side, row: target.row, col: target.col },
        ...(occupant ? [{ _uid: occupant._uid, name: occupant.name, side: occupant.side, row: occupant.row, col: occupant.col }] : []),
      ],
      bs: _snapshot(),
    });
    _renderUI();
    await wait(B32_WAIT.move);
    await wait(B32_WAIT.afterText);
  }

  function _findOverseerSummonCell(target) {
    const occupied = new Set(getAllUnits().filter(u => u && (u.hp > 0 || u.isBoss)).map(u => `${u.row}-${u.col}`));
    const preferred = [
      { row: target.row - 1, col: target.col },
      { row: target.row - 1, col: target.col - 1 },
      { row: target.row - 1, col: target.col + 1 },
      { row: target.row, col: target.col - 1 },
      { row: target.row, col: target.col + 1 },
    ];
    return preferred.find(p => BR.isValidCell(p.row, p.col) && !occupied.has(`${p.row}-${p.col}`)) || null;
  }

  async function _overseerSummonAtHighestHp(enemy) {
    const allies = (_bs.allies || []).filter(a => a && a.hp > 0);
    if (!allies.length) return;
    allies.sort((a, b) => Number(b.hp || 0) - Number(a.hp || 0));
    const target = allies[0];
    const pos = _findOverseerSummonCell(target);

    await _centerTextWait('観測端末', `${target.name} の前方へしもべを召喚`, B32_WAIT.enemyAction);
    if (!pos) {
      _log('しもべを召喚できる空きマスがない');
      return;
    }

    const enemyDef =
      (typeof getEnemyById === 'function' ? getEnemyById('rl_overseer_servant_straight') : null) ||
      ((window.ENEMIES || []).find(e => e.id === 'rl_overseer_servant_straight'));
    if (!enemyDef) return;

    const summoned = makeEnemy(enemyDef, pos.row, pos.col);
    _bs.enemies.push(summoned);
    _log(`${target.name} の目の前に ${summoned.name} が出現した`);
    _emit('enemySpawn', { enemy: { ...summoned }, source: { ...enemy }, target: { ...target }, bs: _snapshot() });
    _renderUI();
    await wait(B32_WAIT.move);
    await wait(B32_WAIT.afterText);
  }

  const OVERSEER_ACTION_PATTERNS = [
    { id: 'three_lines', title: '三条照射', sub: '前方3ラインを貫通する', guideText: 'オーバーシア正面の3列を盤面端まで貫通' },
    { id: 'pull', title: '収監', sub: '最遠のユニットを眼前へ引き寄せる', guideText: '最も離れた味方1体をオーバーシア正面へ移動', isRandomTarget: true },
    { id: 'triangle', title: '白亜三角陣', sub: '前方を三角形に薙ぎ払う', guideText: '正面1マス→横3マス→横5マスの三角範囲' },
    { id: 'summon', title: '観測端末', sub: '最大HPのユニット前方へしもべを召喚', guideText: '現在HPが最も高い味方の前方へ雑魚1体を召喚', isRandomTarget: true },
  ];

  function _overseerPlannedCells(enemy, actionId) {
    if (!enemy) return [];
    let set = new Set();
    if (actionId === 'grid') {
      set = _overseerForwardCells(enemy, 'grid');
    } else if (actionId === 'three_lines' || actionId === 'triangle') {
      set = _overseerForwardCells(enemy, actionId);
    } else if (actionId === 'pull') {
      const row = enemy.row + 1;
      const col = enemy.col;
      if (BR.isValidCell(row, col)) set.add(`${row}-${col}`);
    } else if (actionId === 'summon') {
      const allies = (_bs && _bs.allies || []).filter(a => a && a.hp > 0)
        .sort((a, b) => Number(b.hp || 0) - Number(a.hp || 0));
      const target = allies[0];
      const pos = target ? _findOverseerSummonCell(target) : null;
      if (pos) set.add(`${pos.row}-${pos.col}`);
    }
    return Array.from(set).map(key => {
      const [row, col] = String(key).split('-').map(Number);
      return { row, col };
    });
  }

  function _rollOverseerNextAction(enemy, targetTurn) {
    if (!enemy) return null;
    const turn = Math.max(1, Number(targetTurn || (_bs && _bs.turn) || 1));
    let selected;
    if (turn % OVERSEER_ULT_INTERVAL === 0) {
      selected = {
        id: 'grid', title: '万象格子',
        sub: '全域を格子状に断裁する／固定150ダメージ',
        guideText: '盤面全域の格子状マスへ固定150ダメージ',
      };
    } else {
      selected = OVERSEER_ACTION_PATTERNS[Math.floor(Math.random() * OVERSEER_ACTION_PATTERNS.length)];
    }
    if (!selected) return null;
    enemy._overseerNextAction = {
      id: selected.id,
      title: selected.title,
      sub: selected.sub,
      guideText: selected.guideText,
      cells: _overseerPlannedCells(enemy, selected.id),
      isRandomTarget: !!selected.isRandomTarget,
      decidedTurn: turn,
    };
    return enemy._overseerNextAction;
  }

  function _ensureOverseerNextAction(enemy) {
    if (!enemy) return null;
    const turn = Math.max(1, Number(_bs && _bs.turn || 1));
    const next = enemy._overseerNextAction;
    if (next && next.id && Array.isArray(next.cells) && Number(next.decidedTurn) === turn) return next;
    return _rollOverseerNextAction(enemy, turn);
  }

  function _initializeOverseerNextActions() {
    if (!_bs || !Array.isArray(_bs.enemies)) return;
    _bs.enemies.forEach(enemy => {
      if (_isOverseerBoss(enemy)) _ensureOverseerNextAction(enemy);
    });
  }

  async function _runOverseerSpecialAction(enemy) {
    const selected = _ensureOverseerNextAction(enemy);
    if (!selected) return;
    enemy._overseerNextAction = null;

    if (selected.id === 'grid') {
      await _overseerDamagePattern(enemy, 'grid', '万象格子', '全域を格子状に断裁する', OVERSEER_GRID_DAMAGE);
    } else if (selected.id === 'three_lines') {
      await _overseerDamagePattern(enemy, 'three_lines', '三条照射', '前方3ラインを貫通する');
    } else if (selected.id === 'pull') {
      await _overseerPullFarthest(enemy);
    } else if (selected.id === 'triangle') {
      await _overseerDamagePattern(enemy, 'triangle', '白亜三角陣', '前方を三角形に薙ぎ払う');
    } else if (selected.id === 'summon') {
      await _overseerSummonAtHighestHp(enemy);
    }

    _rollOverseerNextAction(enemy, Number(_bs && _bs.turn || 1) + 1);
    _renderUI();
  }

  function _isSakielBoss(enemy) {
    return !!(enemy && enemy.id === 'enemy_sakiel_roguelite');
  }

  const SAKIEL_ACTION_PATTERNS = [
    {
      id: 'fan_3_lines',
      title: '三叉天罰',
      sub: '直線貫通3ライン ／｜＼',
      guideText: '前方へ伸びる3本の貫通ライン',
    },
    {
      id: 'parallel_3_lines',
      title: '三列断罪',
      sub: '直線貫通3ライン ｜｜｜',
      guideText: 'サキエルの自列と左右1列を貫通',
    },
    {
      id: 'border_3_rows',
      title: '白界の境界',
      sub: '一列おきに横断するボーダー',
      guideText: '盤面の横3列を一列おきに攻撃',
    },
    {
      id: 'outer_4_columns',
      title: '外縁粛清',
      sub: '左右端2列ずつを貫通',
      guideText: '左右端2列ずつを攻撃。中央列は安全',
    },
    {
      id: 'atk_shift',
      title: '天威転写',
      sub: '自身ATK上昇・ランダムな味方1体のATK低下',
      guideText: '自身ATK+20%／ランダムな味方1体のATK-20%（各2ターン）',
    },
  ];

  function _sakielPatternCells(enemy, patternId) {
    const cells = new Set();
    const add = (row, col) => {
      if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
        cells.add(`${row}-${col}`);
      }
    };

    const row = Number(enemy.row);
    const col = Number(enemy.col);

    if (patternId === 'fan_3_lines') {
      // ① ★から前方へ ／｜＼ の3直線
      for (const dc of [-1, 0, 1]) {
        let r = row + 1;
        let c = col + dc;
        while (r < BOARD_ROWS && c >= 0 && c < BOARD_COLS) {
          add(r, c);
          r += 1;
          c += dc;
        }
      }
    } else if (patternId === 'parallel_3_lines') {
      // ② 自列と左右1列、縦3ライン
      [col - 1, col, col + 1].forEach(c => {
        for (let r = row + 1; r < BOARD_ROWS; r++) add(r, c);
      });
    } else if (patternId === 'border_3_rows') {
      // ③ 一列おきの横3ライン
      [3, 5, 7].forEach(r => {
        for (let c = 0; c < BOARD_COLS; c++) add(r, c);
      });
    } else if (patternId === 'outer_4_columns') {
      // ④ 左右端2列ずつ。中央列のみ安全
      [0, 1, 3, 4].forEach(c => {
        for (let r = 0; r < BOARD_ROWS; r++) add(r, c);
      });
    }

    return cells;
  }

  function _setTransientBossDangerCells(cells, label) {
    _bs.activeBossDangerCells = Array.from(cells || []).map(key => {
      const [row, col] = String(key).split('-').map(Number);
      return { row, col, type: 'boss_warn', label: label || 'WARNING' };
    });
    _renderUI();
  }

  function _clearTransientBossDangerCells() {
    _bs.activeBossDangerCells = [];
    _renderUI();
  }

  function _replaceTimedStatus(target, type, status) {
    if (!target) return;
    if (!Array.isArray(target.statusEffects)) target.statusEffects = [];
    target.statusEffects = target.statusEffects.filter(e => !(e && e.type === type));
    target.statusEffects.push({
      ...status,
      type,
      duration: 2,
      appliedTurn: _bs.turn,
    });
  }

  function _rollSakielNextAction(enemy) {
    if (!enemy) return null;

    const selected = SAKIEL_ACTION_PATTERNS[
      Math.floor(Math.random() * SAKIEL_ACTION_PATTERNS.length)
    ];
    if (!selected) return null;

    const cells = selected.id === 'atk_shift'
      ? []
      : Array.from(_sakielPatternCells(enemy, selected.id)).map(key => {
          const [row, col] = String(key).split('-').map(Number);
          return { row, col };
        });

    enemy._sakielNextAction = {
      id: selected.id,
      title: selected.title,
      sub: selected.sub,
      guideText: selected.guideText,
      cells,
      isRandomTarget: selected.id === 'atk_shift',
      decidedTurn: Number(_bs && _bs.turn || 1),
    };

    return enemy._sakielNextAction;
  }

  function _ensureSakielNextAction(enemy) {
    if (!enemy) return null;
    const next = enemy._sakielNextAction;
    if (next && next.id && Array.isArray(next.cells)) return next;
    return _rollSakielNextAction(enemy);
  }

  function _initializeSakielNextActions() {
    if (!_bs || !Array.isArray(_bs.enemies)) return;
    _bs.enemies.forEach(enemy => {
      if (_isSakielBoss(enemy) || enemy.specialActionType === 'sakiel_random_5') {
        _ensureSakielNextAction(enemy);
      }
    });
  }

  async function _runSakielSpecialAction(enemy) {
    // 味方ターン中に予告していた行動を、そのまま実行する。
    // 保存データ等で予告がない場合だけフォールバック抽選する。
    const selected = _ensureSakielNextAction(enemy);
    if (!selected) return;

    // 実行開始時点で消費済みにする。処理完了後に次回分を再抽選する。
    enemy._sakielNextAction = null;

    if (selected.id === 'atk_shift') {
      await _centerTextWait(selected.title, selected.sub, B32_WAIT.enemyAction);

      _replaceTimedStatus(enemy, 'atk_up', {
        name: '天威',
        rate: 1.20,
        sourceUid: enemy._uid,
        sourceName: enemy.name,
      });

      const candidates = (_bs.allies || []).filter(a => a && a.hp > 0);
      const target = candidates.length
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : null;

      if (target) {
        _replaceTimedStatus(target, 'atk_down', {
          name: '断罪',
          rate: 0.80,
          sourceUid: enemy._uid,
          sourceName: enemy.name,
        });
        _log(`${enemy.name} のATKが20%上昇。${target.name} のATKが20%低下（2ターン）`);
      } else {
        _log(`${enemy.name} のATKが20%上昇（2ターン）`);
      }

      _emit('enemyActionStep', {
        step: 'sakiel_buff_debuff',
        enemy: { ...enemy },
        target: target ? { ...target } : null,
        patternId: selected.id,
        bs: _snapshot(),
      });
      _renderUI();
      await wait(B32_WAIT.attack);
      _rollSakielNextAction(enemy);
      _renderUI();
      return;
    }

    const cells = _sakielPatternCells(enemy, selected.id);
    _setTransientBossDangerCells(cells, 'WARNING');

    await _centerTextWait('⚠️ ' + selected.title, selected.sub, B32_WAIT.guide);

    _setEnemyAttackTraceCells(cells, enemy, selected.title);
    await wait(180);
    _playEnemyStrongAttackShake({
      strongAttack: selected.strongAttack !== false,
      isUltimate: !!selected.isUltimate,
      cellCount: cells.size,
      lineCount: selected.lineCount || 3,
      patternId: selected.id,
    });
    const targets = (_bs.allies || []).filter(ally => {
      return ally && ally.hp > 0 && cells.has(`${ally.row}-${ally.col}`);
    });

    _emit('enemyActionStep', {
      step: 'sakiel_pattern',
      enemy: { ...enemy },
      patternId: selected.id,
      cells: Array.from(cells),
      targets: targets.map(t => ({ ...t })),
      bs: _snapshot(),
    });

    const damageRate = Number(enemy.specialActionDamageRate || 0.90);
    targets.forEach(target => {
      const dmg = calcDamage(getEffectiveAtk(enemy), damageRate, target, enemy);
      applyDamage(target, dmg, enemy, {
        id: `sakiel_${selected.id}`,
        name: selected.title,
        hitStyle: 'holy',
        canCritical: false,
      });
    });

    _log(`${enemy.name}：${selected.title}`);
    _renderUI();
    await wait(B32_WAIT.attack);
    await wait(B32_WAIT.afterText);
    _clearEnemyAttackTraceCells();
    _clearTransientBossDangerCells();

    // 次の味方ターンで確認できるよう、行動終了直後に次回行動を決定する。
    _rollSakielNextAction(enemy);
    _renderUI();
  }

  // ============================================================
  // リヴィア専用：忘却・消失・消去
  // ============================================================
  function _addRiviaForget(target, duration) {
    if (!target) return;
    if (!Array.isArray(target.statusEffects)) target.statusEffects = [];
    target.statusEffects = target.statusEffects.filter(e => !(e && e.type === 'skill_forget'));
    target.statusEffects.push({
      type: 'skill_forget',
      name: '忘却',
      duration: Math.max(1, Number(duration || 1)),
      appliedTurn: _bs.turn,
      sourceName: 'リヴィア',
    });
  }

  function _riviaEmptyCells(maxRow) {
    const occupied = new Set(getAllUnits().filter(u => u && u.hp > 0).map(u => `${u.row}-${u.col}`));
    const cells = [];
    for (let r = 0; r <= Math.min(BOARD_ROWS - 1, Number(maxRow == null ? 3 : maxRow)); r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (!occupied.has(`${r}-${c}`)) cells.push({ row:r, col:c });
      }
    }
    return shuffle(cells);
  }

  async function _riviaTeleport(enemy, title, plannedDestination) {
    const next = plannedDestination || _riviaEmptyCells(3)[0];
    if (!next) return;
    await _centerTextWait(title || '消失', '姿が記録から消える', B32_WAIT.enemyAction);
    _emit('enemyVanish', { enemy:{...enemy}, bs:_snapshot() });
    enemy.row = next.row;
    enemy.col = next.col;
    _renderUI();
    await wait(B32_WAIT.move);
    _emit('enemyReappear', { enemy:{...enemy}, bs:_snapshot() });
  }

  function _riviaDiagonalCellsAt(row, col) {
    const cells = new Set();
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => {
      let r = Number(row) + dr, c = Number(col) + dc;
      while (BR.isValidCell(r,c)) { cells.add(`${r}-${c}`); r += dr; c += dc; }
    });
    return cells;
  }

  function _riviaDiagonalCells(enemy) {
    return enemy ? _riviaDiagonalCellsAt(enemy.row, enemy.col) : new Set();
  }

  // ガイドと実行で同じ転移先・攻撃軌道を使うため、味方フェーズ開始前に先行決定する。
  function _makeRiviaTeleportPlan(enemy) {
    if (!enemy) return null;
    const destination = _riviaEmptyCells(3)[0] || null;
    if (!destination) return { destination:null, cells:[] };
    return {
      destination: { row:Number(destination.row), col:Number(destination.col) },
      cells: Array.from(_riviaDiagonalCellsAt(destination.row, destination.col)).map(key => {
        const [row, col] = key.split('-').map(Number);
        return { row, col };
      }),
    };
  }

  function _ensureRiviaCasterPlan(enemy) {
    if (!enemy) return null;
    const turn = Math.max(1, Number(_bs && _bs.turn || 1));
    const current = enemy._riviaCasterPlan;
    if (current && Number(current.decidedTurn) === turn) return current;
    const plan = _makeRiviaTeleportPlan(enemy) || { destination:null, cells:[] };
    enemy._riviaCasterPlan = {
      id:'vanish',
      title:'虚像星芒',
      sub:'姿を消して別地点から斜めに攻撃する',
      ...plan,
      decidedTurn:turn,
    };
    return enemy._riviaCasterPlan;
  }

  async function _riviaDamageCells(enemy, cells, title, rate) {
    _setTransientBossDangerCells(cells, '忘却');
    await _centerTextWait(`⚠️ ${title}`, '記録のない軌道から攻撃する', B32_WAIT.guide);
    _setEnemyAttackTraceCells(cells, enemy, title);
    await wait(180);
    const targets = (_bs.allies || []).filter(a => a && a.hp > 0 && cells.has(`${a.row}-${a.col}`));
    targets.forEach(target => {
      const dmg = calcDamage(getEffectiveAtk(enemy), Number(rate || 0.9), target, enemy);
      applyDamage(target, dmg, enemy, { id:'rivia_diagonal', name:title, hitStyle:'holy', canCritical:false });
    });
    _renderUI();
    await wait(B32_WAIT.attack);
    _clearEnemyAttackTraceCells();
    _clearTransientBossDangerCells();
  }

  async function _runRiviaVanishCaster(enemy) {
    const plan = _ensureRiviaCasterPlan(enemy);
    enemy._riviaCasterPlan = null;
    await _riviaTeleport(enemy, '記録消失', plan && plan.destination);
    const cells = new Set((plan && plan.cells || []).map(c => `${c.row}-${c.col}`));
    await _riviaDamageCells(enemy, cells.size ? cells : _riviaDiagonalCells(enemy), '虚像星芒', Number(enemy.specialActionDamageRate || 0.90));

    // 次の味方フェーズ用の転移先と攻撃軌道を、行動終了時点で確定しておく。
    const nextPlan = _makeRiviaTeleportPlan(enemy) || { destination:null, cells:[] };
    enemy._riviaCasterPlan = {
      id:'vanish',
      title:'虚像星芒',
      sub:'姿を消して別地点から斜めに攻撃する',
      ...nextPlan,
      decidedTurn:Math.max(1, Number(_bs && _bs.turn || 1) + 1),
    };
    _renderUI();
  }

  const RIVIA_ACTIONS = [
    { id:'forget', title:'記憶剥離', sub:'ランダムな1体が次のターン、スキルを忘れる' },
    { id:'erase', title:'追憶抹消', sub:'味方の強化効果を消去し、次ターン開始時のLINKを1減らす' },
    { id:'vanish', title:'存在消失', sub:'姿を消して別地点から斜めに攻撃する' },
  ];

  function _rollRiviaNextAction(enemy, turn) {
    if (!enemy) return null;
    const t = Math.max(1, Number(turn || (_bs && _bs.turn) || 1));
    const selected = (t % 4 === 0)
      ? { id:'blank', title:'白紙化', sub:'全員のスキル記憶とLINKを消去する' }
      : RIVIA_ACTIONS[Math.floor(Math.random() * RIVIA_ACTIONS.length)];
    const teleportPlan = selected.id === 'vanish' ? _makeRiviaTeleportPlan(enemy) : null;
    enemy._riviaNextAction = {
      ...selected,
      cells: teleportPlan ? teleportPlan.cells : [],
      destination: teleportPlan ? teleportPlan.destination : null,
      decidedTurn:t,
    };
    return enemy._riviaNextAction;
  }

  function _ensureRiviaNextAction(enemy) {
    const turn = Math.max(1, Number(_bs && _bs.turn || 1));
    const next = enemy && enemy._riviaNextAction;
    if (next && next.id && Number(next.decidedTurn) === turn) return next;
    return _rollRiviaNextAction(enemy, turn);
  }

  function _initializeRiviaNextActions() {
    if (!_bs || !Array.isArray(_bs.enemies)) return;
    _bs.enemies.forEach(e => {
      if (!e) return;
      if (e.id === 'enemy_rivia_roguelite' || e.specialActionType === 'rivia_oblivion_4') {
        _ensureRiviaNextAction(e);
      } else if (e.specialActionType === 'rivia_vanish_caster') {
        _ensureRiviaCasterPlan(e);
      }
    });
  }

  async function _runRiviaBossAction(enemy) {
    const selected = _ensureRiviaNextAction(enemy);
    enemy._riviaNextAction = null;
    const allies = (_bs.allies || []).filter(a => a && a.hp > 0);

    if (selected.id === 'forget') {
      const target = allies.length ? allies[Math.floor(Math.random() * allies.length)] : null;
      await _centerTextWait(selected.title, selected.sub, B32_WAIT.enemyAction);
      if (target) { _addRiviaForget(target, 1); _log(`${target.name} はスキルを忘れた`); }
      _renderUI(); await wait(B32_WAIT.attack);
    } else if (selected.id === 'erase') {
      await _centerTextWait(selected.title, selected.sub, B32_WAIT.enemyAction);
      allies.forEach(a => {
        a.statusEffects = (a.statusEffects || []).filter(e => !['atk_up','critical_up','crit_up','damage_cut','hp_up'].includes(e && e.type));
      });
      if (_bs.link) {
        _bs.link.pendingTurnStartPenalty =
          Math.max(0, Number(_bs.link.pendingTurnStartPenalty || 0)) + 2;
      }
      _log('味方の強化効果が消去され、次ターン開始時のLINK -2が予約された');
      _renderUI(); await wait(B32_WAIT.attack);
    } else if (selected.id === 'blank') {
      await _centerTextWait('⚠️ 白紙化', selected.sub, B32_WAIT.guide);
      allies.forEach(a => _addRiviaForget(a, 1));
      if (_bs.link) _bs.link.current = 0;
      _log('全員のスキル記憶とLINKが白紙化された');
      _renderUI(); await wait(B32_WAIT.attack);
    } else {
      await _riviaTeleport(enemy, selected.title, selected.destination);
      const plannedCells = new Set((selected.cells || []).map(c => `${c.row}-${c.col}`));
      await _riviaDamageCells(enemy, plannedCells.size ? plannedCells : _riviaDiagonalCells(enemy), '忘却星界', Number(enemy.specialActionDamageRate || 0.95));
    }

    _rollRiviaNextAction(enemy, Number(_bs && _bs.turn || 1) + 1);
    _renderUI();
  }

  // 敵1体の行動処理。
  // 移動・攻撃・攻撃アップ演出の待ちまでこの関数内で完了させ、
  // 呼び出し元の for-await ループが次の敵へ進むのを防ぐ。
  async function _runEnemySingleAction(enemy) {
    const actionLabel = enemy.isBoss ? 'BOSS ACTION' : 'ENEMY ACTION';

    if (!enemy || enemy.hp <= 0) return;

    // スタン
    if (enemy.stunned) {
      _log(`${enemy.name} は眠り／スタン中のため行動できない`);
      // stunned はここでは解除しない。
      // duration が残っている間は _tickStatusEffects() 後も stunned を維持し、
      // duration が0になった時点で解除する。
      //await _centerTextWait(enemy.name, 'NO ACTION', B32_WAIT.enemyAction);
      _renderUI();
      return;
    }

    // オーバーシア本体は通常攻撃を使わず、専用4種＋6ターン必殺技を実行する。
    if (_isOverseerBoss(enemy)) {
      await _runOverseerSpecialAction(enemy);
      return;
    }

    // サキエル本体は通常攻撃を使わず、毎ターン5種から1つをランダム実行する。
    if (_isSakielBoss(enemy) || enemy.specialActionType === 'sakiel_random_5') {
      await _runSakielSpecialAction(enemy);
      return;
    }

    if (enemy.specialActionType === 'rivia_vanish_caster') {
      await _runRiviaVanishCaster(enemy);
      return;
    }

    if (enemy.id === 'enemy_rivia_roguelite' || enemy.specialActionType === 'rivia_oblivion_4') {
      await _runRiviaBossAction(enemy);
      return;
    }

    const rangeTargets = getEnemyAttackTargets(enemy);

    if (rangeTargets.length > 0) {
      // 射程内に味方がいる → ボス/特殊敵はエリ優先、通常敵は最も近い味方を攻撃
      const target = _pickEnemyAttackTarget(enemy, rangeTargets);
      if (!target) return;
      const dmg = calcDamage(getEffectiveAtk(enemy), 1.0, target, enemy);
      const targetHpBefore = Number(target.hp || 0);
      const attackTraceCells = _getEnemyAttackTraceCells(enemy);
      _setEnemyAttackTraceCells(attackTraceCells, enemy, enemy.attackRange || 'ATTACK');
      await wait(180);
      _playEnemyStrongAttackShake({
        strongAttack: enemy.strongAttack,
        power: enemy.power || enemy.attackPower,
        multiplier: Number(enemy.attackMultiplier || 1.0),
        damageRate: Number(enemy.damageRate || 0),
        cellCount: attackTraceCells.size,
        lineCount: Number(enemy.attackLineCount || 0),
      });
      _emit('enemyActionStep', {
        step: 'attack',
        enemy: { ...enemy },
        target: { ...target },
        bs: _snapshot(),
      });
      applyDamage(target, dmg, enemy);
      if (enemy.specialActionType === 'rivia_forget_lancer' && target.hp > 0) {
        _addRiviaForget(target, 1);
        _log(`${target.name} は次のターン、スキルを忘れる`);
      }
      const killed = targetHpBefore > 0 && Number(target.hp || 0) <= 0;
      _renderUI();
      // 通常攻撃アップ演出は約1.18秒、BREAK時は約1.94秒。
      // 次の敵行動が重ならないよう、ここで十分に待つ。
      await wait(killed ? 2100 : 1300);
      await wait(B32_WAIT.afterText);
      _clearEnemyAttackTraceCells();
      // applyDamage 内で _checkWinLose を呼んでいるが、念のため result を確認
      if (_bs.result) return;
      await _retreatEnemyAfterAttack(enemy, target);
      return;
    }

    // 通常ボスは固定。allowBossMovement を持つボス（イリシュ等）は射程外なら接近する。
    if (enemy.isBoss && !enemy.allowBossMovement) {
      // await _centerTextWait(enemy.name, 'NO ACTION', B32_WAIT.enemyAction);
      return;
    }

    // moveType: 'none' → 移動しない
    if (enemy.moveType === 'none') return;

    // ── 詰まり回避移動：グループ優先順位つき候補リストで移動先を決定 ──
    const bestCell = _decideEnemyMoveCell(enemy);

    if (!bestCell) {
      // 移動先なし（詰まり）
      return;
    }

    // 駒取り廃止：空きマスへの移動のみ実行
    _emit('enemyActionStep', {
      step: 'move',
      enemy: { ...enemy },
      to: { row: bestCell.row, col: bestCell.col },
      bs: _snapshot(),
    });
    enemy.row = bestCell.row;
    enemy.col = bestCell.col;
    _log(`${enemy.name} が移動した`);
    _renderUI();
    await wait(B32_WAIT.move);
    await wait(B32_WAIT.afterText);

    // 移動後に攻撃可能か再チェック
    const afterMoveTargets = getEnemyAttackTargets(enemy);
    if (afterMoveTargets.length > 0) {
      const target = _pickEnemyAttackTarget(enemy, afterMoveTargets);
      if (!target) return;
      const dmg = calcDamage(getEffectiveAtk(enemy), 1.0, target, enemy);
      const targetHpBefore = Number(target.hp || 0);
      const attackTraceCells = _getEnemyAttackTraceCells(enemy);
      _setEnemyAttackTraceCells(attackTraceCells, enemy, enemy.attackRange || 'ATTACK');
      await wait(180);
      _playEnemyStrongAttackShake({
        strongAttack: enemy.strongAttack,
        power: enemy.power || enemy.attackPower,
        multiplier: Number(enemy.attackMultiplier || 1.0),
        damageRate: Number(enemy.damageRate || 0),
        cellCount: attackTraceCells.size,
        lineCount: Number(enemy.attackLineCount || 0),
      });
      _emit('enemyActionStep', {
        step: 'attack_after_move',
        enemy: { ...enemy },
        target: { ...target },
        bs: _snapshot(),
      });
      applyDamage(target, dmg, enemy);
      if (enemy.specialActionType === 'rivia_forget_lancer' && target.hp > 0) {
        _addRiviaForget(target, 1);
        _log(`${target.name} は次のターン、スキルを忘れる`);
      }
      const killed = targetHpBefore > 0 && Number(target.hp || 0) <= 0;
      _renderUI();
      await wait(killed ? 2100 : 1300);
      await wait(B32_WAIT.afterText);
      _clearEnemyAttackTraceCells();
      if (_bs.result) return;
      await _retreatEnemyAfterAttack(enemy, target);
    }
  }   // end _runEnemySingleAction

  // ボス予兆攻撃
  function _doBossWarnAttack(boss, allUnits) {
    _log('⚠️ ボスが予兆攻撃！中央列に霊気爆撃…');
    _bs.bossWarning = true;
    _emit('bossWarning', { bs: _snapshot() });

    const cells = new Set();
    for (let r = 0; r < BOARD_ROWS; r++) {
     [1, 2, 3].forEach(c => cells.add(`${r}-${c}`));
    }
    _bs.allies.forEach(ally => {
      if (ally.hp <= 0) return;
      const key = ally.row + '-' + ally.col;
      if (cells.has(key)) {
        const dmg = Math.floor(getEffectiveAtk(boss) * BOSS_WARN_RATE);
        applyDamage(ally, dmg, boss);
      }
    });
    _bs.bossWarning = false;
  }

  // 毒の継続ダメージ処理
  // 敵ターン開始時に、poison が付与された敵へ使用者ATK × rate のダメージを与える。
  function _applyPoisonTicks() {
    if (!_bs || !_bs.enemies) return;

    _bs.enemies.forEach(enemy => {
      if (!enemy || enemy.hp <= 0) return;
      const effects = Array.isArray(enemy.statusEffects) ? enemy.statusEffects : [];
      const poisons = effects.filter(e => e && e.type === 'poison' && (e.duration || 0) > 0);
      if (poisons.length === 0) return;

      poisons.forEach(poison => {
        const sourceAtk = Number(poison.sourceAtk || 1);
        const rate = Number(poison.rate != null ? poison.rate : 0.25);
        const source = {
          _uid: poison.sourceUid || null,
          name: poison.sourceName || '毒',
          element: poison.sourceElement || null,
          side: 'ally',
          row: enemy.row,
          col: enemy.col,
        };
        const dmg = calcDamage(sourceAtk, rate, enemy, source);
        applyDamage(enemy, dmg, source, {
          id: 'poison',
          name: '毒',
          isUltimate: false,
          hitStyle: 'poison',
        });
        _log(`${enemy.name} は毒で ${dmg} ダメージを受けた`);
      });
    });
  }

  // 状態異常ターン経過処理
  function _tickStatusEffects() {
    const all = getAllUnits();
    all.forEach(u => {
      u.statusEffects = u.statusEffects
        .map(e => {
          if (e && Number(e.appliedTurn) === Number(_bs.turn)) return { ...e };
          return { ...e, duration: e.duration - 1 };
        })
        .filter(e => e.duration > 0);

      // stun / 眠りは duration が残っている限り行動不能を維持する。
      // duration が0になって statusEffects から消えたら解除する。
      u.stunned = u.statusEffects.some(e => e && e.type === 'stun');
    });
  }

  // ============================================================
  // 次ターン開始
  // ============================================================
  function _nextTurn() {
    _bs.turn++;
    _bs.phase = 'skill';

    // 神気リジェネ（生存している味方のみ）
    _bs.allies.forEach(u => {
      if (u.hp > 0) u.shinki = Math.min(u.shinkiMax, u.shinki + 1);
    });

    // 行動フラグリセット
    _bs.allies.forEach(a => {
      a.skillUsedThisTurn = false;
      a.hitAndAwayOrigin = null;
      if (Number(a.hitAndAwayUntilTurn || 0) < Number(_bs.turn)) {
        a.hitAndAwayUntilTurn = 0;
        a.hitAndAwayMoveBonus = 0;
      }
    });

    // 後方互換フラグリセット
    _bs.moveUsedThisTurn  = false;
    _bs.skillUsedThisTurn = false;
    _bs.movedUnitUid      = null;
    _bs.skillUnitUid      = null;
    // 行動権管理リセット
    _bs.actionCount       = 0;
    _bs.actionMax         = 99; // 後方互換用（判定には使わない）
    _bs.lastActionType    = null;
    _bs.lastActionUnitUid = null;
    _bs.unitActionHistory = {};
    _bs.lastAllySkillThisTurn = null;

    // LINK全回復
    // 通常ターン開始時は基本上限に戻す。
    // 星読みなどの遅延支援でLINK+が発動した場合は、この後の allyTurnStart 処理内で
    // そのターンだけ max/current を押し上げ、6以上の一時保有を許可する。
    if (_bs.link) {
      _bs.link.baseMax = calcLinkMax(_bs.turn);
      _bs.link.max = _bs.link.baseMax;
      _bs.link.current = _bs.link.max;
    }

    _applyTurnStartBlessing32();

    // レヴィ「追憶抹消」：発動した次の味方ターン開始時にLINKを減らす。
    // LINK全回復とターン開始加護の処理後に適用し、現在値を0未満にはしない。
    if (_bs.link) {
      const pendingPenalty = Math.max(0, Math.floor(Number(_bs.link.pendingTurnStartPenalty || 0)));
      if (pendingPenalty > 0) {
        const before = Number(_bs.link.current || 0);
        _bs.link.current = Math.max(0, before - pendingPenalty);
        _bs.link.pendingTurnStartPenalty = 0;
        _log(`追憶抹消：ターン開始時 LINK ${before} → ${_bs.link.current}`);
      }
    }

    // TODO: カード廃止後の通常移動処理をここに実装する
    // ※ SUPPORT_CARDS (cards.js) は Battle32 では参照しない。
    //   位置入替はローグライトOPの「布陣入替」として将来実装予定。

    _log(`═══ ターン ${_bs.turn} 開始 ═══`);
    _emit('turnStart', { turn: _bs.turn, bs: _snapshot() });
    _emit('phaseChange', { phase: 'skill', bs: _snapshot() });
    _startAllyTurnFlow();   // ALLY TURN → PLAYER ACTION → 操作解除
    _saveResume();
  }

  // ============================================================
  // ローグライト終了通知ヘルパー（二重呼び出し防止）
  // ============================================================
  function _notifyRogueliteBattleEnd(result, reason) {
  if (!_bs || typeof _bs._rl_onBattleEnd !== 'function') return;

  // 戦闘終了後に危険ターン警告が残らないよう解除する。
  _setTurnDangerAlert(false);

  const cb = _bs._rl_onBattleEnd;
  const aliveAllies = (_bs.allies || []).filter(unit => unit && Number(unit.hp || 0) > 0);
  const payload = {
    result,
    reason: reason || _bs.loseReason || null,
    loseReason: reason || _bs.loseReason || null,
    turn: _bs.turn,
    turnLimit: null,
    aliveCount: aliveAllies.length,
    aliveAllyUids: aliveAllies.map(unit => unit._uid),
  };

  _bs._rl_onBattleEnd = null;  // 二重呼び出し防止

  setTimeout(() => {
    // ローグライト中はここで Battle32 UI を閉じない。
    // ここで closeBattle32UI / cleanupBattle32Overlays を呼ぶと、
    // VICTORY表示前にステージ選択・共通UIが復帰して一瞬見える。
    // 画面を隠すタイミングは RogueliteController 側に任せる。
    cb(payload);
  }, 800);
}

  // ============================================================
  // 勝敗判定
  // ============================================================
  function _checkWinLose() {
    if (_bs.result) return;
    _syncBlessingDefeats32();

    // 勝敗確定時に保存データを削除するヘルパー
    function _clearResume() {
      if (typeof window.clearBattle32ResumeState === 'function') {
        window.clearBattle32ResumeState();
      }
    }

    // ── 敗北条件：エリのロスト ─────────────────
    // 他の味方が倒れても、エリが生存していれば続行する。
    if (isEriLost()) {
      _bs.result = 'lose';
      _bs.loseReason = 'eri_lost';
      _bs.phase = 'end';
      _log('✕ エリがロストした。収容失敗…');
      _clearResume();
      _emit('result', { result: 'lose', reason: _bs.loseReason, bs: _snapshot() });
      _renderUI();
      _notifyRogueliteBattleEnd('lose', _bs.loseReason);
      return;
    }

    // ── 勝利条件 ──────────────────────────────
    // ボスがいるバトル：ボス破壊で勝利
    // ボスがいないバトル：敵全滅で勝利
    if (hasBossInBattle()) {
      if (aliveBosses().length === 0) {
        _bs.result = 'win';
        _bs.phase = 'end';
        _log('★ ボスの破壊に成功！');
        _clearResume();
        _emit('result', { result: 'win', bs: _snapshot() });
        _renderUI();
        _notifyRogueliteBattleEnd('win');
        return;
      }
    } else if (aliveEnemies().length === 0) {
      _bs.result = 'win';
      _bs.phase  = 'end';
      _log('★ 敵群の制圧に成功！');
      _clearResume();
      _emit('result', { result: 'win', bs: _snapshot() });
      _renderUI();
      _notifyRogueliteBattleEnd('win');
      return;
    }

    // ターン制限による敗北は廃止。
  }
  // ============================================================
  // 移動可能セル取得（旧API・後方互換用）
  // UI側の既存呼び出しから段階的に移行するために残す
  // ============================================================
  function getMovableCells(allyUid, _maxSteps) {
    // getMoveCells に委譲して move/capture セルだけ返す
    return getMoveCells(allyUid).map(c => ({ row: c.row, col: c.col }));
  }

  // ============================================================
  // 移動候補セル取得（新API・移動型対応）
  // 戻り値: { row, col, cellType: 'move'|'capture', targetUid: string|null }[]
  // ============================================================
  // [enemy movement unified] 味方・敵共通の移動候補API。
  // MOVE_PRESETS_32 → BR.getMoveOffsets() → ここで盤面ルール適用。
  // 敵AIも UIガイドもこれを参照する。
  function getMoveCells(unitUid) {
    if (!_bs) return [];
    const unit = _bs.allies.find(u => u._uid === unitUid)
              || _bs.enemies.find(u => u._uid === unitUid);

    if (!unit) return [];
    // 敵：通常ボス・moveType:'none' は移動なし。
    // allowBossMovement=true のボスは専用移動レンジを使用できる。
    if (
      unit.side === 'enemy' &&
      ((unit.isBoss && !unit.allowBossMovement) || unit.moveType === 'none')
    ) return [];
    // HP0 の非ボス敵は移動なし
    if (unit.hp <= 0 && !unit.isBoss) return [];

    // 専用候補がある敵はそれを優先。
    // 接近型：前後2・左右1、遠距離型：左右2・前後1などをデータ側で定義できる。
    let offsets = Array.isArray(unit.customMoveOffsets) && unit.customMoveOffsets.length > 0
      ? unit.customMoveOffsets
      : BR.getMoveOffsets(unit);

    // ハヤテ：モード中は8方向への移動距離を+2する。
    // king_8の通常1マスに対し、最大3マス先までを移動候補に追加する。
    if (unit.side === 'ally' && _isHitAndAwayModeActive32(unit)) {
      const maxDistance = 1 + Math.max(0, Number(unit.hitAndAwayMoveBonus || 2));
      const extended = [];
      const directions = [
        { dr:-1, dc:0 }, { dr:1, dc:0 }, { dr:0, dc:-1 }, { dr:0, dc:1 },
        { dr:-1, dc:-1 }, { dr:-1, dc:1 }, { dr:1, dc:-1 }, { dr:1, dc:1 },
      ];
      directions.forEach(dir => {
        for (let distance = 1; distance <= maxDistance; distance++) {
          extended.push({ dr: dir.dr * distance, dc: dir.dc * distance });
        }
      });
      offsets = extended;
    }
    const cells   = [];
    offsets.forEach(({ dr, dc }) => {
      const row = unit.row + dr;
      const col = unit.col + dc;

      if (!BR.isValidCell(row, col)) return;

      const occupant = getAllUnits().find(u => u.hp > 0 && u.row === row && u.col === col);

      // 駒取り廃止：敵味方問わず、ユニットがいるマスには移動不可
      if (occupant) return;

      // ボスのいるマスは進入禁止（HP0後の核露出状態も含む）
      const bossOnCell = _bs.enemies.find(e => e.isBoss && e.row === row && e.col === col);
      if (bossOnCell) return;

      cells.push({
        row,
        col,
        cellType:  'move',
        targetUid: null,
      });
    });

    return cells;
  }

  // ============================================================
  // 味方移動（駒取り廃止・移動1回制限）
  // ============================================================
    function moveAlly(allyUid, toRow, toCol) {
      if (!_bs || _bs.phase !== 'skill') return false;

      const ally = _bs.allies.find(u => u._uid === allyUid);
      if (!ally || ally.hp <= 0) return false;
      if (!_canUsePlayerAction('move', allyUid)) return false;

      const moveCells = getMoveCells(allyUid);
      const targetCell = moveCells.find(c => c.row === toRow && c.col === toCol);

      if (!targetCell) {
        _log(`${ally.name} はそこへ移動できない`);
        return false;
      }

      // 駒取り廃止：最終ガード（getMoveCells で除外済みだが念のため）
      const occupant = getAllUnits().find(u =>
        u &&
        u._uid !== ally._uid &&
        u.hp > 0 &&
        u.row === toRow &&
        u.col === toCol
      );
      if (occupant) {
        _log('ユニットがいるマスには移動できない');
        return false;
      }

      // 念のための直叩き対策：ボスマスへの移動を最終ガード
      const bossAtDest = _bs.enemies.find(e => e.isBoss && e.row === toRow && e.col === toCol);
      if (bossAtDest) {
        _log('ボスのいるマスには移動できない');
        return false;
      }

      // ハヤテ：モード中は、この移動の出発地点を帰還地点として記録する。
      if (_isHitAndAwayModeActive32(ally)) {
        ally.hitAndAwayOrigin = { row: ally.row, col: ally.col, turn: _bs.turn };
      } else {
        ally.hitAndAwayOrigin = null;
      }

      ally.row = toRow;
      ally.col = toCol;
      _log(`${ally.name} が移動した`);
      _emit('move', { ally: { ...ally }, bs: _snapshot() });

      // 行動権を消費（同一キャラは移動1回＋スキル/ULT1回まで）
      _consumePlayerAction('move', allyUid, null);
      _saveResume();
      return true;
    }
  // ============================================================
  // スキル射程ハイライト（UI用）
  // ============================================================
  function getSkillRangeCells(allyUid, skillId) {
    const ally = _bs.allies.find(u => u._uid === allyUid);
    if (!ally) return [];
    const skill = ally.skills.find(s => s.id === skillId);
    if (!skill) return [];

    // 設置系スキルは「通過する射程」ではなく、実際の着弾・設置予定マスを表示する。
    // 例：ロゼは前方2マス先を中心とした横3マス、ミトは前方2マス先の1マス。
    let cells;
    if (skill.type === 'summon_object') {
      const distance = Math.max(1, Number(skill.summonDistance || 2));
      const base = _getForwardCellFromUnit(ally, distance);
      const rawOffsets = Array.isArray(skill.summonOffsets) && skill.summonOffsets.length > 0
        ? skill.summonOffsets
        : [{ dr: 0, dc: 0 }];
      const count = Math.max(1, Number(skill.summonCount || rawOffsets.length || 1));

      cells = new Set();
      rawOffsets.slice(0, count).forEach(offset => {
        const row = Number(base.row) + Number(offset && offset.dr || 0);
        const col = Number(base.col) + Number(offset && offset.dc || 0);
        if (_isInsideBoard(row, col)) {
          cells.add(`${row}-${col}`);
        }
      });
    } else {
      // enemy_all / ally_all は盤面全体ではなく実ユニット位置のみをガイド表示する
      cells = BR.getCellsFromRange32(ally, skill.range);
    }

    console.log('[B32 RangeGuide]', {
      ally: ally.name,
      skill: skill.name,
      range: skill.range,
      type: skill.type,
      cells: Array.from(cells),
    });

    const isEnemyRangeAll = skill.range === 'enemy_all' || skill.range === 'all';
    const isAllyRangeAll  = skill.range === 'ally_all';
    if (isEnemyRangeAll && ['attack', 'debuff'].includes(skill.type)) {
      cells = new Set(
        _bs.enemies
          .filter(u => u.hp > 0)
          .map(u => `${u.row}-${u.col}`)
      );
    } else if (isAllyRangeAll && ['heal', 'buff'].includes(skill.type)) {
      cells = new Set(
        _bs.allies
          .filter(u => u.hp > 0)
          .map(u => `${u.row}-${u.col}`)
      );
    }

    // ユニット位置マップを作成（セル種別判定に使う）
    // HP0の味方・雑魚敵は除外。ボスはHP0後も残す。
    const unitMap = {};
    [
      ..._bs.allies.filter(u => u.hp > 0),
      ..._bs.enemies.filter(u => u.hp > 0 || u.isBoss),
    ].forEach(u => {
      unitMap[`${u.row}-${u.col}`] = u;
    });

    const isEnemySkill = ['attack', 'debuff'].includes(skill.type);
    const isAllySkill  = ['heal', 'buff'].includes(skill.type);

    if (cells.size === 0) return [];

    return Array.from(cells).map(key => {
      const [r, c] = key.split('-').map(Number);
      const unit = unitMap[key] || null;

      // cellType: UIの色分けに使う
      let cellType = 'range';  // 空マス（範囲内）
      if (unit) {
        if (isEnemySkill && unit.side === 'enemy' && unit.hp > 0) {
          cellType = 'target_enemy';
        } else if (isAllySkill && unit.side === 'ally' && unit.hp > 0) {
          cellType = 'target_ally';
        } else {
          cellType = 'range';  // 範囲内だが対象外ユニット
        }
      }

      return { row: r, col: c, cellType };
    });
  }

  // ============================================================
  // キャラ単位のターン終了（スキルなしで行動終了）
  // ============================================================
  // ターン終了（行動終了ボタン：移動のみ・スキルのみ・何もせず全て対応）
  function endCharTurn(_allyUid) {
    if (!_bs || _bs.phase !== 'skill') return false;
    _log('行動終了');
    _emit('charTurnEnd', { bs: _snapshot() });
    endSkillPhase();
    return true;
  }

  // ============================================================
  // 公開API
  // ============================================================
  // ============================================================
  // 危険エリア取得（UI表示専用・攻撃処理は変更しない）
  // ============================================================
  function getBossDangerCells() {
    if (!_bs || _bs.result) return [];
    return Array.isArray(_bs.activeBossDangerCells)
      ? _bs.activeBossDangerCells.map(cell => ({ ...cell }))
      : [];
  }

  // ============================================================
  // 召喚API（ローグライト専用）
  // ============================================================

  // マス占有チェック
  function _isOccupied(row, col) {
    const allUnits = [...(_bs.allies || []), ...(_bs.enemies || []), ...(_bs.summons || [])];
    return allUnits.some(u => (u.hp > 0 || u.isBoss) && u.row === row && u.col === col);
  }

  // 召喚可能なrosterエントリ一覧
  function getSummonableRoster() {
    if (!_bs || !_bs.roster) return [];
    const aliveCount = _bs.allies.filter(a => a.hp > 0).length;
    return _bs.roster.filter(r => r.status === 'standby').map(r => ({
      ...r,
      canSummon: aliveCount < (_bs.deployLimit || 4) && _canSpendLink(LINK_COST.summon[r.rarity] || 1),
    }));
  }

  // 召喚可能マス一覧
  function getSummonCells(rosterId) {
    const result = [];
    for (let row of [6, 7]) {
      for (let col = 0; col < 5; col++) {
        if (_isOccupied(row, col)) continue;
        result.push({ row, col, cellType: 'summon' });
      }
    }
    return result;
  }

  // 召喚実行
  function summonAlly(rosterId, row, col) {
    if (!_bs || _bs.phase !== 'skill' || _bs.result) return false;
    if (!_bs.roster) return false;

    const rEntry = _bs.roster.find(r => r.rosterId === rosterId);
    if (!rEntry || rEntry.status !== 'standby') {
      _log('召喚できません');
      return false;
    }

    const aliveCount = _bs.allies.filter(a => a.hp > 0).length;
    if (aliveCount >= (_bs.deployLimit || 4)) {
      _log(`出撃数が上限（${_bs.deployLimit}体）に達しています`);
      return false;
    }

    const summonCost = LINK_COST.summon[rEntry.rarity] || 1;
    const validCells = getSummonCells(rosterId);
    const isValid = validCells.some(c => c.row === row && c.col === col);
    if (!isValid) {
      _log('そのマスには召喚できません');
      return false;
    }

    if (!_spendLink(summonCost, `${rEntry.name} 召喚`)) return false;

    const unit = makeAlly(rEntry.charDef, row, col);
    _applyBlessingHpPassive32(unit);
    _applyRogueliteOptionsToUnit(unit);
    _bs.allies.push(unit);
    rEntry.status = 'deployed';
    rEntry.deployedUid = unit._uid;

    _log(`${rEntry.name} が召喚された！`);
    _emit('summon', { unit: { ...unit }, bs: _snapshot() });
    _renderUI();
    _saveResume();
    return true;
  }

  // ============================================================
  // アイテムAPI（ローグライト専用）
  // ============================================================

  function getItems() {
    if (!_bs) return [];
    return (_bs.items || []).map((item, idx) => ({ ...item, slotIndex: idx }));
  }

  function useItem(itemSlotIndex, payload) {
    if (!_bs || _bs.phase !== 'skill' || _bs.result) return false;
    if (!_bs.items) return false;

    const item = _bs.items[itemSlotIndex];
    if (!item) {
      _log('アイテムがありません');
      return false;
    }
    if (item.used) {
      _log('このアイテムはすでに使用済みです');
      return false;
    }

    const linkCost = item.linkCost != null ? item.linkCost : LINK_COST.itemDefault;
    if (!_canSpendLink(linkCost)) {
      _log(`LINKが不足しています（必要: ${linkCost}）`);
      return false;
    }

    function consumeItem() {
      if (!item.consume) return;

      const removed = _bs.items.splice(itemSlotIndex, 1)[0] || item;

      // ローグライトでは、Battle32内の一時アイテムだけでなく、
      // ラン本体の所持アイテムからも消す。
      // これをしないと、次ステージ開始時に RogueliteRun.buildBattleConfig()
      // が同じアイテムを再配布してしまい、使用済みアイテムが復活する。
      if (
        _bs.isRoguelite &&
        window.RogueliteRun &&
        typeof window.RogueliteRun.consumeItem === 'function'
      ) {
        window.RogueliteRun.consumeItem(itemSlotIndex, removed);
      }
    }

    function getLiveAlly(uid) {
      return _bs.allies.find(u => u._uid === uid && u.hp > 0) || null;
    }

    function getLiveEnemy(uid) {
      return _bs.enemies.find(u => u._uid === uid && u.hp > 0) || null;
    }

    function swapPositions(a, b) {
      const ar = a.row;
      const ac = a.col;
      a.row = b.row;
      a.col = b.col;
      b.row = ar;
      b.col = ac;
    }

    // アイテムタイプ別処理
    if (item.type === 'heal') {
      const targetUid = payload && payload.targetUid;
      const target = getLiveAlly(targetUid);
      if (!target) {
        _log('回復対象がいません');
        return false;
      }
      _spendLink(linkCost, item.name);
      const healAmount = Math.max(1, Math.round(target.hpMax * (item.value || 0.3)));
      const before = target.hp;
      target.hp = Math.min(target.hpMax, target.hp + healAmount);
      const actual = target.hp - before;
      _log(`${item.name}：${target.name} のHPを ${actual} 回復！`);
      _emit('heal', {
        source: null, target: { _uid: target._uid, name: target.name, side: 'ally', row: target.row, col: target.col },
        amount: actual, kind: 'heal', skillId: null, skillName: item.name,
        isUltimate: false, hitStyle: 'normal', bs: _snapshot(),
      });
      consumeItem();

    } else if (item.type === 'move_ally') {
      const targetUid = payload && payload.targetUid;
      const toRow = payload && payload.toRow;
      const toCol = payload && payload.toCol;
      const target = getLiveAlly(targetUid);
      if (!target) { _log('移動対象がいません'); return false; }
      if (toRow == null || toCol == null) { _log('移動先が指定されていません'); return false; }

      if (_isOccupied(toRow, toCol) && !(target.row === toRow && target.col === toCol)) { _log('そのマスは占有されています'); return false; }
      if (toRow < 0 || toRow >= BOARD_ROWS || toCol < 0 || toCol >= BOARD_COLS) { _log('盤面外には移動できません'); return false; }

      _spendLink(linkCost, item.name);
      target.row = toRow;
      target.col = toCol;
      _log(`${item.name}：${target.name} を移動`);
      _emit('move', { ally: { ...target }, bs: _snapshot() });
      consumeItem();

    } else if (item.type === 'swap_ally') {
      const a = getLiveAlly(payload && payload.targetAUid);
      const b = getLiveAlly(payload && payload.targetBUid);
      if (!a || !b || a._uid === b._uid) { _log('入れ替える味方2体を選択してください'); return false; }

      _spendLink(linkCost, item.name);
      swapPositions(a, b);
      _log(`${item.name}：${a.name} と ${b.name} の位置を入れ替えた`);
      _emit('move', { ally: { ...a }, bs: _snapshot() });
      consumeItem();

    } else if (item.type === 'swap_enemy') {
      const a = getLiveEnemy(payload && payload.targetAUid);
      const b = getLiveEnemy(payload && payload.targetBUid);
      if (!a || !b || a._uid === b._uid) { _log('入れ替える敵2体を選択してください'); return false; }

      _spendLink(linkCost, item.name);
      swapPositions(a, b);
      _log(`${item.name}：${a.name} と ${b.name} の位置を入れ替えた`);
      _emit('move', { enemy: { ...a }, bs: _snapshot() });
      consumeItem();

    } else if (item.type === 'link_recover') {
      if (!_bs.link) { _log('LINKがありません'); return false; }
      _spendLink(linkCost, item.name);
      const add = Math.max(0, Math.floor(Number(item.value || 0)));
      const before = Number(_bs.link.current || 0);
      const after = before + add;
      // LINK回復アイテムも、最大値時に無駄撃ちにならないよう一時的に上限突破を許可する。
      const baseMax = Number(_bs.link.max || before);
      _bs.link.max = Math.max(baseMax, after);
      _bs.link.current = after;
      _bs.link.overCapUntilTurnEnd = _bs.link.max > Number(_bs.link.baseMax || calcLinkMax(_bs.turn));
      _log(`${item.name}：LINK ${before} → ${_bs.link.current}`);
      consumeItem();

    } else if (item.type === 'shinki_max') {
      const target = getLiveAlly(payload && payload.targetUid);
      if (!target) { _log('神気ブースト対象がいません'); return false; }
      _spendLink(linkCost, item.name);
      target.shinki = target.shinkiMax || target.shinki || 0;
      _log(`${item.name}：${target.name} の神気がMAXになった`);
      consumeItem();

    } else if (item.type === 'enemy_hp_cut_all') {
      const enemies = (_bs.enemies || []).filter(e => e && e.hp > 0);
      if (!enemies.length) { _log('対象の敵がいません'); return false; }
      _spendLink(linkCost, item.name);
      const rate = Math.max(0, Math.min(1, Number(item.value || 0.10)));
      enemies.forEach(enemy => {
        const dmg = Math.max(1, Math.floor(enemy.hp * rate));
        applyDamage(enemy, dmg, { name: item.name, side: 'ally', element: null, row: enemy.row, col: enemy.col }, {
          id: item.id,
          name: item.name,
          isUltimate: false,
          canCritical: false,
          hitStyle: 'item',
        });
      });
      _log(`${item.name}：フィールド上の全敵のHPを${Math.round(rate * 100)}%削った`);
      consumeItem();


    } else if (item.type === 'critical_up' || item.type === 'crit_up') {
      const target = item.target === 'ally_all'
        ? null
        : getLiveAlly(payload && payload.targetUid);
      const targets = item.target === 'ally_all'
        ? (_bs.allies || []).filter(u => u && u.hp > 0)
        : (target ? [target] : []);
      if (!targets.length) { _log('クリティカル上昇対象がいません'); return false; }
      _spendLink(linkCost, item.name);
      const amount = Math.max(0, Math.min(1, Number(item.value ?? item.rate ?? 0.10)));
      targets.forEach(t => {
        const base = Number(t.criticalRate ?? t.critRate ?? DEFAULT_ALLY_CRITICAL_RATE_32);
        t.criticalRate = Math.max(0, Math.min(1, base + amount));
        t.critRate = t.criticalRate;
        if (!Array.isArray(t.statusEffects)) t.statusEffects = [];
        const applied = { type: 'critical_up', rate: amount, duration: item.duration || 1, sourceName: item.name };
        t.statusEffects.push(applied);
        _emitStatusChange32(t, applied, { name: item.name, side: 'ally', row: t.row, col: t.col }, 'item');
      });
      _log(`${item.name}：${targets.map(t => t.name).join('・')} のクリティカル率+${Math.round(amount * 100)}%`);
      consumeItem();

    } else if (item.type === 'atk_up') {
      const target = item.target === 'ally_all'
        ? null
        : getLiveAlly(payload && payload.targetUid);
      const targets = item.target === 'ally_all'
        ? (_bs.allies || []).filter(u => u && u.hp > 0)
        : (target ? [target] : []);
      if (!targets.length) { _log('ATK上昇対象がいません'); return false; }
      _spendLink(linkCost, item.name);
      const raw = Number(item.value ?? item.rate ?? 0.20);
      const rate = raw > 1 ? raw : 1 + raw;
      targets.forEach(t => {
        if (!Array.isArray(t.statusEffects)) t.statusEffects = [];
        const applied = { type: 'atk_up', rate, duration: item.duration || 1, sourceName: item.name };
        t.statusEffects.push(applied);
        _emitStatusChange32(t, applied, { name: item.name, side: 'ally', row: t.row, col: t.col }, 'item');
      });
      _log(`${item.name}：${targets.map(t => t.name).join('・')} のATK+${Math.round((rate - 1) * 100)}%`);
      consumeItem();

    } else if (item.type === 'hp_up') {
      const target = item.target === 'ally_all'
        ? null
        : getLiveAlly(payload && payload.targetUid);
      const targets = item.target === 'ally_all'
        ? (_bs.allies || []).filter(u => u && u.hp > 0)
        : (target ? [target] : []);
      if (!targets.length) { _log('HP上昇対象がいません'); return false; }
      _spendLink(linkCost, item.name);
      const amount = Math.max(0, Number(item.value ?? item.rate ?? 0.20));
      targets.forEach(t => {
        const bonus = Math.max(1, Math.round(Number(t.hpMax || 1) * amount));
        t.hpMax += bonus;
        t.hp = Math.min(t.hpMax, Number(t.hp || 0) + bonus);
        if (!Array.isArray(t.statusEffects)) t.statusEffects = [];
        const applied = { type: 'hp_up', rate: amount, duration: item.duration || 1, sourceName: item.name };
        t.statusEffects.push(applied);
        _emitStatusChange32(t, applied, { name: item.name, side: 'ally', row: t.row, col: t.col }, 'item');
      });
      _log(`${item.name}：${targets.map(t => t.name).join('・')} の最大HP+${Math.round(amount * 100)}%`);
      consumeItem();

    } else if (item.type === 'guard') {
      const target = getLiveAlly(payload && payload.targetUid);
      if (!target) { _log('ガード対象がいません'); return false; }
      _spendLink(linkCost, item.name);
      if (!Array.isArray(target.statusEffects)) target.statusEffects = [];
      target.statusEffects = target.statusEffects.filter(e => e && e.type !== 'damage_cut');
      const rate = Math.max(0, Math.min(0.95, Number(item.value || 0.5)));
      const applied = { type: 'damage_cut', rate, duration: item.duration || 1, sourceName: item.name };
      target.statusEffects.push(applied);
      _log(`${item.name}：${target.name} が1ターン、ダメージ${Math.round(rate * 100)}%カット`);
      _emitStatusChange32(target, applied, { name: item.name, side: 'ally', row: target.row, col: target.col }, 'item');
      consumeItem();

    } else if (item.type === 'stun_enemy') {
      const target = getLiveEnemy(payload && payload.targetUid);
      if (!target || target.hp <= 0) { _log('スタン対象がいません'); return false; }
      _spendLink(linkCost, item.name);
      target.stunned = true;
      if (!Array.isArray(target.statusEffects)) target.statusEffects = [];
      const applied = { type: 'stun', duration: item.duration || 1, sourceName: item.name };
      target.statusEffects.push(applied);
      _log(`${item.name}：${target.name} をスタンした`);
      _emitStatusChange32(target, applied, { name: item.name, side: 'ally', row: target.row, col: target.col }, 'item');
      consumeItem();

    } else {
      _log(`未対応のアイテムタイプ: ${item.type}`);
      return false;
    }

    _emit('playerActionConsumed', { type: 'item', bs: _snapshot() });
    _renderUI();
    _saveResume();
    return true;
  }

function restore(savedState, callbacks) {
  if (!savedState) return false;

  _cb = callbacks || {};

  _battleFlowToken++;
  _allyTurnFlowRunning = false;
  _enemyTurnFlowRunning = false;

  _bs = deepClone(savedState);

  // JSON保存では関数が消えるため、ローグライト終了コールバックを再接続する。
  const resumeBattleEnd =
    callbacks && typeof callbacks.rogueliteOnBattleEnd === 'function'
      ? callbacks.rogueliteOnBattleEnd
      : callbacks && typeof callbacks.onBattleEnd === 'function'
        ? callbacks.onBattleEnd
        : window.RogueliteController &&
          typeof window.RogueliteController._createResumeBattleEndCallback === 'function'
          ? window.RogueliteController._createResumeBattleEndCallback()
          : null;

  if (typeof resumeBattleEnd === 'function') {
    _bs._rl_onBattleEnd = resumeBattleEnd;
  }

  // 演出途中の一時状態は保存値を使わず、安定状態へ戻す。
  _bs.activeEnemyUid = null;
  _bs.enemyActionOrder = [];
  _bs.enemyActionIndex = 0;
  _bs.enemyActionTotal = 0;
  _bs.bossWarning = false;
  _bs.attackTraceCells = [];
  _bs.enemyAttackTraceCells = [];

  if (typeof window.resetBattle32UIAfterRestore === 'function') {
    try {
      window.resetBattle32UIAfterRestore();
    } catch (e) {
      console.warn('[Battle32] restore UI reset error:', e);
    }
  }

  // 旧保存データには combo が含まれていない場合があるため、
  // CHARACTERS_32 のマスターからキャラIDを使って復元する。
  const comboMasterList = Array.isArray(window.CHARACTERS_32) ? window.CHARACTERS_32 : [];
  if (Array.isArray(_bs.allies)) {
    _bs.allies.forEach(unit => {
      if (!unit || unit.combo) return;
      const master = comboMasterList.find(c => c && Number(c.id) === Number(unit.id));
      if (master && master.combo) unit.combo = deepClone(master.combo);
    });
  }

  if (_bs.result) {
    _bs.phase = 'end';
  } else if (_bs.phase !== 'skill' && _bs.phase !== 'enemy') {
    _bs.phase = 'skill';
  }

  // 勝敗確定直前の中断も救済し、ステージ進行通知まで復元する。
  if (!_bs.result) {
    _checkWinLose();
  }

  _renderUI();
  _emit('restore', { phase: _bs.phase, bs: _snapshot() });
  _emit('phaseChange', { phase: _bs.phase, restored: true, bs: _snapshot() });

  if (_bs.result) {
    if (typeof _bs._rl_onBattleEnd === 'function') {
      _notifyRogueliteBattleEnd(_bs.result, _bs.loseReason || null);
    }
    return true;
  }

  // DOMとイベントの再構築後に、保存フェーズから進行を再始動する。
  setTimeout(() => {
    if (!_bs || _bs.result) return;

    if (_bs.phase === 'enemy') {
      _runEnemyTurnFlow();
      return;
    }

    _unlockInput();
    _renderUI();
    _saveResume();
  }, 0);

  return true;
}

window.Battle32 = {
  start,
  restore,

  endSkillPhase,
  endCharTurn,

  executeAllySkill,
  executeComboSkill,
  moveAlly,

  getSummonableRoster,
  getSummonCells,
  summonAlly,

  getItems,
  useItem,
  activateBlessingInv,
  getBlessingInvTargets,

  getMoveCells,
  getMovableCells,
  getEnemyMoveCells,
  getSkillRangeCells,
  getBossDangerCells,
  getLinkCostForAction: (type, unitUid, skillId) => _getLinkCostForAction(type, unitUid, skillId),
  getElementRate: getElementRate32,
  getElementLabel: getElementLabel32,
  getElementKey: getElementKey32,
  normalizeElements: normalizeElements32,

  getState: () => _bs ? _snapshot() : null,
  getBS: () => _bs,
};

    })();
