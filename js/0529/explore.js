// explore.js
// 十三番地：探索パート
// ストーリー終了後、探索画面に遷移し、7ターンのノード選択を行う

(function(){

  // ============================================
  // gameState - ゲーム全体の状態管理
  // ============================================
  const gameState = {
    chapter: null,       // 現在のチャプターID
    turn: 1,             // 現在のターン (1〜7)
    maxTurn: 7,
    phase: 'idle',       // idle / explore / battle
    characters: [],      // 漂流者3人
    currentNodes: [],    // 現在表示中の3択ノード
    log: []              // 探索ログ
  };

  // ============================================
  // キャラクター初期データ（CHAPTER01固定3人）
  // ============================================
  const INITIAL_CHARACTERS = [
    {
      id: 'haru',
      name: 'ハル',
      type: '希望',
      category: '支援',
      hp: 1847,
      hpMax: 1847,
      spd: 102,
      cor: 78,         // ターン毎の侵食加算値（高いほど侵食されやすい）
      erosion: 32      // 現在の侵食率
    },
    {
      id: 'myu',
      name: 'ミュ',
      type: '束縛',
      category: '操作',
      hp: 1623,
      hpMax: 1623,
      spd: 118,
      cor: 89,
      erosion: 68
    },
    {
      id: 'shin',
      name: 'シン',
      type: '狂気',
      category: '火力',
      hp: 1536,
      hpMax: 1536,
      spd: 95,
      cor: 67,
      erosion: 96
    }
  ];

  // ============================================
  // ノード定義
  // ============================================
  const NODE_TYPES = {
    purify: {
      type: 'purify',
      name: '浄化の痕跡',
      label: '浄化ノード',
      icon: '✋',
      color: '#a06ad9',
      desc: '味方単体の侵食率 -20',
      weight: 25
    },
    bufHp: {
      type: 'bufHp',
      name: '残された息吹',
      label: '単純バフノード',
      icon: '✦',
      color: '#6bdb96',
      desc: '味方単体のHP最大値+200',
      weight: 20
    },
    bufSpd: {
      type: 'bufSpd',
      name: '加速の符',
      label: '単純バフノード',
      icon: '⚡',
      color: '#6bb8db',
      desc: '味方単体のSPD+15',
      weight: 20
    },
    trade: {
      type: 'trade',
      name: '歪んだ取引',
      label: '引き換えバフノード',
      icon: '⇄',
      color: '#dbb86b',
      desc: 'HP+15と引き換えに侵食率+10',
      weight: 20
    },
    reroll: {
      type: 'reroll',
      name: '記憶の欠片',
      label: '再抽選アイテム',
      icon: '◆',
      color: '#6bcbdb',
      desc: '戦闘で使える再抽選アイテムを獲得',
      weight: 10
    },
    unknown: {
      type: 'unknown',
      name: '歪んだ残響',
      label: '未知ノード',
      icon: '?',
      color: '#db6b6b',
      desc: '何が起きるか分からない',
      weight: 5
    }
  };

  // ============================================
  // 探索画面のHTML生成
  // ============================================
  function buildExploreScreen() {
    let el = document.getElementById('explore-root');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'explore-root';
    el.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:100000',
      'display:none',
      'background:#0a0a0a',
      'color:#e8e4dc',
      'font-family:"Noto Serif JP",serif',
      'overflow-y:auto',
      'opacity:0',
      'transition:opacity 0.8s ease'
    ].join(';');

    el.innerHTML = `
      <div class="explore-header">
        <div class="explore-chapter">CHAPTER 01</div>
        <div class="explore-room">205号室</div>
        <div class="explore-turn">
          <span class="explore-turn-current" id="explore-turn-current">01</span>
          <span class="explore-turn-sep">/</span>
          <span class="explore-turn-max">07</span>
        </div>
      </div>

      <div class="explore-flavor" id="explore-flavor">
        記憶の奥に潜るたび、世界は<span style="color:#db6b6b">歪</span>んでいく。
      </div>

      <div class="explore-nodes-wrap">
        <div class="explore-nodes-title">— 行先を選択してください —</div>
        <div class="explore-nodes-sub">選択後、ターンが進行します</div>
        <div class="explore-nodes" id="explore-nodes"></div>
        <div class="explore-nodes-note">※ 選択しなかった行先は消滅します</div>
      </div>

      <div class="explore-chars" id="explore-chars"></div>
    `;

    document.body.appendChild(el);
    injectExploreStyle();
    return el;
  }

  function injectExploreStyle() {
    if (document.getElementById('explore-style')) return;
    const s = document.createElement('style');
    s.id = 'explore-style';
    s.textContent = `
      .explore-header {
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        padding:max(20px,env(safe-area-inset-top,20px)) 20px 16px;
      }
      .explore-chapter {
        font-family:"Cinzel",serif;
        font-size:11px;
        letter-spacing:3px;
        color:rgba(232,228,220,0.45);
      }
      .explore-room {
        font-size:18px;
        letter-spacing:2px;
        color:#e8e4dc;
        margin-top:4px;
      }
      .explore-turn {
        text-align:right;
        font-family:"Cinzel",serif;
        font-size:11px;
        letter-spacing:2px;
        color:rgba(232,228,220,0.45);
      }
      .explore-turn-current {
        font-size:24px;
        color:#e8e4dc;
        font-weight:300;
      }
      .explore-turn-sep {
        margin:0 4px;
      }
      .explore-flavor {
        text-align:center;
        font-size:13px;
        color:rgba(232,228,220,0.55);
        letter-spacing:1px;
        line-height:1.8;
        padding:14px 24px 22px;
      }
      .explore-nodes-wrap {
        padding:0 16px 20px;
      }
      .explore-nodes-title {
        text-align:center;
        font-size:12px;
        letter-spacing:3px;
        color:rgba(232,228,220,0.55);
        margin-bottom:4px;
      }
      .explore-nodes-sub {
        text-align:center;
        font-size:10px;
        color:rgba(232,228,220,0.3);
        letter-spacing:1px;
        margin-bottom:18px;
      }
      .explore-nodes {
        display:grid;
        grid-template-columns:1fr 1fr 1fr;
        gap:10px;
      }
      .explore-node {
        background:rgba(20,20,20,0.6);
        border:1px solid rgba(255,255,255,0.08);
        border-radius:10px;
        padding:16px 8px 14px;
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:8px;
        cursor:pointer;
        transition:transform 0.15s, border-color 0.2s, background 0.2s;
        position:relative;
      }
      .explore-node:active {
        transform:scale(0.96);
      }
      .explore-node-name {
        font-size:13px;
        color:#e8e4dc;
        letter-spacing:1px;
        text-align:center;
      }
      .explore-node-label {
        font-size:9px;
        letter-spacing:1px;
        padding:2px 8px;
        border-radius:4px;
        background:rgba(0,0,0,0.4);
      }
      .explore-node-icon-wrap {
        width:64px;
        height:64px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:30px;
        margin:4px 0 6px;
      }
      .explore-node-desc {
        font-size:10px;
        color:rgba(232,228,220,0.6);
        text-align:center;
        line-height:1.6;
        letter-spacing:0.5px;
        min-height:32px;
      }
      .explore-nodes-note {
        text-align:center;
        font-size:10px;
        color:rgba(232,228,220,0.3);
        letter-spacing:1px;
        margin-top:14px;
      }
      .explore-chars {
        padding:20px 12px max(40px,env(safe-area-inset-bottom,40px));
        display:grid;
        grid-template-columns:1fr 1fr 1fr;
        gap:8px;
      }
      .explore-char {
        background:rgba(20,20,20,0.5);
        border:0.5px solid rgba(255,255,255,0.06);
        border-radius:8px;
        padding:10px 8px;
        font-size:11px;
      }
      .explore-char-name {
        font-size:13px;
        color:#e8e4dc;
        letter-spacing:1px;
        margin-bottom:2px;
      }
      .explore-char-type {
        font-size:9px;
        color:rgba(232,228,220,0.5);
        letter-spacing:0.5px;
        margin-bottom:10px;
      }
      .explore-char-stat {
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:6px;
      }
      .explore-char-stat-label {
        font-size:9px;
        color:rgba(232,228,220,0.5);
        letter-spacing:1px;
        width:32px;
      }
      .explore-char-stat-bar {
        flex:1;
        height:4px;
        background:rgba(255,255,255,0.08);
        border-radius:2px;
        overflow:hidden;
        margin:0 6px;
      }
      .explore-char-stat-fill {
        height:100%;
        transition:width 0.6s ease;
      }
      .explore-char-stat-val {
        font-size:10px;
        color:#e8e4dc;
        font-family:"Cinzel",serif;
        min-width:32px;
        text-align:right;
      }

      /* 侵食オーラ演出 */
      #explore-aura {
        position:fixed;
        inset:0;
        z-index:9500;
        pointer-events:none;
        opacity:0;
        transition:opacity 0.3s ease;
      }
      #explore-aura.up {
        background:linear-gradient(to top, rgba(180,30,60,0.55), rgba(180,30,60,0) 60%);
        animation:auraUp 1.5s ease-out;
      }
      #explore-aura.down {
        background:linear-gradient(to bottom, rgba(80,200,140,0.5), rgba(80,200,140,0) 60%);
        animation:auraDown 1.5s ease-out;
      }
      @keyframes auraUp {
        0%   { opacity:0; transform:translateY(20%); }
        30%  { opacity:1; }
        100% { opacity:0; transform:translateY(-10%); }
      }
      @keyframes auraDown {
        0%   { opacity:0; transform:translateY(-20%); }
        30%  { opacity:1; }
        100% { opacity:0; transform:translateY(10%); }
      }

      /* 確認ポップアップ */
      #explore-confirm {
        position:fixed;
        inset:0;
        display:none;
        align-items:center;
        justify-content:center;
        background:rgba(0,0,0,0.75);
        z-index:9700;
        opacity:0;
        transition:opacity 0.25s ease;
      }
      #explore-confirm.active { display:flex; opacity:1; }
      .explore-confirm-box {
        background:#0a0a0a;
        border:1px solid #555;
        padding:24px 22px 18px;
        min-width:260px;
        max-width:80vw;
        text-align:center;
        color:#e8e4dc;
        letter-spacing:0.1em;
      }
      .explore-confirm-msg {
        font-size:14px;
        line-height:1.7;
        margin-bottom:18px;
        white-space:pre-wrap;
      }
      .explore-confirm-btns {
        display:flex;
        gap:10px;
        justify-content:center;
      }
      .explore-confirm-btn {
        flex:1;
        max-width:110px;
        padding:10px 0;
        font-family:inherit;
        letter-spacing:0.15em;
        cursor:pointer;
        font-size:13px;
      }
      .explore-confirm-no {
        background:transparent;
        border:1px solid #666;
        color:#aaa;
      }
      .explore-confirm-yes {
        background:#1a1a1a;
        border:1px solid #c8c8c8;
        color:#fff;
      }
    `;
    document.head.appendChild(s);

    // オーラ要素を追加
    const aura = document.createElement('div');
    aura.id = 'explore-aura';
    document.body.appendChild(aura);
  }

  // ============================================
  // ノード抽選
  // ============================================
  function pickThreeNodes() {
    const pool = Object.values(NODE_TYPES);
    const totalWeight = pool.reduce((sum, n) => sum + n.weight, 0);

    const picked = [];
    const usedTypes = new Set();

    // 同じノードタイプが3択内で被らないよう抽選
    let tries = 0;
    while (picked.length < 3 && tries < 50) {
      tries++;
      let r = Math.random() * totalWeight;
      for (const n of pool) {
        r -= n.weight;
        if (r <= 0) {
          if (!usedTypes.has(n.type)) {
            usedTypes.add(n.type);
            picked.push(n);
          }
          break;
        }
      }
    }
    // 万一足りなければプールから補充
    while (picked.length < 3) {
      const fallback = pool.find(n => !usedTypes.has(n.type));
      if (!fallback) break;
      usedTypes.add(fallback.type);
      picked.push(fallback);
    }
    return picked;
  }

  // ============================================
  // 描画関数
  // ============================================
  function renderTurn() {
    const el = document.getElementById('explore-turn-current');
    if (el) el.textContent = String(gameState.turn).padStart(2, '0');
  }

  function renderNodes() {
    const wrap = document.getElementById('explore-nodes');
    if (!wrap) return;
    wrap.innerHTML = '';
    gameState.currentNodes.forEach(node => {
      const card = document.createElement('div');
      card.className = 'explore-node';
      card.style.borderColor = node.color + '44';
      card.innerHTML = `
        <div class="explore-node-label" style="color:${node.color}">${node.label}</div>
        <div class="explore-node-icon-wrap" style="color:${node.color}">${node.icon}</div>
        <div class="explore-node-name">${node.name}</div>
        <div class="explore-node-desc">${node.desc}</div>
      `;
      card.onclick = () => onNodeTap(node);
      wrap.appendChild(card);
    });
  }

  function renderChars() {
    const wrap = document.getElementById('explore-chars');
    if (!wrap) return;
    wrap.innerHTML = '';
    gameState.characters.forEach(c => {
      const erosionColor = c.erosion >= 80 ? '#db4040' : c.erosion >= 50 ? '#dba640' : '#8b6bdb';
      const hpRate = (c.hp / c.hpMax) * 100;
      const div = document.createElement('div');
      div.className = 'explore-char';
      div.dataset.charId = c.id;
      div.innerHTML = `
        <div class="explore-char-name">${c.name}</div>
        <div class="explore-char-type">${c.category}｜${c.type}</div>

        <div class="explore-char-stat">
          <div class="explore-char-stat-label">侵食</div>
          <div class="explore-char-stat-bar">
            <div class="explore-char-stat-fill" data-stat="erosion" style="width:${c.erosion}%;background:${erosionColor}"></div>
          </div>
          <div class="explore-char-stat-val" data-val="erosion">${c.erosion}%</div>
        </div>

        <div class="explore-char-stat">
          <div class="explore-char-stat-label">HP</div>
          <div class="explore-char-stat-bar">
            <div class="explore-char-stat-fill" style="width:${hpRate}%;background:#6bdb96"></div>
          </div>
          <div class="explore-char-stat-val">${c.hp}</div>
        </div>

        <div class="explore-char-stat">
          <div class="explore-char-stat-label">SPD</div>
          <div class="explore-char-stat-bar">
            <div class="explore-char-stat-fill" style="width:${Math.min(c.spd,200)/2}%;background:#6bb8db"></div>
          </div>
          <div class="explore-char-stat-val">${c.spd}</div>
        </div>

        <div class="explore-char-stat">
          <div class="explore-char-stat-label">COR</div>
          <div class="explore-char-stat-bar">
            <div class="explore-char-stat-fill" style="width:${c.cor}%;background:#dba640"></div>
          </div>
          <div class="explore-char-stat-val">${c.cor}</div>
        </div>
      `;
      wrap.appendChild(div);
    });
  }

  // ============================================
  // 演出
  // ============================================
  function playAura(direction, cb) {
    const aura = document.getElementById('explore-aura');
    if (!aura) { if (cb) cb(); return; }
    aura.className = '';
    void aura.offsetWidth; // reflow
    aura.className = direction; // 'up' or 'down'
    setTimeout(() => {
      aura.className = '';
      if (cb) cb();
    }, 1500);
  }

  function animateErosionChange(char, oldVal, newVal, cb) {
    const charEl = document.querySelector(`.explore-char[data-char-id="${char.id}"]`);
    if (!charEl) { if (cb) cb(); return; }
    const valEl = charEl.querySelector('[data-val="erosion"]');
    const fillEl = charEl.querySelector('[data-stat="erosion"]');

    const step = newVal > oldVal ? 1 : -1;
    let cur = oldVal;
    const tick = setInterval(() => {
      cur += step;
      if ((step > 0 && cur >= newVal) || (step < 0 && cur <= newVal)) {
        cur = newVal;
        clearInterval(tick);
        // 最後にバー色を更新
        renderChars();
        if (cb) cb();
      }
      if (valEl) valEl.textContent = cur + '%';
      if (fillEl) fillEl.style.width = cur + '%';
    }, 20);
  }

  // ============================================
  // 確認ポップアップ
  // ============================================
  function showConfirm(message, onYes) {
    let popup = document.getElementById('explore-confirm');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'explore-confirm';
      popup.innerHTML = `
        <div class="explore-confirm-box">
          <div class="explore-confirm-msg" id="explore-confirm-msg"></div>
          <div class="explore-confirm-btns">
            <button class="explore-confirm-btn explore-confirm-no" id="explore-confirm-no">いいえ</button>
            <button class="explore-confirm-btn explore-confirm-yes" id="explore-confirm-yes">はい</button>
          </div>
        </div>
      `;
      document.body.appendChild(popup);
    }
    document.getElementById('explore-confirm-msg').textContent = message;
    popup.classList.add('active');

    const close = () => popup.classList.remove('active');
    document.getElementById('explore-confirm-yes').onclick = () => { close(); if (onYes) onYes(); };
    document.getElementById('explore-confirm-no').onclick  = () => { close(); };
  }

  // ============================================
  // ノード効果の適用
  // ============================================
  function applyNodeEffect(node, cb) {
    // 仮実装：浄化はランダム1人の侵食率を下げる、それ以外は単純効果
    if (node.type === 'purify') {
      const target = pickRandomChar();
      const old = target.erosion;
      target.erosion = Math.max(0, target.erosion - 20);
      playAura('down', () => animateErosionChange(target, old, target.erosion, cb));
    } else if (node.type === 'bufHp') {
      const target = pickRandomChar();
      target.hpMax += 200;
      target.hp = Math.min(target.hpMax, target.hp + 200);
      renderChars();
      if (cb) cb();
    } else if (node.type === 'bufSpd') {
      const target = pickRandomChar();
      target.spd += 15;
      renderChars();
      if (cb) cb();
    } else if (node.type === 'trade') {
      const target = pickRandomChar();
      const old = target.erosion;
      target.hpMax += 150;
      target.hp = Math.min(target.hpMax, target.hp + 150);
      target.erosion = Math.min(100, target.erosion + 10);
      playAura('up', () => animateErosionChange(target, old, target.erosion, cb));
    } else if (node.type === 'reroll') {
      // TODO: 再抽選アイテムのストック実装
      if (cb) cb();
    } else if (node.type === 'unknown') {
      const target = pickRandomChar();
      const old = target.erosion;
      // ランダムで -30〜+30
      const delta = Math.floor(Math.random() * 61) - 30;
      target.erosion = Math.max(0, Math.min(100, target.erosion + delta));
      playAura(delta > 0 ? 'up' : 'down', () => animateErosionChange(target, old, target.erosion, cb));
    } else {
      if (cb) cb();
    }
  }

  function pickRandomChar() {
    const arr = gameState.characters;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ============================================
  // ターン進行
  // ============================================
  function advanceTurn() {
    // ターン経過によるCOR加算（半分加算で仮設定）
    gameState.characters.forEach(c => {
      c.erosion = Math.min(100, c.erosion + Math.floor(c.cor / 10));
    });

    gameState.turn++;
    if (gameState.turn > gameState.maxTurn) {
      onExploreFinish();
      return;
    }
    renderTurn();
    renderChars();
    rollNewNodes();
  }

  function rollNewNodes() {
    gameState.currentNodes = pickThreeNodes();
    renderNodes();
  }

  function onNodeTap(node) {
    showConfirm(`${node.name}\n\nへ進みますか？`, () => {
      applyNodeEffect(node, () => {
        setTimeout(advanceTurn, 600);
      });
    });
  }

  function onExploreFinish() {
    alert('探索完了。ボス戦へ（未実装）');
    // 後でboss戦移行処理を入れる
    closeExplore();
  }

  // ============================================
  // 起動・終了
  // ============================================
  function showExploreScreen() {
    const el = buildExploreScreen();
    el.style.display = 'block';
    void el.offsetWidth;
    el.style.opacity = '1';
  }

  function closeExplore() {
    const el = document.getElementById('explore-root');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; }, 800);
  }

  // 公開API
  window.startExplore = function(chapterId) {
    gameState.chapter = chapterId || 'CHAPTER_01';
    gameState.turn = 1;
    gameState.phase = 'explore';
    // 仮：固定3キャラ（後で編成画面から渡す）
    gameState.characters = JSON.parse(JSON.stringify(INITIAL_CHARACTERS));
    gameState.currentNodes = pickThreeNodes();

    showExploreScreen();
    renderTurn();
    renderNodes();
    renderChars();
  };

  // フェードアウト→ブラックアウト→フェードイン→探索開始
  // ストーリーエンジン側から呼ぶ用
  window.startExploreWithFade = function(chapterId) {
    let fade = document.getElementById('explore-fade');
    if (!fade) {
      fade = document.createElement('div');
      fade.id = 'explore-fade';
      fade.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9900;opacity:0;pointer-events:none;transition:opacity 1s ease;';
      document.body.appendChild(fade);
    }
    // フェードアウト 1s
    fade.style.pointerEvents = 'auto';
    fade.style.opacity = '1';

    setTimeout(() => {
      // ブラックアウト1秒中に探索画面を準備
      window.startExplore(chapterId);
      // 探索画面は opacity:0 でスタートしている

      setTimeout(() => {
        // フェードアウトを消すと探索画面が見えてくる
        fade.style.opacity = '0';
        setTimeout(() => { fade.style.pointerEvents = 'none'; }, 1000);
      }, 1000);
    }, 1000);
  };

})();
