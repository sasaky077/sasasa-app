// ZERAPHIA build1531 — 残響の塔：クリア済み階層は自由編成・無報酬の再挑戦
// アカウント・週次進行・封印はSupabaseの3つのRPCのみを正とする。
(function(){
  'use strict';
  const descriptions=[
    '塔の入口。小規模な敵の群れを撃破する。',
    '水と木の敵が現れる。属性を選んで挑もう。',
    '第一の難関。火・水・木の混成部隊を突破せよ。',
    '遮断壁を越えて進む第四層。温存した仲間を活かそう。',
    '光と闇の敵が待ち受ける。相性を見極めよ。',
    '第二の難関。移動する遮断壁の先の敵を倒せ。',
    '上層への道。敵の数も攻撃密度も増す。',
    '最深部を目前にした試練。ここで戦力を温存したい。',
    '第三の難関。火・水の属性バリアを突破せよ。',
    '第十層の守護者。PHASE2・3のHP半減時に5秒間左右反転。',
    '五属性の天使が一体ずつ出現。濃密な弾幕を突破せよ。',
    '光と闇の属性バリア。周期的な即死弾に警戒せよ。',
    '蜘蛛の群れと白い三頭狼の強敵を撃破せよ。',
    '強化リヴィア。20秒おきに10秒間だけ遮断壁が出現。',
    '最深部の主・トワ。即死弾が常に漂い、時おり世界が暗転する。'
  ];
  const numerals=['第一層','第二層','第三層','第四層','第五層','第六層','第七層','第八層','第九層','第十層','第十一層','第十二層','第十三層','第十四層','第十五層'];

  // v1420: tower rewards; the database RPC is authoritative for grants.
  // build1606: 聖樹の息吹は3層ごと。3F×1・6F×2・9F×3・12F×4・15F×5（サーバー claim_resonance_tower_rewards と揃える）
  const towerBreath=floor=>floor%3===0?Object.freeze({id:'shinju_nutrition',name:'聖樹の息吹',qty:floor/3,img:'images/shinju_aura.webp'}):null;
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
    if(progress.completed) return '今週の塔を完全制覇しました';
    return '今週の到達：'+String(Math.max(0,Number(progress.highestCleared||0))).padStart(2,'0')+'F / 次の挑戦 '+String(currentFloor()).padStart(2,'0')+'F';
  }
  function render(){
    const list=$('resonance-tower-floor-list'); if(!list) return;
    list.textContent='';
    for(let n=15;n>=1;n--){
      const isTrial=[3,6,9].includes(n),isFinal=n===15;
      const done=cleared(n), isCurrent=available(n), locked=!done&&!isCurrent;
      const btn=document.createElement('button');btn.type='button';
      btn.className='resonance-tower-floor'+(isFinal?' is-final':isTrial?' is-trial':'')+(n===selected?' is-selected':'')+(done?' is-cleared':locked?' is-locked':' is-current');
      btn.dataset.floor=String(n);
      btn.setAttribute('aria-label',numerals[n-1]+'、'+(done?'突破済み':isCurrent?'挑戦可能':'未解放'));
      btn.setAttribute('aria-pressed',n===selected?'true':'false');
      btn.style.setProperty('--floor-bg-position',(13+n*7)+'%');
      const num=document.createElement('span');num.className='resonance-tower-floor-no';num.textContent=String(n).padStart(2,'0')+'F';
      const copy=document.createElement('span');copy.className='resonance-tower-floor-copy';
      const name=document.createElement('span');name.className='resonance-tower-floor-name';name.textContent=numerals[n-1];
      const label=document.createElement('span');label.className='resonance-tower-floor-label';
      label.textContent=done?'CLEAR':isCurrent?'挑戦可能':isFinal?'最深の間':isTrial?'難関':'未解放';
      copy.append(name,label);btn.append(num,copy);
      if(isTrial){const tag=document.createElement('span');tag.className='resonance-tower-trial-tag';tag.textContent='難関';btn.append(tag);}
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
      // Already-cleared floors from earlier builds are credited once, server-side.
      const claim=await rpcClient().rpc('claim_resonance_tower_rewards');
      if(claim.error) console.warn('[tower] reward catch-up pending:',claim.error);
      const {data,error}=await rpcClient().rpc('get_resonance_tower_state');
      if(error) throw error;
      if(!data || !Array.isArray(data.clearedFloors)||!Array.isArray(data.sealedCharacterIds)) throw new Error('塔の進行データが不正です');
      progress=data;
      syncTowerWallet();
      selected=progress.completed?15:currentFloor();
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
      if(cleared(number)) return descriptions[number-1]+'\nCLEAR再挑戦：所持キャラから1〜3体を自由編成。封印中のキャラも使用できます。\n※再挑戦では報酬・追加封印・階層進行はありません。';
      if(!available(number)) return '前の階層を突破すると解放されます。';
      const used=(progress.sealedCharacterIds||[]).length;
      return descriptions[number-1]+'\n所持キャラから1〜3体を編成。封印中 '+used+'体。';
    }
    if(kind==='ranking') return 'ランキングは初版では未公開です。階層進行と週次封印はサーバーで保存されます。';
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
    if(kind==='rewards'||kind==='floor'){
      rewardList=createTowerRewardList(kind==='floor'?[number]:Array.from({length:15},(_,i)=>i+1));
      desc.insertAdjacentElement('afterend',rewardList);
    }
    layer.querySelector('.resonance-tower-panel-foot').hidden=(kind==='rewards');
    // Reward list scrolls inside its compact panel: keep the top-right ×, remove only bottom dismiss.
    const dismiss=layer.querySelector('.resonance-tower-panel-dismiss');
    if(dismiss) dismiss.hidden=(kind==='rewards');
    layer.classList.toggle('is-reward-overview',kind==='rewards');
    layer.classList.toggle('is-floor-challenge',kind==='floor');
    layer.classList.toggle('is-floor-replay',kind==='floor'&&cleared(number));
    kicker.textContent=kind==='floor'?(cleared(number)?'ECHO TOWER / REPLAY':'ECHO TOWER / FLOOR'):'ECHO TOWER';
    const foot=layer.querySelector('.resonance-tower-panel-foot');
    if(foot && kind==='floor') {
      foot.hidden=false;
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
    try{window.openShootingEvent({stageId:'shooting_tower_'+String(floor).padStart(2,'0')});}
    catch(err){replayFloor=0;window.__shootingReturnContext=null;console.error('[tower] battle open failed',err);notify('戦闘画面を開けませんでした');}
  }
  // 出撃前に封印対象を示す。表示/キャンセルの段階ではRPCも進行データも更新しない。
  let activeSealConfirmation=null;
  function cancelSealConfirmation(){
    if(activeSealConfirmation) activeSealConfirmation.resolve(false);
  }
  function confirmSealParty(floor, members){
    if(activeSealConfirmation || !available(Number(floor)) || !Array.isArray(members) ||
       members.length<1 || members.length>3 ||
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
          <div class="resonance-tower-seal-kicker">ECHO TOWER / SORTIE</div>
          <h2 id="tower-seal-title">封印対象の確認</h2>
          <div class="resonance-tower-seal-floor"></div>
          <p id="tower-seal-message">この編成で勝利すると、以下の仲間は<strong>今週の残響の塔で封印</strong>されます。</p>
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
    if(party.length<1||party.length>3||new Set(party).size!==party.length||!party.every(isCharacterAvailable)){
      notify(replay?'所持キャラを1〜3体選択してください':'封印されていないキャラを1〜3体選択してください');return false;
    }
    // 練習はサーバー上の週次挑戦に一切触らない。
    if(replay){attempt={replay:true,floor,party};finishPromise=null;return true;}
    busy=true;
    try{
      const {data,error}=await rpcClient().rpc('begin_resonance_tower_run',{p_floor:floor,p_party_ids:party});
      if(error) throw error;
      if(!data?.token) throw new Error('出撃トークンが発行されませんでした');
      attempt={token:data.token,floor,party};finishPromise=null;
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
      const {data,error}=await rpcClient().rpc('finish_resonance_tower_run',{p_token:attempt.token,p_win:!!win});
      if(error) throw error;
      if(data?.state) progress=data.state;
      syncTowerWallet();
      attempt=null;render();
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
        const missingTowa=Number(data.floor)===15
          && !grantedItems.some(r=>r.id==='towa_memory'&&Number(r.qty)>=1);
        if(missingTowa){
          console.error('[tower] 15F reward not confirmed on server:',data.rewards);
          notify('第15層突破。ただし「トワの記憶」の配布確認ができません。所持品を確認してください。');
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
  window.ResonanceTower=Object.freeze({isTowerStageId:id=>/^shooting_tower_(?:0[1-9]|1[0-5])$/.test(String(id||'')),isReplayFloor,isCharacterAvailable,confirmSealParty,cancelSealConfirmation,prepareBattle,finishRun,refresh});
  window.openResonanceTower=function(){
    replayFloor=0;attempt=null;finishPromise=null;
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
    list.addEventListener('click',e=>{
      const btn=e.target.closest('button[data-floor]');if(!btn||!list.contains(btn))return;
      const floor=Number(btn.dataset.floor);if(!Number.isInteger(floor)||floor<1||floor>15)return;
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
