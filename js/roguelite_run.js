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

  // ── ステージ定義 ──────────────────────────────────────────
  // 現在の構成：4戦MVP（雑魚3戦 → ボス1戦）
  //   Stage 1: 雑魚戦
  //   Stage 2: 雑魚戦
  //   Stage 3: 雑魚戦
  //   Stage 4: ボス戦
  //
  // 将来的には「雑魚3戦 → ボーナスステージ → ボス戦」の5区間構成へ拡張予定:
  //   Stage 1〜3: 雑魚戦
  //   Stage 4:    ボーナス（OP選択・霊装付与等）← 将来追加
  //   Stage 5:    ボス戦                        ← 将来追加
  //
  // enemyIds は enemies.js の ENEMIES[].id と対応
  const STAGE_DEFS = [
    {
      stage: 1,
      isBoss: false,
      label: 'Stage 1',
      subLabel: '雑魚戦',
      enemyIds: ['rl_chaos_walker', 'rl_chaos_slant'],
      enemyActionMode: 'limit',
      enemyActionsPerTurn: 2,
      turnLimit: 10,
    },
    {
      stage: 2,
      isBoss: false,
      label: 'Stage 2',
      subLabel: '雑魚戦',
      enemyIds: ['rl_chaos_walker_plus', 'rl_logos_ranged', 'rl_mystis_caster'],
      enemyActionMode: 'limit',
      enemyActionsPerTurn: 2,
      turnLimit: 10,
    },
    {
      stage: 3,
      isBoss: false,
      label: 'Stage 3',
      subLabel: '雑魚戦',
      enemyIds: ['rl_chaos_elite', 'rl_logos_elite', 'rl_mystis_elite', 'rl_chaos_ranged'],
      enemyActionMode: 'limit',
      enemyActionsPerTurn: 3,
      turnLimit: 12,
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
      turnLimit: 13,
      enemySpawn: {
        enemyId: 'enemy_02a',
        interval: 2,
        rows: [0, 1, 2, 3],
        cols: [0, 1, 2, 3, 4],
      },
    },
  ];

  // ── 内部状態 ───────────────────────────────────────────────
  let _state = null;
  // { active, stageNo, options[], partyIds[], result }

  // ── 内部: 初期ステート ────────────────────────────────────
  function _newState(partyIds) {
    return {
      active:   true,
      stageNo:  1,
      options:  [],   // 取得済みOP オブジェクト（passive）
      items:    [],   // 取得済みアイテム（最大2枠）
      partyIds: normalizeRoguelitePartyIds(partyIds),
      result:   null, // 'win' | 'lose'
    };
  }

  // ── 公開API ───────────────────────────────────────────────

  function start(partyIds) {
    _state = _newState(partyIds);
    console.log('[RogueliteRun] ラン開始', { partyIds, state: _state });
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
    return STAGE_DEFS[_state.stageNo - 1] || null;
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

  function advance() {
    if (!_state || !_state.active) return;
    if (_state.stageNo < 4) {
      _state.stageNo++;
      console.log('[RogueliteRun] 次ステージ:', _state.stageNo);
    }
  }

  function end(result) {
    if (!_state) return null;
    _state.active = false;
    _state.result = result;
    const snap = JSON.parse(JSON.stringify({
      stageNo: _state.stageNo,
      options: _state.options.map(o => ({ id: o.id, name: o.name, icon: o.icon })),
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

      // 保持アイテムを渡す
      rogueliteItems: _state.items.slice(),

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
    start,
    isActive,
    getStageNo,
    isBossStage,
    getStageDef,
    getOptions,
    getItems,
    addOption,
    advance,
    end,
    buildBattleConfig,
  };

})();
