/* =========================================================
   build1910 — キャラのお気に入り（★）
   ・詳細画面の立ち絵右上の☆/★ボタンで登録・解除
   ・キャラ一覧のカードを長押し（0.5秒）でも登録・解除
   ・絞り込みの「お気に入りのみ」で★のキャラだけ表示（index.html 側）
   保存先：この端末（localStorage）。ユーザーIDごとに分けて保存する。
   ※ ホームのキャラ設定（favoriteId）とは別物。
   ========================================================= */
(function(){
  'use strict';
  var LONG_PRESS_MS = 500;
  var MOVE_TOLERANCE = 10;

  function storageKey(){
    var uid = '';
    try { uid = window.userId || ''; } catch(_){}
    return 'zeraphia_fav_chars:' + (uid || 'guest');
  }

  var cacheKey = null;
  var cache = null;
  function load(){
    var key = storageKey();
    if(cache && cacheKey === key) return cache;
    var list = [];
    try {
      var raw = localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : [];
      if(Array.isArray(parsed)) list = parsed.map(Number).filter(function(n){ return n > 0; });
    } catch(_){}
    cacheKey = key;
    cache = new Set(list);
    return cache;
  }
  function save(){
    try { localStorage.setItem(storageKey(), JSON.stringify(Array.from(load()))); } catch(_){}
  }

  function has(id){ return load().has(Number(id)); }
  function set(id, on){
    var s = load(); id = Number(id);
    if(!(id > 0)) return false;
    if(on) s.add(id); else s.delete(id);
    save();
    return on;
  }
  function toggle(id){ return set(id, !has(id)); }

  function detailButtonHTML(id){
    var on = has(id);
    return '<button type="button" class="cd-fav-toggle' + (on ? ' is-on' : '') + '" data-chara-id="' + Number(id) + '"' +
      ' aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="お気に入り"' +
      ' onclick="event.stopPropagation();CharaFavorites.onDetailTap(this)">' + (on ? '★' : '☆') + '</button>';
  }

  // ---- 表示の更新 ----
  function refreshCard(id, on){
    var cards = document.querySelectorAll('#box-grid .primoa-index-card[data-chara-id="' + Number(id) + '"]');
    Array.prototype.forEach.call(cards, function(card){
      card.classList.toggle('is-fav', on);
      var star = card.querySelector('.zchar-fav-star');
      if(star && on){ star.classList.remove('is-pop'); void star.offsetWidth; star.classList.add('is-pop'); }
    });
  }
  function refreshDetail(btn, on){
    if(!btn) return;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = on ? '★' : '☆';
    btn.classList.remove('is-pop'); void btn.offsetWidth; btn.classList.add('is-pop');
  }

  var toastTimer = null;
  function toast(text){
    var el = document.getElementById('chara-fav-toast');
    if(!el){
      el = document.createElement('div');
      el.id = 'chara-fav-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.remove('is-show'); void el.offsetWidth; el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ el.classList.remove('is-show'); }, 1300);
  }

  function afterChange(id, on){
    refreshCard(id, on);
    toast(on ? '★ お気に入りに追加しました' : 'お気に入りを解除しました');
    // 「お気に入りのみ」表示中に外したら一覧から消す
    try {
      if(!on && window.zukanIndexFilter && zukanIndexFilter.favOnly && window.currentZukanDetailCharaId == null && typeof renderBox === 'function'){
        renderBox();
      }
    } catch(_){}
  }

  function onDetailTap(btn){
    var id = Number(btn && btn.getAttribute('data-chara-id'));
    if(!(id > 0)) return;
    var on = toggle(id);
    refreshDetail(btn, on);
    afterChange(id, on);
  }

  // ---- 一覧カードの長押し ----
  var press = null;
  var suppressClickUntil = 0;

  function cancelPress(){
    if(press){ clearTimeout(press.timer); if(press.card) press.card.classList.remove('is-pressing'); }
    press = null;
  }

  document.addEventListener('pointerdown', function(e){
    if(e.button != null && e.button !== 0) return;
    var card = e.target && e.target.closest && e.target.closest('#box-grid .primoa-index-card.is-owned[data-chara-id]');
    if(!card) return;
    cancelPress();
    press = { card: card, x: e.clientX, y: e.clientY, id: Number(card.getAttribute('data-chara-id')) };
    card.classList.add('is-pressing');
    press.timer = setTimeout(function(){
      if(!press) return;
      var id = press.id;
      card.classList.remove('is-pressing');
      press = null;
      suppressClickUntil = Date.now() + 700;
      var on = toggle(id);
      try { if(navigator.vibrate) navigator.vibrate(12); } catch(_){}
      afterChange(id, on);
    }, LONG_PRESS_MS);
  }, { passive: true });

  document.addEventListener('pointermove', function(e){
    if(!press) return;
    if(Math.abs(e.clientX - press.x) > MOVE_TOLERANCE || Math.abs(e.clientY - press.y) > MOVE_TOLERANCE) cancelPress();
  }, { passive: true });
  ['pointerup', 'pointercancel', 'scroll'].forEach(function(type){
    document.addEventListener(type, cancelPress, { passive: true, capture: type === 'scroll' });
  });

  // 長押しの直後の click（詳細を開く）を止める
  document.addEventListener('click', function(e){
    if(Date.now() > suppressClickUntil) return;
    var card = e.target && e.target.closest && e.target.closest('#box-grid .primoa-index-card');
    if(!card) return;
    suppressClickUntil = 0;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  // iOS の長押しメニュー・選択を出さない
  document.addEventListener('contextmenu', function(e){
    if(e.target && e.target.closest && e.target.closest('#box-grid .primoa-index-card')) e.preventDefault();
  });

  window.CharaFavorites = {
    has: has, set: set, toggle: toggle,
    list: function(){ return Array.from(load()); },
    detailButtonHTML: detailButtonHTML,
    onDetailTap: onDetailTap
  };
})();
