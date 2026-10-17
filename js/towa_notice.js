/* ZERAPHIA build1554 — Towa Memory 10-pull availability indicator.
 * Reads the authoritative server balance, updates two existing entry buttons only.
 * No changes to existing global navigation or any standard-gacha code.
 */
(function(){
  'use strict';
  const dotSelectors=[
    '#resonance-tower-home-entry > .towa-memory-notice-dot',
    '#screen-resonance-tower .resonance-tower-actions .resonance-tower-menu:first-child > .towa-memory-notice-dot'
  ];
  let enabled=false, lastFetch=0, serial=0, inflight=null;
  function paint(){
    for(const selector of dotSelectors){
      const dot=document.querySelector(selector);
      if(dot)dot.hidden=!enabled;
    }
  }
  function setMemory(value){
    serial++; // Ignore results from a fetch started before a confirmed draw.
    enabled=Number.isFinite(Number(value)) && Number(value)>=1;
    paint();
  }
  async function refresh(force=false){
    const client=window.zsSupabase;
    if(!client || typeof client.rpc!=='function'){
      if(force){setMemory(0);}
      return false;
    }
    const now=Date.now();
    if(inflight){
      // A confirmed Tower reward may arrive while an earlier check is pending.
      // In that case, always perform one fresh check after the old one finishes.
      if(force)return inflight.then(()=>refresh(true));
      return inflight;
    }
    if(!force && now-lastFetch<10000) return enabled;
    lastFetch=now;
    const ticket=++serial;
    const work=(async()=>{
      try{
        const {data,error}=await client.rpc('get_towa_encounter_state');
        if(error || !data?.ok)throw error||new Error('Towa state unavailable');
        if(ticket===serial){enabled=Number(data.memory)>=1;paint();}
        return enabled;
      }catch(e){
        // Never advertise available pulls when auth / network state is unknown.
        if(ticket===serial){enabled=false;paint();}
        if(String(e?.message||'').indexOf('authentication required')<0){
          console.debug('[towa notice] availability refresh skipped',e);
        }
        return false;
      }finally{
        if(inflight===work)inflight=null;
      }
    })();
    inflight=work;
    return work;
  }
  function init(){
    paint();
    // App initialization and session restoration do not have fixed timing.
    setTimeout(()=>void refresh(true),200);
    setTimeout(()=>void refresh(true),1900);
    window.addEventListener('pageshow',()=>{void refresh(true);});
    window.addEventListener('focus',()=>{void refresh();});
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden) void refresh(true);
    });
    // Recheck when going into HOME, tower, or returning by shared navigation.
    document.addEventListener('click',event=>{
      const target=event.target;
      if(!(target instanceof Element))return;
      if(target.closest('#resonance-tower-home-entry, .resonance-tower-back, #bottom-nav-shared, .resonance-tower-actions .resonance-tower-menu')){
        queueMicrotask(()=>void refresh());
      }
    },true);
    window.addEventListener('zeraphia:towa-memory-changed',event=>{
      const amount=event.detail?.memory;
      if(amount===undefined || amount===null){void refresh(true);}
      else setMemory(amount);
    });
    window.addEventListener('zeraphia:towa-memory-refresh',()=>{void refresh(true);});
    // Authentication changes invalidate previous users' dots.
    try{
      window.zsSupabase?.auth?.onAuthStateChange?.((type)=>{
        if(type==='SIGNED_OUT'){setMemory(0);}
        else if(type==='SIGNED_IN' || type==='TOKEN_REFRESHED'){
          setTimeout(()=>{void refresh(true);},0);
        }
      });
    }catch(e){console.debug('[towa notice] auth listener skipped',e);}
  }
  window.TowaMemoryNotice=Object.freeze({refresh,setMemory});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
