ZERAPHIA STORY10 部品組み立て式マップ

■ 構成
  objects.js … 部品の定義（画像・接地点・当たり判定・奥行き分割）※ tools/build_objects.py で自動生成
  maps.js    … マップごとの配置データ（どの部品をどこに置くか）← ふだん編集するのはここ
  rpg.js     … エンジン（床タイル敷き詰め・遠景・カメラ・当たり判定自動生成・エディタ）

■ 素材
  floor_tile.webp  床（継ぎ目なしで無限に敷ける）
  horizon.webp     地平線と空（マップ上端に置く）
  far_castle.webp  遠景の城（カメラより遅く動く＝奥行き）
  obj_pillar / obj_arch_column / obj_arch_banner / obj_arch_small  遺跡パーツ
  ※ flip:true で左右反転できるので、実質8種類として使えます

■ マップの作り方
  1) index.html?debug=1 で開く（または G キー）
  2) 部品をドラッグで移動 / 1〜4キーかボタンで追加 / F で反転 / Delete で削除
     空きマスをタップ → そのマスだけ通行可/不可を上書き
     N キー → すり抜け（壁を無視して歩いて確認できる）
  3) 「配置をコピー」→ maps.js の該当マップの objects/blocks/opens に貼り付け
  ※ 編集中の内容はブラウザに自動保存。「編集を破棄」で maps.js の状態に戻る

  デバッグ表示の色：赤=部品の当たり判定 / 橙=手動で塞いだマス / 青=手動で開けたマス / 黄=門

■ 新しい部品を増やすとき
  背景透過の画像を用意 → tools/build_objects.py の SPECS に
  「接地点・縮尺・通れない範囲」を1行足して実行（または Claude に依頼）

■ その他
  bg_garden.webp / field_ui.webp / ui_header.webp / ui_frame.png / ui_stick_base.png / ui_action.png / ui_menu.png は未使用（削除可）
  セーブキー zeraphia_ch10_rpg_v3（マップ構成が変わったため旧セーブは読みません）
