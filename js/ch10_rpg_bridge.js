(() => { 'use strict';
 let root=null, returnFocus=null;
 function close(){if(!root)return;root.remove();root=null;document.body.classList.remove('ch10-rpg-modal-open');if(returnFocus && returnFocus.isConnected)returnFocus.focus();}
 function open(){
   if(root)return;
   returnFocus=document.activeElement;
   root=document.createElement('div');
   root.className='ch10-rpg-modal';
   root.setAttribute('role','dialog');
   root.setAttribute('aria-modal','true');
   root.setAttribute('aria-label','第10章 RPGモード 開発中');
   const frame=document.createElement('iframe');
   frame.src='rpg/ch10/index.html';
   frame.title='ZERAPHIA 第10章 RPG試作';
   frame.setAttribute('allow','fullscreen');
   root.append(frame);
   document.body.append(root);
   document.body.classList.add('ch10-rpg-modal-open');
   frame.focus();
 }
 window.openZeraphiaCh10RPG=open;window.closeZeraphiaCh10RPG=close;
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&root){e.preventDefault();close();}});
})();
