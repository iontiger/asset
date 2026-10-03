# 덴포토 문명 (DentPhoto Civilization)

DentPhoto 마을 3D(`3d/`)의 **문명 전당**에서 들어가는 턴제 문명 게임입니다. 따로 열어도 됩니다: https://iontiger.github.io/asset/civil/

지금까지 만든 것을 그대로 씁니다.
- `../3d/ride/vendor/three.min.js` (Three.js r160)와 `../3d/ride/village-landmarks.js`의 마을 3D 모델(집 · 장미집 · 가게 · 시장 · 금고 · 탑 · 등대 · 분수 · 열기구)로 도시를 짓습니다.
- 우편배달부 오토바이(정찰 유닛), 목표봉(자연경관), 협곡 사암지 · 개울 · 해안 같은 지형, 보석 보물상자, 우체국 · 치과 · 사진관 건물, 억 돌파 석탑 · 목표봉 전망탑 같은 불가사의.
- 목표자산 20억 승리: 마지막 기술 '자산 경영'을 배우고 금 2,000(=20억)을 모으면 이깁니다.

## 파일
- `civ-rules.js` — 화면 없는 규칙(육각 지도 생성 · 도시 · 유닛 · 전투 · 기술 · 외교 · 컴퓨터 문명 AI · 승리 · 저장). node 에서도 돕니다.
- `civ-view.js` — Three.js 화면(지형 · 숲/언덕/산 · 자원 · 국경 · 도시 · 유닛 · 안개 · 애니메이션). 도시와 유닛은 조각을 메쉬 하나로 구워 그리기 횟수를 줄입니다.
- `civ-game.js` — 조작(누르기 · 끌기 · 확대 · 단축키), 유닛/도시/기술/외교 화면, 턴 진행, 자동 저장.
- `civ-test.cjs` — `node civ-test.cjs`: 컴퓨터 문명끼리 세 가지 지도 크기로 끝까지 두며 규칙이 깨지지 않는지 봅니다.

## 마을과 잇기
`3d/src/civ.js`가 마을에 문명 전당을 세우고, 문 앞에 가면 이 페이지를 전체 화면 iframe 으로 엽니다. 게임은 `postMessage({dpCiv:'close'})`로 마을에 돌아가고, 이기면 `{dpCiv:'finish',win:true}`를 보냅니다. 저장은 `localStorage['dentphoto-civ-v1']`, 기록은 `['dentphoto-civ-record-v1']`.

## 시험
- `?quick` — 시작 화면 없이 바로 새 게임(`&seed=`, `&size=small|normal|large`)
- `window.civDebug` — `S`(상태) · `C`(규칙) · `view` · `endTurn()` · `select(u)` · `openCity(c)`
