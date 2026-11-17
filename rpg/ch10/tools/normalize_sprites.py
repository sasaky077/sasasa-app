# -*- coding: utf-8 -*-
"""
ZERAPHIA RPG用 ちびキャラ素材 変換スクリプト
==============================================================
GPTで作った立ち絵を、全キャラ共通の規格にそろえます。

  キャンバス : 512 x 512 px、背景透過
  足元       : y = 480 px（下から32 px）
  左右       : 足元を基準に中央
  大きさ     : 髪の頂点（飾り・アホ毛を除く）〜足元 = 身長(cm) x 2.2 px

【準備】（最初の1回だけ）
  Python 3 を入れて、コマンドで次を実行
      pip install pillow numpy

【使い方】
  1. このファイルと同じ場所に「input」フォルダを作り、GPTの画像を入れる
  2. 下の CHARS に、1枚につき1行を書く
  3. コマンドで実行
      python normalize_sprites.py
  4. 「output」フォルダに変換後の .webp と、確認用の _check.png ができる

【CHARS の書き方】
  ('元画像のファイル名', '出力名', 身長cm, 髪の頂点のy座標),

  ・出力名       : chara_番号_向き_コマ（例 chara_28_left_walk1）。.webp は付けない
  ・身長cm       : 同じキャラは全コマ同じ値にする
  ・髪の頂点のy  : 元画像で、飾り・アホ毛を除いた髪のいちばん上のy座標。
                   画像ソフトでカーソルを合わせて読む。
                   None にすると「絵のいちばん上」を自動で使う
                   （飾りやアホ毛がないキャラ、後ろ向きなどはこれでOK）
==============================================================
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# ------------------------------------------------------------
# 設定
# ------------------------------------------------------------
CHARS = [
    # ('元画像',                    '出力名',              身長cm, 髪の頂点y),
    ('chara_03_down_idle.webp',   'chara_03_down_idle',  145,    120),  # アウラ（アホ毛除く）
    ('chara_05_down_idle.webp',   'chara_05_down_idle',  162,    130),  # ジグ
    ('chara_17_down_idle.webp',   'chara_17_down_idle',  148,    175),  # アイナ（ヘッドドレス除く）
    ('chara_20_down_idle.webp',   'chara_20_down_idle',  158,    115),  # アルノ（フード除く）
    ('chara_28_down_idle.webp',   'chara_28_down_idle',  152,    120),  # ミモザ
    ('chara_54_down_idle.webp',   'chara_54_down_idle',  165,    135),  # ハオ
    ('chara_56_down_idle.webp',   'chara_56_down_idle',  140,    155),  # スマイル（帽子除く）
]

INPUT_DIR = 'input'
OUTPUT_DIR = 'output'

CANVAS = 512        # 出力の大きさ（正方形）
FOOT_Y = 480        # 足元の位置
PX_PER_CM = 2.2     # 身長1cmあたりのpx（150cm → 330px）

# 白背景の自動透過（GPTが透過で出せなかった画像用）
REMOVE_WHITE_BG = True
WHITE_LEVEL = 238   # これより明るく、色味の少ない画素を「背景の白」とみなす
ALPHA_MIN = 20      # これより薄い画素はキャラに含めない

# ------------------------------------------------------------


def remove_white_background(im):
    """画像の外周から続いている白だけを透明にする（服の白い部分は残す）。"""
    rgba = np.array(im.convert('RGBA'))
    if rgba[..., 3].min() < 250:  # すでに透過あり
        return im.convert('RGBA')
    rgb = rgba[..., :3].astype(int)
    whiteish = (rgb.min(axis=2) >= WHITE_LEVEL) & ((rgb.max(axis=2) - rgb.min(axis=2)) <= 18)
    h, w = whiteish.shape
    bg = np.zeros_like(whiteish)
    stack = [(y, x) for x in range(w) for y in (0, h - 1) if whiteish[y, x]]
    stack += [(y, x) for y in range(h) for x in (0, w - 1) if whiteish[y, x]]
    while stack:  # 外周から塗りつぶし
        y, x = stack.pop()
        if bg[y, x] or not whiteish[y, x]:
            continue
        bg[y, x] = True
        if y > 0: stack.append((y - 1, x))
        if y < h - 1: stack.append((y + 1, x))
        if x > 0: stack.append((y, x - 1))
        if x < w - 1: stack.append((y, x + 1))
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    # 輪郭のフチをなじませる（白い縁取りを残さない）
    edge = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3))
    rgba[..., 3] = np.array(edge)
    return Image.fromarray(rgba, 'RGBA')


def figure_box(alpha):
    ys, xs = np.where(alpha > ALPHA_MIN)
    if len(ys) == 0:
        raise ValueError('キャラが見つかりません（全部透明か、背景が抜けていません）')
    return xs.min(), ys.min(), xs.max(), ys.max()


def convert(src_path, cm, head_top):
    im = Image.open(src_path)
    im = remove_white_background(im) if REMOVE_WHITE_BG else im.convert('RGBA')
    alpha = np.array(im)[..., 3]
    x0, y0, x1, y1 = figure_box(alpha)
    top = y0 if head_top is None else head_top
    body = y1 - top
    if body <= 10:
        raise ValueError(f'髪の頂点y（{head_top}）が足元（{y1}）に近すぎます')
    scale = cm * PX_PER_CM / body
    # 左右の中心は足元付近（下12%）の幅で決める。髪や持ち物で偏らないように
    band = alpha[int(y1 - (y1 - y0) * .12):y1 + 1]
    fx = np.where(band > ALPHA_MIN)[1]
    cx = (fx.min() + fx.max()) / 2
    big = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    out = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    out.alpha_composite(big, (round(CANVAS / 2 - cx * scale), round(FOOT_Y - y1 * scale)))
    return out, scale


def check_sheet(items):
    """変換結果を横に並べ、足元の線と頭の線を引いた確認画像。"""
    cell = 256
    k = cell / CANVAS
    sheet = Image.new('RGBA', (cell * len(items), cell + 22), (236, 233, 240, 255))
    d = ImageDraw.Draw(sheet)
    for i, (name, img, cm) in enumerate(items):
        x = i * cell
        sheet.alpha_composite(img.resize((cell, cell), Image.LANCZOS), (x, 0))
        d.rectangle([x, 0, x + cell - 1, cell - 1], outline=(180, 170, 200))
        head = (FOOT_Y - cm * PX_PER_CM) * k
        d.line([(x, head), (x + cell, head)], fill=(80, 120, 220))
        d.text((x + 4, cell + 4), name, fill=(40, 40, 60))
    fy = FOOT_Y * k
    d.line([(0, fy), (sheet.width, fy)], fill=(220, 70, 70))
    return sheet


def main():
    base = os.path.dirname(os.path.abspath(__file__))
    in_dir = os.path.join(base, INPUT_DIR)
    out_dir = os.path.join(base, OUTPUT_DIR)
    os.makedirs(out_dir, exist_ok=True)
    done, errors = [], 0
    for src, name, cm, head_top in CHARS:
        path = os.path.join(in_dir, src)
        if not os.path.exists(path):
            print(f'× {src} : ファイルがありません（{INPUT_DIR} フォルダを確認）')
            errors += 1
            continue
        try:
            img, scale = convert(path, cm, head_top)
        except Exception as e:  # noqa: BLE001
            print(f'× {src} : {e}')
            errors += 1
            continue
        img.save(os.path.join(out_dir, name + '.webp'), quality=92, method=6)
        note = '（注意：飾りが画面の上にはみ出しています）' if img.getbbox() and img.getbbox()[1] <= 0 else ''
        print(f'○ {src} → {name}.webp  倍率 {scale:.3f}  {note}')
        done.append((name, img, cm))
    if done:
        check_sheet(done).save(os.path.join(out_dir, '_check.png'))
        print(f'\n確認用: {OUTPUT_DIR}/_check.png（赤線＝足元、青線＝髪の頂点の目標）')
    print(f'完了 {len(done)} 枚 / エラー {errors} 枚')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
