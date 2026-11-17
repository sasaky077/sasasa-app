/* =========================================================
   build2068 — お助けフレンド
   ・STORY（RPGエンカウント含む）・スコアアタック・ガチャ試遊を除く全ての戦闘で使える
   ・フレンドが「ホームに設定したお気に入りキャラ」（user_profiles.favorite_char_id。未設定はエリ）を連れていく
   ・連れていったキャラは盤面には出ず、固有の「フレンドスキル」だけを使える
       ACTIVE（アクティブ）… 戦闘中のボタンで1回だけ発動
       PASSIVE（パッシブ）… 戦闘中、常時効く
   ・回数制限・報酬なし（サーバー変更なし）。選んだフレンドは端末に保存し、次回も初期選択にする
   ・戦闘中の効果は shooting_core.js（applyFriendSupportSkill ほか）が処理する
   ========================================================= */
(function(){
  'use strict';

  // ---------------------------------------------------------
  // フレンドスキル表（キャラID → スキル）
  //   kind（ACTIVE）:
  //     ult   … 操作中キャラのULTゲージを rate（0〜1）回復
  //     atk   … ms のあいだ ATK×mul（与ダメージ全体）
  //     inv   … ms のあいだ無敵
  //     shield… 次の被弾 hits 回を無効（即死弾も防ぐ）
  //     heal  … 操作中キャラのHPを rate（最大HP比）回復
  //     stop  … ms のあいだ敵全体を行動停止
  //     clear … 敵弾を全消去し、ms のあいだ無敵
  //     stealth … ms のあいだ隠密（敵に狙われない。敵は発動した位置を狙い続ける。アイナULTの気配遮断と同じ仕組み）
  //     smilebox … スマイルのびっくり箱を設置。ms 後に爆発（操作中キャラのATK×mul の範囲ダメージ＋アイテム1個。箱は敵弾も防ぐ）
  //   kind（PASSIVE）: すべて「属性限定」＝フレンドのキャラと同じ属性のキャラを操作している間だけ効く（全属性バフは無し）
  //     p_atk … ATK×mul
  //     p_cut … 被ダメージ×mul（即死は対象外）
  //     p_ult … ULTゲージ獲得量×mul
  //   上限の目安（あくまで補助）：敵停止は最長2秒、無敵は最長3秒
  //   smilebox の威力は base×mul（固定値。操作中キャラのATKには依存しない）
  //   数値を変えるだけで調整できます。name はスキル名（自由に変更可）
  // ---------------------------------------------------------
  const A = (kind, name, p) => Object.freeze(Object.assign({ type:'active', kind, name }, p));
  const P = (kind, name, p) => Object.freeze(Object.assign({ type:'passive', kind, name }, p));
  const SKILLS = Object.freeze({
    1:   A('ult',   'ささやかな祈り',     { rate:.4 }),
    2:   A('atk',   '黒狼の咆哮',       { mul:1.3, ms:5000 }),
    3:   P('p_ult', '森のささやき', { mul:1.1 }),
    4:   A('inv',   '月光の加護',       { ms:3000 }),
    5:   P('p_atk', '絶品料理', { mul:1.1 }),
    6:   A('atk',   '紅蓮',       { mul:1.3, ms:5000 }),
    7:   A('shield','咆哮',       { hits:1 }),
    8:   A('stop',  '威圧',       { ms:2000 }),
    9:   P('p_cut', 'いばらの記憶',       { mul:.9 }),
    10:  A('ult',   '星の導き',       { rate:.3 }),
    11:  A('stop',  '蛇睨み',           { ms:2000 }),
    12:  A('shield','光の円環',         { hits:1 }),
    13:  A('atk',   '五月雨',       { mul:1.4, ms:4000 }),
    14:  P('p_ult', '循環', { mul:1.1 }),
    15:  A('ult',   '痛いのは好き？',       { rate:.4 }),
    16:  A('inv',   '絶対的支配',     { ms:3000 }),
    17:  A('stealth','隠密',        { ms:5000 }),
    18:  P('p_cut', '黒羽の加護',       { mul:.9 }),
    19:  P('p_atk', '爆炎の心得', { mul:1.1 }),
    20:  A('stop',  '千ノ刻',           { ms:2000 }),
    21:  A('heal',  '慈愛の光',         { rate:.25 }),
    22:  A('atk',   'キョーレツな応援', { mul:1.3, ms:5000 }),
    23:  P('p_cut', '静寂の加護',       { mul:.9 }),
    24:  A('heal',  '癒やしの灯',       { rate:.25 }),
    25:  A('clear', '忘却の波',         { ms:1000 }),
    26:  A('stop',  'おやすみの時間',   { ms:2000 }),
    27:  A('shield','僕の代わりに',     { hits:1 }),
    28:  A('inv',   'ミモザの贈り物',   { ms:3000 }),
    29:  A('clear', '天の恵み',       { ms:1000 }),
    30:  P('p_ult', '手厚い支援', { mul:1.1 }),
    31:  A('ult',   '時空の巻き戻し',   { rate:.4 }),
    32:  A('atk',   '紅閃の号令',       { mul:1.3, ms:5000 }),
    33:  A('clear', '深淵の引き潮',     { ms:1000 }),
    34:  P('p_atk', '制御できない炎', { mul:1.1 }),
    35:  P('p_atk', 'AQUA FIELD', { mul:1.1 }),
    36:  A('ult',   '出力全開',         { rate:.4 }),
    37:  A('clear', '双つの黒穴',       { ms:1000 }),
    38:  P('p_ult', '虹の彩り', { mul:1.1 }),
    39:  A('atk',   'フォトン充填',     { mul:1.4, ms:4000 }),
    40:  P('p_cut', '防衛構築',         { mul:.9 }),
    41:  A('atk',   '紅蓮の気迫',       { mul:1.3, ms:5000 }),
    42:  A('atk',   '一天の構え',       { mul:1.4, ms:4000 }),
    43:  P('p_atk', '終幕の調べ', { mul:1.1 }),
    44:  A('stop',  '冥府の宣告',       { ms:2000 }),
    45:  A('shield','水鏡の盾',         { hits:1 }),
    46:  A('ult',   'シンクロ',             { rate:.4 }),
    47:  A('heal',  '癒やしの風',       { rate:.25 }),
    48:  P('p_cut', '鵺の守り',         { mul:.9 }),
    49:  P('p_atk', '聖なる炎', { mul:1.1 }),
    50:  P('p_ult', '後方支援', { mul:1.1 }),
    51:  A('stop',  'フォビドゥン・スタン', { ms:2000 }),
    52:  A('stop',  '理想郷の静止',     { ms:2000 }),
    53:  P('p_cut', '深海の帳',         { mul:.9 }),
    54:  A('ult',   '天機',         { rate:.3 }),
    56:  A('smilebox','びっくり箱',     { ms:3000, mul:3, base:300 }),
    57:  A('clear', 'バラージ・ブレイク', { ms:1000 }),
    101: A('inv',   '常闇の帳',         { ms:3000 }),
    102: P('p_atk', '緋糸の契り', { mul:1.1 }),
    111: A('shield','祈りの帳',         { hits:1 }),
    112: A('ult',   '夜明けの光',       { rate:.4 }),
    113: A('stop',  '超放電',         { ms:2000 }),
  });
  const DEFAULT_SKILL = A('ult', '応援', { rate:.3 });
  const ELEMENT_JA = { fire:'火', aqua:'水', wood:'木', light:'光', dark:'闇', neutral:'無' };

  // スキル表の1行に、属性限定パッシブの対象属性（フレンドのキャラの属性）を足したものを返す
  function getSkill(charId){
    const base = SKILLS[Number(charId)] || DEFAULT_SKILL;
    if(base.type !== 'passive') return base;
    const c = chars()[Number(charId)] || {};
    const el = Array.isArray(c.element) ? c.element[0] : c.element;
    return el ? Object.freeze(Object.assign({}, base, { element: String(el) })) : base;
  }

  const sec = ms => (Math.round(Number(ms || 0) / 100) / 10) + '秒';
  const scopeText = s => '常時 ' + (s.element ? (ELEMENT_JA[s.element] || s.element) + '属性キャラの' : '');
  const pct = r => Math.round(Number(r || 0) * 100) + '%';
  function describeSkill(s){
    if(!s) return '';
    switch(s.kind){
      case 'ult':    return '操作中キャラのULTゲージを' + pct(s.rate) + '回復';
      case 'atk':    return sec(s.ms) + '間、ATK×' + s.mul;
      case 'inv':    return sec(s.ms) + '間、無敵';
      case 'shield': return '次の被弾を' + (s.hits > 1 ? s.hits + '回' : '1回') + '無効（即死弾も防ぐ）';
      case 'heal':   return '操作中キャラのHPを' + pct(s.rate) + '回復';
      case 'stop':   return sec(s.ms) + '間、敵全体を行動停止';
      case 'clear':  return '敵弾を全て消し、' + sec(s.ms) + '間無敵';
      case 'stealth': return sec(s.ms) + '間、隠密状態（敵に狙われない）';
      case 'smilebox': return 'びっくり箱を設置。' + sec(s.ms) + '後に爆発（' + Math.round(Number(s.base || 300) * Number(s.mul || 3)) + 'の範囲ダメージ＋アイテム）';
      case 'p_atk':  return scopeText(s) + 'ATK×' + s.mul;
      case 'p_cut':  return scopeText(s) + '被ダメージ' + pct(1 - s.mul) + '軽減（即死は対象外）';
      case 'p_ult':  return scopeText(s) + 'ULTゲージ獲得量×' + s.mul;
      default: return '';
    }
  }
  const typeLabel = s => s && s.type === 'passive' ? 'PASSIVE' : 'ACTIVE';

  // ---------------------------------------------------------
  // フレンド一覧（フレンド＋お気に入りキャラ）。5分キャッシュ
  // ---------------------------------------------------------
  const SEL_KEY = () => 'zeraphia_friend_support_v1:' + (myId() || 'guest');
  function myId(){ try { return String(localStorage.getItem('zukan_user_id') || '').trim(); } catch(_) { return ''; } }
  function chars(){ return (window.ShootingCharacters && window.ShootingCharacters.SHOOTING_CHARACTERS) || {}; }
  let cache = null, cacheAt = 0, loading = null;

  async function loadFriends(force){
    if(!force && cache && performance.now() - cacheAt < 300000) return cache;
    if(loading) return loading;
    loading = (async () => {
      const sb = window.zsSupabase, me = myId();
      if(!sb || !me) return [];
      try{
        const [a, b] = await Promise.all([
          sb.from('friendships').select('requester_id,receiver_id').eq('requester_id', me).eq('status', 'accepted'),
          sb.from('friendships').select('requester_id,receiver_id').eq('receiver_id', me).eq('status', 'accepted'),
        ]);
        const ids = [];
        (a && a.data || []).forEach(r => ids.push(r.receiver_id));
        (b && b.data || []).forEach(r => ids.push(r.requester_id));
        const uniq = Array.from(new Set(ids.filter(Boolean)));
        if(!uniq.length){ cache = []; cacheAt = performance.now(); return cache; }
        const prof = await sb.from('user_profiles').select('user_id,display_name,favorite_char_id,last_played').in('user_id', uniq);
        const rows = (prof && prof.data) || [];
        const C = chars();
        const list = uniq.map(uid => {
          const p = rows.find(r => String(r.user_id) === String(uid)) || {};
          let cid = Number(p.favorite_char_id);
          if(!C[cid]) cid = 1; // 未設定・未知のキャラはエリ（ホーム画面と同じ扱い）
          const c = C[cid] || {};
          return { userId: String(uid), name: String(p.display_name || 'フレンド'), charId: cid,
            charName: String(c.name || ''), panel: String(c.panelImage || c.image || ''),
            lastPlayed: p.last_played ? new Date(p.last_played).getTime() : 0 };
        }).sort((x, y) => (y.lastPlayed || 0) - (x.lastPlayed || 0));
        // 衣装（公開パネル画像）があれば差し替え。失敗しても通常画像のまま
        await Promise.all(list.map(async f => {
          try{
            if(window.CharacterSkins && typeof window.CharacterSkins.getPublicPanelImage === 'function'){
              const s = await window.CharacterSkins.getPublicPanelImage(f.userId, f.charId, f.panel);
              if(s) f.panel = String(s);
            }
          }catch(_){}
        }));
        cache = list; cacheAt = performance.now();
        return list;
      }catch(err){
        console.warn('[friend support] load failed', err && err.message || err);
        return cache || [];
      } finally { loading = null; }
    })();
    return loading;
  }

  // 選択中のフレンド（端末に保存）。null＝連れていかない
  function readSelection(){
    try{ const v = JSON.parse(localStorage.getItem(SEL_KEY()) || 'null'); return v && v.userId ? v : null; }catch(_){ return null; }
  }
  function writeSelection(f){
    try{
      if(!f) localStorage.setItem(SEL_KEY(), JSON.stringify({ userId:'', none:true }));
      else localStorage.setItem(SEL_KEY(), JSON.stringify({ userId:f.userId, name:f.name, charId:f.charId, charName:f.charName, panel:f.panel }));
    }catch(_){}
  }
  function isNoneChosen(){ try{ const v = JSON.parse(localStorage.getItem(SEL_KEY()) || 'null'); return !!(v && v.none); }catch(_){ return false; } }

  // 戦闘で使う選択（フレンドが一覧に居なくなっていれば外す）
  function getSelection(){
    const sel = readSelection();
    if(!sel) return null;
    if(cache && !cache.some(f => f.userId === sel.userId)) return null;
    const live = cache && cache.find(f => f.userId === sel.userId);
    const f = live || sel;
    return { userId:f.userId, name:f.name, charId:Number(f.charId), charName:f.charName, panel:f.panel, skill:getSkill(f.charId) };
  }

  // ---------------------------------------------------------
  // パーティ編成画面の「お助けフレンド」欄
  // ---------------------------------------------------------
  function ensureStyle(){
    if(document.getElementById('friend-support-style-v2068')) return;
    const st = document.createElement('style');
    st.id = 'friend-support-style-v2068';
    st.textContent = `
      /* build2070: パーティ編成の「お助けフレンド」欄（モック準拠：金の二重枠＋角飾りのカード） */
      #shooting-event-root .zfs-section{flex:0 0 auto;padding:9px 14px 10px;border-bottom:1px solid rgba(175,141,89,.42);box-sizing:border-box;width:100%}
      #shooting-event-root .zfs-section[hidden]{display:none!important}
      #shooting-event-root .zfs-row{position:relative;display:flex;align-items:center;gap:11px;width:100%;min-height:58px;box-sizing:border-box;
        margin:0;padding:6px 10px 6px 12px;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;
        background:linear-gradient(180deg,rgba(255,253,248,.97),rgba(247,241,229,.96));
        border:1px solid rgba(186,151,93,.62);border-radius:0;
        box-shadow:inset 0 0 0 2px rgba(255,252,244,.95),inset 0 0 0 3px rgba(198,166,112,.42),0 1px 3px rgba(120,90,50,.08);
        font-family:'Noto Serif JP',serif;color:#4c3824}
      #shooting-event-root .zfs-row::before,#shooting-event-root .zfs-row::after{content:"";position:absolute;width:9px;height:9px;pointer-events:none;
        border-color:rgba(176,138,74,.85);border-style:solid}
      #shooting-event-root .zfs-row::before{left:-1px;top:-1px;border-width:2px 0 0 2px}
      #shooting-event-root .zfs-row::after{right:-1px;bottom:-1px;border-width:0 2px 2px 0}
      #shooting-event-root .zfs-row .zfs-cn{position:absolute;width:9px;height:9px;pointer-events:none;border-color:rgba(176,138,74,.85);border-style:solid}
      #shooting-event-root .zfs-row .zfs-cn.tr{right:-1px;top:-1px;border-width:2px 2px 0 0}
      #shooting-event-root .zfs-row .zfs-cn.bl{left:-1px;bottom:-1px;border-width:0 0 2px 2px}
      #shooting-event-root .zfs-row:active{transform:translateY(1px)}
      #shooting-event-root .zfs-face{position:relative;flex:0 0 46px;width:46px;height:46px;border-radius:50%;overflow:hidden;background:#e9dfcc;
        border:2px solid #c9a464;box-shadow:0 0 0 1px rgba(255,250,236,.95),0 0 0 2px rgba(176,138,74,.55),0 2px 4px rgba(90,60,25,.25)}
      #shooting-event-root .zfs-face img{width:100%;height:100%;object-fit:cover;object-position:50% 16%;display:block}
      #shooting-event-root .zfs-face.is-empty{display:flex;align-items:center;justify-content:center;color:#b28d4f;font:400 22px/1 'Noto Serif JP',serif}
      #shooting-event-root .zfs-info{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px}
      #shooting-event-root .zfs-head{display:flex;align-items:center;gap:7px;white-space:nowrap;min-width:0}
      #shooting-event-root .zfs-k{flex:0 0 auto;font:700 9px/1 'Cinzel',serif;letter-spacing:.2em;color:#7d6140}
      #shooting-event-root .zfs-sep{flex:0 0 1px;width:1px;height:11px;background:rgba(150,118,72,.55)}
      #shooting-event-root .zfs-head strong{min-width:0;overflow:hidden;text-overflow:ellipsis;font:700 11.5px/1.2 'Noto Serif JP',serif;color:#3f2d1b;letter-spacing:.02em}
      /* build2080: 札＋スキル名の下に、効果の説明を全文（折り返し可）。見切れさせない */
      #shooting-event-root .zfs-skill{display:flex;flex-wrap:wrap;align-items:center;gap:3px 7px;min-width:0}
      #shooting-event-root .zfs-skill b{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:700 11px/1.2 'Noto Serif JP',serif;color:#3f2d1b}
      #shooting-event-root .zfs-skill small{flex:1 0 100%;min-width:0;white-space:normal;word-break:break-word;font:500 9.5px/1.4 'Noto Serif JP',serif;color:#5d4a35}
      .zfs-tag{display:inline-block;flex:0 0 auto;padding:2px 7px 2px;border:1px solid #8c6a3c;border-radius:1px;font:700 8px/1.15 'Cinzel',serif;letter-spacing:.14em;color:#fff8e8;
        background:linear-gradient(180deg,#b48a52,#8a6334);box-shadow:inset 0 0 0 1px rgba(255,236,196,.28);vertical-align:1px}
      .zfs-tag.is-passive{border-color:#4d6a82;background:linear-gradient(180deg,#7d9bb4,#536f88)}
      #shooting-event-root .zfs-change{flex:0 0 auto;position:relative;display:flex;align-items:center;justify-content:center;min-width:50px;height:25px;padding:0 10px;box-sizing:border-box;
        font:700 11px/1 'Noto Serif JP',serif;letter-spacing:.06em;color:#4c3824;background:linear-gradient(180deg,#fffdf7,#f3ead9);
        border:1px solid rgba(176,138,74,.8);box-shadow:inset 0 0 0 2px rgba(255,252,244,.9),inset 0 0 0 3px rgba(198,166,112,.45),0 1px 2px rgba(110,80,40,.18);
        clip-path:polygon(4px 0,calc(100% - 4px) 0,100% 4px,100% calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,0 calc(100% - 4px),0 4px)}
      @media(max-width:390px){
        #shooting-event-root .zfs-section{padding:8px 10px 9px}
        #shooting-event-root .zfs-row{gap:9px;padding:6px 8px 6px 10px}
        #shooting-event-root .zfs-face{flex-basis:42px;width:42px;height:42px}
        #shooting-event-root .zfs-head strong{font-size:10.5px}
        #shooting-event-root .zfs-skill small{font-size:9px}
      }
      /* build2077: フレンド画面のカードの下に全幅で「フレンドスキル：」の帯 */
      /* build2079: 1行目「フレンドスキル：［札］スキル名」、2行目に効果の説明を全文（折り返し可） */
      .friend-card .zfs-card-skill{grid-column:1/-1;display:block;min-width:0;max-width:100%;box-sizing:border-box;
        margin-top:7px;padding:5px 8px 4px;border-top:1px solid rgba(190,166,120,.45);
        font:500 10px/1.35 'Noto Serif JP',serif;color:#7d6140;letter-spacing:.02em}
      .friend-card .zfs-card-skill .zfs-cs-head{display:flex;align-items:center;gap:6px;min-width:0;white-space:nowrap}
      .friend-card .zfs-card-skill .zfs-cs-head > span:first-child{flex:0 0 auto}
      .friend-card .zfs-card-skill .zfs-tag{margin:0;flex:0 0 auto}
      .friend-card .zfs-card-skill b{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;font-weight:700;color:#3f2d1b;font-size:11px}
      .friend-card .zfs-card-skill small{display:block;margin-top:3px;font-size:9.5px;line-height:1.45;color:#6f5a3e;white-space:normal;word-break:break-word}
      @media(max-width:340px){.friend-card .zfs-card-skill{padding:5px 4px 4px}.friend-card .zfs-card-skill .zfs-cs-head{gap:4px}.friend-card .zfs-card-skill .zfs-cs-head > span:first-child{font-size:9px}}
      /* build2083: キャラ詳細のフレンドスキル欄 */
      .detail-friend-skill .detail-shooting-ult-head{display:flex;align-items:center;gap:8px}
      .detail-friend-skill .detail-shooting-ult-head b{font-weight:700}
      .detail-friend-skill .zfs-detail-note{margin-top:6px;font-size:10px;line-height:1.5;color:#8b7354}
      .zfs-overlay{position:fixed;inset:0;z-index:2147483600;background:rgba(30,22,14,.55);display:flex;align-items:flex-end;justify-content:center}
      .zfs-sheet{width:min(100%,520px);max-height:78vh;display:flex;flex-direction:column;background:#fbf7ee;border-radius:14px 14px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.25);
        font-family:'Noto Sans JP',sans-serif;color:#3f2f20}
      .zfs-sheet header{padding:14px 16px 8px;text-align:center;border-bottom:1px solid rgba(178,141,79,.3)}
      .zfs-sheet header small{display:block;font:700 9px/1.2 'Cinzel',serif;letter-spacing:.2em;color:#b28d4f}
      .zfs-sheet header strong{display:block;margin-top:3px;font:600 15px/1.3 'Noto Serif JP',serif}
      .zfs-sheet header p{margin:4px 0 0;font-size:10px;color:#8b7354}
      .zfs-list{overflow:auto;padding:8px 10px 4px;display:flex;flex-direction:column;gap:6px}
      .zfs-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid rgba(178,141,79,.35);border-radius:8px;background:#fff;text-align:left;width:100%;cursor:pointer}
      .zfs-item.is-selected{border-color:#b0743d;box-shadow:0 0 0 2px rgba(176,116,61,.25) inset;background:#fff8ec}
      .zfs-item .zfs-face{flex:0 0 46px;width:46px;height:46px;border-radius:50%;overflow:hidden;border:1px solid rgba(178,141,79,.6);background:#efe5d0}
      .zfs-item .zfs-face img{width:100%;height:100%;object-fit:cover;object-position:50% 18%}
      .zfs-item .zfs-face.is-empty{display:flex;align-items:center;justify-content:center;color:#b28d4f;font:600 18px/1 serif}
      .zfs-item .zfs-text{flex:1;min-width:0}
      .zfs-item b{display:block;font:600 12px/1.3 'Noto Serif JP',serif}
      .zfs-item b em{font-style:normal;font-weight:500;color:#8b7354;font-size:10px;margin-left:6px}
      .zfs-item .zfs-sk{display:block;margin-top:2px;font-size:11px;font-weight:700;color:#5b3f22}
      .zfs-item .zfs-sk .zfs-tag{margin-right:6px}
      .zfs-item .zfs-ds{display:block;margin-top:1px;font-size:10px;color:#7d6748}
      .zfs-empty{padding:26px 12px;text-align:center;font-size:12px;color:#8b7354;line-height:1.7}
      .zfs-sheet footer{padding:10px 12px calc(12px + env(safe-area-inset-bottom));border-top:1px solid rgba(178,141,79,.3)}
      .zfs-sheet footer button{width:100%;padding:11px;border-radius:8px;border:1px solid rgba(178,141,79,.6);background:#fffaf0;font:600 13px/1 'Noto Serif JP',serif;color:#6b4d2c}
    `;
    document.head.appendChild(st);
  }
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const skillLine = s => `<span class="zfs-tag${s.type === 'passive' ? ' is-passive' : ''}">${typeLabel(s)}</span><b>${esc(s.name)}</b>`;

  let rowEligible = false;
  function renderRow(){
    const anchor = document.getElementById('shooting-last-clear-party');
    let sec = document.getElementById('zfs-section');
    if(!rowEligible || !anchor){ if(sec) sec.hidden = true; return; }
    ensureStyle();
    if(!sec){
      sec = document.createElement('section');
      sec.id = 'zfs-section'; sec.className = 'zfs-section'; sec.setAttribute('aria-label', 'お助けフレンド');
      const row = document.createElement('button');
      row.type = 'button'; row.id = 'zfs-row'; row.className = 'zfs-row';
      row.addEventListener('click', openPicker);
      sec.appendChild(row);
      anchor.insertAdjacentElement('afterend', sec);
    }
    sec.hidden = false;
    const row = sec.querySelector('.zfs-row');
    const corners = '<i class="zfs-cn tr"></i><i class="zfs-cn bl"></i>';
    const sel = getSelection();
    if(sel){
      row.innerHTML = corners + `<span class="zfs-face"><img src="${esc(sel.panel)}" alt=""></span>
        <span class="zfs-info"><span class="zfs-head"><span class="zfs-k">FRIEND</span><i class="zfs-sep"></i><strong>お助け：${esc(sel.name)}（${esc(sel.charName)}）</strong></span>
        <span class="zfs-skill">${skillLine(sel.skill)}<small>${esc(describeSkill(sel.skill))}</small></span></span>
        <span class="zfs-change">変更</span>`;
    } else {
      row.innerHTML = corners + `<span class="zfs-face is-empty">＋</span>
        <span class="zfs-info"><span class="zfs-head"><span class="zfs-k">FRIEND</span><i class="zfs-sep"></i><strong>お助けフレンド</strong></span>
        <span class="zfs-skill"><small>フレンドのお気に入りキャラのスキルを1つ借りられます</small></span></span>
        <span class="zfs-change">選ぶ</span>`;
    }
  }

  // shooting_core から：パーティ編成画面を描き直す度に呼ばれる
  function syncPartyRow(eligible){
    rowEligible = !!eligible;
    renderRow();
    if(!rowEligible) return;
    loadFriends().then(list => {
      // 初回（まだ一度も選んでいない）なら、最近遊んだフレンドを自動で選んでおく
      if(!readSelection() && !isNoneChosen() && list && list.length) writeSelection(list[0]);
      renderRow();
    });
  }

  async function openPicker(){
    ensureStyle();
    const ov = document.createElement('div');
    ov.className = 'zfs-overlay';
    ov.innerHTML = `<section class="zfs-sheet" role="dialog" aria-modal="true" aria-label="お助けフレンド">
      <header><small>FRIEND SUPPORT</small><strong>お助けフレンドを選ぶ</strong><p>フレンドのお気に入りキャラの「フレンドスキル」を、戦闘中に使えます</p></header>
      <div class="zfs-list"><div class="zfs-empty">読み込んでいます…</div></div>
      <footer><button type="button" data-close>閉じる</button></footer></section>`;
    document.body.appendChild(ov);
    const close = () => { ov.remove(); renderRow(); };
    ov.addEventListener('click', e => { if(e.target === ov || e.target.closest('[data-close]')) close(); });
    const listEl = ov.querySelector('.zfs-list');
    const list = await loadFriends(true);
    if(!ov.isConnected) return;
    const sel = readSelection();
    const noneItem = `<button type="button" class="zfs-item${!sel ? ' is-selected' : ''}" data-uid=""><span class="zfs-face is-empty">—</span>
      <span class="zfs-text"><b>連れていかない</b><span class="zfs-ds">フレンドスキルを使わずに出撃します</span></span></button>`;
    if(!list.length){
      listEl.innerHTML = noneItem + '<div class="zfs-empty">フレンドがいません。<br>フレンド画面から申請してみましょう。</div>';
    } else {
      listEl.innerHTML = noneItem + list.map(f => {
        const s = getSkill(f.charId);
        return `<button type="button" class="zfs-item${sel && sel.userId === f.userId ? ' is-selected' : ''}" data-uid="${esc(f.userId)}">
          <span class="zfs-face"><img src="${esc(f.panel)}" alt=""></span>
          <span class="zfs-text"><b>${esc(f.name)}<em>${esc(f.charName)}</em></b>
          <span class="zfs-sk">${skillLine(s)}</span><span class="zfs-ds">${esc(describeSkill(s))}</span></span></button>`;
      }).join('');
    }
    listEl.addEventListener('click', e => {
      const it = e.target.closest('.zfs-item'); if(!it) return;
      const uid = it.getAttribute('data-uid');
      writeSelection(uid ? list.find(f => f.userId === uid) : null);
      close();
    });
  }

  // build2077: フレンド画面のカード用。「フレンドスキル：スキル名　効果」の1行
  function cardSkillHtml(charId){
    ensureStyle();
    const s = getSkill(Number(charId) || 1);
    return `<span class="zfs-card-skill"><span class="zfs-cs-head"><span>フレンドスキル：</span>${skillLine(s)}</span><small>${esc(describeSkill(s))}</small></span>`;
  }

  // build2083: キャラ詳細の「フレンドスキル」欄（ULT欄の下）
  function detailSectionHtml(charId){
    ensureStyle();
    const s = getSkill(Number(charId) || 1);
    return `<div class="detail-shooting-section detail-friend-skill">
      <div class="detail-section-title">フレンドスキル</div>
      <div class="detail-shooting-card detail-shooting-ult">
        <div class="detail-shooting-ult-head">${skillLine(s)}</div>
        <div class="detail-shooting-desc">${esc(describeSkill(s))}</div>
        <div class="zfs-detail-note">ホームに設定すると、フレンドがお助けで使えます${s.type === 'passive' ? '（PASSIVE：戦闘中、常時効く）' : '（ACTIVE：戦闘中1回だけ）'}</div>
      </div>
    </div>`;
  }

  window.FriendSupport = Object.freeze({
    SKILLS, ELEMENT_JA, getSkill, cardSkillHtml, detailSectionHtml, describeSkill, typeLabel,
    loadFriends, getSelection, syncPartyRow, openPicker,
  });
})();
