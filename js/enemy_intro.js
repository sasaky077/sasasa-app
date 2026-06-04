// enemy_intro.js
// 怪異登場演出：黒フェード → イラストドーン → グリッチ → 白フラッシュ → バトル遷移

(function () {

  // ============================================================
  // 演出本体
  // ============================================================
  function buildIntro() {
    if (document.getElementById('enemy-intro-root')) return;

    const el = document.createElement('div');
    el.id = 'enemy-intro-root';
    el.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:180000',
      'display:none', 'background:#000',
      'overflow:hidden',
    ].join(';');

    el.innerHTML = `
      <!-- 怪異イラスト -->
      <img id="ei-img" src="" alt=""
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.01s;">

      <!-- 暗幕オーバーレイ（グラデ） -->
      <div id="ei-vignette" style="
        position:absolute;inset:0;
        background:radial-gradient(ellipse 70% 80% at 50% 60%, transparent 20%, rgba(0,0,0,0.7) 100%);
        pointer-events:none;opacity:0;transition:opacity 1s ease;
      "></div>

      <!-- ??????テキスト -->
      <div id="ei-name" style="
        position:absolute;bottom:18%;left:0;right:0;
        text-align:center;
        font-family:'Cinzel',serif;
        font-size:32px;letter-spacing:12px;
        color:rgba(232,228,220,0);
        text-shadow:0 0 40px rgba(255,255,255,0.6);
        transition:color 1.2s ease;
      ">??????</div>

      <!-- サブテキスト -->
      <div id="ei-sub" style="
        position:absolute;bottom:calc(18% - 36px);left:0;right:0;
        text-align:center;
        font-family:'Noto Serif JP',serif;
        font-size:11px;letter-spacing:4px;
        color:rgba(232,228,220,0);
        transition:color 1s ease 0.4s;
      ">怪異が顕現した</div>

      <!-- グリッチレイヤー -->
      <div id="ei-glitch" style="
        position:absolute;inset:0;pointer-events:none;opacity:0;
        background:repeating-linear-gradient(
          to bottom,
          rgba(255,255,255,0.03) 0px,
          rgba(255,255,255,0.03) 1px,
          transparent 1px,
          transparent 4px
        );
      "></div>

      <!-- 白フラッシュ -->
      <div id="ei-flash" style="
        position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;
      "></div>
    `;

    document.body.appendChild(el);
    injectStyle();
  }

  function injectStyle() {
    if (document.getElementById('enemy-intro-style')) return;
    const s = document.createElement('style');
    s.id = 'enemy-intro-style';
    s.textContent = `
      @keyframes glitchShift {
        0%   { clip-path: inset(30% 0 60% 0); transform: translateX(-6px); }
        20%  { clip-path: inset(10% 0 80% 0); transform: translateX(8px); }
        40%  { clip-path: inset(60% 0 20% 0); transform: translateX(-4px); }
        60%  { clip-path: inset(80% 0 5%  0); transform: translateX(6px); }
        80%  { clip-path: inset(45% 0 45% 0); transform: translateX(-8px); }
        100% { clip-path: inset(0% 0 0%  0); transform: translateX(0); }
      }
      #ei-img-glitch {
        position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
        opacity:0;pointer-events:none;
        filter:hue-rotate(180deg) saturate(3) brightness(1.5);
        mix-blend-mode:screen;
      }
    `;
    document.body.appendChild(s);
  }

  // ============================================================
  // タイムライン
  // ============================================================
  function runIntro(enemyImg, onComplete) {
    buildIntro();

    const root    = document.getElementById('enemy-intro-root');
    const img     = document.getElementById('ei-img');
    const vignette= document.getElementById('ei-vignette');
    const name    = document.getElementById('ei-name');
    const sub     = document.getElementById('ei-sub');
    const glitch  = document.getElementById('ei-glitch');
    const flash   = document.getElementById('ei-flash');

    // リセット
    img.src = enemyImg;
    img.style.opacity = '0';
    img.style.transform = 'scale(1.08)';
    img.style.transition = 'opacity 1.4s ease, transform 2.5s ease';
    vignette.style.opacity = '0';
    name.style.color = 'rgba(232,228,220,0)';
    sub.style.color  = 'rgba(232,228,220,0)';
    glitch.style.opacity = '0';
    flash.style.opacity  = '0';
    flash.style.transition = 'opacity 0.08s ease';

    // グリッチ用コピー画像
    let glitchImg = document.getElementById('ei-img-glitch');
    if (!glitchImg) {
      glitchImg = document.createElement('img');
      glitchImg.id = 'ei-img-glitch';
      root.appendChild(glitchImg);
    }
    glitchImg.src = enemyImg;
    glitchImg.style.opacity = '0';
    glitchImg.style.animation = 'none';

    root.style.display = 'block';

    // ── Step1: 0.2s 黒画面からイラストフェードイン ──
    setTimeout(() => {
      img.style.opacity = '1';
      img.style.transform = 'scale(1.0)';
      vignette.style.opacity = '1';
    }, 200);

    // ── Step2: 1.4s テキスト出現 ──
    setTimeout(() => {
      name.style.color = 'rgba(232,228,220,0.92)';
      sub.style.color  = 'rgba(232,228,220,0.55)';
    }, 1400);

    // ── Step3: 2.8s グリッチ開始 ──
    setTimeout(() => {
      glitch.style.opacity = '1';
      glitch.style.transition = 'opacity 0.1s';
      glitchImg.style.opacity = '0.6';
      glitchImg.style.animation = 'glitchShift 0.18s steps(1) 4';

      // グリッチ中に画面を細かく揺らす
      let shakeCount = 0;
      const shakeInterval = setInterval(() => {
        root.style.transform = shakeCount % 2 === 0
          ? `translate(${(Math.random()-0.5)*8}px, ${(Math.random()-0.5)*4}px)`
          : 'translate(0,0)';
        shakeCount++;
        if (shakeCount > 10) {
          clearInterval(shakeInterval);
          root.style.transform = 'translate(0,0)';
        }
      }, 60);
    }, 2800);

    // ── Step4: 3.5s 白フラッシュ1発目 ──
    setTimeout(() => {
      flash.style.transition = 'opacity 0.06s ease';
      flash.style.opacity = '0.85';
      setTimeout(() => { flash.style.opacity = '0'; }, 80);
    }, 3500);

    // ── Step5: 3.7s 白フラッシュ2発目（強） ──
    setTimeout(() => {
      glitchImg.style.opacity = '0';
      glitch.style.opacity    = '0';
      flash.style.transition  = 'opacity 0.05s ease';
      flash.style.opacity     = '1';
    }, 3700);

    // ── Step6: 3.85s フラッシュ維持しながらバトルへ ──
    setTimeout(() => {
      flash.style.transition = 'opacity 0.35s ease';
      flash.style.opacity    = '0';
      root.style.display     = 'none';
      if (onComplete) onComplete();
    }, 3850);
  }

  // ============================================================
  // 公開API
  // ============================================================

  // startEnemyIntro(enemyData, partyData)
  // enemyData: { img, ... }  partyData: battle.jsに渡すparty配列
  window.startEnemyIntro = function (enemyData, partyData, options) {
    // 複数敵配列の場合は先頭を代表として演出に使う
    const introEnemy = Array.isArray(enemyData) ? enemyData[0] : enemyData;
    const img = introEnemy.img || introEnemy.upImg || 'images/enemy_01.webp';

    runIntro(img, () => {
      const opt = options || {};

      // [Battle32] battleMode:'32' または 'roguelite' のステージは Battle32.start() へ分岐
      if (opt.battleMode === '32' || opt.battleMode === 'roguelite') {
        if (window.Battle32 && typeof window.Battle32.start === 'function') {
          // opt を全フィールド展開してから partyIds / enemies / enemyIds だけ上書き。
          // rogueliteOptions / rogueliteOnBattleEnd / isBossStage 等が落ちない。
          window.Battle32.start({
            ...opt,

            partyIds: Array.isArray(opt.partyIds) && opt.partyIds.length
              ? opt.partyIds
              : [1, 2, 3],

            // opt.enemies（インライン定義配列）があればそれを優先。
            // なければ opt.enemyIds → enemyData の順にフォールバック。
            enemies: (Array.isArray(opt.enemies) && opt.enemies.length)
              ? opt.enemies
              : undefined,

            enemyIds: (Array.isArray(opt.enemies) && opt.enemies.length)
              ? undefined  // enemies が優先のときは enemyIds を渡さない
              : (Array.isArray(opt.enemyIds) && opt.enemyIds.length)
                ? opt.enemyIds
                : (Array.isArray(enemyData)
                    ? enemyData.map(e => e.id)
                    : (enemyData && enemyData.id ? [enemyData.id] : [])),
          });
        } else {
          console.error('[Battle32] Battle32 is not loaded. Check that battle_32.js is included in index.html.');
          alert('Battle32 が読み込まれていません。index.html の script タグを確認してください。');
        }
        return;
      }

      // 通常バトル（旧 battle.js）
      startBattle(partyData, enemyData, opt);
    });
  };

  // テスト用：コンソールから直接呼べる
  window.testEnemyIntro = function (imgPath) {
    const DUMMY_PARTY = window._lastParty || null;
    const DUMMY_ENEMY = {
      id: 'enemy_01',
      name: '??????',
      img: imgPath || 'images/enemy_01.webp',
      hp: 1800, hpMax: 2000,
      atk: 375,
      phase: 1, status: [],
      actionPattern: [
        { turn: 1, action: '全体攻撃',  type: 'atk_all' },
        { turn: 2, action: '単体攻撃',  type: 'atk_single' },
        { turn: 3, action: '中縦列攻撃', type: 'atk_center' },
        { turn: 4, action: '十字攻撃',  type: 'atk_cross' },
      ],
      actionIdx: 0,
    };
    runIntro(DUMMY_ENEMY.img, () => {
      startBattle(DUMMY_PARTY, DUMMY_ENEMY);
    });
  };

  // party_select.jsのconfirmPartySelectから呼ぶ用にpartyを保存
  window._saveLastParty = function (party) {
    window._lastParty = party;
  };

})();
