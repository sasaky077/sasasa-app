// story_engine.js
// 19号棟：ストーリー共通エンジン
// HTML側は startStory(TEST_STORY) を呼ぶだけ。

(function(){
  let currentStory = null;
  let scenes = [];
  let mapNodes = [];
  let items = [];
  let cur = 0;
  let typing = false;
  let tiv = null;
  let full = '';
  let searchStep = 0;
  let chapterShowing = false;

  function $(id){ return document.getElementById(id); }

  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

  function setMainUiVisible(visible){
    const ids = ['global-user-frame', 'bottom-nav-shared'];
    ids.forEach(function(id){
      const el = $(id);
      if(el) el.style.display = visible ? '' : 'none';
    });
  }

  function fadeOut(cb) {
    const f = $('story-fade');
    if(!f){ if(cb) cb(); return; }
    f.style.transition = 'opacity 0.7s ease';
    f.style.opacity = '1';
    setTimeout(function(){ if(cb) cb(); }, 750);
  }

  function fadeIn(cb) {
    const f = $('story-fade');
    if(!f){ if(cb) cb(); return; }
    f.style.transition = 'opacity 0.9s ease';
    setTimeout(function(){
      f.style.opacity = '0';
      if(cb) setTimeout(cb, 900);
    }, 50);
  }

  function showStoryScreen(id, cb) {
    fadeOut(function(){
      document.querySelectorAll('#story-root .story-screen').forEach(function(s){
        s.classList.remove('active');
      });
      const target = $(id);
      if(target) target.classList.add('active');
      fadeIn(cb);
    });
  }

  function buildDots() {
    const el = $('story-dots');
    if(!el) return;
    el.innerHTML = '';
    scenes.forEach(function(_, i){
      const d = document.createElement('div');
      d.className = 'story-dot' + (i === cur ? ' active' : i < cur ? ' done' : '');
      el.appendChild(d);
    });
  }

  function showScene(idx, instant) {
    if(idx >= scenes.length) return;

    const s = scenes[idx];

if(s.type === 'chapterTitle'){
  showChapterTitle(s.title || '', s.next);
  return;
}

if(s.vc === 'noise'){

  const noiseList = [
    $('story-noise-se-1'),
    $('story-noise-se-2')
  ];

  const noise =
    noiseList[Math.floor(Math.random() * noiseList.length)];

  if(noise){
    noise.currentTime = 0;
    noise.volume = 0.35;
    noise.play().catch(()=>{});
  }
}

    $('story-scene-label').textContent = s.label || '';
    $('story-bg-kanji').textContent = s.bg || '';

    const spEl = $('story-speaker');
    spEl.textContent = s.sp || s.speaker || '';
    spEl.className = 'story-speaker' + (s.vc ? ' voice' : '');

    const dlEl = $('story-dialogue');
    dlEl.className = 'story-dialogue' + (s.vc === 'voice' ? ' voice' : s.vc === 'noise' ? ' noise' : '');

    $('story-tap-hint').textContent = s.last ? 'TAP TO ENTER' : 'TAP TO CONTINUE';

    full = s.text || '';
    dlEl.textContent = '';

    if(instant) {
      dlEl.textContent = full;
      typing = false;
    } else {
      typing = true;
      let i = 0;
      if(tiv) clearInterval(tiv);
      const spd = s.vc === 'noise' ? 75 : s.vc === 'voice' ? 52 : 36;
      tiv = setInterval(function(){
        if(i < full.length) { dlEl.textContent += full[i]; i++; }
        else { clearInterval(tiv); typing = false; }
      }, spd);
    }
    buildDots();
  }

  function renderMemo(){
    const body = $('story-memo-sections');
    if(!body) return;
    body.innerHTML = '';
    (currentStory.memo || []).forEach(function(m){
      const sec = document.createElement('div');
      sec.className = 'story-memo-section';
      sec.innerHTML =
        '<div class="story-memo-section-title"></div>' +
        '<div class="story-memo-body"></div>' +
        (m.note ? '<div class="story-memo-note"></div>' : '');
      sec.querySelector('.story-memo-section-title').textContent = m.title || '';
      sec.querySelector('.story-memo-body').textContent = m.body || '';
      if(m.note) sec.querySelector('.story-memo-note').textContent = m.note;
      body.appendChild(sec);
    });
  }

  function renderMap() {
  const floor = $('story-map-floor');
  if(!floor) return;

  floor.innerHTML = '';

  const roomLabel = $('story-map-room-label');
  if(roomLabel){
    roomLabel.textContent = currentStory.roomLabel || '';
  }

  const mapTitle = $('story-map-title');
  if(mapTitle){
    mapTitle.textContent = currentStory.mapTitle || '— FLOOR MAP —';
  }

    mapNodes.forEach(function(node, i){
      const wrap = document.createElement('div');
      wrap.className = 'story-map-node';

      if(i > 0) {
        const conn = document.createElement('div');
        conn.className = 'story-map-connector' + (mapNodes[i-1].cleared ? ' cleared' : '');
        floor.appendChild(conn);
      }

      const btn = document.createElement('button');
      btn.className = 'story-map-node-btn' +
        (node.locked ? ' locked' : '') +
        (node.cleared ? ' cleared' : '') +
        (!node.locked && !node.cleared ? ' current' : '');

      btn.innerHTML =
        '<span class="story-node-icon">' + (node.icon || '') + '</span>' +
        '<span class="story-node-label">' + (node.label || '') + '</span>';

      if(!node.locked && !node.cleared && node.action) {
        btn.onclick = function(){ handleNodeTap(node); };
      }

      const name = document.createElement('div');
      name.className = 'story-map-node-name';
      name.textContent = node.name || '';

      wrap.appendChild(btn);
      wrap.appendChild(name);
      floor.appendChild(wrap);
    });
  }

  function showChapterTitle(title, next){
  chapterShowing = true;

  // story-fade とは別の専用オーバーレイを使う（story-fadeと操作が衝突するため）
  let overlay = $('story-chapter-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'story-chapter-overlay';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:#000',
      'z-index:99999',
      'opacity:0',
      'transition:opacity 0.6s ease',
      'pointer-events:none'
    ].join(';');
    document.body.appendChild(overlay);
  }

  // タイトル要素：'CHAPTER01:夢' のように : で区切られていれば2段組にする
  const titleEl = document.createElement('div');
  titleEl.className = 'story-chapter-title';
  titleEl.style.cssText = [
    'text-align:center',
    'padding:0 20px',
    'color:#fff'
  ].join(';');

  // ":" または "：" で前後を分割（前半 = チャプターラベル、後半 = サブタイトル）
  let labelText = '';
  let subText = title;
  let colonIdx = title.indexOf(':');
  let colonChar = ':';
  const fullColonIdx = title.indexOf('：');
  // 半角がない、または全角の方が先に出現するなら全角を採用
  if(colonIdx < 0 || (fullColonIdx >= 0 && fullColonIdx < colonIdx)){
    colonIdx = fullColonIdx;
    colonChar = '：';
  }
  if(colonIdx >= 0){
    labelText = title.slice(0, colonIdx) + colonChar;
    subText = title.slice(colonIdx + 1).trim();
  } else {
    labelText = '';
    subText = title;
  }

  if(labelText){
    const labelEl = document.createElement('div');
    labelEl.textContent = labelText;
    labelEl.style.cssText = [
      'font-size:18px',
      'font-weight:300',
      'letter-spacing:0.35em',
      'line-height:1.6',
      'opacity:0.85',
      'margin-bottom:18px',
      'text-shadow:0 0 10px rgba(255,255,255,0.25)'
    ].join(';');
    titleEl.appendChild(labelEl);
  }

  const subEl = document.createElement('div');
  subEl.textContent = subText;
  subEl.style.cssText = [
    'font-size:38px',
    'font-weight:300',
    'letter-spacing:0.4em',
    'line-height:1.4',
    'text-indent:0.4em',
    'text-shadow:0 0 14px rgba(255,255,255,0.35)'
  ].join(';');
  titleEl.appendChild(subEl);

  overlay.innerHTML = '';
  overlay.appendChild(titleEl);

  // フェードイン
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      overlay.style.opacity = '1';
    });
  });

  // 3000ms後：オーバーレイがまだ完全に不透明なうちに、裏の画面をマップに切り替える
  // 3000ms後：オーバーレイの下のストーリー画面を消してから探索へ
  setTimeout(function(){
    if(next === 'map') {
      // ストーリー画面を非表示
      document.querySelectorAll('#story-root .story-screen').forEach(function(s){
        s.classList.remove('active');
      });
      const root = $('story-root');
      if(root){
        root.classList.remove('active');
        root.style.display = 'none';
      }
      // 風の音を止める
      const wind = $('story-wind');
      if(wind){ wind.pause(); wind.currentTime = 0; }
      // 探索画面を即座に表示（フェードなしで）
      window.startExplore('CHAPTER_01');
    }
  }, 3000);

  // 3100ms後：裏の切替が終わってから、オーバーレイをフェードアウト開始
  setTimeout(function(){
    overlay.style.opacity = '0';
  }, 3100);

  // 3800ms後：後処理
  setTimeout(function(){
    overlay.innerHTML = '';
    chapterShowing = false;
  }, 3800);
}

  function goToMap() {

   const wind = $('story-wind');

   if(wind){
     wind.pause();
  }

  // story-fade をリセット（不可視に戻す）
  const f = $('story-fade');
  if(f){
    f.style.transition = 'none';
    f.style.opacity = '0';
    f.innerHTML = '';
    // transitionを次フレームで戻す
    requestAnimationFrame(function(){
      f.style.transition = '';
    });
  }

  // 画面を直接切り替え（fadeOut/fadeIn を介さない）
  document.querySelectorAll('#story-root .story-screen').forEach(function(s){
    s.classList.remove('active');
  });
  const target = $('story-screen-map');
  if(target) target.classList.add('active');
  renderMap();
}

  function completeSearch() {
    const searchNode = mapNodes.find(function(n){ return n.id === 'search'; });
    const battleNode = mapNodes.find(function(n){ return n.id === 'battle'; });
    if(searchNode) searchNode.cleared = true;
    if(battleNode) battleNode.locked = false;
    renderMap();
  }

  function showMemo() {
    renderMemo();
    showStoryScreen('story-screen-memo', null);
  }

  function showItem(item, onClose) {
    $('story-item-icon').textContent = item.icon || '';
    $('story-item-name').textContent = item.name || '';
    $('story-item-desc').textContent = item.desc || '';

    const popup = $('story-item-popup');
    popup.classList.add('active');

    $('story-item-ok').onclick = function(){
      popup.classList.remove('active');
      if(item.action === 'memo') showMemo();
      if(onClose) onClose();
    };
  }

  function startSearch() {
    if(searchStep === 0) {
      showItem(items[0], function(){ searchStep = 1; });
    } else if(searchStep === 1) {
      showItem(items[1], function(){
        searchStep = 2;
        completeSearch();
      });
    }
  }

  function showConfirm(message, onYes){
    let popup = $('story-confirm-popup');
    if(!popup){
      popup = document.createElement('div');
      popup.id = 'story-confirm-popup';
      popup.style.cssText = [
        'position:fixed',
        'inset:0',
        'display:none',
        'align-items:center',
        'justify-content:center',
        'background:rgba(0,0,0,0.75)',
        'z-index:10000',
        'opacity:0',
        'transition:opacity 0.25s ease'
      ].join(';');

      const box = document.createElement('div');
      box.style.cssText = [
        'background:#0a0a0a',
        'border:1px solid #555',
        'box-shadow:0 0 24px rgba(255,255,255,0.08), inset 0 0 12px rgba(0,0,0,0.6)',
        'padding:28px 24px 20px',
        'min-width:260px',
        'max-width:80vw',
        'text-align:center',
        'color:#e8e8e8',
        'font-family:inherit',
        'letter-spacing:0.1em'
      ].join(';');

      const msg = document.createElement('div');
      msg.id = 'story-confirm-msg';
      msg.style.cssText = [
        'font-size:15px',
        'line-height:1.7',
        'margin-bottom:22px',
        'white-space:pre-wrap'
      ].join(';');

      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';

      const btnNo = document.createElement('button');
      btnNo.id = 'story-confirm-no';
      btnNo.textContent = 'いいえ';
      btnNo.style.cssText = [
        'flex:1','max-width:110px','padding:10px 0',
        'background:transparent','border:1px solid #666',
        'color:#aaa','font-family:inherit',
        'letter-spacing:0.15em','cursor:pointer','font-size:13px'
      ].join(';');

      const btnYes = document.createElement('button');
      btnYes.id = 'story-confirm-yes';
      btnYes.textContent = 'はい';
      btnYes.style.cssText = [
        'flex:1','max-width:110px','padding:10px 0',
        'background:#1a1a1a','border:1px solid #c8c8c8',
        'color:#fff','font-family:inherit',
        'letter-spacing:0.15em','cursor:pointer','font-size:13px'
      ].join(';');

      btnRow.appendChild(btnNo);
      btnRow.appendChild(btnYes);
      box.appendChild(msg);
      box.appendChild(btnRow);
      popup.appendChild(box);
      document.body.appendChild(popup);
    }

    $('story-confirm-msg').textContent = message;
    popup.style.display = 'flex';
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ popup.style.opacity = '1'; });
    });

    function close(){
      popup.style.opacity = '0';
      setTimeout(function(){ popup.style.display = 'none'; }, 250);
    }

    $('story-confirm-yes').onclick = function(){ close(); if(onYes) onYes(); };
    $('story-confirm-no').onclick = function(){ close(); };
  }

  function completeEntrance(){
    const startNode = mapNodes.find(function(n){ return n.id === 'start'; });
    const searchNode = mapNodes.find(function(n){ return n.id === 'search'; });
    if(startNode){
      startNode.cleared = true;
      startNode.action = null;
    }
    if(searchNode) searchNode.locked = false;
    renderMap();
  }

  function startEntrance(){
    const entranceItem = (currentStory && currentStory.entranceItem)
      || (items && items[1]);
    if(entranceItem){
      showItem(entranceItem, function(){ completeEntrance(); });
    } else {
      completeEntrance();
    }
  }

  function handleNodeTap(node) {
    const nodeName = node.name || node.label || '';
    showConfirm(nodeName + ' へ進みますか？', function(){
      if(node.action === 'entrance') {
        startEntrance();
      } else if(node.action === 'search') {
        startSearch();
      } else if(node.action === 'battle') {
        alert('バトルノード（未実装）');
      } else if(node.action === 'rest') {
        alert('休憩ノード（未実装）');
      } else if(node.action === 'boss') {
        alert('ボスノード（未実装）');
      }
    });
  }

  window.startStory = function(story){
    if(!story){
      console.error('startStory: story data is missing');
      return;
    }
    currentStory = story;
    scenes = clone(story.scenes || []);
    mapNodes = clone(story.mapNodes || []);
    items = clone(story.items || []);
    cur = 0;
    typing = false;
    searchStep = 0;
    if(tiv) clearInterval(tiv);

    const root = $('story-root');
    if(!root){
      console.error('story-root が見つかりません');
      return;
    }
    root.classList.add('active');
    root.style.display = 'block';
    const wind = $('story-wind');

    if(wind){
     wind.volume = 0.18;
     wind.currentTime = 0;
     wind.play().catch(()=>{});
    }
    setMainUiVisible(false);

    document.querySelectorAll('#story-root .story-screen').forEach(function(s){ s.classList.remove('active'); });
    $('story-screen-story').classList.add('active');

    const f = $('story-fade');
    if(f) f.style.opacity = '1';
    showScene(0, false);
    setTimeout(function(){ if(f) f.style.opacity = '0'; }, 300);
  };

  window.storyNextScene = function(){

  if(chapterShowing) return;

  if(typing) {
    clearInterval(tiv);
    typing = false;
    $('story-dialogue').textContent = full;
    return;
  }

  const s = scenes[cur];

  // chapterTitle を先に判定（s.next === 'map' を持っているため）
  if(s && s.type === 'chapterTitle'){
    showChapterTitle(s.title || '', s.next);
    return;
  }

if(s && s.next === 'map') {
  window.startExploreWithFade('CHAPTER_01');  
  return;
}

  if(cur >= scenes.length - 1) return;

  const ni = cur + 1;
  const sectionChange =
    (scenes[cur].label || '') !== (scenes[ni].label || '');

  if(sectionChange) {
    fadeOut(function(){
      cur = ni;
      showScene(cur, false);
      fadeIn(null);
    });
  } else {
    cur = ni;
    showScene(cur, false);
  }
};

  window.storyCloseMemo = function(){
    showStoryScreen('story-screen-map', function(){
      renderMap();
      if(searchStep === 1) setTimeout(startSearch, 400);
    });
  };

  window.storyExit = function(ev){
  if(ev) ev.stopPropagation();

  const ok = confirm('CHAPTERを終了しますか？');

  if(!ok) return;

  if(tiv) clearInterval(tiv);

  const root = $('story-root');

  if(root){
    root.classList.remove('active');
    root.style.display = 'none';
  }

  const wind = $('story-wind');

if(wind){
  wind.pause();
  wind.currentTime = 0;
}

  setMainUiVisible(true);
};

})();
