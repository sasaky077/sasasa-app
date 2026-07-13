// battle_32_ui.js
// Battle32 の状態を画面に描画するUIレイヤー
// 依存: battle_32.js（Battle32グローバル）
// battle.js / battle_range.js / battle_swipe.js には一切触れない
//
// 公開API:
// renderBattle32UI() — 現在の Battle32.getState() を読んで全画面再描画
// closeBattle32UI() — UI全体を非表示にしてマップ画面へ戻す

(function () {

 // ============================================================
 // 定数
 // ============================================================
 const ROOT_ID = 'battle32-root';
 const STYLE_ID = 'battle32-ui-style';
 const SUMMON_LINK_COST = 6; // UI fallback. 実コストはBattle32.getLinkCostForAction('summon')を優先

 const PHASE_LABEL = {
 skill: 'SKILL PHASE',
 enemy: 'ENEMY PHASE',
 end: 'BATTLE END',
 };
 const PHASE_COLOR = {
 skill: '#e8c87a',
 enemy: '#d07878',
 end: '#a0a0a0',
 };

 // ============================================================
 // ステート — スキル操作
 // ============================================================
 let _selMoveAllyUid = null; // 移動対象キャラ（移動先選択中）
 let _moveMode = false; // 移動先マス選択中フラグ
 let _selSkillAllyUid = null; // スキル使用キャラ（移動後に改めて選択）
 let _selSkillId = null;
 let _selActionAllyUid = null; // 行動選択メニューを表示中の味方キャラ
 let _selectedEnemyUid = null; // 敵情報表示・移動/攻撃ガイド対象
 let _selectedEnemyGuideMode = null; // null | 'move' | 'attack'

 // 敵情報パネルのドラッグ位置（バトル中だけ保持）
 let _enemyQuickInfoPos = null; // { x, y } viewport px
 let _enemyQuickInfoDragging = false;

 // コンボ説明パネルのドラッグ位置（バトル中だけ保持）
 let _comboInspectPos = null; // { x, y } viewport px
 let _comboInspectDragging = false;
 let _comboInspectDismissedUid = null; // ×で閉じたキャラ。別キャラ選択まで再表示しない

// ============================================================
// ステート — 召喚 / アイテム操作
// ============================================================
let _summonMode = false;
let _summonRosterId = null;

let _selectedRosterId = null; // キャラ情報表示用

let _itemMode = false;
let _itemSlotIndex = null;
let _itemPhase = null;       // 'target' | 'cell'
let _itemTargetUid = null;

 function _resetSkillState() {
 _selMoveAllyUid = null;
 _selSkillAllyUid = null;
 _selSkillId = null;
 _moveMode = false;
 _selActionAllyUid = null;
 _selectedEnemyUid = null;
 _selectedEnemyGuideMode = null;

 _selectedRosterId = null;

 const box = document.getElementById('b32-skill-detail-box');
 if (box) {
 box.style.display = 'none';
 box.classList.remove('show');
 }

 _hideActionDetailPortal();
 }

 // ============================================================
 // ヘルパー
 // ============================================================
 function initial(name) { return (name || '?')[0]; }

 function hpColor(hp, hpMax) {
 const r = hp / hpMax;
 if (r > 0.6) return '#5ad48a';
 if (r > 0.3) return '#e8c87a';
 return '#d07878';
 }

 function _bs() {
 return window.Battle32 && window.Battle32.getState ? window.Battle32.getState() : null;
 }

 // ============================================================
 // スキル詳細レイヤー
 // ============================================================
 // #b32-roster-panel は body 直下 fixed + 高い z-index で描画されるため、
 // #battle32-root 配下のままだとスキル詳細がキャラパネルの背面に回る。
 // スキル詳細だけ body 直下へ移動し、独立した前面レイヤーとして扱う。
 function _ensureSkillDetailLayer() {
   const box = document.getElementById('b32-skill-detail-box');
   if (!box) return null;

   if (box.parentElement !== document.body) {
     document.body.appendChild(box);
   }

   return box;
 }

 // ============================================================
 // スキル詳細ポータル — body 直下に固定レイヤーとして描画する
 // #b32-roster-panel より確実に前面に出すため body 直下に置く
 // ============================================================
 function _ensureActionDetailPortal() {
   let el = document.getElementById('b32-action-detail-portal');
   if (!el) {
     el = document.createElement('div');
     el.id = 'b32-action-detail-portal';
     document.body.appendChild(el);
   }
   return el;
 }

 function _positionActionDetailPortal() {
   const el = document.getElementById('b32-action-detail-portal');
   if (!el) return;

   const root = document.getElementById(ROOT_ID);
   const actions = document.getElementById('b32-actions');
   const isSE = !!(root && root.classList.contains('b32-vp-se'));

   // スキル/ULT詳細は「下の余白」を使う。
   // 以前は CSS の !important bottom が勝ち、SEでグリッド下段に被っていたため、
   // JS 側も !important 付きでアクションボタン直上へ吸着させる。
   let bottomPx = isSE ? 4 : 6;
   if (actions && getComputedStyle(actions).display !== 'none') {
     bottomPx += actions.offsetHeight || 0;
   }

   el.classList.toggle('is-se', isSE);
   el.style.setProperty('bottom', `${Math.max(4, bottomPx)}px`, 'important');
   el.style.setProperty('left', '50%', 'important');
   el.style.setProperty('transform', 'translateX(-50%)', 'important');
 }

 function _hideActionDetailPortal() {
   const el = document.getElementById('b32-action-detail-portal');
   if (el) {
     el.innerHTML = '';
     el.classList.remove('show');
     el.style.display = 'none';
   }
 }

 // ============================================================
 // LINK ベース行動可否判定ヘルパー（UI表示・押下可否用）
 // ※ 実際のLINK消費は battle_32.js 側で行う
 // ============================================================

 /**
  * LINKが足りるか（UI表示・disabled判定用）
  * LINK未導入の通常Battle32では常にtrue（後方互換）
  */
 function _canActByLink(bs, cost) {
   if (!bs || bs.result || bs.phase !== 'skill') return false;
   if (!bs.link) return true; // 通常Battle32互換：LINKなしは常に行動可
   const need = Number(cost || 0);
   const current = Number(bs.link.current || 0);
   return current >= need;
 }

 function _getSkillLinkCost(skill) {
   if (!skill) return 0;
   if (skill.linkCost != null) {
     const n = Number(skill.linkCost);
     if (Number.isFinite(n)) return Math.max(0, n);
   }
   return skill.isUltimate ? 3 : 2;
 }

 function _getSkillLinkCostForUnit(bs, allyUid, skill) {
  if (!skill) return 0;

  if (window.Battle32 && typeof window.Battle32.getLinkCostForAction === 'function') {
    const type = skill.isUltimate ? 'ult' : 'skill';
    const n = Number(window.Battle32.getLinkCostForAction(type, allyUid, skill.id));

    // 99などの異常値・使用不可用ダミー値は、表示上は本来のコストに戻す
    if (Number.isFinite(n) && n >= 0 && n < 90) {
      return n;
    }
  }

  return _getSkillLinkCost(skill);
}



 function _getSummonLinkCostForRoster(bs, rosterEntry) {
   if (!rosterEntry) return SUMMON_LINK_COST;

   if (window.Battle32 && typeof window.Battle32.getLinkCostForAction === 'function') {
     const n = Number(window.Battle32.getLinkCostForAction('summon', rosterEntry.rosterId));
     if (Number.isFinite(n) && n >= 0) return n;
   }

   // battle_32.js 側の定義に合わせた後方互換。現行キャラは基本URなので実質6。
   const rarity = String(rosterEntry.rarity || rosterEntry.charDef?.rarity || '').toLowerCase();
   const byRarity = { r: 4, sr: 5, ur: 6 };
   return byRarity[rarity] || SUMMON_LINK_COST;
 }

 function _getNormalSkillLinkRange(ally) {
   const costs = (ally && ally.skills || [])
     .filter(s => !s.isUltimate)
     .map(s => _getSkillLinkCostForUnit(_bs(), ally._uid, s))
     .filter(n => Number.isFinite(n));
   if (!costs.length) return '-';
   const min = Math.min(...costs);
   const max = Math.max(...costs);
   return min === max ? String(min) : `${min}-${max}`;
 }


 const UNIT_ACTION_MAX_PER_TURN = 2;

 /**
  * ユニットのターン内行動数を返す。
  * 現仕様：1キャラ最大2行動、移動1回 + スキル/ULT1回まで。
  */
 function _getUnitActionCount(bs, unitUid) {
   const h = (bs && bs.unitActionHistory && bs.unitActionHistory[unitUid]) || {};
   const explicit = Number(h.actionCount);
   if (Number.isFinite(explicit) && explicit > 0) return explicit;

   // 後方互換：古い保存データ用
   let count = 0;
   if (h.move) count += 1;
   if (h.skill || h.ult || h.skillOrUlt) count += 1;
   if (h.unitActionDone && count === 0) count = UNIT_ACTION_MAX_PER_TURN;
   return count;
 }

 /**
  * ユニットがこのターンまだ追加行動できるか。
  */
 function _unitCanAct(bs, unitUid) {
   const h = (bs && bs.unitActionHistory && bs.unitActionHistory[unitUid]) || {};
   return !h.unitActionDone && _getUnitActionCount(bs, unitUid) < UNIT_ACTION_MAX_PER_TURN;
 }

 function _unitCanMoveNow(bs, unitUid) {
   const h = (bs && bs.unitActionHistory && bs.unitActionHistory[unitUid]) || {};
   return _unitCanAct(bs, unitUid) && !h.move;
 }

 function _unitCanUseSkillActionNow(bs, unitUid) {
   const h = (bs && bs.unitActionHistory && bs.unitActionHistory[unitUid]) || {};
   return _unitCanAct(bs, unitUid) && !(h.skill || h.ult || h.skillOrUlt);
 }

 /**
  * 実際にスキル/ULTを発動できるか。
  * 情報表示・スキル内容確認は行動上限到達後も許可し、
  * 発動だけをこの判定で止める。
  */
 function _canUseSkillNow(bs, ally, skill) {
   if (!bs || bs.result || bs.phase !== 'skill') return false;
   if (!ally || ally.hp <= 0 || !skill) return false;
   if (!_unitCanUseSkillActionNow(bs, ally._uid)) return false;

   const linkCost = _getSkillLinkCostForUnit(bs, ally._uid, skill);
   if (!_canActByLink(bs, linkCost)) return false;

   const shinkiCost = skill.isUltimate
     ? (skill.shinkiCost || ally.shinkiMax || 3)
     : (skill.shinkiCost || 0);
   if ((ally.shinki || 0) < shinkiCost) return false;

   return true;
 }

 function _getActiveActionAllyUid() {
  return _selActionAllyUid || _selMoveAllyUid || _selSkillAllyUid || null;
}

function _clearActionModesKeepUnit(uid) {
  _selActionAllyUid = uid || null;
  _selMoveAllyUid = null;
  _selSkillAllyUid = null;
  _selSkillId = null;
  _moveMode = false;

  // 召喚・アイテム状態も解除
  _summonMode = false;
  _itemMode = false;
  _itemSlotIndex = null;
  _itemPhase = null;
  _itemTargetUid = null;
}

// ============================================================
// アイテムパネル位置調整
// ============================================================
// #b32-item-panel は body 直下 fixed のため、#battle32-root 配下のCSSだけでは
// ロスター（キャラパネル）の上へ積み上げにくい。
// iPhone14/SE系では「グリッド → item → キャラパネル」の順に見えるよう、
// ロスター実測位置を基準にアイテム欄を配置する。
function _positionItemPanel() {
  const el = document.getElementById('b32-item-panel');
  if (!el) return;

  const root = document.getElementById(ROOT_ID);
  const roster = document.getElementById('b32-roster-panel');
  const isPhoneNarrow = !!(root && (root.classList.contains('b32-vp-iphone14') || root.classList.contains('b32-vp-se')));

  if (!isPhoneNarrow) {
    el.style.left = 'auto';
    el.style.right = '8px';
    el.style.transform = 'none';
    el.style.bottom = 'calc(270px + env(safe-area-inset-bottom, 0px))';
    el.style.flexDirection = 'column';
    return;
  }

  // iPhone14/SE系：キャラパネルの直上、中央寄せ。
  // roster がまだ未計測の瞬間だけCSS変数のフォールバックを使う。
  let bottomPx = null;
  if (roster && getComputedStyle(roster).display !== 'none') {
    const rr = roster.getBoundingClientRect();
    if (rr.height > 0 && rr.top > 0) {
      // item の下端を roster 上端の少し上に置く。
      bottomPx = Math.max(0, window.innerHeight - rr.top + 6);
    }
  }

  el.style.left = '50%';
  el.style.right = 'auto';
  el.style.transform = 'translateX(-50%)';
  el.style.bottom = bottomPx != null
    ? `${bottomPx}px`
    : 'calc(var(--b32-actions-h, 74px) + 96px + 10px + env(safe-area-inset-bottom, 0px))';
  el.style.flexDirection = 'row';
}

 // ============================================================
 // repeat_skill（リプレイ）用：コピー元スキルを解決するヘルパー
 // UI表示専用。実際の発動処理は battle_32.js 側が担う。
 // ============================================================
 function resolvePreviewSkillForRangeGuide(skill) {
   if (!skill || skill.type !== 'repeat_skill') return skill;

   // getBS() で _bs に直接アクセス（lastAllySkillThisTurn はスナップショット外）
   const rawBs = window.Battle32 && typeof window.Battle32.getBS === 'function'
     ? window.Battle32.getBS()
     : null;
   const last = rawBs && rawBs.lastAllySkillThisTurn;

   if (!last || !last.skill) return null; // コピー元なし → ガイド非表示

   const copied = last.skill;

   // コピー不可スキルはプレビューしない
   if (
     copied.type === 'repeat_skill' ||
     copied.type === 'delayed_attack' ||
     copied.isUltimate
   ) {
     return skill; // フォールバック：self のまま
   }

   console.log('[B32 RepeatSkill Preview]', {
     user: null,
     repeatSkill: skill.name,
     copiedFrom: last.ownerName,
     copiedSkill: copied.name,
     range: copied.range,
     type: copied.type,
   });

   return copied;
 }

 // cellType 付き Map を返す: key = "row-col", value = cellType
 function _skillRangeCells(allyUid, skillId) {
   if (!window.Battle32 || !window.Battle32.getSkillRangeCells) return new Map();

   // ── repeat_skill（リプレイ）の場合はUI側でレンジを差し替える ──
   const rawBs = typeof window.Battle32.getBS === 'function' ? window.Battle32.getBS() : null;
   const ally = rawBs && rawBs.allies.find(u => u._uid === allyUid);
   const skill = ally && ally.skills.find(s => s.id === skillId);

   if (skill && skill.type === 'repeat_skill' && window.BattleRange32) {
     const previewSkill = resolvePreviewSkillForRangeGuide(skill);

     // コピー元なし → 空Map（ガイドなし）
     if (!previewSkill) return new Map();

     // コピー元あり → アイムの位置を起点に previewSkill.range でセル計算
     if (previewSkill !== skill) {
       const cellsSet = window.BattleRange32.getCellsFromRange32(ally, previewSkill.range);
       const map = new Map();
       const isEnemySkill = ['attack', 'debuff'].includes(previewSkill.type);
       const isAllySkill  = ['heal', 'buff', 'ally_reposition'].includes(previewSkill.type);

       // unitMap（セル種別判定用）
       const unitMap = {};
       [
         ...(rawBs.allies || []).filter(u => u.hp > 0),
         ...(rawBs.enemies || []).filter(u => u.hp > 0 || u.isBoss),
       ].forEach(u => { unitMap[`${u.row}-${u.col}`] = u; });

       cellsSet.forEach(key => {
         const unit = unitMap[key] || null;
         let cellType = 'range';
         if (unit) {
           if (isEnemySkill && unit.side === 'enemy' && unit.hp > 0) cellType = 'target_enemy';
           else if (isAllySkill && unit.side === 'ally' && unit.hp > 0) cellType = 'target_ally';
         }
         map.set(key, cellType);
       });
       return map;
     }
     // previewSkill === skill（コピー不可 → self のまま通常ルートへ）
   }

   // 通常スキル：既存ルート
   const cells = window.Battle32.getSkillRangeCells(allyUid, skillId);
   const map = new Map();
   cells.forEach(c => map.set(`${c.row}-${c.col}`, c.cellType || 'range'));
   return map;
 }

 function enemyMoveLabel(moveType) {
 const map = {
 none: '移動なし',
 enemy_move_straight: '直進型',
 enemy_zako_straight: '直進型',
 enemy_move_diag: '斜行型',
 enemy_zako_diag: '斜行型',
 enemy_move_random: 'ランダム移動',
 enemy_zako_shift: 'シフト型',
 enemy_midboss_front3: '前方制圧型',
 };
 return map[moveType] || moveType || '不明';
}

function enemyAttackLabel(attackRange) {
 const map = {
 enemy_attack_front: '前方攻撃',
 enemy_attack_cross: '十字攻撃',
 enemy_attack_line: '直線攻撃',
 enemy_attack_all: '全体攻撃',
 };
 return map[attackRange] || attackRange || '不明';
}

const B32_ELEMENT_LABELS = {
  logos: 'ロゴス',
  chaos: 'ケイオス',
  mystis: 'ミスティス',
};

const B32_ELEMENT_ORDER = ['logos', 'mystis', 'chaos'];

function normalizeUnitElements(element) {
  if (window.Battle32 && typeof window.Battle32.normalizeElements === 'function') {
    const list = window.Battle32.normalizeElements(element);
    if (Array.isArray(list) && list.length) return list;
  }

  if (Array.isArray(element)) {
    return [...new Set(element.map(v => String(v || '').trim()).filter(Boolean))]
      .filter(v => B32_ELEMENT_LABELS[v]);
  }

  if (typeof element === 'string') {
    const raw = element.trim();
    if (!raw) return [];
    const parts = raw
      .split(/[+,\s/|]+|_/)
      .map(v => v.trim())
      .filter(Boolean)
      .filter(v => B32_ELEMENT_LABELS[v]);
    if (parts.length) return [...new Set(parts)];
    return B32_ELEMENT_LABELS[raw] ? [raw] : [];
  }

  return [];
}

function unitElementKey(element) {
  if (window.Battle32 && typeof window.Battle32.getElementKey === 'function') {
    const key = window.Battle32.getElementKey(element);
    if (key) return key;
  }

  const list = normalizeUnitElements(element);
  return B32_ELEMENT_ORDER
    .filter(e => list.includes(e))
    .join('_');
}

function unitElementLabel(element) {
  if (window.Battle32 && typeof window.Battle32.getElementLabel === 'function') {
    return window.Battle32.getElementLabel(element);
  }

  const list = normalizeUnitElements(element);
  if (!list.length) return element || '無属性';
  return B32_ELEMENT_ORDER
    .filter(e => list.includes(e))
    .map(e => B32_ELEMENT_LABELS[e])
    .join('+');
}

function unitElementIcon(element) {
  const key = unitElementKey(element);
  const map = {
    chaos:  'images/icon_chaos.webp',
    logos:  'images/icon_logos.webp',
    mystis: 'images/icon_mystis.webp',

    logos_mystis: 'images/icon_logos_mystis.webp',
    logos_chaos: 'images/icon_logos_chaos.webp',
    mystis_chaos: 'images/icon_mystis_chaos.webp',
    logos_mystis_chaos: 'images/icon_logos_mystis_chaos.webp',
  };
  return map[key] || '';
}

function unitElementClass(element) {
  const key = unitElementKey(element);
  return key || 'none';
}


function b32EscapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function b32SkillTypeLabel(skill) {
  const map = {
    attack: '攻撃',
    heal: '回復',
    buff: '強化',
    debuff: '弱体',
    repeat_skill: '再演',
    delayed_attack: '予約攻撃',
    random_cell_attack: 'ランダム攻撃',
    summon_object: '召喚',
    ally_reposition: '位置移動'
  };
  return map[skill?.type] || skill?.type || '—';
}

function b32RangeLabel(range) {
  const map = {
    self: '自身',
    ally_all: '味方全体',
    enemy_all: '敵全体',
    front1: '前方1マス',
    front2: '前方2マス',
    front3: '前方3マス',
    pierce3: '前方直線3マス',
    around8: '周囲1マス',
    around24: '周囲2マス',
    diag_x_1: 'X字1マス',
    diag_x_2: 'X字2マス',
    side_lr: '左右1マス',
    field_all: '盤面全体',
    field_cross_center: '中央十字',
    fan_2row_3_ally: '前方扇状',
    front_row_3_ally: '前方横3マス',
    front_and_side_3_ally: '前方1・左右1マス',
    super_but_night_6: '前方特殊範囲',
    front_line_all_ally: '前方同列すべて',
    combo_line_all: '直線上すべて',
    combo_cross_all: '十字すべて',
    combo_x_all: 'X字すべて',
    combo_star_all: '十字＋X字すべて',
    combo_around8: '周囲8マス'
  };
  return map[range] || range || '—';
}



function b32ComboRangeCells(ally) {
  const map = new Map();
  if (!ally || !ally.combo || !ally.combo.skill) return map;

  let cells = [];
  if (window.Combo32 && typeof window.Combo32.getRangeCells === 'function') {
    cells = window.Combo32.getRangeCells(ally, ally.combo.range);
  } else {
    const id = ally.combo.range;
    if (id === 'combo_line_all') {
      for (let row = 0; row < 8; row++) {
        if (row !== ally.row) cells.push({ row, col: ally.col });
      }
    } else if (id === 'combo_cross_all') {
      for (let row = 0; row < 8; row++) {
        if (row !== ally.row) cells.push({ row, col: ally.col });
      }
      for (let col = 0; col < 5; col++) {
        if (col !== ally.col) cells.push({ row: ally.row, col });
      }
    } else if (id === 'combo_x_all') {
      [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => {
        let row = ally.row + dr, col = ally.col + dc;
        while (row >= 0 && row < 8 && col >= 0 && col < 5) {
          cells.push({ row, col });
          row += dr; col += dc;
        }
      });
    } else {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const row = ally.row + dr, col = ally.col + dc;
          if (row >= 0 && row < 8 && col >= 0 && col < 5) cells.push({ row, col });
        }
      }
    }
  }

  cells.forEach(c => map.set(`${c.row}-${c.col}`, 'combo-range'));
  return map;
}


function b32ComboSkillRangeCells(ally, bs) {
  const map = new Map();
  const comboSkill = ally && ally.combo && ally.combo.skill;
  if (!ally || !comboSkill || !comboSkill.range) return map;
  if (!window.BattleRange32 || typeof window.BattleRange32.getCellsFromRange32 !== 'function') {
    return map;
  }

  let keys = null;

  // コンボ専用4レンジはCombo32の同一計算を使う。
  if (
    window.Combo32 &&
    typeof window.Combo32.getRangeCells === 'function' &&
    ['combo_line_all', 'combo_cross_all', 'combo_x_all', 'combo_star_all', 'combo_around8'].includes(comboSkill.range)
  ) {
    keys = new Set(
      window.Combo32.getRangeCells(ally, comboSkill.range)
        .map(cell => `${cell.row}-${cell.col}`)
    );
  } else {
    keys = window.BattleRange32.getCellsFromRange32(ally, comboSkill.range);
  }

  if (!keys || typeof keys.forEach !== 'function') return map;

  const isEnemyEffect = ['attack', 'debuff'].includes(comboSkill.type);
  const isAllyEffect = ['heal', 'buff', 'ally_reposition'].includes(comboSkill.type);

  const unitMap = {};
  [
    ...((bs && bs.allies) || []).filter(u => u && u.hp > 0),
    ...((bs && bs.enemies) || []).filter(u => u && (u.hp > 0 || u.isBoss)),
  ].forEach(u => {
    unitMap[`${u.row}-${u.col}`] = u;
  });

  keys.forEach(key => {
    const unit = unitMap[key] || null;
    let cellType = 'range';

    if (unit) {
      if (isEnemyEffect && unit.side === 'enemy' && unit.hp > 0) {
        cellType = 'target_enemy';
      } else if (isAllyEffect && unit.side === 'ally' && unit.hp > 0) {
        cellType = 'target_ally';
      }
    }

    map.set(key, cellType);
  });

  return map;
}

function b32ComboRangeLabel(rangeId) {
  if (window.Combo32 && typeof window.Combo32.getRangeLabel === 'function') {
    return window.Combo32.getRangeLabel(rangeId);
  }
  const labels = {
    combo_line_all: '直線上すべて',
    combo_cross_all: '十字すべて',
    combo_x_all: 'X字すべて',
    combo_star_all: '十字＋X字すべて',
    combo_around8: '周囲8マス',
    combo_cross_4: '十字すべて',
    combo_front_4: '直線上すべて',
    combo_diagonal_4: 'X字すべて',
    combo_star_all: '十字＋X字すべて',
  };
  return labels[rangeId] || rangeId || '—';
}

function b32BuildComboSummaryHtml(ally) {
  const combo = ally && ally.combo;
  const skill = combo && combo.skill;
  if (!skill) return '';

  const multiplier = Number(skill.multiplier || 0);
  const damageText = multiplier > 0 ? `ATK×${multiplier}` : 'ダメージなし';
  const effects = (skill.effects || []).map(b32EffectSummary).filter(Boolean).join(' / ');
  const rangeText = b32RangeLabel(skill.range);
  const triggerRange = b32ComboRangeLabel(combo.range);

  return `
    <div class="b32-combo-inspect-head b32-combo-inspect-drag-handle">
      <span class="b32-combo-inspect-kicker">COMBO SKILL</span>
      <span class="b32-combo-inspect-owner">${b32EscapeHtml(ally.name || '')}</span>
      <button type="button"
              class="b32-combo-inspect-close"
              aria-label="コンボ説明を閉じる"
              onclick="event.preventDefault();event.stopPropagation();closeBattle32ComboInspect();">×</button>
    </div>
    <div class="b32-combo-inspect-name">${b32EscapeHtml(skill.name || 'COMBO')}</div>
    <div class="b32-combo-inspect-meta">
      <span>発動範囲：${b32EscapeHtml(triggerRange)}</span>
      <span>効果範囲：${b32EscapeHtml(rangeText)}</span>
      <span>${b32EscapeHtml(damageText)}</span>
      ${effects ? `<span>${b32EscapeHtml(effects)}</span>` : ''}
    </div>
    <div class="b32-combo-inspect-desc">${b32EscapeHtml(skill.desc || 'コンボレンジ内の味方がスキルまたはULTを使用すると発動する。')}</div>
    <div class="b32-combo-inspect-legend">
      <span class="trigger"><i></i>紫：発動レンジ</span>
      <span class="effect"><i></i>金：コンボ射程</span>
    </div>
  `;
}

function _ensureComboInspectStyle() {
  if (document.getElementById('b32-combo-inspect-style')) return;
  const style = document.createElement('style');
  style.id = 'b32-combo-inspect-style';
  style.textContent = `
    .b32-cell.combo-range {
      position: relative;
    }
    .b32-combo-range-overlay {
      position: absolute;
      inset: 2px;
      z-index: 24;
      pointer-events: none;
      box-sizing: border-box;
      border: 2px solid rgba(155, 92, 255, .96);
      border-radius: 4px;
      background:
        radial-gradient(circle at 50% 50%,
          rgba(202,166,255,.34) 0%,
          rgba(142,78,242,.22) 48%,
          rgba(112,52,210,.12) 70%,
          transparent 78%);
      box-shadow:
        inset 0 0 12px rgba(170,105,255,.42),
        0 0 10px rgba(137,70,240,.48);
      animation: b32ComboRangePulse 1.15s ease-in-out infinite;
    }

    /* コンボスキルの効果射程：金色。
       紫の発動レンジと重なっても見えるよう inset を内側へずらす。 */
    .b32-combo-skill-range-overlay {
      position: absolute;
      inset: 7px;
      z-index: 25;
      pointer-events: none;
      box-sizing: border-box;
      border: 2px solid rgba(255, 196, 76, .96);
      border-radius: 3px;
      background:
        radial-gradient(circle at 50% 50%,
          rgba(255,224,135,.30) 0%,
          rgba(255,183,55,.17) 50%,
          rgba(245,140,25,.08) 72%,
          transparent 80%);
      box-shadow:
        inset 0 0 9px rgba(255,203,92,.35),
        0 0 8px rgba(255,165,35,.44);
      animation: b32ComboSkillRangePulse 1.25s ease-in-out infinite;
    }
    .b32-combo-skill-range-overlay::after {
      content: '✦';
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      color: rgba(255,205,88,1);
      font-size: clamp(10px, 3vw, 15px);
      line-height: 1;
      font-weight: 800;
      text-shadow:
        0 0 4px rgba(255,255,230,.94),
        0 0 9px rgba(255,170,30,.96);
    }
    .b32-combo-skill-range-overlay.target_enemy {
      border-color: rgba(255,118,70,.98);
      background:
        radial-gradient(circle at 50% 50%,
          rgba(255,175,90,.35) 0%,
          rgba(255,89,50,.20) 55%,
          rgba(180,35,20,.09) 74%,
          transparent 82%);
      box-shadow:
        inset 0 0 10px rgba(255,98,55,.40),
        0 0 10px rgba(255,75,40,.52);
    }
    .b32-combo-skill-range-overlay.target_ally {
      border-color: rgba(255,225,110,.98);
    }
    .b32-cell:has(.b32-unit) .b32-combo-skill-range-overlay::after {
      top: 15%;
      font-size: 10px;
    }
    @keyframes b32ComboSkillRangePulse {
      0%,100% { opacity:.78; filter:brightness(.96); }
      50% { opacity:1; filter:brightness(1.18); }
    }

    .b32-combo-range-overlay::after {
      content: '◇';
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      color: rgba(166, 101, 255, 1);
      font-size: clamp(14px, 4vw, 20px);
      line-height: 1;
      font-weight: 800;
      text-shadow:
        0 0 5px rgba(255,255,255,.92),
        0 0 10px rgba(142,75,255,1);
    }
    .b32-cell.combo-range:has(.b32-unit) .b32-combo-range-overlay::after {
      top: 15%;
      font-size: 12px;
    }
    @keyframes b32ComboRangePulse {
      0%,100% { filter: brightness(.95); }
      50% { filter: brightness(1.18); }
    }
    #b32-combo-inspect {
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      bottom: auto;
      z-index: 4000000 !important;
      width: min(94vw, 520px);
      box-sizing: border-box;
      padding: 10px 12px 9px;
      border: 1px solid rgba(150,95,245,.48);
      border-radius: 10px;
      background: linear-gradient(155deg, rgba(25,14,45,.95), rgba(10,7,24,.96));
      box-shadow: 0 10px 28px rgba(18,7,35,.46), 0 0 24px rgba(126,65,225,.18);
      color: #efe9ff;
      pointer-events: auto;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    #b32-combo-inspect * {
      box-sizing: border-box;
    }
    #b32-combo-inspect .b32-combo-inspect-name,
    #b32-combo-inspect .b32-combo-inspect-meta,
    #b32-combo-inspect .b32-combo-inspect-desc {
      pointer-events: none;
    }
    .b32-combo-inspect-head {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      margin-bottom:3px;
      position:relative;
      padding-right:34px;
    }
    .b32-combo-inspect-drag-handle {
      cursor:grab;
      touch-action:none;
      -webkit-tap-highlight-color:transparent;
      user-select:none;
      -webkit-user-select:none;
    }
    #b32-combo-inspect.is-dragging .b32-combo-inspect-drag-handle,
    .b32-combo-inspect-drag-handle:active {
      cursor:grabbing;
    }
    .b32-combo-inspect-close {
      position:absolute;
      right:0;
      top:50%;
      transform:translateY(-50%);
      width:28px;
      height:28px;
      padding:0;
      border-radius:50%;
      border:1px solid rgba(210,185,255,.34);
      background:rgba(18,10,38,.88);
      color:rgba(245,238,255,.94);
      font-size:18px;
      line-height:26px;
      text-align:center;
      cursor:pointer;
      pointer-events:auto;
      touch-action:manipulation;
      z-index:4;
      box-shadow:0 0 10px rgba(130,70,235,.20);
    }
    .b32-combo-inspect-close:active {
      transform:translateY(-50%) scale(.92);
      background:rgba(90,45,150,.72);
    }
    #b32-combo-inspect.is-dragging {
      transition:none !important;
      opacity:.97;
    }
    .b32-combo-inspect-kicker {
      font-family:"Cinzel",serif;
      font-size:10px;
      font-weight:700;
      letter-spacing:.16em;
      color:#c8a7ff;
    }
    .b32-combo-inspect-owner {
      font-size:10px;
      color:rgba(235,225,255,.62);
    }
    .b32-combo-inspect-name {
      font-size:14px;
      font-weight:800;
      letter-spacing:.04em;
      color:#fff;
      margin-bottom:5px;
    }
    .b32-combo-inspect-meta {
      display:flex;
      flex-wrap:wrap;
      gap:4px 8px;
      margin-bottom:5px;
    }
    .b32-combo-inspect-meta span {
      font-size:9px;
      color:#d9c8ff;
      background:rgba(147,91,235,.12);
      border:1px solid rgba(160,108,245,.18);
      border-radius:999px;
      padding:2px 6px;
    }
    .b32-combo-inspect-desc {
      font-size:10px;
      line-height:1.45;
      color:rgba(240,234,255,.78);
    }
    .b32-combo-inspect-legend {
      display:flex;
      align-items:center;
      gap:12px;
      margin-top:6px;
      font-size:9px;
      color:rgba(240,234,255,.65);
    }
    .b32-combo-inspect-legend span {
      display:flex;
      align-items:center;
      gap:4px;
    }
    .b32-combo-inspect-legend i {
      display:inline-block;
      width:8px;
      height:8px;
      border-radius:2px;
      box-sizing:border-box;
    }
    .b32-combo-inspect-legend .trigger i {
      border:1.5px solid rgba(155,92,255,.98);
      box-shadow:0 0 5px rgba(145,82,255,.55);
    }
    .b32-combo-inspect-legend .effect i {
      border:1.5px solid rgba(255,196,76,.98);
      box-shadow:0 0 5px rgba(255,165,35,.55);
    }
    #battle32-root.b32-vp-se #b32-combo-inspect {
      padding:7px 9px;
      width:min(96vw, 500px);
    }
    #battle32-root.b32-vp-se .b32-combo-inspect-desc {
      font-size:9px;
      line-height:1.3;
    }

    /* 最終上書き：ローグライトキャラパネル(z-index:3000000)より前面 */
    html body #b32-combo-inspect {
      position: fixed !important;
      z-index: 4000000 !important;
      isolation: isolate !important;
      pointer-events: auto !important;
    }

    /* バトル演出はコンボウインドウより常に前面 */
    html body #b32-center-text,
    html body .b32-skill-name-burst,
    html body #b32-ult-cutin,
    html body .b32-ult-cutin,
    html body #b32-damage-layer,
    html body .b32-damage-popup {
      z-index: 5000000 !important;
    }
  `;
  document.head.appendChild(style);
}



function _getComboInspectViewportBounds() {
  const vv = window.visualViewport;
  return {
    offsetLeft: vv ? vv.offsetLeft : 0,
    offsetTop: vv ? vv.offsetTop : 0,
    width: vv ? vv.width : (window.innerWidth || document.documentElement.clientWidth || 0),
    height: vv ? vv.height : (window.innerHeight || document.documentElement.clientHeight || 0),
  };
}

function _clampComboInspectPosWithSize(pos, size) {
  const view = _getComboInspectViewportBounds();
  const margin = 8;
  const width = Math.max(80, Number(size?.width || 320));
  const height = Math.max(40, Number(size?.height || 100));
  const minX = view.offsetLeft + margin;
  const minY = view.offsetTop + margin;
  const maxX = Math.max(minX, view.offsetLeft + view.width - width - margin);
  const maxY = Math.max(minY, view.offsetTop + view.height - height - margin);

  return {
    x: Math.min(Math.max(Number(pos?.x || 0), minX), maxX),
    y: Math.min(Math.max(Number(pos?.y || 0), minY), maxY),
  };
}

function _setComboInspectLeftTop(el, pos) {
  if (!el || !pos) return;
  el.style.setProperty('position', 'fixed', 'important');
  el.style.setProperty('z-index', '4000000', 'important');
  el.style.setProperty('isolation', 'isolate', 'important');
  el.style.setProperty('left', `${pos.x}px`, 'important');
  el.style.setProperty('top', `${pos.y}px`, 'important');
  el.style.setProperty('right', 'auto', 'important');
  el.style.setProperty('bottom', 'auto', 'important');
  el.style.setProperty('transform', 'none', 'important');
}

function _applyComboInspectPos(el, pos) {
  if (!el || !pos) return;
  const rect = el.getBoundingClientRect();
  const p = _clampComboInspectPosWithSize(pos, rect);
  _comboInspectPos = p;
  _setComboInspectLeftTop(el, p);
}

let _comboInspectViewportWatchReady = false;

function _installComboInspectViewportWatch() {
  if (_comboInspectViewportWatchReady) return;
  _comboInspectViewportWatchReady = true;

  const reposition = () => {
    const el = document.getElementById('b32-combo-inspect');
    if (!el || !_comboInspectPos || _comboInspectDragging) return;
    _applyComboInspectPos(el, _comboInspectPos);
  };

  window.addEventListener('resize', reposition, { passive: true });
  window.addEventListener('orientationchange', reposition, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', reposition, { passive: true });
    window.visualViewport.addEventListener('scroll', reposition, { passive: true });
  }
}

function _installComboInspectDrag(el) {
  if (!el || el.dataset.dragReady === '1') return;

  const handle = el.querySelector('.b32-combo-inspect-drag-handle') || el;
  el.dataset.dragReady = '1';

  handle.addEventListener('pointerdown', (e) => {
    if (e.target && e.target.closest && e.target.closest('.b32-combo-inspect-close')) return;
    if (e.button != null && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = el.getBoundingClientRect();
    const start = {
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      x: rect.left,
      y: rect.top,
      size: {
        width: rect.width || el.offsetWidth || 320,
        height: rect.height || el.offsetHeight || 100,
      },
    };

    _comboInspectDragging = true;
    el.classList.add('is-dragging');
    el.style.transition = 'none';
    el.style.willChange = 'left, top';
    el.style.transform = 'none';

    try {
      handle.setPointerCapture(e.pointerId);
    } catch (err) {}

    function onMove(ev) {
      if (ev.pointerId !== start.pointerId) return;
      ev.preventDefault();
      ev.stopPropagation();

      const p = _clampComboInspectPosWithSize({
        x: start.x + (ev.clientX - start.sx),
        y: start.y + (ev.clientY - start.sy),
      }, start.size);

      _comboInspectPos = p;
      _setComboInspectLeftTop(el, p);
    }

    function onEnd(ev) {
      if (ev.pointerId !== start.pointerId) return;
      ev.preventDefault();
      ev.stopPropagation();

      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);

      try {
        handle.releasePointerCapture(start.pointerId);
      } catch (err) {}

      el.classList.remove('is-dragging');
      el.style.willChange = '';
      el.style.transition = '';

      setTimeout(() => {
        _comboInspectDragging = false;
      }, 0);
    }

    handle.addEventListener('pointermove', onMove, { passive:false });
    handle.addEventListener('pointerup', onEnd, { passive:false });
    handle.addEventListener('pointercancel', onEnd, { passive:false });
  }, { passive:false });
}

function _positionComboInspect() {
  const el = document.getElementById('b32-combo-inspect');
  if (!el) return;

  // 一度ドラッグした後も、キャラパネル位置が変わるたびに再クランプする。
  if (_comboInspectPos) {
    _applyComboInspectPos(el, _comboInspectPos);
    return;
  }

  const roster = document.getElementById('b32-roster-panel');
  const actions = document.getElementById('b32-actions');
  const vv = window.visualViewport || null;
  const viewportHeight = vv ? vv.height : (window.innerHeight || document.documentElement.clientHeight || 0);
  const viewportTop = vv ? vv.offsetTop : 0;

  let bottomPx = 8;
  if (roster && getComputedStyle(roster).display !== 'none') {
    const rect = roster.getBoundingClientRect();
    if (rect.height > 0 && rect.top > viewportTop) {
      bottomPx = Math.max(8, viewportHeight + viewportTop - rect.top + 8);
    }
  } else if (actions && getComputedStyle(actions).display !== 'none') {
    const rect = actions.getBoundingClientRect();
    bottomPx = Math.max(8, viewportHeight + viewportTop - rect.top + 8);
  }

  el.style.setProperty('bottom', `${bottomPx}px`, 'important');
  el.style.setProperty('top', 'auto', 'important');
}

function closeBattle32ComboInspect() {
  const el = document.getElementById('b32-combo-inspect');
  const bs = _bs();
  const uid = _selActionAllyUid || null;
  _comboInspectDismissedUid = uid;
  if (el) el.remove();
}
window.closeBattle32ComboInspect = closeBattle32ComboInspect;

function renderComboInspect(bs) {
  _ensureComboInspectStyle();

  let el = document.getElementById('b32-combo-inspect');
  const shouldShow = !!(
    bs &&
    bs.phase === 'skill' &&
    !bs.result &&
    _selActionAllyUid &&
    !_moveMode &&
    !_selSkillAllyUid &&
    !_selSkillId &&
    !_summonMode &&
    !_itemMode &&
    !_b32InputLocked
  );

  const ally = shouldShow
    ? (bs.allies || []).find(u => u._uid === _selActionAllyUid && u.hp > 0)
    : null;

  // 別キャラを選択したら、×で閉じた状態を解除する。
  if (ally && _comboInspectDismissedUid && _comboInspectDismissedUid !== ally._uid) {
    _comboInspectDismissedUid = null;
  }

  if (!ally || !ally.combo || !ally.combo.skill || _comboInspectDismissedUid === ally._uid) {
    if (el) el.remove();
    return;
  }

  if (!el) {
    el = document.createElement('div');
    el.id = 'b32-combo-inspect';

    // ローグライトのキャラパネルは body 直下・z-index:3000000。
    // 敵情報ウインドウと同じく body 直下の独立最前面レイヤーとして強制する。
    el.style.setProperty('position', 'fixed', 'important');
    el.style.setProperty('z-index', '4000000', 'important');
    el.style.setProperty('isolation', 'isolate', 'important');
    el.style.setProperty('pointer-events', 'auto', 'important');

    document.body.appendChild(el);
  } else {
    // 外部CSSや再描画で上書きされた場合も毎回復元する。
    el.style.setProperty('position', 'fixed', 'important');
    el.style.setProperty('z-index', '4000000', 'important');
    el.style.setProperty('isolation', 'isolate', 'important');
    el.style.setProperty('pointer-events', 'auto', 'important');
  }

  // DOM順でもキャラパネルより後ろに来るよう、body末尾へ移動する。
  // appendChild済み要素を再appendすると末尾へ移動する。
  if (el.parentElement !== document.body || el !== document.body.lastElementChild) {
    document.body.appendChild(el);
  }

  el.innerHTML = b32BuildComboSummaryHtml(ally);
  // innerHTML更新後はハンドルが作り直されるため、毎回ドラッグ設定を再装着する。
  el.dataset.dragReady = '';
  _installComboInspectViewportWatch();
  _installComboInspectDrag(el);
  _positionComboInspect();
  requestAnimationFrame(_positionComboInspect);
}


function b32PercentTextFromRate(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return '';
  if (n > 1) return `${Math.round((n - 1) * 100)}%`;
  return `${Math.round(n * 100)}%`;
}

function b32EffectTargetLabel(target) {
  const map = {
    ally_self: '自身',
    ally_all: '味方全体',
    ally: '味方',
    enemy: '敵',
    target: '対象',
  };
  return map[target] || '';
}

function b32EffectSummary(effect) {
  if (!effect) return '';
  const target = b32EffectTargetLabel(effect.target);
  const dur = effect.duration ? `${effect.duration}T` : '';
  const rate = Number(effect.rate);
  const rateUpText = Number.isFinite(rate) ? ` ${Math.round((rate - 1) * 100)}%` : '';
  const rateDownText = Number.isFinite(rate) ? ` ${Math.round((1 - rate) * 100)}%` : '';

  const prefix = target ? `${target}` : '';
  switch (effect.type) {
    case 'atk_up': return `${prefix}ATK+${rateUpText.trim() || ''}${dur ? `/${dur}` : ''}`;
    case 'atk_down': return `${prefix}ATK-${rateDownText.trim() || ''}${dur ? `/${dur}` : ''}`;
    case 'stun': return `${prefix}スタン${dur ? `/${dur}` : ''}`;
    case 'heal': return `${prefix}回復`;
    case 'poison': return `${prefix}毒${dur ? `/${dur}` : ''}`;
    case 'jittai': return `${prefix}実体化${dur ? `/${dur}` : ''}`;
    case 'sure_hit_self': return '自身必中';
    case 'sure_hit_team': return '味方全体必中';
    case 'pull_1': return '引き寄せ1';
    case 'pull_2': return '引き寄せ2';
    case 'push_1': return '押し出し1';
    case 'push_2': return '押し出し2';
    case 'push_3': return '押し出し3';
    case 'shift_right_1': return '右移動1';
    case 'shift_right_2': return '右移動2';
    case 'shift_left_1': return '左移動1';
    case 'shift_left_2': return '左移動2';
    case 'ally_shift_right_down': return '味方を右下へ移動';
    case 'ally_shift_left_down': return '味方を左下へ移動';
    default: return effect.type || '';
  }
}

function b32FindMasterSkillDef(skill, ally) {
  if (!skill) return null;

  let chara = null;
  const idCandidates = [
    ally?.charId,
    ally?.charaId,
    ally?.characterId,
    ally?.baseId,
    ally?.id,
    skill?.charId,
    skill?.charaId,
    skill?.characterId,
  ].filter(v => v != null);

  for (const id of idCandidates) {
    if (typeof getCharaById === 'function') {
      chara = getCharaById(id);
    }
    if (!chara && window.getCharaById) {
      chara = window.getCharaById(id);
    }
    if (chara) break;
  }

  const list = (typeof CHARACTERS !== 'undefined' && Array.isArray(CHARACTERS))
    ? CHARACTERS
    : (Array.isArray(window.CHARACTERS) ? window.CHARACTERS : []);

  if (!chara && list.length) {
    chara = list.find(c => idCandidates.some(id => String(c.id) === String(id))) || null;
  }

  if (!chara && ally?.name && list.length) {
    chara = list.find(c => c.name === ally.name) || null;
  }

  const skills = Array.isArray(chara?.skills) ? chara.skills : [];
  return skills.find(s => s.id === skill.id) || skills.find(s => s.name === skill.name) || null;
}

function b32GetSkillFieldFromMaster(skill, ally, key, fallbackValue) {
  const masterSkill = b32FindMasterSkillDef(skill, ally);
  if (masterSkill && masterSkill[key] != null) return masterSkill[key];
  if (skill && skill[key] != null) return skill[key];
  return fallbackValue;
}

function b32FormatPercentRate(value, fallbackText = '0%') {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallbackText;
  const pct = n <= 1 ? n * 100 : n;
  return `${Math.round(pct)}%`;
}

function b32BuildCompactSkillSummaryHtml(skill, ally) {
  if (!skill) return '';

  const linkCost = ally
    ? _getSkillLinkCostForUnit(_bs(), ally._uid, skill)
    : _getSkillLinkCost(skill);

  const multiplier = Number(skill.multiplier || 0);
  const multiplierText = multiplier > 0 ? `ATK×${multiplier}` : 'ダメージなし';

  // Battle32.getState() 側の ally.skills は、戦闘用に整形されたスキル情報で、
  // criticalRate が欠落または 0 初期化される場合がある。
  // 表示値は characters.js のスキル定義を正として引き直す。
  const criticalRate = b32GetSkillFieldFromMaster(skill, ally, 'criticalRate', 0);
  const criticalText = b32FormatPercentRate(criticalRate, '0%');

  const effects = Array.isArray(skill.effects)
    ? skill.effects.map(b32EffectSummary).filter(Boolean)
    : [];
  const effectText = effects.length ? effects.join(' / ') : 'なし';

  return `
    <div class="b32-action-detail-summary b32-action-detail-summary-grid">
      <div class="b32-action-detail-summary-item">
        <span>攻撃倍率：</span><strong>${b32EscapeHtml(multiplierText)}</strong>
      </div>
      <div class="b32-action-detail-summary-item">
        <span>critical率：</span><strong>${b32EscapeHtml(criticalText)}</strong>
      </div>
      <div class="b32-action-detail-summary-item">
        <span>追加効果：</span><strong>${b32EscapeHtml(effectText)}</strong>
      </div>
      <div class="b32-action-detail-summary-item">
        <span>消費LINK：</span><strong>${b32EscapeHtml(String(linkCost))}</strong>
      </div>
    </div>
  `;
}

function b32BuildSkillDetailHtml(skill, ally) {
  if (!skill) return '';

  const linkCost = _getSkillLinkCostForUnit(_bs(), ally?._uid, skill);
  const shinkiCost = skill.isUltimate ? (skill.shinkiCost || ally?.shinkiMax || 3) : (skill.shinkiCost || 0);
  const powerText = Number(skill.multiplier || 0) > 0 ? `ATK×${skill.multiplier}` : 'ダメージなし';
  const hitText = skill.hit != null ? `${skill.hit}%` : '100%';
  const desc = skill.desc || '説明なし';
  const badge = skill.isUltimate ? 'ULT' : 'SKILL';

  return `
    <div class="b32-roster-skill-detail ${skill.isUltimate ? 'is-ult' : 'is-skill'}">
      <div class="b32-roster-skill-detail-head">
        <span class="b32-roster-skill-badge">${badge}</span>
        <strong>${b32EscapeHtml(skill.name || '—')}</strong>
      </div>
      <div class="b32-roster-skill-detail-meta">
        <span>LINK ${linkCost}</span>
        ${skill.isUltimate ? `<span>神気 ${shinkiCost}</span>` : ''}
        <span>${b32EscapeHtml(b32SkillTypeLabel(skill))}</span>
        <span>${b32EscapeHtml(b32RangeLabel(skill.range))}</span>
        <span>命中 ${hitText}</span>
        <span>${powerText}</span>
      </div>
      <div class="b32-roster-skill-detail-desc">${b32EscapeHtml(desc)}</div>
    </div>
  `;
}

function b32BuildRosterSkillDetailsHtml(chara, ally) {
  const skills = (chara?.skills || []);
  if (!skills.length) {
    return '<div class="b32-roster-skill-empty">スキル情報なし</div>';
  }

  const normalSkills = skills.filter(s => !s.isUltimate);
  const ultSkills = skills.filter(s => s.isUltimate);
  return `
    <div class="b32-roster-skill-detail-list">
      ${normalSkills.map(s => b32BuildSkillDetailHtml(s, ally)).join('')}
      ${ultSkills.map(s => b32BuildSkillDetailHtml(s, ally)).join('')}
    </div>
  `;
}

function getUnitUiScale(unit, key) {
 return unit?.uiScale?.[key] || 1;
}

function getUnitUiOffsetY(unit, key) {
 return unit?.uiOffset?.[`${key}Y`] || 0;
}

// [enemy movement unified] 薄いラッパー。
// 移動候補の計算は Battle32.getMoveCells() に完全委譲。
// UI側でmoveTypeを判定しない。
function getEnemyMoveGuideCells(enemy, bs) {
  if (!enemy || !bs) return [];
  if (enemy.isBoss || enemy.moveType === 'none') return [];
  if (!window.Battle32 || typeof window.Battle32.getMoveCells !== 'function') return [];
  return window.Battle32.getMoveCells(enemy._uid);
}

function getEnemyAttackGuideCells(enemy, bs) {
  if (!enemy || !bs || !window.BattleRange32) return [];

  const range = enemy.attackRange || 'enemy_attack_front';
  let keys = new Set();

  // 通常の enemy_attack_* / adjacent / field 系は BattleRange32 に委譲。
  if (typeof range === 'string' && /^manhattan_(\d+)$/.test(range)) {
    const dist = Number(/^manhattan_(\d+)$/.exec(range)[1]);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 5; c++) {
        const d = Math.abs(r - enemy.row) + Math.abs(c - enemy.col);
        if (d > 0 && d <= dist) keys.add(`${r}-${c}`);
      }
    }
  } else {
    keys = window.BattleRange32.getCellsFromRange32(enemy, range);
  }

  const allyMap = {};
  (bs.allies || [])
    .filter(u => u && u.hp > 0)
    .forEach(u => { allyMap[`${u.row}-${u.col}`] = u; });

  const cells = [];
  keys.forEach(key => {
    const [row, col] = String(key).split('-').map(Number);
    if (!Number.isFinite(row) || !Number.isFinite(col)) return;
    cells.push({
      row,
      col,
      cellType: allyMap[key] ? 'target_ally' : 'attack',
      targetUid: allyMap[key] ? allyMap[key]._uid : null,
    });
  });
  return cells;
}

// ============================================================
// ローグライト: 味方対象アイテムの判定
// ============================================================
function b32IsAllyTargetItem(item) {
  if (!item) return false;
  if (item.target === 'ally_all') return false;
  return [
    'heal',
    'move_ally',
    'shinki_max',
    'guard',
    'swap_ally',
    'critical_up',
    'crit_up',
    'atk_up',
    'hp_up',
  ].includes(item.type);
}

function b32GetActiveItem(bs) {
  if (!_itemMode || !bs || !bs.items || _itemSlotIndex == null) return null;
  return bs.items[_itemSlotIndex] || null;
}

function b32IsAllyItemTargetMode(bs) {
  const item = b32GetActiveItem(bs);
  return !!(_itemMode && _itemPhase === 'target' && b32IsAllyTargetItem(item));
}

function showEnemyInfo(enemy) {
 let ov = document.getElementById('b32-enemy-info-overlay');
 if (ov) ov.remove();

 ov = document.createElement('div');
 ov.id = 'b32-enemy-info-overlay';
 ov.innerHTML = `
 <div class="b32-enemy-info-panel">
 <div class="b32-enemy-info-title">${enemy.name || '??????'}</div>
 <div class="b32-enemy-info-row">
 <span>HP</span><strong>${enemy.hp} / ${enemy.hpMax}</strong>
 </div>
 <div class="b32-enemy-info-row">
 <span>ATK</span><strong>${enemy.atk}</strong>
 </div>
 <div class="b32-enemy-info-row">
 <span>属性</span>
 <strong class="b32-enemy-info-element">
   ${unitElementIcon(enemy.element) ? `<img class="b32-info-element-icon" src="${unitElementIcon(enemy.element)}" alt="" onerror="this.style.display='none'">` : ''}
   ${unitElementLabel(enemy.element)}
 </strong>
 </div>
 <div class="b32-enemy-info-row">
 <span>移動</span><strong>${enemyMoveLabel(enemy.moveType)}</strong>
 </div>
 <div class="b32-enemy-info-row">
 <span>攻撃</span><strong>${enemyAttackLabel(enemy.attackRange)}</strong>
 </div>
 <button class="b32-enemy-info-close">閉じる</button>
 </div>
 `;

 ov.addEventListener('click', (e) => {
 if (e.target === ov || e.target.classList.contains('b32-enemy-info-close')) {
 ov.remove();
 }
 });

 document.body.appendChild(ov);
}
window._b32ShowEnemyInfo = function (enemyUid) {
 const bs = _bs();
 if (!bs) return;

 const enemy = (bs.enemies || []).find(e =>
 e._uid === enemyUid &&
 (e.hp > 0 || e.isBoss)
 );

 if (!enemy) return;

 // 敵タップ時は情報パネルを開く。ガイドは「移動」「攻撃」ボタンで切り替える。
 if (_selectedEnemyUid !== enemyUid) {
   _selectedEnemyUid = enemyUid;
   _selectedEnemyGuideMode = null;
 } else {
   // 同じ敵を再タップした場合は、情報表示を維持してガイドだけ解除する。
   _selectedEnemyGuideMode = null;
 }

 window.renderBattle32UI();
};

window._b32EnemyGuide = function (mode) {
 const bs = _bs();
 if (!bs || !_selectedEnemyUid) return;
 if (mode !== 'move' && mode !== 'attack') return;

 _selectedEnemyGuideMode = (_selectedEnemyGuideMode === mode) ? null : mode;
 window.renderBattle32UI();
};

window._b32CloseEnemyInfo = function () {
 _selectedEnemyUid = null;
 _selectedEnemyGuideMode = null;
 const enemyInfo = document.getElementById('b32-enemy-info-overlay');
 if (enemyInfo) enemyInfo.remove();
 const enemyQuick = document.getElementById('b32-enemy-quick-info');
 if (enemyQuick) enemyQuick.remove();
 window.renderBattle32UI();
};


window._b32ResetEnemyInfoPanelPosition = function () {
  _enemyQuickInfoPos = null;
  const box = document.getElementById('b32-enemy-quick-info');
  if (box) _positionEnemyQuickInfoPanel(box);
};
 

 // ============================================================
 // CSS
 // ============================================================
 function injectStyle() {
 // CSSは css/battle_32_ui.css に分離済み
 // ── 中央テキスト演出 専用スタイル（黒ぼかし背景 + ドーンアップアウト演出） ──
 if (document.getElementById('b32-center-text-style')) return;
 const style = document.createElement('style');
 style.id = 'b32-center-text-style';
 style.textContent = `
 /* ── ラッパー：画面全体を覆う（pointer-events: none） ── */
 #b32-center-text {
 position: fixed;
 inset: 0;
 z-index: 999999;
 display: flex;
 flex-direction: column;
 align-items: center;
 justify-content: center;
 pointer-events: none;
 gap: 10px;

 /* 初期状態：非表示 */
 opacity: 0;
 transform: translate3d(0, 8px, 0) scale(.995);
 filter: none;

 /* transition ベース：スマホでも滑らか */
 transition:
 opacity 220ms ease,
 transform 220ms cubic-bezier(.16, 1, .3, 1),
 filter 220ms ease;

 will-change: opacity, transform, filter;
 backface-visibility: hidden;
 transform-style: preserve-3d;
 }

 /* ── 表示状態 ── */
 #b32-center-text.b32ct-visible {
 opacity: 1;
 transform: translate3d(0, 0, 0) scale(1);
 filter: none;
 }

 /* ── 退場状態：上方向へ抜ける ── */
 #b32-center-text.b32ct-hidden {
 opacity: 0;
 transform: translate3d(0, -6px, 0) scale(1);
 filter: none;
 }

 /* ── 背景帯：黒ぼかし半透明グラデーション ── */
 #b32-center-text::before {
 content: '';
 position: absolute;
 inset: 0;
 background: linear-gradient(
 180deg,
 transparent 0%,
 rgba(0,0,0,.52) 30%,
 rgba(4,6,18,.64) 50%,
 rgba(0,0,0,.52) 70%,
 transparent 100%
 );
 backdrop-filter: none;
 -webkit-backdrop-filter: none;
 pointer-events: none;
 }
 /* ── テキストは背景より前面 ── */
 #b32-center-text .b32ct-main,
 #b32-center-text .b32ct-sub {
 position: relative;
 z-index: 1;
 }
 #b32-center-text .b32ct-main {
 font-family: 'Cinzel', serif;
 font-size: clamp(26px, 7vw, 46px);
 font-weight: 700;
 letter-spacing: 7px;
 color: #f5edbc;
 text-shadow:
 0 0 6px rgba(255,255,255,.6),
 0 0 22px rgba(240, 200, 80, .85),
 0 0 55px rgba(240, 160, 40, .50),
 0 2px 4px rgba(0,0,0,.9);
 white-space: nowrap;
 }
 #b32-center-text .b32ct-sub {
 font-family: 'Noto Serif JP', serif;
 font-size: clamp(12px, 3.2vw, 17px);
 letter-spacing: 4px;
 color: rgba(232, 228, 220, .85);
 text-shadow:
 0 0 10px rgba(200, 180, 120, .6),
 0 1px 3px rgba(0,0,0,.9);
 white-space: nowrap;
 }
 .b32-unit-icon {
 transform:
 translateY(var(--unit-offset-y, 0px))
 scale(var(--unit-scale, 1));
 transform-origin: center bottom;
}
 .b32-party-img {
 transform:
 translateY(var(--panel-offset-y, 0px))
 scale(var(--panel-scale, 1));
 transform-origin: center center;
}

 `;
 document.head.appendChild(style);

 // ── スキルチップ横並び用スタイル ──
 if (document.getElementById('b32-skill-chip-style')) return;
 const chipStyle = document.createElement('style');
 chipStyle.id = 'b32-skill-chip-style';
 chipStyle.textContent = `
 /* スキルチップ行：横並び1段 */
 .b32-skill-chip-row {
 display: flex;
 gap: 5px;
 width: 100%;
 align-items: stretch;
 flex-wrap: nowrap;
 }

#b32-log {
 height: 14px !important;
 line-height: 14px !important;
 font-size: 9px !important;
 margin: 0 !important;
 padding: 0 !important;
 overflow: hidden !important;
}

/* 下部エリアを詰める */
#b32-bottom-area {
 margin-top: 0 !important;
 padding-top: 0 !important;
}

/* 案内テキスト */
#b32-bottom-guide {
 height: 12px !important;
 min-height: 12px !important;
 margin: 0 0 4px 0 !important;
 line-height: 12px !important;
}

/* キャラカード行 */
#b32-party-status {
 margin-top: 0 !important;
}

 #b32-bottom-guide {
 width: 100%;
 height: 14px;
 min-height: 14px;
 margin: 0;
 text-align: center;
 font-size: 10px;
 letter-spacing: 1px;
 color: rgba(232, 228, 220, .72);
 text-shadow:
 0 0 8px rgba(220, 190, 120, .35),
 0 1px 2px rgba(0,0,0,.9);
 font-family: 'Noto Serif JP', serif;
 }
 /* フィールド下〜キャラボックス上の案内エリアを最小化 */
#b32-log-wrap {
 display: block !important;
 height: 14px !important;
 min-height: 14px !important;
 max-height: 14px !important;
 margin: 2px 0 0 0 !important;
 padding: 0 !important;
 overflow: hidden !important;
 flex: 0 0 14px !important;
}

/* ログ本文は1行だけ。不要なら透明でもOK */
#b32-log {
 height: 14px !important;
 line-height: 14px !important;
 font-size: 9px !important;
 margin: 0 !important;
 padding: 0 !important;
 overflow: hidden !important;
}

/* 操作案内テキストも1行分だけ */
#b32-bottom-guide {
 height: 14px !important;
 min-height: 14px !important;
 max-height: 14px !important;
 line-height: 14px !important;
 margin: 0 0 4px 0 !important;
 padding: 0 !important;
 font-size: 10px !important;
}

/* 下部エリア自体の上余白を消す */
#b32-bottom-area {
 margin-top: 0 !important;
 padding-top: 0 !important;
}
 /* 個別チップ */
 .b32-skill-chip {
 flex: 1;
 min-width: 0;
 height: 36px;
 display: flex;
 flex-direction: column;
 align-items: center;
 justify-content: center;
 border-radius: 0;
 border: 1px solid rgba(255,255,255,.12);
 background: rgba(255,255,255,.05);
 color: rgba(232,228,220,.85);
 font-family: 'Noto Serif JP', serif;
 font-size: 11px;
 letter-spacing: .5px;
 white-space: nowrap;
 overflow: hidden;
 text-overflow: ellipsis;
 cursor: pointer;
 -webkit-tap-highlight-color: transparent;
 user-select: none;
 padding: 0 6px;
 transition: background .12s, border-color .12s;
 position: relative;
 }

 .b32-skill-chip:active {
 background: rgba(232,192,64,.18);
 border-color: rgba(232,192,64,.4);
 }

/* ── スキル名カットイン：フレームなし・左文字・右キャラ ── */
.b32-skill-name-burst {
 position: fixed;
 left: 50%;
 top: 42%;
 z-index: 999999;
 pointer-events: none;
 transform: translate3d(-50%, -50%, 0);
 -webkit-transform: translate3d(-50%, -50%, 0);
 width: min(92vw, 560px);
 height: 180px;

 background: none;
 border: none;
 box-shadow: none;
 border-radius: 0;

 overflow: visible;
 animation: b32SkillNameBurst 1500ms ease-out forwards;

 filter: none !important;
 -webkit-filter: none !important;
 will-change: transform, opacity;
 backface-visibility: hidden;
 -webkit-backface-visibility: hidden;
}

.b32-skill-burst-img {
 position: absolute;
 right: -2px;
 bottom: -22px;
 height: 240px;
 max-width: 68%;
 object-fit: contain;
 object-position: center bottom;
 display: block;

 opacity: .9;

 /* iPhone実機対策：重いblur/drop-shadowは使わない */
 filter: none !important;
 -webkit-filter: none !important;

 /*
 下辺だけを軽くフェードアウト。
 blurではなくmaskなので、境界のくっきり感だけ自然に消す。
 */
 -webkit-mask-image: linear-gradient(
 to bottom,
 #000 0%,
 #000 72%,
 rgba(0, 0, 0, .72) 84%,
 rgba(0, 0, 0, .28) 94%,
 transparent 100%
 );
 mask-image: linear-gradient(
 to bottom,
 #000 0%,
 #000 72%,
 rgba(0, 0, 0, .72) 84%,
 rgba(0, 0, 0, .28) 94%,
 transparent 100%
 );

 transform: translate3d(0, 0, 0);
 -webkit-transform: translate3d(0, 0, 0);
 transform-origin: center bottom;

 animation: b32SkillBurstImg 1500ms ease-out forwards;
 will-change: transform, opacity;
 backface-visibility: hidden;
 -webkit-backface-visibility: hidden;
}

.b32-skill-burst-name {
 position: absolute;
 left: 0;
 top: 50%;
 width: 44%;
 z-index: 2;
 transform: translateY(-50%);

 padding: 0;
 background: none;
 border: none;
 border-radius: 0;

 font-family: 'Noto Serif JP', serif;
 font-size: clamp(20px, 5.4vw, 34px);
 font-weight: 700;
 letter-spacing: 4px;
 line-height: 1.2;
 color: #fff4c8;
 text-align: center;
 white-space: nowrap;

 text-shadow:
 0 0 8px rgba(255,245,200,.95),
 0 0 22px rgba(255,190,70,.72),
 0 0 44px rgba(255,140,40,.28),
 0 2px 4px rgba(0,0,0,.95);
}

@keyframes b32SkillNameBurst {
 0% {
 opacity: 0;
 transform: translate3d(-50%, -50%, 0) scale(.92);
 }
 18% {
 opacity: 1;
 transform: translate3d(-50%, -50%, 0) scale(1);
 }
 72% {
 opacity: 1;
 transform: translate3d(-50%, -50%, 0) scale(1);
 }
 100% {
 opacity: 0;
 transform: translate3d(-50%, -52%, 0) scale(1);
 }
}

@keyframes b32SkillBurstImg {
 0% {
 opacity: 0;
 transform: translate3d(24px, 0, 0);
 }
 18% {
 opacity: .9;
 transform: translate3d(0, 0, 0);
 }
 72% {
 opacity: .88;
 transform: translate3d(0, 0, 0);
 }
 100% {
 opacity: 0;
 transform: translate3d(-8px, 0, 0);
 }
}

/* ── ULT専用カットイン：横帯レイアウト ── */
.b32-ult-cutin {
 position: fixed;
 inset: 0;
 z-index: 1000000;
 pointer-events: none;
 overflow: hidden;

 /* 背景は暗くしすぎない */
 background:
 radial-gradient(circle at 55% 48%, rgba(255,240,190,.06), transparent 46%),
 linear-gradient(180deg, rgba(0,0,0,.72), rgba(6,8,18,.36), rgba(0,0,0,.76));

 animation: b32UltCutinWrap 1900ms ease-out forwards;
}

/* 画像：中央の横帯いっぱいに明るく表示 */
.b32-ult-cutin-img {
 position: absolute;
 left: 50%;
 top: 50%;

 width: 100vw;
 min-width: 100vw;
 height: auto;
 max-width: none;

 object-fit: cover;
 object-position: center center;

 transform: translate(-50%, -50%);
 opacity: 1;

 /* ULT画像の視認性を最優先。暗幕より前で明るく強く出す */
 filter:
 brightness(1.18)
 contrast(1.16)
 saturate(1.06)
 drop-shadow(0 4px 18px rgba(0,0,0,.72));

 animation: b32UltCutinImgSlide 1700ms cubic-bezier(.18,.82,.22,1) forwards;
}

/* 画像の上に乗る暗幕：薄めに変更 */
.b32-ult-cutin-shade {
 position: absolute;
 inset: 0;

 /* 上下だけ締めて、中央画像は暗くしすぎない */
 background:
 linear-gradient(180deg,
   rgba(0,0,0,.62) 0%,
   rgba(0,0,0,.06) 24%,
   rgba(0,0,0,.00) 50%,
   rgba(0,0,0,.06) 74%,
   rgba(0,0,0,.66) 100%
 ),
 linear-gradient(90deg,
   rgba(0,0,0,.20) 0%,
   rgba(0,0,0,.00) 34%,
   rgba(0,0,0,.00) 70%,
   rgba(0,0,0,.18) 100%
 );
}

/* 上の ULTIMATE */
.b32-ult-cutin-label {
 position: absolute;
 left: 22px;
 top: 21%;

 font-family: 'Cinzel', serif;
 font-size: 12px !important;
 letter-spacing: 7px !important;
 color: rgba(255,235,170,.98) !important;

 text-shadow:
 0 0 6px rgba(255,255,255,.9),
 0 0 18px rgba(255,220,120,.95),
 0 2px 4px rgba(0,0,0,1) !important;

 animation: b32UltTextIn 1900ms ease-out forwards;
}

/* 中央の区切り線：画像帯の上に置く */
.b32-ult-cutin-line {
 position: absolute;
 left: 0;
 top: 30%;
 width: 100%;
 height: 1px;

 background: linear-gradient(
 90deg,
 transparent,
 rgba(255,245,210,.95),
 transparent
 );

 box-shadow:
 0 0 12px rgba(255,230,170,.8),
 0 0 28px rgba(255,160,70,.4);

 transform: none;
 opacity: .9;
 animation: b32UltLine 1900ms ease-out forwards;
}

/* 下のスキル名：画像の左下 */
.b32-ult-cutin-name {
 position: absolute;
 left: 22px;
 bottom: 15%;

 max-width: 88vw;

 font-family: 'Noto Serif JP', serif;
 font-size: clamp(26px, 8vw, 46px);
 font-weight: 800;
 letter-spacing: 6px;
 line-height: 1.05;

 color: #fff4c8;
 text-align: left;

 text-shadow:
 0 0 8px rgba(255,255,255,.95),
 0 0 26px rgba(255,190,70,.90),
 0 0 58px rgba(255,120,40,.45),
 0 3px 6px rgba(0,0,0,1);

 animation: b32UltTextIn 1900ms ease-out forwards;
}

.b32-ult-white-flash {
 position: fixed;
 inset: 0;
 z-index: 1000001;
 pointer-events: none;
 background: white;
 opacity: 0;
 animation: b32UltWhiteFlash 1900ms ease-out forwards;
 mix-blend-mode: normal;
}

@keyframes b32UltCutinWrap {
 0% { opacity: 0; }
 10% { opacity: 1; }
 82% { opacity: 1; }
 100% { opacity: 0; }
}

@keyframes b32UltCutinImg {
 0% {
 opacity: 0;
 transform: translate(-50%, -50%) scale(1.16);
 filter: brightness(1.05) contrast(1.05);
 }
 14% {
 opacity: .98;
 transform: translate(-50%, -50%) scale(1.08);
 filter: brightness(1.12) contrast(1.18) saturate(1.08);
 }
 78% {
 opacity: .98;
 transform: translate(-50%, -50%) scale(1.02);
 }
 100% {
 opacity: 0;
 transform: translate(-50%, -50%) scale(1.00);
 filter: brightness(1.04) contrast(1.08);
 }
}

/* 左から入り・中央で静止・左へ抜けるスライド演出 */
@keyframes b32UltCutinImgSlide {
 0% {
 opacity: 0;
 transform: translate(-70%, -50%);
 filter: brightness(1.10) contrast(1.12) saturate(1.04);
 }
 14% {
 opacity: .98;
 transform: translate(-50%, -50%);
 filter: brightness(1.18) contrast(1.16) saturate(1.06);
 }
 76% {
 opacity: .98;
 transform: translate(-50%, -50%);
 filter: brightness(1.18) contrast(1.16) saturate(1.06);
 }
 100% {
 opacity: 0;
 transform: translate(-68%, -50%);
 filter: brightness(1.08) contrast(1.10) saturate(1.03);
 }
}

@keyframes b32UltTextIn {
 0% {
 opacity: 0;
 transform: translateX(-20px);
 filter: none;
 }
 16% {
 opacity: 1;
 transform: translateX(0);
 filter: none;
 }
 78% {
 opacity: 1;
 }
 100% {
 opacity: 0;
 transform: translateX(10px);
 filter: none;
 }
}

@keyframes b32UltLine {
 0% {
 opacity: 0;
 transform: translateX(-20%) rotate(-8deg) scaleX(.3);
 }
 20% {
 opacity: .95;
 transform: translateX(0) rotate(-8deg) scaleX(1);
 }
 46% {
 opacity: .25;
 }
 100% {
 opacity: 0;
 transform: translateX(12%) rotate(-8deg) scaleX(1.1);
 }
}

@keyframes b32UltWhiteFlash {
 0%, 70% {
 opacity: 0;
 }
 76% {
 opacity: .16;
 }
 86% {
 opacity: 0;
 }
 100% {
 opacity: 0;
 }
}

/* ── ULTカットイン強化：ULTIMATE ラベル ── */
.b32-ult-cutin-label {
 font-size: 12px !important;
 letter-spacing: 7px !important;
 color: rgba(255,235,170,.98) !important;
 text-shadow:
 0 0 6px rgba(255,255,255,.9),
 0 0 18px rgba(255,220,120,.95),
 0 0 40px rgba(255,170,60,.70),
 0 2px 4px rgba(0,0,0,1) !important;
}

/* ── ULTカットイン強化：技名 ── */
.b32-ult-cutin-name {
 text-shadow:
 0 0 10px rgba(255,255,255,.98),
 0 0 32px rgba(255,200,80,.95),
 0 0 72px rgba(255,130,40,.60),
 0 0 120px rgba(255,80,20,.25),
 0 3px 8px rgba(0,0,0,1) !important;
}

/* ── ULT専用：強い画面揺れ ── */
.b32-screen-shake-ult {
 animation: b32ScreenShakeUlt 380ms ease-out;
}

@keyframes b32ScreenShakeUlt {
 0% { transform: translate(0, 0); }
 14% { transform: translate(-4px, 2px); }
 28% { transform: translate(5px, -2px); }
 42% { transform: translate(-4px, 2px); }
 56% { transform: translate(3px, -1px); }
 72% { transform: translate(-2px, 1px); }
 86% { transform: translate(1px, 0); }
 100% { transform: translate(0, 0); }
}

/* ── hitStyle: heavy 用：強い画面揺れ ── */
.b32-screen-shake-heavy {
 animation: b32ScreenShakeHeavy 340ms ease-out;
}

@keyframes b32ScreenShakeHeavy {
 0% { transform: translate(0, 0); }
 16% { transform: translate(-4px, 2px); }
 32% { transform: translate(5px, -2px); }
 52% { transform: translate(-3px, 1px); }
 72% { transform: translate(2px, -1px); }
 100% { transform: translate(0, 0); }
}

/* ── ULT ダメージ数値：大きめ ── */
.b32-float-number.damage.ult {
 font-size: 26px !important;
 color: #ffcc44 !important;
 text-shadow:
 0 0 10px rgba(255,200,60,.95),
 0 0 24px rgba(255,140,40,.80),
 0 1px 4px rgba(0,0,0,.95) !important;
}

/* ── CRITICAL ダメージ数値 ── */
.b32-float-number.damage.critical {
 font-size: 28px !important;
 color: #fff6c4 !important;
 letter-spacing: .06em;
 text-shadow:
 0 0 10px rgba(255,255,255,.95),
 0 0 24px rgba(255,220,80,.95),
 0 0 42px rgba(255,120,40,.72),
 0 2px 5px rgba(0,0,0,1) !important;
}
.b32-float-number.damage.critical::before {
 content: 'CRITICAL';
 position: absolute;
 left: 50%;
 top: -18px;
 transform: translateX(-50%);
 font-family: "Cinzel", "Noto Serif JP", serif;
 font-size: 10px;
 font-weight: 900;
 letter-spacing: .12em;
 color: #fff1a8;
 text-shadow:
 0 0 8px rgba(255,255,255,.9),
 0 0 18px rgba(255,200,60,.85),
 0 1px 3px rgba(0,0,0,1);
 white-space: nowrap;
}

/* ── ULT ヒールナンバー：大きめ ── */
.b32-float-number.heal.ult {
 font-size: 24px !important;
 color: #80ffcc !important;
 text-shadow:
 0 0 10px rgba(60,255,180,.9),
 0 1px 4px rgba(0,0,0,.95) !important;
}

/* ── hitStyle: rapid — 小さめスラッシュ ── */
.b32-hit-slash.rapid {
 width: 38px !important;
 height: 4px !important;
 opacity: .75;
}

/* ── hitStyle: heavy — 大きめスラッシュ ── */
.b32-hit-slash.heavy {
 width: 80px !important;
 height: 9px !important;
 box-shadow:
 0 0 14px rgba(255, 90, 70, .95),
 0 0 28px rgba(255, 90, 70, .50) !important;
}

/* ── ULT スラッシュ ── */
.b32-hit-slash.ult {
 width: 90px !important;
 height: 10px !important;
 background: linear-gradient(
 90deg,
 transparent,
 rgba(255,255,255,1),
 rgba(255,210,80,.95),
 transparent
 ) !important;
 box-shadow:
 0 0 16px rgba(255, 200, 60, .95),
 0 0 34px rgba(255, 140, 40, .55) !important;
 animation: b32HitSlashUlt 300ms ease-out forwards !important;
}

/* ULT + multi は一番派手 */
.b32-hit-slash.ult.multi {
 width: 100px !important;
 height: 12px !important;
}

@keyframes b32HitSlashUlt {
 0% {
 opacity: 0;
 transform: translate(-50%, -50%) rotate(-28deg) scaleX(.25);
 filter: none;
 }
 20% {
 opacity: 1;
 filter: none;
 }
 100% {
 opacity: 0;
 transform: translate(-50%, -50%) rotate(-28deg) scaleX(1.35);
 filter: none;
 }
}

/* ── 画面全体の軽いヒット揺れ ── */
.b32-screen-shake {
 animation: b32ScreenShake 260ms ease-out;
}

@keyframes b32ScreenShake {
 0% { transform: translate(0, 0); }
 20% { transform: translate(-2px, 1px); }
 40% { transform: translate(3px, -1px); }
 60% { transform: translate(-2px, 1px); }
 80% { transform: translate(1px, 0); }
 100% { transform: translate(0, 0); }
}

 /* ULTチップ */
 .b32-skill-chip.ult {
 flex: 0 0 44px;
 border-color: rgba(200,140,255,.4);
 background: rgba(160,80,220,.10);
 color: rgba(220,180,255,.85);
 font-size: 10px;
 letter-spacing: 1px;
 }

 .b32-skill-chip.ult:active {
 background: rgba(160,80,220,.25);
 }

 /* 行動終了チップ */
 .b32-skill-chip.end-turn {
 flex: 0 0 44px;
 border-color: rgba(180,180,180,.25);
 background: rgba(180,180,180,.05);
 color: rgba(232,228,220,.45);
 font-size: 10px;
 letter-spacing: .5px;
 }

 /* 無効チップ（神気不足・使用済み） */
 .b32-skill-chip.disabled {
 opacity: 0.35;
 pointer-events: none;
 }

 /* 神気ドット（チップ内下部） */
 .b32-chip-shinki {
 display: flex;
 gap: 2px;
 margin-top: 2px;
 }

 .b32-chip-shinki-dot {
 width: 4px;
 height: 4px;
 border-radius: 50%;
 border: 1px solid rgba(240,192,64,.4);
 background: rgba(240,192,64,.08);
 }

 .b32-chip-shinki-dot.filled {
 background: rgba(240,192,64,.9);
 border-color: rgba(240,192,64,.8);
 }

 /* キャラ名（コンパクト） */
 #b32-skill-chara-name {
 font-family: 'Cinzel', serif;
 font-size: 10px !important;
 letter-spacing: 2px !important;
 padding: 2px 0 2px !important;
 }

 /* ── スキル対象ハイライト：敵（赤橙） ── */
 .b32-cell.skill-target-enemy {
 background:
 linear-gradient(145deg, rgba(255,100,60,.22), rgba(40,8,4,.34)),
 rgba(18,6,4,.52) !important;
 border-color: rgba(255,130,70,.70) !important;
 box-shadow:
 inset 0 0 14px rgba(255,100,50,.24),
 0 0 16px rgba(255,100,50,.28) !important;
 }

 /* ── スキル対象ハイライト：味方（青緑） ── */
 .b32-cell.skill-target-ally {
 background:
 linear-gradient(145deg, rgba(60,220,170,.20), rgba(4,22,16,.30)),
 rgba(4,12,10,.50) !important;
 border-color: rgba(70,230,180,.65) !important;
 box-shadow:
 inset 0 0 14px rgba(60,220,170,.20),
 0 0 16px rgba(60,220,170,.24) !important;
 }

  /* ── スキル射程ガイド：空マス（薄い紫） ── */
  .b32-cell.skill-range {
    background:
      linear-gradient(145deg, rgba(160,100,255,.12), rgba(20,8,40,.18)),
      rgba(12,6,24,.30) !important;
    border-color: rgba(160,100,255,.45) !important;
    box-shadow:
      inset 0 0 10px rgba(140,80,255,.12),
      0 0 10px rgba(140,80,255,.14) !important;
  }

 /* ── パーティパネル HP バー ── */
 /* HPブロック全体：数値が右上、バーが直下 */
 .b32-party-hp-block {
 width: 100%;
 display: flex;
 flex-direction: column;
 align-items: flex-end; /* 数値を右寄せ */
 gap: 1px;
 }
 .b32-party-hp-num {
 font-family: 'Cinzel', serif;
 font-size: 9px;
 letter-spacing: .5px;
 color: rgba(232,228,220,.72);
 line-height: 1.2;
 text-align: right;
 white-space: nowrap;
 }
 .b32-party-hp-bar-wrap {
 width: 100%;
 height: 4px;
 border-radius: 2px;
 background: rgba(0,0,0,.45);
 overflow: hidden;
 }
 .b32-party-hp-bar {
 height: 100%;
 border-radius: 2px;
 transition: width .25s ease;
 }
 /* 旧クラス（後方互換） */
 .b32-party-hp-text {
 font-family: 'Cinzel', serif;
 font-size: 9px;
 letter-spacing: .5px;
 color: rgba(232,228,220,.65);
 text-align: right;
 line-height: 1.2;
 }
 .b32-party-hp-max {
 font-size: 8px;
 color: rgba(232,228,220,.35);
 }

 /* ── ダメージ・回復 フロートナンバー ── */
 .b32-float-number {
 position: fixed;
 z-index: 999999;
 pointer-events: none;
 font-family: 'Cinzel', serif;
 font-weight: 700;
 font-size: 18px;
 letter-spacing: 1px;
 transform: translate(-50%, 0);
 white-space: nowrap;
 animation: b32FloatUp 950ms ease-out forwards;
 }
 .b32-float-number.damage {
 color: #ff6060;
 text-shadow: 0 0 8px rgba(255,60,60,.8), 0 1px 3px rgba(0,0,0,.9);
 }

 .b32-float-number.damage.weak {
 font-size: 24px !important;
 color: #ffd84a !important;
 text-shadow:
 0 0 10px rgba(255,220,80,.95),
 0 0 24px rgba(255,160,40,.75),
 0 1px 4px rgba(0,0,0,.95) !important;
}

.b32-float-number.damage.resist {
 font-size: 14px !important;
 color: #9aa8bd !important;
 opacity: .85;
 text-shadow:
 0 0 8px rgba(120,150,210,.65),
 0 1px 3px rgba(0,0,0,.95) !important;
}

.b32-element-match-text {
 position: fixed;
 z-index: 1000000;
 pointer-events: none;
 font-family: 'Cinzel', serif;
 font-weight: 900;
 letter-spacing: 2px;
 transform: translate(-50%, -50%);
 animation: b32ElementMatchPop 720ms ease-out forwards;
}

.b32-element-match-text.weak {
 font-size: 22px;
 color: #ffe680;
 text-shadow:
 0 0 8px rgba(255,255,255,.95),
 0 0 18px rgba(255,210,80,.9),
 0 0 34px rgba(255,120,40,.6),
 0 2px 4px rgba(0,0,0,.95);
}

.b32-element-match-text.resist {
 font-size: 16px;
 color: #aeb8c8;
 text-shadow:
 0 0 8px rgba(160,180,220,.65),
 0 2px 4px rgba(0,0,0,.95);
}

@keyframes b32ElementMatchPop {
 0% { opacity: 0; transform: translate(-50%, -40%) scale(.75); }
 18% { opacity: 1; transform: translate(-50%, -70%) scale(1.18); }
 62% { opacity: 1; transform: translate(-50%, -88%) scale(1); }
 100% { opacity: 0; transform: translate(-50%, -112%) scale(.92); }
}
 .b32-float-number.damage.boss {
 font-size: 22px;
 color: #ff9020;
 text-shadow: 0 0 12px rgba(255,140,40,.9), 0 1px 4px rgba(0,0,0,.9);
 }
 .b32-float-number.heal {
 color: #50e8a0;
 text-shadow: 0 0 8px rgba(60,220,140,.8), 0 1px 3px rgba(0,0,0,.9);
 }
 @keyframes b32FloatUp {
 0% { opacity: 0; transform: translate(-50%, 6px) scale(.8); }
 18% { opacity: 1; transform: translate(-50%, 0px) scale(1.2); }
 55% { opacity: 1; transform: translate(-50%, -10px) scale(1.0); }
 100% { opacity: 0; transform: translate(-50%, -30px) scale(.9); }
 }

 /* ── 衝撃波リング ── */
.b32-impact-ring {
 position: fixed;
 z-index: 999998;
 pointer-events: none;
 width: 18px;
 height: 18px;
 border-radius: 50%;
 transform: translate(-50%, -50%);
 opacity: 0;
}

.b32-impact-ring.damage {
 border: 2px solid rgba(255, 230, 220, .95);
 box-shadow:
 0 0 10px rgba(255, 80, 60, .75),
 inset 0 0 8px rgba(255, 80, 60, .45);
 animation: b32ImpactRingDamage 420ms ease-out forwards;
}

.b32-impact-ring.heal {
 border: 2px solid rgba(180, 255, 220, .85);
 box-shadow:
 0 0 10px rgba(60, 220, 140, .65),
 inset 0 0 8px rgba(60, 220, 140, .35);
 animation: b32ImpactRingHeal 520ms ease-out forwards;
}

@keyframes b32ImpactRingDamage {
 0% {
 opacity: 0;
 width: 10px;
 height: 10px;
 filter: none;
 }
 18% {
 opacity: 1;
 }
 100% {
 opacity: 0;
 width: 76px;
 height: 76px;
 filter: none;
 }
}

@keyframes b32ImpactRingHeal {
 0% {
 opacity: 0;
 width: 12px;
 height: 12px;
 filter: none;
 }
 20% {
 opacity: .9;
 }
 100% {
 opacity: 0;
 width: 64px;
 height: 64px;
 filter: none;
 }
}

/* ── 斜めヒットスラッシュ ── */
.b32-hit-slash {
 position: fixed;
 z-index: 999999;
 pointer-events: none;
 width: 56px;
 height: 6px;
 border-radius: 999px;
 background: linear-gradient(
 90deg,
 transparent,
 rgba(255,255,255,.95),
 rgba(255,80,60,.9),
 transparent
 );
 transform: translate(-50%, -50%) rotate(-28deg);
 box-shadow:
 0 0 8px rgba(255, 90, 70, .85),
 0 0 16px rgba(255, 90, 70, .35);
 animation: b32HitSlash 260ms ease-out forwards;
}

@keyframes b32HitSlash {
 0% {
 opacity: 0;
 transform: translate(-50%, -50%) rotate(-28deg) scaleX(.35);
 }
 25% {
 opacity: 1;
 }
 100% {
 opacity: 0;
 transform: translate(-50%, -50%) rotate(-28deg) scaleX(1.25);
 }
}

/* ── 打撃揺れ ── */
.b32-impact-shake {
 animation: b32ImpactShake 260ms ease-out;
}

@keyframes b32ImpactShake {
 0% { transform: translateX(0); }
 18% { transform: translateX(-3px); }
 36% { transform: translateX(4px); }
 54% { transform: translateX(-2px); }
 72% { transform: translateX(2px); }
 100% { transform: translateX(0); }
}

 /* ── ヒットフラッシュ（セル or カードに一時追加） ── */
 .b32-hit-flash-damage {
 outline: 2px solid rgba(255,80,60,.85) !important;
 box-shadow: inset 0 0 18px rgba(255,60,40,.45), 0 0 20px rgba(255,60,40,.35) !important;
 transition: none !important;
 }
 .b32-hit-flash-heal {
 outline: 2px solid rgba(60,220,140,.75) !important;
 box-shadow: inset 0 0 18px rgba(60,220,140,.35), 0 0 16px rgba(60,220,140,.28) !important;
 transition: none !important;
 }

 /* ── 神気バッジ：カード右上に絶対配置 ── */
 .b32-party-shinki-badge {
 position: absolute;
 top: 4px;
 right: 4px;
 display: flex;
 flex-direction: column;
 gap: 2px;
 align-items: center;
 z-index: 2;
 }

 /* .b32-party-row.shinki は非表示（.b32-party-shinki-badge に移行） */
 .b32-party-row.shinki {
 display: none;
 }

 /* ── HP セクション：カード最下部 ── */
 .b32-party-hp-section {
 width: 100%;
 margin-top: 2px;
 }

 /* ── 自陣コア画像 ── */
.b32-core-object {
 position: relative;
 width: 100%;
 height: 100%;
 display: flex;
 align-items: center;
 justify-content: center;
 /* board の rotateX(38deg) を相殺する基本値。
  * 実際の上書きは battle_32_ui.css の .b32-core-object ルールで行う */
 transform: rotateX(-38deg);
 transform-origin: center center;
 pointer-events: none;
}

.b32-core-img {
 width: 100%;
 height: 100%;
 object-fit: contain;
 filter:
 drop-shadow(0 0 6px rgba(80, 240, 255, .75))
 drop-shadow(0 0 12px rgba(80, 220, 255, .35));
}

.b32-core-object.stability-2 .b32-core-img {
 filter:
 drop-shadow(0 0 6px rgba(255, 220, 80, .8))
 drop-shadow(0 0 14px rgba(255, 180, 40, .45));
}

.b32-core-object.stability-1 .b32-core-img {
 filter:
 drop-shadow(0 0 7px rgba(255, 60, 60, .9))
 drop-shadow(0 0 16px rgba(255, 40, 40, .55));
}

/* ── コア被弾：時空歪みレベルの大揺れ ── */
.b32-screen-shake-core {
 animation: b32ScreenShakeCore 720ms cubic-bezier(.2,.9,.25,1);
}

@keyframes b32ScreenShakeCore {
 0% { transform: translate(0, 0) rotate(0deg); filter: none; }
 8% { transform: translate(-8px, 5px) rotate(-0.4deg); filter: contrast(1.15); }
 16% { transform: translate(10px, -6px) rotate(0.5deg); }
 25% { transform: translate(-12px, 4px) rotate(-0.6deg); }
 35% { transform: translate(9px, 6px) rotate(0.4deg); }
 48% { transform: translate(-7px, -5px) rotate(-0.3deg); }
 62% { transform: translate(5px, 3px) rotate(0.2deg); }
 78% { transform: translate(-3px, 1px) rotate(-0.1deg); }
 100% { transform: translate(0, 0) rotate(0deg); filter: none; }
}

/* コア被弾時の赤い画面フラッシュ */
.b32-core-damage-flash {
 position: fixed;
 inset: 0;
 z-index: 1000002;
 pointer-events: none;
 background:
 radial-gradient(circle at 50% 62%, rgba(255,40,40,.34), transparent 36%),
 linear-gradient(180deg, rgba(70,0,0,.26), rgba(0,0,0,0), rgba(90,0,0,.30));
 animation: b32CoreDamageFlash 720ms ease-out forwards;
}

@keyframes b32CoreDamageFlash {
 0% { opacity: 0; }
 12% { opacity: 1; }
 36% { opacity: .55; }
 100% { opacity: 0; }
}

/* コア被弾の大きい歪みリング */
.b32-core-distort-ring {
 position: fixed;
 z-index: 1000001;
 pointer-events: none;
 left: 50%;
 top: 62%;
 width: 24px;
 height: 24px;
 border-radius: 50%;
 transform: translate(-50%, -50%);
 border: 2px solid rgba(255,80,80,.95);
 box-shadow:
 0 0 18px rgba(255,40,40,.95),
 0 0 48px rgba(255,0,0,.55),
 inset 0 0 18px rgba(255,80,80,.45);
 animation: b32CoreDistortRing 780ms ease-out forwards;
}

@keyframes b32CoreDistortRing {
 0% {
 opacity: 0;
 width: 20px;
 height: 20px;
 filter: none;
 }
 14% {
 opacity: 1;
 }
 100% {
 opacity: 0;
 width: 180px;
 height: 180px;
 filter: none;
 }
}

/* コア被弾テキスト */
.b32-core-damage-text {
 position: fixed;
 left: 50%;
 top: 56%;
 z-index: 1000003;
 transform: translate(-50%, -50%);
 pointer-events: none;
 font-family: 'Cinzel', serif;
 font-size: 22px;
 font-weight: 800;
 letter-spacing: 4px;
 color: #ffdddd;
 text-shadow:
 0 0 8px rgba(255,255,255,.9),
 0 0 24px rgba(255,40,40,.95),
 0 0 60px rgba(255,0,0,.55),
 0 2px 4px rgba(0,0,0,1);
 animation: b32CoreDamageText 850ms ease-out forwards;
}

@keyframes b32CoreDamageText {
 0% {
 opacity: 0;
 transform: translate(-50%, -50%) scale(.72);
 filter: none;
 }
 18% {
 opacity: 1;
 transform: translate(-50%, -50%) scale(1.12);
 filter: none;
 }
 62% {
 opacity: 1;
 transform: translate(-50%, -54%) scale(1);
 }
 100% {
 opacity: 0;
 transform: translate(-50%, -62%) scale(1.05);
 filter: none;
 }
}

/* コア画像自体も揺らす */
.b32-core-object.core-hit {
 animation: b32CoreObjectHit 700ms ease-out;
}

@keyframes b32CoreObjectHit {
 0%   { transform: translate(-50%, -50%) rotateX(-38deg) translateX(0)    scale(1); }
 15%  { transform: translate(-50%, -50%) rotateX(-38deg) translateX(-5px) scale(1.12); }
 30%  { transform: translate(-50%, -50%) rotateX(-38deg) translateX(6px)  scale(1.08); }
 48%  { transform: translate(-50%, -50%) rotateX(-38deg) translateX(-4px) scale(1.10); }
 70%  { transform: translate(-50%, -50%) rotateX(-38deg) translateX(2px)  scale(1.04); }
 100% { transform: translate(-50%, -50%) rotateX(-38deg) translateX(0)    scale(1); }
}


.b32-unit.enemy.active-enemy-action {
  filter: drop-shadow(0 0 10px rgba(255,215,120,.95)) drop-shadow(0 0 18px rgba(255,100,80,.55));
  animation: b32EnemyActionPulse 720ms ease-in-out infinite;
  z-index: 9;
}
.b32-unit.enemy.active-enemy-action::after {
  content: 'ACTION';
  position: absolute;
  left: 50%;
  top: -12px;
  transform: translateX(-50%) rotateX(-38deg);
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(0,0,0,.72);
  border: 1px solid rgba(255,220,140,.65);
  color: rgba(255,236,175,.96);
  font-family: 'Cinzel', serif;
  font-size: 7px;
  letter-spacing: .12em;
  text-shadow: 0 0 8px rgba(255,180,90,.82);
  pointer-events: none;
}
@keyframes b32EnemyActionPulse {
  0%, 100% { transform: translateX(-50%) rotateX(-38deg) scale(1); }
  50% { transform: translateX(-50%) rotateX(-38deg) scale(1.06); }
}

#b32-enemy-info-overlay {
 position: fixed;
 inset: 0;
 z-index: 3000000;
 display: flex;
 align-items: center;
 justify-content: center;
 background: rgba(0,0,0,.55);
 backdrop-filter: none;
 -webkit-backdrop-filter: none;
 padding: 18px;
 box-sizing: border-box;
}

.b32-enemy-info-panel {
 width: min(320px, 92vw);
 background: linear-gradient(168deg, #17101f 0%, #07050c 100%);
 border: 1px solid rgba(220,120,120,.35);
 border-radius: 16px;
 padding: 20px 18px 16px;
 box-shadow: 0 0 40px rgba(180,40,40,.25), 0 20px 40px rgba(0,0,0,.65);
 color: #e8e4dc;
 font-family: "Noto Serif JP", serif;
}

.b32-enemy-info-title {
 font-family: "Cinzel", serif;
 font-size: 18px;
 letter-spacing: 3px;
 color: #ffb0b0;
 text-align: center;
 margin-bottom: 14px;
}

.b32-enemy-info-row {
 display: flex;
 justify-content: space-between;
 align-items: center;
 padding: 9px 0;
 border-bottom: 1px solid rgba(255,255,255,.08);
 font-size: 13px;
}

.b32-enemy-info-row span {
 color: rgba(232,228,220,.55);
}

.b32-enemy-info-row strong {
 color: #fff0d0;
 font-weight: 700;
}

.b32-enemy-info-close {
 width: 100%;
 margin-top: 16px;
 padding: 10px 0;
 border: 1px solid rgba(255,255,255,.14);
 border-radius: 999px;
 background: rgba(255,255,255,.06);
 color: rgba(232,228,220,.85);
 font-family: "Noto Serif JP", serif;
}

 .b32-cell.enemy-move-guide {
 background:
 radial-gradient(circle at center, rgba(120, 180, 255, .26), transparent 62%),
 rgba(20, 50, 90, .24) !important;
 border-color: rgba(120, 190, 255, .70) !important;
 box-shadow:
 inset 0 0 14px rgba(80, 160, 255, .24),
 0 0 16px rgba(80, 160, 255, .28) !important;
}

.b32-cell.enemy-move-guide::after {
 content: 'MOVE';
 position: absolute;
 left: 50%;
 top: 3px;
 transform: translateX(-50%);
 font-family: 'Cinzel', serif;
 font-size: 7px;
 letter-spacing: 1px;
 color: rgba(160, 210, 255, .9);
 pointer-events: none;
 text-shadow: 0 0 6px rgba(80,160,255,.8);
}


.b32-cell.enemy-attack-guide {
 background:
 radial-gradient(circle at center, rgba(255, 120, 110, .30), transparent 62%),
 rgba(90, 24, 28, .26) !important;
 border-color: rgba(255, 125, 125, .76) !important;
 box-shadow:
 inset 0 0 14px rgba(255, 80, 80, .24),
 0 0 16px rgba(255, 70, 70, .28) !important;
}

.b32-cell.enemy-attack-guide::after {
 content: 'ATK';
 position: absolute;
 left: 50%;
 top: 3px;
 transform: translateX(-50%);
 font-family: 'Cinzel', serif;
 font-size: 7px;
 letter-spacing: 1px;
 color: rgba(255, 190, 180, .96);
 pointer-events: none;
 text-shadow: 0 0 6px rgba(255,80,80,.88);
}

.b32-cell.enemy-attack-target {
 background:
 radial-gradient(circle at center, rgba(255, 235, 150, .34), transparent 58%),
 rgba(110, 50, 20, .30) !important;
 border-color: rgba(255, 220, 120, .86) !important;
 box-shadow:
 inset 0 0 14px rgba(255, 210, 100, .30),
 0 0 18px rgba(255, 170, 80, .34) !important;
}

.b32-cell.enemy-attack-target::after {
 content: 'TARGET';
 position: absolute;
 left: 50%;
 top: 3px;
 transform: translateX(-50%);
 font-family: 'Cinzel', serif;
 font-size: 7px;
 letter-spacing: 1px;
 color: rgba(255, 235, 170, .98);
 pointer-events: none;
 text-shadow: 0 0 7px rgba(255,120,80,.92);
}

#b32-enemy-quick-info,
.b32-enemy-quick-info {
 position: fixed;
 left: auto;
 top: auto;
 right: auto;
 bottom: auto;
 transform: none !important;
 z-index: 3000000;

 width: min(320px, calc(100vw - 28px));
 padding: 9px 11px 10px;
 border-radius: 12px;

 background: rgba(10, 8, 16, .94);
 border: 1px solid rgba(220,120,120,.38);
 box-shadow: 0 0 18px rgba(180,40,40,.24), 0 10px 24px rgba(0,0,0,.46);

 color: #e8e4dc;
 font-family: "Noto Serif JP", serif;
 pointer-events: auto;

 transform-style: flat;
 backface-visibility: hidden;
 transition: opacity .16s ease, left .12s ease, top .12s ease;
}

.b32-enemy-quick-info.is-guide-mode {
 width: min(300px, calc(100vw - 34px));
 padding: 7px 9px 8px;
 opacity: .92;
}

.b32-enemy-quick-title {
 font-family: "Cinzel", serif;
 font-size: 11px;
 letter-spacing: 2px;
 color: #ffb0b0;
 text-align: center;
 margin-bottom: 4px;
 white-space: nowrap;
 overflow: hidden;
 text-overflow: ellipsis;
}

.b32-enemy-quick-info.is-guide-mode .b32-enemy-quick-title {
 font-size: 10px;
 margin-bottom: 2px;
 color: rgba(255,190,190,.82);
}

.b32-enemy-quick-mode-label {
 display: none;
 margin-bottom: 4px;
 text-align: center;
 font-size: 10px;
 letter-spacing: .12em;
 color: rgba(232,228,220,.78);
}
.b32-enemy-quick-info.is-guide-mode .b32-enemy-quick-mode-label {
 display: block;
}
.b32-enemy-quick-info.is-guide-mode.is-move .b32-enemy-quick-mode-label {
 color: rgba(185,225,255,.98);
 text-shadow: 0 0 8px rgba(80,160,255,.38);
}
.b32-enemy-quick-info.is-guide-mode.is-attack .b32-enemy-quick-mode-label {
 color: rgba(255,220,205,.98);
 text-shadow: 0 0 8px rgba(255,80,70,.38);
}

.b32-enemy-quick-row {
 display: flex;
 justify-content: space-between;
 font-size: 10px;
 line-height: 1.45;
}

.b32-enemy-quick-row span {
 color: rgba(232,228,220,.55);
}

.b32-enemy-quick-row strong {
 color: #fff0d0;
}

.b32-enemy-quick-statline {
 display: flex;
 justify-content: space-between;
 gap: 8px;
 font-size: 10px;
 line-height: 1.45;
 color: rgba(232,228,220,.58);
}

.b32-enemy-quick-statline strong {
 color: #fff0d0;
}

.b32-enemy-quick-info.is-guide-mode .b32-enemy-quick-statline {
 display: none;
}

.b32-enemy-quick-actions {
 display: grid;
 grid-template-columns: 1fr 1fr auto;
 gap: 6px;
 margin-top: 8px;
}

.b32-enemy-quick-info.is-guide-mode .b32-enemy-quick-actions {
 margin-top: 4px;
}

.b32-enemy-quick-btn,
.b32-enemy-quick-close {
 min-height: 28px;
 border-radius: 999px;
 border: 1px solid rgba(255,255,255,.14);
 background: rgba(255,255,255,.06);
 color: rgba(232,228,220,.88);
 font-family: "Noto Serif JP", serif;
 font-size: 11px;
 letter-spacing: .08em;
 cursor: pointer;
 pointer-events: auto;
 touch-action: manipulation;
 -webkit-tap-highlight-color: transparent;
}

.b32-enemy-quick-info.is-guide-mode .b32-enemy-quick-btn,
.b32-enemy-quick-info.is-guide-mode .b32-enemy-quick-close {
 min-height: 26px;
 font-size: 10px;
}

.b32-enemy-quick-btn.active.move {
 border-color: rgba(120,190,255,.75);
 background: rgba(70,150,255,.20);
 color: rgba(185,225,255,.98);
 box-shadow: 0 0 12px rgba(80,160,255,.25);
}

.b32-enemy-quick-btn.active.attack {
 border-color: rgba(255,150,130,.76);
 background: rgba(255,80,70,.18);
 color: rgba(255,220,205,.98);
 box-shadow: 0 0 12px rgba(255,80,70,.25);
}

.b32-enemy-quick-close {
 width: 34px;
 padding: 0;
}


/* ── ロスター情報 閉じるボタン：タップ優先 ── */
#battle32-root .b32-roster-info-panel {
 position: fixed !important;
 pointer-events: auto !important;
}
#battle32-root .b32-roster-info-close {
 position: absolute !important;
 top: 6px !important;
 right: 6px !important;
 z-index: 3000010 !important;
 pointer-events: auto !important;
 touch-action: manipulation !important;
 -webkit-tap-highlight-color: transparent;
 width: 28px !important;
 height: 28px !important;
 border-radius: 999px !important;
 border: 1px solid rgba(255,255,255,.22) !important;
 background: rgba(0,0,0,.68) !important;
 color: rgba(232,228,220,.96) !important;
 font-size: 18px !important;
 line-height: 1 !important;
 display: flex !important;
 align-items: center !important;
 justify-content: center !important;
 cursor: pointer !important;
}
#battle32-root .b32-roster-info-close:active {
 transform: scale(.92);
 background: rgba(255,255,255,.14) !important;
}

/* ── Battle右上メニュー ── */
#b32-battle-menu {
 position: fixed;
 top: calc(env(safe-area-inset-top, 0px) + 10px);
 right: 10px;
 z-index: 3000000;
 font-family: "Noto Serif JP", serif;
}

#b32-battle-menu-btn {
 min-width: 58px;
 height: 30px;
 border-radius: 999px;
 border: 1px solid rgba(255,255,255,.18);
 background: rgba(8, 8, 16, .72);
 color: rgba(232,228,220,.88);
 font-size: 10px;
 letter-spacing: 1.5px;
 cursor: pointer;
 backdrop-filter: none;
 -webkit-backdrop-filter: none;
}

#b32-battle-menu-panel {
 position: absolute;
 top: 36px;
 right: 0;
 width: 150px;
 padding: 8px;
 border-radius: 12px;
 background: rgba(8, 8, 16, .92);
 border: 1px solid rgba(255,255,255,.14);
 box-shadow: 0 10px 28px rgba(0,0,0,.55);
 display: none;
}

#b32-battle-menu.open #b32-battle-menu-panel {
 display: flex;
 flex-direction: column;
 gap: 6px;
}

.b32-battle-menu-item {
 width: 100%;
 padding: 9px 8px;
 border: 1px solid rgba(255,255,255,.10);
 border-radius: 9px;
 background: rgba(255,255,255,.05);
 color: rgba(232,228,220,.86);
 font-size: 11px;
 text-align: left;
 cursor: pointer;
}

.b32-battle-menu-item.danger {
 color: #ffb0b0;
 border-color: rgba(255,90,90,.22);
}


/* ============================================================
   Enemy info guide clarity update
   - 敵タップ可能表示の紫リングは非表示
   - 移動範囲は青、攻撃範囲は赤、攻撃対象は橙で明確化
   ============================================================ */
.b32-cell.enemy-inspectable::after {
  content: none !important;
  display: none !important;
  border: none !important;
  box-shadow: none !important;
}
.b32-cell.enemy-move-guide {
  background:
    linear-gradient(145deg, rgba(60,190,255,.46), rgba(10,80,135,.34)),
    rgba(20,120,190,.30) !important;
  border-color: rgba(70,205,255,.98) !important;
  box-shadow:
    inset 0 0 18px rgba(60,205,255,.42),
    0 0 18px rgba(40,175,255,.48),
    0 0 0 2px rgba(70,205,255,.52) !important;
}
.b32-cell.enemy-move-guide::after {
  content: 'MOVE' !important;
  position: absolute;
  left: 50%;
  top: 3px;
  transform: translateX(-50%);
  z-index: 8;
  font-family: 'Cinzel', serif;
  font-size: 7px;
  letter-spacing: 1px;
  color: rgba(230,250,255,.98);
  pointer-events: none;
  text-shadow: 0 0 7px rgba(0,120,255,.95), 0 1px 2px rgba(0,0,0,.55);
}
.b32-cell.enemy-attack-guide {
  background:
    linear-gradient(145deg, rgba(255,90,80,.48), rgba(120,22,28,.36)),
    rgba(180,42,45,.28) !important;
  border-color: rgba(255,95,92,.98) !important;
  box-shadow:
    inset 0 0 18px rgba(255,70,70,.42),
    0 0 18px rgba(255,50,50,.44),
    0 0 0 2px rgba(255,90,90,.46) !important;
}
.b32-cell.enemy-attack-guide::after {
  content: 'ATK' !important;
  position: absolute;
  left: 50%;
  top: 3px;
  transform: translateX(-50%);
  z-index: 8;
  font-family: 'Cinzel', serif;
  font-size: 7px;
  letter-spacing: 1px;
  color: rgba(255,245,240,.98);
  pointer-events: none;
  text-shadow: 0 0 7px rgba(255,30,30,.98), 0 1px 2px rgba(0,0,0,.55);
}
.b32-cell.enemy-attack-target {
  background:
    linear-gradient(145deg, rgba(255,200,72,.58), rgba(190,70,18,.38)),
    rgba(240,130,28,.34) !important;
  border-color: rgba(255,220,95,.98) !important;
  box-shadow:
    inset 0 0 20px rgba(255,210,80,.48),
    0 0 20px rgba(255,140,40,.52),
    0 0 0 2px rgba(255,210,90,.60) !important;
}
.b32-cell.enemy-attack-target::after {
  content: 'TARGET' !important;
  position: absolute;
  left: 50%;
  top: 3px;
  transform: translateX(-50%);
  z-index: 8;
  font-family: 'Cinzel', serif;
  font-size: 7px;
  letter-spacing: 1px;
  color: rgba(70,30,0,.95);
  pointer-events: none;
  text-shadow: 0 0 6px rgba(255,255,200,.95), 0 1px 2px rgba(255,255,255,.55);
}

 `;
 document.head.appendChild(chipStyle);

 // ── ボス危険エリア用スタイル ──
 if (document.getElementById('b32-danger-style')) return;
 const dangerStyle = document.createElement('style');
 dangerStyle.id = 'b32-danger-style';
 dangerStyle.textContent = `
 /* ── ボス危険エリア：通常攻撃（薄い赤） ── */
 .b32-cell.boss-danger-normal {
 background:
 radial-gradient(circle at center, rgba(255, 80, 80, .18), transparent 62%),
 rgba(60, 8, 8, .18) !important;
 border-color: rgba(255, 90, 90, .38) !important;
 box-shadow:
 inset 0 0 10px rgba(255, 60, 60, .18),
 0 0 8px rgba(255, 40, 40, .14) !important;
 }

 /* ── ボス危険エリア：予兆攻撃（オレンジ） ── */
 .b32-cell.boss-danger-warn {
 background:
 linear-gradient(145deg, rgba(255, 150, 40, .24), rgba(80, 20, 0, .28)),
 rgba(50, 10, 0, .22) !important;
 border-color: rgba(255, 170, 60, .60) !important;
 box-shadow:
 inset 0 0 14px rgba(255, 150, 40, .24),
 0 0 14px rgba(255, 120, 40, .24) !important;
 }

 /* ── ボス危険エリア：直線強攻撃（濃い赤＋点滅） ── */
 .b32-cell.boss-danger-line {
 background:
 linear-gradient(180deg, rgba(255, 40, 40, .34), rgba(80, 0, 0, .34)),
 rgba(60, 0, 0, .30) !important;
 border-color: rgba(255, 70, 70, .82) !important;
 box-shadow:
 inset 0 0 18px rgba(255, 40, 40, .34),
 0 0 18px rgba(255, 20, 20, .34) !important;
 /* filter: brightness() は子要素の transform を潰すため使わない */
 animation: b32DangerPulse 1.2s ease-in-out infinite;
 }

 /* 点滅は border-color の opacity 変化で表現（filter 非使用） */
 @keyframes b32DangerPulse {
 0%, 100% {
 border-color: rgba(255, 70, 70, .82) !important;
 box-shadow:
 inset 0 0 18px rgba(255, 40, 40, .34),
 0 0 18px rgba(255, 20, 20, .34) !important;
 }
 50% {
 border-color: rgba(255, 120, 120, 1) !important;
 box-shadow:
 inset 0 0 28px rgba(255, 60, 60, .55),
 0 0 28px rgba(255, 40, 40, .55) !important;
 }
 }

 /* ── コアセルに危険エリアが重なった場合：点滅アニメを止めてコア表示を保護 ── */
 .b32-cell.boss-danger-line:has(.b32-core-object),
 .b32-cell.boss-danger-warn:has(.b32-core-object),
 .b32-cell.boss-danger-normal:has(.b32-core-object) {
 animation: none !important;
 }

 /* :has() 非対応ブラウザ向けフォールバック（JS で has-core クラスを付与） */
 .b32-cell.has-core.boss-danger-line,
 .b32-cell.has-core.boss-danger-warn,
 .b32-cell.has-core.boss-danger-normal {
 animation: none !important;
 }

 /* ── 危険エリア + スキル範囲が重なった場合：スキル範囲を前面に ── */
 .b32-cell.boss-danger-normal.skill-target-enemy,
 .b32-cell.boss-danger-warn.skill-target-enemy,
 .b32-cell.boss-danger-line.skill-target-enemy {
 background:
 linear-gradient(145deg, rgba(255,100,60,.22), rgba(40,8,4,.34)),
 rgba(18,6,4,.52) !important;
 border-color: rgba(255,130,70,.70) !important;
 box-shadow:
 inset 0 0 14px rgba(255,100,50,.24),
 0 0 16px rgba(255,100,50,.28) !important;
 animation: none !important;
 }

 .b32-cell.boss-danger-normal.skill-range,
 .b32-cell.boss-danger-warn.skill-range,
 .b32-cell.boss-danger-line.skill-range {
 animation: none !important;
 }

 /* ── 危険エリア + 移動可能セルが重なった場合：movable枠を上書きしない ── */
 .b32-cell.boss-danger-normal.movable,
 .b32-cell.boss-danger-warn.movable,
 .b32-cell.boss-danger-line.movable {
 /* movable の枠は残し、危険の背景だけを重ねる */
 animation: none !important;
 }
 `;
 document.head.appendChild(dangerStyle);

 // ── 駒取りマス（move-capture）スタイル ──
 if (!document.getElementById('b32-move-capture-style')) {
 const moveCaptureStyle = document.createElement('style');
 moveCaptureStyle.id = 'b32-move-capture-style';
 moveCaptureStyle.textContent = `
 /* ── 駒取り可能マス（赤金系） ── */
 .b32-cell.move-capture {
 background:
 linear-gradient(145deg, rgba(255,180,30,.22), rgba(40,8,4,.34)),
 rgba(18,6,4,.52) !important;
 border-color: rgba(255,160,40,.85) !important;
 box-shadow:
 inset 0 0 14px rgba(255,150,30,.28),
 0 0 18px rgba(255,140,20,.35) !important;
 cursor: pointer;
 }
 .b32-cell.move-capture::after {
 content: '×';
 position: absolute;
 top: 2px; right: 4px;
 font-size: 9px;
 color: rgba(255,180,40,.85);
 pointer-events: none;
 }
 `;
 document.head.appendChild(moveCaptureStyle);
 }

 // ── 召喚マス・アイテムターゲット スタイル ──
 if (!document.getElementById('b32-summon-item-style')) {
   const siStyle = document.createElement('style');
   siStyle.id = 'b32-summon-item-style';
   siStyle.textContent = `
     /* ── 召喚可能マス（青系） ── */
     .b32-cell.summon-cell {
       background:
         radial-gradient(circle at center, rgba(80,160,255,.22), transparent 62%),
         rgba(10,30,70,.24) !important;
       border-color: rgba(80,160,255,.72) !important;
       box-shadow:
         inset 0 0 14px rgba(60,140,255,.22),
         0 0 14px rgba(60,140,255,.28) !important;
       cursor: pointer;
     }
     /* ── アイテム移動先マス（緑系） ── */
     .b32-cell.item-cell-target {
       background:
         radial-gradient(circle at center, rgba(80,220,140,.20), transparent 62%),
         rgba(10,50,30,.22) !important;
       border-color: rgba(80,220,140,.65) !important;
       box-shadow:
         inset 0 0 12px rgba(60,200,120,.20),
         0 0 12px rgba(60,200,120,.24) !important;
       cursor: pointer;
     }
   `;
   document.head.appendChild(siStyle);
 }
 if (!document.getElementById('b32-stun-style')) {
 const stunStyle = document.createElement('style');
 stunStyle.id = 'b32-stun-style';
 stunStyle.textContent = `
 /* ── スタン中ユニット ── */
 .b32-unit.is-stunned {
 position: relative;
 overflow: visible;
 }
 .b32-stun-fx {
 position: absolute;
 inset: -4px;
 pointer-events: none;
 z-index: 6;
 }
 .b32-stun-ring {
 position: absolute;
 left: 50%;
 top: 18%;
 width: 42px;
 height: 18px;
 transform: translateX(-50%);
 border-radius: 50%;
 border: 1px solid rgba(255, 235, 120, .85);
 box-shadow:
 0 0 6px rgba(255, 235, 120, .55),
 0 0 10px rgba(160, 220, 255, .35);
 opacity: .85;
 animation: b32StunRingPulse 900ms ease-in-out infinite;
 }
 .b32-stun-spark {
 position: absolute;
 width: 12px;
 height: 12px;
 border-radius: 2px;
 opacity: 0;
 transform: scale(.8) rotate(0deg);
 background:
 linear-gradient(135deg,
 rgba(255,255,255,.95) 0%,
 rgba(255,240,120,.95) 40%,
 rgba(120,220,255,.85) 100%);
 clip-path: polygon(45% 0%, 62% 35%, 100% 35%, 56% 100%, 42% 62%, 0% 62%);
 animation: b32StunSpark 820ms steps(1, end) infinite;
 }
 .b32-stun-spark.s1 { left: 18%; top: 22%; animation-delay: 0ms; }
 .b32-stun-spark.s2 { right: 16%; top: 28%; animation-delay: 240ms; }
 .b32-stun-spark.s3 { left: 44%; top: 8%; animation-delay: 460ms; }
 .b32-stun-badge {
 position: absolute;
 right: -2px;
 top: -4px;
 font-size: 12px;
 line-height: 1;
 color: #fff2a8;
 text-shadow:
 0 0 6px rgba(255,230,120,.85),
 0 0 10px rgba(120,220,255,.55);
 animation: b32StunBadgeFlicker 700ms ease-in-out infinite;
 }
 .b32-party-card { position: relative; }
 .b32-party-status-badge.stun {
 position: absolute;
 bottom: 2px;
 left: 50%;
 transform: translateX(-50%);
 font-size: 8px;
 font-family: 'Cinzel', serif;
 letter-spacing: 1px;
 color: #fff2a8;
 background: rgba(40,20,0,.75);
 border: 1px solid rgba(255,230,100,.45);
 border-radius: 4px;
 padding: 1px 4px;
 white-space: nowrap;
 pointer-events: none;
 text-shadow: 0 0 6px rgba(255,230,120,.8);
 animation: b32StunBadgeFlicker 700ms ease-in-out infinite;
 z-index: 5;
 }
 @keyframes b32StunRingPulse {
 0% { opacity: .55; transform: translateX(-50%) scale(.96); }
 50% { opacity: .95; transform: translateX(-50%) scale(1.03); }
 100% { opacity: .55; transform: translateX(-50%) scale(.96); }
 }
 @keyframes b32StunSpark {
 0% { opacity: 0; transform: scale(.75) rotate(-8deg); }
 20% { opacity: .95; transform: scale(1.0) rotate(6deg); }
 45% { opacity: .35; }
 100% { opacity: 0; transform: scale(.82) rotate(-4deg); }
 }
 @keyframes b32StunBadgeFlicker {
 0%, 100% { opacity: .65; transform: translateX(-50%) translateY(0); }
 50% { opacity: 1; transform: translateX(-50%) translateY(-1px); }
 }
 `;
 document.head.appendChild(stunStyle);
 }

 // ── ULT使用可能演出スタイル ──
 if (document.getElementById('b32-ult-ready-style')) return;
 const ultReadyStyle = document.createElement('style');
 ultReadyStyle.id = 'b32-ult-ready-style';
 ultReadyStyle.textContent = `
 /* ── ULT使用可能：鼓動 + 発光 ── */
 .b32-float-action-btn.ult.ult-ready {
 position: relative;
 overflow: visible !important;
 color: #fff4c8 !important;
 border-color: rgba(255, 190, 80, .95) !important;
 background:
 radial-gradient(circle at 50% 65%, rgba(255, 120, 20, .42), transparent 58%),
 linear-gradient(180deg, rgba(120, 30, 10, .60), rgba(35, 4, 4, .92)) !important;
 box-shadow:
 0 0 10px rgba(255, 210, 90, .85),
 0 0 22px rgba(255, 110, 30, .70),
 0 0 42px rgba(255, 40, 20, .42),
 inset 0 0 12px rgba(255, 180, 70, .38) !important;
 animation:
 b32UltHeartbeat 1.05s ease-in-out infinite,
 b32UltGlow 1.6s ease-in-out infinite;
 }

 /* 外側の脈動リング */
 .b32-float-action-btn.ult.ult-ready::after {
 content: '';
 position: absolute;
 inset: -6px;
 border-radius: 999px;
 pointer-events: none;
 border: 1px solid rgba(255, 210, 100, .65);
 box-shadow:
 0 0 10px rgba(255, 190, 70, .75),
 0 0 24px rgba(255, 80, 30, .45);
 opacity: .75;
 animation: b32UltPulseRing 1.05s ease-out infinite;
 }

 /* ── ULTボタン：重なり順の基準 ── */
 .b32-float-action-btn.ult {
 position: relative;
 isolation: isolate;
 }

 /* 魂炎は文字より背面 */
 .b32-ult-soul-flame {
 z-index: 0 !important;
 }

 /* ── ULT文字：通常時 ── */
 .b32-float-action-btn.ult .b32-ult-label {
 position: relative;
 z-index: 5 !important;
 display: inline-flex;
 align-items: center;
 justify-content: center;

 font-family: 'Cinzel', serif;
 font-size: 11px;
 font-weight: 800;
 letter-spacing: 1px;

 color: #fff7d0;
 text-shadow:
 0 0 4px rgba(255,255,255,.95),
 0 0 10px rgba(255,230,140,.95),
 0 0 18px rgba(255,160,60,.75),
 0 1px 3px rgba(0,0,0,1);

 pointer-events: none;
 transform-origin: center center;
 }

 /* ── ULT使用可能時：文字も鼓動＋シアン発光 ── */
 .b32-float-action-btn.ult.ult-ready .b32-ult-label {
 color: #ffffff;
 font-size: 12px;

 text-shadow:
 0 0 5px rgba(255,255,255,1),
 0 0 12px rgba(160,255,255,.95),
 0 0 22px rgba(60,230,255,.85),
 0 0 34px rgba(255,200,80,.55),
 0 2px 4px rgba(0,0,0,1);

 animation: b32UltLabelHeartbeat 1.05s ease-in-out infinite;
 }

 /* disabled 時は文字鼓動を止める */
 .b32-float-action-btn.ult.disabled .b32-ult-label {
 animation: none !important;
 }

 /* ボタン本体の b32UltHeartbeat と同周期・同タイミング */
 @keyframes b32UltLabelHeartbeat {
 0%, 100% {
 transform: translateY(-1px) scale(1);
 filter: brightness(1);
 }
 12% {
 transform: translateY(-1px) scale(1.22);
 filter: brightness(1.45);
 }
 24% {
 transform: translateY(-1px) scale(1.04);
 filter: brightness(1.08);
 }
 38% {
 transform: translateY(-1px) scale(1.16);
 filter: brightness(1.32);
 }
 56% {
 transform: translateY(-1px) scale(1);
 filter: brightness(1);
 }
 }

 /* ── 魂炎SVGレイヤー ── */
 .b32-ult-soul-flame {
 position: absolute;
 left: 50%;
 bottom: -10px;
 width: 58px;
 height: 86px;
 transform: translateX(-50%);
 pointer-events: none;
 z-index: 0;
 opacity: .95;
 animation: b32UltFlameFloat 1.05s ease-in-out infinite;
 }

 .b32-ult-soul-flame svg {
 width: 100%;
 height: 100%;
 overflow: visible;
 filter:
 drop-shadow(0 0 5px rgba(80, 255, 255, .95))
 drop-shadow(0 0 14px rgba(40, 220, 255, .75))
 drop-shadow(0 0 28px rgba(40, 160, 255, .42));
 }

 .b32-ult-flame-outer,
 .b32-ult-flame-inner {
 fill: none;
 stroke-linecap: round;
 stroke-linejoin: round;
 }

 .b32-ult-flame-outer {
 stroke: rgba(40, 255, 255, .95);
 stroke-width: 8;
 }

 .b32-ult-flame-inner {
 stroke: rgba(150, 255, 255, .92);
 stroke-width: 6;
 }

 /* 魂炎の浮遊・ゆらぎ */
 @keyframes b32UltFlameFloat {
 0%, 100% {
 transform: translateX(-50%) translateY(2px) scale(.96) rotate(-1deg);
 opacity: .72;
 }
 50% {
 transform: translateX(-50%) translateY(-7px) scale(1.08) rotate(1deg);
 opacity: 1;
 }
 }

 /* disabled 時は燃やさない */
 .b32-float-action-btn.ult.disabled {
 animation: none !important;
 }
 .b32-float-action-btn.ult.disabled::after {
 display: none !important;
 }
 .b32-float-action-btn.ult.disabled .b32-ult-soul-flame {
 display: none !important;
 }

 /* overflow を親まで伝播させる */
 .b32-floating-actions {
 overflow: visible !important;
 }

 /* ── 三角配置レイアウト ── */
 .b32-floating-actions.b32-triangle-layout {
 display: flex;
 flex-direction: column;
 align-items: flex-end;
 gap: 0;
 overflow: visible;
 }
 .b32-float-row {
 display: flex;
 justify-content: flex-end;
 }
 /* ULT: 一番上・右端 */
 .b32-float-row--top {
 margin-right: 0;
 }
 /* 終了: 真ん中・少し左にずらす */
 .b32-float-row--mid {
 margin-right: 50px;
 margin-top: -6px;
 }
 /* 戻る: 一番下・さらに左にずらす */
 .b32-float-row--bot {
 margin-right: 100px;
 margin-top: -6px;
 }

 /* 戻るボタン基本スタイル（endボタンに準じる・控えめな色） */
 .b32-float-action-btn.back {
 background: rgba(60, 60, 80, 0.82);
 border: 1px solid rgba(160, 160, 200, 0.45);
 color: rgba(200, 200, 220, 0.85);
 font-size: 13px;
 font-family: 'Cinzel', serif;
 letter-spacing: 1px;
 }
 .b32-float-action-btn.back:active {
 filter: brightness(1.15);
 }

 @keyframes b32UltHeartbeat {
 0%, 100% { transform: scale(1); }
 12% { transform: scale(1.08); }
 24% { transform: scale(1.02); }
 38% { transform: scale(1.06); }
 56% { transform: scale(1); }
 }

 @keyframes b32UltGlow {
 0%, 100% { filter: brightness(1); }
 50% { filter: brightness(1.32); }
 }

 @keyframes b32UltPulseRing {
 0% { transform: scale(.92); opacity: .85; }
 70% { transform: scale(1.32); opacity: .18; }
 100% { transform: scale(1.42); opacity: 0; }
 }
 `;
 document.head.appendChild(ultReadyStyle);

 // ── 行動選択メニュー CSS ──
 if (!document.getElementById('b32-action-radial-style')) {
 const menuStyle = document.createElement('style');
 menuStyle.id = 'b32-action-radial-style';
 menuStyle.textContent = `
 .b32-action-radial-menu {
 position: fixed;
 right: 14px;
 bottom: 120px; /* フォールバック：renderActionMenu()が実測値で上書きする */
 z-index: 99999;
 pointer-events: none;
 }
 .b32-action-circle-btn {
 position: absolute;
 width: 54px;
 height: 54px;
 border-radius: 50%;
 border: 1px solid rgba(255,255,255,.22);
 background: rgba(12, 14, 24, .88);
 color: rgba(245, 238, 210, .92);
 font-family: 'Noto Serif JP', serif;
 font-size: 11px;
 letter-spacing: 1px;
 text-align: center;
 line-height: 1;
 display: flex;
 align-items: center;
 justify-content: center;
 box-shadow:
 0 0 10px rgba(0,0,0,.55),
 inset 0 0 10px rgba(255,255,255,.05);
 pointer-events: auto;
 cursor: pointer;
 -webkit-tap-highlight-color: transparent;
 transition: opacity .12s, transform .1s;
 }
 .b32-action-circle-btn:active {
 transform: scale(.92);
 }
 .b32-action-circle-btn.disabled {
 opacity: .28;
 pointer-events: none;
 }
 /* ボタン配置は battle_32_ui.css で管理 */
 `;
 document.head.appendChild(menuStyle);
 }

 // ── 属性アイコン CSS ──
 if (!document.getElementById('b32-element-icon-style')) {
   const elemStyle = document.createElement('style');
   elemStyle.id = 'b32-element-icon-style';
   elemStyle.textContent = `
     /* 盤面ユニット上の属性アイコン */
     .b32-element-icon {
       position: absolute;
       top: 2px;
       right: 2px;
       width: 18px;
       height: 18px;
       object-fit: contain;
       z-index: 8;
       border-radius: 50%;
       filter: drop-shadow(0 1px 2px rgba(0,0,0,.85));
       pointer-events: none;
     }
     .b32-cell .b32-element-icon {
       width: clamp(14px, calc(var(--cell-size, 52px) * 0.32), 22px);
       height: clamp(14px, calc(var(--cell-size, 52px) * 0.32), 22px);
     }
     .b32-unit.midboss .b32-element-icon,
     .b32-unit.enemy-id-enemy_01 .b32-element-icon {
       width: 22px;
       height: 22px;
     }

     /* 味方カード（下部パネル）の属性アイコン */
     .b32-party-img-wrap {
       position: relative;
     }
     .b32-party-element-icon {
       position: absolute;
       top: 3px;
       left: 4px;
       width: 16px;
       height: 16px;
       object-fit: contain;
       border-radius: 50%;
       z-index: 8;
       filter: drop-shadow(0 1px 2px rgba(0,0,0,.85));
       pointer-events: none;
     }

     /* 敵情報ウィンドウの属性行 */
     .b32-enemy-info-element {
       display: inline-flex;
       align-items: center;
       gap: 6px;
     }
     .b32-info-element-icon {
       width: 20px;
       height: 20px;
       object-fit: contain;
       border-radius: 50%;
       filter: drop-shadow(0 1px 2px rgba(0,0,0,.75));
     }
   `;
   document.head.appendChild(elemStyle);
 }
 }

 // ============================================================
 // DOM 構築
 // ============================================================
 function buildRoot() {
 if (document.getElementById(ROOT_ID)) return;
 injectStyle();

 const root = document.createElement('div');
 root.id = ROOT_ID;
 root.innerHTML = `
 <div id="b32-header">
 <!-- 左: BATTLE 01 / UNREGISTERED DEITY -->
 <div id="b32-turn-box">
 <div id="b32-battle-title">BATTLE <span id="b32-stage-id">01</span></div>
 <div id="b32-battle-subtitle">UNREGISTERED DEITY</div>
 </div>
 <!-- 中央: TURN 05 / 12 -->
 <div id="b32-phase-badge">
 <div id="b32-turn-center">
 <span id="b32-turn-label">TURN</span>
 <span id="b32-turn-num-large" id="b32-turn-num">1</span>
 <span id="b32-turn-slash">/</span>
 <span id="b32-turn-max">—</span>
 </div>
 </div>
 <!-- 右: 神気マーカー等 -->
 <div id="b32-stage-label">
 <span id="b32-stage-id-right"></span>
 </div>
 </div>

 <div id="rl-hud" aria-label="Roguelite Stage Progress"></div>

 <!-- 上部メッセージバー：ステージ進捗の直下に表示 -->
 <div id="b32-bottom-guide"></div>

 <div id="b32-hint-bar"></div>

 <div id="b32-boss-hp-ui" style="display:none">
 <div id="b32-boss-hp-layout">
 <!-- 左: 菱形紋章 + BOSS -->
 <div id="b32-boss-hp-left">
 <div id="b32-boss-hp-emblem"></div>
 <div id="b32-boss-hp-name">BOSS</div>
 </div>
 <!-- 中央: RESISTANCE ラベル + バー -->
 <div id="b32-boss-hp-center">
 <div id="b32-boss-hp-resistance-label">RESISTANCE</div>
 <div id="b32-boss-hp-bar-wrap">
 <div id="b32-boss-hp-bar"></div>
 </div>
 </div>
 <!-- 右: HP数値 -->
 <div id="b32-boss-hp-text"></div>
 </div>
 </div>

 <div id="b32-scroll">
 <div id="b32-board-wrap">
 <div id="b32-board"></div>
 </div>

 <div id="b32-log-wrap"><div id="b32-log"></div></div>

 <div id="b32-bottom-area">

 <!-- パーティステータス：常時表示 -->
 <div id="b32-party-status"></div>

 <!-- スキルフェーズ：スキルパネル -->
<div id="b32-skill-panel" style="display:none">
 <div id="b32-skill-chara-name"></div>

 <div id="b32-skill-list"></div>

 <div id="b32-skill-detail-box" style="display:none">
 <div id="b32-skill-detail-name"></div>
 <div id="b32-skill-detail-desc"></div>
 <div id="b32-skill-detail-meta"></div>

 <div id="b32-skill-detail-actions">
 <button type="button" id="b32-skill-confirm-btn" class="b32-skill-confirm-btn">
 決定
 </button>
 </div>
 </div>
</div>

<!-- ボトム固定アクションバー -->
<div id="b32-actions" class="b32-bottom-actions">
  <button id="b32-btn-summon" class="b32-bottom-action summon" type="button" onclick="_b32OnBottomSummonTap()">
    <span class="b32-bottom-action-main">
      <span class="b32-bottom-action-icon">✦</span>
      <span class="b32-bottom-action-label">召喚</span>
    </span>
    <span class="b32-bottom-action-sub" id="b32-btn-summon-sub">待機選択</span>
  </button>

  <button id="b32-btn-move" class="b32-bottom-action move" type="button" onclick="_b32OnActionMoveTap()">
    <span class="b32-bottom-action-main">
      <span class="b32-bottom-action-icon">➜</span>
      <span class="b32-bottom-action-label">移動</span>
    </span>
    <span class="b32-bottom-action-cost">LINK 1</span>
  </button>

  <button id="b32-btn-skill" class="b32-bottom-action skill" type="button" onclick="_b32OnActionSkillTap()">
    <span class="b32-bottom-action-main">
      <span class="b32-bottom-action-icon">✦</span>
      <span class="b32-bottom-action-label">スキル</span>
    </span>
  </button>

  <button id="b32-btn-ult" class="b32-bottom-action ult" type="button" onclick="_b32OnActionUltTap()">
    <span class="b32-bottom-action-main">
      <span class="b32-bottom-action-icon">✧</span>
      <span class="b32-bottom-action-label">ULT</span>
    </span>
  </button>

  <button id="b32-btn-end-skill" class="b32-bottom-action end" type="button" onclick="_b32OnActionEndTap()">
    <span class="b32-bottom-action-main">
      <span class="b32-bottom-action-icon">⌛</span>
      <span class="b32-bottom-action-label">終了</span>
    </span>
    <span class="b32-bottom-action-cost">ターン終了</span>
  </button>
</div>

</div>

 </div>

 <div style="height:8px;flex-shrink:0"></div>
 </div>

 <div id="b32-result-overlay">
 <div id="b32-result-text"></div>
 <button class="b32-btn" id="b32-result-back-btn" style="max-width:200px">
 マップへ戻る
 </button>
 </div>
 `;
 document.body.appendChild(root);
 }

 // ============================================================
 // フェーズボタン（グローバル公開）
 // ============================================================
 // ============================================================
 // 中央テキスト演出
 // ============================================================
 // ── 操作ロック ──
 let _b32InputLocked = false;

 window.b32LockInput = function () { _b32InputLocked = true; };
 window.b32UnlockInput = function () { _b32InputLocked = false; };

 let _centerTextTimer = null;
let _centerTextTimer2 = null;
let _centerTextRaf = null;
let _centerTextSeq = 0;

window.showBattle32CenterText = function (main, sub, duration) {
  const seq = ++_centerTextSeq;

  // 既存タイマーを全クリア
  if (_centerTextTimer) {
    clearTimeout(_centerTextTimer);
    _centerTextTimer = null;
  }

  if (_centerTextTimer2) {
    clearTimeout(_centerTextTimer2);
    _centerTextTimer2 = null;
  }

  // iPhone Safari対策：前回のrequestAnimationFrameも必ずキャンセル
  if (_centerTextRaf) {
    cancelAnimationFrame(_centerTextRaf);
    _centerTextRaf = null;
  }

  // スタイルを確実に注入済みにする
  if (!document.getElementById('b32-center-text-style')) injectStyle();

  let el = document.getElementById('b32-center-text');
  if (!el) {
    el = document.createElement('div');
    el.id = 'b32-center-text';
    el.style.display = 'none';
    el.style.visibility = 'hidden';
    document.body.appendChild(el);
  }

  el.classList.remove('b32ct-visible');
  el.classList.add('b32ct-hidden');
  el.style.display = 'flex';
  el.style.visibility = 'visible';

  el.innerHTML = `
    <div class="b32ct-main">${main}</div>
    ${sub ? `<div class="b32ct-sub">${sub}</div>` : ''}
  `;

  void el.offsetWidth;

  _centerTextRaf = requestAnimationFrame(() => {
    // 古い表示命令なら無視
    if (seq !== _centerTextSeq) return;

    el.classList.remove('b32ct-hidden');
    el.classList.add('b32ct-visible');
    _centerTextRaf = null;
  });

  // CSSのtransitionが220msなので、少し余裕を見て300ms
  const exitDuration = 300;

  _centerTextTimer = setTimeout(() => {
    if (seq !== _centerTextSeq) return;

    el.classList.remove('b32ct-visible');
    el.classList.add('b32ct-hidden');

    _centerTextTimer2 = setTimeout(() => {
      if (seq !== _centerTextSeq) return;

      el.innerHTML = '';
      el.classList.remove('b32ct-visible', 'b32ct-hidden', 'b32ct-turn-danger');
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      _centerTextTimer2 = null;
    }, exitDuration);

    _centerTextTimer = null;
  }, duration || 1200);
};

window.showBattle32CenterTextAsync = function (main, sub, duration) {
  return new Promise(resolve => {
    window.showBattle32CenterText(main, sub, duration);

    // duration + exitDuration + 余裕
    setTimeout(resolve, (duration || 1200) + 350);
  });
};


// ============================================================
// COMBO専用中央演出
// 通常中央テキストとはDOM・タイマーを分離し、TURN/PHASE表示との競合を防ぐ。
// ============================================================
let _comboTextTimer = null;
let _comboTextTimer2 = null;
let _comboTextRaf = null;
let _comboTextSeq = 0;

function _ensureBattle32ComboTextStyle() {
  if (document.getElementById('b32-combo-text-style')) return;

  const style = document.createElement('style');
  style.id = 'b32-combo-text-style';
  style.textContent = `
    html body #b32-combo-text {
      position: fixed !important;
      inset: 0 !important;
      z-index: 5100000 !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      pointer-events: none !important;
      opacity: 0;
      visibility: hidden;
      transform: translate3d(0, 10px, 0) scale(.92);
      transition:
        opacity 180ms ease,
        transform 260ms cubic-bezier(.16, 1, .3, 1),
        visibility 0s linear 280ms;
      isolation: isolate;
    }
    html body #b32-combo-text.b32combo-visible {
      opacity: 1 !important;
      visibility: visible !important;
      transform: translate3d(0, 0, 0) scale(1) !important;
      transition-delay: 0s;
    }
    html body #b32-combo-text::before {
      content: '';
      position: absolute;
      inset: 24% 0;
      background: radial-gradient(ellipse at center,
        rgba(245, 218, 126, .22) 0%,
        rgba(35, 24, 8, .56) 38%,
        transparent 76%);
      pointer-events: none;
    }
    html body #b32-combo-text .b32combo-main,
    html body #b32-combo-text .b32combo-sub {
      position: relative;
      z-index: 1;
      white-space: nowrap;
    }
    html body #b32-combo-text .b32combo-main {
      font-family: 'Cinzel', serif;
      font-size: clamp(32px, 9vw, 58px);
      font-weight: 800;
      letter-spacing: 7px;
      color: #fff1a8;
      text-shadow:
        0 0 7px rgba(255,255,255,.9),
        0 0 20px rgba(255,214,80,.95),
        0 0 52px rgba(255,145,20,.72),
        0 3px 5px rgba(0,0,0,1);
    }
    html body #b32-combo-text .b32combo-sub {
      font-family: 'Noto Serif JP', serif;
      font-size: clamp(12px, 3.4vw, 18px);
      font-weight: 700;
      letter-spacing: 3px;
      color: rgba(255,248,220,.94);
      text-shadow: 0 0 12px rgba(255,190,70,.75), 0 2px 4px rgba(0,0,0,1);
    }
  `;
  document.head.appendChild(style);
}

window.showBattle32ComboTextAsync = function (main, sub, duration) {
  const showDuration = Number(duration || 620);
  const seq = ++_comboTextSeq;

  if (_comboTextTimer) clearTimeout(_comboTextTimer);
  if (_comboTextTimer2) clearTimeout(_comboTextTimer2);
  if (_comboTextRaf) cancelAnimationFrame(_comboTextRaf);
  _comboTextTimer = null;
  _comboTextTimer2 = null;
  _comboTextRaf = null;

  _ensureBattle32ComboTextStyle();

  let el = document.getElementById('b32-combo-text');
  if (!el) {
    el = document.createElement('div');
    el.id = 'b32-combo-text';
    document.body.appendChild(el);
  }

  el.classList.remove('b32combo-visible');
  el.innerHTML = `
    <div class="b32combo-main">${main}</div>
    ${sub ? `<div class="b32combo-sub">${sub}</div>` : ''}
  `;

  // 2フレームに分け、iOS Safariでも初期状態から確実に遷移させる。
  return new Promise(resolve => {
    _comboTextRaf = requestAnimationFrame(() => {
      _comboTextRaf = requestAnimationFrame(() => {
        if (seq !== _comboTextSeq) return resolve();
        el.classList.add('b32combo-visible');
        _comboTextRaf = null;

        _comboTextTimer = setTimeout(() => {
          if (seq !== _comboTextSeq) return resolve();
          el.classList.remove('b32combo-visible');
          _comboTextTimer = null;

          _comboTextTimer2 = setTimeout(() => {
            if (seq === _comboTextSeq) el.innerHTML = '';
            _comboTextTimer2 = null;
            resolve();
          }, 300);
        }, showDuration);
      });
    });
  });
};

 // ============================================================
 // ダメージ・回復 演出
 // ============================================================

 // 有効な BoundingClientRect かチェック（display:none の親があると 0 になる）
 function _validRect(el) {
 if (!el) return null;
 const r = el.getBoundingClientRect();
 if (r.width === 0 && r.height === 0) return null;
 return r;
 }

 // セルまたはカードの中心座標を返す（fixed座標系）
 // 優先順位：
 // ally: .b32-party-card[data-uid] → .b32-action-char-card[data-uid]
 // → 盤面セル → battle32-root 下部中央（フォールバック）
 // enemy: 盤面セル
 function _getUnitScreenPos(unitInfo) {
 if (!unitInfo) return null;

 // ── 敵：必ず盤面セル上に表示 ──
 if (unitInfo.side === 'enemy') {
 const cell = document.querySelector(
 `.b32-cell[data-row="${unitInfo.row}"][data-col="${unitInfo.col}"]`
 );
 const r = _validRect(cell);
 if (!r) return null;

 return {
 x: r.left + r.width * 0.5,
 y: r.top + r.height * 0.25,
 };
 }

 // ── 味方：HP増減は必ず下部パネル側に表示 ──

 // 1) 3人パーティカード（通常バトル）
 const card = document.querySelector(`.b32-party-card[data-uid="${unitInfo._uid}"]`);
 const cardRect = _validRect(card);
 if (cardRect) {
 return {
 x: cardRect.left + cardRect.width * 0.5,
 y: cardRect.top + cardRect.height * 0.22,
 };
 }

 // 1.5) ローグライト用ロスターカード
 // ローグライトでは #b32-party-status を描画せず、#b32-roster-panel 側がキャラパネルになるため、
 // deployedUid と一致するロスターカードを優先してダメージ/回復数値の表示先にする。
 const rosterCard = document.querySelector(`.b32-roster-card[data-deployed-uid="${unitInfo._uid}"]`);
 const rosterRect = _validRect(rosterCard);
 if (rosterRect) {
 return {
 x: rosterRect.left + rosterRect.width * 0.5,
 y: rosterRect.top + rosterRect.height * 0.18,
 };
 }

 // 2) スキル選択中キャラカード
 const actionCard = document.querySelector(`.b32-action-char-card[data-uid="${unitInfo._uid}"]`);
 const actionRect = _validRect(actionCard);
 if (actionRect) {
 return {
 x: actionRect.left + actionRect.width * 0.5,
 y: actionRect.top + actionRect.height * 0.22,
 };
 }

 // 3) 下部パーティエリア内のキャラ順で座標を作る
 // ※味方HP増減は盤面セルには出さない
 const bs = _bs();
 const partyStatus = document.getElementById('b32-party-status');
 const partyRect = _validRect(partyStatus);

 if (bs && partyRect && Array.isArray(bs.allies)) {
 const idx = bs.allies.findIndex(a => a._uid === unitInfo._uid);
 if (idx >= 0) {
 const count = Math.max(1, bs.allies.length);
 const cardW = partyRect.width / count;

 return {
 x: partyRect.left + cardW * (idx + 0.5),
 y: partyRect.top + partyRect.height * 0.25,
 };
 }
 }

 // 4) 最後のフォールバック：下部中央
 const root = document.getElementById('battle32-root');
 if (root) {
 const rr = root.getBoundingClientRect();
 return {
 x: rr.left + rr.width * 0.5,
 y: rr.bottom - rr.height * 0.18,
 };
 }

 return {
 x: window.innerWidth * 0.5,
 y: window.innerHeight * 0.82,
 };
}

 // フロートナンバーを表示
 // フロートナンバーを表示
function _showFloatNumber(unitInfo, amount, kind, isUlt, elementMatch, offset, isCritical) {
 const pos = _getUnitScreenPos(unitInfo);
 if (!pos) return;

 const ox = offset && Number.isFinite(Number(offset.x)) ? Number(offset.x) : 0;
 const oy = offset && Number.isFinite(Number(offset.y)) ? Number(offset.y) : 0;

 const el = document.createElement('div');
 const sign = kind === 'heal' ? '+' : '-';
 const isBoss = unitInfo.side === 'enemy' && amount > 500;
 const ultCls = isUlt ? ' ult' : '';
 const criticalCls = (kind === 'damage' && isCritical) ? ' critical' : '';

 // 属性相性クラス
 let elementCls = '';
 if (kind === 'damage') {
   if (elementMatch === '有利') elementCls = ' weak';
   if (elementMatch === '不利') elementCls = ' resist';
 }

 el.className = `b32-float-number ${kind}${isBoss ? ' boss' : ''}${ultCls}${elementCls}${criticalCls}`;
 el.textContent = `${sign}${amount}`;
 el.style.left = `${pos.x + ox}px`;
 el.style.top = `${pos.y + oy}px`;

 document.body.appendChild(el);

 setTimeout(() => {
   if (el.parentNode) el.parentNode.removeChild(el);
 }, 1000);
}

// 属性相性テキストを表示
function _showElementMatchText(unitInfo, elementMatch) {
 if (!elementMatch) return;

 const isWeak = elementMatch === '有利';
 const isResist = elementMatch === '不利';
 if (!isWeak && !isResist) return;

 const pos = _getUnitScreenPos(unitInfo);
 if (!pos) return;

 const el = document.createElement('div');
 el.className = `b32-element-match-text ${isWeak ? 'weak' : 'resist'}`;
 el.textContent = isWeak ? 'WEAK!' : 'RESIST';

 el.style.left = `${pos.x}px`;
 el.style.top = `${pos.y - 20}px`;

 document.body.appendChild(el);

 setTimeout(() => {
   if (el.parentNode) el.parentNode.removeChild(el);
 }, 760);
}

 function _showSkillNameBurst(skillName, charImg) {
 if (!skillName) return Promise.resolve();

 return new Promise(resolve => {
 const el = document.createElement('div');
 el.className = 'b32-skill-name-burst';

 const name = document.createElement('div');
 name.className = 'b32-skill-burst-name';
 name.textContent = skillName;

 if (charImg) {
 const img = new Image();
 img.className = 'b32-skill-burst-img';
 img.alt = '';
 img.decoding = 'async';

 img.onload = () => {
 el.appendChild(img);
 };

 img.onerror = () => {
 console.warn('[B32] skill cutin image load failed:', charImg);
 };

 img.src = charImg;
 }

 el.appendChild(name);
 document.body.appendChild(el);

 setTimeout(() => {
 if (el.parentNode) el.parentNode.removeChild(el);
 resolve();
 }, 1520);
 });
}


// ============================================================
// 攻撃アップ演出：味方と敵を大きく見せてからヒットさせる
// damage イベント後に表示するため、HP計算は Battle32 側で完了済み。
// ============================================================
let _b32AttackCinematicBusy = false;
let _b32AttackCinematicLastKey = '';
let _b32AttackCinematicLastAt = 0;

// 同一スキルで複数体へ同時ヒットした damage イベントを、
// アップ演出上は1つの「複数対象攻撃」として束ねる。
let _b32PendingAttackCinematic = null;
let _b32PendingAttackCinematicTimer = null;

// コンボ連鎖用：damageイベントから起動する攻撃アップ演出が
// 完全に終了するまで待つ。これにより次のCOMBO表示・攻撃演出と重ならない。
window.waitForBattle32AttackCinematicIdle = function (timeoutMs) {
  const timeout = Math.max(500, Number(timeoutMs || 6000));
  const startedAt = Date.now();

  return new Promise(resolve => {
    const poll = () => {
      const pending = !!_b32PendingAttackCinematic || !!_b32PendingAttackCinematicTimer;
      const overlay = !!document.getElementById('b32-attack-cinematic');
      const busy = !!_b32AttackCinematicBusy || pending || overlay;

      if (!busy || Date.now() - startedAt >= timeout) {
        resolve();
        return;
      }
      setTimeout(poll, 40);
    };

    // damageイベントの45ms集約タイマーが登録される猶予を確保する。
    setTimeout(poll, 60);
  });
};

function _injectAttackCinematicStyle() {
 if (document.getElementById('b32-attack-cinematic-style')) return;
 const s = document.createElement('style');
 s.id = 'b32-attack-cinematic-style';
 s.textContent = `
#b32-attack-cinematic {
  position: fixed;
  inset: 0;
  z-index: 999999;
  pointer-events: none;
  overflow: hidden;
  background:
    radial-gradient(circle at 62% 34%, rgba(255,255,255,.18), transparent 30%),
    radial-gradient(circle at 30% 62%, rgba(120,190,255,.10), transparent 34%),
    linear-gradient(180deg, rgba(8,6,18,.42), rgba(0,0,0,.74));
  backdrop-filter: blur(6px) saturate(1.10);
  -webkit-backdrop-filter: blur(6px) saturate(1.10);
  opacity: 0;
  animation: b32CineInOut 1120ms ease forwards;
}
#b32-attack-cinematic::before {
  content: '';
  position: absolute;
  left: -10%;
  right: -10%;
  top: 48%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,235,190,.92), rgba(255,255,255,.96), rgba(255,235,190,.92), transparent);
  box-shadow: 0 0 24px rgba(255,235,190,.72), 0 0 54px rgba(255,255,255,.38);
  transform: rotate(-18deg) scaleX(0);
  transform-origin: 36% 50%;
  animation: b32CineLine 1120ms ease forwards;
}
#b32-attack-cinematic::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: clamp(126px, 22vh, 210px);
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent);
  opacity: .65;
}
.b32-cine-unit {
  position: absolute;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  filter: drop-shadow(0 18px 26px rgba(0,0,0,.72));
}
.b32-cine-unit img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: auto;
  transform: none !important;
}
.b32-cine-ally {
  left: max(10px, 7vw);
  bottom: clamp(132px, 24vh, 220px);
  width: min(44vw, 270px);
  height: min(48vh, 390px);
  transform: translate(-28px, 18px) scale(.92);
  z-index: 2;
  animation: b32CineAlly 1120ms cubic-bezier(.2,.8,.2,1) forwards;
}
.b32-cine-enemy {
  right: max(10px, 8vw);
  top: clamp(50px, 10vh, 92px);
  width: min(42vw, 250px);
  height: min(44vh, 360px);
  transform: translate(28px, -14px) scale(.92);
  z-index: 1;
  animation: b32CineEnemy 1120ms cubic-bezier(.2,.8,.2,1) forwards;
}
.b32-cine-impact {
  position: absolute;
  left: 63%;
  top: 38%;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.95);
  box-shadow: 0 0 20px rgba(255,255,255,.95), 0 0 80px rgba(255,210,120,.72);
  transform: translate(-50%, -50%) scale(.1);
  opacity: 0;
  animation: b32CineImpact 1120ms ease forwards;
}
.b32-cine-damage {
  position: absolute;
  left: 63%;
  top: 31%;
  transform: translate(-50%, -50%) scale(.72);
  color: #fff2d2;
  font-family: "Cinzel", "Noto Serif JP", serif;
  font-weight: 900;
  font-size: clamp(30px, 10vw, 64px);
  letter-spacing: .04em;
  text-shadow:
    0 0 8px rgba(255,255,255,.95),
    0 0 24px rgba(255,210,110,.92),
    0 4px 16px rgba(0,0,0,1);
  opacity: 0;
  animation: b32CineDamage 1120ms ease forwards;
}
.b32-cine-damage.critical {
  color: #fff6b6;
  font-size: clamp(38px, 12vw, 76px);
  text-shadow:
    0 0 10px rgba(255,255,255,1),
    0 0 28px rgba(255,220,80,.98),
    0 0 58px rgba(255,116,38,.78),
    0 5px 18px rgba(0,0,0,1);
}
.b32-cine-critical-label {
  position: absolute;
  left: 63%;
  top: 20%;
  transform: translate(-50%, -50%) scale(.7);
  color: #fff0a8;
  font-family: "Cinzel", "Noto Serif JP", serif;
  font-weight: 900;
  font-size: clamp(18px, 5.8vw, 38px);
  letter-spacing: .15em;
  text-shadow:
    0 0 8px rgba(255,255,255,.95),
    0 0 24px rgba(255,220,80,.92),
    0 3px 12px rgba(0,0,0,1);
  opacity: 0;
  animation: b32CineCritical 1120ms ease forwards;
  pointer-events: none;
}
.b32-cine-rapid-hit.critical {
  color: #fff5af;
  font-size: clamp(21px, 6vw, 40px);
  text-shadow:
    0 0 8px rgba(255,255,255,.95),
    0 0 22px rgba(255,220,80,.92),
    0 3px 10px rgba(0,0,0,1);
}
.b32-cine-rapid-hit.critical::before {
  content: 'CRIT';
  position: absolute;
  left: 50%;
  top: -12px;
  transform: translateX(-50%);
  font-family: "Cinzel", "Noto Serif JP", serif;
  font-size: 9px;
  letter-spacing: .12em;
  color: #fff0a8;
}
@keyframes b32CineCritical {
  0%, 14% { opacity: 0; transform: translate(-50%, -50%) scale(.55); filter: blur(2px); }
  28% { opacity: 1; transform: translate(-50%, -50%) scale(1.14); filter: blur(0); }
  52% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -58%) scale(.94); }
}
.b32-cine-skill {
  position: absolute;
  left: 50%;
  bottom: clamp(96px, 18vh, 168px);
  transform: translateX(-50%);
  padding: 7px 14px;
  border: 1px solid rgba(232,200,122,.42);
  border-radius: 999px;
  background: rgba(9,7,18,.62);
  color: rgba(255,245,215,.92);
  font-family: "Noto Serif JP", serif;
  font-weight: 800;
  font-size: clamp(12px, 3.3vw, 16px);
  letter-spacing: .12em;
  white-space: nowrap;
  opacity: 0;
  animation: b32CineSkill 1120ms ease forwards;
}
@keyframes b32CineInOut {
  0% { opacity: 0; }
  10%, 82% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes b32CineLine {
  0%, 28% { transform: rotate(-18deg) scaleX(0); opacity: 0; }
  44% { transform: rotate(-18deg) scaleX(1); opacity: 1; }
  70%, 100% { transform: rotate(-18deg) scaleX(1.08); opacity: 0; }
}
@keyframes b32CineAlly {
  0% { opacity: 0; transform: translate(-42px, 28px) scale(.86); }
  16% { opacity: 1; transform: translate(0, 0) scale(.96); }
  38% { transform: translate(18px, -18px) scale(1.04); }
  50% { transform: translate(42px, -40px) scale(1.10); filter: drop-shadow(0 0 26px rgba(255,235,180,.72)); }
  78% { opacity: 1; transform: translate(28px, -26px) scale(1.03); }
  100% { opacity: 0; transform: translate(28px, -26px) scale(1); }
}
@keyframes b32CineEnemy {
  0% { opacity: 0; transform: translate(42px, -28px) scale(.86); }
  16% { opacity: 1; transform: translate(0, 0) scale(.96); }
  42% { transform: translate(-8px, 6px) scale(1.02); }
  50% { transform: translate(-26px, 18px) scale(1.05) rotate(-1.5deg); filter: drop-shadow(0 0 28px rgba(255,255,255,.66)); }
  78% { opacity: 1; transform: translate(-16px, 12px) scale(1.02); }
  100% { opacity: 0; transform: translate(-16px, 12px) scale(1); }
}
@keyframes b32CineImpact {
  0%, 40% { opacity: 0; transform: translate(-50%, -50%) scale(.1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(5.8); }
  72%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(9); }
}
@keyframes b32CineDamage {
  0%, 48% { opacity: 0; transform: translate(-50%, -50%) scale(.62); }
  56% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); }
  80% { opacity: 1; transform: translate(-50%, -64%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -86%) scale(.96); }
}
@keyframes b32CineSkill {
  0%, 8% { opacity: 0; transform: translate(-50%, 8px); }
  22%, 78% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, -8px); }
}

/* ── 複数対象攻撃：敵を複数並べ、各対象に着弾・ダメージを出す ── */
#b32-attack-cinematic.multi-target::before {
  height: 3px;
  transform-origin: 34% 50%;
  box-shadow:
    0 0 30px rgba(255,235,190,.88),
    0 0 84px rgba(255,255,255,.46);
}
#b32-attack-cinematic.multi-target .b32-cine-enemy.b32-cine-target {
  right: auto;
  top: auto;
  left: var(--cx);
  top: var(--cy);
  width: min(30vw, 176px);
  height: min(34vh, 286px);
  transform: translate(-50%, 0) scale(.86);
  z-index: calc(3 + var(--ti));
  animation: b32CineEnemyMulti 1120ms cubic-bezier(.2,.8,.2,1) forwards;
}
#b32-attack-cinematic.multi-target .b32-cine-enemy.b32-cine-target img {
  filter: drop-shadow(0 15px 22px rgba(0,0,0,.72));
}
#b32-attack-cinematic.multi-target .b32-cine-impact-multi {
  left: var(--mx);
  top: var(--my);
}
#b32-attack-cinematic.multi-target .b32-cine-damage-multi {
  left: var(--mx);
  top: calc(var(--my) - 7%);
  font-size: clamp(24px, 7.2vw, 48px);
}
#b32-attack-cinematic.multi-target .b32-cine-damage-multi.critical {
  font-size: clamp(30px, 8.4vw, 58px);
}
.b32-cine-mini-break {
  position: absolute;
  left: 50%;
  top: 92%;
  transform: translateX(-50%);
  display: block;
  color: #fff;
  font-family: "Cinzel", "Noto Serif JP", serif;
  font-size: clamp(11px, 3.2vw, 18px);
  font-weight: 900;
  letter-spacing: .13em;
  text-shadow:
    0 0 8px rgba(255,255,255,.96),
    0 0 22px rgba(255,70,90,.92),
    0 3px 10px rgba(0,0,0,1);
}
#b32-attack-cinematic.multi-target .b32-cine-critical-label {
  left: 50%;
  top: 15%;
}
@keyframes b32CineEnemyMulti {
  0% { opacity: 0; transform: translate(-38%, -16px) scale(.78); }
  16% { opacity: 1; transform: translate(-50%, 0) scale(.88); }
  42% { transform: translate(calc(-50% - 8px), 6px) scale(.94); }
  50% { transform: translate(calc(-50% - 22px), 18px) scale(.98) rotate(-1.5deg); filter: drop-shadow(0 0 26px rgba(255,255,255,.66)); }
  78% { opacity: 1; transform: translate(calc(-50% - 14px), 12px) scale(.94); }
  100% { opacity: 0; transform: translate(calc(-50% - 14px), 12px) scale(.92); }
}

/* ── 敵→味方 攻撃時：配置は同じ（敵★右上 / 味方☆左下）、動きと着弾位置だけ反転 ── */
#b32-attack-cinematic.enemy-attack::before {
  transform-origin: 64% 50%;
  animation-name: b32CineLineEnemy;
}
#b32-attack-cinematic.enemy-attack .b32-cine-enemy {
  z-index: 2;
  animation: b32CineEnemyAttack 1120ms cubic-bezier(.2,.8,.2,1) forwards;
}
#b32-attack-cinematic.enemy-attack .b32-cine-ally {
  z-index: 1;
  animation: b32CineAllyHit 1120ms cubic-bezier(.2,.8,.2,1) forwards;
}
#b32-attack-cinematic.enemy-attack .b32-cine-impact {
  left: 35%;
  top: 62%;
  box-shadow: 0 0 20px rgba(255,255,255,.95), 0 0 80px rgba(255,70,90,.62);
}
#b32-attack-cinematic.enemy-attack .b32-cine-damage {
  left: 35%;
  top: 53%;
  color: #ffd8d8;
  text-shadow:
    0 0 8px rgba(255,255,255,.95),
    0 0 24px rgba(255,80,95,.92),
    0 4px 16px rgba(0,0,0,1);
}
#b32-attack-cinematic.enemy-attack .b32-cine-skill {
  border-color: rgba(255,120,130,.38);
  color: rgba(255,225,225,.94);
}


/* ── 致死ダメージ時：BREAK → 対象がゆっくり消えるフィニッシュ演出 ── */
#b32-attack-cinematic.fatal-break {
  background:
    radial-gradient(circle at 50% 42%, rgba(255,255,255,.26), transparent 28%),
    radial-gradient(circle at 63% 34%, rgba(255,80,90,.18), transparent 32%),
    radial-gradient(circle at 30% 62%, rgba(120,190,255,.10), transparent 34%),
    linear-gradient(180deg, rgba(12,6,18,.54), rgba(0,0,0,.84));
  animation: b32CineFatalInOut 1880ms ease forwards;
}
#b32-attack-cinematic.fatal-break::before {
  height: 3px;
  box-shadow:
    0 0 34px rgba(255,255,255,.90),
    0 0 86px rgba(255,80,95,.70),
    0 0 120px rgba(255,225,170,.35);
  animation: b32CineFatalLine 1880ms ease forwards;
}
#b32-attack-cinematic.fatal-break .b32-cine-impact {
  box-shadow:
    0 0 26px rgba(255,255,255,.98),
    0 0 96px rgba(255,80,95,.82),
    0 0 150px rgba(255,220,140,.50);
  animation: b32CineFatalImpact 1880ms ease forwards;
}
#b32-attack-cinematic.fatal-break .b32-cine-damage {
  color: #fff7e8;
  text-shadow:
    0 0 10px rgba(255,255,255,1),
    0 0 30px rgba(255,90,100,.98),
    0 0 62px rgba(255,220,130,.72),
    0 4px 18px rgba(0,0,0,1);
  animation: b32CineFatalDamage 1880ms ease forwards;
}
.b32-cine-break-label {
  position: absolute;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%) scale(.72);
  color: rgba(255,255,255,.98);
  font-family: "Cinzel", "Noto Serif JP", serif;
  font-weight: 900;
  font-size: clamp(42px, 14vw, 92px);
  letter-spacing: .12em;
  text-shadow:
    0 0 10px rgba(255,255,255,.98),
    0 0 34px rgba(255,70,90,.98),
    0 0 76px rgba(255,220,130,.72),
    0 5px 18px rgba(0,0,0,1);
  opacity: 0;
  z-index: 8;
  animation: b32CineBreakLabel 1880ms ease forwards;
}
.b32-cine-break-sub {
  position: absolute;
  left: 50%;
  top: calc(42% + clamp(42px, 10vw, 72px));
  transform: translate(-50%, -50%);
  padding: 5px 12px;
  border: 1px solid rgba(255,210,210,.42);
  border-radius: 999px;
  background: rgba(20,4,10,.48);
  color: rgba(255,225,225,.92);
  font-family: "Noto Serif JP", serif;
  font-size: clamp(11px, 3.2vw, 15px);
  font-weight: 800;
  letter-spacing: .18em;
  opacity: 0;
  z-index: 8;
  animation: b32CineBreakSub 1880ms ease forwards;
}
.b32-cine-break-particle {
  position: absolute;
  left: var(--px, 60%);
  top: var(--py, 35%);
  width: var(--ps, 6px);
  height: var(--ps, 6px);
  border-radius: 999px;
  background: rgba(255,245,220,.96);
  box-shadow: 0 0 12px rgba(255,255,255,.95), 0 0 28px rgba(255,80,95,.72);
  opacity: 0;
  z-index: 7;
  animation: b32CineBreakParticle 1880ms ease-out forwards;
  animation-delay: var(--pd, 0ms);
}
#b32-attack-cinematic.target-enemy-broken .b32-cine-enemy img,
#b32-attack-cinematic.target-ally-broken .b32-cine-ally img {
  animation: b32CineTargetDissolve 1880ms ease forwards;
}
#b32-attack-cinematic.target-enemy-broken .b32-cine-enemy::after,
#b32-attack-cinematic.target-ally-broken .b32-cine-ally::after {
  content: '';
  position: absolute;
  inset: 8% 10%;
  background:
    linear-gradient(120deg, transparent 0 42%, rgba(255,255,255,.88) 49%, transparent 56% 100%),
    radial-gradient(circle at 50% 50%, rgba(255,90,100,.42), transparent 58%);
  mix-blend-mode: screen;
  opacity: 0;
  filter: blur(.4px);
  animation: b32CineTargetCrack 1880ms ease forwards;
}
#b32-attack-cinematic.rapid-multi.fatal-break {
  animation: b32CineFatalRapidInOut 3340ms ease forwards;
}
#b32-attack-cinematic.rapid-multi.fatal-break::before {
  animation: b32CineFatalRapidLine 3340ms ease forwards;
}
#b32-attack-cinematic.rapid-multi.fatal-break .b32-cine-break-label,
#b32-attack-cinematic.rapid-multi.fatal-break .b32-cine-break-sub {
  animation-duration: 3340ms;
}
#b32-attack-cinematic.rapid-multi.target-enemy-broken .b32-cine-enemy img,
#b32-attack-cinematic.rapid-multi.target-ally-broken .b32-cine-ally img,
#b32-attack-cinematic.rapid-multi.target-enemy-broken .b32-cine-enemy::after,
#b32-attack-cinematic.rapid-multi.target-ally-broken .b32-cine-ally::after {
  animation-duration: 3340ms;
}
@keyframes b32CineFatalInOut { 0% { opacity: 0; } 8%, 88% { opacity: 1; } 100% { opacity: 0; } }
@keyframes b32CineFatalLine {
  0%, 24% { transform: rotate(-18deg) scaleX(0); opacity: 0; }
  40% { transform: rotate(-18deg) scaleX(1.12); opacity: 1; }
  58% { transform: rotate(-18deg) scaleX(1.25); opacity: .55; }
  100% { transform: rotate(-18deg) scaleX(1.35); opacity: 0; }
}
@keyframes b32CineFatalImpact {
  0%, 36% { opacity: 0; transform: translate(-50%, -50%) scale(.1); }
  48% { opacity: 1; transform: translate(-50%, -50%) scale(7.2); }
  68%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(12); }
}
@keyframes b32CineFatalDamage {
  0%, 42% { opacity: 0; transform: translate(-50%, -50%) scale(.62); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.18); }
  64% { opacity: .78; transform: translate(-50%, -64%) scale(1.02); }
  86%, 100% { opacity: 0; transform: translate(-50%, -102%) scale(.86); }
}
@keyframes b32CineBreakLabel {
  0%, 48% { opacity: 0; transform: translate(-50%, -50%) scale(.62); letter-spacing: .24em; }
  56% { opacity: 1; transform: translate(-50%, -50%) scale(1.10); letter-spacing: .12em; }
  72% { opacity: .96; transform: translate(-50%, -50%) scale(1); }
  92%, 100% { opacity: 0; transform: translate(-50%, -54%) scale(1.08); }
}
@keyframes b32CineBreakSub {
  0%, 56% { opacity: 0; transform: translate(-50%, -44%) scale(.9); }
  66%, 84% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -68%) scale(.96); }
}
@keyframes b32CineBreakParticle {
  0%, 48% { opacity: 0; transform: translate(-50%, -50%) scale(.2); }
  56% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(calc(-50% + var(--tx, 0px)), calc(-50% + var(--ty, -80px))) scale(.15); }
}
@keyframes b32CineTargetDissolve {
  0%, 46% { opacity: 1; filter: brightness(1) saturate(1) drop-shadow(0 18px 26px rgba(0,0,0,.72)); transform: translateY(0) scale(1); }
  56% { opacity: 1; filter: brightness(2.2) saturate(0.8) drop-shadow(0 0 34px rgba(255,255,255,.92)); transform: translateY(-2px) scale(1.03); }
  76% { opacity: .58; filter: brightness(1.55) grayscale(.45) blur(.4px) drop-shadow(0 0 28px rgba(255,100,120,.72)); transform: translateY(-14px) scale(.98); }
  100% { opacity: 0; filter: brightness(2.4) grayscale(1) blur(3px) drop-shadow(0 0 42px rgba(255,255,255,.80)); transform: translateY(-44px) scale(.86); }
}
@keyframes b32CineTargetCrack {
  0%, 43% { opacity: 0; transform: scale(.86) rotate(-4deg); }
  54% { opacity: .95; transform: scale(1.04) rotate(-4deg); }
  76% { opacity: .36; transform: scale(1.10) rotate(-4deg); }
  100% { opacity: 0; transform: scale(1.20) rotate(-4deg); }
}
@keyframes b32CineFatalRapidInOut { 0% { opacity: 0; } 6%, 92% { opacity: 1; } 100% { opacity: 0; } }
@keyframes b32CineFatalRapidLine {
  0%, 8% { transform: rotate(-18deg) scaleX(0); opacity: 0; }
  16%, 58% { transform: rotate(-18deg) scaleX(1.04); opacity: .82; }
  72% { transform: rotate(-18deg) scaleX(1.24); opacity: .72; }
  100% { transform: rotate(-18deg) scaleX(1.36); opacity: 0; }
}

/* ── アルノなどの高速多段用：アップ中の敵画像上部に0.4秒ごとにばらけて着弾 ── */
#b32-attack-cinematic.rapid-multi {
  animation: b32CineInOutRapid 2600ms ease forwards;
}
#b32-attack-cinematic.rapid-multi::before {
  animation: b32CineRapidLine 2600ms ease forwards;
}
#b32-attack-cinematic.rapid-multi .b32-cine-ally {
  animation: b32CineAllyRapid 2600ms cubic-bezier(.2,.8,.2,1) forwards;
}
#b32-attack-cinematic.rapid-multi .b32-cine-enemy {
  animation: b32CineEnemyRapid 2600ms cubic-bezier(.2,.8,.2,1) forwards;
}
#b32-attack-cinematic.rapid-multi .b32-cine-skill {
  animation: b32CineSkillRapid 2600ms ease forwards;
}
.b32-cine-rapid-hit {
  position: absolute;
  left: var(--rx, 64%);
  top: var(--ry, 26%);
  transform: translate(-50%, -50%) scale(.62);
  color: #fff2d2;
  font-family: "Cinzel", "Noto Serif JP", serif;
  font-weight: 900;
  font-size: clamp(20px, 6.6vw, 42px);
  letter-spacing: .04em;
  text-shadow:
    0 0 7px rgba(255,255,255,.96),
    0 0 20px rgba(255,220,120,.92),
    0 4px 14px rgba(0,0,0,1);
  opacity: 0;
  z-index: 5;
  animation: b32CineRapidDamage 620ms ease forwards;
  animation-delay: var(--delay, 0ms);
}
.b32-cine-rapid-flash {
  position: absolute;
  left: var(--rx, 64%);
  top: var(--ry, 26%);
  width: clamp(46px, 13vw, 84px);
  height: clamp(14px, 4vw, 22px);
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.98), rgba(255,222,140,.92), transparent);
  box-shadow:
    0 0 18px rgba(255,255,255,.96),
    0 0 42px rgba(255,210,120,.78);
  opacity: 0;
  z-index: 4;
  transform: translate(-50%, -50%) rotate(var(--rot, -18deg)) scaleX(.12);
  animation: b32CineRapidFlash 340ms ease-out forwards;
  animation-delay: var(--delay, 0ms);
}
.b32-cine-rapid-burst {
  position: absolute;
  left: var(--rx, 64%);
  top: var(--ry, 26%);
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.92);
  box-shadow: 0 0 16px rgba(255,255,255,.92), 0 0 42px rgba(255,210,100,.70);
  opacity: 0;
  z-index: 3;
  transform: translate(-50%, -50%) scale(.1);
  animation: b32CineRapidBurst 380ms ease-out forwards;
  animation-delay: var(--delay, 0ms);
}
@keyframes b32CineInOutRapid {
  0% { opacity: 0; }
  7%, 88% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes b32CineRapidLine {
  0%, 10% { transform: rotate(-18deg) scaleX(0); opacity: 0; }
  18%, 76% { transform: rotate(-18deg) scaleX(1.04); opacity: .82; }
  100% { transform: rotate(-18deg) scaleX(1.10); opacity: 0; }
}
@keyframes b32CineAllyRapid {
  0% { opacity: 0; transform: translate(-42px, 28px) scale(.86); }
  10% { opacity: 1; transform: translate(0, 0) scale(.96); }
  22% { transform: translate(36px, -36px) scale(1.08); filter: drop-shadow(0 0 24px rgba(255,235,180,.72)); }
  32% { transform: translate(22px, -24px) scale(1.03); }
  42% { transform: translate(42px, -42px) scale(1.09); }
  52% { transform: translate(24px, -26px) scale(1.04); }
  62% { transform: translate(44px, -42px) scale(1.10); }
  76% { opacity: 1; transform: translate(30px, -28px) scale(1.03); }
  100% { opacity: 0; transform: translate(30px, -28px) scale(1); }
}
@keyframes b32CineEnemyRapid {
  0% { opacity: 0; transform: translate(42px, -28px) scale(.86); }
  10% { opacity: 1; transform: translate(0, 0) scale(.96); }
  20% { transform: translate(-8px, 4px) scale(1.01) rotate(-.6deg); }
  30% { transform: translate(6px, -3px) scale(1.00) rotate(.5deg); }
  40% { transform: translate(-10px, 5px) scale(1.02) rotate(-.8deg); }
  50% { transform: translate(7px, -4px) scale(1.00) rotate(.6deg); }
  60% { transform: translate(-12px, 6px) scale(1.03) rotate(-1deg); filter: drop-shadow(0 0 28px rgba(255,255,255,.66)); }
  80% { opacity: 1; transform: translate(-8px, 4px) scale(1.01); }
  100% { opacity: 0; transform: translate(-8px, 4px) scale(1); }
}
@keyframes b32CineRapidDamage {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.55); }
  18% { opacity: 1; transform: translate(-50%, -50%) scale(1.18); }
  58% { opacity: 1; transform: translate(-50%, -74%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -105%) scale(.94); }
}
@keyframes b32CineRapidFlash {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--rot, -18deg)) scaleX(.10); }
  35% { opacity: 1; transform: translate(-50%, -50%) rotate(var(--rot, -18deg)) scaleX(1.12); }
  100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--rot, -18deg)) scaleX(1.50); }
}
@keyframes b32CineRapidBurst {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.1); }
  36% { opacity: .95; transform: translate(-50%, -50%) scale(3.8); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(6.4); }
}
@keyframes b32CineSkillRapid {
  0%, 5% { opacity: 0; transform: translate(-50%, 8px); }
  14%, 82% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, -8px); }
}
@keyframes b32CineLineEnemy {
  0%, 28% { transform: rotate(-18deg) scaleX(0); opacity: 0; }
  44% { transform: rotate(-18deg) scaleX(1); opacity: 1; }
  70%, 100% { transform: rotate(-18deg) scaleX(1.08); opacity: 0; }
}
@keyframes b32CineEnemyAttack {
  0% { opacity: 0; transform: translate(42px, -28px) scale(.86); }
  16% { opacity: 1; transform: translate(0, 0) scale(.96); }
  38% { transform: translate(-10px, 10px) scale(1.03); }
  50% { transform: translate(-42px, 40px) scale(1.10); filter: drop-shadow(0 0 28px rgba(255,130,130,.70)); }
  78% { opacity: 1; transform: translate(-30px, 26px) scale(1.03); }
  100% { opacity: 0; transform: translate(-30px, 26px) scale(1); }
}
@keyframes b32CineAllyHit {
  0% { opacity: 0; transform: translate(-42px, 28px) scale(.86); }
  16% { opacity: 1; transform: translate(0, 0) scale(.96); }
  42% { transform: translate(4px, -4px) scale(1.00); }
  50% { transform: translate(-18px, 14px) scale(1.04) rotate(1.2deg); filter: drop-shadow(0 0 28px rgba(255,210,210,.62)); }
  78% { opacity: 1; transform: translate(-10px, 8px) scale(1.01); }
  100% { opacity: 0; transform: translate(-10px, 8px) scale(1); }
}
@media (max-width: 420px) {
  .b32-cine-ally {
    left: max(6px, 6vw);
    bottom: clamp(122px, 23vh, 190px);
    width: 46vw;
    height: 45vh;
  }
  .b32-cine-enemy {
    right: max(6px, 6vw);
    top: clamp(44px, 9vh, 78px);
    width: 44vw;
    height: 40vh;
  }
  .b32-cine-impact { left: 64%; top: 36%; }
  .b32-cine-damage { left: 64%; top: 29%; }
  .b32-cine-skill {
    bottom: clamp(88px, 17vh, 148px);
    max-width: 86vw;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
 `;
 document.head.appendChild(s);
}

function _findCinematicUnit(bs, info) {
 if (!bs || !info) return null;
 const list = info.side === 'ally' ? (bs.allies || []) : (bs.enemies || []);
 return list.find(u => u._uid === info._uid) || null;
}

function _getCinematicImg(unit) {
 if (!unit) return '';
 // 攻撃アップ演出では通常UI用の upImg を使わない。
 // 専用画像がなければ、盤面用画像へ安全にフォールバックする。
 return unit.battleUpImg || unit.battleImg || unit.img || unit.panelImg || unit.portrait || unit.cutin || '';
}

function _showAttackCinematic(data) {
 if (!data || !data.source || !data.target) return;
 if (!data.amount || data.amount <= 0) return;

 const isAllyAttack = data.source.side === 'ally' && data.target.side === 'enemy';
 const isEnemyAttack = data.source.side === 'enemy' && data.target.side === 'ally';
 if (!isAllyAttack && !isEnemyAttack) return;

 const targetEvents = Array.isArray(data.targetEvents) && data.targetEvents.length
   ? data.targetEvents.filter(ev => ev && ev.target && Number(ev.amount || 0) > 0)
   : [data];
 if (!targetEvents.length) return;

 const isMultiTarget = isAllyAttack && targetEvents.length > 1;

 const now = Date.now();
 const key = `${data.source._uid || ''}:${isMultiTarget ? 'multi' : data.target._uid || ''}:${data.skillId || 'attack'}`;
 if (_b32AttackCinematicBusy) return;
 if (_b32AttackCinematicLastKey === key && now - _b32AttackCinematicLastAt < 900) return;

 const bs = data.bs || _bs();
 const sourceUnit = _findCinematicUnit(bs, data.source);
 const sourceImg = _getCinematicImg(sourceUnit);
 const targetUnits = targetEvents
   .map(ev => _findCinematicUnit(bs, ev.target))
   .filter(Boolean);
 const targetImgs = targetUnits
   .map(u => _getCinematicImg(u))
   .filter(Boolean);
 if (!sourceImg || !targetImgs.length) return;

 // 表示位置は固定：味方☆は左下、敵★は右上。
 // 攻撃方向は ov の enemy-attack クラスで切り替える。
 const allyImg = isAllyAttack ? sourceImg : targetImgs[0];
 const enemyImg = isAllyAttack ? targetImgs[0] : sourceImg;

 _b32AttackCinematicBusy = true;
 _b32AttackCinematicLastKey = key;
 _b32AttackCinematicLastAt = now;
 _injectAttackCinematicStyle();

 const isRapidMulti = data.hitStyle === 'rapid_multi';
 const isCritical = !!(data.isCritical || data.criticalCount > 0 || targetEvents.some(ev => ev.isCritical || ev.criticalCount > 0));
 const criticalHits = Array.isArray(data.criticalHits) ? data.criticalHits : [];
 const isFatal = !!(
   data.isFatal ||
   data.target?.isFatal ||
   targetEvents.some(ev => ev.isFatal || ev.target?.isFatal ||
     (Number(ev.hpBefore || ev.target?.hpBefore || 0) > 0 && Number(ev.hpAfter ?? ev.target?.hpAfter ?? 1) <= 0)) ||
   (Number(data.hpBefore || data.target?.hpBefore || 0) > 0 && Number(data.hpAfter ?? data.target?.hpAfter ?? 1) <= 0)
 );
 const rapidCount = Math.min(8, Math.max(4, Math.floor(Number(data.hitCount || 5))));
 const rapidParts = isRapidMulti
   ? (criticalHits.length ? criticalHits.map(h => Math.max(0, Math.floor(Number(h.amount || 0)))) : _splitDamageAmount(data.amount, rapidCount))
   : [];
 const rapidPos = [
   { x: 62, y: 24, rot: -23 },
   { x: 70, y: 18, rot:  18 },
   { x: 66, y: 31, rot: -12 },
   { x: 58, y: 20, rot:  24 },
   { x: 72, y: 28, rot: -30 },
   { x: 61, y: 15, rot:  12 },
   { x: 68, y: 23, rot: -18 },
   { x: 74, y: 17, rot:  22 },
 ];
 const rapidHtml = isRapidMulti ? rapidParts.map((amount, i) => {
   const p = rapidPos[i % rapidPos.length];
   const delay = 300 + i * 400; // 0.4秒ごとに順番表示
   const style = `--rx:${p.x}%;--ry:${p.y}%;--delay:${delay}ms;--rot:${p.rot}deg;`;
   const isHitCritical = !!(criticalHits[i] && criticalHits[i].isCritical);
   return `
     <div class="b32-cine-rapid-flash" style="${style}"></div>
     <div class="b32-cine-rapid-burst" style="${style}"></div>
     <div class="b32-cine-rapid-hit${isHitCritical ? ' critical' : ''}" style="${style}">-${amount}</div>
   `;
 }).join('') : '';

 const multiSlots = [
   { cx: 61, cy: 8,  mx: 61, my: 36 },
   { cx: 78, cy: 17, mx: 78, my: 45 },
   { cx: 52, cy: 24, mx: 52, my: 52 },
   { cx: 86, cy: 5,  mx: 86, my: 33 },
   { cx: 68, cy: 31, mx: 68, my: 59 },
 ];
 const targetHtml = isMultiTarget
   ? targetImgs.slice(0, 5).map((img, i) => {
       const slot = multiSlots[i % multiSlots.length];
       const style = `--ti:${i};--cx:${slot.cx}%;--cy:${slot.cy}%;`;
       return `<div class="b32-cine-unit b32-cine-enemy b32-cine-target b32-cine-target-${i}" style="${style}"><img src="${img}" alt="" onerror="this.style.display='none'"></div>`;
     }).join('')
   : `<div class="b32-cine-unit b32-cine-enemy"><img src="${enemyImg}" alt="" onerror="this.style.display='none'"></div>`;

 const multiDamageHtml = isMultiTarget && !isRapidMulti
   ? targetEvents.slice(0, 5).map((ev, i) => {
       const slot = multiSlots[i % multiSlots.length];
       const amount = Math.max(0, Math.floor(Number(ev.amount || 0)));
       const evCritical = !!(ev.isCritical || ev.criticalCount > 0);
       const evFatal = !!(ev.isFatal || ev.target?.isFatal ||
         (Number(ev.hpBefore || ev.target?.hpBefore || 0) > 0 && Number(ev.hpAfter ?? ev.target?.hpAfter ?? 1) <= 0));
       const style = `--mx:${slot.mx}%;--my:${slot.my}%;`;
       return `
         <div class="b32-cine-impact b32-cine-impact-multi" style="${style}"></div>
         <div class="b32-cine-damage b32-cine-damage-multi${evCritical ? ' critical' : ''}" style="${style}">-${amount}${evFatal ? '<span class="b32-cine-mini-break">BREAK</span>' : ''}</div>
       `;
     }).join('')
   : '';

 const breakParticleHtml = isFatal ? Array.from({ length: 14 }, (_, i) => {
   const baseX = isEnemyAttack ? 36 : (isMultiTarget ? 68 : 64);
   const baseY = isEnemyAttack ? 58 : (isMultiTarget ? 44 : 34);
   const dxList = [-72, 58, -42, 84, -18, 30, -92, 70, -58, 48, -24, 94, -80, 20];
   const dyList = [-96, -72, -122, -48, -142, -92, -38, -118, -76, -154, -110, -62, -132, -44];
   const pxList = [-8, 6, -3, 9, 2, -6, 10, -10, 4, -4, 8, -9, 1, 5];
   const pyList = [-5, 2, -8, 6, 0, -4, 5, -2, 7, -7, 3, -1, -6, 4];
   const px = baseX + pxList[i];
   const py = baseY + pyList[i];
   const size = 4 + (i % 4) * 2;
   const delay = (isRapidMulti ? 2060 : 820) + (i % 5) * 34;
   return `<span class="b32-cine-break-particle" style="--px:${px}%;--py:${py}%;--tx:${dxList[i]}px;--ty:${dyList[i]}px;--ps:${size}px;--pd:${delay}ms;"></span>`;
 }).join('') : '';
 const breakHtml = isFatal ? `
   <div class="b32-cine-break-label">BREAK</div>
   <div class="b32-cine-break-sub">${isEnemyAttack ? 'ALLY LOST' : (isMultiTarget ? 'ENEMIES VANISHED' : 'ENEMY VANISHED')}</div>
   ${breakParticleHtml}
 ` : '';

 const ov = document.createElement('div');
 ov.id = 'b32-attack-cinematic';
 if (isEnemyAttack) ov.classList.add('enemy-attack');
 if (isMultiTarget) ov.classList.add('multi-target');
 if (isRapidMulti) ov.classList.add('rapid-multi');
 if (isCritical) ov.classList.add('critical');
 if (isFatal) {
   ov.classList.add('fatal-break');
   ov.classList.add(isEnemyAttack ? 'target-ally-broken' : 'target-enemy-broken');
 }
 ov.innerHTML = `
   <div class="b32-cine-unit b32-cine-ally"><img src="${allyImg}" alt="" onerror="this.style.display='none'"></div>
   ${targetHtml}
   ${isRapidMulti ? rapidHtml : (isMultiTarget ? multiDamageHtml : `<div class="b32-cine-impact"></div><div class="b32-cine-damage${isCritical ? ' critical' : ''}">-${data.amount}</div>`)}
   ${isCritical ? '<div class="b32-cine-critical-label">CRITICAL</div>' : ''}
   ${breakHtml}
   <div class="b32-cine-skill">${data.skillName || (isEnemyAttack ? 'ENEMY ATTACK' : 'ATTACK')}</div>
 `;
 document.body.appendChild(ov);

 setTimeout(() => {
   if (ov.parentNode) ov.parentNode.removeChild(ov);
   _b32AttackCinematicBusy = false;
 }, isRapidMulti ? (isFatal ? 3420 : 2680) : (isFatal ? 1940 : 1180));
}

function _showUltCutin(skillName, cutinImg) {
 if (!skillName) skillName = 'ULT';

 return new Promise(resolve => {
 const wrap = document.createElement('div');
 wrap.className = 'b32-ult-cutin';

 const imgHtml = cutinImg
 ? `<img class="b32-ult-cutin-img" src="${cutinImg}" alt="" onerror="this.style.display='none'">`
 : '';

 wrap.innerHTML = `
 ${imgHtml}
 <div class="b32-ult-cutin-shade"></div>
 <div class="b32-ult-cutin-line"></div>
 <div class="b32-ult-cutin-label">ULTIMATE</div>
 <div class="b32-ult-cutin-name">${skillName}</div>
 `;

 const flash = document.createElement('div');
 flash.className = 'b32-ult-white-flash';

 document.body.appendChild(wrap);
 document.body.appendChild(flash);

 setTimeout(() => {
 if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
 if (flash.parentNode) flash.parentNode.removeChild(flash);
 resolve();
 }, 1920);
 });
}

function _showScreenShake(variant) {
 const root = document.getElementById('battle32-root');
 if (!root) return;

 // variant: 'ult' | 'heavy' | '' (normal)
 const cls = variant === 'ult' ? 'b32-screen-shake-ult'
 : variant === 'heavy' ? 'b32-screen-shake-heavy'
 : 'b32-screen-shake';
 const dur = variant === 'ult' ? 400 : variant === 'heavy' ? 360 : 280;

 root.classList.remove('b32-screen-shake', 'b32-screen-shake-ult', 'b32-screen-shake-heavy');
 void root.offsetWidth;
 root.classList.add(cls);

 setTimeout(() => {
 root.classList.remove(cls);
 }, dur);
}

function _getCoreScreenPos(core) {
 if (!core) return null;

 const cell = document.querySelector(
 `.b32-cell[data-row="${core.row}"][data-col="${core.col}"]`
 );
 const r = _validRect(cell);
 if (!r) {
 return {
 x: window.innerWidth * 0.5,
 y: window.innerHeight * 0.62,
 };
 }

 return {
 x: r.left + r.width * 0.5,
 y: r.top + r.height * 0.45,
 };
}

function _showCoreDamageEvent(data) {
 const core = data && data.core ? data.core : null;
 const pos = _getCoreScreenPos(core);

 const root = document.getElementById('battle32-root');
 if (root) {
 root.classList.remove('b32-screen-shake-core');
 void root.offsetWidth;
 root.classList.add('b32-screen-shake-core');
 setTimeout(() => root.classList.remove('b32-screen-shake-core'), 760);
 }

 const flash = document.createElement('div');
 flash.className = 'b32-core-damage-flash';
 document.body.appendChild(flash);
 setTimeout(() => {
 if (flash.parentNode) flash.parentNode.removeChild(flash);
 }, 780);

 const ring = document.createElement('div');
 ring.className = 'b32-core-distort-ring';
 ring.style.left = `${pos.x}px`;
 ring.style.top = `${pos.y}px`;
 document.body.appendChild(ring);
 setTimeout(() => {
 if (ring.parentNode) ring.parentNode.removeChild(ring);
 }, 820);

 const text = document.createElement('div');
 text.className = 'b32-core-damage-text';
 text.textContent = core && core.stability <= 0
 ? 'SPATIAL LINK LOST'
 : 'LINK DESTABILIZED';
 text.style.left = `${pos.x}px`;
 text.style.top = `${pos.y - 24}px`;
 document.body.appendChild(text);
 setTimeout(() => {
 if (text.parentNode) text.parentNode.removeChild(text);
 }, 900);

 const coreEl = document.querySelector('.b32-core-object');
 if (coreEl) {
 coreEl.classList.remove('core-hit');
 void coreEl.offsetWidth;
 coreEl.classList.add('core-hit');
 setTimeout(() => coreEl.classList.remove('core-hit'), 740);
 }
}

function _wait(ms) {
 return new Promise(resolve => setTimeout(resolve, ms));
}

 // 対象DOMを取得する
function _getTargetElement(unitInfo) {
 if (!unitInfo) return null;

 if (unitInfo.side === 'enemy') {
 const cell = document.querySelector(
 `.b32-cell[data-row="${unitInfo.row}"][data-col="${unitInfo.col}"]`
 );
 return _validRect(cell) ? cell : null;
 }

 // 味方：下部カード → アクションカード
 // ※味方HP増減の演出は盤面セルに出さない
 const card = document.querySelector(`.b32-party-card[data-uid="${unitInfo._uid}"]`);
 if (_validRect(card)) return card;

 const rosterCard = document.querySelector(`.b32-roster-card[data-deployed-uid="${unitInfo._uid}"]`);
 if (_validRect(rosterCard)) return rosterCard;

 const actionCard = document.querySelector(`.b32-action-char-card[data-uid="${unitInfo._uid}"]`);
 if (_validRect(actionCard)) return actionCard;

 return null;
}

// 衝撃波リング
function _showImpactRing(unitInfo, kind, variant) {
 const pos = _getUnitScreenPos(unitInfo);
 if (!pos) return;

 const el = document.createElement('div');
 el.className = `b32-impact-ring ${kind}`;

 // ULT/heavy は CSS animation を上書きして大きく拡張する
 if (variant === 'ult' || variant === 'heavy') {
 const scale = variant === 'ult' ? 1.55 : 1.32;
 el.style.setProperty('--ring-scale', scale);
 // アニメEnd幅を直接Styleで制御する代わりに、transformで拡大する
 el.style.transform = `translate(-50%, -50%) scale(${scale})`;
 el.style.transformOrigin = 'center center';
 // アニメ自体が translate(-50%,-50%) を使うため、wrapperでscaleを当てる
 const wrap = document.createElement('div');
 wrap.style.cssText = `position:fixed;left:${pos.x}px;top:${pos.y}px;pointer-events:none;z-index:999997;`;
 const inner = document.createElement('div');
 inner.className = `b32-impact-ring ${kind}`;
 inner.style.cssText = `left:0;top:0;transform:translate(-50%,-50%) scale(${scale});transform-origin:center center;`;
 wrap.appendChild(inner);
 document.body.appendChild(wrap);
 setTimeout(() => { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, kind === 'heal' ? 560 : 460);
 return;
 }

 el.style.left = `${pos.x}px`;
 el.style.top = `${pos.y}px`;
 document.body.appendChild(el);

 setTimeout(() => {
 if (el.parentNode) el.parentNode.removeChild(el);
 }, kind === 'heal' ? 560 : 460);
}

// 斜めヒットスラッシュ
function _showHitSlash(unitInfo, variant, isMulti, offset) {
 const pos = _getUnitScreenPos(unitInfo);
 if (!pos) return;

 const baseOx = offset && Number.isFinite(Number(offset.x)) ? Number(offset.x) : 0;
 const baseOy = offset && Number.isFinite(Number(offset.y)) ? Number(offset.y) : 0;

 // slashCount: multi は2本、他は1本
 const count = isMulti ? 2 : 1;

 for (let i = 0; i < count; i++) {
 const el = document.createElement('div');
 // variant クラスを追加
 const variantCls = variant ? ` ${variant}` : '';
 const multiCls = isMulti ? ' multi' : '';
 el.className = `b32-hit-slash${variantCls}${multiCls}`;

 // 複数本の場合はわずかにズラす
 const ox = i * 12 - (count - 1) * 6;
 const oy = i * 8 - (count - 1) * 4;
 el.style.left = `${pos.x + baseOx + ox}px`;
 el.style.top = `${pos.y + baseOy + oy}px`;

 // 2本目は少し遅延
 const delay = i * 80;
 if (delay > 0) el.style.animationDelay = `${delay}ms`;

 document.body.appendChild(el);
 setTimeout(() => {
 if (el.parentNode) el.parentNode.removeChild(el);
 }, 300 + delay);
 }
}

// 対象を小さく揺らす
function _showImpactShake(unitInfo) {
 const el = _getTargetElement(unitInfo);
 if (!el) return;

 el.classList.remove('b32-impact-shake');
 void el.offsetWidth; // animation再発火
 el.classList.add('b32-impact-shake');

 setTimeout(() => {
 el.classList.remove('b32-impact-shake');
 }, 280);
}

 // ヒットフラッシュ（対象セル or カードを一瞬光らせる）
 function _showHitFlash(unitInfo, kind) {
 let el = null;
 if (unitInfo.side === 'enemy') {
 el = document.querySelector(
 `.b32-cell[data-row="${unitInfo.row}"][data-col="${unitInfo.col}"]`
 );
 } else {
 // パーティカード → アクションカード の順で有効なものを探す
 const card = document.querySelector(`.b32-party-card[data-uid="${unitInfo._uid}"]`);
 if (_validRect(card)) {
 el = card;
 } else {
 const rosterCard = document.querySelector(`.b32-roster-card[data-deployed-uid="${unitInfo._uid}"]`);
 if (_validRect(rosterCard)) {
 el = rosterCard;
 } else {
 const ac = document.querySelector(`.b32-action-char-card[data-uid="${unitInfo._uid}"]`);
 if (_validRect(ac)) el = ac;
 }
 }
 }
 if (!el) return;
 const cls = kind === 'heal' ? 'b32-hit-flash-heal' : 'b32-hit-flash-damage';
 el.classList.add(cls);
 setTimeout(() => el.classList.remove(cls), 380);
 }

 // damage / heal イベントハンドラ（Battle32 callbacks から呼ばれる）
 function _splitDamageAmount(total, count) {
   const safeTotal = Math.max(0, Math.floor(Number(total || 0)));
   const safeCount = Math.max(1, Math.floor(Number(count || 1)));
   const base = Math.floor(safeTotal / safeCount);
   const rest = safeTotal % safeCount;
   return Array.from({ length: safeCount }, (_, i) => base + (i < rest ? 1 : 0));
 }

 function _getRapidMultiHitOffset(index, count) {
   // 敵セルの上部に、同じ場所へ重ならないよう散らす。
   // 5hit: 左上 → 右上 → 中央上 → 右中上 → 左中上 の順で「パンパンパン」と出る。
   const presets = [
     { x: -26, y: -20 },
     { x:  22, y: -34 },
     { x:  -6, y: -50 },
     { x:  30, y: -18 },
     { x: -18, y: -38 },
     { x:  10, y: -62 },
     { x: -34, y: -30 },
     { x:  36, y: -44 },
   ];
   if (count <= presets.length) return presets[index % presets.length];
   const angle = -Math.PI + (Math.PI * 0.9 * index / Math.max(1, count - 1));
   return {
     x: Math.round(Math.cos(angle) * 34),
     y: Math.round(-38 + Math.sin(angle) * 18),
   };
 }

 function _getAttackCinematicGroupKey(data) {
   if (!data || !data.source || !data.target) return '';
   const isAllyAttack = data.source.side === 'ally' && data.target.side === 'enemy';
   // 今回束ねたいのは「味方1体 → 敵複数体」の同時攻撃。
   // 敵攻撃や回復、特殊イベントは従来通り1体ずつ扱う。
   if (!isAllyAttack) return '';
   return [
     data.source._uid || '',
     data.skillId || data.skillName || 'attack',
     data.isUltimate ? 'ult' : 'skill',
     data.hitStyle || 'normal',
   ].join(':');
 }

 function _queueAttackCinematic(data) {
   const key = _getAttackCinematicGroupKey(data);
   if (!key) {
     _showAttackCinematic(data);
     return;
   }

   if (!_b32PendingAttackCinematic || _b32PendingAttackCinematic.key !== key) {
     if (_b32PendingAttackCinematicTimer) {
       clearTimeout(_b32PendingAttackCinematicTimer);
       _b32PendingAttackCinematicTimer = null;
     }
     _b32PendingAttackCinematic = { key, items: [] };
   }

   _b32PendingAttackCinematic.items.push(data);

   // applyDamage が targets.forEach 内で連続発火するため、短い猶予で同時ヒット分をまとめる。
   if (_b32PendingAttackCinematicTimer) clearTimeout(_b32PendingAttackCinematicTimer);
   _b32PendingAttackCinematicTimer = setTimeout(() => {
     const pending = _b32PendingAttackCinematic;
     _b32PendingAttackCinematic = null;
     _b32PendingAttackCinematicTimer = null;
     if (!pending || !pending.items.length) return;

     if (pending.items.length === 1) {
       _showAttackCinematic(pending.items[0]);
       return;
     }

     const first = pending.items[0];
     const totalAmount = pending.items.reduce((sum, ev) => sum + Math.max(0, Number(ev.amount || 0)), 0);
     _showAttackCinematic({
       ...first,
       amount: Math.floor(totalAmount),
       targetEvents: pending.items,
       multiTargetCount: pending.items.length,
       isCritical: pending.items.some(ev => ev.isCritical || ev.criticalCount > 0),
       isFatal: pending.items.some(ev => ev.isFatal || ev.target?.isFatal ||
         (Number(ev.hpBefore || ev.target?.hpBefore || 0) > 0 && Number(ev.hpAfter ?? ev.target?.hpAfter ?? 1) <= 0)),
     });
   }, 45);
 }


function _showStatusChangeFx(data) {
 if (!data || !data.target) return;
 const pos = _getUnitScreenPos(data.target);
 if (!pos) return;
 const tone = data.tone || 'status';
 const label = data.label || (data.effect && data.effect.type) || 'STATUS';

 const el = document.createElement('div');
 el.className = `b32-status-change-pop ${tone}`;
 el.textContent = label;
 el.style.left = `${pos.x}px`;
 el.style.top = `${pos.y - 18}px`;
 document.body.appendChild(el);

 const ring = document.createElement('div');
 ring.className = `b32-status-change-ring ${tone}`;
 ring.style.left = `${pos.x}px`;
 ring.style.top = `${pos.y}px`;
 document.body.appendChild(ring);

 setTimeout(() => {
   if (el.parentNode) el.parentNode.removeChild(el);
   if (ring.parentNode) ring.parentNode.removeChild(ring);
 }, 1150);
}

function _onStatusChangeEvent(data) {
 _showStatusChangeFx(data);
}

 function _onDamageEvent(data) {
 if (!data || !data.target) return;

 const isUlt = !!data.isUltimate;
 const hitStyle = data.hitStyle || 'normal';
 const isMulti = hitStyle === 'multi';
 const isHeavy = hitStyle === 'heavy';
 const isRapid = hitStyle === 'rapid';
 const isRapidMulti = hitStyle === 'rapid_multi';

 // 味方→敵 / 敵→味方のダメージ時に、俯瞰グリッドから一瞬アップ演出へ切り替える。
 // 味方1体が複数敵へ同時ヒットした場合は、短時間バッファして複数対象アップ演出に束ねる。
 // rapid_multi はアップ演出側で敵画像上部に5連撃を出すため、グリッド側の数値・フラッシュは出さない。
 try {
   _queueAttackCinematic(data);
 } catch (e) {
   // 攻撃アップ演出が壊れても、通常の盤面ヒット演出とHP更新表示は止めない。
   console.error('[Battle32UI] attack cinematic failed', e, data);
 }
 if (isRapidMulti) return;

 // shakeVariant: ULT > heavy > normal
 const shakeVariant = isUlt ? 'ult' : isHeavy ? 'heavy' : '';

 // slashVariant: ULT スラッシュクラス (ult/heavy/rapid/'' のどれか)
 const slashVariant = isUlt ? 'ult' : isHeavy ? 'heavy' : (isRapid || isRapidMulti) ? 'rapid' : '';

 // ringVariant: ULT/heavy で大きく
 const ringVariant = isUlt ? 'ult' : isHeavy ? 'heavy' : '';

 if (isRapidMulti) {
   const hitCount = Math.min(8, Math.max(4, Math.floor(Number(data.hitCount || 5))));
   const parts = _splitDamageAmount(data.amount, hitCount);

   parts.forEach((amount, i) => {
     const hitDelay = 90 + i * 200; // 0.2秒ごとに順番に発生
     const offset = _getRapidMultiHitOffset(i, hitCount);

     setTimeout(() => {
       if (i === 0) _showScreenShake(shakeVariant);
       _showHitSlash(data.target, slashVariant, false, offset);
       _showImpactShake(data.target);
       _showHitFlash(data.target, 'damage');
       if (i === 0 || i === Math.floor(hitCount / 2)) {
         _showImpactRing(data.target, 'damage', ringVariant);
       }
     }, hitDelay);

     setTimeout(() => {
       _showFloatNumber(data.target, amount, 'damage', false, data.elementMatch, offset, !!(data.criticalHits && data.criticalHits[i] && data.criticalHits[i].isCritical));
       if (i === hitCount - 1) _showElementMatchText(data.target, data.elementMatch);
     }, hitDelay + 45);
   });

   return;
 }

 // スキル名表示の直後に「当たった感」が来るよう、少し溜める
 setTimeout(() => {
 _showScreenShake(shakeVariant);
 _showImpactRing(data.target, 'damage', ringVariant);
 _showHitSlash(data.target, slashVariant, isMulti);
 _showImpactShake(data.target);
 _showHitFlash(data.target, 'damage');
 }, 120);

 // 数値は衝撃より少し後に出す
 setTimeout(() => {
 _showFloatNumber(data.target, data.amount, 'damage', isUlt, data.elementMatch, null, !!data.isCritical);
 _showElementMatchText(data.target, data.elementMatch);
}, 240);
 }

function _onHealEvent(data) {
 if (!data || !data.target) return;

 const isUlt = !!data.isUltimate;

 setTimeout(() => {
 _showImpactRing(data.target, 'heal', isUlt ? 'ult' : '');
 _showHitFlash(data.target, 'heal');
 }, 120);

 setTimeout(() => {
 _showFloatNumber(data.target, data.amount, 'heal', isUlt);
 }, 240);
}

 // 公開：hookBattle32Start から呼べるように
 window._b32OnDamage = _onDamageEvent;
 window._b32OnHeal = _onHealEvent;
 window._b32OnStatusChange = _onStatusChangeEvent;
 window._b32OnCoreDamage = _showCoreDamageEvent;

 window._b32EndSkill = function () {
 if (_b32InputLocked) return;
 _resetSkillState();
 if (window.Battle32) window.Battle32.endSkillPhase();
 renderBattle32UI();
 };
 window._b32CancelSel = function () {
 if (_b32InputLocked) return;
 _resetSkillState();
 renderBattle32UI();
 };

 // 戻るボタン：選択解除のみ。行動権は消費しない。
 window._b32OnBackButtonTap = function () {
 if (_b32InputLocked) return;
 _resetSkillState();
 renderBattle32UI();
 };

 // ============================================================
 // スマホ向け：盤面全体でタップを拾うフォールバック
 // ------------------------------------------------------------
 // iPhone SE / iPhone14 では 3D傾斜により、奥側グリッドの
 // DOMヒット判定がシビアになる。さらに、上段セルは pointerup の
 // target が #b32-board にならないケースがあるため、document capture で
 // 画面座標から最寄りの .movable セルを解決する。
 // 通常のセル onclick は残すため、既存操作は壊さない。
 // ============================================================
 function installBattle32BoardPointerFallback() {
   const board = document.getElementById('b32-board');
   if (!board) return;

   // 旧版は board にだけ listener を付けていたため、SE上段で event が
   // board まで来ないケースを拾えなかった。document に1回だけ付ける。
   if (document.documentElement.dataset.b32MovePointerFallbackInstalled === '1') return;
   document.documentElement.dataset.b32MovePointerFallbackInstalled = '1';

   document.addEventListener('pointerup', function (e) {
     if (_b32InputLocked) return;

     const root = document.getElementById(ROOT_ID);
     const currentBoard = document.getElementById('b32-board');
     if (!root || !currentBoard) return;

     const isTouchAssistDevice =
       root.classList.contains('b32-vp-se') ||
       root.classList.contains('b32-vp-iphone14') ||
       (root.clientWidth <= 430 && root.clientHeight <= 940);

     // PC/大型画面では余計な横取りをしない。
     // iPhone SE / iPhone14 系だけ、奥側グリッドの取りこぼしを補助する。
     if (!isTouchAssistDevice) return;

     const cellSize = parseFloat(getComputedStyle(root).getPropertyValue('--cell-size')) || 42;

     // ------------------------------------------------------------
     // 敵情報タップ fallback
     // ------------------------------------------------------------
     // ローグライトの敵は盤面上段に出ることが多く、rotateX + スマホ実機の
     // ヒット判定で inline onclick が発火しないケースがある。
     // 既に .enemy-inspectable セルを直接踏めている場合は通常 onclick に任せ、
     // 取りこぼした時だけ座標から最寄りの敵セルを解決する。
     const directEnemyCell = e.target && e.target.closest
       ? e.target.closest('.b32-cell.enemy-inspectable')
       : null;

     if (!directEnemyCell) {
       const enemyCells = Array.from(currentBoard.querySelectorAll('.b32-cell.enemy-inspectable'));
       if (enemyCells.length) {
         const rects = enemyCells
           .map(cell => cell.getBoundingClientRect())
           .filter(rect => rect.width > 0 && rect.height > 0);

         if (rects.length) {
           const hitBounds = rects.reduce((acc, rect) => ({
             left: Math.min(acc.left, rect.left),
             right: Math.max(acc.right, rect.right),
             top: Math.min(acc.top, rect.top),
             bottom: Math.max(acc.bottom, rect.bottom),
           }), { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });

           const margin = Math.max(28, cellSize * 0.70);
           const insideEnemyArea = !(
             e.clientX < hitBounds.left - margin ||
             e.clientX > hitBounds.right + margin ||
             e.clientY < hitBounds.top - margin ||
             e.clientY > hitBounds.bottom + margin
           );

           if (insideEnemyArea) {
             let bestEnemy = null;
             let bestEnemyDist = Infinity;

             enemyCells.forEach(cell => {
               const rect = cell.getBoundingClientRect();
               const cx = rect.left + rect.width / 2;
               const cy = rect.top + rect.height / 2;
               const d = Math.hypot(e.clientX - cx, e.clientY - cy);
               if (d < bestEnemyDist) {
                 bestEnemyDist = d;
                 bestEnemy = cell;
               }
             });

             const enemyThreshold = Math.max(36, cellSize * 1.05);
             if (bestEnemy && bestEnemyDist <= enemyThreshold) {
               const onclick = bestEnemy.getAttribute('onclick') || '';
               const m = onclick.match(/_b32ShowEnemyInfo\('([^']+)'\)/);
               if (m && m[1] && typeof window._b32ShowEnemyInfo === 'function') {
                 e.preventDefault();
                 e.stopPropagation();
                 window._b32ShowEnemyInfo(m[1]);
                 return;
               }
             }
           }
         }
       }
     }

     // ------------------------------------------------------------
     // 移動先タップ fallback（既存）
     // ------------------------------------------------------------
     if (!_moveMode || !_selMoveAllyUid) return;

     const movable = Array.from(currentBoard.querySelectorAll('.b32-cell.movable'));
     if (!movable.length) return;

      // 盤面から大きく外れたタップは無視して、下部UIの誤爆を防ぐ。
      // transform済みの boardRect はSE上段で小さく潰れるため、各movableセルの
      // 外接範囲から判定する。
      const rects = movable
        .map(cell => cell.getBoundingClientRect())
        .filter(rect => rect.width > 0 && rect.height > 0);

      if (!rects.length) return;

      const hitBounds = rects.reduce((acc, rect) => ({
        left: Math.min(acc.left, rect.left),
        right: Math.max(acc.right, rect.right),
        top: Math.min(acc.top, rect.top),
        bottom: Math.max(acc.bottom, rect.bottom),
      }), { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });

      const margin = 64;
      if (
        e.clientX < hitBounds.left - margin ||
        e.clientX > hitBounds.right + margin ||
        e.clientY < hitBounds.top - margin ||
        e.clientY > hitBounds.bottom + margin
      ) {
        return;
      }

     let best = null;
     let bestDist = Infinity;

     movable.forEach(cell => {
       const rect = cell.getBoundingClientRect();
       const cx = rect.left + rect.width / 2;
       const cy = rect.top + rect.height / 2;
       const d = Math.hypot(e.clientX - cx, e.clientY - cy);

       if (d < bestDist) {
         bestDist = d;
         best = cell;
       }
     });

     // 上段は rotateX の影響で見た目の高さが圧縮されるため広めに拾う。
     const threshold = Math.max(48, cellSize * 1.35);

     if (best && bestDist <= threshold) {
       const r = Number(best.dataset.row);
       const c = Number(best.dataset.col);
       if (Number.isFinite(r) && Number.isFinite(c)) {
         e.preventDefault();
         e.stopPropagation();
         window._b32OnMoveCellTap(r, c);
       }
     }
   }, true);
 }

 // ============================================================
 // ボード描画
 // ============================================================
 function renderBoard(bs) {
 const board = document.getElementById('b32-board');
 if (!board) return;

 // ユニットマップ
 // HP0の味方・雑魚はマス占有から除外。ボスはHP0後も核露出状態で残す。
 const unitMap = {};
 [
 ...bs.allies.filter(u => u.hp > 0),
 ...bs.enemies.filter(u => u.hp > 0 || u.isBoss),
 ...(bs.summons || []).filter(u => u && u.hp > 0),
 ].forEach(u => { unitMap[`${u.row}-${u.col}`] = u; });

 // ── スキルフェーズ用ハイライト ──
 let skillSelectableUids = new Set();
 let skillRangeCells = new Map(); // key:'row-col', value:cellType
 let comboRangeCells = new Map(); // key:'row-col', selected ally combo trigger range
 let comboSkillRangeCells = new Map(); // key:'row-col', selected ally combo skill effect range
 let movableCells = new Set(); // 通常移動マス
 let captureCells = new Set(); // 駒取りマス

 if (bs.phase === 'skill') {
 // ── LINK + キャラ別行動履歴で行動可否を判定 ──
 const canAct = !bs.result && bs.phase === 'skill';
 // 現仕様：1キャラ最大2行動。移動1回 + スキル/ULT1回まで。
 const canMoveUnit  = (uid) => canAct && _unitCanMoveNow(bs, uid) && _canActByLink(bs, 1);
 const canSkillUnit = (uid) => canAct && _unitCanUseSkillActionNow(bs, uid);

 if (_moveMode && _selMoveAllyUid) {
 // ── 移動先マス選択中 ──
 if (canMoveUnit(_selMoveAllyUid) && window.Battle32 && window.Battle32.getMoveCells) {
 const cells = window.Battle32.getMoveCells(_selMoveAllyUid);
 cells.forEach(c => {
 const k = `${c.row}-${c.col}`;
 if (c.cellType === 'capture') captureCells.add(k);
 else movableCells.add(k);
 });
 } else if (canMoveUnit(_selMoveAllyUid) && window.Battle32 && window.Battle32.getMovableCells) {
 const cells = window.Battle32.getMovableCells(_selMoveAllyUid, 3);
 movableCells = new Set(cells.map(c => `${c.row}-${c.col}`));
 }

 } else if (_selSkillAllyUid) {
 // ── スキルキャラ選択済み ──
 // 行動上限到達後でも、スキル確認用に射程だけは表示する。
 if (_selSkillId) {
 skillRangeCells = _skillRangeCells(_selSkillAllyUid, _selSkillId);
 }

 } else {
 // ── キャラ選択待ち ──
 // 盤面上の味方を選択中は、そのキャラのコンボ発動レンジを常時表示する。
 if (_selActionAllyUid && !_b32InputLocked) {
   const selectedComboAlly = (bs.allies || []).find(u =>
     u._uid === _selActionAllyUid && u.hp > 0 && u.combo && u.combo.skill
   );
   if (selectedComboAlly) {
     comboRangeCells = b32ComboRangeCells(selectedComboAlly);
     comboSkillRangeCells = b32ComboSkillRangeCells(selectedComboAlly, bs);
   }
 }

 // move または skill のどちらかが可能な生存味方をタップ可能にする
 if (canAct) {
 bs.allies.filter(u => u.hp > 0)
 .filter(u => canMoveUnit(u._uid) || canSkillUnit(u._uid))
 .forEach(u => skillSelectableUids.add(u._uid));
 }
 }
 }

 // ── 危険エリア（ボス攻撃予告） ──
 // スキルフェーズ中かつボスが生存のときだけ表示
 let bossDangerCells = new Map(); // key:'row-col', value: 'boss_line' | 'boss_warn' | 'boss_normal'
 if (
 bs.phase === 'skill' &&
 window.Battle32 &&
 window.Battle32.getBossDangerCells
 ) {
 const dangerList = window.Battle32.getBossDangerCells();
 dangerList.forEach(cell => {
 const k = `${cell.row}-${cell.col}`;
 // 同一セルに複数種が重なる場合は優先度の高い方を維持
 // boss_line > boss_warn > boss_normal
 const existing = bossDangerCells.get(k);
 if (!existing ||
 (cell.type === 'boss_line') ||
 (cell.type === 'boss_warn' && existing === 'boss_normal')) {
 bossDangerCells.set(k, cell.type || 'boss_normal');
 }
 });
 }

 // ── 敵タップ時の情報ガイド ──
let enemyMoveGuideCells = new Set();
let enemyAttackGuideCells = new Map(); // key:'row-col', value:'attack' | 'target_ally'
let selectedEnemy = null;

if (_selectedEnemyUid) {
 selectedEnemy = (bs.enemies || []).find(e =>
 e._uid === _selectedEnemyUid &&
 (e.hp > 0 || e.isBoss)
 );

 if (selectedEnemy) {
   if (_selectedEnemyGuideMode === 'move') {
     getEnemyMoveGuideCells(selectedEnemy, bs).forEach(c => {
       enemyMoveGuideCells.add(`${c.row}-${c.col}`);
     });
   } else if (_selectedEnemyGuideMode === 'attack') {
     getEnemyAttackGuideCells(selectedEnemy, bs).forEach(c => {
       enemyAttackGuideCells.set(`${c.row}-${c.col}`, c.cellType || 'attack');
     });
   }
 } else {
   _selectedEnemyUid = null;
   _selectedEnemyGuideMode = null;
 }
}

 // ── ローグライト: 召喚マス ──
 const summonCells = _summonMode ? _getSummonCells() : new Set();

 // ── ローグライト: アイテム対象（転位符の移動先マス）──
 // _itemPhase === 'cell' のとき: 盤面の空きマスをクリック可能にする
 let itemCellTargets = new Set();
 const activeItem = (_itemMode && bs.items && _itemSlotIndex != null) ? bs.items[_itemSlotIndex] : null;
 if (_itemMode && activeItem && activeItem.type === 'move_ally' && _itemPhase === 'cell' && _itemTargetUid) {
   for (let r = 0; r < 8; r++) {
     for (let c = 0; c < 5; c++) {
       const key = `${r}-${c}`;
       const occupied = unitMap[key];
       const allyCore = bs.cores && bs.cores.ally;
       if (allyCore && r === allyCore.row && c === allyCore.col) continue;
       if (!occupied) itemCellTargets.add(key);
     }
   }
 }

 const cells = [];
 for (let r = 0; r < 8; r++) {
 for (let c = 0; c < 5; c++) {
 const key = `${r}-${c}`;
 const unit = unitMap[key] || null;

 const zoneClass = r <= 2 ? 'enemy-zone' : r >= 5 ? 'ally-zone' : '';
 const isDivider = r === 4;

 const isSkillSelectable = unit && unit.side === 'ally' && skillSelectableUids.has(unit._uid);
 // 行動済みでも情報確認のため、通常待機中は生存味方をタップ可能にする
 const isAllyInspectable = !!(
   unit &&
   unit.side === 'ally' &&
   unit.hp > 0 &&
   bs.phase === 'skill' &&
   !bs.result &&
   !_moveMode &&
   !_selSkillAllyUid &&
   !_selSkillId &&
   !_summonMode &&
   !_itemMode
 );

 // 各種選択中でも敵はタップ可能にする。
 // 目的：敵の移動可能マス・簡易情報を見ながら、召喚位置/移動先/スキル使用判断ができるようにする。
 // 対象：通常待機中、移動先選択中、召喚マス選択中、スキル/ULT確認・実行画面。
 // ※ アイテム使用中は対象選択と競合しやすいため既存操作を優先する。
 const isEnemyInspectable = !!(
   unit &&
   unit.side === 'enemy' &&
   (unit.hp > 0 || unit.isBoss) &&
   bs.phase === 'skill' &&
   !bs.result &&
   !_itemMode
 );
 // 移動対象または スキル対象として選択中のキャラを盤面ハイライト
 const isSkillSelected = unit && bs.phase === 'skill' && (
 unit._uid === _selActionAllyUid ||
 unit._uid === _selSkillAllyUid ||
 (unit._uid === _selMoveAllyUid && _moveMode)
 );
 // skillRangeCells は Map<"row-col", cellType>
 const skillCellType = skillRangeCells.get ? skillRangeCells.get(key) : null;
 const isComboRange = comboRangeCells.has(key);
 const comboSkillCellType = comboSkillRangeCells.get
   ? comboSkillRangeCells.get(key)
   : null;
 const isMovable = movableCells.has(key);
 const isCapture = captureCells.has(key);
 // 危険エリア種別（'boss_line' | 'boss_warn' | 'boss_normal' | undefined）
 const bossDangerType = bossDangerCells.get(key);
 const isEnemyMoveGuide = enemyMoveGuideCells.has(key);
 const enemyAttackCellType = enemyAttackGuideCells.get ? enemyAttackGuideCells.get(key) : null;
 const isEnemyAttackGuide = enemyAttackCellType === 'attack';
 const isEnemyAttackTarget = enemyAttackCellType === 'target_ally';
 // ローグライト: 召喚マス
 const isSummonCell = summonCells.has(key);
 // ローグライト: アイテム対象（転位符移動先）
 const isItemCell = itemCellTargets.has(key);
 // ローグライト: アイテム対象ユニット
 const isItemAllyTarget = !!(
   _itemMode && activeItem && _itemPhase === 'target' &&
   unit && unit.side === 'ally' && unit.hp > 0 &&
   b32IsAllyTargetItem(activeItem)
 );
 const isItemEnemyTarget = !!(
   _itemMode && activeItem && _itemPhase === 'target' &&
   unit && unit.side === 'enemy' && unit.hp > 0 &&
   ['stun_enemy', 'swap_enemy'].includes(activeItem.type)
 );

 let cls = `b32-cell ${zoneClass}`;
 if (isDivider) cls += ' row-divider';
 // 危険エリアは最初に付与（後続のスキル範囲クラスに上書きされる）
 if (bossDangerType === 'boss_line') cls += ' boss-danger-line';
 else if (bossDangerType === 'boss_warn') cls += ' boss-danger-warn';
 else if (bossDangerType === 'boss_normal') cls += ' boss-danger-normal';

 if (isEnemyMoveGuide) cls += ' enemy-move-guide';
 if (isEnemyAttackGuide) cls += ' enemy-attack-guide';
 if (isEnemyAttackTarget) cls += ' enemy-attack-target';
 if (isSkillSelectable) cls += ' skill-selectable';
 if (isAllyInspectable) cls += ' ally-inspectable';
 if (isEnemyInspectable) cls += ' enemy-inspectable';
 if (isSkillSelected) cls += ' skill-selected';
 if (isMovable) cls += ' movable';
 if (isCapture) cls += ' move-capture';
 // 範囲ハイライト: ユニットがいるセルも含めて cellType で色分け
 if (skillCellType === 'target_enemy') cls += ' skill-target-enemy';
 else if (skillCellType === 'target_ally') cls += ' skill-target-ally';
 else if (skillCellType === 'range') cls += ' skill-range';
 if (isComboRange) cls += ' combo-range';
 if (comboSkillCellType) cls += ' combo-skill-range';
 // 召喚マス
 if (isSummonCell) cls += ' summon-cell';
 // アイテム移動先マス
 if (isItemCell) cls += ' item-cell-target';
 // アイテム対象味方/敵
 if (isItemAllyTarget) cls += ' skill-target-ally';
 if (isItemEnemyTarget) cls += ' skill-target-enemy';

 // クリックハンドラ
let onclick = '';

if (_summonMode && isSummonCell && !unit) {
 onclick = `onclick="_b32OnSummonCellTap(${r},${c})"`;

} else if (_itemMode && isItemAllyTarget && _itemPhase === 'target') {
 onclick = `onclick="_b32OnItemAllyTap('${unit._uid}')"`;

} else if (_itemMode && isItemEnemyTarget && _itemPhase === 'target') {
 onclick = `onclick="_b32OnItemEnemyTap('${unit._uid}')"`;

} else if (_itemMode && isItemCell && _itemPhase === 'cell') {
 onclick = `onclick="_b32OnItemCellTap(${r},${c})"`;

} else if (isMovable && !unit) {
 onclick = `onclick="_b32OnMoveCellTap(${r},${c})"`;

} else if (isEnemyInspectable) {
 // 選択中モードでも敵情報・敵移動ガイドを表示する
 onclick = `onclick="_b32ShowEnemyInfo('${unit._uid}')"`;

} else if (isCapture) {
 onclick = `onclick="_b32OnMoveCellTap(${r},${c})"`;

} else if (isAllyInspectable || isSkillSelectable || isSkillSelected) {
 onclick = `onclick="_b32OnSkillAllyTap('${unit._uid}')"`;
}
  // 敵情報ガイド専用オーバーレイ
  // cell の background だけだと、白背景・3D変形・ゾーン背景の上で薄く見えるため、
  // スキルレンジと同じく専用spanを置いて視認性を担保する。
  let enemyGuideOverlay = '';
  if (isEnemyMoveGuide) {
    enemyGuideOverlay = '<span class="b32-enemy-guide-overlay move"></span>';
  } else if (isEnemyAttackTarget) {
    enemyGuideOverlay = '<span class="b32-enemy-guide-overlay target_ally"></span>';
  } else if (isEnemyAttackGuide) {
    enemyGuideOverlay = '<span class="b32-enemy-guide-overlay attack"></span>';
  }

  // スキルレンジオーバーレイ（背景CSSが !important 上書きされても視認できる専用span）
  const skillOverlay = skillCellType
    ? `<span class="b32-skill-range-overlay ${skillCellType}"></span>`
    : '';
  // コンボレンジはセル背景ではなく専用オーバーレイで描画する。
  // 盤面の3D変形・ゾーン背景・!important指定の影響を受けない。
  const comboOverlay = isComboRange
    ? `<span class="b32-combo-range-overlay" aria-hidden="true"></span>`
    : '';

  // コンボスキルそのものの射程。紫の発動レンジとは別色（金）で表示する。
  const comboSkillOverlay = comboSkillCellType
    ? `<span class="b32-combo-skill-range-overlay ${comboSkillCellType}" aria-hidden="true"></span>`
    : '';

  // 召喚マスオーバーレイ
  const summonOverlay = isSummonCell && !unit
    ? `<span style="position:absolute;top:2px;left:50%;transform:translateX(-50%);font-family:'Cinzel',serif;font-size:7px;letter-spacing:1px;color:rgba(120,180,255,.9);text-shadow:0 0 6px rgba(80,160,255,.8);pointer-events:none;">SUMMON</span>`
    : '';

  // iOS実機向け：3D rotateXを使わずに奥行きを出すため、
  // 行ごとに横幅と中央寄せ量を持たせる。
  // CSS側でスマホ時のみ参照するため、通常表示/ロジックには影響しない。
  const rootForCell = document.getElementById(ROOT_ID);
  const cellPx = rootForCell
    ? (parseFloat(getComputedStyle(rootForCell).getPropertyValue('--cell-size')) || 40)
    : 40;
  const rowScale = Math.max(0.76, Math.min(1.00, 0.78 + r * 0.034));
  const rowInvScale = 1 / rowScale;
  const cellShift = (2 - c) * (1 - rowScale) * cellPx * 0.72;
  const depthStyle = `style="--b32-row-scale:${rowScale.toFixed(3)};--b32-row-inv-scale:${rowInvScale.toFixed(3)};--b32-cell-shift:${cellShift.toFixed(2)}px;"`;

  cells.push(
    `<div class="${cls}" data-row="${r}" data-col="${c}" ${depthStyle} ${onclick}>` +
    enemyGuideOverlay +
    skillOverlay +
    comboOverlay +
    comboSkillOverlay +
    summonOverlay +
    (unit ? renderUnit(unit, bs.phase) : renderCore(r, c, bs)) +
    `</div>`
  );
 }
 }

 board.innerHTML = cells.join('');
 installBattle32BoardPointerFallback();

 renderEnemyQuickInfo(selectedEnemy);
 
 }

 function _getViewportBoundsForEnemyInfo() {
   const vv = window.visualViewport || null;
   const width = vv ? vv.width : (window.innerWidth || document.documentElement.clientWidth || 0);
   const height = vv ? vv.height : (window.innerHeight || document.documentElement.clientHeight || 0);
   const offsetLeft = vv ? vv.offsetLeft : 0;
   const offsetTop = vv ? vv.offsetTop : 0;
   return { width, height, offsetLeft, offsetTop };
 }

 function _clampEnemyQuickInfoPosWithSize(pos, size) {
   const p = pos || { x: 0, y: 0 };
   const b = _getViewportBoundsForEnemyInfo();
   const w = Math.max(80, Number(size && size.width) || 300);
   const h = Math.max(40, Number(size && size.height) || 120);
   const margin = 8;

   const minX = b.offsetLeft + margin;
   const maxX = b.offsetLeft + Math.max(margin, b.width - w - margin);
   const minY = b.offsetTop + margin;
   const maxY = b.offsetTop + Math.max(margin, b.height - h - margin);

   return {
     x: Math.min(Math.max(Number(p.x || 0), minX), maxX),
     y: Math.min(Math.max(Number(p.y || 0), minY), maxY),
   };
 }

 function _clampEnemyQuickInfoPos(pos, box) {
   const rect = box ? box.getBoundingClientRect() : { width: 300, height: 120 };
   return _clampEnemyQuickInfoPosWithSize(pos, rect);
 }

 function _setEnemyQuickInfoLeftTop(box, pos) {
   if (!box || !pos) return;
   box.style.left = `${pos.x}px`;
   box.style.top = `${pos.y}px`;
   box.style.right = 'auto';
   box.style.bottom = 'auto';
   box.style.transform = 'none';
 }

 function _applyEnemyQuickInfoPos(box, pos) {
   if (!box || !pos) return;
   const p = _clampEnemyQuickInfoPos(pos, box);
   _enemyQuickInfoPos = p;
   _setEnemyQuickInfoLeftTop(box, p);
 }

 function _ensureEnemyQuickInfoDragStyle() {
   if (document.getElementById('b32-enemy-quick-drag-style')) return;
   const style = document.createElement('style');
   style.id = 'b32-enemy-quick-drag-style';
   style.textContent = `
.b32-enemy-quick-info {
  user-select: none;
  -webkit-user-select: none;
}
.b32-enemy-quick-drag-handle {
  cursor: grab;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  padding: 2px 18px 2px 18px;
  margin: -2px -4px 4px;
  position: relative;
}
.b32-enemy-quick-drag-handle:active,
.b32-enemy-quick-info.is-dragging .b32-enemy-quick-drag-handle {
  cursor: grabbing;
}
.b32-enemy-quick-drag-mark {
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0;
  opacity: .42;
  pointer-events: none;
}
.b32-enemy-quick-info.is-dragging {
  transition: none !important;
  opacity: .96;
}
`;
   document.head.appendChild(style);
 }

 function _installEnemyQuickInfoDrag(box) {
   if (!box || box.dataset.dragReady === '1') return;
   _ensureEnemyQuickInfoDragStyle();

   const handle = box.querySelector('.b32-enemy-quick-drag-handle') || box;
   box.dataset.dragReady = '1';

   handle.addEventListener('pointerdown', (e) => {
     if (e.button != null && e.button !== 0) return;

     e.preventDefault();
     e.stopPropagation();

     // 追従遅れ対策：
     // ドラッグ開始時にだけサイズ・境界を確定し、移動中は getBoundingClientRect() を呼ばない。
     // 座標は安定版と同じ left/top のみ。transform は使わない。
     const rect = box.getBoundingClientRect();
     const start = {
       pointerId: e.pointerId,
       sx: e.clientX,
       sy: e.clientY,
       x: rect.left,
       y: rect.top,
       size: {
         width: rect.width || box.offsetWidth || 300,
         height: rect.height || box.offsetHeight || 120,
       },
       moved: false,
     };

     _enemyQuickInfoDragging = true;
     box.classList.add('is-dragging');
     box.style.transition = 'none';
     box.style.willChange = 'left, top';
     box.style.transform = 'none';

     try {
       handle.setPointerCapture(e.pointerId);
     } catch (err) {}

     function onMove(ev) {
       if (ev.pointerId !== start.pointerId) return;
       ev.preventDefault();
       ev.stopPropagation();

       const dx = ev.clientX - start.sx;
       const dy = ev.clientY - start.sy;
       if (Math.abs(dx) + Math.abs(dy) > 3) start.moved = true;

       const p = _clampEnemyQuickInfoPosWithSize({
         x: start.x + dx,
         y: start.y + dy,
       }, start.size);

       _enemyQuickInfoPos = p;
       _setEnemyQuickInfoLeftTop(box, p);
     }

     function onEnd(ev) {
       if (ev.pointerId !== start.pointerId) return;
       ev.preventDefault();
       ev.stopPropagation();

       handle.removeEventListener('pointermove', onMove);
       handle.removeEventListener('pointerup', onEnd);
       handle.removeEventListener('pointercancel', onEnd);

       try {
         handle.releasePointerCapture(start.pointerId);
       } catch (err) {}

       box.classList.remove('is-dragging');
       box.style.willChange = '';
       box.style.transition = '';

       setTimeout(() => { _enemyQuickInfoDragging = false; }, 0);
     }

     handle.addEventListener('pointermove', onMove, { passive: false });
     handle.addEventListener('pointerup', onEnd, { passive: false });
     handle.addEventListener('pointercancel', onEnd, { passive: false });
   }, { passive: false });
 }

 function _positionEnemyQuickInfoPanel(box) {
 if (!box) return;

 // ドラッグ済みの場合は、保存位置を最優先する。
 if (_enemyQuickInfoPos) {
   _applyEnemyQuickInfoPos(box, _enemyQuickInfoPos);
   return;
 }

 // 敵情報パネルはグリッド上段を隠さないよう、味方カードの直上へ逃がす。
 // 中央寄せの translateX(-50%) はドラッグ量と競合して左へ吸われるため使わない。
 // 初期位置も left/top のpxで確定し、以後のドラッグも同じ座標系で扱う。
 const roster = document.getElementById('b32-roster-panel');
 const root = document.getElementById(ROOT_ID);
 let bottomPx = null;

 if (roster && getComputedStyle(roster).display !== 'none') {
   const rr = roster.getBoundingClientRect();
   if (rr.height > 0 && rr.top > 0) {
     bottomPx = Math.max(8, window.innerHeight - rr.top + 8);
   }
 }

 if (bottomPx == null) {
   const actions = document.getElementById('b32-actions');
   if (actions && getComputedStyle(actions).display !== 'none') {
     const ar = actions.getBoundingClientRect();
     if (ar.height > 0 && ar.top > 0) {
       bottomPx = Math.max(8, window.innerHeight - ar.top + 96);
     }
   }
 }

 if (bottomPx == null && root) {
   bottomPx = root.classList.contains('b32-vp-se')
     ? 162
     : 186;
 }

 const view = _getViewportBoundsForEnemyInfo();
 const rect = box.getBoundingClientRect();
 const w = Math.max(80, rect.width || 300);
 const h = Math.max(40, rect.height || 120);
 const targetX = view.offsetLeft + Math.max(8, (view.width - w) / 2);
 const targetY = bottomPx != null
   ? view.offsetTop + view.height - bottomPx - h
   : view.offsetTop + 24;

 _applyEnemyQuickInfoPos(box, { x: targetX, y: targetY });
}

function renderEnemyQuickInfo(enemy) {
 let box = document.getElementById('b32-enemy-quick-info');
 if (box) box.remove();

 if (!enemy) return;

 const moveActive = _selectedEnemyGuideMode === 'move';
 const attackActive = _selectedEnemyGuideMode === 'attack';
 const guideMode = moveActive || attackActive;
 const modeText = moveActive ? '移動範囲表示中' : attackActive ? '攻撃範囲表示中' : '';

 box = document.createElement('div');
 box.id = 'b32-enemy-quick-info';
 box.className = `b32-enemy-quick-info ${guideMode ? 'is-guide-mode' : ''} ${moveActive ? 'is-move' : ''} ${attackActive ? 'is-attack' : ''}`;
 box.innerHTML = `
 <button type="button" class="b32-enemy-quick-close" onclick="_b32CloseEnemyInfo()" aria-label="閉じる">×</button>
 <div class="b32-enemy-quick-title b32-enemy-quick-drag-handle">${b32EscapeHtml(enemy.name || '??????')}<span class="b32-enemy-quick-drag-mark">↕</span></div>
 <div class="b32-enemy-quick-mode-label">${b32EscapeHtml(modeText)}</div>
 <div class="b32-enemy-quick-statline">
   <span>HP <strong>${enemy.hp} / ${enemy.hpMax}</strong></span>
   <span>ATK <strong>${enemy.atk}</strong></span>
 </div>
 <div class="b32-enemy-quick-statline">
   <span>移動 <strong>${b32EscapeHtml(enemyMoveLabel(enemy.moveType))}</strong></span>
   <span>攻撃 <strong>${b32EscapeHtml(enemyAttackLabel(enemy.attackRange))}</strong></span>
 </div>
 <div class="b32-enemy-quick-actions">
   <button type="button" class="b32-enemy-quick-btn ${moveActive ? 'active move' : ''}" onclick="_b32EnemyGuide('move')">移動</button>
   <button type="button" class="b32-enemy-quick-btn ${attackActive ? 'active attack' : ''}" onclick="_b32EnemyGuide('attack')">攻撃</button>
 </div>
 `;

 document.body.appendChild(box);
 _installEnemyQuickInfoDrag(box);
 _positionEnemyQuickInfoPanel(box);
}

function renderBattleMenu(bs) {
 let menu = document.getElementById('b32-battle-menu');

 if (!menu) {
 menu = document.createElement('div');
 menu.id = 'b32-battle-menu';
 menu.innerHTML = `
 <button id="b32-battle-menu-btn" type="button" aria-label="バトルメニュー" title="メニュー">
 <span class="b32-menu-line" aria-hidden="true"></span>
 <span class="b32-menu-line" aria-hidden="true"></span>
 <span class="b32-menu-line" aria-hidden="true"></span>
 </button>
 <div id="b32-battle-menu-panel">
 <button class="b32-battle-menu-item" type="button" data-action="restart">
 やり直す
 </button>
 <button class="b32-battle-menu-item danger" type="button" data-action="stage">
 ステージ選択に戻る
 </button>
 <button class="b32-battle-menu-item" type="button" data-action="close">
 閉じる
 </button>
 </div>
 `;
 document.body.appendChild(menu);

 const btn = menu.querySelector('#b32-battle-menu-btn');
 btn.addEventListener('click', (e) => {
 e.stopPropagation();
 menu.classList.toggle('open');
 });

 menu.querySelectorAll('.b32-battle-menu-item').forEach(item => {
 item.addEventListener('click', (e) => {
 e.stopPropagation();

 const action = item.dataset.action;
 menu.classList.remove('open');

 if (action === 'close') return;

 if (action === 'restart') {
 if (!confirm('このバトルを最初からやり直しますか？')) return;
 b32RestartBattle();
 return;
 }

 if (action === 'stage') {
 const currentBs = _bs();
 const msg = currentBs && currentBs.isRoguelite
   ? 'ローグライトを中断して巡行画面に戻りますか？'
   : 'バトルを中断してステージ選択に戻りますか？';
 if (!confirm(msg)) return;
 b32ReturnToStageSelect();
 return;
 }
 });
 });

 document.addEventListener('click', () => {
 const m = document.getElementById('b32-battle-menu');
 if (m) m.classList.remove('open');
 });
 }

 // バトル画面中だけ表示
 menu.style.display = bs ? 'block' : 'none';
}

function b32RestartBattle() {
 const bs = _bs();
 if (!bs) return;

 // ローグライト中はラン全体の再開ではなく、いったん現在ランを最初からにするのは危険。
 // まずは通常Battle32の再読み込み扱いにする。
 if (bs.isRoguelite) {
 alert('ローグライト中のやり直しは、現在は未対応です。');
 return;
 }

 // 通常バトルなら、今のところはページ/画面復帰ではなく再読み込みが一番安全
 location.reload();
}

function _b32CleanupBattleAndRogueliteOverlays(restoreCommonUi) {
  if (typeof window.cleanupBattle32Overlays === 'function') {
    window.cleanupBattle32Overlays({ restoreCommonUi: !!restoreCommonUi });
  }

  // cleanupBattle32Overlays で消し漏れがあっても、ここで必ず消す
  [
    'battle32-root',
    'b32-link-bar',
    'b32-roster-panel',
    'b32-item-panel',
    'b32-roster-info-close-hitbox',
    'b32-enemy-info-overlay',
    'b32-enemy-quick-info',
    'b32-battle-menu',
    'b32-center-text',
    'b32-combo-text',
    'b32-turn-danger-frame',
    'b32-result-overlay',
    'rl-victory-wait-layer',
    'rl-transition-shield',
    'rl-stage-clear-overlay',
    'rl-stage-fail-overlay',
    'rl-run-result-overlay',
    'rl-run-victory-fx',
    'b32-action-detail-portal'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    if (id === 'battle32-root') {
      el.style.display = 'none';
    } else {
      el.remove();
    }
  });

  _enemyQuickInfoPos = null;
  _enemyQuickInfoDragging = false;
  window.__BATTLE32_UI_ACTIVE__ = false;
  window.__ROGUELITE_TRANSITIONING__ = false;
}

function _b32RestoreCommonUi() {
  const nav = document.getElementById('bottom-nav-shared');
  if (nav) nav.style.display = '';

  const guf = document.getElementById('global-user-frame');
  if (guf) {
    guf.classList.remove('hidden');
    guf.style.display = '';
  }
}

function _b32OpenRogueliteMain() {
  // ローグライト中断時は CHAPTER01 のステージ選択ではなく、巡行メインへ戻す。
  // 画面系の関数名はプロジェクト側の実装差分を吸収するため、存在するものだけ呼ぶ。
  ['stage-select-modal', 'party-select-modal', 'enemy-intro-root', 'battle-root'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const openers = [
    window.openExplore,
    window.showExplore,
    window.openExploration,
    window.showExploration,
    window.openExploreScreen,
    window.showExploreScreen,
    window.openMainExplore,
    window.showMainExplore,
  ];

  for (const fn of openers) {
    if (typeof fn === 'function') {
      try {
        fn();
        _b32RestoreCommonUi();
        if (typeof window.updateMainUI === 'function') window.updateMainUI();
        return;
      } catch (e) {
        console.warn('[Battle32UI] 巡行画面復帰関数の呼び出しに失敗:', e);
      }
    }
  }

  const explore = document.getElementById('explore-root') || document.getElementById('explore-screen');
  if (explore) {
    explore.classList.remove('hidden');
    explore.style.display = '';
  }

  _b32RestoreCommonUi();
  if (typeof window.updateMainUI === 'function') window.updateMainUI();
}

function b32ReturnToStageSelect() {
  const bs = _bs();
  const isRoguelite = !!(bs && bs.isRoguelite);

  // ローグライト中ならラン終了し、ステージ選択ではなく巡行メインへ戻す
  if (isRoguelite) {
    if (window.RogueliteRun) {
      window.RogueliteRun.end('lose');
    }
    if (typeof window.clearBattle32ResumeState === 'function') {
      window.clearBattle32ResumeState();
    }

    _b32CleanupBattleAndRogueliteOverlays(true);
    _b32OpenRogueliteMain();
    return;
  }

  // 通常バトルのみ、戻り先チャプターを決めてステージ選択へ戻す
  let chapter = 1;

  if (bs && bs.returnChapter != null) {
    chapter = bs.returnChapter;
  } else if (bs && bs.stageId && typeof STAGES !== 'undefined') {
    const st = STAGES.find(s => s.id === bs.stageId);
    if (st && st.chapter != null) chapter = st.chapter;
  }

  _b32CleanupBattleAndRogueliteOverlays(false);

  // ステージ選択へ戻す
  if (typeof window.openStageSelect === 'function') {
    window.openStageSelect(chapter);
    return;
  }

  if (typeof window.showStageSelect === 'function') {
    window.showStageSelect(chapter);
    return;
  }

  console.warn('[Battle32UI] ステージ選択へ戻る関数が見つかりません');
}

 function renderCore(row, col, bs) {
 // コア概念廃止：盤面にはコアを描画しない
 return '';
}


function b32StatusEffectBadgeList(unit) {
 const effects = Array.isArray(unit && unit.statusEffects) ? unit.statusEffects : [];
 const passiveBuffs = Array.isArray(unit && unit.rogueliteBuffs) ? unit.rogueliteBuffs : [];
 const badges = [];
 const pushBadge = (cls, text, priority = 50) => {
   if (text && !badges.some(b => b.text === text)) badges.push({ cls, text, priority });
 };
 const fmtDur = (e) => e && e.duration ? `${e.duration}T` : '';
 const fmtPctFromAdd = (value, fallback) => {
   const n = Number(value);
   if (!Number.isFinite(n)) return fallback;
   return Math.round((n <= 1 ? n : n / 100) * 100);
 };
 const fmtPctFromMultiplier = (value, fallback, up = true) => {
   const n = Number(value);
   if (!Number.isFinite(n)) return fallback;
   return up ? Math.round((n - 1) * 100) : Math.round((1 - n) * 100);
 };

 // ローグライト報酬などの永続補正。実数値には別途反映済みなので、ここでは表示だけ行う。
 passiveBuffs.forEach(e => {
   if (!e) return;
   const rate = Number(e.rate);
   const type = e.type || e.kind;
   if (type === 'roguelite_atk_up' || type === 'atk_bonus' || type === 'atk_up_passive') {
     pushBadge('buff passive', `ATK+${fmtPctFromAdd(rate, 10)}%`, 10);
   } else if (type === 'roguelite_hp_up' || type === 'hp_bonus' || type === 'hp_up_passive') {
     pushBadge('buff passive', `HP+${fmtPctFromAdd(rate, 10)}%`, 11);
   } else if (type === 'roguelite_critical_up' || type === 'critical_bonus' || type === 'crit_bonus') {
     pushBadge('buff passive', `CRI+${fmtPctFromAdd(rate, 10)}%`, 12);
   }
 });

 effects.forEach(e => {
   if (!e) return;
   const dur = fmtDur(e);
   const rate = Number(e.rate);
   if (e.type === 'atk_up') {
     const pct = fmtPctFromMultiplier(rate, 50, true);
     pushBadge('buff', `ATK+${pct}%${dur ? ` ${dur}` : ''}`, 20);
   } else if (e.type === 'atk_down') {
     const pct = fmtPctFromMultiplier(rate, 30, false);
     pushBadge('debuff', `ATK-${pct}%${dur ? ` ${dur}` : ''}`, 21);
   } else if (e.type === 'critical_up' || e.type === 'crit_up') {
     const pct = fmtPctFromAdd(e.rate != null ? e.rate : e.amount, 20);
     pushBadge('buff', `CRI+${pct}%${dur ? ` ${dur}` : ''}`, 22);
   } else if (e.type === 'critical_down' || e.type === 'crit_down') {
     const pct = fmtPctFromAdd(e.rate != null ? e.rate : e.amount, 20);
     pushBadge('debuff', `CRI-${pct}%${dur ? ` ${dur}` : ''}`, 23);
   } else if (e.type === 'hp_up') {
     const pct = fmtPctFromAdd(e.rate != null ? e.rate : e.amount, 20);
     pushBadge('buff', `HP+${pct}%${dur ? ` ${dur}` : ''}`, 24);
   } else if (e.type === 'damage_cut') {
     const pct = Number.isFinite(rate) ? Math.round(rate * 100) : 50;
     pushBadge('buff', `DMG-${pct}%${dur ? ` ${dur}` : ''}`, 25);
   } else if (e.type === 'poison') {
     pushBadge('debuff', `毒${dur ? ` ${dur}` : ''}`, 40);
   } else if (e.type === 'yoi_no_sousou') {
     pushBadge('buff', `反撃${dur ? ` ${dur}` : ''}`, 30);
   }
 });

 if (unit && (unit.stunned || effects.some(e => e && e.type === 'stun'))) {
   const stun = effects.find(e => e && e.type === 'stun');
   pushBadge('debuff', `STUN${stun && stun.duration ? ` ${stun.duration}T` : ''}`, 5);
 }

 return badges.sort((a, b) => a.priority - b.priority).slice(0, 4);
}

function b32StatusEffectBadgesHtml(unit, compact) {
 const list = b32StatusEffectBadgeList(unit);
 if (!list.length) return '';
 const cls = compact ? 'b32-status-badges compact' : 'b32-status-badges';
 return `<div class="${cls}">${list.map(b => `<span class="b32-status-badge ${b.cls}">${b32EscapeHtml(b.text)}</span>`).join('')}</div>`;
}

 function renderUnit(u, phase) {
 // 生存判定：味方・敵ともに hp で統一
 const bsCurrent = _bs();

 const dead = u.hp <= 0;

 // 両方の行動（move + skill）を使い切ったキャラを done 扱い
 const _uah = (bsCurrent && bsCurrent.unitActionHistory || {});
 const _uh = (_uah[u._uid] || {});
 const isDone = u.side === 'ally' && phase === 'skill' && !!(_uh.move && _uh.skill);

 let inner = '';
const displayImg =
 u.battleBackImg ||
 u.battleBack ||
 u.img ||
 u.battleImg ||
 null;

const battleBackScale = getUnitUiScale(u, 'battleBack');
const battleBackY = getUnitUiOffsetY(u, 'battleBack');

if (displayImg) {
 inner += `
 <img
 class="b32-unit-icon"
 src="${displayImg}"
 alt=""
 style="--unit-scale:${battleBackScale}; --unit-offset-y:${battleBackY}px;"
 onerror="this.style.display='none'"
 >
 `;
} else {
 inner += `<div class="b32-unit-initial">${initial(u.name)}</div>`;
}
inner += `<div class="b32-unit-name">${u.name}</div>`;

 // 敵のみ HP バーを出力（味方は HP バー廃止）
 // ボスは核露出後もバーを表示（HP0で0%表示になる）
if (u.side === 'enemy') {
 const hpPct = Math.max(0, Math.round((u.hp / u.hpMax) * 100));
 const hpCol = hpColor(u.hp, u.hpMax);
 const elemIcon = unitElementIcon(u.element);

 const statusHtml = b32StatusEffectBadgesHtml(u, true);
 inner += `
  <div class="b32-unit-foot-ui">
    <div class="b32-unit-foot-main">
      <div class="b32-hp-bar-wrap">
        <div class="b32-hp-bar" style="width:${hpPct}%;background:${hpCol}"></div>
      </div>
      ${elemIcon ? `<img class="b32-foot-element-icon b32-foot-element-icon-${unitElementClass(u.element)}" src="${elemIcon}" alt="${unitElementLabel(u.element)}" title="${unitElementLabel(u.element)}" onerror="this.style.display='none'">` : ''}
    </div>
    ${statusHtml}
  </div>
 `;
}

if (u.side === 'ally') {
 const hpPct = Math.max(0, Math.round((u.hp / u.hpMax) * 100));
 const elemIcon = unitElementIcon(u.element);

 const statusHtml = b32StatusEffectBadgesHtml(u, true);
 inner += `
  <div class="b32-unit-foot-ui">
    <div class="b32-unit-foot-main">
      <div class="b32-hp-bar-wrap">
        <div class="b32-hp-bar" style="width:${hpPct}%"></div>
      </div>
      ${elemIcon ? `<img class="b32-foot-element-icon b32-foot-element-icon-${unitElementClass(u.element)}" src="${elemIcon}" alt="${unitElementLabel(u.element)}" title="${unitElementLabel(u.element)}" onerror="this.style.display='none'">` : ''}
    </div>
    ${statusHtml}
  </div>
 `;
}

 if (u.side === 'ally') {
 const dots = Array.from({ length: u.shinkiMax }, (_, i) =>
 `<div class="b32-shinki-dot ${i < u.shinki ? 'filled' : ''}"></div>`
 ).join('');
 inner += `<div class="b32-shinki-dots">${dots}</div>`;
 }
 if (u.isBoss) inner += `<div class="b32-boss-badge">BOSS</div>`;
 if (isDone) inner += `<div class="b32-unit-done-mark">✓</div>`;

 // ── スタン判定 ──
 const isStunned =
 !!u.stunned ||
 (Array.isArray(u.statusEffects) && u.statusEffects.some(e => e.type === 'stun'));

 if (isStunned) {
 inner += `
 <div class="b32-stun-fx" aria-hidden="true">
 <span class="b32-stun-ring"></span>
 <span class="b32-stun-spark s1"></span>
 <span class="b32-stun-spark s2"></span>
 <span class="b32-stun-spark s3"></span>
 <span class="b32-stun-badge">⚡</span>
 </div>
 `;
 }

 const midBossClass = u.isMidBoss ? ' midboss' : '';

const enemyIdClass = u.side === 'enemy' && u.id
 ? ` enemy-id-${String(u.id).replace(/[^a-zA-Z0-9_-]/g, '')}`
 : '';

const stunnedClass = isStunned ? ' is-stunned' : '';

const summonClass = u.side === 'summon' ? ' summon' : '';

const activeEnemyClass =
 u.side === 'enemy' && bsCurrent && bsCurrent.activeEnemyUid === u._uid
   ? ' active-enemy-action'
   : '';

const extraCls =
 (isDone ? ' skill-done' : '') +
 (u.isBoss ? ' boss' : '') +
 summonClass +
 midBossClass +
 enemyIdClass +
 activeEnemyClass;

return `<div class="b32-unit ${u.side}${dead ? ' dead' : ''}${extraCls}${stunnedClass}">${inner}</div>`;
 }

 // ============================================================
 // スキル タップ操作
 // ============================================================

 // 盤面上の味方をタップ（スキルフェーズ）→ 行動選択メニューを表示
 window._b32OnSkillAllyTap = async function (allyUid) {
 if (_b32InputLocked) return;
 const bs = _bs();
 if (!bs || bs.phase !== 'skill' || bs.result) return;

 const ally = bs.allies.find(u => u._uid === allyUid);
 if (!ally || ally.hp <= 0) return;

 // アイテムの味方対象選択中は、盤面/キャラパネルの味方タップをアイテム使用として扱う。
 // これにより、HP回復・神気MAX・ガード等をグリッドではなくキャラパネルから確実に使える。
 if (b32IsAllyItemTargetMode(bs)) {
   if (typeof window._b32OnItemAllyTap === 'function') {
     window._b32OnItemAllyTap(allyUid);
   }
   return;
 }

 const history = bs.unitActionHistory || {};
 const unitHistory = history[allyUid] || {};
 // actionCount: 1キャラ最大2行動。移動1回 + スキル/ULT1回まで。
 // 行動上限到達後でも、情報確認・スキル確認のために選択は許可する。
 // 実際の移動/スキル/ULT発動は各アクション側で個別に止める。
 const unitActionDone = !!unitHistory.unitActionDone;

 const wasTargetSelecting = !!(
   _moveMode ||
   _selMoveAllyUid ||
   _selSkillAllyUid ||
   _selSkillId ||
   _summonMode ||
   _itemMode
 );

 // 同じキャラを通常選択中に再タップした場合だけ、従来通りメニューを閉じる。
 // 移動先/スキル対象/召喚/アイテム選択中のキャラタップは、必ず現在の操作をキャンセルして
 // タップしたキャラの行動選択へ切り替える。
 if (_selActionAllyUid === allyUid && !wasTargetSelecting) {
 _selActionAllyUid = null;
 renderBattle32UI();
 return;
 }

 // 現在の選択モードをすべて解除して、タップしたキャラの行動選択メニューへ切り替える。
 _selActionAllyUid = allyUid;
 _selMoveAllyUid = null;
 _selSkillAllyUid = null;
 _selSkillId = null;
 _moveMode = false;

 _summonMode = false;
 _summonRosterId = null;
 _selectedRosterId = null;

 _itemMode = false;
 _itemSlotIndex = null;
 _itemPhase = null;
 _itemTargetUid = null;

 _selectedEnemyUid = null;
 _selectedEnemyGuideMode = null;

 _hideActionDetailPortal();
 const rosterHitbox = document.getElementById('b32-roster-info-close-hitbox');
 if (rosterHitbox && rosterHitbox.parentNode) rosterHitbox.parentNode.removeChild(rosterHitbox);

 renderBattle32UI();
 };

 // ── 行動選択メニューのボタン処理 ──

 window._b32OnActionBackTap = function () {
 if (_b32InputLocked) return;
 _selActionAllyUid = null;
 _selMoveAllyUid = null;
 _selSkillAllyUid = null;
 _selSkillId = null;
 _moveMode = false;
 renderBattle32UI();
 };

 window._b32OnActionMoveTap = function () {
  if (_b32InputLocked) return;

  const bs = _bs();
  if (!bs || bs.phase !== 'skill' || bs.result) return;

  const uid = _getActiveActionAllyUid();
  if (!uid) return;

  const ally = (bs.allies || []).find(u => u._uid === uid);
  if (!ally || ally.hp <= 0) return;

  const history = bs.unitActionHistory || {};
  const unitHistory = history[uid] || {};

  const canAct = _canActByLink(bs, 1);
  if (!canAct || !_unitCanMoveNow(bs, uid)) return;

  _selMoveAllyUid = uid;
  _selSkillAllyUid = null;
  _selSkillId = null;
  _selActionAllyUid = null;
  _moveMode = true;

  _summonMode = false;
  _itemMode = false;
  _itemSlotIndex = null;
  _itemPhase = null;
  _itemTargetUid = null;

  renderBattle32UI();
};

window._b32OnActionSkillTap = function () {
  if (_b32InputLocked) return;

  const bs = _bs();
  if (!bs || bs.phase !== 'skill' || bs.result) return;

  const uid = _getActiveActionAllyUid();
  if (!uid) return;

  const ally = (bs.allies || []).find(u => u._uid === uid);
  if (!ally || ally.hp <= 0) return;

  const history = bs.unitActionHistory || {};
  const unitHistory = history[uid] || {};

  const normalSkills = (ally.skills || []).filter(s => !s.isUltimate);
  // 行動済みでもスキル内容の確認は許可する。
  // 実際の発動可否はスキル詳細の決定ボタンと _b32ConfirmSkill 側で制御する。
  if (!normalSkills.length) return;

  _selSkillAllyUid = uid;
  _selSkillId = null;
  _selMoveAllyUid = null;
  _selActionAllyUid = null;
  _moveMode = false;

  _summonMode = false;
  _itemMode = false;
  _itemSlotIndex = null;
  _itemPhase = null;
  _itemTargetUid = null;

  renderBattle32UI();
};

window._b32OnActionUltTap = function () {
  if (_b32InputLocked) return;

  const bs = _bs();
  if (!bs || bs.phase !== 'skill' || bs.result) return;

  const uid = _getActiveActionAllyUid();
  if (!uid) return;

  const ally = (bs.allies || []).find(u => u._uid === uid);
  if (!ally || ally.hp <= 0) return;

  const ultSkill = (ally.skills || []).find(s => s.isUltimate);
  if (!ultSkill) return;

  const history = bs.unitActionHistory || {};
  const unitHistory = history[uid] || {};

  // 行動済み・LINK不足・神気不足でも、ULT情報の確認だけは許可する。
  // 発動可否はスキル詳細の決定ボタンと _b32ConfirmSkill 側で制御する。

  _selSkillAllyUid = uid;
  _selSkillId = ultSkill.id;
  _selMoveAllyUid = null;
  _selActionAllyUid = null;
  _moveMode = false;

  _summonMode = false;
  _itemMode = false;
  _itemSlotIndex = null;
  _itemPhase = null;
  _itemTargetUid = null;

  renderBattle32UI();
};

 // ============================================================
 // ターン移行前に詳細系UIを一括クローズする
 // ============================================================
 function _closeBattle32DetailPanelsBeforeTurnChange() {
   // UI内部状態をリセット
   _resetSkillState();

   // 敵選択・召喚・アイテム状態も解除
   _selectedEnemyUid = null;
   _selectedEnemyGuideMode = null;
   _summonMode = false;
   _summonRosterId = null;
   _itemMode = false;
   _itemSlotIndex = null;
   _itemPhase = null;
   _itemTargetUid = null;

   // スキル詳細ボックスを明示的に閉じる
   const skillBox = document.getElementById('b32-skill-detail-box');
   if (skillBox) {
     skillBox.style.display = 'none';
     skillBox.classList.remove('show');
   }

   // ロスター詳細パネルを明示的に削除
   document
     .querySelectorAll('#battle32-root .b32-roster-info-panel')
     .forEach(el => el.remove());

   // ロスター詳細の閉じる用ヒットボックスも削除
   const rosterHitbox = document.getElementById('b32-roster-info-close-hitbox');
   if (rosterHitbox) rosterHitbox.remove();

   // 敵情報系も残らないよう削除
   const enemyInfo = document.getElementById('b32-enemy-info-overlay');
   if (enemyInfo) enemyInfo.remove();
   const enemyQuick = document.getElementById('b32-enemy-quick-info');
   if (enemyQuick) enemyQuick.remove();
 }

 window._b32OnActionEndTap = async function () {
 if (_b32InputLocked) return;
 const bs = _bs();
 if (!bs || bs.result || bs.phase !== 'skill') return;

 // スマホの二重タップ・二重click対策
 _b32InputLocked = true;

 // 詳細系UIを先に閉じる
 _closeBattle32DetailPanelsBeforeTurnChange();

 // 閉じた状態を一度描画する
 renderBattle32UI();

 // 1フレーム待って DOM 反映後に敵ターンへ移る
 if (typeof _wait === 'function') {
   await _wait(60);
 } else {
   await new Promise(resolve => requestAnimationFrame(resolve));
 }

 if (window.Battle32 && typeof window.Battle32.endSkillPhase === 'function') {
   window.Battle32.endSkillPhase();
 } else if (window.Battle32 && typeof window.Battle32.endCharTurn === 'function') {
   window.Battle32.endCharTurn();
 } else {
   _b32InputLocked = false;
 }
};

 // 移動可能マスをタップ
 window._b32OnMoveCellTap = async function (row, col) {
 if (_b32InputLocked) return;
 if (!_selMoveAllyUid || !window.Battle32 || !window.Battle32.moveAlly) return;

 const ok = window.Battle32.moveAlly(_selMoveAllyUid, row, col);
 if (!ok) return;

 // 移動成功 → 全選択状態をリセット
 // battle_32.js 側で actionCount が 2 なら自動で敵ターンへ進む
 // actionCount が 1 なら再描画して2回目の行動を選べる状態にする
 _resetSkillState();
 renderBattle32UI();
 };


 // ============================================================
 // スキルチップ 長押し判定
 // ============================================================
 let _skillPressTimer = null;
 let _skillLongPressed = false;

 window._b32SkillPressStart = function (event, allyUid, skillId) {
 if (_b32InputLocked) return;

 if (event) {
 event.preventDefault();
 event.stopPropagation();

 // pointercancel が起きにくくなる
 if (event.currentTarget && event.pointerId != null && event.currentTarget.setPointerCapture) {
 try {
 event.currentTarget.setPointerCapture(event.pointerId);
 } catch (e) {}
 }
 }

 _skillLongPressed = false;
 clearTimeout(_skillPressTimer);

 _skillPressTimer = setTimeout(() => {
 _skillPressTimer = null;
 _skillLongPressed = true;
 _b32ShowSkillDetail(allyUid, skillId);
 }, 450); // 600だと長いので少し短縮
};

window._b32SkillPressEnd = function (event) {
 if (event) {
 event.preventDefault();
 event.stopPropagation();
 }

 if (_skillPressTimer) {
 clearTimeout(_skillPressTimer);
 _skillPressTimer = null;
 }
};

window._b32OnSkillChipClick = function (event, allyUid, skillId) {
 if (event) {
 event.preventDefault();
 event.stopPropagation();
 }

 if (_b32InputLocked) return;

 // スキルを選んだら、ボトムUIを詳細画面へ切り替える
 _selSkillId = skillId;

 const box = document.getElementById('b32-skill-detail-box');
 if (box) {
 box.style.display = 'none';
 box.classList.remove('show');
 }

 renderBattle32UI();
};

window._b32CancelSkillDetail = function (event) {
 if (event) {
 event.preventDefault();
 event.stopPropagation();
 }

 if (_b32InputLocked) return;

 // 詳細画面を閉じて、スキル選択画面へ戻す
 _selSkillId = null;

 const box = document.getElementById('b32-skill-detail-box');
 if (box) {
 box.style.display = 'none';
 box.classList.remove('show');
 }

 _hideActionDetailPortal();

 renderBattle32UI();
};

 function _b32ShowSkillDetail(allyUid, skillId) {
 const bs = _bs();
 if (!bs) return;

 const ally = bs.allies.find(u => u._uid === allyUid);
 if (!ally) return;

 const skill = ally.skills.find(s => s.id === skillId);
 if (!skill) return;

 const box = _ensureSkillDetailLayer();
 const name = document.getElementById('b32-skill-detail-name');
 const desc = document.getElementById('b32-skill-detail-desc');
 const meta = document.getElementById('b32-skill-detail-meta');
 const btn = document.getElementById('b32-skill-confirm-btn');

 if (!box || !name || !desc || !meta || !btn) return;

 const metaParts = [];
 if (skill.shinkiCost > 0) metaParts.push(`神気 ${skill.shinkiCost}`);
 if (skill.multiplier) metaParts.push(`倍率 ${skill.multiplier}`);
 if (skill.range) metaParts.push(`射程 ${skill.range}`);

 name.textContent = skill.name || 'SKILL';
 desc.textContent = skill.desc || '説明はまだありません。';
 meta.textContent = metaParts.join('　/　');

 // 決定ボタンを押した時だけ発動
 btn.onclick = function (event) {
 if (event) {
 event.preventDefault();
 event.stopPropagation();
 }
 window._b32ConfirmSkill(allyUid, skillId);
 };

 box.style.display = '';
 box.classList.remove('show');
 void box.offsetWidth;
 box.classList.add('show');
}
 // スキル決定ボタン → 発動
window._b32ConfirmSkill = async function (allyUid, skillId) {
 if (_b32InputLocked) return;
 if (!window.Battle32) return;
 const bs = _bs();
 if (!bs || bs.phase !== 'skill') return;

 const allyBefore = bs.allies.find(u => u._uid === allyUid);
 const allyName = allyBefore ? allyBefore.name : '';

 _selSkillId = skillId;

// スキル名を取得
const allyNow = bs.allies.find(u => u._uid === allyUid);
const skillNow = allyNow && allyNow.skills
 ? allyNow.skills.find(s => s.id === skillId)
 : null;

// 行動済み・LINK不足・神気不足の場合は、情報確認のみで発動しない。
if (!_canUseSkillNow(bs, allyNow, skillNow)) {
  const guide = document.getElementById('b32-bottom-guide');
  if (guide) guide.textContent = 'このキャラはこのターン行動済み、またはコスト不足です。';
  return;
}

// 入力ロックして、スキル/ULT演出中はコンボウインドウとレンジを退避する。
_b32InputLocked = true;
const comboInspectDuringAction = document.getElementById('b32-combo-inspect');
if (comboInspectDuringAction) comboInspectDuringAction.remove();
renderBattle32UI();

const charImg =
 allyNow?.panelImg ||
 allyNow?.panel ||
 allyNow?.portrait ||
 allyNow?.upImg ||
 allyNow?.img ||
 allyNow?.battleImg ||
 null;

if (skillNow?.isUltimate) {
 const ultImg =
 allyNow?.cutin ||
 allyNow?.ultImg ||
 allyNow?.cutImg ||
 allyNow?.panelImg ||
 allyNow?.img ||
 null;

 await _showUltCutin(skillNow ? skillNow.name : 'ULT', ultImg);
}

// 通常スキルはスキル名カットインを挟まず、すぐ攻撃アップ演出へ入る。
// ULTのみ専用カットインを表示してから実行する。
await _wait(skillNow?.isUltimate ? 60 : 0);

let ok = false;
try {
  ok = await window.Battle32.executeAllySkill(allyUid, skillId);
} catch (e) {
  console.error('[Battle32UI] executeAllySkill crashed', e, { allyUid, skillId, skillName: skillNow && skillNow.name });
  // applyDamage後のUI演出コールバックなどで例外が出た場合でも、
  // 内部状態のHPだけ更新済みのことがあるため、必ず再描画して見える化する。
  renderBattle32UI();
  _b32InputLocked = false;
  return;
}
if (!ok) {
  console.warn('[Battle32UI] executeAllySkill failed');
  renderBattle32UI();
  _b32InputLocked = false;
  return;
}

_resetSkillState();
renderBattle32UI();

// 勝敗確定していたら、ターン終了演出に進まない
const bsAfterSkill = _bs();
if (bsAfterSkill && bsAfterSkill.result) {
  _b32InputLocked = true;
  return;
}

// 通常攻撃とコンボチェーンはBattle32側で完全同期済み。
// 最後のポップアップを見せる短い余韻だけ置く。
await _wait(skillNow?.isUltimate ? 520 : 380);

await window.showBattle32CenterTextAsync('ターン終了', '', 700);

await _afterCharTurnFlow();
 };

 // キャラ単位の行動終了（スキルなしで終了）
 window._b32EndCharTurn = async function (allyUid) {
 if (_b32InputLocked) return;
 const bs = _bs();
 if (!bs || bs.phase !== 'skill') return;
 if (!window.Battle32) return;

 const ally = bs.allies.find(u => u._uid === allyUid);
 // 行動終了はいつでも押せる
 if (typeof window.Battle32.endCharTurn === 'function') {
 window.Battle32.endCharTurn(allyUid);
 }

 // 詳細系UIを先に閉じてから描画
 _closeBattle32DetailPanelsBeforeTurnChange();
 _b32InputLocked = true;
 renderBattle32UI();

 await _afterCharTurnFlow();
 };

 // キャラ行動後の共通フロー
 async function _afterCharTurnFlow() {
 // battle_32.js 側で endSkillPhase() が呼ばれているので、
 // UI側はロック解除とレンダリングのみ担当
 const bsAfter = _bs();
 if (!bsAfter) { _b32InputLocked = false; return; }
 // phase が 'enemy' に切り替わっている場合、_runEnemyTurnFlow がロックを管理する
 // まだ 'skill' の場合（endSkillPhase未呼び出し等）は操作解除
 if (bsAfter.phase === 'skill') {
 _b32InputLocked = false;
 }
 renderBattle32UI();
 }

 // ============================================================
 // パーティステータスパネル描画
 // ============================================================
 function renderPartyStatus(bs) {
 const el = document.getElementById('b32-party-status');
 if (!el) return;

 el.innerHTML = bs.allies.map(ally => {
 // 正面・胸上画像を優先（盤面の後ろ姿とは別）
 const img =
 ally.panelImg ||
 ally.panel ||
 ally.battleImg ||
 ally.img ||
 ally.portrait ||
 ally.upImg ||
 '';
 const panelScale = getUnitUiScale(ally, 'panel');
 const panelY = getUnitUiOffsetY(ally, 'panel');

 const dead = ally.hp <= 0;
 // 両方の行動を使い切ったキャラを done 扱い
 const _uh = (bs.unitActionHistory || {})[ally._uid] || {};
 const done = !!(_uh.move && _uh.skill);
 // 移動対象として選択中 or スキルキャラとして選択中ならハイライト
 const selected = ally._uid === _selMoveAllyUid || ally._uid === _selSkillAllyUid;

 // レアリティ表示は廃止。カード左上には属性アイコンを表示する。

 // HP バー＋数値表示（下部キャラパネル専用：バー色はCSS固定）
 const hpPct = ally.hpMax > 0 ? Math.max(0, Math.round((ally.hp / ally.hpMax) * 100)) : 0;
 const hpHtml = `
 <div class="b32-party-hp-block">
   <div class="b32-party-hp-num">
     ${ally.hp}<span class="b32-party-hp-max">/${ally.hpMax}</span>
   </div>
   <div class="b32-party-hp-bar-wrap">
     <div class="b32-party-hp-bar" style="width:${hpPct}%"></div>
   </div>
 </div>
 `;

 // 神気ドット（HP下横並び用）
 const shinkiDotsInner = Array.from({ length: ally.shinkiMax || 3 }, (_, i) =>
 `<span class="b32-party-shinki-dot ${i < (ally.shinki || 0) ? 'filled' : ''}"></span>`
 ).join('');
 const shinkiRow = `
 <div class="b32-party-shinki-row">
 <span class="b32-party-shinki-label">SHINKI</span>
 <div class="b32-party-shinki-dots">${shinkiDotsInner}</div>
 </div>
 `;
 // 旧バッジ用（非表示にしてあるが変数は残す）
 const shinkiDots = shinkiDotsInner;

 const statusBadgesHtml = b32StatusEffectBadgesHtml(ally, false);

 // タップ可否：行動済みでも情報確認のためタップ可能にする。
 // 実際の行動可否はアクションボタン/決定ボタン側で制御する。
 const itemTargetMode = b32IsAllyItemTargetMode(bs) && !dead && ally.hp > 0;
 const tappable = !dead && bs.phase === 'skill' && !bs.result;
 const onclickAttr = itemTargetMode
   ? `onclick="_b32OnItemAllyTap('${ally._uid}')"`
   : (tappable ? `onclick="_b32OnSkillAllyTap('${ally._uid}')"` : '');

 return `
 <div class="b32-party-card${dead ? ' dead' : ''}${done ? ' done' : ''}${selected ? ' selected' : ''}"
 data-uid="${ally._uid}"
 ${onclickAttr}>
 <!-- ACTIVEバッジ（選択中のみ表示） -->
 <div class="b32-party-active-badge">ACTIVE</div>
 <!-- 神気ドット：絶対配置でカード右上に固定 -->
 <div class="b32-party-shinki-badge">${shinkiDots}</div>
 <div class="b32-party-img-wrap">
 ${img
 ? `<img
 class="b32-party-img"
 src="${img}"
 alt=""
 style="transform: translateY(${panelY}px) scale(${panelScale}); transform-origin: center center;"
 onerror="this.style.display='none'"
>`
 : `<div class="b32-party-initial">${initial(ally.name)}</div>`}
 ${unitElementIcon(ally.element) ? `<img class="b32-party-element-icon b32-party-element-icon-${unitElementClass(ally.element)}" src="${unitElementIcon(ally.element)}" alt="${unitElementLabel(ally.element)}" title="${unitElementLabel(ally.element)}" onerror="this.style.display='none'">` : ''}
 </div>
 <div class="b32-party-name">${ally.name}</div>
 <!-- HP バー＋数値：カード下部 -->
 <div class="b32-party-hp-section">${hpHtml}</div>
 <!-- 神気：HPの下に横並び -->
 ${shinkiRow}
 ${dead ? `<div class="b32-party-return">RETURN</div>` : ''}
 ${statusBadgesHtml}
 ${(!!ally.stunned || (Array.isArray(ally.statusEffects) && ally.statusEffects.some(e => e.type === 'stun')))
 ? `<div class="b32-party-status-badge stun">⚡STUN</div>` : ''}
 ${(Array.isArray(ally.statusEffects) && ally.statusEffects.some(e => e.type === 'yoi_no_sousou'))
 ? `<div class="b32-party-status-badge yoi">酔ノ想葬</div>` : ''}
 </div>
 `;
 }).join('');
 }

 // ============================================================
 // スキルパネル描画
 // ============================================================
 function renderBottomArea(bs) {
 const guideEl = document.getElementById('b32-bottom-guide');
 const skillPanel = document.getElementById('b32-skill-panel');
 if (!skillPanel) return;

 const rosterPanelEl = document.getElementById('b32-roster-panel');
 const itemPanelEl = document.getElementById('b32-item-panel');
 const rootEl = document.getElementById(ROOT_ID);
 const isSkillChoiceOpen = !!(bs && bs.phase === 'skill' && _selSkillAllyUid && !_moveMode && !_summonMode && !_itemMode);
 if (rootEl) rootEl.classList.toggle('b32-skill-choice-open', isSkillChoiceOpen);
 skillPanel.classList.toggle('b32-skill-choice-open', isSkillChoiceOpen);

 // ローグライト時は b32-party-status パネルを非表示
 if (bs.isRoguelite) {
   const ps = document.getElementById('b32-party-status');
   if (ps) ps.style.setProperty('display', 'none', 'important');
 }

 if (bs.phase === 'skill') {
 skillPanel.style.display = '';

 // 召喚モード中はガイドを変える
 if (_summonMode) {
   if (guideEl) guideEl.textContent = '召喚するマスをタップしてください。';
   const charaNameEl = document.getElementById('b32-skill-chara-name');
   if (charaNameEl) charaNameEl.textContent = '';
   const listEl = document.getElementById('b32-skill-list');
   if (listEl) listEl.innerHTML = '';
   const ps = document.getElementById('b32-party-status');
   if (ps) ps.style.setProperty('display', 'none', 'important');
   return;
 }

 // アイテムモード中はガイドを変える
 if (_itemMode) {
   const item = bs.items && bs.items[_itemSlotIndex];
   if (guideEl) {
     if (_itemPhase === 'cell') {
       guideEl.textContent = '転位先のマスをタップしてください。';
     } else if (item && (item.type === 'swap_ally' || item.type === 'swap_enemy') && _itemTargetUid) {
       guideEl.textContent = `${item.name}：2体目を選んでください。`;
     } else if (b32IsAllyTargetItem(item)) {
       guideEl.textContent = `${item ? item.name : 'アイテム'}：対象のキャラパネルをタップしてください。`;
     } else {
       guideEl.textContent = `${item ? item.name : 'アイテム'}の対象を選んでください。`;
     }
   }
   const charaNameEl = document.getElementById('b32-skill-chara-name');
   if (charaNameEl) charaNameEl.textContent = '';
   const listEl = document.getElementById('b32-skill-list');
   if (listEl) listEl.innerHTML = '';
   const ps = document.getElementById('b32-party-status');
   if (ps) ps.style.setProperty('display', 'none', 'important');
   return;
 }

 // ── フェーズ判定 ──
 // Move: 移動先マス選択中 (_selMoveAllyUid=set, _moveMode=true)
 // Skill: スキル内容選択中 (_selSkillAllyUid=set)
 // Idle: キャラ選択待ち (両方null)

 if (_moveMode && _selMoveAllyUid) {
 // ── 移動先マス選択中 ──
 // 戻るボタンは renderActionMenu() が固定位置に表示するため、ここでは出さない
 const partyStatusEl = document.getElementById('b32-party-status');
 if (partyStatusEl) partyStatusEl.style.setProperty('display', 'none', 'important');
 if (guideEl) guideEl.textContent = '移動先のマスをタップしてください。';
 const charaNameEl = document.getElementById('b32-skill-chara-name');
 if (charaNameEl) charaNameEl.textContent = '';
 const listEl = document.getElementById('b32-skill-list');
 if (listEl) listEl.innerHTML = '';

} else if (_selSkillAllyUid) {
  // ── Phase4: スキルキャラ選択済み、スキル内容を選ぶ ──
  const ally = bs.allies.find(u => u._uid === _selSkillAllyUid);
  if (!ally) {
    _resetSkillState();
    renderBattle32UI();
    return;
  }

  if (rosterPanelEl) rosterPanelEl.style.setProperty('display', 'none', 'important');
  if (itemPanelEl) itemPanelEl.style.setProperty('display', 'none', 'important');

  // スキル選択中はパーティカードを隠す
  const partyStatusEl = document.getElementById('b32-party-status');
  if (partyStatusEl) partyStatusEl.style.setProperty('display', 'none', 'important');

  if (guideEl) guideEl.textContent = 'アクションを選択してください。';

 const charaNameEl = document.getElementById('b32-skill-chara-name');
 if (charaNameEl) charaNameEl.textContent = '';

 const listEl = document.getElementById('b32-skill-list');
 if (!listEl) return;

 // ULT / 終了の丸ボタン
 // ULT / 終了 / 戻るの丸ボタンは renderActionMenu() が固定位置に表示するため、ここでは生成しない
 const floatingButtonsHtml = '';

 // スキル詳細画面（スキル選択済みの場合）
 if (_selSkillId) {
 const selectedSkill = ally.skills.find(s => s.id === _selSkillId);
 if (!selectedSkill) {
 _selSkillId = null;
 _hideActionDetailPortal();
 renderBattle32UI();
 return;
 }

 const compactSummaryHtml = b32BuildCompactSkillSummaryHtml(selectedSkill, ally);

 listEl.innerHTML = '';

 const portal = _ensureActionDetailPortal();
 portal.style.display = 'block';
 portal.classList.add('show');
 _positionActionDetailPortal();

 const canConfirmSkill = _canUseSkillNow(bs, ally, selectedSkill);
 const confirmDisabledAttr = canConfirmSkill ? '' : 'disabled aria-disabled="true"';
 const confirmDisabledCls = canConfirmSkill ? '' : ' disabled';

 portal.innerHTML = `
 <div class="b32-action-detail-panel b32-action-detail-panel-compact">
 <div class="b32-action-detail-title">${b32EscapeHtml(selectedSkill.name || 'SKILL')}</div>
 ${compactSummaryHtml}
 <div class="b32-action-detail-buttons">
 <button type="button" class="b32-action-detail-btn confirm${confirmDisabledCls}" ${confirmDisabledAttr} onclick="_b32ConfirmSkill('${ally._uid}','${selectedSkill.id}')">${canConfirmSkill ? '決定' : '確認のみ'}</button>
 <button type="button" class="b32-action-detail-btn cancel" onclick="_b32CancelSkillDetail(event)">キャンセル</button>
 </div>
 </div>
 `;
 return;
 }

 // 通常スキル選択画面
 _hideActionDetailPortal();
 const normalSkillChips = [];
 ally.skills
 .filter(skill => !skill.isUltimate)
 .slice(0, 3)
 .forEach(skill => {
 const shinki = skill.shinkiCost || 0;
 const linkCost = _getSkillLinkCostForUnit(bs, ally._uid, skill);
 const canUseThisSkill = _canUseSkillNow(bs, ally, skill);
 const unusableCls = canUseThisSkill ? '' : ' is-unusable';
 normalSkillChips.push(
 `<button type="button" class="b32-bottom-skill-btn${unusableCls}" ${canUseThisSkill ? '' : 'aria-disabled="true"'} onclick="_b32OnSkillChipClick(event,'${ally._uid}','${skill.id}')"><span>${skill.name}</span><small>LINK ${linkCost}</small></button>`
 );
 });
 while (normalSkillChips.length < 3) {
 normalSkillChips.push(`<button type="button" class="b32-bottom-skill-btn disabled" disabled>—</button>`);
 }

 const img = ally.panelImg || ally.panel || ally.battleImg || ally.img || ally.portrait || ally.upImg || '';
 const hpPctBottom = ally.hpMax > 0 ? Math.max(0, Math.round((ally.hp / ally.hpMax) * 100)) : 0;
 const hpBarColorBottom = hpPctBottom > 50 ? '#5ad48a' : hpPctBottom > 25 ? '#e8c87a' : '#d07878';
 const animaHtml = `
 <div class="b32-party-hp-bar-wrap" style="width:100%;margin:2px 0">
 <div class="b32-party-hp-bar" style="width:${hpPctBottom}%;background:${hpBarColorBottom}"></div>
 </div>
 <div class="b32-party-hp-text" style="font-size:9px">${ally.hp}<span class="b32-party-hp-max"> /${ally.hpMax}</span></div>
 `;
 const shinkiHtml = Array.from({ length: ally.shinkiMax || 3 }, (_, i) =>
 `<span class="b32-party-shinki-dot ${i < (ally.shinki || 0) ? 'filled' : ''}"></span>`
 ).join('');

 listEl.innerHTML = `
 ${floatingButtonsHtml}
 <div class="b32-action-skill-panel">
 <div class="b32-action-char-card" data-uid="${ally._uid}">
 <div class="b32-action-char-img-wrap">
 ${img ? `<img class="b32-action-char-img" src="${img}" alt="" onerror="this.style.display='none'">` : `<div class="b32-party-initial">${initial(ally.name)}</div>`}
 </div>
 <div class="b32-action-char-dots hp">${animaHtml}</div>
 <div class="b32-action-char-dots shinki">${shinkiHtml}</div>
 </div>
 <div class="b32-action-skill-buttons">${normalSkillChips.join('')}</div>
 </div>
 `;

} else {
  // ── キャラ選択待ち（移動 / スキル どちらでも選択可） ──
  _hideActionDetailPortal();
  if (bs.isRoguelite) {
    if (rosterPanelEl) rosterPanelEl.style.setProperty('display', 'flex', 'important');
    if (itemPanelEl) itemPanelEl.style.setProperty('display', 'flex', 'important');
  }

  // ローグライト通常待機時の案内文は表示しない（盤面視認性を優先）。
  const guideText = bs.isRoguelite
    ? ''
    : '行動するキャラを選択してください。';

 if (guideEl) guideEl.textContent = guideText;

 // 3人分のキャラカードを必ず表示（通常バトルのみ）
 if (!bs.isRoguelite) {
   const partyStatusEl = document.getElementById('b32-party-status');
   if (partyStatusEl) partyStatusEl.style.removeProperty('display');
 }

 const charaNameEl = document.getElementById('b32-skill-chara-name');
 if (charaNameEl) charaNameEl.textContent = '';

const listEl = document.getElementById('b32-skill-list');

if (listEl) {
  if (bs.isRoguelite && _selectedRosterId) {
    const r = (bs.roster || []).find(x => x.rosterId === _selectedRosterId);

    if (r) {
      const c = r.charDef || {};
      const img = c.panelImg || c.upImg || c.img || '';
      const cost = _getSummonLinkCostForRoster(bs, r);

      const hp = c.hp || c.stats?.HP || 0;
      const atk = c.atk || c.stats?.ATK || 0;
      const role = c.role || '—';

      const skillDetailsHtml = b32BuildRosterSkillDetailsHtml(c, r.unit || c);

      const statusLabel =
        r.status === 'standby' ? '召喚可能' :
        r.status === 'deployed' ? '出撃中' :
        r.status === 'dead' ? 'RETURN' :
        r.status || '—';

      listEl.innerHTML = `
  <div class="b32-roster-info-panel">
    <button
      type="button"
      class="b32-roster-info-close"
      onclick="_b32CloseRosterInfo(event)"
      onpointerdown="_b32CloseRosterInfo(event)"
      ontouchstart="_b32CloseRosterInfo(event)"
      aria-label="閉じる"
    >×</button>

    <div class="b32-roster-info-card">
      <div class="b32-roster-info-img-wrap">
        ${img
          ? `<img class="b32-roster-info-img" src="${img}" alt="" onerror="this.style.display='none'">`
          : `<div class="b32-roster-info-initial">${initial(r.name)}</div>`
        }
      </div>
    </div>

    <div class="b32-roster-info-main">
      <div class="b32-roster-info-title">
  <span class="name">${r.name || c.name || 'UNKNOWN'}</span>
</div>
      <div class="b32-roster-info-role">
        ${role}　/　HP ${hp}　ATK ${atk}
      </div>

      ${skillDetailsHtml}

      <div class="b32-roster-info-status">
        ${statusLabel}
      </div>
    </div>
  </div>
`;
    } else {
      listEl.innerHTML = '';
    }
  } else {
    listEl.innerHTML = '';
  }
}
}

} else if (bs.phase === 'enemy') {
 skillPanel.style.display = 'none';
 if (guideEl) guideEl.textContent = '敵の行動中です。';
 // 敵ターン中はパーティカードを表示（演出位置取得に必要）
 const partyStatusEnemyTurn = document.getElementById('b32-party-status');
 if (partyStatusEnemyTurn) partyStatusEnemyTurn.style.removeProperty('display');
} else {
 skillPanel.style.display = 'none';
 if (guideEl) guideEl.textContent = '';
}
 }

 // ============================================================
 // ヒントバー
 // ============================================================
 function renderHintBar(bs) {
 const bar = document.getElementById('b32-hint-bar');
 if (!bar) return;

 bar.className = 'b32-hint-bar';

 if (bs.phase === 'skill') {
 if (_moveMode && _selMoveAllyUid) {
 // Phase2: 移動先選択中
 const ally = bs.allies.find(u => u._uid === _selMoveAllyUid);
 bar.textContent = ally ? `${ally.name} を移動` : '';
 bar.className = 'skill-hint';
 } else if (_selSkillAllyUid) {
 // Phase4: スキルキャラ選択済み
 const ally = bs.allies.find(u => u._uid === _selSkillAllyUid);
 bar.textContent = ally ? `${ally.name} のスキルを選択` : '';
 bar.className = 'skill-hint';
 } else {
 bar.textContent = '';
 bar.className = '';
 }
 } else {
 bar.textContent = '';
 bar.className = '';
 }
 }

 // ============================================================
 // ヘッダー・ボタン
 // ============================================================
 function renderHeader(bs) {
 // 旧要素（非表示だが念のため更新）
 const turnNumOld = document.getElementById('b32-turn-num');
 if (turnNumOld) turnNumOld.textContent = bs.turn;

 // 新ヘッダー要素
 const battleTitle = document.getElementById('b32-battle-title');
 const stageIdEl = document.getElementById('b32-stage-id');
 const turnNumLarge = document.getElementById('b32-turn-num-large');
 const turnMaxEl = document.getElementById('b32-turn-max');
 const phaseBadge = document.getElementById('b32-phase-badge');

 if (stageIdEl) stageIdEl.textContent = bs.stageId || '01';
 if (turnNumLarge) turnNumLarge.textContent = bs.turn || 1;

 // ターン制限廃止：ヘッダーは現在ターンのみ表示する。
 const turnSlashEl = document.getElementById('b32-turn-slash');
 if (turnSlashEl) turnSlashEl.style.display = 'none';
 if (turnMaxEl) {
   turnMaxEl.textContent = '';
   turnMaxEl.style.display = 'none';
 }

 // フェーズバッジ：文字だけ残して色付けを最小限に
 if (phaseBadge) {
 const label = PHASE_LABEL[bs.phase] || bs.phase;
 // フェーズラベルは非表示（デザイン上不要）にするが残す
 // phaseBadge の中に #b32-turn-center があるので書き換えない
 }
 }

 function renderCoreStatus(bs) {
 // コア概念・ターン制限廃止：下部の残TURN表示は使わない
 const subEl = document.getElementById('b32-bottom-sub');
 if (subEl) subEl.textContent = '';
}

 function renderBossHp(bs) {
 const box = document.getElementById('b32-boss-hp-ui');
 const nameEl = document.getElementById('b32-boss-hp-name');
 const barEl = document.getElementById('b32-boss-hp-bar');
 const textEl = document.getElementById('b32-boss-hp-text');

 if (!box || !nameEl || !barEl || !textEl) return;

 const boss = (bs.enemies || []).find(e => e.isBoss && e.hp > 0);

 if (!boss) {
 box.style.display = 'none';
 return;
 }

 const hpMax = boss.hpMax || boss.hp || 1;
 const hpPct = Math.max(0, Math.min(100, Math.round((boss.hp / hpMax) * 100)));

 box.style.display = 'block';
 nameEl.textContent = boss.name || 'BOSS';
 textEl.textContent = `${boss.hp.toLocaleString()} / ${hpMax.toLocaleString()}`;
 barEl.style.width = hpPct + '%';
 }

 function renderButtons(bs) {
 const summonBtn = document.getElementById('b32-btn-summon');
 const moveBtn   = document.getElementById('b32-btn-move');
 const skillBtn  = document.getElementById('b32-btn-skill');
 const ultBtn    = document.getElementById('b32-btn-ult');
 const endBtn    = document.getElementById('b32-btn-end-skill');
 const summonSubEl  = document.getElementById('b32-btn-summon-sub');

 const inSkillPhase = !!bs && bs.phase === 'skill' && !bs.result;

 const selectedUid =
   _selActionAllyUid ||
   _selSkillAllyUid ||
   _selMoveAllyUid ||
   null;

 const selectedAlly = selectedUid
   ? (bs.allies || []).find(a => a._uid === selectedUid)
   : null;

 const unitCanAct = !!selectedAlly
   && selectedAlly.hp > 0
   && _unitCanAct(bs, selectedAlly._uid);

 const canMove  = inSkillPhase && !!selectedAlly && selectedAlly.hp > 0 && _unitCanMoveNow(bs, selectedAlly._uid) && _canActByLink(bs, 1);
 const normalSkillsForCost = selectedAlly ? (selectedAlly.skills || []).filter(s => !s.isUltimate) : [];
 // スキル/ULTボタンは「確認用」として行動済みでも開ける。
 // 発動可否はスキル詳細の決定ボタンで止める。
 const canSkill = inSkillPhase && !!selectedAlly && selectedAlly.hp > 0 && normalSkillsForCost.length > 0;

 let canUlt = false;
 if (selectedAlly) {
   const ultSkill = (selectedAlly.skills || []).find(s => s.isUltimate);
   canUlt = inSkillPhase && selectedAlly.hp > 0 && !!ultSkill;
 }

 // 召喚可否
 let canSummon = false;
 let summonSubText = '待機選択';

 if (bs && bs.isRoguelite) {
   const roster = bs.roster || [];
   const standby = roster.filter(r => r.status === 'standby');

   if (_summonRosterId) {
     const selectedRoster = roster.find(r => r.rosterId === _summonRosterId);
     if (selectedRoster) {
       const cost = _getSummonLinkCostForRoster(bs, selectedRoster);
       summonSubText = _summonMode ? '位置選択中' : '召喚可能';
       canSummon = inSkillPhase && _canActByLink(bs, cost);
     }
   } else if (standby.length > 0) {
     const affordable = standby.some(r => _canActByLink(bs, _getSummonLinkCostForRoster(bs, r)));
     summonSubText = '待機選択';
     canSummon = inSkillPhase && affordable;
   } else {
     summonSubText = '待機なし';
   }
 } else {
   summonSubText = 'ROGUE';
 }

 if (summonSubEl) summonSubEl.textContent = summonSubText;

 function setBtn(btn, enabled, active) {
   if (!btn) return;
   btn.disabled = !enabled;
   btn.classList.toggle('is-active', !!active);
 }

 setBtn(summonBtn, canSummon, _summonMode);
 setBtn(moveBtn,   canMove,   _moveMode);
 setBtn(skillBtn,  canSkill,  !!(_selSkillAllyUid && !_selSkillId));
 setBtn(ultBtn,    canUlt,    !!(_selSkillAllyUid && _selSkillId));
 setBtn(endBtn,    inSkillPhase, false);
 }

 // ============================================================
 // ログ
 // ============================================================
 function renderLog(bs) {
 const logEl = document.getElementById('b32-log');
 if (!logEl || !bs.log) return;
 const lines = [...bs.log].reverse().slice(0, 30);
 logEl.innerHTML = lines.map(l => `<span class="log-line">${l}</span>`).join('');
 }

 // ============================================================
 // 結果オーバーレイ
 // ============================================================
 function renderResult(bs) {
 const overlay = document.getElementById('b32-result-overlay');
 const text = document.getElementById('b32-result-text');
 if (!overlay || !text) return;

 // ローグライト中は Battle32 側の結果オーバーレイを出さない。
 // 勝敗表示・報酬選択・次戦遷移は RogueliteController が担当する。
 if (bs.isRoguelite) {
 overlay.style.display = 'none';
 return;
 }

 if (bs.result === 'win') {
 text.textContent = 'VICTORY'; text.className = 'win';
 overlay.style.display = 'flex';
 // 通常ステージのみ「マップへ戻る」ボタンを有効化
 const btn = document.getElementById('b32-result-back-btn');
 if (btn && !btn._b32Bound) {
 btn._b32Bound = true;
 btn.addEventListener('click', () => window.closeBattle32UI());
 }
 if (btn) btn.style.display = '';
 } else if (bs.result === 'lose') {
 text.textContent = 'DEFEAT'; text.className = 'lose';
 overlay.style.display = 'flex';
 const btn = document.getElementById('b32-result-back-btn');
 if (btn && !btn._b32Bound) {
 btn._b32Bound = true;
 btn.addEventListener('click', () => window.closeBattle32UI());
 }
 if (btn) btn.style.display = '';
 } else {
 overlay.style.display = 'none';
 }
 }

// ============================================================
// 公開: renderBattle32UI()
// ============================================================
window.renderBattle32UI = function () {

  // ★ 追加：バトルUI終了後の再描画を完全に止める
  if (window.__BATTLE32_UI_ACTIVE__ === false) {
    const root = document.getElementById(ROOT_ID);
    if (root) root.style.display = 'none';

    [
      'b32-link-bar',
      'b32-roster-panel',
      'b32-item-panel',
      'b32-roster-info-close-hitbox',
      'b32-enemy-info-overlay',
      'b32-enemy-quick-info',
      'b32-action-detail-portal',
      'b32-combo-inspect'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    return;
  }

  const bs = _bs();
  if (!bs) {
    console.warn('[Battle32UI] Battle32.getState() が null。Battle32.start() を先に呼んでください。');
    return;
  }

 buildRoot();

const root = document.getElementById(ROOT_ID);
if (!root) return;

applyBattle32ViewportClass(root);

// ローグライト遷移中は、古いBATTLE END画面を再表示しない
  if (
    window.__ROGUELITE_TRANSITIONING__ &&
    bs.isRoguelite &&
    (bs.result || bs.phase === 'end')
  ) {
    if (root) root.style.display = 'none';

    // ★ ここにも保険で追加してOK
    ['b32-link-bar', 'b32-roster-panel', 'b32-item-panel'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    return;
  }

  if (root) {
    root.style.display = 'flex';
    delete root.dataset.rlHidden;
  }

  // ローグライト進捗バーは battle32-root の通常フローに差し込む。
  // RogueliteController.startRun() は Battle32 DOM 生成前にも呼ばれるため、
  // renderBattle32UI() 側からも毎回同期して表示漏れを防ぐ。
  if (bs.isRoguelite && window.RogueliteController && typeof window.RogueliteController._updateHud === 'function') {
    window.RogueliteController._updateHud();
  } else if (window.RogueliteController && typeof window.RogueliteController._hideHud === 'function') {
    window.RogueliteController._hideHud();
  }

  renderHeader(bs);
  renderHintBar(bs);
  renderBossHp(bs);
  renderBoard(bs);

  if (bs.isRoguelite) {
    renderLinkBar(bs);
    renderRoster(bs);
    renderItemPanel(bs);
  } else {
    renderPartyStatus(bs);
  }

  renderLog(bs);
  renderBottomArea(bs);
  renderButtons(bs);
  renderActionMenu(bs);
  renderComboInspect(bs);
  renderResult(bs);
  renderBattleMenu(bs);

  requestAnimationFrame(() => {
    fitBattle32Layout();
    _syncRosterInfoCloseHitbox();
  });
};

function applyBattle32ViewportClass(root) {
  if (!root) return;

  const w = window.innerWidth || document.documentElement.clientWidth || 0;
  // screen.height は物理画面高さ（アドレスバーの影響を受けない）
  // innerHeight はSafariでアドレスバー展開中に小さくなるため使わない
  const sh = window.screen ? window.screen.height : 0;

  root.classList.remove('b32-vp-se', 'b32-vp-iphone14');

  // SE系：物理画面が低い端末（SE第3世代 = 667pt）
  if (w <= 390 && sh <= 700) {
    root.classList.add('b32-vp-se');
    return;
  }

  // iPhone14系以上：幅430以下の通常スマホ
  if (w <= 430) {
    root.classList.add('b32-vp-iphone14');
  }
}

 // ============================================================
 // LINK バー描画（ローグライト専用）
 // ============================================================
 function renderLinkBar(bs) {
  let el = document.getElementById('b32-link-bar');

  if (
    window.__BATTLE32_UI_ACTIVE__ === false ||
    !bs ||
    !bs.link ||
    !bs.isRoguelite ||
    bs.result
  ) {
    if (el) el.remove();
    return;
  }

   if (!el) {
     el = document.createElement('div');
     el.id = 'b32-link-bar';
     el.style.cssText = [
  'position:fixed',
  // 右側、アイテム置き場の少し上あたり
  'right:10px',
  'top:calc(env(safe-area-inset-top, 0px) + 150px)',
  'z-index:3000000',

  // 縦レイアウト（位置は既存維持。見た目だけ白UI用へ）
  'display:flex',
  'flex-direction:column',
  'align-items:center',
  'justify-content:flex-start',
  'gap:2px',

  // 表示幅だけLINK表記に合わせる
  'width:34px',
  'padding:0',
  'box-sizing:border-box',

  // 外側は透明。白いピルは内側要素で描画する
  'background:transparent',
  'border:0',
  'border-radius:0',
  'box-shadow:none',

  'pointer-events:none',
].join(';');

     document.body.appendChild(el);
   }
   el.style.display = 'flex';

   const { current, max } = bs.link;
   const linkCurrent = Number(current || 0);
   const linkMax = Number(max || 6);
   const diamonds = Array.from({ length: linkMax }, (_, i) => {
  const filled = i < linkCurrent;
  return `<div class="b32-link-diamond ${filled ? 'filled' : 'empty'}"></div>`;
}).join('');

   el.innerHTML = `
  <div class="b32-link-label">LINK</div>
  <div class="b32-link-count">${linkCurrent}<span>/</span>${linkMax}</div>
  <div class="b32-link-pill">
    ${diamonds}
  </div>
`;
 }

 // ============================================================
 // roster 5体表示（ローグライト専用）
 // ============================================================
 function renderRoster(bs) {
  let el = document.getElementById('b32-roster-panel');

  if (
    window.__BATTLE32_UI_ACTIVE__ === false ||
    !bs ||
    !bs.isRoguelite ||
    bs.result
  ) {
    if (el) el.remove();
    return;
  }

   if (!el) {
     el = document.createElement('div');
     el.id = 'b32-roster-panel';
    el.style.cssText = [
  'position:fixed',
  'bottom:calc(124px + env(safe-area-inset-bottom, 0px))',
  'left:50%',
  'right:auto',
  'transform:translateX(-50%)',
  'width:min(calc(100vw - 16px), 420px)',
  'z-index:3000000',
  'display:flex',
  'justify-content:space-between',
  'align-items:center',
  'gap:5px',
  'padding:0',
  'background:transparent',
  'border-top:none',
  'overflow:visible',
  '-webkit-overflow-scrolling:touch',
].join(';');

     document.body.appendChild(el);
   }
   el.style.display = 'flex';

      el.innerHTML = bs.roster.map(r => {
     const isStandby = r.status === 'standby';
     const isDeployed = r.status === 'deployed';
     const isDead = r.status === 'dead';
     const linkCost = _getSummonLinkCostForRoster(bs, r);
     const canSummon = isStandby && (bs.link && bs.link.current >= linkCost) && bs.phase === 'skill' && !bs.result;
    const isActionSelected =
  isDeployed &&
  r.deployedUid &&
  (
    _selActionAllyUid === r.deployedUid ||
    _selMoveAllyUid === r.deployedUid ||
    _selSkillAllyUid === r.deployedUid
  );

const isSummonSelected =
  isActionSelected ||
  (_summonMode && _summonRosterId === r.rosterId) ||
  (!_summonMode && _selectedRosterId === r.rosterId) ||
  (_itemMode && r.deployedUid && _itemTargetUid === r.deployedUid);

     let statusLabel = '';
     let statusColor = '';
     if (isDeployed) { statusLabel = '出撃中'; statusColor = 'rgba(80,200,120,.8)'; }
     else if (isDead) { statusLabel = 'RETURN'; statusColor = 'rgba(200,80,80,.6)'; }
     else { statusLabel = `LINK ${linkCost}`; statusColor = 'rgba(140,110,255,.8)'; }

     const img = r.charDef && (r.charDef.panelImg || r.charDef.upImg || r.charDef.img || '');
     const element = r.charDef && r.charDef.element;
     const elementIcon = unitElementIcon(element);
     const elementLabel = unitElementLabel(element);
     const elementClass = unitElementClass(element);

     // HP表示：deployed は実測HP、standby は最大HP/最大HP、dead は0/最大HP
     let hpBarHtml = '';
     let hpTextHtml = '';
     const hpMax = (r.charDef && Number(r.charDef.hp)) || 0;

// ULTゲージ表示：deployed は実測shinki、standby/dead は0扱い
let ultGaugeHtml = '';
{
  let shinkiCurrent = 0;
  let shinkiMax = Number(r.charDef?.shinkiMax || 0);

  if (isDeployed && r.deployedUid) {
    const deployedUnit = (bs.allies || []).find(a => a._uid === r.deployedUid);
    if (deployedUnit) {
      shinkiCurrent = Math.max(0, Number(deployedUnit.shinki || 0));
      shinkiMax = Math.max(shinkiMax, Number(deployedUnit.shinkiMax || 0));
    }
  }

  if (shinkiMax > 0) {
    const dots = Array.from({ length: shinkiMax }, (_, i) =>
      `<span class="b32-roster-ult-dot${i < shinkiCurrent ? ' filled' : ''}"></span>`
    ).join('');

    ultGaugeHtml = `
      <div class="b32-roster-ult-row" aria-label="ULT ${shinkiCurrent}/${shinkiMax}">
        ${dots}
      </div>
    `;
  }
}

     if (hpMax > 0) {
       let hpCurrent = hpMax;
       let hpTextClass = 'standby';
       let hpTextStr = `${hpMax}/${hpMax}`;

       if (isDeployed && r.deployedUid) {
         const deployedUnit = (bs.allies || []).find(a => a._uid === r.deployedUid);
         if (deployedUnit) {
           hpCurrent = Math.max(0, Number(deployedUnit.hp) || 0);
           hpTextStr = `${hpCurrent}/${hpMax}`;
           hpTextClass = '';
         }
       } else if (isDead) {
         hpCurrent = 0;
         hpTextStr = `0/${hpMax}`;
         hpTextClass = 'dead';
       }

       const hpPct = Math.max(0, Math.min(100, Math.round((hpCurrent / hpMax) * 100)));
       hpTextHtml = `<div class="b32-roster-hp-text ${hpTextClass}">${hpTextStr}</div>`;
       hpBarHtml = `<div class="b32-roster-hp-bar-wrap"><div class="b32-roster-hp-bar" style="width:${hpPct}%"></div></div>`;
     }

     const isItemTargetCard = !!(
       isDeployed &&
       r.deployedUid &&
       b32IsAllyItemTargetMode(bs)
     );
     const rosterClick = isItemTargetCard
       ? `_b32OnItemAllyTap('${r.deployedUid}')`
       : `_b32OnRosterTap('${r.rosterId}')`;

     return `<div class="b32-roster-card"
       data-roster-id="${r.rosterId}"
       data-deployed-uid="${r.deployedUid || ''}"
       onclick="${rosterClick}"
       style="
         flex:0 0 82px;width:82px;min-width:82px;max-width:82px;
         display:flex;flex-direction:column;align-items:center;gap:2px;
         cursor:${(canSummon || isDeployed || isItemTargetCard) ? 'pointer' : 'default'};
         border-radius:0;padding:4px 2px;
         border:1.5px solid ${isSummonSelected ? 'rgba(140,100,255,.9)' : isStandby ? 'rgba(100,80,200,.4)' : 'rgba(60,50,100,.3)'};
         background:${isSummonSelected ? 'rgba(80,40,180,.3)' : 'rgba(20,15,40,.6)'};
         opacity:${isDead ? '0.4' : '1'};
         transition:border-color .15s,background .15s;
         box-shadow:${isSummonSelected ? '0 0 12px rgba(120,80,255,.5)' : 'none'};
       ">
       <div class="b32-roster-img-wrap">
         ${elementIcon ? `<img class="b32-roster-element-icon b32-roster-element-icon-${elementClass}" src="${elementIcon}" alt="${elementLabel}" title="${elementLabel}" onerror="this.style.display='none'">` : ''}
         ${img ? `<img class="b32-roster-img" src="${img}" onerror="this.style.display='none'">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:14px;color:rgba(200,180,255,.5);">${(r.name||'?')[0]}</div>`}
       </div>
       <div style="font-size:8px;color:rgba(220,210,255,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;text-align:center;">${r.name}</div>
       <div style="font-size:8px;color:${statusColor};letter-spacing:.5px;">${statusLabel}</div>
       ${hpTextHtml}
       ${hpBarHtml}
       ${ultGaugeHtml}

     </div>`;
   }).join('');

 }

// ============================================================
// アイテム2枠パネル（ローグライト専用）
// ============================================================
function _getRogueliteItemIcon(item) {
  if (!item) return '📦';
  if (item.type === 'heal') return '💊';
  if (item.type === 'move_ally') return '🌀';
  if (item.type === 'swap_ally') return '🔄';
  if (item.type === 'swap_enemy') return '🌀';
  if (item.type === 'link_recover') return '🔗';
  if (item.type === 'shinki_max') return '🔥';
  if (item.type === 'enemy_hp_cut_all') return '☄️';
  if (item.type === 'guard') return '🛡️';
  if (item.type === 'stun_enemy') return '⚡';
  return '📦';
}

function renderItemPanel(bs) {
  let el = document.getElementById('b32-item-panel');

  // ★追加：バトルUIが終了済み、またはローグライト外、または戦闘終了済みなら作らない/消す
  if (
    window.__BATTLE32_UI_ACTIVE__ === false ||
    !bs ||
    !bs.isRoguelite ||
    bs.result
  ) {
    if (el) el.remove();
    return;
  }

  const items = bs.items || [];

  // アイテム未所持ならパネル自体を出さない。
  // 空スロットだけの固定UIが、iPhone14系で召喚/移動マス選択を邪魔していたため。
  if (!items.some(Boolean)) {
    if (el) el.remove();
    return;
  }

  // ★ここから下で初めて作る
  if (!el) {
    el = document.createElement('div');
    el.id = 'b32-item-panel';
    document.body.appendChild(el);
  }

  const root = document.getElementById(ROOT_ID);
  const isPhoneNarrow = !!(root && (root.classList.contains('b32-vp-iphone14') || root.classList.contains('b32-vp-se')));

  // body直下のfixed UIなので、CSSの親セレクタに頼らずJSで配置を同期する。
  // iPhone14系では「グリッド → item → キャラパネル」の順に見えるよう、
  // ロスター直上に横置きする。詳細なbottom値は _positionItemPanel() で実測補正。
  el.style.cssText = [
    'position:fixed',
    isPhoneNarrow ? 'left:50%' : 'right:8px',
    isPhoneNarrow ? 'right:auto' : 'left:auto',
    isPhoneNarrow ? 'transform:translateX(-50%)' : 'transform:none',
    isPhoneNarrow
      ? 'bottom:calc(var(--b32-actions-h, 74px) + 96px + 10px + env(safe-area-inset-bottom, 0px))'
      : 'bottom:calc(270px + env(safe-area-inset-bottom, 0px))',
    'z-index:3000001',
    'display:flex',
    isPhoneNarrow ? 'flex-direction:row' : 'flex-direction:column',
    'gap:4px',
    'pointer-events:none',
  ].join(';');

  requestAnimationFrame(_positionItemPanel);

  const slots = [0, 1].map(i => {
    const item = items[i];
    if (!item) {
      return `<div style="
        width:52px;height:52px;border-radius:0;
        pointer-events:none;
        border:1px dashed rgba(100,80,200,.25);
        background:rgba(20,15,40,.4);
        display:flex;align-items:center;justify-content:center;
        font-size:10px;color:rgba(100,80,160,.35);
      ">—</div>`;
    }

    const linkCost = item.linkCost != null ? item.linkCost : 1;
    const canUse = bs.phase === 'skill' && !bs.result && bs.link && bs.link.current >= linkCost && !item.used;
    const isActive = _itemMode && _itemSlotIndex === i;

    return `<div onclick="${canUse ? `_b32OnItemTap(${i})` : ''}" title="${item.desc || ''}" style="
      width:52px;min-height:52px;border-radius:0;padding:4px;
      pointer-events:${canUse ? 'auto' : 'none'};
      border:1.5px solid ${isActive ? 'rgba(200,160,80,.9)' : 'rgba(160,120,60,.4)'};
      background:${isActive ? 'rgba(80,60,20,.5)' : 'rgba(20,15,40,.7)'};
      opacity:${canUse ? '1' : '0.45'};
      cursor:${canUse ? 'pointer' : 'default'};
      display:flex;flex-direction:column;align-items:center;gap:2px;
      box-shadow:${isActive ? '0 0 10px rgba(200,160,80,.4)' : 'none'};
    ">
      <div style="font-size:16px;line-height:1;">${_getRogueliteItemIcon(item)}</div>
      <div style="font-size:7px;color:rgba(220,190,120,.8);text-align:center;line-height:1.2;">${item.name}</div>
      <div style="font-size:7px;color:rgba(140,110,200,.7);">L${linkCost}</div>
    </div>`;
  }).join('');

  el.innerHTML = slots;
}

 // ============================================================
 // 召喚マスのハイライト（renderBoard内で参照）
 // ============================================================
 function _getSummonCells() {
   if (!_summonMode || !_summonRosterId || !window.Battle32 || !window.Battle32.getSummonCells) return new Set();
   const cells = window.Battle32.getSummonCells(_summonRosterId);
   return new Set(cells.map(c => `${c.row}-${c.col}`));
 }

 // ============================================================
 // roster タップ
 // ============================================================
 
// ボトム「召喚」ボタン
window._b32OnBottomSummonTap = function () {
  if (_b32InputLocked) return;

  const bs = _bs();
  if (!bs || bs.result || bs.phase !== 'skill') return;
  if (!bs.isRoguelite) return;

  if (!_summonRosterId) {
    const guide = document.getElementById('b32-bottom-guide');
    if (guide) guide.textContent = '召喚する待機メンバーを選択してください。';
    return;
  }

  const roster = bs.roster || [];
  const r = roster.find(x => x.rosterId === _summonRosterId);
  if (!r || r.status !== 'standby') {
    const guide = document.getElementById('b32-bottom-guide');
    if (guide) guide.textContent = 'このキャラは召喚できません。';
    return;
  }

  const cost = _getSummonLinkCostForRoster(bs, r);
  if (!_canActByLink(bs, cost)) {
    const guide = document.getElementById('b32-bottom-guide');
    if (guide) guide.textContent = 'LINKが不足しています。';
    return;
  }

  // 他モード解除
  _selActionAllyUid = null;
  _selMoveAllyUid = null;
  _selSkillAllyUid = null;
  _selSkillId = null;
  _moveMode = false;

  _itemMode = false;
  _itemSlotIndex = null;
  _itemPhase = null;
  _itemTargetUid = null;

  // 召喚ボタンを押した時点でキャラ詳細は閉じる。
  // ここで _selectedRosterId を残すと、召喚完了後の再描画で詳細が再表示される。
  _selectedRosterId = null;
  const hitbox = document.getElementById('b32-roster-info-close-hitbox');
  if (hitbox && hitbox.parentNode) hitbox.parentNode.removeChild(hitbox);

  // 召喚位置選択へ
  _summonMode = true;

  const guide = document.getElementById('b32-bottom-guide');
  if (guide) guide.textContent = '召喚位置を選択してください。';

  renderBattle32UI();
};

window._b32OnRosterTap = function(rosterId) {
  if (_b32InputLocked) return;

  const bs = _bs();
  if (!bs || !bs.isRoguelite) return;

  const roster = bs.roster || [];
  const r = roster.find(x => x.rosterId === rosterId);
  if (!r) return;

  // 出撃中キャラなら、盤面上の味方タップと同じ扱いにする。
  // ただしアイテムの味方対象選択中は、キャラパネルタップをアイテム使用に優先ルーティングする。
  if (r.status === 'deployed' && r.deployedUid) {
    if (b32IsAllyItemTargetMode(bs)) {
      if (typeof window._b32OnItemAllyTap === 'function') {
        window._b32OnItemAllyTap(r.deployedUid);
      }
      return;
    }

    _selectedRosterId = rosterId;
    _summonRosterId = null;
    _summonMode = false;

    _itemMode = false;
    _itemSlotIndex = null;
    _itemPhase = null;
    _itemTargetUid = null;

    if (typeof window._b32OnSkillAllyTap === 'function') {
      window._b32OnSkillAllyTap(r.deployedUid);
    } else {
      renderBattle32UI();
    }
    return;
  }

  // 待機中・死亡中は従来通り、情報表示／召喚候補選択
  _selectedRosterId = rosterId;
  _summonRosterId = rosterId;

  // ただし即召喚モードには入らない
  _summonMode = false;

  // 他モードは解除
  _selActionAllyUid = null;
  _selMoveAllyUid = null;
  _selSkillAllyUid = null;
  _selSkillId = null;
  _moveMode = false;

  _itemMode = false;
  _itemSlotIndex = null;
  _itemPhase = null;
  _itemTargetUid = null;

  renderBattle32UI();
};

function _closeRosterInfoHard(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
  }

  _selectedRosterId = null;

  const hitbox = document.getElementById('b32-roster-info-close-hitbox');
  if (hitbox && hitbox.parentNode) hitbox.parentNode.removeChild(hitbox);

  renderBattle32UI();
}

window._b32CloseRosterInfo = _closeRosterInfoHard;

function _syncRosterInfoCloseHitbox() {
  let hitbox = document.getElementById('b32-roster-info-close-hitbox');
  const panel = document.querySelector('#battle32-root .b32-roster-info-panel');

  if (!_selectedRosterId || !panel) {
    if (hitbox && hitbox.parentNode) hitbox.parentNode.removeChild(hitbox);
    return;
  }

  if (!hitbox) {
    hitbox = document.createElement('button');
    hitbox.id = 'b32-roster-info-close-hitbox';
    hitbox.type = 'button';
    hitbox.textContent = '×';
    hitbox.setAttribute('aria-label', '閉じる');

    ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(type => {
      hitbox.addEventListener(type, _closeRosterInfoHard, { capture: true, passive: false });
    });

    document.body.appendChild(hitbox);
  }

  const r = panel.getBoundingClientRect();
  const size = 34;
  const left = Math.max(6, Math.min(window.innerWidth - size - 6, r.right - size - 6));
  const top = Math.max(6, Math.min(window.innerHeight - size - 6, r.top + 6));

  hitbox.style.cssText = [
    'position:fixed',
    `left:${left}px`,
    `top:${top}px`,
    `width:${size}px`,
    `height:${size}px`,
    'z-index:2147483647',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'border-radius:999px',
    'border:1px solid rgba(255,255,255,.26)',
    'background:rgba(0,0,0,.78)',
    'color:rgba(232,228,220,.98)',
    'font-size:21px',
    'line-height:1',
    "font-family:'Cinzel',serif",
    'cursor:pointer',
    'pointer-events:auto',
    'touch-action:manipulation',
    '-webkit-tap-highlight-color:transparent',
    'box-shadow:0 0 12px rgba(0,0,0,.65)'
  ].join(';');
}

// インライン onclick が届かない端末・重なり順でも拾うため、capture で保険をかける
if (!window.__b32RosterCloseCaptureBound) {
  window.__b32RosterCloseCaptureBound = true;
  ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(type => {
    document.addEventListener(type, function(e) {
      const t = e.target;
      if (t && t.closest && t.closest('.b32-roster-info-close, #b32-roster-info-close-hitbox')) {
        _closeRosterInfoHard(e);
      }
    }, { capture: true, passive: false });
  });
}

 // 召喚マスタップ
 window._b32OnSummonCellTap = async function(row, col) {
   if (_b32InputLocked) return;
   if (!_summonMode || !_summonRosterId) return;
   if (!window.Battle32 || !window.Battle32.summonAlly) return;

   const ok = window.Battle32.summonAlly(_summonRosterId, row, col);
   if (ok) {
     _summonMode = false;
     _summonRosterId = null;

     // 召喚完了後は盤面確認を優先する。
     // 召喚前に選んでいた待機キャラの詳細を再表示しない。
     _selectedRosterId = null;
     const hitbox = document.getElementById('b32-roster-info-close-hitbox');
     if (hitbox && hitbox.parentNode) hitbox.parentNode.removeChild(hitbox);
   }
   renderBattle32UI();
 };

 // アイテムタップ
 window._b32OnItemTap = function(slotIndex) {
   if (_b32InputLocked) return;
   const bs = _bs();
   if (!bs || !bs.items) return;
   const item = bs.items[slotIndex];
   if (!item) return;

   if (_itemMode && _itemSlotIndex === slotIndex) {
     // 同じアイテムを再タップ → 解除
     _itemMode = false;
     _itemSlotIndex = null;
     _itemPhase = null;
     _itemTargetUid = null;
     renderBattle32UI();
     return;
   }

   _resetSkillState();
   _itemMode = true;
   _itemSlotIndex = slotIndex;
   _itemTargetUid = null;

   if (item.target === 'instant' || item.target === 'ally_all' || item.type === 'link_recover' || item.type === 'enemy_hp_cut_all') {
     const ok = window.Battle32.useItem(_itemSlotIndex, {});
     _itemMode = false;
     _itemSlotIndex = null;
     _itemPhase = null;
     _itemTargetUid = null;
     renderBattle32UI();
     return;
   }

   _itemPhase = 'target';
   renderBattle32UI();
 };

 // アイテム対象の味方タップ
 window._b32OnItemAllyTap = function(uid) {
   if (_b32InputLocked) return;
   if (!_itemMode || _itemSlotIndex == null) return;
   const bs = _bs();
   if (!bs) return;
   const item = bs.items[_itemSlotIndex];
   if (!item) return;

   if (item.type === 'heal' || item.type === 'shinki_max' || item.type === 'guard') {
     const ok = window.Battle32.useItem(_itemSlotIndex, { targetUid: uid });
     if (ok) {
       _itemMode = false;
       _itemSlotIndex = null;
       _itemPhase = null;
       _itemTargetUid = null;
     }
     renderBattle32UI();
   } else if (item.type === 'move_ally') {
     _itemTargetUid = uid;
     _itemPhase = 'cell';
     renderBattle32UI();
   } else if (item.type === 'swap_ally') {
     if (!_itemTargetUid) {
       _itemTargetUid = uid;
       _itemPhase = 'target';
       renderBattle32UI();
       return;
     }
     const ok = window.Battle32.useItem(_itemSlotIndex, { targetAUid: _itemTargetUid, targetBUid: uid });
     if (ok) {
       _itemMode = false;
       _itemSlotIndex = null;
       _itemPhase = null;
       _itemTargetUid = null;
     }
     renderBattle32UI();
   }
 };

 // アイテム対象の敵タップ
 window._b32OnItemEnemyTap = function(uid) {
   if (_b32InputLocked) return;
   if (!_itemMode || _itemSlotIndex == null) return;
   const bs = _bs();
   if (!bs) return;
   const item = bs.items[_itemSlotIndex];
   if (!item) return;

   if (item.type === 'stun_enemy') {
     const ok = window.Battle32.useItem(_itemSlotIndex, { targetUid: uid });
     if (ok) {
       _itemMode = false;
       _itemSlotIndex = null;
       _itemPhase = null;
       _itemTargetUid = null;
     }
     renderBattle32UI();
   } else if (item.type === 'swap_enemy') {
     if (!_itemTargetUid) {
       _itemTargetUid = uid;
       _itemPhase = 'target';
       renderBattle32UI();
       return;
     }
     const ok = window.Battle32.useItem(_itemSlotIndex, { targetAUid: _itemTargetUid, targetBUid: uid });
     if (ok) {
       _itemMode = false;
       _itemSlotIndex = null;
       _itemPhase = null;
       _itemTargetUid = null;
     }
     renderBattle32UI();
   }
 };

 // 転位符: 移動先マスタップ
 window._b32OnItemCellTap = function(row, col) {
   if (_b32InputLocked) return;
   if (!_itemMode || _itemSlotIndex == null || _itemPhase !== 'cell' || !_itemTargetUid) return;
   const ok = window.Battle32.useItem(_itemSlotIndex, { targetUid: _itemTargetUid, toRow: row, toCol: col });
   if (ok) {
     _itemMode = false;
     _itemSlotIndex = null;
     _itemPhase = null;
     _itemTargetUid = null;
   }
   renderBattle32UI();
 };

 // ============================================================
 // 行動選択メニュー（円形ボタン）
 // ボタン位置はCSSで固定。状態によって表示するボタンだけを変える。
 // ============================================================
 function renderActionMenu(bs) {
 // ボトム5ボタンUIへ移行したため、旧ラジアルメニューは表示しない
 const oldMenu = document.getElementById('b32-action-radial-menu');
 if (oldMenu) oldMenu.remove();
 return;
 }

 // ============================================================
 // セルサイズ自動調整
 // ============================================================
 function fitBattle32Layout() {
 const root = document.getElementById(ROOT_ID);
 // レイアウト計算前に必ず viewport クラスを再判定する
 // Safariではアドレスバーの展開/収縮でinnerHeightが変わるため
 applyBattle32ViewportClass(root);

 const header = document.getElementById('b32-header');
 const hint = document.getElementById('b32-hint-bar');
 const actions = document.getElementById('b32-actions'); // 消していてもOKにする
 const bottom = document.getElementById('b32-bottom-area');
 const bossHp = document.getElementById('b32-boss-hp-ui');

 if (!root || !header || !bottom) return;

 const rootH = root.clientHeight;
 const rootW = root.clientWidth;
 const isSELike = root.classList.contains('b32-vp-se') || (rootW <= 390 && rootH <= 700);

 const hintVisible = hint && getComputedStyle(hint).display !== 'none';
 const hintH = hintVisible ? hint.offsetHeight : 0;

 const bossHpVisible = bossHp && getComputedStyle(bossHp).display !== 'none';
 const bossHpH = bossHpVisible ? bossHp.offsetHeight : 0;

 const rlHud = document.getElementById('rl-hud');
 const rlHudVisible = rlHud && getComputedStyle(rlHud).display !== 'none';
 const rlHudH = rlHudVisible ? rlHud.offsetHeight : 0;

 const actionsVisible = actions && getComputedStyle(actions).display !== 'none';
 // actionsH はフロー計算では 0 扱い（position:fixed になったため）
 // ただし後段の --b32-actions-h 計算で使うため別途取得する
 const actionsHFlow = 0; // fixed なのでフロー高さには含めない

 const isCompact = rootW <= 390 && rootH <= 700;
const isIphone14Like = root.classList.contains('b32-vp-iphone14');

// iPhone SE系は盤面が小さくなりすぎるため、下部UIをCSSで圧縮しつつ
// 盤面計算にも少し余裕を持たせる。14系には影響させない。
const seBoardBoostH = isSELike ? 104 : 0;
const reservedExtra = isCompact ? 0 : (isIphone14Like ? 20 : 20);

const reservedH =
 header.offsetHeight +
 rlHudH +
 hintH +
 bossHpH +
 actionsHFlow +
 bottom.offsetHeight +
 reservedExtra;

 // ローグライト時は roster + link-bar の高さも予約
 const rosterEl = document.getElementById('b32-roster-panel');
 const linkBarEl = document.getElementById('b32-link-bar');
 // style.display はインラインのみ参照するため getComputedStyle を使う
 const rosterH = (rosterEl && getComputedStyle(rosterEl).display !== 'none') ? rosterEl.offsetHeight : 0;
 const linkBarH = (linkBarEl && getComputedStyle(linkBarEl).display !== 'none') ? linkBarEl.offsetHeight : 0;

 const reservedHFinal = reservedH + rosterH + linkBarH;

 const boardAvailW = Math.max(240, rootW - 24);
 const boardAvailH = Math.max(200, rootH - reservedHFinal + seBoardBoostH);

 const gap = 3;
 const cellByW = Math.floor((boardAvailW - gap * 4) / 5);
 const cellByH = Math.floor((boardAvailH - gap * 7) / 8);

// 端末別セルサイズ。
// SE系はタップできるだけでなく、ゲーム性を保つため最低38pxを確保する。
// 赤丸で確認された「盤面下〜キャラカード上」の余白を盤面拡大に使うため、
// SEのみ上限を45pxまで引き上げる。14系には影響させない。
const minCell = isSELike ? 38 : (isCompact ? 30 : 28);
const maxCell = isSELike ? 45 : (isCompact ? 42 : (isIphone14Like ? 80 : 72));

let cellSize = Math.max(minCell, Math.min(maxCell, cellByW, cellByH));

// iPhone SE系：38〜45pxの範囲に固定。盤面の可読性を優先する。
if (isSELike) {
  cellSize = Math.max(38, Math.min(45, cellSize));
} else if (isCompact) {
  cellSize = Math.max(30, Math.min(42, cellSize));
}

// iPhone14系だけ、JS側の自動計算結果を補正する
// CSSの --cell-size 指定はここで上書きされるため、ここで直接調整する
if (isIphone14Like) {
  cellSize = Math.max(cellSize, 46);
}

root.style.setProperty('--cell-size', `${cellSize}px`);

 // ── safe-area-inset-bottom を取得 ──────────────────────────
 let safeBottom = 0;
 try {
   const probe = document.createElement('div');
   probe.style.cssText =
     'position:fixed;bottom:0;left:0;width:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden';
   document.body.appendChild(probe);
   safeBottom = probe.offsetHeight || 0;
   document.body.removeChild(probe);
 } catch (_) { safeBottom = 0; }

 // ── #b32-actions の高さを CSS変数 --b32-actions-h にセット ──
 // actions は position:fixed になったのでフロー計算に含まれない。
 // #b32-scroll の padding-bottom はこの変数で確保する（CSS側参照）。
 const actionsEl = document.getElementById('b32-actions');
 const actionsH = (actionsEl && getComputedStyle(actionsEl).display !== 'none')
   ? actionsEl.offsetHeight : 0;
 root.style.setProperty('--b32-actions-h', `${actionsH + safeBottom}px`);
 // スキル詳細は body 直下へ移動するため、CSS変数を body にも同期する
 document.body.style.setProperty('--b32-actions-h', `${actionsH + safeBottom}px`);

 // ── #b32-roster-panel の bottom を actions の上に積む ───────
 // roster-panel（ローグライト5キャラパネル）は body 直下 fixed。
 // actions の高さ + safe-area + 4px の余白で積み上げる。
 const rosterPanelEl2 = document.getElementById('b32-roster-panel');
 if (rosterPanelEl2) {
   rosterPanelEl2.style.bottom = `${actionsH + safeBottom + 4}px`;
 }

 // ── itemパネルをロスター直上へ同期 ────────────────────────
 _positionItemPanel();
 _positionActionDetailPortal();
 _positionComboInspect();

 // ── --b32-panel-h（後方互換：丸ボタン等が参照） ────────────
 const panelH = actionsH + safeBottom + 12;
 root.style.setProperty('--b32-panel-h', `${panelH}px`);
}

 window.addEventListener('resize', () => {
 requestAnimationFrame(() => {
   fitBattle32Layout();
   _syncRosterInfoCloseHitbox();
 });
 });

 // ============================================================
 // ============================================================
 // 公開: cleanupBattle32Overlays()
 // closeBattle32UI() とローグライト終了の両方から呼ぶ共通掃除関数
 // ============================================================
 window.cleanupBattle32Overlays = function (options) {

   // ★追加：バトルUIは終了済み。以後 renderBattle32UI() が呼ばれても再生成させない
   window.__BATTLE32_UI_ACTIVE__ = false;

   options = options || {};
   const restoreCommonUi = options.restoreCommonUi !== false;

   _resetSkillState();

   const root = document.getElementById(ROOT_ID);
   if (root) root.style.display = 'none';

   // body直下に生成されるローグライトUIは remove() で完全除去
[
  'b32-link-bar',
  'b32-roster-panel',
  'b32-item-panel',
  'b32-roster-info-close-hitbox',
  'b32-enemy-info-overlay',
  'b32-enemy-quick-info',
  'b32-battle-menu',
  'b32-center-text',
  'b32-combo-text',
  'b32-turn-danger-frame',
  'b32-result-overlay',
  'rl-victory-wait-layer',
  'b32-action-detail-portal',
  'b32-combo-inspect'
].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.remove();
});

   if (restoreCommonUi) {
     const nav = document.getElementById('bottom-nav-shared');
     if (nav) nav.style.display = '';

     const guf = document.getElementById('global-user-frame');
     if (guf) {
       guf.classList.remove('hidden');
       guf.style.display = '';
     }

     const explore = document.getElementById('explore-root') || document.getElementById('explore-screen');
     if (explore) explore.style.display = '';
   }
 };

 // 公開: closeBattle32UI() — cleanupBattle32Overlays の薄いラッパー
 window.closeBattle32UI = function () {
   window.cleanupBattle32Overlays({ restoreCommonUi: true });
 };

 // ============================================================
 // Battle32.start() フック
 // ============================================================
 function _hideAllScreens() {
 ['stage-select-modal','party-select-modal','enemy-intro-root','battle-root'].forEach(id => {
 const el = document.getElementById(id);
 if (el) el.style.display = 'none';
 });
 const nav = document.getElementById('bottom-nav-shared');
 if (nav) nav.style.display = 'none';
 const guf = document.getElementById('global-user-frame');
 if (guf) guf.style.display = 'none';
 }

 function hookBattle32Start() {
 if (!window.Battle32) {
 setTimeout(hookBattle32Start, 50);
 return;
 }

 if (window.Battle32._uiHooked) return;

 const originalStart = window.Battle32.start;
 window.Battle32.start = function (config, callbacks) {

  // ★追加：バトル開始。UI描画を許可する
  window.__BATTLE32_UI_ACTIVE__ = true;

  _resetSkillState();
  _hideAllScreens();

 // damage / heal コールバックを UI 演出に接続
 // UI演出と外部callbacks を両方呼ぶ（どちらかが undefined でも安全）
 const userCb = callbacks || {};
 
 const uiCallbacks = {
 ...userCb,
 damage: (data) => {
 window._b32OnDamage && window._b32OnDamage(data);
 if (typeof userCb.damage === 'function') userCb.damage(data);
 },
 heal: (data) => {
 window._b32OnHeal && window._b32OnHeal(data);
 if (typeof userCb.heal === 'function') userCb.heal(data);
 },
 statusChange: (data) => {
 window._b32OnStatusChange && window._b32OnStatusChange(data);
 if (typeof userCb.statusChange === 'function') userCb.statusChange(data);
 },
 coreDamage: (data) => {
 window._b32OnCoreDamage && window._b32OnCoreDamage(data);
 if (typeof userCb.coreDamage === 'function') userCb.coreDamage(data);
 },
 };

 // rogueliteOnBattleEnd をラップするが、ローグライト中はここでUI掃除しない。
 // ここで共通UIを復帰させると、報酬/次ステージ移管の一瞬にステージ選択画面が見えるため、
 // Battle32の盤面を残したまま RogueliteController 側の演出・遷移管理へ渡す。
 const wrappedConfig = Object.assign({}, config);
 if (typeof wrappedConfig.rogueliteOnBattleEnd === 'function') {
   const originalRogueliteEnd = wrappedConfig.rogueliteOnBattleEnd;
   wrappedConfig.rogueliteOnBattleEnd = function (payload) {
     window.__ROGUELITE_TRANSITIONING__ = true;
     originalRogueliteEnd(payload);
   };
 }

 originalStart.call(window.Battle32, wrappedConfig, uiCallbacks);
 window.renderBattle32UI();
 };

 window.Battle32._uiHooked = true;
 }

 if (document.readyState === 'loading') {
 document.addEventListener('DOMContentLoaded', hookBattle32Start);
 } else {
 hookBattle32Start();
 }

})();
