(()=>{'use strict';
/* =====================================================================
   ZERAPHIA STORY RPG — 全章共通エンジン（章ごとの違いは chapters/chNN.js だけ）
   床=継ぎ目なしタイル / 遺跡=部品(objects.js) / 配置・会話・目的=chapters/chNN.js
   当たり判定は部品の blocks から自動生成。?debug=1 で配置エディタ
   ===================================================================== */
const T=50, VIEW_W=950, VIEW_H=1655;            // 1マス / 画面に収める基準サイズ(モック)
const CH=window.ZERAPHIA_CHAPTER||{};   // 章データ（chapters/chNN.js）
const TYPES=window.ZERAPHIA_OBJECT_TYPES, MAPS=CH.maps||{};
const QUESTS=CH.quests||[];   // ミッション
const CH_NO=Number(CH.chapter)||0, CH_TITLE=CH.title||'';
const START_MAP=MAPS[CH.startMap]?CH.startMap:Object.keys(MAPS)[0];
const SPRITE={ player:{size:218, foot:.93},
  npc:{size:272, foot:480/512} };   // npc = 変換スクリプト規格(512x512・足元y=480)の立ち絵
const SAVE_KEY=CH.saveKey||`zeraphia_ch${CH_NO}_rpg_v1`, EDIT_KEY=CH.editKey||`zeraphia_ch${CH_NO}_editor_v1`;
// 見た目の既定値（章 → マップの順で上書きできる）
const DEF_THEME={ floor:'images/floor_tile.webp', horizon:'images/horizon.webp', castle:'images/far_castle.webp' };
const themeOf=(m,k)=>(m&&m.theme&&m.theme[k])||(CH.theme&&CH.theme[k])||DEF_THEME[k];
// 本編（親ページ）の関数。新しい名前を優先し、旧CH10専用の名前にも対応
function parentFn(...names){ try{ if(window.parent===window) return null; for(const n of names) if(typeof window.parent[n]==='function') return window.parent[n].bind(window.parent); }catch(_){} return null; }
const TILE_DURATION=.24, ANIM_INTERVAL=.13, STEP_BOUNCE=5;
const WALK_SEQUENCE=['idle','walk1','idle','walk2'];

const $=id=>document.getElementById(id);
const shell=$('shell'), canvas=$('world'), fx=$('fx'), fctx=fx.getContext('2d');
let ctx=canvas.getContext('2d',{alpha:false});
document.title=`ZERAPHIA CHAPTER ${CH_NO}`;
{ const sr=document.querySelector('#top .sr-only'); if(sr) sr.textContent=`STORY ${CH_NO} ${CH_TITLE} ZERAPHIA CHAPTER ${CH_NO}`;
  const hs=document.querySelector('.rpg-novel-head-center span'); if(hs) hs.textContent=`CHAPTER ${CH_NO}  ${CH_TITLE}`; 
  // ヘッダーの章表示（画像には文字を入れず、ここで書く）
  const st=document.getElementById('hdr-story'); if(st) st.innerHTML=`<b>STORY ${CH_NO}</b><span>${String(CH_TITLE).replace(/[&<>]/g,'')}</span>`;
  const cl=document.getElementById('hdr-chapter'); if(cl) cl.innerHTML=`<span>ZERAPHIA</span><span>CHAPTER ${CH_NO}</span>`; }
const placeEl=$('place'), questEl=$('quest'), dialog=$('dialog'), speaker=$('speaker'), line=$('line'), overlay=$('overlay');

let W=360,H=640,dpr=1,clock=0,last=0,enabled=false,dialogQueue=[],dialogEnd=null,toastUntil=0;
let joystick={x:0,y:0}, route=null, tapMark=null;
let debug=/[?&]debug=1/.test(location.search), noclip=false;

/* ---------- images ---------- */
const ready=im=>im&&im.complete&&im.naturalWidth>0;
const loadImg=src=>{ const im=new Image(); im.src=src; return im; };
const assets={};
const PLAYER_SPRITE=CH.player||'chara_01';   // 歩きの画像 images/<player>_<向き>_<idle|walk1|walk2>.webp
for(const dir of ['up','down','left','right']) for(const anim of ['idle','walk1','walk2']) assets[dir+'_'+anim]=loadImg(`images/${PLAYER_SPRITE}_${dir}_${anim}.webp`);
const npcImages={}; const npcImg=src=>npcImages[src]||(npcImages[src]=loadImg(src));
// 床・地平線・遠景はマップごとに差し替えられる（loadMap で切り替え）
let floorImg=null, horizonImg=null, castleImg=null;
function applyTheme(){
  const f=npcImg(themeOf(M,'floor')); if(f!==floorImg){ floorImg=f; floorPattern=null; }
  horizonImg=npcImg(themeOf(M,'horizon'));
  castleImg=npcImg((M.castle&&M.castle.img)||themeOf(M,'castle'));
}
for(const k in TYPES) TYPES[k].image=loadImg(TYPES[k].img);
let floorPattern=null;

/* ---------- object geometry (flip対応・奥行きパーツの切り出し) ---------- */
function mirrorRect(r){ return [-(r[0]+r[2]),r[1],r[2],r[3]]; }
function geom(type,flip){
  const t=TYPES[type]; if(!flip) return t;
  if(!t._flip) t._flip={...t, ox:-(t.ox+t.w), blocks:t.blocks.map(mirrorRect), opens:(t.opens||[]).map(mirrorRect),
    parts:t.parts.map(p=>({rect:mirrorRect(p.rect),base:p.base})), shadow:[-t.shadow[0],...t.shadow.slice(1)], gate:t.gate&&[-t.gate[0],t.gate[1]] };
  return t._flip;
}
/* ---------- 描画キャッシュ ----------
   画像を「画面の実ピクセル(K = ワールド→端末px)」に縮小した状態で1回だけ作り、毎フレームは等倍で貼るだけにする。
   毎フレーム大きな画像を縮小描画すると、スマホでは重くなる（カクつきの主因）。 */
let K=1, cacheK=0;
const scaledCache=new Map();
function scaled(key,src,w,h,flip){
  const ck=key+'|'+(flip?1:0)+'|'+w+'x'+h; let c=scaledCache.get(ck); if(c) return c;
  if(!src||(src instanceof HTMLImageElement&&!ready(src))) return null;
  c=document.createElement('canvas'); c.width=Math.max(1,Math.round(w*K)); c.height=Math.max(1,Math.round(h*K));
  const g=c.getContext('2d'); g.imageSmoothingQuality='high'; if(flip){ g.translate(c.width,0); g.scale(-1,1); } g.drawImage(src,0,0,c.width,c.height);
  scaledCache.set(ck,c); return c;
}
function shadowSprite(rx,ry,alpha){
  const ck='sh|'+rx+'|'+ry+'|'+alpha; let c=scaledCache.get(ck); if(c) return c;
  c=document.createElement('canvas'); c.width=Math.max(2,Math.round(rx*2*K)); c.height=Math.max(2,Math.round(ry*2*K));
  const g=c.getContext('2d'); g.translate(c.width/2,c.height/2); g.scale(1,c.height/c.width);
  const R=c.width/2, grd=g.createRadialGradient(0,0,0,0,0,R); grd.addColorStop(0,`rgba(70,64,92,${alpha})`); grd.addColorStop(1,'rgba(70,64,92,0)');
  g.fillStyle=grd; g.beginPath(); g.arc(0,0,R,0,7); g.fill(); scaledCache.set(ck,c); return c;
}
const partCache=new Map();
function checkCacheScale(){ if(Math.abs(K-cacheK)>0.002){ scaledCache.clear(); partCache.clear(); floorPattern=null; cacheK=K; } }
function partCanvases(type,flip){ // → [{c, base}] 画像を「手前に来る部分」と「残り」に分割
  const key=type+(flip?'~':''); if(partCache.has(key)) return partCache.get(key);
  const t=TYPES[type], g=geom(type,flip); if(!ready(t.image)) return null;
  const iw=t.image.naturalWidth, ih=t.image.naturalHeight, k=iw/g.w;
  const src=document.createElement('canvas'); src.width=iw; src.height=ih; const sg=src.getContext('2d');
  if(flip){ sg.translate(iw,0); sg.scale(-1,1); } sg.drawImage(t.image,0,0);
  const toPx=r=>[(r[0]-g.ox)*k,(r[1]-g.oy)*k,r[2]*k,r[3]*k];
  const make=(rects,invert)=>{ const c=document.createElement('canvas'); c.width=iw; c.height=ih; const cg=c.getContext('2d'); cg.beginPath(); if(invert) cg.rect(0,0,iw,ih); for(const r of rects) cg.rect(...toPx(r)); cg.clip(invert?'evenodd':'nonzero'); cg.drawImage(src,0,0); return c; };
  const down=c=>{ const d=document.createElement('canvas'); d.width=Math.max(1,Math.round(g.w*K)); d.height=Math.max(1,Math.round(g.h*K)); const dg=d.getContext('2d'); dg.imageSmoothingQuality='high'; dg.drawImage(c,0,0,d.width,d.height); return d; };
  const out=g.parts.map(p=>({c:down(make([p.rect],false)),base:p.base}));
  out.push({c:down(g.parts.length?make(g.parts.map(p=>p.rect),true):src), base:0});
  partCache.set(key,out); return out;
}

/* ---------- maps / collision ---------- */
let editState={}; try{ editState=JSON.parse(localStorage.getItem(EDIT_KEY)||'{}')||{}; }catch(_){}
function mapData(name){ const m=MAPS[name]; if(debug&&editState[name]) return {...m,...editState[name]}; return m; }
let mapName=START_MAP, M=null, COLS=0, ROWS=0, grid=null, baseGrid=null, gates=[];
function rectTiles(r,ax,ay,fn){ // r=相対rect → 30%以上重なるマス（または中心を含むマス）
  const x0=ax+r[0], y0=ay+r[1], x1=x0+r[2], y1=y0+r[3];
  for(let ty=Math.floor(y0/T); ty<=Math.floor((y1-1)/T); ty++) for(let tx=Math.floor(x0/T); tx<=Math.floor((x1-1)/T); tx++){
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS) continue;
    const ox=Math.min(x1,(tx+1)*T)-Math.max(x0,tx*T), oy=Math.min(y1,(ty+1)*T)-Math.max(y0,ty*T);
    const cx=(tx+.5)*T, cy=(ty+.5)*T, center=cx>=x0&&cx<x1&&cy>=y0&&cy<y1;
    if(center||ox*oy>=T*T*.3) fn(tx,ty);
  }
}
function buildGrid(){
  const [mw,mh]=M.size; COLS=Math.ceil(mw/T); ROWS=Math.ceil(mh/T); gates=[];
  baseGrid=[]; for(let y=0;y<ROWS;y++){ const row=[]; for(let x=0;x<COLS;x++){ const top=y*T, bot=(y+1)*T; row.push((x===0||x===COLS-1||top<M.walk.top||bot>M.walk.bottom)?'#':'.'); } baseGrid.push(row); }
  for(const o of M.objects){ const g=geom(o.type,o.flip); if(!g) continue;
    for(const r of g.blocks) rectTiles(r,o.x,o.y,(x,y)=>baseGrid[y][x]='#');
    for(const r of (g.opens||[])) rectTiles(r,o.x,o.y,(x,y)=>{ if(baseGrid[y][x]==='#'&&y*T>=M.walk.top) baseGrid[y][x]='.'; });
    if(o.gate&&g.gate){ const tx=Math.floor((o.x+g.gate[0])/T), ty=Math.floor((o.y+g.gate[1])/T); if(baseGrid[ty]){ baseGrid[ty][tx]='G'; gates.push({tx,ty,target:o.gate,obj:o}); } }
  }
  grid=baseGrid.map(r=>r.slice());
  for(const k of (M.blocks||[])){ const [x,y]=k.split(',').map(Number); if(grid[y]&&grid[y][x]!==undefined) grid[y][x]='#'; }
  for(const k of (M.opens||[])){ const [x,y]=k.split(',').map(Number); if(grid[y]&&grid[y][x]==='#') grid[y][x]='.'; }
}
const cell=(tx,ty)=>(grid&&grid[ty]&&grid[ty][tx]!==undefined)?grid[ty][tx]:'#';
const tileCenter=n=>(n+.5)*T, tileIndex=v=>Math.floor(v/T);
const npcList=()=>M.npcs||(M.npc?[M.npc]:[]);
const npcTile=n=>({x:tileIndex(n.x),y:tileIndex(n.y)});
const npcAt=(tx,ty)=>npcList().find(n=>{ const t=npcTile(n); return t.x===tx&&t.y===ty; });
function walkableTile(tx,ty){ if(npcAt(tx,ty)) return false; if(cell(tx,ty)==='G'){ const g=gates.find(g=>g.tx===tx&&g.ty===ty); if(g&&gateLocked(g)) return false; } if(noclip) return tx>=0&&ty>=0&&tx<COLS&&ty<ROWS; return cell(tx,ty)!=='#'; }
function nearestWalkable(tx,ty){ for(let r=0;r<8;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){ if(Math.max(Math.abs(dx),Math.abs(dy))!==r) continue; if(walkableTile(tx+dx,ty+dy)&&cell(tx+dx,ty+dy)!=='G') return {x:tx+dx,y:ty+dy}; } return {x:tx,y:ty}; }

/* ---------- player / save ---------- */
let save={map:START_MAP,tx:null,ty:null,met:false,quest:0};
try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); if(s&&MAPS[s.map]) save={...save,...s}; }catch(_){}
const player={tx:0,ty:0,x:0,y:0,dir:'down',move:false,animTimer:0,animStepIndex:0};
let tileMotion=null;
function placePlayer(tx,ty){ player.tx=tx; player.ty=ty; player.x=tileCenter(tx); player.y=tileCenter(ty); tileMotion=null; }
/* エリア名の表示：ステージ開始・エリア移動・全滅からの復帰で共通。
   起動カバーや戦闘の演出・メニュー・会話が終わってから、中央にじわっと出して消す */
let areaTitlePending=null;
function queueAreaTitle(name){ areaTitlePending=name||null; }
function updateAreaTitle(){
  if(!areaTitlePending) return;
  if(document.getElementById('boot-cover')||(typeof enc!=='undefined'&&enc.phase)||!overlay.hidden||!dialog.hidden||novel.active) return;
  const el=$('area-title'); $('area-title-name').textContent=areaTitlePending; areaTitlePending=null;
  el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
}
// エリア名がヘッダーの飾り線（モック基準 幅約400）に収まるよう、文字を自動で小さくする
function fitPlace(){
  const u=shell.clientWidth/VIEW_W, max=400*u; let fs=53;
  placeEl.style.fontSize=''; placeEl.style.letterSpacing='';
  while(placeEl.scrollWidth>max&&fs>30){ fs-=1; placeEl.style.fontSize=(fs*u)+'px'; if(fs<46) placeEl.style.letterSpacing='.1em'; }
}
window.addEventListener('resize',()=>{ try{ fitPlace(); }catch(_){} });
function loadMap(name,arriveFrom){
  mapName=name; M=mapData(name); applyTheme(); buildGrid();
  let p;
  if(arriveFrom){ const g=gates.find(g=>g.target===arriveFrom)||gates[0]; p=g?nearestWalkable(g.tx,g.ty+2):null; }
  if(!p) p=nearestWalkable(tileIndex(M.start[0]),tileIndex(M.start[1]));
  placePlayer(p.x,p.y);
  placeEl.textContent=M.place; fitPlace(); showQuest(false); cam.ready=false; route=null;
  queueAreaTitle(M.place);
}
const cam={x:0,y:0,s:1,ready:false};
loadMap(save.map);
if(Number.isInteger(save.tx)&&walkableTile(save.tx,save.ty)) placePlayer(save.tx,save.ty);

function bfs(sx,sy,goal){
  const key=(x,y)=>y*COLS+x, prev=new Map([[key(sx,sy),-1]]), q=[[sx,sy]];
  while(q.length){ const [x,y]=q.shift(); if(goal(x,y)&&!(x===sx&&y===sy)){ const path=[]; let k=key(x,y); while(k!==key(sx,sy)){ path.unshift({x:k%COLS,y:Math.floor(k/COLS)}); k=prev.get(k); } return path; }
    for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){ const nx=x+dx, ny=y+dy, k=key(nx,ny); if(prev.has(k)||!walkableTile(nx,ny)) continue; prev.set(k,key(x,y)); q.push([nx,ny]); } }
  return null;
}

/* ---------- layout / camera ---------- */
// 描画解像度。重い端末では自動で 2 → 1.5 → 1.25 → 1 と下げる
let dprCap=Math.min(2,window.devicePixelRatio||1), perfAcc=0, perfN=0;
function resize(){
  dpr=Math.min(dprCap,window.devicePixelRatio||1); perfAcc=0; perfN=-30; W=canvas.clientWidth; H=canvas.clientHeight;
  canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr); fx.width=canvas.width; fx.height=canvas.height;
  shell.style.setProperty('--u',(shell.clientWidth/VIEW_W)+'px'); cam.ready=false;
}
window.addEventListener('resize',resize); if(window.ResizeObserver) new ResizeObserver(resize).observe(shell); resize();
function updateCamera(dt){
  const s=Math.max(W/VIEW_W,H/VIEW_H), vw=W/s, vh=H/s; cam.s=s; K=s*dpr; checkCacheScale();
  const [mw,mh]=M.size;
  const tx=Math.max(0,Math.min(mw-vw,player.x-vw/2)), ty=Math.max(0,Math.min(mh-vh,player.y-vh*.55));
  if(!cam.ready){ cam.x=tx; cam.y=ty; cam.ready=true; return; }
  if(drag) return;
  const k=Math.min(1,dt*7); cam.x+=(tx-cam.x)*k; cam.y+=(ty-cam.y)*k;
}
const screenToWorld=(px,py)=>({x:px/cam.s+cam.x, y:py/cam.s+cam.y});
const worldTransform=()=>{ const sh=(typeof enc!=='undefined'&&enc.shake)?enc.shake*K:0, sx=sh?(Math.random()*2-1)*sh:0, sy=sh?(Math.random()*2-1)*sh:0; ctx.setTransform(K,0,0,K,Math.round(-cam.x*K+sx),Math.round(-cam.y*K+sy)); };
const view=()=>({x:cam.x,y:cam.y,w:W/cam.s,h:H/cam.s});
const inView=(x,y,w,h,m=60)=>{ const v=view(); return x+w>v.x-m&&x<v.x+v.w+m&&y+h>v.y-m&&y<v.y+v.h+m; };
const screenTransform=()=>ctx.setTransform(dpr,0,0,dpr,0,0);

/* ---------- helpers ---------- */
function updateAnimation(vx,vy,dt){
  if(Math.hypot(vx,vy)<=.001){ player.move=false; player.animTimer=0; player.animStepIndex=0; return; }
  player.move=true; if(Math.abs(vx)>Math.abs(vy)) player.dir=vx>0?'right':'left'; else player.dir=vy>0?'down':'up';
  player.animTimer+=dt; while(player.animTimer>=ANIM_INTERVAL){ player.animTimer-=ANIM_INTERVAL; player.animStepIndex=(player.animStepIndex+1)%WALK_SEQUENCE.length; }
}
function saveNow(){ if(tileMotion) return; save={...save,map:mapName,tx:player.tx,ty:player.ty}; try{ localStorage.setItem(SAVE_KEY,JSON.stringify(save)); }catch(_){} }
function pop(msg,ms=1900){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); toastUntil=performance.now()+ms; }
function speak(name,lines,onEnd){ dialogQueue=lines.slice(); dialogEnd=onEnd||null; speaker.textContent=name; dialog.hidden=false; nextLine(); }
function nextLine(){ if(dialogQueue.length){ line.textContent=dialogQueue.shift(); return; } dialog.hidden=true; const cb=dialogEnd; dialogEnd=null; if(cb) cb(); }
dialog.addEventListener('click',nextLine);
const manhattan=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const here=()=>({x:player.tx,y:player.ty});
const DIRV={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
function nearby(){ // 隣のNPC（向いている方を優先）
  if(tileMotion) return null; const d=DIRV[player.dir]; const f=npcAt(player.tx+d[0],player.ty+d[1]); if(f) return f;
  return npcList().find(n=>manhattan(here(),npcTile(n))===1)||null;
}
function face(t){ const dx=t.x-player.tx, dy=t.y-player.ty; if(Math.abs(dx)>Math.abs(dy)) player.dir=dx>0?'right':'left'; else if(dy) player.dir=dy>0?'down':'up'; }
/* =====================================================================
   ミッション（章データの quests を順に進める）
   ===================================================================== */
function questNow(){ return QUESTS[Math.min(Number(save.quest)||0,QUESTS.length-1)]||null; }
function showQuest(fresh){
  const q=questNow(); questEl.textContent=q?'目的：'+q.text:(M.quest||'');
  if(fresh){ questEl.classList.remove('quest-new'); void questEl.offsetWidth; questEl.classList.add('quest-new'); }
}
function advanceQuest(){
  if((Number(save.quest)||0)>=QUESTS.length-1) return;
  save.quest=(Number(save.quest)||0)+1; saveNow(); showQuest(true); pop('目的が更新された',2200);
}
// 今の目的に関係するキャラか
function isQuestNpc(npc){ const q=questNow(); return !!(q&&q.type==='talk'&&q.npc===npc.id&&q.map===mapName); }
// 門：目的が「その門へ行く」に来るまでは通れない（戻る方向の門は常に通れる）
function gateLocked(g){
  const i=QUESTS.findIndex(q=>q.type==='gate'&&q.to===g.target&&q.map===mapName);
  return i>=0&&(Number(save.quest)||0)<i;
}
function talkToNpc(npc){
  npc=npc||nearby(); if(!npc) return; face(npcTile(npc));
  playTalk(npc, isQuestNpc(npc)?advanceQuest:null);
}
/* 会話は本編のノベル画面(StoryNovel)で再生。単体起動時(親ページなし)のみRPG内の簡易版を使う */
function parentNovel(){ return parentFn('playZeraphiaRPGNovel','playZeraphiaCh10Novel'); }
function playTalk(npc,onEnd){
  const entries=(npc.talk||[]).map(e=>({location:M.scene||CH.scene||'',...e}));
  if(!entries.length) return;
  route=null; joystick.x=joystick.y=0; setKnob(0,0); updateAnimation(0,0,0);
  const play=parentNovel();
  if(play){
    novel.active=true; novel.external=true;
    const ok=play(npc.id||'talk',{chapter:CH_NO,chapterTitle:CH_TITLE,stageNo:M.stageNo||1,stageTitle:M.place,entries},()=>{ novel.active=false; novel.external=false; updateAnimation(0,0,0); saveNow(); if(onEnd) onEnd(); });
    if(ok) return;
    novel.active=false; novel.external=false;
  }
  novel.entries=entries; novel.onEnd=onEnd||null; startLocalNovel();
}
function interact(){
  if(enc.phase) return;
  if(!dialog.hidden){ nextLine(); return; }
  if(novel.active){ advanceNovel(); return; }
  if(!enabled||!overlay.hidden||tileMotion) return;
  const nb=nearby(); if(nb){ talkToNpc(nb); return; }
  const g=gates.find(g=>manhattan(here(),{x:g.tx,y:g.ty})<=1); if(g){ if(gateLocked(g)){ pop('今は まだ 進めないようだ……'); return; } portal(g); return; }
  pop(npcList().some(n=>manhattan(here(),npcTile(n))<=3)?'隣のマスから話しかけてください':'ここには何もないようだ');
}
$('action').addEventListener('click',interact);
let holdAfterPortal=false; // 門をくぐった直後は、キー/スティックを一度離すまで動かない（戻りの門へ連続で入らないように）
function portal(g){
  if(gateLocked(g)) return;
  holdAfterPortal=true; route=null;
  enc.steps=0;
  const q=questNow(); const passQuest=!!(q&&q.type==='gate'&&q.to===g.target&&q.map===mapName);
  const from=mapName; loadMap(g.target,from); player.dir='down'; updateAnimation(0,0,0);
  saveNow();
  if(passQuest) advanceQuest();
}

/* ---------- drawing (world座標で描く) ---------- */
function drawGround(){
  const [mw,mh]=M.size, hz=M.horizonY, v=view();
  const x0=Math.max(0,v.x-2), x1=Math.min(mw,v.x+v.w+2), y0=Math.max(0,v.y-2), y1=Math.min(mh,v.y+v.h+2);
  if(y0<hz){ ctx.fillStyle='#fbfbfd'; ctx.fillRect(x0,y0,x1-x0,Math.min(hz,y1)-y0); }
  const fy=Math.max(y0,hz-60);
  if(fy<y1){
    if(!floorPattern&&ready(floorImg)){ const t=scaled('floor:'+floorImg.src,floorImg,floorImg.naturalWidth,floorImg.naturalHeight);
      floorPattern=ctx.createPattern(t,'repeat'); if(floorPattern.setTransform) floorPattern.setTransform(new DOMMatrix([floorImg.naturalWidth/t.width,0,0,floorImg.naturalHeight/t.height,0,0])); }
    ctx.fillStyle=floorPattern||'#ebe8ee'; ctx.fillRect(x0,fy,x1-x0,y1-fy);
  }
  if(ready(horizonImg)&&y0<hz+300){ const hw=horizonImg.naturalWidth, hh=horizonImg.naturalHeight, c=scaled('hz:'+horizonImg.src,horizonImg,hw,hh);
    for(let x=0;x<mw;x+=hw) if(x+hw>x0&&x<x1) ctx.drawImage(c,x,hz-330,hw,hh); }
  if(M.castle&&ready(castleImg)&&y0<hz+60){ // 遠景はカメラの動きの40%で追従 → 奥行き
    const w=M.castle.w, h=Math.round(w*castleImg.naturalHeight/castleImg.naturalWidth), par=.4;
    const x=M.castle.x-w/2+cam.x*par, y=hz-h+40+cam.y*par*.25, c=scaled('castle:'+castleImg.src,castleImg,w,h);
    ctx.globalAlpha=.92; ctx.drawImage(c,x,y,w,h); ctx.globalAlpha=1;
  }
}
function drawSigil(x,y,R,alpha){
  ctx.save(); ctx.translate(x,y); ctx.scale(1,.62); ctx.globalAlpha=alpha;
  const star=(rad,inner,rot)=>{ ctx.beginPath(); for(let i=0;i<8;i++){ const a=rot+i*Math.PI/4, rr=i%2?rad*inner:rad; ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr); } ctx.closePath(); };
  ctx.lineWidth=1.8; ctx.strokeStyle='rgba(150,146,178,.75)'; ctx.fillStyle='rgba(255,255,255,.28)';
  star(R*.62,.32,Math.PI/4); ctx.fill(); ctx.stroke(); star(R,.2,0); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawObjShadow(o){
  const g=geom(o.type,o.flip), [dx,dy,rx,ry]=g.shadow;
  ctx.drawImage(shadowSprite(rx,ry,.16),o.x+dx-rx,o.y+dy-ry,rx*2,ry*2);
}
function drawShadow(x,y,rx,ry,a){ ctx.fillStyle=`rgba(40,38,58,${a})`; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,7); ctx.fill(); }
function drawSprite(img,x,y,spec,flip,bounce){
  const size=spec.size, top=y-size*spec.foot+bounce, c=scaled(img.src,img,size,size,flip);
  if(c) ctx.drawImage(c,x-size/2,top,size,size);
}
function drawNpc(n){
  const x=tileCenter(tileIndex(n.x)), y=tileCenter(tileIndex(n.y));
  if(n.sprite){ const im=npcImg(n.sprite); drawShadow(x,y+2,44,12,.22); if(ready(im)) drawSprite(im,x,y,SPRITE.npc,!!n.flip,0); return; }
  const p=.6+.3*Math.sin(clock*3), cy=y-60; const grd=ctx.createRadialGradient(x,cy,0,x,cy,46); grd.addColorStop(0,`rgba(235,240,255,${p})`); grd.addColorStop(1,'rgba(200,210,255,0)'); ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(x,cy,46,0,7); ctx.fill();
}
function drawPlayer(){
  const frame=player.move?WALK_SEQUENCE[player.animStepIndex]:'idle';
  let img=assets[player.dir+'_'+frame], flip=false;
  if(!ready(img)&&player.dir==='right'){ img=assets['left_'+frame]; flip=true; }
  if(!ready(img)){ img=assets[player.dir+'_idle']; flip=false; }
  drawShadow(player.x,player.y+2,46,13,.24);
  if(ready(img)) drawSprite(img,player.x,player.y,SPRITE.player,flip,player.move&&frame!=='idle'?STEP_BOUNCE:0);
}
const gateCenter=g=>{ const og=geom(g.obj.type,g.obj.flip); return {x:g.obj.x+og.gate[0], y:g.obj.y+og.gate[1]-70}; };
const gateLabel=g=>g.obj.gateLabel||(g.target+'への門');
function drawGateGlow(g){ // 門の光：遠くからでも分かるよう、光の柱と舞い上がる粒を出す
  const {x,y}=gateCenter(g), pulse=(.6+.25*Math.sin(clock*2.2))*(gateLocked(g)?.35:1); // 通れない間は弱く光る
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const beam=ctx.createLinearGradient(0,y-520,0,y+60); beam.addColorStop(0,'rgba(255,244,210,0)'); beam.addColorStop(.75,`rgba(255,244,210,${.30*pulse})`); beam.addColorStop(1,'rgba(255,244,210,0)');
  ctx.fillStyle=beam; ctx.fillRect(x-34,y-520,68,580);
  const grd=ctx.createRadialGradient(x,y,0,x,y,110); grd.addColorStop(0,`rgba(255,246,214,${.62*pulse})`); grd.addColorStop(1,'rgba(255,240,200,0)');
  ctx.fillStyle=grd; ctx.beginPath(); ctx.ellipse(x,y,70,110,0,0,7); ctx.fill();
  for(let i=0;i<10;i++){ const t=(clock*.35+i/10)%1, px=x+Math.sin(i*2.3+clock)*40, py=y+40-t*380, r=3+(i%3);
    ctx.fillStyle=`rgba(255,240,200,${.7*(1-t)})`; ctx.beginPath(); ctx.arc(px,py,r,0,7); ctx.fill(); }
  ctx.restore();
}
function drawGateLabels(){ // 門の名前（近くにいる時）
  if(!overlay.hidden||!dialog.hidden||novel.active) return;
  for(const g of gates){ const d=Math.abs(g.tx-player.tx)+Math.abs(g.ty-player.ty); if(d>14||d<=3) continue;
    const {x,y}=gateCenter(g), t='✦ '+gateLabel(g); ctx.font='700 34px "Noto Serif JP","Yu Mincho",serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const w=ctx.measureText(t).width+40, ly=y+175; ctx.globalAlpha=Math.min(1,(15-d)/4);
    ctx.fillStyle='rgba(30,40,64,.85)'; ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(x-w/2,ly-25,w,50,14); else ctx.rect(x-w/2,ly-25,w,50); ctx.fill();
    ctx.strokeStyle='rgba(242,223,182,.9)'; ctx.lineWidth=2; ctx.stroke(); ctx.fillStyle='#fff1cf'; ctx.fillText(t,x,ly+1); ctx.globalAlpha=1; ctx.textBaseline='alphabetic'; }
}
// 今の目的の場所（ワールド座標）。別マップにいる相手なら、そのマップへの門を指す
function questTarget(){
  const q=questNow(); if(!q||q.type==='end') return null;
  const gateTo=map=>gates.find(g=>g.target===map);
  if(q.type==='talk'){
    if(q.map===mapName){ const n=npcList().find(n=>n.id===q.npc); if(!n) return null; const t=npcTile(n);
      return { x:tileCenter(t.x), y:tileCenter(t.y)-120, label:n.name, npc:n }; }
    const g=gateTo(q.map); return g?{ ...gateCenter(g), label:gateLabel(g) }:null;
  }
  if(q.type==='gate'){ const g=q.map===mapName?gateTo(q.to):gateTo(q.map); return g?{ ...gateCenter(g), label:gateLabel(g) }:null; }
  return null;
}
function drawQuestMark(){ // 目的のキャラの頭上に浮かぶ★
  if(!overlay.hidden||!dialog.hidden||novel.active||enc.phase) return;
  const t=questTarget(); if(!t||!t.npc) return;
  const tile=npcTile(t.npc), x=tileCenter(tile.x), y=tileCenter(tile.y)-SPRITE.npc.size*.86-(nearby()===t.npc?92:50)+Math.sin(clock*3)*6;
  ctx.save(); ctx.translate(x,y);
  const glow=ctx.createRadialGradient(0,0,0,0,0,40); glow.addColorStop(0,'rgba(255,236,180,.75)'); glow.addColorStop(1,'rgba(255,236,180,0)');
  ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(0,0,40,0,7); ctx.fill();
  ctx.beginPath(); for(let i=0;i<8;i++){ const a=-Math.PI/2+i*Math.PI/4, r=i%2?7:24; ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r); } ctx.closePath();
  ctx.fillStyle='#f3d98f'; ctx.strokeStyle='#8a6a30'; ctx.lineWidth=2.5; ctx.fill(); ctx.stroke(); ctx.restore();
}
function drawGateArrows(){ // 目的の場所が画面の外にある時、画面の端に方向と名前を出す（スクリーン座標で描く）
  if(!enabled||!overlay.hidden||!dialog.hidden||novel.active) return;
  const u=shell.clientWidth/VIEW_W, top=u*344+56, bottom=H-u*380-30, left=46, right=W-46;
  const tg=questTarget(); if(!tg) return;
  for(const c of [tg]){ const sx=(c.x-cam.x)*cam.s, sy=(c.y-cam.y)*cam.s;
    if(sx>left&&sx<right&&sy>top&&sy<bottom) continue;
    const cx=W/2, cy=(top+bottom)/2, dx=sx-cx, dy=sy-cy;
    const k=Math.min(dx>0?(right-cx)/dx:dx<0?(left-cx)/dx:1e9, dy>0?(bottom-cy)/dy:dy<0?(top-cy)/dy:1e9);
    const ax=cx+dx*k, ay=cy+dy*k, ang=Math.atan2(dy,dx), bob=Math.sin(clock*4)*3;
    ctx.save(); ctx.translate(ax+Math.cos(ang)*bob,ay+Math.sin(ang)*bob);
    ctx.fillStyle='rgba(30,40,64,.88)'; ctx.strokeStyle='rgba(242,223,182,.95)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(0,0,20,0,7); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.rotate(ang); ctx.fillStyle='#f2dfb6'; ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(-5,-8); ctx.lineTo(-2,0); ctx.lineTo(-5,8); ctx.closePath(); ctx.fill(); ctx.restore();
    const t=c.label; ctx.font='700 13px "Noto Serif JP","Yu Mincho",serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const tw=ctx.measureText(t).width+16, ty=ay<cy?32:-32; let tx=0; if(ax-tw/2<6) tx=6-(ax-tw/2); if(ax+tw/2>W-6) tx=(W-6)-(ax+tw/2);
    ctx.fillStyle='rgba(30,40,64,.88)'; ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(tx-tw/2,ty-11,tw,22,8); else ctx.rect(tx-tw/2,ty-11,tw,22); ctx.fill();
    ctx.fillStyle='#fff1cf'; ctx.fillText(t,tx,ty+1); ctx.restore(); ctx.textBaseline='alphabetic';
  }
}
function drawTapMark(){
  if(!tapMark) return; const age=clock-tapMark.t; if(age>.6){ tapMark=null; return; }
  ctx.strokeStyle=`rgba(168,135,63,${.8*(1-age/.6)})`; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(tileCenter(tapMark.x),tileCenter(tapMark.y),16+age*30,6+age*11,0,0,7); ctx.stroke();
}
// 近く（8マス以内）のキャラの頭上に名前を出す。遠いほど薄く
function drawNpcNames(){
  if(!overlay.hidden||!dialog.hidden||novel.active) return;
  ctx.font='700 34px "Noto Serif JP","Yu Mincho",serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const n of npcList()){ if(!n.sprite) continue;
    const t=npcTile(n), d=Math.abs(t.x-player.tx)+Math.abs(t.y-player.ty); if(d>8) continue;
    const x=tileCenter(t.x), y=tileCenter(t.y)-SPRITE.npc.size*.86-(nearby()===n?44:0), w=ctx.measureText(n.name).width+36;
    ctx.globalAlpha=Math.min(1,(9-d)/3);
    ctx.fillStyle='rgba(30,40,64,.82)'; ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(x-w/2,y-24,w,48,14); else ctx.rect(x-w/2,y-24,w,48); ctx.fill();
    ctx.strokeStyle='rgba(235,217,181,.7)'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle='#fff4dc'; ctx.fillText(n.name,x,y+1);
  }
  ctx.globalAlpha=1; ctx.textBaseline='alphabetic';
}
function drawNpcMark(){
  const n=nearby(); if(!n||!overlay.hidden||!dialog.hidden||novel.active) return;
  const top=n.sprite?SPRITE.npc.size*.86:110;
  const x=tileCenter(tileIndex(n.x)), y=tileCenter(tileIndex(n.y))-top+Math.sin(clock*4)*3;
  ctx.font='700 40px Georgia,serif'; ctx.textAlign='center'; ctx.lineWidth=4; ctx.strokeStyle='rgba(255,250,236,.9)'; ctx.strokeText('!',x,y); ctx.fillStyle='#a8873f'; ctx.fillText('!',x,y);
}
function render(){
  renderFx();
  if(enc.phase==='battle'||enc.phase==='title') return; // 暗転中・戦闘中はフィールドを描かない（軽く）
  screenTransform(); ctx.fillStyle='#ebe8ee'; ctx.fillRect(0,0,W,H);
  worldTransform();
  drawGround();
  for(const [x,y,r] of (M.sigils||[])) if(inView(x-r,y-r,r*2,r*2)) drawSigil(x,y,r,.85);
  const visObjs=M.objects.filter(o=>{ const g=TYPES[o.type]&&geom(o.type,o.flip); return g&&inView(o.x+g.ox,o.y+g.oy,g.w,g.h); });
  for(const o of visObjs) drawObjShadow(o);
  drawTapMark();
  // 奥→手前の順（足元のyでソート）に描く
  const items=[{y:player.y+.1,d:drawPlayer}];
  for(const n of npcList()){ const nx=tileCenter(tileIndex(n.x)), ny=tileCenter(tileIndex(n.y)); if(inView(nx-150,ny-300,300,330)) items.push({y:ny,d:()=>drawNpc(n)}); }
  for(const o of visObjs){ const parts=partCanvases(o.type,o.flip); if(!parts) continue; const g=geom(o.type,o.flip);
    for(const p of parts) items.push({y:o.y+p.base,d:()=>ctx.drawImage(p.c,o.x+g.ox,o.y+g.oy,g.w,g.h)}); }
  for(const g of gates) items.push({y:g.obj.y+1,d:()=>drawGateGlow(g)});
  items.sort((a,b)=>a.y-b.y); for(const it of items) it.d();
  drawNpcNames();
  drawQuestMark();
  drawGateLabels();
  drawNpcMark();
  if(enc.phase==='alert'||enc.phase==='flash') drawAlertBubble();
  if(debug) drawDebug();
  screenTransform();
  if(M.tint){ ctx.fillStyle=M.tint; ctx.fillRect(0,0,W,H); }
  drawGateArrows();
}

/* ---------- novel（単体起動時だけ使う簡易会話。本編から開いた時は本編のノベル画面） ---------- */
const novelRoot=$('rpg-novel'), novelName=$('rpg-novel-name'), novelText=$('rpg-novel-text'), novelScene=$('rpg-novel-scene');
const novel={active:false,external:false,index:0,typed:0,timer:0,ready:false,entries:[]};
const novelPortrait=$('rpg-novel-portrait');
function setPortrait(e){ const src=e.portrait||(CH.portraits||{})[e.speaker]||''; if(!novelPortrait) return;
  novelPortrait.hidden=!src; if(src&&novelPortrait.getAttribute('src')!==src) novelPortrait.src=src; novelPortrait.alt=e.speaker||''; }
function startLocalNovel(){ novel.active=true; novel.index=0; novelRoot.hidden=false; showNovelEntry(); }
function showNovelEntry(){ const e=novel.entries[novel.index]; if(!e){ endNovel(); return; } novelName.textContent=e.speaker; novelText.textContent=''; novel.typed=0; novel.timer=0; novel.ready=false; novelScene.textContent=`${CH_NO}-${M.stageNo||1}  ${M.place}`; setPortrait(e); $('rpg-novel-next').textContent='TAP TO CONTINUE'; }
function advanceNovel(){ if(!novel.active||novel.external) return; const e=novel.entries[novel.index]; if(!novel.ready){ novelText.textContent=e.text; novel.typed=Array.from(e.text).length; novel.ready=true; return; } novel.index++; if(novel.index>=novel.entries.length){ endNovel(); return; } showNovelEntry(); }
function endNovel(){ novel.active=false; novelRoot.hidden=true; updateAnimation(0,0,0); saveNow(); const cb=novel.onEnd; novel.onEnd=null; if(cb) cb(); }
function updateNovel(dt){ if(!novel.active||novel.external||novel.ready) return; novel.timer+=dt; const chars=Array.from(novel.entries[novel.index].text); while(novel.timer>=.032&&novel.typed<chars.length){ novel.timer-=.032; novel.typed++; } novelText.textContent=chars.slice(0,novel.typed).join(''); if(novel.typed>=chars.length) novel.ready=true; }
novelRoot.addEventListener('click',advanceNovel);

/* ---------- movement ---------- */
const keys=new Set();
window.addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  keys.add(e.key.toLowerCase());
  if(e.key==='Enter'||e.key===' ') interact();
  if(e.key==='g'||e.key==='G'){ setDebug(!debug); }
  if(debug) editorKey(e);
  if(e.key==='Escape'&&!novel.active&&!enc.phase){ if(overlay.hidden) openMenu(); else closeMenu(); dialog.hidden=true; }
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{ keys.clear(); joystick.x=joystick.y=0; route=null; setKnob(0,0); });
function inputDirection(){
  let vx=joystick.x, vy=joystick.y;
  if(keys.has('arrowleft')||keys.has('a')) vx-=1; if(keys.has('arrowright')||keys.has('d')) vx+=1;
  if(keys.has('arrowup')||keys.has('w')) vy-=1; if(keys.has('arrowdown')||keys.has('s')) vy+=1;
  if(holdAfterPortal){ if(Math.hypot(vx,vy)<=.25) holdAfterPortal=false; return null; }
  if(Math.hypot(vx,vy)>.25){ route=null; return Math.abs(vx)>Math.abs(vy)?{dx:Math.sign(vx),dy:0}:{dx:0,dy:Math.sign(vy)}; }
  if(route){ const nxt=route.path[0]; if(!nxt){ const cb=route.onArrive; route=null; if(cb) cb(); return null; } return {dx:nxt.x-player.tx,dy:nxt.y-player.ty}; }
  return null;
}
function beginTileStep(dir){
  const tx=player.tx+dir.dx, ty=player.ty+dir.dy;
  player.dir=dir.dx?(dir.dx>0?'right':'left'):(dir.dy>0?'down':'up');
  if(!walkableTile(tx,ty)){ route=null; return false; }
  if(route) route.path.shift();
  tileMotion={fromX:player.x,fromY:player.y,toX:tileCenter(tx),toY:tileCenter(ty),tx,ty,elapsed:0,dx:dir.dx,dy:dir.dy}; return true;
}
function move(dt){
  if(!enabled||!overlay.hidden||!dialog.hidden||novel.active||enc.phase){ if(!tileMotion) updateAnimation(0,0,dt); return; }
  if(!tileMotion){ const dir=inputDirection(); if(!dir||!beginTileStep(dir)){ updateAnimation(0,0,dt); return; } }
  const m=tileMotion; m.elapsed=Math.min(TILE_DURATION,m.elapsed+dt); const t=m.elapsed/TILE_DURATION;
  player.x=m.fromX+(m.toX-m.fromX)*t; player.y=m.fromY+(m.toY-m.fromY)*t; updateAnimation(m.dx,m.dy,dt);
  if(t>=1){
    player.tx=m.tx; player.ty=m.ty; player.x=m.toX; player.y=m.toY; tileMotion=null;
    const g=gates.find(g=>g.tx===player.tx&&g.ty===player.ty); if(g&&!noclip){ portal(g); return; }
    saveNow();
    if(checkEncounter()) return;
    if(route&&!route.path.length){ const cb=route.onArrive; route=null; if(cb) cb(); }
    if(!route&&!inputDirection()) updateAnimation(0,0,0);
  }
}
/* =====================================================================
   ランダムエンカウント（マップの encounter）
   歩数で判定 → 「！」→ 白フラッシュ×2 → 縞ワイプで暗転 → 「〇〇が あらわれた！」
   → 本編のシューティング戦闘（bridge: startZeraphiaRPGEncounter）→ 戻ったら白/黒から復帰
   ===================================================================== */
const ENC_T={ alert:.6, flash:.6, wipe:.75, title:1.25, ret:.7, down:2.0 };
const enc={ phase:null, t:0, steps:0, info:null, shake:0, result:null, from:'#fff' };
const encEnabled=()=>!!(M&&M.encounter&&M.encounter.table&&M.encounter.table.length)&&!(debug&&!/[?&]enc=1/.test(location.search));
function inSafeZone(){
  const r=(M.encounter&&M.encounter.safe)||0; if(!r) return false;
  const h=here();
  return npcList().some(n=>manhattan(h,npcTile(n))<=r)||gates.some(g=>manhattan(h,{x:g.tx,y:g.ty})<=r);
}
function checkEncounter(){ // 1歩進むごとに呼ぶ。遭遇したら true
  if(!encEnabled()||noclip||enc.phase) return false;
  const e=M.encounter; enc.steps++;
  if(enc.steps<(e.minSteps||0)||inSafeZone()) return false;
  if(Math.random()>=(e.rate||0)) return false;
  const total=e.table.reduce((a,t)=>a+(t.weight||1),0); let r=Math.random()*total, pick=e.table[0];
  for(const t of e.table){ r-=(t.weight||1); if(r<0){ pick=t; break; } }
  startEncounter(pick); return true;
}
function startEncounter(info){
  route=null; joystick.x=joystick.y=0; setKnob(0,0); keys.clear(); updateAnimation(0,0,0);
  enc.phase='alert'; enc.t=0; enc.info=info; enc.steps=0;
}
function parentEncounter(){ return parentFn('startZeraphiaRPGEncounter','startZeraphiaCh10Encounter'); }
function launchBattle(){
  enc.phase='battle'; enc.t=0;
  const start=parentEncounter(), info=enc.info;
  // res.outcome: 'win' 勝利 / 'escape' 逃走（PAUSEから退出・編成キャンセル） / 'lose' 全滅
  const done=res=>{ enc.result=res||{}; enc.from='#f7f4ee'; enc.steps=0; last=0;
    if(Array.isArray(enc.result.party)){ save.partyHp=enc.result.party; saveNow(); } // 次の段階（HP持ち越し）で使う
    enc.phase=enc.result.outcome==='lose'?'down':'return'; enc.t=0; };
  if(start&&start(info.stage,{partyScreen:!!(M.encounter&&M.encounter.partyScreen)},done)) return;
  // 単体起動（本編なし）の時は戦闘を省略して戻る
  setTimeout(()=>done({outcome:'win',skipped:true}),900);
}
function updateEncounter(dt){
  if(!enc.phase) return;
  enc.t+=dt;
  if(enc.phase==='alert'){ enc.shake=enc.t<.35?6*(1-enc.t/.35):0; if(enc.t>=ENC_T.alert){ enc.phase='flash'; enc.t=0; enc.shake=0; } }
  else if(enc.phase==='flash'){ if(enc.t>=ENC_T.flash){ enc.phase='wipe'; enc.t=0; } }
  else if(enc.phase==='wipe'){ if(enc.t>=ENC_T.wipe) launchBattle(); } // 白に覆われたらそのままバトルイン
  else if(enc.phase==='title'){ if(enc.t>=ENC_T.title) launchBattle(); }
  else if(enc.phase==='down'){ if(enc.t>=ENC_T.down){ // 全滅：光の門の前で目を覚ます
    const rs=CH.respawn||{}; loadMap(MAPS[rs.map]?rs.map:START_MAP, rs.from||null); player.dir='up'; updateAnimation(0,0,0); saveNow(); cam.ready=false;
    enc.phase='return'; enc.t=0;
  } }
  else if(enc.phase==='return'){ if(enc.t>=ENC_T.ret){
    const r=enc.result||{}; enc.phase=null; enc.info=null;
    const msg=(r.skipped?'（単体起動のため戦闘は省略しました）':r.outcome==='win'?'':r.outcome==='lose'?((CH.respawn&&CH.respawn.message)||'気がつくと、見覚えのある場所にいた……'):'うまく逃げきれた……'); if(msg) pop(msg,2400);
  } }
}
function drawAlertBubble(){ // エリの頭上の「！」（ポケモン風）
  const pop=Math.min(1,enc.t/.12), x=player.x, y=player.y-SPRITE.player.size*.86-30-(1-pop)*20;
  ctx.save(); ctx.translate(x,y); ctx.scale(pop,pop);
  ctx.fillStyle='#fff'; ctx.strokeStyle='#2a2f45'; ctx.lineWidth=4;
  ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(-30,-40,60,64,14); else ctx.rect(-30,-40,60,64); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8,22); ctx.lineTo(0,38); ctx.lineTo(8,22); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.fillRect(-7,18,14,7);
  ctx.fillStyle='#c8323c'; ctx.font='900 48px Georgia,serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('!',0,-6);
  ctx.restore(); ctx.textBaseline='alphabetic';
}
let fxDirty=false;
function renderFx(){ // UIより上のキャンバスに演出を描く
  if(!enc.phase){ if(fxDirty){ fctx.setTransform(1,0,0,1,0,0); fctx.clearRect(0,0,fx.width,fx.height); fxDirty=false; } return; }
  const main=ctx; ctx=fctx; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H); drawEncounterOverlay(); ctx=main; fxDirty=true;
}
function drawEncounterOverlay(){ // スクリーン座標
  const p=enc.phase, t=enc.t, dark='#f7f4ee'; // ZERAPHIAらしく白で包む（戦闘画面の紙色に合わせる）
  if(p==='flash'){ // 白フラッシュ2回
    const k=(t/ENC_T.flash)*2, f=k%1, a=f<.5?f*2:(1-f)*2; ctx.fillStyle=`rgba(255,255,255,${Math.min(1,a*1.1)})`; ctx.fillRect(0,0,W,H);
  } else if(p==='wipe'){ // 横縞が左右交互に伸びて暗転
    const n=12, bh=Math.ceil(H/n); ctx.fillStyle=dark;
    for(let i=0;i<n;i++){ const d=i*.03, q=Math.max(0,Math.min(1,(t-d)/(ENC_T.wipe-.36))), e=1-Math.pow(1-q,3), w=W*e;
      if(i%2) ctx.fillRect(W-w,i*bh,w,bh+1); else ctx.fillRect(0,i*bh,w,bh+1); }
  } else if(p==='title'||p==='battle'){ // 戦闘中は白で覆ったまま
    ctx.fillStyle=dark; ctx.fillRect(0,0,W,H);
    if(false){
      const msg=`${enc.info.name}が あらわれた！`, chars=Array.from(msg), shown=chars.slice(0,Math.floor(Math.max(0,t-.1)/.045)).join('');
      const bw=Math.min(W-28,400), bh=76, bx=(W-bw)/2, by=H*.5-bh/2;
      let fs=20; ctx.font=`700 ${fs}px "Noto Serif JP","Yu Mincho",serif`; const full=ctx.measureText(msg).width; if(full>bw-48) fs=Math.max(12,Math.floor(fs*(bw-48)/full));
      ctx.globalAlpha=Math.min(1,t/.15);
      ctx.fillStyle='rgba(12,14,24,.95)'; ctx.fillRect(bx,by,bw,bh);
      ctx.strokeStyle='#f3ead6'; ctx.lineWidth=3; ctx.strokeRect(bx+4,by+4,bw-8,bh-8);
      ctx.fillStyle='#fff6e4'; ctx.font=`700 ${fs}px "Noto Serif JP","Yu Mincho",serif`; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(shown,bx+24,by+bh/2+1); ctx.globalAlpha=1; ctx.textBaseline='alphabetic';
    }
  } else if(p==='down'){ // 全滅：白の中で一言
    ctx.fillStyle=dark; ctx.fillRect(0,0,W,H);
    const a=Math.min(1,Math.max(0,(t-.25)/.4))*Math.min(1,Math.max(0,(ENC_T.down-t)/.35));
    ctx.globalAlpha=a; ctx.fillStyle='#6b5a43'; ctx.font='700 18px "Noto Serif JP","Yu Mincho",serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('目の前が 真っ白に なった……',W/2,H*.48); ctx.globalAlpha=1; ctx.textBaseline='alphabetic';
  } else if(p==='return'){ // 戦闘から戻る：暗転から開ける
    const a=1-Math.min(1,t/ENC_T.ret); ctx.globalAlpha=a; ctx.fillStyle=enc.from; ctx.fillRect(0,0,W,H); ctx.globalAlpha=1;
  }
}
function loop(ts){ const raw=Math.max(0,(ts-last)/1000||0), dt=Math.min(.05,raw); last=ts;
  // 自動画質調整：重い状態（平均24ms超＝約40fps未満）が続いたら描画解像度を1段下げる
  if(raw>0&&raw<.5&&!novel.active&&document.visibilityState==='visible'){ perfAcc+=raw; if(++perfN>=90){ const avg=perfAcc/perfN; perfAcc=0; perfN=0;
    if(avg>.024&&dprCap>1){ dprCap=[1.5,1.25,1].find(v=>v<dprCap-.01)||1; resize(); } } } clock+=dt; updateEncounter(dt); updateAreaTitle(); move(dt); updateNovel(dt); updateCamera(dt); render(); if(toastUntil&&ts>toastUntil){ $('toast').classList.remove('show'); toastUntil=0; } requestAnimationFrame(loop); }
requestAnimationFrame(loop);

/* stick */
const stick=$('stick'), knob=$('stick-knob'); let stickPid=null;
function setKnob(nx,ny){ const r=stick.clientWidth*.2; knob.style.transform=`translate(calc(-50% + ${nx*r}px), calc(-50% + ${ny*r}px))`; }
function setStick(e){ const b=stick.getBoundingClientRect(), cx=b.left+b.width/2, cy=b.top+b.height/2; const dx=e.clientX-cx, dy=e.clientY-cy, r=b.width*.2, len=Math.hypot(dx,dy)||1, k=Math.min(1,len/r); joystick.x=dx/len*k; joystick.y=dy/len*k; setKnob(joystick.x,joystick.y); }
function resetStick(){ stickPid=null; joystick.x=joystick.y=0; setKnob(0,0); }
stick.addEventListener('pointerdown',e=>{ e.preventDefault(); stickPid=e.pointerId; stick.setPointerCapture(e.pointerId); setStick(e); });
stick.addEventListener('pointermove',e=>{ if(e.pointerId===stickPid) setStick(e); });
stick.addEventListener('pointerup',resetStick); stick.addEventListener('pointercancel',resetStick);

/* tap to move */
function tapMove(w){
  if(!enabled||!overlay.hidden||!dialog.hidden||novel.active||enc.phase) return;
  const tx=tileIndex(w.x), ty=tileIndex(w.y);
  const hit=npcList().find(n=>{ const t=npcTile(n); return tx===t.x&&ty<=t.y&&ty>=t.y-3; });
  if(hit){
    const t=npcTile(hit);
    if(!tileMotion&&manhattan(here(),t)===1){ talkToNpc(hit); return; }
    const path=bfs(player.tx,player.ty,(x,y)=>manhattan({x,y},t)===1);
    if(path){ route={path,onArrive:()=>talkToNpc(hit)}; const l=path[path.length-1]; tapMark={x:l.x,y:l.y,t:clock}; } return;
  }
  let goal={x:tx,y:ty};
  const gateHit=gates.find(g=>Math.abs(g.tx-tx)<=1&&ty<=g.ty&&ty>=g.ty-4); if(gateHit) goal={x:gateHit.tx,y:gateHit.ty};
  else if(!walkableTile(tx,ty)){ let best=null; for(let yy=ty-2;yy<=ty+2;yy++) for(let xx=tx-2;xx<=tx+2;xx++){ if(!walkableTile(xx,yy)) continue; const d=Math.hypot(xx-tx,yy-ty); if(!best||d<best.d) best={x:xx,y:yy,d}; } if(!best) return; goal=best; }
  if(goal.x===player.tx&&goal.y===player.ty) return;
  const path=bfs(player.tx,player.ty,(x,y)=>x===goal.x&&y===goal.y);
  if(path){ route={path,onArrive:null}; tapMark={x:goal.x,y:goal.y,t:clock}; }
}

/* =====================================================================
   配置エディタ（?debug=1 または G キー）
   ドラッグ=部品移動 / 空きマスをタップ=通行切替 / F=反転 / Delete=削除
   1〜4=部品追加 / N=すり抜け / パネルの「配置をコピー」で chapters/chNN.js 用に書き出し
   ===================================================================== */
let selected=null, drag=null, panel=null;
const SNAP=25, snap=v=>Math.round(v/SNAP)*SNAP;
const typeKeys=Object.keys(TYPES);
function persistEdit(){ editState[mapName]={objects:M.objects,npcs:npcList(),blocks:M.blocks||[],opens:M.opens||[]}; try{ localStorage.setItem(EDIT_KEY,JSON.stringify(editState)); }catch(_){} }
function editableMap(){ if(M===MAPS[mapName]) M={...M,objects:M.objects.map(o=>({...o})),npcs:npcList().map(n=>({...n})),blocks:(M.blocks||[]).slice(),opens:(M.opens||[]).slice()}; }
function exportText(){
  const o=M.objects.map(o=>{ const a=[`type: '${o.type}'`,`x: ${o.x}`,`y: ${o.y}`]; if(o.flip) a.push('flip: true'); if(o.gate) a.push(`gate: '${o.gate}'`); if(o.gateLabel) a.push(`gateLabel: '${o.gateLabel}'`); return `      { ${a.join(', ')} },`; }).join('\n');
  const q=v=>JSON.stringify(v).replace(/"([a-zA-Z]+)":/g,'$1: ');
  const n=npcList().map(n=>`      { id: '${n.id}', name: '${n.name}', x: ${n.x}, y: ${n.y}${n.sprite?`, sprite: '${n.sprite}'`:''}${n.flip?', flip: true':''},\n        talk: ${q(n.talk||[])} },`).join('\n');
  return `    // ---- '${mapName}' ----\n    npcs: [\n${n}\n    ],\n    objects: [\n${o}\n    ],\n    blocks: ${JSON.stringify(M.blocks||[])},\n    opens: ${JSON.stringify(M.opens||[])},`;
}
function copyLayout(){ const t=exportText(); console.log(t); const done=()=>pop(`配置をコピーしました → chapters/ch${String(CH_NO).padStart(2,'0')}.js の npcs/objects/blocks/opens に貼り付け`,2600);
  try{ if(navigator.clipboard){ navigator.clipboard.writeText(t).then(done,()=>{ prompt('コピーしてください',t); }); return; } }catch(_){} prompt('コピーしてください',t); }
function hitNpc(w){ return npcList().find(n=>{ const x=tileCenter(tileIndex(n.x)), y=tileCenter(tileIndex(n.y)); return Math.abs(w.x-x)<55&&w.y<y+20&&w.y>y-220; }); }
function hitObject(w){
  let best=null; for(const o of M.objects){ const g=geom(o.type,o.flip); if(!g) continue;
    if(w.x>=o.x+g.ox&&w.x<=o.x+g.ox+g.w&&w.y>=o.y+g.oy&&w.y<=o.y+g.oy+g.h){ if(!best||o.y>best.y) best=o; } }
  return best;
}
function addObject(type){ editableMap(); const o={type,x:snap(player.x),y:snap(player.y-150)}; M.objects.push(o); selected=o; buildGrid(); persistEdit(); pop(`${TYPES[type].label} を追加`); }
function editorKey(e){
  const k=e.key.toLowerCase();
  if(k==='n'){ noclip=!noclip; pop(noclip?'すり抜け ON':'すり抜け OFF'); }
  if(/^[1-9]$/.test(k)&&typeKeys[+k-1]) addObject(typeKeys[+k-1]);
  if(!selected) return;
  if(k==='f'){ editableMap(); const o=M.objects.find(o=>o.x===selected.x&&o.y===selected.y&&o.type===selected.type)||selected; o.flip=!o.flip; selected=o; buildGrid(); persistEdit(); }
  if(k==='delete'||k==='backspace'){ editableMap(); M.objects=M.objects.filter(o=>!(o.x===selected.x&&o.y===selected.y&&o.type===selected.type)); selected=null; buildGrid(); persistEdit(); }
}
function setDebug(on){
  debug=on; selected=null; if(!on) noclip=false;
  if(on&&!panel){
    panel=document.createElement('div'); panel.id='editor-panel';
    panel.innerHTML=`<b>配置エディタ <button data-act="fold" class="fold">たたむ</button></b><span>ドラッグ:部品・キャラ移動 / 空きマスをタップ:通行切替<br>F:反転 Del:削除 1-${typeKeys.length}:追加 N:すり抜け</span>
      <div class="row">${typeKeys.map((k,i)=>`<button data-add="${k}">${i+1} ${TYPES[k].label}</button>`).join('')}</div>
      <div class="row"><button data-act="flip">反転</button><button data-act="del">削除</button><button data-act="noclip">すり抜け</button><button data-act="copy">配置をコピー</button><button data-act="reset">編集を破棄</button></div>`;
    panel.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; e.stopPropagation();
      if(b.dataset.add) addObject(b.dataset.add);
      const a=b.dataset.act; if(a==='fold'){ panel.classList.toggle('folded'); b.textContent=panel.classList.contains('folded')?'ひらく':'たたむ'; return; } if(a==='flip') editorKey({key:'f'}); if(a==='del') editorKey({key:'Delete'}); if(a==='noclip') editorKey({key:'n'}); if(a==='copy') copyLayout();
      if(a==='reset'&&confirm('このマップの編集内容を破棄して 章データ の状態に戻しますか？')){ delete editState[mapName]; try{ localStorage.setItem(EDIT_KEY,JSON.stringify(editState)); }catch(_){} loadMap(mapName); }
    });
    shell.appendChild(panel);
  }
  if(panel) panel.hidden=!on;
  if(on){ M=mapData(mapName); buildGrid(); }
  pop(on?'配置エディタ ON':'配置エディタ OFF');
}
function drawDebug(){
  const [mw,mh]=M.size; ctx.save(); ctx.lineWidth=1/cam.s;
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){ const c=cell(x,y);
    if(c==='#'){ ctx.fillStyle=baseGrid[y][x]==='#'?'rgba(220,40,40,.26)':'rgba(255,90,0,.40)'; ctx.fillRect(x*T,y*T,T,T); }
    else if(baseGrid[y][x]==='#'){ ctx.fillStyle='rgba(40,160,255,.28)'; ctx.fillRect(x*T,y*T,T,T); }
    if(c==='G'){ ctx.fillStyle='rgba(240,200,40,.5)'; ctx.fillRect(x*T,y*T,T,T); } }
  ctx.strokeStyle='rgba(30,30,60,.18)'; ctx.beginPath(); for(let x=0;x<=mw;x+=T){ ctx.moveTo(x,0); ctx.lineTo(x,mh); } for(let y=0;y<=mh;y+=T){ ctx.moveTo(0,y); ctx.lineTo(mw,y); } ctx.stroke();
  for(const o of M.objects){ const g=geom(o.type,o.flip); if(!g) continue; const sel=selected&&o.x===selected.x&&o.y===selected.y&&o.type===selected.type;
    ctx.strokeStyle=sel?'rgba(255,170,0,.95)':'rgba(0,150,255,.55)'; ctx.lineWidth=(sel?3:1.5)/cam.s; ctx.strokeRect(o.x+g.ox,o.y+g.oy,g.w,g.h);
    ctx.fillStyle=sel?'#ffaa00':'#0096ff'; ctx.beginPath(); ctx.arc(o.x,o.y,6/cam.s+3,0,7); ctx.fill();
    ctx.setLineDash([8,6]); for(const p of g.parts){ ctx.beginPath(); ctx.moveTo(o.x+p.rect[0],o.y+p.base); ctx.lineTo(o.x+p.rect[0]+p.rect[2],o.y+p.base); ctx.stroke(); } ctx.setLineDash([]); }
  ctx.restore();
}
canvas.addEventListener('pointerdown',e=>{
  if(!debug) return; const r=canvas.getBoundingClientRect(), w=screenToWorld(e.clientX-r.left,e.clientY-r.top);
  const hn=hitNpc(w); drag={sx:e.clientX,sy:e.clientY,moved:false,obj:null,npc:null,w};
  if(hn){ editableMap(); const live=M.npcs.find(m=>m.id===hn.id); selected=null; drag.npc=live; canvas.setPointerCapture(e.pointerId); return; }
  const o=hitObject(w);
  if(o){ editableMap(); const live=M.objects.find(m=>m.x===o.x&&m.y===o.y&&m.type===o.type); selected=live; drag.obj=live; drag.dx=w.x-live.x; drag.dy=w.y-live.y; canvas.setPointerCapture(e.pointerId); }
});
canvas.addEventListener('pointermove',e=>{
  if(drag&&drag.npc){ if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>6) drag.moved=true; if(!drag.moved) return;
    const r=canvas.getBoundingClientRect(), w=screenToWorld(e.clientX-r.left,e.clientY-r.top); drag.npc.x=tileCenter(tileIndex(w.x)); drag.npc.y=tileCenter(tileIndex(w.y+60)); return; }
  if(!drag||!drag.obj) return; if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>6) drag.moved=true; if(!drag.moved) return;
  const r=canvas.getBoundingClientRect(), w=screenToWorld(e.clientX-r.left,e.clientY-r.top);
  drag.obj.x=snap(w.x-drag.dx); drag.obj.y=snap(w.y-drag.dy); buildGrid();
});
canvas.addEventListener('pointerup',e=>{
  const r=canvas.getBoundingClientRect(), w=screenToWorld(e.clientX-r.left,e.clientY-r.top);
  if(!debug){ tapMove(w); return; }
  const d=drag; drag=null; if(!d) return;
  if(d.npc){ if(d.moved){ persistEdit(); pop(`${d.npc.name} (${d.npc.x}, ${d.npc.y})`); } return; }
  if(d.obj){ if(d.moved){ persistEdit(); pop(`${TYPES[d.obj.type].label} (${d.obj.x}, ${d.obj.y})`); } return; }
  selected=null;
  const tx=tileIndex(w.x), ty=tileIndex(w.y); if(!baseGrid[ty]||baseGrid[ty][tx]===undefined) return;
  editableMap(); const key=`${tx},${ty}`; M.blocks=M.blocks.filter(k=>k!==key); M.opens=M.opens.filter(k=>k!==key);
  const nowBlocked=cell(tx,ty)==='#', baseBlocked=baseGrid[ty][tx]==='#';
  if(nowBlocked&&baseBlocked) M.opens.push(key); else if(!nowBlocked&&!baseBlocked) M.blocks.push(key);
  buildGrid(); persistEdit(); pop(`${key} → ${cell(tx,ty)==='#'?'通れない':'通れる'}`);
});
if(debug) setDebug(true);
// build2042: 開始画面は出さず、ノータイムでマップへ（「記録」ボタンのメニューは従来どおり）
overlay.hidden=true;
// build2067 起動カバー：このRPGで使う画像を「全部」読み込み＋デコードしてから外す。
//  ・主人公の全向き・全コマ、全マップのNPC、床・遠景・遺跡、ヘッダー/ボタン/枠（CSS）、会話の立ち絵まで待つ
//  ・待っている間は操作・エンカウントを止める（enabled=false）。0.4秒以上かかる時だけ読み込みバーを出す
//  ・回線が極端に遅い時の保険として最大20秒で開く（従来は3秒で開いてしまい、画像が後から出ていた）
(function bootReveal(){
  const cover=$('boot-cover');
  if(!cover){ enabled=true; return; }
  enabled=false;
  const extra=src=>{ const im=new Image(); im.src=src; return im; };
  const allMaps=Object.values(MAPS);
  const allNpcSprites=[...new Set(allMaps.flatMap(m=>(m.npcs||(m.npc?[m.npc]:[]))).map(n=>n&&n.sprite).filter(Boolean))];
  const themeImgs=[...new Set(allMaps.flatMap(m=>[themeOf(m,'floor'),themeOf(m,'horizon'),(m.castle&&m.castle.img)||themeOf(m,'castle')]))];
  const portraitImgs=[...new Set(Object.values(CH.portraits||{}))];
  const imgs=[...themeImgs.map(npcImg),...Object.values(assets),...Object.values(TYPES).map(t=>t.image),
    ...allNpcSprites.map(npcImg),...[...document.querySelectorAll('img')].filter(im=>im.getAttribute('src')),
    extra('images/ui2_frame.png'),...portraitImgs.map(extra)].filter(Boolean);
  const total=imgs.length+1; let done=0;
  const bar=document.createElement('div'); bar.className='boot-load'; bar.innerHTML='<i></i><span>LOADING</span>';
  const fill=bar.querySelector('i');
  const tick=()=>{ done++; fill.style.width=Math.round(done/total*100)+'%'; };
  const showBarTimer=setTimeout(()=>cover.appendChild(bar),400);
  const decodeIt=im=>(im.decode?im.decode().catch(()=>{}):Promise.resolve());
  const wait=im=>new Promise(r=>{
    const fin=()=>{ tick(); r(); };
    if(im.complete&&im.naturalWidth>0){ decodeIt(im).then(fin); return; }
    if(im.complete&&im.src&&!im.naturalWidth&&im.currentSrc){ fin(); return; } // 読み込み失敗済み
    im.addEventListener('load',()=>decodeIt(im).then(fin),{once:true});
    im.addEventListener('error',fin,{once:true});
  });
  const fontsReady=(document.fonts&&document.fonts.ready?document.fonts.ready.catch(()=>{}):Promise.resolve()).then(tick);
  let shown=false;
  const show=()=>{ if(shown) return; shown=true; clearTimeout(showBarTimer); cam.ready=false; enabled=true;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ cover.classList.add('done'); setTimeout(()=>cover.remove(),450); })); };
  Promise.all([...imgs.map(wait),fontsReady]).then(show);
  setTimeout(show,20000);
})();

/* buttons */
function goBack(){ saveNow(); const close=parentFn('closeZeraphiaRPG','closeZeraphiaCh10RPG'); if(close){ close(); return; } history.back(); }
$('back-to-story').addEventListener('click',e=>{ e.stopPropagation(); goBack(); });
$('returnToStory').addEventListener('click',goBack);
$('novel-skip').addEventListener('click',e=>{ e.stopPropagation(); if(!novel.external) endNovel(); });
/* =====================================================================
   メニュー（編成・持ち物・ミッション・設定）
   編成は本編のストーリー加入キャラ（所持のみ）から最大3人。保存先はエンカウント戦と共通のキー
   ===================================================================== */
const PARTY_KEY='zeraphia_rpg_encounter_party_v1', PARTY_MAX=3;
function readParty(){ try{ const v=JSON.parse(localStorage.getItem(PARTY_KEY)||'[]'); return Array.isArray(v)?v.map(Number).filter(Number.isFinite).slice(0,PARTY_MAX):[]; }catch(_){ return []; } }
function writeParty(ids){ try{ localStorage.setItem(PARTY_KEY,JSON.stringify(ids)); }catch(_){} }
const menuSheet=$('menu-sheet'), partySheet=$('party-sheet');
function openMenu(){ if(enc.phase||novel.active) return; saveNow(); route=null; joystick.x=joystick.y=0; setKnob(0,0); keys.clear();
  menuSheet.hidden=false; partySheet.hidden=true; overlay.hidden=false; }
function closeMenu(){ overlay.hidden=true; menuSheet.hidden=false; partySheet.hidden=true; }
$('menu').addEventListener('click',openMenu);
overlay.addEventListener('click',e=>{
  if(e.target===overlay||e.target.closest('[data-close]')){ closeMenu(); return; }
  if(e.target.closest('[data-back]')){ partySheet.hidden=true; menuSheet.hidden=false; return; }
  if(e.target.closest('[data-dummy]')){ pop('準備中です'); return; }
  if(e.target.closest('[data-open="party"]')) openParty();
});

// 本編の所持キャラ（ストーリー加入キャラのみ）を親ページから取得
function parentWin(){ try{ return window.parent!==window&&window.parent.ShootingCharacters?window.parent:null; }catch(_){ return null; } }
const STORY_FALLBACK=[[1,'エリ'],[5,'ジグ'],[3,'アウラ'],[28,'ミモザ'],[39,'レオナクロス'],[20,'アルノ'],[24,'ノエル'],[30,'リズ'],[25,'リュネ']];
function getRoster(){
  const pw=parentWin();
  if(!pw){ return STORY_FALLBACK.map(([id,name])=>({id,name,owned:true,panel:'',elementIcon:''})); } // 単体起動（確認用）
  const M=pw.ShootingCharacters, abs=u=>u?new URL(u,pw.location.href).href:'';
  return (M.SHOOTING_STORY_FIRST_ORDER||[]).map(id=>{ const c=M.SHOOTING_CHARACTERS[id]; if(!c) return null;
    const el=Array.isArray(c.element)?c.element[0]:c.element;
    return { id, name:c.name, owned:!!M.isShootingCharacterOwned(id), panel:abs(c.panelImage||c.image), elementIcon:el?abs(`images/type_${el}.webp`):'' };
  }).filter(Boolean);
}
let draft=[], roster=[];
function openParty(){
  // 本編から開いている時は、本編のパーティ編成画面と同じ見た目の編成画面（bridge）を使う
  try{ const op=parentFn('openZeraphiaRPGParty','openZeraphiaCh10Party');
    if(op&&op({ chapter:CH_NO, place:M.place, onClose:saved=>{ if(saved) pop('編成を保存しました'); } })) return;
  }catch(_){}
  roster=getRoster();
  const owned=new Set(roster.filter(r=>r.owned).map(r=>r.id));
  draft=readParty().filter(id=>owned.has(id));
  if(!draft.length&&owned.size) draft=[...owned].slice(0,PARTY_MAX);
  menuSheet.hidden=true; partySheet.hidden=false; renderParty();
}
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function renderParty(){
  const byId=new Map(roster.map(r=>[r.id,r]));
  $('party-slots').innerHTML=Array.from({length:PARTY_MAX},(_,i)=>{ const r=byId.get(draft[i]);
    return r?`<button type="button" class="slot filled" data-slot="${i}"><span class="no">${i+1}</span>${i===0?'<span class="lead">LEADER</span>':''}${r.panel?`<img src="${esc(r.panel)}" alt="">`:''}<span class="nm">${esc(r.name)}</span></button>`
            :`<button type="button" class="slot" data-slot="${i}" aria-label="空き">＋</button>`; }).join('');
  $('roster').innerHTML=roster.map(r=>{ const o=draft.indexOf(r.id);
    return `<button type="button" class="ch${r.owned?'':' locked'}${o>=0?' sel':''}" data-id="${r.id}"${o>=0?` data-order="${o+1}"`:''}${r.owned?'':' disabled'}>${r.panel?`<img class="pn" src="${esc(r.panel)}" alt="">`:'<span class="noimg">'+esc(r.name)+'</span>'}${r.elementIcon?`<img class="el" src="${esc(r.elementIcon)}" alt="">`:''}<span class="nm">${esc(r.name)}</span></button>`; }).join('');
  $('roster-count').textContent=`${roster.filter(r=>r.owned).length} / ${roster.length}人 加入`;
  $('party-save').disabled=draft.length<1;
}
$('roster').addEventListener('click',e=>{ const b=e.target.closest('.ch'); if(!b||b.disabled) return; const id=Number(b.dataset.id), i=draft.indexOf(id);
  if(i>=0) draft.splice(i,1); else if(draft.length<PARTY_MAX) draft.push(id); else { pop('編成は3人までです'); return; } renderParty(); });
$('party-slots').addEventListener('click',e=>{ const b=e.target.closest('.slot.filled'); if(!b) return; draft.splice(Number(b.dataset.slot),1); renderParty(); });
$('party-save').addEventListener('click',()=>{ if(!draft.length) return; writeParty(draft); pop('編成を保存しました'); partySheet.hidden=true; menuSheet.hidden=false; });
$('reset').addEventListener('click',()=>{
  try{ localStorage.removeItem(SAVE_KEY); }catch(_){}
  save={map:START_MAP,tx:null,ty:null,met:false,quest:0}; loadMap(START_MAP); player.dir='down'; updateAnimation(0,0,0); enabled=true; overlay.hidden=true;
});
})();
