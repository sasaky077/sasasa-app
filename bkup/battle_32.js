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
  const ALLY_MOVE_STEPS = 3;

  // ボス予兆攻撃の間隔（ターン数）
  const BOSS_WARN_INTERVAL = 4;
  // ボス予兆攻撃のダメージ倍率（ATK比）
  const BOSS_WARN_RATE = 0.90;

  // ============================================================
  // 内部状態
  // ============================================================
  let _bs = null;   // バトルステート
  let _cb = null;   // コールバック群

  // ============================================================
  // 演出ユーティリティ（UI との橋渡し）
  // ============================================================

  // ── テンポ定数（ここを変えると全体速度が変わる） ──
  const B32_WAIT = {
    turn:        2600,  // ALLY TURN / ENEMY TURN 大見出し
    guide:       2200,  // PLAYER ACTION など操作案内
    phase:       2200,  // MOVE PHASE / SKILL PHASE
    action:      2200,  // 敵 ACTION
    move:        1800,  // 敵 MOVE
    attack:      2200,  // 敵 ATTACK
    charEnd:     2200,  // キャラ行動終了
    turnEnd:     2600,  // ALLY TURN END / ENEMY TURN END
    enemyTurn:   2600,  // ENEMY TURN
    enemyAction: 2200,  // 敵ACTION宣言
    enemyEnd:    2400,  // ENEMY TURN END
    afterText:    300,  // テキスト消滅後の余韻（フェードが長くなった分を短縮）
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

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function calcDamage(atk, def, multiplier) {
    return Math.max(1, Math.floor(atk * multiplier - def * 0.5));
  }

  function getAllUnits() {
    return [..._bs.allies, ..._bs.enemies];
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

      // HP で生存管理（味方・敵ともに統一）
      hp:    charDef.hp,
      hpMax: charDef.hp,

      atk:  charDef.atk,
      def:  charDef.def,
      spd:  charDef.spd,
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

      isBoss: !!def.isBoss,
      hp: def.hp,
      hpMax: def.hpMax || def.hp,
      atk: def.atk,
      def: def.def,
      spd: def.spd,
      row,
      col,
      statusEffects: [],
      stunned: false,
      attackRange: def.attackRange || 'adjacent',
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
    hp: 2400,
    atk: 320,
    def: 200,
    spd: 150,
    attackRange: 'manhattan_3',
  },
  {
    id: 'mob1',
    name: '雑魚A',
    hp: 600,
    atk: 180,
    def: 100,
    spd: 180,
    attackRange: 'adjacent',
  },
  {
    id: 'mob2',
    name: '雑魚B',
    hp: 600,
    atk: 160,
    def: 120,
    spd: 160,
    attackRange: 'manhattan_2',
  },
];

  // ============================================================
  // バトル初期化
  // ============================================================
  function start(config, callbacks) {
    _cb = callbacks || {};

    const stageId = config.stageId || null;

    // --- 味方生成
    const allChars = window.CHARACTERS_32 || [];
    let chars = config.partyIds && config.partyIds.length
      ? config.partyIds.map(pid => allChars.find(c => c.id === pid)).filter(Boolean)
      : allChars.slice(0, 3);

    while (chars.length < 3 && allChars.length > 0) {
      chars.push(allChars[chars.length % allChars.length]);
    }

    const ALLY_POSITIONS = [
      { row: 6, col: 1 },
      { row: 6, col: 2 },
      { row: 6, col: 3 },
    ];
    const allies = chars.slice(0, 3).map((c, i) =>
      makeAlly(c, ALLY_POSITIONS[i].row, ALLY_POSITIONS[i].col)
    );

    // --- 敵生成
    const ENEMY_POSITIONS = [
  { row: 0, col: 2 }, // BOSS
  { row: 1, col: 1 },
  { row: 1, col: 3 },
];

    let enemyDefs;

    if (config.enemyIds && config.enemyIds.length > 0) {
      const resolved = config.enemyIds.map(id => {
        if (typeof getEnemyById === 'function') {
          return getEnemyById(id) || null;
        }
        return (window.ENEMIES || []).find(e => e.id === id) || null;
      }).filter(Boolean);

      enemyDefs = resolved.length > 0 ? resolved : DEFAULT_ENEMIES;
    } else {
      enemyDefs = config.enemies || DEFAULT_ENEMIES;
    }

    const enemies = enemyDefs.slice(0, ENEMY_POSITIONS.length).map((def, i) =>
      makeEnemy(def, ENEMY_POSITIONS[i].row, ENEMY_POSITIONS[i].col)
    );

    console.log('[Battle32] enemyDefs:', enemyDefs);
    console.log('[Battle32] enemies:', enemies);

    // captureMax は config で上書き可能（デフォルト2）
    const bossCaptureMax = config.bossCaptureMax || 2;

    _bs = {
      turn: 1,
      phase: 'skill',
      stageId,
      allies,
      enemies,
      log: [],
      bossWarnTurn: BOSS_WARN_INTERVAL,
      bossWarning: false,
      result: null,

      cores: {
        ally: {
          row: 7,
          col: 2,
          stability: 3,
          stabilityMax: 3,
        },
        // cores.enemy は廃止。ボス自身がコアを内包する仕様へ移行。
      },

      // ── 神性核（ボスコア）状態 ──
      bossCore: {
        exposed:    false,
        capture:    0,
        captureMax: bossCaptureMax,
        captured:   false,
      },

      turnLimit: 12,
    };

    _bs.allies.forEach(a => { a.skillUsedThisTurn = false; });

    _emit('start', { bs: _snapshot() });
    _emit('phaseChange', { phase: 'skill', bs: _snapshot() });
    // バトル開始時の演出は _startAllyTurnFlow() で管理
    _startAllyTurnFlow();
  }

  // ターン開始演出フロー（ALLY TURN → PLAYER ACTION → 操作解除）
  async function _startAllyTurnFlow() {
    _lockInput();
    _renderUI();
    await _centerTextWait('ALLY TURN', `TURN ${_bs.turn}`, B32_WAIT.turn);
    // await _centerTextWait('PLAYER ACTION', '移動するキャラを選択してください', B32_WAIT.guide);
    _unlockInput();
    _renderUI();
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
      cores: _bs.cores ? JSON.parse(JSON.stringify(_bs.cores)) : null,
      bossCore: _bs.bossCore ? { ..._bs.bossCore } : null,
      turnLimit: _bs.turnLimit,
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
  function applyDamage(target, rawDamage, source) {
    let dmg = rawDamage;

    // 結界：ダメージ軽減（味方のみ）
    if (target.side === 'ally' && target.shieldRate > 0) {
      dmg = Math.floor(dmg * (1 - target.shieldRate));
      target.shieldRate = 0;
      _log(`${target.name} の結界が発動！ダメージを軽減`);
    }

    // def_down：ダメージ 1.3 倍
    const defDown = target.statusEffects.some(e => e.type === 'def_down');
    if (defDown) dmg = Math.floor(dmg * 1.3);

    target.hp = Math.max(0, target.hp - dmg);
    _log(`${source ? source.name : '？'} → ${target.name} に ${dmg} ダメージ！（残HP: ${target.hp}）`);
    _emit('damage', {
      source: source ? { _uid: source._uid, name: source.name, side: source.side, row: source.row, col: source.col } : null,
      target: { _uid: target._uid, name: target.name, side: target.side, row: target.row, col: target.col },
      amount: dmg,
      kind: 'damage',
      bs: _snapshot(),
    });
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
    if (ally.skillUsedThisTurn) {
      _log(`${ally.name} は既にスキルを使用済みです`);
      return false;
    }

    const skill = ally.skills.find(s => s.id === skillId);
    if (!skill) return false;

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
    if (stype === 'attack') {
      const targets = _enemyTargets(skill.range);
      if (targets.length === 0) {
        noTargets = true;
        _log(`${ally.name}：範囲内に敵がいません`);
      } else {
        targets.forEach(enemy => {
          const dmg = calcDamage(ally.atk, enemy.def, skill.multiplier);
          applyDamage(enemy, dmg, ally);
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
            const dmg = calcDamage(ally.atk, enemy.def, skill.multiplier);
            applyDamage(enemy, dmg, ally);
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
    ally.skillUsedThisTurn = true;

    _emit('allyAction', { ally: { ...ally }, skill, bs: _snapshot() });

    _checkWinLose();
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

      // スキルフェーズ終了 → 敵フェーズ
      function endSkillPhase() {
      if (_bs.phase !== 'skill') return;

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
      _lockInput();
      _renderUI();
      await _centerTextWait('ALLY TURN END', '行動終了', B32_WAIT.turnEnd);
      await _centerTextWait('ENEMY TURN', '怪異の干渉を検知', B32_WAIT.enemyTurn);
      await _runEnemyPhase();   // 敵行動は _unlockInput を呼ばない（敵ターン中は常にロック）
    }
    function manhattan(a, b) {
      return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
    }
    function getEnemyAttackTargets(enemy) {
  const range = enemy.attackRange || 'adjacent';

  // 生存している味方のみ対象
  const allies = _bs.allies.filter(a => a.hp > 0);

  // 敵専用：マンハッタン距離による攻撃範囲
  if (range === 'manhattan_2') {
    return allies.filter(a => manhattan(enemy, a) <= 2);
  }

  if (range === 'manhattan_3') {
    return allies.filter(a => manhattan(enemy, a) <= 3);
  }

  // 既存射程は従来の BattleRange32 に任せる
  return BR.getUnitsFromRange32(enemy, range, _bs.allies)
    .filter(a => a.hp > 0);
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
  async function _runEnemyPhase() {
    const allies = aliveAllies();
    if (allies.length === 0) { _checkWinLose(); return; }

    // ボス予兆攻撃（行動ループより先に発動）
    if (_bs.turn % BOSS_WARN_INTERVAL === 0) {
      const boss = _bs.enemies.find(u => u.isBoss && u.hp > 0);
      if (boss) {
        await _centerTextWait('⚠️ WARNING', 'ボスが予兆攻撃…', B32_WAIT.enemyAction);
        _doBossWarnAttack(boss, getAllUnits());
        _renderUI();
        await wait(B32_WAIT.attack);
        await wait(B32_WAIT.afterText);
      }
    }

    // 行動順：雑魚 → ボスの順
    const mobs    = aliveEnemies().filter(e => !e.isBoss);
    const bosses  = aliveEnemies().filter(e =>  e.isBoss);

    const ordered = [...mobs, ...bosses];

    for (const enemy of ordered) {
      if (_bs.result) break;
      await _runEnemySingleAction(enemy);
      if (_bs.result) break;
    }

    _tickStatusEffects();
    _checkWinLose();
    if (_bs.result) return;

    // ENEMY TURN END
    await _centerTextWait('ENEMY TURN END', '干渉低下', B32_WAIT.enemyEnd);

    _nextTurn();
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
      const dmg = calcDamage(enemy.atk, target.def, 1.0);
      applyDamage(target, dmg, enemy);
      _renderUI();
      await wait(B32_WAIT.afterText);
      return;
    }

    // ボスは固定（射程外でも移動しない）
    if (enemy.isBoss) {
      // await _centerTextWait(enemy.name, 'NO ACTION', B32_WAIT.enemyAction);
      return;
    }

    // 雑魚のみ移動を試みる
    const nearest = BR.nearestUnit(enemy, _bs.allies.filter(u => u.hp > 0));
    if (nearest) {
      const moved = BR.stepToward(enemy, nearest, getAllUnits());
      if (moved) {
        _log(`${enemy.name} が近づいた`);
        _renderUI();
        await wait(B32_WAIT.afterText);
      }

      // 移動後に攻撃可能か再チェック
      const afterMoveTargets = getEnemyAttackTargets(enemy);
      if (afterMoveTargets.length > 0) {
        const target = afterMoveTargets.reduce((a, b) => a.hp < b.hp ? a : b);
        const dmg = calcDamage(enemy.atk, target.def, 1.0);
        applyDamage(target, dmg, enemy);
        _renderUI();
        await wait(B32_WAIT.afterText);
      }
    } else {
      // await _centerTextWait(enemy.name, 'NO ACTION', B32_WAIT.enemyAction);
    }
  }

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

      u.stunned = u.statusEffects.some(e => e.type === 'stun');
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

    // TODO: カード廃止後の通常移動処理をここに実装する

    _log(`═══ ターン ${_bs.turn} 開始 ═══`);
    _emit('turnStart', { turn: _bs.turn, bs: _snapshot() });
    _emit('phaseChange', { phase: 'skill', bs: _snapshot() });
    _startAllyTurnFlow();   // ALLY TURN → PLAYER ACTION → 操作解除
  }

  // ============================================================
  // 勝敗判定
  // ============================================================
  function _checkWinLose() {
    if (_bs.result) return;

    // 勝利条件：神性核の固定（ボスコア制圧）
    if (_bs.bossCore?.captured) {
      _bs.result = 'win';
      _bs.phase = 'end';
      _log('★ 神性核固定・収容完了！');
      _emit('result', { result: 'win', bs: _snapshot() });
      return;
    }

        if (_bs.cores?.ally?.stability <= 0) {
        _bs.result = 'lose';
        _bs.phase = 'end';
        _log('✕ 自陣コアが侵食された。収容失敗…');
        _emit('result', { result: 'lose', bs: _snapshot() });
        return;
       }

        if (_bs.turn > _bs.turnLimit) {
        _bs.result = 'lose';
        _bs.phase = 'end';
         _log('✕ 接続限界を超過。強制帰還…');
          _emit('result', { result: 'lose', bs: _snapshot() });
         return;
        }

      if (aliveAllies().length === 0) {
      _bs.result = 'lose';
      _bs.phase = 'end';
      _log('✕ 味方全滅。敗北…');
      _emit('result', { result: 'lose', bs: _snapshot() });
      return;
    }
  }
  // ============================================================
  // 移動可能セル取得（UI用）
  // ============================================================
  function getMovableCells(allyUid, maxSteps) {
    const ally = _bs.allies.find(u => u._uid === allyUid);
    if (!ally) return [];

    const allUnits = getAllUnits();
    const reachable = [];

    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const dist = BR.manhattanDist(ally, { row: r, col: c });
        if (dist > 0 && dist <= maxSteps) {
          if (BR.canMoveTo32(allUnits, r, c, ally)) {
            reachable.push({ row: r, col: c });
            }
          }
        }
      }
      return reachable;
    }
    function moveAlly(allyUid, toRow, toCol) {
      if (!_bs || _bs.phase !== 'skill') return false;

     const ally = _bs.allies.find(u => u._uid === allyUid);
      if (!ally || ally.hp <= 0 || ally.skillUsedThisTurn) return false;

      const maxSteps = ALLY_MOVE_STEPS;
      const movable = getMovableCells(allyUid, maxSteps);
      const ok = movable.some(c => c.row === toRow && c.col === toCol);

      if (!ok) {
       _log(`${ally.name} はそこへ移動できない`);
       return false;
      }

      ally.row = toRow;
      ally.col = toCol;

      _log(`${ally.name} が移動した`);
      _emit('move', { ally: { ...ally }, bs: _snapshot() });

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

    const cells = BR.getCellsFromRange32(ally, skill.range);

    // ユニット位置マップを作成（セル種別判定に使う）
    const unitMap = {};
    [..._bs.allies, ..._bs.enemies].forEach(u => {
      unitMap[`${u.row}-${u.col}`] = u;
    });

    const isEnemySkill = ['attack', 'debuff'].includes(skill.type);
    const isAllySkill  = ['heal', 'buff'].includes(skill.type);

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
  function endCharTurn(allyUid) {
    if (!_bs || _bs.phase !== 'skill') return false;
    const ally = _bs.allies.find(u => u._uid === allyUid);
    if (!ally || ally.hp <= 0 || ally.skillUsedThisTurn) return false;
    ally.skillUsedThisTurn = true;
    _log(`${ally.name} のターンを終了しました。`);
    _emit('charTurnEnd', { ally: { ...ally }, bs: _snapshot() });
    return true;
  }

  // ============================================================
  // 公開API
  // ============================================================
    window.Battle32 = {
  // 初期化
  start,

  // フェーズ操作
  endSkillPhase,
  endCharTurn,

  // アクション
  executeAllySkill,
  moveAlly,

  // UI補助
  getMovableCells,
  getSkillRangeCells,

  // 状態参照
  getState: () => _snapshot(),
  getBS: () => _bs,  // デバッグ用
};

    })();
