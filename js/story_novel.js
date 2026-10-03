// ZERAPHIA STORY NOVEL ENGINE — build1091
(function(){
  'use strict';

  const ROOT_ID = 'story-novel-root';
  const pendingPost = new Set();
  const speakerIds = Object.freeze({
    'エリ':1,
    'アウラ':3,
    'ジグ':5,
    'アルノ':20,
    'ノエル':24,
    'ミモザ':28,
    'イヴェルナ':32,
    'レオナクロス':39
  });

  let session = null;
  let typingTimer = 0;

  function normalizeStageId(stageId){
    const raw=String(stageId||'');
    if(raw.startsWith('shooting_beginner_')){
      return raw.replace(/^shooting_beginner_/, 'shooting_');
    }
    return raw;
  }

  function dataFor(stageId){
    const key=normalizeStageId(stageId);
    const all=window.ZERAPHIA_STORY_SCENARIO || {};
    return all[key] || null;
  }

  function entriesFor(stageId, phase){
    const data=dataFor(stageId);
    if(!data) return [];
    const list=data[phase] || [];
    return Array.isArray(list) ? list : [];
  }

  function hasPhase(stageId, phase){
    return entriesFor(stageId,phase).length>0;
  }

  function getCharacterPanel(name){
    const id=speakerIds[String(name||'')];
    if(!id) return '';
    try{
      const list=Array.isArray(window.CHARACTERS)?window.CHARACTERS:[];
      const c=list.find(x=>x && Number(x.id)===Number(id));
      if(c){
        return String(c.panelImg || c.panelImage || c.img || '');
      }
    }catch(_){}
    return 'images/chara_'+String(id).padStart(2,'0')+'_panel.webp';
  }

  function isDialogueEntry(entry){
    return !!(entry && entry.speaker && !entry.narration);
  }

  function buildDialogueBlock(entries,index){
    let start=index;
    let end=index;
    while(start>0 && isDialogueEntry(entries[start-1])) start-=1;
    while(end<entries.length-1 && isDialogueEntry(entries[end+1])) end+=1;
    return entries.slice(start,end+1);
  }

  function uniqueSpeakersInBlock(block){
    const out=[];
    const seen=new Set();
    (Array.isArray(block)?block:[]).forEach(entry=>{
      const name=String(entry && entry.speaker || '');
      if(!name || seen.has(name)) return;
      seen.add(name);
      out.push(name);
    });
    return out;
  }

  function resolveCast(entries,index){
    const entry=entries && entries[index];
    const current=String(entry && entry.speaker || '');
    if(!current) return {left:'', right:'', active:''};
    const block=buildDialogueBlock(entries,index);
    const speakers=uniqueSpeakersInBlock(block);
    if(speakers.length===2){
      return {
        left:speakers[0],
        right:speakers[1],
        active:current
      };
    }
    return {left:'', right:current, active:current};
  }

  const STORY_BG_PATHS = Object.freeze({
    outside_tower: 'images/outside_tower.webp',
    inside: 'images/inside.webp',
    workbench: 'images/workbench.webp',
    outside_road: 'images/outside_road.webp'
  });

  function backgroundFor(location){
    const loc=String(location||'').trim();
    if(!loc) return STORY_BG_PATHS.outside_tower;

    if(loc.includes('作業台')) return STORY_BG_PATHS.workbench;
    if(loc.includes('拠点')) return STORY_BG_PATHS.inside;
    if(loc.includes('奥地')) return STORY_BG_PATHS.outside_road;
    if(loc.includes('前線')) return STORY_BG_PATHS.outside_tower;

    // 外系ロケーションは現状 outside_tower / outside_road のどちらかへ寄せる。
    if(loc.includes('道') || loc.includes('路') || loc.includes('回廊') || loc.includes('深部')) {
      return STORY_BG_PATHS.outside_road;
    }
    if(loc.includes('白い廃墟') || loc.includes('白い世界') || loc.includes('外')) {
      return STORY_BG_PATHS.outside_tower;
    }

    return STORY_BG_PATHS.outside_tower;
  }


  function ensureInlineStyle(){
    if(document.getElementById('story-novel-inline-style')) return;
    const style=document.createElement('style');
    style.id='story-novel-inline-style';
    style.textContent=`
#${ROOT_ID}{
  position:fixed;
  inset:0;
  z-index:260500;
}
#${ROOT_ID} .story-novel-cast{
  position:absolute;
  left:0;
  right:0;
  bottom:96px;
  height:56%;
  pointer-events:none;
  z-index:22;
}
#${ROOT_ID} .story-novel-character{
  position:absolute;
  bottom:24px;
  width:min(45%, 200px);
  max-width:45%;
  display:flex;
  align-items:flex-end;
  justify-content:center;
  opacity:0;
  transform:translateY(10px) scale(.985);
  transition:opacity .22s ease, transform .22s ease, filter .22s ease;
  overflow:hidden;
}
#${ROOT_ID} .story-novel-character.is-left{
  left:10px;
}
#${ROOT_ID} .story-novel-character.is-right{
  right:10px;
}
#${ROOT_ID}.has-solo-right .story-novel-character.is-right{
  right:18px;
  width:min(48%, 215px);
  max-width:48%;
}
#${ROOT_ID}.has-solo-right .story-novel-character.is-left{
  opacity:0 !important;
}
#${ROOT_ID}.has-duo .story-novel-character{
  width:min(42%, 185px);
  max-width:42%;
}
#${ROOT_ID} .story-novel-character.show{
  opacity:.62;
}
#${ROOT_ID} .story-novel-character.show.is-active{
  opacity:1;
  transform:translateY(0) scale(1);
  filter:none;
}
#${ROOT_ID} .story-novel-character.show:not(.is-active){
  filter:grayscale(.08) brightness(.95);
}
#${ROOT_ID} .story-novel-character img{
  display:block;
  width:100%;
  height:auto;
  object-fit:contain;
  object-position:center bottom;
  -webkit-mask-image:linear-gradient(to bottom,
    rgba(0,0,0,1) 0%,
    rgba(0,0,0,1) 72%,
    rgba(0,0,0,0.95) 82%,
    rgba(0,0,0,0.72) 90%,
    rgba(0,0,0,0.35) 96%,
    rgba(0,0,0,0) 100%);
  mask-image:linear-gradient(to bottom,
    rgba(0,0,0,1) 0%,
    rgba(0,0,0,1) 72%,
    rgba(0,0,0,0.95) 82%,
    rgba(0,0,0,0.72) 90%,
    rgba(0,0,0,0.35) 96%,
    rgba(0,0,0,0) 100%);
  -webkit-mask-size:100% 100%;
  mask-size:100% 100%;
  -webkit-mask-repeat:no-repeat;
  mask-repeat:no-repeat;
}
#${ROOT_ID} .story-novel-textbox{
  position:absolute;
  left:12px;
  right:12px;
  bottom:12px;
  z-index:40;
  background:rgba(247,243,236,.94);
  backdrop-filter:blur(1.5px);
  -webkit-backdrop-filter:blur(1.5px);
}
`;
    document.head.appendChild(style);
  }

  function ensureRoot(){
    let root=document.getElementById(ROOT_ID);
    if(root) return root;

    ensureInlineStyle();

    root=document.createElement('div');
    root.id=ROOT_ID;
    root.className='story-novel-root';
    root.setAttribute('aria-hidden','true');
    root.innerHTML=`
      <div class="story-novel-bg" aria-hidden="true"></div>
      <div class="story-novel-wash" aria-hidden="true"></div>
      <div class="story-novel-vignette" aria-hidden="true"></div>
      <header class="story-novel-head">
        <button type="button" class="story-novel-back">＜戻る</button>
        <div class="story-novel-head-copy">
          <small class="story-novel-chapter"></small>
          <strong class="story-novel-stage"></strong>
        </div>
        <button type="button" class="story-novel-skip">SKIP</button>
      </header>
      <div class="story-novel-location"></div>
      <div class="story-novel-cast" aria-hidden="true">
        <div class="story-novel-character is-left"><img alt=""></div>
        <div class="story-novel-character is-right"><img alt=""></div>
      </div>
      <div class="story-novel-textbox">
        <div class="story-novel-speaker"></div>
        <div class="story-novel-dialogue"></div>
        <div class="story-novel-tap">TAP TO CONTINUE</div>
      </div>
    `;
    document.body.appendChild(root);

    root.addEventListener('click', function(e){
      if(e.target.closest('button')) return;
      advance();
    });
    root.querySelector('.story-novel-back').addEventListener('click', function(e){
      e.stopPropagation();
      exitCurrent();
    });
    root.querySelector('.story-novel-skip').addEventListener('click', function(e){
      e.stopPropagation();
      finishCurrent(true);
    });
    return root;
  }

  function setSharedUiHidden(hidden){
    const nav=document.getElementById('bottom-nav-shared');
    const frame=document.getElementById('global-user-frame');
    if(hidden){
      if(nav && nav.dataset.storyPrevDisplay==null) nav.dataset.storyPrevDisplay=nav.style.display||'';
      if(frame && frame.dataset.storyPrevDisplay==null) frame.dataset.storyPrevDisplay=frame.style.display||'';
      if(nav) nav.style.display='none';
      if(frame) frame.style.display='none';
    }else{
      if(nav){
        nav.style.display=nav.dataset.storyPrevDisplay||'';
        delete nav.dataset.storyPrevDisplay;
      }
      if(frame){
        frame.style.display=frame.dataset.storyPrevDisplay||'';
        delete frame.dataset.storyPrevDisplay;
      }
    }
  }

  function stopTyping(){
    if(typingTimer){
      clearInterval(typingTimer);
      typingTimer=0;
    }
  }

  function completeTyping(){
    if(!session || !session.typing) return false;
    stopTyping();
    const root=ensureRoot();
    const dialogue=root.querySelector('.story-novel-dialogue');
    dialogue.textContent=session.fullText||'';
    session.typing=false;
    return true;
  }

  function typeText(text){
    const root=ensureRoot();
    const dialogue=root.querySelector('.story-novel-dialogue');
    stopTyping();
    session.fullText=String(text||'');
    session.typing=true;
    dialogue.textContent='';

    const chars=Array.from(session.fullText);
    let i=0;
    const speed=22;
    const tick=()=>{
      if(!session) return stopTyping();
      i=Math.min(chars.length,i+1);
      dialogue.textContent=chars.slice(0,i).join('');
      if(i>=chars.length){
        stopTyping();
        if(session) session.typing=false;
      }
    };
    tick();
    typingTimer=setInterval(tick,speed);
  }

  function applyLocationClass(root,location){
    root.classList.remove('is-night','is-base','is-fog');
    const loc=String(location||'');
    if(loc.includes('夜') || loc.includes('深夜')) root.classList.add('is-night');
    if(loc.includes('拠点')) root.classList.add('is-base');
    if(loc.includes('霧')) root.classList.add('is-fog');
  }

  function renderEntry(){
    if(!session) return;
    const entry=session.entries[session.index];
    if(!entry){
      finishCurrent(false);
      return;
    }

    const root=ensureRoot();
    const data=session.data;
    const speaker=String(entry.speaker||'');
    const location=String(entry.location||'');

    root.querySelector('.story-novel-chapter').textContent=
      'CHAPTER '+String(data.chapter||0).padStart(2,'0')+'  '+String(data.chapterTitle||'');
    root.querySelector('.story-novel-stage').textContent=
      String(data.chapter||0)+'-'+String(data.stageNo||0)+'  '+String(data.stageTitle||'');
    root.querySelector('.story-novel-location').textContent=location ? '— '+location+' —' : '';
    root.querySelector('.story-novel-speaker').textContent=speaker || 'NARRATION';

    const bg=root.querySelector('.story-novel-bg');
    bg.style.backgroundImage=`url("${backgroundFor(location)}")`;
    applyLocationClass(root,location);

    const cast=root.querySelector('.story-novel-cast');
    const leftWrap=root.querySelector('.story-novel-character.is-left');
    const rightWrap=root.querySelector('.story-novel-character.is-right');
    const leftImg=leftWrap.querySelector('img');
    const rightImg=rightWrap.querySelector('img');
    const castInfo=resolveCast(session.entries, session.index);

    function applyCharacter(wrap,img,name,active){
      const src=name ? getCharacterPanel(name) : '';
      wrap.classList.remove('show','is-active');
      if(!src){
        img.removeAttribute('src');
        img.alt='';
        return;
      }
      wrap.classList.add('show');
      if(active) wrap.classList.add('is-active');
      img.src=src;
      img.alt=name;
      img.onerror=function(){ wrap.classList.remove('show','is-active'); };
    }

    applyCharacter(leftWrap,leftImg,castInfo.left,castInfo.active===castInfo.left);
    applyCharacter(rightWrap,rightImg,castInfo.right,castInfo.active===castInfo.right);
    cast.classList.toggle('show', !!(castInfo.left || castInfo.right));

    root.classList.toggle('is-narration', !speaker);
    root.classList.toggle('has-duo', !!(castInfo.left && castInfo.right));
    root.classList.toggle('has-solo-right', !!(!castInfo.left && castInfo.right));
    typeText(entry.text||'');
  }

  function advance(){
    if(!session) return;
    if(completeTyping()) return;
    session.index+=1;
    renderEntry();
  }

  function cleanupRoot(){
    stopTyping();
    const root=document.getElementById(ROOT_ID);
    if(root){
      root.classList.remove('show');
      root.setAttribute('aria-hidden','true');
      root.style.pointerEvents='none';

      // build1079:
      // opacityだけ消すと、透明な全画面ノベルレイヤーが編成画面の上に残り
      // 「戦闘開始」などのタップを奪ってしまう。
      // フェード完了後にdisplay:noneへ戻し、入力レイヤーも確実に解放する。
      setTimeout(function(){
        if(!session && root.getAttribute('aria-hidden')==='true'){
          root.style.display='none';
        }
      },240);
    }
  }

  function finishCurrent(skipped){
    if(!session) return;
    const current=session;
    session=null;
    cleanupRoot();
    setSharedUiHidden(false);
    setTimeout(()=>{
      if(typeof current.onComplete==='function') current.onComplete({skipped:!!skipped});
    },120);
  }

  function exitCurrent(){
    if(!session) return;
    const current=session;
    session=null;
    cleanupRoot();
    setSharedUiHidden(false);
    setTimeout(()=>{
      if(typeof current.onExit==='function') current.onExit();
    },120);
  }

  function play(stageId,phase,options){
    const data=dataFor(stageId);
    const entries=entriesFor(stageId,phase);
    if(!data || !entries.length){
      if(options && typeof options.onComplete==='function') options.onComplete({skipped:false,empty:true});
      return false;
    }

    if(session) exitCurrent();

    const root=ensureRoot();
    const back=root.querySelector('.story-novel-back');
    back.style.display=phase==='pre' ? '' : 'none';

    session={
      stageId:normalizeStageId(stageId),
      phase,
      data,
      entries,
      index:0,
      typing:false,
      fullText:'',
      onComplete:options && options.onComplete,
      onExit:options && options.onExit
    };

    setSharedUiHidden(true);
    root.style.display='block';
    root.style.pointerEvents='auto';
    root.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>root.classList.add('show'));
    renderEntry();
    return true;
  }

  function playPre(stageId,options){
    return play(stageId,'pre',options||{});
  }

  function playPost(stageId,options){
    return play(stageId,'post',options||{});
  }

  function queuePost(stageId){
    const key=normalizeStageId(stageId);
    if(hasPhase(key,'post')) pendingPost.add(key);
  }

  function consumePendingPost(stageId,onComplete){
    const key=normalizeStageId(stageId);
    if(!pendingPost.has(key) || !hasPhase(key,'post')) return false;
    pendingPost.delete(key);
    return playPost(key,{onComplete:onComplete,onExit:onComplete});
  }

  window.addEventListener('shooting-stage-result', function(event){
    const d=event && event.detail ? event.detail : {};
    if(d.win && d.stageId) queuePost(d.stageId);
  });

  window.StoryNovel=Object.freeze({
    normalizeStageId,
    dataFor,
    hasPre:(id)=>hasPhase(id,'pre'),
    hasPost:(id)=>hasPhase(id,'post'),
    playPre,
    playPost,
    queuePost,
    consumePendingPost
  });
})();
