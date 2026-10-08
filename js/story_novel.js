// ZERAPHIA STORY NOVEL ENGINE — build1100
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
  let introTimer = 0;
  let entryTransitionTimer = 0;
  let cinematicTransitionTimers = [];
  let storyEffectTimer = 0;

  // build1095: ノベル全体の呼吸を少しゆっくりにする。
  const NOVEL_TEXT_SPEED_MS = 32;          // 旧22ms
  const NOVEL_ENTRY_FADE_MS = 190;         // 台詞送り時の間
  const NOVEL_LOCATION_FADE_MS = 320;      // 場所が変わる時の間
  const NOVEL_PHASE_EXIT_MS = 360;         // ノベル→次パートの余韻
  const NOVEL_INTRO_HOLD_MS = 2400;        // ストーリー開始タイトルをやや長めに表示
  const NOVEL_INTRO_FADE_MS = 760;         // タイトル退場も少しゆっくり
  const NOVEL_CINEMATIC_BLACK_IN_MS = 520;
  const NOVEL_CINEMATIC_LABEL_IN_MS = 360;
  const NOVEL_CINEMATIC_LABEL_HOLD_MS = 1150;
  const NOVEL_CINEMATIC_BLACK_OUT_MS = 620;

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

    // build1099:
    // シナリオ側に left / right が1つでも書かれていれば、
    // 自動判定を使わず、その指定をそのまま採用する。
    //
    // 2人:
    //   left: "アウラ", right: "エリ"
    // 1人を右:
    //   left: "", right: "アウラ"
    // 1人を左:
    //   left: "アウラ", right: ""
    // キャラなし:
    //   left: "", right: ""
    const hasExplicitCast = !!(
      entry &&
      (
        Object.prototype.hasOwnProperty.call(entry,'left') ||
        Object.prototype.hasOwnProperty.call(entry,'right')
      )
    );

    if(hasExplicitCast){
      return {
        left:String(entry.left || ''),
        right:String(entry.right || ''),
        active:current
      };
    }

    // 既存シナリオ互換。
    // left/right未指定の行だけ、従来の会話ブロック自動判定を使用する。
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
    outside_tower: 'images/scene_outside_tower.webp',
    outside_tower_enemy: 'images/scene_outside_tower_enemy.webp',
    outside_site_enemy: 'images/outside_site_enemy.webp',
    inside: 'images/scene_base.webp',
    base_departure: 'images/scene_base_02.webp',
    type_explanation: 'images/scene_type.webp',
    workbench: 'images/scene_workbench.webp',
    outside_road: 'images/scene_outside_road.webp',
    outside_noise: 'images/scene_outside_noise.webp',
    remnant_01_intro: 'images/scene_remnant_01_battle.webp',
    remnant_01_battle: 'images/scene_eri_jig_battle.webp',
    remnant_01_aruno: 'images/scene_aruno_help.webp',
    remnant_01_rip: 'images/scene_remnant_01_rip.webp',
    enemy_site: 'images/scene_enemy_site.webp',
    many_tower: 'images/scene_many_tower.webp',
    remnant_02_battle: 'images/scene_remnant_02_battle.webp',
    remnant_02_rip: 'images/scene_remnant_02_rip.webp',

    // build1215: CH03-02～04 scene backgrounds
    scene_walk: 'images/scene_walk.webp',
    scene_tower_far: 'images/scene_tower_far.webp',
    scene_tower_middle: 'images/scene_tower_middle.webp',
    scene_tower_near: 'images/scene_tower_near.webp',
    scene_in_tower: 'images/scene_in_tower.webp',
    scene_remnant_03: 'images/scene_remnant_03.webp',
    scene_remnant_03_rip: 'images/scene_remnant_03_rip.webp',
    scene_disk: 'images/scene_disk.webp',
    scene_disk_eri: 'images/scene_disk_eri.webp',
    scene_eri_white_world: 'images/scene_eri_white_world.webp',
    scene_whiteout: 'images/scene_whiteout.webp',
    scene_eri_jig: 'images/scene_eri_jig.webp',
    scene_disk_down: 'images/scene_disk_down.webp'
  });

  // A location may be an explicit scene image filename in newer chapters.
  // Resolve only safe local filenames; retain legacy Japanese location routing.
  function sceneImageForLocation(location){
    const loc=String(location||'').trim();
    if(!/^[a-zA-Z0-9_-]+\.(?:webp|png|jpe?g)$/i.test(loc)) return '';
    return 'images/'+loc;
  }

  function visibleLocationLabel(location){
    const loc=String(location||'').trim();
    return sceneImageForLocation(loc) ? '' : loc;
  }

  function backgroundFor(location, stageId){
    const loc=String(location||'').trim();
    const sid=normalizeStageId(stageId||'');
    const explicitScene=sceneImageForLocation(loc);
    if(explicitScene) return explicitScene;

    // build1097: CH01-STAGE01は敵群が浮遊している専用前線背景。
    if(sid==='shooting_ch01_01') return STORY_BG_PATHS.outside_tower_enemy;
    if(!loc) return STORY_BG_PATHS.outside_tower;

    // build1215: CH03-02～04. More specific locations must be matched first.
    if(loc.includes('白い世界・塔・内部・レムナント・消失')) return STORY_BG_PATHS.scene_remnant_03_rip;
    if(loc.includes('白い世界・塔・内部・レムナント')) return STORY_BG_PATHS.scene_remnant_03;
    if(loc.includes('白い世界・塔・内部・円盤・エリ')) return STORY_BG_PATHS.scene_disk_eri;
    if(loc.includes('白い世界・塔・内部・円盤')) return STORY_BG_PATHS.scene_disk;
    if(loc.includes('白い世界・塔・内部')) return STORY_BG_PATHS.scene_in_tower;
    if(loc.includes('白い世界・塔・近距離')) return STORY_BG_PATHS.scene_tower_near;
    if(loc.includes('白い世界・塔・中距離')) return STORY_BG_PATHS.scene_tower_middle;
    if(loc.includes('白い世界・エリ・ジグ')) return STORY_BG_PATHS.scene_eri_jig;
    if(loc.includes('白い世界・ホワイトアウト')) return STORY_BG_PATHS.scene_whiteout;
    if(loc.includes('白い世界・エリ')) return STORY_BG_PATHS.scene_eri_white_world;
    if(loc.includes('白い世界・円盤・消灯')) return STORY_BG_PATHS.scene_disk_down;
    if(loc.includes('白い世界・旅路')) return STORY_BG_PATHS.scene_walk;
    if(loc.includes('白い世界・塔')) return STORY_BG_PATHS.scene_tower_far;

    if(loc.includes('大型レムナント・登場')) return STORY_BG_PATHS.remnant_01_intro;
    if(loc.includes('大型レムナント・戦闘')) return STORY_BG_PATHS.remnant_01_battle;
    if(loc.includes('大型レムナント・アルノ登場')) return STORY_BG_PATHS.remnant_01_aruno;
    if(loc.includes('大型レムナント・討伐')) return STORY_BG_PATHS.remnant_01_rip;

    if(loc.includes('塔の並ぶ丘・大型レムナント・討伐')) return STORY_BG_PATHS.remnant_02_rip;
    if(loc.includes('塔の並ぶ丘・大型レムナント')) return STORY_BG_PATHS.remnant_02_battle;
    if(loc.includes('白い廃墟・塔の並ぶ丘')) return STORY_BG_PATHS.many_tower;
    if(loc.includes('白い廃墟・一柱目の跡地')) return STORY_BG_PATHS.enemy_site;
    if(loc.includes('一柱目の跡地')) return STORY_BG_PATHS.enemy_site;
    if(loc.includes('白い廃墟・奥地・大型レムナント予感')) return STORY_BG_PATHS.outside_noise;
    if(loc.includes('属性・説明')) return STORY_BG_PATHS.type_explanation;
    if(loc.includes('拠点・旅立ち')) return STORY_BG_PATHS.base_departure;
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
  overflow:hidden;
  background:#f4f1ea;
  font-family:"Noto Serif JP",serif;
  color:#3f3933;
}
#${ROOT_ID} .story-novel-bg{
  position:absolute;
  inset:0;
  z-index:1;
  background-position:center center;
  background-size:cover;
  background-repeat:no-repeat;
  background-color:#f4f1ea;
  opacity:1;
}
#${ROOT_ID} .story-novel-wash{
  position:absolute;
  inset:0;
  z-index:2;
  background:linear-gradient(to bottom,rgba(255,255,255,.12),rgba(247,243,236,.18) 55%,rgba(247,243,236,.44));
  pointer-events:none;
}
#${ROOT_ID} .story-novel-vignette{
  position:absolute;
  inset:0;
  z-index:3;
  box-shadow:inset 0 0 55px rgba(95,82,63,.10);
  pointer-events:none;
}
#${ROOT_ID} .story-novel-head{
  position:absolute;
  left:0; right:0; top:0;
  z-index:50;
  min-height:56px;
  display:grid;
  grid-template-columns:70px 1fr 70px;
  align-items:center;
  padding:8px 10px;
  box-sizing:border-box;
  background:linear-gradient(to bottom,rgba(247,243,236,.92),rgba(247,243,236,.58),rgba(247,243,236,0));
}
#${ROOT_ID} .story-novel-back,
#${ROOT_ID} .story-novel-skip{
  appearance:none;
  border:0;
  background:transparent;
  color:#51483f;
  font-family:"Noto Serif JP",serif;
  font-size:12px;
  letter-spacing:.08em;
  padding:10px 4px;
}
#${ROOT_ID} .story-novel-back{ grid-column:1; justify-self:start; }
#${ROOT_ID} .story-novel-head-copy{ grid-column:2; text-align:center; line-height:1.25; }
#${ROOT_ID} .story-novel-skip{ grid-column:3; justify-self:end; }
#${ROOT_ID} .story-novel-chapter{ display:block; font-size:9px; letter-spacing:.12em; opacity:.65; }
#${ROOT_ID} .story-novel-stage{ display:block; margin-top:2px; font-size:13px; font-weight:500; letter-spacing:.08em; }
#${ROOT_ID} .story-novel-location{
  position:absolute;
  top:64px; left:0; right:0;
  z-index:35;
  text-align:center;
  font-size:11px;
  letter-spacing:.10em;
  color:rgba(63,57,51,.74);
  text-shadow:0 1px 8px rgba(255,255,255,.95);
}
#${ROOT_ID} .story-novel-textbox{
  position:absolute;
  left:12px;
  right:12px;
  bottom:max(12px, env(safe-area-inset-bottom));
  z-index:40;
  min-height:126px;
  padding:16px 18px 14px;
  box-sizing:border-box;
  border-top:1px solid rgba(109,92,72,.18);
  border-bottom:1px solid rgba(109,92,72,.10);
  background:rgba(247,243,236,.94);
  backdrop-filter:blur(1.5px);
  -webkit-backdrop-filter:blur(1.5px);
}
#${ROOT_ID} .story-novel-speaker{
  min-height:18px;
  margin-bottom:7px;
  font-size:12px;
  letter-spacing:.12em;
  color:#5e5146;
}
#${ROOT_ID}.story-novel-fullscreen-scene .story-novel-textbox,
#${ROOT_ID}.story-novel-fullscreen-scene .story-novel-cast,
#${ROOT_ID}.story-novel-fullscreen-scene .story-novel-item{
  display:none !important;
}
#${ROOT_ID}.story-novel-fullscreen-scene .story-novel-bg{
  object-fit:cover;
}
#${ROOT_ID} .story-novel-dialogue{
  min-height:54px;
  font-size:15px;
  line-height:1.75;
  letter-spacing:.03em;
  white-space:pre-wrap !important;
}
#${ROOT_ID} .story-novel-tap{
  margin-top:8px;
  text-align:right;
  font-family:"Cinzel",serif;
  font-size:9px;
  letter-spacing:.14em;
  opacity:.5;
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
#${ROOT_ID} .story-novel-item{
  position:absolute;
  left:50%;
  top:clamp(195px, 31dvh, 245px);
  bottom:auto;
  z-index:39;
  width:min(36vw, 172px);
  min-width:112px;
  max-width:168px;
  display:flex;
  align-items:center;
  justify-content:center;
  pointer-events:none;
  opacity:0;
  transform:translateX(-50%);
}
#${ROOT_ID} .story-novel-item.show{
  opacity:1;
}
#${ROOT_ID} .story-novel-item img{
  display:block;
  width:100%;
  height:auto;
  object-fit:contain;
}
#${ROOT_ID} .story-novel-item.is-glow img{
  filter:
    brightness(1.28)
    drop-shadow(0 0 10px rgba(255,255,255,.88))
    drop-shadow(0 0 24px rgba(245,236,190,.62))
    drop-shadow(0 0 42px rgba(205,220,255,.34));
}
#${ROOT_ID} .story-novel-item.is-grow img{
  animation:storyNovelItemGrow .34s ease-out 1;
}
@keyframes storyNovelItemGrow{
  0%   { transform:scale(.86); }
  72%  { transform:scale(1.12); }
  100% { transform:scale(1); }
}
#${ROOT_ID} .story-novel-dialogue{
  white-space:pre-line !important;
}

#${ROOT_ID} .story-novel-intro-title{
  position:absolute;
  left:50%;
  top:47%;
  z-index:45;
  transform:translate(-50%,-50%);
  width:min(90%, 520px);
  padding:14px 18px;
  text-align:center;
  font-family:"Cinzel","Noto Serif JP",serif;
  font-weight:500;
  color:#4a4037;
  text-shadow:0 1px 10px rgba(255,255,255,.98),0 0 24px rgba(255,255,255,.90);
  opacity:0;
  transition:opacity .62s ease, transform .62s ease;
  pointer-events:none;
  will-change:opacity,transform;
}
#${ROOT_ID} .story-novel-intro-stage-no{
  display:block;
  font-size:clamp(18px,5vw,27px);
  letter-spacing:.14em;
  line-height:1.15;
  white-space:nowrap;
}
#${ROOT_ID} .story-novel-intro-stage-name{
  display:block;
  margin-top:10px;
  font-size:clamp(20px,5.7vw,32px);
  letter-spacing:.10em;
  line-height:1.25;
  white-space:nowrap;
}
#${ROOT_ID} .story-novel-intro-title::before{
  content:"";
  position:absolute;
  inset:-12px -22px;
  border-radius:999px;
  background:radial-gradient(ellipse at center, rgba(255,255,255,.92) 0%, rgba(255,255,255,.72) 42%, rgba(255,255,255,.38) 68%, rgba(255,255,255,0) 100%);
  filter:blur(16px);
  -webkit-filter:blur(16px);
  z-index:-1;
}
#${ROOT_ID} .story-novel-intro-title.show{
  opacity:1;
  transform:translate(-50%,-50%) scale(1);
}
#${ROOT_ID}.is-pre-intro .story-novel-textbox,
#${ROOT_ID}.is-pre-intro .story-novel-cast,
#${ROOT_ID}.is-pre-intro .story-novel-location{
  opacity:0 !important;
  visibility:hidden !important;
  pointer-events:none !important;
}


#${ROOT_ID} .story-novel-cinematic{
  position:absolute;
  inset:0;
  z-index:120;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#090909;
  opacity:0;
  visibility:hidden;
  pointer-events:none;
  transition:opacity ${NOVEL_CINEMATIC_BLACK_IN_MS}ms ease, visibility 0s linear ${NOVEL_CINEMATIC_BLACK_IN_MS}ms;
}
#${ROOT_ID} .story-novel-cinematic.is-black{
  opacity:1;
  visibility:visible;
  transition:opacity ${NOVEL_CINEMATIC_BLACK_IN_MS}ms ease, visibility 0s linear 0s;
}
#${ROOT_ID} .story-novel-cinematic-label{
  position:relative;
  padding:12px 30px;
  font-family:"Noto Serif JP",serif;
  font-size:clamp(18px,5.2vw,28px);
  font-weight:400;
  letter-spacing:.28em;
  color:rgba(255,255,255,.92);
  opacity:0;
  transform:translateY(5px);
  transition:opacity ${NOVEL_CINEMATIC_LABEL_IN_MS}ms ease, transform ${NOVEL_CINEMATIC_LABEL_IN_MS}ms ease;
}
#${ROOT_ID} .story-novel-cinematic-label::before,
#${ROOT_ID} .story-novel-cinematic-label::after{
  content:"";
  position:absolute;
  top:50%;
  width:34px;
  height:1px;
  background:rgba(255,255,255,.34);
}
#${ROOT_ID} .story-novel-cinematic-label::before{ right:100%; margin-right:12px; }
#${ROOT_ID} .story-novel-cinematic-label::after{ left:100%; margin-left:12px; }
#${ROOT_ID} .story-novel-cinematic.show-label .story-novel-cinematic-label{
  opacity:1;
  transform:translateY(0);
}
#${ROOT_ID}.is-cinematic-transition .story-novel-head,
#${ROOT_ID}.is-cinematic-transition .story-novel-location,
#${ROOT_ID}.is-cinematic-transition .story-novel-cast,
#${ROOT_ID}.is-cinematic-transition .story-novel-textbox{
  opacity:0 !important;
  visibility:hidden !important;
  pointer-events:none !important;
}

#${ROOT_ID} .story-novel-textbox,
#${ROOT_ID} .story-novel-cast,
#${ROOT_ID} .story-novel-location{
  transition:opacity .20s ease, transform .20s ease;
}
#${ROOT_ID}.is-entry-transition .story-novel-textbox,
#${ROOT_ID}.is-entry-transition .story-novel-cast{
  opacity:0 !important;
  transform:translateY(4px);
}
#${ROOT_ID}.is-location-transition .story-novel-bg{
  opacity:.72;
  transition:opacity .32s ease;
}
#${ROOT_ID}.is-location-transition .story-novel-textbox,
#${ROOT_ID}.is-location-transition .story-novel-cast,
#${ROOT_ID}.is-location-transition .story-novel-location{
  opacity:0 !important;
}

@keyframes storyNovelGroundRumble{
  0%   { transform:translate3d(0,0,0) scale(1.012); }
  10%  { transform:translate3d(-3px,1px,0) scale(1.012); }
  20%  { transform:translate3d(4px,-2px,0) scale(1.012); }
  30%  { transform:translate3d(-5px,2px,0) scale(1.012); }
  40%  { transform:translate3d(3px,1px,0) scale(1.012); }
  50%  { transform:translate3d(-2px,-2px,0) scale(1.012); }
  60%  { transform:translate3d(5px,2px,0) scale(1.012); }
  70%  { transform:translate3d(-4px,-1px,0) scale(1.012); }
  80%  { transform:translate3d(3px,2px,0) scale(1.012); }
  90%  { transform:translate3d(-2px,-1px,0) scale(1.012); }
  100% { transform:translate3d(0,0,0) scale(1.012); }
}
#${ROOT_ID}.is-ground-rumbling{
  transform-origin:center center;
  animation:storyNovelGroundRumble 118ms linear infinite;
  will-change:transform;
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
      <div class="story-novel-item" aria-hidden="true"><img alt=""></div>
      <div class="story-novel-intro-title" aria-hidden="true"></div>
      <div class="story-novel-cinematic" aria-hidden="true">
        <div class="story-novel-cinematic-label"></div>
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
    const targets=[
      document.getElementById('bottom-nav-shared'),
      document.getElementById('global-user-frame'),
      document.getElementById('story-screen-story'),
      document.getElementById('stage-select-modal')
    ].filter(Boolean);

    targets.forEach(function(el){
      if(hidden){
        if(el.dataset.storyPrevDisplay==null) el.dataset.storyPrevDisplay=el.style.display||'';
        el.style.display='none';
      }else{
        el.style.display=el.dataset.storyPrevDisplay||'';
        delete el.dataset.storyPrevDisplay;
      }
    });
  }

  function stopTyping(){
    if(typingTimer){
      clearInterval(typingTimer);
      typingTimer=0;
    }
  }

  function setDialogueTextWithBreaks(el, text){
    if(!el) return;
    const value=String(text == null ? '' : text);
    el.textContent='';
    const parts=value.split('\n');
    parts.forEach((part,index)=>{
      if(index>0) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(part));
    });
  }

  function resolveNovelItemImagePath(src){
    const value=String(src||'').trim();
    if(!value) return '';
    if(value.startsWith('http://') || value.startsWith('https://')) return value;
    if(value.startsWith('/') || value.startsWith('./') || value.startsWith('../') || value.startsWith('data:')) return value;
    return value.includes('/') ? value : 'images/' + value;
  }

  function completeTyping(){
    if(!session || !session.typing) return false;
    stopTyping();
    const root=ensureRoot();
    const dialogue=root.querySelector('.story-novel-dialogue');
    setDialogueTextWithBreaks(dialogue, session.fullText||'');
    session.typing=false;
    return true;
  }

  function typeText(text){
    const root=ensureRoot();
    const dialogue=root.querySelector('.story-novel-dialogue');
    stopTyping();
    session.fullText=String(text||'');
    session.typing=true;
    setDialogueTextWithBreaks(dialogue, '');

    const chars=Array.from(session.fullText);
    let i=0;
    const speed=NOVEL_TEXT_SPEED_MS;
    const tick=()=>{
      if(!session) return stopTyping();
      i=Math.min(chars.length,i+1);
      setDialogueTextWithBreaks(dialogue, chars.slice(0,i).join(''));
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

  function clearIntroTimer(){
    if(introTimer){
      clearTimeout(introTimer);
      introTimer=0;
    }
  }

  function showPreStageIntro(){
    if(!session || session.phase!=='pre') return false;

    const root=ensureRoot();
    const first=session.entries && session.entries[0] ? session.entries[0] : null;
    const location=String(first && first.location || '');
    const data=session.data || {};
    const title=root.querySelector('.story-novel-intro-title');
    const bg=root.querySelector('.story-novel-bg');

    if(bg) bg.style.backgroundImage=`url("${backgroundFor(location, session.stageId)}")`;
    applyLocationClass(root,location);

    root.classList.add('is-pre-intro');
    session.introActive=true;

    if(title){
      title.textContent='';
      const stageNo=document.createElement('span');
      stageNo.className='story-novel-intro-stage-no';
      stageNo.textContent=String(data.chapter||0)+'-'+String(data.stageNo||0);
      const stageName=document.createElement('span');
      stageName.className='story-novel-intro-stage-name';
      stageName.textContent=String(data.stageTitle||'');
      title.append(stageNo,stageName);
      title.classList.remove('show');
      title.setAttribute('aria-hidden','false');
      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>title.classList.add('show'));
      });
    }

    clearIntroTimer();
    introTimer=setTimeout(()=>{
      introTimer=0;
      if(!session || !session.introActive) return;

      if(title) title.classList.remove('show');

      setTimeout(()=>{
        if(!session) return;
        session.introActive=false;
        root.classList.remove('is-pre-intro');
        if(title) title.setAttribute('aria-hidden','true');
        renderEntry();
      },NOVEL_INTRO_FADE_MS);
    },NOVEL_INTRO_HOLD_MS);

    return true;
  }


  function clearCinematicTransitionTimers(){
    cinematicTransitionTimers.forEach(function(id){ clearTimeout(id); });
    cinematicTransitionTimers=[];
  }

  function queueCinematicTimer(fn, delay){
    const id=setTimeout(function(){
      cinematicTransitionTimers=cinematicTransitionTimers.filter(function(x){ return x!==id; });
      fn();
    },delay);
    cinematicTransitionTimers.push(id);
    return id;
  }

  function playCinematicTransition(entry){
    if(!session) return false;
    const kind=String(entry && entry.transition || '').toLowerCase();
    if(kind!=='fade_black') return false;

    const root=ensureRoot();
    const overlay=root.querySelector('.story-novel-cinematic');
    const label=root.querySelector('.story-novel-cinematic-label');
    if(!overlay || !label) return false;

    stopTyping();
    clearCinematicTransitionTimers();
    session.transitioning=true;
    root.classList.remove('is-entry-transition','is-location-transition');
    root.classList.add('is-cinematic-transition');
    // build1184: fade_black is a pure black transition.
    // Do not render transition text / decorative side rules on the black screen.
    overlay.classList.remove('is-black','show-label');
    overlay.setAttribute('aria-hidden','false');
    label.textContent='';

    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ overlay.classList.add('is-black'); });
    });

    queueCinematicTimer(function(){
      if(!session) return;
      const nextIndex=session.index+1;
      const nextEntry=session.entries[nextIndex];
      if(!nextEntry){
        overlay.classList.remove('is-black');
        root.classList.remove('is-cinematic-transition');
        overlay.setAttribute('aria-hidden','true');
        session.transitioning=false;
        finishCurrent(false);
        return;
      }

      session.index=nextIndex;
      renderEntry();
      overlay.classList.remove('is-black');

      queueCinematicTimer(function(){
        if(!session) return;
        root.classList.remove('is-cinematic-transition');
        overlay.setAttribute('aria-hidden','true');
        session.transitioning=false;
        typeText(nextEntry.text||'');
      },NOVEL_CINEMATIC_BLACK_OUT_MS);
    },NOVEL_CINEMATIC_BLACK_IN_MS + 520);

    return true;
  }

  function clearStoryEffectTimer(){
    if(storyEffectTimer){
      clearTimeout(storyEffectTimer);
      storyEffectTimer=0;
    }
  }

  function startGroundRumble(durationMs){
    const root=ensureRoot();
    const duration=Math.max(500, Math.min(5000, Number(durationMs)||1800));
    clearStoryEffectTimer();
    // Re-trigger animation even when rumble effects are consecutive.
    root.classList.remove('is-ground-rumbling');
    void root.offsetWidth;
    root.classList.add('is-ground-rumbling');
    storyEffectTimer=setTimeout(function(){
      storyEffectTimer=0;
      const currentRoot=document.getElementById(ROOT_ID);
      if(currentRoot) currentRoot.classList.remove('is-ground-rumbling');
    },duration);
  }

  function playStoryEffect(entry){
    if(!session) return false;
    const kind=String(entry && entry.effect || '').toLowerCase();
    if(kind!=='rumble') return false;

    // Text-bearing effects run in parallel with dialogue/narration.
    // Effect-only entries keep the legacy blocking/auto-advance behavior.
    if(String(entry && entry.text || '')){
      startGroundRumble(entry.durationMs);
      return false;
    }

    const root=ensureRoot();
    const duration=Math.max(500, Math.min(5000, Number(entry.durationMs)||1800));

    stopTyping();
    clearStoryEffectTimer();
    session.transitioning=true;
    root.classList.remove('is-entry-transition','is-location-transition');
    root.classList.remove('is-ground-rumbling');
    void root.offsetWidth;
    root.classList.add('is-ground-rumbling');

    storyEffectTimer=setTimeout(function(){
      storyEffectTimer=0;
      if(!session) return;
      root.classList.remove('is-ground-rumbling');
      session.transitioning=false;

      const nextIndex=session.index+1;
      if(!session.entries[nextIndex]){
        finishCurrent(false);
        return;
      }
      session.index=nextIndex;
      renderEntry();
    },duration);

    return true;
  }

  function renderEntry(){
    if(!session) return;
    const root=ensureRoot();
    const entry=session.entries[session.index];
    const activeLocation=String(entry && entry.location || '').trim();
    const activeText=String(entry && entry.text || '').trim();
    const isFullscreenScene=(activeLocation==='属性・説明' && !activeText);
    root.classList.toggle('story-novel-fullscreen-scene', isFullscreenScene);

    const textboxWrap=root.querySelector('.story-novel-textbox');
    const castWrap=root.querySelector('.story-novel-cast');
    const itemWrapForFullscreen=root.querySelector('.story-novel-item');
    if(textboxWrap) textboxWrap.style.display=isFullscreenScene ? 'none' : '';
    if(castWrap) castWrap.style.display=isFullscreenScene ? 'none' : '';
    if(itemWrapForFullscreen) itemWrapForFullscreen.style.display=isFullscreenScene ? 'none' : '';
    if(!entry){
      finishCurrent(false);
      return;
    }

    if(entry.effect){
      if(playStoryEffect(entry)) return;
    }

    if(entry.transition){
      if(playCinematicTransition(entry)) return;
    }

    const data=session.data;
    const speaker=String(entry.speaker||'');
    const location=String(entry.location||'');

    root.querySelector('.story-novel-chapter').textContent=
      'CHAPTER '+String(data.chapter||0).padStart(2,'0')+'  '+String(data.chapterTitle||'');
    root.querySelector('.story-novel-stage').textContent=
      String(data.chapter||0)+'-'+String(data.stageNo||0)+'  '+String(data.stageTitle||'');
    root.querySelector('.story-novel-location').textContent=visibleLocationLabel(location) ? '— '+visibleLocationLabel(location)+' —' : '';
    root.querySelector('.story-novel-speaker').textContent=speaker || 'NARRATION';

    const bg=root.querySelector('.story-novel-bg');
    bg.style.backgroundImage=`url("${backgroundFor(location, session.stageId)}")`;
    applyLocationClass(root,location);

    const cast=root.querySelector('.story-novel-cast');
    const leftWrap=root.querySelector('.story-novel-character.is-left');
    const rightWrap=root.querySelector('.story-novel-character.is-right');
    const leftImg=leftWrap.querySelector('img');
    const rightImg=rightWrap.querySelector('img');
    const itemWrap=root.querySelector('.story-novel-item');
    const itemImg=itemWrap ? itemWrap.querySelector('img') : null;
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

    function applyItemImage(targetEntry){
      if(!itemWrap || !itemImg) return;
      const imageName=String(targetEntry && targetEntry.itemImage || '').trim();
      const imageEffect=String(targetEntry && targetEntry.itemImageEffect || '').trim().toLowerCase();

      itemWrap.classList.remove('show','is-glow','is-grow');

      if(!imageName){
        itemImg.removeAttribute('src');
        itemImg.alt='';
        return;
      }

      const src=resolveNovelItemImagePath(imageName);
      if(!src){
        itemImg.removeAttribute('src');
        itemImg.alt='';
        return;
      }

      itemImg.src=src;
      itemImg.alt='item';
      itemImg.onerror=function(){
        itemWrap.classList.remove('show','is-glow','is-grow');
      };

      itemWrap.classList.add('show');
      if(imageEffect==='glow') itemWrap.classList.add('is-glow');
      if(imageEffect==='grow'){
        void itemWrap.offsetWidth;
        itemWrap.classList.add('is-grow');
      }
    }

    applyCharacter(leftWrap,leftImg,castInfo.left,castInfo.active===castInfo.left);
    applyCharacter(rightWrap,rightImg,castInfo.right,castInfo.active===castInfo.right);
    cast.classList.toggle('show', !!(castInfo.left || castInfo.right));
    applyItemImage(entry);

    root.classList.toggle('is-narration', !speaker);
    root.classList.toggle('has-duo', !!(castInfo.left && castInfo.right));
    root.classList.toggle('has-solo-right', !!(!castInfo.left && castInfo.right));
    session.lastLocation=location;
    typeText(entry.text||'');
  }

  function clearEntryTransitionTimer(){
    if(entryTransitionTimer){
      clearTimeout(entryTransitionTimer);
      entryTransitionTimer=0;
    }
  }

  function advance(){
    if(!session) return;
    if(session.introActive || session.transitioning) return;
    if(completeTyping()) return;

    const nextIndex=session.index+1;
    const nextEntry=session.entries[nextIndex];

    if(!nextEntry){
      finishCurrent(false);
      return;
    }

    if(nextEntry && (nextEntry.transition || nextEntry.effect)){
      session.index=nextIndex;
      renderEntry();
      return;
    }

    const root=ensureRoot();
    const currentLocation=String(session.lastLocation||'');
    const nextLocation=String(nextEntry.location||'');
    const locationChanged=currentLocation!==nextLocation;

    session.transitioning=true;
    root.classList.add(locationChanged ? 'is-location-transition' : 'is-entry-transition');

    clearEntryTransitionTimer();
    entryTransitionTimer=setTimeout(()=>{
      entryTransitionTimer=0;
      if(!session) return;

      session.index=nextIndex;
      renderEntry();

      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          root.classList.remove('is-entry-transition','is-location-transition');
          if(session) session.transitioning=false;
        });
      });
    }, locationChanged ? NOVEL_LOCATION_FADE_MS : NOVEL_ENTRY_FADE_MS);
  }

  function cleanupRoot(){
    stopTyping();
    clearIntroTimer();
    clearEntryTransitionTimer();
    clearCinematicTransitionTimers();
    clearStoryEffectTimer();
    const root=document.getElementById(ROOT_ID);
    if(root){
      root.classList.remove('show','is-pre-intro','is-entry-transition','is-location-transition','is-cinematic-transition','is-ground-rumbling');
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

    // STORY→編成画面の引き継ぎでは、ノベルを消してから次画面を作ると
    // 背面のステージ選択が一瞬だけ露出する。
    // 指定されたフローだけ、ノベルを最前面に残したまま共通UIを復元し、
    // 次画面（シューティング編成）を先に完成させてからノベルを閉じる。
    if(current.handoffBeforeNovelExit){
      setSharedUiHidden(false);
      if(typeof current.onComplete==='function') current.onComplete({skipped:!!skipped});
      cleanupRoot();
      return;
    }

    cleanupRoot();
    setSharedUiHidden(false);
    setTimeout(()=>{
      if(typeof current.onComplete==='function') current.onComplete({skipped:!!skipped});
    },NOVEL_PHASE_EXIT_MS);
  }

  function exitCurrent(){
    if(!session) return;
    const current=session;
    session=null;
    cleanupRoot();
    setSharedUiHidden(false);
    setTimeout(()=>{
      if(typeof current.onExit==='function') current.onExit();
    },NOVEL_PHASE_EXIT_MS);
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
      introActive:false,
      transitioning:false,
      lastLocation:'',
      onComplete:options && options.onComplete,
      onExit:options && options.onExit,
      handoffBeforeNovelExit:!!(options && options.handoffBeforeNovelExit)
    };

    setSharedUiHidden(true);
    root.style.display='block';
    root.style.pointerEvents='auto';
    root.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>root.classList.add('show'));

    if(phase==='pre' && showPreStageIntro()){
      return true;
    }

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
