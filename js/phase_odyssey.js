// ZERAPHIA build1643 — 位相回遊 / PHASE ODYSSEY
// 3人固定・無限階層・階層クリアごとの3択強化で進むエンドレス連覇型ローグライト。
//
// ・run状態はこのモジュールだけが所有する（通常編成・通常育成・他コンテンツの保存には触れない）。
// ・保存はユーザーID別のlocalStorage。キー名に "roguelite"/"progress" を含めているため、
//   既存のクラウド保存（player_progress.other_state.localStorage）へ自動的に同梱される。
//   → 新テーブル・RPCの追加は不要。保存のたびに既存の scheduleCloudSave() を呼ぶ。
// ・戦闘は既存シューティング基盤を流用。shooting_core.js からは window.PhaseOdyssey の
//   小さなAPI（固定編成 / プロフィール補正 / HP・ULT持ち越し / 被ダメ補正 / 結果確定）だけを参照する。
(function(){
  'use strict';

  const STORAGE_KEY = 'zeraphia_phase_odyssey_roguelite_progress_v1';
  const STAGE_PREFIX = 'shooting_phase_odyssey_';
  const PARTY_SIZE = 3;
  const BASE_CLEAR_HEAL_RATE = 0.20;   // 階層クリア時、最大HPの20%回復（戦闘不能も回復量で復帰）
  const RUN_ACTIVE = Object.freeze(['ready', 'battle', 'suspended', 'select']);

  // ------------------------------------------------------------
  // 強化（ビルド）定義。効果はrun内のみ。通常コンテンツへ持ち込まない。
  // 1つの強化 = { t:種類, v:効果量(%), q:レア度1〜3, c:条件 }。
  // 同じ種類でも「条件（属性・ショット種）」と「効果量（★1〜★3の揺らぎ）」が毎回変わる。
  // 条件は編成に合いやすいよう寄せて抽選するが、外れる（対象なし）こともある。
  // ------------------------------------------------------------
  const ICON = Object.freeze({
    attack: 'images/phase_odyssey_icon_attack.webp',
    defense: 'images/phase_odyssey_icon_barrier.webp',
    support: 'images/phase_odyssey_icon_ult.webp'
  });
  const CATEGORY_LABEL = Object.freeze({ attack:'攻撃', defense:'防御', support:'補助' });
  const ELEMENTS = Object.freeze(['fire', 'aqua', 'wood', 'light', 'dark']);
  const ELEMENT_LABEL = Object.freeze({ fire:'火', aqua:'水', wood:'木', light:'光', dark:'闇', neutral:'無' });
  // ショット種グループ（キャラの shotType をまとめたもの）
  const SHOT_GROUPS = Object.freeze({
    PARALLEL: Object.freeze(['parallel', 'piercing']),
    SPREAD:   Object.freeze(['spread', 'shotgun']),
    LASER:    Object.freeze(['laser', 'lightning']),
    HOMING:   Object.freeze(['homing', 'orbit']),
    CHARGE:   Object.freeze(['charge', 'bomb', 'cluster']),
    SPECIAL:  Object.freeze(['strike', 'trap', 'conjure'])
  });
  const SHOT_GROUP_KEYS = Object.freeze(Object.keys(SHOT_GROUPS));
  const SHOT_ALIAS = Object.freeze({ orbit_forward:'orbit', charge_release:'charge', precision:'shotgun', splash:'bomb',
    melee_slash:'strike', wolf_j_homing:'homing', rose_seed_splash:'spread', noah_hybrid:'laser' });
  const shotLabel = c => (Array.isArray(c) ? c : []).join('・');
  const TIER = Object.freeze([
    null,
    { label:'★1', name:'通常', q:[0, 0.40] },
    { label:'★2', name:'上質', q:[0.40, 0.75] },
    { label:'★3', name:'極上', q:[0.75, 1] }
  ]);
  const TEMPLATES = Object.freeze({
    atk:          { cat:'attack',  w:8, max:6, range:[6, 14],  name:()=>'攻撃力上昇',
                    desc:v=>`味方全員のATKが${v}%上昇する。`, short:v=>`ATK +${v}%` },
    atk_element:  { cat:'attack',  w:9, max:8, range:[12, 28], cond:'element', name:c=>`${ELEMENT_LABEL[c]}属性強化`,
                    desc:(v,c)=>`${ELEMENT_LABEL[c]}属性の味方のATKが${v}%上昇する。`, short:(v,c)=>`${ELEMENT_LABEL[c]}属性ATK +${v}%` },
    shot_type:    { cat:'attack',  w:9, max:8, range:[14, 32], cond:'shot', name:c=>`${shotLabel(c)}強化`,
                    desc:(v,c)=>`ショット種 ${shotLabel(c)} の味方の通常ショット威力が${v}%上昇する。`, short:(v,c)=>`${shotLabel(c)} +${v}%` },
    clear_ult:    { cat:'attack',  w:4, max:4, range:[10, 30], name:()=>'凱旋の昂揚',
                    desc:v=>`階層クリア時、全員のULTゲージが${v}%増加する。`, short:v=>`クリア時ULT +${v}%` },
    max_hp:       { cat:'defense', w:8, max:6, range:[6, 15],  name:()=>'最大HP上昇',
                    desc:v=>`味方全員の最大HPが${v}%上昇する。`, short:v=>`最大HP +${v}%` },
    damage_cut:   { cat:'defense', w:7, max:6, range:[4, 10],  name:()=>'被ダメージ軽減',
                    desc:v=>`受けるダメージを${v}%軽減する（合計最大40%）。`, short:v=>`被ダメ -${v}%` },
    barrier:      { cat:'defense', w:6, max:5, range:[6, 14],  name:()=>'被弾時バリア',
                    desc:v=>`被弾時、最大HP${v}%分のバリアを獲得する（再発動6秒・合計最大40%）。`, short:v=>`バリア ${v}%` },
    clear_heal:   { cat:'defense', w:6, max:5, range:[5, 15],  name:()=>'回復量増加',
                    desc:v=>`階層クリア時の回復量が最大HPの${v}%分増える。`, short:v=>`クリア回復 +${v}%` },
    heal_now:     { cat:'defense', w:4, max:99, range:[25, 50], once:true, name:()=>'癒しの泉',
                    desc:v=>`今すぐ全員のHPを最大HPの${v}%回復する（戦闘不能も復帰）。使い切り。`, short:v=>`即時回復 ${v}%` },
    move_speed:   { cat:'support', w:6, max:5, range:[3, 8],   name:()=>'移動速度上昇',
                    desc:v=>`味方全員の移動速度が${v}%上昇する（合計最大30%）。`, short:v=>`移動 +${v}%` },
    ult_gain:     { cat:'support', w:8, max:6, range:[8, 20],  name:()=>'ULT回収量上昇',
                    desc:v=>`ULTゲージの回収量が${v}%上昇する。`, short:v=>`ULT回収 +${v}%` },
    start_ult:    { cat:'support', w:6, max:5, range:[10, 25], name:()=>'開幕チャージ',
                    desc:v=>`各階層の開始時、全員のULTゲージが${v}%増加する。`, short:v=>`開始時ULT +${v}%` },
    ult_max_next: { cat:'support', w:3, max:99, once:true, fixedTier:3, name:()=>'臨界解放',
                    desc:()=>`次の階層の開始時、全員のULTゲージがMAXになる。使い切り。`, short:()=>`次の階層 ULT MAX` }
  });
  const LEGACY_BUFFS = Object.freeze({ atk_up:['atk',12], max_hp:['max_hp',12], damage_cut:['damage_cut',8], barrier:['barrier',10],
    clear_heal:['clear_heal',10], move_speed:['move_speed',6], ult_gain:['ult_gain',15], start_ult:['start_ult',15], clear_ult:['clear_ult',20] });

  // ------------------------------------------------------------
  // 保存
  // ------------------------------------------------------------
  const $ = id => document.getElementById(id);
  function userId(){
    try { return String(localStorage.getItem('zukan_user_id') || '').trim().toLowerCase(); }
    catch (_) { return ''; }
  }
  function storageKey(){ return STORAGE_KEY + ':' + (userId() || 'guest'); }
  function toInt(v, fallback){ const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : fallback; }
  function clamp01(v){ const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0; }
  function uniqIds(list){
    const out = [];
    (Array.isArray(list) ? list : []).forEach(v => {
      const id = toInt(v, 0);
      if (id > 0 && !out.includes(id)) out.push(id);
    });
    return out.slice(0, PARTY_SIZE);
  }
  function ratioMap(src, ids){
    const out = {};
    ids.forEach(id => {
      const raw = src && Object.prototype.hasOwnProperty.call(src, id) ? src[id] : src && src[String(id)];
      if (raw != null && Number.isFinite(Number(raw))) out[id] = clamp01(raw);
    });
    return out;
  }
  function blankRecord(){
    return {
      version: 1,
      user_id: userId(),
      run_status: 'idle',
      current_floor: 0,
      best_floor: 0,
      selected_members: [],
      draft_members: [],
      build_list: [],
      hp_state: {},
      ult_state: {},
      pending_choices: [],
      next_ult_max: false,
      last_result: null,
      runs_started: 0,
      updated_at: new Date().toISOString()
    };
  }
  function normalizeBuff(raw){
    if (typeof raw === 'string') {
      const legacy = LEGACY_BUFFS[raw];
      return legacy ? { t:legacy[0], v:legacy[1], q:2 } : null;
    }
    if (!raw || typeof raw !== 'object' || !TEMPLATES[raw.t]) return null;
    const tpl = TEMPLATES[raw.t];
    const out = { t:raw.t, v:Math.max(0, toInt(raw.v, 0)), q:Math.max(1, Math.min(3, toInt(raw.q, 1))) };
    if (raw.used) out.used = true;
    if (tpl.cond === 'element') {
      if (!ELEMENTS.includes(raw.c)) return null;
      out.c = raw.c;
    } else if (tpl.cond === 'shot') {
      const c = (Array.isArray(raw.c) ? raw.c : []).filter(k => SHOT_GROUP_KEYS.includes(k));
      if (!c.length) return null;
      out.c = c.slice(0, 2);
    }
    return out;
  }
  function normalize(raw){
    const base = blankRecord();
    if (!raw || typeof raw !== 'object') return base;
    const status = ['idle', 'ready', 'battle', 'suspended', 'select', 'ended'].includes(raw.run_status) ? raw.run_status : 'idle';
    const members = uniqIds(raw.selected_members);
    const rec = Object.assign(base, {
      run_status: status,
      current_floor: Math.max(0, toInt(raw.current_floor, 0)),
      best_floor: Math.max(0, toInt(raw.best_floor, 0)),
      selected_members: members,
      draft_members: uniqIds(raw.draft_members),
      build_list: (Array.isArray(raw.build_list) ? raw.build_list : []).map(normalizeBuff).filter(Boolean),
      hp_state: ratioMap(raw.hp_state, members),
      ult_state: ratioMap(raw.ult_state, members),
      pending_choices: (Array.isArray(raw.pending_choices) ? raw.pending_choices : []).map(normalizeBuff).filter(Boolean).slice(0, 3),
      next_ult_max: raw.next_ult_max === true,
      run_seed: Math.max(0, toInt(raw.run_seed, 0)),
      last_result: raw.last_result && typeof raw.last_result === 'object' ? raw.last_result : null,
      runs_started: Math.max(0, toInt(raw.runs_started, 0)),
      updated_at: String(raw.updated_at || base.updated_at)
    });
    // 壊れたrunは安全側（未開始）へ戻す。最高記録は維持する。
    if (RUN_ACTIVE.includes(rec.run_status) && (members.length !== PARTY_SIZE || rec.current_floor < 1)) {
      rec.run_status = 'idle';
      rec.current_floor = 0;
    }
    if (RUN_ACTIVE.includes(rec.run_status) && !rec.run_seed) rec.run_seed = 1 + Math.floor(Math.random() * 2147483646);
    if (rec.run_status === 'select' && !rec.pending_choices.length) rec.pending_choices = rollChoices(rec);
    return rec;
  }
  let record = null;
  let recordOwner = null;
  function load(){
    const key = storageKey();
    if (record && recordOwner === key) return record;
    let parsed = null;
    try { parsed = JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { parsed = null; }
    record = normalize(parsed);
    recordOwner = key;
    return record;
  }
  function save(options){
    if (!record) return;
    record.user_id = userId();
    record.updated_at = new Date().toISOString();
    try { localStorage.setItem(storageKey(), JSON.stringify(record)); }
    catch (err) { console.warn('[phase odyssey] save failed', err); }
    // 既存のクラウド保存（player_progress）へ同梱。失敗してもプレイは継続できる。
    if (!options || options.cloud !== false) {
      try { if (typeof window.scheduleCloudSave === 'function') window.scheduleCloudSave(); } catch (_) {}
    }
  }
  function isRunActive(rec){ return RUN_ACTIVE.includes((rec || load()).run_status); }

  // ------------------------------------------------------------
  // キャラクター参照（表示用）
  // ------------------------------------------------------------
  function charModule(){ return window.ShootingCharacters || null; }
  function getChar(id){
    const m = charModule();
    return (m && m.SHOOTING_CHARACTERS && m.SHOOTING_CHARACTERS[Number(id)]) || null;
  }
  function isOwned(id){
    const m = charModule();
    if (!m || typeof m.isShootingCharacterOwned !== 'function') return false;
    try { return !!m.isShootingCharacterOwned(Number(id)); } catch (_) { return false; }
  }
  function primaryElement(c){
    const raw = c && (Array.isArray(c.element) ? c.element[0] : c.element);
    const key = String(raw || 'neutral').trim().toLowerCase();
    return ['fire', 'aqua', 'wood', 'light', 'dark'].includes(key) ? key : 'neutral';
  }
  const ELEMENT_ICON = Object.freeze({
    neutral:'images/type_neutral.webp', fire:'images/type_fire.webp', aqua:'images/type_aqua.webp',
    wood:'images/type_wood.webp', light:'images/type_light.webp', dark:'images/type_dark.webp?v=572'
  });
  // ------------------------------------------------------------
  // 強化の抽選・集計
  // ------------------------------------------------------------
  function shotGroupOf(c){
    const raw = String((c && c.shotType) || '').trim().toLowerCase();
    const type = SHOT_ALIAS[raw] || raw || 'parallel';
    return SHOT_GROUP_KEYS.find(k => SHOT_GROUPS[k].includes(type)) || 'SPECIAL';
  }
  function buffName(b){ const t = TEMPLATES[b.t]; return t ? t.name(b.c) : ''; }
  function buffDesc(b){ const t = TEMPLATES[b.t]; return t ? t.desc(b.v, b.c) : ''; }
  function buffShort(b){ const t = TEMPLATES[b.t]; return t ? t.short(b.v, b.c) : ''; }
  function buffCategory(b){ const t = TEMPLATES[b.t]; return t ? t.cat : 'support'; }
  // 条件付き強化の対象メンバー（条件なしは全員）
  function buffTargets(b, rec){
    const tpl = TEMPLATES[b.t];
    const ids = (rec || load()).selected_members;
    if (!tpl || !tpl.cond) return ids.slice();
    if (tpl.cond === 'element') return ids.filter(id => primaryElement(getChar(id)) === b.c);
    if (tpl.cond === 'shot') return ids.filter(id => (b.c || []).includes(shotGroupOf(getChar(id))));
    return ids.slice();
  }
  function countOf(t, rec){ return (rec || load()).build_list.filter(b => b.t === t && !b.used).length; }
  function sumOf(t, rec){ return (rec || load()).build_list.reduce((n, b) => n + (b.t === t && !b.used ? Number(b.v) || 0 : 0), 0) / 100; }
  function pick(list){ return list[Math.floor(Math.random() * list.length)]; }
  function weightedPick(list){
    const total = list.reduce((n, x) => n + x.w, 0);
    let r = Math.random() * total;
    for (const x of list) { r -= x.w; if (r <= 0) return x; }
    return list[list.length - 1];
  }
  function rollTier(){ const r = Math.random(); return r < 0.55 ? 1 : (r < 0.88 ? 2 : 3); }
  function rollBuff(t, rec){
    const tpl = TEMPLATES[t];
    const q = tpl.fixedTier || rollTier();
    const out = { t, q, v:100 };
    if (tpl.range) {
      const [lo, hi] = TIER[q].q;
      const k = lo + Math.random() * (hi - lo);
      out.v = Math.round(tpl.range[0] + (tpl.range[1] - tpl.range[0]) * k);
    }
    const members = rec.selected_members.map(getChar).filter(Boolean);
    if (tpl.cond === 'element') {
      const mine = members.map(primaryElement).filter(e => ELEMENTS.includes(e));
      out.c = (mine.length && Math.random() < 0.6) ? pick(mine) : pick(ELEMENTS);
    } else if (tpl.cond === 'shot') {
      const mine = members.map(shotGroupOf);
      const first = (mine.length && Math.random() < 0.6) ? pick(mine) : pick(SHOT_GROUP_KEYS);
      const second = pick(SHOT_GROUP_KEYS.filter(k => k !== first));
      out.c = SHOT_GROUP_KEYS.filter(k => k === first || k === second);
    }
    return out;
  }
  function sameOffer(a, b){ return a.t === b.t && JSON.stringify(a.c || null) === JSON.stringify(b.c || null); }
  function rollChoices(rec){
    const keys = Object.keys(TEMPLATES).filter(t => {
      if (countOf(t, rec) >= TEMPLATES[t].max) return false;
      if (t === 'ult_max_next' && rec.next_ult_max) return false;
      if (t === 'heal_now' && rec.selected_members.every(id => clamp01(rec.hp_state[id] == null ? 1 : rec.hp_state[id]) >= 0.95)) return false;
      return true;
    });
    const picked = [];
    // 可能な限り「攻撃・防御・補助」を1つずつ混ぜる。
    const take = cands => {
      for (let tries = 0; tries < 8 && cands.length; tries++) {
        const tpl = weightedPick(cands.map(t => ({ t, w:TEMPLATES[t].w })));
        const b = rollBuff(tpl.t, rec);
        if (!picked.some(x => sameOffer(x, b))) { picked.push(b); return true; }
      }
      return false;
    };
    ['attack', 'defense', 'support'].forEach(cat => take(keys.filter(t => TEMPLATES[t].cat === cat)));
    for (let guard = 0; picked.length < 3 && guard < 10; guard++) take(keys);
    // 深い階層で各強化の取得上限に達しても3択が欠けないよう、上限を外して補充する
    // （被ダメ軽減・バリア・移動速度は合計の上限が別にあるので、取り過ぎても効果は頭打ち）
    if (picked.length < 3) {
      const relaxed = Object.keys(TEMPLATES).filter(t => !(t === 'ult_max_next' && rec.next_ult_max));
      for (let guard = 0; picked.length < 3 && guard < 20; guard++) take(relaxed);
    }
    for (let i = picked.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [picked[i], picked[j]] = [picked[j], picked[i]];
    }
    return picked;
  }
  function clearHealRate(rec){ return BASE_CLEAR_HEAL_RATE + sumOf('clear_heal', rec); }
  // 表示用：同じ種類・同じ条件の強化をまとめて合計値にする（取得数が増えても一覧が膨らまない）
  const TOTAL_CAP = Object.freeze({ damage_cut:40, barrier:40, move_speed:30 });
  function groupBuffs(rec){
    const map = new Map();
    (rec || load()).build_list.forEach(b => {
      if (!b || b.used || b.t === 'heal_now' || !TEMPLATES[b.t]) return;
      const key = b.t + '|' + JSON.stringify(b.c || null);
      const g = map.get(key) || { t:b.t, c:b.c, v:0, n:0, q:0 };
      g.v += Number(b.v) || 0; g.n += 1; g.q = Math.max(g.q, b.q);
      map.set(key, g);
    });
    const order = { attack:0, defense:1, support:2 };
    return [...map.values()].map(g => (TOTAL_CAP[g.t] ? Object.assign(g, { v:Math.min(TOTAL_CAP[g.t], g.v) }) : g))
      .sort((a, b) => (order[TEMPLATES[a.t].cat] - order[TEMPLATES[b.t].cat]) || (b.v - a.v));
  }

  // ------------------------------------------------------------
  // 戦闘フック用API（shooting_core.jsから呼ばれる）
  // ------------------------------------------------------------
  let battle = null; // 戦闘ごとの一時状態（バリア等）。保存しない。
  // 10階ごとのボス。runごとの乱数（run_seed）で抽選し、深い階層ほど候補が増える。直前のボスとは被らない。
  const BOSS_POOL = Object.freeze([
    { key:'dragon',   name:'竜型レムナント', from:10 },
    { key:'irish',    name:'イリシュ',       from:10 },
    { key:'mirage',   name:'ミラージュ',     from:10 },
    { key:'livia',    name:'リヴィア',       from:20 },
    { key:'overseer', name:'オーバーシア',   from:20 },
    { key:'camilla',  name:'カミラ',         from:30 },
    { key:'shien',    name:'シエン',         from:30 },
    { key:'rhythm',   name:'仮面舞踏会',     from:40 },
    { key:'towa',     name:'トワ',           from:40 },
    { key:'inori',    name:'イノリ',         from:10 }   // build1643: レムナント：イノリ
  ]);
  function seededRandom(seed, n){
    let x = (Math.imul((seed >>> 0) ^ 0x9e3779b9, 2654435761) + Math.imul(n, 40503)) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; x = Math.imul(x, 3266489917) >>> 0; x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }
  function bossForFloor(floor, rec){
    const f = Math.max(10, toInt(floor, 10));
    const seed = toInt((rec || load()).run_seed, 1) || 1;
    let prev = '', chosen = BOSS_POOL[0];
    for (let b = 10; b <= f; b += 10) {
      const cands = BOSS_POOL.filter(x => x.from <= b && x.key !== prev);
      chosen = cands[Math.floor(seededRandom(seed, b) * cands.length)] || cands[0];
      prev = chosen.key;
    }
    return chosen;
  }
  function isBossFloor(floor){ return toInt(floor, 0) > 0 && toInt(floor, 0) % 10 === 0; }
  function isStageId(id){ return new RegExp('^' + STAGE_PREFIX + '\\d{1,4}(?:_[a-z]+)?$').test(String(id || '')); }
  function stageIdForFloor(floor){
    const f = Math.max(1, toInt(floor, 1));
    return STAGE_PREFIX + String(f) + (isBossFloor(f) ? '_' + bossForFloor(f).key : '');
  }
  function getRunMembers(){
    const rec = load();
    return isRunActive(rec) && rec.run_status !== 'select' ? rec.selected_members.slice() : null;
  }
  // そのキャラに掛かる倍率（ATK・ショット威力・最大HP・移動速度）
  function profileRates(profile, id, rec){
    const elem = primaryElement(profile);
    const group = shotGroupOf(profile);
    let atk = 1, shot = 1, hp = 1, move = 1;
    rec.build_list.forEach(b => {
      if (b.used) return;
      const v = (Number(b.v) || 0) / 100;
      if (b.t === 'atk') atk += v;
      else if (b.t === 'atk_element' && b.c === elem) atk += v;
      else if (b.t === 'shot_type' && (b.c || []).includes(group)) shot += v;
      else if (b.t === 'max_hp') hp += v;
      else if (b.t === 'move_speed') move += v;
    });
    return { atk, shot, hp, move: Math.min(1.30, move) };
  }
  function applyToProfile(profile, id){
    if (!profile || typeof profile !== 'object') return profile;
    const rec = load();
    if (!isRunActive(rec) || !rec.selected_members.includes(Number(id))) return profile;
    const r = profileRates(profile, id, rec);
    if (r.atk === 1 && r.shot === 1 && r.hp === 1 && r.move === 1) return profile;
    const next = Object.assign({}, profile);
    if (r.atk !== 1) next.atk = Math.max(0, Math.round(Number(profile.atk || 0) * r.atk));
    if (r.shot !== 1 && Number.isFinite(Number(profile.shotPowerRate))) next.shotPowerRate = Number(profile.shotPowerRate) * r.shot;
    if (r.hp !== 1) next.hp = Math.max(1, Math.round(Number(profile.hp || 1) * r.hp));
    if (r.move !== 1 && Number.isFinite(Number(profile.moveSpeed))) next.moveSpeed = Math.round(Number(profile.moveSpeed) * r.move);
    next.phaseOdysseyBuffed = true;
    return next;
  }
  // 戦闘開始時（resetState直後）に持ち越しHP・ULTを返す。比率で保持するので最大HP強化とも整合する。
  function getCarryover(id){
    const rec = load();
    const key = Number(id);
    if (!isRunActive(rec) || !rec.selected_members.includes(key)) return null;
    const hp = Object.prototype.hasOwnProperty.call(rec.hp_state, key) ? clamp01(rec.hp_state[key]) : 1;
    const ult = Object.prototype.hasOwnProperty.call(rec.ult_state, key) ? clamp01(rec.ult_state[key]) : 0;
    // 臨界解放（使い切り）が控えていれば全員ULT MAX。消費は階層の決着時。
    return { hpRatio: hp, ultRatio: rec.next_ult_max ? 1 : clamp01(ult + sumOf('start_ult', rec)) };
  }
  function onBattleReset(stage){
    const floor = toInt(stage && stage.stageNo, 0);
    battle = { floor, shield: 0, shieldReadyAt: 0, atkScale: Number(stage && stage.phaseOdyssey && stage.phaseOdyssey.atkScale) || 1 };
    renderBattleBadge();
  }
  function modifyIncomingDamage(amount, member, now){
    let dmg = Math.max(0, Number(amount) || 0);
    if (!battle) return dmg;
    dmg *= battle.atkScale;                              // 位相上昇による敵ATK強化
    dmg *= (1 - Math.min(0.40, sumOf('damage_cut')));    // 被ダメージ軽減
    if (battle.shield > 0 && dmg > 0) {                  // バリア吸収
      const absorbed = Math.min(battle.shield, dmg);
      battle.shield -= absorbed;
      dmg -= absorbed;
      renderBattleBadge(true);
    }
    return Math.max(0, Math.round(dmg));
  }
  function onDamageTaken(member, applied, now){
    if (!battle || !member || Number(member.hp) <= 0) return;
    const rate = Math.min(0.40, sumOf('barrier'));
    if (!rate || Number(applied) <= 0) return;
    const t = Number(now) || performance.now();
    if (t < battle.shieldReadyAt) return;
    battle.shieldReadyAt = t + 6000;
    battle.shield = Math.max(battle.shield, Math.round(Number(member.hpMax || 0) * rate));
    renderBattleBadge(true);
  }
  function getUltGainMultiplier(){ return 1 + sumOf('ult_gain'); }

  // 出撃（編成画面の「戦闘開始」）。現在階層と固定編成が一致する時だけ許可。
  function beginFloor(floor, partyIds){
    const rec = load();
    const party = uniqIds(partyIds);
    if (!['ready', 'battle', 'suspended'].includes(rec.run_status) || toInt(floor, 0) !== rec.current_floor ||
        party.length !== PARTY_SIZE || party.join(',') !== rec.selected_members.join(',')) {
      notify('位相回遊の進行状況と一致しません。トップ画面から再開してください。');
      return false;
    }
    rec.run_status = 'battle';
    save({ cloud:false });
    return true;
  }
  // RESULT確定。勝利→強化選択待ち、敗北→run終了。
  function finishFloor(info){
    const rec = load();
    const floor = toInt(info && info.floor, 0);
    if (rec.run_status !== 'battle' || floor !== rec.current_floor) {
      return { phaseOdysseyConfirmed:false, firstClearClaimed:false, firstClearAmount:0, highScore:0 };
    }
    const win = !!(info && info.win);
    const party = Array.isArray(info && info.party) ? info.party : [];
    if (win) {
      const heal = clearHealRate(rec);
      const ultBonus = sumOf('clear_ult', rec);
      rec.selected_members.forEach(id => {
        const m = party.find(p => Number(p && p.id) === id);
        const hpRatio = m && Number(m.hpMax) > 0 ? clamp01(Number(m.hp) / Number(m.hpMax)) : clamp01(rec.hp_state[id] == null ? 1 : rec.hp_state[id]);
        const ultRatio = m && Number(m.burstNeed) > 0 ? clamp01(Number(m.burst) / Number(m.burstNeed)) : clamp01(rec.ult_state[id] || 0);
        rec.hp_state[id] = clamp01(hpRatio + heal);
        rec.ult_state[id] = clamp01(ultRatio + ultBonus);
      });
      rec.best_floor = Math.max(rec.best_floor, floor);
      if (rec.next_ult_max) { // 臨界解放はこの階層で使用済み
        rec.next_ult_max = false;
        const used = rec.build_list.find(b => b.t === 'ult_max_next' && !b.used);
        if (used) used.used = true;
      }
      rec.run_status = 'select';
      rec.pending_choices = rollChoices(rec);
      rec.last_result = { floor, win:true, at:new Date().toISOString() };
    } else {
      rec.last_result = { floor, win:false, cleared: Math.max(0, floor - 1), builds: rec.build_list.length, at:new Date().toISOString() };
      rec.draft_members = rec.selected_members.slice(); // 次回の編成候補として残す（変更可）
      rec.run_status = 'ended';
      rec.current_floor = 0;
      rec.selected_members = [];
      rec.build_list = [];
      rec.hp_state = {};
      rec.ult_state = {};
      rec.pending_choices = [];
      rec.next_ult_max = false;
    }
    battle = null;
    save();
    return { phaseOdysseyConfirmed:true, phaseOdysseyWin:win, firstClearClaimed:false, firstClearAmount:0, highScore:0 };
  }

  // ------------------------------------------------------------
  // 画面
  // ------------------------------------------------------------
  function notify(message){
    if (typeof window.showToast === 'function') window.showToast(message);
    else console.info('[phase odyssey]', message);
  }
  function el(tag, cls, text){
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  }
  function screen(){ return $('screen-phase-odyssey'); }
  function statusLabel(rec){
    switch (rec.run_status) {
      case 'ready': return '挑戦中';
      case 'battle':
      case 'suspended': return '中断中';
      case 'select': return '強化選択';
      case 'ended': return '終了';
      default: return '未開始';
    }
  }
  function render(){
    const root = screen();
    if (!root) return;
    const rec = load();
    const active = isRunActive(rec);
    const best = root.querySelector('[data-po-best]');
    if (best) best.textContent = rec.best_floor > 0 ? String(rec.best_floor) : '--';
    const floor = root.querySelector('[data-po-floor]');
    if (floor) {
      floor.textContent = active ? String(rec.current_floor) : '--';
      floor.dataset.len = String(floor.textContent.length); // 3桁以上は文字を詰める
    }
    const status = root.querySelector('[data-po-status]');
    if (status) {
      status.textContent = statusLabel(rec);
      status.dataset.state = rec.run_status;
    }
    const lastNote = root.querySelector('[data-po-last]');
    if (lastNote) {
      const last = rec.last_result;
      lastNote.textContent = (rec.run_status === 'ended' && last && !last.win)
        ? `前回：FLOOR ${last.floor}で敗北（${last.cleared}階層踏破）`
        : (rec.run_status === 'select' ? `FLOOR ${rec.current_floor} 踏破！ 強化を選択してください` : '');
      lastNote.hidden = !lastNote.textContent;
    }
    renderSlots(root, rec);
    renderBuildList(root, rec);
    const start = root.querySelector('[data-po-start]');
    if (start) {
      const resume = active;
      start.querySelector('.po-start-jp').textContent = rec.run_status === 'select' ? '強化を選択' : (resume ? '挑戦再開' : '挑戦開始');
      start.querySelector('.po-start-en').textContent = rec.run_status === 'select' ? 'SELECT' : (resume ? 'RESUME' : 'START');
      start.setAttribute('aria-label', start.querySelector('.po-start-jp').textContent);
    }
    const retire = root.querySelector('[data-po-retire]');
    if (retire) retire.hidden = !active;
    const note = root.querySelector('[data-po-party-note]');
    if (note) note.textContent = active ? '挑戦中は編成を変更できません。' : '最初に選んだ3人で最後まで挑戦します。';
    layoutPager();
  }

  // ------------------------------------------------------------
  // コンテンツの横スライド（2ページ）
  //  縦に全部収まる端末では .is-fit にして1画面にまとめて表示。収まらない端末だけ横スライド。
  // ------------------------------------------------------------
  function pagerEls(){
    const root = screen();
    if (!root) return null;
    const pager = root.querySelector('[data-po-pager]');
    const track = root.querySelector('[data-po-track]');
    return pager && track ? { root, pager, track } : null;
  }
  function layoutPager(){
    const els = pagerEls();
    if (!els || !els.root.classList.contains('active')) return;
    const { pager, track } = els;
    const keepPage = currentPage();
    pager.classList.add('is-fit');
    const avail = pager.clientHeight;
    if (avail <= 0) return; // 非表示中は判定しない
    const fits = track.scrollHeight <= avail + 1;
    pager.classList.toggle('is-fit', fits);
    if (!fits) {
      fitPagesVertically(pager);
      track.scrollLeft = keepPage * track.clientWidth;
      setActivePage(keepPage);
    } else {
      pager.querySelectorAll('.po-page').forEach(page => { page.classList.remove('is-vscroll', 'is-tight'); page.style.removeProperty('--po-slot-w'); });
    }
  }
  // 各ページが縦に数px〜数十pxだけはみ出して「微妙に上下スクロールできる」状態を防ぐ。
  // 立ち絵枠を縮めて収め、それでも大きくはみ出す時（強化が大量など）だけ縦スクロールを許可する。
  // 段階：①立ち絵枠を少し縮める → ②まだ足りなければ装飾チップ（編成固定など）を畳んで詰め、枠も再計算
  function shrinkSlotsToFit(page, minW){
    page.style.removeProperty('--po-slot-w');
    let over = page.scrollHeight - page.clientHeight;
    const slot = page.querySelector('.po-slot');
    if (over > 0 && slot) {
      const w = slot.getBoundingClientRect().width;
      // 枠の縦横比 170:208。はみ出し分の高さを幅に換算して縮める（下限まで）
      const next = Math.max(minW, Math.floor(w - (over + 2) * 170 / 208));
      if (next < w) {
        page.style.setProperty('--po-slot-w', next + 'px');
        over = page.scrollHeight - page.clientHeight;
      }
    }
    return over;
  }
  function fitPagesVertically(pager){
    pager.querySelectorAll('.po-page').forEach(page => {
      page.classList.remove('is-vscroll', 'is-tight');
      let over = shrinkSlotsToFit(page, 64);
      if (over > 1) {
        page.classList.add('is-tight');
        over = shrinkSlotsToFit(page, 54);
      }
      page.classList.toggle('is-vscroll', over > 1);
      if (over <= 1) page.scrollTop = 0;
    });
  }
  let pagerPage = 0;
  function currentPage(){ return pagerPage; }
  function setActivePage(index){
    pagerPage = index;
    const els = pagerEls();
    if (!els) return;
    els.root.querySelectorAll('[data-po-goto]').forEach(btn => {
      const on = Number(btn.dataset.poGoto) === index;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }
  function gotoPage(index, smooth){
    const els = pagerEls();
    if (!els) return;
    const { track } = els;
    const left = index * track.clientWidth;
    try { track.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' }); } catch (_) { track.scrollLeft = left; }
    setActivePage(index);
  }
  function resetPager(){
    const els = pagerEls();
    if (!els) return;
    els.pager.scrollTop = 0;
    els.root.querySelectorAll('.po-page').forEach(p => { p.scrollTop = 0; });
    els.track.scrollLeft = 0;
    setActivePage(0);
  }
  function bindPager(root){
    const track = root.querySelector('[data-po-track]');
    if (track) {
      let raf = 0;
      track.addEventListener('scroll', () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const w = track.clientWidth || 1;
          const idx = Math.max(0, Math.min(1, Math.round(track.scrollLeft / w)));
          if (idx !== pagerPage) setActivePage(idx);
        });
      }, { passive: true });
    }
    root.querySelector('[data-po-pager-nav]')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-po-goto]');
      if (btn) gotoPage(Number(btn.dataset.poGoto) || 0, true);
    });
    let resizeTimer = 0;
    const relayout = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layoutPager, 120); };
    window.addEventListener('resize', relayout);
    window.addEventListener('orientationchange', relayout);
    try { document.fonts && document.fonts.ready && document.fonts.ready.then(layoutPager); } catch (_) {}
    root.querySelectorAll('.po-page img').forEach(img => { if (!img.complete) img.addEventListener('load', relayout, { once: true }); });
  }
  const SLOT_ORNAMENTS = [
    '<svg viewBox="0 0 24 32" aria-hidden="true"><path d="M12 1v30M6 8h12M8 14h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 1l2.6 3.4L12 7 9.4 4.4z" fill="currentColor"/></svg>',
    '<svg viewBox="0 0 32 28" aria-hidden="true"><path d="M16 2c3 4 3 8 0 13-3-5-3-9 0-13zM4 9c5 0 8 3 10 8-5 0-8-2-10-8zm24 0c-5 0-8 3-10 8 5 0 8-2 10-8zM9 20c3-1 5 0 7 4 2-4 4-5 7-4" fill="currentColor"/></svg>',
    '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M17 3a11 11 0 1 0 8 15A9 9 0 0 1 17 3z" fill="currentColor"/><path d="M22 4l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="currentColor"/></svg>'
  ];
  function renderSlots(root, rec){
    const wrap = root.querySelector('[data-po-slots]');
    if (!wrap) return;
    const active = isRunActive(rec);
    const ids = active ? rec.selected_members : rec.draft_members.filter(isOwned);
    wrap.textContent = '';
    for (let i = 0; i < PARTY_SIZE; i++) {
      const id = ids[i];
      const c = id ? getChar(id) : null;
      const slot = el('button', 'po-slot' + (c ? ' is-filled' : ' is-empty') + (active ? ' is-locked' : ''));
      slot.type = 'button';
      slot.dataset.slot = String(i);
      const top = el('span', 'po-slot-top');
      if (c) {
        const icon = el('img', 'po-slot-element');
        icon.src = ELEMENT_ICON[primaryElement(c)];
        icon.alt = '';
        icon.decoding = 'async';
        top.append(icon);
      } else {
        top.innerHTML = SLOT_ORNAMENTS[i];
      }
      slot.append(top);
      const frame = el('span', 'po-slot-frame');
      if (c) {
        const img = el('img', 'po-slot-portrait');
        img.src = c.panelImage || c.image || '';
        img.alt = '';
        img.decoding = 'async';
        frame.append(img);
        const name = el('span', 'po-slot-name', c.name || '');
        frame.append(name);
        if (active) {
          const hp = clamp01(rec.hp_state[id] == null ? 1 : rec.hp_state[id]);
          const ult = clamp01(rec.ult_state[id] || 0);
          const bars = el('span', 'po-slot-bars');
          const hpBar = el('span', 'po-slot-bar is-hp'); hpBar.style.setProperty('--v', String(hp));
          const ultBar = el('span', 'po-slot-bar is-ult'); ultBar.style.setProperty('--v', String(ult));
          bars.append(hpBar, ultBar);
          frame.append(bars);
          slot.title = `${c.name}　HP ${Math.round(hp * 100)}% / ULT ${Math.round(ult * 100)}%`;
        }
      }
      slot.append(frame);
      slot.setAttribute('aria-label', c ? `出撃メンバー${i + 1}：${c.name}` : `出撃メンバー${i + 1}：未設定`);
      wrap.append(slot);
    }
  }
  function renderBuildList(root, rec){
    const box = root.querySelector('[data-po-builds]');
    if (!box) return;
    const groups = groupBuffs(rec);
    const LIMIT = 6; // トップには最大6件。残りは「ほかN件」→ 状態画面で全件
    box.textContent = '';
    box.hidden = !isRunActive(rec) || !groups.length;
    groups.slice(0, LIMIT).forEach(g => {
      const chip = el('span', 'po-build-chip is-' + buffCategory(g) + ' is-q' + g.q);
      chip.append(el('span', 'po-build-chip-name', buffShort(g)));
      if (g.n > 1) chip.append(el('b', '', '×' + g.n));
      chip.title = buffName(g);
      box.append(chip);
    });
    if (groups.length > LIMIT) {
      const more = el('button', 'po-build-chip is-more', `ほか${groups.length - LIMIT}件 ›`);
      more.type = 'button';
      more.addEventListener('click', openStatus);
      box.append(more);
    }
  }

  // ------------------------------------------------------------
  // モーダル（編成選択・確認・強化選択）
  // ------------------------------------------------------------
  let modalCleanup = null;
  // モーダルはbody直下に置き、共通HUD・ボトムナビより前面に出す（残響の塔の確認ダイアログと同じ層）。
  function modalLayer(create){
    let layer = $('phase-odyssey-layer');
    if (!layer && create) {
      layer = el('div', 'po-layer');
      layer.id = 'phase-odyssey-layer';
      layer.hidden = true;
      document.body.appendChild(layer);
    }
    return layer;
  }
  function closeModal(){
    const layer = modalLayer(false);
    if (modalCleanup) { const f = modalCleanup; modalCleanup = null; f(); }
    if (layer) { layer.hidden = true; layer.textContent = ''; layer.className = 'po-layer'; }
  }
  function openModal(kind, build){
    const layer = modalLayer(true);
    if (!layer) return null;
    closeModal();
    layer.className = 'po-layer is-' + kind;
    const sheet = el('section', 'po-sheet');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    layer.append(sheet);
    build(sheet);
    layer.hidden = false;
    const onKey = e => { if (e.key === 'Escape' && kind !== 'buff') { e.preventDefault(); closeModal(); } };
    document.addEventListener('keydown', onKey, true);
    modalCleanup = () => document.removeEventListener('keydown', onKey, true);
    layer.onclick = kind !== 'buff' ? (e => { if (e.target === layer) closeModal(); }) : null;
    requestAnimationFrame(() => sheet.querySelector('button')?.focus?.());
    return sheet;
  }
  function sheetHead(sheet, kicker, title, sub){
    sheet.append(el('div', 'po-sheet-kicker', kicker));
    const h = el('h2', 'po-sheet-title', title);
    h.id = 'po-sheet-title-' + Date.now();
    sheet.setAttribute('aria-labelledby', h.id);
    sheet.append(h);
    if (sub) sheet.append(el('p', 'po-sheet-sub', sub));
  }

  // 確認ダイアログ。はい→true、いいえ・背景タップ・ESC・別モーダル→false。
  function askConfirm(kicker, title, message, yesLabel){
    return new Promise(resolve => {
      let settled = false;
      const finish = ok => { if (settled) return; settled = true; resolve(!!ok); };
      openModal('confirm', sheet => {
        sheetHead(sheet, kicker, title, message);
        const actions = el('div', 'po-sheet-actions');
        const no = el('button', 'po-btn', 'やめる'); no.type = 'button';
        const yes = el('button', 'po-btn is-primary', yesLabel); yes.type = 'button';
        no.addEventListener('click', () => { finish(false); closeModal(); });
        yes.addEventListener('click', () => { finish(true); closeModal(); }, { once:true });
        actions.append(no, yes);
        sheet.append(actions);
      });
      const prev = modalCleanup;
      modalCleanup = () => { if (prev) prev(); finish(false); };
    });
  }
  function confirmDialog(kicker, title, message, yesLabel, onYes){
    askConfirm(kicker, title, message, yesLabel).then(ok => { if (ok) onYes(); });
  }

  // ------------------------------------------------------------
  // 現在の状態（味方の強さ・取得済み強化）
  // ------------------------------------------------------------
  // 戦闘と同じ育成値（共鳴・レベル・神聖樹）を基準に、位相回遊の強化を重ねた値を出す。
  function memberStats(id, rec){
    const base = getChar(id) || {};
    let grown = null;
    try { if (typeof window.getShootingCharacterGrowthProfile === 'function') grown = window.getShootingCharacterGrowthProfile(id); } catch (_) {}
    const profile = grown || base;
    const buffed = applyToProfile(profile, id) || profile;
    const rates = isRunActive(rec) ? profileRates(profile, id, rec) : { shot:1 };
    const hpMax = Math.max(1, Math.round(Number(buffed.hp || 0)));
    const hpRatio = clamp01(rec.hp_state[id] == null ? 1 : rec.hp_state[id]);
    return {
      c: base, exact: !!grown,
      atk: Math.round(Number(buffed.atk || 0)), atkBase: Math.round(Number(profile.atk || 0)),
      hpMax, hpBase: Math.max(1, Math.round(Number(profile.hp || 0))),
      hp: Math.max(hpRatio > 0 ? 1 : 0, Math.round(hpMax * hpRatio)), hpRatio,
      ult: rec.next_ult_max ? 1 : clamp01(rec.ult_state[id] || 0),
      shotPct: Math.round((rates.shot - 1) * 100), group: shotGroupOf(profile)
    };
  }
  function buildStatusPanel(rec, options){
    const wrap = el('section', 'po-status-panel');
    const head = el('div', 'po-status-head');
    head.append(el('span', 'po-status-title', '味方の状態'), el('span', 'po-status-en', 'PARTY STATUS'));
    wrap.append(head);
    const list = el('div', 'po-status-members');
    rec.selected_members.forEach(id => {
      const st = memberStats(id, rec);
      const row = el('div', 'po-status-member' + (st.hpRatio <= 0 ? ' is-down' : ''));
      const face = el('span', 'po-status-face');
      const img = el('img'); img.src = st.c.panelImage || st.c.image || ''; img.alt = ''; img.decoding = 'async';
      const icon = el('img', 'po-status-element'); icon.src = ELEMENT_ICON[primaryElement(st.c)]; icon.alt = '';
      face.append(img, icon);
      const body = el('span', 'po-status-body');
      body.append(el('strong', 'po-status-name', st.c.name || ''));
      const bars = el('span', 'po-status-bars');
      const hpLine = el('span', 'po-status-line is-hp');
      const hpBar = el('i'); hpBar.style.setProperty('--v', String(st.hpRatio));
      hpLine.append(el('b', '', 'HP'), hpBar, el('em', '', `${st.hp.toLocaleString('ja-JP')} / ${st.hpMax.toLocaleString('ja-JP')}`));
      const ultLine = el('span', 'po-status-line is-ult');
      const ultBar = el('i'); ultBar.style.setProperty('--v', String(st.ult));
      ultLine.append(el('b', '', 'ULT'), ultBar, el('em', '', `${Math.round(st.ult * 100)}%`));
      bars.append(hpLine, ultLine);
      const stat = el('span', 'po-status-stat');
      const atk = el('span', '', `ATK ${st.atk.toLocaleString('ja-JP')}`);
      if (st.atk > st.atkBase) atk.append(el('small', '', ` (+${(st.atk - st.atkBase).toLocaleString('ja-JP')})`));
      stat.append(atk);
      const shot = el('span', 'po-status-shot', st.group + (st.shotPct ? ` +${st.shotPct}%` : ''));
      stat.append(shot);
      body.append(bars, stat);
      row.append(face, body);
      list.append(row);
    });
    wrap.append(list);
    const groups = groupBuffs(rec);
    const total = groups.reduce((n, g) => n + g.n, 0);
    const buffBox = el('div', 'po-status-buffs');
    buffBox.append(el('span', 'po-status-sub', `取得済みの強化（${total}）`));
    const chips = el('div', 'po-status-chips');
    if (!groups.length) chips.append(el('span', 'po-status-none', 'まだ強化はありません'));
    // 同じ種類・条件はまとめて合計表示（★は取得した中で最高のもの）
    groups.forEach(g => {
      const targets = buffTargets(g, rec);
      const chip = el('span', 'po-status-chip is-' + buffCategory(g) + ' is-q' + g.q + (targets.length ? '' : ' is-miss'));
      chip.append(el('b', '', `${TIER[g.q].label} ${buffName(g)}${g.n > 1 ? ' ×' + g.n : ''}`),
        el('span', '', buffShort(g) + (TOTAL_CAP[g.t] && g.v >= TOTAL_CAP[g.t] ? '（上限）' : '') + (TEMPLATES[g.t].cond ? `（対象${targets.length}人）` : '')));
      chips.append(chip);
    });
    buffBox.append(chips);
    wrap.append(buffBox);
    const heal = Math.min(100, Math.round(clearHealRate(rec) * 100));
    wrap.append(el('p', 'po-status-note', options && options.selecting
      ? `※HPは階層クリア時の回復（最大HPの${heal}%）を反映済み`
      : `階層クリア時、最大HPの${heal}%を回復します`));
    return wrap;
  }
  function openStatus(){
    const rec = load();
    if (!isRunActive(rec)) return;
    openModal('status', sheet => {
      sheetHead(sheet, `PHASE ODYSSEY / FLOOR ${rec.current_floor}`, '現在の状態', '挑戦中は編成を変更できません。');
      sheet.append(buildStatusPanel(rec));
      const actions = el('div', 'po-sheet-actions');
      const ok = el('button', 'po-btn is-primary', '閉じる'); ok.type = 'button';
      ok.addEventListener('click', closeModal);
      actions.append(ok);
      sheet.append(actions);
    });
  }

  function openBuffSelect(){
    const rec = load();
    if (rec.run_status !== 'select') return;
    if (!screen() || !screen().classList.contains('active')) return; // 他画面へ移動済みなら出さない
    if (!rec.pending_choices.length) { rec.pending_choices = rollChoices(rec); save({ cloud:false }); }
    openModal('buff', sheet => {
      sheetHead(sheet, `FLOOR ${rec.current_floor} CLEAR`, '強化を選択', '次の階層へ進む前に、報酬を1つ選んでください');
      const cards = el('div', 'po-buff-cards');
      rec.pending_choices.forEach((b, index) => {
        const tpl = TEMPLATES[b.t];
        if (!tpl) return;
        const targets = buffTargets(b, rec);
        const miss = !!tpl.cond && !targets.length;
        const card = el('button', 'po-buff-card is-' + tpl.cat + ' is-q' + b.q + (miss ? ' is-miss' : ''));
        card.type = 'button';
        const art = el('span', 'po-buff-art');
        const img = el('img'); img.src = ICON[tpl.cat]; img.alt = '';
        art.append(img, el('span', 'po-buff-tier', TIER[b.q].label));
        const copy = el('span', 'po-buff-copy');
        const meta = el('span', 'po-buff-cat', CATEGORY_LABEL[tpl.cat] + '　' + TIER[b.q].name + (tpl.once ? '　使い切り' : ''));
        copy.append(meta);
        copy.append(el('strong', 'po-buff-name', tpl.name(b.c)));
        copy.append(el('span', 'po-buff-desc', tpl.desc(b.v, b.c)));
        if (tpl.cond) {
          const names = targets.map(id => (getChar(id) || {}).name || '').filter(Boolean);
          copy.append(el('span', 'po-buff-target' + (miss ? ' is-miss' : ''), miss ? '対象：編成内にいません' : `対象：${names.join('・')}`));
        }
        card.append(art, copy);
        card.addEventListener('click', () => chooseBuff(index), { once:true });
        cards.append(card);
      });
      sheet.append(cards);
      // 選択前に今の戦力を確認できるよう、味方の状態は折りたたみで添える
      const details = el('details', 'po-status-details');
      details.open = true;
      const summaryEl = el('summary', '', '味方の状態・取得済みの強化を確認');
      details.append(summaryEl, buildStatusPanel(rec, { selecting:true }));
      sheet.append(details);
      const nextFloor = rec.current_floor + 1;
      const next = el('p', 'po-sheet-foot' + (isBossFloor(nextFloor) ? ' is-boss' : ''), isBossFloor(nextFloor)
        ? `次の階層：FLOOR ${nextFloor}　BOSS「${bossForFloor(nextFloor, rec).name}」`
        : `次の階層：FLOOR ${nextFloor}　HP・ULTは引き継がれます`);
      sheet.append(next);
    });
  }
  function chooseBuff(index){
    const rec = load();
    const b = rec.pending_choices[index];
    if (rec.run_status !== 'select' || !b || !TEMPLATES[b.t]) return;
    const pickedBuff = Object.assign({}, b);
    if (pickedBuff.t === 'heal_now') { // 即時回復：その場で適用（戦闘不能も復帰）
      rec.selected_members.forEach(id => {
        const cur = clamp01(rec.hp_state[id] == null ? 1 : rec.hp_state[id]);
        rec.hp_state[id] = clamp01(cur + pickedBuff.v / 100);
      });
      pickedBuff.used = true;
    }
    if (pickedBuff.t === 'ult_max_next') rec.next_ult_max = true;
    rec.build_list.push(pickedBuff);
    rec.pending_choices = [];
    rec.current_floor += 1;
    rec.run_status = 'ready';
    save();
    closeModal();
    render();
    notify(`強化「${buffName(pickedBuff)}」${TIER[pickedBuff.q].label} を獲得。FLOOR ${rec.current_floor}へ進めます`);
  }

  // ------------------------------------------------------------
  // run操作
  // ------------------------------------------------------------
  function startRun(partyIds){
    const rec = load();
    const members = uniqIds(partyIds).filter(isOwned);
    if (members.length !== PARTY_SIZE || isRunActive(rec)) return false;
    rec.run_status = 'ready';
    rec.current_floor = 1;
    rec.selected_members = members.slice(0, PARTY_SIZE);
    rec.draft_members = rec.selected_members.slice();
    rec.build_list = [];
    rec.pending_choices = [];
    rec.hp_state = Object.fromEntries(rec.selected_members.map(id => [id, 1]));
    rec.ult_state = Object.fromEntries(rec.selected_members.map(id => [id, 0]));
    rec.last_result = null;
    rec.run_seed = 1 + Math.floor(Math.random() * 2147483646);
    rec.runs_started += 1;
    save();
    return true;
  }
  // 戦闘画面（共通パーティ選択）を開く。
  //  ・未開始：FLOOR 1 の共通パーティ選択で所持キャラから3人を自由に編成（前回の3人を初期配置）
  //  ・挑戦中：runの3人で固定された編成画面
  function openBattle(){
    const rec = load();
    if (rec.run_status === 'select') { openBuffSelect(); return; }
    if (typeof window.openShootingEvent !== 'function') { notify('戦闘エンジンの準備が完了していません'); return; }
    const floor = isRunActive(rec) ? rec.current_floor : 1;
    closeModal();
    window.__shootingReturnContext = { type:'phaseOdyssey' };
    try { window.openShootingEvent({ stageId: stageIdForFloor(floor) }); }
    catch (err) {
      window.__shootingReturnContext = null;
      console.error('[phase odyssey] battle open failed', err);
      notify('戦闘画面を開けませんでした');
    }
  }
  function onStartPressed(){ openBattle(); }
  // 共通パーティ選択の初期配置（未開始時のみ）。所持していないキャラは外す。
  function getDraftMembers(){
    const rec = load();
    return isRunActive(rec) ? [] : rec.draft_members.filter(isOwned).slice(0, PARTY_SIZE);
  }
  // 共通パーティ選択の「戦闘開始」から呼ばれる。未開始なら確認のうえrunを開始し、出撃を確定する。
  async function prepareBattle(floor, partyIds){
    const rec = load();
    const party = uniqIds(partyIds);
    if (!isRunActive(rec)) {
      if (toInt(floor, 0) !== 1 || party.length !== PARTY_SIZE || !party.every(isOwned)) {
        notify('出撃メンバーを3人選択してください');
        return false;
      }
      const names = party.map(id => (getChar(id) || {}).name || '').filter(Boolean).join('・');
      const ok = await askConfirm('PHASE ODYSSEY / START', '挑戦開始',
        `${names}\nこの3人で FLOOR 1 から挑戦します。\n開始後は敗北するまで編成を変更できません。`, '挑戦する');
      if (!ok) return false;
      if (!startRun(party)) { notify('挑戦を開始できませんでした'); return false; }
    }
    return beginFloor(floor, party);
  }
  function retireRun(){
    const rec = load();
    if (!isRunActive(rec)) return;
    confirmDialog('PHASE ODYSSEY / RETIRE', '挑戦を終了', `現在の挑戦（FLOOR ${rec.current_floor}）を終了します。\n取得した強化は失われ、次回は FLOOR 1 からになります。\n最高到達記録は保持されます。`, '終了する', () => {
      const cur = load();
      cur.last_result = { floor: cur.current_floor, win:false, retired:true, cleared: Math.max(0, cur.current_floor - (cur.run_status === 'select' ? 0 : 1)), at:new Date().toISOString() };
      cur.draft_members = cur.selected_members.slice();
      cur.run_status = 'ended';
      cur.current_floor = 0;
      cur.selected_members = [];
      cur.build_list = [];
      cur.hp_state = {};
      cur.ult_state = {};
      cur.pending_choices = [];
      save();
      render();
      notify('挑戦を終了しました');
    });
  }

  // ------------------------------------------------------------
  // 戦闘中バッジ（バリア残量。階層は上部のプレートに表示）
  // ------------------------------------------------------------
  function renderBattleBadge(pulse){
    const root = document.getElementById('shooting-event-root');
    if (!root) return;
    let badge = root.querySelector('.po-battle-badge');
    if (!battle) { if (badge) badge.remove(); return; }
    if (!badge) {
      badge = el('div', 'po-battle-badge');
      badge.setAttribute('aria-hidden', 'true');
      badge.append(el('span', 'po-battle-shield'));
      root.append(badge);
    }
    const shield = badge.querySelector('.po-battle-shield');
    shield.textContent = battle.shield > 0 ? `BARRIER ${Math.round(battle.shield)}` : '';
    shield.hidden = !(battle.shield > 0);
    if (pulse) { badge.classList.remove('is-pulse'); void badge.offsetWidth; badge.classList.add('is-pulse'); }
  }

  // ------------------------------------------------------------
  // 画面遷移
  // ------------------------------------------------------------
  function open(){
    if (typeof window.requireChapter03ContentUnlock === 'function' && !window.requireChapter03ContentUnlock()) return;
    record = null; // アカウント切替・クラウド復元直後でも最新を読む
    const rec = load();
    // 戦闘画面はこの時点で閉じている。'battle'のまま戻った＝途中で中断された挑戦。
    if (rec.run_status === 'battle') { rec.run_status = 'suspended'; save({ cloud:false }); }
    battle = null;
    closeModal();
    if (typeof window.showMainTab === 'function') window.showMainTab('phase-odyssey');
    resetPager();
    render();
    requestAnimationFrame(layoutPager); // 画面の表示（active）反映後に、収まるかを判定し直す
    if (rec.run_status === 'select') setTimeout(openBuffSelect, 260);
  }
  function close(){
    closeModal();
    // 入口は巡行の左タブ。戻ると巡行画面（直前のカテゴリのまま）へ。
    if (typeof window.showMainTab === 'function') window.showMainTab('ninmu');
  }
  function init(){
    const root = screen();
    if (!root || root.dataset.poBound === 'true') return;
    root.dataset.poBound = 'true';
    root.querySelector('[data-po-slots]')?.addEventListener('click', e => {
      if (!e.target.closest('.po-slot')) return;
      if (isRunActive(load())) { openStatus(); return; } // 挑戦中は状態確認（編成は固定）
      openBattle(); // 共通パーティ選択で編成
    });
    root.querySelector('[data-po-start]')?.addEventListener('click', onStartPressed);
    root.querySelector('[data-po-retire]')?.addEventListener('click', retireRun);
    root.querySelector('[data-po-back]')?.addEventListener('click', close);
    bindPager(root);
    render();
  }

  window.PhaseOdyssey = Object.freeze({
    STAGE_PREFIX, TEMPLATES,
    isStageId, stageIdForFloor, getRunMembers, applyToProfile, getCarryover, onBattleReset,
    modifyIncomingDamage, onDamageTaken, getUltGainMultiplier, beginFloor, finishFloor,
    getDraftMembers, prepareBattle, bossForFloor: f => Object.assign({}, bossForFloor(f)),
    getState: () => JSON.parse(JSON.stringify(load())),
    open, close, render, openBuffSelect, openStatus
  });
  window.openPhaseOdyssey = open;
  window.closePhaseOdyssey = close;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
