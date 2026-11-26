/* =========================================================
   build2220: 装備中の衣装を、自分のキャラの画像すべてに反映する
   ---------------------------------------------------------
   画面ごとに通常の画像パス（images/chara_XX_panel.webp など）を直接組み立てている箇所が多く、
   衣装が反映されない画面があったため、表示された <img> と背景画像をまとめて差し替える。

   ・対象：chara_XX.webp（立ち絵）／_panel／_cut（全身）／_battle_back／_cutin
   ・装備中かつ所持中の衣装にその種類の画像がある時だけ差し替える。通常に戻したら元の画像へ戻す
   ・対象外：他のプレイヤーのキャラ（フレンド・お助け・レイドのメンバー・ランキング）
             … それぞれの人の衣装をサーバーから取って表示しているため
             ガチャ・お知らせ・ストーリー（公式の絵として見せる場所）
             バトル中のフィールド（バトル側で衣装を反映済み・毎フレーム変わるため）
   ・個別に対象外にしたい画像は data-skin-ignore を付ける
   ========================================================= */
(function(){
  'use strict';

  // build2234: 「対象外を足していく」方式をやめ、自分のキャラしか出ない場所だけを対象にする（許可リスト）。
  //  許可リストの外（フレンド・他プレイヤー・新しく増えた画面など）では、自分の衣装に差し替えない。
  //  許可リストの中でも、下の EXCLUDE（お助け・レイドのメンバー・ランキング等）は対象外のまま。
  const INCLUDE = [
    '#global-user-frame',                               // 上部のアイコン
    '#home-v2', '#screen-main',                         // ホーム
    '#screen-zukan',                                    // キャラ一覧
    '#detail-modal:not(.is-friend-character-detail)',   // 自分のキャラ詳細
    '#zs-player-profile',                               // 自分のプロフィール
    '#shooting-event-root',                             // パーティ編成・戦闘結果（お助け欄は EXCLUDE）
    '#raid-bestparty-1924',                             // レイドの自分のベストパーティ
    '#phase-odyssey-layer', '#screen-phase-odyssey',    // 位相回遊の編成
    '#screen-resonance-tower',                          // 共鳴の塔の編成
    '#screen-item',                                     // アイテム（キャラアイコン）
    '[data-skin-own]'                                   // 個別に対象にしたい場所
  ].join(',');

  const EXCLUDE = [
    // 他のプレイヤー
    '#screen-friend', '.friend-profile-detail', '#friend-profile-detail',
    '.is-friend-character-detail', // build2233: フレンドのキャラ詳細（共通のキャラ詳細モーダルを使う）
    '.zfs-overlay', '#zfs-section',
    '#daily-raid-member-list', '.dr-party-overlay',
    '.score-attack-ranking', '[data-ranking-scope]', '.zpf-popular-rank',
    // 公式の絵として見せる場所
    '#screen-summon', '#summon-result', '#summon-confirm-modal',
    '#gacha-detail-modal', '#gacha-pool-detail-modal', '#gacha-conversion-modal',
    '.notice-panel', '#notice-list',
    '.story-novel-root',
    // バトル中のフィールド
    '#shooting-arena',
    // 個別指定
    '[data-skin-ignore]'
  ].join(',');

  // images/chara_03.webp / chara_03_panel.webp / chara_112_cut.webp ...（_b_ の付いた衣装画像は対象外）
  const RE = /(^|\/)chara_(\d{1,3})(?:_(panel|cut|battle_back|cutin))?\.webp(?:[?#].*)?$/i;
  const TYPE_KEY = { panel:'panel', cut:'home', portrait:'img', battle_back:'battle', cutin:'cutin' };

  function skins(){ return window.CharacterSkins; }

  function skinPathFor(path){
    const m = String(path||'').match(RE);
    if(!m) return '';
    const S = skins();
    if(!S || typeof S.getEquippedSkinId!=='function' || typeof S.getSkin!=='function') return '';
    const id = Number(m[2]);
    const sid = S.getEquippedSkinId(id);
    if(!sid || sid==='default') return '';
    if(typeof S.isOwned==='function' && !S.isOwned(id,sid)) return '';
    const skin = S.getSkin(id,sid);
    if(!skin) return '';
    const v = skin[TYPE_KEY[m[3]||'portrait']];
    return v ? String(v) : '';
  }

  function isExcluded(el){
    try{ return !(el && el.closest && el.closest(INCLUDE)) || !!el.closest(EXCLUDE); }catch(_){ return true; }
  }

  /* ---- <img> ---- */
  function processImg(img){
    if(!img || img.tagName!=='IMG') return;
    const cur = img.getAttribute('src') || '';
    const applied = img.dataset.skinApplied || '';
    let base = '';
    if(RE.test(cur)) base = cur;                                   // 通常の画像が入っている
    else if(applied && cur===applied) base = img.dataset.skinBase||''; // 以前こちらで差し替えた画像のまま
    else { if(applied){ delete img.dataset.skinApplied; delete img.dataset.skinBase; } return; }
    if(!base) return;

    const want = (img.dataset.skinFailed===base || isExcluded(img)) ? '' : skinPathFor(base);
    if(want){
      if(cur!==want){
        img.dataset.skinBase = base;
        img.dataset.skinApplied = want;
        if(!img.dataset.skinErrBound){
          img.dataset.skinErrBound = '1';
          // 衣装画像が無い（404など）時は通常の画像へ戻し、以後その画像では差し替えない
          img.addEventListener('error',()=>{
            if(img.dataset.skinApplied && img.getAttribute('src')===img.dataset.skinApplied){
              const b = img.dataset.skinBase||'';
              img.dataset.skinFailed = b;
              delete img.dataset.skinApplied;
              if(b) img.setAttribute('src',b);
            }
          });
        }
        img.setAttribute('src',want);
      }
    }else if(applied && cur===applied){
      // 通常の衣装に戻した／対象外になった
      delete img.dataset.skinApplied;
      img.setAttribute('src',base);
      delete img.dataset.skinBase;
    }
  }

  /* ---- 背景画像（style="background-image:url(...)"） ---- */
  const BG_RE = /url\((["']?)([^"')]*chara_\d{1,3}(?:_(?:panel|cut|battle_back|cutin))?\.webp[^"')]*)\1\)/i;
  function processBg(el){
    if(!el || !el.style) return;
    const bg = el.style.backgroundImage || '';
    const applied = el.dataset.skinBgApplied || '';
    let base = '';
    const m = bg.match(BG_RE);
    if(m) base = m[2];
    else if(applied && bg.indexOf(applied)>=0) base = el.dataset.skinBgBase||'';
    else { if(applied){ delete el.dataset.skinBgApplied; delete el.dataset.skinBgBase; } return; }
    if(!base) return;
    const want = isExcluded(el) ? '' : skinPathFor(base);
    if(want){
      if(bg.indexOf(want)<0){
        el.dataset.skinBgBase = base; el.dataset.skinBgApplied = want;
        el.style.backgroundImage = bg.replace(base,want);
      }
    }else if(applied && bg.indexOf(applied)>=0){
      el.style.backgroundImage = bg.replace(applied,base);
      delete el.dataset.skinBgApplied; delete el.dataset.skinBgBase;
    }
  }

  function processTree(root){
    if(!root || root.nodeType!==1) return;
    if(root.tagName==='IMG') processImg(root);
    else if(root.style && root.style.backgroundImage) processBg(root);
    if(!root.firstElementChild) return;
    // バトル中のフィールドは丸ごと飛ばす（大量の弾・敵の追加で重くならないように）
    if(root.id==='shooting-arena') return;
    root.querySelectorAll('img').forEach(processImg);
    root.querySelectorAll('[style*="chara_"]').forEach(processBg);
  }

  function rescanAll(){ processTree(document.body); }

  /* ---- 変化の監視 ---- */
  // deep：追加された要素は中身ごと、属性の変化はその要素だけを見る
  let queue = new Map(), scheduled = false;
  function flush(){
    scheduled = false;
    const list = [...queue]; queue.clear();
    list.forEach(([n,deep])=>{
      if(!n.isConnected) return;
      if(deep) processTree(n);
      else if(n.tagName==='IMG') processImg(n);
      else processBg(n);
    });
  }
  function enqueue(n,deep){
    queue.set(n,(queue.get(n)||false)||deep);
    if(!scheduled){ scheduled = true; Promise.resolve().then(flush); }
  }
  function start(){
    const arena = ()=>document.getElementById('shooting-arena');
    const mo = new MutationObserver(records=>{
      const a = arena();
      for(const r of records){
        const t = r.target;
        if(a && (t===a || a.contains(t))) continue; // バトル中のフィールドは見ない
        if(r.type==='childList'){
          r.addedNodes.forEach(n=>{ if(n.nodeType===1) enqueue(n,true); });
        }else if(r.attributeName==='src'){
          if(t.tagName==='IMG') enqueue(t,false);
        }else if(r.attributeName==='style'){
          // 動きのある要素の style 変化は多いので、キャラ画像が絡む時だけ
          const st=t.getAttribute('style')||'';
          if(st.indexOf('chara_')>=0 || t.dataset.skinBgApplied) enqueue(t,false);
        }
      }
    });
    mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','style']});
    rescanAll();
  }

  // 衣装の読み込み完了・着替えのたびに全体を差し替え直す
  window.addEventListener('zeraphia:skins-loaded',rescanAll);
  window.addEventListener('zeraphia:skin-changed',rescanAll);

  window.SkinEverywhere = { rescan:rescanAll, skinPathFor };

  if(document.body) start();
  else document.addEventListener('DOMContentLoaded',start);
})();
