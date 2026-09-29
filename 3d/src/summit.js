/* ═══════ 목표봉 정상 — 정상석 바로 아래 10번째 숨은 다이아, 정상에 오르면 폭죽 ═══════
   정상까지 오를 수 있게 하는 것 · 정상석 글자는 build.py 의 rep 가 한다 (목표 금액 대신 늘 100%). */
'use strict';
(function(){
if(!MTN.built||!MTN.stone)return;
// 10번째 숨은 다이아 — 정상석 바로 아래 등산로 위. 걸어서 지나가면 줍는다 (gems 는 const 라 내용만 늘린다)
const S_AT=Math.max(0,MTN.len-7),P=mtnAt(S_AT/MTN.len),GID='g10',x=P.x,z=P.z;
if(!gems.some(o=>o.id===GID)){const g=new THREE.Group();g.position.set(x,terrainHeight(x,z),z);g.userData.world=true;
  const m=new THREE.Mesh(gemGeo,gemMat);m.position.y=1.4;m.castShadow=true;g.add(m);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:'#aeeeff',transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending}));glow.position.y=1.4;glow.scale.setScalar(3.2);g.add(glow);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.85,1.05,.18,8),mat('#d0c9a8'));base.position.y=.08;base.receiveShadow=true;g.add(base);
  scene.add(g);g.visible=!gemFound.has(GID);gems.push({id:GID,where:'목표봉 정상석 바로 아래 등산로',x,z,g,m,glow,near:false,t:-1});renderGems()}
let visits=0;try{visits=+localStorage.getItem('asset-village-3d-summit')||0}catch{}
window.gameSummit=function(){visits++;try{localStorage.setItem('asset-village-3d-summit',visits)}catch{}if(window.gameFireworks)gameFireworks(MTN.top.x,MTN.top.y+2,MTN.top.z,7,9,14);setTimeout(()=>toast(`🏔 덴포토 정상! 정상에 ${visits}번 올랐어요`,'gem'),2600)};
window.dpTicks.push(function(){
  if(MTN.cheered&&Math.hypot(player.x-MTN.top.x,player.z-MTN.top.z)>25)MTN.cheered=false});
})();
