// ZERAPHIA STORY SCENARIO — CHAPTER 01-06
// Latest organized scenario.
// Conventions:
//   - location: background image filename (e.g. "scene_workbench.webp")
//   - narration: true only for speakerless narration/help text
//   - left/right: explicit character panel positions; when either exists, auto placement is disabled
(function(){
  'use strict';
  window.ZERAPHIA_STORY_SCENARIO = Object.freeze(
{
  "shooting_ch01_01": {
    "chapter": 1,
    "stageNo": 1,
    "chapterTitle": "白の戦線",
    "stageTitle": "戦線",
    "pre": [
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "灰の舞う白い空。崩れた塔の影。",
        "location": "scene_outside_tower_enemy.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "left": "アウラ",
        "right": "エリ",
        "text": "エリ、後ろ！",
        "location": "scene_outside_tower_enemy.webp"
      },
      {
        "speaker": "エリ",
        "left": "アウラ",
        "right": "エリ",
        "text": "…っ！",
        "location": "scene_outside_tower_enemy.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "目玉のついた無機質な物体が後ろから近づいてくる。",
        "location": "scene_outside_tower_enemy.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "left": "アウラ",
        "right": "エリ",
        "text": "とにかく距離をとって、避けて！\n当たんなきゃ平気だから！",
        "location": "scene_outside_tower_enemy.webp"
      },
      {
        "speaker": "アウラ",
        "left": "アウラ",
        "right": "エリ",
        "text": "エリ、くるよ！",
        "location": "scene_outside_tower_enemy.webp"
      },
      {
        "speaker": "エリ",
        "left": "アウラ",
        "right": "エリ",
        "text": "う、うん！",
        "location": "scene_outside_tower_enemy.webp"
      }
    ],
    "combat": [
      {
        "cue": "intro_aura",
        "speaker": "アウラ",
        "text": "エリ！そっちよろしくね！",
        "location": "scene_outside_tower_enemy.webp"
      },
      {
        "cue": "intro_help",
        "speaker": "",
        "text": "画面をタップして、\n敵の攻撃を避けながら、敵を撃ちましょう。",
        "location": "scene_outside_tower_enemy.webp",
        "narration": true
      },
      {
        "cue": "after_first",
        "speaker": "アウラ",
        "text": "そうそう！\nずいぶん慣れてきたね。\nその調子で、次よろしく！",
        "location": "scene_outside_tower_enemy.webp"
      },
      {
        "cue": "ult_1",
        "speaker": "アウラ",
        "text": "うっわ…\nちょっと…やばいかも…",
        "location": "scene_outside_tower_enemy.webp"
      },
      {
        "cue": "ult_2",
        "speaker": "アウラ",
        "text": "エリ、こないだ教えたの、覚えてる？",
        "location": "scene_outside_tower_enemy.webp"
      },
      {
        "cue": "ult_3",
        "speaker": "アウラ",
        "text": "溜まった力を一気に放出するイメージ、やってみて！",
        "location": "scene_outside_tower_enemy.webp"
      },
      {
        "cue": "ult_help",
        "speaker": "",
        "text": "ULTを発動しましょう。\n画面上をダブルタップしてください。",
        "location": "scene_outside_tower_enemy.webp",
        "narration": true
      }
    ],
    "post": [
      {
        "speaker": "アウラ",
        "left": "アウラ",
        "right": "エリ",
        "text": "やるぅ～！やっぱりエリはセンスあるよ！",
        "location": "scene_outside_tower_enemy.webp"
      },
      {
        "speaker": "エリ",
        "left": "アウラ",
        "right": "エリ",
        "text": "はぁ……はぁ…できた…",
        "location": "scene_outside_tower.webp"
      },
      {
        "speaker": "アウラ",
        "left": "アウラ",
        "right": "エリ",
        "text": "よし！片付いたし、いったん戻ろ。\nお腹すいた〜。",
        "location": "scene_outside_tower.webp"
      },
      {
        "speaker": "エリ",
        "left": "アウラ",
        "right": "エリ",
        "text": "アウラはいつもそれだね。",
        "location": "scene_outside_tower.webp"
      },
      {
        "speaker": "アウラ",
        "left": "アウラ",
        "right": "エリ",
        "text": "だって戦うとお腹すくんだもん。\n…ほら、行こ。",
        "location": "scene_outside_tower.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "エリが振り返る。\n白い地平線の向こうには、何も見えなくなっていた。",
        "location": "scene_outside_tower.webp",
        "narration": true
      }
    ]
  },
  "shooting_ch01_02": {
    "chapter": 1,
    "stageNo": 2,
    "chapterTitle": "白の戦線",
    "stageTitle": "とある聖堂にて",
    "pre": [
      {
        "speaker": "",
        "text": "崩れた聖堂を補強した拠点。焚き火の煙。",
        "location": "scene_base.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "遅かったな。レムナントか？",
        "location": "scene_base.webp"
      },
      {
        "speaker": "アウラ",
        "text": "あいつら、しつこくて困っちゃうよ！",
        "location": "scene_base.webp"
      },
      {
        "speaker": "",
        "text": "レムナント。人に襲い掛かる無機質な物体を、彼らはそう呼んでいる。",
        "location": "scene_base.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "本当に、どこから湧いてきてんだか…",
        "location": "scene_base.webp"
      },
      {
        "speaker": "アウラ",
        "text": "でも、私たちなら楽勝だけど！ハハ。",
        "location": "scene_base.webp"
      },
      {
        "speaker": "ジグ",
        "text": "…飯、作ってある。手ぇ洗ってきな。",
        "location": "scene_base.webp"
      },
      {
        "speaker": "アウラ",
        "text": "さすがジグちゃんは気が利くねぇ～！",
        "location": "scene_base.webp"
      },
      {
        "speaker": "",
        "text": "奥の作業台。\nミモザが天球儀を覗き込み、レオナクロスが工具を広げている。",
        "location": "scene_base.webp",
        "narration": true
      },
      {
        "speaker": "レオナクロス",
        "text": "おかえり諸君！\nボクは今超イカツイ兵器を作成中だ！集中してるから邪魔しないでくれよ！",
        "location": "scene_base.webp"
      },
      {
        "speaker": "エリ",
        "text": "う、うん…",
        "location": "scene_base.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "対レムナント用超絶破壊爆滅熱烈光速波動…",
        "location": "scene_base.webp"
      },
      {
        "speaker": "エリ",
        "text": "が、がんばってね…",
        "location": "scene_base.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "…",
        "location": "scene_base.webp"
      },
      {
        "speaker": "アウラ",
        "text": "ミモザ、また考えごと？",
        "location": "scene_base.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "ええ。少し、気になることがあって。",
        "location": "scene_base.webp"
      },
      {
        "speaker": "",
        "text": "そのとき、見張り台のアルノが手を挙げる。拠点の外に、レムナントの影。",
        "location": "scene_base.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "チッ、飯も食わせてくれねえのかよ。\n行くぞ。",
        "location": "scene_base.webp"
      }
    ],
    "combat": [],
    "post": [
      {
        "speaker": "ジグ",
        "text": "……ったく。次から次へと…エリ、前より動きよくなったな。",
        "location": "scene_base.webp"
      },
      {
        "speaker": "エリ",
        "text": "そ、そう？アウラが色々教えてくれてるから…",
        "location": "scene_base.webp"
      },
      {
        "speaker": "ジグ",
        "text": "…まあ、無理はしすぎるなよ。今日は戻って休もう。",
        "location": "scene_base.webp"
      }
    ]
  },
  "shooting_ch01_03": {
    "chapter": 1,
    "stageNo": 3,
    "chapterTitle": "白の戦線",
    "stageTitle": "残骸",
    "pre": [
      {
        "speaker": "ミモザ",
        "text": "エリ、アウラ。少し頼みたいことがあるの。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "アウラ",
        "text": "なになに？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "レムナントが消えて灰に変わるとき、灰の中に小さな結晶が混ざっていることがあるの。\nこれを調べたい。できるだけ新しい残骸を、持ち帰ってきてほしい。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "エリ",
        "text": "残骸って……持って帰れるの？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "これに入れて。\n完全に消える前なら、閉じ込められる。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "",
        "text": "レオナクロスが、硝子の小瓶をいくつか手渡す。",
        "location": "scene_workbench.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "よし！ちゃちゃっと行ってくる！",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "オレも行く。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "アウラ",
        "text": "あ、心配してくれてるんだ。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "違う、トレーニングがてらだ。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "",
        "text": "浅い水に沈んだ瓦礫。\n外は果てしない白が広がる。",
        "location": "scene_outside_road.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "……静かだね。",
        "location": "scene_outside_road.webp"
      },
      {
        "speaker": "アウラ",
        "text": "ここ、前はどんな場所だったんだろう。",
        "location": "scene_outside_road.webp"
      },
      {
        "speaker": "エリ",
        "text": "前？",
        "location": "scene_outside_road.webp"
      },
      {
        "speaker": "アウラ",
        "text": "壊れる前。誰かが住んでたのかなって。",
        "location": "scene_outside_road.webp"
      },
      {
        "speaker": "エリ",
        "text": "壊れる前…",
        "location": "scene_outside_road.webp"
      },
      {
        "speaker": "ジグ",
        "text": "来るぞ、構えろ。",
        "location": "scene_outside_road.webp"
      }
    ],
    "combat": [],
    "post": [
      {
        "speaker": "",
        "text": "倒れたレムナントが崩れる。\nエリが小瓶をかざすと、灰の一部が瓶の中に吸い込まれる。",
        "location": "scene_outside_road.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "入った……！",
        "location": "scene_outside_road.webp"
      },
      {
        "speaker": "アウラ",
        "text": "やったね！これでミモザも喜ぶよ。",
        "location": "scene_outside_road.webp"
      },
      {
        "speaker": "エリ",
        "text": "よし、戻…っ…？！",
        "location": "scene_outside_road.webp",
        "effect": "rumble",
        "durationMs": 1800
      },
      {
        "speaker": "",
        "text": "遠くで、地響きが鳴る。\n白い霧の向こうで、何か大きなものが動く。",
        "location": "scene_outside_road.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "ん？地震か…？",
        "location": "scene_outside_road.webp"
      },
      {
        "speaker": "アウラ",
        "text": "雲が…裂けていく…",
        "location": "scene_outside_noise.webp"
      },
      {
        "speaker": "エリ",
        "text": "な、なにあれ…",
        "location": "scene_outside_noise.webp"
      },
      {
        "speaker": "",
        "text": "雲が裂け、その隙間から巨大な身体のドラゴンが顔を出す。",
        "location": "scene_remnant_01_battle.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "おいおい…\n冗談だろ…？",
        "location": "scene_remnant_01_battle.webp"
      }
    ]
  },
  "shooting_ch01_04": {
    "chapter": 1,
    "stageNo": 4,
    "chapterTitle": "白の戦線",
    "stageTitle": "白竜",
    "pre": [
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "エリ、ジグ、アウラは目の前に聳える巨躯を見上げていた。",
        "location": "scene_remnant_01_battle.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "left": "アウラ",
        "right": "エリ",
        "text": "……なに、あれ…竜？",
        "location": "scene_remnant_01_battle.webp"
      },
      {
        "speaker": "エリ",
        "left": "アウラ",
        "right": "エリ",
        "text": "なんか…すっごく敵意を感じる…",
        "location": "scene_remnant_01_battle.webp"
      },
      {
        "speaker": "ジグ",
        "left": "ジグ",
        "right": "エリ",
        "text": "あれと正面からやり合うのは危険だ…\n逃げるぞ。",
        "location": "scene_remnant_01_battle.webp"
      },
      {
        "speaker": "",
        "text": "",
        "location": "scene_remnant_01_battle.webp",
        "effect": "rumble",
        "durationMs": 650
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "振り返った先にも、\n無数のレムナントが現れる。\n気づけば、三人は完全に囲まれていた。",
        "location": "scene_remnant_01_battle.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "left": "アウラ",
        "right": "エリ",
        "text": "うそ…退路まで塞がれてる…",
        "location": "scene_remnant_01_battle.webp"
      },
      {
        "speaker": "ジグ",
        "left": "ジグ",
        "right": "エリ",
        "text": "クソ…やるしかねえ…。\nアウラは周りの小さい目玉を頼む。\nオレとエリで、デカいのを叩く。",
        "location": "scene_remnant_01_battle.webp"
      },
      {
        "speaker": "アウラ",
        "left": "ジグ",
        "right": "アウラ",
        "text": "わ、わかった！",
        "location": "scene_remnant_01_battle.webp"
      }
    ],
    "combat": [
      {
        "cue": "pressure_1",
        "speaker": "エリ",
        "text": "なに…？！\nなんで効かないの…？"
      },
      {
        "cue": "pressure_1_jig",
        "speaker": "ジグ",
        "text": "下がってろ…オレがやる！"
      },
      {
        "cue": "pressure_2",
        "speaker": "ジグ",
        "text": "通らねぇ…当たってるのに…！"
      },
      {
        "cue": "pressure_3",
        "speaker": "エリ",
        "text": "ジグ！あぶない…っ！！"
      },
      {
        "cue": "pressure_4",
        "speaker": "ジグ",
        "text": "はぁ…はぁ…\nどうすりゃいい。",
        "location": "scene_eri_jig_battle.webp"
      },
      {
        "cue": "pressure_5",
        "speaker": "エリ",
        "text": "アウラは…？",
        "location": "scene_eri_jig_battle.webp"
      },
      {
        "cue": "pressure_6",
        "speaker": "",
        "text": "アウラも小型のレムナントを相手に、\n満身創痍の様子。",
        "location": "scene_eri_jig_battle.webp",
        "narration": true
      },
      {
        "cue": "pressure_7",
        "speaker": "ジグ",
        "text": "エリ…\nオレがやつを引きつけてる間に\nアウラを連れて逃げろ。",
        "location": "scene_eri_jig_battle.webp"
      },
      {
        "cue": "pressure_8",
        "speaker": "エリ",
        "text": "え…？！\n無理だよ、できない…！",
        "location": "scene_eri_jig_battle.webp"
      },
      {
        "cue": "pressure_9",
        "speaker": "ジグ",
        "text": "そうも言ってられないだろ。\nこのままじゃ…\n3人とも犬死にだ。",
        "location": "scene_eri_jig_battle.webp"
      },
      {
        "cue": "pressure_10",
        "speaker": "エリ",
        "text": "でも…",
        "location": "scene_eri_jig_battle.webp"
      },
      {
        "cue": "pressure_9_urgent",
        "speaker": "ジグ",
        "text": "急げ…！！",
        "location": "scene_eri_jig_battle.webp"
      },
      {
        "cue": "pressure_11",
        "speaker": "",
        "text": "大型レムナントが、こちらへ手を振りかざした。",
        "location": "scene_eri_jig_battle.webp",
        "narration": true
      },
      {
        "cue": "pressure_12",
        "speaker": "ジグ",
        "text": "…っ……くそったれが…",
        "location": "scene_eri_jig_battle.webp"
      },
      {
        "cue": "impact_1",
        "speaker": "",
        "text": "――大きな衝撃音が鳴り響く。",
        "location": "scene_eri_jig_battle.webp",
        "narration": true
      },
      {
        "cue": "impact_2",
        "speaker": "",
        "text": "ジグとエリは、強い力で吹き飛ばされる。",
        "location": "scene_eri_jig_battle.webp",
        "narration": true
      },
      {
        "cue": "rescue_1",
        "speaker": "",
        "text": "白く揺れる視界の先。\n風に靡く、白装束の後ろ姿。",
        "location": "scene_aruno_help.webp",
        "narration": true
      },
      {
        "cue": "rescue_2",
        "speaker": "アルノ",
        "text": "すまない、少々手荒になった。",
        "location": "scene_aruno_help.webp"
      },
      {
        "cue": "rescue_3",
        "speaker": "エリ",
        "text": "ア…アルノ…？",
        "location": "scene_aruno_help.webp"
      },
      {
        "cue": "rescue_4",
        "speaker": "ジグ",
        "text": "お前…どうして…",
        "location": "scene_aruno_help.webp"
      },
      {
        "cue": "rescue_5",
        "speaker": "アルノ",
        "text": "発明家の装置がお前たちの危険を検知した。",
        "location": "scene_aruno_help.webp"
      },
      {
        "cue": "rescue_6",
        "speaker": "アルノ",
        "text": "お前たちは向こうの援護を。\nアレは私がやる。",
        "location": "scene_aruno_help.webp"
      },
      {
        "cue": "arno_battle_start",
        "speaker": "アルノ",
        "text": "さて、力試しといこう…",
        "location": "scene_eri_jig_battle.webp"
      }
    ],
    "post": [
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "アルノの止むことのない斬撃が、その巨体に襲い掛かる。",
        "location": "scene_remnant_01_rip.webp",
        "narration": true
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "敵の身体がぐらりと傾き、\n轟音とともに崩れ落ちる。\nやがて輪郭は灰となり、白い風の中へ消えていった。",
        "location": "scene_remnant_01_rip.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "left": "",
        "right": "エリ",
        "text": "はぁ…はぁ…",
        "location": "scene_remnant_01_rip.webp"
      },
      {
        "speaker": "アウラ",
        "left": "アウラ",
        "right": "",
        "text": "勝った…の…？",
        "location": "scene_remnant_01_rip.webp"
      },
      {
        "speaker": "ジグ",
        "left": "",
        "right": "ジグ",
        "text": "ギリ…ギリな…",
        "location": "scene_remnant_01_rip.webp"
      },
      {
        "speaker": "エリ",
        "left": "アルノ",
        "right": "エリ",
        "text": "アルノ、ありがとう。",
        "location": "scene_outside_road.webp"
      },
      {
        "speaker": "アルノ",
        "left": "アルノ",
        "right": "エリ",
        "text": "…",
        "location": "scene_outside_road.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "消えていく灰の中、\n何かが光っていることに気が付く。",
        "location": "scene_outside_road.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "left": "",
        "right": "エリ",
        "text": "……これ、なに？",
        "location": "scene_outside_road.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "エリがそっと手を伸ばす。\n指先が触れた瞬間、結晶が淡く脈打つ。",
        "location": "scene_outside_road.webp",
        "narration": true,
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue",
        "itemImageEffect": "grow"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "エリは、その結晶を拾い上げる。",
        "location": "scene_outside_road.webp",
        "narration": true,
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "エリ",
        "left": "",
        "right": "",
        "text": "あたたかい…",
        "location": "scene_outside_road.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "エリ",
        "left": "",
        "right": "エリ",
        "text": "……持って帰ろう。\nミモザなら、何か分かるかも。",
        "location": "scene_outside_road.webp"
      }
    ]
  },
  "shooting_ch02_01": {
    "chapter": 2,
    "stageNo": 1,
    "chapterTitle": "燈火",
    "stageTitle": "結晶",
    "stageType": "novel",
    "pre": [
      {
        "speaker": "",
        "text": "拠点に戻ると、ミモザがすぐに気が付いた。",
        "location": "scene_workbench.webp",
        "narration": true
      },
      {
        "speaker": "ミモザ",
        "text": "それ…",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "エリ",
        "text": "大きな竜のレムナントが、\n消えるときに残したの。",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "",
        "text": "ミモザが結晶を手に取る。\n天球儀が、かすかに震える。",
        "location": "scene_workbench.webp",
        "narration": true,
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "ミモザ",
        "text": "エリ。これを手に取ったとき、何か感じた？",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "エリ",
        "text": "えっと…光った…かな。",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "",
        "text": "ミモザは答えず、じっとエリを見つめる。",
        "location": "scene_workbench.webp",
        "narration": true,
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "アウラ",
        "text": "…？",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "ミモザ",
        "text": "……そう。少し預からせて。",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "",
        "text": "白い空。遠い廃墟の上で、\n何かがかすかに赤く瞬いた気がした。",
        "location": "scene_workbench.webp",
        "narration": true
      },
      {
        "transition": "fade_black",
        "text": ""
      },
      {
        "speaker": "",
        "text": "かすかな灯りの下、\n結晶が硝子の器の中で静かに脈打っている。",
        "location": "scene_workbench.webp",
        "narration": true,
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "レオナクロス",
        "text": "エリが持ち帰った残骸は、数日経ち、\n全部灰になった。これだけが残ってる。",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "ミモザ",
        "text": "大きさの違いかと思ったけれど、違う。\n小型のレムナントから採取した結晶と、この結晶とは、明らかに性質が違う。",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "アウラ",
        "text": "性質？",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "ミモザ",
        "text": "なんて言ったらいいか…",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "ミモザ",
        "text": "いわゆる魂…が結晶化したもの…\nって言ったら伝わるかしら。",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "エリ",
        "text": "大きなレムナントは…魂を持っている…ってこと？",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "ミモザ",
        "text": "…",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "アウラ",
        "text": "それにしても綺麗だよねぇ。\n触ってもいい？",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "ミモザ",
        "text": "だめ。……と言いたいところだけど、\n試してみたいことがあるわ。",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "",
        "text": "ミモザが結晶を自分の手に乗せる。\n何も起きない。",
        "location": "scene_workbench.webp",
        "narration": true,
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "",
        "text": "アウラ、ジグ、アルノが順に触れる。\n何も起きない。",
        "location": "scene_workbench.webp",
        "narration": true,
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "レオナクロス",
        "text": "ボクも同じだ。このとおり。",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "",
        "text": "何も起きない。",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue",
        "narration": true
      },
      {
        "speaker": "レオナクロス",
        "text": "はい、エリ。",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "",
        "text": "エリが触れたそのとき、\n結晶が、ふっと光を帯びる。",
        "location": "scene_workbench.webp",
        "narration": true,
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue",
        "itemImageEffect": "glow"
      },
      {
        "speaker": "エリ",
        "text": "…えっ？！",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue",
        "itemImageEffect": "glow"
      },
      {
        "speaker": "アウラ",
        "text": "わぁ！光った…",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue",
        "itemImageEffect": "glow"
      },
      {
        "speaker": "ミモザ",
        "text": "やっぱり。",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue",
        "itemImageEffect": "glow"
      },
      {
        "speaker": "エリ",
        "text": "なんで私だけ…？",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue",
        "itemImageEffect": "glow"
      },
      {
        "speaker": "ミモザ",
        "text": "分からない。もう少し調べる…\n別の結晶が入手できるといいんだけど。",
        "location": "scene_workbench.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue",
        "itemImageEffect": "glow"
      },
      {
        "speaker": "ジグ",
        "text": "別の結晶って…またあのデケェのとやるのか？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "いや…あくまで理想よ。\nまずはこの結晶をもっと詳しく調べてみるわ。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "レオナ、もう少し手伝ってちょうだい。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "かしこまり！\nボクのスーパーハイテク頭脳で解き明かしてみせよう！",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "アルノ",
        "text": "……",
        "location": "scene_workbench.webp"
      },
      {
        "transition": "fade_black",
        "text": ""
      },
      {
        "speaker": "ミモザ",
        "text": "あなたたちが持って帰ってきてくれた結晶を調べている中で重要なことが分かったわ。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "エリ",
        "text": "なに？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "私たちやレムナントが持つ力には、それぞれ性質がある。\nいわゆる“属性”ね。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "確認できているのは5種類。ボクたちはこれを、火・水・木・光・闇と定義した。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "エリ",
        "text": "属性…？それが何に影響するの？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "簡単に言うと、攻撃の通りやすさが変わる。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "そういや…竜のレムナントに、攻撃が通らなかった…",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "エリ",
        "text": "力が足りないわけじゃなかったんだ…",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "ここ最近、弱点の属性しか攻撃を通さないような強化個体が発生しているみたいなの。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "この間の竜型レムナント…あれは木の属性だった。だから火のアルノは攻撃が通った。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "オレらの属性は分かるのか？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "ええ。調べたわ。…アルノが火で、ジグとアウラ、私が木。レオナが闇で、エリは光。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "アウラ",
        "text": "おー！ジグちゃんおそろーい！",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "なんか…特別感がねぇなぁ…",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "ふふ…たまたま木に偏ったのか、そもそも木属性が多いのか…そこは分からないわ。\nちなみに属性同士の弱点反応はこんな感じだった。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "",
        "text": "",
        "location": "scene_type.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "火は木に強く、木は水に強い。水は火に強い。闇と光は互いに弱点の関係。",
        "location": "scene_type.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "つまり、相性を見て戦ったほうがいいんだね！",
        "location": "scene_type.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "そういうこと。次の戦闘からは意識するといいわ。",
        "location": "scene_type.webp"
      },
      {
        "speaker": "アウラ",
        "text": "はーい！",
        "location": "scene_type.webp"
      }
    ],
    "combat": [],
    "post": []
  },
  "shooting_ch02_02": {
    "chapter": 2,
    "stageNo": 2,
    "chapterTitle": "燈火",
    "stageTitle": "痕跡",
    "pre": [
      {
        "speaker": "",
        "text": "アルノが竜型レムナントを倒した場所。\n地面が円く抉れている。エリ、アウラ、ミモザ、アルノの四人がそれを囲んでいる。",
        "location": "scene_enemy_site.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "ミモザが外に出るの、珍しいね。",
        "location": "scene_enemy_site.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "自分の目で見たかったの。……ここね。",
        "location": "scene_enemy_site.webp"
      },
      {
        "speaker": "",
        "text": "抉れた地面の縁に、細い線が刻まれている。円と、交差する直線。見覚えのない紋様。",
        "location": "scene_enemy_site.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "これ、こないだの竜のレムナントがつけたの？",
        "location": "scene_enemy_site.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "いいえ。たぶん…もっと古い。ほら、灰の下にも続いてる。",
        "location": "scene_enemy_site.webp"
      },
      {
        "speaker": "",
        "text": "ミモザが灰を払う。\n紋様は、廃墟の奥へと伸びている。",
        "location": "scene_enemy_site.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "なんか、道みたい。",
        "location": "scene_enemy_site.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "道……そうね。何かが、ここを流れた跡にも見える。",
        "location": "scene_enemy_site.webp"
      },
      {
        "speaker": "",
        "text": "アルノが、すっと前に出て片手を上げる。\n全員が足を止める。",
        "location": "scene_enemy_site.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "アルノ？",
        "location": "scene_enemy_site.webp"
      },
      {
        "speaker": "",
        "text": "アルノがナイフを構える。廃墟の影から、レムナントの群れが這い出してくる。",
        "location": "scene_enemy_site.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "もう、いいところだったのに！",
        "location": "scene_enemy_site.webp"
      },
      {
        "speaker": "アルノ",
        "text": "さっさと片づけよう。",
        "location": "scene_enemy_site.webp"
      }
    ],
    "combat": [],
    "post": [
      {
        "speaker": "アウラ",
        "text": "おー！これが属性！",
        "location": "scene_enemy_site.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "…理解が早いわね。",
        "location": "scene_enemy_site.webp"
      },
            {
        "speaker": "ミモザ",
        "text": "……それにしても、紋様を辿ってきたのかしら。それとも、私たちを…",
        "location": "scene_enemy_site.webp"
      },
      {
        "speaker": "",
        "text": "ミモザは紋様の写しを手帳に描き留める。\n最後の一本の線が、ほんの少しだけ、赤く滲んでいた。",
        "location": "scene_enemy_site.webp",
        "narration": true
      },
      {
        "speaker": "ミモザ",
        "text": "戻りましょう。あまり長居するのは危険な気がするわ。",
        "location": "scene_enemy_site.webp"
      },
      {
        "transition": "fade_black",
        "text": ""
      },
      {
        "speaker": "レオナクロス",
        "text": "諸君！喜びたまえ！",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "なんだ？騒がしい…",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "ついに…完成した…！",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "君たちの力を最大限まで引きだす最強デバイスだ。",
        "location": "scene_workbench.webp",
        "itemImage": "item_sync_device.webp",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "アウラ",
        "text": "なにその胡散臭いの…",
        "location": "scene_workbench.webp",
        "itemImage": "item_sync_device.webp",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "",
        "text": "アウラが怪しそうにレオナクロスを見る。\nレオナクロスの手には、小型の注射器型デバイスが握られている。",
        "location": "scene_workbench.webp",
        "itemImage": "item_sync_device.webp",
        "itemImagePosition": "above-dialogue",
        "narration": true
      },
      {
        "speaker": "レオナクロス",
        "text": "ミモザの科学力とボクの開発力のクロスオーバーだよ！",
        "location": "scene_workbench.webp",
        "itemImage": "item_sync_device.webp",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "レオナクロス",
        "text": "ミモザの研究により\n君たちの力はこの世界との適合率に比例して大きくなることが分かっている。",
        "location": "scene_workbench.webp",
        "itemImage": "item_sync_device.webp",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "レオナクロス",
        "text": "このデバイスは、適合率を100%に近いところまで持っていく！",
        "location": "scene_workbench.webp",
        "itemImage": "item_sync_device.webp",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "ミモザ",
        "text": "おそらくこの先…\nこないだ遭遇した大型レベルのレムナントと戦うことになる。",
        "location": "scene_workbench.webp",
        "itemImage": "item_sync_device.webp",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "レオナクロス",
        "text": "名付けて…\n世界律動強制同調式超限臨界適合――",
        "location": "scene_workbench.webp",
        "itemImage": "item_sync_device.webp",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "アウラ",
        "text": "出た出たいつもの。",
        "location": "scene_workbench.webp",
        "itemImage": "item_sync_device.webp",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "ミモザ",
        "text": "この先は厳しい戦いを強いられることが予想されるわ。\nこのデバイスを使って、超小型のエネルギー受信装置を体内に埋め込む。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "アウラ",
        "text": "えー…！怖すぎるんですけど…",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "安心したまえ！5秒で終わるぞ！",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "…",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "エリ",
        "text": "ジグ…注射怖いの？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "",
        "text": "ジグがアルノを睨みつけている。",
        "location": "scene_workbench.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "ジグ…？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "アルノ…お前…",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "もう既に埋め込んでんだろ。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "アルノ",
        "text": "…",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "",
        "text": "一瞬、空気が張り詰める。",
        "location": "scene_workbench.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "…",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "ごめんなさい。アルノには事前に協力してもらっていたの。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "情報が平等じゃねえ。気に入らねえな。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "こいつが特別なのは分かってる。\nその…適合率とやらがもともと高ぇんだろ？\nただ、コソコソと裏で動かれるのは気に入らねえ。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "オレら、仲間だろ？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "アルノ",
        "text": "ジグ…すまない。\n私から申し出た。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "",
        "text": "ジグが驚いた表情でアルノを見る。",
        "location": "scene_workbench.webp",
        "narration": true
      },
      {
        "speaker": "レオナクロス",
        "text": "実はこれ、かなりリスクの高い研究だったんだ。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "アルノはボクたちの研究内容を察して、自らを実験体にするよう、提案してくれた。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "…",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "でも、情報は平等に開示するべきだった。\nごめんなさい…仲間だものね。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "……とっとと、埋め込んでくれ。\n強くなれるんだろ。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "ありがとう、ジグ。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "すまない。ジグの言う通りだ。今後は隠し事なしでいく！\nでは、順番にいくぞ！",
        "location": "scene_workbench.webp"
      },
      {
        "transition": "fade_black",
        "text": ""
      },
      {
        "speaker": "ジグ",
        "text": "……ぎゃ…！！！",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "エリ",
        "text": "やっぱり…注射苦手だったんだ。",
        "location": "scene_workbench.webp"
      }
    ]
  },
  "shooting_ch02_03": {
    "chapter": 2,
    "stageNo": 3,
    "chapterTitle": "燈火",
    "stageTitle": "ふたたび",
    "pre": [
      {
        "speaker": "",
        "text": "紋様を辿った先。白い塔が林のように立ち並ぶ。\nエリ、アウラ、ジグの3人が塔を見上げる。",
        "location": "scene_many_tower.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "ミモザの言う“道”ってのは、この先まで続いてんのか。",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "アウラ",
        "text": "なんか、塔に向かって線が伸びてるみたいだね。",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "エリ",
        "text": "ほんとだ。全ての線が、塔の入り口に向かってるね。",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "ジグ",
        "text": "なんか…気味悪ィな。さっさと調べて帰ろうぜ。",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "アウラ",
        "text": "絶対アルノに一緒に来てもらうべきだったよ。",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "ジグ",
        "text": "あいつは単独調査中。ミモザは急いでる。\nたぶん、あまり時間がないんだろう。",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "アウラ",
        "text": "うーん、でも、大きいの来たらヤバいよねぇ…",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "ジグ",
        "text": "レオナの発明を信じようぜ。",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "ジグ",
        "text": "（あんな怖えー思いしたんだ…）",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "ジグ",
        "text": "…！",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "",
        "text": "塔の隙間から、小さなレムナントの群れがこちらに向かってくるのが見えた。",
        "location": "scene_many_tower.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "言ったそばから…",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "エリ",
        "text": "初めて見るタイプだね。",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "ジグ",
        "text": "小せぇけど、油断は禁物だ、いくぞ！",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "アウラ",
        "text": "オーケー！",
        "location": "scene_many_tower.webp"
      }
    ],
    "combat": [
      {
        "speaker": "",
        "text": "戦いの最中。エリの視界の端で、\n遠くの塔の上に、赤い光が揺れる。",
        "location": "scene_many_tower.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "……え？",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "",
        "text": "ランタンの灯りのような、小さな燈火が視界の端に見えた気がして、エリは木を取られる。\n",
        "location": "scene_many_tower.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "エリ！\nなにやってんの！前見て！",
        "location": "scene_many_tower.webp"
      }
    ],
    "post": [
      {
        "speaker": "",
        "text": "群れを退けたあと。エリが塔の上を見上げる。何もない。",
        "location": "scene_many_tower.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "ねえ、二人とも。\nさっき、あの塔の上に……赤い光、見えなかった？",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "アウラ",
        "text": "赤い光？\nううん、見てないよ。",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "ジグ",
        "text": "疲れてんじゃねえか？",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "エリ",
        "text": "……そうかな。",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "",
        "text": "エリはもう一度振り返る。\n白い塔が、静かに並んでいるだけだった。",
        "location": "scene_many_tower.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "……",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "",
        "text": "轟音とともに、遠くにそびえていた塔が、崩れる。",
        "location": "scene_many_tower.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "えっ…？！",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "ジグ",
        "text": "この感じは…どうやら…お出ましだな。",
        "location": "scene_many_tower.webp"
      },
      {
        "speaker": "",
        "text": "少し遠くに、大きな白い影が浮かぶのが見える。",
        "location": "scene_many_tower.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "3人の身体に緊張が走る。",
        "location": "scene_many_tower.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "遠くに見えた白い影は、フッと消えた。\n次の瞬間…",
        "location": "scene_many_tower.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "激しい衝撃音とともに、白い影が3人のいる場所目掛けて飛び込んでくる。",
        "location": "scene_many_tower.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "二人とも！！避けて！！",
        "location": "scene_many_tower.webp"
      }
    ]
  },
  "shooting_ch02_04": {
    "chapter": 2,
    "stageNo": 4,
    "chapterTitle": "燈火",
    "stageTitle": "轟力",
    "pre": [
      {
        "speaker": "",
        "text": "地鳴りとともに次々と塔が崩れてゆく。土煙の中から、白装束の大型レムナントが現れる。",
        "location": "scene_remnant_02_battle.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "激しい衝撃音とともに、空間が大きく揺れる。",
        "location": "scene_remnant_02_battle.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "3人が、間一髪でその巨体が繰り出す突進をかわす。",
        "location": "scene_remnant_02_battle.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "息つく間もなく、巨体がこちらに向き直り、姿勢を下げる。",
        "location": "scene_remnant_02_battle.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "もう一発、くるぞ！",
        "location": "scene_remnant_02_battle.webp"
      },
      {
        "speaker": "ジグ",
        "text": "足を止めちゃだめだ…動き続けろ！！",
        "location": "scene_remnant_02_battle.webp"
      }
    ],
    "combat": [],
    "post": [
      {
        "speaker": "",
        "text": "激しい攻防の末、白い身体が崩れ落ちる。\n舞い上がる灰とともに、その身体が天に昇っていく。",
        "location": "scene_remnant_02_rip.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "終わった…か。\n二人とも…無事か？",
        "location": "scene_remnant_02_rip_after.webp"
      },
      {
        "speaker": "アウラ",
        "left": "アウラ",
        "right": "エリ",
        "text": "う、うん…！私たち、本当に強くなってるみたい。",
        "location": "scene_remnant_02_rip_after.webp"
      },
      {
        "speaker": "",
        "text": "エリが灰の中から、結晶を拾い上げる。",
        "location": "scene_remnant_02_rip_after.webp",
        "narration": true,
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "アウラ",
        "left": "アウラ",
        "right": "エリ",
        "text": "あ、結晶！あいつの魂かな。",
        "location": "scene_remnant_02_rip_after.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "エリ",
        "left": "アウラ",
        "right": "エリ",
        "text": "…",
        "location": "scene_remnant_02_rip_after.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "",
        "text": "結晶を手に、ぼーっとするエリをアウラが不思議そうな目で見ている。",
        "location": "scene_remnant_02_rip_after.webp",
        "narration": true,
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "アウラ",
        "left": "アウラ",
        "right": "エリ",
        "text": "エリ？",
        "location": "scene_remnant_02_rip_after.webp",
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "",
        "text": "はっとしたように、エリの意識がアウラに向く。",
        "location": "scene_remnant_02_rip_after.webp",
        "narration": true,
        "itemImage": "item_memory.webp?v=1200",
        "itemImagePosition": "above-dialogue"
      },
      {
        "speaker": "エリ",
        "left": "アウラ",
        "right": "エリ",
        "text": "あ……ううん、戻ろう。ミモザに調べてもらわなきゃ。",
        "location": "scene_remnant_02_rip_after.webp"
      },
      {
        "transition": "fade_black",
        "text": ""
      },
      {
        "speaker": "アウラ",
        "text": "ミモザ、何か分かった？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "いくつかの仮説は立っているわ…でも、もう少し時間をちょうだい。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "それと…みんなに話があるの。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "",
        "text": "一同の視線がミモザに集まる。",
        "location": "scene_workbench.webp",
        "narration": true
      },
      {
        "speaker": "ミモザ",
        "text": "まず、最近のレムナントの発生状況…",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "増えている。\n観測装置でも、この周辺のボクたち以外のエネルギー反応が爆発的に増えてることが確認できている。",
        "location": "scene_workbench.webp"
      },
            {
        "speaker": "レオナクロス",
        "text": "それに、大型の…強化個体も出現している。",
        "location": "scene_workbench.webp"
      },

      {
        "speaker": "ミモザ",
        "text": "そう。これを考慮すると…\n私たち6人では、圧倒的に戦力が足りない。数の問題ね。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "適合率は上がっているし、レムナントとの戦闘を重ねて、確実に強くなっている。\nけれど…圧倒的な数の暴力には敵わない。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "でも、数なんてどうしようもないだろ。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "そこで……少し考えがあるの。",
        "location": "scene_workbench.webp"
      }
    ]
  },
  "shooting_ch03_01": {
    "chapter": 3,
    "stageNo": 1,
    "chapterTitle": "旅立ち",
    "stageTitle": "戦力",
    "stageType": "novel",
    "pre": [
      {
        "speaker": "ミモザ",
        "text": "前に見た紋様。覚えてる？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "エリ",
        "text": "紋様…塔の近くにあったやつだよね。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "そう。あれから、もう少し辿ってみたの。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "それで分かった。あそこは中心じゃなかった。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "あの紋様は、もっと大きな流れの一部。\n反応が、あの塔からさらに遠くまで続いてる。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "一部…あんなのが他にもたくさんあるってことか？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "ええ。しかも、いくつもの反応が同じ方向へ向かってる。\nもっと中心に近い…源のような場所があるはず。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "エリ",
        "text": "それと、戦力の話が、どうつながるの？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "紋様をいくつか調べたらね…大型レムナントが残す魂の結晶とよく似た反応が検出されたの。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "エリ",
        "text": "じゃあ、あの紋様からレムナントが生まれたの？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "生まれたのか、通ってきたのか…\nそこまでは分からない。でも、あの紋様が発生に関係している可能性は高い。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "それと、レムナントとは違う性質の跡もあった。\n限りなく、私たち人間に近い性質。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "それって…",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ジグ",
        "text": "オレらみたいに、この世界に迷い込んだやつが他にもいるってことか？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "私はそう考えてる。もともと、私たちが出会ったのだって偶然だしね。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "アウラ",
        "text": "……私たちと同じような人たちを見つけて、協力してもらうってこと？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "そういうことね。もしも紋様が他の存在に関係しているなら…その中心には、何かヒントがあるかもしれない。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "アウラ",
        "text": "でも、中心って…すごく遠いんじゃない？",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "そうね。少なくとも数週間…下手したらもっとかかるかもしれないわ。\nでも、このままここにいても、何も進まない。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "エリ",
        "text": "この基地を…離れるってことだよね。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "ええ、そういうことになるわ。",
        "location": "scene_workbench.webp"
      },
      {
        "speaker": "アルノ",
        "text": "…いこう。おそらく…あまり時間がない。",
        "location": "scene_workbench.webp"
      },
      {
        "transition": "fade_black",
        "text": ""
      },
      {
        "speaker": "",
        "text": "吹き抜ける風が、がらんと空いた廃墟の静寂を揺らす。",
        "location": "scene_base_02.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "なんか、寂しいねぇ。",
        "location": "scene_base_02.webp"
      },
      {
        "speaker": "ジグ",
        "text": "…なんだかんだ居心地よかったよな。",
        "location": "scene_base_02.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "よし、持てるものは持った！諸君ら！忘れ物はないな？",
        "location": "scene_base_02.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "では、行きましょうか。",
        "location": "scene_base_02.webp"
      },
      {
        "speaker": "",
        "text": "ミモザが作業台の灯りを消す。\n寂れた聖堂はその役割を終えたように、再び白い静寂の中へ沈んでいった。",
        "location": "scene_base_02.webp",
        "narration": true
      },
      {
        "transition": "fade_black",
        "text": ""
      },
      {
        "speaker": "",
        "text": "一行は帰る場所を背にして、白い世界の奥へ進んでいく。\n彼女たちの表情には、確かな覚悟の色が宿っていた。",
        "location": "scene_outside_road.webp",
        "narration": true
      }
    ],
    "combat": [],
    "post": []
  },
  "shooting_ch03_02": {
    "chapter": 3,
    "stageNo": 2,
    "chapterTitle": "旅立ち",
    "stageTitle": "違和感",
    "pre": [
      {
        "speaker": "アウラ",
        "text": "はぁ…お腹すいた。レオナ、キャンディちょうだい…",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "ダメだ！アウラは食べ過ぎだ！貴重なエネルギー源だぞ。",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "アウラ",
        "text": "もー！ジグちゃんのご飯が食べたーい！！",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "",
        "text": "基地を離れて約2週間ほど。目印のない白い道を、紋様の反応だけを頼りに進む。",
        "location": "scene_walk.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "－－キーン",
        "location": "scene_walk.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "静けさのなかに突如響き渡る高音。",
        "location": "scene_walk.webp",
        "narration": true
      },
      {
        "speaker": "アルノ",
        "text": "くるぞ…",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "ジグ",
        "text": "きりがねぇな…飽きてくるぜ。",
        "location": "scene_walk.webp"
      }
    ],
    "combat": [],
    "post": [
      {
        "speaker": "ジグ",
        "text": "なんか、だんだん手ごわくなってきてねぇか？",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "アルノ",
        "text": "個体によって能力に差がある…",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "エリ",
        "text": "あ、あれ。",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "",
        "text": "一同の視線の先に、大きな塔が見える。",
        "location": "scene_tower_far.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "レオナが手元のレーダーを確認する。",
        "location": "scene_tower_far.webp",
        "narration": true
      },
      {
        "speaker": "レオナクロス",
        "text": "あのあたり…かなり反応が強い。",
        "location": "scene_tower_far.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "中心はすぐそこかもしれないわね。",
        "location": "scene_tower_far.webp"
      }
    ]
  },
  "shooting_ch03_03": {
    "chapter": 3,
    "stageNo": 3,
    "chapterTitle": "旅立ち",
    "stageTitle": "塔の奥には",
    "pre": [
      {
        "speaker": "",
        "text": "一行は少し先に見えている一際高い塔を目指して歩く。",
        "location": "scene_tower_middle.webp",
        "narration": true
      },
      {
        "speaker": "ミモザ",
        "text": "だんだんと…紋様が濃く、太くなっていってるように見えるわね。",
        "location": "scene_tower_middle.webp"
      },
      {
        "speaker": "",
        "text": "足元に刻まれた紋様は、吸い込まれるように塔の中まで続いている。",
        "location": "scene_tower_middle.webp",
        "narration": true
      },
      {
        "speaker": "アルノ",
        "text": "2体…8時の方向…",
        "location": "scene_tower_middle.webp"
      },
      {
        "speaker": "",
        "text": "一同の背後に、白い影が襲い掛かる。",
        "location": "scene_tower_middle.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "アルノが素早く対応する。",
        "location": "scene_tower_middle.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "レムナントが増えてきた…",
        "location": "scene_tower_middle.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "やっぱり…発生源はここなのかもしれないわね…",
        "location": "scene_tower_middle.webp"
      },
      {
        "speaker": "ジグ",
        "text": "デケェのがわんさか出てくるとか…勘弁してくれよ？",
        "location": "scene_tower_middle.webp"
      },
      {
        "speaker": "アウラ",
        "text": "あ…入口。",
        "location": "scene_tower_middle.webp"
      },
      {
        "speaker": "",
        "text": "塔の入口が見える。扉はない。床一面に刻まれた紋様は、塔の内部に続いている。",
        "location": "scene_tower_near.webp",
        "narration": true
      },
      {
        "speaker": "レオナクロス",
        "text": "やはり、あの中だ。他に比べて見るからに反応が強い。",
        "location": "scene_tower_near.webp"
      },
      {
        "speaker": "アウラ",
        "text": "入るの…？",
        "location": "scene_tower_near.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "そのためにきたのよ。",
        "location": "scene_tower_near.webp"
      },
      {
        "speaker": "",
        "text": "アウラが不安そうな目でジグを見る。",
        "location": "scene_tower_near.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "…大丈夫だ。",
        "location": "scene_tower_near.webp"
      },
      {
        "speaker": "",
        "text": "ジグがアウラの肩にそっと手を置く。",
        "location": "scene_tower_near.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "6人の背後に蠢く影。",
        "location": "scene_tower_near.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "塔に向かって、複数の小型レムナントが向かってくる。",
        "location": "scene_tower_near.webp",
        "narration": true
      },
      {
        "speaker": "アルノ",
        "text": "…中を調べてくれ。私は塔の入り口を守る。",
        "location": "scene_tower_near.webp"
      },
      {
        "speaker": "",
        "text": "アルノはナイフを構えると、素早く敵に斬りかかる。",
        "location": "scene_tower_near.webp",
        "narration": true
      },
      {
        "speaker": "ミモザ",
        "text": "…お願い。中で何かあればすぐに呼ぶわ。",
        "location": "scene_tower_near.webp"
      }
    ],
    "combat": [],
    "post": [
      {
        "speaker": "",
        "text": "ミモザが先頭に立ち、塔の中に足を踏み入れる。",
        "location": "scene_in_tower.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "エリ、レオナクロス、アウラ、ジグが続く。",
        "location": "scene_in_tower.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "わぁ…すごく広い…",
        "location": "scene_in_tower.webp"
      },
      {
        "speaker": "エリ",
        "text": "あれって…",
        "location": "scene_in_tower.webp"
      },
      {
        "speaker": "",
        "text": "エリが塔の奥の古びた円盤を指さす。",
        "location": "scene_in_tower.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "足元の紋様は円盤に向かって続いている。",
        "location": "scene_in_tower.webp",
        "narration": true
      },
      {
        "speaker": "ミモザ",
        "text": "あそこが…中心なの？",
        "location": "scene_in_tower.webp"
      },
      {
        "speaker": "",
        "text": "ミモザが近づこうとしたそのとき―",
        "location": "scene_in_tower.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "塔が大きく揺れる。",
        "location": "scene_in_tower.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "ハハ…一筋縄では…いかねぇよな。",
        "location": "scene_in_tower.webp"
      }
    ]
  },
  "shooting_ch03_04": {
    "chapter": 3,
    "stageNo": 4,
    "chapterTitle": "旅立ち",
    "stageTitle": "つながり",
    "pre": [
      {
        "speaker": "",
        "text": "塔の中が激しく揺れ、大きな影が中央に降りてくる。",
        "location": "scene_remnant_03.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "ったく…いちいち邪魔しやがって。",
        "location": "scene_remnant_03.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "まるで円盤の守り神だね…",
        "location": "scene_remnant_03.webp"
      },
      {
        "speaker": "",
        "text": "エリがぎゅっと拳を握りしめる。",
        "location": "scene_remnant_03.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "アルノが外を相手してくれてる間に、オレらがこっちをやるぞ。",
        "location": "scene_remnant_03.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "よし、ミモザ！ボクたちも、戦うぞ！",
        "location": "scene_remnant_03.webp"
      }
    ],
    "combat": [],
    "post": [
      {
        "speaker": "",
        "text": "天使の姿をした巨影が崩れ落ち、塔の内部に静寂が戻る。",
        "location": "scene_remnant_03_rip.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "舞い上がる灰の中から、小さな光がひとつ、ふわりと浮かび上がった。",
        "location": "scene_remnant_03_rip.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "光はゆっくりと塔の奥へ漂い、\n幾重もの紋様が一点へと集まる、不思議な円盤の中へ吸い込まれていく。",
        "location": "scene_disk.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "――ドクン。\n円盤が、ひとつ脈打った。",
        "location": "scene_disk.webp",
        "narration": true
      },

           {
        "speaker": "ジグ",
        "text": "やっぱり…だんだん強くなってやがる…",
        "location": "scene_disk.webp"
      },

                 {
        "speaker": "ジグ",
        "text": "アルノは…無事か…？",
        "location": "scene_disk.webp"
      },

        {
        "speaker": "",
        "text": "振り返ると、アルノが足元の灰を払っている。",
        "location": "scene_in_tower.webp",
        "narration": true
      },
      {
        "speaker": "アルノ",
        "text": "外は片づいたが…すぐに湧いてくるかもしれない。\n…私はここにいる。奥を調べてくれ。",
        "location": "scene_in_tower.webp"
      },

      {
        "speaker": "",
        "text": "ジグは頷き、塔の奥へと向き直る。",
        "location": "scene_disk.webp",
        "narration": true
      },

      {
        "speaker": "",
        "text": "円盤は、まるで呼吸をするように、淡い光をゆっくりと明滅させている。",
        "location": "scene_disk.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "なんだか、あの円盤……生きてるみてぇだな。",
        "location": "scene_disk.webp"
      },
      {
        "speaker": "",
        "text": "一同は警戒しながら、ゆっくりと円盤へ近づいていく。",
        "location": "scene_disk.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "距離が縮まるにつれ、円盤の光は次第に強くなっていった。",
        "location": "scene_disk.webp",
        "narration": true
      },
      {
        "speaker": "ミモザ",
        "text": "私たちに……反応してる？",
        "location": "scene_disk.webp"
      },
      {
        "speaker": "",
        "text": "ミモザが恐る恐る手を伸ばし、円盤の中心へ触れる。",
        "location": "scene_disk.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "しかし、何も起こらない。",
        "location": "scene_disk.webp",
        "narration": true
      },
      {
        "speaker": "ミモザ",
        "text": "……なんともないわね。\nもしかして……",
        "location": "scene_disk.webp"
      },
      {
        "speaker": "",
        "text": "何かに気づいたように、ミモザがエリへ視線を向ける。",
        "location": "scene_disk.webp",
        "narration": true
      },
      {
        "speaker": "ミモザ",
        "text": "エリ。\nこの円盤の中心に、手をかざしてみてくれない？",
        "location": "scene_disk.webp"
      },
      {
        "speaker": "エリ",
        "text": "わ、私が……？",
        "location": "scene_disk.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "ええ。\n何かが起きるかもしれない。",
        "location": "scene_disk.webp"
      },
      {
        "speaker": "エリ",
        "text": "……うん。",
        "location": "scene_disk.webp"
      },
      {
        "speaker": "",
        "text": "エリが円盤の中心へ、恐る恐る手を伸ばす。",
        "location": "scene_disk.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "指先が触れた、その瞬間だった。",
        "location": "scene_disk_eri.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "円盤から放たれた光が幾筋にも枝分かれし、塔の壁面を一気に駆け巡る。",
        "location": "scene_disk_eri.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "……っ！！",
        "location": "scene_disk_eri.webp"
      },
      {
        "speaker": "",
        "text": "音が遠のく。\n塔も、ミモザたちの姿も、白い光の中へほどけていった。",
        "location": "scene_disk_eri.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "……ここ……は……？",
        "location": "scene_eri_white_world.webp"
      },
      {
        "speaker": "",
        "text": "何もない白の中で、ただひとつ。\n遠くから、自分ではない誰かの気配が伝わってくる。",
        "location": "scene_eri_white_world.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "……誰か、いる……？",
        "location": "scene_eri_white_world.webp"
      },
      {
        "speaker": "",
        "text": "・・・リ？\n聞こえ…　何か…る……？",
        "location": "scene_eri_white_world.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "誰かの声が、遠くから響いているように聞こえた。",
        "location": "scene_eri_white_world.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "…………",
        "location": "scene_whiteout.webp"
      },
      {
        "speaker": "",
        "text": "意識が遠のいていく。視界が徐々に白に包まれる。",
        "location": "scene_whiteout.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "束の間、エリの体が激しく揺さぶられる。",
        "location": "scene_whiteout.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "おい、エリ！\n大丈夫か！？何が起きてる！？",
        "location": "scene_whiteout.webp"
      },
      {
        "speaker": "",
        "text": "エリは円盤から手を離し、ジグに支えられるまま倒れ込む。",
        "location": "scene_eri_jig.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "円盤の光が緩やかに弱まり、やがて消えた。",
        "location": "scene_eri_jig.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "エリ！！",
        "location": "scene_eri_jig.webp"
      },
      {
        "speaker": "",
        "text": "エリの瞼がゆっくり開く。何度か瞬きをする。",
        "location": "scene_eri_jig.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "エリ！大丈夫？！",
        "location": "scene_eri_jig.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "エリ、今……何があったの？",
        "location": "scene_eri_jig.webp"
      },
      {
        "speaker": "エリ",
        "text": "何か…気配がした。遠くに…",
        "location": "scene_eri_jig.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "気配……やっぱり、ここは魂が集う、接続点のような場所なのかもしれないわ…",
        "location": "scene_disk_down.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "そしてエリは……この円盤を通して、遠くにある魂と接触できるのかも…",
        "location": "scene_disk_down.webp"
      },
      {
        "speaker": "エリ",
        "text": "接続点……",
        "location": "scene_disk_down.webp"
      },
      {
        "speaker": "",
        "text": "エリは、まだあたたかな感触の残る右手を静かに見つめる。",
        "location": "scene_disk_down.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "先ほど感じた誰かの気配は、もうどこにもない。\nそれでも、不思議な繋がりだけが胸の奥に残っていた。",
        "location": "scene_disk_down.webp",
        "narration": true
      }
    ]
  },

  "shooting_ch04_01": {
    "chapter": 4,
    "stageNo": 1,
    "chapterTitle": "呼び声",
    "stageTitle": "宿探し",
    "pre": [
      {
        "speaker": "アウラ",
        "text": "ねえエリ。本当に誰かの声が聞こえたの？",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "エリ",
        "text": "うん……はっきりじゃないけど。\n誰かが、遠くにいた。",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "円盤を通して、誰かとつながった。",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "エリ",
        "text": "……うん。",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "やっぱり、あの円盤はどこか別の場所に…",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "アウラ",
        "text": "どこの誰なんだろう？",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "",
        "text": "エリは返事をせず、自分の右手を見つめる。",
        "location": "scene_walk.webp",
        "narration": true
      },
      {
        "speaker": "アルノ",
        "text": "……来るぞ。",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "",
        "text": "白い霧の向こうから、小型レムナントの群れが姿を現す。",
        "location": "scene_walk.webp",
        "narration": true
      }
    ],
    "combat": [],
    "post": [
      {
        "speaker": "ジグ",
        "text": "ったく……いい加減どっかで休みたいぜ…",
        "location": "scene_walk.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "そうね。それに…しばらくこのあたりを調べたい。\nどこかに基地でも作れないかしら。",
        "location": "scene_walk.webp"
      },

           {
        "speaker": "アウラ",
        "text": "さっきの塔でいいんじゃない？",
        "location": "scene_walk.webp"
      },

            {
        "speaker": "レオナクロス",
        "text": "ダメだ…あそこは反応が強すぎる。\nなるべく反応が弱いところを探そう。屋根さえあればなんとかなる。",
        "location": "scene_walk.webp"
      },

                 {
        "speaker": "アウラ",
        "text": "そっか…レムナントが集まってくるかも…",
        "location": "scene_walk.webp"
      },

                  {
        "speaker": "レオナクロス",
        "text": "幸い…周囲には小さな建物がいくつかある。少し探索しよう！",
        "location": "scene_walk.webp"
      },

      {
        "speaker": "",
        "text": "一行は基地の候補になる場所を探すことにした。\nエリの右手には、まだ不思議な感触が残っていた。",
        "location": "scene_walk.webp",
        "narration": true
      }
    ]
  },

"shooting_ch04_02": {
    "chapter": 4,
    "stageNo": 2,
    "chapterTitle": "呼び声",
    "stageTitle": "先客",
    "pre": [
      {
        "speaker": "",
        "text": "しばらく歩いた先。\n半ば崩れた石造りの建物が、霧の中から姿を現す。",
        "location": "scene_chapter04_1.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "あ！あそこ、屋根がある！",
        "location": "scene_chapter04_1.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "…うん…反応も弱い。ここなら拠点にできそうだ。",
        "location": "scene_chapter04_1.webp"
      },
      {
        "speaker": "ジグ",
        "text": "やっと休めるのか…",
        "location": "scene_chapter04_1.webp"
      },
      {
        "speaker": "",
        "text": "建物に近づいたそのとき、\n入口の影で、何かがゆっくりと身を起こす。",
        "location": "scene_chapter04_1.webp",
        "narration": true
      },
      {
        "speaker": "アルノ",
        "text": "…先客がいるようだ。",
        "location": "scene_chapter04_1.webp"
      },
      {
        "speaker": "",
        "text": "現れたレムナントの身体を、薄い膜のような光が覆っている。",
        "location": "scene_chapter04_1.webp",
        "narration": true
      },
      {
        "speaker": "ミモザ",
        "text": "……また強化個体ね。",
        "location": "scene_chapter04_1.webp"
      },
      {
        "speaker": "ジグ",
        "text": "はぁ～…もう…バリア持ちかよ。ハズレだぜ。",
        "location": "scene_chapter04_1.webp"
      },
      {
        "speaker": "アルノ",
        "text": "青い方はお前たちに任せる…",
        "location": "scene_chapter04_1.webp"
      },
      {
        "speaker": "アウラ",
        "text": "ラジャー！",
        "location": "scene_chapter04_1.webp"
      }
    ],

    "combat": [
      {
        "cue": "barrier_break_wood",
        "speaker": "アルノ",
        "text": "……片付いたか。",
                "location": "scene_chapter04_1.webp"

      },
      {
        "cue": "barrier_break_water",
        "speaker": "アウラ",
        "text": "こっちも終わり！",
                "location": "scene_chapter04_1.webp"

      }
    ],

    "post": [
      {
        "speaker": "レオナクロス",
        "text": "よし、基地づくりを始めよう！",
        "location": "scene_chapter04_2.webp"
      },
      {
        "speaker": "",
        "text": "一行は建物の中を確かめる。\n壁は崩れかけているが、雨風を凌ぐには十分な環境だった。",
        "location": "scene_chapter04_2.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "使えそうな資材を集め、入口を補強する。\n最低限ではあるが、しばらく身を寄せる場所は確保できそうだった。",
        "location": "scene_chapter04_2.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "できたー！ここがしばらく私たちの家だね！",
        "location": "scene_chapter04_3.webp"
      },
      {
        "speaker": "ジグ",
        "text": "家ってほど立派じゃねぇけどな。",
        "location": "scene_chapter04_3.webp"
      },
            {
        "speaker": "レオナクロス",
        "text": "ハハハ…ま、即席にしては上等だよ。",
        "location": "scene_chapter04_3.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "それにしても…妙だな。",
        "location": "scene_chapter04_3.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……ええ。",
        "location": "scene_chapter04_3.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "少し前まで、強化個体なんて滅多に見なかった。\nここに来るまでの間に、明らかに数が増えている。",
        "location": "scene_chapter04_3.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……何かが変わり始めているのかもしれない。",
        "location": "scene_chapter04_3.webp"
      },
      {
        "speaker": "アルノ",
        "text": "…",
        "location": "scene_chapter04_3.webp"
      },
      {
        "speaker": "",
        "text": "その夜。一同は交代で眠りにつく。",
        "location": "scene_chapter04_4.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "久しぶりに屋根のあるところで眠れるぜ…",
        "location": "scene_chapter04_4.webp"
      },
      {
        "speaker": "アウラ",
        "text": "ごちそう…ごちそう…むにゃむにゃ",
        "location": "scene_chapter04_4.webp"
      },
      {
        "speaker": "",
        "text": "静寂の中、エリの耳に、かすかな川のせせらぎが届いた。\nどこからか聞こえてくるその音に身を委ねながら、エリはゆっくりと目を閉じた。",
        "location": "scene_chapter04_4.webp",
        "narration": true
      },
           {
        "transition": "fade_black",
        "text": ""
      }
    ]
  },

  "shooting_ch04_03": {
    "chapter": 4,
    "stageNo": 3,
    "chapterTitle": "呼び声",
    "stageTitle": "炎の壁",
    "pre": [

            {
        "speaker": "",
        "text": "翌朝。\n一行は拠点を出て、再び円盤の塔へ向かっていた。",
        "location": "scene_tower_far.webp",
        "narration": true
      },

  　　   {
        "speaker": "ミモザ",
        "text": "今日から、本格的に円盤を調べるわ。\nどこかに繋がっているとしたら…何か重要な発見があるかもしれないわ。",
        "location": "scene_tower_far.webp"
      },

        　　   {
        "speaker": "レオナクロス",
        "text": "しばらくはここに定住だな。",
        "location": "scene_tower_far.webp"
      },

              　　   {
        "speaker": "アウラ",
        "text": "あ…！あれ！",
        "location": "scene_tower_far.webp"
      },

      {
        "speaker": "",
        "text": "塔へ続く道を塞ぐように、二体の小型レムナントが立ちはだかる。\nその全身は、赤い炎のような膜に覆れている。",
        "location": "scene_tower_far.webp",
        "narration": true
      },
      {
        "speaker": "ミモザ",
        "text": "赤…",
        "location": "scene_tower_far.webp"
      },
      {
        "speaker": "ジグ",
        "text": "赤っつーことは…火か。\nじゃ、水の出番だ。\n……って、水なんてオレらにいねぇぞ。",
        "location": "scene_tower_far.webp"
      },
      {
        "speaker": "アルノ",
        "text": "…",
        "location": "scene_tower_far.webp"
      }
    ],
    "combat": [
      {
        "cue": "immune_arno",
        "speaker": "エリ",
        "text": "……駄目！通らない！",
                "location": "scene_tower_far.webp"
      },
      {
        "cue": "immune_aura",
        "speaker": "アウラ",
        "text": "私もだめ！全然効いてない！",
                "location": "scene_tower_far.webp"
      },
      {
        "cue": "immune_eri",
        "speaker": "アルノ",
        "text": "……",
                "location": "scene_tower_far.webp"
      },
      {
        "cue": "all_immune",
        "speaker": "ジグ",
        "text": "チッ……完全に手詰まりじゃねぇか。",
                "location": "scene_tower_far.webp"
      },
            {
        "cue": "all_immune",
        "speaker": "ジグ",
        "text": "レオナ！何か手は？",
                "location": "scene_tower_far.webp"
      },
                  {
        "cue": "all_immune",
        "speaker": "レオナクロス",
        "text": "相性そのものは、こっちじゃ覆せない…！",
                "location": "scene_tower_far.webp"
      },

      　 {
        "cue": "all_immune",
        "speaker": "レオナクロス",
        "text": "ボクのフォトンバスターもまるでダメだ…",
                "location": "scene_tower_far.webp"
      },

        {
        "cue": "arno_cover",
        "speaker": "アルノ",
        "text": "倒せないなら、遠くへ引き離す…お前たちは下がれ。",
                "location": "scene_tower_far.webp"
      },
      {
        "cue": "arno_cover_leona1",
        "speaker": "レオナクロス",
        "text": "アルノ、無茶だ！",
                "location": "scene_tower_far.webp"
      },

            {
        "cue": "arno_cover_leona2",
        "speaker": "レオナクロス",
        "text": "こいつら、スタミナは無尽蔵だ…地獄の底までついてくるぞ！",
                "location": "scene_tower_far.webp"
      },

      {
        "cue": "eri_despair",
        "speaker": "エリ",
        "text": "ど…どうしたら…",
                "location": "scene_tower_far.webp"
      },
            {
        "cue": "mimoza_despair",
        "speaker": "ミモザ",
        "text": "……",
        "location": "scene_tower_far.webp"
      },
      {
        "cue": "eri_hears_voice",
        "speaker": "",
        "text": "ミモザも、思考を巡らしているが、手詰まりの様子。",
                        "location": "scene_tower_far.webp",

        "narration": true
      },
      {
        "cue": "eri_hears_voice",
        "speaker": "",
        "text": "――そのとき。\nエリの耳の奥で、かすかなせせらぎが聞こえた。",
                                "location": "scene_tower_far.webp",
        "narration": true
      },

            {
        "cue": "eri_call_1",
        "speaker": "エリ",
        "text": "……！！",
                                "location": "scene_tower_far.webp",
      },

      {
        "cue": "eri_call_1",
        "speaker": "エリ",
        "text": "……この音……もしかして…",
                                "location": "scene_tower_far.webp",
      },
      {
        "cue": "eri_call_2",
        "speaker": "エリ",
        "text": "……聞こえる……？",
                                "location": "scene_tower_far.webp",
      },

            {
        "cue": "eri_call_3",
        "speaker": "エリ",
        "text": "お願い……力を貸して…",
                                "location": "scene_tower_far.webp",
      },

      {
        "cue": "summon_lyune",
        "speaker": "",
        "text": "――水音。\nエリの胸元から淡い光が広がり、水面のような揺らぎが生まれた。",
                                "location": "scene_tower_far.webp",
        "narration": true
      },
      {
        "cue": "barrier_break",
        "speaker": "",
        "text": "青い光が走る。\n火の膜が大きく揺らぎ、砕け散った。",
                                "location": "scene_tower_far.webp",
        "narration": true
      },
      {
        "cue": "aura_surprised",
        "speaker": "アウラ",
        "text": "えっ……？！なにが起きたの？！",
                                "location": "scene_tower_far.webp",
      }
    ],
    "post": [
      {
        "speaker": "",
        "text": "火の膜を失ったレムナントが崩れ、白い風の中へ消えていく。",
        "location": "scene_ch04_03.webp",
                                "location": "scene_tower_far.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "その向こうに、水色の光をまとった少女が立っていた。",
        "location": "scene_ch04_03_lyune.webp",
                                "location": "scene_tower_far.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "助けてくれて……ありがとう。\nあなたは……？",
        "location": "scene_ch04_03_lyune.webp"
      },
      {
        "speaker": "？？？",
        "text": "……リュネ…",
        "location": "scene_ch04_03_lyune.webp"
      },
      {
        "speaker": "エリ",
        "text": "リュネ……。",
        "location": "scene_ch04_03_lyune.webp"
      },
      {
        "speaker": "リュネ",
        "text": "あなたたちが…呼んだの？",
        "location": "scene_ch04_03_lyune.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "声が……届いたの？",
        "location": "scene_ch04_03_lyune.webp"
      },
      {
        "speaker": "",
        "text": "ミモザはエリとリュネを交互に見つめる。",
        "location": "scene_ch04_03_lyune.webp",
        "narration": true
      },
            {
        "speaker": "ミモザ",
        "text": "……もしかして…",
        "location": "scene_ch04_03_lyune.webp"
      }

    ]
  },

  "shooting_ch04_04": {
    "chapter": 4,
    "stageNo": 4,
    "chapterTitle": "呼び声",
    "stageTitle": "水音",
    "pre": [
      {
        "speaker": "アウラ",
        "text": "リュネっていうんだ！\nねえねえ、どこから来たの？",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "リュネ",
        "text": "……分からない。",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "リュネ",
        "text": "すごくあたたかいところで……眠ってた。遠くの声に呼ばれて…\n気づいたら、ここにいた。",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "エリ",
        "text": "……声？",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "リュネ",
        "text": "うん。",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……待って。",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "",
        "text": "ミモザが、はっとしたようにエリを見る。",
        "location": "scene_ch04_04.webp",
        "narration": true
      },
      {
        "speaker": "ミモザ",
        "text": "……違ったのね。",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "接続点は、円盤じゃない。",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "エリ",
        "text": "え……？",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "エリ。\nあなた自身が、誰かと誰かを繋ぐ接続点なのかもしれない。",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "円盤は、その力を開くきっかけだった……",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "少なくとも、今起きた現象を見る限りはね。",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "",
        "text": "その瞬間、周囲の紋様が一斉に光を放つ。",
        "location": "scene_ch04_04.webp",
        "narration": true
      },
      {
        "speaker": "アルノ",
        "text": "……囲まれた。",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "",
        "text": "リュネの出現に呼応するように、周囲から大量のレムナントが姿を現す。",
        "location": "scene_ch04_04.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "話はあとだ！来るぞ！",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "リュネ",
        "text": "……私も戦う。",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "エリ",
        "text": "うん……お願い！",
        "location": "scene_ch04_04.webp"
      }
    ],
    "combat": [
      {
        "cue": "lyune_join_1",
        "speaker": "リュネ",
        "text": "エリ、そっちは任せて。",
                "location": "scene_ch04_04.webp"
      },
      {
        "cue": "lyune_join_2",
        "speaker": "エリ",
        "text": "うん！",
                "location": "scene_ch04_04.webp"
      }
    ],
    "post": [
      {
        "speaker": "",
        "text": "最後のレムナントが崩れ、辺りに静けさが戻る。",
        "location": "scene_ch04_04.webp",
        "narration": true
      },
      {
        "speaker": "アウラ",
        "text": "やったー！リュネ、すごいね！",
        "location": "scene_ch04_04.webp"
      },
      {
        "speaker": "リュネ",
        "text": "……。",
        "location": "scene_ch04_04_lyune_fade.webp"
      },
      {
        "speaker": "",
        "text": "リュネの輪郭が、淡い光の粒へとほどけ始める。",
        "location": "scene_ch04_04_lyune_fade.webp",
        "narration": true
      },
      {
        "speaker": "エリ",
        "text": "リュネ……？！",
        "location": "scene_ch04_04_lyune_fade.webp"
      },
      {
        "speaker": "リュネ",
        "text": "たぶん……長くは、ここにいられないみたい。",
        "location": "scene_ch04_04_lyune_fade.webp"
      },
      {
        "speaker": "エリ",
        "text": "また……会える？",
        "location": "scene_ch04_04_lyune_fade.webp"
      },
      {
        "speaker": "リュネ",
        "text": "…エリが呼んでくれたら。\nきっと。",
        "location": "scene_ch04_04_lyune_fade.webp"
      },
      {
        "speaker": "エリ",
        "text": "…そっか…またね。リュネ。",
        "location": "scene_ch04_04_lyune_fade.webp"
      },
      {
        "speaker": "",
        "text": "リュネの身体が光に包まれ、静かに消えていく。",
        "location": "scene_ch04_04_lyune_fade.webp",
        "narration": true
      },
      {
        "speaker": "",
        "text": "同時に、エリの膝から少しだけ力が抜ける。",
        "location": "scene_ch04_05.webp",
        "narration": true
      },
      {
        "speaker": "ジグ",
        "text": "おい……大丈夫か？",
        "location": "scene_ch04_05.webp"
      },
      {
        "speaker": "エリ",
        "text": "うん……ちょっと疲れただけ。",
        "location": "scene_ch04_05.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "呼び出せても、長時間の接続は難しい……ということね。",
        "location": "scene_ch04_05.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "だが、これは大発見だぞ。\nエリを通して、離れた存在をこちら側へ呼び出せる。",
        "location": "scene_ch04_05.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "ええ。\nただし、エリの負担もあるでしょう。無理はさせられないわ。",
        "location": "scene_ch04_05.webp"
      },
      {
        "speaker": "エリ",
        "text": "……",
        "location": "scene_ch04_05.webp"
      },
      {
        "speaker": "",
        "text": "エリは、空に消えゆく光の粒子をしばらく見つめていた。",
        "location": "scene_ch04_05.webp",
        "narration": true
      }
    ]
  },
"shooting_ch05_01": {
  "chapter": 5,
  "stageNo": 1,
  "chapterTitle": "円環",
  "stageTitle": "沈黙する円盤",
  "stageType": "novel",
  "pre": [
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "翌日。一行は二手に分かれていた。ジグとアウラはレオナクロスの装置を手に塔の周りを調査し、アルノは塔の上層から辺りを見張っている。",
      "location": "scene_ch_05_aruno1.webp",
      "narration": true
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "塔・内部。中央には、かつてエリに反応した円盤がある。",
      "location": "scene_disk.webp",      
      "narration": true
    },
    {
      "speaker": "ミモザ",
      "text": "……やっぱり、何も起こらないわね",
      "left": "",
      "right": "ミモザ",
      "location": "scene_disk_down.webp",          
    },
    {
      "speaker": "エリ",
      "text": "うん……",
      "left": "エリ",
      "right": "",
            "location": "scene_disk_down.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "あれ以来、エリが触れても反応しない。",
      "left": "",
      "right": "ミモザ",
      "location": "scene_disk_down.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "もちろん、私たちが触っても同じ。",
      "left": "",
      "right": "ミモザ",
      "location": "scene_disk_down.webp",
    },
    {
      "speaker": "エリ",
      "text": "なんだったんだろう、あの時の光……",
      "left": "エリ",
      "right": "",
      "location": "scene_disk_down.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "さあね。気まぐれだったんじゃないかな？",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_disk_down.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "そんな適当な……",
      "left": "",
      "right": "ミモザ",
      "location": "scene_disk_down.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "反応しないものを眺めていても、研究は一歩も進まないよ。",
      "left": "レオナクロス",
      "right": "",
        "location": "scene_disk_down.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "ボクはちょっと、塔の周りを見てくる！",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_disk_down.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "レオナクロスが塔の外へ出ていく。",
      "narration": true,
      "location": "scene_tower_middle.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "塔・裏手。風の音。外壁には、長い年月を経た傷や亀裂が刻まれている。",
      "narration": true,
      "location": "scene_tower_middle.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "……おや？",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_tower_middle.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "壁の一角に、奇妙な円形の紋様がある。",
      "narration": true,
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "なんだ…これは。",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "指先で紋様に触れる。ブゥン…円形の輪がわずかに回転する。",
      "narration": true,
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "……へ？",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "もう一度触れる。ブゥン。",
      "narration": true,
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "これは…！",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "ミモザ！ エリ！ ちょっと来てくれ！",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "大発見だよ！",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "塔の内側に、レオナクロスの声が響く。",
      "location": "scene_ch05_02.webp",
      "narration": true
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "塔・上層。アルノが一瞬だけ下に目を向け、すぐにまた遠くへ視線を戻した。",
      "narration": true,
      "location": "scene_ch_05_aruno2.webp",
    }
  ]
},
  "shooting_ch05_02": {
  "chapter": 5,
  "stageNo": 2,
  "chapterTitle": "円環",
  "stageTitle": "いびつな輪",
  "stageType": "puzzle",
  "ringCount": 3,
  "pre": [
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "塔・外壁。",
      "narration": true,
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "エリ",
      "text": "どうしたの、レオナ？",
      "left": "",
      "right": "エリ",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "これを見たまえ！",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "……円形の紋様？",
      "left": "",
      "right": "ミモザ",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "触ると回るんだよ。ほら。",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "レオナクロスが輪の一つに触れる。輪が回る。",
      "narration": true,
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "エリ",
      "text": "あっ、本当だ。",
      "left": "エリ",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "……なるほど。内側の輪と連動しているのね。",
      "left": "",
      "right": "ミモザ",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "よく見ると、それぞれの輪に線が刻まれてる。",
      "left": "",
      "right": "ミモザ",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "エリ",
      "text": "でも、途中で途切れてるね。",
      "left": "エリ",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "ええ。何かの仕掛けに見えるわ。",
      "left": "",
      "right": "ミモザ",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "……昔、こんなおもちゃがあったような。",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "外側から中心まで、線をつなげればいいんじゃないかな。",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "やってみましょう。",
      "left": "",
      "right": "ミモザ",
      "location": "scene_ch05_02.webp",
    }
  ],
  "post": [
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "途切れていた線が一本につながる。淡い金色の光が円盤に広がる。",
      "narration": true,
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "ガチャン！ 塔の内部から、重いものが動くような音が響く。",
      "narration": true,
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "エリ",
      "text": "…………",
      "left": "エリ",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "…………",
      "left": "",
      "right": "ミモザ",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "…………ん？",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "エリ",
      "text": "……何も起きないね。",
      "left": "エリ",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "いや、今、絶対なにか……",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "そうね……何かが外れたような音。",
      "left": "",
      "right": "ミモザ",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "ミモザが塔の壁に手を当てる。",
      "narration": true,
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "音は、塔の内側から聞こえたわ。",
      "left": "",
      "right": "ミモザ",
      "location": "scene_ch05_02.webp",
    },
    {
      "speaker": "エリ",
      "text": "あっ……もしかして！",
      "left": "エリ",
      "right": "",
      "location": "scene_ch05_02.webp",
    }
  ]
},
  "shooting_ch05_03": {
  "chapter": 5,
  "stageNo": 3,
  "chapterTitle": "円環",
  "stageTitle": "もう一つの円環",
  "stageType": "puzzle",
  "ringCount": 4,
  "pre": [
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "塔・内部。",
      "narration": true,
      "location": "scene_in_tower.webp",
    },
    {
      "speaker": "エリ",
      "text": "塔の内側にも、同じ仕掛けがあるんじゃないかな？",
      "left": "エリ",
      "right": "",
      "location": "scene_in_tower.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "……なるほど。",
      "left": "",
      "right": "ミモザ",
      "location": "scene_in_tower.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "外と内、二つで一つの鍵になっているのかもしれないわね。",
      "left": "",
      "right": "ミモザ",
      "location": "scene_in_tower.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "じゃあ、さっきの音は、外側の鍵が外れた音ってことかな？",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_in_tower.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "可能性はあるわね。",
      "left": "",
      "right": "ミモザ",
      "location": "scene_in_tower.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "三人が塔の内壁を調べる。",
      "narration": true,
      "location": "scene_in_tower.webp",
    },
    {
      "speaker": "エリ",
      "text": "……あった。",
      "left": "エリ",
      "right": "",
      "location": "scene_in_tower.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "外壁と同じ位置に、よく似た円形の紋様を見つける。",
      "narration": true,
      "location": "scene_ch05_03.webp",
    },
        {
      "speaker": "エリ",
      "text": "こっちも、同じ仕組みかな。",
      "left": "エリ",
      "right": "",
      "location": "scene_ch05_03.webp",
    },

    {
      "speaker": "レオナクロス",
      "text": "よし、ちょっとやってみよう。",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_03.webp",
    }
  ],
  "post": [
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "途切れていた線が一本につながる。淡い金色の光が円盤に広がる。",
      "narration": true,
      "location": "scene_ch05_03.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "ガチャン！ 円環の中央部分が、壁の奥へ沈み込む。",
      "narration": true,
      "location": "scene_ch05_03.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "おっ！",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_03.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "ゴトン……紋様のあった石板が下へ落ちる。",
      "narration": true,
      "location": "scene_ch05_03.webp",
    },
    {
      "speaker": "エリ",
      "text": "わっ……！",
      "left": "エリ",
      "right": "",
      "location": "scene_ch05_03.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "壁の奥に小さな空洞が現れ、薄い紙のようなものが一枚、ひらりと舞い落ちる。",
      "narration": true,
      "location": "scene_ch05_04.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "……何かしら？",
      "left": "",
      "right": "ミモザ",
      "location": "scene_ch05_04.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "エリがそっと拾い上げる。",
      "narration": true,
      "location": "scene_ch05_04.webp",
    },
    {
      "speaker": "エリ",
      "text": "これ……",
      "left": "エリ",
      "right": "",
      "location": "scene_ch05_04.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "古びた紙には、いくつもの線と奇妙な印が描かれている。",
      "narration": true,
      "location": "scene_ch05_04.webp",
    },
    {
      "speaker": "エリ",
      "text": "……なにこれ？",
      "left": "エリ",
      "right": "",
      "location": "scene_ch05_04.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "うーん…",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_04.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "……見せて。",
      "left": "",
      "right": "ミモザ",
      "location": "scene_ch05_04.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "ミモザが紙を覗き込む。",
      "narration": true,
      "location": "scene_ch05_04.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "…………",
      "left": "",
      "right": "ミモザ",
      "location": "scene_ch05_04.webp",
    },
    {
      "speaker": "ミモザ",
      "text": "……線と、印……何かの図形かしら。読めないわね。",
      "left": "",
      "right": "ミモザ",
      "location": "scene_ch05_04.webp",
    },
    {
      "speaker": "レオナクロス",
      "text": "こんなところに、わざわざ隠してあったのかい？",
      "left": "レオナクロス",
      "right": "",
      "location": "scene_ch05_04.webp",
    },
    {
      "speaker": "エリ",
      "text": "何が描いてあるんだろう……",
      "left": "エリ",
      "right": "",
      "location": "scene_ch05_04.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "三人は、古びた紙を見つめる。",
      "narration": true,
      "location": "scene_ch05_04.webp",
    }
  ]
},
  "shooting_ch05_04": {
  "chapter": 5,
  "stageNo": 4,
  "chapterTitle": "円環",
  "stageTitle": "二人きりの巡回",
  "pre": [
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "塔の周辺。同じころ。ジグとアウラは塔の周りを歩いていた。ジグの手には、レオナクロスから渡された小さな探知機。",
      "narration": true,
      "location": "scene_walk.webp",
    },
    {
      "speaker": "アウラ",
      "text": "ジグちゃん、反応どう？",
      "left": "アウラ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "ジグ",
      "text": "……この辺は、まだ弱いな。",
      "left": "ジグ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "アウラ",
      "text": "レオナ、紋様の反応を調べてきてって言ってたけど、ついでにレムナントの欠片も拾ってきてって。",
      "left": "アウラ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "ジグ",
      "text": "強化デバイスの材料になるんだと。……人使い荒いぜ。",
      "left": "ジグ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "アウラ",
      "text": "ねえ、ジグちゃん。二人だけで動くのって、ちょっとまずくない？",
      "left": "アウラ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "ジグ",
      "text": "……だな。オレもお前も木属性だし。",
      "left": "ジグ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "アウラ",
      "text": "属性バリアのやつが来たら……",
      "left": "アウラ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "ジグ",
      "text": "終わりだぜ。",
      "left": "ジグ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "アウラ",
      "text": "でもでも、レオナの緊急装置があるから、何かあったら誰か来てくれるよ！",
      "left": "アウラ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "ジグ",
      "text": "……ま、前もアルノが来てくれたしな。",
      "left": "ジグ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "しばらく、二人は黙って歩く。",
      "narration": true,
      "location": "scene_walk.webp",
    },
    {
      "speaker": "ジグ",
      "text": "それにしても、リュネってのは、なんだったんだろうな。",
      "left": "ジグ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "アウラ",
      "text": "うん……どこから来て、どこに消えちゃったんだろ。",
      "left": "アウラ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "ジグ",
      "text": "エリが呼んだら来た、ってのもな……",
      "left": "ジグ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "アウラ",
      "text": "また会えるといいね。",
      "left": "アウラ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "ピピッ。探知機が強く反応する。",
      "narration": true,
      "location": "scene_walk.webp",
    },
    {
      "speaker": "アウラ",
      "text": "あ……ジグちゃん、あの建物の裏。すごく反応が強い。",
      "left": "アウラ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "ジグ",
      "text": "……これは。",
      "left": "ジグ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "建物の影から、レムナントが三体、ゆっくりと姿を現す。",
      "narration": true,
      "location": "scene_walk.webp",
    },
    {
      "speaker": "ジグ",
      "text": "準備はいいか？",
      "left": "ジグ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "アウラ",
      "text": "うん！",
      "left": "アウラ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "ジグ",
      "text": "属性バリアは……なしだ。いける！",
      "left": "ジグ",
      "right": "",
      "location": "scene_walk.webp",
    }
  ],
  "combat": [
    {
      "speaker": "ジグ",
      "text": "なかなか元気だな……アウラ、離れんなよ！",
      "left": "ジグ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "アウラ",
      "text": "わかってる！",
      "left": "アウラ",
      "right": "",
      "location": "scene_walk.webp",
    }
  ],
  "post": [
    {
      "speaker": "ジグ",
      "text": "……よし、終わった。",
      "left": "ジグ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "アウラ",
      "text": "はぁ……疲れたぁ……",
      "left": "アウラ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "アウラが灰の中から、小さな欠片を拾い上げる。",
      "narration": true,
      "location": "scene_walk.webp",
    },
    {
      "speaker": "アウラ",
      "text": "欠片、あったよ！ これでレオナも喜ぶね。",
      "left": "アウラ",
      "right": "",
      "location": "scene_walk.webp",
    },
    {
      "speaker": "ジグ",
      "text": "ああ。……戻るか。",
      "left": "ジグ",
      "right": "",
      "location": "scene_walk.webp",
    },

    {
      "speaker": "アウラ",
      "text": "おなかすいたぁ…",
      "left": "アウラ",
      "right": "",
      "location": "scene_walk.webp",
    },

    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "塔・上層。アルノが周囲を見張っている。",
      "narration": true,
      "location": "scene_ch_05_aruno2.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "風が、灰を細く巻き上げている。",
      "narration": true,
      "location": "scene_ch_05_aruno2.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "人影も、足音も、気配さえもない。",
      "narration": true,
      "location": "scene_ch_05_aruno2.webp",
    },
    {
      "speaker": "？？？",
      "text": "ねえ。",
      "left": "",
      "right": "",
      "location": "scene_ch_05_aruno2.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "不意に、背後から声がした。",
      "narration": true,
      "location": "scene_ch_05_aruno2.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "アルノの眉が、ぴくりと動く。ゆっくりと背後に視線を移す。",
      "narration": true,
      "location": "scene_ch_05_aruno2.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "塔の上、少し離れたところに、三つの人影が立っていた。",
      "narration": true,
      "location": "scene_ch_05_aruno2.webp",
    },
        {
      "speaker": "アルノ",
      "left": "",
      "right": "アルノ",
      "text": "……",
      "location": "scene_ch_05_aruno2.webp",
    },
    {
      "speaker": "",
      "left": "",
      "right": "",
      "text": "アルノは、その三人をじっと見つめる。",
      "narration": true,
      "location": "scene_ch_05_aruno2.webp",
    },
    {
      "speaker": "？？？",
      "text": "キミ、なにしてるの？",
      "left": "",
      "right": "",
      "location": "scene_ch_05_aruno3.webp",
    }
  ]
},
  "shooting_ch06_01": {
    "chapter": 6,
    "stageNo": 1,
    "chapterTitle": "来訪者",
    "stageTitle": "気配",
    "stageType": "novel",
    "pre": [
      {
        "speaker": "アルノ",
        "text": "……見張りだ。",
        "left": "アルノ",
        "right": "",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "？？？",
        "text": "見張り？へぇ…マジメだね。",
        "left": "",
        "right": "",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "？？？",
        "text": "ト…トイフェル…やっぱりちょっと失礼だったんじゃ…",
        "left": "",
        "right": "",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "アルノの右手は、すでに腰のナイフにかかっている。",
        "narration": true,
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "？？？",
        "text": "ご、ごめんなさい…争うつもりはないんです…",
        "left": "",
        "right": "",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "アルノ",
        "text": "……何の用だ。",
        "left": "アルノ",
        "right": "",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "アイナ",
        "text": "私は…アイナといいます…",
        "left": "",
        "right": "アイナ",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "トイフェルだ。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "ベロニカ",
        "text": "マイネェムイズ…ベロニカァ！",
        "left": "",
        "right": "ベロニカ",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "君も、漂流者かい？",
        "left": "",
        "right": "トイフェル",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "アルノ",
        "text": "漂流者……",
        "left": "アルノ",
        "right": "",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "エネルギー反応の種類が、僕たちと同じだ。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "アルノ",
        "text": "……",
        "left": "アルノ",
        "right": "",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "アルノは三人を順に見る。敵意は感じない。",
        "narration": true,
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "他にも4人…いや、5人か？",
        "left": "",
        "right": "トイフェル",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "トイフェルが、わずかに首をかしげる。",
        "narration": true,
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "下にいる…君の仲間かい？",
        "left": "",
        "right": "トイフェル",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "アルノ",
        "text": "……そうだ。",
        "left": "アルノ",
        "right": "",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "アイナ",
        "text": "やっと…",
        "left": "",
        "right": "アイナ",
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "トイフェルの瞳が輝く。",
        "narration": true,
        "location": "scene_ch_05_aruno3.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "…ぜひ、情報交換がしたい。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_ch_05_aruno3.webp"
      }
    ]
  },
  "shooting_ch06_02": {
    "chapter": 6,
    "stageNo": 2,
    "chapterTitle": "来訪者",
    "stageTitle": "吉か凶か",
    "stageType": "minigame",
    "pre": [
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "拠点・入口。巡回を終えたジグとアウラも戻ってきている。",
        "narration": true,
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アウラ",
        "text": "……え。なに……？ 誰！？",
        "left": "アウラ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アルノ",
        "text": "塔の上で会った。",
        "left": "アルノ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アルノ",
        "text": "我々と同じ境遇…とのことだ。",
        "left": "アルノ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アイナ",
        "text": "私がアイナで…こっちがトイフェル、あの子がベロニカです…",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……本当に、いたのね。私たちのほかにも。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "ミモザの仮説、大当たりじゃないか！",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アイナ",
        "text": "仮説…？",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "紋様を調べていたら、レムナントとは違う……人に近い性質の反応が見つかったの。私たちと同じように、この世界に迷い込んだ誰かがいるんじゃないかって。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "ザッツグレイト。君は研究者かい？",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "ええ…そうよ。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "エリ",
        "text": "あの……あなたたちも、気づいたらここにいたの？",
        "left": "エリ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アイナ",
        "text": "はい……",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "ベロニカ",
        "text": "目が覚めてからァ…ずーっと一緒ォ！",
        "left": "",
        "right": "ベロニカ",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "僕たちも、同じような人間がいるんじゃないかと思ってね。旅を続けてきた。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アルノ",
        "text": "なぜ…わざわざ塔の上にいる私に声をかけた。",
        "left": "アルノ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "そりゃあ、5人より1人のほうが安全だろう。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アルノ",
        "text": "…お前たち、一切の気配がなかった。",
        "left": "アルノ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "アルノが疑いの目を向ける。",
        "narration": true,
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "アイナの力だよ。隠密が得意なんだ。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アイナ",
        "text": "気配だけ…姿までは消せません。",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "つまり、視界にさえ入らなければ、誰にも気づかれない。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "気配を完全に…？ それは興味深い！ ぜひ見せてくれたまえ！",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アウラ",
        "text": "見たい見たい！ ジグちゃんで試してみてよ！",
        "left": "アウラ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "ジグ",
        "text": "な、なんでオレなんだよ。",
        "left": "ジグ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "ちょうどいい。僕たちに利用価値を感じてもらえるかもしれない。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "アイナ、お願い。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アイナ",
        "text": "うん……",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_1.webp"
      }
    ],
    "post": [
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "トン。ジグの肩に、小さな手が触れる。",
        "narration": true,
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "ジグ",
        "text": "…！？",
        "left": "ジグ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アイナ",
        "text": "あ、あの…すみません…",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "なんて便利な能力…",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "率直に言う。僕たちの目的は、協力者だ。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "お願いできないだろうか。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "ジグ",
        "text": "……ダメだ。",
        "left": "ジグ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "一瞬、空気が張り詰める。",
        "narration": true,
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アウラ",
        "text": "ジ、ジグちゃん……",
        "left": "アウラ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "ジグ",
        "text": "いきなり出てきて、どう考えても怪しさマックスだろ。",
        "left": "ジグ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アイナ",
        "text": "……もっともなお話です。",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "疑われるのは想定済みだ。ダメなら、無理にとは言わない、けど…",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "できるだけ全てを開示する。協力者が必要なんだ。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "もう少し、聞いてみてもいいんじゃないか？ボクたちも戦力が必要だっただろ。",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "アルノ",
        "text": "……少なくとも、敵意は感じない。",
        "left": "アルノ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "ジグ",
        "text": "それも……いかがわしい能力の仕業かもしれないぜ。",
        "left": "ジグ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "ピピピッ。レオナクロスの腰で、探知機がけたたましく鳴る。",
        "narration": true,
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "反応だ……塔の南側！ 強化個体、それも複数！",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "属性は？",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "……赤が2つ。緑が1つ。",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "そんなことまで分かるのかい！？",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "ボクの趣味だ。",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "レオナクロスが得意げに答える。",
        "narration": true,
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "へぇ…ますます興味がわいてくるね。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "ピピピッ。探知機のアラートが鳴り続けている。",
        "narration": true,
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "エリ",
        "text": "とりあえず…向かおう！",
        "left": "エリ",
        "right": "",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……ねえ。あなたたちの中に、水の属性は…？",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "トイフェルとアイナの視線が、いつの間にかアウラとじゃれあっているベロニカに向いた。",
        "narration": true,
        "location": "scene_chapter06_1.webp"
      },
      {
        "speaker": "ベロニカ",
        "text": "んー？？ どうしたァー？？",
        "left": "",
        "right": "ベロニカ",
        "location": "scene_chapter06_1.webp"
      }
    ]
  },
  "shooting_ch06_03": {
    "chapter": 6,
    "stageNo": 3,
    "chapterTitle": "来訪者",
    "stageTitle": "火を払う水",
    "pre": [
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "塔・南側。灰の舞う道の先に、レムナントが三体、ゆらりと浮かんでいる。",
        "narration": true,
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "アイナ",
        "text": "私たちも、属性相性には苦労しました…",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "アイナがいなきゃ、とっくのとうに灰になってたよ。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "アルノ",
        "text": "緑は私がやる。",
        "left": "アルノ",
        "right": "",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "赤いのは……任せていいのね？",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "ベロニカ",
        "text": "まっかせなさァい！",
        "left": "",
        "right": "ベロニカ",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "ベロニカ、あまり暴れすぎないようにね。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_2.webp"
      }
    ],
    "post": [
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "最後のレムナントが崩れ、膜の欠片が灰とともに風に散っていく。",
        "narration": true,
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "アウラ",
        "text": "ベロニカ強ーい！！",
        "left": "アウラ",
        "right": "",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "ベロニカ",
        "text": "キャハハハ！！",
        "left": "",
        "right": "ベロニカ",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "戦い慣れている……",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "……少しは、信用してもらえたかな？",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "お互いに、利はあると判断するわ。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "ジグ",
        "text": "……チッ。アルノ、厳重監視だぜ。",
        "left": "ジグ",
        "right": "",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "ありがとう。君たちにもきっとメリットがあるはずだ。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "少し離れたところでは、アウラとベロニカがまたじゃれあっている。",
        "narration": true,
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……それと、さっきの“情報交換”の話だけど。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "まずは、そちらから聞かせてもらえる？",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "もちろん。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "僕たちが目を覚ましたのは、崩れた塔の根元だった。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_2.webp"
      },
            {
        "speaker": "ミモザ",
        "text": "崩れた塔……",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_2.webp"
      },
　　　  {
        "speaker": "トイフェル",
        "text": "まぁ。このあたりと似たような感じさ。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "ただ、その塔には一つ特徴的なものがあった。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_2.webp"
      },

            {
        "speaker": "レオナクロス",
        "text": "特徴的なもの？",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_2.webp"
      },

            {
        "speaker": "トイフェル",
        "text": "崩れた塔の根本に、不思議な印があった。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_2.webp"
      },

      {
        "speaker": "アイナ",
        "text": "……こんな形の…印。",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_2.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "アイナが、灰の積もった地面に指で印を描いていく。",
        "narration": true,
        "location": "scene_chapter06_3.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……！",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_3.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "ミ…ミモザ、これって……",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_3.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "ミモザは黙って懐から古い紙を取り出し、二人の前に広げた。",
        "narration": true,
        "location": "scene_chapter06_3.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "紙の上に散らばる印。地面に描かれた形と極めて似ている。",
        "narration": true,
        "location": "scene_chapter06_4.webp"
      },
      {
        "speaker": "アイナ",
        "text": "……同じ、形です…",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_4.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "……驚いたな。どこでこれを？",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_4.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "さっきあなたたちが登っていた塔の中で、見つけたの。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_4.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "……実は、僕たちも似たものを持っている。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_4.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "トイフェルが懐から、折りたたまれた古い紙を取り出す。",
        "narration": true,
        "location": "scene_chapter06_5.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "ここに来る途中、寂れた聖堂で拾ったんだ。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_5.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "二枚の紙が並べられる。図形の配置、紙の古び方もよく似ている。けれど、描かれた図形はまるで違っていた。",
        "narration": true,
        "location": "scene_chapter06_5.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "ということは、この印は……塔の位置を表している？",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_5.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……かもしれない。でも、位置関係が分からないわ。現在地も…",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_5.webp"
      },
      {
        "speaker": "トイフェル",
        "left": "",
        "right": "トイフェル",
        "text": "うん。僕らが見た塔がどれを示すのかも、わからないな。",
        "location": "scene_chapter06_5.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "いったい、誰が何の目的でこんなものを……",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_5.webp"      
      }
    ]
  },
  "shooting_ch06_04": {
    "chapter": 6,
    "stageNo": 4,
    "chapterTitle": "来訪者",
    "stageTitle": "道しるべ",
    "stageType": "puzzle",
    "pre": [
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "その夜。拠点。焚き火のそばで、ミモザが二枚の古い紙を並べている。",
        "narration": true,
        "location": "scene_chapter06_6.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……印が塔を表しているとして…この紙に何の意味が…",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_6.webp"
      },
      {
        "speaker": "エリ",
        "text": "私たちが調べた塔は…どこなんだろう。",
        "left": "エリ",
        "right": "",
        "location": "scene_chapter06_6.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "エリが、紙の上の印をそっと指でなぞる。",
        "narration": true,
        "location": "scene_chapter06_6.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "指先が触れたところから、線がかすかに光を帯びた。",
        "narration": true,
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "エリ",
        "text": "……え？",
        "left": "エリ",
        "right": "",
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "今……光った？",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "エリが指を離すと、光はすっと消える。",
        "narration": true,
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "おいおい、どうなってるんだ……",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "トイフェルが目を丸くしてエリを見ている。",
        "narration": true,
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "……やっぱり…君は何か特別な力を？",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "エリ",
        "text": "え……？",
        "left": "エリ",
        "right": "",
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "僕は、人のエネルギーを感じ取るのが得意でね。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "塔の上から君たちを数えたとき、一人だけ、反応が…何というか…特殊だった。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……結晶も、円盤も、エリにだけ反応した。この紙も、同じなのかもしれないわ。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "…",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "エリ、大丈夫か…？",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "エリ",
        "text": "うん……特に…なんにも…",
        "left": "エリ",
        "right": "",
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……そのまま、印を辿ってみてくれる？",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_7.webp"
      },
      {
        "speaker": "エリ",
        "text": "……うん。やってみる。",
        "left": "エリ",
        "right": "",
        "location": "scene_chapter06_7.webp"
      }
    ],
    "post": [
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "光の線がほどけるように広がり、1枚目の紙の上に、地図のような紋様が浮かび上がった。",
        "narration": true,
        "location": "scene_chapter06_8.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "小さな光がいくつも灯り、その間を、細い線が結んでいる。",
        "narration": true,
        "location": "scene_chapter06_8.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "これは……地図、なのか？",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_8.webp"
      },
      {
        "speaker": "エリ",
        "text": "この形……どこかで……",
        "left": "エリ",
        "right": "",
        "location": "scene_chapter06_8.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……あ。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_8.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "塔と…紋様………だわ。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_8.webp"
      },

            {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "ミモザが手帳を取り出し、ページをめくる。これまで辿ってきた紋様の写しが、びっしりと描き込まれている。",
        "narration": true,
        "location": "scene_chapter06_8.webp"
      },


      {
        "speaker": "ミモザ",
        "text": "私が記録している塔と紋様の位置にぴったり重なる。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_8.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "なら、僕たちが目を覚ました塔も、この中のどれかってことか。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_8.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "聖堂からここまで、私たちが辿ってきた紋様……塔が林みたいに集まっていた場所が、ここ。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_8.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "そこから、この線をずっと辿って……",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_8.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……この塔が…ここ。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_8.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "それなら、僕たちが来たのは東から……たぶん、この光だ。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_8.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "なんだか…場所によって光の強さが違うね。",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_8.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "いくつもの光の中に、ひときわ大きく、輪をまとった光が点々とある。",
        "narration": true,
        "location": "scene_chapter06_8.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "大きな光は……円盤のある塔…",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_8.webp"
      },
            {
        "speaker": "トイフェル",
        "text": "その可能性が高いね。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_9.webp"
      },

      {
        "speaker": "トイフェル",
        "text": "そしてなぜか、こっちの紙は光らなかった。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_9.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "何か別の条件があるのかしら。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_9.webp"
      },
      {
        "speaker": "エリ",
        "text": "……",
        "left": "エリ",
        "right": "",
        "location": "scene_chapter06_9.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "エリ、大丈夫？",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_9.webp"
      },
      {
        "speaker": "エリ",
        "text": "……なんだろう。少し、頭がぼーっとする…",
        "left": "エリ",
        "right": "",
        "location": "scene_chapter06_9.webp"
      },
            {
        "speaker": "ミモザ",
        "text": "円盤のときと同じね…少し休んだほうがいいわ。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_9.webp"
      },

      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "光はゆっくりと薄れ、紙は元の古びた姿に戻った。",
        "narration": true,
        "location": "scene_chapter06_9.webp"
      },
      {
        "speaker": "トイフェル",
        "text": "…強く光っていた印の場所に何か…あるかもね。",
        "left": "",
        "right": "トイフェル",
        "location": "scene_chapter06_6.webp"
      },
      {
        "speaker": "レオナクロス",
        "text": "うん。きっと、何か大事なヒントがある。",
        "left": "レオナクロス",
        "right": "",
        "location": "scene_chapter06_6.webp"
      },
      {
        "speaker": "ミモザ",
        "text": "……ひとまず、今夜は泊まってもらいましょう。いいわね？ジグ。",
        "left": "",
        "right": "ミモザ",
        "location": "scene_chapter06_6.webp"
      },
      {
        "speaker": "ジグ",
        "text": "……あんまりうるさくするなよ。",
        "left": "ジグ",
        "right": "",
        "location": "scene_chapter06_6.webp"
      },
      {
        "speaker": "ベロニカ",
        "text": "ジグちゃん、やっさしィー！",
        "left": "",
        "right": "ベロニカ",
        "location": "scene_chapter06_6.webp"
      },
      {
        "speaker": "ジグ",
        "text": "うるせぇ。",
        "left": "ジグ",
        "right": "",
        "location": "scene_chapter06_6.webp"
      },
      {
        "speaker": "アウラ",
        "text": "アハハ、私の真似っこだ！",
        "left": "アウラ",
        "right": "",
        "location": "scene_chapter06_6.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "夜更け。塔の上で、アルノはひとり見張りを続けていた。",
        "narration": true,
        "location": "scene_chapter06_10.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "風が、灰を細く巻き上げる。",
        "narration": true,
        "location": "scene_chapter06_10.webp"
      },
      {
        "speaker": "アルノ",
        "text": "……何の用だ。",
        "left": "アルノ",
        "right": "",
        "location": "scene_chapter06_10.webp"
      },
      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "振り返ると、少し離れたところにアイナが立っていた。",
        "narration": true,
        "location": "scene_chapter06_10.webp"
      },
      {
        "speaker": "アイナ",
        "text": "……すみません。",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_10.webp"
      },
      {
        "speaker": "アルノ",
        "text": "……",
        "left": "アルノ",
        "right": "",
        "location": "scene_chapter06_10.webp"
      },
            {
        "speaker": "アイナ",
        "text": "先ほどの失礼を……謝りたくて。",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_10.webp"
      },

      {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "アルノは下を向き、ナイフを研いでいる。",
        "narration": true,
        "location": "scene_chapter06_10.webp"
      },
            {
        "speaker": "アルノ",
        "text": "いい能力だ。",
        "left": "アルノ",
        "right": "",
        "location": "scene_chapter06_10.webp"
      },
      {
        "speaker": "アイナ",
        "text": "え…？",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_10.webp"
      },

      {
        "speaker": "アルノ",
        "text": "暗殺に向いている。",
        "left": "アルノ",
        "right": "",
        "location": "scene_chapter06_10.webp"
      },

      {
        "speaker": "アイナ",
        "text": "あっ…暗殺………物騒ですね…",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_10.webp"
      },

                        {
        "speaker": "アルノ",
        "text": "…褒めている。",
        "left": "アルノ",
        "right": "",
        "location": "scene_chapter06_10.webp"
      },

            {
        "speaker": "アイナ",
        "text": "…あ、ありがとう…ございます…",
        "left": "",
        "right": "アイナ",
        "location": "scene_chapter06_10.webp"
      },

            {
        "speaker": "",
        "left": "",
        "right": "",
        "text": "寒空の下、白い地平の先を見つめながら、アイナは少し笑った。",
        "narration": true,
        "location": "scene_chapter06_10.webp"
      },


    ]
  },
    "shooting_ch07_01": {
      "chapter": 7,
      "stageNo": 1,
      "chapterTitle": "灰路",
      "stageTitle": "出発",
      "stageType": "novel",
      "pre": [
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "翌朝。拠点の塔の前に、九人が集まっていた。",
          "narration": true,
          "location": "scene_tower_near.webp"
        },
        {
          "speaker": "ミモザ",
          "text": "地図の写しを見て。輪をまとった光のうち、いちばん近いのは……ここ。",
          "left": "",
          "right": "ミモザ",
          "location": "scene_tower_near.webp"
        },
        {
          "speaker": "レオナクロス",
          "text": "東か。歩いて、二日……いや、もう少しかかるかな。",
          "left": "レオナクロス",
          "right": "",
          "location": "scene_tower_near.webp"
        },
        {
          "speaker": "トイフェル",
          "text": "僕たちが来た方角だね。怪しい場所は調べながら来たはずだけど…",
          "left": "",
          "right": "トイフェル",
          "location": "scene_walk.webp"
        },
        {
          "speaker": "ミモザ",
          "text": "この塔の円盤と同じものが、あの塔にもあるなら……比べてみれば、何か分かるかもしれない。",
          "left": "",
          "right": "ミモザ",
          "location": "scene_walk.webp"
        },
        {
          "speaker": "ジグ",
          "text": "さっそく留守か……せっかく住めるようになったってのによ。",
          "left": "ジグ",
          "right": "",
          "location": "scene_walk.webp"
        },
        {
          "speaker": "アウラ",
          "text": "またすぐ帰ってくるよ！結構お気に入り！",
          "left": "",
          "right": "アウラ",
          "location": "scene_walk.webp"
        },
                {
          "speaker": "ベロニカ",
          "text": "お気に入りィ！キャハハ！",
          "left": "",
          "right": "ベロニカ",
          "location": "scene_walk.webp"
        },

                {
          "speaker": "トイフェル",
          "text": "アイナ…お願いできるかい。",
          "left": "",
          "right": "トイフェル",
          "location": "scene_walk.webp"
        },

        {
          "speaker": "アイナ",
          "text": "うん。スゥー…",
          "left": "",
          "right": "アイナ",
          "location": "scene_walk.webp"
        },

                {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "アイナが息を深く吸うと、辺りが静まり返る。",
          "narration": true,
          "location": "scene_walk.webp"
        },

        {
          "speaker": "レオナクロス",
          "text": "……へぇ。範囲内にいると、こんな感じなのか。不思議な感覚だね。",
          "left": "アルノ",
          "right": "",
          "location": "scene_walk.webp"
        },
        {
          "speaker": "トイフェル",
          "text": "背後には気を付けておく必要があるから、油断は禁物だ。",
          "left": "",
          "right": "トイフェル",
          "location": "scene_walk.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "アルノとジグが後衛につく。",
          "narration": true,
          "location": "scene_walk.webp"
        },
        {
          "speaker": "エリ",
          "text": "よし……いこう。",
          "left": "",
          "right": "エリ",
          "location": "scene_walk.webp"
        },

        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "灰の舞う東の地平へ、九人は歩き出した。",
          "narration": true,
          "location": "scene_walk.webp"
        }
      ]
    },
    "shooting_ch07_02": {
      "chapter": 7,
      "stageNo": 2,
      "chapterTitle": "灰路",
      "stageTitle": "空の聖堂",
      "pre": [
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "拠点を発って、半日。崩れかけた聖堂が、灰の中にぽつりと建っていた。",
          "narration": true,
          "location": "scene_walk.webp"
        },
        {
          "speaker": "レオナクロス",
          "text": "地図だと、ここにも光があったはずだ。……小さな光だったけどね。",
          "left": "レオナクロス",
          "right": "",
          "location": "scene_walk.webp"
        },
        {
          "speaker": "トイフェル",
          "text": "寄っていこう。円盤があるかもしれない。",
          "left": "",
          "right": "トイフェル",
          "location": "scene_walk.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "中はがらんとしていた。崩れた長椅子と、降り積もった灰。",
          "narration": true,
          "location": "scene_in_tower.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "その奥、祭壇の向こうに――灰をかぶった円盤がひとつ、静かに埋もれていた。",
          "narration": true,
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "ミモザ",
          "text": "円盤……！ ここにも。",
          "left": "",
          "right": "ミモザ",
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "ジグ",
          "text": "……光ってねぇな。",
          "left": "ジグ",
          "right": "",
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "アウラ",
          "text": "拠点のは、息してるみたいに光ってたのにね。",
          "left": "",
          "right": "アウラ",
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "エリが、そっと円盤に手を触れる。",
          "narration": true,
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "……何も起きない。\n冷たい石の感触だけが、指先に残った。",
          "narration": true,
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "エリ",
          "text": "……何も、感じない。",
          "left": "エリ",
          "right": "",
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "ミモザ",
          "text": "眠っているのかしら。それとも……",
          "left": "",
          "right": "ミモザ",
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "アルノ",
          "text": "……長居は無用だ。出るぞ。",
          "left": "アルノ",
          "right": "",
          "location": "scene_in_tower.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "一行が出口へ向き直った、そのとき。",
          "narration": true,
          "location": "scene_in_tower.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "――ズン。\n入ってきた入口のほうで、何かが崩れ落ちる音がした。",
          "narration": true,
          "location": "scene_in_tower.webp",
          "effect": "rumble"
        },
        {
          "speaker": "ジグ",
          "text": "出口が……ふさがれた！？",
          "left": "ジグ",
          "right": "",
          "location": "scene_in_tower.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "崩れた灰の向こうから、白い獣がゆっくりと姿を現す。\n三つの首が、同時にこちらを向いた。",
          "narration": true,
          "location": "scene_in_tower.webp"
        },
        {
          "speaker": "アイナ",
          "text": "強化個体です……！ 気配が、ひとつ……大きい……",
          "left": "",
          "right": "アイナ",
          "location": "scene_in_tower.webp"
        },
        {
          "speaker": "トイフェル",
          "text": "退路を断ってきたか。倒すしかなさそうだね。",
          "left": "",
          "right": "トイフェル",
          "location": "scene_in_tower.webp"
        },
        {
          "speaker": "レオナクロス",
          "text": "気をつけて。壁が動いてる……射線が切られるよ！",
          "left": "レオナクロス",
          "right": "",
          "location": "scene_in_tower.webp"
        }
      ],
      "combat": [],
      "post": [
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "三つの首が力なく垂れ、白い巨狼が崩れ落ちる。\n灰が、静かに降り積もった。",
          "narration": true,
          "location": "scene_in_tower.webp"
        },
        {
          "speaker": "アウラ",
          "text": "やった……！",
          "left": "",
          "right": "アウラ",
          "location": "scene_in_tower.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "エリは、もう一度、祭壇の奥を振り返った。",
          "narration": true,
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "エリ",
          "text": "……倒したら、何か変わるかも。",
          "left": "エリ",
          "right": "",
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "もう一度、円盤に触れる。\nけれど――やはり、何も起きなかった。",
          "narration": true,
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "エリ",
          "text": "……だめ、みたい。",
          "left": "エリ",
          "right": "",
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "レオナクロス",
          "text": "あいつが円盤を守っていた……ってわけでも、なさそうだね。",
          "left": "レオナクロス",
          "right": "",
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "ミモザ",
          "text": "拠点の円盤と、何が違うの……？ なんなのかしら、これ……",
          "left": "",
          "right": "ミモザ",
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "トイフェル",
          "text": "地図の光も、ここは小さかった。輪も、まとっていなかった。",
          "left": "",
          "right": "トイフェル",
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "ミモザ",
          "text": "……輪をまとった光と、そうでない光……",
          "left": "",
          "right": "ミモザ",
          "location": "scene_disk_down.webp"
        },
        {
          "speaker": "ジグ",
          "text": "考えんのはあとだ。とりあえず出口、掘り出すぞ。",
          "left": "ジグ",
          "right": "",
          "location": "scene_in_tower.webp"
        },
        {
          "speaker": "ベロニカ",
          "text": "掘るのォ？ ベロニカ、得意ィ！",
          "left": "",
          "right": "ベロニカ",
          "location": "scene_in_tower.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "灰をかき分け、一行は聖堂をあとにした。\n背後の円盤は、最後まで、冷たく沈黙したままだった。",
          "narration": true,
          "location": "scene_walk.webp"
        }
      ]
    },
    "shooting_ch07_03": {
      "chapter": 7,
      "stageNo": 3,
      "chapterTitle": "灰路",
      "stageTitle": "灰の丘",
      "pre": [
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "聖堂を出て、さらに東へ。\nやがて、灰が幾重にも積み重なった丘が、行く手をふさいだ。",
          "narration": true,
          "location": "scene_walk.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "丘の向こうに、塔の先端がかすかに見える。",
          "narration": true,
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "エリ",
          "text": "……あれ、かな。",
          "left": "エリ",
          "right": "",
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "ミモザ",
          "text": "方角も合ってる。輪をまとった光……あの塔よ。",
          "left": "",
          "right": "ミモザ",
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "レオナクロス",
          "text": "この丘を越える必要があるね。",
          "left": "レオナクロス",
          "right": "",
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "トイフェル",
          "text": "回り込んだら、ずいぶん時間がかかりそうだ。",
          "left": "",
          "right": "トイフェル",
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "ジグ",
          "text": "……越えるか。",
          "left": "ジグ",
          "right": "",
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "一歩、灰の斜面に足を踏み入れる。",
          "narration": true,
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "――丘が、揺れた。",
          "narration": true,
          "location": "scene_tower_far.webp",
          "effect": "rumble"
        },
        {
          "speaker": "アウラ",
          "text": "え……なに？",
          "left": "",
          "right": "アウラ",
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "ガサガサガサガサ……\n灰の下で、無数の何かがうごめく音がする。",
          "narration": true,
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "アイナ",
          "text": "下です……！ 灰の下に、たくさんの気配が……！",
          "left": "",
          "right": "アイナ",
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "足が、灰に沈んでいく。",
          "narration": true,
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "ジグ",
          "text": "ま、まずい……なんだ！？ 吸い込まれる……！",
          "left": "ジグ",
          "right": "",
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "灰の丘が、大きな口を開けるように崩れ落ちた。",
          "narration": true,
          "location": "scene_tower_far.webp",
          "effect": "rumble"
        }
      ],
      "combat": [],
      "post": [
        {
          "speaker": "",
          "left": "",
          "right": "",
          "text": "最後の大きな影が崩れると、うごめく音が、ぴたりと止んだ。",
          "narration": true,
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "ジグ",
          "text": "はぁ……はぁ……なんだったんだ、今の……",
          "left": "ジグ",
          "right": "",
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "レオナクロス",
          "text": "近くにあるものに、手当たり次第に群がっていたね。……ボクの装置にまで。",
          "left": "レオナクロス",
          "right": "",
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "ミモザ",
          "text": "小さい子たちを生んでいたのは、あの大きい個体……巣、だったのね。",
          "left": "",
          "right": "ミモザ",
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "アイナ",
          "text": "皆さん……無事、ですか……？",
          "left": "",
          "right": "アイナ",
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "ベロニカ",
          "text": "灰まみれェ！ キャハハハ！！",
          "left": "",
          "right": "ベロニカ",
          "location": "scene_tower_far.webp"
        },
        {
          "speaker": "トイフェル",
          "text": "笑いごとじゃないよ、ベロニカ。",
          "left": "",
          "right": "トイフェル",
          "location": "scene_tower_far.webp"
        }
      ]
    },
    "shooting_ch07_04": {
        "chapter": 7,
        "stageNo": 4,
        "chapterTitle": "灰路",
        "stageTitle": "夜明け",
        "stageType": "battle",
        "pre": [
          {
            "speaker": "",
            "left": "",
            "right": "",
            "text": "灰の丘を越えようとしたとき、白い灰の中で、小さな光がいくつも瞬いた。",
            "narration": true,
            "location": "scene_tower_far.webp"
          },
          {
            "speaker": "エリ",
            "left": "エリ",
            "right": "",
            "text": "……また、レムナント？",
            "location": "scene_tower_far.webp"
          },
          {
            "speaker": "",
            "left": "",
            "right": "",
            "text": "放たれた光の粒は、まるで意思を持っているかのように、進路を曲げてこちらへ迫る。",
            "narration": true,
            "location": "scene_tower_far.webp"
          },
          {
            "speaker": "ミモザ",
            "left": "",
            "right": "ミモザ",
            "text": "おかしい……弾が、こっちを探してる……！",
            "location": "scene_tower_far.webp"
          },
          {
            "speaker": "アイナ",
            "left": "",
            "right": "アイナ",
            "text": "……気配を、追っているのかもしれません。",
            "location": "scene_tower_far.webp"
          },
          {
            "speaker": "レオナクロス",
            "left": "レオナクロス",
            "right": "",
            "text": "なら、アイナ。きみの力を試してみよう。",
            "location": "scene_tower_far.webp"
          },
          {
            "speaker": "アイナ",
            "left": "",
            "right": "アイナ",
            "text": "……はい。私が、気配を隠します。",
            "location": "scene_tower_far.webp"
          }
        ],
        "post": [
          {
            "speaker": "",
            "left": "",
            "right": "",
            "text": "灰の底から這い出したときには、空が白み始めていた。",
            "narration": true,
            "location": "scene_tower_middle.webp"
          },
          {
            "speaker": "",
            "left": "",
            "right": "",
            "text": "丘の向こう、朝の光の中に、塔がはっきりと姿を見せている。",
            "narration": true,
            "location": "scene_tower_near.webp"
          },
          {
            "speaker": "アウラ",
            "text": "見えた！ 塔だ！",
            "left": "",
            "right": "アウラ",
            "location": "scene_tower_near.webp"
          },
          {
            "speaker": "",
            "left": "",
            "right": "",
            "text": "その塔を見上げた瞬間――エリの胸が、とくん、と鳴った。",
            "narration": true,
            "location": "scene_tower_near.webp"
          },
          {
            "speaker": "エリ",
            "text": "……呼んでる。",
            "left": "エリ",
            "right": "",
            "location": "scene_tower_near.webp"
          },
          {
            "speaker": "ミモザ",
            "text": "エリ……？",
            "left": "",
            "right": "ミモザ",
            "location": "scene_tower_near.webp"
          },
          {
            "speaker": "エリ",
            "text": "拠点の円盤に触れたときと、同じ感じ。……あそこに、何かいる。",
            "left": "エリ",
            "right": "",
            "location": "scene_tower_near.webp"
          },
          {
            "speaker": "トイフェル",
            "text": "聖堂の円盤は、何も応えなかった。でも、あの塔のは……",
            "left": "",
            "right": "トイフェル",
            "location": "scene_tower_near.webp"
          },
          {
            "speaker": "レオナクロス",
            "text": "生きている円盤……ってことかな。",
            "left": "レオナクロス",
            "right": "",
            "location": "scene_tower_near.webp"
          },
          {
            "speaker": "ジグ",
            "text": "行ってみりゃ分かる。",
            "left": "ジグ",
            "right": "",
            "location": "scene_tower_near.webp"
          },
          {
            "speaker": "アルノ",
            "text": "……行くぞ。",
            "left": "アルノ",
            "right": "",
            "location": "scene_tower_near.webp"
          },
          {
            "speaker": "",
            "left": "",
            "right": "",
            "text": "九人は灰の丘を背に、朝の光の中へと歩き出した。",
            "narration": true,
            "location": "scene_tower_near.webp"
          }
        ]
    }
}
  );
})();
