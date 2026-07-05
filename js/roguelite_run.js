// roguelite_run.js
// ローグライトランの進行状態を管理するシングルトン
//
// 依存: roguelite_options.js（getOptionById, ROGUELITE_OPTIONS）
//
// ── 公開API ─────────────────────────────────────────────────
//   RogueliteRun.start(partyIds)   : ランを開始（partyIds は選択キャラ ID 配列）
//   RogueliteRun.isActive()        : ラン中かどうか
//   RogueliteRun.getStageNo()      : 現在ステージ番号（1〜4）
//   RogueliteRun.isBossStage()     : 4ステージ目かどうか
//   RogueliteRun.getStageDef()     : 現ステージ定義オブジェクト
//   RogueliteRun.getOptions()      : 保持中のOPオブジェクト配列
//   RogueliteRun.addOption(op)     : OPを追加（最大3つ）
//   RogueliteRun.advance()         : 次ステージへ進む
//   RogueliteRun.end(result)       : ランを終了し snapshot を返す
//   RogueliteRun.buildBattleConfig(baseConfig) : Battle32.start() 用 config を生成
//   RogueliteRun.STAGE_DEFS        : ステージ定義配列（UI 表示用）
// ────────────────────────────────────────────────────────────

(function () {

  // ローグライト専用：主人公エリは1st固定
  const ROGUELITE_FIXED_FIRST_CHARA_ID = 1;

  function normalizeRoguelitePartyIds(partyIds) {
    const ids = Array.isArray(partyIds) ? partyIds.map(Number).filter(Number.isFinite) : [];
    const rest = ids.filter(id => id !== ROGUELITE_FIXED_FIRST_CHARA_ID);
    return [ROGUELITE_FIXED_FIRST_CHARA_ID, ...rest].slice(0, 4);
  }

  // ── ラン定義 ──────────────────────────────────────────
  // 1つ目: 既存ローグライトラン
  // 2つ目: サキエル降臨（雑魚3戦 → サキエル）
  // enemyIds は enemies.js の ENEMIES[].id と対応
  const ROGUELITE_RUN_DEFS = {
    default: {
      id: 'default',
      name: 'ローグライトラン',
      subName: '白糸の残響',
      stageDefs: [
        {
          stage: 1,
          isBoss: false,
          label: 'Stage 1',
          subLabel: '雑魚戦',
          enemyIds: ['rl_chaos_walker', 'rl_chaos_slant'],
          enemyActionMode: 'limit',
          enemyActionsPerTurn: 2,
        },
        {
          stage: 2,
          isBoss: false,
          label: 'Stage 2',
          subLabel: '雑魚戦',
          enemyIds: ['rl_chaos_walker_plus', 'rl_logos_ranged', 'rl_mystis_caster'],
          enemyActionMode: 'limit',
          enemyActionsPerTurn: 2,
        },
        {
          stage: 3,
          isBoss: false,
          label: 'Stage 3',
          subLabel: '雑魚戦',
          enemyIds: ['rl_chaos_elite', 'rl_logos_elite', 'rl_mystis_elite', 'rl_chaos_ranged'],
          enemyActionMode: 'limit',
          enemyActionsPerTurn: 3,
        },
        {
          stage: 4,
          isBoss: true,
          label: 'Stage 4',
          subLabel: 'BOSS',
          enemyIds: ['enemy_01', 'enemy_02b'],
          enemyRandomStartPosition: true,
          enemyActionMode: 'all',
          enemyActionsPerTurn: null,
          enemySpawn: {
            enemyId: 'enemy_02a',
            interval: 2,
            rows: [0, 1, 2, 3],
            cols: [0, 1, 2, 3, 4],
          },
        },
      ],
    },

    sakiel: {
      id: 'sakiel',
      name: 'サキエル降臨',
      subName: '白翼の断罪者',
      stageDefs: [
        {
          stage: 1,
          isBoss: false,
          label: 'Stage 1',
          subLabel: '雑魚戦',
          enemyIds: ['rl_sakiel_zako_straight', 'rl_sakiel_zako_diag'],
          enemyActionMode: 'limit',
          enemyActionsPerTurn: 2,
        },
        {
          stage: 2,
          isBoss: false,
          label: 'Stage 2',
          subLabel: '雑魚戦',
          enemyIds: ['rl_sakiel_zako_straight', 'rl_sakiel_zako_ranged', 'rl_sakiel_zako_diag'],
          enemyActionMode: 'limit',
          enemyActionsPerTurn: 2,
        },
        {
          stage: 3,
          isBoss: false,
          label: 'Stage 3',
          subLabel: '雑魚戦',
          enemyIds: ['rl_sakiel_zako_elite', 'rl_sakiel_zako_ranged', 'rl_sakiel_zako_diag', 'rl_sakiel_zako_straight'],
          enemyActionMode: 'limit',
          enemyActionsPerTurn: 3,
        },
        {
          stage: 4,
          isBoss: true,
          label: 'Stage 4',
          subLabel: 'SAKIEL',
          enemyIds: ['enemy_sakiel_roguelite'],
          enemyRandomStartPosition: false,
          enemyActionMode: 'all',
          enemyActionsPerTurn: null,
          enemySpawn: {
            enemyId: 'rl_sakiel_spawn_glass',
            interval: 2,
            rows: [0, 1, 2, 3],
            cols: [0, 1, 2, 3, 4],
          },
        },
      ],
    },
  };

  const STAGE_DEFS = ROGUELITE_RUN_DEFS.default.stageDefs;

  function getRunDef(runId) {
    return ROGUELITE_RUN_DEFS[runId] || ROGUELITE_RUN_DEFS.default;
  }

  function getCurrentRunDef() {
    if (!_state && window.__ROGUELITE_PENDING_RUN_ID__) {
      return getRunDef(window.__ROGUELITE_PENDING_RUN_ID__);
    }
    return getRunDef(_state && _state.runId);
  }

  // ── 内部状態 ───────────────────────────────────────────────
  let _state = null;
  // { active, stageNo, options[], partyIds[], result }

  // ── 内部: 初期ステート ────────────────────────────────────
  function _newState(partyIds, runId) {
    const runDef = getRunDef(runId || 'default');
    return {
      active:   true,
      runId:    runDef.id,
      runName:  runDef.name,
      stageNo:  1,
      options:  [],   // 取得済みOP オブジェクト（passive）
      items:    [],   // 取得済みアイテム（最大2枠）
      totalTurns: 0,  // ラン通算クリアターン数
      stageTurns: [], // 各ステージのクリアターン履歴
      partyIds: normalizeRoguelitePartyIds(partyIds),
      result:   null, // 'win' | 'lose'
    };
  }

  // ── 公開API ───────────────────────────────────────────────

  function start(partyIds, runId) {
    _state = _newState(partyIds, runId);
    console.log('[RogueliteRun] ラン開始', { partyIds, runId: _state.runId, state: _state });
    return _state;
  }

  function isActive() {
    return !!(_state && _state.active);
  }

  function getStageNo() {
    return _state ? _state.stageNo : 0;
  }

  function isBossStage() {
    return _state ? _state.stageNo === 4 : false;
  }

  function getStageDef() {
    if (!_state) return null;
    const runDef = getRunDef(_state.runId);
    return runDef.stageDefs[_state.stageNo - 1] || null;
  }

  function getOptions() {
    return _state ? _state.options.slice() : [];
  }

  function addOption(op) {
    if (!_state || !_state.active) return;
    if (!op) return;

    const kind = op.rewardKind || 'passive';

    if (kind === 'item' && op.item) {
      if (_state.items.length >= 2) {
        console.warn('[RogueliteRun] アイテム枠が満杯（最大2）:', op.item.name);
        return;
      }
      _state.items.push({ ...op.item });
      console.log('[RogueliteRun] アイテム追加:', op.item.name,
        '/ 保持:', _state.items.map(i => i.name));
    } else {
      // passive（通常OP）
      if (_state.options.length >= 3) return;
      _state.options.push(op);
      console.log('[RogueliteRun] OP追加:', op.name,
        '/ 保持:', _state.options.map(o => o.name));
    }
  }

  function getItems() {
    return _state ? _state.items.slice() : [];
  }

  // Battle32側で使い切りアイテムを使用した時に、ラン状態からも削除する。
  // これをしないと、次ステージ開始時に buildBattleConfig() が未使用扱いの
  // _state.items を再度渡してしまい、使用済みアイテムが復活する。
  function consumeItem(slotIndex, usedItem) {
    if (!_state || !_state.active) return null;

    const idx = Number(slotIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= _state.items.length) {
      console.warn('[RogueliteRun] consumeItem: 不正なslotIndex', slotIndex, usedItem);
      return null;
    }

    const removed = _state.items.splice(idx, 1)[0] || null;

    console.log('[RogueliteRun] アイテム消費:', removed && removed.name,
      '/ 残り:', _state.items.map(i => i.name));

    return removed;
  }

  function setItems(items) {
    if (!_state || !_state.active) return;
    _state.items = Array.isArray(items)
      ? items.filter(Boolean).slice(0, 2).map(item => ({ ...item }))
      : [];
  }

  function addClearedStageTurn(turn) {
    if (!_state || !_state.active) return 0;
    const t = Math.max(0, Math.floor(Number(turn || 0)));
    _state.stageTurns.push(t);
    _state.totalTurns += t;
    console.log('[RogueliteRun] ステージTURN記録:', t, '/ 通算:', _state.totalTurns);
    return _state.totalTurns;
  }

  function getTotalTurns() {
    return _state ? Number(_state.totalTurns || 0) : 0;
  }

  function getStageTurns() {
    return _state ? _state.stageTurns.slice() : [];
  }

  function getClearRank(totalTurns) {
    const t = Number(totalTurns || 0);
    if (t <= 32) return 'S';
    if (t <= 35) return 'A';
    if (t <= 38) return 'B';
    if (t <= 41) return 'C';
    if (t <= 45) return 'D';
    return 'E';
  }

  function advance() {
    if (!_state || !_state.active) return;
    const runDef = getRunDef(_state.runId);
    if (_state.stageNo < runDef.stageDefs.length) {
      _state.stageNo++;
      console.log('[RogueliteRun] 次ステージ:', _state.stageNo);
    }
  }

  function end(result) {
    if (!_state) return null;
    _state.active = false;
    _state.result = result;
    const snap = JSON.parse(JSON.stringify({
      runId: _state.runId,
      runName: _state.runName,
      stageNo: _state.stageNo,
      options: _state.options.map(o => ({ id: o.id, name: o.name, icon: o.icon })),
      items: _state.items.map(i => ({ id: i.id, name: i.name, icon: i.icon })),
      totalTurns: _state.totalTurns || 0,
      stageTurns: _state.stageTurns ? _state.stageTurns.slice() : [],
      clearRank: getClearRank(_state.totalTurns || 0),
      result,
    }));
    console.log('[RogueliteRun] ラン終了:', result, snap);
    _state = null;
    return snap;
  }

  /**
   * Battle32.start() に渡す config を生成する
   * @param {Object} baseConfig - partyIds など呼び出し元からの追加設定
   */
  function buildBattleConfig(baseConfig) {
    if (!_state) return baseConfig || {};
    const def = getStageDef();
    if (!def) return baseConfig || {};

    const cfg = Object.assign({}, baseConfig || {}, {
      // パーティID（ラン開始時に保存したもの）
      partyIds: _state.partyIds,

      // 保持OPを渡す（battle_32.js 側で applyOnStart / applyOnEvent を呼ぶ）
      rogueliteOptions: _state.options.slice(),

      // 保持アイテムを渡す（Battle32側でspliceしてもラン状態が勝手に戻らないよう複製）
      rogueliteItems: _state.items.map(item => ({ ...item })),

      // ボスステージフラグ
      isBossStage: def.isBoss,

      // ターン制限・行動数
      turnLimit:         def.turnLimit          || 12,
      enemyActionMode:   def.enemyActionMode     || 'all',
      enemyActionsPerTurn: def.enemyActionsPerTurn ?? null,
    });

    // ── 敵設定：enemyIds を優先、インライン定義（enemies）は後方互換フォールバック ──
    if (Array.isArray(def.enemyIds) && def.enemyIds.length > 0) {
      cfg.enemyIds = def.enemyIds.slice();
      cfg.enemyRandomStartPosition = def.enemyRandomStartPosition || false;
      cfg.enemySpawn = def.enemySpawn || null;
      delete cfg.enemies;
    } else if (Array.isArray(def.enemies) && def.enemies.length > 0) {
      // 後方互換：インライン敵定義（旧形式）
      cfg.enemies = def.enemies.slice();
      delete cfg.enemyIds;
    }

    return cfg;
  }

  // グローバル公開
  window.RogueliteRun = {
    STAGE_DEFS,
    RUN_DEFS: ROGUELITE_RUN_DEFS,
    getRunDef,
    getCurrentRunDef,
    start,
    isActive,
    getStageNo,
    isBossStage,
    getStageDef,
    getRunId: () => _state ? _state.runId : null,
    getRunName: () => _state ? _state.runName : getCurrentRunDef().name,
    getOptions,
    getItems,
    consumeItem,
    setItems,
    addOption,
    addClearedStageTurn,
    getTotalTurns,
    getStageTurns,
    getClearRank,
    advance,
    end,
    buildBattleConfig,
  };

})();
