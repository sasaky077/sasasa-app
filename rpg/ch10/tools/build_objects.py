"""Turn the user's generic art into game parts.
usage: python3 build_objects.py UPLOAD_DIR OUT_IMAGES_DIR OUT_JS
Object coords: anchor = ground contact point. All rects in WORLD px relative to the anchor.
"""
import sys, json, numpy as np, cv2
from PIL import Image

U, OUT, OUTJS = sys.argv[1:4]
RES = 2.0  # export at 2x world resolution (retina)

# name, file, anchor(src), scale(world/src), blocks(src rects), parts(src rect, base src y), opens(src), gate
SPECS = [
    dict(name='pillar', label='折れた柱', file='f31cb875-image.webp', anchor=(500, 1165), scale=.28,
         blocks=[(320, 1040, 360, 160)], parts=[], shadow=(500, 1160, 380, 70)),
    dict(name='arch_column', label='花のアーチと柱', file='48bb940a-image.webp', anchor=(290, 1225), scale=.40,
         blocks=[(60, 1110, 500, 240), (560, 1230, 230, 130), (370, 1330, 330, 150)],
         parts=[((555, 760, 270, 640), 1345)], shadow=(420, 1300, 820, 180)),
    dict(name='arch_banner', label='旗のアーチ', file='ffb7342a-image.webp', anchor=(800, 1345), scale=.365,
         blocks=[(560, 1150, 400, 230), (30, 1180, 610, 300)], parts=[], shadow=(520, 1330, 1000, 200)),
    dict(name='arch_small', label='石のアーチ（門）', file='c1029cd4-image.webp', anchor=(890, 870), scale=.45,
         blocks=[(50, 520, 800, 480), (985, 520, 540, 480)], parts=[], shadow=(780, 880, 1400, 180),
         opens=[(890 - 56, 870 - 111, 112, 260)], gate=(890, 870 - 55)),
]


def load(f):
    return Image.open(f'{U}/{f}').convert('RGBA')


types = {}
for sp in SPECS:
    im = load(sp['file'])
    a = np.array(im)[..., 3]
    x0, y0, x1, y1 = Image.fromarray(a).point(lambda v: 255 if v > 8 else 0).getbbox()
    pad = 4; x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)
    s, (ax, ay) = sp['scale'], sp['anchor']
    crop = im.crop((x0, y0, x1, y1))
    ew, eh = round((x1 - x0) * s * RES), round((y1 - y0) * s * RES)
    crop.resize((ew, eh), Image.LANCZOS).save(f'{OUT}/obj_{sp["name"]}.webp', quality=90, method=6)
    W = lambda v: round(v * s, 1)
    rel = lambda r: [W(r[0] - ax), W(r[1] - ay), W(r[2]), W(r[3])]
    t = dict(label=sp['label'], img=f'images/obj_{sp["name"]}.webp',
             ox=W(x0 - ax), oy=W(y0 - ay), w=W(x1 - x0), h=W(y1 - y0),
             blocks=[rel(r) for r in sp['blocks']],
             parts=[dict(rect=rel(r), base=W(b - ay)) for r, b in sp['parts']])
    sx, sy, sw, sh = sp['shadow']; t['shadow'] = [W(sx - ax), W(sy - ay), W(sw / 2), W(sh / 2)]
    if sp.get('opens'): t['opens'] = [rel(r) for r in sp['opens']]
    if sp.get('gate'): t['gate'] = [W(sp['gate'][0] - ax), W(sp['gate'][1] - ay)]
    types[sp['name']] = t
    print(sp['name'], ew, eh, t['w'], t['h'])

# distant castle (parallax decor)
im = load('fb78eb92-image.webp'); bb = Image.fromarray(np.array(im)[..., 3]).point(lambda v: 255 if v > 8 else 0).getbbox()
c = im.crop(bb); cw = 900
c.resize((cw * 2 // 2 * 1, round(c.height * cw / c.width)), Image.LANCZOS).save(f'{OUT}/far_castle.webp', quality=90, method=6)
print('castle', c.size)

# ---- floor: seamless tile from the lower part of the floor image ----
fl = np.array(Image.open(f'{U}/b794d98d-image.webp').convert('RGB')).astype(np.float32)
src = fl[700:1672, 0:941]
ov = 160
h, w = src.shape[:2]
t = np.linspace(0, 1, ov)
# horizontal wrap
out = src[:, :w - ov].copy()
out[:, :ov] = src[:, :ov] * t[None, :, None] + src[:, w - ov:] * (1 - t[None, :, None])
src2 = out; h, w = src2.shape[:2]
out = src2[:h - ov].copy()
out[:ov] = src2[:ov] * t[:, None, None] + src2[h - ov:] * (1 - t[:, None, None])
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(f'{OUT}/floor_tile.webp', quality=88, method=6)
print('floor tile', out.shape)

# ---- horizon strip: sky + horizon, mirrored to 1882 wide, bottom fades out ----
top = fl[0:620]
strip = np.concatenate([top, top[:, ::-1]], axis=1)
alpha = np.ones(strip.shape[:2], np.float32)
fade = np.clip((620 - np.arange(620)) / 220, 0, 1)  # bottom 220px fades into the floor tile
alpha *= fade[:, None]
Image.fromarray(np.dstack([strip, alpha * 255]).astype(np.uint8), 'RGBA').save(f'{OUT}/horizon.webp', quality=90, method=6)
print('horizon', strip.shape, 'horizon line at y≈330')

js = '// 自動生成: tools/build_objects.py  （数値は手で直してもOK）\n' \
     '// 座標はすべて「接地点(アンカー)」からの相対ワールドpx。blocks=通れない範囲 / parts=奥行きを分ける部分(base=その部分の接地y)\n' \
     'window.ZERAPHIA_OBJECT_TYPES = ' + json.dumps(types, ensure_ascii=False, indent=1) + ';\n'
open(OUTJS, 'w').write(js)
