// battle_32.js
// 32マス共有盤面バトルシステム（MVP）
// 依存: battle_range_32.js, characters_32.js
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

  function getElementRate32(sourceElement, targetElement) {
    const s = sourceElement || null;
    const t = targetElement || null;
    if (!s || !t) return 1.0;
    return (ELEMENT_RATE_32[s] && ELEMENT_RATE_32[s][t]) || 1.0;
  }

  function getElementLabel32(element) {
    return ELEMENT_LABEL_32[element] || element || '無属性';
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

  

  // ============================================================
  // 内部状態
  // ============================================================
  let _bs = null;   // バトルステート
  let _cb = null;   // コールバック群

  // ターン演出・フェーズ進行の二重起動防止
  let _allyTurnFlowRunning = false;
  let _enemyTurnFlowRunning = false;
  let _battleFlowToken = 0;
 
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
      return window.applyLimitBreakStats(baseStats, lb, rarity);
    }

    // fallback: 所持データのstatsを使う。
    if (ownedEntry.stats) return ownedEntry.stats;

    return null;
  }

  function _applyOwnedStatsToCharDef(charDef) {
    if (!charDef) return null;

    const c = deepClone(charDef);
    const owned = _getOwnedEntryForBattle(c.id);
    if (!owned) return c;

    const ownedStats = _calcOwnedStatsForBattle(c, owned);
    if (!ownedStats) return c;

    const hp  = Number(ownedStats.HP ?? ownedStats.hp ?? c.hp);
    const atk = Number(ownedStats.ATK ?? ownedStats.atk ?? c.atk);

    if (Number.isFinite(hp) && hp > 0) c.hp = Math.floor(hp);
    if (Number.isFinite(atk) && atk > 0) c.atk = Math.floor(atk);

    // UI/デバッグ用に共鳴情報も持たせる
    c.limitBreak = Number(owned.limitBreak || 0);
    c.ownedStatsApplied = true;

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

  // 状態異常込みのATKを返す。
  // atk_up / atk_down は effects[] の rate で倍率指定可能。
  // 例: { type:'atk_up', rate:1.5 } / { type:'atk_down', rate:0.7 }
  function getEffectiveAtk(unit) {
    if (!unit) return 1;
    let atk = Number(unit.atk || 1);
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
      shinki:    charDef.shinkiStart,
      shinkiMax: charDef.shinkiMax,
      row,
      col,
      skills: charDef.skills,

      // 盤面用
      img:          charDef.battleBackImg || charDef.battleImg || charDef.img || null,
      battleImg:    charDef.battleImg     || charDef.img       || null,
      battleBackImg: charDef.battleBackImg || null,

      // 下部パネル用
      panelImg: charDef.panelImg || charDef.upImg || charDef.img || null,

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
    return {
      _uid: uid(),
      id: def.id,
      name: def.name,
      element: def.element || 'chaos',
      side: 'enemy',

      img: def.battleImg || def.img || def.upImg || null,
      battleImg: def.battleImg || def.img || null,
      upImg: def.upImg || null,
      cutin: def.cutin || def.ultImg || def.cutImg || null,

      isBoss:    !!def.isBoss,
      isMidBoss: !!def.isMidBoss,
      hp: def.hp,
      hpMax: def.hpMax || def.hp,
      atk: def.atk,
      // damageTakenRate: 敵の硬さを表現（省略時 1.0）
      damageTakenRate: def.damageTakenRate ?? 1.0,
      row,
      col,
      statusEffects: [],
      stunned: false,
      attackRange: def.attackRange || (def.isBoss ? 'enemy_attack_cross' : 'enemy_attack_front'),
      moveType:    def.moveType    || (def.isBoss ? 'none' : 'enemy_move_straight'),
      uiScale:     def.uiScale    || {},
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

  if (def.isBoss) {
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

      delayedActions: [],

      // ── LINK システム ──
      link: {
        current: calcLinkMax(1),
        max: calcLinkMax(1),
        cap: 6,
      },

      // ── ローグライト: ロスター（5体持ち込み）──
      roster: rosterData,
      deployLimit: 4,

      // ── ローグライト: アイテム2枠 ──
      items: Array.isArray(config.rogueliteItems) ? config.rogueliteItems.slice(0, 2) : [],

      // コア概念は廃止。敗北条件はエリのロスト / タイムオーバー。
      cores: null,
      bossCore: null,

      turnLimit: config.turnLimit ?? 12,

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

    // ── ローグライトOP開始時補正を適用 ──────────────────────
    // applyOnStart(_bs) は _bs を直接書き換える
    // （HP/ATK/コア耐久などを補正後に _emit('start') でスナップショットを取るため、
    //   _bs 構築直後かつ emit より前に呼ぶ）
    _applyRogueliteOnStart();

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

    const remainTurns = Math.max(0, Number(_bs.turnLimit || 0) - Number(_bs.turn || 0) + 1);
    const isTurnDanger = remainTurns <= 3;
    const turnSub = isTurnDanger ? `残り ${remainTurns} TURN` : 'PLAYER ACTION';

    // 残り3ターン以下は、次のターン/戦闘終了まで画面フチを赤く点滅させる。
    _setTurnDangerAlert(isTurnDanger);

    await _centerTextWaitTurn(`TURNS ${_bs.turn}/${_bs.turnLimit}`, turnSub, B32_WAIT.turn, isTurnDanger);

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

      delayedActions: _bs.delayedActions ? _bs.delayedActions.map(a => ({ ...a })) : [],

      isRoguelite: !!_bs.isRoguelite,
      cores: null,
      bossCore: null,
      turnLimit: _bs.turnLimit,
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
    };
  }

  function _emit(event, data) {
    if (_cb && typeof _cb[event] === 'function') {
      _cb[event](data);
    }
  }

  function _log(msg) {
    _bs.log.push(msg);
    _emit('log', { msg, bs: _snapshot() });
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

    let dmg = rawDamage;

    // 結界：ダメージ軽減（味方のみ）
    if (target.side === 'ally' && target.shieldRate > 0) {
      dmg = Math.floor(dmg * (1 - target.shieldRate));
      target.shieldRate = 0;
      _log(`${target.name} の結界が発動！ダメージを軽減`);
    }

    target.hp = Math.max(0, target.hp - dmg);
    const elementText = source ? getElementMatchText32(source.element, target.element) : '';
    const elementSuffix = elementText ? `【${elementText}】` : '';
    _log(`${source ? source.name : '？'} → ${target.name} に ${dmg} ダメージ！${elementSuffix}（残HP: ${target.hp}）`);

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
         },

      amount: dmg,
      kind: 'damage',

      elementMatch: elementText || '',
      elementRate: source ? getElementRate32(source.element, target.element) : 1.0,
      sourceElement: source ? source.element : null,
      targetElement: target ? target.element : null,

      skillId:     skill?.id        || null,
      skillName:   skill?.name      || null,
      isUltimate:  !!skill?.isUltimate,
      hitStyle:    skill?.hitStyle  || 'normal',
      bs: _snapshot(),
    });

    // ダメージ後に勝敗を即チェック
    _checkWinLose();
  }

function _queueDelayedAttack(ally, skill) {
  if (!_bs.delayedActions) _bs.delayedActions = [];

  const delayTurns = Number(skill.delayTurns || 2);

  _bs.delayedActions.push({
    id: uid(),
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

  // ============================================================
  // スキル実行（味方）
  // ============================================================
  function executeAllySkill(allyUid, skillId) {
    if (_bs.phase !== 'skill') {
      _log('スキルフェーズではありません');
      return false;
    }

    const ally = _bs.allies.find(u => u._uid === allyUid);
    if (!ally || ally.hp <= 0) return false;

    const skill = ally.skills.find(s => s.id === skillId);
    if (!skill) return false;

    // ULTかどうかでLINK判定タイプを切り替え
    const actionType = skill.isUltimate ? 'ult' : 'skill';
    if (!_canUsePlayerAction(actionType, allyUid, skillId)) return false;

    if ((skill.shinkiCost || 0) > ally.shinki) {
      _log(`${ally.name}: 神気が不足しています`);
      return false;
    }

    _log(`${ally.name} が「${skill.name}」を発動！`);

    // ── 対象解決ヘルパー（スコープ内ローカル） ──
    const _enemyTargets = (rangeKey) =>
      BR.getUnitsFromRange32(ally, rangeKey, _bs.enemies).filter(u => u.hp > 0);
    const _allyTargets = (rangeKey) =>
      (rangeKey === 'self'
        ? [ally]
        : BR.getUnitsFromRange32(ally, rangeKey, _bs.allies).filter(u => u.hp > 0));

    const stype = skill.type;
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

// ── delayed_attack：未来予約攻撃 ─────────────────────────────
} else if (stype === 'delayed_attack') {
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

      const targets = _enemyTargets(skill.range);
      if (targets.length === 0) {
        noTargets = true;
        _log(`${ally.name}：範囲内に敵がいません`);
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
    });
  }

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

    // リプレイ不成立だけはスキル消費せず選び直せるようにする
if (noTargets && skill.type === 'repeat_skill') {
  _log('→ スキル選択に戻ります');
  return false;
}

    ally.shinki -= (skill.shinkiCost || 0);

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
  skill.type !== 'delayed_attack' &&
  !skill.isUltimate
) {
  _bs.lastAllySkillThisTurn = {
    ownerUid: ally._uid,
    ownerName: ally.name,
    skill: deepClone(skill),
  };
}

_emit('allyAction', { ally: { ...ally }, skill, bs: _snapshot() });

// 行動権を消費（LINKも消費される）
_consumePlayerAction(actionType, allyUid, skillId);

// 勝敗未確定のときだけ保存
if (!_bs.result) {
  _saveResume();
}

return true;
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
        target.statusEffects.push({ type: 'stun', duration: eff.duration || 1 });
        _log(`${target.name} はスタンした`);
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
        target.statusEffects.push({
          type: 'poison',
          duration: eff.duration || 2,
          rate: eff.rate != null ? Number(eff.rate) : 0.25,
          sourceAtk: source ? getEffectiveAtk(source) : 1,
          sourceName: source ? source.name : '毒',
          sourceUid: source ? source._uid : null,
          sourceElement: source ? source.element : null,
        });
        _log(`${target.name} は毒に侵された（${eff.duration || 2}T）`);
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
        if (existing) {
          existing.duration = Math.max(existing.duration || 0, eff.duration || 2);
          existing.counterMultiplier = eff.counterMultiplier != null ? Number(eff.counterMultiplier) : 1.0;
        } else {
          target.statusEffects.push({
            type: 'yoi_no_sousou',
            duration: eff.duration || 2,
            counterMultiplier: eff.counterMultiplier != null ? Number(eff.counterMultiplier) : 1.0,
          });
        }
        _log(`${target.name} は「酔ノ想葬」に入った（${eff.duration || 2}T）`);
        return;
      }

      const hitRate = eff.hit != null ? eff.hit : 100;
      if (Math.random() * 100 > hitRate) {
        _log(`${target.name} に ${eff.type} — 外れ`);
        return;
      }
      target.statusEffects.push({
        type:     eff.type,
        duration: eff.duration || 1,
        rate:     eff.rate,
      });
      _log(`${target.name} に ${eff.type} を付与（${eff.duration || 1}T）`);
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
            return Number.isFinite(n) ? Math.max(0, n) : (type === 'ult' ? LINK_COST.ult : LINK_COST.skill);
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

    function getEnemyAttackTargets(enemy) {
      const range = enemy.attackRange || 'enemy_attack_front';

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

  // 味方への強攻撃
  _bs.allies.forEach(ally => {
    if (ally.hp <= 0) return;

    const key = `${ally.row}-${ally.col}`;
    if (!cells.has(key)) return;

    const dmg = Math.floor(boss.atk * BOSS_LINE_ATTACK_RATE);
    applyDamage(
      ally,
      dmg,
      boss,
      {
        id: 'boss_line_attack',
        name: '空間断裂',
        isUltimate: true,
        hitStyle: 'heavy',
      }
    );
  });

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

    // ステージ設定に応じた敵スポーン（ordered 作成前に呼び、即行動させる）
    _spawnEnemyFromConfig();

    // ボス予兆攻撃（行動ループより先に発動）
    if (_bs.turn % BOSS_WARN_INTERVAL === 0) {
      const boss = _bs.enemies.find(u => u.isBoss && u.hp > 0);
      if (boss) {
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

      if (boss) {
        await _centerTextWait('⚠️ SPACE SHIFT', '空間干渉：位置入れ替え', B32_WAIT.enemyAction);

        doBossSwapAttack(boss);

        _renderUI();
        await wait(B32_WAIT.attack);
        await wait(B32_WAIT.afterText);

        if (_bs.result) return;
      }
    }
    // 行動順：雑魚 → ボスの順
    const mobs    = aliveEnemies().filter(e => !e.isBoss);
    const bosses  = aliveEnemies().filter(e =>  e.isBoss);

    const ordered = [...mobs, ...bosses];

    // 敵行動数を制御（'all' または未設定なら全員行動）
    let actors = ordered;
    if (_bs.enemyActionMode !== 'all' && Number.isFinite(_bs.enemyActionsPerTurn)) {
      actors = ordered.slice(0, _bs.enemyActionsPerTurn);
    }

    for (const enemy of actors) {
      if (_bs.result) break;
      await _runEnemySingleAction(enemy);
      if (_bs.result) break;
    }

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

    // 他の敵がいれば進入禁止
    if (occupant && occupant.side === 'enemy') return false;

    // 味方がいれば「駒取り」として許可
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


  // 敵1体の行動処理（_centerTextWait で完全に消えてから次へ）
  async function _runEnemySingleAction(enemy) {
    const actionLabel = enemy.isBoss ? 'BOSS ACTION' : 'ENEMY ACTION';

    // スタン
    if (enemy.stunned) {
      _log(`${enemy.name} はスタン中のため行動できない`);
      enemy.stunned = false;
      //await _centerTextWait(enemy.name, 'NO ACTION', B32_WAIT.enemyAction);
      _renderUI();
      return;
    }

    const rangeTargets = getEnemyAttackTargets(enemy);

    if (rangeTargets.length > 0) {
      // 射程内に味方がいる → ボス/特殊敵はエリ優先、通常敵は最も近い味方を攻撃
      const target = _pickEnemyAttackTarget(enemy, rangeTargets);
      if (!target) return;
      const dmg = calcDamage(getEffectiveAtk(enemy), 1.0, target, enemy);
      applyDamage(target, dmg, enemy);
      _renderUI();
      await wait(B32_WAIT.afterText);
      // applyDamage 内で _checkWinLose を呼んでいるが、念のため result を確認
      if (_bs.result) return;
      return;
    }

    // ボスは固定（射程外でも移動しない）
    if (enemy.isBoss) {
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
    enemy.row = bestCell.row;
    enemy.col = bestCell.col;
    _log(`${enemy.name} が移動した`);
    _renderUI();
    await wait(B32_WAIT.afterText);

    // 移動後に攻撃可能か再チェック
    const afterMoveTargets = getEnemyAttackTargets(enemy);
    if (afterMoveTargets.length > 0) {
      const target = _pickEnemyAttackTarget(enemy, afterMoveTargets);
      if (!target) return;
      const dmg = calcDamage(getEffectiveAtk(enemy), 1.0, target, enemy);
      applyDamage(target, dmg, enemy);
      _renderUI();
      await wait(B32_WAIT.afterText);
      if (_bs.result) return;
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
        .map(e => ({ ...e, duration: e.duration - 1 }))
        .filter(e => e.duration > 0);

      // stunned フラグはここで変更しない。
      // 付与時に即 true を立て、行動スキップした瞬間に false に戻す。
      // statusEffects から stun が消えたときだけ、念のため false に揃える
      // （スキップせずターンが終わった場合の安全弁）。
      if (!u.statusEffects.some(e => e.type === 'stun')) {
        u.stunned = false;
      }
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
    _bs.allies.forEach(a => { a.skillUsedThisTurn = false; });

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
    if (_bs.link) {
      _bs.link.max = calcLinkMax(_bs.turn);
      _bs.link.current = _bs.link.max;
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
  const payload = {
    result,
    reason: reason || _bs.loseReason || null,
    loseReason: reason || _bs.loseReason || null,
    turn: _bs.turn,
    turnLimit: _bs.turnLimit,
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

    // ── 敗北条件：ターン経過によるタイムオーバー ───────
    if (_bs.turn >= _bs.turnLimit) {
      _bs.result = 'lose';
      _bs.loseReason = 'turn_over';
      _bs.phase = 'end';
      _log('✕ 接続限界を超過。強制帰還…');
      _clearResume();
      _emit('result', { result: 'lose', reason: _bs.loseReason, bs: _snapshot() });
      _renderUI();
      _notifyRogueliteBattleEnd('lose', _bs.loseReason);
      return;
    }
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
    // 敵：ボス・moveType:'none' は移動なし
    if (unit.side === 'enemy' && (unit.isBoss || unit.moveType === 'none')) return [];
    // HP0 の非ボス敵は移動なし
    if (unit.hp <= 0 && !unit.isBoss) return [];

    const offsets = BR.getMoveOffsets(unit);
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

    // enemy_all / ally_all は盤面全体ではなく実ユニット位置のみをガイド表示する
    let cells = BR.getCellsFromRange32(ally, skill.range);

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
    if (!_bs || _bs.result || _bs.phase !== 'skill') return [];

    // ボスが生存している場合のみ（HP0後の核露出状態は除く）
    const boss = _bs.enemies.find(e => e.isBoss && e.hp > 0);
    if (!boss) return [];

    const result = [];

    // ── 3ターンごとの入れ替え攻撃予告 ──
    if (_bs.turn % BOSS_SWAP_INTERVAL === 0) {
      // 入れ替えは対象がランダムのため盤面セルでの事前予告はなし
      // (boss_warn 系の表示は予兆攻撃と重複するため省略)
    }

    // ── 4ターンごとの予兆攻撃（中央3列・全行） ──
    // _doBossWarnAttack の col [1,2,3] と完全に一致させる
    if (_bs.turn % BOSS_WARN_INTERVAL === 0) {
      for (let r = 0; r < BOARD_ROWS; r++) {
        [1, 2, 3].forEach(c => {
          result.push({ row: r, col: c, type: 'boss_warn', label: 'WARNING' });
        });
      }
    }

    // ── 通常攻撃範囲（特殊攻撃がないターンのみ） ──
    if (result.length === 0) {
      const range = boss.attackRange || 'manhattan_4';
      // manhattan_N 形式：手動でマンハッタン距離計算
      const m = /^manhattan_(\d+)$/.exec(range);
      if (m) {
        const maxDist = Number(m[1]);
        for (let r = 0; r < BOARD_ROWS; r++) {
          for (let c = 0; c < BOARD_COLS; c++) {
            const dist = Math.abs(r - boss.row) + Math.abs(c - boss.col);
            if (dist > 0 && dist <= maxDist) {
              result.push({ row: r, col: c, type: 'boss_normal', label: 'DANGER' });
            }
          }
        }
      } else if (BR && BR.getCellsFromRange32) {
        const cells = BR.getCellsFromRange32(boss, range);
        if (cells && cells.forEach) {
          cells.forEach(key => {
            const [row, col] = key.split('-').map(Number);
            result.push({ row, col, type: 'boss_normal', label: 'DANGER' });
          });
        }
      }
    }

    return result;
  }

  // ============================================================
  // 召喚API（ローグライト専用）
  // ============================================================

  // マス占有チェック
  function _isOccupied(row, col) {
    const allUnits = [..._bs.allies, ..._bs.enemies];
    return allUnits.some(u => u.hp > 0 && u.row === row && u.col === col);
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

    // アイテムタイプ別処理
    if (item.type === 'heal') {
      // 対象: payload.targetUid
      const targetUid = payload && payload.targetUid;
      const target = _bs.allies.find(u => u._uid === targetUid && u.hp > 0);
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
      if (item.consume) _bs.items.splice(itemSlotIndex, 1);

    } else if (item.type === 'move_ally') {
      // 対象: payload.targetUid, payload.toRow, payload.toCol
      const targetUid = payload && payload.targetUid;
      const toRow = payload && payload.toRow;
      const toCol = payload && payload.toCol;
      const target = _bs.allies.find(u => u._uid === targetUid && u.hp > 0);
      if (!target) { _log('移動対象がいません'); return false; }
      if (toRow == null || toCol == null) { _log('移動先が指定されていません'); return false; }

      // 移動先チェック
      if (_isOccupied(toRow, toCol) && !(target.row === toRow && target.col === toCol)) { _log('そのマスは占有されています'); return false; }
      if (toRow < 0 || toRow >= BOARD_ROWS || toCol < 0 || toCol >= BOARD_COLS) { _log('盤面外には移動できません'); return false; }

      _spendLink(linkCost, item.name);
      target.row = toRow;
      target.col = toCol;
      _log(`${item.name}：${target.name} を移動`);
      _emit('move', { ally: { ...target }, bs: _snapshot() });
      if (item.consume) _bs.items.splice(itemSlotIndex, 1);

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

  // 再開直後は演出中ではなく、操作可能な状態に寄せる
  if (_bs.result) {
    _bs.phase = 'end';
  } else if (_bs.phase !== 'skill' && _bs.phase !== 'enemy') {
    _bs.phase = 'skill';
  }

  _renderUI();

  // skillフェーズなら入力可能に戻す
  if (_bs.phase === 'skill' && !_bs.result) {
    _unlockInput();
  }

  return true;
}

window.Battle32 = {
  start,
  restore,

  endSkillPhase,
  endCharTurn,

  executeAllySkill,
  moveAlly,

  getSummonableRoster,
  getSummonCells,
  summonAlly,

  getItems,
  useItem,

  getMoveCells,
  getMovableCells,
  getEnemyMoveCells,
  getSkillRangeCells,
  getBossDangerCells,
  getLinkCostForAction: (type, unitUid, skillId) => _getLinkCostForAction(type, unitUid, skillId),
  getElementRate: getElementRate32,
  getElementLabel: getElementLabel32,

  getState: () => _bs ? _snapshot() : null,
  getBS: () => _bs,
};

    })();
