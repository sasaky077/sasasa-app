/* =========================================================
   build1878 — HOME v2（キャラ主役のレイアウト）
   既存ホームのボタン（onclick・ロック・通知）はそのまま残して画面外へ退避し、
   新しいボタンは押されたら既存ボタンの click() を呼ぶだけ。通知とロックも既存ボタンから写す。
   ヘッダー（RANK・名前・コイン・結晶）と下部ナビは共通UIを見た目だけ作り替える（css/home_v2.css）。
   ========================================================= */
(function(){
  'use strict';
  var SIDE = [
    { key:'mail',   label:'お知らせ', src:'.home-notice-btn.home-type-entry', dots:['.home-notice-badge'] },
    { key:'gift',   label:'ボーナス', src:'#bonus-home-entry',  dots:['#bonus-home-entry-notice'] },
    { key:'friend', label:'フレンド', src:'#friend-home-entry', dots:['.friend-notice-dot'] },
    { key:'chest',  label:'アイテム', src:'#item-home-entry',   dots:[] },
    { key:'tree',   label:'神聖樹',   src:'#shinju-home-entry', dots:['.shinju-home-entry-badge','[class*="notice"]','[class*="badge"]'] }
  ];
  var RIGHT = [
    { key:'tower',  en:'ECHO TOWER',   label:'残響の塔',   src:'#resonance-tower-home-entry', dots:['.towa-memory-notice-dot'], art:'images/home_bg.webp' },
    { key:'swords', en:'DAILY RAID',   label:'レイドバトル',     src:'#raid-home-entry',            dots:['.raid-notice-dot'] },
    { key:'podium', en:'SCORE ATTACK', label:'スコアアタック', src:'#score-attack-home-entry',    dots:[] }
  ];
  // キャラのひと言（キャラ別のセリフが用意できるまでの共通文）
  var LINES = [
    '……おかえり。<br>次は、どこへ行こう。',
    '準備はできてる。<br>行こう、次の巡行へ。',
    '少しは休めた？<br>じゃあ、出発しよう。'
  ];
  var NAV_ICON = { 'bnav-ninmu':'story', 'bnav-zukan':'chara', 'bnav-main':'home', 'bnav-summon':'gacha', 'bnav-setting':'menu' };

  var root = null, built = false, hitCanvas = null;

  function $(sel, base){ return (base || document).querySelector(sel); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  function partner(){
    var id = 0;
    try { id = Number(window.favoriteId || 0); } catch(_){}
    var master = null;
    try {
      var api = window.ShootingCharacters;
      var m = api && (api.SHOOTING_CHARACTER_MASTER || null);
      if (m && id && m[id]) master = m[id];
      if (!master && api && typeof api.getShootingCharacterMaster === 'function') master = api.getShootingCharacterMaster(id || 1);
    } catch(_){}
    if (!master) master = { id:1, name:'エリ', homeImage:'images/chara_01_cut.webp', panelImage:'images/chara_01_panel.webp' };
    return master;
  }

  function build(){
    var main = document.getElementById('screen-main');
    if (!main || built) return;
    built = true;
    document.documentElement.classList.add('home-v2');
    root = document.createElement('div');
    root.id = 'home-v2';
    root.innerHTML =
      '<div class="hv2-bg"></div><div class="hv2-halo"></div><div class="hv2-grain"></div>' +
      '<img class="hv2-chara" alt="" decoding="async">' +
      '<nav class="hv2-side">' + SIDE.map(function(s, i){
        return '<button type="button" class="hv2-sbtn" data-i="' + i + '"><span class="hv2-hex"><img src="images/home_icon_' + s.key + '.webp" alt=""><span class="t">' + s.label + '</span></span><i class="hv2-dot" hidden></i><i class="hv2-lock" aria-hidden="true"></i></button>';
      }).join('') + '</nav>' +
      '<section class="hv2-right">' + RIGHT.map(function(s, i){
        return '<button type="button" class="hv2-rbtn" data-r="' + i + '"><img class="ic" src="images/home_icon_' + s.key + '.webp" alt=""><span><small>' + s.en + '</small>' + s.label + '</span>' +
          (s.art ? '<i class="art" style="background-image:url(' + s.art + ')"></i>' : '') + '<i class="hv2-dot" hidden></i><i class="hv2-lock" aria-hidden="true"></i></button>';
      }).join('') + '</section>' +
      '<div class="hv2-talk"><h4></h4><p></p></div>' +
      '<button type="button" class="hv2-sortie"><span class="txt"><b>出撃<i>»</i></b><small>巡行に出発</small></span><span class="shine"></span></button>';
    main.insertBefore(root, main.firstChild);

    root.querySelectorAll('.hv2-sbtn').forEach(function(b){
      b.addEventListener('click', function(){ forward(SIDE[Number(b.dataset.i)].src); });
    });
    root.querySelectorAll('.hv2-rbtn').forEach(function(b){
      b.addEventListener('click', function(){ forward(RIGHT[Number(b.dataset.r)].src); });
    });
    // 立ち絵のタップ：透明な部分は無視（不透明な画素の上だけ反応）
    var chara = root.querySelector('.hv2-chara');
    chara.addEventListener('click', function(ev){
      try {
        var r = chara.getBoundingClientRect();
        var c = hitCanvas || (hitCanvas = document.createElement('canvas'));
        c.width = 1; c.height = 1;
        var g = c.getContext('2d', { willReadFrequently:true });
        g.clearRect(0, 0, 1, 1);
        var sx = (ev.clientX - r.left) / r.width * chara.naturalWidth;
        var sy = (ev.clientY - r.top) / r.height * chara.naturalHeight;
        g.drawImage(chara, sx, sy, 1, 1, 0, 0, 1, 1);
        if (g.getImageData(0, 0, 1, 1).data[3] < 30) return;
      } catch(_){}
      nextLine();
    });
    root.querySelector('.hv2-sortie').addEventListener('click', function(){
      if (typeof window.showMainTab === 'function') window.showMainTab('ninmu');
    });
    // 下部ナビのアイコンを差し替え
    Object.keys(NAV_ICON).forEach(function(id){
      var img = document.querySelector('#' + id + ' > img');
      if (img) img.src = 'images/home_nav_' + NAV_ICON[id] + '.webp';
    });
    // ヘッダーに推しキャラの顔（ひし形）とEXPバーを足す
    var hl = document.querySelector('#global-user-frame .hud-left');
    if (hl && !hl.querySelector('.hv2-face')) {
      var face = document.createElement('span');
      face.className = 'hv2-face';
      face.innerHTML = '<img alt="">';
      hl.insertBefore(face, hl.firstChild);
      var info = hl.querySelector('.hud-info');
      if (info && !info.querySelector('.hv2-exp')) {
        var exp = document.createElement('span');
        exp.className = 'hv2-exp';
        exp.innerHTML = '<span class="bar"><i></i></span><span class="nums"><span>EXP</span><span class="v"></span></span>';
        info.appendChild(exp);
      }
    }
    // ホームを開いている間だけヘッダーを新デザインに
    var syncHome = function(){
      var on = main.classList.contains('active');
      document.documentElement.classList.toggle('hv2-home', on);
      if (on) refresh(false);
    };
    new MutationObserver(syncHome).observe(main, { attributes:true, attributeFilter:['class'] });
    syncHome();
    refresh(true);
    setInterval(function(){ if (document.documentElement.classList.contains('hv2-home')) refresh(false); }, 1500);
  }

  function forward(sel){
    var el = document.querySelector(sel);
    if (el) el.click();
  }

  function visible(el){
    if (!el || el.hidden) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    return true;
  }
  function dotState(spec){
    var src = document.querySelector(spec.src);
    if (!src) return null;
    for (var i = 0; i < spec.dots.length; i++) {
      var d = src.querySelector(spec.dots[i]) || (spec.dots[i].charAt(0) === '.' ? document.querySelector(spec.src + ' ' + spec.dots[i]) : null);
      if (d && d !== src && visible(d)) {
        var txt = String(d.textContent || '').trim();
        return /^\d+$/.test(txt) ? txt : '!';
      }
    }
    return null;
  }
  function syncButton(btn, spec){
    var src = document.querySelector(spec.src);
    var locked = !!(src && (src.classList.contains('is-ch03-locked') || src.getAttribute('aria-disabled') === 'true'));
    btn.classList.toggle('is-locked', locked);
    var dot = btn.querySelector('.hv2-dot');
    var v = locked ? null : dotState(spec);
    if (dot) { dot.hidden = !v; if (v) dot.textContent = v; }
  }

  // build1886: キャラ別のひと言（js/home_lines.js）。立ち絵タップで次のセリフへ
  var lineSet = LINES, lineIdx = 0;
  function getLines(id){
    var all = window.HOME_LINES || {};
    var list = all[Number(id)] || all.DEFAULT || LINES;
    return (Array.isArray(list) && list.length) ? list : LINES;
  }
  function nextLine(){
    if (!root || !lineSet.length) return;
    lineIdx = (lineIdx + 1) % lineSet.length;
    var talk = root.querySelector('.hv2-talk');
    var pp = root.querySelector('.hv2-talk p');
    if (!talk || !pp) return;
    talk.classList.remove('is-swap'); void talk.offsetWidth; talk.classList.add('is-swap');
    pp.innerHTML = lineSet[lineIdx];
  }

  var lastPartner = '';
  function refresh(force){
    if (!root) return;
    SIDE.forEach(function(s, i){ var b = root.querySelector('.hv2-sbtn[data-i="' + i + '"]'); if (b) syncButton(b, s); });
    RIGHT.forEach(function(s, i){ var b = root.querySelector('.hv2-rbtn[data-r="' + i + '"]'); if (b) syncButton(b, s); });
    var p = partner();
    var key = String(p.id) + '|' + (p.homeImage || '');
    if (force || key !== lastPartner) {
      lastPartner = key;
      var img = root.querySelector('.hv2-chara');
      if (img) {
        // build1879: ホーム専用の立ち絵 chara_XX_home.webp を優先。無いキャラは従来の chara_XX_cut.webp
        var homeArt = 'images/chara_' + String(p.id).padStart(2, '0') + '_home.webp';
        img.classList.remove('is-home-art', 'is-cut-art');
        img.onerror = function(){
          img.onerror = null;
          img.classList.remove('is-home-art'); img.classList.add('is-cut-art');
          if (p.homeImage) img.src = p.homeImage;
        };
        img.onload = function(){
          if (img.src.indexOf('_home.webp') < 0) return;
          img.classList.add('is-home-art');
        };
        img.src = homeArt;
      }
      var h4 = root.querySelector('.hv2-talk h4');
      var pp = root.querySelector('.hv2-talk p');
      if (h4) h4.textContent = p.name || '';
      lineSet = getLines(p.id);
      lineIdx = Math.floor(Math.random() * lineSet.length);
      if (pp) pp.innerHTML = lineSet[lineIdx];
      var fimg = document.querySelector('#global-user-frame .hv2-face img');
      if (fimg && p.panelImage) fimg.src = p.panelImage;
    }
    // EXP
    try {
      var score = Number((window.userProfile && window.userProfile.total_score) || 0);
      var bar = document.querySelector('#global-user-frame .hv2-exp .bar i');
      var vEl = document.querySelector('#global-user-frame .hv2-exp .v');
      if (typeof window.calcExpProgress === 'function') {
        var e = window.calcExpProgress(score);
        if (bar) bar.style.width = Math.max(0, Math.min(100, Number(e.pct || 0))) + '%';
        if (vEl) vEl.textContent = Number(e.current || 0).toLocaleString('ja-JP') + ' / ' + Number(e.max || 0).toLocaleString('ja-JP');
      } else {
        var circle = document.getElementById('hud-lv-circle');
        var deg = circle ? parseFloat(getComputedStyle(circle).getPropertyValue('--rank-exp')) || 0 : 0;
        if (bar) bar.style.width = Math.max(0, Math.min(100, deg / 3.6)) + '%';
      }
    } catch(_){}
  }

  window.HomeV2 = { refresh: function(){ refresh(true); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build, { once:true });
  else build();
})();
