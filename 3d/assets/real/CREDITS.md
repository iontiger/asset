# 실사 화질 사진 자료 출처

`3d/src/prepare_textures.py` 가 아래 원본을 받아 크기 · 색을 다듬어 만든 파일입니다
(색 무늬는 흑백에 가깝게, 밝기는 고르게 맞춰 마을 재질 색에 곱해 씁니다).

| 파일 | 원본 | 라이선스 |
|---|---|---|
| grass_c.jpg, grass_n.jpg | three.js `examples/textures/terrain/grasslight-big.jpg` · `grasslight-big-nm.jpg` | MIT (three.js authors) |
| wood_c.jpg, wood_n.jpg | three.js `examples/textures/hardwood2_diffuse.jpg` · `hardwood2_bump.jpg` | MIT (three.js authors) |
| water_n.jpg | three.js `examples/textures/waternormals.jpg` | MIT (three.js authors) |
| paving_c.jpg, paving_n.jpg | Babylon.js Assets `textures/floor.png` | CC BY 4.0 — © Babylon.js contributors, https://github.com/BabylonJS/Assets |
| plaster_c.jpg, plaster_n.jpg | Babylon.js Assets `textures/ground.jpg` | CC BY 4.0 — © Babylon.js contributors |
| stone_c.jpg, stone_n.jpg | Babylon.js Assets `textures/rockyGround_basecolor.png` · `rockyGround_normal.png` | CC BY 4.0 — © Babylon.js contributors |
| sand_c.jpg | Babylon.js Assets `textures/sand.jpg` | CC BY 4.0 — © Babylon.js contributors |
| sky_park_1k.hdr | Poly Haven "Rooitou Park" (pmndrs/drei-assets 사본) | CC0 |

`3d/src/rgbe.js` 는 three.js r160 `RGBELoader` (MIT) 를 모듈 없이 쓰도록 옮긴 것입니다.
