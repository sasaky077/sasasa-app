// 20260816-resume-decline-discard-v35
// Zeraphia SPECIAL EVENT - 銃撃戦 prototype
// DOM-based shooting battle core. Character definitions and UI shell are split into separate modules.
(function () {
  'use strict';


  // build737: ニーナ LIGHTNING - 電撃弾 + 連鎖感電
  if (!document.getElementById('shooting-lightning-shot-style-v737')) {
    const lightningStyle = document.createElement('style');
    lightningStyle.id = 'shooting-lightning-shot-style-v737';
    lightningStyle.textContent = `
      .shooting-bullet-lightning{
        width:8px!important;
        height:30px!important;
        min-width:8px!important;
        min-height:30px!important;
        max-width:8px!important;
        max-height:30px!important;
        margin:-15px 0 0 -4px!important;
        border-radius:55% 55% 42% 42%!important;
        overflow:visible!important;
        background:
          linear-gradient(180deg,
            rgba(255,255,255,.15) 0%,
            rgba(255,255,255,.98) 18%,
            rgba(238,245,255,1) 45%,
            rgba(176,208,255,.96) 70%,
            rgba(116,157,255,.18) 100%)!important;
        box-shadow:
          0 0 4px rgba(255,255,255,.95),
          0 0 9px rgba(178,211,255,.88),
          0 0 16px rgba(112,158,255,.48)!important;
        filter:none!important;
      }
      .shooting-bullet-lightning::before{
        content:"";
        position:absolute;
        left:50%;
        top:-5px;
        width:2px;
        height:40px;
        transform:translateX(-50%) rotate(7deg);
        background:rgba(255,255,255,.95);
        box-shadow:0 0 6px rgba(197,222,255,.95);
        opacity:.86;
      }
      .shooting-bullet-lightning::after{
        content:"";
        position:absolute;
        left:-7px;
        right:-7px;
        top:-5px;
        bottom:-5px;
        background:radial-gradient(ellipse at 50% 50%,rgba(190,219,255,.30),rgba(132,175,255,.10) 48%,transparent 72%);
        filter:blur(1.5px);
        opacity:.85;
      }
      .shooting-lightning-chain-effect{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        overflow:visible;
        z-index:47;
        pointer-events:none;
      }
      .shooting-lightning-chain-glow{
        fill:none;
        stroke:rgba(143,188,255,.55);
        stroke-width:6;
        stroke-linecap:round;
        stroke-linejoin:round;
        filter:blur(2px);
      }
      .shooting-lightning-chain-core{
        fill:none;
        stroke:rgba(248,252,255,.98);
        stroke-width:1.6;
        stroke-linecap:round;
        stroke-linejoin:round;
      }
      .shooting-lightning-chain-hit{
        fill:rgba(255,255,255,.94);
        stroke:rgba(159,200,255,.78);
        stroke-width:1.2;
      }
      /* build806: ニーナ通常攻撃は弾ではなく、対象へ直接つながる継続電撃。 */
      .shooting-nina-electric-network{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        overflow:visible;
        z-index:49;
        pointer-events:none;
        opacity:1;
        mix-blend-mode:screen;
        filter:drop-shadow(0 0 3px rgba(var(--nina-electric-rgb,231,200,90),.46));
        animation:ninaElectricNetworkFlicker 112ms steps(4,end) forwards;
      }
      .shooting-nina-electric-glow{
        fill:none;
        stroke:rgba(var(--nina-electric-rgb,231,200,90),.54);
        stroke-width:7;
        stroke-linecap:round;
        stroke-linejoin:round;
        filter:blur(2.2px);
      }
      .shooting-nina-electric-color{
        fill:none;
        stroke:rgba(var(--nina-electric-rgb,231,200,90),.96);
        stroke-width:2.8;
        stroke-linecap:round;
        stroke-linejoin:round;
      }
      .shooting-nina-electric-core{
        fill:none;
        stroke:rgba(255,255,247,.98);
        stroke-width:1.15;
        stroke-linecap:round;
        stroke-linejoin:round;
      }
      .shooting-nina-electric-branch{
        fill:none;
        stroke:rgba(var(--nina-electric-rgb,231,200,90),.84);
        stroke-width:1.25;
        stroke-linecap:round;
      }
      .shooting-nina-electric-hit{
        fill:rgba(255,255,247,.96);
        stroke:rgba(var(--nina-electric-rgb,231,200,90),.96);
        stroke-width:2;
        filter:drop-shadow(0 0 5px rgba(var(--nina-electric-rgb,231,200,90),.74));
      }
      /* build907: ニーナULT「出力最大！」中はPLASMAを太く・強く発光させる。 */
      .shooting-nina-electric-network.is-output-max{
        filter:
          drop-shadow(0 0 4px rgba(var(--nina-electric-rgb,231,200,90),.78))
          drop-shadow(0 0 10px rgba(var(--nina-electric-rgb,231,200,90),.38));
      }
      .shooting-nina-electric-network.is-output-max .shooting-nina-electric-glow{
        stroke-width:11;
        opacity:.88;
      }
      .shooting-nina-electric-network.is-output-max .shooting-nina-electric-color{
        stroke-width:4.2;
      }
      .shooting-nina-electric-network.is-output-max .shooting-nina-electric-core{
        stroke-width:1.65;
      }
      .shooting-nina-electric-network.is-output-max .shooting-nina-electric-hit{
        stroke-width:3;
      }
      @keyframes ninaElectricNetworkFlicker{
        0%{opacity:.28}
        18%{opacity:1}
        34%{opacity:.48}
        50%{opacity:.96}
        68%{opacity:.38}
        82%{opacity:.9}
        100%{opacity:0}
      }
      .shooting-nina-ult-zone-warning{
        position:absolute;
        z-index:45;
        pointer-events:none;
        box-sizing:border-box;
        border:1px solid rgba(152,193,255,.74);
        background:
          radial-gradient(circle at 50% 50%,
            rgba(231,242,255,.34) 0%,
            rgba(164,202,255,.16) 42%,
            rgba(112,162,244,.05) 72%,
            transparent 100%);
        box-shadow:
          inset 0 0 18px rgba(190,218,255,.18),
          0 0 12px rgba(138,183,255,.14);
        opacity:0;
        transform:scale(.98);
        animation:ninaUltZoneWarn 180ms ease-out forwards;
      }
      .shooting-nina-ult-zone-warning::before,
      .shooting-nina-ult-zone-warning::after{
        content:"";
        position:absolute;
        background:rgba(230,242,255,.72);
        box-shadow:0 0 6px rgba(153,195,255,.54);
      }
      .shooting-nina-ult-zone-warning::before{
        left:50%;
        top:12%;
        bottom:12%;
        width:1px;
        transform:translateX(-50%);
      }
      .shooting-nina-ult-zone-warning::after{
        top:50%;
        left:12%;
        right:12%;
        height:1px;
        transform:translateY(-50%);
      }
      @keyframes ninaUltZoneWarn{
        0%{opacity:0;transform:scale(.985)}
        38%{opacity:.72;transform:scale(1)}
        100%{opacity:.34;transform:scale(1)}
      }

      /* build810: ニーナULT VFX刷新。細い稲光が上から下へ走り、着弾リングは使わない。 */
      .shooting-nina-ult-lightning{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        z-index:51;
        overflow:visible;
        pointer-events:none;
        mix-blend-mode:screen;
      }
      .shooting-nina-ult-lightning path{
        fill:none;
        stroke-linecap:round;
        stroke-linejoin:round;
        vector-effect:non-scaling-stroke;
      }
      .shooting-nina-ult-bolt-glow{
        stroke:rgba(var(--nina-ult-rgb,231,200,90),.52);
        stroke-width:7;
        filter:blur(2.2px);
        opacity:.82;
        stroke-dasharray:100;
        stroke-dashoffset:100;
        animation:ninaUltBoltDraw 230ms cubic-bezier(.16,.82,.24,1) forwards;
      }
      .shooting-nina-ult-bolt-color{
        stroke:rgba(var(--nina-ult-rgb,231,200,90),.98);
        stroke-width:2.7;
        stroke-dasharray:100;
        stroke-dashoffset:100;
        animation:ninaUltBoltDraw 220ms cubic-bezier(.16,.82,.24,1) forwards;
      }
      .shooting-nina-ult-bolt-core{
        stroke:rgba(255,255,249,.99);
        stroke-width:1.15;
        stroke-dasharray:16 84;
        stroke-dashoffset:100;
        filter:drop-shadow(0 0 3px rgba(255,255,255,.92));
        animation:ninaUltBoltRunner 220ms cubic-bezier(.14,.78,.18,1) forwards;
      }
      .shooting-nina-ult-bolt-branch{
        stroke:rgba(var(--nina-ult-rgb,231,200,90),.82);
        stroke-width:1.25;
        stroke-dasharray:100;
        stroke-dashoffset:100;
        opacity:.82;
        animation:ninaUltBoltDraw 180ms cubic-bezier(.2,.8,.2,1) 36ms forwards;
      }
      @keyframes ninaUltBoltDraw{
        0%{stroke-dashoffset:100;opacity:.08}
        12%{opacity:1}
        72%{stroke-dashoffset:0;opacity:1}
        100%{stroke-dashoffset:0;opacity:0}
      }
      @keyframes ninaUltBoltRunner{
        0%{stroke-dashoffset:100;opacity:0}
        8%{opacity:1}
        78%{stroke-dashoffset:0;opacity:1}
        100%{stroke-dashoffset:-14;opacity:0}
      }

      /* 着弾は控えめな塵だけ。円・リング・爆発は出さない。 */
      .shooting-nina-ult-dust{
        position:absolute;
        left:0;top:0;
        width:1px;height:1px;
        z-index:50;
        pointer-events:none;
      }
      .shooting-nina-ult-dust i{
        position:absolute;
        left:0;top:0;
        width:var(--dust-size,4px);
        height:3px;
        border-radius:46% 54% 52% 48%;
        background:rgba(199,195,184,.56);
        box-shadow:0 0 3px rgba(228,224,214,.28);
        transform:translate(-50%,-50%);
        opacity:0;
        animation:ninaUltDust 360ms ease-out var(--dust-delay,0ms) forwards;
      }
      @keyframes ninaUltDust{
        0%{opacity:0;transform:translate(-50%,-50%) translate(0,0) scale(.65)}
        18%{opacity:.68}
        100%{opacity:0;transform:translate(-50%,-50%) translate(var(--dust-x,0px),var(--dust-y,-12px)) scale(1.22)}
      }

      /* 麻痺中は対象の周囲だけに細い電流を走らせる。 */
      .shooting-nina-paralyze-vfx{
        position:absolute;
        inset:-9px;
        z-index:72;
        pointer-events:none;
        overflow:visible;
        mix-blend-mode:screen;
        filter:drop-shadow(0 0 4px rgba(var(--nina-paralyze-rgb,231,200,90),.58));
        animation:ninaParalyzeJitter 118ms steps(3,end) infinite;
      }
      .shooting-nina-paralyze-vfx svg{
        display:block;
        width:100%;
        height:100%;
        overflow:visible;
      }
      .shooting-nina-paralyze-vfx path{
        fill:none;
        stroke:rgba(var(--nina-paralyze-rgb,231,200,90),.92);
        stroke-width:1.45;
        stroke-linecap:round;
        stroke-linejoin:round;
        vector-effect:non-scaling-stroke;
        stroke-dasharray:10 7 3 6;
        animation:ninaParalyzeCurrent 190ms linear infinite;
      }
      .shooting-nina-paralyze-vfx path:nth-child(2){
        opacity:.72;
        animation-duration:143ms;
        animation-direction:reverse;
      }
      .shooting-nina-paralyze-vfx path:nth-child(3){
        opacity:.56;
        animation-duration:227ms;
      }
      .shooting-nina-paralyze-vfx::after{
        content:"";
        position:absolute;
        left:50%;top:50%;
        width:5px;height:5px;
        border-radius:50%;
        background:rgba(255,255,249,.94);
        box-shadow:
          -19px -8px 0 -1px rgba(var(--nina-paralyze-rgb,231,200,90),.88),
          18px -15px 0 -1px rgba(var(--nina-paralyze-rgb,231,200,90),.72),
          22px 11px 0 -1px rgba(var(--nina-paralyze-rgb,231,200,90),.82),
          -15px 17px 0 -1px rgba(var(--nina-paralyze-rgb,231,200,90),.68);
        animation:ninaParalyzeSpark 210ms steps(2,end) infinite alternate;
      }
      @keyframes ninaParalyzeCurrent{
        from{stroke-dashoffset:23;opacity:.44}
        45%{opacity:1}
        to{stroke-dashoffset:-23;opacity:.58}
      }
      @keyframes ninaParalyzeJitter{
        0%{transform:translate(0,0) rotate(0deg)}
        33%{transform:translate(-1px,1px) rotate(-.7deg)}
        66%{transform:translate(1px,-1px) rotate(.6deg)}
        100%{transform:translate(0,0) rotate(0deg)}
      }
      @keyframes ninaParalyzeSpark{
        0%{opacity:.3;transform:translate(-50%,-50%) scale(.7)}
        100%{opacity:1;transform:translate(-50%,-50%) scale(1.18)}
      }
    `;
    document.head.appendChild(lightningStyle);
  }

  // ウルフ / ノア：波動ホーミング弾 + ノアULT専用の軽量DOMエフェクト
  if (!document.getElementById('shooting-noah-wave-style-v112')) {
    const noahStyle = document.createElement('style');
    noahStyle.id = 'shooting-noah-wave-style-v112';
    noahStyle.textContent = `
      /* ウルフ / ノア共通：真円のホーミング光弾 */
      .shooting-bullet-wolf-j{
        width:18px!important;
        height:18px!important;
        min-width:18px!important;
        min-height:18px!important;
        max-width:18px!important;
        max-height:18px!important;
        margin:-9px 0 0 -9px!important;
        border-radius:50%!important;
        overflow:visible!important;
        background:radial-gradient(circle at 50% 50%,rgba(255,255,255,1) 0 18%,rgba(245,237,255,.98) 19% 33%,rgba(182,136,231,.96) 45%,rgba(118,73,176,.80) 62%,rgba(68,35,109,.24) 76%,transparent 78%)!important;
        box-shadow:0 0 6px rgba(255,248,255,.96),0 0 12px rgba(185,140,230,.88),0 0 18px rgba(109,69,165,.42)!important;
        filter:none!important;
      }
      .shooting-bullet-wolf-j::before{
        content:"";
        position:absolute;
        left:-4px!important;
        right:-4px!important;
        top:-4px!important;
        bottom:-4px!important;
        width:auto!important;
        height:auto!important;
        transform:none!important;
        border-radius:50%!important;
        border:1.5px solid rgba(232,214,251,.84);
        background:transparent!important;
        box-shadow:0 0 6px rgba(244,235,255,.82), inset 0 0 5px rgba(188,141,231,.40);
        opacity:.95;
      }
      .shooting-bullet-wolf-j::after{
        content:"";
        position:absolute;
        left:-8px!important;
        right:-8px!important;
        top:-8px!important;
        bottom:-8px!important;
        width:auto!important;
        height:auto!important;
        transform:none!important;
        border-radius:50%!important;
        background:radial-gradient(circle,rgba(178,131,227,.28) 0 28%,rgba(132,84,192,.14) 45%,transparent 72%)!important;
        box-shadow:none!important;
        filter:blur(1px);
      }

      /* ノア通常ホーミングは丸い灰白光弾 */
      .shooting-bullet-noah.shooting-bullet-wolf-j{
        background:radial-gradient(circle at 50% 50%,rgba(255,255,255,1) 0 18%,rgba(244,244,247,.98) 19% 34%,rgba(201,203,210,.96) 46%,rgba(130,133,144,.80) 63%,rgba(80,83,94,.22) 76%,transparent 78%)!important;
        box-shadow:0 0 7px rgba(247,247,250,.98),0 0 13px rgba(204,205,213,.86),0 0 18px rgba(132,135,145,.38)!important;
        filter:saturate(.08)!important;
      }
      .shooting-bullet-noah.shooting-bullet-wolf-j::before{
        border-color:rgba(230,231,236,.86);
        box-shadow:0 0 6px rgba(235,236,241,.88), inset 0 0 5px rgba(188,191,201,.32);
      }
      .shooting-bullet-noah.shooting-bullet-wolf-j::after{
        background:radial-gradient(circle,rgba(214,216,223,.25) 0 28%,rgba(146,149,160,.12) 45%,transparent 72%);
      }

      .shooting-noah-laser i{
        background:linear-gradient(90deg,rgba(255,255,255,.15),rgba(250,250,252,.98),rgba(184,186,194,.88),rgba(255,255,255,.15))!important;
        box-shadow:0 0 8px rgba(235,236,241,.95),0 0 18px rgba(143,145,156,.58)!important;
      }
      .shooting-noah-laser b{
        background:rgba(255,255,255,.92)!important;
        box-shadow:0 0 11px rgba(208,210,219,.82)!important;
      }

      /* ノアULT：落雷。縦の閃光 + 着弾リング */
      .shooting-noah-lightning{
        position:absolute;
        left:0;top:0;
        z-index:48;
        width:10px;
        pointer-events:none;
        transform-origin:50% 100%;
        opacity:0;
      }
      .shooting-noah-lightning::before{
        content:"";
        position:absolute;
        left:50%;top:0;bottom:0;
        width:5px;
        transform:translateX(-50%) skewX(-7deg);
        background:linear-gradient(180deg,
          rgba(255,255,255,0),
          rgba(255,255,255,.98) 8%,
          rgba(220,221,226,.98) 28%,
          rgba(255,255,255,1) 55%,
          rgba(174,177,187,.96) 78%,
          rgba(255,255,255,.25));
        box-shadow:
          0 0 7px rgba(255,255,255,1),
          0 0 16px rgba(203,205,215,.95),
          0 0 30px rgba(138,142,154,.72);
        clip-path:polygon(48% 0,100% 0,60% 19%,92% 21%,49% 43%,88% 45%,24% 100%,39% 61%,0 60%,42% 37%,12% 35%,55% 17%);
      }
      .shooting-noah-lightning::after{
        content:"";
        position:absolute;
        left:50%;bottom:-10px;
        width:58px;height:22px;
        transform:translateX(-50%);
        border-radius:50%;
        border:2px solid rgba(230,231,236,.9);
        box-shadow:
          0 0 10px rgba(255,255,255,.95),
          0 0 24px rgba(150,153,165,.72);
        background:radial-gradient(ellipse,rgba(255,255,255,.72),rgba(180,183,194,.18) 48%,transparent 72%);
      }
      .shooting-noah-lightning.strike{
        animation:noahLightningStrike .22s ease-out both;
      }
      @keyframes noahLightningStrike{
        0%{opacity:0;filter:brightness(2.2)}
        12%{opacity:1;filter:brightness(2.5)}
        42%{opacity:.95;filter:brightness(1.65)}
        100%{opacity:0;filter:brightness(1)}
      }
      #shooting-event-root.noah-paralyze-active .shooting-arena{
        filter:saturate(.25) brightness(1.04);
      }

    `;
    document.head.appendChild(noahStyle);
  }


  // ERI系共通ULT：敵行動停止 → 属性色の細い閃光 → 全体ダメージ。
  if (!document.getElementById('shooting-eri-ult-feedback-style-v2')) {
    const eriUltStyle = document.createElement('style');
    eriUltStyle.id = 'shooting-eri-ult-feedback-style-v2';
    eriUltStyle.textContent = `
      .shooting-eri-ult-ray,
      .shooting-eri-ult-slash{
        position:absolute;
        left:0;top:0;
        pointer-events:none;
        z-index:46;
      }
      .shooting-eri-ult-ray{
        height:2px;
        border-radius:999px;
        transform-origin:0 50%;
        opacity:0;
        background:linear-gradient(
          90deg,
          rgba(var(--ult-element-rgb),0) 0%,
          rgba(var(--ult-element-rgb),.66) 10%,
          rgba(255,255,255,.98) 48%,
          rgba(var(--ult-element-rgb),.98) 78%,
          rgba(var(--ult-element-rgb),0) 100%
        );
        box-shadow:
          0 0 3px rgba(255,255,255,.92),
          0 0 8px rgba(var(--ult-element-rgb),.92),
          0 0 14px rgba(var(--ult-element-rgb),.48);
        animation:shootingEriUltRay .34s cubic-bezier(.18,.76,.22,1) var(--eri-ray-delay,0ms) both;
      }
      .shooting-eri-ult-ray::after{
        content:"";
        position:absolute;
        left:0;right:0;top:50%;
        height:1px;
        transform:translateY(-50%);
        background:rgba(255,255,255,.9);
        filter:blur(.15px);
      }
      @keyframes shootingEriUltRay{
        0%{opacity:0;transform:rotate(var(--eri-ray-angle,0deg)) scaleX(.02)}
        16%{opacity:1}
        62%{opacity:1;transform:rotate(var(--eri-ray-angle,0deg)) scaleX(1)}
        100%{opacity:0;transform:rotate(var(--eri-ray-angle,0deg)) scaleX(1.04)}
      }
      .shooting-eri-ult-slash{
        width:104px;height:4px;
        border-radius:50%;
        background:linear-gradient(
          90deg,
          transparent,
          rgba(var(--ult-element-rgb),.86) 18%,
          #fff 50%,
          rgba(var(--ult-element-rgb),.96) 82%,
          transparent
        );
        box-shadow:
          0 0 6px rgba(255,255,255,.96),
          0 0 16px rgba(var(--ult-element-rgb),.72);
        transform:translate(-50%,-50%) rotate(-18deg) scaleX(.18);
        opacity:0;
        animation:shootingEriUltSlash .36s cubic-bezier(.16,.72,.22,1) both;
      }
      .shooting-eri-ult-slash::after{
        content:"";
        position:absolute;
        left:50%;top:50%;
        width:72px;height:72px;
        transform:translate(-50%,-50%);
        border-radius:50%;
        background:radial-gradient(
          circle,
          rgba(255,255,255,.68) 0%,
          rgba(var(--ult-element-rgb),.22) 36%,
          transparent 70%
        );
      }
      @keyframes shootingEriUltSlash{
        0%{opacity:0;transform:translate(-50%,-50%) rotate(-18deg) scaleX(.12)}
        18%{opacity:1}
        48%{opacity:1;transform:translate(-50%,-50%) rotate(-18deg) scaleX(1.12)}
        100%{opacity:0;transform:translate(-50%,-50%) rotate(-18deg) scaleX(1.34)}
      }
      #shooting-event-root.eri-ult-impact .shooting-arena{
        animation:shootingEriUltImpact .16s ease-out both;
      }
      @keyframes shootingEriUltImpact{
        0%{filter:brightness(1)}
        18%{filter:brightness(1.55) saturate(.72)}
        52%{filter:brightness(1.12) saturate(.9)}
        100%{filter:brightness(1)}
      }
      #shooting-event-root.eri-ult-hitstop #shooting-boss,
      #shooting-event-root.eri-ult-hitstop .shooting-normal-enemy{
        filter:brightness(1.92) saturate(.52) drop-shadow(0 0 9px rgba(var(--ult-element-rgb),.88))!important;
      }
    `;
    document.head.appendChild(eriUltStyle);
  }


  // ベロニカ通常攻撃：近距離の半月状剣撃。
  if (!document.getElementById('shooting-veronica-slash-style-v1')) {
    const veronicaSlashStyle = document.createElement('style');
    veronicaSlashStyle.id = 'shooting-veronica-slash-style-v1';
    veronicaSlashStyle.textContent = `
      .shooting-veronica-slash{
        position:absolute;
        left:0;top:0;
        width:var(--veronica-slash-width,120px);
        height:var(--veronica-slash-range,140px);
        transform:translate(-50%,-100%);
        transform-origin:50% 100%;
        pointer-events:none;
        z-index:35;
        opacity:0;
        overflow:visible;
        animation:veronicaSlashFade var(--veronica-slash-ms,180ms) ease-out both;
      }
      .shooting-veronica-slash::before{
        content:"";
        position:absolute;
        left:50%;bottom:2px;
        width:92%;height:92%;
        transform:translateX(-50%) rotate(-8deg);
        border-radius:52% 52% 46% 46%;
        border-top:4px solid rgba(255,255,255,.96);
        border-left:2px solid rgba(194,222,235,.74);
        box-shadow:0 -2px 7px rgba(255,255,255,.95),0 -7px 17px rgba(145,190,216,.48);
        clip-path:polygon(0 0,100% 0,90% 58%,50% 100%,10% 58%);
      }
      .shooting-veronica-slash::after{
        content:"";
        position:absolute;
        left:50%;bottom:10%;
        width:68%;height:65%;
        transform:translateX(-50%) rotate(9deg);
        border-radius:50%;
        border-top:1px solid rgba(224,242,249,.64);
        filter:blur(.3px);
      }
      @keyframes veronicaSlashFade{
        0%{opacity:0;transform:translate(-50%,-100%) scale(.72) rotate(-8deg)}
        18%{opacity:1}
        58%{opacity:.94;transform:translate(-50%,-100%) scale(1.05) rotate(5deg)}
        100%{opacity:0;transform:translate(-50%,-100%) scale(1.13) rotate(10deg)}
      }
    `;
    document.head.appendChild(veronicaSlashStyle);
  }


  // ジグULT：6本の細レーザーが5秒間、壁をランダム反射しながら画面を走査。
  if (!document.getElementById('shooting-jig-scramble-ray-style-v1')) {
    const jigUltStyle = document.createElement('style');
    jigUltStyle.id = 'shooting-jig-scramble-ray-style-v1';
    jigUltStyle.textContent = `
      .shooting-jig-scramble-ray{
        position:absolute;
        left:0;top:0;
        height:var(--jig-ray-width,5px);
        width:var(--jig-ray-length,128px);
        pointer-events:none;
        transform-origin:100% 50%;
        z-index:47;
        border-radius:999px;
        opacity:.94;
        background:linear-gradient(90deg,
          rgba(190,226,203,0) 0%,
          rgba(205,237,214,.42) 16%,
          rgba(238,255,244,.96) 54%,
          rgba(255,255,255,1) 82%,
          rgba(226,255,235,.98) 100%);
        box-shadow:
          0 0 3px rgba(255,255,255,.98),
          0 0 8px rgba(190,240,208,.88),
          0 0 15px rgba(105,191,137,.44);
        filter:saturate(.72) brightness(1.06);
        will-change:transform,left,top;
      }
      .shooting-jig-scramble-ray::after{
        content:"";
        position:absolute;
        right:-4px;
        top:50%;
        width:9px;height:9px;
        transform:translateY(-50%);
        border-radius:50%;
        background:rgba(255,255,255,.98);
        box-shadow:0 0 7px rgba(231,255,239,1),0 0 14px rgba(127,214,156,.72);
      }
      #shooting-event-root.jig-scramble-active .shooting-arena{
        box-shadow:inset 0 0 38px rgba(159,218,178,.10);
      }
    `;
    document.head.appendChild(jigUltStyle);
  }


  // シオンULT「黒羽葬鐘」: 画像を使わない呪印 / 黒羽の時間差演出
  if (!document.getElementById('shooting-shion-ult-style-v1')) {
    const shionUltStyle = document.createElement('style');
    shionUltStyle.id = 'shooting-shion-ult-style-v1';
    shionUltStyle.textContent = `
      .shooting-shion-curse-mark{
        position:absolute;
        left:0;top:0;
        z-index:34;
        width:62px;height:62px;
        border-radius:50%;
        pointer-events:none;
        transform:translate3d(var(--unit-x,0px),var(--unit-y,0px),0) translate(-50%,-50%);
        opacity:0;
      }
      .shooting-shion-curse-mark::before{
        content:"";
        position:absolute;
        inset:7px;
        border-radius:50%;
        border:1px solid rgba(86,67,105,.50);
        box-shadow:
          0 0 8px rgba(63,43,79,.22),
          inset 0 0 12px rgba(103,80,125,.10);
      }
      .shooting-shion-curse-mark::after{
        content:"";
        position:absolute;
        left:50%;top:50%;
        width:7px;height:32px;
        border-radius:70% 20% 70% 20%;
        background:linear-gradient(180deg,rgba(44,34,53,.08),rgba(62,43,76,.66),rgba(30,21,38,.04));
        filter:blur(.25px);
        transform:translate(-50%,-50%) rotate(22deg);
        box-shadow:
          -13px 7px 0 -1px rgba(54,39,66,.30),
          14px -6px 0 -2px rgba(74,55,88,.22);
      }
      .shooting-shion-curse-mark.arm{
        animation:shootingShionCurseArm 1.2s ease-out forwards;
      }
      .shooting-shion-curse-mark.detonate{
        animation:shootingShionCurseDetonate .42s ease-out forwards;
      }
      @keyframes shootingShionCurseArm{
        0%{opacity:0;scale:.46;filter:blur(3px)}
        28%{opacity:.78;scale:.88;filter:blur(.6px)}
        72%{opacity:.56;scale:1;filter:blur(.2px)}
        100%{opacity:.86;scale:1.04;filter:blur(0)}
      }
      @keyframes shootingShionCurseDetonate{
        0%{opacity:.92;scale:.82;filter:brightness(.9)}
        42%{opacity:.72;scale:1.30;filter:brightness(1.35)}
        100%{opacity:0;scale:1.78;filter:blur(3px)}
      }
      #shooting-event-root.shion-curse-active .shooting-arena{
        box-shadow:inset 0 0 42px rgba(48,34,59,.11);
      }
    `;
    document.head.appendChild(shionUltStyle);
  }

  // CH04 final ITEM: CSSファイルの更新状況に依存せず、大きく脈動させる。
  if (!document.getElementById('shooting-ch04-item-style-v152')) {
    const style = document.createElement('style');
    style.id = 'shooting-ch04-item-style-v152';
    style.textContent = '@keyframes shootingCh04ItemPulseV153{0%{transform:translate3d(var(--unit-x),var(--unit-y),0) translate(-50%,-50%) scale(.92);filter:brightness(1.05)}100%{transform:translate3d(var(--unit-x),var(--unit-y),0) translate(-50%,-50%) scale(1.16);filter:brightness(1.35)}}';
    document.head.appendChild(style);
  }

  // RANDOM AMBUSH: 軽量DOM/CSSのみ。画像以外の大型エフェクトは使わない。
  if (!document.getElementById('shooting-random-ambush-style-v201')) {
    const style = document.createElement('style');
    style.id = 'shooting-random-ambush-style-v201';
    style.textContent = `
      .shooting-ambush-emergency{position:absolute;inset:0;z-index:999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(14,3,5,.94);color:#ffe9e9;letter-spacing:.16em;text-align:center;pointer-events:auto}
      .shooting-ambush-emergency small{font:700 11px/1.4 "Cinzel",serif;color:#d65b63;letter-spacing:.28em}
      .shooting-ambush-emergency strong{margin-top:12px;font-size:24px;font-weight:700;text-shadow:0 0 12px rgba(210,45,55,.42)}
      .shooting-ambush-emergency span{margin-top:8px;font-size:11px;color:rgba(255,235,235,.72)}
      .shooting-ambush-minion{position:absolute;z-index:9;width:64px;height:64px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 3px 5px rgba(0,0,0,.35));transition:filter .05s linear,opacity .05s linear}
      .shooting-ambush-minion.shooting-hit-sustained{filter:brightness(2.2) saturate(.35) drop-shadow(0 0 10px rgba(255,235,235,.95)) drop-shadow(0 0 18px rgba(220,62,72,.75))!important}
      #shooting-boss.shooting-hit-sustained[data-ambush-hit="1"],#shooting-event-root[data-shooting-stage="shooting_event_overseer_ambush"] #shooting-boss.shooting-hit-sustained{filter:brightness(2.05) saturate(.55) drop-shadow(0 0 12px rgba(255,240,240,.92)) drop-shadow(0 0 22px rgba(210,48,60,.72))!important}
      .shooting-ambush-minion-hp{position:absolute;z-index:10;width:48px;height:4px;background:rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.35);pointer-events:none}
      .shooting-ambush-minion-hp i{display:block;height:100%;width:100%;background:#a64a50}
      .shooting-ambush-bullet{width:9px!important;height:9px!important;background:radial-gradient(circle,#fff 0 18%,#9b3c45 38%,#351b20 72%,transparent 74%)!important;box-shadow:0 0 5px rgba(150,45,55,.45)!important}
      .shooting-ambush-warning-bullet{width:18px!important;height:18px!important;border:2px solid rgba(255,235,235,.96)!important;background:radial-gradient(circle,#fff 0 9%,#ff4a4a 24%,#d11224 48%,#5b0710 74%,transparent 76%)!important;box-shadow:0 0 7px rgba(255,65,65,.95),0 0 15px rgba(215,20,35,.82)!important}
      .shooting-ambush-warning-bullet::after{content:"";position:absolute;inset:-5px;border-radius:50%;border:1px solid rgba(255,40,55,.62);box-shadow:0 0 8px rgba(255,30,45,.45);pointer-events:none}
      .shooting-ambush-laser-warning{position:absolute;z-index:42;transform:translate(-50%,-100%);padding:10px 14px;background:rgba(20,4,6,.82);border:1px solid rgba(220,68,76,.62);color:#ffe6e6;font-size:15px;font-weight:700;letter-spacing:.08em;pointer-events:none;white-space:nowrap}
      .shooting-ambush-laser{position:absolute;z-index:13;left:50%;transform:translateX(-50%);width:50%;background:linear-gradient(90deg,rgba(115,0,8,.38),rgba(255,235,235,.88) 45%,rgba(255,255,255,.95) 50%,rgba(255,235,235,.88) 55%,rgba(115,0,8,.38));box-shadow:0 0 16px rgba(210,36,45,.58);pointer-events:none;transform-origin:50% 0}
    `;
    document.head.appendChild(style);
  }

  const ROOT_ID = 'shooting-event-root';
  const PLAYER_ID = 'shooting-player';
  const BOSS_ID = 'shooting-boss';

  let CharacterModule = window.ShootingCharacters;
  let EnemyModule = window.ShootingEnemies;
  let StageModule = window.ShootingStages;
  let UIModule = window.ShootingUI;

  // 旧index等から shooting_core.js が直接読み込まれていても壊れないように、
  // 不足モジュールを自動ロードしてからcore自身を1回だけ再実行する。
  if (!CharacterModule || !EnemyModule || !StageModule || !UIModule) {
    if (!window.__shootingCoreBootstrapPromise) {
      const current = document.currentScript;
      const baseUrl = current && current.src ? new URL('.', current.src) : new URL('./js/', location.href);

      function loadDependency(file, readyCheck) {
        if (readyCheck()) return Promise.resolve();

        return new Promise((resolve, reject) => {
          const absolute = new URL(file, baseUrl).href;
          const existing = Array.from(document.scripts).find(s => {
            try { return new URL(s.src, location.href).pathname === new URL(absolute).pathname; }
            catch (_) { return false; }
          });

          if (existing) {
            const waitStarted = performance.now();
            const wait = () => {
              if (readyCheck()) return resolve();
              if (performance.now() - waitStarted > 5000) {
                return reject(new Error(`Shooting dependency did not initialize: ${file}`));
              }
              setTimeout(wait, 25);
            };
            wait();
            return;
          }

          const script = document.createElement('script');
          script.src = absolute;
          script.async = false;
          script.dataset.shootingBootstrap = file;
          script.onload = () => {
            if (readyCheck()) resolve();
            else reject(new Error(`Shooting dependency loaded but did not initialize: ${file}`));
          };
          script.onerror = () => reject(new Error(`Failed to load shooting dependency: ${file}`));
          document.head.appendChild(script);
        });
      }

      window.__shootingCoreBootstrapPromise =
        loadDependency('shooting_characters.js', () => !!window.ShootingCharacters)
          .then(() => loadDependency('shooting_enemies.js', () => !!window.ShootingEnemies))
          .then(() => loadDependency('shooting_stages.js', () => !!window.ShootingStages))
          .then(() => loadDependency('shooting_ui.js', () => !!window.ShootingUI))
          .then(() => {
            // 依存が揃ったのでcoreを再実行。
            const script = document.createElement('script');
            script.src = new URL(`shooting_core.js?bootstrap=${Date.now()}`, baseUrl).href;
            script.async = false;
            script.dataset.shootingCoreBootstrapRetry = '1';
            document.head.appendChild(script);
          })
          .catch(err => {
            console.error('[shooting] bootstrap failed', err);
            window.__shootingCoreBootstrapPromise = null;
          });
    }
    return;
  }

  const { CHARACTER_ID, SHOOTING_CHARACTERS, PARTY_SIZE, SWITCH_COOLDOWN_MS, isShootingCharacterOwned, getShootingRosterHtml, getOwnedShootingInstance } = CharacterModule;

  // v177: 公開停止キャラクター。性能コードは将来の差し替え用に残すが、UI/編成から除外する。
  const HIDDEN_SHOOTING_CHARACTER_IDS = new Set([]);
  const isPublicShootingCharacterId = (id) => !HIDDEN_SHOOTING_CHARACTER_IDS.has(Number(id));
  const { DEFAULT_SHOOTING_ENEMY_ID, getShootingEnemy } = EnemyModule;
  const { SHOOTING_STAGE_ID, SHOOTING_MISSION_TYPE, getShootingStage } = StageModule;

  window.ShootingCoreReady = true;

  // Stage selection is not separated yet, so Remnant 01 remains the current default.
  // When shooting_stages.js is introduced, set this ID from the selected stage.
  let selectedStageId = SHOOTING_STAGE_ID.CH01_04;
  let selectedStage = getShootingStage(selectedStageId);
  let selectedEnemyId = DEFAULT_SHOOTING_ENEMY_ID;

  function resolveSelectedStage(options) {
    if (options && options.stageId) selectedStageId = String(options.stageId);
    const stage = getShootingStage(selectedStageId);
    if (!stage) throw new Error(`Shooting stage not found: ${selectedStageId}`);
    selectedStage = stage;
    if (Array.isArray(stage.enemyIds) && stage.enemyIds.length) selectedEnemyId = stage.enemyIds[0];
    if (options && options.enemyId) selectedEnemyId = String(options.enemyId);
    return stage;
  }

  function getCurrentShootingEnemy() {
    const enemy = getShootingEnemy(selectedEnemyId);
    if (!enemy || !enemy.implemented) {
      throw new Error(`Shooting enemy is not implemented: ${selectedEnemyId}`);
    }
    return enemy;
  }

  // NORMAL(初級)は shooting_beginner_* ID になるため、
  // CH04固有ギミック判定では baseStageId を優先して本体ステージIDへ正規化する。
  function getSelectedBaseStageId() {
    return String((selectedStage && selectedStage.baseStageId) || (selectedStage && selectedStage.id) || '');
  }

  function isSelectedBaseStage(stageId) {
    return getSelectedBaseStageId() === String(stageId || '');
  }

  // build875: normal-stage mission source of truth.
  // CH01-STAGE1 is always COLLECT_ITEM x3, even if stale stage data is mixed in.
  function getEffectiveNormalMission() {
    const source = (state && state.mission) || (selectedStage && selectedStage.mission) || {};
    if (isSelectedBaseStage(SHOOTING_STAGE_ID.CH01_01)) {
      return {
        ...source,
        type: SHOOTING_MISSION_TYPE.COLLECT_ITEM,
        target: 3,
        text: 'アイテムを3個拾ってクリア',
      };
    }
    return source;
  }

  function isCollectMissionSatisfied(mission = getEffectiveNormalMission()) {
    if (!mission || mission.type !== SHOOTING_MISSION_TYPE.COLLECT_ITEM) return true;
    const target = Math.max(1, Number(mission.target || 3));
    return Math.max(0, Number((state && state.collectedItems) || 0)) >= target;
  }


  function isFacelessStage() {
    return !!(selectedStage && selectedStage.eventId === 'faceless' && selectedStage.faceless);
  }

  function isRaidStage() {
    return !!(selectedStage && selectedStage.eventId === 'raid' && selectedStage.raid);
  }

  function isScoreAttackStage() {
    return !!(selectedStage && selectedStage.eventId === 'score_attack' && selectedStage.scoreAttack);
  }

  function getDailyQuestStageIdentity() {
    const id = String((selectedStage && selectedStage.id) || selectedStageId || '');
    const match = id.match(/^shooting_daily_(mon|tue|wed|thu|fri|sat|sun)_(intermediate|advanced)$/i);
    if (!match) return null;
    return {
      id,
      weekdayKey: String(match[1] || '').toLowerCase(),
      level: String(match[2] || '').toLowerCase() === 'advanced' ? 'advanced' : 'intermediate',
    };
  }

  function isDailyQuestStage() {
    // build812: daily判定をstage metadataだけに依存させない。
    // 古い/不整合なshooting_stages.jsが読み込まれてdailyQuest metadataが欠けても、
    // stage id自体がdailyなら必ずDAILYとして扱う。これでRETRY露出・finish RPC未実行を防ぐ。
    return !!((selectedStage && selectedStage.dailyQuest) || getDailyQuestStageIdentity());
  }

  function getDailyQuestConfig() {
    if (selectedStage && selectedStage.dailyQuest) return selectedStage.dailyQuest;

    // metadata欠落時の安全フォールバック。
    // 報酬の正本はfinish_daily_quest_run側なので、ここでは判定に必要な最小情報だけ復元する。
    const identity = getDailyQuestStageIdentity();
    if (!identity) return null;
    const weekdayMap = { mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun' };
    return {
      weekday: weekdayMap[identity.weekdayKey] || '',
      level: identity.level,
      rewardId: '',
      rewardPool: [],
      rewardCount: identity.level === 'advanced' ? 2 : 1,
    };
  }

  function isNoahStage() {
    return !!(selectedStage && selectedStage.id === SHOOTING_STAGE_ID.BULLET_HELL_TEST);
  }

  function isAmbushStage() {
    return !!(selectedStage && selectedStage.eventId === 'random_ambush' && selectedStage.ambush);
  }

  function getAmbushConfig() {
    return isAmbushStage() ? selectedStage.ambush : null;
  }

  function getAmbushWaveHp(wave) {
    const cfg = getAmbushConfig();
    const values = cfg && Array.isArray(cfg.waveHp) ? cfg.waveHp : [5000, 8000];
    return Math.max(1, Number(values[Math.max(0, Number(wave || 1) - 1)] || values[0] || 5000));
  }

  function getAmbushWaveDamage(wave) {
    const cfg = getAmbushConfig();
    const values = cfg && Array.isArray(cfg.waveDamage) ? cfg.waveDamage : [350, 600];
    return Math.max(1, Number(values[Math.max(0, Number(wave || 1) - 1)] || values[0] || 350));
  }

  function getScoreAttackComboMultiplier(comboValue) {
    const combo = Math.max(0, Number(comboValue || 0));
    if (combo >= 300) return 3.0;
    if (combo >= 200) return 2.5;
    if (combo >= 100) return 2.0;
    if (combo >= 50) return 1.5;
    if (combo >= 20) return 1.2;
    return 1.0;
  }

  function addScoreAttackDamageScore(damage) {
    if (!state || !isScoreAttackStage()) return false;
    const dealt = Math.max(0, Number(damage || 0));
    if (!dealt) return true;
    const multiplier = getScoreAttackComboMultiplier(state.combo || 0);
    state.score += Math.round(dealt * 100 * multiplier);
    state.scoreAttackDamageTotal = Math.max(0, Number(state.scoreAttackDamageTotal || 0) + dealt);
    return true;
  }

  function resetScoreAttackComboOnDamage() {
    if (!state || !isScoreAttackStage()) return;
    state.combo = 0;
    state.lastComboHitAt = 0;
    pulseCombo(true);
  }

  function updateScoreAttackMovementScore(now) {
    if (!state || !isScoreAttackStage() || !state.player) return;

    const x = Number(state.player.x || 0);
    const y = Number(state.player.y || 0);

    if (!Number.isFinite(state.scoreAttackLastMoveX) || !Number.isFinite(state.scoreAttackLastMoveY)) {
      state.scoreAttackLastMoveX = x;
      state.scoreAttackLastMoveY = y;
      state.scoreAttackMoveWindowStartedAt = now;
      state.scoreAttackMoveWindowScore = 0;
      return;
    }

    const dx = x - state.scoreAttackLastMoveX;
    const dy = y - state.scoreAttackLastMoveY;
    state.scoreAttackLastMoveX = x;
    state.scoreAttackLastMoveY = y;

    const distance = Math.hypot(dx, dy);
    // 2px未満の微小なブレはスコア対象外。
    if (distance < 2) return;

    const windowMs = 1000;
    if (!Number.isFinite(state.scoreAttackMoveWindowStartedAt) || now - state.scoreAttackMoveWindowStartedAt >= windowMs) {
      state.scoreAttackMoveWindowStartedAt = now;
      state.scoreAttackMoveWindowScore = 0;
    }

    // 1px = 10点。ただし1秒あたり2500点を上限にして
    // 小刻みな往復だけで過剰に稼げないようにする。
    const raw = Math.round(distance * 10);
    const remaining = Math.max(0, 2500 - Number(state.scoreAttackMoveWindowScore || 0));
    const add = Math.min(raw, remaining);
    if (add > 0) {
      state.score += add;
      state.scoreAttackMoveWindowScore = Number(state.scoreAttackMoveWindowScore || 0) + add;
      state.scoreAttackMoveDistance = Number(state.scoreAttackMoveDistance || 0) + distance;
    }
  }

  function getStageBulletQuantityMultiplier() {
    const value = Number(selectedStage && selectedStage.bulletQuantityMultiplier);
    let quantity = Number.isFinite(value) && value > 0 ? Math.min(1, value) : 1;

    // CH04-2 HARD（通常版。BEGINNERではない方）のみ弾幕量を10%軽減。
    // 発射後に弾を間引かず、発射間隔側で調整するので軽い。
    const stageId = String(selectedStage && selectedStage.id || '');
    const isChapter42Hard =
      isSelectedBaseStage(SHOOTING_STAGE_ID.CH04_02) &&
      !stageId.startsWith('shooting_beginner_');

    if (isChapter42Hard) quantity *= 0.90;
    return Math.max(0.05, Math.min(1, quantity));
  }

  // 初級は弾を生成後に削除せず、発射間隔を伸ばして時間あたり弾量を調整する。
  // multiplier=0.60 → intervalを約1.667倍 → 弾量40%減。
  function getStageAdjustedEnemyFireInterval(intervalMs) {
    const base = Math.max(1, Number(intervalMs || 1));
    const quantity = getStageBulletQuantityMultiplier();
    return quantity < 1 ? base / quantity : base;
  }


  // build840: 端末サイズによる敵弾難易度差を抑える。
  // iPhone SE(375x667)でHUD/FOOTER各72pxを除いた 375x523 を基準戦闘領域とする。
  // 見た目・HUD・敵/味方配置はレスポンシブのまま維持し、
  // 敵弾の「画面を横断する時間」だけを基準端末へ揃える。
  const SHOOTING_REFERENCE_ARENA_WIDTH = 375;
  const SHOOTING_REFERENCE_ARENA_HEIGHT = 523;

  function getEnemyProjectileViewportScale(width, height) {
    const w = Math.max(1, Number(width || SHOOTING_REFERENCE_ARENA_WIDTH));
    const h = Math.max(1, Number(height || SHOOTING_REFERENCE_ARENA_HEIGHT));
    return {
      x: clamp(w / SHOOTING_REFERENCE_ARENA_WIDTH, 0.72, 1.45),
      y: clamp(h / SHOOTING_REFERENCE_ARENA_HEIGHT, 0.72, 1.70),
    };
  }

  // build841: STAGE PATTERN DETERMINISM
  // 戦闘難易度に関わる「乱数」をステージID + ボレー/出現番号から固定生成する。
  // 同じステージ・同じ出現順なら、端末や再挑戦に関係なく同じ値を返す。
  // 報酬抽選・ガチャ・キャラ固有スキルのランダム性には使用しない。
  function getFixedStagePatternKey() {
    return String(
      (selectedStage && (selectedStage.baseStageId || selectedStage.id)) ||
      selectedStageId ||
      'shooting_stage'
    );
  }

  function hashFixedStagePattern(value) {
    const str = String(value || '');
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    // final avalanche
    h ^= h >>> 16;
    h = Math.imul(h, 2246822507) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 3266489909) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }

  function fixedStagePatternRandom(label, index = 0, salt = 0) {
    const key = `${getFixedStagePatternKey()}|${String(label || 'pattern')}|${Number(index || 0)}|${Number(salt || 0)}`;
    return hashFixedStagePattern(key) / 4294967296;
  }

  function getBattleTimeLimitSeconds() {
    if (!selectedStage) return 0;
    const explicit = Number(selectedStage.timeLimitSeconds || 0);
    if (explicit > 0) return explicit;
    if (isRaidStage()) {
      const raidLimit = Number(selectedStage.raid?.timeLimitSeconds || 0);
      if (raidLimit > 0) return raidLimit;
    }
    const mission = selectedStage.mission || {};
    if (mission.type === SHOOTING_MISSION_TYPE.CLEAR_TIME || mission.type === SHOOTING_MISSION_TYPE.SURVIVE_TIME) {
      return Math.max(0, Number(mission.targetSeconds || 0));
    }
    return 0;
  }

  function getBattleTimeLeft(now) {
    const limit = getBattleTimeLimitSeconds();
    if (!limit || !state) return 0;
    return Math.max(0, limit - (Number(now || performance.now()) - Number(state.startedAt || performance.now())) / 1000);
  }

  function formatBattleTimer(seconds) {
    const safe = Math.max(0, Number(seconds || 0));
    const whole = Math.ceil(safe);
    const min = Math.floor(whole / 60);
    const sec = whole % 60;
    return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  function updateBattleTimer(now) {
    const wrap = document.getElementById('shooting-battle-timer');
    const value = document.getElementById('shooting-battle-timer-value');
    if (!wrap || !value) return;
    const limit = getBattleTimeLimitSeconds();
    const visible = !!(limit > 0 && state && !state.ended && !state.countdown);
    wrap.classList.toggle('show', visible);
    wrap.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (!visible) return;
    const left = getBattleTimeLeft(now);
    value.textContent = formatBattleTimer(left);
    wrap.classList.toggle('is-warning', left <= 30 && left > 10);
    wrap.classList.toggle('is-danger', left <= 10);
  }

  function beginSurvivalStageClear(now = performance.now()) {
    if (!state || state.ended || state.finishing) return;
    if (isNormalBattle()) {
      beginNormalStageClear();
      return;
    }
    state.finishing = true;
    state.running = false;
    cancelAnimationFrame(rafId);

    // CLEAR演出へ入った時点でCH04-2の壁を解除する。
    updateChapter4ShrinkWalls(now);
    clearEnemyBulletsOnly();
    updateScoreAttackMovementScore(now);
    renderHud();
    showStageClearSequence(() => {
      if (!state || state.ended) return;
      state.finishing = false;
      endGame(true);
    });
  }

  function removeChapter4ItemOverlay() {
    if (!state) return;
    const overlay = state.chapter4ItemOverlay;
    if (overlay && overlay.isConnected) {
      overlay.classList.remove('show');
      overlay.style.display = 'none';
    }
    state.chapter4ItemOverlay = overlay && overlay.isConnected ? overlay : null;
  }

  function purgeChapter4ItemDom() {
    document.querySelectorAll(
      '.shooting-ch04-final-item,.shooting-ch04-item-beam,.shooting-ch04-item-guide,.shooting-ch04-item-alert'
    ).forEach(el => el.remove());
  }

  function clearChapter4FinalItem() {
    if (!state) {
      purgeChapter4ItemDom();
      return;
    }
    const item = state.chapter4FinalItem;
    if (item && item.el && item.el.isConnected) item.el.remove();
    state.chapter4FinalItem = null;
    state.chapter4ItemDeadlineAt = 0;
    removeChapter4ItemOverlay();
  }

  function prepareChapter4ItemOverlay() {
    if (!state || !isChapter04Stage()) return null;
    let overlay = state.chapter4ItemOverlay;
    if (overlay && overlay.isConnected) return overlay;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;
    overlay = arena.querySelector('.shooting-ch04-item-alert');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'shooting-ch04-item-alert';
      overlay.innerHTML = '<strong>ITEMを取得しろ！</strong><small>10秒以内に回収</small><b>10</b>';
      overlay.style.display = 'none';
      arena.appendChild(overlay);
    }
    state.chapter4ItemOverlay = overlay;
    return overlay;
  }

  function updateChapter4ItemOverlay(now) {
    if (!state || !state.chapter4ItemPhase) return;
    const overlay = prepareChapter4ItemOverlay();
    if (!overlay) return;
    if (overlay.style.display === 'none') {
      overlay.style.display = '';
      overlay.classList.add('show');
    }
    const leftMs = Math.max(0, Number(state.chapter4ItemDeadlineAt || 0) - Number(now || performance.now()));
    const count = Math.max(1, Math.ceil(leftMs / 1000));
    const num = overlay.querySelector('b');
    if (num) num.textContent = String(count);
  }

  function spawnChapter4FinalItem(now) {
    if (!state || !isChapter04Stage() || state.chapter4ItemPhase) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    // iOS/PWAではタイマー切替の瞬間にclientWidth/clientHeightが一時的に0を返すことがある。
    // ITEM座標決定では実表示サイズ(getBoundingClientRect)を優先し、0px座標への誤配置を防ぐ。
    const arenaRect = arena.getBoundingClientRect();
    const w = Math.max(1, Number(arenaRect.width || arena.clientWidth || 360));
    const h = Math.max(1, Number(arenaRect.height || arena.clientHeight || 640));
    const shrink = getChapter4ShrinkBounds(now, w);
    const left = 48 + Number(shrink.left || 0);
    const right = Math.max(left + 20, w - 48 - Number(shrink.right || 0));
    const top = 105;
    const bottom = Math.max(top + 20, h * 0.62);

    // ITEMはボスの現在位置を基準に、その周囲7候補のいずれかへ出現。
    // ただし端へ寄りすぎないよう、安全領域内の候補だけを抽選する。
    // ITEM出現時だけDOM実座標を1回取得する。
    // state.boss座標ではなく「画面に実際に描画されているボス中心」を最優先にする。
    const bossElForItem = document.getElementById(BOSS_ID);
    const bossRectForItem = bossElForItem ? bossElForItem.getBoundingClientRect() : null;
    const bx = bossRectForItem && bossRectForItem.width > 0
      ? (bossRectForItem.left + bossRectForItem.width * 0.5 - arenaRect.left)
      : Number(state.boss?.x || w * 0.5);
    const by = bossRectForItem && bossRectForItem.height > 0
      ? (bossRectForItem.top + bossRectForItem.height * 0.5 - arenaRect.top)
      : Number(state.boss?.y || h * 0.16);
    const itemHalf = 18;
    let safeLeft = Math.min(right, left + itemHalf + 26);
    let safeRight = Math.max(safeLeft, right - itemHalf - 26);
    const safeTop = Math.min(bottom, top + itemHalf + 20);
    const safeBottom = Math.max(safeTop, bottom - itemHalf - 20);

    // CH04-2は60秒時点で左右の壁が大きく迫っているため、
    // 通常の壁マージンだけでは安全領域が潰れてITEMが壁際に見えることがある。
    // ITEM中心を画面中央寄り(約42%〜58%)へ追加制限して、
    // 72〜76px級のITEM本体まで含めて壁から十分離して見えるようにする。
    if (selectedStage && isSelectedBaseStage(SHOOTING_STAGE_ID.CH04_02)) {
      const centerSafeLeft = w * 0.42;
      const centerSafeRight = w * 0.58;
      safeLeft = Math.max(safeLeft, centerSafeLeft);
      safeRight = Math.min(safeRight, centerSafeRight);
      if (safeRight < safeLeft) {
        const centerX = w * 0.5;
        safeLeft = centerX;
        safeRight = centerX;
      }
    }
    let x;
    let y;
    if (selectedStage && isSelectedBaseStage(SHOOTING_STAGE_ID.CH04_02)) {
      // CH04-2: 「画面上のボス中心」の真下へ固定。
      // 左右壁の実表示幅も参照し、ITEM本体(72px)が壁へ入らない位置にだけ補正する。
      const leftWallEl = arena.querySelector('.shooting-ch04-shrink-wall.left');
      const rightWallEl = arena.querySelector('.shooting-ch04-shrink-wall.right');
      const leftWallRect = leftWallEl && leftWallEl.style.display !== 'none'
        ? leftWallEl.getBoundingClientRect() : null;
      const rightWallRect = rightWallEl && rightWallEl.style.display !== 'none'
        ? rightWallEl.getBoundingClientRect() : null;

      const actualLeftInset = leftWallRect && leftWallRect.width > 0
        ? Math.max(0, leftWallRect.right - arenaRect.left)
        : Number(shrink.left || 0);
      const actualRightInset = rightWallRect && rightWallRect.width > 0
        ? Math.max(0, arenaRect.right - rightWallRect.left)
        : Number(shrink.right || 0);

      const itemMargin = itemHalf + 12;
      const laneSafeLeft = actualLeftInset + itemMargin;
      const laneSafeRight = Math.max(laneSafeLeft, w - actualRightInset - itemMargin);

      // 原則ボスXそのまま。壁に入る場合だけ最小限補正。
      x = clamp(bx, laneSafeLeft, laneSafeRight);

      // ボスの約96px下。縦方向のみ取得しやすさのため安全域へclamp。
      y = clamp(by + 70, safeTop, safeBottom);
    } else {
      const offsets = [
        [-92, 0], [92, 0],
        [-72, 64], [72, 64],
        [0, 86],
        [-66, -54], [66, -54]
      ];
      const candidates = offsets
        .map(([ox, oy]) => ({ x: bx + ox, y: by + oy }))
        .filter(pos => pos.x >= safeLeft && pos.x <= safeRight && pos.y >= safeTop && pos.y <= safeBottom);
      const fallback = { x: clamp(bx, safeLeft, safeRight), y: clamp(by + 86, safeTop, safeBottom) };
      const pick = candidates.length
        ? candidates[Math.floor(fixedStagePatternRandom('ch04_final_item', 0, 0) * candidates.length)]
        : fallback;
      x = clamp(pick.x, safeLeft, safeRight);
      y = clamp(pick.y, safeTop, safeBottom);
    }

    // ITEMフェーズへ移行しても弾幕は止めない。
    // 60秒生存後は、継続する弾幕を潜りながらITEMを回収するゲーム性にする。
    state.chapter4ItemPhase = true;

    // 専用CSSの読込状態に依存しないよう、ITEM本体の最低限の見た目をinlineで保証。
    // 追加DOMは作らず、この1要素だけで大きく明るく表示する。
    const el = document.createElement('div');
    el.className = 'shooting-mission-item shooting-ch04-final-item';
    el.innerHTML = '<i></i>';
    Object.assign(el.style, {
      width: '36px',
      height: '36px',
      zIndex: '140',
      border: '3px solid rgba(211,190,255,1)',
      background: 'radial-gradient(circle, rgba(255,255,255,1) 0 14%, rgba(214,196,255,1) 20% 38%, rgba(132,82,235,.98) 44% 62%, rgba(76,126,255,.72) 66% 74%, rgba(92,61,220,0) 82%)',
      boxShadow: '0 0 14px rgba(255,255,255,1), 0 0 30px rgba(176,126,255,1), 0 0 54px rgba(112,79,238,.98), 0 0 76px rgba(73,133,255,.82)',
      opacity: '1',
      animation: 'shootingCh04ItemPulseV153 .72s ease-in-out infinite alternate'
    });
    arena.appendChild(el);
    positionUnit(el, x, y);

    state.chapter4FinalItem = { el, x, y };
    const timeoutSeconds = Math.max(1, Number(selectedStage?.finalItem?.timeoutSeconds || 10));
    state.chapter4ItemDeadlineAt = Number(now || performance.now()) + timeoutSeconds * 1000;
    updateChapter4ItemOverlay(now);
  }

  // 開発確認用: CH04-2を60秒到達状態にしてITEMを即出現させる。
  // UIからは呼ばれず、コンソールから明示実行した時だけ動く。
  window.debugChapter42ItemNow = function () {
    if (!state || !selectedStage || !isSelectedBaseStage(SHOOTING_STAGE_ID.CH04_02)) {
      console.warn('[CH04-2 DEBUG] CHAPTER04-2を開いて戦闘開始後に実行してください');
      return false;
    }
    const now = performance.now();
    state.startedAt = now - 60000;
    state.countdown = false;
    state.running = true;
    state.ended = false;
    state.finishing = false;
    updateChapter4ShrinkWalls(now);
    clearChapter4FinalItem();
    purgeChapter4ItemDom();
    state.chapter4ItemPhase = false;
    spawnChapter4FinalItem(now);
    console.info('[CH04-2 DEBUG] 60秒時点の壁 + ITEMを即時再現しました');
    return true;
  };

  function updateChapter4FinalItem(now) {
    if (!state || !state.chapter4ItemPhase || !state.chapter4FinalItem) return;
    updateChapter4ItemOverlay(now);

    const item = state.chapter4FinalItem;
    const core = document.getElementById('shooting-player-core');
    if (item.el && core && rectsHit(item.el.getBoundingClientRect(), core.getBoundingClientRect(), -5, -3)) {
      state.collectedItems = Math.max(1, Number(state.collectedItems || 0) + 1);
      state.score += 1500;
      state.missionComplete = true;
      clearChapter4FinalItem();
      beginSurvivalStageClear();
      return;
    }

    if (Number(now || performance.now()) >= Number(state.chapter4ItemDeadlineAt || 0)) {
      state.missionFailed = true;
      clearChapter4FinalItem();
      endGame(false);
    }
  }

  function clearChapter43RestoreItem() {
    if (!state) return;
    if (state.chapter43RestoreItem?.el) state.chapter43RestoreItem.el.remove();
    state.chapter43RestoreItem = null;
  }

  function ensureChapter43SealCountdown() {
    if (!state || !isChapter43BossStage()) return null;
    if (state.chapter43SealCountdownEl?.isConnected) return state.chapter43SealCountdownEl;

    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;

    const el = document.createElement('div');
    el.className = 'shooting-ch43-seal-countdown';
    Object.assign(el.style, {
      position:'absolute',
      left:'50%',
      top:'25%',
      transform:'translate(-50%,-50%)',
      zIndex:'92',
      minWidth:'240px',
      padding:'8px 14px',
      textAlign:'center',
      color:'#6f5630',
      background:'rgba(255,251,241,.86)',
      border:'1px solid rgba(151,113,54,.36)',
      boxShadow:'0 4px 18px rgba(70,48,20,.14)',
      fontFamily:'"Noto Serif JP",serif',
      fontSize:'16px',
      fontWeight:'700',
      letterSpacing:'.06em',
      pointerEvents:'none',
      whiteSpace:'nowrap'
    });
    arena.appendChild(el);
    state.chapter43SealCountdownEl = el;
    return el;
  }

  function clearChapter43SealCountdown() {
    if (!state) return;
    if (state.chapter43SealCountdownEl) state.chapter43SealCountdownEl.remove();
    state.chapter43SealCountdownEl = null;
  }

  function clearChapter43Countdown() {
    if (!state) return;
    if (state.chapter43CountdownEl) state.chapter43CountdownEl.remove();
    state.chapter43CountdownEl = null;
  }

  function clearPlayerBulletsOnly() {
    if (!state) return;
    (state.bullets || []).forEach(p => p?.el?.remove());
    state.bullets = [];
  }

  function spawnChapter43RestoreItem() {
    if (!state || !isChapter43BossStage() || state.chapter43RestoreItemSpawned) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const el = document.createElement('div');
    el.className = 'shooting-mission-item shooting-ch04-final-item shooting-ch43-restore-item';
    el.innerHTML = '<i></i>';
    Object.assign(el.style, { width:'36px', height:'36px', zIndex:'145', pointerEvents:'none' });

    const x = Number(state.boss?.x || arena.clientWidth * .5);
    const y = clamp(Number(state.boss?.y || arena.clientHeight * .18) + 74, 90, arena.clientHeight * .58);
    arena.appendChild(el);
    positionUnit(el, x, y);

    state.chapter43RestoreItem = { el, x, y };
    state.chapter43RestoreItemSpawned = true;
    showShootingItemEffectNotice('ITEMを取得しろ！', 'SHOT / ULT を取り戻せ');
  }

  function updateChapter43RestoreItem() {
    if (!state?.chapter43RestoreItem || !state.chapter43AttackSealed) return;
    const item = state.chapter43RestoreItem;
    const coreEl = document.getElementById('shooting-player-core') || document.getElementById(PLAYER_ID);
    if (!item.el?.isConnected || !coreEl) return;

    if (rectsHit(item.el.getBoundingClientRect(), coreEl.getBoundingClientRect(), -4, -3)) {
      clearChapter43RestoreItem();
      clearChapter43SealCountdown();
      state.chapter43AttackSealed = false;
      state.chapter43SealHp = 0;
      state.lastShotAt = -9999;
      showShootingItemEffectNotice('SHOT / ULT 復活', '攻撃を再開せよ');
      renderHud();
    }
  }

  function ensureChapter43Countdown() {
    if (!state || !isChapter43BossStage()) return null;
    if (state.chapter43CountdownEl?.isConnected) return state.chapter43CountdownEl;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;
    const el = document.createElement('div');
    el.className = 'shooting-ch43-countdown';
    Object.assign(el.style, {
      position:'absolute', left:'50%', top:'18%', transform:'translate(-50%,-50%)',
      zIndex:'85', color:'#fff3ce', fontSize:'28px', fontWeight:'900',
      letterSpacing:'.08em', textShadow:'0 0 8px rgba(255,190,70,.85),0 2px 4px rgba(0,0,0,.75)',
      pointerEvents:'none', whiteSpace:'nowrap'
    });
    arena.appendChild(el);
    state.chapter43CountdownEl = el;
    return el;
  }

  function startChapter43Wave1Seal(now) {
    const cfg = getChapter43Config();
    if (!state || !cfg || state.chapter43Wave1SealTriggered) return;
    state.chapter43Wave1SealTriggered = true;
    state.chapter43AttackSealed = true;
    state.chapter43SealHp = Number(state.boss.hp || 0);
    state.chapter43DodgeEndsAt = now + Number(cfg.dodgeSeconds || 20) * 1000;
    state.chapter43RestoreItemSpawned = false;
    clearPlayerBulletsOnly();
    const sealCountdownEl = ensureChapter43SealCountdown();
    if (sealCountdownEl) sealCountdownEl.textContent = `攻撃封印中　残り${Math.ceil(Number(cfg.dodgeSeconds || 20))}秒`;
    showShootingItemEffectNotice('SHOT / ULT 封印', `${Number(cfg.dodgeSeconds || 20)}秒間 回避せよ`);
  }

  function startChapter43Wave2Countdown(now) {
    const cfg = getChapter43Config();
    if (!state || !cfg || state.chapter43Wave2CountdownTriggered) return;
    state.chapter43Wave2CountdownTriggered = true;
    state.chapter43CollapseStartedAt = now;
    state.chapter43CollapseDeadlineAt = now + Number(cfg.collapseSeconds || 45) * 1000;
    ensureChapter43Countdown();
    showShootingItemEffectNotice('45秒以内に倒しきれ', '壁が迫る');
    updateChapter4ShrinkWalls(now);
  }

  function updateChapter43Mechanics(now) {
    if (!state || !isChapter43BossStage() || state.ended || state.finishing || !state.boss || state.boss.hp <= 0) return;
    const cfg = getChapter43Config();
    if (!cfg) return;

    const phase = Math.max(1, Number(state.boss.phase || 1));
    const localHp = getChapter43WaveCurrentHp();
    const localMaxHp = getChapter43WaveMaxHp(phase);
    const localRatio = localHp / Math.max(1, localMaxHp);

    if (phase === 1 && !state.chapter43Wave1SealTriggered && localRatio <= Number(cfg.wave1SealRatio || .5)) {
      startChapter43Wave1Seal(now);
    }

    if (state.chapter43AttackSealed && Number(state.chapter43SealHp || 0) > 0) {
      state.boss.hp = Number(state.chapter43SealHp);

      const sealLeftMs = Math.max(0, Number(state.chapter43DodgeEndsAt || 0) - now);
      const sealCountdownEl = ensureChapter43SealCountdown();
      if (sealCountdownEl) {
        if (!state.chapter43RestoreItemSpawned) {
          sealCountdownEl.textContent = `攻撃封印中　残り${Math.ceil(sealLeftMs / 1000)}秒`;
        } else {
          sealCountdownEl.textContent = '攻撃封印中　ITEMを取得しろ！';
        }
      }

      if (sealLeftMs <= 0 && !state.chapter43RestoreItemSpawned) {
        spawnChapter43RestoreItem();
      }
      updateChapter43RestoreItem();
    }

    if (phase === 2 && !state.chapter43Wave2CountdownTriggered && localRatio <= Number(cfg.wave2CountdownRatio || .5)) {
      startChapter43Wave2Countdown(now);
    }

    if (state.chapter43Wave2CountdownTriggered) {
      const left = Math.max(0, Number(state.chapter43CollapseDeadlineAt || 0) - now);
      const el = ensureChapter43Countdown();
      if (el) el.textContent = `LIMIT ${Math.ceil(left / 1000)}`;
      if (left <= 0 && state.boss.hp > 0) {
        state.missionFailed = true;
        clearChapter43Countdown();
        endGame(false);
      }
    }
  }

  function fireChapter43TenWay(now) {
    if (!state || !BOSS || !isChapter43BossStage()) return;
    const cfg = getChapter43Config();
    if (!cfg) return;

    if (!state.chapter43RhythmNextAt) state.chapter43RhythmNextAt = now + 500;
    if (now < state.chapter43RhythmNextAt) return;

    const step = Math.max(0, Number(state.chapter43RhythmStep || 0));
    const ways = Math.max(2, Number(cfg.ways || 10));
    const spread = Math.max(.2, Number(cfg.spreadRad || 1.34));
    const aimedAngle = Math.atan2(state.player.y - state.boss.y, state.player.x - state.boss.x);

    // 毎回同じ10WAYの軌道をなぞると固定安置ができるため、
    // fan全体の向き・各弾角度・速度を小さくランダム化する。
    // 4拍/8拍というリズムと10WAYの本数自体は維持する。
    const volleyIndex = Number(state.chapter43VolleyIndex || 0);
    state.chapter43VolleyIndex = volleyIndex + 1;
    const fanDrift = (fixedStagePatternRandom('ch43_fan_drift', volleyIndex, 0) - .5) * 0.34;
    const beatSwing = Math.sin((step + 1) * 1.73) * 0.055;
    const baseAngle = aimedAngle + fanDrift + beatSwing;
    const baseSpeed = Math.max(145, Number(BOSS.bulletSpeed || 190));

    for (let i = 0; i < ways; i++) {
      const t = i / (ways - 1);
      const angleJitter = (fixedStagePatternRandom('ch43_angle', volleyIndex, i) - .5) * 0.095;
      const a = baseAngle + (t - .5) * spread + angleJitter;
      const speed = baseSpeed * (0.88 + fixedStagePatternRandom('ch43_speed', volleyIndex, i) * 0.24);
      const spawnJitterX = (fixedStagePatternRandom('ch43_spawn_x', volleyIndex, i) - .5) * 18;
      const p = makeProjectile(
        'shooting-enemy-bullet shooting-sakiel-bullet shooting-beautiful-bullet',
        state.boss.x + spawnJitterX, state.boss.y + 38,
        Math.cos(a) * speed, Math.sin(a) * speed,
        BOSS.bulletDamage
      );
      if (p) {
        p.canvasKind = 'ch04';
        state.enemyBullets.push(p);
      }
    }

    const slow = Number(cfg.slowBeats || 4);
    const fast = Number(cfg.fastBeats || 8);
    const cycle = slow + fast;
    let delay = step < slow ? Number(cfg.slowBeatMs || 520) : Number(cfg.fastBeatMs || 235);
    if (step === cycle - 1) delay += Number(cfg.cyclePauseMs || 520);
    state.chapter43RhythmStep = (step + 1) % cycle;
    state.chapter43RhythmNextAt = now + Math.max(90, delay);
  }

  function checkBattleTimeLimit(now) {
    const limit = getBattleTimeLimitSeconds();
    if (!limit || !state || state.ended || state.finishing || state.countdown) return false;
    if (state.chapter4ItemPhase) return false;
    if (getBattleTimeLeft(now) > 0) return false;
    const mission = state.mission || {};
    if (mission.type === SHOOTING_MISSION_TYPE.SURVIVE_TIME) {
      if (isChapter04Stage() && selectedStage?.finalItem) {
        spawnChapter4FinalItem(now);
        return false;
      }
      state.missionComplete = true;
      beginSurvivalStageClear(now);
      return true;
    }
    state.missionFailed = true;
    endGame(false);
    return true;
  }

  function getRaidStartingHp() {
    const remoteHp = Number(selectedRaidContext && selectedRaidContext.currentHp);
    if (Number.isFinite(remoteHp) && remoteHp > 0) return remoteHp;
    return Number(selectedStage && selectedStage.raid && selectedStage.raid.maxHp) || 100000;
  }

  function isStoryShootingStage() {
    return !!(
      selectedStage &&
      /^shooting_(?:beginner_)?ch\d{2}_\d{2}$/i.test(String(selectedStage.id || ''))
    );
  }

  function isChapter04Stage() {
    return !!(selectedStage && /^shooting_(?:beginner_)?ch04_0[1-3]$/i.test(String(selectedStage.id || '')));
  }

  function isHorizontalControlReversed() {
    return !!(selectedStage && selectedStage.reverseHorizontalControls);
  }

  function isChapter43BossStage() {
    return !!(selectedStage && isSelectedBaseStage(SHOOTING_STAGE_ID.CH04_03) && selectedStage.chapter43Boss);
  }

  function getChapter43Config() {
    return isChapter43BossStage() ? selectedStage.chapter43Boss : null;
  }

  function getChapter43WaveMaxHp(wave) {
    const cfg = getChapter43Config();
    const values = cfg && Array.isArray(cfg.waveHp) ? cfg.waveHp : [4000, 6000];
    const index = Math.max(0, Math.min(values.length - 1, Number(wave || 1) - 1));
    return Math.max(1, Number(values[index] || (index === 0 ? 4000 : 6000)));
  }

  function getChapter43WaveCurrentHp() {
    if (!state?.boss || !isChapter43BossStage()) return 0;
    const phase = Math.max(1, Math.min(2, Number(state.boss.phase || 1)));
    if (phase === 1) {
      return clamp(Number(state.boss.hp || 0) - getChapter43WaveMaxHp(2), 0, getChapter43WaveMaxHp(1));
    }
    return clamp(Number(state.boss.hp || 0), 0, getChapter43WaveMaxHp(2));
  }

  function isChapter04BossStage() {
    return !!(selectedStage && isChapter04Stage() && (selectedStage.survivalBoss || selectedStage.chapter43Boss));
  }

  function ensureStoryEriLeader() {
    if (!isStoryShootingStage()) return;
    // CH04-1/2は従来どおりエリ単独。CH04-3はエリ固定 + 最大2人追加。
    if (isChapter04Stage() && !isChapter43BossStage()) {
      selectedPartyIds = isShootingCharacterOwned(CHARACTER_ID.ERI) ? [Number(CHARACTER_ID.ERI)] : [];
      return;
    }
    selectedPartyIds = selectedPartyIds.filter(id => Number(id) !== Number(CHARACTER_ID.ERI));
    if (isShootingCharacterOwned(CHARACTER_ID.ERI)) {
      selectedPartyIds.unshift(Number(CHARACTER_ID.ERI));
    }
    selectedPartyIds = selectedPartyIds.slice(0, PARTY_SIZE);
  }

  function isShootingPartyReady() {
    if (selectedPartyIds.length < 1 || selectedPartyIds.length > PARTY_SIZE) return false;
    if (!selectedPartyIds.every(isShootingCharacterOwned)) return false;
    if (isChapter04Stage() && !isChapter43BossStage()) {
      return selectedPartyIds.length === 1 && Number(selectedPartyIds[0]) === Number(CHARACTER_ID.ERI);
    }
    if (isStoryShootingStage()) {
      return Number(selectedPartyIds[0]) === Number(CHARACTER_ID.ERI);
    }
    return true;
  }

  function getFacelessConfig() {
    return isFacelessStage() ? selectedStage.faceless : null;
  }

  function getFacelessWaveHp(wave) {
    const cfg = getFacelessConfig();
    const values = cfg && Array.isArray(cfg.waveHp) ? cfg.waveHp : [7600, 19000];
    return Number(values[Math.max(0, Number(wave || 1) - 1)] || 7600);
  }

  function getFacelessObjectHp() {
    return Number(getFacelessConfig()?.objectHp || 950);
  }
  let BOSS = getCurrentShootingEnemy();

  function refreshShootingRoster() {
    const roster = document.querySelector('.shooting-party-roster');
    if (!roster) return;
    roster.innerHTML = getShootingRosterHtml();

    // 非公開キャラクターは、ShootingCharacters側に定義が残っていても表示しない。
    HIDDEN_SHOOTING_CHARACTER_IDS.forEach(id => {
      roster.querySelectorAll('[data-character-id="' + id + '"]').forEach(el => el.remove());
    });

    selectedPartyIds = selectedPartyIds.filter(id =>
      isPublicShootingCharacterId(id) && isShootingCharacterOwned(id)
    );
  }

  let selectedCharacterId = CHARACTER_ID.ERI;
  let selectedPartyIds = [];
  let selectedBlessingId = null; // UI selection only. Shooting effects are not wired yet.
  let selectedRaidContext = null; // DAILY RAID: Supabaseで確定した当日の共有HP/attempt情報

  const SHOOTING_UI_LAYOUT_STORAGE_KEY = 'zeraphia_shooting_ui_layout_type';
  let shootingUiLayoutType = 1;

  // Stage high score: local cache + Supabase RPC.
  // The local cache keeps the UI usable even before the SQL patch is applied.
  const SHOOTING_HIGH_SCORE_STORAGE_KEY = 'zeraphia_shooting_high_scores_v1';
  let selectedStageHighScore = 0;

  function getShootingUserId() {
    try {
      return String(window.localStorage.getItem('zukan_user_id') || '').trim().toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function readLocalShootingHighScores() {
    try {
      const raw = window.localStorage.getItem(SHOOTING_HIGH_SCORE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeLocalShootingHighScore(stageId, score) {
    if (!stageId) return;
    const map = readLocalShootingHighScores();
    const next = Math.max(Number(map[stageId] || 0), Math.max(0, Number(score || 0)));
    map[stageId] = next;
    try { window.localStorage.setItem(SHOOTING_HIGH_SCORE_STORAGE_KEY, JSON.stringify(map)); } catch (_) {}
  }

  function getLocalShootingHighScore(stageId) {
    return Math.max(0, Number(readLocalShootingHighScores()[stageId] || 0));
  }

  function formatShootingScore(value) {
    return String(Math.max(0, Math.floor(Number(value || 0)))).padStart(6, '0');
  }

  function setShootingStageHeader(inBattle) {
    const title = document.getElementById('shooting-hud-stage-title');
    const difficulty = document.getElementById('shooting-hud-difficulty');
    const kicker = document.getElementById('shooting-hud-kicker');
    const score = document.getElementById('shooting-score');

    const isSpecialEvent = !!selectedStage?.eventId;
    // STORYでは内部マスターの固有名（朝・呼吸・邂逅・旅立ち等）をヘッダーに出さない。
    // ステージ選択画面と表記を揃え、「ステージ1〜4」で統一する。
    const stageTitle = isSpecialEvent
      ? (selectedStage?.eventTitle || selectedStage?.name || BOSS?.displayName || BOSS?.name || 'STAGE')
      : `ステージ${Number(selectedStage?.stageNo || 1)}`;
    const difficultyLabel = isSpecialEvent ? (selectedStage?.difficultyLabel || '') : '';

    if (kicker) kicker.textContent = isSpecialEvent ? 'SPECIAL EVENT' : `CHAPTER ${String(selectedStage?.chapter || 1).padStart(2, '0')}`;
    if (title) {
      // Keep the difficulty badge node while replacing the title text.
      title.childNodes.forEach(node => { if (node.nodeType === Node.TEXT_NODE) node.remove(); });
      title.insertBefore(document.createTextNode(stageTitle + (difficultyLabel ? ' ' : '')), title.firstChild);
    }
    if (difficulty) {
      difficulty.textContent = difficultyLabel ? `― ${difficultyLabel} ―` : '';
      difficulty.style.display = difficultyLabel ? 'inline' : 'none';
    }
    if (score) {
      if (inBattle) {
        if (isRaidStage() && state?.boss) {
          const raidHp = Math.max(0, Math.floor(Number(state.boss.hp || 0)));
          const raidMaxHp = Math.max(1, Math.floor(Number(state.boss.hpMax || selectedRaidContext?.maxHp || 100000)));
          score.textContent = `HP ${raidHp.toLocaleString('ja-JP')} / ${raidMaxHp.toLocaleString('ja-JP')}`;
        } else {
          score.textContent = `SCORE ${formatShootingScore(state?.score || 0)}`;
        }
      } else {
        score.innerHTML = `<span class="shooting-high-score-label">HIGH SCORE</span><strong class="shooting-high-score-value">${formatShootingScore(selectedStageHighScore)}</strong>`;
      }
      score.classList.toggle('is-high-score', !inBattle);
    }
  }

  async function loadShootingHighScore() {
    const stageId = selectedStage?.id || '';
    if (!stageId) return 0;

    selectedStageHighScore = getLocalShootingHighScore(stageId);
    setShootingStageHeader(false);

    const sb = window.zsSupabase;
    const userId = getShootingUserId();
    if (!sb || typeof sb.rpc !== 'function' || !userId) return selectedStageHighScore;

    try {
      const result = await sb.rpc('get_shooting_high_score', {
        p_user_id: userId,
        p_stage_id: stageId
      });
      if (result?.error) throw result.error;
      const cloudScore = Math.max(0, Number(result?.data || 0));
      selectedStageHighScore = Math.max(selectedStageHighScore, cloudScore);
      writeLocalShootingHighScore(stageId, selectedStageHighScore);
      const root = document.getElementById(ROOT_ID);
      if (root && !root.classList.contains('battle-hud-visible')) setShootingStageHeader(false);
    } catch (err) {
      console.warn('[shooting] high score load skipped:', err?.message || err);
    }
    return selectedStageHighScore;
  }

  // v172: result submission is bound to one server-issued run token.
  // The server verifies account ownership, stage, elapsed time and token reuse,
  // then consumes the run. A retry therefore requires a fresh run token.
  async function submitShootingHighScore(value, win = false) {
    const stageId = selectedStage?.id || state?.stageId || '';
    const scoreValue = Math.max(0, Math.floor(Number(value || 0)));
    if (!stageId) return null;

    // Local display remains responsive; cloud ranking is server-confirmed below.
    if (scoreValue > getLocalShootingHighScore(stageId)) writeLocalShootingHighScore(stageId, scoreValue);
    selectedStageHighScore = Math.max(selectedStageHighScore, scoreValue);

    const sb = window.zsSupabase;
    const userId = getShootingUserId();
    if (!sb || typeof sb.rpc !== 'function' || !userId) return null;

    try {
      const runToken = (state && state.secureRunToken) || await beginSecureShootingRun();
      if (!runToken) throw new Error('secure shooting run token is unavailable');

      const result = await sb.rpc('finish_secure_shooting_run', {
        p_user_id: userId,
        p_run_token: runToken,
        p_score: scoreValue,
        p_win: !!win
      });
      if (result?.error) throw result.error;

      const row = Array.isArray(result?.data) ? result.data[0] : result?.data;
      const cloudScore = Math.max(0, Number(row?.high_score || 0));
      selectedStageHighScore = Math.max(selectedStageHighScore, cloudScore);
      writeLocalShootingHighScore(stageId, selectedStageHighScore);

      const gem = Number(row?.gem);
      if (Number.isFinite(gem) && window.userProfile) {
        window.userProfile.gem = Math.max(0, gem);
      }

      // v287: EXP/coin are server-authoritative.
      // finish RPC成功後、DBの確定プロフィールを読み直してHUDへ反映する。
      try {
        const profileRes = await sb
          .from('user_profiles')
          .select('total_score,rank,coin,gem')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileRes?.error) throw profileRes.error;
        const profile = profileRes?.data;
        if (profile && window.userProfile) {
          if (Number.isFinite(Number(profile.total_score))) {
            window.userProfile.total_score = Math.max(0, Number(profile.total_score));
          }
          if (Number.isFinite(Number(profile.rank))) {
            window.userProfile.rank = Math.max(1, Number(profile.rank));
          }
          if (Number.isFinite(Number(profile.coin))) {
            window.userProfile.coin = Math.max(0, Number(profile.coin));
          }
          if (Number.isFinite(Number(profile.gem))) {
            window.userProfile.gem = Math.max(0, Number(profile.gem));
          }
        }
      } catch (profileErr) {
        console.warn('[shooting reward] profile refresh skipped:', profileErr?.message || profileErr);
      }

      if (typeof window.refreshProfileHud === 'function') {
        window.refreshProfileHud();
      } else if (typeof window.updateMainUI === 'function') {
        window.updateMainUI();
      }
      if (typeof window.updateSummonGemUI === 'function') window.updateSummonGemUI();

      // build896: server decides whether this finalized run produced 神樹の栄養.
      // The client no longer creates Shinju EXP/items by itself.
      let shinjuRewardExp = 0;
      if (win) {
        try {
          const shinjuRes = await sb.rpc('finalize_shinju_shooting_reward', {
            p_run_token: runToken
          });
          if (shinjuRes && shinjuRes.error) throw shinjuRes.error;
          let shinjuData = shinjuRes ? shinjuRes.data : null;
          if (typeof shinjuData === 'string') {
            try { shinjuData = JSON.parse(shinjuData); } catch (_) {}
          }
          shinjuRewardExp = Math.max(0, Number(shinjuData && shinjuData.reward_exp || 0));
          if (window.ShinjuProgress && typeof window.ShinjuProgress.refreshFromServer === 'function') {
            await window.ShinjuProgress.refreshFromServer();
          }
        } catch (shinjuErr) {
          console.warn('[shooting reward] Shinju server reward finalize failed:', shinjuErr?.message || shinjuErr);
        }
      }

      return {
        highScore: cloudScore,
        firstClearClaimed: !!row?.first_clear_claimed,
        firstClearAmount: Math.max(0, Number(row?.first_clear_amount || 0)),
        gem: Number.isFinite(gem) ? Math.max(0, gem) : null,
        shinjuRewardExp
      };
    } catch (err) {
      console.warn('[shooting] secure result save skipped:', err?.message || err);
      return null;
    }
  }

  // ============================================================
  // Character usage analytics
  // 「誰が / どのキャラを / 何回編成して出撃したか」をSupabaseへ集計保存。
  // 1バトル開始につき、編成中の各キャラを1回ずつ加算する。
  // RETRYは新しい出撃として再加算。中断復帰(resume)では再加算しない。
  // ============================================================
  async function recordShootingCharacterUsage(characterIds, stageId) {
    const ids = Array.from(new Set(
      (Array.isArray(characterIds) ? characterIds : [])
        .map(Number)
        .filter(id => Number.isInteger(id) && id > 0 && isPublicShootingCharacterId(id) && !!SHOOTING_CHARACTERS[id])
    ));
    if (!ids.length) return false;

    const sb = window.zsSupabase;
    const userId = getShootingUserId();
    if (!sb || typeof sb.rpc !== 'function' || !userId) return false;

    try {
      const result = await sb.rpc('record_shooting_character_usage', {
        p_user_id: userId,
        p_stage_id: String(stageId || ''),
        p_character_ids: ids
      });
      if (result?.error) throw result.error;
      return true;
    } catch (err) {
      // 統計保存失敗でゲーム開始自体を止めない。
      console.warn('[shooting] character usage save skipped:', err?.message || err);
      return false;
    }
  }

  function normalizeShootingUiLayoutType(value) {
    return Number(value) === 2 ? 2 : 1;
  }

  function loadShootingUiLayoutType() {
    try {
      return normalizeShootingUiLayoutType(window.localStorage.getItem(SHOOTING_UI_LAYOUT_STORAGE_KEY));
    } catch (_) {
      return 1;
    }
  }

  function saveShootingUiLayoutType(type) {
    try {
      window.localStorage.setItem(SHOOTING_UI_LAYOUT_STORAGE_KEY, String(normalizeShootingUiLayoutType(type)));
    } catch (_) {}
  }

  function applyShootingUiLayout(type) {
    shootingUiLayoutType = normalizeShootingUiLayoutType(type);
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.classList.remove('ui-type-1', 'ui-type-2');
    root.classList.add(`ui-type-${shootingUiLayoutType}`);
    const label = document.getElementById('shooting-ui-layout-label');
    if (label) label.textContent = 'UI切替';
    const toggleBtn = document.getElementById('shooting-ui-layout-btn');
    if (toggleBtn) {
      const nextType = shootingUiLayoutType === 1 ? 2 : 1;
      toggleBtn.setAttribute('data-ui-type', String(shootingUiLayoutType));
      toggleBtn.setAttribute('aria-label', `UI表示切替 現在タイプ${shootingUiLayoutType} / タップでタイプ${nextType}`);
      toggleBtn.title = `UI切替（現在 TYPE ${shootingUiLayoutType}）`;
    }
  }

  window.toggleShootingUiLayout = function () {
    const nextType = shootingUiLayoutType === 1 ? 2 : 1;
    applyShootingUiLayout(nextType);
    saveShootingUiLayoutType(nextType);
  };

  shootingUiLayoutType = loadShootingUiLayoutType();

  function getShootingResonanceLevel(id) {
    try {
      const owned = typeof getOwnedShootingInstance === 'function'
        ? getOwnedShootingInstance(Number(id))
        : null;
      return Math.max(0, Number(
        owned && (owned.limitBreak != null ? owned.limitBreak : owned.limit_break) || 0
      ));
    } catch (_) {
      return 0;
    }
  }

  function buildResonatedCharacterProfile(id) {
    const numericId = Number(id);
    const base = SHOOTING_CHARACTERS[numericId] || SHOOTING_CHARACTERS[CHARACTER_ID.ERI];
    const lb = getShootingResonanceLevel(numericId);
    let profile = base;

    if (typeof window.applyShootingResonanceToProfile === 'function') {
      profile = window.applyShootingResonanceToProfile(base, lb) || base;
    } else if (window.ShootingResonance && typeof window.ShootingResonance.applyToProfile === 'function') {
      profile = window.ShootingResonance.applyToProfile(base, lb) || base;
    }

    // レベル育成は共鳴適用後のHP/ATKへ乗せる。
    // 弾速・移動速度・射撃間隔などには影響させない。
    try {
      const owned = typeof getOwnedShootingInstance === 'function'
        ? getOwnedShootingInstance(numericId)
        : null;
      const level = Math.max(1, Number(owned && (owned.characterLevel != null ? owned.characterLevel : owned.character_level) || 1));
      const rarity = (owned && owned.rarity) || profile.rarity || base.rarity || 'r';
      if (window.CharacterLeveling && typeof window.CharacterLeveling.applyToProfile === 'function') {
        profile = window.CharacterLeveling.applyToProfile(profile, rarity, lb, level) || profile;
      }
    } catch (_) {}

    // 神聖樹の加護は、共鳴・レベル育成をすべて解決した後の最終補正として適用する。
    // HP SLOT / ATK SLOT の対象キャラにのみ反映。
    try {
      if (window.ShinjuProgress && typeof window.ShinjuProgress.applyBlessingToProfile === 'function') {
        profile = window.ShinjuProgress.applyBlessingToProfile(profile, numericId) || profile;
      }
    } catch (err) {
      console.warn('[shooting] shinju blessing profile skipped:', err);
    }

    return profile;
  }

  function getBattleCharacter(id) {
    const numericId = Number(id);
    if (state && state.characterProfiles && state.characterProfiles[numericId]) {
      return state.characterProfiles[numericId];
    }
    return buildResonatedCharacterProfile(numericId);
  }

  function getCurrentCharacter() {
    const id = state && state.activeCharacterId ? state.activeCharacterId : selectedCharacterId;
    return getBattleCharacter(id);
  }

  function getActiveMember() {
    if (!state || !Array.isArray(state.party)) return null;
    return state.party.find(m => Number(m.id) === Number(state.activeCharacterId)) || state.party[0] || null;
  }

  function getPartyMember(id) {
    if (!state || !Array.isArray(state.party)) return null;
    return state.party.find(m => Number(m.id) === Number(id)) || null;
  }

  let state = null;
  let rafId = 0;
  let countdownMoveRafId = 0;

  // ============================================================
  // Shooting battle resume / crash recovery
  // ============================================================
  const SHOOTING_RESUME_KEY = 'sasaphia_shooting_resume_v1';
  const SHOOTING_RESUME_VERSION = '20260816-resume-v1';
  const SHOOTING_RESUME_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  let suppressShootingResumeSave = false;

  function getRemainingMs(until, now) {
    return Math.max(0, Number(until || 0) - Number(now || performance.now()));
  }

  function buildShootingResumeSnapshot(reason) {
    if (!state || state.ended || state.finishing) return null;
    // 編成画面だけ開いている状態は「戦闘途中」ではないので保存しない。
    if (!state.running && !state.countdown && !state.paused) return null;

    // HP0になった瞬間～交代演出中にアプリが落ちても、
    // HP0キャラを操作キャラとして復元しない。
    const livingParty = Array.isArray(state.party)
      ? state.party.filter(m => m && Number(m.hp || 0) > 0)
      : [];
    if (!livingParty.length) return null;

    const currentActive = state.party.find(m => Number(m.id) === Number(state.activeCharacterId));
    const resumeActiveId = currentActive && Number(currentActive.hp || 0) > 0
      ? Number(currentActive.id)
      : Number(livingParty[0].id);

    const now = performance.now();
    const elapsedMs = state.countdown
      ? Math.max(0, Number(state.resumeElapsedMsPending || 0))
      : Math.max(0, now - Number(state.startedAt || now));

    return {
      version: SHOOTING_RESUME_VERSION,
      savedAt: Date.now(),
      reason: String(reason || ''),
      stageId: String(state.stageId || selectedStage?.id || ''),
      raidContext: selectedRaidContext ? { ...selectedRaidContext } : null,
      returnContext: window.__shootingReturnContext ? { ...window.__shootingReturnContext } : null,
      scoreAttackAttempt: (isScoreAttackStage() && window.ScoreAttack && typeof window.ScoreAttack.getResumeAttempt === 'function')
        ? window.ScoreAttack.getResumeAttempt()
        : null,
      selectedPartyIds: state.party.map(m => Number(m.id)),
      selectedCharacterId: resumeActiveId,
      selectedBlessingId: selectedBlessingId || null,
      elapsedMs,
      player: { x: Number(state.player?.x || 0), y: Number(state.player?.y || 0) },
      party: state.party.map(m => ({
        id: Number(m.id),
        hp: Number(m.hp || 0),
        hpMax: Number(m.hpMax || 0),
        burst: Number(m.burst || 0),
        hitCount: Number(m.hitCount || 0),
        ultUseCount: Number(m.ultUseCount || 0),
        invincibleLeftMs: getRemainingMs(m.invincibleUntil, now),
        atkBuffLeftMs: getRemainingMs(m.atkBuffUntil, now),
        atkBuffMultiplier: Number(m.atkBuffMultiplier || 1.3),
      })),
      boss: state.boss ? {
        hp: Number(state.boss.hp || 0),
        hpMax: Number(state.boss.hpMax || 0),
        gaugeHp: Number(state.boss.gaugeHp || 0),
        gauges: Number(state.boss.gauges || 1),
        phase: Number(state.boss.phase || 1),
      } : null,
      score: Number(state.score || 0),
      shotsHit: Number(state.shotsHit || 0),
      combo: Number(state.combo || 0),
      maxCombo: Number(state.maxCombo || 0),
      collectedItems: Number(state.collectedItems || 0),
      totalHitsTaken: Number(state.totalHitsTaken || 0),
      normalDefeated: Number(state.normalDefeated || 0),
      normalSpawned: Number(state.normalSpawned || 0),
      facelessWave: Number(state.facelessWave || 0),
      raidInitialHp: Number(state.raidInitialHp || 0),
      raidDamageDealt: Number(state.raidDamageDealt || 0),
    };
  }

  function saveShootingResumeState(reason) {
    if (suppressShootingResumeSave) return false;
    try {
      const noLivingParty = !!(
        state &&
        Array.isArray(state.party) &&
        state.party.length &&
        state.party.every(m => !m || Number(m.hp || 0) <= 0)
      );

      // 全滅/RESULT移行が確定した時点で、過去のresumeも即破棄する。
      // 「保存しない」だけだと直前の古いsnapshotが残り、再起動時に復活できてしまう。
      if (state && (state.ended || state.finishing || noLivingParty)) {
        clearShootingResumeState();
        return false;
      }

      const snapshot = buildShootingResumeSnapshot(reason);
      if (!snapshot) return false;
      localStorage.setItem(SHOOTING_RESUME_KEY, JSON.stringify(snapshot));
      return true;
    } catch (err) {
      console.warn('[shooting] resume save failed', err);
      return false;
    }
  }

  function clearShootingResumeState() {
    try { localStorage.removeItem(SHOOTING_RESUME_KEY); } catch (_) {}
  }

  function readShootingResumeState() {
    try {
      const raw = localStorage.getItem(SHOOTING_RESUME_KEY);
      if (!raw) return null;
      const snapshot = JSON.parse(raw);
      if (!snapshot || snapshot.version !== SHOOTING_RESUME_VERSION || !snapshot.stageId) {
        clearShootingResumeState();
        return null;
      }
      if (Date.now() - Number(snapshot.savedAt || 0) > SHOOTING_RESUME_MAX_AGE_MS) {
        clearShootingResumeState();
        return null;
      }
      return snapshot;
    } catch (_) {
      clearShootingResumeState();
      return null;
    }
  }

  function applyShootingResumeSnapshot(snapshot) {
    if (!snapshot || !state) return false;
    const now = performance.now();

    selectedPartyIds = Array.isArray(snapshot.selectedPartyIds)
      ? snapshot.selectedPartyIds.map(Number).filter(id => SHOOTING_CHARACTERS[id] && isShootingCharacterOwned(id)).slice(0, PARTY_SIZE)
      : [];
    if (isStoryShootingStage()) ensureStoryEriLeader();
    if (!selectedPartyIds.length) return false;

    selectedCharacterId = selectedPartyIds.includes(Number(snapshot.selectedCharacterId))
      ? Number(snapshot.selectedCharacterId)
      : selectedPartyIds[0];
    selectedBlessingId = snapshot.selectedBlessingId || null;

    // SCORE ATTACKは戦闘開始時のサーバーattemptをそのまま復元する。
    // 新しいattemptを再開時/終了時に作り直すと、経過時間検証と不整合になる。
    if (isScoreAttackStage()) {
      const restored = !!(
        window.ScoreAttack &&
        typeof window.ScoreAttack.restoreAttemptFromResume === 'function' &&
        window.ScoreAttack.restoreAttemptFromResume(snapshot.scoreAttackAttempt || null, snapshot.stageId, selectedPartyIds)
      );
      if (!restored) {
        console.error('[ScoreAttack] resume blocked: original attempt could not be restored');
        if (typeof window.showToast === 'function') window.showToast('スコアアタックの中断データを復元できませんでした');
        clearShootingResumeState();
        return false;
      }
    }

    // 現行マスター/共鳴値でstateの骨格を作り直してから、保存値だけ重ねる。
    resetState();
    state.activeCharacterId = selectedCharacterId;
    state.resumeElapsedMsPending = Math.max(0, Number(snapshot.elapsedMs || 0));
    state.score = Math.max(0, Number(snapshot.score || 0));
    state.shotsHit = Math.max(0, Number(snapshot.shotsHit || 0));
    state.combo = Math.max(0, Number(snapshot.combo || 0));
    state.maxCombo = Math.max(state.combo, Number(snapshot.maxCombo || 0));
    state.collectedItems = Math.max(0, Number(snapshot.collectedItems || 0));
    state.totalHitsTaken = Math.max(0, Number(snapshot.totalHitsTaken || 0));
    state.normalDefeated = Math.max(0, Number(snapshot.normalDefeated || 0));
    // 画面上の敵は安全のため復元しない。倒した数を起点に残り敵を再スポーンする。
    state.normalSpawned = state.normalDefeated;
    state.facelessWave = Math.max(state.facelessWave || 0, Number(snapshot.facelessWave || 0));

    if (snapshot.boss && state.boss) {
      state.boss.hp = Math.max(0, Math.min(Number(snapshot.boss.hpMax || state.boss.hpMax), Number(snapshot.boss.hp || 0)));
      state.boss.hpMax = Math.max(1, Number(snapshot.boss.hpMax || state.boss.hpMax));
      state.boss.gaugeHp = Math.max(1, Number(snapshot.boss.gaugeHp || state.boss.gaugeHp));
      state.boss.gauges = Math.max(1, Number(snapshot.boss.gauges || state.boss.gauges));
      state.boss.phase = Math.max(1, Math.min(state.boss.gauges, Number(snapshot.boss.phase || 1)));
    }

    if (isRaidStage()) {
      state.raidInitialHp = Math.max(Number(snapshot.raidInitialHp || 0), Number(state.boss?.hp || 0));
      state.raidDamageDealt = Math.max(0, Number(snapshot.raidDamageDealt || 0));
      state.raidAttemptFinished = false;
    }

    const savedParty = new Map((snapshot.party || []).map(m => [Number(m.id), m]));
    state.party.forEach(member => {
      const saved = savedParty.get(Number(member.id));
      if (!saved) return;
      member.hpMax = Math.max(1, Number(saved.hpMax || member.hpMax));
      member.hp = Math.max(0, Math.min(member.hpMax, Number(saved.hp || 0)));
      member.burst = Math.max(0, Number(saved.burst || 0));
      member.hitCount = Math.max(0, Number(saved.hitCount || 0));
      member.ultUseCount = Math.max(0, Number(saved.ultUseCount || 0));
      if (Number(saved.invincibleLeftMs || 0) > 0) member.invincibleUntil = now + Number(saved.invincibleLeftMs);
      if (Number(saved.atkBuffLeftMs || 0) > 0) {
        member.atkBuffUntil = now + Number(saved.atkBuffLeftMs);
        member.atkBuffMultiplier = Number(saved.atkBuffMultiplier || 1.3);
      }
    });

    // 復元時の最終防衛。
    // 保存データが旧版/破損/KO直後のものでも、HP0キャラをactiveにしない。
    const livingParty = state.party.filter(m => m && Number(m.hp || 0) > 0);
    if (!livingParty.length) {
      clearShootingResumeState();
      return false;
    }
    const restoredActive = livingParty.find(m => Number(m.id) === Number(selectedCharacterId)) || livingParty[0];
    selectedCharacterId = Number(restoredActive.id);
    state.activeCharacterId = selectedCharacterId;
    state.koTransition = false;

    applySelectedCharacterToUi();
    clearProjectiles();
    clearChapter4FinalItem();
    clearNormalBattleObjects();
    setCharacterSelectVisible(false);
    setBattleHudVisible(true);
    setShootingHeaderMenuMode(true);
    ensureShootingPauseMenu();

    const root = document.getElementById(ROOT_ID);
    if (root) root.setAttribute('data-boss-phase', String(state.boss?.phase || 1));
    placeInitialUnits();
    if (snapshot.player && state.player) {
      const arena = document.getElementById('shooting-arena');
      const w = arena?.clientWidth || 360;
      const h = arena?.clientHeight || 640;
      state.player.x = clamp(Number(snapshot.player.x || w * .5), 24, Math.max(24, w - 24));
      state.player.y = clamp(Number(snapshot.player.y || h * .82), 40, Math.max(40, h - 40));
      positionUnit(document.getElementById(PLAYER_ID), state.player.x, state.player.y);
    }
    renderHud();

    // 保存データは再開開始後も更新される。再開中に再度落ちても続きから戻れる。
    runStartCountdown();
    return true;
  }

  function tryRestoreShootingBattle() {
    const snapshot = readShootingResumeState();
    if (!snapshot) return false;
    // すでにシューティング画面を開いている場合は自動介入しない。
    if (document.getElementById(ROOT_ID)?.classList.contains('open')) return false;

    const label = snapshot.raidContext ? '中断したDAILY RAIDがあります。\n途中から再開しますか？' : '中断したバトルがあります。\n途中から再開しますか？';
    if (!window.confirm(label)) {
      // 「いいえ」を選んだ中断データは明示的に破棄する。
      // 残したままだと次回起動時にも同じ再開確認が繰り返し表示される。
      clearShootingResumeState();
      return false;
    }

    window.__shootingReturnContext = snapshot.returnContext || (snapshot.raidContext ? { type: 'raidLobby' } : null);
    window.openShootingEvent({
      stageId: snapshot.stageId,
      raidContext: snapshot.raidContext || null,
      resumeSnapshot: snapshot,
    });
    return true;
  }

  // ハードクラッシュ対策としてpagehideだけに頼らず、戦闘中は定期保存する。
  setInterval(() => saveShootingResumeState('interval'), 1500);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveShootingResumeState('visibilitychange');
  });
  window.addEventListener('pagehide', () => saveShootingResumeState('pagehide'));

  window.saveShootingResumeState = saveShootingResumeState;
  window.clearShootingResumeState = clearShootingResumeState;
  let prevTs = 0;
  let keys = Object.create(null);
  let pointerActive = false;
  let pointerIsTouch = false;
  let activePointerId = null;
  let pointerX = 0;
  let pointerY = 0;
  let dragStartClientX = 0;
  let dragStartClientY = 0;
  let dragStartPlayerX = 0;
  let dragStartPlayerY = 0;
  let lastPointerClientX = 0;
  let lastPointerClientY = 0;
  let lastTapAt = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeStartAt = 0;

  // v182: iOS Safari PointerEvent断線対策
  let nativeTouchActive = false;
  let activeTouchIdentifier = null;

  // v446: iPhone/PWAの一瞬のtouchcancel・Pointer/Touch二重入力を吸収する。
  // Touch Eventsを実タッチの正とし、Pointer Eventsは補助に回す。
  let nativeTouchCancelTimer = null;
  let nativeTouchCancelToken = 0;
  let lastNativeTouchMoveAt = 0;

  // build597: iOS/PWAでTouch Eventsが一時的にcancelされた後も、
  // Pointer Eventsが継続して届いている場合はそちらへ一時退避する。
  // Touchが復帰したら自動でTouch Eventsへ戻す。
  let nativeTouchPointerFallback = false;
  // build551: iOS/PWAでは重いフレーム直後に一時的なtouchcancelが来ることがある。
  // 140msだと1回のLong Taskで猶予を超えやすいため、操作復帰を待つ時間を少し拡張。
  // touchendは従来どおり即終了するので、通常の離指レスポンスには影響しない。
  const TOUCH_CANCEL_GRACE_MS = 240;
  const TOUCH_FOLLOW_RESPONSE = 90;

  // build551: touchmove / pointermove のたびにgetBoundingClientRect()を読まない。
  // arenaの矩形は戦闘開始・resize/orientationchange時だけ更新し、
  // iOSの高頻度touchmoveでは数値キャッシュだけを参照する。
  let cachedArenaInputRect = null;
  let cachedArenaInputEl = null;

  function invalidateArenaInputRect() {
    cachedArenaInputRect = null;
    cachedArenaInputEl = null;
  }

  function refreshArenaInputRect(force = false) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) {
      invalidateArenaInputRect();
      return null;
    }
    if (!force && cachedArenaInputRect && cachedArenaInputEl === arena) {
      return cachedArenaInputRect;
    }
    const r = arena.getBoundingClientRect();
    cachedArenaInputEl = arena;
    cachedArenaInputRect = {
      left: Number(r.left || 0),
      top: Number(r.top || 0),
      right: Number(r.right || 0),
      bottom: Number(r.bottom || 0),
      width: Number(r.width || arena.clientWidth || 0),
      height: Number(r.height || arena.clientHeight || 0)
    };
    return cachedArenaInputRect;
  }

  function getArenaInputRect() {
    return (cachedArenaInputRect && cachedArenaInputEl === document.getElementById('shooting-arena'))
      ? cachedArenaInputRect
      : refreshArenaInputRect(true);
  }

  const SWITCH_SWIPE_MIN_X = 78;
  const SWITCH_SWIPE_MAX_MS = 260;
  const SWITCH_SWIPE_AXIS_RATIO = 1.45;
  const ULT_DOUBLE_TAP_MS = 320;
  const ULT_DOUBLE_TAP_DISTANCE = 72;

  // ============================================================
  // Performance safety guard
  // ============================================================
  // 通常プレイの弾幕量・難易度には一切干渉しない。
  // DOM敵弾が異常な数まで積み上がった場合だけ、端末フリーズを避けるため
  // 古い「通常敵弾」を整理する最後の安全装置。WARNING系の危険弾は保護する。
  const ENEMY_BULLET_HARD_LIMIT = 520;
  const ENEMY_BULLET_RECOVERY_TARGET = 460;

  // CH03-4 (REMNANT 03) はwave2以降の弾幕密度が高く、iPhone/PWAで
  // 大きい自機弾や演出が重なるとWebKitが落ちるケースがある。
  // 見た目を崩さない範囲でphaseごとに通常敵弾の上限を絞る。
  const CH03_04_ENEMY_BULLET_LIMITS = Object.freeze({
    1: Object.freeze({ hard: 260, recovery: 220 }),
    2: Object.freeze({ hard: 120, recovery: 90 }),
    3: Object.freeze({ hard: 110, recovery: 82 }),
  });

  function isChapter03BossStage() {
    return !!(selectedStage && String(selectedStage.id || '') === 'shooting_ch03_04');
  }

  function getChapter03BossEnemyBulletLimits() {
    const phase = Math.max(1, Math.min(3, Number(state && state.boss && state.boss.phase || 1)));
    return CH03_04_ENEMY_BULLET_LIMITS[phase] || CH03_04_ENEMY_BULLET_LIMITS[1];
  }

  // DAILY RAIDだけは長時間戦になるため、DOM敵弾を段階別に制限する。
  // WARNING / danger系はこの制限対象外。
  // phase2以降はスマホ/PWAのフリーズ・強制終了回避を優先。
  const RAID_ENEMY_BULLET_LIMITS = Object.freeze({
    1: Object.freeze({ soft: 220, hard: 270, recovery: 230 }),
    2: Object.freeze({ soft: 170, hard: 205, recovery: 175 }),
    3: Object.freeze({ soft: 150, hard: 185, recovery: 155 }),
  });

  function getRaidEnemyBulletLimits() {
    const phase = Math.max(
      1,
      Math.min(3, Number(state && state.boss && state.boss.phase || 1))
    );
    return RAID_ENEMY_BULLET_LIMITS[phase] || RAID_ENEMY_BULLET_LIMITS[1];
  }

  let lastEnemyBulletGuardLogAt = 0;

  // 自機弾側にも同じ安全装置を用意する。複数キャラの高速射撃が重なった場合の
  // 保険で、通常プレイのDPS/弾数バランスには影響しない値に設定している。
  // レイドはenemyBulletsと同じ考え方でフェーズが進むほど絞る。
  const PLAYER_BULLET_HARD_LIMIT = 400;
  const PLAYER_BULLET_RECOVERY_TARGET = 340;
  const RAID_PLAYER_BULLET_LIMITS = Object.freeze({
    1: Object.freeze({ hard: 300, recovery: 250 }),
    2: Object.freeze({ hard: 230, recovery: 190 }),
    3: Object.freeze({ hard: 200, recovery: 165 }),
  });

  function getRaidPlayerBulletLimits() {
    const phase = Math.max(
      1,
      Math.min(3, Number(state && state.boss && state.boss.phase || 1))
    );
    return RAID_PLAYER_BULLET_LIMITS[phase] || RAID_PLAYER_BULLET_LIMITS[1];
  }

  let lastPlayerBulletGuardLogAt = 0;

  function isTouchLikePointer(e) {
    return !!(
      e && (
        e.pointerType === 'touch' ||
        e.pointerType === 'pen' ||
        ((navigator.maxTouchPoints || 0) > 0 &&
         window.matchMedia &&
         window.matchMedia('(pointer: coarse)').matches)
      )
    );
  }

  // スマホ操作時、指がキャラクター(と被弾判定コア)を隠してしまう対策。
  // 指の実際の接地点より、キャラクターを上にずらして表示する。
  // マウス/ペン操作では正確な1:1追従のままにするため、touchの時だけ適用する。
  const TOUCH_Y_OFFSET = 50;

  // ULTゲージ獲得量の全体倍率。
  // 0.5 = 従来の約2倍の命中数が必要。
  // キャラごとの ultGainPerHit の相対差はそのまま維持する。
  const ULT_GAIN_GLOBAL_MULTIPLIER = 0.5;

  // build821: 全キャラ共通のULT回収20秒上限ガード。
  // 「理論上すべての通常ショットが命中する」条件で、満タンまで20秒を超えないよう
  // 1Hitあたりの最低ゲージ獲得量を自動算出する。既に速いキャラの値は変更しない。
  // CHARGEはMAXチャージ時間、LASER/LIGHTNINGは1tick=1Hit、その他の多弾はshotCount全弾命中で計算。
  const ULT_THEORETICAL_MAX_SECONDS = 20;

  function getUltGainAmountPerHit(c) {
    if (!c) return 0;
    if (window.ShootingCharacters && typeof window.ShootingCharacters.getShootingUltGainPerHitEffective === 'function') {
      return Math.max(0, Number(window.ShootingCharacters.getShootingUltGainPerHitEffective(c) || 0));
    }
    const baseGain = Number.isFinite(c.ultGainPerHit) ? Number(c.ultGainPerHit) : 1;
    let gain = baseGain * ULT_GAIN_GLOBAL_MULTIPLIER;

    const shotType = String(c.shotType || '');
    const shotCount = Math.max(1, Math.floor(Number(c.shotCount || 1)));
    const burstNeed = Math.max(1, Number(c.burstNeed || 30));

    let cycleMs = Math.max(0, Number(c.fireRate || 0));
    let expectedHitsPerCycle = shotCount;

    if (shotType === 'charge') {
      cycleMs = Math.max(1, Number(c.chargeMaxMs || 1000));
      expectedHitsPerCycle = 1;
    } else if (shotType === 'laser' || shotType === 'lightning') {
      expectedHitsPerCycle = 1;
    } else if (
      shotType === 'piercing' ||
      shotType === 'shotgun' ||
      shotType === 'precision' ||
      shotType === 'strike' ||
      shotType === 'cluster' ||
      shotType === 'bomb'
    ) {
      expectedHitsPerCycle = 1;
    }

    if (cycleMs > 0 && expectedHitsPerCycle > 0) {
      const normalizedGain =
        burstNeed * cycleMs /
        (ULT_THEORETICAL_MAX_SECONDS * 1000 * expectedHitsPerCycle);
      gain = Math.max(gain, normalizedGain);
    }

    return Math.max(0, gain);
  }

  function grantUltGaugeForHits(c, hitCount = 1, ownerId = null, gainMultiplier = 1) {
    if (!state || !c || hitCount <= 0) return;
    if ((isChapter04Stage() && !isChapter43BossStage()) || state?.chapter43AttackSealed) return;

    const resolvedOwnerId = ownerId == null ? c.id : ownerId;
    const ownerMoonlightBlocked =
      Number(resolvedOwnerId) === CHARACTER_ID.HAYATE &&
      performance.now() < Number(state.hayateMoonlightUntil || 0);
    if (ownerMoonlightBlocked) return;

    const member = getPartyMember(resolvedOwnerId);
    if (!member) return;

    const safeGainMultiplier = Math.max(0, Number.isFinite(Number(gainMultiplier)) ? Number(gainMultiplier) : 1);
    const gain = getUltGainAmountPerHit(c) * Math.max(1, Number(hitCount || 1)) * safeGainMultiplier;
    const wasReady = member.burst >= c.burstNeed;
    member.burst = Math.min(c.burstNeed, member.burst + gain);
    if (!wasReady && member.burst >= c.burstNeed && !member.ultReadyNotified) {
      member.ultReadyNotified = true;
      if (Number(resolvedOwnerId) === Number(state.activeCharacterId)) {
        showShootingUltFullChargeNotice();
      }
    }
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function rectsHit(a, b, insetA, insetB) {
    const ia = insetA || 0;
    const ib = insetB || 0;
    return !(
      a.right - ia < b.left + ib ||
      a.left + ia > b.right - ib ||
      a.bottom - ia < b.top + ib ||
      a.top + ia > b.bottom - ib
    );
  }

  // ============================================================
  // パフォーマンス対策：当たり判定の脱DOM化
  // ============================================================
  // 弾・敵・デコイは元々 x/y をJS側の数値として持っており、DOMはそれを
  // 描画しているだけ(positionUnit)。にもかかわらず毎フレームの当たり判定で
  // el.getBoundingClientRect() を呼ぶと、弾の数×敵の数に比例して
  // 強制レイアウト計算が走り、弾幕が濃くなるほど重くなっていた。
  //
  // サイズ(幅/高さ)は生成時に一度だけ実測してキャッシュ(_hw/_hh)し、
  // 毎フレームは x/y の数値計算だけでrectsHitと同じ形の矩形を作る。
  // rectsHitはただの数値比較なので、DOM由来かどうかは問わない。
  function measureUnitSize(entry) {
    if (!entry || !entry.el) return;

    // Canvas描画の敵弾はDOMを持たないため、見た目と当たり判定のサイズを
    // 数値で固定する。getBoundingClientRect()を一切呼ばない。
    if (entry.canvasRendered) {
      entry._hw = Number(entry.canvasHalfWidth || 5.5);
      entry._hh = Number(entry.canvasHalfHeight || 5.5);
      return;
    }

    // SCORE ATTACK弾はCSSでサイズ固定。生成ごとのレイアウト計測を避ける。
    if (isScoreAttackStage() && entry.el.classList && entry.el.classList.contains('shooting-score-attack-bullet')) {
      const warning = entry.el.classList.contains('shooting-score-attack-warning-bullet');
      entry._hw = warning ? 15 : 7;
      entry._hh = warning ? 15 : 7;
      return;
    }

    const r = entry.el.getBoundingClientRect();
    entry._hw = r.width / 2;
    entry._hh = r.height / 2;
  }

  // arenaRectはフレーム内で使い回す(呼び出し側で1回だけ取得する想定)。
  // x/yはarena基準のローカル座標なので、getBoundingClientRect()と同じ
  // ビューポート座標系に変換してから比較できるようにする。
  // これにより、まだ数値化していない他の当たり判定(ボス等)ともそのまま混在できる。
  function getUnitRect(entry, arenaRect) {
    const hw = Number(entry && entry._hw) || 0;
    const hh = Number(entry && entry._hh) || 0;
    const x = arenaRect.left + Number(entry.x || 0);
    const y = arenaRect.top + Number(entry.y || 0);
    return { left: x - hw, right: x + hw, top: y - hh, bottom: y + hh };
  }

  // build567: FACELESSの仮面は「非貫通ショットを受け止める遮蔽物」として扱う。
  // 単純な現在座標の矩形衝突だけだと、高速弾が1フレームで仮面を跨いだ際に
  // BOSSまで到達してしまうことがあるため、前フレーム位置→現在位置の線分でも判定する。
  // Shotgunなど p.pierce=true の弾は従来どおり仮面を貫通できる。
  function segmentAabbEntryT(x0, y0, x1, y1, minX, maxX, minY, maxY) {
    let tMin = 0;
    let tMax = 1;
    const dx = x1 - x0;
    const dy = y1 - y0;

    const clipAxis = (start, delta, minV, maxV) => {
      if (Math.abs(delta) < 0.000001) {
        return start >= minV && start <= maxV;
      }
      let t1 = (minV - start) / delta;
      let t2 = (maxV - start) / delta;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      return tMin <= tMax;
    };

    if (!clipAxis(x0, dx, minX, maxX)) return null;
    if (!clipAxis(y0, dy, minY, maxY)) return null;
    return (tMax >= 0 && tMin <= 1) ? Math.max(0, tMin) : null;
  }

  function findFacelessMaskProjectileCollision(projectile, fromX, fromY, toX, toY) {
    if (!isFacelessStage() || !projectile || !Array.isArray(state?.facelessObjects)) return null;

    const bulletHalfW = Math.max(1, Number(projectile._hw || 4));
    const bulletHalfH = Math.max(1, Number(projectile._hh || 7));
    const maskHalf = 39; // CSS上の仮面は78x78
    const x0 = Number(fromX || 0);
    const y0 = Number(fromY || 0);
    const x1 = Number(toX || 0);
    const y1 = Number(toY || 0);
    let best = null;
    let bestT = Infinity;

    state.facelessObjects.forEach(obj => {
      if (!obj || !obj.el || obj.hp <= 0) return;
      if (projectile.pierce && projectile.piercedTargets && projectile.piercedTargets.has(obj)) return;

      const cx = Number(obj.x || 0);
      const cy = Number(obj.y || 0);
      const hitT = segmentAabbEntryT(
        x0, y0, x1, y1,
        cx - maskHalf - bulletHalfW, cx + maskHalf + bulletHalfW,
        cy - maskHalf - bulletHalfH, cy + maskHalf + bulletHalfH
      );

      if (hitT == null || hitT >= bestT) return;
      bestT = hitT;
      best = obj;
    });

    // build782: 「当たり判定はあるのに中央でしか光らない」見え方をやめる。
    // 線分衝突で求めた実際の接触点を保存し、HITリングを着弾位置に出す。
    if (best && Number.isFinite(bestT)) {
      best._lastProjectileImpactX = x0 + (x1 - x0) * bestT;
      best._lastProjectileImpactY = y0 + (y1 - y0) * bestT;
      best._lastProjectileImpactAt = performance.now();
    }

    return best;
  }

  // レイド直線レーザー専用の回転込み当たり判定。
  // 通常の矩形判定だと、270pxの棒を回転させても
  // 「横向き270pxの透明な矩形」のまま判定されてしまうため、
  // 見えている棒の線分とプレイヤーの赤コアが実際に重なった時だけ命中させる。
  function raidLaserHitsPlayerCore(projectile, playerCoreRect, arenaRect) {
    if (!projectile || !projectile.raidLaser || !playerCoreRect || !arenaRect) return false;

    const cx = arenaRect.left + Number(projectile.x || 0);
    const cy = arenaRect.top + Number(projectile.y || 0);
    const angle = Math.atan2(Number(projectile.vy || 0), Number(projectile.vx || 0));

    const halfLength = Math.max(1, Number(projectile._hw || 135));
    const halfThickness = Math.max(1, Number(projectile._hh || 2.5));

    const dx = Math.cos(angle) * halfLength;
    const dy = Math.sin(angle) * halfLength;
    const ax = cx - dx;
    const ay = cy - dy;
    const bx = cx + dx;
    const by = cy + dy;

    const px = (playerCoreRect.left + playerCoreRect.right) * 0.5;
    const py = (playerCoreRect.top + playerCoreRect.bottom) * 0.5;

    const abx = bx - ax;
    const aby = by - ay;
    const abLenSq = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / abLenSq));
    const nearestX = ax + abx * t;
    const nearestY = ay + aby * t;

    const distX = px - nearestX;
    const distY = py - nearestY;
    const distanceSq = distX * distX + distY * distY;

    // 赤コア自体の半径を加味。見た目上、棒がコアに触れた時だけヒット。
    const coreRadius = Math.max(
      1,
      Math.min(
        (playerCoreRect.right - playerCoreRect.left) * 0.5,
        (playerCoreRect.bottom - playerCoreRect.top) * 0.5
      )
    );
    const hitRadius = halfThickness + coreRadius;

    return distanceSq <= hitRadius * hitRadius;
  }

  function getShootingBlessingDefs() {
    const defs = Array.isArray(window.REMNANT_BLESSINGS) ? window.REMNANT_BLESSINGS : [];
    return defs.filter(Boolean).map((b, i) => ({
      id: String(b.id || b.remnantId || `blessing_${i + 1}`),
      name: String(b.name || b.blessingName || b.title || `加護 ${i + 1}`),
      img: b.panelImg || b.img || b.icon || '',
    }));
  }

  function getShootingPartySlotElementIconSrc(element) {
    const raw = Array.isArray(element) ? element[0] : element;
    const key = String(raw || 'neutral').trim().toLowerCase();
    const icons = {
      neutral: 'images/type_neutral.webp',
      aqua: 'images/type_aqua.webp',
      fire: 'images/type_fire.webp',
      wood: 'images/type_wood.webp',
      dark: 'images/type_dark.webp?v=572',
      light: 'images/type_light.webp',
    };
    return icons[key] || icons.neutral;
  }

  function getShootingPartySlotElementIconHtml(c) {
    if (!c || !c.element) return '';
    const src = getShootingPartySlotElementIconSrc(c.element);
    return src
      ? `<img class="shooting-party-slot-element-icon" src="${src}" alt="" aria-hidden="true" draggable="false">`
      : '';
  }

  function renderShootingPartySlots() {
    const wrap = document.getElementById('shooting-party-slots');
    if (!wrap) return;
    wrap.innerHTML = Array.from({ length: (isChapter04Stage() && !isChapter43BossStage()) ? 1 : PARTY_SIZE }, (_, i) => {
      const id = selectedPartyIds[i];
      if (!id) return `<button type="button" class="shooting-party-slot empty" aria-label="空きスロット"><span>${i + 1}</span><b>＋</b></button>`;
      const c = buildResonatedCharacterProfile(id);
      const fixedStoryEri =
        isStoryShootingStage() &&
        i === 0 &&
        Number(id) === Number(CHARACTER_ID.ERI);
      return fixedStoryEri
        ? `<button type="button" class="shooting-party-slot filled fixed" data-character-id="${id}" aria-label="${c.name}・ストーリー固定枠">
            ${getShootingPartySlotElementIconHtml(c)}
            <img src="${c.panelImage || c.image}" alt="${c.name}" draggable="false"><small>${c.name}</small>
          </button>`
        : `<button type="button" class="shooting-party-slot filled" data-character-id="${id}" onclick="removeShootingPartyCharacter(${id})" aria-label="${c.name}を外す">
            ${getShootingPartySlotElementIconHtml(c)}
            <img src="${c.panelImage || c.image}" alt="${c.name}" draggable="false"><small>${c.name}</small><i>×</i>
          </button>`;
    }).join('');
  }

  function renderShootingBlessingPicker() {
    const picker = document.getElementById('shooting-party-blessing-picker');
    const name = document.getElementById('shooting-party-blessing-name');
    if (!picker) return;
    const defs = getShootingBlessingDefs();
    const selected = defs.find(b => b.id === selectedBlessingId);
    if (name) name.textContent = selected ? selected.name : '加護を選択';
    const rows = [{ id: '', name: '加護なし', img: '' }, ...defs];
    picker.innerHTML = rows.map(b => `<button type="button" class="shooting-blessing-option ${String(selectedBlessingId || '') === b.id ? 'selected' : ''}" onclick="selectShootingBlessing('${b.id.replace(/'/g, "\\'")}')">
      ${b.img ? `<img src="${b.img}" alt="" draggable="false">` : '<span>＋</span>'}<b>${b.name}</b>
    </button>`).join('');
  }

  window.toggleShootingBlessingPicker = function() {
    const picker = document.getElementById('shooting-party-blessing-picker');
    if (!picker) return;
    picker.classList.toggle('show');
  };
  window.selectShootingBlessing = function(id) {
    selectedBlessingId = id || null;
    renderShootingBlessingPicker();
    document.getElementById('shooting-party-blessing-picker')?.classList.remove('show');
  };
  window.removeShootingPartyCharacter = function(id) {
    id = Number(id);
    if (isStoryShootingStage() && id === Number(CHARACTER_ID.ERI)) return;
    const idx = selectedPartyIds.indexOf(id);
    if (idx >= 0) selectedPartyIds.splice(idx, 1);
    if (isStoryShootingStage()) ensureStoryEriLeader();
    selectedCharacterId = selectedPartyIds[0] || CHARACTER_ID.ERI;
    applySelectedCharacterToUi();
  };

  function applySelectedCharacterToUi() {
    if (isStoryShootingStage()) ensureStoryEriLeader();
    const c = getCurrentCharacter();
    const player = document.getElementById(PLAYER_ID);
    const img = document.getElementById('shooting-player-image');
    const core = document.getElementById('shooting-player-core');
    const name = document.getElementById('shooting-player-name');
    const startName = document.getElementById('shooting-start-character');
    const startType = document.getElementById('shooting-start-type');
    if (player) {
      player.setAttribute('data-character-id', String(c.id));
      // build498: キャラマスターの uiScale.battleBack を戦闘ユニットへ反映。
      // 例: レイ 2.0 / シオン 0.70
      // build828: 味方の battle_back 表示だけを全キャラ共通で1.2倍。
      // キャラ個別の uiScale.battleBack は維持し、その最終表示倍率へ1.2を乗算する。
      // 当たり判定・移動座標・赤コア位置は変更しない（画像表示サイズのみ）。
      const battleBackScale = Math.max(
        0.1,
        Number(c && c.uiScale && c.uiScale.battleBack != null
          ? c.uiScale.battleBack
          : 1) || 1
      ) * 1.2;
      player.style.setProperty('--unit-scale', String(battleBackScale));
    }
    if (img) {
      img.src = (c.id === CHARACTER_ID.HAYATE && state && performance.now() < (state.hayateMoonlightUntil || 0)) ? (c.moonlightImage || c.image) : c.image;
      img.alt = c.name;
    }
    if (core) core.style.setProperty('--core-top', c.coreTop || '38%');
    if (name) name.textContent = c.name;
    renderActivePlayerElementIcon();
    if (startName) startName.textContent = c.name;
    if (startType) {
      startType.textContent = c.shotType === 'charge'
        ? `${c.label} · 長押し → 離して発射`
        : `${c.label} · 射撃は自動`;
    }
    document.querySelectorAll('.shooting-character-option').forEach(btn => {
      const id = Number(btn.getAttribute('data-character-id'));
      btn.classList.toggle('selected', selectedPartyIds.includes(id));
    });
    renderShootingPartySlots();
    renderShootingBlessingPicker();
    const ruleText = document.getElementById('shooting-party-rule-text');
    if (ruleText) {
      ruleText.textContent = (isChapter04Stage() && !isChapter43BossStage())
        ? 'CHAPTER 04 · エリのみ出撃可能'
        : (isStoryShootingStage()
          ? '最大3人 · エリ固定 · 1人から出撃可能'
          : '最大3人 · 1人から出撃可能');
    }

    const startBtn = document.getElementById('shooting-character-start');
    if (startBtn) {
      const ready = isShootingPartyReady();
      startBtn.disabled = !ready;
      if (!ready) {
        startBtn.textContent = 'あと 1人 選択';
      } else if (getSelectedStageTicketCost() > 0) {
        startBtn.innerHTML = '戦闘開始<br><small style="font-size:.72em;font-weight:500;letter-spacing:.04em;opacity:.82">（SPECIAL TICKET×1消費）</small>';
      } else {
        startBtn.textContent = '戦闘開始';
      }
    }
    renderSwitchRail(true);
  }

  function setBattleHudVisible(visible) { UIModule.setBattleHudVisible(ROOT_ID, visible); }
  function setCharacterSelectVisible(visible) { UIModule.setCharacterSelectVisible(ROOT_ID, visible); }
  function setCommonUiVisible(open) { UIModule.setCommonUiVisible(open); }

  function resetState() {
    // 旧バトルのITEM表示が何らかの経路で残っていても、新state作成前にDOM側を掃除する。
    purgeChapter4ItemDom();

    selectedPartyIds = selectedPartyIds
      .map(Number)
      .filter((id, index, arr) =>
        arr.indexOf(id) === index &&
        !!SHOOTING_CHARACTERS[id] &&
        isPublicShootingCharacterId(id) &&
        isShootingCharacterOwned(id)
      )
      .slice(0, PARTY_SIZE);

    if (isStoryShootingStage()) ensureStoryEriLeader();

    selectedCharacterId =
      selectedPartyIds[0] ||
      Object.keys(SHOOTING_CHARACTERS).map(Number).find(id => isPublicShootingCharacterId(id) && isShootingCharacterOwned(id)) ||
      CHARACTER_ID.ERI;

    const resolvedProfiles = Object.create(null);
    selectedPartyIds.forEach(id => {
      resolvedProfiles[Number(id)] = buildResonatedCharacterProfile(id);
    });

    const stageBossGaugeHp = Math.max(1, Number(selectedStage?.bossGaugeHp || BOSS.gaugeHp || BOSS.hp || 1));
    const stageBossGauges = Math.max(1, Math.floor(Number(selectedStage?.bossGauges || BOSS.gauges || 1)));
    const stageBossTotalHp = Math.max(
      1,
      Number(selectedStage?.bossTotalHp || (stageBossGaugeHp * stageBossGauges))
    );

    state = {
      characterProfiles: resolvedProfiles,
      running: false, ended: false, finishing: false, countdown: true,
      phaseTransition: false, koTransition: false,
      activeCharacterId: selectedCharacterId,
      switchReadyAt: 0,
      party: selectedPartyIds.map(id => {
        const c = resolvedProfiles[Number(id)] || buildResonatedCharacterProfile(id);
        return { id, hp: c.hp, hpMax: c.hp, burst: 0, ultReadyNotified: false, hitCount: 0, ultUseCount: 0 };
      }),
      player: { x: 0, y: 0, invulnUntil: 0 },
      mitoCompanionEl: null,
      mitoSummonHpEl: null,
      mitoSummonActive: false,
      mitoSummonX: 0,
      mitoSummonY: 0,
      mitoSummonVx: 0,
      mitoSummonVy: 0,
      mitoSummonHp: 0,
      mitoSummonHpMax: 0,
      mitoSummonExpireAt: 0,
      mitoSummonLastShotAt: -9999,
      mitoSummonInvulnUntil: 0,
      mitoSummonContactInvulnUntil: 0,
      battleType: selectedStage && selectedStage.type === 'normal' ? 'normal' : 'boss',
      stageId: selectedStage ? selectedStage.id : null,
      mission: selectedStage ? selectedStage.mission : null,
      missionFailed: false,
      missionComplete: false,
      collectedItems: 0,
      totalHitsTaken: 0,
      normalEnemies: [],
      normalSpawned: 0,
      normalDefeated: 0,
      normalLastSpawnAt: -9999,
      normalEnemyStunUntil: 0,
      // build841: stage-side random patterns are now deterministic.
      chapter4CurtainVolleyIndex: 0,
      chapter43VolleyIndex: 0,
      facelessVolleyIndex: 0,
      bulletHellVolleyIndex: 0,
      chapter6Barriers: [],
      collectibles: [],
      mimosaItems: [],
      boss: {
        x: 0, y: 42,
        element: normalizeCombatElement(
          BOSS?.element ||
          selectedStage?.bossElement ||
          selectedStage?.element
        ),
        hp: isRaidStage() ? getRaidStartingHp() : (isAmbushStage() ? getAmbushWaveHp(1) : (isFacelessStage() ? getFacelessWaveHp(1) : stageBossTotalHp)),
        hpMax: isRaidStage() ? Number(selectedStage.raid.maxHp || 100000) : (isAmbushStage() ? getAmbushWaveHp(1) : (isFacelessStage() ? getFacelessWaveHp(1) : stageBossTotalHp)),
        gaugeHp: isRaidStage() ? Math.ceil(Number(selectedStage.raid.maxHp || 100000) / 3) : (isAmbushStage() ? getAmbushWaveHp(1) : (isFacelessStage() ? getFacelessWaveHp(1) : stageBossGaugeHp)),
        gauges: isRaidStage() ? 3 : ((isFacelessStage() || isAmbushStage()) ? 1 : stageBossGauges),
        phase: 1
      },
      raidInitialHp: isRaidStage() ? getRaidStartingHp() : 0,
      raidDamageDealt: 0,
      raidAttemptFinished: false,
      raidLastBossHitVisualAt: 0,
      raidLastBossDamageNumberAt: 0,
      facelessWave: isFacelessStage() ? 1 : 0,
      facelessSummonTriggered: false,
      facelessObjects: [],
      facelessObjectSeq: 0,
      ambushWave: isAmbushStage() ? 1 : 0,
      ambushMinionSummoned: false,
      ambushWarningLastAt: -9999,
      ambushVolleyIndex: 0,
      ambushLastHitRingAt: 0,
      ambushPersistentSpawned: false,
      ambushLaserTriggered: false,
      ambushLaserWarningUntil: 0,
      ambushLaserActiveUntil: 0,
      ambushLaserEl: null,
      ambushLaserWarningEl: null,
      ambushLaserOriginX: 0,
      ambushLaserOriginY: 0,
      bossMotionBlendFromX: 0,
      bossMotionBlendFromY: 0,
      bossMotionBlendStartedAt: 0,
      bossMotionBlendDurationMs: 420,
      // BOSS大技（WARNING付き高威力攻撃）制御
      nextBossDangerAt: 0, bossDangerExecuteAt: 0, bossDangerWarningEl: null,
      bossDangerPatternIndex: 0,
      bullets: [], enemyBullets: [], score: 0, shotsHit: 0,
      scoreAttackVolleyIndex: -1,
      scoreAttackDamageTotal: 0,
      scoreAttackMoveDistance: 0,
      scoreAttackLastMoveX: NaN,
      scoreAttackLastMoveY: NaN,
      scoreAttackMoveWindowStartedAt: 0,
      scoreAttackMoveWindowScore: 0,
      scoreAttackArenaWidth: 390,
      scoreAttackArenaHeight: 700,
      scoreAttackLastHudRenderAt: 0,
      scoreAttackLastBossHitVisualAt: 0,
      scoreAttackLastBossDamageNumberAt: 0,
      scoreAttackFinalWarningShown: false,
      scoreAttackFinalWarningFired: false,
      combo: 0, maxCombo: 0, lastComboHitAt: 0,
      storyScoreFinalized: false, storyScoreClearBonus: 0, storyScoreTimeBonus: 0, storyScoreSurvivalBonus: 0, bossDefeatScoreAwarded: false,
      ultActiveUntil: 0, ultLockUntil: 0, playerShotLockUntil: 0, hayateMoonlightUntil: 0,
      ultCutinActive: false, ultCutinTimer: 0, skipNextUltCut: false,
      paused: false, pauseStartedAt: 0,
      arnoAuraUntil: 0, arnoAuraNextTickAt: 0, arnoAuraOwnerId: 0,
      clarineDecoys: [], clarineDecoySeq: 0,
      greshaBurnField: null,
      ignisLaserEl: null, ignisLaserHideAt: 0,
      ignisFireWheel: null,
      ignisBossBurnUntil: 0, ignisBossBurnNextTickAt: 0,
      roseFlower: null, roseHeartSeq: 0,
      eltenaBlackHole: null,
      toyfelBlackHoleField: null,
      ninaUltToken: 0,
      ninaOutputMaxUntil: 0,
      gojoPurpleField: null,
      gojoPurpleBossFreezeUntil: 0,
      wolfAtkField: null,
      chapter4ItemPhase: false,
      chapter4FinalItem: null,
      chapter4ItemDeadlineAt: 0,
      chapter4ItemOverlay: null,
      chapter4CurtainPhase: 0,
      chapter4CurtainBulletSeq: 0,
      chapter43RhythmStep: 0,
      chapter43RhythmNextAt: 0,
      chapter43Wave1SealTriggered: false,
      chapter43AttackSealed: false,
      chapter43SealHp: 0,
      chapter43DodgeEndsAt: 0,
      chapter43RestoreItemSpawned: false,
      chapter43RestoreItem: null,
      chapter43SealCountdownEl: null,
      chapter43Wave2CountdownTriggered: false,
      chapter43CollapseStartedAt: 0,
      chapter43CollapseDeadlineAt: 0,
      chapter43CountdownEl: null,
      ultTimerIds: [], bossGrabUntil: 0, bossStunUntil: 0, lastShotAt: -9999, lastBossShotAt: -9999, shotIndex: 0,
      miaChargeStartedAt: 0, miaChargePointerId: null,
      startedAt: performance.now(), clearTimeMs: 0,
    };

    // CH04のITEM告知DOMは戦闘開始前に1回だけ作成して非表示待機。
    // 60秒到達フレームでのDOM生成を減らす。
    if (isChapter04Stage()) prepareChapter4ItemOverlay();

    if (selectedStage && selectedStage.survivalBoss && state.boss) {
      // SCORE ATTACK等の耐久ボスは「倒す対象」ではなく、制限時間中ずっと殴る標的。
      // 十分に大きい内部HPを持たせ、UIでは∞として扱う。
      const survivalHp = Number.MAX_SAFE_INTEGER;
      state.boss.hp = survivalHp;
      state.boss.hpMax = survivalHp;
      state.boss.gaugeHp = survivalHp;
      state.boss.gauges = 1;
      state.boss.phase = 1;
    }

    if (isRaidStage() && state.boss) {
      const remainingGauges = Math.max(1, Math.ceil(state.boss.hp / state.boss.gaugeHp));
      state.boss.phase = Math.max(1, Math.min(3, 4 - remainingGauges));
    }
  }

  function renderSwitchRail(rebuild) {
    const rail = document.getElementById('shooting-switch-rail');
    if (!rail || !state || !Array.isArray(state.party)) return;
    const others = state.party.filter(m => m.id !== state.activeCharacterId);
    if (rebuild || rail.children.length !== others.length) {
      rail.innerHTML = others.map(m => {
        const c = getBattleCharacter(m.id);
        return `<button type="button" class="shooting-switch-btn" data-switch-id="${m.id}" onclick="switchShootingCharacter(${m.id})">
          <span class="shooting-switch-ult-ring" aria-hidden="true"></span>
          <img src="${c.panelImage || c.image}" alt="${c.name}" draggable="false">
          <span class="shooting-switch-buff-badge" aria-hidden="true"></span>
          <span class="shooting-switch-name">${c.name}</span>
          <span class="shooting-switch-hp"><i></i></span>
          <small class="shooting-switch-status"></small>
        </button>`;
      }).join('');
    }
    const remain = Math.max(0, (state.switchReadyAt || 0) - performance.now());
    const now = performance.now();
    rail.querySelectorAll('.shooting-switch-btn').forEach(btn => {
      const id = Number(btn.getAttribute('data-switch-id'));
      const m = getPartyMember(id);
      if (!m) return;
      const c = getBattleCharacter(id);
      const hp = btn.querySelector('.shooting-switch-hp i');
      if (hp) hp.style.width = `${clamp(m.hp / m.hpMax, 0, 1) * 100}%`;

      // Bench ULT gauge: the circular ring around each switch button mirrors that member's own ULT charge.
      const ultRing = btn.querySelector('.shooting-switch-ult-ring');
      const ultPct = clamp(m.burst / c.burstNeed, 0, 1);
      if (ultRing) ultRing.style.setProperty('--ult-ring-fill', String(ultPct));
      btn.classList.toggle('ult-ready', ultPct >= 1);
      const dead = m.hp <= 0;
      const cooling = remain > 0;
      btn.disabled = dead || cooling || state.ended || state.finishing || state.koTransition;
      btn.classList.toggle('dead', dead);
      btn.classList.toggle('cooling', cooling && !dead);
      const status = btn.querySelector('.shooting-switch-status');
      if (status) status.textContent = dead ? 'DOWN' : cooling ? `${(remain / 1000).toFixed(1)}s` : 'CHANGE';

      // ミモザの恩恵アイテム効果は、控え中でも「まだ効いているか」が
      // 見た目で分かるよう小さいバッジで表示する(交代しても他人には移らない)。
      const isInvincible = now < (m.invincibleUntil || 0);
      const hasAtkBuff = now < (m.atkBuffUntil || 0);
      btn.classList.toggle('has-invincible-buff', isInvincible);
      btn.classList.toggle('has-atk-buff', !isInvincible && hasAtkBuff);
      const buffBadge = btn.querySelector('.shooting-switch-buff-badge');
      if (buffBadge) {
        buffBadge.textContent = isInvincible ? '無敵' : hasAtkBuff ? 'ATK' : '';
      }
    });
  }

  function stopHayateMoonlightForSwitch() {
    if (!state || state.hayateMoonlightUntil <= performance.now()) return;
    state.hayateMoonlightUntil = 0;
    state.ultActiveUntil = 0;
    document.getElementById(ROOT_ID)?.classList.remove('hayate-moonlight-active');
    document.getElementById(PLAYER_ID)?.classList.remove('hayate-moonlight');
  }

  function cleanupMitoCompanionOnSwitch(nextCharacterId) {
    // 独立召喚ユニットなので、ミトから交代しても8秒/HP0まで残る。
    return;
  }

  window.switchShootingCharacter = function(id, forced) {
    id = Number(id);
    if (!state || state.ended || state.finishing || state.koTransition) return;
    const member = getPartyMember(id);
    if (!member || member.hp <= 0 || id === state.activeCharacterId) return;
    const now = performance.now();
    if (!forced && now < (state.switchReadyAt || 0)) return;
    if (getCurrentCharacter().id === CHARACTER_ID.HAYATE) stopHayateMoonlightForSwitch();
    if (getCurrentCharacter().shotType === 'charge') clearMiaChargeState();

    // ミトから別キャラへ交代する時は、犬とミトULT状態をその場で破棄。
    cleanupMitoCompanionOnSwitch(id);

    state.activeCharacterId = id;
    selectedCharacterId = id;
    state.switchReadyAt = forced ? now + 800 : now + SWITCH_COOLDOWN_MS;
    state.player.invulnUntil = Math.max(state.player.invulnUntil || 0, now + 260);
    state.lastShotAt = -9999;
    applySelectedCharacterToUi();

    // 念のため新しいアクティブキャラ確定後にも表示状態を同期。
    // ミト以外なら updateMitoCompanion() 側でも show を外す。
    updateMitoCompanion();

    // iPhone対策:
    // キャラ切替時に「指の座標へ即代入」すると、再描画タイミング次第でワープに見える。
    // キャラチェンジ時は移動目標を保持したままドラッグ基準だけ更新する。
    // 指を離さず操作している時の「一瞬止まる」感覚をなくす。
    rebaseTouchDragToPlayer(true);

    const player = document.getElementById(PLAYER_ID);
    if (player) {
      player.classList.remove('character-swap');
      void player.offsetWidth;
      player.classList.add('character-swap');
      setTimeout(() => player.classList.remove('character-swap'), 260);
    }
    renderHud();
  };

  function placeInitialUnits() {
    const arena = document.getElementById('shooting-arena');
    const player = document.getElementById(PLAYER_ID);
    const boss = document.getElementById(BOSS_ID);
    if (!arena || !player) return;
    if (!isNormalBattle() && !boss) return;
    const w = arena.clientWidth;
    const h = arena.clientHeight;
    state.player.x = w * 0.5;
    state.player.y = h * 0.82;
    state.boss.x = w * 0.5;
    state.boss.y = Math.max(54, h * 0.16);
    positionUnit(player, state.player.x, state.player.y);
    updateMitoCompanion();
    positionUnit(boss, state.boss.x, state.boss.y);

    // arenaが表示された直後 / resize後の操作範囲をここで1度だけ再取得。
    // touchmove側ではこのキャッシュを使う。
    refreshArenaInputRect(true);
  }

  function positionUnit(el, x, y) {
    if (!el) return;
    el.style.setProperty('--unit-x', `${x}px`);
    el.style.setProperty('--unit-y', `${y}px`);

    const isEnemyUnit =
      el.id === BOSS_ID ||
      el.classList.contains('shooting-mini-enemy');

    if (el.id === BOSS_ID) {
      el.style.setProperty('--boss-x', `${x}px`);
      el.style.setProperty('--boss-y', `${y}px`);
    }

    // Scale is placed AFTER translation so changing enemy size never scales
    // the x/y coordinates themselves.
    if (isEnemyUnit) {
      el.style.transform =
        `translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(var(--enemy-scale,1))`;
    } else if (el.classList.contains('shooting-raid-green-laser')) {
      el.style.transform =
        `translate3d(${x}px,${y}px,0) translate(-50%,-50%) rotate(var(--raid-laser-angle,0rad))`;
    } else {
      el.style.transform =
        `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
    }
  }

  function clearProjectiles() {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    arena.querySelectorAll('.shooting-bullet,.shooting-enemy-bullet,.shooting-hit,.shooting-eri-ult-mark,.shooting-eri-ult-slash,.shooting-eri-ult-ray,.shooting-arno-aura,.shooting-clarine-decoy,.shooting-clarine-decoy-burst,.shooting-gresha-burn-field,.shooting-ignis-laser,.shooting-ignis-fire-wheel,.shooting-ignis-burn,.shooting-rose-flower,.shooting-ult-cutin,.shooting-testchan-blackship-beam,.shooting-jig-scramble-ray,.shooting-veronica-slash,.shooting-wolf-atk-field,.shooting-noah-ult-bullet,.shooting-noah-lightning,.shooting-lightning-chain-effect,.shooting-nina-electric-network,.shooting-nina-ult-zone-warning,.shooting-nina-ult-lightning,.shooting-nina-ult-dust,.shooting-nina-paralyze-vfx,.shooting-toyfel-black-hole,.shooting-faceless-object,.shooting-faceless-object-hp,.shooting-faceless-battle-cut,.shooting-boss-danger-warning').forEach(el => el.remove());
    clearEnemyBulletCanvas();
    if (state) {
      state.bullets = [];
      state.enemyBullets = [];
      state.clarineDecoys = [];
      state.greshaBurnField = null;
      state.ignisLaserEl = null;
      state.ignisFireWheel = null;
      state.roseFlower = null;
      state.wolfAtkField = null;
      state.bossDangerWarningEl = null;
      state.bossDangerExecuteAt = 0;
      if (Array.isArray(state.facelessObjects)) {
        if (isAmbushStage()) {
          // 乱入ステージのminiは「敵本体」なので、キャラLOST時などの
          // 弾/一時エフェクト消去では消さない。HP・位置・攻撃タイマーも維持する。
          // WAVE切替時だけ clearAmbushObjects() が明示的に削除する。
          const survivors = [];
          state.facelessObjects.forEach(obj => {
            if (obj && obj.ambushMinion && obj.hp > 0 && obj.el && obj.el.isConnected) {
              survivors.push(obj);
              return;
            }
            obj?.el?.remove();
            obj?.hpEl?.remove();
          });
          state.facelessObjects = survivors;
        } else {
          state.facelessObjects.forEach(obj => {
            obj?.el?.remove();
            obj?.hpEl?.remove();
          });
          state.facelessObjects = [];
        }
      }
    }
  }

  // ============================================================
  // 時限バフ / 無敵の統一ステータス取得
  // ============================================================
  // 「無敵」「ATK UP」など時限で発生するプレイヤーバフは、発生源(ミモザの
  // アイテム、ハヤテの月光モードなど)がどれだけ増えても、自機のリング演出・
  // 頭上バッジ・切り替えボタンのバフアイコンに"自動的に"反映されるよう、
  // 判定をこの関数だけに集約する。
  //
  // 今後、新しいキャラのULTなどで時限の無敵/ATK UPを追加する場合：
  //   - member単位で完結する効果 → member.invincibleUntil / member.atkBuffUntil
  //     （+ member.atkBuffMultiplier）をそのまま使えば、この関数を触らずに
  //     自動でUI反映される。
  //   - state単位（ハヤテの月光モードのように「このキャラがアクティブな間だけ」
  //     成立する効果）→ 下のinvincibleSources / atkBuffSources 配列に
  //     1エントリ追記するだけでよい。
  //
  // 将来「HP吸収UP」「被ダメージ軽減」等の別種バフを追加する場合も、
  // 同じ形（sources配列 + Math.max/優先順位で1つに絞る）を踏襲すること。
  function getPlayerBuffStatus(member, chara, now) {
    if (!member) {
      return { invincibleLeft: 0, atkBuffLeft: 0, atkBuffMultiplier: 1 };
    }

    // ---- 無敵：発生源が増えたらここに1行足すだけでよい ----
    const invincibleSources = [
      (member.invincibleUntil || 0) - now, // ミモザ「ミモザの贈り物」
      chara && chara.id === CHARACTER_ID.HAYATE
        ? (state.hayateMoonlightUntil || 0) - now // ハヤテ「雷光巡行」月光モード
        : -Infinity,
    ];
    const invincibleLeft = Math.max(0, ...invincibleSources);

    // ---- ATK UP：発生源が増えたらここに1エントリ足すだけでよい ----
    // { left: 残りms, multiplier: 表示用倍率 } の配列から、残り時間が最大のものを採用する。
    const wolfFieldStatus = getWolfAtkFieldStatus(now);
    const atkBuffSources = [
      { left: (member.atkBuffUntil || 0) - now, multiplier: Number(member.atkBuffMultiplier || 1.3) }, // ミモザのアイテム
      {
        left: chara && chara.id === CHARACTER_ID.HAYATE ? (state.hayateMoonlightUntil || 0) - now : -Infinity,
        multiplier: Number((chara && chara.moonlightPowerMultiplier) || 1.85), // ハヤテ自身の月光モードATK UP
      },
      {
        left: wolfFieldStatus.active ? wolfFieldStatus.left : -Infinity,
        multiplier: wolfFieldStatus.multiplier,
      },
    ].filter(entry => entry.left > 0);

    let atkBuffLeft = 0;
    let atkBuffMultiplier = 1;
    if (atkBuffSources.length) {
      const best = atkBuffSources.reduce((a, b) => (b.left > a.left ? b : a));
      atkBuffLeft = best.left;
      atkBuffMultiplier = best.multiplier;
    }

    return { invincibleLeft, atkBuffLeft, atkBuffMultiplier };
  }

  function renderHud() {
    if (!state) return;
    updateBattleTimer(performance.now());
    const bossBar = document.getElementById('shooting-boss-bar');
    const bossGauge = bossBar ? bossBar.querySelector('i') : null;
    const bossPhase = document.getElementById('shooting-boss-phase');
    const score = document.getElementById('shooting-score');
    const comboCount = document.getElementById('shooting-combo-count');
    const hpText = document.getElementById('shooting-player-hp-text');
    const hpBar = document.querySelector('#shooting-player-hp-bar i');
    renderActivePlayerElementIcon();
    const gaugeWrap = document.getElementById('shooting-ult-side');
    const gauge = document.getElementById('shooting-burst-gauge');

    const gaugeHp = state.boss.gaugeHp;
    const phase = state.boss.phase || 1;
    const gaugeFloor = (state.boss.gauges - phase) * gaugeHp;
    const normalCurrentGaugeHp = clamp(state.boss.hp - gaugeFloor, 0, gaugeHp);
    const currentGaugeHp = isChapter43BossStage() ? getChapter43WaveCurrentHp() : normalCurrentGaugeHp;
    const currentGaugeMaxHp = isChapter43BossStage() ? getChapter43WaveMaxHp(phase) : gaugeHp;
    const amount = isScoreAttackStage() ? 1 : (currentGaugeHp / Math.max(1, currentGaugeMaxHp));
    if (bossGauge) bossGauge.style.setProperty('--gauge-fill', String(amount));
    if (bossBar) {
      bossBar.classList.remove('phase-1', 'phase-2', 'phase-3');
      bossBar.classList.add(`phase-${phase}`);
    }
    if (bossPhase) {
      const scoreAttack = isScoreAttackStage();
      bossPhase.textContent = scoreAttack
        ? 'HP：∞'
        : (isAmbushStage()
          ? `WAVE ${state.ambushWave || 1} / 2`
          : (isFacelessStage()
            ? `WAVE ${state.facelessWave || 1} / 2`
            : (isChapter43BossStage()
              ? `WAVE ${phase} / 2　HP ${Math.ceil(getChapter43WaveCurrentHp())} / ${getChapter43WaveMaxHp(phase)}`
              : `PHASE ${phase} / ${state.boss.gauges}`)));
      bossPhase.classList.toggle('score-attack-infinite-hp', scoreAttack);
    }
    if (score) {
      const root = document.getElementById(ROOT_ID);
      if (root?.classList.contains('battle-hud-visible')) {
        if (isRaidStage()) {
          const raidHp = Math.max(0, Math.floor(Number(state.boss?.hp || 0)));
          const raidMaxHp = Math.max(1, Math.floor(Number(state.boss?.hpMax || selectedRaidContext?.maxHp || 100000)));
          score.textContent = `HP ${raidHp.toLocaleString('ja-JP')} / ${raidMaxHp.toLocaleString('ja-JP')}`;
        } else {
          score.textContent = `SCORE ${formatShootingScore(state.score)}`;
        }
        score.classList.remove('is-high-score');
      }
    }
    const bossHud = document.querySelector(`#${ROOT_ID} .shooting-boss-hud`);
    renderBossElementIcon();
    const missionHud = document.getElementById('shooting-mission-hud');

    // build792: every battle uses the same fixed mission/clear-condition band.
    // The shell never disappears between STORY / DAILY / EVENT / RAID; only its text changes.
    if (bossHud) bossHud.style.display = isNormalBattle() ? 'none' : '';
    if (missionHud) missionHud.style.display = 'grid';

    if (selectedStage) {
      const stageLabel = document.getElementById('shooting-stage-label');
      const missionText = document.getElementById('shooting-mission-text');
      const missionProgress = document.getElementById('shooting-mission-progress');
      const m = isNormalBattle() ? getEffectiveNormalMission() : (selectedStage.mission || {});
      const nowMission = performance.now();

      if (stageLabel) {
        if (isDailyQuestStage()) {
          stageLabel.textContent = 'DAILY QUEST';
        } else if (isRaidStage()) {
          stageLabel.textContent = 'RAID BATTLE';
        } else if (isScoreAttackStage()) {
          stageLabel.textContent = 'SCORE ATTACK';
        } else if (isAmbushStage()) {
          stageLabel.textContent = 'ENCOUNTER';
        } else if (selectedStage.eventId) {
          stageLabel.textContent = 'SPECIAL EVENT';
        } else {
          stageLabel.textContent = `CHAPTER ${String(selectedStage.chapter).padStart(2,'0')}　${String(selectedStage.stageNo).padStart(2,'0')}`;
        }
      }

      if (missionText) missionText.textContent = m.text || '敵を撃破';

      if (missionProgress) {
        if (isChapter43BossStage()) {
          const now43 = nowMission;
          if (state.chapter43AttackSealed && !state.chapter43RestoreItemSpawned) {
            missionProgress.textContent = `DODGE ${Math.max(0, Math.ceil((state.chapter43DodgeEndsAt - now43) / 1000))}s`;
          } else if (state.chapter43AttackSealed) {
            missionProgress.textContent = 'ITEM';
          } else if (state.chapter43Wave2CountdownTriggered) {
            missionProgress.textContent = `LIMIT ${Math.max(0, Math.ceil((state.chapter43CollapseDeadlineAt - now43) / 1000))}s`;
          } else {
            missionProgress.textContent = `WAVE ${state.boss.phase || 1} / 2`;
          }
        } else if (isFacelessStage()) {
          missionProgress.textContent = `WAVE ${state.facelessWave || 1} / 2`;
        } else if (isAmbushStage()) {
          missionProgress.textContent = `WAVE ${state.ambushWave || 1} / 2`;
        } else if (isRaidStage()) {
          missionProgress.textContent = `TIME ${formatBattleTimer(getBattleTimeLeft(nowMission))}`;
        } else if (isScoreAttackStage()) {
          missionProgress.textContent = `TIME ${formatBattleTimer(getBattleTimeLeft(nowMission))}`;
        } else if (m.type === SHOOTING_MISSION_TYPE.COLLECT_ITEM) {
          missionProgress.textContent = `ITEM ${state.collectedItems}/${Number(m.target || 3)}`;
        } else if (m.type === SHOOTING_MISSION_TYPE.CLEAR_TIME) {
          const total = Number(getNormalBattleConfig().totalEnemies || 0);
          missionProgress.textContent = `ENEMY ${state.normalDefeated}/${total}`;
        } else if (m.type === SHOOTING_MISSION_TYPE.SURVIVE_TIME) {
          if (isChapter04Stage() && state.chapter4ItemPhase) {
            const itemLeft = Math.max(0, Number(state.chapter4ItemDeadlineAt || 0) - nowMission);
            missionProgress.textContent = `ITEM ${Math.max(1, Math.ceil(itemLeft / 1000))}`;
          } else {
            missionProgress.textContent = `TIME ${formatBattleTimer(getBattleTimeLeft(nowMission))}`;
          }
        } else if (m.type === SHOOTING_MISSION_TYPE.MAX_HITS_TAKEN) {
          const total = Number(getNormalBattleConfig().totalEnemies || 0);
          missionProgress.textContent = `被弾 ${state.totalHitsTaken}/${Number(m.maxHits || 3)}　ENEMY ${state.normalDefeated}/${total}`;
        } else if (m.type === SHOOTING_MISSION_TYPE.BOSS_CLEAR || !isNormalBattle()) {
          const gauges = Math.max(1, Number(state.boss?.gauges || 1));
          missionProgress.textContent = gauges > 1
            ? `PHASE ${state.boss?.phase || 1} / ${gauges}`
            : 'BOSS';
        } else {
          const total = Number(getNormalBattleConfig().totalEnemies || 0);
          missionProgress.textContent = `ENEMY ${state.normalDefeated}/${total}`;
        }
      }
    }
    if (comboCount) comboCount.textContent = String(state.combo || 0);
    const member = getActiveMember();
    const chara = getCurrentCharacter();
    if (isChapter04Stage() && !isChapter43BossStage() && member) {
      member.burst = 0;
      member.ultReadyNotified = false;
    }
    if (member) {
      if (hpText) hpText.textContent = `${Math.ceil(member.hp)} / ${member.hpMax}`;
      if (hpBar) hpBar.style.width = `${clamp(member.hp / member.hpMax, 0, 1) * 100}%`;
    }

    // 無敵・ATK UPの時限バフを自機に分かりやすく可視化する。
    // 発生源の判定はgetPlayerBuffStatusに集約済み。ここでは結果を表示に反映するだけ。
    const nowHud = performance.now();
    const playerEl = document.getElementById(PLAYER_ID);
    const buffBadges = document.getElementById('shooting-player-buff-badges');
    if (member && playerEl) {
      const buffStatus = getPlayerBuffStatus(member, chara, nowHud);
      const invincibleLeft = buffStatus.invincibleLeft;
      const atkBuffLeft = buffStatus.atkBuffLeft;
      const isInvincible = invincibleLeft > 0;
      const hasAtkBuff = atkBuffLeft > 0;

      playerEl.classList.toggle('shooting-invincible-active', isInvincible);
      playerEl.classList.toggle('shooting-atk-buff-active', hasAtkBuff);

      if (buffBadges) {
        const badges = [];
        if (isInvincible) {
          badges.push(`<span class="shooting-player-buff-badge invincible">無敵 ${(invincibleLeft / 1000).toFixed(1)}s</span>`);
        }
        if (hasAtkBuff) {
          const mult = buffStatus.atkBuffMultiplier.toFixed(1);
          badges.push(`<span class="shooting-player-buff-badge atk">ATK×${mult} ${(atkBuffLeft / 1000).toFixed(1)}s</span>`);
        }
        buffBadges.innerHTML = badges.join('');
        buffBadges.setAttribute('aria-hidden', badges.length ? 'false' : 'true');
      }
    } else if (playerEl) {
      playerEl.classList.remove('shooting-invincible-active', 'shooting-atk-buff-active');
      if (buffBadges) { buffBadges.innerHTML = ''; buffBadges.setAttribute('aria-hidden', 'true'); }
    }

    const pct = member ? clamp(member.burst / chara.burstNeed, 0, 1) : 0;
    const ultReady =
      pct >= 1 &&
      !state.ended &&
      !state.phaseTransition &&
      !state.koTransition &&
      performance.now() >= (state.ultLockUntil || 0);

    if (gauge) gauge.style.setProperty('--ult-fill', String(pct));
    if (gaugeWrap) gaugeWrap.classList.toggle('is-ready', ultReady);

    if (member && !ultReady && pct < 1) {
      member.ultReadyNotified = false;
    }

    renderSwitchRail(false);
  }

  // ============================================================
  // HIT COMBO DAMAGE BOOST / STORY CLEAR SCORE v552
  // ============================================================
  const HIT_COMBO_TIMEOUT_MS = 3000;
  const HIT_COMBO_STEP = 50;
  const HIT_COMBO_STEP_BONUS = 0.05;
  const HIT_COMBO_MAX = 300;

  function getHitComboDamageMultiplier() {
    if (!state || isScoreAttackStage()) return 1;
    const combo = Math.max(0, Math.min(HIT_COMBO_MAX, Number(state.combo || 0)));
    return 1 + Math.floor(combo / HIT_COMBO_STEP) * HIT_COMBO_STEP_BONUS;
  }

  function applyHitComboDamage(amount) {
    const base = Math.max(0, Number(amount || 0));
    return base > 0 ? base * getHitComboDamageMultiplier() : 0;
  }

  function addLegacyCombatScore(points) {
    // STORYではダメージ量/Hit数/ULT倍率から直接SCOREを増やさない。
    // Special / Daily / Raid等の既存スコア仕様はここでは維持する。
    if (!state || isStoryShootingStage()) return;
    state.score += Math.max(0, Math.round(Number(points || 0)));
  }

  const STORY_CLEAR_BONUS = 8000;
  const STORY_TIME_BONUS_MAX = 8000;
  const STORY_SURVIVAL_BONUS_MAX = 8000;

  function getStoryScoreParSeconds() {
    if (!selectedStage) return 0;
    const explicit = Number(selectedStage.scoreParSeconds || 0);
    if (explicit > 0) return explicit;
    const mission = selectedStage.mission || {};
    if (mission.type === SHOOTING_MISSION_TYPE.SURVIVE_TIME) return -1;
    const limit = getBattleTimeLimitSeconds();
    if (limit > 0) return limit;
    return selectedStage.type === 'boss' ? 120 : 90;
  }

  function finalizeStoryClearScore(win) {
    if (!state || !isStoryShootingStage() || state.storyScoreFinalized) return;
    state.storyScoreFinalized = true;
    state.storyScoreClearBonus = 0;
    state.storyScoreTimeBonus = 0;
    state.storyScoreSurvivalBonus = 0;
    if (!win) return;

    const elapsedSeconds = Math.max(0, Number(state.clearTimeMs || 0) / 1000);
    const parSeconds = getStoryScoreParSeconds();
    const timeRatio = parSeconds === -1 ? 1 : (parSeconds > 0 ? clamp(1 - elapsedSeconds / parSeconds, 0, 1) : 0);
    const party = Array.isArray(state.party) ? state.party : [];
    const hpMaxTotal = party.reduce((sum, m) => sum + Math.max(0, Number(m && m.hpMax || 0)), 0);
    const hpTotal = party.reduce((sum, m) => sum + Math.max(0, Number(m && m.hp || 0)), 0);
    const survivalRatio = hpMaxTotal > 0 ? clamp(hpTotal / hpMaxTotal, 0, 1) : 0;

    state.storyScoreClearBonus = STORY_CLEAR_BONUS;
    state.storyScoreTimeBonus = Math.round(STORY_TIME_BONUS_MAX * timeRatio);
    state.storyScoreSurvivalBonus = Math.round(STORY_SURVIVAL_BONUS_MAX * survivalRatio);
    state.score += state.storyScoreClearBonus + state.storyScoreTimeBonus + state.storyScoreSurvivalBonus;
  }

  function pulseCombo(milestone) {
    const combo = document.getElementById('shooting-combo');
    if (!combo) return;
    combo.classList.remove('pulse', 'milestone');
    void combo.offsetWidth;
    combo.classList.add('pulse');
    if (milestone) combo.classList.add('milestone');
    setTimeout(() => combo.classList.remove('pulse', 'milestone'), milestone ? 520 : 220);
  }

  function resetCombo(silent = false) {
    if (!state || !state.combo) return;
    state.combo = 0;
    state.lastComboHitAt = 0;
    if (!silent) renderHud();
  }

  // build565: 敵の「移動停止」と「敵弾生成停止」は常にセットで扱う。
  // 停止解除時に、停止時間中に期限切れになった射撃/行動予約をまとめて消化しないよう、
  // 再開基準時刻を停止終了後へ送る共通ヘルパー。
  function deferNormalEnemyAttackResume(enemy, resumeAt, index = 0) {
    if (!enemy) return;
    const until = Math.max(performance.now(), Number(resumeAt || 0));
    const def = enemy.def || {};
    const interval = getStageAdjustedEnemyFireInterval(Number(def.fireRate || 1200));
    enemy.lastShotAt = Math.max(Number(enemy.lastShotAt || 0), until);
    enemy.nextActionAt = Math.max(Number(enemy.nextActionAt || 0), until + interval + Math.max(0, Number(index || 0)) * 35);
    enemy.attackExecuteAt = 0;
  }

  function freezeNormalEnemyAction(enemy, resumeAt, index = 0) {
    if (!enemy) return;
    deferNormalEnemyAttackResume(enemy, resumeAt, index);
    enemy.dashUntil = 0;
    enemy.dashVx = 0;
    enemy.dashVy = 0;
    enemy.attackState = 'idle';
    if (enemy.el) enemy.el.classList.remove('violence-dash', 'generic-charge-dash', 'generic-charge-warning');
  }

  function deferFacelessObjectAttackResume(obj, resumeAt) {
    if (!obj) return;
    const until = Math.max(performance.now(), Number(resumeAt || 0));
    obj.lastShotAt = Math.max(Number(obj.lastShotAt || 0), until);
  }

  function deferBossAttackResume(resumeAt) {
    if (!state || isNormalBattle()) return;
    const until = Math.max(performance.now(), Number(resumeAt || 0));
    state.lastBossShotAt = Math.max(Number(state.lastBossShotAt || 0), until);
    removeBossDangerWarning();
    state.bossDangerExecuteAt = 0;
    state.nextBossDangerAt = Math.max(
      Number(state.nextBossDangerAt || 0),
      until + getBossDangerInterval()
    );
  }

  function deferAllEnemyAttackResume(resumeAt) {
    if (!state) return;
    const until = Math.max(performance.now(), Number(resumeAt || 0));
    (state.normalEnemies || []).forEach((enemy, index) => {
      if (!enemy || enemy.hp <= 0) return;
      deferNormalEnemyAttackResume(enemy, until, index);
    });
    (state.facelessObjects || []).forEach(obj => {
      if (!obj || obj.hp <= 0) return;
      deferFacelessObjectAttackResume(obj, until);
    });
    if (!isNormalBattle() && state.boss && state.boss.hp > 0) {
      deferBossAttackResume(until);
    }
  }

  function applyBossStun(durationMs, source) {
    if (!state || state.ended || state.finishing) return;
    const now = performance.now();
    if (isNormalBattle()) {
      // ネムのスタンは「これから行う敵の攻撃」を止めるだけ。
      // 既に発射済みの弾は残すが、新規弾生成はmakeProjectile側でも遮断する。
      const nextUntil = Math.max(state.normalEnemyStunUntil || 0, now + durationMs);
      state.normalEnemyStunUntil = nextUntil;
      // 全敵の移動/攻撃停止と同時に、射撃時計も停止終了後へ送る。
      (state.normalEnemies || []).forEach((enemy, index) => {
        if (!enemy || enemy.hp <= 0) return;
        freezeNormalEnemyAction(enemy, nextUntil, index);
      });

      // スタン解除時に全敵の射撃タイマーが「期限切れ」扱いになって
      // 一斉射撃しないよう、再開基準時刻を揃え直す。
      const expectedUntil = nextUntil;
      setTimeout(() => {
        if (!state || state.ended || state.finishing) return;
        if (state.normalEnemyStunUntil !== expectedUntil) return;
        if (performance.now() + 8 < expectedUntil) return;

        state.normalEnemyStunUntil = 0;
        const resumedAt = performance.now();
        (state.normalEnemies || []).forEach((enemy, index) => {
          if (!enemy || enemy.hp <= 0) return;
          deferNormalEnemyAttackResume(enemy, resumedAt, index);
        });
      }, Math.max(0, nextUntil - now) + 30);
      return;
    }
    if (state.boss.hp <= 0) return;
    state.bossStunUntil = Math.max(state.bossStunUntil || 0, now + durationMs);
    deferBossAttackResume(state.bossStunUntil);
    const boss = document.getElementById(BOSS_ID);
    const root = document.getElementById(ROOT_ID);
    if (boss) boss.classList.add('nem-stunned');
    if (root) {
      root.classList.add('nem-stun-active');
      root.setAttribute('data-nem-stun-source', source || 'combo');
    }
    const expectedUntil = state.bossStunUntil;
    setTimeout(() => {
      if (!state || state.ended || (state.bossStunUntil || 0) > performance.now() + 8 || state.bossStunUntil !== expectedUntil) return;
      state.bossStunUntil = 0;
      if (boss) boss.classList.remove('nem-stunned');
      if (root) {
        root.classList.remove('nem-stun-active');
        root.removeAttribute('data-nem-stun-source');
      }
      deferBossAttackResume(performance.now());
    }, durationMs + 30);
  }

  function registerComboHit(ownerId, now, dealtDamage = 1) {
    if (!state || state.ended || state.finishing) return;
    if (!(Number(dealtDamage || 0) > 0)) return;
    state.combo = (state.combo || 0) + 1;
    state.maxCombo = Math.max(state.maxCombo || 0, state.combo);
    state.lastComboHitAt = Number(now || performance.now());
    pulseCombo(state.combo > 0 && state.combo % HIT_COMBO_STEP === 0);
  }

  function showUltReadyNotice() {
    const root = document.getElementById(ROOT_ID);
    if (!root || !state || state.ended) return;

    const old = root.querySelector('.shooting-ult-ready-notice');
    if (old) old.remove();

    const c = getCurrentCharacter();
    const el = document.createElement('div');
    el.className = `shooting-ult-ready-notice ${c.id || ''}`;
    el.innerHTML = `<span>ULT READY</span><strong>ULT 発動可能</strong><small>ダブルタップで発動</small>`;
    root.appendChild(el);

    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => el.classList.add('hide'), 1250);
    setTimeout(() => el.remove(), 1650);
  }

  // ミモザのULTアイテム取得時など、画面中央に短時間テキストを出すための共通演出。
  // showUltReadyNoticeと同じHTML構造・タイミング・アニメーションクラスを流用し、
  // デザインを統一する。
  function showShootingItemEffectNotice(label, detail) {
    const root = document.getElementById(ROOT_ID);
    if (!root || !state || state.ended) return;

    const old = root.querySelector('.shooting-item-effect-notice');
    if (old) old.remove();

    const el = document.createElement('div');
    el.className = 'shooting-item-effect-notice';
    el.innerHTML = `<span>ITEM GET</span><strong>${label}</strong><small>${detail}</small>`;
    root.appendChild(el);

    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => el.classList.add('hide'), 1250);
    setTimeout(() => el.remove(), 1650);
  }

  // ============================================================
  // Canvas enemy bullet renderer — isolated performance trial
  // ============================================================
  // true: 「楽園 -ノア-」「フェイスレス」「すこ☆あた」「DAILY RAID」「CHAPTER04」の敵弾をCanvas描画
  // false: 全ステージ従来どおりDOM描画（即時ロールバック用）
  const CANVAS_ENEMY_BULLET_TEST_ENABLED = true;
  const ENEMY_BULLET_CANVAS_ID = 'shooting-enemy-bullet-canvas';

  // 既存CSSや端末差にCanvasの可視性を左右されないよう、検証レイヤーを固定する。
  // build782: FACELESSの被弾フィルタ上書きは撤去。通常BOSSと同じ
  // HITリング + 赤系フラッシュ + sustained feedback をそのまま使う。
  if (!document.getElementById('shooting-canvas-test-visual-style-v231')) {
    const style = document.createElement('style');
    style.id = 'shooting-canvas-test-visual-style-v231';
    style.textContent = `
      #shooting-event-root:is([data-shooting-stage="shooting_event_bullet_hell_test"],[data-shooting-stage^="shooting_event_faceless"],[data-shooting-stage="shooting_score_attack_normal"],[data-shooting-stage="shooting_score_attack_hard"],[data-shooting-stage="shooting_raid_test"],[data-shooting-stage^="shooting_ch04_"],[data-shooting-stage^="shooting_beginner_ch04_"]) #shooting-enemy-bullet-canvas{
        position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
        z-index:17!important;display:block!important;visibility:visible!important;opacity:1!important;
        pointer-events:none!important;background:transparent!important;filter:none!important;
        transform:none!important;mix-blend-mode:normal!important;
      }
      #shooting-event-root[data-shooting-stage="shooting_event_bullet_hell_test"] .shooting-boss.hit-flash,
      #shooting-event-root[data-shooting-stage="shooting_event_bullet_hell_test"] .shooting-boss.burst-hit,
      #shooting-event-root[data-shooting-stage="shooting_event_bullet_hell_test"] .shooting-boss.shooting-hit-sustained{
        filter:brightness(1.55) saturate(.72)!important;
      }
    `;
    document.head.appendChild(style);
  }


  if (!document.getElementById('shooting-ch43-hit-style-v75')) {
    const style = document.createElement('style');
    style.id = 'shooting-ch43-hit-style-v75';
    style.textContent = `
      #shooting-event-root[data-shooting-stage="shooting_ch04_03"] #shooting-boss.chapter43-hit-flash,
      #shooting-event-root[data-shooting-stage="shooting_ch04_03"] #shooting-boss.shooting-hit-sustained{
        filter:brightness(1.75) saturate(.62) drop-shadow(0 0 9px rgba(255,244,198,.92)) drop-shadow(0 0 18px rgba(255,188,92,.58))!important;
      }
    `;
    document.head.appendChild(style);
  }

  function getCanvasStoryChapter() {
    if (!selectedStage) return 0;
    const chapter = Number(selectedStage.chapter || 0);
    if (chapter >= 1 && chapter <= 5) return chapter;
    const m = String(selectedStage.id || '').match(/^shooting_(?:beginner_)?ch0?([1-5])_/i);
    return m ? Number(m[1] || 0) : 0;
  }

  function isCanvasEnemyBulletTestStage() {
    return !!(
      selectedStage &&
      (
        String(selectedStage.id || '') === String(SHOOTING_STAGE_ID.BULLET_HELL_TEST || '') ||
        isFacelessStage() ||
        isScoreAttackStage() ||
        isRaidStage() ||
        getCanvasStoryChapter() > 0
      )
    );
  }

  // 既存コードはp.el.remove() / classList.contains()を利用するため、
  // Canvas弾にもDOM互換の最小インターフェースだけを持たせる。
  // 実際のHTML要素は生成しない。
  function createCanvasProjectileElement(className) {
    const names = new Set(String(className || '').split(/\s+/).filter(Boolean));
    const virtual = {
      className: String(className || ''),
      id: '',
      style: { setProperty() {} },
      classList: {
        contains(name) { return names.has(name); },
        add(...items) { items.forEach(item => names.add(item)); },
        remove(...items) { items.forEach(item => names.delete(item)); },
      },
      __canvasAlive: true,
      remove() { this.__canvasAlive = false; },
    };
    Object.defineProperty(virtual, 'isConnected', {
      get() { return virtual.__canvasAlive; },
    });
    return virtual;
  }

  function ensureEnemyBulletCanvas() {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;

    let canvas = document.getElementById(ENEMY_BULLET_CANVAS_ID);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = ENEMY_BULLET_CANVAS_ID;
      canvas.setAttribute('aria-hidden', 'true');
      const forceStyle = (name, value) => canvas.style.setProperty(name, value, 'important');
      forceStyle('position', 'absolute');
      forceStyle('inset', '0');
      forceStyle('width', '100%');
      forceStyle('height', '100%');
      forceStyle('z-index', '17');
      forceStyle('display', 'block');
      forceStyle('visibility', 'visible');
      forceStyle('opacity', '1');
      forceStyle('pointer-events', 'none');
      forceStyle('background', 'transparent');
      forceStyle('filter', 'none');
      forceStyle('transform', 'none');
      arena.appendChild(canvas);
    }

    const cssWidth = Math.max(1, arena.clientWidth);
    const cssHeight = Math.max(1, arena.clientHeight);
    // Retina端末で無制限に内部解像度を上げない。弾の輪郭を保ちつつ
    // ピクセル数を抑えるため、最大1.5倍に制限する。
    const dpr = Math.min(1.5, Math.max(1, Number(window.devicePixelRatio || 1)));
    const pixelWidth = Math.round(cssWidth * dpr);
    const pixelHeight = Math.round(cssHeight * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.__shootingDpr = dpr;
    }
    return canvas;
  }

  function clearEnemyBulletCanvas() {
    const canvas = document.getElementById(ENEMY_BULLET_CANVAS_ID);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function renderCanvasEnemyBullets() {
    if (!CANVAS_ENEMY_BULLET_TEST_ENABLED || !isCanvasEnemyBulletTestStage()) {
      clearEnemyBulletCanvas();
      return;
    }
    const canvas = ensureEnemyBulletCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Number(canvas.__shootingDpr || 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;

    const bullets = (state && state.enemyBullets) || [];

    function drawCircleLayer(kind, color, scale) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const p of bullets) {
        if (!p || !p.canvasRendered || p.canvasKind !== kind || p.canvasCurtain) continue;
        const radius = Number(p.canvasRadius || 5.5) * scale;
        const x = Number(p.x || 0);
        const y = Number(p.y || 0);
        ctx.moveTo(x + radius, y);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    function drawRing(kind, color, scale, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (const p of bullets) {
        if (!p || !p.canvasRendered || p.canvasKind !== kind || p.canvasCurtain) continue;
        const radius = Number(p.canvasRadius || 5.5) * scale;
        const x = Number(p.x || 0);
        const y = Number(p.y || 0);
        ctx.moveTo(x + radius, y);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    // CH01: 神聖 / 象牙 + 金。柔らかい外輪と白い芯。
    drawCircleLayer('ch01', 'rgba(205,164,72,.24)', 1.55);
    drawCircleLayer('ch01', 'rgba(231,194,103,.97)', 1.00);
    drawCircleLayer('ch01', 'rgba(255,250,224,.99)', .42);
    drawRing('ch01', 'rgba(255,238,178,.92)', 1.05, .9);

    // CH02: 暴力 / 深紅 + 灼熱橙。重さが見える太い外殻。
    drawCircleLayer('ch02', 'rgba(122,24,32,.30)', 1.62);
    drawCircleLayer('ch02', 'rgba(199,47,48,.98)', 1.00);
    drawCircleLayer('ch02', 'rgba(255,178,83,.98)', .46);
    drawRing('ch02', 'rgba(255,218,157,.88)', 1.04, 1.0);

    // CH03: 星護 / 青紫 + 星光。冷たい外輪と白い中心。
    drawCircleLayer('ch03', 'rgba(71,66,181,.28)', 1.58);
    drawCircleLayer('ch03', 'rgba(91,119,221,.98)', 1.00);
    drawCircleLayer('ch03', 'rgba(219,239,255,.99)', .43);
    drawRing('ch03', 'rgba(170,207,255,.94)', 1.08, .9);

    // CH04: 黄色のドロップ / 流星型。
    // DOMは増やさず、Canvas上で「尾 + 丸い芯」を3層描画する軽量モデル。
    const ch04Bullets = bullets.filter(p => p && p.canvasRendered && p.canvasKind === 'ch04');

    function drawCh04MeteorFill(color, headScale, tailScale, widthScale, headOnly) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const p of ch04Bullets) {
        const x = Number(p.x || 0);
        const y = Number(p.y || 0);
        const base = Number(p.canvasRadius || 6.2);
        const vx = Number(p.vx || 0);
        const vy = Number(p.vy || (p.canvasCurtain ? 1 : 0));
        const len = Math.hypot(vx, vy) || 1;
        const ux = vx / len;
        const uy = vy / len || 1;
        const head = base * headScale;

        if (!headOnly) {
          const tail = base * (p.canvasCurtain ? tailScale * 1.25 : tailScale);
          const halfW = base * (p.canvasCurtain ? widthScale * 0.88 : widthScale);
          const bx = x - ux * head * 0.28;
          const by = y - uy * head * 0.28;
          const tx = x - ux * tail;
          const ty = y - uy * tail;
          const px = -uy * halfW;
          const py = ux * halfW;

          ctx.moveTo(tx, ty);
          ctx.lineTo(bx + px, by + py);
          ctx.lineTo(bx - px, by - py);
          ctx.closePath();
        }

        ctx.moveTo(x + head, y);
        ctx.arc(x, y, head, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    function drawCh04MeteorRing(color, headScale, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (const p of ch04Bullets) {
        const x = Number(p.x || 0);
        const y = Number(p.y || 0);
        const r = Number(p.canvasRadius || 6.2) * headScale;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    // 通常弾・カーテン弾の両方を黄色系の流星ドロップに統一。
    drawCh04MeteorFill('rgba(158,112,15,.16)', 1.10, 2.18, .72, false);
    drawCh04MeteorFill('rgba(255,209,74,.98)', .92, 1.55, .54, false);
    drawCh04MeteorFill('rgba(255,247,199,.98)', .40, .0, .0, true);
    drawCh04MeteorRing('rgba(255,231,141,.92)', .98, .9);

    // CH04-2/3「弾の壁」は、帯だけ残して「▼」ではなく雨のような流星壁にする。
    const curtainBullets = ch04Bullets.filter(p => p.canvasCurtain);
    if (curtainBullets.length) {
      const ys = [];
      for (const p of curtainBullets) ys.push(Number(p.y || 0));
      const avgY = ys.reduce((a,b)=>a+b,0) / Math.max(1, ys.length);

      ctx.strokeStyle = 'rgba(255,215,110,.11)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, avgY - 3);
      ctx.lineTo(Number(canvas.clientWidth || canvas.width / dpr), avgY - 3);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,244,196,.20)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, avgY - 3);
      ctx.lineTo(Number(canvas.clientWidth || canvas.width / dpr), avgY - 3);
      ctx.stroke();
    }

    // CH05: 幻影 / 青緑 + 紫。二重輪郭の半透明感。
    drawCircleLayer('ch05', 'rgba(71,198,195,.20)', 1.72);
    drawCircleLayer('ch05', 'rgba(101,92,190,.91)', 1.08);
    drawCircleLayer('ch05', 'rgba(191,249,239,.97)', .41);
    drawRing('ch05', 'rgba(112,223,216,.80)', 1.38, .8);
    drawRing('ch05', 'rgba(224,211,255,.86)', .82, .7);

    // SCORE ATTACK: 通常弾はピンク。
    drawCircleLayer('score', 'rgba(237,63,151,.25)', 1.48);
    drawCircleLayer('score', 'rgba(244,86,166,.99)', 1.00);
    drawCircleLayer('score', 'rgba(255,225,243,.99)', .38);

    // NOAH: 薄紫 + 白芯。重いblurは使わず、多層円 + 外輪だけで神秘感を出す。
    drawCircleLayer('noah', 'rgba(80,56,164,.18)', 1.78);
    drawCircleLayer('noah', 'rgba(128,103,228,.95)', 1.06);
    drawCircleLayer('noah', 'rgba(244,239,255,.98)', .44);
    drawRing('noah', 'rgba(197,184,255,.92)', 1.14, .95);
    drawRing('noah', 'rgba(255,255,255,.55)', .72, .65);

    // FACELESS: DARK属性カラーを黒ではなく中間紫で明示。
    // Canvas描画でもDOM弾と同じ紫系に揃え、FIREの赤 / AQUAの青と区別する。
    drawCircleLayer('faceless', 'rgba(128,84,174,.25)', 1.62);
    drawCircleLayer('faceless', 'rgba(128,84,174,.98)', 1.08);
    drawCircleLayer('faceless', 'rgba(92,54,130,1)', .66);
    drawCircleLayer('faceless', 'rgba(236,221,247,.94)', .20);
    drawRing('faceless', 'rgba(180,139,212,.96)', 1.10, .95);

    // 仮面オブジェクト由来も同じDARK紫。少し大きく、明るい紫縁を強める。
    drawCircleLayer('faceless-object', 'rgba(128,84,174,.28)', 1.72);
    drawCircleLayer('faceless-object', 'rgba(143,96,184,.99)', 1.12);
    drawCircleLayer('faceless-object', 'rgba(96,56,135,1)', .69);
    drawCircleLayer('faceless-object', 'rgba(243,231,251,.96)', .19);
    drawRing('faceless-object', 'rgba(194,157,222,.98)', 1.13, 1.05);

    // その他の通常Canvas弾。
    drawCircleLayer('normal', 'rgba(78,66,92,.94)', 1.00);

    // RAID: 緑の単色塗りから、軽量な多層エネルギー弾へ。
    // 影/blurなし、円4層 + 細いリングだけなのでDOMも描画負荷も増やさない。
    drawCircleLayer('raid', 'rgba(12,82,32,.22)', 1.72);
    drawCircleLayer('raid', 'rgba(34,190,88,.98)', 1.08);
    drawCircleLayer('raid', 'rgba(206,255,218,.98)', .44);
    drawRing('raid', 'rgba(128,241,158,.90)', 1.14, .95);

    // WARNINGは全ステージ共通で赤。通常パレットより後に描いて最優先。
    drawCircleLayer('danger', 'rgba(104,0,8,.33)', 1.35);
    drawCircleLayer('danger', 'rgba(225,36,48,.99)', 1.00);
    drawCircleLayer('danger', 'rgba(255,227,227,.99)', .32);
    drawRing('danger', 'rgba(255,123,123,.96)', 1.08, 1.2);

    // RAID laser
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const p of bullets) {
      if (!p || !p.canvasRendered || p.canvasKind !== 'raid-laser') continue;
      const angle = Math.atan2(Number(p.vy || 0), Number(p.vx || 0));
      const dx = Math.cos(angle) * 135;
      const dy = Math.sin(angle) * 135;
      const x = Number(p.x || 0), y = Number(p.y || 0);
      ctx.moveTo(x - dx, y - dy);
      ctx.lineTo(x + dx, y + dy);
    }
    ctx.strokeStyle = 'rgba(55,221,103,.45)';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    for (const p of bullets) {
      if (!p || !p.canvasRendered || p.canvasKind !== 'raid-laser') continue;
      const angle = Math.atan2(Number(p.vy || 0), Number(p.vx || 0));
      const dx = Math.cos(angle) * 135;
      const dy = Math.sin(angle) * 135;
      const x = Number(p.x || 0), y = Number(p.y || 0);
      ctx.moveTo(x - dx, y - dy);
      ctx.lineTo(x + dx, y + dy);
    }
    ctx.strokeStyle = 'rgba(238,255,243,.98)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // v178:
  // スタン/時間停止中は敵AI本体だけでなく「新しい敵弾の生成」も止める。
  // setTimeout系・OBJECT系・ステージギミック系の発射処理はgameLoop外から
  // makeProjectileへ到達することがあるため、最終入口でも必ず止める。
  function isEnemyProjectileSpawnSuppressed(now = performance.now()) {
    if (!state || state.ended || state.finishing) return false;
    const ts = Number(now || 0);

    // ノア落雷中 / エルテナ重力場中は盤面全体の敵行動が停止するため、
    // gameLoop外の遅延処理から来た弾生成も最終入口で必ず遮断する。
    if (ts < Number(state.noahMovementFreezeUntil || 0)) return true;
    if (isEnemyPullFieldActive(ts)) return true;

    if (isNormalBattle()) {
      return ts < Number(state.normalEnemyStunUntil || 0);
    }
    return ts < Number(state.bossStunUntil || 0);
  }

  function makeProjectile(cls, x, y, vx, vy, damage, ownerId) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;

    const classNameForGuard = String(cls || '');
    if (
      classNameForGuard.includes('shooting-enemy-bullet') &&
      isEnemyProjectileSpawnSuppressed(performance.now())
    ) {
      return null;
    }

    // 最初の検証ではSPECIAL STAGE「楽園 -ノア-」の敵弾だけをCanvas化する。
    // 既存ステージ・自機弾・WARNING弾などは従来DOMのままなので、
    // 問題があってもこのフラグをfalseにするだけで即座に元へ戻せる。
    if (
      CANVAS_ENEMY_BULLET_TEST_ENABLED &&
      isCanvasEnemyBulletTestStage() &&
      String(cls || '').includes('shooting-enemy-bullet')
    ) {
      const className = String(cls || '');
      const virtualEl = createCanvasProjectileElement(className);
      const isDanger = className.includes('shooting-danger-bullet');
      const isFacelessObjectBullet = className.includes('shooting-faceless-object-bullet');
      const isScoreAttackBullet = className.includes('shooting-score-attack-bullet');
      const isRaidLaser = className.includes('shooting-raid-green-laser');
      const isRaidBullet = isRaidStage();
      const storyChapter = getCanvasStoryChapter();
      const isCurtainBullet = className.includes('shooting-ch04-curtain-bullet');
      const isHeavyBullet = className.includes('shooting-violence-heavy');
      const radius = isDanger
        ? (isScoreAttackBullet ? 15 : 17)
        : (isFacelessObjectBullet
          ? 7
          : (isScoreAttackBullet
            ? 7
            : (isRaidBullet ? 6.2 : (storyChapter === 2 && isHeavyBullet ? 8.4 : (storyChapter === 4 ? 6.2 : 5.8)))));
      const canvasKind = isDanger
        ? 'danger'
        : (isFacelessObjectBullet
          ? 'faceless-object'
          : (isScoreAttackBullet
            ? 'score'
            : (isRaidLaser
              ? 'raid-laser'
              : (isRaidBullet
                ? 'raid'
                : (isNoahStage()
                  ? 'noah'
                  : (isFacelessStage() ? 'faceless' : (storyChapter ? `ch0${storyChapter}` : 'normal')))))));
      const p = {
        el: virtualEl,
        x, y, vx, vy,
        damage: damage || 1,
        ownerId: ownerId || null,
        canvasRendered: true,
        canvasKind,
        canvasRadius: radius,
        canvasCurtain: isCurtainBullet,
        canvasHalfWidth: isRaidLaser ? 135 : radius,
        canvasHalfHeight: isRaidLaser ? 2.5 : radius,
      };
      measureUnitSize(p);
      return p;
    }

    const el = document.createElement('i');
    el.className = cls;
    arena.appendChild(el);
    const p = { el, x, y, vx, vy, damage: damage || 1, ownerId: ownerId || null };
    positionUnit(el, x, y);
    measureUnitSize(p);
    return p;
  }

  function isProtectedEnemyProjectile(p) {
    if (!p) return false;
    if (p.dangerRicochet || p.dangerDrift) return true;
    const el = p.el;
    if (!el || !el.classList) return false;
    // 将来WARNING弾のクラス名が増えても、danger / warning を含むものは保護する。
    const cls = String(el.className || '').toLowerCase();
    return cls.includes('danger') || cls.includes('warning');
  }

  function enforceEnemyBulletSafetyLimit(now) {
    if (!state || !Array.isArray(state.enemyBullets)) return;
    const current = state.enemyBullets.length;
    const scoreCfg = isScoreAttackStage() && selectedStage && selectedStage.scoreAttack ? selectedStage.scoreAttack : null;
    const scoreAttackLimits = scoreCfg ? {
      hard: Math.max(30, Number(scoreCfg.maxEnemyBullets || 80)),
      recovery: Math.max(20, Number(scoreCfg.recoverEnemyBulletsTo || 60))
    } : null;
    const noahLimits = !scoreAttackLimits && isNoahStage() ? { hard: 90, recovery: 64 } : null;
    const raidLimits = !scoreAttackLimits && !noahLimits && isRaidStage() ? getRaidEnemyBulletLimits() : null;
    const ch03BossLimits = !scoreAttackLimits && !noahLimits && !raidLimits && isChapter03BossStage() ? getChapter03BossEnemyBulletLimits() : null;
    const hardLimit = scoreAttackLimits ? scoreAttackLimits.hard : (noahLimits ? noahLimits.hard : (raidLimits ? raidLimits.hard : (ch03BossLimits ? ch03BossLimits.hard : ENEMY_BULLET_HARD_LIMIT)));
    const recoveryTarget = scoreAttackLimits ? scoreAttackLimits.recovery : (noahLimits ? noahLimits.recovery : (raidLimits ? raidLimits.recovery : (ch03BossLimits ? ch03BossLimits.recovery : ENEMY_BULLET_RECOVERY_TARGET)));
    if (current <= hardLimit) return;

    let removeNeeded = Math.max(0, current - recoveryTarget);
    let removed = 0;
    const kept = [];

    // enemyBulletsは生成順にpushされるため、先頭から整理すると古い通常弾から消える。
    // 危険弾は上限超過時でも残し、ゲーム固有ギミックを壊さない。
    for (const p of state.enemyBullets) {
      if (removeNeeded > 0 && p && p.el && !isProtectedEnemyProjectile(p)) {
        p.el.remove();
        removeNeeded--;
        removed++;
        continue;
      }
      kept.push(p);
    }

    state.enemyBullets = kept;

    // テスト時に発動有無を追えるよう、最大5秒に1回だけconsoleへ記録。
    if (removed > 0 && now - lastEnemyBulletGuardLogAt >= 5000) {
      lastEnemyBulletGuardLogAt = now;
      console.warn(`[shooting] enemy bullet safety guard: ${current} -> ${state.enemyBullets.length}`);
    }
  }

  function enforcePlayerBulletSafetyLimit(now) {
    if (!state || !Array.isArray(state.bullets)) return;
    const current = state.bullets.length;
    const scoreCfg = isScoreAttackStage() && selectedStage && selectedStage.scoreAttack ? selectedStage.scoreAttack : null;
    const scoreAttackLimits = scoreCfg ? {
      hard: Math.max(24, Number(scoreCfg.maxPlayerBullets || 60)),
      recovery: Math.max(18, Number(scoreCfg.recoverPlayerBulletsTo || 45))
    } : null;
    const raidLimits = !scoreAttackLimits && isRaidStage() ? getRaidPlayerBulletLimits() : null;
    const hardLimit = scoreAttackLimits ? scoreAttackLimits.hard : (raidLimits ? raidLimits.hard : PLAYER_BULLET_HARD_LIMIT);
    const recoveryTarget = scoreAttackLimits ? scoreAttackLimits.recovery : (raidLimits ? raidLimits.recovery : PLAYER_BULLET_RECOVERY_TARGET);
    if (current <= hardLimit) return;

    let removeNeeded = Math.max(0, current - recoveryTarget);
    let removed = 0;
    const kept = [];

    // state.bulletsも生成順にpushされるため、古い自機弾から間引く。
    for (const p of state.bullets) {
      if (removeNeeded > 0 && p && p.el) {
        p.el.remove();
        removeNeeded--;
        removed++;
        continue;
      }
      kept.push(p);
    }

    state.bullets = kept;

    if (removed > 0 && now - lastPlayerBulletGuardLogAt >= 5000) {
      lastPlayerBulletGuardLogAt = now;
      console.warn(`[shooting] player bullet safety guard: ${current} -> ${state.bullets.length}`);
    }
  }

  function getRaidOrdinaryEnemyBulletCount() {
    if (!state || !Array.isArray(state.enemyBullets)) return 0;
    let count = 0;
    for (const p of state.enemyBullets) {
      if (p && p.el && !isProtectedEnemyProjectile(p)) count++;
    }
    return count;
  }

  function getCharacterElements(c) {
    if (!c) return [];
    const raw =
      c.element ??
      c.attribute ??
      c.typeAttribute ??
      c.affinity ??
      [];

    const list = Array.isArray(raw) ? raw : [raw];
    return list
      .map(v => String(v || '').toLowerCase().trim())
      .filter(Boolean);
  }

  function getCharacterBulletClass(c) {
    const elements = getCharacterElements(c);

    if (elements.some(v => v === 'fire' || v === '火')) return ' shooting-bullet-fire';
    if (elements.some(v => v === 'aqua' || v === 'water' || v === '水')) return ' shooting-bullet-aqua';
    if (elements.some(v => v === 'wood' || v === '木')) return ' shooting-bullet-wood';
    if (elements.some(v => v === 'dark' || v === '闇')) return ' shooting-bullet-dark';
    if (elements.some(v => v === 'light' || v === '光')) return ' shooting-bullet-light';
    return '';
  }

  // ============================================================
  // v211: 5属性ダメージ補正
  // AQUA > FIRE > WOOD > AQUA
  // LIGHT <-> DARK は相互弱点
  // 有利 1.30 / 不利 0.70 / その他 1.00
  // ============================================================
  const ELEMENT_DAMAGE_RATE = Object.freeze({
    strong: 1.30,
    weak: 0.70,
    neutral: 1.00,
  });

  function normalizeCombatElement(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'neutral' || raw === 'none' || raw === '無' || raw === '無属性') return 'neutral';
    if (raw === 'aqua' || raw === 'water' || raw === '水') return 'aqua';
    if (raw === 'fire' || raw === '火') return 'fire';
    if (raw === 'wood' || raw === '木') return 'wood';
    if (raw === 'dark' || raw === '闇') return 'dark';
    if (raw === 'light' || raw === '光') return 'light';
    return '';
  }

  const COMBAT_ELEMENT_ICON_IMAGE = Object.freeze({
    neutral: 'images/type_neutral.webp',
    aqua: 'images/type_aqua.webp',
    fire: 'images/type_fire.webp',
    wood: 'images/type_wood.webp',
    dark: 'images/type_dark.webp',
    light: 'images/type_light.webp',
  });

  function getCombatElementIcon(element) {
    const key = normalizeCombatElement(element);
    return COMBAT_ELEMENT_ICON_IMAGE[key] || '';
  }

  function setEnemyHpElementIcon(holder, element, className) {
    if (!holder) return;
    const iconSrc = getCombatElementIcon(element);
    let icon = holder.querySelector(`.${className}`);
    if (!iconSrc) {
      if (icon) icon.style.display = 'none';
      return;
    }
    if (!icon) {
      icon = document.createElement('img');
      icon.className = className;
      icon.alt = '';
      icon.setAttribute('aria-hidden', 'true');
      icon.draggable = false;
      holder.appendChild(icon);
    }
    if (icon.getAttribute('src') !== iconSrc) icon.src = iconSrc;
    icon.style.display = '';
  }

  function renderBossElementIcon() {
    const bossHud = document.querySelector(`#${ROOT_ID} .shooting-boss-hud`);
    if (!bossHud || !state || !state.boss) return;
    setEnemyHpElementIcon(
      bossHud,
      state.boss.element,
      'shooting-boss-element-icon'
    );
  }

  function renderActivePlayerElementIcon() {
    const iconEl = document.getElementById('shooting-player-element-icon');
    if (!iconEl) return;
    const activeId = state?.activeCharacterId || selectedCharacterId;
    const c = activeId ? getBattleCharacter(activeId) : getCurrentCharacter();
    const iconSrc = getCombatElementIcon(c && c.element);
    if (!iconSrc) {
      iconEl.style.display = 'none';
      return;
    }
    if (iconEl.getAttribute('src') !== iconSrc) iconEl.src = iconSrc;
    iconEl.style.display = '';
  }

  function getElementDamageMultiplier(attackElement, targetElement) {
    const atk = normalizeCombatElement(attackElement);
    const def = normalizeCombatElement(targetElement);
    if (!atk || !def || atk === def) return ELEMENT_DAMAGE_RATE.neutral;

    // NEUTRAL has no advantage or disadvantage against anything.
    if (atk === 'neutral' || def === 'neutral') return ELEMENT_DAMAGE_RATE.neutral;

    // 三すくみ：水 > 火 > 木 > 水
    const strongAgainst = {
      aqua: 'fire',
      fire: 'wood',
      wood: 'aqua',
    };
    if (strongAgainst[atk] === def) return ELEMENT_DAMAGE_RATE.strong;
    if (strongAgainst[def] === atk) return ELEMENT_DAMAGE_RATE.weak;

    // 光と闇は、お互いに弱点を突く。
    if (
      (atk === 'light' && def === 'dark') ||
      (atk === 'dark' && def === 'light')
    ) {
      return ELEMENT_DAMAGE_RATE.strong;
    }

    return ELEMENT_DAMAGE_RATE.neutral;
  }

  function getCombatTargetElement(target, fallbackElement) {
    if (!target) return normalizeCombatElement(fallbackElement);
    return normalizeCombatElement(
      target.element ||
      target.def?.element ||
      target.enemyElement ||
      fallbackElement
    );
  }

  // build504: 全ULTに戦闘属性を付与。
  // 原則はキャラ属性、ultElement が指定されている場合のみ上書き。
  // 不明値は必ず neutral にフォールバックする。
  function getUltAttackElement(c) {
    return normalizeCombatElement(c && (c.ultElement ?? c.element)) || 'neutral';
  }

  const ULT_ELEMENT_VISUAL = Object.freeze({
    neutral: { color:'#f4efe3', rgb:'244,239,227', filter:'grayscale(1) brightness(1.16)' },
    fire:    { color:'#e64b43', rgb:'230,75,67',  filter:'grayscale(1) sepia(1) saturate(8) hue-rotate(318deg) brightness(1.02)' },
    aqua:    { color:'#4aaee8', rgb:'74,174,232', filter:'grayscale(1) sepia(1) saturate(7) hue-rotate(150deg) brightness(1.04)' },
    wood:    { color:'#67b96a', rgb:'103,185,106',filter:'grayscale(1) sepia(1) saturate(6) hue-rotate(72deg) brightness(.98)' },
    light:   { color:'#e7c85a', rgb:'231,200,90', filter:'grayscale(1) sepia(1) saturate(5) hue-rotate(2deg) brightness(1.15)' },
    dark:    { color:'#8054ae', rgb:'128,84,174', filter:'grayscale(1) sepia(1) saturate(5.2) hue-rotate(225deg) brightness(.86)' },
  });

  // ============================================================
  // build777: BOMB専用ビジュアル / 分裂ロジック
  // 投擲BOMBは着弾時に爆風ダメージを出さず、BOMB 4/6/8の分裂弾へ変換する。
  // 4はX字、6/8は360度等間隔。分裂弾1発は元弾の50%ダメージ。
  // ============================================================
  function getBombElementVisual(element) {
    const key = normalizeCombatElement(element) || 'neutral';
    return ULT_ELEMENT_VISUAL[key] || ULT_ELEMENT_VISUAL.neutral;
  }


  function createLightningChainEffect(x1, y1, x2, y2, jumpIndex = 0) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const width = Math.max(1, Number(arena.clientWidth || 0));
    const height = Math.max(1, Number(arena.clientHeight || 0));
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('class', 'shooting-lightning-chain-effect');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    const dx = Number(x2 || 0) - Number(x1 || 0);
    const dy = Number(y2 || 0) - Number(y1 || 0);
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    const segments = 6;
    const points = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      let px = Number(x1 || 0) + dx * t;
      let py = Number(y1 || 0) + dy * t;
      if (i > 0 && i < segments) {
        const wave =
          Math.sin((i + 1.35 * jumpIndex) * 2.17) * 7 +
          Math.sin((i + 0.6 * jumpIndex) * 4.03) * 3.5;
        px += nx * wave;
        py += ny * wave;
      }
      points.push([px, py]);
    }

    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

    const glow = document.createElementNS(svgNs, 'path');
    glow.setAttribute('class', 'shooting-lightning-chain-glow');
    glow.setAttribute('d', d);

    const corePath = document.createElementNS(svgNs, 'path');
    corePath.setAttribute('class', 'shooting-lightning-chain-core');
    corePath.setAttribute('d', d);

    const hit = document.createElementNS(svgNs, 'circle');
    hit.setAttribute('class', 'shooting-lightning-chain-hit');
    hit.setAttribute('cx', String(Number(x2 || 0)));
    hit.setAttribute('cy', String(Number(y2 || 0)));
    hit.setAttribute('r', String(Math.max(4, 7 - jumpIndex)));

    svg.appendChild(glow);
    svg.appendChild(corePath);
    svg.appendChild(hit);
    arena.appendChild(svg);

    requestAnimationFrame(() => {
      svg.style.transition = 'opacity 150ms ease-out';
      svg.style.opacity = '0';
    });
    setTimeout(() => {
      if (svg && svg.parentNode) svg.remove();
    }, 180);
  }

  function applyLightningChain(p, originTarget, now, chara, ownerId) {
    if (!p || !originTarget || !state) return 0;

    const maxJumps = Math.max(0, Math.floor(Number(p.lightningMaxJumps || 0)));
    const radius = Math.max(24, Number(p.lightningChainRadius || 0));
    const baseRate = Math.max(0, Number(p.lightningChainDamageRate || 0));
    const decay = Math.max(0, Math.min(1, Number(p.lightningChainDecay || 1)));
    if (!maxJumps || !radius || !baseRate) return 0;

    const visited = new Set([originTarget]);
    let from = originTarget;
    let appliedCount = 0;

    for (let jump = 0; jump < maxJumps; jump++) {
      const fromX = Number(from.x || 0);
      const fromY = Number(from.y || 0);

      let next = null;
      let nextDistance = Infinity;

      (state.normalEnemies || []).forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0 || visited.has(enemy)) return;
        const distance = Math.hypot(
          Number(enemy.x || 0) - fromX,
          Number(enemy.y || 0) - fromY
        );
        if (distance <= radius && distance < nextDistance) {
          next = enemy;
          nextDistance = distance;
        }
      });

      if (!next) break;

      visited.add(next);
      const toX = Number(next.x || 0);
      const toY = Number(next.y || 0);
      createLightningChainEffect(fromX, fromY, toX, toY, jump);

      const attackElement = normalizeCombatElement(
        p.attackElement || p.element || chara.element
      );
      const targetElement = getCombatTargetElement(next);
      const rate = baseRate * Math.pow(decay, jump);
      const chainDamage = applyElementDamage(
        Number(p.damage || 0) * rate,
        attackElement,
        targetElement
      );
      const applied = damageNormalEnemy(
        next,
        chainDamage,
        now,
        true,
        getElementDamageReaction(attackElement, targetElement)
      );

      if (applied > 0) {
        appliedCount++;
        state.shotsHit += 1;
        if (!p.noComboGain) registerComboHit(ownerId, now);
        // 連鎖HitはULTゲージを追加しない。密集時だけゲージ効率が跳ねないようにする。
      }

      from = next;
    }

    if (appliedCount > 0) {
      state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
    }
    return appliedCount;
  }

  // ============================================================
  // build807: ニーナ通常攻撃 / WILD CONTACT CHAIN LIGHTNING
  // ・弾を生成しない
  // ・220px圏内を先端が不規則に暴れ、接触した敵/OBJECTへロック
  // ・接続後は250pxまで維持し、超えると切断
  // ・そこから近い順に最大4体へ伝播
  // ・ダメージ比率 100% -> 50% -> 25% -> 12.5%
  // ・1射を複数tickへ分け、短いSVGを連続再描画してジリジリ感を出す
  // ============================================================
  function getNinaConductiveTargets() {
    if (!state) return [];
    const targets = [];

    (state.normalEnemies || []).forEach(enemy => {
      if (!enemy || !enemy.el || enemy.hp <= 0) return;
      targets.push({ kind:'enemy', ref:enemy, x:Number(enemy.x || 0), y:Number(enemy.y || 0) });
    });

    // SPECIAL EVENT等の破壊可能OBJECTも通常敵と同じ導電対象に含める。
    (state.facelessObjects || []).forEach(obj => {
      if (!obj || !obj.el || obj.hp <= 0) return;
      targets.push({ kind:'object', ref:obj, x:Number(obj.x || 0), y:Number(obj.y || 0) });
    });

    if (!isNormalBattle() && state.boss && state.boss.hp > 0) {
      targets.push({
        kind:'boss',
        ref:state.boss,
        x:Number(state.boss.x || 0),
        y:Number(state.boss.y || 0)
      });
    }

    return targets;
  }

  function getNinaTargetSnapshot(target) {
    if (!target || !target.ref) return null;
    const fresh = getNinaConductiveTargets();
    return fresh.find(item => item && item.kind === target.kind && item.ref === target.ref) || null;
  }

  function getNinaDistanceFromPlayer(target) {
    if (!state?.player || !target) return Infinity;
    const fromX = Number(state.player.x || 0);
    const fromY = Number(state.player.y || 0) - 22;
    return Math.hypot(Number(target.x || 0) - fromX, Number(target.y || 0) - fromY);
  }

  function pickNinaAcquireTarget(acquireRange) {
    const range = Math.max(24, Number(acquireRange || 220));
    const candidates = getNinaConductiveTargets()
      .map(target => ({ target, distance:getNinaDistanceFromPlayer(target) }))
      .filter(entry => entry.distance <= range);
    if (!candidates.length) return null;

    // 最寄り寄りだが完全固定にはしない。電撃の先端が220px圏内を暴れ、
    // 近くにいる対象へ偶発的に触れる感触を残すため、距離へ小さな乱数を掛ける。
    candidates.forEach(entry => {
      entry.score = entry.distance * (.82 + Math.random() * .36);
    });
    candidates.sort((a,b) => a.score - b.score);
    return candidates[0].target;
  }

  function buildNinaConductiveChain(maxTargets, primaryTarget, chainRange) {
    const primary = getNinaTargetSnapshot(primaryTarget);
    if (!primary) return [];

    const pool = getNinaConductiveTargets().filter(item => item && item.ref !== primary.ref);
    const chain = [primary];
    const limit = Math.max(1, Math.min(4, Math.floor(Number(maxTargets || 4))));
    const maxLinkDistance = Math.max(24, Number(chainRange || 160));
    let fromX = Number(primary.x || 0);
    let fromY = Number(primary.y || 0);

    while (pool.length && chain.length < limit) {
      let bestIndex = -1;
      let bestDistance = Infinity;
      for (let i = 0; i < pool.length; i++) {
        const target = pool[i];
        const distance = Math.hypot(Number(target.x || 0) - fromX, Number(target.y || 0) - fromY);
        if (distance <= maxLinkDistance && distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
      if (bestIndex < 0) break;
      const next = pool.splice(bestIndex, 1)[0];
      chain.push(next);
      fromX = Number(next.x || 0);
      fromY = Number(next.y || 0);
    }
    return chain;
  }

  function buildNinaElectricPath(x1, y1, x2, y2, pulseIndex, linkIndex, jitterScale) {
    const dx = Number(x2 || 0) - Number(x1 || 0);
    const dy = Number(y2 || 0) - Number(y1 || 0);
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    const segments = Math.max(7, Math.min(12, Math.round(len / 34)));
    const points = [];
    const seed = (Number(pulseIndex || 0) + 1) * 1.91 + (Number(linkIndex || 0) + 1) * 2.73;
    const jitter = Math.max(3.5, Math.min(11, Number(jitterScale || 1) * (4.2 + len * .012)));

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      let px = Number(x1 || 0) + dx * t;
      let py = Number(y1 || 0) + dy * t;
      if (i > 0 && i < segments) {
        // 毎tick形を変える2周波の折れ。滑らかな波ではなく電気的なギザつきを優先。
        const sign = ((i + pulseIndex + linkIndex) % 2 === 0) ? 1 : -1;
        const wave =
          sign * jitter * (.48 + Math.random() * .72) +
          Math.sin((i + seed) * 2.41) * jitter * .34;
        px += nx * wave;
        py += ny * wave;
      }
      points.push([px, py]);
    }

    return {
      d: points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '),
      points
    };
  }

  function createNinaElectricNetworkEffect(chain, element, pulseIndex) {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !Array.isArray(chain) || !chain.length || !state?.player) return;

    const width = Math.max(1, Number(arena.clientWidth || 0));
    const height = Math.max(1, Number(arena.clientHeight || 0));
    const visual = ULT_ELEMENT_VISUAL[normalizeCombatElement(element) || 'neutral'] || ULT_ELEMENT_VISUAL.neutral;
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute(
      'class',
      'shooting-nina-electric-network' + (isNinaOutputMaxActive(performance.now()) ? ' is-output-max' : '')
    );
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.setProperty('--nina-electric-rgb', visual.rgb);
    svg.style.setProperty('--nina-electric-color', visual.color);

    let fromX = Number(state.player.x || 0);
    let fromY = Number(state.player.y || 0) - 22;

    chain.forEach((target, linkIndex) => {
      const toX = Number(target.x || 0);
      const toY = Number(target.y || 0);
      const built = buildNinaElectricPath(fromX, fromY, toX, toY, pulseIndex, linkIndex, 1);

      const glow = document.createElementNS(svgNs, 'path');
      glow.setAttribute('class', 'shooting-nina-electric-glow');
      glow.setAttribute('d', built.d);
      svg.appendChild(glow);

      const color = document.createElementNS(svgNs, 'path');
      color.setAttribute('class', 'shooting-nina-electric-color');
      color.setAttribute('d', built.d);
      svg.appendChild(color);

      const core = document.createElementNS(svgNs, 'path');
      core.setAttribute('class', 'shooting-nina-electric-core');
      core.setAttribute('d', built.d);
      svg.appendChild(core);

      // 主幹から短い枝を1本だけ出し、毎tick方向を変えて「ジリジリ」感を出す。
      if (built.points.length >= 5) {
        const mid = built.points[Math.max(2, Math.min(built.points.length - 3, Math.floor(built.points.length * .56)))];
        const dx = toX - fromX;
        const dy = toY - fromY;
        const len = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / len;
        const ny = dx / len;
        const branchSign = ((pulseIndex + linkIndex) % 2 === 0) ? 1 : -1;
        const branchLen = 9 + Math.random() * 11;
        const branch = document.createElementNS(svgNs, 'path');
        branch.setAttribute('class', 'shooting-nina-electric-branch');
        branch.setAttribute('d', `M ${mid[0].toFixed(1)} ${mid[1].toFixed(1)} L ${(mid[0] + nx * branchLen * branchSign).toFixed(1)} ${(mid[1] + ny * branchLen * branchSign).toFixed(1)}`);
        svg.appendChild(branch);
      }

      const hit = document.createElementNS(svgNs, 'circle');
      hit.setAttribute('class', 'shooting-nina-electric-hit');
      hit.setAttribute('cx', String(toX));
      hit.setAttribute('cy', String(toY));
      hit.setAttribute('r', String(Math.max(3.2, 6.2 - linkIndex * .7)));
      svg.appendChild(hit);

      fromX = toX;
      fromY = toY;
    });

    arena.appendChild(svg);
    setTimeout(() => { if (svg && svg.isConnected) svg.remove(); }, 118);
  }

  function createNinaElectricSeekEffect(element, pulseIndex, acquireRange, pendingTarget) {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !state?.player) return;

    const width = Math.max(1, Number(arena.clientWidth || 0));
    const height = Math.max(1, Number(arena.clientHeight || 0));
    const visual = ULT_ELEMENT_VISUAL[normalizeCombatElement(element) || 'neutral'] || ULT_ELEMENT_VISUAL.neutral;
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute(
      'class',
      'shooting-nina-electric-network' + (isNinaOutputMaxActive(performance.now()) ? ' is-output-max' : '')
    );
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.setProperty('--nina-electric-rgb', visual.rgb);
    svg.style.setProperty('--nina-electric-color', visual.color);
    svg.style.opacity = '.82';

    const fromX = Number(state.player.x || 0);
    const fromY = Number(state.player.y || 0) - 22;
    const range = Math.max(24, Number(acquireRange || 220));
    const phase = Number(state.ninaLightningSeekPhase || 0) + 1;
    state.ninaLightningSeekPhase = phase;

    let toX;
    let toY;
    const target = getNinaTargetSnapshot(pendingTarget);
    if (target && getNinaDistanceFromPlayer(target) <= range) {
      // 接触直前は対象の周囲を不規則に舐める。次のpulseで対象へ噛みつく。
      const angle = phase * 2.17 + Math.random() * 2.6;
      const miss = 18 + Math.random() * 28;
      toX = Number(target.x || 0) + Math.cos(angle) * miss;
      toY = Number(target.y || 0) + Math.sin(angle) * miss;
    } else {
      // 射程内に対象がいない時も、220px圏内を探る短い放電だけは見せる。
      const angle = phase * 1.73 + Math.random() * 2.8;
      const radius = range * (.52 + Math.random() * .46);
      toX = fromX + Math.cos(angle) * radius;
      toY = fromY + Math.sin(angle) * radius;
    }

    const built = buildNinaElectricPath(fromX, fromY, toX, toY, pulseIndex, -1, 1.25);
    ['shooting-nina-electric-glow','shooting-nina-electric-color','shooting-nina-electric-core'].forEach(cls => {
      const path = document.createElementNS(svgNs, 'path');
      path.setAttribute('class', cls);
      path.setAttribute('d', built.d);
      svg.appendChild(path);
    });

    if (built.points.length >= 4) {
      const mid = built.points[Math.floor(built.points.length * .62)];
      const dx = toX - fromX;
      const dy = toY - fromY;
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / len;
      const ny = dx / len;
      const branchSign = phase % 2 ? 1 : -1;
      const branchLen = 12 + Math.random() * 14;
      const branch = document.createElementNS(svgNs, 'path');
      branch.setAttribute('class', 'shooting-nina-electric-branch');
      branch.setAttribute('d', `M ${mid[0].toFixed(1)} ${mid[1].toFixed(1)} L ${(mid[0] + nx * branchLen * branchSign).toFixed(1)} ${(mid[1] + ny * branchLen * branchSign).toFixed(1)}`);
      svg.appendChild(branch);
    }

    arena.appendChild(svg);
    setTimeout(() => { if (svg && svg.isConnected) svg.remove(); }, 112);
  }

  function damageNinaConductiveTarget(target, amount, now, c, suppressVisual) {
    if (!target || !target.ref || amount <= 0) return 0;
    const attackElement = normalizeCombatElement(c?.element) || 'light';
    const ref = target.ref;

    if (target.kind === 'enemy') {
      const targetElement = getCombatTargetElement(ref);
      const finalDamage = applyElementDamage(amount, attackElement, targetElement);
      return damageNormalEnemy(
        ref,
        finalDamage,
        now,
        false,
        getElementDamageReaction(attackElement, targetElement),
        !!suppressVisual
      );
    }

    if (target.kind === 'object') {
      const targetElement = getCombatTargetElement(ref, state?.boss?.element);
      const finalDamage = applyElementDamage(amount, attackElement, targetElement);
      return damageFacelessObject(
        ref,
        finalDamage,
        now,
        getElementDamageReaction(attackElement, targetElement),
        !!suppressVisual
      );
    }

    if (target.kind === 'boss' && state?.boss && state.boss.hp > 0) {
      const targetElement = getCombatTargetElement(state.boss);
      const finalDamage = applyElementDamage(amount, attackElement, targetElement);
      const applied = Math.min(state.boss.hp, Math.max(0, Number(finalDamage || 0)));
      state.boss.hp = Math.max(0, state.boss.hp - applied);
      updateBossPhase();

      if (!suppressVisual && applied > 0) {
        createHit(Number(state.boss.x || 0), Number(state.boss.y || 0), false);
        flashBossHit(false, true);
        if (!isRaidStage() || shouldRenderRaidBossHitVisual(now, 'number')) {
          showBossDamageNumber(applied, false, getElementDamageReaction(attackElement, targetElement));
        }
      }

      if (!addScoreAttackDamageScore(applied)) addLegacyCombatScore(Math.round(applied * 100));
      if (state.boss.hp <= 0) beginBossDefeat();
      return applied;
    }

    return 0;
  }

  function isNinaOutputMaxActive(now) {
    if (!state) return false;
    const ts = Number(now || performance.now());
    return ts < Number(state.ninaOutputMaxUntil || 0);
  }

  function fireNinaChainLightning(c, effectivePower, now) {
    if (!state || !c || !state.player) return;

    const outputMaxActive = isNinaOutputMaxActive(now);
    const outputPowerMultiplier = outputMaxActive
      ? Math.max(1, Number(c.ninaOutputMaxPowerMultiplier || 1.5))
      : 1;
    const outputRangeMultiplier = outputMaxActive
      ? Math.max(1, Number(c.ninaOutputMaxRangeMultiplier || 2.0))
      : 1;
    const boostedEffectivePower = Number(effectivePower || 0) * outputPowerMultiplier;

    const maxTargets = Math.max(1, Math.min(4, Math.floor(Number(c.lightningMaxTargets || 4))));
    const tickCount = Math.max(2, Math.min(6, Math.floor(Number(c.lightningTickCount || 4))));
    const tickMs = Math.max(45, Number(c.lightningTickMs || 70));
    const decay = Math.max(0, Math.min(1, Number(c.lightningChainDecay ?? 0.5)));
    const acquireRange = Math.max(24, Number(c.lightningAcquireRange || 220) * outputRangeMultiplier);
    const releaseRange = Math.max(acquireRange, Number(c.lightningReleaseRange || 250) * outputRangeMultiplier);
    const chainRange = Math.max(24, Number(c.lightningChainRange || 160) * outputRangeMultiplier);
    const ownerId = Number(c.id || 0);

    // 指を離してしばらく経ってから再度撃ち始めた場合は、古いロックを持ち越さない。
    const previousFireAt = Number(state.ninaLightningLastFireAt || 0);
    const reconnectGrace = Math.max(420, Number(c.fireRate || 300) * 1.55);
    if (!previousFireAt || Number(now || 0) - previousFireAt > reconnectGrace) {
      state.ninaLightningLockedTarget = null;
      state.ninaLightningPendingTarget = null;
    }
    state.ninaLightningLastFireAt = Number(now || performance.now());

    let locked = getNinaTargetSnapshot(state.ninaLightningLockedTarget);
    if (locked && getNinaDistanceFromPlayer(locked) > releaseRange) {
      // 220pxで掴み、250pxを越えるまでは接続維持。250px超過でブツッと切る。
      locked = null;
      state.ninaLightningLockedTarget = null;
    }

    let pending = null;
    let pendingLockPulse = 0;
    if (!locked) {
      pending = pickNinaAcquireTarget(acquireRange);
      state.ninaLightningPendingTarget = pending;
      // 1〜2pulseだけ先端を暴れさせてから接触。即必中に見えないための短い遊び。
      pendingLockPulse = pending ? Math.min(tickCount - 1, 1 + Math.floor(Math.random() * 2)) : tickCount;
    } else {
      state.ninaLightningPendingTarget = null;
    }

    const token = Number(state.ninaLightningAttackToken || 0) + 1;
    state.ninaLightningAttackToken = token;
    let lockReadyPulse = locked ? 0 : null;

    const pulse = (pulseIndex) => {
      if (!state || state.ended || state.finishing) return;
      if (Number(state.ninaLightningAttackToken || 0) !== token) return;
      const active = getCurrentCharacter();
      if (!active || Number(active.id || 0) !== ownerId || !pointerActive) return;

      // 既存ロックは250pxまで粘る。対象死亡・消失でも切断。
      locked = getNinaTargetSnapshot(state.ninaLightningLockedTarget || locked);
      if (locked && getNinaDistanceFromPlayer(locked) > releaseRange) {
        locked = null;
        state.ninaLightningLockedTarget = null;
        lockReadyPulse = null;
      }

      // 未接続なら220px圏内をビリビリ探索。候補がいれば少し暴れてから噛みつく。
      if (!locked) {
        pending = getNinaTargetSnapshot(pending || state.ninaLightningPendingTarget);
        if (!pending || getNinaDistanceFromPlayer(pending) > acquireRange) {
          pending = pickNinaAcquireTarget(acquireRange);
          state.ninaLightningPendingTarget = pending;
          pendingLockPulse = pending ? Math.min(tickCount - 1, pulseIndex + 1) : tickCount;
        }

        if (pending && pulseIndex >= pendingLockPulse && getNinaDistanceFromPlayer(pending) <= acquireRange) {
          locked = pending;
          state.ninaLightningLockedTarget = locked;
          state.ninaLightningPendingTarget = null;
          lockReadyPulse = pulseIndex;
        } else {
          createNinaElectricSeekEffect(c.element, pulseIndex, acquireRange, pending);
          return;
        }
      }

      const chain = buildNinaConductiveChain(maxTargets, locked, chainRange);
      if (!chain.length) {
        state.ninaLightningLockedTarget = null;
        return;
      }

      // 属性色の電撃網を毎tick作り直す。線形レーザーではなく、常に細かくジリジリ暴れる。
      createNinaElectricNetworkEffect(chain, c.element, pulseIndex);

      const activeDamageTicks = Math.max(1, tickCount - Number(lockReadyPulse || 0));
      let firstPulseHits = 0;
      chain.forEach((target, index) => {
        // 1射全体のダメージを有効tick数へ分割。伝播倍率は 100 / 50 / 25 / 12.5%。
        const chainRate = Math.pow(decay, index);
        const tickDamage = boostedEffectivePower * chainRate / activeDamageTicks;
        const isFirstDamagePulse = pulseIndex === Number(lockReadyPulse || 0);
        const applied = damageNinaConductiveTarget(target, tickDamage, performance.now(), c, !isFirstDamagePulse);
        if (isFirstDamagePulse && applied > 0) {
          firstPulseHits++;
          state.shotsHit = Number(state.shotsHit || 0) + 1;
          registerComboHit(ownerId, now);
        }
      });

      if (pulseIndex === Number(lockReadyPulse || 0) && firstPulseHits > 0) {
        // 連鎖数でULTゲージが過剰加速しないよう1射=1Hit分だけ加算。
        grantUltGaugeForHits(c, 1, ownerId);
      }

      state.normalEnemies = (state.normalEnemies || []).filter(enemy => enemy && enemy.hp > 0);
      if (isNormalBattle()) evaluateNormalMission(performance.now());
      renderHud();
    };

    pulse(0);
    for (let i = 1; i < tickCount; i++) {
      setTimeout(() => pulse(i), i * tickMs);
    }
  }

  function ensureBombVisualStyles() {
    const styleId = 'shooting-bomb-visual-style-build777';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .shooting-bullet-splash{
        width:20px!important;
        height:20px!important;
        border-radius:50%!important;
        border:1px solid rgba(255,255,255,.42)!important;
        background:
          radial-gradient(circle at 34% 28%,rgba(255,255,255,.98) 0 11%,rgba(255,255,255,.42) 12% 20%,transparent 21%),
          radial-gradient(circle at 50% 54%,rgba(var(--bomb-rgb,244,239,227),.98) 0 35%,var(--bomb-color,#f4efe3) 36% 67%,rgba(34,28,35,.95) 68% 100%)!important;
        box-shadow:
          0 0 8px rgba(var(--bomb-rgb,244,239,227),.78),
          0 0 16px rgba(var(--bomb-rgb,244,239,227),.34),
          inset -3px -4px 5px rgba(0,0,0,.34),
          inset 2px 2px 4px rgba(255,255,255,.24)!important;
        transform-origin:50% 50%!important;
        will-change:transform;
        overflow:visible!important;
      }
      .shooting-bullet-splash.bomb-size-l{
        width:24px!important;
        height:24px!important;
      }
      .shooting-bullet-splash::before{
        content:"";
        position:absolute;
        left:50%;
        top:-6px;
        width:7px;
        height:6px;
        border:2px solid rgba(var(--bomb-rgb,244,239,227),.92);
        border-bottom:0;
        border-radius:8px 8px 2px 2px;
        transform:translateX(-50%) rotate(-13deg);
        box-shadow:0 0 5px rgba(var(--bomb-rgb,244,239,227),.52);
        pointer-events:none;
      }
      .shooting-bullet-splash::after{
        content:"";
        position:absolute;
        left:calc(50% + 3px);
        top:-9px;
        width:4px;
        height:4px;
        border-radius:50%;
        background:#fff;
        box-shadow:
          0 0 5px 2px rgba(var(--bomb-rgb,244,239,227),.98),
          0 0 9px 4px rgba(var(--bomb-rgb,244,239,227),.44);
        animation:shootingBombFuseSpark580 .18s ease-in-out infinite alternate;
        pointer-events:none;
      }

      .shooting-bomb-throw-pop{
        position:absolute;
        left:0;
        top:0;
        width:32px;
        height:16px;
        border:1px solid rgba(var(--bomb-rgb,244,239,227),.74);
        border-radius:50%;
        pointer-events:none;
        z-index:24;
        transform:translate3d(var(--bomb-x,0px),var(--bomb-y,0px),0) translate(-50%,-50%) scale(.35);
        box-shadow:0 0 8px rgba(var(--bomb-rgb,244,239,227),.30);
        animation:shootingBombThrowPop580 .24s ease-out forwards;
      }

      .shooting-bomb-explosion{
        position:absolute;
        left:0;
        top:0;
        width:var(--bomb-explosion-size,168px);
        height:var(--bomb-explosion-size,168px);
        transform:translate3d(var(--bomb-x,0px),var(--bomb-y,0px),0) translate(-50%,-50%);
        pointer-events:none;
        z-index:46;
        contain:layout style paint;
      }
      .shooting-bomb-explosion > i{
        position:absolute;
        left:50%;
        top:50%;
        pointer-events:none;
      }
      .shooting-bomb-explosion .bomb-flash{
        width:32%;
        height:32%;
        border-radius:50%;
        background:radial-gradient(circle,#fff 0 14%,rgba(255,255,255,.95) 15% 28%,rgba(var(--bomb-rgb,244,239,227),.94) 29% 58%,rgba(var(--bomb-rgb,244,239,227),0) 72%);
        box-shadow:0 0 18px rgba(var(--bomb-rgb,244,239,227),.96),0 0 38px rgba(var(--bomb-rgb,244,239,227),.48);
        animation:shootingBombFlash580 .34s cubic-bezier(.16,.88,.24,1) forwards;
      }
      .shooting-bomb-explosion .bomb-cloud{
        width:72%;
        height:72%;
        border-radius:50%;
        background:
          radial-gradient(circle,rgba(var(--bomb-rgb,244,239,227),.44) 0 24%,rgba(var(--bomb-rgb,244,239,227),.26) 42%,rgba(var(--bomb-rgb,244,239,227),0) 72%);
        filter:blur(2px);
        animation:shootingBombCloud580 .48s ease-out forwards;
      }
      .shooting-bomb-explosion .bomb-ring{
        width:70%;
        height:70%;
        border-radius:50%;
        border:2px solid rgba(var(--bomb-rgb,244,239,227),.92);
        box-shadow:
          0 0 10px rgba(var(--bomb-rgb,244,239,227),.74),
          inset 0 0 11px rgba(var(--bomb-rgb,244,239,227),.35);
        animation:shootingBombRing580 .46s cubic-bezier(.08,.76,.18,1) forwards;
      }
      .shooting-bomb-explosion .bomb-ring.ring2{
        width:50%;
        height:50%;
        border-width:1px;
        opacity:.72;
        animation-duration:.38s;
        animation-delay:.035s;
      }
      .shooting-bomb-explosion .bomb-lobe{
        width:22%;
        height:22%;
        margin:-11% 0 0 -11%;
        border-radius:50%;
        background:radial-gradient(circle,rgba(255,255,255,.88) 0 10%,rgba(var(--bomb-rgb,244,239,227),.82) 26%,rgba(var(--bomb-rgb,244,239,227),.18) 68%,transparent 74%);
        transform:rotate(var(--bomb-a,0deg)) translateX(calc(var(--bomb-explosion-size,168px) * .13)) scale(.28);
        transform-origin:50% 50%;
        animation:shootingBombLobe580 .42s ease-out forwards;
      }

      .shooting-bomb-splash-hit{
        position:absolute;
        left:0;
        top:0;
        width:104px;
        height:104px;
        transform:translate3d(var(--bomb-x,0px),var(--bomb-y,0px),0) translate(-50%,-50%);
        pointer-events:none;
        z-index:48;
        contain:layout style paint;
      }
      .shooting-bomb-splash-hit > i{
        position:absolute;
        left:50%;
        top:50%;
        pointer-events:none;
      }
      .shooting-bomb-splash-hit .splash-core{
        width:34px;
        height:34px;
        margin:-17px 0 0 -17px;
        border-radius:50%;
        background:radial-gradient(circle,rgba(255,255,255,1) 0 18%,rgba(var(--bomb-rgb,244,239,227),.98) 19% 48%,rgba(var(--bomb-rgb,244,239,227),.18) 70%,rgba(var(--bomb-rgb,244,239,227),0) 78%);
        box-shadow:0 0 12px 3px rgba(var(--bomb-rgb,244,239,227),.98),0 0 30px 8px rgba(var(--bomb-rgb,244,239,227),.52);
        animation:shootingBombSplashCore582 .34s ease-out forwards;
      }
      .shooting-bomb-splash-hit .splash-burst{
        width:70px;
        height:70px;
        margin:-35px 0 0 -35px;
        border-radius:50%;
        background:radial-gradient(circle,rgba(255,255,255,.34) 0 16%,rgba(var(--bomb-rgb,244,239,227),.44) 28%,rgba(var(--bomb-rgb,244,239,227),.14) 52%,rgba(var(--bomb-rgb,244,239,227),0) 74%);
        animation:shootingBombSplashBurst582 .38s ease-out forwards;
      }
      .shooting-bomb-splash-hit .splash-ring{
        width:68px;
        height:68px;
        margin:-34px 0 0 -34px;
        border-radius:50%;
        border:3px solid rgba(var(--bomb-rgb,244,239,227),.94);
        box-shadow:0 0 12px rgba(var(--bomb-rgb,244,239,227),.84), inset 0 0 14px rgba(var(--bomb-rgb,244,239,227),.30);
        animation:shootingBombSplashRing582 .40s cubic-bezier(.12,.72,.18,1) forwards;
      }
      .shooting-bomb-splash-hit .splash-ring.r2{
        width:46px;
        height:46px;
        margin:-23px 0 0 -23px;
        border-width:2px;
        opacity:.92;
        animation-duration:.32s;
      }
      .shooting-bomb-splash-hit .splash-ray{
        width:34px;
        height:4px;
        margin:-2px 0 0 0;
        border-radius:999px;
        transform-origin:0 50%;
        background:linear-gradient(90deg,rgba(255,255,255,.98),rgba(var(--bomb-rgb,244,239,227),.92) 34%,rgba(var(--bomb-rgb,244,239,227),0) 100%);
        box-shadow:0 0 8px rgba(var(--bomb-rgb,244,239,227),.72);
        transform:rotate(var(--splash-a,0deg)) translateX(10px) scaleX(.22);
        animation:shootingBombSplashRay582 .32s ease-out forwards;
      }

      /* build777: 通常BOMBの着弾 = 分裂。爆風に当たり判定は持たせない。 */
      .shooting-bomb-fragment{
        width:9px!important;
        height:9px!important;
        min-width:9px!important;
        min-height:9px!important;
        border-radius:50%!important;
        border:1px solid rgba(255,255,255,.72)!important;
        background:radial-gradient(circle at 38% 34%,#fff 0 16%,rgba(var(--bomb-rgb,244,239,227),.98) 17% 58%,rgba(var(--bomb-rgb,244,239,227),.16) 74%,transparent 76%)!important;
        box-shadow:0 0 7px 2px rgba(var(--bomb-rgb,244,239,227),.82),0 0 15px rgba(var(--bomb-rgb,244,239,227),.42)!important;
        overflow:visible!important;
      }
      .shooting-bomb-fragment::before,
      .shooting-bomb-fragment::after{content:none!important;display:none!important}

      .shooting-bomb-split-burst{
        position:absolute;
        left:0;
        top:0;
        width:74px;
        height:74px;
        transform:translate3d(var(--bomb-x,0px),var(--bomb-y,0px),0) translate(-50%,-50%);
        pointer-events:none;
        z-index:49;
      }
      .shooting-bomb-split-burst > i{
        position:absolute;
        left:50%;
        top:50%;
        pointer-events:none;
      }
      .shooting-bomb-split-burst .split-core{
        width:24px;
        height:24px;
        margin:-12px 0 0 -12px;
        border-radius:50%;
        background:radial-gradient(circle,#fff 0 16%,rgba(var(--bomb-rgb,244,239,227),.94) 18% 48%,rgba(var(--bomb-rgb,244,239,227),0) 74%);
        box-shadow:0 0 12px rgba(var(--bomb-rgb,244,239,227),.88);
        animation:shootingBombSplitCore777 .28s ease-out forwards;
      }
      .shooting-bomb-split-burst .split-ring{
        width:42px;
        height:42px;
        margin:-21px 0 0 -21px;
        border-radius:50%;
        border:2px solid rgba(var(--bomb-rgb,244,239,227),.82);
        box-shadow:0 0 8px rgba(var(--bomb-rgb,244,239,227),.52);
        animation:shootingBombSplitRing777 .32s ease-out forwards;
      }
      .shooting-bomb-split-burst .split-ray{
        width:30px;
        height:3px;
        margin:-1.5px 0 0 0;
        border-radius:999px;
        transform-origin:0 50%;
        background:linear-gradient(90deg,#fff,rgba(var(--bomb-rgb,244,239,227),.92) 38%,rgba(var(--bomb-rgb,244,239,227),0) 100%);
        box-shadow:0 0 6px rgba(var(--bomb-rgb,244,239,227),.68);
        transform:rotate(var(--split-a,0deg)) translateX(6px) scaleX(.18);
        animation:shootingBombSplitRay777 .30s ease-out forwards;
      }

      /* build587: リズULT専用・巨大AQUA BOMB */
      .shooting-liz-ult-bomb{
        position:absolute;
        left:0;
        top:0;
        width:62px;
        height:62px;
        margin:0;
        border-radius:50%;
        pointer-events:none;
        z-index:58;
        border:2px solid rgba(255,255,255,.72);
        background:
          radial-gradient(circle at 31% 25%,rgba(255,255,255,1) 0 8%,rgba(255,255,255,.54) 9% 17%,transparent 18%),
          radial-gradient(circle at 47% 52%,rgba(var(--bomb-rgb,74,174,232),1) 0 34%,var(--bomb-color,#4aaee8) 35% 62%,rgba(22,57,82,.98) 63% 100%);
        box-shadow:
          0 0 16px 4px rgba(var(--bomb-rgb,74,174,232),.84),
          0 0 34px 10px rgba(var(--bomb-rgb,74,174,232),.34),
          inset -9px -11px 12px rgba(0,25,48,.42),
          inset 5px 5px 9px rgba(255,255,255,.28);
        transform-origin:50% 50%;
        will-change:transform,filter;
      }
      .shooting-liz-ult-bomb::before{
        content:"";
        position:absolute;
        left:50%;
        top:-15px;
        width:17px;
        height:17px;
        border:4px solid rgba(var(--bomb-rgb,74,174,232),.96);
        border-bottom:0;
        border-radius:15px 15px 4px 4px;
        transform:translateX(-50%) rotate(-12deg);
        box-shadow:0 0 11px rgba(var(--bomb-rgb,74,174,232),.72);
      }
      .shooting-liz-ult-bomb::after{
        content:"";
        position:absolute;
        left:calc(50% + 8px);
        top:-18px;
        width:9px;
        height:9px;
        border-radius:50%;
        background:#fff;
        box-shadow:
          0 0 8px 3px rgba(255,255,255,.92),
          0 0 16px 7px rgba(var(--bomb-rgb,74,174,232),.78);
        animation:shootingLizUltFuse587 .16s ease-in-out infinite alternate;
      }
      /* build881: ID38専用。青いフチをやめ、白〜淡金〜淡茶のなじむ色へ */
      .shooting-liz-ult-bomb.shooting-painter-ult-bomb{
        border:2px solid rgba(247,239,210,.84)!important;
        background:
          radial-gradient(circle at 31% 25%,rgba(255,255,255,1) 0 8%,rgba(255,255,255,.56) 9% 17%,transparent 18%),
          radial-gradient(circle at 47% 52%,rgba(255,245,210,1) 0 34%,rgba(245,214,120,.98) 35% 62%,rgba(116,88,44,.96) 63% 100%)!important;
        box-shadow:
          0 0 14px 3px rgba(255,229,132,.42),
          0 0 28px 8px rgba(215,181,86,.16),
          inset -8px -10px 12px rgba(92,69,32,.30),
          inset 5px 5px 9px rgba(255,255,255,.26)!important;
      }
      .shooting-liz-ult-bomb.shooting-painter-ult-bomb::before{
        border-color:rgba(228,193,96,.92)!important;
        box-shadow:0 0 9px rgba(224,185,77,.34)!important;
      }
      .shooting-liz-ult-bomb.shooting-painter-ult-bomb::after{
        box-shadow:
          0 0 8px 3px rgba(255,255,255,.90),
          0 0 14px 6px rgba(244,212,112,.46)!important;
      }
      .shooting-liz-ult-bomb-shadow{
        position:absolute;
        width:76px;
        height:24px;
        border-radius:50%;
        pointer-events:none;
        z-index:25;
        background:radial-gradient(ellipse,rgba(var(--bomb-rgb,74,174,232),.38),rgba(var(--bomb-rgb,74,174,232),0) 72%);
        filter:blur(2px);
        transform:translate(-50%,-50%);
        will-change:transform,opacity;
      }

      @keyframes shootingLizUltFuse587{
        from{opacity:.58;transform:scale(.72)}
        to{opacity:1;transform:scale(1.34)}
      }

      @keyframes shootingBombFuseSpark580{
        from{opacity:.56;transform:scale(.72)}
        to{opacity:1;transform:scale(1.22)}
      }
      @keyframes shootingBombThrowPop580{
        0%{opacity:.76;transform:translate3d(var(--bomb-x),var(--bomb-y),0) translate(-50%,-50%) scale(.35)}
        100%{opacity:0;transform:translate3d(var(--bomb-x),calc(var(--bomb-y) + 3px),0) translate(-50%,-50%) scale(1.25)}
      }
      @keyframes shootingBombFlash580{
        0%{opacity:0;transform:translate(-50%,-50%) scale(.18)}
        18%{opacity:1;transform:translate(-50%,-50%) scale(.78)}
        58%{opacity:.96;transform:translate(-50%,-50%) scale(1.36)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(1.82)}
      }
      @keyframes shootingBombCloud580{
        0%{opacity:.72;transform:translate(-50%,-50%) scale(.24)}
        62%{opacity:.56;transform:translate(-50%,-50%) scale(.92)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(1.14)}
      }
      @keyframes shootingBombRing580{
        0%{opacity:.94;transform:translate(-50%,-50%) scale(.18)}
        68%{opacity:.76;transform:translate(-50%,-50%) scale(.93)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(1.18)}
      }
      @keyframes shootingBombLobe580{
        0%{opacity:.86;transform:rotate(var(--bomb-a)) translateX(calc(var(--bomb-explosion-size) * .08)) scale(.24)}
        62%{opacity:.68;transform:rotate(var(--bomb-a)) translateX(calc(var(--bomb-explosion-size) * .27)) scale(1.02)}
        100%{opacity:0;transform:rotate(var(--bomb-a)) translateX(calc(var(--bomb-explosion-size) * .34)) scale(.48)}
      }
      @keyframes shootingBombSplashCore582{
        0%{opacity:0;transform:translate(-50%,-50%) scale(.16)}
        20%{opacity:1;transform:translate(-50%,-50%) scale(1.16)}
        58%{opacity:.96;transform:translate(-50%,-50%) scale(.92)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(1.62)}
      }
      @keyframes shootingBombSplashBurst582{
        0%{opacity:0;transform:translate(-50%,-50%) scale(.18)}
        28%{opacity:.92;transform:translate(-50%,-50%) scale(.72)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(1.35)}
      }
      @keyframes shootingBombSplashRing582{
        0%{opacity:1;transform:translate(-50%,-50%) scale(.20)}
        60%{opacity:.92;transform:translate(-50%,-50%) scale(1.05)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(1.42)}
      }
      @keyframes shootingBombSplashRay582{
        0%{opacity:0;transform:rotate(var(--splash-a)) translateX(4px) scaleX(.10)}
        22%{opacity:1;transform:rotate(var(--splash-a)) translateX(10px) scaleX(.72)}
        100%{opacity:0;transform:rotate(var(--splash-a)) translateX(31px) scaleX(1.16)}
      }
      @keyframes shootingBombSplitCore777{
        0%{opacity:0;transform:translate(-50%,-50%) scale(.18)}
        24%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(1.54)}
      }
      @keyframes shootingBombSplitRing777{
        0%{opacity:.96;transform:translate(-50%,-50%) scale(.24)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(1.34)}
      }
      @keyframes shootingBombSplitRay777{
        0%{opacity:0;transform:rotate(var(--split-a)) translateX(3px) scaleX(.08)}
        22%{opacity:1;transform:rotate(var(--split-a)) translateX(7px) scaleX(.72)}
        100%{opacity:0;transform:rotate(var(--split-a)) translateX(26px) scaleX(1.16)}
      }
    `;
    document.head.appendChild(style);
  }

  function createBombThrowPop(x, y, element) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    ensureBombVisualStyles();
    const visual = getBombElementVisual(element);
    const el = document.createElement('i');
    el.className = 'shooting-bomb-throw-pop';
    el.style.setProperty('--bomb-x', `${Number(x || 0)}px`);
    el.style.setProperty('--bomb-y', `${Number(y || 0)}px`);
    el.style.setProperty('--bomb-rgb', visual.rgb);
    arena.appendChild(el);
    setTimeout(() => el.remove(), 280);
  }

  function createGenericBombExplosionEffect(x, y, element, radius, bombSize) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    ensureBombVisualStyles();

    const visual = getBombElementVisual(element);
    const safeRadius = Math.max(30, Number(radius || 76));
    const sizeMultiplier = String(bombSize || '').toUpperCase() === 'L' ? 2.28 : 2.16;
    const visualSize = Math.round(safeRadius * sizeMultiplier);

    const el = document.createElement('div');
    el.className = 'shooting-bomb-explosion';
    el.style.setProperty('--bomb-x', `${Number(x || 0)}px`);
    el.style.setProperty('--bomb-y', `${Number(y || 0)}px`);
    el.style.setProperty('--bomb-color', visual.color);
    el.style.setProperty('--bomb-rgb', visual.rgb);
    el.style.setProperty('--bomb-explosion-size', `${visualSize}px`);

    el.innerHTML = '<i class="bomb-cloud"></i><i class="bomb-ring"></i><i class="bomb-ring ring2"></i><i class="bomb-flash"></i>';
    for (let i = 0; i < 7; i++) {
      const lobe = document.createElement('i');
      lobe.className = 'bomb-lobe';
      lobe.style.setProperty('--bomb-a', `${i * (360 / 7) + (i % 2 ? 8 : -5)}deg`);
      el.appendChild(lobe);
    }

    arena.appendChild(el);
    setTimeout(() => el.remove(), 560);
  }

  function createBombSplashVictimHitEffect(x, y, element) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    ensureBombVisualStyles();
    const visual = getBombElementVisual(element);
    const el = document.createElement('div');
    el.className = 'shooting-bomb-splash-hit';
    el.style.setProperty('--bomb-x', `${Number(x || 0)}px`);
    el.style.setProperty('--bomb-y', `${Number(y || 0)}px`);
    el.style.setProperty('--bomb-rgb', visual.rgb);
    el.innerHTML = '<i class="splash-burst"></i><i class="splash-ring"></i><i class="splash-ring r2"></i><i class="splash-core"></i>';
    for (let i = 0; i < 8; i++) {
      const ray = document.createElement('i');
      ray.className = 'splash-ray';
      ray.style.setProperty('--splash-a', `${i * 45 + (i % 2 ? 7 : -4)}deg`);
      el.appendChild(ray);
    }
    arena.appendChild(el);
    setTimeout(() => el.remove(), 460);
  }

  function positionGenericBombProjectile(p, now) {
    if (!p || !p.el) return;
    // CLUSTERの親弾は通常弾と同じ直進表示。旧BOMBの投擲アーク/回転は使わない。
    positionUnit(p.el, Number(p.x || 0), Number(p.y || 0));
  }

  function normalizeBombSplitCount(source) {
    const raw = Math.floor(Number(
      source?.clusterSplitCount ??
      source?.bombSplitCount ??
      source?.mainShot?.count ??
      source?.bombFragments ??
      0
    ));
    if (raw === 4 || raw === 6 || raw === 8) return raw;
    // 旧BOMB表記との互換を維持。M=CLUSTER 4、L=CLUSTER 8。
    return String(source?.clusterSize || source?.bombSize || source?.mainShot?.size || 'M').toUpperCase() === 'L' ? 8 : 4;
  }

  function getBombSplitAngles(count) {
    const n = count === 6 || count === 8 ? count : 4;
    if (n === 4) return [45, 135, 225, 315]; // X字
    if (n === 6) return [-90, -30, 30, 90, 150, 210];
    return Array.from({ length: 8 }, (_, i) => i * 45);
  }

  function createBombSplitBurstEffect(x, y, element, splitCount) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    ensureBombVisualStyles();
    const visual = getBombElementVisual(element);
    const angles = getBombSplitAngles(splitCount);
    const el = document.createElement('div');
    el.className = 'shooting-bomb-split-burst';
    el.style.setProperty('--bomb-x', `${Number(x || 0)}px`);
    el.style.setProperty('--bomb-y', `${Number(y || 0)}px`);
    el.style.setProperty('--bomb-rgb', visual.rgb);
    el.innerHTML = '<i class="split-ring"></i><i class="split-core"></i>';
    angles.forEach(angle => {
      const ray = document.createElement('i');
      ray.className = 'split-ray';
      ray.style.setProperty('--split-a', `${angle}deg`);
      el.appendChild(ray);
    });
    arena.appendChild(el);
    setTimeout(() => el.remove(), 380);
  }

  function spawnBombSplitProjectiles(source, x, y, now, queue, ignoredTarget = null) {
    if (!source || !Array.isArray(queue)) return 0;
    ensureBombVisualStyles();

    const splitCount = normalizeBombSplitCount(source);
    const angles = getBombSplitAngles(splitCount);
    const rate = Math.max(0, Number(source.clusterFragmentDamageRate ?? source.bombFragmentDamageRate ?? 0.50));
    const damage = Math.max(0, Number(source.damage || 0)) * rate;
    const speed = Math.max(120, Number(source.clusterFragmentSpeed || source.bombFragmentSpeed || 430));
    const element = normalizeCombatElement(source.attackElement || source.element) || 'neutral';
    const visual = getBombElementVisual(element);
    const fragmentClass = String(source.clusterFragmentClass || source.bombFragmentClass || 'shooting-bullet') + ' shooting-bomb-fragment';

    angles.forEach(angleDeg => {
      const rad = angleDeg * Math.PI / 180;
      // 元の着弾対象の中心に全弾が重ならないよう、少し外側から分裂開始。
      const spawnOffset = 9;
      const px = Number(x || 0) + Math.cos(rad) * spawnOffset;
      const py = Number(y || 0) + Math.sin(rad) * spawnOffset;
      const fragment = makeProjectile(
        fragmentClass,
        px,
        py,
        Math.cos(rad) * speed,
        Math.sin(rad) * speed,
        damage,
        source.ownerId
      );
      if (!fragment) return;
      fragment.kind = 'bomb_fragment';
      fragment.attackElement = element;
      fragment.element = element;
      fragment.bombFragment = true;
      fragment.bombIgnoreTarget = ignoredTarget || null;
      fragment.bombBornAt = Number(now || performance.now());
      fragment.bombExpireAt = fragment.bombBornAt + 2200;
      fragment.noBombSplit = true;
      fragment._hw = 4.5;
      fragment._hh = 4.5;
      fragment.el.style.setProperty('--bomb-rgb', visual.rgb);
      queue.push(fragment);
    });

    createBombSplitBurstEffect(x, y, element, splitCount);
    return angles.length;
  }

  function splitBombAtImpact(p, x, y, now, queue, ignoredTarget = null) {
    if (!p || p.kind !== 'generic_splash') return 0;
    return spawnBombSplitProjectiles(p, x, y, now, queue, ignoredTarget);
  }


  // build869: BOMBはCLUSTERと分離。着弾点を中心に範囲ダメージを与える。
  function applyGenericBombSplashDamage(p, impactX, impactY, now, chara, ignoredTarget = null) {
    if (!state || !p) return 0;
    const radius = Math.max(30, Number(p.splashRadius || 76));
    const rate = Math.max(0, Number(p.splashDamageRate || 0.55));
    const attackElement = normalizeCombatElement(p.attackElement || p.element || chara?.element) || 'neutral';
    let extraHits = 0;

    (state.normalEnemies || []).forEach(enemy => {
      if (!enemy || enemy === ignoredTarget || !enemy.el || enemy.hp <= 0) return;
      if (Math.hypot(Number(enemy.x || 0) - impactX, Number(enemy.y || 0) - impactY) > radius) return;
      const targetElement = getCombatTargetElement(enemy);
      const splashDamage = applyElementDamage(Number(p.damage || 0) * rate, attackElement, targetElement);
      createBombSplashVictimHitEffect(Number(enemy.x || 0), Number(enemy.y || 0), attackElement);
      const applied = damageNormalEnemy(enemy, splashDamage, now, true, getElementDamageReaction(attackElement, targetElement));
      if (applied > 0) extraHits++;
    });

    (state.facelessObjects || []).forEach(obj => {
      if (!obj || obj === ignoredTarget || !obj.el || obj.hp <= 0) return;
      if (Math.hypot(Number(obj.x || 0) - impactX, Number(obj.y || 0) - impactY) > radius) return;
      const targetElement = getCombatTargetElement(obj, state?.boss?.element);
      const splashDamage = applyElementDamage(Number(p.damage || 0) * rate, attackElement, targetElement);
      createBombSplashVictimHitEffect(Number(obj.x || 0), Number(obj.y || 0), attackElement);
      const applied = damageFacelessObject(obj, splashDamage, now, getElementDamageReaction(attackElement, targetElement));
      if (applied > 0) extraHits++;
    });

    if (state.boss && state.boss !== ignoredTarget && state.boss.hp > 0) {
      const bx = Number(state.boss.x || 0);
      const by = Number(state.boss.y || 0);
      if (Math.hypot(bx - impactX, by - impactY) <= radius) {
        const targetElement = getCombatTargetElement(state.boss);
        const splashDamage = applyElementDamage(Number(p.damage || 0) * rate, attackElement, targetElement);
        const applied = Math.min(state.boss.hp, Math.max(0, Number(splashDamage || 0)));
        state.boss.hp = Math.max(0, state.boss.hp - applied);
        updateBossPhase();
        if (applied > 0) {
          extraHits++;
          createBombSplashVictimHitEffect(bx, by, attackElement);
          if (!addScoreAttackDamageScore(applied)) addLegacyCombatScore(80);
          if (shouldRenderRaidBossHitVisual(now, 'number')) {
            showBossDamageNumber(applied, false, getElementDamageReaction(attackElement, targetElement));
          }
          if (state.boss.hp <= 0) beginBossDefeat();
        }
      }
    }

    state.normalEnemies = (state.normalEnemies || []).filter(enemy => enemy && enemy.hp > 0);
    return extraHits;
  }

  function applyUltElementVisualContext(c) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return getUltAttackElement(c);
    const element = getUltAttackElement(c);
    const visual = ULT_ELEMENT_VISUAL[element] || ULT_ELEMENT_VISUAL.neutral;
    root.dataset.ultElement = element;
    root.style.setProperty('--ult-element-color', visual.color);
    root.style.setProperty('--ult-element-rgb', visual.rgb);
    root.style.setProperty('--ult-element-filter', visual.filter);
    return element;
  }

  function isDailyAdvancedGimmickStage() {
    const stageId = getSelectedBaseStageId();
    return !!(
      (selectedStage && selectedStage.dailyQuest && selectedStage.dailyQuest.level === 'advanced') ||
      /^shooting_daily_[a-z]{3}_advanced$/.test(String(stageId || ''))
    );
  }

  function isStageWeaknessOnlyTarget(targetElement) {
    const guarded = normalizeCombatElement(selectedStage && selectedStage.weaknessOnlyElement);
    const target = normalizeCombatElement(targetElement);

    // CH06の強敵/ボスなど、指定された属性だけを弱点限定対象にする既存仕様。
    if (guarded && target && guarded === target) return true;

    // build550: DAILY上級はstage定義の追加フラグに依存せず、
    // dailyQuest.level / stageId から必ず判定する。
    // 旧shooting_stages.jsがブラウザに残っていても耐性ギミックが有効になる。
    return !!(
      (selectedStage && selectedStage.weaknessOnlyEnemies === true || isDailyAdvancedGimmickStage()) &&
      target &&
      target !== 'neutral'
    );
  }

  function applyElementDamage(amount, attackElement, targetElement, options) {
    const base = Math.max(0, Number(amount || 0));
    const rate = getElementDamageMultiplier(attackElement, targetElement);
    const ignoreStageImmunity = !!(options && options.ignoreStageImmunity);
    const incoming = !!(options && options.incoming);
    // CH06強敵/ボス：弱点属性倍率(1.30)以外は0 DAMAGE。
    if (!ignoreStageImmunity && isStageWeaknessOnlyTarget(targetElement) && rate <= ELEMENT_DAMAGE_RATE.neutral + 0.001) {
      return 0;
    }
    const elemental = base * rate;
    return incoming ? elemental : applyHitComboDamage(elemental);
  }

  // build548: Weak / Resist に加えて、CH06の完全無効を IMMUNE として表示。
  function getElementDamageReaction(attackElement, targetElement, options) {
    const rate = getElementDamageMultiplier(attackElement, targetElement);
    const ignoreStageImmunity = !!(options && options.ignoreStageImmunity);
    if (!ignoreStageImmunity && isStageWeaknessOnlyTarget(targetElement) && rate <= ELEMENT_DAMAGE_RATE.neutral + 0.001) return 'immune';
    if (rate > ELEMENT_DAMAGE_RATE.neutral + 0.001) return 'weak';
    if (rate < ELEMENT_DAMAGE_RATE.neutral - 0.001) return 'resist';
    return '';
  }

  function createArnoOrbitProjectile(c, now, damage) {
    const startY = state.player.y - c.shotOffsetY;
    const attrClass = getCharacterBulletClass(c);
    const p = makeProjectile(
      'shooting-bullet shooting-bullet-arno' + attrClass,
      state.player.x,
      startY,
      0,
      -Number(c.bulletSpeed || 455),
      Number(damage ?? (Number(c.atk || 0) * Number(c.shotPowerRate || 0.095))),
      c.id
    );
    if (!p) return null;

    p.kind = 'arno_orbit_forward';
    p.centerX = state.player.x;
    p.centerY = startY;
    p.orbitPhase = ((state.shotIndex || 0) % Math.max(1, Number(c.shotCount || 1))) * Number(c.orbitPhaseStep || Math.PI);
    p.orbitRadius = Number(c.orbitRadius || 34);
    p.orbitAngularSpeed = Number(c.orbitAngularSpeed || 13.5);
    p.orbitForwardLoopRate = Number(c.orbitForwardLoopRate || .30);
    p.forwardSpeed = Number(c.bulletSpeed || 455);
    p.createdAt = now;
    return p;
  }

  function updateArnoOrbitProjectile(p, dt) {
    // No homing: the projectile advances straight upward while drawing
    // a circular/corkscrew orbit around its forward axis.
    p.centerY -= p.forwardSpeed * dt;
    p.orbitPhase += p.orbitAngularSpeed * dt;

    const side = Math.sin(p.orbitPhase) * p.orbitRadius;
    const forwardLoop = Math.cos(p.orbitPhase) * p.orbitRadius * Number(p.orbitForwardLoopRate || .30);

    p.x = p.centerX + side;
    p.y = p.centerY + forwardLoop;
  }

  function getCharacterShotStyleClass(c) {
    const style = String(c?.shotStyle || '').trim().toLowerCase();
    if (!style || style === 'normal') return '';
    return ` shooting-bullet-${style}`;
  }

  function getCenteredShotOffset(index, count, spacing) {
    return (index - (count - 1) / 2) * spacing;
  }

  function getWolfTargetPoint(fromX, fromY) {
    if (!state) return null;

    const candidates = [];

    // CH06の遮断壁はHomingの最優先標的。
    const barrierCandidates = (state.chapter6Barriers || [])
      .filter(barrier => barrier && barrier.el)
      .map(barrier => ({ ref:barrier, x:Number(barrier.x || 0), y:Number(barrier.y || 0) }));
    if (barrierCandidates.length) {
      barrierCandidates.sort((a, b) => {
        const da = Math.hypot(a.x - fromX, a.y - fromY);
        const db = Math.hypot(b.x - fromX, b.y - fromY);
        return da - db;
      });
      return barrierCandidates[0];
    }

    if (isNormalBattle()) {
      (state.normalEnemies || []).forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;
        candidates.push({ ref: enemy, x: Number(enemy.x || 0), y: Number(enemy.y || 0) });
      });
    } else {
      if (isFacelessStage()) {
        const masks = (state.facelessObjects || [])
          .filter(obj => obj && obj.el && obj.hp > 0)
          .map(obj => ({ ref: obj, x: Number(obj.x || 0), y: Number(obj.y || 0) }));

        // 仮面が顕現中は、ホーミングはBOSS本体へ吸われず仮面を最優先で追う。
        // これによりBOSS中心で弾が滞留する状態を防ぐ。
        if (masks.length) {
          masks.sort((a, b) => {
            const da = Math.hypot(a.x - fromX, a.y - fromY);
            const db = Math.hypot(b.x - fromX, b.y - fromY);
            return da - db;
          });
          return masks[0];
        }
      }

      if (state.boss && state.boss.hp > 0) {
        candidates.push({ ref: state.boss, x: Number(state.boss.x || 0), y: Number(state.boss.y || 0) });
      }
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      const da = Math.hypot(a.x - fromX, a.y - fromY);
      const db = Math.hypot(b.x - fromX, b.y - fromY);
      return da - db;
    });
    return candidates[0];
  }

  function resolveWolfTrackedTarget(p) {
    const tracked = p && p.wolfTargetRef;

    // FACELESSで仮面が顕現したら、BOSSを追っていた既存弾も仮面へ再ロックする。
    if (isFacelessStage()) {
      const masksAlive = (state.facelessObjects || []).some(obj => obj && obj.el && obj.hp > 0);
      const trackedIsBoss = tracked && tracked === state.boss;
      if (masksAlive && trackedIsBoss) {
        const nextMask = getWolfTargetPoint(Number(p?.x || state?.player?.x || 0), Number(p?.y || state?.player?.y || 0));
        if (p && nextMask) p.wolfTargetRef = nextMask.ref;
        return nextMask;
      }
    }

    if (tracked && (tracked.isChapter6Barrier || Number(tracked.hp || 0) > 0)) {
      return { ref: tracked, x: Number(tracked.x || 0), y: Number(tracked.y || 0) };
    }

    const next = getWolfTargetPoint(Number(p?.x || state?.player?.x || 0), Number(p?.y || state?.player?.y || 0));
    if (p && next) p.wolfTargetRef = next.ref;
    return next;
  }

  function createWolfJHomingProjectile(c, side, startY, damage, bulletClass, now) {
    const startX = Number(state.player.x || 0) + side * Number(c.shotSpacing || 30) * 0.5;
    const p = makeProjectile(
      bulletClass + ' shooting-bullet-wolf-j',
      startX,
      startY,
      0,
      0,
      damage,
      c.id
    );
    if (!p) return null;

    const target = getWolfTargetPoint(startX, startY);
    p.kind = 'wolf_j_homing';
    p.wolfSide = side;
    p.wolfStartedAt = now;
    p.wolfCurveDurationMs = Math.max(260, Number(c.wolfCurveDurationMs || 430));
    p.wolfRetreatDepth = Math.max(40, Number(c.wolfRetreatDepth || 78));
    p.wolfOuterOffset = Math.max(24, Number(c.wolfOuterOffset || 52));
    p.wolfConvergeLead = Math.max(28, Number(c.wolfConvergeLead || 54));
    p.wolfSpeed = Math.max(360, Number(c.bulletSpeed || 900));
    p.wolfStartX = startX;
    p.wolfStartY = startY;
    p.wolfTargetRef = target ? target.ref : null;
    p.wolfCurveDone = false;
    p.wolfCanHit = false;
    return p;
  }

  function updateWolfJHomingProjectile(p, dt, now) {
    const target = resolveWolfTrackedTarget(p);

    if (!p.wolfCurveDone) {
      const duration = Math.max(1, Number(p.wolfCurveDurationMs || 430));
      const t = clamp((now - Number(p.wolfStartedAt || now)) / duration, 0, 1);
      const side = Number(p.wolfSide || 1);
      const sx = Number(p.wolfStartX || p.x || 0);
      const sy = Number(p.wolfStartY || p.y || 0);

      // Targetがいない場合も、画面上方の同一点へ収束する。
      const tx = target ? Number(target.x || sx) : Number(state.player.x || sx);
      const ty = target ? Number(target.y || 40) : 40;
      const ex = tx;
      const ey = ty + Number(p.wolfConvergeLead || 54);

      // 深いJ字：
      // 1) 左右へ開きながら肩より後ろまで沈む
      // 2) 大きくUターン
      // 3) 2発とも標的直下の同一点へ収束
      const c1x = sx + side * Number(p.wolfOuterOffset || 52);
      const c1y = sy + Number(p.wolfRetreatDepth || 78);
      const c2x = ex + side * Number(p.wolfOuterOffset || 52) * 0.72;
      const c2y = ey + Number(p.wolfRetreatDepth || 78) * 0.72;
      const u = 1 - t;

      p.x = u*u*u*sx + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*ex;
      p.y = u*u*u*sy + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*ey;
      p.wolfCanHit = t >= 0.94;

      if (t >= 1) {
        p.wolfCurveDone = true;
        p.wolfCanHit = true;
      }
      return;
    }

    const liveTarget = resolveWolfTrackedTarget(p);
    const tx = liveTarget ? Number(liveTarget.x || p.x) : Number(state.player.x || p.x);
    const ty = liveTarget ? Number(liveTarget.y || 0) : -40;
    const dx = tx - p.x;
    const dy = ty - p.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const speed = Number(p.wolfSpeed || 900);

    // 収束後は2発とも同じ着弾点を追う。並列では飛ばさない。
    p.vx = dx / len * speed;
    p.vy = dy / len * speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  function getWolfAtkFieldStatus(now) {
    const field = state && state.wolfAtkField;
    if (!field || now >= Number(field.until || 0)) {
      return { active:false, left:0, multiplier:1 };
    }
    const dx = Number(state.player.x || 0) - Number(field.x || 0);
    const dy = Number(state.player.y || 0) - Number(field.y || 0);
    const inside = Math.hypot(dx, dy) <= Number(field.radius || 0);
    return {
      active: inside,
      left: Math.max(0, Number(field.until || 0) - now),
      multiplier: inside ? Number(field.multiplier || 1.5) : 1
    };
  }

  function updateWolfAtkField(now) {
    if (!state || !state.wolfAtkField) return;
    const field = state.wolfAtkField;
    if (now < Number(field.until || 0)) return;
    if (field.el && field.el.isConnected) {
      field.el.classList.add('ending');
      setTimeout(() => field.el && field.el.isConnected && field.el.remove(), 220);
    }
    state.wolfAtkField = null;
  }

  function useWolfUlt(c) {
    if (!state || state.ended || state.finishing) return;

    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-wolf');
    clearEnemyBulletsOnly();
    // 「盤面の弾を削除」：敵弾だけでなく、発射済みの自機弾も一度リセット。
    (state.bullets || []).forEach(p => p && p.el && p.el.remove());
    state.bullets = [];

    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const old = arena.querySelector('.shooting-wolf-atk-field');
    if (old) old.remove();

    const radius = Math.max(70, Number(c.ultFieldRadius || 112));
    const x = arena.clientWidth * 0.5;
    const y = arena.clientHeight * 0.5;
    const duration = Math.max(1000, Number(c.ultFieldDurationMs || 10000));
    const now = performance.now();

    const el = document.createElement('div');
    el.className = 'shooting-wolf-atk-field';
    el.style.width = `${radius * 2}px`;
    el.style.height = `${radius * 2}px`;
    el.style.transform = `translate3d(${x - radius}px,${y - radius}px,0)`;
    el.innerHTML = '<i></i><span>ATK UP</span>';
    arena.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    state.wolfAtkField = {
      el,
      x,
      y,
      radius,
      multiplier: Math.max(1, Number(c.ultFieldAtkMultiplier || 1.5)),
      until: now + duration,
      ownerId: c.id
    };
    state.ultLockUntil = now + 320;
    state.lastShotAt = -9999;
    renderHud();
  }


  function hideIgnisLaser() {
    if (!state || !state.ignisLaserEl) return;
    state.ignisLaserEl.classList.remove('active');
  }

  function ensureIgnisLaser(c) {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !state) return null;

    let el = state.ignisLaserEl;
    if (!el || !el.isConnected) {
      el = document.createElement('div');
      el.className = 'shooting-ignis-laser';
      el.innerHTML = '<i></i><b></b>';
      arena.appendChild(el);
      state.ignisLaserEl = el;
    }
    el.classList.toggle('shooting-noah-laser', String(c && c.effectKey || '') === 'noah');

    ['fire','aqua','wood','dark','light'].forEach(function(elementName){
      el.classList.remove('shooting-bullet-' + elementName);
    });
    const laserElementSource = (c && c.laserElement)
      ? { element: c.laserElement }
      : c;
    const laserElementClass = getCharacterBulletClass(laserElementSource).trim();
    if (laserElementClass) el.classList.add(laserElementClass);
    el.dataset.element = String((c && c.laserElement) || (c && c.element) || '');

    const laserSize = String(c?.mainShot?.size || c?.laserSize || 'M').toUpperCase() === 'L' ? 'L' : 'M';
    el.dataset.laserSize = laserSize;
    el.style.setProperty('--ignis-laser-width', `${Number(c.laserWidth || (laserSize === 'L' ? 16 : 10))}px`);
    return el;
  }

  function getIgnisLaserTargets(x, startY, hitWidth) {
    if (!state) return [];
    const targets = [];

    // 通常敵・BOSS随伴敵。レーザーは手前の敵で止まらず、射線上の全対象を貫通する。
    if (isNormalBattle() || hasBossAdds()) {
      (state.normalEnemies || []).forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;
        if (Math.abs(Number(enemy.x || 0) - x) > hitWidth) return;
        if (Number(enemy.y || 0) >= startY) return;
        targets.push({ kind: 'normal', target: enemy, x: enemy.x, y: enemy.y });
      });
    }

    if (isFacelessStage() || isAmbushStage()) {
      (state.facelessObjects || []).forEach(obj => {
        if (!obj || obj.hp <= 0) return;
        if (Math.abs(Number(obj.x || 0) - x) > hitWidth) return;
        if (Number(obj.y || 0) >= startY) return;
        targets.push({ kind: 'object', target: obj, x: obj.x, y: obj.y });
      });
    }

    if (
      !isNormalBattle() &&
      state.boss && state.boss.hp > 0 &&
      Math.abs(Number(state.boss.x || 0) - x) <= hitWidth &&
      Number(state.boss.y || 0) < startY
    ) {
      targets.push({ kind: 'boss', target: state.boss, x: state.boss.x, y: state.boss.y });
    }

    return targets.sort((a, b) => Number(b.y || 0) - Number(a.y || 0));
  }


  function createGenericHomingProjectile(c, side, startY, damage, bulletClass) {
    const startX = Number(state.player.x || 0) + side * Number(c.shotSpacing || 28) * 0.5;
    const speed = Math.max(260, Number(c.bulletSpeed || 640));
    const p = makeProjectile(bulletClass + ' shooting-bullet-homing', startX, startY, 0, -speed, damage, c.id);
    if (!p) return null;
    p.kind = 'generic_homing';
    p.homingSpeed = speed;
    p.homingTurnRate = Math.max(1, Number(c.homingTurnRate || 7));
    return p;
  }

  function updateGenericHomingProjectile(p, dt) {
    const target = getWolfTargetPoint(Number(p.x || 0), Number(p.y || 0));
    const speed = Math.max(260, Number(p.homingSpeed || 640));
    if (target) {
      const dx = Number(target.x || p.x) - Number(p.x || 0);
      const dy = Number(target.y || 0) - Number(p.y || 0);
      const len = Math.max(1, Math.hypot(dx, dy));
      const tx = dx / len * speed;
      const ty = dy / len * speed;
      const t = Math.min(1, Math.max(0, Number(p.homingTurnRate || 7) * dt));
      p.vx += (tx - p.vx) * t;
      p.vy += (ty - p.vy) * t;
      const v = Math.max(1, Math.hypot(p.vx, p.vy));
      p.vx = p.vx / v * speed;
      p.vy = p.vy / v * speed;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  function fireIgnisLaser(c, now) {
    if (!state) return;

    const startX = state.player.x;
    const startY = state.player.y - Number(c.shotOffsetY || 42);
    const size = String(c?.mainShot?.size || c?.laserSize || 'M').toUpperCase() === 'L' ? 'L' : 'M';
    const hitWidth = Number(c.laserHitWidth || (size === 'L' ? 50 : 34));
    const targets = getIgnisLaserTargets(startX, startY, hitWidth);

    // v542: Laserは全サイズ共通で貫通。見た目も最初の敵で止めず画面上端まで伸ばす。
    const beamEndY = 12;
    const beamHeight = Math.max(18, startY - beamEndY);

    const el = ensureIgnisLaser(c);
    if (el) {
      el.style.left = `${startX}px`;
      el.style.top = `${startY}px`;
      el.style.height = `${beamHeight}px`;
      el.dataset.laserSize = size;
      el.classList.add('active');
      state.ignisLaserHideAt = now + Number(c.laserVisualHoldMs || 130);
    }

    if (!targets.length) return;

    const damage = Number(c.atk || 0) * Number(c.laserDamageAtkRate || 0.105);
    const laserAttackElement = normalizeCombatElement(
      (c && c.laserElement) || (c && c.element)
    );
    if (el) el.dataset.attackElement = laserAttackElement;

    let hitCount = 0;
    targets.forEach(entry => {
      if (!entry || !entry.target) return;
      if (entry.kind === 'object') {
        const targetElement = getCombatTargetElement(entry.target, state.boss?.element);
        const finalDamage = applyElementDamage(damage, laserAttackElement, targetElement);
        const appliedObjectDamage = damageFacelessObject(entry.target, finalDamage, now, getElementDamageReaction(laserAttackElement, targetElement));
        addLegacyCombatScore(Math.round(finalDamage * 60));
        if (appliedObjectDamage > 0) hitCount++;
        return;
      }

      if (entry.kind === 'boss') {
        if (!state.boss || state.boss.hp <= 0) return;
        const targetElement = getCombatTargetElement(state.boss);
        const finalDamage = applyElementDamage(damage, laserAttackElement, targetElement);
        const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(finalDamage || 0)));
        state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
        createHit(state.boss.x, state.boss.y, false);
        showBossDamageNumber(appliedDamage, false, getElementDamageReaction(laserAttackElement, targetElement));
        flashBossHit(false);
        if (!addScoreAttackDamageScore(appliedDamage)) addLegacyCombatScore(Math.round(damage * 100));
        updateBossPhase();
        if (state.boss.hp <= 0) beginBossDefeat();
        if (appliedDamage > 0) hitCount++;
        return;
      }

      if (entry.kind === 'normal' && entry.target.hp > 0) {
        const targetElement = getCombatTargetElement(entry.target);
        const finalDamage = applyElementDamage(damage, laserAttackElement, targetElement);
        const appliedEnemyDamage = damageNormalEnemy(entry.target, finalDamage, now, false, getElementDamageReaction(laserAttackElement, targetElement));
        if (appliedEnemyDamage > 0) hitCount++;
      }
    });

    state.normalEnemies = (state.normalEnemies || []).filter(enemy => enemy && enemy.hp > 0);
    if (hitCount <= 0) return;

    state.shotsHit += hitCount;
    for (let i = 0; i < hitCount; i++) registerComboHit(c.id, now);
    grantUltGaugeForHits(c, hitCount, c.id);
  }


  function clearMiaChargeState() {
    if (state) {
      state.miaChargeStartedAt = 0;
      state.miaChargePointerId = null;
      if (state.miaChargeMaxTimer) {
        clearTimeout(state.miaChargeMaxTimer);
        state.miaChargeMaxTimer = null;
      }
    }
    const player = document.getElementById(PLAYER_ID);
    if (player) {
      player.classList.remove('mia-charging');
      player.classList.remove('mia-charge-max');
    }
  }

  function beginMiaCharge(pointerId, now) {
    if (!state || state.ended || state.finishing || state.countdown || !state.running) return false;
    const c = getCurrentCharacter();
    if (!c || c.shotType !== 'charge') return false;

    const startedAt = Number(now || performance.now());
    state.miaChargeStartedAt = startedAt;
    state.miaChargePointerId = pointerId;

    if (state.miaChargeMaxTimer) {
      clearTimeout(state.miaChargeMaxTimer);
      state.miaChargeMaxTimer = null;
    }

    const player = document.getElementById(PLAYER_ID);
    if (player) {
      player.classList.add('mia-charging');
      player.classList.remove('mia-charge-max');
    }

    const maxMs = Math.max(1, Number(c.chargeMaxMs || 1000));
    state.miaChargeMaxTimer = setTimeout(() => {
      if (!state || Number(state.miaChargeStartedAt || 0) !== startedAt) return;
      if (state.ended || state.finishing || state.countdown || !state.running) return;
      const current = getCurrentCharacter();
      if (!current || current.shotType !== 'charge') return;
      const currentPlayer = document.getElementById(PLAYER_ID);
      if (currentPlayer && currentPlayer.classList.contains('mia-charging')) {
        currentPlayer.classList.add('mia-charge-max');
      }
      state.miaChargeMaxTimer = null;
    }, maxMs);

    return true;
  }

  function releaseMiaCharge(pointerId, now) {
    if (!state || !state.miaChargeStartedAt) return false;
    if (state.miaChargePointerId !== null && state.miaChargePointerId !== pointerId) return false;

    const startedAt = Number(state.miaChargeStartedAt || 0);
    clearMiaChargeState();

    if (state.ended || state.finishing || state.countdown || !state.running) return false;

    const c = getCurrentCharacter();
    if (!c || c.shotType !== 'charge') return false;

    const minMs = Math.max(0, Number(c.chargeMinMs || 120));
    const maxMs = Math.max(minMs + 1, Number(c.chargeMaxMs || 1000));
    const heldMs = Math.max(0, Number(now || performance.now()) - startedAt);
    if (heldMs < minMs) return false;

    // 威力をチャージ時間に正比例させる。
    // 0.5秒で撃っても1.0秒MAXでも、連続して溜め直せば理論DPSはほぼ一定。
    const chargeRatio = Math.min(1, heldMs / maxMs);

    const activeMember = getActiveMember();
    const itemAtkBuffMultiplier =
      activeMember && Number(now || performance.now()) < (activeMember.atkBuffUntil || 0)
        ? Number(activeMember.atkBuffMultiplier || 1)
        : 1;
    // build823: CHARGEも通常射撃と同じATK UPフィールド補正を受ける。
    // これによりアイナの「紅蓮の領域」(ATK×1.3)が自身のCHARGEにも正しく適用される。
    const wolfFieldAtkMultiplier = getWolfAtkFieldStatus(Number(now || performance.now())).multiplier;

    const damage =
      Number(c.atk || 0) *
      Number(c.shotPowerRate || 1.24) *
      chargeRatio *
      itemAtkBuffMultiplier *
      wolfFieldAtkMultiplier;

    const y = state.player.y - Number(c.shotOffsetY || 44);
    const p = makeProjectile(
      'shooting-bullet shooting-mia-charge-shot' + getCharacterBulletClass(c),
      state.player.x,
      y,
      0,
      -Number(c.bulletSpeed || 760),
      damage,
      c.id
    );
    if (!p) return false;

    // build820: ミア(ID14) / アイナ(ID17)のULT回収をCHARGE量に正比例。
    // MAXなら100%、半分溜めなら50%、最低溜めならその比率だけ獲得する。
    // 短押し連打だけがULT回収で有利になる抜け道を両CHARGEキャラで防ぐ。
    if (
      Number(c.id) === Number(CHARACTER_ID.MIA) ||
      Number(c.id) === Number(CHARACTER_ID.KAINA)
    ) {
      p.ultGainMultiplier = chargeRatio;
    }

    const minSize = Math.max(18, Number(c.chargeMinSize || 30));
    const maxSize = Math.max(minSize, Number(c.chargeMaxSize || 76));
    const size = minSize + (maxSize - minSize) * chargeRatio;
    p.el.style.width = `${size}px`;
    p.el.style.height = `${size}px`;
    // positionUnit() already uses translate(-50%,-50%) to place projectiles by center.
    // Legacy negative margins shifted CHARGE shots half a bullet to the left/up.
    // Keep margins at zero so Mia/Aina fire from the player's true center line.
    p.el.style.marginLeft = '0px';
    p.el.style.marginTop = '0px';
    p.el.style.setProperty('--mia-charge-ratio', String(chargeRatio));

    // サイズは直前にJSで確定しているためgetBoundingClientRect()による再レイアウトは不要。
    // wave2の高密度弾幕中にここで同期レイアウトを起こすとiPhone WebKitの負荷が跳ねるため、
    // 当たり判定用の半径を直接キャッシュする。
    p._hw = size / 2;
    p._hh = size / 2;

    state.bullets.push(p);
    state.shotIndex = (state.shotIndex || 0) + 1;
    state.lastShotAt = Number(now || performance.now());
    return true;
  }

  function ensureMitoCompanion(c) {
    if (!state) return null;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;

    let el = state.mitoCompanionEl;
    if (!el || !el.isConnected) {
      el = document.createElement('img');
      el.className = 'shooting-mito-companion shooting-mito-summon';
      el.alt = 'ミトの召喚獣';
      el.draggable = false;
      arena.appendChild(el);
      state.mitoCompanionEl = el;
    }

    const src = String(c?.companionImage || 'images/chara_07_battle_set.webp');
    if (el.getAttribute('src') !== src) el.src = src;
    el.style.setProperty('--mito-companion-scale', String(Number(c?.companionScale || 1)));

    let hpEl = state.mitoSummonHpEl;
    if (!hpEl || !hpEl.isConnected) {
      hpEl = document.createElement('div');
      hpEl.className = 'shooting-mito-summon-hp';
      hpEl.innerHTML = '<i></i>';
      arena.appendChild(hpEl);
      state.mitoSummonHpEl = hpEl;
    }
    return el;
  }

  // 旧サイドカー追従APIは互換のため残すが、通常時は召喚獣を表示しない。
  function updateMitoCompanion() {
    if (!state || state.mitoSummonActive) return;
    if (state.mitoCompanionEl) state.mitoCompanionEl.classList.remove('show');
    if (state.mitoSummonHpEl) state.mitoSummonHpEl.classList.remove('show');
  }

  function positionMitoSummon() {
    if (!state || !state.mitoSummonActive) return;
    const c = getBattleCharacter(CHARACTER_ID.MITO);
    const companion = ensureMitoCompanion(c);
    const hpEl = state.mitoSummonHpEl;
    if (!companion) return;

    const x = Number(state.mitoSummonX || 0);
    const y = Number(state.mitoSummonY || 0);
    companion.style.transform =
      `translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(var(--mito-companion-scale,1))`;
    companion.classList.add('show', 'mito-summon-active');

    if (hpEl) {
      const max = Math.max(1, Number(state.mitoSummonHpMax || 1));
      const ratio = clamp(Number(state.mitoSummonHp || 0) / max, 0, 1);
      const fill = hpEl.querySelector('i');
      if (fill) fill.style.transform = `scaleX(${ratio})`;
      hpEl.style.transform =
        `translate3d(${x}px,${y - 52}px,0) translate(-50%,-50%)`;
      hpEl.classList.toggle('low', ratio <= 0.30);
      hpEl.classList.add('show');
    }
  }

  function hideMitoSummon() {
    if (!state) return;
    if (state.mitoCompanionEl) {
      state.mitoCompanionEl.classList.remove('show', 'mito-summon-active', 'hit');
    }
    if (state.mitoSummonHpEl) {
      state.mitoSummonHpEl.classList.remove('show', 'low', 'hit');
    }
  }

  function getMitoSummonCharacter() {
    return getBattleCharacter(CHARACTER_ID.MITO) || SHOOTING_CHARACTERS?.[CHARACTER_ID.MITO] || null;
  }

  function healMitoFromSummon(amount) {
    if (!state) return 0;
    const mitoMember = getPartyMember(CHARACTER_ID.MITO);
    if (!mitoMember || mitoMember.hp <= 0) return 0;

    const before = Number(mitoMember.hp || 0);
    mitoMember.hp = Math.min(
      Math.max(1, Number(mitoMember.hpMax || before || 1)),
      before + Math.max(0, Number(amount || 0))
    );
    return Math.max(0, mitoMember.hp - before);
  }

  function finishMitoSummon(reason) {
    if (!state || !state.mitoSummonActive) return;
    const timedOut = reason === 'timeout';
    const remainingHp = Math.max(0, Number(state.mitoSummonHp || 0));

    state.mitoSummonActive = false;
    state.mitoSummonExpireAt = 0;
    state.mitoSummonVx = 0;
    state.mitoSummonVy = 0;
    state.mitoSummonInvulnUntil = 0;
    state.mitoSummonContactInvulnUntil = 0;

    hideMitoSummon();

    // 8秒生存した場合だけ残HPをミトへ戻す。
    if (timedOut && remainingHp > 0) {
      healMitoFromSummon(remainingHp);
      renderHud();
    }

    state.mitoSummonHp = 0;
    state.mitoSummonHpMax = 0;
  }

  function damageMitoSummon(amount, now, attackType) {
    if (!state || !state.mitoSummonActive || state.mitoSummonHp <= 0) return false;
    const mitoMember = getPartyMember(CHARACTER_ID.MITO);
    const raw = Math.max(0, Number(amount || 0));
    const resolved = mitoMember
      ? resolveIncomingDamage(mitoMember, raw, attackType || 'raw')
      : raw;
    const applied = Math.min(Number(state.mitoSummonHp || 0), Math.max(0, Number(resolved || 0)));
    if (applied <= 0) return false;

    state.mitoSummonHp = Math.max(0, Number(state.mitoSummonHp || 0) - applied);

    const el = state.mitoCompanionEl;
    if (el) {
      el.classList.remove('hit');
      void el.offsetWidth;
      el.classList.add('hit');
      setTimeout(() => el && el.classList.remove('hit'), 110);
    }
    if (state.mitoSummonHpEl) {
      state.mitoSummonHpEl.classList.remove('hit');
      void state.mitoSummonHpEl.offsetWidth;
      state.mitoSummonHpEl.classList.add('hit');
    }

    showDamageNumber(
      Number(state.mitoSummonX || 0),
      Number(state.mitoSummonY || 0),
      applied,
      'player',
      false
    );
    positionMitoSummon();

    if (state.mitoSummonHp <= 0) finishMitoSummon('hp_zero');
    return true;
  }

  function tryDamageMitoSummonFromEnemyBullet(p, arenaRect, now) {
    if (!state || !state.mitoSummonActive || !p || !p.el) return false;
    if (now < Number(state.mitoSummonInvulnUntil || 0)) return false;

    const companion = state.mitoCompanionEl;
    if (!companion || !companion.isConnected) return false;

    const bulletRect = getUnitRect(p, arenaRect);
    const summonRect = companion.getBoundingClientRect();
    if (!rectsHit(bulletRect, summonRect, 4, 14)) return false;

    const c = getMitoSummonCharacter();
    state.mitoSummonInvulnUntil =
      now + Math.max(40, Number(c?.summonBulletInvulnMs || 90));
    damageMitoSummon(Number(p.damage || 0), now, classifyIncomingAttack(p));

    // 常駐WARNINGだけは既存ルールどおり弾を消さない。
    return !p.ambushPersistent;
  }

  function fireMitoSummon(now) {
    if (!state || !state.mitoSummonActive) return;
    const c = getMitoSummonCharacter();
    if (!c) return;

    const fireRate = Math.max(30, Number(c.fireRate || 170));
    if (now - Number(state.mitoSummonLastShotAt || -9999) < fireRate) return;
    state.mitoSummonLastShotAt = now;

    const mitoMember = getPartyMember(CHARACTER_ID.MITO);
    const itemAtkBuffMultiplier =
      mitoMember && now < Number(mitoMember.atkBuffUntil || 0)
        ? Number(mitoMember.atkBuffMultiplier || 1)
        : 1;
    const wolfFieldAtkMultiplier = getWolfAtkFieldStatus(now).multiplier;
    const effectivePower =
      Number(c.atk || 0) *
      Number(c.shotPowerRate || 0.095) *
      itemAtkBuffMultiplier *
      wolfFieldAtkMultiplier;

    const x = Number(state.mitoSummonX || 0);
    const y = Number(state.mitoSummonY || 0) - Number(c.companionShotOffsetY || c.shotOffsetY || 38);
    const shotCount = Math.max(1, Math.floor(Number(c.shotCount || 1)));
    const spacing = Number(c.shotSpacing || 0);
    const speed = Number(c.bulletSpeed || 780);
    const bulletClass =
      'shooting-bullet' +
      getCharacterShotStyleClass(c) +
      getCharacterBulletClass(c) +
      ' shooting-bullet-mito-companion';

    for (let i = 0; i < shotCount; i++) {
      const offset = getCenteredShotOffset(i, shotCount, spacing);
      const p = makeProjectile(
        bulletClass,
        x + offset,
        y,
        0,
        -speed,
        effectivePower,
        c.id
      );
      if (!p) continue;
      p.mitoSummonShot = true;
      p.noUltGain = true;
      state.bullets.push(p);
    }
  }

  function updateMitoSummonContactDamage(now, arenaRect) {
    if (!state || !state.mitoSummonActive) return;
    if (now < Number(state.mitoSummonContactInvulnUntil || 0)) return;

    const companion = state.mitoCompanionEl;
    if (!companion || !companion.isConnected) return;
    const summonRect = companion.getBoundingClientRect();
    const c = getMitoSummonCharacter();

    if (isNormalBattle()) {
      const hitEnemy = (state.normalEnemies || []).find(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return false;
        if (
          enemy.def?.behavior === 'generic_element_charge_v1' &&
          enemy.attackState !== 'dash'
        ) return false;
        return rectsHit(summonRect, getUnitRect(enemy, arenaRect), 13, 10);
      });
      if (hitEnemy) {
        state.mitoSummonContactInvulnUntil =
          now + Math.max(250, Number(c?.summonContactInvulnMs || 650));
        damageMitoSummon(
          Number(hitEnemy.def && (hitEnemy.def.contactDamage || hitEnemy.def.bulletDamage)) || 85,
          now,
          'normal'
        );
      }
      return;
    }

    const boss = document.getElementById(BOSS_ID);
    if (boss && state.boss && state.boss.hp > 0 && rectsHit(summonRect, boss.getBoundingClientRect(), 14, 20)) {
      state.mitoSummonContactInvulnUntil =
        now + Math.max(250, Number(c?.summonContactInvulnMs || 650));
      damageMitoSummon(Number(BOSS.contactDamage || BOSS.bulletDamage) || 200, now, 'boss-heavy');
    }
  }

  function updateMitoSummon(dt, now) {
    if (!state || !state.mitoSummonActive) return;
    if (now >= Number(state.mitoSummonExpireAt || 0)) {
      finishMitoSummon('timeout');
      return;
    }

    const c = getMitoSummonCharacter();
    const arena = document.getElementById('shooting-arena');
    const companion = ensureMitoCompanion(c);
    if (!arena || !companion) return;

    const w = Number(arena.clientWidth || 0);
    const h = Number(arena.clientHeight || 0);
    const marginX = 32;
    const marginY = 44;

    let x = Number(state.mitoSummonX || w * 0.5);
    let y = Number(state.mitoSummonY || h * 0.65);
    let vx = Number(state.mitoSummonVx || 0);
    let vy = Number(state.mitoSummonVy || 0);

    x += vx * dt;
    y += vy * dt;

    if (x <= marginX) {
      x = marginX;
      vx = Math.abs(vx);
    } else if (x >= w - marginX) {
      x = Math.max(marginX, w - marginX);
      vx = -Math.abs(vx);
    }

    if (y <= marginY) {
      y = marginY;
      vy = Math.abs(vy);
    } else if (y >= h - marginY) {
      y = Math.max(marginY, h - marginY);
      vy = -Math.abs(vy);
    }

    state.mitoSummonX = x;
    state.mitoSummonY = y;
    state.mitoSummonVx = vx;
    state.mitoSummonVy = vy;

    positionMitoSummon();
    fireMitoSummon(now);
    updateMitoSummonContactDamage(now, arena.getBoundingClientRect());
  }

  function spawnMitoSummon(c) {
    if (!state || !c || state.ended || state.finishing) return;

    // 再発動は古い個体を回復変換せず置換。
    if (state.mitoSummonActive) finishMitoSummon('replaced');

    const arena = document.getElementById('shooting-arena');
    const companion = ensureMitoCompanion(c);
    if (!arena || !companion) return;

    const now = performance.now();
    const duration = Math.max(1000, Number(c.summonDurationMs || 8000));
    const hpMax = Math.max(1, Number(c.hp || getPartyMember(CHARACTER_ID.MITO)?.hpMax || 1));
    const speed = Math.max(80, Number(c.summonMoveSpeed || 250));
    const w = Number(arena.clientWidth || 0);
    const h = Number(arena.clientHeight || 0);

    state.mitoSummonActive = true;
    state.mitoSummonHpMax = hpMax;
    state.mitoSummonHp = hpMax;
    state.mitoSummonExpireAt = now + duration;
    state.mitoSummonLastShotAt = now - Number(c.fireRate || 170);
    state.mitoSummonInvulnUntil = now + 180;
    state.mitoSummonContactInvulnUntil = now + 350;
    state.mitoSummonX = clamp(Number(state.player.x || w * 0.5) + 44, 32, Math.max(32, w - 32));
    state.mitoSummonY = clamp(Number(state.player.y || h * 0.7) - 22, 44, Math.max(44, h - 44));

    const angle = (-Math.PI * 0.65) + Math.random() * (Math.PI * 0.30);
    state.mitoSummonVx = Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1);
    state.mitoSummonVy = Math.sin(angle) * speed;

    positionMitoSummon();
  }

  function useMitoUlt(c) {
    if (!state || state.ended || state.finishing) return;

    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-mito');

    // 時間停止・弾消去・突撃ラッシュは廃止。
    spawnMitoSummon(c);
    renderHud();
  }

  function spawnVeronicaSlashVisual(c) {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !state) return;
    const el = document.createElement('div');
    el.className = 'shooting-veronica-slash';
    el.style.left = `${Number(state.player.x || 0)}px`;
    el.style.top = `${Number(state.player.y || 0) - 6}px`;
    el.style.setProperty('--veronica-slash-width', `${Math.max(60, Number(c.slashWidth || 120))}px`);
    el.style.setProperty('--veronica-slash-range', `${Math.max(70, Number(c.slashRange || 140))}px`);
    el.style.setProperty('--veronica-slash-ms', `${Math.max(100, Number(c.slashVisualMs || 180))}ms`);
    arena.appendChild(el);
    setTimeout(() => el.remove(), Math.max(140, Number(c.slashVisualMs || 180)) + 80);
  }

  function applyVeronicaSlash(c, damage, now) {
    if (!state || !c) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    // エフェクトと当たり判定を同じ「斬撃矩形」から計算する。
    // 以前は敵の中心点(x/y)だけで判定していたため、見た目の半月が敵の身体に
    // 重なっていても中心点が範囲外だとMISSになるケースがあった。
    const px = Number(state.player.x || 0);
    const py = Number(state.player.y || 0);
    const range = Math.max(60, Number(c.slashRange || 140));
    const width = Math.max(60, Number(c.slashWidth || 120));
    const halfWidth = width / 2;
    const attackElement = normalizeCombatElement(c.element);
    const arenaRect = arena.getBoundingClientRect();
    let connected = false;
    let comboConnected = false;

    // CSS visual:
    // left=player.x / top=player.y-6 / width=slashWidth / height=slashRange /
    // transform:translate(-50%,-100%)
    // とほぼ同じ矩形。アニメーション中のscale分だけごく小さく許容を足す。
    const forgivenessX = 8;
    const forgivenessY = 10;
    const slashRect = {
      left: arenaRect.left + px - halfWidth - forgivenessX,
      right: arenaRect.left + px + halfWidth + forgivenessX,
      top: arenaRect.top + (py - 6) - range - forgivenessY,
      bottom: arenaRect.top + (py - 6) + forgivenessY
    };

    const getTargetRect = target => {
      if (!target) return null;

      // 通常敵は毎フレームDOM計測しない既存の数値hitboxを優先。
      if (target.el) {
        let hw = Number(target._hw || 0);
        let hh = Number(target._hh || 0);
        if (hw <= 0 || hh <= 0) {
          measureUnitSize(target);
          hw = Number(target._hw || 0);
          hh = Number(target._hh || 0);
        }
        if (hw > 0 && hh > 0) return getUnitRect(target, arenaRect);

        // 画像初期化直後などサイズキャッシュがまだ取れない場合だけDOM矩形へ退避。
        const r = target.el.getBoundingClientRect();
        if (r && r.width > 0 && r.height > 0) return r;
      }

      // ボスなどDOM参照を直接持たない対象用の座標フォールバック。
      const tx = arenaRect.left + Number(target.x || 0);
      const ty = arenaRect.top + Number(target.y || 0);
      const fallbackHalfW = target === state.boss ? 48 : 28;
      const fallbackHalfH = target === state.boss ? 48 : 28;
      return {
        left: tx - fallbackHalfW,
        right: tx + fallbackHalfW,
        top: ty - fallbackHalfH,
        bottom: ty + fallbackHalfH
      };
    };

    const inSlash = target => {
      const targetRect = getTargetRect(target);
      return !!targetRect && rectsHit(slashRect, targetRect, 0, 4);
    };

    if (isNormalBattle() || hasBossAdds()) {
      (state.normalEnemies || []).slice().forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0 || !inSlash(enemy)) return;
        connected = true;
        const targetElement = getCombatTargetElement(enemy);
        const finalDamage = applyElementDamage(damage, attackElement, targetElement);
        const appliedEnemyDamage = damageNormalEnemy(enemy, finalDamage, now, true, getElementDamageReaction(attackElement, targetElement));
        if (appliedEnemyDamage > 0) comboConnected = true;
      });
      state.normalEnemies = (state.normalEnemies || []).filter(enemy => enemy && enemy.hp > 0);
      evaluateNormalMission(now);
    }

    if (!isNormalBattle() && state.boss && state.boss.hp > 0 && inSlash(state.boss)) {
      connected = true;
      const targetElement = getCombatTargetElement(state.boss);
      const finalDamage = applyElementDamage(damage, attackElement, targetElement);
      const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(finalDamage || 0)));
      state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
      updateBossPhase();
      createHit(Number(state.boss.x || px), Number(state.boss.y || (py - range * .55)), true);
      showBossDamageNumber(appliedDamage, true, getElementDamageReaction(attackElement, targetElement));
      flashBossHit(true);
      if (!addScoreAttackDamageScore(appliedDamage)) addLegacyCombatScore(Math.round(appliedDamage * 100));
      if (appliedDamage > 0) comboConnected = true;
      if (state.boss.hp <= 0) beginBossDefeat();
    }

    // 近接斬撃は通常Projectileを生成しないため、命中時のコンボ/ULTゲージをここで明示的に加算する。
    // 複数の敵を同時に斬っても、1回の斬撃につきゲージ加算は1回とする。
    if (connected) {
      state.shotsHit = Number(state.shotsHit || 0) + 1;
      registerComboHit(c.id, now, comboConnected ? 1 : 0);
      if (comboConnected) grantUltGaugeForHits(c, 1, c.id);
    }

    // エフェクト生成も同じfirePlayer呼び出し内で実行するため、
    // 「斬撃エフェクト1回 = 当たり判定1回」の周期を常に一致させる。
    spawnVeronicaSlashVisual(c);
    renderHud();
  }

  function fireCharacterSubShot(c, now, powerMultiplier, itemAtkBuffMultiplier, wolfFieldAtkMultiplier) {
    if (!state || !c || !c.subShot) return;
    const sub = c.subShot;
    const subType = String(sub.type || '').toLowerCase();
    if (!subType) return;

    const fireRate = Math.max(1, Number(sub.fireRate || 300));
    state.lastSubShotAtByCharacter = state.lastSubShotAtByCharacter || Object.create(null);
    const key = String(c.id || 'active');
    const lastAt = Number(state.lastSubShotAtByCharacter[key] ?? -9999);
    if (now - lastAt < fireRate) return;
    state.lastSubShotAtByCharacter[key] = now;

    const subElement = String(sub.element || c.element || '').toLowerCase();
    const subConfig = {
      ...c,
      ...sub,
      element: subElement || c.element,
      shotType: subType,
      shotCount: Math.max(1, Math.floor(Number(sub.count || 1))),
      shotSpacing: Number(sub.shotSpacing ?? c.shotSpacing ?? 28),
      bulletSpeed: Number(sub.bulletSpeed ?? c.bulletSpeed ?? 780),
    };
    const subPower =
      Number(c.atk || 0) *
      Number(sub.shotPowerRate ?? c.shotPowerRate ?? 0.095) *
      Number(powerMultiplier || 1) *
      Number(itemAtkBuffMultiplier || 1) *
      Number(wolfFieldAtkMultiplier || 1);
    const startY = state.player.y - Number(sub.shotOffsetY ?? c.shotOffsetY ?? 38);
    const styleClass = getCharacterShotStyleClass(c);
    const elementClass = getCharacterBulletClass({ element: subElement || c.element });
    const bulletClass = 'shooting-bullet' + styleClass + elementClass;

    // v542: SUBは汎用スロット。現時点ではノアの Homing のみ実装・使用する。
    if (subType === 'homing') {
      const count = subConfig.shotCount;
      const sides = count <= 1 ? [1] : Array.from({ length: count }, (_, i) => i - (count - 1) / 2);
      for (let i = 0; i < count; i++) {
        const sideValue = Number(sides[i] ?? 0);
        const side = sideValue === 0 ? 1 : (sideValue < 0 ? -1 : 1);
        const p = createWolfJHomingProjectile(subConfig, side, startY, subPower, bulletClass, now);
        if (!p) continue;
        p.element = subElement || c.element;
        p.attackElement = subElement || c.element;
        state.bullets.push(p);
      }
    }
  }

  function firePlayer(now) {
    // CH04-1/2は回避専用。CH04-3のみ通常射撃あり。
    if (isChapter04Stage() && !isChapter43BossStage()) return;
    if (isChapter43BossStage() && state?.chapter43AttackSealed) return;

    const c = getCurrentCharacter();

    // ミアは自動射撃を行わず、pointerup時のCHARGE RELEASEだけで攻撃する。
    if (c && c.shotType === 'charge') return;

    // 通常キャラは、画面に指/ポインタを置いて操作している間だけ射撃する。
    // 指を離した後も発射済みの弾はそのまま進み、新しい弾だけ生成しない。
    if (!pointerActive) return;

    const attrBulletClass = getCharacterBulletClass(c);
    const styleClass = getCharacterShotStyleClass(c);

    const moonlight =
      c.id === CHARACTER_ID.HAYATE &&
      now < (state.hayateMoonlightUntil || 0);

    const fireRateMultiplier = moonlight
      ? Number(c.moonlightFireRateMultiplier || 1)
      : 1;

    const powerMultiplier = moonlight
      ? Number(c.moonlightPowerMultiplier || 1)
      : 1;

    // ミモザのATK UPアイテムは、取得した瞬間のアクティブキャラ(member)にのみ
    // 紐づく一時バフ。交代すると効果は外れ、他キャラには一切影響しない。
    const activeMember = getActiveMember();
    const itemAtkBuffMultiplier =
      activeMember && now < (activeMember.atkBuffUntil || 0)
        ? Number(activeMember.atkBuffMultiplier || 1)
        : 1;
    const wolfFieldAtkMultiplier = getWolfAtkFieldStatus(now).multiplier;

    const effectiveFireRate = Number(c.fireRate || 170) * fireRateMultiplier;
    const effectivePower =
      Number(c.atk || 0) *
      Number(c.shotPowerRate || 0.095) *
      powerMultiplier *
      itemAtkBuffMultiplier *
      wolfFieldAtkMultiplier;

    // SUBはMAINとは独立した射撃間隔を持つ。現時点でSUB所持はノアのみ。
    fireCharacterSubShot(c, now, powerMultiplier, itemAtkBuffMultiplier, wolfFieldAtkMultiplier);

    if (now - state.lastShotAt < effectiveFireRate) return;

    state.lastShotAt = now;
    state.shotIndex = (state.shotIndex || 0) + 1;

    const y = state.player.y - Number(c.shotOffsetY || 38);
    const shotCount = Math.max(1, Math.floor(Number(c.shotCount || 1)));
    const bulletClass = 'shooting-bullet' + styleClass + attrBulletClass;

    // ----------------------------------------------------------
    // ベロニカ：近距離剣撃
    // 弾を飛ばさず、自機前方の短い範囲だけに高威力判定を出す。
    // ----------------------------------------------------------
    if (c.shotType === 'strike') {
      applyVeronicaSlash(c, effectivePower, now);
      return;
    }


    // ----------------------------------------------------------
    // イグニス：連続レーザー
    // ----------------------------------------------------------
    if (c.shotType === 'laser') {
      fireIgnisLaser(c, now);
      return;
    }

    // ----------------------------------------------------------
    // アルノ系：前進しながら円環軌道
    // ----------------------------------------------------------
    if (c.shotType === 'orbit') {
      for (let i = 0; i < shotCount; i++) {
        const p = createArnoOrbitProjectile(c, now, effectivePower);
        if (!p) continue;

        p.orbitPhase =
          i * Number(c.orbitPhaseStep || (Math.PI * 2 / shotCount));

        const spacing = Number(c.shotSpacing || 0);
        if (spacing) {
          const offset = getCenteredShotOffset(i, shotCount, spacing);
          p.centerX += offset;
          p.x += offset;
        }

        state.bullets.push(p);
      }
      return;
    }


    // ----------------------------------------------------------
    // ウルフ：深いJ字ホーミング
    // 左右2発がいったん後方へ沈み、Uターンして同じ標的へ収束。
    // ----------------------------------------------------------
    if (c.shotType === 'homing') {
      const sides = shotCount <= 1 ? [1] : [-1, 1];
      for (let i = 0; i < shotCount; i++) {
        const side = sides[i] ?? (i % 2 === 0 ? -1 : 1);
        const p = createWolfJHomingProjectile(c, side, y, effectivePower, bulletClass, now);
        if (p) state.bullets.push(p);
      }
      return;
    }


    // ----------------------------------------------------------
    // build869 BOMB：着弾点を中心に範囲爆発する独立ショット。
    // ----------------------------------------------------------
    if (c.shotType === 'bomb') {
      ensureBombVisualStyles();
      const bombSize = String(c.bombSize || c.mainShot?.size || 'M').toUpperCase() === 'L' ? 'L' : 'M';
      const attackElement = normalizeCombatElement(c.element) || 'neutral';
      const visual = getBombElementVisual(attackElement);
      const p = makeProjectile(
        bulletClass + ' shooting-bullet-splash' + (bombSize === 'L' ? ' bomb-size-l' : ''),
        state.player.x,
        y,
        0,
        -Number(c.bulletSpeed || 660),
        effectivePower,
        c.id
      );
      if (p) {
        p.kind = 'generic_bomb';
        p.bombSize = bombSize;
        p.splashRadius = Math.max(30, Number(c.bombSplashRadius || (bombSize === 'L' ? 112 : 76)));
        p.splashDamageRate = Math.max(0, Number(c.bombSplashDamageRate ?? 0.55));
        p.attackElement = attackElement;
        p._hw = bombSize === 'L' ? 12 : 10;
        p._hh = bombSize === 'L' ? 12 : 10;
        p.el.style.setProperty('--bomb-color', visual.color);
        p.el.style.setProperty('--bomb-rgb', visual.rgb);
        state.bullets.push(p);
      }
      return;
    }

    // ----------------------------------------------------------
    // CLUSTER：通常弾が着弾すると4/6/8方向へ分裂。
    // ----------------------------------------------------------
    if (c.shotType === 'cluster') {
      ensureBombVisualStyles();
      const bombSize = String(c.clusterSize || c.bombSize || c.mainShot?.size || 'M').toUpperCase() === 'L' ? 'L' : 'M';
      const splitCount = normalizeBombSplitCount(c);
      const attackElement = normalizeCombatElement(c.element) || 'neutral';
      const p = makeProjectile(
        bulletClass + ' shooting-cluster-projectile',
        state.player.x,
        y,
        0,
        -Number(c.bulletSpeed || 660),
        effectivePower,
        c.id
      );
      if (p) {
        // kind名は既存互換のためgeneric_splashを維持するが、build777以降AOEは発生しない。
        p.kind = 'generic_splash';
        p.clusterSize = bombSize;
        p.clusterSplitCount = splitCount;
        p.clusterFragmentDamageRate = Math.max(0, Number(c.clusterFragmentDamageRate ?? c.bombFragmentDamageRate ?? 0.50));
        p.clusterFragmentSpeed = Math.max(120, Number(c.clusterFragmentSpeed || c.bombFragmentSpeed || 430));
        p.clusterFragmentClass = bulletClass;
        p.attackElement = attackElement;
        p.bombBornAt = now; // 既存の分裂処理との互換フィールド

        // 親弾は通常弾と同じ4x22px判定。見た目も通常弾そのもの。
        p._hw = 2;
        p._hh = 11;
        state.bullets.push(p);
      }
      return;
    }

    // ----------------------------------------------------------
    // build806 ニーナ：DIRECT CHAIN LIGHTNING
    // 弾を発射せず、最寄りの敵/OBJECTへ直接放電。最大4体へ連鎖する。
    // ----------------------------------------------------------
    if (c.shotType === 'lightning') {
      fireNinaChainLightning(c, effectivePower, now);
      return;
    }

    // ----------------------------------------------------------
    // 扇状ショット
    // shotCount / shotAngleStep をキャラJSだけで調整
    // ----------------------------------------------------------
    if (c.shotType === 'spread') {
      const angleStep = Number(c.shotAngleStep || 0.18);

      for (let i = 0; i < shotCount; i++) {
        const step = i - (shotCount - 1) / 2;
        const angle = -Math.PI / 2 + angleStep * step;

        state.bullets.push(makeProjectile(
          bulletClass,
          state.player.x,
          y,
          Math.cos(angle) * Number(c.bulletSpeed || 780),
          Math.sin(angle) * Number(c.bulletSpeed || 780),
          effectivePower,
          c.id
        ));
      }
      return;
    }

    // ----------------------------------------------------------
    // 精密射撃
    // chargedEvery / chargedPowerMultiplier もキャラJS側
    // ----------------------------------------------------------
    if (c.shotType === 'piercing' || c.shotType === 'shotgun' || c.shotType === 'precision') {
      const chargedEvery = Math.max(0, Math.floor(Number(c.chargedEvery || 0)));
      const heavy = chargedEvery > 0 && state.shotIndex % chargedEvery === 0;
      const chargedMultiplier = Number(c.chargedPowerMultiplier || 1);

      for (let i = 0; i < shotCount; i++) {
        const spacing = Number(c.shotSpacing || 0);
        const offset = getCenteredShotOffset(i, shotCount, spacing);

        const p = makeProjectile(
          bulletClass + (heavy ? ' charged' : ''),
          state.player.x + offset,
          y,
          0,
          -Number(c.bulletSpeed || 780),
          heavy ? effectivePower * chargedMultiplier : effectivePower,
          c.id
        );
        if (p) {
          // PIERCING は貫通弾。1体につき1回だけ命中し、敵に当たっても消えない。
          p.pierce = true;
          p.piercedTargets = new WeakSet();
          state.bullets.push(p);
        }
      }
      return;
    }

    // ----------------------------------------------------------
    // 並列ショット
    // shotCount / shotSpacing をキャラJSだけで調整
    // ----------------------------------------------------------
    const spacing = Number(c.shotSpacing || 0);

    for (let i = 0; i < shotCount; i++) {
      const offset = getCenteredShotOffset(i, shotCount, spacing);

      state.bullets.push(makeProjectile(
        bulletClass,
        state.player.x + offset,
        y,
        0,
        -Number(c.bulletSpeed || 780),
        effectivePower,
        c.id
      ));
    }

  }

  function isNormalBattle() {
    return !!(state && state.battleType === 'normal');
  }

  function getNormalBattleConfig() {
    return (selectedStage && selectedStage.normalBattle) || {};
  }

  function getBossAddsConfig() {
    return (selectedStage && selectedStage.bossAdds) || null;
  }

  function hasBossAdds() {
    const cfg = getBossAddsConfig();
    return !!(cfg && Array.isArray(cfg.enemyIds) && cfg.enemyIds.length);
  }

  function positionMiniEnemyHp(enemy) {
    if (!enemy || !enemy.hpEl) return;

    const scale = Math.max(
      0.1,
      Number(enemy.displayScale || (enemy.def && enemy.def.uiScale) || 1)
    );

    // Base mobile enemy box is about 60px tall.
    // Keep the HP bar just above the visible unit as uiScale changes.
    const hpOffsetY = 30 * scale + 9;
    const hpY = enemy.y - hpOffsetY;

    enemy.hpEl.style.transform =
      `translate3d(${enemy.x}px,${hpY}px,0) translate(-50%,-50%)`;

    if (enemy.elementEl) {
      const iconX = enemy.x - 43;
      enemy.elementEl.style.transform =
        `translate3d(${iconX}px,${hpY}px,0) translate(-50%,-50%)`;
    }

    if (enemy.weaknessBarrierEl) {
      // build836: 属性バリアは敵本体へ密着。
      // 実測済みサイズを最優先し、生成直後だけCSS基準サイズで補完する。
      // 旧82px基準の大きなリングは廃止し、敵画像の外周+約2%だけにする。
      const scale = Math.max(0.1, Number(enemy.displayScale || 1));
      const measuredDiameter = Math.max(
        Number(enemy._hw || 0) * 2,
        Number(enemy._hh || 0) * 2
      );
      const fallbackDiameter = 62 * scale;
      const barrierSize = Math.max(50, (measuredDiameter > 0 ? measuredDiameter : fallbackDiameter) * 1.02);
      enemy.weaknessBarrierEl.style.width = `${barrierSize}px`;
      enemy.weaknessBarrierEl.style.height = `${barrierSize}px`;
      enemy.weaknessBarrierEl.style.transform =
        `translate3d(${enemy.x}px,${enemy.y}px,0) translate(-50%,-50%)`;
    }
  }

  function renderMiniEnemyHp(enemy, flash) {
    if (!enemy || !enemy.hpEl) return;
    const fill = enemy.hpEl.querySelector('i');
    const max = Math.max(1, Number(enemy.hpMax || 1));
    const ratio = Math.max(0, Math.min(1, Number(enemy.hp || 0) / max));
    if (fill) fill.style.transform = `scaleX(${ratio})`;

    enemy.hpEl.classList.toggle('low', ratio <= .30);

    if (flash) {
      enemy.hpEl.classList.remove('hit');
      void enemy.hpEl.offsetWidth;
      enemy.hpEl.classList.add('hit');
      setTimeout(() => enemy.hpEl && enemy.hpEl.classList.remove('hit'), 180);
    }
  }

  function createNormalEnemy(enemyDef, now) {
    const arena = document.getElementById('shooting-arena');
    const layer = document.getElementById('shooting-normal-enemy-layer');
    if (!arena || !layer || !enemyDef) return null;

    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const el = document.createElement('img');
    el.className = 'shooting-mini-enemy spawning';
    el.src = enemyDef.image;
    el.alt = enemyDef.name || '敵';
    el.draggable = false;

    const baseEnemyScale = Math.max(0.1, Number(enemyDef.uiScale || 1));
    const isChapter02MidBoss =
      getSelectedBaseStageId() === 'shooting_ch02_04' &&
      enemyDef.behavior === 'mini_violence_v1';
    const displayScale = isChapter02MidBoss
      ? baseEnemyScale * 2.5
      : baseEnemyScale;

    el.style.setProperty('--enemy-scale', String(displayScale));
    if (isChapter02MidBoss) el.classList.add('shooting-ch02-midboss');
    if (enemyDef.strongEnemy) el.classList.add('shooting-strong-enemy');
    layer.appendChild(el);

    // 雑魚敵共通HPバー
    const hpWrap = document.createElement('div');
    hpWrap.className = 'shooting-mini-enemy-hp';
    hpWrap.setAttribute('aria-hidden', 'true');
    hpWrap.innerHTML = '<i></i>';
    layer.appendChild(hpWrap);

    // 属性アイコンはHPバーと同じレイヤーの独立DOMとして配置する。
    const enemyElement = normalizeCombatElement(
      enemyDef.element ||
      selectedStage?.enemyElement ||
      selectedStage?.element
    );
    let elementEl = null;
    const elementIconSrc = getCombatElementIcon(enemyElement);
    if (elementIconSrc) {
      elementEl = document.createElement('img');
      elementEl.className = 'shooting-mini-enemy-element-icon';
      elementEl.src = elementIconSrc;
      elementEl.alt = '';
      elementEl.setAttribute('aria-hidden', 'true');
      elementEl.draggable = false;
      layer.appendChild(elementEl);
    }

    // build549: DAILY上級の耐性雑魚は、敵属性と同色のバリアを常時表示する。
    // 例：DARKバリアならLIGHTのWeak攻撃だけがダメージを通せる。
    let weaknessBarrierEl = null;
    if (selectedStage && (selectedStage.weaknessOnlyEnemies === true || isDailyAdvancedGimmickStage()) && enemyElement !== 'neutral') {
      weaknessBarrierEl = document.createElement('div');
      weaknessBarrierEl.className = `shooting-mini-enemy-weakness-barrier element-${enemyElement}`;
      weaknessBarrierEl.dataset.element = enemyElement;
      weaknessBarrierEl.setAttribute('aria-hidden', 'true');
      layer.appendChild(weaknessBarrierEl);
      el.classList.add('has-weakness-barrier');
    }

    const lane = state.normalSpawned % 4;
    const lanes = [w * .20, w * .40, w * .60, w * .80];
    const spawnIndex = Number(state.normalSpawned || 0);
    const x = enemyDef.strongEnemy
      ? w * .50
      : lanes[lane] + (fixedStagePatternRandom('normal_spawn_x', spawnIndex, 0) - .5) * Math.min(28, w * .06);
    const y = enemyDef.strongEnemy
      ? Math.max(86, h * .145)
      : Math.max(92, h * (.16 + (state.normalSpawned % 2) * .075));
    const cfg = getNormalBattleConfig();
    const stageEnemyHp = Number(cfg.enemyHp);
    const enemyHp = Number.isFinite(stageEnemyHp)
      ? stageEnemyHp
      : Number(enemyDef.hp || 18);

    const enemy = {
      uid: `mini_${String(state.stageId || 'stage')}_${spawnIndex}`,
      def: enemyDef, el, hpEl: hpWrap, elementEl, weaknessBarrierEl, x, y, baseX: x, baseY: y,
      displayScale,
      element: enemyElement,
      hp: enemyHp,
      hpMax: enemyHp,
      spawnedAt: now,
      lastShotAt: now + fixedStagePatternRandom('normal_first_shot', spawnIndex, 0) * 500,
      phaseSeed: fixedStagePatternRandom('normal_phase_seed', spawnIndex, 0) * Math.PI * 2,
      nextActionAt: now + 900 + fixedStagePatternRandom('normal_next_action', spawnIndex, 0) * 450,
      actionIndex: state.normalSpawned % 3,
      patternVolleyIndex: 0,
      attackState: 'idle',
      attackExecuteAt: 0,
      dashUntil: 0,
      dashVx: 0,
      dashVy: 0,
    };
    positionUnit(el, x, y);
    positionMiniEnemyHp(enemy);
    renderMiniEnemyHp(enemy);
    requestAnimationFrame(() => {
      el.classList.remove('spawning');
      // spawningクラス除去後(最終的な--enemy-scale込みの見た目)でサイズを実測してキャッシュする。
      // ここでのgetBoundingClientRect呼び出しは生成時に1回だけなので、毎フレームのコストにはならない。
      measureUnitSize(enemy);
      // 実測した敵サイズで属性バリアを即座に再フィットする。
      positionMiniEnemyHp(enemy);
    });
    return enemy;
  }

  function spawnNormalEnemies(now) {
    if (!isNormalBattle() || state.finishing || state.ended) return;
    const cfg = getNormalBattleConfig();

    // アイテム収集ミッションは、必要数を拾うまで敵が枯渇しないよう保証する。
    // ステージ設定が有限敵でも、収集未達成の間だけは補充を継続する。
    const effectiveMission = getEffectiveNormalMission();
    const collectMissionActive =
      effectiveMission &&
      effectiveMission.type === SHOOTING_MISSION_TYPE.COLLECT_ITEM &&
      state.collectedItems < Number(effectiveMission.target || 3);

    const infiniteEnemies = !!cfg.infiniteEnemies || collectMissionActive;
    const total = Number(cfg.totalEnemies || 7);
    const maxActive = Number(cfg.maxActive || 2);
    const interval = Number(cfg.spawnIntervalMs || 900);

    // 無限湧き、または未達成の収集ミッションでは撃破数でスポーンを止めない。
    if ((!infiniteEnemies && state.normalSpawned >= total) || state.normalEnemies.length >= maxActive) return;
    if (now - state.normalLastSpawnAt < interval) return;
    const enemyIds = (
      selectedStage &&
      Array.isArray(selectedStage.enemyIds) &&
      selectedStage.enemyIds.length
    ) ? selectedStage.enemyIds : [];
    if (!enemyIds.length) return;

    const spawnOne = () => {
      const sequence = Array.isArray(cfg.enemySequence) ? cfg.enemySequence : null;
      const enemyId = sequence && sequence.length
        ? sequence[state.normalSpawned % sequence.length]
        : enemyIds[state.normalSpawned % enemyIds.length];
      const def = getShootingEnemy(enemyId);
      if (!def || !def.implemented) return false;
      const enemy = createNormalEnemy(def, now);
      if (!enemy) return false;
      state.normalEnemies.push(enemy);
      state.normalSpawned++;
      return true;
    };

    if (cfg.spawnAllAtStart && state.normalSpawned === 0) {
      const burstCount = Math.min(total, maxActive);
      for (let i = 0; i < burstCount; i++) {
        if (!spawnOne()) break;
      }
      state.normalLastSpawnAt = now;
      return;
    }

    if (!spawnOne()) return;
    state.normalLastSpawnAt = now;
  }

  function spawnBossAdds(now) {
    if (isNormalBattle() || !hasBossAdds() || state.finishing || state.ended) return;

    const cfg = getBossAddsConfig();
    const total = Math.max(0, Number(cfg.totalEnemies || 0));
    const maxActive = Math.max(1, Number(cfg.maxActive || 1));
    const interval = Math.max(500, Number(cfg.spawnIntervalMs || 7000));
    const startDelay = Math.max(0, Number(cfg.startDelayMs || 0));

    if (total > 0 && state.normalSpawned >= total) return;
    if (state.normalEnemies.length >= maxActive) return;
    if (now - state.startedAt < startDelay) return;
    if (now - state.normalLastSpawnAt < interval) return;

    const enemyIds = cfg.enemyIds;
    const enemyId = enemyIds[state.normalSpawned % enemyIds.length];
    const def = getShootingEnemy(enemyId);
    if (!def || !def.implemented || def.kind !== 'normal') return;

    const enemy = createNormalEnemy(def, now);
    if (!enemy) return;

    state.normalEnemies.push(enemy);
    state.normalSpawned++;
    state.normalLastSpawnAt = now;
  }

  function shootNormalEnemyProjectile(enemy, angle, speed, damage, className) {
    const projectile = makeProjectile(
      className || 'shooting-enemy-bullet shooting-mini-enemy-bullet',
      enemy.x, enemy.y + 24,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      damage
    );
    if (projectile) {
      projectile.attackElement = getCombatTargetElement(enemy, enemy && enemy.def && enemy.def.element);
      state.enemyBullets.push(projectile);
    }
    return projectile;
  }


  // ============================================================
  // CHAPTER 06 - 破壊不能の遮断壁
  // HPを持たず、通常Projectileを止める。Laser / Shotgun(pierce)は通過。
  // Homingは敵より壁を最優先で追尾する。
  // ============================================================
  function getChapter6BarrierConfig() {
    if (selectedStage && Array.isArray(selectedStage.chapter6Barriers) && selectedStage.chapter6Barriers.length) {
      return selectedStage.chapter6Barriers;
    }

    // build550: DAILY上級は旧stage定義がキャッシュされていても壁を必ず生成する。
    // CH06の壁ロジックをそのまま再利用する固定1枚構成。
    if (isDailyAdvancedGimmickStage()) {
      return [{ xRate:.50, yRate:.49, widthRate:.70, height:23, moveRangeRate:.10, moveSpeed:.30, contactDamage:85 }];
    }

    return [];
  }

  function clearChapter6Barriers() {
    if (!state) return;
    (state.chapter6Barriers || []).forEach(barrier => barrier && barrier.el && barrier.el.remove());
    state.chapter6Barriers = [];
    const arena = document.getElementById('shooting-arena');
    if (arena) arena.querySelectorAll('.shooting-ch06-barrier').forEach(el => el.remove());
  }

  function ensureChapter6Barriers() {
    if (!state) return [];
    const cfg = getChapter6BarrierConfig();
    if (!cfg.length) {
      if ((state.chapter6Barriers || []).length) clearChapter6Barriers();
      return [];
    }
    const arena = document.getElementById('shooting-arena');
    if (!arena) return [];
    if ((state.chapter6Barriers || []).length === cfg.length) return state.chapter6Barriers;

    clearChapter6Barriers();
    state.chapter6Barriers = cfg.map((def, index) => {
      const el = document.createElement('div');
      el.className = 'shooting-ch06-barrier';
      el.innerHTML = '<i></i><b></b>';
      el.setAttribute('aria-hidden', 'true');
      arena.appendChild(el);
      return {
        uid: `ch06_barrier_${index}`,
        isChapter6Barrier: true,
        def,
        el,
        x: 0,
        y: 0,
        width: 0,
        height: Math.max(22, Number(def.height || 44)),
      };
    });
    return state.chapter6Barriers;
  }

  function updateChapter6Barriers(now) {
    const barriers = ensureChapter6Barriers();
    if (!barriers.length) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const w = Number(arena.clientWidth || 0);
    const h = Number(arena.clientHeight || 0);
    const t = Math.max(0, Number(now || performance.now()) - Number(state.startedAt || now)) / 1000;

    barriers.forEach((barrier, index) => {
      const def = barrier.def || {};
      const baseX = w * Number(def.xRate != null ? def.xRate : .5);
      const moveRange = w * Math.max(0, Number(def.moveRangeRate || 0));
      const moveSpeed = Math.max(0, Number(def.moveSpeed || 0));
      const phase = Number(def.phase || index * 1.7);
      barrier.x = clamp(baseX + Math.sin(t * moveSpeed + phase) * moveRange, 34, Math.max(34, w - 34));
      barrier.y = h * Number(def.yRate != null ? def.yRate : .48);
      barrier.width = Math.max(70, w * Number(def.widthRate || .55));
      barrier.height = Math.max(22, Number(def.height || 44));
      barrier.el.style.width = `${barrier.width}px`;
      barrier.el.style.height = `${barrier.height}px`;
      barrier.el.style.transform = `translate3d(${barrier.x}px,${barrier.y}px,0) translate(-50%,-50%)`;
    });
  }

  function getChapter6BarrierRect(barrier, arenaRect) {
    if (!barrier || !arenaRect) return null;
    const halfW = Number(barrier.width || 0) * .5;
    const halfH = Number(barrier.height || 0) * .5;
    const cx = Number(arenaRect.left || 0) + Number(barrier.x || 0);
    const cy = Number(arenaRect.top || 0) + Number(barrier.y || 0);
    return { left:cx-halfW, right:cx+halfW, top:cy-halfH, bottom:cy+halfH };
  }

  function findChapter6BarrierCollision(projectileRect, arenaRect, projectile) {
    if (!projectileRect || !state || !(state.chapter6Barriers || []).length) return null;
    return (state.chapter6Barriers || []).find(barrier => {
      if (!barrier || !barrier.el) return false;
      if (projectile && projectile.pierce && projectile.piercedTargets && projectile.piercedTargets.has(barrier)) return false;
      const rect = getChapter6BarrierRect(barrier, arenaRect);
      return !!rect && rectsHit(projectileRect, rect, 0, 0);
    }) || null;
  }

  function pulseChapter6Barrier(barrier) {
    if (!barrier || !barrier.el) return false;

    // build551: 高速多弾が壁へ当たるたびoffsetWidthを読むと、
    // 1発ごとに同期レイアウトが発生してiOSの入力まで止まりやすい。
    // 判定自体は全弾処理し、見た目のパルスだけ約10fpsに制限する。
    const now = performance.now();
    if (now < Number(barrier._hitFxUntil || 0)) return false;
    barrier._hitFxUntil = now + 96;

    barrier.el.classList.add('hit');
    if (barrier._hitFxTimer) clearTimeout(barrier._hitFxTimer);
    barrier._hitFxTimer = setTimeout(() => {
      if (barrier && barrier.el) barrier.el.classList.remove('hit');
      barrier._hitFxTimer = null;
    }, 120);
    return true;
  }

  function getChapter4CurtainConfig() {
    if (!selectedStage) return null;
    return selectedStage.chapter4Curtain || null;
  }

  function getChapter4ShrinkBounds(now, arenaWidth) {
    if (!state || !selectedStage) return { left:0, right:0, ratio:1, progress:0 };

    if (isChapter43BossStage() && state.chapter43Wave2CountdownTriggered) {
      const cfg43 = getChapter43Config();
      const start = Number(state.chapter43CollapseStartedAt || now);
      const end = Math.max(start + 1000, Number(state.chapter43CollapseDeadlineAt || start + 45000));
      const minWidthRatio = clamp(Number(cfg43?.collapseMinWidthRatio || .20), .16, 1);
      const progress = clamp((Number(now) - start) / (end - start), 0, 1);
      const ratio = 1 - (1 - minWidthRatio) * progress;
      const inset = Math.max(0, arenaWidth * (1 - ratio) * .5);
      return { left:inset, right:inset, ratio, progress };
    }

    const cfg = selectedStage.shrinkWalls;
    if (!cfg || !isSelectedBaseStage(SHOOTING_STAGE_ID.CH04_02)) {
      return { left:0, right:0, ratio:1, progress:0 };
    }
    const elapsed = Math.max(0, (Number(now || performance.now()) - Number(state.startedAt || performance.now())) / 1000);
    const startAt = Math.max(0, Number(cfg.startAtSeconds || 0));
    const endAt = Math.max(startAt + .001, Number(cfg.endAtSeconds || getBattleTimeLimitSeconds() || 60));
    const minWidthRatio = clamp(Number(cfg.minWidthRatio || .5), .2, 1);
    const progress = elapsed <= startAt ? 0 : clamp((elapsed - startAt) / (endAt - startAt), 0, 1);
    const ratio = 1 - (1 - minWidthRatio) * progress;
    const inset = Math.max(0, arenaWidth * (1 - ratio) * .5);
    return { left:inset, right:inset, ratio, progress };
  }

  function ensureChapter4ShrinkWalls() {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return { leftWall: null, rightWall: null };
    let leftWall = arena.querySelector('.shooting-ch04-shrink-wall.left');
    let rightWall = arena.querySelector('.shooting-ch04-shrink-wall.right');
    if (!leftWall) {
      leftWall = document.createElement('div');
      leftWall.className = 'shooting-ch04-shrink-wall left';
      arena.appendChild(leftWall);
    }
    if (!rightWall) {
      rightWall = document.createElement('div');
      rightWall.className = 'shooting-ch04-shrink-wall right';
      arena.appendChild(rightWall);
    }
    return { leftWall, rightWall };
  }

  function updateChapter4ShrinkWalls(now) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const walls = ensureChapter4ShrinkWalls();

    // CH04-2の迫る壁は「実戦中かつ縮小開始後」だけ表示する。
    // RETRY直後 / BOSS INTRO / カウントダウン中は、前回のinline widthも含めて完全に初期化。
    const inActiveBattle = !!(
      state &&
      state.running &&
      !state.countdown &&
      !state.ended &&
      !state.finishing &&
      selectedStage &&
      isSelectedBaseStage(SHOOTING_STAGE_ID.CH04_02) &&
      selectedStage.shrinkWalls
    );

    const bounds = inActiveBattle
      ? getChapter4ShrinkBounds(now, Number(arena.clientWidth || 0))
      : { left: 0, right: 0, progress: 0 };
    const visible = inActiveBattle && Number(bounds.progress || 0) > 0;

    [walls.leftWall, walls.rightWall].forEach(el => {
      if (!el) return;
      if (!visible) {
        el.style.display = 'none';
        el.style.width = '0px';
      } else {
        el.style.display = 'block';
      }
    });
    if (!visible) return;

    if (walls.leftWall) walls.leftWall.style.width = `${Math.round(bounds.left)}px`;
    if (walls.rightWall) walls.rightWall.style.width = `${Math.round(bounds.right)}px`;
  }

  function fireChapter4CurtainVolley(now, damage, bulletClassName) {
    const arena = document.getElementById('shooting-arena');
    const cfg = getChapter4CurtainConfig();
    if (!arena || !cfg) return;
    const w = Number(arena.clientWidth || 0);
    const speed = Math.max(50, Number(cfg.speed || 120));
    const rowGapY = Math.max(10, Number(cfg.rowGapY || 24));
    const stageInset = getChapter4ShrinkBounds(now, w);
    const laneLeft = 7 + Number(stageInset.left || 0);
    const laneRight = Math.max(laneLeft + 60, w - 7 - Number(stageInset.right || 0));
    const laneWidth = Math.max(60, laneRight - laneLeft);
    const baseClass = bulletClassName || 'shooting-enemy-bullet shooting-mini-enemy-bullet';

    // v74: CH04の▼を全体で約20%減。
    // 等間隔は使わず、左右端までまんべんなく散らす。
    // 7区画に分けてランダム化し、総数は上4 + 下3 = 7発にする。
    const volleyIndex = Number(state.chapter4CurtainVolleyIndex || 0);
    state.chapter4CurtainVolleyIndex = volleyIndex + 1;
    const totalCount = 7;
    const segment = laneWidth / totalCount;
    const positions = [];
    for (let i = 0; i < totalCount; i++) {
      const segLeft = laneLeft + i * segment;
      const margin = Math.min(8, segment * 0.16);
      const innerLeft = segLeft + margin;
      const innerRight = segLeft + segment - margin;
      const x = innerLeft + fixedStagePatternRandom('ch04_curtain_x', volleyIndex, i) * Math.max(1, innerRight - innerLeft);
      positions.push(x);
    }

    // 毎波の並び替えも固定シード化。再挑戦しても同じ順序になる。
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(fixedStagePatternRandom('ch04_curtain_shuffle', volleyIndex, i) * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    const top = positions.slice(0, 4);
    const bottom = positions.slice(4, 7);
    const spawn = (list, y, rowIndex) => {
      list.forEach((x, i) => {
        const p = makeProjectile(`${baseClass} shooting-ch04-curtain-bullet`, x, y, 0, speed, damage);
        if (!p) return;
        // 縦落ちに固定せず、緩い横揺れを加える。
        p.chapter4CurtainDrift = true;
        p.canvasTone = ((i + rowIndex * 2) % 4) + 1;
        p.chapter4CurtainBaseX = x;
        p.chapter4CurtainAge = 0;
        const bulletSalt = rowIndex * 16 + i;
        p.chapter4CurtainAmp = 10 + fixedStagePatternRandom('ch04_curtain_amp', volleyIndex, bulletSalt) * 7;
        p.chapter4CurtainFreq = 1.75 + fixedStagePatternRandom('ch04_curtain_freq', volleyIndex, bulletSalt) * 0.8;
        p.chapter4CurtainPhase = fixedStagePatternRandom('ch04_curtain_phase', volleyIndex, bulletSalt) * Math.PI * 2 + rowIndex * 0.8 + i * 0.17;
        state.enemyBullets.push(p);
      });
    };
    spawn(top, -8, 0);
    spawn(bottom, -8 - rowGapY, 1);
  }


  function fireNormalEnemy(enemy, now) {
    if (!enemy || !enemy.el || now < (state.normalEnemyStunUntil || 0)) return;
    const def = enemy.def || {};

    // v212 generic elemental angels
    if (def.behavior === 'generic_element_shot_v1') {
      const fireRate = Number(def.fireRate || 1280);
      if (now - enemy.lastShotAt < fireRate) return;
      enemy.lastShotAt = now;

      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      const angle = Math.atan2(dy, dx);
      const element = normalizeCombatElement(def.element);
      shootNormalEnemyProjectile(
        enemy,
        angle,
        Number(def.bulletSpeed || 215),
        Number(def.bulletDamage || 90),
        `shooting-enemy-bullet shooting-mini-enemy-bullet shooting-generic-zako-shot shooting-enemy-element-${element || 'neutral'}`
      );
      return;
    }

    if (def.behavior === 'generic_element_laser_v1') {
      const fireRate = Number(def.fireRate || 2050);
      if (now - enemy.lastShotAt < fireRate) return;
      enemy.lastShotAt = now;

      const element = normalizeCombatElement(def.element);
      const p = makeProjectile(
        `shooting-enemy-bullet shooting-mini-enemy-bullet shooting-generic-zako-laser shooting-enemy-element-${element || 'neutral'}`,
        enemy.x,
        enemy.y + 42,
        0,
        Number(def.laserSpeed || 540),
        Number(def.laserDamage || 145)
      );
      if (p) {
        p.genericZakoLaser = true;
        p.attackElement = element;
        p._hw = 5;
        p._hh = 46;
        state.enemyBullets.push(p);
      }
      return;
    }

    // v218 FIRE CHARGE: warning -> lock direction -> straight dash.
    if (def.behavior === 'generic_element_charge_v1') {
      if (enemy.attackState === 'telegraph') {
        if (now < enemy.attackExecuteAt) return;

        enemy.el.classList.remove('generic-charge-warning');
        const dx = state.player.x - enemy.x;
        const dy = state.player.y - enemy.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const speed = Math.max(120, Number(def.chargeSpeed || 500));

        enemy.dashVx = (dx / len) * speed;
        enemy.dashVy = (dy / len) * speed;
        enemy.dashUntil = now + Math.max(280, Number(def.chargeDurationMs || 620));
        enemy.attackState = 'dash';
        enemy.el.classList.add('generic-charge-dash');
        return;
      }

      if (enemy.attackState === 'dash') return;
      if (now < (enemy.nextActionAt || 0)) return;

      enemy.attackState = 'telegraph';
      enemy.attackExecuteAt = now + Math.max(350, Number(def.telegraphMs || 760));
      enemy.el.classList.add('generic-charge-warning');
      return;
    }

    // CHAPTER 02: 暴威の残穢
    // 「重撃 → 圧力弾 → 突進」を繰り返し、弾幕ではなく個の圧力を作る。
    if (def.behavior === 'mini_violence_v1') {
      if (enemy.attackState === 'telegraph') {
        if (now < enemy.attackExecuteAt) return;

        enemy.el.classList.remove('violence-warning');
        const dx = state.player.x - enemy.x;
        const dy = state.player.y - enemy.y;
        const baseAngle = Math.atan2(dy, dx);
        const action = enemy.actionIndex % 3;

        if (action === 0) {
          // 重撃：大きく、速く、痛い単発。
          shootNormalEnemyProjectile(
            enemy,
            baseAngle,
            Number(def.bulletSpeed || 250),
            Number(def.heavyShotDamage || 210),
            'shooting-enemy-bullet shooting-mini-enemy-bullet shooting-violence-heavy'
          );
        } else if (action === 1) {
          // 圧力弾：3方向で逃げ道を削る。
          [-0.34, 0, 0.34].forEach(offset => {
            shootNormalEnemyProjectile(
              enemy,
              baseAngle + offset,
              Number(def.bulletSpeed || 250) * .88,
              Number(def.pressureShotDamage || 150),
              'shooting-enemy-bullet shooting-mini-enemy-bullet shooting-violence-pressure'
            );
          });
        } else {
          // 突進：予兆後、プレイヤーの現在位置へ一気に踏み込む。
          const stageChargeSpeed = Number(selectedStage?.normalBattle?.chargeSpeed || 0);
          const speed = stageChargeSpeed > 0 ? stageChargeSpeed : Number(def.chargeSpeed || 520);
          enemy.dashVx = Math.cos(baseAngle) * speed;
          enemy.dashVy = Math.sin(baseAngle) * speed;
          enemy.dashUntil = now + 520;
          enemy.attackState = 'dash';
          enemy.el.classList.add('violence-dash');
          return;
        }

        enemy.actionIndex = (enemy.actionIndex + 1) % 3;
        enemy.attackState = 'idle';
        enemy.nextActionAt = now + Number(def.fireRate || 1900);
        return;
      }

      if (enemy.attackState === 'dash') return;
      if (now < (enemy.nextActionAt || 0)) return;

      enemy.attackState = 'telegraph';
      enemy.attackExecuteAt = now + Number(def.telegraphMs || 520);
      enemy.el.classList.add('violence-warning');
      return;
    }

    if (def.behavior === 'mini_mirage_v1') {
      const cfg = getNormalBattleConfig();
      const fireRate = Number(cfg.enemyFireRate || def.fireRate || 1080);
      const speed = Number(cfg.enemyBulletSpeed || def.bulletSpeed || 230);
      const damage = Number(cfg.enemyBulletDamage || def.bulletDamage || 120);
      const warningEveryMs = Math.max(0, Number(cfg.mirageWarningEveryMs || 0));
      const telegraphMs = Math.max(350, Number(cfg.mirageWarningTelegraphMs || 700));

      // CH05-2: 3体それぞれが位相をずらしてWARNINGを撃つため、危険弾が多めに来る。
      if (warningEveryMs > 0) {
        if (!enemy.mirageNextWarningAt) {
          enemy.mirageNextWarningAt = now + 1700 + (enemy.actionIndex % 3) * 1150;
        }
        if (enemy.mirageWarningExecuteAt && now >= enemy.mirageWarningExecuteAt) {
          enemy.mirageWarningExecuteAt = 0;
          const dx = state.player.x - enemy.x;
          const dy = state.player.y - enemy.y;
          const angle = Math.atan2(dy, dx);
          const p = shootNormalEnemyProjectile(
            enemy,
            angle,
            speed * 0.82,
            999999,
            'shooting-enemy-bullet shooting-danger-bullet shooting-mirage-warning-bullet'
          );
          if (p) p.mirageWarning = true;
          enemy.mirageNextWarningAt = now + warningEveryMs;
          removeBossDangerWarning();
          return;
        }
        if (!enemy.mirageWarningExecuteAt && now >= enemy.mirageNextWarningAt) {
          enemy.mirageWarningExecuteAt = now + telegraphMs;
          showBossDangerWarning();
          return;
        }
      }

      if (now - enemy.lastShotAt < fireRate) return;
      enemy.lastShotAt = now;
      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      const baseAngle = Math.atan2(dy, dx);
      const spread = (enemy.actionIndex++ % 2) === 0
        ? [-0.28, 0, 0.28]
        : [-0.42, -0.21, 0, 0.21, 0.42];
      spread.forEach(offset => {
        shootNormalEnemyProjectile(
          enemy,
          baseAngle + offset,
          speed,
          damage,
          'shooting-enemy-bullet shooting-mini-enemy-bullet shooting-mirage-bullet'
        );
      });
      return;
    }

    if (def.behavior === 'mini_barrage_v1') {
      const cfg = getNormalBattleConfig();
      const level = Math.max(1, Math.min(3, Number(cfg.barrageLevel || 2)));
      const fireRate = Number(cfg.enemyFireRate || def.fireRate || 1220);

      if (now - enemy.lastShotAt < fireRate) return;
      enemy.lastShotAt = now;

      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      const baseAngle = Math.atan2(dy, dx);
      const speed = Number(cfg.enemyBulletSpeed || def.bulletSpeed || 220);
      const damage = Number(cfg.enemyBulletDamage || def.bulletDamage || 105);
      const volleyIndex = Number(enemy.patternVolleyIndex || 0);
      enemy.patternVolleyIndex = volleyIndex + 1;

      if (level === 1) {
        // CH03-01 弱:
        // 3WAY → 5WAY。正面中心で、弾間隔も広い。
        const pattern = enemy.actionIndex % 2;

        if (pattern === 0) {
          [-0.28, 0, 0.28].forEach(offset => {
            shootNormalEnemyProjectile(
              enemy,
              baseAngle + offset,
              speed,
              damage,
              'shooting-enemy-bullet shooting-mini-enemy-bullet'
            );
          });
        } else {
          [-0.42, -0.21, 0, 0.21, 0.42].forEach(offset => {
            shootNormalEnemyProjectile(
              enemy,
              baseAngle + offset,
              speed * 0.94,
              damage,
              'shooting-enemy-bullet shooting-mini-enemy-bullet'
            );
          });
        }

        enemy.actionIndex = (enemy.actionIndex + 1) % 2;
        return;
      }

      if (level === 2) {
        // CH03-02 中:
        // 5WAY → 揺れる7WAY → 8発リング。
        const pattern = enemy.actionIndex % 3;

        if (pattern === 0) {
          [-0.42, -0.21, 0, 0.21, 0.42].forEach(offset => {
            shootNormalEnemyProjectile(
              enemy,
              baseAngle + offset,
              speed,
              damage,
              'shooting-enemy-bullet shooting-mini-enemy-bullet'
            );
          });
        } else if (pattern === 1) {
          const phaseOffset = Math.sin((enemy.phaseSeed || 0) + volleyIndex * fireRate * 0.0028) * 0.12;
          [-0.54, -0.36, -0.18, 0, 0.18, 0.36, 0.54].forEach(offset => {
            shootNormalEnemyProjectile(
              enemy,
              baseAngle + offset + phaseOffset,
              speed * 0.96,
              damage,
              'shooting-enemy-bullet shooting-mini-enemy-bullet'
            );
          });
        } else {
          const startAngle = (enemy.phaseSeed || 0) + volleyIndex * fireRate * 0.0018;
          for (let i = 0; i < 8; i++) {
            const angle = startAngle + (Math.PI * 2 * i / 8);
            shootNormalEnemyProjectile(
              enemy,
              angle,
              speed * 0.80,
              Math.max(1, damage - 10),
              'shooting-enemy-bullet shooting-mini-enemy-bullet'
            );
          }
        }

        enemy.actionIndex = (enemy.actionIndex + 1) % 3;
        return;
      }

      // CH03-03 強:
      // 7WAY → 回転9WAY → 12発リング。
      // BOSS前の最終練習として、通路を読む必要がある密度にする。
      const pattern = enemy.actionIndex % 3;

      if (pattern === 0) {
        [-0.57, -0.38, -0.19, 0, 0.19, 0.38, 0.57].forEach(offset => {
          shootNormalEnemyProjectile(
            enemy,
            baseAngle + offset,
            speed,
            damage,
            'shooting-enemy-bullet shooting-mini-enemy-bullet'
          );
        });
      } else if (pattern === 1) {
        const phaseOffset = Math.sin((enemy.phaseSeed || 0) + volleyIndex * fireRate * 0.0035) * 0.20;
        [-0.72, -0.54, -0.36, -0.18, 0, 0.18, 0.36, 0.54, 0.72].forEach(offset => {
          shootNormalEnemyProjectile(
            enemy,
            baseAngle + offset + phaseOffset,
            speed * 1.02,
            damage,
            'shooting-enemy-bullet shooting-mini-enemy-bullet'
          );
        });
      } else {
        const startAngle = (enemy.phaseSeed || 0) + volleyIndex * fireRate * 0.0027;
        for (let i = 0; i < 12; i++) {
          const angle = startAngle + (Math.PI * 2 * i / 12);
          shootNormalEnemyProjectile(
            enemy,
            angle,
            speed * 0.86,
            Math.max(1, damage - 12),
            'shooting-enemy-bullet shooting-mini-enemy-bullet'
          );
        }
      }

      enemy.actionIndex = (enemy.actionIndex + 1) % 3;
      return;
    }

    // CHAPTER 04: 美しい弾幕
    // CH03のように弾数そのものを増やすのではなく、軌道の規則性を見せる。
    if (def.behavior === 'mini_beautiful_v1') {
      const cfg = getNormalBattleConfig();
      const curtainCfg = getChapter4CurtainConfig();
      const level = Math.max(1, Math.min(3, Number(cfg.beautifulLevel || 1)));
      const fireRate = Number((curtainCfg && curtainCfg.intervalMs) || cfg.enemyFireRate || def.fireRate || 1180);
      if (now - enemy.lastShotAt < fireRate) return;
      enemy.lastShotAt = now;

      const speed = Number(cfg.enemyBulletSpeed || def.bulletSpeed || 205);
      const damage = Number(cfg.enemyBulletDamage || def.bulletDamage || 95);
      const beautifulVolleyIndex = Number(enemy.patternVolleyIndex || 0);
      enemy.patternVolleyIndex = beautifulVolleyIndex + 1;
      if (curtainCfg) {
        fireChapter4CurtainVolley(now, damage, 'shooting-enemy-bullet shooting-mini-enemy-bullet');
        enemy.actionIndex = (enemy.actionIndex + 1) % 2;
        return;
      }
      const pattern = enemy.actionIndex % (level >= 3 ? 2 : 1);

      const spawnSpiral = (arms, reverse = false) => {
        const originX = enemy.x;
        const originY = enemy.y + 22;
        const spin = (reverse ? -1 : 1) * (level === 1 ? 0.36 : 0.44);
        const radialSpeed = speed * (level === 1 ? 0.58 : 0.64);
        const start = (enemy.phaseSeed || 0) + beautifulVolleyIndex * fireRate * 0.00055;
        for (let i = 0; i < arms; i++) {
          const a = start + Math.PI * 2 * i / arms;
          const p = makeProjectile(
            'shooting-enemy-bullet shooting-mini-enemy-bullet shooting-beautiful-bullet shooting-beautiful-spiral',
            originX, originY,
            Math.cos(a) * radialSpeed,
            Math.sin(a) * radialSpeed,
            damage
          );
          if (!p) continue;
          p.beautifulSpiral = true;
          p.el.classList.add(`shooting-beautiful-tone-${(i % 4) + 1}`);
          p.canvasTone = (i % 4) + 1;
          p.beautifulAge = 0;
          p.beautifulOriginX = originX;
          p.beautifulOriginY = originY;
          p.beautifulStartAngle = a;
          p.beautifulAngularSpeed = spin;
          p.beautifulRadialSpeed = radialSpeed;
          state.enemyBullets.push(p);
        }
      };

      const spawnWave = (count, mirror = false) => {
        const center = enemy.x;
        const gap = level === 2 ? 18 : 16;
        const phaseSeed = (enemy.phaseSeed || 0) + beautifulVolleyIndex * fireRate * 0.002;
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * gap;
          const x = center + offset;
          const p = makeProjectile(
            'shooting-enemy-bullet shooting-mini-enemy-bullet shooting-beautiful-bullet shooting-beautiful-wave',
            x, enemy.y + 24,
            0, speed,
            damage
          );
          if (!p) continue;
          p.beautifulWave = true;
          p.el.classList.add(`shooting-beautiful-tone-${(i % 4) + 1}`);
          p.canvasTone = (i % 4) + 1;
          p.beautifulAge = 0;
          p.beautifulWaveBaseX = x;
          p.beautifulWaveAmp = level === 2 ? 18 : 23;
          p.beautifulWaveFreq = level === 2 ? 3.15 : 3.55;
          p.beautifulWavePhase = phaseSeed + i * 0.72 + (mirror ? Math.PI : 0);
          state.enemyBullets.push(p);
        }
      };

      if (level === 1) {
        // 6本の螺旋。毎射ごとに回転方向を反転し、花が開閉するように見せる。
        spawnSpiral(6, (enemy.actionIndex % 2) === 1);
      } else if (level === 2) {
        // 等間隔の弾列が左右へ同期して揺れる「波」。
        spawnWave(7, (enemy.actionIndex % 2) === 1);
      } else if (pattern === 0) {
        // 螺旋を少し細かく。密度より軌跡を読ませる。
        spawnSpiral(8, (enemy.actionIndex % 4) >= 2);
      } else {
        // 9列の波。隣同士の位相をずらし、編み目のような規則性を作る。
        spawnWave(9, (enemy.actionIndex % 4) >= 2);
      }

      enemy.actionIndex = (enemy.actionIndex + 1) % 4;
      return;
    }

    // CHAPTER 01など既存敵。
    if (now - enemy.lastShotAt < getStageAdjustedEnemyFireInterval(Number(def.fireRate || 1550))) return;
    enemy.lastShotAt = now;
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const angle = Math.atan2(dy, dx);
    const speed = Number(def.bulletSpeed || 185);
    shootNormalEnemyProjectile(
      enemy,
      angle,
      speed,
      Number(def.bulletDamage || 85),
      'shooting-enemy-bullet shooting-mini-enemy-bullet'
    );
  }

  function updateNormalEnemies(dt, now) {
    if (!isNormalBattle() && !hasBossAdds()) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const w = arena.clientWidth;
    const h = arena.clientHeight;

    state.normalEnemies.forEach(enemy => {
      if (!enemy || !enemy.el) return;
      const def = enemy.def || {};

      // エリ/ネム等の全体停止：移動停止と敵弾生成停止を必ずセットにする。
      const globalStunUntil = Number(state.normalEnemyStunUntil || 0);
      if (now < globalStunUntil) {
        freezeNormalEnemyAction(enemy, globalStunUntil);
        positionUnit(enemy.el, enemy.x, enemy.y);
        positionMiniEnemyHp(enemy);
        return;
      }

      // ノアULT後：落雷を受けた敵だけスタン。
      if (now < Number(enemy.noahStunUntil || 0)) {
        freezeNormalEnemyAction(enemy, Number(enemy.noahStunUntil || now));
        positionUnit(enemy.el, enemy.x, enemy.y);
        positionMiniEnemyHp(enemy);
        return;
      }

      // マグダレーナULTで捕捉された敵は、拘束時間中は自発的な移動・攻撃を完全停止。
      // lastShotAt / nextActionAt を拘束終了後へ送ることで、解除直後に
      // 停止中の射撃予約がまとめて吐き出されることも防ぐ。
      if (now < Number(enemy.gojoPurpleFreezeUntil || 0)) {
        const resumeAt = Number(enemy.gojoPurpleFreezeUntil || now);
        freezeNormalEnemyAction(enemy, resumeAt);
        positionUnit(enemy.el, enemy.x, enemy.y);
        positionMiniEnemyHp(enemy);
        return;
      }

      // エルテナULT吸引中は通常の移動AIを止める。
      // 旧実装ではこの後の通常AIが毎フレーム baseX/baseY から位置を再計算し、
      // ブラックホール側の吸引移動を実質リセットしていたため、
      // 「移動ロックは掛かるが吸い込まれない敵」が発生していた。
      const activePullField = isEnemyPullFieldActive(now);

      if (activePullField) {
        // 攻撃も止め、吸引中は位置更新をブラックホール処理だけに一元化する。
        const pullResumeAt = Number(state.eltenaBlackHole?.activeUntil || now);
        freezeNormalEnemyAction(enemy, pullResumeAt);
        if (enemy.attackState === 'dash') {
          enemy.attackState = 'idle';
          enemy.el.classList.remove('violence-dash', 'generic-charge-dash');
        }
        enemy.el.classList.remove('generic-charge-warning');
        return;
      }

      // アヤネULTで掴まれている敵だけを個別拘束する。
      // global stunではなく、命中した敵だけ7秒間停止。
      if (now < Number(enemy.ayaneGrabUntil || 0)) {
        freezeNormalEnemyAction(enemy, Number(enemy.ayaneGrabUntil || now));
        positionUnit(enemy.el, enemy.x, enemy.y);
        positionMiniEnemyHp(enemy);
        return;
      }

      if (def.behavior === 'generic_element_charge_v1' && enemy.attackState === 'dash') {
        enemy.x += enemy.dashVx * dt;
        enemy.y += enemy.dashVy * dt;

        // Do not clamp during the dash itself: let the unit visibly commit to the line.
        // End the charge either by timer or once it reaches the arena margins.
        const outOfBounds =
          enemy.x < 28 || enemy.x > w - 28 ||
          enemy.y < 42 || enemy.y > h - 42;

        enemy.x = clamp(enemy.x, 28, w - 28);
        enemy.y = clamp(enemy.y, 42, h - 42);
        positionUnit(enemy.el, enemy.x, enemy.y);
        positionMiniEnemyHp(enemy);

        if (now >= enemy.dashUntil || outOfBounds) {
          enemy.attackState = 'idle';
          enemy.dashVx = 0;
          enemy.dashVy = 0;
          enemy.nextActionAt = now + Math.max(700, Number(def.fireRate || 1650));
          enemy.baseX = enemy.x;
          enemy.baseY = clamp(enemy.y, 78, Math.max(90, h * .40));
          enemy.el.classList.remove('generic-charge-dash');
        }
        return;
      }

      if (def.behavior === 'mini_violence_v1' && enemy.attackState === 'dash') {
        enemy.x += enemy.dashVx * dt;
        enemy.y += enemy.dashVy * dt;
        enemy.x = clamp(enemy.x, 34, w - 34);
        enemy.y = clamp(enemy.y, 46, h - 48);
        positionUnit(enemy.el, enemy.x, enemy.y);
        positionMiniEnemyHp(enemy);

        if (now >= enemy.dashUntil) {
          enemy.attackState = 'idle';
          enemy.actionIndex = (enemy.actionIndex + 1) % 3;
          enemy.nextActionAt = now + 1150;
          enemy.baseX = enemy.x;
          enemy.baseY = clamp(enemy.y, 78, Math.max(90, h * .40));
          enemy.el.classList.remove('violence-dash');
        }
        return;
      }

      const age = (now - enemy.spawnedAt) / 1000;

      if (def.behavior === 'generic_element_laser_v1') {
        enemy.x = clamp(
          enemy.baseX + Math.sin(age * .42 + enemy.phaseSeed) * Math.min(34, w * .08),
          36,
          w - 36
        );
        enemy.y = Math.max(78, Math.min(h * .29, enemy.baseY)) +
          Math.sin(age * .34 + enemy.phaseSeed) * 6;
      } else if (def.behavior === 'generic_element_shot_v1') {
        enemy.x = clamp(
          enemy.baseX + Math.sin(age * .92 + enemy.phaseSeed) * Math.min(54, w * .13),
          36,
          w - 36
        );
        enemy.y = Math.max(80, Math.min(h * .32, enemy.baseY)) +
          Math.sin(age * .66 + enemy.phaseSeed * 1.3) * 10;
      } else if (def.behavior === 'generic_element_charge_v1') {
        // CHARGE type stays comparatively still so the warning and dash direction are readable.
        enemy.x = clamp(
          enemy.baseX + Math.sin(age * .48 + enemy.phaseSeed) * Math.min(26, w * .06),
          36,
          w - 36
        );
        enemy.y = Math.max(82, Math.min(h * .30, enemy.baseY)) +
          Math.sin(age * .38 + enemy.phaseSeed * 1.15) * 6;
      } else if (def.behavior === 'mini_violence_v1') {
        // 強敵は細かく漂わず、重くゆっくりと位置を変える。
        const targetBaseY = Math.max(84, Math.min(h * .34, enemy.baseY));
        enemy.x = clamp(enemy.baseX + Math.sin(age * .62 + enemy.phaseSeed) * Math.min(38, w * .09), 36, w - 36);
        enemy.y = targetBaseY + Math.sin(age * .48 + enemy.phaseSeed) * 10;
      } else if (def.behavior === 'mini_barrage_v1') {
        // 弾幕担当の雑魚。上空で横移動しながら、交差する角度を作る。
        enemy.x = clamp(enemy.baseX + Math.sin(age * 1.08 + enemy.phaseSeed) * Math.min(72, w * .18), 36, w - 36);
        enemy.y = Math.max(76, Math.min(h * .34, enemy.baseY)) + Math.sin(age * .76 + enemy.phaseSeed * 1.7) * 14;
      } else if (def.behavior === 'mini_beautiful_v1') {
        // CH04は発射源まで忙しくしない。ゆったり左右へ漂い、幾何学模様を崩さない。
        enemy.x = clamp(enemy.baseX + Math.sin(age * .58 + enemy.phaseSeed) * Math.min(54, w * .13), 36, w - 36);
        enemy.y = Math.max(78, Math.min(h * .30, enemy.baseY)) + Math.sin(age * .44 + enemy.phaseSeed * 1.35) * 8;
      } else {
        enemy.x = clamp(enemy.baseX + Math.sin(age * 1.25 + enemy.phaseSeed) * Math.min(58, w * .14), 36, w - 36);
        enemy.y = enemy.baseY + Math.sin(age * .9 + enemy.phaseSeed) * 8;
      }

      positionUnit(enemy.el, enemy.x, enemy.y);
      positionMiniEnemyHp(enemy);
      fireNormalEnemy(enemy, now);
    });
  }

  function shouldDropMissionItem(defeatedNo) {
    if (!selectedStage) return false;
    const mission = getEffectiveNormalMission();
    if (mission.type !== SHOOTING_MISSION_TYPE.COLLECT_ITEM) return false;

    const target = Number(mission.target || 3);
    if (state.collectedItems + state.collectibles.length >= target) return false;

    const cfg = getNormalBattleConfig();
    const configuredDropRate = Number(cfg.itemDropRate);

    // CH03: 確率設定は維持するが、抽選列はステージごとに固定。
    // 同じ撃破番号なら再挑戦時も必ず同じ結果になる。
    if (Number.isFinite(configuredDropRate)) {
      return fixedStagePatternRandom('mission_item_drop', defeatedNo, 0) < clamp(configuredDropRate, 0, 1);
    }

    // 既存CHAPTERの収集ステージは従来の保証ドロップ方式を維持。
    const total = Number(cfg.totalEnemies || 7);
    const milestones = Array.from({length: target}, (_, i) =>
      Math.max(1, Math.round(total * (i + 1) / (target + 1)))
    );
    return milestones.includes(defeatedNo) ||
      defeatedNo >= total - (target - state.collectedItems - state.collectibles.length);
  }

  function spawnMissionItem(x, y) {
    const layer = document.getElementById('shooting-collectible-layer');
    if (!layer) return;
    const el = document.createElement('div');
    el.className = 'shooting-mission-item';
    el.innerHTML = '<i></i>';
    layer.appendChild(el);
    const item = { uid:`item_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, el, x, y:Math.max(y + 18, 150) };
    state.collectibles.push(item);
    positionUnit(el, item.x, item.y);
  }

  function updateCollectibles(dt) {
    if (!isNormalBattle() || !state.collectibles.length) return;
    const playerCore = document.getElementById('shooting-player-core');
    const arena = document.getElementById('shooting-arena');
    if (!playerCore || !arena) return;

    const coreRect = playerCore.getBoundingClientRect();
    const arenaHeight = Number(arena.clientHeight || 0);

    state.collectibles = state.collectibles.filter(item => {
      if (!item || !item.el) return false;

      item.y += 16 * dt;
      positionUnit(item.el, item.x, item.y);

      if (rectsHit(item.el.getBoundingClientRect(), coreRect, -5, -3)) {
        item.el.remove();
        state.collectedItems++;
        state.score += 500;
        evaluateNormalMission(performance.now());
        return false;
      }

      // 取り逃したアイテムは画面外へ出た時点で破棄する。
      // state.collectiblesにも残さないことで、次の敵から再ドロップ可能にする。
      if (arenaHeight > 0 && item.y > arenaHeight + 40) {
        item.el.remove();
        return false;
      }

      return true;
    });
  }

  function damageNormalEnemy(enemy, amount, now, big, elementReaction = '', suppressVisual = false) {
    if (!enemy || enemy.hp <= 0) return 0;
    const appliedDamage = Math.min(enemy.hp, Math.max(0, Number(amount || 0)));
    enemy.hp = Math.max(0, enemy.hp - appliedDamage);

    // HPが変わらないIMMUNE弾でHP DOMを書き直さない。
    if (appliedDamage > 0) renderMiniEnemyHp(enemy, true);

    // build551: IMMUNE相手へSpread/Laser等を当て続けても、ゲーム判定は全件維持しつつ
    // HIT/0/IMMUNE/バリア発光のDOM演出だけ約9fpsへ間引く。
    const visualNow = Number(now || performance.now());
    const immuneVisual = elementReaction === 'immune';
    const renderImpact = !suppressVisual && (!immuneVisual || visualNow >= Number(enemy._immuneVisualNextAt || 0));
    if (renderImpact) {
      if (immuneVisual) enemy._immuneVisualNextAt = visualNow + 110;

      createHit(enemy.x, enemy.y, !!big);
      showDamageNumber(enemy.x, enemy.y, appliedDamage, 'enemy', !!big, elementReaction);

      if (immuneVisual && enemy.weaknessBarrierEl) {
        const shield = enemy.weaknessBarrierEl;
        shield.classList.add('hit');
        if (enemy._weaknessBarrierFxTimer) clearTimeout(enemy._weaknessBarrierFxTimer);
        enemy._weaknessBarrierFxTimer = setTimeout(() => {
          if (shield && shield.isConnected) shield.classList.remove('hit');
          enemy._weaknessBarrierFxTimer = null;
        }, 140);
      }

      if (enemy.el) sustainHitFeedback(enemy.el, big ? 210 : 145);
    }
    if (enemy.hp > 0) return appliedDamage;

    // アヤネ拘束中に撃破された場合、残っている拘束演出を即掃除。
    enemy.ayaneGrabUntil = 0;
    if (enemy.ayaneGrabMarker) {
      enemy.ayaneGrabMarker.remove();
      enemy.ayaneGrabMarker = null;
    }
    if (enemy.el) enemy.el.classList.remove('ayane-grabbed', 'ayane-multi-grabbed');

    state.normalDefeated++;
    state.score += Number(enemy.def?.scoreValue || 650);
    if (shouldDropMissionItem(state.normalDefeated)) spawnMissionItem(enemy.x, enemy.y);
    if (enemy.el) {
      const old = enemy.el;
      const isViolenceEnemy = enemy.def && enemy.def.behavior === 'mini_violence_v1';

      // CHAPTER 02の強敵は、倒したことが分かるように撃破演出を強化。
      old.classList.remove(
        'hit-flash',
        'violence-warning',
        'violence-dash',
        'generic-charge-warning',
        'generic-charge-dash'
      );
      old.classList.add('defeated');
      if (isViolenceEnemy) old.classList.add('violence-defeated');

      setTimeout(() => old.remove(), isViolenceEnemy ? 620 : 260);
    }
    if (enemy.hpEl) {
      const oldHp = enemy.hpEl;
      oldHp.classList.add('defeated');
      setTimeout(() => oldHp.remove(), 220);
    }
    if (enemy.elementEl) {
      const oldElement = enemy.elementEl;
      oldElement.classList.add('defeated');
      setTimeout(() => oldElement.remove(), 220);
    }
    if (enemy.weaknessBarrierEl) {
      const oldBarrier = enemy.weaknessBarrierEl;
      oldBarrier.classList.add('defeated');
      setTimeout(() => oldBarrier.remove(), 240);
    }
    removeIgnisBurnVisual(String(enemy.uid || 'enemy'));
    enemy.el = null;
    enemy.hpEl = null;
    enemy.elementEl = null;
    enemy.weaknessBarrierEl = null;
    evaluateNormalMission(now);
    return appliedDamage;
  }

  function evaluateNormalMission(now) {
    if (!isNormalBattle() || state.ended || state.finishing) return;
    const mission = getEffectiveNormalMission();
    const cfg = getNormalBattleConfig();
    const total = Number(cfg.totalEnemies || 0);
    const allDefeated = total > 0 && state.normalDefeated >= total && state.normalSpawned >= total;

    if (mission.type === SHOOTING_MISSION_TYPE.CLEAR_TIME) {
      if ((now - state.startedAt) / 1000 > Number(mission.targetSeconds || 60)) {
        state.missionFailed = true;
        endGame(false);
        return;
      }
      state.missionComplete = allDefeated;
    } else if (mission.type === SHOOTING_MISSION_TYPE.SURVIVE_TIME) {
      state.missionComplete = false;
      return;
    } else if (mission.type === SHOOTING_MISSION_TYPE.MAX_HITS_TAKEN) {
      if (state.totalHitsTaken > Number(mission.maxHits || 3)) {
        state.missionFailed = true;
        endGame(false);
        return;
      }
      state.missionComplete = allDefeated;
    } else if (mission.type === SHOOTING_MISSION_TYPE.COLLECT_ITEM) {
      // 敵全滅ではクリアしない。指定数を実際に取得した時だけ成立。
      state.missionComplete = isCollectMissionSatisfied(mission);
      if (!state.missionComplete) return;
    } else {
      state.missionComplete = allDefeated;
    }
    if (state.missionComplete) beginNormalStageClear();
  }

  function showStageClearSequence(onComplete) {
    const root = document.getElementById(ROOT_ID);
    if (!root) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    root.querySelectorAll('.shooting-clear-condition-achieved').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'shooting-clear-condition-achieved';
    overlay.setAttribute('aria-live', 'assertive');
    overlay.innerHTML = `
      <div class="shooting-clear-condition-achieved-line"></div>
      <div class="shooting-clear-condition-achieved-copy">
        <strong></strong>
      </div>
      <div class="shooting-clear-condition-achieved-line"></div>
    `;

    root.appendChild(overlay);

    const copy = overlay.querySelector('strong');
    const steps = [
      { text: 'クリア条件達成', phase: 'condition-phase', hold: 1320 },
      { text: 'STAGE CLEAR', phase: 'stage-clear-phase', hold: 1480 }
    ];
    let index = 0;

    const finish = () => {
      overlay.classList.add('sequence-out');
      setTimeout(() => {
        overlay.remove();
        if (typeof onComplete === 'function') onComplete();
      }, 620);
    };

    const showStep = () => {
      if (!overlay.isConnected || !copy) return finish();
      const step = steps[index];

      overlay.classList.remove('condition-phase', 'stage-clear-phase', 'step-out');
      overlay.classList.add(step.phase, 'show');
      copy.textContent = step.text;
      copy.classList.remove('ceremony-pop');
      void copy.offsetWidth;
      copy.classList.add('ceremony-pop');

      setTimeout(() => {
        if (!overlay.isConnected) return;
        overlay.classList.add('step-out');

        setTimeout(() => {
          index += 1;
          if (index < steps.length) showStep();
          else finish();
        }, 360);
      }, step.hold);
    };

    requestAnimationFrame(showStep);
  }

  function beginNormalStageClear() {
    if (!state || state.ended || state.finishing) return;

    // 最終防波堤: 収集ミッションは取得数不足ならCLEAR演出へ入れない。
    const mission = getEffectiveNormalMission();
    if (mission.type === SHOOTING_MISSION_TYPE.COLLECT_ITEM && !isCollectMissionSatisfied(mission)) {
      state.missionComplete = false;
      console.warn('[shooting] blocked premature collect-mission clear', {
        stageId: getSelectedBaseStageId(),
        collected: Number(state.collectedItems || 0),
        target: Number(mission.target || 3),
      });
      return;
    }

    state.finishing = true;
    state.running = false;
    cancelAnimationFrame(rafId);
    clearEnemyBulletsOnly();
    renderHud();
    document.getElementById(ROOT_ID)?.classList.add('normal-stage-clear');

    // 全通常ステージ共通：クリア条件達成 → STAGE CLEAR → RESULT。
    showStageClearSequence(() => {
      if (!state || state.ended) return;
      const root = document.getElementById(ROOT_ID);
      if (root) root.classList.remove('normal-stage-clear');
      state.finishing = false;
      endGame(true);
    });
  }

  function clearNormalBattleObjects() {
    if (!state) return;
    (state.normalEnemies || []).forEach(enemy => enemy?.el?.remove());
    (state.collectibles || []).forEach(item => item?.el?.remove());
    (state.mimosaItems || []).forEach(item => item?.el?.remove());
    state.normalEnemies = [];
    clearChapter6Barriers();
    state.collectibles = [];
    state.mimosaItems = [];
    const layer = document.getElementById('shooting-normal-enemy-layer');
    if (layer) layer.innerHTML = '';
    const items = document.getElementById('shooting-collectible-layer');
    if (items) items.innerHTML = '';
  }

  function fireViolenceBoss(now) {
    const phase = state.boss.phase || 1;
    const interval = phase === 1 ? 1050 : phase === 2 ? 820 : 650;
    if (now - state.lastBossShotAt < getStageAdjustedEnemyFireInterval(interval)) return;
    state.lastBossShotAt = now;

    const dx = state.player.x - state.boss.x;
    const dy = state.player.y - state.boss.y;
    const baseAngle = Math.atan2(dy, dx);
    const speed = Number(BOSS.bulletSpeed || 285);

    // 暴力は弾数ではなく、一発の圧で押す。
    if (phase === 1) {
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet shooting-violence-boss-heavy',
        state.boss.x, state.boss.y + 42,
        Math.cos(baseAngle) * speed,
        Math.sin(baseAngle) * speed,
        Number(BOSS.bulletDamage || 230)
      ));
      return;
    }

    if (phase === 2) {
      [-0.22, 0.22].forEach(offset => {
        const a = baseAngle + offset;
        state.enemyBullets.push(makeProjectile(
          'shooting-enemy-bullet shooting-violence-boss-heavy',
          state.boss.x, state.boss.y + 40,
          Math.cos(a) * speed * 1.04,
          Math.sin(a) * speed * 1.04,
          Number(BOSS.bulletDamage || 230)
        ));
      });
      return;
    }

    // 最終段階だけ3方向。弾幕化はさせず、逃げ道を削る。
    [-0.30, 0, 0.30].forEach(offset => {
      const a = baseAngle + offset;
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet shooting-violence-boss-heavy',
        state.boss.x, state.boss.y + 38,
        Math.cos(a) * speed * 1.35,
        Math.sin(a) * speed * 1.35,
        Number(BOSS.bulletDamage || 230)
      ));
    });
  }

  // ============================================================
  // 超弾幕（STRESS TEST）専用の発射ロジック。
  // barrage_v1(REMNANT_03/レイド共用)には手を入れず、完全に独立させる。
  // 狙いはパターンの見栄えではなく「弾の絶対数」で負荷を測ること。
  // なので構造はあえて単純な同心円+扇形の組み合わせだけにしている。
  // WAVE(=state.boss.phase)が進むほど、間隔を詰めて弾数を増やす。
  // ENEMY_BULLET_HARD_LIMIT(既存の安全装置)が最終的な歯止めになる。
  // ============================================================
  function fireBulletHellTest(now) {
    const phase = state.boss.phase || 1;
    const speed = Number(BOSS.bulletSpeed || 230);
    const damage = Number(BOSS.bulletDamage || 180);
    const originX = state.boss.x;
    const originY = state.boss.y + 40;

    // 理想郷：ノア専用。
    // 高負荷な同心円乱射ではなく、少ない発数で密度感が出る二重らせんへ変更する。
    if (isNoahStage()) {
      const interval = phase === 1 ? 280 : (phase === 2 ? 220 : 170);
      if (now - state.lastBossShotAt < getStageAdjustedEnemyFireInterval(interval)) return;
      state.lastBossShotAt = now;

      const step = Number(state.noahSpiralStep || 0);
      const baseSpin = step * (phase === 1 ? 0.29 : (phase === 2 ? 0.34 : 0.40));
      const armCount = phase === 1 ? 2 : (phase === 2 ? 4 : 6);
      const pairStep = (Math.PI * 2) / armCount;
      const speedMul = phase === 1 ? 0.92 : (phase === 2 ? 1.00 : 1.08);
      const twist = phase === 1 ? 0.0 : (phase === 2 ? 0.10 : 0.16);

      for (let i = 0; i < armCount; i++) {
        const a = baseSpin + pairStep * i + (i % 2 === 0 ? twist : -twist);
        const p = makeProjectile(
          'shooting-enemy-bullet',
          originX, originY,
          Math.cos(a) * speed * speedMul,
          Math.sin(a) * speed * speedMul,
          damage
        );
        if (p) {
          p.canvasRadius = phase === 3 ? 6.4 : 5.9;
          state.enemyBullets.push(p);
        }
      }

      // 数ボレーごとに、渦の中心から少量の追尾弾を添えて回避方向をずらす。
      state.noahSpiralStep = step + 1;
      const extraEvery = phase === 1 ? 4 : 3;
      if ((state.noahSpiralStep % extraEvery) === 0) {
        const dx = state.player.x - state.boss.x;
        const dy = state.player.y - state.boss.y;
        const aim = Math.atan2(dy, dx);
        const offsets = phase === 3 ? [-0.18, 0.18] : [0];
        offsets.forEach(offset => {
          const a = aim + offset;
          const p = makeProjectile(
            'shooting-enemy-bullet',
            originX, originY,
            Math.cos(a) * speed * 0.92,
            Math.sin(a) * speed * 0.92,
            damage
          );
          if (p) {
            p.canvasRadius = 5.4;
            state.enemyBullets.push(p);
          }
        });
      }
      return;
    }

    // 超弾幕テスト本来の挙動は残す。
    // WAVE1から既に高密度。WAVE3でさらに詰める。
    const interval = phase === 1 ? 260 : phase === 2 ? 190 : 130;
    if (now - state.lastBossShotAt < getStageAdjustedEnemyFireInterval(interval)) return;
    state.lastBossShotAt = now;
    const volleyIndex = Number(state.bulletHellVolleyIndex || 0);
    state.bulletHellVolleyIndex = volleyIndex + 1;

    // 同心円リング：WAVEごとに弾数を増やす。
    const ringCounts = { 1: 16, 2: 22, 3: 30 };
    const ringCount = ringCounts[phase] || ringCounts[3];
    const spinRate = phase === 1 ? 0.0016 : phase === 2 ? 0.0022 : 0.0030;
    const spin = volleyIndex * interval * spinRate;
    for (let i = 0; i < ringCount; i++) {
      const a = spin + (Math.PI * 2 * i / ringCount);
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet',
        originX, originY,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        damage
      ));
    }

    // 自機狙いの追加扇形：WAVEが進むほど本数を増やす。
    const dx = state.player.x - state.boss.x;
    const dy = state.player.y - state.boss.y;
    const baseAngle = Math.atan2(dy, dx);
    const fanOffsets = {
      1: [-0.3, -0.1, 0.1, 0.3],
      2: [-0.4, -0.24, -0.08, 0.08, 0.24, 0.4],
      3: [-0.5, -0.36, -0.22, -0.08, 0.08, 0.22, 0.36, 0.5],
    };
    (fanOffsets[phase] || fanOffsets[3]).forEach(offset => {
      const a = baseAngle + offset;
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet',
        originX, originY,
        Math.cos(a) * speed * 1.15,
        Math.sin(a) * speed * 1.15,
        damage
      ));
    });
  }

  // SCORE ATTACK専用固定弾幕 / BALANCED LITE。
  // 見た目・通常HUD・開始メッセージは共通仕様のまま。
  // 軽量化は「弾DOM数」「古い通常弾の整理」「固定サイズ計測」に限定する。
  function fireScoreAttack(now) {
    if (!state || !isScoreAttackStage()) return;
    const cfg = selectedStage.scoreAttack || {};
    const elapsed = Math.max(0, now - Number(state.startedAt || now));
    const interval = Math.max(760, Number(cfg.volleyIntervalMs || 880));
    const targetVolley = Math.floor(elapsed / interval);
    if (!Number.isFinite(state.scoreAttackVolleyIndex)) state.scoreAttackVolleyIndex = -1;
    if (targetVolley <= state.scoreAttackVolleyIndex) return;

    const speed = 190 * Math.max(.5, Number(cfg.bulletSpeedMultiplier || 1));
    const damage = Math.max(1, Number(cfg.bulletDamage || 105));
    const originX = state.boss.x;
    const originY = state.boss.y + 38;

    while (state.scoreAttackVolleyIndex < targetVolley) {
      state.scoreAttackVolleyIndex += 1;
      const n = state.scoreAttackVolleyIndex;
      const cycle = n % 8;
      const ringCount = cycle < 3 ? 8 : cycle < 6 ? 9 : 10;
      const start = (n % 24) * (Math.PI / 36);

      // 通常弾：黒の中玉。固定リング。
      for (let i = 0; i < ringCount; i++) {
        const a = start + (Math.PI * 2 * i / ringCount);
        const p = makeProjectile(
          'shooting-enemy-bullet shooting-score-attack-bullet',
          originX, originY, Math.cos(a) * speed, Math.sin(a) * speed, damage
        );
        if (p) state.enemyBullets.push(p);
      }

      // 奇数ボレー：5WAYの固定扇形。自機追尾にしないので毎回同じ弾幕。
      if ((n % 2) === 1) {
        const center = Math.PI / 2 + (((n % 6) - 2.5) * 0.055);
        [-0.34,-0.17,0,0.17,0.34].forEach(offset => {
          const a = center + offset;
          const p = makeProjectile(
            'shooting-enemy-bullet shooting-score-attack-bullet shooting-score-attack-fan',
            originX, originY, Math.cos(a) * speed * 1.10, Math.sin(a) * speed * 1.10, damage
          );
          if (p) state.enemyBullets.push(p);
        });
      }

      // WARNING制御。
      // 通常周期のWARNINGは残り5秒以降では一切出さない。
      // また終盤は残り10秒で最後のWARNINGを1回だけ予告し、次ボレーで発射する。
      const timeLeft = getBattleTimeLeft(now);
      const inFinalWarningWindow = timeLeft <= 10 && timeLeft > 5;
      const allowRegularWarning = timeLeft > 10;

      if (allowRegularWarning && cycle === 5) {
        showBossDangerWarning();
      }

      if (inFinalWarningWindow && !state.scoreAttackFinalWarningShown) {
        state.scoreAttackFinalWarningShown = true;
        showBossDangerWarning();
      }

      const shouldFireRegularWarning = allowRegularWarning && cycle === 6;
      const shouldFireFinalWarning = inFinalWarningWindow && state.scoreAttackFinalWarningShown && !state.scoreAttackFinalWarningFired;

      if (shouldFireRegularWarning || shouldFireFinalWarning) {
        if (shouldFireFinalWarning) state.scoreAttackFinalWarningFired = true;
        removeBossDangerWarning();
        const warningAngle = Math.PI / 2 + (((Math.floor(n / 8) % 5) - 2) * 0.11);
        const warningDamage = Math.max(damage, damage * Math.max(1, Number(cfg.warningDamageMultiplier || 2)));
        const warning = makeProjectile(
          'shooting-enemy-bullet shooting-danger-bullet shooting-score-attack-bullet shooting-score-attack-warning-bullet',
          originX, originY,
          Math.cos(warningAngle) * speed * .72,
          Math.sin(warningAngle) * speed * .72,
          warningDamage
        );
        if (warning) {
          warning.scoreAttackWarning = true;
          // HARDのみWARNING大玉を壁反射させる。
          // 1回目・2回目は反射、3回目の壁接触でその場で消滅。
          if (String(cfg.difficulty || '').toLowerCase() === 'hard') {
            warning.scoreAttackWarningBounceCount = 0;
            warning.scoreAttackWarningBounceMax = 3;
          }
          state.enemyBullets.push(warning);
        }
      }

      // LAST5秒は新規WARNINGを出さず、残っている予告表示も消す。
      if (timeLeft <= 5) {
        removeBossDangerWarning();
      }

      // 横断弾はWARNINGと同時に増やしすぎず、次ボレーに4組だけ出す。
      if (cycle === 7) {
        const w = Math.max(1, Number(state.scoreAttackArenaWidth || 390));
        const h = Math.max(1, Number(state.scoreAttackArenaHeight || 700));
        for (let i = 0; i < 4; i++) {
          const y = Math.max(110, h * (.28 + i * .12));
          const left = makeProjectile(
            'shooting-enemy-bullet shooting-score-attack-bullet shooting-score-attack-cross',
            8, y, speed * .84, speed * .16, damage
          );
          const right = makeProjectile(
            'shooting-enemy-bullet shooting-score-attack-bullet shooting-score-attack-cross',
            Math.max(8, w - 8), y, -speed * .84, speed * .16, damage
          );
          if (left) state.enemyBullets.push(left);
          if (right) state.enemyBullets.push(right);
        }
      }

      // 古い通常弾だけを整理。WARNING弾はisProtectedEnemyProjectileで保護される。
      enforceEnemyBulletSafetyLimit(now);
    }
  }


  function fireRaidGreenLaser(now, baseAngle, speed) {
    if (!state || !isRaidStage()) return;

    // 通常弾幕の隙間に差し込む中威力レーザー。
    // WARNING級ではなく、見て避けられる細い直線弾として扱う。
    const phase = Math.max(1, Math.min(3, Number(state.boss?.phase || 1)));
    const sway = Math.sin(Number(state.boss?.patternTick || 0) * 1.29) * 0.16;
    const offset = phase >= 3 ? (state.boss.patternTick % 2 ? -0.22 : 0.22) : sway;
    const angle = baseAngle + offset;
    const laserSpeed = Math.max(360, Number(speed || 248) * 1.62);
    const projectile = makeProjectile(
      'shooting-enemy-bullet shooting-raid-green-laser',
      state.boss.x, state.boss.y + 40,
      Math.cos(angle) * laserSpeed,
      Math.sin(angle) * laserSpeed,
      ENEMY_FIXED_DAMAGE.RAID_LASER
    );
    if (!projectile) return;
    projectile.el.style.setProperty('--raid-laser-angle', `${angle}rad`);
    projectile.raidLaser = true;
    state.enemyBullets.push(projectile);
  }

  function fireBarrageBoss(now) {
    const phase = state.boss.phase || 1;

    // CH03-4だけ、wave2/3では次の一斉生成前にも軽いsoft limitをかける。
    // 上限到達後に21〜25発を一度に追加して瞬間的にDOMが膨らむのを防ぐ。
    if (isChapter03BossStage()) {
      const limits = getChapter03BossEnemyBulletLimits();
      let ordinaryCount = 0;
      for (const p of state.enemyBullets) {
        if (p && p.el && !isProtectedEnemyProjectile(p)) ordinaryCount++;
      }
      const soft = phase === 1 ? 210 : (phase === 2 ? 95 : 88);
      if (ordinaryCount >= soft) return;
    }

    const interval = phase === 1 ? 860 : phase === 2 ? 760 : 650;
    if (now - state.lastBossShotAt < getStageAdjustedEnemyFireInterval(interval)) return;
    state.lastBossShotAt = now;

    const dx = state.player.x - state.boss.x;
    const dy = state.player.y - state.boss.y;
    const baseAngle = Math.atan2(dy, dx);
    const speed = Number(BOSS.bulletSpeed || 248);
    state.boss.patternTick = (state.boss.patternTick || 0) + 1;
    const tick = state.boss.patternTick;

    // DAILY RAIDのみ、通常弾幕4セットに1回ほど緑の直線レーザーを混ぜる。
    // フェーズが進むほど弾幕間隔自体が短くなるため、自然にレーザー頻度も少し上がる。
    if (isRaidStage() && tick % 4 === 0) {
      fireRaidGreenLaser(now, baseAngle, speed);
    }

    if (phase === 1) {
      // 7WAYの主弾 + たまに小リング
      [-0.54, -0.36, -0.18, 0, 0.18, 0.36, 0.54].forEach(offset => {
        const a = baseAngle + offset;
        state.enemyBullets.push(makeProjectile(
          'shooting-enemy-bullet',
          state.boss.x, state.boss.y + 40,
          Math.cos(a) * speed,
          Math.sin(a) * speed,
          Number(BOSS.bulletDamage || 210)
        ));
      });

      if (tick % 2 === 0) {
        const start = tick * (860 * 0.0022);
        for (let i = 0; i < 10; i++) {
          const a = start + (Math.PI * 2 * i / 10);
          state.enemyBullets.push(makeProjectile(
            'shooting-enemy-bullet',
            state.boss.x, state.boss.y + 30,
            Math.cos(a) * speed * 0.74,
            Math.sin(a) * speed * 0.74,
            Math.max(1, Number(BOSS.bulletDamage || 210) - 25)
          ));
        }
      }
      return;
    }

    if (phase === 2) {
      // 9WAYの厚い弾幕 + 8発交差リング。iPhone/PWA安定化のため同時DOM生成を17発に抑える。
      [-0.68, -0.51, -0.34, -0.17, 0, 0.17, 0.34, 0.51, 0.68].forEach(offset => {
        const a = baseAngle + offset;
        state.enemyBullets.push(makeProjectile(
          'shooting-enemy-bullet',
          state.boss.x, state.boss.y + 40,
          Math.cos(a) * speed * 1.02,
          Math.sin(a) * speed * 1.02,
          Number(BOSS.bulletDamage || 210)
        ));
      });

      const start = (tick % 2 === 0 ? 0 : Math.PI / 12) + tick * (760 * 0.0028);
      for (let i = 0; i < 8; i++) {
        const a = start + (Math.PI * 2 * i / 8);
        state.enemyBullets.push(makeProjectile(
          'shooting-enemy-bullet',
          state.boss.x, state.boss.y + 28,
          Math.cos(a) * speed * 0.82,
          Math.sin(a) * speed * 0.82,
          Math.max(1, Number(BOSS.bulletDamage || 210) - 18)
        ));
      }
      return;
    }

    // 最終段階: 11WAY + 8発高密度リング。軌道密度は維持しつつ同時DOM生成を19発に抑える。
    [-0.80, -0.64, -0.48, -0.32, -0.16, 0, 0.16, 0.32, 0.48, 0.64, 0.80].forEach(offset => {
      const a = baseAngle + offset;
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet',
        state.boss.x, state.boss.y + 38,
        Math.cos(a) * speed * 1.08,
        Math.sin(a) * speed * 1.08,
        Number(BOSS.bulletDamage || 210)
      ));
    });

    const start = tick * (650 * 0.0034) + (tick % 2 ? Math.PI / 18 : 0);
    for (let i = 0; i < 8; i++) {
      const a = start + (Math.PI * 2 * i / 8);
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet',
        state.boss.x, state.boss.y + 26,
        Math.cos(a) * speed * 0.86,
        Math.sin(a) * speed * 0.86,
        Math.max(1, Number(BOSS.bulletDamage || 210) - 15)
      ));
    }
  }


  function showFacelessBattleCut(title, sub) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.querySelectorAll('.shooting-faceless-battle-cut').forEach(el => el.remove());
    const el = document.createElement('div');
    el.className = 'shooting-faceless-battle-cut';
    el.innerHTML = `<small>${sub || 'FACELESS'}</small><strong>${title || '無貌の天使'}</strong>`;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => el.classList.add('out'), 650);
    setTimeout(() => el.remove(), 1050);
  }

  function spawnFacelessObject(x, y, ways) {
    if (!state || !isFacelessStage()) return null;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;

    const el = document.createElement('img');
    el.className = 'shooting-faceless-object';
    el.src = 'images/enemy_faceless_battle_object.webp';
    el.alt = '仮面';
    el.draggable = false;
    arena.appendChild(el);

    const hpEl = document.createElement('div');
    hpEl.className = 'shooting-faceless-object-hp';
    hpEl.innerHTML = '<i></i>';
    arena.appendChild(hpEl);

    const hp = getFacelessObjectHp();
    const obj = {
      id: ++state.facelessObjectSeq,
      el, hpEl,
      x, y,
      hp, hpMax: hp,
      ways: Number(ways || 2),
      vx: (state.facelessObjectSeq % 2 ? 1 : -1) * 58,
      lastShotAt: -9999,
    };
    state.facelessObjects.push(obj);
    positionUnit(el, x, y);
    positionUnit(hpEl, x, y + 56);
    measureUnitSize(obj);

    // 無貌専用：召喚直後の1発目を確実に出す。
    // Safari/iPhoneで最初のAI更新が遅れても、仮面が無反応に見えないようにする。
    const spawnNow = performance.now();
    obj.lastShotAt = -999999;
    fireFacelessObject(obj, spawnNow);

    return obj;
  }

  function damageFacelessObject(obj, damage, now, elementReaction = '', suppressVisual = false) {
    if (!obj || obj.hp <= 0) return 0;
    const appliedDamage = Math.min(obj.hp, Math.max(0, Number(damage || 0)));
    obj.hp = Math.max(0, obj.hp - appliedDamage);

    // build782: FACELESSの仮面も通常敵と同じ被弾フィードバックへ統一。
    // 通常射撃は実際の接触位置にHITリング、ダメージ数字は敵中心に出す。
    const visualNow = Number(now || performance.now());
    const useProjectileImpact =
      Number.isFinite(Number(obj._lastProjectileImpactX)) &&
      Number.isFinite(Number(obj._lastProjectileImpactY)) &&
      Math.abs(visualNow - Number(obj._lastProjectileImpactAt || 0)) <= 80;
    const hitX = useProjectileImpact ? Number(obj._lastProjectileImpactX) : Number(obj.x || 0);
    const hitY = useProjectileImpact ? Number(obj._lastProjectileImpactY) : Number(obj.y || 0);

    if (!suppressVisual) {
      createHit(hitX, hitY, !!obj.ambushMinion);
      showDamageNumber(obj.x, obj.y, appliedDamage, 'enemy', !!obj.ambushMinion, elementReaction);
      if (obj.el) {
        sustainHitFeedback(obj.el, obj.ambushMinion ? 190 : 175);

        // 仮面は1発ごとに短い被弾フラッシュを再発火。
        if (!obj.ambushMinion) {
          obj.el.classList.remove('faceless-hit-flash');
          void obj.el.offsetWidth;
          obj.el.classList.add('faceless-hit-flash');
          window.clearTimeout(obj._facelessHitFlashTimer);
          obj._facelessHitFlashTimer = window.setTimeout(() => {
            if (obj.el && obj.el.isConnected) obj.el.classList.remove('faceless-hit-flash');
            obj._facelessHitFlashTimer = null;
          }, 170);
        } else {
          obj.el.classList.remove('ambush-hit-flash');
          void obj.el.offsetWidth;
          obj.el.classList.add('ambush-hit-flash');
        }
      }
    }

    const fill = obj.hpEl?.querySelector('i');
    if (fill) fill.style.width = `${clamp(obj.hp / obj.hpMax, 0, 1) * 100}%`;
    if (obj.hp <= 0) {
      obj.el?.classList.add('defeated');
      setTimeout(() => {
        obj.el?.remove();
        obj.hpEl?.remove();
      }, 180);
    }
    return appliedDamage;
  }

  function fireFacelessObject(obj, now) {
    if (!state || !obj || obj.hp <= 0 || !obj.el) return;

    const fireInterval = obj.ways >= 3 ? 720 : 820;
    if (now - Number(obj.lastShotAt || 0) < fireInterval) return;
    obj.lastShotAt = now;

    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    // 内部座標(obj.x / obj.y)から発射位置を推測しない。
    // 実際に描画されている仮面DOMの矩形を取得し、
    // その「見た目上の下端」を発射口として使う。
    const arenaRect = arena.getBoundingClientRect();
    const maskRect = obj.el.getBoundingClientRect();

    const left = maskRect.left - arenaRect.left;
    const right = maskRect.right - arenaRect.left;
    const center = (left + right) * 0.5;

    // 弾の中心が仮面に埋まって見えないよう、下端より少し下へ出す。
    const muzzleY = maskRect.bottom - arenaRect.top + 5;

    const width = Math.max(1, right - left);
    const leftMuzzleX = left + width * 0.28;
    const rightMuzzleX = left + width * 0.72;

    const speed = obj.ways >= 3 ? 230 : 215;
    const damage = obj.ways >= 3 ? 125 : 105;

    const shots = obj.ways >= 3
      ? [
          // 3WAY: 仮面の左下 / 中央下 / 右下
          { x: leftMuzzleX,  y: muzzleY, angle: Math.PI / 2 + 0.30 },
          { x: center,       y: muzzleY, angle: Math.PI / 2 },
          { x: rightMuzzleX, y: muzzleY, angle: Math.PI / 2 - 0.30 },
        ]
      : [
          // 2WAY: 仮面の左下 / 右下
          { x: leftMuzzleX,  y: muzzleY, angle: Math.PI / 2 + 0.24 },
          { x: rightMuzzleX, y: muzzleY, angle: Math.PI / 2 - 0.24 },
        ];

    shots.forEach(shot => {
      const projectile = makeProjectile(
        'shooting-enemy-bullet shooting-faceless-object-bullet',
        shot.x,
        shot.y,
        Math.cos(shot.angle) * speed,
        Math.sin(shot.angle) * speed,
        damage
      );
      if (projectile) state.enemyBullets.push(projectile);
    });
  }

  function updateFacelessObjects(dt, now) {
    if (!state || !isFacelessStage() || !Array.isArray(state.facelessObjects)) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const w = arena.clientWidth;

    const activePullField = isEnemyPullFieldActive(now);

    state.facelessObjects = state.facelessObjects.filter(obj => {
      if (!obj || obj.hp <= 0) return false;

      // ノアULT後：落雷を受けたOBJECTも、移動停止と射撃生成停止をセットで維持。
      if (now < Number(obj.noahStunUntil || 0)) {
        deferFacelessObjectAttackResume(obj, Number(obj.noahStunUntil || now));
        positionUnit(obj.el, obj.x, obj.y);
        positionUnit(obj.hpEl, obj.x, obj.y + 56);
        return true;
      }

      // マグダレーナULTで捕捉されたOBJECTも移動・射撃生成を停止。
      // 解除後に即連射しないよう、最終射撃時刻を拘束終了時刻まで進める。
      if (now < Number(obj.gojoPurpleFreezeUntil || 0)) {
        deferFacelessObjectAttackResume(obj, Number(obj.gojoPurpleFreezeUntil || now));
        positionUnit(obj.el, obj.x, obj.y);
        positionUnit(obj.hpEl, obj.x, obj.y + 56);
        return true;
      }

      // ブラックホール中はOBJECT側の横移動/攻撃AIを止め、
      // 吸引処理だけに座標更新を一元化する。
      if (activePullField) {
        deferFacelessObjectAttackResume(obj, Number(state.eltenaBlackHole?.activeUntil || now));
        positionUnit(obj.el, obj.x, obj.y);
        positionUnit(obj.hpEl, obj.x, obj.y + 56);
        return true;
      }

      obj.x += obj.vx * dt;
      const minX = 72;
      const maxX = Math.max(minX + 40, w - 72);
      if (obj.x <= minX || obj.x >= maxX) {
        obj.x = clamp(obj.x, minX, maxX);
        obj.vx *= -1;
      }
      positionUnit(obj.el, obj.x, obj.y);
      positionUnit(obj.hpEl, obj.x, obj.y + 56);
      fireFacelessObject(obj, now);
      return true;
    });
  }

  function beginFacelessObjectSummon(count, ways) {
    if (!state || state.ended || state.finishing || state.phaseTransition) return;
    state.facelessSummonTriggered = true;
    state.phaseTransition = true;
    clearEnemyBulletsOnly();
    showFacelessBattleCut('仮面顕現', `${count} OBJECT`);

    setTimeout(() => {
      if (!state || state.ended || state.finishing || !isFacelessStage()) return;
      const arena = document.getElementById('shooting-arena');
      if (!arena) return;
      const w = arena.clientWidth;
      const h = arena.clientHeight;
      // 無貌専用：仮面は画面中央付近に顕現させる。
      // 旧0.46はiPhone縦長画面で下寄りに見えたため上へ補正。
      const y = h * 0.28;
      if (count <= 1) {
        spawnFacelessObject(w * 0.5, y, ways);
      } else {
        spawnFacelessObject(w * 0.34, y, ways);
        spawnFacelessObject(w * 0.66, y, ways);
      }
      state.phaseTransition = false;
      state.lastBossShotAt = performance.now();
      state.lastShotAt = performance.now();
      renderHud();
    }, 850);
  }

  function updateFacelessStageMechanics(now) {
    if (!state || !isFacelessStage() || state.ended || state.finishing) return;
    const wave = Number(state.facelessWave || 1);
    const ratio = state.boss.hpMax > 0 ? state.boss.hp / state.boss.hpMax : 1;
    if (!state.facelessSummonTriggered && ratio <= 0.5 && state.boss.hp > 0) {
      const cfg = getFacelessConfig();
      const counts = Array.isArray(cfg?.waveObjectCount) ? cfg.waveObjectCount : [1, 2];
      beginFacelessObjectSummon(Number(counts[wave - 1] || (wave === 1 ? 1 : 2)), Number(cfg?.objectWays || 2));
    }
  }

  function beginFacelessWave2() {
    if (!state || !isFacelessStage() || Number(state.facelessWave || 1) !== 1) return false;
    state.phaseTransition = true;
    clearEnemyBulletsOnly();
    state.facelessObjects.forEach(obj => { obj?.el?.remove(); obj?.hpEl?.remove(); });
    state.facelessObjects = [];
    state.facelessWave = 2;
    state.facelessSummonTriggered = false;
    state.facelessVolleyIndex = 0;

    const hp = getFacelessWaveHp(2);
    state.boss.hp = hp;
    state.boss.hpMax = hp;
    state.boss.gaugeHp = hp;
    state.boss.gauges = 1;
    state.boss.phase = 1;

    showFacelessBattleCut('WAVE 2', selectedStage?.difficultyLabel || 'SPECIAL EVENT');
    renderHud();

    setTimeout(() => {
      if (!state || state.ended || state.finishing || !isFacelessStage()) return;
      state.phaseTransition = false;
      state.lastBossShotAt = performance.now();
      state.lastShotAt = performance.now();
      renderHud();
    }, 1200);
    return true;
  }

  function fireFacelessBoss(now) {
    if (!state || !isFacelessStage()) return;
    const cfg = getFacelessConfig();
    const wave = Number(state.facelessWave || 1);
    const mode = Array.isArray(cfg?.waveBarrage) ? cfg.waveBarrage[wave - 1] : 'medium';

    let fireRate = 900;
    let offsets = [-0.18, 0, 0.18];
    let speed = 215;
    let damage = 125;

    if (mode === 'medium') {
      fireRate = 690;
      offsets = [-0.34, -0.17, 0, 0.17, 0.34];
      speed = 225;
      damage = 140;
    } else if (mode === 'dense') {
      fireRate = 500;
      offsets = [-0.48, -0.32, -0.16, 0, 0.16, 0.32, 0.48];
      speed = 238;
      damage = 150;
    }

    if (now - state.lastBossShotAt < getStageAdjustedEnemyFireInterval(fireRate)) return;
    state.lastBossShotAt = now;
    const volleyIndex = Number(state.facelessVolleyIndex || 0);
    state.facelessVolleyIndex = volleyIndex + 1;

    const base = Math.atan2(state.player.y - state.boss.y, state.player.x - state.boss.x);
    offsets.forEach(offset => {
      const a = base + offset;
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet shooting-faceless-bullet',
        state.boss.x, state.boss.y + 38,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        damage
      ));
    });

    // 超上級wave2のみ、ときどき薄い円形弾を混ぜて「濃い」にする。
    if (mode === 'dense' && volleyIndex % 3 === 2) {
      const start = volleyIndex * (fireRate * 0.0022);
      for (let i = 0; i < 10; i++) {
        const a = start + Math.PI * 2 * i / 10;
        state.enemyBullets.push(makeProjectile(
          'shooting-enemy-bullet shooting-faceless-bullet',
          state.boss.x, state.boss.y + 24,
          Math.cos(a) * 185,
          Math.sin(a) * 185,
          115
        ));
      }
    }
  }


  // ============================================================
  // RANDOM AMBUSH - オーバーシア（亜種）
  // ============================================================
  function clearAmbushObjects() {
    if (!state) return;
    (state.facelessObjects || []).forEach(obj => { obj?.el?.remove(); obj?.hpEl?.remove(); });
    state.facelessObjects = [];
    state.ambushLaserEl?.remove();
    state.ambushLaserWarningEl?.remove();
    state.ambushLaserEl = null;
    state.ambushLaserWarningEl = null;
  }

  function spawnAmbushMinions() {
    if (!state || !isAmbushStage() || state.ambushMinionSummoned) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    state.ambushMinionSummoned = true;
    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const wave = Number(state.ambushWave || 1);
    const cfg = getAmbushConfig();
    const hpList = cfg && Array.isArray(cfg.minionHp) ? cfg.minionHp : [800, 1500];
    const hp = Math.max(1, Number(hpList[wave - 1] || 800));
    const points = [{x:w*.20,y:h*.27,vx:22},{x:w*.80,y:h*.27,vx:-22}];

    points.forEach((pt, idx) => {
      const el = document.createElement('img');
      el.className = 'shooting-ambush-minion';
      el.src = 'images/enemy_mini_01_blk_battle.webp';
      el.alt = 'enemy_mini';
      el.draggable = false;
      arena.appendChild(el);

      const hpEl = document.createElement('div');
      hpEl.className = 'shooting-ambush-minion-hp';
      hpEl.innerHTML = '<i></i>';
      arena.appendChild(hpEl);

      const obj = {
        id: ++state.facelessObjectSeq,
        ambushMinion: true,
        el, hpEl,
        x:pt.x,y:pt.y,vx:pt.vx,
        hp,hpMax:hp,
        lastShotAt:performance.now() - 5200 - idx*450
      };
      state.facelessObjects.push(obj);
      positionUnit(el,obj.x,obj.y);
      positionUnit(hpEl,obj.x,obj.y+38);
      measureUnitSize(obj);
    });
  }

  function fireAmbushMinion(obj, now) {
    if (!state || !obj || !obj.ambushMinion || obj.hp <= 0 || !obj.el || !obj.el.isConnected) return;
    const cfg = getAmbushConfig();
    const interval = Math.max(1000, Number(cfg?.minionFireEveryMs || 5000));
    if (now - Number(obj.lastShotAt || 0) < interval) return;
    obj.lastShotAt = now;

    const damage = getAmbushWaveDamage(state.ambushWave || 1);
    const speed = Math.max(60, Number(cfg?.minionBulletSpeed || 108));
    const base = Math.atan2(state.player.y - obj.y, state.player.x - obj.x);

    // 左右2発。低速追尾方向へ撃つ。軽量DOMのまま確実に生成する。
    [-0.14,0.14].forEach(offset => {
      const a = base + offset;
      const muzzle = getAmbushEnemyMuzzle(obj, 3);
      const p = makeProjectile(
        'shooting-enemy-bullet shooting-ambush-bullet shooting-mini-enemy-bullet',
        muzzle.x, muzzle.y,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        damage
      );
      if (p) {
        p.ambushMiniShot = true;
        state.enemyBullets.push(p);
      }
    });
  }

  function fireAllAmbushMinions(now) {
    if (!state || !isAmbushStage()) return;
    (state.facelessObjects || []).forEach(obj => {
      if (obj && obj.ambushMinion && obj.hp > 0) fireAmbushMinion(obj, now);
    });
  }

  function getAmbushMinionHitRect(obj, arenaRect) {
    if (!obj || !obj.el) return null;
    const rect = getUnitRect(obj, arenaRect);
    if (!rect) return null;

    // 見た目64pxに対して少し広めの当たり判定。
    // 「当てたのに抜けた」感をなくすため左右/上下を約10px拡張する。
    const padX = 10;
    const padY = 10;
    return {
      left: rect.left - padX,
      right: rect.right + padX,
      top: rect.top - padY,
      bottom: rect.bottom + padY,
      width: rect.width + padX * 2,
      height: rect.height + padY * 2
    };
  }

  function updateAmbushMinions(dt, now) {
    if (!state || !isAmbushStage()) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const w = arena.clientWidth;
    state.facelessObjects = (state.facelessObjects || []).filter(obj => {
      if (!obj || !obj.ambushMinion || obj.hp <= 0) return false;
      obj.x += Number(obj.vx || 0) * dt;
      if (obj.x < 62 || obj.x > w-62) {
        obj.x = clamp(obj.x,62,w-62);
        obj.vx *= -1;
      }
      positionUnit(obj.el,obj.x,obj.y);
      positionUnit(obj.hpEl,obj.x,obj.y+38);
      fireAmbushMinion(obj,now);
      return true;
    });
  }

  function getAmbushEnemyMuzzle(source, yBias = 0) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return { x: Number(source?.x || 0), y: Number(source?.y || 0) + yBias };

    const arenaRect = arena.getBoundingClientRect();
    const el = source?.el || document.getElementById(BOSS_ID);
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      return {
        x: (r.left + r.right) * 0.5 - arenaRect.left,
        y: r.bottom - arenaRect.top + yBias
      };
    }
    return { x: Number(source?.x || state?.boss?.x || 0), y: Number(source?.y || state?.boss?.y || 0) + yBias };
  }

  function spawnAmbushWarningPair(now, persistent) {
    if (!state || !isAmbushStage()) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const damage = getAmbushWaveDamage(state.ambushWave || 1);
    const bossMuzzle = getAmbushEnemyMuzzle({ el: document.getElementById(BOSS_ID), x:state.boss.x, y:state.boss.y }, 4);
    const starts = persistent
      ? [
          {x:bossMuzzle.x-16,y:bossMuzzle.y,a:.72},
          {x:bossMuzzle.x+16,y:bossMuzzle.y,a:2.42}
        ]
      : [
          {x:bossMuzzle.x-18,y:bossMuzzle.y,a:.72},
          {x:bossMuzzle.x+18,y:bossMuzzle.y,a:2.42}
        ];

    starts.forEach((s,idx) => {
      const speed = persistent ? 92 : 175;
      const p = makeProjectile(
        'shooting-enemy-bullet shooting-ambush-warning-bullet',
        s.x,s.y,Math.cos(s.a)*speed,Math.sin(s.a)*speed,damage
      );
      if (!p) return;
      p.ambushBounce = true;
      p.ambushPersistent = !!persistent;
      p.ambushBounceCount = 0;
      p.ambushBounceMax = persistent ? Infinity : Math.max(1,Number(getAmbushConfig()?.warningWave1Bounces || 4));
      state.enemyBullets.push(p);
    });
  }

  function fireAmbushBoss(now) {
    if (!state || !isAmbushStage() || state.phaseTransition) return;
    const wave = Number(state.ambushWave || 1);
    const damage = getAmbushWaveDamage(wave);

    // miniの攻撃更新をボスAI側からも保証する。
    fireAllAmbushMinions(now);

    // 軽量版のまま密度を大幅増加。
    // W1: 7WAY / 0.70秒、W2: 9WAY / 0.50秒。
    const fireRate = wave === 1 ? 700 : 500;
    if (now - Number(state.lastBossShotAt || 0) >= fireRate) {
      state.lastBossShotAt = now;
      state.ambushVolleyIndex = Number(state.ambushVolleyIndex || 0) + 1;

      const base = Math.atan2(state.player.y - state.boss.y, state.player.x - state.boss.x);
      const step = wave === 1 ? 0.19 : 0.17;
      const count = 5;
      const center = (count - 1) / 2;
      // W2は交互に半ステップずらして安全地帯を固定しない。
      const shift = wave === 2 && (state.ambushVolleyIndex % 2) ? step * 0.5 : 0;
      const speed = wave === 1 ? 215 : 245;

      for (let i = 0; i < count; i++) {
        const a = base + (i - center) * step + shift;
        const muzzle = getAmbushEnemyMuzzle({ el: document.getElementById(BOSS_ID), x:state.boss.x, y:state.boss.y }, 4);
        const p = makeProjectile(
          'shooting-enemy-bullet shooting-ambush-bullet',
          muzzle.x, muzzle.y,
          Math.cos(a) * speed,
          Math.sin(a) * speed,
          damage
        );
        if (p) state.enemyBullets.push(p);
      }

      // 3回に1回だけ追加の狭い追尾3WAY。DOMを増やしすぎず圧を足す。
      if (state.ambushVolleyIndex % 3 === 0) {
        [-0.07, 0, 0.07].forEach(offset => {
          const a = base + offset;
          const muzzle = getAmbushEnemyMuzzle({ el: document.getElementById(BOSS_ID), x:state.boss.x, y:state.boss.y }, 6);
          const p = makeProjectile(
            'shooting-enemy-bullet shooting-ambush-bullet',
            muzzle.x, muzzle.y,
            Math.cos(a) * (speed + 35),
            Math.sin(a) * (speed + 35),
            damage
          );
          if (p) state.enemyBullets.push(p);
        });
      }
    }

    if (wave === 1) {
      const every = Math.max(1500, Number(getAmbushConfig()?.warningEveryMs || 4000));
      if (now - Number(state.ambushWarningLastAt || -9999) >= every) {
        state.ambushWarningLastAt = now;
        spawnAmbushWarningPair(now, false);
      }
    } else if (!state.ambushPersistentSpawned) {
      state.ambushPersistentSpawned = true;
      spawnAmbushWarningPair(now, true);
    }
  }

  function beginAmbushWave2() {
    if (!state || !isAmbushStage() || Number(state.ambushWave || 1) !== 1) return false;
    state.phaseTransition = true;
    clearEnemyBulletsOnly();
    clearAmbushObjects();
    state.ambushWave = 2;
    state.ambushMinionSummoned = false;
    state.ambushPersistentSpawned = false;
    state.ambushLaserTriggered = false;
    state.ambushWarningLastAt = performance.now();
    state.ambushVolleyIndex = 0;

    const hp = getAmbushWaveHp(2);
    state.boss.hp = hp;
    state.boss.hpMax = hp;
    state.boss.gaugeHp = hp;
    state.boss.gauges = 1;
    state.boss.phase = 1;
    showFacelessBattleCut('WAVE 2','OVERSEER VARIANT');
    renderHud();

    setTimeout(() => {
      if (!state || state.ended || !isAmbushStage()) return;
      state.phaseTransition = false;
      state.lastBossShotAt = performance.now();
      spawnAmbushWarningPair(performance.now(),true);
      state.ambushPersistentSpawned = true;
    }, 1000);
    return true;
  }

  function triggerAmbushLaser(now) {
    if (!state || state.ambushLaserTriggered) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    state.ambushLaserTriggered = true;
    const cfg = getAmbushConfig();
    state.ambushLaserWarningUntil = now + Math.max(600,Number(cfg?.laserWarningMs || 1300));

    const warn = document.createElement('div');
    warn.className = 'shooting-ambush-laser-warning';
    warn.textContent = 'CHARGED SHOT　強化弾';
    const warningMuzzle = getAmbushEnemyMuzzle({ el: document.getElementById(BOSS_ID), x:state.boss.x, y:state.boss.y }, -8);
    warn.style.left = `${warningMuzzle.x}px`;
    warn.style.top = `${Math.max(38,warningMuzzle.y)}px`;
    arena.appendChild(warn);
    state.ambushLaserWarningEl = warn;

    setTimeout(() => {
      if (!state || state.ended || !isAmbushStage()) return;
      warn.remove();
      state.ambushLaserWarningEl = null;
      const laser = document.createElement('div');
      laser.className = 'shooting-ambush-laser';
      laser.style.width = `${Math.round(clamp(Number(cfg?.laserWidthRatio || .5),.2,.8)*100)}%`;

      // レーザーも画面上端からではなく、実際のBOSS本体の下端を発射口にする。
      const muzzle = getAmbushEnemyMuzzle({ el: document.getElementById(BOSS_ID), x:state.boss.x, y:state.boss.y }, 0);
      laser.style.left = `${muzzle.x}px`;
      laser.style.top = `${Math.max(0,muzzle.y)}px`;
      laser.style.bottom = '0';

      arena.appendChild(laser);
      state.ambushLaserEl = laser;
      state.ambushLaserOriginX = muzzle.x;
      state.ambushLaserOriginY = muzzle.y;
      state.ambushLaserActiveUntil = performance.now() + Math.max(1000,Number(cfg?.laserDurationMs || 5000));
    }, Math.max(600,Number(cfg?.laserWarningMs || 1300)));
  }

  function updateAmbushLaser(now) {
    if (!state || !isAmbushStage()) return;
    if (state.ambushLaserEl && now >= Number(state.ambushLaserActiveUntil || 0)) {
      state.ambushLaserEl.remove();
      state.ambushLaserEl = null;
      state.ambushLaserActiveUntil = 0;
      return;
    }
    if (!state.ambushLaserEl || now >= Number(state.player.invulnUntil || 0) === false) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const w = arena.clientWidth;
    const ratio = clamp(Number(getAmbushConfig()?.laserWidthRatio || .5),.2,.8);
    const width = w * ratio;
    const centerX = Number(state.ambushLaserOriginX || state.boss.x || w * .5);
    const left = centerX - width * .5;
    const right = centerX + width * .5;
    const originY = Number(state.ambushLaserOriginY || state.boss.y || 0);
    if (
      state.player.x >= left &&
      state.player.x <= right &&
      state.player.y >= originY &&
      now >= Number(state.player.invulnUntil || 0)
    ) {
      // v184: 乱入WAVE2終盤攻撃は即死ではなく、
      // そのWAVEの通常弾ダメージの2倍に抑える。
      // v185: オーバーシア亜種WAVE2終盤の強化弾は600固定。
      // 通常弾400との差は1.5倍に留め、即死級にはしない。
      const heavyDamage = 600;
      damagePlayer(now, heavyDamage, 'raw', normalizeCombatElement(state?.boss?.element || BOSS?.element));
    }
  }

  function updateAmbushStageMechanics(dt, now) {
    if (!state || !isAmbushStage() || state.ended || state.finishing) return;
    updateAmbushMinions(dt,now);
    const ratio = state.boss.hpMax > 0 ? state.boss.hp/state.boss.hpMax : 1;
    if (!state.ambushMinionSummoned && ratio <= .5 && state.boss.hp > 0) spawnAmbushMinions();
    if (Number(state.ambushWave || 1) === 2 && !state.ambushLaserTriggered &&
        ratio <= Number(getAmbushConfig()?.laserTriggerRatio || .10) && state.boss.hp > 0) {
      triggerAmbushLaser(now);
    }
    updateAmbushLaser(now);
  }

  // ============================================================
  // Enemy damage tuning / BOSS WARNING attack
  // ============================================================
  // Enemy damage is intentionally FIXED so high-HP characters gain real survivability.
  // Balance target around the current roster:
  //   normal enemy: 110      -> roughly 5-6 hits for standard HP, more for high-HP units
  //   boss normal:  240      -> roughly 2-3 hits
  //   boss heavy:   350      -> roughly 2 hits
  //   WARNING:      999999   -> guaranteed 1 hit DOWN
  const ENEMY_FIXED_DAMAGE = Object.freeze({
    NORMAL: 110,
    BOSS: 240,
    RAID_LASER: 300,
    BOSS_HEAVY: 350,
    LETHAL: 999999,
  });

  function classifyIncomingAttack(projectile) {
    const el = projectile && projectile.el;
    if (!el) return 'raw';
    if (el.classList.contains('shooting-danger-bullet')) return 'lethal';
    if (el.classList.contains('shooting-raid-green-laser')) return 'raid-laser';
    if (el.classList.contains('shooting-mini-enemy-bullet')) return 'normal';
    if (el.classList.contains('shooting-violence-boss-heavy')) return 'boss-heavy';
    if (el.classList.contains('shooting-enemy-bullet')) return 'boss';
    return 'raw';
  }

  function getIncomingAttackElement(projectile) {
    const direct = normalizeCombatElement(projectile && (projectile.attackElement || projectile.element));
    if (direct) return direct;

    const cls = String(projectile && projectile.el && projectile.el.className || '').toLowerCase();
    for (const element of ['aqua','fire','wood','dark','light','neutral']) {
      if (cls.includes('shooting-enemy-element-' + element)) return element;
    }

    return normalizeCombatElement(
      state && state.boss && state.boss.element ||
      BOSS && BOSS.element ||
      selectedStage && (selectedStage.enemyElement || selectedStage.element)
    ) || 'neutral';
  }

  function isFacelessSuperDifficulty() {
    return !!(isFacelessStage() && getFacelessConfig()?.difficulty === 'super');
  }

  function isChapter03BossStage() {
    return !!(selectedStage && selectedStage.id === SHOOTING_STAGE_ID.CH03_04);
  }


  function resolveIncomingDamage(member, amount, attackType) {
    if (isAmbushStage()) {
      return Math.max(0, Math.round(Number(amount || getAmbushWaveDamage(state?.ambushWave || 1))));
    }
    if (attackType === 'lethal') return ENEMY_FIXED_DAMAGE.LETHAL;

    let damage = 0;
    if (attackType === 'normal') damage = ENEMY_FIXED_DAMAGE.NORMAL;
    else if (attackType === 'raid-laser') damage = ENEMY_FIXED_DAMAGE.RAID_LASER;
    else if (attackType === 'boss-heavy') damage = ENEMY_FIXED_DAMAGE.BOSS_HEAVY;
    else if (attackType === 'boss') damage = ENEMY_FIXED_DAMAGE.BOSS;
    else damage = Math.max(0, Number(amount || 0));

    // CHAPTER03-04はCHAPTER02より一段上のBOSS戦として通常被弾も強化。
    // BOSS通常弾 240 → 300（1.25倍）。密度の高さと合わせて難度差を作る。
    if (isChapter03BossStage()) damage *= 1.25;

    // フェイスレス最上級のみ、即死攻撃以外の基本攻撃力を1.3倍。
    // 固定ダメージ制は維持し、高HPキャラの耐久メリットも残す。
    if (isFacelessSuperDifficulty()) damage *= 1.3;

    // シオンULT「黒羽葬鐘」: 弱体化中は敵の非即死ダメージを軽減。
    // lethal はこの関数上部ですでに確定returnしているため対象外。
    if (state && performance.now() < Number(state.shionEnemyDebuffUntil || 0)) {
      damage *= Math.max(0.05, Math.min(1, Number(state.shionEnemyDamageMultiplier || 0.70)));
    }
    return Math.round(damage);
  }

  function removeBossDangerWarning() {
    if (!state) return;
    const el = state.bossDangerWarningEl;
    if (el && el.isConnected) el.remove();
    state.bossDangerWarningEl = null;
    document.getElementById(ROOT_ID)?.classList.remove('boss-danger-active');
  }

  function showBossDangerWarning() {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !state) return;
    removeBossDangerWarning();
    const el = document.createElement('div');
    el.className = 'shooting-boss-danger-warning';
    el.innerHTML = '<span>WARNING</span><strong>DANGER ATTACK</strong><small>一撃でDOWN ─ 回避せよ</small>';
    // v69: CSSが古い環境でも必ず見えるよう、重要部分はインライン指定する。
    Object.assign(el.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: '90',
      minWidth: '220px',
      padding: '14px 18px',
      border: '1px solid rgba(255,90,90,.82)',
      background: 'rgba(20,8,10,.78)',
      boxShadow: '0 0 22px rgba(255,40,60,.32)',
      textAlign: 'center',
      color: '#ffe8e8',
      borderRadius: '10px',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity .18s ease, transform .18s ease'
    });
    arena.appendChild(el);
    state.bossDangerWarningEl = el;
    document.getElementById(ROOT_ID)?.classList.add('boss-danger-active');
    requestAnimationFrame(() => {
      el.classList.add('show');
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%, -50%) scale(1.02)';
    });
  }

  function getBossDangerInterval() {
    const phase = Math.max(1, Number(state?.boss?.phase || 1));
    if (isChapter43BossStage()) {
      const cfg = getChapter43Config();
      const every = Number(state?.boss?.phase || 1) >= 2
        ? Number(cfg?.warningEveryMsWave2 || 5600)
        : Number(cfg?.warningEveryMsWave1 || 6500);
      return Math.max(1000, every - Number(cfg?.warningTelegraphMs || 700));
    }
    if (isChapter04BossStage()) return Math.max(1000, Number(selectedStage?.dangerEveryMs || 10000) - 700); // WARNING表示0.7秒を含め弾発射は10秒周期

    // CHAPTER01-04 オーバーシアだけはWAVE2/3の危険攻撃頻度も
    // 通常弾と同じく1段階ずつ弱体化する。
    if (
      selectedStage &&
      selectedStage.id === SHOOTING_STAGE_ID.CH01_04 &&
      BOSS &&
      BOSS.behavior === 'overseer_v1'
    ) {
      if (phase >= 3) return 7600; // 旧WAVE2相当
      return 9000;                 // WAVE1 / WAVE2
    }

    // その他のBOSSは従来値を維持。
    if (phase >= 3) return 6200;
    if (phase === 2) return 7600;
    return 9000;
  }

  function handleBossDangerAttack(now) {
    if (!state || isNormalBattle() || state.phaseTransition || state.koTransition) return false;

    if (state.bossDangerExecuteAt > 0) {
      // WARNING中も通常弾幕は止めない。大技の予兆と通常攻撃を同時進行させる。
      if (now < state.bossDangerExecuteAt) return false;

      const dx = state.player.x - state.boss.x;
      const dy = state.player.y - state.boss.y;
      const angle = Math.atan2(dy, dx);
      const speed = Math.max(325, Number(BOSS.bulletSpeed || 240) * 1.38);

      if (isChapter43BossStage()) {
        const cfg43 = getChapter43Config();
        const wave43 = Math.max(1, Number(state.boss.phase || 1));
        const bounces = wave43 >= 2
          ? Number(cfg43?.warningBouncesWave2 || 3)
          : Number(cfg43?.warningBouncesWave1 || 2);
        const shotAngle = angle + ((Number(state.bossDangerPatternIndex || 0) % 2) ? .18 : -.18);
        state.bossDangerPatternIndex = Number(state.bossDangerPatternIndex || 0) + 1;
        const warningSpeed = Math.max(250, Number(BOSS.bulletSpeed || 190) * 1.38);
        const projectile = makeProjectile(
          'shooting-enemy-bullet shooting-danger-bullet shooting-sakiel-warning-bullet',
          state.boss.x, state.boss.y + 38,
          Math.cos(shotAngle) * warningSpeed,
          Math.sin(shotAngle) * warningSpeed,
          999999
        );
        if (projectile) {
          projectile.dangerRicochet = true;
          projectile.dangerWallHits = 0;
          projectile.dangerMaxReflections = bounces;
          state.enemyBullets.push(projectile);
        }
      } else if (isChapter04BossStage()) {
        [-0.52, 0.52].forEach((offset, idx) => {
          const shotAngle = angle + offset;
          const projectile = makeProjectile(
            'shooting-enemy-bullet shooting-danger-bullet shooting-sakiel-warning-bullet',
            state.boss.x, state.boss.y + 38,
            Math.cos(shotAngle) * 72,
            Math.sin(shotAngle) * 72,
            999999
          );
          if (!projectile) return;
          projectile.sakielWarningDrift = true;
          projectile.sakielWarningBaseHeading = shotAngle;
          projectile.sakielWarningAge = 0;
          projectile.sakielWarningSpeed = 72;
          projectile.sakielWarningPhase = idx === 0 ? 0 : Math.PI;
          projectile.sakielWarningTurnAmp = 0.34;
          projectile.sakielWarningExpireAt = now + 5000;
          state.enemyBullets.push(projectile);
        });
      } else if (selectedStageId === SHOOTING_STAGE_ID.CH02_04) {
        // CH02-4 イリシュ: WARNINGは2発同時。左右へ大きく散らし、別位相で不規則に漂わせる。
        const warningSpeed = Math.max(170, Number(BOSS.bulletSpeed || 285) * .62);
        [-0.68, 0.68].forEach((offset, index) => {
          const heading = angle + offset;
          const projectile = makeProjectile(
            'shooting-enemy-bullet shooting-danger-bullet shooting-violence-warning-drift',
            state.boss.x, state.boss.y + 38,
            Math.cos(heading) * warningSpeed,
            Math.sin(heading) * warningSpeed,
            999999
          );
          if (!projectile) return;
          projectile.dangerDrift = true;
          projectile.dangerExpireAt = now + 7000;
          projectile.dangerDriftSpeed = warningSpeed;
          projectile.dangerDriftHeading = heading;
          projectile.dangerDriftPhase = index === 0 ? 0 : Math.PI * 1.13;
          projectile.dangerDriftTurnRate = 1.05;
          state.enemyBullets.push(projectile);
        });
      } else if (isChapter03BossStage()) {
        // リヴィア（CH03-04）の即死攻撃は2種類を順番に繰り返す。
        // ① 2WAY + 壁2反射
        // ② 4発の即死弾が8秒間、戦場をゆらゆら漂う
        const pattern = Number(state.bossDangerPatternIndex || 0) % 2;
        state.bossDangerPatternIndex = Number(state.bossDangerPatternIndex || 0) + 1;

        if (pattern === 0) {
          [-0.22, 0.22].forEach(offset => {
            const shotAngle = angle + offset;
            const projectile = makeProjectile(
              'shooting-enemy-bullet shooting-danger-bullet shooting-livia-danger-ricochet',
              state.boss.x, state.boss.y + 38,
              Math.cos(shotAngle) * speed,
              Math.sin(shotAngle) * speed,
              999999
            );
            if (!projectile) return;
            projectile.dangerRicochet = true;
            projectile.dangerWallHits = 0;
            projectile.dangerMaxReflections = 2;
            state.enemyBullets.push(projectile);
          });
        } else {
          const driftSpeed = 138;
          const driftOffsets = [-1.05, -0.35, 0.35, 1.05];
          driftOffsets.forEach((offset, index) => {
            const heading = angle + offset;
            const projectile = makeProjectile(
              'shooting-enemy-bullet shooting-danger-bullet shooting-livia-danger-drift',
              state.boss.x, state.boss.y + 38,
              Math.cos(heading) * driftSpeed,
              Math.sin(heading) * driftSpeed,
              999999
            );
            if (!projectile) return;
            projectile.dangerDrift = true;
            projectile.dangerExpireAt = now + 8000;
            projectile.dangerDriftSpeed = driftSpeed;
            projectile.dangerDriftHeading = heading;
            projectile.dangerDriftPhase = index * 1.7 + Number(state.bossDangerPatternIndex || 0) * 0.23;
            projectile.dangerDriftAge = 0;
            projectile.dangerDriftTurnRate = 0.78;
            state.enemyBullets.push(projectile);
          });
        }
      } else {
        const dangerOffsets = isFacelessSuperDifficulty() ? [-0.34, 0, 0.34] : [0];
        dangerOffsets.forEach(offset => {
          const shotAngle = angle + offset;
          const projectile = makeProjectile(
            'shooting-enemy-bullet shooting-danger-bullet',
            state.boss.x, state.boss.y + 38,
            Math.cos(shotAngle) * speed,
            Math.sin(shotAngle) * speed,
            999999
          );
          if (!projectile) return;

          // 最上級WARNING弾だけ壁反射を有効化。
          // 1・2回目は反射し、3回目の壁接触で消滅する。
          if (isFacelessSuperDifficulty()) {
            projectile.dangerRicochet = true;
            projectile.dangerWallHits = 0;
            projectile.dangerMaxReflections = 2;
          }
          state.enemyBullets.push(projectile);
        });
      }

      removeBossDangerWarning();
      state.bossDangerExecuteAt = 0;
      state.nextBossDangerAt = now + getBossDangerInterval();
      // 大技発射フレームでも通常攻撃を止めない。
      return false;
    }

    if (!state.nextBossDangerAt) {
      state.nextBossDangerAt = now + (isChapter04BossStage() ? Math.max(1000, Number(selectedStage?.dangerEveryMs || 10000) - 700) : 7200);
      return false;
    }

    if (now >= state.nextBossDangerAt) {
      state.bossDangerExecuteAt = now + (
        isChapter43BossStage()
          ? Number(getChapter43Config()?.warningTelegraphMs || 700)
          : (isChapter04BossStage() ? 700 : 1250)
      );
      showBossDangerWarning();
      // WARNING表示中も既存弾・通常射撃はそのまま継続する。
      return false;
    }

    return false;
  }

  // ============================================================
  // CHAPTER 04 BOSS - サキエル / beautiful_boss_v1
  // ============================================================
  // 描画負荷を抑えるため、弾DOMは既存makeProjectileを再利用し、
  // 軌道だけ数値更新する。blur/filter/追加DOMは使わない。
  // PHASE1: ゆったり螺旋
  // PHASE2: 規則的ウェーブ
  // PHASE3: 螺旋とウェーブを交互
  function fireBeautifulBoss(now) {
    if (!state || !BOSS) return;

    if (isChapter43BossStage()) {
      fireChapter43TenWay(now);
      return;
    }

    const phase = Math.max(1, Number(state.boss?.phase || 1));
    const ordinaryCount = state.enemyBullets.reduce((n, p) => {
      if (!p || !p.el || p.el.classList.contains('shooting-danger-bullet')) return n;
      return n + 1;
    }, 0);

    // 超軽量版の安全弁。WARNINGはhandleBossDangerAttackで先に処理されるため、
    // この上限に達しても危険攻撃は消えない。
    const softLimit = phase >= 3 ? 112 : 96;
    if (ordinaryCount >= softLimit) return;

    const curtainCfg = getChapter4CurtainConfig();
    const fireRate = curtainCfg ? Number(curtainCfg.intervalMs || 1280) : (phase === 1 ? 920 : phase === 2 ? 860 : 780);
    if (now - state.lastBossShotAt < getStageAdjustedEnemyFireInterval(fireRate)) return;
    state.lastBossShotAt = now;

    if (curtainCfg) {
      fireChapter4CurtainVolley(now, Number(BOSS.bulletDamage || 0), 'shooting-enemy-bullet shooting-sakiel-bullet');
      return;
    }

    const originX = Number(state.boss.x || 0);
    const originY = Number(state.boss.y || 0) + 38;
    state.beautifulBossPatternIndex = Number(state.beautifulBossPatternIndex || 0);
    const patternIndex = state.beautifulBossPatternIndex++;

    const addTone = (p, index) => {
      if (!p || !p.el) return p;
      p.el.classList.add(`shooting-beautiful-tone-${(index % 4) + 1}`);
      p.canvasTone = (index % 4) + 1;
      return p;
    };

    const spawnSpiral = (arms, reverse) => {
      // 「ゆったり」を優先。角速度は雑魚よりさらに低め。
      const radialSpeed = phase === 1 ? 142 : 154;
      const angularSpeed = (reverse ? -1 : 1) * (phase === 1 ? 0.34 : 0.42);
      const start = patternIndex * 0.44;
      for (let i = 0; i < arms; i++) {
        const a = start + Math.PI * 2 * i / arms;
        const p = makeProjectile(
          'shooting-enemy-bullet shooting-beautiful-bullet shooting-beautiful-spiral shooting-sakiel-bullet',
          originX, originY,
          Math.cos(a) * radialSpeed,
          Math.sin(a) * radialSpeed,
          BOSS.bulletDamage
        );
        if (!p) continue;
        addTone(p, i + patternIndex);
        p.beautifulSpiral = true;
        p.beautifulAge = 0;
        p.beautifulOriginX = originX;
        p.beautifulOriginY = originY;
        p.beautifulStartAngle = a;
        p.beautifulAngularSpeed = angularSpeed;
        p.beautifulRadialSpeed = radialSpeed;
        state.enemyBullets.push(p);
      }
    };

    const spawnWave = (count, reverse) => {
      const gap = phase >= 3 ? 20 : 22;
      const amp = phase >= 3 ? 28 : 24;
      const freq = phase >= 3 ? 3.15 : 2.75;
      const speed = phase >= 3 ? 188 : 178;
      const phaseBase = patternIndex * 1.37 + (reverse ? Math.PI : 0);
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * gap;
        const x = originX + offset;
        const p = makeProjectile(
          'shooting-enemy-bullet shooting-beautiful-bullet shooting-beautiful-wave shooting-sakiel-bullet',
          x, originY,
          0, speed,
          BOSS.bulletDamage
        );
        if (!p) continue;
        addTone(p, i + patternIndex);
        p.beautifulWave = true;
        p.beautifulAge = 0;
        p.beautifulWaveBaseX = x;
        p.beautifulWaveAmp = amp;
        p.beautifulWaveFreq = freq;
        p.beautifulWavePhase = phaseBase + i * 0.64;
        state.enemyBullets.push(p);
      }
    };

    if (phase === 1) {
      spawnSpiral(8, (patternIndex % 2) === 1);
    } else if (phase === 2) {
      spawnWave(9, (patternIndex % 2) === 1);
    } else if ((patternIndex % 2) === 0) {
      spawnSpiral(10, (patternIndex % 4) >= 2);
    } else {
      spawnWave(11, (patternIndex % 4) >= 2);
    }
  }

  function fireBoss(now) {
    if (isAmbushStage()) {
      fireAmbushBoss(now);
      return;
    }
    // CH04のITEM取得フェーズ中も通常弾幕/WARNINGは継続する。
    // 60秒生存後は、弾幕を潜りながらボス周囲のITEMを取りに行く。

    // WARNING攻撃は必ず先に処理する。レイド軽量化で危険攻撃を消さない。
    if (handleBossDangerAttack(now)) return;

    // DAILY RAID 段階別軽量化:
    // 通常弾だけを段階別soft limitで止める。
    // WARNING / danger攻撃はこの判定より先に処理済みなので維持される。
    if (isRaidStage()) {
      const raidLimits = getRaidEnemyBulletLimits();
      if (getRaidOrdinaryEnemyBulletCount() >= raidLimits.soft) {
        return;
      }
    }

    if (isScoreAttackStage()) {
      fireScoreAttack(now);
      return;
    }
    if (BOSS && BOSS.behavior === 'faceless_event_v1') {
      fireFacelessBoss(now);
      return;
    }
    if (BOSS && BOSS.behavior === 'violence_v1') {
      fireViolenceBoss(now);
      return;
    }
    if (BOSS && BOSS.behavior === 'barrage_v1') {
      fireBarrageBoss(now);
      return;
    }
    if (BOSS && BOSS.behavior === 'beautiful_boss_v1') {
      fireBeautifulBoss(now);
      return;
    }
    if (BOSS && BOSS.behavior === 'bullet_hell_test_v1') {
      fireBulletHellTest(now);
      return;
    }

    const phase = state.boss.phase || 1;

    // CHAPTER01-04 オーバーシア難易度調整:
    // WAVE1は従来維持。
    // WAVE2は旧WAVE1相当、WAVE3は旧WAVE2相当に1段階ずつ弱体化。
    // HP / ダメージ自体は変えず、弾数・連射間隔・弾速で避けやすくする。
    const fireRates = { 1: 760, 2: 760, 3: 560 };
    if (now - state.lastBossShotAt < getStageAdjustedEnemyFireInterval(fireRates[phase])) return;
    state.lastBossShotAt = now;

    const dx = state.player.x - state.boss.x;
    const dy = state.player.y - state.boss.y;
    const baseAngle = Math.atan2(dy, dx);
    const patterns = {
      1: [-0.22, 0, 0.22],
      2: [-0.22, 0, 0.22],
      3: [-0.34, -0.17, 0, 0.17, 0.34],
    };
    const speed = BOSS.bulletSpeed * (phase <= 2 ? 1 : 1.08);
    patterns[phase].forEach(offset => {
      const a = baseAngle + offset;
      state.enemyBullets.push(makeProjectile(
        'shooting-enemy-bullet',
        state.boss.x, state.boss.y + 42,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        BOSS.bulletDamage
      ));
    });

    // 旧WAVE3にだけ存在した追加の左右弾は撤廃。
    // 新WAVE3は旧WAVE2相当の5WAYまでに留める。
  }

  function updateBossPhase() {
    // SCORE ATTACKは1ゲージ固定の∞ボス。
    // 通常BOSS用の「3ゲージ→PHASE算出」を通すと、初撃でPHASE 3扱いになり
    // BREAK演出が発生するため、フェーズ更新自体を無効化する。
    if (!state || state.boss.hp <= 0 || isFacelessStage() || isAmbushStage() || isScoreAttackStage()) return;
    const previous = state.boss.phase || 1;
    const remainingGauges = Math.max(1, Math.ceil(state.boss.hp / state.boss.gaugeHp));
    const nextPhase = Math.max(1, Math.min(state.boss.gauges, state.boss.gauges - remainingGauges + 1));
    if (nextPhase !== previous) {
      state.boss.phase = nextPhase;
      beginBossPhaseBreak(nextPhase);
    }
  }

  function beginBossPhaseBreak(phase) {
    if (!state || state.ended || state.finishing) return;
    state.phaseTransition = true;
    removeBossDangerWarning();
    state.bossDangerExecuteAt = 0;
    // build841: phase開始時の弾幕初期位相も固定。
    if (state.boss) state.boss.patternTick = 0;
    state.bulletHellVolleyIndex = 0;
    state.chapter43VolleyIndex = 0;
    state.nextBossDangerAt = performance.now() + 4200;
    if (isChapter43BossStage()) {
      state.chapter43RhythmStep = 0;
      state.chapter43RhythmNextAt = performance.now() + 900;
    }
    state.lastBossShotAt = performance.now();
    state.lastShotAt = performance.now();
    clearProjectiles();
    if (isChapter43BossStage() && phase >= 2) {
      clearChapter43RestoreItem();
      clearChapter43SealCountdown();
      state.chapter43AttackSealed = false;
    }
    flashBossPhaseChange(phase);
    renderHud();

    const root = document.getElementById(ROOT_ID);
    if (root) root.classList.add('boss-phase-pause');

    setTimeout(() => {
      if (!state || state.ended || state.finishing) return;
      state.phaseTransition = false;
      state.lastBossShotAt = performance.now();
      state.lastShotAt = performance.now();
      if (root) root.classList.remove('boss-phase-pause');
      renderHud();
    }, 2000);
  }

  function clearEnemyBulletsOnly() {
    if (!state) return;
    const keep = [];
    state.enemyBullets.forEach(p => {
      if (isAmbushStage() && p && p.ambushPersistent && p.el && p.el.isConnected) {
        keep.push(p);
        return;
      }
      p && p.el && p.el.remove();
    });
    state.enemyBullets = keep;
  }

  function flashBossPhaseChange(phase) {
    const boss = document.getElementById(BOSS_ID);
    const root = document.getElementById(ROOT_ID);
    if (boss) {
      boss.classList.remove('phase-change');
      void boss.offsetWidth;
      boss.classList.add('phase-change');
      setTimeout(() => boss.classList.remove('phase-change'), 700);
    }
    if (root) {
      root.setAttribute('data-boss-phase', String(phase));
      root.classList.remove('boss-phase-flash');
      void root.offsetWidth;
      root.classList.add('boss-phase-flash');
      setTimeout(() => root.classList.remove('boss-phase-flash'), 650);
    }
  }

  function createMiaWaterHit(x, y, big) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const el = document.createElement('i');
    el.className = 'shooting-mia-water-hit' + (big ? ' big' : '');
    arena.appendChild(el);
    positionUnit(el, x, y);

    const core = document.createElement('b');
    core.className = 'core';
    el.appendChild(core);

    const ripple1 = document.createElement('u');
    ripple1.className = 'ripple ripple-1';
    el.appendChild(ripple1);

    const ripple2 = document.createElement('u');
    ripple2.className = 'ripple ripple-2';
    el.appendChild(ripple2);

    setTimeout(() => el.remove(), big ? 440 : 400);
  }

  function createHit(x, y, big) {
    if (state && state.nextHitEffect === 'mia_water') {
      state.nextHitEffect = null;
      createMiaWaterHit(x, y, big);
      return;
    }

    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const el = document.createElement('i');
    el.className = 'shooting-hit' + (big ? ' big' : '');
    arena.appendChild(el);
    positionUnit(el, x, y);
    setTimeout(() => el.remove(), 280);
  }

  const sustainedHitTimers = new WeakMap();

  // 連射時に毎回animationをリスタートすると点滅が追いつかず、
  // 「当たっているのか分からない」状態になるため、
  // 命中が続いている間はクラスを維持して連続パルスさせる。
  function sustainHitFeedback(el, durationMs = 130) {
    if (!el || !el.isConnected) return;

    if (!el.classList.contains('shooting-hit-sustained')) {
      el.classList.add('shooting-hit-sustained');
    }

    const oldTimer = sustainedHitTimers.get(el);
    if (oldTimer) clearTimeout(oldTimer);

    const timer = setTimeout(() => {
      if (el && el.isConnected) el.classList.remove('shooting-hit-sustained');
      sustainedHitTimers.delete(el);
    }, Math.max(90, Number(durationMs || 130)));

    sustainedHitTimers.set(el, timer);
  }

  function isMiaChargeProjectile(p) {
    return !!(p && p.el && p.el.classList && p.el.classList.contains('shooting-mia-charge-shot'));
  }

  function showDamageNumber(x, y, amount, kind = 'enemy', big = false, elementReaction = '') {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const value = Math.max(0, Math.round(Number(amount || 0)));
    const reaction = elementReaction === 'weak' || elementReaction === 'resist' || elementReaction === 'immune'
      ? elementReaction
      : '';
    // 0 DAMAGEでもIMMUNEだけは明示する。
    if (!value && reaction !== 'immune') return;
    const el = document.createElement('span');
    el.className =
      'shooting-damage-number ' +
      (kind === 'player' ? 'to-player' : 'to-enemy') +
      (big ? ' big' : '') +
      (reaction ? ' element-' + reaction : '');

    if (reaction) {
      const reactionEl = document.createElement('small');
      reactionEl.className = 'shooting-element-reaction';
      reactionEl.textContent = reaction === 'weak' ? 'Weak' : (reaction === 'immune' ? 'IMMUNE' : 'Resist');
      el.appendChild(reactionEl);
    }
    const valueEl = document.createElement('span');
    valueEl.className = 'shooting-damage-value';
    valueEl.textContent = String(value);
    el.appendChild(valueEl);

    // 同じ場所に数値が積み重ならないよう、命中位置周辺へランダム分散。
    const spreadX = kind === 'player' ? 38 : 52;
    const spreadY = kind === 'player' ? 28 : 40;
    const offsetX = (Math.random() - 0.5) * spreadX;
    const offsetY = -12 + (Math.random() - 0.5) * spreadY;

    arena.appendChild(el);
    positionUnit(el, Number(x || 0) + offsetX, Number(y || 0) + offsetY);

    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => el.classList.add('out'), big ? 620 : 460);
    setTimeout(() => el.remove(), big ? 900 : 720);
  }

  // ============================================================
  // DAILY RAID performance: hit visual throttling
  // ============================================================
  // レイドは長時間・高HPのため、通常弾1発ごとにHITエフェクト/数字/フラッシュを
  // DOM生成すると端末負荷が大きい。ゲーム上のダメージ・コンボ・ULT加算は一切
  // 間引かず、視覚演出だけ頻度制限する。
  function shouldRenderRaidBossHitVisual(now, kind = 'hit') {
    if (!state) return true;

    const scoreAttack = isScoreAttackStage();
    if (!isRaidStage() && !scoreAttack) return true;

    const t = Number(now || performance.now());

    // SCORE ATTACKは60秒間ずっとボスを殴り続けるため、
    // 命中判定・ダメージ・コンボ・ULT加算は全件処理しつつ、
    // DOM生成を伴うHIT/ダメージ数字だけ間引く。
    if (scoreAttack) {
      // SCORE ATTACKは命中感を残す。ただし60秒間の連射でDOMを増やしすぎないよう
      // HIT演出だけ約9fpsに間引く。ダメージ数字は非表示のままにして軽量化する。
      if (kind === 'number') return false;
      const last = Number(state.scoreAttackLastBossHitVisualAt || 0);
      if (t - last < 110) return false;
      state.scoreAttackLastBossHitVisualAt = t;
      return true;
    }

    const phase = Math.max(
      1,
      Math.min(3, Number(state.boss && state.boss.phase || 1))
    );

    if (kind === 'number') {
      const interval = phase === 1 ? 170 : phase === 2 ? 240 : 280;
      const last = Number(state.raidLastBossDamageNumberAt || 0);
      if (t - last < interval) return false;
      state.raidLastBossDamageNumberAt = t;
      return true;
    }

    const interval = phase === 1 ? 95 : phase === 2 ? 130 : 150;
    const last = Number(state.raidLastBossHitVisualAt || 0);
    if (t - last < interval) return false;
    state.raidLastBossHitVisualAt = t;
    return true;
  }

  function showBossDamageNumber(amount, big = false, elementReaction = '') {
    if (!state || !state.boss) return;
    if (isScoreAttackStage()) return;
    // 通常弾以外の継続攻撃/ULTも数字DOMを大量生成しない。
    if (isScoreAttackStage() && !big && !shouldRenderRaidBossHitVisual(performance.now(), 'number')) return;

    // CH06等のIMMUNEボスへ高速攻撃を当てた際、0/IMMUNEを1発ごとにDOM生成しない。
    // ダメージ判定そのものには触れず、表示だけ約9fpsに制限。
    if (!big && elementReaction === 'immune') {
      const now = performance.now();
      if (now < Number(state.bossImmuneNumberNextAt || 0)) return;
      state.bossImmuneNumberNextAt = now + 110;
    }
    showDamageNumber(state.boss.x, state.boss.y, amount, 'enemy', big, elementReaction);
  }

  function flashBossHit(big, visualAlreadyApproved = false) {
    const boss = document.getElementById(BOSS_ID);
    if (!boss) return;

    // SCORE ATTACKはDOMを増やさず、既存ボス要素のclassだけで命中発光させる。
    // 約9fpsに間引かれているため、通常射撃の全弾でfilterを再実行しない。
    if (isScoreAttackStage()) {
      if (!big) {
        if (!visualAlreadyApproved && !shouldRenderRaidBossHitVisual(performance.now(), 'hit')) return;

        // SCORE ATTACKでも通常ステージと同様に、既存ボス要素そのものを明確に反応させる。
        // DOMを増やさない sustained feedback + 短い専用glowを併用する。
        sustainHitFeedback(boss, 150);
        boss.classList.remove('hit-flash', 'score-attack-hit-glow');
        void boss.offsetWidth;
        boss.classList.add('hit-flash', 'score-attack-hit-glow');

        window.clearTimeout(boss.__scoreAttackHitGlowTimer);
        boss.__scoreAttackHitGlowTimer = window.setTimeout(() => {
          boss.classList.remove('hit-flash', 'score-attack-hit-glow');
        }, 180);
        return;
      }

      boss.classList.remove('score-attack-burst-glow');
      void boss.offsetWidth;
      boss.classList.add('score-attack-burst-glow');
      window.clearTimeout(boss.__scoreAttackBurstGlowTimer);
      boss.__scoreAttackBurstGlowTimer = window.setTimeout(() => {
        boss.classList.remove('score-attack-burst-glow');
      }, 420);
      return;
    }

    if (!big) {
      // SCORE ATTACKでは通常弾の外側ですでに視覚演出を間引いている箇所があるため、
      // 二重判定するとtimestamp更新直後にfalseになり、フラッシュが一切出なくなる。
      if (isScoreAttackStage() && !visualAlreadyApproved && !shouldRenderRaidBossHitVisual(performance.now(), 'hit')) return;

      sustainHitFeedback(boss, 150);

      if (isChapter43BossStage()) {
        boss.classList.remove('chapter43-hit-flash');
        void boss.offsetWidth;
        boss.classList.add('chapter43-hit-flash');
        window.clearTimeout(boss.__chapter43HitTimer);
        boss.__chapter43HitTimer = window.setTimeout(() => {
          boss.classList.remove('chapter43-hit-flash');
        }, 150);
      }

      // HP∞でも「攻撃が当たった」ことが明確に分かる専用グロー。
      // DOMを増やさず既存ボス要素のclassだけで光らせるので軽量。
      if (isScoreAttackStage()) {
        boss.classList.remove('score-attack-hit-glow');
        void boss.offsetWidth;
        boss.classList.add('score-attack-hit-glow');
        window.clearTimeout(boss.__scoreAttackHitGlowTimer);
        boss.__scoreAttackHitGlowTimer = window.setTimeout(() => {
          boss.classList.remove('score-attack-hit-glow');
        }, 170);
      }
      return;
    }

    // 大技だけは従来の強い単発フラッシュを残す。
    if (isChapter43BossStage()) {
      boss.classList.remove('chapter43-hit-flash');
      void boss.offsetWidth;
      boss.classList.add('chapter43-hit-flash');
      window.clearTimeout(boss.__chapter43HitTimer);
      boss.__chapter43HitTimer = window.setTimeout(() => boss.classList.remove('chapter43-hit-flash'), 260);
    }
    boss.classList.remove('burst-hit');
    void boss.offsetWidth;
    boss.classList.add('burst-hit');

    if (isScoreAttackStage()) {
      boss.classList.remove('score-attack-burst-glow');
      void boss.offsetWidth;
      boss.classList.add('score-attack-burst-glow');
      window.clearTimeout(boss.__scoreAttackBurstGlowTimer);
      boss.__scoreAttackBurstGlowTimer = window.setTimeout(() => {
        boss.classList.remove('score-attack-burst-glow');
      }, 420);
    }

    setTimeout(() => boss.classList.remove('burst-hit'), 420);
  }

  function updateMovement(dt, now, playerOnly = false) {
    const arena = document.getElementById('shooting-arena');
    const player = document.getElementById(PLAYER_ID);
    const boss = document.getElementById(BOSS_ID);
    if (!arena || !player || !boss) return;

    // arenaサイズは戦闘中ほぼ不変。毎フレームclientWidth/clientHeightを読まず、
    // touch入力と共有しているキャッシュを使う。resize時だけ更新される。
    const arenaInputRect = getArenaInputRect();
    const w = Number(arenaInputRect?.width || arena.clientWidth || 0);
    const h = Number(arenaInputRect?.height || arena.clientHeight || 0);
    if (isScoreAttackStage() && state) {
      state.scoreAttackArenaWidth = w;
      state.scoreAttackArenaHeight = h;
    }
    const c = getCurrentCharacter();
    // プレイヤーの中心座標を、バトルアリーナ全体まで移動可能にする。
    // 以前は敵の手前でY座標を止めていたため接触できなかった。
    const marginX = 26;
    const minY = 34;
    const maxY = h - 38;
    const chapter4Shrink = getChapter4ShrinkBounds(now, w);
    const dynamicMinX = marginX + Number(chapter4Shrink.left || 0);
    const dynamicMaxX = w - marginX - Number(chapter4Shrink.right || 0);

    if (pointerActive) {
      if (pointerIsTouch) {
        // build463:
        // スマホ操作は補間を一切入れない。
        // 指が1px動けばキャラも同じフレームで1px動く、完全1:1追従。
        state.player.x = pointerX;
        state.player.y = pointerY;
      } else {
        // PCマウスは従来の少し滑らかな追従を維持。
        state.player.x += (pointerX - state.player.x) * Math.min(1, dt * 18);
        state.player.y += (pointerY - state.player.y) * Math.min(1, dt * 18);
      }
    } else {
      let dx = 0, dy = 0;
      if (keys.ArrowLeft || keys.a || keys.A) dx -= 1;
      if (keys.ArrowRight || keys.d || keys.D) dx += 1;
      if (keys.ArrowUp || keys.w || keys.W) dy -= 1;
      if (keys.ArrowDown || keys.s || keys.S) dy += 1;
      if (dx || dy) {
        const l = Math.hypot(dx, dy) || 1;
        state.player.x += dx / l * c.moveSpeed * dt;
        state.player.y += dy / l * c.moveSpeed * dt;
      }
    }
    state.player.x = clamp(state.player.x, dynamicMinX, Math.max(dynamicMinX, dynamicMaxX));
    state.player.y = clamp(state.player.y, minY, maxY);

    // カウントダウン中は本当にプレイヤー移動だけ。
    // ボスAIをここで止めることで、START時に周期運動の位相がリセットされても
    // 「カクッ」と位置が飛んだように見えないようにする。
    if (playerOnly) {
      positionUnit(player, state.player.x, state.player.y);
      updateMitoCompanion();
      return;
    }

    const t = (now - state.startedAt) / 1000;
    const bossGrabbed = now < (state.bossGrabUntil || 0);
    const bossStunned = now < (state.bossStunUntil || 0);
    const bossGojoFrozen = now < Number(state.gojoPurpleBossFreezeUntil || 0);
    const bossBlackHolePulled = isEnemyPullFieldActive(now) || bossGojoFrozen;

    const applyBossStartBlend = (targetX, targetY) => {
      const startedAt = Number(state.bossMotionBlendStartedAt || 0);
      const duration = Math.max(1, Number(state.bossMotionBlendDurationMs || 420));
      if (!startedAt || now >= startedAt + duration) {
        return { x: targetX, y: targetY };
      }

      const raw = clamp((now - startedAt) / duration, 0, 1);
      // smoothstep: 開始/終了の速度を0寄りにして視覚的な段差をなくす。
      const eased = raw * raw * (3 - 2 * raw);
      return {
        x: Number(state.bossMotionBlendFromX || targetX) + (targetX - Number(state.bossMotionBlendFromX || targetX)) * eased,
        y: Number(state.bossMotionBlendFromY || targetY) + (targetY - Number(state.bossMotionBlendFromY || targetY)) * eased,
      };
    };

    // ブラックホール吸引中は大型BOSSの通常移動AIも停止。
    // これを止めないとフェイスレス等のAIが毎フレーム座標を上書きして
    // 吸引が見た目上ほぼ無効になっていた。
    if (!isNormalBattle() && !bossGrabbed && !bossStunned && !bossBlackHolePulled) {
      if (isNoahStage()) {
        // 理想郷：ノアは敵側センターライン上に鎮座し、一切巡回しない。
        state.boss.x = w * 0.5;
        state.boss.y = Math.max(70, h * 0.18);
      } else if (isChapter04BossStage()) {
        // サキエルは敵側中央に鎮座。プレイヤー追尾・左右移動をしない。
        state.boss.x = w * 0.5;
        // CH04 only: device-height based offset. About 2mm lower on common phone sizes,
        // clamped so the apparent position stays stable across short/tall screens.
        const ch04BossOffsetY = Math.min(8, Math.max(6, h * 0.009));
        state.boss.y = Math.max(64, h * 0.17 + ch04BossOffsetY);
      } else if (BOSS && BOSS.behavior === 'violence_v1') {
        // CH02-4 イリシュ: 小型化した代わりに、前進時は味方側の壁ギリギリまで一気に突進する。
        // 壁にめり込ませず、見た目上ボス下端が壁へ届く位置を端末サイズから毎回計算する。
        const cycleMs = 9200;
        const approachMs = 620;  // ドン：壁際まで一気に突進
        const initialDashDelayMs = 2600; // 開始直後は突進しない。少し間を置いて初回突進。
        const battleElapsedMs = Math.max(0, now - Number(state.startedAt || now));
        const cycleAt = battleElapsedMs < initialDashDelayMs
          ? -1
          : (((battleElapsedMs - initialDashDelayMs) % cycleMs) + cycleMs) % cycleMs;

        const restY = Math.max(60, h * .17);
        const violenceScale = Math.max(.1, Number(BOSS.uiScale || 1));
        const bossVisualHalfH = Math.max(48, ((boss && boss.offsetHeight) || 128) * violenceScale * .5);
        const pressY = Math.max(restY + 120, h - bossVisualHalfH - 4);

        // 横は軽くプレイヤー側へ寄るだけ。追尾し続ける動きにはしない。
        const targetX = clamp(w * .5 + (state.player.x - w * .5) * .22, 58, w - 58);
        const followX = .014;
        state.boss.x += (targetX - state.boss.x) * Math.min(1, followX * 60 * dt);

        if (cycleAt >= 0 && cycleAt < approachMs) {
          // ドン：短時間で壁際へ。滞在フェーズは一切作らない。
          const p = clamp(cycleAt / approachMs, 0, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          state.boss.y = restY + (pressY - restY) * eased;
        } else {
          // パッ：突進終了フレームで後方位置へ即座に戻す。
          // 後退アニメーションも壁際滞在も行わない。
          state.boss.y = restY;
        }

        // 小さな左右揺れで静止感を消す。Yは壁際の突進上限まで許可する。
        state.boss.x = clamp(state.boss.x + Math.sin(t * .95) * .45, 54, w - 54);
        state.boss.y = clamp(state.boss.y, 56, pressY);
      } else if (BOSS && BOSS.behavior === 'barrage_v1') {
        const phase = state.boss.phase || 1;
        const xAmp = phase === 1 ? w * 0.22 : phase === 2 ? w * 0.28 : w * 0.32;
        const centerFollow = phase === 3 ? 0.18 : 0.10;
        const playerInfluence = (state.player.x - w * 0.5) * centerFollow;
        const targetX = clamp(w * 0.5 + playerInfluence + Math.sin(t * (0.86 + phase * 0.08)) * xAmp, 56, w - 56);
        const targetY = Math.max(58, h * (phase === 3 ? 0.16 : 0.18) + Math.sin(t * (1.35 + phase * 0.18)) * (phase === 3 ? 18 : 12));
        const blended = applyBossStartBlend(targetX, targetY);
        state.boss.x = blended.x;
        state.boss.y = blended.y;
      } else {
        const targetX = w * 0.5 + Math.sin(t * 0.92) * w * 0.30;
        const targetY = Math.max(56, h * 0.17 + Math.sin(t * 1.7) * 12);
        const blended = applyBossStartBlend(targetX, targetY);
        state.boss.x = blended.x;
        state.boss.y = blended.y;
      }
    }

    // ノアだけは掴み/スタン/吸引の状態に関係なく座標を最終固定する。
    if (isNoahStage() && !isNormalBattle()) {
      state.boss.x = w * 0.5;
      state.boss.y = Math.max(70, h * 0.18);
    }

    positionUnit(player, state.player.x, state.player.y);
    if (boss && !isNormalBattle()) positionUnit(boss, state.boss.x, state.boss.y);
  }

  // build551: 同一フレームのarena/player/core/boss矩形を一括で読み、
  // contact判定とprojectile判定で共有する。DOM書き込みの間に
  // getBoundingClientRect()を挟むlayout thrashingを減らす。
  function captureCombatFrameLayout() {
    const arena = document.getElementById('shooting-arena');
    const player = document.getElementById(PLAYER_ID);
    const playerCore = document.getElementById('shooting-player-core');
    const boss = document.getElementById(BOSS_ID);
    if (!arena || !player || !playerCore) return null;
    if (!isNormalBattle() && !boss) return null;

    // 読み取りは連続して行う。ここより後は同じフレーム内で再読込しない。
    const arenaRect = arena.getBoundingClientRect();
    const playerRect = player.getBoundingClientRect();
    const playerCoreRect = playerCore.getBoundingClientRect();
    const bossRect = boss && !isNormalBattle() ? boss.getBoundingClientRect() : null;

    return {
      arena, player, playerCore, boss,
      arenaRect, playerRect, playerCoreRect, bossRect,
      width: Number(arenaRect.width || 0),
      height: Number(arenaRect.height || 0)
    };
  }

  function updateProjectiles(dt, now, frameLayout = null) {
    // 通常は何もしない。弾が異常増殖した時だけ、当たり判定を回す前に負荷を戻す。
    enforceEnemyBulletSafetyLimit(now);
    enforcePlayerBulletSafetyLimit(now);
    syncShiinaLightRingVisual(now);

    const layout = frameLayout || captureCombatFrameLayout();
    if (!layout) return;
    const { arena, boss, player, playerCore, bossRect, playerCoreRect, playerRect, arenaRect } = layout;
    const w = Number(layout.width || arenaRect.width || 0);
    const h = Number(layout.height || arenaRect.height || 0);

    // filter中にstate.bulletsへ直接pushすると、filter完了時の再代入で分裂弾が消える。
    // 着弾中に生成したCLUSTER分裂弾を一旦キューへ積み、filter後に追加する。
    const spawnedPlayerBullets = [];
    state.bullets = state.bullets.filter(p => {
      if (!p || !p.el) return false;
      const projectilePrevX = Number(p.x || 0);
      const projectilePrevY = Number(p.y || 0);
      if (p.kind === 'arno_orbit_forward') {
        updateArnoOrbitProjectile(p, dt);
      } else if (p.kind === 'wolf_j_homing') {
        updateWolfJHomingProjectile(p, dt, now);
      } else if (p.kind === 'generic_homing') {
        updateGenericHomingProjectile(p, dt);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      if (p.kind === 'generic_splash' || p.kind === 'generic_bomb') {
        positionGenericBombProjectile(p, now);
      } else {
        positionUnit(p.el, p.x, p.y);
      }

      // J字の折り返し中は当たり判定を開始しない。
      // 標的直下へ収束してから通常の着弾判定へ入る。
      if (p.kind === 'wolf_j_homing' && !p.wolfCanHit) return true;

      if (p.kind === 'rose_heart') {
        if (p.y < -30 || p.y > h + 30 || p.x < -30 || p.x > w + 30 || now >= Number(p.expireAt || 0)) {
          p.el.remove();
          return false;
        }

        const r = getUnitRect(p, arenaRect);

        // 味方(現状はアクティブなプレイヤー)に当たると回復。
        if (rectsHit(r, playerRect, 0, 4)) {
          healRoseActiveCharacter(p.healMaxHpRate || 0.05);
          p.el.remove();
          return false;
        }

        // 敵に当たるとロゼATK参照のダメージ。
        // この分岐は通常弾のコンボ/ULT加算処理へ進まないため、
        // ハートによるダメージではULTゲージを一切増やさない。
        const hitBossHeart = !isNormalBattle() && bossRect && rectsHit(r, bossRect, 0, 16);
        const hitNormalHeart = (isNormalBattle() || hasBossAdds())
          ? state.normalEnemies.find(enemy => enemy && enemy.el && enemy.hp > 0 && rectsHit(r, getUnitRect(enemy, arenaRect), 0, 10))
          : null;

        if (hitBossHeart || hitNormalHeart) {
          const rose = getBattleCharacter(CHARACTER_ID.ROSE);
          const heartDamage =
            Number(rose?.atk || 0) *
            Number(rose?.flowerHeartDamageAtkRate || 0.30);

          if (hitNormalHeart) {
            damageNormalEnemy(hitNormalHeart, applyHitComboDamage(heartDamage), now, false);
            state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
          } else if (hitBossHeart && state.boss) {
            const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(heartDamage || 0)));
            state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
            updateBossPhase();
            if (shouldRenderRaidBossHitVisual(now, 'hit')) {
              createHit(p.x, p.y, false);
              flashBossHit(false, true);
            }
            if (shouldRenderRaidBossHitVisual(now, 'number')) {
              showBossDamageNumber(appliedDamage, false);
            }
            if (state.boss.hp <= 0) beginBossDefeat();
          }

          // noComboGain / noUltGain を明示しているが、
          // そもそもこの専用分岐でreturnするため通常のゲージ加算処理には入らない。
          p.noComboGain = true;
          p.noUltGain = true;
          p.el.remove();
          return false;
        }
        return true;
      }

      if (p.kind === 'bomb_fragment' && now >= Number(p.bombExpireAt || 0)) {
        p.el.remove();
        return false;
      }
      if (p.y < -20 || p.x < -20 || p.x > w + 20 || (p.kind === 'bomb_fragment' && p.y > h + 20)) {
        p.el.remove();
        return false;
      }
      const r = getUnitRect(p, arenaRect);

      // CH06遮断壁：通常Projectileはここで止まる。Shotgun(pierce)だけはそのまま奥へ進む。
      const chapter6BarrierTarget = findChapter6BarrierCollision(r, arenaRect, p);
      if (chapter6BarrierTarget) {
        const renderBarrierImpact = pulseChapter6Barrier(chapter6BarrierTarget);
        if (p.pierce) {
          if (p.piercedTargets) p.piercedTargets.add(chapter6BarrierTarget);
        } else {
          // 壁への当たり判定・弾消滅は全弾維持。CLUSTERは壁面着弾でも分裂する。
          if (p.kind === 'generic_splash') {
            splitBombAtImpact(
              p,
              Number(p.x || chapter6BarrierTarget.x || 0),
              Number(p.y || chapter6BarrierTarget.y || 0),
              now,
              spawnedPlayerBullets,
              chapter6BarrierTarget
            );
          } else if (p.kind === 'generic_bomb') {
            createGenericBombExplosionEffect(
              Number(p.x || chapter6BarrierTarget.x || 0),
              Number(p.y || chapter6BarrierTarget.y || 0),
              p.attackElement,
              p.splashRadius,
              p.bombSize
            );
          } else if (renderBarrierImpact) {
            createHit(Number(p.x || chapter6BarrierTarget.x || 0), Number(p.y || chapter6BarrierTarget.y || 0), false);
          }
          p.el.remove();
          return false;
        }
      }

      let normalTarget = null;
      let normalTargets = null;
      // FACELESSの仮面は物理的な遮蔽物。
      // 非貫通弾は仮面に触れた時点でそこで消え、同じフレームでBOSSへ抜けない。
      // 高速弾のすり抜け防止のため、現在位置だけでなく移動線分でも最初に交差した仮面を拾う。
      let facelessObjectTarget = null;
      if (isFacelessStage()) {
        facelessObjectTarget = findFacelessMaskProjectileCollision(
          p,
          projectilePrevX, projectilePrevY,
          Number(p.x || 0), Number(p.y || 0)
        );
      } else if (isAmbushStage()) {
        facelessObjectTarget = (state.facelessObjects || []).find(obj => {
          if (!obj || !obj.el || obj.hp <= 0) return false;
          if (p.pierce && p.piercedTargets && p.piercedTargets.has(obj)) return false;
          const targetRect = obj.ambushMinion
            ? getAmbushMinionHitRect(obj, arenaRect)
            : getUnitRect(obj, arenaRect);
          return !!targetRect && rectsHit(r, targetRect, 0, obj.ambushMinion ? 14 : 12);
        }) || null;
      }
      if (facelessObjectTarget && p.bombIgnoreTarget === facelessObjectTarget) {
        facelessObjectTarget = null;
      }
      const hitBoss = !facelessObjectTarget &&
        !isNormalBattle() &&
        bossRect &&
        p.bombIgnoreTarget !== state.boss &&
        !(p.pierce && p.piercedTargets && state.boss && p.piercedTargets.has(state.boss)) &&
        rectsHit(r, bossRect, 0, 22);

      if (isNormalBattle() || hasBossAdds()) {
        const blackHoleMultiHit =
          state.eltenaBlackHole &&
          state.eltenaBlackHole.phase === 'active' &&
          now < Number(state.eltenaBlackHole.activeUntil || 0);

        if (p.pierce) {
          // 貫通弾は同じ敵へ多重ヒットさせず、射線上の未命中ターゲットをすべて拾う。
          normalTargets = state.normalEnemies.filter(enemy =>
            enemy && enemy.el && enemy.hp > 0 &&
            p.bombIgnoreTarget !== enemy &&
            !(p.piercedTargets && p.piercedTargets.has(enemy)) &&
            rectsHit(r, getUnitRect(enemy, arenaRect), 0, 13)
          );
          normalTarget = normalTargets[0] || null;
        } else if (blackHoleMultiHit) {
          // エルテナULT中だけ、同じ弾判定に重なっている敵を全件取得する。
          // 離れた敵を貫通するのではなく、ブラックホールで密集した敵群への同時ヒット。
          normalTargets = state.normalEnemies.filter(enemy =>
            enemy && enemy.el && enemy.hp > 0 &&
            p.bombIgnoreTarget !== enemy &&
            rectsHit(r, getUnitRect(enemy, arenaRect), 0, 13)
          );
          normalTarget = normalTargets[0] || null;
        } else {
          // 通常時は従来どおり、1発につき最初に当たった敵1体だけ。
          normalTarget = state.normalEnemies.find(enemy =>
            enemy && enemy.el && enemy.hp > 0 &&
            p.bombIgnoreTarget !== enemy &&
            rectsHit(r, getUnitRect(enemy, arenaRect), 0, 13)
          );
        }
      }

      if (facelessObjectTarget || normalTarget || hitBoss) {
        const ownerId = p.ownerId || state.activeCharacterId;
        const chara = getBattleCharacter(ownerId) || getCurrentCharacter();
        const member = getPartyMember(ownerId) || getActiveMember();

        let hitCount = 1;

        if (facelessObjectTarget) {
          if (p.pierce && p.piercedTargets) p.piercedTargets.add(facelessObjectTarget);
          if (isMiaChargeProjectile(p)) state.nextHitEffect = 'mia_water';
          const attackElement = normalizeCombatElement(
            p.attackElement || p.element || chara.element
          );
          const targetElement = getCombatTargetElement(
            facelessObjectTarget,
            state.boss?.element
          );
          const finalDamage = applyElementDamage(p.damage, attackElement, targetElement);
          const appliedObjectDamage = damageFacelessObject(facelessObjectTarget, finalDamage, now, getElementDamageReaction(attackElement, targetElement));
          hitCount = appliedObjectDamage > 0 ? 1 : 0;
          if (p.kind === 'generic_splash') {
            splitBombAtImpact(
              p,
              Number(facelessObjectTarget.x || p.x),
              Number(facelessObjectTarget.y || p.y),
              now,
              spawnedPlayerBullets,
              facelessObjectTarget
            );
          } else if (p.kind === 'generic_bomb') {
            const ix = Number(facelessObjectTarget.x || p.x);
            const iy = Number(facelessObjectTarget.y || p.y);
            createGenericBombExplosionEffect(ix, iy, attackElement, p.splashRadius, p.bombSize);
            hitCount += applyGenericBombSplashDamage(p, ix, iy, now, chara, facelessObjectTarget);
          }
          addLegacyCombatScore(80);
        } else if (normalTarget) {
          const targetsToDamage =
            Array.isArray(normalTargets) && normalTargets.length
              ? normalTargets
              : [normalTarget];
          const attackElement = normalizeCombatElement(
            p.attackElement || p.element || chara.element
          );

          hitCount = 0;

          targetsToDamage.forEach(enemy => {
            if (p.pierce && p.piercedTargets) p.piercedTargets.add(enemy);
            if (isMiaChargeProjectile(p)) state.nextHitEffect = 'mia_water';
            const targetElement = getCombatTargetElement(enemy);
            const finalDamage = applyElementDamage(p.damage, attackElement, targetElement);
            const appliedEnemyDamage = damageNormalEnemy(enemy, finalDamage, now, false, getElementDamageReaction(attackElement, targetElement));
            if (appliedEnemyDamage > 0) hitCount++;
          });

          if (p.kind === 'lightning_chain' && normalTarget) {
            applyLightningChain(p, normalTarget, now, chara, ownerId);
          }

          if (p.kind === 'generic_splash' && normalTarget) {
            // CLUSTER: 着弾点から4/6/8方向へ50%弾を分裂させる。
            splitBombAtImpact(
              p,
              Number(normalTarget.x || p.x),
              Number(normalTarget.y || p.y),
              now,
              spawnedPlayerBullets,
              normalTarget
            );
          } else if (p.kind === 'generic_bomb' && normalTarget) {
            const ix = Number(normalTarget.x || p.x);
            const iy = Number(normalTarget.y || p.y);
            createGenericBombExplosionEffect(ix, iy, attackElement, p.splashRadius, p.bombSize);
            hitCount += applyGenericBombSplashDamage(p, ix, iy, now, chara, normalTarget);
          }

          state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
        } else {
          if (p.pierce && p.piercedTargets && state.boss) p.piercedTargets.add(state.boss);
          const attackElement = normalizeCombatElement(
            p.attackElement || p.element || chara.element
          );
          const targetElement = getCombatTargetElement(state.boss);
          const elementAdjustedDamage = applyElementDamage(
            p.damage,
            attackElement,
            targetElement
          );
          const appliedDamage = Math.min(
            state.boss.hp,
            Math.max(0, Number(elementAdjustedDamage || 0))
          );
          state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
          updateBossPhase();
          if (!addScoreAttackDamageScore(appliedDamage)) {
            addLegacyCombatScore(120);
          }
          hitCount = appliedDamage > 0 ? 1 : 0;
          if (p.kind === 'lightning_chain' && state.boss) {
            applyLightningChain(p, state.boss, now, chara, ownerId);
          }
          if (p.kind === 'generic_splash') {
            splitBombAtImpact(
              p,
              Number(p.x || state.boss.x || 0),
              Number(p.y || state.boss.y || 0),
              now,
              spawnedPlayerBullets,
              state.boss
            );
          } else if (p.kind === 'generic_bomb') {
            const ix = Number(p.x || state.boss.x || 0);
            const iy = Number(p.y || state.boss.y || 0);
            createGenericBombExplosionEffect(ix, iy, attackElement, p.splashRadius, p.bombSize);
            hitCount += applyGenericBombSplashDamage(p, ix, iy, now, chara, state.boss);
          }
          // DAILY RAIDでは実ダメージ処理は全弾そのまま。
          // DOM負荷の大きいHIT演出/数字/flashだけ頻度制限する。
          if (isAmbushStage()) {
            // 乱入ボスは通常弾1発ごとに既存DOMを発光させる。
            // HITリングはDOM増加を抑えるため約80msに1回だけ。
            sustainHitFeedback(document.getElementById(BOSS_ID), 165);
            const bossEl = document.getElementById(BOSS_ID);
            if (bossEl) bossEl.dataset.ambushHit = '1';
            if (now - Number(state.ambushLastHitRingAt || 0) >= 80) {
              state.ambushLastHitRingAt = now;
              if (isMiaChargeProjectile(p)) {
                createMiaWaterHit(p.x, p.y, false);
              } else {
                createHit(p.x, p.y, false);
              }
            }
          } else if (shouldRenderRaidBossHitVisual(now, 'hit')) {
            if (isMiaChargeProjectile(p)) {
              createMiaWaterHit(p.x, p.y, false);
            } else {
              createHit(p.x, p.y, false);
            }
            flashBossHit(false, true);
          }
          if (shouldRenderRaidBossHitVisual(now, 'number')) {
            showBossDamageNumber(appliedDamage, false, getElementDamageReaction(attackElement, targetElement));
          }
          if (state.boss.hp <= 0) beginBossDefeat();
        }

        state.shotsHit += hitCount;

        if (!p.noComboGain) {
          for (let i = 0; i < hitCount; i++) {
            registerComboHit(ownerId, now);
          }
        }

        if (!p.noUltGain) {
          const projectileUltGainMultiplier = Number.isFinite(Number(p.ultGainMultiplier))
            ? Number(p.ultGainMultiplier)
            : 1;
          grantUltGaugeForHits(chara, hitCount, ownerId, projectileUltGainMultiplier);
        }

        if (p.pierce) {
          // 貫通弾は命中後も残し、次の未命中ターゲットへ進む。
          return true;
        }
        p.el.remove();
        return false;
      }
      return true;
    });
    if (spawnedPlayerBullets.length) {
      state.bullets.push(...spawnedPlayerBullets);
    }

    const enemyViewportScale = getEnemyProjectileViewportScale(w, h);
    const enemyMoveScaleX = Number(enemyViewportScale.x || 1);
    const enemyMoveScaleY = Number(enemyViewportScale.y || 1);

    state.enemyBullets = state.enemyBullets.filter(p => {
      if (!p || !p.el) return false;

      // トイフェルULT中：敵弾は通常の移動・当たり判定を行わず、
      // 現在位置に近い左右どちらかのブラックホールへ吸収される。
      if (isToyfelBlackHoleFieldActive(now)) {
        const field = state.toyfelBlackHoleField;
        const holes = Array.isArray(field?.holes) ? field.holes : [];
        if (holes.length) {
          let targetHole = holes[0];
          let bestDist = Infinity;
          holes.forEach(hole => {
            const d = Math.hypot(
              Number(hole.x || 0) - Number(p.x || 0),
              Number(hole.y || 0) - Number(p.y || 0)
            );
            if (d < bestDist) {
              bestDist = d;
              targetHole = hole;
            }
          });

          const dx = Number(targetHole.x || 0) - Number(p.x || 0);
          const dy = Number(targetHole.y || 0) - Number(p.y || 0);
          const dist = Math.max(.001, Math.hypot(dx, dy));
          const absorbRadius = Math.max(8, Number(field.absorbRadius || 28));

          if (dist <= absorbRadius) {
            try { p.el.remove(); } catch (_) {}
            return false;
          }

          // build766: ブラックホールへ一瞬で吸い切らず、
          // 遠距離ではゆっくり、中心付近で少し加速する吸引に変更。
          // これにより「敵弾が吸い込まれている」見た目を保つ。
          const maxSpeed = Math.max(180, Number(field.absorbSpeed || 320));
          const minSpeed = Math.max(78, maxSpeed * 0.34);
          const influenceRadius = Math.max(absorbRadius + 1, arena.clientWidth * 0.36);
          const proximity = 1 - clamp((dist - absorbRadius) / Math.max(1, influenceRadius - absorbRadius), 0, 1);
          const eased = proximity * proximity * (3 - 2 * proximity);
          const bulletSpeed = Math.hypot(Number(p.vx || 0), Number(p.vy || 0));
          const speed = Math.max(
            minSpeed + (maxSpeed - minSpeed) * eased,
            Math.min(maxSpeed * 0.72, bulletSpeed * 0.88)
          );
          const step = Math.min(dist, speed * dt);
          p.x += dx / dist * step;
          p.y += dy / dist * step;
          p.vx = dx / dist * speed;
          p.vy = dy / dist * speed;
          p.el.style.opacity = `${0.92 - proximity * 0.34}`;
          p.el.style.filter = `blur(${(0.3 + proximity * 1.15).toFixed(2)}px)`;

          if (!p.canvasRendered) positionUnit(p.el, p.x, p.y);
          return true;
        }
      }

      const moveDt = dt * getShiinaEnemyBulletSpeedMultiplier(p, now);

      // CH04の▼弾。ゆるく横揺れしながら落下する。
      if (p.chapter4CurtainDrift) {
        p.chapter4CurtainAge = Number(p.chapter4CurtainAge || 0) + moveDt;
        p.y += p.vy * moveDt * enemyMoveScaleY;
        p.x = Number(p.chapter4CurtainBaseX || p.x) +
          Math.sin(p.chapter4CurtainAge * Number(p.chapter4CurtainFreq || 2.1) + Number(p.chapter4CurtainPhase || 0)) *
          Number(p.chapter4CurtainAmp || 12) * enemyMoveScaleX;
      }

      // サキエルのWARNING弾。5秒間だけゆっくり揺れながら漂い、壁反射せずに消える。
      if (p.sakielWarningDrift) {
        if (now >= Number(p.sakielWarningExpireAt || 0)) {
          p.el.remove();
          return false;
        }
        p.sakielWarningAge = Number(p.sakielWarningAge || 0) + moveDt;
        const age = p.sakielWarningAge;
        const base = Number(p.sakielWarningBaseHeading || Math.atan2(p.vy, p.vx));
        const amp = Number(p.sakielWarningTurnAmp || 0.42);
        const phase = Number(p.sakielWarningPhase || 0);
        const heading = base + Math.sin(age * 1.35 + phase) * amp;
        const driftSpeed = Number(p.sakielWarningSpeed || 98);
        p.vx = Math.cos(heading) * driftSpeed;
        p.vy = Math.sin(heading) * driftSpeed;
      }

      // リヴィアの漂流即死弾。8秒で消え、ゆるく蛇行しながら戦場内を漂う。
      if (p.dangerDrift) {
        if (now >= Number(p.dangerExpireAt || 0)) {
          p.el.remove();
          return false;
        }
        p.dangerDriftAge = Number(p.dangerDriftAge || 0) + moveDt;
        const age = p.dangerDriftAge;
        const phase = Number(p.dangerDriftPhase || 0);
        const turnRate = Number(p.dangerDriftTurnRate || 0.78);
        const wobble =
          Math.sin(age * 1.35 + phase) * 0.86 +
          Math.sin(age * 2.15 + phase * 1.37) * 0.34;
        p.dangerDriftHeading = Number(p.dangerDriftHeading || Math.atan2(p.vy, p.vx)) + wobble * turnRate * moveDt;
        const driftSpeed = Number(p.dangerDriftSpeed || 138);
        p.vx = Math.cos(p.dangerDriftHeading) * driftSpeed;
        p.vy = Math.sin(p.dangerDriftHeading) * driftSpeed;
      }

      // CH04専用の美麗弾道。
      // spiral: 発射点から半径を増やしつつ回転するアルキメデス螺旋。
      // wave:    下方向へ進みながらX座標だけを正弦波で揺らす。
      if (p.beautifulSpiral) {
        p.beautifulAge = Number(p.beautifulAge || 0) + moveDt;
        const age = p.beautifulAge;
        const radius = Number(p.beautifulRadialSpeed || 180) * age;
        const angle = Number(p.beautifulStartAngle || 0) + Number(p.beautifulAngularSpeed || 1.2) * age;
        p.x = Number(p.beautifulOriginX || 0) + Math.cos(angle) * radius * enemyMoveScaleX;
        p.y = Number(p.beautifulOriginY || 0) + Math.sin(angle) * radius * enemyMoveScaleY;
      } else if (p.beautifulWave) {
        p.beautifulAge = Number(p.beautifulAge || 0) + moveDt;
        p.y += p.vy * moveDt * enemyMoveScaleY;
        p.x = Number(p.beautifulWaveBaseX || p.x) +
          Math.sin(p.beautifulAge * Number(p.beautifulWaveFreq || 4.2) + Number(p.beautifulWavePhase || 0)) *
          Number(p.beautifulWaveAmp || 18) * enemyMoveScaleX;
      } else {
        p.x += p.vx * dt * enemyMoveScaleX;
        p.y += p.vy * moveDt * enemyMoveScaleY;
      }

      // リヴィアの漂流弾は8秒間フィールド内に残すため、壁では消さずに反射する。
      if (p.dangerDrift) {
        const margin = 10;
        const hitLeft = p.x <= margin;
        const hitRight = p.x >= w - margin;
        const hitTop = p.y <= margin;
        const hitBottom = p.y >= h - margin;
        if (hitLeft || hitRight || hitTop || hitBottom) {
          if (hitLeft || hitRight) p.vx *= -1;
          if (hitTop || hitBottom) p.vy *= -1;
          p.x = Math.min(w - margin, Math.max(margin, p.x));
          p.y = Math.min(h - margin, Math.max(margin, p.y));
          p.dangerDriftHeading = Math.atan2(p.vy, p.vx);
        }
      }

      // 乱入WARNING弾: WAVE1は4回反射後に消滅、WAVE2は無限反射。
      if (p.ambushBounce) {
        const margin = 11;
        const hitLeft = p.x <= margin;
        const hitRight = p.x >= w - margin;
        const hitTop = p.y <= margin;
        const hitBottom = p.y >= h - margin;
        if (hitLeft || hitRight || hitTop || hitBottom) {
          if (hitLeft || hitRight) p.vx *= -1;
          if (hitTop || hitBottom) p.vy *= -1;
          p.x = Math.min(w-margin,Math.max(margin,p.x));
          p.y = Math.min(h-margin,Math.max(margin,p.y));
          p.ambushBounceCount = Number(p.ambushBounceCount || 0) + 1;
          if (!p.ambushPersistent && p.ambushBounceCount > Number(p.ambushBounceMax || 4)) {
            p.el.remove();
            return false;
          }
        }
      }

      // SCORE ATTACK HARDのWARNING大玉：壁接触を数え、3回目で消滅。
      if (p.scoreAttackWarningBounceMax) {
        const margin = 16;
        const hitLeft = p.x <= margin;
        const hitRight = p.x >= w - margin;
        const hitTop = p.y <= margin;
        const hitBottom = p.y >= h - margin;
        const touchedWall = hitLeft || hitRight || hitTop || hitBottom;
        if (touchedWall) {
          p.scoreAttackWarningBounceCount = Number(p.scoreAttackWarningBounceCount || 0) + 1;
          if (p.scoreAttackWarningBounceCount >= Number(p.scoreAttackWarningBounceMax || 3)) {
            p.el.remove();
            return false;
          }
          if (hitLeft || hitRight) p.vx *= -1;
          if (hitTop || hitBottom) p.vy *= -1;
          p.x = Math.min(w - margin, Math.max(margin, p.x));
          p.y = Math.min(h - margin, Math.max(margin, p.y));
        }
      }

      // 最上級のWARNING危険弾はアリーナ壁で跳ね返る。
      // 1回目・2回目は反射、3回目の壁接触で消滅。
      if (p.dangerRicochet && !p.scoreAttackWarningBounceMax) {
        const margin = 7;
        const hitLeft = p.x <= margin;
        const hitRight = p.x >= w - margin;
        const hitTop = p.y <= margin;
        const hitBottom = p.y >= h - margin;
        const touchedWall = hitLeft || hitRight || hitTop || hitBottom;

        if (touchedWall) {
          p.dangerWallHits = Number(p.dangerWallHits || 0) + 1;
          if (p.dangerWallHits > Number(p.dangerMaxReflections || 2)) {
            p.el.remove();
            return false;
          }

          // 角ヒットは1回の壁接触として数えつつ、両軸を反転する。
          if (hitLeft || hitRight) p.vx *= -1;
          if (hitTop || hitBottom) p.vy *= -1;
          p.x = Math.min(w - margin, Math.max(margin, p.x));
          p.y = Math.min(h - margin, Math.max(margin, p.y));
          p.el.classList.remove('ricochet');
          void p.el.offsetWidth;
          p.el.classList.add('ricochet');
        }
      }

      // Canvas弾は座標データ自体が表示位置なので、DOM用style更新は不要。
      if (!p.canvasRendered) positionUnit(p.el, p.x, p.y);
      const offscreenMargin = isChapter03BossStage() ? 10 : 30;
      if (!p.dangerRicochet && !p.dangerDrift && !p.ambushBounce && (p.y > h + offscreenMargin || p.x < -offscreenMargin || p.x > w + offscreenMargin || p.y < -offscreenMargin)) { p.el.remove(); return false; }
      const r = getUnitRect(p, arenaRect);

      // ミトULT召喚獣は独立したHP付きユニットとして敵弾を受ける。
      if (tryDamageMitoSummonFromEnemyBullet(p, arenaRect, now)) {
        p.el.remove();
        return false;
      }

      // ロゼULTの花は、効果時間中「壁」として敵弾を遮断する。
      // 花自体にはHPを持たせず、敵弾は接触した時点で消滅。
      const roseFlower = state.roseFlower;
      if (roseFlower && roseFlower.el && roseFlower.el.isConnected) {
        const flowerRect = getUnitRect(roseFlower, arenaRect);
        if (rectsHit(r, flowerRect, 0, 28)) {
          p.el.remove();
          return false;
        }
      }

      const hitDecoy = (state.clarineDecoys || []).find(decoy =>
        decoy && decoy.el && rectsHit(r, getUnitRect(decoy, arenaRect), 12, 8)
      );
      if (hitDecoy) {
        const c = getClarineDecoyConfig();
        hitDecoy.hp = Math.max(0, hitDecoy.hp - Number(p.damage || 0));
        if (hitDecoy.el) {
          hitDecoy.el.classList.remove('hit');
          void hitDecoy.el.offsetWidth;
          hitDecoy.el.classList.add('hit');
          setTimeout(() => hitDecoy.el && hitDecoy.el.classList.remove('hit'), 120);
        }
        p.el.remove();
        if (hitDecoy.hp <= 0) {
          breakClarineDecoy(hitDecoy, c);
          state.clarineDecoys = state.clarineDecoys.filter(decoy => decoy && decoy.el);
        }
        return false;
      }

      const moonlightInvulnerable = getCurrentCharacter().id === CHARACTER_ID.HAYATE && now < (state.hayateMoonlightUntil || 0);
      if (!moonlightInvulnerable && now >= state.player.invulnUntil) {
        // 被弾判定はキャラクター画像全体ではなく、胸元の可視コアだけ。
        const hitPlayerCore = p.raidLaser
          ? raidLaserHitsPlayerCore(p, playerCoreRect, arenaRect)
          : rectsHit(r, playerCoreRect, 0, 1);

        if (hitPlayerCore) {
          damagePlayer(now, p.damage, classifyIncomingAttack(p), getIncomingAttackElement(p), 'enemy-bullet');
          if (p.ambushPersistent) {
            // WAVE2の常駐WARNINGは被弾しても消えない。
            p.x = clamp(p.x + (p.vx >= 0 ? -18 : 18), 12, w - 12);
            p.y = clamp(p.y + (p.vy >= 0 ? -18 : 18), 12, h - 12);
            return true;
          }
          p.el.remove();
          return false;
        }
      }
      return true;
    });
  }

  function updateEnemyContactCollisions(now, frameLayout = null) {
    if (!state || state.ended || state.finishing || state.koTransition || state.countdown) return;
    if (now < (state.player.invulnUntil || 0)) return;

    // ハヤテの月光中は弾と同様、接触ダメージも無効。
    const moonlightInvulnerable = getCurrentCharacter().id === CHARACTER_ID.HAYATE && now < (state.hayateMoonlightUntil || 0);
    if (moonlightInvulnerable) return;

    const layout = frameLayout || captureCombatFrameLayout();
    if (!layout) return;
    const { playerRect, arenaRect: arenaRectForContact, boss, bossRect } = layout;

    // build836: CH06 / DAILY上級の遮断壁は味方にも実体を持つ。
    // 壁へ接触した場合は通常の接触ダメージとして処理し、
    // damagePlayer側の無敵時間で毎フレーム連続ダメージになるのを防ぐ。
    const hitBarrier = (state.chapter6Barriers || []).find(barrier => {
      if (!barrier || !barrier.el) return false;
      const barrierRect = getChapter6BarrierRect(barrier, arenaRectForContact);
      // キャラ画像の透明余白で早すぎるHITにならないよう少し内側へ絞る。
      return !!barrierRect && rectsHit(playerRect, barrierRect, 12, 1);
    });
    if (hitBarrier) {
      pulseChapter6Barrier(hitBarrier);
      const contactDamage = Math.max(1, Number(hitBarrier.def && hitBarrier.def.contactDamage) || 85);
      damagePlayer(now, contactDamage, 'raw', 'neutral', 'barrier-contact');
      return;
    }

    if (isNormalBattle()) {
      const hitEnemy = state.normalEnemies.find(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return false;
        // Dedicated CHARGE zako only deals contact damage while actually dashing.
        if (
          enemy.def?.behavior === 'generic_element_charge_v1' &&
          enemy.attackState !== 'dash'
        ) return false;
        // 画像の透明余白で早すぎる接触にならないよう、双方を少し内側へ絞る。
        return rectsHit(playerRect, getUnitRect(enemy, arenaRectForContact), 14, 9);
      });
      if (hitEnemy) {
        damagePlayer(now, Number(hitEnemy.def && (hitEnemy.def.contactDamage || hitEnemy.def.bulletDamage)) || 85, 'normal', getCombatTargetElement(hitEnemy));
      }
      return;
    }

    if (!boss || !bossRect || !state.boss || state.boss.hp <= 0) return;
    // CH02-4 イリシュ(violence_v1)専用: 突進の当たり判定は画像の透明余白ぶんを
    // 大きく差し引いて、画面幅の半分以上は必ず回避ゾーンとして残す。
    // 他ボスの当たり判定(14, 18)は一切変更しない。
    const bossContactInsetB = (BOSS && BOSS.behavior === 'violence_v1') ? 42 : 18;
    if (rectsHit(playerRect, bossRect, 14, bossContactInsetB)) {
      let bossContactDamage = Number(BOSS.contactDamage || BOSS.bulletDamage) || 200;

      // 初級 CHAPTER02-STAGE04「イリシュ」限定:
      // 突進による接触ダメージを通常版の50%にする。
      // 通常 shooting_ch02_04 は一切変更しない。
      if (
        BOSS && BOSS.behavior === 'violence_v1' &&
        selectedStage && String(selectedStage.id || '') === 'shooting_beginner_ch02_04'
      ) {
        bossContactDamage *= 0.5;
      }

      damagePlayer(now, bossContactDamage, 'boss-heavy', normalizeCombatElement(state?.boss?.element || BOSS?.element));
    }
  }

  function triggerPlayerHitScreenShake() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    const stage = root.querySelector('.shooting-stage');
    if (!stage) return;

    // build774: enemy-bullet impact is driven directly from JS so the shake
    // cannot disappear just because an older shooting_event.css is cached.
    // The first lurch is intentionally large, then it settles with a heavy recoil.
    if (typeof stage.animate === 'function') {
      try {
        if (root.__playerHitShakeAnimation) {
          root.__playerHitShakeAnimation.cancel();
        }
        const animation = stage.animate([
          { transform: 'translate3d(0,0,0) rotate(0deg) scale(1)', offset: 0 },
          { transform: 'translate3d(-14px,8px,0) rotate(-0.55deg) scale(1.014)', offset: 0.12 },
          { transform: 'translate3d(12px,-6px,0) rotate(0.45deg) scale(1.010)', offset: 0.28 },
          { transform: 'translate3d(-9px,4px,0) rotate(-0.32deg) scale(1.008)', offset: 0.45 },
          { transform: 'translate3d(7px,-3px,0) rotate(0.24deg) scale(1.005)', offset: 0.62 },
          { transform: 'translate3d(-4px,2px,0) rotate(-0.14deg) scale(1.003)', offset: 0.78 },
          { transform: 'translate3d(2px,-1px,0) rotate(0.07deg) scale(1.001)', offset: 0.90 },
          { transform: 'translate3d(0,0,0) rotate(0deg) scale(1)', offset: 1 }
        ], {
          duration: 420,
          easing: 'cubic-bezier(.18,.72,.22,1)',
          fill: 'none'
        });
        root.__playerHitShakeAnimation = animation;
        const clear = () => {
          if (root.__playerHitShakeAnimation === animation) {
            root.__playerHitShakeAnimation = null;
          }
        };
        animation.addEventListener('finish', clear, { once: true });
        animation.addEventListener('cancel', clear, { once: true });
        return;
      } catch (_) {
        // Older WebView fallback below.
      }
    }

    root.classList.remove('player-hit-shake');
    void root.offsetWidth;
    root.classList.add('player-hit-shake');
    setTimeout(() => {
      if (root.isConnected) root.classList.remove('player-hit-shake');
    }, 460);
  }

  function damagePlayer(now, amount, attackType, attackElement, hitSource) {
    if (!state || state.ended || state.koTransition) return;
    const member = getActiveMember();
    if (!member) return;
    // ミモザの無敵アイテム効果中は被弾自体をなかったことにする
    // (コンボも被弾回数もダメージも一切発生させない)。
    // 効果は取得したmemberにのみ紐づくため、交代先には影響しない。
    if (now < (member.invincibleUntil || 0)) return;
    // 敵弾が実際に味方へ通った時だけ画面を短く揺らす。
    // 接触ダメージ・無敵中の弾・デコイ/召喚物への命中では発火しない。
    if (hitSource === 'enemy-bullet') triggerPlayerHitScreenShake();
    // HIT COMBOは被弾で即0。無被弾でも3秒間HitがなければgameLoop側で0へ戻す。
    resetCombo();
    member.hitCount = (member.hitCount || 0) + 1;
    state.totalHitsTaken = (state.totalHitsTaken || 0) + 1;
    const rawDamage = Number.isFinite(amount) ? Number(amount) : Number(BOSS.bulletDamage || 0);
    const incomingDamage = resolveIncomingDamage(member, rawDamage, attackType || 'raw');
    const activeCharacter = getBattleCharacter(member.id) || getCurrentCharacter();
    const targetElement = normalizeCombatElement(activeCharacter && activeCharacter.element) || 'neutral';
    const normalizedAttackElement = normalizeCombatElement(attackElement) || 'neutral';
    const isLethal = (attackType || 'raw') === 'lethal';
    const elementAdjustedDamage = isLethal
      ? incomingDamage
      : applyElementDamage(incomingDamage, normalizedAttackElement, targetElement, { ignoreStageImmunity:true, incoming:true });
    const elementReaction = isLethal
      ? ''
      : getElementDamageReaction(normalizedAttackElement, targetElement, { ignoreStageImmunity:true });
    const appliedDamage = Math.min(member.hp, Math.max(0, elementAdjustedDamage));
    member.hp = Math.max(0, member.hp - appliedDamage);
    showDamageNumber(state.player.x, state.player.y, appliedDamage, 'player', false, elementReaction);
    if (isNormalBattle()) evaluateNormalMission(now);
    state.player.invulnUntil = now + 1150;
    const player = document.getElementById(PLAYER_ID);
    if (player) {
      player.classList.remove('damaged');
      void player.offsetWidth;
      player.classList.add('damaged');
      sustainHitFeedback(player, 220);
    }
    renderHud();
    if (member.hp <= 0) beginPlayerDefeat();
  }

  function showGameOverNotice() {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    arena.querySelectorAll('.shooting-game-over-notice').forEach(el => el.remove());
    const el = document.createElement('div');
    el.className = 'shooting-game-over-notice';
    el.textContent = 'GAME OVER';
    arena.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
  }

  function beginPlayerDefeat() {
    if (!state || state.ended || state.finishing || state.koTransition) return;
    resetScoreAttackComboOnDamage();
    const living = state.party.filter(m => m.hp > 0 && m.id !== state.activeCharacterId);
    if (!living.length) {
      // 全滅確定時点で中断データを即削除。
      clearShootingResumeState();
      state.finishing = true;
      state.running = false;
      state.phaseTransition = false;
      cancelAnimationFrame(rafId);
      clearProjectiles();
      renderHud();
      showGameOverNotice();
      const player = document.getElementById(PLAYER_ID);
      const root = document.getElementById(ROOT_ID);
      if (player) {
        player.classList.remove('damaged');
        void player.offsetWidth;
        player.classList.add('defeated');
      }
      if (root) {
        root.classList.remove('player-defeat-flash');
        void root.offsetWidth;
        root.classList.add('player-defeat-flash');
      }
      createHit(state.player.x, state.player.y, true);
      // GAME OVERを戦闘画面上でしっかり見せてからRESULTへ遷移する。
      // プレイヤー消滅演出(1.45秒)の後にも少し余韻を残す。
      setTimeout(() => {
        if (!state || state.ended) return;
        state.finishing = false;
        endGame(false);
      }, 2600);
      return;
    }

    state.koTransition = true;

    // KO演出760msの途中でアプリが終了しても、
    // 直前の「HPが残っていた古いsnapshot」へ巻き戻らないよう即保存。
    // buildShootingResumeSnapshot() 側で selectedCharacterId は生存キャラへ正規化される。
    saveShootingResumeState('party-ko');

    // キャラLOST時は弾・一時エフェクトのみ消去。
    // 乱入mini本体はclearProjectiles側で保持される。
    clearProjectiles();
    const player = document.getElementById(PLAYER_ID);
    if (player) {
      player.classList.remove('damaged');
      void player.offsetWidth;
      player.classList.add('party-ko');
    }
    createHit(state.player.x, state.player.y, true);
    renderHud();
    setTimeout(() => {
      if (!state || state.ended) return;
      const next = state.party.find(m => m.hp > 0 && m.id !== state.activeCharacterId);
      state.koTransition = false;
      if (!next) return beginPlayerDefeat();
      if (player) player.classList.remove('party-ko');
      window.switchShootingCharacter(next.id, true);
      state.player.invulnUntil = performance.now() + 1200;
      renderHud();
    }, 760);
  }


  const ULT_CUTIN_DURATION_MS = 1000;
  const AYANE_ULT_HAND_OPEN_SRC = 'images/ayane_ult_hand_open.webp';
  const AYANE_ULT_HAND_CLOSE_SRC = 'images/ayane_ult_hand_close.webp';

  const SHURI_ULT_SCYTHE_SRC = 'data:image/webp;base64,UklGRgYvAABXRUJQVlA4WAoAAAAcAAAAXgEA8wEAQUxQSGAXAAABsEZb27Kn0f1+ki/uhiS4BneHOlaGDvWhNi2FCgMV6i54W6yO1YEa7i1SgVAc0kCBYBGSfPHks/d9n/tHnuf9/OFeYysiJgD+L09rqkJbrZ6KoK0eH9lo67pPI2hr8dok0up4ee9EyrI86Tq/yEJXKfcWo+NUH7rqexGR1d3Fic9JjTCRS/Qdqf65vRYRPQuVRhnrqv/8+B/DEylFaTn/UP9GpnuuFTS/tUtiTFRck4EtkpLaTz2iIyLmJzeC1keQuUo2vjHtjmFZiTEWCrm+3HP6dQCwjN99qYPSqP0Btb7wt415tZ6GmmoHQ/6K5EbwI/Ldjqri3AX3jEgxU4Yl89rlFxDVc/emJrxwudqx/YbMJjmT/9DQp3XLhmVntp1aJODqjpI/tqyaM6l/8yQrPShZt88sUJGrbt+iIqJ25VJJg44+12qKGtDHasVv8x7qG0kGcS0H/3Puql9O1+ooZgwbqxi8uqPowNfznxzZNu1qL6LfU6suqhiy3Vf2PNHPepWmJPe8fdaGvDIPw9DuLsv9Zsa1baOvurKnbarUMWw6z6x8sInpqsnS/e/v7SpxY+AzT50aLIjMeeX3OTe3Ml8N3br0EmMYjNq+xye8XB40XNfB+Z0sVzWWAf9ae9rNMOBLli765Bfn92kKROwOLkS9Nu+DCc2UqxSl18eXMKA1F+OtMClKszVTAKBtXrA1rt/7dMpVSNsHP7uoYmC7bs3ezDieiqqy4zu/mf7QnDydo2lBhYiVm58eEHEVYbJlzj2qYaCrS80R7+scPtN1hnxHncaY1lBX72ZBgqhdWNguynR1YLnp5V2FDAN/b9N+HzvQ1/Y9r+9zLOia1e2e7Z5gQUTH7y/1lj9TbMcF5ToG5ZJWJxn6vPidiKFfJAMANDkQRIhqweyOMYrUtX5uczUG67lyhr73rLIqWcD9V1Ahon3d5KaypsS1fDnPgwHOKoqZwM/nsxVorESN0oIM0bHn+jSLjNnu/O6ihgFfPOljPTDw504cy9CP9KBDrN//cmfZMqUNX1vDMPDVpxIuI7rKS1yGmNZgL75QaHcwQ9r75kYQ9QmGRM+p+1raZMr68I4qhkHIcs0JTix+9qY7K4zo+S/dN3Jg70GjHvrebQRrbzc3gtGhAdGdt3igLCmpI350MAxKz0yIrz/VzwyPM5H79NQME/Bjx+ypYSJ2+VrOE6ECUb8yqb1JisZttmOwel6EyNP3AkT/hkLPom5gOHNKmQjZl42aHgodiJ68GenSE9Pvs3qGQcs+Aetb7cA0qU5Qv9oGXpruLWACPN8EbP2266EEUf1tWJzcNF92QcdgLp3WqlcCpB9BPvssCbw2/c0uUle8sOYswxDLCleNsUpLRIeXSxkGue7xfJ4yWBcUNQNfLnIKkDEMxcyzuLdNTuIWnvBg8OuHH0h+AflVU8CnSV/ogpCtnXslUT6UJpOOY9CzK27cYQb4WvB1pG/glppQh6j/MS5ZMswPHWjAEHBW1e4FUH4SzFR8lHE59CGW77zOKhM93nBhiPTcApB5nKffDL7+ORwg2ue1U2Qh+dmzKoZK/VWAAYW82kyfPcXCAnqOPx8rBdb+X2sYQv9oAsNKeFeifDZO95uz+OLZU3lHc3/fvemH1V9/s+qHjdt3/bYvN7+gsl4NIET1q94SEPtGoYahVDs+/Zl6DiuJ9dkw1R9a3ckdrw7v2L51i6xmTTLTkhLiYmNjE5JS0jIym2S3at9p5IzvD5Q4WICgen56XLjr/pkDQ62uIr+yic9GMl8xte78gn+kg9+jBj44+6vcK2ogIDo+ylHCWfSTF3QM3Y4bffY0es08+xfsVvXjL3RrboPAtESnZN/w6ZEqj/9QK5iaGL5azXRg0DovnTpxcM/6lUveXfz5poNFmm+m+Gy9V/rvT3dN7PjdguEmCGylyfjnvjpaq/sJseGLTuGqf5EHg5B5agp3LLopOykhPi42yma1WG3Rccmj1zf4AF81+SijyJvzkxNNABBthSA0RcY3u++HC6p/UDt7qykcRUz8DQPflbdu/mN/GxwNPkx8+ATz7pcOPhpb60XhrSYIclu/ycuOOP2BePmhmPDTdLmHBZh6bvX9mTaLCXytjK71TvtB8Un8Kmbs/LUKhEBzRMdX/2rwA3r2dDSFma7b3RjATC3a/cHEXlbwb1YZMs/xjavPG8DiQb5Qnq9Hg4yxmSYIkeYe93z1l858hXhgvBJOzI+WY+Dq5ZvfyI6AQCzQf7/JZFJGug2w3zv7YFwVGtRrT+1sCqE04s71tbqvUPsgNXw0eb4KA1R3XFr98NAkBQJz35r2AAATTx7Y7+GhurO3yQvz2EO6EVa26RZTSAFIGfleXj3zDTZ829UUJrr9hQGqn19yXTQE8A1WaDxjuBKxW4Bonx5lyDypCo0Xf26B0Ktc81Ul8wliyURLOIi+/4AWCKzuxOf3d7FBMCYrANN1EdaunJgdozQyJw36pBSNu4/dDSE59rq5x53MF1j8bHzoi5xbh4FYvW5sLATzUCOI+pXv/3XHqJETXzukorf6mbahCQCSJ53VfYH6hymhrvsqB/qdVR+YOTgJgjr6A2YIkXlq7fZ6jaHX2sfRIQuUHi/nO32A7nU5ppA28CT63731lmgI8sQFNTUOY75XXzeHLgDIfqJQ9w7x5I1K6DLfkY/+dh798NpkCG5Tp6d313/dd+RRtbKc+Y3l3hQbysDc6Z+/1HrHCm+PC1XmBxrQz/qRJzMh6C1TcnNfSYWY93becsdFv6Fj72vxoQwAEh+6yLxBrHnTFpoSnitHv6oXlo9PMUMItCYmWgDMnZqDuXed3zw7J0eGODC1ezZP9wZdb6eHosg3NPSr+sEAM4Rc8z5/Fb/QBMKg0uUzpzfoXBARepq950A/6gWz+lohBJu3+af+3a4mCI9RN66r8wI9S5qFmtj3NfQjW9vfBCHZchSrHX5Ya4LwmTzb6QWqX8aHlpYrNPS5XvLRAAuE5pTJKjLmM3a4PYTVnA+qjaG2uWMoiftYQ18zz85hURCarW2+r2daQ56Ous58ob8KYTZqyiWNGUF9bUboaLVMQ1/Xrh5rg1DdYdrCT+Y91S69wPX1S4eYD1y9wg1Ay+fOGUJ9d/dQEb9URR97Tt+aACHdBACpeec6KH0rfFAWFX7AMnSPxwiyrS1CQ/ZHOvr43FPNIfQnZ/3xLEBWoQ+OQ1hOe/kCM4DajqxQELPIgz7Vq34YYILQb3t60LJWoMzw+OBgdFgC64QC1QDqnyQFX/osD/qUrR5pgXB418HOrc2gPOj0gTotIiwBdP/UYwAbFsYEm3WmC32pX3k/BcLi9ef+7AAA5muqfcAuXBemIGF5GROh6zFbcEVOc6AvPT/cYIOwmHkSKycCxD92ivni8r3hCmyjCwxg+UQlqB6uQx86990RB6HfbIvP7LueYflP983IdaAPWXG3iLAFStevnCK80ksJouHF6MPaF1orEAbThs39+bKOfmTb4iGcJzxbLMKdnYNnxCnmnXp6aiSERVNE+w/t6M+qbSlhDcw3HnILtM3NgyU+F73Xf+wB4dP0ouaH8vt6QphX2szXeMiWJAZH0+90787PtEI47XfJd3+OAQmMmn6eh+oHkUGxRENv2an+kRBW03ch05lPqgeaZADMowsYBx0PWQLPdnc1euve2gnCbPw214Hp7+Zr3rHvI0ESO+/VOHjmxsAbZ0dva19vAeG238lFbcDcZaPulXOKIgvQ6RsPBw+kBlrmr+glK3smCsLuyJmxAABZh5g3RcNBHmO/dHDcr0cGVuKXbi/0X6+JgPAbaYHGpmvOe3MiWyIg4wVHIyy/TwmoOxka92zIgbA+qc6L/akyAeb36hrhuc6B1P4wGnd8lAnhPXM3M3YkUyogYYKjkfZBTOAkrdWNOd+OhzBvnaMZO9NTLkB5uwoRsfbOwHlWQ8PVL0RB2B9YZezSOMmA6OurERG3twyULifQsPPJaAj/li3Gqu6SDbC8XouI9U9aAiPxT91Q6WQryOAjzFDDNJNsQOSYekQsHR0Yd6Nh1yQbyGDT3WhYfcMsHRC9wImIe1oEQuuDhkruNYEMJq/RjbGCTPmAyGluRH1jfACsUI2wJyJACoev+eGCIdResskHJK1REbUnTH4bx9BgxSMKSOMolyFseFKRD4j6nCFeGOCvjHVG1GeiQB6jy43hpeEW+YCORxl6Fpr99DFDcd3LFpDJYi9w7z8U+YAhlxDZHf7pWoVidUEcyGS3am+qd/aUEOWeSsStaf4wz9NFnq8SQCajVurenL4BZNT2uooNd/rj5kIU6huag1TmHGJe1F1jkRJIWqbi/jTfxeSjUN/fBuRygope7rOApLbcy/Q3LT77e71ofydFLiJnal6w9xRZUYafZyc6+iruayYouRHk0ja5Gr3UXpYWUCZUqnf6arID+ZfGWKTC1HmunXnjWmWRFoh5mx3O9E3sceTXTwG5tE4+r6O3amFrRVog6YjnacUnY6t5jsejJAOsycPftXuhl799jSItcFNhbpYvLHN13kYrSGjUe7oxxAsb28hL5OfuUb64sRK5uzuBlFoX6obY+TcHK/ICTX861to70ybkOvoqcgIjKo3oh68HqVVuKZmheDWomON+E2S153kD7k+jQHKtM3Y19eoxN2d7C2m5sVzEdjQF6U36tI83acewcWk7kFXrEk1U2RUkuO8qb+7TG6kLLNICQ8sF2qFMGbIs9iLhN2yc2w7kNeeUoGJ5igxBqhcDLjdyjFYkpt0xQdmcRCnyUnnMjYjsq2iQISzuKV/x+xERC64HmR1yXuSaZZWuexgieu43S829LlHDxCjZsm1BRH1rCkjtwCsC/bMYkO22xxHx4iBFbgaVCkqvAem+rgzR+bgCMmvr/okuyG8mXw94EPdlgdTmHFNRWDpKuky7EV1TTXKT8i0THZhrk60cD7I9GSC57StE7teskqXMQ6y7CaR3MeOpu9NBspO2I9uZIT+3qzzHaJDtTnnomWqSn+c0XlUn6RpahseSQXZNNxYj395Fuu526dNBejO3M0FJD+nawM71lp/Y71FYP1G24svY0kj5URYzwaFM2brDU5QNEvyUJvgsWrbmqa+CDE9TBesSJCtmTX53KXqP8dipbMlqsnd9vAxZVgrwUo5kdcyfATKcvAWFbIFJrnqdai9FbY6JcJdkDfnQIkXXNhjYBnJ93USQ4fTNzMAuq1w9cKMMxazQ0eDpQXL1RicJSpheiUbLHjHLlLI4Un5SVmto2L03Q6ZSngXpHX3Ag16qa28wyVO3/vLT6TR63ZDfXp7SbPKj3OX2Sr+QIU9SnH3GK222hZQiP2JesC8ygZbvqPOisi0Qc8xhY2xpJDXBAmOV44Cch3sMzVfoqXOpEUd3oOfsw0ZONCWo1O1G1icQVOQKJtLfNhOU8qYmcvwTKPo+p+hSG5IaWC06YiKpbLtoLZB0QqnoFZqyFQnUCTQVIXIMpam4K6LBNNXSLtCm0tSAagHuVEjq1gZR+TCSetIj8syzUdQsXaTOpyjTYiYq6g0EbVuBQn0BUHTCD6Ly3iSVtkPAdqaTVItjAm2miaRySgXOB4Ckx+qCgmiaWo3C40DSN1eJzkZSlHWBLqq5jqJanUWxPsdEUCPdBtjaJIJqctgA5rcmKOss1UBJDkHBXXUG6oZQ1DS3Af3bZHqKWMQMoGeWjZyaH0ajrPi2CGqa4TGEWHiHhZYs7zMvWNnDcaQEXaq8QCy9iZbi1nijzo6lJXhV9+J8JhDzJKex2slmapqhGmI74oGYoz9jhuw9gZpb5htiu1LJ6XoXGnU/qZBTkyPMyOUcIGfzlAYjXwBBx+8z4LmVouA2VVTWlaRyykRn25FU27OiQ1kk1fqUaFsqTeWLfkwgqbZnRd/Hk1SnItGmZJLqUi462oKkuteLKrqT1CBVhHMViprEDPzVmaK+QrG60ERQSfkGLnYBgr6+UsR+SCQo5WVNpM80EVTkUhS7HgGCjl1loGYIRVlnqqKqHhQFqfmi4uYkBZ+JLqXS1Neiyq40tU3knERS1mMitiGZooaUiLCwI0FZZusG7F0IShnyuy4605agALqWibalklTL4wJtlpmkWucLGm4Dku5iF5xPp6leDsHvQNP9GgQfElX3Gp7+KFH1dPCcI4mqj4tXM5ioxosGENVdDl51f6JK+EanLZjiIq67HZzKflQ1oYFTQVbj6znlfahqZB2nrDdVDa/hlJLVwGpOGVn149n7UFWfKk5Zb6rqzSvvQ1V9qznV/amqdxWnZgBV9aKuntTVnVfdn6q6VHKq+lFVDq+SrDrxqsiqI6+iL1W1q+CU96Gqtv/m1YZn70tVreycCrJqXUFddo6drFoK+lBVs3JeX6pqyqsgq0zqSufZySqtjFNBVqk8O3VVkFVmOcdOVu0qOOV9qCrLzqnoS1WpZZyq/lSVJOhHVYmlnIq+VJVAXfHUFUtdMdQVTV0xRZzKflQVTV5XiCuKuqKLiCuykLqKORV9qSqiiFPZj6wKOVV0dZlTSV1V/anKeonXj6osvEq6usCpoqsC4jKf41T3pyoTr2bAv2udJS7l373+4lT3J6vTxAW8mgFk9Rd1naGus9R1hsZqyWsgcdX9t4K//rvBKU79ILLK59QNJK76QWT1J401kNdg4nLQVR7HSVcneUPI6gR1HaeuY9R1lOOiqyMcJ3W56OoQdR2krj94Q4nLTVe5HBdd7aeuXI7737xcQ/5LwX7q2sdx0tVv1PUrdf1CXXt4g8lqF6eBrn7mDSKrn6hrB6eerrZz6gaS1Tbq2kpdWzi1dLWJujZQ1zpOHV2t5dTS1Y/U9R11reLU0dXXnNoBZPUFbyBZfcapo6vl1LWUuj6iriWcWrpawBtAVu9S13xOzb9tzaOuuRznTWQ1h4O7s4nL/SxVzeWxz6KJao5gRxpNWefztKUxJJX95GaeZwaQdIeLjFfRl6ZaHBUcAJpO3Sr4hKjMi3jsAaKCKS7eo1Q1pIaDy6mqZxXvkIWoxtTxKnrTlPKaxlPn2Egqbg0Kj7UkqY5nRFX9SOpNTVQ/hKJsq5joSDZFQS+7QP8yjqRStzCe9pZCUhGfCjxPAk2/ofNqbyCq6R5eaRuietTNOxtNVDM8vL8iaEqZz3iFyTQV/QXyK7vTVPM/BM77aKrjZYG+wEpSWQcF+Gcbkor9hglcd5OU8pYmwNO9KAomuUSVfyepoTWilVEk1bpCUNUDSDq9XHAkm6ay7Dy2Op6mulXx9HfMNHVzveAtoOkZHsHbNKW8rQvmmkgq+n2Nx5ZGklTaWp2HG5NJqvMlJjiSTVIvqCi82IGi/mZHcXVfgopbrRvQniGomM+N4MFoeoKxVUaqxxEUbDeiL4smqEVG8FxrgtpuiE2np2vKDOHlsQoxJfyIXp5Mo6XYx2q8UaeSkuUZJ3pbdzstTczVvDg3NYKUAFrlMkPlNwA1K+1/1A1cnGglJ4CcIpH7PqDomK8Yj21NJSmY6uapryg0lVnKK+8MRP0nryCKqvYJzFR1gncxhqgyy3g1w2lKecjJ094ykVTGz4yHJ1pTVMJkJwq1HcPiyClppQMNMns/cso+j0bVP5qTU+ouQ/XvRJJT5KeGLk8Aep7hMdCwO5qghtgNVD8FBB192kBhN4qCpQbyW5PUaLfocDZJ5ZQL2JZUkmr1p0B/x0pS6T8LPE8DSUd9JqgfT1PKTJ13JYumYHw976iFqFraeauAqJU8DptIVfAZx3UNWd2uNqroS1aD6xtd7k5WPUsaFeSQVeezjU62I6tWhxrtbUpWmbsQkX0VT1ZxPyCi/o6JrCzLGKL+BtD1bB1RnUpYD3gQHcMIq5cTsSSesGLsiPlA2ScRfyWt1YjLSetFDZ8nrbH17vGkNayi4QbS6l9Uey1p9TxfPoS0Op682Ju0Wh/K70xaGXt+aUpasRu/jSct85qVEaQFKxaYaOvN6UDbEwYRV5yNuP7dEFZQOCAMFAAA0HsAnQEqXwH0AT6dTqFNJaQjIiG06WCwE4lpbu6on4KZBmwGbdkcZCF4//mH4d/sx5Ef3X8iPPvzB/M/cj9nub21bzt9i/AL9rb0yAj67ed39j5r/Z7pF77WgN/Nv8l/4PZ//yvIT9W+wN+wvpjewz91vZD/Y7//ibyY2090XAmSpHT7+zY9OqbBde9U1VoD2FyY21ElMr+MOdPW1U2OIBZFAVnBm0kqOGmCn1z9kcXmt0b78yq/+a8+CBFl4De+VYZix03iM1ZSD39d4stD+S0ZBnNFg3i4BYOTsjEU1iDmiEN7eHqyQMm6ubod3yB5DKdGpxmYoYKCqSCfuNcQC5cnC0jZ6AcodU9WtCQySOlEngtVp731dgB2GGBI1t9eyCTLxj6e0bJXlAvLABWERkq3ew85djyfbQ14N6d/rdxDIa2rYGsBZm0dgPTDa6/aIrO8g7JBomdLS8HE7GwgtRtjodS73IeH+rfrjB9/wcO/NOjQCxx31h9n6ZrTqJTMW2wFC5H7scgGfh44Ml3ioI7GCC+LzoWN5pFnGZ35y4Xw0zKQ60ja2WBoembrLhlr33Ezr6P3Du42ljgCQy2kVeXsRDfuQ52YXjmY5NgWn1ymCKKyM/BxO+NF/T5eqAobI8eu79jHvoRrxt6a9TN6ZWEPCc4zgbX7YnGiqKXvdVTLhy6XqhghQugk/9RglD5bT3/clAa5id4Ime8ExCQ/sllW1mz51zUJys+V/mfqFQIz4A6DVYF5DMKegglCcKb6mcsw6yIt/01WfcXAd6wI3BYw3WSOmXL4uG5jyKGoKXNHYm40Ds62opVFMC7Lde29O2opTq4O6YKJYtfD4yIQDoIJRB6s21EkcIHvE3MozcsEilfFw3NtRSqY2eg0//+FMCZ64j9xYaurNtRSqY21FIC6vK91ZSj5G079adtRSqY21FKpfOYvh0E40zbyR8bailUxtqKU5/wm0MGjnffeX2fcXDc21FKonzh1tsXFr7jrSqY21FKowhgUxtqKVTG2opT1CmZeNtRSqY21FHxVHHa0zJDLxtqKVTGPJjxjim4uG5tqKVTG0FLc5QCUQDoIJRAN8COKggHQQSiAdBBB4nbPs+4uG5tqKVRK4bVFzllWL4ZeNtRSqY2085JYZVYWIGbm4KVTG2opVMbZrOOn5eR0QekFFaVTG2opVMbOXposGsrng1zOXasLkxtqKVTG2b3lzOzZ+AKlH9fAnHIseopVMbailUxj9xmoJENFonY+6/2lfFw3NtRSqY2evIjYYoZLiVJuLhubailUxs7wcK2Z0c4lb8Dc21FKpjbUUhaTLFUxtp4AAP7/is5x5sxH8OJ/HfuTTE3aP46UJI5IEkgDKNo/nUgTynfW5xm7Da8eO757HeP+VW8//1unzOqZSae/eqtv/eLbzUSqauLYwhGeC7TU4MtCm680abVPTGq+7X/NtXS/ShCGQ+jtli+gH+Bh0qbIJ7pqxT3kOHkGRl0+tQ5TS48krJ53uvyJe9/WHtS03w42dUv7KXSsYOSYAFvaGdES+K7xMcNMbPuIdjq1/90MhnV3g3NBerZ7XQa5Z7dLTl/PH6hV4Lv+9D1QW8KTjUY2y81QEP5QGbcHoMBAYyDacukIIoA8lx+G+iXh2hQzfyjU2V0tkYXH4Je3iUtLFc38HFCo1dGUmXsI4yFGAUEuvUF444oZOz9skgJhxSwlZheGRZQhQ9JiV5yrT78AW3c4vtlrjijQoPK8vlkXM6Nl/5sVkBVRBRXvJ04cX0/xq/zteyA8Qe5uSGYaHEHnTlGgNstXJJJeHOpM/5yjv4IdtECOF585EqJZiaYF+0nkFG2UkdLAlZWEfi5W0+KlhOO3lXpOJ2oB14slYOR35GNJiVBN8EZ21gOjYcUTRPgUDKM60MgsG92HMNKGnx7jQQXACetZuPrAxRYsiNT86S/AHl+1/h35QsCU9XbChMZHhdh4nK2MFqtCHopVoVEeIc/e/Ip9sS//EtJIpIGgvZHgqQP9p8mM+3JYZ1RiqhARq23nGH4RWXsS42/lHrW/xdt9+aj4gU+ossjkyXTkqPpvNNt2xTUbO/qZEHcRr7Ixyj9mErgbPMz0Bh+HgHo/0G/G6ZkIE5b88EQCnBEt62NLc6yJL4sT5iXJv6CTK1ur5S7xHGUyMTdjSj+SdMCFMrE1XbOWivShlbVhwlVd0HfyCGI4VLYGG/XR5737QFeaoMOFMJy+tj+Z2kvMnJHRR+Nw2o8HsLFeYkxyy79yoSFVtXsWF7Ms8fGTKt+bUoTduz2vZntfUTGe1uoI17+c0/HmvE6L1KCgoHQjAUsr1V8j/zU6UBT+CvVGDH6wh3uSPMeloQ/TIHhXQP0onMHI0Q5qqIkipjACKKo3rgHNsnHn8U0hwRMTeSV+usN6Bo0LIq41ydki+eAt+RpVPNU3DB3fM0mjBr5oeJMd5QCalmQhJoIWDA3ezgadjvqF8wFtouI9n1ccJ+nbrUUN1HdKaZ4D395VVFu/udVcf4mGFUYW9rTlXbqo9LA2XfBEQxYdO6AsLzM9w4k4AEUOLT2eHrS1Lv0rBas8qEqbAZxPDMzgsDgqd61rrI8zG7gytAsvrqHDEMoTaSjD+BC0OSb1xI1pY2Lk6nOpfju1NFQgvou+9xnwphotHCjnFgDAtBdZkliJz3Brpvn24enb6sKPZC5PUHD12VkHvAOxV1xQL/J1T2nFc9UdGJy6mqmUxiQNlI7aQcIWBdRpW3aHKX7RcmymG9zbIfOZ3bNUvJD6mUfgtvBoRO6jUrRK8IWAg/AAOmOdCxdMxzJFkH4LTrMgAPnu+UIwSHEYQZsyPKKvbhFFQyt4qiUvY7/VK6bDKRzvdYbvPQh/yhTrRdAzFkkciYBhqTiszQsfdjMA0S0G0fG3YMguPgI0zUTw7ckr2ubnbsOqkjmBOKXCG0STBvo6WBaOLlEo09msUmW1k1M6pk0Lacdw/i7gZdOnsbPBBqgcxFsitZdaE8EfrzEjkUGxssYwWvMng/ACfiGDvBWS2Nv/lbcIAcHwzj73sDzFYtX4p5Rk7t04tU+/X18mLNxTpNd8PH32TWl+9Yeilw8Q888SCFeV4IzC63QXfegqF6YSmYKsc5qzq0a+Sl84yaMqAxHvtabNFJR6Twq/FXisz0wGAmxbNpczZ2fBmr3Qp3pOp+4e20ottC1MvALsvYYA2oDFe0+jnnzEvWdb6AmzgMRo4FZKY2oZSSB9EK3uBRmOkMIzT3OulciEZS0eW8NqOb/DKvNiiuJlkWk+Z/xP1kQj0jNy/YbP2XObE51QJ5XaUA3EsnaDHtI3x/dT///d5C4hr9fAc253kvpxIPJfdyAYS0lhIWRuOMKrnDfGbTrGMI3a7VF1aK5NDw6CH+BqxtHWgSWmYD4XJlc2khu/yQIoUNqjcaALjOWXL6S8AgXrxXSS9L6avQvt3twi+6iylIfzGzl+a6w6MEXCdi23FID1IiVmMKk+V3stLCkWMRB4bKq7F8p9w4goJC/w7g8oux0XM8jC3ujPtZFiidGgAYpUJhewfb1DZUa66CWL/fqFCMlxDvvgSGkGA3f2N6RAhgG259W/NBzv0Gc+xJTUX5J9NjZ9OJoFxnpMX4GNoLJSP9U5kpH1ckICfvVVVFovg1Nd6mx1bVeyc7edG86xUCZVY5yyiW3szSEcOtgh7IZsAC6Ce9/CRnQTnP7owXi/KL7GRaH+5IcRjWgEV+TnXxtbcPGNPRgR9c4oPKytALg1fd/uk/733Bth4fyHLvpVjnHP3MutcnWIFt+Cr89x/LanS9+jQt7nV/mwngYKRwdTWndoX/mqSecl4MTFikhITvQ0dM0IXR3Te7XJ3Fd157Y+aHgEMXWaVTRjm6ik76XAwUuEwpZhvj+1fGd3qRtKTPs62fiK4nRLD8yMK/7Du0eGHI00tS9aNwM4J2ql+Zq6yveQjF7xcH7lcQ5HVbqHyaVt8v257KxepqbNOmGb1ozCAmlIeOmQdHnJ4bdY+4ns1BGmgSCDZh+vAhWyxZGLQmdJRrlJSaC8dcHXtYjNz0EZ7VvDDqAfAxZIdefIeo2sQhTMlvAOjyN14c2f2cu5Ur/DlqP1rPSBnzk0ktTY2xgTs4KpqEcFyni+cvIp8H2frgSXztxU7qwt/EvGhUY9qrH7Q9e4gC6Jz9zpwNk0OikOwXZ2dYpOcg0ibNk4JbX/spJ31Riulg46aO3EX055R5kYKyHo0YVsfdwv2TIlb9qh5jEjTU+/I5z/LvOdxKDD6JdOe7PazfNxmMYIdRdfvmOI2kgbaxZl2IvITzOAaI7gOjl6fgokKoOi+Jli7T+yBohflmunIuqo7di+ffAPm8g95sOUoRig6JeBK+XHM5X6DYqDhXUETyDqRpgU3XS93jP89DSXEgZDlNGHmKaR4tUFhreCWhnqK3JGKcfhI3LkYIn8ecT7O+khJPkz+NDLWKPH4oXK/pX0ApYJ9ycWTkGPRl9vew75l4Rv3pZh4YAvPIYyiW4TW8uDDigC+5ErqMaF1R0DcPaYoc0925ixlV9Qu0yLHcgQqzvxBA5bXlyKCCJ0Py/7VTn8SOR/w//I/5o55jclk8Sq9xiG8EtRb4GQ58tCoZ9lIQinYeFc5EWINcYgAlgynLKJ0VfQ11I/0sUN8z0pl4YFMXS/TCo9yqM1MpuNy4NmFGqKW4gqFMhMAlItamhyk474w1P3ueKl4ppE2TdKMcXcsYjy3v3mwhkjpFFOdjhdesTToIRJNtwj18b+1uA8q60EMP/9+LQD/5iMfuCMo2G3hvsj2+hcwKYtdtZ5jWqdiFC07Nht9XPSGU6o7D+ckKuWK7Jb1LPlR6h/ma6tesp8aA+wMl0X7CRnJaFvR5ZTVUKf0/Yc7X2YE/LTV7IzWfDR4RYHGeddHsTJoAmnZpPRJBhM4QliGuRaVAb3iv34fEKNkeSrri6mVq8uz6PFyMWJMBbm2k5CBslubbgdGQopcPbXem41B18Pg2bLwcBHD2spY3zy25XGL/9I8CyxlAj46bsd3uq4BC3zQ8hl3N0nnOQKAwtl8HksPTePH27zIY4kDJ678Xl+oj4FFaLnygLMHz3zDf+BNTuwwWY+m72fSv4enApnPLHtBvU6cDeBGh5kQCJIdjU/u+UlG34vaeYPAMScDqKg5lSQp3buuf4FO3E9WheadwWUL3xpNCZgUX+ClHuKsKBcn/2xo0WBjB9AVl0jB6ECzYofJsUG2rgtES7spCwpWR1nr4HlaVNNnDXV49W1qghzhDODfTXneudnYJUq1Z0cm2ocnMv7OnXKrOVahaKeFRt2pmyY7UmsZ+e/pRNQi7jHMr9C7C8APKX1xmIszKOA7IHchGHdPA2aSUPSxylmb8efrAjM6OElvUohzYqLaV0Mwz48AkOOXo0XyARQ/hD/uVLMDDfxhdm/rzJt74EdpjvZYrLq3mnchiHfgjk2Dqomqdn+MNaiLSKCz1A8UPE87CRRoCrLnEIVvWnA6ngAM0+rucJZ/c7T5k6/3Zxm0M8MP3lo+jQo5dk98Y96YvFKmxldu9w/AqQwWuLsDkIo3GrnCC9+375UpvROc48eJui1TjSspxFu8W2hyj18CRXGiVnuz3wp+JmAYJ+UCjTd3earoPQnZni2jg+A4dFrxuuFjjt0xcLwKoMAmUkaAN0HZlqgCHNnm4xuFkuuVJja7rUpHoXH4tC6pQwQ0CvEHHWzT7p/vVlfRDVbU+7TFrb0v/o9gcvgVyFm9I9xE58iGjqxqquS0ykPkFeBNW7PN+w2FpwZ64k882+leLnf2zAKxtkEFPfWeEvkUVpmFf6e/o+d2FQ1+0K24ZoIBDVVLEDTzIiyWkR95xrDnZ7uJE4q4M9GFMK5qjA5JTxGols3TR1FLsHaebLMtn+VQSR4LZGUoPYYCOWvxvTPxdmNunVZdhk8xobc6/IeZg8NeSyADG1h+tGPO5pgiyYIIrLrg5ngSLFtbBO6/Ks9o8wTk5BNPSAwmB74KZ/sKwRiMz7i/TIoX7mAjPYx0AJoSnlDHnSgRzhHlfGn45caQA/AJgN4riwygEpFBfTE73zMIKLm8VFg6WIpLPyT+S+T2D+sQVKCSMUUp1+uwIX9qnulPUYhSW0+oq2Zclbb9Ycs0zkubEKzJanouOoHjrrlIJmAMbEwERof3XpfpTYaP6I/hUDXrbMI/BwmEWaAGW1NsNmzEx/Ycajv7mQc8sj9vxetIMQ+sCcn7XrTbawFlgLcOwclBnvIwnfKk5YHTpo5zeV+UDB131x3ciBEto10Odm++lu4sTjBEZbgW6bqMixcKbSvcnECahqpsZf9Hc0ZCHd62bARSN3+Z4xL7GUkV4L+E6Uwft7W7LIO/6IqtZPRlXhg+RO1WDqoG3hEXAvlt0ZHnPxeGWRdts4PVkpSGwEQRvwAPpHJE1IxoyGOUBeiRj3hw/A2Ph0Fl1jun89XMVayq9/zsdxUEMx2ypWP9bF37Fd8X663m4FE32aMgBIRSytHiTP198W3hbuIc/S2Q123j40lnrkDfv/9cqZ5SdRraxuO/qw8pOyJpveyUiCIMHfn5/ahoZG+oB+eJf0SvAnS6JOwDY7tlAdmBnh11pbUER8KwJ6xVIfjgx61b7Dvst6cHhLPmIXGVbQKPeTV3siYAVf/OKSxYFpgIJt/w9W85RBC8woTLyRRQMlxoJfSWVy1oBe33beyjyehMCQhgxJb7imd4q3712VPjC1zjVaF8ttDrkiTwLNaMFV5ld0BsUkgmC7Uhr/ARbo//Ym0kdQTl4I0weG+S0cBsxuBtGa5O4m5MMjtfsw4wA2EaECQ/xhv//cRRDgAAABFWElGXgAAAE1NACoAAAAIAAIBMQACAAAAIwAAACYBMgACAAAAFAAAAEoAAAAAUGhvdG9wZWEgRWRpdG9yICh3d3cucGhvdG9wZWEuY29tKQAAMjAyNjowOToxNCAxNTowMjoyMgBYTVAgBgMAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQ1IDc5LjE2MzQ5OSwgMjAxOC8wOC8xMy0xNjo0MDoyMiI+CjxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOklwdGM0eG1wQ29yZT0iaHR0cDovL2lwdGMub3JnL3N0ZC9JcHRjNHhtcENvcmUvMS4wL3htbG5zLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiPgo8L3JkZjpEZXNjcmlwdGlvbj4KPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KPD94cGFja2V0IGVuZD0idyI/Pg==';

  // シュリ(id:19)専用エフェクト。紅黒の波動が飛び、命中地点で巨大化して停止・振動する。
  if (!document.getElementById('shooting-gojo-style-v2')) {
    const style = document.createElement('style');
    style.id = 'shooting-gojo-style-v2';
    style.textContent = `
      #shooting-event-root .shooting-bullet.shooting-bullet-gojo,
      #shooting-event-root .shooting-bullet.shooting-bullet-gojo.shooting-bullet-logos{
        width:4px!important;
        height:22px!important;
        min-width:4px!important;
        min-height:22px!important;
        max-width:4px!important;
        max-height:22px!important;
        border-radius:999px!important;
        opacity:1!important;
        border:0!important;
        outline:none!important;
        background:linear-gradient(180deg,#fffaff 0%,#eadbff 34%,#aa67ee 68%,#6928b8 100%)!important;
        box-shadow:0 0 7px rgba(179,111,235,.82)!important;
        filter:none!important;
      }
      #shooting-event-root .shooting-bullet.shooting-bullet-gojo::before,
      #shooting-event-root .shooting-bullet.shooting-bullet-gojo::after{
        content:none!important;
        display:none!important;
      }
      .shooting-gojo-purple-wave{
        position:absolute;left:0;top:0;z-index:28;pointer-events:none;
        width:28px;height:28px;border-radius:50%;
        transform:translate(-50%,-50%) scale(.82);
        transform-origin:center center;
        background:
          radial-gradient(circle at 36% 34%,rgba(255,250,255,.80) 0 8%,rgba(234,219,255,.68) 15%,rgba(170,103,238,.60) 38%,rgba(105,40,184,.48) 64%,rgba(53,12,103,.24) 100%);
        box-shadow:0 0 9px rgba(251,247,255,.54),0 0 20px rgba(166,91,233,.36),0 0 38px rgba(100,37,177,.24);
        opacity:0;
        will-change:left,top,transform,filter;
      }
      .shooting-gojo-purple-wave::before,
      .shooting-gojo-purple-wave::after{
        content:'';position:absolute;inset:-9px;border-radius:50%;
        border:2px solid rgba(179,108,239,.36);
        box-shadow:0 0 16px rgba(123,54,204,.28);
        opacity:.34;
      }
      .shooting-gojo-purple-wave::after{
        inset:-17px;border-width:1px;opacity:.22;
      }
      .shooting-gojo-purple-wave.fly{
        opacity:.66;
        animation:shootingGojoWaveSpin .16s linear infinite;
      }
      .shooting-gojo-purple-wave.impact{
        width:154px;height:154px;
        opacity:.54;
        transform:translate(-50%,-50%) scale(1);
        background:
          radial-gradient(circle at 38% 34%,rgba(255,250,255,.68) 0 7%,rgba(234,219,255,.48) 13%,rgba(170,103,238,.42) 34%,rgba(105,40,184,.30) 58%,rgba(53,12,103,.16) 78%,rgba(21,0,42,.06) 100%);
        box-shadow:0 0 15px rgba(251,247,255,.36),0 0 36px rgba(166,91,233,.26),0 0 80px rgba(100,37,177,.18),0 0 120px rgba(53,12,103,.12);
        animation:shootingGojoImpactShake .10s linear infinite, shootingGojoImpactPulse .40s ease-in-out infinite alternate;
      }
      .shooting-gojo-purple-wave.release{
        animation:shootingGojoWaveRelease .36s ease-out forwards!important;
      }
      .shooting-gojo-purple-wave.scythe{
        width:118px;height:118px;
        border-radius:0;
        background:none!important;
        box-shadow:none!important;
        filter:none!important;
        overflow:visible;
        transform-origin:50% 50%!important;
      }
      .shooting-gojo-purple-wave.scythe::before{
        content:none!important;
        display:none!important;
      }
      .shooting-gojo-purple-wave.scythe::after{
        content:"";
        position:absolute;
        left:50%;top:50%;
        width:154px;height:154px;
        transform:translate(-50%,-50%);
        border-radius:50%;
        background:radial-gradient(circle,rgba(234,219,255,.22) 0 22%,rgba(170,103,238,.20) 42%,rgba(105,40,184,.10) 62%,transparent 76%)!important;
        box-shadow:0 0 28px rgba(123,54,204,.18),0 0 72px rgba(53,12,103,.10);
        opacity:0;
        pointer-events:none;
      }
      .shooting-gojo-purple-wave.scythe .shooting-shuri-scythe-img{
        position:absolute;
        left:50%;top:50%;
        width:100%;height:100%;
        transform:translate(-50%,-50%);
        object-fit:contain;
        display:block;
        pointer-events:none;
        filter:drop-shadow(0 0 9px rgba(123,54,204,.24)) drop-shadow(0 0 18px rgba(53,12,103,.18));
      }
      .shooting-gojo-purple-wave.scythe.fly{
        opacity:.98;
        animation:none!important;
      }
      .shooting-gojo-purple-wave.scythe.fly::after{
        opacity:0;
      }
      .shooting-gojo-purple-wave.scythe.impact{
        width:176px;height:176px;
        opacity:.94;
        background:none!important;
        border-radius:50%;
        box-shadow:none!important;
        filter:none!important;
        overflow:visible;
        animation:shootingGojoImpactShake .10s linear infinite, shootingGojoImpactPulse .40s ease-in-out infinite alternate;
      }
      .shooting-gojo-purple-wave.scythe.impact .shooting-shuri-scythe-img{
        width:72%;height:72%;
        filter:drop-shadow(0 0 10px rgba(251,247,255,.18)) drop-shadow(0 0 24px rgba(123,54,204,.20));
      }
      .shooting-gojo-purple-wave.scythe.impact::after{
        width:176px;height:176px;
        opacity:1;
      }
      .shooting-gojo-purple-wave.scythe.release{
        animation:shootingScytheRelease .42s ease-out forwards!important;
      }
      @keyframes shootingScytheRelease{
        0%{opacity:.94;filter:none}
        100%{opacity:0;filter:blur(3px)}
      }
      @keyframes shootingGojoWaveSpin{
        0%{filter:brightness(1.02) saturate(.96);transform:translate(-50%,-50%) scale(.82)}
        50%{filter:brightness(1.24) saturate(1.08);transform:translate(-50%,-50%) scale(1.08)}
        100%{filter:brightness(1.02) saturate(.96);transform:translate(-50%,-50%) scale(.82)}
      }
      @keyframes shootingGojoImpactShake{
        0%{margin-left:-3px;margin-top:0}
        25%{margin-left:3px;margin-top:-2px}
        50%{margin-left:-2px;margin-top:3px}
        75%{margin-left:2px;margin-top:1px}
        100%{margin-left:-3px;margin-top:0}
      }
      @keyframes shootingGojoImpactPulse{
        from{filter:brightness(.96) saturate(.92)}
        to{filter:brightness(1.12) saturate(1.04)}
      }
      @keyframes shootingGojoWaveRelease{
        0%{opacity:1;transform:translate(-50%,-50%) scale(1)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(1.45);filter:blur(4px)}
      }
    `;
    document.head.appendChild(style);
  }


  function getAyaneBlackhandHtml(extraHtml = '', variant = 'ayane') {
    const shotHtml = variant === 'gojo'
      ? '<div class="shooting-gojo-purple-orb" aria-hidden="true"></div>'
      : `<img class="hand-open" src="${AYANE_ULT_HAND_OPEN_SRC}" alt="">
         <img class="hand-close" src="${AYANE_ULT_HAND_CLOSE_SRC}" alt="">`;

    return `
      <div class="shooting-ayane-blackhand-aura"></div>
      <div class="shooting-ayane-blackhand-shot">${shotHtml}</div>
      <div class="shooting-ayane-blackhand-afterimage a1"></div>
      <div class="shooting-ayane-blackhand-afterimage a2"></div>
      <div class="shooting-ayane-blackhand-afterimage a3"></div>
      <div class="shooting-ayane-blackhand-impact"></div>
      ${extraHtml}
    `;
  }

  function preloadShootingImage(src, timeoutMs = 7000, blocking = false) {
    if (!src) return Promise.resolve(false);
    if (window.GameAssets && typeof window.GameAssets.image === 'function') {
      return window.GameAssets.image(src, {
        timeout: timeoutMs,
        blocking: blocking,
        loadingDelay: 300
      });
    }
    return new Promise(resolve => {
      const img = new Image();
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        resolve(false);
      }, timeoutMs);
      const finish = ok => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(!!ok);
      };
      img.onload = () => {
        if (typeof img.decode === 'function') {
          img.decode().catch(() => {}).finally(() => finish(true));
        } else {
          finish(true);
        }
      };
      img.onerror = () => finish(false);
      img.src = src;
      if (img.complete && img.naturalWidth > 0) finish(true);
    });
  }

  function warmShootingAssets() {
    // build520:
    // 全キャラ資産の一括プリロードは禁止。
    // 戦闘では「その場で使う画像だけ」を必要時ロードする。
    // ULTカットイン等は preloadShootingImage() で対象1枚のみ処理する。
    return;
  }

  function clearUltCutin() {
    const root = document.getElementById(ROOT_ID);
    if (state && state.ultCutinTimer) {
      clearTimeout(state.ultCutinTimer);
      state.ultCutinTimer = 0;
    }
    if (state) state.ultCutinActive = false;
    if (root) {
      root.classList.remove('ult-cutin-active');
      root.querySelectorAll('.shooting-ult-cutin').forEach(el => el.remove());
    }
  }

  async function playUltCutin(c, onComplete) {
    if (!state || state.ended || state.finishing) return;

    clearUltCutin();

    const root = document.getElementById(ROOT_ID);
    const arena = document.getElementById('shooting-arena');
    if (!root || !arena) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    // 通常ULTは従来どおりカットイン中に戦闘停止。
    // ID38(PAINTER)だけは非停止ULT：敵移動・敵弾・自弾・通常射撃をすべて継続する。
    const nonBlockingCutin = Number(c && c.id) === 38 ||
      String(c && c.ultType || '').startsWith('painter_');
    state.ultCutinActive = !nonBlockingCutin;
    root.classList.add('ult-cutin-active');
    if (!nonBlockingCutin) prevTs = performance.now();

    const cutinSrc = c.cutinImage || `images/chara_${String(c.id).padStart(2, '0')}_cutin.webp`;
    await preloadShootingImage(cutinSrc, 7000, true);

    // ロード待ち中に戦闘終了/画面遷移した場合は停止状態を必ず解除する。
    if (!state || state.ended || state.finishing || !document.getElementById(ROOT_ID)) {
      clearUltCutin();
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'shooting-ult-cutin';
    wrap.setAttribute('aria-hidden', 'true');

    const img = document.createElement('img');
    img.className = 'shooting-ult-cutin-image';
    img.src = cutinSrc;
    img.alt = '';
    img.draggable = false;

    const flash = document.createElement('span');
    flash.className = 'shooting-ult-cutin-flash';

    const label = document.createElement('div');
    label.className = 'shooting-ult-cutin-label';
    label.innerHTML = `<span>ULT</span><strong>${c.ultName || 'Ultimate'}</strong>`;

    wrap.appendChild(img);
    wrap.appendChild(flash);
    wrap.appendChild(label);
    arena.appendChild(wrap);

    // 停止型ULTだけdt基準をリセットする。
    // ID38は戦闘が進行中なのでprevTsへ介入しない。
    if (!nonBlockingCutin) prevTs = performance.now();

    requestAnimationFrame(() => wrap.classList.add('show'));

    state.ultCutinTimer = setTimeout(() => {
      if (!state || state.ended || state.finishing) {
        clearUltCutin();
        return;
      }

      wrap.classList.add('out');

      setTimeout(() => {
        if (wrap.isConnected) wrap.remove();
        if (!state) return;
        state.ultCutinActive = false;
        state.ultCutinTimer = 0;
        state.skipNextUltCut = true;
        root.classList.remove('ult-cutin-active');
        if (!nonBlockingCutin) prevTs = performance.now();

        // カットイン終了時も指位置へ即ワープさせず、
        // 現在位置から相対ドラッグを継続する。
        rebaseTouchDragToPlayer();

        if (typeof onComplete === 'function') onComplete();
      }, 120);
    }, ULT_CUTIN_DURATION_MS);
  }



  // ============================================================
  // トイフェル ULT：DUAL BLACK HOLE
  // 発動時の自機Y座標の左右端に2つ配置。
  // 7秒間、敵弾だけを強制的に左右の穴へ吸収する。
  // 敵本体の移動・射撃AIは止めない。
  // ============================================================
  function clearToyfelBlackHoleField() {
    if (!state || !state.toyfelBlackHoleField) return;
    const field = state.toyfelBlackHoleField;
    (field.holes || []).forEach(hole => {
      if (!hole || !hole.el || !hole.el.isConnected) return;
      hole.el.classList.add('ending');
      setTimeout(() => {
        try { hole.el && hole.el.isConnected && hole.el.remove(); } catch (_) {}
      }, 320);
    });
    state.toyfelBlackHoleField = null;
  }

  function isToyfelBlackHoleFieldActive(now = performance.now()) {
    return !!(
      state &&
      state.toyfelBlackHoleField &&
      now < Number(state.toyfelBlackHoleField.until || 0)
    );
  }

  function updateToyfelBlackHoleField(now = performance.now()) {
    if (!state || !state.toyfelBlackHoleField) return;
    if (now < Number(state.toyfelBlackHoleField.until || 0)) return;
    clearToyfelBlackHoleField();
  }

  function useToyfelUlt(c) {
    if (!state || state.ended || state.finishing) return;

    clearToyfelBlackHoleField();
    showUltCut(c.ultName || 'DUAL BLACK HOLE', c.effectKey);
    ultScreenFlash('ult-flash-eltena');

    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const now = performance.now();
    const duration = Math.max(1000, Number(c.toyfelBlackHoleDurationMs || 7000));
    const size = Math.max(56, Number(c.toyfelBlackHoleSize || 96));
    const edgeInset = Math.max(0, Number(c.toyfelBlackHoleEdgeInset || 34));
    const y = clamp(
      Number(state.player?.y || arena.clientHeight * .72),
      size * .30,
      Math.max(size * .30, arena.clientHeight - size * .30)
    );

    const holes = [
      { x: edgeInset, y },
      { x: Math.max(edgeInset, arena.clientWidth - edgeInset), y }
    ].map((point, index) => {
      const el = document.createElement('div');
      el.className = 'shooting-eltena-black-hole shooting-toyfel-black-hole active';
      el.setAttribute('aria-hidden', 'true');
      el.style.setProperty('--eltena-bh-size', `${size}px`);
      el.style.opacity = '.96';
      el.style.zIndex = '11';
      el.innerHTML = '<i></i><b></b><span></span>';
      arena.appendChild(el);
      positionUnit(el, point.x, point.y);
      return { el, x: point.x, y: point.y, side: index === 0 ? 'left' : 'right' };
    });

    state.toyfelBlackHoleField = {
      ownerId: c.id,
      holes,
      until: now + duration,
      // build766: 吸い込みを少し長く見せるため、当たり半径を絞り、速度も抑える。
      // 既存キャラ定義の数値は活かしつつ、視認性重視のバランスへ正規化する。
      absorbRadius: Math.max(8, Number(c.toyfelBlackHoleAbsorbRadius || 28) * 0.46),
      absorbSpeed: Math.max(180, Number(c.toyfelBlackHoleAbsorbSpeed || 980) * 0.33)
    };

    state.ultLockUntil = Math.max(Number(state.ultLockUntil || 0), now + 260);
    renderHud();
  }


  function clearEltenaBlackHole() {
    if (!state) return;

    (state.normalEnemies || []).forEach(enemy => {
      if (!enemy) return;
      if (enemy.el) enemy.el.classList.remove('eltena-pulled');
      if (enemy.hpEl) enemy.hpEl.classList.remove('eltena-pulled');
    });
    (state.facelessObjects || []).forEach(obj => {
      if (obj?.el) obj.el.classList.remove('eltena-pulled');
      if (obj?.hpEl) obj.hpEl.classList.remove('eltena-pulled');
    });
    document.getElementById(BOSS_ID)?.classList.remove('eltena-pulled');

    if (state.eltenaBlackHole) {
      const bh = state.eltenaBlackHole;
      if (bh.el && bh.el.isConnected) bh.el.remove();
    }
    state.eltenaBlackHole = null;
    document.getElementById(ROOT_ID)?.classList.remove('eltena-black-hole-active');
  }

  function createEltenaBlackHole(c) {
    if (!state || state.ended || state.finishing) return;

    clearEltenaBlackHole();

    const arena = document.getElementById('shooting-arena');
    const root = document.getElementById(ROOT_ID);
    if (!arena) return;

    const now = performance.now();
    const startX = Number(state.player.x || arena.clientWidth * .5);
    const startY = Number(state.player.y || arena.clientHeight * .72);

    // ブラックホール本体が画面端で見切れないよう、半径＋余白ぶん内側へ着弾させる。
    const holeSize = Number(c.blackHoleSize || 154);
    const holeRadius = holeSize * .5;
    const safeMargin = holeRadius + 16;
    const targetX = clamp(startX, safeMargin, arena.clientWidth - safeMargin);
    const requestedTargetY = Number(c.blackHoleTargetY || 104);
    const targetY = clamp(
      Math.max(requestedTargetY, safeMargin),
      safeMargin,
      Math.max(safeMargin, arena.clientHeight * .28)
    );

    const distance = Math.max(1, Math.hypot(targetX - startX, targetY - startY));
    const travelMs = Math.max(260, distance / Math.max(120, Number(c.blackHoleTravelSpeed || 760)) * 1000);

    const el = document.createElement('div');
    el.className = 'shooting-eltena-black-hole traveling';
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--eltena-bh-size', `${Number(c.blackHoleSize || 154)}px`);
    el.innerHTML = '<i></i><b></b><span></span>';
    arena.appendChild(el);
    positionUnit(el, startX, startY);

    state.eltenaBlackHole = {
      el,
      ownerId: c.id,
      phase: 'travel',
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      launchedAt: now,
      travelMs,
      activeFrom: 0,
      activeUntil: 0,
      durationMs: Number(c.blackHoleDurationMs || 8000),
      pullStrength: Number(c.blackHolePullStrength || 11.5),
      enemyStopRadius: Number(c.blackHoleEnemyStopRadius || 10),
      bossStopRadius: Number(c.blackHoleBossStopRadius || 18),

      // v313: キャラ定義側で指定した場合のみブラックホールにDoTを持たせる。
      // 未指定のエルテナは従来どおりダメージ0のまま。
      damageAtkMultiplier: Math.max(0, Number(c.blackHoleDamageAtkMultiplier || 0)),
      damageTickMs: Math.max(100, Number(c.blackHoleDamageTickMs || 250)),
      nextDamageAt: 0,
      damagePulseIndex: 0,
    };

    if (root) {
      root.classList.remove('eltena-black-hole-cast');
      void root.offsetWidth;
      root.classList.add('eltena-black-hole-cast');
      setTimeout(() => root.classList.remove('eltena-black-hole-cast'), 520);
    }
  }

  function isGojoPurpleFieldActive(now = performance.now()) {
    return !!(
      state &&
      state.gojoPurpleField &&
      now < Number(state.gojoPurpleField.activeUntil || 0)
    );
  }

  function isEnemyPullFieldActive(now = performance.now()) {
    // エルテナのブラックホールだけが盤面全体の敵AIを停止する。
    // build565以降のマグダレーナULTは、命中地点の範囲内で捕捉した敵だけを個別停止する。
    return !!(
      state &&
      state.eltenaBlackHole &&
      state.eltenaBlackHole.phase === 'active' &&
      now < Number(state.eltenaBlackHole.activeUntil || 0)
    );
  }

  function pullPointTowardBlackHole(obj, bh, dt, stopRadius, bounds) {
    if (!obj || !bh) return;
    const dx = bh.x - Number(obj.x || 0);
    const dy = bh.y - Number(obj.y || 0);
    const dist = Math.max(0.001, Math.hypot(dx, dy));

    if (dist <= stopRadius) return;

    // ブラックホール中心へ強く収束。
    // stopRadiusは「外周」ではなく中心付近のごく小さな重なり幅として使う。
    const follow = 1 - Math.exp(-Math.max(0.1, bh.pullStrength) * dt);

    // 距離が遠いほど大きく引き、中心付近では自然に減速。
    // 1フレーム最低移動量も持たせて、敵AIの移動に負けないようにする。
    const desired = Math.max(0, dist - stopRadius);
    const minStep = Math.min(desired, 180 * dt);
    const move = Math.min(desired, Math.max(dist * follow, minStep));

    obj.x += dx / dist * move;
    obj.y += dy / dist * move;

    if (bounds) {
      obj.x = clamp(obj.x, bounds.minX, bounds.maxX);
      obj.y = clamp(obj.y, bounds.minY, bounds.maxY);
    }
  }

  function updateEltenaBlackHole(dt, now) {
    if (!state || !state.eltenaBlackHole) return;

    const bh = state.eltenaBlackHole;
    const arena = document.getElementById('shooting-arena');
    if (!arena || !bh.el || !bh.el.isConnected) {
      clearEltenaBlackHole();
      return;
    }

    if (bh.phase === 'travel') {
      const p = clamp((now - bh.launchedAt) / Math.max(1, bh.travelMs), 0, 1);
      // 少し加速して敵側の壁へ飛ぶ。
      const eased = 1 - Math.pow(1 - p, 3);
      bh.x = bh.startX + (bh.targetX - bh.startX) * eased;
      bh.y = bh.startY + (bh.targetY - bh.startY) * eased;
      positionUnit(bh.el, bh.x, bh.y);

      if (p >= 1) {
        bh.phase = 'active';
        bh.x = bh.targetX;
        bh.y = bh.targetY;
        bh.activeFrom = now;
        bh.activeUntil = now + bh.durationMs;
        bh.nextDamageAt = now;
        deferAllEnemyAttackResume(bh.activeUntil);
        bh.el.classList.remove('traveling');
        bh.el.classList.add('active');
        document.getElementById(ROOT_ID)?.classList.add('eltena-black-hole-active');
        positionUnit(bh.el, bh.x, bh.y);
      }
      return;
    }

    if (now >= bh.activeUntil) {
      bh.el.classList.add('ending');
      document.getElementById(ROOT_ID)?.classList.remove('eltena-black-hole-active');

      (state.normalEnemies || []).forEach(enemy => {
        if (!enemy) return;
        if (enemy.el) enemy.el.classList.remove('eltena-pulled');
        if (enemy.hpEl) enemy.hpEl.classList.remove('eltena-pulled');
        positionMiniEnemyHp(enemy);
      });
      (state.facelessObjects || []).forEach(obj => {
        if (obj?.el) obj.el.classList.remove('eltena-pulled');
        if (obj?.hpEl) obj.hpEl.classList.remove('eltena-pulled');
      });
      document.getElementById(BOSS_ID)?.classList.remove('eltena-pulled');

      const doomed = bh.el;
      state.eltenaBlackHole = null;
      setTimeout(() => doomed.isConnected && doomed.remove(), 320);
      return;
    }

    const w = arena.clientWidth;
    const h = arena.clientHeight;

    // v313: blackHoleDamageAtkMultiplier が設定されたキャラだけ継続ダメージ。
    // multiplier は「ULT全時間での合計ATK倍率」として扱う。
    if (bh.damageAtkMultiplier > 0 && now >= Number(bh.nextDamageAt || 0)) {
      const tickMs = Math.max(100, Number(bh.damageTickMs || 250));
      const totalTicks = Math.max(1, Math.ceil(Number(bh.durationMs || 1) / tickMs));
      const owner = SHOOTING_CHARACTERS && SHOOTING_CHARACTERS[Number(bh.ownerId)];
      const ownerAtk = Math.max(0, Number(owner?.atk || getCurrentCharacter()?.atk || 0));
      const damage = ownerAtk * Number(bh.damageAtkMultiplier || 0) / totalTicks;

      // フレーム落ちでも多重tickを一気に処理せず、次tickを現在時刻基準で予約。
      bh.nextDamageAt = now + tickMs;
      bh.damagePulseIndex = Number(bh.damagePulseIndex || 0) + 1;

      if (damage > 0) {
        (state.normalEnemies || []).forEach(enemy => {
          if (!enemy || !enemy.el || enemy.hp <= 0) return;
          damageNormalEnemy(enemy, applyHitComboDamage(damage), now, false);
        });
        state.normalEnemies = (state.normalEnemies || []).filter(enemy => enemy && enemy.hp > 0);
        if (isNormalBattle()) evaluateNormalMission(now);

        (state.facelessObjects || []).forEach(obj => {
          if (!obj || !obj.el || obj.hp <= 0) return;
          damageFacelessObject(obj, applyHitComboDamage(damage), now);
        });

        if (!isNormalBattle() && state.boss && state.boss.hp > 0) {
          const applied = Math.min(state.boss.hp, Math.max(0, applyHitComboDamage(damage)));
          state.boss.hp = Math.max(0, state.boss.hp - applied);
          if ((bh.damagePulseIndex % 2) === 1) {
            createHit(
              state.boss.x + (Math.random() - .5) * 22,
              state.boss.y + (Math.random() - .5) * 18,
              false
            );
            flashBossHit(false);
          }
          if (!isRaidStage() || shouldRenderRaidBossHitVisual(now, 'number')) {
            showBossDamageNumber(applied, false);
          }
          if (!addScoreAttackDamageScore(applied)) addLegacyCombatScore(Math.round(applied * 100));
          updateBossPhase();
          if (state.boss.hp <= 0) beginBossDefeat();
        }
        renderHud();
      }
    }

    // 通常敵は全員吸引。ダメージはキャラ定義で指定された場合のみ発生。
    (state.normalEnemies || []).forEach(enemy => {
      if (!enemy || !enemy.el || enemy.hp <= 0) return;
      pullPointTowardBlackHole(enemy, bh, dt, bh.enemyStopRadius, {
        minX: 34, maxX: w - 34, minY: 42, maxY: h - 46
      });
      // baseX/baseY は書き換えない。
      // ここを書き換えるとULT終了後も敵の通常待機位置が画面上部に固定されてしまう。
      enemy.el.classList.add('eltena-pulled');
      if (enemy.hpEl) enemy.hpEl.classList.add('eltena-pulled');
      positionUnit(enemy.el, enemy.x, enemy.y);
      positionMiniEnemyHp(enemy);
    });

    // SPECIAL EVENTのHP付きOBJECTも敵として吸引対象。
    // 大型/小型/召喚物を問わず、戦闘フィールド上の敵を同じ重力場で扱う。
    (state.facelessObjects || []).forEach(obj => {
      if (!obj || !obj.el || obj.hp <= 0) return;
      pullPointTowardBlackHole(obj, bh, dt, bh.enemyStopRadius, {
        minX: 34, maxX: w - 34, minY: 42, maxY: h - 46
      });
      obj.el.classList.add('eltena-pulled');
      if (obj.hpEl) obj.hpEl.classList.add('eltena-pulled');
      positionUnit(obj.el, obj.x, obj.y);
      positionUnit(obj.hpEl, obj.x, obj.y + 56);
    });

    // ボスも「すべての敵」に含めて吸引する。
    if (!isNormalBattle() && state.boss && state.boss.hp > 0) {
      deferBossAttackResume(Number(bh.activeUntil || now));
      pullPointTowardBlackHole(state.boss, bh, dt, bh.bossStopRadius, {
        minX: 54, maxX: w - 54, minY: 52, maxY: h * .74
      });
      const bossEl = document.getElementById(BOSS_ID);
      if (bossEl) {
        bossEl.classList.add('eltena-pulled');
        positionUnit(bossEl, state.boss.x, state.boss.y);
      }
    }
  }

  function clearGojoPurpleField() {
    if (!state) return;

    // 捕捉対象だけに付与した拘束状態を解除する。
    (state.normalEnemies || []).forEach(enemy => {
      if (!enemy) return;
      if (enemy.el) enemy.el.classList.remove('gojo-purple-pulled');
      if (enemy.hpEl) enemy.hpEl.classList.remove('gojo-purple-pulled');
      if (Number(enemy.gojoPurpleFreezeUntil || 0) > 0) {
        enemy.gojoPurpleFreezeUntil = 0;
        // 吸引後の位置から自然にAIを再開させる。
        enemy.baseX = Number(enemy.x || enemy.baseX || 0);
        enemy.baseY = Number(enemy.y || enemy.baseY || 0);
      }
    });
    (state.facelessObjects || []).forEach(obj => {
      if (!obj) return;
      if (obj.el) obj.el.classList.remove('gojo-purple-pulled');
      if (obj.hpEl) obj.hpEl.classList.remove('gojo-purple-pulled');
      obj.gojoPurpleFreezeUntil = 0;
    });
    document.getElementById(BOSS_ID)?.classList.remove('gojo-purple-pulled');

    state.gojoPurpleBossFreezeUntil = 0;
    state.gojoPurpleField = null;
  }

  function updateGojoPurpleField(dt, now) {
    if (!state || !state.gojoPurpleField) return;

    const field = state.gojoPurpleField;
    const arena = document.getElementById('shooting-arena');
    if (!arena) {
      clearGojoPurpleField();
      return;
    }

    if (now >= Number(field.activeUntil || 0)) {
      clearGojoPurpleField();
      return;
    }

    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const enemyIds = Array.isArray(field.capturedEnemyUids) ? field.capturedEnemyUids : [];
    const objectIds = Array.isArray(field.capturedObjectUids) ? field.capturedObjectUids : [];

    // build565: 命中時に範囲内だった敵だけを吸引。
    // 盤面全体を止めるのではなく、捕捉された対象だけが7秒間行動停止する。
    (state.normalEnemies || []).forEach(enemy => {
      if (!enemy || !enemy.el || enemy.hp <= 0) return;
      if (!enemyIds.includes(String(enemy.uid || ''))) return;

      enemy.gojoPurpleFreezeUntil = Math.max(
        Number(enemy.gojoPurpleFreezeUntil || 0),
        Number(field.activeUntil || 0)
      );
      pullPointTowardBlackHole(enemy, field, dt, field.enemyStopRadius, {
        minX: 34, maxX: w - 34, minY: 42, maxY: h - 46
      });
      enemy.el.classList.add('gojo-purple-pulled');
      if (enemy.hpEl) enemy.hpEl.classList.add('gojo-purple-pulled');
      positionUnit(enemy.el, enemy.x, enemy.y);
      positionMiniEnemyHp(enemy);
    });

    (state.facelessObjects || []).forEach(obj => {
      if (!obj || !obj.el || obj.hp <= 0) return;
      if (!objectIds.includes(String(obj.uid || ''))) return;

      obj.gojoPurpleFreezeUntil = Math.max(
        Number(obj.gojoPurpleFreezeUntil || 0),
        Number(field.activeUntil || 0)
      );
      pullPointTowardBlackHole(obj, field, dt, field.enemyStopRadius, {
        minX: 34, maxX: w - 34, minY: 42, maxY: h - 46
      });
      obj.el.classList.add('gojo-purple-pulled');
      if (obj.hpEl) obj.hpEl.classList.add('gojo-purple-pulled');
      positionUnit(obj.el, obj.x, obj.y);
      if (obj.hpEl) positionUnit(obj.hpEl, obj.x, obj.y + 56);
    });

    if (field.capturedBoss && !isNormalBattle() && state.boss && state.boss.hp > 0) {
      state.gojoPurpleBossFreezeUntil = Math.max(
        Number(state.gojoPurpleBossFreezeUntil || 0),
        Number(field.activeUntil || 0)
      );
      deferBossAttackResume(Number(field.activeUntil || now));
      pullPointTowardBlackHole(state.boss, field, dt, field.bossStopRadius, {
        minX: 54, maxX: w - 54, minY: 52, maxY: h * .74
      });
      const bossEl = document.getElementById(BOSS_ID);
      if (bossEl) {
        bossEl.classList.add('gojo-purple-pulled');
        positionUnit(bossEl, state.boss.x, state.boss.y);
      }
    }
  }

  function useEltenaUlt(c) {
    if (!state || state.ended || state.finishing) return;
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-eltena');
    createEltenaBlackHole(c);
  }


  // ============================================================
  // グレシャ：焼野原
  // 敵陣へ固定の火属性ダメージフィールドを6秒間展開。
  // 範囲内の敵だけへ1秒ごとにATK×1.5。
  // ============================================================
  function clearGreshaBurnField() {
    if (!state || !state.greshaBurnField) return;
    if (state.greshaBurnField.el) state.greshaBurnField.el.remove();
    state.greshaBurnField = null;
  }

  function createGreshaBurnField(c) {
    if (!state || state.ended || state.finishing) return;

    clearGreshaBurnField();

    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const w = Math.max(1, Number(arena.clientWidth || 1));
    const h = Math.max(1, Number(arena.clientHeight || 1));
    const width = w * Math.max(.2, Math.min(.96, Number(c.burnFieldWidthRate || .84)));
    const height = h * Math.max(.12, Math.min(.65, Number(c.burnFieldHeightRate || .42)));
    const cx = w * .5;
    const cy = h * Math.max(.12, Math.min(.48, Number(c.burnFieldCenterYRate || .27)));

    const el = document.createElement('div');
    el.className = 'shooting-gresha-burn-field';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <span class="gresha-burn-glow"></span>
      <span class="gresha-burn-ground"></span>
      <i class="gresha-ember e1"></i>
      <i class="gresha-ember e2"></i>
      <i class="gresha-ember e3"></i>
      <i class="gresha-ember e4"></i>
      <i class="gresha-ember e5"></i>
      <i class="gresha-ember e6"></i>
    `;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    positionUnit(el, cx, cy);
    arena.appendChild(el);

    const now = performance.now();
    state.greshaBurnField = {
      el,
      x: cx,
      y: cy,
      width,
      height,
      activeUntil: now + Math.max(1000, Number(c.burnFieldDurationMs || 6000)),
      tickMs: Math.max(100, Number(c.burnFieldTickMs || 1000)),
      nextTickAt: now + Math.max(100, Number(c.burnFieldTickMs || 1000)),
      damage: Math.max(0, Number(c.atk || 0) * Number(c.burnFieldAtkMultiplier || 1.5)),
      attackElement: normalizeCombatElement(c.element) || 'fire',
      pulseIndex: 0,
    };
  }

  function isPointInsideGreshaField(field, x, y) {
    if (!field) return false;
    const halfW = Number(field.width || 0) * .5;
    const halfH = Number(field.height || 0) * .5;
    return (
      Number(x || 0) >= Number(field.x || 0) - halfW &&
      Number(x || 0) <= Number(field.x || 0) + halfW &&
      Number(y || 0) >= Number(field.y || 0) - halfH &&
      Number(y || 0) <= Number(field.y || 0) + halfH
    );
  }

  function pulseGreshaBurnField(field) {
    if (!field || !field.el) return;
    field.el.classList.remove('tick');
    void field.el.offsetWidth;
    field.el.classList.add('tick');
    setTimeout(() => {
      if (field.el) field.el.classList.remove('tick');
    }, 280);
  }

  function damageBossFromGreshaField(field, now) {
    if (!state || !field || !state.boss || state.boss.hp <= 0) return;
    if (!isPointInsideGreshaField(field, state.boss.x, state.boss.y)) return;

    const targetElement = getCombatTargetElement(state.boss);
    const finalDamage = applyElementDamage(
      field.damage,
      field.attackElement,
      targetElement
    );
    const applied = Math.min(state.boss.hp, Math.max(0, Number(finalDamage || 0)));
    if (applied <= 0) return;

    state.boss.hp = Math.max(0, state.boss.hp - applied);
    showBossDamageNumber(applied, false, getElementDamageReaction(field.attackElement, targetElement));
    createHit(state.boss.x + (Math.random() - .5) * 20, state.boss.y + (Math.random() - .5) * 14, false);
    flashBossHit(false);
    if (!addScoreAttackDamageScore(applied)) addLegacyCombatScore(Math.round(applied * 100));
    updateBossPhase();
    if (state.boss.hp <= 0) beginBossDefeat();
  }

  function updateGreshaBurnField(now) {
    if (!state || !state.greshaBurnField) return;
    const field = state.greshaBurnField;

    if (now >= Number(field.activeUntil || 0)) {
      clearGreshaBurnField();
      return;
    }
    if (now < Number(field.nextTickAt || 0)) return;

    field.nextTickAt += field.tickMs;
    pulseGreshaBurnField(field);

    if (isNormalBattle()) {
      (state.normalEnemies || []).slice().forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;
        if (!isPointInsideGreshaField(field, enemy.x, enemy.y)) return;

        const targetElement = getCombatTargetElement(enemy);
        const finalDamage = applyElementDamage(
          field.damage,
          field.attackElement,
          targetElement
        );
        damageNormalEnemy(enemy, finalDamage, now, false, getElementDamageReaction(field.attackElement, targetElement));
      });
      state.normalEnemies = (state.normalEnemies || []).filter(enemy => enemy && enemy.hp > 0);
      evaluateNormalMission(now);
    } else {
      // 特殊ステージ内の破壊対象も「敵」として範囲内なら燃える。
      (state.facelessObjects || []).slice().forEach(obj => {
        if (!obj || !obj.el || obj.hp <= 0) return;
        if (!isPointInsideGreshaField(field, obj.x, obj.y)) return;

        const targetElement = getCombatTargetElement(obj, state.boss?.element);
        const finalDamage = applyElementDamage(
          field.damage,
          field.attackElement,
          targetElement
        );
        damageFacelessObject(obj, finalDamage, now, getElementDamageReaction(field.attackElement, targetElement));
      });

      damageBossFromGreshaField(field, now);
    }

    renderHud();
  }

  function useGreshaUlt(c) {
    if (!state || state.ended || state.finishing) return;
    showUltCut(c.ultName || '焼野原', c.effectKey);
    ultScreenFlash('ult-flash-fire');
    createGreshaBurnField(c);
  }

  // ============================================================
  // ミモザ：ミモザの贈り物
  // ============================================================
  // 盤面のランダム位置に恩恵アイテムを3つ設置する。
  // 3つは常に固定の異なる効果（ATK UP / HP回復 / 無敵）で、拾うまで
  // フィールドに残り続ける（連続でULTを使えば未回収分に積み上がる）。
  // 効果は「拾った瞬間にアクティブだったmember」だけに紐づき、
  // 交代先やベンチのキャラには一切引き継がれない。
  function useMimosaUlt(c) {
    if (!state || state.ended || state.finishing) return;
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-mimosa');
    spawnMimosaItems(c);
    state.ultLockUntil = performance.now() + 300;
    renderHud();
  }

  function spawnMimosaItems(c) {
    if (!state) return;
    const arena = document.getElementById('shooting-arena');
    const layer = document.getElementById('shooting-collectible-layer');
    if (!arena || !layer) return;

    const w = arena.clientWidth;
    const h = arena.clientHeight;

    const defs = [
      {
        kind: 'atk',
        cls: 'mimosa-item-atk',
        label: 'ATK UP',
        detail: `ATK ×${Number(c.itemAtkMultiplier || 1.3).toFixed(1)} / ${Math.round(Number(c.itemAtkDurationMs || 10000) / 1000)}秒`,
        atkBuffMultiplier: Number(c.itemAtkMultiplier || 1.3),
        atkBuffDurationMs: Number(c.itemAtkDurationMs || 10000),
      },
      {
        kind: 'heal',
        cls: 'mimosa-item-heal',
        label: 'HP HEAL',
        detail: `HP ${Math.round(Number(c.itemHealPercent || 0.30) * 100)}%回復`,
        healPercent: Number(c.itemHealPercent || 0.30),
      },
      {
        kind: 'invincible',
        cls: 'mimosa-item-invincible',
        label: 'INVINCIBLE',
        detail: `${Math.round(Number(c.itemInvincibleDurationMs || 3000) / 1000)}秒無敵`,
        invincibleDurationMs: Number(c.itemInvincibleDurationMs || 3000),
      },
    ];

    defs.forEach(def => {
      const el = document.createElement('div');
      el.className = `shooting-mimosa-item ${def.cls}`;
      el.innerHTML = '<i></i>';
      layer.appendChild(el);

      // 盤面内のランダム位置。HUDや自機初期位置に極端に近づかない範囲に収める。
      const x = w * (0.16 + Math.random() * 0.68);
      const y = h * (0.22 + Math.random() * 0.48);

      const item = {
        uid: `mimosa_${def.kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        el, x, y,
        kind: def.kind,
        label: def.label,
        detail: def.detail,
        atkBuffMultiplier: def.atkBuffMultiplier,
        atkBuffDurationMs: def.atkBuffDurationMs,
        healPercent: def.healPercent,
        invincibleDurationMs: def.invincibleDurationMs,
      };
      state.mimosaItems.push(item);
      positionUnit(el, x, y);
    });
  }

  function updateMimosaItems() {
    if (!state || !state.mimosaItems || !state.mimosaItems.length) return;
    const playerCore = document.getElementById('shooting-player-core');
    if (!playerCore) return;
    const coreRect = playerCore.getBoundingClientRect();

    state.mimosaItems = state.mimosaItems.filter(item => {
      if (!item || !item.el) return false;
      if (rectsHit(item.el.getBoundingClientRect(), coreRect, -5, -3)) {
        applyMimosaItemEffect(item, performance.now());
        item.el.remove();
        return false;
      }
      return true;
    });
  }

  function applyMimosaItemEffect(item, now) {
    if (!item) return;
    // 取得した瞬間にアクティブだったmemberだけに効果を紐づける。
    // このmemberオブジェクトはパーティ内の特定キャラID専用の実体なので、
    // 交代しても他メンバーのmemberオブジェクトへは一切波及しない。
    const member = getActiveMember();
    if (!member) return;

    if (item.kind === 'atk') {
      member.atkBuffMultiplier = Number(item.atkBuffMultiplier || 1.3);
      member.atkBuffUntil = now + Number(item.atkBuffDurationMs || 10000);
    } else if (item.kind === 'heal') {
      const healAmount = Math.round(Number(member.hpMax || 0) * Number(item.healPercent || 0.30));
      member.hp = Math.min(member.hpMax, member.hp + healAmount);
    } else if (item.kind === 'invincible') {
      member.invincibleUntil = now + Number(item.invincibleDurationMs || 3000);
    }

    showShootingItemEffectNotice(item.label, item.detail);
    renderHud();
  }

  function gameLoop(ts) {
    if (!state || !state.running || state.ended || state.finishing || state.countdown) return;

    if (state.paused) {
      // メニュー表示中はゲーム進行を完全停止。
      // RAFだけ継続して、復帰時のdtジャンプを防ぐ。
      prevTs = ts;
      rafId = requestAnimationFrame(gameLoop);
      return;
    }

    if (state.ultCutinActive) {
      // ULTカットイン中はプレイヤー・敵・弾・DoT・召喚物を含めて完全停止。
      // RAFだけ継続し、再開時のdtジャンプを防ぐ。
      prevTs = ts;
      renderHud();
      rafId = requestAnimationFrame(gameLoop);
      return;
    }

    // ノアULT落雷中：盤面上の敵全体の移動・攻撃を停止。
    // ステージ時間と新規スポーン判定だけは進める。
    if (Number(state.noahMovementFreezeUntil || 0) > 0) {
      if (ts < Number(state.noahMovementFreezeUntil || 0)) {
        if (checkBattleTimeLimit(ts)) return;

        const noahFreezeDt = Math.min(0.032, Math.max(0, (ts - (prevTs || ts)) / 1000));
        prevTs = ts;

        if (!state.koTransition) updateMovement(noahFreezeDt, ts, true);

        if (isNormalBattle()) {
          spawnNormalEnemies(ts);
        }
        deferAllEnemyAttackResume(Number(state.noahMovementFreezeUntil || ts));

        renderHud();
        if (!state.ended) rafId = requestAnimationFrame(gameLoop);
        return;
      }
      state.noahMovementFreezeUntil = 0;
    }


    if (checkBattleTimeLimit(ts)) return;

    const dt = Math.min(0.032, Math.max(0, (ts - (prevTs || ts)) / 1000));
    prevTs = ts;
    if (!isScoreAttackStage() && state.combo > 0 && Number(state.lastComboHitAt || 0) > 0 && ts - Number(state.lastComboHitAt || 0) >= HIT_COMBO_TIMEOUT_MS) {
      resetCombo(true);
    }
    if (!state.koTransition) updateMovement(dt, ts);
    updateChapter6Barriers(ts);
    updateMitoSummon(dt, ts);
    updateGreshaBurnField(ts);
    updateClarineDecoys(dt, ts);
    updateIgnisFireWheel(ts);
    updateIgnisBurns(ts);
    updateRoseFlower(ts);
    updateWolfAtkField(ts);
    updateToyfelBlackHoleField(ts);
    if (state.ignisLaserEl && (
      String(getCurrentCharacter()?.shotType || '') !== 'laser' ||
      ts >= Number(state.ignisLaserHideAt || 0)
    )) {
      hideIgnisLaser();
    }
    const ultLocked = ts < (state.ultLockUntil || 0);
    const bossGojoFrozen = ts < Number(state.gojoPurpleBossFreezeUntil || 0);
    const bossPullFrozen = isEnemyPullFieldActive(ts);
    const bossGrabbed = ts < (state.bossGrabUntil || 0) || bossGojoFrozen || bossPullFrozen;
    const bossStunned = ts < (state.bossStunUntil || 0);
    if (bossGojoFrozen) {
      // 拘束中は弾を生成しない。さらに発射時計を拘束終了へ送って、
      // 解除フレームで停止中の射撃をまとめて実行しないようにする。
      deferBossAttackResume(Number(state.gojoPurpleBossFreezeUntil || ts));
    }
    if (bossPullFrozen) {
      deferBossAttackResume(Number(state.eltenaBlackHole?.activeUntil || ts));
    }
    if (ts < Number(state.bossGrabUntil || 0)) {
      deferBossAttackResume(Number(state.bossGrabUntil || ts));
    }
    if (!state.phaseTransition && !state.koTransition && !ultLocked) {
      // 長いULT演出で通常射撃だけを止めたい場合は playerShotLockUntil を使う。
      // 敵の移動・攻撃は止めない。敵の行動停止は専用のfreeze/stun処理だけで行う。
      if (ts >= Number(state.playerShotLockUntil || 0)) firePlayer(ts);
      if (isNormalBattle()) {
        spawnNormalEnemies(ts);
        updateNormalEnemies(dt, ts);
      } else {
        if (hasBossAdds()) {
          spawnBossAdds(ts);
          updateNormalEnemies(dt, ts);
        }
        if (!bossGrabbed && !bossStunned) {
          fireBoss(ts);
        }
      }
    }

    // エルテナULTは通常の敵移動が終わった後に吸引を適用。
    // これによりAIの横移動よりブラックホールの集敵を優先する。
    updateEltenaBlackHole(dt, ts);
    updateGojoPurpleField(dt, ts);

    // 敵の位置更新後、当たり判定で使うDOM矩形を一度だけまとめて取得。
    // contact/projectileの間でDOM read/writeを往復させない。
    const frameLayout = captureCombatFrameLayout();
    updateEnemyContactCollisions(ts, frameLayout);
    updateProjectiles(dt, ts, frameLayout);
    // 同じ更新済み座標を使って、検証ステージの敵弾だけを一枚へ描画する。
    renderCanvasEnemyBullets();

    // SCORE ATTACKでは無関係なイベント/CH04系の更新を毎フレーム呼ばない。
    // キャラクター固有処理（Arno/Mimosa等）はゲーム性に関わるので維持。
    if (!isScoreAttackStage()) {
      updateFacelessObjects(dt, ts);
      updateAmbushStageMechanics(dt, ts);
      updateChapter4FinalItem(ts);
      updateChapter43Mechanics(ts);
      updateFacelessStageMechanics(ts);
      updateChapter4ShrinkWalls(ts);
      updateCollectibles(dt);
    }
    updateArnoAura(ts);
    updateMimosaItems();
    if (isNormalBattle()) evaluateNormalMission(ts);

    // SCORE ATTACKのHUDは10fpsに抑える。ゲーム本体の当たり判定は60fpsのまま。
    if (isScoreAttackStage()) {
      if (ts - Number(state.scoreAttackLastHudRenderAt || 0) >= 100) {
        state.scoreAttackLastHudRenderAt = ts;
        renderHud();
      }
    } else {
      renderHud();
    }

    if (!state.ended) rafId = requestAnimationFrame(gameLoop);
  }


  function getSelectedBossImage() {
    // SCORE ATTACKだけ専用ボス画像に差し替える。
    // 同じenemyIdを使う他ステージ（楽園 -ノア-等）の画像は変更しない。
    if (isScoreAttackStage()) return 'images/scoata_boss.webp';
    return String(BOSS && BOSS.image || '');
  }

  function getBossIntroMeta() {
    if (!selectedStage || selectedStage.type !== 'boss' || !BOSS) return null;

    const battleImage = getSelectedBossImage();
    const fileName = battleImage.split('/').pop() || '';
    const lower = fileName.toLowerCase();

    // ファイル名を基準にイントロ画像・名称を判定。
    // battle画像とbattle_start画像を同じ命名規則に統一する。
    let introImage = '';
    // ステージ側で明示したイントロ画像を最優先する。
    // CH04-04のように専用素材が指定されている場合、命名推測で上書きしない。
    if (isScoreAttackStage()) {
      // SCORE ATTACK専用イントロ。バトル中のボス画像は従来のscoata_boss.webpを維持。
      introImage = 'images/score_attack_intro.webp';
    } else if (selectedStage.introImage) {
      introImage = String(selectedStage.introImage);
    } else if (/_battle\.(webp|png|jpg|jpeg)$/i.test(battleImage)) {
      introImage = battleImage.replace(/_battle\.(webp|png|jpg|jpeg)$/i, '_battle_start.$1');
    }

    const meta = {
      image: introImage,
      kicker: 'BOSS ENCOUNTER',
      title: BOSS.name || 'BOSS',
      sub: '',
      key: lower,
    };

    if (isAmbushStage()) {
      meta.kicker = 'EMERGENCY ENCOUNTER';
      meta.title = '???';
      meta.sub = 'OVERSEER VARIANT';
      meta.image = selectedStage.introImage || 'images/remnant_01_blk_battle_start.webp';
    } else if (isScoreAttackStage()) {
      meta.kicker = 'SCORE ATTACK';
      meta.title = 'すこあちゃん';
      meta.sub = selectedStage.difficultyLabel || '';
    } else if (isNoahStage()) {
      meta.kicker = 'SPECIAL STAGE';
      meta.title = '理想郷：ノア';
      meta.sub = '楽園 -ノア-';
      meta.image = selectedStage.introImage || 'images/nore_battle_start.webp';
    } else if (lower.includes('remnant_01')) {
      meta.kicker = 'REMNANT 01';
      meta.title = 'オーバーシア';
      meta.sub = 'OVERSEER';
    } else if (lower.includes('remnant_02')) {
      meta.kicker = 'REMNANT 02';
      meta.title = 'イリシュ';
      meta.sub = 'IRISH';
    } else if (lower.includes('remnant_03')) {
      meta.kicker = 'REMNANT 03';
      meta.title = 'リヴィア';
      meta.sub = 'RIVIA';
    } else if (lower.includes('remnant_04') || lower.includes('enemy_sakiel')) {
      meta.kicker = 'REMNANT 04';
      meta.title = 'サキエル';
      meta.sub = 'SAKIEL';
    } else if (lower.includes('remnant_06')) {
      meta.kicker = 'REMNANT 06';
      meta.title = 'レムナント06';
      meta.sub = 'LIGHT';
    } else if (lower.includes('faceless')) {
      meta.kicker = 'SPECIAL EVENT';
      meta.title = '無貌の天使';
      meta.sub = selectedStage.difficultyLabel || 'FACELESS';
      meta.image = selectedStage.introImage || 'images/enemy_faceless_battle_start.webp';
    } else {
      meta.sub = selectedStage.mission?.text || '';
    }

    return meta.image ? meta : null;
  }

  async function playBossStageIntro(onComplete) {
    const meta = getBossIntroMeta();

    // 通常ステージは従来通り、そのままカウントダウンへ。
    if (!meta) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    const root = document.getElementById(ROOT_ID);
    if (!root) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    await preloadShootingImage(meta.image, 7000, true);

    if (!document.getElementById(ROOT_ID) || !state || state.ended) return;

    root.querySelectorAll('.shooting-boss-intro').forEach(el => el.remove());

    const intro = document.createElement('div');
    intro.className = 'shooting-boss-intro';
    intro.setAttribute('aria-hidden', 'true');
    intro.innerHTML = `
      <div class="shooting-boss-intro-media">
        <img class="shooting-boss-intro-image" src="${meta.image}" alt="">
        <div class="shooting-boss-intro-glitch g1"></div>
        <div class="shooting-boss-intro-glitch g2"></div>
        <div class="shooting-boss-intro-glitch g3"></div>
      </div>
      <div class="shooting-boss-intro-vignette"></div>
      <div class="shooting-boss-intro-noise"></div>
      <div class="shooting-boss-intro-scan"></div>
      <div class="shooting-boss-intro-flash"></div>
      <div class="shooting-boss-intro-copy">
        <small>${meta.kicker}</small>
        <strong>${meta.title}</strong>
        <span>${meta.sub || ''}</span>
      </div>
      <div class="shooting-boss-intro-line line-a"></div>
      <div class="shooting-boss-intro-line line-b"></div>
    `;

    root.appendChild(intro);

    // 背景画像と同じ画像をglitch stripにも使用。
    intro.querySelectorAll('.shooting-boss-intro-glitch').forEach(glitch => {
      glitch.style.backgroundImage = `url("${meta.image}")`;
    });

    requestAnimationFrame(() => {
      intro.classList.add('show', 'shake-entry');
    });

    // 登場直後：画面全体へ短い衝撃。長く揺らさず、余韻だけ残す。
    setTimeout(() => {
      if (intro.isConnected) intro.classList.remove('shake-entry');
    }, 430);

    // タイトルが立ち上がる瞬間に二度目の小さなシェイク。
    setTimeout(() => {
      if (intro.isConnected) intro.classList.add('shake-title');
    }, 650);

    // 中盤で一瞬だけ強めのノイズ/glitchを出す。
    setTimeout(() => {
      if (intro.isConnected) intro.classList.add('glitch-burst');
    }, 720);

    setTimeout(() => {
      if (intro.isConnected) intro.classList.remove('shake-title');
    }, 1010);

    setTimeout(() => {
      if (intro.isConnected) intro.classList.remove('glitch-burst');
    }, 1050);

    // タイトルを少し長めに残し、余韻を保ったままゆっくり戦闘画面へ溶かす。
    setTimeout(() => {
      if (intro.isConnected) intro.classList.add('out');
    }, 2750);

    // フェードが完全に抜けてから READY カウントダウンへ。
    setTimeout(() => {
      intro.remove();
      if (typeof onComplete === 'function') onComplete();
    }, 3650);
  }


  function closeDailyStageSelect() {
    document.getElementById('shooting-daily-stage-select')?.remove();
  }

  function getDailyWeekdayKey() {
    let weekday = '';
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tokyo',
        weekday: 'short',
      }).formatToParts(new Date());
      weekday = String(parts.find(part => part.type === 'weekday')?.value || '');
    } catch (_) {
      weekday = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
    }

    return {
      Mon: 'mon',
      Tue: 'tue',
      Wed: 'wed',
      Thu: 'thu',
      Fri: 'fri',
      Sat: 'sat',
      Sun: 'sun',
    }[weekday] || 'sun';
  }

  function getDailyStageId(level) {
    const normalizedLevel = level === 'advanced' ? 'advanced' : 'intermediate';
    return `shooting_daily_${getDailyWeekdayKey()}_${normalizedLevel}`;
  }

  function getDailySelectRewardInfo() {
    if (typeof window.getDailyWeekdayReward === 'function') {
      const info = window.getDailyWeekdayReward();
      if (info && info.reward) return info;
    }
    return {
      reward: {
        id: 'kyoumei_stone',
        name: '共鳴石',
        img: 'images/item_kyoumeistone.webp',
      },
      random: false,
      weekday: '',
    };
  }

  function getDailySelectAttempt(level) {
    if (typeof window.getDailyAttemptState === 'function') {
      const state = window.getDailyAttemptState(level);
      if (state) return state;
    }
    return { remaining: 1, max: 1 };
  }

  function refreshDailyStageSelect() {
    const overlay = document.getElementById('shooting-daily-stage-select');
    if (!overlay) return;

    const info = getDailySelectRewardInfo();
    const reward = info.reward || {};

    ['intermediate', 'advanced'].forEach(level => {
      const amount = level === 'advanced' ? 2 : 1;
      const attempt = getDailySelectAttempt(level);
      const row = overlay.querySelector(`[data-daily-level="${level}"]`);
      if (!row) return;

      const materialSlot = row.querySelector('[data-daily-material-slot]');
      const remaining = row.querySelector('[data-daily-remaining]');

      if (materialSlot) {
        if (info.random && Array.isArray(info.rewards) && info.rewards.length) {
          materialSlot.classList.add('is-random-list');
          materialSlot.innerHTML = info.rewards.map(item => `
            <span class="shooting-daily-stage-random-item" title="${item.name || ''}">
              <img src="${item.img || ''}" alt="${item.name || ''}">
            </span>
          `).join('');
          materialSlot.setAttribute(
            'aria-label',
            `ランダム報酬候補：${info.rewards.map(item => item.name || '').filter(Boolean).join('、')} から ${amount}個`
          );
        } else {
          materialSlot.classList.remove('is-random-list');
          materialSlot.innerHTML = `
            <img src="${reward.img || 'images/item_kyoumeistone.webp'}" alt="${reward.name || 'デイリー報酬'}">
            <b>×${amount}</b>
          `;
          materialSlot.setAttribute('aria-label', `${reward.name || 'デイリー報酬'} ${amount}個`);
        }
      }
      if (remaining) remaining.textContent = `残り ${Math.max(0, Number(attempt.remaining || 0))} / ${Math.max(1, Number(attempt.max || 1))}`;

      const exhausted = Number(attempt.remaining || 0) <= 0;
      row.classList.toggle('is-exhausted', exhausted);
      row.setAttribute('aria-disabled', exhausted ? 'true' : 'false');
    });
  }

  function buildStageSelectAttributePreview(stageId) {
    const preview = window.ShootingStageAttributePreview;
    if (!preview || typeof preview.buildHtml !== 'function') return '';
    try {
      return preview.buildHtml(String(stageId || '')) || '';
    } catch (err) {
      console.warn('[shooting] stage attribute preview failed:', err);
      return '';
    }
  }

  function openDailyStage(level) {
    const normalizedLevel = level === 'advanced' ? 'advanced' : 'intermediate';
    const attempt = getDailySelectAttempt(normalizedLevel);

    if (Number(attempt.remaining || 0) <= 0) {
      const message = '本日の挑戦回数を使い切りました';
      if (typeof window.showToast === 'function') window.showToast(message);
      else alert(message);
      return false;
    }

    // デイリー巡行 → 難易度選択 → パーティ編成。
    // 編成画面の「戻る」では、この難易度選択画面へ戻す。
    window.__shootingReturnContext = { type: 'dailyStageSelect' };
    closeDailyStageSelect();
    window.openShootingEvent({ stageId: getDailyStageId(normalizedLevel) });
    return true;
  }

  function showDailyStageSelect(options = {}) {
    closeDailyStageSelect();

    const immediate = !!(options && options.immediate);
    const overlay = document.createElement('div');
    overlay.id = 'shooting-daily-stage-select';
    overlay.className = 'shooting-special-stage-select shooting-faceless-stage-select shooting-daily-stage-select';

    if (immediate) {
      overlay.classList.add('show');
      overlay.style.transition = 'none';
    }

    const intermediateAttributeHtml = buildStageSelectAttributePreview(getDailyStageId('intermediate'));
    const advancedAttributeHtml = buildStageSelectAttributePreview(getDailyStageId('advanced'));

    overlay.innerHTML = `
      <div class="shooting-special-stage-page shooting-faceless-stage-page shooting-daily-stage-page">
        <div class="shooting-special-stage-header shooting-faceless-stage-header shooting-daily-stage-header">
          <button type="button"
                  class="shooting-special-stage-back shooting-faceless-stage-back"
                  onclick="closeDailyStageSelect()"
                  aria-label="戻る">＜戻る</button>
          <div class="shooting-special-stage-title shooting-faceless-stage-title">デイリー巡行</div>
        </div>

        <div class="shooting-special-stage-list shooting-faceless-stage-list shooting-daily-stage-list">
          <button type="button"
                  class="shooting-special-stage-row shooting-faceless-stage-row shooting-daily-stage-row"
                  data-daily-level="intermediate"
                  onclick="openDailyStage('intermediate')">
            <div class="shooting-special-stage-no shooting-faceless-stage-no">01</div>
            <div class="shooting-special-stage-main shooting-faceless-stage-main">
              <div class="shooting-special-stage-name-row shooting-faceless-stage-name-row">
                <strong>中級</strong>
                <span class="shooting-daily-stage-remaining" data-daily-remaining>残り 1 / 1</span>
              </div>
              <div class="shooting-special-stage-condition shooting-faceless-stage-condition">クリア条件：敵をすべて撃破</div>
              ${intermediateAttributeHtml}
              <div class="shooting-daily-stage-reward">
                <span class="shooting-daily-stage-reward-label">報酬</span>
                <span class="shooting-daily-stage-reward-chip shooting-daily-stage-reward-coin">
                  <img src="images/icon_coin.webp" alt="コイン">
                  <b>×10,000</b>
                </span>
                <span class="shooting-daily-stage-reward-chip" data-daily-material-slot>
                  <img src="images/item_kyoumeistone.webp" alt="">
                  <b>×1</b>
                </span>
              </div>
            </div>
          </button>

          <button type="button"
                  class="shooting-special-stage-row shooting-faceless-stage-row shooting-daily-stage-row"
                  data-daily-level="advanced"
                  onclick="openDailyStage('advanced')">
            <div class="shooting-special-stage-no shooting-faceless-stage-no">02</div>
            <div class="shooting-special-stage-main shooting-faceless-stage-main">
              <div class="shooting-special-stage-name-row shooting-faceless-stage-name-row">
                <strong>上級</strong>
                <span class="shooting-daily-stage-remaining" data-daily-remaining>残り 1 / 1</span>
              </div>
              <div class="shooting-special-stage-condition shooting-faceless-stage-condition">クリア条件：敵をすべて撃破</div>
              ${advancedAttributeHtml}
              <div class="shooting-daily-stage-reward">
                <span class="shooting-daily-stage-reward-label">報酬</span>
                <span class="shooting-daily-stage-reward-chip shooting-daily-stage-reward-coin">
                  <img src="images/icon_coin.webp" alt="コイン">
                  <b>×10,000</b>
                </span>
                <span class="shooting-daily-stage-reward-chip" data-daily-material-slot>
                  <img src="images/item_kyoumeistone.webp" alt="">
                  <b>×2</b>
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    refreshDailyStageSelect();
    if (typeof window.syncDailyAttemptStateFromServer === 'function') {
      void window.syncDailyAttemptStateFromServer();
    }

    if (!immediate) {
      requestAnimationFrame(() => overlay.classList.add('show'));
    } else {
      requestAnimationFrame(() => {
        if (overlay.isConnected) overlay.style.transition = '';
      });
    }
  }

  window.closeDailyStageSelect = closeDailyStageSelect;
  window.showDailyStageSelect = showDailyStageSelect;
  window.openDailyStage = openDailyStage;
  window.refreshDailyStageSelect = refreshDailyStageSelect;

  function closeFacelessStageSelect() {
    document.getElementById('shooting-faceless-stage-select')?.remove();
  }

  function openFacelessStage(stageId) {
    // 「無貌の天使」ステージ一覧 → パーティ編成へ進んだことを保持。
    // 編成画面の「戻る」は、特別巡行トップではなく直前のステージ一覧へ戻す。
    window.__shootingReturnContext = { type: 'facelessStageSelect' };
    closeFacelessStageSelect();
    window.openShootingEvent({ stageId: String(stageId || '') });
  }

  function showFacelessStageSelect(options = {}) {
    closeFacelessStageSelect();
    const immediate = !!(options && options.immediate);
    const overlay = document.createElement('div');
    overlay.id = 'shooting-faceless-stage-select';
    overlay.className = 'shooting-special-stage-select shooting-faceless-stage-select';
    if (immediate) {
      // 編成画面から戻る時は、下層の「特別巡行」が1フレームでも露出しないよう
      // DOMへ載せる前から完全表示状態にしておく。
      overlay.classList.add('show');
      overlay.style.transition = 'none';
    }
    const facelessAdvancedAttributeHtml = buildStageSelectAttributePreview(SHOOTING_STAGE_ID.FACELESS_ADVANCED);
    const facelessSuperAttributeHtml = buildStageSelectAttributePreview(SHOOTING_STAGE_ID.FACELESS_SUPER);
    overlay.innerHTML = `
      <div class="shooting-special-stage-page shooting-faceless-stage-page">
        <div class="shooting-special-stage-header shooting-faceless-stage-header">
          <button type="button" class="shooting-special-stage-back shooting-faceless-stage-back" onclick="closeFacelessStageSelect()" aria-label="戻る">＜戻る</button>
          <div class="shooting-special-stage-title shooting-faceless-stage-title">無貌の天使</div>
        </div>

        <div class="shooting-special-stage-list shooting-faceless-stage-list">
          <button type="button" class="shooting-special-stage-row shooting-faceless-stage-row" onclick="openFacelessStage('${SHOOTING_STAGE_ID.FACELESS_ADVANCED}')">
            <div class="shooting-special-stage-no shooting-faceless-stage-no">01</div>
            <div class="shooting-special-stage-main shooting-faceless-stage-main">
              <div class="shooting-special-stage-name-row shooting-faceless-stage-name-row">
                <strong>上級</strong>
              </div>
              <div class="shooting-special-stage-condition shooting-faceless-stage-condition">クリア条件：フェイスレスを撃破</div>
              ${facelessAdvancedAttributeHtml}
              <div class="shooting-special-stage-wave shooting-faceless-stage-wave">総WAVE2</div>
            </div>
          </button>

          <button type="button" class="shooting-special-stage-row shooting-faceless-stage-row" onclick="openFacelessStage('${SHOOTING_STAGE_ID.FACELESS_SUPER}')">
            <div class="shooting-special-stage-no shooting-faceless-stage-no">02</div>
            <div class="shooting-special-stage-main shooting-faceless-stage-main">
              <div class="shooting-special-stage-name-row shooting-faceless-stage-name-row">
                <strong>最上級</strong>
              </div>
              <div class="shooting-special-stage-condition shooting-faceless-stage-condition">クリア条件：フェイスレスを撃破</div>
              ${facelessSuperAttributeHtml}
              <div class="shooting-special-stage-wave shooting-faceless-stage-wave">総WAVE2</div>
            </div>
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    if (!immediate) {
      requestAnimationFrame(() => overlay.classList.add('show'));
    } else {
      // 次フレーム以降は通常のtransition定義へ戻す。
      requestAnimationFrame(() => { if (overlay.isConnected) overlay.style.transition = ''; });
    }
  }

  window.closeFacelessStageSelect = closeFacelessStageSelect;
  window.openFacelessStage = openFacelessStage;

  function stopCountdownMovementLoop() {
    if (countdownMoveRafId) {
      cancelAnimationFrame(countdownMoveRafId);
      countdownMoveRafId = 0;
    }
  }

  function countdownMovementLoop(ts) {
    if (!state || state.ended || state.finishing || !state.countdown) {
      countdownMoveRafId = 0;
      return;
    }

    // カウントダウン中は「プレイヤー移動だけ」を動かす。
    // 敵・弾・自動射撃・ミッション時間・DoT等は一切開始しない。
    const dt = Math.min(0.032, Math.max(0, (ts - (prevTs || ts)) / 1000));
    prevTs = ts;

    if (!state.paused && !state.koTransition) {
      updateMovement(dt, ts, true);
    }

    renderHud();
    countdownMoveRafId = requestAnimationFrame(countdownMovementLoop);
  }

  function runStartCountdown() {
    // 中断復帰など、ボス登場演出を経由しない開始経路でもBGMを必ず同期。
    if (!shootingBattleBgmSessionActive) activateShootingBattleBgm(false);
    else window.syncShootingBattleBgm();

    const countdown = document.getElementById('shooting-countdown');
    const copy = document.getElementById('shooting-start-copy');
    if (!state || !countdown) return;

    stopCountdownMovementLoop();

    state.countdown = true;
    state.running = false;
    if (copy) copy.classList.add('hide');

    countdown.classList.remove('chapter4-rule-phase', 'chapter4-rule-first', 'ready-phase', 'number-phase', 'start-phase');

    const span = countdown.querySelector('span');
    // 全ステージ共通：前回のカウントダウン文字（START）がDOMに残ったまま
    // showされると、ARE YOU READYより前に一瞬STARTが見えるため、
    // オーバーレイを表示する前に必ず文字とアニメーションクラスを消す。
    if (span) {
      span.textContent = '';
      span.classList.remove('pop', 'ready-pop', 'start-pop');
      span.style.removeProperty('animation');
      span.style.removeProperty('opacity');
      span.style.removeProperty('transform');
      span.style.removeProperty('filter');
    }

    countdown.classList.add('show');
    countdown.setAttribute('aria-hidden', 'false');
    const sequence = [
      ...(isChapter43BossStage() ? [
        { text:'全2WAVE', phase:'chapter4-rule-phase', hold:1400 },
        { text:'サキエルを撃破せよ', phase:'chapter4-rule-phase', hold:1800 }
      ] : (isChapter04Stage() ? [
        { text:'60秒間生き残り', phase:'chapter4-rule-phase', hold:1500 },
        { text:'最後に出現する', phase:'chapter4-rule-phase', hold:1500 },
        { text:'アイテムを獲得せよ', phase:'chapter4-rule-phase', hold:1500 }
      ] : [])),
      ...(isHorizontalControlReversed() ? [
        // CH05: この注意文だけは4.4秒間、文字そのものを表示し続ける。
        // ready-popを付けると1.18秒でopacity:0になるため専用フラグで固定表示する。
        { text:'このステージでは、\n左右の操作が反転します', phase:'chapter4-rule-phase', hold:4400, holdVisible:true }
      ] : []),
      { text:'ARE YOU READY', phase:'ready-phase',  hold:1250 },
      { text:'3',             phase:'number-phase', hold:850 },
      { text:'2',             phase:'number-phase', hold:850 },
      { text:'1',             phase:'number-phase', hold:850 },
      { text:'START',         phase:'start-phase',  hold:1050 }
    ];

    // 「ARE YOU READY」表示前からキャラを掴めるよう、
    // 戦闘ロジックとは独立した移動専用RAFを先に開始する。
    prevTs = performance.now();
    countdownMoveRafId = requestAnimationFrame(countdownMovementLoop);

    let i = 0;

    const showStep = () => {
      if (!state || state.ended || !span) return;

      const step = sequence[i];
      countdown.classList.remove('chapter4-rule-phase', 'chapter4-rule-first', 'ready-phase', 'number-phase', 'start-phase');
      countdown.classList.add(step.phase);
      if (isChapter04Stage() && i === 0) countdown.classList.add('chapter4-rule-first');

      span.textContent = step.text;
      span.classList.remove('pop', 'ready-pop', 'start-pop');

      // 前ステップの固定表示指定を必ず解除してから次の演出へ。
      span.style.removeProperty('animation');
      span.style.removeProperty('opacity');
      span.style.removeProperty('transform');
      span.style.removeProperty('filter');
      void span.offsetWidth;

      if (step.holdVisible) {
        // 反転操作MESSAGE:
        // 4.4秒のhold中ずっと可視状態を維持し、終了直後にARE YOU READYへ切り替える。
        span.style.setProperty('animation', 'none', 'important');
        span.style.setProperty('opacity', '1', 'important');
        span.style.setProperty('transform', 'none', 'important');
        span.style.setProperty('filter', 'none', 'important');
      } else if (step.phase === 'chapter4-rule-phase' || step.phase === 'ready-phase') {
        span.classList.add('ready-pop');
      } else if (step.phase === 'start-phase') {
        span.classList.add('start-pop');
      } else {
        span.classList.add('pop');
      }

      i += 1;

      if (i < sequence.length) {
        setTimeout(showStep, step.hold);
        return;
      }

      // STARTはカウントダウン演出として完結させる。
      // START表示中はまだ敵弾・自動射撃・時間計測を開始せず、
      // 文字が消えた直後から実戦を開始する。
      setTimeout(() => {
        if (!state || state.ended || !state.countdown) return;

        countdown.classList.remove('show', 'ready-phase', 'number-phase', 'start-phase');
        countdown.setAttribute('aria-hidden', 'true');
        stopCountdownMovementLoop();

        state.countdown = false;
        state.running = true;
        const resumeElapsedMs = Math.max(0, Number(state.resumeElapsedMsPending || 0));
        state.startedAt = performance.now() - resumeElapsedMs;
        state.resumeElapsedMsPending = 0;
        state.lastShotAt = -9999;
        state.lastBossShotAt = -9999;

        // START直後の実座標から戦闘AIの軌道へ短くブレンドする。
        state.bossMotionBlendFromX = Number(state.boss?.x || 0);
        state.bossMotionBlendFromY = Number(state.boss?.y || 0);
        state.bossMotionBlendStartedAt = state.startedAt;

        // カウントダウン中から指を置いたままでも、
        // 現在位置を基準に相対ドラッグをそのまま継続する。
        rebaseTouchDragToPlayer();

        prevTs = performance.now();
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(gameLoop);
      }, step.hold);
    };

    // 戦闘画面が見えた直後に一拍置いて開始。
    setTimeout(showStep, 260);
  }

  function beginBossDefeat() {
    if (!state || state.ended || state.finishing) return;

    // build876: 通常ステージのCLEARは必ずevaluateNormalMission()経由に限定する。
    // BOSS専用経路が誤って呼ばれても、収集・時間・被弾条件を迂回させない。
    if (isNormalBattle()) {
      console.warn('[shooting] blocked boss-defeat clear path on normal stage', {
        stageId: getSelectedBaseStageId(),
        mission: getEffectiveNormalMission(),
        collectedItems: Number(state.collectedItems || 0),
      });
      evaluateNormalMission(performance.now());
      return;
    }

    if (isAmbushStage() && Number(state.ambushWave || 1) === 1) {
      beginAmbushWave2();
      return;
    }
    if (isFacelessStage() && Number(state.facelessWave || 1) === 1) {
      beginFacelessWave2();
      return;
    }
    if (isStoryShootingStage() && !state.bossDefeatScoreAwarded) {
      state.bossDefeatScoreAwarded = true;
      state.score += Math.max(0, Number(selectedStage?.bossScoreValue || BOSS?.scoreValue || 6000));
    }
    state.finishing = true;
    state.running = false;
    cancelAnimationFrame(rafId);

    // 撃破した瞬間に弾を止め、少し余韻を残してからリザルトへ。
    clearProjectiles();
    renderHud();

    // 全BOSSステージ共通：撃破エフェクトの余韻後、勝利セレモニーへ。
    // フェイスレスWAVE1では上の分岐でreturnするため誤表示しない。

    const boss = document.getElementById(BOSS_ID);
    const root = document.getElementById(ROOT_ID);
    if (boss) {
      boss.classList.remove('hit-flash', 'burst-hit');
      void boss.offsetWidth;
      boss.classList.add('defeated');
    }
    if (root) {
      root.classList.remove('boss-defeat-flash');
      void root.offsetWidth;
      root.classList.add('boss-defeat-flash');
    }

    // 大きめの撃破エフェクトを数回出す。
    createHit(state.boss.x, state.boss.y, true);
    setTimeout(() => createHit(state.boss.x - 24, state.boss.y + 12, true), 260);
    setTimeout(() => createHit(state.boss.x + 22, state.boss.y - 8, true), 520);

    setTimeout(() => {
      if (!state || state.ended) return;
      showStageClearSequence(() => {
        if (!state || state.ended) return;
        state.finishing = false;
        endGame(true);
      });
    }, 1050);
  }


  const RESULT_RANK_THRESHOLDS = Object.freeze([
    { rank: 'S', score: 24000 },
    { rank: 'A', score: 20000 },
    { rank: 'B', score: 16000 },
    { rank: 'C', score: 12000 },
    { rank: 'D', score: 8000 },
  ]);

  // SCORE ATTACK専用ランク基準。
  // 通常シューティングの既存ランク基準には影響させない。
  const SCORE_ATTACK_RANK_THRESHOLDS = Object.freeze([
    { rank: 'S', score: 1500000 },
    { rank: 'A', score: 1000000 },
    { rank: 'B', score: 700000 },
    { rank: 'C', score: 400000 },
    { rank: 'D', score: 200000 },
  ]);

  function getResultRank(score, win) {
    const value = Number(score) || 0;

    // SCORE ATTACKは全滅/時間切れなどでクリア扱いにならなくても、
    // その時点までに稼いだスコアだけでランクを決定する。
    if (isScoreAttackStage()) {
      const hit = SCORE_ATTACK_RANK_THRESHOLDS.find(t => value >= t.score);
      return hit ? hit.rank : 'E';
    }

    // 通常シューティングは従来仕様を維持。
    if (!win) return 'E';
    const hit = RESULT_RANK_THRESHOLDS.find(t => value >= t.score);
    return hit ? hit.rank : 'E';
  }

  // ============================================================
  // Clear rewards - STORY / SPECIAL EVENT / DAILY RAID
  // ============================================================
  // v281:
  // クリア時はプレイヤーEXPとコインを必ず付与する。
  // 追加アイテムは最大3枠。
  // CHAPTER 01は進化素材を落とさず、共鳴石のみ5%で1個抽選する。
  // CHAPTER 02以降はstageNoに応じて追加ドロップ率を段階的に上げる。
  const SHOOTING_EVOLUTION_REWARD_POOL = Object.freeze([
    Object.freeze({ id: 'kyoumei_stone', name: '共鳴石', image: 'images/item_kyoumeistone.webp', rewardType: 'evolution' }),
    Object.freeze({ id: 'soul_vessel_fire', name: '魂の器(火)', image: 'images/type_fire.webp', rewardType: 'evolution' }),
    Object.freeze({ id: 'soul_vessel_aqua', name: '魂の器(水)', image: 'images/type_aqua.webp', rewardType: 'evolution' }),
    Object.freeze({ id: 'soul_vessel_wood', name: '魂の器(木)', image: 'images/type_wood.webp', rewardType: 'evolution' }),
    Object.freeze({ id: 'soul_vessel_dark', name: '魂の器(闇)', image: 'images/type_dark.webp', rewardType: 'evolution' }),
    Object.freeze({ id: 'soul_vessel_light', name: '魂の器(光)', image: 'images/type_light.webp', rewardType: 'evolution' }),
    Object.freeze({ id: 'shinju_nutrition', name: '神樹の栄養', image: 'images/shinju_aura.webp', rewardType: 'shinju' }),
  ]);


  const SHOOTING_STORY_ITEM_POOL = Object.freeze(
    SHOOTING_EVOLUTION_REWARD_POOL.filter(item => item.rewardType === 'evolution')
  );

  function getShootingStoryItemSlotRates() {
    const stage = selectedStage || {};
    const chapter = Math.max(1, Math.floor(Number(stage.chapter || 1)));
    const stageNo = Math.max(1, Math.floor(Number(stage.stageNo || 1)));

    // CHAPTER01は共鳴石5%だけ。魂の器など進化素材は出さない。
    if (chapter === 1) return [0.05];

    // 低難度の1ステージ目は追加ドロップをかなり絞る。
    // 2枠目・3枠目ほど大きく確率を落とし、最大3枠まで。
    const table = {
      1: [0.18, 0.04, 0.01],
      2: [0.28, 0.08, 0.02],
      3: [0.40, 0.15, 0.04],
      4: [0.55, 0.25, 0.08],
    };
    const base = table[Math.min(stageNo, 4)] || table[4];

    // 後半Chapterはわずかに底上げ。ただし上限は抑える。
    const chapterBonus = Math.min(0.12, Math.max(0, chapter - 2) * 0.025);
    return base.map((rate, index) => {
      const slotScale = index === 0 ? 1 : index === 1 ? 0.65 : 0.4;
      return Math.min(index === 0 ? 0.75 : index === 1 ? 0.40 : 0.15, rate + chapterBonus * slotScale);
    });
  }

  function pickStoryAdditionalItemDrops() {
    const stage = selectedStage || {};
    const chapter = Math.max(1, Math.floor(Number(stage.chapter || 1)));

    if (chapter === 1) {
      if (Math.random() >= 0.05) return [];
      const stone = SHOOTING_EVOLUTION_REWARD_POOL.find(item => item.id === 'kyoumei_stone');
      return stone ? [{ material: stone, count: 1 }] : [];
    }

    const rates = getShootingStoryItemSlotRates();
    const drops = [];
    const pool = Array.from(SHOOTING_STORY_ITEM_POOL);

    rates.slice(0, 3).forEach(rate => {
      if (!pool.length || Math.random() >= rate) return;
      const index = Math.floor(Math.random() * pool.length);
      const material = pool.splice(index, 1)[0];
      if (material) drops.push({ material, count: 1 });
    });

    return drops;
  }

  function getShootingClearRewardPlan() {
    const stage = selectedStage || {};

    // 神樹の栄養は1個あたりの栄養値だけステージ種別で変える。
    // ドロップ「個数」はステージ種別ではなく最終スコアだけで決める。
    if (isRaidStage()) {
      return { nutritionExp: 150 };
    }

    if (isFacelessStage() || stage.eventId === 'bullet_hell_test') {
      const superDifficulty = stage.faceless && stage.faceless.difficulty === 'super';
      return { nutritionExp: superDifficulty ? 120 : 80 };
    }

    const chapter = Math.max(1, Number(stage.chapter || 1));
    const bossBonus = stage.type === 'boss' ? 1 : 0;
    return { nutritionExp: 30 + chapter * 10 + bossBonus * 20 };
  }

  function getShootingRewardCountRange(score) {
    const value = Math.max(0, Number(score || 0));
    if (value >= 1000000) return { min: 12, max: 12, label: '1,000,000+' };
    if (value >= 500000) return { min: 7, max: 8, label: '500,000–999,999' };
    if (value >= 300000) return { min: 4, max: 6, label: '300,000–499,999' };
    if (value >= 100000) return { min: 2, max: 4, label: '100,000–299,999' };
    return { min: 1, max: 2, label: '0–99,999' };
  }

  function rollShootingRewardCount(range) {
    const min = Math.max(1, Math.floor(Number(range && range.min || 1)));
    const max = Math.max(min, Math.floor(Number(range && range.max || min)));
    if (min === max) return min;
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function pickShootingEvolutionRewards(count = 2) {
    const pool = Array.from(SHOOTING_EVOLUTION_REWARD_POOL.filter(item => item.rewardType === 'evolution'));
    const picked = [];
    const target = Math.min(Math.max(1, Math.floor(Number(count || 2))), pool.length);

    while (picked.length < target && pool.length) {
      const index = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
  }

  function pickDailyQuestMaterialRewards() {
    const cfg = getDailyQuestConfig();
    if (!cfg) return [];

    const count = Math.max(1, Math.floor(Number(cfg.rewardCount || 1)));
    const sourceIds = Array.isArray(cfg.rewardPool) && cfg.rewardPool.length
      ? Array.from(cfg.rewardPool)
      : [String(cfg.rewardId || '')].filter(Boolean);
    if (!sourceIds.length) return [];

    const picked = new Map();
    for (let i = 0; i < count; i++) {
      const id = sourceIds.length === 1
        ? sourceIds[0]
        : sourceIds[Math.floor(Math.random() * sourceIds.length)];
      const material = SHOOTING_EVOLUTION_REWARD_POOL.find(item => item.id === id);
      if (!material || material.rewardType !== 'evolution') continue;
      const current = picked.get(id);
      if (current) current.count += 1;
      else picked.set(id, { material, count: 1 });
    }
    return Array.from(picked.values());
  }

  function getShootingPlayerExpDifficulty() {
    const stage = selectedStage || {};
    if (isDailyQuestStage()) {
      return getDailyQuestConfig()?.level === 'advanced' ? 'hard' : 'normal';
    }
    if (isRaidStage()) return 'boss';
    if (isFacelessStage()) {
      return stage.faceless && stage.faceless.difficulty === 'super' ? 'boss' : 'hard';
    }
    if (stage.eventId === 'bullet_hell_test') return 'hard';
    if (stage.type === 'boss') return 'boss';
    return 'normal';
  }

  function getShootingPlayerExpReward() {
    // すこあた！は難易度・ランク・スコアに関係なくEXP 300固定。
    if (isScoreAttackStage()) return 300;

    const difficulty = getShootingPlayerExpDifficulty();
    const rank = getResultRank(state && state.score, true);

    // 本体の巡行EXP計算をそのまま流用する。
    // シューティングはクリア自体を報酬条件とし、周回でも通常倍率で付与する。
    if (typeof window.calcNodeExp === 'function') {
      try {
        return Math.max(1, Math.floor(Number(window.calcNodeExp(difficulty, rank, true) || 0)));
      } catch (err) {
        console.warn('[shooting reward] player exp calculation failed', err);
      }
    }

    // index側APIが未初期化でも報酬を欠損させないフォールバック。
    const base = difficulty === 'boss' ? 1000 : difficulty === 'hard' ? 500 : 250;
    const rankMul = rank === 'S' ? 1.5 : rank === 'A' ? 1.2 : rank === 'C' ? 0.7 : 1.0;
    return Math.max(1, Math.floor(base * rankMul));
  }

  function getShootingCoinReward(playerExp) {
    // build505: DAILY QUESTは難易度に関係なくコイン10,000固定。
    // 曜日別の進化素材報酬は既存dailyQuest設定をそのまま使用する。
    if (isDailyQuestStage()) return 10000;

    // v285:
    // コインは CHAPTERごとのベース + STAGE進行分。
    //
    // CHAPTER 01 base = 1,000
    // CHAPTER 02 base = 1,200
    // CHAPTER 03 base = 1,400
    // ...CHAPTERが1上がるごとにベース +200
    //
    // 各CHAPTER内では STAGEが1上がるごとに +300。
    // 例:
    // CH01-01 = 1,000 / CH01-02 = 1,300 / CH01-03 = 1,600 / CH01-04 = 1,900
    // CH02-01 = 1,200 / CH02-02 = 1,500 / CH02-03 = 1,800 / CH02-04 = 2,100
    const stage = selectedStage || {};
    const chapter = Math.max(1, Math.floor(Number(stage.chapter || 1)));
    const stageNo = Math.max(1, Math.floor(Number(stage.stageNo || 1)));
    const chapterBase = 1000 + ((chapter - 1) * 200);
    const stageBonus = (stageNo - 1) * 300;
    return chapterBase + stageBonus;
  }

  function grantCoinReward(amount) {
    const coin = Math.max(0, Math.floor(Number(amount || 0)));
    if (!coin || !window.userProfile) return false;

    const next = Math.max(0, Number(window.userProfile.coin || 0)) + coin;
    window.userProfile.coin = next;

    // v286: リザルト直後にヘッダーのコイン残高と端末キャッシュを即時同期。
    if (typeof window.refreshProfileHud === 'function') {
      window.refreshProfileHud();
    } else if (typeof window.updateMainUI === 'function') {
      window.updateMainUI();
    }

    if (typeof window.saveProfileToDB === 'function') {
      Promise.resolve(window.saveProfileToDB({
        coin: next,
        last_played: new Date().toISOString(),
      })).then(() => {
        if (typeof window.refreshProfileHud === 'function') window.refreshProfileHud();
      }).catch(err => {
        console.warn('[shooting reward] coin cloud save failed', err);
        if (typeof window.scheduleCloudSave === 'function') window.scheduleCloudSave();
      });
    } else if (typeof window.scheduleCloudSave === 'function') {
      window.scheduleCloudSave();
    }
    return true;
  }

  function grantPlayerExpReward(amount) {
    const exp = Math.max(0, Math.floor(Number(amount || 0)));
    if (!exp || !window.userProfile) return false;

    // v286:
    // addTotalScore() は旧セキュリティ仕様で無効化済みだったため、
    // リザルト上はEXPを獲得していてもHUDのtotal_scoreが更新されていなかった。
    // まず現在のプロフィールへ即時反映し、円形EXPリングを同期する。
    const before = Math.max(0, Number(window.userProfile.total_score || 0));
    const next = before + exp;
    window.userProfile.total_score = next;

    if (typeof window.refreshProfileHud === 'function') {
      window.refreshProfileHud();
    } else if (typeof window.updateMainUI === 'function') {
      window.updateMainUI();
    }

    // クラウド保存もベストエフォートで同期。
    // total_score/rankの権限制約がある環境では端末表示を巻き戻さない。
    if (typeof window.saveProfileToDB === 'function') {
      const rank = Math.max(1, Number(window.userProfile.rank || 1));
      Promise.resolve(window.saveProfileToDB({
        total_score: next,
        rank: rank,
        last_played: new Date().toISOString(),
      })).then(() => {
        if (typeof window.refreshProfileHud === 'function') window.refreshProfileHud();
      }).catch(err => {
        console.warn('[shooting reward] player exp cloud save skipped', err);
      });
    }
    return true;
  }

  function grantShinjuNutrition(exp, count) {
    // build896: Shinju reward issuance is server-authoritative.
    // Kept only as a compatibility hook for old callers.
    try {
      if (window.ShinjuProgress && typeof window.ShinjuProgress.refreshFromServer === 'function') {
        void window.ShinjuProgress.refreshFromServer();
      }
    } catch (_) {}
    return false;
  }

  function persistShootingEvolutionReward(materialId, amount) {
    // DAILY QUESTはsecure run tokenを発行しない既存仕様のため対象外。
    // STORY / SCORE ATTACK / EVENT / RAID系は、finish_secure_shooting_runで
    // run tokenが消費された後に専用RPCへ付与を確定させる。
    if (isDailyQuestStage()) return;

    const sb = window.zsSupabase;
    const userId = getShootingUserId();
    const runToken = String(state && state.secureRunToken || '').trim();
    if (!sb || typeof sb.rpc !== 'function' || !userId || !runToken) return;

    const finalizePromise = state && state.secureFinalizePromise
      ? state.secureFinalizePromise
      : Promise.resolve(null);

    void Promise.resolve(finalizePromise).then(async finalized => {
      if (!finalized) return;
      const res = await sb.rpc('claim_shooting_material_reward_secure', {
        p_user_id: userId,
        p_run_token: runToken,
        p_material_id: String(materialId || ''),
        p_quantity: Math.max(1, Math.floor(Number(amount || 1)))
      });
      if (res && res.error) throw res.error;
      if (typeof window.loadInventoryFromSupabase === 'function') {
        await window.loadInventoryFromSupabase(userId);
      }
    }).catch(err => {
      console.warn('[shooting reward] secure evolution material save failed', err && (err.message || err));
    });
  }

  function grantEvolutionReward(material, count) {
    const amount = Math.max(1, Math.floor(Number(count || 1)));
    try {
      if (typeof window.addEvolutionMaterial === 'function') {
        const result = window.addEvolutionMaterial(material.id, amount);
        persistShootingEvolutionReward(material.id, amount);
        return result || true;
      }
    } catch (err) {
      console.warn('[shooting reward] evolution material save failed', err);
    }
    return false;
  }

  function grantGemReward(amount) {
    const count = Math.max(0, Math.floor(Number(amount || 0)));
    if (!count || !window.userProfile) return false;

    const before = Math.max(0, Number(window.userProfile.gem || 0));
    const next = before + count;
    window.userProfile.gem = next;

    if (typeof window.updateMainUI === 'function') window.updateMainUI();
    if (typeof window.updateSummonGemUI === 'function') window.updateSummonGemUI();

    if (typeof window.saveProfileToDB === 'function') {
      Promise.resolve(window.saveProfileToDB({ gem: next, last_played: new Date().toISOString() }))
        .catch(err => {
          console.warn('[shooting reward] gem cloud save failed', err);
          // クラウド保存に失敗しても端末上のプレイ直後表示は維持。次の同期機会で再保存する。
          if (typeof window.scheduleCloudSave === 'function') window.scheduleCloudSave();
        });
    }
    return true;
  }

  const SHOOTING_FIRST_CLEAR_GEM_AMOUNT = 5;

  // v163: first-clear gem reward must be tied to a server-issued shooting run.
  // A stage_id alone is no longer enough to claim gems from the console.
  async function beginSecureShootingRun() {
    if (!state || !state.stageId || isDailyQuestStage()) return null;
    if (state.secureRunToken) return state.secureRunToken;
    if (state.secureRunPromise) return state.secureRunPromise;

    const stageId = String(state.stageId || '').trim();
    const userId = getShootingUserId();
    const sb = window.zsSupabase;
    if (!stageId || !userId || !sb || typeof sb.rpc !== 'function') return null;

    state.secureRunPromise = (async () => {
      const result = await sb.rpc('begin_secure_shooting_run', {
        p_user_id: userId,
        p_stage_id: stageId,
      });
      if (result && result.error) throw result.error;
      const row = Array.isArray(result && result.data) ? result.data[0] : (result && result.data);
      const token = String(row && row.run_token || '').trim();
      if (!token) throw new Error('shooting run token was not issued');
      if (state && String(state.stageId || '') === stageId) state.secureRunToken = token;
      return token;
    })().catch(err => {
      console.warn('[shooting security] run begin failed:', err && (err.message || err));
      return null;
    }).finally(() => {
      if (state) state.secureRunPromise = null;
    });

    return state.secureRunPromise;
  }

  async function claimShootingFirstClearGemReward() {
    if (!state || !state.stageId) return { claimed: false, amount: 0, gem: null };
    if (state.firstClearGemPromise) return state.firstClearGemPromise;

    const stageId = String(state.stageId || '').trim();
    const userId = getShootingUserId();
    const sb = window.zsSupabase;

    state.firstClearGemPromise = (async () => {
      if (!stageId || !userId || !sb || typeof sb.rpc !== 'function') {
        return { claimed: false, amount: 0, gem: null };
      }

      const runToken = state.secureRunToken || await beginSecureShootingRun();
      if (!runToken) return { claimed: false, amount: 0, gem: null };

      const result = await sb.rpc('claim_shooting_first_clear_reward', {
        p_user_id: userId,
        p_run_token: runToken,
      });
      if (result && result.error) throw result.error;

      const row = Array.isArray(result && result.data)
        ? result.data[0]
        : (result && result.data);
      const claimed = !!(row && row.claimed);
      const amount = Math.max(0, Number(row && row.amount || 0));
      const gem = Number(row && row.gem);

      // 結晶残高はサーバーRPCの確定値を正として反映する。
      if (Number.isFinite(gem) && window.userProfile) {
        window.userProfile.gem = Math.max(0, gem);
        if (typeof window.updateMainUI === 'function') window.updateMainUI();
        if (typeof window.updateSummonGemUI === 'function') window.updateSummonGemUI();
      }

      return {
        claimed,
        amount: claimed ? Math.max(1, amount || SHOOTING_FIRST_CLEAR_GEM_AMOUNT) : 0,
        gem: Number.isFinite(gem) ? Math.max(0, gem) : null,
      };
    })().catch(err => {
      console.warn('[shooting reward] first clear gem claim failed:', err && (err.message || err));
      return { claimed: false, amount: 0, gem: null, error: true };
    });

    return state.firstClearGemPromise;
  }

  function buildShootingRewardItemHtml(drop) {
    const isFirstClear = String(drop?.detail || '') === '初回クリア報酬';

    if (isFirstClear) {
      return `
        <div class="shooting-result-first-clear-bar">
          <span class="shooting-result-first-clear-label">初回クリア報酬</span>
          <span class="shooting-result-first-clear-main">
            ${drop.image ? `<img src="${drop.image}" alt="">` : ''}
            <b>${drop.name}</b>
            <strong>${drop.amountPrefix || '×'}${drop.amount}</strong>
          </span>
        </div>
      `;
    }

    return `
      <div class="shooting-result-reward-item shooting-result-reward-${drop.type}">
        <span class="shooting-result-reward-icon">${drop.image ? `<img src="${drop.image}" alt="">` : '<b>EXP</b>'}</span>
        <span class="shooting-result-reward-copy"><b>${drop.name}</b><small>${drop.detail}</small></span>
        <strong>${drop.amountPrefix || '×'}${drop.amount}</strong>
      </div>
    `;
  }

  function buildAndGrantShootingClearRewards() {
    if (!state || state.clearRewardsGranted) return Array.isArray(state && state.clearRewards) ? state.clearRewards : [];
    state.clearRewardsGranted = true;

    const dailyQuestReward = isDailyQuestStage();
    const scoreAttackFixedReward = isScoreAttackStage();
    let playerExp = getShootingPlayerExpReward();
    let coin = getShootingCoinReward(playerExp);
    const dailyServer = dailyQuestReward && state && state.dailyQuestServerRewards ? state.dailyQuestServerRewards : null;
    if (dailyServer) {
      playerExp = Math.max(0, Number(dailyServer.exp_reward || 0));
      coin = Math.max(0, Number(dailyServer.coin_reward || 0));
    }
    const rewardPlan = getShootingClearRewardPlan();

    let itemDrops = [];

    if (dailyQuestReward) {
      // デイリー報酬はサーバー確定結果だけを表示する。
      const rows = dailyServer && Array.isArray(dailyServer.items) ? dailyServer.items : [];
      itemDrops = rows.map(row => {
        const id = String(row && row.id || '');
        const def = (typeof window.getEvolutionMaterialDef === 'function')
          ? window.getEvolutionMaterialDef(id)
          : (typeof getEvolutionMaterialDef === 'function' ? getEvolutionMaterialDef(id) : null);
        return {
          material: def || { id:id, name:id || '素材', image:'' },
          count: Math.max(1, Number(row && row.quantity || 1))
        };
      });
    } else if (scoreAttackFixedReward) {
      // すこあた！は従来の固定報酬感を維持しつつ、最大3枠以内。
      itemDrops = pickShootingEvolutionRewards(2).map(material => ({ material, count: 1 }));
    } else if (!isRaidStage() && !isFacelessStage()) {
      // STORY通常巡行。CH01だけ特例、CH02以降はstageNo別確率。
      itemDrops = pickStoryAdditionalItemDrops();
    } else {
      // 特殊/ボス系は通常STORYより少し報酬感を残す。
      const slotRates = [0.65, 0.28, 0.08];
      const pool = Array.from(SHOOTING_EVOLUTION_REWARD_POOL.filter(item => item.rewardType === 'evolution'));
      slotRates.forEach(rate => {
        if (!pool.length || Math.random() >= rate) return;
        const index = Math.floor(Math.random() * pool.length);
        itemDrops.push({ material: pool.splice(index, 1)[0], count: 1 });
      });
    }

    // ステージ固有の確定報酬は既存仕様を維持。
    const guaranteedRewards = Array.isArray(selectedStage && selectedStage.guaranteedRewards)
      ? selectedStage.guaranteedRewards.map(reward => ({
          type: String(reward && reward.type || 'material'),
          id: String(reward && reward.id || ''),
          name: String(reward && reward.name || '報酬'),
          image: String(reward && reward.image || ''),
          count: Math.max(1, Math.floor(Number(reward && reward.count || 1))),
          detail: String(reward && reward.detail || '確定報酬'),
        })).filter(reward => reward.id)
      : [];

    const drops = [
      {
        type: 'exp',
        name: 'EXP',
        amount: playerExp,
        detail: 'プレイヤーEXP',
        image: '',
        amountPrefix: '+'
      },
      {
        type: 'coin',
        name: 'コイン',
        amount: coin,
        detail: 'クリア報酬',
        image: 'images/icon_coin.webp',
        amountPrefix: '+'
      },
      ...itemDrops.map(({ material, count }) => ({
        type: 'material',
        name: material.name,
        amount: count,
        detail: material.rewardType === 'shinju' ? '神樹成長素材' : '追加ドロップ',
        image: material.image,
        materialId: material.id,
      })),
      ...guaranteedRewards.map(reward => ({
        type: reward.type,
        name: reward.name,
        amount: reward.count,
        detail: reward.detail,
        image: reward.image,
        materialId: reward.id,
      })),
    ];

    // v287:
    // 通常シューティングのEXP/コインは finish_secure_shooting_run 側で
    // run token 消費と同一トランザクション内にて確定付与する。
    // クライアント加算すると二重付与になるため、ここでは加算しない。
    // DAILYは既存の別経路を維持。
    // DAILYはcoin/EXP/素材すべてfinish_daily_quest_runで確定済み。
    // 通常シューティングだけ既存の追加素材付与処理を使用する。
    if (!dailyQuestReward) {
      itemDrops.forEach(({ material, count }) => {
        if (material.rewardType === 'shinju') {
          grantShinjuNutrition(rewardPlan.nutritionExp, count);
        } else {
          grantEvolutionReward(material, count);
        }
      });

      guaranteedRewards.forEach(reward => {
        grantEvolutionReward({ id: reward.id }, reward.count);
      });
    }

    state.clearRewards = drops;
    return drops;
  }

  function renderShootingClearRewards(win) {
    const section = document.getElementById('shooting-result-rewards');
    const list = document.getElementById('shooting-result-reward-list');
    const note = document.getElementById('shooting-result-reward-note');
    if (!section || !list) return;

    if (!win) {
      section.style.display = 'none';
      list.innerHTML = '';
      if (note) note.textContent = '';
      return;
    }

    const drops = buildAndGrantShootingClearRewards();
    section.style.display = '';

    // v283: EXP / コインは確定報酬として必ず先頭表示。
    // 旧stateを引き継いだ場合でも表示順を固定する。
    const orderedDrops = Array.isArray(drops)
      ? [
          ...drops.filter(drop => drop && drop.type === 'exp'),
          ...drops.filter(drop => drop && drop.type === 'coin'),
          ...drops.filter(drop => drop && drop.type !== 'exp' && drop.type !== 'coin')
        ]
      : [];

    list.innerHTML = orderedDrops.map(buildShootingRewardItemHtml).join('');
    if (note) {
      note.textContent = '';
      note.style.display = 'none';
    }

    // v172: 初回クリア結晶も、同じrun tokenを確定する結果RPCから受け取る。
    // score保存と初回報酬を別々のクライアント申告にしない。
    if (!isDailyQuestStage() && !state.firstClearGemRenderStarted) {
      state.firstClearGemRenderStarted = true;
      const finalizePromise = state.secureFinalizePromise
        || submitShootingHighScore(state.score, true);
      void Promise.resolve(finalizePromise).then(finalized => {
        if (!finalized || !finalized.firstClearClaimed || !finalized.firstClearAmount) return;
        const gemDrop = {
          type: 'gem',
          name: '結晶',
          amount: finalized.firstClearAmount,
          detail: '初回クリア報酬',
          image: 'images/icon_gem.webp',
        };
        state.clearRewards = Array.isArray(state.clearRewards)
          ? [...state.clearRewards, gemDrop]
          : [gemDrop];
        if (list && list.isConnected) {
          list.insertAdjacentHTML('beforeend', buildShootingRewardItemHtml(gemDrop));
        }
        if (note && note.isConnected) note.textContent = '';
      });
    }

    if (!isDailyQuestStage() && !state.shinjuRewardRenderStarted) {
      state.shinjuRewardRenderStarted = true;
      const finalizePromise = state.secureFinalizePromise
        || submitShootingHighScore(state.score, true);
      void Promise.resolve(finalizePromise).then(finalized => {
        const rewardExp = Math.max(0, Number(finalized && finalized.shinjuRewardExp || 0));
        if (!rewardExp) return;
        const shinjuDrop = {
          type: 'material',
          name: '神樹の栄養',
          amount: 1,
          detail: `神樹成長素材 / 創世EXP +${rewardExp}`,
          image: 'images/shinju_aura.webp',
        };
        state.clearRewards = Array.isArray(state.clearRewards)
          ? [...state.clearRewards, shinjuDrop]
          : [shinjuDrop];
        if (list && list.isConnected) {
          list.insertAdjacentHTML('beforeend', buildShootingRewardItemHtml(shinjuDrop));
        }
      });
    }
  }


  function startRandomAmbushFromResult() {
    if (!state || !state.ended || isAmbushStage()) return;
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    const result = document.getElementById('shooting-result');
    const overlay = document.createElement('div');
    overlay.className = 'shooting-ambush-emergency';
    overlay.innerHTML = '<small>EMERGENCY</small><strong>緊急事態</strong><span>???が出現しました</span>';
    root.appendChild(overlay);

    setTimeout(() => {
      if (!overlay.isConnected) return;
      overlay.remove();

      resolveSelectedStage({ stageId: SHOOTING_STAGE_ID.OVERSEER_AMBUSH });
      BOSS = getCurrentShootingEnemy();
      clearProjectiles();
      clearNormalBattleObjects();
      resetState();
      // EMERGENCY ambush is a different stage_id, so it needs its own secure run token.
      void beginSecureShootingRun();

      const boss = document.getElementById(BOSS_ID);
      if (boss) {
        boss.src = getSelectedBossImage();
        boss.alt = BOSS.name || '';
        boss.style.setProperty('--enemy-scale', String(Number(BOSS.uiScale || 1)));
        boss.style.display = '';
        boss.classList.remove('defeated');
      }
      if (result) {
        result.classList.remove('show');
        result.setAttribute('aria-hidden','true');
      }

      root.setAttribute('data-shooting-stage', selectedStage.id);
      root.setAttribute('data-battle-type','boss');
      root.setAttribute('data-boss-phase','1');
      root.classList.remove('boss-defeat-flash','boss-phase-flash','boss-phase-pause','player-defeat-flash');

      selectedCharacterId = selectedPartyIds[0] || selectedCharacterId;
      applySelectedCharacterToUi();
      setCharacterSelectVisible(false);
      setBattleHudVisible(true);
      setShootingHeaderMenuMode(true);
      placeInitialUnits();
      renderHud();
      playBossStageIntro(runStartCountdown);
    }, 1900);
  }

  function maybeQueueRandomAmbush(win) {
    // DAILY巡行はサーバー確定・残回数UIへ戻す専用フロー。
    // ランダム襲来でselectedStageを書き換えない。
    if (!win || isAmbushStage() || isDailyQuestStage()) return;
    const rate = 0.10;
    if (Math.random() >= rate) return;
    // リザルトを一度見せてから緊急警告へ。
    setTimeout(() => {
      if (!state || !state.ended || isAmbushStage()) return;
      startRandomAmbushFromResult();
    }, 1500);
  }

  async function endGame(win) {
    if (!state || state.ended) return;

    // build812: RESULT処理中にstage参照が変化してもDAILY判定を揺らさない。
    const dailyQuestAtResult = isDailyQuestStage();

    // RESULTへ入るタイミングで戦闘BGMを短くフェードアウト。
    fadeOutShootingBattleBgm(520, true);

    // CH04専用ギミックはRESULTへ持ち越さない。
    clearChapter4FinalItem();
    purgeChapter4ItemDom();
    clearChapter43RestoreItem();
    clearChapter43SealCountdown();
    clearChapter43Countdown();

    // 迫る壁もRESULTへ残さず、即座に初期幅へ戻す。
    const ch04ArenaForResult = document.getElementById('shooting-arena');
    if (ch04ArenaForResult) {
      ch04ArenaForResult.querySelectorAll('.shooting-ch04-shrink-wall').forEach(el => {
        el.style.display = 'none';
        el.style.width = '0px';
      });
    }

    // 通常戦はRESULT確定時点で復帰データを削除。
    // RAIDはfinishAttemptのSupabase確定が終わるまで復帰データを残す。
    if (!isRaidStage()) clearShootingResumeState();
    state.ended = true;

    // GAME OVERは戦闘画面専用。RESULTへ持ち越さない。
    document.querySelectorAll('.shooting-game-over-notice').forEach(el => el.remove());

    // RESULTへ切り替える前に、戦闘中だけの演出/HUD状態を確実に解除する。
    const rootForResult = document.getElementById(ROOT_ID);
    if (rootForResult) {
      rootForResult.classList.remove('normal-stage-clear', 'mission-item-get');
      rootForResult.querySelectorAll('.shooting-clear-condition-achieved').forEach(el => el.remove());
    }
    const missionHudForResult = document.getElementById('shooting-mission-hud');
    if (missionHudForResult) missionHudForResult.style.display = 'none';
    const battleTimerForResult = document.getElementById('shooting-battle-timer');
    if (battleTimerForResult) {
      battleTimerForResult.classList.remove('show','is-warning','is-danger');
      battleTimerForResult.setAttribute('aria-hidden','true');
    }
    const comboForResult = document.getElementById('shooting-combo');
    if (comboForResult) comboForResult.style.display = 'none';
    state.running = false;
    cancelAnimationFrame(rafId);
    clearEltenaBlackHole();
    clearProjectiles();
    clearNormalBattleObjects();
    document.getElementById(BOSS_ID)?.classList.remove('nem-stunned');
    document.getElementById(ROOT_ID)?.classList.remove('nem-stun-active');
    const result = document.getElementById('shooting-result');
    const kicker = document.getElementById('shooting-result-kicker');
    const title = document.getElementById('shooting-result-title');
    const score = document.getElementById('shooting-result-score');
    const combo = document.getElementById('shooting-result-combo');
    const rank = document.getElementById('shooting-result-rank');
    const hitDetails = document.getElementById('shooting-result-hit-details');
    const hitTotal = document.getElementById('shooting-result-hit-total');
    const ultDetails = document.getElementById('shooting-result-ult-details');
    const ultTotal = document.getElementById('shooting-result-ult-total');
    const survivorDetails = document.getElementById('shooting-result-survivor-details');
    const survivorTotal = document.getElementById('shooting-result-survivor-total');
    const clearTime = document.getElementById('shooting-result-clear-time');
    const raidRow = document.getElementById('shooting-result-raid-row');
    const raidDamageEl = document.getElementById('shooting-result-raid-damage');
    const retryBtn = document.getElementById('shooting-result-retry');
    state.clearTimeMs = Math.max(0, performance.now() - (state.startedAt || performance.now()));
    finalizeStoryClearScore(!!win);
    const rankLetter = getResultRank(state.score, win);

    if (dailyQuestAtResult) {
      if (raidRow) raidRow.style.display = 'none';
      if (retryBtn) retryBtn.style.display = 'none';
    } else if (isRaidStage()) {
      state.raidDamageDealt = Math.max(0, Math.floor(Number(state.raidInitialHp || 0) - Number(state.boss && state.boss.hp || 0)));
      if (raidRow) raidRow.style.display = '';
      if (raidDamageEl) raidDamageEl.textContent = state.raidDamageDealt.toLocaleString('ja-JP');
      if (retryBtn) retryBtn.style.display = 'none';
      if (!state.raidAttemptFinished && window.RaidEvent && typeof window.RaidEvent.finishAttempt === 'function') {
        state.raidAttemptFinished = true;
        const finishPromise = window.RaidEvent.finishAttempt(state.raidDamageDealt, { bossDefeated: !!win });
        Promise.resolve(finishPromise)
          .then(() => clearShootingResumeState())
          .catch(err => {
            // 通信失敗時は復帰データを残し、次回起動で同じ挑戦を再開できるようにする。
            console.warn('[shooting] raid finish failed; resume snapshot kept', err);
          });
      }
    } else {
      if (raidRow) raidRow.style.display = 'none';
      if (retryBtn) retryBtn.style.display = '';
    }

    // ステージ別最高スコアをローカルへ即時反映し、Supabaseへ非同期保存。
    // v172: score/result is accepted only against this battle's server run token.
    state.secureFinalizePromise = dailyQuestAtResult ? finalizeDailyQuestRun(state.score, !!win) : submitShootingHighScore(state.score, !!win);
    if (dailyQuestAtResult) {
      try {
        await state.secureFinalizePromise;
      } catch (err) {
        console.error('[DailyQuest] finalize failed:', err);
        if (typeof window.showToast === 'function') window.showToast('デイリー報酬の確定に失敗しました');
      }
    }
    // STORY進捗へシューティング結果を通知。
    try {
      window.dispatchEvent(new CustomEvent('shooting-stage-result', {
        detail: {
          stageId: state.stageId || (selectedStage && selectedStage.id) || null,
          chapter: selectedStage ? selectedStage.chapter : null,
          stageNo: selectedStage ? selectedStage.stageNo : null,
          win: !!win,
          score: Number(state.score || 0),
          maxCombo: Number(state.maxCombo || 0),
          clearTimeMs: Number(state.clearTimeMs || 0),
          hitsTaken: Number(state.totalHitsTaken || 0),
          collectedItems: Number(state.collectedItems || 0),
          partyIds: Array.isArray(state.party) ? state.party.map(m => Number(m.id)).filter(Boolean) : []
        }
      }));
    } catch (_) {}
    const totalHits = state.party.reduce((sum, m) => sum + (m.hitCount || 0), 0);
    const totalUlts = state.party.reduce((sum, m) => sum + (m.ultUseCount || 0), 0);
    const survivors = state.party.filter(m => m.hp > 0);
    const resultMemberHtml = (m, value, suffix, markDown) => {
      const c = getBattleCharacter(m.id);
      return `<span class="shooting-result-member${markDown && m.hp <= 0 ? ' down' : ''}" title="${c.name}"><img src="${c.panelImage || c.image}" alt="${c.name}"><b>${value}${suffix}</b></span>`;
    };
    if (kicker) kicker.textContent = win ? '' : 'MISSION FAILED';
    if (title) title.textContent = 'RESULT';
    if (score) score.textContent = String(state.score).padStart(6, '0');
    if (combo) combo.textContent = String(state.maxCombo || 0);
    if (hitDetails) hitDetails.innerHTML = state.party.map(m => resultMemberHtml(m, m.hitCount || 0, '回', false)).join('');
    if (hitTotal) hitTotal.textContent = `${totalHits}回`;
    if (ultDetails) ultDetails.innerHTML = state.party.map(m => resultMemberHtml(m, m.ultUseCount || 0, '回', false)).join('');
    if (ultTotal) ultTotal.textContent = `${totalUlts}回`;
    if (survivorDetails) survivorDetails.innerHTML = state.party.map(m => resultMemberHtml(m, m.hp > 0 ? '生存' : 'LOST', '', true)).join('');
    if (survivorTotal) survivorTotal.textContent = `${survivors.length}/${state.party.length}`;
    if (clearTime) clearTime.textContent = `${(state.clearTimeMs / 1000).toFixed(2)}秒`;
    if (rank) {
      rank.textContent = rankLetter;
      rank.setAttribute('data-rank', rankLetter);
    }
    renderShootingClearRewards(!!win);
    if (result) {
      result.classList.add('show');
      result.setAttribute('aria-hidden', 'false');
    }
    // 終了後は結果画面の裏にも戦闘HUDを残さない。
    setBattleHudVisible(false);
    maybeQueueRandomAmbush(!!win);
  }

  function rebaseTouchDragToPlayer(preserveTarget = false) {
    if (!pointerActive || !pointerIsTouch || !state || !state.player) return;

    dragStartClientX = lastPointerClientX;
    dragStartClientY = lastPointerClientY;

    if (preserveTarget) {
      // キャラチェンジ中も、指が向かっている「現在の移動目標」を捨てない。
      // 同じ指位置で次のpointermoveが来てもtargetが変わらないため、
      // 一瞬ブレーキが掛かったような操作感を防ぐ。
      dragStartPlayerX = pointerX;
      dragStartPlayerY = pointerY;
      return;
    }

    // 入力基準は常に現在のtargetを維持する。
    // pointercancel / identifier差し替えが起きても指とのオフセットを蓄積させない。
    dragStartPlayerX = pointerX;
    dragStartPlayerY = pointerY;
  }

  function beginTouchDrag(e) {
    if (!state || !state.player) return;

    pointerActive = true;
    pointerIsTouch = true;
    activePointerId = e.pointerId;

    lastPointerClientX = e.clientX;
    lastPointerClientY = e.clientY;
    dragStartClientX = e.clientX;
    dragStartClientY = e.clientY;

    // 指を置いた瞬間はキャラをワープさせない。
    // 以後はこの位置を基準に、指の移動量とキャラの移動量を完全1:1にする。
    dragStartPlayerX = state.player.x;
    dragStartPlayerY = state.player.y;
    pointerX = state.player.x;
    pointerY = state.player.y;
  }

  function isShootingUiInteractionTarget(target) {
    if (!target || typeof target.closest !== 'function') return false;
    return !!target.closest(
      '.shooting-character-select, ' +
      '.shooting-result, ' +
      '.shooting-character-info-modal, ' +
      '.shooting-switch-rail, ' +
      '.shooting-footer, ' +
      'button, a, input, select, textarea'
    );
  }

  function onPointerDown(e) {
    if (!state || state.ended || state.finishing || state.paused) return;

    // v183:
    // arenaの中にはパーティ選択UIも存在する。
    // UI操作をバトル移動入力として横取りしない。
    if (isShootingUiInteractionTarget(e.target)) return;

    const touchLike = isTouchLikePointer(e);

    // すでに別の指で操作中なら、その指以外のpointerdownは移動入力に使わない。
    if (
      pointerActive &&
      activePointerId !== null &&
      e.pointerId !== activePointerId
    ) {
      return;
    }

    const now = performance.now();
    const dx = e.clientX - lastTapX;
    const dy = e.clientY - lastTapY;
    const isDoubleTap =
      lastTapAt > 0 &&
      (now - lastTapAt) <= ULT_DOUBLE_TAP_MS &&
      Math.hypot(dx, dy) <= ULT_DOUBLE_TAP_DISTANCE;

    if (touchLike) {
      refreshArenaInputRect(false);
      beginTouchDrag(e);
    } else {
      pointerActive = true;
      pointerIsTouch = false;
      activePointerId = e.pointerId;
      lastPointerClientX = e.clientX;
      lastPointerClientY = e.clientY;
      updatePointer(e);
    }

    swipeStartX = e.clientX;
    swipeStartY = e.clientY;
    swipeStartAt = now;

    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}

    if (isDoubleTap) {
      lastTapAt = 0;

      if (!state.countdown && isUltReady()) {
        // ULT発動時も「現在のキャラ位置」をドラッグ基準に維持。
        // 指の絶対座標へ同期しない。
        window.useShootingBurst();
        if (e.cancelable) e.preventDefault();
        return;
      }
    } else {
      lastTapAt = now;
      lastTapX = e.clientX;
      lastTapY = e.clientY;
    }

    // ミア：移動ドラッグと同じpointerを使ってチャージ開始。
    // DOM追加はせずplayerのCSSクラスだけで溜め演出を出す。
    if (!state.countdown && getCurrentCharacter().shotType === 'charge') {
      beginMiaCharge(e.pointerId, now);
    }

    if (e.cancelable) e.preventDefault();
  }

  function onPointerMove(e) {
    if (!pointerActive || !state || state.ended || state.finishing || state.paused) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;

    // iPhoneではPointerEventとTouchEventが同じ指から交互に届くことがあり、
    // わずかな座標差とイベント順序差で目標座標が往復してカクつく。
    // 通常時はTouch Eventsを正とする。
    // ただしtouchcancel待機中にPointer Eventsが継続している場合は、
    // Pointer側へ一時退避して「数秒後に指から離れる」断線を防ぐ。
    if (pointerIsTouch && nativeTouchActive && !nativeTouchPointerFallback) {
      if (nativeTouchCancelTimer && isTouchLikePointer(e)) {
        nativeTouchPointerFallback = true;
        clearNativeTouchCancelTimer();
        activePointerId = e.pointerId;
      } else {
        if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
        return;
      }
    }

    // v181:
    // iOS/Safariで極まれに発生する単発の異常座標だけを弾く。
    // 通常の素早いドラッグはそのまま1:1で反映する。
    if (pointerIsTouch && Number.isFinite(lastPointerClientX) && Number.isFinite(lastPointerClientY)) {
      const jump = Math.hypot(
        Number(e.clientX) - Number(lastPointerClientX),
        Number(e.clientY) - Number(lastPointerClientY)
      );
      const rect = getArenaInputRect();
      const diagonal = rect ? Math.hypot(rect.width, rect.height) : 600;
      const rejectDistance = Math.max(180, diagonal * 0.55);

      if (Number.isFinite(jump) && jump > rejectDistance) {
        if (e.cancelable) e.preventDefault();
        return;
      }
    }

    lastPointerClientX = e.clientX;
    lastPointerClientY = e.clientY;

    // ultCutinActive中でも入力基準だけ更新する。
    updatePointer(e);
    if (e.cancelable) e.preventDefault();
  }

  function onPointerUp(e) {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;

    // iOS Safari/PWAではpointerup/pointercancelがTouch Eventsより先に来る。
    // 通常はTouch側へ終了判定を一本化する。
    // touchcancel後にPointerへ退避している時だけPointer側の終了を採用する。
    if (pointerIsTouch && nativeTouchActive && !nativeTouchPointerFallback) {
      if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
      return;
    }

    const wasActive = pointerActive;

    if (nativeTouchPointerFallback) {
      nativeTouchPointerFallback = false;
      nativeTouchActive = false;
      activeTouchIdentifier = null;
      clearNativeTouchCancelTimer();
    }

    pointerActive = false;
    pointerIsTouch = false;
    activePointerId = null;

    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}

    if (wasActive && state && !state.ended && !state.finishing && !state.koTransition) {
      const elapsed = performance.now() - swipeStartAt;
      const dx = e.clientX - swipeStartX;
      const dy = e.clientY - swipeStartY;
      const isFlick =
        elapsed <= SWITCH_SWIPE_MAX_MS &&
        Math.abs(dx) >= SWITCH_SWIPE_MIN_X &&
        Math.abs(dx) >= Math.abs(dy) * SWITCH_SWIPE_AXIS_RATIO;

      if (isFlick) {
        clearMiaChargeState();
        const others = state.party.filter(m => m.id !== state.activeCharacterId && m.hp > 0);
        const target = dx > 0 ? others[0] : others[1];
        if (target) window.switchShootingCharacter(target.id);
      } else if (e.type !== 'pointercancel' && getCurrentCharacter().shotType === 'charge') {
        releaseMiaCharge(e.pointerId, performance.now());
      } else if (e.type === 'pointercancel') {
        clearMiaChargeState();
      }
    } else if (e.type === 'pointercancel') {
      clearMiaChargeState();
    }

    if (e.cancelable) e.preventDefault();
  }

  function findActiveTouch(list) {
    if (!list) return null;
    for (let i = 0; i < list.length; i += 1) {
      const t = list[i];
      if (activeTouchIdentifier === null || t.identifier === activeTouchIdentifier) return t;
    }
    return null;
  }

  function clearNativeTouchCancelTimer() {
    nativeTouchCancelToken += 1;
    if (nativeTouchCancelTimer) {
      clearTimeout(nativeTouchCancelTimer);
      nativeTouchCancelTimer = null;
    }
  }

  // build597:
  // touchstart時点からの総移動量で追従させると、画面端でclampされた分だけ
  // 指とキャラの差分が蓄積し、端から戻した時に「指だけ動いてキャラが遅れる」
  // デッドゾーンが発生する。
  // 1イベントごとの差分を現在targetへ加算する方式にして、clamp後もズレを残さない。
  function applyTouchDelta(clientX, clientY) {
    if (!state || !state.player) return false;

    const r = getArenaInputRect();
    if (!r) return false;

    const x = Number(clientX);
    const y = Number(clientY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

    const prevX = Number(lastPointerClientX);
    const prevY = Number(lastPointerClientY);
    const dx = Number.isFinite(prevX) ? (x - prevX) : 0;
    const dy = Number.isFinite(prevY) ? (y - prevY) : 0;

    pointerX = clamp(
      pointerX + (isHorizontalControlReversed() ? -dx : dx),
      30,
      r.width - 30
    );
    pointerY = clamp(
      pointerY + dy,
      34,
      r.height - 38
    );

    lastPointerClientX = x;
    lastPointerClientY = y;

    // 次イベントの基準も現在targetへ揃える。
    // 画面端・フレーム落ち・identifier差替え後にもオフセットを持ち越さない。
    dragStartClientX = x;
    dragStartClientY = y;
    dragStartPlayerX = pointerX;
    dragStartPlayerY = pointerY;
    return true;
  }

  function finishNativeTouchInteraction(clientX, clientY, cancelled = false) {
    const wasActive = pointerActive;
    const releasePointerId = state ? state.miaChargePointerId : null;

    nativeTouchActive = false;
    nativeTouchPointerFallback = false;
    activeTouchIdentifier = null;
    pointerActive = false;
    pointerIsTouch = false;
    activePointerId = null;

    if (!wasActive || !state || state.ended || state.finishing || state.koTransition) {
      if (cancelled) clearMiaChargeState();
      return;
    }

    if (cancelled) {
      clearMiaChargeState();
      return;
    }

    const endX = Number.isFinite(Number(clientX)) ? Number(clientX) : lastPointerClientX;
    const endY = Number.isFinite(Number(clientY)) ? Number(clientY) : lastPointerClientY;
    const elapsed = performance.now() - swipeStartAt;
    const dx = endX - swipeStartX;
    const dy = endY - swipeStartY;
    const isFlick =
      elapsed <= SWITCH_SWIPE_MAX_MS &&
      Math.abs(dx) >= SWITCH_SWIPE_MIN_X &&
      Math.abs(dx) >= Math.abs(dy) * SWITCH_SWIPE_AXIS_RATIO;

    if (isFlick) {
      clearMiaChargeState();
      const others = state.party.filter(m => m.id !== state.activeCharacterId && m.hp > 0);
      const target = dx > 0 ? others[0] : others[1];
      if (target) window.switchShootingCharacter(target.id);
      return;
    }

    if (getCurrentCharacter().shotType === 'charge') {
      releaseMiaCharge(releasePointerId, performance.now());
    }
  }

  function onNativeTouchStart(e) {
    if (!state || state.ended || state.finishing || state.paused) return;

    // パーティ選択/ボタン/RESULT上のタッチは、スクロールやクリックを優先。
    if (isShootingUiInteractionTarget(e.target)) return;

    // 1操作の開始時だけarena矩形を確認。以後のtouchmoveではDOMを読まない。
    refreshArenaInputRect(false);
    clearNativeTouchCancelTimer();

    if (!e.touches || !e.touches.length) return;

    // touchcancel直後にWebKitが新しいtouch identifierで再開した場合も拾う。
    const t = (e.changedTouches && e.changedTouches.length)
      ? e.changedTouches[0]
      : e.touches[0];
    if (!t) return;

    const restartingAfterCancel = nativeTouchActive && activeTouchIdentifier !== t.identifier;
    if (nativeTouchActive && !restartingAfterCancel) {
      if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
      return;
    }

    nativeTouchActive = true;
    nativeTouchPointerFallback = false;
    activeTouchIdentifier = t.identifier;
    lastNativeTouchMoveAt = performance.now();

    // PointerEventが未開始/途中で切れていた場合はここで入力状態を復元。
    if (!pointerActive || restartingAfterCancel) {
      pointerActive = true;
      pointerIsTouch = true;
      activePointerId = null;

      lastPointerClientX = t.clientX;
      lastPointerClientY = t.clientY;
      dragStartClientX = t.clientX;
      dragStartClientY = t.clientY;
      dragStartPlayerX = pointerX;
      dragStartPlayerY = pointerY;

      swipeStartX = t.clientX;
      swipeStartY = t.clientY;
      swipeStartAt = performance.now();
    }

    if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
  }

  function onNativeTouchMove(e) {
    if (!nativeTouchActive || !state || state.ended || state.finishing || state.paused) return;

    clearNativeTouchCancelTimer();
    nativeTouchPointerFallback = false;

    let t = findActiveTouch(e.touches);
    // WebKitがidentifierだけ差し替えたような異常系では、残っている1本を継続指として採用。
    if (!t && e.touches && e.touches.length === 1) {
      t = e.touches[0];
      activeTouchIdentifier = t.identifier;

      // identifier差替えの最初の1イベントだけは座標ジャンプを移動量へ入れない。
      lastPointerClientX = t.clientX;
      lastPointerClientY = t.clientY;
      dragStartClientX = t.clientX;
      dragStartClientY = t.clientY;
      dragStartPlayerX = pointerX;
      dragStartPlayerY = pointerY;

      if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
      return;
    }
    if (!t) return;

    // Pointer Eventsがpointercancelで切れていても、touchmoveで即復旧。
    if (!pointerActive) {
      pointerActive = true;
      pointerIsTouch = true;
      activePointerId = null;
      lastPointerClientX = t.clientX;
      lastPointerClientY = t.clientY;
      dragStartClientX = t.clientX;
      dragStartClientY = t.clientY;
      dragStartPlayerX = pointerX;
      dragStartPlayerY = pointerY;

      if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
      return;
    }

    applyTouchDelta(t.clientX, t.clientY);
    lastNativeTouchMoveAt = performance.now();

    if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
  }

  function onNativeTouchEnd(e) {
    if (!nativeTouchActive) return;

    let stillAlive = false;
    if (e.touches) {
      for (let i = 0; i < e.touches.length; i += 1) {
        if (e.touches[i].identifier === activeTouchIdentifier) {
          stillAlive = true;
          break;
        }
      }
    }

    if (stillAlive) {
      if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
      return;
    }

    clearNativeTouchCancelTimer();

    let endedTouch = null;
    if (e.changedTouches) {
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        if (e.changedTouches[i].identifier === activeTouchIdentifier) {
          endedTouch = e.changedTouches[i];
          break;
        }
      }
    }

    finishNativeTouchInteraction(
      endedTouch ? endedTouch.clientX : lastPointerClientX,
      endedTouch ? endedTouch.clientY : lastPointerClientY,
      false
    );

    if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
  }

  function onNativeTouchCancel(e) {
    if (!nativeTouchActive) return;

    // iOSでは実際の離指ではなく、一時的なWebKit都合でtouchcancelが来ることがある。
    // ここで即pointerActiveを落とさず短い猶予を設け、touchmove/touchstartが戻れば継続。
    clearNativeTouchCancelTimer();
    const token = nativeTouchCancelToken;
    activePointerId = null;

    nativeTouchCancelTimer = setTimeout(() => {
      if (token !== nativeTouchCancelToken) return;
      nativeTouchCancelTimer = null;
      if (nativeTouchPointerFallback) return;
      finishNativeTouchInteraction(lastPointerClientX, lastPointerClientY, true);
    }, TOUCH_CANCEL_GRACE_MS);

    if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
  }

  function updatePointer(e) {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !state || !state.player) return;

    const touchLike = pointerIsTouch || isTouchLikePointer(e);
    // touchはキャッシュのみ。PCマウスはイベント頻度が低く、absolute座標変換にleft/topが必要なので
    // 従来どおりライブ矩形を読む。
    const r = touchLike ? getArenaInputRect() : arena.getBoundingClientRect();
    if (!r) return;

    if (touchLike) {
      // build597:
      // タッチは「開始点からの総差分」ではなく、直前イベントからの差分を加算する。
      // これで画面端に当てた後も余分な差分が蓄積せず、指とキャラが離れていかない。
      applyTouchDelta(e.clientX, e.clientY);
      return;
    }

    // PCマウスは従来どおり絶対座標へ追従。
    const localX = e.clientX - r.left;
    pointerX = clamp(isHorizontalControlReversed() ? (r.width - localX) : localX, 30, r.width - 30);
    pointerY = clamp(e.clientY - r.top, 34, r.height - 38);
  }

  window.selectShootingCharacter = function (id) {
    id = Number(id);
    if (!isPublicShootingCharacterId(id)) return;
    if (!SHOOTING_CHARACTERS[id] || !isShootingCharacterOwned(id)) return;

    if (isChapter04Stage() && !isChapter43BossStage() && id !== Number(CHARACTER_ID.ERI)) {
      ensureStoryEriLeader();
      selectedCharacterId = Number(CHARACTER_ID.ERI);
      applySelectedCharacterToUi();
      return;
    }

    if (isStoryShootingStage() && id === Number(CHARACTER_ID.ERI)) {
      ensureStoryEriLeader();
      selectedCharacterId = Number(CHARACTER_ID.ERI);
      applySelectedCharacterToUi();
      return;
    }

    const idx = selectedPartyIds.indexOf(id);
    if (idx >= 0) selectedPartyIds.splice(idx, 1);
    else if (selectedPartyIds.length < PARTY_SIZE) selectedPartyIds.push(id);

    if (isStoryShootingStage()) ensureStoryEriLeader();
    selectedCharacterId = selectedPartyIds[0] || id;
    applySelectedCharacterToUi();
  };



  function showShootingUltFullChargeNotice() {
    const el = document.getElementById('shooting-ult-full-notice');
    if (!el) return;

    el.classList.remove('show');
    el.setAttribute('aria-hidden', 'false');

    // アニメーションを毎回確実に再スタート
    void el.offsetWidth;
    el.classList.add('show');

    window.clearTimeout(el.__hideTimer);
    el.__hideTimer = window.setTimeout(() => {
      el.classList.remove('show');
      el.setAttribute('aria-hidden', 'true');
    }, 2350);
  }

  // ============================================================
  // build776: SHOOTING battle BGM
  // - normal stages: audio/bgm_battle_normal.mp3
  // - boss stages:   audio/bgm_battle_boss.mp3
  // - global BGM setting (zeraphia_bgm_enabled) is shared with HOME/TITLE.
  // ============================================================
  const SHOOTING_BGM_NORMAL_ID = 'bgm-battle-normal';
  const SHOOTING_BGM_BOSS_ID = 'bgm-battle-boss';
  let shootingBattleBgmSessionActive = false;
  let shootingBattleBgmFadeRaf = 0;

  function getShootingBattleBgmTrack() {
    const id = selectedStage && selectedStage.type === 'normal'
      ? SHOOTING_BGM_NORMAL_ID
      : SHOOTING_BGM_BOSS_ID;
    return document.getElementById(id);
  }

  function getShootingBattleBgmVolume() {
    let value = Number(window.bgmVolume);
    if (!Number.isFinite(value)) {
      try { value = Number(localStorage.getItem('bgm_volume')); } catch (_) { value = 30; }
    }
    if (!Number.isFinite(value)) value = 30;
    return Math.max(0, Math.min(1, value / 100));
  }

  function isShootingBattleBgmEnabled() {
    if (typeof window.isAudioEnabled === 'function') {
      try { return !!window.isAudioEnabled('main_bgm'); } catch (_) {}
    }
    try { return localStorage.getItem('zeraphia_bgm_enabled') !== 'false'; }
    catch (_) { return true; }
  }

  function getAllShootingBattleBgmTracks() {
    return [
      document.getElementById(SHOOTING_BGM_NORMAL_ID),
      document.getElementById(SHOOTING_BGM_BOSS_ID)
    ].filter(Boolean);
  }

  function cancelShootingBattleBgmFade() {
    if (!shootingBattleBgmFadeRaf) return;
    cancelAnimationFrame(shootingBattleBgmFadeRaf);
    shootingBattleBgmFadeRaf = 0;
  }

  function updateShootingBattleBgmMenuUi() {
    const menu = document.getElementById('shooting-pause-menu');
    if (!menu) return;
    const button = menu.querySelector('.shooting-pause-bgm-toggle');
    const status = menu.querySelector('#shooting-pause-bgm-status');
    const enabled = isShootingBattleBgmEnabled();
    if (status) status.textContent = enabled ? 'ON' : 'OFF';
    if (button) {
      button.classList.toggle('is-off', !enabled);
      button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      button.setAttribute('aria-label', enabled ? 'BGMをOFFにする' : 'BGMをONにする');
    }
  }

  function warmShootingBattleBgm() {
    const audio = getShootingBattleBgmTrack();
    if (!audio) return;
    try {
      audio.preload = 'auto';
      if (audio.readyState < 2) audio.load();
    } catch (_) {}
  }

  function primeShootingBattleBgmFromUserGesture() {
    if (!isShootingBattleBgmEnabled()) return;
    const audio = getShootingBattleBgmTrack();
    if (!audio) return;

    // iOS/PWA対策：戦闘開始ボタンのユーザー操作中に対象audioを一度だけprimeする。
    const previousMuted = audio.muted;
    const previousVolume = audio.volume;
    try {
      audio.preload = 'auto';
      audio.muted = true;
      audio.volume = 0;
      const p = audio.play();
      audio.pause();
      try { audio.currentTime = 0; } catch (_) {}
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {
      try { audio.pause(); } catch (_) {}
    } finally {
      audio.muted = previousMuted;
      audio.volume = previousVolume;
    }
  }

  function stopShootingBattleBgm(resetPosition) {
    cancelShootingBattleBgmFade();
    getAllShootingBattleBgmTracks().forEach(audio => {
      try { audio.pause(); } catch (_) {}
      if (resetPosition) {
        try { audio.currentTime = 0; } catch (_) {}
      }
      audio.volume = getShootingBattleBgmVolume();
    });
  }

  function playShootingBattleBgm(options) {
    options = options || {};
    if (!shootingBattleBgmSessionActive || !isShootingBattleBgmEnabled()) {
      stopShootingBattleBgm(false);
      updateShootingBattleBgmMenuUi();
      return;
    }

    const target = getShootingBattleBgmTrack();
    if (!target) return;
    cancelShootingBattleBgmFade();

    getAllShootingBattleBgmTracks().forEach(audio => {
      if (audio !== target) {
        try { audio.pause(); } catch (_) {}
        try { audio.currentTime = 0; } catch (_) {}
      }
    });

    if (options.restart) {
      try { target.currentTime = 0; } catch (_) {}
    }
    target.muted = false;
    target.volume = getShootingBattleBgmVolume();
    if (target.paused) {
      const p = target.play();
      if (p && typeof p.catch === 'function') {
        p.catch(err => console.warn('[shooting BGM] play failed:', err));
      }
    }
    updateShootingBattleBgmMenuUi();
  }

  function activateShootingBattleBgm(restart) {
    shootingBattleBgmSessionActive = true;
    playShootingBattleBgm({ restart: !!restart });
  }

  function fadeOutShootingBattleBgm(durationMs, resetPosition) {
    shootingBattleBgmSessionActive = false;
    cancelShootingBattleBgmFade();

    const playing = getAllShootingBattleBgmTracks().filter(audio => !audio.paused);
    if (!playing.length) {
      stopShootingBattleBgm(!!resetPosition);
      updateShootingBattleBgmMenuUi();
      return;
    }

    const duration = Math.max(80, Number(durationMs || 320));
    const startedAt = performance.now();
    const startVolumes = new Map(playing.map(audio => [audio, Number(audio.volume || 0)]));

    const step = now => {
      const ratio = Math.max(0, Math.min(1, (now - startedAt) / duration));
      playing.forEach(audio => {
        const start = startVolumes.get(audio) || 0;
        audio.volume = start * (1 - ratio);
      });

      if (ratio < 1) {
        shootingBattleBgmFadeRaf = requestAnimationFrame(step);
        return;
      }

      shootingBattleBgmFadeRaf = 0;
      playing.forEach(audio => {
        try { audio.pause(); } catch (_) {}
        if (resetPosition) {
          try { audio.currentTime = 0; } catch (_) {}
        }
        audio.volume = getShootingBattleBgmVolume();
      });
      updateShootingBattleBgmMenuUi();
    };

    shootingBattleBgmFadeRaf = requestAnimationFrame(step);
  }

  window.syncShootingBattleBgm = function () {
    updateShootingBattleBgmMenuUi();
    if (!shootingBattleBgmSessionActive || !isShootingBattleBgmEnabled()) {
      stopShootingBattleBgm(false);
      return;
    }
    playShootingBattleBgm({ restart:false });
  };

  window.toggleShootingBattleBgm = function () {
    const enabled = isShootingBattleBgmEnabled();
    if (typeof window.setGlobalBgmEnabled === 'function') {
      window.setGlobalBgmEnabled(!enabled);
    } else {
      try { localStorage.setItem('zeraphia_bgm_enabled', enabled ? 'false' : 'true'); } catch (_) {}
      window.syncShootingBattleBgm();
    }
  };

  function setShootingHeaderMenuMode(inBattle) {
    const btn = document.querySelector(`#${ROOT_ID} .shooting-back`);
    if (!btn) return;

    // バトル中は左上ボタンを完全に消す。
    // 一時停止メニューは右下のMENUボタンから開く。
    if (inBattle) {
      btn.classList.remove('is-menu');
      btn.classList.add('is-battle-hidden');
      btn.textContent = '＜戻る';
      btn.setAttribute('aria-label', '戻る');
      btn.setAttribute('onclick', 'closeShootingEvent()');
    } else {
      btn.classList.remove('is-menu', 'is-battle-hidden');
      btn.textContent = '＜戻る';
      btn.setAttribute('aria-label', '戻る');
      btn.setAttribute('onclick', 'closeShootingEvent()');
    }
    setShootingStageHeader(!!inBattle);
  }

  function ensureShootingPauseMenu() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return null;

    let menu = root.querySelector('#shooting-pause-menu');
    if (menu) {
      updateShootingBattleBgmMenuUi();
      return menu;
    }

    menu = document.createElement('div');
    menu.id = 'shooting-pause-menu';
    menu.className = 'shooting-pause-menu';
    menu.setAttribute('aria-hidden', 'true');
    menu.innerHTML = `
      <div class="shooting-pause-backdrop" aria-hidden="true"></div>
      <section class="shooting-pause-card" role="dialog" aria-modal="true" aria-labelledby="shooting-pause-title">
        <div class="shooting-pause-kicker">PAUSE</div>
        <h2 id="shooting-pause-title" aria-label="メニュー"><span class="sasaphia-menu-heading-icon" aria-hidden="true">☰</span></h2>
        <div class="shooting-pause-divider"></div>
        <button type="button" class="shooting-pause-action shooting-pause-bgm-toggle" onclick="toggleShootingBattleBgm()" aria-pressed="true">
          <span>BGM</span><strong id="shooting-pause-bgm-status">ON</strong>
        </button>
        <button type="button" class="shooting-pause-action shooting-pause-exit" onclick="exitShootingStageFromPause()">ステージを終了する</button>
        <button type="button" class="shooting-pause-action" onclick="restartShootingStageFromPause()">最初からやり直す</button>
        <button type="button" class="shooting-pause-action shooting-pause-close" onclick="closeShootingPauseMenu()">閉じる</button>
      </section>
    `;
    root.appendChild(menu);
    updateShootingBattleBgmMenuUi();
    return menu;
  }

  function shiftPausedTimestamps(target, deltaMs, seen) {
    if (!target || typeof target !== 'object' || !deltaMs) return;
    seen = seen || new Set();
    if (seen.has(target)) return;
    seen.add(target);

    Object.keys(target).forEach(key => {
      const value = target[key];

      if (
        typeof value === 'number' &&
        value > 0 &&
        (/(At|Until)$/.test(key) || key === 'startedAt')
      ) {
        target[key] = value + deltaMs;
        return;
      }

      if (value && typeof value === 'object') {
        shiftPausedTimestamps(value, deltaMs, seen);
      }
    });
  }

  function resumeShootingFromPause(shiftTime) {
    if (!state || !state.paused) return;

    const now = performance.now();
    const pausedFor = Math.max(0, now - Number(state.pauseStartedAt || now));

    if (shiftTime !== false && pausedFor > 0) {
      // 攻撃間隔・バフ/デバフ残り時間・クリアタイム等が
      // PAUSE中に勝手に進まないよう、絶対時刻を停止時間分ずらす。
      shiftPausedTimestamps(state, pausedFor);
    }

    state.paused = false;
    state.pauseStartedAt = 0;
    prevTs = now;
    keys = Object.create(null);
    pointerActive = false;
    pointerIsTouch = false;
    nativeTouchPointerFallback = false;
    nativeTouchActive = false;
    activeTouchIdentifier = null;
    clearNativeTouchCancelTimer();
  }

  window.openShootingPauseMenu = function () {
    if (!state || state.ended || state.finishing || state.countdown) return;

    const menu = ensureShootingPauseMenu();
    if (!menu || state.paused) return;

    state.paused = true;
    state.pauseStartedAt = performance.now();
    pointerActive = false;
    pointerIsTouch = false;
    nativeTouchPointerFallback = false;
    nativeTouchActive = false;
    activeTouchIdentifier = null;
    clearNativeTouchCancelTimer();
    keys = Object.create(null);

    updateShootingBattleBgmMenuUi();
    menu.classList.add('show');
    menu.setAttribute('aria-hidden', 'false');
  };

  window.closeShootingPauseMenu = function () {
    const menu = document.getElementById('shooting-pause-menu');
    if (menu) {
      menu.classList.remove('show');
      menu.setAttribute('aria-hidden', 'true');
    }
    resumeShootingFromPause(true);
  };

  window.restartShootingStageFromPause = function () {
    const menu = document.getElementById('shooting-pause-menu');
    if (menu) {
      menu.classList.remove('show');
      menu.setAttribute('aria-hidden', 'true');
    }
    resumeShootingFromPause(false);
    window.restartShootingEvent();
  };

  window.exitShootingStageFromPause = function () {
    const menu = document.getElementById('shooting-pause-menu');
    if (menu) {
      menu.classList.remove('show');
      menu.setAttribute('aria-hidden', 'true');
    }
    if (state) {
      state.paused = false;
      state.pauseStartedAt = 0;
    }
    window.closeShootingEvent();
  };

  function getSelectedStageTicketCost() {
    return Math.max(0, Math.floor(Number(selectedStage && selectedStage.specialTicketCost || 0)));
  }

  async function consumeSelectedStageTicket() {
    const cost = getSelectedStageTicketCost();
    if (cost <= 0) return { consumed: true, remaining: null };

    const sb = window.zsSupabase;
    const userId = getShootingUserId();
    if (!sb || !userId) {
      throw new Error('SPECIAL TICKETの所持数を確認できません');
    }

    const result = await sb.rpc('consume_special_stage_ticket', {
      p_user_id: userId,
      p_cost: cost
    });
    if (result && result.error) throw result.error;

    const row = Array.isArray(result && result.data) ? result.data[0] : (result && result.data);
    const consumed = !!(row && row.consumed);
    const remaining = Math.max(0, Number(row && row.remaining_ticket || 0));

    if (window.userProfile) window.userProfile.special_stage_ticket = remaining;
    document.querySelectorAll('#special-ticket-count,[data-special-ticket-count]').forEach(el => {
      el.textContent = String(remaining);
    });
    if (typeof window.refreshSpecialTicketUI === 'function') {
      try { void window.refreshSpecialTicketUI(); } catch (_) {}
    }

    return { consumed, remaining };
  }

  let raidAttemptStartPending = false;

  async function ensureSelectedRaidAttemptStarted() {
    if (!isRaidStage()) return true;

    if (selectedRaidContext?.adminTest) return true;
    if (selectedRaidContext?.attemptStarted) return true;
    if (!selectedRaidContext?.pendingAttempt) return true;
    if (raidAttemptStartPending) return false;

    const sb = window.zsSupabase;
    const userId = getShootingUserId();
    if (!sb || typeof sb.rpc !== 'function' || !userId) {
      const message = 'レイド挑戦権を確認できません';
      if (typeof window.showToast === 'function') window.showToast(message);
      else alert(message);
      return false;
    }

    raidAttemptStartPending = true;
    try {
      const res = await sb.rpc('begin_daily_raid_attempt_v2', { p_user_id: userId });
      if (res && res.error) throw res.error;

      let begun = res ? res.data : null;
      if (typeof begun === 'string') {
        try { begun = JSON.parse(begun); } catch (_) {}
      }
      if (!begun || begun.ok === false) {
        throw new Error((begun && begun.message) || '本日は挑戦できません');
      }

      const hp = Math.max(0, Number(begun.current_hp || 0));
      if (hp <= 0) throw new Error('レイドはすでに討伐されています');

      // RPC成功 = この瞬間に挑戦権を消費。
      selectedRaidContext = {
        ...selectedRaidContext,
        raidId: begun.raid_id || selectedRaidContext.raidId,
        currentHp: hp,
        maxHp: Math.max(1, Number(begun.max_hp || selectedRaidContext.maxHp || 100000)),
        raidDate: begun.raid_date || selectedRaidContext.raidDate || '',
        adminTest: false,
        pendingAttempt: false,
        attemptStarted: true
      };

      if (window.RaidEvent && typeof window.RaidEvent.refreshFriendHomeNotice === 'function') {
        try { void window.RaidEvent.refreshFriendHomeNotice(); } catch (_) {}
      }
      return true;
    } catch (err) {
      console.error('[shooting] raid attempt start failed:', err);
      const message = err && err.message ? err.message : 'レイド挑戦権の消費に失敗しました';
      if (typeof window.showToast === 'function') window.showToast(message);
      else alert(message);
      return false;
    } finally {
      raidAttemptStartPending = false;
    }
  }

  let noahAttemptStartPending = false;

  async function ensureSelectedNoahAttemptStarted() {
    if (!isNoahStage()) return true;
    if (noahAttemptStartPending) return false;

    const sb = window.zsSupabase;
    const userId = getShootingUserId();
    if (!sb || typeof sb.rpc !== 'function' || !userId) {
      const message = 'ノア挑戦情報を作成できません';
      if (typeof window.showToast === 'function') window.showToast(message);
      else alert(message);
      return false;
    }

    noahAttemptStartPending = true;
    try {
      const res = await sb.rpc('begin_noah_attempt');
      if (res && res.error) throw res.error;

      let data = res ? res.data : null;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (_) {}
      }
      const attemptId = data && data.attempt_id ? String(data.attempt_id) : '';
      if (!attemptId) throw new Error('ノア挑戦IDを取得できません');

      window.__noahAttemptId = attemptId;
      return true;
    } catch (err) {
      console.error('[shooting] noah attempt start failed:', err);
      const message = err && err.message ? err.message : 'ノア挑戦情報の作成に失敗しました';
      if (typeof window.showToast === 'function') window.showToast(message);
      else alert(message);
      return false;
    } finally {
      noahAttemptStartPending = false;
    }
  }

  let dailyQuestConsumePending = false;
  let activeDailyQuestRunToken = '';

  async function ensureSelectedDailyQuestAttemptConsumed() {
    if (!isDailyQuestStage()) return true;
    if (dailyQuestConsumePending) return false;

    const cfg = getDailyQuestConfig();
    const level = cfg && cfg.level === 'advanced' ? 'advanced' : 'intermediate';
    const sb = window.zsSupabase;
    if (!sb || typeof sb.rpc !== 'function') {
      const message = 'デイリー挑戦情報を確認できません';
      if (typeof window.showToast === 'function') window.showToast(message); else alert(message);
      return false;
    }

    dailyQuestConsumePending = true;
    try {
      const res = await sb.rpc('begin_daily_quest_run', {
        p_level: level,
        p_party_ids: Array.isArray(selectedPartyIds) ? selectedPartyIds.map(Number).filter(Boolean) : []
      });
      if (res && res.error) throw res.error;
      let data = res ? res.data : null;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch (_) {} }
      if (!data || data.ok === false || !data.run_token) {
        const message = (data && data.message) || '本日の挑戦回数を使い切りました';
        if (typeof window.showToast === 'function') window.showToast(message); else alert(message);
        if (typeof window.syncDailyAttemptStateFromServer === 'function') {
          void window.syncDailyAttemptStateFromServer();
        }
        return false;
      }
      activeDailyQuestRunToken = String(data.run_token);
      if (state) state.dailyQuestRunToken = activeDailyQuestRunToken;
      if (typeof window.syncDailyAttemptStateFromServer === 'function') {
        void window.syncDailyAttemptStateFromServer();
      }
      return true;
    } catch (err) {
      console.error('[DailyQuest] begin failed:', err);
      const message = err && err.message ? err.message : 'デイリー挑戦の開始に失敗しました';
      if (typeof window.showToast === 'function') window.showToast(message); else alert(message);
      return false;
    } finally {
      dailyQuestConsumePending = false;
    }
  }

  async function finalizeDailyQuestRun(score, win) {
    if (!isDailyQuestStage()) return null;
    const sb = window.zsSupabase;
    // build812: closure tokenだけでなくbattle stateにも退避したtokenを使用。
    // DAILY判定やUI差し替えが途中で揺れても、開始済みrunを確実にfinishへ渡す。
    const token = String(activeDailyQuestRunToken || (state && state.dailyQuestRunToken) || '').trim();
    if (!sb || typeof sb.rpc !== 'function' || !token) {
      throw new Error('デイリー挑戦トークンを確認できません');
    }

    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await sb.rpc('finish_daily_quest_run', {
          p_run_token: token,
          p_score: Math.max(0, Math.floor(Number(score || 0))),
          p_win: !!win
        });
        if (res && res.error) throw res.error;
        let data = res ? res.data : null;
        if (typeof data === 'string') { try { data = JSON.parse(data); } catch (_) {} }
        if (!data || data.ok === false) throw new Error((data && data.message) || 'デイリー報酬を確定できません');

        if (state) state.dailyQuestServerRewards = data;
        if (window.userProfile) {
          if (Number.isFinite(Number(data.coin))) window.userProfile.coin = Math.max(0, Number(data.coin));
          if (Number.isFinite(Number(data.total_score))) window.userProfile.total_score = Math.max(0, Number(data.total_score));
          if (Number.isFinite(Number(data.rank))) window.userProfile.rank = Math.max(1, Number(data.rank));
        }
        if (typeof window.loadInventoryFromSupabase === 'function') {
          const uid = getShootingUserId();
          if (uid) await window.loadInventoryFromSupabase(uid);
        }
        if (typeof window.refreshProfileHud === 'function') window.refreshProfileHud();
        else if (typeof window.updateMainUI === 'function') window.updateMainUI();
        if (typeof window.syncDailyAttemptStateFromServer === 'function') {
          await window.syncDailyAttemptStateFromServer();
        }
        activeDailyQuestRunToken = '';
        if (state) state.dailyQuestRunToken = '';
        return data;
      } catch (err) {
        lastErr = err;
        if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 450));
      }
    }
    throw lastErr || new Error('デイリー報酬の確定に失敗しました');
  }

  let specialTicketConsumePending = false;

  async function ensureSelectedStageTicketConsumed() {
    const cost = getSelectedStageTicketCost();
    if (cost <= 0) return true;
    if (specialTicketConsumePending) return false;

    specialTicketConsumePending = true;
    try {
      const result = await consumeSelectedStageTicket();
      if (!result.consumed) {
        const message = 'チケットを所持していません';
        if (typeof window.showToast === 'function') window.showToast(message);
        else alert(message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[shooting] special ticket consume failed:', err);
      const message = 'SPECIAL STAGE TICKETの確認に失敗しました';
      if (typeof window.showToast === 'function') window.showToast(message);
      else alert(message);
      return false;
    } finally {
      specialTicketConsumePending = false;
    }
  }

  window.startSelectedShootingCharacter = async function () {
    if (isStoryShootingStage()) ensureStoryEriLeader();
    if (!isShootingPartyReady()) return;

    // build776: ユーザーの「戦闘開始」操作中に対象BGMをprimeして、
    // iOS/PWAでもカウントダウン開始時に再生しやすくする。
    warmShootingBattleBgm();
    primeShootingBattleBgmFromUserGesture();

    // 挑戦権は「戦闘開始」を押した瞬間にだけ消費する。
    if (!(await ensureSelectedDailyQuestAttemptConsumed())) return;
    if (!(await ensureSelectedRaidAttemptStarted())) return;
    if (!(await ensureSelectedStageTicketConsumed())) return;
    if (!(await ensureSelectedNoahAttemptStarted())) return;

    // build532: SCORE ATTACKは実際の編成確定後にattemptを作る。
    if (isScoreAttackStage() && window.ScoreAttack && typeof window.ScoreAttack.beginAttemptForParty === 'function') {
      const scoreAttackAttemptOk = await window.ScoreAttack.beginAttemptForParty(selectedPartyIds);
      if (!scoreAttackAttemptOk) return;
    }

    // 使用キャラランキング用。編成された各キャラを1出撃として記録。
    // 集計保存はゲーム開始をブロックしない。
    void recordShootingCharacterUsage(selectedPartyIds, selectedStage?.id || '');

    // build772: アイキャッチ読み込み前から白い遮蔽を出し、
    // ステージタイトル演出が完了するまでバトル画面を一切見せない。
    beginShootingStageTransitionMask();

    // ステージIN演出。実ロードの有無とは切り離したアイキャッチ演出として扱う。
    const stageIcatchPromise = showShootingStageIcatch();

    selectedCharacterId = selectedPartyIds[0];
    clearEltenaBlackHole();
    resetState();
    // v163: issue/restore a server-side run token before battle can produce a first-clear reward.
    void beginSecureShootingRun();
    clearProjectiles();
    updateChapter4ShrinkWalls(performance.now());
    clearNormalBattleObjects();
    applySelectedCharacterToUi();
    setCharacterSelectVisible(false);
    setBattleHudVisible(true);
    applyShootingUiLayout(shootingUiLayoutType);
    setShootingHeaderMenuMode(true);
    ensureShootingPauseMenu();

    const root = document.getElementById(ROOT_ID);
    const result = document.getElementById('shooting-result');
    const boss = document.getElementById(BOSS_ID);
    const player = document.getElementById(PLAYER_ID);
    if (result) { result.classList.remove('show'); result.setAttribute('aria-hidden', 'true'); }
    if (boss) boss.classList.remove('defeated');
    if (player) player.classList.remove('defeated', 'damaged', 'hayate-moonlight');
    if (root) {
      root.classList.remove('boss-defeat-flash', 'boss-phase-flash', 'boss-phase-pause', 'player-defeat-flash');
      root.setAttribute('data-boss-phase', '1');
    }

    await stageIcatchPromise;
    await showShootingStageInfo();

    // タイトル演出が終わった白画面の裏で初期配置を完成させる。
    placeInitialUnits();
    renderHud();
    await endShootingStageTransitionMask();
    // 画面が戦闘へ戻った瞬間からBGM開始。BOSSは登場演出から専用曲を流す。
    activateShootingBattleBgm(true);
    requestAnimationFrame(() => {
      playBossStageIntro(runStartCountdown);
    });
  };

  window.openShootingStage = function (stageId) {
    return window.openShootingEvent({ stageId });
  };

  window.openShootingEvent = function (options = {}) {
    lastTapAt = 0;

    // 特別巡行の既存導線は openShootingEvent() を引数なしで呼ぶ。
    // STORYで最後に選んだstageIdを引き継がないよう、
    // 引数なし起動は常に従来のオーバーシア単戦へ戻す。
    const hasExplicitStage = !!(options && options.stageId);
    const hasExplicitEnemy = !!(options && options.enemyId);
    if (!hasExplicitStage && !hasExplicitEnemy) {
      showFacelessStageSelect();
      return;
    }

    resolveSelectedStage(options || {});
    selectedRaidContext = options && options.raidContext ? { ...options.raidContext } : null;
    BOSS = getCurrentShootingEnemy();
    shootingBattleBgmSessionActive = false;
    stopShootingBattleBgm(true);
    warmShootingBattleBgm();

    // パーティ選択中に、その後のバトル画像・ULT・敵画像を先読みしておく。
    warmShootingAssets();
    const root = UIModule.buildRoot({
      ROOT_ID, PLAYER_ID, BOSS_ID, BOSS, SHOOTING_CHARACTERS, CHARACTER_ID,
      getShootingRosterHtml,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onNativeTouchStart,
      onNativeTouchMove,
      onNativeTouchEnd,
      onNativeTouchCancel
    });
    const bossImage = document.getElementById(BOSS_ID);
    if (bossImage) {
      const selectedBossImage = getSelectedBossImage();
      if (selectedBossImage) void preloadShootingImage(selectedBossImage, 7000);
      const introMeta = getBossIntroMeta();
      if (introMeta && introMeta.image && introMeta.image !== selectedBossImage) void preloadShootingImage(introMeta.image, 7000);
      bossImage.src = selectedBossImage;
      bossImage.alt = BOSS.name || '';
      bossImage.style.setProperty('--enemy-scale', String(Number(BOSS.uiScale || 1)));
      bossImage.style.display = selectedStage && selectedStage.type === 'normal' ? 'none' : '';
    }
    root.setAttribute('data-shooting-stage', selectedStage ? selectedStage.id : '');
    root.setAttribute('data-battle-type', selectedStage ? selectedStage.type : 'boss');
    applyShootingUiLayout(shootingUiLayoutType);

    setCommonUiVisible(true);
    root.style.display = 'block';
    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
    clearEltenaBlackHole();
    resetState();
    clearProjectiles();
    updateChapter4ShrinkWalls(performance.now());
    const result = document.getElementById('shooting-result');
    if (result) { result.classList.remove('show'); result.setAttribute('aria-hidden', 'true'); }
    const copy = document.getElementById('shooting-start-copy');
    if (copy) copy.classList.add('hide');
    const boss = document.getElementById(BOSS_ID);
    if (boss) boss.classList.remove('defeated');
    const player = document.getElementById(PLAYER_ID);
    if (player) player.classList.remove('defeated');
    root.classList.remove('boss-defeat-flash', 'boss-phase-flash', 'boss-phase-pause', 'player-defeat-flash');
    root.setAttribute('data-boss-phase', '1');
    selectedPartyIds = [];
    selectedBlessingId = null;
    selectedStageHighScore = getLocalShootingHighScore(selectedStage?.id || '');
    setShootingHeaderMenuMode(false);
    void loadShootingHighScore();
    ensureShootingPauseMenu();
    refreshShootingRoster();

    const firstOwned = Object.keys(SHOOTING_CHARACTERS).map(Number).find(id => isPublicShootingCharacterId(id) && isShootingCharacterOwned(id));
    if (isStoryShootingStage() && isShootingCharacterOwned(CHARACTER_ID.ERI)) {
      selectedPartyIds = [Number(CHARACTER_ID.ERI)];
      selectedCharacterId = Number(CHARACTER_ID.ERI);
    } else {
      selectedCharacterId = firstOwned || CHARACTER_ID.ERI;
    }

    applySelectedCharacterToUi();

    if (options && options.resumeSnapshot) {
      requestAnimationFrame(() => {
        if (!applyShootingResumeSnapshot(options.resumeSnapshot)) {
          clearShootingResumeState();
          setCharacterSelectVisible(true);
          setBattleHudVisible(false);
          placeInitialUnits();
          renderHud();
        }
      });
      return;
    }

    setCharacterSelectVisible(true);
    setBattleHudVisible(false);
    requestAnimationFrame(() => {
      placeInitialUnits();
      renderHud();
    });
  };

  window.restartShootingEvent = async function () {
    // build812: DAILY巡行はRESULTから直接RETRYさせない。
    // UI表示が何らかの理由で崩れても、処理側で二重出撃を必ず止める。
    if (isDailyQuestStage()) {
      if (typeof window.syncDailyAttemptStateFromServer === 'function') {
        try { await window.syncDailyAttemptStateFromServer(); } catch (_) {}
      }
      const message = 'デイリー巡行はRESULTからRETRYできません';
      if (typeof window.showToast === 'function') window.showToast(message);
      else alert(message);
      return;
    }
    if (isRaidStage()) {
      alert('DAILY RAIDは1日1回のみ挑戦できます。');
      return;
    }
    if (!(await ensureSelectedStageTicketConsumed())) return;
    if (!(await ensureSelectedNoahAttemptStarted())) return;

    // SCORE ATTACKのRETRYは新しい挑戦なので、ここで新attemptを発行する。
    if (isScoreAttackStage() && window.ScoreAttack && typeof window.ScoreAttack.beginAttemptForParty === 'function') {
      const scoreAttackAttemptOk = await window.ScoreAttack.beginAttemptForParty(selectedPartyIds);
      if (!scoreAttackAttemptOk) return;
    }

    // RETRYも新しい1出撃として使用回数へ加算。
    void recordShootingCharacterUsage(selectedPartyIds, selectedStage?.id || '');

    // RETRYも「再度ステージへ入る」扱いとして同じ演出を挟む。
    fadeOutShootingBattleBgm(180, true);
    beginShootingStageTransitionMask();
    const stageIcatchPromise = showShootingStageIcatch();

    const root = document.getElementById(ROOT_ID);
    if (!root) {
      clearShootingStageTransitionMask();
      return window.openShootingEvent();
    }
    clearEltenaBlackHole();

    // RETRY前にCH04 ITEM関連DOMを旧state参照が生きているうちに完全掃除。
    // resetState()後では旧overlay参照を失い、ITEM発生/カウントが残留するため先に消す。
    clearChapter4FinalItem();
    purgeChapter4ItemDom();

    // RETRY前の旧stateが生きているうちに無貌OBJECT/弾を先に掃除する。
    // さらにclearProjectiles自体もDOM直指定で消すため、画像だけ残るゴーストを防ぐ。
    clearProjectiles();
    resetState();
    // RETRY is a fresh client battle state; obtain a valid server run token again.
    void beginSecureShootingRun();

    // RETRY時は前回の縮小幅を必ず破棄して0pxへ戻す。
    updateChapter4ShrinkWalls(performance.now());

    setShootingHeaderMenuMode(true);
    ensureShootingPauseMenu();
    clearNormalBattleObjects();
    applySelectedCharacterToUi();
    setCharacterSelectVisible(false);
    setBattleHudVisible(true);
    applyShootingUiLayout(shootingUiLayoutType);
    const result = document.getElementById('shooting-result');
    if (result) { result.classList.remove('show'); result.setAttribute('aria-hidden', 'true'); }
    const boss = document.getElementById(BOSS_ID);
    if (boss) boss.classList.remove('defeated');
    const player = document.getElementById(PLAYER_ID);
    if (player) player.classList.remove('defeated');
    root.classList.remove('boss-defeat-flash', 'boss-phase-flash', 'boss-phase-pause', 'player-defeat-flash');
    root.setAttribute('data-boss-phase', '1');
    await stageIcatchPromise;
    await showShootingStageInfo();
    placeInitialUnits();
    renderHud();
    await endShootingStageTransitionMask();
    activateShootingBattleBgm(true);
    playBossStageIntro(runStartCountdown);
  };

  window.closeShootingEvent = async function () {
    // RESULT画面から戻る時だけ、1秒かけて白へフェードしてから前画面へ戻す。
    // 戦闘中の退出・編成画面のキャンセルには適用しない。
    const resultElBeforeClose = document.getElementById('shooting-result');
    const resultWasVisible = !!(
      resultElBeforeClose &&
      (
        resultElBeforeClose.classList.contains('show') ||
        resultElBeforeClose.getAttribute('aria-hidden') === 'false'
      )
    );
    if (resultWasVisible) {
      if (shootingResultExitFadeRunning) return;
      await playShootingResultExitFade();
    }

    // PAUSEからの途中退出などでも戦闘BGMを残さない。
    fadeOutShootingBattleBgm(resultWasVisible ? 220 : 160, true);

    // SCORE ATTACKのRESULT画面から「戻る」を押した場合だけ、
    // ホームではなく「すこあた！」イベント画面へ戻す。
    // パーティ選択中のキャンセル等には影響させない。
    const returningToScoreAttackLobby = !!(
      isScoreAttackStage() &&
      resultElBeforeClose &&
      (
        resultElBeforeClose.classList.contains('show') ||
        resultElBeforeClose.getAttribute('aria-hidden') === 'false'
      )
    );

    // 明示的に「戻る/退出」した場合は中断復帰対象にしない。
    suppressShootingResumeSave = true;
    clearShootingResumeState();

    // 戻る先は「この画面を開いた直前の画面」。
    // 先に退避してからクリアし、古い戻り先が次回起動へ残らないようにする。
    const returnContext = window.__shootingReturnContext || null;
    window.__shootingReturnContext = null;

    const returningToFacelessStageSelect = !!(
      returnContext && returnContext.type === 'facelessStageSelect'
    );
    const returningToDailyStageSelect = !!(
      returnContext && returnContext.type === 'dailyStageSelect'
    );
    const returningToRaidLobby = !!(returnContext && returnContext.type === 'raidLobby');

    // 戦闘途中で戻った場合も、その日の挑戦は消費済み。
    // そこまでに与えたダメージだけを確定してリトライ抜けを防ぐ。
    if (
      isRaidStage() &&
      selectedRaidContext?.attemptStarted &&
      state &&
      !state.raidAttemptFinished &&
      window.RaidEvent &&
      typeof window.RaidEvent.finishAttempt === 'function'
    ) {
      state.raidDamageDealt = Math.max(0, Math.floor(Number(state.raidInitialHp || 0) - Number(state.boss && state.boss.hp || 0)));
      state.raidAttemptFinished = true;
      void window.RaidEvent.finishAttempt(state.raidDamageDealt, { aborted: true });
    }

    // ④パーティ編成 → ③無貌の天使 の戻りだけは、先に③を最前面へ完成表示する。
    // その後で④のshooting rootを破棄することで、背面の②特別巡行を一瞬も見せない。
    if (returningToFacelessStageSelect) {
      showFacelessStageSelect({ immediate: true });
      closeDailyStageSelect();
    } else if (returningToDailyStageSelect) {
      showDailyStageSelect({ immediate: true });
      closeFacelessStageSelect();
    } else {
      closeFacelessStageSelect();
      closeDailyStageSelect();
    }
    clearUltTimers();
    if (state) {
      state.running = false;
      state.ended = true;
      state.countdown = false;
      state.finishing = false;
      state.paused = false;
      state.pauseStartedAt = 0;
    }
    cancelAnimationFrame(rafId);
    clearEltenaBlackHole();
    clearProjectiles();
    clearNormalBattleObjects();
    pointerActive = false;
    pointerIsTouch = false;
    nativeTouchPointerFallback = false;
    nativeTouchActive = false;
    activeTouchIdentifier = null;
    clearNativeTouchCancelTimer();
    keys = Object.create(null);
    lastTapAt = 0;
    const root = document.getElementById(ROOT_ID);
    if (root) {
      // Close every shooting-only HUD immediately before returning to the previous screen.
      root.querySelectorAll('.shooting-footer, .shooting-switch-rail, .shooting-boss-hud, .shooting-hud').forEach(el => {
        el.style.display = 'none';
      });
      root.classList.remove('open');
      root.setAttribute('aria-hidden', 'true');
      root.style.pointerEvents = 'none';
      root.remove();
    }
    // Safety cleanup for stale nodes from an older build/session.
    document.querySelectorAll('.shooting-footer, .shooting-switch-rail').forEach(el => {
      if (el.closest(`#${ROOT_ID}`) || el.id === 'shooting-switch-rail') el.remove();
    });
    setCommonUiVisible(false);
    state = null;
    suppressShootingResumeSave = false;

    // 直前画面を復元する。
    if (returningToFacelessStageSelect || returningToDailyStageSelect) {
      // ステージ選択画面はroot削除前にすでに描画済み。
      selectedRaidContext = null;
      clearShootingResultExitFade();
      return;
    }

    if (returningToRaidLobby) {
      selectedRaidContext = null;
      if (typeof window.openDailyRaid === 'function') window.openDailyRaid({ immediate: true, refresh: true });
      clearShootingResultExitFade();
      return;
    }

    if (returningToScoreAttackLobby) {
      selectedRaidContext = null;
      if (typeof window.openScoreAttack === 'function') {
        // RESULT反映直後のランキングも再取得して表示する。
        window.openScoreAttack();
      }
      clearShootingResultExitFade();
      return;
    }

    selectedRaidContext = null;
    if (returnContext && returnContext.type === 'storyChapter') {
      const chapter = Number(returnContext.chapter || 1);
      const mode = returnContext.mode === 'beginner' ? 'beginner' : 'normal';
      if (typeof window.openStageSelect === 'function') {
        window.openStageSelect(chapter, mode);
      }
    }
    clearShootingResultExitFade();
  };

  function clearUltTimers() {
    if (!state || !Array.isArray(state.ultTimerIds)) return;
    state.ultTimerIds.forEach(id => clearTimeout(id));
    state.ultTimerIds = [];
  }

  function pushUltTimer(fn, delay) {
    if (!state) return;
    const id = setTimeout(() => {
      if (!state || state.ended || state.finishing) return;
      fn();
    }, delay);
    state.ultTimerIds.push(id);
  }

  function showUltCut(name, className, character) {
    if (state && state.skipNextUltCut) {
      state.skipNextUltCut = false;
      return;
    }
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    const c = character || getCurrentCharacter();
    const ultElement = applyUltElementVisualContext(c);
    const old = root.querySelector('.shooting-ult-cut');
    if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'shooting-ult-cut ' + (className || '') + ' ult-element-' + ultElement;
    el.dataset.ultElement = ultElement;
    el.innerHTML = `<span>ULT</span><strong>${name}</strong>`;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => el.classList.add('hide'), 720);
    setTimeout(() => el.remove(), 1150);
  }

  function ultScreenFlash(className, character) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    applyUltElementVisualContext(character || getCurrentCharacter());
    root.classList.remove('ult-flash-eri','ult-flash-hayate','ult-flash-ayane','ult-flash-nem','ult-flash-mito','ult-flash-wolf','ult-flash-element');
    void root.offsetWidth;
    if (className) root.classList.add(className);
    root.classList.add('ult-flash-element');
    setTimeout(() => {
      if (className) root.classList.remove(className);
      root.classList.remove('ult-flash-element');
    }, 700);
  }

  function applyUltDamage(amount, big, character) {
    if (!state || state.ended || state.finishing) return;
    const c = character || getCurrentCharacter();
    const attackElement = getUltAttackElement(c);
    if (isNormalBattle()) {
      const targets = state.normalEnemies.filter(enemy => enemy && enemy.el && enemy.hp > 0);
      targets.forEach(enemy => {
        const targetElement = getCombatTargetElement(enemy);
        const finalDamage = applyElementDamage(amount, attackElement, targetElement);
        damageNormalEnemy(enemy, finalDamage, performance.now(), !!big, getElementDamageReaction(attackElement, targetElement));
      });
      state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
      addLegacyCombatScore(Math.round(Number(amount || 0) * 35 * Math.max(1, targets.length)));
      evaluateNormalMission(performance.now());
      renderHud();
      return;
    }
    const targetElement = getCombatTargetElement(state.boss);
    const finalDamage = applyElementDamage(amount, attackElement, targetElement);
    const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(finalDamage || 0)));
    state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
    updateBossPhase();
    createHit(state.boss.x, state.boss.y, !!big);
    showBossDamageNumber(appliedDamage, !!big, getElementDamageReaction(attackElement, targetElement));
    flashBossHit(true);
    if (!addScoreAttackDamageScore(appliedDamage)) {
      addLegacyCombatScore(Math.round(appliedDamage * 100));
    }
    renderHud();
    if (state.boss.hp <= 0) beginBossDefeat();
  }

  function fireUltProjectile(x, y, vx, vy, damage, cls) {
    const p = makeProjectile('shooting-bullet shooting-ult-shot ' + (cls || ''), x, y, vx, vy, damage);
    if (p) state.bullets.push(p);
  }

  function getEriUltTargetPoints() {
    if (!state) return [];
    if (isNormalBattle()) {
      return state.normalEnemies
        .filter(enemy => enemy && enemy.el && enemy.hp > 0)
        .map(enemy => ({ x: Number(enemy.x || 0), y: Number(enemy.y || 0) }));
    }
    if (state.boss && state.boss.hp > 0) {
      return [{ x: Number(state.boss.x || 0), y: Number(state.boss.y || 0) }];
    }
    return [];
  }

  function spawnEriUltFeedback(kind, points) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const cls = kind === 'slash' ? 'shooting-eri-ult-slash' : 'shooting-eri-ult-mark';
    (Array.isArray(points) ? points : []).forEach(point => {
      const el = document.createElement('i');
      el.className = cls;
      arena.appendChild(el);
      positionUnit(el, Number(point.x || 0), Number(point.y || 0));
      setTimeout(() => el.remove(), kind === 'slash' ? 430 : 460);
    });
  }

  function spawnEriUltRays(points, character) {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !state) return;
    applyUltElementVisualContext(character || getCurrentCharacter());

    const startX = Number(state.player?.x || arena.clientWidth * .5);
    const startY = Number(state.player?.y || arena.clientHeight * .78) - 18;

    (Array.isArray(points) ? points : []).forEach((point, index) => {
      const targetX = Number(point.x || 0);
      const targetY = Number(point.y || 0);
      const dx = targetX - startX;
      const dy = targetY - startY;
      const length = Math.max(12, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;

      const ray = document.createElement('i');
      ray.className = 'shooting-eri-ult-ray';
      ray.style.left = `${startX}px`;
      ray.style.top = `${startY}px`;
      ray.style.width = `${length}px`;
      ray.style.setProperty('--eri-ray-angle', `${angle}deg`);
      ray.style.setProperty('--eri-ray-delay', `${Math.min(index, 5) * 10}ms`);
      arena.appendChild(ray);
      setTimeout(() => ray.remove(), 430 + Math.min(index, 5) * 10);
    });
  }

  function triggerEriUltImpactFeedback(points) {
    const root = document.getElementById(ROOT_ID);
    spawnEriUltFeedback('slash', points);
    if (!root) return;
    root.classList.remove('eri-ult-impact', 'eri-ult-hitstop');
    void root.offsetWidth;
    root.classList.add('eri-ult-impact', 'eri-ult-hitstop');
    // ダメージが入った瞬間を認識しやすいよう、短すぎたヒットストップを少し伸ばす。
    setTimeout(() => root.classList.remove('eri-ult-hitstop'), 135);
    setTimeout(() => root.classList.remove('eri-ult-impact'), 300);
  }

  function getLizGiantBombTargetPoint(arena) {
    const width = Math.max(1, Number(arena?.clientWidth || 0));
    const height = Math.max(1, Number(arena?.clientHeight || 0));
    const fallback = { x: width * .5, y: height * .30 };
    if (!state) return fallback;

    const points = [];
    if (Array.isArray(state.normalEnemies)) {
      state.normalEnemies.forEach(enemy => {
        if (enemy && enemy.el && enemy.hp > 0) {
          points.push({ x:Number(enemy.x || 0), y:Number(enemy.y || 0) });
        }
      });
    }
    if (!isNormalBattle() && state.boss && state.boss.hp > 0) {
      points.push({ x:Number(state.boss.x || 0), y:Number(state.boss.y || 0) });
    }
    if (!points.length) return fallback;

    const avgX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const avgY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return {
      x: clamp(avgX, 58, Math.max(58, width - 58)),
      y: clamp(avgY, 72, Math.max(72, height * .54)),
    };
  }

  function spawnLizGiantBombImpactHits(c) {
    const points = getEriUltTargetPoints();
    const attackElement = getUltAttackElement(c);
    points.forEach((point, index) => {
      setTimeout(() => {
        if (!state || state.ended || state.finishing) return;
        createBombSplashVictimHitEffect(Number(point.x || 0), Number(point.y || 0), attackElement);
      }, Math.min(index, 6) * 22);
    });
  }

  function useLizGiantBombUlt(c) {
    if (!state || state.ended || state.finishing) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    showUltCut(c.ultName || 'MEGA AQUA BOMB', c.effectKey, c);
    ultScreenFlash('ult-flash-element', c);
    ensureBombVisualStyles();

    const now = performance.now();
    const visual = getBombElementVisual(getUltAttackElement(c));
    const duration = Math.max(520, Number(c.lizUltThrowMs || 760));
    const blastRadius = Math.max(130, Number(c.lizUltBlastRadius || 164));
    const startX = Number(state.player?.x || arena.clientWidth * .5);
    const startY = Math.max(36, Number(state.player?.y || arena.clientHeight * .80) - 28);
    const target = getLizGiantBombTargetPoint(arena);

    // 投擲中は本人の射撃だけ短時間ロック。敵は動き続けるため、
    // 「巨大爆弾を敵陣へ放り込む」ULTとして共通閃光ULTと役割を分ける。
    state.ultLockUntil = now + duration + 360;
    state.playerShotLockUntil = Math.max(Number(state.playerShotLockUntil || 0), now + duration + 120);
    createBombThrowPop(startX, startY, getUltAttackElement(c));

    const shadow = document.createElement('i');
    shadow.className = 'shooting-liz-ult-bomb-shadow';
    shadow.style.setProperty('--bomb-rgb', visual.rgb);
    arena.appendChild(shadow);

    const bomb = document.createElement('i');
    bomb.className = 'shooting-liz-ult-bomb shooting-painter-ult-bomb';
    bomb.style.setProperty('--bomb-color', visual.color);
    bomb.style.setProperty('--bomb-rgb', visual.rgb);
    arena.appendChild(bomb);

    const startAt = performance.now();
    let raf = 0;
    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      bomb.remove();
      shadow.remove();
    };

    const impact = () => {
      cleanup();
      if (!state || state.ended || state.finishing) return;

      // 着弾と同時に盤面弾を吹き飛ばし、大きなAQUA爆風を見せてからダメージ。
      clearEnemyBulletsOnly();
      createGenericBombExplosionEffect(target.x, target.y, getUltAttackElement(c), blastRadius, 'L');
      spawnLizGiantBombImpactHits(c);
      shakeVeronicaPunchImpact();

      const root = document.getElementById(ROOT_ID);
      if (root) {
        root.classList.remove('eri-ult-hitstop');
        void root.offsetWidth;
        root.classList.add('eri-ult-hitstop');
        setTimeout(() => root.classList.remove('eri-ult-hitstop'), 150);
      }

      const damage = Number(c.atk || 0) * Number(c.ultDamageAtkMultiplier || 4.0);
      applyUltDamage(damage, true, c);
      renderHud();
    };

    const animate = (ts) => {
      if (!state || state.ended || state.finishing || !bomb.isConnected) {
        cleanup();
        return;
      }
      const t = clamp((ts - startAt) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 2.15);
      const x = startX + (target.x - startX) * eased;
      const baselineY = startY + (target.y - startY) * eased;
      const arcLift = Math.sin(Math.PI * t) * Math.min(118, 78 + Math.abs(startY - target.y) * .10);
      const y = baselineY - arcLift;
      const spin = t * 620;
      const scale = .58 + Math.sin(Math.PI * t) * .48 + t * .22;

      bomb.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%) rotate(${spin}deg) scale(${scale})`;
      shadow.style.transform = `translate3d(${x}px,${baselineY + 22}px,0) translate(-50%,-50%) scale(${.45 + t * .65})`;
      shadow.style.opacity = String(.18 + t * .50);

      if (t >= 1) {
        impact();
        return;
      }
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    renderHud();
  }

  function useEriUlt(c) {
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-eri', c);

    // 共通ULTのテンポ：
    // 発動 → 敵停止 → 閃光 → 一拍 → ダメージ → 敵行動再開。
    clearEnemyBulletsOnly();
    applyBossStun(1400, 'eri_ult');
    state.ultLockUntil = performance.now() + 1320;

    // 発動時点の盤面上の敵を固定。停止中に対象へ属性色の細い閃光を走らせる。
    const impactPoints = getEriUltTargetPoints();
    renderHud();

    // 停止したことを見せてから閃光を開始。
    pushUltTimer(() => {
      spawnEriUltRays(impactPoints, c);
    }, 240);

    // 閃光が走り切った後に約0.25秒の「間」を置き、
    // そこからダメージエフェクト＋ATK×3.0を同時に入れる。
    pushUltTimer(() => {
      triggerEriUltImpactFeedback(impactPoints);
      const damage = Number(c.atk || 0) * Number(c.ultDamageAtkMultiplier || 3.0);
      applyUltDamage(damage, true, c);
      renderHud();
      // 敵行動はこのヒットを見せた後、applyBossStun() の停止終了で再開する。
    }, 840);
  }

  function useHayateUlt(c) {
    const now = performance.now();
    const MODE_DURATION = 3500;
    const root = document.getElementById(ROOT_ID);
    const player = document.getElementById(PLAYER_ID);

    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-hayate');
    clearEnemyBulletsOnly();

    // 月光モード：3.5秒間、完全無敵＋ATK/攻撃速度アップ。
    // 発動直後だけ短い演出ロックを入れ、その後は強化状態の通常射撃を続ける。
    state.hayateMoonlightUntil = now + MODE_DURATION;
    state.ultActiveUntil = now + MODE_DURATION;
    state.ultLockUntil = now + 320;
    state.player.invulnUntil = Math.max(state.player.invulnUntil || 0, now + MODE_DURATION);
    state.lastShotAt = -9999;

    if (root) {
      root.classList.remove('hayate-moonlight-active');
      void root.offsetWidth;
      root.classList.add('hayate-moonlight-active');
    }
    if (player) player.classList.add('hayate-moonlight');
    const playerImg = document.getElementById('shooting-player-image');
    if (playerImg) playerImg.src = 'images/chara_04_battle_back_moon.webp';
    renderHud();

    pushUltTimer(() => {
      if (!state) return;
      state.hayateMoonlightUntil = 0;
      state.ultActiveUntil = 0;
      if (root) root.classList.remove('hayate-moonlight-active');
      if (player) player.classList.remove('hayate-moonlight');
      const playerImg = document.getElementById('shooting-player-image');
      if (playerImg && getCurrentCharacter().id === CHARACTER_ID.HAYATE) {
        playerImg.src = getCurrentCharacter().image;
      }
      renderHud();
    }, MODE_DURATION);
  }

  function useNemUlt(c) {
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-nem');
    const now = performance.now();
    state.ultLockUntil = now + 260;
    applyBossStun(c.ultStunMs || 5000, 'ult');
    renderHud();
  }

  function useGojoUlt(c) {
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-ayane');

    const arena = document.getElementById('shooting-arena');
    const root = document.getElementById(ROOT_ID);
    if (!arena || !state) return;

    clearGojoPurpleField();

    const now = performance.now();
    const HOLD_MS = Number(c.gojoPurpleDurationMs || 7000);
    const PULL_RADIUS = Math.max(60, Number(c.gojoPurplePullRadius || 165));
    const startX = Number(state.player.x || arena.clientWidth * .5);
    const startY = Math.max(24, Number(state.player.y || arena.clientHeight * .72) - 18);
    const TRAVEL_SPEED = 620; // px / sec
    const MAX_TRAVEL_MS = Math.max(900, Math.ceil((startY + 100) / TRAVEL_SPEED * 1000) + 220);
    const ROTATE_DPS = 300;

    // 正面＝画面上方向へ固定。敵への自動照準は行わない。
    const dirX = 0;
    const dirY = -1;
    const baseDeg = 0;

    // build566: 鎌の飛行中に敵の射撃だけが止まる副作用を廃止。
    // 敵は通常行動を継続し、マグダレーナ本人の通常射撃だけを投擲中ロックする。
    state.ultLockUntil = now + 260;
    state.playerShotLockUntil = now + MAX_TRAVEL_MS + 120;
    renderHud();

    const wave = document.createElement('div');
    wave.className = 'shooting-gojo-purple-wave scythe fly';
    wave.setAttribute('aria-hidden', 'true');
    const scytheImg = document.createElement('img');
    scytheImg.className = 'shooting-shuri-scythe-img';
    scytheImg.src = SHURI_ULT_SCYTHE_SRC;
    scytheImg.alt = '';
    scytheImg.draggable = false;
    wave.appendChild(scytheImg);
    arena.appendChild(wave);
    wave.style.transformOrigin = '50% 50%';

    const setScytheTransform = (x, y, deg = 0, scale = 1) => {
      wave.style.transform =
        `translate3d(${x}px,${y}px,0) translate(-50%,-50%) rotate(${deg}deg) scale(${scale})`;
    };

    let currentX = startX;
    let currentY = startY;
    let prevTs = now;
    let resolved = false;

    const releaseAsMiss = (x = currentX, y = currentY) => {
      if (resolved || !wave.isConnected) return;
      resolved = true;
      setScytheTransform(x, y, 0, 1);
      wave.classList.remove('fly');
      wave.classList.add('miss', 'release', 'fade');
      state.ultLockUntil = performance.now() + 120;
      state.playerShotLockUntil = performance.now() + 120;
      if (root) {
        root.classList.add('ult-miss');
        setTimeout(() => root.classList.remove('ult-miss'), 450);
      }
      pushUltTimer(() => wave.isConnected && wave.remove(), 480);
      renderHud();
    };

    const collectTargets = () => {
      const targets = [];

      // 通常ステージの敵、およびBOSS戦の取り巻き。
      (state.normalEnemies || []).forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;
        targets.push({
          kind: 'enemy', ref: enemy,
          x: Number(enemy.x || 0), y: Number(enemy.y || 0),
          hitRadius: Math.max(26, Number(enemy.hitRadius || 34))
        });
      });

      // フェイスレスの召喚OBJECTも「敵」として鎌に当たる。
      (state.facelessObjects || []).forEach(obj => {
        if (!obj || !obj.el || obj.hp <= 0) return;
        targets.push({
          kind: 'object', ref: obj,
          x: Number(obj.x || 0), y: Number(obj.y || 0),
          hitRadius: 42
        });
      });

      if (!isNormalBattle() && state.boss && state.boss.hp > 0) {
        targets.push({
          kind: 'boss', ref: state.boss,
          x: Number(state.boss.x || 0), y: Number(state.boss.y || 0),
          hitRadius: 58
        });
      }
      return targets;
    };

    const captureAtImpact = (x, y) => {
      const activeFrom = performance.now();
      const activeUntil = activeFrom + HOLD_MS;
      const capturedEnemyUids = [];
      const capturedObjectUids = [];
      let capturedBoss = false;

      (state.normalEnemies || []).forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;
        if (Math.hypot(Number(enemy.x || 0) - x, Number(enemy.y || 0) - y) > PULL_RADIUS) return;
        capturedEnemyUids.push(String(enemy.uid || ''));
        enemy.gojoPurpleFreezeUntil = activeUntil;
        freezeNormalEnemyAction(enemy, activeUntil);
      });

      (state.facelessObjects || []).forEach(obj => {
        if (!obj || !obj.el || obj.hp <= 0) return;
        if (Math.hypot(Number(obj.x || 0) - x, Number(obj.y || 0) - y) > PULL_RADIUS) return;
        capturedObjectUids.push(String(obj.uid || ''));
        obj.gojoPurpleFreezeUntil = activeUntil;
        deferFacelessObjectAttackResume(obj, activeUntil);
      });

      if (!isNormalBattle() && state.boss && state.boss.hp > 0) {
        const bossDist = Math.hypot(Number(state.boss.x || 0) - x, Number(state.boss.y || 0) - y);
        if (bossDist <= PULL_RADIUS) {
          capturedBoss = true;
          state.gojoPurpleBossFreezeUntil = activeUntil;
          // WARNING予兆中の予約も含め、再開後へ安全に送り直す。
          deferBossAttackResume(activeUntil);
        }
      }

      state.gojoPurpleField = {
        x,
        y,
        activeFrom,
        activeUntil,
        pullRadius: PULL_RADIUS,
        pullStrength: Number(c.gojoPurplePullStrength || 10.8),
        enemyStopRadius: Number(c.gojoPurpleEnemyStopRadius || 18),
        bossStopRadius: Number(c.gojoPurpleBossStopRadius || 26),
        capturedEnemyUids,
        capturedObjectUids,
        capturedBoss,
      };

      state.ultLockUntil = performance.now() + 120;
      state.playerShotLockUntil = performance.now() + 120;
      state.lastShotAt = performance.now();
      renderHud();
    };

    const impactAt = (target) => {
      if (resolved || !state || state.ended || state.finishing || !wave.isConnected) return;
      resolved = true;

      const x = Number(target?.x || currentX);
      const y = Number(target?.y || currentY);
      setScytheTransform(x, y, 0, 1);
      wave.classList.remove('fly');
      wave.classList.add('impact', 'hit', 'grab');
      createHit(x, y, true);

      // 命中の衝撃だけ短く揺らす。拘束中ずっと揺らし続けない。
      if (root) {
        root.classList.add('ayane-rampage-shake');
        pushUltTimer(() => root.classList.remove('ayane-rampage-shake'), 240);
      }

      captureAtImpact(x, y);

      pushUltTimer(() => {
        if (!state) return;
        clearGojoPurpleField();
        if (wave.isConnected) {
          wave.classList.remove('grab');
          wave.classList.add('release', 'fade');
        }
        renderHud();
      }, HOLD_MS);

      pushUltTimer(() => {
        if (wave.isConnected) wave.remove();
        if (root) root.classList.remove('ayane-rampage-shake');
      }, HOLD_MS + 420);
    };

    const animateTravel = ts => {
      if (resolved || !wave.isConnected || !state || state.ended || state.finishing) return;

      const dt = Math.max(0.001, Math.min(.04, (ts - prevTs) / 1000));
      prevTs = ts;
      const elapsedMs = ts - now;

      currentX += dirX * TRAVEL_SPEED * dt;
      currentY += dirY * TRAVEL_SPEED * dt;
      const spinDeg = (elapsedMs / 1000) * ROTATE_DPS;
      setScytheTransform(currentX, currentY, baseDeg + spinDeg, 1);

      // CH06 / DAILY上級の破壊不能壁は物理投擲を遮断する。
      // 壁は敵ではないため、ここで止まった場合はMISS扱い。
      const blocked = (state.chapter6Barriers || []).find(barrier => {
        if (!barrier || !barrier.el) return false;
        const halfW = Number(barrier.width || 0) * .5 + 22;
        const halfH = Number(barrier.height || 0) * .5 + 22;
        return (
          Math.abs(currentX - Number(barrier.x || 0)) <= halfW &&
          Math.abs(currentY - Number(barrier.y || 0)) <= halfH
        );
      });
      if (blocked) {
        pulseChapter6Barrier(blocked);
        releaseAsMiss(currentX, currentY);
        return;
      }

      // 現在位置に最初に触れた敵で停止。自動追尾・最寄り照準はしない。
      const contact = collectTargets()
        .map(target => ({
          ...target,
          distance: Math.hypot(target.x - currentX, target.y - currentY)
        }))
        .filter(target => target.distance <= target.hitRadius)
        .sort((a, b) => b.y - a.y || a.distance - b.distance)[0] || null;

      if (contact) {
        impactAt(contact);
        return;
      }

      if (currentY <= -56 || elapsedMs >= MAX_TRAVEL_MS) {
        releaseAsMiss(currentX, currentY);
        return;
      }

      requestAnimationFrame(animateTravel);
    };

    setScytheTransform(currentX, currentY, baseDeg, 1);
    requestAnimationFrame(animateTravel);
  }

  function useAyaneUlt(c) {
    const isGojoPurple = Number(c && c.id) === Number(CHARACTER_ID.SHURI);
    if (!isGojoPurple) {
      preloadShootingImage(AYANE_ULT_HAND_OPEN_SRC);
      preloadShootingImage(AYANE_ULT_HAND_CLOSE_SRC);
    }
    if (isNormalBattle()) {
      showUltCut(c.ultName, c.effectKey);
      ultScreenFlash('ult-flash-ayane');
      clearEnemyBulletsOnly();

      const arena = document.getElementById('shooting-arena');
      const root = document.getElementById(ROOT_ID);
      const livingTargets = (state.normalEnemies || [])
        .filter(enemy => enemy && enemy.el && enemy.hp > 0);

      if (!arena || !livingTargets.length) {
        state.ultLockUntil = performance.now() + 420;
        return;
      }

      const now = performance.now();
      const STRIKE_DELAY = 620;
      const GRAB_DURATION = 7000;
      const RELEASE_DELAY = STRIKE_DELAY + GRAB_DURATION;

      const startX = state.player.x;
      const startY = Math.max(24, state.player.y - 18);

      // 最寄りの敵を「主目標」にして射線方向を決める。
      const primary = livingTargets
        .slice()
        .sort((a, b) => {
          const da = Math.hypot((a.x || 0) - startX, (a.y || 0) - startY);
          const db = Math.hypot((b.x || 0) - startX, (b.y || 0) - startY);
          return da - db;
        })[0];

      const aimDx = Number(primary.x || 0) - startX;
      const aimDy = Number(primary.y || 0) - startY;
      const aimLen = Math.max(1, Math.hypot(aimDx, aimDy));
      const ux = aimDx / aimLen;
      const uy = aimDy / aimLen;

      // 黒手は主目標で止めず、その方向へ画面外まで伸びる。
      // 射線上に複数の敵が並んでいれば、全員を同時に掴む。
      const rayLength = Math.hypot(arena.clientWidth, arena.clientHeight) * 1.25;
      const endX = startX + ux * rayLength;
      const endY = startY + uy * rayLength;

      // 「当たった」の判定幅。黒手の見た目に合わせてやや太め。
      const HIT_HALF_WIDTH = 74;

      function distanceToAyaneRay(enemy) {
        const ex = Number(enemy.x || 0) - startX;
        const ey = Number(enemy.y || 0) - startY;
        const along = ex * ux + ey * uy;
        if (along < 0 || along > rayLength) return { along, side: Infinity };
        const side = Math.abs(ex * uy - ey * ux);
        return { along, side };
      }

      let hitTargets = livingTargets
        .map(enemy => ({ enemy, ...distanceToAyaneRay(enemy) }))
        .filter(v => v.side <= HIT_HALF_WIDTH)
        .sort((a, b) => a.along - b.along)
        .map(v => v.enemy);

      // 主目標は必ず掴む。端数・DOM位置差で主目標だけ漏れるのを防止。
      if (!hitTargets.includes(primary)) hitTargets.unshift(primary);

      // 同一敵の重複を防止。
      hitTargets = Array.from(new Set(hitTargets));

      // アヤネ自身は黒手が命中するまでだけ通常射撃停止。
      // 命中後は7秒拘束中でも通常攻撃・キャラチェンジ可能。
      state.ultLockUntil = now + STRIKE_DELAY + 120;

      // 当たり判定の射線は従来どおり画面外まで伸ばすが、
      // 黒手画像そのものまで rayLength で描くと、掌が画面外へ飛び出して
      // 腕だけ見える状態になる。
      // 見た目は「実際に掴んだ敵のうち一番遠い個体」までで止める。
      const hitProjections = hitTargets
        .map(enemy => distanceToAyaneRay(enemy).along)
        .filter(v => Number.isFinite(v) && v >= 0);
      const farthestHitAlong = hitProjections.length
        ? Math.max(...hitProjections)
        : Math.max(80, aimLen);

      // 掌画像が敵の中心を少し包む程度だけ先へ伸ばす。
      const visualDistance = Math.max(100, farthestHitAlong + 34);
      const visualEndX = startX + ux * visualDistance;
      const visualEndY = startY + uy * visualDistance;
      const angle = Math.atan2(uy, ux) * 180 / Math.PI;

      const fx = document.createElement('div');
      fx.className = 'shooting-ayane-blackhand-ult shooting-ayane-blackhand-multi' + (isGojoPurple ? ' gojo-purple-ult' : '');
      fx.style.setProperty('--ayane-start-x', `${startX}px`);
      fx.style.setProperty('--ayane-start-y', `${startY}px`);
      fx.style.setProperty('--ayane-end-x', `${visualEndX}px`);
      fx.style.setProperty('--ayane-end-y', `${visualEndY}px`);
      fx.style.setProperty('--ayane-distance', `${visualDistance}px`);
      fx.style.setProperty('--ayane-angle', `${angle}deg`);
      fx.innerHTML = getAyaneBlackhandHtml('', isGojoPurple ? 'gojo' : 'ayane');
      arena.appendChild(fx);

      if (root) root.classList.add('ayane-rampage-active');

      pushUltTimer(() => fx.classList.add('charge'), 90);
      pushUltTimer(() => {
        if (!fx.isConnected) return;
        fx.classList.add('strike');
      }, 300);

      pushUltTimer(() => {
        if (!state || !fx.isConnected) return;

        fx.classList.add('hit', 'grab');
        if (root) root.classList.add('ayane-rampage-shake');

        const grabUntil = performance.now() + GRAB_DURATION;
        const totalDamage =
          Number(c.atk || 0) *
          Number(c.ultDamageAtkMultiplier || 3.5);
        const initialDamage = totalDamage * 0.18;
        const tickCount = 28; // 250ms × 28 = 7秒
        const tickDamage = (totalDamage - initialDamage) / tickCount;

        // 命中した敵を全員、個別に7秒拘束。
        hitTargets.forEach((enemy, index) => {
          if (!enemy || enemy.hp <= 0 || !enemy.el) return;

          enemy.ayaneGrabUntil = grabUntil;
          freezeNormalEnemyAction(enemy, grabUntil, index);
          enemy.el.classList.add('ayane-grabbed', 'ayane-multi-grabbed');

          // 各敵の位置に個別の拘束リングを表示。
          const marker = document.createElement('div');
          marker.className = 'shooting-ayane-multi-grip';
          marker.dataset.enemyUid = String(enemy.uid || index);
          arena.appendChild(marker);
          positionUnit(marker, enemy.x, enemy.y);
          enemy.ayaneGrabMarker = marker;

          createHit(enemy.x, enemy.y, true);
          const initialElementDamage = applyElementDamage(initialDamage, getUltAttackElement(c), getCombatTargetElement(enemy));
          damageNormalEnemy(enemy, initialElementDamage, performance.now(), true, getElementDamageReaction(getUltAttackElement(c), getCombatTargetElement(enemy)));

          // 7秒間に残りダメージを分割。
          for (let i = 1; i <= tickCount; i++) {
            pushUltTimer(() => {
              if (!state || state.ended || !enemy || enemy.hp <= 0) return;
              const tickElementDamage = applyElementDamage(tickDamage, getUltAttackElement(c), getCombatTargetElement(enemy));
              damageNormalEnemy(enemy, tickElementDamage, performance.now(), false, getElementDamageReaction(getUltAttackElement(c), getCombatTargetElement(enemy)));

              // 敵が倒れた場合は拘束マーカーを即消す。
              if (enemy.hp <= 0 && enemy.ayaneGrabMarker) {
                enemy.ayaneGrabMarker.remove();
                enemy.ayaneGrabMarker = null;
                enemy.ayaneGrabUntil = 0;
              }
            }, i * 250);
          }
        });

        // 命中成立後はアヤネ通常攻撃を即再開。
        state.ultLockUntil = performance.now() + 120;
        state.lastShotAt = performance.now();

        renderHud();
      }, STRIKE_DELAY);

      pushUltTimer(() => {
        hitTargets.forEach(enemy => {
          if (!enemy) return;
          enemy.ayaneGrabUntil = 0;
          if (enemy.el) enemy.el.classList.remove('ayane-grabbed', 'ayane-multi-grabbed');
          if (enemy.ayaneGrabMarker) {
            enemy.ayaneGrabMarker.classList.add('release');
            const marker = enemy.ayaneGrabMarker;
            enemy.ayaneGrabMarker = null;
            setTimeout(() => marker.isConnected && marker.remove(), 280);
          }
        });

        fx.classList.remove('grab');
        fx.classList.add('release');
        if (root) root.classList.remove('ayane-rampage-shake');
        renderHud();
      }, RELEASE_DELAY);

      pushUltTimer(() => {
        fx.classList.add('fade');
        if (root) {
          root.classList.remove('ayane-rampage-shake');
          root.classList.remove('ayane-rampage-active');
        }
      }, RELEASE_DELAY + 240);

      pushUltTimer(() => {
        if (fx.isConnected) fx.remove();
      }, RELEASE_DELAY + 700);

      return;
    }
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-ayane');
    clearEnemyBulletsOnly();

    const now = performance.now();
    const GRAB_DURATION = 7000;
    const STRIKE_DELAY = 760;
    const RELEASE_DELAY = STRIKE_DELAY + GRAB_DURATION;
    // 黒手が飛んでいる間だけアヤネの通常射撃を一時停止。命中した場合は7秒拘束へ移行する。
    // MISS時に5秒間ボス攻撃だけ止まり続ける不具合を防ぐ。
    state.ultLockUntil = now + STRIKE_DELAY + 220;

    // 黒手の突進中はボス位置も固定する。
    // ultLockUntil は射撃停止には効くが、ボス移動自体は止めないため、
    // 旧実装では黒手の到達点を決めた後にボスだけ動いてMISSしやすかった。
    state.bossGrabUntil = now + STRIKE_DELAY + 80;

    renderHud();

    const arena = document.getElementById('shooting-arena');
    const root = document.getElementById(ROOT_ID);
    const bossEl = document.getElementById(BOSS_ID);
    if (!arena) return;

    const startX = state.player.x;
    const startY = Math.max(24, state.player.y - 18);
    const endX = state.boss.x;
    const endY = Math.max(24, state.boss.y + 14);
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.max(80, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    const fx = document.createElement('div');
    fx.className = 'shooting-ayane-blackhand-ult' + (isGojoPurple ? ' gojo-purple-ult' : '');
    fx.style.setProperty('--ayane-start-x', `${startX}px`);
    fx.style.setProperty('--ayane-start-y', `${startY}px`);
    fx.style.setProperty('--ayane-end-x', `${endX}px`);
    fx.style.setProperty('--ayane-end-y', `${endY}px`);
    fx.style.setProperty('--ayane-distance', `${distance}px`);
    fx.style.setProperty('--ayane-angle', `${angle}deg`);
    fx.innerHTML = getAyaneBlackhandHtml(`
      <div class="shooting-ayane-blackhand-grip-ring r1"></div>
      <div class="shooting-ayane-blackhand-grip-ring r2"></div>
      <div class="shooting-ayane-blackhand-grip-ring r3"></div>
      <div class="shooting-ayane-blackhand-smoke s1"></div>
      <div class="shooting-ayane-blackhand-smoke s2"></div>
      <div class="shooting-ayane-blackhand-smoke s3"></div>
      <div class="shooting-ayane-blackhand-smoke s4"></div>
    `, isGojoPurple ? 'gojo' : 'ayane');
    arena.appendChild(fx);

    if (root) root.classList.add('ayane-rampage-active');
    requestAnimationFrame(() => fx.classList.add('run'));

    pushUltTimer(() => fx.classList.add('charge'), 180);

    pushUltTimer(() => {
      fx.classList.add('strike');
    }, 520);

    pushUltTimer(() => {
      // 見た目と当たり判定を一致させる。
      // 黒手の実DOMとボス画像の実DOMが重なっているかを最優先で判定する。
      const impactEl = fx.querySelector('.shooting-ayane-blackhand-impact');
      const impactRect = impactEl ? impactEl.getBoundingClientRect() : null;
      const bossRect = bossEl ? bossEl.getBoundingClientRect() : null;

      const visualHit =
        !!(impactRect && bossRect && rectsHit(impactRect, bossRect, -6, -6));

      // DOM取得不能時の保険。突進中はボスを固定しているため、
      // 到達点との距離でも十分一致する。
      const hitDistance = Math.hypot(
        Number(state.boss.x || 0) - endX,
        Number(state.boss.y || 0) - endY
      );
      const didHit = visualHit || hitDistance <= 118;

      fx.classList.add(didHit ? 'hit' : 'miss');
      if (!didHit) {
        // MISS：掴み状態には入らず、黒手はそのまま通過して短時間で消える。
        state.bossGrabUntil = 0;
        state.ultLockUntil = performance.now() + 180;
        fx.classList.add('release', 'fade');
        if (root) {
          root.classList.add('ult-miss');
          root.classList.remove('ayane-rampage-shake');
          setTimeout(() => root.classList.remove('ult-miss'), 450);
        }
        setTimeout(() => {
          if (fx && fx.isConnected) fx.remove();
          if (root) root.classList.remove('ayane-rampage-active');
        }, 520);
        renderHud();
        return;
      }

      // 命中時のみ、黒手がボスを7秒間掴んで完全拘束する。
      // ボスは bossGrabUntil で止めるが、アヤネ側の ultLockUntil はすぐ解除する。
      // これにより「拘束中も通常攻撃を続けられる」状態になる。
      state.bossGrabUntil = performance.now() + GRAB_DURATION;
      deferBossAttackResume(state.bossGrabUntil);
      state.ultLockUntil = performance.now() + 120;
      state.lastShotAt = performance.now();
      clearEnemyBulletsOnly();
      fx.classList.add('grab');
      if (root) root.classList.add('ayane-rampage-shake');

      if (bossEl) {
        bossEl.classList.add('ayane-grabbed');
        bossEl.classList.remove('hit-flash', 'burst-hit');
        void bossEl.offsetWidth;
        bossEl.classList.add('burst-hit');
      }

      // 命中したことが視覚的に分かるよう、掴み成立時に大きめのHIT演出を出す。
      createHit(state.boss.x, state.boss.y, true);

      const totalDamage =
        Number(c.atk || 0) *
        Number(c.ultDamageAtkMultiplier || 3.5);
      const initialDamage = totalDamage * 0.18;
      const tickCount = 28; // 250ms × 28 = 7秒
      const tickDamage = Math.max(0.1, (totalDamage - initialDamage) / tickCount);

      // 掴んだ瞬間の初撃。ゲージ段階更新は拘束終了時にまとめる。
      if (state && !state.ended && !state.finishing) {
        const initialElementDamage = applyElementDamage(initialDamage, getUltAttackElement(c), getCombatTargetElement(state.boss));
        const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(initialElementDamage || 0)));
        state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
        createHit(state.boss.x, state.boss.y, true);
        showBossDamageNumber(appliedDamage, true, getElementDamageReaction(getUltAttackElement(c), getCombatTargetElement(state.boss)));
        flashBossHit(true);
        if (!addScoreAttackDamageScore(appliedDamage)) {
          addLegacyCombatScore(Math.round(initialDamage * 100));
        }
        renderHud();
        if (state.boss.hp <= 0) beginBossDefeat();
      }

      for (let i = 1; i <= tickCount; i++) {
        pushUltTimer(() => {
          if (!state || state.ended || state.finishing || state.boss.hp <= 0) return;
          const tickElementDamage = applyElementDamage(tickDamage, getUltAttackElement(c), getCombatTargetElement(state.boss));
          const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(tickElementDamage || 0)));
          state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
          showBossDamageNumber(appliedDamage, false, getElementDamageReaction(getUltAttackElement(c), getCombatTargetElement(state.boss)));
          if (!addScoreAttackDamageScore(appliedDamage)) {
            addLegacyCombatScore(Math.round(tickDamage * 100));
          }
          if (i % 2 === 0) {
            createHit(state.boss.x + (Math.random() - .5) * 26, state.boss.y + (Math.random() - .5) * 20, false);
            flashBossHit(false);
            fx.classList.remove('grip-pulse');
            void fx.offsetWidth;
            fx.classList.add('grip-pulse');
          }
          renderHud();
          if (state.boss.hp <= 0) beginBossDefeat();
        }, i * 250);
      }

      pushUltTimer(() => {
        if (!state) return;
        state.bossGrabUntil = 0;
        deferBossAttackResume(performance.now());
        if (bossEl) bossEl.classList.remove('ayane-grabbed');
        fx.classList.remove('grab');
        fx.classList.add('release');
        // 7秒の継続ダメージ終了後にゲージ割り判定を行う。
        if (!state.ended && !state.finishing && state.boss.hp > 0) updateBossPhase();
        renderHud();
      }, GRAB_DURATION);
    }, STRIKE_DELAY);

    pushUltTimer(() => {
      fx.classList.add('fade');
      if (root) {
        root.classList.remove('ayane-rampage-shake');
        root.classList.remove('ayane-rampage-active');
      }
      if (bossEl) bossEl.classList.remove('ayane-grabbed');
      if (state) state.bossGrabUntil = 0;
      renderHud();
    }, RELEASE_DELAY + 240);

    setTimeout(() => {
      fx.remove();
      if (root) {
        root.classList.remove('ayane-rampage-shake');
        root.classList.remove('ayane-rampage-active');
      }
      if (bossEl) bossEl.classList.remove('ayane-grabbed');
      if (state) state.bossGrabUntil = 0;
    }, RELEASE_DELAY + 700);
  }

  function getArnoAuraVisualKey(enemy) {
    if (!enemy) return '';
    return enemy.isBoss ? 'boss' : String(enemy.uid || '');
  }

  function getArnoAuraTargets() {
    if (!state) return [];
    if (isNormalBattle()) {
      return (state.normalEnemies || [])
        .filter(enemy => enemy && enemy.el && enemy.hp > 0)
        .map(enemy => ({ ...enemy, isBoss: false }));
    }
    if (state.boss && state.boss.hp > 0) {
      return [{ uid: 'boss', x: state.boss.x, y: state.boss.y, isBoss: true }];
    }
    return [];
  }

  function syncArnoAuraVisuals(now) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    if (!state || now >= (state.arnoAuraUntil || 0)) {
      arena.querySelectorAll('.shooting-arno-aura').forEach(el => el.remove());
      return;
    }

    const targets = getArnoAuraTargets();
    const liveKeys = new Set(targets.map(getArnoAuraVisualKey));

    arena.querySelectorAll('.shooting-arno-aura').forEach(el => {
      if (!liveKeys.has(el.dataset.auraKey || '')) el.remove();
    });

    targets.forEach(target => {
      const key = getArnoAuraVisualKey(target);
      let el = arena.querySelector(`.shooting-arno-aura[data-aura-key="${key}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'shooting-arno-aura';
        el.dataset.auraKey = key;
        el.innerHTML = '<i></i><b></b><span></span>';
        arena.appendChild(el);
      }
      positionUnit(el, target.x, target.y);
    });
  }

  function applyArnoAuraTick(now) {
    if (!state || now >= (state.arnoAuraUntil || 0)) return;
    if (now < (state.arnoAuraNextTickAt || 0)) return;

    const c = getBattleCharacter(state.arnoAuraOwnerId || CHARACTER_ID.ARNO);
    const tickMs = Number(c?.auraTickMs || 250);
    const damage = Number(c?.auraTickDamage || 1.8);
    state.arnoAuraNextTickAt = now + tickMs;

    if (isNormalBattle()) {
      const targets = [...(state.normalEnemies || [])];
      targets.forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;
        const targetElement = getCombatTargetElement(enemy);
        const finalDamage = applyElementDamage(damage, getUltAttackElement(c), targetElement);
        damageNormalEnemy(enemy, finalDamage, now, false, getElementDamageReaction(getUltAttackElement(c), targetElement));
      });
      state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
      return;
    }

    if (!state.boss || state.boss.hp <= 0) return;
    const targetElement = getCombatTargetElement(state.boss);
    const finalDamage = applyElementDamage(damage, getUltAttackElement(c), targetElement);
    const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(finalDamage || 0)));
    state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
    showBossDamageNumber(appliedDamage, false, getElementDamageReaction(getUltAttackElement(c), targetElement));
    if (!addScoreAttackDamageScore(appliedDamage)) {
      addLegacyCombatScore(Math.round(damage * 100));
    }
    createHit(
      state.boss.x + (Math.random() - .5) * 32,
      state.boss.y + (Math.random() - .5) * 28,
      false
    );
    flashBossHit(false);
    updateBossPhase();
    if (state.boss.hp <= 0) beginBossDefeat();
  }

  function updateArnoAura(now) {
    syncArnoAuraVisuals(now);
    applyArnoAuraTick(now);
  }

  function healRoseActiveCharacter(maxHpRate) {
    if (!state || !Array.isArray(state.party)) return;

    // ハート取得時点で場にいるキャラだけ回復。ベンチは回復しない。
    const member = state.party.find(m => m && Number(m.id) === Number(state.activeCharacterId));
    if (!member || member.hp <= 0) return;

    const rate = Math.max(0, Number(maxHpRate || 0));
    if (!rate) return;

    const hpMax = Math.max(0, Number(member.hpMax || 0));
    const heal = Math.max(1, Math.round(hpMax * rate));
    member.hp = Math.min(hpMax, Number(member.hp || 0) + heal);
    renderHud();
  }

  function removeRoseFlower() {
    if (!state || !state.roseFlower) return;
    const flower = state.roseFlower;
    if (flower.el) {
      flower.el.classList.add('fade');
      setTimeout(() => flower.el && flower.el.remove(), 260);
    }
    state.roseFlower = null;
  }

  function createRoseHeartProjectile(flower, c, angle, angleOffset) {
    if (!state || !flower) return null;

    const speed = Number(c.flowerHeartSpeed || 250);
    const theta = angle + angleOffset;

    // 花を「弾を撃つユニット」として扱う。
    // プレイヤー弾が state.player.x/y、敵弾が enemy.x/y から出るのと同じ。
    const originX =
      Number(flower.x || 0) +
      Number(c.flowerHeartOriginOffsetX || 0);

    const originY =
      Number(flower.y || 0) +
      Number(c.flowerHeartOriginOffsetY || 0);

    const p = makeProjectile(
      'shooting-bullet shooting-bullet-rose-heart',
      originX,
      originY,
      Math.cos(theta) * speed,
      Math.sin(theta) * speed,
      0,
      c.id
    );
    if (!p) return null;

    // 位置決め用の要素(p.el)自体には rotate を一切かけず、
    // ハートの見た目(回転・疑似要素オフセット)は中の子要素だけに閉じ込める。
    // こうすることで「transform(位置) と rotate(回転) を同じ要素に同時適用した際の
    // ブラウザ側の描画ズレ」の可能性そのものを排除する。
    if (p.el) {
      p.el.innerHTML = '<span class="shooting-rose-heart-shape"></span>';
    }

    p.kind = 'rose_heart';
    p.healMaxHpRate = Number(c.flowerHeartHealMaxHpRate || 0.05);
    p.expireAt = performance.now() + Number(c.flowerHeartLifeMs || 2200);
    p.noUltGain = true;
    p.noComboGain = true;
    p.sourceType = 'rose_flower';

    return p;
  }

  function updateRoseFlower(now) {
    if (!state || !state.roseFlower) return;
    const flower = state.roseFlower;
    const c = getBattleCharacter(CHARACTER_ID.ROSE);
    if (!c) return;

    if (!flower.el || !flower.el.isConnected || now >= flower.endAt) {
      removeRoseFlower();
      return;
    }

    // 花の見た目と発射座標を常に同じ flower.x/y に固定。
    positionUnit(flower.el, flower.x, flower.y);

    if (now >= flower.nextEmitAt) {
      const count = Math.max(1, Math.floor(Number(c.flowerHeartBurstCount || 10)));
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < count; i++) {
        const angle = base + (Math.PI * 2 * i / count);
        const offset = (Math.random() - 0.5) * 0.14;
        const p = createRoseHeartProjectile(flower, c, angle, offset);
        if (p) state.bullets.push(p);
      }
      flower.nextEmitAt = now + Number(c.flowerHeartIntervalMs || 240);
    }
  }

  function useRoseUlt(c) {
    if (!state) return;
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-sui');

    removeRoseFlower();

    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const flower = document.createElement('div');
    flower.className = 'shooting-rose-flower';
    flower.innerHTML = `<img src="${c.flowerImage || 'images/chara_09_battle_flower.webp'}" alt="rose flower" draggable="false"><span class="shooting-rose-flower-aura"></span>`;
    arena.appendChild(flower);

    const x = arena.clientWidth * 0.5;
    const y = arena.clientHeight * 0.48;
    positionUnit(flower, x, y);
    requestAnimationFrame(() => flower.classList.add('show'));

    const now = performance.now();
    state.roseFlower = {
      el: flower,
      x, y,
      startedAt: now,
      endAt: now + Number(c.flowerDurationMs || 5200),
      nextEmitAt: now + 180,
    };
    // scale transition(.42s)が収まった後の最終サイズで1回だけ実測する。
    setTimeout(() => measureUnitSize(state.roseFlower), 440);
    state.ultLockUntil = now + 260;
  }

  function ensureIgnisBurnEffectStyle() {
    if (document.getElementById('shooting-ignis-burn-style-v1')) return;
    const style = document.createElement('style');
    style.id = 'shooting-ignis-burn-style-v1';
    style.textContent = `
      .shooting-ignis-burn{
        position:absolute;
        left:0;top:0;
        width:96px;height:112px;
        z-index:24;
        pointer-events:none;
        opacity:.92;
        transform-origin:50% 72%;
        will-change:transform,opacity,filter;
        filter:drop-shadow(0 0 7px rgba(158,22,18,.20));
      }

      .shooting-ignis-burn .ignis-burn-aura{
        position:absolute;
        left:50%;top:63%;
        width:78px;height:46px;
        transform:translate(-50%,-50%);
        border-radius:50%;
        background:
          radial-gradient(ellipse at center,
            rgba(255,225,210,.10) 0 10%,
            rgba(255,84,62,.17) 22%,
            rgba(176,24,25,.17) 43%,
            rgba(70,4,12,.08) 62%,
            transparent 76%);
        box-shadow:
          0 0 13px rgba(255,88,62,.13),
          0 0 28px rgba(160,18,22,.10),
          inset 0 0 12px rgba(255,203,185,.06);
        animation:ignisBurnAuraBreath 1.5s ease-in-out infinite alternate;
      }

      .shooting-ignis-burn .ignis-burn-ring{
        position:absolute;
        left:50%;top:69%;
        width:70px;height:28px;
        transform:translate(-50%,-50%) rotate(-5deg);
        border:1px solid rgba(233,74,58,.28);
        border-radius:50%;
        box-shadow:
          0 0 8px rgba(238,75,57,.14),
          inset 0 0 6px rgba(255,116,91,.08);
        opacity:.72;
        animation:ignisBurnRingDrift 2.4s ease-in-out infinite alternate;
      }

      .shooting-ignis-burn .ignis-burn-heat{
        position:absolute;
        left:50%;top:50%;
        width:54px;height:76px;
        transform:translate(-50%,-50%);
        border-radius:48% 52% 45% 55%;
        background:
          radial-gradient(ellipse at 52% 70%, rgba(255,121,92,.16), transparent 44%),
          linear-gradient(to top,
            rgba(100,6,14,.16) 0%,
            rgba(204,36,31,.15) 28%,
            rgba(255,105,73,.10) 52%,
            rgba(255,188,158,.04) 70%,
            transparent 88%);
        filter:blur(3.5px);
        opacity:.82;
        animation:ignisBurnHeatWaver 1.05s ease-in-out infinite alternate;
      }

      .shooting-ignis-burn .ignis-burn-ember{
        position:absolute;
        left:50%;top:70%;
        width:3px;height:7px;
        margin-left:-1px;
        border-radius:60% 40% 60% 40%;
        background:linear-gradient(to top, rgba(198,31,25,.90), rgba(255,143,103,.62), rgba(255,235,211,.10));
        box-shadow:0 0 5px rgba(233,61,43,.28);
        opacity:0;
      }
      .shooting-ignis-burn .e1{--dx:-25px;--dy:-63px;animation:ignisBurnEmber 1.35s ease-out .08s infinite}
      .shooting-ignis-burn .e2{--dx:18px;--dy:-71px;animation:ignisBurnEmber 1.72s ease-out .42s infinite}
      .shooting-ignis-burn .e3{--dx:-8px;--dy:-84px;animation:ignisBurnEmber 1.48s ease-out .76s infinite}
      .shooting-ignis-burn .e4{--dx:29px;--dy:-56px;animation:ignisBurnEmber 1.86s ease-out 1.02s infinite}
      .shooting-ignis-burn .e5{--dx:-33px;--dy:-48px;animation:ignisBurnEmber 1.64s ease-out 1.18s infinite}

      .shooting-ignis-burn.tick .ignis-burn-aura{
        animation:ignisBurnTickPulse .28s ease-out 1;
      }
      .shooting-ignis-burn.tick .ignis-burn-ring{
        border-color:rgba(255,118,90,.44);
        box-shadow:0 0 13px rgba(246,77,54,.22),inset 0 0 9px rgba(255,140,109,.11);
      }

      .shooting-ignis-burn.fade{
        opacity:0!important;
        filter:blur(3px);
        transition:opacity .22s ease,filter .22s ease;
      }

      @keyframes ignisBurnAuraBreath{
        from{transform:translate(-50%,-50%) scale(.94);opacity:.62}
        to{transform:translate(-50%,-50%) scale(1.07);opacity:.94}
      }
      @keyframes ignisBurnRingDrift{
        from{transform:translate(-50%,-50%) rotate(-7deg) scaleX(.94);opacity:.48}
        to{transform:translate(-50%,-50%) rotate(5deg) scaleX(1.05);opacity:.78}
      }
      @keyframes ignisBurnHeatWaver{
        from{transform:translate(-53%,-50%) scale(.96,1.00) skewX(-2deg);opacity:.60}
        to{transform:translate(-47%,-53%) scale(1.04,1.08) skewX(3deg);opacity:.88}
      }
      @keyframes ignisBurnEmber{
        0%{transform:translate(0,0) scale(.72);opacity:0}
        12%{opacity:.68}
        64%{opacity:.36}
        100%{transform:translate(var(--dx),var(--dy)) scale(.20);opacity:0}
      }
      @keyframes ignisBurnTickPulse{
        0%{transform:translate(-50%,-50%) scale(.92);opacity:.64}
        38%{transform:translate(-50%,-50%) scale(1.18);opacity:1}
        100%{transform:translate(-50%,-50%) scale(1.02);opacity:.76}
      }
    `;
    document.head.appendChild(style);
  }

  function getIgnisBurnFx(key) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;
    return arena.querySelector(`.shooting-ignis-burn[data-burn-key="${key}"]`);
  }

  function createIgnisBurnVisual(key, x, y) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;

    ensureIgnisBurnEffectStyle();

    let burn = getIgnisBurnFx(key);
    if (!burn) {
      burn = document.createElement('div');
      burn.className = 'shooting-ignis-burn';
      burn.dataset.burnKey = key;
      burn.setAttribute('aria-hidden', 'true');
      burn.innerHTML = `
        <span class="ignis-burn-aura"></span>
        <span class="ignis-burn-ring"></span>
        <span class="ignis-burn-heat"></span>
        <i class="ignis-burn-ember e1"></i>
        <i class="ignis-burn-ember e2"></i>
        <i class="ignis-burn-ember e3"></i>
        <i class="ignis-burn-ember e4"></i>
        <i class="ignis-burn-ember e5"></i>
      `;
      arena.appendChild(burn);
    }

    // 足元寄りに置き、炎そのものではなく赤い熱と火の粉で燃焼状態を見せる。
    positionUnit(burn, x, y + 10);
    return burn;
  }

  function pulseIgnisBurnVisual(key) {
    const burn = getIgnisBurnFx(key);
    if (!burn) return;
    burn.classList.remove('tick');
    void burn.offsetWidth;
    burn.classList.add('tick');
    setTimeout(() => burn.classList.remove('tick'), 320);
  }

  function removeIgnisBurnVisual(key) {
    const burn = getIgnisBurnFx(key);
    if (!burn) return;
    burn.classList.add('fade');
    setTimeout(() => burn.remove(), 180);
  }

  function igniteIgnisTarget(target, c, now) {
    if (!state || !target) return;
    const duration = Number(c.burnDurationMs || 5000);

    if (target.isBoss) {
      state.ignisBossBurnUntil = Math.max(state.ignisBossBurnUntil || 0, now + duration);
      if (!state.ignisBossBurnNextTickAt || state.ignisBossBurnNextTickAt < now) {
        state.ignisBossBurnNextTickAt = now + Number(c.burnTickMs || 1000);
      }
      const bossEl = document.getElementById(BOSS_ID);
      if (bossEl) bossEl.classList.add('ignis-burning');
      createIgnisBurnVisual('boss', state.boss.x, state.boss.y);
      return;
    }

    target.ignisBurnUntil = Math.max(Number(target.ignisBurnUntil || 0), now + duration);
    if (!target.ignisBurnNextTickAt || target.ignisBurnNextTickAt < now) {
      target.ignisBurnNextTickAt = now + Number(c.burnTickMs || 1000);
    }
    if (target.el) {
      target.el.classList.add('ignis-burning');
      createIgnisBurnVisual(String(target.uid || 'enemy'), target.x, target.y);
    }
  }

  function updateIgnisBurns(now) {
    if (!state) return;
    const c = getBattleCharacter(CHARACTER_ID.IGNIS);
    if (!c) return;

    const tickMs = Number(c.burnTickMs || 1000);
    const damage = Number(c.atk || 0) * Number(c.burnDamageAtkRate || 0.30);

    if (isNormalBattle()) {
      const targets = [...(state.normalEnemies || [])];
      targets.forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;

        const burnKey = String(enemy.uid || 'enemy');

        if (now >= Number(enemy.ignisBurnUntil || 0)) {
          enemy.el.classList.remove('ignis-burning');
          removeIgnisBurnVisual(burnKey);
          return;
        }

        // 炎エフェクトは敵本体の座標へ追従させる。
        createIgnisBurnVisual(burnKey, enemy.x, enemy.y);

        if (now >= Number(enemy.ignisBurnNextTickAt || 0)) {
          enemy.ignisBurnNextTickAt = now + tickMs;
          pulseIgnisBurnVisual(burnKey);
          const targetElement = getCombatTargetElement(enemy);
          const finalDamage = applyElementDamage(damage, getUltAttackElement(c), targetElement);
          damageNormalEnemy(enemy, finalDamage, now, true, getElementDamageReaction(getUltAttackElement(c), targetElement));
        }
      });
      state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
      return;
    }

    const bossEl = document.getElementById(BOSS_ID);
    if (now >= Number(state.ignisBossBurnUntil || 0)) {
      if (bossEl) bossEl.classList.remove('ignis-burning');
      removeIgnisBurnVisual('boss');
      return;
    }

    if (state.boss && state.boss.hp > 0) {
      createIgnisBurnVisual('boss', state.boss.x, state.boss.y);
    }

    if (state.boss && state.boss.hp > 0 && now >= Number(state.ignisBossBurnNextTickAt || 0)) {
      state.ignisBossBurnNextTickAt = now + tickMs;
      pulseIgnisBurnVisual('boss');
      const targetElement = getCombatTargetElement(state.boss);
      const finalDamage = applyElementDamage(damage, getUltAttackElement(c), targetElement);
      const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(finalDamage || 0)));
      state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
      createHit(state.boss.x, state.boss.y, true);
      showBossDamageNumber(appliedDamage, true, getElementDamageReaction(getUltAttackElement(c), targetElement));
      flashBossHit(true);
      if (!addScoreAttackDamageScore(appliedDamage)) {
        addLegacyCombatScore(Math.round(damage * 100));
      }
      updateBossPhase();
      if (state.boss.hp <= 0) beginBossDefeat();
    }
  }

  function removeIgnisFireWheel() {
    if (!state || !state.ignisFireWheel) return;
    const wheel = state.ignisFireWheel;
    if (wheel.el) {
      wheel.el.classList.add('fade');
      setTimeout(() => wheel.el && wheel.el.remove(), 300);
    }
    state.ignisFireWheel = null;
  }

  function updateIgnisFireWheel(now) {
    if (!state || !state.ignisFireWheel) return;
    const wheel = state.ignisFireWheel;
    const c = getBattleCharacter(CHARACTER_ID.IGNIS);
    if (!c) return;

    if (now >= wheel.endAt) {
      removeIgnisFireWheel();
      return;
    }

    const arena = document.getElementById('shooting-arena');
    if (!arena || !wheel.el) return;

    const elapsed = (now - wheel.startedAt) / 1000;
    const angle = wheel.startAngle + elapsed * Number(c.fireWheelAngularSpeed || 1.15);
    const cx = arena.clientWidth * 0.5;
    const cy = arena.clientHeight * 0.43;

    // 大きく駆け回るのではなく、盤面をゆっくり漂うように旋回。
    const floatX =
      Math.sin(elapsed * Number(c.fireWheelFloatSpeedX || 0.72) + wheel.floatSeedX) *
      Number(c.fireWheelFloatX || 18);
    const floatY =
      Math.cos(elapsed * Number(c.fireWheelFloatSpeedY || 0.94) + wheel.floatSeedY) *
      Number(c.fireWheelFloatY || 14);

    wheel.x =
      cx +
      Math.cos(angle) * Number(c.fireWheelOrbitRadiusX || 118) +
      floatX;

    wheel.y =
      cy +
      Math.sin(angle) * Number(c.fireWheelOrbitRadiusY || 172) +
      floatY;

    positionUnit(wheel.el, wheel.x, wheel.y);

    // 見た目と当たり判定を一致させる。
    // 旧実装は「火炎車の中心点と敵の中心点の距離」だけで判定していたため、
    // 画像同士は明らかに重なっていても、中心距離が少し遠いだけで
    // やけどが付かないケースがあった。
    const wheelRect = wheel.el.getBoundingClientRect();

    if (isNormalBattle()) {
      (state.normalEnemies || []).forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;

        const enemyRect = enemy.el.getBoundingClientRect();

        // 炎の輪と敵画像が視覚的に重なったらやけど付与。
        if (rectsHit(wheelRect, enemyRect, 6, 8)) {
          igniteIgnisTarget(enemy, c, now);
        }
      });
    } else if (state.boss && state.boss.hp > 0) {
      const bossEl = document.getElementById(BOSS_ID);
      if (!bossEl) return;

      const bossRect = bossEl.getBoundingClientRect();

      if (rectsHit(wheelRect, bossRect, 8, 12)) {
        igniteIgnisTarget({ isBoss: true }, c, now);
      }
    }
  }

  function useIgnisUlt(c) {
    if (!state) return;

    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-eri');

    removeIgnisFireWheel();

    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const el = document.createElement('div');
    el.className = 'shooting-ignis-fire-wheel';
    el.innerHTML = '<i></i><b></b><span></span>';
    el.style.width = `${Number(c.fireWheelSize || 104)}px`;
    el.style.height = `${Number(c.fireWheelSize || 104)}px`;
    arena.appendChild(el);

    const now = performance.now();
    state.ignisFireWheel = {
      el,
      x: arena.clientWidth * 0.5,
      y: arena.clientHeight * 0.5,
      startedAt: now,
      endAt: now + Number(c.fireWheelDurationMs || 3500),
      startAngle: -Math.PI / 2,
      floatSeedX: Math.random() * Math.PI * 2,
      floatSeedY: Math.random() * Math.PI * 2,
    };

    state.ultLockUntil = now + 280;
    requestAnimationFrame(() => el.classList.add('active'));
    updateIgnisFireWheel(now);
  }

  function getClarineDecoyConfig() {
    return getBattleCharacter(CHARACTER_ID.CLARINE) || {};
  }

  function removeClarineDecoy(decoy, expired) {
    if (!decoy) return;
    if (decoy.el) {
      const el = decoy.el;
      el.classList.remove('hit');
      el.classList.add(expired ? 'expired' : 'defeated');
      setTimeout(() => el.remove(), expired ? 260 : 520);
      decoy.el = null;
    }
  }

  function spawnClarineExplosionVisual(x, y) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const burst = document.createElement('div');
    burst.className = 'shooting-clarine-decoy-burst';
    burst.innerHTML = '<i></i><b></b><span></span>';
    arena.appendChild(burst);
    positionUnit(burst, x, y);
    requestAnimationFrame(() => burst.classList.add('show'));
    setTimeout(() => burst.remove(), 760);
  }

  function applyClarineExplosionDamage(x, y, c) {
    const now = performance.now();
    const radius = Number(c.decoyExplosionRadius || 124);
    const damage = Number(c.atk || 0) * Number(c.decoyExplosionDamageMultiplier || 2.2);

    spawnClarineExplosionVisual(x, y);

    if (isNormalBattle()) {
      const targets = [...(state.normalEnemies || [])];
      targets.forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;
        const dist = Math.hypot((enemy.x || 0) - x, (enemy.y || 0) - y);
        if (dist <= radius) {
          const targetElement = getCombatTargetElement(enemy);
          const finalDamage = applyElementDamage(damage, getUltAttackElement(c), targetElement);
          damageNormalEnemy(enemy, finalDamage, now, true, getElementDamageReaction(getUltAttackElement(c), targetElement));
        }
      });
      state.normalEnemies = state.normalEnemies.filter(enemy => enemy && enemy.hp > 0);
      evaluateNormalMission(now);
      return;
    }

    if (!state.boss || state.boss.hp <= 0) return;
    const dist = Math.hypot((state.boss.x || 0) - x, (state.boss.y || 0) - y);
    if (dist > radius + 20) return;
    const targetElement = getCombatTargetElement(state.boss);
    const finalDamage = applyElementDamage(damage, getUltAttackElement(c), targetElement);
    const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(finalDamage || 0)));
    state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
    updateBossPhase();
    createHit(x, y, true);
    showBossDamageNumber(appliedDamage, true, getElementDamageReaction(getUltAttackElement(c), targetElement));
    flashBossHit(true);
    if (!addScoreAttackDamageScore(appliedDamage)) {
      addLegacyCombatScore(Math.round(damage * 100));
    }
    renderHud();
    if (state.boss.hp <= 0) beginBossDefeat();
  }

  function breakClarineDecoy(decoy, c) {
    if (!decoy || !decoy.el) return;
    const x = decoy.x;
    const y = decoy.y;
    removeClarineDecoy(decoy, false);
    applyClarineExplosionDamage(x, y, c);
  }

  function getClarineSpawnPoint(index) {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !state) return { x: 180, y: 180 };

    const w = arena.clientWidth;
    const h = arena.clientHeight;
    const cfg = getClarineDecoyConfig();

    const minX = 56;
    const maxX = Math.max(minX + 10, w - 56);
    const minY = 84;
    const maxY = Math.max(minY + 10, h * Number(cfg.decoyYMaxRatio || 0.47));

    let x = minX + Math.random() * (maxX - minX);
    let y = minY + Math.random() * (maxY - minY);

    const others = (state.clarineDecoys || []).filter(d => d && d.el);
    if (others.length) {
      const nearest = others[0];
      const dist = Math.hypot(x - nearest.x, y - nearest.y);
      if (dist < 88) {
        x = nearest.x < w * 0.5 ? clamp(nearest.x + 110, minX, maxX) : clamp(nearest.x - 110, minX, maxX);
        y = clamp(nearest.y + (Math.random() > .5 ? 30 : -30), minY, maxY);
      }
    }

    return { x, y };
  }

  function createClarineDecoy(c, index, now) {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !state) return null;

    const pt = getClarineSpawnPoint(index);
    const el = document.createElement('img');
    el.className = 'shooting-clarine-decoy';
    el.src = c.decoyImage || 'images/chara_27_battle_decoy.webp';
    el.alt = 'デコイ';
    el.draggable = false;
    arena.appendChild(el);

    const decoy = {
      id: `clarine_decoy_${++state.clarineDecoySeq}`,
      ownerId: c.id,
      x: pt.x,
      y: pt.y,
      el,
      hp: Number(c.decoyHp || 520),
      hpMax: Number(c.decoyHp || 520),
      expireAt: now + Number(c.decoyDurationMs || 6000),
      nextShotAt: now + 120 + index * 80,
      fireIntervalMs: Number(c.decoyFireIntervalMs || 210),
      shotsPerBurst: Number(c.decoyShotsPerBurst || 4),
      bulletSpeed: Number(c.decoyBulletSpeed || 300),
      bulletDamage: Number(c.decoyBulletDamage || 1.2),
      driftSeed: Math.random() * Math.PI * 2,
    };

    positionUnit(el, decoy.x, decoy.y);
    requestAnimationFrame(() => el.classList.add('show'));
    // height:autoで画像の実サイズに依存するため、ロード完了後に1回だけ実測する。
    if (el.complete) {
      measureUnitSize(decoy);
    } else {
      el.addEventListener('load', () => measureUnitSize(decoy), { once: true });
    }
    return decoy;
  }

  function fireClarineDecoyBurst(decoy, c) {
    if (!state || !decoy || !decoy.el) return;

    const attrClass = getCharacterBulletClass(c);
    const cls = 'shooting-bullet shooting-bullet-clarine-decoy' + attrClass;

    for (let i = 0; i < Math.max(1, decoy.shotsPerBurst); i++) {
      const angle = Math.random() * Math.PI * 2;
      const p = makeProjectile(
        cls,
        decoy.x,
        decoy.y,
        Math.cos(angle) * decoy.bulletSpeed,
        Math.sin(angle) * decoy.bulletSpeed,
        decoy.bulletDamage,
        decoy.ownerId
      );
      if (p) {
        // ULTそのものが次のULTゲージやCOMBOを生まないようにする。
        p.noUltGain = true;
        p.noComboGain = true;
        p.sourceType = 'clarine_decoy';
        state.bullets.push(p);
      }
    }
  }

  function updateClarineDecoys(dt, now) {
    if (!state) return;
    const c = getClarineDecoyConfig();

    state.clarineDecoys = (state.clarineDecoys || []).filter(decoy => {
      if (!decoy || !decoy.el) return false;

      if (now >= decoy.expireAt) {
        removeClarineDecoy(decoy, true);
        return false;
      }

      const driftT = now / 1000;
      const renderX = decoy.x + Math.sin(driftT * 1.25 + decoy.driftSeed) * 4;
      const renderY = decoy.y + Math.cos(driftT * 1.6 + decoy.driftSeed) * 3;
      positionUnit(decoy.el, renderX, renderY);

      if (now >= decoy.nextShotAt) {
        fireClarineDecoyBurst(decoy, c);
        decoy.nextShotAt = now + decoy.fireIntervalMs;
      }
      return true;
    });
  }

  function useClarineUlt(c) {
    if (!state) return;
    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-eri');

    const now = performance.now();
    state.ultLockUntil = now + 320;

    // 同時に存在できるデコイ数を制限。
    // ULTを再使用しても既存分を含めて最大2体まで。
    state.clarineDecoys = (state.clarineDecoys || []).filter(decoy => decoy && decoy.el);

    const maxActive = Math.max(1, Math.floor(Number(c.decoyMaxActive || 2)));
    const summonCount = Math.max(1, Math.floor(Number(c.decoyCount || 2)));
    const remainingSlots = Math.max(0, maxActive - state.clarineDecoys.length);
    const count = Math.min(summonCount, remainingSlots);

    for (let i = 0; i < count; i++) {
      const decoy = createClarineDecoy(c, i, now);
      if (decoy) state.clarineDecoys.push(decoy);
    }

    renderHud();
  }

  function showSuiClockMark(mark, stepIndex) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const markEl = document.createElement('div');
    markEl.className = 'shooting-sui-clock-mark';
    markEl.textContent = String(mark || '');
    markEl.style.setProperty('--sui-clock-step', String(stepIndex || 0));
    arena.appendChild(markEl);

    requestAnimationFrame(() => markEl.classList.add('show'));
    setTimeout(() => markEl.remove(), 920);
  }

  function triggerSuiClockBurst(c, ownerId) {
    if (!state || state.ended) return;

    const owner = getPartyMember(ownerId);
    if (owner && c.ultFullHeal !== false) {
      owner.hp = owner.hpMax;
    }

    if (c.ultClearEnemyBullets !== false) {
      clearEnemyBulletsOnly();
    }

    const damage = Number(c.atk || 0) * Number(c.ultDamageAtkMultiplier || 3);
    applyUltDamage(damage, true, c);

    const root = document.getElementById(ROOT_ID);
    if (root) {
      root.classList.remove('sui-clock-detonate');
      void root.offsetWidth;
      root.classList.add('sui-clock-detonate');
      setTimeout(() => root.classList.remove('sui-clock-detonate'), 820);
    }

    const arena = document.getElementById('shooting-arena');
    if (arena) {
      const burst = document.createElement('div');
      burst.className = 'shooting-sui-clock-burst';
      burst.innerHTML = '<i></i><b></b>';
      arena.appendChild(burst);
      requestAnimationFrame(() => burst.classList.add('show'));
      setTimeout(() => burst.remove(), 900);
    }

    renderHud();
  }

  function useSuiUlt(c) {
    if (!state) return;

    const now = performance.now();
    const marks = Array.isArray(c.clockMarks) && c.clockMarks.length
      ? c.clockMarks
      : ['X', 'XI', 'XII'];
    const stepMs = Math.max(200, Number(c.clockStepMs || 1000));
    const titleLeadMs = Math.max(0, Number(c.clockTitleLeadMs || 1000));
    const totalDelay = Math.max(
      titleLeadMs + marks.length * stepMs,
      Number(c.clockDelayMs || 4000)
    );
    const ownerId = c.id;

    showUltCut(c.ultName, c.effectKey);
    ultScreenFlash('ult-flash-sui');

    // 発動モーションだけ短くロック。カウント中は通常操作・射撃を継続できる。
    state.ultLockUntil = now + 260;

    // スキルタイトル演出を先に見せ、その後に X → XI → XII。
    marks.forEach((mark, index) => {
      pushUltTimer(() => {
        if (!state || state.ended) return;
        showSuiClockMark(mark, index);
      }, titleLeadMs + index * stepMs);
    });

    pushUltTimer(() => {
      triggerSuiClockBurst(c, ownerId);
    }, totalDelay);

    renderHud();
  }

  function useArnoUlt(c) {
    if (!state) return;
    const now = performance.now();
    const duration = Number(c.auraDurationMs || 5000);

    // First effect: erase every hostile projectile currently on the board.
    clearEnemyBulletsOnly();

    state.arnoAuraOwnerId = c.id;
    state.arnoAuraUntil = now + duration;
    state.arnoAuraNextTickAt = now;
    state.ultLockUntil = now + 260;

    const root = document.getElementById(ROOT_ID);
    if (root) {
      root.classList.remove('arno-aura-cast');
      void root.offsetWidth;
      root.classList.add('arno-aura-cast');
      setTimeout(() => root.classList.remove('arno-aura-cast'), 620);
    }

    syncArnoAuraVisuals(now);
  }

  // ============================================================
  // SIGMA-IX：ブラックシップ
  // 正面へ5秒間の極太レーザー。敵弾消去・スタン等の追加効果なし。
  // ============================================================
  function applyTestChanBeamTick(c, now) {
    if (!state || state.ended || state.finishing) return;
    const beamWidth = Math.max(30, Number(c.ultBeamWidth || 62));
    const half = beamWidth * 0.5;
    const px = Number(state.player.x || 0);
    const py = Number(state.player.y || 0);
    const damage = Number(c.atk || 0) * Number(c.ultBeamTickAtkMultiplier || 0.35);

    if (isNormalBattle()) {
      const targets = (state.normalEnemies || []).filter(enemy =>
        enemy && enemy.el && enemy.hp > 0 &&
        Number(enemy.y || 0) < py &&
        Math.abs(Number(enemy.x || 0) - px) <= half + 28
      );
      targets.forEach(enemy => {
        const targetElement = getCombatTargetElement(enemy);
        const finalDamage = applyElementDamage(damage, getUltAttackElement(c), targetElement);
        damageNormalEnemy(enemy, finalDamage, now, false, getElementDamageReaction(getUltAttackElement(c), targetElement));
      });
      state.normalEnemies = (state.normalEnemies || []).filter(enemy => enemy && enemy.hp > 0);
      addLegacyCombatScore(Math.round(damage * 30 * Math.max(1, targets.length)));
      evaluateNormalMission(now);
      renderHud();
      return;
    }

    // SPECIAL EVENTのHP付きオブジェクトも、レーザー正面にいれば攻撃。
    if (isFacelessStage()) {
      (state.facelessObjects || []).forEach(obj => {
        if (!obj || !obj.el || obj.hp <= 0) return;
        if (Number(obj.y || 0) >= py) return;
        if (Math.abs(Number(obj.x || 0) - px) > half + 30) return;
        const targetElement = getCombatTargetElement(obj, state.boss?.element);
        const finalDamage = applyElementDamage(damage, getUltAttackElement(c), targetElement);
        damageFacelessObject(obj, finalDamage, now, getElementDamageReaction(getUltAttackElement(c), targetElement));
      });
    }

    if (!state.boss || state.boss.hp <= 0) return;
    if (Number(state.boss.y || 0) >= py) return;
    if (Math.abs(Number(state.boss.x || 0) - px) > half + 48) return;

    const targetElement = getCombatTargetElement(state.boss);
    const finalDamage = applyElementDamage(damage, getUltAttackElement(c), targetElement);
    const applied = Math.min(state.boss.hp, Math.max(0, finalDamage));
    state.boss.hp = Math.max(0, state.boss.hp - applied);
    updateBossPhase();
    if (!addScoreAttackDamageScore(applied)) {
      addLegacyCombatScore(Math.round(applied * 100));
    }

    // 5秒持続ULTなので数字・HIT演出は毎tick出さず軽量化。
    if (!isRaidStage() || shouldRenderRaidBossHitVisual(now, 'hit')) {
      createHit(state.boss.x, state.boss.y, false);
      flashBossHit(false);
    }
    if (!isRaidStage() || shouldRenderRaidBossHitVisual(now, 'number')) {
      showBossDamageNumber(applied, false, getElementDamageReaction(getUltAttackElement(c), targetElement));
    }

    renderHud();
    if (state.boss.hp <= 0) beginBossDefeat();
  }


  function pointSegmentDistance(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const lenSq = abx * abx + aby * aby;
    if (lenSq <= 0.0001) return Math.hypot(px - ax, py - ay);
    const t = clamp(((px - ax) * abx + (py - ay) * aby) / lenSq, 0, 1);
    const qx = ax + abx * t;
    const qy = ay + aby * t;
    return Math.hypot(px - qx, py - qy);
  }

  function randomJigBounceAngle(side, previousAngle) {
    // 壁沿いに張り付く極端な浅角度を避けつつ、反射のたびに十分ランダム化する。
    const minNormal = 0.34; // 壁法線方向の最低成分。約20度相当。
    let vx = 0;
    let vy = 0;
    for (let i = 0; i < 10; i++) {
      let a = Math.random() * Math.PI * 2;
      vx = Math.cos(a);
      vy = Math.sin(a);
      const valid =
        (side === 'left'   && vx >  minNormal) ||
        (side === 'right'  && vx < -minNormal) ||
        (side === 'top'    && vy >  minNormal) ||
        (side === 'bottom' && vy < -minNormal);
      if (!valid) continue;
      // 直前とほぼ同じ向きだけは避け、スクランブル感を保つ。
      const delta = Math.abs(Math.atan2(Math.sin(a - previousAngle), Math.cos(a - previousAngle)));
      if (delta < 0.22) continue;
      return a;
    }
    // フォールバック：通常反射に少しだけランダム角を足す。
    if (side === 'left' || side === 'right') return Math.PI - previousAngle + (Math.random() - .5) * .8;
    return -previousAngle + (Math.random() - .5) * .8;
  }

  function damageJigScrambleTargets(beam, c, now) {
    if (!state || !beam) return;
    const len = Math.max(48, Number(c.jigUltBeamLength || 128));
    const angle = Number(beam.angle || 0);
    const hx = Number(beam.x || 0);
    const hy = Number(beam.y || 0);
    const tx = hx - Math.cos(angle) * len;
    const ty = hy - Math.sin(angle) * len;
    const hitInterval = Math.max(80, Number(c.jigUltHitIntervalMs || 200));
    const baseDamage = Number(c.atk || 0) * Math.max(0, Number(c.jigUltDamageAtkRate || 0.12));
    const beamRadius = Math.max(10, Number(c.jigUltBeamWidth || 5) * 1.8);

    if (isNormalBattle() || hasBossAdds()) {
      (state.normalEnemies || []).slice().forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;
        const key = enemy;
        const last = Number(beam.hitCooldown.get(key) || -Infinity);
        if (now - last < hitInterval) return;
        const hitRadius = beamRadius + 22;
        if (pointSegmentDistance(Number(enemy.x || 0), Number(enemy.y || 0), tx, ty, hx, hy) > hitRadius) return;
        beam.hitCooldown.set(key, now);
        const targetElement = getCombatTargetElement(enemy);
        const finalDamage = applyElementDamage(baseDamage, getUltAttackElement(c), targetElement);
        damageNormalEnemy(enemy, finalDamage, now, false, getElementDamageReaction(getUltAttackElement(c), targetElement));
      });
      state.normalEnemies = (state.normalEnemies || []).filter(enemy => enemy && enemy.hp > 0);
    }

    if (!isNormalBattle() && state.boss && state.boss.hp > 0) {
      const key = state.boss;
      const last = Number(beam.hitCooldown.get(key) || -Infinity);
      if (now - last >= hitInterval) {
        const bossHitRadius = beamRadius + 44;
        if (pointSegmentDistance(Number(state.boss.x || 0), Number(state.boss.y || 0), tx, ty, hx, hy) <= bossHitRadius) {
          beam.hitCooldown.set(key, now);
          const targetElement = getCombatTargetElement(state.boss);
          const finalDamage = applyElementDamage(baseDamage, getUltAttackElement(c), targetElement);
          const appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(finalDamage || 0)));
          state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
          updateBossPhase();
          if (shouldRenderRaidBossHitVisual(now, 'hit')) {
            createHit(Number(state.boss.x || hx), Number(state.boss.y || hy), false);
            flashBossHit(false, true);
          }
          if (shouldRenderRaidBossHitVisual(now, 'number')) showBossDamageNumber(appliedDamage, false, getElementDamageReaction(getUltAttackElement(c), targetElement));
          if (!addScoreAttackDamageScore(appliedDamage)) addLegacyCombatScore(Math.round(appliedDamage * 70));
          if (state.boss.hp <= 0) beginBossDefeat();
        }
      }
    }
  }

  function useJigScrambleUlt(c) {
    const arena = document.getElementById('shooting-arena');
    const root = document.getElementById(ROOT_ID);
    if (!arena || !state) return;

    showUltCut(c.ultName || 'SCRAMBLE RAY', c.effectKey);
    clearEnemyBulletsOnly();

    const duration = Math.max(1000, Number(c.jigUltDurationMs || 5000));
    const count = Math.max(1, Math.round(Number(c.jigUltBeamCount || 6)));
    const speed = Math.max(180, Number(c.jigUltBeamSpeed || 520));
    const len = Math.max(48, Number(c.jigUltBeamLength || 128));
    const width = Math.max(2, Number(c.jigUltBeamWidth || 5));
    const startX = Number(state.player.x || arena.clientWidth * .5);
    const startY = Number(state.player.y || arena.clientHeight * .78);
    const margin = 3;
    const token = (Number(state.jigScrambleToken || 0) + 1);
    state.jigScrambleToken = token;
    state.ultActiveUntil = performance.now() + duration;
    state.ultLockUntil = performance.now() + 260;

    arena.querySelectorAll('.shooting-jig-scramble-ray').forEach(el => el.remove());
    if (root) {
      root.classList.remove('jig-scramble-active');
      void root.offsetWidth;
      root.classList.add('jig-scramble-active');
    }

    const beams = [];
    for (let i = 0; i < count; i++) {
      // 均等放射を基準に少し乱し、6本が最初から同方向へ固まらないようにする。
      const base = -Math.PI * 0.92 + (Math.PI * 1.84) * (i / Math.max(1, count - 1));
      const angle = base + (Math.random() - .5) * 0.34;
      const el = document.createElement('i');
      el.className = 'shooting-jig-scramble-ray';
      el.style.setProperty('--jig-ray-length', len + 'px');
      el.style.setProperty('--jig-ray-width', width + 'px');
      arena.appendChild(el);
      beams.push({
        el,
        x: startX,
        y: startY,
        angle,
        speed: speed * (0.92 + Math.random() * 0.16),
        hitCooldown: new Map(),
      });
    }

    const startedAt = performance.now();
    let lastFrame = startedAt;
    let ended = false;

    function finish() {
      if (ended) return;
      ended = true;
      beams.forEach(beam => beam.el && beam.el.remove());
      if (root) root.classList.remove('jig-scramble-active');
      if (state && state.jigScrambleToken === token) state.ultActiveUntil = 0;
      renderHud();
    }

    function frame(now) {
      if (!state || state.jigScrambleToken !== token || state.ended || state.finishing || now - startedAt >= duration) {
        finish();
        return;
      }
      const dt = Math.min(0.035, Math.max(0.001, (now - lastFrame) / 1000));
      lastFrame = now;
      const w = Math.max(1, arena.clientWidth);
      const h = Math.max(1, arena.clientHeight);

      beams.forEach(beam => {
        let vx = Math.cos(beam.angle) * beam.speed;
        let vy = Math.sin(beam.angle) * beam.speed;
        beam.x += vx * dt;
        beam.y += vy * dt;

        let side = '';
        if (beam.x <= margin) { beam.x = margin; side = 'left'; }
        else if (beam.x >= w - margin) { beam.x = w - margin; side = 'right'; }
        if (beam.y <= margin) { beam.y = margin; side = side || 'top'; }
        else if (beam.y >= h - margin) { beam.y = h - margin; side = side || 'bottom'; }

        if (side) beam.angle = randomJigBounceAngle(side, beam.angle);

        beam.el.style.left = (beam.x - len) + 'px';
        beam.el.style.top = (beam.y - width * .5) + 'px';
        beam.el.style.transform = 'rotate(' + beam.angle + 'rad)';
        damageJigScrambleTargets(beam, c, now);
      });

      renderHud();
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    renderHud();
  }

  function useTestChanUlt(c) {
    if (!state || state.ended || state.finishing) return;

    showUltCut(c.ultName, c.effectKey);
    const root = document.getElementById(ROOT_ID);
    const arena = document.getElementById('shooting-arena');
    if (!root || !arena) return;

    root.classList.remove('testchan-blackship-active');
    void root.offsetWidth;
    root.classList.add('testchan-blackship-active');

    const old = arena.querySelector('.shooting-testchan-blackship-beam');
    if (old) old.remove();

    const beam = document.createElement('div');
    beam.className = 'shooting-testchan-blackship-beam';
    beam.innerHTML = '<i></i>';
    arena.appendChild(beam);

    const duration = Math.max(1000, Number(c.ultBeamDurationMs || 5000));
    const tickMs = Math.max(100, Number(c.ultBeamTickMs || 250));
    const started = performance.now();
    const until = started + duration;
    const token = (state.testchanUltToken || 0) + 1;
    state.testchanUltToken = token;
    // build566: 5秒レーザー中に敵弾生成だけが止まっていた副作用を修正。
    // 敵は移動・攻撃とも通常継続。使用者の通常射撃だけレーザー終了まで止める。
    state.ultLockUntil = started + 260;
    state.playerShotLockUntil = until;

    let nextDamageAt = started;

    const frame = (now) => {
      if (!state || state.testchanUltToken !== token || state.ended || state.finishing || now >= until) {
        beam.classList.add('ending');
        root.classList.remove('testchan-blackship-active');
        setTimeout(() => beam.isConnected && beam.remove(), 180);
        renderHud();
        return;
      }

      const x = Number(state.player.x || 0);
      const y = Math.max(0, Number(state.player.y || 0));
      const width = Math.max(30, Number(c.ultBeamWidth || 62));
      beam.style.width = `${width}px`;
      beam.style.height = `${Math.max(24, y)}px`;
      beam.style.transform = `translate3d(${x - width / 2}px,0,0)`;

      if (now >= nextDamageAt) {
        applyTestChanBeamTick(c, now);
        nextDamageAt += tickMs;
        if (nextDamageAt < now - tickMs) nextDamageAt = now + tickMs;
      }

      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
    renderHud();
  }


  // ============================================================

  // ============================================================
  // build907: ニーナ ULT「出力最大！」
  // 7秒間 PLASMA威力×1.5 / 射程×2.0。
  // 連鎖数・発射速度は通常時のまま。旧LIGHTNING STORMの落雷は発動しない。
  // ============================================================
  function useNinaOutputMax(c) {
    if (!state || state.ended || state.finishing) return;

    showUltCut(c.ultName || '出力最大！', c.effectKey);

    const now = performance.now();
    const duration = Math.max(1000, Number(c.ninaOutputMaxDurationMs || 7000));
    state.ninaOutputMaxUntil = now + duration;

    // ULT直前のロック状態を一度切り、拡張された射程で再探索させる。
    state.ninaLightningLockedTarget = null;
    state.ninaLightningPendingTarget = null;
    state.ninaLightningLastFireAt = 0;
    state.ninaLightningAttackToken = Number(state.ninaLightningAttackToken || 0) + 1;

    // カットイン後は移動・射撃をすぐ再開。7秒間の強化時間を射撃停止で消費しない。
    state.ultLockUntil = Math.max(Number(state.ultLockUntil || 0), now + 180);
    renderHud();
  }


  // ============================================================
  // ニーナ旧ULT：LIGHTNING STORM（build907以降は未使用）
  // 8秒 / 16発 / 各ATK×4.0。
  // 毎回、その時点で生存している敵からランダム選択。
  // 命中した敵だけ3秒麻痺（移動・射撃停止）。全体停止はしない。
  // ============================================================
  function getNinaParalyzeElement(target) {
    if (!target) return null;
    if ((target.kind === 'normal' || target.kind === 'faceless') && target.ref && target.ref.el) {
      return target.ref.el;
    }
    if (target.kind === 'boss') return document.getElementById(BOSS_ID);
    return null;
  }

  function showNinaParalyzeVfx(target, element, until) {
    const host = getNinaParalyzeElement(target);
    if (!host) return;

    const visual = ULT_ELEMENT_VISUAL[normalizeCombatElement(element) || 'neutral'] || ULT_ELEMENT_VISUAL.neutral;
    let fx = Array.from(host.children || []).find(child => child && child.classList && child.classList.contains('shooting-nina-paralyze-vfx'));
    if (!fx) {
      fx = document.createElement('span');
      fx.className = 'shooting-nina-paralyze-vfx';
      fx.setAttribute('aria-hidden', 'true');
      fx.innerHTML = `
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M4 24 L18 11 L29 30 L43 17 L57 35 L74 14 L96 28"/>
          <path d="M8 66 L23 50 L36 70 L50 48 L64 72 L81 54 L95 67"/>
          <path d="M26 4 L39 22 L31 40 L55 55 L45 76 L67 96"/>
        </svg>`;
      host.appendChild(fx);
    }

    fx.style.setProperty('--nina-paralyze-rgb', visual.rgb);
    fx.style.setProperty('--nina-paralyze-color', visual.color);
    const nextUntil = Math.max(Number(fx.dataset.ninaParalyzeUntil || 0), Number(until || 0));
    fx.dataset.ninaParalyzeUntil = String(nextUntil);

    const wait = Math.max(80, nextUntil - performance.now() + 60);
    // build811: 同じ敵へ再命中するたびにremove用Timerを積まない。常に1本だけ更新する。
    if (fx._ninaParalyzeRemoveTimer) clearTimeout(fx._ninaParalyzeRemoveTimer);
    fx._ninaParalyzeRemoveTimer = setTimeout(() => {
      if (!fx || !fx.isConnected) return;
      const activeUntil = Number(fx.dataset.ninaParalyzeUntil || 0);
      if (performance.now() + 8 < activeUntil) return;
      fx._ninaParalyzeRemoveTimer = null;
      try { fx.remove(); } catch (_) {}
    }, wait);
  }

  function applyNinaParalyze(target, durationMs, element) {
    if (!state || !target || !target.ref) return;
    const now = performance.now();
    const duration = Math.max(300, Number(durationMs || 3000));
    const until = now + duration;

    if (target.kind === 'normal') {
      target.ref.noahStunUntil = Math.max(Number(target.ref.noahStunUntil || 0), until);
      showNinaParalyzeVfx(target, element, target.ref.noahStunUntil);
      freezeNormalEnemyAction(target.ref, target.ref.noahStunUntil);
      return;
    }

    if (target.kind === 'faceless') {
      target.ref.noahStunUntil = Math.max(Number(target.ref.noahStunUntil || 0), until);
      showNinaParalyzeVfx(target, element, target.ref.noahStunUntil);
      deferFacelessObjectAttackResume(target.ref, target.ref.noahStunUntil);
      return;
    }

    if (target.kind === 'boss') {
      applyBossStun(duration, 'nina_lightning_storm');
      showNinaParalyzeVfx(target, element, Math.max(until, Number(state.bossStunUntil || 0)));
    }
  }

  function applyNinaUltHit(c, target, now) {
    if (!state || state.ended || state.finishing || !target) return 0;

    const baseDamage = Math.max(
      0,
      Number(c.atk || 0) * Math.max(0, Number(c.ninaUltHitAtkMultiplier || 4.0))
    );
    const attackElement = getUltAttackElement(c);
    let appliedDamage = 0;

    if (target.kind === 'normal' && target.ref && target.ref.hp > 0) {
      const targetElement = getCombatTargetElement(target.ref);
      const finalDamage = applyElementDamage(baseDamage, attackElement, targetElement);
      appliedDamage = damageNormalEnemy(
        target.ref,
        finalDamage,
        now,
        false,
        getElementDamageReaction(attackElement, targetElement)
      );
      state.normalEnemies = (state.normalEnemies || []).filter(enemy => enemy && enemy.hp > 0);
      if (isNormalBattle()) evaluateNormalMission(now);
    } else if (target.kind === 'faceless' && target.ref && target.ref.hp > 0) {
      const targetElement = getCombatTargetElement(target.ref, state.boss?.element);
      const finalDamage = applyElementDamage(baseDamage, attackElement, targetElement);
      appliedDamage = damageFacelessObject(
        target.ref,
        finalDamage,
        now,
        getElementDamageReaction(attackElement, targetElement)
      );
    } else if (target.kind === 'boss' && state.boss && state.boss.hp > 0) {
      const targetElement = getCombatTargetElement(state.boss);
      const finalDamage = applyElementDamage(baseDamage, attackElement, targetElement);
      appliedDamage = Math.min(state.boss.hp, Math.max(0, finalDamage));

      if (appliedDamage > 0) {
        state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
        createHit(state.boss.x, state.boss.y, true);
        showBossDamageNumber(
          appliedDamage,
          false,
          getElementDamageReaction(attackElement, targetElement)
        );
        flashBossHit(false);
        if (!addScoreAttackDamageScore(appliedDamage)) {
          addLegacyCombatScore(Math.round(appliedDamage * 100));
        }
        updateBossPhase();
        if (state.boss.hp <= 0) beginBossDefeat();
      }
    }

    if (appliedDamage > 0) {
      state.shotsHit = Number(state.shotsHit || 0) + 1;
      registerComboHit(c.id, now, appliedDamage);
      applyNinaParalyze(target, Number(c.ninaUltParalyzeMs || 3000), attackElement);
    }

    renderHud();
    return appliedDamage;
  }

  function getNinaUltZoneRect(c, zoneIndex, arena) {
    if (!arena) return null;

    const width = Math.max(1, Number(arena.clientWidth || 0));
    const height = Math.max(1, Number(arena.clientHeight || 0));
    const fieldRatio = Math.max(.2, Math.min(.8, Number(c.ninaUltEnemyFieldRatio || .5)));
    const cols = Math.max(1, Math.floor(Number(c.ninaUltZoneColumns || 4)));
    const rows = Math.max(1, Math.floor(Number(c.ninaUltZoneRows || 2)));
    const zoneCount = cols * rows;
    const safeIndex = ((Math.floor(Number(zoneIndex || 0)) % zoneCount) + zoneCount) % zoneCount;

    // 敵側フィールド = 画面上半分。
    // その領域だけを4列×2段（計8エリア）へ等分する。
    const enemyFieldHeight = height * fieldRatio;
    const cellWidth = width / cols;
    const cellHeight = enemyFieldHeight / rows;
    const col = safeIndex % cols;
    const row = Math.floor(safeIndex / cols);

    return {
      index: safeIndex,
      left: col * cellWidth,
      right: (col + 1) * cellWidth,
      top: row * cellHeight,
      bottom: (row + 1) * cellHeight,
      width: cellWidth,
      height: cellHeight,
      centerX: (col + .5) * cellWidth,
      centerY: (row + .5) * cellHeight
    };
  }

  function showNinaUltZoneWarning(rect, telegraphMs) {
    const arena = document.getElementById('shooting-arena');
    if (!arena || !rect) return null;

    const warning = document.createElement('div');
    warning.className = 'shooting-nina-ult-zone-warning';
    warning.setAttribute('aria-hidden', 'true');
    warning.style.left = `${rect.left}px`;
    warning.style.top = `${rect.top}px`;
    warning.style.width = `${rect.width}px`;
    warning.style.height = `${rect.height}px`;
    warning.style.animationDuration = `${Math.max(80, Number(telegraphMs || 180))}ms`;
    arena.appendChild(warning);
    return warning;
  }

  function getNinaTargetsInZone(rect) {
    if (!state || !rect) return [];
    const targets = getNoahUltTargets();

    return targets.filter(target => {
      if (!target || !target.ref) return false;
      const x = Number(target.x || 0);
      const y = Number(target.y || 0);

      // 敵の中心座標が選択エリア内にある場合のみ命中。
      // 右端・下端は隣接エリアとの二重判定を避けるため非包含。
      return (
        x >= rect.left &&
        x < rect.right &&
        y >= rect.top &&
        y < rect.bottom
      );
    });
  }

  // build811: ニーナULTの見た目はそのまま、落雷SVGと塵DOMを使い回してGC負荷を抑える。
  // 16発ごとに要素を生成・破棄せず、1セットだけ再利用してアニメーションを再始動する。
  function createNinaUltLightningBolt(c, x, y) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return null;

    const width = Math.max(1, Number(arena.clientWidth || 0));
    const height = Math.max(1, Number(arena.clientHeight || 0));
    const tx = clamp(Number(x || width * .5), 8, Math.max(8, width - 8));
    const ty = clamp(Number(y || height * .35), 24, Math.max(24, height - 8));
    const element = getUltAttackElement(c);
    const visual = ULT_ELEMENT_VISUAL[element] || ULT_ELEMENT_VISUAL.neutral;
    const svgNs = 'http://www.w3.org/2000/svg';

    let svg = arena.querySelector('.shooting-nina-ult-lightning');
    if (!svg) {
      svg = document.createElementNS(svgNs, 'svg');
      svg.setAttribute('class', 'shooting-nina-ult-lightning');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');
      const classes = [
        'shooting-nina-ult-bolt-glow',
        'shooting-nina-ult-bolt-color',
        'shooting-nina-ult-bolt-core',
        'shooting-nina-ult-bolt-branch',
        'shooting-nina-ult-bolt-branch'
      ];
      classes.forEach(cls => {
        const path = document.createElementNS(svgNs, 'path');
        path.setAttribute('class', cls);
        path.setAttribute('d', 'M0 0 L0 0');
        path.setAttribute('pathLength', '100');
        svg.appendChild(path);
      });
      arena.appendChild(svg);
    }

    svg.style.display = 'block';
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.setProperty('--nina-ult-rgb', visual.rgb);
    svg.style.setProperty('--nina-ult-color', visual.color);

    const points = [];
    const segments = 10;
    const topDrift = (Math.random() - .5) * 18;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const py = ty * t;
      let px;
      if (i === 0) px = tx + topDrift;
      else if (i === segments) px = tx;
      else {
        const envelope = .52 + Math.sin(Math.PI * t) * .58;
        const jag = (Math.random() - .5) * 34 * envelope;
        const alternating = (i % 2 ? -1 : 1) * (5 + Math.random() * 7);
        px = tx + jag + alternating;
      }
      points.push([clamp(px, 4, width - 4), py]);
    }
    const d = points.map((pt, i) => `${i ? 'L' : 'M'}${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`).join(' ');
    const paths = Array.from(svg.querySelectorAll('path'));
    if (paths[0]) paths[0].setAttribute('d', d);
    if (paths[1]) paths[1].setAttribute('d', d);
    if (paths[2]) paths[2].setAttribute('d', d);

    // 稲光の短い枝。主線より細く、着弾地点までは伸ばさない。
    [3, 6].forEach((idx, branchIndex) => {
      const base = points[idx];
      const path = paths[3 + branchIndex];
      if (!base || !path) return;
      const dir = branchIndex % 2 ? 1 : -1;
      const bx1 = clamp(base[0] + dir * (10 + Math.random() * 10), 4, width - 4);
      const by1 = Math.min(ty, base[1] + 10 + Math.random() * 12);
      const bx2 = clamp(bx1 + dir * (7 + Math.random() * 8), 4, width - 4);
      const by2 = Math.min(ty, by1 + 10 + Math.random() * 14);
      path.setAttribute('d', `M${base[0].toFixed(1)} ${base[1].toFixed(1)} L${bx1.toFixed(1)} ${by1.toFixed(1)} L${bx2.toFixed(1)} ${by2.toFixed(1)}`);
    });

    // CSSアニメーションだけを再始動。SVGそのものは破棄しない。
    paths.forEach(path => { path.style.animation = 'none'; });
    void svg.getBoundingClientRect();
    paths.forEach(path => { path.style.animation = ''; });

    if (svg._ninaUltHideTimer) clearTimeout(svg._ninaUltHideTimer);
    svg._ninaUltHideTimer = setTimeout(() => {
      if (svg && svg.isConnected) svg.style.display = 'none';
    }, 320);
    return svg;
  }

  function createNinaUltDust(x, y) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    let dust = arena.querySelector('.shooting-nina-ult-dust');
    if (!dust) {
      dust = document.createElement('span');
      dust.className = 'shooting-nina-ult-dust';
      dust.setAttribute('aria-hidden', 'true');
      const offsets = [
        [-14,-10,4,0], [12,-12,5,12], [-7,-17,3,22], [18,-7,4,34], [3,-20,3,46]
      ];
      offsets.forEach(([dx,dy,size,delay]) => {
        const p = document.createElement('i');
        p.style.setProperty('--dust-x', `${dx}px`);
        p.style.setProperty('--dust-y', `${dy}px`);
        p.style.setProperty('--dust-size', `${size}px`);
        p.style.setProperty('--dust-delay', `${delay}ms`);
        dust.appendChild(p);
      });
      arena.appendChild(dust);
    }

    dust.style.display = 'block';
    dust.style.transform = `translate3d(${Number(x || 0)}px,${Number(y || 0)}px,0)`;
    const particles = Array.from(dust.children || []);
    particles.forEach(p => { p.style.animation = 'none'; });
    void dust.offsetWidth;
    particles.forEach(p => { p.style.animation = ''; });

    if (dust._ninaUltHideTimer) clearTimeout(dust._ninaUltHideTimer);
    dust._ninaUltHideTimer = setTimeout(() => {
      if (dust && dust.isConnected) dust.style.display = 'none';
    }, 460);
  }

  function strikeNinaUltZone(c, rect, warning) {
    if (!state || state.ended || state.finishing || !rect) {
      try { warning && warning.remove(); } catch (_) {}
      return false;
    }

    const arena = document.getElementById('shooting-arena');
    const targets = getNinaTargetsInZone(rect);
    const now = performance.now();

    if (arena) {
      // 性能・判定は従来のエリア方式をそのまま維持。
      // 見た目だけ、命中時はエリア内の敵へ寄せ、空振り時はエリア中央へ落とす。
      let tx = rect.centerX;
      let ty = rect.centerY;
      if (targets.length > 0) {
        const visualTarget = targets[Math.floor(Math.random() * targets.length)];
        tx = Number(visualTarget && visualTarget.x || rect.centerX);
        ty = Number(visualTarget && visualTarget.y || rect.centerY);
      } else {
        tx += (Math.random() - .5) * Math.min(32, rect.width * .2);
      }
      tx = clamp(tx, 8, Math.max(8, arena.clientWidth - 8));
      ty = clamp(ty, 18, Math.max(18, arena.clientHeight * .5 - 8));

      createNinaUltLightningBolt(c, tx, ty);
      createNinaUltDust(tx, ty);
    }

    // その瞬間、エリア内にいる敵全員へ同時命中。
    // ダメージ・麻痺時間・16回という性能値は変更しない。
    targets.forEach(target => {
      applyNinaUltHit(c, target, now);
    });

    try { warning && warning.remove(); } catch (_) {}
    // 画面シェイクは「敵に当たった時だけ」。空振り落雷では揺らさない。
    if (targets.length > 0) shakeNoahLightning();
    return targets.length > 0;
  }

  function queueNinaLightningZone(c, token) {
    if (!state || state.ended || state.finishing) return false;

    const arena = document.getElementById('shooting-arena');
    if (!arena) return false;

    const cols = Math.max(1, Math.floor(Number(c.ninaUltZoneColumns || 4)));
    const rows = Math.max(1, Math.floor(Number(c.ninaUltZoneRows || 2)));
    const zoneCount = Math.max(1, cols * rows);
    const zoneIndex = Math.floor(Math.random() * zoneCount);
    const rect = getNinaUltZoneRect(c, zoneIndex, arena);
    if (!rect) return false;

    const telegraphMs = Math.max(80, Number(c.ninaUltTelegraphMs || 180));
    const warning = showNinaUltZoneWarning(rect, telegraphMs);

    pushUltTimer(() => {
      if (
        !state ||
        state.ended ||
        state.finishing ||
        Number(state.ninaUltToken || 0) !== Number(token)
      ) {
        try { warning && warning.remove(); } catch (_) {}
        return;
      }
      strikeNinaUltZone(c, rect, warning);
    }, telegraphMs);

    return true;
  }

  function useNinaUlt(c) {
    if (!state || state.ended || state.finishing) return;

    showUltCut(c.ultName || 'LIGHTNING STORM', c.effectKey);

    const duration = Math.max(1000, Number(c.ninaUltDurationMs || 8000));
    const hitCount = Math.max(1, Math.floor(Number(c.ninaUltHitCount || 16)));
    const interval = duration / hitCount;
    const token = Number(state.ninaUltToken || 0) + 1;
    state.ninaUltToken = token;

    // カットイン後は通常移動・通常射撃を継続可能。
    // 8秒間の落雷は独立した継続ULTとして処理する。
    state.ultLockUntil = Math.max(Number(state.ultLockUntil || 0), performance.now() + 260);

    for (let i = 0; i < hitCount; i++) {
      // 0.5秒間隔で16回。
      // 各回、画面上半分の8エリアから1エリアをランダム選択して予兆→落雷。
      const delay = interval * i + 70;
      pushUltTimer(() => {
        if (
          !state ||
          state.ended ||
          state.finishing ||
          Number(state.ninaUltToken || 0) !== token
        ) return;
        queueNinaLightningZone(c, token);
      }, delay);
    }

    renderHud();
  }


    // ノア ULT：理想郷の静止
  // 発動直後に盤面の敵弾を完全削除。
  // 8拍×2セットの16落雷 -> 終了後に敵を感電停止。
  // ============================================================
  function getNoahUltTargets() {
    if (!state) return [];
    const list = [];

    if (isNormalBattle()) {
      (state.normalEnemies || []).forEach(enemy => {
        if (!enemy || !enemy.el || enemy.hp <= 0) return;
        list.push({ kind:'normal', ref:enemy, x:Number(enemy.x || 0), y:Number(enemy.y || 0) });
      });
      return list;
    }

    if (isFacelessStage()) {
      (state.facelessObjects || []).forEach(obj => {
        if (!obj || !obj.el || obj.hp <= 0) return;
        list.push({ kind:'faceless', ref:obj, x:Number(obj.x || 0), y:Number(obj.y || 0) });
      });
    }

    if (state.boss && state.boss.hp > 0) {
      list.push({ kind:'boss', ref:state.boss, x:Number(state.boss.x || 0), y:Number(state.boss.y || 0) });
    }
    return list;
  }

  function clearNoahUltEnemyBarrage() {
    if (!state) return;

    // state配列を例外なく空にする。乱入用persistent弾もノアULTでは消す。
    (state.enemyBullets || []).forEach(p => {
      try { p && p.el && p.el.remove(); } catch (_) {}
    });
    state.enemyBullets = [];

    // Canvas描画弾も即時クリア。
    clearEnemyBulletCanvas();

    // state管理外の警告弾・レーザー等もその場で除去する。
    const arena = document.getElementById('shooting-arena');
    if (arena) {
      arena.querySelectorAll(
        '.shooting-enemy-bullet,' +
        '.shooting-raid-green-laser,' +
        '.shooting-boss-danger-warning,' +
        '.shooting-ambush-warning-bullet,' +
        '.shooting-ch04-curtain-bullet'
      ).forEach(el => el.remove());
    }

    removeBossDangerWarning();
    state.bossDangerExecuteAt = 0;
    state.lastBossShotAt = performance.now();
  }

  function clearNoahUltPlayerShots() {
    if (!state) return;

    // 発動時点で画面上に存在する自機弾を全部消す。
    (state.bullets || []).forEach(p => {
      try { p && p.el && p.el.remove(); } catch (_) {}
    });
    state.bullets = [];

    // ノアの中心レーザーも即座に消す。
    hideIgnisLaser();

    // 次にショット再開した瞬間、待ち時間なしで撃てるようにする。
    state.lastShotAt = -Infinity;
  }

  function applyNoahUltHit(c, target, now) {
    if (!state || state.ended || state.finishing || !target) return;

    let comboDamage = 0;
    const damage = Math.max(0, Number(c.atk || 0) * Number(c.noahUltHitAtkMultiplier || 0.35));

    if (target.kind === 'normal' && target.ref && target.ref.hp > 0) {
      const targetElement = getCombatTargetElement(target.ref);
      const finalDamage = applyElementDamage(damage, getUltAttackElement(c), targetElement);
      comboDamage = damageNormalEnemy(target.ref, finalDamage, now, false, getElementDamageReaction(getUltAttackElement(c), targetElement));
      state.normalEnemies = (state.normalEnemies || []).filter(enemy => enemy && enemy.hp > 0);
      evaluateNormalMission(now);
    } else if (target.kind === 'faceless' && target.ref && target.ref.hp > 0) {
      const targetElement = getCombatTargetElement(target.ref, state.boss?.element);
      const finalDamage = applyElementDamage(damage, getUltAttackElement(c), targetElement);
      comboDamage = damageFacelessObject(target.ref, finalDamage, now, getElementDamageReaction(getUltAttackElement(c), targetElement));
    } else if (target.kind === 'boss' && state.boss && state.boss.hp > 0) {
      const targetElement = getCombatTargetElement(state.boss);
      const finalDamage = applyElementDamage(damage, getUltAttackElement(c), targetElement);
      const applied = Math.min(state.boss.hp, finalDamage);
      if (applied <= 0) return;
      comboDamage = applied;
      state.boss.hp = Math.max(0, state.boss.hp - applied);
      createHit(state.boss.x, state.boss.y, true);
      showBossDamageNumber(applied, false, getElementDamageReaction(getUltAttackElement(c), targetElement));
      flashBossHit(false);
      if (!addScoreAttackDamageScore(applied)) addLegacyCombatScore(Math.round(applied * 100));
      updateBossPhase();
      if (state.boss.hp <= 0) beginBossDefeat();
    }

    if (comboDamage > 0) state.shotsHit = Number(state.shotsHit || 0) + 1;
    registerComboHit(c.id, now, comboDamage);
    renderHud();
  }

  function shakeNoahLightning() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    if (typeof root.animate === 'function') {
      root.animate([
        { transform:'translate3d(0,0,0)' },
        { transform:'translate3d(-5px,2px,0)' },
        { transform:'translate3d(6px,-3px,0)' },
        { transform:'translate3d(-4px,3px,0)' },
        { transform:'translate3d(3px,-1px,0)' },
        { transform:'translate3d(0,0,0)' }
      ], { duration:150, easing:'ease-out' });
      return;
    }

    root.classList.remove('ayane-rampage-shake');
    void root.offsetWidth;
    root.classList.add('ayane-rampage-shake');
    setTimeout(() => root.classList.remove('ayane-rampage-shake'), 150);
  }

  function spawnNoahLightning(c) {
    if (!state || state.ended || state.finishing) return false;

    // 毎落雷ごとに最新の盤面からランダム選択。
    // 途中でスポーンした敵も次の落雷から対象になる。
    const targets = getNoahUltTargets();
    if (!targets.length) return false;
    const target = targets.length === 1
      ? targets[0]
      : targets[Math.floor(Math.random() * targets.length)];

    const arena = document.getElementById('shooting-arena');
    if (!arena) {
      applyNoahUltHit(c, target, performance.now());
      shakeNoahLightning();
      return true;
    }

    const tx = clamp(Number(target.x || arena.clientWidth * .5), 10, Math.max(10, arena.clientWidth - 10));
    const ty = clamp(Number(target.y || arena.clientHeight * .35), 20, Math.max(20, arena.clientHeight - 20));
    const jitterX = (Math.random() - .5) * 34;

    const bolt = document.createElement('div');
    bolt.className = 'shooting-noah-lightning strike';
    bolt.style.left = `${tx + jitterX}px`;
    bolt.style.top = '0px';
    bolt.style.height = `${Math.max(54, ty)}px`;
    arena.appendChild(bolt);

    // 落雷を受けた敵を記録。ULT終了後、この敵だけ1.5秒スタン。
    state.noahUltHitTargets = Array.isArray(state.noahUltHitTargets) ? state.noahUltHitTargets : [];
    if (!state.noahUltHitTargets.some(t => t && t.kind === target.kind && t.ref === target.ref)) {
      state.noahUltHitTargets.push(target);
    }

    // 落雷の瞬間にダメージ + シェイク。
    applyNoahUltHit(c, target, performance.now());
    shakeNoahLightning();

    setTimeout(() => bolt.remove(), 260);
    return true;
  }

  function applyNoahTargetStuns(c) {
    if (!state || state.ended || state.finishing) return;

    const duration = Math.max(300, Number(c.noahUltParalyzeMs || 1500));
    const now = performance.now();
    const until = now + duration;
    const refs = Array.isArray(state.noahUltHitTargets) ? state.noahUltHitTargets : [];

    refs.forEach(target => {
      if (!target || !target.ref) return;
      // 敵オブジェクト単位のスタンだけを付与。
      // player / party / movement state には一切触れない。
      target.ref.noahStunUntil = Math.max(Number(target.ref.noahStunUntil || 0), until);
      if (target.kind === 'normal') {
        freezeNormalEnemyAction(target.ref, target.ref.noahStunUntil);
      } else if (target.kind === 'faceless') {
        deferFacelessObjectAttackResume(target.ref, target.ref.noahStunUntil);
      }
    });

    if (refs.some(t => t && t.kind === 'boss')) {
      applyBossStun(duration, 'noah_ult');
    }

    renderHud();
  }


  function finishNoahUlt() {
    if (!state) return;

    // 16発目の落雷が終わった瞬間に、ULT中の全体停止を完全解除。
    // この後の1.5秒スタンは「落雷を受けた敵だけ」に残し、
    // プレイヤー（ノア）は通常どおり移動・射撃できる。
    state.noahMovementFreezeUntil = 0;
    state.noahUltActive = false;
    // 全体停止解除フレームを射撃再開の起点にする。
    // 個別1.5秒スタン対象は、すでにより後ろのresumeAtが入っているため維持される。
    deferAllEnemyAttackResume(performance.now());

    // ここからは「敵だけスタン」のフェーズ。
    // ULTロックを解除し、ノアは即座に移動・通常射撃へ復帰する。
    state.ultLockUntil = 0;
    state.lastShotAt = -Infinity;

    state.noahUltToken = Number(state.noahUltToken || 0) + 1;
    renderHud();
  }

  function useNoahUlt(c) {
    if (!state || state.ended || state.finishing) return;

    showUltCut(c.ultName, c.effectKey);

    // ULT発動フレームで盤面をリセット。
    // 敵弾だけでなく、ノア自身が発射済みの弾・レーザーも全部消す。
    clearNoahUltEnemyBarrage();
    clearNoahUltPlayerShots();

    const beatMs = c.id === CHARACTER_ID.NOAH
      ? 540
      : Math.max(70, Number(c.noahUltBeatMs || 135));
    const hitCount = 16;
    const token = Number(state.noahUltToken || 0) + 1;
    state.noahUltToken = token;
    state.noahUltActive = true;
    state.noahUltHitTargets = [];

    // 8拍子を間を置かず2周 = 合計16発。
    const times = Array.from({ length: hitCount }, (_, i) => i * beatMs);

    // 16発を撃ち切るまで盤面上の敵全体の移動・攻撃を停止。
    // 新規スポーン判定は止めない。
    state.noahMovementFreezeUntil = performance.now() + (hitCount - 1) * beatMs + 220;
    deferAllEnemyAttackResume(state.noahMovementFreezeUntil);

    times.forEach((delay, i) => {
      pushUltTimer(() => {
        if (!state || state.ended || state.finishing || Number(state.noahUltToken || 0) !== token) return;
        spawnNoahLightning(c);

        if (i === hitCount - 1) {
          // 最後の一撃後、実際に落雷を受けた敵だけ1.5秒スタン。
          applyNoahTargetStuns(c);
          finishNoahUlt();
        }
      }, delay);
    });

    // プレイヤー側のULTロックは「16発目が落ちるまで」だけ。
    // その後の1.5秒スタン中はノアが通常射撃できる。
    const lightningMs = (hitCount - 1) * beatMs + 220;
    state.ultLockUntil = Math.max(Number(state.ultLockUntil || 0), performance.now() + lightningMs);
    renderHud();
  }


  // ============================================================
  // シイナ ULT：術式・光の円環
  // 自機追従の大きな光円。円内の敵弾だけ移動速度を低下させる。
  // 弾そのものの vx/vy は書き換えず、更新時の dt を縮めるため、
  // 円外へ出た瞬間に元の速度へ自然に復帰する。
  // ============================================================
  function isShiinaLightRingActive(now = performance.now()) {
    return !!state && now < Number(state.shiinaLightRingUntil || 0);
  }

  function getShiinaEnemyBulletSpeedMultiplier(p, now = performance.now()) {
    if (!p || !state || !isShiinaLightRingActive(now)) return 1;
    const radius = Math.max(1, Number(state.shiinaLightRingRadius || 190));
    const dx = Number(p.x || 0) - Number(state.player?.x || 0);
    const dy = Number(p.y || 0) - Number(state.player?.y || 0);
    if (dx * dx + dy * dy > radius * radius) return 1;
    return Math.max(0.05, Math.min(1, Number(state.shiinaLightRingSlowMultiplier || 0.5)));
  }

  function syncShiinaLightRingVisual(now = performance.now()) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    let ring = arena.querySelector('.shooting-shiina-light-ring');
    if (!isShiinaLightRingActive(now)) {
      if (ring) ring.remove();
      return;
    }

    if (!ring) {
      ring = document.createElement('div');
      ring.className = 'shooting-shiina-light-ring';
      Object.assign(ring.style, {
        position: 'absolute',
        left: '0px',
        top: '0px',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: '6',
        boxSizing: 'border-box',
        border: '2px solid rgba(255,248,205,.88)',
        background: 'radial-gradient(circle, rgba(255,250,220,.035) 0%, rgba(245,255,220,.05) 55%, rgba(255,248,200,.13) 78%, rgba(255,255,235,.025) 100%)',
        boxShadow: '0 0 14px rgba(255,250,205,.62), inset 0 0 18px rgba(255,255,225,.30)',
        transform: 'translate3d(-50%,-50%,0)',
        opacity: '.92'
      });
      arena.appendChild(ring);
      if (typeof ring.animate === 'function') {
        ring.animate([
          { opacity:.48, filter:'brightness(.88)' },
          { opacity:.96, filter:'brightness(1.22)' },
          { opacity:.58, filter:'brightness(.96)' }
        ], { duration:1350, iterations:Infinity, easing:'ease-in-out' });
      }
    }

    const radius = Math.max(1, Number(state.shiinaLightRingRadius || 190));
    ring.style.width = `${radius * 2}px`;
    ring.style.height = `${radius * 2}px`;
    ring.style.left = `${Number(state.player?.x || 0)}px`;
    ring.style.top = `${Number(state.player?.y || 0)}px`;
  }

  function useShiinaLightRingUlt(c) {
    if (!state || state.ended || state.finishing) return;
    const now = performance.now();
    const duration = Math.max(1000, Number(c.lightRingDurationMs || 7000));

    showUltCut(c.ultName || '術式・光の円環', c.effectKey);
    state.shiinaLightRingUntil = now + duration;
    state.shiinaLightRingRadius = Math.max(80, Number(c.lightRingRadius || 190));
    state.shiinaLightRingSlowMultiplier = Math.max(0.05, Math.min(1, Number(c.lightRingBulletSpeedMultiplier || 0.5)));
    state.ultLockUntil = Math.max(Number(state.ultLockUntil || 0), now + 260);
    syncShiinaLightRingVisual(now);
    renderHud();
  }


  function spawnShionCurseMarks(points) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return [];
    return (Array.isArray(points) ? points : []).map(point => {
      const el = document.createElement('i');
      el.className = 'shooting-shion-curse-mark arm';
      el.setAttribute('aria-hidden', 'true');
      arena.appendChild(el);
      positionUnit(el, Number(point.x || 0), Number(point.y || 0));
      return el;
    });
  }

  function useShionUlt(c) {
    if (!state || state.ended || state.finishing) return;

    const now = performance.now();
    const delayMs = Math.max(300, Number(c.ultDelayMs || 1200));
    const debuffMs = Math.max(1000, Number(c.ultDebuffDurationMs || 6000));
    const damageMultiplier = Math.max(0, Number(c.ultDamageAtkMultiplier || 2.8));
    const enemyDamageMultiplier = Math.max(0.05, Math.min(1, Number(c.ultEnemyDamageMultiplier || 0.70)));
    const root = document.getElementById(ROOT_ID);

    showUltCut(c.ultName || '黒羽葬鐘', c.effectKey);
    ultScreenFlash('ult-flash-ayane');

    // 発動時点の敵位置へ呪印を置く。ダメージ自体は時間差で、その時点で生存している敵全体へ適用。
    const points = getEriUltTargetPoints();
    const marks = spawnShionCurseMarks(points);

    // build566: 呪印の待機時間中も敵は移動・攻撃を継続する。
    // シオン本人の通常射撃だけ、時間差発動までロックする。
    state.ultLockUntil = Math.max(Number(state.ultLockUntil || 0), now + 260);
    state.playerShotLockUntil = Math.max(Number(state.playerShotLockUntil || 0), now + delayMs + 180);
    renderHud();

    pushUltTimer(() => {
      if (!state || state.ended || state.finishing) return;

      marks.forEach(el => {
        if (!el || !el.isConnected) return;
        el.classList.remove('arm');
        void el.offsetWidth;
        el.classList.add('detonate');
        setTimeout(() => el.remove(), 440);
      });

      const damage = Number(c.atk || 0) * damageMultiplier;
      applyUltDamage(damage, true, c);

      state.shionEnemyDebuffUntil = performance.now() + debuffMs;
      state.shionEnemyDamageMultiplier = enemyDamageMultiplier;

      if (root) {
        root.classList.remove('shion-curse-active');
        void root.offsetWidth;
        root.classList.add('shion-curse-active');
      }

      state.ultLockUntil = performance.now() + 120;
      state.playerShotLockUntil = performance.now() + 120;
      renderHud();

      pushUltTimer(() => {
        if (!state) return;
        state.shionEnemyDebuffUntil = 0;
        state.shionEnemyDamageMultiplier = 1;
        if (root) root.classList.remove('shion-curse-active');
        renderHud();
      }, debuffMs);
    }, delayMs);
  }

  function shakeVeronicaPunchImpact() {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    // Hit時だけ短く強めに揺らす。MISSでは呼ばない。
    // Web Animationsを使い、ゲームループ側の座標/transform処理とは分離する。
    if (typeof arena.animate === 'function') {
      arena.animate([
        { transform:'translate3d(0,0,0)' },
        { transform:'translate3d(-5px,2px,0)' },
        { transform:'translate3d(5px,-3px,0)' },
        { transform:'translate3d(-4px,-2px,0)' },
        { transform:'translate3d(3px,2px,0)' },
        { transform:'translate3d(-2px,1px,0)' },
        { transform:'translate3d(0,0,0)' }
      ], {
        duration: 260,
        easing: 'cubic-bezier(.2,.8,.2,1)'
      });
    }
  }

  function useVeronicaBrassPunchUlt(c) {
    if (!state || state.ended || state.finishing) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    const now = performance.now();
    const px = Number(state.player?.x || 0);
    const py = Number(state.player?.y || 0);
    const range = Math.max(56, Number(c.ultPunchRange || 118));
    const width = Math.max(36, Number(c.ultPunchWidth || 68));
    const halfWidth = width * .5;
    const damage = Math.max(0, Number(c.atk || 0) * Number(c.ultDamageAtkMultiplier || 7));
    const attackElement = getUltAttackElement(c);
    const arenaRect = arena.getBoundingClientRect();

    showUltCut(c.ultName || 'キョーレツな一発をあげる♡', c.effectKey);
    ultScreenFlash('ult-flash-ayane', c);

    // ベロニカの真正面だけ。通常Strikeより狭く、追尾・自動補正はしない。
    const punchRect = {
      left: arenaRect.left + px - halfWidth,
      right: arenaRect.left + px + halfWidth,
      top: arenaRect.top + py - range,
      bottom: arenaRect.top + py + 6
    };

    const candidates = [];
    const pushCandidate = (kind, ref, rect, x, y) => {
      if (!rect || !rectsHit(punchRect, rect, 0, 0)) return;
      const dx = Number(x || 0) - px;
      const dy = Number(y || 0) - py;
      candidates.push({ kind, ref, x:Number(x || 0), y:Number(y || 0), dist2:dx*dx + dy*dy });
    };

    // CH06/デイリー上級の壁はStrike系を遮る。壁が一番手前なら拳はそこで止まる。
    (state.chapter6Barriers || []).forEach(barrier => {
      if (!barrier || !barrier.el) return;
      pushCandidate('barrier', barrier, getChapter6BarrierRect(barrier, arenaRect), barrier.x, barrier.y);
    });

    (state.normalEnemies || []).forEach(enemy => {
      if (!enemy || !enemy.el || enemy.hp <= 0) return;
      let rect = null;
      let hw = Number(enemy._hw || 0);
      let hh = Number(enemy._hh || 0);
      if (hw <= 0 || hh <= 0) {
        measureUnitSize(enemy);
        hw = Number(enemy._hw || 0);
        hh = Number(enemy._hh || 0);
      }
      if (hw > 0 && hh > 0) rect = getUnitRect(enemy, arenaRect);
      if (!rect) rect = enemy.el.getBoundingClientRect();
      pushCandidate('enemy', enemy, rect, enemy.x, enemy.y);
    });

    (state.facelessObjects || []).forEach(obj => {
      if (!obj || !obj.el || obj.hp <= 0) return;
      pushCandidate('faceless', obj, obj.el.getBoundingClientRect(), obj.x, obj.y);
    });

    if (state.boss && state.boss.hp > 0) {
      const bossEl = document.getElementById(BOSS_ID);
      const bossRect = bossEl ? bossEl.getBoundingClientRect() : {
        left:arenaRect.left + Number(state.boss.x || 0) - 48,
        right:arenaRect.left + Number(state.boss.x || 0) + 48,
        top:arenaRect.top + Number(state.boss.y || 0) - 48,
        bottom:arenaRect.top + Number(state.boss.y || 0) + 48
      };
      pushCandidate('boss', state.boss, bossRect, state.boss.x, state.boss.y);
    }

    candidates.sort((a,b) => a.dist2 - b.dist2);
    const target = candidates[0] || null;

    // 外したらそのまま終了。バフ・追撃・再判定は一切ない。
    if (!target) {
      state.ultLockUntil = Math.max(Number(state.ultLockUntil || 0), now + 180);
      renderHud();
      return;
    }

    if (target.kind === 'barrier') {
      pulseChapter6Barrier(target.ref);
      createHit(target.x, target.y, true);
      shakeVeronicaPunchImpact();
      state.shotsHit = Number(state.shotsHit || 0) + 1;
      state.ultLockUntil = Math.max(Number(state.ultLockUntil || 0), now + 220);
      renderHud();
      return;
    }

    let appliedDamage = 0;
    let reaction = '';

    if (target.kind === 'enemy') {
      const targetElement = getCombatTargetElement(target.ref);
      reaction = getElementDamageReaction(attackElement, targetElement);
      const finalDamage = applyElementDamage(damage, attackElement, targetElement);
      appliedDamage = damageNormalEnemy(target.ref, finalDamage, now, true, reaction);
      state.normalEnemies = (state.normalEnemies || []).filter(enemy => enemy && enemy.hp > 0);
      evaluateNormalMission(now);
    } else if (target.kind === 'faceless') {
      const targetElement = getCombatTargetElement(target.ref);
      reaction = getElementDamageReaction(attackElement, targetElement);
      const finalDamage = applyElementDamage(damage, attackElement, targetElement);
      appliedDamage = damageFacelessObject(target.ref, finalDamage, now, reaction);
    } else if (target.kind === 'boss') {
      const targetElement = getCombatTargetElement(state.boss);
      reaction = getElementDamageReaction(attackElement, targetElement);
      const finalDamage = applyElementDamage(damage, attackElement, targetElement);
      appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(finalDamage || 0)));
      state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
      updateBossPhase();
      createHit(target.x, target.y, true);
      showBossDamageNumber(appliedDamage, true, reaction);
      flashBossHit(true);
      if (state.boss.hp <= 0) beginBossDefeat();
    }

    // 1回のULTにつきHit判定も1回。IMMUNE(0 damage)はHit COMBOに加算しない。
    state.shotsHit = Number(state.shotsHit || 0) + 1;
    registerComboHit(c.id, now, appliedDamage > 0 ? appliedDamage : 0);
    shakeVeronicaPunchImpact();
    state.ultLockUntil = Math.max(Number(state.ultLockUntil || 0), now + 260);
    renderHud();
  }


  // ============================================================
  // build908: ID38 クロエ ULT — 虹のかかる世界
  //
  // 親弾：
  //   LIGHT属性 / 真上へ直進 / 最初の敵・オブジェクトへの命中時のみ着弾。
  //   命中した場合はLIGHT属性として通常の弱点・耐性計算を適用する。未命中なら分裂せず消滅。
  //
  // 子弾：
  //   着弾地点から6方向へ同時発射。すべて非貫通。
  //     上    = NEUTRAL
  //     下    = DARK
  //     左上  = FIRE
  //     右上  = AQUA
  //     左下  = WOOD
  //     右下  = LIGHT
  //   ダメージ計算は「命中前の敵属性」で行い、その後、生存した敵を
  //   命中した子弾の属性へ書き換える。
  // ============================================================
  function setCombatTargetElement(target, element) {
    if (!target) return false;
    const nextElement = normalizeCombatElement(element) || 'neutral';
    target.element = nextElement;
    if (target.el) target.el.dataset.element = nextElement;

    if (Object.prototype.hasOwnProperty.call(target, 'elementEl')) {
      const src = getCombatElementIcon(nextElement);
      if (target.elementEl && src) {
        target.elementEl.src = src;
        target.elementEl.style.display = '';
      }
      if (target.weaknessBarrierEl) {
        ['neutral','aqua','fire','wood','dark','light'].forEach(key => {
          target.weaknessBarrierEl.classList.remove(`element-${key}`);
        });
        target.weaknessBarrierEl.classList.add(`element-${nextElement}`);
        target.weaknessBarrierEl.dataset.element = nextElement;
      }
      positionMiniEnemyHp(target);
    }

    if (target === state?.boss) renderBossElementIcon();

    if (target.el) {
      const visual = getBombElementVisual(nextElement);
      target.el.style.setProperty('--painter-shift-rgb', visual.rgb);
      target.el.classList.remove('painter-element-shift-hit');
      void target.el.offsetWidth;
      target.el.classList.add('painter-element-shift-hit');
      setTimeout(() => target.el && target.el.classList.remove('painter-element-shift-hit'), 420);
    }
    return true;
  }

  function ensurePainterUltStyle() {
    const styleId = 'shooting-painter-rainbow-ult-style-v3';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .painter-element-shift-hit{
        filter:
          brightness(1.18)
          saturate(1.04)
          drop-shadow(0 0 10px rgba(var(--painter-shift-rgb,231,200,90),.78))!important;
      }
      .shooting-painter-rainbow-child{
        position:absolute;
        z-index:47;
        width:15px;
        height:15px;
        margin:-7.5px 0 0 -7.5px;
        border-radius:50%;
        pointer-events:none;
        box-sizing:border-box;
        border:1px solid rgba(255,255,255,.90);
        background:
          radial-gradient(circle at 36% 32%,
            rgba(255,255,255,1) 0 13%,
            rgba(var(--painter-rgb,244,239,227),.98) 28%,
            rgba(var(--painter-rgb,244,239,227),.82) 55%,
            rgba(var(--painter-rgb,244,239,227),.18) 76%,
            transparent 78%);
        box-shadow:
          0 0 7px rgba(255,255,255,.90),
          0 0 14px rgba(var(--painter-rgb,244,239,227),.78),
          0 0 22px rgba(var(--painter-rgb,244,239,227),.34);
      }
      .shooting-painter-rainbow-child::after{
        content:"";
        position:absolute;
        inset:-5px;
        border-radius:50%;
        border:1px solid rgba(var(--painter-rgb,244,239,227),.46);
        opacity:.72;
      }
      .shooting-painter-rainbow-burst{
        position:absolute;
        z-index:46;
        width:26px;
        height:26px;
        margin:-13px 0 0 -13px;
        border-radius:50%;
        pointer-events:none;
        border:1px solid rgba(255,255,255,.88);
        box-shadow:
          0 0 9px rgba(255,255,255,.94),
          0 0 20px rgba(231,200,90,.50);
        animation:painterRainbowBurst .32s ease-out both;
      }
      @keyframes painterRainbowBurst{
        0%{transform:scale(.35);opacity:1}
        100%{transform:scale(2.35);opacity:0}
      }
    `;
    document.head.appendChild(style);
  }

  function getPainterUltCandidates() {
    const list = [];
    (state?.normalEnemies || []).forEach(enemy => {
      if (enemy && enemy.el && enemy.hp > 0) list.push(enemy);
    });
    (state?.facelessObjects || []).forEach(obj => {
      if (obj && obj.el && obj.hp > 0) list.push(obj);
    });
    // 通常ステージの内部dummy bossは対象外。
    if (!isNormalBattle() && state?.boss && state.boss.hp > 0) list.push(state.boss);
    return list;
  }

  function findPainterUltCollision(x, y, arenaRect, ignoreTarget = null, radius = 10) {
    const r = Math.max(4, Number(radius || 10));
    const projectileRect = {
      left: x - r,
      right: x + r,
      top: y - r,
      bottom: y + r,
      width: r * 2,
      height: r * 2,
    };
    const candidates = getPainterUltCandidates();
    for (const target of candidates) {
      if (!target || target === ignoreTarget || target.hp <= 0) continue;
      const targetRect = getUnitRect(target, arenaRect);
      if (targetRect && rectsHit(projectileRect, targetRect, 0, target === state?.boss ? 18 : 8)) {
        return target;
      }
    }
    return null;
  }

  function applyPainterRainbowDamage(target, rawDamage, attackElement, now, c, options = {}) {
    if (!target || target.hp <= 0) return 0;

    // 必ず変更前の属性を使ってダメージ倍率を決める。
    const targetElementBeforeHit = getCombatTargetElement(target, state?.boss?.element);
    const reaction = getElementDamageReaction(attackElement, targetElementBeforeHit);
    const finalDamage = applyElementDamage(rawDamage, attackElement, targetElementBeforeHit);
    let appliedDamage = 0;
    const big = !!options.big;

    if ((state.normalEnemies || []).includes(target)) {
      appliedDamage = damageNormalEnemy(target, finalDamage, now, big, reaction);
    } else if ((state.facelessObjects || []).includes(target)) {
      appliedDamage = damageFacelessObject(target, finalDamage, now, reaction);
    } else if (target === state.boss && state.boss && state.boss.hp > 0) {
      appliedDamage = Math.min(state.boss.hp, Math.max(0, Number(finalDamage || 0)));
      state.boss.hp = Math.max(0, state.boss.hp - appliedDamage);
      updateBossPhase();
      createHit(Number(target.x || 0), Number(target.y || 0), big);
      showBossDamageNumber(appliedDamage, big, reaction);
      flashBossHit(big);
      if (!addScoreAttackDamageScore(appliedDamage)) {
        addLegacyCombatScore(Math.round(appliedDamage * (big ? 100 : 80)));
      }
    }

    if (appliedDamage > 0) {
      state.shotsHit = Number(state.shotsHit || 0) + 1;
      registerComboHit(c.id, now, appliedDamage);
    }

    // 親弾は属性を書き換えない。
    // 子弾はダメージ解決後、生存対象のみ命中弾の属性へ変更する。
    if (options.shiftElement && target.hp > 0) {
      setCombatTargetElement(target, attackElement);
    }

    return appliedDamage;
  }

  function finalizePainterRainbowHit(now) {
    state.normalEnemies = (state.normalEnemies || []).filter(enemy => enemy && enemy.hp > 0);
    state.facelessObjects = (state.facelessObjects || []).filter(obj => obj && obj.hp > 0);

    if (isNormalBattle()) {
      evaluateNormalMission(now);
    } else if (state.boss && state.boss.hp <= 0) {
      beginBossDefeat();
    }
    renderHud();
  }

  function createPainterRainbowBurst(x, y) {
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;
    const burst = document.createElement('i');
    burst.className = 'shooting-painter-rainbow-burst';
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    arena.appendChild(burst);
    setTimeout(() => burst.remove(), 360);
  }

  function launchPainterRainbowChildren(x, y, c, sourceTarget = null) {
    if (!state || state.ended || state.finishing) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    ensurePainterUltStyle();
    createPainterRainbowBurst(x, y);

    const diagonal = Math.SQRT1_2;
    const specs = [
      { key:'up',         element:'neutral', dx:0,         dy:-1 },
      { key:'down',       element:'dark',    dx:0,         dy: 1 },
      { key:'left-up',    element:'fire',    dx:-diagonal, dy:-diagonal },
      { key:'right-up',   element:'aqua',    dx: diagonal, dy:-diagonal },
      { key:'left-down',  element:'wood',    dx:-diagonal, dy: diagonal },
      { key:'right-down', element:'light',   dx: diagonal, dy: diagonal },
    ];

    const speed = Math.max(180, Number(c.paintRainbowChildSpeed || 520));
    const damage = Math.max(
      0,
      Number(c.atk || 0) * Math.max(0, Number(c.paintRainbowChildDamageAtkMultiplier ?? 1.0))
    );

    const children = specs.map(spec => {
      const visual = getBombElementVisual(spec.element);
      const el = document.createElement('i');
      el.className = `shooting-painter-rainbow-child element-${spec.element}`;
      el.dataset.element = spec.element;
      el.dataset.direction = spec.key;
      el.style.setProperty('--painter-rgb', visual.rgb);
      el.style.transform = `translate3d(${x}px,${y}px,0)`;
      arena.appendChild(el);
      return {
        ...spec,
        x,
        y,
        travel: 0,
        el,
        alive: true,
      };
    });

    let lastTs = performance.now();
    let raf = 0;

    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      children.forEach(child => child.el && child.el.remove());
    };

    const animate = ts => {
      if (!state || state.ended || state.finishing) {
        cleanup();
        return;
      }

      const dt = Math.min(.035, Math.max(0, (ts - lastTs) / 1000));
      lastTs = ts;
      const arenaRect = arena.getBoundingClientRect();
      const width = Math.max(1, Number(arena.clientWidth || 0));
      const height = Math.max(1, Number(arena.clientHeight || 0));
      let aliveCount = 0;

      for (const child of children) {
        if (!child.alive) continue;

        child.x += child.dx * speed * dt;
        child.y += child.dy * speed * dt;
        child.travel += speed * dt;
        child.el.style.transform = `translate3d(${child.x}px,${child.y}px,0)`;

        if (child.x < -22 || child.x > width + 22 || child.y < -22 || child.y > height + 22) {
          child.alive = false;
          child.el.remove();
          continue;
        }

        // 親弾の着弾対象を全6弾が即座に多重ヒットしないよう除外。
        // また、発生直後の数pxは「飛び出す」見た目を優先して判定しない。
        if (child.travel >= 18) {
          const hitTarget = findPainterUltCollision(
            child.x,
            child.y,
            arenaRect,
            sourceTarget,
            7
          );

          if (hitTarget) {
            createBombSplashVictimHitEffect(
              Number(hitTarget.x || child.x),
              Number(hitTarget.y || child.y),
              child.element
            );
            applyPainterRainbowDamage(
              hitTarget,
              damage,
              child.element,
              ts,
              c,
              { shiftElement:true, big:false }
            );

            child.alive = false;
            child.el.remove();
            finalizePainterRainbowHit(ts);
            continue;
          }
        }

        aliveCount++;
      }

      if (aliveCount > 0) {
        raf = requestAnimationFrame(animate);
      } else {
        cleanup();
      }
    };

    raf = requestAnimationFrame(animate);
  }

  function impactPainterRainbowParent(target, x, y, c) {
    if (!state || state.ended || state.finishing) return;
    const nowHit = performance.now();
    const attackElement = 'light';
    const directDamage = Math.max(
      0,
      Number(c.atk || 0) * Math.max(0, Number(c.ultDamageAtkMultiplier || 2.5))
    );

    // 親弾はLIGHT属性ダメージのみ。属性書き換えは子弾だけ。
    if (target && target.hp > 0) {
      createBombSplashVictimHitEffect(x, y, attackElement);
      applyPainterRainbowDamage(
        target,
        directDamage,
        attackElement,
        nowHit,
        c,
        { shiftElement:false, big:true }
      );
    }

    // 親弾の着弾地点を起点に必ず6方向へ展開。
    launchPainterRainbowChildren(x, y, c, target || null);
    finalizePainterRainbowHit(nowHit);
  }

  function usePainterRainbowUlt(c) {
    if (!state || state.ended || state.finishing) return;
    const arena = document.getElementById('shooting-arena');
    if (!arena) return;

    ensureBombVisualStyles();
    ensurePainterUltStyle();
    showUltCut(c.ultName || '虹のかかる世界', c.effectKey, c);
    ultScreenFlash('ult-flash-element', c);

    const startX = Number(state.player?.x || arena.clientWidth * .5);
    const startY = Math.max(36, Number(state.player?.y || arena.clientHeight * .80) - 28);
    const baseSpeed = Math.max(120, Number(c.paintUltBaseSpeed || c.bulletSpeed || 660));
    const speedMultiplier = Math.max(.1, Number(c.paintUltSpeedMultiplier ?? .35));
    const speed = baseSpeed * speedMultiplier;
    const visual = getBombElementVisual('light');

    // クロエULTは旧仕様と同じく戦闘時間を止めない。
    // 通常ショット、敵移動、敵弾もそのまま進行する。
    createBombThrowPop(startX, startY, 'light');

    const parent = document.createElement('i');
    parent.className = 'shooting-liz-ult-bomb';
    parent.dataset.element = 'light';
    parent.style.setProperty('--bomb-color', visual.color);
    parent.style.setProperty('--bomb-rgb', visual.rgb);
    arena.appendChild(parent);

    let x = startX;
    let y = startY;
    let lastTs = performance.now();
    let spin = 0;
    let raf = 0;

    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      parent.remove();
    };

    const animate = ts => {
      if (!state || state.ended || state.finishing || !parent.isConnected) {
        cleanup();
        return;
      }

      const dt = Math.min(.035, Math.max(0, (ts - lastTs) / 1000));
      lastTs = ts;
      y -= speed * dt;
      spin += 220 * dt;
      parent.style.transform =
        `translate3d(${x}px,${y}px,0) translate(-50%,-50%) rotate(${spin}deg) scale(.72)`;

      const arenaRect = arena.getBoundingClientRect();
      const hitTarget = findPainterUltCollision(x, y, arenaRect, null, 10);

      if (hitTarget) {
        cleanup();
        impactPainterRainbowParent(hitTarget, x, y, c);
        return;
      }

      // build909: 敵・オブジェクトへ命中しなかった親弾は分裂せず消滅する。
      if (y <= -24) {
        cleanup();
        return;
      }

      raf = requestAnimationFrame(animate);
    };

    parent.style.transform =
      `translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(.72)`;
    raf = requestAnimationFrame(animate);
    renderHud();
  }


  function isUltReady() {
    if (!state || state.ended || state.phaseTransition || state.finishing || state.countdown) return false;
    if (isChapter04Stage() && !isChapter43BossStage()) return false;
    if (isChapter43BossStage() && state.chapter43AttackSealed) return false;
    if (performance.now() < (state.ultLockUntil || 0)) return false;
    const c = getCurrentCharacter();
    const member = getActiveMember();
    return !!member && member.burst >= c.burstNeed;
  }

  function executeCharacterUlt(c) {
    if (!state || state.ended || state.finishing) return;

    // ULTの内部属性と、画像を使わない演出の基調色を同じ属性へ同期。
    applyUltElementVisualContext(c);

    if (c.ultType === 'sui_clock_burst') useSuiUlt(c);
    else if (c.ultType === 'rose_flower_heart') useRoseUlt(c);
    else if (c.ultType === 'ignis_fire_wheel') useIgnisUlt(c);
    else if (c.ultType === 'clarine_decoy') useClarineUlt(c);
    else if (c.ultType === 'gresha_burn_field') useGreshaUlt(c);
    else if (c.ultType === 'arno_aura') useArnoUlt(c);
    else if (c.ultType === 'speed_storm') useHayateUlt(c);
    else if (c.ultType === 'precision_beam') useAyaneUlt(c);
    else if (c.ultType === 'gojo_purple') useGojoUlt(c);
    else if (c.ultType === 'eltena_black_hole') useEltenaUlt(c);
    else if (c.ultType === 'nem_stun') useNemUlt(c);
    else if (c.ultType === 'mimosa_item_spawn') useMimosaUlt(c);
    else if (c.ultType === 'mito_summon_double') useMitoUlt(c);
    else if (c.ultType === 'wolf_atk_field') useWolfUlt(c);
    else if (c.ultType === 'toyfel_double_black_hole') useToyfelUlt(c);
    else if (
      c.ultType === 'painter_rainbow_world' ||
      c.ultType === 'painter_light_paint_bomb' ||
      c.ultType === 'painter_dark_paint_bomb'
    ) usePainterRainbowUlt(c);
    else if (c.ultType === 'nina_output_max' || c.ultType === 'nina_lightning_storm') useNinaOutputMax(c);
    else if (c.ultType === 'noah_time_homing') useNoahUlt(c);
    else if (c.ultType === 'jig_scramble_ray') useJigScrambleUlt(c);
    else if (c.ultType === 'testchan_black_ship') useTestChanUlt(c);
    else if (c.ultType === 'veronica_brass_punch') useVeronicaBrassPunchUlt(c);
    else if (c.ultType === 'shiina_light_ring') useShiinaLightRingUlt(c);
    else if (c.ultType === 'shion_delayed_curse') useShionUlt(c);
    else if (c.ultType === 'liz_giant_bomb') useLizGiantBombUlt(c);
    else if (c.ultType === 'prototype_generic') useEriUlt(c);
    else useEriUlt(c);

    renderHud();
  }

  window.useShootingBurst = function () {
    if (!isUltReady()) return;
    const c = getCurrentCharacter();
    const member = getActiveMember();
    if (!member) return;

    // 二重発動防止のため、カットイン開始時点でゲージを消費。
    member.burst = 0;

    // 神聖樹 ULT SLOT：ULT発動直後に必要ゲージ量の一定割合を還元する。
    // Stage1→5 = 4 / 8 / 12 / 16 / 20%。
    try {
      const blessing = window.ShinjuProgress && typeof window.ShinjuProgress.getBlessingForCharacter === 'function'
        ? window.ShinjuProgress.getBlessingForCharacter(c.id)
        : null;
      const refundRate = Math.max(0, Math.min(1, Number(blessing && blessing.ultRefundRate || 0)));
      if (refundRate > 0) {
        member.burst = Math.min(Number(c.burstNeed || 0), Number(c.burstNeed || 0) * refundRate);
      }
    } catch (err) {
      console.warn('[shooting] shinju ULT refund skipped:', err);
    }

    member.ultReadyNotified = false;
    member.ultUseCount = (member.ultUseCount || 0) + 1;
    clearUltTimers();

    // 約1秒のカットイン → その後にULT効果を発動。
    playUltCutin(c, () => executeCharacterUlt(c));
    renderHud();
  };

  window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (document.getElementById(ROOT_ID)?.classList.contains('open') && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  }, { passive: false });
  window.addEventListener('keyup', e => { keys[e.key] = false; });
  window.addEventListener('resize', () => {
    invalidateArenaInputRect();
    if (state && state.running && !state.ended) placeInitialUnits();
    else requestAnimationFrame(() => refreshArenaInputRect(true));
  });
  window.addEventListener('orientationchange', () => {
    invalidateArenaInputRect();
    // iOSはorientationchange直後にviewportサイズが確定していない場合があるため、
    // 次フレームで再取得する。
    requestAnimationFrame(() => refreshArenaInputRect(true));
  });
  // 復元チェックは所持キャラ判定(collected)に依存する。
  // window._dbLoadPromiseは、index.html側のinit()がスプラッシュタップ後の
  // Step2に到達して初めて代入される。ページ読み込み直後(スプラッシュ表示中)は
  // まだこの変数自体が存在しないため、「あれば待つ」だけでは不十分で、
  // 存在するようになるまでポーリングして待つ必要がある。
  function waitForShootingDbLoad(timeoutMs = 20000) {
    return new Promise(resolve => {
      const startedAt = performance.now();
      (function poll() {
        if (window._dbLoadPromise && typeof window._dbLoadPromise.then === 'function') {
          window._dbLoadPromise.then(resolve, resolve);
          return;
        }
        if (performance.now() - startedAt > timeoutMs) {
          // タイムアウトしても復元チェック自体は諦めず、ベストエフォートで進む。
          resolve();
          return;
        }
        setTimeout(poll, 120);
      })();
    });
  }

  async function tryRestoreShootingBattleWhenReady() {
    try {
      await waitForShootingDbLoad();
    } catch (_) {
      // DB読み込みが失敗した場合でも、復元チェック自体はベストエフォートで試みる。
    }
    tryRestoreShootingBattle();
  }
  setTimeout(() => { tryRestoreShootingBattleWhenReady(); }, 0);

  // ============================================================
  // v199: 5属性ショットカラー
  // FIRE=RED / AQUA=BLUE / WOOD=GREEN / DARK=PURPLE / LIGHT=YELLOW
  // 形状やショットタイプは維持し、通常攻撃の色味だけ属性へ統一する。
  // ============================================================
  if (!document.getElementById('shooting-five-element-shot-style-v199')) {
    const style = document.createElement('style');
    style.id = 'shooting-five-element-shot-style-v199';
    style.textContent = `
      .shooting-bullet.shooting-bullet-fire{
        background:radial-gradient(circle at 38% 34%,#fff 0 10%,#ffd8cf 18%,#ff6654 42%,#e52b23 67%,rgba(123,9,8,.30) 100%)!important;
        border-color:rgba(255,225,217,.88)!important;
        box-shadow:0 0 7px rgba(255,245,240,.92),0 0 14px rgba(255,77,59,.86),0 0 24px rgba(205,25,20,.56)!important;
      }
      .shooting-bullet.shooting-bullet-aqua{
        background:radial-gradient(circle at 38% 34%,#fff 0 10%,#d8f4ff 18%,#49b8ff 42%,#1476db 67%,rgba(6,52,125,.30) 100%)!important;
        border-color:rgba(216,244,255,.90)!important;
        box-shadow:0 0 7px rgba(242,251,255,.94),0 0 14px rgba(57,172,255,.86),0 0 24px rgba(21,104,214,.56)!important;
      }
      .shooting-bullet.shooting-bullet-wood{
        background:radial-gradient(circle at 38% 34%,#fff 0 10%,#e6ffd6 18%,#7ed957 42%,#2e9f3f 67%,rgba(17,92,38,.30) 100%)!important;
        border-color:rgba(229,255,214,.90)!important;
        box-shadow:0 0 7px rgba(247,255,242,.94),0 0 14px rgba(100,214,79,.86),0 0 24px rgba(38,139,55,.56)!important;
      }
      .shooting-bullet.shooting-bullet-dark{
        background:radial-gradient(circle at 38% 34%,#fff 0 10%,#eadbff 18%,#aa67ee 42%,#6928b8 67%,rgba(53,12,103,.34) 100%)!important;
        border-color:rgba(234,219,255,.90)!important;
        box-shadow:0 0 7px rgba(251,247,255,.94),0 0 14px rgba(166,91,233,.86),0 0 24px rgba(100,37,177,.58)!important;
      }
      .shooting-bullet.shooting-bullet-light{
        background:radial-gradient(circle at 38% 34%,#fff 0 10%,#fff9cf 18%,#ffe56b 42%,#e9b91f 67%,rgba(155,109,5,.28) 100%)!important;
        border-color:rgba(255,250,210,.92)!important;
        box-shadow:0 0 7px rgba(255,255,244,.98),0 0 14px rgba(255,225,83,.90),0 0 24px rgba(224,178,31,.56)!important;
      }

      /* 円形・特殊形状ショットの外周も属性色へ寄せる */
      .shooting-bullet.shooting-bullet-fire::before{border-color:rgba(255,111,92,.82)!important;box-shadow:0 0 8px rgba(255,62,46,.58)!important}
      .shooting-bullet.shooting-bullet-aqua::before{border-color:rgba(83,190,255,.84)!important;box-shadow:0 0 8px rgba(41,149,255,.58)!important}
      .shooting-bullet.shooting-bullet-wood::before{border-color:rgba(126,221,94,.84)!important;box-shadow:0 0 8px rgba(63,184,69,.58)!important}
      .shooting-bullet.shooting-bullet-dark::before{border-color:rgba(179,108,239,.84)!important;box-shadow:0 0 8px rgba(123,54,204,.60)!important}
      .shooting-bullet.shooting-bullet-light::before{border-color:rgba(255,231,105,.88)!important;box-shadow:0 0 8px rgba(236,191,37,.60)!important}

      .shooting-bullet.shooting-bullet-fire::after{background:radial-gradient(circle,rgba(255,78,59,.34),rgba(206,27,24,.14) 46%,transparent 72%)!important}
      .shooting-bullet.shooting-bullet-aqua::after{background:radial-gradient(circle,rgba(62,177,255,.34),rgba(26,104,211,.14) 46%,transparent 72%)!important}
      .shooting-bullet.shooting-bullet-wood::after{background:radial-gradient(circle,rgba(110,214,80,.34),rgba(42,142,52,.14) 46%,transparent 72%)!important}
      .shooting-bullet.shooting-bullet-dark::after{background:radial-gradient(circle,rgba(164,91,230,.34),rgba(98,37,171,.16) 46%,transparent 72%)!important}
      .shooting-bullet.shooting-bullet-light::after{background:radial-gradient(circle,rgba(255,226,80,.34),rgba(220,170,24,.14) 46%,transparent 72%)!important}

      /* イグニス / ノア系レーザー。形は維持し色だけ属性連動 */
      .shooting-ignis-laser.shooting-bullet-fire i{
        background:linear-gradient(90deg,rgba(255,72,54,.10),#ff4938,#fff,#ff4938,rgba(255,72,54,.10))!important;
        box-shadow:0 0 8px rgba(255,96,75,.96),0 0 18px rgba(223,40,30,.72)!important;
      }
      .shooting-ignis-laser.shooting-bullet-aqua i{
        background:linear-gradient(90deg,rgba(40,155,255,.10),#2d9fff,#fff,#2d9fff,rgba(40,155,255,.10))!important;
        box-shadow:0 0 8px rgba(74,181,255,.96),0 0 18px rgba(28,108,214,.72)!important;
      }
      .shooting-ignis-laser.shooting-bullet-wood i{
        background:linear-gradient(90deg,rgba(72,182,65,.10),#58c84e,#fff,#58c84e,rgba(72,182,65,.10))!important;
        box-shadow:0 0 8px rgba(106,216,88,.96),0 0 18px rgba(40,139,53,.72)!important;
      }
      .shooting-ignis-laser.shooting-bullet-dark i{
        background:linear-gradient(90deg,rgba(128,54,201,.10),#9f59df,#fff,#9f59df,rgba(128,54,201,.10))!important;
        box-shadow:0 0 8px rgba(179,111,235,.96),0 0 18px rgba(97,36,170,.74)!important;
      }
      .shooting-ignis-laser.shooting-bullet-light i{
        background:linear-gradient(90deg,rgba(225,185,38,.10),#f6cf3c,#fff,#f6cf3c,rgba(225,185,38,.10))!important;
        box-shadow:0 0 8px rgba(255,228,102,.98),0 0 18px rgba(211,160,18,.72)!important;
      }

      .shooting-ignis-laser.shooting-bullet-fire b{background:#fff3ef!important;box-shadow:0 0 11px rgba(255,87,67,.86)!important}
      .shooting-ignis-laser.shooting-bullet-aqua b{background:#eef9ff!important;box-shadow:0 0 11px rgba(67,170,255,.86)!important}
      .shooting-ignis-laser.shooting-bullet-wood b{background:#f0ffe9!important;box-shadow:0 0 11px rgba(91,199,74,.86)!important}
      .shooting-ignis-laser.shooting-bullet-dark b{background:#f6efff!important;box-shadow:0 0 11px rgba(156,82,219,.86)!important}
      .shooting-ignis-laser.shooting-bullet-light b{background:#fffceb!important;box-shadow:0 0 11px rgba(240,195,45,.88)!important}
    `;
    document.head.appendChild(style);
  }


  // ============================================================
  // v201: エルテナ / ミモザ系ショットの見た目改善
  // - 丸いボール感を弱める
  // - 輪郭線を消して半透明の気弾 / オーラ感を強める
  // - shotStyle 'eltena' を使う弾すべてに適用
  //   (エルテナ=dark, ミモザ=wood)
  // ============================================================
  if (!document.getElementById('shooting-eltena-aura-style-v201')) {
    const style = document.createElement('style');
    style.id = 'shooting-eltena-aura-style-v201';
    style.textContent = `
      .shooting-bullet.shooting-bullet-eltena{
        width:16px!important;
        height:26px!important;
        min-width:16px!important;
        min-height:26px!important;
        max-width:16px!important;
        max-height:26px!important;
        border-radius:50% 50% 46% 46% / 34% 34% 66% 66%!important;
        overflow:visible!important;
        opacity:.84!important;
        border:0!important;
        outline:none!important;
        filter:saturate(1.04) blur(.15px)!important;
      }

      .shooting-bullet.shooting-bullet-eltena::before,
      .shooting-bullet.shooting-bullet-eltena::after{
        content:"";
        position:absolute;
        pointer-events:none;
        border:0!important;
        box-shadow:none!important;
      }

      /* -------- ミモザ(木) -------- */
      .shooting-bullet.shooting-bullet-eltena.shooting-bullet-wood{
        background:
          radial-gradient(ellipse at 50% 30%,
            rgba(255,255,255,.92) 0 11%,
            rgba(237,255,229,.76) 15%,
            rgba(158,233,127,.42) 34%,
            rgba(85,189,77,.20) 55%,
            rgba(40,121,46,.08) 72%,
            transparent 84%)!important;
        box-shadow:
          0 0 8px rgba(249,255,246,.54),
          0 0 18px rgba(103,214,86,.34),
          0 0 28px rgba(52,157,61,.16)!important;
      }
      .shooting-bullet.shooting-bullet-eltena.shooting-bullet-wood::before{
        left:-4px!important; right:-4px!important;
        top:-3px!important; bottom:-8px!important;
        border-radius:50%;
        background:
          radial-gradient(ellipse at 50% 38%,
            rgba(237,255,229,.44) 0 16%,
            rgba(148,228,120,.30) 30%,
            rgba(72,176,69,.14) 52%,
            transparent 76%)!important;
        filter:blur(2.2px);
        opacity:.92;
      }
      .shooting-bullet.shooting-bullet-eltena.shooting-bullet-wood::after{
        left:-9px!important; right:-9px!important;
        top:-6px!important; bottom:-13px!important;
        border-radius:50%;
        background:
          radial-gradient(ellipse at 50% 58%,
            rgba(120,217,94,.20) 0 24%,
            rgba(73,170,68,.10) 42%,
            transparent 76%)!important;
        filter:blur(6px);
        opacity:.72;
      }

      /* -------- エルテナ(闇) -------- */
      .shooting-bullet.shooting-bullet-eltena.shooting-bullet-dark{
        background:
          radial-gradient(ellipse at 50% 30%,
            rgba(255,255,255,.90) 0 10%,
            rgba(244,231,255,.74) 14%,
            rgba(184,128,238,.40) 34%,
            rgba(116,60,190,.20) 56%,
            rgba(58,18,116,.09) 73%,
            transparent 84%)!important;
        box-shadow:
          0 0 8px rgba(252,248,255,.52),
          0 0 18px rgba(176,108,239,.34),
          0 0 28px rgba(103,40,182,.16)!important;
      }
      .shooting-bullet.shooting-bullet-eltena.shooting-bullet-dark::before{
        left:-4px!important; right:-4px!important;
        top:-3px!important; bottom:-8px!important;
        border-radius:50%;
        background:
          radial-gradient(ellipse at 50% 38%,
            rgba(241,229,255,.42) 0 16%,
            rgba(176,118,235,.28) 31%,
            rgba(104,48,179,.14) 52%,
            transparent 76%)!important;
        filter:blur(2.2px);
        opacity:.92;
      }
      .shooting-bullet.shooting-bullet-eltena.shooting-bullet-dark::after{
        left:-9px!important; right:-9px!important;
        top:-6px!important; bottom:-13px!important;
        border-radius:50%;
        background:
          radial-gradient(ellipse at 50% 58%,
            rgba(170,106,236,.20) 0 24%,
            rgba(99,43,173,.10) 42%,
            transparent 76%)!important;
        filter:blur(6px);
        opacity:.72;
      }
    `;
    document.head.appendChild(style);
  }


  // ============================================================
  // v202: ミアのチャージショット見た目改善
  // - ボール感を抑えて水/気弾っぽいオーラ表現へ
  // - 輪郭を柔らかくし、透明感と発光を強化
  // ============================================================
  if (!document.getElementById('shooting-mia-charge-aura-style-v202')) {
    const style = document.createElement('style');
    style.id = 'shooting-mia-charge-aura-style-v202';
    style.textContent = `
      .shooting-bullet.shooting-mia-charge-shot{
        border:0!important;
        outline:none!important;
        border-radius:50%!important;
        overflow:visible!important;
        opacity:.88!important;
        filter:saturate(1.05) blur(.2px)!important;
        animation:shootingMiaChargePulse .46s ease-in-out infinite alternate;
      }

      .shooting-bullet.shooting-mia-charge-shot::before,
      .shooting-bullet.shooting-mia-charge-shot::after{
        content:"";
        position:absolute;
        pointer-events:none;
        border:0!important;
        box-shadow:none!important;
        border-radius:50%!important;
      }

      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-aqua{
        background:
          radial-gradient(circle at 48% 34%,
            rgba(255,255,255,.96) 0 10%,
            rgba(231,249,255,.82) 16%,
            rgba(161,229,255,.46) 36%,
            rgba(75,177,242,.22) 58%,
            rgba(18,101,185,.10) 74%,
            transparent 86%)!important;
        box-shadow:
          0 0 10px rgba(249,254,255,.60),
          0 0 22px rgba(102,206,255,.38),
          0 0 36px rgba(38,138,225,.18)!important;
      }

      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-aqua::before{
        left:-8%!important;
        right:-8%!important;
        top:-8%!important;
        bottom:-14%!important;
        background:
          radial-gradient(circle at 50% 42%,
            rgba(221,248,255,.40) 0 20%,
            rgba(132,220,255,.26) 34%,
            rgba(48,163,230,.12) 56%,
            transparent 78%)!important;
        filter:blur(3px);
        opacity:.94;
      }

      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-aqua::after{
        left:-20%!important;
        right:-20%!important;
        top:-16%!important;
        bottom:-24%!important;
        background:
          radial-gradient(circle at 50% 58%,
            rgba(122,220,255,.16) 0 28%,
            rgba(50,163,232,.10) 42%,
            transparent 74%)!important;
        filter:blur(8px);
        opacity:.78;
      }

      /* もし将来属性変更しても破綻しにくい汎用ベース */
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-fire{
        background:radial-gradient(circle at 48% 34%,rgba(255,255,255,.95) 0 10%,rgba(255,233,226,.80) 16%,rgba(255,138,110,.42) 36%,rgba(232,69,47,.20) 58%,rgba(139,21,8,.08) 74%,transparent 86%)!important;
        box-shadow:0 0 10px rgba(255,250,248,.60),0 0 22px rgba(255,107,85,.34),0 0 36px rgba(213,43,27,.16)!important;
      }
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-wood{
        background:radial-gradient(circle at 48% 34%,rgba(255,255,255,.95) 0 10%,rgba(239,255,234,.80) 16%,rgba(151,232,126,.42) 36%,rgba(76,181,73,.20) 58%,rgba(23,116,32,.08) 74%,transparent 86%)!important;
        box-shadow:0 0 10px rgba(250,255,248,.60),0 0 22px rgba(108,214,92,.34),0 0 36px rgba(46,150,52,.16)!important;
      }
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-dark{
        background:radial-gradient(circle at 48% 34%,rgba(255,255,255,.95) 0 10%,rgba(245,237,255,.80) 16%,rgba(191,141,241,.42) 36%,rgba(118,66,190,.20) 58%,rgba(54,17,116,.08) 74%,transparent 86%)!important;
        box-shadow:0 0 10px rgba(252,249,255,.60),0 0 22px rgba(167,101,235,.34),0 0 36px rgba(97,39,176,.16)!important;
      }
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-light{
        background:radial-gradient(circle at 48% 34%,rgba(255,255,255,.96) 0 10%,rgba(255,251,226,.84) 16%,rgba(255,230,124,.44) 36%,rgba(237,183,43,.20) 58%,rgba(153,105,6,.08) 74%,transparent 86%)!important;
        box-shadow:0 0 10px rgba(255,255,248,.64),0 0 22px rgba(255,220,95,.36),0 0 36px rgba(225,173,24,.16)!important;
      }

      @keyframes shootingMiaChargePulse{
        from{
          filter:saturate(1.00) brightness(.98) blur(.2px);
          transform:translate(-50%,-50%) scale(calc(0.985 + var(--mia-charge-ratio, .5) * 0.02));
        }
        to{
          filter:saturate(1.08) brightness(1.05) blur(.2px);
          transform:translate(-50%,-50%) scale(calc(1.01 + var(--mia-charge-ratio, .5) * 0.03));
        }
      }
    `;
    document.head.appendChild(style);
  }


  // ============================================================
  // v203: ミアのチャージ弾 着弾エフェクトを水っぽく
  // ============================================================
  if (!document.getElementById('shooting-mia-water-hit-style-v203')) {
    const style = document.createElement('style');
    style.id = 'shooting-mia-water-hit-style-v203';
    style.textContent = `
      .shooting-mia-water-hit{
        position:absolute;
        left:0; top:0;
        width:58px; height:58px;
        z-index:34;
        pointer-events:none;
        transform:translate(-50%,-50%);
        opacity:0;
        animation:shootingMiaWaterBurst .40s ease-out forwards;
        will-change:transform,opacity,filter;
      }
      .shooting-mia-water-hit.big{
        width:84px; height:84px;
        animation-duration:.44s;
      }
      .shooting-mia-water-hit .core,
      .shooting-mia-water-hit .ripple{
        position:absolute;
        left:50%; top:50%;
        transform:translate(-50%,-50%);
        border-radius:50%;
        pointer-events:none;
      }
      .shooting-mia-water-hit .core{
        width:36%; height:36%;
        background:
          radial-gradient(circle,
            rgba(255,255,255,.96) 0 18%,
            rgba(217,247,255,.82) 25%,
            rgba(111,213,255,.40) 52%,
            rgba(48,157,231,.10) 74%,
            transparent 84%);
        box-shadow:
          0 0 10px rgba(255,255,255,.56),
          0 0 20px rgba(105,206,255,.30);
        animation:shootingMiaWaterCore .40s ease-out forwards;
      }
      .shooting-mia-water-hit .ripple{
        width:50%; height:50%;
        border:2px solid rgba(178,233,255,.78);
        box-shadow:
          0 0 10px rgba(112,213,255,.20),
          inset 0 0 8px rgba(255,255,255,.10);
        opacity:.88;
      }
      .shooting-mia-water-hit .ripple-1{
        animation:shootingMiaWaterRipple1 .40s ease-out forwards;
      }
      .shooting-mia-water-hit .ripple-2{
        width:34%; height:34%;
        border-color:rgba(226,249,255,.92);
        opacity:.76;
        animation:shootingMiaWaterRipple2 .40s ease-out forwards;
      }

      @keyframes shootingMiaWaterBurst{
        0%{
          opacity:.22;
          filter:brightness(1.05) saturate(1.00);
        }
        18%{
          opacity:1;
          filter:brightness(1.16) saturate(1.08);
        }
        100%{
          opacity:0;
          filter:brightness(.98) saturate(.94);
        }
      }
      @keyframes shootingMiaWaterCore{
        0%{transform:translate(-50%,-50%) scale(.40); opacity:.96; filter:blur(0)}
        40%{transform:translate(-50%,-50%) scale(1.02); opacity:.62; filter:blur(.2px)}
        100%{transform:translate(-50%,-50%) scale(1.22); opacity:0; filter:blur(1px)}
      }
      @keyframes shootingMiaWaterRipple1{
        0%{transform:translate(-50%,-50%) scale(.36); opacity:.92}
        55%{transform:translate(-50%,-50%) scale(1.12); opacity:.68}
        100%{transform:translate(-50%,-50%) scale(1.72); opacity:0; border-width:1px}
      }
      @keyframes shootingMiaWaterRipple2{
        0%{transform:translate(-50%,-50%) scale(.28); opacity:.86}
        40%{transform:translate(-50%,-50%) scale(.82); opacity:.54}
        100%{transform:translate(-50%,-50%) scale(1.46); opacity:0; border-width:1px}
      }
    `;
    document.head.appendChild(style);
  }


  // ============================================================
  // v204: ミア通常ショット(チャージ弾)の見た目をさらに改善
  // - ボール感を弱め、気弾/水のオーラ感を強化
  // - 発射後の軌跡を見やすくするため、常時テールを表示
  // - transformアニメをやめて、視認性重視の発光パルスへ変更
  // ============================================================
  if (!document.getElementById('shooting-mia-shot-trail-style-v204')) {
    const style = document.createElement('style');
    style.id = 'shooting-mia-shot-trail-style-v204';
    style.textContent = `
      .shooting-bullet.shooting-mia-charge-shot{
        border:0!important;
        outline:none!important;
        overflow:visible!important;
        opacity:.96!important;
        border-radius:56% 56% 46% 46% / 44% 44% 56% 56%!important;
        filter:saturate(1.10)!important;
        animation:shootingMiaChargeAuraPulse .34s ease-in-out infinite alternate!important;
        will-change:opacity,filter,box-shadow!important;
      }

      /* AQUA本体。真円を避けてコア+水気のある縦長気弾へ */
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-aqua{
        background:
          radial-gradient(ellipse at 50% 28%,
            rgba(255,255,255,.98) 0 12%,
            rgba(232,250,255,.94) 14%,
            rgba(162,229,255,.58) 34%,
            rgba(74,177,242,.28) 56%,
            rgba(23,105,194,.12) 74%,
            transparent 86%)!important;
        box-shadow:
          0 0 12px rgba(250,255,255,.72),
          0 0 26px rgba(110,211,255,.48),
          0 0 42px rgba(39,140,231,.22)!important;
      }

      /* 前方コア。輪郭線ではなく、柔らかい水の芯 */
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-aqua::before{
        content:"";
        position:absolute;
        left:18%!important;
        top:10%!important;
        width:64%!important;
        height:66%!important;
        border:0!important;
        border-radius:50% 50% 46% 46% / 38% 38% 62% 62%!important;
        background:
          radial-gradient(ellipse at 50% 22%,
            rgba(255,255,255,.98) 0 18%,
            rgba(221,248,255,.82) 26%,
            rgba(121,219,255,.34) 58%,
            transparent 82%)!important;
        filter:blur(.5px);
        opacity:.98!important;
        box-shadow:none!important;
      }

      /* 後方テール。敵に当たるまで軌道が見えるように長めの尾を常時表示 */
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-aqua::after{
        content:"";
        position:absolute;
        left:50%!important;
        top:44%!important;
        width:84%!important;
        height:168%!important;
        transform:translateX(-50%)!important;
        transform-origin:50% 0%!important;
        border:0!important;
        border-radius:48% 48% 62% 62% / 22% 22% 78% 78%!important;
        background:
          linear-gradient(to bottom,
            rgba(193,241,255,.72) 0%,
            rgba(126,221,255,.46) 22%,
            rgba(77,183,241,.28) 48%,
            rgba(36,143,225,.15) 70%,
            rgba(18,107,197,.05) 86%,
            transparent 100%)!important;
        filter:blur(4px);
        opacity:.92!important;
        box-shadow:
          0 8px 18px rgba(96,204,255,.20),
          0 18px 28px rgba(52,159,233,.10)!important;
        pointer-events:none;
      }

      /* 将来他属性になっても破綻しないよう、他属性にも最低限のテールを付与 */
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-fire::after,
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-wood::after,
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-dark::after,
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-light::after{
        content:"";
        position:absolute;
        left:50%!important;
        top:46%!important;
        width:82%!important;
        height:156%!important;
        transform:translateX(-50%)!important;
        border:0!important;
        border-radius:48% 48% 62% 62% / 22% 22% 78% 78%!important;
        filter:blur(4px);
        opacity:.88!important;
      }
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-fire::after{
        background:linear-gradient(to bottom,rgba(255,218,208,.66) 0%,rgba(255,128,97,.38) 28%,rgba(224,61,41,.18) 66%,transparent 100%)!important;
      }
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-wood::after{
        background:linear-gradient(to bottom,rgba(237,255,228,.66) 0%,rgba(145,225,120,.38) 28%,rgba(63,172,72,.18) 66%,transparent 100%)!important;
      }
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-dark::after{
        background:linear-gradient(to bottom,rgba(245,236,255,.66) 0%,rgba(181,121,239,.38) 28%,rgba(102,42,180,.18) 66%,transparent 100%)!important;
      }
      .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-light::after{
        background:linear-gradient(to bottom,rgba(255,252,230,.70) 0%,rgba(255,228,118,.42) 28%,rgba(232,185,36,.18) 66%,transparent 100%)!important;
      }

      @keyframes shootingMiaChargeAuraPulse{
        from{
          opacity:.92;
          filter:saturate(1.04) brightness(.98);
        }
        to{
          opacity:.98;
          filter:saturate(1.12) brightness(1.06);
        }
      }
    `;
    document.head.appendChild(style);
  }


  // ============================================================
  // v205: ミアのチャージ弾をさらにソフトな水オーラ表現へ
  // - 球体感をさらに削る
  // - 輪郭線 / リング感を明確に殺す
  // - 本体を半透明化し、コアと尾だけで見せる
  // ============================================================
  if (!document.getElementById('shooting-mia-shot-soft-aura-style-v205')) {
    const style = document.createElement('style');
    style.id = 'shooting-mia-shot-soft-aura-style-v205';
    style.textContent = `
      /* 本体は極力透明にして、ボール感の原因を消す */
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot,
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-aqua{
        background:transparent!important;
        border:0!important;
        outline:none!important;
        box-shadow:none!important;
        opacity:1!important;
        overflow:visible!important;
        border-radius:48% 48% 56% 56% / 24% 24% 76% 76%!important;
        filter:none!important;
        animation:none!important;
      }

      /* generic aqua装飾の輪郭/外周リングを完全に上書き */
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot::before,
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot::after,
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-aqua::before,
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-aqua::after{
        content:"";
        position:absolute;
        pointer-events:none;
        border:0!important;
        outline:none!important;
        box-shadow:none!important;
      }

      /* 水の芯。小さめ・上寄り・輪郭なし */
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-aqua::before{
        left:23%!important;
        top:7%!important;
        width:54%!important;
        height:54%!important;
        border-radius:50% 50% 46% 46% / 36% 36% 64% 64%!important;
        background:
          radial-gradient(ellipse at 50% 24%,
            rgba(255,255,255,.98) 0 20%,
            rgba(232,250,255,.92) 25%,
            rgba(169,232,255,.55) 47%,
            rgba(86,189,245,.20) 68%,
            rgba(32,122,214,.04) 80%,
            transparent 100%)!important;
        filter:blur(.65px)!important;
        opacity:.96!important;
      }

      /* 長い水オーラの尾。これを主役にして軌道を見せる */
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-aqua::after{
        left:50%!important;
        top:22%!important;
        width:108%!important;
        height:250%!important;
        transform:translateX(-50%)!important;
        transform-origin:50% 0%!important;
        border-radius:44% 44% 68% 68% / 10% 10% 90% 90%!important;
        background:
          linear-gradient(to bottom,
            rgba(244,253,255,.92) 0%,
            rgba(197,241,255,.72) 10%,
            rgba(129,220,255,.44) 28%,
            rgba(74,181,242,.24) 52%,
            rgba(36,144,229,.11) 74%,
            rgba(17,106,198,.03) 88%,
            transparent 100%)!important;
        filter:blur(6px)!important;
        opacity:.90!important;
      }

      /* 補助オーラ。尾の周囲に薄い霧感を足す */
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-aqua{
        box-shadow:
          0 -4px 10px rgba(243,252,255,.34),
          0 6px 22px rgba(123,216,255,.24),
          0 18px 34px rgba(58,165,235,.12)!important;
      }

      /* 他属性に将来変わってもリング感を消した状態を維持 */
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-fire,
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-wood,
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-dark,
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-light{
        background:transparent!important;
        border:0!important;
        outline:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // build568: 闇属性カラーをロイヤルバイオレットへ統一
  // - 黒を廃止し、青や赤へ寄らない中間的な紫を基準色にする
  // - 通常ショット / 特殊ショット / レーザー / ULTを同系色へ統一
  // - 形状・当たり判定・性能は変更しない
  // ============================================================
  if (!document.getElementById('shooting-dark-element-violet-style-v569')) {
    const darkStyle = document.createElement('style');
    darkStyle.id = 'shooting-dark-element-violet-style-v569';
    darkStyle.textContent = `
      /* DARK: royal violet / blue・redとの差を明確化 */
      #shooting-arena .shooting-bullet.shooting-bullet-dark{
        background:
          radial-gradient(circle at 38% 34%,
            rgba(255,255,255,.96) 0 8%,
            rgba(224,209,238,.90) 15%,
            rgba(167,123,208,.92) 34%,
            rgba(126,80,168,.98) 62%,
            rgba(75,42,106,.86) 100%)!important;
        border-color:rgba(126,80,168,.94)!important;
        box-shadow:
          0 0 6px rgba(245,238,252,.62),
          0 0 13px rgba(126,80,168,.76),
          0 0 24px rgba(75,42,106,.52)!important;
        filter:saturate(.94) contrast(1.04)!important;
      }

      #shooting-arena .shooting-bullet.shooting-bullet-dark::before{
        border-color:rgba(151,105,194,.90)!important;
        box-shadow:0 0 8px rgba(103,59,144,.68)!important;
      }

      #shooting-arena .shooting-bullet.shooting-bullet-dark::after{
        background:
          radial-gradient(circle,
            rgba(159,116,199,.30),
            rgba(91,53,127,.20) 46%,
            transparent 72%)!important;
      }

      /* 闇属性レーザー */
      #shooting-arena .shooting-ignis-laser.shooting-bullet-dark i{
        background:
          linear-gradient(90deg,
            rgba(75,42,106,.08),
            #8054ae,
            #e7dcf1 48%,
            #8054ae,
            rgba(75,42,106,.08))!important;
        box-shadow:
          0 0 7px rgba(211,191,229,.58),
          0 0 16px rgba(97,57,137,.70)!important;
      }

      #shooting-arena .shooting-ignis-laser.shooting-bullet-dark b{
        background:#e7dcf1!important;
        box-shadow:0 0 10px rgba(126,80,168,.76)!important;
      }

      /* エルテナ等のオーラ型闇弾 */
      #shooting-arena .shooting-bullet.shooting-bullet-eltena.shooting-bullet-dark{
        background:
          radial-gradient(ellipse at 50% 30%,
            rgba(248,244,252,.90) 0 10%,
            rgba(218,199,235,.70) 16%,
            rgba(164,120,204,.48) 34%,
            rgba(116,72,158,.30) 55%,
            rgba(75,42,106,.14) 72%,
            transparent 84%)!important;
        box-shadow:
          0 0 8px rgba(239,230,247,.38),
          0 0 18px rgba(126,80,168,.46),
          0 0 28px rgba(75,42,106,.26)!important;
      }

      #shooting-arena .shooting-bullet.shooting-bullet-eltena.shooting-bullet-dark::before{
        background:
          radial-gradient(ellipse at 50% 38%,
            rgba(218,199,235,.38) 0 16%,
            rgba(151,105,194,.30) 31%,
            rgba(91,53,127,.20) 52%,
            transparent 76%)!important;
      }

      #shooting-arena .shooting-bullet.shooting-bullet-eltena.shooting-bullet-dark::after{
        background:
          radial-gradient(ellipse at 50% 58%,
            rgba(139,94,181,.24) 0 24%,
            rgba(75,42,106,.16) 42%,
            transparent 76%)!important;
      }

      /* チャージ型が闇属性になった場合も同じ紫系へ */
      #shooting-arena .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-dark::before{
        background:
          radial-gradient(ellipse at 50% 24%,
            rgba(247,242,251,.94) 0 18%,
            rgba(205,181,226,.68) 25%,
            rgba(146,99,190,.46) 47%,
            rgba(91,53,127,.28) 68%,
            transparent 100%)!important;
      }

      #shooting-arena .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-dark::after{
        background:
          linear-gradient(to bottom,
            rgba(185,149,216,.58) 0%,
            rgba(126,80,168,.42) 28%,
            rgba(75,42,106,.26) 66%,
            transparent 100%)!important;
      }

      #shooting-arena .shooting-bullet.shooting-mia-charge-shot.shooting-bullet-dark{
        box-shadow:
          0 -4px 10px rgba(220,203,235,.24),
          0 7px 22px rgba(103,59,144,.36),
          0 18px 34px rgba(75,42,106,.24)!important;
      }
    `;
    document.head.appendChild(darkStyle);
  }


  // ------------------------------------------------------------
  // build766: Black hole visual tuning
  // - 境界線をぼかし、時空に開いた穴のような柔らかい見た目へ寄せる。
  // - トイフェル/エルテナ系のブラックホール演出を共通で調整する。
  // ------------------------------------------------------------
  if (!document.getElementById('shooting-black-hole-style-v206')) {
    const style = document.createElement('style');
    style.id = 'shooting-black-hole-style-v206';
    style.textContent = `
      #shooting-arena .shooting-eltena-black-hole{
        position:absolute;
        left:0; top:0;
        width:var(--eltena-bh-size,154px);
        height:var(--eltena-bh-size,154px);
        margin:0;
        pointer-events:none;
        border-radius:50%;
        overflow:visible;
        isolation:isolate;
        opacity:.95;
        filter:saturate(.86) brightness(.96);
        will-change:transform,opacity,filter;
      }
      #shooting-arena .shooting-eltena-black-hole::before,
      #shooting-arena .shooting-eltena-black-hole::after,
      #shooting-arena .shooting-eltena-black-hole > i,
      #shooting-arena .shooting-eltena-black-hole > b,
      #shooting-arena .shooting-eltena-black-hole > span{
        content:"";
        position:absolute;
        inset:0;
        border-radius:50%;
        pointer-events:none;
        display:block;
      }
      #shooting-arena .shooting-eltena-black-hole::before{
        inset:-18%;
        background:
          radial-gradient(circle at 50% 50%,
            rgba(0,0,0,.98) 0 15%,
            rgba(4,5,10,.96) 18%,
            rgba(13,10,26,.88) 26%,
            rgba(34,21,58,.58) 38%,
            rgba(72,52,118,.25) 50%,
            rgba(157,203,255,.10) 61%,
            rgba(255,255,255,.035) 68%,
            rgba(255,255,255,0) 100%);
        filter:blur(13px);
        transform:scale(.96);
        opacity:.98;
      }
      #shooting-arena .shooting-eltena-black-hole::after{
        inset:-6%;
        background:
          radial-gradient(circle at 50% 50%,
            rgba(0,0,0,0) 0 27%,
            rgba(235,239,255,.08) 39%,
            rgba(181,205,255,.12) 45%,
            rgba(128,110,212,.10) 52%,
            rgba(255,255,255,0) 67%);
        filter:blur(9px);
        opacity:.72;
        animation:shootingBlackHoleHaloPulse 2.6s ease-in-out infinite;
      }
      #shooting-arena .shooting-eltena-black-hole > i{
        inset:8%;
        background:
          radial-gradient(circle at 50% 50%,
            rgba(0,0,0,1) 0 28%,
            rgba(8,8,16,.98) 35%,
            rgba(23,17,40,.56) 46%,
            rgba(255,255,255,0) 68%);
        filter:blur(5px);
        opacity:.98;
      }
      #shooting-arena .shooting-eltena-black-hole > b{
        inset:18%;
        border:1px solid rgba(230,235,255,.10);
        box-shadow:
          0 0 20px rgba(125,140,230,.14),
          inset 0 0 18px rgba(255,255,255,.05);
        filter:blur(3px);
        opacity:.58;
        animation:shootingBlackHoleInnerSpin 3.4s linear infinite;
      }
      #shooting-arena .shooting-eltena-black-hole > span{
        inset:-7%;
        background:
          conic-gradient(from 0deg,
            rgba(255,255,255,0) 0deg,
            rgba(183,186,255,.07) 48deg,
            rgba(113,85,190,.10) 112deg,
            rgba(255,255,255,0) 176deg,
            rgba(199,218,255,.08) 238deg,
            rgba(255,255,255,0) 360deg);
        filter:blur(8px);
        mix-blend-mode:screen;
        opacity:.46;
        animation:shootingBlackHoleSwirl 4.8s linear infinite;
      }
      #shooting-arena .shooting-eltena-black-hole.traveling{
        opacity:.82;
      }
      #shooting-arena .shooting-eltena-black-hole.traveling::before{
        filter:blur(11px);
        transform:scale(.82);
      }
      #shooting-arena .shooting-eltena-black-hole.traveling > span{
        opacity:.28;
      }
      #shooting-arena .shooting-eltena-black-hole.active{
        animation:shootingBlackHoleBreath 2.9s ease-in-out infinite;
      }
      #shooting-arena .shooting-eltena-black-hole.ending{
        opacity:0 !important;
        transform:translate(-50%,-50%) scale(.72) !important;
        transition:opacity .32s ease, transform .32s ease;
      }
      #shooting-arena .shooting-toyfel-black-hole{
        filter:saturate(.82) brightness(.92);
      }
      @keyframes shootingBlackHoleHaloPulse {
        0%,100% { transform:scale(.96); opacity:.58; }
        50% { transform:scale(1.05); opacity:.82; }
      }
      @keyframes shootingBlackHoleInnerSpin {
        from { transform:rotate(0deg) scale(1); }
        to   { transform:rotate(360deg) scale(1.02); }
      }
      @keyframes shootingBlackHoleSwirl {
        from { transform:rotate(0deg) scale(1); }
        to   { transform:rotate(-360deg) scale(1.04); }
      }
      @keyframes shootingBlackHoleBreath {
        0%,100% { filter:saturate(.84) brightness(.95); }
        50% { filter:saturate(.90) brightness(.99); }
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // build768: STAGE IN アイキャッチ
  // ============================================================
  // build771: STAGE INFO / RESULT EXIT TRANSITION
  // アイキャッチ後に白背景のステージ情報を表示し、
  // RESULTから戻る時は1秒かけて白へフェードする。
  // ============================================================
  // build772: ステージタイトルは一文字ずつゆっくり現れる。
  const SHOOTING_STAGE_INFO_CHAR_STAGGER_MS = 70;
  const SHOOTING_STAGE_INFO_CHAR_FADE_MS = 480;
  const SHOOTING_STAGE_INFO_LINE_GAP_MS = 260;
  const SHOOTING_STAGE_INFO_HOLD_MS = 900;
  const SHOOTING_STAGE_INFO_FADE_MS = 650;
  const SHOOTING_STAGE_MASK_RELEASE_MS = 320;
  const SHOOTING_RESULT_EXIT_FADE_MS = 1000;
  let shootingResultExitFadeRunning = false;

  function waitShootingTransition(ms) {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms || 0))));
  }

  function ensureShootingStageTransitionMask() {
    let mask = document.getElementById('shooting-stage-transition-mask');
    if (mask) return mask;
    mask = document.createElement('div');
    mask.id = 'shooting-stage-transition-mask';
    mask.setAttribute('aria-hidden', 'true');
    document.body.appendChild(mask);
    return mask;
  }

  function beginShootingStageTransitionMask() {
    const mask = ensureShootingStageTransitionMask();
    mask.classList.remove('is-releasing');
    mask.style.display = 'block';
    mask.style.opacity = '1';
    mask.setAttribute('aria-hidden', 'false');
    void mask.offsetWidth;
  }

  async function endShootingStageTransitionMask() {
    const mask = ensureShootingStageTransitionMask();
    mask.classList.add('is-releasing');
    await waitShootingTransition(SHOOTING_STAGE_MASK_RELEASE_MS);
    clearShootingStageTransitionMask();
  }

  function clearShootingStageTransitionMask() {
    const mask = document.getElementById('shooting-stage-transition-mask');
    if (!mask) return;
    mask.classList.remove('is-releasing');
    mask.style.display = 'none';
    mask.style.opacity = '0';
    mask.setAttribute('aria-hidden', 'true');
  }

  function renderShootingStageInfoCharacters(el, text, baseDelayMs = 0) {
    if (!el) return 0;
    el.textContent = '';
    el.setAttribute('aria-label', text);
    const normalizedText = String(text || '');
    // build845: STAGE INFO typography is canonical across every stage/language.
    // Never branch font sizing/spacing by Japanese/English content.
    el.classList.remove('is-japanese');
    const chars = Array.from(normalizedText);
    chars.forEach((ch, index) => {
      const span = document.createElement('span');
      span.className = 'shooting-stage-info-char';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.style.setProperty('--stage-char-delay', `${baseDelayMs + index * SHOOTING_STAGE_INFO_CHAR_STAGGER_MS}ms`);
      el.appendChild(span);
    });
    return baseDelayMs + Math.max(0, chars.length - 1) * SHOOTING_STAGE_INFO_CHAR_STAGGER_MS + SHOOTING_STAGE_INFO_CHAR_FADE_MS;
  }

  function formatShootingStageInfoStageName(name, fallbackDifficulty = '') {
    const raw = String(name || '').trim();
    if (!raw) return '';
    const difficulty = String(fallbackDifficulty || '').trim();
    const splitMatch = raw.match(/^(.*?)[・\-－—–]\s*(.+)$/u);
    if (splitMatch) {
      const base = String(splitMatch[1] || '').trim();
      const diff = String(splitMatch[2] || '').trim();
      if (base && diff) return `${base}(${diff})`;
    }
    if (difficulty && !raw.includes(`(${difficulty})`)) {
      return `${raw}(${difficulty})`;
    }
    return raw;
  }

  const SHOOTING_STAGE_INFO_WEEKDAY = Object.freeze({
    Mon: '月曜',
    Tue: '火曜',
    Wed: '水曜',
    Thu: '木曜',
    Fri: '金曜',
    Sat: '土曜',
    Sun: '日曜',
  });

  function getShootingStageInfoDifficulty(stage = selectedStage) {
    if (!stage) return '';
    const explicit = String(stage.difficultyLabel || '').trim();
    if (explicit) return explicit;
    const dailyLevel = String(stage.dailyQuest?.level || '').trim().toLowerCase();
    if (dailyLevel === 'intermediate') return '中級';
    if (dailyLevel === 'advanced') return '上級';
    if (dailyLevel === 'super') return '最上級';
    return '';
  }

  function getShootingStageInfoBossName(stage = selectedStage) {
    if (!stage) return 'BOSS';
    const explicit = String(stage.stageInfoBossName || stage.bossDisplayName || '').trim();
    if (explicit) return explicit;

    const ids = Array.isArray(stage.enemyIds) ? stage.enemyIds : [];
    for (const enemyId of ids) {
      try {
        const def = window.ShootingEnemies && typeof window.ShootingEnemies.getShootingEnemy === 'function'
          ? window.ShootingEnemies.getShootingEnemy(enemyId)
          : null;
        if (def && String(def.name || '').trim()) return String(def.name).trim();
      } catch (_) {}
    }
    return String(stage.eventTitle || stage.name || 'BOSS').trim() || 'BOSS';
  }

  function getShootingSpecialStageInfoName(stage = selectedStage) {
    if (!stage) return 'STAGE';
    return String(stage.stageInfoName || stage.eventTitle || stage.name || getShootingStageInfoBossName(stage) || 'STAGE').trim();
  }

  function getShootingStageInfoLines() {
    const stage = selectedStage || {};
    const chapter = Math.max(0, Math.floor(Number(stage.chapter || 0)));
    const stageNo = Math.max(0, Math.floor(Number(stage.stageNo || 0)));

    // STORY
    if (chapter > 0 && stageNo > 0) {
      return [
        `CHAPTER ${String(chapter).padStart(2, '0')}`,
        `STAGE ${String(stageNo).padStart(2, '0')}`
      ];
    }

    const stageId = String(stage.id || '').toLowerCase();
    const difficulty = getShootingStageInfoDifficulty(stage);

    // DAILY PROC.
    if (stage.dailyQuest || stageId.includes('shooting_daily_')) {
      const weekdayKey = String(stage.dailyQuest?.weekday || '').trim();
      const weekday = SHOOTING_STAGE_INFO_WEEKDAY[weekdayKey] || String(stage.stageInfoWeekday || '').trim() || '曜日';
      return ['DAILY PROC.', `${weekday}${difficulty ? `(${difficulty})` : ''}`];
    }

    // SCORE ATTACK
    if (stage.scoreAttack || stageId.includes('score_attack')) {
      const bossName = getShootingStageInfoBossName(stage);
      return ['SCORE ATTACK', `${bossName}${difficulty ? `(${difficulty})` : ''}`];
    }

    // RAID BATTLE
    if (stage.raid || stageId.includes('raid')) {
      return ['RAID BATTLE', getShootingStageInfoBossName(stage)];
    }

    // SPECIAL PROC.  STORY / DAILY / SCORE / RAID 以外の巡行系はここへ統一。
    const specialName = getShootingSpecialStageInfoName(stage);
    return ['SPECIAL PROC.', `${specialName}${difficulty ? `(${difficulty})` : ''}`];
  }

  function ensureShootingStageInfoOverlay() {
    let overlay = document.getElementById('shooting-stage-info');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'shooting-stage-info';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="shooting-stage-info-copy" aria-hidden="true">
        <div class="shooting-stage-info-line line-1"></div>
        <div class="shooting-stage-info-line line-2"></div>
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  async function showShootingStageInfo() {
    const overlay = ensureShootingStageInfoOverlay();
    const [line1, line2] = getShootingStageInfoLines();
    const line1El = overlay.querySelector('.line-1');
    const line2El = overlay.querySelector('.line-2');
    if (!line1El || !line2El) return;

    // CHAPTERを先に、STAGEは少し余韻を置いて追いかける。
    const line1End = renderShootingStageInfoCharacters(line1El, line1, 120);
    const line2BaseDelay = Math.max(720, line1End - SHOOTING_STAGE_INFO_CHAR_FADE_MS + SHOOTING_STAGE_INFO_LINE_GAP_MS);
    const line2End = renderShootingStageInfoCharacters(line2El, line2, line2BaseDelay);
    const revealEnd = Math.max(line1End, line2End);

    overlay.classList.remove('is-revealing', 'is-fading');
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
    void overlay.offsetWidth;
    overlay.classList.add('is-revealing');

    await waitShootingTransition(revealEnd + SHOOTING_STAGE_INFO_HOLD_MS);
    overlay.classList.add('is-fading');
    await waitShootingTransition(SHOOTING_STAGE_INFO_FADE_MS);
    overlay.classList.remove('is-visible', 'is-revealing', 'is-fading');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function ensureShootingResultExitFade() {
    let overlay = document.getElementById('shooting-result-exit-fade');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'shooting-result-exit-fade';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
    return overlay;
  }

  async function playShootingResultExitFade() {
    shootingResultExitFadeRunning = true;
    const overlay = ensureShootingResultExitFade();
    overlay.classList.remove('is-visible');
    overlay.style.display = 'block';
    overlay.setAttribute('aria-hidden', 'false');
    void overlay.offsetWidth;
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
    await waitShootingTransition(SHOOTING_RESULT_EXIT_FADE_MS);
  }

  function clearShootingResultExitFade() {
    const overlay = document.getElementById('shooting-result-exit-fade');
    if (overlay) {
      overlay.classList.remove('is-visible');
      overlay.style.display = 'none';
      overlay.setAttribute('aria-hidden', 'true');
    }
    shootingResultExitFadeRunning = false;
  }

  if (!document.getElementById('shooting-stage-info-style-v845')) {
    const style = document.createElement('style');
    style.id = 'shooting-stage-info-style-v845';
    style.textContent = `
      #shooting-stage-transition-mask{
        position:fixed;
        inset:0;
        z-index:519800;
        display:none;
        background:#fff;
        opacity:0;
        pointer-events:none;
        transition:opacity ${SHOOTING_STAGE_MASK_RELEASE_MS}ms cubic-bezier(.4,0,.2,1);
      }
      #shooting-stage-transition-mask.is-releasing{opacity:0!important;}
      #shooting-stage-info{
        position:fixed;
        inset:0;
        z-index:519900;
        display:none;
        align-items:center;
        justify-content:center;
        background:#fff;
        opacity:1;
        pointer-events:none;
        user-select:none;
        -webkit-user-select:none;
      }
      #shooting-stage-info.is-visible{display:flex;}
      #shooting-stage-info.is-fading{
        opacity:0;
        transition:opacity ${SHOOTING_STAGE_INFO_FADE_MS}ms cubic-bezier(.4,0,.2,1);
      }
      #shooting-stage-info .shooting-stage-info-copy{
        width:min(78vw,420px);
        display:flex;
        flex-direction:column;
        align-items:flex-start;
        gap:15px;
      }
      #shooting-stage-info .shooting-stage-info-line{
        display:flex;
        align-items:baseline;
        max-width:100%;
        color:#746d64;
        font-family:"Noto Serif JP","Yu Mincho","YuMincho","Hiragino Mincho ProN","Times New Roman",serif;
        font-size:clamp(22px,6.2vw,36px);
        font-weight:400;
        line-height:1.12;
        letter-spacing:.15em;
        white-space:nowrap;
        font-variant-numeric:lining-nums tabular-nums;
      }
      #shooting-stage-info .shooting-stage-info-line.line-1,
      #shooting-stage-info .shooting-stage-info-line.line-2{
        font-family:"Noto Serif JP","Yu Mincho","YuMincho","Hiragino Mincho ProN","Times New Roman",serif;
        font-size:clamp(22px,6.2vw,36px);
        font-weight:400;
        line-height:1.12;
        letter-spacing:.15em;
      }
      #shooting-stage-info .shooting-stage-info-line.line-2{
        color:#967b60;
      }
      #shooting-stage-info .shooting-stage-info-char{
        display:inline-block;
        opacity:0;
        transform:translateX(-6px);
        filter:blur(.8px);
      }
      #shooting-stage-info.is-revealing .shooting-stage-info-char{
        animation:shootingStageInfoCharReveal ${SHOOTING_STAGE_INFO_CHAR_FADE_MS}ms cubic-bezier(.18,.72,.24,1) forwards;
        animation-delay:var(--stage-char-delay,0ms);
      }
      #shooting-result-exit-fade{
        position:fixed;
        inset:0;
        z-index:530000;
        display:none;
        background:#fff;
        opacity:0;
        pointer-events:none;
        transition:opacity ${SHOOTING_RESULT_EXIT_FADE_MS}ms ease;
      }
      #shooting-result-exit-fade.is-visible{opacity:1;}
      @keyframes shootingStageInfoCharReveal{
        0%{opacity:0;transform:translateX(-6px);filter:blur(.8px);}
        42%{opacity:.48;filter:blur(.35px);}
        100%{opacity:1;transform:translateX(0);filter:blur(0);}
      }
      @media (max-width:390px){
        #shooting-stage-info .shooting-stage-info-copy{width:76vw;gap:10px;}
        #shooting-stage-info .shooting-stage-info-line,
        #shooting-stage-info .shooting-stage-info-line.line-1,
        #shooting-stage-info .shooting-stage-info-line.line-2{
          font-size:clamp(20px,6vw,30px);
          letter-spacing:.12em;
          line-height:1.12;
        }
      }
      @media (prefers-reduced-motion:reduce){
        #shooting-stage-info .shooting-stage-info-char{
          opacity:1!important;
          transform:none!important;
          filter:none!important;
          animation:none!important;
        }
        #shooting-stage-transition-mask,
        #shooting-stage-info.is-fading,
        #shooting-result-exit-fade{transition:none!important;}
      }
    `;
    document.head.appendChild(style);
  }

  // build778: アイキャッチ一覧は manifest 方式へ変更。
  // 静的サイトでは「次の連番画像が存在するか」を自動判定するためには
  // 存在しないURLへ実際にリクエストする必要があり、終端で404が必ず発生する。
  // そのため images/icatch_manifest.json を唯一の一覧ソースにして、404探索を廃止する。
  // 今後は画像追加時に manifest の files へファイル名を1行追加するだけでよい。
  // HTML / JS / build番号の更新は不要。
  // ============================================================
  const SHOOTING_ICATCH_MANIFEST = 'images/icatch_manifest.json';
  const SHOOTING_ICATCH_FALLBACK_PATHS = Object.freeze([
    'images/icatch_01.webp',
    'images/icatch_02.webp',
    'images/icatch_03.webp',
    'images/icatch_04.webp',
    'images/icatch_05.webp',
    'images/icatch_06.webp',
    'images/icatch_07.webp',
    'images/icatch_08.webp',
    'images/icatch_09.webp',
    'images/icatch_10.webp',
    'images/icatch_11.webp',
    'images/icatch_12.webp',
    'images/icatch_13.webp',
    'images/icatch_14.webp',
    'images/icatch_15.webp',
    'images/icatch_16.webp',
    'images/icatch_17.webp',
    'images/icatch_18.webp',
    'images/icatch_19.webp'
  ]);
  const SHOOTING_ICATCH_LOGO = 'images/icatch_logo.webp';
  const SHOOTING_ICATCH_FADE_IN_MS = 1000;
  const SHOOTING_ICATCH_HOLD_MS = 2000;
  const SHOOTING_ICATCH_FADE_OUT_MS = 1000;
  const SHOOTING_ICATCH_MANIFEST_REFRESH_MS = 5000;
  let lastShootingIcatchPath = '';
  let shootingIcatchDiscoveryPromise = null;
  let shootingIcatchManifestFetchedAt = 0;

  function normalizeShootingIcatchManifestPath(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const name = raw.replace(/^\.\//, '').replace(/^images\//, '');
    // icatch_XX.webp 形式だけを許可。ロゴ等の誤混入を防ぐ。
    if (!/^icatch_\d{2,3}\.webp$/i.test(name)) return '';
    return `images/${name}`;
  }

  function preloadIcatchImage(src, timeoutMs = 1200) {
    return new Promise(resolve => {
      const img = new Image();
      let settled = false;
      const done = ok => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(ok ? src : '');
      };
      const timer = setTimeout(() => done(false), timeoutMs);
      img.onload = () => done(true);
      img.onerror = () => done(false);
      img.src = src;
      if (img.complete && img.naturalWidth > 0) done(true);
    });
  }

  async function discoverShootingIcatchPaths() {
    try {
      const sep = SHOOTING_ICATCH_MANIFEST.includes('?') ? '&' : '?';
      const url = `${SHOOTING_ICATCH_MANIFEST}${sep}t=${Date.now().toString(36)}`;
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);

      const data = await response.json();
      const source = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.files) ? data.files : []);
      const paths = source
        .map(normalizeShootingIcatchManifestPath)
        .filter(Boolean)
        .filter((path, index, list) => list.indexOf(path) === index);

      if (paths.length) return paths;
      throw new Error('manifest has no valid icatch files');
    } catch (err) {
      console.warn('[shooting] icatch manifest fallback:', err);
      return SHOOTING_ICATCH_FALLBACK_PATHS.slice();
    }
  }

  function getShootingIcatchPaths() {
    const now = Date.now();
    if (!shootingIcatchDiscoveryPromise || now - shootingIcatchManifestFetchedAt >= SHOOTING_ICATCH_MANIFEST_REFRESH_MS) {
      shootingIcatchManifestFetchedAt = now;
      shootingIcatchDiscoveryPromise = discoverShootingIcatchPaths().catch(err => {
        console.warn('[shooting] icatch discovery failed:', err);
        return SHOOTING_ICATCH_FALLBACK_PATHS.slice();
      });
    }
    return shootingIcatchDiscoveryPromise;
  }

  function shuffleShootingIcatchPaths(paths) {
    const list = Array.isArray(paths) ? paths.slice() : [];
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    if (list.length > 1 && list[0] === lastShootingIcatchPath) {
      const swapIndex = list.findIndex((path, index) => index > 0 && path !== lastShootingIcatchPath);
      if (swapIndex > 0) [list[0], list[swapIndex]] = [list[swapIndex], list[0]];
    }
    return list;
  }

  async function resolveShootingIcatchPath() {
    const discovered = await getShootingIcatchPaths();
    const candidates = shuffleShootingIcatchPaths(discovered);
    for (const src of candidates) {
      const loaded = await preloadIcatchImage(src);
      if (loaded) {
        lastShootingIcatchPath = loaded;
        return loaded;
      }
    }
    return '';
  }

  function ensureShootingIcatchOverlay() {
    let overlay = document.getElementById('shooting-stage-icatch');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'shooting-stage-icatch';
    overlay.className = 'shooting-stage-icatch';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <img class="shooting-stage-icatch-art" alt="" draggable="false">
      <div class="shooting-stage-icatch-logo-wrap" aria-hidden="true">
        <span class="shooting-stage-icatch-logo-haze"></span>
        <img class="shooting-stage-icatch-logo" src="${SHOOTING_ICATCH_LOGO}" alt="ZERAPHIA" draggable="false">
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  async function showShootingStageIcatch() {
    try {
      const src = await resolveShootingIcatchPath();
      if (!src) return;

      const overlay = ensureShootingIcatchOverlay();
      const art = overlay.querySelector('.shooting-stage-icatch-art');
      if (!art) return;

      art.src = src;
      overlay.classList.remove('is-entered', 'is-fading');
      overlay.classList.add('is-visible');
      overlay.setAttribute('aria-hidden', 'false');

      // display:block / opacity:0 を1フレーム確定させてから1秒でフェードイン。
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      overlay.classList.add('is-entered');
      await new Promise(resolve => setTimeout(resolve, SHOOTING_ICATCH_FADE_IN_MS));

      // 完全表示状態を2秒維持。
      await new Promise(resolve => setTimeout(resolve, SHOOTING_ICATCH_HOLD_MS));

      // 1秒でフェードアウトしてからステージを開始。
      overlay.classList.remove('is-entered');
      overlay.classList.add('is-fading');
      await new Promise(resolve => setTimeout(resolve, SHOOTING_ICATCH_FADE_OUT_MS));

      overlay.classList.remove('is-visible', 'is-fading');
      overlay.setAttribute('aria-hidden', 'true');
    } catch (err) {
      console.warn('[shooting] stage icatch skipped:', err);
    }
  }

  if (!document.getElementById('shooting-stage-icatch-style-v770')) {
    const style = document.createElement('style');
    style.id = 'shooting-stage-icatch-style-v770';
    style.textContent = `
      #shooting-stage-icatch{
        position:fixed;
        inset:0;
        z-index:520000;
        display:none;
        overflow:hidden;
        background:#f8f5ef;
        opacity:0;
        pointer-events:none;
        user-select:none;
        -webkit-user-select:none;
      }
      #shooting-stage-icatch.is-visible{
        display:block;
        opacity:0;
      }
      #shooting-stage-icatch.is-visible.is-entered{
        opacity:1;
        transition:opacity ${SHOOTING_ICATCH_FADE_IN_MS}ms ease;
      }
      #shooting-stage-icatch.is-visible.is-fading{
        opacity:0;
        transition:opacity ${SHOOTING_ICATCH_FADE_OUT_MS}ms ease;
      }
      #shooting-stage-icatch .shooting-stage-icatch-art{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        object-fit:cover;
        object-position:center center;
        display:block;
      }
      #shooting-stage-icatch .shooting-stage-icatch-logo-wrap{
        position:absolute;
        right:max(18px,env(safe-area-inset-right));
        bottom:max(22px,calc(env(safe-area-inset-bottom) + 12px));
        width:clamp(150px,44vw,260px);
        pointer-events:none;
      }
      #shooting-stage-icatch .shooting-stage-icatch-logo-haze{
        position:absolute;
        left:50%;
        top:50%;
        width:122%;
        height:170%;
        transform:translate(-50%,-50%);
        border-radius:999px;
        background:radial-gradient(ellipse at center,
          rgba(255,255,255,.92) 0%,
          rgba(255,255,255,.78) 34%,
          rgba(255,255,255,.42) 58%,
          rgba(255,255,255,.14) 76%,
          rgba(255,255,255,0) 100%);
        filter:blur(16px);
        opacity:.90;
      }
      #shooting-stage-icatch .shooting-stage-icatch-logo{
        position:relative;
        width:100%;
        height:auto;
        display:block;
        opacity:.88;
        mix-blend-mode:multiply;
        filter:contrast(1.04) drop-shadow(0 0 10px rgba(255,255,255,.55));
      }
      @media (max-width:375px){
        #shooting-stage-icatch .shooting-stage-icatch-logo-wrap{
          right:max(14px,env(safe-area-inset-right));
          bottom:max(18px,calc(env(safe-area-inset-bottom) + 10px));
          width:clamp(138px,45vw,172px);
        }
        #shooting-stage-icatch .shooting-stage-icatch-logo-haze{
          width:128%;
          height:178%;
          filter:blur(14px);
        }
      }
      @media (prefers-reduced-motion:reduce){
        #shooting-stage-icatch.is-visible.is-entered,
        #shooting-stage-icatch.is-visible.is-fading{transition:none;}
      }
    `;
    document.head.appendChild(style);
  }


})();
