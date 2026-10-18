/* build1618 — 通知ドットを各メニューの「アイコン右上」に揃える。
   レイドバトルの位置（アイコンの右端から2px内側・上端から2px上）を基準に、
   アイコン（.hm2-icon）の実寸から各ドットの top / right を計算して CSS 変数へ入れる。 */
(function () {
  'use strict';
  const INSET_RIGHT = 2;   // アイコン右端からの食い込み
  const INSET_TOP = -2;    // アイコン上端からのずれ（マイナス＝上へ）
  // アイコン画像の余白が大きいメニューだけ、見た目の右上に寄せる補正（px）
  const EXTRA = { 'resonance-tower-home-entry': { right: 14, top: 18 } };

  function placeAll() {
    const main = document.getElementById('screen-main');
    if (!main) return;
    main.querySelectorAll('.home-type-entry').forEach(entry => {
      const icon = entry.querySelector('.hm2-icon');
      if (!icon) return;
      const dots = entry.querySelectorAll(':scope > .home-menu-notice-anchor > *, :scope > .towa-memory-notice-dot');
      if (!dots.length) return;
      const er = entry.getBoundingClientRect();
      const ir = icon.getBoundingClientRect();
      if (!er.width || !ir.width) return;
      const extra = EXTRA[entry.id] || { right: 0, top: 0 };
      const right = Math.round(er.right - ir.right + INSET_RIGHT + extra.right);
      const top = Math.round(ir.top - er.top + INSET_TOP + extra.top);
      dots.forEach(dot => {
        // 同じ値なら書き込まない（MutationObserver の無限ループ防止）
        if (dot.style.getPropertyValue('--zs-dot-right') !== right + 'px') dot.style.setProperty('--zs-dot-right', right + 'px');
        if (dot.style.getPropertyValue('--zs-dot-top') !== top + 'px') dot.style.setProperty('--zs-dot-top', top + 'px');
        // 数字が空のバッジは点として表示
        const text = String(dot.textContent || '').trim();
        dot.classList.toggle('zs-dot-plain', text === '' || text === '0');
      });
    });
  }

  let raf = 0;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; placeAll(); });
  }
  window.ZeraphiaNoticeDots = { refresh: schedule };

  function start() {
    schedule();
    setTimeout(schedule, 300);
    setTimeout(schedule, 1200);
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    const main = document.getElementById('screen-main');
    if (main && 'MutationObserver' in window) {
      // 通知の表示切替（class / 数字 / hidden）やホームへの遷移で位置と形を再計算
      new MutationObserver(schedule).observe(main, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
