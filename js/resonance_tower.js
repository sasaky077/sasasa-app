// ZERAPHIA build1340 — 残響の塔: CH03-04クリア解放 / 10階層プレビュー
// 進捗・使用済みキャラ・戦闘・報酬はサーバー接続前につき未実装。
(function(){
  'use strict';
  var floors = [
    ['第一層', '塔の入口。初めの一歩を踏み出す通常戦。', '通常階層'],
    ['第二層', '次の階層へ。限られた戦力をどう配分するかが鍵。', '通常階層'],
    ['第三層', '第一の難関。属性相性を見極めて突破する試練。', '難関'],
    ['第四層', '束の間の平穏。出撃メンバーを温存しよう。', '通常階層'],
    ['第五層', '中層の試練。敵の攻撃が激しさを増す。', '通常階層'],
    ['第六層', '第二の難関。ギミックへの対応力が問われる。', '難関'],
    ['第七層', '塔の上層。残る仲間と進む通常戦。', '通常階層'],
    ['第八層', '最終試練は目前。無理な編成は禁物。', '通常階層'],
    ['第九層', '第三の難関。持久力と回避能力が試される。', '難関'],
    ['第十層', '最難関。温存した戦力のすべてを懸けて挑む。', '最終試練']
  ];
  var selected=1;
  function render(){
    var list=document.getElementById('resonance-tower-floor-list');
    if(!list) return;
    list.textContent='';
    floors.forEach(function(f,i){
      var n=i+1;
      var btn=document.createElement('button');
      btn.type='button';
      btn.className='resonance-tower-floor'+(n===10?' is-final':n%3===0?' is-trial':'')+(n===selected?' is-selected':'');
      btn.setAttribute('aria-pressed',n===selected?'true':'false');
      btn.dataset.floor=String(n);
      var num=document.createElement('span');num.className='resonance-tower-floor-no';num.textContent=String(n).padStart(2,'0')+'F';
      var copy=document.createElement('span');copy.className='resonance-tower-floor-copy';
      var title=document.createElement('span');title.className='resonance-tower-floor-name';title.textContent=f[0];
      var label=document.createElement('span');label.className='resonance-tower-floor-label';label.textContent=f[2];
      copy.appendChild(title);copy.appendChild(label);btn.appendChild(num);btn.appendChild(copy);list.appendChild(btn);
    });
    var f=floors[selected-1];
    var no=document.getElementById('resonance-tower-selected-no');
    var title=document.getElementById('resonance-tower-selected-title');
    var desc=document.getElementById('resonance-tower-selected-description');
    if(no) no.textContent=String(selected).padStart(2,'0')+'F';
    if(title) title.textContent=f[0];
    if(desc) desc.textContent=f[1];
  }
  window.openResonanceTower=function(){
    // STORY 03-04 クリア後のみ入場可。既存のCH03解放判定と案内を共用。
    if(typeof window.requireChapter03ContentUnlock !== 'function' ||
       !window.requireChapter03ContentUnlock()) return;
    selected=1;
    if(typeof window.showMainTab==='function') window.showMainTab('resonance-tower');
    render();
  };
  window.closeResonanceTower=function(){
    if(typeof window.showMainTab==='function') window.showMainTab('main');
  };
  function init(){
    var list=document.getElementById('resonance-tower-floor-list');
    if(!list || list.dataset.towerBound==='true') return;
    list.dataset.towerBound='true';
    list.addEventListener('click',function(e){
      var btn=e.target.closest('button[data-floor]');
      if(!btn||!list.contains(btn)) return;
      var n=Number(btn.dataset.floor);
      if(!Number.isInteger(n)||n<1||n>10) return;
      selected=n;render();
    });
    render();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
