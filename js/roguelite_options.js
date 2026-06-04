// roguelite_options.js
// ローグライトラン用：強化OP（オプション）マスタ定義
// 依存: なし（単独で読み込み可能）
//
// 各OPの構造:
//   id          : 一意なキー（文字列）
//   name        : 表示名
//   desc        : 説明文
//   rarity      : 'common' | 'rare' | 'epic'
//   icon        : 絵文字アイコン
//   applyOnStart(bs) : Battle32 の _bs に開始時補正を加える関数
//   applyOnEvent(bs, event, payload) : バトル中イベント発火（省略可）
//
// ── 対象OPカテゴリ（設計整理 2025） ──
//   ✅ ATK上昇 / HP上昇 / スキルダメージ上昇 / コア耐久増加
//   ✅ 戦闘開始時神気補助 / 駒取り時神気獲得 / 位置入替権 / 霊装権
//   ❌ 移動性能を恒常的に変えるOP（霊装権を除く）
//   ❌ スキル射程・スキル構成を変えるOP
//   ❌ DEF / SPD 関連OP
//   ❌ カード関連OP
//   ※ 霊装権だけは例外として移動性能・スキル射程を変える権利を与える
//
// bs は battle_32.js 内部の _bs オブジェクト（直接変更する）
//
// ──────────────────────────────────────────────────────────────
// _bs の主なフィールド（参照先）
//   _bs.allies[]             : 味方ユニット配列  { hp, hpMax, atk, shinki, shinkiMax, ... }
//   _bs.cores.ally           : { stability, stabilityMax }
//   _bs._rl_skillDmgMult     : スキルダメージ補正倍率（ローグライト専用）
//   _bs._rl_captureSpBonus   : 駒取り時神気ボーナス（ローグライト専用）
//   _bs._rl_pendingReisouBonus: 霊装権ボーナス保持（ローグライト専用）
//   _bs._rl_swapRightCount   : 位置入替権の残回数（ローグライト専用）
// ──────────────────────────────────────────────────────────────

(function () {

const ROGUELITE_OPTIONS = [

  // ── ステータス補正：コモン ────────────────────────────────

  {
    id: 'atk_up_10',
    name: '鬼力の紋',
    desc: '味方全員のATKが10%上昇する',
    rarity: 'common',
    icon: '⚔️',
    applyOnStart(bs) {
      if (!Array.isArray(bs.allies)) return;
      bs.allies.forEach(u => {
        if (u && typeof u.atk === 'number') {
          u.atk = Math.round(u.atk * 1.10);
        }
      });
    },
  },

  {
    id: 'hp_up_15',
    name: '鋼の加護',
    desc: '味方全員の最大HPが15%上昇する',
    rarity: 'common',
    icon: '💚',
    applyOnStart(bs) {
      if (!Array.isArray(bs.allies)) return;
      bs.allies.forEach(u => {
        if (u && typeof u.hpMax === 'number') {
          const bonus = Math.round(u.hpMax * 0.15);
          u.hpMax += bonus;
          u.hp = Math.min(u.hp + bonus, u.hpMax);
        }
      });
    },
  },

  {
    id: 'core_hp_plus1',
    name: '霊脈の強化',
    desc: '自陣コアの耐久が+1される',
    rarity: 'common',
    icon: '🔮',
    applyOnStart(bs) {
      if (bs.cores && bs.cores.ally && typeof bs.cores.ally.stability === 'number') {
        bs.cores.ally.stability    += 1;
        bs.cores.ally.stabilityMax += 1;
      }
    },
  },

  // ── ダメージ補正：レア ────────────────────────────────────

  {
    id: 'skill_dmg_15',
    name: '秘術の触媒',
    desc: 'スキルダメージが15%上昇する',
    rarity: 'rare',
    icon: '✨',
    applyOnStart(bs) {
      bs._rl_skillDmgMult = (bs._rl_skillDmgMult || 1.0) * 1.15;
    },
  },

  // ── 神気ボーナス：レア ────────────────────────────────────

  {
    id: 'capture_sp_plus1',
    name: '神憑きの手',
    desc: '駒を取るたびに駒取りしたキャラの神気が+1される',
    rarity: 'rare',
    icon: '🌟',
    applyOnStart(bs) {
      bs._rl_captureSpBonus = (bs._rl_captureSpBonus || 0) + 1;
    },
    applyOnEvent(bs, event, payload) {
      if (event !== 'capture') return;
      const ally = payload && payload.ally;
      if (!ally) return;
      const liveAlly = (bs.allies || []).find(u => u._uid === ally._uid);
      if (!liveAlly) return;
      const bonus = bs._rl_captureSpBonus || 0;
      liveAlly.shinki = Math.min(liveAlly.shinkiMax, liveAlly.shinki + bonus);
    },
  },

  // ── 霊装権：エピック ─────────────────────────────────────

  {
    id: 'boss_reisou_plus1',
    name: '霊装の予兆',
    desc: 'ボス戦開始時、霊装権が+1される（霊装実装後に有効化）',
    rarity: 'epic',
    icon: '👁️',
    applyOnStart(bs) {
      bs._rl_pendingReisouBonus = (bs._rl_pendingReisouBonus || 0) + 1;
      // 霊装実装後に有効化:
      // if (bs.isBossStage && typeof bs._applyReisouBonus === 'function') {
      //   bs._applyReisouBonus(1);
      // }
    },
  },

  // ── 追加OP ────────────────────────────────────────────────

  {
    id: 'turn_limit_plus2',
    name: '時限緩和',
    desc: 'ターン制限が+2される',
    rarity: 'common',
    icon: '⏳',
    applyOnStart(bs) {
      if (typeof bs.turnLimit === 'number') {
        bs.turnLimit += 2;
      }
    },
  },

  {
    id: 'start_shinki_plus1',
    name: '神気充填',
    desc: '各ステージ開始時、味方全員の神気が+1される',
    rarity: 'rare',
    icon: '🔥',
    applyOnStart(bs) {
      if (!Array.isArray(bs.allies)) return;
      bs.allies.forEach(a => {
        if (typeof a.shinki === 'number' && typeof a.shinkiMax === 'number') {
          a.shinki = Math.min(a.shinkiMax, a.shinki + 1);
        }
      });
    },
  },

  {
    id: 'core_repair_each_stage',
    name: '自動修復陣',
    desc: '各ステージ開始時、自陣コア耐久を1回復する',
    rarity: 'rare',
    icon: '🛡️',
    applyOnStart(bs) {
      if (bs.cores && bs.cores.ally) {
        bs.cores.ally.stability = Math.min(
          bs.cores.ally.stabilityMax,
          bs.cores.ally.stability + 1,
        );
      }
    },
  },

  {
    id: 'boss_skill_dmg_20',
    name: '核穿ち',
    desc: 'ボスへのスキルダメージが20%上昇する',
    rarity: 'epic',
    icon: '☄️',
    applyOnStart(bs) {
      bs._rl_bossDmgMult = (bs._rl_bossDmgMult || 1.0) * 1.20;
    },
  },

  // ── 位置入替権：レア ──────────────────────────────────────
  // 戦闘中に味方2体の位置を1回入れ替えられる権利を付与する。
  // 実際の入替は Battle32 UI 側で _rl_swapRightCount を参照して実装する。
  {
    id: 'swap_right_1',
    name: '布陣入替',
    desc: 'ステージ中に味方2体の位置を1回入れ替えられる',
    rarity: 'rare',
    icon: '🔄',
    applyOnStart(bs) {
      bs._rl_swapRightCount = (bs._rl_swapRightCount || 0) + 1;
    },
  },

];

// ── ランダム3択生成 ─────────────────────────────────────────

function getRandomOptions(excludeIds) {
  const excl = Array.isArray(excludeIds) ? excludeIds : [];
  const pool  = ROGUELITE_OPTIONS.filter(op => !excl.includes(op.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(3, pool.length));
}

function getOptionById(id) {
  return ROGUELITE_OPTIONS.find(op => op.id === id) || null;
}

window.ROGUELITE_OPTIONS = ROGUELITE_OPTIONS;
window.getRandomOptions  = getRandomOptions;
window.getOptionById     = getOptionById;

})();
