/* ═══════ 목표봉 정상 — 덴포토 정상석 옆 다이아몬드 하나, 정상에 오르면 폭죽 ═══════
   정상까지 오를 수 있게 하는 것 · 정상석 글자는 build.py 의 rep 가 한다 (목표 금액 대신 늘 100%). */
'use strict';
(function(){
if(!MTN.built||!MTN.stone)return;
const geo=new THREE.OctahedronGeometry(.62,0);geo.scale(1,1.4,1);
const s=MTN.stone,th=s.rotation.y,ax=Math.cos(th),az=-Math.sin(th),fx=Math.sin(th),fz=Math.cos(th);
const x=s.position.x+ax*2.4+fx*.5,z=s.position.z+az*2.4+fz*.5,y=mtnH(x,z)??worldHeight(x,z);
const g=new THREE.Group();g.position.set(x,y,z);
const m=new THREE.Mesh(geo,gemMat);m.position.y=1.9;m.scale.setScalar(1.25);m.castShadow=true;g.add(m);
const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:dotTex,color:'#aeeeff',transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending}));glow.position.y=1.9;glow.scale.setScalar(4);g.add(glow);
const base=new THREE.Mesh(new THREE.CylinderGeometry(.85,1.05,.18,8),new THREE.MeshStandardMaterial({color:'#d0c9a8'}));base.position.y=.08;base.receiveShadow=true;g.add(base);
MTN.g.add(g);
let burst=0,visits=0;try{visits=+localStorage.getItem('asset-village-3d-summit')||0}catch{}
window.gameSummit=function(){burst=1.2;visits++;try{localStorage.setItem('asset-village-3d-summit',visits)}catch{}if(window.gameFireworks)gameFireworks(MTN.top.x,MTN.top.y+2,MTN.top.z,7,9,14);setTimeout(()=>toast(`💎 덴포토 정상석 옆 다이아몬드! 정상에 ${visits}번 올랐어요`,'gem'),2600)};
window.dpTicks.push(function(dt){if(Math.hypot(camera.position.x-x,camera.position.z-z)>260)return;
  m.rotation.y+=dt*(1.3+burst*10);m.position.y=1.9+Math.sin(time*1.7)*.16+burst*.8;glow.position.y=m.position.y;glow.material.opacity=Math.min(1,(.35+.25*Math.sin(time*3.1))*(1+(1-FX.day)*1.2)+burst*.5);burst=Math.max(0,burst-dt*.4);
  if(MTN.cheered&&Math.hypot(player.x-MTN.top.x,player.z-MTN.top.z)>25)MTN.cheered=false});
})();
