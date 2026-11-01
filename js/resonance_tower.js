// ZERAPHIA build1531 — 残響の塔：クリア済み階層は自由編成・無報酬の再挑戦
// build1661: 全20層（16〜19Fは単騎）
// アカウント・週次進行・封印はSupabaseの3つのRPCのみを正とする。
(function(){
  'use strict';
  const descriptions=[
    '塔の入口。\n小規模な敵の群れを撃破する。',
    '水と木の敵が現れる。\n属性を選んで挑もう。',
    '第一の難関。\n火・水・木の混成部隊を突破せよ。',
    '遮断壁を越えて進む第四層。\n温存した仲間を活かそう。',
    '光と闇の敵が待ち受ける。\n相性を見極めよ。',
    '第二の難関。\n移動する遮断壁の先の敵を倒せ。',
    '上層への道。\n敵の数も攻撃密度も増す。',
    '最深部を目前にした試練。\nここで戦力を温存したい。',
    '第三の難関。\n火・水の属性バリアを突破せよ。',
    '第十層の守護者。\nPHASE2・3のHP半減時に5秒間左右反転。',
    '五属性の天使が一体ずつ出現。\n濃密な弾幕を突破せよ。',
    '光と闇の属性バリア。\n周期的な即死弾に警戒せよ。',
    '蜘蛛の群れと\n白い三頭狼の強敵を撃破せよ。',
    '強化リヴィア。\n20秒おきに10秒間だけ遮断壁が出現。',
    '最深部の主・トワ。\n即死弾が常に漂い、時おり世界が暗転する。',
    // build1661: 16〜19Fは単騎（1人のみ）の高難度
    '【単騎】レイドボス「テスト」。',
    '【単騎】レイドボス「カミラ」。',
    '【単騎】レイドボス「シエン」。',
    '【単騎】リズム 最上級。',
    '真の最深部・強化版 トワ。'
  ];
  // build1661: 全20層。16〜19Fは単騎。
  const TOWER_FLOORS=20;
  const SOLO_FLOORS=[16,17,18,19];
  const partyLimit=floor=>SOLO_FLOORS.includes(Number(floor))?1:3;
  const partyRangeText=floor=>partyLimit(floor)===1?'1体（単騎）':'1〜3体';
  const numerals=['第一層','第二層','第三層','第四層','第五層','第六層','第七層','第八層','第九層','第十層','第十一層','第十二層','第十三層','第十四層','第十五層','第十六層','第十七層','第十八層','第十九層','第二十層'];

  // v1420: tower rewards; the database RPC is authoritative for grants.
  // build1606: 聖樹の息吹は3層ごと。3F×1・6F×2・9F×3・12F×4・15F×5（サーバー claim_resonance_tower_rewards と揃える）
  const towerBreath=floor=>floor%3===0&&floor<=15?Object.freeze({id:'shinju_nutrition',name:'聖樹の息吹',qty:floor/3,img:'images/shinju_aura.webp'}):null;
  const TOWER_REWARDS_BASE=Object.freeze([
    [{id:'kyoumei_stone',name:'共鳴石',qty:3,img:'images/item_kyoumeistone.webp'}],
    [{id:'flower_r',name:'聖霊花(R)',qty:1,img:'images/item_flower_r.webp'}],
    [{id:'level_exp_large',name:'強化素材・金',qty:5,img:'images/item_exp_gold.webp'}],
    [{id:'soul_vessel_fire',name:'魂の器(火)',qty:1,img:'images/item_soul_vessel_fire.webp'},
     {id:'soul_vessel_aqua',name:'魂の器(水)',qty:1,img:'images/item_soul_vessel_aqua.webp'},
     {id:'soul_vessel_wood',name:'魂の器(木)',qty:1,img:'images/item_soul_vessel_wood.webp'}],
    [{id:'soul_vessel_dark',name:'魂の器(闇)',qty:1,img:'images/item_soul_vessel_dark.webp'},
     {id:'soul_vessel_light',name:'魂の器(光)',qty:1,img:'images/item_soul_vessel_light.webp'}],
    [{id:'gem',name:'結晶',qty:5,img:'images/icon_gem.webp'}],
    [{id:'tower_limited_ten_ticket',name:'限定邂逅10連無料TICKET',qty:1,img:'images/gacha_ticket_10.webp',symbol:'10連',ticket:true}],
    [{id:'gem',name:'結晶',qty:10,img:'images/icon_gem.webp'}],
    [{id:'special_stage_ticket',name:'Special Ticket -ノア-',qty:1,img:'images/special_stage_ticket.webp'}],
    [{id:'gem',name:'結晶',qty:30,img:'images/icon_gem.webp'}],
    ...Array.from({length:4},()=>[{id:'flower_r',name:'聖霊花(R)',qty:1,img:'images/item_flower_r.webp'}]),
    // build1486: 15F（トワ）の報酬。使い道は未定。
    [{id:'towa_memory',name:'トワの記憶',qty:1,img:'images/item_towa_memory.webp'}],
    // build1661: 16〜20F（サーバー finish_resonance_tower_run / claim_resonance_tower_rewards と揃える）
    [{id:'gem',name:'結晶',qty:5,img:'images/icon_gem.webp'}],
    [{id:'gem',name:'結晶',qty:5,img:'images/icon_gem.webp'}],
    [{id:'gem',name:'結晶',qty:5,img:'images/icon_gem.webp'}],
    [{id:'special_stage_ticket',name:'Special Ticket -ノア-',qty:1,img:'images/special_stage_ticket.webp'}],
    [{id:'towa_memory',name:'トワの記憶',qty:1,img:'images/item_towa_memory.webp'}]
  ]);
  const TOWER_REWARDS=Object.freeze(TOWER_REWARDS_BASE.map((list,i)=>{const breath=towerBreath(i+1);return Object.freeze(breath?[...list,breath]:[...list]);}));
  function createTowerRewardList(floors){
    const out=document.createElement('div');out.className='resonance-tower-reward-list';
    out.setAttribute('aria-label','残響の塔クリア報酬');
    out.tabIndex=0;
    floors.forEach(floor=>{
      const list=TOWER_REWARDS[floor-1];
      // build1451: 突破済みの行を区別
      const row=document.createElement('div');
      row.className='resonance-tower-reward-row'+(cleared(floor)?' is-cleared':'')+(list.length>1?' is-multi':'');
      const index=document.createElement('span');index.className='resonance-tower-reward-floor';
      index.textContent=String(floor).padStart(2,'0')+'F';row.append(index);
      const items=document.createElement('span');items.className='resonance-tower-reward-items';
      list.forEach(item=>{
        const box=document.createElement('span');box.className='resonance-tower-reward-item'+(item.ticket?' is-ticket':'');
        if(item.img){
          const img=document.createElement('img');img.src=item.img;img.alt='';img.decoding='async';
          // 画像が無い環境では従来の文字アイコンに戻す
          img.addEventListener('error',()=>{const symbol=document.createElement('span');symbol.className='resonance-tower-reward-symbol';symbol.textContent=item.symbol||'券';img.replaceWith(symbol);},{once:true});
          box.append(img);
        }
        else {const symbol=document.createElement('span');symbol.className='resonance-tower-reward-symbol';symbol.textContent=item.symbol||'券';box.append(symbol);}
        const label=document.createElement('span');label.className='resonance-tower-reward-name';label.textContent=item.name;
        const count=document.createElement('b');count.textContent='×'+item.qty;
        label.append(count);
        box.append(label);items.append(box);
      });
      row.append(items);
      if(cleared(floor)){
        const claimed=document.createElement('span');claimed.className='resonance-tower-reward-claimed';claimed.textContent='CLEAR';row.append(claimed);
      }
      out.append(row);
    });
    return out;
  }

  let selected=1, progress=null, busy=false, focusBeforePanel=null, attempt=null, finishPromise=null, replayFloor=0;
  // build1712: 残響の塔（絶望）。画面・封印・練習・中断復帰の仕組みは通常の塔と共通で、
  //  呼ぶRPCとステージIDだけを切り替える。進行・封印はサーバー側で塔ごとに別管理。報酬は20F踏破の称号のみ。
  const TOWER_MODES=Object.freeze({
    normal:Object.freeze({key:'normal',label:'残響の塔',english:'— E C H O &nbsp; T O W E R —',kicker:'ECHO TOWER',
      stagePrefix:'shooting_tower_',rpcState:'get_resonance_tower_state',rpcBegin:'begin_resonance_tower_run',
      rpcFinish:'finish_resonance_tower_run',rpcClaim:'claim_resonance_tower_rewards',
      lead:'一度登った者の力は、<br>次の層には届かない。'}),
    despair:Object.freeze({key:'despair',label:'残響の塔（絶望）',english:'— D E S P A I R &nbsp; T O W E R —',kicker:'DESPAIR TOWER',
      stagePrefix:'shooting_despair_tower_',rpcState:'get_despair_tower_state',rpcBegin:'begin_despair_tower_run',
      rpcFinish:'finish_despair_tower_run',rpcClaim:'',
      lead:'すべての弾が、死を告げる。<br>一度触れれば、そこで終わる。'})
  });
  const DESPAIR_TITLE_ID='despair_conqueror';
  let mode='normal';
  // build1713: 絶望は「今週の通常の塔を20Fまで制覇した人」にだけ出現する腕試し。
  //  通常の塔の state を読むたびに記録し、未制覇の週は絶望タブを出さない（サーバー側でも begin を拒否する）。
  let normalCompletedThisWeek=false;
  const despairUnlocked=()=>normalCompletedThisWeek;
  const M=()=>TOWER_MODES[mode]||TOWER_MODES.normal;
  const stageIdFor=(floor,m)=>(TOWER_MODES[m]||M()).stagePrefix+String(floor).padStart(2,'0');
  const $=id=>document.getElementById(id);
  function notify(message){
    if(typeof window.showToast==='function') window.showToast(message);
    else alert(message);
  }
  function rpcClient(){
    const sb=window.zsSupabase;
    if(!sb || typeof sb.rpc!=='function') throw new Error('サーバーに接続できません');
    return sb;
  }
  function currentFloor(){return progress ? Number(progress.currentFloor||1):1;}
  function cleared(floor){return !!(progress && (progress.clearedFloors||[]).includes(floor));}
  function available(floor){return !!(progress && !progress.completed && currentFloor()===floor);}
  // 再挑戦は今週の突破済み階層に限る。出撃トークン・報酬・封印は発行しない。
  function isReplayFloor(floor){return Number(replayFloor)>0 && Number(floor)===replayFloor && cleared(Number(floor));}
  function isCharacterAvailable(id){
    if(!progress) return false; // サーバー状態を受信するまでは出撃不可
    if(isReplayFloor(replayFloor)) return true; // 再挑戦では週内封印を適用しない（所持判定は戦闘側）
    return !(progress.sealedCharacterIds||[]).some(n=>Number(n)===Number(id));
  }
  function syncTowerWallet(){
    if(!progress || !window.userProfile) return;
    if(Number.isFinite(Number(progress.gem))) window.userProfile.gem=Number(progress.gem);
    if(Number.isFinite(Number(progress.specialStageTicket))) window.userProfile.special_stage_ticket=Number(progress.specialStageTicket);
    if(typeof window.updateMainUI==='function') window.updateMainUI();
    if(typeof window.updateSummonGemUI==='function') window.updateSummonGemUI();
  }
  function statusText(){
    if(!progress) return '進行情報を取得できません';
    if(progress.completed) return mode==='despair'?'今週の絶望を踏破しました':'今週の塔を完全制覇しました。「絶望」が出現しています';
    return '今週の到達：'+String(Math.max(0,Number(progress.highestCleared||0))).padStart(2,'0')+'F / 次の挑戦 '+String(currentFloor()).padStart(2,'0')+'F';
  }
  function renderModeChrome(){
    const screen=$('screen-resonance-tower'); if(!screen) return;
    const m=M();
    screen.classList.toggle('is-despair',mode==='despair');
    const h1=screen.querySelector('.resonance-tower-intro h1');
    if(h1){
      if(mode==='despair') h1.innerHTML='残響の塔 <small>（絶望）</small>';
      else h1.textContent=m.label;
    }
    const en=screen.querySelector('.resonance-tower-english'); if(en) en.innerHTML=m.english;
    const lead=screen.querySelector('.resonance-tower-intro p'); if(lead) lead.innerHTML=m.lead;
    screen.querySelectorAll('[data-tower-mode]').forEach(b=>{
      const on=b.dataset.towerMode===mode;
      b.classList.toggle('is-active',on); b.setAttribute('aria-selected',on?'true':'false');
    });
    // 通常の塔を今週制覇するまで、絶望の切り替え自体を出さない
    const tabs=screen.querySelector('.resonance-tower-mode-tabs');
    // build1718: 未解放でもタブは常に出す（鍵付き）。条件はタップで案内する＝隠れ仕様にしない
    if(tabs){
      tabs.hidden=false;
      const db=tabs.querySelector('button[data-tower-mode="despair"]');
      if(db){
        const locked=!despairUnlocked() && mode!=='despair';
        db.classList.toggle('is-locked',locked);
        db.textContent='絶望';
        db.setAttribute('aria-disabled',locked?'true':'false');
        db.title=locked?'今週の残響の塔を20Fまで制覇すると挑戦できます':'';
      }
    }
    const oath=screen.querySelector('.tower-oath-lines');
    if(oath) oath.innerHTML=mode==='despair'
      ? '<span>敵の弾は、すべて即死弾。</span><span>封印は通常の塔とは別に数える。</span><span>踏破するたび称号のランクUP。</span>'
      : '<span>初回クリアで使用したキャラは、</span><span>その週の未クリア階層では封印。</span><span>クリア済みの階層は自由編成でプレイ可能。</span>';
  }
  function ensureModeTabs(){
    const screen=$('screen-resonance-tower'); if(!screen || screen.querySelector('.resonance-tower-mode-tabs')) return;
    if(!document.getElementById('despair-tower-style-v1712')){
      const st=document.createElement('style'); st.id='despair-tower-style-v1712';
      st.textContent=`
        .resonance-tower-mode-tabs{display:flex;justify-content:flex-start;gap:6px;margin:8px 0 0;position:relative;z-index:2}
        .resonance-tower-mode-tabs[hidden]{display:none !important}
        .resonance-tower-mode-tabs button{min-width:64px;padding:5px 12px;border-radius:999px;border:1px solid rgba(176,138,60,.7);
          background:rgba(255,251,240,.82);color:#5b4527;font:600 12px/1.2 "Noto Serif JP",serif;letter-spacing:.12em;cursor:pointer}
        .resonance-tower-mode-tabs button.is-locked{opacity:.62;filter:grayscale(.5)}
        .resonance-tower-mode-tabs button.is-active{background:linear-gradient(180deg,#c9a45a,#9c7330);color:#fff;border-color:#9c7330;box-shadow:0 2px 8px rgba(120,90,40,.3)}
        .resonance-tower-mode-tabs button[data-tower-mode="despair"].is-active{background:linear-gradient(180deg,#7a1f3d,#3d0b1f);border-color:#a8305a;box-shadow:0 0 10px rgba(168,48,90,.55)}
        #screen-resonance-tower.is-despair .resonance-tower-haze{background:radial-gradient(ellipse at 50% 20%,rgba(60,8,28,.35),rgba(14,4,10,.72)) !important}
        #screen-resonance-tower.is-despair .resonance-tower-intro h1,
        #screen-resonance-tower.is-despair .resonance-tower-english{color:#f3d6e0 !important;text-shadow:0 0 10px rgba(168,48,90,.8),0 0 2px #000 !important}
        #screen-resonance-tower.is-despair .resonance-tower-intro p{color:#f6e4ea !important;text-shadow:0 0 6px #000 !important}
        #screen-resonance-tower.is-despair .resonance-tower-floor.is-current{box-shadow:0 0 0 2px rgba(168,48,90,.85),0 0 14px rgba(168,48,90,.6) !important}
        .resonance-tower-title-reward{display:flex;align-items:center;gap:10px;margin:10px 0 4px;padding:10px 12px;border:1px solid rgba(168,48,90,.55);
          border-radius:8px;background:linear-gradient(180deg,rgba(60,8,28,.08),rgba(60,8,28,.16))}
        .resonance-tower-title-reward b{font:700 15px/1.3 "Noto Serif JP",serif;color:#5a1530;letter-spacing:.06em}
        .resonance-tower-title-reward small{display:block;font-size:11px;color:#6b5132}
        .resonance-tower-title-reward .rt-floor{font:700 12px/1 Cinzel,serif;color:#a8305a;white-space:nowrap}
      `;
      document.head.appendChild(st);
    }
    const tabs=document.createElement('div');
    tabs.className='resonance-tower-mode-tabs'; tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label','塔の種類');
    tabs.innerHTML='<button type="button" role="tab" data-tower-mode="normal">通常</button><button type="button" role="tab" data-tower-mode="despair">絶望</button>';
    // 右上のメニューと重ならないよう、左側のタイトル欄（説明文の下）に置く
    const intro=screen.querySelector('.resonance-tower-intro');
    if(intro) intro.appendChild(tabs);
    else (screen.querySelector('.resonance-tower-composition')||screen).prepend(tabs);
    tabs.addEventListener('click',e=>{
      const b=e.target.closest('button[data-tower-mode]'); if(!b||busy) return;
      setMode(b.dataset.towerMode);
    });
  }
  function setMode(next){
    next=TOWER_MODES[next]?next:'normal';
    if(next==='despair' && !despairUnlocked()){ notify('今週の残響の塔を20Fまで制覇すると「絶望」が出現します'); return; }
    if(next===mode) return;
    mode=next; progress=null; replayFloor=0; attempt=null; finishPromise=null; selected=1;
    closePanel(); render(); void refresh();
  }
  function render(){
    renderModeChrome();
    const list=$('resonance-tower-floor-list'); if(!list) return;
    list.textContent='';
    for(let n=TOWER_FLOORS;n>=1;n--){
      const isSolo=SOLO_FLOORS.includes(n),isTrial=[3,6,9].includes(n)||isSolo,isFinal=n===15||n===20;
      const done=cleared(n), isCurrent=available(n), locked=!done&&!isCurrent;
      const btn=document.createElement('button');btn.type='button';
      btn.className='resonance-tower-floor'+(isFinal?' is-final':isTrial?' is-trial':'')+(n===selected?' is-selected':'')+(done?' is-cleared':locked?' is-locked':' is-current');
      btn.dataset.floor=String(n);
      btn.setAttribute('aria-label',numerals[n-1]+'、'+(done?'突破済み':isCurrent?'挑戦可能':'未解放'));
      btn.setAttribute('aria-pressed',n===selected?'true':'false');
      btn.style.setProperty('--floor-bg-position',(13+((n-1)%15+1)*7)+'%');
      const num=document.createElement('span');num.className='resonance-tower-floor-no';num.textContent=String(n).padStart(2,'0')+'F';
      const copy=document.createElement('span');copy.className='resonance-tower-floor-copy';
      const name=document.createElement('span');name.className='resonance-tower-floor-name';name.textContent=numerals[n-1];
      const label=document.createElement('span');label.className='resonance-tower-floor-label';
      label.textContent=done?'CLEAR':isCurrent?'挑戦可能':isFinal?'最深の間':isSolo?'単騎':isTrial?'難関':'未解放';
      copy.append(name,label);btn.append(num,copy);
      if(isTrial){const tag=document.createElement('span');tag.className='resonance-tower-trial-tag';tag.textContent=isSolo?'単騎':'難関';btn.append(tag);}
      list.append(btn);
    }
    // Render rebuilds list nodes; ensure the active floor remains in view on phones.
    const activeRow=list.querySelector('button[data-floor="'+String(selected)+'"]');
    if(activeRow){
      const wanted=Math.max(0,activeRow.offsetTop+activeRow.offsetHeight-list.clientHeight+4);
      list.scrollTop=wanted;
    }
    const availability=$('screen-resonance-tower')?.querySelector('.resonance-tower-availability');
    if(availability){
      availability.replaceChildren();
      if(!progress || progress.completed){
        availability.textContent=statusText();
      }else{
        const label=document.createElement('span');
        label.className='resonance-tower-availability-label';
        label.textContent='今週の到達';
        const floor=document.createElement('strong');
        floor.className='resonance-tower-availability-value';
        floor.textContent=String(Math.max(0,Number(progress.highestCleared||0))).padStart(2,'0')+'F';
        const next=document.createElement('small');
        next.className='resonance-tower-availability-next';
        next.textContent='次の挑戦：'+String(currentFloor()).padStart(2,'0')+'F';
        availability.append(label,floor,next);
      }
    }
    // build1599: 今週の残り日数（次の更新＝毎週日曜12:00 JST まで）
    const daysEl=$('screen-resonance-tower')?.querySelector('[data-tower-days-left]');
    if(daysEl) daysEl.textContent=towerTimeLeftText();
  }
  // 次の更新時刻。サーバーの resetAt を優先し、無ければ「次の日曜12:00(JST)」を端末で計算。
  function nextTowerResetMs(){
    const server=Date.parse(progress&&progress.resetAt||'');
    if(Number.isFinite(server)&&server>Date.now()) return server;
    const JST=9*3600e3, now=Date.now(), j=new Date(now+JST);
    const dow=j.getUTCDay();
    let target=Date.UTC(j.getUTCFullYear(),j.getUTCMonth(),j.getUTCDate()+((7-dow)%7),12)-JST;
    if(target<=now) target+=7*86400e3;
    return target;
  }
  function towerTimeLeftText(){
    const ms=Math.max(0,nextTowerResetMs()-Date.now());
    if(ms>=86400e3) return Math.floor(ms/86400e3)+'日';
    return Math.max(1,Math.ceil(ms/3600e3))+'時間';
  }
  async function refresh(){
    try{
      const m=M(), requestedMode=mode;
      // Already-cleared floors from earlier builds are credited once, server-side.（通常の塔のみ）
      if(m.rpcClaim){
        const claim=await rpcClient().rpc(m.rpcClaim);
        if(claim.error) console.warn('[tower] reward catch-up pending:',claim.error);
      }
      const {data,error}=await rpcClient().rpc(m.rpcState);
      if(requestedMode!==mode) return !!progress; // 通信中に塔を切り替えた
      if(error) throw error;
      if(!data || !Array.isArray(data.clearedFloors)||!Array.isArray(data.sealedCharacterIds)) throw new Error('塔の進行データが不正です');
      if(mode==='normal') normalCompletedThisWeek=!!data.completed;
      else{
        // 絶望を表示中でも、週が替わって通常の塔が未制覇に戻っていたら通常へ戻す
        try{
          const n=await rpcClient().rpc(TOWER_MODES.normal.rpcState);
          if(!n.error && n.data) normalCompletedThisWeek=!!n.data.completed;
        }catch(_){}
        if(!normalCompletedThisWeek && !(attempt&&attempt.mode==='despair')){
          mode='normal'; progress=null; replayFloor=0;
          notify('今週の残響の塔を制覇すると「絶望」に挑戦できます');
          return refresh();
        }
      }
      progress=data;
      syncTowerWallet();
      selected=progress.completed?TOWER_FLOORS:currentFloor();
    }catch(err){
      progress=null;
      console.warn('[tower] status unavailable:',err);
      notify('塔の進行データを読み込めません。通信状態を確認してください。');
    }
    render();
    return !!progress;
  }
  function panelText(kind,number){
    if(kind==='floor'){
      if(!progress) return 'サーバーと同期できるまで出撃できません。';
      if(cleared(number)) return descriptions[number-1]+'\nCLEAR再挑戦：所持キャラから'+partyRangeText(number)+'を自由編成。封印中のキャラも使用できます。\n※再挑戦では報酬・追加封印・階層進行はありません。';
      if(!available(number)) return '前の階層を突破すると解放されます。';
      const used=(progress.sealedCharacterIds||[]).length;
      return descriptions[number-1]+'\n所持キャラから'+partyRangeText(number)+'を編成。封印中 '+used+'体。';
    }
    if(kind==='ranking') return 'ランキングは初版では未公開です。階層進行と週次封印はサーバーで保存されます。';
    if(mode==='despair') return '残響の塔（絶望）は、今週の残響の塔を制覇した人だけが挑める腕試しです。\n報酬は20Fを踏破したときの称号「絶望を超えし者」だけ。毎週日曜12:00に進行と封印がリセットされ、また踏破すると称号のランクが上がります（I→II→III…）。';
    return '各階層の初回突破報酬です。\n毎週日曜12:00にリセットされます。';
  }
  function openPanel(kind,number){
    const layer=$('resonance-tower-panel-layer');if(!layer)return;
    const title=$('resonance-tower-panel-title'),desc=$('resonance-tower-panel-description'),kicker=$('resonance-tower-panel-kicker'),start=$('resonance-tower-panel-start');
    focusBeforePanel=kind==='floor'?document.querySelector('#resonance-tower-floor-list button[data-floor="'+number+'"]'):document.activeElement;
    title.textContent=kind==='floor'?String(number).padStart(2,'0')+'F　'+numerals[number-1]:kind==='ranking'?'ランキング':'報酬一覧';
    desc.textContent=panelText(kind,number);
    let rewardList=layer.querySelector('.resonance-tower-reward-list');
    if(rewardList)rewardList.remove();
    layer.querySelector('.resonance-tower-title-reward')?.remove();
    if(mode==='despair'){
      // 絶望：報酬は20F踏破の称号のみ
      if(kind==='rewards'||(kind==='floor'&&number===TOWER_FLOORS)){
        const box=document.createElement('div'); box.className='resonance-tower-title-reward resonance-tower-reward-list';
        box.innerHTML='<span class="rt-floor">20F</span><span><b>称号「絶望を超えし者」</b><small>踏破した回数がランクになる（I・II・III…）。3回・5回・10回で称号の見た目が変わる。プロフィール・フレンド・ランキングに表示できる。</small></span>';
        desc.insertAdjacentElement('afterend',box);
      }
    }else if(kind==='rewards'||kind==='floor'){
      rewardList=createTowerRewardList(kind==='floor'?[number]:Array.from({length:TOWER_FLOORS},(_,i)=>i+1));
      desc.insertAdjacentElement('afterend',rewardList);
    }
    layer.querySelector('.resonance-tower-panel-foot').hidden=(kind==='rewards');
    // Reward list scrolls inside its compact panel: keep the top-right ×, remove only bottom dismiss.
    const dismiss=layer.querySelector('.resonance-tower-panel-dismiss');
    if(dismiss) dismiss.hidden=(kind==='rewards');
    layer.classList.toggle('is-reward-overview',kind==='rewards');
    layer.classList.toggle('is-floor-challenge',kind==='floor');
    layer.classList.toggle('is-floor-replay',kind==='floor'&&cleared(number));
    kicker.textContent=kind==='floor'?(cleared(number)?M().kicker+' / REPLAY':M().kicker+' / FLOOR'):M().kicker;
    const foot=layer.querySelector('.resonance-tower-panel-foot');
    if(foot && kind==='floor') {
      foot.hidden=false;
      // textContent内の改行(\n)を画面上にも反映する。
      foot.style.whiteSpace='pre-line';
      foot.textContent=cleared(number)
        ? 'クリア済み階層の練習です。\n報酬・追加封印・進行更新はありません。'
        : '使用した仲間は勝利時に封印されます。\n敗北、中断時は封印されません。';
    }
    start.hidden=kind!=='floor'||!(available(number)||cleared(number))||busy;
    start.textContent=cleared(number)?'好きなキャラで再挑戦':'この階層に挑戦';
    start.dataset.floor=String(number||0);
    layer.hidden=false;
    layer.querySelector('.resonance-tower-panel-close')?.focus();
  }
  function closePanel(){
    const layer=$('resonance-tower-panel-layer');if(layer)layer.hidden=true;
    if(focusBeforePanel?.isConnected && typeof focusBeforePanel.focus==='function') focusBeforePanel.focus();
    focusBeforePanel=null;
  }
  async function openBattle(floor){
    if(busy||!(available(floor)||cleared(floor))) return;
    if(typeof window.openShootingEvent!=='function'){notify('戦闘エンジンの準備が完了していません');return;}
    // 編成画面で選ぶ1〜3体は実戦開始時にサーバーが検証する。
    attempt=null;finishPromise=null;
    replayFloor=cleared(floor)?Number(floor):0;
    window.__shootingReturnContext={type:'resonanceTower'};
    closePanel();
    try{window.openShootingEvent({stageId:stageIdFor(floor)});}
    catch(err){replayFloor=0;window.__shootingReturnContext=null;console.error('[tower] battle open failed',err);notify('戦闘画面を開けませんでした');}
  }
  // 出撃前に封印対象を示す。表示/キャンセルの段階ではRPCも進行データも更新しない。
  let activeSealConfirmation=null;
  function cancelSealConfirmation(){
    if(activeSealConfirmation) activeSealConfirmation.resolve(false);
  }
  function confirmSealParty(floor, members){
    if(activeSealConfirmation || !available(Number(floor)) || !Array.isArray(members) ||
       members.length<1 || members.length>partyLimit(floor) ||
       members.some(item=>!item || !Number.isInteger(Number(item.id)) || !isCharacterAvailable(Number(item.id)))){
      return Promise.resolve(false);
    }
    return new Promise(resolve=>{
      const previousFocus=document.activeElement;
      const overlay=document.createElement('div');
      overlay.id='resonance-tower-seal-confirm';
      overlay.className='resonance-tower-seal-confirm';
      overlay.setAttribute('role','presentation');
      overlay.innerHTML=`
        <section class="resonance-tower-seal-card" role="dialog" aria-modal="true" aria-labelledby="tower-seal-title" aria-describedby="tower-seal-message">
          <div class="resonance-tower-seal-kicker">${M().kicker} / SORTIE</div>
          <h2 id="tower-seal-title">封印対象の確認</h2>
          <div class="resonance-tower-seal-floor"></div>
          <p id="tower-seal-message">この編成で勝利すると、以下の仲間は<strong>今週の${M().label}で封印</strong>されます。</p>
          <div class="resonance-tower-seal-party" aria-label="勝利時の封印対象キャラクター"></div>
          <p class="resonance-tower-seal-note">敗北・中断した場合は封印されません。<br>封印が確定するのはクリア時のみです。</p>
          <div class="resonance-tower-seal-actions">
            <button type="button" class="resonance-tower-seal-back">編成に戻る</button>
            <button type="button" class="resonance-tower-seal-yes">出撃する</button>
          </div>
        </section>`;
      overlay.querySelector('.resonance-tower-seal-floor').textContent=String(floor).padStart(2,'0')+'F / '+numerals[floor-1];
      const party=overlay.querySelector('.resonance-tower-seal-party');
      members.forEach(item=>{
        const character=document.createElement('div');character.className='resonance-tower-seal-member';
        const img=document.createElement('img');
        img.src=String(item.image||'');img.alt='';img.loading='eager';
        const name=document.createElement('span');name.textContent=String(item.name||'キャラクター');
        character.append(img,name);party.appendChild(character);
      });
      let resolved=false;
      function finish(ok){
        if(resolved)return;
        resolved=true;
        document.removeEventListener('keydown',onKeydown,true);
        overlay.remove();
        activeSealConfirmation=null;
        if(previousFocus?.isConnected && typeof previousFocus.focus==='function') previousFocus.focus();
        resolve(ok);
      }
      const back=overlay.querySelector('.resonance-tower-seal-back');
      const yes=overlay.querySelector('.resonance-tower-seal-yes');
      function onKeydown(event){
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(false);}
        if(event.key==='Tab'){
          if(event.shiftKey && document.activeElement===back){event.preventDefault();yes.focus();}
          else if(!event.shiftKey && document.activeElement===yes){event.preventDefault();back.focus();}
        }
      }
      activeSealConfirmation={resolve:finish};
      back.addEventListener('click',()=>finish(false),{once:true});
      yes.addEventListener('click',()=>finish(true),{once:true});
      overlay.addEventListener('click',e=>{if(e.target===overlay)finish(false);});
      document.addEventListener('keydown',onKeydown,true);
      document.body.appendChild(overlay);
      back.focus();
    });
  }
  async function prepareBattle(floor,partyIds){
    if(busy) return false;
    const replay=isReplayFloor(floor);
    if(!replay && !available(floor)){notify('現在挑戦できる階層ではありません');return false;}
    const party=Array.isArray(partyIds)?partyIds.map(Number):[];
    if(party.length<1||party.length>partyLimit(floor)||new Set(party).size!==party.length||!party.every(isCharacterAvailable)){
      notify(replay?'所持キャラを'+partyRangeText(floor)+'選択してください':'封印されていないキャラを'+partyRangeText(floor)+'選択してください');return false;
    }
    // 練習はサーバー上の週次挑戦に一切触らない。
    if(replay){attempt={replay:true,floor,party,mode};finishPromise=null;return true;}
    busy=true;
    try{
      const {data,error}=await rpcClient().rpc(M().rpcBegin,{p_floor:floor,p_party_ids:party});
      if(error) throw error;
      if(!data?.token) throw new Error('出撃トークンが発行されませんでした');
      attempt={token:data.token,floor,party,mode};finishPromise=null;
      return true;
    }catch(err){
      console.warn('[tower] begin rejected',err);
      notify('出撃できません：'+String(err.message||err));
      await refresh();return false;
    }finally{busy=false;}
  }
  async function finishRun(win){
    if(finishPromise) return finishPromise;
    if(attempt?.replay){
      attempt=null;
      if(win) notify('再挑戦クリア！ 報酬や封印の追加はありません。');
      finishPromise=Promise.resolve({towerConfirmed:true,replay:true,firstClearClaimed:false,firstClearAmount:0,highScore:0});
      return finishPromise;
    }
    finishPromise=(async()=>{
      if(!attempt?.token) throw new Error('出撃記録が見つかりません');
      const runMode=attempt.mode||mode;
      const {data,error}=await rpcClient().rpc((TOWER_MODES[runMode]||M()).rpcFinish,{p_token:attempt.token,p_win:!!win});
      if(error) throw error;
      if(data?.state && runMode===mode) progress=data.state;
      if(runMode==='normal' && data?.state){
        const was=normalCompletedThisWeek;
        normalCompletedThisWeek=!!data.state.completed;
        if(!was && normalCompletedThisWeek) setTimeout(()=>notify('残響の塔を制覇！ 塔の画面に「絶望」が出現しました'),2600);
      }
      syncTowerWallet();
      attempt=null;render();
      // 絶望：報酬は20F踏破の称号のみ（サーバーが付与した時だけ表示）
      if(runMode==='despair'){
        if(win){
          const sealed=(data?.sealedCharacterIds||[]).length;
          const granted=data?.titleGranted===true||data?.title_granted===true||String(data?.titleId||data?.title_id||'')===DESPAIR_TITLE_ID;
          if(granted){
            const lv=Math.max(1,Math.floor(Number(data?.titleLevel??data?.title_level??data?.titleCount??1))||1);
            let label='絶望を超えし者';
            try{
              if(window.ZeraphiaTitles){
                if(typeof window.ZeraphiaTitles.notifyAcquired==='function') window.ZeraphiaTitles.notifyAcquired(DESPAIR_TITLE_ID,lv);
                if(typeof window.ZeraphiaTitles.labelOf==='function') label=window.ZeraphiaTitles.labelOf(DESPAIR_TITLE_ID,lv);
              }
            }catch(_){}
            notify(lv>1 ? ('絶望を踏破！ 称号のランクが上がりました：「'+label+'」') : ('絶望を踏破！ 称号「'+label+'」を獲得しました。'));
          }else{
            notify('絶望・第'+data.floor+'層突破！ 使用した'+sealed+'体を今週封印しました');
          }
        }
        return {towerConfirmed:true,firstClearClaimed:false,firstClearAmount:0,highScore:0};
      }
      // build1605: 聖樹の息吹が奉納待ちに入るので神聖樹の表示も更新
      if(win){try{window.ShinjuProgress&&typeof window.ShinjuProgress.refreshFromServer==='function'&&window.ShinjuProgress.refreshFromServer();}catch(_){}}
      if(win){const sealed=(data?.sealedCharacterIds||[]).length;
        // Display what the server actually granted, never a client-side assumption.
        const assigned=Array.isArray(data?.rewards)
          ? data.rewards.find(r=>Number(r.floor)===Number(data.floor)):null;
        const grantedItems=Array.isArray(assigned?.items)?assigned.items:[];
        if(grantedItems.some(item=>item.id==='towa_memory'&&Number(item.qty)>0)){
          window.dispatchEvent(new Event('zeraphia:towa-memory-refresh'));
        }
        const expected=TOWER_REWARDS[Number(data.floor)-1]||[];
        const rewardText=grantedItems.map(r=>{
          const item=expected.find(e=>e.id===r.id);
          const name=item?.name||String(r.id||'不明なアイテム');
          return name+'×'+Math.max(0,Number(r.qty)||0);
        }).join('・');
        const missingTowa=(Number(data.floor)===15||Number(data.floor)===20)
          && !grantedItems.some(r=>r.id==='towa_memory'&&Number(r.qty)>=1);
        if(missingTowa){
          console.error('[tower] '+data.floor+'F reward not confirmed on server:',data.rewards);
          notify('第'+data.floor+'層突破。ただし「トワの記憶」の配布確認ができません。所持品を確認してください。');
        }else{
          notify('第'+data.floor+'層突破！ '+(rewardText?('報酬：'+rewardText+'。'):'')+' 使用した'+sealed+'体を今週封印しました');
        }}
      return {towerConfirmed:true,firstClearClaimed:false,firstClearAmount:0,highScore:0};
    })().catch(err=>{
      console.error('[tower] finish was not confirmed',err);
      notify('塔の進行を確定できませんでした。通信状態を確認してください。');
      return {towerConfirmed:false,firstClearClaimed:false,firstClearAmount:0,highScore:0};
    });
    return finishPromise;
  }
  // build1643: 戦闘中にアプリが落ちた場合の復帰。
  //  出撃トークン（attempt）は戦闘の中断データ（sasaphia_shooting_resume_v1）に一緒に保存し、
  //  再開時にここで復元する。復元しないと、①進行データ未取得のため編成が全員「封印扱い」で再開できない
  //  ②勝利してもトークンが無く塔の進行・報酬・封印が確定しない、の2点が起きていた。
  function getResumeAttempt(){
    if(!attempt) return null;
    const m=attempt.mode||mode;
    return attempt.replay
      ? {replay:true,floor:Number(attempt.floor),party:(attempt.party||[]).map(Number),mode:m}
      : {token:String(attempt.token||''),floor:Number(attempt.floor),party:(attempt.party||[]).map(Number),mode:m};
  }
  function validSaved(saved,floor){
    return !!(saved && Number(saved.floor)===Number(floor) && Array.isArray(saved.party) &&
      saved.party.length>=1 && saved.party.length<=partyLimit(floor) && (saved.replay || String(saved.token||'')));
  }
  async function restoreAttempt(saved,floor){
    floor=Number(floor);
    if(!validSaved(saved,floor)) return false;
    // build1712: 中断した塔（通常／絶望）へ切り替えてから復元する
    const savedMode=TOWER_MODES[saved.mode]?saved.mode:'normal';
    if(savedMode!==mode){ mode=savedMode; progress=null; }
    // 封印・解放の判定にサーバーの進行データが必要（起動直後は未取得）
    if(!progress && !(await refresh())) return false;
    if(saved.replay){
      if(!cleared(floor)) return false;
      replayFloor=floor;
      attempt={replay:true,floor,party:saved.party.map(Number),mode};
    }else{
      // 出撃済みの挑戦は、まだ未突破の現在階層であるはず。突破済み＝既に確定した挑戦なので復帰しない。
      if(!available(floor)) return false;
      replayFloor=0;
      attempt={token:String(saved.token),floor,party:saved.party.map(Number),mode};
    }
    finishPromise=null;
    return true;
  }
  // 中断データを破棄した時：サーバー上の挑戦を「敗北」で閉じる（敗北・中断は封印も進行もなし）。
  async function abandonAttempt(saved){
    if(!saved || saved.replay || !String(saved.token||'')) return;
    try{
      const savedMode=TOWER_MODES[saved.mode]?saved.mode:'normal';
      const {data,error}=await rpcClient().rpc(TOWER_MODES[savedMode].rpcFinish,{p_token:String(saved.token),p_win:false});
      if(error) throw error;
      if(data?.state && savedMode===mode) progress=data.state;
    }catch(err){ console.warn('[tower] abandon attempt not confirmed',err); }
  }
  window.ResonanceTower=Object.freeze({isTowerStageId:id=>/^shooting_(?:despair_)?tower_(?:0[1-9]|1[0-9]|20)$/.test(String(id||'')),
    getMode:()=>mode,setMode,isReplayFloor,isCharacterAvailable,confirmSealParty,cancelSealConfirmation,prepareBattle,finishRun,refresh,getResumeAttempt,restoreAttempt,abandonAttempt});
  window.openResonanceTower=function(openMode){
    replayFloor=0;attempt=null;finishPromise=null;
    if(openMode && TOWER_MODES[openMode] && openMode!==mode){ mode=openMode; progress=null; }
    if(typeof window.requireChapter03ContentUnlock!=='function'||!window.requireChapter03ContentUnlock())return;
    closePanel();
    if(typeof window.showMainTab==='function')window.showMainTab('resonance-tower');
    render();void refresh();
  };
  window.closeResonanceTower=function(){
    replayFloor=0;closePanel();if(typeof window.showMainTab==='function')window.showMainTab('main');
  };
  function init(){
    const screen=$('screen-resonance-tower'),list=$('resonance-tower-floor-list');
    if(!screen||!list||screen.dataset.towerBound==='true')return;
    screen.dataset.towerBound='true';
    ensureModeTabs();
    list.addEventListener('click',e=>{
      const btn=e.target.closest('button[data-floor]');if(!btn||!list.contains(btn))return;
      const floor=Number(btn.dataset.floor);if(!Number.isInteger(floor)||floor<1||floor>TOWER_FLOORS)return;
      selected=floor;render();openPanel('floor',floor);
    });
    screen.querySelector('.resonance-tower-actions')?.addEventListener('click',e=>{
      const btn=e.target.closest('button[data-tower-panel]');if(btn)openPanel(btn.dataset.towerPanel);
    });
    $('resonance-tower-panel-start')?.addEventListener('click',e=>{void openBattle(Number(e.currentTarget.dataset.floor));});
    const layer=$('resonance-tower-panel-layer');
    layer?.addEventListener('click',e=>{if(e.target.closest('[data-tower-close]'))closePanel();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&layer&&!layer.hidden)closePanel();});
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
