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

    overseer: {
      id: 'overseer',
      name: '万象を知る白亜の座',
      subName: 'レムナント：オーバーシア',
      zakoBattleStartImg: 'images/remnant_01_zako_battle_start.webp',
      bossBattleStartImg: 'images/remnant_01_battle_start.webp',
      stageDefs: [
        {
          stage: 1,
          isBoss: false,
          label: 'ST1',
          subLabel: 'オーバーシアのしもべ',
          enemyIds: [
            'rl_overseer_servant_straight',
            'rl_overseer_servant_cross',
          ],
          enemyRandomStartPosition: true,
          enemyActionMode: 'all',
          enemyActionsPerTurn: null,
          turnLimit: 10,
        },
        {
          stage: 2,
          isBoss: false,
          label: 'ST2',
          subLabel: 'オーバーシアのしもべ',
          enemyIds: [
            'rl_overseer_servant_straight',
            'rl_overseer_servant_cross',
            'rl_overseer_servant_skip',
          ],
          enemyRandomStartPosition: true,
          enemyActionMode: 'all',
          enemyActionsPerTurn: null,
          turnLimit: 11,
        },
        {
          stage: 3,
          isBoss: true,
          label: 'BOSS',
          subLabel: 'レムナント：オーバーシア',
          enemyIds: [
            'enemy_overseer_roguelite',
            'rl_overseer_servant_straight',
            'rl_overseer_servant_cross',
            'rl_overseer_servant_skip',
          ],
          enemyRandomStartPosition: false,
          enemyActionMode: 'all',
          enemyActionsPerTurn: null,
          turnLimit: 14,
        },
      ],
    },


    irish: {
      id: 'irish',
      name: '無へ還す破壊の座',
      subName: 'レムナント：イリシュ',
      zakoBattleStartImg: 'images/remnant_02_zako_battle_start.webp',
      bossBattleStartImg: 'images/remnant_02_battle_start.webp',
      stageDefs: [
        {
          stage: 1, isBoss: false, label: 'ST1', subLabel: '破断の執行者',
          enemyIds: ['rl_irish_midboss_breaker'],
          enemyRandomStartPosition: false, enemyActionMode: 'all', enemyActionsPerTurn: 1, turnLimit: 10,
        },
        {
          stage: 2, isBoss: false, label: 'ST2', subLabel: '崩砕の砲座',
          enemyIds: ['rl_irish_midboss_cannon'],
          enemyRandomStartPosition: false, enemyActionMode: 'all', enemyActionsPerTurn: 1, turnLimit: 11,
        },
        {
          stage: 3, isBoss: true, label: 'BOSS', subLabel: 'レムナント：イリシュ',
          enemyIds: ['enemy_irish_roguelite'],
          enemyRandomStartPosition: false, enemyActionMode: 'all', enemyActionsPerTurn: null, turnLimit: 14,
        },
      ],
    },


    rivia: {
      id: 'rivia',
      name: '記憶を失くす白き座',
      subName: 'レムナント：リヴィア',
      zakoBattleStartImg: 'images/remnant_03_zako_battle_start.webp',
      bossBattleStartImg: 'images/remnant_03_battle_start.webp',
      stageDefs: [
        {
          stage: 1, isBoss: false, label: 'ST1', subLabel: '忘却の槍使い',
          enemyIds: ['rl_rivia_zako_a', 'rl_rivia_zako_a'],
          enemyRandomStartPosition: false, enemyActionMode: 'limit', enemyActionsPerTurn: 2, turnLimit: 10,
        },
        {
          stage: 2, isBoss: false, label: 'ST2', subLabel: '消失の星詠み',
          enemyIds: ['rl_rivia_zako_b', 'rl_rivia_zako_a', 'rl_rivia_zako_b'],
          enemyRandomStartPosition: false, enemyActionMode: 'limit', enemyActionsPerTurn: 2, turnLimit: 11,
        },
        {
          stage: 3, isBoss: true, label: 'BOSS', subLabel: 'レムナント：リヴィア',
          enemyIds: ['enemy_rivia_roguelite'],
          enemyRandomStartPosition: false, enemyActionMode: 'all', enemyActionsPerTurn: null, turnLimit: 14,
        },
      ],
    },


    remnant05: {
      id: 'remnant05',
      name: '執着',
      subName: 'レムナント05',
      zakoBattleStartImg: 'images/remnant_05_battle_start.webp',
      bossBattleStartImg: 'images/remnant_05_battle_start.webp',
      stageDefs: [
        {
          stage: 1,
          isBoss: true,
          label: 'ST1',
          subLabel: '固執',
          enemyIds: ['enemy_remnant05_core'],
          enemyRandomStartPosition: false,
          enemyActionMode: 'all',
          enemyActionsPerTurn: null,
          turnLimit: 12,
          remnant05Config: {
            stage: 1,
            cloneEnemyId: 'enemy_remnant05_clone',
            enableCurse: false,
            enableRevive: false,
            hideCore: false,
            recoilRate: 0.20,
            curseRate: 0.20,
          },
        },
        {
          stage: 2,
          isBoss: true,
          label: 'ST2',
          subLabel: '怨念',
          enemyIds: ['enemy_remnant05_core'],
          enemyRandomStartPosition: false,
          enemyActionMode: 'all',
          enemyActionsPerTurn: null,
          turnLimit: 14,
          remnant05Config: {
            stage: 2,
            cloneEnemyId: 'enemy_remnant05_clone',
            enableCurse: true,
            enableRevive: true,
            hideCore: false,
            recoilRate: 0.20,
            curseRate: 0.20,
          },
        },
        {
          stage: 3,
          isBoss: true,
          label: 'ST3',
          subLabel: '本体隠匿',
          enemyIds: ['enemy_remnant05_core'],
          enemyRandomStartPosition: false,
          enemyActionMode: 'all',
          enemyActionsPerTurn: null,
          turnLimit: 16,
          remnant05Config: {
            stage: 3,
            cloneEnemyId: 'enemy_remnant05_clone',
            enableCurse: true,
            enableRevive: true,
            hideCore: true,
            recoilRate: 0.20,
            curseRate: 0.20,
          },
        },
      ],
    },

    debug_rivia_boss: {
      id: 'debug_rivia_boss', name: 'リヴィア戦（BOSS）', subName: 'CHAPTER 00 / DEBUG', debugOnly: true,
      bossBattleStartImg: 'images/remnant_03_battle_start.webp',
      stageDefs: [{ stage:1, isBoss:true, label:'BOSS', subLabel:'レムナント：リヴィア', enemyIds:['enemy_rivia_roguelite'], enemyRandomStartPosition:false, enemyActionMode:'all', enemyActionsPerTurn:null, turnLimit:14 }],
    },

    debug_irish_boss: {
      id: 'debug_irish_boss', name: 'イリシュ戦（BOSS）', subName: 'CHAPTER 00 / DEBUG', debugOnly: true,
      bossBattleStartImg: 'images/remnant_02_battle_start.webp',
      stageDefs: [{ stage:1, isBoss:true, label:'BOSS', subLabel:'レムナント：イリシュ', enemyIds:['enemy_irish_roguelite'], enemyRandomStartPosition:false, enemyActionMode:'all', enemyActionsPerTurn:null, turnLimit:14 }],
    },

    debug_overseer_boss: {
      id: 'debug_overseer_boss',
      name: 'オーバーシア戦（BOSS）',
      subName: 'CHAPTER 00 / DEBUG',
      debugOnly: true,
      bossBattleStartImg: 'images/remnant_01_battle_start.webp',
      stageDefs: [
        {
          stage: 1,
          isBoss: true,
          label: 'BOSS',
          subLabel: 'レムナント：オーバーシア',
          enemyIds: [
            'enemy_overseer_roguelite',
            'rl_overseer_servant_straight',
            'rl_overseer_servant_cross',
            'rl_overseer_servant_skip',
          ],
          enemyRandomStartPosition: false,
          enemyActionMode: 'all',
          enemyActionsPerTurn: null,
          turnLimit: 14,
        },
      ],
    },

    debug_sakiel_boss: {
      id: 'debug_sakiel_boss',
      name: 'サキエル戦（BOSS）',
      subName: 'CHAPTER 00 / DEBUG',
      debugOnly: true,
      bossBattleStartImg: 'images/remnant_04_battle_start.webp',
      stageDefs: [
        {
          stage: 1,
          isBoss: true,
          label: 'BOSS',
          subLabel: '大天使 サキエル',
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
          turnLimit: 12,
        },
      ],
    },

    sakiel: {
      id: 'sakiel',
      name: 'サキエル降臨',
      subName: '白翼の断罪者',
      zakoBattleStartImg: 'images/remnant_04_zako_battle_start.webp',
      bossBattleStartImg: 'images/remnant_04_battle_start.webp',
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
  function _newState(partyIds, runId, blessingId) {
    const runDef = getRunDef(runId || 'default');
    return {
      active:   true,
      runId:    runDef.id,
      runName:  runDef.name,
      debugOnly: runDef.debugOnly === true,
      stageNo:  1,
      options:  [],   // 取得済みOP オブジェクト（passive）
      items:    [],   // 取得済みアイテム（最大2枠）
      totalTurns: 0,  // ラン通算クリアターン数
      stageTurns: [], // 各ステージのクリアターン履歴
      partyIds: normalizeRoguelitePartyIds(partyIds),
      blessingId: blessingId || null,
      result:   null, // 'win' | 'lose'
    };
  }

  // ── 公開API ───────────────────────────────────────────────

  function start(partyIds, runId, blessingId) {
    _state = _newState(partyIds, runId, blessingId);
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
    const def = getStageDef();
    return !!(def && def.isBoss);
  }

  function getStageDef() {
    if (!_state) return null;
    const runDef = getRunDef(_state.runId);
    return runDef.stageDefs[_state.stageNo - 1] || null;
  }

  function getStageCount() {
    const runDef = getCurrentRunDef();
    return Array.isArray(runDef && runDef.stageDefs) ? runDef.stageDefs.length : 0;
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

  // ラン固有のSランク条件。
  // S条件を満たさない場合は、従来のTURN基準でA以下を判定する。
  const RUN_S_RANK_RULES = {
    overseer: { maxTurns: 20, minAlive: 0 },
    irish:    { maxTurns: 30, minAlive: 2 },
    rivia:    { maxTurns: 18, minAlive: 0 },
    sakiel:   { maxTurns: 20, minAlive: 3 },
  };

  function getClearRankConditions(runId) {
    const id = String(runId || (_state && _state.runId) || 'default');
    const sRule = RUN_S_RANK_RULES[id] || { maxTurns: 32, minAlive: 0 };
    const sParts = [];
    if (Number(sRule.minAlive || 0) > 0) sParts.push(`${Number(sRule.minAlive)}体以上生存`);
    sParts.push(`${Number(sRule.maxTurns)}TURN以内`);
    return [
      { rank: 'S', condition: sParts.join('かつ') },
      { rank: 'A', condition: 'S条件未達かつ35TURN以内' },
      { rank: 'B', condition: '36～38TURN' },
      { rank: 'C', condition: '39～41TURN' },
      { rank: 'D', condition: '42～45TURN' },
      { rank: 'E', condition: '46TURN以上' },
    ];
  }

  function getClearRank(totalTurns, context) {
    const t = Number(totalTurns || 0);
    const ctx = context || {};
    const runId = String(ctx.runId || (_state && _state.runId) || 'default');
    const aliveCount = Math.max(0, Number(ctx.aliveCount || 0));
    const sRule = RUN_S_RANK_RULES[runId];

    if (sRule) {
      const turnOk = t <= Number(sRule.maxTurns);
      const aliveOk = aliveCount >= Number(sRule.minAlive || 0);
      if (turnOk && aliveOk) return 'S';
    } else if (t <= 32) {
      // 未設定ランは従来仕様を維持。
      return 'S';
    }

    if (t <= 35) return 'A';
    if (t <= 38) return 'B';
    if (t <= 41) return 'C';
    if (t <= 45) return 'D';
    return 'E';
  }


  // アプリ再起動後、Battle32の保存スナップショットからラン進行を再構築する。
  // OPはJSON化で関数を失うため、IDからマスター定義へ戻す。
  function restoreFromBattleState(saved) {
    if (!saved || !saved.isRoguelite) return false;

    const runId = String(saved.rogueliteRunId || 'default');
    const runDef = getRunDef(runId);
    if (!runDef) return false;

    const rosterIds = Array.isArray(saved.roster)
      ? saved.roster.map(r => Number(r && r.charaId)).filter(Number.isFinite)
      : [];
    const partyIds = normalizeRoguelitePartyIds(rosterIds);

    const optionSnapshots = Array.isArray(saved.rogueliteOptions) ? saved.rogueliteOptions : [];
    const restoredOptions = optionSnapshots.map(op => {
      if (!op) return null;
      if (typeof window.getOptionById === 'function' && op.id) {
        const master = window.getOptionById(op.id);
        if (master) return master;
      }
      return op;
    }).filter(Boolean);

    const maxStage = Array.isArray(runDef.stageDefs) ? runDef.stageDefs.length : 1;
    const requestedStage = Math.max(1, Number(saved.rogueliteStageNo || 1));

    _state = {
      active: true,
      runId: runDef.id,
      runName: runDef.name,
      debugOnly: runDef.debugOnly === true,
      stageNo: Math.min(maxStage, requestedStage),
      options: restoredOptions,
      items: Array.isArray(saved.items) ? saved.items.map(i => ({ ...i })) : [],
      totalTurns: Math.max(0, Number(saved.rogueliteTotalTurns || 0)),
      stageTurns: Array.isArray(saved.rogueliteStageTurns) ? saved.rogueliteStageTurns.slice() : [],
      partyIds,
      blessingId: saved.blessing && saved.blessing.id ? saved.blessing.id : null,
      result: null,
    };

    console.log('[RogueliteRun] Battle32保存状態からラン復元:', _state);
    return true;
  }

  function advance() {
    if (!_state || !_state.active) return;
    const runDef = getRunDef(_state.runId);
    if (_state.stageNo < runDef.stageDefs.length) {
      _state.stageNo++;
      console.log('[RogueliteRun] 次ステージ:', _state.stageNo);
    }
  }

  function end(result, context) {
    if (!_state) return null;
    const ctx = context || {};
    _state.finalAliveCount = Math.max(0, Number(ctx.aliveCount || _state.finalAliveCount || 0));
    _state.active = false;
    _state.result = result;
    const snap = JSON.parse(JSON.stringify({
      runId: _state.runId,
      runName: _state.runName,
      debugOnly: _state.debugOnly === true,
      stageNo: _state.stageNo,
      options: _state.options.map(o => ({ id: o.id, name: o.name, icon: o.icon })),
      items: _state.items.map(i => ({ id: i.id, name: i.name, icon: i.icon })),
      totalTurns: _state.totalTurns || 0,
      stageTurns: _state.stageTurns ? _state.stageTurns.slice() : [],
      clearRank: getClearRank(_state.totalTurns || 0, { runId: _state.runId, aliveCount: _state.finalAliveCount || 0 }),
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
      blessingId: _state.blessingId || null,

      // 保持OPを渡す（battle_32.js 側で applyOnStart / applyOnEvent を呼ぶ）
      rogueliteOptions: _state.options.slice(),

      // 保持アイテムを渡す（Battle32側でspliceしてもラン状態が勝手に戻らないよう複製）
      rogueliteItems: _state.items.map(item => ({ ...item })),

      // ラン識別・現在ステージ
      rogueliteRunId: _state.runId,
      rogueliteStageNo: _state.stageNo,

      // ボスステージフラグ
      isBossStage: def.isBoss,

      // バトル開始前の専用画像。ステージ個別指定を最優先し、
      // 未指定時はラン定義の雑魚戦/BOSS戦画像を使う。
      stageIntroImage: def.battleStartImg
        || (def.isBoss ? getCurrentRunDef().bossBattleStartImg : getCurrentRunDef().zakoBattleStartImg)
        || null,

      // ターン制限・行動数
      turnLimit:         def.turnLimit          || 12,
      enemyActionMode:   def.enemyActionMode     || 'all',
      enemyActionsPerTurn: def.enemyActionsPerTurn ?? null,
      remnant05Config: def.remnant05Config ? { ...def.remnant05Config } : null,
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
    getStageCount,
    getRunId: () => _state ? _state.runId : null,
    getRunName: () => _state ? _state.runName : getCurrentRunDef().name,
    isDebugRun: () => !!(_state && _state.debugOnly),
    getOptions,
    getItems,
    consumeItem,
    setItems,
    addOption,
    addClearedStageTurn,
    getTotalTurns,
    getStageTurns,
    getClearRank,
    getClearRankConditions,
    restoreFromBattleState,
    advance,
    end,
    buildBattleConfig,
  };

})();
