"""실사 화질(real.js)용 텍스처를 받아서 다듬는다 — 한 번만 돌리면 되고, 결과는 3d/assets/real/ 에 커밋한다.
python3 3d/src/prepare_textures.py   (Pillow · numpy 필요)
출처 · 라이선스는 3d/assets/real/CREDITS.md.
- 색 무늬(*_c.jpg)는 흑백에 가깝게 빼고 밝기를 0.88 언저리로 맞춘다: 마을 재질 색(계절 색 포함)에 곱해져 결만 사진처럼 보이게.
- 결(*_n.jpg)은 받은 노멀맵을 쓰거나 밝기에서 만든다(OpenGL 방향, +Y 위)."""
import io, os, urllib.request
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'real')
BJS = 'https://raw.githubusercontent.com/BabylonJS/Assets/master/textures/'
THR = 'https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/textures/'
HDR = 'https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/'

def get(url):
    with urllib.request.urlopen(url) as r:
        return r.read()

def img(url, size):
    im = Image.open(io.BytesIO(get(url))).convert('RGB')
    w, h = im.size
    return im.resize((size, max(1, round(size * h / w))), Image.LANCZOS) if size else im

def detail(im, sat=.25, mean=.88, contrast=1.):
    a = np.asarray(im).astype(np.float32) / 255
    l = (a * [.2126, .7152, .0722]).sum(-1, keepdims=True)
    a = l + (a - l) * sat
    l2 = (a * [.2126, .7152, .0722]).sum(-1, keepdims=True)
    m = l2.mean()
    a = (a - m) * contrast + m
    a = a * (mean / m)
    return Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8))

def normal_from(im, strength):
    a = np.asarray(im.convert('L')).astype(np.float32) / 255
    dx = (np.roll(a, -1, 1) - np.roll(a, 1, 1)) * strength
    dy = (np.roll(a, -1, 0) - np.roll(a, 1, 0)) * strength
    n = np.stack([-dx, dy, np.ones_like(a)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return Image.fromarray(((n * .5 + .5) * 255 + .5).astype(np.uint8))

def save(im, name, q=86):
    im.save(os.path.join(OUT, name), quality=q, optimize=True)
    print(name, im.size, os.path.getsize(os.path.join(OUT, name)))

os.makedirs(OUT, exist_ok=True)
# 잔디 (three.js 예제, MIT)
save(detail(img(THR + 'terrain/grasslight-big.jpg', 1024), sat=.0, contrast=1.25), 'grass_c.jpg')
save(img(THR + 'terrain/grasslight-big-nm.jpg', 1024), 'grass_n.jpg')
# 돌길 (Babylon.js Assets floor.png, CC BY 4.0)
fl = img(BJS + 'floor.png', 512)
save(detail(fl, sat=.15, mean=.9, contrast=1.15), 'paving_c.jpg'); save(normal_from(fl, 7), 'paving_n.jpg')
# 회벽 — 마른 흙 사진을 옅게 (Babylon.js ground.jpg)
gr = img(BJS + 'ground.jpg', 512)
save(detail(gr, sat=.1, mean=.93, contrast=.45), 'plaster_c.jpg'); save(normal_from(gr, 2.2), 'plaster_n.jpg')
# 나무 판자 (three.js hardwood2)
wd = img(THR + 'hardwood2_diffuse.jpg', 1024); wb = img(THR + 'hardwood2_bump.jpg', 1024)
save(detail(wd, sat=.35, mean=.86, contrast=1.1), 'wood_c.jpg'); save(normal_from(wb, 4), 'wood_n.jpg')
# 돌 (Babylon.js rockyGround)
save(detail(img(BJS + 'rockyGround_basecolor.png', 512), sat=.2, mean=.88, contrast=1.2), 'stone_c.jpg')
save(img(BJS + 'rockyGround_normal.png', 512), 'stone_n.jpg')
# 모래사장 (Babylon.js sand.jpg)
sd = img(BJS + 'sand.jpg', 512)
save(detail(sd, sat=.3, mean=.95, contrast=1.3), 'sand_c.jpg')
# 물결 (three.js waternormals)
save(img(THR + 'waternormals.jpg', 1024), 'water_n.jpg', 90)
# 하늘빛 (Poly Haven Rooitou Park, CC0 — pmndrs/drei-assets 사본)
open(os.path.join(OUT, 'sky_park_1k.hdr'), 'wb').write(get(HDR + 'rooitou_park_1k.hdr'))
print('done')
