/* build2248: スコアランクの色をゲーム全体で統一（S＝虹／A＝金／B＝銀／C＝銅／E＝シャンパンゴールド）
   ランクの文字を表示している要素に data-zr-rank="S|A|B|C|E" を付け、css/rank_colors.css で色を塗る。
   画面ごとのJSは触らず、表示された・書き換わった要素をまとめて見張る。旧 D は C として塗る。 */
(function(){
  'use strict';
  // ランクの文字だけが入る要素（プレイヤーRANK＝レベル数字は対象外）
  const SEL = [
    '.zss-record-rank b',            // ストーリー・各ステージカードの BEST RANK
    '.zss-rank-guide-letter',        // ランク基準の表
    '.mb-rank-indicator b',          // 記憶決戦 BEST
    '[data-g4-rank]',                // レイド 現在ランク
    '.g4-next-rank',                 // レイド「◯ランクまで」
    '.rw-rank',                      // レイド 討伐報酬のランク
    '.rt-rank',                      // レイド ランク別報酬表
    '.daily-raid-rank-chip',         // レイド「RANK S 確定」
    '.drt-rank-labels b',            // レイド ゲージの目盛り
    '[data-rank-letter]'             // 個別に付けたい場所
  ].join(',');
  const RE = /^(?:RANK\s*)?([SABCDE])(?![A-Za-z])/;
  function letterOf(el){
    let t = '';
    for (const n of el.childNodes) { if (n.nodeType === 3) { t += n.nodeValue; if (t.trim()) break; } else if (n.nodeType === 1 && !t.trim()) { t += n.textContent; break; } }
    const m = RE.exec(String(t || el.textContent || '').trim().toUpperCase());
    if (!m) return '';
    return m[1] === 'D' ? 'C' : m[1];
  }
  function tag(el){
    const r = letterOf(el);
    if (r) { if (el.getAttribute('data-zr-rank') !== r) el.setAttribute('data-zr-rank', r); }
    else if (el.hasAttribute('data-zr-rank')) el.removeAttribute('data-zr-rank');
  }
  let queued = false;
  function scan(){
    queued = false;
    try { document.querySelectorAll(SEL).forEach(tag); } catch (_) {}
  }
  function queue(){ if (!queued) { queued = true; requestAnimationFrame(scan); } }
  function start(){
    scan();
    new MutationObserver(queue).observe(document.body, { childList:true, subtree:true, characterData:true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.ZeraphiaRankColors = { scan, letterOf };
})();
