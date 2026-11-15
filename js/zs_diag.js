/* ZERAPHIA build1983 — 隠し診断画面
   開き方：設定画面の見出し「設定」を3秒以内に5回タップ。一般のユーザーには見えない。
   表示：端末の情報／Canvas の自己診断（貼り付け・ImageBitmap・画像経由など）／戦闘中の記録（ZsDiag）。
   操作：描画方式の固定（自動／貼り付け／図形）・内容のコピー・記録の消去。
   戦闘中の処理には一切関わらない（開いた時だけ動く）。描画方式の設定だけは次の戦闘から shooting_core.js が読む。 */
(function () {
  'use strict';
  const LOG_KEY = 'zs_diag_v1';
  const MODE_KEY = 'zs_render_mode';

  // 記録の窓口（shooting_core.js より先に読まれた時のための最小版。書式は同じ）
  if (!window.ZsDiag) {
    window.ZsDiag = {
      log(type, detail) {
        try {
          const list = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
          list.push({ t: new Date().toISOString(), type: String(type), detail: String(detail || '').slice(0, 300) });
          while (list.length > 40) list.shift();
          localStorage.setItem(LOG_KEY, JSON.stringify(list));
        } catch (_) {}
      },
      dump() { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (_) { return []; } },
      clear() { try { localStorage.removeItem(LOG_KEY); } catch (_) {} },
    };
  }

  // ---------- Canvas の自己診断 ----------
  function release(cv) { try { if (cv) { cv.width = 0; cv.height = 0; } } catch (_) {} }
  function makeSource() {
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const g = c.getContext('2d');
    if (!g) return null;
    g.fillStyle = '#ff2040'; g.beginPath(); g.arc(8, 8, 7, 0, Math.PI * 2); g.fill();
    return c;
  }
  function readCenter(dst, x, y) {
    const d = dst.getContext('2d', { willReadFrequently: true });
    const px = d.getImageData(x, y, 1, 1).data;
    return (px[3] > 150 && px[0] > 150) ? 'OK' : `NG(${px[0]},${px[1]},${px[2]},${px[3]})`;
  }
  async function selfTest() {
    const out = {};
    const run = async (name, fn) => { try { out[name] = await fn(); } catch (e) { out[name] = 'ERROR ' + (e && e.message || e); } };
    await run('図形を直接描く', () => {
      const c = document.createElement('canvas'); c.width = 16; c.height = 16;
      const g = c.getContext('2d', { willReadFrequently: true });
      if (!g) return 'NG(getContextがnull)';
      g.fillStyle = '#ff2040'; g.fillRect(0, 0, 16, 16);
      const r = readCenter(c, 8, 8); release(c); return r;
    });
    await run('Canvas→Canvas 貼り付け（小）', () => {
      const s = makeSource(); if (!s) return 'NG(getContextがnull)';
      const d = document.createElement('canvas'); d.width = 16; d.height = 16;
      const g = d.getContext('2d', { willReadFrequently: true }); if (!g) return 'NG(getContextがnull)';
      g.drawImage(s, 0, 0); const r = readCenter(d, 8, 8); release(s); release(d); return r;
    });
    await run('Canvas→Canvas 貼り付け（画面サイズ・拡大あり）', () => {
      const s = makeSource(); if (!s) return 'NG(getContextがnull)';
      const d = document.createElement('canvas');
      d.width = Math.round((window.innerWidth || 390) * 1.25); d.height = Math.round((window.innerHeight || 800) * 1.25);
      const g = d.getContext('2d', { willReadFrequently: true }); if (!g) return 'NG(getContextがnull)';
      g.setTransform(1.25, 0, 0, 1.25, 0, 0); g.drawImage(s, 100, 100, 16, 16);
      const r = readCenter(d, Math.round(108 * 1.25), Math.round(108 * 1.25)); release(s); release(d); return r;
    });
    await run('ImageBitmap 経由の貼り付け', async () => {
      if (typeof createImageBitmap !== 'function') return '非対応';
      const s = makeSource(); if (!s) return 'NG(getContextがnull)';
      const bmp = await createImageBitmap(s);
      const d = document.createElement('canvas'); d.width = 16; d.height = 16;
      const g = d.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0);
      const r = readCenter(d, 8, 8); try { bmp.close(); } catch (_) {} release(s); release(d); return r;
    });
    await run('画像（toDataURL）経由の貼り付け', () => new Promise(resolve => {
      const s = makeSource(); if (!s) { resolve('NG(getContextがnull)'); return; }
      const img = new Image();
      img.onload = () => {
        const d = document.createElement('canvas'); d.width = 16; d.height = 16;
        const g = d.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
        resolve(readCenter(d, 8, 8)); release(s); release(d);
      };
      img.onerror = () => resolve('NG(画像化に失敗)');
      img.src = s.toDataURL('image/png');
    }));
    await run('Canvasを20枚作れるか', () => {
      const list = []; let ok = 0;
      for (let i = 0; i < 20; i++) { const c = document.createElement('canvas'); c.width = 64; c.height = 64; if (c.getContext('2d')) ok++; list.push(c); }
      list.forEach(release); return ok === 20 ? 'OK' : `NG(${ok}/20)`;
    });
    return out;
  }

  function envInfo() {
    const n = navigator || {};
    const rel = window.__ZERAPHIA_RELEASE__ || {};
    let mode = 'auto'; try { mode = localStorage.getItem(MODE_KEY) || 'auto'; } catch (_) {}
    return {
      'ビルド': rel.build || '-',
      'UA': n.userAgent || '-',
      'ホーム画面アプリ': (n.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) ? 'はい' : 'いいえ',
      '画素密度': window.devicePixelRatio,
      '画面': `${screen.width}x${screen.height} / 表示 ${window.innerWidth}x${window.innerHeight}`,
      '視差効果を減らす': (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'オン' : 'オフ',
      'CPU数': n.hardwareConcurrency || '-',
      '描画方式の設定': mode,
      '前回戦闘の描画方式': window.__zsCanvasMode || '(まだ戦闘していない)',
      '前回戦闘の試験': window.__zsCanvasProbe || '-',
    };
  }

  // ---------- 画面 ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function ensureStyle() {
    if (document.getElementById('zs-diag-style')) return;
    const st = document.createElement('style'); st.id = 'zs-diag-style';
    st.textContent = `
      #zs-diag{position:fixed;inset:0;z-index:999990;background:rgba(10,8,6,.86);color:#f1e7d2;display:flex;flex-direction:column;
        font:13px/1.55 -apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;padding:calc(env(safe-area-inset-top,0px) + 12px) 12px calc(env(safe-area-inset-bottom,0px) + 12px)}
      #zs-diag h2{margin:0 0 8px;font-size:16px}
      #zs-diag .zd-body{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;background:#1c1712;border:1px solid #4b3d2c;border-radius:8px;padding:10px}
      #zs-diag table{width:100%;border-collapse:collapse;margin-bottom:10px}
      #zs-diag td{border-bottom:1px solid #33291e;padding:4px 6px;vertical-align:top;word-break:break-all}
      #zs-diag td:first-child{color:#c7b28c;white-space:nowrap;width:40%}
      #zs-diag .ok{color:#8fe39b}#zs-diag .ng{color:#ff8f8f;font-weight:700}
      #zs-diag .zd-log{font:11px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-all;color:#d9ccb2}
      #zs-diag .zd-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
      #zs-diag button,#zs-diag select{font:600 13px/1 inherit;padding:10px 12px;border-radius:6px;border:1px solid #8c6d3c;background:#2a231a;color:#f3e6c8}
      #zs-diag .zd-note{font-size:11px;color:#a8977a;margin-top:6px}`;
    document.head.appendChild(st);
  }
  let lastText = '';
  async function open() {
    ensureStyle();
    document.getElementById('zs-diag')?.remove();
    const el = document.createElement('div'); el.id = 'zs-diag'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '診断');
    el.innerHTML = '<h2>診断（開発用）</h2><div class="zd-body">調べています…</div>' +
      '<div class="zd-row"><label>描画方式 <select data-zd-mode><option value="auto">自動</option><option value="sprite">貼り付け</option><option value="vector">図形で直接描く</option></select></label></div>' +
      '<div class="zd-note">描画方式は次の戦闘から反映されます。弾が見えない時は「図形で直接描く」を試してください。</div>' +
      '<div class="zd-row"><button type="button" data-zd-copy>内容をコピー</button><button type="button" data-zd-clear>記録を消す</button><button type="button" data-zd-close>閉じる</button></div>';
    document.body.appendChild(el);
    const sel = el.querySelector('[data-zd-mode]');
    try { sel.value = localStorage.getItem(MODE_KEY) || 'auto'; } catch (_) {}
    sel.addEventListener('change', () => { try { localStorage.setItem(MODE_KEY, sel.value); } catch (_) {} render(); });
    el.querySelector('[data-zd-close]').addEventListener('click', () => el.remove());
    el.querySelector('[data-zd-clear]').addEventListener('click', () => { window.ZsDiag.clear(); render(); });
    el.querySelector('[data-zd-copy]').addEventListener('click', async e => {
      const btn = e.currentTarget;
      try { await navigator.clipboard.writeText(lastText); btn.textContent = 'コピーしました'; }
      catch (_) {
        const ta = document.createElement('textarea'); ta.value = lastText; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); btn.textContent = 'コピーしました'; } catch (_) { btn.textContent = 'コピーできませんでした'; } ta.remove();
      }
    });
    async function render() {
      const env = envInfo();
      const test = await selfTest();
      const logs = window.ZsDiag.dump();
      const envRows = Object.entries(env).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
      const testRows = Object.entries(test).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="${String(v).startsWith('OK') ? 'ok' : 'ng'}">${esc(v)}</td></tr>`).join('');
      const logText = logs.length ? logs.map(r => `${r.t} [${r.type}] ${r.detail}${r.stage ? ' (' + r.stage + ')' : ''}`).join('\n') : '(記録なし)';
      el.querySelector('.zd-body').innerHTML = `<table>${envRows}</table><table>${testRows}</table><div class="zd-log">${esc(logText)}</div>`;
      lastText = ['[端末]', ...Object.entries(env).map(([k, v]) => `${k}: ${v}`), '', '[Canvas自己診断]',
        ...Object.entries(test).map(([k, v]) => `${k}: ${v}`), '', '[記録]', logText].join('\n');
    }
    await render();
  }

  // ---------- 開き方：設定の見出しを3秒以内に5回タップ ----------
  let taps = [];
  document.addEventListener('click', e => {
    const t = e.target && e.target.closest && e.target.closest('#screen-setting .app-page-title');
    if (!t) return;
    const now = Date.now();
    taps = taps.filter(x => now - x < 3000); taps.push(now);
    if (taps.length >= 5) { taps = []; void open(); }
  }, true);

  window.ZsDiagPanel = { open, selfTest };
})();
