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
  // ユーティリティ
  // ============================================================
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
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
  function calcDamage(atk, multiplier, target) {
    const rate = (target && target.damageTakenRate != null) ? target.damageTakenRate : 1.0;
    return Math.max(1, Math.floor(atk * multiplier * rate));
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
    };
  }

  // ============================================================
  // デフォルト敵定義
  // ============================================================
  const DEFAULT_ENEMIES = [
  {
    id: 'boss',
    name: 'ボス怪異',
    isBoss: true,
    hp: 3200,
    atk: 520,
    moveType: 'none',
    attackRange: 'enemy_attack_cross',
  },
  {
  id: 'mob1',
  name: '雑魚A',
  hp: 700,
  atk: 240,
  moveType: 'enemy_zako_straight',
  attackRange: 'enemy_attack_front',
},
{
  id: 'mob2',
  name: '雑魚B',
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

    // captureMax は config で上書き可能（デフォルト2）
    const bossCaptureMax = config.bossCaptureMax || 2;

    // ── ローグライトモードのroster構築 ──
    const isRogueliteMode = config.battleMode === 'roguelite' || typeof config.rogueliteOnBattleEnd === 'function';
    let rosterData = [];
    let initialAllies = allies;

    if (isRogueliteMode && config.partyIds && config.partyIds.length > 0) {
      // ローグライト：5体持ち込み、初期盤面は0体
      const allChars32 = allChars;
      rosterData = config.partyIds.map((pid, idx) => {
        const charDef = allChars32.find(c => c.id === pid);
        if (!charDef) return null;
        const rar = (charDef.rarity || 'r').toLowerCase();
        const cost = LINK_COST.summon[rar] || 1;
        return {
          rosterId: `roster_${idx}`,
          charaId: pid,
          name: charDef.name,
          rarity: rar,
          summonCost: cost,
          status: 'standby',
          deployedUid: null,
          charDef,
        };
      }).filter(Boolean);
      initialAllies = []; // ローグライトは初期盤面0体
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

      cores: {
        ally: {
          row: 7,
          col: 2,
          stability: 3,
          stabilityMax: 3,
        },
      },

      // ── 神性核（ボスコア）状態 ──
      bossCore: {
        exposed:    false,
        capture:    0,
        captureMax: bossCaptureMax,
        captured:   false,
      },

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
      actionMax:          99, // 後方互換用（判定には使わない）
      lastActionType:     null,
      lastActionUnitUid:  null,
      unitActionHistory:  {}, // ユニット単位の1ターン1回制限

      // ── ローグライト専用フィールド ──────────────────────────
      // isRoguelite: ローグライトランとして起動されたか（UI分岐の判定に使う）
      isRoguelite:          isRogueliteMode,
      // rogueliteOptions: 保持中の強化OPオブジェクト配列
      rogueliteOptions:     Array.isArray(config.rogueliteOptions) ? config.rogueliteOptions : [],
      // isBossStage: ボス戦かどうか（霊装OP等の判定用）
      isBossStage:          !!config.isBossStage,
      // スキルダメージ補正倍率（OP「秘術の触媒」が加算）
      _rl_skillDmgMult:     1.0,
      // 駒取り時の神気ボーナス（OP「神憑きの手」が加算）
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

    await _centerTextWait('ALLY TURN', `TURN ${_bs.turn}`, B32_WAIT.turn);

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

      delayedActions: _bs.delayedActions ? _bs.delayedActions.map(a => ({ ...a })) : [],

      isRoguelite: !!_bs.isRoguelite,
      cores: _bs.cores ? JSON.parse(JSON.stringify(_bs.cores)) : null,
      bossCore: _bs.bossCore ? { ..._bs.bossCore } : null,
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
  // ダメージ処理（結界・def_down 考慮）
  // 味方・敵ともに hp を減らす（統一）
  // ============================================================
  function applyDamage(target, rawDamage, source, skill) {
    let dmg = rawDamage;

    // 結界：ダメージ軽減（味方のみ）
    if (target.side === 'ally' && target.shieldRate > 0) {
      dmg = Math.floor(dmg * (1 - target.shieldRate));
      target.shieldRate = 0;
      _log(`${target.name} の結界が発動！ダメージを軽減`);
    }

    target.hp = Math.max(0, target.hp - dmg);
    _log(`${source ? source.name : '？'} → ${target.name} に ${dmg} ダメージ！（残HP: ${target.hp}）`);

    // ローグライト: 味方HPが0になったらrosterをdead更新
    if (target.side === 'ally' && target.hp <= 0 && _bs.roster) {
      const rEntry = _bs.roster.find(r => r.deployedUid === target._uid);
      if (rEntry && rEntry.status === 'deployed') {
        rEntry.status = 'dead';
      }
    }
    _emit('damage', {
      source: source ? { _uid: source._uid, name: source.name, side: source.side, row: source.row, col: source.col } : null,
      target: { _uid: target._uid, name: target.name, side: target.side, row: target.row, col: target.col },
      amount: dmg,
      kind: 'damage',
      skillId:     skill?.id        || null,
      skillName:   skill?.name      || null,
      isUltimate:  !!skill?.isUltimate,
      hitStyle:    skill?.hitStyle  || 'normal',
      bs: _snapshot(),
    });

    // ダメージ後に勝敗を即チェック（全滅検知）
    _checkWinLose();
  }

function _queueDelayedAttack(ally, skill) {
  if (!_bs.delayedActions) _bs.delayedActions = [];

  const delayTurns = Number(skill.delayTurns || 2);

  _bs.delayedActions.push({
    id: uid(),
    ownerUid: ally._uid,
    ownerName: ally.name,
    ownerAtk: ally.atk,

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
    let dmg = calcDamage(action.ownerAtk || 1, action.multiplier || 1, enemy);

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

    // ── attack ──────────────────────────────────────────────────
    // ── delayed_attack：未来予約攻撃 ─────────────────────────────
if (stype === 'delayed_attack') {
  _queueDelayedAttack(ally, skill);

// ── attack ──────────────────────────────────────────────────
} else if (stype === 'attack') {

      const targets = _enemyTargets(skill.range);
      if (targets.length === 0) {
        noTargets = true;
        _log(`${ally.name}：範囲内に敵がいません`);
      } else {
        targets.forEach(enemy => {
          let dmg = calcDamage(ally.atk, skill.multiplier, enemy);
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
          applyDamage(enemy, dmg, ally, skill);
          _applyEffects(skill.effects, enemy, ally);
        });
      }

    // ── debuff（ダメージあり/なし両対応） ──────────────────────
    } else if (stype === 'debuff') {
      const targets = _enemyTargets(skill.range);
      if (targets.length === 0) {
        noTargets = true;
        _log(`${ally.name}：範囲内に敵がいません`);
      } else {
        targets.forEach(enemy => {
          if ((skill.multiplier || 0) > 0) {
            let dmg = calcDamage(ally.atk, skill.multiplier, enemy);
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

    // 対象なしの場合はスキル消費せず選び直せるようにする
    if (noTargets) {
      _log('→ スキル選択に戻ります');
      return false;
    }

    ally.shinki -= (skill.shinkiCost || 0);

    _emit('allyAction', { ally: { ...ally }, skill, bs: _snapshot() });

    // 行動権を消費（LINKも消費される）
    _consumePlayerAction(actionType, allyUid, skillId);
    return true;
  }

  // ============================================================
  // エフェクト付与ヘルパー（命中判定つき）
  // ============================================================
  // source は任意（省略可）
  function _applyEffects(effects, target, source) {
    if (!effects || effects.length === 0) return;
    const MOVE_TYPES = new Set([
      'push_1','push_2','pull_1','pull_2',
      'shift_right_1','shift_right_2','shift_left_1','shift_left_2'
    ]);
    effects.forEach(eff => {
      if (MOVE_TYPES.has(eff.type)) {
        _log(`${target.name}: ${eff.type} は未実装のためスキップ`);
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

      // ── drain エフェクト（ダメージの一部を回復）──
      if (eff.type === 'drain') {
        // drain は attack 後の特殊処理なので、ここでは statusEffects に積まず pass
        _log(`${target.name}: drain は現バージョンではスキップ`);
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

      const hitRate = eff.hit != null ? eff.hit : 100;
      if (Math.random() * 100 > hitRate) {
        _log(`${target.name} に ${eff.type} — 外れ`);
        return;
      }
      target.statusEffects.push({
        type:     eff.type,
        duration: eff.duration || 1,
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
      function _canUsePlayerAction(type, unitUid, skillId) {
        if (!_bs || _bs.phase !== 'skill') return false;
        if (_bs.result) return false;

        // 駒アクション（move/skill/ult）はユニット単位で1ターン1回制限
        if (type === 'move' || type === 'skill' || type === 'ult') {
          const history = _bs.unitActionHistory || {};
          const unitHistory = history[unitUid] || {};
          if (unitHistory.unitActionDone) {
            _log('このキャラはこのターンすでに行動しています');
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

        if (!_bs.unitActionHistory) _bs.unitActionHistory = {};
        if (!_bs.unitActionHistory[unitUid]) {
          _bs.unitActionHistory[unitUid] = {};
        }

        // 駒アクション（move/skill/ult）はunitActionDoneフラグで1回制限
        if (type === 'move' || type === 'skill' || type === 'ult') {
          _bs.unitActionHistory[unitUid].unitActionDone = true;
        }
        _bs.unitActionHistory[unitUid][type] = true;

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

      // 神性核干渉判定（ボスHP0後のみ有効）
      _checkBossCoreCapture();

      // 制圧で勝利条件を満たした可能性があるので確認
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

function canEnemyAttackAllyCore(enemy) {
  if (!_bs || !_bs.cores || !_bs.cores.ally) return false;

  const core = _bs.cores.ally;
  if (core.stability <= 0) return false;

  const range = enemy.attackRange || 'enemy_attack_front';
  const corePos = { row: core.row, col: core.col };

  // コアに上下左右で隣接している敵は、攻撃レンジに関係なくコア攻撃可能
  // 隣接はマンハッタン距離1のみ（斜め隣接は含めない）
  if (manhattan(enemy, corePos) === 1) {
    return true;
  }

  // enemy_attack_* / adjacent はレンジ定義で判定
  if (range.startsWith('enemy_attack_') || range === 'adjacent') {
    const cells = BR.getCellsFromRange32(enemy, range);
    return cells && cells.has(`${core.row}-${core.col}`);
  }

  // 後方互換：manhattan_N
  const m = /^manhattan_(\d+)$/.exec(range);
  if (m) {
    const dist = Number(m[1]);
    return manhattan(enemy, corePos) <= dist;
  }

  const cells = BR.getCellsFromRange32(enemy, range);
  return cells && cells.has(`${core.row}-${core.col}`);
}

function damageAllyCore(sourceEnemy) {
  if (!_bs || !_bs.cores || !_bs.cores.ally) return false;

  const core = _bs.cores.ally;
  if (core.stability <= 0) return false;

  core.stability = Math.max(0, core.stability - 1);

  _log(`${sourceEnemy.name} が自陣コアを攻撃！ コア耐久度 ${core.stability}/${core.stabilityMax}`);

  _emit('coreDamage', {
    source: sourceEnemy ? {
      _uid: sourceEnemy._uid,
      name: sourceEnemy.name,
      side: sourceEnemy.side,
      row: sourceEnemy.row,
      col: sourceEnemy.col,
    } : null,
    core: { ...core },
    bs: _snapshot(),
  });

  _checkWinLose();

  return true;
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

  // コアが直線上にある場合だけコアへダメージ
  const core = _bs.cores?.ally;
  if (core && core.stability > 0) {
    const coreKey = `${core.row}-${core.col}`;
    if (cells.has(coreKey)) {
      damageAllyCore(boss);
    }
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
      const bc = _bs.bossCore;
      if (!bc || bc.captured) return;

      const boss = _bs.enemies.find(e => e.isBoss);

      // ボスHP0以下で核が露出する
      if (boss && boss.hp <= 0 && !bc.exposed) {
        bc.exposed = true;
        _log('ボスの抵抗が崩壊。神性核が露出した！');
        _emit('bossCoreExposed', { bs: _snapshot() });
      }

      if (!bc.exposed) return;

      // 露出状態かつボス隣接マスに生存味方がいれば capture +1
      if (!boss) return;
      const hasAdjacentAlly = _bs.allies.some(a =>
        a.hp > 0 && manhattan(a, boss) === 1
      );

      if (!hasAdjacentAlly) return;

      bc.capture = Math.min(bc.captureMax, bc.capture + 1);
      _log(`神性核へ干渉中…… ${bc.capture}/${bc.captureMax}`);

      if (bc.capture >= bc.captureMax) {
        bc.captured = true;
        _log('神性核の固定に成功。収容完了！');
        _emit('bossCoreCapture', { bs: _snapshot() });
      }
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

    // 自陣コア
    if (_bs.cores && _bs.cores.ally) {
      occupied.add(`${_bs.cores.ally.row}-${_bs.cores.ally.col}`);
    }

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
    // 盤面に味方が0体でも敵はコアへ向かって行動する。
    // standby キャラが残っている場合は敗北しないため、早期 return せず通常フローを続ける。
    // 勝敗が確定している場合のみここで終了する。
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
   * - 盤面外 / 他ユニット在室 / ボス在室 / 自陣コア は NG
   * - 味方がいるマスは「駒取り」として許可する
   */
  function _canEnemyMoveTo(row, col, enemy) {
    if (!BR.isValidCell(row, col)) return false;

    const allUnits = getAllUnits();

    // ボスのいるマス（HP0後の核露出状態も含む）は進入禁止
    const bossAtCell = _bs.enemies.find(e => e.isBoss && e.row === row && e.col === col);
    if (bossAtCell) return false;

    // 自陣コアのマスは進入禁止（隣接から攻撃する仕様を維持）
    const corePos = _bs.cores && _bs.cores.ally;
    if (corePos && row === corePos.row && col === corePos.col) return false;

    const occupant = allUnits.find(u => u !== enemy && u.hp > 0 && u.row === row && u.col === col);

    // 他の敵がいれば進入禁止
    if (occupant && occupant.side === 'enemy') return false;

    // 味方がいれば「駒取り」として許可
    return true;
  }

  /**
   * 味方コアへのマンハッタン距離
   */
  function _distToAllyCore(row, col) {
    const core = _bs.cores && _bs.cores.ally;
    if (!core) return 999;
    return Math.abs(row - core.row) + Math.abs(col - core.col);
  }

  /**
   * 候補マスをコアへの近さでソートする（同距離はランダム）
   */
  function _sortByCoreDistance(candidates) {
    return candidates.sort((a, b) => {
      const da = _distToAllyCore(a.row, a.col);
      const db = _distToAllyCore(b.row, b.col);
      if (da !== db) return da - db;
      return Math.random() < 0.5 ? -1 : 1;
    });
  }

  /**
   * moveType に応じた移動候補をグループ（優先順位）つきで返す
   * group が小さいほど優先度が高い
   */
  function _getEnemyMoveCandidates(enemy) {
    const type = enemy.moveType;

    if (type === 'enemy_move_straight' || type === 'enemy_zako_straight') {
      // 直進型：前 → 左右 → 斜め前
      return [
        { dr:  1, dc:  0, group: 1 }, // 前
        { dr:  0, dc: -1, group: 2 }, // 左
        { dr:  0, dc:  1, group: 2 }, // 右
        { dr:  1, dc: -1, group: 3 }, // 左斜め前
        { dr:  1, dc:  1, group: 3 }, // 右斜め前
      ];
    }

    if (type === 'enemy_move_diag' || type === 'enemy_zako_diag') {
      // 斜行型：斜め前 → 前 → 左右
      return [
        { dr:  1, dc: -1, group: 1 }, // 左斜め前
        { dr:  1, dc:  1, group: 1 }, // 右斜め前
        { dr:  1, dc:  0, group: 2 }, // 前
        { dr:  0, dc: -1, group: 3 }, // 左
        { dr:  0, dc:  1, group: 3 }, // 右
      ];
    }

    // シフト型（enemy_zako_shift）：前進優先・左右横移動も可
    // enemy_mask / enemy_03 など前進＋横移動を持つ汎用移動型
    if (type === 'enemy_zako_shift') {
      return [
        { dr:  1, dc:  0, group: 1 }, // 前
        { dr:  0, dc: -1, group: 2 }, // 左（詰まり回避）
        { dr:  0, dc:  1, group: 2 }, // 右（詰まり回避）
        { dr:  1, dc: -1, group: 3 }, // 左斜め前（fallback）
        { dr:  1, dc:  1, group: 3 }, // 右斜め前（fallback）
      ];
    }

    // 中ボス：前方横3マスから最もコアに近いマスへ移動
    if (type === 'enemy_midboss_front3') {
      return [
        { dr:  1, dc: -1, group: 1 }, // 左斜め前
        { dr:  1, dc:  0, group: 1 }, // 前
        { dr:  1, dc:  1, group: 1 }, // 右斜め前
        { dr:  0, dc: -1, group: 2 }, // 左（詰まり回避）
        { dr:  0, dc:  1, group: 2 }, // 右（詰まり回避）
      ];
    }

    // それ以外は既存の getMoveOffsets をフォールバックとして使う（全て group:1）
    const offsets = BR.getMoveOffsets ? BR.getMoveOffsets(enemy) : [];
    return offsets.map(o => ({ dr: o.dr, dc: o.dc, group: 1 }));
  }

  /**
   * 敵1体の移動先を決定する（詰まり回避あり）
   * 戻り値: { row, col, isCapture, occupant } | null
   */
  function _decideEnemyMoveCell(enemy) {
    const candidates = _getEnemyMoveCandidates(enemy);
    if (!candidates || candidates.length === 0) return null;

    const allUnits = getAllUnits();
    const corePos = _bs.cores && _bs.cores.ally;

    // グループを昇順に並べ、グループ内で最良を選ぶ
    const groups = [...new Set(candidates.map(c => c.group))].sort((a, b) => a - b);

    for (const group of groups) {
      const groupCandidates = candidates
        .filter(c => c.group === group)
        .map(c => ({ row: enemy.row + c.dr, col: enemy.col + c.dc }))
        .filter(c => _canEnemyMoveTo(c.row, c.col, enemy));

      if (groupCandidates.length === 0) continue;

      // 味方がいるマス（駒取り）を優先。次にコアへ近づくマス。
      const withOccupant = groupCandidates.filter(c => {
        const occ = allUnits.find(u => u !== enemy && u.hp > 0 && u.row === c.row && u.col === c.col);
        return occ && occ.side === 'ally';
      });

      if (withOccupant.length > 0) {
        const sorted = _sortByCoreDistance(withOccupant);
        const chosen = sorted[0];
        const occupant = allUnits.find(u => u !== enemy && u.hp > 0 && u.row === chosen.row && u.col === chosen.col);
        return { row: chosen.row, col: chosen.col, isCapture: true, occupant };
      }

      // 空きマスのみ
      const emptyMoves = groupCandidates.filter(c => {
        const occ = allUnits.find(u => u !== enemy && u.hp > 0 && u.row === c.row && u.col === c.col);
        return !occ;
      });

      if (emptyMoves.length === 0) continue;

      // group ごとに距離条件を変えてフィルタする
      //   group 1（主移動）: コアへ近づく（距離が縮まる）マスのみ
      //   group 2（横回避）: コア距離が同じでも許可（横移動は前進の妨げ解消が目的）
      //   group 3（斜め fallback）: コア距離が同じでも許可
      const approaching = emptyMoves.filter(c => {
        if (!corePos) return true;
        const curDist = _distToAllyCore(enemy.row, enemy.col);
        const newDist = _distToAllyCore(c.row, c.col);
        const type = enemy.moveType;

        if (group === 1) {
          // 主移動：必ずコアへ近づく
          if (type === 'enemy_move_diag' || type === 'enemy_zako_diag') {
            // 斜行型：前進（row増加）かつ距離が縮まる or 同値
            return c.row > enemy.row && newDist <= curDist;
          }
          return newDist < curDist;
        }

        // group 2（横回避）・group 3（斜め fallback）:
        // コア距離が悪化しなければ OK（詰まり解消が目的なので同値を許可）
        return newDist <= curDist;
      });

      if (approaching.length > 0) {
        const sorted = _sortByCoreDistance(approaching);
        const chosen = sorted[0];
        const isFallback = group > 1;
        if (isFallback) {
          console.log('[B32 enemy fallback move]', {
            name: enemy.name,
            moveType: enemy.moveType,
            group,
            from: { row: enemy.row, col: enemy.col },
            to: chosen,
          });
          _log(`${enemy.name} が進路を変えた`);
        }
        return { row: chosen.row, col: chosen.col, isCapture: false, occupant: null };
      }

      // このグループでは前進できなかった → 次グループへ
    }

    return null; // 移動できるマスがない
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
      // 射程内に味方がいる → HPが最も少ない味方を優先攻撃
      const target = rangeTargets.reduce((a, b) => a.hp < b.hp ? a : b);
      const dmg = calcDamage(enemy.atk, 1.0, target);
      applyDamage(target, dmg, enemy);
      _renderUI();
      await wait(B32_WAIT.afterText);
      // applyDamage 内で _checkWinLose を呼んでいるが、念のため result を確認
      if (_bs.result) return;
      return;
    }
    // 射程内に味方がいないが、自陣コアを攻撃できる場合
if (canEnemyAttackAllyCore(enemy)) {
  damageAllyCore(enemy);
  _renderUI();
  await wait(B32_WAIT.attack);
  await wait(B32_WAIT.afterText);
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

    // 駒取り処理
    if (bestCell.isCapture && bestCell.occupant) {
      const target = bestCell.occupant;
      target.hp = 0;
      _log(`${enemy.name} が ${target.name} を制圧した！`);
      _emit('enemy_capture', { enemy: { ...enemy }, target: { ...target }, bs: _snapshot() });
      _renderUI();
      await wait(B32_WAIT.afterText);
      _checkWinLose();
      if (_bs.result) return;
    }

    // 通常移動
    enemy.row = bestCell.row;
    enemy.col = bestCell.col;
    _log(`${enemy.name} が移動した`);
    _renderUI();
    await wait(B32_WAIT.afterText);

    // 移動後に攻撃可能か再チェック
    const afterMoveTargets = getEnemyAttackTargets(enemy);
    if (afterMoveTargets.length > 0) {
      const target = afterMoveTargets.reduce((a, b) => a.hp < b.hp ? a : b);
      const dmg = calcDamage(enemy.atk, 1.0, target);
      applyDamage(target, dmg, enemy);
      _renderUI();
      await wait(B32_WAIT.afterText);
      if (_bs.result) return;
    } else if (canEnemyAttackAllyCore(enemy)) {
      damageAllyCore(enemy);
      _renderUI();
      await wait(B32_WAIT.attack);
      await wait(B32_WAIT.afterText);
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
        const dmg = Math.floor(boss.atk * BOSS_WARN_RATE);
        applyDamage(ally, dmg, boss);
      }
    });
    _bs.bossWarning = false;
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
  }

  // ============================================================
  // ローグライト終了通知ヘルパー（二重呼び出し防止）
  // ============================================================
  function _notifyRogueliteBattleEnd(result) {
    if (!_bs || typeof _bs._rl_onBattleEnd !== 'function') return;
    const cb = _bs._rl_onBattleEnd;
    _bs._rl_onBattleEnd = null;  // 二重呼び出し防止
    setTimeout(() => {
      // バトルUI専用要素（link-bar / roster-panel 等）を確実に除去し、
      // ホーム共通UI（bottom-nav-shared / global-user-frame）を復帰させる
      if (typeof window.cleanupBattle32Overlays === 'function') {
        window.cleanupBattle32Overlays({ restoreCommonUi: true });
      } else if (typeof window.closeBattle32UI === 'function') {
        window.closeBattle32UI();
      }
      cb({ result });
    }, 800);
  }

  // ============================================================
  // 勝敗判定
  // ============================================================
  function _checkWinLose() {
    if (_bs.result) return;

    // ── ローグライト雑魚戦専用：敵全滅で勝利 ──────────────
    // _rl_onBattleEnd が設定されており、かつボス戦でない場合のみ有効
    // 通常ステージ（_rl_onBattleEnd === null）には影響しない
    if (typeof _bs._rl_onBattleEnd === 'function' && !_bs.isBossStage) {
      const hasAliveEnemy = _bs.enemies.some(e => e.hp > 0);
      if (!hasAliveEnemy) {
        _bs.result = 'win';
        _bs.phase  = 'end';
        _log('★ 雑魚群の制圧に成功！');
        _emit('result', { result: 'win', bs: _snapshot() });
        _renderUI();
        _notifyRogueliteBattleEnd('win');
        return;
      }
    }

    // 勝利条件：神性核の固定（ボスコア制圧）
    if (_bs.bossCore?.captured) {
      _bs.result = 'win';
      _bs.phase = 'end';
      _log('★ 神性核固定・収容完了！');
      _emit('result', { result: 'win', bs: _snapshot() });
      _renderUI();
      _notifyRogueliteBattleEnd('win');
      return;
    }

    if (_bs.cores?.ally?.stability <= 0) {
      _bs.result = 'lose';
      _bs.phase = 'end';
      _log('✕ 自陣コアが侵食された。収容失敗…');
      _emit('result', { result: 'lose', bs: _snapshot() });
      _renderUI();
      _notifyRogueliteBattleEnd('lose');
      return;
    }

    if (_bs.turn > _bs.turnLimit) {
      _bs.result = 'lose';
      _bs.phase = 'end';
      _log('✕ 接続限界を超過。強制帰還…');
      _emit('result', { result: 'lose', bs: _snapshot() });
      _renderUI();
      _notifyRogueliteBattleEnd('lose');
      return;
    }

    if (aliveAllies().length === 0) {
      // ローグライト: standbyキャラが残っている場合は敗北しない
      const hasStandby = _bs.roster && _bs.roster.some(r => r.status === 'standby');
      if (hasStandby) return; // まだ召喚できる

      _bs.result = 'lose';
      _bs.phase = 'end';
      _log('✕ 味方全滅。敗北…');
      _emit('result', { result: 'lose', bs: _snapshot() });
      _renderUI();
      _notifyRogueliteBattleEnd('lose');
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
  function getMoveCells(unitUid) {
    const unit = _bs
      ? (_bs.allies.find(u => u._uid === unitUid) || _bs.enemies.find(u => u._uid === unitUid))
      : null;
    if (!unit || unit.hp <= 0) return [];

    const offsets = BR.getMoveOffsets(unit);
    const cells   = [];

    offsets.forEach(({ dr, dc }) => {
      const row = unit.row + dr;
      const col = unit.col + dc;

      if (!BR.isValidCell(row, col)) return;

      // 自陣コアのマスには味方も移動不可（敵と同様）
      const allyCore = _bs.cores && _bs.cores.ally;
      if (allyCore && row === allyCore.row && col === allyCore.col) return;

      const occupant = getAllUnits().find(u => u.hp > 0 && u.row === row && u.col === col);

      // 同陣営ユニットがいるマスには移動不可
      if (occupant && occupant.side === unit.side) return;

      // ボスのいるマスは侵入不可
      // ボスはHP0後も神性核として盤面に残るため、hp条件を付けずにブロックする
      const bossOnCell = _bs.enemies.find(e => e.isBoss && e.row === row && e.col === col);
      if (unit.side === 'ally' && bossOnCell) return;

      cells.push({
        row,
        col,
        cellType:  occupant ? 'capture' : 'move',
        targetUid: occupant ? occupant._uid : null,
      });
    });

    return cells;
  }

  // ============================================================
  // 味方移動（駒取り対応）
  // ============================================================
    function moveAlly(allyUid, toRow, toCol) {
      if (!_bs || _bs.phase !== 'skill') return false;

      const ally = _bs.allies.find(u => u._uid === allyUid);
      if (!ally || ally.hp <= 0) return false;
      if (!_canUsePlayerAction('move', allyUid)) return false;

      // 自陣コアマスへの直叩き対策（最終ガード）
      const _allyCore = _bs.cores && _bs.cores.ally;
      if (_allyCore && toRow === _allyCore.row && toCol === _allyCore.col) {
        _log('自陣コアのマスには移動できない');
        return false;
      }

      const moveCells = getMoveCells(allyUid);
      const targetCell = moveCells.find(c => c.row === toRow && c.col === toCol);

      if (!targetCell) {
        _log(`${ally.name} はそこへ移動できない`);
        return false;
      }

      // ── 駒取り処理 ──
      if (targetCell.cellType === 'capture' && targetCell.targetUid) {
        const target = getAllUnits().find(u => u._uid === targetCell.targetUid);

        if (target && target.side === 'enemy') {
          if (target.isBoss) {
            // ボスは即死させず固定ダメージ
            const dmg = Math.floor(ally.atk * 1.5);
            target.hp = Math.max(0, target.hp - dmg);
            _log(`${ally.name} が ${target.name}（ボス）に駒取りを試みた！ ${dmg} ダメージ`);
            _emit('capture_boss', { ally: { ...ally }, boss: { ...target }, dmg, bs: _snapshot() });

            // ボスHP0後は既存の bossCore / capture 処理へ接続
            if (target.hp <= 0) {
              _log(`${target.name} のHPが0になった。コア突破処理へ…`);
              // ボスHP0フラグを立てて既存フローに乗せる（bossPhase判定等）
              _emit('boss_hp_zero', { boss: { ...target }, bs: _snapshot() });
            }
          } else {
            // 通常敵：制圧（HP0）
            target.hp = 0;
            _log(`${ally.name} が ${target.name} を制圧した！`);
            _emit('capture', { ally: { ...ally }, target: { ...target }, bs: _snapshot() });
            // ─ ローグライト: 駒取りイベント発火（「神憑きの手」等） ─
            {
              const _shinkiBefore = ally.shinki;
              _fireRogueliteEvent('capture', { ally, target });
              if (ally.shinki > _shinkiBefore) {
                _log(`強化OPにより ${ally.name} の神気が ${ally.shinki - _shinkiBefore} 上昇`);
              }
            }
          }
        } else if (target && target.side === 'ally') {
          // 味方コアへの駒取りは敗北（将来の敵移動拡張用フック）
          _log(`味方コアが制圧された！`);
          _emit('core_captured', { attacker: { ...target }, bs: _snapshot() });
        }
      }

      // ── 移動実行 ──
      // 念のための直叩き対策：ボスマスへの移動を最終ガード
      const bossAtDest = _bs.enemies.find(e => e.isBoss && e.row === toRow && e.col === toCol);
      if (bossAtDest) {
        _log('ボスのいるマスには移動できない');
        return false;
      }

      ally.row = toRow;
      ally.col = toCol;

      if (targetCell.cellType === 'capture') {
        _log(`${ally.name} が移動・制圧した`);
      } else {
        _log(`${ally.name} が移動した`);
      }
      _emit('move', { ally: { ...ally }, bs: _snapshot() });

      // 行動権を消費（actionCount >= actionMax なら内部で endSkillPhase() を呼ぶ）
      _consumePlayerAction('move', allyUid, null);
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
    const allyCore = _bs.cores && _bs.cores.ally;
    for (let row of [6, 7]) {
      for (let col = 0; col < 5; col++) {
        if (allyCore && row === allyCore.row && col === allyCore.col) continue;
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
      const allyCore = _bs.cores && _bs.cores.ally;
      if (allyCore && toRow === allyCore.row && toCol === allyCore.col) { _log('コアマスには移動できません'); return false; }
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
    return true;
  }

    window.Battle32 = {
  // 初期化
  start,

  // フェーズ操作
  endSkillPhase,
  endCharTurn,

  // アクション
  executeAllySkill,
  moveAlly,

  // 召喚（ローグライト）
  getSummonableRoster,
  getSummonCells,
  summonAlly,

  // アイテム（ローグライト）
  getItems,
  useItem,

  // UI補助
  getMoveCells,
  getMovableCells,
  getSkillRangeCells,
  getBossDangerCells,
  getLinkCostForAction: (type, unitUid, skillId) => _getLinkCostForAction(type, unitUid, skillId),

  // 状態参照
  getState: () => _snapshot(),
  getBS: () => _bs,  // デバッグ用

};

    })();
