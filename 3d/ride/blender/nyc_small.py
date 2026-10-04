"""폰(저화질)용 작은 텍스처: nyc/*.jpg 를 가로세로 절반으로 줄여 nyc/s/ 에 둔다 (2048 → 1024, 1024 → 512).
실행: python3 3d/ride/blender/nyc_small.py   (nyc_kit.py 로 다시 구운 뒤에 함께 돌린다)
노멀맵(_n)은 줄인 뒤 다시 정규화한다. 도시 HDRI 는 폰에서 받지 않는다(그라데이션 하늘빛으로 대신)."""
import os, glob
import numpy as np
from PIL import Image
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'nyc'); S = os.path.join(D, 's'); os.makedirs(S, exist_ok=True)
for f in sorted(glob.glob(os.path.join(D, '*.jpg'))):
    im = Image.open(f).convert('RGB'); w, h = im.size; sm = im.resize((max(256, w // 2), max(256, h // 2)), Image.LANCZOS)
    if f.endswith('_n.jpg'):
        a = np.asarray(sm, np.float32) / 127.5 - 1; a /= np.linalg.norm(a, axis=2, keepdims=True) + 1e-6
        sm = Image.fromarray(np.clip((a + 1) * 127.5, 0, 255).astype(np.uint8))
    sm.save(os.path.join(S, os.path.basename(f)), quality=82, optimize=True)
    print(os.path.basename(f), sm.size, os.path.getsize(os.path.join(S, os.path.basename(f))))
