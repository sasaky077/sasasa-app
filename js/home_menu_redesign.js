/* =========================================================
   build1448 — HOME SIDE MENU redesign (icon + label + chevron + rule)
   既存のホームメニューボタン（onclick・通知ドット・ロック表示）はそのまま使い、
   ボタンの中に新しい表示レイヤー .hm2-body を1つ追加するだけ。
   旧「頭文字が大きい文字組み」(.home-type-letter-layer) は CSS で非表示。
   神聖樹ボタンは shinju.js が innerHTML を書き換えるため、消えたら作り直す。
   ========================================================= */
(function(){
  'use strict';

  var SPECS = [
    { sel:'.home-notice-btn.home-type-entry', key:'message', side:'right' },
    { sel:'#shinju-home-entry',               key:'tree',    side:'right' },
    { sel:'#item-home-entry',                 key:'item',    side:'right' },
    { sel:'#score-attack-home-entry',         key:'score',   side:'right' },
    { sel:'#bonus-home-entry',                key:'bonus',   side:'left'  },
    { sel:'#friend-home-entry',               key:'friend',  side:'left'  },
    { sel:'#raid-home-entry',                 key:'raid',    side:'left'  },
    { sel:'#resonance-tower-home-entry',      key:'tower',   side:'left'  }
  ];

  function labelOf(btn){
    var head = btn.getAttribute('data-home-head') || '';
    var rest = btn.getAttribute('data-home-rest') || '';
    return { head:head, rest:String(rest).replace(/[\r\n\s　]+/g,'') };
  }

  function build(btn, spec){
    var t = labelOf(btn);
    var body = document.createElement('span');
    body.className = 'hm2-body';
    body.setAttribute('aria-hidden','true');

    var icon = document.createElement('span');
    icon.className = 'hm2-icon';
    body.appendChild(icon);

    var row = document.createElement('span');
    row.className = 'hm2-row';

    var label = document.createElement('span');
    label.className = 'hm2-label';
    if(spec.key === 'tower'){
      var b = document.createElement('b');
      b.className = 'hm2-label-head';
      b.textContent = t.head;
      label.appendChild(b);
      label.appendChild(document.createTextNode(t.rest));
    }else{
      label.textContent = t.head + t.rest;
    }
    row.appendChild(label);

    var chev = document.createElement('span');
    chev.className = 'hm2-chev';
    row.appendChild(chev);
    body.appendChild(row);

    var rule = document.createElement('span');
    rule.className = 'hm2-rule';
    body.appendChild(rule);

    // 通知アンカー・ロック表示より下の層に置く（先頭へ挿入）
    btn.insertBefore(body, btn.firstChild);
  }

  function ensure(spec){
    var btn = document.querySelector('#screen-main ' + spec.sel);
    if(!btn) return;
    btn.classList.add('hm2', 'hm2--' + spec.key, 'hm2--' + spec.side);
    if(!btn.querySelector(':scope > .hm2-body')) build(btn, spec);
  }

  function ensureAll(){ SPECS.forEach(ensure); }

  var scheduled = false;
  function schedule(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(function(){ scheduled = false; ensureAll(); });
  }

  function install(){
    ensureAll();
    var screen = document.getElementById('screen-main');
    if(screen){
      screen.classList.add('hm2-ready');
      SPECS.forEach(function(spec){
        var btn = screen.querySelector(spec.sel);
        if(!btn || btn.dataset.hm2Observed) return;
        btn.dataset.hm2Observed = '1';
        new MutationObserver(function(){
          if(!btn.querySelector(':scope > .hm2-body')) schedule();
        }).observe(btn, { childList:true });
      });
    }
    window.addEventListener('pageshow', schedule);
    setTimeout(ensureAll, 0);
    setTimeout(ensureAll, 500);
    setTimeout(ensureAll, 1500);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', install, { once:true });
  }else{
    install();
  }
})();
