(()=>{'use strict';
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d',{alpha:false});
const placeEl=document.getElementById('place'),questEl=document.getElementById('quest'),dialog=document.getElementById('dialog'),speaker=document.getElementById('speaker'),line=document.getElementById('line'),overlay=document.getElementById('overlay');
const T=44,MW=27,MH=22;let W=360,H=640,dpr=1,clock=0,last=0,enabled=false,dialogQueue=[],dialogEnd=null,joystick={x:0,y:0},target=null,mapName='庭園',toastUntil=0;
let save={x:13.5*T,y:13.5*T,met:false,gate:false,map:'庭園'};
try{const s=JSON.parse(localStorage.getItem('zeraphia_ch10_rpg_demo_v1')||'null');if(s&&Number.isFinite(s.x)&&Number.isFinite(s.y))save={...save,...s};}catch(_){}
const tileCenter=n=>(n+.5)*T;
const tileIndex=v=>Math.floor(v/T);
const player={x:tileCenter(tileIndex(save.x)),y:tileCenter(tileIndex(save.y)),dir:'down',move:false,animTimer:0,animStepIndex:0};
const TILE_DURATION=.24; // 1マスの移動時間（秒）
let tileMotion=null; // {fromX,fromY,toX,toY,elapsed,dx,dy}
let map=save.map==='回廊'?'回廊':'庭園';
const WALK_SEQUENCE=['idle','walk1','idle','walk2'];
const ANIM_INTERVAL=.13,STEP_BOUNCE_Y=3.5;
const assets={};
for(const dir of ['up','down','left','right'])for(const anim of ['idle','walk1','walk2']){
  const im=new Image(); im.src=`images/chara_01_${dir}_${anim}.webp`;
  assets[dir+'_'+anim]=im;
}
function updateAnimation(vx,vy,dt){
  const moving=Math.hypot(vx,vy)>.001;
  if(!moving){player.move=false;player.animTimer=0;player.animStepIndex=0;return;}
  player.move=true;
  if(Math.abs(vx)>Math.abs(vy))player.dir=vx>0?'right':'left';
  else player.dir=vy>0?'down':'up';
  player.animTimer+=dt;
  while(player.animTimer>=ANIM_INTERVAL){player.animTimer-=ANIM_INTERVAL;player.animStepIndex=(player.animStepIndex+1)%WALK_SEQUENCE.length;}
}

const zigImage=new Image();zigImage.src='images/chara_05_front_idle.webp';
const maps={
'庭園':{ground:'#e4ddd0',base:'#dcd4c5',walls:[[0,0,27,1],[0,21,27,1],[0,0,1,22],[26,0,1,22],[1,17,7,4],[16,17,10,4],[0,20,27,2]],gate:{x:23,y:6},npc:{x:13,y:9,name:'ジグ',lines:[]}},
'回廊':{ground:'#aaa7a1',base:'#8f9292',walls:[[0,0,27,1],[0,21,27,1],[0,0,1,22],[26,0,1,22],[2,2,5,5],[20,2,5,5],[2,15,5,5],[20,15,5,5],[10,7,7,2],[10,15,7,2]],gate:{x:3,y:11},npc:{x:14,y:11,name:'残響',lines:['世界は終わったのではない。','……ここから先が、あなたたちの新しい旅になる。']}}};
// Restore old saves only when the coordinates are inside the current, walkable grid.
// Earlier prototypes used different maps, so invalid saves must not trap the player.
if (map === '庭園') {
  const cx = tileIndex(player.x), cy = tileIndex(player.y);
  if (cx < 3 || cx > 23 || cy < 5 || cy > 18 ||
      maps[map].walls.some(([wx,wy,ww,hh]) => cx>=wx && cx<wx+ww && cy>=wy && cy<wy+hh) ||
      (cx===maps[map].npc.x && cy===maps[map].npc.y)) {
    player.x=tileCenter(13); player.y=tileCenter(13);
  }
}
function resize(){dpr=Math.min(2,window.devicePixelRatio||1);W=canvas.clientWidth;H=canvas.clientHeight;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=true;if(typeof clampPlayerToScreen==='function')clampPlayerToScreen();}window.addEventListener('resize',resize);resize();
const rnd=(x,y,s=0)=>{let v=Math.sin((x*127.1+y*311.7+s*43.9)*.079)*43758.5453;return v-Math.floor(v);};
function solid(x,y){const a=maps[map];const col=Math.floor(x/T),row=Math.floor(y/T);if(col<1||row<1||col>=MW-1||row>=MH-1)return true;return a.walls.some(([cx,cy,w,h])=>col>=cx&&col<cx+w&&row>=cy&&row<cy+h);}
function collides(x,y){const r=12;return solid(x-r,y-r)||solid(x+r,y-r)||solid(x-r,y+r)||solid(x+r,y+r);}
function saveNow(){if(tileMotion)return;try{localStorage.setItem('zeraphia_ch10_rpg_demo_v1',JSON.stringify({...save,x:player.x,y:player.y,map}));}catch(_){}}
function pop(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');toastUntil=performance.now()+1900;}
function speak(name,lines,onEnd){dialogQueue=lines.slice();dialogEnd=onEnd||null;speaker.textContent=name;dialog.hidden=false;nextLine();}
function nextLine(){if(dialogQueue.length){line.textContent=dialogQueue.shift();return;}dialog.hidden=true;let cb=dialogEnd;dialogEnd=null;if(cb)cb();}
dialog.addEventListener('click',nextLine);
function nearby(){const n=maps[map].npc;return Math.abs(tileIndex(player.x)-n.x)+Math.abs(tileIndex(player.y)-n.y)===1;}
function interact(){
 if(!dialog.hidden){nextLine();return;}
 if(novel.active){advanceNovel();return;}
 if(tileMotion)return;
 const m=maps[map];
 if(nearby()){
   const n=m.npc;
   if(map==='庭園'){
     if(!save.met){save.met=true;saveNow();questEl.textContent='目的：北東の光の門へ';}
     startZigNovel();return;
   }
   speak(n.name,n.lines);return;
 }
 const dx=player.x-(m.gate.x+.5)*T,dy=player.y-(m.gate.y+.5)*T;
 if(Math.hypot(dx,dy)<T*1.55){portal();return;}
 pop('隣のマスから話しかけてください');
}
document.getElementById('action').addEventListener('click',interact);
function portal(){if(map==='庭園'){map='回廊';player.x=tileCenter(5);player.y=tileCenter(11);tileMotion=null;updateAnimation(0,0,0);placeEl.textContent='忘却の回廊';questEl.textContent='目的：残響を探す';speak('SYSTEM',['新たな場所に到着した。','第十章の探索は、ここから始まる。']);}else{map='庭園';player.x=tileCenter(20);player.y=tileCenter(11);tileMotion=null;updateAnimation(0,0,0);placeEl.textContent='灰色の庭園';questEl.textContent='目的：光の門を探す';}target=null;clampPlayerToScreen();saveNow();}
function drawGround(cameraX,cameraY){const a=maps[map];ctx.fillStyle=a.ground;ctx.fillRect(0,0,W,H);const fromX=Math.max(0,Math.floor(cameraX/T)-1),fromY=Math.max(0,Math.floor(cameraY/T)-1),toX=Math.min(MW-1,Math.ceil((cameraX+W)/T)+1),toY=Math.min(MH-1,Math.ceil((cameraY+H)/T)+1);
for(let y=fromY;y<=toY;y++)for(let x=fromX;x<=toX;x++){const px=x*T-cameraX,py=y*T-cameraY,r=rnd(x,y),stone=((x+y)&1)===0;ctx.fillStyle=map==='庭園'?(stone?(r<.5?'#e9e2d7':'#ddd5c8'):(r<.5?'#e3dacc':'#d7cec1')):(r<.45?'#b8b4ac':'#c2b9b1');ctx.globalAlpha=1;ctx.fillRect(px,py,T+.5,T+.5);ctx.strokeStyle=map==='庭園'?'rgba(141,135,126,.24)':'#777b7440';ctx.strokeRect(px+.5,py+.5,T,T);if(map==='庭園'&&r>.87){ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.arc(px+T*.24,py+T*.22,3,0,7);ctx.fill();ctx.beginPath();ctx.arc(px+T*.31,py+T*.3,1.4,0,7);ctx.fill();ctx.beginPath();ctx.arc(px+T*.17,py+T*.31,1.4,0,7);ctx.fill();ctx.beginPath();ctx.arc(px+T*.24,py+T*.39,1.4,0,7);ctx.fill();}}
if(map==='庭園'){
  const sun=ctx.createRadialGradient(-120,170,30,-120,170,340);sun.addColorStop(0,'rgba(255,252,241,.9)');sun.addColorStop(.4,'rgba(255,249,231,.46)');sun.addColorStop(1,'rgba(255,249,231,0)');ctx.fillStyle=sun;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=.16;ctx.fillStyle='#495646';for(let i=0;i<8;i++){ctx.beginPath();ctx.ellipse(72+i*18,95+i*48,62,18,-.78,0,7);ctx.fill();}ctx.restore();
}
for(const [cx,cy,w,h] of a.walls)for(let y=cy;y<cy+h;y++)for(let x=cx;x<cx+w;x++){let px=x*T-cameraX,py=y*T-cameraY;if(px<-T||px>W||py<-T||py>H)continue;const r=rnd(x,y,2);if(map==='庭園'){ctx.fillStyle='#546748';ctx.fillRect(px,py,T,T);ctx.fillStyle=r>.5?'#5f7a51':'#476742';ctx.beginPath();ctx.arc(px+14,py+14,18,0,7);ctx.arc(px+29,py+16,19,0,7);ctx.arc(px+20,py+30,17,0,7);ctx.fill();if(r>.62){ctx.fillStyle='rgba(255,255,255,.88)';ctx.beginPath();ctx.arc(px+18,py+16,3.2,0,7);ctx.fill();ctx.beginPath();ctx.arc(px+22.8,py+18,1.8,0,7);ctx.fill();ctx.beginPath();ctx.arc(px+13,py+20,1.8,0,7);ctx.fill();ctx.beginPath();ctx.arc(px+18,py+23,1.8,0,7);ctx.fill();}}else{ctx.fillStyle='#626569';ctx.fillRect(px+1,py+1,T-2,T-2);ctx.strokeStyle='#d5cac085';ctx.strokeRect(px+6,py+6,T-12,T-12);ctx.fillStyle='#929195';ctx.fillRect(px+7,py+8,T-14,9);}}
for(let i=0;i<12;i++){let x=(rnd(i,4,1)*MW*T)-cameraX,y=(rnd(i,9,1)*MH*T)-cameraY;if(x<0||x>W||y<0||y>H)continue;ctx.fillStyle='rgba(232,170,185,.72)';ctx.beginPath();ctx.ellipse(x,y,3,6,i,0,7);ctx.fill();}
}
function drawGate(camX,camY){const g=maps[map].gate,x=(g.x+.5)*T-camX,y=(g.y+.5)*T-camY,pulse=Math.sin(clock*2)*.12+.86;ctx.save();ctx.translate(x,y);ctx.shadowBlur=22;ctx.shadowColor='#e9d4ac';ctx.strokeStyle=`rgba(245,228,185,${pulse})`;ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,0,23,32,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#f6e8c766';ctx.fillRect(-14,-27,28,54);ctx.shadowBlur=0;ctx.fillStyle='#e7cc91';ctx.beginPath();ctx.moveTo(0,-41);ctx.lineTo(6,-29);ctx.lineTo(0,-19);ctx.lineTo(-6,-29);ctx.fill();ctx.restore();}
function drawNpc(camX,camY){const n=maps[map].npc,x=(n.x+.5)*T-camX,y=(n.y+.5)*T-camY;if(map==='庭園'){
 ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(x,y+4,17,6,0,0,7);ctx.fill();
 if(zigImage.complete&&zigImage.naturalWidth)ctx.drawImage(zigImage,x-54,y-92,108,108);
 if(nearby()){ctx.fillStyle='#fcf1cb';ctx.font='19px Georgia';ctx.textAlign='center';ctx.fillText('!',x,y-94);}
 return;
 }ctx.save();ctx.translate(x,y);ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(0,13,18,6,0,0,7);ctx.fill();ctx.fillStyle=map==='庭園'?'#5b5066':'#606b7f';ctx.beginPath();ctx.moveTo(0,-34);ctx.lineTo(18,13);ctx.lineTo(-18,13);ctx.fill();ctx.fillStyle='#e3c8b2';ctx.beginPath();ctx.arc(0,-27,10,0,7);ctx.fill();ctx.fillStyle='#393541';ctx.beginPath();ctx.arc(0,-34,12,Math.PI,0);ctx.fill();ctx.strokeStyle='#dbc492';ctx.lineWidth=2;ctx.strokeRect(-13,-35,26,49);ctx.restore();if(Math.hypot(player.x-(n.x+.5)*T,player.y-(n.y+.5)*T)<T*1.7){ctx.fillStyle='#fcf1cb';ctx.font='19px Georgia';ctx.textAlign='center';ctx.fillText('!',x,y-52);}}
function drawPlayer(camX,camY){
  const x=player.x-camX,y=player.y-camY;
  ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(x,y+4,21,6,0,0,7);ctx.fill();
  const frame=player.move?WALK_SEQUENCE[player.animStepIndex]:'idle';
  const ready=im=>im&&im.complete&&im.naturalWidth>0;
  let img=assets[player.dir+'_'+frame],flip=false;
  if(!ready(img)&&player.dir==='right'){img=assets['left_'+frame];flip=true;}
  if(!ready(img)){img=assets[player.dir+'_idle'];flip=false;}
  if(!ready(img)&&player.dir==='right'){img=assets.left_idle;flip=true;}
  if(ready(img)){
    // Keep the square source aspect ratio. The visual foot position is maintained.
    const size=108,bounce=player.move&&frame!=='idle'?STEP_BOUNCE_Y:0;
    const dx=x-size/2,dy=y-size+15+bounce;
    ctx.save();
    if(flip){ctx.translate(x,0);ctx.scale(-1,1);ctx.drawImage(img,-size/2,dy,size,size);}
    else ctx.drawImage(img,dx,dy,size,size);
    ctx.restore();
  }else{ctx.fillStyle='#d2c4ce';ctx.beginPath();ctx.arc(x,y-22,14,0,7);ctx.fill();}
}
const fieldArt=new Image();fieldArt.src='images/field_ui.webp';
// Static, screenshot-matched field art with a separate world-coordinate sprite layer.
// One square on the grid maps to one STEP pixels on the screen.
function fieldLayout(){
  const step=Math.min(W*.095,H*.035);
  return {step, originX:W*.504, originY:H*.475};
}
// 画面に表示されるキャラの全身が見切れない範囲を、端末サイズから算出。
// field_ui.webp は固定背景なのでカメラを追従させず、表示可能マス内で停止させる。
function visibleTileBounds(){
  const f=fieldLayout(), sprite=f.step*2.65;
  const side=Math.max(12,sprite*.46); // 立ち絵の左右の余白
  const top=Math.max(H*.215,sprite*.15); // 上部の章タイトルを避ける
  const bottom=H*.93; // 画面最下端に立ち絵が隠れないようにする
  const colMin=Math.ceil(13+(side-f.originX)/f.step);
  const colMax=Math.floor(13+(W-side-f.originX)/f.step);
  const rowMin=Math.ceil(13+(top+sprite*.85-f.originY)/f.step);
  const rowMax=Math.floor(13+(bottom-sprite*.15-f.originY)/f.step);
  return {
    minX:Math.max(1,colMin),maxX:Math.min(MW-2,colMax),
    minY:Math.max(1,rowMin),maxY:Math.min(MH-2,rowMax)
  };
}
function insideVisibleTiles(x,y){
  if(map!=='庭園')return x>=1&&x<MW-1&&y>=1&&y<MH-1;
  const b=visibleTileBounds();
  return x>=b.minX&&x<=b.maxX&&y>=b.minY&&y<=b.maxY;
}
function clampPlayerToScreen(){
  if(map!=='庭園'||tileMotion)return;
  const b=visibleTileBounds();
  const x=Math.max(b.minX,Math.min(b.maxX,tileIndex(player.x)));
  const y=Math.max(b.minY,Math.min(b.maxY,tileIndex(player.y)));
  // NPCの居るマスは避ける。
  if(x===maps[map].npc.x&&y===maps[map].npc.y){
    player.x=tileCenter(x);player.y=tileCenter(Math.min(b.maxY,y+1));
  }else{player.x=tileCenter(x);player.y=tileCenter(y);}
}
function screenForTile(worldX,worldY){
  const f=fieldLayout();
  return {x:f.originX+(worldX-tileCenter(13))/T*f.step,
          y:f.originY+(worldY-tileCenter(13))/T*f.step};
}
function render(){
  if(fieldArt.complete&&fieldArt.naturalWidth)ctx.drawImage(fieldArt,0,0,W,H);
  else{ctx.fillStyle='#e5e2ed';ctx.fillRect(0,0,W,H);}
  const f=fieldLayout();
  if(map==='庭園'){
    const n=maps[map].npc;
    const pos=screenForTile(tileCenter(n.x),tileCenter(n.y));
    const s=f.step*2.65;
    ctx.fillStyle='#29272d48';ctx.beginPath();ctx.ellipse(pos.x,pos.y+3,s*.24,s*.07,0,0,7);ctx.fill();
    if(zigImage.complete&&zigImage.naturalWidth){
      ctx.drawImage(zigImage,pos.x-s/2,pos.y-s*.85,s,s);
    }else{
      ctx.fillStyle='#e8dfd0';ctx.beginPath();ctx.arc(pos.x,pos.y-s*.48,s*.22,0,Math.PI*2);ctx.fill();
    }
    if(nearby()){
      ctx.fillStyle='#987b42';ctx.textAlign='center';ctx.font=`${Math.max(13,f.step*.65)}px Georgia`;
      ctx.fillText('!',pos.x,pos.y-s*.87);
    }
  }
  const p=screenForTile(player.x,player.y);
  const frame=player.move?WALK_SEQUENCE[player.animStepIndex]:'idle';
  const ready=im=>im&&im.complete&&im.naturalWidth>0;
  let img=assets[player.dir+'_'+frame],flip=false;
  if(!ready(img)&&player.dir==='right'){img=assets['left_'+frame];flip=true;}
  if(!ready(img)){img=assets[player.dir+'_idle'];flip=false;}
  if(!ready(img)&&player.dir==='right'){img=assets.left_idle;flip=true;}
  const size=f.step*2.65;
  ctx.fillStyle='#30303950';ctx.beginPath();ctx.ellipse(p.x,p.y+4,size*.26,size*.075,0,0,7);ctx.fill();
  if(ready(img)){
    const bounce=player.move&&frame!=='idle'?3.5*(W/950):0;
    const y=p.y-size*.85+bounce;
    ctx.save();
    if(flip){ctx.translate(p.x,0);ctx.scale(-1,1);ctx.drawImage(img,-size/2,y,size,size);}
    else ctx.drawImage(img,p.x-size/2,y,size,size);
    ctx.restore();
  }
}

// CH10 NPC conversation: standalone reproduction of the existing novel presentation.
const novelRoot=document.getElementById('ch10-novel');
const novelName=document.getElementById('ch10-novel-name');
const novelText=document.getElementById('ch10-novel-text');
const novelScene=document.getElementById('ch10-novel-scene');
const novel={active:false,index:0,typed:0,timer:0,ready:false,entries:[
 {speaker:'ジグ',text:'まだ開発中だ。この先は遊べねぇぞ。'},
 {speaker:'エリ',text:'……うん。\n出来上がるのが、楽しみだね。'},
]};
function startZigNovel(){
 target=null;joystick.x=joystick.y=0;
 document.getElementById('stick-knob').style.transform='translate(0,0)';
 novel.active=true;novel.index=0;novelRoot.hidden=false;
 novelRoot.classList.remove('closing');novelRoot.classList.add('active');
 showNovelEntry();
}
function showNovelEntry(){
 const e=novel.entries[novel.index];if(!e){endNovel();return;}
 novelName.textContent=e.speaker;novelText.textContent='';novel.typed=0;novel.timer=0;novel.ready=false;
 novelScene.textContent='灰色の庭園  —  第十章';
 novelRoot.classList.remove('entry-fade');void novelRoot.offsetWidth;novelRoot.classList.add('entry-fade');
 document.getElementById('ch10-novel-next').textContent='TAP TO CONTINUE';
}
function advanceNovel(){
 if(!novel.active)return;
 const e=novel.entries[novel.index];
 if(!novel.ready){novelText.textContent=e.text;novel.typed=Array.from(e.text).length;novel.ready=true;return;}
 novel.index++;if(novel.index>=novel.entries.length){endNovel();return;}
 showNovelEntry();
}
function endNovel(){
 novel.active=false;novelRoot.classList.remove('active');novelRoot.hidden=true;
 updateAnimation(0,0,0);saveNow();
}
function updateNovel(dt){
 if(!novel.active||novel.ready)return;
 novel.timer+=dt;
 const chars=Array.from(novel.entries[novel.index].text);
 while(novel.timer>=.032&&novel.typed<chars.length){novel.timer-=.032;novel.typed++;}
 novelText.textContent=chars.slice(0,novel.typed).join('');
 if(novel.typed>=chars.length)novel.ready=true;
}
novelRoot.addEventListener('click',advanceNovel);
const keys=new Set();window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.key==='Enter'||e.key===' ')interact();if(e.key==='Escape'&&!novel.active){overlay.hidden=true;dialog.hidden=true;}});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();joystick.x=joystick.y=0;target=null;});
// グリッド移動：入力は必ず上下左右の1方向に丸める（斜め移動なし）。
function inputDirection(){
  let vx=joystick.x,vy=joystick.y;
  if(keys.has('arrowleft')||keys.has('a'))vx-=1;
  if(keys.has('arrowright')||keys.has('d'))vx+=1;
  if(keys.has('arrowup')||keys.has('w'))vy-=1;
  if(keys.has('arrowdown')||keys.has('s'))vy+=1;
  if(Math.hypot(vx,vy)>.20){
    // 同程度の場合は縦方向を優先する。
    if(Math.abs(vx)>Math.abs(vy))return {dx:Math.sign(vx),dy:0};
    return {dx:0,dy:Math.sign(vy)};
  }
  if(target){
    const cx=tileIndex(player.x),cy=tileIndex(player.y);
    const dx=target.x-cx,dy=target.y-cy;
    if(dx===0&&dy===0){target=null;return null;}
    // タップ地点まで1マスずつ直交移動。行き止まりでは停止。
    if(Math.abs(dx)>Math.abs(dy))return {dx:Math.sign(dx),dy:0};
    return {dx:0,dy:Math.sign(dy)};
  }
  return null;
}
function beginTileStep(dir){
  const tx=tileIndex(player.x)+dir.dx,ty=tileIndex(player.y)+dir.dy;
  if((map==='庭園' ? !insideVisibleTiles(tx,ty) : solid(tileCenter(tx),tileCenter(ty))) ||
      (maps[map].npc.x===tx&&maps[map].npc.y===ty)){
    target=null;
    player.dir=dir.dx ? (dir.dx>0?'right':'left') : (dir.dy>0?'down':'up');
    return false;
  }
  tileMotion={fromX:player.x,fromY:player.y,toX:tileCenter(tx),toY:tileCenter(ty),elapsed:0,dx:dir.dx,dy:dir.dy};
  return true;
}
function move(dt){
  // 会話やメニュー中は歩行開始しない。
  if(!enabled||!overlay.hidden||!dialog.hidden||novel.active){
    if(!tileMotion)updateAnimation(0,0,dt);
    return;
  }
  if(!tileMotion){
    const dir=inputDirection();
    if(!dir || !beginTileStep(dir)){updateAnimation(0,0,dt);return;}
  }
  const motion=tileMotion;
  motion.elapsed=Math.min(TILE_DURATION,motion.elapsed+dt);
  const t=motion.elapsed/TILE_DURATION;
  // マスの間だけ補間し、着地点は整数マス中心に固定する。
  player.x=motion.fromX+(motion.toX-motion.fromX)*t;
  player.y=motion.fromY+(motion.toY-motion.fromY)*t;
  updateAnimation(motion.dx,motion.dy,dt);
  if(t>=1){
    player.x=motion.toX;player.y=motion.toY;
    tileMotion=null;
    const g=maps[map].gate;
    if(tileIndex(player.x)===g.x&&tileIndex(player.y)===g.y){portal();return;}
    saveNow();
    // 次の入力がない時は直ちに待機に戻す。
    if(!inputDirection())updateAnimation(0,0,0);
  }
}
function loop(ts){const dt=Math.min(.05,Math.max(0,(ts-last)/1000||0));last=ts;clock+=dt;move(dt);updateNovel(dt);render();if(toastUntil&&ts>toastUntil){document.getElementById('toast').classList.remove('show');toastUntil=0;}requestAnimationFrame(loop);}requestAnimationFrame(loop);
const stick=document.getElementById('stick'),knob=document.getElementById('stick-knob');let stickPid=null;function setStick(e){let b=stick.getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2,dx=e.clientX-cx,dy=e.clientY-cy,r=b.width*.29,len=Math.max(r,Math.hypot(dx,dy));joystick.x=dx/len;joystick.y=dy/len;knob.style.transform=`translate(${joystick.x*r}px,${joystick.y*r}px)`;target=null;}function resetStick(){stickPid=null;joystick.x=joystick.y=0;knob.style.transform='translate(0,0)';}stick.addEventListener('pointerdown',e=>{e.preventDefault();stickPid=e.pointerId;stick.setPointerCapture(e.pointerId);setStick(e);});stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPid)setStick(e);});stick.addEventListener('pointerup',resetStick);stick.addEventListener('pointercancel',resetStick);
canvas.addEventListener('pointerup',e=>{if(!enabled||!overlay.hidden||!dialog.hidden||novel.active)return;const r=canvas.getBoundingClientRect(),camX=Math.max(0,Math.min(MW*T-W,player.x-W/2)),camY=Math.max(0,Math.min(MH*T-H,player.y-H/2));const f=fieldLayout(),sx=e.clientX-r.left,sy=e.clientY-r.top;const wx=tileCenter(13)+(sx-f.originX)/f.step*T,wy=tileCenter(13)+(sy-f.originY)/f.step*T;const n=maps[map].npc;if(Math.hypot(wx-tileCenter(n.x),wy-tileCenter(n.y))<T*1.1&&nearby()){interact();return;}const b=visibleTileBounds();target={x:Math.max(b.minX,Math.min(b.maxX,tileIndex(wx))),y:Math.max(b.minY,Math.min(b.maxY,tileIndex(wy)))};});
document.getElementById('back-to-story').addEventListener('click',()=>{try{window.parent.closeZeraphiaCh10RPG();}catch(_){}if(window.parent===window){window.history.back();}});
document.getElementById('start').addEventListener('click',()=>{enabled=true;overlay.hidden=true;pop('上下左右、1マスずつ移動します');});document.getElementById('menu').addEventListener('click',()=>{saveNow();overlay.hidden=false;});document.getElementById('reset').addEventListener('click',()=>{try{localStorage.removeItem('zeraphia_ch10_rpg_demo_v1');}catch(_){}map='庭園';player.x=tileCenter(13);player.y=tileCenter(13);tileMotion=null;player.dir='down';player.animTimer=0;player.animStepIndex=0;player.move=false;save={x:player.x,y:player.y,met:false,gate:false,map};placeEl.textContent='灰色の庭園';questEl.textContent='目的：光の門を探す';target=null;enabled=true;overlay.hidden=true;});
const returnBtn=document.getElementById('returnToStory');if(returnBtn) returnBtn.addEventListener('click',()=>{saveNow();try{if(window.parent&&window.parent!==window&&typeof window.parent.closeZeraphiaCh10RPG==='function'){window.parent.closeZeraphiaCh10RPG();return;}}catch(_){}history.back();});
const skipBtn=document.getElementById('novel-skip');if(skipBtn) skipBtn.addEventListener('click',(e)=>{e.stopPropagation();endNovel();});
if(map==='回廊'){placeEl.textContent='忘却の回廊';questEl.textContent='目的：残響を探す';}
})();