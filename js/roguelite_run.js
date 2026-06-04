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
      // 既存 enemies.js の雑魚を流用（ローグライト用に後で差し替え可能）
      enemies: [
        {
          id: 'rl_mob_s1_a',
          name: '直進型怪異',
          hp: 700, atk: 240,
          moveType: 'enemy_zako_straight',
          attackRange: 'enemy_attack_front',
        },
        {
          id: 'rl_mob_s1_b',
          name: '斜行型怪異',
          hp: 650, atk: 220,
          moveType: 'enemy_zako_diag',
          attackRange: 'enemy_attack_cross',
        },
      ],
      enemyActionMode: 'limit',
      enemyActionsPerTurn: 2,
      turnLimit: 10,
      bossCaptureMax: null, // 雑魚戦では使わない
    },
    {
      stage: 2,
      isBoss: false,
      label: 'Stage 2',
      subLabel: '雑魚戦',
      enemies: [
        {
          id: 'rl_mob_s2_a',
          name: '強化直進型怪異',
          hp: 900, atk: 280,
          moveType: 'enemy_zako_straight',
          attackRange: 'enemy_attack_front',
        },
        {
          id: 'rl_mob_s2_b',
          name: '強化斜行型怪異',
          hp: 850, atk: 260,
          moveType: 'enemy_zako_diag',
          attackRange: 'enemy_attack_cross',
        },
        {
          id: 'rl_mob_s2_c',
          name: '強化直進型怪異',
          hp: 800, atk: 270,
          moveType: 'enemy_zako_straight',
          attackRange: 'enemy_attack_front',
        },
      ],
      enemyActionMode: 'limit',
      enemyActionsPerTurn: 2,
      turnLimit: 10,
      bossCaptureMax: null,
    },
    {
      stage: 3,
      isBoss: false,
      label: 'Stage 3',
      subLabel: '雑魚戦',
      enemies: [
        {
          id: 'rl_mob_s3_a',
          name: '精鋭直進型怪異',
          hp: 1100, atk: 320,
          moveType: 'enemy_zako_straight',
          attackRange: 'enemy_attack_front',
        },
        {
          id: 'rl_mob_s3_b',
          name: '精鋭斜行型怪異',
          hp: 1050, atk: 300,
          moveType: 'enemy_zako_diag',
          attackRange: 'enemy_attack_cross',
        },
        {
          id: 'rl_mob_s3_c',
          name: '精鋭直進型怪異',
          hp: 1000, atk: 310,
          moveType: 'enemy_zako_straight',
          attackRange: 'enemy_attack_front',
        },
      ],
      enemyActionMode: 'limit',
      enemyActionsPerTurn: 3,
      turnLimit: 12,
      bossCaptureMax: null,
    },
    {
      stage: 4,
      isBoss: true,
      label: 'Stage 4',
      subLabel: 'BOSS',
      // 既存ボスを流用（白糸の怪異）
      enemyIds: ['enemy_01', 'enemy_02a'],
      enemyRandomStartPosition: true,
      enemyActionMode: 'all',
      enemyActionsPerTurn: null,
      turnLimit: 12,
      bossCaptureMax: 2,
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
      options:  [],   // 取得済みOP オブジェクト
      partyIds: partyIds || [],
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
    if (_state.options.length >= 3) return;
    _state.options.push(op);
    console.log('[RogueliteRun] OP追加:', op.name,
      '/ 保持:', _state.options.map(o => o.name));
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

      // ボスステージフラグ
      isBossStage: def.isBoss,

      // ターン制限・行動数
      turnLimit:         def.turnLimit          || 12,
      enemyActionMode:   def.enemyActionMode     || 'all',
      enemyActionsPerTurn: def.enemyActionsPerTurn ?? null,
      bossCaptureMax:    def.bossCaptureMax      || 2,
    });

    // ── 敵設定：雑魚戦はインライン定義、ボス戦は enemyIds ──
    if (def.isBoss) {
      cfg.enemyIds              = def.enemyIds || [];
      cfg.enemyRandomStartPosition = def.enemyRandomStartPosition || false;
      cfg.enemySpawn            = def.enemySpawn || null;
      delete cfg.enemies;
    } else {
      // 雑魚戦：インライン敵定義
      cfg.enemies = def.enemies || [];
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
    addOption,
    advance,
    end,
    buildBattleConfig,
  };

})();
