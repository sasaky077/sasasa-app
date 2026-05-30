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
    // 味方の生存判定は anima で行う
    return _bs.allies.filter(u => u.anima > 0);
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
    // アニマ初期値: キャラ定義に animaMax があればそれを使い、なければ 3 固定
    const animaMax   = charDef.animaMax   != null ? charDef.animaMax   : 3;
    const animaStart = charDef.animaStart != null ? charDef.animaStart : animaMax;

    return {
      _uid: uid(),
      id: charDef.id,
      name: charDef.name,
      rarity: charDef.rarity,
      role: charDef.role,
      side: 'ally',

      // ── アニマ（生存管理の主軸） ──
      anima:    animaStart,
      animaMax: animaMax,

      // ── hp / hpMax は互換用に保持（def 計算などに使用）──
      // 味方の生存判定には使わない
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
  // ダメージ処理（結界・スタン考慮）
  // 味方: anima を1減らす（数値ダメージではなくライフ制）
  // 敵:   hp を減らす（従来通り）
  // ============================================================
  function applyDamage(target, rawDamage, source) {
    let dmg = rawDamage;

    if (target.side === 'ally') {
      // ── 味方：結界・def_down を適用したうえで anima を1減らす ──
      if (target.shieldRate > 0) {
        // 結界がある場合はダメージを軽減し、結界消費。軽減後 dmg が高い閾値なら anima 減少
        dmg = Math.floor(dmg * (1 - target.shieldRate));
        target.shieldRate = 0;
        _log(`${target.name} の結界が発動！ダメージを軽減`);
        // 結界発動時はアニマを消費しない（ダメージを完全に受け止めた扱い）
        _log(`${source ? source.name : '？'} → ${target.name} の攻撃を結界で受けた！（ANIMA: ${target.anima}）`);
        _emit('damage', { target: { ...target }, dmg: 0, blocked: true, bs: _snapshot() });
        return;
      }

      const defDown = target.statusEffects.some(e => e.type === 'def_down');
      // def_down があれば anima を2減らす（通常は1）
      const animaDrain = defDown ? 2 : 1;
      target.anima = Math.max(0, target.anima - animaDrain);

      _log(`${source ? source.name : '？'} → ${target.name} の ANIMA が ${animaDrain} 減った！（残ANIMA: ${target.anima}）`);
      _emit('damage', { target: { ...target }, dmg: animaDrain, isAnima: true, bs: _snapshot() });

    } else {
      // ── 敵：従来通り hp を減らす ──
      const defDown = target.statusEffects.some(e => e.type === 'def_down');
      if (defDown) dmg = Math.floor(dmg * 1.3);

      target.hp = Math.max(0, target.hp - dmg);
      _log(`${source ? source.name : '？'} → ${target.name} に ${dmg} ダメージ！（残HP: ${target.hp}）`);
      _emit('damage', { target: { ...target }, dmg, bs: _snapshot() });
    }
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
    if (!ally || ally.anima <= 0) return false;
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

    ally.shinki -= (skill.shinkiCost || 0);

    _log(`${ally.name} が「${skill.name}」を発動！`);

    const allUnits = getAllUnits();

    if (skill.type === 'attack') {
      const rangeKey = skill.range === 'pierce_ally_3' ? 'pierce_ally_3'
                     : skill.range === 'adjacent'      ? 'adjacent'
                     : skill.range;
      const targets = BR.getUnitsFromRange32(ally, rangeKey, _bs.enemies);
      if (targets.length === 0) {
        _log(`${ally.name}：範囲内に敵がいません`);
      } else {
        targets.forEach(enemy => {
          const dmg = calcDamage(ally.atk, enemy.def, skill.multiplier);
          applyDamage(enemy, dmg, ally);
          (skill.effects || []).forEach(eff => {
            enemy.statusEffects.push({ type: eff.type, duration: eff.duration });
          });
        });
      }

    } else if (skill.type === 'heal') {
      const targets = BR.getUnitsFromRange32(ally, skill.range, _bs.allies)
        .filter(u => u.anima > 0);
      if (targets.length === 0) {
        _log(`${ally.name}：範囲内に味方がいません`);
      } else {
        targets.forEach(a => {
          // healRate が設定されている場合は animaMax を基準に回復量を算出
          // healRate が未設定（0）の場合は 1 固定
          const recover = skill.healRate > 0 ? Math.max(1, Math.round(a.animaMax * skill.healRate)) : 1;
          a.anima = Math.min(a.animaMax, a.anima + recover);
          _log(`${a.name} の ANIMA が ${recover} 回復！（残ANIMA: ${a.anima}）`);
        });
      }
    }

        //一旦無効　ally.shinki = Math.min(ally.shinkiMax, ally.shinki + 1);
        ally.skillUsedThisTurn = true;

        _emit('allyAction', { ally: { ...ally }, skill, bs: _snapshot() });

        _checkWinLose();
        return true;
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
  const allies = _bs.allies.filter(a => a.anima > 0);

  // 敵専用：マンハッタン距離による攻撃範囲
  if (range === 'manhattan_2') {
    return allies.filter(a => manhattan(enemy, a) <= 2);
  }

  if (range === 'manhattan_3') {
    return allies.filter(a => manhattan(enemy, a) <= 3);
  }

  // 既存射程は従来の BattleRange32 に任せる
  return BR.getUnitsFromRange32(enemy, range, _bs.allies)
    .filter(a => a.anima > 0);
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
        a.anima > 0 && manhattan(a, boss) === 1
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
      // 射程内に味方がいる → 攻撃
      const target = rangeTargets.reduce((a, b) => a.anima < b.anima ? a : b);
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
    const nearest = BR.nearestUnit(enemy, _bs.allies.filter(u => u.anima > 0));
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
        const target = afterMoveTargets.reduce((a, b) => a.anima < b.anima ? a : b);
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
      if (ally.anima <= 0) return;
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
      if (u.anima > 0) u.shinki = Math.min(u.shinkiMax, u.shinki + 1);
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
      if (!ally || ally.anima <= 0 || ally.skillUsedThisTurn) return false;

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
    return Array.from(cells).map(key => {
      const [r, c] = key.split('-').map(Number);
      return { row: r, col: c };
    });
  }

  // ============================================================
  // キャラ単位のターン終了（スキルなしで行動終了）
  // ============================================================
  function endCharTurn(allyUid) {
    if (!_bs || _bs.phase !== 'skill') return false;
    const ally = _bs.allies.find(u => u._uid === allyUid);
    if (!ally || ally.anima <= 0 || ally.skillUsedThisTurn) return false;
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
