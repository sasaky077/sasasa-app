// ZERAPHIA build1342 — 残響の塔のフルスクリーン階層選択UI
// 戦闘、週次進行、報酬、ランキングのサーバー接続は未実装。表示のために進捗を捏造しない。
(function(){
  'use strict';
  var descriptions=[
    '塔の入口。初めの一歩を踏み出す通常戦。',
    '次の階層へ。限られた戦力をどう配分するかが鍵。',
    '第一の難関。属性相性を見極めて突破する試練。',
    '束の間の平穏。出撃メンバーを温存しよう。',
    '中層の試練。敵の攻撃が激しさを増す。',
    '第二の難関。ギミックへの対応力が問われる。',
    '塔の上層。残る仲間と進む通常戦。',
    '最終試練は目前。無理な編成は禁物。',
    '第三の難関。持久力と回避能力が試される。',
    '最難関。温存した戦力のすべてを懸けて挑む。'
  ];
  var numerals=['第一層','第二層','第三層','第四層','第五層','第六層','第七層','第八層','第九層','第十層'];
  var selected=10;
  var focusBeforePanel=null;
  function render(){
    var list=document.getElementById('resonance-tower-floor-list');
    if(!list) return;
    list.textContent='';
    for(var n=10;n>=1;n--){
      var isTrial=n===3||n===6||n===9, isFinal=n===10;
      var btn=document.createElement('button');
      btn.type='button';
      btn.className='resonance-tower-floor'+(isFinal?' is-final':isTrial?' is-trial':'')+(n===selected?' is-selected':'');
      btn.dataset.floor=String(n);
      btn.setAttribute('aria-label',numerals[n-1]+'、'+(isFinal?'最難関':isTrial?'難関':'通常階層')+'。詳細を見る');
      btn.setAttribute('aria-pressed',n===selected?'true':'false');
      btn.style.setProperty('--floor-bg-position',(13+n*7)+'%');
      var num=document.createElement('span');
      num.className='resonance-tower-floor-no';
      num.textContent=String(n).padStart(2,'0')+'F';
      var copy=document.createElement('span');
      copy.className='resonance-tower-floor-copy';
      var name=document.createElement('span');
      name.className='resonance-tower-floor-name';
      name.textContent=numerals[n-1];
      var label=document.createElement('span');
      label.className='resonance-tower-floor-label';
      label.textContent=isFinal?'最深の間':isTrial?'難関':'通常階層';
      copy.appendChild(name); copy.appendChild(label);
      btn.appendChild(num); btn.appendChild(copy);
      if(isTrial){
        var trial=document.createElement('span'); trial.className='resonance-tower-trial-tag'; trial.textContent='難関';
        btn.appendChild(trial);
      }
      list.appendChild(btn);
    }
  }
  function openPanel(kind,number){
    var layer=document.getElementById('resonance-tower-panel-layer');
    if(!layer) return;
    var title=document.getElementById('resonance-tower-panel-title');
    var desc=document.getElementById('resonance-tower-panel-description');
    var kicker=document.getElementById('resonance-tower-panel-kicker');
    focusBeforePanel=kind==='floor'?document.querySelector('#resonance-tower-floor-list button[data-floor="'+number+'"]'):document.activeElement;
    if(kind==='floor'){
      title.textContent=String(number).padStart(2,'0')+'F　'+numerals[number-1];
      desc.textContent=descriptions[number-1]+' 1〜3体で挑戦する予定です。';
      kicker.textContent='ECHO TOWER / FLOOR';
    }else if(kind==='ranking'){
      title.textContent='ランキング';
      desc.textContent='残響の塔のランキングは、戦闘とサーバーの進捗管理を実装後に公開します。';
      kicker.textContent='ECHO TOWER / RANKING';
    }else{
      title.textContent='報酬一覧';
      desc.textContent='各階層の報酬は現在設計中です。確定後、ここから確認できるようにします。';
      kicker.textContent='ECHO TOWER / REWARDS';
    }
    layer.hidden=false;
    var close=layer.querySelector('.resonance-tower-panel-close');
    if(close) close.focus();
  }
  function closePanel(){
    var layer=document.getElementById('resonance-tower-panel-layer');
    if(layer) layer.hidden=true;
    if(focusBeforePanel && typeof focusBeforePanel.focus==='function' && focusBeforePanel.isConnected) focusBeforePanel.focus();
    focusBeforePanel=null;
  }
  window.openResonanceTower=function(){
    // CH03-04クリア解放判定は従来どおり。
    if(typeof window.requireChapter03ContentUnlock !== 'function' ||
       !window.requireChapter03ContentUnlock()) return;
    selected=10;
    closePanel();
    if(typeof window.showMainTab==='function') window.showMainTab('resonance-tower');
    render();
  };
  window.closeResonanceTower=function(){
    closePanel();
    if(typeof window.showMainTab==='function') window.showMainTab('main');
  };
  function init(){
    var screen=document.getElementById('screen-resonance-tower');
    var list=document.getElementById('resonance-tower-floor-list');
    if(!screen || !list || screen.dataset.towerBound==='true') return;
    screen.dataset.towerBound='true';
    list.addEventListener('click',function(e){
      var btn=e.target.closest('button[data-floor]');
      if(!btn || !list.contains(btn)) return;
      var number=Number(btn.dataset.floor);
      if(!Number.isInteger(number)||number<1||number>10) return;
      selected=number;
      render();
      openPanel('floor',number);
    });
    screen.querySelector('.resonance-tower-actions').addEventListener('click',function(e){
      var btn=e.target.closest('button[data-tower-panel]');
      if(btn) openPanel(btn.dataset.towerPanel);
    });
    var layer=document.getElementById('resonance-tower-panel-layer');
    if(layer) layer.addEventListener('click',function(e){
      if(e.target.closest('[data-tower-close]')) closePanel();
    });
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape' && layer && !layer.hidden) closePanel();
    });
    render();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
