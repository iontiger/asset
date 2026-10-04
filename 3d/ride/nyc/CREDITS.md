# 뉴욕 시내 실사 자료 출처

`blender/nyc_kit.py` 가 아래 원본을 받아(blender/scans/, 커밋하지 않음) 굽거나 다듬어 이 폴더의 파일을 만듭니다.

| 쓰인 곳 | 원본 | 라이선스 |
|---|---|---|
| brick_*.jpg (벽돌 건물 색 · 결 · 거칠기) | three.js `examples/textures/brick_diffuse.jpg` · `brick_bump.jpg` · `brick_roughness.jpg` | MIT (three.js authors) |
| asphalt_c/n.jpg, walk_c/n.jpg (아스팔트 · 보도) | Babylon.js Assets `textures/rockyGround_basecolor.png` · `rockyGround_normal.png` | CC BY 4.0 — © Babylon.js contributors, https://github.com/BabylonJS/Assets |
| city_1k.hdr (하늘 반사 · 조명) | Poly Haven "Potsdamer Platz" (pmndrs/drei-assets 사본) | CC0 |

나머지(석회석 · 아르데코 · 유리 커튼월 · 차 · 소품)는 블렌더에서 직접 모델링하고 절차적 무늬로 구웠습니다.
`../vendor/three-addons.js` · `../rgbe.js` 는 three.js r160 examples (MIT) 를 전역 스크립트로 옮긴 것입니다.
