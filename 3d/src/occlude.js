/* DentPhoto 마을 — 주인공을 가리는 나무 · 건물을 반투명하게
   산책 중 카메라와 주인공 사이에 나무 · 지붕 · 벽이 끼면, 그 사이 원기둥 안의 조각만 촘촘한 점무늬로 비워 뒤가 비쳐 보이게 한다.
   (모든 나무가 인스턴스로 묶여 있어 한 그루만 투명하게 할 수 없으니, 셰이더에서 시선 통로만 비운다. 그림자는 그대로.) */
(()=>{
const U={uOccCam:{value:new THREE.Vector3()},uOccHero:{value:new THREE.Vector3()},uOccOn:{value:0}};
const DECL='uniform vec3 uOccCam;uniform vec3 uOccHero;uniform float uOccOn;const float OCC_BAYER[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);';
// 카메라 → 주인공 선분에서 가까운 조각을 점무늬(4×4 바이엘)로 지운다. 주인공 바로 앞 0.8칸과 카메라 바로 앞은 남긴다
const GLSL=`if(uOccOn>.5){vec3 oW=cameraPosition+(vec4(-vViewPosition,0.)*viewMatrix).xyz;vec3 oD=uOccHero-uOccCam;float oL=length(oD);
  if(oL>.5){oD/=oL;float oa=dot(oW-uOccCam,oD);if(oa>.3&&oa<oL-.8){float ot=oa/oL,oR=mix(.6,1.7,ot),od=length(oW-uOccCam-oD*oa);
    float of=(1.-smoothstep(oR*.6,oR,od))*smoothstep(.3,1.2,oa)*.88;
    if(of>0.){ivec2 oq=ivec2(mod(gl_FragCoord.xy,4.));float ob=OCC_BAYER[oq.x+oq.y*4]/16.+.03;
      if(ob<of)discard;}}}}`;
const OK=m=>m&&!m.userData.occ&&(m.isMeshStandardMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial||m.isMeshToonMaterial)&&m!==terrain.material&&(typeof grassMat==='undefined'||m!==grassMat);
function occify(m){if(!OK(m))return;m.userData.occ=true;const prev=m.onBeforeCompile,pk=m.customProgramCacheKey;
  m.onBeforeCompile=function(sh,r){if(prev)prev.call(this,sh,r);Object.assign(sh.uniforms,U);
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+DECL).replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+GLSL)};
  m.customProgramCacheKey=function(){return (pk?pk.call(this):'')+'|occ'};m.needsUpdate=true}
// 주인공 · 자전거 · 말풍선은 건드리지 않는다
function skip(o){for(let p=o;p;p=p.parent){if(p===bike.g)return true;if(characterGroups.some(c=>c.root===p))return true}return false}
function scan(){scene.traverse(o=>{if(!o.isMesh||o.isSprite)return;if(skip(o))return;(Array.isArray(o.material)?o.material:[o.material]).forEach(occify)})}
try{scan()}catch(e){console.error(e)}
let scanT=0;const hp=new THREE.Vector3();
const _ue=updateExtras;updateExtras=function(dt){_ue(dt);try{
  if((scanT-=dt)<=0){scanT=2;scan()}   // 나중에 생기는 물건(괴물 · 요트 소품 …)도 2초마다 챙긴다
  const h=characterGroups.find(c=>c.root.visible),on=!!h&&(cameraMode==='walking'||cameraMode==='entering')&&!MTN.view&&!window.dpOccOff;
  U.uOccOn.value=on?1:0;if(on){h.root.getWorldPosition(hp);hp.y+=1.15;U.uOccHero.value.copy(hp);U.uOccCam.value.copy(camera.position)}
}catch(e){console.error(e)}};
window.dpOcc={U,scan};
})();
