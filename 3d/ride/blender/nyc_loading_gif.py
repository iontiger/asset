"""뉴욕 시내로 들어갈 때 보여 주는 로딩 GIF — 노란 택시와 함께 맨해튼 빌딩 숲을 지나는 바이크.

실행:  python3 3d/ride/blender/nyc_loading_gif.py      (Pillow 만 있으면 된다, 블렌더 필요 없음)
출력:  3d/ride/nyc/loading.gif  (360×180, 32장 · 1.9초 반복). 화면에는 절반 크기로 띄워 레티나에서도 또렷하다.
빌딩 두 겹(먼 겹은 느리게)이 흘러가고, 창문 불이 깜박이고, 바퀴 살이 돌고, 바이크가 살짝 들썩인다. 한 바퀴 돌면 처음과 똑같이 이어진다.
"""
import math, os
from PIL import Image, ImageDraw

W, H, SS, N = 360, 180, 3, 32                  # 크기 · 슈퍼샘플 배수 · 장 수
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'nyc', 'loading.gif')
BG, FAR, NEAR, WIN, ROAD, DASH = '#fffbee', '#c9d3c4', '#42614b', '#ffd27a', '#5a6157', '#fffbee'

def rng(seed):
    s = seed
    def r():
        nonlocal s; s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff
    return r

def skyline(seed, period, hmin, hmax, wmin, wmax):
    """period 폭 안에서 이어지는 빌딩 줄 [(x, w, h, 꼭대기 모양)]"""
    r, x, out = rng(seed), 0, []
    while x < period:
        w = min(wmin + r() * (wmax - wmin), period - x)
        out.append((x, w, hmin + r() * (hmax - hmin), int(r() * 4))); x += w + 2 + r() * 4
    return out

FARB = skyline(7, W // 2, 40, 92, 22, 40)   # 먼 겹은 W/2 마다 되풀이
NEARB = skyline(3, W, 34, 74, 26, 46)
# 엠파이어 스테이트 같은 첨탑 하나(가까운 겹 뒤에 붙어 한 바퀴에 한 번 지나간다)
SPIRE_X = 236

def frame(i):
    k = SS; im = Image.new('RGB', (W * k, H * k), BG); d = ImageDraw.Draw(im)
    t = i / N; ground = 138
    R = lambda x0, y0, x1, y1, c: d.rectangle([x0 * k, y0 * k, x1 * k, y1 * k], fill=c)
    # 먼 겹: 한 바퀴에 W/2(한 주기) 흐르고, 가까운 겹은 W 흘러서 느린 · 빠른 두 겹이 끊김 없이 이어진다
    off = (t * W / 2) % (W / 2)
    for rep in range(-1, 3):
        for (x, w, h, top) in FARB:
            X = x - off + rep * W / 2
            if X > W or X + w < 0: continue
            R(X, ground - h, X + w, ground, FAR)
            if top == 1: R(X + w * .3, ground - h - 6, X + w * .7, ground - h, FAR)
    off = (t * W) % W
    for rep in (-1, 0, 1):
        X = SPIRE_X - off + rep * W
        if -40 < X < W + 40:
            S = '#a9b8a6'
            R(X, ground - 100, X + 26, ground, S); R(X + 5, ground - 112, X + 21, ground - 100, S); R(X + 9, ground - 122, X + 17, ground - 112, S)
            d.polygon([((X + 12) * k, (ground - 140) * k), ((X + 14) * k, (ground - 140) * k), ((X + 15) * k, (ground - 122) * k), ((X + 11) * k, (ground - 122) * k)], fill=S)
    # 가까운 겹: 한 바퀴에 W 만큼(빠르게) — 창문 불빛 깜박임
    for rep in (-1, 0, 1):
        for bi, (x, w, h, top) in enumerate(NEARB):
            X = x - off + rep * W
            if X > W or X + w < 0: continue
            R(X, ground - h, X + w, ground, NEAR)
            if top == 2: R(X + w * .45, ground - h - 10, X + w * .55, ground - h, NEAR)     # 안테나
            if top == 3: d.polygon([(X * k, (ground - h) * k), ((X + w) * k, (ground - h) * k), ((X + w / 2) * k, (ground - h - 12) * k)], fill=NEAR)
            cols = max(1, int((w - 6) // 8)); rows = int((h - 10) // 10)
            for cy in range(rows):
                for cx in range(cols):
                    seed = (bi * 31 + cy * 7 + cx * 13) % 97
                    on = (seed % 3 == 0) ^ (((i // 8) + seed) % 11 == 0)   # 가끔 불이 켜졌다 꺼진다
                    if on: R(X + 4 + cx * 8, ground - h + 6 + cy * 10, X + 8 + cx * 8, ground - h + 11 + cy * 10, WIN)
    # 길 · 흘러가는 차선
    R(0, ground, W, H, ROAD)
    off = (t * W * 2) % 40
    for x in range(-40, W + 40, 40): R(x - off, ground + 21, x - off + 20, ground + 24, DASH)
    R(0, ground, W, ground + 3, '#8e9688')
    # 노란 택시(뒤에서 따라오며 살짝 앞뒤로)
    tx = 40 + 10 * math.sin(t * 2 * math.pi); ty = ground + 30
    d.rounded_rectangle([tx * k, (ty - 18) * k, (tx + 66) * k, (ty - 4) * k], radius=4 * k, fill='#f4b81c')
    d.polygon([((tx + 16) * k, (ty - 18) * k), ((tx + 22) * k, (ty - 29) * k), ((tx + 46) * k, (ty - 29) * k), ((tx + 54) * k, (ty - 18) * k)], fill='#f4b81c')
    d.polygon([((tx + 21) * k, (ty - 18) * k), ((tx + 25) * k, (ty - 26) * k), ((tx + 34) * k, (ty - 26) * k), ((tx + 34) * k, (ty - 18) * k)], fill='#bcd7e6')
    d.polygon([((tx + 37) * k, (ty - 18) * k), ((tx + 37) * k, (ty - 26) * k), ((tx + 44) * k, (ty - 26) * k), ((tx + 50) * k, (ty - 18) * k)], fill='#bcd7e6')
    R(tx + 28, ty - 33, tx + 40, ty - 29, '#2b2b2b')
    for s in range(6): R(tx + 4 + s * 10, ty - 12, tx + 9 + s * 10, ty - 9, '#2b2b2b' if s % 2 else '#f4b81c')   # 체커 띠
    R(tx + 63, ty - 15, tx + 66, ty - 11, '#fff3c4')
    for wx in (tx + 14, tx + 52): wheel(d, wx, ty - 3, 7, -t * 2 * math.pi * 6, k, '#2b2b2b')
    # 바이크와 사람(앞에서 달린다, 살짝 들썩)
    bx = 210; by = ground + 30 - abs(math.sin(t * 2 * math.pi * 4)) * 2.2
    a = -t * 2 * math.pi * 6
    wheel(d, bx, by - 10, 11, a, k, '#344237'); wheel(d, bx + 44, by - 10, 11, a, k, '#344237')
    L = lambda pts, c, w: d.line([(x * k, y * k) for x, y in pts], fill=c, width=int(w * k), joint='curve')
    L([(bx, by - 10), (bx + 16, by - 26), (bx + 34, by - 26), (bx + 44, by - 10)], '#d9473b', 3.2)            # 차체
    L([(bx + 16, by - 26), (bx + 22, by - 12), (bx + 34, by - 26)], '#d9473b', 2.6)
    L([(bx + 34, by - 26), (bx + 38, by - 34), (bx + 44, by - 34)], '#344237', 2.4)                            # 핸들
    pedal = t * 2 * math.pi * 6; px, py = bx + 22 + 5 * math.cos(pedal), by - 12 + 5 * math.sin(pedal)
    L([(bx + 18, by - 44), (bx + 24, by - 30), (px, py)], '#2f3d55', 3.4)                                        # 다리
    L([(bx + 18, by - 44), (bx + 30, by - 60)], '#e9aa72', 6)                                                     # 몸
    L([(bx + 29, by - 56), (bx + 40, by - 42), (bx + 43, by - 35)], '#e9aa72', 3)                                 # 팔
    d.ellipse([(bx + 27) * k, (by - 74) * k, (bx + 39) * k, (by - 62) * k], fill='#f1c7a5')                      # 머리
    d.pieslice([(bx + 26) * k, (by - 76) * k, (bx + 40) * k, (by - 62) * k], 180, 360, fill='#46634c')            # 헬멧
    # 속도선
    for j, yy in enumerate((by - 52, by - 40, by - 24)):
        ln = 16 + 8 * math.sin(t * 2 * math.pi * 2 + j * 2)
        L([(bx - 14 - ln, yy), (bx - 14, yy)], '#b7bda5', 1.6)
    return im.resize((W, H), Image.LANCZOS)

def wheel(d, cx, cy, r, a, k, c):
    d.ellipse([(cx - r) * k, (cy - r) * k, (cx + r) * k, (cy + r) * k], outline=c, width=int(2.6 * k))
    for s in range(4):
        b = a + s * math.pi / 4
        d.line([((cx - math.cos(b) * r) * k, (cy - math.sin(b) * r) * k), ((cx + math.cos(b) * r) * k, (cy + math.sin(b) * r) * k)], fill=c, width=int(.9 * k))
    d.ellipse([(cx - 1.6) * k, (cy - 1.6) * k, (cx + 1.6) * k, (cy + 1.6) * k], fill=c)

if __name__ == '__main__':
    frames = [frame(i) for i in range(N)]
    pal = frames[0].quantize(colors=32, method=Image.MEDIANCUT)          # 모든 장에 같은 팔레트(깜박임 없이)
    q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    q[0].save(OUT, save_all=True, append_images=q[1:], duration=60, loop=0, optimize=True, disposal=1)
    print(OUT, os.path.getsize(OUT), 'bytes')
