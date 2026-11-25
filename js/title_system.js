// =========================================================
// ZERAPHIA 称号システム（build1712 / build1713でランク制）
// ---------------------------------------------------------
// ・称号の定義はこのファイルの TITLE_MASTER に一本化する（名前・説明・入手条件・ランクの見た目）。
// ・称号は「何回獲得したか」がランク（Lv）になる。例：絶望を超えし者 I → II → III …
//   ランクが一定に達すると見た目（tier）が変わる。tier の境目は TITLE_MASTER の tiers で決める。
// ・所持と装備はサーバーが正（Supabase）：
//     get_my_titles()                → { owned:[{ title_id, level }...], equipped:title_id|null }
//                                       ※ owned が title_id の文字列配列でも動く（その場合 Lv1 扱い）
//     equip_title(p_title_id)        → { ok, equipped }   ※ null で外す
//     get_public_titles(p_user_ids)  → [{ user_id, title_id, title_level }]（装備中の称号だけ）
//   付与・ランクアップはコンテンツ側のサーバー処理（例：finish_despair_tower_run の20F踏破）が行う。
// ・表示：ホームの名前の上／設定のプロフィール／フレンド一覧／ランキング。
//   他の画面から使うときは ZeraphiaTitles.badgeHTML(titleId, level) か decorate(root) を呼ぶ。
//   decorate は [data-title-user="ユーザーID"] か [data-title-id="称号ID"][data-title-level="Lv"] に差し込む。
// =========================================================
(function(){
  'use strict';

  // build2145: 称号の効果（装備中の1つだけがバトルに乗る）。
  //   kind: 'hp'＝バトル中のキャラ最大HP / 'atk'＝ATK / 'ult'＝ULTゲージ回収量
  //         'lethal_guard'＝即死攻撃を値(%)の確率で無効（build2202）
  //   値(%) = base + (Lv-1)*perLv（Lvは maxLv で頭打ち）
  const TITLE_MASTER = Object.freeze({
    apprentice_savior: Object.freeze({
      id:'apprentice_savior', name:'見習い救世主', rarity:'N',
      desc:'ゼラフィアに降り立ったすべての救世主に贈られる称号。',
      how:'全員に配布',
      tone:'savior',
      effect:Object.freeze({ kind:'hp', base:10, perLv:0, maxLv:1 })
    }),
    reason_knower: Object.freeze({
      id:'reason_knower', name:'理を知る者', rarity:'SR',
      desc:'位相回遊100Fから50Fごとの初回突破で I〜V に昇格する称号。',
      how:'位相回遊100F / 150F / 200F / 250F / 300F',
      tone:'reason', effect:Object.freeze({ kind:'atk', base:8, perLv:1, maxLv:5 }), tiers:Object.freeze([{min:1,key:'t1',label:'I'}, {min:2,key:'t2',label:'II'}, {min:3,key:'t3',label:'III'}, {min:4,key:'t4',label:'IV'}, {min:5,key:'t5',label:'V'}])
    }),
    despair_conqueror: Object.freeze({
      id: 'despair_conqueror',
      rarity: 'R',
      name: '絶望を超えし者',
      desc: '残響の塔（絶望）20Fを毎週踏破することで昇格する称号。',
      how: '今週の残響の塔を制覇し、残響の塔（絶望）20Fを踏破',
      tone: 'despair',
      effect: Object.freeze({ kind: 'ult', base: 3, perLv: 1, maxLv: 5 }),
      // build2184: 段階は I〜V（Lv1〜5）。表示はVで頭打ち。見た目：I 深紅／II 銀縁／III・IV 金縁／V 輝く金縁
      tiers: Object.freeze([
        Object.freeze({ min: 1, key: 't1', label: 'I' }),
        Object.freeze({ min: 2, key: 't2', label: 'II' }),
        Object.freeze({ min: 3, key: 't3', label: 'III' }),
        Object.freeze({ min: 4, key: 't3', label: 'IV' }),
        Object.freeze({ min: 5, key: 't4', label: 'V' })
      ])
    }),
    // build2202: パラレル・ソワレの追加ミッション（MAX BINGO後、スコア35,000以上でクリア）の報酬
    soiree_noble: Object.freeze({
      id: 'soiree_noble',
      rarity: 'SR',
      name: '華麗なる一族',
      desc: '並行世界の夜会で、誰よりも華麗に振る舞った者に贈られる称号。',
      how: 'パラレル・ソワレでMAX BINGO（8 LINE）達成後、スコア35,000以上でクリア',
      tone: 'noble',
      effect: Object.freeze({ kind: 'lethal_guard', base: 50, perLv: 0, maxLv: 1 })
    })
  });

  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  function roman(n){
    const v = Math.max(1, Math.floor(Number(n) || 1));
    return v <= 10 ? ROMAN[v] : String(v);
  }

  const PUBLIC_CACHE_MS = 5 * 60 * 1000;
  const state = { loaded:false, loading:null, owned:new Map(), equipped:'', publicCache:new Map() };

  function client(){ return window.zsSupabase || null; }
  function myId(){ try{ return String(localStorage.getItem('zukan_user_id')||'').trim().toLowerCase(); }catch(_){ return ''; } }
  function getTitle(id){ return TITLE_MASTER[String(id||'')] || null; }
  function levelOf(v){ return Math.max(1, Math.floor(Number(v) || 1)); }
  // build2184: 段階のある称号は、最上位の段階（例：V）で表示を頭打ちにする
  function displayLv(titleId, level){
    const t = getTitle(titleId);
    const lv = levelOf(level);
    if(!t || !Array.isArray(t.tiers) || !t.tiers.length) return lv;
    return Math.min(lv, t.tiers[t.tiers.length - 1].min);
  }
  function getTier(titleId, level){
    const t = getTitle(titleId);
    if(!t || !Array.isArray(t.tiers) || !t.tiers.length) return null;
    const lv = levelOf(level);
    let hit = t.tiers[0];
    t.tiers.forEach(x => { if(lv >= x.min) hit = x; });
    return hit;
  }
  function nextTier(titleId, level){
    const t = getTitle(titleId);
    if(!t || !Array.isArray(t.tiers)) return null;
    const lv = levelOf(level);
    return t.tiers.find(x => x.min > lv) || null;
  }
  function labelOf(titleId, level){
    const t = getTitle(titleId);
    if(!t) return '';
    return t.name + ' ' + roman(displayLv(titleId, level));
  }
  const EFFECT_LABEL = Object.freeze({ hp:'バトル中のキャラHP', atk:'ATK', ult:'ULT回収率', lethal_guard:'即死攻撃を無効' });
  function effectPercent(titleId, level){
    const t = getTitle(titleId);
    const e = t && t.effect;
    if(!e) return 0;
    const lv = Math.min(levelOf(level), Math.max(1, Number(e.maxLv) || 1));
    return Math.max(0, Number(e.base || 0) + (lv - 1) * Number(e.perLv || 0));
  }
  function effectText(titleId, level){
    const t = getTitle(titleId);
    const e = t && t.effect;
    if(!e) return '';
    if(e.kind === 'lethal_guard') return '即死攻撃を' + effectPercent(titleId, level) + '%の確率で無効';
    let txt = (EFFECT_LABEL[e.kind] || e.kind) + ' +' + effectPercent(titleId, level) + '%';
    if(Number(e.perLv) > 0){
      const maxLv = Math.max(1, Number(e.maxLv) || 1);
      txt += levelOf(level) >= maxLv ? '（最大）' : '（Lv' + maxLv + 'で+' + effectPercent(titleId, maxLv) + '%）';
    }
    return txt;
  }
  // バトル側が読む倍率（装備中の称号のみ）。未ロード・未装備は全て1。
  function getBattleMultipliers(){
    const out = { hp:1, atk:1, ult:1, lethalGuard:0, titleId:'', level:0 };
    const id = state.equipped;
    const t = getTitle(id);
    if(!t || !t.effect || !state.owned.has(id)) return out;
    const lv = state.owned.get(id) || 1;
    const k = t.effect.kind;
    if(k === 'lethal_guard') out.lethalGuard = Math.min(1, effectPercent(id, lv) / 100); // 確率（0〜1）
    else if(Object.prototype.hasOwnProperty.call(out, k)) out[k] = 1 + effectPercent(id, lv) / 100;
    out.titleId = id; out.level = lv;
    return out;
  }
  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
  }
  function toast(msg){ if(typeof window.showToast==='function') window.showToast(msg); }
  function parse(data){ if(typeof data==='string'){ try{ return JSON.parse(data); }catch(_){ return null; } } return data; }

  function ensureStyle(){
    if(document.getElementById('zeraphia-title-style-v1713')) return;
    const st = document.createElement('style');
    st.id = 'zeraphia-title-style-v1713';
    st.textContent = `
      .zt-title-badge{display:inline-flex;align-items:center;gap:3px;max-width:100%;padding:1px 7px 1px 6px;border-radius:999px;
        font:700 9px/1.5 "Noto Serif JP",serif;letter-spacing:.08em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        border:1px solid #c6a466;background:linear-gradient(180deg,#fffdf7,#f3e7cf);color:#6b5132;vertical-align:middle}
      .zt-title-badge::before{content:"✦";font-size:8px;opacity:.85}
      .zt-title-badge .zt-rank{font-family:Cinzel,"Noto Serif JP",serif;font-weight:700;letter-spacing:.04em;margin-left:2px}
      .zt-title-badge.tone-reason{border-color:#d7b66a;background:linear-gradient(180deg,#fff6d9,#e8ce8f);color:#684914;box-shadow:0 0 7px rgba(214,170,70,.35)}
      /* 絶望を超えし者：既存ランクも表示可能 */
      .zt-title-badge.tone-despair{border-color:#a8305a;background:linear-gradient(180deg,#5a1530,#2a0814);color:#f6dbe5;box-shadow:0 0 6px rgba(168,48,90,.45)}
      .zt-title-badge.tone-despair.tier-t2{border-color:#d8dde6;box-shadow:0 0 0 1px rgba(216,221,230,.55) inset,0 0 7px rgba(200,210,225,.6)}
      .zt-title-badge.tone-despair.tier-t2 .zt-rank{color:#e7ecf3}
      .zt-title-badge.tone-despair.tier-t3{border-color:#e2bd62;background:linear-gradient(180deg,#6a1736,#2a0814);
        box-shadow:0 0 0 1px rgba(226,189,98,.6) inset,0 0 8px rgba(226,189,98,.55)}
      .zt-title-badge.tone-despair.tier-t3 .zt-rank,.zt-title-badge.tone-despair.tier-t3::before{color:#f3d58a}
      .zt-title-badge.tone-despair.tier-t4{border-color:#f6d77a;background:linear-gradient(180deg,#7d1a40,#30081a);color:#fff3f7;
        box-shadow:0 0 0 1px rgba(246,215,122,.85) inset,0 0 10px rgba(246,215,122,.75);animation:ztGlow 2.4s ease-in-out infinite}
      .zt-title-badge.tone-despair.tier-t4 .zt-rank,.zt-title-badge.tone-despair.tier-t4::before{color:#ffe39a}
      @keyframes ztGlow{0%,100%{box-shadow:0 0 0 1px rgba(246,215,122,.85) inset,0 0 6px rgba(246,215,122,.5)}50%{box-shadow:0 0 0 1px rgba(246,215,122,.95) inset,0 0 14px rgba(246,215,122,.95)}}
      @media (prefers-reduced-motion:reduce){.zt-title-badge.tone-despair.tier-t4{animation:none}}
      .zt-opt .zt-effect{display:block;margin:3px 0 1px;font:700 11px/1.4 "Noto Serif JP",serif;color:#8a5a12;letter-spacing:.02em}
      .zt-opt[disabled] .zt-effect{color:#9a8c78}
      .zt-title-badge.tone-savior{border-color:#c9ced6;background:linear-gradient(180deg,#ffffff,#e8ebf0);color:#4f5866}
      #hud-title{display:block;margin-top:2px;line-height:1;min-height:0}
      #hud-title:empty{display:none}
      /* build2098: 名称・称号・EXPは通常フロー。絶対配置の重なりを廃止 */
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title{
        position:relative!important;inset:auto!important;left:auto!important;right:auto!important;bottom:auto!important;
        order:2!important;display:block!important;align-self:stretch!important;box-sizing:border-box!important;
        width:100%!important;max-width:100%!important;min-width:0!important;margin:2px 0 0!important;
        padding:0!important;overflow:hidden!important;white-space:nowrap!important;
        height:15px!important;line-height:15px!important;
      }
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title:empty{display:none!important;height:0!important;margin:0!important}
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge{
        display:inline-flex;max-width:100%;box-sizing:border-box;padding:0 3px!important;
        border-width:0 0 1px!important;border-radius:0!important;background:transparent!important;
        box-shadow:none!important;animation:none!important;
        font-size:10px!important;line-height:13px!important;letter-spacing:0!important;
        text-overflow:ellipsis;vertical-align:top;text-shadow:0 1px 1px rgba(255,255,255,.85);
      }
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge::before{font-size:9px;flex:none}
      html body:not(.ui-immersive) #global-user-frame .hud-info .hv2-exp{order:3!important;margin-top:3px!important}
      @media (max-width:380px), (max-height:700px){
        html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title{height:13px!important;line-height:13px!important;margin-top:1px!important}
        html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge{font-size:9px!important;line-height:11px!important}
        html body:not(.ui-immersive) #global-user-frame .hud-info .hv2-exp{margin-top:2px!important}
      }
      @media (min-width:390px) and (min-height:800px){
        html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title{height:16px!important;line-height:16px!important;margin-top:3px!important}
        html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge{font-size:10.5px!important;line-height:14px!important}
      }
      .zt-block-title{display:block;margin-top:2px}
      .zt-block-title:empty{display:none}
      #zt-title-modal{position:fixed;inset:0;z-index:100050;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(30,22,12,.45)}
      #zt-title-modal .zt-card{width:min(360px,100%);max-height:80vh;overflow:auto;padding:18px 16px 14px;border-radius:12px;
        background:linear-gradient(180deg,#fffdf7,#f5ecda);border:1px solid #c6a466;box-shadow:0 12px 30px rgba(60,40,15,.3)}
      #zt-title-modal h2{margin:0 0 2px;text-align:center;font:700 17px/1.3 "Noto Serif JP",serif;letter-spacing:.14em;color:#3a2a18}
      #zt-title-modal .zt-sub{margin:0 0 12px;text-align:center;font:600 10px/1 Cinzel,serif;letter-spacing:.3em;color:#9c7330}
      #zt-title-modal .zt-list{display:flex;flex-direction:column;gap:8px}
      #zt-title-modal .zt-opt{display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%;padding:10px 12px;border-radius:8px;
        border:1px solid #d9c49a;background:#fffaf0;text-align:left;cursor:pointer;font:500 11px/1.5 "Noto Serif JP",serif;color:#5b4527}
      #zt-title-modal .zt-opt.is-selected{border-color:#9c7330;box-shadow:0 0 0 2px rgba(156,115,48,.35)}
      #zt-title-modal .zt-opt:disabled{opacity:.55;cursor:default}
      #zt-title-modal .zt-opt small{color:#7d6c55}
      #zt-title-modal .zt-tiers{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}
      #zt-title-modal .zt-close{display:block;margin:12px auto 0;padding:7px 24px;border-radius:999px;border:1px solid #c6a466;
        background:#fff;font:600 12px/1 "Noto Serif JP",serif;color:#5b4527;cursor:pointer}

      /* build2101: レアリティは文字でなく配色のみ（N銀 / R金 / SR虹）。昇格tierは色を変更しない。 */
      .zt-title-badge.rarity-n,
      .zt-title-badge.rarity-r,
      .zt-title-badge.rarity-sr{background-image:none;animation:none;color:#fff;border-width:1px;border-style:solid;text-shadow:0 1px 1px rgba(0,0,0,.55);box-shadow:none;max-width:100%;box-sizing:border-box}
      .zt-title-badge.rarity-n{background:linear-gradient(180deg,#7f8894,#4a535e);border-color:#cbd2db;color:#fff}
      .zt-title-badge.rarity-r{background:linear-gradient(180deg,#a77a30,#694713);border-color:#edc773;color:#fff5d8}
      .zt-title-badge.rarity-sr{background:linear-gradient(105deg,#7153a1 0%,#497ba7 24%,#408f7e 47%,#b29046 71%,#a66a9c 100%);border-color:#f4e5ff;color:#fff}
      .zt-title-badge.rarity-n .zt-rank{color:#ecf2fb}
      .zt-title-badge.rarity-r .zt-rank{color:#ffe4a0}
      .zt-title-badge.rarity-sr .zt-rank{color:#fff}
      .zt-title-badge.rarity-n.tier-t2,.zt-title-badge.rarity-r.tier-t2,.zt-title-badge.rarity-sr.tier-t2{box-shadow:inset 0 0 0 1px rgba(255,255,255,.36)}
      .zt-title-badge.rarity-n.tier-t3,.zt-title-badge.rarity-r.tier-t3,.zt-title-badge.rarity-sr.tier-t3{box-shadow:inset 0 0 0 1px rgba(255,255,255,.4),0 1px 5px rgba(80,60,50,.22)}
      .zt-title-badge.rarity-n.tier-t4,.zt-title-badge.rarity-r.tier-t4,.zt-title-badge.rarity-sr.tier-t4{box-shadow:inset 0 0 0 1px rgba(255,255,255,.55),0 0 7px rgba(155,145,175,.36);animation:none}
      /* ホームでは従来通り透明な文字表示。ただし名称とランクの文字色をレアリティで統一 */
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge.rarity-n{color:#69727d!important;border-color:#929daa!important}
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge.rarity-r{color:#926821!important;border-color:#b8964d!important}
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge.rarity-sr{color:#845aaf!important;border-color:#a18ac1!important}
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge .zt-rank{color:inherit!important}
      /* build2102: ホームの称号もレアリティ別プレートを表示。HUDの配置はそのまま。 */
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title{
        height:17px!important;min-height:17px!important;line-height:17px!important;
        overflow:visible!important;margin-top:2px!important;
      }
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge{
        display:inline-flex!important;align-items:center!important;justify-content:flex-start!important;
        width:max-content!important;max-width:100%!important;box-sizing:border-box!important;
        height:16px!important;min-height:16px!important;padding:0 6px 0 5px!important;
        border:1px solid!important;border-radius:999px!important;
        font-size:9px!important;line-height:14px!important;letter-spacing:0!important;
        color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.26)!important;
        overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;
        background-image:linear-gradient(180deg,#7f8894,#4a535e)!important;
      }
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge.rarity-n{
        background:linear-gradient(180deg,#9ba4b0,#59616f)!important;border-color:#d8dfe8!important;color:#fff!important;
      }
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge.rarity-r{
        background:linear-gradient(180deg,#cfa34e,#80591f)!important;border-color:#f2d68c!important;color:#fffaf0!important;
      }
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge.rarity-sr{
        background:linear-gradient(105deg,#815bad,#4e89b6 26%,#4c9b8a 49%,#c49c4f 72%,#b37bb5)!important;
        border-color:#e8d5f2!important;color:#fff!important;
      }
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge .zt-rank{
        color:inherit!important;flex:none!important;font-size:9px!important;
      }
      html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge::before{
        color:inherit!important;font-size:8px!important;
      }
      @media (max-width:380px), (max-height:700px){
        html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title{height:15px!important;min-height:15px!important;line-height:15px!important}
        html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge{
          height:14px!important;min-height:14px!important;padding:0 4px!important;font-size:8px!important;line-height:12px!important;
        }
      }
      @media (min-width:390px) and (min-height:800px){
        html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title{height:18px!important;min-height:18px!important;line-height:18px!important}
        html body:not(.ui-immersive) #global-user-frame .hud-info #hud-title .zt-title-badge{
          height:17px!important;min-height:17px!important;font-size:9.5px!important;line-height:15px!important;
        }
      }
      /* フレンド一覧は称号全文表示を維持 */
      #screen-friend .friend-card-title-full .zt-title-badge{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.5!important;max-width:100%!important;overflow-wrap:anywhere}
    `;
    document.head.appendChild(st);
  }

  function badgeHTML(titleId, level){
    const t = getTitle(titleId);
    if(!t) return '';
    ensureStyle();
    const lv = levelOf(level);
    const tier = getTier(titleId, lv);
    return '<span class="zt-title-badge tone-' + esc(t.tone || 'gold') + (tier ? ' tier-' + esc(tier.key) : '') +
      ' rarity-' + esc((t.rarity || 'N').toLowerCase()) + '" title="' + esc(t.desc) + '">' + esc(t.name) + '<span class="zt-rank">'+esc(roman(displayLv(titleId, lv)))+'</span>' + '</span>';
  }

  function readOwned(list){
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach(x => {
      const id = String((x && (x.title_id || x.id)) || x || '');
      if(!getTitle(id)) return;
      const lv = levelOf(x && (x.level ?? x.title_level ?? x.count));
      map.set(id, Math.max(map.get(id) || 0, lv));
    });
    return map;
  }

  async function loadMine(force){
    if(state.loading) return state.loading;
    if(state.loaded && !force) return true;
    const sb = client();
    if(!sb || typeof sb.rpc !== 'function' || !myId()) return false;
    state.loading = (async () => {
      try{
        const res = await sb.rpc('get_my_titles');
        if(res && res.error) throw res.error;
        const data = parse(res && res.data) || {};
        state.owned = readOwned(data.owned);
        const eq = String(data.equipped || '');
        state.equipped = (eq && state.owned.has(eq)) ? eq : '';
        state.loaded = true;
        state.publicCache.set(myId(), { at:Date.now(), titleId:state.equipped, level:state.owned.get(state.equipped) || 1 });
        renderHud();
        return true;
      }catch(err){
        console.warn('[Titles] load skipped', err && (err.message || err));
        return false;
      }finally{ state.loading = null; }
    })();
    return state.loading;
  }

  async function equip(titleId){
    const next = titleId ? String(titleId) : '';
    if(next && !state.owned.has(next)){ toast('この称号はまだ獲得していません'); return false; }
    const sb = client();
    if(!sb || typeof sb.rpc !== 'function'){ toast('サーバーに接続できません'); return false; }
    try{
      const res = await sb.rpc('equip_title', { p_title_id: next || null });
      if(res && res.error) throw res.error;
      const data = parse(res && res.data) || {};
      if(data.ok === false) throw new Error(data.message || '称号を変更できませんでした');
      state.equipped = next;
      state.publicCache.set(myId(), { at:Date.now(), titleId:next, level:state.owned.get(next) || 1 });
      renderHud();
      toast(next ? ('称号「' + labelOf(next, state.owned.get(next)) + '」を設定しました') : '称号を外しました');
      return true;
    }catch(err){
      console.error('[Titles] equip failed', err);
      toast(err && err.message ? err.message : '称号を変更できませんでした');
      return false;
    }
  }

  // 他プレイヤーの装備中の称号（フレンド・ランキング用）。まとめて取得し、5分キャッシュ。
  async function getPublicTitles(userIds){
    const ids = Array.from(new Set((userIds || []).map(v => String(v || '').trim().toLowerCase()).filter(Boolean)));
    const out = {};
    const need = [];
    const now = Date.now();
    ids.forEach(id => {
      if(id === myId() && state.loaded){ out[id] = { titleId:state.equipped, level:state.owned.get(state.equipped) || 1 }; return; }
      const c = state.publicCache.get(id);
      if(c && now - c.at < PUBLIC_CACHE_MS) out[id] = { titleId:c.titleId, level:c.level };
      else need.push(id);
    });
    if(need.length){
      const sb = client();
      if(sb && typeof sb.rpc === 'function'){
        try{
          const res = await sb.rpc('get_public_titles', { p_user_ids: need });
          if(res && res.error) throw res.error;
          const rows = parse(res && res.data);
          const got = {};
          (Array.isArray(rows) ? rows : []).forEach(r => {
            const uid = String(r && r.user_id || '').toLowerCase();
            const tid = String(r && r.title_id || '');
            if(uid) got[uid] = { titleId:getTitle(tid) ? tid : '', level:levelOf(r && (r.title_level ?? r.level)) };
          });
          need.forEach(id => {
            out[id] = got[id] || { titleId:'', level:1 };
            state.publicCache.set(id, { at:now, titleId:out[id].titleId, level:out[id].level });
          });
        }catch(err){
          console.warn('[Titles] public titles skipped', err && (err.message || err));
        }
      }
    }
    return out;
  }

  async function decorate(root){
    const scope = root || document;
    scope.querySelectorAll('[data-title-id]').forEach(el => {
      el.innerHTML = badgeHTML(el.getAttribute('data-title-id'), el.getAttribute('data-title-level'));
    });
    const els = Array.from(scope.querySelectorAll('[data-title-user]'));
    if(!els.length) return;
    const map = await getPublicTitles(els.map(el => el.getAttribute('data-title-user')));
    els.forEach(el => {
      const uid = String(el.getAttribute('data-title-user') || '').toLowerCase();
      const v = map[uid];
      el.innerHTML = v && v.titleId ? badgeHTML(v.titleId, v.level) : '';
    });
  }

  function renderHud(){
    ensureStyle();
    const nameEl = document.getElementById('hud-name');
    if(nameEl){
      let slot = document.getElementById('hud-title');
      if(!slot){
        slot = document.createElement('div');
        slot.id = 'hud-title';
        nameEl.insertAdjacentElement('afterend', slot);
      }
      const html = badgeHTML(state.equipped, state.owned.get(state.equipped));
      if(slot.innerHTML !== html) slot.innerHTML = html;
    }
    const setting = document.getElementById('setting-title-value');
    if(setting){
      setting.textContent = state.equipped ? labelOf(state.equipped, state.owned.get(state.equipped)) : (state.owned.size ? 'なし' : '未獲得');
    }
  }

  function closeSelector(){ document.getElementById('zt-title-modal')?.remove(); }
  async function openSelector(){
    ensureStyle();
    closeSelector();
    await loadMine(true);
    const ov = document.createElement('div');
    ov.id = 'zt-title-modal';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', '称号の設定');
    // build2184: 持っている称号だけを出す。同じ称号は最上位の段階1つだけ（下の段階の一覧は出さない）
    const list = Object.values(TITLE_MASTER).filter(t => state.owned.has(t.id)).map(t => {
      const owned = state.owned.has(t.id);
      const lv = state.owned.get(t.id) || 1;
      const nt = owned ? nextTier(t.id, lv) : null;
      const tiers = '';
      const status = owned
        ? ('獲得済み' + (nt ? '・次の昇格：' + esc(nt.label) + (t.id==='reason_knower' ? '（'+(100+(nt.min-1)*50)+'F）' : '（あと'+(nt.min-lv)+'回）') : '') + '　' + (state.equipped === t.id ? '設定中' : 'タップで設定'))
        : ('未獲得：' + esc(t.how));
      return '<button type="button" class="zt-opt' + (state.equipped === t.id ? ' is-selected' : '') + '" data-zt-equip="' + esc(t.id) + '"' + (owned ? '' : ' disabled') + '>' +
        badgeHTML(t.id, lv) +
        '<span>' + esc(t.desc) + '</span>' +
        (t.effect ? '<b class="zt-effect">効果：' + esc(effectText(t.id, lv)) + '</b>' : '') +
        '<small>' + status + '</small>' +
        tiers +
      '</button>';
    }).join('');
    ov.innerHTML =
      '<section class="zt-card">' +
        '<h2>称号</h2><p class="zt-sub">TITLE</p>' +
        '<div class="zt-list">' +
          '<button type="button" class="zt-opt' + (!state.equipped ? ' is-selected' : '') + '" data-zt-equip=""><span>なし</span><small>' + (!state.equipped ? '設定中' : '称号を表示しない') + '</small></button>' +
          list +
        '</div>' +
        '<button type="button" class="zt-close">閉じる</button>' +
      '</section>';
    ov.addEventListener('click', async e => {
      if(e.target === ov || e.target.closest('.zt-close')){ closeSelector(); return; }
      const btn = e.target.closest('[data-zt-equip]');
      if(!btn || btn.disabled) return;
      const id = btn.getAttribute('data-zt-equip') || '';
      if(id === state.equipped){ closeSelector(); return; }
      if(await equip(id)) closeSelector();
    });
    document.body.appendChild(ov);
  }

  // コンテンツ側で付与・ランクアップが確定した時に呼ぶ（表示を即時更新し、サーバーから取り直す）
  function notifyAcquired(titleId, level){
    if(!getTitle(titleId)) return;
    const id = String(titleId);
    state.owned.set(id, Math.max(state.owned.get(id) || 0, levelOf(level)));
    renderHud();
    void loadMine(true);
  }

  window.ZeraphiaTitles = Object.freeze({
    MASTER: TITLE_MASTER,
    getTitle,
    getTier,
    labelOf,
    badgeHTML,
    loadMine,
    reload: () => loadMine(true),
    equip,
    getEquipped: () => state.equipped,
    effectPercent,
    effectText,
    getBattleMultipliers,
    getLevel: id => state.owned.get(String(id || '')) || 0,
    isOwned: id => state.owned.has(String(id || '')),
    getPublicTitles,
    decorate,
    renderHud,
    openSelector,
    notifyAcquired
  });
  window.openTitleSelector = openSelector;

  function boot(attempt){
    if(myId() && client()){ void loadMine(true); return; }
    if((attempt || 0) < 100) setTimeout(() => boot((attempt || 0) + 1), 350);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(0), { once:true });
  else boot(0);
  document.addEventListener('visibilitychange', () => { if(!document.hidden && myId()) void loadMine(true); });
})();
