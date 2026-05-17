// chapter01.js
// 19号棟：CHAPTER 01 ストーリーデータ

var CHAPTER_01 = {
  id: 'CHAPTER_01_01',
  title: '夢',
  roomLabel: '101号室',
  mapTitle: '— FLOOR MAP —',
  scenes: [
  // PROLOGUE
  {label:'PROLOGUE',bg:'',sp:'',vc:null,
   text:'雨の後のような湿ったにおいと、\n生ぬるい風を感じて目を開ける。'},
  {label:'PROLOGUE',bg:'',sp:'',vc:null,
   text:'ぼやけた視界の中には、\n灰色の空が映っている。'},
  {label:'PROLOGUE',bg:'',sp:'',vc:null,
   text:'頭が重い。'},
  {label:'PROLOGUE',bg:'',sp:'',vc:null,
   text:'うつろな意識の中、\n周囲の異様な光景を徐々に理解し、息をのむ。'},
  {label:'PROLOGUE',bg:'廃',sp:'',vc:null,
   text:'草木は枯れ、建物は倒れ、\n地面の至るところには亀裂が入っている。'},
  {label:'PROLOGUE',bg:'廃',sp:'',vc:null,
   text:'ここは——　荒廃した都市。いや、住宅街か？'},
  {label:'PROLOGUE',bg:'十九',sp:'',vc:null,
   text:'身体は動かない。\nかろうじて動く眼球で周囲を探る。'},
     {label:'PROLOGUE',bg:'十九',sp:'',vc:null,
   text:'朽ち果て崩れている建造物が並ぶ中、\n一棟の建物だけが異様にそびえ立っている。'},
  {label:'PROLOGUE',bg:'十九',sp:'',vc:null,
   text:'黒に近い灰色のコンクリート。\n3階建てのその建物は、やけに大きく見える。'},
  {label:'PROLOGUE',bg:'夢',sp:'',vc:null,
   text:'——そうだ。思い出した。\nこれは夢だ。'},
  {label:'PROLOGUE',bg:'夢',sp:'',vc:null,
   text:'昔からよく見る夢。もう何度目だろう。\n何度も見ているのに、いつもよく覚えていない。'},
  {label:'PROLOGUE',bg:'夢',sp:'',vc:null,
   text:'僕はここから動くことはできない。\nそして、そのうちまた眠りにつく。'},
  {label:'PROLOGUE',bg:'夢',sp:'',vc:null,
   text:'次に目を覚ましたときには、ベッドの上にいるはずだ。'},
  {label:'PROLOGUE',bg:'夢',sp:'',vc:null,
   text:'不気味だが、\nなんだか異様に懐かしい気持ちにもなる。'},
　{label:'PROLOGUE',bg:'夢',sp:'',vc:null,
   text:'僕はこの夢が嫌いじゃなかった。'},
  {label:'PROLOGUE',bg:'',sp:'',vc:null,
   text:'頬をぶっきらぼうに撫でる風に身体を任せるように、\n僕はまた、まぶたを閉じた。'},

  // SCENE 01
  {label:'SCENE 01',bg:'',sp:'？？？',vc:'noise',
   text:'...ねぇ..き...　..てる?'},
  {label:'SCENE 01',bg:'',sp:'？？？',vc:'noise',
   text:'あ.....つなが　……多分..聞こ...'},
  {label:'SCENE 01',bg:'',sp:'',vc:null,
   text:'ノイズ交じりの声が聞こえる。\nどこからかはわからない。'},
  {label:'SCENE 01',bg:'',sp:'？？？',vc:'voice',
   text:'ごめん..周波数が...\nあっ、聞こえるかい！'},
  {label:'SCENE 01',bg:'',sp:'',vc:null,
   text:'あたりを見回すが、だれの姿もない。'},
  {label:'SCENE 01',bg:'',sp:'？？？',vc:'voice',
   text:'聞こえてる...みたいだね！\n時間がないから手短に..って何から話せばいいんだっけ...'},
  {label:'SCENE 01',bg:'',sp:'？？？',vc:'voice',
   text:'え...もう時間？..\n君はね..ここでやるべきことがあって...'},
  {label:'SCENE 01',bg:'',sp:'？？？',vc:'noise',
   text:'ああ..ごめんよ..とにかく205を見つけて..\n.ば..分...よ...'},
  {label:'SCENE 01',bg:'101',sp:'',vc:null,
   text:'声が途絶えた。\nこの夢の続きを見るのは初めてかもしれない。'},
  {label:'SCENE 01',bg:'101',sp:'',vc:null,
   text:'こんな展開だっただろうか。\n205に行け・・・部屋の番号か。'},
  {label:'SCENE 01',bg:'101',sp:'',vc:null,
   text:'思い当たるのは、あの建物・・・'},
  {label:'SCENE 01',bg:'101',sp:'',vc:null,
   text:'気が付けば、身体は動くようになっていた。'},
   {
  label:'SCENE 01',
  bg:'101',
  sp:'',
  vc:null,
  text:'それならもう少し、\n夢の続きを楽しむのも悪くないか・・・'
},
{
  type:'chapterTitle',
  title:'CHAPTER01:夢',
  next:'map'
},
],
  mapNodes: [
  {id:'start',  icon:'◈', label:'START',  name:'101号室・入口', cleared:false, locked:false, action:'entrance'},
  {id:'search', icon:'◉', label:'SEARCH', name:'室内調査',      cleared:false, locked:true,  action:'search'},
  {id:'battle', icon:'⚔', label:'BATTLE', name:'戦闘',          cleared:false, locked:true,  action:'battle'},
  {id:'rest',   icon:'◎', label:'REST',   name:'休憩',          cleared:false, locked:true,  action:'rest'},
  {id:'boss',   icon:'☽', label:'BOSS',   name:'うごめく人影',  cleared:false, locked:true,  action:'boss'},
],
  // 入口で入手するアイテム
  entranceItem: {
    id:'item_eli',
    icon:'◈',
    name:'見覚えのないお守り',
    desc:'どこかで見たような気がする、\nでも思い出せない。\nなんとなく、持っていると安心する。',
    action: null
  },
  items: [
  {
    id:'memo',
    icon:'📓',
    name:'ボロボロのメモ帳',
    desc:'湿気でページが波打っている。\n誰かの几帳面な字で、\nこの場所のことが書かれていた。',
    action: 'memo'
  },
  {
    id:'item_eli',
    icon:'◈',
    name:'見覚えのないお守り',
    desc:'どこかで見たような気がする、\nでも思い出せない。\nなんとなく、持っていると安心する。',
    action: null
  },
],
  memo: [
    {
      title: '浸食率について',
      body: 'ノードを進むごとに、浸食率が上昇する。\n浸食が進むと、ステータスにデバフがかかる。\n一部の者は、浸食が深まるほど力を増す。'
    },
    {
      title: '残響について',
      body: '戦闘中、漂流者たちの内に残響が溜まる。\n残響が十分に溜まると、固有の能力を解放できる。\n適合率が高いほど、残響は速く溜まる。'
    },
    {
      title: 'コストについて',
      body: '各漂流者には、編成コストがある。\nステージごとに上限が設けられている場合、\n上限を超える編成は組めない。'
    },
    {
      title: 'Typeについて',
      body: '各漂流者は、死の間際に抱いた感情によって\n固有のTypeを持つ。',
      note: '※ Typeの詳細は別ページに記載があるはず。\n　まだ見つかっていない。'
    }
  ]
};
