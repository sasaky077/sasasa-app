/* ZERAPHIA PHASE RUSH - HIDDEN EXPERIMENT BUILD 2088
 * Not accessible from menus. Manual QA only:
 * window.__ZERAPHIA_PHASE_RUSH_TEST__.open()
 * No writes to player state, ranking, or localStorage.
 */
(function(){
  'use strict';
  if (window.__ZERAPHIA_PHASE_RUSH_TEST__) return;
  var frame = null, shell = null;
  function close(){
    if (shell) shell.remove();
    shell = null; frame = null;
  }
  function open(){
    if (shell) return;
    shell = document.createElement('div');
    shell.id = 'zeraphia-phase-rush-internal-test';
    shell.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#0f1423;';
    frame = document.createElement('iframe');
    frame.title = '位相疾走（非公開テスト）';
    frame.src = 'phase_rush_120s_hidden.html';
    frame.style.cssText = 'display:block;width:100%;height:100%;border:0;';
    shell.appendChild(frame);
    document.body.appendChild(shell);
  }
  window.addEventListener('message', function(ev){
    if (ev.origin !== location.origin || !frame || ev.source !== frame.contentWindow) return;
    if (ev.data && ev.data.type === 'zeraphia-phase-rush-close') close();
  });
  Object.defineProperty(window, '__ZERAPHIA_PHASE_RUSH_TEST__', {
    value: Object.freeze({open:open,close:close}), configurable:false, writable:false
  });
})();
